import type { FfResult, HostFs, HostRuntime } from "./types.ts";
import { childSignal, errorMessage, isAbortError, AbortedError, randomHex } from "./util.ts";
import { decodeText } from "./fs.ts";
import { exitCodeFromMessage, parseFfprobeJson, parseVersion, type FfVersion } from "./ffmpegParse.ts";
import { SMOKE_TESTS, type SmokeTest } from "./ffmpegCases.ts";

export type FfErrorCode = "host-missing" | "failed" | "aborted" | "timeout" | "no-output";

export class FfmpegError extends Error {
  code: FfErrorCode;
  exitCode: number | null;
  stderrTail: string;
  args: string[];
  constructor(code: FfErrorCode, message: string, opts: { exitCode?: number | null; stderrTail?: string; args?: string[] } = {}) {
    super(message);
    this.name = "FfmpegError";
    this.code = code;
    this.exitCode = opts.exitCode ?? null;
    this.stderrTail = opts.stderrTail ?? "";
    this.args = opts.args ?? [];
  }
}

export type FfOptions = { signal?: AbortSignal | null; timeoutMs?: number };
export type FfRun = { stdout: string; stderr: string; ms: number };

const DEFAULT_TIMEOUT_MS = 120_000;

function requireTool(rt: HostRuntime | null | undefined, tool: "runFFmpeg" | "runFFprobe"): HostRuntime {
  if (!rt || typeof rt[tool] !== "function") {
    throw new FfmpegError("host-missing", "This Selects build has no Runtime." + tool + "; update Selects.");
  }
  return rt;
}

function tail(text: string, n = 1500): string {
  const t = String(text || "");
  return t.length > n ? t.slice(t.length - n) : t;
}

function toFfError(e: unknown, args: string[], streamed: string, timedOut: boolean, outerSignal?: AbortSignal | null): Error {
  if (timedOut) return new FfmpegError("timeout", "ffmpeg did not finish in time.", { args, stderrTail: tail(streamed) });
  if (outerSignal?.aborted || isAbortError(e)) return new AbortedError();
  const err = e as { message?: string; stderr?: string; exitCode?: number | null };
  const message = errorMessage(e);
  const exitCode = typeof err?.exitCode === "number" ? err.exitCode : exitCodeFromMessage(message);
  const text = streamed || String(err?.stderr || "");
  const why = lastErrorLine(text);
  return new FfmpegError("failed", "ffmpeg failed" + (exitCode != null ? " (exit " + exitCode + ")" : "") + (why ? ": " + why : ": " + message), {
    exitCode,
    stderrTail: tail(text),
    args,
  });
}

