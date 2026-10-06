import type { HostFs } from "../host/types.ts";
import { ensureDir, readJsonIfExists, writeJsonAtomic } from "../host/fs.ts";

export const IMAGE_SCHEMA = "eo-image/1";
export const DRAW_SCHEMA = "eo-image-draw/1";

export type DrawStatus = "intent" | "submitted" | "delivered" | "failed" | "stuck" | "timeout" | "canceled" | "unknown" | "rejected";

export type DrawRecord = {
  schema: typeof DRAW_SCHEMA;
  draw: string;
  key: string;
  sha: string;
  modelId: string;
  scope: { libraryId: string; projectId: string };
  promptSha: string;
  orientAttempt: number;
  intentAt: number;
  submittedAt: number | null;
  jobId: string | null;
  status: DrawStatus;
  code?: string | null;
  deliveredPath?: string | null;
  finishedAt?: number | null;
  acceptance?: { ok: boolean; reasons: string[] } | null;
};

export type ImageRecord = {
  schema: typeof IMAGE_SCHEMA;
  sha: string;
  sha24: string;
  modelId: string;
  prompt: string;
  drawPrompt: string;
  via: "transparent" | "matte";
  aspect: string;
  canvas: { width: number; height: number };
  carousel: boolean;
  pieces: { cut: string; count: number; fallback: string } | null;
  input: Record<string, unknown>;
  jobId: string;
  key: string;
  draws: { draw: string; jobId: string | null; status: DrawStatus; code?: string | null }[];
  delivered: { path: string; width: number; height: number; pixFmt: string; bytes: number };
  alpha: { zero: number; partial: number; opaque: number; maxAlpha: number; corners: number[] };
  crop: { box: number[]; scale: number; width: number; height: number; keep: number };
  snapped: number;
  orientation: { ok: boolean; redraws: number; ratio: number };
  bytes: number;
  sha256: string;
  createdAt: number;
};

export type CachePaths = { root: string; draws: string; delivered: string };

export function cachePaths(fs: HostFs, cacheRoot: string): CachePaths {
  const root = fs.join(cacheRoot, "images");
  return { root, draws: fs.join(root, "draws"), delivered: fs.join(root, "delivered") };
}

export function imageFile(fs: HostFs, p: CachePaths, sha24: string): string {
  return fs.join(p.root, sha24 + ".png");
}

export function recordFile(fs: HostFs, p: CachePaths, sha24: string): string {
  return fs.join(p.root, sha24 + ".json");
}

export function drawFile(fs: HostFs, p: CachePaths, draw: string): string {
  return fs.join(p.draws, draw + ".json");
}

export function deliveryFolder(fs: HostFs, p: CachePaths, draw: string): string {
  return fs.join(p.delivered, draw);
}

export async function readCached(fs: HostFs, p: CachePaths, sha: string): Promise<ImageRecord | null> {
  const sha24 = sha.slice(0, 24);
  if (!(await fs.exists(imageFile(fs, p, sha24)))) return null;
  let rec: ImageRecord | null = null;
  try {
    rec = await readJsonIfExists<ImageRecord | null>(fs, recordFile(fs, p, sha24), null);
  } catch {
    return null;
  }
  return rec && rec.schema === IMAGE_SCHEMA && rec.sha === sha ? rec : null;
}

export async function readDraw(fs: HostFs, p: CachePaths, draw: string): Promise<DrawRecord | null> {
  try {
    const r = await readJsonIfExists<DrawRecord | null>(fs, drawFile(fs, p, draw), null);
    return r && r.schema === DRAW_SCHEMA ? r : null;
  } catch {
    return null;
  }
}

export async function writeDraw(fs: HostFs, p: CachePaths, rec: DrawRecord): Promise<void> {
  await ensureDir(fs, p.draws);
  await writeJsonAtomic(fs, drawFile(fs, p, rec.draw), rec);
}

export function drawKey(sha: string, suffix: string): string {
  return ("eos" + sha.slice(0, 40) + suffix).slice(0, 64);
}

export function drawName(sha24: string, orient: number, seq: number): string {
  return sha24 + (orient ? "-o" + orient : "") + (seq ? "-n" + seq : "");
}

export function drawSpent(rec: DrawRecord): boolean {
  if (["failed", "stuck", "timeout", "canceled"].includes(rec.status)) return true;
  return rec.status === "delivered" && rec.acceptance?.ok === false;
}
