import type { HostFs, HostRuntime } from "../host/types.ts";
import { encode, pictureInputFormat, pictureOutputFormat } from "../host/ffmpeg.ts";
import { readBytes, renameWithRetry } from "../host/fs.ts";
import { sha256Hex } from "../host/util.ts";
import { dataUri } from "./base64.ts";

type Layer = Record<string, any>;

export function imageSize(b: Uint8Array): { w: number; h: number; type: "png" | "jpeg" | "webp" } {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { w: dv.getUint32(16), h: dv.getUint32(20), type: "png" };
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) {
        i += 1;
        continue;
      }
      const m = b[i + 1];
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7) || m === 0xff) {
        i += m === 0xff ? 1 : 2;
        continue;
      }
      const len = dv.getUint16(i + 2);
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: dv.getUint16(i + 5), w: dv.getUint16(i + 7), type: "jpeg" };
      i += 2 + len;
    }
    throw new Error("A JPEG without a frame header.");
  }
  if (b.length > 30 && String.fromCharCode(...b.subarray(0, 4)) === "RIFF" && String.fromCharCode(...b.subarray(8, 12)) === "WEBP") {
    const chunk = String.fromCharCode(...b.subarray(12, 16));
    if (chunk === "VP8X") return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)), type: "webp" };
    if (chunk === "VP8L") {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return { w: 1 + (bits & 0x3fff), h: 1 + ((bits >>> 14) & 0x3fff), type: "webp" };
    }
    if (chunk === "VP8 ") return { w: dv.getUint16(26, true) & 0x3fff, h: dv.getUint16(28, true) & 0x3fff, type: "webp" };
  }
  throw new Error("Not a PNG, JPEG or WebP picture.");
}

export function layerAssetIds(layer: Layer): string[] {
  return [...(layer.assetId ? [String(layer.assetId)] : []), ...((layer.assetSequence?.ids as string[]) ?? [])];
}

export function displaySize(ex: { layers: Layer[]; camera?: any }, id: string, w: number, h: number): { w: number; h: number; scale: number } {
  const camera = Math.max(1, ...((ex.camera?.keyframes ?? []) as { scale?: number }[]).map((k) => k.scale ?? 1));
  let required = 0;
  for (const layer of ex.layers) {
    if (!layerAssetIds(layer).includes(id)) continue;
    const pose: Record<string, number> = { width: 0, height: 0, scale: 1 };
    for (const key of layer.keyframes ?? []) {
      Object.assign(pose, key);
      required = Math.max(required, Math.max(pose.width / w, pose.height / h) * pose.scale * camera);
    }
  }
  if (!(required > 0)) throw new Error("Picture " + id + " has no measurable size in the scene.");
  return resampledSize(w, h, required);
}

function resampledSize(w: number, h: number, required: number): { w: number; h: number; scale: number } {
  const s = Math.min(1, required);
  const tw = Math.max(1, Math.ceil(w * s));
  const exact = (h * tw) / w;
  const fl = Math.floor(exact);
  const th = Math.max(1, exact - fl === 0.5 ? (fl % 2 === 0 ? fl : fl + 1) : Math.round(exact));
  return { w: tw, h: th, scale: required };
}

export const STILL_PUSH_MAX = 1.06;

export type StillShot = { id: string; still?: boolean; layout?: string; move?: string; box?: { w: number; h: number } };

export function stillDisplaySize(shot: StillShot, w: number, h: number, frame: { width: number; height: number } = { width: 1080, height: 1920 }): { w: number; h: number; scale: number } {
  const box = shot.layout === "inset" && shot.box ? shot.box : { w: frame.width, h: frame.height };
  const required = Math.max(box.w / w, box.h / h) * (shot.move === "slow-push" ? STILL_PUSH_MAX : 1);
  if (!(required > 0)) throw new Error("Still " + shot.id + " has no measurable size in the scene.");
  return resampledSize(w, h, required);
}

export type WebpMode = "lossless" | number;

