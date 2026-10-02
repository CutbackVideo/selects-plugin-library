// cw-engine:start
// engine.mjs and media.mjs inside the panel: the same commands, job files and result files, on the host's ffmpeg and
// ffprobe (argv, no shell) and FileSystem, so no Node.js is needed. Plain JS (tests run it in node:vm against
// engine.mjs on the same inputs). cwEngine(env, cmd, jobFile) writes <job dir>/<cmd>-result.json as engine.mjs does.
const CW_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
// Wikimedia asks API and media clients for a descriptive user agent and throttles browser-like ones.
const CW_WM_UA = "SelectsPluginChrisWilliamsonStyle/0.1 (https://github.com/CutbackVideo/selects-plugin-library)";
const cwSleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cwIsWikimedia = (url) => /(^https?:\/\/)([^/]*\.)?wiki(m|p)edia\.org\//i.test(url);

async function cwPool(items, size, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) { const i = next++; results[i] = await fn(items[i], i); }
  }));
  return results;
}
// ffmpeg / ffprobe with a time limit: { ok, out, err }. The log is collected as it streams as well, since some host
// builds only return it that way; a failed run carries the host's message.
async function cwTool(kind, args, timeoutMs) {
  const rt = hostNeed("Runtime", kind);
  const c = typeof AbortController === "undefined" ? null : new AbortController();
  const timer = c ? setTimeout(() => c.abort(), timeoutMs) : null;
  let err = "";
  try {
    const r = kind === "runFFmpeg"
      ? await rt.runFFmpeg(args, true, c ? c.signal : undefined, undefined, (s) => { err += s; })
      : await rt.runFFprobe(args, true, c ? c.signal : undefined);
    return { ok: true, out: String(r?.stdout || ""), err: String(r?.stderr || "") || err };
  } catch (e) {
    return { ok: false, out: "", err: err + String(e?.stderr || e?.message || e) };
  } finally { if (timer) clearTimeout(timer); }
}
const cwFfmpeg = (args, timeoutMs) => cwTool("runFFmpeg", args, timeoutMs);
const cwFfprobe = (args, timeoutMs) => cwTool("runFFprobe", args, timeoutMs);
function cwMkdir(dir) { hostNeed("FileSystem", "mkdirSync").mkdirSync(dir, { recursive: true }); }
function cwSize(file) {
  try { const fs = hostApi("FileSystem", "existsSync", "statSync"); return fs && fs.existsSync(file) ? Number(fs.statSync(file)?.size || 0) : 0; } catch { return 0; }
}
const cwDir = (file) => String(file).replace(/[\\/][^\\/]*$/, "");

// ---------------------------------------------------------------------------------------------------------
// shots: job.shots = { threshold, ranges: [{ key, path, startSeconds, seconds }] }
//   -> { cuts: { [key]: [secondsFromRangeStart, ...] } }   hard camera changes inside each range (scene score).
async function cwShots(job) {
  const s = job.shots;
  const out = {};
  await cwPool(s.ranges || [], 3, async (range) => {
    const r = await cwFfmpeg(["-v", "info", "-ss", String(Math.max(0, range.startSeconds)), "-t", String(range.seconds), "-i", range.path,
      "-an", "-vf", "scale=320:-2,select='gt(scene," + (s.threshold || 0.3) + ")',showinfo", "-f", "null", "-"], 180000);
    if (!r.ok) throw new Error("Shot detection failed: " + r.err.slice(-300));
    const times = [...r.err.matchAll(/pts_time:([0-9.]+)/g)].map((m) => Number(m[1])).filter((t) => t > 0.3 && t < range.seconds - 0.3);
    const kept = [];
    for (const t of times) if (!kept.length || t - kept[kept.length - 1] > 0.8) kept.push(Math.round(t * 1000) / 1000);
    out[range.key] = kept;
  });
  return { cuts: out };
}

