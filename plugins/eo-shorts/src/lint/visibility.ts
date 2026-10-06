import { AT_FRAMES, type PyNum, type ScreenWord, type Transcript } from "./anchors.ts";
import { fontDraws, type GlyphTable } from "./glyphs.ts";
import {
  PyError, T, fmtG, get, getH, has, isList, isObj, isStr, majorCategory, minBy, or, pyEq, pyIn, pyMax, pyMin, pySplit, str, strNum,
  type Json, type Obj,
} from "./py.ts";

const TOKEN_FALLBACK: Readonly<Record<string, string>> = { accentSoft: "accent", accentDeep: "accent", floodAlt: "flood", discAccent: "accent" };
const BLANK_GLYPHS = new Set<number>([0x115f, 0x1160, 0x17b4, 0x17b5, 0x2800, 0x3164, 0xffa0, 0x16fe4, 0x034f]);
for (let c = 0x180b; c < 0x1810; c++) BLANK_GLYPHS.add(c);
for (let c = 0xfe00; c < 0xfe10; c++) BLANK_GLYPHS.add(c);
for (let c = 0xe0100; c < 0xe01f0; c++) BLANK_GLYPHS.add(c);
const PRESET: Readonly<Record<string, Obj>> = {
  fade: { fadeFrames: 2 }, "blur-rise": { dir: "up", distanceXH: 0.4, moveFrames: 4.8, fadeFrames: 4.8 },
  "blur-rise-short": { dir: "up", distanceXH: 0.13, moveFrames: 4, fadeFrames: 4 },
  rise: { dir: "up", distanceXH: 0.3, moveFrames: 3, fadeFrames: 2 },
  "slide-up": { dir: "up", distanceXH: 0.3, moveFrames: 3, fadeFrames: 0 },
  "blur-in": { fadeFrames: 4 }, "rack-focus": { fadeFrames: 5 },
};
const FLICKER_TICKS = 7;
const REACH_IN_FRAMES = 18;
export const SAME_COLOUR = 8;

export type Style = Obj;

export const isAnchor = (a: unknown): a is Obj =>
  isObj(a) && has(a, "word") && Object.keys(a).every((k) => k === "word" || k === "at");

export function pageIds(p: Obj, key = "items"): Json[] {
  if (key === "items" && T(get(p, "groups")) && !T(get(p, "items"))) {
    const out: Json[] = [];
    for (const g of iter(get(p, "groups"))) if (isObj(g)) out.push(...iter(or(get(g, "items"), [])));
    return out;
  }
  return iter(or(get(p, key), []));
}

export function iter(v: unknown): Json[] {
  if (isList(v)) return v;
  if (isObj(v)) return Object.keys(v);
  if (isStr(v)) return [...v];
  if (v === null || v === undefined) throw new PyError("TypeError", "'NoneType' object is not iterable");
  throw new PyError("TypeError", `'${typeof v}' object is not iterable`);
}

export function shows(itemId: Json, p: Obj): boolean {
  const ids = ["items", "left", "right", "under"].flatMap((k) => pageIds(p, k));
  return pyIn(itemId, ids) || pyEq(get(p, "hero"), itemId);
}

const capitalize = (w: string): string => {
  const cs = [...w];
  return cs.length ? cs[0].toUpperCase() + cs.slice(1).join("").toLowerCase() : "";
};

export function palette(token: unknown, style: Style): Json {
  let key = str(token).split("-").map((w, i) => (i ? capitalize(w) : w)).join("");
  const colors = style.colors as Obj;
  while (!has(colors, key) && has(TOKEN_FALLBACK, key)) key = TOKEN_FALLBACK[key];
  return get(colors, key);
}

const need = (o: unknown, k: string): Json => {
  if (!isObj(o)) throw new PyError("TypeError", `subscript of ${str(o)}`);
  if (!has(o, k)) throw new PyError("KeyError", k);
  return o[k];
};

