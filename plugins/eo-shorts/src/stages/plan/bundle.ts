import { pyRound3 } from "./pyJson.ts";
import type { PlanSource } from "./source.ts";

export const FILM_PLAN_SCHEMA = "eo-film-plan/1";
export const SCENE_PLAN_SCHEMA = "eo-plan/0";
export const RESERVED = ["schema", "sceneId", "film", "durationFrames", "words"] as const;
export const SCENE_TYPES = ["graphic", "speaker", "broll"] as const;
const SCENE_ID = /^[A-Za-z0-9_-]+$/;

export type ScenePlanBody = Record<string, unknown>;
export type BundleScene = { id: string; startWord: number; endWord: number; type: string; plan: ScenePlanBody };
export type FilmBundle = { schema: string; film: string; direction: string; music?: unknown; scenes: BundleScene[]; [k: string]: unknown };

export type LocalWord = { text: string; start: number; end: number };
export type SceneRow = {
  id: string;
  film: string;
  start: number;
  end: number;
  frames: number;
  seconds: number;
  type: string;
  cameraFootage: boolean;
  text: string;
};
export type ScenePlan = ScenePlanBody & { schema: string; sceneId: string; film: string; durationFrames: number; words: LocalWord[] };
export type Exported = { rows: SceneRow[]; table: Record<string, SceneRow & { words: LocalWord[] }>; plans: Record<string, ScenePlan> };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
const reservedIn = (body: Record<string, unknown>): string[] => RESERVED.filter((k) => Object.prototype.hasOwnProperty.call(body, k));

export function sceneFrames(source: PlanSource, index: number, a: number, b: number): { start: number; end: number } {
  const words = source.words;
  return { start: index === 0 ? 0 : words[a].start, end: b === words.length ? source.durationFrames : words[b].start };
}

function rangeProblems(source: PlanSource, sid: string, index: number, a: number, b: number): string[] {
  const { start, end } = sceneFrames(source, index, a, b);
  if (!(start < end)) return [sid + ": its words " + a + "-" + (b - 1) + " take no frames (choose another boundary)"];
  const out = source.words.slice(a, b).findIndex((w) => !(start <= w.start && w.start <= w.end && w.end <= end));
  if (out < 0) return [];
  const w = source.words[a + out];
  return [sid + ": the boundary cuts through source speech (word " + (a + out) + " " + JSON.stringify(w.text) + " runs " + w.start + "-" + w.end + ", the scene " + start + "-" + end + "); move the boundary to where words do not overlap"];
}

function bodyProblems(sid: string, body: unknown): string[] {
  if (!isObj(body)) return [sid + ": plan must be an eo-plan/0 object"];
  const reserved = reservedIn(body);
  return reserved.length ? [sid + ": the plan contains mechanical transcript fields " + reserved.join(", ") + " (code adds them)"] : [];
}

export function bundleProblems(value: unknown, source: PlanSource, film: string): string[] {
  if (!isObj(value)) return ["the answer must be one eo-film-plan/1 object"];
  const problems: string[] = [];
  if (value.schema !== FILM_PLAN_SCHEMA) problems.push('schema must be "' + FILM_PLAN_SCHEMA + '"');
  if (value.film !== film) problems.push('film must be "' + film + '" (the style profile this film uses)');
  if (typeof value.direction !== "string" || !value.direction.trim()) problems.push("direction (the whole-film directing note) is missing");
  const scenes = value.scenes;
  if (!Array.isArray(scenes) || !scenes.length) return [...problems, "scenes is missing or empty"];
  const n = source.words.length;
  const ids = new Set<string>();
  let previous = 0;
  scenes.forEach((scene, i) => {
    const s = isObj(scene) ? scene : {};
    const sid = typeof s.id === "string" ? s.id : "scenes[" + i + "]";
    if (typeof s.id !== "string" || !SCENE_ID.test(s.id) || ids.has(s.id)) problems.push(sid + ": id must be unique letters, digits, _ or -");
    else ids.add(s.id);
    const a = s.startWord, b = s.endWord;
    let rangeOk = false;
    if (!isInt(a) || !isInt(b)) problems.push(sid + ": startWord and endWord must be word indices");
    else if (a !== previous) problems.push(sid + ": startWord " + a + " must be " + previous + " (the previous scene's endWord; ranges are contiguous)");
    else if (!(a < b && b <= n)) problems.push(sid + ": endWord " + b + " must be greater than startWord " + a + " and at most " + n);
    else rangeOk = true;
    if (!SCENE_TYPES.includes(s.type as never)) problems.push(sid + ": type must be one of " + SCENE_TYPES.join(", "));
    if (rangeOk) problems.push(...rangeProblems(source, sid, i, a as number, b as number));
    problems.push(...bodyProblems(sid, s.plan));
    if (isInt(b)) previous = b;
  });
  if (previous !== n) problems.push("the scenes end at word " + previous + "; the last endWord must be " + n + " (every source word in a scene)");
  return problems;
}

