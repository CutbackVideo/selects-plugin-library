import { Transcript, norm, screenWords } from "./anchors.ts";
import { GLYPH_TABLE } from "./glyphTable.ts";
import type { GlyphTable } from "./glyphs.ts";
import { objectErrors, pageErrors, pagePictures, shapeErrors } from "./objects.ts";
import { pictureErrors, shotErrors } from "./pictures.ts";
import {
  ASSET_ALL, ASSET_ENTER, COPY_ALL, COUNT, COUNT_ENUMS, EMPHASIS, ENTER, ENTRANCES, ENUMS, FIGURE, MOTION_ENUMS, NO_ENUMS, PAGE_ALL,
  SHOT_ALL, TOP, type Enums,
} from "./schema.ts";
import {
  PyError, T, WB, count, fmtG, get, getH, has, isList, isNum, isObj, isStr, keys, or, pyEq, pySplit, reprSorted, str, strNum, stripChars,
  type Json, type Obj,
} from "./py.ts";
import { colourErrors, inkErrors, isAnchor, iter, look, pageIds, shownErrors, type Style } from "./visibility.ts";

export type { GlyphTable, Style };
export type LintOptions = {
  styles: Readonly<Record<string, Style>>;
  glyphs?: GlyphTable;
};

const esc = (s: string): string => s.replace(/[\\^$.*+?()[\]{}|/]/g, "\\$&");
const BANNED_CACHE = new WeakMap<object, RegExp>();
export function bannedPattern(styles: Readonly<Record<string, Style>>): RegExp {
  let re = BANNED_CACHE.get(styles);
  if (re) return re;
  const names = new Set<string>();
  for (const film of Object.keys(styles).sort()) {
    const fonts = get(styles[film], "fonts", {});
    if (!isObj(fonts)) continue;
    for (const v of Object.values(fonts)) if (isObj(v) && T(get(v, "family"))) names.add(str(v.family));
  }
  const families = [...names].sort((a, b) => b.length - a.length);
  re = new RegExp(`${WB}(original|reference|referenc|match(es|ing)?|same as|like the clip|source video|eo${WB}|frame \\p{Nd}|px${WB}|pixel|` +
    `#[0-9a-f]{3,6}${WB}|rgb\\(|hex|` + families.map((f) => esc(f) + WB).join("|") + ")", "iu");
  BANNED_CACHE.set(styles, re);
  return re;
}

const MOTION_PATH = /\.motion\[\p{Nd}+\](?=\n?$)/u;
const COUNT_PATH = new RegExp(`^plan\\.copy\\[\\p{Nd}+\\]\\.count${WB}`, "u");

function enumsAt(path: string): Enums {
  if (path === "plan.entrances" || path === "plan.idle") return NO_ENUMS;
  if (path.endsWith(".enter")) return ENTER;
  if (MOTION_PATH.test(path)) return MOTION_ENUMS;
  if (COUNT_PATH.test(path)) return COUNT_ENUMS;
  if (path.startsWith("plan.copy[")) return COPY_ALL;
  if (path.startsWith("plan.pages[")) return PAGE_ALL;
  if (path.startsWith("plan.assets[")) return ASSET_ALL;
  if (path.startsWith("plan.shots[")) return SHOT_ALL;
  return ENUMS;
}

