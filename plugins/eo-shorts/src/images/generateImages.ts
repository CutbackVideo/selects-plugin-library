import type { HostFs, HostRuntime } from "../host/types.ts";
import { ensureDir, writeFileAtomic, writeJsonAtomic } from "../host/fs.ts";
import { AbortedError, errorMessage, isAbortError, sha256Hex, sleep as defaultSleep } from "../host/util.ts";
import { encodePng } from "./png.ts";
import { acceptCutout, cropAlpha, orientationOk, snapAlpha, type AlphaStats } from "./cutout.ts";
import { ORIENT_TRIES, drawPrompt, opaquePrompt, type ImageRequest } from "./requests.ts";
import { readPicture, type Picture } from "./pictureFile.ts";
import {
  DISPATCH_LIMIT_MS,
  GenerationError,
  PANEL_TAB,
  POLL_MS,
  submitDraw,
  waitForDraw,
  type GenScope,
  type MediaGenerationLike,
} from "./mediaGeneration.ts";
import {
  DRAW_SCHEMA,
  IMAGE_SCHEMA,
  cachePaths,
  deliveryFolder,
  drawKey,
  drawName,
  drawSpent,
  imageFile,
  readCached,
  readDraw,
  recordFile,
  writeDraw,
  type CachePaths,
  type DrawRecord,
  type DrawStatus,
  type ImageRecord,
} from "./imageCache.ts";

export const PIECES_FALLBACK = "drawn whole; pictures are not cut into pieces, so the pieces are revealed as one group";

export const BRIA_MATTE_MODEL = "model_v1_ZmFsLWFpL2JyaWEvYmFja2dyb3VuZC9yZW1vdmU";

export type MatteFallback = {
  modelId: string;
  opaqueInput?: Record<string, unknown>;
};

export type ImageDeps = {
  fs: HostFs;
  mg: MediaGenerationLike;
  scope: GenScope;
  cacheRoot: string;
  runtime?: HostRuntime | null;
  tmpDir?: string;
  signal?: AbortSignal | null;
  now?: () => number;
  sleep?: (ms: number, signal?: AbortSignal | null) => Promise<void>;
  pollMs?: number;
  dispatchLimitMs?: number;
  concurrency?: number;
  submitRetryMs?: number[];
  maxRedraws?: number;
  maxStalls?: number;
  matte?: MatteFallback | null;
  mode?: "transparent" | "matte";
  note?: (message: string) => void;
  event?: (type: string, data: Record<string, unknown>) => unknown;
};

export type ImageOutcome = {
  sha: string;
  sha24: string;
  status: "ok" | "failed";
  cacheHit: boolean;
  file: string | null;
  record: ImageRecord | null;
  error: { kind: string; code: string; message: string } | null;
  warnings: string[];
  ms: number;
};

const DEFINITE_REFUSAL =
  /generation_disabled|update_required|invalid|provider_unavailable|generation_unavailable|plugin_files|account_changed|forbidden|denied|credit|quota|unauthor|not_?allowed|bad_key|identity/i;

export type DrawSummary = { draw: string; jobId: string | null; status: DrawStatus; code?: string | null };

function genError(e: unknown): GenerationError | null {
  return e instanceof GenerationError ? e : null;
}

const round4 = (x: number) => Math.round(x * 1e4) / 1e4;

type Accepted = { picture: Picture; stats: AlphaStats; jobId: string; key: string; path: string; via: "transparent" | "matte"; prompt: string };

export async function cachedImage(req: ImageRequest, d: Pick<ImageDeps, "fs" | "cacheRoot" | "now">): Promise<ImageOutcome | null> {
  const now = d.now ?? Date.now;
  const t0 = now();
  const p = cachePaths(d.fs, d.cacheRoot);
  const cached = await readCached(d.fs, p, req.sha);
  if (!cached) return null;
  return { sha: req.sha, sha24: req.sha24, status: "ok", cacheHit: true, file: imageFile(d.fs, p, req.sha24), record: cached, error: null, warnings: [], ms: now() - t0 };
}

