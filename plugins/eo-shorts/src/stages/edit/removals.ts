import { EDIT_POLICY } from "./policy.ts";
import type { Clause } from "./clauses.ts";
import type { DropReason } from "./keep.ts";
import { mergeRanges, rangesFrames, textSig, wordsAfterRemoval, type EditWord } from "./words.ts";

export type Removal = {
  kind: "clause" | "filler";
  id: string;
  reason: DropReason | string;
  frames: [number, number];
  words: [number, number];
  text: string;
};

export type RemovalPlan = {
  removals: Removal[];
  ranges: [number, number][];
  frames: number;
  removedIdx: number[];
  expect: { mainEnd: number; textSig: string; words: number };
};

export function fillerRuns(words: EditWord[]): { groupId: string; type: string; a: number; b: number }[] {
  const groups = new Set(words.filter((w) => w.filler && w.filler.removable === true).map((w) => w.filler!.groupId));
  const runs: { groupId: string; type: string; a: number; b: number }[] = [];
  words.forEach((w, i) => {
    if (!w.filler || !groups.has(w.filler.groupId)) return;
    const last = runs[runs.length - 1];
    if (last && last.groupId === w.filler.groupId && last.b === i - 1) last.b = i;
    else runs.push({ groupId: w.filler.groupId, type: w.filler.type, a: i, b: i });
  });
  return runs;
}

export function planRemovals(
  words: EditWord[],
  clauses: Clause[],
  drop: { id: string; reason: DropReason }[],
  mainEnd: number,
  trimFrames: number = EDIT_POLICY.fillerTrimFrames,
): RemovalPlan {
  const removals: Removal[] = [];
  const byId = new Map(clauses.map((c) => [c.id, c]));
  for (const d of drop) {
    const c = byId.get(d.id);
    if (!c) continue;
    removals.push({ kind: "clause", id: c.id, reason: d.reason, frames: [c.startFrame, c.endFrame], words: [c.wordStart, c.wordEnd], text: c.text });
  }
  for (const r of fillerRuns(words)) {
    const s = words[r.a].s + trimFrames;
    const e = words[r.b].e - trimFrames;
    if (e - s < 1) continue;
    removals.push({
      kind: "filler",
      id: r.groupId,
      reason: r.type,
      frames: [s, e],
      words: [r.a, r.b],
      text: words.slice(r.a, r.b + 1).map((w) => w.text).join(" "),
    });
  }
  removals.sort((x, y) => x.frames[0] - y.frames[0]);
  const ranges = mergeRanges(removals.map((r) => r.frames));
  const frames = rangesFrames(ranges);
  const { kept, removedIdx } = wordsAfterRemoval(words, ranges);
  return { removals, ranges, frames, removedIdx, expect: { mainEnd: mainEnd - frames, textSig: textSig(kept), words: kept.length } };
}