function countErrors(c: Obj, plan: Obj, counting: Set<Json>): string[] {
  const n = c.count;
  if (!isObj(n)) return ["write an object (from, direction, start, land, decimals)"];
  const errs = keys(n).filter((k) => !COUNT.has(k)).map((k) => `unknown key '${k}' (one of ${reprSorted(COUNT)})`);
  const figures: number[] = [];
  for (const line of iter(get(c, "lines", []))) {
    for (const w of pySplit(line as string)) {
      const m = FIGURE.exec(stripChars(w, "[]*"));
      if (m) figures.push(Number(m[1].replaceAll(",", "")));
    }
  }
  if (figures.length !== 1) errs.push(`the item shows ${figures.length} figures; a counting item shows exactly one (e.g. '$5,000', '3.5%')`);
  if (getH(or(get(plan, "entrances"), {}) as Obj, get(c, "id")) === "typewriter") errs.push("a typed item cannot count");
  const start = get(n, "from", "zero");
  if (start !== "zero" && !(isStr(start) && /[0-9]/.test(start))) {
    errs.push(`from '${str(start)}': write 'zero' or the figure it starts from as on screen (e.g. '90%')`);
  } else if (figures.length === 1) {
    const value = start === "zero" ? 0 : Number((start as string).match(/[0-9][0-9,]*(?:\.[0-9]+)?/)![0].replaceAll(",", "")), target = figures[0];
    if (has(n, "from") && value === target) errs.push(`from '${str(start)}' is the figure itself: nothing to count`);
    const direction = get(n, "direction");
    if (direction === "down" && !has(n, "from") && target === 0) errs.push("a count down to zero needs from");
    else if (T(direction) && has(n, "from") && (value < target) !== (direction === "up")) {
      errs.push(`from '${str(start)}' does not count ${str(direction)} to ${fmtG(figures[0])}`);
    }
  }
  for (const [end, scene] of [["start", "scene-start"], ["land", "scene-end"]]) {
    const a = get(n, end);
    if (a === null || a === scene) continue;
    if (isObj(a) && keys(a).length === 1 && has(a, "with")) {
      const w = a.with;
      if (!isStr(w) || w === get(c, "id") || !counting.has(w)) errs.push(`${end}.with '${str(w)}' is not another counting item`);
    } else if (!(isObj(a) && has(a, "word") && keys(a).every((k) => k === "word" || k === "at"))) {
      errs.push(`${end}: write {"word": ..., "at": ...}, {"with": id} or '${scene}'`);
    }
  }
  const gone = get(n, "land") === "scene-end" ? replaced(get(c, "id"), plan) : null;
  if (gone) errs.push(`land 'scene-end': a ${gone} replaces the item before the scene ends, so it would never land (land it on a word)`);
  return errs;
}

function replaced(cid: Json, plan: Obj): string | null {
  const pages = iter(or(get(plan, "pages"), [])) as Obj[];
  const on = pages.flatMap((p, i) => (["items", "left", "right", "under"].flatMap((k) => pageIds(p, k)).some((x) => pyEq(x, cid)) ? [i] : []));
  if (!on.length) return null;
  if (on[on.length - 1] < pages.length - 1) return "later page";
  const p = pages[pages.length - 1];
  const copy = new Set<Json>((iter(get(plan, "copy", [])) as Obj[]).map((c) => get(c, "id")));
  const shown = pageIds(p).filter((i) => copy.has(i));
  const last = shown[shown.length - 1];
  if (get(p, "block") === "cards" && last !== cid) return "later card";
  if (get(p, "block") === "captions" && get(p, "mode", "replace") === "replace" && last !== cid) return "later caption group";
  return null;
}

