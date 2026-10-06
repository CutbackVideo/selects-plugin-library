import { finalRate, innerSilences, wordGaps } from "../edit/pace.ts";
import type { EditWord } from "../edit/words.ts";
import type { Silence } from "../../host/ffmpegParse.ts";
import type { MediaProbe } from "../../host/ffmpeg.ts";
import type { CoverageReport } from "../compose/coverage.ts";
import type { Loudness } from "../sound/ebur128Measure.ts";
import { G4, type G4Verdict } from "../sound/soundReport.ts";
import type { VoiceMatch } from "./audio.ts";
import type { BlackVerdict, PictureVerdict } from "./frames.ts";
import type { CreditsCheck } from "./credits.ts";

export type GateId = "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7" | "G8" | "G9" | "G10";
export type GateStatus = "pass" | "fail" | "skip";
export type Gate = { id: GateId; name: string; status: GateStatus; summary: string; problems: string[]; data: Record<string, unknown> };

export const ACCEPTANCE: readonly GateId[] = ["G1", "G2", "G3", "G4", "G5", "G6", "G8", "G10"];

export const LIMITS = {
  wordGapSeconds: 0.3,
  pauseSeconds: 0.3,
  pauseGateOffsetDb: -25,
  pauseInfoOffsetDb: -18,
  musicCoverage: 0.95,
  residualMinLufs: -40,
  residualUnderVoiceLu: 8,
  voiceCorrelation: 0.97,
} as const;

const r = (x: number, d = 1) => (Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : x);
const gate = (id: GateId, name: string, problems: string[], summary: string, data: Record<string, unknown>, skip = false): Gate => ({ id, name, status: skip ? "skip" : problems.length ? "fail" : "pass", summary, problems, data });

export type SpeakerTarget = { wpm: number; articulationWpm: number | null; targetWpm: number; from: "edit" | "source" };

export function g1Rate(i: { words: EditWord[] | null; mainEnd: number; fps: number; speaker: SpeakerTarget | null }): Gate {
  if (!i.words || !i.speaker) return gate("G1", "Pace", [], "not measured: " + (!i.words ? "no words" : "no speaker rate"), {}, true);
  const rate = finalRate(i.words, i.mainEnd, i.fps);
  const ok = rate.wpm >= i.speaker.targetWpm;
  return gate("G1", "Pace", ok ? [] : ["the talk is " + rate.wpm + " wpm, under the speaker's target of " + i.speaker.targetWpm], rate.wpm + " wpm (target " + i.speaker.targetWpm + ", speaker " + i.speaker.wpm + " x 0.97)", { ...rate, speaker: i.speaker });
}

export type VoicePauses = { file: string; integrated: number; seconds: number; gate: { noiseDb: number; list: Silence[] }; info: { noiseDb: number; list: Silence[] } | null };

export function g2Pauses(i: { words: EditWord[] | null; fps: number; voice: VoicePauses | null }): Gate {
  if (!i.words) return gate("G2", "Pauses", [], "not measured: no words", {}, true);
  const gaps = wordGaps(i.words, i.fps, LIMITS.wordGapSeconds);
  const problems: string[] = [];
  if (!(gaps.max < LIMITS.wordGapSeconds)) problems.push("a gap of " + gaps.max + " s between words" + (gaps.maxAfter ? " (after “" + gaps.maxAfter + "”)" : ""));
  const data: Record<string, unknown> = { longestWordGap: gaps.max, after: gaps.maxAfter, gapsOver: gaps.over };
  if (!i.voice) return gate("G2", "Pauses", problems, "longest word gap " + gaps.max + " s; the voice was not measured", data, problems.length === 0);
  const inner = (list: Silence[]) => innerSilences(list, i.words!, i.fps, i.voice!.seconds).filter((s) => s.duration >= LIMITS.pauseSeconds - 1e-9);
  const pauses = inner(i.voice.gate.list);
  if (pauses.length) problems.push(pauses.length + " pause(s) of " + LIMITS.pauseSeconds + " s or more in the voice: " + pauses.map((p) => r(p.start, 2) + "-" + r(p.end, 2) + " s").join(", "));
  const info = i.voice.info ? inner(i.voice.info.list) : null;
  Object.assign(data, {
    voice: i.voice.file,
    integrated: i.voice.integrated,
    gateNoiseDb: i.voice.gate.noiseDb,
    pauses: pauses.map((p) => ({ start: r(p.start, 3), end: r(p.end, 3), seconds: r(p.duration, 3) })),
    ...(info && i.voice.info ? { infoNoiseDb: i.voice.info.noiseDb, pausesAtInfoLevel: info.map((p) => ({ start: r(p.start, 3), end: r(p.end, 3), seconds: r(p.duration, 3) })) } : {}),
  });
  return gate("G2", "Pauses", problems, "longest word gap " + gaps.max + " s, " + pauses.length + " pause(s) in the voice", data);
}

