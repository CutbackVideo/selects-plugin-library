import { isAnchor, iter, pageIds, unseen } from "./visibility.ts";
import { BEAT, BLOCK_ALIGNS, BLOCK_FIELDS, BLOCK_HINTS, CAMERA, COPY, ASSET, GROUP, PAGE, TIMING } from "./schema.ts";
import {
  PyError, T, get, has, isInt, isList, isNum, isObj, isStr, keys, or, pyIn, pyStrip, reprSorted, sortedStr, str, type Json, type Obj,
} from "./py.ts";

const hex4 = (ch: string): string => "U+" + ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0");
const MARKUP = /[[\]*]/g;
function idSet(xs: Iterable<Json>): Set<Json> {
  const out = new Set<Json>();
  for (const x of xs) {
    if (isList(x) || isObj(x)) throw new PyError("TypeError", "unhashable type");
    out.add(typeof x === "boolean" ? Number(x) : x);
  }
  return out;
}
const inSet = (x: Json, s: Set<Json>): boolean => {
  if (isList(x) || isObj(x)) throw new PyError("TypeError", "unhashable type");
  return s.has(typeof x === "boolean" ? Number(x) : x);
};
function sortIds(xs: Json[]): Json[] {
  if (xs.every(isStr)) return sortedStr(xs as string[]);
  if (xs.every((x) => x === null) && xs.length <= 1) return xs;
  throw new PyError("TypeError", "'<' not supported between instances");
}

export function shapeErrors(plan: Obj): string[] {
  const errs: string[] = [];
  const want = (at: string, parent: Obj, key: string, kind: "list" | "int" | "str" | "dict", what: string): boolean => {
    if (!has(parent, key)) return false;
    const v = parent[key];
    const ok = kind === "list" ? isList(v) : kind === "int" ? isInt(v) : kind === "str" ? isStr(v) : isObj(v);
    if (!ok) {
      errs.push(`${at}: write ${what}`);
      return false;
    }
    return true;
  };
  const objects = (at: string, parent: Obj, key: string, what: string): Obj[] => {
    if (!want(at, parent, key, "list", `a list of ${what}s`)) return [];
    const xs = parent[key] as Json[];
    xs.forEach((x, k) => { if (!isObj(x)) errs.push(`${at}[${k}]: write ${what} as an object`); });
    return xs.filter(isObj);
  };
  const strings = (at: string, parent: Obj, key: string, what = "a list of ids"): void => {
    if (want(at, parent, key, "list", what) && !(parent[key] as Json[]).every(isStr)) errs.push(`${at}: write ${what}`);
  };

  if (want("words", plan, "words", "list", "the transcript, a list of {text, start, end}") && !(plan.words as Json[]).every((w) =>
    isObj(w) && isStr(get(w, "text")) && ["start", "end"].every((k) => isNum(get(w, k))))) {
    errs.push("words: write the transcript, a list of {text, start, end} (seconds)");
  }
  if (want("durationFrames", plan, "durationFrames", "int", "the scene's length in frames (given)") && (plan.durationFrames as number) < 1) {
    errs.push("durationFrames: the scene's length in frames (given)");
  }
  for (const field of ["schema", "sceneId", "film", "craftIntent", "ending", "print", "textCadence"]) want(field, plan, field, "str", "text");
  for (const field of ["entrances", "idle", "context"]) want(field, plan, field, "dict", "an object" + (field !== "context" ? " keyed by item id" : ""));
  if (has(plan, "camera") && !(isObj(plan.camera) || isList(plan.camera))) errs.push("camera: write a move object or a list of them");
  for (const c of objects("copy", plan, "copy", "copy item")) {
    const at = `copy.${str(get(c, "id"))}`;
    want(`${at}.id`, c, "id", "str", "the item's id as text");
    strings(`${at}.lines`, c, "lines", "a list of on-screen lines");
    for (const f of ["enter", "emphasis", "timing", "count"]) want(`${at}.${f}`, c, f, "dict", "an object");
    if (has(c, "exit") && !(isStr(c.exit) || isObj(c.exit))) errs.push(`${at}.exit: write {"word": ..., "at": ...} or 'scene-end'`);
  }
  for (const a of objects("assets", plan, "assets", "picture")) {
    const at = `assets.${str(get(a, "id"))}`;
    want(`${at}.id`, a, "id", "str", "the picture's id as text");
    for (const [f, what] of [["prompt", "the prompt as text"], ["anchorWord", "a spoken word"], ["role", "its role"]]) want(`${at}.${f}`, a, f, "str", what);
    want(`${at}.enter`, a, "enter", "dict", "an object");
    strings(`${at}.sequence`, a, "sequence", "a list of picture ids");
    if (has(a, "exit") && !(isStr(a.exit) || isObj(a.exit))) errs.push(`${at}.exit: write {"word": ..., "at": ...} or 'scene-end'`);
  }
  objects("pages", plan, "pages", "page").forEach((p, k) => {
    for (const f of ["items", "left", "right", "under"]) strings(`pages[${k}].${f}`, p, f);
    want(`pages[${k}].hero`, p, "hero", "str", "the id of its picture");
    want(`pages[${k}].block`, p, "block", "str", "its block");
    objects(`pages[${k}].groups`, p, "groups", "group").forEach((group, g) => strings(`pages[${k}].groups[${g}].items`, group, "items"));
    strings(`pages[${k}].cardGrounds`, p, "cardGrounds", "a list of grounds, one per card");
  });
  objects("beats", plan, "beats", "beat");
  objects("shots", plan, "shots", "shot");
  return errs;
}

