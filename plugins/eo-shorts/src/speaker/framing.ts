import type { SegmentFaces } from "./faces.ts";

export type Size = { width: number; height: number };

export type ClipTransformValue = {
  scale: { x: number; y: number };
  position: { x: number; y: number };
  rotation: number;
  anchor: { x: number; y: number };
};

export type PortraitFill = { fit: number; s: number; cropW: number; cropH: number };

export function portraitFill(src: Size, out: Size): PortraitFill {
  if (!(src.width > 0 && src.height > 0 && out.width > 0 && out.height > 0)) throw new Error("Frame sizes must be positive.");
  const fit = Math.min(out.width / src.width, out.height / src.height);
  const sx = out.width / (src.width * fit);
  const sy = out.height / (src.height * fit);
  const s = Math.max(sx, sy);
  return { fit, s, cropW: out.width / (fit * s), cropH: out.height / (fit * s) };
}

export function clampCentre(c: number, size: number, crop: number): number {
  const lo = crop / 2, hi = size - crop / 2;
  if (lo >= hi) return size / 2;
  return Math.min(hi, Math.max(lo, c));
}

export function transformForCentre(cx: number, cy: number | null, src: Size, out: Size): ClipTransformValue {
  const { fit, s, cropW, cropH } = portraitFill(src, out);
  const x = clampCentre(cx, src.width, cropW);
  const y = clampCentre(cy == null ? src.height / 2 : cy, src.height, cropH);
  const px = ((src.width / 2 - x) * fit * s) / out.height * 100;
  const py = ((y - src.height / 2) * fit * s) / out.height * 100;
  return { scale: { x: s, y: s }, position: { x: px, y: py === 0 ? 0 : py }, rotation: 0, anchor: { x: 0, y: 0 } };
}

export function cropWindow(cx: number, src: Size, out: Size): { x0: number; w: number; h: number } {
  const { cropW, cropH } = portraitFill(src, out);
  const x = clampCentre(cx, src.width, cropW);
  return { x0: x - cropW / 2, w: cropW, h: cropH };
}

export type CentreRule = "contained" | "median" | "motion-too-wide" | "no-face";

export function segmentCentre(faces: SegmentFaces, src: Size, out: Size): { cx: number; cy: number | null; rule: CentreRule } {
  const { cropW } = portraitFill(src, out);
  if (faces.cx == null) return { cx: src.width / 2, cy: null, rule: "no-face" };
  const med = faces.cx;
  if (faces.padLeft == null || faces.padRight == null) return { cx: clampCentre(med, src.width, cropW), cy: null, rule: "median" };
  const left = Math.max(0, faces.padLeft);
  const right = Math.min(src.width, faces.padRight);
  const lower = Math.max(cropW / 2, right - cropW / 2);
  const upper = Math.min(src.width - cropW / 2, left + cropW / 2);
  if (lower > upper + 1e-6) return { cx: clampCentre(med, src.width, cropW), cy: null, rule: "motion-too-wide" };
  const cx = Math.min(upper, Math.max(lower, med));
  return { cx, cy: null, rule: cx === med ? "median" : "contained" };
}

export type Affine = { a: number; b: number; c: number; d: number; e: number; f: number };

export function sourceToOutput(t: ClipTransformValue, src: Size, out: Size): Affine {
  const fit = Math.min(out.width / src.width, out.height / src.height);
  const unit = out.height / 100;
  const anchorUnit = (src.height * fit) / 100;
  const ax = t.anchor.x * anchorUnit, ay = -t.anchor.y * anchorUnit;
  const a = t.scale.x * fit, d = t.scale.y * fit;
  const e = t.position.x * unit + ax - t.scale.x * ax;
  const f = -t.position.y * unit + ay - t.scale.y * ay;
  return { a, b: 0, c: 0, d, e, f };
}

export function visibleSourceRect(t: ClipTransformValue, src: Size, out: Size): { x0: number; y0: number; x1: number; y1: number } {
  const m = sourceToOutput(t, src, out);
  const sx = (x: number) => (x - m.e) / m.a + src.width / 2;
  const sy = (y: number) => (y - m.f) / m.d + src.height / 2;
  return { x0: sx(-out.width / 2), y0: sy(-out.height / 2), x1: sx(out.width / 2), y1: sy(out.height / 2) };
}
