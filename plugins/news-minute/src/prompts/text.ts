// Text helpers shared by the validators. Hangul is written as \uXXXX escapes (public-source check).

// Measured with the default narration voice: 256 chars (spaces included) took 39.5 s.
export const TTS_CHARS_PER_SEC = 6.5;
export const TARGET_CHARS = { min: 340, goal: [360, 380] as [number, number], max: 390 };
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

export function numberTokens(s: string): string[] {
  const out = String(s ?? "").match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
  return out.map((t) => t.replace(/,/g, ""));
}

export function estimateSeconds(sentences: string[]): number {
  const chars = sentences.map((x) => x.trim()).join(" ").length;
  return chars / TTS_CHARS_PER_SEC;
}

export const totalChars = (sentences: string[]) => sentences.map((x) => x.trim()).join(" ").length;

export function isObj(x: any): x is Record<string, any> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}
