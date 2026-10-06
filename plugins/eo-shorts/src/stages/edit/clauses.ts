import { EDIT_POLICY } from "./policy.ts";
import { isCountable, type EditWord } from "./words.ts";

export type Segment = { s: number; e: number; text?: string };

export type Clause = {
  id: string;
  wordStart: number;
  wordEnd: number;
  startFrame: number;
  endFrame: number;
  text: string;
  words: number;
  from: "segment" | "split" | "sentence";
};

export function clauseId(n: number): string {
  return "c" + String(n + 1).padStart(2, "0");
}

const SENTENCE_END = /[.?!]["'”’)\]]*$/;
const SOFT_END = /[,;:—–-]["'”’)\]]*$/;

function breakStrength(w: EditWord): number {
  const t = w.text.trim();
  if (w.semanticEnd || SENTENCE_END.test(t)) return 2;
  if (SOFT_END.test(t)) return 1;
  return 0;
}

function splitLong(words: EditWord[], a: number, b: number, max: number): [number, number][] {
  const n = words.slice(a, b + 1).filter(isCountable).length;
  if (n <= max || b <= a) return [[a, b]];
  const mid = (a + b) / 2;
  let best = -1;
  let bestScore = -Infinity;
  for (let i = a; i < b; i += 1) {
    const strength = breakStrength(words[i]);
    if (!strength) continue;
    const score = strength * 1000 - Math.abs(i + 0.5 - mid);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  if (best < 0) return [[a, b]];
  return [...splitLong(words, a, best, max), ...splitLong(words, best + 1, b, max)];
}

function assignSegments(words: EditWord[], segments: Segment[]): number[] {
  const segs = segments.filter((s) => s.e > s.s).slice().sort((x, y) => x.s - y.s);
  const out: number[] = [];
  let j = 0;
  for (let i = 0; i < words.length; i += 1) {
    const mid = (words[i].s + words[i].e) / 2;
    while (j < segs.length && segs[j].e <= mid) j += 1;
    const inside = j < segs.length && segs[j].s <= mid && mid < segs[j].e;
    if (inside) out.push(j);
    else out.push(i > 0 ? out[i - 1] : j < segs.length ? j : -1);
  }
  return out;
}

function sentenceRuns(words: EditWord[]): [number, number][] {
  const runs: [number, number][] = [];
  let start = 0;
  for (let i = 0; i < words.length; i += 1) {
    if (breakStrength(words[i]) === 2 || i === words.length - 1) {
      runs.push([start, i]);
      start = i + 1;
    }
  }
  return runs;
}

export function buildClauses(words: EditWord[], segments: Segment[] | null, maxWords: number = EDIT_POLICY.maxClauseWords): Clause[] {
  if (!words.length) return [];
  let runs: [number, number][] = [];
  let from: Clause["from"] = "segment";
  if (segments && segments.length) {
    const seg = assignSegments(words, segments);
    let start = 0;
    for (let i = 1; i <= words.length; i += 1) {
      if (i === words.length || seg[i] !== seg[start]) {
        runs.push([start, i - 1]);
        start = i;
      }
    }
  } else {
    from = "sentence";
    runs = sentenceRuns(words);
  }
  const clauses: Clause[] = [];
  for (const [a, b] of runs) {
    const pieces = splitLong(words, a, b, maxWords);
    for (const [x, y] of pieces) {
      const ws = words.slice(x, y + 1);
      clauses.push({
        id: clauseId(clauses.length),
        wordStart: x,
        wordEnd: y,
        startFrame: ws[0].s,
        endFrame: ws[ws.length - 1].e,
        text: ws.map((w) => w.text.trim()).filter(Boolean).join(" "),
        words: ws.filter(isCountable).length,
        from: pieces.length > 1 ? "split" : from,
      });
    }
  }
  return clauses;
}

export function contentEnds(clauses: Clause[]): { first: string | null; last: string | null } {
  const content = clauses.filter((c) => c.words > 0);
  return { first: content[0]?.id ?? null, last: content[content.length - 1]?.id ?? null };
}
