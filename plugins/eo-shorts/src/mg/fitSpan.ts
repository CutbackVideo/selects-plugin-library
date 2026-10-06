import type { Execution } from "../../engine/compiler/core.mjs";
import { sha256Hex } from "../host/util.ts";
import { aliasedExecution, buildSceneFonts, sceneFaceUses, type FaceUse, type SceneFonts } from "./sceneFonts.ts";
import { layerAssetIds, packPicture, packStill, type PackedPicture, type StillShot, type WebpMode } from "./pictures.ts";
import { assertInstallable } from "./staticCheck.ts";
import { installScript, partLabel, scriptFits, SCRIPT_BUDGET_BYTES } from "./installScript.ts";
import { partExecution, splitRuns } from "./partition.ts";
import { stillShots, type Span } from "./footageSpans.ts";
import { SCENE_RUNTIME_SHA256, SCENE_RUNTIME_TSX } from "./sceneRuntimeSource.ts";
import type { PackageContext, SceneInput } from "./packageScene.ts";

export type SpanUnit = {
  scene: SceneInput;
  span: Span;
  start: number;
  end: number;
  execution: Execution;
  offset: number;
  pictureIds: string[];
  stillIds: string[];
};

export type UnitPictures = { layers: Record<string, PackedPicture>; stills: Record<string, PackedPicture> };

export type Ahead = { pictures: string[]; fontRules: string[]; fontLoads: string[] };
export const NOTHING_AHEAD: Ahead = { pictures: [], fontRules: [], fontLoads: [] };

export type BuiltPart = {
  unit: SpanUnit;
  layerIndex: number;
  layerCount: number;
  parameters: Record<string, unknown>;
  layerIds: string[];
  fonts: SceneFonts;
  uses: FaceUse[];
  pictures: PackedPicture[];
  trialBytes: number;
};

export const INLINE_QUALITIES: WebpMode[] = [96, 90, 80];

export const STILL_WEBP_QUALITY = 95;
export const stillMode = (mode: WebpMode): WebpMode => (mode === "lossless" ? STILL_WEBP_QUALITY : Math.min(mode, STILL_WEBP_QUALITY));

export const budgetOf = (ctx: PackageContext) => ctx.budget ?? SCRIPT_BUDGET_BYTES;
const forcedParts = (ctx: PackageContext, s: SceneInput) => Math.max(1, s.minParts ?? 0, ctx.minParts ?? 0);
export const runtimeOf = async (ctx: PackageContext) => ({ tsx: ctx.tsx ?? SCENE_RUNTIME_TSX, sha: ctx.tsxSha256 ?? (ctx.tsx ? await sha256Hex(ctx.tsx) : SCENE_RUNTIME_SHA256) });

export function longestLabels(sceneId: string, n: number): string[] {
  return new Array(Math.max(1, n)).fill(partLabel(sceneId, Math.max(0, n - 1), Math.max(1, n), "0".repeat(12)));
}

export async function scenePictures(ctx: PackageContext, s: SceneInput, mode: WebpMode, inline: boolean, pictureIds: string[], stillIds: string[]): Promise<UnitPictures> {
  const host = { fs: ctx.fs, runtime: ctx.runtime, signal: ctx.signal };
  const out: UnitPictures = { layers: {}, stills: {} };
  if (!pictureIds.length && !stillIds.length) return out;
  const dir = ctx.fs.join(ctx.sceneDir(s.sceneId), "pictures");
  for (const id of pictureIds) {
    const src = s.pictures?.[id];
    if (!src) throw new Error("Scene " + s.sceneId + " draws picture " + id + ", but no picture file was given for it.");
    out.layers[id] = await packPicture(host, s.execution, id, src, dir, mode, inline);
  }
  const shots = stillShots(s.execution);
  for (const id of stillIds) {
    const src = s.stills?.[id];
    if (!src) throw new Error("Scene " + s.sceneId + " draws still shot " + id + " (a person's photo), but no photo file was given for it.");
    out.stills[id] = await packStill(host, shots.get(id) as StillShot, s.execution.canvas, src, dir, stillMode(mode), inline);
  }
  return out;
}

