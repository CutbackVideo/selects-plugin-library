import type { StageContext, StageImpl, StageResult } from "../../jobs/runner.ts";
import { inputShaFrom } from "../../jobs/receipts.ts";
import { ensureDir, readBytes, writeJsonAtomic } from "../../host/fs.ts";
import { errorMessage } from "../../host/util.ts";
import { ffmpegVersion, probeMedia, type MediaProbe } from "../../host/ffmpeg.ts";
import { hostPlatform } from "../../host/di.ts";
import { readScript } from "../../host/runScript.ts";
import { canvasPainter, type SheetPainter } from "../../broll/sheet.ts";
import { lintPlan } from "../../lint/lint.ts";
import { allFilmStyles } from "../media/filmStyles.ts";
import { speakerRate } from "../edit/pace.ts";
import { EDIT_POLICY } from "../edit/policy.ts";
import { detectSilences } from "../edit/voice.ts";
import type { EditWord } from "../edit/words.ts";
import { compositionScript } from "../compose/scripts.ts";
import { checkComposition, type CoverageReport } from "../compose/coverage.ts";
import { measureFile, type Loudness } from "../sound/ebur128Measure.ts";
import { decodeWav, type Pcm } from "../sound/wavCodec.ts";
import { matchVoice, shapeVoice, type VoiceMatch } from "./audio.ts";
import { blackRuns, judgePicture, pictureProbes, sampleFrames, boxStats, type BlackVerdict, type DiagScene, type PictureVerdict, type SceneExecution } from "./frames.ts";
import { blackdetect, decodeAudio, paintSheets, pullFrames } from "./measure.ts";
import { readDiagnosticsDraft, foreignOverlays } from "./draftRead.ts";
import { callsSummary, readJobFiles, stageTimes, type JobFiles } from "./inputs.ts";
import { checkCredits, creditsText, jobCredits } from "./credits.ts";
import { acceptance, g10Credits, g1Rate, g2Pauses, g3Music, g4Loudness, g5Format, g6Structure, g7Screen, g8Voice, g9Plan, LIMITS, type Gate, type SpeakerTarget, type VoicePauses } from "./gates.ts";

export const DIAGNOSTICS_VERSION = "eo-diagnostics/1";

export const WARNING_PREFIX = "Diagnostics: ";

export const DIAG_REL = { report: "diagnostics/diagnostics.json", frames: "diagnostics/frames", dir: "diagnostics", credits: "credits.json" };

export type DiagnosticsOptions = {
  painter?: SheetPainter | null;
  backoffMs?: number[];
};

export function createDiagnosticsStage(o: DiagnosticsOptions = {}): StageImpl {
  return {
    id: "diagnostics",
    alwaysRerun: true,
    inputSha: (ctx) => inputShaFrom(ctx.host.fs, ctx.dir, ["export"], { version: DIAGNOSTICS_VERSION }),
    run: (ctx) => runDiagnostics(ctx, o),
  };
}

export const diagnosticsStage: StageImpl = createDiagnosticsStage();

const defaultPainter = (): SheetPainter | null => (typeof OffscreenCanvas !== "undefined" || typeof document !== "undefined" ? canvasPainter() : null);

async function attempt<T>(ctx: StageContext, what: string, errors: Record<string, string>, f: () => Promise<T>): Promise<T | null> {
  try {
    return await f();
  } catch (e) {
    if (ctx.signal.aborted) throw e;
    errors[what] = errorMessage(e);
    return null;
  }
}

