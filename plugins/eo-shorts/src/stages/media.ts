import type { StageContext, StageImpl, StageResult } from "../jobs/runner.ts";
import { inputShaFrom, readReceipt } from "../jobs/receipts.ts";
import { ensureDir, readJsonIfExists, writeJsonAtomic } from "../host/fs.ts";
import { errorMessage } from "../host/util.ts";
import type { ModelClient } from "../models/callModel.ts";
import { mediaRole, textRole } from "../models/config.ts";
import type { MediaRoleConfig } from "../models/types.ts";
import { runBroll, BROLL_DEFAULTS, type BrollOptions, type BrollRun } from "../broll/film.ts";
import { hostStockSearch, type StockSearchFn } from "../broll/search.ts";
import { canvasPainter, type SheetPainter } from "../broll/sheet.ts";
import { commonsConfig, loadCommonsConfig, type CommonsConfig } from "../broll/config.ts";
import type { FetchLike } from "../broll/commons.ts";
import { creditsFor, type CreditEntry } from "../broll/credits.ts";
import type { ShotResult } from "../broll/types.ts";
import { generateJobImages, type JobImagesOptions, type JobImagesResult } from "../images/jobImages.ts";
import { stageModelClient } from "./edit/modelClient.ts";
import { filmStyle } from "./media/filmStyles.ts";
import { readPlanInput, type PlanJson, type PlannedScene } from "./media/planInput.ts";
import { filmRequests, shotWindow, type SceneShot } from "./media/requests.ts";
import { effectivePlan, type EffectivePlan } from "./media/fallbacks.ts";
import { estimateCx, faceCrop, hostFaceFinder, type FaceFinder } from "./media/faces.ts";
import { runJointly } from "./media/jointRun.ts";
import { forgetEarlierPasses } from "./media/passNotes.ts";

export const MEDIA_STAGE_VERSION = "eo-media-stage/1";
export const MEDIA_SCHEMA = "eo-media/1";

export const MEDIA_REL = {
  media: "media/media.json",
  credits: "media/credits.json",
  plan: (sceneId: string) => "media/plans/" + sceneId + ".json",
};

export type MediaStock = { path: string; startSeconds: number; cx: number };

export type MediaScene = {
  sceneId: string;
  start: number;
  end: number;
  plan: string;
  kind: EffectivePlan["kind"];
  pictures: Record<string, string>;
  stills: Record<string, string>;
  stock: Record<string, MediaStock>;
  fallbacks: string[];
};

export type MediaShot = {
  id: string;
  sceneId: string;
  k: number;
  source: string;
  from: number;
  to: number;
  status: string | null;
  sourceKey: string | null;
  fit: string | null;
  cxSource: string | null;
  fallback: string | null;
  retry: string | null;
};

export type MediaJson = {
  schema: typeof MEDIA_SCHEMA;
  film: string;
  fps: number;
  durationFrames: number;
  scenes: MediaScene[];
  shots: MediaShot[];
  pictures: { sceneId: string; assetId: string; status: string; file: string | null; via: string | null; pieces: boolean; error: string | null }[];
  images: string | null;
  judge: { provider: string; model: string }[];
  retry: string[];
  fallbacks: string[];
};

export type MediaStageOptions = {
  models?: (ctx: StageContext) => Pick<ModelClient, "callModel" | "config">;
  judge?: boolean;
  search?: (ctx: StageContext) => StockSearchFn | null;
  painter?: () => SheetPainter;
  fetch?: FetchLike | null;
  commons?: (ctx: StageContext) => Promise<CommonsConfig>;
  faces?: ((ctx: StageContext) => FaceFinder | null) | null;
  images?: (o: JobImagesOptions) => Promise<JobImagesResult>;
  imageOptions?: (ctx: StageContext) => Partial<JobImagesOptions>;
  broll?: Partial<BrollOptions>;
  runBroll?: typeof runBroll;
};

export function createMediaStage(o: MediaStageOptions = {}): StageImpl {
  return {
    id: "media",
    alwaysRerun: true,
    inputSha: (ctx) => inputShaFrom(ctx.host.fs, ctx.dir, ["edit", "plan"], { version: MEDIA_STAGE_VERSION, film: ctx.job.film, judge: o.judge !== false }),
    run: (ctx) => runMedia(ctx, o),
  };
}

export const mediaStage: StageImpl = createMediaStage();

