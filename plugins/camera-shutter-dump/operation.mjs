import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

// Measured frame-by-frame from the reference (30 fps, 279 frames, 718x1280).
// Each photo appears at its cut frame and stays until the end, stacked above the
// previous ones on black. Tiles that bleed off-canvas keep a 3:4 (or 4:3) size
// inferred from their visible edges. `sfxFrame` is the first autofocus beep of
// that photo's shutter sound, measured from the reference audio.
const SLOTS=[
 {cut:17,sfx:7,rect:{x:157,y:371,width:404,height:539}},
 {cut:41,sfx:30,rect:{x:291,y:744,width:427,height:569}},
 {cut:61,sfx:50,rect:{x:0,y:-17,width:407,height:543}},
 {cut:83,sfx:73,rect:{x:-8,y:651,width:472,height:629}},
 {cut:103,sfx:92,rect:{x:202,y:-53,width:516,height:688}},
 {cut:124,sfx:113,rect:{x:-37,y:369,width:436,height:582}},
 {cut:148,sfx:137,rect:{x:320,y:459,width:413,height:551}},
 {cut:170,sfx:159,rect:{x:44,y:82,width:397,height:529}},
 {cut:193,sfx:183,rect:{x:260,y:378,width:392,height:524}},
 {cut:213,sfx:202,rect:{x:45,y:701,width:390,height:521}},
 {cut:234,sfx:224,rect:{x:158,y:232,width:402,height:302}},
 {cut:255,sfx:245,rect:{x:158,y:796,width:401,height:300}}
];
export const SLOT_COUNT=SLOTS.length;
const SFX_FRAMES=14;

// Reference frames are 30 fps; a Draft at another rate gets the same times in its own frames.
export function scenePlan(fps=30){
 if(!Number.isFinite(fps)||fps<10||fps>120)throw Error('Unsupported Draft frame rate');
 const at=f=>Math.round(f*fps/30),durationFrames=at(279),sfxFrames=Math.floor(SFX_FRAMES*fps/30+1e-6);
 return {fps,canvas:{width:720,height:1280},durationFrames,
  occurrences:SLOTS.map((s,i)=>({slot:i+1,startFrame:at(s.cut),endFrame:durationFrames,rect:s.rect})),
  sounds:SLOTS.map((s,i)=>({slot:i+1,key:'shutter.'+(i%6+1),startFrame:at(s.sfx),endFrame:at(s.sfx)+sfxFrames}))};
}

// Decode the bundled sounds into plugin-data once; file names are fixed and
// checked by hash, so an existing verified file is reused.
export function unpackSounds(pkgDir=path.dirname(new URL(import.meta.url).pathname),store=path.join(os.homedir(),'.selects','plugin-data','camera-shutter-dump','sfx')){
 const manifest=JSON.parse(fs.readFileSync(path.join(pkgDir,'sfx','manifest.json'),'utf8')),out={};
 fs.mkdirSync(store,{recursive:true});
 for(const [key,v] of Object.entries(manifest)){
  const dest=path.join(store,v.file),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
  if(!fs.existsSync(dest)||hash(fs.readFileSync(dest))!==v.sha256){
   const data=Buffer.from(fs.readFileSync(path.join(pkgDir,'sfx',v.file+'.b64'),'utf8'),'base64');
   if(hash(data)!==v.sha256)throw Error('Bundled sound does not match its manifest: '+v.file);
   const tmp=dest+'.tmp-'+process.pid;fs.writeFileSync(tmp,data);fs.renameSync(tmp,dest);
  }
  out[key]={path:dest,duration:v.duration};
 }
 return out;
}

// Crops the photo to its slot rectangle (cover) around an editable focus point.
const EFFECT_CODE=`export default function ShutterDumpCrop({Source,data}) {
 const g=data.g;
 const x=Math.max(g.mw-g.w,Math.min(0,g.mw/2-data.focusX*g.w));
 const y=Math.max(g.mh-g.h,Math.min(0,g.mh/2-data.focusY*g.h));
 return <div style={{position:'absolute',inset:0}}><div style={{position:'absolute',left:g.left,top:g.top,width:g.mw,height:g.mh,overflow:'hidden'}}><div style={{position:'absolute',left:x,top:y,width:g.w,height:g.h}}><Source /></div></div></div>;
}`;

