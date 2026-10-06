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
function mediaScript(projectId, resourceIds = null) {
  return `const selected = ${JSON.stringify(resourceIds)};const p=selects.project(${JSON.stringify(projectId)}); const [meta,overview]=await Promise.all([p.meta(),p.sourceFiles()]); const items=[]; function walk(nodes,parts){ for(const node of nodes){ if(node.type==="dir") walk(node.children,parts.concat(node.name)); else items.push({name:node.name,type:node.type,resourceId:node.resourceId,path:node.path,durationSeconds:node.durationSeconds,frameSize:node.frameSize,folder:parts.join("/")||"(root)"}); }} if("fileTree" in overview) walk(overview.fileTree,[]); else { for(const folder of overview.folders){ const page=await p.sourceFiles({folder:folder.name}); if("fileTree" in page) walk(page.fileTree,folder.name==="(root)"?[]:[folder.name]); }} return {projectTitle:meta.title,videos:items.filter(x=>x.type==="video"&&(!selected||selected.includes(x.resourceId))),audios:items.filter(x=>x.type==="audio")};`;
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
    await rt.runFFmpeg(galleryCropArgs(clip, output), true);
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

function Panel(props) {
  hostUseSdk(props.sdk);
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
  const run = async (method: string, args: unknown[], write = false) => {
    // method names below are fixed implementation constants; values always use JSON encoding.
    const response = await sdk.runScript({
      summary: "Use local media workspace",
      allowCommit: write,
      script: "return await selects." + method + "(..." + JSON.stringify(args) + ");",
    });
    if (response.isError) throw new Error(response.output || "Local SDK operation failed.");
    // A clipped report has no result. Every read returning data rejects that case below.
    return response.result;
  };
  const environment = await run("files.environment", []);
  if (!environment || typeof environment.platform !== "string" || !environment.homedir)
    throw new Error("Update Selects to use this plugin's local media workspace.");
  const paths = panelLocalPaths(environment.platform);
  const CHUNK_BYTES = 48 * 1024;
  const readRange = async (path: string, offset: number, length: number) => {
    const parts: Uint8Array[] = [];
    let total = 0;
    while (total < length) {
      const result = await run("files.readRange", [{ path, offset: offset + total, length: Math.min(CHUNK_BYTES, length - total) }]);
      if (!result || typeof result.base64 !== "string" || !Number.isInteger(result.bytesRead)) throw new Error("The file read returned an incomplete result.");
      const bytes = Uint8Array.from(atob(result.base64), (character) => character.charCodeAt(0));
      if (bytes.length !== result.bytesRead) throw new Error("The file read returned invalid bytes.");
      parts.push(bytes); total += bytes.length;
      if (bytes.length < Math.min(CHUNK_BYTES, length - (total - bytes.length))) break;
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
    readdir: (path: string) => run("files.readdir", [path]),
    readRange,
    async readFile(path: string, encoding?: string) {
      const stat = await run("files.stat", [path]);
      if (!stat || !Number.isSafeInteger(stat.size) || stat.size < 0) throw new Error("The file is unavailable.");
      const bytes = await readRange(path, 0, stat.size);
      if (bytes.length !== stat.size) throw new Error("The file changed while it was being read.");
      if (encoding !== undefined && encoding !== "utf8") throw new Error("Only utf8 text encoding is supported.");
      return encoding === "utf8" ? new TextDecoder().decode(bytes) : bytes;
    },
    async writeFile(path: string, data: string | Uint8Array, encoding?: string) {
      if (encoding !== undefined && encoding !== "utf8") throw new Error("Only utf8 text encoding is supported.");
      const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
      for (let offset = 0; offset < bytes.length || offset === 0; offset += CHUNK_BYTES) {
        const chunk = bytes.subarray(offset, offset + CHUNK_BYTES);
        let binary = "";
        for (const byte of chunk) binary += String.fromCharCode(byte);
        const result = await run("files.writeChunk", [{ path, offset, base64: btoa(binary) }], true);
        if (result?.bytesWritten !== chunk.length) throw new Error("The file write returned an incomplete result. Check the file before retrying.");
      }
    },
    mkdir: (path: string, options?: { recursive?: boolean }) => run("files.mkdir", [path, options ?? {}], true),
    rm: (path: string, options?: { recursive?: boolean; force?: boolean }) => run("files.remove", [path, options ?? {}], true),
    removeFile: ({ filePath }: { filePath: string }) => run("files.remove", [filePath, { force: true }], true),
    rename: (from: string, to: string) => run("files.rename", [from, to], true),
    copyFile: (from: string, to: string) => run("files.copy", [from, to], true),
    downloadFile: (url: string, path: string) => run("files.download", [url, path], true),
    pathToLocalURL: (path: string) => run("files.localUrl", [path]),
    localURLToPath: (url: string) => run("files.pathFromLocalUrl", [url]),
  };
  const activeJobs = new Set<string>();
  let disposed = false;
  const cancel = async (jobId: string) => {
    const response = await sdk.runScript({ summary: "Cancel local media processing", allowCommit: true, script: "await selects.media.job(" + JSON.stringify(jobId) + ").cancel();" });
    if (response.isError) throw new Error(response.output || "Media cancellation failed.");
  };
  const process = async (executable: "FFmpeg" | "FFprobe", args: string[], _withoutLog?: boolean, signal?: AbortSignal, onStdout?: (text: string) => void, onStderr?: (text: string) => void) => {
    if (disposed || signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const started = await run("media.start" + executable, [{ args }], true);
    if (!started?.jobId) throw new Error("The media process did not return a job id.");
    const jobId = started.jobId;
    activeJobs.add(jobId);
    let cancellation: Promise<void> | null = null;
    const abort = () => { cancellation ??= cancel(jobId); void cancellation.catch(() => {}); };
    signal?.addEventListener("abort", abort, { once: true });
    if (disposed || signal?.aborted) abort();
    let cursor = 0, stdout = "", stderr = "";
    try {
      while (true) {
        if (cancellation) await cancellation;
        const status = await sdk.call("getLocalMediaJobStatus", jobId, { cursor });
        if (!status || !Array.isArray(status.events)) throw new Error("Media status is unavailable.");
        if (status.truncated) throw new Error("Media output was truncated; no incomplete result was accepted.");
        for (const event of status.events) {
          if (event.stream === "stdout") { stdout += event.text; onStdout?.(event.text); }
          else { stderr += event.text; onStderr?.(event.text); }
        }
        cursor = status.nextCursor;
        if (status.state !== "running" && status.events.length === 0) {
          if (status.state === "cancelled" || signal?.aborted) throw new DOMException("Aborted", "AbortError");
          if (status.state === "failed") throw new Error(status.error || stderr || "Media processing failed.");
          return { stdout, stderr };
        }
        if (status.state === "running") await new Promise((resolve) => setTimeout(resolve, 150));
      }
    } catch (error) {
      await cancel(jobId).catch(() => {});
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
      runFFprobe: (args: string[], quiet?: boolean, signal?: AbortSignal) => process("FFprobe", args, quiet, signal),
    },
    dialogs: {
      pickFilePath: (filters?: Array<{ name: string; extensions: string[] }>) => run("editor.pickFile", [{ filters }]),
      pickDirectoryPath: () => run("editor.pickDirectory", []),
      pickSavePath: (defaultPath: string) => run("editor.pickSavePath", [{ defaultPath }]),
    },
    dispose() { disposed = true; for (const jobId of activeJobs) void cancel(jobId).catch(() => {}); },
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
    React.useEffect(() => {
      let active = true;
      let client: any;
      createPanelLocalClient(props.sdk).then(value => {
        client = {...props.sdk, ...value};
        if (!active) { value.dispose(); return; }
        panelLocalClients.set(props.sdk, client);
        setState({sdk: props.sdk});
      }).catch(error => { if (active) setState({error: String(error?.message || error)}); });
      return () => {
        active = false;
        if (client) {
          if (panelLocalClients.get(props.sdk) === client) panelLocalClients.delete(props.sdk);
          client.dispose();
        }
      };
    }, [props.sdk]);
    if (state?.error) return React.createElement("div", {role: "alert"}, state.error);
    if (state?.sdk !== props.sdk) return React.createElement("div", {role: "status"}, "Connecting to Selects…");
    return React.createElement(Component, props);
  };
}

export default withPanelLocalClient(Panel);
// local-sdk:end