export function jobRel(jobDir: string, abs: string): string {
  const norm = (s: string) => s.replace(/\\/g, "/").replace(/\/+$/, "");
  const base = norm(jobDir) + "/";
  const p = norm(abs);
  return p.toLowerCase().startsWith(base.toLowerCase()) ? p.slice(base.length) : abs;
}

async function draftFps(ctx: StageContext, fallback: number): Promise<number> {
  const fs = ctx.host.fs;
  for (const rel of ["edit/words.json", "source/source.json"]) {
    const j = await readJsonIfExists<{ fps?: number } | null>(fs, ctx.path(rel), null).catch(() => null);
    if (j && typeof j.fps === "number" && j.fps > 0) return j.fps;
  }
  return fallback;
}

const shortWhy = (r: ShotResult | undefined): string =>
  !r ? "not searched" : r.fallback ? r.fallback : r.status === "no_match" ? "no usable source" : r.status;

async function runMedia(ctx: StageContext, o: MediaStageOptions): Promise<StageResult> {
  const { host, job } = ctx;
  const fs = host.fs;
  forgetEarlierPasses(job, "media", await readReceipt(fs, ctx.dir, "media").catch(() => null));
  await ensureDir(fs, ctx.path("media"));
  const plan = await readPlanInput(fs, ctx.dir, { film: job.film });
  const style = filmStyle(job.film);
  const fps = await draftFps(ctx, style.fps);
  const film = filmRequests(plan.scenes, style, fps);

  const client = o.models ? o.models(ctx) : stageModelClient(ctx);
  const cfg = await client.config();
  const judgeRole = textRole(cfg, "broll.judge");
  const maxImages = Math.max(1, judgeRole.maxImagesPerCall ?? BROLL_DEFAULTS.maxImagesPerCall);
  let imageRole: MediaRoleConfig | null = null;
  try {
    imageRole = mediaRole(cfg, "image");
  } catch {
    imageRole = null;
  }
  const finder: FaceFinder | null =
    o.faces === null
      ? null
      : o.faces
        ? o.faces(ctx)
        : hostFaceFinder(host, { tmpDir: ctx.path("media/tmp"), projectId: job.projectId, scope: job.jobId + ":media", signal: ctx.signal });

  const people = film.requests.some((r) => r.kind === "person");
  let commons: CommonsConfig = commonsConfig();
  if (people) {
    try {
      commons = o.commons ? await o.commons(ctx) : await loadCommonsConfig(fs, ctx.roots.data);
    } catch (e) {
      throw new Error("The Commons settings could not be read (plugin-data/eo-shorts/config/config.json): " + errorMessage(e));
    }
  }
  const brollDeps = film.requests.length
    ? {
        search: o.search ? o.search(ctx) : hostStockSearch(host.sdk),
        painter: (o.painter ?? canvasPainter)(),
        fetch: (o.fetch !== undefined ? o.fetch : typeof fetch === "function" ? (u, i) => fetch(u, i as RequestInit) as never : null) as FetchLike | null,
      }
    : null;
  const hasPictures = plan.scenes.some((s) => (s.plan.assets ?? []).length > 0);
  const imageExtra = hasPictures && o.imageOptions ? o.imageOptions(ctx) : {};

  const notes = { broll: "", images: "" };
  const say = () => ctx.note([notes.broll, notes.images].filter(Boolean).join(" · ") || "Finding footage and pictures…");
  const [broll, images] = await runJointly<[BrollRun | null, JobImagesResult | null]>(ctx.signal, [
    async (signal) => {
      if (!brollDeps) return null;
      notes.broll = "B-roll: " + film.requests.length + " shot(s)…";
      say();
      const r = await (o.runBroll ?? runBroll)(
        film.requests,
        {
          fs,
          runtime: host.runtime,
          search: brollDeps.search,
          callModel: o.judge === false ? null : (c) => client.callModel({ ...c, signal: c.signal ?? signal }),
          painter: brollDeps.painter,
          fetch: brollDeps.fetch,
          commons,
          ...(finder ? { estimateCx: (clip: string) => estimateCx(finder, clip) } : {}),
          log: (e) => {
            if (e.type === "broll.start" || e.type === "broll.done") void ctx.event(String(e.type), e);
          },
        },
        { jobId: job.jobId, media: ctx.path("media"), signal, maxImagesPerCall: maxImages, candidatesPerCall: Math.max(1, Math.floor(maxImages / 2)), ...(o.broll ?? {}) },
      );
      notes.broll = "B-roll done";
      say();
      return r;
    },
    async (signal) => {
      if (!hasPictures) return null;
      return (o.images ?? generateJobImages)({
        host,
        roots: ctx.roots,
        dir: ctx.dir,
        projectId: job.projectId,
        scenes: plan.scenes.map((s) => ({ sceneId: s.sceneId, plan: s.plan })),
        media: imageRole,
        signal,
        note: (m) => {
          notes.images = m;
          say();
        },
        warn: (m) => ctx.warn(m),
        event: (type, data) => ctx.event(type, data),
        ...imageExtra,
      });
    },
  ]);
  const results = new Map((broll?.results ?? []).map((r) => [r.id, r]));
  const judged = (broll?.results ?? []).find((r) => r.judge.provider !== "none" && r.judge.model !== "none");
  if (judged) {
    job.models["broll.judge"] = { provider: judged.judge.provider, model: judged.judge.model };
    await ctx.saveJob();
  }

  const stillOf = new Map<string, string>();
  for (const s of film.shots) {
    const r = results.get(s.requestId);
    if (s.source !== "person" || !r?.pick) continue;
    const win = shotWindow(s.shot.layout, style);
    let path = r.pick.localPath;
    if (finder) {
      try {
        ctx.note("Framing the photo of " + (s.shot.name ?? s.requestId) + "…");
        path = (await faceCrop(host, finder, r.pick.localPath, win.width / win.height, { signal: ctx.signal })).path;
      } catch (e) {
        ctx.warn(s.requestId + ": the photo was not cut around the face (" + errorMessage(e).slice(0, 160) + "); it is drawn centred.");
      }
    }
    stillOf.set(s.requestId, path);
  }

  const pictureEntries = images?.manifest.pictures ?? [];
  const madeAs = (sceneId: string, kept: PlanJson) => {
    const keys = (kept.assets ?? []).map((a) => sceneId + "/" + a.id + ": ");
    return (images?.manifest.fallbacks ?? []).filter((f) => keys.some((k) => f.startsWith(k)) && !/: no picture \(/.test(f));
  };
  const scenes: MediaScene[] = [];
  const allFallbacks: string[] = [];
  for (const scene of plan.scenes) {
    const shots = film.shots.filter((x) => x.sceneId === scene.sceneId);
    const missingShots = shots
      .filter((x) => (x.source === "stock-video" || x.source === "person") && !results.get(x.requestId)?.pick)
      .map((x) => ({ k: x.k, why: film.refused.find((f) => f.requestId === x.requestId)?.reason ?? shortWhy(results.get(x.requestId)) }));
    const missingPictures = (scene.plan.assets ?? [])
      .filter((a) => !pictureEntries.some((p) => p.sceneId === scene.sceneId && p.assetId === a.id && p.status === "ok" && p.file))
      .map((a) => {
        const e = pictureEntries.find((p) => p.sceneId === scene.sceneId && p.assetId === a.id);
        return { id: a.id, why: e?.error?.message ?? (images ? "not made" : "picture generation did not run") };
      });
    const eff = effectivePlan(scene.plan, style, { missingShots, missingPictures });
    const planRel = MEDIA_REL.plan(scene.sceneId);
    await ensureDir(fs, ctx.path("media/plans"));
    await writeJsonAtomic(fs, ctx.path(planRel), eff.plan);
    const fallbacks = [...eff.fallbacks, ...madeAs(scene.sceneId, eff.plan)];
    scenes.push({ sceneId: scene.sceneId, start: scene.start, end: scene.end, plan: planRel, kind: eff.kind, ...sceneFiles(ctx, scene, eff.plan, shots, results, stillOf, pictureEntries), fallbacks });
    allFallbacks.push(...fallbacks);
  }
  for (const r of broll?.results ?? []) {
    if (r.pick && r.pick.fit === "unjudged") allFallbacks.push(r.id + ": " + (r.kind === "person" ? "photo" : "clip") + " not judged (" + (r.pick.notJudged ?? "no verdict") + "), the first that passed the checks");
  }
  for (const f of allFallbacks) ctx.fallback(f);
  const retry = [
    ...(broll?.results ?? []).filter((r) => r.status === "error" || r.retry).map((r) => r.id),
    ...pictureEntries.filter((p) => p.status !== "ok" && p.error?.kind === "unavailable").map((p) => p.sceneId + "/" + p.assetId),
  ];
  if (retry.length) ctx.warn("Asked again on the next run (an outage decided them): " + retry.join(", ") + ".");
  const shotRows: MediaShot[] = film.shots.map((s) => {
    const r = results.get(s.requestId);
    return {
      id: s.requestId,
      sceneId: s.sceneId,
      k: s.k,
      source: s.source,
      from: s.from,
      to: s.to,
      status: r?.status ?? (s.source === "podcast" ? null : film.refused.some((f) => f.requestId === s.requestId) ? "refused" : null),
      sourceKey: r?.pick?.sourceKey ?? null,
      fit: r?.pick?.fit ?? null,
      cxSource: r?.pick?.cxSource ?? null,
      fallback: r?.fallback ?? film.refused.find((f) => f.requestId === s.requestId)?.reason ?? null,
      retry: r?.retry?.code ?? (r?.status === "error" ? "error" : null),
    };
  });
  const judges = [...new Map((broll?.results ?? []).filter((r) => r.judge.provider !== "none").map((r) => [r.judge.provider + "|" + r.judge.model, { provider: r.judge.provider, model: r.judge.model }])).values()];
  const media: MediaJson = {
    schema: MEDIA_SCHEMA,
    film: job.film,
    fps,
    durationFrames: plan.durationFrames,
    scenes,
    shots: shotRows,
    pictures: pictureEntries.map((p) => ({ sceneId: p.sceneId, assetId: p.assetId, status: p.status, file: p.file, via: p.via, pieces: !!p.pieces, error: p.error?.message ?? null })),
    images: images ? "media/images/manifest.json" : null,
    judge: judges,
    retry,
    fallbacks: allFallbacks,
  };
  const credits: CreditEntry[] = broll ? creditsFor(broll.results) : [];
  await writeJsonAtomic(fs, ctx.path(MEDIA_REL.credits), { schema: "eo-media-credits/1", entries: credits });
  await writeJsonAtomic(fs, ctx.path(MEDIA_REL.media), media);

  const clips = scenes.reduce((n, s) => n + Object.keys(s.stock).length, 0);
  const photos = scenes.reduce((n, s) => n + Object.keys(s.stills).length, 0);
  const pics = scenes.reduce((n, s) => n + Object.keys(s.pictures).length, 0);
  return {
    outputs: [MEDIA_REL.media, MEDIA_REL.credits, ...scenes.map((s) => s.plan)],
    calls: judged ? ["broll.judge"] : [],
    note: clips + " clip(s), " + photos + " photo(s), " + pics + " picture(s)" + (allFallbacks.length ? ", " + allFallbacks.length + " fallback(s)" : "") + (retry.length ? ", " + retry.length + " to ask again" : ""),
    data: { broll: broll?.summary ?? null, images: images ? { generated: images.manifest.generated, cacheHits: images.manifest.cacheHits, failed: images.failed.length, ms: images.manifest.ms } : null, refused: film.refused },
  };
}

function sceneFiles(
  ctx: StageContext,
  scene: PlannedScene,
  plan: PlanJson,
  shots: SceneShot[],
  results: Map<string, ShotResult>,
  stillOf: Map<string, string>,
  pictures: JobImagesResult["manifest"]["pictures"],
): Pick<MediaScene, "pictures" | "stills" | "stock"> {
  const rel = (abs: string) => jobRel(ctx.dir, abs);
  const out: Pick<MediaScene, "pictures" | "stills" | "stock"> = { pictures: {}, stills: {}, stock: {} };
  for (const a of plan.assets ?? []) {
    const e = pictures.find((p) => p.sceneId === scene.sceneId && p.assetId === a.id && p.status === "ok" && p.file);
    if (!e) throw new Error("Scene " + scene.sceneId + " keeps picture " + a.id + " but it has no file.");
    out.pictures[a.id] = e.file!;
  }
  (plan.shots ?? []).forEach((sh, k) => {
    if (sh.source !== "stock-video" && sh.source !== "person") return;
    const s = shots.find((x) => x.k === k);
    const r = s ? results.get(s.requestId) : undefined;
    if (!s || !r?.pick) throw new Error("Scene " + scene.sceneId + " keeps shot " + k + " but it has no " + (sh.source === "person" ? "photo" : "clip") + ".");
    if (sh.source === "person") out.stills["shot-" + k] = rel(stillOf.get(s.requestId) ?? r.pick.localPath);
    else out.stock["shot-" + k] = { path: rel(r.pick.localPath), startSeconds: 0, cx: r.pick.cx };
  });
  return out;
}
