import type { ClipTransformValue, Size } from "../../speaker/framing.ts";
import { type FootageExecution, type FootageKind, footageRuns } from "./footageFrames.ts";
import { type LookParams, cropWindowOf, lookParams, lookRuns } from "./effects.ts";

export type SceneFootage = {
  sceneId: string;
  start: number;
  end: number;
  execution: FootageExecution;
  kinds: Record<string, FootageKind>;
};

export type StockOverlayPlan = {
  sceneId: string;
  run: number;
  runFrom: number;
  runTo: number;
  shots: { id: string; from: number; to: number }[];
  start: number;
  end: number;
  look: LookParams | null;
};

export type PodcastLookRun = { sceneId: string; sceneStart: number; start: number; end: number };

export type CompositionPlan = {
  overlays: StockOverlayPlan[];
  podcastLooks: PodcastLookRun[];
  splits: number[];
  podcast: { start: number; end: number }[];
  warnings: string[];
};

export function checkScenes(scenes: SceneFootage[], mainEnd: number): void {
  let at = 0;
  for (const s of scenes) {
    if (s.start !== at) throw new Error("Scene " + s.sceneId + " starts at frame " + s.start + "; the scene before it ends at " + at + ".");
    if (s.end - s.start !== s.execution.durationFrames) throw new Error("Scene " + s.sceneId + " spans " + (s.end - s.start) + " frames; its execution has " + s.execution.durationFrames + ".");
    at = s.end;
  }
  if (at !== mainEnd) throw new Error("The scenes end at frame " + at + "; Main ends at " + mainEnd + ".");
}

const merge = (rs: { start: number; end: number }[]) => {
  const out: { start: number; end: number }[] = [];
  for (const r of rs.slice().sort((a, b) => a.start - b.start)) {
    const last = out.at(-1);
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end);
    else out.push({ ...r });
  }
  return out;
};

export function planComposition(scenes: SceneFootage[], mainEnd: number): CompositionPlan {
  checkScenes(scenes, mainEnd);
  const overlays: StockOverlayPlan[] = [];
  const podcastLooks: PodcastLookRun[] = [];
  const podcast: { start: number; end: number }[] = [];
  const warnings: string[] = [];
  for (const s of scenes) {
    let k = 0;
    for (const run of footageRuns(s.execution, s.kinds)) {
      if (run.kind === "stock") {
        const looks = lookRuns(s.execution, run.from, run.to);
        overlays.push({ sceneId: s.sceneId, run: k++, runFrom: run.from, runTo: run.to, shots: run.shots, start: s.start + run.from, end: s.start + run.to, look: looks.length ? lookParams(s.execution, run.from) : null });
      } else if (run.kind === "podcast") {
        podcast.push({ start: s.start + run.from, end: s.start + run.to });
        for (const l of lookRuns(s.execution, run.from, run.to)) podcastLooks.push({ sceneId: s.sceneId, sceneStart: s.start, start: s.start + l.from, end: s.start + l.to });
      }
    }
  }
  const splits = [...new Set(podcastLooks.flatMap((l) => [l.start, l.end]))].filter((f) => f > 0 && f < mainEnd).sort((a, b) => a - b);
  if (podcastLooks.length) warnings.push(podcastLooks.length + " stretch(es) of the speaker take the EO look; an editor who later splits those Main clips stops the look's motion there.");
  return { overlays, podcastLooks, splits, podcast: merge(podcast), warnings };
}

export type MainPieceState = { start: number; end: number; transform: ClipTransformValue | null; source: Size | null };

export type MainLookTarget = { sceneId: string; start: number; end: number; look: LookParams };

export function mainLookTargets(scenes: SceneFootage[], plan: CompositionPlan, main: MainPieceState[], out: Size): MainLookTarget[] {
  const byId = new Map(scenes.map((s) => [s.sceneId, s]));
  const targets: MainLookTarget[] = [];
  for (const run of plan.podcastLooks) {
    const scene = byId.get(run.sceneId)!;
    const inside = main.filter((p) => p.start < run.end && p.end > run.start);
    if (!inside.length) throw new Error("Main has no clip under scene " + run.sceneId + " frames " + run.start + "-" + run.end + ".");
    for (const p of inside) {
      if (p.start < run.start || p.end > run.end) throw new Error("Main clip " + p.start + "-" + p.end + " crosses the edge of the look on " + run.start + "-" + run.end + "; it was not split there.");
      if (!p.transform || !p.source) throw new Error("Main clip " + p.start + "-" + p.end + " has no Transform or source size to place the look in.");
      targets.push({ sceneId: run.sceneId, start: p.start, end: p.end, look: lookParams(scene.execution, p.start - scene.start, cropWindowOf(p.transform, p.source, out)) });
    }
  }
  return targets;
}
