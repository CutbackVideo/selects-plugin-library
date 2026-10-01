import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HELPER = path.join(HERE, ".local", "vision-helper");
function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], ...opts });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    const timer = opts.timeoutMs ? setTimeout(() => child.kill("SIGKILL"), opts.timeoutMs) : null;
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({ code, out, err });
    });
    child.on("error", (e) => resolve({ code: -1, out, err: String(e) }));
  });
}

async function pool(items, size, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

async function cmdShots(job) {
  const s = job.shots;
  const out = {};
  await pool(s.ranges || [], 3, async (range) => {
    const r = await run(s.ffmpeg, ["-v", "info", "-ss", String(Math.max(0, range.startSeconds)), "-t", String(range.seconds), "-i", range.path,
      "-an", "-vf", "scale=320:-2,select='gt(scene," + (s.threshold || 0.3) + ")',showinfo", "-f", "null", "-"], { timeoutMs: 180000 });
    if (r.code !== 0) throw new Error("Shot detection failed: " + r.err.slice(-300));
    const times = [...String(r.err).matchAll(/pts_time:([0-9.]+)/g)].map((m) => Number(m[1])).filter((t) => t > 0.3 && t < range.seconds - 0.3);
    const kept = [];
    for (const t of times) if (!kept.length || t - kept[kept.length - 1] > 0.8) kept.push(Math.round(t * 1000) / 1000);
    out[range.key] = kept;
  });
  return { cuts: out };
}

async function cmdFaces(job, dir) {
  const work = path.join(dir, "faces");
  await fs.mkdir(work, { recursive: true });
  const samples = job.faces.samples || [];
  const files = await pool(samples, 4, async (s, i) => {
    const file = path.join(work, "f" + String(i).padStart(3, "0") + ".jpg");
    const r = await run(job.ffmpeg, ["-v", "error", "-y", "-ss", String(Math.max(0, s.seconds)), "-i", s.path, "-frames:v", "1", "-vf", "scale='min(960,iw)':-2", file], { timeoutMs: 60000 });
    return r.code === 0 ? file : null;
  });
  const ok = files.filter(Boolean);
  const out = {};
  if (ok.length) {
    const r = await run(HELPER, ["faces", ...ok], { timeoutMs: 120000 });
    if (r.code !== 0) throw new Error("vision-helper faces failed: " + r.err.trim());
    const rows = r.out.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
    for (const row of rows) {
      const i = files.indexOf(row.file);
      if (i >= 0) out[samples[i].key] = { w: row.w, h: row.h, faces: row.faces };
    }
  }
  return { detected: out, sampled: samples.length, readable: ok.length };
}


// matte: job.matte = { fps, step, blocks: [{ key, pieces: [{ path, startSeconds, from, to, sw, sh, scale, posX, posY }],
//   lines: [{ key, fromFrame, region: [x, y, w, h], ink: [x, y, w, h] }] }] }, all in Draft frames and 1080x1920 pixels.
// Pieces are the Main clips under one caption block, with their framing, so masks are made in the output picture at half size.
// Each line gets a sprite of its own region (one tile every `step` frames from its first frame): opaque where the caption
// stays visible, clear where a person stands. Coverage is the share of the line's ink box hidden by people.
async function cmdMatte(job, dir) {
  const m = job.matte, W = 540, H = 960, q = W / 1080, step = Math.max(1, m.step || 2), out = {};
  for (const block of m.blocks || []) {
    const work = await fs.mkdtemp(path.join(dir, "matte-" + block.key + "-"));
    let total = 0;
    for (const piece of block.pieces) {
      const first = Math.ceil(piece.from / step) * step, count = Math.ceil((piece.to - first) / step);
      if (count <= 0) continue;
      const fit = Math.min(1080 / piece.sw, 1920 / piece.sh);
      const sW = Math.max(2, Math.round(piece.sw * fit * piece.scale * q)), sH = Math.max(2, Math.round(piece.sh * fit * piece.scale * q));
      const left = Math.round((540 + piece.posX) * q - sW / 2), top = Math.round((960 - piece.posY) * q - sH / 2);
      const x = Math.min(sW + W, Math.max(0, W - left)), y = Math.min(sH + H, Math.max(0, H - top));
      const r = await run(job.ffmpeg, ["-v", "error", "-y", "-ss", String(Math.max(0, piece.startSeconds + (first - piece.from) / m.fps)), "-i", piece.path, "-an",
        "-vf", `fps=${m.fps / step}:start_time=0,format=rgb24,scale=${sW}:${sH},pad=${sW + 2 * W}:${sH + 2 * H}:${W}:${H}:black,crop=${W}:${H}:${x}:${y}`,
        "-frames:v", String(count), "-start_number", String(total + 1), path.join(work, "f_%04d.png")], { timeoutMs: 240000 });
      if (r.code !== 0) throw new Error("Frame extraction failed: " + r.err.slice(-300));
      total += count;
    }
    const made = (await fs.readdir(work)).filter((f) => /^f_\d+\.png$/.test(f)).length;
    if (!made || made !== total) throw new Error("The source does not cover the caption block.");
    const r = await run(HELPER, ["matte-dir", work], { timeoutMs: 280000 });
    if (r.code !== 0) throw new Error("vision-helper matte-dir failed: " + r.err.trim());
    for (const line of block.lines) {
      const start = Math.ceil(line.fromFrame / step), count = total - start;
      if (count <= 0) continue;
      const box = (b) => [Math.max(1, Math.round(b[2] * q)), Math.max(1, Math.round(b[3] * q)), Math.round(b[0] * q), Math.round(b[1] * q)];
      const [w, h, x, y] = box(line.region), ink = box(line.ink), cols = Math.min(8, count), rows = Math.ceil(count / cols);
      const input = ["-v", "error", "-y", "-start_number", String(start + 1), "-i", path.join(work, "f_%04d.m.png")];
      const stats = await run(job.ffmpeg, [...input, "-vf", `crop=${ink.join(":")},format=gray,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-`, "-f", "null", "-"], { timeoutMs: 120000 });
      const levels = [...stats.out.matchAll(/YAVG=([0-9.]+)/g)].map((v) => Number(v[1]) / 255);
      if (stats.code !== 0 || !levels.length) throw new Error("Mask measurement failed: " + stats.err.slice(-300));
      const sprite = path.join(work, line.key + ".webp");
      const packed = await run(job.ffmpeg, [...input, "-filter_complex",
        `[0:v]crop=${w}:${h}:${x}:${y},format=gray,negate,tile=${cols}x${rows}:nb_frames=${count}[m];color=white:s=${cols * w}x${rows * h}:r=1:d=1,format=rgb24[c];[c][m]alphamerge`,
        "-frames:v", "1", "-c:v", "libwebp", "-lossless", "1", sprite], { timeoutMs: 120000 });
      if (packed.code !== 0) throw new Error("Mask sprite failed: " + packed.err.slice(-300));
      const data = path.join(work, line.key + ".b64");
      await fs.writeFile(data, "data:image/webp;base64," + (await fs.readFile(sprite)).toString("base64"));
      out[line.key] = { spritePath: data, bytes: (await fs.stat(data)).size, cols, rows, count, fps: m.fps / step,
        coverage: levels.reduce((a, b) => a + b, 0) / levels.length, peak: Math.max(...levels) };
    }
  }
  return { lines: out };
}

const file=process.argv[2];if(!file)throw Error('Pass a faces job JSON path.');
const job=JSON.parse(await fs.readFile(file,'utf8'));const result=job.matte?await cmdMatte(job,path.dirname(file)):job.shots?await cmdShots(job):await cmdFaces(job,path.dirname(file));
await fs.writeFile(path.join(path.dirname(file),job.matte?'matte-result.json':job.shots?'shots-result.json':'faces-result.json'),JSON.stringify(result));
console.log(JSON.stringify({sampled:result.sampled,readable:result.readable}));
