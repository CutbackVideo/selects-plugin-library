// @name Four Photo Reveal
// @collection visual-highlights
// @name:de Four Photo Reveal
// @name:en Four Photo Reveal
// @name:es Four Photo Reveal
// @name:fr Four Photo Reveal
// @name:it Four Photo Reveal
// @name:ja Four Photo Reveal
// @name:ko Four Photo Reveal
// @name:pt Four Photo Reveal
// @name:tr Four Photo Reveal
// @name:zh Four Photo Reveal
// @icon image
import React from 'react';

// --- Reference plan and finishing step -----------------------------------------
// Runs in the Panel itself, so the machine needs no Node.js. A `...Source` constant
// is a function kept as source text: run_script (or an effect) receives exactly the
// code written here. tests/no14_native_image.test.mjs and no14_default_music.test.mjs loads everything between the two marker lines.
// @operation-start
export function scenePlan(){
 const fullscreen=['A','B','D','C'],starts=[130,160,191,220],ends=[160,191,220,266];
 const rect={A:{x:22,y:34,width:319,height:570},B:{x:379,y:679,width:318,height:563},C:{x:25,y:679,width:314,height:563},D:{x:379,y:36,width:318,height:568}};
 const reveal={A:-0.026667,B:0.856667,C:1.793333,D:2.673333};
 return {fps:30,canvas:{width:720,height:1280},durationFrames:266,fidelity:'provisional-format',transitions:[{after:'A',cutFrame:160},{after:'B',cutFrame:191},{after:'D',cutFrame:220}],occurrences:[
  ...fullscreen.map((slot,i)=>({slot,appearance:'fullscreen',startFrame:starts[i],endFrame:ends[i],rect:{x:0,y:0,width:720,height:1280},revealStart:i===0?starts[i]/30:null,revealDuration:.3,lateEase:i===0,radius:0})),
  ...['A','B','C','D'].map((slot,i)=>({slot,appearance:'grid',startFrame:0,endFrame:i===0?140:135,rect:rect[slot],revealStart:reveal[slot],revealDuration:.5,radius:28,...(i===0?{fadeStart:132/30,fadeDuration:8/30}:{})}))]};
}

// Original Image clips overlap for the measured crossfades. Selects' native
// Transition renderer currently throws InvalidFrameError for Image endpoints.
// The reference is measured at 30 fps and returned unchanged there. A Draft takes
// its Project's rate, so another rate gets the same plan through seconds: each
// reference boundary frame f becomes round(f*fps/30) (nearest frame, halves up),
// computed once per boundary, so a cut is both one scene's end and the next one's
// start and the scenes stay adjacent. The ten-frame fullscreen overlap becomes one
// rounded length added after each cut, so every overlap is equal and ends where the
// finishing check expects. Times already in seconds (grid reveals, reveal lengths)
// stay; the fullscreen A reveal and the grid A exit fade follow their rounded frames.
export function planFps(value){
 if(value==null)return 30;
 const fps=Number(value);
 if(!Number.isFinite(fps)||fps<10||fps>240)throw Error('Unsupported project frame rate');
 return fps;
}
export function nativeScenePlan(fpsInput){
 const fps=planFps(fpsInput);
 const plan=scenePlan();
 if(fps===30)return {...plan,occurrences:plan.occurrences.map(o=>o.appearance==='fullscreen'&&o.slot!=='C'?{...o,endFrame:o.endFrame+10}:o)};
 const at=frame=>Math.round(frame*fps/30),seconds=value=>Math.round(value*30);
 const overlapFrames=at(10),durationFrames=at(plan.durationFrames);
 const occurrences=plan.occurrences.map(o=>{
  const startFrame=at(o.startFrame),endFrame=at(o.endFrame),out={...o,startFrame,endFrame:o.appearance==='fullscreen'&&o.slot!=='C'?endFrame+overlapFrames:endFrame};
  if(o.appearance==='fullscreen'&&o.revealStart!=null)out.revealStart=startFrame/fps;
  if(o.fadeStart!=null){const fadeFrom=at(seconds(o.fadeStart)),fadeTo=at(seconds(o.fadeStart+o.fadeDuration));out.fadeStart=fadeFrom/fps;out.fadeDuration=(fadeTo-fadeFrom)/fps;}
  return out;
 });
 const converted={...plan,fps,durationFrames,transitions:plan.transitions.map(t=>({...t,cutFrame:at(t.cutFrame)})),occurrences,overlapFrames,referenceFps:30};
 const full=occurrences.filter(o=>o.appearance==='fullscreen');
 if(overlapFrames<2||occurrences.some(o=>!(o.endFrame>o.startFrame)||o.endFrame>durationFrames||(o.fadeDuration!=null&&!(o.fadeDuration>0)))||full.some((o,i)=>i>0&&(o.startFrame!==converted.transitions[i-1].cutFrame||full[i-1].endFrame!==o.startFrame+overlapFrames||o.endFrame-o.startFrame<=overlapFrames)))throw Error('This project frame rate cannot hold the No.14 timing');
 return converted;
}
// The effect reads time as frame/fps; the 30 fps code is left exactly as measured.
export function effectCodeFor(fps){
 if(fps===30)return EFFECT_CODE;
 const code=EFFECT_CODE.replace('t=globalFrame/30','t=globalFrame/'+JSON.stringify(fps));
 if(code===EFFECT_CODE)throw Error('Effect timing could not be converted');
 return code;
}