export async function ensureImage(req: ImageRequest, d: ImageDeps): Promise<ImageOutcome> {
  const now = d.now ?? Date.now;
  const t0 = now();
  const p = cachePaths(d.fs, d.cacheRoot);
  const warnings: string[] = [];
  const hit = await cachedImage(req, d);
  if (hit) return hit;
  const draws: DrawSummary[] = [];
  try {
    const orientTries = req.carousel || req.aspect === "square" ? 0 : ORIENT_TRIES;
    for (let orient = 0; ; orient += 1) {
      const got = await drawPicture(req, orient, d, p, draws);
      const crop = cropAlpha(got.picture, { maxSide: req.keep, carousel: req.carousel });
      const ok = orientationOk(crop.width, crop.height, req.aspect);
      if (!ok && orient < orientTries) {
        d.note?.(req.sha24.slice(0, 8) + ": came out the wrong way round (" + crop.width + "x" + crop.height + "), drawing it again");
        await d.event?.("image.orientation-redraw", { sha24: req.sha24, orient, width: crop.width, height: crop.height });
        continue;
      }
      if (!ok) warnings.push(req.sha24 + ": still not " + req.aspect + " after " + orient + " redraws (" + crop.width + "x" + crop.height + "); kept");
      const snapped = snapAlpha(crop);
      const png = await encodePng(crop);
      const file = imageFile(d.fs, p, req.sha24);
      await writeFileAtomic(d.fs, file, png);
      const st = got.picture;
      const record: ImageRecord = {
        schema: IMAGE_SCHEMA,
        sha: req.sha,
        sha24: req.sha24,
        modelId: req.modelId,
        prompt: req.prompt,
        drawPrompt: got.prompt,
        via: got.via,
        aspect: req.aspect,
        canvas: req.canvas,
        carousel: req.carousel,
        pieces: req.pieces ? { ...req.pieces, fallback: PIECES_FALLBACK } : null,
        input: req.input,
        jobId: got.jobId,
        key: got.key,
        draws,
        delivered: { path: got.path, width: st.width, height: st.height, pixFmt: st.pixFmt, bytes: st.bytes },
        alpha: {
          zero: round4(got.stats.zero),
          partial: round4(got.stats.partial),
          opaque: round4(got.stats.opaque),
          maxAlpha: got.stats.maxAlpha,
          corners: got.stats.corners,
        },
        crop: { box: crop.box, scale: crop.scale, width: crop.width, height: crop.height, keep: req.carousel ? 0 : req.keep },
        snapped,
        orientation: { ok, redraws: orient, ratio: round4(req.aspect === "tall" ? crop.height / crop.width : crop.width / crop.height) },
        bytes: png.length,
        sha256: await sha256Hex(png),
        createdAt: now(),
      };
      await writeJsonAtomic(d.fs, recordFile(d.fs, p, req.sha24), record);
      await d.event?.("image.ready", { sha24: req.sha24, jobId: got.jobId, via: got.via, width: crop.width, height: crop.height, redraws: orient, draws: draws.length });
      return { sha: req.sha, sha24: req.sha24, status: "ok", cacheHit: false, file, record, error: null, warnings, ms: now() - t0 };
    }
  } catch (e) {
    if (isAbortError(e) || d.signal?.aborted) throw e instanceof AbortedError ? e : new AbortedError();
    const g = genError(e);
    const error = { kind: g?.kind ?? "error", code: g?.code ?? "error", message: errorMessage(e) };
    await d.event?.("image.failed", { sha24: req.sha24, ...error, draws });
    return { sha: req.sha, sha24: req.sha24, status: "failed", cacheHit: false, file: null, record: null, error, warnings, ms: now() - t0 };
  }
}

