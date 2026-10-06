export type FloatTest = (path: readonly (string | number)[], value: number) => boolean;

const ESCAPES: Record<string, string> = { '"': '\\"', "\\": "\\\\", "\b": "\\b", "\f": "\\f", "\n": "\\n", "\r": "\\r", "\t": "\\t" };

export function pyJsonString(s: string): string {
  return '"' + s.replace(/["\\\u0000-\u001f]/g, (c) => ESCAPES[c] ?? "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0")) + '"';
}

export function pyFloatRepr(x: number): string {
  if (Number.isNaN(x)) return "NaN";
  if (!Number.isFinite(x)) return x > 0 ? "Infinity" : "-Infinity";
  if (x === 0) return Object.is(x, -0) ? "-0.0" : "0.0";
  const [mant, expText] = Math.abs(x).toExponential().split("e");
  const digits = mant.replace(".", "");
  const exp = Number(expText);
  const sign = x < 0 ? "-" : "";
  const decpt = exp + 1;
  if (decpt <= -4 || decpt > 16) {
    const m = digits.length > 1 ? digits[0] + "." + digits.slice(1) : digits;
    return sign + m + "e" + (exp < 0 ? "-" : "+") + String(Math.abs(exp)).padStart(2, "0");
  }
  if (decpt <= 0) return sign + "0." + "0".repeat(-decpt) + digits;
  if (decpt >= digits.length) return sign + digits + "0".repeat(decpt - digits.length) + ".0";
  return sign + digits.slice(0, decpt) + "." + digits.slice(decpt);
}

export function pyRound3(x: number): number {
  if (!Number.isFinite(x) || x === 0) return x;
  const exact = Math.abs(x) < 1e21 ? Math.abs(x).toFixed(100) : null;
  if (exact) {
    const dot = exact.indexOf(".");
    const tail = exact.slice(dot + 4);
    if (/^50*$/.test(tail)) {
      const down = exact.slice(0, dot + 4);
      const last = Number(down[down.length - 1]);
      const v = last % 2 === 0 ? Number(down) : Number(Math.abs(x).toFixed(3));
      return x < 0 ? -v : v;
    }
  }
  const v = Number(Math.abs(x).toFixed(3));
  return x < 0 ? -v : v;
}

export function pyJson(value: unknown, floats: FloatTest = () => false, indent = 2): string {
  const pad = (n: number) => " ".repeat(indent * n);
  const walk = (v: unknown, path: (string | number)[], level: number): string => {
    if (v === null || v === undefined) return "null";
    if (v === true) return "true";
    if (v === false) return "false";
    if (typeof v === "number") return Number.isInteger(v) && !floats(path, v) ? String(v) : pyFloatRepr(v);
    if (typeof v === "string") return pyJsonString(v);
    if (Array.isArray(v)) {
      if (!v.length) return "[]";
      return "[\n" + v.map((x, i) => pad(level + 1) + walk(x, [...path, i], level + 1)).join(",\n") + "\n" + pad(level) + "]";
    }
    if (typeof v === "object") {
      const entries = Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined);
      if (!entries.length) return "{}";
      return "{\n" + entries.map(([k, x]) => pad(level + 1) + pyJsonString(k) + ": " + walk(x, [...path, k], level + 1)).join(",\n") + "\n" + pad(level) + "}";
    }
    throw new TypeError("pyJson: cannot write a " + typeof v);
  };
  return walk(value, [], 0);
}

export function pyJsonFile(value: unknown, floats?: FloatTest): string {
  return pyJson(value, floats) + "\n";
}

export function floatPaths(patterns: readonly (readonly string[])[]): FloatTest {
  return (path) => patterns.some((p) => p.length === path.length && p.every((k, i) => k === "*" || k === String(path[i])));
}

export const SOURCE_FLOATS = floatPaths([["fps"]]);
export const PLAN_FLOATS = floatPaths([["words", "*", "start"], ["words", "*", "end"]]);
export const SCENES_FLOATS = floatPaths([["*", "seconds"], ["*", "words", "*", "start"], ["*", "words", "*", "end"]]);
export const FILM_FLOATS = floatPaths([["*", "seconds"]]);
