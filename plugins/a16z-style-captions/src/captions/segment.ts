// Steps 2-4 of the caption compiler (spec 3.3-3.5): hard breaks make phrases; a phrase that is too long
// for one caption is split into k units by an exact-k dynamic programme over break scores.
import { CONJ, OPENER, COMMA_BREAKERS, PHRASAL_VERB, PARTICLE, norm, wordClass, isNumberWord, pairScore } from "./lexicon";
import type { Token } from "./tokens";
import type { Word, Tags, Span, Style } from "./types";

export type Phrase = { toks: Token[]; sentenceEnd: boolean };

const sentenceEnd = (t: string) => /[.?!]["”’)]*$/.test(t);
const hardPunct = (t: string) => /[.?!;:]["”’)]*$/.test(t);
const comma = (t: string) => /,["”’)]*$/.test(t);
const inSpan = (i: number, sp: Span) => i >= sp[0] && i <= sp[1];

// Effective speech span with capped word durations (spec 3.1): Whisper-style timings stretch final words.
export function span(ws: Token[]): number {
  if (!ws.length) return 0;
  let tot = 0;
  for (let k = 0; k + 1 < ws.length; k += 1) tot += Math.min(Math.max(0, ws[k + 1].s - ws[k].s), 0.5);
  return tot + Math.min(Math.max(0, ws[ws.length - 1].e - ws[ws.length - 1].s), 0.35);
}

// Largest silence between two kept tokens, measured on every original word in between (a dropped word
// never makes a fake gap).
function gapBetween(a: Token, b: Token, words: Word[], byIndex: Map<number, number>): number {
  const ia = byIndex.get(a.src[a.src.length - 1]);
  const ib = byIndex.get(b.src[0]);
  if (ia == null || ib == null || ib <= ia) return Math.max(0, b.s - a.e);
  let g = 0;
  for (let k = ia; k < ib; k += 1) g = Math.max(g, words[k + 1].s - words[k].e);
  return g;
}

export function phrases(all: Token[], words: Word[], tags: Tags, cuts: number[]): Phrase[] {
  const byIndex = new Map<number, number>();
  words.forEach((w, k) => byIndex.set(w.i, k));
  const openers = new Set(tags.openers || []);
  const quotativeEnds = new Set((tags.quotatives || []).map((q) => q[1]));
  const out: Phrase[] = [];
  let cur: Token[] = [];
  const close = () => {
    if (cur.length) out.push({ toks: cur, sentenceEnd: sentenceEnd(cur[cur.length - 1].t) });
    cur = [];
  };
  // Emphatic repetition 'X and X (and X)': one unit per copy, the conjunction dropped (spec 3.3.6).
  for (let k = 0; k + 2 < all.length; k += 1) {
    const a = all[k];
    const c = all[k + 1];
    const b = all[k + 2];
    if (!a.drop && !b.drop && norm(c.t) === "and" && norm(a.t) === norm(b.t) && wordClass(a.t) === "CONT" && a.t.length > 2) c.drop = "repeat-and";
  }
  let prev: Token | null = null;
  let droppedSince = false;
  for (let k = 0; k < all.length; k += 1) {
    const t = all[k];
    if (t.drop) {
      if (t.drop === "card") droppedSince = true;
      continue;
    }
    if (prev) {
      let hard = hardPunct(prev.t) || droppedSince;
      if (!hard && gapBetween(prev, t, words, byIndex) >= 0.1 - 1e-9) hard = true;
      if (!hard && comma(prev.t)) {
        hard = true;
        const n = norm(prev.t);
        const opener = (openers.has(prev.src[0]) || OPENER.has(n)) && cur.length === 1 && !COMMA_BREAKERS.has(n) && !quotativeEnds.has(prev.src[prev.src.length - 1]);
        if (opener) hard = false;
      }
      // Emphatic copies and 'yknow,' stand alone.
      if (!hard && norm(prev.t) === norm(t.t) && wordClass(t.t) === "CONT") hard = true;
      if (!hard && (/^yknow/.test(norm(t.t)) || /^yknow/.test(norm(prev.t)))) hard = true;
      // A sentence-initial 'but' / 'so' on a picture cut is its own unit.
      if (!hard && cur.length === 1 && /^(but|so)$/.test(norm(prev.t)) && cuts.some((c) => Math.abs(c - prev!.s) <= 0.1)) hard = true;
      if (hard) close();
    }
    cur.push(t);
    prev = t;
    droppedSince = false;
  }
  close();
  return out;
}

type Ctx = { tags: Tags; style: Style; compounds: Span[]; particles: Set<number>; hedgeKeep: Set<number>; forced: Map<number, number> };

function isHedgeLike(ws: Token[], j: number, ctx: Ctx): boolean {
  if (norm(ws[j].t) !== "like") return false;
  if (ctx.hedgeKeep.has(ws[j].src[0])) return true;
  const p = j > 0 ? norm(ws[j - 1].t) : "";
  const nx = j + 1 < ws.length ? norm(ws[j + 1].t) : "";
  if (/^(was|were|is|it's|he's|she's|feel|feels|felt|look|looks|looked|would|i|you|we|they|he|she|don't|didn't|i'd|something|be|just)$/.test(p)) return false;
  if (wordClass(nx) === "DET") return false;
  return /,$/.test(ws[j].t) || isNumberWord(nx);
}

// Score of a break before ws[i].
function breakScore(ws: Token[], i: number, ctx: Ctx): number {
  const a = ws[i - 1];
  const b = ws[i];
  const ca = wordClass(a.t);
  const cb = wordClass(b.t);
  const na = norm(a.t);
  const nb = norm(b.t);
  let s = pairScore(ca, cb);
  // kept hedge 'like' ends its unit: 'get like,' | '1000x'
  if (isHedgeLike(ws, i, ctx)) s -= 2.0;
  if (isHedgeLike(ws, i - 1, ctx)) s += 2.5;
  // 'NUM or NUM' stays together, and so does a count and its noun ('two things')
  if (nb === "or" && isNumberWord(a.t) && i + 1 < ws.length && isNumberWord(ws[i + 1].t)) s -= 3;
  if (isNumberWord(a.t) && cb === "CONT" && !isNumberWord(b.t) && !/[.,!?;:]$/.test(a.t)) s -= 2;
  if (na === "or" && isNumberWord(b.t) && i >= 2 && isNumberWord(ws[i - 2].t)) s -= 3;
  // phrasal-verb particles attach left: 'when you look at' | 'the analytics'
  const particle = ctx.particles.has(b.src[0]) || (ca === "CONT" && PHRASAL_VERB.has(na) && PARTICLE.has(nb));
  if (particle) s -= 2.0;
  if (i >= 2 && (ctx.particles.has(a.src[0]) || (PHRASAL_VERB.has(norm(ws[i - 2].t)) && PARTICLE.has(na))) && cb === "DET") s = Math.max(s, -0.6);
  // 'from X to Y to Z': one item per unit
  if ((nb === "to" || nb === "from") && ws.slice(0, i).some((x) => norm(x.t) === "from")) s += 2.5;
  // compounds, fixed collocations and short key terms are never split
  if (ctx.compounds.some((sp) => inSpan(a.src[a.src.length - 1], sp) && inSpan(b.src[0], sp))) s -= 3.0;
  if ((ctx.tags.keyTerms || []).some((k) => k.span[1] - k.span[0] <= 2 && inSpan(a.src[a.src.length - 1], k.span) && inSpan(b.src[0], k.span))) s -= 3.0;
  // key payoff terms and copula reveals: forced breaks from the semantic pass
  const f = ctx.forced.get(b.src[0]);
  if (f) s += f;
  void CONJ;
  return s;
}

export function unitsFor(n: number, sp: number, rate: number, style: Style): number {
  if (n <= 4 && sp <= 1.6) return 1;
  if (n === 5 && sp <= 0.8) return 1;
  const DIVW = 1.1 * style.TW;
  const DIVS = 0.214 * style.TW;
  void rate;
  return Math.min(n, Math.max(2, Math.round((n / DIVW + sp / DIVS) / 2)));
}

function split(ws: Token[], ctx: Ctx, rate: number, whole: boolean): Token[][] {
  const n = ws.length;
  const sp = span(ws);
  if (whole) return [ws];
  const k = unitsFor(n, sp, rate, ctx.style);
  if (k <= 1) return [ws];
  const maxW = rate < 3.6 ? 6 : 5;
  const mean = n / k;
  const tmean = sp / k;
  const NEG = -1e18;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(k + 1).fill(NEG));
  const bp: number[][] = Array.from({ length: n + 1 }, () => new Array(k + 1).fill(-1));
  dp[0][0] = 0;
  const bs: number[] = [0];
  for (let i = 1; i < n; i += 1) bs.push(breakScore(ws, i, ctx));
  for (let j = 1; j <= n; j += 1)
    for (let m = 1; m <= k; m += 1)
      for (let i = Math.max(0, j - maxW); i < j; i += 1) {
        if (dp[i][m - 1] === NEG) continue;
        const chunk = ws.slice(i, j);
        let sc = dp[i][m - 1] - 0.15 * (j - i - mean) ** 2 - 0.15 * ((span(chunk) - tmean) / 0.3) ** 2;
        if (i > 0) sc += bs[i];
        if (j - i === 1 && wordClass(ws[i].t) !== "CONT") sc -= 2.0;
        if (sc > dp[j][m]) {
          dp[j][m] = sc;
          bp[j][m] = i;
        }
      }
  let cutsAt: number[] = [];
  if (dp[n][k] === NEG) {
    for (let x = 1; x < k; x += 1) cutsAt.push(Math.round((x * n) / k));
  } else {
    let j = n;
    for (let m = k; m > 0; m -= 1) {
      const i = bp[j][m];
      cutsAt.push(i);
      j = i;
    }
    cutsAt = cutsAt.filter((c) => c > 0).sort((a, b) => a - b);
  }
  const b = [0, ...cutsAt, n];
  const out: Token[][] = [];
  for (let x = 0; x + 1 < b.length; x += 1) out.push(ws.slice(b[x], b[x + 1]));
  return out;
}

// Breaks the semantic pass asks for, as score bonuses keyed by the transcript index of the word a
// break goes before.
function forcedBreaks(tags: Tags): Map<number, number> {
  const m = new Map<number, number>();
  const add = (i: number, v: number) => m.set(i, Math.max(m.get(i) || 0, v));
  for (const k of tags.keyTerms || []) {
    if (!["P", "T", "N", "I"].includes(k.kind) || k.priority < 4) continue;
    if (k.span[1] - k.span[0] > 2) continue;
    add(k.span[0], 5);
  }
  for (const r of tags.reveals || []) {
    if (r.payoff[1] - r.payoff[0] > 1) continue;
    add(r.copula, 5);
    add(r.payoff[0], 5);
  }
  return m;
}

// Local speech rate (words / s) over a phrase's sentence neighbourhood.
function rateAround(ph: Phrase[], k: number): number {
  const ws = [...(ph[k - 1]?.toks || []), ...ph[k].toks, ...(ph[k + 1]?.toks || [])];
  const sp = ws.length ? ws[ws.length - 1].e - ws[0].s : 0;
  return sp > 0.3 ? ws.length / sp : 4;
}

// One phrase split on its own (used by the corpus evaluation).
export function splitPhrase(toks: Token[], tags: Tags, style: Style, rate = 4): Token[][] {
  const ctx: Ctx = {
    tags,
    style,
    compounds: tags.compounds || [],
    particles: new Set(tags.particles || []),
    hedgeKeep: new Set((tags.hedges || []).filter((h) => h.action === "keep").map((h) => h.i)),
    forced: forcedBreaks(tags),
  };
  return split(toks, ctx, rate, false);
}

export type Chunk = { toks: Token[]; phrase: number; sentenceEnd: boolean; phraseEnd: boolean };

export function segment(all: Token[], words: Word[], tags: Tags, style: Style, cuts: number[]): Chunk[] {
  const ph = phrases(all, words, tags, cuts);
  const ctx: Ctx = {
    tags,
    style,
    compounds: tags.compounds || [],
    particles: new Set(tags.particles || []),
    hedgeKeep: new Set((tags.hedges || []).filter((h) => h.action === "keep").map((h) => h.i)),
    forced: forcedBreaks(tags),
  };
  const out: Chunk[] = [];
  ph.forEach((p, k) => {
    const rate = rateAround(ph, k);
    const chars = p.toks.map((t) => t.t).join(" ").length;
    // A slow complete clause of up to 6 words stays on one line (spec 3.4).
    const whole = rate < 3.6 && p.toks.length <= 6 && chars <= 27 && p.sentenceEnd;
    const parts = split(p.toks, ctx, rate, whole);
    parts.forEach((toks, x) => out.push({ toks, phrase: k, sentenceEnd: p.sentenceEnd && x === parts.length - 1, phraseEnd: x === parts.length - 1 }));
  });
  return out;
}
