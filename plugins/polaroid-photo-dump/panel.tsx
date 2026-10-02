// @name Polaroid Photo Dump
// @name:de Polaroid Photo Dump
// @name:en Polaroid Photo Dump
// @name:es Polaroid Photo Dump
// @name:fr Polaroid Photo Dump
// @name:it Polaroid Photo Dump
// @name:ja Polaroid Photo Dump
// @name:ko Polaroid Photo Dump
// @name:pt Polaroid Photo Dump
// @name:tr Polaroid Photo Dump
// @name:zh Polaroid Photo Dump
// @collection visual-highlights
// @icon image
import React from 'react';

const SLOTS=17;

// --- Reference plan and finishing step -----------------------------------------
// Runs in the Panel itself, so the machine needs no Node.js. A `...Source` constant
// is a function kept as source text: run_script (or an effect) receives exactly the
// code written here. tests/polaroid_photo_dump.test.mjs loads everything between the two marker lines.
// @operation-start
// Measured frame by frame from the reference (1080x1920, 60 fps, 835 frames).
// Photo n shows from CUTS[n] to CUTS[n+1]; the last one to the end. Cuts fall on
// every second beat of the music (0.85 s).
const CUTS=[0,21,71,122,174,224,274,326,376,428,479,530,581,633,683,736,786];
const END=835;
export const SLOT_COUNT=CUTS.length;
// The whole scene (fabric, frame and photo) zooms in linearly about ZOOM_CENTER:
// the frame is 579 px wide at 0 s and 668 px at 12 s. The caption does not zoom.
export const ZOOM={center:{x:543,y:951},perSecond:0.0127};
// Transparent photo window of the bundled frame image (assets/frame-v1.png).
export const WINDOW={x:277,y:575,width:527,height:685};
export const CAPTION={text:'\u201cphotos hold memories\u201d',top:333,size:58,fontFamily:'Helvetica Neue'};

export function scenePlan(fps=30){
 if(!Number.isFinite(fps)||fps<10||fps>120)throw Error('Unsupported Draft frame rate');
 const at=f=>Math.round(f*fps/60),durationFrames=at(END);
 // Photos run 6 px under the frame border so no gap shows at the window edge.
 return {fps,canvas:{width:1080,height:1920},durationFrames,zoom:ZOOM,window:WINDOW,photoWindow:{x:WINDOW.x-6,y:WINDOW.y-6,width:WINDOW.width+12,height:WINDOW.height+12},caption:CAPTION,
  occurrences:CUTS.map((c,i)=>({slot:i+1,startFrame:at(c),endFrame:i+1<CUTS.length?at(CUTS[i+1]):durationFrames}))};
}

// Both effects draw in the clip's source pixels. The clip covers the canvas at
// m canvas px per source px, so canvas point P maps to source (w/2+(P.x-540)/m, h/2+(P.y-960)/m).
// Zoom is a CSS scale about ZOOM.center on one clock: (useCurrentFrame()+startFrame)/fps.
const PHOTO_EFFECT=`import {useCurrentFrame} from 'remotion';
export default function PolaroidPhoto({Source,data}) {
 const t=(useCurrentFrame()+data.startFrame)/data.fps,s=1+data.zoom*t,m=data.m;
 const sx=x=>data.w/2+(x-540)/m,sy=y=>data.h/2+(y-960)/m;
 const W=data.win,ww=W.width/m,wh=W.height/m,k=Math.max(ww/data.w,wh/data.h);
 const ox=Math.max(ww-data.w*k,Math.min(0,ww/2-data.focusX*data.w*k)),oy=Math.max(wh-data.h*k,Math.min(0,wh/2-data.focusY*data.h*k));
 const g=data.grade,filter='sepia('+(0.18*g)+') saturate('+(1+0.08*g)+') contrast('+(1+0.05*g)+') brightness('+(1+0.02*g)+')';
 return <div style={{position:'absolute',inset:0,transformOrigin:sx(data.cx)+'px '+sy(data.cy)+'px',transform:'scale('+s+')'}}>
  <div style={{position:'absolute',left:sx(W.x),top:sy(W.y),width:ww,height:wh,overflow:'hidden',filter}}>
   <div style={{position:'absolute',left:ox,top:oy,width:data.w,height:data.h,transformOrigin:'0 0',transform:'scale('+k+')'}}><Source /></div>
  </div></div>;
}`;
const FRAME_EFFECT=`import {useCurrentFrame} from 'remotion';
export default function PolaroidScene({Source,data}) {
 const t=(useCurrentFrame()+data.startFrame)/data.fps,s=1+data.zoom*t,m=data.m;
 const ox=data.w/2+(data.cx-540)/m,oy=data.h/2+(data.cy-960)/m;
 return <div style={{position:'absolute',inset:0,transformOrigin:ox+'px '+oy+'px',transform:'scale('+s+')'}}><Source /></div>;
}`;
const CAPTION_CODE=`export default function PolaroidCaption({data}) {
 if(!data.text)return null;
 return <div style={{position:'absolute',left:0,right:0,top:data.top,textAlign:'center',color:data.color,fontFamily:(data.fontFamily?'"'+data.fontFamily+'", ':'')+'Helvetica, "Segoe UI", Arial, sans-serif',fontWeight:500,fontSize:data.size,lineHeight:1.1,letterSpacing:-0.3,textShadow:'0 1px 6px rgba(0,0,0,0.25)',whiteSpace:'pre-wrap',padding:'0 60px'}}>{data.text}</div>;
}`;

