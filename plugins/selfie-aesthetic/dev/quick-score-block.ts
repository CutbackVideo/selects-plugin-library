// quick-score:start
// Quick local shot score for clips Selects has not analysed (no scene search). Plain JS and self-contained: it reaches
// the host only through window.parent.__DI__ (Runtime.runFFmpeg and FileSystem, every member checked first), or through
// `opts.io` (tests, other hosts), so it can be pasted into any style-app panel and kept as one kit file
// (tools/panel/quick-score.ts). No shell, no node: the host's bundled ffmpeg decodes a small grey preview
// (QS_FPS frames a second, QS_W x QS_H pixels) of the part of the clip the planner could use into a temporary file in
// the data folder, which is read back and removed. Paths are joined by the host; generated names are ASCII.
//
// API
//   quickScore(resource, { windows, budgetMs, signal, onProgress, dataDir, io, fps })
//       resource: { rid, path, durationSeconds, mtimeMs? }. windows: optional [{ start, end }] to score; without them the
//       clip is scored in QS_BIN-second bins from QS_HEAD on (at most QS_SPAN seconds). Returns
//       { rid, windows: [{ start, end, motion, sharp, luma, clipped, flags }], sceneCuts: [seconds], ms, fallback,
//         cached, duration }
//       flags: { black, fade, flash, blur, dark, bright, cut } (booleans). motion = mean absolute frame difference
//       (0-1), sharp = mean absolute Laplacian (0-1), luma = mean luma (0-1), clipped = share of pixels near black or
//       white. When ffmpeg is missing or fails (or the budget runs out) it never throws for that: it returns evenly
//       spaced, unflagged windows from QS_HEAD on with `fallback: true`, so a build still goes ahead. It throws only
//       when `signal` aborts.
//   quickScoreAll(resources, { concurrency, budgetMs, signal, onProgress, ... }) -> Map rid -> result. Bounded
//       concurrency; onProgress({ done, total, rid }) after each clip; the budget is shared (clips not started in time get
//       the fallback).
//   pickWindowsLocal(scores, role, durationNeeded) -> [{ start, end, score, motion, flags }] best first, every window
//       starting at or after QS_HEAD and ending inside the clip. role: 'steady' (opening, credit, ending: steadier,
//       well-exposed), 'montage' (varied motion; moving windows rank higher), 'still' (the lowest motion). Windows with
//       black, fade or flash frames, or a scene cut inside, are left out while any other window fits; blur, dark and
//       bright windows rank lower. score is 0-1 (comparable across clips and roles).
//   qsCandidates(scores, role, durationNeeded, max) -> planner candidates [{ t, score, motion }] (t = window centre).
// Cache: one JSON per clip in <dataDir>/quick-score/, keyed by the resource id, the file's modification time and
// QS_VERSION, so a rebuild does not decode the same clip twice.
var QS_VERSION = 2;
// One decode pass at the settings Selfie Aesthetic Edit measured (sae-host saeMotionArgs: fps 8, gray rawvideo,
// 0.25-0.65 s for 120 s of source) gives every per-frame figure below.
var QS_FPS = 8;
var QS_W = 64, QS_H = 36;
// Windows start at least this far into the clip: stock clips often fade in from black over their first frames.
var QS_HEAD = 0.5;
// Scores are kept per bin of this many seconds; pickWindowsLocal joins bins into a window of any length.
var QS_BIN = 0.5;
// At most this many seconds of a clip are decoded (from QS_HEAD); a longer clip is scored over its first QS_SPAN.
var QS_SPAN = 120;
var QS_BUDGET_MS = 30000;
// Frame thresholds (luma 0-1).
var QS_BLACK = 0.07, QS_DARK = 0.16, QS_CLIP_LO = 16 / 255, QS_CLIP_HI = 240 / 255, QS_BRIGHT_SHARE = 0.45;
var QS_FLASH_JUMP = 0.25, QS_CUT_DIFF = 0.12, QS_CUT_RATIO = 4;

