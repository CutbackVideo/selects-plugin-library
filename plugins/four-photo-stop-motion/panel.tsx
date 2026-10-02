// @name Four Photo Stop Motion
// @name:de Four Photo Stop Motion
// @name:en Four Photo Stop Motion
// @name:es Four Photo Stop Motion
// @name:fr Four Photo Stop Motion
// @name:it Four Photo Stop Motion
// @name:ja Four Photo Stop Motion
// @name:ko Four Photo Stop Motion
// @name:pt Four Photo Stop Motion
// @name:tr Four Photo Stop Motion
// @name:zh Four Photo Stop Motion
// @collection visual-highlights
// @icon video
import React from 'react';

const SLOTS=4,LETTERS=['A','B','C','D'];

// --- Reference plan and finishing step -----------------------------------------
// Runs in the Panel itself, so the machine needs no Node.js. A `...Source` constant
// is a function kept as source text: run_script (or an effect) receives exactly the
// code written here. tests/four_photo_stop_motion.test.mjs loads everything between the two marker lines.
// @operation-start
// Measured frame by frame from the reference (30 fps, 347 frames, 1080x1440).
// Four photos A-D cycle. Intro: two fast rounds with a light blur. Then 32 black
// frames, then one photo per beat (0.631 s, ~95 BPM) whose first three frames are
// heavily blurred and shaken, then a dark radial gradient fades to black.
const INTRO=[['A',0,5],['B',5,12],['C',12,17],['D',17,24],['A',24,28],['B',28,36],['C',36,40],['D',40,48]];
const MAIN=[80,98,117,136,155,174,193,212,231,250,269,288,307,325];
export const PLAN_SLOTS=['A','B','C','D'];
const REF={fps:30,durationFrames:347,outroStart:325};
// Blur model fitted against the reference frames with the reference's own photos
// (canvas pixels, 1080 wide). A Gaussian fits best of the models tried (Gaussian,
// radial zoom, motion, ring, pyramid): sigma 5 for the intro and 10 for the beat hit,
// whose three frames sit at +0, +0, +12 px vertically.
export const LOOK={introBlur:5,hitBlur:10,hitShake:[0,0,12]};

// Reference frames are 30 fps; a Draft at another rate gets the same times in its own frames.
export function scenePlan(fps=30){
 if(!Number.isFinite(fps)||fps<10||fps>120)throw Error('Unsupported Draft frame rate');
 const at=f=>Math.round(f*fps/REF.fps);
 const occurrences=[
  ...INTRO.map(([slot,s,e])=>({slot,kind:'intro',refStart:s,startFrame:at(s),endFrame:at(e)})),
  ...MAIN.slice(0,-1).map((s,i)=>({slot:PLAN_SLOTS[i%4],kind:'hit',refStart:s,startFrame:at(s),endFrame:at(MAIN[i+1])}))
 ];
 return {fps,canvas:{width:1080,height:1440},durationFrames:at(REF.durationFrames),occurrences,
  outro:{startFrame:at(REF.outroStart),endFrame:at(REF.durationFrames)}};
}

// Fills the canvas with the photo (cover crop around an editable focus). Intro clips
// keep a light blur; beat clips open with a few heavily blurred, shaken frames.
const EFFECT_CODE=`import {useCurrentFrame} from 'remotion';
export default function StopMotionPhoto({Source,data}) {
 const g=data.g,frame=useCurrentFrame();
 // Sample the reference's 30 fps states by absolute time (not clip time: a rounded
 // clip start can be up to half a frame late), so every Draft frame rate shows the
 // state the reference shows at that instant.
 const refFrame=Math.max(0,Math.floor((frame+data.startFrame)/data.fps*30-data.refStart+1e-6));
 const hit=data.kind==='hit'&&refFrame<data.hitShake.length;
 const blur=(data.kind==='intro'?data.introBlur:hit?data.hitBlur:0)*g.q;
 const shake=hit?data.hitShake[refFrame]*g.q:0;
 const x=Math.max(g.mw-g.w,Math.min(0,g.mw/2-data.focusX*g.w));
 const y=Math.max(g.mh-g.h,Math.min(0,g.mh/2-data.focusY*g.h));
 const box={position:'absolute',left:x,top:y,width:g.w,height:g.h};
 const moved={...box,top:y+shake};
 return <div style={{position:'absolute',inset:0}}><div style={{position:'absolute',left:g.left,top:g.top,width:g.mw,height:g.mh,overflow:'hidden'}}><div style={box}><Source /></div>{blur>0&&<div style={{...box,filter:'blur('+blur+'px)'}}><Source /></div>}{shake!==0&&<div style={{...moved,filter:'blur('+blur+'px)'}}><Source /></div>}</div></div>;
}`;
// Layers: sharp copy, blurred copy, then the shaken blurred copy. The unshaken layers
// fill the strip the shake uncovers, so there is never a black edge.
// Layers: sharp copy, blurred copy, then the shaken blurred copy. The unshaken layers
// fill the strip the shake uncovers, so there is never a black edge.

