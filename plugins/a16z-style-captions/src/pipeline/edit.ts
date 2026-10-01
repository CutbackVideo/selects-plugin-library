// Pause compression (spec 13.5, tight register): long pauses are cut down to the house gaps — none
// between words of a phrase, a breath at a comma, a short beat at a sentence end — and a few planned
// beats (before a punchline) keep half a second. Small savings are left alone: every cut is a jump cut.
import type { SrcWord, SrcClip } from "./source";
import type { Tags } from "../captions/types";

const FILLER = /^(uh+|um+|uhm+|erm+|er|ah+|hmm+|mm+)[.,!?]*$/i;

export type CutPlan = { ranges: [number, number][]; removed: number; cuts: number; beats: number };

export function planPauses(words: SrcWord[], fps: number, endFrame: number, tags: Tags = {}): CutPlan {
  const ws = words.filter((w) => !(FILLER.test(w.t.trim()) && (w.e - w.s) / fps >= 0.1));
  if (!ws.length) return { ranges: [[0, endFrame]], removed: 0, cuts: 0, beats: 0 };
  const sec = (f: number) => f / fps;
  // candidate gaps between consecutive kept words
  type Gap = { k: number; gap: number; target: number; save: number; beat: boolean };
  const gaps: Gap[] = [];
  const punchStarts = new Set((tags.punchlines || []).map((p) => p[0]));
  for (let k = 0; k + 1 < ws.length; k += 1) {
    const a = ws[k];
    const b = ws[k + 1];
    const gap = sec(b.s - a.e);
    const t = a.t.trim();
    const sentence = /[.!?]["”’)]*$/.test(t);
    const comma = /[,;:]["”’)]*$/.test(t);
    const target = sentence ? 0.22 : comma ? 0.14 : 0.1;
    gaps.push({ k, gap, target, save: gap - target, beat: sentence && punchStarts.has(b.i) });
  }
  // planned beats: a sentence end before a punchline (or, without tags, the longest sentence pauses),
  // about three per minute, kept at 0.45 s
  const minutes = sec(ws[ws.length - 1].e - ws[0].s) / 60;
  const beatBudget = Math.max(1, Math.round(3 * minutes));
  let beatList = gaps.filter((g) => g.beat && g.gap > 0.45);
  if (!tags.punchlines) beatList = gaps.filter((g) => /[.!?]["”’)]*$/.test(ws[g.k].t.trim()) && g.gap > 0.6).sort((a, b) => b.gap - a.gap);
  beatList.slice(0, beatBudget).forEach((g) => {
    g.target = 0.45;
    g.save = g.gap - g.target;
    g.beat = true;
  });
  // cut only where it saves at least a quarter second, at most ~16 cuts a minute (biggest savings first)
  const maxCuts = Math.max(2, Math.round(16 * minutes));
  const chosen = new Set(
    gaps
      .filter((g) => g.save >= 0.25)
      .sort((a, b) => b.save - a.save)
      .slice(0, maxCuts)
      .map((g) => g.k)
  );
  const ranges: [number, number][] = [];
  let start = Math.max(0, ws[0].s - Math.round(0.06 * fps));
  for (const g of gaps) {
    if (!chosen.has(g.k)) continue;
    const a = ws[g.k];
    const b = ws[g.k + 1];
    const tail = Math.max(Math.round(0.06 * fps), Math.round(g.target * 0.6 * fps));
    const lead = Math.max(1, Math.round(g.target * fps) - tail);
    ranges.push([start, Math.min(b.s, a.e + tail)]);
    start = Math.max(a.e + tail, b.s - lead);
  }
  ranges.push([start, Math.min(endFrame, ws[ws.length - 1].e + Math.round(0.12 * fps))]);
  const kept = ranges.reduce((n, r) => n + (r[1] - r[0]), 0);
  return { ranges: ranges.filter((r) => r[1] > r[0]), removed: sec(endFrame - kept), cuts: ranges.length - 1, beats: gaps.filter((g) => g.beat).length };
}

// The new Draft's Main clips, predicted from the ranges: each range is split where the source Draft's
// clips change, and the pieces are laid end to end.
export type NewClip = { start: number; end: number; src: SrcClip; srcIn: number; jump: boolean };

export function layoutRanges(ranges: [number, number][], clips: SrcClip[], fps: number): NewClip[] {
  const out: NewClip[] = [];
  let at = 0;
  let prevSrc: SrcClip | null = null;
  ranges.forEach(([a, b], ri) => {
    const parts = clips.filter((c) => c.e > a && c.s < b).sort((x, y) => x.s - y.s);
    parts.forEach((c, j) => {
      const s = Math.max(a, c.s);
      const e = Math.min(b, c.e);
      if (e <= s) return;
      // a jump cut: the same source clip continues after a removed pause
      const jump = j === 0 && ri > 0 && prevSrc === c;
      out.push({ start: at, end: at + (e - s), src: c, srcIn: c.srcStart >= 0 ? c.srcStart + (s - c.s) / fps : -1, jump });
      at += e - s;
      prevSrc = c;
    });
  });
  return out;
}