function anchorErrors(plan: Obj, spoken: Transcript): string[] {
  const errs: string[] = [];
  const word = (at: string, w: Json): void => {
    if (!isStr(w)) errs.push(`${at}: write the anchor word as text`);
    else if (spoken.word(w) === null) {
      const i = w.indexOf("#"), base = i < 0 ? w : w.slice(0, i), nth = i < 0 ? "" : w.slice(i + 1);
      const times = spoken.spoken.filter((x) => x.n === norm(base)).length;
      errs.push(`${at}: '${w}' is not spoken` + (nth && times ? ` (only ${times} '${base}' in the transcript)`
        : " (name a word of the transcript; 'word#2' for its second time)"));
    }
  };
  const anchor = (at: string, a: Json): void => { if (isAnchor(a)) word(at, a.word); };
  iter(or(get(plan, "pages"), [])).forEach((p, n) => { if (n && isObj(p)) anchor(`pages[${n}].start`, get(p, "start")); });
  for (const c of iter(or(get(plan, "copy"), [])) as Obj[]) {
    const at = `copy.${str(get(c, "id"))}`, t = get(c, "timing"), n = get(c, "count");
    if (isObj(t) && has(t, "onWord")) word(`${at}.timing.onWord`, t.onWord);
    anchor(`${at}.exit`, get(c, "exit"));
    for (const end of ["start", "land"]) anchor(`${at}.count.${end}`, isObj(n) ? get(n, end) : null);
  }
  for (const a of iter(or(get(plan, "assets"), [])) as Obj[]) {
    const at = `assets.${str(get(a, "id"))}`;
    if (has(a, "anchorWord")) word(`${at}.anchorWord`, a.anchorWord);
    anchor(`${at}.exit`, get(a, "exit"));
    const pieces = isList(get(a, "pieces")) ? (a.pieces as Json[]) : [];
    const moving: [string, Json][] = [[at, get(a, "motion")]];
    pieces.forEach((p, k) => { if (isObj(p)) moving.push([`${at}.pieces[${k}]`, get(p, "motion")]); });
    for (const [where, tracks] of moving) {
      (isList(tracks) ? tracks : []).forEach((m, k) => {
        for (const end of ["from", "to"]) anchor(`${where}.motion[${k}].${end}`, isObj(m) ? get(m, end) : null);
      });
    }
    pieces.forEach((p, k) => {
      if (!isObj(p)) return;
      anchor(`${at}.pieces[${k}].onset`, get(p, "onset"));
      anchor(`${at}.pieces[${k}].exit`, get(p, "exit"));
    });
  }
  const keyTexts = (iter(or(get(plan, "copy"), [])) as Obj[]).filter((c) => get(c, "role") === "key")
    .map((c) => screenWords((iter(or(get(c, "lines"), [])) as string[]).join(" ")).join(" ").toLowerCase());
  iter(or(get(plan, "beats"), [])).forEach((b, n) => {
    if (!isObj(b)) return;
    if (get(b, "with") === "key-entrance") {
      if (!keyTexts.length) errs.push(`beats[${n}].with key-entrance: the plan has no key`);
      else if (has(b, "onWord") && !keyTexts.some((k) => k.includes(str(b.onWord).split("#")[0].toLowerCase()))) {
        errs.push(`beats[${n}].onWord '${str(b.onWord)}': with key-entrance it names a word of a key, and no key shows it`);
      }
    } else if (has(b, "onWord")) word(`beats[${n}].onWord`, b.onWord);
  });
  const cams = get(plan, "camera");
  for (const cam of isList(cams) ? cams : [cams]) if (isObj(cam) && has(cam, "fromWord")) word("camera.fromWord", cam.fromWord);
  iter(or(get(plan, "shots"), [])).forEach((sh, k) => { if (isObj(sh)) anchor(`shots[${k}].from`, get(sh, "from")); });
  return errs;
}

