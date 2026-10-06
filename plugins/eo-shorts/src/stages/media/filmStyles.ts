import A from "../../../engine/styles/A.json" with { type: "json" };
import B from "../../../engine/styles/B.json" with { type: "json" };
import type { FilmStyle } from "../../../engine/compiler/core.mjs";

export type FilmId = "A" | "B";

const STYLES: Readonly<Record<FilmId, FilmStyle>> = { A: A as unknown as FilmStyle, B: B as unknown as FilmStyle };

export function filmStyle(film: string): FilmStyle {
  const s = STYLES[film as FilmId];
  if (!s) throw new Error("Unknown film " + JSON.stringify(film) + " (A or B).");
  return structuredClone(s);
}

export function allFilmStyles(): Readonly<Record<string, Record<string, unknown>>> {
  return STYLES as unknown as Readonly<Record<string, Record<string, unknown>>>;
}
