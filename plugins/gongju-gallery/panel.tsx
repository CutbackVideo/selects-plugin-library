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

// media-duration:start
// Source-media seconds only: never derive these from a Draft's frame rate.
// Zero, missing, non-numeric and non-finite values are unknown, not short clips.
// This pure function is also serialized into read-only run_script queries.
function mediaDurationFact(resourceSeconds = null, treeSeconds = null) {
  if (typeof resourceSeconds === "number" && Number.isFinite(resourceSeconds) && resourceSeconds > 0) {
    return { durationSeconds: resourceSeconds, durationSource: "resource" };
  }
  if (typeof treeSeconds === "number" && Number.isFinite(treeSeconds) && treeSeconds > 0) {
    return { durationSeconds: treeSeconds, durationSource: "source-tree" };
  }
  return { durationSeconds: null, durationSource: "unknown" };
}

// Keep each row's identity, name and path together; do not mutate caller snapshots.
// The caller supplies its existing read-only host probe, not an import or analysis.
async function resolveMediaDurations(rows, probeSeconds) {
  const resolved = [];
  for (const row of rows) {
    let fact = mediaDurationFact(row.durationSeconds);
    if (fact.durationSeconds !== null) {
      fact.durationSource = row.durationSource || "provided";
    } else if (row.path) {
      try {
        const seconds = await probeSeconds(row.path);
        if (typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0) {
          fact = { durationSeconds: seconds, durationSource: "probe" };
        }
      } catch { /* A failed observation remains unknown. */ }
    }
    resolved.push({ ...row, ...fact });
  }
  return resolved;
}

function requireMediaDurations(rows) {
  const unknown = rows.find(row => mediaDurationFact(row.durationSeconds).durationSeconds === null);
  if (unknown) {
    throw Object.assign(new Error(`Could not read the duration of ${unknown.name || "a picked video"}. Try again.`), {
      code: "media-duration-unknown", resourceId: unknown.resourceId,
    });
  }
}
// media-duration:end

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
function mediaScript(projectId, resourceIds = null) {
  return `${mediaDurationFact.toString()};
const selected = ${JSON.stringify(resourceIds)};
const p=selects.project(${JSON.stringify(projectId)});
const [meta,overview,resources]=await Promise.all([p.meta(),p.sourceFiles(),p.resources()]);
const byId=new Map(resources.map(row=>[row.resourceId,row]));
const items=[];
function walk(nodes,parts){
  for(const node of nodes){
    if(node.type==="dir") walk(node.children,parts.concat(node.name));
    else {
      const resource=byId.get(node.resourceId);
      items.push({name:resource?.name||node.name,type:node.type,resourceId:node.resourceId,path:node.path,
        ...mediaDurationFact(resource?.durationSeconds,node.durationSeconds),frameSize:node.frameSize,folder:parts.join("/")||"(root)"});
    }
  }
}
if("fileTree" in overview) walk(overview.fileTree,[]);
else for(const folder of overview.folders){
  const page=await p.sourceFiles({folder:folder.name});
  if("fileTree" in page) walk(page.fileTree,folder.name==="(root)"?[]:[folder.name]);
}
return {projectTitle:meta.title,videos:items.filter(x=>x.type==="video"&&(!selected||selected.includes(x.resourceId))),audios:items.filter(x=>x.type==="audio")};`;
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
  hostUseSdk(sdk);
  let rt, fs, roots;
  try {
    rt = hostNeed("Runtime", "runFFmpeg"); hostNeed("FileSystem", "readFile");
    fs = hostApi("FileSystem", "join", "homedir", "exists", "mkdir");
    if (!fs) throw hostError("host-missing", "no FileSystem");
    roots = await hostRoots(sdk, "gongju-gallery", "SKILL.md");
  } catch (error) { throw new Error(error?.code === "not-found" ? "The plugin folder could not be found. Reinstall the plugin." : HOST_TOO_OLD); }
  if (!roots.data) throw new Error(HOST_TOO_OLD);
  const audioPath = hostJoin(roots.plugin, "assets", MUSIC_NAME);
  if (!(await fs.exists(audioPath))) throw new Error("The fixed gallery soundtrack is missing from the plugin");
  let existingAudioId = null;
  const candidates = manifest.audioCandidates || [];
  // Without a match (or without crypto.subtle) the soundtrack is imported, as on a first run.
  if (candidates.length) { try {
    const music = await sha256(await hostReadBytes(audioPath));
    for (const candidate of candidates) {
      try { if ((await fs.exists(candidate.path)) && await sha256(await hostReadBytes(candidate.path)) === music) { existingAudioId = candidate.resourceId; break; } } catch { /* not a match */ }
    }
  } catch { existingAudioId = null; } }
  const dir = hostJoin(roots.data, (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random()).replace(/[^0-9a-z]/gi, ""));
  (await fs.mkdir(dir, { recursive: true }));
  const paths = [];
  for (const [index, clip] of manifest.clips.entries()) {
    if (!clip.path || !(await fs.exists(clip.path)) || !(clip.frames >= 1) || !(clip.startSeconds >= 0)) throw new Error(`Invalid input clip ${index + 1}`);
    const output = hostJoin(dir, `gallery-${String(index + 1).padStart(2, "0")}.mp4`);
    const transcode = { sourcePath: clip.path, outputPath: output, width: 1080, height: 1440,
      frameRate: 30000 / 1001, frameCount: clip.frames + CROP_SPARE_FRAMES, bitrate: 10000000,
      sourceStartSeconds: Number(clip.startSeconds.toFixed(6)), fit: "cover", position: { x: .5, y: .5 }, endBehavior: "stop" };
    if (typeof rt.runVideoTranscode === "function") await rt.runVideoTranscode(transcode, galleryCropArgs(clip, output), true);
    else await rt.runFFmpeg(galleryCropArgs(clip, output), true);
    if (!(await fs.exists(output))) throw new Error(`Portrait clip ${index + 1} failed`);
    paths.push(output);
  }
  return { paths, audioPath, existingAudioId };
}
// The Draft script. CUTS are frame numbers at 30000/1001 fps; a new Draft takes the Project's frame rate (the SDK has
// no setter), so each cut is converted to the Draft's own frames (unchanged at 29.97).
function galleryScript(cfg) {
  return `const p=selects.project(${JSON.stringify(cfg.projectId)}); const d=await p.createDraft({name:${JSON.stringify(cfg.draftName)}}); await d.setFrameSize({width:1080,height:1440}); const fps=(await d.meta()).fps; if(!(fps>0))throw new Error("Unsupported draft frame rate: "+fps); const at=(f)=>Math.round(f*1001/30000*fps); const cuts=${JSON.stringify(CUTS)}.map(at); await d.insertGap({seconds:cuts[0]/fps}); const ids=${JSON.stringify(cfg.shotIds)}; for(let i=0;i<ids.length;i++)await d.insertResource({resourceId:ids[i],sourceRange:{startSeconds:0,endSeconds:(cuts[i+1]-cuts[i])/fps}}); const main=await d.clips({trackScope:"main"}); const first=Math.min(...main.map(c=>c.startFrame)); const end=Math.max(...main.map(c=>c.endFrame)); if(first!==cuts[0]||end!==cuts[cuts.length-1]||main.length!==ids.length)throw new Error("Gallery timing did not match the template"); await d.addMotionGraphic({label:"Gallery opening",tsxCode:${JSON.stringify(TITLE_GRAPHIC)},within:await d.rangeAtFrames(0,cuts[0]),parameters:{text:${JSON.stringify(cfg.title)}},editableParameters:[{key:"text",label:"Text",type:"text",defaultValue:${JSON.stringify(cfg.title)}}]}); await d.overlayResource({resource:p.resource(${JSON.stringify(cfg.audioId)}),over:await d.rangeAtFrames(0,at(${AUDIO_END_FRAME}))}); const check=await d.validate({maxDurationSeconds:11.7}); if(!check.ok)throw new Error(JSON.stringify(check)); const saved=await d.commitAll("Create gallery montage"); return {draftId:saved.createdDraftId,frames:end,clips:main.length};`;
}

