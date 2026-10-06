export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
export type Obj = { [k: string]: Json };

export class PyError extends Error {
  constructor(kind: "TypeError" | "KeyError" | "ValueError" | "StopIteration" | "IndexError", detail: string) {
    super(`${kind}: ${detail}`);
    this.name = kind;
  }
}

export const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
export const isList = (v: unknown): v is Json[] => Array.isArray(v);
export const isStr = (v: unknown): v is string => typeof v === "string";
export const isNum = (v: unknown): v is number => typeof v === "number";
export const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);

const hasOwn = Object.prototype.hasOwnProperty;
export const has = (o: Obj, k: string): boolean => hasOwn.call(o, k);
export function get(o: Obj, k: string, dflt: Json = null): Json {
  return hasOwn.call(o, k) ? (o[k] as Json) : dflt;
}
export const keys = (o: Obj): string[] => Object.keys(o);

export function getH<V>(m: ReadonlyMap<string, V> | { readonly [k: string]: V }, key: unknown): V | undefined {
  if (isList(key) || isObj(key)) throw new PyError("TypeError", `unhashable type: '${isList(key) ? "list" : "dict"}'`);
  if (!isStr(key)) return undefined;
  if (m instanceof Map) return m.get(key);
  return hasOwn.call(m, key) ? (m as { [k: string]: V })[key] : undefined;
}

export function T(v: unknown): boolean {
  if (v === null || v === undefined || v === false) return false;
  if (v === true) return true;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v.length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (v instanceof Map || v instanceof Set) return v.size > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return Boolean(v);
}
export const or = <A, B>(a: A, b: B): A | B => (T(a) ? a : b);

export function pyEq(a: unknown, b: unknown): boolean {
  if (a === undefined) a = null;
  if (b === undefined) b = null;
  const na = typeof a === "number" || typeof a === "boolean", nb = typeof b === "number" || typeof b === "boolean";
  if (na && nb) return Number(a) === Number(b);
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === (b as unknown[]).length && a.every((x, i) => pyEq(x, (b as unknown[])[i]));
  const ka = Object.keys(a as object), kb = Object.keys(b as object);
  return ka.length === kb.length && ka.every((k) => hasOwn.call(b, k) && pyEq((a as Obj)[k], (b as Obj)[k]));
}
export const pyIn = (x: unknown, list: readonly unknown[]): boolean => list.some((y) => pyEq(x, y));

export function cmpStr(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; ) {
    const ca = a.codePointAt(i)!, cb = b.codePointAt(i)!;
    if (ca !== cb) return ca - cb;
    i += ca > 0xffff ? 2 : 1;
  }
  return a.length - b.length;
}
export const sortedStr = (xs: Iterable<string>): string[] => [...xs].sort(cmpStr);

export const WS = "\\t\\n\\v\\f\\r\\x1c-\\x1f \\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
const WS_RUN = new RegExp(`[${WS}]+`, "u");
const WS_EDGE = new RegExp(`^[${WS}]+|[${WS}]+$`, "gu");
export const pySplit = (s: string): string[] => s.split(WS_RUN).filter((w) => w.length > 0);
export const pyStrip = (s: string): string => s.replace(WS_EDGE, "");
export function stripChars(s: string, chars: string): string {
  let a = 0, b = s.length;
  while (a < b && chars.includes(s[a])) a++;
  while (b > a && chars.includes(s[b - 1])) b--;
  return s.slice(a, b);
}
export const count = (s: string, sub: string): number => s.split(sub).length - 1;
export const cpLen = (s: string): number => {
  let n = 0;
  for (const _ of s) n++;
  return n;
};

const W = "[\\p{L}\\p{N}_]";
export const WB = `(?:(?<=${W})(?!${W})|(?<!${W})(?=${W}))`;

const CATS: [string, RegExp][] = [["L", /\p{L}/u], ["M", /\p{M}/u], ["N", /\p{N}/u], ["P", /\p{P}/u], ["S", /\p{S}/u], ["Z", /\p{Z}/u]];
export function majorCategory(ch: string): string {
  for (const [c, re] of CATS) if (re.test(ch)) return c;
  return "C";
}
const NONPRINTABLE = /[\p{C}\p{Z}]/u;
const printable = (ch: string): boolean => ch === " " || !NONPRINTABLE.test(ch);

export function reprStr(s: string): string {
  const q = s.includes("'") && !s.includes('"') ? '"' : "'";
  let out = q;
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (ch === q || ch === "\\") out += "\\" + ch;
    else if (ch === "\t") out += "\\t";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (c < 0x20 || c === 0x7f) out += "\\x" + c.toString(16).padStart(2, "0");
    else if (c >= 0x7f && !printable(ch)) {
      out += c < 0x100 ? "\\x" + c.toString(16).padStart(2, "0") : c < 0x10000 ? "\\u" + c.toString(16).padStart(4, "0") : "\\U" + c.toString(16).padStart(8, "0");
    } else out += ch;
  }
  return out + q;
}

