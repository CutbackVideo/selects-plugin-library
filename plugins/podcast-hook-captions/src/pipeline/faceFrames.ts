import { media } from "./host";
// The frames face tracking reads, decoded by the ffmpeg bundled with Selects through the app's own runner
// (media().runFFmpeg / runFFprobe: an argument list spawned without a shell, the same on macOS and Windows).
//
// face_track.py read its frames through cv2.VideoCapture: it seeks to frame f0, decodes every frame and keeps every
// step-th one, converted to BGR by swscale (bicubic, BT.601 limited range) at full size and then shrunk with
// cv2.resize INTER_AREA. The ffmpeg graph below does the same steps in the same order:
//   [trim] -> framestep=<step> -> scale=iw:ih:flags=bicubic:in_color_matrix=bt601,format=bgr24 -> scale=<w>:<h>:flags=area
// and the first frame is the one cv2's frame seek lands on (cvFrameSeek). On the test sources the pixels differ
// from cv2's by 0.004 on average (max 4 of 255).
//
// Frames are written as raw BGR24 files (stdout is text in this runner) in chunks of at most CHUNK_BYTES, read back
// one frame at a time with FileSystem.readRange and deleted, so memory holds one frame and disk at most two chunks
// (the next chunk is decoded while this one is read), whatever the length of the source. Each chunk also decodes the
// first sample of the next one and records its timestamp (-stats_enc_pre); the next chunk seeks to exactly that frame,
// so the chunks see the frames one continuous decode would, as cv2 counted them, on constant- and
// variable-frame-rate video alike.
import { assertConstantFrameClock } from "./sharedAiFaces.cjs";
import { fs } from "./host";

/** Bytes of frames per ffmpeg run (two runs' worth on disk while the next is prefetched). */
export const CHUNK_BYTES = 128 * 1024 * 1024;

/** Samples per ffmpeg run for frames of this size: CHUNK_BYTES worth, at least 30. */
export const chunkSamples = (plan: Pick<SamplePlan, "w" | "h">) => Math.max(30, Math.floor(CHUNK_BYTES / (plan.w * plan.h * 3)));
const CHUNK_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * The video stream as cv2.VideoCapture reports it (upright size, frame rate), plus what seeking needs: the stream's
 * start relative to the file's, and its shortest frame duration (1 / r_frame_rate).
 */
export type VideoInfo = { W: number; H: number; fps: number; offset: number; frameS: number; timeBase?:string };

/** Which frames a job samples: face_track.py's f0, f1, step, analysis size and number of samples. */
export type SamplePlan = { f0: number; f1: number; step: number; w: number; h: number; count: number };

// ---------------------------------------------------------------- the app's ffmpeg / ffprobe runner
function runtime(): any {
  const rt = media();
  if (typeof rt?.runFFmpeg !== "function" || typeof rt?.runFFprobe !== "function") throw new Error("This Selects version cannot run ffmpeg for plug-ins. Update Selects.");
  return rt;
}

/** The runner rejects with a JSON string {type, message, args, stderr} (ffmpeg) or an Error (ffprobe). */
export function toolMessage(e: any): string {
  let text = "";
  if (e && typeof e === "object" && typeof e.stderr === "string") text = e.stderr || e.message || "";
  else {
    const raw = String(e && e.message != null ? e.message : e);
    try {
      const o = JSON.parse(raw);
      text = String(o.stderr || o.message || raw);
    } catch {
      text = raw;
    }
  }
  text = text.trim();
  return text ? text.slice(-600) : "no details";
}

async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, ms: number, outer?: AbortSignal): Promise<T> {
  const ac = new AbortController();
  const stop = () => ac.abort();
  if (outer) {
    if (outer.aborted) throw new Error("Face tracking was cancelled.");
    outer.addEventListener("abort", stop);
  }
  const timer = setTimeout(stop, ms);
  try {
    return await run(ac.signal);
  } catch (e) {
    if (outer && outer.aborted) throw new Error("Face tracking was cancelled.");
    if (ac.signal.aborted) throw new Error("ffmpeg took longer than " + Math.round(ms / 1000) + " s.");
    throw e;
  } finally {
    clearTimeout(timer);
    if (outer) outer.removeEventListener("abort", stop);
  }
}

// ---------------------------------------------------------------- probe
const rate = (s: any) => {
  const m = String(s || "").match(/^(\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?))?$/);
  if (!m) return 0;
  const v = m[2] != null ? Number(m[1]) / Number(m[2]) : Number(m[1]);
  return Number.isFinite(v) && v > 0 ? v : 0;
};

