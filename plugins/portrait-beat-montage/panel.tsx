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
const quote = (value) => "'" + String(value).replace(/'/g, "'\\''") + "'";
// The pipeline runs on the RVM runtime's Python (it already has numpy and Pillow).
const PYTHON = `S="$SELECTS_USER_SKILLS_ROOT/portrait-beat-montage"; P="$S/rvm/.local/venv/bin/python"; [ -x "$P" ] || P=python3;`;

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

async function pipeline(sdk, op, args, timeoutMs = 300000) {
  const reply = await sdk.runShell({
    summary: "Portrait montage: " + op,
    command: `${PYTHON} "$P" "$S/pipeline.py" ${op} ${quote(json(args))}`,
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

// Mattes and transitions run detached, three shot windows at a time, so they keep
// going if the panel closes or the project changes. The panel polls for finished
// units; reopening it resumes the same run (pipeline.py plan reuses it).
async function renderUnits(sdk, runId, keys, onProgress) {
  const dir = `"$HOME/.selects/plugin-data/${PLUGIN}/runs/${runId}"`;
  const started = await sdk.runShell({
    summary: "Portrait montage: start mattes and transitions",
    command: `${PYTHON} "$P" "$S/pipeline.py" spawn ${quote(json({ runId }))}`,
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

async function buildMontage(sdk, { projectId, language, files, audios, setStep, setProgress }) {
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
      const projectId = context.projectId;
      if (!projectId) throw new Error("Open a project, then try again.");
      const picks = (context.template.inputs?.clips || []).filter((pick) => pick?.resourceId);
      if (picks.length !== SHOTS) throw new Error(`Pick ${SHOTS} videos, then try again.`);
      const doctor = await pipeline(sdk, "doctor", {});
      if (!doctor.ready) throw new Error("Open Portrait Beat Montage from the Plugin list once to finish its setup.");
      const reply = await sdk.runScript({ summary: "Find montage media", script: mediaScript(projectId) });
      if (reply.isError || !reply.result) throw new Error("Couldn't read this project's files. Try again.");
      const byId = new Map((reply.result.videos || []).map((item) => [item.resourceId, item]));
      const files = picks.map((pick) => byId.get(pick.resourceId));
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

  const checkSetup = React.useCallback(() => pipeline(sdk, "doctor", {}, 60000)
    .then(setDoctor)
    .catch((error) => setDoctor({ ready: false, problems: [String(error.message || error)] })), [sdk]);
  React.useEffect(() => { checkSetup(); }, []);

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
    setSettingUp(true);
    setStatus(null);
    try {
      const reply = await sdk.runShell({
        summary: "Set up RVM for Portrait Beat Montage",
        command: `sh "$SELECTS_USER_SKILLS_ROOT/portrait-beat-montage/rvm/setup.sh" && sh "$SELECTS_USER_SKILLS_ROOT/portrait-beat-montage/rvm/run.sh" doctor`,
        timeoutMs: 900000,
        maxOutputBytes: 20000,
      });
      if (reply.isError || reply.exitCode !== 0) throw new Error(reply.stderr || reply.output || "Setup failed. See rvm/.local/setup.log in the plugin folder.");
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
    if (busy || chosen.length < SHOTS) return;
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
      <ui.Actions><ui.Button variant="primary" busy={busy} busyLabel={T.working} disabled={loading || !doctor?.ready || chosen.length < SHOTS} onClick={build}>{T.build}</ui.Button></ui.Actions>
      {status ? <ui.Message tone={status.type}>{status.message}</ui.Message> : null}
    </ui.Stack>
  </ui.Section>;
}
