// @name pov: you open my gallery
// @name:de pov: you open my gallery
// @name:en pov: you open my gallery
// @name:es pov: you open my gallery
// @name:fr pov: you open my gallery
// @name:it pov: you open my gallery
// @name:ja pov: you open my gallery
// @name:ko pov: you open my gallery
// @name:pt pov: you open my gallery
// @name:tr pov: you open my gallery
// @name:zh pov: you open my gallery
// @collection visual-highlights
// @icon video
// Creates an editable portrait gallery montage from a project folder and a fixed soundtrack.
import React from "react";

const T = {
  title: "pov: you open my gallery",
  folder: "Footage folder",
  currentProject: "Current project",
  folderScope: "Only footage in the current project appears here. Open the other project to use its footage.",
  fixedMusic: "Fixed soundtrack",
  selectionMode: "Footage selection",
  ordered: "Filename order",
  random: "Random",
  opening: "Fixed opening text",
  build: "Create new draft",
  working: "Creating draft\u2026",
  loading: "Checking project media\u2026",
  noProject: "Open a project first.",
  noMedia: "The current project needs a folder with at least 15 videos over 1.3 seconds.",
  ready: "15 shots \u00b7 about 11.4 seconds \u00b7 3:4 portrait",
  orderedHelp: "Plays the first 15 eligible videos in filename order.",
  randomHelp: "Picks 15 different clips at random and plays them in shuffled order.",
  middle: "Each shot uses the middle of its source.",
  rights: "Choose footage you have permission to use. This plugin includes its fixed soundtrack.",
  done: "New draft created. Open it from the project's draft list to adjust shots and title.",
};

// The 15 shots follow the quarter-note cut pattern and end on one last 15-frame shot.
// No additional visual switches occur during the soundtrack's closing tail.
const CUTS = [109, 124, 140, 155, 171, 186, 202, 217, 233, 248, 264, 279, 295, 310, 326, 341];
const AUDIO_END_FRAME = 341;
const SHOT_COUNT = CUTS.length - 1;
const OPENING_TEXT = "pov: you open my gallery";
const MUSIC_NAME = "gallery-bgm-gallery-montage-12s-v2.wav";
const TITLE_GRAPHIC = 'import {AbsoluteFill} from "remotion"; export default function Title({data}) { return <AbsoluteFill style={{backgroundColor:"#000",alignItems:"center",justifyContent:"center"}}><div style={{color:"#fff",fontFamily:"Futura, Avenir Next, Century Gothic, sans-serif",fontSize:"2.9vh",fontWeight:700,textAlign:"center",whiteSpace:"nowrap",transform:"translateY(-0.35vh)"}}>{data.text}</div></AbsoluteFill>; }';

function chooseShots(files, mode) {
  const sorted = [...files].filter((file) => file.path && file.durationSeconds >= 1.3)
    .sort((a, b) => a.name.localeCompare(b.name));
  const preferred = sorted.filter((file) => {
    const size = file.frameSize;
    return size && size.width / size.height <= 1.5;
  });
  const pool = preferred.length >= SHOT_COUNT ? preferred : sorted;
  if (pool.length < SHOT_COUNT) throw new Error(`At least ${SHOT_COUNT} video clips are required.`);
  if (mode === "random") {
    const shuffled = [...pool];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    return shuffled.slice(0, SHOT_COUNT);
  }
  return pool.slice(0, SHOT_COUNT);
}

// Every video and audio file in the project, with its folder, path, length and size.
function mediaScript(projectId) {
  return `const p=selects.project(${JSON.stringify(projectId)}); const [meta,overview]=await Promise.all([p.meta(),p.sourceFiles()]); const items=[]; function walk(nodes,parts){ for(const node of nodes){ if(node.type==="dir") walk(node.children,parts.concat(node.name)); else items.push({name:node.name,type:node.type,resourceId:node.resourceId,path:node.path,durationSeconds:node.durationSeconds,frameSize:node.frameSize,folder:parts.join("/")||"(root)"}); }} if("fileTree" in overview) walk(overview.fileTree,[]); else { for(const folder of overview.folders){ const page=await p.sourceFiles({folder:folder.name}); if("fileTree" in page) walk(page.fileTree,folder.name==="(root)"?[]:[folder.name]); }} return {projectTitle:meta.title,videos:items.filter(x=>x.type==="video"),audios:items.filter(x=>x.type==="audio")};`;
}

