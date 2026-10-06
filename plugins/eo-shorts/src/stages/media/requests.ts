import type { FilmStyle } from "../../../engine/compiler/core.mjs";
import { buildShotRequest } from "../../broll/request.ts";
import type { ShotRequest } from "../../broll/types.ts";
import type { PlannedScene } from "./planInput.ts";
import { shotSpans, type ShotSpan } from "./shotFrames.ts";

export const shotRequestId = (sceneId: string, k: number): string => sceneId + "-" + k;

export type SceneShot = ShotSpan & { sceneId: string; requestId: string };

export type FilmRequests = {
  requests: ShotRequest[];
  shots: SceneShot[];
  refused: { requestId: string; reason: string }[];
};

export function insetBox(style: FilmStyle): { w: number; h: number } {
  const b = (style as unknown as { layout?: { inset?: { w?: number; h?: number } } }).layout?.inset;
  return b && typeof b.w === "number" && typeof b.h === "number" && b.w > 0 && b.h > 0 ? { w: b.w, h: b.h } : { w: 874, h: 492 };
}

export function shotWindow(layout: string | null | undefined, style: FilmStyle): { width: number; height: number } {
  if (layout !== "inset") return { width: 1080, height: 1920 };
  const b = insetBox(style);
  return { width: 1080, height: Math.min(1920, Math.max(2, 2 * Math.round(1080 / (b.w / b.h) / 2))) };
}

export function sceneContext(scene: PlannedScene): string {
  const lines = (scene.plan.copy ?? []).flatMap((c) => (Array.isArray(c.lines) ? c.lines : []));
  const text = lines.length ? lines.join(" ") : (scene.plan.words ?? []).map((w) => w.text).join(" ");
  return text.replace(/[*[\]]/g, "").replace(/\s+/g, " ").trim().slice(0, 300);
}

export function filmRequests(scenes: PlannedScene[], style: FilmStyle, fps: number): FilmRequests {
  const requests: ShotRequest[] = [];
  const shots: SceneShot[] = [];
  const refused: FilmRequests["refused"] = [];
  for (const scene of scenes) {
    const context = sceneContext(scene);
    for (const span of shotSpans(scene.plan, style)) {
      const requestId = shotRequestId(scene.sceneId, span.k);
      shots.push({ ...span, sceneId: scene.sceneId, requestId });
      if (span.source !== "stock-video" && span.source !== "person") continue;
      if (span.frames <= 0) {
        refused.push({ requestId, reason: "the shot covers no frames" });
        continue;
      }
      try {
        const inset = span.shot.layout === "inset";
        const r = buildShotRequest(span.shot, {
          id: requestId,
          frames: span.frames,
          fps,
          speedFactor: span.speedFactor,
          ...(context ? { contextText: context } : {}),
          ...(inset ? { prefer: "landscape" as const, target: shotWindow("inset", style) } : {}),
        });
        if (r) requests.push(r);
      } catch (e) {
        refused.push({ requestId, reason: e instanceof Error ? e.message : String(e) });
      }
    }
  }
  return { requests, shots, refused };
}