export function normalizeFinish(raw){
 const keys=['mode','projectId','draftId','fps','photos','placements','frame','framing','caption','grade','assets'];
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!keys.includes(k))||raw.mode!=='finish')throw Error('Unsupported request');
 const clean=(value,label,max=1000)=>{if(typeof value!=='string'||!value.trim()||value!==value.trim()||value.length>max||/[\u0000-\u001f]/u.test(value))throw Error(label+' is required');return value;};
 const projectId=clean(raw.projectId,'Project ID'),draftId=clean(raw.draftId,'Draft ID',120);
 const plan=scenePlan(raw.fps??30);
 const size=(o,label)=>{if(!o||!Number.isSafeInteger(o.width)||o.width<1||!Number.isSafeInteger(o.height)||o.height<1)throw Error('Invalid '+label+' dimensions');return {width:o.width,height:o.height};};
 if(!Array.isArray(raw.photos)||raw.photos.length!==SLOT_COUNT)throw Error('Choose exactly '+SLOT_COUNT+' photos');
 const photos=raw.photos.map(p=>({resourceId:clean(p?.resourceId,'Image Resource ID'),...size(p,'photo')}));
 const clip=(row,o,label)=>{if(!row||!Number.isSafeInteger(row.clipId)||row.clipId<0||typeof row.trackId!=='string'||!row.trackId||row.startFrame!==o.startFrame||row.endFrame!==o.endFrame)throw Error(label+' placement differs from the reference plan');return {clipId:row.clipId,trackId:row.trackId,startFrame:row.startFrame,endFrame:row.endFrame};};
 if(!Array.isArray(raw.placements)||raw.placements.length!==SLOT_COUNT)throw Error('Expected '+SLOT_COUNT+' photo clips');
 const placements=raw.placements.map((row,i)=>({slot:i+1,...clip(row,plan.occurrences[i],'Photo '+(i+1))}));
 const frame={...clip(raw.frame,{startFrame:0,endFrame:plan.durationFrames},'Frame'),resourceId:clean(raw.frame?.resourceId,'Frame Resource ID'),...size(raw.frame,'frame')};
 if(new Set([...placements,frame].map(p=>p.clipId)).size!==SLOT_COUNT+1)throw Error('Clips must be independent');
 const framing=Array.from({length:SLOT_COUNT},(_,i)=>{const p=raw.framing?.[i]??{},x=p.x??.5,y=p.y??.5;if(!Number.isFinite(x)||x<0||x>1||!Number.isFinite(y)||y<0||y>1)throw Error('Photo framing must be between 0 and 1');return {x,y};});
 const caption=raw.caption??CAPTION.text;
 if(typeof caption!=='string'||caption.length>120||/[\u0000-\u0009\u000b-\u001f]/u.test(caption))throw Error('Caption must be at most 120 characters');
 const grade=raw.grade??1;
 if(!Number.isFinite(grade)||grade<0||grade>2)throw Error('Film grade must be between 0 and 2');
 const music=clean(raw.assets?.music,'Music Resource ID');
 return {projectId,draftId,fps:plan.fps,photos,placements,frame,framing,caption,grade,assets:{music}};
}