// Host paths compared the Windows way too: NFC, "/" separators, and case-folded on win32.
const normPath = (path) => { const p = String(path || "").normalize("NFC").replace(/\\/g, "/"); return hostIsWindows() ? p.toLowerCase() : p; };
function fixedAudioOf(audios) {
  return (audios || []).find((item) => item.path && normPath(item.path).endsWith(normPath(`/gongju-gallery/assets/${MUSIC_NAME}`)))?.resourceId || null;
}

// The host's ffmpeg and FileSystem (av-host block below) replace the old Python helper: no shell, no Python, the same
// steps on macOS and Windows. Errors with a `code` from the host block are reported as one plain sentence.
const HOST_TOO_OLD = "This Selects build can't make portrait clips. Update Selects, then try again.";
// A copy, so digest() gets a buffer from this realm.
const sha256 = async (bytes) => new Uint8Array(await crypto.subtle.digest("SHA-256", bytes.slice())).join(",");
// Cuts the 15 portrait intermediates into a fresh ASCII-named folder under the plugin's data folder and finds an
// existing project copy of the soundtrack by SHA-256. Resolves {paths, audioPath, existingAudioId}. Touches nothing
// in the project, so a failure here leaves no Draft and no import behind.
async function cropShots(sdk, manifest) {
  let rt, fs, roots;
  try {
    rt = hostNeed("Runtime", "runFFmpeg"); hostNeed("FileSystem", "readFile");
    fs = hostApi("FileSystem", "join", "homedir", "existsSync", "mkdirSync");
    if (!fs) throw hostError("host-missing", "no FileSystem");
    roots = await hostRoots(sdk, "gongju-gallery", "SKILL.md");
  } catch (error) { throw new Error(error?.code === "not-found" ? "The plugin folder could not be found. Reinstall the plugin." : HOST_TOO_OLD); }
  if (!roots.data) throw new Error(HOST_TOO_OLD);
  const audioPath = hostJoin(roots.plugin, "assets", MUSIC_NAME);
  if (!fs.existsSync(audioPath)) throw new Error("The fixed gallery soundtrack is missing from the plugin");
  let existingAudioId = null;
  const candidates = manifest.audioCandidates || [];
  // Without a match (or without crypto.subtle) the soundtrack is imported, as on a first run.
  if (candidates.length) { try {
    const music = await sha256(await hostReadBytes(audioPath));
    for (const candidate of candidates) {
      try { if (fs.existsSync(candidate.path) && await sha256(await hostReadBytes(candidate.path)) === music) { existingAudioId = candidate.resourceId; break; } } catch { /* not a match */ }
    }
  } catch { existingAudioId = null; } }
  const dir = hostJoin(roots.data, (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random()).replace(/[^0-9a-z]/gi, ""));
  fs.mkdirSync(dir, { recursive: true });
  const paths = [];
  for (const [index, clip] of manifest.clips.entries()) {
    if (!clip.path || !fs.existsSync(clip.path) || !(clip.frames >= 1) || !(clip.startSeconds >= 0)) throw new Error(`Invalid input clip ${index + 1}`);
    const output = hostJoin(dir, `gallery-${String(index + 1).padStart(2, "0")}.mp4`);
    await rt.runFFmpeg(galleryCropArgs(clip, output), true);
    if (!fs.existsSync(output)) throw new Error(`Portrait clip ${index + 1} failed`);
    paths.push(output);
  }
  return { paths, audioPath, existingAudioId };
}
// The ffmpeg argv for one portrait shot (the same filter, codec and frame count the old crop.py used).
function galleryCropArgs(clip, output) {
  return ["-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-ss", clip.startSeconds.toFixed(6), "-i", clip.path,
    "-vf", "scale=1080:1440:force_original_aspect_ratio=increase,crop=1080:1440,setsar=1,fps=30000/1001",
    "-frames:v", String(clip.frames), "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", output];
}

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