export type MusicClip = { start: number; end: number; path: string | null; muted: boolean; maxDb: number | null };

export function g3Music(i: { mainEnd: number; clips: MusicClip[]; match: VoiceMatch | null }): Gate {
  const problems: string[] = [];
  const covered = new Set<number>();
  for (const c of i.clips) for (let f = Math.max(0, c.start); f < Math.min(i.mainEnd, c.end); f += 1) covered.add(f);
  const coverage = i.mainEnd > 0 ? covered.size / i.mainEnd : 0;
  if (!i.clips.length) problems.push("no music clip on the draft");
  else if (coverage < LIMITS.musicCoverage) problems.push("the music covers " + r(coverage * 100) + "% of the film");
  const silent = i.clips.filter((c) => c.muted || (c.maxDb != null && c.maxDb <= -60));
  if (silent.length) problems.push(silent.length + " music clip(s) are muted");
  const m = i.match;
  if (!m) problems.push("the mix was not measured against the voice");
  else {
    if (!(m.residualLufs >= LIMITS.residualMinLufs)) problems.push("what is not the voice measures " + r(m.residualLufs, 2) + " LUFS: no music to hear");
    else if (!(m.voiceLufs - m.residualLufs >= LIMITS.residualUnderVoiceLu)) problems.push("the music is only " + r(m.voiceLufs - m.residualLufs, 2) + " LU under the voice");
  }
  const summary = (i.clips.length ? r(coverage * 100) + "% covered" : "no music") + (m ? ", music " + r(m.residualLufs, 1) + " LUFS, " + r(m.voiceLufs - m.residualLufs, 1) + " LU under the voice" : "");
  return gate("G3", "Music", problems, summary, { clips: i.clips, coverage, residualLufs: m?.residualLufs ?? null, voiceLufs: m?.voiceLufs ?? null });
}

export function g4Loudness(i: { mp4: Loudness | null; sound: G4Verdict | null }): Gate {
  if (!i.mp4) return gate("G4", "Loudness", ["the MP4 was not measured"], "not measured", { sound: i.sound });
  const problems: string[] = [];
  const { integrated, truePeak } = i.mp4;
  if (!(Math.abs(integrated - G4.lufs) <= G4.toleranceLu)) problems.push("the MP4 measures " + r(integrated, 2) + " LUFS, outside " + G4.lufs + " +/- " + G4.toleranceLu);
  if (!(truePeak <= G4.maxTruePeak)) problems.push("its true peak is " + r(truePeak, 2) + " dBTP, over " + G4.maxTruePeak.toFixed(1));
  if (i.sound && !i.sound.ok) problems.push("the sound stage reports: " + (i.sound.failure ?? "the mix fails G4"));
  return gate("G4", "Loudness", problems, r(integrated, 2) + " LUFS / " + r(truePeak, 2) + " dBTP", { mp4: i.mp4, sound: i.sound });
}

