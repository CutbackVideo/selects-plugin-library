import type { Execution } from "../../engine/compiler/core.mjs";
import type { HostFs, HostRuntime } from "../host/types.ts";
import { sha256Hex } from "../host/util.ts";
import type { Subsetter } from "./hbSubset.ts";
import { faceReceipt, type FontBytes } from "./sceneFonts.ts";
import { proveGlyphs, PROOF_TOLERANCE_PX, type GlyphProof } from "./glyphProof.ts";
import { pictureReceipt, sceneAssetIds } from "./pictures.ts";
import { installScript, labelDigest, partLabel, scriptFits, type DraftGuard, type PartInstall } from "./installScript.ts";
import { sceneSpans, spanLayers, type Span } from "./footageSpans.ts";
import { aheadOf, budgetOf, fitSpan, NOTHING_AHEAD, runtimeOf, scenePictures, type Ahead, type BuiltPart, type SpanUnit, type UnitPictures } from "./fitSpan.ts";

export type SceneInput = {
  sceneId: string;
  start: number;
  end: number;
  execution: Execution;
  pictures?: Record<string, string>;
  stills?: Record<string, string>;
  minParts?: number;
};

export type PackageContext = {
  fs: HostFs;
  runtime: HostRuntime | null;
  signal?: AbortSignal | null;
  subsetter: Subsetter;
  readFont: FontBytes;
  guard: DraftGuard;
  sceneDir: (sceneId: string) => string;
  rename?: Record<string, string>;
  doc?: Document | null;
  budget?: number;
  tsx?: string;
  tsxSha256?: string;
  minParts?: number;
  prefetchFonts?: boolean;
};

export type { Ahead };

export type PartPackage = PartInstall & {
  ownFontCss: string;
  ownFontLoads: string[];
  script: string;
  scriptBytes: number;
  scriptSha256: string;
  fonts: (ReturnType<typeof faceReceipt> & { proof: GlyphProof | null })[];
  pictures: ReturnType<typeof pictureReceipt>[];
  layerIds: string[];
  span: Span;
};

export type ScenePackage = {
  schema: "eo-mg-package/1";
  sceneId: string;
  start: number;
  end: number;
  runtimeSha256: string;
  spans: Span[];
  budget: number;
  parts: PartPackage[];
  warnings: string[];
  ms: number;
};

export function sceneUnits(s: SceneInput): SpanUnit[] {
  const spans = sceneSpans(s.execution, s.end - s.start);
  if (!spans.length) throw new Error("Scene " + s.sceneId + " has no frames.");
  return spans.map((span) => {
    const execution = spans.length > 1 ? { ...s.execution, layers: spanLayers(s.execution, s.execution.layers, span) } : s.execution;
    return { scene: s, span, start: s.start + span.from, end: s.start + span.to, execution, offset: span.from, pictureIds: sceneAssetIds(execution), stillIds: span.stills };
  });
}

async function finalParts(ctx: PackageContext, s: SceneInput, built: BuiltPart[]): Promise<PartPackage[]> {
  const rt = await runtimeOf(ctx);
  const count = built.length;
  const digests = await Promise.all(built.map((b, i) => labelDigest(rt.sha, b.parameters, b.unit.start, b.unit.end, i, count)));
  const labels = built.map((b, i) => partLabel(s.sceneId, i, count, digests[i]));
  const out: PartPackage[] = [];
  for (const [i, b] of built.entries()) {
    const part: PartInstall = { sceneId: s.sceneId, start: b.unit.start, end: b.unit.end, index: i, count, label: labels[i], labels, tsx: rt.tsx, parameters: b.parameters };
    const script = installScript(ctx.guard, part);
    out.push({
      ...part,
      ownFontCss: b.fonts.fontCss,
      ownFontLoads: b.fonts.fontLoads,
      script,
      scriptBytes: scriptFits(script).bytes,
      scriptSha256: await sha256Hex(script),
      fonts: b.fonts.faces.map((f) => ({ ...faceReceipt(f), proof: null })),
      pictures: b.pictures.map(pictureReceipt),
      layerIds: b.layerIds,
      span: b.unit.span,
    });
  }
  return out;
}

