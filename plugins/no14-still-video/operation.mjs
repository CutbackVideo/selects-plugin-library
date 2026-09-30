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
export function nativeScenePlan(){
 const plan=scenePlan();
 return {...plan,occurrences:plan.occurrences.map(o=>o.appearance==='fullscreen'&&o.slot!=='C'?{...o,endFrame:o.endFrame+10}:o)};
}

export function revealProgress(elapsed,duration,lateEase){
 const linear=Math.max(0,Math.min(1,elapsed/duration));
 if(!lateEase||linear<=5/9)return linear;
 const u=(linear-5/9)/(4/9);
 return 5/9+(4/9)*(1-Math.pow(1-u,2.1));
}

export function gridExitFadeProgress(t,start,duration){
 const u=Math.max(0,Math.min(1,(t-start)/duration));
 return 1-u*u*(3-2*u);
}

export function transitionCoefficients(progress){
 const p=Math.max(0,Math.min(1,progress)),v=p*9,i=Math.min(8,Math.floor(v)),u=v-i;
 const alphaPoints=[0,.0901,.2356,.3011,.3622,.5160,.6777,.7667,.8582,1];
 const gainPoints=[1,1.0240,1.0451,1.0602,1.0677,1.0936,1.1063,1.0860,1.0542,1];
 const alpha=alphaPoints[i]*(1-u)+alphaPoints[i+1]*u;
 const gain=gainPoints[i]*(1-u)+gainPoints[i+1]*u;
 return {outgoing:gain*(1-alpha),incoming:gain*alpha};
}

const EFFECT_CODE=`import {useCurrentFrame} from 'remotion';
const revealProgress=${revealProgress.toString()};
const gridExitFadeProgress=${gridExitFadeProgress.toString()};
const transitionCoefficients=${transitionCoefficients.toString()};
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
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!['mode','projectId','draftId','photos','placements','decoration','framing','music'].includes(k))||raw.mode!=='native-finish')throw Error('Unsupported original Image request');
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
 const plan=nativeScenePlan();
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

export async function authorNativeFinish(selects,input,plan){
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
   await d.addVideoEffect({clip:current,label:'No.14 '+occurrence.appearance+' '+occurrence.slot,tsxCode:EFFECT_CODE,parameters:{g,startFrame:occurrence.startFrame,revealStart:occurrence.revealStart,revealDuration:occurrence.revealDuration,lateEase:occurrence.lateEase===true,fadeStart:occurrence.fadeStart??null,fadeDuration:occurrence.fadeDuration??1,radius:occurrence.radius*q,focusX:focus.x,focusY:focus.y,transitionIn:incoming?{startFrame:incoming.cutFrame,durationFrames:10}:null,transitionOut:outgoing?{startFrame:outgoing.cutFrame,durationFrames:10}:null},editableParameters:[{key:'focusX',label:'Horizontal focus',type:'number',defaultValue:focus.x,min:0,max:1,step:.01},{key:'focusY',label:'Vertical focus',type:'number',defaultValue:focus.y,min:0,max:1,step:.01}]});
  }
  for(const transition of plan.transitions){
   stage='verify transition after '+transition.after;
   const from=created.find(c=>c.appearance==='fullscreen'&&c.slot===transition.after);
   const to=created.find(c=>c.appearance==='fullscreen'&&c.startFrame===transition.cutFrame);
   if(!from||!to||from.trackId===to.trackId||from.endFrame!==to.startFrame+10)throw Error('Fullscreen Image clips must overlap for ten frames on separate tracks');
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
}

export function buildNativeFinishScript(raw){
 const input=normalizeNativeFinish(raw);
 return `const input=${JSON.stringify(input)};const plan=${JSON.stringify(nativeScenePlan())};const EFFECT_CODE=${JSON.stringify(EFFECT_CODE)};const DECORATION_CODE=${JSON.stringify(DECORATION_CODE)};return await (${authorNativeFinish.toString()})(selects,input,plan);`;
}