export function look(c: Obj, style: Style): [Json, Json, Json] {
  const fonts = need(style, "fonts") as Obj, role = get(c, "role"), weight = get(c, "weight");
  const serif = (): [Json, Json] => {
    const light = get(fonts, "serifItalicLight"), sf = need(fonts, "serifItalic") as Obj;
    if (T(light)) {
      if (!isObj(light)) throw new PyError("TypeError", "serifItalicLight");
      if (pyIn(weight, iter(get(light, "forWeights", ["light"])))) return ["serifItalicLight", need(light, "weight")];
    }
    const step = getH({ regular: "regularWeight", light: "regularWeight", bold: "boldWeight" }, weight);
    const w = step === undefined ? null : get(sf, step);
    return ["serifItalic", T(w) ? w : need(sf, "weight")];
  };
  let face: [Json, Json];
  if (role === "caption") {
    const cap = need(style, "caption") as Obj;
    face = get(c, "face") === "serif-italic" ? serif() : [need(cap, "face"), weight === "bold" ? get(cap, "boldWeight", 700) : need(cap, "weight")];
  } else if (role === "key" || role === "number" || T(get(c, "face"))) {
    const own = get(c, "face");
    const named = T(own) ? own : role === "number" || need(need(style, "type"), "keyFace") !== "serifItalic" ? "sans-heavy" : "serif-italic";
    if (named === "serif-italic") face = serif();
    else {
      const heavy = has(fonts, "sansHeavy") ? "sansHeavy" : "sans";
      const hf = need(fonts, heavy) as Obj, sans = need(fonts, "sans") as Obj;
      const steps: Obj = {
        light: get(hf, "lightWeight", 300), regular: get(hf, "regularWeight", need(sans, "leadWeight")),
        bold: get(hf, "boldWeight", 700), black: get(hf, "heavyWeight", need(sans, "heavyWeight")),
      };
      const w = getH(steps, or(weight, "black"));
      if (w === undefined) throw new PyError("KeyError", str(or(weight, "black")));
      face = [heavy, w];
    }
  } else {
    face = ["sans", weight === "bold" ? 600 : weight === "light" ? 300 : need(need(fonts, "sans"), "leadWeight")];
  }
  const colour = or(get(c, "colour"), role === "key" ? "accent" : "ink");
  return [face[0], face[1], or(palette(colour, style), colour)];
}

export function emphasisLook(c: Obj): Obj {
  const e = get(c, "emphasis");
  if (isObj(e) && T(e)) return { ...c, ...e };
  return Object.fromEntries(Object.entries(c).filter(([k]) => k !== "face" && k !== "weight" && k !== "colour"));
}

export function starredWords(line: string): [string, boolean][] {
  const out: [string, boolean][] = [];
  let starred = false;
  for (const w of pySplit(line.replaceAll("[", "").replaceAll("]", ""))) {
    const on: boolean = starred || w.startsWith("*");
    starred = on && !([...w].length > 1 && w.endsWith("*")) && w !== "*";
    out.push([w.replaceAll("*", ""), on]);
  }
  return out;
}

export function entranceOf(itemId: Json, role: Json, plan: Obj, style: Style): Json {
  const e = getH(or(get(plan, "entrances"), {}) as Obj, itemId);
  if (isStr(e) && e) return e;
  const t = need(style, "timing") as Obj;
  if (role === "caption") return get(or(get(t, "caption"), {}) as Obj, "entrance", "pop");
  return need(need(t, role === "key" || role === "number" ? role : "lead"), "entrance");
}