// Measured outro: brightness falls as centre - (centre - edge) * t^2.2 from the centre
// (t = 0) to the far corner (t = 1), and the whole gradient fades linearly to black.
const OUTRO_CODE=`import {useCurrentFrame} from 'remotion';
const hex=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
export default function StopMotionOutro({data}) {
 const frame=useCurrentFrame(),k=Math.max(0,1-frame/data.frames);
 const a=hex(data.center),b=hex(data.edge);
 const stops=[0,.25,.5,.625,.75,.875,1].map(t=>{const w=Math.pow(t,data.falloff);return 'rgb('+a.map((v,i)=>Math.round(v+(b[i]-v)*w)).join(',')+') '+(t*100)+'%';});
 return <div style={{position:'absolute',inset:0,background:'#000'}}><div style={{position:'absolute',inset:0,opacity:k,background:'radial-gradient(ellipse farthest-corner at center, '+stops.join(', ')+')'}}/></div>;
}`;

export function normalizeFinish(raw){
 const keys=['mode','projectId','draftId','fps','photos','placements','framing','musicResourceId'];
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!keys.includes(k))||raw.mode!=='finish')throw Error('Unsupported request');
 const clean=(value,label,max=1000)=>{if(typeof value!=='string'||!value.trim()||value!==value.trim()||value.length>max||/[\u0000-\u001f]/u.test(value))throw Error(label+' is required');return value;};
 const projectId=clean(raw.projectId,'Project ID'),draftId=clean(raw.draftId,'Draft ID',120);
 const musicResourceId=clean(raw.musicResourceId,'Music Resource ID');
 if(!Array.isArray(raw.photos)||raw.photos.length!==4)throw Error('Choose exactly 4 photos');
 const photos=raw.photos.map(photo=>{
  if(!photo||typeof photo!=='object'||Array.isArray(photo)||Object.keys(photo).some(k=>!['resourceId','width','height'].includes(k)))throw Error('Invalid Image Resource');
  if(!Number.isSafeInteger(photo.width)||photo.width<1||!Number.isSafeInteger(photo.height)||photo.height<1)throw Error('Invalid Image dimensions');
  return {resourceId:clean(photo.resourceId,'Image Resource ID'),width:photo.width,height:photo.height};
 });
 const inFraming=raw.framing??[];
 if(!Array.isArray(inFraming)||inFraming.length>4)throw Error('Invalid photo framing');
 const framing=PLAN_SLOTS.map((_,i)=>{const p=inFraming[i]??{x:.5,y:.5},x=p.x??.5,y=p.y??.5;if(!Number.isFinite(x)||x<0||x>1||!Number.isFinite(y)||y<0||y>1)throw Error('Photo framing must be between 0 and 1');return {x,y};});
 const plan=scenePlan(raw.fps??30);
 if(!Array.isArray(raw.placements)||raw.placements.length!==plan.occurrences.length)throw Error('Expected '+plan.occurrences.length+' Image clips');
 raw.placements.forEach((row,i)=>{const o=plan.occurrences[i];if(!row||typeof row!=='object'||row.slot!==o.slot||!Number.isSafeInteger(row.clipId)||row.clipId<0||typeof row.trackId!=='string'||!row.trackId||row.startFrame!==o.startFrame||row.endFrame!==o.endFrame)throw Error('Image placement differs from the reference plan');});
 if(new Set(raw.placements.map(p=>p.clipId)).size!==raw.placements.length)throw Error('Image clips must be independent');
 return {projectId,draftId,fps:plan.fps,photos,framing,musicResourceId,placements:raw.placements.map(p=>({slot:p.slot,clipId:p.clipId,trackId:p.trackId,startFrame:p.startFrame,endFrame:p.endFrame}))};
}