export const authorFinishSource=String.raw`async function authorFinish(selects,input,plan,code){
 let commitStarted=false,stage='read';
 try{
  const project=selects.project(input.projectId),d=selects.draft(input.draftId);
  if(!(await project.meta()).draftIds?.includes(input.draftId))throw Error('Draft is not in the selected Project');
  const meta=await d.meta();
  if(meta.fps!==plan.fps||meta.durationFrames!==plan.durationFrames||meta.frameSize?.width!==plan.canvas.width||meta.frameSize?.height!==plan.canvas.height)throw Error('Draft frame grid changed');
  const types=new Map((await project.resources()).map(r=>[r.resourceId,r.type]));
  if(types.get(input.assets.music)!=='Audio')throw Error('Music is not an Audio resource');
  const rows=await d.clips({trackScope:'all'});
  const layers=[...input.placements.map((p,i)=>({...p,...input.photos[i],kind:'photo',focus:input.framing[i]})),{...input.frame,slot:0,kind:'frame',focus:{x:.5,y:.5}}];
  for(const l of layers){const c=rows.find(r=>r.clipId===l.clipId&&r.trackId===l.trackId);if(!c||c.startFrame!==l.startFrame||c.endFrame!==l.endFrame||c.resourceId!==l.resourceId||types.get(c.resourceId)!=='Image')throw Error('Image clip readback differs from the plan ('+(l.kind==='frame'?'frame':'photo '+l.slot)+')');}
  for(const l of layers){
   const clip=(await d.clips({trackScope:'all'})).find(r=>r.clipId===l.clipId&&r.trackId===l.trackId);
   const fit=Math.min(plan.canvas.width/l.width,plan.canvas.height/l.height),m=Math.max(plan.canvas.width/l.width,plan.canvas.height/l.height);
   const name=l.kind==='frame'?'frame':'photo '+l.slot;
   stage='transform '+name;
   // The editor fits the image inside the canvas; scale it up to cover the canvas.
   await d.setClipTransform({clip,enabled:true,scale:{x:m/fit,y:m/fit},position:{x:0,y:0},anchor:{x:0,y:0},rotation:0});
   const current=(await d.clips({trackScope:'all'})).find(r=>r.clipId===l.clipId&&r.trackId===l.trackId);
   const base={w:l.width,h:l.height,m,fps:plan.fps,startFrame:l.startFrame,zoom:plan.zoom.perSecond,cx:plan.zoom.center.x,cy:plan.zoom.center.y};
   stage='effect '+name;
   if(l.kind==='frame')await d.addVideoEffect({clip:current,label:'Polaroid zoom',tsxCode:code.frame,parameters:base});
   else{
    await d.addVideoEffect({clip:current,label:'Photo '+l.slot+' in polaroid',tsxCode:code.photo,parameters:{...base,win:plan.photoWindow,focusX:l.focus.x,focusY:l.focus.y,grade:input.grade},editableParameters:[{key:'focusX',label:'Horizontal focus',type:'number',defaultValue:l.focus.x,min:0,max:1,step:.01},{key:'focusY',label:'Vertical focus',type:'number',defaultValue:l.focus.y,min:0,max:1,step:.01},{key:'grade',label:'Film grade',type:'number',defaultValue:input.grade,min:0,max:2,step:.05}]});
   }
  }
  stage='caption';
  await d.addMotionGraphic({label:'Polaroid caption',within:await d.rangeAtFrames(0,plan.durationFrames),tsxCode:code.caption,parameters:{text:input.caption,top:plan.caption.top,size:plan.caption.size,color:'#ffffff',fontFamily:plan.caption.fontFamily},editableParameters:[{key:'text',label:'Caption',type:'text',defaultValue:input.caption},{key:'fontFamily',label:'Font',type:'text',defaultValue:plan.caption.fontFamily},{key:'size',label:'Size',type:'number',defaultValue:plan.caption.size,min:10,max:200,step:1},{key:'top',label:'Vertical position',type:'number',defaultValue:plan.caption.top,min:0,max:1800,step:1},{key:'color',label:'Color',type:'color',defaultValue:'#ffffff'}]});
  stage='music';
  await d.overlayResource({resource:project.resource(input.assets.music),over:await d.rangeAtFrames(0,plan.durationFrames)});
  stage='readback';
  const after=await d.clips({trackScope:'all'});
  if(after.filter(r=>r.resourceId===input.assets.music).length!==1)throw Error('Music clip was not placed');
  commitStarted=true;const saved=await d.commitAll('Finish Polaroid Photo Dump Draft');
  if(!saved?.commitId)throw Error('Draft save response did not include its commit ID');
  return {status:'saved',projectId:input.projectId,draftId:input.draftId,clips:input.placements,frame:input.frame};
 }catch(error){return {status:commitStarted?'outcomeUnknown':'notSaved',stage,message:String(error?.message||error),draftId:input?.draftId};}
}`;

