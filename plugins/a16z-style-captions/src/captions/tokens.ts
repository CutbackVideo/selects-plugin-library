// Step 0 and 1 of the caption compiler (spec 3.1, 3.2): turn transcript words into display tokens
// (hyphen joins, numerals, contractions) and decide which words get no caption.
import { FILLER, DET, AUX, PRON, norm, wordClass, isNumberWord } from "./lexicon";
import type { Word, Tags, Span } from "./types";

export type Token = {
  t: string; // display text with the speaker's punctuation (case is applied later)
  src: number[]; // transcript word indices
  s: number;
  e: number;
  // set by the drop rules
  drop?: string;
};

const SMALL: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const SCALE: Record<string, number> = { hundred: 100, thousand: 1000, million: 1e6, billion: 1e9 };
const COMPARATIVE = /^(better|faster|more|bigger|less|cheaper|larger|smaller|higher|lower|greater|easier|harder|stronger)$/;

const tail = (t: string) => (t.match(/[.,!?;:"”’)]+$/) || [""])[0];
const bare = (t: string) => norm(t).replace(/'/g, "'");

// Parses a run of spelled number words starting at k; returns the value and how many words it used.
function spelled(ws: Word[], k: number): { value: number; used: number } | null {
  let total = 0;
  let cur = 0;
  let used = 0;
  let any = false;
  for (let j = k; j < ws.length && j < k + 6; j += 1) {
    const w = bare(ws[j].t);
    if (j > k && /[.,!?;:]$/.test(ws[j - 1].t)) break;
    if (w === "a" && j === k && j + 1 < ws.length && SCALE[bare(ws[j + 1].t)]) {
      cur = 1;
      used += 1;
      continue;
    }
    if (w === "and" && any && j + 1 < ws.length && SMALL[bare(ws[j + 1].t)] != null && cur >= 100) {
      used += 1;
      continue;
    }
    if (SMALL[w] != null) {
      cur += SMALL[w];
      any = true;
      used += 1;
      continue;
    }
    if (SCALE[w]) {
      cur = Math.max(1, cur) * SCALE[w];
      if (SCALE[w] >= 1000) {
        total += cur;
        cur = 0;
      }
      any = true;
      used += 1;
      continue;
    }
    break;
  }
  if (!any) return null;
  return { value: total + cur, used };
}

const fmt = (v: number) => (v >= 10000 ? v.toLocaleString("en-US") : String(v));

// Display tokens. Fillers and drops stay in the list (marked), so the gap rules can see every word.
export function makeTokens(words: Word[], tags: Tags = {}): Token[] {
  const out: Token[] = [];
  for (let k = 0; k < words.length; k += 1) {
    const w = words[k];
    const n = bare(w.t);
    // ASR hyphen continuations: 'CD' '-ROM' -> 'CD-ROM'.
    if (out.length && /^-\w/.test(w.t)) {
      const p = out[out.length - 1];
      p.t += w.t;
      p.src.push(w.i);
      p.e = w.e;
      continue;
    }
    if (FILLER.test(n)) {
      out.push({ t: w.t, src: [w.i], s: w.s, e: w.e, drop: "filler" });
      continue;
    }
    // Numbers: 'a thousand times better' -> '1000x better', 'ten percent' -> '10%'. Small counts stay
    // spelled out ('two things', 'five or six'), as the corpus writes them.
    const num = isNumberWord(w.t) || (n === "a" && k + 1 < words.length && SCALE[bare(words[k + 1].t)]) ? spelled(words, k) : null;
    if (num && num.used > 0) {
      const last = words[k + num.used - 1];
      const next = words[k + num.used];
      const nn = next ? bare(next.t) : "";
      const money = /^(dollars?|bucks|pounds|euros)$/.test(nn);
      let text = "";
      let used = num.used;
      if (!money && nn === "percent" && !/[.,!?;:]$/.test(last.t)) {
        text = fmt(num.value) + "%" + tail(next.t);
        used += 1;
      } else if (!money && nn === "times" && !/[.,!?;:]$/.test(last.t)) {
        const after = words[k + num.used + 1];
        if (!after || COMPARATIVE.test(bare(after.t)) || /[.,!?;:]$/.test(next.t) || DET.has(bare(after.t))) {
          text = fmt(num.value) + "x" + tail(next.t);
          used += 1;
        }
      }
      if (!text && !money && (num.value > 10 || num.used > 1)) text = fmt(num.value) + tail(last.t);
      if (text) {
        const src = words.slice(k, k + used).map((x) => x.i);
        out.push({ t: text, src, s: w.s, e: words[k + used - 1].e });
        k += used - 1;
        continue;
      }
    }
    // Spoken contractions the captions use.
    const next = words[k + 1];
    const nn = next ? bare(next.t) : "";
    const after = words[k + 2];
    const noBreak = !/[.,!?;:]$/.test(w.t);
    if (n === "because") {
      out.push({ t: "cause" + tail(w.t), src: [w.i], s: w.s, e: w.e });
      continue;
    }
    if (noBreak && n === "going" && nn === "to" && after && wordClass(after.t) === "CONT" && !/ing$/.test(bare(after.t))) {
      out.push({ t: "gonna" + tail(next.t), src: [w.i, next.i], s: w.s, e: next.e });
      k += 1;
      continue;
    }
    if (noBreak && n === "want" && nn === "to" && after && wordClass(after.t) === "CONT") {
      out.push({ t: "wanna" + tail(next.t), src: [w.i, next.i], s: w.s, e: next.e });
      k += 1;
      continue;
    }
    if (noBreak && n === "you" && nn === "know" && k > 0 && (/,$/.test(next.t) || hedgeYouKnow(words, k, tags))) {
      out.push({ t: "yknow,", src: [w.i, next.i], s: w.s, e: next.e });
      k += 1;
      continue;
    }
    out.push({ t: w.t, src: [w.i], s: w.s, e: w.e });
  }
  applyDrops(out, words, tags);
  return out;
}

// 'you know' without a comma counts as a hedge only when the semantic pass marked it.
function hedgeYouKnow(words: Word[], k: number, tags: Tags): boolean {
  return (tags.hedges || []).some((h) => h.action === "keep" && (h.i === words[k].i || h.i === words[k + 1].i));
}

const inSpan = (i: number, sp: Span) => i >= sp[0] && i <= sp[1];

function applyDrops(toks: Token[], words: Word[], tags: Tags) {
  const has = (t: Token, spans: Span[] | undefined) => !!spans && t.src.some((i) => spans.some((sp) => inSpan(i, sp)));
  const dropSpans: Span[] = [...(tags.drops || []), ...(tags.abandoned || [])];
  const stutters: Span[] = (tags.repetitions || []).filter((r) => r.kind === "stutter").map((r) => r.span);
  const hedgeDrop = new Set((tags.hedges || []).filter((h) => h.action === "drop").map((h) => h.i));
  const hedgeKeep = new Set((tags.hedges || []).filter((h) => h.action === "keep").map((h) => h.i));
  for (let k = 0; k < toks.length; k += 1) {
    const t = toks[k];
    if (t.drop) continue;
    if (has(t, dropSpans)) {
      t.drop = "semantic";
      continue;
    }
    const n = bare(t.t);
    const prev = toks[k - 1];
    const next = toks[k + 1];
    // D5: an immediate stutter repeat ('wait, wait,' -> 'wait,'): drop the first copy.
    if (next && !next.drop && bare(next.t) === n && next.s - t.e < 0.35 && (has(t, stutters) || (!tags.repetitions && wordClass(t.t) !== "CONT"))) {
      t.drop = "stutter";
      continue;
    }
    // D8: an interrupting hedge 'like' between an auxiliary / 'to' / 'be' and its complement.
    if (n === "like" && !hedgeKeep.has(t.src[0])) {
      const p = prev ? bare(prev.t) : "";
      if (hedgeDrop.has(t.src[0]) || ((AUX.has(p) || p === "to" || p === "be") && !/,$/.test(t.t) && next && wordClass(next.t) !== "DET" && !/[.,]$/.test(prev?.t || ""))) {
        t.drop = "hedge";
        continue;
      }
    }
  }
  // D4: a run of three or more one-word interjections keeps the first and the last.
  let run: number[] = [];
  const flush = () => {
    if (run.length >= 3) for (const k of run.slice(1, -1)) toks[k].drop = "interjection";
    run = [];
  };
  for (let k = 0; k < toks.length; k += 1) {
    const n = bare(toks[k].t);
    if (!toks[k].drop && /^(hey|oh|okay|ok|wow|look|yeah|no|well|right)$/.test(n) && /,$/.test(toks[k].t)) run.push(k);
    else flush();
  }
  flush();
  // a comma that only set off a dropped hedge goes with it: 'greatest, [you know,] artist' -> 'greatest artist'
  for (let k = 0; k + 2 < toks.length; k += 1) {
    const a = toks[k];
    if (a.drop || !/,$/.test(a.t)) continue;
    let j = k + 1;
    while (j < toks.length && toks[j].drop && toks[j].drop !== "card" && toks[j].drop !== "filler") j += 1;
    if (j > k + 1 && j < toks.length && /,$/.test(toks[j - 1].t)) a.t = a.t.replace(/,$/, "");
  }
  void PRON;
  void words;
}

export const isKept = (t: Token) => !t.drop;