export function webpArgs(src: string, dst: string, w: number, h: number, mode: WebpMode, srcHead?: Uint8Array | null): string[] {
  return [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    ...pictureInputFormat(src, srcHead),
    "-i",
    src,
    "-vf",
    "scale=" + w + ":" + h + ":flags=lanczos,format=rgba",
    "-frames:v",
    "1",
    "-c:v",
    "libwebp",
    "-lossless",
    mode === "lossless" ? "1" : "0",
    "-q:v",
    String(mode === "lossless" ? 100 : mode),
    "-compression_level",
    "6",
    ...pictureOutputFormat(dst),
    dst,
  ];
}

export type PackedPicture = {
  id: string;
  source: string;
  sourceSha256: string;
  sourceSize: [number, number];
  size: [number, number];
  displayScale: number;
  file: string;
  bytes: number;
  sha256: string;
  mode: WebpMode;
  url: string;
  inline: boolean;
};

export type PictureHost = { fs: HostFs; runtime: HostRuntime | null; signal?: AbortSignal | null };

const webpName = (stem: string, w: number, h: number, mode: WebpMode) => stem.replace(/[^A-Za-z0-9_-]/g, "_") + "." + w + "x" + h + (mode === "lossless" ? "" : ".q" + mode) + ".webp";

export function packPicture(h: PictureHost, ex: { layers: Layer[]; camera?: any }, id: string, source: string, dir: string, mode: WebpMode, inline: boolean): Promise<PackedPicture> {
  return packAt(h, id, id, (w, hh) => displaySize(ex, id, w, hh), source, dir, mode, inline);
}

export function packStill(h: PictureHost, shot: StillShot, frame: { width: number; height: number } | undefined, source: string, dir: string, mode: WebpMode, inline: boolean): Promise<PackedPicture> {
  return packAt(h, shot.id, "still-" + shot.id, (w, hh) => stillDisplaySize(shot, w, hh, frame), source, dir, mode, inline);
}

async function packAt(h: PictureHost, id: string, stem: string, sizeOf: (w: number, h: number) => { w: number; h: number; scale: number }, source: string, dir: string, mode: WebpMode, inline: boolean): Promise<PackedPicture> {
  const srcBytes = await readBytes(h.fs, source);
  const size = imageSize(srcBytes);
  const d = sizeOf(size.w, size.h);
  if (!(await h.fs.exists(dir))) (await h.fs.mkdir(dir, { recursive: true }));
  const file = h.fs.join(dir, webpName(stem, d.w, d.h, mode));
  const sourceSha256 = await sha256Hex(srcBytes);
  const stamp = file + ".source-sha256";
  const fresh = (await h.fs.exists(file)) && (await h.fs.exists(stamp)) && new TextDecoder().decode(await readBytes(h.fs, stamp)).trim() === sourceSha256;
  if (!fresh) {
    const tmp = file + ".part.webp";
    await encode(h.runtime, webpArgs(source, tmp, d.w, d.h, mode, srcBytes), { fs: h.fs, outPath: tmp, signal: h.signal, timeoutMs: 60_000 });
    await renameWithRetry(h.fs, tmp, file);
    await h.fs.writeFile(stamp, sourceSha256 + "\n");
  }
  const bytes = await readBytes(h.fs, file);
  const got = imageSize(bytes);
  if (got.w !== d.w || got.h !== d.h) throw new Error("Picture " + id + " came out " + got.w + "x" + got.h + ", not " + d.w + "x" + d.h + ".");
  let url: string;
  if (inline) url = dataUri("image/webp", bytes);
  else {
    if (typeof h.fs.pathToLocalURL !== "function") throw new Error("This Selects build cannot name plugin-data files for a Motion Graphic (FileSystem.pathToLocalURL); update Selects.");
    url = await h.fs.pathToLocalURL(file);
  }
  return {
    id,
    source,
    sourceSha256,
    sourceSize: [size.w, size.h],
    size: [d.w, d.h],
    displayScale: d.scale,
    file,
    bytes: bytes.length,
    sha256: await sha256Hex(bytes),
    mode,
    url,
    inline,
  };
}

export function sceneAssetIds(ex: { layers: Layer[] }): string[] {
  const ids: string[] = [];
  for (const l of ex.layers) for (const id of layerAssetIds(l)) if (!ids.includes(id)) ids.push(id);
  return ids;
}

export function pictureReceipt(p: PackedPicture) {
  const { url, ...rest } = p;
  return { ...rest, url: p.inline ? "data:image/webp;base64,(" + p.bytes + " bytes)" : url };
}