function qsTag(x) { return Object.prototype.toString.call(x); }
function qsBytes(v) {
  if (qsTag(v) === "[object ArrayBuffer]") return new Uint8Array(v);
  if (v && typeof v.byteLength === "number" && v.buffer && qsTag(v.buffer) === "[object ArrayBuffer]") return new Uint8Array(v.buffer, v.byteOffset || 0, v.byteLength);
  if (v && typeof v === "object" && typeof v.length === "number") return Uint8Array.from(v);
  return null;
}
// The host's services for this module: runFFmpeg(args, signal), readBytes(path), remove(path), join(...parts),
// mkdir(dir), mtimeMs(path), readText(path), writeText(path, text). Members the host lacks are null.
function qsHostIO() {
  var di = null;
  try { di = (window.parent && window.parent["__DI__"]) || null; } catch (e) { di = null; }
  var rt = di && di.Runtime, fs = di && di.FileSystem;
  var fn = function (o, m) { return !!o && typeof o[m] === "function"; };
  return {
    runFFmpeg: fn(rt, "runFFmpeg") ? function (args, signal) { return rt.runFFmpeg(args, true, signal); } : null,
    readBytes: fn(fs, "readFile") ? async function (p) { return qsBytes(await fs.readFile(p)); } : null,
    remove: fs ? async function (p) {
      var tries = ["removeFile", "remove", "rm", "unlink", "unlinkSync"];
      for (var i = 0; i < tries.length; i++) {
        if (!fn(fs, tries[i])) continue;
        try { await (tries[i] === "removeFile" ? fs.removeFile({ filePath: p }) : fs[tries[i]](p)); return; } catch (e) { /* the next one */ }
      }
    } : null,
    join: fn(fs, "join") ? function () { return String(fs.join.apply(fs, arguments)); } : null,
    mkdir: fn(fs, "mkdirSync") ? function (d) { fs.mkdirSync(d, { recursive: true }); } : null,
    mtimeMs: fn(fs, "statSync") ? function (p) { var s = fs.statSync(p); return s && Number(s.mtimeMs || (s.mtime && +new Date(s.mtime)) || 0); } : null,
    readText: fn(fs, "readFile") ? async function (p) { var v = await fs.readFile(p, "utf8"); return typeof v === "string" ? v : new TextDecoder().decode(qsBytes(v)); } : null,
    writeText: fn(fs, "writeFile") ? async function (p, t) { await fs.writeFile(p, t); } : null,
  };
}

// Pure: per-frame statistics of QS_W x QS_H grey frames packed in `bytes`.
function qsFrameStats(bytes, w, h) {
  var size = w * h, n = Math.floor(bytes.length / size), out = [];
  for (var f = 0; f < n; f++) {
    var o = f * size, sum = 0, lo = 0, hi = 0, lap = 0, diff = 0;
    for (var i = 0; i < size; i++) {
      var v = bytes[o + i];
      sum += v;
      if (v <= QS_CLIP_LO * 255) lo++; else if (v >= QS_CLIP_HI * 255) hi++;
      if (f > 0) diff += Math.abs(v - bytes[o - size + i]);
    }
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var k = o + y * w + x;
        lap += Math.abs(4 * bytes[k] - bytes[k - 1] - bytes[k + 1] - bytes[k - w] - bytes[k + w]);
      }
    }
    out.push({ luma: sum / size / 255, lo: lo / size, hi: hi / size, sharp: lap / ((w - 2) * (h - 2)) / 1020,
      diff: f > 0 ? diff / size / 255 : 0 });
  }
  return out;
}

// Pure: scene changes (seconds from `offset`): a frame difference at least QS_CUT_DIFF and QS_CUT_RATIO times the
// median difference of the frames around it.
function qsSceneCuts(stats, fps, offset) {
  var cuts = [];
  for (var i = 1; i < stats.length; i++) {
    var near = [];
    for (var j = Math.max(1, i - 6); j <= Math.min(stats.length - 1, i + 6); j++) if (j !== i) near.push(stats[j].diff);
    near.sort(function (a, b) { return a - b; });
    var med = near.length ? near[Math.floor(near.length / 2)] : 0;
    var d = stats[i].diff;
    var flash = i + 1 < stats.length && stats[i].luma - stats[i - 1].luma > QS_FLASH_JUMP && stats[i].luma - stats[i + 1].luma > QS_FLASH_JUMP;
    if (!flash && d >= QS_CUT_DIFF && d >= QS_CUT_RATIO * Math.max(med, 0.002)) cuts.push(offset + i / fps);
  }
  return cuts;
}

