// @name Portrait Beat Montage
// @name:de Portrait Beat Montage
// @name:en Portrait Beat Montage
// @name:es Portrait Beat Montage
// @name:fr Portrait Beat Montage
// @name:it Portrait Beat Montage
// @name:ja Portrait Beat Montage
// @name:ko Portrait Beat Montage
// @name:pt Portrait Beat Montage
// @name:tr Portrait Beat Montage
// @name:zh Portrait Beat Montage
// @collection visual-highlights
// @icon video
// Builds a 3:4 portrait montage: a monochrome strobe, fifteen beat-cut shots that
// enter on a person-only zigzag smear with a warm flash, and a white glow ending.
import React from "react";

const PLUGIN = "portrait-beat-montage";
const SHOTS = 10;
const MIN_SECONDS = 1.1;
const json = JSON.stringify;

// av-host:start
// Host I/O for a style-app panel: plain JS and self-contained (no app names, no UI text), so it can move to a shared
// kit file and tests can run it in node:vm. Guarded access to the host's renderer services (window.parent.__DI__,
// documented as internal, so every member is checked before use), the platform, path joins, file reads and removal,
// the install and data folders, and the host's bundled ffmpeg (Runtime.runFFmpeg / runFFprobe: argv arrays, no shell,
// nothing for the user to install). Paths are built with FileSystem.join and never pass through a console; generated
// file names are ASCII. There is no shell call at all (kit windows.md). Errors carry `code`: 'host-missing' (with `member`, a service method this Selects
// build lacks: the caller shows one "needs a newer Selects" message) or 'not-found' (no install folder).
function hostError(code, message, member = "") { return Object.assign(new Error(message), { code, member }); }
function hostDI() { try { return (window.parent && window.parent["__DI__"]) || null; } catch { return null; } }
// A host service when it has every named method, else null.
function hostApi(name, ...methods) {
  const s = hostDI()?.[name];
  return s && methods.every((m) => typeof s[m] === "function") ? s : null;
}
// A host service that must have `method`; throws a 'host-missing' error when this build lacks it.
function hostNeed(name, method) {
  const s = hostApi(name, method);
  if (!s) throw hostError("host-missing", "this Selects build has no " + name + "." + method, name + "." + method);
  return s;
}
// Windows or not: the host's own answer (Runtime.getPlatform: "win32", "darwin"), else the browser's.
function hostIsWindows() {
  try {
    const rt = hostApi("Runtime", "getPlatform");
    const p = rt ? String(rt.getPlatform() || "") : "";
    if (p) return /^win/i.test(p);
  } catch { /* the browser decides */ }
  try {
    const n = navigator;
    return /^win/i.test(String(n.platform || "")) || /Windows NT/i.test(String(n.userAgent || ""));
  } catch { return false; }
}
// Joins path parts with the host's join (the OS separator), or by hand with the OS separator.
function hostJoin(...parts) {
  const fs = hostApi("FileSystem", "join");
  if (fs) { try { return String(fs.join(...parts)); } catch { /* join by hand */ } }
  const sep = hostIsWindows() ? "\\" : "/";
  return parts.filter((x) => x !== "").map((x, i) => (i === 0 ? x.replace(/[\\/]+$/, "") : x.replace(/^[\\/]+|[\\/]+$/g, ""))).join(sep);
}
// A Buffer, ArrayBuffer or typed array as bytes (a Buffer may be a view into a larger pool). The value comes from the
// host window (window.parent), another JavaScript realm, so `instanceof ArrayBuffer` is false for it: the checks use
// the internal [[Class]] tag and array-likeness instead.
function hostBytes(v) {
  const tag = (x) => Object.prototype.toString.call(x);
  if (tag(v) === "[object ArrayBuffer]") return new Uint8Array(v);
  if (v && typeof v.byteLength === "number" && v.buffer && tag(v.buffer) === "[object ArrayBuffer]") {
    return new Uint8Array(v.buffer, v.byteOffset || 0, v.byteLength);
  }
  if (v && typeof v === "object" && typeof v.length === "number") return Uint8Array.from(v);
  throw hostError("read-failed", "the file could not be read");
}
// A file's bytes (FileSystem.readFile without an encoding).
async function hostReadBytes(path) {
  const v = await hostNeed("FileSystem", "readFile").readFile(path);
  if (typeof v === "string") throw hostError("read-failed", "the file came back as text");
  return hostBytes(v);
}
// A text file (some host builds return text directly, others bytes).
async function hostReadText(path) {
  const v = await hostNeed("FileSystem", "readFile").readFile(path);
  return typeof v === "string" ? v : new TextDecoder().decode(hostBytes(v));
}
// Removes a file with the first of the host's FileSystem removers that works (removeFile, remove, rm, unlink,
// unlinkSync: host builds differ); each is tried only when present, and a failure only leaves the file behind.
async function hostRemove(path) {
  let fs = null;
  try { fs = hostDI()?.FileSystem; } catch { fs = null; }
  if (!fs) return;
  const tries = [["removeFile", () => fs.removeFile({ filePath: path })], ["remove", () => fs.remove(path)], ["rm", () => fs.rm(path)],
    ["unlink", () => fs.unlink(path)], ["unlinkSync", () => fs.unlinkSync(path)]];
  for (const [name, call] of tries) {
    if (typeof fs[name] !== "function") continue;
    try { await call(); return; } catch { /* the next one */ }
  }
}
// The plugin's install folder and its data folder. The install folder is the host's skills folder (the home folder
// joined with .selects, skills and <id>, the same place SELECTS_USER_SKILLS_ROOT names on macOS and Windows) when it
// holds `marker` (a file every install has). `sdk` is unused (kept so callers do not change). The data folder (<home>/.selects/plugin-data/<id>) is created when missing;
// null when this host cannot make it (callers then avoid temporary files). Throws 'not-found' without an install folder.
async function hostRoots(sdk, id, marker) {
  const fs = hostApi("FileSystem", "join", "homedir", "existsSync");
  const holds = (dir) => { try { return !!dir && (!fs || !!fs.existsSync(fs.join(dir, marker))); } catch { return false; } };
  let plugin = null;
  try { if (fs) { const dir = String(fs.join(fs.homedir(), ".selects", "skills", id)); if (holds(dir)) plugin = dir; } } catch { plugin = null; }
  if (!plugin) throw hostError("not-found", "the plugin folder could not be found");
  let data = null;
  try {
    const dfs = hostApi("FileSystem", "join", "homedir", "mkdirSync");
    if (dfs) { data = String(dfs.join(dfs.homedir(), ".selects", "plugin-data", id)); dfs.mkdirSync(data, { recursive: true }); }
  } catch { data = null; }
  return { plugin, data };
}
// Mono 32-bit float samples of an audio file at `rate`, at most `maxSeconds`, decoded by the host's ffmpeg into a
// temporary file in `dataDir` and read back (the file is removed). null when this host has no ffmpeg or no data folder;
// throws when ffmpeg fails or `signal` (optional) aborts it.
async function hostDecodePcm(path, dataDir, rate, maxSeconds, signal, timeoutMs = 120000) {
  const rt = hostApi("Runtime", "runFFmpeg");
  if (!rt || !dataDir || !hostApi("FileSystem", "readFile")) return null;
  const tmp = hostJoin(dataDir, "pcm-" + Date.now() + "-" + Math.floor(Math.random() * 1e6) + ".f32");
  const controller = typeof AbortController === "undefined" ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  const relay = () => { if (controller) controller.abort(); };
  if (signal) { if (signal.aborted) relay(); else signal.addEventListener("abort", relay); }
  try {
    await rt.runFFmpeg(["-nostdin", "-v", "error", "-y", "-t", String(maxSeconds), "-i", path, "-ac", "1", "-ar", String(rate), "-f", "f32le", tmp], true, controller ? controller.signal : undefined);
    const bytes = await hostReadBytes(tmp);
    // A copy, so the samples sit on a 4-byte boundary.
    const samples = new Float32Array(bytes.slice(0, Math.floor(bytes.byteLength / 4) * 4).buffer);
    if (!samples.length) throw hostError("decode-failed", "ffmpeg returned no audio");
    return samples;
  } finally {
    if (timer) clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", relay);
    await hostRemove(tmp);
  }
}
// An audio or video file's length in seconds from the host's ffprobe, or null.
async function hostProbeSeconds(path) {
  try {
    const rt = hostApi("Runtime", "runFFprobe");
    if (!rt) return null;
    const r = await rt.runFFprobe(["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path], true);
    const v = parseFloat(String(r?.stdout || "").trim());
    return v > 0 ? v : null;
  } catch { return null; }
}
// av-host:end

// The pipeline (pipeline.py: numpy, Pillow, RVM on onnxruntime) runs on a private Python that rvm/setup.sh installs
// for macOS arm64 only, through POSIX shell. On Windows the panel opens, but every build entry stops here first,
// before any setup, background job, import or Draft. The shell below sits in mac-only regions reached only off Windows.
const MAC_ONLY_TEXT = { en: "Available on macOS for now.", de: "Vorerst nur auf macOS verfügbar.", es: "Disponible solo en macOS por ahora.", fr: "Disponible sur macOS pour le moment.", it: "Per ora disponibile solo su macOS.", ja: "現在はmacOSでのみ利用できます。", ko: "\uc9c0\uae08\uc740 macOS\uc5d0\uc11c\ub9cc \uc0ac\uc6a9\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.", pt: "Disponível no macOS por enquanto.", tr: "Şimdilik yalnızca macOS’ta kullanılabilir.", zh: "目前仅在 macOS 上可用。" };
const macOnlyText = (language) => MAC_ONLY_TEXT[String(language || "").slice(0, 2).toLowerCase()] || MAC_ONLY_TEXT.en;
const macOnlyError = (language) => Object.assign(new Error(macOnlyText(language)), { code: "mac-only" });

// @operation-start
// The first piece of the in-panel port of pipeline.py (Windows has no Python): its timeline and the ffmpeg argv it
// runs, as Runtime.runFFmpeg argv (no "ffmpeg" argv[0], no shell). Nothing calls these yet: the build still runs
// pipeline.py on macOS and refuses Windows. tests/portrait_beat_montage.test.mjs checks them against pipeline.py.
// Where pipeline.py reads ffmpeg's stdout or writes its stdin ("-"), these name a file in the run folder instead.
export const W = 540;
export const H = 720;
export const FPS = 60;
export const DRAFT_FPS = 30000 / 1001;
export const BLACK = 370;
export const PERIOD = .6445104895;
export const TAIL = 30;
export const RISER_START = 300;
export const SRC_FRAMES = 60;
export const MATTE_FRAMES = 30;
export const POST = 21;
// Python's round() (half to even), so a beat that lands on .5 rounds as pipeline.py does.
const pyRound = (x) => { const f = Math.floor(x), d = x - f; return d > .5 || (d === .5 && f % 2 !== 0) ? f + 1 : f; };
export const BEATS = Array.from({ length: 16 }, (_, i) => pyRound(i * PERIOD * FPS));
export const LENGTHS = BEATS.slice(1).map((b, i) => b - BEATS[i]);
export const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1, 2, 3, 4, 5];
export const REPEAT_FROM = 10;
export const TOTAL = BLACK + BEATS[BEATS.length - 1] + TAIL;
export const BOUNDARIES = BEATS.slice(0, -1).map((b) => BLACK + b);
export const STROBE = [139, 139, 224, 224, 224, 253, 253, 224, 224, 224, 0, 0, 139, 139, 139, 224, 224, 253, 253, 253, 224, 224, 0, 0, 0, 139, 139, 224, 224, 224, 253, 253, 139, 139, 139, 0, 0, 139, 139, 139, 224, 224, 224, 224, 224, 139, 139, 0, 0, 0, 139, 139, 253, 253, 253, 195, 195, 139, 139, 139, 167, 167, 0, 0, 0, 253, 253, 0, 0, 0, 253, 253, 0, 0, 0, 253, 253, 0, 0, 0, 253, 253, 83, 83, 83, 167, 167, 167, 167, 167, 0, 0, 167, 167, 167, 83, 83, 83, 83, 83, 167, 167, 167, 167, 167, 0, 0, 84, 84, 84, 253, 253, 167, 167, 167, 0, 0, 167, 167, 167];
export const STROBE_START = BLACK - STROBE.length;
export const GLOW = [240, 233, 226, 219, 210, 210, 186, 186, 186, 162, 162, 139, 139, 139, 116, 116, 91, 91, 91, 68, 68, 45, 45, 45, 22, 22];
// A number as Python's str() writes it (3.0, not 3), so argv text matches pipeline.py.
export const pyStr = (x) => Number.isInteger(x) ? x.toFixed(1) : String(x);
export const draftFrame = (masterFrame) => Math.floor(masterFrame / FPS * DRAFT_FPS + .5);
// Draft-rate pieces: strobe, 15 shots, glow. Black before the strobe is a Draft gap.
export function segments() {
  const marks = [STROBE_START, ...BOUNDARIES, BLACK + BEATS[BEATS.length - 1], TOTAL];
  const names = ["strobe", ...Array.from({ length: 15 }, (_, n) => "shot" + String(n + 1).padStart(2, "0")), "glow"];
  return names.map((name, i) => ({ name, start: draftFrame(marks[i]), end: draftFrame(marks[i + 1]) }));
}
// 3:4 crop. Tall footage keeps the top of the frame (headroom), wide footage is centred.
export function cropFilter(w, h) {
  const even = (x) => Math.floor(Math.trunc(x) / 2) * 2;
  if (h * 3 >= w * 4) { const ch = even(w * 4 / 3); return `crop=${w}:${ch}:0:${even((h - ch) * .125)}`; }
  const cw = even(h * 3 / 4);
  return `crop=${cw}:${h}:${Math.floor(Math.floor((w - cw) / 2) / 2) * 2}:0`;
}
export const probeArgs = (path) => ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate:stream_side_data=rotation:format=duration", "-of", "json", path];
// Grey 135x180 frames at 24 fps of the first 30 s, for the motion score of each window start.
export const motionArgs = (path, info, out) => ["-v", "error", "-t", "30", "-i", path, "-vf", cropFilter(info.width, info.height) + ",fps=24,scale=135:180,format=gray", "-f", "rawvideo", out];
// One shot window: 1 s of source cropped to 3:4, motion-interpolated to 60 fps.
export const unitSourceArgs = (unit, out) => ["-y", "-v", "error", "-ss", pyStr(unit.start), "-i", unit.path, "-vf", cropFilter(unit.width, unit.height) + `,scale=${W}:${H},minterpolate=fps=${FPS}:mi_mode=mci`, "-frames:v", String(SRC_FRAMES), "-an", "-c:v", "libx264", "-crf", "15", "-pix_fmt", "yuv420p", out];
export const decodeArgs = (path, count, out, vf = "format=rgb24") => ["-v", "error", "-i", path, "-vf", vf, "-frames:v", String(count), "-f", "rawvideo", "-pix_fmt", "rgb24", out];
// RVM's VP9-with-alpha cutout to one grey PNG per frame (001.png...); `pattern` is hostJoin(masks, "%03d.png").
export const matteArgs = (webm, pattern) => ["-y", "-v", "error", "-c:v", "libvpx-vp9", "-i", webm, "-vf", "alphaextract", "-frames:v", String(MATTE_FRAMES), pattern];
// One Draft piece from raw rgb24 frames (pipeline.py's Encoder, fed from a file instead of stdin).
export const encodeArgs = (raw, fps, out) => ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${W}x${H}`, "-r", String(fps), "-i", raw, "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out];
// @operation-end

// mac-only:start
const quote = (value) => "'" + String(value).replace(/'/g, "'\\''") + "'";
// The pipeline runs on the RVM runtime's Python (it already has numpy and Pillow). Before setup there is no usable
// Python on a stock Mac (/usr/bin/python3 only offers to install the Xcode tools), so a step reports setup instead.
const PYTHON = `S="$SELECTS_USER_SKILLS_ROOT/portrait-beat-montage"; P="$S/rvm/.local/venv/bin/python"; [ -x "$P" ] || { echo '{"error":"RVM runtime is not set up"}'; exit 2; };`;
// The running Selects app's own ffmpeg/ffprobe (app.asar.unpacked/dist/bin), so no PATH or Homebrew ffmpeg is needed:
// the app whose Info.plist version is Runtime.getHostingVersion(), else the one Runtime.getAppName() names, else the
// first installed. Exported to pipeline.py, which hands them to rvm/runtime.py and its detached workers; with none
// found pipeline.py looks in /Applications and then on PATH itself. Found once per panel session, by FileSystem.
const MAC_APPS = ["Selects", "Selects Staging", "Selects Alpha"];
let macToolsFound = null;
function macTools() {
  if (macToolsFound) return macToolsFound;
  const fs = hostApi("FileSystem", "join", "existsSync");
  if (!fs) return "";
  const app = (name, ...rest) => fs.join("/Applications", name + ".app", "Contents", ...rest);
  const bin = (name, tool) => app(name, "Resources", "app.asar.unpacked", "dist", "bin", tool);
  const has = (name) => { try { return !!fs.existsSync(bin(name, "ffmpeg")) && !!fs.existsSync(bin(name, "ffprobe")); } catch { return false; } };
  const said = (service, method) => { try { return String(hostApi(service, method)?.[method]() || ""); } catch { return ""; } };
  const plistVersion = (name) => {
    try {
      const v = hostApi("FileSystem", "readFileSync").readFileSync(app(name, "Info.plist"), "utf8");
      const text = typeof v === "string" ? v : new TextDecoder().decode(hostBytes(v));
      return (text.match(/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]*)<\/string>/) || [])[1] || "";
    } catch { return ""; }
  };
  const installed = MAC_APPS.filter(has), version = said("Runtime", "getHostingVersion"), appName = said("Runtime", "getAppName");
  const pick = installed.find((name) => version && plistVersion(name) === version) || installed.find((name) => name === appName) || installed[0];
  if (!pick) return "";
  macToolsFound = `export POSTCARD_CUTOUT_RVM_FFMPEG=${quote(bin(pick, "ffmpeg"))} POSTCARD_CUTOUT_RVM_FFPROBE=${quote(bin(pick, "ffprobe"))}; `;
  return macToolsFound;
}
// mac-only:end

const T = {
  title: "Portrait Beat Montage",
  intro: "3:4 portrait · about 16.3 seconds · 10 clips, the first 5 return after the 10th",
  folder: "Footage folder",
  currentProject: "Current project",
  noProject: "Open a project first.",
  loading: "Checking project media…",
  pickFolder: "Choose a footage folder first.",
  needMore: "This folder has {have} usable clips; {need} are needed. (Videos under 1.1 s do not count.)",
  clips: "Clips, in filename order",
  build: "Create new draft",
  working: "Rendering…",
  setupTitle: "One-time setup",
  setupHelp: "Person mattes use RVM on this Mac's CPU. Setup downloads a private Python runtime and the RVM model into the plugin folder (a few hundred MB).",
  setupButton: "Set up RVM",
  settingUp: "Setting up…",
  rights: "Use footage of people who agreed to be filmed. The plugin includes its soundtrack (Pixabay Content License).",
  time: "Rendering takes about 3 minutes on Apple silicon (seconds when the same clips are used again).",
  done: "New draft created. It is open in the editor.",
  steps: ["Choose shot windows", "Mattes and transitions", "Render shots", "Build draft"],
};

function mediaScript(projectId) {
  return `const p=selects.project(${json(projectId)}); const [meta,overview]=await Promise.all([p.meta(),p.sourceFiles()]); const items=[]; function walk(nodes,parts){ for(const node of nodes){ if(node.type==="dir") walk(node.children,parts.concat(node.name)); else items.push({name:node.name,type:node.type,resourceId:node.resourceId,path:node.path,durationSeconds:node.durationSeconds,folder:parts.join("/")||"(root)"}); }} if("fileTree" in overview) walk(overview.fileTree,[]); else { for(const folder of overview.folders){ const page=await p.sourceFiles({folder:folder.name}); if("fileTree" in page) walk(page.fileTree,folder.name==="(root)"?[]:[folder.name]); }} return {projectTitle:meta.title,videos:items.filter(x=>x.type==="video"),audios:items.filter(x=>x.type==="audio")};`;
}

// mac-only:start
async function pipeline(sdk, op, args, timeoutMs = 300000) {
  if (hostIsWindows()) throw macOnlyError();
  const reply = await sdk.runShell({
    summary: "Portrait montage: " + op,
    command: `${macTools()}${PYTHON} "$P" "$S/pipeline.py" ${op} ${quote(json(args))}`,
    timeoutMs,
    maxOutputBytes: 49152,
  });
  const last = (reply.stdout || "").trim().split("\n").pop() || "{}";
  let parsed = null;
  try { parsed = JSON.parse(last); } catch {}
  if (reply.isError || reply.exitCode !== 0 || !parsed || parsed.error) {
    throw new Error(parsed?.error || reply.stderr || reply.output || `${op} failed`);
  }
  return parsed;
}

// One-time setup (rvm/setup.sh) downloads a few hundred MB, which can outlast one shell call: Selects ends each call
// after five minutes and stops the processes it started. So setup runs in a session of its own (perl's setsid, part
// of stock macOS), records its pid and exit status under plugin-data, and the panel polls. A setup that is already
// running (its lock is held and it has not exited) is joined instead of started twice.
const SETUP_DIR = `"$HOME/.selects/plugin-data/${PLUGIN}/setup"`;
const SETUP_WAIT_MS = 30 * 60 * 1000;
async function runSetup(sdk) {
  if (hostIsWindows()) throw macOnlyError();
  const start = await sdk.runShell({
    summary: "Portrait montage: start one-time setup",
    command: `${macTools()}S="$SELECTS_USER_SKILLS_ROOT/portrait-beat-montage"; D=${SETUP_DIR}; mkdir -p "$D" || exit 1; `
      + `if [ -d "$S/rvm/.local/setup.lock" ] && [ ! -f "$D/exit" ] && kill -0 "$(cat "$D/pid" 2>/dev/null)" 2>/dev/null; then echo joined; exit 0; fi; `
      + `rm -f "$D/exit" "$D/pid" "$D/stderr.log"; `
      + `/usr/bin/perl -MPOSIX -e 'POSIX::setsid() or die "setsid: $!"; exec @ARGV or die "exec: $!"' /bin/sh -c 'echo $$ > "$2/pid"; sh "$1/rvm/setup.sh" 2>"$2/stderr.log"; echo $? > "$2/exit"' setup "$S" "$D" </dev/null >/dev/null 2>&1 & `
      // Return only once setup has its own session (its pid is written after setsid), or this call's end would stop it.
      + `i=0; while [ ! -s "$D/pid" ] && [ $i -lt 100 ]; do sleep 0.1; i=$((i+1)); done; [ -s "$D/pid" ] && echo started`,
    timeoutMs: 30000,
    maxOutputBytes: 4096,
  });
  if (start.isError || start.exitCode !== 0) throw new Error(start.stderr || "Could not start the setup.");
  const until = Date.now() + SETUP_WAIT_MS;
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const reply = await sdk.runShell({
      summary: "Portrait montage: check setup",
      command: `D=${SETUP_DIR}; if [ -f "$D/exit" ]; then cat "$D/exit"; elif kill -0 "$(cat "$D/pid" 2>/dev/null)" 2>/dev/null; then echo running; else echo stopped; fi`,
      timeoutMs: 15000,
      maxOutputBytes: 4096,
    });
    const state = (reply.stdout || "").trim().split("\n").pop() || "";
    if (state === "0") return;
    if (state === "running" && Date.now() < until) continue;
    if (state === "running") throw new Error("Setup is still running after 30 minutes. Check the connection, then try again.");
    // The last line setup wrote (its own log, else its stderr) says why it stopped.
    const log = await sdk.runShell({
      summary: "Portrait montage: read setup errors",
      command: `S="$SELECTS_USER_SKILLS_ROOT/portrait-beat-montage"; D=${SETUP_DIR}; { cat "$D/stderr.log"; tail -n 5 "$S/rvm/.local/setup.log"; } 2>/dev/null | grep -v '^SETUP ' | grep . | tail -n 1`,
      timeoutMs: 15000,
      maxOutputBytes: 4096,
    });
    const said = (log.stdout || "").trim();
    throw new Error(said || (state === "stopped" ? "Setup stopped before it finished. Try again." : `Setup failed (exit ${state}). See rvm/.local/setup.log in the plugin folder.`));
  }
}

// Mattes and transitions run detached, three shot windows at a time, so they keep
// going if the panel closes or the project changes. The panel polls for finished
// units; reopening it resumes the same run (pipeline.py plan reuses it).
async function renderUnits(sdk, runId, keys, onProgress) {
  if (hostIsWindows()) throw macOnlyError();
  const dir = `"$HOME/.selects/plugin-data/${PLUGIN}/runs/${runId}"`;
  const started = await sdk.runShell({
    summary: "Portrait montage: start mattes and transitions",
    command: `${macTools()}${PYTHON} "$P" "$S/pipeline.py" spawn ${quote(json({ runId }))}`,
    timeoutMs: 30000,
    maxOutputBytes: 4096,
  });
  if (started.isError || started.exitCode !== 0) throw new Error(started.stderr || "Could not start the render");
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const reply = await sdk.runShell({
      summary: "Portrait montage: check progress",
      command: `cd ${dir} && n=0; for k in ${keys.join(" ")}; do test -f "$k/post-held.npy" && n=$((n+1)); done; f=false; test -f units.exit && f=true; a=false; kill -0 "$(cat units.pid 2>/dev/null)" 2>/dev/null && a=true; printf '{"done":%s,"finished":%s,"alive":%s}\\n' "$n" "$f" "$a"`,
      timeoutMs: 15000,
      maxOutputBytes: 4096,
    });
    const state = JSON.parse((reply.stdout || "{}").trim().split("\n").pop() || "{}");
    onProgress((state.done || 0) / keys.length);
    if (state.done === keys.length) return;
    if (!state.finished && state.alive === false) throw new Error("The render stopped. Press Create new draft again to continue where it left off.");
    if (state.finished) {
      const log = await sdk.runShell({ summary: "Portrait montage: read errors", command: `grep -h '"error"' ${dir}/units.log | tail -1`, timeoutMs: 15000, maxOutputBytes: 4096 });
      let said = null;
      try { said = JSON.parse((log.stdout || "").trim()).error; } catch {}
      throw new Error(said || "Some shots could not be prepared. Is there a person in every clip?");
    }
  }
}
// mac-only:end

async function buildMontage(sdk, { projectId, language, files, audios, setStep, setProgress }) {
  // Before the first step: the plan, the render jobs and the Draft all need the macOS pipeline.
  if (hostIsWindows()) throw macOnlyError(language);
  setStep(0);
  const plan = await pipeline(sdk, "plan", { clips: files.map((file) => file.path) });
  setStep(1);
  await renderUnits(sdk, plan.runId, plan.units, setProgress);
  setStep(2);
  const manifest = await pipeline(sdk, "assemble", { runId: plan.runId, master: false }, 600000);
  setStep(3);

  // Reuse the bundled sounds when this project already has them.
  const byName = new Map();
  for (const audio of manifest.audio) {
    const found = (audios || []).find((item) => item.path && item.path.replace(/\\/g, "/").endsWith(`/${PLUGIN}/assets/${audio.name}`));
    if (found) byName.set(audio.name, found.resourceId);
  }
  const toImport = [...manifest.clips.map((clip) => clip.path), ...manifest.audio.filter((a) => !byName.has(a.name)).map((a) => a.path)];
  const imported = await sdk.runScript({
    summary: "Import montage shots",
    script: `return await selects.project(${json(projectId)}).importFiles({paths:${json(toImport)}});`,
    allowCommit: true,
  });
  const ids = imported.result?.addedResourceIds;
  if (imported.isError || !Array.isArray(ids) || ids.length !== toImport.length) throw new Error(imported.output || "Could not import the rendered shots");
  const clipIds = ids.slice(0, manifest.clips.length);
  let next = manifest.clips.length;
  for (const audio of manifest.audio) if (!byName.has(audio.name)) byName.set(audio.name, ids[next++]);

  const draftName = `${T.title} — ${new Date().toLocaleString(language || undefined)}`;
  const cfg = {
    projectId, name: draftName, gap: manifest.gapFrames, end: manifest.durationFrames,
    clips: manifest.clips.map((clip, i) => ({ id: clipIds[i], frames: clip.frames, start: clip.start, name: clip.name })),
    audio: manifest.audio.map((a) => ({ id: byName.get(a.name), start: a.start, end: a.end, name: a.name })),
  };
  const script = `const cfg=${json(cfg)}; const p=selects.project(cfg.projectId); const d=await p.createDraft({name:cfg.name}); await d.setFrameSize({width:1080,height:1440}); const fps=(await d.meta()).fps; if(Math.abs(fps-30000/1001)>0.05) throw new Error("Unsupported draft frame rate: "+fps);
await d.insertGap({seconds:cfg.gap/fps});
for(const c of cfg.clips) await d.insertResource({resourceId:c.id,sourceRange:{startSeconds:0,endSeconds:c.frames/fps}});
const main=(await d.clips({trackScope:"main"})).filter(c=>c.resourceId).sort((a,b)=>a.startFrame-b.startFrame);
if(main.length!==cfg.clips.length) throw new Error("Expected "+cfg.clips.length+" shots, found "+main.length);
main.forEach((c,i)=>{ if(c.startFrame!==cfg.clips[i].start) throw new Error(cfg.clips[i].name+" starts at "+c.startFrame+", expected "+cfg.clips[i].start); });
const end=Math.max(...main.map(c=>c.endFrame)); if(end!==cfg.end) throw new Error("Montage ends at "+end+", expected "+cfg.end);
for(const a of cfg.audio) await d.overlayResource({resource:p.resource(a.id),over:await d.rangeAtFrames(a.start,Math.min(end,a.end))});
const saved=await d.commitAll("Create portrait beat montage"); return {draftId:saved.createdDraftId,end,shots:main.length};`;
  const built = await sdk.runScript({ summary: "Build portrait montage draft", script, allowCommit: true });
  if (built.isError || !built.result?.draftId) throw new Error(built.output || "Draft creation failed");
  try { await sdk.runScript({ summary: "Open montage draft", script: `await selects.editor.openDraft(${json(built.result.draftId)}); return true;` }); } catch {}
  return built.result.draftId;
}

function eligible(videos, folder) {
  return videos.filter((item) => item.folder === folder && item.path && item.durationSeconds >= MIN_SECONDS)
    .sort((a, b) => a.name.localeCompare(b.name));
}

const FAILED = "Portrait Beat Montage couldn't make the timeline. Try again.";

// The app hands a template its own Resource ids, but every run_script read
// (resources(), clips()) speaks the short ids the script SDK gives out (r0, r1…).
// The app's list (sdk.call) and the script's list are the Project's Resources in
// the same order, so they pair up row by row; names and types are compared so a
// list that changed in between is refused rather than mismatched.
async function scriptResourceIds(sdk, projectId) {
  const [app, run] = await Promise.all([
    sdk.call("listProjectResources", projectId),
    sdk.runScript({ summary: "Match picked videos", allowCommit: false, script: `return (await selects.project(${JSON.stringify(projectId)}).resources()).map(r=>({id:r.resourceId,name:r.name,type:r.type}));` }),
  ]);
  const rows = run?.result;
  if (!Array.isArray(app) || run.isError || !Array.isArray(rows) || app.length !== rows.length || app.some((a, i) => a.name !== rows[i].name || a.type !== rows[i].type)) throw new Error(run?.output || "Could not match the picked videos to this project.");
  return new Map(app.map((a, i) => [a.resourceId, rows[i].id]));
}

// A Clip highlights run (`context.template`): the 10 clips picked in the app.
function TemplateRun({ sdk, context }) {
  const runId = context.template?.runId;
  const [status, setStatus] = React.useState("Making your montage…");
  const started = React.useRef(null);
  React.useEffect(() => {
    if (!runId || started.current === runId) return;
    started.current = runId;
    let ended = false;
    const finish = (result) => { if (ended) return; ended = true; try { sdk.finishTemplate(result); } catch {} };
    (async () => {
      // Windows: refuse before setup, any background job or a Draft.
      if (hostIsWindows()) throw macOnlyError(context.language);
      const projectId = context.projectId;
      if (!projectId) throw new Error("Open a project, then try again.");
      const picks = (context.template.inputs?.clips || []).filter((pick) => pick?.resourceId);
      if (picks.length !== SHOTS) throw new Error(`Pick ${SHOTS} videos, then try again.`);
      // The first run on a Mac sets up RVM itself (a few minutes, once); later runs find it ready.
      let doctor = await pipeline(sdk, "doctor", {}).catch(() => null);
      if (!doctor?.ready) {
        setStatus("Setting up person mattes (first run only, a few minutes)…");
        await runSetup(sdk);
        doctor = await pipeline(sdk, "doctor", {});
        if (!doctor.ready) throw new Error(doctor.problems?.[0] || "Setup finished, but the montage tools are not ready.");
        setStatus("Making your montage…");
      }
      const ids = await scriptResourceIds(sdk, projectId);
      const reply = await sdk.runScript({ summary: "Find montage media", script: mediaScript(projectId) });
      if (reply.isError || !reply.result) throw new Error("Couldn't read this project's files. Try again.");
      const byId = new Map((reply.result.videos || []).map((item) => [item.resourceId, item]));
      const files = picks.map((pick) => byId.get(ids.get(pick.resourceId) ?? pick.resourceId));
      const missing = picks.find((pick, i) => !files[i]?.path);
      if (missing) throw new Error(`Couldn't find ${missing.name || "a picked video"} in this project.`);
      const draftId = await buildMontage(sdk, {
        projectId, language: context.language, files, audios: reply.result.audios || [],
        setStep: (n) => setStatus(T.steps[n] + "…"), setProgress: () => {},
      });
      finish({ sequenceId: draftId });
    })().catch((error) => {
      const said = String(error?.message || "");
      finish({ error: said && said.length <= 160 && !/[\n{]/.test(said) ? said : FAILED });
    });
  }, [runId]);
  return <small>{status}</small>;
}