export const authorFinishSource=String.raw`async function authorFinish(selects,input,plan,look,EFFECT_CODE,OUTRO_CODE){
 let commitStarted=false,stage='read';
 try{
  const project=selects.project(input.projectId),d=selects.draft(input.draftId);
  if(!(await project.meta()).draftIds?.includes(input.draftId))throw Error('Draft is not in the selected Project');
  const meta=await d.meta();
  if(meta.fps!==plan.fps||meta.durationFrames!==plan.durationFrames||meta.frameSize?.width!==plan.canvas.width||meta.frameSize?.height!==plan.canvas.height)throw Error('Draft frame grid changed');
  const types=new Map((await project.resources()).map(r=>[r.resourceId,r.type]));
  if(types.get(input.musicResourceId)!=='Audio')throw Error('Music is not an Audio resource');
  const slotIndex=s=>['A','B','C','D'].indexOf(s);
  const rows=await d.clips({trackScope:'all'});
  for(const [i,o] of plan.occurrences.entries()){
   const placed=input.placements[i],photo=input.photos[slotIndex(o.slot)];
   const clip=rows.find(c=>c.clipId===placed.clipId&&c.trackId===placed.trackId);
   if(!clip||clip.startFrame!==o.startFrame||clip.endFrame!==o.endFrame||clip.resourceId!==photo.resourceId||types.get(clip.resourceId)!=='Image')throw Error('Image clip readback differs from the plan (clip '+(i+1)+')');
  }
  const W=plan.canvas.width,H=plan.canvas.height;
  for(const [i,o] of plan.occurrences.entries()){
   const placed=input.placements[i],k=slotIndex(o.slot),photo=input.photos[k],w=photo.width,h=photo.height;
   const clip=(await d.clips({trackScope:'all'})).find(c=>c.clipId===placed.clipId&&c.trackId===placed.trackId);
   if(!clip)throw Error('Image clip changed during authoring');
   // q: source pixels per canvas pixel after cover-cropping to the canvas; c: the
   // editor's default fit of the whole photo into the canvas.
   const q=Math.min(w/W,h/H),c=Math.min(W/w,H/h);
   const g={w,h,q,mw:W*q,mh:H*q,left:(w-W*q)/2,top:(h-H*q)/2};
   stage='transform clip '+(i+1);
   await d.setClipTransform({clip,enabled:true,scale:{x:1/(q*c),y:1/(q*c)},position:{x:0,y:0},anchor:{x:0,y:0},rotation:0});
   const current=(await d.clips({trackScope:'all'})).find(c=>c.clipId===clip.clipId&&c.trackId===clip.trackId);
   const focus=input.framing[k];
   stage='effect clip '+(i+1);
   await d.addVideoEffect({clip:current,label:'Photo '+o.slot+(o.kind==='intro'?' intro':' beat'),tsxCode:EFFECT_CODE,parameters:{g,kind:o.kind,fps:plan.fps,startFrame:o.startFrame,refStart:o.refStart,introBlur:look.introBlur,hitBlur:look.hitBlur,hitShake:look.hitShake,focusX:focus.x,focusY:focus.y},editableParameters:[{key:'focusX',label:'Horizontal focus',type:'number',defaultValue:focus.x,min:0,max:1,step:.01},{key:'focusY',label:'Vertical focus',type:'number',defaultValue:focus.y,min:0,max:1,step:.01}]});
  }
  stage='outro';
  await d.addMotionGraphic({label:'Stop motion outro',within:await d.rangeAtFrames(plan.outro.startFrame,plan.outro.endFrame),tsxCode:OUTRO_CODE,parameters:{frames:plan.outro.endFrame-plan.outro.startFrame,center:'#494949',edge:'#1c1c1c',falloff:2.2},editableParameters:[{key:'center',label:'Centre colour',type:'color',defaultValue:'#494949'},{key:'edge',label:'Edge colour',type:'color',defaultValue:'#1c1c1c'}]});
  stage='music';
  const music=await d.overlayResource({resource:project.resource(input.musicResourceId),over:await d.rangeAtFrames(0,plan.durationFrames)});
  stage='readback';
  const after=await d.clips({trackScope:'all'});
  if(!after.some(c=>c.resourceId===input.musicResourceId&&c.startFrame===0))throw Error('Music clip is not at the start');
  commitStarted=true;const saved=await d.commitAll('Finish Four Photo Stop Motion Draft');
  if(!saved?.commitId)throw Error('Draft save response did not include its commit ID');
  return {status:'saved',projectId:input.projectId,draftId:input.draftId,clips:input.placements,musicAt:music.atFrame};
 }catch(error){return {status:commitStarted?'outcomeUnknown':'notSaved',stage,message:String(error?.message||error),draftId:input?.draftId};}
}`;

export function buildFinishScript(raw){
 const input=normalizeFinish(raw);
 return `const input=${JSON.stringify(input)};const plan=${JSON.stringify(scenePlan(input.fps))};return await (${authorFinishSource})(selects,input,plan,${JSON.stringify(LOOK)},${JSON.stringify(EFFECT_CODE)},${JSON.stringify(OUTRO_CODE)});`;
}