// Pure: scores of `windows` ([{ start, end }], seconds in the clip) from frame stats decoded from `offset` at `fps`.
function qsWindowScores(stats, fps, offset, windows, sceneCuts) {
  var sharpAll = stats.map(function (s) { return s.sharp; }).sort(function (a, b) { return a - b; });
  var sharpMed = sharpAll.length ? sharpAll[Math.floor(sharpAll.length / 2)] : 0;
  var out = [];
  for (var w = 0; w < windows.length; w++) {
    var a = windows[w].start, b = windows[w].end;
    var i0 = Math.max(0, Math.round((a - offset) * fps)), i1 = Math.min(stats.length, Math.round((b - offset) * fps));
    if (i1 <= i0) { out.push({ start: a, end: b, motion: 0, sharp: 0, luma: 0, clipped: 0, flags: { black: false, fade: false, flash: false, blur: false, dark: false, bright: false, cut: false }, empty: true }); continue; }
    var motion = 0, sharp = 0, luma = 0, clipped = 0, black = 0, flash = false, lmin = 1, lmax = 0, dark = 0, bright = 0, nd = 0;
    for (var i = i0; i < i1; i++) {
      var s = stats[i];
      if (i > i0) { motion += s.diff; nd++; }
      sharp += s.sharp; luma += s.luma; clipped += s.lo + s.hi;
      if (s.luma < QS_BLACK) black++;
      if (s.luma < QS_DARK) dark++;
      if (s.hi > QS_BRIGHT_SHARE) bright++;
      lmin = Math.min(lmin, s.luma); lmax = Math.max(lmax, s.luma);
      var p = stats[i - 1], q = stats[i + 1];
      if (p && q && s.luma - p.luma > QS_FLASH_JUMP && s.luma - q.luma > QS_FLASH_JUMP) flash = true;
    }
    var n = i1 - i0;
    motion = nd ? motion / nd : 0; sharp /= n; luma /= n; clipped /= n;
    // A fade: luma rises or falls steadily (at least 80 % of the steps one way) by at least 0.04 and 15 %. A pan or a
    // person walking keeps the mean luma about level; a fade's tail (70 to 100 % brightness) still counts.
    var up = 0, down = 0;
    for (var k = i0 + 1; k < i1; k++) { var dl = stats[k].luma - stats[k - 1].luma; if (dl > 0.003) up++; else if (dl < -0.003) down++; }
    var steps = Math.max(1, i1 - i0 - 1);
    var fade = steps >= 2 && Math.max(up, down) >= 0.8 * steps && lmax - lmin > 0.04 && lmax > 1.15 * Math.max(lmin, 0.01);
    // A cut in [a, b): informational per bin; pickWindowsLocal checks cuts against each whole window.
    var cut = (sceneCuts || []).some(function (t) { return t >= a - 1e-6 && t < b - 1e-6; });
    out.push({ start: a, end: b, motion: motion, sharp: sharp, luma: luma, clipped: clipped,
      flags: { black: black / n > 0.3, fade: fade, flash: flash, blur: sharpMed > 0 ? sharp < 0.45 * sharpMed && sharp < 0.02 : sharp < 0.01,
        dark: dark / n > 0.5, bright: bright / n > 0.5, cut: cut } });
  }
  return out;
}

// QS_BIN-second bins from QS_HEAD to the end of the scored span.
function qsBins(duration, head, span) {
  var end = Math.min(duration, head + span), bins = [];
  for (var t = head; t + QS_BIN <= end + 1e-6; t += QS_BIN) bins.push({ start: Math.round(t * 1000) / 1000, end: Math.round((t + QS_BIN) * 1000) / 1000 });
  return bins;
}
function qsFallback(resource, ms, windows) {
  var dur = Number(resource.durationSeconds) || 0;
  var ws = (windows && windows.length ? windows : qsBins(dur, Math.min(QS_HEAD, Math.max(0, dur - QS_BIN)), QS_SPAN)).map(function (x) {
    return { start: x.start, end: x.end, motion: 0, sharp: 0, luma: 0.5, clipped: 0, flags: { black: false, fade: false, flash: false, blur: false, dark: false, bright: false, cut: false } };
  });
  return { rid: resource.rid, windows: ws, sceneCuts: [], ms: ms || 0, fallback: true, cached: false, duration: dur };
}
function qsAbortError() { var e = new Error("cancelled"); e.name = "AbortError"; return e; }