export function rate(text: string | null | undefined): number {
  const m = /^(\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?))?$/.exec(String(text ?? "").trim());
  if (!m) return NaN;
  return m[2] ? Number(m[1]) / Number(m[2]) : Number(m[1]);
}

export function g5Format(i: { probe: MediaProbe | null; fps: number; mainEnd: number; size?: { width: number; height: number } }): Gate {
  const p = i.probe;
  if (!p?.video) return gate("G5", "Format", ["the MP4 has no readable video stream"], "not readable", { probe: p });
  const size = i.size ?? { width: 1080, height: 1920 };
  const v = p.video;
  const problems: string[] = [];
  if (v.width !== size.width || v.height !== size.height) problems.push("the video is " + v.width + "x" + v.height + ", not " + size.width + "x" + size.height);
  const fps = rate(v.fps);
  if (!(Math.abs(fps - i.fps) < 1e-4)) problems.push("the video runs at " + v.fps + " fps, the draft at " + r(i.fps, 3));
  if (v.nbFrames !== i.mainEnd) problems.push("the video has " + v.nbFrames + " frames, Main " + i.mainEnd);
  if (p.audio?.codec !== "aac") problems.push(p.audio ? "the audio is " + p.audio.codec + ", not AAC" : "the MP4 has no audio");
  return gate("G5", "Format", problems, v.width + "x" + v.height + ", " + v.fps + ", " + v.nbFrames + " frames, " + (p.audio?.codec ?? "no audio"), { probe: p, expectFrames: i.mainEnd });
}

export function g6Structure(i: { coverage: CoverageReport | null; readError: string | null; planScenes: string[]; composed: { sceneId: string; parts: { label: string }[] }[]; foreignOverlays: string[] }): Gate {
  const problems: string[] = [];
  if (i.readError) problems.push("the draft could not be read as composed: " + i.readError);
  const c = i.coverage;
  if (c) {
    if (c.graphics.missing.length) problems.push(c.graphics.missing.length + " graphic(s) missing: " + c.graphics.missing.join(", "));
    if (c.graphics.duplicates.length) problems.push("graphics placed twice: " + c.graphics.duplicates.join(", "));
    if (c.graphics.misplaced.length) problems.push("graphics moved: " + c.graphics.misplaced.join("; "));
    if (c.graphics.stale.length) problems.push("graphics of an earlier build left: " + c.graphics.stale.join(", "));
    if (c.overlays.missing.length) problems.push("footage missing: " + c.overlays.missing.join(", "));
    if (c.overlays.unexpected.length) problems.push("footage not planned: " + c.overlays.unexpected.join(", "));
    if (c.uncovered.length) problems.push("frames nothing fills: " + c.uncovered.map((u) => u.start + "-" + (u.end - 1)).join(", "));
  } else if (!i.readError) problems.push("the composition was not read");
  const planned = new Set(i.planScenes);
  const composed = new Set(i.composed.map((s) => s.sceneId));
  const lost = i.planScenes.filter((s) => !composed.has(s));
  const extra = [...composed].filter((s) => planned.size && !planned.has(s));
  if (lost.length) problems.push("planned scene(s) not built: " + lost.join(", "));
  if (extra.length) problems.push("built scene(s) not in the plan: " + extra.join(", "));
  const badLabels = i.composed.flatMap((s) => s.parts.filter((p) => !p.label.startsWith("EO " + s.sceneId)).map((p) => p.label));
  if (badLabels.length) problems.push("graphic labels that do not name their scene: " + badLabels.join(", "));
  if (i.foreignOverlays.length) problems.push("footage from outside the job folder: " + i.foreignOverlays.join(", "));
  const parts = i.composed.reduce((n, s) => n + s.parts.length, 0);
  const summary = i.composed.length + " scene(s), " + (c ? c.graphics.placed + "/" + c.graphics.expected + " graphics, " + c.overlays.placed + "/" + c.overlays.expected + " footage, " + (c.uncovered.length ? "gaps" : "every frame filled") : parts + " graphics");
  return gate("G6", "Structure", problems, summary, { coverage: c, planScenes: i.planScenes, parts });
}

