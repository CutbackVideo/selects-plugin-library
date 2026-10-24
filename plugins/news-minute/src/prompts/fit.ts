// Will a scene's text fit at its style-spec size? The templates never shrink text (style spec 1): a line that
// is too wide breaks onto the next one (src/heritage/shared.jsx wrapLines). These are the same width estimates,
// used to warn about text that would take more than two lines or cannot fit its box even broken up.

// Width in em: Latin and digits ~0.58, Hangul ~0.95, a space 0.3 (heritage `ems`).
const ems = (text: string) => [...text].reduce((n, ch) => n + (ch === " " ? 0.3 : /[\x21-\x7e]/.test(ch) ? 0.58 : 0.95), 0);
const plain = (text: string) => text.replace(/[[\]{}]/g, "");

// Words a template may break between: spaces, and in a number after the Korean units for 10^8 / 10^4 when
// digits follow (1\uC5B55000\uB9CC -> 1\uC5B5 / 5000\uB9CC).
const words = (text: string) => plain(text).split(" ").flatMap((w) => w.split(/(?<=\d[\uC5B5\uB9CC])(?=\d)/)).filter(Boolean);

// Lines `text` takes at `size` px in `maxW` px (greedy), and whether one word alone is wider than maxW.
export function lineFit(text: string, size: number, maxW: number): { lines: number; tooWide: boolean } {
  let lines = 0, tooWide = false;
  for (const para of String(text).split("\n")) {
    let line = "";
    for (const w of words(para)) {
      if (ems(w) * size > maxW) tooWide = true;
      const next = line ? line + " " + w : w;
      if (line && ems(next) * size > maxW) { lines++; line = w; } else line = next;
    }
    lines++;
  }
  return { lines, tooWide };
}

const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");

// Warnings (without the scene prefix) for text that will not sit at its size within two lines.
export function fitWarnings(type: string, p: Record<string, any>): string[] {
  const out: string[] = [];
  const check = (what: string, text: string, size: number, maxW: number, maxLines = 2) => {
    if (!text.trim()) return;
    const f = lineFit(text, size, maxW);
    if (f.tooWide) out.push(`${what} "${plain(text)}" is wider than its box at ${size} px even on a line of its own; shorten it`);
    else if (f.lines > maxLines) out.push(`${what} "${plain(text)}" takes ${f.lines} lines at ${size} px (text is never made smaller); shorten it or split the scene`);
  };
  if (type === "text_card") for (const l of str(p.text).split("\n")) check("text line", l, Number(p.fontSize ?? 72), 960);
  if (type === "quote_card") {
    for (const l of Array.isArray(p.lines) ? p.lines : []) check("quote line", str(l), 66, 960);
    check("name", str(p.name), 76, 690, 1);
  }
  if (type === "highlight_card") {
    check("title", str(p.title), 50, 780);
    check("value", str(p.value), 150, 760);
  }
  if (type === "stat_cards" && Array.isArray(p.cards)) {
    const cards = p.cards.slice(0, 4);
    const two = cards.some((c: any) => Array.isArray(c?.rows) && c.rows.length > 1);
    // Four one-row cards whose numbers do not fit a quarter of the width go two by two (462 wide).
    const quarter = (960 - 36 * 3) / 4 - 28;
    const grid = cards.length === 4 && !two && cards.some((c: any) => words(str(c?.rows?.[0]?.value)).some((w) => ems(w) * 72 > quarter));
    const n = grid ? 2 : Math.max(1, cards.length);
    const w = (960 - 36 * (n - 1)) / n;
    for (const c of cards) check("card number", str(c?.rows?.[0]?.value), 72, w - 28);
  }
  return out;
}
