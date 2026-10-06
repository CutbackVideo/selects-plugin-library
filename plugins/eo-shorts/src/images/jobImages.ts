import type { Host, HostFs, PanelSdk } from "../host/types.ts";
import type { PluginRoots } from "../host/roots.ts";
import { ensureDir, readBytes, writeFileAtomic, writeJsonAtomic } from "../host/fs.ts";
import { errorMessage } from "../host/util.ts";
import { readScript } from "../host/runScript.ts";
import { DEFAULT_MODELS } from "../models/config.ts";
import type { MediaRoleConfig } from "../models/types.ts";
import { imageRequests, type ImageTarget, type ScenePlan } from "./requests.ts";
import { GenerationError, mediaGenerationService, scopeFromPath, type GenScope, type MediaGenerationLike } from "./mediaGeneration.ts";
import { PIECES_FALLBACK, cachedImage, ensureImages, type ImageDeps, type ImageOutcome } from "./generateImages.ts";

export const IMAGES_MANIFEST_SCHEMA = "eo-images/1";
export const IMAGES_DIR = "media/images";

export type ImagesManifestEntry = ImageTarget & {
  file: string | null;
  status: "ok" | "failed";
  sha24: string;
  cacheHit: boolean;
  prompt: string;
  aspect: string;
  carousel: boolean;
  pieces: { cut: string; count: number; fallback: string } | null;
  via: "transparent" | "matte" | null;
  jobId: string | null;
  draws: number;
  width: number | null;
  height: number | null;
  orientationOk: boolean | null;
  error: { kind: string; code: string; message: string } | null;
};

export type ImagesManifest = {
  schema: typeof IMAGES_MANIFEST_SCHEMA;
  modelId: string;
  scope: GenScope | null;
  pictures: ImagesManifestEntry[];
  failed: ImageTarget[];
  fallbacks: string[];
  warnings: string[];
  generated: number;
  cacheHits: number;
  ms: number;
};

export function defaultImageRole(): MediaRoleConfig {
  return DEFAULT_MODELS.roles.image as MediaRoleConfig;
}

export async function resolveGenerationScope(sdk: PanelSdk | null, projectId: string, pathname?: string | null): Promise<GenScope | null> {
  let path = pathname;
  if (path == null) {
    try {
      const w = (globalThis as { window?: { parent?: { location?: { pathname?: string } } } }).window;
      path = w?.parent?.location?.pathname ?? null;
    } catch {
      path = null;
    }
  }
  const fromPath = scopeFromPath(path, projectId);
  if (fromPath) return fromPath;
  if (!sdk) return null;
  try {
    const st = await readScript<{ libraryId: string | null; projectId: string | null }>(
      sdk,
      "Read the open Project's library",
      "const s = await selects.editor.state(); return { libraryId: s.libraryId, projectId: s.projectId };",
      { backoffMs: [2_000] },
    );
    return st?.libraryId && st.projectId === projectId ? { libraryId: st.libraryId, projectId } : null;
  } catch {
    return null;
  }
}

export type JobImagesOptions = {
  host: Host;
  roots: PluginRoots;
  dir: string;
  projectId: string;
  scenes: ScenePlan[];
  media?: MediaRoleConfig | null;
  scope?: GenScope | null;
  mg?: MediaGenerationLike | null;
  signal?: AbortSignal | null;
  note?: (message: string) => void;
  warn?: (message: string) => void;
  fallback?: (message: string) => void;
  event?: (type: string, data: Record<string, unknown>) => unknown;
  deps?: Partial<ImageDeps>;
};

export type JobImagesResult = { manifest: ImagesManifest; outputs: string[]; failed: ImageTarget[]; outcomes: ImageOutcome[] };

const rel = (...parts: string[]) => parts.join("/");

async function copyFile(fs: HostFs, from: string, to: string): Promise<void> {
  ensureDir(fs, fs.dirname(to));
  await writeFileAtomic(fs, to, await readBytes(fs, from));
}

