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
const TITLE_GRAPHIC = 'import {AbsoluteFill} from "remotion"; export default function Title({data}) { return <AbsoluteFill style={{backgroundColor:"#000",alignItems:"center",justifyContent:"center"}}><div style={{color:"#fff",fontFamily:"Futura, Avenir Next, sans-serif",fontSize:"2.9vh",fontWeight:700,textAlign:"center",whiteSpace:"nowrap",transform:"translateY(-0.35vh)"}}>{data.text}</div></AbsoluteFill>; }';

function encodeManifest(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

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

function fixedAudioOf(audios) {
  return (audios || []).find((item) => item.path?.replace(/\\/g, "/").endsWith(`/gongju-gallery/assets/${MUSIC_NAME}`))?.resourceId || null;
}

// Crops the chosen clips to 3:4, imports them (and the soundtrack, once) and
// builds the new draft. Resolves the new draft's id and the soundtrack's id.
async function buildGallery(sdk, { projectId, language, chosen, audios, fixedAudioId }) {
  const fps = 30000 / 1001;
  const manifest = { audioCandidates: audios.filter((item) => item.name === MUSIC_NAME && item.path).map((item) => ({resourceId:item.resourceId,path:item.path})), clips: chosen.map((item, index) => {
    const frames = CUTS[index + 1] - CUTS[index];
    const seconds = frames / fps;
    const middle = (item.durationSeconds - seconds) / 2;
    return { path: item.path, startSeconds: Math.max(0, Math.min(item.durationSeconds - seconds - 0.1, middle)), frames };
  }) };

  const shell = await sdk.runShell({
    summary: "Make portrait gallery shots",
    command: `python3 "$SELECTS_USER_SKILLS_ROOT/gongju-gallery/crop.py" ${encodeManifest(manifest)}`,
    timeoutMs: 300000,
  });
  if (shell.isError || shell.exitCode !== 0) throw new Error(shell.stderr || shell.output || "Portrait clips failed");
  const created = JSON.parse(shell.stdout.trim().split("\n").pop());
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
      const { draftId } = await buildGallery(sdk, { projectId, language: context.language, chosen, audios, fixedAudioId: fixedAudioOf(audios) });
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
      const { audioId } = await buildGallery(sdk, { projectId: context.projectId, language: context.language, chosen, audios, fixedAudioId });
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