export default function Panel(props) {
  return props.context?.template ? <TemplateRun {...props} /> : <MontagePanel {...props} />;
}

function MontagePanel({ sdk, context, ui }) {
  const [videos, setVideos] = React.useState([]);
  const [audios, setAudios] = React.useState([]);
  const [projectTitle, setProjectTitle] = React.useState("");
  const [folder, setFolder] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [doctor, setDoctor] = React.useState(null);
  const [settingUp, setSettingUp] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [step, setStep] = React.useState(-1);
  const [progress, setProgress] = React.useState(0);
  const [status, setStatus] = React.useState(null);
  const macOnly = hostIsWindows();

  // Windows: no setup check (it is shell and Python); the build stays disabled with the mac-only line.
  const checkSetup = React.useCallback(() => macOnly ? Promise.resolve() : pipeline(sdk, "doctor", {}, 60000)
    .then(setDoctor)
    .catch((error) => setDoctor({ ready: false, problems: [String(error.message || error)] })), [sdk, macOnly]);
  React.useEffect(() => { if (!macOnly) checkSetup(); }, []);

  // Re-read the media list whenever files join or leave the project.
  const [mediaVersion, setMediaVersion] = React.useState(0);
  React.useEffect(() => sdk.on("resourcesChanged", (event) => {
    if (event.projectId === context.projectId) setMediaVersion((n) => n + 1);
  }), [context.projectId]);

  React.useEffect(() => {
    if (!context.projectId) return;
    let cancelled = false;
    setLoading(true);
    sdk.runScript({ summary: "Find montage media", script: mediaScript(context.projectId) }).then((reply) => {
      if (cancelled) return;
      if (reply.isError || !reply.result) throw new Error(reply.output || "Could not read project files");
      const found = reply.result;
      setVideos(found.videos || []);
      setAudios(found.audios || []);
      setProjectTitle(found.projectTitle || "");
      const names = [...new Set((found.videos || []).map((item) => item.folder))];
      setFolder((current) => names.includes(current) ? current : names.find((name) => eligible(found.videos, name).length >= SHOTS) || null);
      setLoading(false);
    }).catch((error) => {
      if (cancelled) return;
      setLoading(false);
      setStatus({ type: "error", message: String(error.message || error) });
    });
    return () => { cancelled = true; };
  }, [context.projectId, mediaVersion]);

  async function setup() {
    if (macOnly) return;
    setSettingUp(true);
    setStatus(null);
    try {
      await runSetup(sdk);
      await checkSetup();
    } catch (error) {
      setStatus({ type: "error", message: String(error.message || error) });
    } finally {
      setSettingUp(false);
    }
  }

  const folderNames = [...new Set(videos.map((item) => item.folder))];
  const folderOptions = folderNames
    .map((name) => ({ name, usable: eligible(videos, name).length }))
    .sort((a, b) => b.usable - a.usable)
    .map(({ name, usable }) => ({ value: name, label: name.normalize("NFC") + "  ·  " + usable + (usable >= SHOTS ? "" : " ✕") }));
  const chosen = folder ? eligible(videos, folder).slice(0, SHOTS) : [];

  async function build() {
    if (macOnly || busy || chosen.length < SHOTS) return;
    setBusy(true);
    setStatus(null);
    setProgress(0);
    try {
      await buildMontage(sdk, { projectId: context.projectId, language: context.language, files: chosen, audios, setStep, setProgress });
      setStatus({ type: "success", message: T.done });
    } catch (error) {
      setStatus({ type: "error", message: String(error.message || error) });
    } finally {
      setBusy(false);
      setStep(-1);
    }
  }

  if (!context.projectId) return <ui.Message tone="muted">{T.noProject}</ui.Message>;
  return <ui.Section title={T.title}>
    <ui.Stack>
      <p>{T.intro}</p>
      {doctor && !doctor.ready ? <ui.Stack>
        <strong>{T.setupTitle}</strong>
        <small>{T.setupHelp}</small>
        {(doctor.problems || []).map((problem) => <ui.Message key={problem} tone="error">{problem}</ui.Message>)}
        <ui.Actions><ui.Button variant="secondary" busy={settingUp} busyLabel={T.settingUp} onClick={setup}>{T.setupButton}</ui.Button></ui.Actions>
      </ui.Stack> : null}
      <p>{T.currentProject}: <strong>{projectTitle || "…"}</strong></p>
      {loading ? <ui.Message>{T.loading}</ui.Message> : null}
      <ui.Select label={T.folder} value={folder} onChange={setFolder} options={folderOptions} disabled={busy || loading} />
      {folder && chosen.length < SHOTS
        ? <ui.Message tone="error">{T.needMore.replace("{have}", String(eligible(videos, folder).length)).replace("{need}", String(SHOTS))}</ui.Message>
        : null}
      {chosen.length === SHOTS ? <small>{T.clips}: {chosen.map((file) => file.name).join(", ")}</small> : null}
      {!loading && !folder ? <ui.Message tone="error">{T.pickFolder}</ui.Message> : null}
      <small>{T.time}</small>
      <small>{T.rights}</small>
      {busy ? <ui.Progress steps={T.steps} current={step} value={step === 1 ? progress : undefined} label={T.steps[step] || ""} /> : null}
      <ui.Actions><ui.Button variant="primary" busy={busy} busyLabel={T.working} disabled={macOnly || loading || !doctor?.ready || chosen.length < SHOTS} onClick={build}>{T.build}</ui.Button></ui.Actions>
      {macOnly ? <ui.Message tone="muted">{macOnlyText(context.language)}</ui.Message> : null}
      {status ? <ui.Message tone={status.type}>{status.message}</ui.Message> : null}
    </ui.Stack>
  </ui.Section>;
}
