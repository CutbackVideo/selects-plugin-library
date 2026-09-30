import fs from 'node:fs';
import path from 'node:path';

// Measured frame by frame from the reference (30 fps, 347 frames, 1080x1440).
// Four photos A-D cycle. Intro: two fast rounds with a light blur. Then 32 black
// frames, then one photo per beat (0.631 s, ~95 BPM) whose first three frames are
// heavily blurred and shaken, then a dark radial gradient fades to black.
const INTRO=[['A',0,5],['B',5,12],['C',12,17],['D',17,24],['A',24,28],['B',28,36],['C',36,40],['D',40,48]];
const MAIN=[80,98,117,136,155,174,193,212,231,250,269,288,307,325];
export const SLOTS=['A','B','C','D'];
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
  ...MAIN.slice(0,-1).map((s,i)=>({slot:SLOTS[i%4],kind:'hit',refStart:s,startFrame:at(s),endFrame:at(MAIN[i+1])}))
 ];
 return {fps,canvas:{width:1080,height:1440},durationFrames:at(REF.durationFrames),occurrences,
  outro:{startFrame:at(REF.outroStart),endFrame:at(REF.durationFrames)}};
}

export function musicFile(pkgDir=path.dirname(new URL(import.meta.url).pathname)){
 const file=path.join(pkgDir,'assets','music.mp3');
 if(!fs.existsSync(file))throw Error('Bundled music is missing: '+file);
 return {path:file};
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
 const box={position:'absolute',left:x,top:y+shake,width:g.w,height:g.h};
 return <div style={{position:'absolute',inset:0}}><div style={{position:'absolute',left:g.left,top:g.top,width:g.mw,height:g.mh,overflow:'hidden'}}><div style={box}><Source /></div>{blur>0&&<div style={{...box,filter:'blur('+blur+'px)'}}><Source /></div>}</div></div>;
}`;
// The blurred copy sits over a sharp copy so its soft edges never fade to black.
// The blurred copy sits over a sharp copy so its soft edges never fade to black.

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
 const framing=SLOTS.map((_,i)=>{const p=inFraming[i]??{x:.5,y:.5},x=p.x??.5,y=p.y??.5;if(!Number.isFinite(x)||x<0||x>1||!Number.isFinite(y)||y<0||y>1)throw Error('Photo framing must be between 0 and 1');return {x,y};});
 const plan=scenePlan(raw.fps??30);
 if(!Array.isArray(raw.placements)||raw.placements.length!==plan.occurrences.length)throw Error('Expected '+plan.occurrences.length+' Image clips');
 raw.placements.forEach((row,i)=>{const o=plan.occurrences[i];if(!row||typeof row!=='object'||row.slot!==o.slot||!Number.isSafeInteger(row.clipId)||row.clipId<0||typeof row.trackId!=='string'||!row.trackId||row.startFrame!==o.startFrame||row.endFrame!==o.endFrame)throw Error('Image placement differs from the reference plan');});
 if(new Set(raw.placements.map(p=>p.clipId)).size!==raw.placements.length)throw Error('Image clips must be independent');
 return {projectId,draftId,fps:plan.fps,photos,framing,musicResourceId,placements:raw.placements.map(p=>({slot:p.slot,clipId:p.clipId,trackId:p.trackId,startFrame:p.startFrame,endFrame:p.endFrame}))};
}

export async function authorFinish(selects,input,plan,look,EFFECT_CODE,OUTRO_CODE){
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
}

export function buildFinishScript(raw){
 const input=normalizeFinish(raw);
 return `const input=${JSON.stringify(input)};const plan=${JSON.stringify(scenePlan(input.fps))};return await (${authorFinish.toString()})(selects,input,plan,${JSON.stringify(LOOK)},${JSON.stringify(EFFECT_CODE)},${JSON.stringify(OUTRO_CODE)});`;
}