async function runDiagnostics(ctx: StageContext, o: DiagnosticsOptions): Promise<StageResult> {
  const { host, job } = ctx;
  const fs = host.fs;
  const t0 = host.now();
  const rs = { signal: ctx.signal, backoffMs: o.backoffMs };
  const files: JobFiles = await readJobFiles(fs, ctx.path);
  const receipt = files.exportReceipt;
  if (!receipt || !fs.existsSync(receipt.outPath)) throw new Error("There is no exported MP4 to check (export/receipt.json).");
  if (!job.draftId) throw new Error("The job has no EO draft.");
  const mp4 = receipt.outPath;
  ensureDir(fs, ctx.path(DIAG_REL.dir));
  job.warnings = job.warnings.filter((w) => !w.startsWith(WARNING_PREFIX));
  const errors: Record<string, string> = {};
  const ms: Record<string, number> = {};
  const lap = async <T>(name: string, f: () => Promise<T | null>) => {
    const s = host.now();
    try {
      return await f();
    } finally {
      ms[name] = host.now() - s;
    }
  };
  const report = files.sound?.report ?? null;

  ctx.note("Reading the draft…");
  const draft = await lap("draft", () => attempt(ctx, "draft", errors, () => readDiagnosticsDraft(host.sdk, { projectId: job.projectId, draftId: job.draftId!, soundRoot: ctx.path("sound"), musicFadeIn: report?.music?.audio?.fadeInSeconds ?? null, ...rs })));
  const fps = draft?.fps ?? receipt.draft.fps;
  const mainEnd = draft?.mainEnd ?? receipt.draft.mainEnd;

  let coverage: CoverageReport | null = null;
  const guard = files.compose?.guard;
  if (guard && files.compose?.scenes) {
    const read = await lap("composition", () => attempt(ctx, "composition", errors, () => readScript<any>(host.sdk, "EO Shorts: read the composition for the checks", compositionScript({ ...guard, wordsSig: null }, ctx.path("media/footage")), rs)));
    if (read) {
      coverage = checkComposition(
        { mainEnd: read.mainEnd, main: read.main, overlays: read.overlays, graphics: read.graphics },
        { frameSize: guard.frameSize, parts: files.compose.scenes.flatMap((s) => s.parts.map((p) => ({ label: p.label, start: p.start, end: p.end, opaque: p.opaque }))), overlays: (files.compose.bakes ?? []).map((b) => ({ path: b.path, start: b.start, end: b.end })) },
      );
    }
  } else errors.composition = "compose/compose.json has no guard or scenes";

  ctx.note("Measuring the MP4…");
  const probe = await lap("probe", () => attempt<MediaProbe>(ctx, "probe", errors, () => probeMedia(host.runtime, mp4, { fs, tmpDir: ctx.path(DIAG_REL.dir), countFrames: true, signal: ctx.signal, timeoutMs: 180_000 })));
  const loud = await lap("loudness", () => attempt<Loudness>(ctx, "loudness", errors, () => measureFile(host, mp4, { signal: ctx.signal })));

  const scenes = await sceneList(ctx, files);
  ctx.note("Looking at the picture…");
  const blackLog = await lap("black", () => attempt(ctx, "black", errors, () => blackdetect(host, mp4, ctx.signal)));
  const black: BlackVerdict[] | null = blackLog != null ? blackRuns(blackLog, scenes, fps) : null;
  const samples = sampleFrames(scenes, mainEnd);
  const pulled = await lap("frames", () => attempt(ctx, "frames", errors, () => pullFrames(host, mp4, samples, ctx.path(DIAG_REL.frames), ctx.signal)));
  const pictures: PictureVerdict[] = pictureProbes(scenes).map((p) => {
    const at = (f: number) => {
      const g = pulled?.gray.get(f);
      return g ? boxStats(g, pulled!.width, pulled!.height, p.box) : null;
    };
    return judgePicture(p, at(p.entrance), at(p.settled));
  });
  const painter = o.painter !== undefined ? o.painter : defaultPainter();
  let sheets: string[] = [];
  if (pulled && painter) sheets = (await lap("sheets", () => attempt(ctx, "sheets", errors, () => paintSheets(host, painter, samples, pulled, ctx.path(DIAG_REL.dir))))) ?? [];
  else if (!painter) errors.sheets = "no canvas to paint the contact sheets on";

  ctx.note("Listening to the mix…");
  const voice = await lap("voice", () => attempt(ctx, "voice", errors, () => referenceVoice(ctx, files, fps)));
  const match: VoiceMatch | null = voice ? await lap("match", () => attempt(ctx, "match", errors, async () => matchVoice(await decodeAudio(host, mp4, ctx.path("diagnostics/mp4-audio.wav"), voice.pcm.sampleRate, ctx.signal), voice.shaped))) : null;
  const pauses: VoicePauses | null = voice
    ? await lap("pauses", () =>
        attempt(ctx, "pauses", errors, async () => {
          const seconds = voice.pcm.channels[0].length / voice.pcm.sampleRate;
          const level = (off: number) => Math.round((voice.integrated + off) * 10) / 10;
          const gateDb = level(LIMITS.pauseGateOffsetDb), infoDb = level(LIMITS.pauseInfoOffsetDb);
          return {
            file: voice.rel,
            integrated: voice.integrated,
            seconds,
            gate: { noiseDb: gateDb, list: await detectSilences(host, voice.path, gateDb, LIMITS.pauseSeconds, seconds, ctx.signal) },
            info: { noiseDb: infoDb, list: await detectSilences(host, voice.path, infoDb, LIMITS.pauseSeconds, seconds, ctx.signal) },
          };
        }),
      )
    : null;

  const lint = await planLint(ctx, files);
  const credits = jobCredits(files.mediaCredits, files.soundCredits);
  const creditCheck = checkCredits({ scenes: files.media?.scenes ?? [], shots: files.media?.shots ?? [], media: files.mediaCredits, sound: files.soundCredits, music: !!report?.music, sfx: report?.sfx?.placed?.length ?? 0 });
  await writeJsonAtomic(fs, ctx.path(DIAG_REL.credits), { schema: "eo-credits/1", jobId: job.jobId, credits, text: creditsText(credits) });

  const words: EditWord[] | null = draft ? draft.words : null;
  const gates: Gate[] = [
    g1Rate({ words, mainEnd, fps, speaker: speakerTarget(files, fps) }),
    g2Pauses({ words, fps, voice: pauses }),
    g3Music({ mainEnd, clips: (draft?.sound ?? []).filter((s) => s.music).map((s) => ({ start: s.start, end: s.end, path: s.path, muted: s.muted, maxDb: s.level?.maxDb ?? null })), match }),
    g4Loudness({ mp4: loud, sound: report?.loudness?.final ?? null }),
    g5Format({ probe, fps, mainEnd }),
    g6Structure({ coverage, readError: errors.composition ?? errors.draft ?? null, planScenes: planSceneIds(files), composed: files.compose?.scenes ?? [], foreignOverlays: draft ? foreignOverlays(draft.overlays, ctx.path("media/footage")) : [] }),
    g7Screen({ black, pictures, sheets: sheets.map((s) => rel(ctx, s)), samples: samples.length, missingFrames: pulled?.missing ?? [], compileWarnings: (files.compose?.scenes ?? []).flatMap((s) => (s.warnings ?? []).map((w) => s.sceneId + ": " + w)) }),
    g8Voice({ match }),
    g9Plan({ planGate: files.plan?.gate ?? null, lint, fallbacks: job.fallbacks }),
    g10Credits({ check: creditCheck }),
  ];
  for (const [what, why] of Object.entries(errors)) {
    for (const g of gates) if (g.status !== "pass" && gateNeeds(g.id, what) && !g.problems.some((p) => p.includes(why))) g.problems.push(what + ": " + why);
  }
  const accepted = acceptance(gates);
  const ffmpeg = await attempt(ctx, "ffmpeg", errors, () => ffmpegVersion(host.runtime, { signal: ctx.signal }));
  const diag = {
    schema: DIAGNOSTICS_VERSION,
    jobId: job.jobId,
    projectId: job.projectId,
    draftId: job.draftId,
    mp4,
    at: new Date(host.now()).toISOString(),
    acceptance: accepted,
    gates,
    frames: { samples, sheets: sheets.map((s) => rel(ctx, s)) },
    info: {
      versions: job.versions,
      ffmpeg: ffmpeg ? { line: ffmpeg.line, version: ffmpeg.version, platform: hostPlatform(host.di ?? null) } : null,
      stages: stageTimes(job.stages),
      models: job.models,
      calls: callsSummary(files.calls),
      graphics: { scripts: (files.compose?.scenes ?? []).flatMap((s) => s.parts.map((p) => ({ label: p.label, bytes: p.scriptBytes ?? null }))) },
      fallbacks: job.fallbacks,
      warnings: job.warnings,
      audioCuts: files.edit?.removed?.audioPasses ?? null,
      voice: voice ? { file: voice.rel, from: voice.from, integrated: voice.integrated } : null,
      draft: draft ? { name: draft.name, durationFrames: draft.durationFrames, mainEnd: draft.mainEnd, wordRows: draft.rows.length, words: draft.words.length, retimed: draft.retimed, otherSound: draft.sound.filter((s) => !s.ours).map((s) => (s.path ?? "?") + " " + s.start + "-" + s.end) } : null,
      fingerprint: files.preflight?.fingerprint ?? null,
      export: { workflowId: receipt.workflowId, waitMs: receipt.waitMs, via: receipt.via, resumed: receipt.resumed, bytes: receipt.bytes },
      errors,
      ms,
    },
    ms: host.now() - t0,
  };
  await writeJsonAtomic(fs, ctx.path(DIAG_REL.report), diag);
  for (const g of gates) if (g.status === "fail") ctx.warn(WARNING_PREFIX + g.id + " " + g.name.toLowerCase() + " failed: " + g.problems.join("; ") + ".");
  const passed = gates.filter((g) => g.status === "pass").length;
  const failed = gates.filter((g) => g.status !== "pass").map((g) => g.id);
  return {
    outputs: [DIAG_REL.report, DIAG_REL.credits, ...sheets.map((s) => rel(ctx, s))],
    note: passed + "/10 gates pass" + (failed.length ? " (" + failed.join(", ") + " not)" : "") + "; acceptance " + (accepted.passed ? "passed" : "failed"),
    data: { acceptance: accepted, gates: gates.map((g) => ({ id: g.id, status: g.status, summary: g.summary })) },
  };
}