async function drawPicture(req: ImageRequest, orient: number, d: ImageDeps, p: CachePaths, draws: DrawSummary[]): Promise<Accepted> {
  const matte = d.matte === undefined ? { modelId: BRIA_MATTE_MODEL } : d.matte;
  if (d.mode === "matte") {
    if (!matte) throw new GenerationError("failed", "no_matte_model", "roles.image.mode is \"matte\" but no matte model is set.");
    return matteDraw(req, orient, matte, d, p, draws);
  }
  if (matte && (await matteLaneOpen(req, orient, d, p))) {
    d.note?.(req.sha24.slice(0, 8) + ": continuing the white background + cutout an earlier run started");
    return matteDraw(req, orient, matte, d, p, draws);
  }
  try {
    return await transparentDraws(req, orient, d, p, draws);
  } catch (e) {
    const g = genError(e);
    if (!g || g.kind !== "failed" || !matte) throw e;
    d.note?.(req.sha24.slice(0, 8) + ": no transparent picture (" + g.message + "); trying white background + cutout");
    await d.event?.("image.matte-fallback", { sha24: req.sha24, after: g.code });
    try {
      return await matteDraw(req, orient, matte, d, p, draws);
    } catch (m) {
      const mg = genError(m);
      if (!mg) throw m;
      throw new GenerationError(mg.kind, mg.code, g.message + "; white background + cutout: " + mg.message, mg.jobId);
    }
  }
}

type Lane = "" | "-w";

async function firstOpenSeq(req: ImageRequest, orient: number, lane: Lane, d: ImageDeps, p: CachePaths): Promise<number> {
  for (let seq = 0; seq < 50; seq += 1) {
    const rec = await readDraw(d.fs, p, drawName(req.sha24, orient, seq) + lane);
    if (!rec || !drawSpent(rec)) return seq;
  }
  throw new GenerationError("failed", "too_many_draws", "This picture has failed 50 times; it is not drawn again.");
}

async function matteLaneOpen(req: ImageRequest, orient: number, d: ImageDeps, p: CachePaths): Promise<boolean> {
  try {
    const seq = await firstOpenSeq(req, orient, "-w", d, p);
    return !!(await readDraw(d.fs, p, drawName(req.sha24, orient, seq) + "-w"));
  } catch {
    return false;
  }
}

async function spendOpaque(d: ImageDeps, p: CachePaths, opaqueDraw: string, reason: string): Promise<void> {
  const rec = await readDraw(d.fs, p, opaqueDraw);
  if (rec) await writeDraw(d.fs, p, { ...rec, acceptance: { ok: false, reasons: ["its cutout: " + reason] } });
}

async function acceptDelivered(req: ImageRequest, draw: string, path: string, d: ImageDeps, p: CachePaths) {
  const picture = await readPicture(d.fs, path, { runtime: d.runtime, tmpDir: d.tmpDir, signal: d.signal });
  const acc = acceptCutout(picture, { hasAlphaChannel: picture.hasAlpha, pixFmt: picture.pixFmt, checkCorners: req.checkCorners });
  const rec = await readDraw(d.fs, p, draw);
  if (rec) await writeDraw(d.fs, p, { ...rec, acceptance: { ok: acc.ok, reasons: acc.reasons } });
  if (!acc.ok) await d.event?.("image.rejected", { sha24: req.sha24, draw, reasons: acc.reasons });
  return { picture, acc };
}

async function withRetries<T>(
  req: ImageRequest,
  d: ImageDeps,
  startSeq: number,
  attempt: (seq: number) => Promise<T>,
): Promise<T> {
  const maxRedraws = d.maxRedraws ?? 1;
  const maxStalls = d.maxStalls ?? 2;
  let redraws = 0;
  let stalls = 0;
  for (let seq = startSeq; ; seq += 1) {
    let last: GenerationError;
    try {
      return await attempt(seq);
    } catch (e) {
      const g = genError(e);
      if (!g) throw e;
      last = g;
    }
    if (last.kind === "stuck" && stalls < maxStalls) {
      stalls += 1;
      d.note?.(req.sha24.slice(0, 8) + ": generation stalled (" + last.code + "), submitting again");
      continue;
    }
    if (last.kind === "failed" && redraws < maxRedraws) {
      redraws += 1;
      d.note?.(req.sha24.slice(0, 8) + ": drawing again (" + last.message + ")");
      continue;
    }
    throw last;
  }
}