async function quickScore(resource, opts) {
  opts = opts || {};
  var t0 = Date.now(), io = opts.io || qsHostIO(), signal = opts.signal, fps = opts.fps || QS_FPS;
  var dur = Number(resource.durationSeconds) || 0;
  var deadline = t0 + (opts.budgetMs == null ? QS_BUDGET_MS : opts.budgetMs);
  if (signal && signal.aborted) throw qsAbortError();
  var dataDir = opts.dataDir || null;
  if (!(dur > 0) || !resource.path || !io.runFFmpeg || !io.readBytes || !io.join || !dataDir) return qsFallback(resource, Date.now() - t0, opts.windows);
  // The decoded span: the given windows, else QS_HEAD .. QS_HEAD + QS_SPAN.
  var ws = opts.windows && opts.windows.length ? opts.windows : null;
  var a = ws ? Math.max(0, Math.min.apply(null, ws.map(function (x) { return x.start; }))) : Math.min(QS_HEAD, Math.max(0, dur - QS_BIN));
  var b = ws ? Math.min(dur, Math.max.apply(null, ws.map(function (x) { return x.end; }))) : Math.min(dur, a + QS_SPAN);
  var dir = io.join(dataDir, "quick-score");
  var safe = String(resource.rid).replace(/[^A-Za-z0-9_-]/g, "_");
  var mtime = 0;
  try { mtime = io.mtimeMs ? Math.round(io.mtimeMs(resource.path) || 0) : 0; } catch (e) { mtime = 0; }
  // mtime is 0 when the host lacks FileSystem.statSync, so the duration also keys the cache (a file replaced at the same
  // path with different media is not served stale scores; Mini Vlog review).
  var dur = Number(resource.durationSeconds || 0).toFixed(3);
  var key = [QS_VERSION, fps, QS_W, QS_H, mtime, dur, a.toFixed(3), b.toFixed(3)].join("-");
  var cacheFile = io.join(dir, safe + ".json");
  if (io.readText && !ws) {
    try {
      var c = JSON.parse(await io.readText(cacheFile));
      if (c && c.key === key && c.result) return Object.assign({}, c.result, { cached: true, ms: Date.now() - t0 });
    } catch (e) { /* no cache yet */ }
  }
  if (Date.now() > deadline) return qsFallback(resource, Date.now() - t0, opts.windows);
  try { if (io.mkdir) io.mkdir(dir); } catch (e) { /* the decode below reports it */ }
  var tmp = io.join(dir, safe + "-" + Date.now() + "-" + Math.floor(Math.random() * 1e6) + ".gray");
  var controller = typeof AbortController === "undefined" ? null : new AbortController();
  var relay = function () { if (controller) controller.abort(); };
  var timer = controller ? setTimeout(relay, Math.max(1000, deadline - Date.now())) : null;
  if (signal) signal.addEventListener("abort", relay);
  try {
    await io.runFFmpeg(["-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-ss", a.toFixed(3), "-t", (b - a).toFixed(3), "-i", resource.path,
      "-an", "-vf", "fps=" + fps + ",scale=" + QS_W + ":" + QS_H + ",setsar=1,format=gray", "-f", "rawvideo", tmp], controller ? controller.signal : undefined);
    var bytes = await io.readBytes(tmp);
    if (!bytes || bytes.length < QS_W * QS_H) throw new Error("no frames");
    var stats = qsFrameStats(bytes, QS_W, QS_H);
    var cuts = qsSceneCuts(stats, fps, a);
    var windows = qsWindowScores(stats, fps, a, ws || qsBins(dur, a, b - a), cuts);
    var result = { rid: resource.rid, windows: windows, sceneCuts: cuts, ms: Date.now() - t0, fallback: false, cached: false, duration: dur };
    if (io.writeText && !ws) { try { await io.writeText(cacheFile, JSON.stringify({ key: key, result: result })); } catch (e) { /* no cache, no harm */ } }
    return result;
  } catch (e) {
    if (signal && signal.aborted) throw qsAbortError();
    return qsFallback(resource, Date.now() - t0, opts.windows);
  } finally {
    if (timer) clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", relay);
    if (io.remove) { try { await io.remove(tmp); } catch (e) { /* left behind */ } }
  }
}