export function g7Screen(i: { black: BlackVerdict[] | null; pictures: PictureVerdict[]; sheets: string[]; samples: number; missingFrames?: number[]; compileWarnings: string[] }): Gate {
  const problems: string[] = [];
  if (!i.black) problems.push("black frames were not measured");
  const black = (i.black ?? []).filter((b) => !b.planned);
  if (black.length) problems.push(black.length + " black run(s): " + black.map((b) => "f" + b.frames[0] + "-" + (b.frames[1] - 1) + " (" + r(b.duration, 2) + " s)").join(", "));
  const blank = i.pictures.filter((p) => p.blank === true);
  if (blank.length) problems.push(blank.length + " picture(s) drawn blank at their entrance: " + blank.map((p) => p.sceneId + " " + p.picture + " f" + p.entrance).join(", "));
  const judged = i.pictures.filter((p) => p.blank != null).length;
  return gate("G7", "Picture", problems, black.length + " black run(s), " + blank.length + "/" + judged + " picture(s) blank, " + i.samples + " frames on " + i.sheets.length + " sheet(s)", {
    black: i.black,
    pictures: i.pictures,
    sheets: i.sheets,
    missingFrames: i.missingFrames ?? [],
    compileWarnings: i.compileWarnings,
  });
}

export function g8Voice(i: { match: VoiceMatch | null }): Gate {
  const m = i.match;
  if (!m) return gate("G8", "Voice", ["the MP4 was not compared with the voice"], "not measured", {});
  const ok = m.correlation >= LIMITS.voiceCorrelation;
  return gate("G8", "Voice", ok ? [] : ["the MP4 correlates " + r(m.correlation, 4) + " with the voice, under " + LIMITS.voiceCorrelation], "r = " + r(m.correlation, 4) + " (best " + r(m.bestCorrelation, 4) + " at " + r(m.bestLagMs, 2) + " ms)", { ...m });
}

export type PlanGate = { passed: boolean; failed: string[]; fallbackScenes?: string[]; wholeFilmFallback?: unknown };

export function g9Plan(i: { planGate: PlanGate | null; lint: { sceneId: string; errors: string[] }[]; fallbacks: string[] }): Gate {
  const problems: string[] = [];
  const failing = i.lint.filter((l) => l.errors.length);
  if (failing.length) problems.push(failing.length + " scene plan(s) fail the lint: " + failing.map((l) => l.sceneId + " (" + l.errors[0] + ")").join("; "));
  if (i.planGate && !i.planGate.passed) problems.push("the plan stage's gate failed: " + i.planGate.failed.join("; "));
  if (!i.lint.length) problems.push("no scene plans to check");
  const summary = i.lint.length - failing.length + "/" + i.lint.length + " plans pass the lint, " + i.fallbacks.length + " fallback(s)";
  return gate("G9", "Plan", problems, summary, { lint: i.lint, planGate: i.planGate, fallbacks: i.fallbacks });
}

export function g10Credits(i: { check: CreditsCheck | null }): Gate {
  if (!i.check) return gate("G10", "Credits", ["the credits were not checked"], "not checked", {});
  return gate("G10", "Credits", i.check.problems, i.check.credited + "/" + i.check.assets + " outside asset(s) credited", { ...i.check });
}

export type Acceptance = { gates: GateId[]; passed: boolean; failing: GateId[] };

export function acceptance(gates: Gate[]): Acceptance {
  const failing = ACCEPTANCE.filter((id) => gates.find((g) => g.id === id)?.status !== "pass");
  return { gates: [...ACCEPTANCE], passed: failing.length === 0, failing };
}
