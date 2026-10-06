import type { Obj } from "../../lint/py.ts";

export type ShotChange = {
  scene: string;
  path: string;
  old: string;
  new: string;
};

const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

function sameButStart(a: Obj, b: Obj): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)].filter((k) => k !== "from"));
  for (const k of keys) if (JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null)) return false;
  return true;
}

export function plainSpeakerShots<P extends Record<string, unknown>>(planIn: P, opts: { sceneId: string }): { plan: P; changes: ShotChange[] } {
  if (!Array.isArray(planIn.shots)) return { plan: planIn, changes: [] };
  const plan = JSON.parse(JSON.stringify(planIn)) as P;
  const shots = plan.shots as unknown[];
  const changes: ShotChange[] = [];
  shots.forEach((sh, i) => {
    if (!isObj(sh) || sh.source !== "podcast" || sh.treatment === undefined || sh.treatment === "none") return;
    changes.push({ scene: opts.sceneId, path: "shots[" + i + "].treatment", old: String(sh.treatment), new: "none" });
    sh.treatment = "none";
  });
  if (!changes.length) return { plan: planIn, changes: [] };
  const kept: unknown[] = [];
  shots.forEach((sh, i) => {
    const prev = kept[kept.length - 1];
    if (isObj(sh) && isObj(prev) && sh.source === "podcast" && prev.source === "podcast" && sameButStart(sh, prev)) {
      changes.push({ scene: opts.sceneId, path: "shots[" + i + "]", old: JSON.stringify(sh), new: "taken out" });
      return;
    }
    kept.push(sh);
  });
  (plan as Record<string, unknown>).shots = kept;
  return { plan, changes };
}