// @operation-end

const INVENTORY=`const p=selects.project(PROJECT_ID);const resources=await p.resources();const types=new Map(resources.map(r=>[r.resourceId,r.type]));const nodes=[];const walk=tree=>{for(const n of tree||[])n.type==='dir'?walk(n.children):nodes.push(n)};const view=await p.sourceFiles();if('fileTree' in view)walk(view.fileTree);else if('folders' in view)for(const folder of view.folders){const detail=await p.sourceFiles({folder:folder.name});if('fileTree' in detail)walk(detail.fileTree)}return nodes.filter(n=>n.path&&types.has(n.resourceId)).map(n=>({resourceId:n.resourceId,type:types.get(n.resourceId),name:n.name,path:n.path}));`;
async function inventory(sdk,projectId,summary){
 const r=await sdk.runScript({script:INVENTORY.replace('PROJECT_ID',JSON.stringify(projectId)),summary,allowCommit:false});
 if(r.isError||!Array.isArray(r.result))throw Error(r.output||'Could not read the Project files.');
 return r.result;
}
// The editor's existing Image placement path is not exposed by the public panel SDK
// (overlayResource rejects Image resources). Same narrow bridge as Four Photo Reveal:
// validate every selected path and reject unknown hosts. No client code is changed.
// A template run passes the library it was handed (`context.template.libraryId`),
// because it keeps running while the person moves to another page; the Panel
// reads the open Project from the app's address.
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

export async function placeNativeImages(prepared,draftId,plan){
 const {di,libraryId,projectId,sources}=prepared;
 const project=await di.ProjectRepository.findById(libraryId,projectId);
 if(!project)throw Error('The selected Project is unavailable.');
 if(!project.getEditedSequences().includes(draftId))throw Error('The new Draft is not owned by the selected Project.');
 const sequence=await di.SequenceRepository.findById(libraryId,draftId);
 if(!sequence||sequence.getFrameRate()!==plan.fps||sequence.getDuration('resolved')!==plan.durationFrames||JSON.stringify(sequence.getFrameSize())!==JSON.stringify(plan.canvas))throw Error('The Draft frame grid differs from the reference.');
 const placements=[];
 const outcome=await di.TimelineMutation.run(sequence,'four-photo-stop-motion:placeImages',current=>{
  const candidate=current.clone();
  for(const [i,occurrence] of plan.occurrences.entries()){
   const source=sources[LETTERS.indexOf(occurrence.slot)];
   const ids=candidate.place({working:source.analyzed,primaryTrack:source.main,primaryOffset:0,primaryClipId:source.primary.getId()},occurrence.startFrame,{kind:'overlay'});
   if(ids.length!==1)throw Error('Image placement did not create one independent clip.');
   const position=candidate.getClipPositionById(ids[0]),length=occurrence.endFrame-occurrence.startFrame;
   if(!position||position.resolvedOffset!==occurrence.startFrame)throw Error('Image placement moved from the planned frame.');
   const delta=length-position.clip.getDuration();
   if(delta!==0){
    // A still's source is only a few seconds long; sourceDuration lets it hold to the end (as in Photo Grid Reveal).
    const result=candidate.trimClipBoundary({trackId:position.trackId,clipId:ids[0],position:'end',delta,sourceDuration:Math.max(length,position.clip.getDuration())});
    if(result.trimmedClipPosition?.clip.getDuration()!==length)throw Error('Image could not be held for the planned interval.');
   }
   const final=candidate.getClipPositionById(ids[0]);
   if(!final||final.resolvedOffset!==occurrence.startFrame||final.clip.getDuration()!==length)throw Error('Image interval changed during placement.');
   placements.push({slot:occurrence.slot,clipId:ids[0],trackId:final.trackId,startFrame:occurrence.startFrame,endFrame:occurrence.endFrame});
  }
  const overflow=candidate.getDuration('resolved')-plan.durationFrames;
  if(overflow>0)candidate.slice([{startFrame:plan.durationFrames,endFrame:plan.durationFrames+overflow}],{coordinate:'resolved'});
  if(candidate.getDuration('resolved')!==plan.durationFrames)throw Error('Image placement changed the Draft duration.');
  return candidate;
 });
 if(outcome.status!=='committed'||placements.length!==plan.occurrences.length)throw Error('Original Image placement was not confirmed.');
 for(const placement of placements){const row=outcome.sequence?.getClipPositionById(placement.clipId);if(!row||row.trackId!==placement.trackId||row.resolvedOffset!==placement.startFrame||row.clip.getDuration()!==placement.endFrame-placement.startFrame)throw Error('Saved Image placement could not be read back.');}
 return {placements,photos:sources.map(s=>({width:s.width,height:s.height}))};
}