export function pagePictures(plan: Obj): Set<Json> {
  return idSet((iter(get(plan, "assets", [])) as Obj[])
    .filter((a) => get(a, "layout") !== "scatter" && !str(get(a, "role", "")).startsWith("reach-in"))
    .map((a) => get(a, "id")));
}

export function objectErrors(plan: Obj): string[] {
  const errs: string[] = [];
  const copy = iter(or(get(plan, "copy"), [])) as Obj[], assets = iter(or(get(plan, "assets"), [])) as Obj[];
  const pages = iter(or(get(plan, "pages"), [])) as Obj[];
  for (const [kind, items, fields, need] of [["copy", copy, COPY, ["id", "role", "lines"]], ["assets", assets, ASSET, ["id", "role", "prompt"]]] as const) {
    items.forEach((x, k) => {
      const at = `${kind}.${str(get(x, "id", `[${k}]`))}`;
      for (const f of sortedStr(keys(x).filter((f) => !fields.has(f)))) errs.push(`${at}: unknown field '${f}' (one of ${reprSorted(fields)})`);
      for (const f of need) if (!has(x, f)) errs.push(`${at}: missing ${f}`);
    });
  }
  const ids = [...copy, ...assets].map((x) => get(x, "id"));
  const twice = idSet(ids.filter((i) => ids.filter((j) => j === i).length > 1));
  for (const i of sortIds([...twice])) errs.push(`id '${str(i)}' is used twice (copy and pictures share one set of ids)`);
  for (const c of copy) {
    const lines = get(c, "lines"), at = `copy.${str(get(c, "id"))}`;
    if (!isList(lines) || !lines.length || !lines.every(isStr)) {
      errs.push(`${at}.lines: write a list of on-screen lines`);
      continue;
    }
    if ((lines as string[]).some((line) => !pyStrip(line.replace(MARKUP, "")))) {
      errs.push(`${at}: an empty line (blank lines do not place text: use band, anchor, gap, or groups with a slot)`);
    }
    for (const line of lines as string[]) {
      const blank = sortedStr(new Set(unseen(line).map(hex4)));
      if (blank.length) {
        errs.push(`${at}: '${line}' has characters that draw nothing (${blank.join(", ")}): lines are placed by align,` +
          " keyAlign or groups, and words are parted by plain spaces");
      }
      const shown = line.replace(MARKUP, "");
      if (pyStrip(shown) && (shown !== shown.replace(/^ +| +$/g, "") || shown.includes("  "))) {
        errs.push(`${at}: '${line}' has leading, trailing or repeated spaces: words are parted by one plain space` +
          " (size text with size, place it with align, keyAlign, band or groups)");
      }
    }
    const t = get(c, "timing");
    if (t !== null && (!isObj(t) || !T(t) || keys(t).some((k) => !TIMING.has(k)))) errs.push(`${at}.timing: write an object of ${reprSorted(TIMING)}`);
  }
  const shown = idSet([...pages.flatMap((p) => ["items", "left", "right", "under"].flatMap((k) => pageIds(p, k))), ...pages.map((p) => get(p, "hero"))]);
  const carousel = idSet(assets.flatMap((a) => iter(or(get(a, "sequence"), []))));
  for (const c of copy) if (!inSet(get(c, "id"), shown)) errs.push(`copy.${str(get(c, "id"))}: on no page (every copy item is shown by a page)`);
  for (const a of assets) {
    const id = get(a, "id");
    if (inSet(id, shown) || inSet(id, carousel)) continue;
    errs.push(`assets.${str(id)}: ` + (get(a, "role") === "hero" ? "a hero on no page (list it in a page's items, or as a flank-hero's hero)"
      : `a ${str(get(a, "role"))} picture on no page (list it in the items of the page it belongs to)`));
  }
  const pictures = pagePictures(plan);
  const copyIds = idSet(copy.map((c) => get(c, "id")));
  pages.forEach((p, n) => {
    const at = `pages[${n}]`, block = get(p, "block");
    for (const f of sortedStr(keys(p).filter((f) => !PAGE.has(f)))) errs.push(`${at}: unknown field '${f}' (one of ${reprSorted(PAGE)})`);
    if (!T(block)) errs.push(`${at}: missing block`);
    for (const e of blockFieldErrors(p, pictures)) errs.push(`${at}.${e}`);
    if (block === "flank-hero") {
      if (!inSet(get(p, "hero"), pictures)) errs.push(`${at}: a flank-hero page needs hero (the id of the picture its words hug)`);
      const laid = [...pageIds(p).filter((i) => inSet(i, pictures) || inSet(i, copyIds)), ...(T(get(p, "groups")) ? ["groups"] : [])];
      if (laid.length) {
        errs.push(`${at}: a flank-hero page sets its words in left, right and under and its picture as hero; its items list` +
          ` only reach-in or scattered pictures (not ${laid.map(str).join(", ")})`);
      }
    } else if (T(block) && !pageIds(p).length) errs.push(`${at}: no items (a scene of footage alone writes no pages)`);
    if (block === "cards") {
      for (const i of pageIds(p)) {
        for (const c of copy) {
          const lines = get(c, "lines");
          if (get(c, "id") === i && isList(lines) && lines.length > 1) {
            errs.push(`${at}: card ${str(i)} has ${lines.length} lines; a card shows its item's first line only (one line per card)`);
          }
        }
      }
    }
    if (block === "cards" || (block === "stack" && !T(get(p, "groups")) && get(p, "layout") !== "split")) {
      const dropped = pageIds(p).filter((i) => inSet(i, pictures));
      if (dropped.length) {
        errs.push(`${at}: a ${str(block)} page lays out no picture (${dropped.map(str).join(", ")}): use a hero-stack, a stack in groups` +
          " or split, or a flank-hero");
      }
    }
    const band = get(p, "band");
    if ((band === "chest" || band === "lower") && block !== "captions") {
      errs.push(`${at}.band '${band}': captions pages only (other pages sit centre or upper; groups take a slot)`);
    }
    const start = get(p, "start");
    if (n === 0 && !(start === null || start === "scene-start")) {
      errs.push(`${at}.start: the first page starts with the scene ('scene-start'); anchor its items instead`);
    } else if (n && !isAnchor(start)) errs.push(`${at}.start: a later page starts on a spoken word ({"word": ..., "at": ...})`);
    if (get(p, "shape", "none") !== "none") {
      const listed = idSet([get(p, "hero"), ...pageIds(p)]);
      if (![...listed].some((i) => pictures.has(i))) errs.push(`${at}.shape: the disc sits behind the page's picture, and the page lists none`);
    }
  });
  iter(or(get(plan, "beats"), [])).forEach((b, n) => {
    const beat = b as Obj;
    for (const f of sortedStr(keys(beat).filter((f) => !BEAT.has(f)))) errs.push(`beats[${n}]: unknown field '${f}' (one of ${reprSorted(BEAT)})`);
    if (!has(beat, "ground")) errs.push(`beats[${n}]: missing ground`);
    if (!has(beat, "onWord") && get(beat, "with") !== "key-entrance") errs.push(`beats[${n}]: missing onWord`);
  });
  const cams = get(plan, "camera");
  for (const cam of isList(cams) ? cams : cams === null ? [] : [cams]) {
    if (!isObj(cam)) {
      errs.push("camera: write a move object or a list of them");
      continue;
    }
    for (const f of sortedStr(keys(cam).filter((f) => !CAMERA.has(f)))) errs.push(`camera: unknown field '${f}' (one of ${reprSorted(CAMERA)})`);
    if (!has(cam, "move")) errs.push("camera: missing move");
  }
  const idList = ids;
  for (const field of ["entrances", "idle"]) {
    const m = or(get(plan, field), {});
    if (!isObj(m)) {
      errs.push(`${field}: write an object keyed by item id`);
      continue;
    }
    for (const k of keys(m)) if (!pyIn(k, idList)) errs.push(`${field}.${k}: no copy item or picture '${k}'`);
  }
  const idle = isObj(get(plan, "idle")) ? (plan.idle as Obj) : {};
  for (const k of keys(idle)) if (!(idle[k] === "float" || idle[k] === "static")) errs.push(`idle.${k}: '${str(idle[k])}' not in ['float', 'static']`);
  return errs;
}

