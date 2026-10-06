import { sim } from "./anchors.ts";
import { isAnchor, iter, pageIds } from "./visibility.ts";
import { MOTION, MOTION_ENUMS, PIECE, SEARCH_FILLER, SHOT } from "./schema.ts";
import { PyError, T, WB, get, has, isList, isObj, isStr, keys, or, reprSorted, sortedStr, str, type Json, type Obj } from "./py.ts";

const b = WB;
export const SHOT_SIZE_WORDS = new RegExp(
  `${b}(wide|medium|close)[- ]?(shot|up)${b}|${b}close-?up${b}|${b}full[- ]body${b}|${b}waist[- ]up${b}|${b}establishing shot${b}`, "iu");

export function motionErrors(tracks: Json): string[] {
  if (!isList(tracks) || !tracks.every(isObj)) return ["write a list of moves ({type, dir, distance, from, to, ease, preRoll})"];
  const errs: string[] = [];
  (tracks as Obj[]).forEach((m, k) => {
    const e = keys(m).filter((x) => !MOTION.has(x)).map((x) => `unknown key '${x}' (one of ${reprSorted(MOTION)})`);
    const kind = get(m, "type");
    if (!isStr(kind) || !MOTION_ENUMS.get("type")!.has(kind)) e.push(`type: write one of ${reprSorted(MOTION_ENUMS.get("type")!)}`);
    else if (kind === "push" || kind === "pull") {
      for (const x of ["dir", "distance"]) if (has(m, x)) e.push(`${x}: ${kind} scales the picture in place (it takes amount, not ${x})`);
    } else {
      if (!has(m, "dir")) e.push(`${kind} needs dir`);
      if (has(m, "amount")) e.push(`amount: ${kind} travels a distance (amount is for push and pull)`);
      if (get(m, "distance") === "across" && kind !== "truck") e.push("distance across: only a truck pans from one end of a picture to the other");
      if (get(m, "distance") === "off-frame" && kind === "truck") {
        e.push("distance off-frame: a truck passes through its place (use exit to leave the frame, glide to come in)");
      }
    }
    if (kind === "exit" && !has(m, "from")) e.push("exit needs from (the word it starts on)");
    for (const [end, scene] of [["from", "scene-start"], ["to", "scene-end"]]) {
      if (has(m, end) && m[end] !== scene && !isAnchor(m[end])) e.push(`${end}: write {"word": ..., "at": ...} or '${scene}'`);
    }
    for (const x of e) errs.push(`motion[${k}]: ${x}`);
  });
  return errs;
}

const unhashable = (x: Json): boolean => isList(x) || isObj(x);
function assetsById(plan: Obj): Map<Json, Obj> {
  const m = new Map<Json, Obj>();
  for (const a of iter(get(plan, "assets", [])) as Obj[]) {
    const id = get(a, "id");
    if (unhashable(id)) throw new PyError("TypeError", "unhashable type");
    m.set(id, a);
  }
  return m;
}

