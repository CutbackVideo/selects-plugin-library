// @name Travel Beat Vlog
// @name:de Travel Beat Vlog
// @name:en Travel Beat Vlog
// @name:es Travel Beat Vlog
// @name:fr Travel Beat Vlog
// @name:it Travel Beat Vlog
// @name:ja Travel Beat Vlog
// @name:ko Travel Beat Vlog
// @name:pt Travel Beat Vlog
// @name:tr Travel Beat Vlog
// @name:zh Travel Beat Vlog
// @collection visual-highlights
// @icon video
import React from 'react';

const VIDEO_SLOTS=Array.from({length:26},(_,i)=>'V'+(i+1));
const INVENTORY=`const p=selects.project(PROJECT_ID);const resources=await p.resources();const types=new Map(resources.map(r=>[r.resourceId,r.type]));const nodes=[];const walk=tree=>{for(const n of tree||[])n.type==='dir'?walk(n.children):nodes.push(n)};const view=await p.sourceFiles();if('fileTree' in view)walk(view.fileTree);else if('folders' in view)for(const folder of view.folders){const detail=await p.sourceFiles({folder:folder.name});if('fileTree' in detail)walk(detail.fileTree)}return nodes.filter(n=>n.path&&types.has(n.resourceId)).map(n=>({resourceId:n.resourceId,type:types.get(n.resourceId),name:n.name,path:n.path,width:n.frameSize?.width??null,height:n.frameSize?.height??null,duration:n.durationSeconds??null}));`;
const encode=value=>{
 const bytes=new TextEncoder().encode(JSON.stringify(value));let binary='';
 for(const b of bytes)binary+=String.fromCharCode(b);
 return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
};
// Right after the app opens a Project its file list can briefly fail to read, so try once more.
async function inventory(sdk,projectId,summary){
 const run=()=>sdk.runScript({script:INVENTORY.replace('PROJECT_ID',JSON.stringify(projectId)),summary,allowCommit:false});
 let r=await run();
 if(r.isError||!Array.isArray(r.result)){await new Promise(done=>setTimeout(done,1500));r=await run();}
 if(r.isError||!Array.isArray(r.result))throw Error('Could not read the Project files. Wait a moment and load again.');
 return r.result;
}
// Selects puts no Node.js on the panel shell's PATH, so the plugin's runtime.sh fetches a
// pinned one into ~/.selects/plugin-data/_runtime on first use (shared by all plugins)
// and prints its path. Resolved once per Panel; later runs reuse it. macOS only: runtime.sh
// is a POSIX script, and buildTravelVlog refuses Windows before it gets here.
// mac-only:start
const BUILDER=' "$SELECTS_USER_SKILLS_ROOT/travel-beat-vlog/build-script.mjs" ';
let nodePath=null;
const shellQuote=value=>"'"+String(value).replace(/'/g,"'\\''")+"'";
async function runtimeNode(sdk,say=()=>{}){
 if(nodePath)return nodePath;
 say('Preparing (first run only)…');
 const r=await sdk.runShell({summary:'Prepare Node.js (first run only)',command:'sh "$SELECTS_USER_SKILLS_ROOT/travel-beat-vlog/runtime.sh" node',timeoutMs:290000,maxOutputBytes:8000});
 const found=String(r.stdout||'').split('\n').map(line=>line.trim()).filter(Boolean).pop();
 if(r.isError||r.exitCode!==0||!found){
  const said=String(r.stderr||r.output||'').trim().split('\n').filter(Boolean).pop()||'';
  const message=r.exitCode===3?'Travel Beat Vlog needs the internet once to download Node.js; check the connection, then try again.'
   :r.exitCode===4?'The Node.js download did not match its pinned checksum; try again later.'
   :'Travel Beat Vlog could not prepare Node.js'+(said?': '+said:'.');
  throw Object.assign(Error(message),{publicMessage:message});
 }
 nodePath=found;
 return found;
}
async function builder(sdk,request,summary,maxOutputBytes=49152,timeoutMs=60000){
 const node=await runtimeNode(sdk);
 const r=await sdk.runShell({summary,command:shellQuote(node)+BUILDER+encode(request),timeoutMs,maxOutputBytes:Math.min(maxOutputBytes,49152)});
 if(r.isError||r.exitCode!==0||!r.stdout)throw Error(r.stderr||r.output||summary+' failed.');
 return r.stdout;
}
// mac-only:end
async function script(sdk,source,summary,allowCommit,timeoutSeconds=30){
 const r=await sdk.runScript({script:source,summary,allowCommit,timeoutSeconds});
 if(r.isError)throw Error(r.output||summary+' failed.');
 return r.result;
}

// av-host:start
// Host I/O for a style-app panel: plain JS and self-contained (no app names, no UI text), so it can move to a shared
// kit file and tests can run it in node:vm. Guarded access to the host's renderer services (window.parent.__DI__,
// documented as internal, so every member is checked before use), the platform, path joins, file reads and removal,
// the install and data folders, and the host's bundled ffmpeg (Runtime.runFFmpeg / runFFprobe: argv arrays, no shell,
// nothing for the user to install). Paths are built with FileSystem.join and never pass through a console; generated
// file names are ASCII. The one shell call is the SELECTS_USER_SKILLS_ROOT fallback in hostSkillsRoot (cmd.exe on
// Windows, the login shell on macOS). Errors carry `code`: 'host-missing' (with `member`, a service method this Selects
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
// The skills folder named by SELECTS_USER_SKILLS_ROOT, through the host shell, or null. Windows runs cmd.exe, where
// `echo(` prints an empty line for an unset variable (a plain `echo` would print "ECHO is on."); macOS runs the login
// shell. Only the variable's value comes back; no path goes in.
async function hostSkillsRoot(sdk) {
  if (typeof sdk?.runShell !== "function") return null;
  const command = hostIsWindows() ? "echo(%SELECTS_USER_SKILLS_ROOT%" : 'echo "$SELECTS_USER_SKILLS_ROOT"';
  try {
    const r = await sdk.runShell({ summary: "Locate the plugin folder", command, timeoutMs: 10000 });
    const out = String(r?.stdout || "").split(/\r?\n/).map((x) => x.trim()).find(Boolean) || "";
    return !out || /[%$]/.test(out) || /^ECHO is/i.test(out) ? null : out;
  } catch { return null; }
}
// The plugin's install folder and its data folder. The install folder is the host's default skills folder (the home
// folder joined with .selects, skills and <id>) when it holds `marker` (a file every install has); only when it does
// not does SELECTS_USER_SKILLS_ROOT decide. The data folder (<home>/.selects/plugin-data/<id>) is created when missing;
// null when this host cannot make it (callers then avoid temporary files). Throws 'not-found' without an install folder.
async function hostRoots(sdk, id, marker) {
  const fs = hostApi("FileSystem", "join", "homedir", "existsSync");
  const holds = (dir) => { try { return !!dir && (!fs || !!fs.existsSync(fs.join(dir, marker))); } catch { return false; } };
  let plugin = null;
  try { if (fs) { const dir = String(fs.join(fs.homedir(), ".selects", "skills", id)); if (holds(dir)) plugin = dir; } } catch { plugin = null; }
  if (!plugin) {
    const root = await hostSkillsRoot(sdk);
    const dir = root ? hostJoin(root, id) : null;
    if (holds(dir)) plugin = dir;
  }
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
// Host paths compare equal across separators and Unicode forms, and on Windows across case.
const hostPathKey=p=>{const s=String(p||'').normalize('NFC').replace(/\\/g,'/');return hostIsWindows()?s.toLowerCase():s;};
// Files the plugin wrote itself (the hero cutout, the song section) live under <home>/.selects/plugin-data/.
const pluginOwned=p=>/[\\/]\.selects[\\/]plugin-data[\\/]/.test(String(p||''));
// The song engine still runs on Node.js through runtime.sh, a POSIX script.
const MAC_ONLY='Travel Beat Vlog is available on macOS for now.';
// The cutout is Apple Vision (osascript): on Windows the title sits over the whole hero photo.
const SUBJECT_MAC_ONLY='Putting the subject in front of the title is available on macOS for now; here the title sits over the hero photo.';

// The editor's existing Image placement path is not exposed by the public panel SDK
// (overlayResource rejects Image resources). Same narrow bridge as Four Photo Reveal:
// validate every selected path and reject unknown hosts. No client code is changed.
// `knownLibraryId` is the library a template run was handed (context.template.libraryId):
// that run goes on out of sight, after the app may have moved to another page.
export async function prepareNativeImages(app,projectId,photos,knownLibraryId=null){
 let libraryId=knownLibraryId;
 if(!libraryId){
  const match=app.location.pathname.match(/libraries\/([^/]+)\/projects\/([^/]+)/);
  if(!match||match[2]!==projectId)throw Error('Open the selected Project before creating the Draft.');
  libraryId=match[1];
 }
 const di=app.__DI__;
 if(typeof di?.ProjectRepository?.findById!=='function'||typeof di?.ResourceRepository?.findById!=='function'||typeof di?.SequenceRepository?.findById!=='function'||typeof di?.TimelineMutation?.run!=='function')throw Error('This Selects version does not support original Image placement from this plugin.');
 const project=await di.ProjectRepository.findById(libraryId,projectId);
 if(!project)throw Error('The selected Project was not found.');
 const members=await Promise.all(project.getResources().map(id=>di.ResourceRepository.findById(libraryId,id)));
 const sources=[];
 for(const photo of photos){
  const matches=members.filter(r=>r?.getType()==='Image'&&(r.getMedia()?.originalPath??r.getMedia()?.path)===photo.path);
  if(matches.length!==1)throw Error('A selected Image is missing or ambiguous in the Project: '+photo.name);
  const resource=matches[0],media=resource.getMedia(),analyzed=await resource.getAnalyzedSequence();
  const main=analyzed?.getMainTrack(),primary=main?.getClips().find(clip=>!clip.isGap());
  if(!analyzed||!main||!primary||!Number.isSafeInteger(media?.width)||!Number.isSafeInteger(media?.height))throw Error('A selected Image is not ready for editing: '+photo.name);
  sources.push({resource,analyzed,main,primary,width:media.width,height:media.height});
 }
 return {di,libraryId,projectId,sources};
}


// Places each item (a prepared Image source over [startFrame, endFrame)) as its own
// clip, holding stills past their 5 s source with sourceDuration (see Photo Grid Reveal).
export async function placeNativeImages(prepared,draftId,plan,items,label){
 const {di,libraryId,projectId,sources}=prepared;
 const project=await di.ProjectRepository.findById(libraryId,projectId);
 if(!project)throw Error('The selected Project is unavailable.');
 if(!project.getEditedSequences().includes(draftId))throw Error('The new Draft is not owned by the selected Project.');
 const sequence=await di.SequenceRepository.findById(libraryId,draftId);
 if(!sequence||sequence.getFrameRate()!==plan.fps||sequence.getDuration('resolved')!==plan.durationFrames)throw Error('The Draft frame grid differs from the reference.');
 const placements=[];
 const outcome=await di.TimelineMutation.run(sequence,'travel-beat-vlog:'+label,current=>{
  const candidate=current.clone();
  for(const item of items){
   const source=sources[item.source];
   const ids=candidate.place({working:source.analyzed,primaryTrack:source.main,primaryOffset:0,primaryClipId:source.primary.getId()},item.startFrame,{kind:'overlay'});
   if(ids.length!==1)throw Error('Image placement did not create one independent clip.');
   const position=candidate.getClipPositionById(ids[0]),length=item.endFrame-item.startFrame;
   if(!position||position.resolvedOffset!==item.startFrame)throw Error('Image placement moved from the planned frame.');
   const delta=length-position.clip.getDuration();
   if(delta!==0){
    const result=candidate.trimClipBoundary({trackId:position.trackId,clipId:ids[0],position:'end',delta,sourceDuration:Math.max(length,position.clip.getDuration())});
    if(result.trimmedClipPosition?.clip.getDuration()!==length)throw Error('Image could not be held for the planned interval.');
   }
   const final=candidate.getClipPositionById(ids[0]);
   placements.push({clipId:ids[0],trackId:final.trackId,startFrame:item.startFrame,endFrame:item.endFrame});
  }
  const overflow=candidate.getDuration('resolved')-plan.durationFrames;
  if(overflow>0)candidate.slice([{startFrame:plan.durationFrames,endFrame:plan.durationFrames+overflow}],{coordinate:'resolved'});
  if(candidate.getDuration('resolved')!==plan.durationFrames)throw Error('Image placement changed the Draft duration.');
  return candidate;
 });
 if(outcome.status!=='committed'||placements.length!==items.length)throw Error('Original Image placement was not confirmed.');
 return {placements,photos:sources.map(s=>({width:s.width,height:s.height}))};
}

// Registers a file the plugin wrote (hero cutout, song section) in the Project once, reusing an earlier import by path.
async function ensureImported(sdk,projectId,file,type,summary){
 const key=hostPathKey(file),same=r=>hostPathKey(r.path)===key&&r.type===type;
 let rows=await inventory(sdk,projectId,'Find '+summary);
 if(!rows.some(same)){
  await script(sdk,`return await selects.project(${JSON.stringify(projectId)}).importFiles({paths:${JSON.stringify([file])}});`,'Import '+summary,true);
  rows=await inventory(sdk,projectId,'Confirm '+summary);
 }
 const m=rows.find(same);
 if(!m)throw Error('The '+summary+' is not ready in the Project yet. Try again in a moment.');
 return m;
}

// Builds the vlog from 26 chosen videos (by slot), a hero photo and the user's song, all inventory rows:
// the panel's Create Draft and a template run share it. Resolves to the saved Draft.
async function buildTravelVlog(sdk,{projectId,chosen,heroPhoto,song,cuts,title,color,cutoutMode,grade,name,say,stillCurrent,libraryId=null,onDraft=_id=>{}}){
 // Checked before anything is read or made, so Windows never gets a partial Draft.
 if(hostIsWindows())throw templateIssue(MAC_ONLY);
 // Apple Vision cuts the hero subject out; without it the title sits over the whole hero photo.
 const cutout=!hostIsWindows();
 await runtimeNode(sdk,say);
 say('Finding the beat of your song…');
 const fit=JSON.parse(await builder(sdk,{mode:'song',song:song.path,cuts},'Fit the vlog to the song',49152,240000));
 const timing=fit.timing;
 const needs=JSON.parse(await builder(sdk,{mode:'needs',timing},'Read slot lengths',15000));
 for(const s of VIDEO_SLOTS){const d=chosen[s].duration;if(d!=null&&d+1e-3<needs[s])throw Error(s+' ('+chosen[s].name+') is '+d.toFixed(2)+' s; it needs at least '+needs[s].toFixed(2)+' s.');}
 let cutRow=null;
 if(cutout){
  say('Cutting out the hero subject…');
  const cut=JSON.parse(await builder(sdk,{mode:'cutout',photo:heroPhoto.path,cutoutMode},'Cut out hero subject',15000,180000));
  cutRow=await ensureImported(sdk,projectId,cut.path,'Image','hero cutout');
 }
 const songRow=await ensureImported(sdk,projectId,fit.audio,'Audio','song section');
 say('Matching colour to the reference…');
 // Measured before the Draft exists (reference 30 fps timing; seconds are rate-free), so a failure leaves no partial Draft.
 const ref=JSON.parse(await builder(sdk,{mode:'plan',fps:30,timing},'Read travel vlog plan',30000));
 const clips=ref.clips.filter(c=>!c.image).map(c=>({key:c.slot+'@'+c.index,slot:c.slot,path:chosen[c.slot].path,inSeconds:c.inSeconds,seconds:(c.endFrame-c.startFrame)/30}));
 clips.push({key:'H',slot:'H',path:heroPhoto.path,inSeconds:0,seconds:0.1});
 const grades=JSON.parse(await builder(sdk,{mode:'grade',clips,strength:grade},'Measure colour',49152,240000));
 const prepared=await prepareNativeImages(window.parent,projectId,cutRow?[{...heroPhoto},{...cutRow,name:'hero cutout'}]:[{...heroPhoto}],libraryId);
 if(!stillCurrent())throw Error('The Project changed. Start again in the selected Project.');
 say('Creating the Draft…');
 const seed=await script(sdk,`const p=selects.project(${JSON.stringify(projectId)});const d=await p.createDraft({name:${JSON.stringify(name.trim()||'Travel beat vlog')}});await d.insertGap({seconds:${timing.durationFrames}/30});await d.setFrameSize({width:1080,height:1920});const m=await d.meta();if(m.durationFrames!==Math.round(${timing.durationFrames}*m.fps/30)||m.frameSize?.width!==1080||m.frameSize?.height!==1920)throw Error('Draft frame grid differs from the reference.');const saved=await d.commitAll('Start Travel Beat Vlog Draft');return {draftId:saved.createdDraftId,fps:m.fps};`,'Create travel vlog Draft',true);
 const {draftId,fps}=seed;onDraft(draftId);
 const plan=JSON.parse(await builder(sdk,{mode:'plan',fps,timing},'Read travel vlog plan',30000));
 say('Placing the hero photo…');
 const heroClip=plan.clips.find(c=>c.image);
 const placed=await placeNativeImages(prepared,draftId,plan,[{source:0,startFrame:heroClip.startFrame,endFrame:heroClip.endFrame}],'hero');
 say('Placing 35 video clips, grids, title and your song…');
 const request={mode:'finish',projectId,draftId,fps,videos:Object.fromEntries(VIDEO_SLOTS.map(s=>[s,{resourceId:chosen[s].resourceId,width:chosen[s].width,height:chosen[s].height}])),hero:{resourceId:heroPhoto.resourceId,width:placed.photos[0].width,height:placed.photos[0].height},placements:placed.placements,grades,songResourceId:songRow.resourceId,title:{text:title,color},timing};
 const fin=await script(sdk,await builder(sdk,request,'Build travel vlog finishing step',400000),'Finish travel vlog Draft',true,120);
 if(fin?.status!=='saved')throw Error((fin?.message||'Could not save the Draft.')+(fin?.stage?' ('+fin.stage+')':''));
 if(!cutout)return {draftId};
 say('Putting the hero subject in front of the title…');
 const top=await placeNativeImages(prepared,draftId,plan,[{source:1,startFrame:plan.title.startFrame,endFrame:plan.title.endFrame}],'cutout');
 const fin2=await script(sdk,await builder(sdk,{mode:'cutoutFinish',fps,draftId,cutout:top.placements[0],hero:request.hero,grade:grades.H||null,timing},'Build cutout step',100000),'Finish hero cutout',true,60);
 if(fin2?.status!=='saved')throw Error(fin2?.message||'Could not save the hero cutout.');
 return {draftId};
}

// A template run (Clip highlights): the app hands over the hero photo, the three
// long shots (under the two grids and before the ending), the other 23 clips in the
// order picked, and the song; everything else is this panel's own default.
const LONG_SLOTS=['V12','V17','V22'],SHORT_SLOTS=VIDEO_SLOTS.filter(s=>!LONG_SLOTS.includes(s));
const TEMPLATE_DEFAULTS={title:'TRAVEL',color:'#F4C711',cutoutMode:'person',grade:0.7,name:'Travel beat vlog'};
const TEMPLATE_FAILED='Travel Beat Vlog could not make the timeline; try again.';
function templateIssue(message){return Object.assign(Error(message),{publicMessage:message});}
function templateMessage(error){
 if(error?.publicMessage)return error.publicMessage;
 const said=String(error?.message||'');
 if(/^This Selects version does not support/.test(said))return 'Update Selects to use Travel Beat Vlog.';
 if(/needs at least/.test(said))return said.replace(/^V\d+ \((.+?)\) is/,'$1 is');
 if(/song is too short|song file is missing/i.test(said))return said;
 if(/^No person found/.test(said))return 'Travel Beat Vlog found no people in the hero photo; pick a photo with people, then try again.';
 if(/^No subject found/.test(said))return 'Travel Beat Vlog found no main subject in the hero photo; pick another photo, then try again.';
 if(/cutout|Vision|Cannot read the photo/i.test(said))return 'Travel Beat Vlog could not cut out the hero photo; try again.';
 return TEMPLATE_FAILED;
}
// The app hands a template its own Resource ids, but every run_script read
// (resources(), clips()) speaks the short ids the script SDK gives out (r0, r1…).
// The app's list (sdk.call) and the script's list are the Project's Resources in
// the same order, so they pair up row by row; names and types are compared so a
// list that changed in between is refused rather than mismatched.
async function scriptResourceIds(sdk, projectId) {
  const [app, run] = await Promise.all([
    sdk.call("listProjectResources", projectId),
    sdk.runScript({ summary: "Match picked files", allowCommit: false, script: `return (await selects.project(${JSON.stringify(projectId)}).resources()).map(r=>({id:r.resourceId,name:r.name,type:r.type}));` }),
  ]);
  const rows = run?.result;
  if (!Array.isArray(app) || run.isError || !Array.isArray(rows) || app.length !== rows.length || app.some((a, i) => a.name !== rows[i].name || a.type !== rows[i].type)) throw new Error(run?.output || "Could not match the picked files to this project.");
  return new Map(app.map((a, i) => [a.resourceId, rows[i].id]));
}
async function templateMedia(sdk,projectId,inputs){
 const hero=(inputs?.hero||[]).filter(x=>x?.kind==='image'&&x.resourceId);
 const long=(inputs?.long||[]).filter(x=>x?.kind==='video'&&x.resourceId);
 const clips=(inputs?.clips||[]).filter(x=>x?.kind==='video'&&x.resourceId);
 const song=(inputs?.song||[]).filter(x=>x?.kind==='audio'&&x.resourceId);
 if(hero.length!==1)throw templateIssue('Pick one hero photo, then try again.');
 if(long.length!==LONG_SLOTS.length)throw templateIssue('Pick three long shots, then try again.');
 if(clips.length!==SHORT_SLOTS.length)throw templateIssue('Pick 23 clips, then try again.');
 if(song.length!==1)throw templateIssue('Pick one song, then try again.');
 const rows=await inventory(sdk,projectId,'List project media');
 const ids=await scriptResourceIds(sdk,projectId);
 const row=(pick,type)=>{
  const id=ids.get(pick.resourceId)??pick.resourceId;
  const m=rows.find(r=>r.resourceId===id&&r.type===type);
  if(!m)throw templateIssue((pick.name||'A picked file')+' is no longer in this project.');
  if(type==='Video'&&(!m.width||!m.height))throw templateIssue(m.name+' is still being read; wait a moment, then try again.');
  return m;
 };
 const chosen={};
 LONG_SLOTS.forEach((s,i)=>{chosen[s]=row(long[i],'Video');});
 SHORT_SLOTS.forEach((s,i)=>{chosen[s]=row(clips[i],'Video');});
 return {chosen,heroPhoto:row(hero[0],'Image'),song:row(song[0],'Audio')};
}
// Nobody sees this frame, so it shows one status line. It starts once per run id
// and reports once, unless a newer run replaced it.
function TravelTemplateRun({sdk,context}){
 const runId=context.template?.runId,[status,setStatus]=React.useState('Making your travel vlog…');
 const started=React.useRef(null),alive=React.useRef(true),latest=React.useRef(context);latest.current=context;
 React.useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 React.useEffect(()=>{
  if(!runId||started.current===runId)return;started.current=runId;
  const live=()=>alive.current&&latest.current.template?.runId===runId;
  let ended=false,draftId=null;
  const finish=result=>{if(ended)return;ended=true;if(!live())return;try{sdk.finishTemplate(result);}catch{}};
  const say=text=>{if(live())setStatus(text);};
  const projectId=context.projectId,template=context.template;
  (async()=>{
   try{
    if(!projectId)throw templateIssue('Open a project, then try again.');
    say('Finding your clips…');
    const {chosen,heroPhoto,song}=await templateMedia(sdk,projectId,template?.inputs);
    const cutoutMode=template?.options?.subject==='foreground'?'foreground':TEMPLATE_DEFAULTS.cutoutMode;
    const cuts=template?.options?.cuts==='reference'?'reference':'hits';
    const done=await buildTravelVlog(sdk,{projectId,chosen,heroPhoto,song,cuts,...TEMPLATE_DEFAULTS,cutoutMode,say,stillCurrent:live,libraryId:template?.libraryId||null,onDraft:id=>{draftId=id;}});
    finish({sequenceId:done.draftId});
   }catch(error){
    console.warn('[travel-beat-vlog] template run failed:',error?.message||String(error),{draftId});
    finish({error:draftId?'Travel Beat Vlog stopped partway; the unfinished timeline "'+TEMPLATE_DEFAULTS.name+'" may need removing.':templateMessage(error)});
   }finally{finish({error:TEMPLATE_FAILED});}
  })();
 },[runId]);
 return <p role="status" style={{margin:0,fontSize:12}}>{status}</p>;
}

export default function Panel(props){return props.context.template?<TravelTemplateRun {...props}/>:<TravelPanel {...props}/>;}
// The manual panel asks for the same things, in the same groups, as the template page:
// hero photo, three long shots, 23 clips, the song, and the template's two choices.
function TravelPanel({sdk,context,ui}){
 const [media,setMedia]=React.useState([]),[loadedProject,setLoadedProject]=React.useState(null);
 const [hero,setHero]=React.useState(''),[long,setLong]=React.useState(['','','']),[clips,setClips]=React.useState(Array(23).fill('')),[song,setSong]=React.useState('');
 const [cutoutMode,setCutoutMode]=React.useState('person'),[cuts,setCuts]=React.useState('hits');
 const [title,setTitle]=React.useState('TRAVEL'),[color,setColor]=React.useState('#F4C711'),[grade,setGrade]=React.useState(0.7),[name,setName]=React.useState('Travel beat vlog');
 const [busy,setBusy]=React.useState(false),[status,setStatus]=React.useState(''),[saved,setSaved]=React.useState(null);
 const running=React.useRef(false),currentProject=React.useRef(context.projectId);currentProject.current=context.projectId;
 React.useEffect(()=>{setMedia([]);setHero('');setLong(['','','']);setClips(Array(23).fill(''));setSong('');setLoadedProject(null);setSaved(null);setStatus('');},[context.projectId]);
 // Files the plugin created itself (the hero cutout, the song section) are not user media.
 const own=m=>pluginOwned(m.path);
 const of=type=>media.filter(m=>m.type===type&&!own(m));
 async function load(){
  if(!context.projectId||running.current)return;running.current=true;setBusy(true);setStatus('Loading project media…');
  try{
   const projectId=context.projectId,rows=await inventory(sdk,projectId,'List project media');
   if(currentProject.current!==projectId)return;
   setMedia(rows);setLoadedProject(projectId);
   const mine=r=>pluginOwned(r.path),v=rows.filter(r=>r.type==='Video'&&!mine(r)),im=rows.filter(r=>r.type==='Image'&&!mine(r)),au=rows.filter(r=>r.type==='Audio'&&!mine(r));
   setLong(old=>old.map((x,i)=>x||v[i]?.resourceId||''));setClips(old=>old.map((x,i)=>x||v[3+i]?.resourceId||''));
   setHero(old=>old||im[0]?.resourceId||'');setSong(old=>old||au[0]?.resourceId||'');
   setStatus(v.length>=26&&im.length&&au.length?'Check the hero photo, the long shots, the 23 clips and the song.':'The format needs 1 hero photo, 26 videos and 1 song; this Project has '+im.length+' photos, '+v.length+' videos and '+au.length+' songs.');
  }catch(error){setStatus(String(error?.message||error));}finally{running.current=false;setBusy(false);}
 }
 async function create(){
  const projectId=context.projectId;
  if(running.current||!projectId||loadedProject!==projectId)return;
  running.current=true;setBusy(true);setStatus('Checking media…');
  try{
   const pick=(id,type,what)=>{const m=media.filter(x=>x.resourceId===id);if(m.length!==1)throw Error('Choose '+what+'.');if(m[0].type!==type)throw Error(m[0].name+' is not '+(type==='Video'?'a video':type==='Image'?'a photo':'a song')+'.');return m[0];};
   const chosen={};
   LONG_SLOTS.forEach((s,i)=>{chosen[s]=pick(long[i],'Video','long shot '+(i+1));});
   SHORT_SLOTS.forEach((s,i)=>{chosen[s]=pick(clips[i],'Video','clip '+(i+1));});
   for(const m of Object.values(chosen))if(!m.width||!m.height)throw Error(m.name+' has no frame size yet; wait for the Project to finish reading it.');
   const {draftId}=await buildTravelVlog(sdk,{projectId,chosen,heroPhoto:pick(hero,'Image','a hero photo'),song:pick(song,'Audio','a song'),cuts,title,color,cutoutMode,grade,name,say:setStatus,stillCurrent:()=>currentProject.current===projectId});
   setSaved({draftId});setStatus('Saved. Every shot is its own clip with focus controls; the title text and colour are editable.');
  }catch(error){setStatus(String(error?.message||error));}finally{running.current=false;setBusy(false);}
 }
 const windows=hostIsWindows();
 const ready=!busy&&loadedProject===context.projectId;
 const opts=type=>of(type).map(m=>({value:m.resourceId,label:m.name}));
 const vOpts=opts('Video'),setAt=(setter,i)=>v=>setter(old=>old.map((x,j)=>j===i?v:x));
 return <ui.Stack gap={16}><ui.Section title="Travel Beat Vlog">
  <ui.Message>A travel beat vlog in 9:16 cut to your song: two fast montages on its drum hits, a hero photo with the title behind its subject, two 2×2 grids that fill on the beat, and a fade out.</ui.Message>
  {windows&&<ui.Message>{MAC_ONLY}</ui.Message>}
  {!context.projectId&&<ui.Message>Open a Project first.</ui.Message>}
  <ui.Button variant="secondary" onClick={load} disabled={!context.projectId||busy} busy={busy}>Load Project media</ui.Button>
  <ui.Select label="Hero photo" value={hero} onChange={setHero} options={opts('Image')} placeholder="Choose photo" disabled={!ready}/>
  {long.map((v,i)=><ui.Select key={'l'+i} label={'Long shot '+(i+1)} value={v} onChange={setAt(setLong,i)} options={vOpts} placeholder="Choose video" disabled={!ready}/>)}
  {clips.map((v,i)=><ui.Select key={'c'+i} label={'Clip '+(i+1)} value={v} onChange={setAt(setClips,i)} options={vOpts} placeholder="Choose video" disabled={!ready}/>)}
  <ui.Select label="Song" value={song} onChange={setSong} options={opts('Audio')} placeholder="Choose song" disabled={!ready}/>
  <ui.Select label="In front of the title" value={cutoutMode} onChange={setCutoutMode} options={[{value:'person',label:'People'},{value:'foreground',label:'Main subject'}]} disabled={busy||windows}/>
  {windows&&<ui.Message>{SUBJECT_MAC_ONLY}</ui.Message>}
  <ui.Select label="Cuts" value={cuts} onChange={setCuts} options={[{value:'hits',label:"Follow the song's hits"},{value:'reference',label:'Keep the original rhythm'}]} disabled={busy}/>
  <ui.TextField label="Title" value={title} onChange={setTitle} disabled={busy}/>
  <ui.TextField label="Title colour (#RRGGBB)" value={color} onChange={setColor} disabled={busy}/>
  <ui.Slider label="Match colour to the reference" min={0} max={1} step={0.05} value={grade} onChange={setGrade} disabled={busy}/>
  <ui.TextField label="Draft name" value={name} onChange={setName} disabled={busy}/>
  <ui.Actions><ui.Button variant="primary" onClick={create} disabled={windows||!ready||!hero||!song||long.some(v=>!v)||clips.some(v=>!v)||!/^#[0-9a-fA-F]{6}$/.test(color)} busy={busy}>{saved?'Create another Draft':'Create Draft'}</ui.Button></ui.Actions>
  {status&&<ui.Message>{status}</ui.Message>}
  {saved&&<ui.Button variant="secondary" onClick={()=>sdk.runScript({script:'return await selects.editor.openDraft('+JSON.stringify(saved.draftId)+');',summary:'Open saved Draft',allowCommit:false})}>Open saved Draft</ui.Button>}
 </ui.Section></ui.Stack>;
}