export const revealProgressSource=String.raw`function revealProgress(elapsed,duration,lateEase){
 const linear=Math.max(0,Math.min(1,elapsed/duration));
 if(!lateEase||linear<=5/9)return linear;
 const u=(linear-5/9)/(4/9);
 return 5/9+(4/9)*(1-Math.pow(1-u,2.1));
}`;

export const gridExitFadeProgressSource=String.raw`function gridExitFadeProgress(t,start,duration){
 const u=Math.max(0,Math.min(1,(t-start)/duration));
 return 1-u*u*(3-2*u);
}`;

export const transitionCoefficientsSource=String.raw`function transitionCoefficients(progress){
 const p=Math.max(0,Math.min(1,progress)),v=p*9,i=Math.min(8,Math.floor(v)),u=v-i;
 const alphaPoints=[0,.0901,.2356,.3011,.3622,.5160,.6777,.7667,.8582,1];
 const gainPoints=[1,1.0240,1.0451,1.0602,1.0677,1.0936,1.1063,1.0860,1.0542,1];
 const alpha=alphaPoints[i]*(1-u)+alphaPoints[i+1]*u;
 const gain=gainPoints[i]*(1-u)+gainPoints[i+1]*u;
 return {outgoing:gain*(1-alpha),incoming:gain*alpha};
}`;

const EFFECT_CODE=`import {useCurrentFrame} from 'remotion';
const revealProgress=${revealProgressSource};
const gridExitFadeProgress=${gridExitFadeProgressSource};
const transitionCoefficients=${transitionCoefficientsSource};
export default function No14Crop({Source,data}) {
 const g=data.g,frame=useCurrentFrame(),globalFrame=frame+data.startFrame,t=globalFrame/30;
 let alpha=(data.revealStart==null?1:revealProgress(t-data.revealStart,data.revealDuration,data.lateEase))*(data.fadeStart==null?1:gridExitFadeProgress(t,data.fadeStart,data.fadeDuration));
 let gain=1;
 for(const item of [data.transitionIn,data.transitionOut])if(item&&globalFrame>=item.startFrame&&globalFrame<item.startFrame+item.durationFrames){const coefficients=transitionCoefficients((globalFrame-item.startFrame)/Math.max(1,item.durationFrames-1));gain=coefficients.outgoing+coefficients.incoming;if(item===data.transitionIn)alpha*=coefficients.incoming/gain;}
 const x=Math.max(g.mw-g.w,Math.min(0,g.mw/2-data.focusX*g.w));
 const y=Math.max(g.mh-g.h,Math.min(0,g.mh/2-data.focusY*g.h));
 return <div style={{position:'absolute',inset:0,opacity:alpha,filter:'brightness('+gain+')'}}><div style={{position:'absolute',left:g.left,top:g.top,width:g.mw,height:g.mh,overflow:'hidden',borderRadius:data.radius}}><div style={{position:'absolute',left:x,top:y,width:g.w,height:g.h}}><Source /></div></div></div>;
}`;
const DECORATION_CODE=`export default function No14Decoration({data}) {
 if(data.shape==='none')return null;
 const paths={heart:<path d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09A5.95 5.95 0 0 1 16.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35Z"/>,star:<path d="m12 2 2.95 6.05 6.67.97-4.81 4.69 1.14 6.63L12 17.22l-5.95 3.12 1.14-6.63-4.81-4.69 6.67-.97L12 2Z"/>,circle:<circle cx="12" cy="12" r="10"/>};
 return <div style={{position:'absolute',inset:0,display:'flex',justifyContent:'center',alignItems:'center',pointerEvents:'none'}}><svg width={data.size} height={data.size} viewBox="0 0 24 24" fill={data.color} style={{transform:'translate('+data.x+'px,'+data.y+'px)'}}>{paths[data.shape]}</svg></div>;
}`;