export function exportScenes(bundle: FilmBundle, source: PlanSource): Exported {
  const problems = bundleProblems(bundle, source, bundle.film);
  if (problems.length) throw new Error("The plan does not fit the source: " + problems.slice(0, 4).join("; "));
  const fps = source.fps;
  const rows: SceneRow[] = [];
  const table: Exported["table"] = {};
  const plans: Exported["plans"] = {};
  bundle.scenes.forEach((scene, i) => {
    const { start, end } = sceneFrames(source, i, scene.startWord, scene.endWord);
    const local: LocalWord[] = source.words
      .slice(scene.startWord, scene.endWord)
      .map((w) => ({ text: w.text, start: pyRound3((w.start - start) / fps), end: pyRound3((w.end - start) / fps) }));
    const body = scene.plan;
    const shots = Array.isArray(body.shots) ? body.shots : [];
    const row: SceneRow = {
      id: scene.id,
      film: bundle.film,
      start,
      end,
      frames: end - start,
      seconds: (end - start) / fps,
      type: scene.type,
      cameraFootage: shots.some((s) => isObj(s) && s.source === "podcast"),
      text: local.map((w) => w.text).join(" "),
    };
    rows.push(row);
    table[scene.id] = { ...row, words: local };
    plans[scene.id] = { ...body, schema: SCENE_PLAN_SCHEMA, sceneId: scene.id, film: bundle.film, durationFrames: end - start, words: local };
  });
  return { rows, table, plans };
}

export function planBody(plan: Record<string, unknown>): ScenePlanBody {
  const out: ScenePlanBody = {};
  for (const [k, v] of Object.entries(plan)) if (!RESERVED.includes(k as never)) out[k] = v;
  return out;
}

export function repairProblems(value: unknown, asked: Pick<BundleScene, "id" | "startWord" | "endWord">[], film: string): string[] {
  if (!isObj(value)) return ["the answer must be one eo-film-plan/1 object"];
  const problems: string[] = [];
  if (value.schema !== FILM_PLAN_SCHEMA) problems.push('schema must be "' + FILM_PLAN_SCHEMA + '"');
  if (value.film !== film) problems.push('film must be "' + film + '"');
  const scenes = Array.isArray(value.scenes) ? value.scenes : null;
  if (!scenes) return [...problems, "scenes is missing"];
  const want = new Map(asked.map((s) => [s.id, s]));
  const seen = new Set<string>();
  scenes.forEach((scene, i) => {
    const s = isObj(scene) ? scene : {};
    const sid = typeof s.id === "string" ? s.id : "scenes[" + i + "]";
    const w = typeof s.id === "string" ? want.get(s.id) : undefined;
    if (!w) return void problems.push(sid + ": not one of the scenes asked for (" + [...want.keys()].join(", ") + ")");
    if (seen.has(w.id)) problems.push(sid + ": given twice");
    seen.add(w.id);
    if (s.startWord !== w.startWord || s.endWord !== w.endWord) problems.push(sid + ": keep startWord " + w.startWord + " and endWord " + w.endWord);
    if (!SCENE_TYPES.includes(s.type as never)) problems.push(sid + ": type must be one of " + SCENE_TYPES.join(", "));
    problems.push(...bodyProblems(sid, s.plan));
  });
  for (const id of want.keys()) if (!seen.has(id)) problems.push(id + ": missing from the answer");
  return problems;
}