export function lint(planIn: unknown, opts: LintOptions): string[] {
  if (!isObj(planIn)) return ["write the plan as an object"];
  const plan = planIn, styles = opts.styles, glyphs = opts.glyphs ?? GLYPH_TABLE;
  const errs: string[] = [];
  const extra = keys(plan).filter((k) => !TOP.has(k));
  if (extra.length) errs.push(`unknown top-level fields ${reprSorted(extra)}`);
  for (const need of ["schema", "sceneId", "film", "durationFrames", "words", "copy", "pages"]) if (!has(plan, need)) errs.push(`missing ${need}`);
  const shapes = shapeErrors(plan);
  if (shapes.length) return [...errs, ...shapes];

  const BANNED = bannedPattern(styles);
  const walk = (node: Json, path: string): void => {
    if (isObj(node)) {
      for (const k of keys(node)) {
        const v = node[k], enums = enumsAt(path), values = enums.get(k);
        if (path.endsWith(".enter") && !ENTER.has(k)) errs.push(`${path}.${k}: unknown entrance parameter (one of ${reprSorted(ENTER.keys())})`);
        else if (values && !isStr(v) && !isNum(v) && !(k === "onset" && isAnchor(v))) {
          errs.push(`${path}.${k}: write one of ${reprSorted(values)}`);
          continue;
        } else if (values && isStr(v) && !values.has(v)) errs.push(`${path}.${k}: '${v}' not in ${reprSorted(values)}`);
        walk(v, `${path}.${k}`);
      }
    } else if (isList(node)) {
      node.forEach((v, i) => {
        if (path.endsWith(".cardGrounds")) {
          if (isList(v) || isObj(v)) throw new PyError("TypeError", "unhashable type");
          if (!(isStr(v) && ENUMS.get("ground")!.has(v))) errs.push(`${path}[${i}]: '${str(v)}' not a ground`);
        }
        walk(v, `${path}[${i}]`);
      });
    } else if (isNum(node)) errs.push(`${path}: numbers are not allowed in authored fields (${strNum(node)})`);
    else if (isStr(node)) {
      const m = BANNED.exec(node);
      if (m) errs.push(`${path}: banned wording '${m[0]}'`);
    }
  };
  const authored: Obj = {};
  for (const k of keys(plan)) if (!["words", "durationFrames", "schema", "sceneId", "film"].includes(k)) authored[k] = plan[k];
  walk(authored, "plan");
  errs.push(...objectErrors(plan));
  const entrances = or(get(plan, "entrances"), {}) as Obj;
  for (const k of keys(entrances)) {
    const v = entrances[k];
    if (!isStr(v) || !ENTRANCES.has(v)) errs.push(`entrances.${k}: '${str(v)}' not in ${reprSorted(ENTRANCES)}`);
  }
  const film = str(get(plan, "film"));
  const found = Object.prototype.hasOwnProperty.call(styles, film) ? styles[film] : null;
  const style = T(found) ? found : null;
  if (!style) errs.push(`film: no style profile for '${film}'`);
  const copy = iter(get(plan, "copy", [])) as Obj[];
  for (const c of copy) {
    for (const line of iter(get(c, "lines", [])) as string[]) {
      let depth = 0;
      for (const w of pySplit(line.replaceAll("*", ""))) {
        if (count(w, "[") > 1 || count(w, "]") > 1 || w === "[" || w === "]" || (w.includes("[") && !w.startsWith("[")) || (w.includes("]") && !w.endsWith("]"))) depth = -9;
        depth += w.startsWith("[") ? 1 : 0;
        if (depth > 1) break;
        depth -= w.endsWith("]") ? 1 : 0;
        if (depth < 0) break;
      }
      if (depth !== 0) errs.push(`copy.${str(get(c, "id"))}: bad word group in '${line}' (write [two words] inside one line)`);
      let starred: boolean | null = false;
      for (const w of pySplit(line.replaceAll("[", "").replaceAll("]", ""))) {
        const core = stripChars(w, "*");
        if (!core || core.includes("*") || count(w, "*") > 2 || (w.startsWith("*") && starred) || (w.endsWith("*") && !w.startsWith("*") && !starred)) {
          starred = null;
          break;
        }
        starred = (starred || w.startsWith("*")) && !(w.endsWith("*") && [...w].length > 1);
      }
      if (starred !== false) errs.push(`copy.${str(get(c, "id"))}: bad emphasis in '${line}' (write *word* or *two words* inside one line)`);
    }
    for (const k of keys(or(get(c, "emphasis"), {}) as Obj)) {
      if (!EMPHASIS.has(k)) errs.push(`copy.${str(get(c, "id"))}.emphasis.${k}: emphasis sets only ${reprSorted(EMPHASIS)}`);
    }
    const emphasis = or(get(c, "emphasis"), {}) as Obj;
    if (get(c, "role") === "caption" && (get(c, "face") === "sans-heavy" || get(emphasis, "face") === "sans-heavy")) {
      errs.push(`copy.${str(get(c, "id"))}: captions are set in the caption face or serif-italic (for a heavier caption word use weight bold)`);
    }
    const looks = [c, emphasis];
    const valid = looks.every((x) => [...EMPHASIS].every((k) => get(x, k) === null || (isStr(get(x, k)) && ENUMS.get(k)!.has(get(x, k) as string))));
    if (style && valid && (iter(get(c, "lines", [])) as string[]).some((line) => line.includes("*"))) {
      const em: Obj = T(get(c, "emphasis")) ? { ...c, ...(c.emphasis as Obj) } : Object.fromEntries(Object.entries(c).filter(([k]) => !EMPHASIS.has(k)));
      if (pyEq(look(em, style), look(c, style))) {
        errs.push(`copy.${str(get(c, "id"))}: starred words would look like the rest in film ${film} (set emphasis, or the item's face/weight/colour)`);
      }
    }
  }
  const counting = new Set<Json>();
  for (const c of copy) {
    const id = get(c, "id");
    if (T(get(c, "count")) || getH(entrances, id) === "count-up") counting.add(id);
  }
  for (const c of copy) if (has(c, "count")) for (const e of countErrors(c, plan, counting)) errs.push(`copy.${str(get(c, "id"))}.count: ${e}`);
  iter(or(get(plan, "shots"), [])).forEach((sh, k) => { for (const e of shotErrors(sh)) errs.push(`shots[${k}]: ${e}`); });
  if (get(plan, "textCadence") === "ones" && style && !T(get(or(get(style, "cadence"), {}) as Obj, "fps"))) {
    errs.push(`textCadence 'ones': film ${film} already animates everything on every video frame`);
  }
  for (const a of iter(get(plan, "assets", [])) as Obj[]) {
    for (const k of keys(or(get(a, "enter"), {}) as Obj)) {
      if (!ASSET_ENTER.has(k)) errs.push(`assets.${str(get(a, "id"))}.enter.${k}: pictures take only ${reprSorted(ASSET_ENTER)}`);
    }
  }
  errs.push(...pictureErrors(plan));
  for (const item of [...copy, ...(iter(get(plan, "assets", [])) as Obj[])]) {
    const e = get(item, "exit");
    if (e !== null && e !== "scene-end" && !(isObj(e) && has(e, "word") && keys(e).every((k) => k === "word" || k === "at"))) {
      errs.push(`${str(get(item, "id"))}.exit: write {"word": ..., "at": ...} or 'scene-end'`);
    }
  }
  if (style && isList(get(plan, "words"))) {
    const spoken = new Transcript(plan, style.fps as number, style.timing as Json);
    errs.push(...anchorErrors(plan, spoken));
    errs.push(...shownErrors(plan, spoken, style), ...colourErrors(plan, spoken, style));
  }
  if (style) errs.push(...inkErrors(plan, style, glyphs));
  const ids = new Set<Json>([...copy.map((c) => get(c, "id")), ...(iter(get(plan, "assets", [])) as Obj[]).map((a) => get(a, "id"))]);
  const pictures = pagePictures(plan);
  iter(get(plan, "pages", [])).forEach((p, n) => {
    for (const e of pageErrors(p as Obj, n, pictures)) errs.push(`pages[${n}]: ${e}`);
    for (const key of ["items", "left", "right", "under"]) {
      for (const i of pageIds(p as Obj, key)) if (!ids.has(i)) errs.push(`page refers to unknown id ${str(i)}`);
    }
  });
  return errs;
}

export function lintPlan(plan: unknown, opts: LintOptions): { ok: boolean; errors: string[] } {
  try {
    const errors = lint(plan, opts);
    return { ok: errors.length === 0, errors };
  } catch (e) {
    if (!(e instanceof PyError)) throw e;
    return { ok: false, errors: [`lint could not read the plan (${e.message})`] };
  }
}
