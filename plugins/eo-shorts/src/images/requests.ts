import { CANVAS, KEEP, type Aspect } from "./cutout.ts";
import { canonicalJson, sha256Hex } from "../host/util.ts";

export const SUFFIX =
  " Exactly one subject, isolated as a cutout on a real transparent alpha background; no frame, no white rectangle," +
  " no drawn checkerboard, no cast shadow outside the subject, keep the whole subject inside the canvas;" +
  " no text, letters, numbers, logos or watermark.";

export const PIECES_SUFFIX: Record<string, string> = {
  radial:
    " Show the subject whole and uncut, with no cut lines, centred on the canvas with its middle at the centre," +
    " its outline compact and round; anything that holds it reaches in from outside and grips its edge.",
  columns: " Show the subject whole and uncut, filling a wide rectangle edge to edge.",
  rows: " Show the subject whole and uncut, filling a tall rectangle edge to edge.",
  grid: " Show the subject whole and uncut, filling a rectangle edge to edge.",
};

export const OPAQUE_SUFFIX =
  " Exactly one subject, isolated on a plain pure white background; no frame, no cast shadow, keep the whole subject" +
  " inside the canvas with white space around it; no text, letters, numbers, logos or watermark.";

export const ORIENT: Partial<Record<Aspect, string>> = {
  wide: " Composition: the subject's long axis runs horizontally from the left edge to the right edge; the subject is much wider than it is tall.",
  tall: " Composition: the subject's long axis runs vertically from top to bottom; the subject is much taller than it is wide.",
};
export const ORIENT_TRIES = 2;

export const LAB_IMAGE_INPUT = { quality: "medium", background: "transparent", output_format: "png", num_images: 1 };

export type PlanAsset = {
  id: string;
  prompt?: string;
  aspect?: string;
  sequence?: string[] | null;
  cut?: string | null;
  pieces?: unknown[] | null;
  [k: string]: unknown;
};

export type ScenePlan = { sceneId: string; plan: { assets?: PlanAsset[] | null; [k: string]: unknown } };

export type ImageTarget = { sceneId: string; assetId: string };

export type ImageRequest = {
  sha: string;
  sha24: string;
  modelId: string;
  prompt: string;
  aspect: Aspect;
  canvas: { width: number; height: number };
  keep: number;
  carousel: boolean;
  pieces: { cut: string; count: number } | null;
  checkCorners: boolean;
  input: Record<string, unknown>;
  targets: ImageTarget[];
};

const ASPECTS: Aspect[] = ["square", "wide", "tall"];

export function assetPrompt(a: PlanAsset, suffix = SUFFIX): string {
  const piecesSuffix = Array.isArray(a.pieces) && a.pieces.length && typeof a.cut === "string" ? PIECES_SUFFIX[a.cut] ?? "" : "";
  return String(a.prompt ?? "").trim() + piecesSuffix + suffix;
}

export function drawPrompt(req: Pick<ImageRequest, "prompt" | "aspect">, orientAttempt: number): string {
  return orientAttempt > 0 ? req.prompt + (ORIENT[req.aspect] ?? "") : req.prompt;
}

export function opaquePrompt(req: Pick<ImageRequest, "prompt" | "aspect">, orientAttempt: number): string {
  const base = req.prompt.endsWith(SUFFIX) ? req.prompt.slice(0, -SUFFIX.length) + OPAQUE_SUFFIX : req.prompt + OPAQUE_SUFFIX;
  return orientAttempt > 0 ? base + (ORIENT[req.aspect] ?? "") : base;
}

export function cacheKeyText(modelId: string, prompt: string, carousel: boolean, aspect: Aspect, input: Record<string, unknown>): string {
  const extra = { ...input };
  delete extra.prompt;
  delete extra.image_size;
  const inputTag = canonicalJson(extra) === canonicalJson(LAB_IMAGE_INPUT) ? "" : "|input=" + canonicalJson(extra);
  return modelId + prompt + (carousel ? "|canvas" : "") + (aspect === "square" ? "" : "|" + aspect) + inputTag;
}

export type ImageRequestSet = {
  requests: ImageRequest[];
  skipped: (ImageTarget & { reason: string })[];
  warnings: string[];
};

export async function imageRequests(scenes: ScenePlan[], modelId: string, input: Record<string, unknown> = LAB_IMAGE_INPUT): Promise<ImageRequestSet> {
  const byKey = new Map<string, ImageRequest>();
  const skipped: ImageRequestSet["skipped"] = [];
  const warnings: string[] = [];
  for (const { sceneId, plan } of scenes) {
    const assets = Array.isArray(plan?.assets) ? plan.assets : [];
    const carousel = new Set<string>();
    for (const a of assets) if (Array.isArray(a.sequence) && a.sequence.length) for (const id of [a.id, ...a.sequence]) carousel.add(id);
    for (const a of assets) {
      if (!a || typeof a.id !== "string" || !a.id) continue;
      const at = sceneId + "/" + a.id;
      if (typeof a.prompt !== "string" || !a.prompt.trim()) {
        skipped.push({ sceneId, assetId: a.id, reason: "no prompt" });
        warnings.push(at + ": no prompt");
        continue;
      }
      let aspect = (a.aspect ?? "square") as Aspect;
      if (!ASPECTS.includes(aspect)) {
        warnings.push(at + ": unknown aspect " + JSON.stringify(a.aspect) + ", drawn square");
        aspect = "square";
      }
      const isCarousel = carousel.has(a.id);
      const prompt = assetPrompt(a);
      const sha = await sha256Hex(cacheKeyText(modelId, prompt, isCarousel, aspect, input));
      const pieces =
        Array.isArray(a.pieces) && a.pieces.length && typeof a.cut === "string" ? { cut: a.cut, count: a.pieces.length } : null;
      if (pieces && !PIECES_SUFFIX[pieces.cut]) warnings.push(at + ": unknown cut " + JSON.stringify(pieces.cut));
      const existing = byKey.get(sha);
      if (existing) {
        existing.targets.push({ sceneId, assetId: a.id });
        continue;
      }
      byKey.set(sha, {
        sha,
        sha24: sha.slice(0, 24),
        modelId,
        prompt,
        aspect,
        canvas: CANVAS[aspect],
        keep: KEEP[aspect],
        carousel: isCarousel,
        pieces,
        checkCorners: !(pieces && pieces.cut !== "radial"),
        input: { ...input },
        targets: [{ sceneId, assetId: a.id }],
      });
    }
  }
  return { requests: [...byKey.values()], skipped, warnings };
}