async function transparentDraws(req: ImageRequest, orient: number, d: ImageDeps, p: CachePaths, draws: DrawSummary[]): Promise<Accepted> {
  const start = await firstOpenSeq(req, orient, "", d, p);
  const prompt = drawPrompt(req, orient);
  return withRetries(req, d, start, async (seq) => {
    const draw = drawName(req.sha24, orient, seq);
    const got = await dispatch(
      req,
      {
        draw,
        modelId: req.modelId,
        input: { ...req.input, image_size: { width: req.canvas.width, height: req.canvas.height }, prompt },
        uploads: {},
        promptSha: await sha256Hex(prompt),
        orient,
      },
      d,
      p,
      draws,
    );
    const { picture, acc } = await acceptDelivered(req, draw, got.path, d, p);
    if (!acc.ok) throw new GenerationError("failed", "not_a_cutout", "Not a cutout: " + acc.reasons.join("; "), got.jobId);
    return { picture, stats: acc.stats, jobId: got.jobId, key: got.key, path: got.path, via: "transparent" as const, prompt };
  });
}

async function matteDraw(req: ImageRequest, orient: number, matte: MatteFallback, d: ImageDeps, p: CachePaths, draws: DrawSummary[]): Promise<Accepted> {
  const start = await firstOpenSeq(req, orient, "-w", d, p);
  const prompt = opaquePrompt(req, orient);
  return withRetries(req, d, start, async (seq) => {
    const opaqueDraw = drawName(req.sha24, orient, seq) + "-w";
    const opaque = await dispatch(
      req,
      {
        draw: opaqueDraw,
        modelId: req.modelId,
        input: {
          ...req.input,
          background: "opaque",
          ...(matte.opaqueInput ?? {}),
          image_size: { width: req.canvas.width, height: req.canvas.height },
          prompt,
        },
        uploads: {},
        promptSha: await sha256Hex(prompt),
        orient,
      },
      d,
      p,
      draws,
    );
    let cut: { draw: string; key: string; jobId: string; path: string } | null = null;
    let stalls = 0;
    for (let k = 0; !cut; k += 1) {
      if (k >= 50) throw new GenerationError("failed", "too_many_draws", "This picture's cutout has failed 50 times; it is not tried again.");
      const matteName = opaqueDraw + "-m" + (k || "");
      const prev = await readDraw(d.fs, p, matteName);
      if (prev && drawSpent(prev)) continue;
      try {
        cut = await dispatch(
          req,
          { draw: matteName, modelId: matte.modelId, input: { image_url: "selects-input:image" }, uploads: { image: { pluginFile: opaque.path } }, promptSha: "", orient },
          d,
          p,
          draws,
        );
      } catch (e) {
        const g = genError(e);
        if (g?.kind === "stuck" && stalls < (d.maxStalls ?? 2)) {
          stalls += 1;
          d.note?.(req.sha24.slice(0, 8) + ": cutout stalled (" + g.code + "), submitting again");
          continue;
        }
        if (g?.kind === "failed") await spendOpaque(d, p, opaqueDraw, g.code);
        throw e;
      }
    }
    const { picture, acc } = await acceptDelivered(req, cut.draw, cut.path, d, p);
    if (!acc.ok) {
      await spendOpaque(d, p, opaqueDraw, acc.reasons.join("; "));
      throw new GenerationError("failed", "not_a_cutout", "The cutout of the white picture is not a cutout: " + acc.reasons.join("; "), cut.jobId);
    }
    return { picture, stats: acc.stats, jobId: cut.jobId, key: cut.key, path: cut.path, via: "matte" as const, prompt };
  });
}

type DispatchSpec = {
  draw: string;
  modelId: string;
  input: Record<string, unknown>;
  uploads: Record<string, unknown>;
  promptSha: string;
  orient: number;
};