export function settleFrames(kind: Json, roleIn: Json, enterIn: Json, style: Style): number {
  const role = isStr(roleIn) ? roleIn : null;
  if (kind === "present") return 0;
  if (kind === "flicker-on") {
    const cadence = or(get(style, "cadence"), {}) as Obj;
    return FLICKER_TICKS * (T(get(cadence, "fps")) ? (need(style, "fps") as number) / (need(cadence, "fps") as number) : 1);
  }
  if (kind === "typewriter") return get(or(get(need(style, "timing") as Obj, "typewriter"), {}) as Obj, "settleFrames", 0) as number;
  const enter = (isObj(enterIn) ? enterIn : {}) as Obj;
  if (!(isStr(kind) && has(PRESET, kind)) && !(T(enter) && (kind === "pop" || kind === "count-up"))) return 0;
  const s = or(get(style, "entrance"), {}) as Obj;
  const film = or(getH(or(get(s, "presets"), {}) as Obj, kind) ?? null, {}) as Obj;
  const p: Obj = { ...(isStr(kind) && has(PRESET, kind) ? PRESET[kind] : { fadeFrames: 0 }) };
  for (const [k, v] of Object.entries(film)) if (k !== "roles") p[k] = v;
  Object.assign(p, or(role === null ? null : get(or(get(film, "roles"), {}) as Obj, role), {}) as Obj);
  const steps = or(get(s, "steps"), {}) as Obj;
  const step = (scale: string, v: Json): Json => (isStr(v) ? or(getH(or(get(steps, scale), {}) as Obj, v) ?? null, 0) : 0);
  if (T(get(enter, "dir"))) {
    p.dir = enter.dir;
    p.distanceXH = or(get(p, "distanceXH"), step("distance", "short"));
    p.moveFrames = or(or(get(p, "moveFrames"), get(p, "fadeFrames")), step("move", "quick"));
  }
  for (const [f, scale, key] of [["distance", "distance", "distanceXH"], ["move", "move", "moveFrames"], ["fade", "fade", "fadeFrames"]]) {
    if (T(get(enter, f))) p[key] = step(scale, enter[f]);
  }
  const dir = get(p, "dir");
  const moves = !(dir === null || dir === "none") && T(get(p, "moveFrames")) && T(get(p, "distanceXH"));
  return pyMax(or(get(p, "fadeFrames"), 0) as number, moves ? (p.moveFrames as number) : 0);
}

export type Why = [string, Json];
export type Span = {
  kind: "copy" | "picture"; entrance: Json; enters: number; last: number; settled: number; said: number | null;
  gone: number; goneFloat: boolean; why: Why;
};
type End = { at: number; float: boolean; why: Why };

export function byId(items: Obj[]): Map<Json, Obj> {
  const m = new Map<Json, Obj>();
  for (const c of items) {
    const id = get(c, "id");
    if (isList(id) || isObj(id)) throw new PyError("TypeError", "unhashable type");
    m.set(id, c);
  }
  return m;
}

