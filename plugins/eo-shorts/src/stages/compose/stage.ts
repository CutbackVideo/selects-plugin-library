import type { StageContext, StageImpl, StageResult } from "../../jobs/runner.ts";
import { inputShaFrom } from "../../jobs/receipts.ts";
import { ensureDir, readJson, readJsonIfExists } from "../../host/fs.ts";
import { loadSubsetter } from "../../mg/hbRuntime.ts";
import type { Subsetter } from "../../mg/hbSubset.ts";
import { packagedFontSource } from "../../mg/fontPackage.ts";
import { SCENE_RUNTIME_SHA256 } from "../../mg/sceneRuntimeSource.ts";
import type { FontSource } from "../../engine/fontFaces.ts";
import type { ScenePlan } from "../../../engine/compiler/core.mjs";
import { filmStyle } from "../media/filmStyles.ts";
import { MEDIA_REL, MEDIA_SCHEMA, type MediaJson } from "../media.ts";
import { composeFilm, type ComposeInput, type ComposeReport, type ComposeScene } from "./compose.ts";
import { guardWordsSig, type SignedWord } from "./wordsGuard.ts";

export const COMPOSE_STAGE_VERSION = "eo-compose-stage/1";

export const COMPOSE_REL = { report: "compose/compose.json", execution: (sid: string) => "compose/" + sid + "/execution.json" };

export type ComposeStageOptions = {
  doc?: (ctx: StageContext) => Document;
  readFont?: (ctx: StageContext) => FontSource;
  subsetter?: (ctx: StageContext) => Promise<Subsetter>;
  compose?: Partial<Pick<ComposeInput, "compile" | "packageScenes" | "backoffMs" | "tsx" | "tsxSha256">>;
};

export function createComposeStage(o: ComposeStageOptions = {}): StageImpl {
  return {
    id: "compose",
    inputSha: (ctx) =>
      inputShaFrom(ctx.host.fs, ctx.dir, ["edit", "speaker", "media"], { version: COMPOSE_STAGE_VERSION, film: ctx.job.film, draftId: ctx.job.draftId, runtime: o.compose?.tsxSha256 ?? SCENE_RUNTIME_SHA256 }),
    run: (ctx) => runCompose(ctx, o),
  };
}

export const composeStage: StageImpl = createComposeStage();

export async function composeScenes(ctx: Pick<StageContext, "host" | "path">, media: MediaJson): Promise<ComposeScene[]> {
  const fs = ctx.host.fs;
  const abs = (rel: string) => (/^([A-Za-z]:[\\/]|[\\/])/.test(rel) ? rel : ctx.path(rel));
  const out: ComposeScene[] = [];
  for (const s of media.scenes) {
    const plan = await readJson<ScenePlan>(fs, abs(s.plan));
    const scene: ComposeScene = { sceneId: s.sceneId, start: s.start, end: s.end, plan };
    if (Object.keys(s.pictures).length) scene.pictures = Object.fromEntries(Object.entries(s.pictures).map(([k, v]) => [k, abs(v)]));
    if (Object.keys(s.stills).length) scene.stills = Object.fromEntries(Object.entries(s.stills).map(([k, v]) => [k, abs(v)]));
    if (Object.keys(s.stock).length) scene.stock = Object.fromEntries(Object.entries(s.stock).map(([k, v]) => [k, { path: abs(v.path), startSeconds: v.startSeconds, cx: v.cx }]));
    out.push(scene);
  }
  return out;
}

async function runCompose(ctx: StageContext, o: ComposeStageOptions): Promise<StageResult> {
  const { host, job } = ctx;
  const fs = host.fs;
  if (!job.draftId) throw new Error("The job has no EO draft yet (the edit stage makes it).");
  const media = await readJson<MediaJson>(fs, ctx.path(MEDIA_REL.media));
  if (media.schema !== MEDIA_SCHEMA) throw new Error(MEDIA_REL.media + " is not " + MEDIA_SCHEMA + "; the media stage must run again.");
  const scenes = await composeScenes(ctx, media);
  const edited = await readJsonIfExists<{ mainEnd?: number; words?: SignedWord[] } | null>(fs, ctx.path("edit/words.json"), null);
  if (edited?.mainEnd != null && media.durationFrames !== edited.mainEnd) {
    throw new Error("The plan covers " + media.durationFrames + " frames but the EO draft's Main ends at " + edited.mainEnd + "; the plan must be made again.");
  }
  const doc = o.doc ? o.doc(ctx) : (globalThis as { document?: Document }).document;
  if (!doc) throw new Error("Compose needs the panel's document to lay out the scenes.");
  if (!o.readFont && !fs.existsSync(fs.join(ctx.roots.skills, "fonts", "fonts.json"))) {
    throw new Error("The installed EO Shorts package has no fonts (" + fs.join(ctx.roots.skills, "fonts") + "). Install the plugin again, then Resume.");
  }
  ctx.note("Loading the font subsetter…");
  const subsetter = await (o.subsetter ? o.subsetter(ctx) : loadSubsetter(fs, ctx.roots.runtime, { progress: (s) => ctx.note(s) }));
  const readFont = o.readFont ? o.readFont(ctx) : packagedFontSource(fs, ctx.roots.skills);
  const dirs = { compose: ctx.path("compose"), footage: ctx.path("media/footage"), sound: ctx.path("sound"), tmp: ctx.path("compose/tmp") };
  for (const d of Object.values(dirs)) ensureDir(fs, d);
  const report: ComposeReport = await composeFilm({
    host,
    doc,
    projectId: job.projectId,
    draftId: job.draftId,
    style: filmStyle(job.film),
    scenes,
    dirs,
    readFont,
    subsetter,
    expect: { mainEnd: edited?.mainEnd ?? media.durationFrames, wordsSig: Array.isArray(edited?.words) ? guardWordsSig(edited!.words!) : null },
    signal: ctx.signal,
    progress: (n) => ctx.note(n),
    ...(o.compose ?? {}),
  });
  for (const w of report.warnings) ctx.warn(w);
  for (const s of report.scenes) for (const w of s.warnings) ctx.warn(s.sceneId + ": " + w);
  const cov = report.coverage;
  if (!cov.ok) throw new Error("The composed draft fails its check: " + JSON.stringify({ uncovered: cov.uncovered, graphics: cov.graphics, overlays: cov.overlays }).slice(0, 600));
  const parts = report.scenes.reduce((n, s) => n + s.parts.length, 0);
  return {
    outputs: [COMPOSE_REL.report, ...report.scenes.map((s) => COMPOSE_REL.execution(s.sceneId))],
    note: report.scenes.length + " scenes, " + parts + " graphic(s), " + report.bakes.length + " footage clip(s), " + report.effects.targets.length + " look(s)",
    data: { ms: report.ms, bakes: report.bakes.map((b) => ({ sceneId: b.sceneId, start: b.start, end: b.end, reused: b.reused })), coverage: { ok: cov.ok } },
  };
}