export async function generateJobImages(o: JobImagesOptions): Promise<JobImagesResult> {
  const t0 = o.host.now();
  const fs = o.host.fs;
  const media = o.media ?? defaultImageRole();
  const input = media.input ?? {};
  const { requests, skipped, warnings } = await imageRequests(o.scenes, media.model, input);
  const fallbacks: string[] = [];
  for (const r of requests) {
    if (r.pieces) for (const t of r.targets) fallbacks.push(t.sceneId + "/" + t.assetId + ": pieces (" + r.pieces.cut + " x" + r.pieces.count + ") " + PIECES_FALLBACK);
  }
  const outcomes: ImageOutcome[] = new Array(requests.length);
  const misses: number[] = [];
  for (let i = 0; i < requests.length; i += 1) {
    const hit = await cachedImage(requests[i], { fs, cacheRoot: o.deps?.cacheRoot ?? o.roots.cache, now: o.host.now });
    if (hit) outcomes[i] = hit;
    else misses.push(i);
  }
  let scope: GenScope | null = o.scope ?? null;
  if (misses.length) {
    let mg: MediaGenerationLike | null = o.mg ?? null;
    let unavailable: GenerationError | null = null;
    try {
      mg = mg ?? mediaGenerationService(o.host.di);
      scope = scope ?? (await resolveGenerationScope(o.host.sdk, o.projectId));
      if (!scope) throw new GenerationError("unavailable", "scope_unknown", "Open the Project in Selects to generate its pictures.");
    } catch (e) {
      unavailable = e instanceof GenerationError ? e : new GenerationError("unavailable", "generation_unavailable", errorMessage(e));
    }
    if (unavailable || !mg || !scope) {
      const err = unavailable ?? new GenerationError("unavailable", "generation_unavailable", "Picture generation is not available.");
      o.warn?.("Pictures skipped: " + err.message + (misses.length < requests.length ? " (" + (requests.length - misses.length) + " from the cache)" : ""));
      for (const i of misses) {
        outcomes[i] = {
          sha: requests[i].sha,
          sha24: requests[i].sha24,
          status: "failed",
          cacheHit: false,
          file: null,
          record: null,
          error: { kind: err.kind, code: err.code, message: err.message },
          warnings: [],
          ms: 0,
        };
      }
    } else {
      o.note?.("Pictures: " + misses.length + " to make" + (misses.length < requests.length ? ", " + (requests.length - misses.length) + " from the cache" : ""));
      const made = await ensureImages(
        misses.map((i) => requests[i]),
        {
          fs,
          mg,
          scope,
          cacheRoot: o.roots.cache,
          runtime: o.host.runtime,
          tmpDir: o.dir ? fs.join(o.dir, "media", "tmp") : undefined,
          signal: o.signal,
          now: o.host.now,
          event: o.event,
          ...roleOptions(media),
          ...o.deps,
          note: (m) => o.note?.(m),
        },
      );
      misses.forEach((i, k) => (outcomes[i] = made[k]));
    }
  }
  const pictures: ImagesManifestEntry[] = [];
  const outputs: string[] = [];
  const failed: ImageTarget[] = [];
  for (const t of skipped) {
    failed.push({ sceneId: t.sceneId, assetId: t.assetId });
    fallbacks.push(t.sceneId + "/" + t.assetId + ": no picture (" + t.reason + "); the scene falls back to type");
  }
  for (let i = 0; i < requests.length; i += 1) {
    const r = requests[i];
    const out = outcomes[i];
    for (const t of r.targets) {
      let file: string | null = null;
      if (out?.status === "ok" && out.file) {
        file = rel(IMAGES_DIR, t.sceneId, t.assetId + ".png");
        await copyFile(fs, out.file, fs.join(o.dir, ...file.split("/")));
        outputs.push(file);
        if (out.record?.via === "matte") fallbacks.push(t.sceneId + "/" + t.assetId + ": drawn on white and cut out (no transparent picture)");
      } else {
        failed.push(t);
        fallbacks.push(t.sceneId + "/" + t.assetId + ": no picture (" + (out?.error?.message ?? "not made") + "); the scene falls back to type");
      }
      const rec = out?.record ?? null;
      pictures.push({
        ...t,
        file,
        status: file ? "ok" : "failed",
        sha24: r.sha24,
        cacheHit: !!out?.cacheHit,
        prompt: r.prompt,
        aspect: r.aspect,
        carousel: r.carousel,
        pieces: r.pieces ? { ...r.pieces, fallback: PIECES_FALLBACK } : null,
        via: rec?.via ?? null,
        jobId: rec?.jobId ?? null,
        draws: rec?.draws.length ?? 0,
        width: rec?.crop.width ?? null,
        height: rec?.crop.height ?? null,
        orientationOk: rec?.orientation.ok ?? null,
        error: out?.error ?? null,
      });
    }
    warnings.push(...(out?.warnings ?? []).filter((w) => !warnings.includes(w)));
  }
  for (const f of fallbacks) o.fallback?.(f);
  const manifest: ImagesManifest = {
    schema: IMAGES_MANIFEST_SCHEMA,
    modelId: media.model,
    scope,
    pictures,
    failed,
    fallbacks,
    warnings,
    generated: outcomes.filter((x) => x?.status === "ok" && !x.cacheHit).length,
    cacheHits: outcomes.filter((x) => x?.cacheHit).length,
    ms: o.host.now() - t0,
  };
  const manifestRel = rel(IMAGES_DIR, "manifest.json");
  await writeJsonAtomic(fs, fs.join(o.dir, ...manifestRel.split("/")), manifest);
  outputs.push(manifestRel);
  return { manifest, outputs, failed, outcomes };
}

export function roleOptions(media: MediaRoleConfig): Pick<ImageDeps, "mode" | "matte"> {
  const r = media as MediaRoleConfig & { mode?: unknown; matte?: unknown };
  const out: Pick<ImageDeps, "mode" | "matte"> = {};
  if (r.mode === "matte" || r.mode === "transparent") out.mode = r.mode;
  if (r.matte === null) out.matte = null;
  else if (r.matte && typeof r.matte === "object" && typeof (r.matte as { modelId?: unknown }).modelId === "string") out.matte = r.matte as ImageDeps["matte"];
  return out;
}