export function reprFloat(x: number): string {
  if (Number.isNaN(x)) return "nan";
  if (!Number.isFinite(x)) return x > 0 ? "inf" : "-inf";
  if (x === 0) return Object.is(x, -0) ? "-0.0" : "0.0";
  const [mant, e] = x.toExponential().split("e");
  const exp = Number(e), neg = mant.startsWith("-"), digits = mant.replace(/^-/, "").replace(".", "");
  let body: string;
  if (exp < -4 || exp >= 16) {
    body = digits[0] + (digits.length > 1 ? "." + digits.slice(1) : "") + "e" + (exp < 0 ? "-" : "+") + String(Math.abs(exp)).padStart(2, "0");
  } else if (exp < 0) {
    body = "0." + "0".repeat(-exp - 1) + digits;
  } else {
    const int = digits.slice(0, exp + 1).padEnd(exp + 1, "0"), frac = digits.slice(exp + 1);
    body = int + "." + (frac || "0");
  }
  return (neg ? "-" : "") + body;
}

export function strNum(x: number, float = false): string {
  if (!float && Number.isInteger(x) && Math.abs(x) < 1e21) return BigInt(x).toString();
  return reprFloat(x);
}

export function repr(v: unknown): string {
  if (v === null || v === undefined) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  if (typeof v === "number") return strNum(v);
  if (typeof v === "string") return reprStr(v);
  if (Array.isArray(v)) return "[" + v.map(repr).join(", ") + "]";
  if (typeof v === "object") return "{" + Object.entries(v).map(([k, x]) => reprStr(k) + ": " + repr(x)).join(", ") + "}";
  return String(v);
}
export const str = (v: unknown): string => (typeof v === "string" ? v : repr(v));
export const reprSorted = (xs: Iterable<string>): string => repr(sortedStr(xs));

function exactDecimal(x: number): { digits: string; exp: number } {
  const buf = new DataView(new ArrayBuffer(8));
  buf.setFloat64(0, Math.abs(x));
  const hi = buf.getUint32(0), lo = buf.getUint32(4);
  const bexp = (hi >>> 20) & 0x7ff;
  let mant = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  let e2: number;
  if (bexp === 0) e2 = -1074;
  else {
    mant |= 1n << 52n;
    e2 = bexp - 1075;
  }
  if (mant === 0n) return { digits: "0", exp: 0 };
  if (e2 >= 0) return { digits: (mant << BigInt(e2)).toString(), exp: 0 };
  return { digits: (mant * 5n ** BigInt(-e2)).toString(), exp: e2 };
}

export function fmtG(x: number): string {
  if (Number.isNaN(x)) return "nan";
  if (!Number.isFinite(x)) return x > 0 ? "inf" : "-inf";
  if (x === 0) return Object.is(x, -0) ? "-0" : "0";
  const P = 6, sign = x < 0 ? "-" : "";
  const { digits, exp } = exactDecimal(x);
  let d = digits.replace(/^0+/, "");
  let e10 = d.length - 1 + exp;
  if (d.length > P) {
    const head = BigInt(d.slice(0, P)), rest = d.slice(P), first = rest.charCodeAt(0) - 48;
    const tail = /[1-9]/.test(rest.slice(1));
    let r = head;
    if (first > 5 || (first === 5 && (tail || head % 2n === 1n))) r += 1n;
    let s = r.toString();
    if (s.length > P) {
      s = s.slice(0, P);
      e10 += 1;
    }
    d = s;
  }
  d = d.replace(/0+$/, "") || "0";
  if (e10 < -4 || e10 >= P) {
    return sign + d[0] + (d.length > 1 ? "." + d.slice(1) : "") + "e" + (e10 < 0 ? "-" : "+") + String(Math.abs(e10)).padStart(2, "0");
  }
  if (e10 < 0) return sign + "0." + "0".repeat(-e10 - 1) + d;
  const int = d.slice(0, e10 + 1).padEnd(e10 + 1, "0"), frac = d.slice(e10 + 1);
  return sign + int + (frac ? "." + frac : "");
}

export function pyFloat(s: string): number | null {
  const t = pyStrip(s);
  const digits = "[0-9](?:_?[0-9])*";
  const re = new RegExp(`^[+-]?(?:(?:${digits})(?:\\.(?:${digits})?)?|\\.${digits})(?:[eE][+-]?${digits})?$`);
  if (re.test(t)) return Number(t.replace(/_/g, ""));
  const m = /^([+-]?)(inf|infinity|nan)$/i.exec(t);
  if (m) return m[2].toLowerCase() === "nan" ? NaN : m[1] === "-" ? -Infinity : Infinity;
  return null;
}

export function minBy<X>(items: readonly X[], key: (x: X) => number): X {
  let best = items[0];
  for (const x of items.slice(1)) if (key(x) < key(best)) best = x;
  return best;
}
export const pyMax = (a: number, b: number): number => (b > a ? b : a);
export const pyMin = (a: number, b: number): number => (b < a ? b : a);
