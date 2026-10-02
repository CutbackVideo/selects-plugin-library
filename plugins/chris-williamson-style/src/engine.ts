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

// Runs one engine.mjs command from its job file and writes its result file beside it, as engine.mjs does.
async function cwEngine(env, cmd, file) {
  const handlers = { shots: (job) => cwShots(job) };
  if (!handlers[cmd]) throw new Error("This step needs macOS for now (" + cmd + ").");
  const dir = cwDir(file);
  const result = await handlers[cmd](JSON.parse(await hostReadText(file)), dir, env);
  await hostNeed("FileSystem", "writeFile").writeFile(hostJoin(dir, cmd + "-result.json"), new TextEncoder().encode(JSON.stringify(result)));
  return result;
}
// cw-engine:end
