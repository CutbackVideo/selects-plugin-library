// The script review box is one text field; the pipeline still works per sentence (source passages,
// timing and scene plans all key on sentence ids). These helpers convert between the two.
import type { Line } from "./flow.ts";
import { normalizeWs, numberTokens } from "../prompts/text.ts";

// One sentence per line in the editable text.
export const scriptBody = (sentences: Pick<Line, "text">[]) => sentences.map((s) => s.text.trim()).join("\n");

// Sentences of the edited text: every line break ends a sentence, and so does a period, question mark or
// exclamation mark followed by whitespace ("3.5%" and a closing quote stay inside the sentence).
export function splitScript(text: string): string[] {
  return String(text ?? "")
    .split(/\r?\n/)
    .flatMap((line) => line.split(/(?<=[.?!])\s+/))
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

// Sentence text without its closing punctuation, for the contains test.
const core = (s: string) => s.trim().replace(/[.?!]+$/, "");
const idNumber = (id: string) => (/^s(\d+)$/.exec(id) ? Number(/^s(\d+)$/.exec(id)![1]) : 0);

// The sentences after an edit of the whole text. An unchanged sentence keeps its entry (id, source passage and
// flags) wherever it moved. With the same sentence count, the changed sentences take the remaining entries in
// order and are marked edited. When sentences were added, removed, split or merged, a new sentence borrows the
// source passage of an old sentence it contains or is contained in, and gets a fresh id.
// `body` (the article body) lets a sentence with no source passage of its own find one (see refind).
export function applyScriptText(prev: Line[], text: string, body = ""): Line[] {
  const texts = splitScript(text);
  // Unchanged sentences first, so a moved sentence keeps its own source and a fragment of an edited sentence
  // is matched against the edited ones.
  const used = new Set<number>();
  const kept = texts.map((t) => {
    const same = prev.findIndex((l, i) => !used.has(i) && l.text.trim() === t);
    if (same >= 0) used.add(same);
    return same;
  });
  if (texts.length === prev.length) {
    const free = prev.map((_, i) => i).filter((i) => !used.has(i));
    let f = 0;
    return texts.map((t, k) => {
      if (kept[k] >= 0) return prev[kept[k]];
      const l = prev[free[f++]];
      return { ...l, text: t, edited: true, ...refind(l, t, body) };
    });
  }
  const contains = (l: Line, t: string) => !!core(l.text) && !!core(t) && (l.text.includes(core(t)) || t.includes(core(l.text)));
  let next = prev.reduce((m, l) => Math.max(m, idNumber(l.id)), 0) + 1;
  return texts.map((t, k) => {
    if (kept[k] >= 0) return prev[kept[k]];
    const near = prev.find((l, i) => !used.has(i) && contains(l, t)) ?? prev.find((l) => contains(l, t));
    const line: Line = { id: "s" + next++, text: t, sourceQuote: near?.sourceQuote ?? "", issues: [], rewritten: false, edited: true };
    // A one-key fragment ("\uC815") sits inside almost any sentence, so what it borrows is only a stand-in.
    if (near?.sourceQuote) return near.autoSource || pairs(t).size < SOURCE_MIN_PAIRS ? { ...line, autoSource: true } : line;
    return { ...line, ...refind(line, t, body) };
  });
}

// A line typed one key at a time is first a fragment, so a passage found by the article search (or lent to a
// fragment) is looked up again on every change; a passage the AI wrote or an old sentence lent stays.
function refind(l: Line, t: string, body: string): Partial<Line> {
  if (l.sourceQuote && !l.autoSource) return {};
  const q = findSourceQuote(t, body);
  return { sourceQuote: q, autoSource: !!q };
}

// Letters and digits only, as overlapping character pairs (Korean has no reliable word stems to compare).
const pairs = (s: string) => {
  const c = [...s.replace(/[^\p{L}\p{N}]+/gu, "")];
  const out = new Set<string>();
  for (let i = 0; i + 1 < c.length; i++) out.add(c[i] + c[i + 1]);
  return out;
};
// Share of the sentence's character pairs a passage must contain to count as its source.
export const SOURCE_MATCH_MIN = 0.4;
// Fewer pairs than this is a fragment still being typed, too short to tell which passage it means.
const SOURCE_MIN_PAIRS = 8;

// The article sentence that best supports a sentence the user wrote: the one holding the largest share of its
// character pairs and every number it says. Returns "" when none is close enough, so the check still asks.
// The passage is cut from the whitespace-normalized body, the text the script check compares quotes against.
export function findSourceQuote(text: string, body: string): string {
  const want = pairs(text);
  if (want.size < SOURCE_MIN_PAIRS || !body) return "";
  const nums = numberTokens(text);
  let best = "", bestScore = 0;
  for (const cand of normalizeWs(body).split(/(?<=[.?!]["'\u201D\u2019)]?)\s+/)) {
    if (nums.length) {
      const have = new Set(numberTokens(cand));
      if (!nums.every((n) => have.has(n))) continue;
    }
    const got = pairs(cand);
    let hit = 0;
    for (const x of want) if (got.has(x)) hit++;
    const score = hit / want.size;
    if (score > bestScore) { best = cand; bestScore = score; }
  }
  return bestScore >= SOURCE_MATCH_MIN ? best : "";
}