// Spare frames past each shot, so a shot rounded to another Draft frame rate (up to one Draft frame longer, 42 ms at
// 23.976) still fits inside its crop.
const CROP_SPARE_FRAMES = 2;
// The ffmpeg argv for one portrait shot (the same filter and codec the old crop.py used).
function galleryCropArgs(clip, output) {
  return ["-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-ss", clip.startSeconds.toFixed(6), "-i", clip.path,
    "-vf", "scale=1080:1440:force_original_aspect_ratio=increase,crop=1080:1440,setsar=1,fps=30000/1001",
    "-frames:v", String(clip.frames + CROP_SPARE_FRAMES), "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", output];
}

// av-host:start
// Local files and media tools use the public async SDK. Paths remain host-native.
let hostSdk = null;
function hostUseSdk(sdk) { hostSdk = panelLocalClient(sdk); }
function hostError(code, message, member = "") { return Object.assign(new Error(message), { code, member }); }
// A host service when it has every named method, else null.
function hostApi(name, ...methods) {
  const s = name === "FileSystem" ? hostSdk?.files : name === "Runtime" ? hostSdk?.media : null;
  return s && methods.every((m) => typeof s[m] === "function") ? s : null;
}
// A host service that must have `method`; throws a 'host-missing' error when this build lacks it.
function hostNeed(name, method) {
  const s = hostApi(name, method);
  if (!s) throw hostError("host-missing", "Update Selects to use this plugin: missing SDK " + name + "." + method, name + "." + method);
  return s;
}
// The host initializes the environment before mounting the panel.
function hostIsWindows() { return /^win/i.test(String(hostSdk?.environment?.platform || "")); }
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
// Cleanup is best effort; all disk operations cross the async SDK bridge.
async function hostRemove(path) {
  try { await hostNeed("FileSystem", "removeFile").removeFile({ filePath: path }); } catch { /* leftover temporary file */ }
}
async function hostRoots(sdk, id, marker) {
  hostUseSdk(sdk);
  const fs = hostNeed("FileSystem", "exists");
  const plugin = fs.join(fs.homedir(), ".selects", "skills", id);
  if (!await fs.exists(fs.join(plugin, marker))) throw hostError("not-found", "the plugin folder could not be found");
  let data = fs.join(fs.homedir(), ".selects", "plugin-data", id);
  try { await fs.mkdir(data, { recursive: true }); } catch { data = null; }
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
  const script = galleryScript({ projectId, draftName, shotIds, audioId, title });
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
async function scriptResourceIds(sdk, projectId, resourceIds) {
  const app = await sdk.call("listProjectResources", projectId);
  if (!Array.isArray(app)) throw new Error("Could not read the project resources.");
  const indices = [...new Set(resourceIds)].map(id => app.findIndex(r => r.resourceId === id));
  if (indices.includes(-1)) throw new Error("A picked file is missing from this project.");
  const run = await readMediaPages(sdk, { summary: "Match picked files", script: `const rows=await selects.project(${JSON.stringify(projectId)}).resources();return {count:rows.length,rows:${JSON.stringify(indices)}.map(i=>{const r=rows[i];return r?{id:r.resourceId,name:r.name,type:r.type}:null;})};` });
  const result = run.result, rows = result.rows;
  if (result.count !== app.length || rows.length !== indices.length || indices.some((index, i) => app[index].name !== rows[i]?.name || app[index].type !== rows[i]?.type)) throw new Error("Could not match the picked files to this project.");
  return new Map(indices.map((index, i) => [app[index].resourceId, rows[i].id]));
}

// A Clip highlights run (`context.template`): the 15 clips picked in the app,
// the panel's defaults for the rest, built out of sight and reported once.
function TemplateRun({ sdk, context }) {
  useAppUpdateGuard(sdk, context?.language, () => !!(true));
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
      const ids = await scriptResourceIds(sdk, projectId, picks.map(x => x.resourceId));
      const reply = await readMediaPages(sdk, { summary: "Find gallery media", script: mediaScript(projectId, [...ids.values()]) });
      if (reply.isError || !reply.result) throw new Error("Couldn't read this project's files. Try again.");
      const byId = new Map((reply.result.videos || []).map((item) => [item.resourceId, item]));
      const selectedFiles = picks.map((pick) => byId.get(ids.get(pick.resourceId) ?? pick.resourceId));
      const missing = picks.find((pick, index) => !selectedFiles[index]?.path);
      if (missing) throw new Error(`Couldn't find ${missing.name || "a picked video"} in this project. Try again.`);
      const files = await resolveMediaDurations(selectedFiles, hostProbeSeconds);
      requireMediaDurations(files);
      const short = files.find((file) => file.durationSeconds < 1.3);
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

function Panel(props) {
  hostUseSdk(props.sdk);
  return props.context?.template ? <TemplateRun {...props} /> : <GalleryPanel {...props} />;
}

function GalleryPanel({ sdk, context, ui }) {
  useAppUpdateGuard(sdk, context?.language, () => !!(busy || loading));
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
    readMediaPages(sdk, { summary: "Find gallery media", script }).then((reply) => {
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

// Only read-only media queries use this: keep every row without exceeding run_script's response limit.
async function readMediaPages(sdk, args) {
  let result, total;
  for (let offset = 0; ; offset += 32) {
    const script = `const value=await(async()=>{${args.script}\n})();const array=Array.isArray(value);const data=array?{rows:value}:value;const page={};let total=0;for(const key of Object.keys(data)){const rows=data[key];page[key]=Array.isArray(rows)?rows.slice(${offset},${offset + 32}):rows;if(Array.isArray(rows))total=Math.max(total,rows.length);}return {array,page,total};`;
    const reply = await sdk.runScript({ ...args, script, allowCommit: false });
    if (reply.isError || !reply.result?.page) throw new Error(reply.output || 'Could not read the Project media.');
    const batch = reply.result;
    if (total !== undefined && total !== batch.total) throw new Error('Project media changed while loading. Try again.');
    total = batch.total;
    if (offset === 0) result = batch.page;
    else for (const key of Object.keys(batch.page)) if (Array.isArray(batch.page[key])) result[key].push(...batch.page[key]);
    if (offset + 32 >= total) return { ...reply, result: batch.array ? result.rows : result };
  }
}

// local-sdk:start
async function fingerprintTemplateFile(files,path,check=()=>{},scheme=null) {
/* @noble/hashes 2.2.0; license retained inside serialized SDK copies.
The MIT License (MIT)

Copyright (c) 2022 Paul Miller (https://paulmillr.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the “Software”), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
const __templateHashAny=value=>value;
var __templateFileHash = __templateHashAny((() => { var w = __templateHashAny(Object).defineProperty; var G = __templateHashAny(Object).getOwnPropertyDescriptor; var V = __templateHashAny(Object).getOwnPropertyNames; var O = __templateHashAny(__templateHashAny(Object).prototype).hasOwnProperty; var k = (t, e, r) => e in t ? __templateHashAny(w)(t, e, { enumerable: !0, configurable: !0, writable: !0, value: r }) : __templateHashAny(t)[e] = r; var R = (t, e) => { for (var r in e)
    __templateHashAny(w)(t, r, { get: __templateHashAny(e)[r], enumerable: !0 }); }, $ = (t, e, r, o) => { if (e && typeof e == "object" || typeof e == "function")
    for (let n of __templateHashAny(V)(e))
        !__templateHashAny(O).call(t, n) && n !== r && __templateHashAny(w)(t, n, { get: () => __templateHashAny(e)[n], enumerable: !(o = __templateHashAny(G)(e, n)) || __templateHashAny(o).enumerable }); return t; }; var M = t => __templateHashAny($)(__templateHashAny(w)({}, "__esModule", { value: !0 }), t); var a = (t, e, r) => __templateHashAny(k)(t, typeof e != "symbol" ? e + "" : e, r); var N = {}; __templateHashAny(R)(N, { sha256: () => _ }); function j(t) { return t instanceof Uint8Array || __templateHashAny(ArrayBuffer).isView(t) && __templateHashAny(__templateHashAny(t).constructor).name === "Uint8Array" && "BYTES_PER_ELEMENT" in t && __templateHashAny(t).BYTES_PER_ELEMENT === 1; } function m(t, e, r = "") { let o = __templateHashAny(j)(t), n = __templateHashAny(t)?.length, f = e !== void 0; if (!o || f && n !== e) {
    let s = r && `"${r}" `, x = f ? ` of length ${e}` : "", i = o ? `length=${n}` : `type=${typeof t}`, h = s + "expected Uint8Array" + x + ", got " + i;
    throw o ? new (__templateHashAny(RangeError))(h) : new (__templateHashAny(TypeError))(h);
} return t; } function L(t, e = !0) { if (__templateHashAny(t).destroyed)
    throw new (__templateHashAny(Error))("Hash instance has been destroyed"); if (e && __templateHashAny(t).finished)
    throw new (__templateHashAny(Error))("Hash#digest() has already been called"); } function C(t, e) { __templateHashAny(m)(t, void 0, "digestInto() output"); let r = __templateHashAny(e).outputLen; if (__templateHashAny(t).length < r)
    throw new (__templateHashAny(RangeError))('"digestInto() output" expected to be of length >=' + r); } function y(...t) { for (let e = 0; e < __templateHashAny(t).length; e++)
    __templateHashAny(__templateHashAny(t)[e]).fill(0); } function A(t) { return new (__templateHashAny(DataView))(__templateHashAny(t).buffer, __templateHashAny(t).byteOffset, __templateHashAny(t).byteLength); } function d(t, e) { return t << 32 - e | t >>> e; } function F(t, e = {}) { let r = (n, f) => __templateHashAny(__templateHashAny(__templateHashAny(t)(f)).update(n)).digest(), o = __templateHashAny(t)(void 0); return __templateHashAny(r).outputLen = __templateHashAny(o).outputLen, __templateHashAny(r).blockLen = __templateHashAny(o).blockLen, __templateHashAny(r).canXOF = __templateHashAny(o).canXOF, __templateHashAny(r).create = n => __templateHashAny(t)(n), __templateHashAny(Object).assign(r, e), __templateHashAny(Object).freeze(r); } var T = t => ({ oid: __templateHashAny(Uint8Array).from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, t]) }); function D(t, e, r) { return t & e ^ ~t & r; } function I(t, e, r) { return t & e ^ t & r ^ e & r; } var E = class {
    constructor(e, r, o, n) { __templateHashAny(a)(__templateHashAny(this), "blockLen"); __templateHashAny(a)(__templateHashAny(this), "outputLen"); __templateHashAny(a)(__templateHashAny(this), "canXOF", !1); __templateHashAny(a)(__templateHashAny(this), "padOffset"); __templateHashAny(a)(__templateHashAny(this), "isLE"); __templateHashAny(a)(__templateHashAny(this), "buffer"); __templateHashAny(a)(__templateHashAny(this), "view"); __templateHashAny(a)(__templateHashAny(this), "finished", !1); __templateHashAny(a)(__templateHashAny(this), "length", 0); __templateHashAny(a)(__templateHashAny(this), "pos", 0); __templateHashAny(a)(__templateHashAny(this), "destroyed", !1); __templateHashAny(__templateHashAny(this)).blockLen = e, __templateHashAny(__templateHashAny(this)).outputLen = r, __templateHashAny(__templateHashAny(this)).padOffset = o, __templateHashAny(__templateHashAny(this)).isLE = n, __templateHashAny(__templateHashAny(this)).buffer = new (__templateHashAny(Uint8Array))(e), __templateHashAny(__templateHashAny(this)).view = __templateHashAny(A)(__templateHashAny(__templateHashAny(this)).buffer); }
    update(e) { __templateHashAny(L)(__templateHashAny(this)), __templateHashAny(m)(e); let { view: r, buffer: o, blockLen: n } = __templateHashAny(this), f = __templateHashAny(e).length; for (let s = 0; s < f;) {
        let x = __templateHashAny(Math).min(n - __templateHashAny(__templateHashAny(this)).pos, f - s);
        if (x === n) {
            let i = __templateHashAny(A)(e);
            for (; n <= f - s; s += n)
                __templateHashAny(__templateHashAny(this)).process(i, s);
            continue;
        }
        __templateHashAny(o).set(__templateHashAny(e).subarray(s, s + x), __templateHashAny(__templateHashAny(this)).pos), __templateHashAny(__templateHashAny(this)).pos += x, s += x, __templateHashAny(__templateHashAny(this)).pos === n && (__templateHashAny(__templateHashAny(this)).process(r, 0), __templateHashAny(__templateHashAny(this)).pos = 0);
    } return __templateHashAny(__templateHashAny(this)).length += __templateHashAny(e).length, __templateHashAny(__templateHashAny(this)).roundClean(), __templateHashAny(this); }
    digestInto(e) { __templateHashAny(L)(__templateHashAny(this)), __templateHashAny(C)(e, __templateHashAny(this)), __templateHashAny(__templateHashAny(this)).finished = !0; let { buffer: r, view: o, blockLen: n, isLE: f } = __templateHashAny(this), { pos: s } = __templateHashAny(this); __templateHashAny(r)[s++] = 128, __templateHashAny(y)(__templateHashAny(__templateHashAny(__templateHashAny(this)).buffer).subarray(s)), __templateHashAny(__templateHashAny(this)).padOffset > n - s && (__templateHashAny(__templateHashAny(this)).process(o, 0), s = 0); for (let c = s; c < n; c++)
        __templateHashAny(r)[c] = 0; __templateHashAny(o).setBigUint64(n - 8, __templateHashAny(BigInt)(__templateHashAny(__templateHashAny(this)).length * 8), f), __templateHashAny(__templateHashAny(this)).process(o, 0); let x = __templateHashAny(A)(e), i = __templateHashAny(__templateHashAny(this)).outputLen; if (i % 4)
        throw new (__templateHashAny(Error))("_sha2: outputLen must be aligned to 32bit"); let h = i / 4, u = __templateHashAny(__templateHashAny(this)).get(); if (h > __templateHashAny(u).length)
        throw new (__templateHashAny(Error))("_sha2: outputLen bigger than state"); for (let c = 0; c < h; c++)
        __templateHashAny(x).setUint32(4 * c, __templateHashAny(u)[c], f); }
    digest() { let { buffer: e, outputLen: r } = __templateHashAny(this); __templateHashAny(__templateHashAny(this)).digestInto(e); let o = __templateHashAny(e).slice(0, r); return __templateHashAny(__templateHashAny(this)).destroy(), o; }
    _cloneInto(e) { e || (e = new (__templateHashAny((__templateHashAny(__templateHashAny(this)).constructor)))), __templateHashAny(e).set(...__templateHashAny(__templateHashAny(this)).get()); let { blockLen: r, buffer: o, length: n, finished: f, destroyed: s, pos: x } = __templateHashAny(this); return __templateHashAny(e).destroyed = s, __templateHashAny(e).finished = f, __templateHashAny(e).length = n, __templateHashAny(e).pos = x, n % r && __templateHashAny(__templateHashAny(e).buffer).set(o), e; }
    clone() { return __templateHashAny(__templateHashAny(this))._cloneInto(); }
}, b = __templateHashAny(Uint32Array).from([1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225]); var W = __templateHashAny(Uint32Array).from([1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298]), l = new (__templateHashAny(Uint32Array))(64), B = class extends __templateHashAny(E) {
    constructor(e) { super(64, e, 8, !1); }
    get() { let { A: e, B: r, C: o, D: n, E: f, F: s, G: x, H: i } = __templateHashAny(this); return [e, r, o, n, f, s, x, i]; }
    set(e, r, o, n, f, s, x, i) { __templateHashAny(__templateHashAny(this)).A = e | 0, __templateHashAny(__templateHashAny(this)).B = r | 0, __templateHashAny(__templateHashAny(this)).C = o | 0, __templateHashAny(__templateHashAny(this)).D = n | 0, __templateHashAny(__templateHashAny(this)).E = f | 0, __templateHashAny(__templateHashAny(this)).F = s | 0, __templateHashAny(__templateHashAny(this)).G = x | 0, __templateHashAny(__templateHashAny(this)).H = i | 0; }
    process(e, r) { for (let c = 0; c < 16; c++, r += 4)
        __templateHashAny(l)[c] = __templateHashAny(e).getUint32(r, !1); for (let c = 16; c < 64; c++) {
        let g = __templateHashAny(l)[c - 15], p = __templateHashAny(l)[c - 2], S = __templateHashAny(d)(g, 7) ^ __templateHashAny(d)(g, 18) ^ g >>> 3, H = __templateHashAny(d)(p, 17) ^ __templateHashAny(d)(p, 19) ^ p >>> 10;
        __templateHashAny(l)[c] = H + __templateHashAny(l)[c - 7] + S + __templateHashAny(l)[c - 16] | 0;
    } let { A: o, B: n, C: f, D: s, E: x, F: i, G: h, H: u } = __templateHashAny(this); for (let c = 0; c < 64; c++) {
        let g = __templateHashAny(d)(x, 6) ^ __templateHashAny(d)(x, 11) ^ __templateHashAny(d)(x, 25), p = u + g + __templateHashAny(D)(x, i, h) + __templateHashAny(W)[c] + __templateHashAny(l)[c] | 0, H = (__templateHashAny(d)(o, 2) ^ __templateHashAny(d)(o, 13) ^ __templateHashAny(d)(o, 22)) + __templateHashAny(I)(o, n, f) | 0;
        u = h, h = i, i = x, x = s + p | 0, s = f, f = n, n = o, o = p + H | 0;
    } o = o + __templateHashAny(__templateHashAny(this)).A | 0, n = n + __templateHashAny(__templateHashAny(this)).B | 0, f = f + __templateHashAny(__templateHashAny(this)).C | 0, s = s + __templateHashAny(__templateHashAny(this)).D | 0, x = x + __templateHashAny(__templateHashAny(this)).E | 0, i = i + __templateHashAny(__templateHashAny(this)).F | 0, h = h + __templateHashAny(__templateHashAny(this)).G | 0, u = u + __templateHashAny(__templateHashAny(this)).H | 0, __templateHashAny(__templateHashAny(this)).set(o, n, f, s, x, i, h, u); }
    roundClean() { __templateHashAny(y)(l); }
    destroy() { __templateHashAny(__templateHashAny(this)).destroyed = !0, __templateHashAny(__templateHashAny(this)).set(0, 0, 0, 0, 0, 0, 0, 0), __templateHashAny(y)(__templateHashAny(__templateHashAny(this)).buffer); }
}, U = class extends __templateHashAny(B) {
    constructor() { super(32); __templateHashAny(a)(__templateHashAny(this), "A", __templateHashAny(b)[0] | 0); __templateHashAny(a)(__templateHashAny(this), "B", __templateHashAny(b)[1] | 0); __templateHashAny(a)(__templateHashAny(this), "C", __templateHashAny(b)[2] | 0); __templateHashAny(a)(__templateHashAny(this), "D", __templateHashAny(b)[3] | 0); __templateHashAny(a)(__templateHashAny(this), "E", __templateHashAny(b)[4] | 0); __templateHashAny(a)(__templateHashAny(this), "F", __templateHashAny(b)[5] | 0); __templateHashAny(a)(__templateHashAny(this), "G", __templateHashAny(b)[6] | 0); __templateHashAny(a)(__templateHashAny(this), "H", __templateHashAny(b)[7] | 0); }
}; var _ = __templateHashAny(F)(() => new (__templateHashAny(U)), __templateHashAny(T)(1)); return __templateHashAny(M)(N); }))();

 if(typeof path!=='string'||!path||path.includes('\0')||typeof check!=='function')throw Error('The original file observation input is invalid.');
 if(scheme!==null&&scheme!=='cutback.media-content.v2')throw Error('Unknown media fingerprint scheme.');
 const sampled=scheme!==null;
 check();
 const native=sampled&&files&&'mediaFingerprint' in files?files.mediaFingerprint:null;
 if(typeof native==='function'){
  let supported=true,observed;
  try{observed=await native.call(files,path);}
  catch(error){
   // This is the exact old localFiles bridge response for an unknown action.
   // Permission, timeout, integrity and other operational failures must propagate.
   if(!/^(?:Error: )?Unsupported file operation\.?$/.test(String(error?.message??error)))throw error;
   supported=false;
  }
  check();
  if(supported){
   if(observed===null)return null;
   if(!observed||observed.scheme!==scheme||!Number.isSafeInteger(observed.size)||observed.size<=0||typeof observed.digest!=='string'||!/^[a-f0-9]{64}$/.test(observed.digest))throw Error('The sampled media fingerprint could not be confirmed.');
   return {size:observed.size,scheme:observed.scheme,digest:observed.digest};
  }
 }
 if(typeof path!=='string'||!path||path.includes('\0')||typeof check!=='function'||typeof files?.stat!=='function'||typeof files?.readRange!=='function')throw Error('The original file observation input is invalid.');
 const observe=async operation=>{check();const result=await operation();check();return result;};
 const identity=stat=>typeof stat?.sourceIdentity==='string'&&stat.sourceIdentity?stat.sourceIdentity:Number.isFinite(stat?.ino)?stat.ino:null;
 const before=await observe(()=>files.stat(path));
 if(before===null)return null;
 if(!before||before.isDirectory!==false||!Number.isSafeInteger(before.size)||before.size<0||!Number.isFinite(before.mtimeMs)||identity(before)===null)throw Error("The file's size or identity could not be confirmed.");
 if(sampled&&before.size===0)throw Error('Cannot fingerprint empty media.');
 const hash=__templateFileHash.sha256.create(),alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
 if(sampled){const prefix=scheme+':'+before.size+':';hash.update(Uint8Array.from(prefix,character=>character.charCodeAt(0)));}
 const sampleBytes=262144;
 const ranges=!sampled||before.size<=sampleBytes*3?[[0,before.size]]:[[0,sampleBytes],[Math.floor((before.size-sampleBytes)/2),sampleBytes],[before.size-sampleBytes,sampleBytes]];
 for(const [start,count] of ranges)for(let offset=start;offset<start+count;){
  const length=Math.min(49152,start+count-offset);
  const chunk=await observe(()=>files.readRange({path,offset,length}));
  if(!chunk||chunk.bytesRead!==length||typeof chunk.base64!=='string'||chunk.base64.length!==4*Math.ceil(length/3)||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(chunk.base64))throw Error('The file read returned an incomplete or invalid binary chunk.');
  const bytes=new Uint8Array(length);
  let position=0;
  for(let i=0;i<chunk.base64.length;i+=4){
   const a=alphabet.indexOf(chunk.base64[i]),b=alphabet.indexOf(chunk.base64[i+1]),c=chunk.base64[i+2]==='='?0:alphabet.indexOf(chunk.base64[i+2]),d=chunk.base64[i+3]==='='?0:alphabet.indexOf(chunk.base64[i+3]);
   if(chunk.base64[i+2]==='='&&(b&15)!==0||chunk.base64[i+3]==='='&&chunk.base64[i+2]!=='='&&(c&3)!==0)throw Error('The file read returned a noncanonical binary chunk.');
   bytes[position++]=(a<<2)|(b>>4);
   if(position<length)bytes[position++]=((b&15)<<4)|(c>>2);
   if(position<length)bytes[position++]=((c&3)<<6)|d;
  }
  hash.update(bytes);check();offset+=length;
 }
 const after=await observe(()=>files.stat(path));
 if(!after||after.isDirectory!==false||before.size!==after.size||before.mtimeMs!==after.mtimeMs||identity(before)!==identity(after))throw Error('The file changed while its contents were read.');
 const digest=hash.digest();check();
 let hex='';for(let index=0;index<digest.length;index++)hex+=digest[index].toString(16).padStart(2,'0');
 return sampled?{size:before.size,scheme,digest:hex}:{size:before.size,sha256:hex};
}
/** Pure host-platform path operations; no filesystem or renderer globals. */
function panelLocalPaths(platform: string) {
  const windows = platform === "win32";
  const slash = (path: string) => {
    if (typeof path !== "string")
      throw new TypeError("A path must be a string.");
    return windows ? path.replace(/\\/g, "/") : path;
  };
  const rootOf = (path: string) => {
    if (windows) {
      const unc = path.match(/^\/\/[^/]+\/[^/]+\/?/);
      if (unc) return unc[0].replace(/\/?$/, "/");
      const drive = path.match(/^[a-z]:\/?/i);
      if (drive) return drive[0];
    }
    return path.startsWith("/") ? "/" : "";
  };
  const native = (value: string) =>
    windows ? value.replace(/\//g, "\\") : value;
  const normalize = (value: string) => {
    const path = slash(value),
      root = rootOf(path),
      absolute = root.endsWith("/");
    const segments: string[] = [];
    for (const segment of path
      .slice(Math.min(root.length, path.length))
      .split("/")) {
      if (!segment || segment === ".") continue;
      if (segment === ".." && segments.length && segments.at(-1) !== "..")
        segments.pop();
      else if (segment !== ".." || !absolute) segments.push(segment);
    }
    let result = root + segments.join("/");
    if (!result || (windows && /^[a-z]:$/i.test(result))) result += ".";
    if (path.endsWith("/") && !result.endsWith("/")) result += "/";
    return native(result);
  };
  const basename = (value: string, extension?: string) => {
    const path = slash(value).replace(/\/+$/, "");
    const withoutDrive = windows ? path.replace(/^[a-z]:/i, "") : path;
    const name = withoutDrive.slice(withoutDrive.lastIndexOf("/") + 1);
    return extension && name.endsWith(extension)
      ? name.slice(0, -extension.length)
      : name;
  };
  return {
    normalize,
    join: (...paths: string[]) => {
      const parts = paths.map(slash).filter(Boolean);
      let joined = parts.join("/");
      if (windows && !/^\/\/[^/]/.test(parts[0] || ""))
        joined = joined.replace(/^\/{2,}/, "/");
      return normalize(joined);
    },
    dirname(value: string) {
      const path = slash(value),
        root = rootOf(path);
      const end = path.replace(/\/+$/, "").lastIndexOf("/");
      if (end < root.length) return value.slice(0, root.length) || ".";
      return value.slice(0, end);
    },
    basename,
    extname(value: string) {
      const name = basename(value),
        dot = name.lastIndexOf(".");
      return dot <= 0 || name === ".." ? "" : name.slice(dot);
    },
    isAbsolute: (value: string) => rootOf(slash(value)).endsWith("/"),
  };
}


/** Plugin-private composition of canonical SDK methods, not a public SDK surface. */
async function createPanelLocalClient(sdk: any) {
  const SCRIPT_BYTES = 256 * 1024;
  const runSource = async (script: string, write = false) => {
    if (new TextEncoder().encode(script).byteLength > SCRIPT_BYTES) throw new Error("The local file script exceeds the 256 KiB limit.");
    const response = await sdk.runScript({
      summary: "Use local media workspace",
      allowCommit: write,
      script,
    });
    if (response.isError) throw new Error(response.output || "Local SDK operation failed.");
    // A clipped report has no result. Every read returning data rejects that case below.
    return response.result;
  };
  // Direct arguments keep object literals contextually typed by the SDK signature.
  const run = (method: string, args: unknown[], write = false) =>
    runSource("return await selects." + method + "(" + JSON.stringify(args).slice(1, -1) + ");", write);
  const environment = await run("files.environment", []);
  if (!environment || typeof environment.platform !== "string" || !environment.homedir)
    throw new Error("Update Selects to use this plugin's local media workspace.");
  const paths = panelLocalPaths(environment.platform);
  const CHUNK_BYTES = 48 * 1024;
  // Three encoded chunks occupy 192 KiB, below the Panel's default 256 KiB result
  // budget. The same script still awaits each canonical file operation in order.
  const fileBatch = async (method: "readRange" | "writeChunk", inputs: unknown[], lengths: number[]) => {
    let count = Math.min(3, inputs.length), script = "";
    while (count > 0) {
      script = "const rows=[];" + inputs.slice(0, count).map((input, index) => {
        const call = "{const result=await selects.files." + method + "(" + JSON.stringify(input) + ");";
        if (method === "writeChunk")
          return call + "if(result?.bytesWritten!==" + lengths[index] + ")throw Error('The file write returned an incomplete result. Check the file before retrying.');rows.push(result);}";
        return call + "if(!result||typeof result.base64!=='string'||!Number.isSafeInteger(result.bytesRead)||result.bytesRead<0||result.bytesRead>" + lengths[index] + ")throw Error('The file read returned an incomplete result.');rows.push(result);if(result.bytesRead<" + lengths[index] + ")return rows;}";
      }).join("") + "return rows;";
      if (new TextEncoder().encode(script).byteLength <= SCRIPT_BYTES) break;
      count--;
    }
    if (!count) throw new Error("The local file script exceeds the 256 KiB limit.");
    return { count, rows: await runSource(script, method === "writeChunk") };
  };
  const readRange = async (path: string, offset: number, length: number) => {
    const parts: Uint8Array[] = [];
    let total = 0;
    while (total < length) {
      const inputs = Array.from({ length: Math.min(3, Math.ceil((length - total) / CHUNK_BYTES)) }, (_, index) =>
        ({ path, offset: offset + total + index * CHUNK_BYTES, length: Math.min(CHUNK_BYTES, length - total - index * CHUNK_BYTES) }));
      const lengths = inputs.map(input => input.length);
      const { rows, count } = await fileBatch("readRange", inputs, lengths);
      if (!Array.isArray(rows) || rows.length < 1 || rows.length > count) throw new Error("The file read returned an incomplete result.");
      let short = false;
      for (let index = 0; index < rows.length; index++) {
        const result = rows[index];
        if (!result || typeof result.base64 !== "string" || !Number.isSafeInteger(result.bytesRead) || result.bytesRead < 0 || result.bytesRead > lengths[index]) throw new Error("The file read returned an incomplete result.");
        const bytes = Uint8Array.from(atob(result.base64), (character) => character.charCodeAt(0));
        if (bytes.length !== result.bytesRead) throw new Error("The file read returned invalid bytes.");
        short = bytes.length < lengths[index];
        if (short && index !== rows.length - 1) throw new Error("The file read returned invalid bytes.");
        parts.push(bytes); total += bytes.length;
      }
      if (rows.length !== count && !short) throw new Error("The file read returned an incomplete result.");
      if (short) break;
    }
    const output = new Uint8Array(total);
    let position = 0;
    for (const bytes of parts) { output.set(bytes, position); position += bytes.length; }
    return output;
  };
  const files = {
    ...paths,
    homedir: () => environment.homedir,
    getOrCreateTmpDirPath: async () => environment.tempDirectory,
    exists: (path: string) => run("files.exists", [path]),
    stat: (path: string) => run("files.stat", [path]),
    // One script owns every read and its deadline; only the compact digest returns.
    mediaFingerprint: (path: string) => runSource("return await (" + fingerprintTemplateFile.toString() + ")(selects.files," + JSON.stringify(path) + ",undefined,\"cutback.media-content.v2\");"),
    readdir: (path: string) => run("files.readdir", [path]),
    // SDK-shaped requests support the same shared observation in SDK scripts and
    // the panel. Positional reads retain their existing byte/partial-EOF contract.
    readRange: (path: string | {path: string; offset: number; length: number}, offset?: number, length?: number) =>
      typeof path === "string" ? readRange(path, offset!, length!) : run("files.readRange", [path]),
    async readFile(path: string, encoding?: string) {
      const stat = await run("files.stat", [path]);
      if (!stat || !Number.isSafeInteger(stat.size) || stat.size < 0) throw new Error("The file is unavailable.");
      const bytes = await readRange(path, 0, stat.size);
      if (bytes.length !== stat.size) throw new Error("The file changed while it was being read.");
      if (encoding !== undefined && encoding !== "utf8") throw new Error("Only utf8 text encoding is supported.");
      return encoding === "utf8" ? new TextDecoder().decode(bytes) : bytes;
    },
    async writeFile(path: string, data: string | Uint8Array, options?: string | { encoding?: string; flag?: "w" | "a" | "wx" }) {
      const encoding = typeof options === "string" ? options : options?.encoding;
      const flag = typeof options === "object" ? options.flag : undefined;
      if (flag !== undefined && !["w", "a", "wx"].includes(flag)) throw new Error("Unsupported file write flag.");
      if (encoding !== undefined && encoding !== "utf8") throw new Error("Only utf8 text encoding is supported.");
      const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
      if ((flag === "a" || flag === "wx") && bytes.length > CHUNK_BYTES) throw new Error("Atomic append and exclusive creation are limited to 48 KiB.");
      // Each complete replacement has its own sibling file. Other panels cannot
      // overwrite one of its chunks before the final atomic rename publishes it.
      const replacement = flag !== "a" && flag !== "wx";
      const destination = replacement ? path + ".tmp-" + crypto.randomUUID() : path;
      let published = false;
      try {
        let offset = 0;
        do {
          const inputs = [], lengths = [];
          for (let index = 0; index < (replacement ? 3 : 1) && (offset + index * CHUNK_BYTES < bytes.length || index === 0); index++) {
            const position = offset + index * CHUNK_BYTES, chunk = bytes.subarray(position, position + CHUNK_BYTES);
            let binary = "";
            for (const byte of chunk) binary += String.fromCharCode(byte);
            const mode = position === 0 ? (flag === "a" ? "append" : "exclusive") : undefined;
            inputs.push({ path: destination, offset: position, base64: btoa(binary), ...(mode ? { mode } : {}) });
            lengths.push(chunk.length);
          }
          if (!replacement) {
            const result = await run("files.writeChunk", [inputs[0]], true);
            if (result?.bytesWritten !== lengths[0]) throw new Error("The file write returned an incomplete result. Check the file before retrying.");
          } else {
            const { rows, count } = await fileBatch("writeChunk", inputs, lengths);
            if (!Array.isArray(rows) || rows.length !== count || rows.some((row, index) => row?.bytesWritten !== lengths[index])) throw new Error("The file write returned an incomplete result. Check the file before retrying.");
            lengths.length = count;
          }
          offset += lengths.reduce((sum, size) => sum + size, 0);
        } while (offset < bytes.length);
        if (replacement) await run("files.rename", [destination, path], true);
        published = true;
      } finally {
        if (replacement && !published) await run("files.remove", [destination, { recursive: false, force: true }], true).catch(() => {});
      }
    },
    async compareAndReplace(path: string, expectedText: string | null, text: string) {
      const encode = (value: string) => {
        const bytes = new TextEncoder().encode(value);
        if (bytes.length > CHUNK_BYTES) throw new Error("Atomic file values are limited to 48 KiB.");
        let binary = "";
        for (const byte of bytes) binary += String.fromCharCode(byte);
        return btoa(binary);
      };
      const result = await run("files.compareAndReplace", [{path, expectedBase64: expectedText === null ? null : encode(expectedText), base64: encode(text)}], true);
      if (typeof result?.replaced !== "boolean") throw new Error("The atomic file update returned an incomplete result. Read the file before retrying.");
      return result.replaced;
    },
    mkdir: (path: string, options?: { recursive?: boolean }) => run("files.mkdir", [path, options ?? {}], true),
    rm: (path: string, options?: { recursive?: boolean; force?: boolean }) => run("files.remove", [path, { recursive: options?.recursive ?? false, force: options?.force ?? false }], true),
    removeFile: ({ filePath }: { filePath: string }) => run("files.remove", [filePath, { recursive: false, force: true }], true),
    rename: (from: string, to: string) => run("files.rename", [from, to], true),
    copyFile: (from: string, to: string) => run("files.copy", [from, to], true),
    downloadFile: (url: string, path: string) => run("files.download", [url, path], true),
    pathToLocalURL: (path: string) => run("files.localUrl", [path]),
    localURLToPath: (url: string) => run("files.pathFromLocalUrl", [url]),
  };
  const activeJobs = new Map<string, () => Promise<void>>();
  let disposed = false;
  const SETTLEMENT_MS = 5000, OUTPUT_BYTES = 4 * 1024 * 1024;
  const mediaIssue = (code: string, message: string, cause?: unknown, uncertain = false) =>
    Object.assign(new Error(message), { code: "LOCAL_MEDIA_" + code, publicMessage: message, terminal: true, cause,
      ...(uncertain ? { preserveTemporaryFiles: true } : {}) });
  const cancel = async (jobId: string) => {
    const response = await sdk.runScript({ summary: "Cancel local media processing", allowCommit: true, script: "await selects.media.job(" + JSON.stringify(jobId) + ").cancel();" });
    if (response.isError) throw new Error(response.output || "Media cancellation failed.");
  };
  const observeMedia = (read: () => Promise<any>, deadline: number): Promise<any> => new Promise((resolve, reject) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) { reject(mediaIssue("STATUS", "The media job response could not be confirmed.")); return; }
    const timer = setTimeout(() => reject(mediaIssue("STATUS", "The media job response could not be confirmed.")), remaining);
    Promise.resolve().then(read).then(
      value => { clearTimeout(timer); resolve(value); },
      cause => { clearTimeout(timer); reject(mediaIssue("STATUS", "The media job response could not be confirmed.", cause)); });
  });
  const validJob = (value: any) => typeof value?.jobId === "string" && !!value.jobId && value.jobId.length <= 1024;
  const process = async (executable: "FFmpeg" | "FFprobe", args: string[], _withoutLog?: boolean, signal?: AbortSignal, onStdout?: (text: string) => void, onStderr?: (text: string) => void, transcode?: Record<string, unknown>) => {
    if (!Array.isArray(args) || args.some(arg => typeof arg !== "string" || arg.includes("\0")) ||
      signal && (typeof signal.aborted !== "boolean" || typeof signal.addEventListener !== "function" || typeof signal.removeEventListener !== "function") ||
      onStdout !== undefined && typeof onStdout !== "function" || onStderr !== undefined && typeof onStderr !== "function")
      throw mediaIssue("INPUT", "The local media arguments or subscriptions are invalid.");
    if (disposed || signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const legacyStart = "selects.media.start" + executable + "(" + JSON.stringify({ args }) + ")";
    // Detect an absent interface before dispatch. Never retry an uncertain or failed job.
    const requiredFeatures = transcode ? [
      ...(/^https?:/i.test(String(transcode.sourcePath)) ? ["remote-source"] : []),
      ...("sourceStartSeconds" in transcode || "sourceEndSeconds" in transcode ? ["source-range"] : []),
      ...(transcode.inputKind === "image" ? ["image-input"] : []),
      ...("fit" in transcode || "position" in transcode ? ["framing"] : []),
      ...("endBehavior" in transcode ? ["end-behavior"] : []),
    ] : [];
    // Existing recipes may preserve a camera/photo size outside this job's bounds.
    // Select their original argv before dispatch instead of silently resizing.
    const withinTranscodeBounds = !transcode || (
      [transcode.width, transcode.height].every(value => Number.isInteger(value) && Number(value) >= 2 && Number(value) <= 4096 && Number(value) % 2 === 0) &&
      Number.isFinite(transcode.frameRate) && Number(transcode.frameRate) >= 1 && Number(transcode.frameRate) <= 120 &&
      Number.isInteger(transcode.frameCount) && Number(transcode.frameCount) >= 1 && Number(transcode.frameCount) <= 36000 &&
      Number.isFinite(transcode.bitrate) && Number(transcode.bitrate) >= 100000 && Number(transcode.bitrate) <= 100000000);
    const startSource = transcode && withinTranscodeBounds
      ? "const transcode = Reflect.get(selects.media, 'startVideoTranscode'); const discover = Reflect.get(selects.media, 'videoTranscodeFeatures'); const required = " + JSON.stringify(requiredFeatures.join(",")) + ".split(',').filter(Boolean); const features = required.length && typeof discover === 'function' ? await discover.call(selects.media) : []; return await (typeof transcode === 'function' && (!required.length || Array.isArray(features) && required.every(feature => features.includes(feature))) ? transcode.call(selects.media," + JSON.stringify(transcode) + ") : " + legacyStart + ");"
      : "return await " + legacyStart + ";";
    if (new TextEncoder().encode(startSource).byteLength > SCRIPT_BYTES) throw mediaIssue("INPUT", "The local media request exceeds its script byte budget.");
    let started: any;
    const starting = runSource(startSource, true);
    try { started = await observeMedia(() => starting, Date.now() + SETTLEMENT_MS); }
    catch (cause) {
      // A late start identity can only stop that original job. Never start again
      // or authorize cleanup from this background cancellation acknowledgement.
      void starting.then(value => validJob(value) ? cancel(value.jobId) : undefined, () => {}).catch(() => {});
      throw mediaIssue("START_UNKNOWN", "The media job start could not be confirmed. Its temporary workspace is retained for inspection.", cause, true);
    }
    if (!validJob(started))
      throw mediaIssue("START_UNKNOWN", "The media job identity could not be confirmed. Its temporary workspace is retained for inspection.", undefined, true);
    const jobId = started.jobId;
    let cancellation: Promise<void> | null = null, cancellationDeadline: number | null = null, settled = false;
    const requestCancel = () => {
      if (!cancellation) {
        cancellationDeadline = Date.now() + SETTLEMENT_MS;
        cancellation = cancel(jobId);
        void cancellation.catch(() => {});
      }
      return cancellation;
    };
    const abort = () => { void requestCancel(); };
    activeJobs.set(jobId, requestCancel);
    signal?.addEventListener("abort", abort, { once: true });
    if (disposed || signal?.aborted) abort();
    let cursor = 0, outputBytes = 0, stdout = "", stderr = "";
    const knownState = (status: any) => ["running", "succeeded", "failed", "cancelled"].includes(status?.state);
    // Read-only observations may time out; a late reply cannot authorize cleanup.
    const statusAt = (deadline: number) => observeMedia(() => sdk.call("getLocalMediaJobStatus", jobId, { cursor }), deadline);
    const settleAfterFailure = async (cause: unknown) => {
      requestCancel();
      const deadline = cancellationDeadline!;
      while (Date.now() < deadline) {
        try {
          const status = await statusAt(deadline);
          if (knownState(status) && status.state !== "running") { settled = true; return; }
        } catch { /* Only independent status reads may recover an unknown reply. */ }
        if (Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, Math.min(50, deadline - Date.now())));
      }
      throw Object.assign(mediaIssue("SETTLEMENT_UNKNOWN", "The media job exit could not be confirmed. Its temporary workspace is retained for inspection.", cause, true), { jobId });
    };
    try {
      while (true) {
        if (cancellationDeadline !== null && Date.now() >= cancellationDeadline)
          throw mediaIssue("STATUS", "The cancelled media job status could not be confirmed.");
        const status = await statusAt(cancellationDeadline ?? Date.now() + SETTLEMENT_MS);
        if (!knownState(status)) throw mediaIssue("STATUS", "The media job returned an unknown status.");
        settled = status.state !== "running";
        if (!Array.isArray(status.events) || status.events.length > 8 || typeof status.truncated !== "boolean" || !Number.isSafeInteger(status.nextCursor) || status.nextCursor < cursor)
          throw mediaIssue("STATUS", "The media job returned an incomplete status.");
        if (status.truncated) throw mediaIssue("OUTPUT", "Media output was truncated; no incomplete result was accepted.");
        let position = cursor;
        for (const event of status.events) {
          if (!event || !["stdout", "stderr"].includes(event.stream) || typeof event.text !== "string" || event.text.length > 4096 || !Number.isSafeInteger(event.cursor) || event.cursor !== position + 1 || event.cursor > status.nextCursor)
            throw mediaIssue("OUTPUT", "The media job returned incomplete output.");
          outputBytes += new TextEncoder().encode(event.text).byteLength;
          if (outputBytes > OUTPUT_BYTES) throw mediaIssue("OUTPUT_LIMIT", "The media output exceeds its 4 MiB byte budget.");
          position = event.cursor;
          if (event.stream === "stdout") { stdout += event.text; onStdout?.(event.text); }
          else { stderr += event.text; onStderr?.(event.text); }
        }
        if (position !== status.nextCursor) throw mediaIssue("OUTPUT", "The media job returned an incomplete output cursor.");
        cursor = status.nextCursor;
        if (settled && status.events.length === 0) {
          if (status.state === "cancelled" || signal?.aborted || disposed) throw new DOMException("Aborted", "AbortError");
          if (status.state === "failed") throw new Error(status.error || stderr || "Media processing failed.");
          return { stdout, stderr };
        }
        if (!settled) await new Promise(resolve => setTimeout(resolve, 150));
      }
    } catch (error) {
      if (!settled) await settleAfterFailure(error);
      throw error;
    } finally {
      signal?.removeEventListener("abort", abort);
      activeJobs.delete(jobId);
    }
  };
  return {
    files,
    environment,
    media: {
      runFFmpeg: (args: string[], quiet?: boolean, signal?: AbortSignal, stdout?: (text: string) => void, stderr?: (text: string) => void) => process("FFmpeg", args, quiet, signal, stdout, stderr),
      runVideoTranscode: (request: Record<string, unknown>, fallbackArgs: string[], quiet?: boolean, signal?: AbortSignal) => process("FFmpeg", fallbackArgs, quiet, signal, undefined, undefined, request),
      runFFprobe: (args: string[], quiet?: boolean, signal?: AbortSignal) => process("FFprobe", args, quiet, signal),
    },
    dialogs: {
      pickFilePath: (filters?: Array<{ name: string; extensions: string[] }>) => run("editor.pickFile", [{ filters }]),
      pickDirectoryPath: () => run("editor.pickDirectory", []),
      pickSavePath: (defaultPath: string) => run("editor.pickSavePath", [{ defaultPath }]),
    },
    dispose() { disposed = true; for (const requestCancel of activeJobs.values()) void requestCancel().catch(() => {}); },
  };
}

const panelLocalClients = new WeakMap<object, any>();
function panelLocalClient(sdk: any): any {
  const client = panelLocalClients.get(sdk);
  if (!client) throw new Error("Local SDK has not initialized.");
  return client;
}
function withPanelLocalClient(Component: any) {
  return function LocalSdkPanel(props: any) {
    const [state, setState] = React.useState<any>(null);
    const reported = React.useRef(new WeakMap<object, Set<string>>());
    const key = JSON.stringify([props.context?.projectId ?? null,
      props.context?.template?.libraryId ?? props.context?.libraryId ?? null,
      props.context?.template?.runId ?? null]);
    React.useEffect(() => {
      let active = true, settled = false;
      let client: any;
      const fail = (timeout: boolean, cause?: unknown) => {
        if (!active || settled) return;
        settled = true; clearTimeout(timer);
        const error = timeout
          ? "Connecting to Selects took too long. Reopen the Project and try again."
          : "Could not connect to Selects. Reopen the Project and try again; update Selects if the problem continues.";
        // Diagnostics stay private; neither the DOM nor finishTemplate receives
        // raw SDK output, paths or an exception stack.
        setState({sdk: props.sdk, key, error, cause});
      };
      // This is a read-only bootstrap observation, not a mutation retry or cancel.
      const timer = setTimeout(() => fail(true), 30000);
      createPanelLocalClient(props.sdk).then(value => {
        client = {...props.sdk, ...value};
        if (!active || settled) { value.dispose(); return; }
        settled = true; clearTimeout(timer);
        panelLocalClients.set(props.sdk, client);
        setState({sdk: props.sdk, key});
      }).catch(error => fail(false, error));
      return () => {
        active = false; clearTimeout(timer);
        if (client) {
          if (panelLocalClients.get(props.sdk) === client) panelLocalClients.delete(props.sdk);
          client.dispose();
        }
      };
    }, [props.sdk, key]);
    React.useEffect(() => {
      if (!props.context?.template || state?.sdk !== props.sdk || state?.key !== key || !state?.error) return;
      if (typeof props.sdk?.finishTemplate !== "function") return;
      const seen = reported.current.get(props.sdk) ?? new Set<string>();
      if (seen.has(key)) return;
      seen.add(key); reported.current.set(props.sdk, seen);
      // A failed connection never mounts the child, so the wrapper must finish
      // a hidden app run itself. Visible standalone panels keep an alert only.
      try { Promise.resolve(props.sdk.finishTemplate({error: state.error})).catch(() => {}); }
      catch { /* Do not replay completion or expose a transport exception. */ }
    }, [props.sdk, key, state, !!props.context?.template]);
    if (state?.sdk !== props.sdk || state?.key !== key) return React.createElement("div", {role: "status"}, "Connecting to Selects…");
    if (state?.error) return React.createElement("div", {role: "alert"}, state.error);
    return React.createElement(Component, props);
  };
}

export default withPanelLocalClient(Panel);
// local-sdk:end

// app-update-guard:start
// Shared source, inlined into portable panels by tools/sync_app_update_guards.py.
import * as AppUpdateGuardReact from 'react';

const appUpdateGuardScopes = new WeakMap<object, any>();

/** Each mounted editor contributes a live veto; the host receives one guard per SDK. */
function useAppUpdateGuard(sdk: any, language: string | undefined, readBlocked: (context: any) => boolean) {
  const live = AppUpdateGuardReact.useRef({ language, readBlocked });
  live.current = { language, readBlocked };
  AppUpdateGuardReact.useEffect(() => {
    const api = sdk?.updates;
    if (typeof api?.registerGuard !== 'function') return;
    let group = appUpdateGuardScopes.get(api);
    if (!group) {
      group = { entries: new Set(), dispose: null };
      appUpdateGuardScopes.set(api, group);
    }
    group.entries.add(live);
    if (!group.dispose) {
      group.dispose = api.registerGuard({
        async canUpdate(context: any) {
          for (const entry of group.entries) {
            // A partially initialized editor must not lose state during reload.
            let blocked = true;
            try { blocked = Boolean(entry.current.readBlocked(context)); } catch { /* fail closed */ }
            if (blocked) {
              const korean = String(entry.current.language || '').toLowerCase().startsWith('ko');
              throw new Error(korean
                ? '\uc9c4\ud589 \uc911\uc778 \uc791\uc5c5\uc744 \ub9c8\uce58\uace0 \ubcc0\uacbd\uc0ac\ud56d\uc744 \uc800\uc7a5\ud55c \ub4a4 \uc571\uc744 \uc5c5\ub370\uc774\ud2b8\ud574\uc8fc\uc138\uc694.'
                : 'Finish the current operation and save changes before updating this app.');
            }
          }
        },
      });
    }
    return () => {
      group.entries.delete(live);
      if (!group.entries.size) {
        group.dispose?.();
        appUpdateGuardScopes.delete(api);
      }
    };
  }, [sdk?.updates]);
}
// app-update-guard:end