export function normalizeNativeFinish(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!['mode','projectId','draftId','photos','placements','decoration','framing','music','fps'].includes(k))||raw.mode!=='native-finish')throw Error('Unsupported original Image request');
 const clean=(value,label,max=1000)=>{if(typeof value!=='string'||!value.trim()||value!==value.trim()||value.length>max||/[\u0000-\u001f]/u.test(value))throw Error(label+' is required');return value;};
 const projectId=clean(raw.projectId,'Project ID'),draftId=clean(raw.draftId,'Draft ID',120);
 if(!Array.isArray(raw.photos)||raw.photos.length!==4)throw Error('Choose exactly four original Images');
 const photos=raw.photos.map(photo=>{
  if(!photo||typeof photo!=='object'||Array.isArray(photo)||Object.keys(photo).some(k=>!['resourceId','path','width','height'].includes(k)))throw Error('Invalid Image Resource');
  const resourceId=clean(photo.resourceId,'Image Resource ID'),path=clean(photo.path,'Image source path',8192);
  if(!path.startsWith('/')||!Number.isSafeInteger(photo.width)||photo.width<1||!Number.isSafeInteger(photo.height)||photo.height<1)throw Error('Invalid Image dimensions or path');
  return {resourceId,path,width:photo.width,height:photo.height};
 });
 const decoration=raw.decoration??{shape:'heart',color:'#ffffff'};
 if(!decoration||typeof decoration!=='object'||Array.isArray(decoration)||Object.keys(decoration).some(k=>!['shape','color'].includes(k))||!['heart','star','circle','none'].includes(decoration.shape)||!/^#[0-9a-fA-F]{6}$/.test(decoration.color))throw Error('Choose a decoration shape and hex color');
 const framingInput=raw.framing??{},framing={};
 const keys=['grid','fullscreen'].flatMap(scene=>['A','B','C','D'].map(slot=>scene+'-'+slot));
 if(!framingInput||typeof framingInput!=='object'||Array.isArray(framingInput)||Object.keys(framingInput).some(key=>!keys.includes(key)))throw Error('Invalid photo framing');
 for(const key of keys){const point=framingInput[key]??{x:.5,y:.5};if(!point||typeof point!=='object'||Array.isArray(point)||Object.keys(point).some(k=>!['x','y'].includes(k)))throw Error('Invalid photo framing');const x=point.x??.5,y=point.y??.5;if(!Number.isFinite(x)||x<0||x>1||!Number.isFinite(y)||y<0||y>1)throw Error('Photo framing must be between 0 and 1');framing[key]={x,y};}
 const music=raw.music??null;
 if(music!==null&&(!music||typeof music!=='object'||Array.isArray(music)||Object.keys(music).some(k=>k!=='resourceId')))throw Error('Invalid music Resource');
 if(music)clean(music.resourceId,'Music Resource ID');
 const plan=nativeScenePlan(raw.fps);
 if(!Array.isArray(raw.placements)||raw.placements.length!==8)throw Error('Expected eight original Image clips');
 const placementByKey=new Map();
 for(const row of raw.placements){
  if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).some(k=>!['slot','appearance','clipId','trackId','startFrame','endFrame'].includes(k))||!Number.isSafeInteger(row.clipId)||row.clipId<0||typeof row.trackId!=='string'||!row.trackId)throw Error('Invalid Image placement');
  const key=row.appearance+'-'+row.slot;
  if(placementByKey.has(key))throw Error('Duplicate Image placement');
  placementByKey.set(key,row);
 }
 for(const occurrence of plan.occurrences){const row=placementByKey.get(occurrence.appearance+'-'+occurrence.slot);if(!row||row.startFrame!==occurrence.startFrame||row.endFrame!==occurrence.endFrame)throw Error('Image placement differs from the reference plan');}
 if(new Set(raw.placements.map(p=>p.clipId)).size!==8)throw Error('Image clips must be independent');
 return {projectId,draftId,photos,placements:raw.placements,decoration,framing,music};
}

