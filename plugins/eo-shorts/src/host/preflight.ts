import type { Host } from "./types.ts";
import { eoOutputRefusal, type JobEntry } from "../jobs/store.ts";
import { lit, readScript } from "./runScript.ts";
import { readCapabilities, type Capabilities } from "./gates.ts";
import { runSmokeGate, type SmokeReport } from "./ffmpeg.ts";

export const MAX_SOURCE_SECONDS = 95;
export const MIN_SHORT_SIDE = 1080;

export type SourceWord = {
  text: string;
  startFrame: number;
  endFrame: number;
  sourceStartFrame: number | null;
  sourceEndFrame: number | null;
  sourceResourceId: string | null;
  speakerId: number | null;
  wordId: string | null;
  utteranceId: string | null;
  nonSpeech: boolean;
  unanalyzed: boolean;
  semanticEnd: boolean;
  filler: { type: string; groupId: string; removable: boolean | null } | null;
};

export type SourceClip = {
  clipId: number;
  trackId: string;
  resourceId: string | null;
  startFrame: number;
  endFrame: number;
  speed: { numerator: number; denominator: number } | null;
};

export type SourceSnapshot = {
  schema: "eo-source/1";
  projectId: string;
  draftId: string;
  name: string | null;
  fps: number;
  frameSize: { width: number; height: number };
  durationFrames: number;
  mainEndFrame: number;
  mainClips: SourceClip[];
  retimedClips: { clipId: number; trackId: string; trackKind: string; speed: string }[];
  words: SourceWord[];
  wordsOmitted: boolean;
};

export function sourceScript(projectId: string, draftId: string, maxSeconds = MAX_SOURCE_SECONDS): string {
  return `
const d = selects.draft(${lit(draftId)});
const meta = await d.meta();
const all = await d.clips({ trackScope: "all" });
const main = all.filter((c) => c.trackKind === "main");
const mainEndFrame = main.reduce((m, c) => Math.max(m, c.endFrame), 0);
const sp = (c: any) => c.playbackSpeed ? { numerator: c.playbackSpeed.numerator, denominator: c.playbackSpeed.denominator } : null;
const retimedClips = all
  .filter((c) => c.playbackSpeed && c.playbackSpeed.numerator !== c.playbackSpeed.denominator)
  .map((c) => ({ clipId: c.clipId, trackId: c.trackId, trackKind: c.trackKind, speed: c.playbackSpeed.numerator + "/" + c.playbackSpeed.denominator }));
const tooLong = mainEndFrame / meta.fps > ${maxSeconds} + 5;
const words = tooLong ? [] : (await d.words()).map((w) => ({
  text: w.text, startFrame: w.startFrame, endFrame: w.endFrame,
  sourceStartFrame: w.sourceStartFrame ?? null, sourceEndFrame: w.sourceEndFrame ?? null, sourceResourceId: w.sourceResourceId ?? null,
  speakerId: w.speakerId ?? null, wordId: w.wordId ?? null, utteranceId: w.utteranceId ?? null,
  nonSpeech: !!w.nonSpeech, unanalyzed: !!w.unanalyzed, semanticEnd: !!w.semanticEnd,
  filler: w.filler ? { type: w.filler.type, groupId: w.filler.groupId, removable: w.filler.removable ?? null } : null,
}));
return {
  schema: "eo-source/1", projectId: ${lit(projectId)}, draftId: ${lit(draftId)},
  name: meta.name, fps: meta.fps, frameSize: meta.frameSize, durationFrames: meta.durationFrames, mainEndFrame,
  mainClips: main.map((c) => ({ clipId: c.clipId, trackId: c.trackId, resourceId: c.resourceId, startFrame: c.startFrame, endFrame: c.endFrame, speed: sp(c) })),
  retimedClips, words, wordsOmitted: tooLong,
};`;
}

export type Problem = { code: string; message: string };

