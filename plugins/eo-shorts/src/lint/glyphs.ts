export type FontGlyphs = { sha256: string; glyphs: number; codepoints: number; cmap: readonly number[]; blank: readonly number[] };
export type GlyphTable = { readonly [rel: string]: FontGlyphs };

const SETS = new WeakMap<FontGlyphs, Set<number>>();

export function fontDraws(font: FontGlyphs, cp: number): boolean | null {
  const r = font.cmap;
  let lo = 0, hi = r.length / 2 - 1, found = false;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1, a = r[2 * mid], b = r[2 * mid + 1];
    if (cp < a) hi = mid - 1;
    else if (cp > b) lo = mid + 1;
    else { found = true; break; }
  }
  if (!found) return null;
  let blank = SETS.get(font);
  if (!blank) SETS.set(font, (blank = new Set(font.blank)));
  return !blank.has(cp);
}
