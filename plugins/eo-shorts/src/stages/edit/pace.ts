import { EDIT_POLICY } from "./policy.ts";
import { countable, type EditWord } from "./words.ts";
import type { Silence } from "../../host/ffmpegParse.ts";

const round = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d;

export type SpeakerRate = {
  words: number;
  wordSeconds: number;
  gapSeconds: number;
  wpm: number;
  articulationWpm: number;
  targetWpm: number;
};

export function speakerRate(words: EditWord[], fps: number, cap: number = EDIT_POLICY.speakerGapCapSeconds, factor: number = EDIT_POLICY.rateTargetFactor): SpeakerRate {
  const sp = countable(words);
  const wordSeconds = sp.reduce((n, w) => n + (w.e - w.s) / fps, 0);
  let gapSeconds = 0;
  for (let i = 1; i < sp.length; i += 1) gapSeconds += Math.min(cap, Math.max(0, (sp[i].s - sp[i - 1].e) / fps));
  const total = wordSeconds + gapSeconds;
  const wpm = total > 0 ? sp.length / (total / 60) : 0;
  return {
    words: sp.length,
    wordSeconds: round(wordSeconds, 3),
    gapSeconds: round(gapSeconds, 3),
    wpm: round(wpm),
    articulationWpm: wordSeconds > 0 ? round(sp.length / (wordSeconds / 60)) : 0,
    targetWpm: round(wpm * factor),
  };
}

export function finalRate(words: EditWord[], mainEndFrame: number, fps: number): { words: number; seconds: number; wpm: number } {
  const n = countable(words).length;
  const seconds = mainEndFrame / fps;
  return { words: n, seconds: round(seconds, 3), wpm: seconds > 0 ? round(n / (seconds / 60)) : 0 };
}

export type WordGaps = { max: number; maxAfter: string | null; over: { after: string; before: string; seconds: number }[] };

export function wordGaps(words: EditWord[], fps: number, gate: number = EDIT_POLICY.wordGapGateSeconds): WordGaps {
  const sp = countable(words);
  let max = 0;
  let maxAfter: string | null = null;
  const over: WordGaps["over"] = [];
  for (let i = 1; i < sp.length; i += 1) {
    const g = (sp[i].s - sp[i - 1].e) / fps;
    if (g > max) {
      max = g;
      maxAfter = sp[i - 1].text;
    }
    if (g >= gate - 1e-9) over.push({ after: sp[i - 1].text, before: sp[i].text, seconds: round(g, 3) });
  }
  return { max: round(max, 3), maxAfter, over };
}

export function innerSilences(silences: Silence[], words: EditWord[], fps: number, fileSeconds: number): (Silence & { end: number; duration: number })[] {
  const sp = countable(words);
  if (!sp.length) return [];
  const first = sp[0].s / fps;
  const last = sp[sp.length - 1].e / fps;
  return silences
    .filter((s): s is Silence & { end: number } => s.end != null)
    .map((s) => ({ ...s, end: s.end, duration: s.duration ?? s.end - s.start }))
    .filter((s) => s.end > first + 1e-6 && s.start < last - 1e-6 && s.start > 0.001 && s.end < fileSeconds - 0.01);
}