export function spans(plan: Obj, spoken: Transcript, style: Style): Map<Json, Span> {
  const pages = (iter(or(get(plan, "pages"), [])).filter(isObj)) as Obj[], n = get(plan, "durationFrames");
  const out = new Map<Json, Span>();
  if (!(typeof n === "number" && Number.isInteger(n)) || !pages.length) return out;
  const starts: (number | null)[] = [0, ...pages.slice(1).map((p) => (isAnchor(get(p, "start")) ? spoken.anchor(get(p, "start")) : null))];
  if (starts.includes(null)) return out;
  const st = starts as number[];
  const timing = need(style, "timing") as Obj;
  const overlap = get(timing, "pageOverlapFrames", 2) as number;
  const ending = get(plan, "ending");
  const cut = ending === "clear" ? n - 2 : ending === "cut-to-black" ? n - 1 : n;
  const ends = pages.map((_, k) => (k + 1 < pages.length ? st[k + 1] + (get(pages[k + 1], "handoff") === "overlap" ? overlap : 0) : cut));
  const copy = byId((iter(or(get(plan, "copy"), [])).filter((c) => isObj(c) && isList(get(c, "lines")))) as Obj[]);
  const entrances = or(get(plan, "entrances"), {}) as Obj;

  const offset = (c: Obj): Json => {
    if (getH(entrances, get(c, "id")) === "typewriter") return get(or(get(timing, "typewriter"), {}) as Obj, "offsetFrames", 0);
    const r = get(c, "role"), role = r === "caption" || r === "key" || r === "number" ? r : "lead";
    return get(or(get(timing, role), {}) as Obj, "offsetFrames", 0);
  };
  const firstOnset = (c: Obj | null): PyNum | null => {
    const o = c !== null && T(c) ? spoken.onsetN(c) : null;
    return o !== null && Number.isFinite(o.v) ? o : null;
  };
  const goneOf = (item: Obj, k1: number, extra: End[] = []): End => {
    const endsBy: End[] = [{ at: ends[k1], float: false, why: k1 < pages.length - 1 ? ["page", null] : ["scene", null] }];
    const e = get(item, "exit");
    if (isAnchor(e)) {
      const a = spoken.anchor(e);
      if (a !== null && a < cut) endsBy.push({ at: a, float: false, why: ["exit", null] });
    }
    return minBy([...endsBy, ...extra], (x) => x.at);
  };
  const replacedBy = (cid: Json, k1: number): End[] => {
    const p = pages[k1], block = get(p, "block");
    if (block !== "cards" && !(block === "captions" && get(p, "mode", "replace") === "replace")) return [];
    const ids = pageIds(p).filter((i) => {
      if (isList(i) || isObj(i)) throw new PyError("TypeError", "unhashable type");
      return copy.has(i);
    });
    const at = ids.findIndex((i) => pyEq(i, cid));
    const nxt = at >= 0 && at + 1 < ids.length ? copy.get(ids[at + 1])! : null;
    const o = firstOnset(nxt);
    if (o === null || nxt === null) return [];
    const off = offset(nxt) as number;
    return [{ at: o.v + off, float: o.float || !Number.isInteger(off), why: [block === "cards" ? "card" : "caption group", get(nxt, "id")] }];
  };

  for (const [cid, c] of copy) {
    const on = pages.flatMap((p, k) => (shows(cid, p) ? [k] : []));
    const words = spoken.order().filter((w) => pyEq(w.id, cid));
    if (!on.length || !words.length) continue;
    const k0 = on[0], k1 = on[on.length - 1], kind = entranceOf(cid, get(c, "role"), plan, style);
    const p0 = st[k0];
    const firstGroup = pyEq(pageIds(pages[k0]).slice(0, 1), [cid]) && get(pages[k0], "block") === "captions";
    const enters = (w: ScreenWord): number | null => {
      if (kind === "present") return p0;
      const o = spoken.onset(c, w.li, w.wi);
      if (o === null || !Number.isFinite(o)) return null;
      if (get(c, "role") === "caption" && T(get(or(get(timing, "caption"), {}) as Obj, "firstOnPageStart")) && firstGroup && o <= p0) return p0;
      return pyMin(pyMax(p0, o + (offset(c) as number)), (n as number) - 2);
    };
    const times = words.map(enters);
    if (times.includes(null)) continue;
    const ts = times as number[];
    const gone = goneOf(c, k1, replacedBy(cid, k1));
    const said = words.filter((w) => !w.unspoken).map((w) => w.end!);
    const first = ts.reduce((a, b) => (b < a ? b : a)), last = ts.reduce((a, b) => (b > a ? b : a));
    out.set(cid, {
      kind: "copy", entrance: kind, enters: first, last, gone: gone.at, goneFloat: gone.float, why: gone.why,
      settled: first + settleFrames(kind, get(c, "role"), get(c, "enter"), style),
      said: said.length ? said.reduce((a, b) => (b > a ? b : a)) : null,
    });
  }
  for (const a of iter(or(get(plan, "assets"), []))) {
    if (!isObj(a)) continue;
    const aid = get(a, "id");
    const on = pages.flatMap((p, k) => (shows(aid, p) ? [k] : []));
    if (!on.length) continue;
    const k0 = on[0];
    let k1 = on[0];
    while (on.includes(k1 + 1)) k1 += 1;
    const reach = str(get(a, "role", "")).startsWith("reach-in");
    const kind = reach ? "pop" : entranceOf(aid, "asset", plan, style);
    let land: number | null = kind === "present" ? st[k0] : isStr(get(a, "anchorWord")) ? spoken.frame(a.anchorWord, get(a, "at", "start")) : null;
    if (land === null) {
      let key: Obj | null = null;
      outer: for (const k of ["items", "under", "left", "right"]) {
        for (const i of pageIds(pages[k0], k)) {
          if (isList(i) || isObj(i)) throw new PyError("TypeError", "unhashable type");
          if (get(copy.get(i) ?? {}, "role") === "key") { key = copy.get(i)!; break outer; }
        }
      }
      const o = firstOnset(key);
      land = o === null ? st[k0] : pyMax(st[k0], o.v - 2);
    }
    const first = pyMax(st[k0], land);
    const gone = goneOf(a, k1);
    out.set(aid, {
      kind: "picture", entrance: kind, enters: first, last: first, gone: gone.at, goneFloat: gone.float, why: gone.why, said: null,
      settled: first + (reach ? REACH_IN_FRAMES : settleFrames(kind, "asset", get(a, "enter"), style)),
    });
  }
  return out;
}

