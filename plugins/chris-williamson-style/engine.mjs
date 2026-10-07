#!/usr/bin/env node
// Chris Williamson Style — host-side asset engine (macOS; run by the Node.js that runtime.sh provides).
//
//   node engine.mjs shots   <job.json>   find camera changes inside each Main clip's source range (ffmpeg scene score)
//   node engine.mjs images  <job.json>   download B-roll pictures and render each as a 9:16 still MP4
//
// Every command reads one JSON job file and writes <job-dir>/<command>-result.json, printing a short summary.
// Nothing here edits a Draft: the panel imports the results and builds the Draft through run_script.
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { candidates, assets } from "./media.mjs";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
// Wikimedia asks API and media clients for a descriptive user agent and throttles browser-like ones.
const WM_UA = "SelectsPluginChrisWilliamsonStyle/0.1 (https://github.com/CutbackVideo/selects-plugin-library)";

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isWikimedia = (url) => /(^https?:\/\/)([^/]*\.)?wiki(m|p)edia\.org\//i.test(url);

async function probeImage(ffprobe, file) {
  const r = await run(ffprobe, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,codec_name", "-of", "json", file], { timeoutMs: 20000 });
  if (r.code !== 0) return null;
  try {
    const s = JSON.parse(r.out).streams?.[0];
    if (!s || !(s.width > 0) || !(s.height > 0)) return null;
    return { w: s.width, h: s.height, codec: s.codec_name };
  } catch {
    return null;
  }
}

async function download(url, dest) {
  if (!/^https?:\/\//i.test(url)) return false;
  const ua = isWikimedia(url) ? WM_UA : UA;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const r = await run("curl", ["-L", "-sS", "--max-time", "25", "--max-filesize", "25000000", "-A", ua, "-H", "Accept: image/avif,image/webp,image/png,image/jpeg,*/*", "-o", dest, "-w", "%{http_code}", url], { timeoutMs: 30000 });
    const code = Number(String(r.out).trim().slice(-3));
    if (code === 429 || code === 503) {
      await sleep(4000 * (attempt + 1));
      continue;
    }
    if (r.code !== 0 || code < 200 || code >= 300) return false;
    const st = await fs.stat(dest).catch(() => null);
    return !!st && st.size > 2000;
  }
  return false;
}

// Wikimedia Commons fallback: free-licensed pictures when no web image can be fetched.
// One request per distinct query (cached, one at a time) keeps within Wikimedia's rate limits.
const commonsCache = new Map();
let commonsChain = Promise.resolve();
function commonsUrls(query, limit = 8) {
  if (!commonsCache.has(query)) {
    const p = commonsChain.then(() => commonsFetch(query, limit));
    commonsChain = p.catch(() => []);
    commonsCache.set(query, p);
  }
  return commonsCache.get(query);
}
async function commonsFetch(query, limit) {
  const api = "https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=" + (limit * 2) +
    "&gsrsearch=" + encodeURIComponent(query + " filetype:bitmap") + "&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1600";
  let r = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    r = await run("curl", ["-sS", "--max-time", "20", "-A", WM_UA, "-w", "\n%{http_code}", api], { timeoutMs: 25000 });
    const code = Number(String(r.out).trim().slice(-3));
    if (code !== 429 && code !== 503) break;
    await sleep(5000 * (attempt + 1));
  }
  if (!r || r.code !== 0) return [];
  r.out = String(r.out).replace(/\n\d{3}\s*$/, "");
  try {
    const pages = Object.values(JSON.parse(r.out).query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
    return pages
      .map((p) => ({ title: p.title, info: p.imageinfo?.[0] }))
      .filter((x) => x.info && /image\/(jpeg|png|webp)/.test(x.info.mime) && x.info.width >= 700 && x.info.height >= 500)
      .slice(0, limit)
      .map((x) => ({
        url: x.info.thumburl || x.info.url,
        page: x.info.descriptionurl,
        source: "Wikimedia Commons",
        license: x.info.extmetadata?.LicenseShortName?.value || "",
        author: String(x.info.extmetadata?.Artist?.value || "").replace(/<[^>]+>/g, "").trim(),
        title: x.title,
      }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------------------------------------
// shots: job.shots = { ffmpeg, threshold, ranges: [{ key, path, startSeconds, seconds }] }
//   -> { [key]: [secondsFromRangeStart, ...] }   hard camera changes inside each range (scene score).
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

// ---------------------------------------------------------------------------------------------------------
// images: job.images = { ffmpeg, ffprobe, fps, mediaFolder, items: [{ id, seconds, query, occurrence, candidates: [{url, thumb?}] }] }
// Each picture becomes a full-frame 1080x1920 still MP4 (cover-cropped, like the reference's cutaways), held a
// second longer than its beat so the clip can be extended in the Draft. Commons is the fallback source.
async function renderStill(spec, item, file, media) {
  const info = await probeImage(spec.ffprobe, file);
  if (!info || info.w < 320 || info.h < 240) return null;
  const out = path.join(media, item.id + ".mp4");
  const secs = Math.max(4, Number(item.seconds) || 3).toFixed(3);
  const vf = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,format=yuv420p";
  const r = await run(spec.ffmpeg, ["-v", "error", "-y", "-loop", "1", "-i", file, "-t", secs, "-r", String(spec.fps || 30), "-vf", vf, "-c:v", "libx264", "-tune", "stillimage", "-preset", "veryfast", "-crf", "18", "-movflags", "+faststart", "-an", out], { timeoutMs: 120000 });
  return r.code === 0 ? { id: item.id, ok: true, path: out, width: 1080, height: 1920, seconds: Number(secs) } : null;
}

async function cmdImages(job, dir) {
  const spec = job.images;
  const raw = path.join(dir, "raw");
  const media = path.join(dir, spec.mediaFolder || "media");
  await fs.mkdir(raw, { recursive: true });
  await fs.mkdir(media, { recursive: true });
  const used = new Set();
  const credits = [];
  const results = await pool(spec.items, 6, async (item) => {
    const tried = [];
    let cands = [...(item.candidates || [])];
    let fellBack = false;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      for (const c of cands) {
        for (const url of [c.url, c.thumb].filter(Boolean)) {
          // Claim the URL before downloading: parallel beats sharing a query must not pick the same picture.
          const key = url.replace(/[?#].*$/, "").replace(/\/\d+px-[^/]+$/, "");
          if (used.has(key)) continue;
          used.add(key);
          const dest = path.join(raw, item.id + "-" + tried.length);
          tried.push(url);
          if (!(await download(url, dest))) continue;
          const done = await renderStill(spec, item, dest, media);
          if (done) {
            credits.push([item.id + ".mp4", c.source || "web", c.title || "", c.author || "", c.license || "", c.page || url].join("\t"));
            return { ...done, url, query: item.query, fellBack };
          }
        }
      }
      if (fellBack || !item.query) break;
      fellBack = true;
      let found = await commonsUrls(item.query);
      const short = String(item.query).replace(/\b(photo|still|stock|image|picture|close[- ]?up)\b/gi, "").trim().split(/\s+/).slice(0, 2).join(" ");
      if (!found.length && short && short !== item.query) found = await commonsUrls(short);
      const rot = (Number(item.occurrence) || 0) % Math.max(1, found.length);
      cands = found.slice(rot).concat(found.slice(0, rot));
    }
    return { id: item.id, ok: false, tried: tried.length, fellBack, query: item.query };
  });
  if (credits.length) await fs.appendFile(path.join(dir, "CREDITS.tsv"), credits.join("\n") + "\n");
  return { items: results };
}

const [, , command, jobPath] = process.argv;
if (!command || !jobPath) {
  console.error("usage: node engine.mjs shots|images <job.json>");
  process.exit(2);
}
try {
  const job = JSON.parse(await fs.readFile(jobPath, "utf8"));
  const dir = path.dirname(jobPath);
  const util = {run, download, commonsUrls};
  const handlers = { shots: cmdShots, images: cmdImages, candidates: (j,d) => candidates(j,d,util), assets: (j,d) => assets(j,d,util) };
  if (!handlers[command]) throw new Error("unknown command " + command);
  const result = await handlers[command](job, dir);
  await fs.writeFile(path.join(dir, command + "-result.json"), JSON.stringify(result));
  const brief = command === "images"
    ? { ok: result.items.filter((i) => i.ok).length, failed: result.items.filter((i) => !i.ok).map((i) => i.id) }
    : result.cuts ? { ranges: Object.keys(result.cuts).length } : { items: (result.items || result.frames || []).length };
  console.log(JSON.stringify({ ok: true, command, ...brief }));
} catch (e) {
  console.error(String(e?.message || e));
  process.exit(1);
}
