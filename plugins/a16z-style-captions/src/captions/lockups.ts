// Step 5 of the caption compiler (spec 3.7): the hook and mid-video lockups. A lockup merges 2-4
// consecutive chunks into one caption whose lines are those chunks, with one big line carrying the key
// content.
import { wordClass, norm, isNumberWord, IMPERATIVE, INTENSIFIER } from "./lexicon";
import { splitPhrase, span, type Chunk } from "./segment";
import type { Token } from "./tokens";
import type { Tags, Style, Template, EmphasisKind } from "./types";

export type Group = {
  toks: Token[];
  lines: number[]; // token offsets where each line starts (lines[0] = 0)
  kind: "plain" | "hook" | "lockup";
  big: number; // index of the big line, -1 for none
  template: Template;
  sentence: number;
  sentenceEnd: boolean;
  phraseEnd: boolean;
  phrase: number;
  why?: EmphasisKind | "hook" | "closer" | "count" | "quote";
};

const words = (g: { toks: Token[] }) => g.toks.length;
const DISCOURSE = /^(sometimes|so|basically|actually|really|just|like|well|now|then|also|maybe|probably|literally|obviously|honestly)$/;
const has = (t: Token, i: number) => t.src.includes(i);

export function plainGroups(chunks: Chunk[]): Group[] {
  let sentence = 0;
  return chunks.map((c) => {
    const g: Group = { toks: c.toks, lines: [0], kind: "plain", big: -1, template: "single", sentence, sentenceEnd: c.sentenceEnd, phraseEnd: c.phraseEnd, phrase: c.phrase };
    if (c.sentenceEnd) sentence += 1;
    return g;
  });
}

// Score of a line as the big line: key-term heads, numbers, intensifier + head, the clause-final noun.
function bigScore(line: Token[], tags: Tags, isLast: boolean): number {
  let s = 0;
  for (const k of tags.keyTerms || []) if (line.some((t) => has(t, k.head))) s += 2 + k.priority;
  for (const i of tags.hook?.big || []) if (line.some((t) => has(t, i) && !DISCOURSE.test(norm(t.t)))) s += 6;
  for (const t of line) {
    const n = norm(t.t);
    if (isNumberWord(t.t) || /\d/.test(t.t)) s += 3;
    if (INTENSIFIER.has(n)) s += 1.5;
    if (DISCOURSE.test(n)) s -= 2.5;
    else if (wordClass(t.t) === "CONT") s += 0.6 + Math.min(0.6, n.length / 15);
    else s -= 0.4;
  }
  if (line.length > 3) s -= 2 * (line.length - 3);
  if (isLast) s += 0.8;
  return s;
}

function templateFor(nLines: number, big: number): Template {
  if (nLines === 1) return "single";
  if (big === 0) return nLines === 2 ? "headTail" : "stack";
  if (big === nLines - 1) return nLines === 2 ? "leadBig" : "stack";
  return "stair";
}

// Lines of a lockup from its tokens: the chunk boundaries, re-split so the big line holds 1-3 words.
function lockupLines(chunks: Token[][], tags: Tags, style: Style): { lines: number[]; big: number } {
  let parts = chunks.map((c) => c.slice());
  // A single chunk becomes 2-3 lines.
  if (parts.length === 1 && parts[0].length >= 3) {
    const n = parts[0].length;
    parts = splitPhrase(parts[0], tags, { ...style, TW: n >= 6 ? n / 3 : n / 2 }, 4);
    if (parts.length === 1) parts = [parts[0].slice(0, Math.ceil(n / 2)), parts[0].slice(Math.ceil(n / 2))];
  }
  let best = 0;
  let bestScore = -1e9;
  parts.forEach((p, k) => {
    const sc = bigScore(p, tags, k === parts.length - 1);
    if (sc > bestScore) {
      bestScore = sc;
      best = k;
    }
  });
  // Keep the big line to 1-3 words: peel function words and lead-ins off into their own line.
  const bl = parts[best];
  if (bl.length > 3 && parts.length < 4) {
    let cut = 1;
    let sc = -1e9;
    for (let c = 1; c < bl.length; c += 1) {
      const a = bl.slice(0, c);
      const b = bl.slice(c);
      if (a.length > 3 && b.length > 3) continue;
      const v = Math.max(bigScore(a, tags, false), bigScore(b, tags, true));
      if (v > sc) {
        sc = v;
        cut = c;
      }
    }
    const a = bl.slice(0, cut);
    const b = bl.slice(cut);
    parts.splice(best, 1, a, b);
    best = bigScore(a, tags, false) > bigScore(b, tags, best + 1 === parts.length - 1) ? best : best + 1;
  }
  const lines: number[] = [];
  let off = 0;
  for (const p of parts) {
    lines.push(off);
    off += p.length;
  }
  return { lines, big: best };
}