// ---------------------------------------------------------------------------------------------------------
// faces: job.faces = { samples: [{ key, path, seconds }] } -> { detected: { [key]: { w, h, faces: [[x,y,w,h]...] } } }
// Apple Vision through vision-helper.js on macOS. Windows has no face detector here: nothing is detected, and the
// pipeline covers every clip from its centred default (and says so).
async function cwFaces(env, job, dir) {
  const samples = job.faces.samples || [];
  if (hostIsWindows()) return { detected: {}, sampled: samples.length, readable: 0 };
  // mac-only:start
  const work = hostJoin(dir, "faces");
  cwMkdir(work);
  const files = await cwPool(samples, 4, async (s, i) => {
    const file = hostJoin(work, "f" + String(i).padStart(3, "0") + ".jpg");
    const r = await cwFfmpeg(["-v", "error", "-y", "-ss", String(Math.max(0, s.seconds)), "-i", s.path, "-frames:v", "1", "-vf", "scale='min(960,iw)':-2", file], 60000);
    return r.ok ? file : null;
  });
  const ok = files.filter(Boolean);
  const out = {};
  // A few images per call, so each answer stays well inside the shell's output limit.
  for (let k = 0; k < ok.length; k += 20) {
    let text = "";
    try { text = await env.runShell("/usr/bin/osascript -l JavaScript " + q(hostJoin(env.pluginDir, "vision-helper.js")) + " faces " + ok.slice(k, k + 20).map(q).join(" "), "Measure framing", 120000); }
    catch (e) { throw new Error("Face detection failed: " + String(e?.message || e).trim()); }
    const rows = String(text).trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
    for (const row of rows) {
      const i = files.indexOf(row.file);
      if (i >= 0) out[samples[i].key] = { w: row.w, h: row.h, faces: row.faces };
    }
  }
  return { detected: out, sampled: samples.length, readable: ok.length };
  // mac-only:end
}

// ---------------------------------------------------------------------------------------------------------
// Downloads. macOS keeps engine.mjs's curl (browser or Wikimedia user agent, HTTP status, 25 MB and 25 s caps).
// Windows never uses FileSystem.downloadFile for search results: Selects buffers that whole response in its main
// process with no size or time limit and then writes it in one blocking call, so one large stock video froze the
// app ("Not responding"). Instead the panel streams the URL with fetch and stops at CW_MAX_BYTES / CW_FETCH_MS (sites
// that allow it, e.g. Wikimedia); a site that blocks the panel's fetch, or a file over the cap, is read by the host's
// ffmpeg in its own process: one frame of a picture, or the first CW_CLIP_SECONDS of a video, with network timeouts.
const CW_MAX_BYTES = 25000000, CW_FETCH_MS = 25000, CW_CLIP_SECONDS = 15;
async function cwDownload(env, url, dest) {
  if (!/^https?:\/\//i.test(url)) return false;
  // mac-only:start
  if (!hostIsWindows()) return await cwCurlDownload(env, url, dest);
  // mac-only:end
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const got = await cwFetchCapped(url, dest);
    if (got === "ok") return true;
    if (got === "retry") { await cwSleep(4000 * (attempt + 1)); continue; }
    if (got === "failed") return false;
    return await cwFfmpegFetch(url, dest);
  }
  return false;
}
// "ok" (written, 2 KB to CW_MAX_BYTES), "retry" (429/503), "failed" (HTTP error or too small), "blocked" (the panel may
// not read it, or it timed out) or "too-big". At most CW_MAX_BYTES are ever held.
async function cwFetchCapped(url, dest) {
  if (typeof fetch !== "function") return "blocked";
  const c = typeof AbortController === "undefined" ? null : new AbortController();
  const timer = c ? setTimeout(() => c.abort(), CW_FETCH_MS) : null;
  try {
    const r = await fetch(url, { signal: c ? c.signal : undefined, headers: cwIsWikimedia(url) ? { "Api-User-Agent": CW_WM_UA } : {} });
    if (r.status === 429 || r.status === 503) return "retry";
    if (!r.ok) return "failed";
    if (Number(r.headers?.get?.("content-length") || 0) > CW_MAX_BYTES) { try { c?.abort(); } catch {} return "too-big"; }
    const chunks = [];
    let total = 0;
    if (r.body && typeof r.body.getReader === "function") {
      const reader = r.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > CW_MAX_BYTES) { try { await reader.cancel(); } catch {} return "too-big"; }
        chunks.push(value);
      }
    } else { const b = new Uint8Array(await r.arrayBuffer()); total = b.byteLength; if (total > CW_MAX_BYTES) return "too-big"; chunks.push(b); }
    if (total <= 2000) return "failed";
    const bytes = new Uint8Array(total);
    let at = 0;
    for (const x of chunks) { bytes.set(x, at); at += x.byteLength; }
    await hostNeed("FileSystem", "writeFile").writeFile(dest, bytes);
    return "ok";
  } catch {
    return "blocked";
  } finally { if (timer) clearTimeout(timer); }
}
// The host's ffmpeg reads the URL in its own process (HTTP range reads, network timeouts): a picture becomes one PNG
// frame, a video its first CW_CLIP_SECONDS, stream-copied into Matroska. The output never exceeds CW_MAX_BYTES.
async function cwFfmpegFetch(url, dest) {
  const net = ["-rw_timeout", "20000000"];
  const p = await cwFfprobe(["-v", "error", ...net, "-show_streams", "-show_format", "-of", "json", url], 30000);
  if (!p.ok) return false;
  let info;
  try { info = JSON.parse(p.out); } catch { return false; }
  const v = info.streams?.find((s) => s.codec_type === "video");
  if (!v) return false;
  const duration = Number(info.format?.duration || v.duration || 0);
  const still = /image2|png_pipe|jpeg_pipe|webp_pipe|gif/.test(info.format?.format_name || "") || !(duration > 0);
  const args = still
    ? ["-v", "error", "-y", ...net, "-i", url, "-frames:v", "1", "-f", "image2", "-c:v", "png", dest]
    : ["-v", "error", "-y", ...net, "-i", url, "-t", String(CW_CLIP_SECONDS), "-map", "0:v:0", "-c", "copy", "-an", "-fs", String(CW_MAX_BYTES), "-f", "matroska", dest];
  const r = await cwFfmpeg(args, 90000);
  const size = cwSize(dest);
  return r.ok && size > 2000 && size <= CW_MAX_BYTES;
}
// mac-only:start
async function cwCurlDownload(env, url, dest) {
  const ua = cwIsWikimedia(url) ? CW_WM_UA : CW_UA;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let out = "";
    try { out = await env.runShell("curl -L -sS --max-time 25 --max-filesize 25000000 -A " + q(ua) + " -H " + q("Accept: image/avif,image/webp,image/png,image/jpeg,*/*") + " -o " + q(dest) + " -w " + q("%{http_code}") + " " + q(url), "Download a B-roll candidate", 30000); } catch { return false; }
    const code = Number(String(out).trim().slice(-3));
    if (code === 429 || code === 503) { await cwSleep(4000 * (attempt + 1)); continue; }
    if (code < 200 || code >= 300) return false;
    return cwSize(dest) > 2000;
  }
  return false;
}
// mac-only:end