async function buildPart(ctx: PackageContext, u: SpanUnit, layers: Execution["layers"], layerIndex: number, layerCount: number, pics: UnitPictures, ahead: Ahead, n: number): Promise<BuiltPart> {
  const rt = await runtimeOf(ctx);
  const { execution, nativePartition } = partExecution(u.execution, layers, layerIndex, layerCount, u.span.transparent);
  const uses = sceneFaceUses(execution);
  const fonts = await buildSceneFonts(uses, { subsetter: ctx.subsetter, readFont: ctx.readFont, rename: ctx.rename });
  const ids = [...new Set(execution.layers.flatMap((l) => layerAssetIds(l)))];
  const assets: Record<string, string> = {};
  for (const id of ids) assets[id] = pics.layers[id].url;
  const stills = u.span.transparent ? [] : u.stillIds;
  const footageUrls: Record<string, string[]> = {};
  for (const id of stills) footageUrls[id] = [pics.stills[id].url];
  const own = fonts.faces.map((f) => f.css);
  const aheadRules = layerIndex === 0 ? ahead.fontRules.filter((r) => !own.includes(r)) : [];
  const aheadLoads = layerIndex === 0 ? ahead.fontLoads.filter((l) => !fonts.fontLoads.includes(l)) : [];
  const parameters: Record<string, unknown> = {
    execution: aliasedExecution(execution, fonts.aliases),
    assets,
    ...(stills.length && { footageUrls }),
    prefetch: ahead.pictures,
    fontCss: fonts.fontCss + aheadRules.join(""),
    fontLoads: [...fonts.fontLoads, ...aheadLoads],
    nativeTransparent: u.span.transparent,
    ...(nativePartition && { nativePartition }),
    ...(u.offset > 0 && { nativeFrameOffset: u.offset }),
    engine: rt.sha.slice(0, 12),
  };
  assertInstallable(rt.tsx, parameters, u.scene.sceneId);
  const labels = longestLabels(u.scene.sceneId, n);
  const trial = installScript(ctx.guard, { sceneId: u.scene.sceneId, start: u.start, end: u.end, index: labels.length - 1, count: labels.length, label: labels[0], labels, tsx: rt.tsx, parameters });
  return {
    unit: u,
    layerIndex,
    layerCount,
    parameters,
    layerIds: execution.layers.map((l) => l.id),
    fonts,
    uses,
    pictures: [...ids.map((id) => pics.layers[id]), ...stills.map((id) => pics.stills[id])],
    trialBytes: scriptFits(trial).bytes,
  };
}

async function wholePart(ctx: PackageContext, u: SpanUnit, pics: UnitPictures, ahead: Ahead, n: number): Promise<BuiltPart[] | null> {
  if (forcedParts(ctx, u.scene) > 1 && !u.stillIds.length) return null;
  const b = await buildPart(ctx, u, u.execution.layers, 0, 1, pics, ahead, n);
  return b.trialBytes <= budgetOf(ctx) ? [b] : null;
}

async function splitParts(ctx: PackageContext, u: SpanUnit, pics: UnitPictures, ahead: Ahead, n: number): Promise<BuiltPart[] | null> {
  if (u.stillIds.length) return null;
  const layers = u.execution.layers;
  const forced = forcedParts(ctx, u.scene);
  const cap = Math.max(1, Math.ceil(layers.length / forced));
  let runs: Execution["layers"][];
  try {
    runs = await splitRuns(layers, async (run, index) => {
      if (forced > 1 && run.length > cap) return false;
      return (await buildPart(ctx, u, run, index, 2, pics, ahead, n)).trialBytes <= budgetOf(ctx);
    });
  } catch {
    return null;
  }
  if (runs.length < 2) return null;
  const built: BuiltPart[] = [];
  for (let i = 0; i < runs.length; i += 1) built.push(await buildPart(ctx, u, runs[i], i, runs.length, pics, ahead, n));
  return built.every((b) => b.trialBytes <= budgetOf(ctx)) ? built : null;
}

