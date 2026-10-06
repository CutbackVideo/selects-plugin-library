import type { EditPolicy } from "./policy.ts";
import type { EditRules } from "./inputs.ts";
import { finalRate, innerSilences, speakerRate, wordGaps } from "./pace.ts";
import type { EditWord } from "./words.ts";
import type { Removal } from "./removals.ts";
import type { WordsConsistency } from "./consistency.ts";
import type { Silence } from "../../host/ffmpegParse.ts";

export type Gate = { ok: boolean; value: number; limit: number; detail?: string };

export type EditGates = { rate: Gate; wordGaps: Gate; audioPauses: Gate; words: { ok: boolean }; length: { ok: boolean; durationFrames: number; mainEnd: number } };

const r3 = (x: number) => Math.round(x * 1000) / 1000;

export function editGates(input: {
  policy: Pick<EditPolicy, "speakerGapCapSeconds" | "rateTargetFactor" | "wordGapGateSeconds" | "pauseGateSeconds">;
  before: EditWord[];
  after: EditWord[];
  fps: number;
  mainEnd: number;
  durationFrames: number;
  fileSeconds: number;
  gateSilences: Silence[];
  consistency: WordsConsistency;
}) {
  const pol = input.policy;
  const speaker = speakerRate(input.before, input.fps, pol.speakerGapCapSeconds, pol.rateTargetFactor);
  const rate = finalRate(input.after, input.mainEnd, input.fps);
  const gaps = wordGaps(input.after, input.fps, pol.wordGapGateSeconds);
  const pauses = innerSilences(input.gateSilences, input.after, input.fps, input.fileSeconds).filter((s) => s.duration >= pol.pauseGateSeconds - 1e-9);
  const gates: EditGates = {
    rate: { ok: rate.wpm >= speaker.targetWpm, value: rate.wpm, limit: speaker.targetWpm },
    wordGaps: { ok: gaps.max < pol.wordGapGateSeconds, value: gaps.max, limit: pol.wordGapGateSeconds, detail: gaps.maxAfter ? "after “" + gaps.maxAfter + "”" : undefined },
    audioPauses: { ok: pauses.length === 0, value: pauses.length, limit: 0, detail: pauses.map((p) => r3(p.start) + "–" + r3(p.end) + " s").join(", ") || undefined },
    words: { ok: input.consistency.ok },
    length: { ok: input.durationFrames === input.mainEnd, durationFrames: input.durationFrames, mainEnd: input.mainEnd },
  };
  return { speaker, rate, gaps, pauses: pauses.map((p) => ({ start: r3(p.start), end: r3(p.end), seconds: r3(p.duration) })), gates };
}

export function gateWarnings(g: EditGates): string[] {
  const out: string[] = [];
  if (!g.rate.ok) out.push("The talk is " + g.rate.value + " wpm, under the speaker's target of " + g.rate.limit + " wpm.");
  if (!g.wordGaps.ok) out.push("A pause of " + g.wordGaps.value + " s is left between words" + (g.wordGaps.detail ? " (" + g.wordGaps.detail + ")" : "") + ".");
  if (!g.audioPauses.ok) out.push(g.audioPauses.value + " pause(s) of 0.3 s or more remain in the voice: " + g.audioPauses.detail + ".");
  if (!g.words.ok) out.push("The words after the edit do not match the words before it minus the cuts (see edit/edit.json).");
  if (!g.length.ok) out.push("The draft reports " + g.length.durationFrames + " frames but Main ends at " + g.length.mainEnd + ".");
  return out;
}

export function editSummary(input: {
  rules: EditRules;
  jobId: string;
  draftId: string;
  fps: number;
  before: { mainEnd: number; words: number };
  after: { mainEnd: number; durationFrames: number; words: number };
  removals: Removal[];
  keep: { accepted: boolean; skipped: string | null; provider?: string; model?: string; dropped: number };
  silence: { rows: number; cutFrames: number; restoreRows: number };
  audioPasses: unknown[];
  voice: { path: string; integrated: number; truePeak: number | null; lra: number | null; seconds: number };
  measured: ReturnType<typeof editGates>;
  consistency: WordsConsistency;
}) {
  const frames = (f: number) => ({ frames: f, seconds: r3(f / input.fps) });
  return {
    schema: "eo-edit/1",
    version: input.rules.version,
    jobId: input.jobId,
    draftId: input.draftId,
    fps: input.fps,
    policy: input.rules.policy,
    before: { ...frames(input.before.mainEnd), words: input.before.words },
    after: { ...frames(input.after.mainEnd), durationFrames: input.after.durationFrames, words: input.after.words },
    removed: {
      clauses: input.removals.filter((r) => r.kind === "clause"),
      fillers: input.removals.filter((r) => r.kind === "filler"),
      silenceSpans: input.silence,
      audioPasses: input.audioPasses,
    },
    keep: input.keep,
    speakerRate: input.measured.speaker,
    rate: input.measured.rate,
    wordGaps: input.measured.gaps,
    audioPauses: input.measured.pauses,
    voice: input.voice,
    words: input.consistency,
    gates: input.measured.gates,
  };
}
