import type { Rgba } from "./png.ts";
import { resizeLanczosRgba } from "./lanczos.ts";

export type Aspect = "square" | "wide" | "tall";

export const CANVAS: Record<Aspect, { width: number; height: number }> = {
  square: { width: 1024, height: 1024 },
  wide: { width: 1536, height: 1024 },
  tall: { width: 1024, height: 1536 },
};
export const KEEP: Record<Aspect, number> = { square: 900, wide: 1536, tall: 1536 };
export const CAROUSEL_SCALE = 900 / 1024;
export const SUBJECT_ALPHA = 8;
export const ORIENT_MIN = 1.25;
export const ALPHA_SNAP_FROM = 250;
export const MIN_TRANSPARENT_SHARE = 0.2;
export const CORNER_MAX_ALPHA = SUBJECT_ALPHA;

export type AlphaStats = {
  pixels: number;
  zero: number;
  partial: number;
  opaque: number;
  maxAlpha: number;
  corners: [number, number, number, number];
  subjectBox: [number, number, number, number] | null;
};

export function alphaStats(img: Rgba): AlphaStats {
  const { width: w, height: h, data } = img;
  let zero = 0;
  let opaque = 0;
  let maxAlpha = 0;
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y += 1) {
    let row = y * w * 4 + 3;
    for (let x = 0; x < w; x += 1, row += 4) {
      const a = data[row];
      if (a === 0) zero += 1;
      else if (a === 255) opaque += 1;
      if (a > maxAlpha) maxAlpha = a;
      if (a > SUBJECT_ALPHA) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        y1 = y;
      }
    }
  }
  const n = w * h;
  const at = (x: number, y: number) => data[(y * w + x) * 4 + 3];
  return {
    pixels: n,
    zero: zero / n,
    partial: (n - zero - opaque) / n,
    opaque: opaque / n,
    maxAlpha,
    corners: [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)],
    subjectBox: x1 >= 0 ? [x0, y0, x1 + 1, y1 + 1] : null,
  };
}

export type Acceptance = { ok: boolean; reasons: string[]; stats: AlphaStats };

export function acceptCutout(img: Rgba, o: { hasAlphaChannel: boolean; pixFmt?: string; checkCorners?: boolean }): Acceptance {
  const stats = alphaStats(img);
  const reasons: string[] = [];
  if (!o.hasAlphaChannel) reasons.push("no alpha channel (" + (o.pixFmt || "opaque") + ")");
  if (stats.zero < MIN_TRANSPARENT_SHARE) reasons.push("only " + (stats.zero * 100).toFixed(1) + "% of the canvas is transparent (needs 20%)");
  if (o.checkCorners !== false && stats.corners.some((a) => a > CORNER_MAX_ALPHA)) reasons.push("corners not transparent (alpha " + stats.corners.join("/") + ")");
  if (!stats.subjectBox) reasons.push("no subject (nothing above alpha 8)");
  return { ok: reasons.length === 0, reasons, stats };
}

export function cropRgba(img: Rgba, x0: number, y0: number, x1: number, y1: number): Rgba {
  const w = x1 - x0;
  const h = y1 - y0;
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    const s = ((y + y0) * img.width + x0) * 4;
    out.set(img.data.subarray(s, s + w * 4), y * w * 4);
  }
  return { width: w, height: h, data: out };
}

export type CropOptions = { maxSide: number; carousel?: boolean };

export type CropResult = Rgba & {
  box: [number, number, number, number];
  scale: number;
};

export function cropAlpha(img: Rgba, o: CropOptions): CropResult {
  const box = alphaStats(img).subjectBox;
  let cur = img;
  let b: [number, number, number, number] = [0, 0, img.width, img.height];
  if (box) {
    b = [Math.max(0, box[0] - 2), Math.max(0, box[1] - 2), Math.min(img.width, box[2] - 1 + 3), Math.min(img.height, box[3] - 1 + 3)];
    cur = cropRgba(img, ...b);
  }
  const s = o.carousel ? CAROUSEL_SCALE : Math.min(1, o.maxSide / Math.max(cur.width, cur.height));
  if (s < 1) {
    const w = Math.trunc(cur.width * s);
    const h = Math.trunc(cur.height * s);
    cur = resizeLanczosRgba(cur, w, h);
  } else if (cur === img) {
    cur = { width: img.width, height: img.height, data: new Uint8Array(img.data) };
  }
  return { ...cur, box: b, scale: s < 1 ? s : 1 };
}

export function snapAlpha(img: Rgba, from = ALPHA_SNAP_FROM): number {
  let n = 0;
  const d = img.data;
  for (let i = 3; i < d.length; i += 4) {
    if (d[i] >= from && d[i] !== 255) {
      d[i] = 255;
      n += 1;
    }
  }
  return n;
}

export function orientationOk(width: number, height: number, aspect: Aspect): boolean {
  if (aspect === "wide") return width / height >= ORIENT_MIN;
  if (aspect === "tall") return height / width >= ORIENT_MIN;
  return true;
}