const causeOf = (s: Span): string => {
  const [what, other] = s.why;
  return what === "exit" ? "its exit cuts it" : what === "page" ? "its page ends" : what === "scene" ? "the scene ends" : `the next ${what} (${str(other)}) replaces it`;
};

export function shownErrors(plan: Obj, spoken: Transcript, style: Style): string[] {
  const errs: string[] = [], hold = get(need(style, "timing") as Obj, "minHoldFrames", 0) as number;
  for (const [i, s] of spans(plan, spoken, style)) {
    const copy = s.kind === "copy";
    const at = `${copy ? "copy" : "assets"}.${str(i)}`, cause = causeOf(s), gone = s.gone, settled = s.settled;
    const goneS = strNum(gone, s.goneFloat);
    const takes = copy ? "its words still take their spoken times from the items around it"
      : "it still takes its place in the layout, so the items around it move for nothing";
    if (gone <= s.enters) {
      if (copy && s.why[0] === "exit") {
        errs.push(`${at}: exits on frame ${goneS}, at or before it enters (frame ${fmtG(s.enters)}), so it never shows; ${takes}` +
          " (time those with stagger or timing)");
      } else if (copy && s.why[0] === "page") {
        errs.push(`${at}: it would enter on frame ${fmtG(s.enters)}, after its page ends (frame ${goneS}), so it never shows;` +
          " put it on the page where it is spoken");
      } else {
        errs.push(`${at}: it would ${copy ? "enter" : "land"} on frame ${fmtG(s.enters)}, but ${cause} on frame ${goneS},` +
          ` so it never shows; ${takes}`);
      }
    } else if (s.why[0] === "scene") continue;
    else if (gone <= settled) {
      errs.push(`${at}: its ${str(s.entrance)} entrance settles on frame ${fmtG(settled)}, but ${cause} on frame ${goneS}: it never shows` +
        ` in full, and ${takes} (a quicker entrance, an earlier word, or a later exit or page)`);
    } else if (copy && s.last >= gone) {
      errs.push(`${at}: its last words would enter on frame ${fmtG(s.last)}, but ${cause} on frame ${goneS}: they never show,` +
        " yet take their spoken times from the items around them (show them on the item that follows)");
    } else if (gone - settled < hold && !(copy && s.said !== null && gone >= s.said - AT_FRAMES)) {
      const until = copy && s.said !== null ? ` and before its last word is said (frame ${strNum(s.said)})` : "";
      errs.push(`${at}: ${cause} on frame ${goneS}, ${fmtG(gone - settled)} frames after its entrance settles (frame ${fmtG(settled)})${until},` +
        ` so it barely shows while ${takes}; ${copy ? "copy" : "a picture"} holds at least ${fmtG(hold)} frames once in` +
        (copy ? ", or until its words are said (a card or caption group the next one replaces too)" : ""));
    }
  }
  return errs;
}