// Registers the bundled music in the Project once, reusing an earlier import by path.
async function ensureMusic(sdk,projectId){
 if(!hostApi('FileSystem','join','homedir','existsSync'))throw Error('This Selects build cannot read the plugin files. Update Selects, then try again.');
 const roots=await hostRoots(sdk,'four-photo-stop-motion',hostJoin('assets','music.mp3')).catch(()=>null);
 if(!roots)throw Error('Bundled music is missing.');
 const file={path:hostJoin(roots.plugin,'assets','music.mp3')};
 let rows=await inventory(sdk,projectId,'Find bundled music');
 if(!rows.some(r=>isBundledMusic(r.path,file.path)&&r.type==='Audio')){
  const r=await sdk.runScript({script:`return await selects.project(${JSON.stringify(projectId)}).importFiles({paths:${JSON.stringify([file.path])}});`,summary:'Import stop motion music',allowCommit:true});
  if(r.isError)throw Error(r.output||'Could not import the music.');
  rows=await inventory(sdk,projectId,'Confirm bundled music');
 }
 const m=rows.find(r=>isBundledMusic(r.path,file.path)&&r.type==='Audio');
 if(!m)throw Error('The music is not ready in the Project yet. Try again in a moment.');
 return m.resourceId;
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
// The Project's path for the bundled music: the same file once both are normalised (NFC, forward slashes, case-folded:
// Windows paths ignore case), or an earlier import of it through another folder name (a linked install folder).
function isBundledMusic(recorded,file){
 const key=p=>String(p||'').normalize('NFC').replace(/\\/g,'/').toLowerCase();
 return key(recorded)===key(file)||key(recorded).endsWith('/four-photo-stop-motion/assets/music.mp3');
}

export const DEFAULT_DRAFT_NAME='Four photo stop motion';

// The create steps, shared by the Panel and a template run. `stillCurrent` says the
// run still belongs to its Project; `onSeed` runs just before the first save and
// `onDraft` with the Draft the later steps fill. Returns the saved result.
export async function createPhotoDraft(sdk,{projectId,selected,framing,name,partialDraftId=null,libraryId=null,stillCurrent,say,onSeed=()=>{},onDraft=_id=>{}}){
 const fresh=await inventory(sdk,projectId,'Confirm selected photos');
 if(selected.some(p=>fresh.filter(r=>r.resourceId===p.resourceId&&r.path===p.path&&r.type==='Image').length!==1))throw Error('The selected photos changed. Reload the Project photos.');
 const prepared=await prepareNativeImages(window.parent,projectId,selected,libraryId);
 say('Adding the music to the Project…');
 const musicResourceId=await ensureMusic(sdk,projectId);
 if(!stillCurrent())throw Error('The Project changed. Start again in the selected Project.');
 say('Creating the Draft…');
 // New Drafts take the app's default frame rate; the plan is converted to it.
 const grid=`const m=await d.meta(),want=Math.round(347*m.fps/30);if(m.durationFrames!==want||m.frameSize?.width!==1080||m.frameSize?.height!==1440)throw Error('Draft frame grid differs from the reference.');`;
 let draftId,fps;
 if(partialDraftId){
  const check=await sdk.runScript({script:`const p=selects.project(${JSON.stringify(projectId)}),id=${JSON.stringify(partialDraftId)};if(!(await p.meta()).draftIds.includes(id))throw Error('Partial Draft is not in this Project.');const d=selects.draft(id);${grid}if((await d.clips({trackScope:'all'})).some(x=>x.resourceId))throw Error('Partial Draft is not empty; inspect it before retrying.');return {draftId:id,fps:m.fps};`,summary:'Inspect partial Draft',allowCommit:false});
  if(check.isError||check.result?.draftId!==partialDraftId)throw Error(check.output||'The partial Draft cannot be safely continued.');
  ({draftId,fps}=check.result);
 }else{
  onSeed();
  const seed=await sdk.runScript({script:`const p=selects.project(${JSON.stringify(projectId)});const d=await p.createDraft({name:${JSON.stringify(name)}});await d.insertGap({seconds:347/30});await d.setFrameSize({width:1080,height:1440});${grid}const saved=await d.commitAll('Start Four Photo Stop Motion Draft');return {draftId:saved.createdDraftId,fps:m.fps};`,summary:'Create stop motion Draft',allowCommit:true});
  if(seed.isError||!seed.result?.draftId){const error=Error(seed.output||'Could not create the Draft. Check the Project before retrying.');error.seedOutput=seed.output;throw error;}
  ({draftId,fps}=seed.result);
 }
 const plan=scenePlan(fps);
 if(plan.fps!==fps||plan.occurrences?.length!==21)throw Error('The reference plan is incomplete.');
 onDraft(draftId);
 say('Placing 21 photo clips…');
 const native=await placeNativeImages(prepared,draftId,plan);
 const request={mode:'finish',projectId,draftId,fps,photos:selected.map((p,i)=>({resourceId:p.resourceId,width:native.photos[i].width,height:native.photos[i].height})),placements:native.placements,framing:Array.from({length:SLOTS},(_,i)=>framing[i]||{x:.5,y:.5}),musicResourceId};
 const script=buildFinishScript(request);
 say('Adding blur, outro and music…');
 const result=await sdk.runScript({script,summary:'Finish stop motion Draft',allowCommit:true,timeoutSeconds:120});
 if(result.isError||!result.result)throw Error(result.output||'Could not confirm the save. Check the Project before retrying.');
 if(result.result.status==='outcomeUnknown')throw Error('Save outcome is unknown. Check the Project Draft list before retrying.');
 if(result.result.status!=='saved')throw Error(result.result.message||'Could not save the Draft.');
 return result.result;
}

// A template run gets its own component, so it never touches the Panel's state.
export default function Panel(props){return props.context?.template?<PhotoTemplateRun {...props}/>:<PhotoPanel {...props}/>;}

function PhotoPanel({sdk,context,ui}){
 const empty=()=>Array(SLOTS).fill('');
 const [photos,setPhotos]=React.useState([]),[slots,setSlots]=React.useState(empty),[loadedProject,setLoadedProject]=React.useState(null);
 const [framing,setFraming]=React.useState([]),[name,setName]=React.useState(DEFAULT_DRAFT_NAME);
 const [busy,setBusy]=React.useState(false),[status,setStatus]=React.useState(''),[saved,setSaved]=React.useState(null),[partialDraftId,setPartialDraftId]=React.useState(null);
 const running=React.useRef(false),currentProject=React.useRef(context.projectId);currentProject.current=context.projectId;
 React.useEffect(()=>{setPhotos([]);setSlots(empty());setFraming([]);setLoadedProject(null);setSaved(null);setPartialDraftId(null);setStatus('');},[context.projectId]);
 async function load(){
  if(!context.projectId||running.current)return;running.current=true;setBusy(true);setStatus('Loading project photos…');
  try{
   const projectId=context.projectId,rows=(await inventory(sdk,projectId,'List project photos')).filter(r=>r.type==='Image');
   if(currentProject.current!==projectId)return;
   setPhotos(rows);setLoadedProject(projectId);
   // Fill empty slots in Project order; the user can change any slot.
   setSlots(old=>old.map((x,i)=>x||rows[i]?.resourceId||''));
   setStatus(rows.length>=SLOTS?'Check the order of photos A–D.':rows.length?'This Project has '+rows.length+' photos. The format needs 4; import more or choose a photo twice on purpose.':'This Project has no photos. Import photos first.');
  }catch(error){setStatus(String(error?.message||error));}finally{running.current=false;setBusy(false);}
 }
 async function create(){
  const projectId=context.projectId;
  if(running.current||!projectId||loadedProject!==projectId||slots.some(x=>!x)||!name.trim())return;
  running.current=true;setBusy(true);setStatus('Checking photos…');
  let createdDraftId=null;
  try{
   const selected=slots.map(id=>{const m=photos.filter(p=>p.resourceId===id);if(m.length!==1)throw Error('Check the selected photos again.');return m[0];});
   const done=await createPhotoDraft(sdk,{projectId,selected,framing,name:name.trim(),partialDraftId,stillCurrent:()=>currentProject.current===projectId,say:setStatus,onDraft:id=>{createdDraftId=id;}});
   setPartialDraftId(null);setSaved(done);setStatus('Saved. Each beat is its own clip; adjust a photo focus in its clip effect. To use a different photo, change that slot here and create another Draft — the crop is sized for the original photo.');
  }catch(error){if(createdDraftId)setPartialDraftId(createdDraftId);setStatus(String(error?.message||error)+(createdDraftId?' The partial Draft is '+createdDraftId+'; it will be checked before continuing.':''));}finally{running.current=false;setBusy(false);}
 }
 const ready=!busy&&loadedProject===context.projectId;
 return <ui.Stack gap={16}><ui.Section title="Four Photo Stop Motion">
  <ui.Message>Four photos cycle as a beat-synced stop motion (11.6 s, 3:4): a blurred double intro, a black pause, then one photo per beat with a blur hit, ending on a dark fade. Music is included.</ui.Message>
  {!context.projectId&&<ui.Message>Open a Project first.</ui.Message>}
  <ui.Button variant="secondary" onClick={load} disabled={!context.projectId||busy} busy={busy}>Load Project photos</ui.Button>
  {slots.map((value,i)=><ui.Select key={i} label={'Photo '+LETTERS[i]} value={value} onChange={v=>setSlots(old=>old.map((x,j)=>j===i?v:x))} options={photos.map(p=>({value:p.resourceId,label:p.name}))} placeholder="Choose photo" disabled={!ready}/>)}
  <details><summary>Adjust photo framing (optional)</summary><ui.Message>Move the visible part of each photo inside its slot. You can also change it later in each clip's effect.</ui.Message>
   {slots.map((_,i)=>{const point=framing[i]||{x:.5,y:.5};return <div key={i}><p>{'Photo '+LETTERS[i]}</p>{['x','y'].map(axis=><ui.Slider key={axis} label={axis==='x'?'Horizontal focus':'Vertical focus'} min={0} max={1} step={.01} value={point[axis]} onChange={value=>setFraming(old=>{const next=[...old];next[i]={...(old[i]||{x:.5,y:.5}),[axis]:value};return next;})} disabled={busy}/>)}</div>;})}
  </details>
  <ui.TextField label="Draft name" value={name} onChange={setName} disabled={busy}/>
  <ui.Actions><ui.Button variant="primary" onClick={create} disabled={!ready||slots.some(x=>!x)||!name.trim()} busy={busy}>{partialDraftId?'Inspect and continue partial Draft':saved?'Create another Draft':'Create Draft'}</ui.Button></ui.Actions>
  {status&&<ui.Message>{status}</ui.Message>}
  {saved&&<ui.Button variant="secondary" onClick={()=>sdk.runScript({script:'return await selects.editor.openDraft('+JSON.stringify(saved.draftId)+');',summary:'Open saved Draft',allowCommit:false})}>Open saved Draft</ui.Button>}
 </ui.Section></ui.Stack>;
}

// --- Template run ------------------------------------------------------------
// A built-in app can run this Panel as a template: the person picks the photos
// in the app (input `photos`, in slot order) and the app mounts the Panel out of
// sight with `context.template`. It makes a new Draft through the Panel's own
// create steps with every choice at its default, never opens it, and ends with
// one `sdk.finishTemplate`.
const TEMPLATE_FAILED='Four Photo Stop Motion could not make the Draft; try again.';
const TEMPLATE_UNSUPPORTED='This version of Selects cannot place photos for Four Photo Stop Motion; update Selects, then try again.';
const templatePartial=name=>'Four Photo Stop Motion stopped part way, so the Draft "'+name+'" may be incomplete; check it in this Project before trying again.';
const templateUncertain=name=>'Four Photo Stop Motion could not confirm whether the Draft "'+name+'" was created; check this Project\'s Drafts before trying again.';
function templateIssue(message){const error=Error(message);error.publicMessage=message;return error;}
// The run report of the step that creates the Draft: its leading JSON object.
function templateReport(output){
 const text=String(output||'');
 for(let end=text.lastIndexOf('}');end>=0;end=text.lastIndexOf('}',end-1)){try{const value=JSON.parse(text.slice(0,end+1));return value&&typeof value==='object'?value:null;}catch{}}
 return null;
}
// That step failed without a Draft id: a report with an error and no committed
// edit means nothing was saved; anything else may have saved.
function templateSeedMessage(error,name){
 const report=templateReport(error?.seedOutput);
 const edits=Array.isArray(report?.edits)?report.edits:[];
 if(typeof report?.error!=='string'||edits.some(edit=>edit?.committed!==false))return templateUncertain(name);
 return 'Four Photo Stop Motion could not create the Draft, so nothing was saved; try again.';
}
// The library the run works in: the one the app handed over, else (an older app)
// the open Project's page or the tab on screen, read once as the run starts.
function templateLibrary(app,projectId,template){
 if(template?.libraryId)return template.libraryId;
 const match=String(app?.location?.pathname||'').match(/libraries\/([^/]+)\/projects\/([^/]+)/);
 if(match&&match[2]===projectId)return match[1];
 return app?.__DI__?.SequenceState?.getOnScreenTab?.()?.libraryId||null;
}
// The app hands over its own Resource ids; the Panel works from the run_script
// Image rows, so each pick is joined to its row by its original file, the same
// file prepareNativeImages later checks the Project's Image against.
async function templateSelection(sdk,app,projectId,libraryId,inputs){
 const picks=Array.isArray(inputs?.photos)?inputs.photos:[];
 if(picks.length!==SLOTS||picks.some(x=>x?.kind!=='image'||!x.resourceId))throw templateIssue('Pick exactly four photos, then try again.');
 const di=app?.__DI__;
 if(typeof di?.ProjectRepository?.findById!=='function'||typeof di?.ResourceRepository?.findById!=='function')throw templateIssue(TEMPLATE_UNSUPPORTED);
 const project=libraryId?await di.ProjectRepository.findById(libraryId,projectId):null;
 if(!project)throw templateIssue('Could not find this Project; open it, then try again.');
 const members=new Set(project.getResources()||[]);
 const rows=(await inventory(sdk,projectId,'List project photos')).filter(r=>r.type==='Image');
 const selected=[];
 for(const pick of picks){
  const label=pick.name||'A picked photo';
  const resource=members.has(pick.resourceId)?await di.ResourceRepository.findById(libraryId,pick.resourceId):null;
  if(!resource)throw templateIssue(label+' is missing from this Project.');
  if(resource.getType()!=='Image')throw templateIssue(label+' is not a photo Four Photo Stop Motion can use.');
  const media=resource.getMedia(),path=media?.originalPath??media?.path;
  const matches=path?rows.filter(row=>row.path===path):[];
  if(matches.length!==1)throw templateIssue(label+' is missing from this Project or matches more than one photo.');
  selected.push(matches[0]);
 }
 return selected;
}
// One plain sentence for the person, from a failure before anything was saved.
function templateMessage(error){
 if(error?.publicMessage)return error.publicMessage;
 const said=String(error?.message||'');
 let match=said.match(/^A selected Image is not ready for editing: (.+)$/);
 if(match)return match[1]+' is not ready yet; wait for it to finish importing, then try again.';
 match=said.match(/^A selected Image is missing or ambiguous in the Project: (.+)$/);
 if(match)return match[1]+' is missing from this Project or matches more than one photo.';
 if(/^This Selects version does not support/.test(said))return TEMPLATE_UNSUPPORTED;
 if(/^The selected photos changed/.test(said))return 'The picked photos changed while the Draft was being made; try again.';
 if(/not ready in the Project yet/.test(said))return 'Four Photo Stop Motion is still adding its sounds to this Project; try again in a moment.';
 return TEMPLATE_FAILED;
}
// Nobody sees this frame, so it shows one status line. It starts once per run
// id and reports once, unless a newer run replaced it; a save that began is
// reported as a possibly incomplete Draft and never retried.
function PhotoTemplateRun({sdk,context}){
 const runId=context.template?.runId,[status,setStatus]=React.useState('Making your Draft…');
 const started=React.useRef(null),alive=React.useRef(true),latest=React.useRef(context);latest.current=context;
 React.useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 React.useEffect(()=>{
  if(!runId||started.current===runId)return;started.current=runId;
  const live=()=>alive.current&&latest.current.template?.runId===runId;
  let ended=false;
  const finish=result=>{if(ended)return;ended=true;if(!live())return;try{sdk.finishTemplate(result);}catch{}};
  const say=text=>{if(live())setStatus(text);};
  const projectId=context.projectId,template=context.template;
  let seeding=false,draftId=null;
  (async()=>{
   try{
    if(!projectId)throw templateIssue('Open a Project, then try again.');
    const app=window.parent,libraryId=templateLibrary(app,projectId,template);
    say('Finding your photos…');
    const selected=await templateSelection(sdk,app,projectId,libraryId,template?.inputs);
    if(!live())throw Error('The template run ended before the Draft was made.');
    const done=await createPhotoDraft(sdk,{projectId,selected,framing:[],name:DEFAULT_DRAFT_NAME,libraryId,stillCurrent:live,say,
     onSeed:()=>{if(!live())throw Error('The template run ended before the Draft was made.');seeding=true;},onDraft:id=>{draftId=id;}});
    if(!done?.draftId||done.draftId!==draftId)throw Error('The saved Draft did not report its id.');
    say('Done.');
    finish({sequenceId:done.draftId});
   }catch(error){
    console.warn('[Four Photo Stop Motion] template run failed:',error?.message||String(error),{draftId,seeding});
    say('Stopped.');
    finish({error:draftId?templatePartial(DEFAULT_DRAFT_NAME):seeding?templateSeedMessage(error,DEFAULT_DRAFT_NAME):templateMessage(error)});
   }finally{
    finish({error:TEMPLATE_FAILED});
   }
  })();
 },[runId]);
 return <p role="status" style={{margin:0,fontSize:12,color:'var(--panel-muted-fg)'}}>{status}</p>;
}
