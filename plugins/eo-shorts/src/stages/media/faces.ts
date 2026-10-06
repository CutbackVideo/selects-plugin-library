import type { Host } from "../../host/types.ts";
import { encode, pictureInputFormat, pictureNeedsFormat, pictureOutputFormat, probeMedia } from "../../host/ffmpeg.ts";
import { ensureDir, readBytes, readJsonIfExists, removeFile, renameWithRetry, statFile, writeJsonAtomic } from "../../host/fs.ts";
import { randomHex } from "../../host/util.ts";
import { analysisSize } from "../../speaker/ffmpegPass.ts";
import { plausibleFaces, toSourceFaces, type FaceBox } from "../../speaker/faces.ts";
import type { FaceDetector } from "../../speaker/yunet/runtime.ts";

export type FoundFace = { face: FaceBox; size: { width: number; height: number }; cx: number; cy: number };

export type FaceFinder = {
  find(path: string, atSeconds?: number | null): Promise<FoundFace | null>;
};

export function largestFace(faces: FaceBox[], size: { width: number; height: number }): FoundFace | null {
  const best = [...faces].sort((a, b) => b.w * b.h * b.score - a.w * a.h * a.score)[0];
  if (!best) return null;
  return { face: best, size, cx: (best.x + best.w / 2) / size.width, cy: (best.y + best.h / 2) / size.height };
}

export function hostFaceFinder(host: Pick<Host, "fs" | "runtime">, o: { tmpDir: string; detector: () => Promise<FaceDetector>; signal?: AbortSignal | null }): FaceFinder {
  const fs = host.fs;
  return {
    async find(path, atSeconds = null) {
      await ensureDir(fs, o.tmpDir);
      const inputFormat = pictureNeedsFormat(path) ? pictureInputFormat(path, await readBytes(fs, path)) : [];
      const m = await probeMedia(host.runtime, path, { fs, tmpDir: o.tmpDir, signal: o.signal, inputFormat });
      if (!m.video || !(m.video.width > 0 && m.video.height > 0)) return null;
      const size = { width: m.video.width, height: m.video.height };
      const a = analysisSize(size.width, size.height);
      const duration = m.video.durationSec ?? m.durationSec;
      const at = atSeconds ?? (duration && duration > 0.2 ? duration / 2 : null);
      const out = fs.join(o.tmpDir, "face-" + randomHex(6) + ".bgr");
      try {
        await encode(
          host.runtime,
          ["-hide_banner", "-nostdin", "-v", "error", "-y", ...(at != null ? ["-ss", at.toFixed(3)] : []), ...inputFormat, "-i", path, "-frames:v", "1", "-vf", "scale=" + a.width + ":" + a.height + ":flags=area", "-pix_fmt", "bgr24", "-f", "rawvideo", out],
          { outPath: out, fs, signal: o.signal, timeoutMs: 60_000 },
        );
        const bgr = await readBytes(fs, out);
        if (bgr.length < a.width * a.height * 3) return null;
        const rows = await (await o.detector()).detect(bgr, a.width, a.height);
        return largestFace(plausibleFaces(toSourceFaces(rows, a.width, a.height, size.width, size.height), size.width, size.height), size);
      } finally {
        await removeFile(fs, out);
      }
    },
  };
}

export async function estimateCx(finder: FaceFinder, clip: string): Promise<number | null> {
  const f = await finder.find(clip);
  return f ? Math.round(f.cx * 1000) / 1000 : null;
}

export type Crop = { x: number; y: number; w: number; h: number };

const even = (v: number) => Math.max(2, 2 * Math.floor(v / 2));

export function faceWindow(size: { width: number; height: number }, centre: { cx: number; cy: number }, aspect: number): Crop | null {
  const W = size.width, H = size.height;
  if (Math.abs(W / H / aspect - 1) <= 0.02) return null;
  if (W / H > aspect) {
    const w = Math.min(W, even(H * aspect));
    const x = Math.min(W - w, Math.max(0, Math.round(centre.cx * W - w / 2)));
    return { x, y: 0, w, h: H };
  }
  const h = Math.min(H, even(W / aspect));
  const y = Math.min(H - h, Math.max(0, Math.round(centre.cy * H - h * 0.4)));
  return { x: 0, y, w: W, h };
}

export type FaceCrop = { path: string; crop: Crop | null; face: { cx: number; cy: number } | null; reused: boolean };

export async function faceCrop(host: Pick<Host, "fs" | "runtime">, finder: FaceFinder, photo: string, aspect: number, o: { signal?: AbortSignal | null } = {}): Promise<FaceCrop> {
  const fs = host.fs;
  const found = await finder.find(photo, null);
  if (!found) return { path: photo, crop: null, face: null, reused: false };
  const crop = faceWindow(found.size, found, aspect);
  const face = { cx: Math.round(found.cx * 1000) / 1000, cy: Math.round(found.cy * 1000) / 1000 };
  if (!crop) return { path: photo, crop: null, face, reused: false };
  const out = photo.replace(/\.[A-Za-z0-9]+$/, "") + ".still.jpg";
  const side = out + ".json";
  const st = (await statFile(fs, photo));
  const key = { schema: "eo-still-crop/1", photo: fs.basename(photo), bytes: st?.size ?? null, crop };
  const had = await readJsonIfExists<typeof key | null>(fs, side, null);
  if (had && JSON.stringify(had) === JSON.stringify(key) && (await fs.exists(out))) return { path: out, crop, face, reused: true };
  await removeFile(fs, side);
  const part = out.replace(/\.jpg$/, ".part.jpg");
  const inputFormat = pictureNeedsFormat(photo) ? pictureInputFormat(photo, await readBytes(fs, photo)) : [];
  await encode(
    host.runtime,
    ["-hide_banner", "-nostdin", "-v", "error", "-y", ...inputFormat, "-i", photo, "-frames:v", "1", "-vf", "crop=" + crop.w + ":" + crop.h + ":" + crop.x + ":" + crop.y, "-q:v", "2", ...pictureOutputFormat(part), part],
    { outPath: part, fs, signal: o.signal, timeoutMs: 60_000 },
  );
  await removeFile(fs, out);
  await renameWithRetry(fs, part, out);
  await writeJsonAtomic(fs, side, key);
  return { path: out, crop, face, reused: false };
}
