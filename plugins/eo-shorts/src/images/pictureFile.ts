import type { HostFs, HostRuntime } from "../host/types.ts";
import { ensureDir, readBytes, removeFile } from "../host/fs.ts";
import { encode, pictureInputFormat, probeJson } from "../host/ffmpeg.ts";
import { randomHex } from "../host/util.ts";
import { PngUnsupportedError, decodePng, isPng, type Rgba } from "./png.ts";

export type Picture = Rgba & { hasAlpha: boolean; pixFmt: string; bytes: number; decoder: "png" | "ffmpeg" };

export function pixFmtHasAlpha(pixFmt: string): boolean {
  return /^(rgba|bgra|argb|abgr|ya8|ya16|yuva|gbrap|pal8)/.test(pixFmt);
}

export async function readPicture(
  fs: HostFs,
  path: string,
  o: { runtime?: HostRuntime | null; tmpDir?: string; signal?: AbortSignal | null } = {},
): Promise<Picture> {
  const bytes = await readBytes(fs, path);
  if (isPng(bytes)) {
    try {
      const p = await decodePng(bytes);
      return { width: p.width, height: p.height, data: p.data, hasAlpha: p.hasAlpha, pixFmt: p.pixFmt, bytes: bytes.length, decoder: "png" };
    } catch (e) {
      if (!(e instanceof PngUnsupportedError)) throw e;
    }
  }
  if (!o.runtime || !o.tmpDir) throw new Error("Cannot read " + path + " without ffmpeg (not a plain PNG).");
  ensureDir(fs, o.tmpDir);
  const inputFormat = pictureInputFormat(path, bytes);
  const probe = await probeJson(o.runtime, [...inputFormat, "-select_streams", "v:0", "-show_entries", "stream=width,height,pix_fmt", path], { fs, tmpDir: o.tmpDir, signal: o.signal });
  const s = (probe.streams?.[0] ?? {}) as { width?: number; height?: number; pix_fmt?: string };
  const width = Number(s.width);
  const height = Number(s.height);
  if (!(width > 0 && height > 0)) throw new Error("ffprobe found no picture in " + path + ".");
  const raw = fs.join(o.tmpDir, "picture-" + randomHex(8) + ".rgba");
  try {
    await encode(o.runtime, ["-v", "error", "-y", ...inputFormat, "-i", path, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgba", raw], { outPath: raw, fs, signal: o.signal, timeoutMs: 60_000 });
    const data = await readBytes(fs, raw);
    if (data.length !== width * height * 4) throw new Error("ffmpeg returned " + data.length + " bytes for a " + width + "x" + height + " picture.");
    const pixFmt = String(s.pix_fmt || "");
    return { width, height, data, hasAlpha: pixFmtHasAlpha(pixFmt), pixFmt, bytes: bytes.length, decoder: "ffmpeg" };
  } finally {
    removeFile(fs, raw);
  }
}
