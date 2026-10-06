import type { Host } from "../../host/types.ts";
import { ensureDir, readBytes, readJson, readJsonIfExists, removeFile, renameWithRetry, writeFileAtomic, writeJsonAtomic } from "../../host/fs.ts";
import { readScript, runScript } from "../../host/runScript.ts";
import { hashJson } from "../../host/util.ts";
import { renderVoice } from "../edit/voice.ts";
import { pickMusic, type MusicAsk, type MusicCatalog, type MusicPick } from "./musicPick.ts";
import { DUCKING, duckLine, duckStats, musicLevels, speechSpans } from "./ducking.ts";
import { placeSfx, sceneEvents, sfxGainDb, thinEvents, type SfxCatalog, type SoundScene } from "./sfxPlacement.ts";
import { measureFile, type Loudness } from "./ebur128Measure.ts";
import { decodeWav, subtractPcm } from "./wavCodec.ts";
import { buildStemModel, mixLoudness, mixPeaks, FLAT } from "./mixStems.ts";
import { LOUDNESS, predictMix, solveLoudness, type LoudnessPlan, type LoudnessRules } from "./loudnessSolve.ts";
import { finalMainLevels, passMainLevels, soundClips, voiceLine, type MusicLay, type SfxLay } from "./mixLevels.ts";
import { soundApplyScript, soundStateScript, type ApplyInput, type ApplyResult, type SoundGuard, type SoundState } from "./scripts.ts";
import { importScript, resolveScript, type ResolvedFile } from "../compose/scripts.ts";
import { fromDb, toDb } from "./loudnessMeter.ts";
import { g4Verdict, soundCredits, type SoundReport } from "./soundReport.ts";

export type SoundInput = {
  host: Pick<Host, "sdk" | "fs" | "runtime">;
  projectId: string;
  draftId: string;
  jobId: string;
  dirs: { sound: string; footage: string; tmp: string };
  packageDir: string;
  music: MusicAsk;
  scenes: SoundScene[];
  options?: { music?: boolean; sfx?: boolean; loudness?: Partial<LoudnessRules>; maxCorrections?: number };
  expect?: { mainEnd?: number; wordsSig?: string | null };
  signal?: AbortSignal | null;
  progress?: (note: string) => void;
  backoffMs?: number[];
  render?: (outPath: string, seconds: number) => Promise<void>;
  measure?: (path: string, part?: { startSeconds: number; seconds: number }) => Promise<Loudness>;
};

export const PASS_PEAK_LIMIT = -2;
export const ACCEPT = { lu: 0.15, tpDb: 0.03 };