export function blockFieldErrors(p: Obj, pictures: Set<Json> = new Set()): string[] {
  const block = get(p, "block"), errs: string[] = [];
  if (!isStr(block) || !BLOCK_FIELDS.has(block)) {
    if (isList(block) || isObj(block)) throw new PyError("TypeError", "unhashable type");
    return errs;
  }
  const all = new Set([...BLOCK_FIELDS.values()].flatMap((s) => [...s])), own = BLOCK_FIELDS.get(block)!;
  for (const f of sortedStr(keys(p).filter((f) => all.has(f) && !own.has(f)))) {
    const readers = sortedStr([...BLOCK_FIELDS].filter(([, fields]) => fields.has(f)).map(([b]) => b));
    errs.push(readers.length === 1 ? `${f}: only a ${readers[0]} page reads it`
      : `${f}: a ${block} page does not read it (${BLOCK_HINTS.get(block) ?? "see SCHEMA section 3"})`);
  }
  const align = get(p, "align");
  if (BLOCK_ALIGNS.has(block) && isStr(align) && !BLOCK_ALIGNS.get(block)!.has(align)) {
    errs.push(`align '${align}': a ${block} page aligns ${sortedStr(BLOCK_ALIGNS.get(block)!).join(", ")} only (${BLOCK_HINTS.get(block)})`);
  }
  if (block === "captions" && has(p, "gap") && [...idSet(pageIds(p))].filter((i) => pictures.has(i)).length < 2) {
    errs.push("gap: on a captions page it parts two or more pictures in the picture band, and this page lists fewer");
  }
  if (block !== "stack" && block !== "hero-stack") return errs;
  const groups = iter(or(get(p, "groups"), [])).filter(isObj) as Obj[];
  if (block === "stack" && has(p, "gap") && !groups.length && get(p, "layout") !== "split") {
    errs.push("gap: a plain stack is one block; gap parts groups, or text and pictures (groups, layout split)");
  }
  const rows: Obj[] = groups.length ? groups : [{}];
  const rowAlign = (g: Obj): Json => or(get(g, "align"), get(p, "align"));
  const setsRows = rows.map((g) => rowAlign(g) === "justify" || rowAlign(g) === "staircase");
  rows.forEach((g, k) => {
    const ka = get(g, "keyAlign");
    if (setsRows[k] && !(ka === null || ka === "block")) errs.push(`groups[${k}].keyAlign: its align ${str(rowAlign(g))} sets every row itself`);
  });
  const keyAlign = get(p, "keyAlign");
  if (!(keyAlign === null || keyAlign === "block") && setsRows.every(Boolean)) errs.push(`keyAlign: align ${str(get(p, "align"))} sets every row itself`);
  if (groups.length && groups.every((g) => T(get(g, "slot")))) {
    for (const f of ["anchor", "band"]) if (has(p, f)) errs.push(`${f}: every group sits on its slot, so nothing flows to the band`);
  } else if (get(p, "layout") === "split" && has(p, "band")) errs.push("band: a split page sets its text in the film's top band");
  return errs;
}