export function normalizeFinish(raw){
 const keys=['mode','projectId','draftId','fps','photos','placements','framing','sounds'];
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!keys.includes(k))||raw.mode!=='finish')throw Error('Unsupported request');
 const clean=(value,label,max=1000)=>{if(typeof value!=='string'||!value.trim()||value!==value.trim()||value.length>max||/[\u0000-\u001f]/u.test(value))throw Error(label+' is required');return value;};
 const projectId=clean(raw.projectId,'Project ID'),draftId=clean(raw.draftId,'Draft ID',120);
 if(!Array.isArray(raw.photos)||raw.photos.length!==SLOT_COUNT)throw Error('Choose exactly '+SLOT_COUNT+' photos');
 const photos=raw.photos.map(photo=>{
  if(!photo||typeof photo!=='object'||Array.isArray(photo)||Object.keys(photo).some(k=>!['resourceId','width','height'].includes(k)))throw Error('Invalid Image Resource');
  if(!Number.isSafeInteger(photo.width)||photo.width<1||!Number.isSafeInteger(photo.height)||photo.height<1)throw Error('Invalid Image dimensions');
  return {resourceId:clean(photo.resourceId,'Image Resource ID'),width:photo.width,height:photo.height};
 });
 const framing=[];
 const inFraming=raw.framing??[];
 if(!Array.isArray(inFraming)||inFraming.length>SLOT_COUNT)throw Error('Invalid photo framing');
 for(let i=0;i<SLOT_COUNT;i++){const p=inFraming[i]??{x:.5,y:.5},x=p.x??.5,y=p.y??.5;if(!Number.isFinite(x)||x<0||x>1||!Number.isFinite(y)||y<0||y>1)throw Error('Photo framing must be between 0 and 1');framing.push({x,y});}
 const plan=scenePlan(raw.fps??30);
 if(!Array.isArray(raw.placements)||raw.placements.length!==SLOT_COUNT)throw Error('Expected '+SLOT_COUNT+' Image clips');
 raw.placements.forEach((row,i)=>{const o=plan.occurrences[i];if(!row||typeof row!=='object'||row.slot!==o.slot||!Number.isSafeInteger(row.clipId)||row.clipId<0||typeof row.trackId!=='string'||!row.trackId||row.startFrame!==o.startFrame||row.endFrame!==o.endFrame)throw Error('Image placement differs from the reference plan');});
 if(new Set(raw.placements.map(p=>p.clipId)).size!==SLOT_COUNT)throw Error('Image clips must be independent');
 const sounds={};
 for(const s of plan.sounds){const id=raw.sounds?.[s.key];sounds[s.key]=clean(id,'Shutter sound Resource ID');}
 return {projectId,draftId,fps:plan.fps,photos,placements:raw.placements.map(p=>({slot:p.slot,clipId:p.clipId,trackId:p.trackId,startFrame:p.startFrame,endFrame:p.endFrame})),framing,sounds};
}