export const authorNativeFinishSource=String.raw`async function authorNativeFinish(selects,input,plan){
 let commitStarted=false,stage='read';
 try{
  const project=selects.project(input.projectId),d=selects.draft(input.draftId);
  if(!(await project.meta()).draftIds?.includes(input.draftId))throw Error('Draft is not in the selected Project');
  const meta=await d.meta();
  if(meta.fps!==plan.fps||meta.durationFrames!==plan.durationFrames||meta.frameSize?.width!==plan.canvas.width||meta.frameSize?.height!==plan.canvas.height)throw Error('Draft frame grid changed');
  const rows=await d.clips({trackScope:'all'}),images=rows.filter(c=>c.trackKind==='video'&&c.resourceId);
  if(images.length!==8)throw Error('Expected exactly eight original Image clips');
  const resources=await project.resources(),types=new Map(resources.map(r=>[r.resourceId,r.type]));
  if(input.music){
   stage='music preflight';
   const music=resources.find(r=>r.resourceId===input.music.resourceId);
   if(!music||music.type!=='Audio'||!Number.isFinite(music.durationSeconds)||music.durationSeconds<plan.durationFrames/plan.fps)throw Error('Music must be a ready Audio Resource covering the whole Draft');
   if(rows.some(c=>c.trackKind==='audio'&&c.resourceId))throw Error('This new Draft already contains audio; inspect it before continuing');
  }
  const created=[];
  for(const occurrence of plan.occurrences){
   const placed=input.placements.find(p=>p.slot===occurrence.slot&&p.appearance===occurrence.appearance);
   const photo=input.photos['ABCD'.indexOf(occurrence.slot)];
   const clip=images.find(c=>c.clipId===placed?.clipId);
   if(!clip||clip.trackId!==placed.trackId||clip.startFrame!==occurrence.startFrame||clip.endFrame!==occurrence.endFrame||clip.resourceId!==photo.resourceId||types.get(clip.resourceId)!=='Image')throw Error('Original Image clip readback differs from the plan');
   created.push({...placed,resourceId:photo.resourceId});
  }
  if(new Set(created.map(c=>c.clipId)).size!==8)throw Error('Image clips are not independent');
  for(const occurrence of plan.occurrences){
   const placed=input.placements.find(p=>p.slot===occurrence.slot&&p.appearance===occurrence.appearance);
   const clip=(await d.clips({trackScope:'all'})).find(c=>c.clipId===placed.clipId&&c.trackId===placed.trackId);
   if(!clip)throw Error('Image clip changed during authoring');
   const photo=input.photos['ABCD'.indexOf(occurrence.slot)],r=occurrence.rect,w=photo.width,h=photo.height,q=Math.min(w/r.width,h/r.height),c=Math.min(plan.canvas.width/w,plan.canvas.height/h);
   const g={w,h,mw:r.width*q,mh:r.height*q,left:(w-r.width*q)/2,top:(h-r.height*q)/2};
   const position={x:(r.x+r.width/2-plan.canvas.width/2)/plan.canvas.height*100,y:(plan.canvas.height/2-r.y-r.height/2)/plan.canvas.height*100};
   stage='transform '+occurrence.appearance+' '+occurrence.slot;
   await d.setClipTransform({clip,enabled:true,scale:{x:1/(q*c),y:1/(q*c)},position,anchor:{x:0,y:0},rotation:0});
   const current=(await d.clips({trackScope:'all'})).find(c=>c.clipId===clip.clipId&&c.trackId===clip.trackId);
   const focus=input.framing[occurrence.appearance+'-'+occurrence.slot];
   stage='effect '+occurrence.appearance+' '+occurrence.slot;
   const incoming=plan.transitions.find(t=>t.cutFrame===occurrence.startFrame&&occurrence.appearance==='fullscreen');
   const outgoing=plan.transitions.find(t=>t.after===occurrence.slot&&occurrence.appearance==='fullscreen');
   await d.addVideoEffect({clip:current,label:'No.14 '+occurrence.appearance+' '+occurrence.slot,tsxCode:EFFECT_CODE,parameters:{g,startFrame:occurrence.startFrame,revealStart:occurrence.revealStart,revealDuration:occurrence.revealDuration,lateEase:occurrence.lateEase===true,fadeStart:occurrence.fadeStart??null,fadeDuration:occurrence.fadeDuration??1,radius:occurrence.radius*q,focusX:focus.x,focusY:focus.y,transitionIn:incoming?{startFrame:incoming.cutFrame,durationFrames:plan.overlapFrames??10}:null,transitionOut:outgoing?{startFrame:outgoing.cutFrame,durationFrames:plan.overlapFrames??10}:null},editableParameters:[{key:'focusX',label:'Horizontal focus',type:'number',defaultValue:focus.x,min:0,max:1,step:.01},{key:'focusY',label:'Vertical focus',type:'number',defaultValue:focus.y,min:0,max:1,step:.01}]});
  }
  for(const transition of plan.transitions){
   stage='verify transition after '+transition.after;
   const from=created.find(c=>c.appearance==='fullscreen'&&c.slot===transition.after);
   const to=created.find(c=>c.appearance==='fullscreen'&&c.startFrame===transition.cutFrame);
   if(!from||!to||from.trackId===to.trackId||from.endFrame!==to.startFrame+(plan.overlapFrames??10))throw Error('Fullscreen Image clips must overlap for ten frames on separate tracks');
  }
  stage='decoration';
  await d.addMotionGraphic({label:'No.14 decoration',within:await d.rangeAtFrames(0,plan.durationFrames),tsxCode:DECORATION_CODE,parameters:{...input.decoration,size:29,x:1.5,y:3.5},editableParameters:[{key:'shape',label:'Decoration',type:'select',defaultValue:input.decoration.shape,options:['heart','star','circle','none'].map(s=>({label:s,value:s}))},{key:'color',label:'Color',type:'color',defaultValue:input.decoration.color},{key:'size',label:'Size',type:'number',defaultValue:29,min:1,max:160,step:1},{key:'x',label:'Horizontal position',type:'number',defaultValue:1.5,min:-300,max:300,step:.5},{key:'y',label:'Vertical position',type:'number',defaultValue:3.5,min:-500,max:500,step:.5}]});
  if(input.music){
   stage='music';
   await d.overlayResource({resource:project.resource(input.music.resourceId),over:await d.rangeAtFrames(0,plan.durationFrames)});
   const audio=(await d.clips({trackScope:'all'})).filter(c=>c.trackKind==='audio'&&c.resourceId);
   if(audio.length!==1||audio[0].resourceId!==input.music.resourceId||audio[0].startFrame!==0||audio[0].endFrame!==plan.durationFrames)throw Error('Music clip readback differs from the full Draft interval');
  }
  commitStarted=true;const saved=await d.commitAll('Finish No.14 original Image Draft');
  if(!saved?.commitId)throw Error('Draft save response did not include its commit ID');
  return {status:'saved',projectId:input.projectId,draftId:input.draftId,clips:created,recipe:{photos:input.photos,decoration:input.decoration,framing:input.framing,music:input.music??null},fidelity:plan.fidelity};
 }catch(error){return{status:commitStarted?'outcomeUnknown':'notSaved',stage,message:String(error?.message||error),draftId:input?.draftId};}
}`;

export function buildNativeFinishScript(raw){
 const input=normalizeNativeFinish(raw),plan=nativeScenePlan(raw.fps);
 return `const input=${JSON.stringify(input)};const plan=${JSON.stringify(plan)};const EFFECT_CODE=${JSON.stringify(effectCodeFor(plan.fps))};const DECORATION_CODE=${JSON.stringify(DECORATION_CODE)};return await (${authorNativeFinishSource})(selects,input,plan);`;
}
// @operation-end

const INVENTORY=`const p=selects.project(PROJECT_ID);const resources=await p.resources();const ids=new Set(resources.filter(r=>r.type==='Image').map(r=>r.resourceId));const nodes=[];const walk=tree=>{for(const n of tree||[])n.type==='dir'?walk(n.children):nodes.push(n)};const view=await p.sourceFiles();if('fileTree' in view)walk(view.fileTree);else if('folders' in view)for(const folder of view.folders){const detail=await p.sourceFiles({folder:folder.name});if('fileTree' in detail)walk(detail.fileTree)}return nodes.filter(n=>ids.has(n.resourceId)&&n.path).map(n=>({resourceId:n.resourceId,name:n.name,path:n.path}));`;