/** Size (upright), frame rate and start offset of the first video stream. Throws when there is none. */
export async function probeVideo(path: string, signal?: AbortSignal): Promise<VideoInfo> {
  const args = [
    "-v", "error", "-hide_banner", "-select_streams", "V:0",
    "-show_entries", "stream=width,height,avg_frame_rate,r_frame_rate,time_base,start_time:stream_tags=rotate:stream_side_data=rotation:format=start_time",
    "-of", "json", path,
  ];
  const r: any = await withTimeout<any>((s) => runtime().runFFprobe(args, true, s), 60000, signal);
  // the runner joins stdout chunks with "\n", which can split a number: JSON never needs the newlines
  const j = JSON.parse(String((r && r.stdout) || "").replace(/[\r\n]/g, ""));
  const s = j && j.streams && j.streams[0];
  if (!s || !(Number(s.width) > 0) || !(Number(s.height) > 0)) throw new Error("no video stream");
  let rot = 0;
  for (const sd of s.side_data_list || []) if (sd && sd.rotation != null) rot = Number(sd.rotation) || 0;
  if (!rot && s.tags && s.tags.rotate != null) rot = Number(s.tags.rotate) || 0;
  const turned = Math.abs(Math.round(rot / 90)) % 2 === 1; // ffmpeg and cv2 both turn the picture upright
  const W = turned ? Number(s.height) : Number(s.width);
  const H = turned ? Number(s.width) : Number(s.height);
  // cv2's CAP_PROP_FPS is the stream's average frame rate (r_frame_rate if unset); face_track.py falls back to 30
  const fps = rate(s.avg_frame_rate) || rate(s.r_frame_rate) || 30;
  const st = Number(s.start_time), ft = Number(j.format && j.format.start_time);
  const offset = Number.isFinite(st) ? st - (Number.isFinite(ft) ? ft : 0) : 0;
  return { W, H, fps, offset, timeBase:s.time_base, frameS: 1 / Math.max(fps, rate(s.r_frame_rate)) };
}

/** Prove the source's actual integer PTS clock before combining independent face and color decoders. */
export async function verifyConstantSourceClock(path:string,info:VideoInfo,plan:SamplePlan,signal?:AbortSignal):Promise<void> {
  // Scan a bounded segment around this pass, including seek preroll; never the whole long source.
  const start=Math.max(0,info.offset+plan.f0/info.fps-2);
  const maximum=Math.min(20000,Math.ceil((plan.f1-plan.f0)+8*info.fps));
  const args=["-v","error","-select_streams","v:0","-read_intervals",start.toFixed(6)+"%+#"+maximum,"-show_frames","-show_entries","frame=best_effort_timestamp","-of","json",path];
  const r:any=await withTimeout<any>(s=>runtime().runFFprobe(args,true,s),60000,signal);
  const value=JSON.parse(String(r?.stdout||"").replace(/[\r\n]/g,""));
  const timestamps=(value.frames||[]).map((f:any)=>f.best_effort_timestamp);
  assertConstantFrameClock(timestamps,info.timeBase,info.fps);
  const [n,d]=String(info.timeBase).split("/").map(Number);
  if(timestamps[timestamps.length-1]*n/d < info.offset+(plan.f1-1)/info.fps-1e-6)
    throw new Error("Bounded frame-clock scan could not verify the requested source interval. Long keyframe preroll is unsupported.");
}

// ---------------------------------------------------------------- extraction

/**
 * Where a run starts. `keyframe`: seek to the key frame at or before `seek` and drop the first `skip` frames (cv2's
 * frame seek); otherwise decode from the first frame at or after `seek` (seconds from the file's start).
 */
export type Start = { seek: number; keyframe: boolean; skip: number };

/** Frame f0 by time: frame f starts at offset + f / fps (from the file's start); half a frame early. */
export function timeStart(info: VideoInfo, plan: SamplePlan, first = 0): Start {
  const f = plan.f0 + first * plan.step;
  return { seek: f > 0 ? Math.max(0, info.offset + (f - 0.5) / info.fps) : 0, keyframe: false, skip: 0 };
}

const STATS_FMT = ["-enc_time_base:v", "demux", "-stats_enc_pre_fmt", "{n} {pts} {tb}"];
const seekArgs = (s: Start) => (s.seek > 0 ? ["-ss", s.seek.toFixed(6)].concat(s.keyframe ? ["-noaccurate_seek"] : []) : []);