async function dispatch(req: ImageRequest, spec: DispatchSpec, d: ImageDeps, p: CachePaths, draws: DrawSummary[]) {
  const fs = d.fs;
  const now = d.now ?? Date.now;
  const wait = d.sleep ?? defaultSleep;
  const { draw } = spec;
  const key = drawKey(req.sha, draw.slice(req.sha24.length));
  const summary: DrawSummary = { draw, jobId: null, status: "intent" };
  draws.push(summary);
  let rec = await readDraw(fs, p, draw);
  if (rec && rec.key !== key) rec = null;
  const save = async (next: DrawRecord) => {
    rec = next;
    summary.status = next.status;
    summary.jobId = next.jobId;
    summary.code = next.code ?? null;
    await writeDraw(fs, p, next);
  };
  if (rec) {
    summary.jobId = rec.jobId;
    summary.status = rec.status;
    if (rec.status === "delivered" && rec.deliveredPath && (await fs.exists(rec.deliveredPath))) {
      return { draw, key, jobId: rec.jobId!, path: rec.deliveredPath };
    }
    if (drawSpent(rec)) {
      const kind = (rec.status === "delivered" ? "failed" : rec.status) as GenerationError["kind"];
      const code = rec.status === "delivered" ? "not_a_cutout" : rec.code ?? rec.status;
      throw new GenerationError(kind, code, "An earlier run's draw ended " + rec.status + " (" + code + ").", rec.jobId);
    }
    const otherScope = rec.scope?.libraryId !== d.scope.libraryId || rec.scope?.projectId !== d.scope.projectId;
    if (otherScope || !rec.jobId || rec.status === "unknown" || rec.status === "rejected") {
      await save({ ...rec, scope: d.scope, jobId: null, status: "intent", code: null, intentAt: now(), submittedAt: null, deliveredPath: null, finishedAt: null, acceptance: null });
    } else if (rec.status === "delivered") {
      await save({ ...rec, status: "submitted", intentAt: now(), deliveredPath: null, finishedAt: null });
    }
  } else {
    await save({
      schema: DRAW_SCHEMA,
      draw,
      key,
      sha: req.sha,
      modelId: spec.modelId,
      scope: d.scope,
      promptSha: spec.promptSha,
      orientAttempt: spec.orient,
      intentAt: now(),
      submittedAt: null,
      jobId: null,
      status: "intent",
    });
  }
  const cur = () => rec as DrawRecord;
  if (!cur().jobId) {
    const folder = deliveryFolder(fs, p, draw);
    await ensureDir(fs, folder);
    const request = {
      scope: d.scope,
      key,
      modelId: spec.modelId,
      input: spec.input,
      uploads: spec.uploads,
      outputName: "eo-" + draw,
      batch: 1,
      origin: { tool: "image" as const, tab: PANEL_TAB, recipeId: draw },
      delivery: { pluginFolder: folder },
    };
    const retries = d.submitRetryMs ?? [2_000, 5_000];
    let jobId: string | null = null;
    for (let attempt = 0; ; attempt += 1) {
      try {
        jobId = await submitDraw(d.mg, request);
        break;
      } catch (e) {
        const g = genError(e);
        if (!g || DEFINITE_REFUSAL.test(g.code) || attempt >= retries.length) {
          await save({ ...cur(), status: "rejected", code: g?.code ?? "submit_failed", finishedAt: now() });
          throw g ?? e;
        }
        await wait(retries[attempt], d.signal);
      }
    }
    await save({ ...cur(), jobId, submittedAt: now(), status: "submitted" });
    await d.event?.("image.submitted", { sha24: req.sha24, draw, jobId });
  }
  try {
    const got = await waitForDraw(d.mg, d.scope, cur().jobId!, {
      deadlineAt: cur().intentAt + (d.dispatchLimitMs ?? DISPATCH_LIMIT_MS),
      submittedAt: cur().submittedAt ?? cur().intentAt,
      signal: d.signal,
      pollMs: d.pollMs ?? POLL_MS,
      now,
      sleep: d.sleep,
      fileExists: async (path) => (await fs.exists(path)),
    });
    await save({ ...cur(), status: "delivered", deliveredPath: got.path, finishedAt: now() });
    return { draw, key, jobId: cur().jobId!, path: got.path };
  } catch (e) {
    const g = genError(e);
    if (g) await save({ ...cur(), status: g.kind as DrawStatus, code: g.code, finishedAt: now() });
    throw e;
  }
}

export async function ensureImages(reqs: ImageRequest[], d: ImageDeps): Promise<ImageOutcome[]> {
  const out: ImageOutcome[] = new Array(reqs.length);
  let next = 0;
  const lanes = Math.max(1, Math.min(d.concurrency ?? 3, reqs.length));
  const worker = async () => {
    for (;;) {
      if (d.signal?.aborted) throw new AbortedError();
      const i = next;
      next += 1;
      if (i >= reqs.length) return;
      out[i] = await ensureImage(reqs[i], d);
    }
  };
  await Promise.all(Array.from({ length: lanes }, worker));
  return out;
}