export function buildFinishScript(raw){
 const input=normalizeFinish(raw);
 return `const input=${JSON.stringify(input)};const plan=${JSON.stringify(scenePlan(input.fps))};return await (${authorFinishSource})(selects,input,plan,${JSON.stringify({photo:PHOTO_EFFECT,frame:FRAME_EFFECT,caption:CAPTION_CODE})});`;
}

// The bundled files ship base64-encoded beside the Panel. They are decoded into
// plugin-data with atob and checked with SHA-256 (no shell, no Node.js); a copy that
// already matches is reused, and one checked this session (`seen`) is not read again.
// The file calls come in the second argument: the host FileSystem, or a fake in tests.
export async function unpackBundled(manifest,{source,store,join,exists,readBytes,readText,writeFile,rename=null,remove=async()=>{},seen=new Set()}){
 const entries=Object.entries(manifest||{});
 if(!entries.length)throw Error('Invalid bundled file manifest');
 for(const [,v] of entries)if(!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(v?.file||'')||!/^[0-9a-f]{64}$/.test(v?.sha256||''))throw Error('Invalid bundled file manifest');
 // Without WebCrypto only the length is checked.
 const digest=async(bytes,v)=>{const subtle=globalThis.crypto?.subtle;if(!subtle)return bytes.byteLength===v.bytes?v.sha256:'';return [...new Uint8Array(await subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');};
 const out={};
 for(const [key,v] of entries){
  const path=join(store,v.file),mark=v.sha256+' '+path;
  out[key]={path};
  if(seen.has(mark)&&await exists(path))continue;
  let ok=false;try{ok=!!(await exists(path))&&await digest(await readBytes(path),v)===v.sha256;}catch{ok=false;}
  if(!ok){
   const raw=atob((await readText(join(source,v.file+'.b64'))).replace(/\s+/g,'')),bytes=new Uint8Array(raw.length);
   for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
   if(await digest(bytes,v)!==v.sha256)throw Error('Bundled asset does not match its manifest: '+v.file);
   const tmp=join(store,'part-'+Date.now().toString(36)+'.tmp');
   await writeFile(rename?tmp:path,bytes);
   if(rename){await remove(path);await rename(tmp,path);}
  }
  seen.add(mark);
 }
 return out;
}
// @operation-end

const INVENTORY=`const p=selects.project(PROJECT_ID);const resources=await p.resources();const types=new Map(resources.map(r=>[r.resourceId,r.type]));const nodes=[];const walk=tree=>{for(const n of tree||[])n.type==='dir'?walk(n.children):nodes.push(n)};const view=await p.sourceFiles();if('fileTree' in view)walk(view.fileTree);else if('folders' in view)for(const folder of view.folders){const detail=await p.sourceFiles({folder:folder.name});if('fileTree' in detail)walk(detail.fileTree)}return nodes.filter(n=>n.path&&types.has(n.resourceId)&&(!scope.type||types.get(n.resourceId)===scope.type)&&(!scope.paths||scope.paths.includes(n.path))&&(!scope.ids||scope.ids.includes(n.resourceId))).map(n=>({resourceId:n.resourceId,type:types.get(n.resourceId),name:n.name,path:n.path}));`;
async function inventory(sdk,projectId,summary,scope={}){
 const r=await readMediaPages(sdk, {script:`const scope=JSON.parse(${JSON.stringify(JSON.stringify(scope))});`+INVENTORY.replace('PROJECT_ID',JSON.stringify(projectId)),summary,allowCommit:false});
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
 const outcome=await di.TimelineMutation.run(sequence,'polaroid-photo-dump:placeImages',current=>{
  const candidate=current.clone();
  // Photos first, then the frame image last so it sits on the top track.
  for(const [i,occurrence] of [...plan.occurrences,{slot:'frame',startFrame:0,endFrame:plan.durationFrames}].entries()){
   const source=sources[i];
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
 if(outcome.status!=='committed'||placements.length!==plan.occurrences.length+1)throw Error('Original Image placement was not confirmed.');
 for(const placement of placements){const row=outcome.sequence?.getClipPositionById(placement.clipId);if(!row||row.trackId!==placement.trackId||row.resolvedOffset!==placement.startFrame||row.clip.getDuration()!==placement.endFrame-placement.startFrame)throw Error('Saved Image placement could not be read back.');}
 return {placements:placements.slice(0,-1),frame:{...placements.at(-1),width:sources.at(-1).width,height:sources.at(-1).height},photos:sources.slice(0,-1).map(s=>({width:s.width,height:s.height}))};
}

// Decodes the bundled frame image and music into plugin-data through the host FileSystem
// (no shell, so it runs on Windows too) and says where each one is.
const HOST_TOO_OLD='Polaroid Photo Dump needs a newer version of Selects; update Selects, then try again.';
const UNPACKED=new Set();
async function unpackAssets(sdk){
 try{
  // An older host without these methods gets the "newer Selects" message, not "reinstall".
  for(const m of ['join','homedir','existsSync','mkdirSync','readFile'])hostNeed('FileSystem',m);
  const fs=hostNeed('FileSystem','writeFile'),move=hostApi('FileSystem','renameSync'),has=hostApi('FileSystem','existsSync');
  const {plugin,data}=await hostRoots(sdk,'polaroid-photo-dump','assets/manifest.json');
  if(!data)throw hostError('host-missing','no plugin-data folder','FileSystem.mkdirSync');
  const manifest=JSON.parse(await hostReadText(hostJoin(plugin,'assets','manifest.json')));
  return await unpackBundled(manifest,{source:hostJoin(plugin,'assets'),store:data,join:hostJoin,exists:p=>!!has?.existsSync(p),readBytes:hostReadBytes,readText:hostReadText,
   writeFile:(p,b)=>fs.writeFile(p,b),rename:move?(a,b)=>move.renameSync(a,b):null,remove:hostRemove,seen:UNPACKED});
 }catch(error){
  if(error?.code==='host-missing')throw templateIssue(HOST_TOO_OLD);
  if(error?.code==='not-found')throw templateIssue('Polaroid Photo Dump is not fully installed; reinstall it, then try again.');
  throw error;
 }
}
// Host paths compare after NFC and \ to / (and case on Windows).
const samePath=(a,b)=>{const n=s=>{const v=String(s||'').normalize('NFC').replace(/\\/g,'/');return hostIsWindows()?v.toLowerCase():v;};return n(a)===n(b);};

// Registers the bundled frame image and music in the Project once, reusing earlier imports by path.
async function ensureAssets(sdk,projectId){
 const files=await unpackAssets(sdk);
 const want={frame:'Image',music:'Audio'};
 let rows=await inventory(sdk,projectId,'Find polaroid assets');
 const missing=Object.entries(files).filter(([k,f])=>!rows.some(r=>samePath(r.path,f.path)&&r.type===want[k])).map(([,f])=>f.path);
 if(missing.length){
  const r=await sdk.runScript({script:`return await selects.project(${JSON.stringify(projectId)}).importFiles({paths:${JSON.stringify(missing)}});`,summary:'Import polaroid frame and music',allowCommit:true});
  if(r.isError)throw Error(r.output||'Could not import the polaroid frame and music.');
  rows=await inventory(sdk,projectId,'Confirm polaroid assets');
 }
 const out={};
 for(const [key,f] of Object.entries(files)){const m=rows.filter(r=>samePath(r.path,f.path)&&r.type===want[key]);if(m.length<1)throw Error('The polaroid '+key+' is not ready in the Project yet. Try again in a moment.');out[key]={...m[0]};}
 return out;
}

export const DEFAULT_DRAFT_NAME='Polaroid photo dump';
export const DEFAULT_CAPTION='\u201cphotos hold memories\u201d',DEFAULT_GRADE=1;

// The create steps, shared by the Panel and a template run. `stillCurrent` says the
// run still belongs to its Project; `onSeed` runs just before the first save and
// `onDraft` with the Draft the later steps fill. Returns the saved result.
export async function createPhotoDraft(sdk,{projectId,selected,framing,name,caption,grade,partialDraftId=null,libraryId=null,stillCurrent,say,onSeed=()=>{},onDraft=_id=>{}}){
 const fresh=await inventory(sdk,projectId,'Confirm selected photos');
 if(selected.some(p=>fresh.filter(r=>r.resourceId===p.resourceId&&r.path===p.path&&r.type==='Image').length!==1))throw Error('The selected photos changed. Reload the Project photos.');
 say('Adding the polaroid frame and music to the Project…');
 const assets=await ensureAssets(sdk,projectId);
 const prepared=await prepareNativeImages(window.parent,projectId,[...selected,assets.frame],libraryId);
 if(!stillCurrent())throw Error('The Project changed. Start again in the selected Project.');
 say('Creating the Draft…');
 // New Drafts take the app's default frame rate; the plan is converted to it.
 const grid=`const m=await d.meta(),want=Math.round(835*m.fps/60);if(m.durationFrames!==want||m.frameSize?.width!==1080||m.frameSize?.height!==1920)throw Error('Draft frame grid differs from the reference.');`;
 let draftId,fps;
 if(partialDraftId){
  const check=await sdk.runScript({script:`const p=selects.project(${JSON.stringify(projectId)}),id=${JSON.stringify(partialDraftId)};if(!(await p.meta()).draftIds.includes(id))throw Error('Partial Draft is not in this Project.');const d=selects.draft(id);${grid}if((await d.clips({trackScope:'all'})).some(x=>x.resourceId))throw Error('Partial Draft is not empty; inspect it before retrying.');return {draftId:id,fps:m.fps};`,summary:'Inspect partial Draft',allowCommit:false});
  if(check.isError||check.result?.draftId!==partialDraftId)throw Error(check.output||'The partial Draft cannot be safely continued.');
  ({draftId,fps}=check.result);
 }else{
  onSeed();
  const seed=await sdk.runScript({script:`const p=selects.project(${JSON.stringify(projectId)});const d=await p.createDraft({name:${JSON.stringify(name)}});await d.insertGap({seconds:835/60});await d.setFrameSize({width:1080,height:1920});${grid}const saved=await d.commitAll('Start Polaroid Photo Dump Draft');return {draftId:saved.createdDraftId,fps:m.fps};`,summary:'Create polaroid Draft',allowCommit:true});
  if(seed.isError||!seed.result?.draftId){const error=Error(seed.output||'Could not create the Draft. Check the Project before retrying.');error.seedOutput=seed.output;throw error;}
  ({draftId,fps}=seed.result);
 }
 const plan=scenePlan(fps);
 if(plan.fps!==fps||plan.occurrences?.length!==SLOTS)throw Error('The reference plan is incomplete.');
 onDraft(draftId);
 say('Placing 17 photos and the frame…');
 const native=await placeNativeImages(prepared,draftId,plan);
 const request={mode:'finish',projectId,draftId,fps,photos:selected.map((p,i)=>({resourceId:p.resourceId,width:native.photos[i].width,height:native.photos[i].height})),placements:native.placements,frame:{...native.frame,resourceId:assets.frame.resourceId},framing:Array.from({length:SLOTS},(_,i)=>framing[i]||{x:.5,y:.5}),caption,grade,assets:{music:assets.music.resourceId}};
 const script=buildFinishScript(request);
 say('Adding the zoom, film grade, caption and music…');
 const result=await sdk.runScript({script,summary:'Finish polaroid Draft',allowCommit:true,timeoutSeconds:120});
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
 const [framing,setFraming]=React.useState([]),[name,setName]=React.useState(DEFAULT_DRAFT_NAME),[caption,setCaption]=React.useState(DEFAULT_CAPTION),[grade,setGrade]=React.useState(DEFAULT_GRADE);
 const [busy,setBusy]=React.useState(false),[status,setStatus]=React.useState(''),[saved,setSaved]=React.useState(null),[partialDraftId,setPartialDraftId]=React.useState(null);
 const running=React.useRef(false),currentProject=React.useRef(context.projectId);currentProject.current=context.projectId;
 React.useEffect(()=>{setPhotos([]);setSlots(empty());setFraming([]);setLoadedProject(null);setSaved(null);setPartialDraftId(null);setStatus('');},[context.projectId]);
 async function load(){
  if(!context.projectId||running.current)return;running.current=true;setBusy(true);setStatus('Loading project photos…');
  try{
   const projectId=context.projectId,rows=(await inventory(sdk,projectId,'List project photos')).filter(r=>r.type==='Image'&&!r.path.includes('/plugin-data/polaroid-photo-dump/'));
   if(currentProject.current!==projectId)return;
   setPhotos(rows);setLoadedProject(projectId);
   // Fill empty slots in Project order; the user can change any slot.
   setSlots(old=>old.map((x,i)=>x||rows[i]?.resourceId||''));
   setStatus(rows.length>=SLOTS?'Check the order of photos 1–17.':rows.length?'This Project has '+rows.length+' photos. The format needs 17; import more or choose a photo twice on purpose.':'This Project has no photos. Import photos first.');
  }catch(error){setStatus(String(error?.message||error));}finally{running.current=false;setBusy(false);}
 }
 async function create(){
  const projectId=context.projectId;
  if(running.current||!projectId||loadedProject!==projectId||slots.some(x=>!x)||!name.trim())return;
  running.current=true;setBusy(true);setStatus('Checking photos…');
  let createdDraftId=null;
  try{
   const selected=slots.map(id=>{const m=photos.filter(p=>p.resourceId===id);if(m.length!==1)throw Error('Check the selected photos again.');return m[0];});
   const done=await createPhotoDraft(sdk,{projectId,selected,framing,name:name.trim(),caption,grade,partialDraftId,stillCurrent:()=>currentProject.current===projectId,say:setStatus,onDraft:id=>{createdDraftId=id;}});
   setPartialDraftId(null);setSaved(done);setStatus('Saved. Each photo is its own clip; adjust its focus and film grade in the clip effect, and the caption in its graphic. To use a different photo in a slot, change that slot here and create another Draft.');
  }catch(error){if(createdDraftId)setPartialDraftId(createdDraftId);setStatus(String(error?.message||error)+(createdDraftId?' The partial Draft is '+createdDraftId+'; it will be checked before continuing.':''));}finally{running.current=false;setBusy(false);}
 }
 const ready=!busy&&loadedProject===context.projectId;
 return <ui.Stack gap={16}><ui.Section title="Polaroid Photo Dump">
  <ui.Message>Seventeen photos switch inside an instant-film frame on satin, one every two beats of the bundled CC0 track, while the scene slowly zooms in (13.9 s). Each photo stays an editable clip.</ui.Message>
  {!context.projectId&&<ui.Message>Open a Project first.</ui.Message>}
  <ui.Button variant="secondary" onClick={load} disabled={!context.projectId||busy} busy={busy}>Load Project photos</ui.Button>
  {slots.map((value,i)=><ui.Select key={i} label={'Photo '+(i+1)} value={value} onChange={v=>setSlots(old=>old.map((x,j)=>j===i?v:x))} options={photos.map(p=>({value:p.resourceId,label:p.name}))} placeholder="Choose photo" disabled={!ready}/>)}
  <details><summary>Adjust photo framing (optional)</summary><ui.Message>Move the visible part of each photo inside the frame window. You can also change it later in each clip's effect.</ui.Message>
   {slots.map((_,i)=>{const point=framing[i]||{x:.5,y:.5};return <div key={i}><p>{'Photo '+(i+1)}</p>{['x','y'].map(axis=><ui.Slider key={axis} label={axis==='x'?'Horizontal focus':'Vertical focus'} min={0} max={1} step={.01} value={point[axis]} onChange={value=>setFraming(old=>{const next=[...old];next[i]={...(old[i]||{x:.5,y:.5}),[axis]:value};return next;})} disabled={busy}/>)}</div>;})}
  </details>
  <ui.TextField label="Caption" value={caption} onChange={setCaption} disabled={busy}/>
  <ui.Slider label="Film grade" min={0} max={2} step={.05} value={grade} onChange={setGrade} disabled={busy}/>
  <ui.TextField label="Draft name" value={name} onChange={setName} disabled={busy}/>
  <ui.Actions><ui.Button variant="primary" onClick={create} disabled={!ready||slots.some(x=>!x)||!name.trim()||caption.length>120} busy={busy}>{partialDraftId?'Inspect and continue partial Draft':saved?'Create another Draft':'Create Draft'}</ui.Button></ui.Actions>
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
const TEMPLATE_FAILED='Polaroid Photo Dump could not make the Draft; try again.';
const TEMPLATE_UNSUPPORTED='This version of Selects cannot place photos for Polaroid Photo Dump; update Selects, then try again.';
const templatePartial=name=>'Polaroid Photo Dump stopped part way, so the Draft "'+name+'" may be incomplete; check it in this Project before trying again.';
const templateUncertain=name=>'Polaroid Photo Dump could not confirm whether the Draft "'+name+'" was created; check this Project\'s Drafts before trying again.';
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
 return 'Polaroid Photo Dump could not create the Draft, so nothing was saved; try again.';
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
 if(picks.length!==SLOTS||picks.some(x=>x?.kind!=='image'||!x.resourceId))throw templateIssue('Pick exactly 17 photos, then try again.');
 const di=app?.__DI__;
 if(typeof di?.ProjectRepository?.findById!=='function'||typeof di?.ResourceRepository?.findById!=='function')throw templateIssue(TEMPLATE_UNSUPPORTED);
 const project=libraryId?await di.ProjectRepository.findById(libraryId,projectId):null;
 if(!project)throw templateIssue('Could not find this Project; open it, then try again.');
 const members=new Set(project.getResources()||[]);
 const paths=[];
 for(const pick of picks){
  const label=pick.name||'A picked photo';
  const resource=members.has(pick.resourceId)?await di.ResourceRepository.findById(libraryId,pick.resourceId):null;
  if(!resource)throw templateIssue(label+' is missing from this Project.');
  if(resource.getType()!=='Image')throw templateIssue(label+' is not a photo Polaroid Photo Dump can use.');
  const media=resource.getMedia(),path=media?.originalPath??media?.path;
  paths.push(path);
 }
 const rows=await inventory(sdk,projectId,'List project photos',{paths,type:'Image'});
 return paths.map((path,i)=>{
  const matches=path?rows.filter(row=>row.path===path):[];
  if(matches.length!==1)throw templateIssue((picks[i].name||'A picked photo')+' is missing from this Project or matches more than one photo.');
  return matches[0];
 });
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
 if(/not ready in the Project yet/.test(said))return 'Polaroid Photo Dump is still adding its sounds to this Project; try again in a moment.';
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
    const done=await createPhotoDraft(sdk,{projectId,selected,framing:[],name:DEFAULT_DRAFT_NAME,caption:DEFAULT_CAPTION,grade:DEFAULT_GRADE,libraryId,stillCurrent:live,say,
     onSeed:()=>{if(!live())throw Error('The template run ended before the Draft was made.');seeding=true;},onDraft:id=>{draftId=id;}});
    if(!done?.draftId||done.draftId!==draftId)throw Error('The saved Draft did not report its id.');
    say('Done.');
    finish({sequenceId:done.draftId});
   }catch(error){
    console.warn('[Polaroid Photo Dump] template run failed:',error?.message||String(error),{draftId,seeding});
    say('Stopped.');
    finish({error:draftId?templatePartial(DEFAULT_DRAFT_NAME):seeding?templateSeedMessage(error,DEFAULT_DRAFT_NAME):templateMessage(error)});
   }finally{
    finish({error:TEMPLATE_FAILED});
   }
  })();
 },[runId]);
 return <p role="status" style={{margin:0,fontSize:12,color:'var(--panel-muted-fg)'}}>{status}</p>;
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