export function unseen(line: string): string[] {
  const out: string[] = [];
  let base = "";
  for (const ch of line) {
    const cat = majorCategory(ch);
    const ink = !BLANK_GLYPHS.has(ch.codePointAt(0)!) && ("LNPS".includes(cat) || (cat === "M" && base === "L"));
    if (ch !== " " && !ink) out.push(ch);
    if (cat !== "M") base = ch !== " " ? cat : "";
  }
  return out;
}

export function drawn(ch: string, face: Json, weight: Json, style: Style, glyphs: GlyphTable): boolean | null {
  const f = or(getH(need(style, "fonts") as Obj, face) ?? null, {}) as Obj;
  const files = or(get(f, "files"), {}) as Obj;
  const rel = or(or(get(files, str(weight)), get(f, "path")), Object.values(files)[0] ?? null);
  if (T(get(f, "system")) || !T(rel)) return true;
  const font = Object.prototype.hasOwnProperty.call(glyphs, str(rel)) ? glyphs[str(rel)] : undefined;
  if (!font) throw new Error(`the glyph table has no ${str(rel)} (rebuild it: node tools/glyph-table.mjs)`);
  return fontDraws(font, ch.codePointAt(0)!);
}

const hex4 = (ch: string): string => "U+" + ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0");

export function inkErrors(plan: Obj, style: Style, glyphs: GlyphTable): string[] {
  const errs: string[] = [];
  for (const c of iter(or(get(plan, "copy"), []))) {
    if (!isObj(c) || !isList(get(c, "lines"))) continue;
    let looks: Record<"false" | "true", [Json, Json]>;
    try {
      const a = look(c, style), b = look(emphasisLook(c), style);
      looks = { false: [a[0], a[1]], true: [b[0], b[1]] };
    } catch (e) {
      if (e instanceof PyError) continue;
      throw e;
    }
    for (const line of c.lines as Json[]) {
      if (!isStr(line)) continue;
      const skip = new Set(unseen(line)), missing = new Map<string, Set<string>>(), blank = new Map<string, Set<string>>();
      for (const [word, starred] of starredWords(line)) {
        const [face, weight] = looks[starred ? "true" : "false"];
        for (const ch of word.normalize("NFC")) {
          if (skip.has(ch)) continue;
          const ok = drawn(ch, face, weight, style, glyphs);
          const into = ok === null ? missing : !ok ? blank : null;
          if (into) {
            const k = str(face);
            if (!into.has(k)) into.set(k, new Set());
            into.get(k)!.add(ch);
          }
        }
      }
      const codes = (chars: Set<string>) => [...chars].sort((x, y) => x.codePointAt(0)! - y.codePointAt(0)!).map(hex4).join(", ");
      for (const [face, chars] of missing) {
        errs.push(`copy.${str(get(c, "id"))}: '${line}' has characters the film's ${face} font has no glyph for (${codes(chars)}):` +
          " they would be set in another font (write letters, figures and punctuation the film's fonts draw)");
      }
      for (const [face, chars] of blank) {
        errs.push(`copy.${str(get(c, "id"))}: '${line}' has characters the film's ${face} font draws blank (${codes(chars)}):` +
          " lines are placed by align, keyAlign or groups, and words are parted by one plain space");
      }
    }
  }
  return errs;
}

