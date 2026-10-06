import { PyError, T, WS, cpLen, get, isList, isObj, isStr, or, pyEq, pyFloat, str, type Json, type Obj } from "./py.ts";

export const NUMBER_WORDS: Readonly<Record<string, number>> = { hundred: 3, thousand: 4, million: 7, billion: 10, trillion: 13 };
const HYPHEN = /(?<=[A-Za-z0-9_])[-–—]+(?=[A-Za-z0-9_])/u;
export const AT = ["before", "start", "mid", "end", "after"] as const;
export const AT_FRAMES = 3;
const WS_RUN = new RegExp(`[${WS}]+`, "u");

export const norm = (s: unknown): string => str(s).toLowerCase().replace(/[^a-z0-9%$]/gu, "");
export const frameOf = (seconds: number, fps: number): number => Math.floor(seconds * fps + 0.5);

export function lev(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] !== b[j - 1] ? 1 : 0));
      prev = up;
    }
  }
  return row[b.length];
}

export function sim(a: unknown, b: unknown): number {
  const x = norm(a), y = norm(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const dx = x.replace(/\D/g, ""), dy = y.replace(/\D/g, "");
  if (dx && dx === dy) return 0.95;
  if (dx && Object.prototype.hasOwnProperty.call(NUMBER_WORDS, y) && dx.length === NUMBER_WORDS[y]) return 0.9;
  if ((x.length > 2 && y.startsWith(x)) || (y.length > 2 && x.startsWith(y))) return 0.8;
  const s = 1 - lev(x, y) / Math.max(x.length, y.length);
  return s >= 0.6 ? s : 0;
}

export type SpokenWord = Obj & { text: string; start: number; end: number; n: string };

export function spokenWords(words: Json): SpokenWord[] {
  const out: SpokenWord[] = [];
  for (const w of (or(words, []) as Obj[])) {
    const text = str(get(w, "text")), parts = text.split(HYPHEN);
    if (parts.length < 2) {
      out.push({ ...w, n: norm(text) } as SpokenWord);
      continue;
    }
    const start = get(w, "start") as number, end = get(w, "end") as number;
    const total = parts.reduce((a, x) => a + cpLen(x), 0);
    let t = start;
    for (const x of parts) {
      const d = ((end - start) * cpLen(x)) / total;
      out.push({ ...w, text: x, start: t, end: t + d, n: norm(x) } as SpokenWord);
      t += d;
    }
  }
  return out;
}

export const splitWords = (line: string): string[] => line.split(WS_RUN).filter((w) => w.length > 0);
export const screenWords = (line: string): string[] => splitWords(line.replace(/[[\]*]/g, ""));

export function units(lines: string[]): number[][] {
  let unit = -1, opened = false;
  const out: number[][] = [];
  for (const line of lines) {
    if (!isStr(line)) throw new PyError("TypeError", "expected string or bytes-like object");
    const row: number[] = [];
    for (const w of splitWords(line)) {
      const b = w.replaceAll("*", "");
      if (!opened || b.startsWith("[")) unit += 1;
      opened = (opened || b.startsWith("[")) && !b.endsWith("]");
      row.push(unit);
    }
    out.push(row);
  }
  return out;
}

export type ScreenWord = { id: Json; li: number; wi: number; text: string; onset?: number; end?: number; unspoken?: boolean };
export type Timing = Obj;

export type PyNum = { v: number; float: boolean };
const isF = (x: unknown): boolean => typeof x === "number" && !Number.isInteger(x);
const N = (v: number, float = false): PyNum => ({ v, float });
const add = (a: PyNum, b: PyNum): PyNum => N(a.v + b.v, a.float || b.float);
const mul = (a: PyNum, b: PyNum): PyNum => N(a.v * b.v, a.float || b.float);

export class Transcript {
  readonly fps: number;
  readonly plan: Obj;
  readonly timing: Obj;
  readonly spoken: SpokenWord[];
  private _order: ScreenWord[] | null = null;

  constructor(plan: Obj, fps: number, timing: Json = null) {
    this.fps = fps;
    this.plan = plan;
    this.timing = (or(timing, {}) as Obj);
    this.spoken = spokenWords(get(plan, "words"));
  }

  word(spec: unknown): SpokenWord | null {
    const parts = str(spec).split("#");
    const word = parts[0], nth = parts.length > 1 ? parts[1] : "";
    let n = 1;
    if (nthStrip(nth) !== "") {
      const f = pyFloat(nthStrip(nth));
      if (f === null) return null;
      n = f;
    }
    const exact = this.spoken.filter((w) => w.n === norm(word));
    const pool = exact.length >= n ? exact : this.spoken.filter((w) => sim(w.text, word) >= 0.8);
    return Number.isFinite(n) && n === Math.trunc(n) && 1 <= n && n <= pool.length ? pool[n - 1] : null;
  }

  frame(spec: unknown, at: unknown = "start"): number | null {
    const w = this.word(spec);
    if (w === null) return null;
    const s0 = frameOf(w.start, this.fps), e0 = frameOf(w.end, this.fps);
    const key = isStr(at) ? at : "start";
    switch (key) {
      case "before": return s0 - AT_FRAMES;
      case "mid": return frameOf((w.start + w.end) / 2, this.fps);
      case "end": return e0;
      case "after": return e0 + AT_FRAMES;
      default: return s0;
    }
  }

  anchor(a: unknown, dflt: number | null = null): number | null {
    if (a === "scene-start") return 0;
    if (a === "scene-end") return (get(this.plan, "durationFrames", 1) as number) - 1;
    if (isObj(a) && Object.prototype.hasOwnProperty.call(a, "word")) return this.frame(get(a, "word"), get(a, "at", "start"));
    return dflt;
  }

  order(): ScreenWord[] {
    if (this._order !== null) return this._order;
    const A: ScreenWord[] = [];
    for (const c of (or(get(this.plan, "copy"), []) as Json[])) {
      const lines = isObj(c) ? get(c, "lines") : null;
      if (!isObj(c) || !isList(lines)) continue;
      lines.forEach((line, li) => {
        if (isStr(line)) screenWords(line).forEach((w, wi) => A.push({ id: get(c, "id"), li, wi, text: w }));
      });
    }
    const B = this.spoken, n = A.length, m = B.length;
    const S = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
    const P = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1));
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const s = sim(A[i - 1].text, B[j - 1].text);
        let best0 = S[i - 1][j], best1 = 1;
        const left = S[i][j - 1];
        if (left > best0) { best0 = left; best1 = 2; }
        const diag = s > 0 ? S[i - 1][j - 1] + s : -1;
        if (diag > best0) { best0 = diag; best1 = 3; }
        S[i][j] = best0;
        P[i][j] = best1;
      }
    }
    let i = n, j = m;
    while (i > 0 && j > 0) {
      if (P[i][j] === 3) {
        A[i - 1].onset = frameOf(B[j - 1].start, this.fps);
        A[i - 1].end = frameOf(B[j - 1].end, this.fps);
        i -= 1; j -= 1;
      } else if (P[i][j] === 1) i -= 1;
      else j -= 1;
    }
    A.forEach((w, k) => {
      if (w.onset !== undefined) return;
      let prev: ScreenWord | undefined, nxt: ScreenWord | undefined;
      for (let x = k - 1; x >= 0; x--) if (A[x].onset !== undefined) { prev = A[x]; break; }
      for (let x = k + 1; x < A.length; x++) if (A[x].onset !== undefined) { nxt = A[x]; break; }
      w.onset = prev ? Math.min(prev.end!, nxt ? nxt.onset! - 1 : Infinity) : nxt ? Math.max(0, nxt.onset! - 2) : 0;
      w.end = w.onset + 4;
      w.unspoken = true;
    });
    this._order = A;
    return A;
  }

  onset(c: Obj, li = 0, wi = 0): number | null {
    const o = this.onsetN(c, li, wi);
    return o === null ? null : o.v;
  }

  onsetN(c: Obj, li = 0, wi = 0): PyNum | null {
    const id = get(c, "id"), words = this.order().filter((w) => pyEq(w.id, id));
    if (!words.length) return null;
    const t = (isObj(get(c, "timing")) ? get(c, "timing") : {}) as Obj;
    const anchor = T(get(t, "onWord")) ? this.frame(get(t, "onWord"), get(t, "at", "start")) : null;
    const nudgeKey = get(t, "nudge");
    if (isList(nudgeKey) || isObj(nudgeKey)) throw new PyError("TypeError", "unhashable type");
    const sign = nudgeKey === "earlier" ? -1 : nudgeKey === "later" ? 1 : 0;
    const nudgeFrames = or(get(this.timing, "nudgeFrames"), 2) as number;
    const nudge = N(sign * nudgeFrames, isF(nudgeFrames));
    const scope = or(get(c, "scope"), get(c, "role") === "caption" ? "item" : "word");
    const anchorN = anchor === null ? null : N(anchor);
    if (scope === "item") {
      return add(anchorN ?? N(minOf(words.map((w) => w.onset!))), nudge);
    }
    if (scope === "line") {
      const inLine = words.filter((w) => w.li === li).map((w) => w.onset!);
      return add(anchorN ?? N(inLine.length ? minOf(inLine) : Infinity, !inLine.length), nudge);
    }
    const u = units(get(c, "lines") as string[]);
    if (li >= u.length || wi >= u[li].length) return null;
    const unit = u[li][wi];
    const first = words.find((w) => {
      const row = u[w.li];
      if (row === undefined || w.wi >= row.length) throw new PyError("IndexError", "list index out of range");
      return row[w.wi] === unit;
    });
    if (first === undefined) throw new PyError("StopIteration", "no word of the unit");
    const stagger = or(get(this.timing, "stagger"), { floor: 3 }) as Obj;
    const sk = get(c, "stagger");
    const step = sk === "even" || sk === "tight" ? get(stagger, sk) : null;
    if (step !== null) {
      return add(add(anchorN ?? N(words[0].onset!), mul(N(step as number, isF(step)), N(unit))), nudge);
    }
    const floor = get(stagger, "floor") as number;
    if (anchorN !== null) {
      const spokenGap = N(first.onset! - words[0].onset!), floorGap = N(floor * unit, isF(floor));
      return add(add(anchorN, floorGap.v > spokenGap.v ? floorGap : spokenGap), nudge);
    }
    return add(N(first.onset!), nudge);
  }
}

const nthStrip = (s: string): string => s.replace(new RegExp(`^[${WS}]+|[${WS}]+$`, "gu"), "");
const minOf = (xs: number[]): number => xs.reduce((a, b) => (b < a ? b : a));