export async function soundFilm(c: SoundInput): Promise<SoundReport> {
  const { fs } = c.host;
  const say = c.progress ?? (() => {});
  const rules: LoudnessRules = { ...LOUDNESS, ...(c.options?.loudness ?? {}) };
  const warnings: string[] = [];
  const warn = (m: string) => void (warnings.includes(m) || warnings.push(m));
  const rs = { signal: c.signal, backoffMs: c.backoffMs };
  const path = (...p: string[]) => fs.join(c.dirs.sound, ...p);
  ensureDir(fs, path("passes"));
  const t0 = Date.now();

  say("Reading the draft…");
  const st = await readScript<SoundState>(c.host.sdk, "EO Shorts: read the draft for the sound", soundStateScript(c.projectId, c.draftId, { sound: c.dirs.sound, footage: c.dirs.footage }), rs);
  if (c.expect?.mainEnd != null && st.mainEnd !== c.expect.mainEnd) throw new Error("The EO draft's Main ends at frame " + st.mainEnd + "; the sound was planned for " + c.expect.mainEnd + ".");
  if (c.expect?.wordsSig != null && st.wordsSig !== c.expect.wordsSig) throw new Error("The EO draft's words changed since it was composed.");
  const pieces = st.main.filter((m) => m[2]).map((m) => [m[0], m[1]] as [number, number]);
  if (!pieces.length) throw new Error("The EO draft has no Main clip to set the voice on.");
  const guard: SoundGuard = { projectId: c.projectId, draftId: c.draftId, fps: st.fps, frameSize: st.frameSize, mainEnd: st.mainEnd, wordsSig: st.wordsSig, pieces };
  const fps = st.fps, mainEnd = st.mainEnd, seconds = mainEnd / fps;
  if (st.others.length) warn("Clips other than EO Shorts' own can sound (" + st.others.map((o) => o.name + " " + o.start + "-" + o.end).join(", ") + "); the loudness pass counts them with the voice but does not set their level.");

  const useMusic = c.options?.music !== false, useSfx = c.options?.sfx !== false;
  let pick: MusicPick | null = null, bedPath: string | null = null, bedLufs: number | null = null, bedStart = 0;
  if (useMusic) {
    const catalog = await readJson<MusicCatalog>(fs, fs.join(c.packageDir, "assets", "music", "catalog.json"));
    pick = pickMusic(catalog, c.music, { videoSeconds: seconds, jobId: c.jobId });
    pick.warnings.forEach(warn);
    say("Laying the music: " + pick.track.title + "…");
    bedPath = await copyInto(c.host, fs.join(c.packageDir, "assets", "music", pick.track.file), path(pick.track.file));
    bedStart = Math.round(pick.startSeconds * fps) / fps;
    bedLufs = (await measure(c, bedPath, { startSeconds: bedStart, seconds })).integrated;
  }
  const sfxCatalog = useSfx && c.scenes.length ? await readJson<SfxCatalog>(fs, fs.join(c.packageDir, "assets", "sfx", "catalog.json")) : null;
  const events = sfxCatalog ? sceneEvents(c.scenes, fps) : [];
  const thinned = thinEvents(events, fps);
  const placed = sfxCatalog ? placeSfx(thinned.kept, sfxCatalog, fps, mainEnd) : { placements: [], skipped: [] };
  for (const p of placed.placements) await copyInto(c.host, fs.join(c.packageDir, "assets", "sfx", p.cue.file), path(p.cue.file));
  const spans = speechSpans(st.words.map((w) => ({ s: w.s, e: w.e, cut: w.cut })), fps, mainEnd);

  const inputsKey = await hashJson({ guard, music: pick && { id: pick.track.id, start: bedStart, lufs: bedLufs }, sfx: placed.placements.map((p) => [p.cue.id, p.start, p.end]), rules, spans });
  const prev = await readJsonIfExists<{ inputsKey?: string; final?: ApplyInput; report?: SoundReport } | null>(fs, path("sound.json"), null).catch(() => null);
  if (prev?.inputsKey === inputsKey && prev.final && prev.report) {
    const dry = await readScript<ApplyResult>(c.host.sdk, "EO Shorts: check the sound", soundApplyScript(guard, { ...prev.final, dryRun: true }), rs);
    if (!dry.changed) return { ...prev.report, skipped: true, commits: 0, ms: Date.now() - t0 };
  }

  const imported = new Set<string>();
  const apply = async (input: ApplyInput, summary: string): Promise<ApplyResult | null> => {
    const paths = [...new Set(input.clips.map((x) => x.path))].filter((p) => !imported.has(p));
    if (paths.length) {
      await runScript(c.host.sdk, {
        ...rs,
        summary: "EO Shorts: add the music and sound effects to the project",
        script: importScript(c.projectId, paths),
        allowCommit: true,
        verify: async () => ((await readScript<ResolvedFile[]>(c.host.sdk, "EO Shorts: find the music and sound effects", resolveScript(c.projectId, paths), rs)).every((f) => f.resourceId) ? "done" : "retry"),
      });
      for (const p of paths) imported.add(p);
    }
    const out = await runScript<ApplyResult>(c.host.sdk, {
      ...rs,
      summary,
      script: soundApplyScript(guard, input),
      allowCommit: true,
      verify: async () => ((await readScript<ApplyResult>(c.host.sdk, summary + " (check)", soundApplyScript(guard, { ...input, dryRun: true }), rs)).changed ? "retry" : "done"),
    });
    return out.result ?? null;
  };
  const renderTo = async (name: string): Promise<{ path: string; loud: Loudness }> => {
    const out = path("passes", name);
    removeFile(fs, out);
    if (c.render) await c.render(out, seconds);
    else await renderVoice(c.host as Host, { projectId: c.projectId, draftId: c.draftId, outPath: out, mainEndFrame: mainEnd, fps, tmpDir: c.dirs.tmp, signal: c.signal, onProgress: (t) => say(t.replace("Rendering the voice", "Rendering " + name)) });
    return { path: out, loud: await measure(c, out) };
  };
  const commits: (string | null)[] = [];
  const applied = (r: ApplyResult | null) => void commits.push(r?.commitId ?? null);

  say("Rendering the voice alone…");
  let passGain = 0;
  applied(await apply({ soundRoot: c.dirs.sound, clips: [], main: passMainLevels(pieces, passGain, fps, warn) }, "EO Shorts: voice pass"));
  let voice = await renderTo("voice-1.wav");
  if (voice.loud.truePeak > PASS_PEAK_LIMIT) {
    passGain = Math.round((PASS_PEAK_LIMIT - voice.loud.truePeak) * 100) / 100;
    applied(await apply({ soundRoot: c.dirs.sound, clips: [], main: passMainLevels(pieces, passGain, fps, warn) }, "EO Shorts: voice pass (lower)"));
    voice = await renderTo("voice-2.wav");
  }
  const Iv = voice.loud.integrated;
  if (!Number.isFinite(Iv)) throw new Error("The voice render is silent.");

  const lift = rules.voiceLufs - Iv;
  const levels = bedLufs != null ? musicLevels(rules.voiceLufs, bedLufs) : null;
  const bed: MusicLay | null = pick && bedPath && levels ? { path: bedPath, start: 0, end: mainEnd, offsetSeconds: bedStart, line: duckLine(spans, mainEnd, fps, levels) } : null;
  const sfx: SfxLay[] = placed.placements.map((p) => ({ path: path(p.cue.file), start: p.start, end: p.end, gainDb: sfxGainDb(voice.loud.truePeak + lift, p.cue.peakDbfs) }));
  let mix: { path: string; loud: Loudness } | null = null;
  if (bed || sfx.length) {
    say("Rendering the mix…");
    applied(await apply({ soundRoot: c.dirs.sound, clips: soundClips(bed, sfx, fps, 0, warn).clips, main: passMainLevels(pieces, passGain, fps, warn) }, "EO Shorts: mix pass"));
    mix = await renderTo("mix-1.wav");
  }

  say("Setting the loudness…");
  const V = decodeWav(await readBytes(fs, voice.path));
  const R = mix ? subtractPcm(decodeWav(await readBytes(fs, mix.path)), V) : null;
  const model = buildStemModel(V, R, { fps, frames: mainEnd, c: 1 });
  const check = mix ? { integrated: mixLoudness(model, 1), truePeak: toDb(mixPeaks(model, 1, FLAT, fromDb(rules.ceilingDbtp)).peak) } : null;
  if (check && mix && (Math.abs(check.integrated - mix.loud.integrated) > 0.05 || Math.abs(check.truePeak - mix.loud.truePeak) > 0.1)) {
    warn("The mix model and the mix render disagree (" + check.integrated.toFixed(3) + "/" + check.truePeak.toFixed(3) + " against " + mix.loud.integrated.toFixed(3) + "/" + mix.loud.truePeak.toFixed(3) + "); the confirm render decides.");
  }
  model.c = R ? fromDb(Iv - rules.voiceLufs) : 0;
  model.exact.clear();
  let plan: LoudnessPlan = solveLoudness(model, rules);
  const passes: { pass: number; plan: { voiceGainDb: number; musicGainDb: number; dips: number; targetLufs: number }; predicted: { integrated: number; truePeak: number }; measured: Loudness; path: string }[] = [];
  let final: ApplyInput | null = null;
  let correction = { lu: 0, tpDb: 0 };
  const maxCorrections = c.options?.maxCorrections ?? 2;
  for (let n = 0; ; n += 1) {
    const vLine = voiceLine(passGain + plan.voiceGainDb, plan.dipLine);
    const clips = soundClips(bed, sfx, fps, plan.musicGainDb, warn);
    final = { soundRoot: c.dirs.sound, clips: clips.clips, main: finalMainLevels(pieces, vLine, fps, warn), label: "EO Shorts: music, effects and loudness" };
    applied(await apply(final, "EO Shorts: set the music, effects and loudness"));
    say("Checking the loudness…");
    const confirm = await renderTo("mix-" + (n + 2) + ".wav");
    const predicted = predictMix(model, plan.voiceGainDb, plan.dips, rules.ceilingDbtp);
    passes.push({ pass: n + 2, plan: { voiceGainDb: plan.voiceGainDb, musicGainDb: plan.musicGainDb, dips: plan.dips.length, targetLufs: plan.targetLufs }, predicted, measured: confirm.loud, path: confirm.path });
    await writeJsonAtomic(fs, path("loudness-pass-" + (n + 2) + ".json"), passes[passes.length - 1]);
    const aimI = (plan.ok ? plan.targetLufs : plan.predicted.integrated) + correction.lu;
    const aimTp = plan.ok ? rules.ceilingDbtp : Math.max(rules.ceilingDbtp, plan.predicted.truePeak + correction.tpDb);
    const offI = confirm.loud.integrated - aimI, overTp = confirm.loud.truePeak - aimTp;
    if ((Math.abs(offI) <= ACCEPT.lu && overTp <= ACCEPT.tpDb) || n >= maxCorrections) break;
    correction = { lu: correction.lu + (confirm.loud.integrated - predicted.integrated), tpDb: correction.tpDb + Math.max(0, confirm.loud.truePeak - predicted.truePeak) + 0.01 };
    warn("The loudness render missed (" + confirm.loud.integrated.toFixed(2) + " LUFS, " + confirm.loud.truePeak.toFixed(2) + " dBTP); solving again with the render's error.");
    plan = solveLoudness(model, { ...rules, targetLufs: rules.targetLufs - correction.lu, minTargetLufs: rules.minTargetLufs - correction.lu, ceilingDbtp: rules.ceilingDbtp - correction.tpDb, limitDbtp: rules.limitDbtp - correction.tpDb });
  }
  plan.problems.forEach(warn);
  const last = passes[passes.length - 1];
  for (const p of passes.slice(0, -1)) removeFile(fs, p.path);
  if (mix) removeFile(fs, mix.path);

  const report: SoundReport = {
    schema: "eo-sound/1",
    guard,
    music: pick && bed && levels ? {
      trackId: pick.track.id, title: pick.track.title, artist: pick.track.artist, file: pick.track.file, path: bed.path, license: pick.track.license, source: pick.track.source ?? null,
      startSeconds: bedStart, catalogStartSeconds: pick.startSeconds, playedLufs: bedLufs!, reason: pick.reason, asked: pick.asked, used: pick.used,
      passLevels: levels, offsetDb: plan.musicGainDb, audio: final!.clips.find((x) => x.role === "music")!.audio, stats: duckStats(bed.line, mainEnd, levels),
    } : null,
    sfx: { events: events.length, kept: thinned.kept, dropped: thinned.dropped, skipped: placed.skipped, placed: placed.placements.map((p, i) => ({ cue: p.cue.id, file: p.cue.file, kind: p.event.kind, frame: p.event.frame, start: p.start, end: p.end, gainDb: sfx[i].gainDb + plan.musicGainDb })) },
    speech: { spans: spans.length, frames: spans.reduce((n, s) => n + s.end - s.start, 0) },
    voice: { passGainDb: passGain, render: voice.loud, gainDb: passGain + plan.voiceGainDb, dips: plan.dips },
    loudness: {
      rules, plan: { ...plan, dipLine: undefined }, modelCheck: check && mix ? { predicted: check, measured: mix.loud } : null,
      passes: passes.map(({ path: p, ...x }) => ({ ...x, file: fs.basename(p) })),
      final: g4Verdict(last.measured, plan, rules),
    },
    credits: soundCredits(pick, placed.placements.map((p) => p.cue), sfxCatalog),
    commits: commits.filter(Boolean).length,
    warnings,
    ms: Date.now() - t0,
    skipped: false,
  };
  await writeJsonAtomic(fs, path("music.json"), report.music);
  await writeJsonAtomic(fs, path("sfx.json"), report.sfx);
  await writeJsonAtomic(fs, path("gain.json"), { voice: report.voice, loudness: report.loudness, main: final!.main });
  await writeJsonAtomic(fs, path("sound.json"), { inputsKey, final, report });
  return report;
}

async function measure(c: SoundInput, file: string, part?: { startSeconds: number; seconds: number }): Promise<Loudness> {
  return c.measure ? c.measure(file, part) : measureFile(c.host, file, { part, signal: c.signal });
}

async function copyInto(host: Pick<Host, "fs">, from: string, to: string): Promise<string> {
  const fs = host.fs;
  const a = fs.statSync(from), b = fs.statSync(to);
  if (!a) throw new Error("The packaged file " + from + " is missing; reinstall the plugin.");
  if (b && b.size === a.size) return to;
  ensureDir(fs, fs.dirname(to));
  if (fs.copyFile) {
    const tmp = to + ".part";
    removeFile(fs, tmp);
    await fs.copyFile(from, tmp);
    await renameWithRetry(fs, tmp, to);
  } else await writeFileAtomic(fs, to, await readBytes(fs, from));
  return to;
}
