// Text helpers shared by the validators. Hangul is written as \uXXXX escapes (public-source check).

// Measured with the default narration voice: 6.5 chars/s on a 256-char script, 6.2 chars/s on a 376-char script
// (60.6 s). Tuned to the slower run. Every length number in the prompts and validators is read from here.
export const TTS_CHARS_PER_SEC = 6.2;
export const TARGET_CHARS = { min: 320, goal: [340, 360] as [number, number], max: 370 };
export const SENTENCE_COUNT = { min: 8, max: 14 };

// Sentence endings: ...ni-da (formal), ...ni-kka-yo is not used; questions end with ...l-kka-yo.
const FORMAL_END = /(\uB2C8\uB2E4|\uAE4C\uC694)[.?]$/;
const SOFT_END = /\uB294\uB370\uC694[.?]$/;
const HEADLINE_MAX_CHARS = 24;

export const isFormalEnding = (s: string) => FORMAL_END.test(s.trim()) || SOFT_END.test(s.trim());
export const isSoftEnding = (s: string) => SOFT_END.test(s.trim());
export const headlineMax = HEADLINE_MAX_CHARS;

export const normalizeWs = (s: string) =>
  String(s ?? "")
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201F]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

export const eojeolCount = (s: string) => normalizeWs(s).split(" ").filter(Boolean).length;

// Raw digit runs, commas removed ("164\uB9CC1000" gives "164" and "1000").
export function rawNumberTokens(s: string): string[] {
  const out = String(s ?? "").match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
  return out.map((t) => t.replace(/,/g, ""));
}

const UNIT_VALUE: Record<string, number> = { "\uCC9C": 1e3, "\uB9CC": 1e4, "\uC5B5": 1e8, "\uC870": 1e12 };
const NUM = "\\d[\\d,]*(?:\\.\\d+)?";
const UNIT = "[\uCC9C\uB9CC\uC5B5\uC870]";
// A spoken amount: segments like "20\uB9CC1000" or "1\uC870 2000\uC5B5"; a space joins segments only after a unit.
const AMOUNT_RE = new RegExp(`${NUM}(?:${UNIT}(?:\\s?${NUM}(?:${UNIT})?)*)?`, "g");

// Numeric values with comma and unit differences removed, so "201,000" and "20\uB9CC1000" compare equal.
export function numberTokens(s: string): string[] {
  const out: string[] = [];
  for (const m of String(s ?? "").match(AMOUNT_RE) ?? []) {
    let total = 0;
    for (const seg of m.matchAll(new RegExp(`(${NUM})(${UNIT})?`, "g"))) {
      const n = parseFloat(seg[1].replace(/,/g, ""));
      total += n * (seg[2] ? UNIT_VALUE[seg[2]] : 1);
    }
    out.push(String(Math.round(total * 1e6) / 1e6));
  }
  return out;
}

export function estimateSeconds(sentences: string[]): number {
  const chars = sentences.map((x) => x.trim()).join(" ").length;
  return chars / TTS_CHARS_PER_SEC;
}

export const totalChars = (sentences: string[]) => sentences.map((x) => x.trim()).join(" ").length;

export function isObj(x: any): x is Record<string, any> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}