export async function authorFinish(selects,input,plan,EFFECT_CODE){
 let commitStarted=false,stage='read';
 try{
  const project=selects.project(input.projectId),d=selects.draft(input.draftId);
  if(!(await project.meta()).draftIds?.includes(input.draftId))throw Error('Draft is not in the selected Project');
  const meta=await d.meta();
  if(meta.fps!==plan.fps||meta.durationFrames!==plan.durationFrames||meta.frameSize?.width!==plan.canvas.width||meta.frameSize?.height!==plan.canvas.height)throw Error('Draft frame grid changed');
  const types=new Map((await project.resources()).map(r=>[r.resourceId,r.type]));
  for(const [key,id] of Object.entries(input.sounds))if(types.get(id)!=='Audio')throw Error('Shutter sound is not an Audio resource: '+key);
  const rows=await d.clips({trackScope:'all'});
  for(const [i,o] of plan.occurrences.entries()){
   const placed=input.placements[i],photo=input.photos[i];
   const clip=rows.find(c=>c.clipId===placed.clipId&&c.trackId===placed.trackId);
   if(!clip||clip.startFrame!==o.startFrame||clip.endFrame!==o.endFrame||clip.resourceId!==photo.resourceId||types.get(clip.resourceId)!=='Image')throw Error('Image clip readback differs from the plan (photo '+o.slot+')');
  }
  for(const [i,o] of plan.occurrences.entries()){
   const placed=input.placements[i],photo=input.photos[i],r=o.rect,w=photo.width,h=photo.height;
   const clip=(await d.clips({trackScope:'all'})).find(c=>c.clipId===placed.clipId&&c.trackId===placed.trackId);
   if(!clip)throw Error('Image clip changed during authoring');
   // q: source pixels per canvas pixel after cover-cropping into the slot; c: the
   // editor's default fit of the whole photo into the canvas.
   const q=Math.min(w/r.width,h/r.height),c=Math.min(plan.canvas.width/w,plan.canvas.height/h);
   const g={w,h,mw:r.width*q,mh:r.height*q,left:(w-r.width*q)/2,top:(h-r.height*q)/2};
   const position={x:(r.x+r.width/2-plan.canvas.width/2)/plan.canvas.height*100,y:(plan.canvas.height/2-r.y-r.height/2)/plan.canvas.height*100};
   stage='transform photo '+o.slot;
   await d.setClipTransform({clip,enabled:true,scale:{x:1/(q*c),y:1/(q*c)},position,anchor:{x:0,y:0},rotation:0});
   const current=(await d.clips({trackScope:'all'})).find(c=>c.clipId===clip.clipId&&c.trackId===clip.trackId);
   const focus=input.framing[i];
   stage='crop photo '+o.slot;
   await d.addVideoEffect({clip:current,label:'Photo '+o.slot+' crop',tsxCode:EFFECT_CODE,parameters:{g,focusX:focus.x,focusY:focus.y},editableParameters:[{key:'focusX',label:'Horizontal focus',type:'number',defaultValue:focus.x,min:0,max:1,step:.01},{key:'focusY',label:'Vertical focus',type:'number',defaultValue:focus.y,min:0,max:1,step:.01}]});
  }
  const sounds=[];
  for(const s of plan.sounds){
   stage='shutter sound '+s.slot;
   const r=await d.overlayResource({resource:project.resource(input.sounds[s.key]),over:await d.rangeAtFrames(s.startFrame,s.endFrame)});
   sounds.push({slot:s.slot,atFrame:r.atFrame});
  }
  stage='readback';
  const after=await d.clips({trackScope:'all'});
  const audio=after.filter(c=>Object.values(input.sounds).includes(c.resourceId));
  if(audio.length!==plan.sounds.length)throw Error('Expected '+plan.sounds.length+' shutter sound clips, found '+audio.length);
  for(const s of plan.sounds)if(!audio.some(c=>c.startFrame===s.startFrame))throw Error('Shutter sound '+s.slot+' is not at frame '+s.startFrame);
  commitStarted=true;const saved=await d.commitAll('Finish Camera Shutter Dump Draft');
  if(!saved?.commitId)throw Error('Draft save response did not include its commit ID');
  return {status:'saved',projectId:input.projectId,draftId:input.draftId,clips:input.placements,sounds};
 }catch(error){return {status:commitStarted?'outcomeUnknown':'notSaved',stage,message:String(error?.message||error),draftId:input?.draftId};}
}

export function buildFinishScript(raw){
 const input=normalizeFinish(raw);
 return `const input=${JSON.stringify(input)};const plan=${JSON.stringify(scenePlan(input.fps))};return await (${authorFinish.toString()})(selects,input,plan,${JSON.stringify(EFFECT_CODE)});`;
}
