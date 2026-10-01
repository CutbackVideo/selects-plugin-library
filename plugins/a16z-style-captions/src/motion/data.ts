// The compact data the graphic receives (it travels inside a run_script, so it is kept small).
// Frames are Draft frames; positions are fractions of the frame.

export type PToken = [text: string, reveal: number, face: 0 | 1 | 2, accent?: string];
// face: 0 sans, 1 serif italic, 2 serif roman
export type PLine = [from: number, to: number, scale: number, face: 0 | 1 | 2, big: 0 | 1];
export type PUnit = {
  a: number; // first frame
  b: number; // end frame (exclusive)
  y: number; // centre of a single line, fraction of H
  tp: "single" | "stair" | "headTail" | "leadBig" | "stack" | "left" | "two";
  e: [kind: "b" | "c" | "r", sigma: number, frames: number, curve: "q" | "c"];
  t: PToken[];
  l: PLine[];
  s: number; // sentence id (an overflow shrink carries over the rest of the sentence)
  sw?: number; // tokens already on screen (slot swap)
  g?: number; // repetition grow scale
  q?: 1; // quote glyph above the line
  d?: 1; // dark text (bright background)
};

export type NameTag = { a: number; b: number; first: string; last: string; role: string; x: number; y: number; cap: number; small?: boolean };
export type Card = {
  a: number;
  b: number;
  kind: "keyword" | "number" | "thesis";
  palette: "burgundy" | "cream";
  lines: { text: string; at: number; face: 0 | 1 | 2; scale: number }[];
  push?: number;
};
export type Mark = { src: string; w: number; h: number; opacity: number };

export type GraphicData = {
  W: number;
  H: number;
  fps: number;
  uid: string;
  xh: number; // base caption x-height, fraction of H
  units: PUnit[];
  nameTag?: NameTag | null;
  cards?: Card[];
  mark?: Mark | null;
  quoteBlocks?: [number, number, number][]; // [first frame, end frame, y]
  fonts?: { sans?: string; serif?: string; roman?: string };
};
