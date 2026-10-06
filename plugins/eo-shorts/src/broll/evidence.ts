import { analyze, imagePattern, probeJson } from "../host/ffmpeg.ts";
import { ensureDir, readBytes, readJsonIfExists, removeFile, writeFileAtomic, writeJsonAtomic } from "../host/fs.ts";
import type { HostFs, HostRuntime } from "../host/types.ts";
import { errorMessage } from "../host/util.ts";
import { MAX_SOURCE_SECONDS } from "./search.ts";
import { base64Chars, frameLabel, SHEET_RULES, sheetChunks, sheetLayout, type SheetPainter } from "./sheet.ts";
import type { Evidence, StockVideoFile } from "./types.ts";

export const EVIDENCE_VERSION = "broll-evidence/1";
export const MAX_SHEET_CHARS = 1_500_000;
export const MAX_SAMPLES = 31;
const TAIL_SECONDS = 0.25;

export interface ProbedRendition {
  width: number;
  height: number;
  duration: number;
  frames: number | null;
}

const num = (v: unknown): number | null => {
  const x = Number(v);
  return v == null || v === "" || v === "N/A" || !Number.isFinite(x) ? null : x;
};

export function readProbe(j: { streams?: Record<string, unknown>[]; format?: Record<string, unknown> }): ProbedRendition {
  const s = (j.streams ?? [])[0];
  if (!s) throw new Error("no video stream");
  let width = Number(s.width ?? 0);
  let height = Number(s.height ?? 0);
  const side = (s.side_data_list as { rotation?: number }[] | undefined)?.find((d) => d && d.rotation != null);
  if (side && Math.abs(Number(side.rotation)) % 180 === 90) [width, height] = [height, width];
  const duration = num(s.duration) ?? num(j.format?.duration);
  if (!(width > 0 && height > 0)) throw new Error("video dimensions are unavailable");
  if (!(duration && duration > 0)) throw new Error("video duration is unavailable");
  const frames = num(s.nb_frames);
  return { width, height, duration, frames: frames && frames > 0 ? Math.round(frames) : null };
}

export function probeArgs(url: string): string[] {
  return ["-select_streams", "V:0", "-show_entries", "stream=width,height,duration,nb_frames:stream_side_data=rotation:format=duration", url];
}

export function frameSize(w: number, h: number, maxSide: number = SHEET_RULES.frameMaxSide): { width: number; height: number } {
  const s = Math.min(1, maxSide / Math.max(w, h));
  const even = (x: number) => Math.max(2, 2 * Math.round((x * s) / 2));
  return { width: even(w), height: even(h) };
}

export function sampleArgs(url: string, p: ProbedRendition, outPattern: string): string[] {
  const parts = ["isnan(prev_selected_t)", "gt(floor(t)\\,floor(prev_selected_t))", "gte(t\\," + Math.max(0, p.duration - TAIL_SECONDS).toFixed(3) + ")"];
  if (p.frames) parts.push("gte(n\\," + (p.frames - 1) + ")");
  const size = frameSize(p.width, p.height);
  return [
    "-hide_banner", "-nostdin", "-nostats", "-loglevel", "info",
    "-i", url,
    "-map", "0:V:0", "-an", "-sn", "-dn",
    "-vf", "select='" + parts.join("+") + "',showinfo,scale=" + size.width + ":" + size.height + ":flags=area,setsar=1",
    "-fps_mode", "passthrough", "-q:v", "3", "-start_number", "0", outPattern,
  ];
}

export type ShowinfoFrame = { n: number; ptsTime: number };

export function parseShowinfo(stderr: string): ShowinfoFrame[] {
  const out: ShowinfoFrame[] = [];
  for (const line of String(stderr || "").split(/\r?\n/)) {
    if (!/showinfo/i.test(line)) continue;
    const m = line.match(/\bn:\s*(\d+)\s+pts:\s*-?\d+\s+pts_time:\s*(-?[\d.]+(?:e[-+]?\d+)?)/i);
    if (m) out.push({ n: Number(m[1]), ptsTime: Number(m[2]) });
  }
  return out;
}

export function pickSamples(frames: ShowinfoFrame[]): { indexes: number[]; timestamps: number[] } {
  if (!frames.length) return { indexes: [], timestamps: [] };
  const t0 = frames[0].ptsTime;
  const indexes: number[] = [];
  frames.forEach((f, i) => {
    if (i === 0 || Math.floor(f.ptsTime) > Math.floor(frames[i - 1].ptsTime)) indexes.push(i);
  });
  if (indexes[indexes.length - 1] !== frames.length - 1) indexes.push(frames.length - 1);
  const timestamps = indexes.map((i) => Math.round((frames[i].ptsTime - t0) * 1e6) / 1e6);
  const keep = timestamps.map((t, k) => k === 0 || t > timestamps[k - 1]);
  return { indexes: indexes.filter((_, k) => keep[k]), timestamps: timestamps.filter((_, k) => keep[k]) };
}

export interface EvidenceDeps {
  fs: HostFs;
  runtime: HostRuntime | null;
  painter: SheetPainter;
  signal?: AbortSignal;
}

function manifestPath(fs: HostFs, dir: string): string {
  return fs.join(dir, "evidence.json");
}

async function cached(fs: HostFs, dir: string, key: string, url: string): Promise<Evidence | null> {
  try {
    const m = await readJsonIfExists<(Evidence & { version?: string }) | null>(fs, manifestPath(fs, dir), null);
    if (!m || m.version !== EVIDENCE_VERSION || m.sourceKey !== key || m.rendition?.url !== url || m.status === "error") return null;
    if (m.status === "ready" && !m.sheets.every((p) => fs.existsSync(p))) return null;
    return m;
  } catch {
    return null;
  }
}

