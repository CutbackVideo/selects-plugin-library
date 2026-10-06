import { encode, probeMedia, type MediaProbe } from "../host/ffmpeg.ts";
import { readJsonIfExists, removeFile, renameWithRetry, statFile, writeJsonAtomic } from "../host/fs.ts";
import type { HostFs, HostRuntime } from "../host/types.ts";

export function cutWindow(interval: [number, number], need: number, duration: number): [number, number] {
  const [s, e] = interval;
  if (!(e > s) || !(need > 0)) throw new RangeError("cut needs a positive interval and length");
  if (!(duration + 1e-9 >= need)) throw new RangeError("the source is " + round3(duration) + " s; the shot needs " + need + " s");
  const start = Math.max(0, Math.floor(Math.min(s, duration - need) * 1000 + 1e-6) / 1000);
  return [start, round3(start + need)];
}

export function fallbackWindow(need: number, duration: number): [number, number] {
  const head = Math.min(0.4, Math.max(0, duration - need));
  return cutWindow([head, duration], need, duration);
}

const round3 = (x: number) => Math.round(x * 1000) / 1000;

export function cutArgs(url: string, start: number, seconds: number, out: string): string[] {
  return [
    "-hide_banner", "-nostdin", "-nostats", "-v", "error", "-y",
    "-ss", start.toFixed(3), "-i", url, "-t", seconds.toFixed(3),
    "-map", "0:V:0", "-an", "-sn", "-dn",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    out,
  ];
}

export interface CutResult {
  path: string;
  probe: MediaProbe;
  bytes: number;
  ms: number;
  reused: boolean;
}

export const CUT_TOLERANCE_S = 0.1;
export const CUT_RECIPE = "x264-veryfast-crf16-yuv420p-noaudio/1";

export interface ClipKey {
  schema: "broll-clip/1";
  recipe: string;
  url: string;
  start: number;
  seconds: number;
  bytes?: number;
}

export function clipKeyPath(out: string): string {
  return out.replace(/\.mp4$/i, "") + ".json";
}

const sameCut = (k: ClipKey | null, url: string, start: number, seconds: number) =>
  !!k && k.schema === "broll-clip/1" && k.recipe === CUT_RECIPE && k.url === url && round3(k.start) === round3(start) && round3(k.seconds) === round3(seconds);

export async function clipHolds(fs: HostFs, out: string, url: string, start: number, seconds: number): Promise<boolean> {
  try {
    if (!(await fs.exists(out))) return false;
    const k = await readJsonIfExists<ClipKey | null>(fs, clipKeyPath(out), null);
    return sameCut(k, url, start, seconds) && (k!.bytes == null || k!.bytes === (await statFile(fs, out))?.size);
  } catch {
    return false;
  }
}

export async function cutClip(
  d: { fs: HostFs; runtime: HostRuntime | null; signal?: AbortSignal; tmpDir: string },
  url: string,
  start: number,
  seconds: number,
  out: string,
): Promise<CutResult> {
  const t0 = Date.now();
  const ok = (p: MediaProbe) => !!p.video && p.durationSec != null && Math.abs(p.durationSec - seconds) <= CUT_TOLERANCE_S + 1 / 24;
  const keyPath = clipKeyPath(out);
  if (await clipHolds(d.fs, out, url, start, seconds)) {
    try {
      const p = await probeMedia(d.runtime, out, { fs: d.fs, tmpDir: d.tmpDir, signal: d.signal });
      if (ok(p)) return { path: out, probe: p, bytes: (await statFile(d.fs, out))?.size ?? 0, ms: Date.now() - t0, reused: true };
    } catch {
    }
  }
  await removeFile(d.fs, keyPath);
  if ((await d.fs.exists(keyPath))) throw new Error("could not remove the old clip record " + keyPath);
  const part = out.replace(/\.mp4$/i, "") + ".part.mp4";
  await removeFile(d.fs, part);
  await encode(d.runtime, cutArgs(url, start, seconds, part), { fs: d.fs, outPath: part, signal: d.signal, timeoutMs: 180_000 });
  const probe = await probeMedia(d.runtime, part, { fs: d.fs, tmpDir: d.tmpDir, signal: d.signal });
  if (!ok(probe)) {
    await removeFile(d.fs, part);
    throw new Error("the cut is " + probe.durationSec + " s long, not " + seconds.toFixed(3) + " s");
  }
  await removeFile(d.fs, out);
  await renameWithRetry(d.fs, part, out);
  const bytes = (await statFile(d.fs, out))?.size ?? 0;
  const key: ClipKey = { schema: "broll-clip/1", recipe: CUT_RECIPE, url, start: round3(start), seconds: round3(seconds), bytes };
  await writeJsonAtomic(d.fs, keyPath, key);
  return { path: out, probe, bytes, ms: Date.now() - t0, reused: false };
}