/**
 * face_track.py's cap.set(CAP_PROP_POS_FRAMES, f0), as OpenCV's FFmpeg backend does it: seek back to the key frame at
 * or before frame f0 - delta (by time), number that frame from its timestamp (round(fps * t)), then count decoded
 * frames up to f0. On constant-frame-rate video this is frame f0 by time; on variable-frame-rate video counting can
 * land elsewhere, and this lands where cv2 did. One extra one-frame ffmpeg run; null when it cannot be worked out.
 */
export async function cvFrameSeek(path: string, info: VideoInfo, plan: SamplePlan, stats: string, run: (args: string[]) => Promise<unknown>): Promise<Start | null> {
  if (plan.f0 <= 0) return { seek: 0, keyframe: false, skip: 0 };
  let delta = 16;
  for (let tries = 0; tries < 8; tries += 1) {
    const ft = Math.max(plan.f0 - delta, 0);
    const probe: Start = { seek: Math.max(0, info.offset + ft / info.fps), keyframe: true, skip: 0 };
    (await removeQuiet(stats));
    await run(["-nostdin", "-hide_banner", "-v", "error", "-y", ...seekArgs(probe), "-i", path, "-map", "0:V:0", "-an", "-sn", "-dn",
      "-fps_mode", "passthrough", "-frames:v", "1", "-stats_enc_pre", stats, ...STATS_FMT, "-f", "null", "-"]);
    let t: number | null = null;
    try {
      t = sampleTime(String(await fs().readFile(stats, "utf8")), 0);
    } catch {}
    (await removeQuiet(stats));
    if (t == null) return null;
    const n = Math.floor(info.fps * (probe.seek + t - info.offset) + 0.5); // dts_to_frame_number
    if (n >= 0 && n <= plan.f0 - 1) return { seek: probe.seek, keyframe: true, skip: plan.f0 - n };
    if (ft === 0) return null;
    delta = delta < 16 ? delta * 2 : Math.floor((delta * 3) / 2);
  }
  return null;
}

/**
 * ffmpeg arguments: from `start`, every plan.step-th frame, `n` of them as raw BGR24 into `out`. With `stats`, one
 * more sample is decoded and every sample's timestamp is written to `stats`.
 */
export function frameArgs(path: string, plan: SamplePlan, start: Start, n: number, out: string, stats: string | null = null): string[] {
  const vf =
    (start.skip > 0 ? "trim=start_frame=" + start.skip + "," : "") +
    "framestep=" + plan.step +
    ",scale=iw:ih:flags=bicubic:in_color_matrix=bt601,format=bgr24" +
    ",scale=" + plan.w + ":" + plan.h + ":flags=area";
  return [
    "-nostdin", "-hide_banner", "-v", "error", "-y",
    ...seekArgs(start),
    "-i", path, "-map", "0:V:0", "-an", "-sn", "-dn",
    "-vf", vf, "-fps_mode", "passthrough",
    ...(stats ? ["-stats_enc_pre", stats].concat(STATS_FMT) : []),
    "-frames:v", String(stats ? n + 1 : n),
    "-f", "rawvideo", "-pix_fmt", "bgr24", out,
  ];
}

/** The output time (s) of sample `n` in a -stats_enc_pre file ("{n} {pts} {tb}" lines), or null. */
export function sampleTime(statsText: string, n: number): number | null {
  for (const line of String(statsText || "").split(/\r?\n/)) {
    const m = line.trim().match(/^(\d+) (-?\d+) (\d+)\/(\d+)$/);
    if (m && Number(m[1]) === n && Number(m[4]) > 0) return (Number(m[2]) * Number(m[3])) / Number(m[4]);
  }
  return null;
}

export function toBytes(v: any): Uint8Array {
  if (v instanceof Uint8Array) return v;
  // A bare ArrayBuffer from the host realm (window.parent) fails instanceof here.
  if (Object.prototype.toString.call(v) === "[object ArrayBuffer]") return new Uint8Array(v);
  if (v && ArrayBuffer.isView(v)) return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  if (v && v.type === "Buffer" && Array.isArray(v.data)) return Uint8Array.from(v.data);
  return new Uint8Array(0);
}

export async function removeQuiet(path: string) {
  try {
    if ((await fs().exists(path))) (await fs().rm(path));
  } catch {}
}

async function fileSize(path: string): Promise<number | null> {
  try {
    const st = (await fs().stat(path));
    return st && typeof st.size === "number" ? st.size : null;
  } catch {
    return null;
  }
}

