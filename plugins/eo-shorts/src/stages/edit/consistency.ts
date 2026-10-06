import type { EditWord } from "./words.ts";

export type WordsConsistency = {
  ok: boolean;
  expected: number;
  actual: number;
  textMismatches: { at: number; expected: string; actual: string }[];
  lengthChanged: { at: number; text: string; before: number; after: number }[];
  sourceMoved: { at: number; text: string }[];
  overlaps: number;
};

export function checkWords(before: EditWord[], removedIdx: number[], after: EditWord[]): WordsConsistency {
  const gone = new Set(removedIdx);
  const expected = before.filter((_, i) => !gone.has(i));
  const textMismatches: WordsConsistency["textMismatches"] = [];
  const lengthChanged: WordsConsistency["lengthChanged"] = [];
  const sourceMoved: WordsConsistency["sourceMoved"] = [];
  const n = Math.min(expected.length, after.length);
  for (let i = 0; i < n; i += 1) {
    const x = expected[i];
    const y = after[i];
    if (x.text !== y.text) {
      if (textMismatches.length < 5) textMismatches.push({ at: i, expected: x.text, actual: y.text });
      continue;
    }
    if (x.e - x.s !== y.e - y.s) lengthChanged.push({ at: i, text: y.text, before: x.e - x.s, after: y.e - y.s });
    if (x.ss != null && y.ss != null && (x.ss !== y.ss || x.se !== y.se)) sourceMoved.push({ at: i, text: y.text });
  }
  const overlapping = (ws: EditWord[]) => ws.reduce((k, w, i) => k + (i > 0 && w.s < ws[i - 1].e ? 1 : 0), 0);
  const overlaps = Math.max(0, overlapping(after) - overlapping(expected));
  const ok = expected.length === after.length && !textMismatches.length && !lengthChanged.length && !sourceMoved.length && overlaps === 0;
  return { ok, expected: expected.length, actual: after.length, textMismatches, lengthChanged: lengthChanged.slice(0, 10), sourceMoved: sourceMoved.slice(0, 10), overlaps };
}
