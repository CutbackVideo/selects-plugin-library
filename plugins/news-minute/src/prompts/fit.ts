// Will a scene's text fit at its style-spec size? The templates never shrink text (style spec 1): a line that
// is too wide breaks onto the next one (src/heritage/shared.jsx wrapLines). Rather than estimate the layout
// again, this runs the template source itself at its last frame (layoutReports) and reads where each block of
// text ended up and the room it may use. Text outside its room (cut off at the window edge, over the source
// line, out of its card) or lines on top of each other is an error: the scene cannot become the video until the
// text is shortened or the scene split. More lines than the type's usual count is only a warning.

import { layoutReports } from "../templates/entrance.generated.ts";

type Report = { what: string; text: string; box: number[]; area: number[]; size?: number; lines?: number; maxLines?: number; overlap?: boolean; cause?: string[] };

// Every layout error carries this phrase (the Panel and settlePlan tell them from other plan errors by it).
export const LAYOUT_ERROR = /\bdoes not fit\b/;

// Less than this past the room is rounding in the width estimate, not a cut.
const SLACK = 1;
// How to make number cards shorter (the re-review's passing variant of its long-header case).
const CARD_HINT = "move words every card repeats (for example \"\uC11C\uC6B8 \uC2E0\uCD95 \uC544\uD30C\uD2B8 \uBCF4\uC99D\uAE08\") into the title and keep card names short (for example \uB3D9\uBD81\uBD80, \uB3D9\uB0A8\uBD80, \uC11C\uBD81\uBD80, \uC11C\uB0A8\uBD80), or use fewer cards";

// Errors and warnings (without the scene prefix) for the scene's text as the template lays it out.
export function fitProblems(type: string, p: Record<string, any>): { errors: string[]; warnings: string[] } {
  const errors: string[] = [], warnings: string[] = [];
  let reports: Report[];
  try { reports = layoutReports(type, p ?? {}); }
  catch { return { errors, warnings }; }
  for (const r of reports) {
    const [x0, y0, x1, y1] = r.box, [ax0, ay0, ax1, ay1] = r.area;
    const text = [...r.text].length > 40 ? [...r.text].slice(0, 39).join("") + "\u2026" : r.text;
    const quoted = `${r.what} "${text}"`;
    const at = r.size ? ` at ${r.size} px` : "";
    if (r.what === "card") {
      if (y1 > ay1 + SLACK) {
        // Number cards all grow with the card that needs the most lines: name that card, not only the one at the bottom.
        if (type === "stat_cards" && r.cause?.length) for (const c of r.cause) errors.push(`card "${c}" does not fit: its text takes more lines, so every card grows and the cards run below their room (over the source line); ${CARD_HINT}`);
        else errors.push(`${quoted} does not fit: the cards run below their room (over the source line); ${type === "stat_cards" ? CARD_HINT : "shorten their text or use fewer cards"}`);
      }
      else if (y0 < ay0 - SLACK || x0 < ax0 - SLACK || x1 > ax1 + SLACK) errors.push(`${quoted} does not fit: the card runs out of the window; shorten its text or use fewer cards`);
    } else if (x0 < ax0 - SLACK || x1 > ax1 + SLACK) {
      errors.push(`${quoted} does not fit: wider than its room${at} even on a line of its own (text is never made smaller), so it would be cut off; shorten it`);
    } else if (y0 < ay0 - SLACK || y1 > ay1 + SLACK) {
      errors.push(`${quoted} does not fit: ${r.lines === 1 ? "its line" : r.lines + " lines"}${at} run${r.lines === 1 ? "s" : ""} past its room (text is never made smaller), so it would be cut off or cover the source; shorten it or split the scene`);
    } else if (r.overlap) {
      errors.push(`${quoted} does not fit: its lines overlap; shorten it or split the scene`);
    } else if ((r.lines ?? 0) > (r.maxLines ?? Infinity)) {
      warnings.push(`${quoted} takes ${r.lines} lines${at} (text is never made smaller); shorten it or split the scene`);
    }
  }
  // Cards with the same text report the same problem once.
  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}