type Chunk = { first: number; n: number; file: string; stats: string | null };
type Extracted = { c: Chunk; next: Start | null }; // next: where the following chunk starts

/**
 * The plan's samples in order, each a packed BGR24 frame of plan.w x plan.h. Ends early at the end of the source.
 * Chunk files live in `workDir` and are removed as they are read, and when the loop stops early.
 */
export async function* sampleFrames(path: string, info: VideoInfo, plan: SamplePlan, workDir: string, tag: string, signal?: AbortSignal): AsyncGenerator<Uint8Array> {
  const fb = plan.w * plan.h * 3;
  const per = chunkSamples(plan);
  const chunks: Chunk[] = [];
  for (let s = 0, k = 0; s < plan.count; s += per, k += 1) {
    const base = fs().join(workDir, "frames-" + tag + "-" + k);
    chunks.push({ first: s, n: Math.min(per, plan.count - s), file: base + ".bgr", stats: s + per < plan.count ? base + ".txt" : null });
  }
  if (!chunks.length) return;
  (await fs().mkdir(workDir, { recursive: true }));
  const ac = new AbortController(); // stops a prefetch when the reader stops early
  const stop = () => ac.abort();
  if (signal) signal.addEventListener("abort", stop);
  const ffmpeg = (args: string[]) => withTimeout((s) => runtime().runFFmpeg(args, true, s), CHUNK_TIMEOUT_MS, ac.signal);
  const extract = (c: Chunk, from: Start | null): Promise<Extracted> => {
    const p = (async () => {
      (await removeQuiet(c.file));
      let start = from;
      if (!start) {
        // the first chunk: where cv2's frame seek lands (by time if that cannot be worked out)
        const probeStats = fs().join(workDir, "frames-" + tag + "-seek.txt");
        start = (await cvFrameSeek(path, info, plan, probeStats, ffmpeg).catch((e) => {
          if (ac.signal.aborted) throw e;
          return null;
        })) || timeStart(info, plan);
      }
      if (c.stats) (await removeQuiet(c.stats));
      try {
        await ffmpeg(frameArgs(path, plan, start, c.n, c.file, c.stats));
      } catch (e) {
        if (ac.signal.aborted || !c.stats) throw e;
        // an ffmpeg without the timestamp report: decode without it, the next chunk then seeks by time
        c.stats = null;
        (await removeQuiet(c.file));
        await ffmpeg(frameArgs(path, plan, start, c.n, c.file, null));
      }
      let next: Start | null = null;
      if (c.stats) {
        try {
          // the extra sample's file time; the next chunk starts exactly there
          const t = sampleTime(String(await fs().readFile(c.stats, "utf8")), c.n);
          if (t != null) next = { seek: Math.max(0, start.seek + t - info.frameS / 2), keyframe: false, skip: 0 };
        } catch {}
        (await removeQuiet(c.stats));
      }
      return { c, next };
    })().catch((e) => {
      if (ac.signal.aborted) throw e; // cancelled, or stopped by the reader
      throw new Error("Reading frames for face tracking failed: " + toolMessage(e));
    });
    p.catch(() => {}); // awaited below; this only keeps an early failure from being reported as unhandled
    return p;
  };
  let pending: Promise<Extracted> | null = extract(chunks[0], null);
  try {
    for (let k = 0; k < chunks.length; k += 1) {
      const { c, next } = await pending!;
      pending = null;
      const size = (await fileSize(c.file));
      const full = size == null || size >= c.n * fb;
      if (full && k + 1 < chunks.length) pending = extract(chunks[k + 1], next || timeStart(info, plan, chunks[k + 1].first));
      let got = 0;
      if ((await fs().exists(c.file))) {
        for (let i = 0; i < c.n; i += 1) {
          if (signal && signal.aborted) throw new Error("Face tracking was cancelled.");
          const bytes = toBytes(await fs().readRange(c.file, i * fb, fb));
          if (bytes.length < fb) break; // the source ended
          got += 1;
          yield bytes;
        }
      }
      (await removeQuiet(c.file));
      if (got < c.n) break;
    }
  } finally {
    if (pending) {
      ac.abort();
      await (pending as Promise<Extracted>).catch(() => null);
    }
    if (signal) signal.removeEventListener("abort", stop);
    for (const c of chunks) {
      (await removeQuiet(c.file));
      if (c.stats) (await removeQuiet(c.stats));
    }
    (await removeQuiet(fs().join(workDir, "frames-" + tag + "-seek.txt")));
  }
}
