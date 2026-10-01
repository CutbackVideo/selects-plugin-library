// Step 6 of the caption compiler (spec 3.8): the shown text of each token — case, punctuation, quotes.
import { norm, wordClass, INTERJ } from "./lexicon";
import type { Group } from "./lockups";
import type { Tags, Style, Span } from "./types";

const TRAIL = /[.,!?;:]+(["”’)]*)$/;
const inSpan = (i: number, sp: Span) => i >= sp[0] && i <= sp[1];

// Acronyms, brand caps and mid-sentence proper nouns keep their capitals; sentence-initial capitals and
// the pronoun 'I' follow the case policy.
function caseOf(text: string, sentenceStart: boolean, mode: Style["caseMode"], afterComma: boolean, seenLower: Set<string> = new Set()): string {
  const core = text.replace(/[^A-Za-z'’\-]/g, "");
  const isI = /^I(['’](m|ve|d|ll))?$/.test(core);
  const acronym = core.length >= 2 && /^[A-Z0-9\-]+$/.test(core) && !isI;
  const innerCaps = /[a-z][A-Z]/.test(core) || /^[a-z]+[A-Z]/.test(core);
  if (mode === "sentence") {
    let t = text;
    if (sentenceStart || afterComma) t = t.replace(/^([“"‘']?)([a-z])/, (_, q, c) => q + c.toUpperCase());
    return t;
  }
  if (isI) return mode === "lower_keep_I" ? text : text.replace(/^I/, "i");
  if (acronym || innerCaps) return text;
  // ASR capitalises quoted speech and restarts ('I was like, Hey'); closed-class words and interjections
  // are never proper nouns, so they lose the capital wherever they are
  const n = norm(text);
  // a word the transcript also writes in lowercase is not a name
  const common = wordClass(n) !== "CONT" || INTERJ.has(n) || seenLower.has(n) || /^(yeah|yep|nope|well|right|okay|ok|oh|hey|so|but|and|now|then|just|also|maybe|actually|what|who|why|how|when|where|which)$/.test(n);
  if (sentenceStart || common) return text.replace(/[A-Z]/, (c) => c.toLowerCase());
  return text;
}

export function shownText(groups: Group[], tags: Tags, style: Style) {
  const punchSpans = tags.punchlines || [];
  const quoteSpans = (tags.quotes || []).filter((q) => q.kind === "famous" || q.kind === "coined").map((q) => q.span);
  let sentenceStart = true;
  let afterComma = false;
  const seenLower = new Set<string>();
  for (const g of groups) for (const t of g.toks) if (/^[“"'‘]?[a-z]/.test(t.t)) seenLower.add(norm(t.t));
  groups.forEach((g, gi) => {
    const last = gi === groups.length - 1;
    g.toks.forEach((t, k) => {
      const raw = t.t;
      const unitFinal = k === g.toks.length - 1;
      let text = caseOf(raw.replace(TRAIL, "$1"), sentenceStart, style.caseMode, afterComma && k === 0, seenLower);
      const punct = (raw.match(/[.,!?;:]+/g) || []).pop() || "";
      const endsSentence = /[.!?]/.test(punct);
      sentenceStart = endsSentence;
      afterComma = /,/.test(punct);
      // trailing marks the captions keep
      let keep = "";
      if (/\?/.test(punct)) keep = "?";
      else if (/^yknow/.test(norm(raw))) keep = ",";
      else if (unitFinal) {
        const hedge = /^like$/.test(norm(raw)) && /,/.test(punct);
        const punchline = punchSpans.some((p) => t.src.some((i) => inSpan(i, p)) && t.src.includes(p[1]));
        if (hedge) keep = ",";
        else if (style.punct === "full") keep = punct.replace(/[;:]/g, ",").slice(0, 1);
        else if (style.punct === "punchline" && /\./.test(punct) && (punchline || last)) keep = ".";
        else if (last && /[.!]/.test(punct)) keep = style.punct === "minimal" ? "" : punct.slice(0, 1);
        if (punct === "!" && keep === ".") keep = "!";
      } else if (style.punct === "full" && /,/.test(punct) && k === 0 && g.toks.length > 1) keep = ",";
      // a self-interruption ends its unit with '-'
      if (unitFinal && (tags.abandoned || []).some((a) => a[0] === t.src[t.src.length - 1] + 1)) keep = "-";
      text = text.replace(/^[“"]+|[”"]+$/g, "") + keep;
      // inline quotes around a famous or coined phrase
      if (quoteSpans.some((q) => t.src[0] === q[0])) text = "“" + text;
      if (quoteSpans.some((q) => t.src.includes(q[1]))) text = text + "”";
      t.t = text;
    });
  });
}