export function pictureErrors(plan: Obj): string[] {
  const assets = assetsById(plan), pages = iter(get(plan, "pages", [])) as Obj[];
  const placed = new Set<Json>([...pages.flatMap((p) => ["items", "left", "right", "under"].flatMap((k) => pageIds(p, k))), ...pages.map((p) => get(p, "hero"))]);
  const members = new Set<Json>([...assets.values()].flatMap((a) => iter(or(get(a, "sequence"), []))));
  const errs: string[] = [];
  for (const [aid, a] of assets) {
    const at = `assets.${str(aid)}`;
    if (has(a, "motion")) for (const e of motionErrors(a.motion)) errs.push(`${at}.${e}`);
    if (has(a, "sequence")) {
      const seq = a.sequence;
      if (!isList(seq) || !seq.length || !seq.every(isStr)) {
        errs.push(`${at}.sequence: write a list of picture ids (shown in turn before this picture, which holds)`);
      } else {
        for (const i of seq) if (!assets.has(i)) errs.push(`${at}.sequence: '${i}' is not a picture of this plan`);
        for (const i of seq) {
          const other = assets.get(i);
          if (i !== aid && other && T(or(get(other, "sequence"), get(other, "pieces")))) errs.push(`${at}.sequence: '${i}' has a carousel or pieces of its own`);
        }
      }
      if (T(get(a, "pieces"))) errs.push(`${at}: a carousel cannot also be in pieces`);
    }
    const member = members.has(aid);
    if (member && placed.has(aid) && !T(get(a, "sequence"))) errs.push(`${at}: shown in another picture's carousel, so it is not laid out on a page itself`);
    const size = get(a, "size");
    if (member && !T(get(a, "sequence")) && (T(get(a, "motion")) || size === "band" || size === "bleed")) {
      errs.push(`${at}: a carousel picture takes its slot's path and scale (motion and band/bleed sizes go on the carousel)`);
    }
    if (T(get(a, "cut")) !== T(get(a, "pieces"))) errs.push(`${at}: write cut (the pattern) and pieces (one entry per piece) together`);
    if (has(a, "pieces")) {
      const ps = a.pieces;
      if (!isList(ps) || ps.length < 2 || !ps.every(isObj)) {
        errs.push(`${at}.pieces: write a list of at least two pieces ({onset, rim, motion, exit}, {} for a plain one)`);
        continue;
      }
      (ps as Obj[]).forEach((p, k) => {
        for (const x of keys(p).filter((x) => !PIECE.has(x))) errs.push(`${at}.pieces[${k}]: unknown key '${x}' (one of ${reprSorted(PIECE)})`);
        if (has(p, "onset") && !isStr(p.onset) && !isAnchor(p.onset)) {
          errs.push(`${at}.pieces[${k}].onset: write 'with-picture', 'next' or {"word": ..., "at": ...}`);
        }
        if (has(p, "motion")) for (const e of motionErrors(p.motion)) errs.push(`${at}.pieces[${k}].${e}`);
        const e = get(p, "exit");
        if (e !== null && e !== "scene-end" && !isAnchor(e)) errs.push(`${at}.pieces[${k}].exit: write {"word": ..., "at": ...} or 'scene-end'`);
      });
    }
  }
  return errs;
}

const words = (s: string): string[] => s.toLowerCase().match(/[a-z0-9]+/g) ?? [];

export function shotErrors(sh: Json): string[] {
  if (!isObj(sh)) return ["write an object (source, from, treatment, layout, ...)"];
  const errs = sortedStr(keys(sh).filter((f) => !SHOT.has(f))).map((f) => `unknown field '${f}' (one of ${reprSorted(SHOT)})`);
  const source = get(sh, "source");
  if (!T(source)) errs.push("missing source");
  if (source === "stock-video" && !T(get(sh, "query"))) errs.push("a stock-video shot needs query (2-5 plain words naming what is visible)");
  if (source === "person" && !T(get(sh, "name"))) errs.push("a person shot needs name");
  const only: [string, string, boolean][] = [
    ["query", "stock video", source === "stock-video"], ["name", "a person's photo", source === "person"],
    ["context", "a person's photo", source === "person"], ["framing", "stock video and a person's photo", source !== "podcast"],
    ["mustShow", "stock video and a person's photo", source !== "podcast"]];
  for (const [f, what, ok] of only) if (has(sh, f) && !ok) errs.push(`${f}: ${what} only (this shot is ${str(source)})`);
  if (has(sh, "grade") && source === "podcast") errs.push("grade: the podcast footage is the edit's own and keeps its look");
  if (get(sh, "speed", "normal") !== "normal" && source !== "stock-video") errs.push(`speed: only stock video plays at another speed (this shot is ${str(source)})`);
  if (has(sh, "from") && sh.from !== "scene-start" && !isAnchor(sh.from)) errs.push(`from: write 'scene-start' or {"word": ..., "at": ...}`);
  const must = get(sh, "mustShow"), query = get(sh, "query");
  if (source === "stock-video" && isStr(must) && isStr(query)) {
    const q = words(query);
    const missing = words(must).filter((w) => !SEARCH_FILLER.has(w) && !q.some((x) => sim(w, x) >= 0.8));
    if (missing.length) errs.push(`mustShow '${must}': the search finds only what query names; name ${missing.join(", ")} in query too`);
  }
  for (const f of ["query", "mustShow"]) {
    const v = get(sh, f);
    const m = isStr(v) ? SHOT_SIZE_WORDS.exec(v) : null;
    if (m) errs.push(`${f}: '${m[0]}' is a shot size: write framing (the search adds its words)`);
  }
  return errs;
}
