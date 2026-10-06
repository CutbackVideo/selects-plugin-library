import type { FilmStyle } from "../../../engine/compiler/core.mjs";
import { Transcript } from "../../lint/anchors.ts";
import type { Obj } from "../../lint/py.ts";
import type { PlanJson, PlanShot } from "./planInput.ts";

export type ShotSpan = {
  k: number;
  id: string;
  source: string;
  from: number;
  to: number;
  frames: number;
  speedFactor: number;
  shot: PlanShot;
};

type Cadence = { fps: number; phase: number };

export function footageCadence(style: FilmStyle): Cadence | null {
  const s = style as unknown as { fps: number; cadence?: { fps?: number; phase?: number; footage?: "ones" | "ticks" | { phase?: number } } };
  const c = s.cadence;
  const step = c?.footage;
  if (!c || !(typeof c.fps === "number" && c.fps < s.fps) || !step || step === "ones") return null;
  return { fps: c.fps, phase: (typeof step === "object" ? step.phase : undefined) ?? c.phase ?? 0 };
}

export function gridTick(f: number, c: Cadence, fps: number): number {
  const period = fps / c.fps;
  let k = Math.floor((f + c.phase) / period) - 1;
  while (Math.ceil(k * period - c.phase - 1e-9) < f) k++;
  return Math.ceil(k * period - c.phase - 1e-9);
}

export function shotSpans(plan: PlanJson, style: FilmStyle): ShotSpan[] {
  const fps = style.fps;
  const N = plan.durationFrames;
  const shots = (plan.shots ?? []) as PlanShot[];
  if (!shots.length) return [];
  const words = new Transcript(plan as unknown as Obj, fps, (style as unknown as { timing?: Obj }).timing ?? null);
  const startOf = (sh: PlanShot): number => {
    const f = sh.from;
    if (!f || f === "scene-start" || typeof f !== "object") return 0;
    return words.frame(f.word, f.at || "start") ?? 0;
  };
  const list = shots.map((sh, k) => ({ sh, k, start: startOf(sh) })).sort((a, b) => a.start - b.start);
  const cadence = footageCadence(style);
  const cutAt = (x: (typeof list)[number]) => (cadence && x.sh.source !== "podcast" ? gridTick(Math.round(x.start), cadence, fps) : Math.round(x.start));
  const slowRate = (style as unknown as { footage?: { slowRate?: number } }).footage?.slowRate;
  return list.map((x, i) => {
    const from = i === 0 ? 0 : Math.max(0, cutAt(x));
    const to = i + 1 < list.length ? Math.max(from + 1, cutAt(list[i + 1])) : N;
    const brought = x.sh.source !== "podcast";
    const speedFactor = brought && x.sh.speed === "slow" && typeof slowRate === "number" && slowRate > 0 ? slowRate : 1;
    return { k: x.k, id: "shot-" + x.k, source: x.sh.source, from, to, frames: to - from, speedFactor, shot: x.sh };
  });
}