function lab(hexColour: string): [number, number, number] {
  const h = hexColour.replace(/^#+/, "");
  const rgb = [0, 2, 4].map((i) => {
    const v = Number.parseInt(h.slice(i, i + 2), 16);
    if (!/^[0-9a-fA-F]{1,2}$/.test(h.slice(i, i + 2).trim())) throw new PyError("ValueError", `invalid literal for int() with base 16: ${h.slice(i, i + 2)}`);
    return v / 255;
  });
  const [r, g, b] = rgb.map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  const xyz = [(0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, 0.2126 * r + 0.7152 * g + 0.0722 * b, (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883];
  const [fx, fy, fz] = xyz.map((t) => (t > 0.008856 ? t ** (1 / 3) : 7.787 * t + 16 / 116));
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function colourDifference(a: string, b: string): number {
  const x = lab(a), y = lab(b);
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

function groundColour(ground: Json, style: Style): Json {
  if (ground === "white") return get(style.colors as Obj, "white", "#FFFFFF");
  return palette(ground, style);
}

function textColour(c: Obj, ground: Json, onFootage: boolean, style: Style): Json {
  const C = need(style, "colors") as Obj, colour = get(c, "colour");
  if (get(c, "role") === "caption") {
    return T(colour) && colour !== "ink" ? palette(colour, style) : onFootage ? get(C, "caption", "#FFFFFF") : need(C, "ink");
  }
  if (colour === "money") return need(C, "money");
  if (ground === "flood" || ground === "flood-alt") return get(c, "role") === "key" ? need(C, "accentOnFlood") : need(C, "reversed");
  if (T(colour)) return palette(colour, style);
  return get(c, "role") === "key" ? need(C, "accent") : need(C, "ink");
}

type Ground = [number, Json, boolean];

function groundsOf(plan: Obj, spoken: Transcript, style: Style): Ground[] {
  const pages = iter(or(get(plan, "pages"), [])).filter(isObj) as Obj[], timing = need(style, "timing") as Obj;
  const copy = byId(iter(or(get(plan, "copy"), [])).filter(isObj) as Obj[]);
  const starts = [0, ...pages.slice(1).map((p) => (isAnchor(get(p, "start")) ? spoken.anchor(get(p, "start")) : null))];
  const out: Ground[] = [];
  pages.forEach((p, k) => { if (starts[k] !== null) out.push([starts[k]!, or(get(p, "ground"), "paper"), true]); });
  const entrances = or(get(plan, "entrances"), {}) as Obj;
  const entry = (c: Obj): number | null => {
    const o = spoken.onset(c);
    if (o === null || !Number.isFinite(o)) return null;
    const kind = getH(entrances, get(c, "id")), r = get(c, "role");
    const role = kind === "typewriter" ? "typewriter" : r === "caption" || r === "key" || r === "number" ? r : "lead";
    return o + (get(or(get(timing, role), {}) as Obj, "offsetFrames", 0) as number);
  };
  const deferred: Obj[] = [];
  for (const b of iter(or(get(plan, "beats"), []))) {
    if (!isObj(b) || !isStr(get(b, "ground"))) continue;
    if (get(b, "with") === "key-entrance") { deferred.push(b); continue; }
    const f = isStr(get(b, "onWord")) ? spoken.frame(b.onWord, or(get(b, "at"), "start")) : null;
    if (f !== null) {
      out.push([pyMax(0, f + (T(get(b, "at")) ? 0 : (get(timing, "groundFlipOffsetFrames", 0) as number))), b.ground, get(b, "textOnFlip") !== "keep"]);
    }
  }
  pages.forEach((p, k) => {
    const grounds = get(p, "cardGrounds");
    if (get(p, "block") === "cards" && isList(grounds) && starts[k] !== null) {
      pageIds(p).forEach((cid, j) => {
        const g = j < grounds.length ? grounds[j] : null;
        if (T(j) && T(g) && (isList(cid) || isObj(cid))) throw new PyError("TypeError", "unhashable type");
        const t = T(j) && T(g) && copy.has(cid) ? entry(copy.get(cid)!) : null;
        if (t !== null) out.push([pyMax(starts[k]!, t), g, true]);
      });
    }
  });
  const keys = [...copy.values()].filter((c) => get(c, "role") === "key" && isList(get(c, "lines")));
  for (const b of deferred) {
    const word = str(get(b, "onWord", "")).split("#")[0].toLowerCase();
    const shown = (c: Obj) => (c.lines as Json[]).map(str).join(" ").replace(/[[\]*]/g, "").toLowerCase();
    const key = keys.find((c) => !T(get(b, "onWord")) || shown(c).includes(word)) ?? (keys.length ? keys[0] : null);
    const t = key !== null && T(key) ? entry(key) : null;
    if (t !== null) out.push([pyMax(0, t), b.ground, get(b, "textOnFlip") !== "keep"]);
  }
  return out.map((g, i) => [g, i] as const).sort((x, y) => x[0][0] - y[0][0] || x[1] - y[1]).map(([g]) => g);
}

function footageOf(plan: Obj, spoken: Transcript): [number, number][] {
  const shots = iter(or(get(plan, "shots"), [])).filter(isObj) as Obj[];
  const cuts = shots.map((s, k) => [or(isAnchor(get(s, "from")) ? spoken.anchor(get(s, "from")) : null, 0) as number, k] as const)
    .sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const n = or(get(plan, "durationFrames"), 0) as number;
  const out: [number, number][] = [];
  cuts.forEach(([f, k], i) => {
    if (get(shots[k], "layout") !== "inset") out.push([i === 0 ? 0 : pyMax(0, f), i + 1 < cuts.length ? cuts[i + 1][0] : n]);
  });
  return out;
}

export function colourErrors(plan: Obj, spoken: Transcript, style: Style): string[] {
  const errs: string[] = [], grounds = groundsOf(plan, spoken, style), footage = footageOf(plan, spoken);
  if (!grounds.length) return errs;
  const onFootage = (f: number) => footage.some(([a, b]) => a <= f && f < b);
  const groundAt = (f: number): Ground => {
    if (!(grounds[0][0] <= f)) return grounds[0];
    const at = grounds.filter((g) => g[0] <= f);
    return at[at.length - 1];
  };
  const copy = byId(iter(or(get(plan, "copy"), [])).filter(isObj) as Obj[]);
  for (const [cid, s] of spans(plan, spoken, style)) {
    if (s.kind !== "copy" || s.gone <= s.enters) continue;
    const c = copy.get(cid)!, a = s.enters, b = s.gone;
    const starred = iter(or(get(c, "lines"), [])).some((line) => isStr(line) && starredWords(line).some(([, on]) => on));
    const keys = [a, ...grounds.filter((g) => a < g[0] && g[0] < b && g[2]).map((g) => g[0])];
    const cutSet = new Set<number>([a]);
    for (const g of grounds) if (a < g[0] && g[0] < b) cutSet.add(g[0]);
    for (const seg of footage) for (const f of seg) if (a < f && f < b) cutSet.add(f);
    const cuts = [...cutSet].sort((x, y) => x - y);
    const items: [Obj, string][] = [[c, ""], ...(starred ? [[emphasisLook(c), " (its starred words)"] as [Obj, string]] : [])];
    for (const [item, which] of items) {
      for (const f of cuts) {
        if (onFootage(f)) continue;
        const k = keys.filter((x) => x <= f).reduce((x, y) => (y > x ? y : x));
        const colour = textColour(item, groundAt(k)[1], onFootage(k), style), ground = groundAt(f)[1];
        const under = groundColour(ground, style);
        if (T(colour) && T(under) && colourDifference(colour as string, under as string) < SAME_COLOUR) {
          errs.push(`copy.${str(cid)}${which}: from frame ${fmtG(f)} it is drawn in nearly the colour of the ${str(ground)} ground under it,` +
            " so it shows nothing while it takes its row and spoken words (give it a colour that stands out on that ground)");
          break;
        }
      }
    }
  }
  return errs;
}
