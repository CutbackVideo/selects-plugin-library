// The semantic pass (spec 2): one assistant call reads the transcript and marks what only meaning can
// tell — key terms and their kind, punchlines, the hook's big words, compounds that must not split,
// reveals, quotes, words to leave uncaptioned, keyword cards and B-roll beats. The assistant answers
// with exact quotes per numbered sentence; the code finds them and turns them into word indices. Every
// later step is deterministic and runs without this pass.
import { lastJsonObject, type Sdk } from "./host";
import type { Tags, Span, EmphasisKind } from "../captions/types";
import { wordClass } from "../captions/lexicon";

export type TWord = { i: number; t: string; s: number; e: number }; // seconds

const norm = (s: string) => String(s || "").toLowerCase().replace(/[’]/g, "'").replace(/[^\p{L}\p{N}']+/gu, "");
const toks = (s: string) => String(s || "").split(/\s+/).map(norm).filter(Boolean);

export function sentences(words: TWord[]): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  let from = 0;
  for (let k = 0; k < words.length; k += 1) {
    const w = words[k];
    const next = words[k + 1];
    if (/[.!?]["”’)]*$/.test(w.t) || !next || next.s - w.e > 0.9 || k - from >= 40) {
      out.push({ from, to: k });
      from = k + 1;
    }
  }
  return out;
}

const GUIDE = `You are the story editor of an a16z-style talking-head Short (white blur-in captions, mixed-size caption lockups, a few burgundy keyword cards). Mark the transcript so the captions can be designed. Tag MEANING, not loudness. Be selective: roughly one key term per 5 seconds of speech.

Fields (every quote is copied exactly from the numbered sentence "s"; keep quotes 1-4 words unless stated):
- format: "standard" (a thesis or advice), "story" (a first-person anecdote) or "explainer".
- hook: {"type": "H1" if sentence 1 is short (<= 8 words) and states the thesis, "H6" if its thesis is 1-2 words, "H2" if it is a long claim, "H4" for a narrative opener; "big": the 1-3 words of sentence 1 that should be set big}.
- key: emphasis targets, each {"s", "q", "kind", "p"}: kind T = the topic/thesis term (first mention), P = the payoff that answers a setup, C = a contrast or negation word, N = a number that pays off a scale claim, I = intensifier + head ("much less", "10x better"), D = an imperative ("keep doing stuff"), Q = a quoted punch line. p = priority 1-5 (5 = the most important idea of the Short).
- punch: the punchline sentences, each {"s", "q": its last 2-4 words}.
- compounds: multiword names and fixed collocations that must never be split across two captions ("social media", "venture capital", "Elon Musk").
- reveal: "the thing you want ... is | power" constructions: {"s", "setup": 1-4 words, "copula": "is", "payoff": 1-2 words}.
- quotes: quoted or imagined speech and coined terms: {"s", "q": the quoted words (up to 12), "kind": "reported" | "imagined" | "famous" | "coined"}.
- drops: words a careful editor would leave out of the captions: abandoned words before a self-interruption, stutters, a filler "like" that interrupts a phrase. {"s", "q"}.
- cards: 0-2 keyword cards. A card is a full-screen burgundy title shown for about 1.5 s while the speaker keeps talking: use it for a named concept introduced as the payoff of a setup ("the inventor", "taste"), or the single most important idea. {"s", "q": the 1-6 spoken words the card covers, "text": 1-3 of those exact spoken words, the concept itself; never a paraphrase}. Not in the first 3 seconds, not in the last 30% of the Short, at least 6 s apart.
- broll: about one moment per 4 seconds of speech (an a16z Short spends about half its time on footage) where footage would carry the line, as an a16z editor cuts away from the speaker: a concrete object, place, action, era or group of people the words name or imply (skip the opening sentence and the final sentence; never two moments in a row). {"s", "q": the 4-12 spoken words it covers, "query": a 2-4 word stock-footage search in plain documentary terms (no names, no brands, no abstract ideas), "alt": a second, different search for the same moment}.`;

const SHAPE = `{"format":"standard","hook":{"type":"H1","big":"AI native"},"key":[{"s":3,"q":"much less","kind":"I","p":4}],"punch":[{"s":9,"q":"keep doing stuff"}],"compounds":[{"s":2,"q":"venture capital"}],"reveal":[],"quotes":[],"drops":[],"cards":[{"s":5,"q":"the inventor","text":"inventor"}],"broll":[{"s":4,"q":"the first time I walked into the factory","query":"factory floor workers","alt":"assembly line machines"}]}`;

async function ask(sdk: Sdk, prompt: string): Promise<string> {
  let last: any = null;
  // The app's assistant can fail a turn while its runtime (re)starts ("model metadata unavailable");
  // it recovers within about a minute, so retry with growing pauses.
  const waits = [0, 4000, 12000, 30000, 60000];
  for (let attempt = 0; attempt < waits.length; attempt += 1) {
    if (waits[attempt]) await new Promise((r) => setTimeout(r, waits[attempt]));
    try {
      return (await sdk.askAI({ prompt, timeoutMs: 300000 })).text;
    } catch (e) {
      last = e;
    }
  }
  throw last || new Error("The assistant did not answer.");
}

// Find a quote inside sentence s (or the sentences next to it); returns transcript indices.
function find(words: TWord[], sents: { from: number; to: number }[], s: number, q: string): Span | null {
  const want = toks(q);
  if (!want.length) return null;
  const tries = [s - 1, s - 2, s, s - 3].filter((x, i, a) => x >= 0 && x < sents.length && a.indexOf(x) === i);
  for (const si of tries) {
    const { from, to } = sents[si];
    for (let a = from; a <= to; a += 1) {
      let ok = true;
      for (let j = 0; j < want.length; j += 1) if (a + j > to || norm(words[a + j].t) !== want[j]) ok = false;
      if (ok) return [words[a].i, words[a + want.length - 1].i];
    }
  }
  return null;
}

export type Semantic = { tags: Tags; cards: { span: Span; text: string }[]; broll: { span: Span; query: string; alt: string }[]; missing: number; raw: string };

export async function semanticPass(sdk: Sdk, words: TWord[], hint = ""): Promise<Semantic> {
  const sents = sentences(words);
  // straight double quotes in the transcript would end up unescaped inside the JSON quotes
  const lines = sents.map((x, k) => "S" + (k + 1) + " [" + words[x.from].s.toFixed(1) + "s] " + words.slice(x.from, x.to + 1).map((w) => w.t.replace(/"/g, "'")).join(" "));
  const total = words.length ? words[words.length - 1].e - words[0].s : 0;
  const prompt =
    "Pure text task: do NOT use any tools or read the project; everything you need is below. Think briefly and reply with ONLY one JSON object.\n\n" +
    GUIDE +
    (hint ? "\n\nThe editor's note: " + hint : "") +
    "\n\nThe Short runs " + total.toFixed(0) + " s: give about " + Math.max(3, Math.round(total / 5)) + " broll moments spread over it. Example of the JSON shape (sentence numbers are 1-based):\n" + SHAPE + "\n\nTranscript:\n" + lines.join("\n");
  // one re-ask when the answer is not valid JSON
  let raw = await ask(sdk, prompt);
  let o: any;
  try {
    o = parseLoose(raw);
  } catch (e: any) {
    raw = await ask(sdk, prompt + "\n\nYour previous reply was not valid JSON (" + String(e?.message || e).slice(0, 120) + "). Reply again with ONLY the complete JSON object, double-quoted keys and strings, no comments.");
    o = parseLoose(raw);
  }
  return resolveSemantic(o, words, sents, raw);
}

// The last JSON object in a reply, tolerating the usual slips: smart quotes, trailing commas, comments.
export function parseLoose(text: string): any {
  try {
    return lastJsonObject(text);
  } catch (first) {
    const s = String(text || "");
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start < 0 || end <= start) throw first;
    const body = s
      .slice(start, end + 1)
      .replace(/[“”]/g, '"')
      .replace(/\/\/[^\n"]*$/gm, "")
      .replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(body);
    } catch {
      throw first;
    }
  }
}

export function resolveSemantic(o: any, words: TWord[], sents: { from: number; to: number }[], raw = ""): Semantic {
  let missing = 0;
  const f = (s: any, q: any): Span | null => {
    const r = find(words, sents, Number(s) || 0, String(q || ""));
    if (!r) missing += 1;
    return r;
  };
  const arr = (v: any) => (Array.isArray(v) ? v : []);
  const tags: Tags = {};
  if (["standard", "story", "explainer", "montage_essay"].includes(o.format)) tags.format = o.format;
  if (o.hook && typeof o.hook === "object") {
    const big = o.hook.big ? f(1, o.hook.big) : null;
    tags.hook = { type: ["H1", "H2", "H3", "H4", "H5", "H6"].includes(o.hook.type) ? o.hook.type : undefined, big: big ? range(big) : [] };
  }
  const kinds = new Set(["T", "P", "C", "N", "B", "I", "D", "K", "S", "Q", "R"]);
  tags.keyTerms = arr(o.key)
    .map((k: any) => {
      const sp = f(k.s, k.q);
      if (!sp) return null;
      const kind = (kinds.has(k.kind) ? k.kind : "T") as EmphasisKind;
      return { head: headOf(words, sp), span: sp, kind, priority: Math.max(1, Math.min(5, Math.round(Number(k.p) || 3))) };
    })
    .filter(Boolean) as any;
  tags.punchlines = arr(o.punch).map((p: any) => f(p.s, p.q)).filter(Boolean) as Span[];
  tags.compounds = arr(o.compounds).map((c: any) => f(c.s, c.q)).filter((sp: Span | null) => sp && sp[1] > sp[0]) as Span[];
  tags.reveals = arr(o.reveal)
    .map((r: any) => {
      const setup = f(r.s, r.setup);
      const cop = f(r.s, r.copula);
      const pay = f(r.s, r.payoff);
      return setup && cop && pay ? { setup, copula: cop[0], payoff: pay } : null;
    })
    .filter(Boolean) as any;
  tags.quotes = arr(o.quotes)
    .map((x: any) => {
      const sp = f(x.s, x.q);
      return sp ? { span: sp, kind: ["reported", "imagined", "famous", "coined"].includes(x.kind) ? x.kind : "reported" } : null;
    })
    .filter(Boolean) as any;
  // drops stay small (an abandoned word, a stutter); a whole clause left out reads as a mistake
  tags.drops = arr(o.drops).map((d: any) => f(d.s, d.q)).filter((sp: Span | null) => sp && sp[1] - sp[0] <= 1) as Span[];
  const cards = arr(o.cards)
    .map((c: any) => {
      const sp = f(c.s, c.q);
      const text = String(c.text || "").trim().split(/\s+/).slice(0, 3).join(" ");
      if (!sp || !text) return null;
      // a card spells words the speaker says; a paraphrase is dropped
      const spoken = new Set(words.filter((w) => w.i >= sp[0] && w.i <= sp[1]).map((w) => norm(w.t)));
      return toks(text).every((t) => spoken.has(t)) ? { span: sp, text } : null;
    })
    .filter(Boolean) as { span: Span; text: string }[];
  const broll = arr(o.broll)
    .map((b: any) => {
      const sp = f(b.s, b.q);
      const query = String(b.query || "").trim();
      const alt = String(b.alt || "").trim();
      return sp && query ? { span: sp, query, alt: alt || query } : null;
    })
    .filter(Boolean) as { span: Span; query: string; alt: string }[];
  return { tags, cards, broll, missing, raw };
}

const range = (sp: Span) => {
  const out: number[] = [];
  for (let i = sp[0]; i <= sp[1]; i += 1) out.push(i);
  return out;
};

// The head of a key span: its last content word (the noun of 'much less important' is the last word).
function headOf(words: TWord[], sp: Span): number {
  const by = new Map(words.map((w) => [w.i, w]));
  for (let i = sp[1]; i >= sp[0]; i -= 1) {
    const w = by.get(i);
    if (w && wordClass(w.t) === "CONT" && norm(w.t).length > 1) return i;
  }
  return sp[1];
}