// Crops the chosen clips to 3:4, imports them (and the soundtrack, once) and
// builds the new draft. Resolves the new draft's id and the soundtrack's id.
async function buildGallery(sdk, { projectId, language, chosen, audios, fixedAudioId, say }) {
  const fps = 30000 / 1001;
  const manifest = { audioCandidates: audios.filter((item) => item.name === MUSIC_NAME && item.path).map((item) => ({resourceId:item.resourceId,path:item.path})), clips: chosen.map((item, index) => {
    const frames = CUTS[index + 1] - CUTS[index];
    const seconds = frames / fps;
    const middle = (item.durationSeconds - seconds) / 2;
    return { path: item.path, startSeconds: Math.max(0, Math.min(item.durationSeconds - seconds - 0.1, middle)), frames };
  }) };

  say?.("Cropping and placing your clips\u2026");
  const created = await cropShots(sdk, manifest);
  if (!Array.isArray(created.paths) || created.paths.length !== SHOT_COUNT) throw new Error("Portrait clip output is incomplete");
  if (!created.audioPath) throw new Error("The fixed soundtrack is missing from the plugin");
  const existingAudioId = fixedAudioId || created.existingAudioId;

  const importReply = await sdk.runScript({
    summary: "Import portrait shots",
    script: `const p=selects.project(${JSON.stringify(projectId)}); return await p.importFiles({paths:${JSON.stringify(existingAudioId ? created.paths : [...created.paths, created.audioPath])}});`,
    allowCommit: true,
  });
  if (importReply.isError || !importReply.result) throw new Error(importReply.output || "Could not import portrait clips");
  const ids = importReply.result.addedResourceIds;
  if (!Array.isArray(ids) || ids.length !== SHOT_COUNT + (existingAudioId ? 0 : 1)) throw new Error("Portrait clips or fixed music were not imported");
  const audioId = existingAudioId || ids[SHOT_COUNT];
  const shotIds = ids.slice(0, SHOT_COUNT);

  const draftName = `${T.title} — ${new Date().toLocaleString(language || undefined)}`;
  const title = OPENING_TEXT;
  const script = `const p=selects.project(${JSON.stringify(projectId)}); const d=await p.createDraft({name:${JSON.stringify(draftName)}}); await d.setFrameSize({width:1080,height:1440}); const fps=(await d.meta()).fps; if(Math.abs(fps-30000/1001)>0.05)throw new Error("Unsupported draft frame rate: "+fps); const cuts=${JSON.stringify(CUTS)}; await d.insertGap({seconds:cuts[0]/fps}); const ids=${JSON.stringify(shotIds)}; for(let i=0;i<ids.length;i++)await d.insertResource({resourceId:ids[i],sourceRange:{startSeconds:0,endSeconds:(cuts[i+1]-cuts[i])/fps}}); const main=await d.clips({trackScope:"main"}); const first=Math.min(...main.map(c=>c.startFrame)); const end=Math.max(...main.map(c=>c.endFrame)); if(first!==cuts[0]||end!==cuts[cuts.length-1]||main.length!==ids.length)throw new Error("Gallery timing did not match the template"); await d.addMotionGraphic({label:"Gallery opening",tsxCode:${JSON.stringify(TITLE_GRAPHIC)},within:await d.rangeAtFrames(0,cuts[0]),parameters:{text:${JSON.stringify(title)}},editableParameters:[{key:"text",label:"Text",type:"text",defaultValue:${JSON.stringify(title)}}]}); await d.overlayResource({resource:p.resource(${JSON.stringify(audioId)}),over:await d.rangeAtFrames(0,${AUDIO_END_FRAME})}); const check=await d.validate({maxDurationSeconds:11.7}); if(!check.ok)throw new Error(JSON.stringify(check)); const saved=await d.commitAll("Create gallery montage"); return {draftId:saved.createdDraftId,frames:end,clips:main.length};`;
  const built = await sdk.runScript({ summary: "Build gallery draft", script, allowCommit: true });
  if (built.isError || !built.result?.draftId) throw new Error(built.output || "Draft creation failed");
  return { draftId: built.result.draftId, audioId };
}