async function packageScene(ctx: PackageContext, s: SceneInput, files: UnitPictures, aheadNext: Ahead, warnings: string[]): Promise<{ units: SpanUnit[]; built: BuiltPart[][]; parts: PartPackage[] }> {
  const units = sceneUnits(s);
  let n = units.length;
  for (let round = 0; round < 64; round += 1) {
    const notes: string[] = [];
    const built: BuiltPart[][] = new Array(units.length);
    let ahead = aheadNext;
    for (let k = units.length - 1; k >= 0; k -= 1) {
      built[k] = await fitSpan(ctx, units[k], files, ahead, n, notes);
      ahead = aheadOf(ctx, built[k]);
    }
    const total = built.reduce((a, b) => a + b.length, 0);
    if (total > n) {
      n = total;
      continue;
    }
    const parts = await finalParts(ctx, s, built.flat());
    if (parts.some((p) => p.scriptBytes > budgetOf(ctx))) {
      n += 1;
      continue;
    }
    warnings.push(...notes);
    for (const [k, b] of built.entries()) {
      if (b.length > 1) warnings.push("Scene " + s.sceneId + (units.length > 1 ? " (scene frames " + units[k].span.from + "-" + units[k].span.to + ")" : "") + " is split into " + b.length + " graphics to fit the script budget.");
    }
    return { units, built, parts };
  }
  throw new Error("Scene " + s.sceneId + " could not be sized into Motion Graphic scripts of " + budgetOf(ctx) + " bytes.");
}

async function proveParts(ctx: PackageContext, s: SceneInput, built: BuiltPart[], parts: PartPackage[]): Promise<void> {
  if (!ctx.doc) return;
  const bad: string[] = [];
  for (const [i, b] of built.entries()) {
    const proofs = await proveGlyphs(ctx.doc, b.fonts.faces, b.uses, ctx.readFont);
    parts[i].fonts = parts[i].fonts.map((f, j) => ({ ...f, proof: proofs[j] ?? null }));
    for (const p of proofs) {
      if (!p.failures.length && p.maxDiffPx <= PROOF_TOLERANCE_PX) continue;
      const first = p.failures[0];
      bad.push(p.family + " (" + p.file + "): " + p.failures.length + " of " + p.checked + " texts differ, up to " + p.maxDiffPx.toFixed(3) + " px" + (first ? ", e.g. " + JSON.stringify(first.text) + " at " + first.weight + " " + first.size + "px" : ""));
    }
  }
  if (bad.length) throw new Error("Scene " + s.sceneId + " is not packaged: its font subsets do not measure as their full fonts (tolerance " + PROOF_TOLERANCE_PX + " px): " + bad.join("; ") + ".");
}

export async function packageScenes(scenes: SceneInput[], ctx: PackageContext): Promise<ScenePackage[]> {
  const sorted = [...scenes].sort((a, b) => a.start - b.start);
  const rt = await runtimeOf(ctx);
  const files: UnitPictures[] = [];
  for (const s of sorted) {
    const units = sceneUnits(s);
    files.push(await scenePictures(ctx, s, "lossless", false, sceneAssetIds(s.execution), [...new Set(units.flatMap((u) => u.stillIds))]));
  }
  const out: ScenePackage[] = new Array(sorted.length);
  let ahead: Ahead = NOTHING_AHEAD;
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const t0 = Date.now();
    const s = sorted[i];
    const warnings: string[] = [];
    const { units, built, parts } = await packageScene(ctx, s, files[i], ahead, warnings);
    await proveParts(ctx, s, built.flat(), parts);
    for (const p of parts) for (const f of p.fonts) if (f.missing) warnings.push(f.family + " has no glyph for " + JSON.stringify(f.missing) + " in scene " + s.sceneId + ".");
    out[i] = { schema: "eo-mg-package/1", sceneId: s.sceneId, start: s.start, end: s.end, runtimeSha256: rt.sha, spans: units.map((u) => u.span), budget: budgetOf(ctx), parts, warnings, ms: Date.now() - t0 };
    ahead = aheadOf(ctx, built[0]);
  }
  return out;
}

export function packageReceipt(p: ScenePackage) {
  return {
    ...p,
    parts: p.parts.map(({ script, tsx, parameters, ownFontCss, ownFontLoads, ...rest }) => ({
      ...rest,
      parameterBytes: new TextEncoder().encode(JSON.stringify(parameters)).length,
      nativeTransparent: (parameters as { nativeTransparent?: unknown }).nativeTransparent,
      nativePartition: (parameters as { nativePartition?: unknown }).nativePartition ?? null,
      nativeFrameOffset: (parameters as { nativeFrameOffset?: unknown }).nativeFrameOffset ?? 0,
      prefetch: (parameters as { prefetch?: unknown }).prefetch,
      fontLoads: (parameters as { fontLoads?: unknown }).fontLoads,
    })),
  };
}