// Wikimedia Commons fallback: free-licensed pictures when no web image can be fetched.
// One request per distinct query (cached, one at a time) keeps within Wikimedia's rate limits.
const cwCommonsCache = new Map();
let cwCommonsChain = Promise.resolve();
function cwCommonsUrls(env, query, limit = 8) {
  if (!cwCommonsCache.has(query)) {
    const p = cwCommonsChain.then(() => cwCommonsFetch(env, query, limit));
    cwCommonsChain = p.catch(() => []);
    cwCommonsCache.set(query, p);
  }
  return cwCommonsCache.get(query);
}
async function cwCommonsFetch(env, query, limit) {
  const api = "https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=" + (limit * 2) +
    "&gsrsearch=" + encodeURIComponent(query + " filetype:bitmap") + "&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1600";
  const text = await cwCommonsGet(env, api);
  return text == null ? [] : cwCommonsRows(text, limit);
}
// The API's answer as text, or null. Windows: the panel's fetch (CORS through origin=*, the descriptive agent in
// Api-User-Agent). macOS: curl, as engine.mjs.
async function cwCommonsGet(env, api) {
  // mac-only:start
  if (!hostIsWindows()) {
    let out = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try { out = await env.runShell("curl -sS --max-time 20 -A " + q(CW_WM_UA) + " -w " + q("\\n%{http_code}") + " " + q(api), "Search Wikimedia Commons", 25000); } catch { return null; }
      const code = Number(String(out).trim().slice(-3));
      if (code !== 429 && code !== 503) break;
      await cwSleep(5000 * (attempt + 1));
    }
    return String(out).replace(/\n\d{3}\s*$/, "");
  }
  // mac-only:end
  if (typeof fetch !== "function") return null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const r = await fetch(api + "&origin=*", { headers: { "Api-User-Agent": CW_WM_UA } });
      if (r.status === 429 || r.status === 503) { await cwSleep(5000 * (attempt + 1)); continue; }
      return await r.text();
    } catch { return null; }
  }
  return null;
}
function cwCommonsRows(text, limit) {
  try {
    const pages = Object.values(JSON.parse(text).query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
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
// candidates: job.candidates = { items: [{ id, query, desiredKind, candidates: [{ path?, url?, ... }] }] } -> { items }
// Up to three candidates per item (Commons fills the rest), each fetched, measured (size, length, motion) and shown
// as an original | 9:16 crop preview for the review.
async function cwInspect(file) {
  const p = await cwFfprobe(["-v", "error", "-show_streams", "-show_format", "-of", "json", file], 20000);
  if (!p.ok) throw new Error("Unreadable media");
  const info = JSON.parse(p.out), v = info.streams?.find((s) => s.codec_type === "video");
  if (!v || v.width < 320 || v.height < 240) throw new Error("Media below 320×240");
  const duration = Number(info.format?.duration || v.duration || 0);
  const still = /image2|png_pipe|jpeg_pipe|webp_pipe/.test(info.format?.format_name || "") || duration === 0;
  const times = still ? [0] : [0.1, Math.min(duration * 0.5, duration - 0.05), Math.max(0, duration - 0.1)];
  const pixels = [];
  for (let i = 0; i < times.length; i++) {
    const out = file + ".motion-" + i + ".rgb";
    const r = await cwFfmpeg(["-v", "error", "-y", "-ss", String(times[i]), "-i", file, "-frames:v", "1", "-vf", "scale=32:32", "-pix_fmt", "rgb24", "-f", "rawvideo", out], 20000);
    if (!r.ok) throw new Error("Cannot decode sampled frame");
    pixels.push(await hostReadBytes(out));
    await hostRemove(out);
  }
  let delta = 0;
  for (const px of pixels.slice(1)) {
    if (px.length !== pixels[0].length) throw new Error("Invalid sampled pixels");
    delta = Math.max(delta, px.reduce((s, x, i) => s + Math.abs(x - pixels[0][i]), 0) / px.length);
  }
  return { width: v.width, height: v.height, duration, kind: still || delta < 2 ? "still" : "video", motionDelta: Number(delta.toFixed(3)) };
}
async function cwPreview(file, out, t = 0) {
  const vf = "split[a][b];[a]scale=256:456:force_original_aspect_ratio=decrease,pad=256:456:(ow-iw)/2:(oh-ih)/2[a1];[b]scale=256:456:force_original_aspect_ratio=increase,crop=256:456[b1];[a1][b1]hstack";
  const r = await cwFfmpeg(["-v", "error", "-y", "-ss", String(t), "-i", file, "-filter_complex", vf, "-frames:v", "1", out], 30000);
  if (!r.ok) throw new Error("Cannot render asset preview");
}
async function cwCandidates(env, job, dir) {
  const spec = job.candidates, result = [], work = hostJoin(dir, "candidates");
  cwMkdir(work);
  // Sequential download protects public source rate limits and bounds working-set memory.
  for (const item of spec.items) {
    const choices = (item.candidates || []).filter((c) => c.path || c.url).slice(0, 3);
    if (choices.length < 3) choices.push(...(await cwCommonsUrls(env, item.query, 3)).slice(0, 3 - choices.length));
    const rows = [];
    for (const [i, c] of choices.entries()) {
      const id = item.id + "-" + i;
      env?.status?.("Preparing B-roll candidates " + (result.length + 1) + "/" + spec.items.length + "…");
      try {
        const file = hostJoin(work, id + ".source");
        if (c.path) await hostNeed("FileSystem", "copyFile").copyFile(c.path, file); else if (!await cwDownload(env, c.url, file)) continue;
        const info = await cwInspect(file);
        const thumb = hostJoin(work, id + ".jpg");
        await cwPreview(file, thumb);
        const frames = [thumb];
        if (info.kind === "video") { const mid = hostJoin(work, id + "-mid.jpg"); await cwPreview(file, mid, info.duration / 2); frames.push(mid); }
        rows.push({ id, file, preview: thumb, frames, ...info, source: c.source || (c.path ? "project" : "web"), page: c.page || c.url || c.path, url: c.url || null, license: c.license || "", author: c.author || "", title: c.title || "", originalPath: c.path || null });
      } catch (e) { rows.push({ id, error: String(e?.message || e) }); }
    }
    result.push({ id: item.id, query: item.query, desiredKind: item.desiredKind || "video", candidates: rows });
  }
  return { items: result };
}

// ---------------------------------------------------------------------------------------------------------
// The cutaway encoder. Some host ffmpeg builds (Windows) ship without libx264: the host's encoder list is read once
// and, without libx264, mpeg4 (in every ffmpeg build) renders the same container, size and frames. A list that
// can't be read keeps libx264, as engine.mjs does. Hardware H.264 encoders are not used (they fail at run time).
function cwPickEncoder(list) {
  const has = (name) => new RegExp("^\\s*V\\S*\\s+" + name + "\\s", "m").test(String(list || ""));
  if (has("libx264") || !/^\s*V\S*\s+\w/m.test(String(list || ""))) return { codec: "libx264", args: ["-c:v", "libx264", "-preset", "veryfast", "-crf", "18"] };
  return { codec: "mpeg4", args: ["-c:v", "mpeg4", "-q:v", "2"] };
}
let cwEncoderList = null;
function cwEncoders() {
  if (!cwEncoderList) cwEncoderList = (async () => {
    const rt = hostApi("Runtime", "runFFmpeg");
    if (!rt) return "";
    let text = "";
    try {
      const r = await rt.runFFmpeg(["-hide_banner", "-encoders"], true, undefined, (s) => { text += s; }, (s) => { text += s; });
      return String(r?.stdout || "") + "\n" + text + "\n" + String(r?.stderr || "");
    } catch (e) { return text + "\n" + String(e?.stdout || ""); }
  })();
  return cwEncoderList;
}

// ---------------------------------------------------------------------------------------------------------
// assets: job.assets = { fps, mediaFolder, items: [{ id, candidate, review, desiredKind, seconds }] } -> { items }
// Each accepted candidate becomes a 1080x1920 H.264 cutaway (MPEG-4 without libx264, see cwPickEncoder) cropped at
// the reviewed focus, with frames for the final review; CREDITS.json keeps the attribution (a second pass adds to
// the first). One video stream only (-write_tmcd 0: no timecode track from a camera original).
async function cwAssets(job, dir) {
  const spec = job.assets, media = hostJoin(dir, spec.mediaFolder);
  cwMkdir(media);
  const encoder = cwPickEncoder(await cwEncoders());
  const rows = [];
  for (const item of spec.items) {
    const c = item.candidate;
    if (!c || c.error || !item.review?.accepted) { rows.push({ id: item.id, ok: false, reason: "No visually accepted candidate" }); continue; }
    const x = Number(item.review.focusX), y = Number(item.review.focusY);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) throw new Error("Invalid crop focus");
    const file = hostJoin(media, item.id + ".mp4"), seconds = Math.max(0.1, item.seconds);
    // Short videos are rejected instead of frozen or silently looped.
    if (c.kind === "video" && c.duration < seconds) { rows.push({ id: item.id, ok: false, reason: "Video is shorter than its planned cutaway" }); continue; }
    const args = ["-v", "error", "-y", ...(c.kind === "still" ? ["-loop", "1"] : []), "-i", c.file, "-t", String(seconds), "-vf", `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920:(iw-ow)*${x}:(ih-oh)*${y},setsar=1,format=yuv420p`, "-r", String(spec.fps), ...encoder.args, "-movflags", "+faststart", "-write_tmcd", "0", "-an", file];
    const r = await cwFfmpeg(args, 120000);
    if (!r.ok) throw new Error("Asset rendering failed: " + r.err.slice(-300));
    const frames = [];
    for (const [n, t] of (c.kind === "video" ? [0, seconds / 2, Math.max(0, seconds - 0.1)] : [0]).entries()) {
      const thumb = hostJoin(dir, item.id + "-final-" + n + ".jpg");
      const rr = await cwFfmpeg(["-v", "error", "-y", "-ss", String(t), "-i", file, "-frames:v", "1", "-vf", "scale=256:456", thumb], 20000);
      if (!rr.ok) throw new Error("Cannot inspect final crop");
      frames.push(thumb);
    }
    rows.push({ id: item.id, ok: true, path: file, preview: frames[0], frames, kind: c.kind, seconds, width: 1080, height: 1920, review: item.review, source: c.source, url: c.url, page: c.page, license: c.license, author: c.author, originalPath: c.originalPath, motionDelta: c.motionDelta, substitution: item.desiredKind === "video" && c.kind === "still" });
  }
  const creditsFile = hostJoin(dir, "CREDITS.json");
  let earlier = [];
  try { earlier = JSON.parse(await hostReadText(creditsFile)); } catch { earlier = []; }
  await hostNeed("FileSystem", "writeFile").writeFile(creditsFile, new TextEncoder().encode(JSON.stringify([...earlier.filter((e) => !rows.some((r) => r.id === e.id)), ...rows], null, 2)));
  return { items: rows };
}

// Runs one engine.mjs command from its job file and writes its result file beside it, as engine.mjs does.
async function cwEngine(env, cmd, file) {
  const handlers = { shots: (job) => cwShots(job), faces: (job, dir, env) => cwFaces(env, job, dir), assets: (job, dir) => cwAssets(job, dir), candidates: (job, dir, env) => cwCandidates(env, job, dir) };
  if (!handlers[cmd]) throw new Error("This step needs macOS for now (" + cmd + ").");
  const dir = cwDir(file);
  const result = await handlers[cmd](JSON.parse(await hostReadText(file)), dir, env);
  await hostNeed("FileSystem", "writeFile").writeFile(hostJoin(dir, cmd + "-result.json"), new TextEncoder().encode(JSON.stringify(result)));
  return result;
}
// cw-engine:end
