// Shared types of the caption compiler. Times are seconds on the edited timeline; word indices refer to
// the transcript word list the semantic pass saw.

export type Word = { i: number; t: string; s: number; e: number };

export type Span = [number, number]; // inclusive word indices

export type KeyTerm = { head: number; span: Span; kind: EmphasisKind; priority: number };
export type EmphasisKind = "T" | "P" | "C" | "N" | "B" | "I" | "D" | "K" | "S" | "Q" | "R";

// The semantic pass (spec section 2). Every field is optional: the compiler runs without any of them.
export type Tags = {
  format?: "standard" | "story" | "montage_essay" | "explainer";
  thesis?: Span;
  hook?: { type?: "H1" | "H2" | "H3" | "H4" | "H5" | "H6"; big?: number[] };
  keyTerms?: KeyTerm[];
  compounds?: Span[];
  particles?: number[];
  hedges?: { i: number; action: "keep" | "drop" }[];
  openers?: number[];
  quotes?: { span: Span; kind: "reported" | "imagined" | "famous" | "coined" }[];
  quotatives?: Span[];
  lists?: { items: Span[] }[];
  repetitions?: { span: Span; kind: "emphatic" | "stutter" | "restart" }[];
  abandoned?: Span[];
  reveals?: { setup: Span; copula: number; payoff: Span }[];
  drops?: Span[];
  enumerations?: { count: Span; items: Span[] }[];
  punchlines?: Span[];
  cards?: { span: Span; text: string; kind: "concept" | "thesis" | "chapter" }[];
  visuals?: { span: Span; kind: string; query: string }[];
};

export type Shot = {
  from: number;
  to: number;
  kind: "speaker" | "broll" | "card" | "photo";
  // Face box in frame fractions (speaker shots).
  face?: { cx: number; cy: number; w: number; h: number; chin: number } | null;
  // Shots that share a source angle share a segment id; the caption y is frozen per segment.
  segment?: number;
};

export type Dialect = "BLUR" | "CUT" | "RISE";
export type Style = {
  format: "standard" | "story" | "montage_essay" | "explainer";
  dialect: Dialect;
  TW: number; // target words per caption unit
  caseMode: "lower" | "lower_keep_I" | "sentence";
  punct: "minimal" | "punchline" | "full";
  typeVariant: "serif_sparse" | "serif_dense" | "sans_only" | "plain";
  yAnchor: "fixed_050" | "chin";
  buildShare: number;
  lockupRate: number; // per minute, hook excluded
  xh: number; // base caption x-height, fraction of H
  chinGap: number; // g in the chin rule
  sigma0: number; // body blur radius px at 1080 wide
  blurFrames: number;
  fps: number;
};

export type Tier = "small" | "normal" | "large" | "huge" | "big";
export type Face = "sans" | "serif" | "roman";

export type CapToken = {
  text: string;
  src: number[]; // transcript word indices
  s: number;
  e: number;
  reveal: number; // seconds; when the word appears in a built unit
  face?: Face; // inline serif on one word
  accent?: string; // colour flash: hex, mixes to white
};

export type CapLine = { from: number; to: number; tier: Tier; scale: number; face: Face };

export type Template = "single" | "stair" | "headTail" | "leadBig" | "stack" | "left" | "two";

export type Entrance = { kind: "blur" | "cut" | "rise"; sigma: number; frames: number; curve: "quad" | "cubic" };

export type CapUnit = {
  tokens: CapToken[];
  lines: CapLine[];
  template: Template;
  start: number;
  end: number;
  build: boolean;
  entrance: Entrance;
  role: "body" | "hook" | "lockup" | "large" | "bookend";
  emphasis?: EmphasisKind;
  y: number; // centre of the first line (single) or top line, fraction of H
  swapFrom?: number; // tokens kept from the previous unit (slot swap)
  grow?: number; // repetition grow scale
  quoteGlyph?: boolean;
  exit?: "cut" | "blurOut";
  dark?: boolean; // charcoal text over a bright background
  letters?: boolean; // letter build (acronyms, numbers)
};

export type CaptionTrack = { units: CapUnit[]; style: Style; notes: string[] };
