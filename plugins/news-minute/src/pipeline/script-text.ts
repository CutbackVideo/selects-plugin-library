// The script review box is one text field; the pipeline still works per sentence (source passages,
// timing and scene plans all key on sentence ids). These helpers convert between the two.
import type { Line } from "./flow.ts";

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

// The sentences after an edit of the whole text. With the same sentence count each line keeps its position
// (id, source passage and flags); a changed line is marked edited. When sentences were added, removed, split
// or merged, unchanged sentences keep their entry, a new sentence borrows the source passage of an old
// sentence it contains or is contained in, and gets a fresh id.
export function applyScriptText(prev: Line[], text: string): Line[] {
  const texts = splitScript(text);
  if (texts.length === prev.length) {
    return texts.map((t, i) => (t === prev[i].text.trim() ? prev[i] : { ...prev[i], text: t, edited: true }));
  }
  // Unchanged sentences first, so a fragment of an edited sentence is matched against the edited ones.
  const used = new Set<number>();
  const kept = texts.map((t) => {
    const same = prev.findIndex((l, i) => !used.has(i) && l.text.trim() === t);
    if (same >= 0) used.add(same);
    return same;
  });
  const contains = (l: Line, t: string) => !!core(l.text) && !!core(t) && (l.text.includes(core(t)) || t.includes(core(l.text)));
  let next = prev.reduce((m, l) => Math.max(m, idNumber(l.id)), 0) + 1;
  return texts.map((t, k) => {
    if (kept[k] >= 0) return prev[kept[k]];
    const near = prev.find((l, i) => !used.has(i) && contains(l, t)) ?? prev.find((l) => contains(l, t));
    return { id: "s" + next++, text: t, sourceQuote: near?.sourceQuote ?? "", issues: [], rewritten: false, edited: true };
  });
}