export function lastErrorLine(text: string): string {
  const lines = String(text || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const bad = lines.filter((l) => /error|invalid|no such|not found|unknown|failed|cannot|unable/i.test(l));
  return (bad[bad.length - 1] || lines[lines.length - 1] || "").slice(0, 300);
}

export async function analyze(rt: HostRuntime | null | undefined, args: string[], opts: FfOptions & { stdout?: boolean } = {}): Promise<FfRun> {
  const runtime = requireTool(rt, "runFFmpeg");
  const err: string[] = [];
  const out: string[] = [];
  const child = childSignal(opts.signal, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const r: FfResult = await runtime.runFFmpeg(
      args,
      true,
      child.signal,
      opts.stdout ? (chunk: string) => void out.push(String(chunk)) : undefined,
      (chunk: string) => void err.push(String(chunk)),
    );
    const stderr = err.length ? err.join("") : String(r?.stderr ?? "");
    const stdout = opts.stdout && out.length ? out.join("") : String(r?.stdout ?? "");
    return { stdout, stderr, ms: Date.now() - t0 };
  } catch (e) {
    throw toFfError(e, args, err.join(""), child.timedOut(), opts.signal);
  } finally {
    child.dispose();
  }
}

export async function encode(
  rt: HostRuntime | null | undefined,
  args: string[],
  opts: FfOptions & { outPath?: string; fs?: HostFs } = {},
): Promise<FfRun> {
  const runtime = requireTool(rt, "runFFmpeg");
  const child = childSignal(opts.signal, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const t0 = Date.now();
  let r: FfResult;
  try {
    r = await runtime.runFFmpeg(args, true, child.signal);
  } catch (e) {
    throw toFfError(e, args, "", child.timedOut(), opts.signal);
  } finally {
    child.dispose();
  }
  if (opts.outPath && opts.fs) {
    const s = (await opts.fs.stat(opts.outPath));
    if (!s || !Number(s.size)) {
      throw new FfmpegError("no-output", "ffmpeg finished but wrote no output to " + opts.outPath + ".", { args, stderrTail: tail(String(r?.stderr ?? "")) });
    }
  }
  return { stdout: String(r?.stdout ?? ""), stderr: String(r?.stderr ?? ""), ms: Date.now() - t0 };
}

export function imagePattern(fs: Pick<HostFs, "join">, dir: string, pattern: string): string {
  return fs.join(dir.split("%").join("%%"), pattern);
}

const PICTURE_FILE = /\.(?:jpe?g|png|webp|gif|bmp|tiff?)$/i;

export function pictureNeedsFormat(path: string): boolean {
  return path.includes("%") && PICTURE_FILE.test(path);
}

export function pictureDemuxer(head: Uint8Array | null | undefined): string | null {
  const b = head ?? new Uint8Array(0);
  const at = (i: number, s: string) => [...s].every((c, k) => b[i + k] === c.charCodeAt(0));
  if (b.length >= 8 && b[0] === 0x89 && at(1, "PNG")) return "png_pipe";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg_pipe";
  if (b.length >= 12 && at(0, "RIFF") && at(8, "WEBP")) return "webp_pipe";
  if (b.length >= 6 && at(0, "GIF8")) return "gif";
  return null;
}

export function pictureInputFormat(path: string, head?: Uint8Array | null): string[] {
  if (!pictureNeedsFormat(path)) return [];
  const demuxer = pictureDemuxer(head);
  return demuxer ? ["-f", demuxer] : ["-f", "image2", "-pattern_type", "none"];
}

export function pictureOutputFormat(path: string): string[] {
  return pictureNeedsFormat(path) ? ["-f", "image2", "-update", "1"] : [];
}

export type ProbeJson = ReturnType<typeof parseFfprobeJson>;

export async function probeJson(
  rt: HostRuntime | null | undefined,
  args: string[],
  opts: FfOptions & { fs?: HostFs; tmpDir?: string } = {},
): Promise<ProbeJson> {
  const runtime = requireTool(rt, "runFFprobe");
  const full = ["-v", "error", ...args, "-of", "json"];
  const once = async (argv: string[]): Promise<FfResult> => {
    const child = childSignal(opts.signal, opts.timeoutMs ?? 60_000);
    try {
      return await runtime.runFFprobe(argv, true, child.signal);
    } catch (e) {
      throw toFfError(e, argv, "", child.timedOut(), opts.signal);
    } finally {
      child.dispose();
    }
  };
  const r = await once(full);
  try {
    return parseFfprobeJson(String(r?.stdout ?? ""));
  } catch (first) {
    if (!opts.fs || !opts.tmpDir) throw first;
    const tmp = opts.fs.join(opts.tmpDir, "ffprobe-" + randomHex(8) + ".json");
    try {
      await once([...full, "-o", tmp]);
      return parseFfprobeJson(decodeText(await opts.fs.readFile(tmp)));
    } finally {
      try {
        if ((await opts.fs.exists(tmp))) (await opts.fs.unlink(tmp));
      } catch {
      }
    }
  }
}

export type MediaProbe = {
  durationSec: number | null;
  formatName: string | null;
  video: { codec: string; width: number; height: number; fps: string | null; nbFrames: number | null; durationSec: number | null } | null;
  audio: { codec: string; sampleRate: number | null; channels: number | null; durationSec: number | null } | null;
};

const n = (v: unknown): number | null => {
  const x = Number(v);
  return v == null || v === "" || v === "N/A" || !Number.isFinite(x) ? null : x;
};

export async function probeMedia(
  rt: HostRuntime | null | undefined,
  path: string,
  opts: FfOptions & { fs?: HostFs; tmpDir?: string; countFrames?: boolean; inputFormat?: string[] } = {},
): Promise<MediaProbe> {
  const j = await probeJson(
    rt,
    [
      ...(opts.countFrames ? ["-count_frames"] : []),
      "-show_entries",
      "format=duration,format_name:stream=codec_type,codec_name,width,height,r_frame_rate,nb_frames,nb_read_frames,duration,sample_rate,channels",
      ...(opts.inputFormat ?? []),
      path,
    ],
    opts,
  );
  const streams = (j.streams || []) as Record<string, unknown>[];
  const v = streams.find((s) => s.codec_type === "video");
  const a = streams.find((s) => s.codec_type === "audio");
  return {
    durationSec: n(j.format?.duration),
    formatName: (j.format?.format_name as string) ?? null,
    video: v
      ? {
          codec: String(v.codec_name ?? ""),
          width: Number(v.width ?? 0),
          height: Number(v.height ?? 0),
          fps: (v.r_frame_rate as string) ?? null,
          nbFrames: n(v.nb_read_frames) ?? n(v.nb_frames),
          durationSec: n(v.duration),
        }
      : null,
    audio: a ? { codec: String(a.codec_name ?? ""), sampleRate: n(a.sample_rate), channels: n(a.channels), durationSec: n(a.duration) } : null,
  };
}

export async function ffmpegVersion(rt: HostRuntime | null | undefined, opts: FfOptions = {}): Promise<FfVersion> {
  const r = await analyze(rt, ["-version"], { ...opts, stdout: true, timeoutMs: opts.timeoutMs ?? 20_000 });
  const v = parseVersion(r.stdout);
  if (!v) throw new FfmpegError("failed", "ffmpeg -version printed no version line.", { stderrTail: tail(r.stdout + r.stderr) });
  return v;
}

export type SmokeResult = { id: string; usedFor: string; ok: boolean; ms: number; error?: string };
export type SmokeReport = { ok: boolean; version: FfVersion | null; platform: string; results: SmokeResult[]; failed: string[]; ms: number };

export async function runSmokeGate(
  rt: HostRuntime | null | undefined,
  opts: FfOptions & { tests?: SmokeTest[]; platform?: string } = {},
): Promise<SmokeReport> {
  const t0 = Date.now();
  const tests = opts.tests ?? SMOKE_TESTS;
  let version: FfVersion | null = null;
  const results: SmokeResult[] = [];
  try {
    version = await ffmpegVersion(rt, opts);
  } catch (e) {
    if (e instanceof AbortedError) throw e;
    const msg = errorMessage(e);
    return {
      ok: false,
      version: null,
      platform: opts.platform ?? "",
      results: tests.map((t) => ({ id: t.id, usedFor: t.usedFor, ok: false, ms: 0, error: "ffmpeg is not available: " + msg })),
      failed: tests.map((t) => t.id),
      ms: Date.now() - t0,
    };
  }
  for (const t of tests) {
    const s0 = Date.now();
    try {
      const r = await analyze(rt, t.args, { signal: opts.signal, timeoutMs: opts.timeoutMs ?? 20_000 });
      const problem = t.check ? t.check(r.stderr) : null;
      results.push({ id: t.id, usedFor: t.usedFor, ok: !problem, ms: Date.now() - s0, ...(problem ? { error: problem } : {}) });
    } catch (e) {
      if (e instanceof AbortedError) throw e;
      results.push({ id: t.id, usedFor: t.usedFor, ok: false, ms: Date.now() - s0, error: errorMessage(e) });
    }
  }
  const failed = results.filter((r) => !r.ok).map((r) => r.id);
  return { ok: failed.length === 0, version, platform: opts.platform ?? "", results, failed, ms: Date.now() - t0 };
}