async function quickScoreAll(resources, opts) {
  opts = opts || {};
  var results = new Map(), total = resources.length, done = 0, next = 0;
  var conc = Math.max(1, Math.min(opts.concurrency || 3, total || 1));
  var t0 = Date.now(), budget = opts.budgetMs == null ? QS_BUDGET_MS : opts.budgetMs;
  async function worker() {
    while (next < total) {
      var r = resources[next++];
      if (opts.signal && opts.signal.aborted) throw qsAbortError();
      var left = budget - (Date.now() - t0);
      var res = left > 0 ? await quickScore(r, Object.assign({}, opts, { budgetMs: left, onProgress: null })) : qsFallback(r, 0, null);
      results.set(r.rid, res);
      done++;
      if (opts.onProgress) { try { opts.onProgress({ done: done, total: total, rid: r.rid }); } catch (e) { /* the UI only */ } }
    }
  }
  var workers = [];
  for (var i = 0; i < conc; i++) workers.push(worker());
  await Promise.all(workers);
  return results;
}

// Pure: windows of `durationNeeded` seconds for `role`, best first (see the API above).
function pickWindowsLocal(scores, role, durationNeeded) {
  if (!scores || !scores.windows || !scores.windows.length) return [];
  var bins = scores.windows.filter(function (w) { return !w.empty; });
  var need = Math.max(QS_BIN, Number(durationNeeded) || QS_BIN), dur = Number(scores.duration) || 0;
  var sharpMax = Math.max.apply(null, bins.map(function (w) { return w.sharp; }).concat([1e-6]));
  var motions = bins.map(function (w) { return w.motion; }).sort(function (a, b) { return a - b; });
  var mRef = Math.max(0.01, motions[Math.floor(motions.length * 0.9)] || 0);
  var out = [], strict = [];
  for (var i = 0; i < bins.length; i++) {
    var start = bins[i].start;
    if (start < QS_HEAD - 1e-6 && dur >= need + QS_HEAD) continue;
    var j = i, end = start, group = [];
    while (j < bins.length && end - start < need - 1e-6) { if (group.length && Math.abs(bins[j].start - end) > 1e-3) break; group.push(bins[j]); end = bins[j].end; j++; }
    if (end - start < need - 1e-6) {
      // The last bins may be shorter than the window: accept when the clip itself reaches the end.
      if (dur && start + need <= dur + 1e-6 && group.length) end = start + need; else continue;
    }
    if (dur && start + need > dur + 1e-6) continue;
    var m = 0, sh = 0, lu = 0, bad = false, soft = 0;
    for (var g = 0; g < group.length; g++) {
      var x = group[g];
      m += x.motion; sh += x.sharp; lu += x.luma;
      if (x.flags.black || x.flags.fade || x.flags.flash) bad = true;
      if (x.flags.blur) soft += 0.3; if (x.flags.dark) soft += 0.2; if (x.flags.bright) soft += 0.2;
    }
    // A scene cut inside the window (not at its edges) would show two shots in one.
    var edge = 1 / QS_FPS, wend = start + need;
    if ((scores.sceneCuts || []).some(function (t) { return t > start + edge && t < wend - edge; })) bad = true;
    m /= group.length; sh /= group.length; lu /= group.length; soft /= group.length;
    var mr = Math.min(1, m / mRef);
    var moveTerm = role === "still" ? 1 - mr : role === "steady" ? 1 - Math.abs(mr - 0.35) : 0.4 + 0.6 * mr;
    var expose = Math.max(0, 1 - Math.abs(lu - 0.45) * 2);
    var score = Math.max(0, Math.min(1, 0.35 * (sh / sharpMax) + 0.3 * expose + 0.35 * moveTerm - soft));
    var cand = { start: start, end: start + need, score: Math.round(score * 1000) / 1000, motion: m, flags: { bad: bad, soft: soft > 0 } };
    (bad ? out : strict).push(cand);
  }
  var by = function (x, y) { return y.score - x.score || x.start - y.start; };
  strict.sort(by); out.sort(by);
  // Flagged windows only when nothing clean fits.
  return strict.length ? strict : out;
}

// Planner candidates (window centres) of a scored clip for `role`: at most `max`, at least `apart` seconds apart.
function qsCandidates(scores, role, durationNeeded, max, apart) {
  var picks = pickWindowsLocal(scores, role, durationNeeded), out = [];
  var gap = apart == null ? Math.max(1, durationNeeded) : apart;
  for (var i = 0; i < picks.length && out.length < (max || 6); i++) {
    var c = (picks[i].start + picks[i].end) / 2;
    if (out.some(function (o) { return Math.abs(o.t - c) < gap; })) continue;
    out.push({ t: Math.round(c * 1000) / 1000, score: picks[i].score, motion: picks[i].motion });
  }
  return out;
}
// quick-score:end
