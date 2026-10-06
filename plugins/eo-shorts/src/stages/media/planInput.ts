import type { HostFs } from "../../host/types.ts";
import { readJson } from "../../host/fs.ts";

export const PLAN_SCENES_REL = "plan/scenes.json";

export const SCENE_ID = /^[A-Za-z0-9_-]+$/;

export function scenePlanRel(sceneId: string): string {
  if (!SCENE_ID.test(sceneId)) throw new Error("Unsafe scene id " + JSON.stringify(sceneId) + ".");
  return "plan/scenes/" + sceneId + "/plan.json";
}

export type PlanJson = {
  schema: string;
  sceneId: string;
  film: string;
  durationFrames: number;
  words?: { text: string; start: number; end: number }[];
  copy?: { id: string; role?: string; lines?: string[]; [k: string]: unknown }[];
  assets?: { id: string; [k: string]: unknown }[] | null;
  shots?: PlanShot[] | null;
  pages?: Record<string, unknown>[];
  [k: string]: unknown;
};

export type PlanShot = {
  source: string;
  from?: "scene-start" | { word: string; at?: string } | null;
  query?: string | null;
  mustShow?: string | null;
  framing?: string | null;
  name?: string | null;
  context?: string | null;
  speed?: string | null;
  treatment?: string | null;
  layout?: string | null;
  grade?: string | null;
  move?: string | null;
  [k: string]: unknown;
};

export type PlannedScene = {
  sceneId: string;
  start: number;
  end: number;
  type: string;
  plan: PlanJson;
};

export type PlanInput = { film: string; scenes: PlannedScene[]; durationFrames: number };

type Row = { id?: string; sceneId?: string; start?: number; end?: number; type?: string; film?: string; plan?: PlanJson };

function rowsOf(table: unknown): Row[] {
  if (Array.isArray(table)) return table as Row[];
  if (table && typeof table === "object") {
    const t = table as { scenes?: unknown };
    if (Array.isArray(t.scenes)) return t.scenes as Row[];
    return Object.entries(table as Record<string, Row>)
      .filter(([k, v]) => k !== "schema" && v && typeof v === "object")
      .map(([k, v]) => ({ id: k, ...v }));
  }
  throw new Error(PLAN_SCENES_REL + " is not a scene table.");
}

export function checkScenes(scenes: PlannedScene[], film: string | null): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  let at = 0;
  for (const s of scenes) {
    if (!SCENE_ID.test(s.sceneId)) problems.push("scene id " + JSON.stringify(s.sceneId) + " is not a safe id");
    if (seen.has(s.sceneId)) problems.push("scene " + s.sceneId + " appears twice");
    seen.add(s.sceneId);
    if (!Number.isInteger(s.start) || !Number.isInteger(s.end) || s.end <= s.start) problems.push("scene " + s.sceneId + " has frames " + s.start + "-" + s.end);
    else if (s.start !== at) problems.push("scene " + s.sceneId + " starts at frame " + s.start + ", expected " + at);
    at = s.end;
    const p = s.plan;
    if (!p || p.schema !== "eo-plan/0") problems.push("scene " + s.sceneId + " has no eo-plan/0 plan");
    else {
      if (p.sceneId !== s.sceneId) problems.push("scene " + s.sceneId + "'s plan names " + JSON.stringify(p.sceneId));
      if (p.durationFrames !== s.end - s.start) problems.push("scene " + s.sceneId + "'s plan lasts " + p.durationFrames + " frames, the scene " + (s.end - s.start));
      if (film && p.film !== film) problems.push("scene " + s.sceneId + "'s plan is for film " + JSON.stringify(p.film) + ", the job's is " + film);
    }
  }
  if (!scenes.length) problems.push("the plan has no scenes");
  return problems;
}

export async function readPlanInput(fs: HostFs, jobDir: string, o: { film?: string | null } = {}): Promise<PlanInput> {
  const at = (rel: string) => fs.join(jobDir, ...rel.split("/"));
  if (!(await fs.exists(at(PLAN_SCENES_REL)))) throw new Error("The plan has no scenes yet (" + PLAN_SCENES_REL + " is missing).");
  const rows = rowsOf(await readJson(fs, at(PLAN_SCENES_REL)));
  const scenes: PlannedScene[] = [];
  for (const r of rows) {
    const sceneId = String(r.id ?? r.sceneId ?? "");
    let plan = r.plan ?? null;
    if (!plan) {
      const rel = scenePlanRel(sceneId);
      if (!(await fs.exists(at(rel)))) throw new Error("Scene " + sceneId + " has no plan (" + rel + ").");
      plan = await readJson<PlanJson>(fs, at(rel));
    }
    scenes.push({ sceneId, start: Number(r.start), end: Number(r.end), type: String(r.type ?? ""), plan });
  }
  scenes.sort((a, b) => a.start - b.start);
  const film = o.film ?? scenes[0]?.plan?.film ?? null;
  const problems = checkScenes(scenes, film);
  if (problems.length) throw new Error("The plan's scenes cannot be used: " + problems.join("; ") + ".");
  return { film: film!, scenes, durationFrames: scenes[scenes.length - 1].end };
}