const TEMPLATE_FAILED = "pov: you open my gallery couldn't make the timeline. Try again.";

// The app hands a template its own Resource ids, but every run_script read
// (resources(), clips()) speaks the short ids the script SDK gives out (r0, r1…).
// The app's list (sdk.call) and the script's list are the Project's Resources in
// the same order, so they pair up row by row; names and types are compared so a
// list that changed in between is refused rather than mismatched.
async function scriptResourceIds(sdk, projectId) {
  const [app, run] = await Promise.all([
    sdk.call("listProjectResources", projectId),
    sdk.runScript({ summary: "Match picked clips", allowCommit: false, script: `return (await selects.project(${JSON.stringify(projectId)}).resources()).map(r=>({id:r.resourceId,name:r.name,type:r.type}));` }),
  ]);
  const rows = run?.result;
  if (!Array.isArray(app) || run.isError || !Array.isArray(rows) || app.length !== rows.length || app.some((a, i) => a.name !== rows[i].name || a.type !== rows[i].type)) throw new Error(run?.output || "Could not match the picked clips to this project.");
  return new Map(app.map((a, i) => [a.resourceId, rows[i].id]));
}

// A Clip highlights run (`context.template`): the 15 clips picked in the app,
// the panel's defaults for the rest, built out of sight and reported once.
function TemplateRun({ sdk, context }) {
  const runId = context.template?.runId;
  const [status, setStatus] = React.useState("Making your gallery\u2026");
  const started = React.useRef(null), alive = React.useRef(true), latest = React.useRef(context);
  latest.current = context;
  React.useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  React.useEffect(() => {
    if (!runId || started.current === runId) return;
    started.current = runId;
    const live = () => alive.current && latest.current.template?.runId === runId;
    let ended = false;
    const finish = (result) => { if (ended) return; ended = true; if (!live()) return; try { sdk.finishTemplate(result); } catch {} };
    (async () => {
      const template = context.template, projectId = context.projectId;
      if (!projectId) throw new Error("Open a project, then try again.");
      const picks = (template.inputs?.clips || []).filter((pick) => pick?.resourceId);
      if (picks.length !== SHOT_COUNT) throw new Error(`Pick ${SHOT_COUNT} videos, then try again.`);
      const reply = await sdk.runScript({ summary: "Find gallery media", script: mediaScript(projectId) });
      if (reply.isError || !reply.result) throw new Error("Couldn't read this project's files. Try again.");
      const ids = await scriptResourceIds(sdk, projectId);
      const byId = new Map((reply.result.videos || []).map((item) => [item.resourceId, item]));
      const files = picks.map((pick) => byId.get(ids.get(pick.resourceId) ?? pick.resourceId));
      const missing = picks.find((pick, index) => !files[index]?.path);
      if (missing) throw new Error(`Couldn't find ${missing.name || "a picked video"} in this project. Try again.`);
      const short = picks.find((pick, index) => !(files[index].durationSeconds >= 1.3));
      if (short) throw new Error(`${short.name || "A picked video"} is shorter than 1.3 seconds. Pick longer videos.`);
      const mode = template.options?.order === "random" ? "random" : "ordered";
      const chosen = chooseShots(files, mode);
      if (!live()) return;
      setStatus("Cropping and placing your clips\u2026");
      const audios = reply.result.audios || [];
      const { draftId } = await buildGallery(sdk, { projectId, language: context.language, chosen, audios, fixedAudioId: fixedAudioOf(audios), say: (text) => { if (live()) setStatus(text); } });
      finish({ sequenceId: draftId });
    })().catch((error) => {
      console.warn("[gongju-gallery] template run failed:", error);
      const said = String(error?.message || "");
      finish({ error: said && said.length <= 160 && !/[\n{]/.test(said) ? said : TEMPLATE_FAILED });
    });
  }, [runId]);
  return <small>{status}</small>;
}

export default function Panel(props) {
  return props.context?.template ? <TemplateRun {...props} /> : <GalleryPanel {...props} />;
}

function GalleryPanel({ sdk, context, ui }) {
  const t = T;
  const [videos, setVideos] = React.useState([]);
  const [audios, setAudios] = React.useState([]);
  const [folder, setFolder] = React.useState(null);
  const [fixedAudioId, setFixedAudioId] = React.useState(null);
  const [projectTitle, setProjectTitle] = React.useState("");
  const [selectionMode, setSelectionMode] = React.useState("ordered");
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState(null);
  const loadedProjectId = React.useRef(null);

  React.useEffect(() => {
    if (!context.projectId) return;
    let cancelled = false;
    setLoading(true);
    setStatus(null);
    const script = mediaScript(context.projectId);
    sdk.runScript({ summary: "Find gallery media", script }).then((reply) => {
      if (cancelled) return;
      if (reply.isError || !reply.result) throw new Error(reply.output || "Could not read project files");
      const found = reply.result;
      setVideos(found.videos || []);
      setAudios(found.audios || []);
      setProjectTitle(found.projectTitle || "");
      const names = [...new Set((found.videos || []).map((item) => item.folder))];
      const suitable = names.find((name) => (found.videos || []).filter((item) => item.folder === name && item.path && item.durationSeconds >= 1.3).length >= SHOT_COUNT);
      const sameProject = loadedProjectId.current === context.projectId;
      loadedProjectId.current = context.projectId;
      setFolder((current) => sameProject && names.includes(current) ? current : suitable || null);
      setFixedAudioId(fixedAudioOf(found.audios));
      setLoading(false);
    }).catch((error) => {
      if (cancelled) return;
      setLoading(false);
      setStatus({ type: "error", message: String(error.message || error) });
    });
    return () => { cancelled = true; };
  }, [context.projectId]);

  const folderNames = [...new Set(videos.map((item) => item.folder))];
  const folderOptions = folderNames.map((name) => ({ value: name, label: name.normalize("NFC") }));
  const selectedVideos = videos.filter((item) => item.folder === folder);
  const eligibleVideoCount = selectedVideos.filter((item) => item.path && item.durationSeconds >= 1.3).length;

  async function build() {
    if (!context.projectId || !folder || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const chosen = chooseShots(selectedVideos, selectionMode);
      const { audioId } = await buildGallery(sdk, { projectId: context.projectId, language: context.language, chosen, audios, fixedAudioId, say: (message) => setStatus({ type: "muted", message }) });
      if (!fixedAudioId) setFixedAudioId(audioId);
      setStatus({ type: "success", message: t.done });
    } catch (error) {
      setStatus({ type: "error", message: String(error.message || error) });
    } finally {
      setBusy(false);
    }
  }

  if (!context.projectId) return <ui.Message tone="muted">{t.noProject}</ui.Message>;
  return <ui.Section title={t.title}>
    <p>{t.ready}</p>
    <small>{selectionMode === "random" ? t.randomHelp : t.orderedHelp} {t.middle}</small>
    <p>{t.currentProject}: <strong>{projectTitle || "…"}</strong></p>
    {folderNames.length <= 1 ? <small>{t.folderScope}</small> : null}
    {loading ? <ui.Message>{t.loading}</ui.Message> : null}
    <ui.Select label={t.folder} value={folder} onChange={setFolder} options={folderOptions} disabled={busy || loading} />
    <p>{t.fixedMusic}: <strong>{MUSIC_NAME}</strong></p>
    <ui.Select label={t.selectionMode} value={selectionMode} onChange={setSelectionMode} options={[{value:"ordered",label:t.ordered},{value:"random",label:t.random}]} disabled={busy || loading} />
    <p>{t.opening}: <strong>{OPENING_TEXT}</strong></p>
    <small>{t.rights}</small>
    <ui.Actions><ui.Button variant="primary" busy={busy} busyLabel={t.working} disabled={loading || !folder || eligibleVideoCount < SHOT_COUNT} onClick={build}>{t.build}</ui.Button></ui.Actions>
    {status ? <ui.Message tone={status.type}>{status.message}</ui.Message> : null}
  </ui.Section>;
}