// The editor's existing Image placement path is not exposed by the public panel SDK.
// Keep this bridge narrow, validate every selected path, and reject unknown hosts.
// A template run passes the library it resolved when it started, because it keeps
// running while the person moves to another page; the Panel reads the open Project.
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
 const outcome=await di.TimelineMutation.run(sequence,'no14:placeOriginalImages',current=>{
  const candidate=current.clone();
  for(const occurrence of plan.occurrences){
   const source=sources['ABCD'.indexOf(occurrence.slot)];
   const ids=candidate.place({working:source.analyzed,primaryTrack:source.main,primaryOffset:0,primaryClipId:source.primary.getId()},occurrence.startFrame,{kind:'overlay'});
   if(ids.length!==1)throw Error('Image placement did not create one independent clip.');
   const position=candidate.getClipPositionById(ids[0]),length=occurrence.endFrame-occurrence.startFrame;
   if(!position||position.resolvedOffset!==occurrence.startFrame)throw Error('Image placement moved from the planned frame.');
   const delta=length-position.clip.getDuration();
   if(delta!==0){
    const result=candidate.trimClipBoundary({trackId:position.trackId,clipId:ids[0],position:'end',delta});
    if(result.effectiveDelta!==delta)throw Error('Image could not be held for the planned interval.');
   }
   const final=candidate.getClipPositionById(ids[0]);
   if(!final||final.resolvedOffset!==occurrence.startFrame||final.clip.getDuration()!==length)throw Error('Image interval changed during placement.');
   placements.push({slot:occurrence.slot,appearance:occurrence.appearance,clipId:ids[0],trackId:final.trackId,startFrame:occurrence.startFrame,endFrame:occurrence.endFrame});
  }
  const overflow=candidate.getDuration('resolved')-plan.durationFrames;
  if(overflow>0)candidate.slice([{startFrame:plan.durationFrames,endFrame:plan.durationFrames+overflow}],{coordinate:'resolved'});
  if(candidate.getDuration('resolved')!==plan.durationFrames)throw Error('Image placement changed the Draft duration.');
  return candidate;
 });
 if(outcome.status!=='committed'||placements.length!==8)throw Error('Original Image placement was not confirmed.');
 if(outcome.sequence?.getDuration('resolved')!==plan.durationFrames)throw Error('Saved Image Draft duration differs from the reference.');
 for(const placement of placements){const row=outcome.sequence?.getClipPositionById(placement.clipId);if(!row||row.trackId!==placement.trackId||row.resolvedOffset!==placement.startFrame||row.clip.getDuration()!==placement.endFrame-placement.startFrame)throw Error('Saved Image placement could not be read back.');}
 return {placements,photos:sources.map(s=>({width:s.width,height:s.height})),status:outcome.status};
}

// A template run gets its own component, so it never touches the Panel's state.
export default function Panel(props){return props.context?.template?<No14TemplateRun {...props}/>:<No14Panel {...props}/>;}

// A new Draft takes its Project's frame rate and the SDK cannot change it, so the
// plan is made at that rate. Read it from a Draft this run never saves.
export async function readProjectFps(sdk,projectId){
 const probe=await sdk.runScript({script:'const d=await selects.project('+JSON.stringify(projectId)+').createDraft({name:"No.14 frame rate check"});return {fps:(await d.meta()).fps};',summary:'Read the Project frame rate',allowCommit:false});
 const fps=probe.result?.fps;
 if(probe.isError||typeof fps!=='number'||!(fps>0))throw Error('Could not read the Project frame rate.');
 return fps;
}

export const DEFAULT_DECORATION={shape:'heart',color:'#ffffff'},DEFAULT_DRAFT_NAME='No.14 photo format',DEFAULT_MUSIC='on';

