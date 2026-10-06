import { encode, probeMedia } from "../../host/ffmpeg.ts";
import { readJsonIfExists, removeFile, renameWithRetry, statFile, writeJsonAtomic } from "../../host/fs.ts";
import type { HostFs, HostRuntime } from "../../host/types.ts";
import { sha256Hex } from "../../host/util.ts";
import { type ExecShot, type FootageExecution, type FootageRun, shotIndices } from "./footageFrames.ts";

export const BAKE_RECIPE = "eo-stock-bake/1 x264-medium-crf14-intra-yuv420p-lanczos";

export type StockSource = {
  path: string;
  startSeconds: number;
  cx: number;
  size: { width: number; height: number };
  durationSeconds?: number | null;
};

export type Rate = { num: number; den: number; text: string };

export function rateOf(fps: number): Rate {
  for (const base of [24, 30, 48, 60, 120]) {
    if (Math.abs(fps - (base * 1000) / 1001) < 1e-6) return { num: base * 1000, den: 1001, text: base * 1000 + "/1001" };
  }
  if (Math.abs(fps - Math.round(fps)) < 1e-9) return { num: Math.round(fps), den: 1, text: String(Math.round(fps)) };
  const num = Math.round(fps * 1000);
  return { num, den: 1000, text: num + "/1000" };
}

export type Crop = { x: number; y: number; w: number; h: number };

const even = (v: number) => Math.max(2, 2 * Math.round(v / 2));

export function cropFor(size: { width: number; height: number }, cx: number, aspect: number): Crop {
  const W = size.width, H = size.height;
  if (!(W > 0 && H > 0 && aspect > 0)) throw new Error("A crop needs a positive source size and aspect.");
  if (W / H > aspect) {
    const w = Math.min(W, even(H * aspect));
    const x = Math.min(W - w, Math.max(0, 2 * Math.round((W * Math.min(1, Math.max(0, cx)) - w / 2) / 2)));
    return { x, y: 0, w, h: H };
  }
  const h = Math.min(H, even(W / aspect));
  return { x: 0, y: 2 * Math.floor((H - h) / 4), w: W, h };
}

export type BakeShot = {
  shotId: string;
  from: number;
  to: number;
  indices: number[];
  source: StockSource;
  crop: Crop;
  fit: { width: number; height: number };
};

export type BakePlan = {
  schema: "eo-footage-bake/1";
  sceneId: string;
  runFrom: number;
  runTo: number;
  frames: number;
  rate: Rate;
  out: { width: number; height: number };
  shots: BakeShot[];
};

export function bakePlan(ex: FootageExecution, sceneId: string, run: FootageRun, sources: Record<string, StockSource>, o: { fps: number; out?: { width: number; height: number } }): BakePlan {
  if (run.kind !== "stock") throw new Error("Only a stock run is baked (scene " + sceneId + " frames " + run.from + "-" + run.to + " are " + run.kind + ").");
  const out = o.out ?? { width: 1080, height: 1920 };
  const rate = rateOf(o.fps);
  const shots: BakeShot[] = run.shots.map((s) => {
    const source = sources[s.id];
    if (!source) throw new Error("Scene " + sceneId + " has no stock source for " + s.id + ".");
    const shot = (ex.footage || []).find((x) => x.id === s.id) as ExecShot;
    const indices = shotIndices(ex, s.id, s.from, s.to);
    if (indices.some((j) => j < 0)) throw new Error("Scene " + sceneId + " " + s.id + " asks for a source frame before its start.");
    const need = (Math.max(...indices) + 1) * (rate.den / rate.num);
    if (source.durationSeconds != null && source.startSeconds + need > source.durationSeconds + rate.den / rate.num + 1e-6) {
      throw new Error("Scene " + sceneId + " " + s.id + " needs " + need.toFixed(3) + " s of its source from " + source.startSeconds + " s; the file is " + source.durationSeconds + " s.");
    }
    const inset = shot.layout === "inset" && shot.box && shot.box.w > 0 && shot.box.h > 0;
    const aspect = inset ? shot.box!.w / shot.box!.h : out.width / out.height;
    const fit = inset ? { width: out.width, height: Math.min(out.height, even(out.width / aspect)) } : { ...out };
    return { shotId: s.id, from: s.from - run.from, to: s.to - run.from, indices, source, crop: cropFor(source.size, source.cx, aspect), fit };
  });
  return { schema: "eo-footage-bake/1", sceneId, runFrom: run.from, runTo: run.to, frames: run.to - run.from, rate, out, shots };
}

export function picksOf(indices: number[]): { picks: number[]; firstFrame: number[] } {
  const picks: number[] = [];
  const firstFrame: number[] = [];
  indices.forEach((j, f) => {
    if (picks.length && j === picks[picks.length - 1]) return;
    if (picks.length && j < picks[picks.length - 1]) throw new Error("A shot's source frames must not run backwards (" + picks[picks.length - 1] + " then " + j + ").");
    picks.push(j);
    firstFrame.push(f);
  });
  return { picks, firstFrame };
}

const secs = (x: number) => (Math.round(x * 1e6) / 1e6).toFixed(6);