export async function prepareVideoEvidence(key: string, rendition: StockVideoFile, dir: string, d: EvidenceDeps): Promise<Evidence> {
  const { fs } = d;
  const hit = await cached(fs, dir, key, rendition.url);
  if (hit) return hit;
  const t0 = Date.now();
  const base: Evidence = { sourceKey: key, kind: "video", status: "error", durationSeconds: null, timestamps: [], sheets: [], sheetChars: [], rendition };
  const finish = async (e: Evidence) => {
    const out = { ...e, elapsedMs: Date.now() - t0 };
    await writeJsonAtomic(fs, manifestPath(fs, dir), { version: EVIDENCE_VERSION, ...out });
    return out;
  };
  ensureDir(fs, dir);
  let probe: ProbedRendition;
  try {
    probe = readProbe(await probeJson(d.runtime, probeArgs(rendition.url), { fs, tmpDir: dir, signal: d.signal, timeoutMs: 45_000 }));
  } catch (e) {
    if (d.signal?.aborted) throw e;
    return finish({ ...base, code: "probe_error", reason: errorMessage(e).slice(0, 300) });
  }
  if (probe.duration > MAX_SOURCE_SECONDS) return finish({ ...base, status: "skipped", code: "duration_limit", reason: "whole source is " + probe.duration.toFixed(2) + " s", durationSeconds: probe.duration });
  const framesDir = fs.join(dir, "frames");
  ensureDir(fs, framesDir);
  let stderr = "";
  try {
    stderr = (await analyze(d.runtime, sampleArgs(rendition.url, probe, imagePattern(fs, framesDir, "f%03d.jpg")), { signal: d.signal, timeoutMs: 120_000 })).stderr;
  } catch (e) {
    if (d.signal?.aborted) throw e;
    return finish({ ...base, code: "decode_error", reason: errorMessage(e).slice(0, 300), durationSeconds: probe.duration });
  }
  const frames = parseShowinfo(stderr);
  const { indexes, timestamps } = pickSamples(frames);
  const framePath = (i: number) => fs.join(framesDir, "f" + String(i).padStart(3, "0") + ".jpg");
  try {
    if (!indexes.length || !indexes.every((i) => fs.existsSync(framePath(i)))) return finish({ ...base, code: "decode_error", reason: "the decode wrote " + frames.length + " frames, not every sample", durationSeconds: probe.duration });
    if (indexes.length > MAX_SAMPLES) return finish({ ...base, status: "skipped", code: "size_limit", reason: indexes.length + " samples exceed " + MAX_SAMPLES, durationSeconds: probe.duration });
    const duration = Math.max(probe.duration, timestamps[timestamps.length - 1]);
    const sampleBytes: Uint8Array[] = [];
    for (const i of indexes) sampleBytes.push(await readBytes(fs, framePath(i)));
    const size = frameSize(probe.width, probe.height);
    const sheets: string[] = [];
    const sheetChars: number[] = [];
    for (const [k, chunk] of sheetChunks(indexes.length).entries()) {
      const layout = sheetLayout(chunk.length, size.width, size.height);
      let quality: number = SHEET_RULES.quality;
      let bytes = await d.painter.paintSheet(chunk.map((j) => sampleBytes[j]), chunk.map((j) => frameLabel(j, timestamps[j])), layout, quality);
      while (base64Chars(bytes.length) > MAX_SHEET_CHARS && quality > 0.4) {
        quality -= 0.15;
        bytes = await d.painter.paintSheet(chunk.map((j) => sampleBytes[j]), chunk.map((j) => frameLabel(j, timestamps[j])), layout, quality);
      }
      const p = fs.join(dir, "sheet-" + k + ".jpg");
      await writeFileAtomic(fs, p, bytes);
      sheets.push(p);
      sheetChars.push(base64Chars(bytes.length));
    }
    let fingerprint: string | null = null;
    try {
      fingerprint = await d.painter.fingerprint(sampleBytes[Math.floor(sampleBytes.length / 2)]);
    } catch {
      fingerprint = null;
    }
    return finish({ ...base, status: "ready", code: "ready", reason: "full-source samples", durationSeconds: Math.round(duration * 1e6) / 1e6, timestamps, sheets, sheetChars, fingerprint });
  } finally {
    for (const name of fs.readdirSync(framesDir)) removeFile(fs, fs.join(framesDir, name));
    try {
      fs.rmSync(framesDir, { recursive: true, force: true });
    } catch {
    }
  }
}

export async function prepareStillEvidence(key: string, bytes: Uint8Array, mime: string, dir: string, d: EvidenceDeps): Promise<Evidence> {
  const { fs } = d;
  ensureDir(fs, dir);
  const p = fs.join(dir, "still.jpg");
  try {
    const still = await d.painter.resizeStill(bytes, mime, 960, 0.85);
    await writeFileAtomic(fs, p, still.bytes);
    return { sourceKey: key, kind: "image", status: "ready", code: "ready", reason: "full frame", durationSeconds: null, timestamps: [], sheets: [p], sheetChars: [base64Chars(still.bytes.length)] };
  } catch (e) {
    return { sourceKey: key, kind: "image", status: "error", code: "decode_error", reason: errorMessage(e).slice(0, 300), durationSeconds: null, timestamps: [], sheets: [], sheetChars: [] };
  }
}