// The create steps, shared by the Panel and a template run. `stillCurrent` says the
// run still belongs to its Project; `onSeed` runs just before the first save and
// `onDraft` with the Draft the later steps fill. Returns the saved result.
export async function createNo14Draft(sdk,{projectId,selected,decoration,framing,music=DEFAULT_MUSIC,name,partialDraftId=null,libraryId=null,stillCurrent,say,onSeed=()=>{},onDraft=_id=>{}}){
 const fresh=await sdk.runScript({script:INVENTORY.replace('PROJECT_ID',JSON.stringify(projectId)),summary:'Confirm selected Image sources',allowCommit:false});
 if(fresh.isError||!Array.isArray(fresh.result)||selected.some(p=>fresh.result.filter(r=>r.resourceId===p.resourceId&&r.path===p.path).length!==1))throw Error('The selected photos changed. Reload the Project photos.');
 const prepared=await prepareNativeImages(window.parent,projectId,selected,libraryId);
 if(!stillCurrent())throw Error('The Project changed. Start again in the selected Project.');
 const fps=await readProjectFps(sdk,projectId);
 const plan=nativeScenePlan(fps);
 if(plan.fps!==fps||!Number.isSafeInteger(plan.durationFrames)||plan.durationFrames<1||(fps===30&&plan.durationFrames!==266)||plan.occurrences?.length!==8)throw Error('The reference plan is incomplete.');
 let musicResource=null;
 if(music==='on'){
  say('Checking bundled music…');
  const root=await sdk.runShell({summary:'Locate bundled music',command:'printf %s "${SELECTS_USER_SKILLS_ROOT:-$HOME/.selects/skills}"'});
  if(root.isError||!root.stdout?.trim())throw Error('The installed music asset could not be located. Reinstall the plugin.');
  const musicPath=root.stdout.trim()+'/no14-still-video/assets/music.mp3';
  const imported=await sdk.runScript({summary:'Import bundled music',allowCommit:true,script:`const p=selects.project(${JSON.stringify(projectId)}),path=${JSON.stringify(musicPath)};const nodes=[];const walk=tree=>{for(const n of tree??[]){if(n.path)nodes.push(n);if(n.children)walk(n.children);}};const tree=await p.sourceFiles();if('fileTree' in tree)walk(tree.fileTree);else if('folders' in tree)for(const f of tree.folders){const part=await p.sourceFiles({folder:f.name});if('fileTree' in part)walk(part.fileTree);}const found=nodes.filter(n=>n.path===path);if(found.length>1)throw Error('Bundled music source is ambiguous.');const id=found[0]?.resourceId??(await p.importFiles({paths:[path]})).addedResourceIds[0];if(!id)throw Error('Bundled music is missing. Reinstall the plugin.');return {resourceId:id};`});
  if(imported.isError||!imported.result?.resourceId)throw Error(imported.output||'Could not import bundled music.');
  musicResource=imported.result;
  const ready=await sdk.runScript({summary:'Check music readiness',allowCommit:false,script:`const r=(await selects.project(${JSON.stringify(projectId)}).resources()).find(r=>r.resourceId===${JSON.stringify(musicResource.resourceId)});if(!r||r.type!=='Audio'||!Number.isFinite(r.durationSeconds)||r.durationSeconds<${plan.durationFrames/plan.fps})throw Error('Bundled music is not ready. Wait for the import to finish, then create the Draft again.');return true;`});
  if(ready.isError||ready.result!==true)throw Error(ready.output||'Bundled music is not ready.');
 }
 if(!stillCurrent())throw Error('The Project changed. Start again in the selected Project.');
 say('Creating an editable Image Draft…');
 let draftId;
 if(partialDraftId){
  const checkScript=`const p=selects.project(${JSON.stringify(projectId)}),id=${JSON.stringify(partialDraftId)};if(!(await p.meta()).draftIds.includes(id))throw Error('Partial Draft is not in this Project.');const d=selects.draft(id),m=await d.meta(),rows=await d.clips({trackScope:'all'});if(m.fps!==${plan.fps}||m.durationFrames!==${plan.durationFrames}||m.frameSize?.width!==${plan.canvas.width}||m.frameSize?.height!==${plan.canvas.height}||rows.some(x=>x.resourceId))throw Error('Partial Draft is not empty; inspect it before retrying.');return {draftId:id};`;
  const check=await sdk.runScript({script:checkScript,summary:'Inspect partial Image Draft',allowCommit:false});
  if(check.isError||check.result?.draftId!==partialDraftId)throw Error(check.output||'The partial Draft cannot be safely continued.');
  draftId=partialDraftId;
 }else{
  onSeed();
  const seedScript=`const p=selects.project(${JSON.stringify(projectId)});const d=await p.createDraft({name:${JSON.stringify(name)}});await d.insertGap({seconds:${plan.durationFrames/plan.fps}});await d.setFrameSize(${JSON.stringify(plan.canvas)});const m=await d.meta();if(m.fps!==${plan.fps}||m.durationFrames!==${plan.durationFrames}||m.frameSize?.width!==${plan.canvas.width}||m.frameSize?.height!==${plan.canvas.height})throw Error('No.14 Draft frame grid differs from the reference.');const saved=await d.commitAll('Start No.14 original Image Draft');return {draftId:saved.createdDraftId};`;
  const seed=await sdk.runScript({script:seedScript,summary:'Create No.14 Image Draft',allowCommit:true});
  if(seed.isError||!seed.result?.draftId){const error=Error(seed.output||'Could not create the Image Draft. Check the Project before retrying.');error.seedOutput=seed.output;throw error;}
  draftId=seed.result.draftId;
 }
 onDraft(draftId);
 const native=await placeNativeImages(prepared,draftId,plan);
 const request={mode:'native-finish',projectId,draftId,photos:selected.map((p,i)=>({resourceId:p.resourceId,path:p.path,width:native.photos[i].width,height:native.photos[i].height})),placements:native.placements,decoration,framing,music:musicResource,fps:plan.fps};
 const script=buildNativeFinishScript(request);
 const result=await sdk.runScript({script,summary:'Finish No.14 Image Draft',allowCommit:true,timeoutSeconds:120});
 if(result.isError||!result.result)throw Error(result.output||'Could not confirm the save. Check the Project before retrying.');
 if(result.result.status==='outcomeUnknown')throw Error('Save outcome is unknown. Check the Project Draft list before retrying.');
 if(result.result.status!=='saved'||!result.result.draftId)throw Error(result.result.message||'Could not save the Draft.');
 return result.result;
}