export function shotChain(i: number, shot: BakeShot, rate: Rate, out: { width: number; height: number }): string {
  const n = shot.to - shot.from;
  const { picks, firstFrame } = picksOf(shot.indices);
  const select = picks.map((j) => "eq(n," + j + ")").join("+");
  const pts = picks.map((_, q) => "eq(N," + q + ")*" + firstFrame[q]).join("+") + "+eq(N," + picks.length + ")*" + n;
  const c = shot.crop;
  const geo = ["crop=" + c.w + ":" + c.h + ":" + c.x + ":" + c.y, "scale=" + shot.fit.width + ":" + shot.fit.height + ":flags=lanczos"];
  if (shot.fit.width !== out.width || shot.fit.height !== out.height) {
    geo.push("pad=" + out.width + ":" + out.height + ":" + Math.floor((out.width - shot.fit.width) / 2) + ":" + Math.floor((out.height - shot.fit.height) / 2) + ":black");
  }
  return (
    "[" + i + ":v]fps=" + rate.text + ",select='" + select + "',tpad=stop_mode=clone:stop=1,settb=" + rate.den + "/" + rate.num +
    ",setpts='" + pts + "'," + geo.join(",") + ",setsar=1,fps=" + rate.text + ",trim=end_frame=" + n + ",setpts=PTS-STARTPTS[s" + i + "]"
  );
}

export function bakeArgs(plan: BakePlan, outPath: string): string[] {
  const rate = plan.rate;
  const inputs: string[] = [];
  const chains: string[] = [];
  plan.shots.forEach((s, i) => {
    const window = (Math.max(...s.indices) + 1) * (rate.den / rate.num) + 0.5;
    inputs.push("-ss", secs(s.source.startSeconds), "-t", secs(window), "-i", s.source.path);
    chains.push(shotChain(i, s, rate, plan.out));
  });
  const labels = plan.shots.map((_, i) => "[s" + i + "]").join("");
  const graph = chains.join(";") + ";" + labels + "concat=n=" + plan.shots.length + ":v=1:a=0,format=yuv420p[v]";
  return [
    "-hide_banner", "-nostdin", "-nostats", "-v", "error", "-y",
    ...inputs,
    "-filter_complex", graph,
    "-map", "[v]", "-an", "-sn", "-dn",
    "-c:v", "libx264", "-preset", "medium", "-crf", "14", "-g", "1", "-pix_fmt", "yuv420p",
    "-r", rate.text, "-frames:v", String(plan.frames), "-movflags", "+faststart",
    outPath,
  ];
}

export type ClipRecord = { schema: "eo-footage-clip/1"; recipe: string; key: string; frames: number; bytes?: number };

export const clipRecordPath = (out: string) => out.replace(/\.mp4$/i, "") + ".json";

export async function bakeKey(fs: HostFs, plan: BakePlan): Promise<string> {
  const files = plan.shots.map((s) => {
    const st = statFile(fs, s.source.path);
    return [s.source.path, st?.size ?? null, st ? Math.round(st.mtimeMs) : null];
  });
  return sha256Hex(JSON.stringify([BAKE_RECIPE, plan, files]));
}

export type BakeResult = { path: string; frames: number; bytes: number; ms: number; reused: boolean; key: string };

export async function bakeStockRun(h: { fs: HostFs; runtime: HostRuntime | null; signal?: AbortSignal | null; tmpDir?: string }, plan: BakePlan, out: string): Promise<BakeResult> {
  const t0 = Date.now();
  for (const s of plan.shots) if (!h.fs.existsSync(s.source.path)) throw new Error("Stock source missing: " + s.source.path);
  const key = await bakeKey(h.fs, plan);
  const recPath = clipRecordPath(out);
  const counted = async (path: string, decode = true) => {
    const p = await probeMedia(h.runtime, path, { fs: h.fs, tmpDir: h.tmpDir, signal: h.signal, countFrames: decode });
    return p.video && p.video.width === plan.out.width && p.video.height === plan.out.height ? p.video.nbFrames : null;
  };
  const rec = await readJsonIfExists<ClipRecord | null>(h.fs, recPath, null);
  if (rec && rec.schema === "eo-footage-clip/1" && rec.key === key && h.fs.existsSync(out) && (rec.bytes == null || rec.bytes === statFile(h.fs, out)?.size)) {
    try {
      if ((await counted(out, false)) === plan.frames) return { path: out, frames: plan.frames, bytes: statFile(h.fs, out)?.size ?? 0, ms: Date.now() - t0, reused: true, key };
    } catch {
    }
  }
  removeFile(h.fs, recPath);
  const part = out.replace(/\.mp4$/i, "") + ".part.mp4";
  removeFile(h.fs, part);
  await encode(h.runtime, bakeArgs(plan, part), { fs: h.fs, outPath: part, signal: h.signal, timeoutMs: 300_000 });
  const frames = await counted(part);
  if (frames !== plan.frames) {
    removeFile(h.fs, part);
    throw new Error("The baked clip of scene " + plan.sceneId + " has " + frames + " frames, not " + plan.frames + ".");
  }
  removeFile(h.fs, out);
  await renameWithRetry(h.fs, part, out);
  const bytes = statFile(h.fs, out)?.size ?? 0;
  await writeJsonAtomic(h.fs, recPath, { schema: "eo-footage-clip/1", recipe: BAKE_RECIPE, key, frames, bytes } satisfies ClipRecord);
  return { path: out, frames, bytes, ms: Date.now() - t0, reused: false, key };
}