function gateNeeds(id: string, what: string): boolean {
  const map: Record<string, string[]> = { G1: ["draft"], G2: ["draft", "voice", "pauses"], G3: ["draft", "voice", "match"], G4: ["loudness"], G5: ["probe"], G7: ["black", "frames"], G8: ["voice", "match"] };
  return (map[id] ?? []).includes(what);
}

const rel = (ctx: StageContext, abs: string) => {
  const root = ctx.dir.replace(/\\/g, "/").replace(/\/?$/, "/");
  const p = abs.replace(/\\/g, "/");
  return p.startsWith(root) ? p.slice(root.length) : abs;
};

async function sceneList(ctx: StageContext, files: JobFiles): Promise<DiagScene[]> {
  const rows = files.compose?.scenes?.length ? files.compose.scenes : Object.values(files.planScenes ?? {}).map((s) => ({ sceneId: s.id, start: s.start, end: s.end }));
  const out: DiagScene[] = [];
  for (const s of rows) {
    let execution: SceneExecution | null = null;
    const file = ctx.path("compose/" + s.sceneId + "/execution.json");
    if (ctx.host.fs.existsSync(file)) execution = JSON.parse(new TextDecoder().decode(await readBytes(ctx.host.fs, file)));
    out.push({ sceneId: s.sceneId, start: s.start, end: s.end, execution });
  }
  return out.sort((a, b) => a.start - b.start);
}

