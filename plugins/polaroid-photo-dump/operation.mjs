import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

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

// Decode the bundled frame and music into plugin-data once (checked by hash).
export function unpackAssets(pkgDir=path.dirname(new URL(import.meta.url).pathname),store=path.join(os.homedir(),'.selects','plugin-data','polaroid-photo-dump')){
 const manifest=JSON.parse(fs.readFileSync(path.join(pkgDir,'assets','manifest.json'),'utf8')),out={};
 fs.mkdirSync(store,{recursive:true});
 const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
 for(const [key,v] of Object.entries(manifest)){
  const dest=path.join(store,v.file);
  if(!fs.existsSync(dest)||hash(fs.readFileSync(dest))!==v.sha256){
   const data=Buffer.from(fs.readFileSync(path.join(pkgDir,'assets',v.file+'.b64'),'utf8'),'base64');
   if(hash(data)!==v.sha256)throw Error('Bundled asset does not match its manifest: '+v.file);
   const tmp=dest+'.tmp-'+process.pid;fs.writeFileSync(tmp,data);fs.renameSync(tmp,dest);
  }
  out[key]={path:dest};
 }
 return out;
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
 return <div style={{position:'absolute',left:0,right:0,top:data.top,textAlign:'center',color:data.color,fontFamily:(data.fontFamily?'"'+data.fontFamily+'", ':'')+'Helvetica, Arial, sans-serif',fontWeight:500,fontSize:data.size,lineHeight:1.1,letterSpacing:-0.3,textShadow:'0 1px 6px rgba(0,0,0,0.25)',whiteSpace:'pre-wrap',padding:'0 60px'}}>{data.text}</div>;
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

export async function authorFinish(selects,input,plan,code){
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
}

export function buildFinishScript(raw){
 const input=normalizeFinish(raw);
 return `const input=${JSON.stringify(input)};const plan=${JSON.stringify(scenePlan(input.fps))};return await (${authorFinish.toString()})(selects,input,plan,${JSON.stringify({photo:PHOTO_EFFECT,frame:FRAME_EFFECT,caption:CAPTION_CODE})});`;
}