export function judgeSource(s: SourceSnapshot, madeBy: JobEntry | null = null): { errors: Problem[]; warnings: Problem[] } {
  const errors: Problem[] = [];
  const warnings: Problem[] = [];
  const output = eoOutputRefusal(madeBy, s.name);
  if (output) errors.push({ code: "eo-output", message: output });
  const seconds = s.fps > 0 ? s.mainEndFrame / s.fps : 0;
  if (!s.mainClips.length || s.mainEndFrame <= 0) errors.push({ code: "empty", message: "This draft has no clips on its Main track." });
  if (seconds > MAX_SOURCE_SECONDS) {
    errors.push({ code: "too-long", message: "This draft is " + seconds.toFixed(1) + " s long. Choose a clip of " + MAX_SOURCE_SECONDS + " s or less." });
  }
  const speech = s.words.filter((w) => !w.nonSpeech && !w.unanalyzed && w.text.trim());
  if (!s.wordsOmitted && speech.length === 0) {
    errors.push({ code: "no-transcript", message: "This draft has no transcript yet. Analyze the clip in Selects first, then try again." });
  }
  if (s.words.some((w) => w.unanalyzed)) warnings.push({ code: "unanalyzed", message: "Part of this draft has not been analyzed; its words are unknown." });
  const short = Math.min(s.frameSize?.width ?? 0, s.frameSize?.height ?? 0);
  if (short < MIN_SHORT_SIDE) {
    errors.push({ code: "low-res", message: "This draft is " + s.frameSize?.width + "x" + s.frameSize?.height + "; the short needs a 1080p source." });
  }
  const retimedMain = s.mainClips.filter((c) => c.speed && c.speed.numerator !== c.speed.denominator);
  if (retimedMain.length) {
    errors.push({ code: "retimed", message: retimedMain.length + " clip(s) on Main are not at 1x speed. Reset their speed first: export needs every clip at 1x." });
  }
  if (s.mainClips.some((c) => c.speed == null)) warnings.push({ code: "speed-unknown", message: "This Selects version does not report clip speed; 1x is assumed." });
  if (Math.abs(s.fps - 24000 / 1001) > 0.01) warnings.push({ code: "fps", message: "The draft runs at " + s.fps.toFixed(3) + " fps; timing parity is only guaranteed at 23.976." });
  return { errors, warnings };
}

export type PreflightReport = {
  ok: boolean;
  capabilities: Capabilities;
  smoke: SmokeReport | null;
  source: SourceSnapshot | null;
  errors: Problem[];
  warnings: Problem[];
  ms: number;
};

export async function runPreflight(
  host: Host,
  input: {
    projectId: string;
    draftId: string;
    signal?: AbortSignal | null;
      versionOverride?: string;
    skipSmoke?: boolean;
    madeBy?: JobEntry | null;
  },
): Promise<PreflightReport> {
  const t0 = host.now();
  const capabilities = await readCapabilities(host, input.versionOverride);
  const errors: Problem[] = [];
  const warnings: Problem[] = [];
  if (!capabilities.versionOk) errors.push({ code: "app-version", message: "Selects " + capabilities.version + " is too old; update Selects." });
  if (capabilities.fsMissing.length) errors.push({ code: "host-fs", message: "This Selects build lacks " + capabilities.fsMissing.join(", ") + "." });
  if (capabilities.runtimeMissing.length) errors.push({ code: "host-ffmpeg", message: "This Selects build lacks " + capabilities.runtimeMissing.join(", ") + "." });
  if (capabilities.canAuthorGeneratedMedia === false) {
    errors.push({ code: "generated-media", message: "Generated-media authoring is off for this account, so motion graphics would export broken." });
  }
  if (capabilities.mediaGeneration.pluginFiles === false) warnings.push({ code: "image-generation", message: "This Selects build cannot generate pictures for plugins; picture scenes become type scenes." });
  if (!capabilities.stockSearch) warnings.push({ code: "stock-search", message: "This Selects build has no stock footage search; B-roll shots stay on the speaker." });

  let smoke: SmokeReport | null = null;
  if (!input.skipSmoke && !capabilities.runtimeMissing.length) {
    smoke = await runSmokeGate(host.runtime, { signal: input.signal, platform: capabilities.platform });
    if (!smoke.version) errors.push({ code: "ffmpeg", message: "ffmpeg is not available in this Selects: " + (smoke.results[0]?.error ?? "unknown") });
    else for (const r of smoke.results.filter((x) => !x.ok)) warnings.push({ code: "ffmpeg-" + r.id, message: "ffmpeg cannot do " + r.usedFor + " (" + r.id + "): " + r.error });
  }

  const source = await readScript<SourceSnapshot>(host.sdk, "Read the source draft", sourceScript(input.projectId, input.draftId), { signal: input.signal });
  const judged = judgeSource(source, input.madeBy ?? null);
  errors.push(...judged.errors);
  warnings.push(...judged.warnings);
  return { ok: errors.length === 0, capabilities, smoke, source, errors, warnings, ms: host.now() - t0 };
}
