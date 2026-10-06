import type { Host } from "../../host/types.ts";
import { analyze, encode, imagePattern } from "../../host/ffmpeg.ts";
import { ensureDir, readBytes, removeFile, renameWithRetry, writeFileAtomic } from "../../host/fs.ts";
import { decodeWav, type Pcm } from "../sound/wavCodec.ts";
import { sheetChunks, sheetLayout, type SheetPainter } from "../../broll/sheet.ts";
import { blackdetectArgs, extractArgs, sampleLabel, TILE, type Sample } from "./frames.ts";

type H = Pick<Host, "fs" | "runtime">;

export function decodeArgs(mp4: string, wav: string, sampleRate: number): string[] {
  return ["-hide_banner", "-nostdin", "-nostats", "-y", "-i", mp4, "-map", "0:a:0", "-vn", "-ac", "2", "-ar", String(sampleRate), "-c:a", "pcm_f32le", wav];
}

export async function decodeAudio(h: H, mp4: string, tmpWav: string, sampleRate: number, signal?: AbortSignal | null): Promise<Pcm> {
  await removeFile(h.fs, tmpWav);
  try {
    await encode(h.runtime, decodeArgs(mp4, tmpWav, sampleRate), { fs: h.fs, outPath: tmpWav, signal, timeoutMs: 120_000 });
    return decodeWav(await readBytes(h.fs, tmpWav));
  } finally {
    await removeFile(h.fs, tmpWav);
  }
}

export async function blackdetect(h: H, mp4: string, signal?: AbortSignal | null): Promise<string> {
  return (await analyze(h.runtime, blackdetectArgs(mp4), { signal, timeoutMs: 180_000 })).stderr;
}

export type Pulled = { jpg: Map<number, string>; gray: Map<number, Uint8Array>; width: number; height: number; missing: number[] };

export async function pullFrames(h: H, mp4: string, samples: Sample[], dir: string, signal?: AbortSignal | null): Promise<Pulled> {
  const fs = h.fs;
  await ensureDir(fs, dir);
  for (const name of (await fs.readdir(dir))) if (/^(f\d+|tmp-\d+)\.jpg$|^gray\.raw$/.test(name)) (await removeFile(fs, fs.join(dir, name)));
  const frames = samples.map((s) => s.frame);
  const raw = fs.join(dir, "gray.raw");
  await encode(h.runtime, extractArgs(mp4, frames, imagePattern(fs, dir, "tmp-%03d.jpg"), raw), { fs, outPath: raw, signal, timeoutMs: 300_000 });
  const bytes = await readBytes(fs, raw);
  await removeFile(fs, raw);
  const size = TILE.width * TILE.height;
  const got = Math.floor(bytes.length / size);
  const jpg = new Map<number, string>();
  const gray = new Map<number, Uint8Array>();
  for (const [i, f] of frames.entries()) {
    const tmp = fs.join(dir, "tmp-" + String(i).padStart(3, "0") + ".jpg");
    if ((await fs.exists(tmp))) {
      const out = fs.join(dir, "f" + String(f).padStart(4, "0") + ".jpg");
      await renameWithRetry(fs, tmp, out);
      jpg.set(f, out);
    }
    if (i < got) gray.set(f, bytes.subarray(i * size, (i + 1) * size));
  }
  const missing = frames.filter((f) => !jpg.has(f) || !gray.has(f));
  if (jpg.size !== gray.size || missing.some((f) => f < Math.max(...jpg.keys(), -1))) throw new Error("ffmpeg pulled " + jpg.size + " pictures and " + got + " gray frames of the " + frames.length + " asked for.");
  return { jpg, gray, width: TILE.width, height: TILE.height, missing };
}

export const SHEET = { columns: 6, perSheet: 24, maxSide: 1700, frameMaxSide: TILE.width, label: 22, quality: 0.86 } as const;

export async function paintSheets(h: Pick<Host, "fs">, painter: SheetPainter, samples: Sample[], pulled: Pulled, dir: string): Promise<string[]> {
  const fs = h.fs;
  for (const name of (await fs.readdir(dir))) if (/^contact-\d+\.jpg$/.test(name)) (await removeFile(fs, fs.join(dir, name)));
  const out: string[] = [];
  const shown = samples.filter((s) => pulled.jpg.has(s.frame));
  for (const [n, chunk] of sheetChunks(shown.length, SHEET.perSheet).entries()) {
    const list = chunk.map((i) => shown[i]);
    const frames: Uint8Array[] = [];
    for (const s of list) frames.push(await readBytes(fs, pulled.jpg.get(s.frame)!));
    const layout = sheetLayout(list.length, TILE.width, TILE.height, { columns: SHEET.columns, perSheet: SHEET.perSheet, maxSide: SHEET.maxSide, frameMaxSide: SHEET.frameMaxSide, label: SHEET.label } as never);
    const file = fs.join(dir, "contact-" + (n + 1) + ".jpg");
    await writeFileAtomic(fs, file, await painter.paintSheet(frames, list.map(sampleLabel), layout, SHEET.quality));
    out.push(file);
  }
  return out;
}