// Lines around a known key word: the key (with the content words next to it, up to 3 words) is the big
// line, the words before it the lead-in, the words after it the tail. Null when there is no key word
// or the lead-in / tail would be too long.
function keyCentered(toks: Token[], tags: Tags, kind: "hook" | "lockup"): { lines: number[]; big: number } | null {
  const pos = (i: number) => toks.findIndex((t) => t.src.includes(i));
  let a = -1;
  let b = -1;
  if (kind === "hook") {
    const ks = (tags.hook?.big || []).map(pos).filter((k) => k >= 0);
    if (ks.length) {
      a = Math.min(...ks);
      b = Math.max(...ks);
    }
  }
  if (a < 0) {
    const terms = (tags.keyTerms || []).filter((k) => pos(k.head) >= 0).sort((x, y) => y.priority - x.priority);
    if (terms.length) {
      const t = terms[0];
      a = Math.max(0, pos(t.span[0]) >= 0 ? pos(t.span[0]) : pos(t.head));
      b = Math.max(a, pos(t.span[1]) >= 0 ? pos(t.span[1]) : pos(t.head));
    }
  }
  if (a < 0) return null;
  if (b - a > 2) a = b - 2;
  // openers and discourse adverbs never carry the big line
  if (DISCOURSE.test(norm(toks[a].t)) && a === b) return null;
  const punct = (t: Token) => /[.,!?;:]["”’)]*$/.test(t.t);
  // grow over adjacent content words: 'greatest' -> 'greatest artist' (two words, about 14 characters at most)
  const chars = () => toks.slice(a, b + 1).map((t) => t.t).join(" ").length;
  while (b - a < 1 && b + 1 < toks.length && !punct(toks[b]) && wordClass(toks[b + 1].t) === "CONT" && chars() + toks[b + 1].t.length < 16) b += 1;
  while (b - a < 1 && a - 1 >= 0 && !punct(toks[a - 1]) && wordClass(toks[a - 1].t) === "CONT" && !isNumberWord(toks[a].t) && !DISCOURSE.test(norm(toks[a - 1].t))) a -= 1;
  // function words never close the big line
  while (b > a && wordClass(toks[b].t) !== "CONT" && !isNumberWord(toks[b].t)) b -= 1;
  const lead = a;
  const tail = toks.length - 1 - b;
  if (lead > 4 || tail > 4) return null;
  const lines: number[] = [];
  if (lead) lines.push(0);
  lines.push(a);
  if (tail) lines.push(b + 1);
  return { lines, big: lead ? 1 : 0 };
}

function makeLockup(chunks: Group[], kind: "hook" | "lockup", tags: Tags, style: Style, why: Group["why"]): Group {
  const toks = chunks.flatMap((c) => c.toks);
  const { lines, big } = keyCentered(toks, tags, kind) || lockupLines(chunks.map((c) => c.toks), tags, style);
  return {
    toks,
    lines,
    kind,
    big,
    template: templateFor(lines.length, big),
    sentence: chunks[0].sentence,
    sentenceEnd: chunks[chunks.length - 1].sentenceEnd,
    phraseEnd: chunks[chunks.length - 1].phraseEnd,
    phrase: chunks[0].phrase,
    why,
  };
}

// The hook (spec 3.7.1). Returns the groups with the opening rewritten.
function hook(gs: Group[], tags: Tags, style: Style): Group[] {
  if (!gs.length) return gs;
  let end = gs.findIndex((g) => g.sentenceEnd);
  if (end < 0) end = gs.length - 1;
  const first = gs.slice(0, end + 1);
  const toks = first.flatMap((g) => g.toks);
  const n = toks.length;
  const dur = toks[n - 1].e - toks[0].s;
  // A leading 'And' / 'So' is dropped from the hook (D10).
  if (n > 2 && /^(and|so)$/.test(norm(toks[0].t))) {
    first[0] = { ...first[0], toks: first[0].toks.slice(1) };
    if (!first[0].toks.length) first.shift();
  }
  const rest = gs.slice(end + 1);
  const want = tags.hook?.type;
  const words = first.reduce((a, g) => a + g.toks.length, 0);
  if (want === "H6" || words <= 2) {
    const g = { ...first[0], toks: first.flatMap((x) => x.toks), lines: [0], kind: "hook" as const, big: 0, template: "single" as Template, why: "hook" as const };
    return [g, ...rest];
  }
  if (words <= 8 && dur <= 2.5 && want !== "H4" && want !== "H2") return [makeLockup(first, "hook", tags, style, "hook"), ...rest];
  if (want === "H4" || style.format === "story") {
    // the first 2 chunks up to the key noun or quantity
    const two = first.slice(0, 2);
    const w2 = two.reduce((a, g) => a + g.toks.length, 0);
    if (two.length === 2 && w2 <= 5) return [makeLockup(two, "hook", tags, style, "hook"), ...first.slice(2), ...rest];
  }
  // H2: back-to-back lockups of about 6 words at chunk boundaries, each held >= 0.8 s.
  const out: Group[] = [];
  let cur: Group[] = [];
  let cw = 0;
  for (const g of first) {
    if (cur.length && (cw + g.toks.length > 6 || cur.length >= 3)) {
      out.push(cur.length > 1 || cw >= 3 ? makeLockup(cur, "hook", tags, style, "hook") : cur[0]);
      cur = [];
      cw = 0;
    }
    cur.push(g);
    cw += g.toks.length;
  }
  if (cur.length) out.push(cur.length > 1 || cw >= 3 ? makeLockup(cur, "hook", tags, style, "hook") : cur[0]);
  return [...out, ...rest];
}

type Cand = { from: number; to: number; score: number; why: Group["why"] };

// Mid-video lockup candidates (spec 3.7.2) as ranges of plain groups.
function candidates(gs: Group[], tags: Tags, start: number): Cand[] {
  const out: Cand[] = [];
  const at = (i: number) => gs.findIndex((g) => g.toks.some((t) => has(t, i)));
  const grow = (k: number, maxWords: number): [number, number] | null => {
    // extend around group k inside its sentence to 3..maxWords words and 2..4 groups
    let a = k;
    let b = k;
    const w = () => gs.slice(a, b + 1).reduce((s, g) => s + words(g), 0);
    while (w() < 3 || b - a < 1) {
      // the right side stays inside the key's phrase (a list's next item is not a tail); a short phrase
      // may take its lead-in from the phrase before
      const canL = a - 1 >= start && gs[a - 1].kind === "plain" && gs[a - 1].sentence === gs[k].sentence;
      const canR = b + 1 < gs.length && gs[b + 1].kind === "plain" && gs[b + 1].phrase === gs[k].phrase && !gs[b].phraseEnd;
      if (canL && (!canR || words(gs[a - 1]) <= words(gs[b + 1]))) a -= 1;
      else if (canR) b += 1;
      else break;
      if (b - a >= 3) break;
    }
    if (w() < 3 || w() > maxWords || b - a < 1 || b - a > 3) return null;
    return [a, b];
  };
  const push = (k: number, score: number, why: Group["why"], maxWords = 7) => {
    if (k < start || k < 0) return;
    const r = grow(k, maxWords);
    if (r) out.push({ from: r[0], to: r[1], score, why });
  };
  for (const k of tags.keyTerms || []) if (["T", "P", "I", "N", "D"].includes(k.kind) && k.priority >= 4) push(at(k.head), k.priority + (k.kind === "P" ? 1 : 0), k.kind);
  for (const e of tags.enumerations || []) push(at(e.count[0]), 5, "count");
  for (const q of tags.quotes || []) if (q.kind === "famous" || q.kind === "coined") push(at(q.span[1]), 4, "quote");
  // Without tags: numbers that pay off a claim, imperatives, intensifier + head.
  if (!tags.keyTerms) {
    gs.forEach((g, k) => {
      if (k < start) return;
      if (g.toks.some((t) => /\d/.test(t.t) && /[x%]$|,\d{3}/.test(t.t))) push(k, 4, "N");
      const prev = gs[k - 1];
      if ((!prev || prev.sentenceEnd) && IMPERATIVE.has(norm(g.toks[0].t))) push(k, 3.5, "D");
      if (g.toks.some((t, j) => INTENSIFIER.has(norm(t.t)) && j + 1 < g.toks.length && wordClass(g.toks[j + 1].t) === "CONT")) push(k, 3, "I");
    });
  }
  // L5 closer: the final sentence when it is a payoff (a stair of up to 10 words).
  const last = gs.length - 1;
  const lastSentence = gs[last]?.sentence;
  const isPunch = (tags.punchlines || []).some((p) => gs[last].toks.some((t) => t.src.some((i) => i >= p[0] && i <= p[1])));
  if (last >= start && (isPunch || !tags.punchlines)) {
    let a = last;
    while (a - 1 >= start && gs[a - 1].sentence === lastSentence && gs[a - 1].kind === "plain" && last - a < 3) a -= 1;
    const w = gs.slice(a, last + 1).reduce((s, g) => s + words(g), 0);
    if (last - a >= 1 && w >= 3 && w <= 10) out.push({ from: a, to: last, score: isPunch ? 6 : 3, why: "closer" });
  }
  return out;
}

export function lockups(chunks: Chunk[], tags: Tags, style: Style, duration: number): Group[] {
  let gs = hook(plainGroups(chunks), tags, style);
  // Mid-video lockups start after the hook, with at least one plain unit in between.
  const firstPlain = gs.findIndex((g) => g.kind === "plain");
  const start = firstPlain < 0 ? gs.length : firstPlain + (firstPlain > 0 ? 1 : 0);
  const budget = Math.round((style.lockupRate * duration) / 60);
  const cands = candidates(gs, tags, start).sort((a, b) => b.score - a.score);
  const taken: Cand[] = [];
  for (const c of cands) {
    if (taken.length >= budget) break;
    // at least one plain unit between two lockups, and none overlapping
    if (taken.some((t) => c.from <= t.to + 1 && c.to >= t.from - 1)) continue;
    if (gs.slice(c.from, c.to + 1).some((g) => g.kind !== "plain")) continue;
    if (c.from > 0 && gs[c.from - 1].kind !== "plain") continue;
    taken.push(c);
  }
  taken.sort((a, b) => b.from - a.from);
  for (const c of taken) {
    const g = makeLockup(gs.slice(c.from, c.to + 1), "lockup", tags, style, c.why);
    gs = [...gs.slice(0, c.from), g, ...gs.slice(c.to + 1)];
  }
  void span;
  return tidy(gs);
}

const isFunction = (t: Token) => wordClass(t.t) !== "CONT" && !isNumberWord(t.t);
const stall = (t: Token) => /[,\-]$/.test(t.t);

// Clean-ups the corpus never breaks: a lockup's tail of function words only ('happiness / is') moves to
// the next caption, and a lone function word ('cause', 'this') joins the next caption of its sentence,
// unless it is a stall ('of,') or a 'but' / 'so' standing on its own.
function tidy(gs: Group[]): Group[] {
  for (let k = 0; k + 1 < gs.length; k += 1) {
    const g = gs[k];
    const next = gs[k + 1];
    if (g.kind === "plain" || g.lines.length < 2 || next.kind !== "plain" || next.sentence !== g.sentence) continue;
    const tailFrom = g.lines[g.lines.length - 1];
    if (g.lines.length - 1 <= g.big) continue;
    const tail = g.toks.slice(tailFrom);
    if (!tail.every(isFunction) || tail.some(stall) || /[.?!]$/.test(tail[tail.length - 1].t)) continue;
    gs[k] = { ...g, toks: g.toks.slice(0, tailFrom), lines: g.lines.slice(0, -1), template: g.lines.length - 1 === 1 ? "single" : g.big === 0 ? "headTail" : "leadBig", sentenceEnd: false, phraseEnd: false };
    gs[k + 1] = { ...next, toks: [...tail, ...next.toks] };
  }
  const out: Group[] = [];
  for (let k = 0; k < gs.length; k += 1) {
    const g = gs[k];
    const next = gs[k + 1];
    const lone = g.kind === "plain" && g.toks.length === 1 && isFunction(g.toks[0]) && !stall(g.toks[0]) && !/^(but|so|and)$/i.test(g.toks[0].t.replace(/[^a-z]/gi, ""));
    if (lone && next && next.kind === "plain" && next.sentence === g.sentence && next.toks.length <= 4) {
      gs[k + 1] = { ...next, toks: [...g.toks, ...next.toks] };
      continue;
    }
    out.push(g);
  }
  return out;
}
