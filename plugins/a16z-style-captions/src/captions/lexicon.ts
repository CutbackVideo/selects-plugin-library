// Closed word classes used by the break scores, and small word lists for the text rules.

const set = (s: string) => new Set(s.split(/\s+/).filter(Boolean));

export const DET = set("a an the this these those my your our their his her its some any every each no");
export const PREP = set("of in on at for with to from by about into over through during like than as");
export const CONJ = set("and or but so because cause if when while where which who whose whom that then");
export const PRON = set(
  "i you we they he she it me us them i'm you're we're they're it's he's she's i've you've we've they've i'd you'd we'd i'll you'll there's that's what's"
);
export const AUX = set(
  "is are was were be been am do does did don't doesn't didn't have has had will would can could should might must gonna wanna can't won't isn't wasn't weren't"
);
export const INTERJ = set("hey okay ok oh wow no look listen yes");
export const PHRASAL_VERB = set(
  "look looking looked looks think thinking thought thinks talk talking talked talks know knew worry worried care deal focus depend rely hear heard listen point figure come came go went get got"
);
export const PARTICLE = set("at about into through out up on for with");
export const NUM_WORDS = set("one two three four five six seven eight nine ten eleven twelve twenty thirty forty fifty hundred thousand million billion");
export const FILLER = /^(uh+|um+|uhm+|erm+|er|ah+|hmm+|mm+|mhm)$/;
// Words that open quoted or imagined speech and join the words after them (spec 3.3.2).
export const OPENER = set("hey okay ok oh wow no look listen yes");
// After these a comma always breaks.
export const COMMA_BREAKERS = set("well like now yeah");
// Sentence-initial base verbs (an imperative when they open a sentence).
export const IMPERATIVE = set(
  "be do don't make keep stop start think try build go get find look focus remember imagine forget never always ask take give let stay work write learn read"
);
export const INTENSIFIER = set("much very really extremely incredibly so super totally completely absolutely way far most least");

export type WordClass = "DET" | "PREP" | "CONJ" | "PRON" | "AUX" | "CONT";

export function norm(w: string): string {
  return String(w || "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9'\-%]/g, "");
}

export function wordClass(w: string): WordClass {
  const n = norm(w);
  if (DET.has(n)) return "DET";
  if (PREP.has(n)) return "PREP";
  if (CONJ.has(n)) return "CONJ";
  if (PRON.has(n)) return "PRON";
  if (AUX.has(n)) return "AUX";
  return "CONT";
}

export function isNumberWord(w: string): boolean {
  const n = norm(w);
  return /^\d/.test(n) || NUM_WORDS.has(n);
}

// Class-pair log-odds of a break between two words (spec 3.4).
const PAIR: Record<string, number> = {
  "CONT>CONJ": 1.0,
  "DET>CONJ": 0.5,
  "CONT>AUX": -0.4,
  "PREP>CONJ": -0.5,
  "CONT>PREP": -0.6,
  "CONT>DET": -0.7,
  "AUX>CONT": -0.8,
  "CONJ>DET": -0.8,
  "CONT>CONT": -1.0,
  "PREP>CONT": -1.0,
  "CONT>PRON": -1.4,
  "PRON>CONT": -1.7,
  "CONJ>CONT": -2.0,
  "DET>CONT": -2.2,
  "PRON>AUX": -2.5,
  "PREP>DET": -2.9,
  "CONJ>PRON": -3.2,
};
export function pairScore(a: WordClass, b: WordClass): number {
  const v = PAIR[a + ">" + b];
  return v == null ? -1.2 : v;
}
