import type { EditWord } from "../edit/words.ts";

export const R8_FPS_RATIONAL = "2997/125";
export const R8_FPS = 2997 / 125;

export type PlanWord = { text: string; start: number; end: number; speakerId?: number };

export type PlanSource = {
  durationFrames: number;
  fpsRational: string;
  cameraFootageAvailableThroughout?: boolean;
  sourceObservations?: Record<string, unknown>;
  fps: number;
  words: PlanWord[];
};

export type FootageObservations = { rawFootage?: string; cameraFootageAvailableThroughout?: boolean };

export function planClock(fps: number): { fpsRational: string; fps: number; r8: boolean } {
  if (Math.abs(fps - 24000 / 1001) < 1e-3 || Math.abs(fps - R8_FPS) < 1e-6) return { fpsRational: R8_FPS_RATIONAL, fps: R8_FPS, r8: true };
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  for (const den of [1, 1001, 1000, 125, 100]) {
    const num = Math.round(fps * den);
    if (num > 0 && Math.abs(num / den - fps) < 1e-6) {
      const g = gcd(num, den);
      return { fpsRational: num / g + "/" + den / g, fps: num / den, r8: false };
    }
  }
  return { fpsRational: String(fps), fps, r8: false };
}

export type SourceInput = {
  words: Pick<EditWord, "text" | "s" | "e" | "speakerId" | "nonSpeech">[];
  mainEnd: number;
  fps: number;
  observations?: FootageObservations | null;
  extraObservations?: Record<string, unknown>;
};

export type SourceBuild = { source: PlanSource; left: { nonSpeech: number; empty: number }; clock: ReturnType<typeof planClock> };

export function planSourceFrom(input: SourceInput): SourceBuild {
  const clock = planClock(input.fps);
  let nonSpeech = 0;
  let empty = 0;
  const words: PlanWord[] = [];
  for (const w of input.words) {
    if (w.nonSpeech) {
      nonSpeech += 1;
      continue;
    }
    if (!String(w.text ?? "").trim()) {
      empty += 1;
      continue;
    }
    words.push({ text: w.text, start: w.s, end: w.e, ...(typeof w.speakerId === "number" ? { speakerId: w.speakerId } : {}) });
  }
  const source: PlanSource = { durationFrames: input.mainEnd, fpsRational: clock.fpsRational } as PlanSource;
  const obs = input.observations;
  if (obs && typeof obs.cameraFootageAvailableThroughout === "boolean") source.cameraFootageAvailableThroughout = obs.cameraFootageAvailableThroughout;
  const so: Record<string, unknown> = {};
  if (obs && typeof obs.rawFootage === "string" && obs.rawFootage.trim()) so.rawFootage = obs.rawFootage.trim();
  Object.assign(so, input.extraObservations ?? {});
  if (Object.keys(so).length) source.sourceObservations = so;
  source.fps = clock.fps;
  source.words = words;
  return { source, left: { nonSpeech, empty }, clock };
}

export function sourceProblems(source: PlanSource): string[] {
  const problems: string[] = [];
  if (!Number.isInteger(source.durationFrames) || source.durationFrames <= 0) problems.push("the draft has no length");
  const words = source.words;
  if (!Array.isArray(words) || !words.length) return [...problems, "the draft has no spoken words (analyze it first)"];
  words.forEach((w, i) => {
    if (typeof w.text !== "string" || !w.text.trim()) problems.push("word " + i + " has no text");
    else if (!Number.isInteger(w.start) || !Number.isInteger(w.end) || !(0 <= w.start && w.start <= w.end && w.end <= source.durationFrames)) {
      problems.push("word " + i + " (" + JSON.stringify(w.text) + ") lies outside the draft (" + w.start + "-" + w.end + " of " + source.durationFrames + ")");
    }
  });
  for (let i = 1; i < words.length; i += 1) if (words[i - 1].start > words[i].start) problems.push("words " + (i - 1) + " and " + i + " are out of order");
  return problems.slice(0, 12);
}
