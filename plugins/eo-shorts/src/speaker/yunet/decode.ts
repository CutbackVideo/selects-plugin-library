import { YUNET_DIVISOR, YUNET_STRIDES } from "./model.ts";

export const YUNET_SCORE_THRESHOLD = 0.85;
export const YUNET_NMS_THRESHOLD = 0.3;
export const YUNET_TOP_K = 5000;

export type YuNetFace = {
  box: [number, number, number, number];
  landmarks: [number, number][];
  score: number;
};

export type DecodeOptions = { score?: number; nms?: number; topK?: number };

export function paddedSize(width: number, height: number): { width: number; height: number } {
  const up = (x: number) => Math.floor((x - 1) / YUNET_DIVISOR + 1) * YUNET_DIVISOR;
  return { width: up(width), height: up(height) };
}

export function bgrToBlob(bgr: Uint8Array, width: number, height: number, out?: Float32Array): { data: Float32Array; width: number; height: number } {
  const pad = paddedSize(width, height);
  const plane = pad.width * pad.height;
  if (bgr.length < width * height * 3) throw new Error("A face frame has " + bgr.length + " bytes, not " + width * height * 3 + ".");
  const data = out && out.length === 3 * plane ? out : new Float32Array(3 * plane);
  if (out === data) data.fill(0);
  for (let y = 0; y < height; y += 1) {
    let p = y * width * 3;
    let o = y * pad.width;
    for (let x = 0; x < width; x += 1, p += 3, o += 1) {
      data[o] = bgr[p];
      data[plane + o] = bgr[p + 1];
      data[2 * plane + o] = bgr[p + 2];
    }
  }
  return { data, width: pad.width, height: pad.height };
}

export type YuNetOutputs = Record<string, ArrayLike<number>>;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const f32 = Math.fround;

export function decodeYuNet(outputs: YuNetOutputs, padWidth: number, padHeight: number, o: DecodeOptions = {}): YuNetFace[] {
  const threshold = f32(o.score == null ? YUNET_SCORE_THRESHOLD : o.score);
  const faces: YuNetFace[] = [];
  for (const stride of YUNET_STRIDES) {
    const cols = Math.floor(padWidth / stride), rows = Math.floor(padHeight / stride);
    const cls = outputs["cls_" + stride], obj = outputs["obj_" + stride], bbox = outputs["bbox_" + stride], kps = outputs["kps_" + stride];
    if (!cls || !obj || !bbox || !kps) throw new Error("The face model gave no output for stride " + stride + ".");
    if (cls.length !== rows * cols || bbox.length !== rows * cols * 4 || kps.length !== rows * cols * 10) throw new Error("The face model's stride-" + stride + " output does not fit a " + padWidth + "x" + padHeight + " input.");
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const idx = r * cols + c;
        const score = f32(Math.sqrt(f32(clamp01(cls[idx]) * clamp01(obj[idx]))));
        if (score < threshold) continue;
        const cx = f32((c + bbox[idx * 4]) * stride), cy = f32((r + bbox[idx * 4 + 1]) * stride);
        const w = f32(f32(Math.exp(bbox[idx * 4 + 2])) * stride), h = f32(f32(Math.exp(bbox[idx * 4 + 3])) * stride);
        const landmarks: [number, number][] = [];
        for (let n = 0; n < 5; n += 1) landmarks.push([f32((kps[idx * 10 + 2 * n] + c) * stride), f32((kps[idx * 10 + 2 * n + 1] + r) * stride)]);
        faces.push({ box: [f32(cx - w / 2), f32(cy - h / 2), w, h], landmarks, score });
      }
    }
  }
  if (faces.length <= 1) return faces;
  return nmsBoxes(faces, threshold, f32(o.nms == null ? YUNET_NMS_THRESHOLD : o.nms), o.topK == null ? YUNET_TOP_K : o.topK).map((i) => faces[i]);
}

type IntRect = [number, number, number, number];
const intRect = (b: [number, number, number, number]): IntRect => [Math.trunc(b[0]), Math.trunc(b[1]), Math.trunc(b[2]), Math.trunc(b[3])];

export function rectOverlap(a: IntRect, b: IntRect): number {
  const aa = a[2] * a[3], ab = b[2] * b[3];
  if (aa + ab <= 0) return 1;
  const x1 = Math.max(a[0], b[0]), y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[0] + a[2], b[0] + b[2]), y2 = Math.min(a[1] + a[3], b[1] + b[3]);
  const inter = x2 > x1 && y2 > y1 ? (x2 - x1) * (y2 - y1) : 0;
  return f32(1 - f32(1 - inter / (aa + ab - inter)));
}

export function nmsBoxes(faces: YuNetFace[], scoreThreshold: number, nmsThreshold: number, topK: number): number[] {
  const order = faces.map((f, i) => ({ s: f.score, i })).filter((p) => p.s > scoreThreshold);
  order.sort((a, b) => b.s - a.s || a.i - b.i);
  if (topK > 0 && order.length > topK) order.length = topK;
  const rects = faces.map((f) => intRect(f.box));
  const kept: number[] = [];
  for (const { i } of order) if (kept.every((k) => rectOverlap(rects[i], rects[k]) <= nmsThreshold)) kept.push(i);
  return kept;
}