type Fit = { built: BuiltPart[]; notes: string[] };

export async function fitSpan(ctx: PackageContext, u: SpanUnit, files: UnitPictures, ahead: Ahead, n: number, warnings: string[]): Promise<BuiltPart[]> {
  const sid = u.scene.sceneId;
  const fontsAhead = ahead.fontRules.length > 0;
  const dropped = "Scene " + sid + (u.offset > 0 ? " (from scene frame " + u.offset + ")" : "") + " has no room for the next graphic's fonts; the next graphic's text may be missing on its first frame.";
  const inlineFirst = u.start === 0 && u.pictureIds.length + u.stillIds.length > 0;
  const inline = (mode: WebpMode) => scenePictures(ctx, u.scene, mode, true, u.pictureIds, u.stillIds);
  const best = inlineFirst ? await inline("lossless") : files;

  const whole = async (pics: UnitPictures, a: Ahead, notes: string[] = []): Promise<Fit | null> => {
    const b = await wholePart(ctx, u, pics, a, n);
    if (b) return { built: b, notes };
    if (!fontsAhead) return null;
    const c = await wholePart(ctx, u, pics, { ...a, fontRules: [], fontLoads: [] }, n);
    return c && { built: c, notes: [dropped, ...notes] };
  };
  const split = async (pics: UnitPictures, a: Ahead, notes: string[] = []): Promise<Fit | null> => {
    const withFonts = fontsAhead ? await splitParts(ctx, u, pics, a, n) : null;
    const without = await splitParts(ctx, u, pics, { ...a, fontRules: [], fontLoads: [] }, n);
    if (withFonts && (!without || withFonts.length <= without.length)) return { built: withFonts, notes };
    return without && { built: without, notes: fontsAhead ? [dropped, ...notes] : notes };
  };

  let fit = await whole(best, ahead);
  if (inlineFirst) {
    for (const q of INLINE_QUALITIES) {
      if (fit) break;
      fit = await whole(await inline(q), ahead, ["The first scene's pictures are inline at WebP quality " + q + " to fit the script budget."]);
    }
  }
  fit ??= await split(best, ahead);
  if (!fit && inlineFirst) {
    const files0 = "The first scene's pictures do not fit inline; they are drawn from files and may be blank on the scene's first frames.";
    const own = [...u.pictureIds.map((id) => files.layers[id].url), ...u.stillIds.map((id) => files.stills[id].url)];
    const a: Ahead = { ...ahead, pictures: [...new Set([...own, ...ahead.pictures])] };
    fit = (await whole(files, a, [files0])) ?? (await split(files, a, [files0]));
  }
  if (!fit) throw new Error("Scene " + sid + " does not fit in Motion Graphic scripts of " + budgetOf(ctx) + " bytes" + (u.stillIds.length ? " (a span with still shots cannot be split by layer)" : ", even split by layer") + ".");
  warnings.push(...fit.notes);
  return fit.built;
}

export function aheadOf(ctx: PackageContext, parts: BuiltPart[]): Ahead {
  const pictures: string[] = [];
  for (const p of parts) {
    const urls = [...Object.values(p.parameters.assets as Record<string, string>), ...Object.values((p.parameters.footageUrls ?? {}) as Record<string, string[]>).flat()];
    for (const url of urls) if (/^local:\/\//i.test(url) && !pictures.includes(url)) pictures.push(url);
  }
  if (ctx.prefetchFonts === false) return { pictures, fontRules: [], fontLoads: [] };
  return { pictures, fontRules: parts.flatMap((p) => p.fonts.faces.map((f) => f.css)), fontLoads: parts.flatMap((p) => p.fonts.fontLoads) };
}
