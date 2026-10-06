export type EditFiller = { type: string; groupId: string; removable: boolean | null };

export type EditWord = {
  text: string;
  s: number;
  e: number;
  ss: number | null;
  se: number | null;
  wordId: string | null;
  speakerId: number | null;
  nonSpeech: boolean;
  semanticEnd: boolean;
  filler: EditFiller | null;
};

export function isCountable(w: EditWord): boolean {
  return !w.nonSpeech && !w.filler && w.text.trim().length > 0;
}

export function countable(words: EditWord[]): EditWord[] {
  return words.filter(isCountable);
}

function fnv(text: string, h = 0x811c9dc5): number {
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function wordsSig(words: { text: string; s: number; e: number }[]): string {
  let h = 0x811c9dc5;
  for (const w of words) h = fnv(w.text + "|" + w.s + "|" + w.e + "\n", h);
  return words.length + ":" + h.toString(16);
}

export function textSig(words: { text: string }[]): string {
  let h = 0x811c9dc5;
  for (const w of words) h = fnv(w.text + "\n", h);
  return words.length + ":" + h.toString(16);
}

export const WORD_SIG_JS = `const fnv = (t, h) => { for (let i = 0; i < t.length; i += 1) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
const wordsSig = (ws) => { let h = 0x811c9dc5; for (const w of ws) h = fnv(w.text + "|" + w.startFrame + "|" + w.endFrame + "\\n", h); return ws.length + ":" + h.toString(16); };
const textSig = (ws) => { let h = 0x811c9dc5; for (const w of ws) h = fnv(w.text + "\\n", h); return ws.length + ":" + h.toString(16); };`;

export const WORD_ROW_JS = `const row = (w) => ({ text: w.text, s: w.startFrame, e: w.endFrame, ss: w.sourceStartFrame ?? null, se: w.sourceEndFrame ?? null,
  wordId: w.wordId ?? null, speakerId: w.speakerId ?? null, nonSpeech: !!w.nonSpeech, semanticEnd: !!w.semanticEnd,
  filler: w.filler ? { type: String(w.filler.type), groupId: String(w.filler.groupId), removable: w.filler.removable ?? null } : null });`;

export const sec = (frames: number, fps: number): number => frames / fps;

export function mergeRanges(ranges: [number, number][]): [number, number][] {
  const sorted = ranges.filter(([a, b]) => b > a).map(([a, b]) => [a, b] as [number, number]).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const out: [number, number][] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else out.push([r[0], r[1]]);
  }
  return out;
}

export function rangesFrames(ranges: [number, number][]): number {
  return mergeRanges(ranges).reduce((n, [a, b]) => n + (b - a), 0);
}

export function wordsAfterRemoval(words: EditWord[], ranges: [number, number][]): { kept: EditWord[]; removedIdx: number[] } {
  const merged = mergeRanges(ranges);
  const shift = (f: number): number => {
    let n = 0;
    for (const [a, b] of merged) {
      if (b <= f) n += b - a;
      else if (a < f) n += f - a;
    }
    return f - n;
  };
  const kept: EditWord[] = [];
  const removedIdx: number[] = [];
  words.forEach((w, i) => {
    const inside = merged.some(([a, b]) => a <= w.s && w.e <= b);
    if (inside) removedIdx.push(i);
    else kept.push({ ...w, s: shift(w.s), e: shift(w.e) });
  });
  return { kept, removedIdx };
}