function No14Panel({sdk,context,ui}){
 const [photos,setPhotos]=React.useState([]),[slots,setSlots]=React.useState(['','','','']),[loadedProject,setLoadedProject]=React.useState(null);
 const [framing,setFraming]=React.useState({});
 const [music,setMusic]=React.useState(DEFAULT_MUSIC);
 const [shape,setShape]=React.useState(DEFAULT_DECORATION.shape),[color,setColor]=React.useState(DEFAULT_DECORATION.color),[name,setName]=React.useState(DEFAULT_DRAFT_NAME);
 const [busy,setBusy]=React.useState(false),[status,setStatus]=React.useState(''),[saved,setSaved]=React.useState(null),[partialDraftId,setPartialDraftId]=React.useState(null);
 const running=React.useRef(false),currentProject=React.useRef(context.projectId);currentProject.current=context.projectId;
 React.useEffect(()=>{setPhotos([]);setSlots(['','','','']);setFraming({});setLoadedProject(null);setSaved(null);setPartialDraftId(null);setStatus('');},[context.projectId]);
 async function load(){
  if(!context.projectId||running.current)return;running.current=true;setBusy(true);setStatus('Loading project photos…');
  try{
   const projectId=context.projectId;
   const r=await sdk.runScript({script:INVENTORY.replace('PROJECT_ID',JSON.stringify(projectId)),summary:'List project photos',allowCommit:false});
   if(r.isError||!Array.isArray(r.result))throw Error(r.output||'Could not read project photos.');
   if(currentProject.current!==projectId)return;
   setPhotos(r.result);setLoadedProject(projectId);setStatus(r.result.length?'Choose photos for A, B, C, and D.':'This Project has no photos. Import photos first.');
  }catch(error){setStatus(String(error?.message||error));}finally{running.current=false;setBusy(false);}
 }
 async function create(){
  const projectId=context.projectId;
  if(running.current||!projectId||loadedProject!==projectId||slots.some(x=>!x)||!name.trim())return;
  running.current=true;setBusy(true);setStatus('Checking original Image sources…');
  let createdDraftId=null;
  try{
   const selected=slots.map(id=>{const matches=photos.filter(p=>p.resourceId===id);if(matches.length!==1)throw Error('Check the selected photos again.');return matches[0];});
   const done=await createNo14Draft(sdk,{projectId,selected,decoration:{shape,color},framing,music,name:name.trim(),partialDraftId,stillCurrent:()=>currentProject.current===projectId,say:setStatus,onDraft:id=>{createdDraftId=id;}});
   setPartialDraftId(null);setSaved(done);setStatus('Saved Draft: '+done.draftId+'. To change one photo or the decoration, keep the other choices and create a revised Draft. The previous Draft stays available.');
  }catch(error){if(createdDraftId)setPartialDraftId(createdDraftId);setStatus(String(error?.message||error)+(createdDraftId?' The partial Draft is '+createdDraftId+'; it will be checked before continuing.':''));}finally{running.current=false;setBusy(false);}
 }
 return <ui.Stack gap={16}><ui.Section title="No.14 photo format">
  <ui.Message>Four original photos become eight independently editable Image clips. Timing and transitions are still experimental.</ui.Message>
  {!context.projectId&&<ui.Message>Open a Project first.</ui.Message>}
  <ui.Button variant="secondary" onClick={load} disabled={!context.projectId||busy} busy={busy}>Load Project photos</ui.Button>
  {['A','B','C','D'].map((slot,i)=><ui.Select key={slot} label={'Photo '+slot} value={slots[i]} onChange={value=>setSlots(old=>old.map((x,j)=>j===i?value:x))} options={photos.map(p=>({value:p.resourceId,label:p.name}))} placeholder="Choose photo" disabled={busy||loadedProject!==context.projectId}/>)}
  <details><summary>Adjust photo framing (optional)</summary><ui.Message>Move the visible area for each photo. Grid and fullscreen can have different centers.</ui.Message>
   {['A','B','C','D'].flatMap(slot=>['grid','fullscreen'].map(scene=>{const key=scene+'-'+slot,point=framing[key]||{x:.5,y:.5};return <div key={key}><p>{'Photo '+slot+' · '+scene}</p>{['x','y'].map(axis=><ui.Slider key={axis} label={axis==='x'?'Horizontal focus':'Vertical focus'} min={0} max={1} step={.01} value={point[axis]} onChange={value=>setFraming(old=>({...old,[key]:{...(old[key]||{x:.5,y:.5}),[axis]:value}}))} disabled={busy}/>)}</div>;}))}
  </details>
  <ui.Select label="Decoration" value={shape} onChange={setShape} options={[{value:'heart',label:'Heart'},{value:'star',label:'Star'},{value:'circle',label:'Circle'},{value:'none',label:'None'}]} disabled={busy}/>
  <ui.TextField label="Decoration color (#RRGGBB)" value={color} onChange={setColor} disabled={busy}/>
  <ui.Select label="Music" value={music} onChange={setMusic} options={[{value:'on',label:'Lofi again (CC0)'},{value:'off',label:'Off'}]} disabled={busy}/>
  <ui.TextField label="Draft name" value={name} onChange={setName} disabled={busy}/>
  <ui.Actions><ui.Button variant="primary" onClick={create} disabled={busy||loadedProject!==context.projectId||slots.some(x=>!x)||!/^#[0-9a-fA-F]{6}$/.test(color)||!name.trim()} busy={busy}>{partialDraftId?'Inspect and continue partial Draft':saved?'Create revised Draft':'Create new Draft'}</ui.Button></ui.Actions>
  {status&&<ui.Message>{status}</ui.Message>}
  {saved&&<ui.Button variant="secondary" onClick={()=>sdk.runScript({script:'return await selects.editor.openDraft('+JSON.stringify(saved.draftId)+');',summary:'Open saved No.14 Draft',allowCommit:false})}>Open saved Draft</ui.Button>}
 </ui.Section></ui.Stack>;
}

// --- Template run ------------------------------------------------------------
// A built-in app can run this Panel as a template: the person picks four photos
// in the app (input `photos`, in A/B/C/D order) and the app mounts the Panel out
// of sight with `context.template`. It makes a new Draft through the Panel's own
// create steps with every choice at its default (white Heart, centered grid and
// fullscreen framing, the bundled music), never opens or exports it, and ends with one
// `sdk.finishTemplate`.
const TEMPLATE_FAILED='Four Photo Reveal could not make the Draft; open it from the Plugin list to try again.';
const TEMPLATE_UNSUPPORTED='This version of Selects cannot place photos for Four Photo Reveal; update Selects, then try again.';
const templatePartial=name=>'Four Photo Reveal stopped part way, so the Draft "'+name+'" may be incomplete; check it in this Project before trying again.';
function templateIssue(message){const error=Error(message);error.publicMessage=message;return error;}
const templateUncertain=name=>'Four Photo Reveal could not confirm whether the Draft "'+name+'" was created; check this Project\'s Drafts before trying again.';
// The run report of the step that creates the Draft: its leading JSON object.
function templateReport(output){
 const text=String(output||'');
 for(let end=text.lastIndexOf('}');end>=0;end=text.lastIndexOf('}',end-1)){try{const value=JSON.parse(text.slice(0,end+1));return value&&typeof value==='object'?value:null;}catch{}}
 return null;
}
// That step failed without a Draft id: a report with an error and no committed
// edit means nothing was saved, so the cause is said; anything else may have saved.
function templateSeedMessage(error,name){
 const report=templateReport(error?.seedOutput);
 const edits=Array.isArray(report?.edits)?report.edits:[];
 if(typeof report?.error!=='string'||edits.some(edit=>edit?.committed!==false))return templateUncertain(name);
 const cause=report.error.trim().replace(/[.\s]+$/,'');
 if(/frame grid differs/.test(cause))return 'Four Photo Reveal could not set up its 720×1280 Draft in this project, so nothing was saved.';
 return cause&&cause.length<=160&&!/[\n\r{}]|Traceback|Error:|\w+_\w+:/.test(cause)?'Four Photo Reveal could not create the Draft, so nothing was saved: '+cause+'.':'Four Photo Reveal could not create the Draft, so nothing was saved; try again.';
}
// The library the run works in, as the app hands it over: the person may move to
// another page while it runs, so the app's address cannot say.
function templateLibrary(template){
 if(!template?.libraryId)throw templateIssue(TEMPLATE_UNSUPPORTED);
 return template.libraryId;
}
// The app hands over its own Resource ids; the Panel works from the run_script
// Image rows, so each pick is joined to its row by its original file, the same
// file prepareNativeImages later checks the Project's Image against.
async function templateSelection(sdk,app,projectId,libraryId,inputs){
 const picks=Array.isArray(inputs?.photos)?inputs.photos:[];
 if(picks.length!==4||picks.some(x=>x?.kind!=='image'||!x.resourceId))throw templateIssue('Pick exactly four photos, then try again.');
 const di=app?.__DI__;
 if(typeof di?.ProjectRepository?.findById!=='function'||typeof di?.ResourceRepository?.findById!=='function')throw templateIssue(TEMPLATE_UNSUPPORTED);
 const project=libraryId?await di.ProjectRepository.findById(libraryId,projectId):null;
 if(!project)throw templateIssue('Could not find this Project; open it, then try again.');
 const members=new Set(project.getResources()||[]);
 const inventory=await sdk.runScript({script:INVENTORY.replace('PROJECT_ID',JSON.stringify(projectId)),summary:'List project photos',allowCommit:false});
 if(inventory.isError||!Array.isArray(inventory.result))throw Error(inventory.output||'Could not read project photos.');
 const selected=[];
 for(const pick of picks){
  const label=pick.name||'A picked photo';
  const resource=members.has(pick.resourceId)?await di.ResourceRepository.findById(libraryId,pick.resourceId):null;
  if(!resource)throw templateIssue(label+' is missing from this Project.');
  if(resource.getType()!=='Image')throw templateIssue(label+' is not a photo Four Photo Reveal can use.');
  const media=resource.getMedia(),path=media?.originalPath??media?.path;
  const rows=path?inventory.result.filter(row=>row.path===path):[];
  if(rows.length!==1)throw templateIssue(label+' is missing from this Project or matches more than one photo.');
  selected.push(rows[0]);
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
 if(/^Could not read the Project frame rate/.test(said))return 'Four Photo Reveal could not read this project\'s frame rate; try again.';
 if(/frame rate cannot hold/.test(said))return 'Four Photo Reveal cannot fit its timing to this project\'s frame rate.';
 if(/^The selected photos changed/.test(said))return 'The picked photos changed while the Draft was being made; try again.';
 return TEMPLATE_FAILED;
}
// Nobody sees this frame, so it shows one status line. It starts once per run
// id and reports once, unless a newer run replaced it; a save that began is
// reported as a possibly incomplete Draft and never retried.
function No14TemplateRun({sdk,context}){
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
    const app=window.parent,libraryId=templateLibrary(template);
    say('Finding your photos…');
    const selected=await templateSelection(sdk,app,projectId,libraryId,template?.inputs);
    if(!live())throw Error('The template run ended before the Draft was made.');
    const done=await createNo14Draft(sdk,{projectId,selected,decoration:{...DEFAULT_DECORATION},framing:{},music:DEFAULT_MUSIC,name:DEFAULT_DRAFT_NAME,libraryId,stillCurrent:live,say,
     onSeed:()=>{if(!live())throw Error('The template run ended before the Draft was made.');seeding=true;},onDraft:id=>{draftId=id;}});
    if(done.draftId!==draftId||!Array.isArray(done.clips)||done.clips.length!==8)throw Error('The saved Draft did not report eight photo clips.');
    say('Done.');
    finish({sequenceId:done.draftId});
   }catch(error){
    console.warn('[four-photo-reveal] template run failed:',error?.message||String(error),{draftId,seeding});
    say('Stopped.');
    finish({error:draftId?templatePartial(DEFAULT_DRAFT_NAME):seeding?templateSeedMessage(error,DEFAULT_DRAFT_NAME):templateMessage(error)});
   }finally{
    finish({error:TEMPLATE_FAILED});
   }
  })();
 },[runId]);
 return <p role="status" style={{margin:0,fontSize:12,color:'var(--panel-muted-fg)'}}>{status}</p>;
}

