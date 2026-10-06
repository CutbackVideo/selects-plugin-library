import { visibleSourceRect, type ClipTransformValue, type Size } from "../../speaker/framing.ts";
import { sha256Hex } from "../../host/util.ts";
import { type ExecShot, type FootageExecution, shotAt } from "./footageFrames.ts";

export function needsLook(ex: FootageExecution, frame: number): boolean {
  const shot = shotAt(ex, frame);
  if (!shot) return false;
  if (shotHasLook(shot)) return true;
  if (!ex.screen) return false;
  return !ex.screenSpans || ex.screenSpans.some((s) => frame >= s.from && frame < s.to);
}

export function shotHasLook(shot: ExecShot): boolean {
  return (shot.treatment ?? "none") !== "none" || !!shot.grade || !!shot.gamma || (shot.move ?? "none") !== "none" || shot.layout === "inset";
}

export function lookRuns(ex: FootageExecution, from: number, to: number): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  for (let f = from; f < to; f += 1) {
    if (!needsLook(ex, f)) continue;
    const last = out.at(-1);
    if (last && last.to === f) last.to = f + 1;
    else out.push({ from: f, to: f + 1 });
  }
  return out;
}

export function effectExecution(ex: FootageExecution): Record<string, unknown> {
  const { layers: _l, fonts: _f, assetFiles: _a, ...rest } = ex as Record<string, unknown>;
  const footage = (ex.footage || []).map(({ dir: _d, file: _p, ...shot }) => shot);
  return { ...rest, layers: [], fonts: {}, assetFiles: {}, footage };
}

export function cropWindowOf(t: ClipTransformValue, src: Size, out: Size): { x0: number; y0: number; w: number; h: number; frameWidth: number; frameHeight: number } {
  const r = visibleSourceRect(t, src, out);
  const q = (v: number) => Math.round(v * 1e6) / 1e6;
  return { x0: q(r.x0), y0: q(r.y0), w: q(r.x1 - r.x0), h: q(r.y1 - r.y0), frameWidth: src.width, frameHeight: src.height };
}

export type LookParams = {
  execution: Record<string, unknown>;
  sourceObjectFit: "cover";
  nativeFrameOffset: number;
  cropWindow?: ReturnType<typeof cropWindowOf>;
};

export function lookParams(ex: FootageExecution, offset: number, cropWindow?: ReturnType<typeof cropWindowOf> | null): LookParams {
  return { execution: effectExecution(ex), sourceObjectFit: "cover", nativeFrameOffset: offset, ...(cropWindow ? { cropWindow } : {}) };
}

const SID = /^[A-Za-z0-9_.-]+$/;

export async function lookLabel(sceneId: string, runtimeSha256: string, params: LookParams): Promise<string> {
  if (!SID.test(sceneId)) throw new Error("Scene id " + JSON.stringify(sceneId) + " cannot name an Effect.");
  return "EO " + sceneId + " look " + (await sha256Hex(JSON.stringify([runtimeSha256, params]))).slice(0, 12);
}

export const isLookLabel = (name: string) => /^EO [A-Za-z0-9_.-]+ look [0-9a-f]{12}$/.test(name);