export function pageErrors(p: Obj, n: number, pictures: Set<Json> = new Set()): string[] {
  const errs: string[] = [], block = get(p, "block");
  if (T(get(p, "handoff")) && n === 0) errs.push("handoff: the first page has no page before it");
  const groups = get(p, "groups");
  const aligns = [get(p, "align"), ...(isList(groups) ? groups : []).filter(isObj).map((g) => get(g, "align"))];
  const edge = sortedStr(new Set(aligns.filter((a): a is string => a === "picture-left" || a === "picture-right")));
  if (edge.length && block === "stack" && !(T(groups) || get(p, "layout") === "split")) {
    errs.push(`align ${edge.join(", ")}: only a hero-stack, or a stack in groups or split, lays out a picture to align to`);
  } else if (edge.length && (block === "stack" || block === "hero-stack") && ![...idSet(pageIds(p))].some((i) => pictures.has(i))) {
    errs.push(`align ${edge.join(", ")}: the page lists no picture to align to`);
  }
  if (groups === null) return errs;
  if (T(get(p, "items"))) errs.push("write items or groups, not both");
  if (!isList(groups) || !groups.every(isObj)) return [...errs, "groups: write a list of objects (items, align, keyAlign, spacing, slot)"];
  const seen = new Set<Json>();
  (groups as Obj[]).forEach((g, k) => {
    for (const x of keys(g).filter((x) => !GROUP.has(x))) errs.push(`groups[${k}].${x}: unknown key (one of ${reprSorted(GROUP)})`);
    if (!T(get(g, "items"))) errs.push(`groups[${k}]: no items`);
    for (const i of iter(or(get(g, "items"), []))) {
      if (inSet(i, seen)) errs.push(`groups[${k}]: '${str(i)}' is already in an earlier group`);
      seen.add(i);
    }
  });
  return errs;
}