function planSceneIds(files: JobFiles): string[] {
  if (files.media?.scenes?.length) return files.media.scenes.map((s) => s.sceneId);
  return Object.keys(files.planScenes ?? {});
}

function speakerTarget(files: JobFiles, fps: number): SpeakerTarget | null {
  const e = files.edit?.speakerRate;
  if (e) return { wpm: e.wpm, articulationWpm: e.articulationWpm ?? null, targetWpm: e.targetWpm, from: "edit" };
  const s = files.source;
  if (!s?.words?.length) return null;
  const words = s.words.map((w) => ({ text: w.text, s: w.startFrame, e: w.endFrame, nonSpeech: !!w.nonSpeech, filler: (w.filler ?? null) as EditWord["filler"] }) as EditWord);
  const r = speakerRate(words, s.fps || fps, EDIT_POLICY.speakerGapCapSeconds, EDIT_POLICY.rateTargetFactor);
  return { wpm: r.wpm, articulationWpm: r.articulationWpm, targetWpm: r.targetWpm, from: "source" };
}

type Voice = { path: string; rel: string; from: "sound-pass" | "edit"; pcm: Pcm; shaped: Pcm; integrated: number };

async function referenceVoice(ctx: StageContext, files: JobFiles, fps: number): Promise<Voice> {
  const fs = ctx.host.fs;
  const r = files.sound?.report;
  if (r?.voice) {
    const rel2 = r.voice.passGainDb ? "sound/passes/voice-2.wav" : "sound/passes/voice-1.wav";
    if (fs.existsSync(ctx.path(rel2))) {
      const pcm = decodeWav(await readBytes(fs, ctx.path(rel2)));
      return { path: ctx.path(rel2), rel: rel2, from: "sound-pass", pcm, shaped: shapeVoice(pcm, r.voice, fps), integrated: r.voice.render.integrated };
    }
  }
  const rel1 = "sound/voice-only.wav";
  if (!fs.existsSync(ctx.path(rel1))) throw new Error("no voice render (sound/passes/voice-*.wav or sound/voice-only.wav)");
  const pcm = decodeWav(await readBytes(fs, ctx.path(rel1)));
  const integrated = files.edit?.voice?.integrated ?? (await measureFile(ctx.host, ctx.path(rel1), { signal: ctx.signal })).integrated;
  return { path: ctx.path(rel1), rel: rel1, from: "edit", pcm, shaped: pcm, integrated };
}

async function planLint(ctx: StageContext, files: JobFiles): Promise<{ sceneId: string; errors: string[] }[]> {
  const fs = ctx.host.fs;
  const styles = allFilmStyles();
  const out: { sceneId: string; errors: string[] }[] = [];
  const ids = planSceneIds(files);
  for (const sid of ids) {
    const media = files.media?.scenes?.find((s) => s.sceneId === sid)?.plan;
    const file = [media, "plan/scenes/" + sid + "/plan.json"].filter((x): x is string => !!x).map((x) => ctx.path(x)).find((p) => fs.existsSync(p));
    if (!file) {
      out.push({ sceneId: sid, errors: ["no plan file"] });
      continue;
    }
    const plan = JSON.parse(new TextDecoder().decode(await readBytes(fs, file)));
    out.push({ sceneId: sid, errors: lintPlan(plan, { styles: styles as never }).errors });
  }
  return out;
}
