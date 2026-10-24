// Template text mechanics; STRINGS remains the independently installed panel dictionary.
const LANGS = ["de", "en", "es", "fr", "it", "ja", "ko", "pt", "tr", "zh"] as const;
type Lang = (typeof LANGS)[number];
type Msg = string | { [category: string]: string };
type Vars = Record<string, string | number>;
const I18N_TABLE = STRINGS as unknown as Record<string, Record<string, Msg>>;

function normLang(raw: unknown): Lang | null {
  const code = String(raw ?? "").toLowerCase().split(/[-_]/)[0];
  return (LANGS as readonly string[]).includes(code) ? (code as Lang) : null;
}
// Call in the component body on every render: the app can switch languages while the panel is open.
function uiLang(context?: { language?: string | null } | null): Lang {
  const nav = typeof navigator === "undefined" ? "" : navigator.language;
  return normLang(context?.language) ?? normLang(nav) ?? "en";
}
// Plural messages pick their form from vars.count; numbers are formatted for the language.
function textMessage(table: Record<string, Msg> | undefined, key: string): Msg | undefined {
  return table && Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
}
function t(lang: Lang, key: string, vars: Vars = {}): string {
  let msg: Msg | undefined = textMessage(I18N_TABLE[lang], key) ?? textMessage(I18N_TABLE.en, key);
  if (msg === undefined) return key;
  if (typeof msg !== "string") {
    const n = Number(Object.prototype.hasOwnProperty.call(vars, "count") ? vars.count : undefined);
    msg = msg[new Intl.PluralRules(lang).select(Number.isFinite(n) ? n : 0)] ?? msg.other ?? "";
  }
  const nf = new Intl.NumberFormat(lang);
  return msg.replace(/\{(\w+)\}/g, (whole: string, name: string) => {
    const v = Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : undefined;
    return v === undefined ? whole : typeof v === "number" ? nf.format(v) : v;
  });
}
// Optional keys (preset/look labels by id): the English label from the JSON is the fallback.
function tOr(lang: Lang, key: string, fallback: string, vars: Vars = {}): string {
  return textMessage(I18N_TABLE.en, key) === undefined ? fallback : t(lang, key, vars);
}
// Field limits count Hangul, kana, CJK and fullwidth characters as 2.
const WIDE_RE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/;
function fieldLen(text: string): number {
  let n = 0;
  for (const ch of text) n += WIDE_RE.test(ch) ? 2 : 1;
  return n;
}

// Field clipping uses the same wide-character units as fieldLen.
function fieldClip(text: string, max: number) {
  let out = "", n = 0;
  for (const ch of text) { const w = fieldLen(ch); if (n + w > max) break; out += ch; n += w; }
  return out;
}
