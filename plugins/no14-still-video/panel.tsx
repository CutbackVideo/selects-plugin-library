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
 if(fps===30)return keyedPlan({...plan,overlapFrames:10,occurrences:plan.occurrences.map(o=>o.appearance==='fullscreen'&&o.slot!=='C'?{...o,endFrame:o.endFrame+10}:o)});
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
 return keyedPlan(converted);
}
// Semin's reference edit (Music on, the default): the bundled song from 26.2 s under 196 frames at 25 fps. Her
// clips sit at hand-edited frames while each clip's No.14 effect keeps the plugin's own 25 fps timing
// (nativeScenePlan), so each animation runs from where its clip starts, as in her Draft. Another rate scales every
// clip frame by round(f*fps/25). The grid clips and fullscreen C carry the "Fade down" preset (reveal-fade-down).
export function seminScenePlan(fpsInput){
 const fps=planFps(fpsInput),at=f=>Math.round(f*fps/25),base=nativeScenePlan(fps);
 const clips={'grid-A':[0,113,.6],'grid-B':[0,113,.6],'grid-C':[0,113,.6],'grid-D':[0,113,.6],'fullscreen-A':[95,143],'fullscreen-B':[127,161],'fullscreen-D':[143,175],'fullscreen-C':[161,196,.5]};
 const occurrences=base.occurrences.map(o=>{const [s,e,fadeDown]=clips[o.key];return {...o,startFrame:at(s),endFrame:at(e),effectStartFrame:o.startFrame,fadeDown:fadeDown||0};});
 if(occurrences.some(o=>!(o.endFrame>o.startFrame)))throw Error('This project frame rate cannot hold the No.14 timing');
 return {...base,durationFrames:at(196),fidelity:'semin-reference',occurrences,musicStartSeconds:26.2};
}
// Keys for the single reference phrase. Each clip's effect starts with it, no Fade down preset, music from 0 s.
export function keyedPlan(plan){
 const occurrences=plan.occurrences.map(o=>({...o,key:o.appearance+'-'+o.slot,effectStartFrame:o.startFrame,fadeDown:0}));
 const transitions=plan.transitions.map(t=>({...t,from:'fullscreen-'+t.after,to:occurrences.find(o=>o.appearance==='fullscreen'&&o.startFrame===t.cutFrame).key}));
 return {...plan,occurrences,transitions,musicStartSeconds:0};
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

export function normalizeNativeFinish(raw,plan=nativeScenePlan(raw?.fps)){
 return normalizeNativeFinishForPlan(raw,plan);
}
export function normalizeNativeFinishForPlan(raw,plan,unsaved=false){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!['mode','projectId','draftId','photos','placements','decoration','framing','music','fps'].includes(k))||raw.mode!=='native-finish')throw Error('Unsupported original Image request');
 const clean=(value,label,max=1000)=>{if(typeof value!=='string'||!value.trim()||value!==value.trim()||value.length>max||/[\u0000-\u001f]/u.test(value))throw Error(label+' is required');return value;};
 const projectId=clean(raw.projectId,'Project ID'),draftId=unsaved&&raw.draftId===null?null:clean(raw.draftId,'Draft ID',120);
 if(!Array.isArray(raw.photos)||raw.photos.length!==4)throw Error('Choose exactly four original Images');
 const photos=raw.photos.map(photo=>{
  if(!photo||typeof photo!=='object'||Array.isArray(photo)||Object.keys(photo).some(k=>!['resourceId','path','width','height'].includes(k)))throw Error('Invalid Image Resource');
  const resourceId=clean(photo.resourceId,'Image Resource ID'),path=clean(photo.path,'Image source path',8192);
  // An absolute path on either OS: /Users/… on macOS, C:\… or \\server\… on Windows.
  if(!/^(?:\/|[A-Za-z]:[\\/]|\\\\)/.test(path)||!Number.isSafeInteger(photo.width)||photo.width<1||!Number.isSafeInteger(photo.height)||photo.height<1)throw Error('Invalid Image dimensions or path');
  return {resourceId,path,width:photo.width,height:photo.height};
 });
 const decoration=raw.decoration??{shape:'none',color:'#ffffff'};
 if(!decoration||typeof decoration!=='object'||Array.isArray(decoration)||Object.keys(decoration).some(k=>!['shape','color'].includes(k))||!['heart','star','circle','none'].includes(decoration.shape)||!/^#[0-9a-fA-F]{6}$/.test(decoration.color))throw Error('Choose a decoration shape and hex color');
 const framingInput=raw.framing??{},framing={};
 const keys=['grid','fullscreen'].flatMap(scene=>['A','B','C','D'].map(slot=>scene+'-'+slot));
 if(!framingInput||typeof framingInput!=='object'||Array.isArray(framingInput)||Object.keys(framingInput).some(key=>!keys.includes(key)))throw Error('Invalid photo framing');
 for(const key of keys){const point=framingInput[key]??{x:.5,y:.5};if(!point||typeof point!=='object'||Array.isArray(point)||Object.keys(point).some(k=>!['x','y'].includes(k)))throw Error('Invalid photo framing');const x=point.x??.5,y=point.y??.5;if(!Number.isFinite(x)||x<0||x>1||!Number.isFinite(y)||y<0||y>1)throw Error('Photo framing must be between 0 and 1');framing[key]={x,y};}
 const music=raw.music??null;
 if(music!==null&&(!music||typeof music!=='object'||Array.isArray(music)||Object.keys(music).some(k=>k!=='resourceId')))throw Error('Invalid music Resource');
 if(music)clean(music.resourceId,'Music Resource ID');
 const count=plan.occurrences.length;
 if(!Array.isArray(raw.placements)||raw.placements.length!==count)throw Error('Expected '+count+' original Image clips');
 const placementByKey=new Map();
 for(const row of raw.placements){
  if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).some(k=>!['key','slot','appearance','clipId','trackId','startFrame','endFrame'].includes(k))||!Number.isSafeInteger(row.clipId)||row.clipId<0||typeof row.trackId!=='string'||!row.trackId)throw Error('Invalid Image placement');
  const key=row.key??row.appearance+'-'+row.slot; // the single reference phrase keys as appearance-slot (keyedPlan)
  if(typeof key!=='string'||placementByKey.has(key))throw Error('Duplicate Image placement');
  placementByKey.set(key,row);
 }
 for(const occurrence of plan.occurrences){const row=placementByKey.get(occurrence.key);if(!row||row.startFrame!==occurrence.startFrame||row.endFrame!==occurrence.endFrame)throw Error('Image placement differs from the reference plan');}
 if(new Set(raw.placements.map(p=>p.clipId)).size!==count)throw Error('Image clips must be independent');
 return {projectId,draftId,photos,placements:raw.placements.map(row=>({...row,key:row.key??row.appearance+'-'+row.slot})),decoration,framing,music};
}

export const authorNativeFinishSource=String.raw`async function authorNativeFinish(selects,input,plan,workingDraft=null,inspectGraphics=null,inspectTransforms=null,inspectAudio=null,programs=null){
 let commitStarted=false,stage='read';
 try{
  const project=selects.project(input.projectId),d=workingDraft||selects.draft(input.draftId);
  if(!workingDraft&&!(await project.meta()).draftIds?.includes(input.draftId))throw Error('Draft is not in the selected Project');
  const meta=await d.meta();
  if(meta.fps!==plan.fps||meta.durationFrames!==plan.durationFrames||meta.frameSize?.width!==plan.canvas.width||meta.frameSize?.height!==plan.canvas.height)throw Error('Draft frame grid changed');
  const rows=await d.clips({trackScope:'all'}),images=rows.filter(c=>c.trackKind==='video'&&c.resourceId);
  if(images.length!==plan.occurrences.length)throw Error('Expected exactly '+plan.occurrences.length+' original Image clips');
  const resources=await project.resources(),types=new Map(resources.map(r=>[r.resourceId,r.type]));
  if(input.music){
   stage='music preflight';
   const music=resources.find(r=>r.resourceId===input.music.resourceId);
   if(!music||music.type!=='Audio'||!Number.isFinite(music.durationSeconds)||music.durationSeconds<plan.musicStartSeconds+plan.durationFrames/plan.fps)throw Error('Music must be a ready Audio Resource covering the whole Draft');
   if(rows.some(c=>c.trackKind==='audio'&&c.resourceId))throw Error('This new Draft already contains audio; inspect it before continuing');
  }
  const created=[],transforms=[],programTargets=[];
  const preset=workingDraft&&plan.occurrences.some(o=>o.fadeDown)?await programs.preset('reveal-fade-down'):null;
  for(const occurrence of plan.occurrences){
   const placed=input.placements.find(p=>p.key===occurrence.key);
   const photo=input.photos['ABCD'.indexOf(occurrence.slot)];
   const clip=images.find(c=>c.clipId===placed?.clipId);
   if(!clip||clip.trackId!==placed.trackId||clip.startFrame!==occurrence.startFrame||clip.endFrame!==occurrence.endFrame||clip.resourceId!==photo.resourceId||types.get(clip.resourceId)!=='Image')throw Error('Original Image clip readback differs from the plan');
   created.push({...placed,resourceId:photo.resourceId});
  }
  if(new Set(created.map(c=>c.clipId)).size!==plan.occurrences.length)throw Error('Image clips are not independent');
  for(const occurrence of plan.occurrences){
   const placed=input.placements.find(p=>p.key===occurrence.key);
   const clip=(await d.clips({trackScope:'all'})).find(c=>c.clipId===placed.clipId&&c.trackId===placed.trackId);
   if(!clip)throw Error('Image clip changed during authoring');
   const photo=input.photos['ABCD'.indexOf(occurrence.slot)],r=occurrence.rect,w=photo.width,h=photo.height,q=Math.min(w/r.width,h/r.height),c=Math.min(plan.canvas.width/w,plan.canvas.height/h);
   const g={w,h,mw:r.width*q,mh:r.height*q,left:(w-r.width*q)/2,top:(h-r.height*q)/2};
   const position={x:(r.x+r.width/2-plan.canvas.width/2)/plan.canvas.height*100,y:(plan.canvas.height/2-r.y-r.height/2)/plan.canvas.height*100};
   stage='transform '+occurrence.appearance+' '+occurrence.slot;
   const transform={enabled:true,scale:{x:1/(q*c),y:1/(q*c)},position,anchor:{x:0,y:0},rotation:0};
   await d.setClipTransform({clip,...transform});
   transforms.push({clipId:clip.clipId,trackId:clip.trackId,transform});
   const current=(await d.clips({trackScope:'all'})).find(c=>c.clipId===clip.clipId&&c.trackId===clip.trackId);
   const focus=input.framing[occurrence.appearance+'-'+occurrence.slot];
   stage='effect '+occurrence.appearance+' '+occurrence.slot;
   const target={clipId:clip.clipId,trackId:clip.trackId,effects:[],graphic:null};programTargets.push(target);
   const incoming=plan.transitions.find(t=>t.to===occurrence.key);
   const outgoing=plan.transitions.find(t=>t.from===occurrence.key);
   const effect={name:'No.14 '+occurrence.appearance+' '+occurrence.slot,tsxCode:EFFECT_CODE,parameters:{g,startFrame:occurrence.effectStartFrame,revealStart:occurrence.revealStart,revealDuration:occurrence.revealDuration,lateEase:occurrence.lateEase===true,fadeStart:occurrence.fadeStart??null,fadeDuration:occurrence.fadeDuration??1,radius:occurrence.radius*q,focusX:focus.x,focusY:focus.y,transitionIn:incoming?{startFrame:incoming.cutFrame,durationFrames:plan.overlapFrames??10}:null,transitionOut:outgoing?{startFrame:outgoing.cutFrame,durationFrames:plan.overlapFrames??10}:null},editableParameters:[{key:'focusX',label:'Horizontal focus',type:'number',defaultValue:focus.x,min:0,max:1,step:.01},{key:'focusY',label:'Vertical focus',type:'number',defaultValue:focus.y,min:0,max:1,step:.01}]};
   await d.addVideoEffect({clip:current,label:effect.name,tsxCode:effect.tsxCode,parameters:effect.parameters,editableParameters:effect.editableParameters});
   target.effects.push(effect);
   if(occurrence.fadeDown){
    stage='Fade down '+occurrence.appearance+' '+occurrence.slot;
    const withEffect=(await d.clips({trackScope:'all'})).find(c=>c.clipId===clip.clipId&&c.trackId===clip.trackId);
    const parameters={style:'fade',direction:'out',span:occurrence.fadeDown,amount:60};
    await d.applyEffectPreset({clip:withEffect,presetId:'reveal-fade-down',parameters});
    if(workingDraft)target.effects.push({...preset,parameters:{...preset.parameters,...parameters}});
   }
  }
  // Semin's hand-edited clips overlap by other lengths than the effects' crossfade; only the plugin's own plan is checked.
  if(plan.fidelity!=='semin-reference')for(const transition of plan.transitions){
   stage='verify transition after '+transition.after;
   const from=created.find(c=>c.key===transition.from);
   const to=created.find(c=>c.key===transition.to);
   if(!from||!to||from.trackId===to.trackId||from.endFrame!==to.startFrame+(plan.overlapFrames??10))throw Error('Fullscreen Image clips must overlap for ten frames on separate tracks');
  }
  stage='decoration';
  const decorationProgram={tsxCode:DECORATION_CODE,parameters:{...input.decoration,size:29,x:1.5,y:3.5},editableParameters:[{key:'shape',label:'Decoration',type:'select',defaultValue:input.decoration.shape,options:['heart','star','circle','none'].map(s=>({label:s,value:s}))},{key:'color',label:'Color',type:'color',defaultValue:input.decoration.color},{key:'size',label:'Size',type:'number',defaultValue:29,min:1,max:160,step:1},{key:'x',label:'Horizontal position',type:'number',defaultValue:1.5,min:-300,max:300,step:.5},{key:'y',label:'Vertical position',type:'number',defaultValue:3.5,min:-500,max:500,step:.5}]};
  const placedGraphic=await d.addMotionGraphic({label:'No.14 decoration',within:await d.rangeAtFrames(0,plan.durationFrames),...decorationProgram});
  let graphics,verifiedTransforms,verifiedPrograms;
  if(workingDraft){
   const clip=(await d.clips({trackScope:'all'})).find(c=>c.clipId===placedGraphic?.clipId);
   if(!clip)throw Error('Decoration graphic placement could not be confirmed.');
   graphics=[{clipId:clip.clipId,trackId:clip.trackId,startFrame:0,endFrame:plan.durationFrames,parameters:{...input.decoration,size:29,x:1.5,y:3.5}}];
   await inspectGraphics(d,graphics);
   transforms.push({clipId:clip.clipId,trackId:clip.trackId,transform:{}});
   programTargets.push({clipId:clip.clipId,trackId:clip.trackId,effects:[],graphic:decorationProgram});
   verifiedTransforms=await inspectTransforms(d,transforms);
  }
  if(input.music){
   stage='music';
   // The Draft was seeded with the song on Main (createNo14Draft), from plan.musicStartSeconds.
   const audio=(await d.clips({trackScope:'all'})).filter(c=>c.trackKind==='main'&&c.resourceId);
   if(audio.length!==1||audio[0].resourceId!==input.music.resourceId||audio[0].startFrame!==0||audio[0].endFrame!==plan.durationFrames)throw Error('Music clip readback differs from the full Draft interval');
  }
  let verifiedAudio;
  if(workingDraft){
   const main=(await d.clips({trackScope:'all'})).filter(c=>c.trackKind==='main'&&c.resourceId);
   const expected=input.music?main.map(c=>({clipId:c.clipId,trackId:c.trackId,trackKind:'main',resourceId:input.music.resourceId,startFrame:0,endFrame:plan.durationFrames,audioSourceIndexes:null,source:{startSeconds:plan.musicStartSeconds,endSeconds:plan.musicStartSeconds+plan.durationFrames/plan.fps}})):[];
   verifiedAudio=await inspectAudio(d,expected,project);
   verifiedPrograms=await programs.inspect(d,programTargets);
   programs.confirm({graphics,transforms:verifiedTransforms,audio:verifiedAudio,programs:verifiedPrograms});
  }
  commitStarted=true;const saved=await d.commitAll('Finish No.14 original Image Draft');
  const draftId=saved?.createdDraftId||input.draftId;
  if(!draftId||(!saved?.commitId&&!saved?.createdDraftId))throw Error('Draft save response did not include its identity');
  return {status:'saved',projectId:input.projectId,draftId,clips:created,...graphics?{graphics,transforms:verifiedTransforms,audio:verifiedAudio,programs:verifiedPrograms}:{},recipe:{photos:input.photos,decoration:input.decoration,framing:input.framing,music:input.music??null},fidelity:plan.fidelity};
 }catch(error){return{status:commitStarted?'outcomeUnknown':'notSaved',stage,message:String(error?.message||error),draftId:input?.draftId};}
}`;

export function buildNativeFinishScript(raw,plan=nativeScenePlan(raw?.fps)){
 const input=normalizeNativeFinish(raw,plan);
 return `const input=${JSON.stringify(input)};const plan=${JSON.stringify(plan)};const EFFECT_CODE=${JSON.stringify(effectCodeFor(plan.fps))};const DECORATION_CODE=${JSON.stringify(DECORATION_CODE)};return await (${authorNativeFinishSource})(selects,input,plan);`;
}
// The step that creates the Draft: Main holds the song from plan.musicStartSeconds (Music on) or a gap (Music off),
// as long as the plan; then the 720x1280 frame size.
export function seedDraftScript(projectId,name,plan,musicResourceId){
 return `const p=selects.project(${JSON.stringify(projectId)});const d=await p.createDraft({name:${JSON.stringify(name)}});${musicResourceId?`await d.insertResource({resourceId:${JSON.stringify(musicResourceId)},sourceRange:{startSeconds:${plan.musicStartSeconds},endSeconds:${plan.musicStartSeconds+plan.durationFrames/plan.fps}}});`:`await d.insertGap({seconds:${plan.durationFrames/plan.fps}});`}await d.setFrameSize(${JSON.stringify(plan.canvas)});const m=await d.meta();if(m.fps!==${plan.fps}||m.durationFrames!==${plan.durationFrames}||m.frameSize?.width!==${plan.canvas.width}||m.frameSize?.height!==${plan.canvas.height})throw Error('No.14 Draft frame grid differs from the reference.');const saved=await d.commitAll('Start No.14 original Image Draft');return {draftId:saved.createdDraftId};`;
}
// @operation-end

const INVENTORY=`const p=selects.project(PROJECT_ID);const resources=await p.resources();const ids=new Set(resources.filter(r=>r.type==='Image').map(r=>r.resourceId));const nodes=[];const walk=tree=>{for(const n of tree||[])n.type==='dir'?walk(n.children):nodes.push(n)};const view=await p.sourceFiles();if('fileTree' in view)walk(view.fileTree);else if('folders' in view)for(const folder of view.folders){const detail=await p.sourceFiles({folder:folder.name});if('fileTree' in detail)walk(detail.fileTree)}return nodes.filter(n=>ids.has(n.resourceId)&&n.path&&(!scope.paths||scope.paths.includes(n.path))).map(n=>({resourceId:n.resourceId,name:n.name,path:n.path}));`;

// native-sdk:start
// Read verified Project resources and place editable images through the Draft working copy.
// file-observation:start
// Generated by tools/build_file_observation.mjs; edit file-observation.source.js.
async function fingerprintTemplateFile(files,path,check=()=>{}) {
/* @noble/hashes 2.2.0; license retained inside serialized SDK copies.
The MIT License (MIT)

Copyright (c) 2022 Paul Miller (https://paulmillr.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the “Software”), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
const __templateHashAny=value=>value;
var __templateFileHash = __templateHashAny((() => { var w = __templateHashAny(Object).defineProperty; var G = __templateHashAny(Object).getOwnPropertyDescriptor; var V = __templateHashAny(Object).getOwnPropertyNames; var O = __templateHashAny(__templateHashAny(Object).prototype).hasOwnProperty; var k = (t, e, r) => e in t ? __templateHashAny(w)(t, e, { enumerable: !0, configurable: !0, writable: !0, value: r }) : __templateHashAny(t)[e] = r; var R = (t, e) => { for (var r in e)
    __templateHashAny(w)(t, r, { get: __templateHashAny(e)[r], enumerable: !0 }); }, $ = (t, e, r, o) => { if (e && typeof e == "object" || typeof e == "function")
    for (let n of __templateHashAny(V)(e))
        !__templateHashAny(O).call(t, n) && n !== r && __templateHashAny(w)(t, n, { get: () => __templateHashAny(e)[n], enumerable: !(o = __templateHashAny(G)(e, n)) || __templateHashAny(o).enumerable }); return t; }; var M = t => __templateHashAny($)(__templateHashAny(w)({}, "__esModule", { value: !0 }), t); var a = (t, e, r) => __templateHashAny(k)(t, typeof e != "symbol" ? e + "" : e, r); var N = {}; __templateHashAny(R)(N, { sha256: () => _ }); function j(t) { return t instanceof Uint8Array || __templateHashAny(ArrayBuffer).isView(t) && __templateHashAny(__templateHashAny(t).constructor).name === "Uint8Array" && "BYTES_PER_ELEMENT" in t && __templateHashAny(t).BYTES_PER_ELEMENT === 1; } function m(t, e, r = "") { let o = __templateHashAny(j)(t), n = __templateHashAny(t)?.length, f = e !== void 0; if (!o || f && n !== e) {
    let s = r && `"${r}" `, x = f ? ` of length ${e}` : "", i = o ? `length=${n}` : `type=${typeof t}`, h = s + "expected Uint8Array" + x + ", got " + i;
    throw o ? new (__templateHashAny(RangeError))(h) : new (__templateHashAny(TypeError))(h);
} return t; } function L(t, e = !0) { if (__templateHashAny(t).destroyed)
    throw new (__templateHashAny(Error))("Hash instance has been destroyed"); if (e && __templateHashAny(t).finished)
    throw new (__templateHashAny(Error))("Hash#digest() has already been called"); } function C(t, e) { __templateHashAny(m)(t, void 0, "digestInto() output"); let r = __templateHashAny(e).outputLen; if (__templateHashAny(t).length < r)
    throw new (__templateHashAny(RangeError))('"digestInto() output" expected to be of length >=' + r); } function y(...t) { for (let e = 0; e < __templateHashAny(t).length; e++)
    __templateHashAny(__templateHashAny(t)[e]).fill(0); } function A(t) { return new (__templateHashAny(DataView))(__templateHashAny(t).buffer, __templateHashAny(t).byteOffset, __templateHashAny(t).byteLength); } function d(t, e) { return t << 32 - e | t >>> e; } function F(t, e = {}) { let r = (n, f) => __templateHashAny(__templateHashAny(__templateHashAny(t)(f)).update(n)).digest(), o = __templateHashAny(t)(void 0); return __templateHashAny(r).outputLen = __templateHashAny(o).outputLen, __templateHashAny(r).blockLen = __templateHashAny(o).blockLen, __templateHashAny(r).canXOF = __templateHashAny(o).canXOF, __templateHashAny(r).create = n => __templateHashAny(t)(n), __templateHashAny(Object).assign(r, e), __templateHashAny(Object).freeze(r); } var T = t => ({ oid: __templateHashAny(Uint8Array).from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, t]) }); function D(t, e, r) { return t & e ^ ~t & r; } function I(t, e, r) { return t & e ^ t & r ^ e & r; } var E = class {
    constructor(e, r, o, n) { __templateHashAny(a)(__templateHashAny(this), "blockLen"); __templateHashAny(a)(__templateHashAny(this), "outputLen"); __templateHashAny(a)(__templateHashAny(this), "canXOF", !1); __templateHashAny(a)(__templateHashAny(this), "padOffset"); __templateHashAny(a)(__templateHashAny(this), "isLE"); __templateHashAny(a)(__templateHashAny(this), "buffer"); __templateHashAny(a)(__templateHashAny(this), "view"); __templateHashAny(a)(__templateHashAny(this), "finished", !1); __templateHashAny(a)(__templateHashAny(this), "length", 0); __templateHashAny(a)(__templateHashAny(this), "pos", 0); __templateHashAny(a)(__templateHashAny(this), "destroyed", !1); __templateHashAny(__templateHashAny(this)).blockLen = e, __templateHashAny(__templateHashAny(this)).outputLen = r, __templateHashAny(__templateHashAny(this)).padOffset = o, __templateHashAny(__templateHashAny(this)).isLE = n, __templateHashAny(__templateHashAny(this)).buffer = new (__templateHashAny(Uint8Array))(e), __templateHashAny(__templateHashAny(this)).view = __templateHashAny(A)(__templateHashAny(__templateHashAny(this)).buffer); }
    update(e) { __templateHashAny(L)(__templateHashAny(this)), __templateHashAny(m)(e); let { view: r, buffer: o, blockLen: n } = __templateHashAny(this), f = __templateHashAny(e).length; for (let s = 0; s < f;) {
        let x = __templateHashAny(Math).min(n - __templateHashAny(__templateHashAny(this)).pos, f - s);
        if (x === n) {
            let i = __templateHashAny(A)(e);
            for (; n <= f - s; s += n)
                __templateHashAny(__templateHashAny(this)).process(i, s);
            continue;
        }
        __templateHashAny(o).set(__templateHashAny(e).subarray(s, s + x), __templateHashAny(__templateHashAny(this)).pos), __templateHashAny(__templateHashAny(this)).pos += x, s += x, __templateHashAny(__templateHashAny(this)).pos === n && (__templateHashAny(__templateHashAny(this)).process(r, 0), __templateHashAny(__templateHashAny(this)).pos = 0);
    } return __templateHashAny(__templateHashAny(this)).length += __templateHashAny(e).length, __templateHashAny(__templateHashAny(this)).roundClean(), __templateHashAny(this); }
    digestInto(e) { __templateHashAny(L)(__templateHashAny(this)), __templateHashAny(C)(e, __templateHashAny(this)), __templateHashAny(__templateHashAny(this)).finished = !0; let { buffer: r, view: o, blockLen: n, isLE: f } = __templateHashAny(this), { pos: s } = __templateHashAny(this); __templateHashAny(r)[s++] = 128, __templateHashAny(y)(__templateHashAny(__templateHashAny(__templateHashAny(this)).buffer).subarray(s)), __templateHashAny(__templateHashAny(this)).padOffset > n - s && (__templateHashAny(__templateHashAny(this)).process(o, 0), s = 0); for (let c = s; c < n; c++)
        __templateHashAny(r)[c] = 0; __templateHashAny(o).setBigUint64(n - 8, __templateHashAny(BigInt)(__templateHashAny(__templateHashAny(this)).length * 8), f), __templateHashAny(__templateHashAny(this)).process(o, 0); let x = __templateHashAny(A)(e), i = __templateHashAny(__templateHashAny(this)).outputLen; if (i % 4)
        throw new (__templateHashAny(Error))("_sha2: outputLen must be aligned to 32bit"); let h = i / 4, u = __templateHashAny(__templateHashAny(this)).get(); if (h > __templateHashAny(u).length)
        throw new (__templateHashAny(Error))("_sha2: outputLen bigger than state"); for (let c = 0; c < h; c++)
        __templateHashAny(x).setUint32(4 * c, __templateHashAny(u)[c], f); }
    digest() { let { buffer: e, outputLen: r } = __templateHashAny(this); __templateHashAny(__templateHashAny(this)).digestInto(e); let o = __templateHashAny(e).slice(0, r); return __templateHashAny(__templateHashAny(this)).destroy(), o; }
    _cloneInto(e) { e || (e = new (__templateHashAny((__templateHashAny(__templateHashAny(this)).constructor)))), __templateHashAny(e).set(...__templateHashAny(__templateHashAny(this)).get()); let { blockLen: r, buffer: o, length: n, finished: f, destroyed: s, pos: x } = __templateHashAny(this); return __templateHashAny(e).destroyed = s, __templateHashAny(e).finished = f, __templateHashAny(e).length = n, __templateHashAny(e).pos = x, n % r && __templateHashAny(__templateHashAny(e).buffer).set(o), e; }
    clone() { return __templateHashAny(__templateHashAny(this))._cloneInto(); }
}, b = __templateHashAny(Uint32Array).from([1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225]); var W = __templateHashAny(Uint32Array).from([1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298]), l = new (__templateHashAny(Uint32Array))(64), B = class extends __templateHashAny(E) {
    constructor(e) { super(64, e, 8, !1); }
    get() { let { A: e, B: r, C: o, D: n, E: f, F: s, G: x, H: i } = __templateHashAny(this); return [e, r, o, n, f, s, x, i]; }
    set(e, r, o, n, f, s, x, i) { __templateHashAny(__templateHashAny(this)).A = e | 0, __templateHashAny(__templateHashAny(this)).B = r | 0, __templateHashAny(__templateHashAny(this)).C = o | 0, __templateHashAny(__templateHashAny(this)).D = n | 0, __templateHashAny(__templateHashAny(this)).E = f | 0, __templateHashAny(__templateHashAny(this)).F = s | 0, __templateHashAny(__templateHashAny(this)).G = x | 0, __templateHashAny(__templateHashAny(this)).H = i | 0; }
    process(e, r) { for (let c = 0; c < 16; c++, r += 4)
        __templateHashAny(l)[c] = __templateHashAny(e).getUint32(r, !1); for (let c = 16; c < 64; c++) {
        let g = __templateHashAny(l)[c - 15], p = __templateHashAny(l)[c - 2], S = __templateHashAny(d)(g, 7) ^ __templateHashAny(d)(g, 18) ^ g >>> 3, H = __templateHashAny(d)(p, 17) ^ __templateHashAny(d)(p, 19) ^ p >>> 10;
        __templateHashAny(l)[c] = H + __templateHashAny(l)[c - 7] + S + __templateHashAny(l)[c - 16] | 0;
    } let { A: o, B: n, C: f, D: s, E: x, F: i, G: h, H: u } = __templateHashAny(this); for (let c = 0; c < 64; c++) {
        let g = __templateHashAny(d)(x, 6) ^ __templateHashAny(d)(x, 11) ^ __templateHashAny(d)(x, 25), p = u + g + __templateHashAny(D)(x, i, h) + __templateHashAny(W)[c] + __templateHashAny(l)[c] | 0, H = (__templateHashAny(d)(o, 2) ^ __templateHashAny(d)(o, 13) ^ __templateHashAny(d)(o, 22)) + __templateHashAny(I)(o, n, f) | 0;
        u = h, h = i, i = x, x = s + p | 0, s = f, f = n, n = o, o = p + H | 0;
    } o = o + __templateHashAny(__templateHashAny(this)).A | 0, n = n + __templateHashAny(__templateHashAny(this)).B | 0, f = f + __templateHashAny(__templateHashAny(this)).C | 0, s = s + __templateHashAny(__templateHashAny(this)).D | 0, x = x + __templateHashAny(__templateHashAny(this)).E | 0, i = i + __templateHashAny(__templateHashAny(this)).F | 0, h = h + __templateHashAny(__templateHashAny(this)).G | 0, u = u + __templateHashAny(__templateHashAny(this)).H | 0, __templateHashAny(__templateHashAny(this)).set(o, n, f, s, x, i, h, u); }
    roundClean() { __templateHashAny(y)(l); }
    destroy() { __templateHashAny(__templateHashAny(this)).destroyed = !0, __templateHashAny(__templateHashAny(this)).set(0, 0, 0, 0, 0, 0, 0, 0), __templateHashAny(y)(__templateHashAny(__templateHashAny(this)).buffer); }
}, U = class extends __templateHashAny(B) {
    constructor() { super(32); __templateHashAny(a)(__templateHashAny(this), "A", __templateHashAny(b)[0] | 0); __templateHashAny(a)(__templateHashAny(this), "B", __templateHashAny(b)[1] | 0); __templateHashAny(a)(__templateHashAny(this), "C", __templateHashAny(b)[2] | 0); __templateHashAny(a)(__templateHashAny(this), "D", __templateHashAny(b)[3] | 0); __templateHashAny(a)(__templateHashAny(this), "E", __templateHashAny(b)[4] | 0); __templateHashAny(a)(__templateHashAny(this), "F", __templateHashAny(b)[5] | 0); __templateHashAny(a)(__templateHashAny(this), "G", __templateHashAny(b)[6] | 0); __templateHashAny(a)(__templateHashAny(this), "H", __templateHashAny(b)[7] | 0); }
}; var _ = __templateHashAny(F)(() => new (__templateHashAny(U)), __templateHashAny(T)(1)); return __templateHashAny(M)(N); }))();

 if(typeof path!=='string'||!path||path.includes('\0')||typeof check!=='function'||typeof files?.stat!=='function'||typeof files?.readRange!=='function')throw Error('The original file observation input is invalid.');
 const observe=async operation=>{check();const result=await operation();check();return result;};
 const identity=stat=>typeof stat?.sourceIdentity==='string'&&stat.sourceIdentity?stat.sourceIdentity:Number.isFinite(stat?.ino)?stat.ino:null;
 const before=await observe(()=>files.stat(path));
 if(before===null)return null;
 if(!before||before.isDirectory!==false||!Number.isSafeInteger(before.size)||before.size<0||!Number.isFinite(before.mtimeMs)||identity(before)===null)throw Error("The file's size or identity could not be confirmed.");
 const hash=__templateFileHash.sha256.create(),alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
 for(let offset=0;offset<before.size;){
  const length=Math.min(49152,before.size-offset);
  const chunk=await observe(()=>files.readRange({path,offset,length}));
  if(!chunk||chunk.bytesRead!==length||typeof chunk.base64!=='string'||chunk.base64.length!==4*Math.ceil(length/3)||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(chunk.base64))throw Error('The file read returned an incomplete or invalid binary chunk.');
  const bytes=new Uint8Array(length);
  let position=0;
  for(let i=0;i<chunk.base64.length;i+=4){
   const a=alphabet.indexOf(chunk.base64[i]),b=alphabet.indexOf(chunk.base64[i+1]),c=chunk.base64[i+2]==='='?0:alphabet.indexOf(chunk.base64[i+2]),d=chunk.base64[i+3]==='='?0:alphabet.indexOf(chunk.base64[i+3]);
   if(chunk.base64[i+2]==='='&&(b&15)!==0||chunk.base64[i+3]==='='&&chunk.base64[i+2]!=='='&&(c&3)!==0)throw Error('The file read returned a noncanonical binary chunk.');
   bytes[position++]=(a<<2)|(b>>4);
   if(position<length)bytes[position++]=((b&15)<<4)|(c>>2);
   if(position<length)bytes[position++]=((c&3)<<6)|d;
  }
  hash.update(bytes);check();offset+=length;
 }
 const after=await observe(()=>files.stat(path));
 if(!after||after.isDirectory!==false||before.size!==after.size||before.mtimeMs!==after.mtimeMs||identity(before)!==identity(after))throw Error('The file changed while its contents were read.');
 const digest=hash.digest();check();
 let hex='';for(let index=0;index<digest.length;index++)hex+=digest[index].toString(16).padStart(2,'0');
 return {size:before.size,sha256:hex};
}
// file-observation:end
// draft-observation:start
// Plugin-private saved-state observation. Uses existing Panel read methods only.
// A working copy inside run_script is deliberately not observable here.
async function readTemplateDraftSources(sdk,projectId,draftId,libraryId=null){
 const fail=message=>{throw Object.assign(Error(message),{code:'TEMPLATE_SOURCE_UNVERIFIED'});};
 if(typeof sdk?.call!=='function'||typeof projectId!=='string'||!projectId||typeof draftId!=='string'||!draftId)fail('Saved Draft source target is invalid.');
 const core=await sdk.call('getDraftCore',draftId),owner=core?.owner,sequence=core?.sequenceJson;
 if(owner?.projectId!==projectId||typeof owner.libraryId!=='string'||!owner.libraryId||libraryId!==null&&owner.libraryId!==libraryId||sequence?.id!==draftId||sequence.libraryId!==undefined&&sequence.libraryId!==owner.libraryId||core.isEditedDraft===false)fail('Saved Draft source owner could not be confirmed.');
 // The complete saved JSON also witnesses non-source edits across independent reads.
 const witness=JSON.stringify(sequence);
 if(typeof witness!=='string'||witness.length>8388608)fail('Saved Draft observation exceeds its input limit.');
 let snapshot,missingMethod=false;
 try{snapshot=await sdk.call('getDraftMediaSnapshot',projectId,draftId);}
 catch(error){
  // Compatibility only for an absent read method. Real read failures stay failures.
  if(!/^(?:Panels cannot call ["']getDraftMediaSnapshot["']|No such method: getDraftMediaSnapshot|Unknown (?:method|read method):? getDraftMediaSnapshot)/.test(String(error?.message||error)))throw error;
  missingMethod=true;
 }
 let clips=[],revision;
 if(!missingMethod){
  if(typeof snapshot?.revision!=='string'||!snapshot.revision||!Number.isFinite(snapshot.fps)||snapshot.fps<=0||!Array.isArray(snapshot.clips)||snapshot.clips.length>1000||snapshot.clips.some(row=>!row||typeof row!=='object'))fail('Saved Draft media observation is incomplete.');
  clips=snapshot.clips.filter(row=>row?.resourceId!=null).map(row=>({clipId:row.clipId,trackId:row.trackId,trackKind:row.trackKind,resourceId:row.resourceId,startFrame:row.startFrame,endFrame:row.endFrame,source:{clipId:row.clipId,startSeconds:row.sourceStartSeconds,endSeconds:row.sourceEndSeconds},playbackSpeed:row.playbackSpeed}));
  revision=JSON.stringify({core:witness,media:snapshot.revision,clips});
 }else{
  // getDraftCore is an existing public read. Interpret only documented persisted
  // Clip.1 (frames) / Clip.2 (ticks) ranges, never application/user database files.
  if(sequence.schema!=='Cutback.Timeline.1'||!Array.isArray(sequence.tracks?.children))fail('Saved Draft schema is unsupported.');
  const fps=sequence.frameRate;
  if(!Number.isFinite(fps)||fps<=0||fps>1000)fail('Saved Draft frame grid is invalid.');
  const rate=sequence.frameRateRatio;
  let tickFrame;
  if(rate!==undefined){
   if(!Number.isSafeInteger(rate?.numerator)||rate.numerator<=0||!Number.isSafeInteger(rate.denominator)||rate.denominator<=0||Math.abs(fps-rate.numerator/rate.denominator)>8*Number.EPSILON*Math.max(1,fps))fail('Saved Draft rational frame grid is invalid.');
   tickFrame=Number((705600000n*BigInt(rate.denominator)+BigInt(Math.floor(rate.numerator/2)))/BigInt(rate.numerator));
  }else tickFrame=Math.round(705600000/fps);
  if(!Number.isSafeInteger(tickFrame)||tickFrame<1)fail('Saved Draft Tick grid is invalid.');
  for(const track of sequence.tracks.children){
   if(!track||typeof track.id!=='string'||!track.id||!Array.isArray(track.children))fail('Saved Draft track is invalid.');
   const kind={Main:'main',Video:'video',Audio:'audio'}[track.kind];
   if(!kind)continue;
   let offset=0;
   for(const row of track.children){
    const current=row?.schema==='Cutback.Clip.2'||row?.schema==='Cutback.Gap.2',legacy=row?.schema==='Cutback.Clip.1'||row?.schema==='Cutback.Gap.1';
    if(!current&&!legacy)fail('Saved Draft source schema is unsupported.');
    const start=row.sourceRange?.startTime,duration=row.sourceRange?.duration;
    if(!Number.isSafeInteger(start)||start<0||!Number.isSafeInteger(duration)||duration<0||row.cut!==undefined&&typeof row.cut!=='boolean')fail('Saved Draft source range is invalid.');
    const frames=current?duration/tickFrame:duration;
    if(!Number.isSafeInteger(frames)||frames<0)fail('Saved Draft source is not aligned to its frame grid.');
    if(row.cut)continue;
    const resourceId=row.mediaReferences?.defaultMedia?.id;
    if(resourceId!=null){
     if(!Number.isSafeInteger(row.id)||row.id<0||frames<1||typeof resourceId!=='string'||!resourceId)fail('Saved Draft source identity is invalid.');
     const policy=row.timing??{playbackSpeed:{numerator:1,denominator:1},preserveAudioPitch:true};
     const n=policy.playbackSpeed?.numerator,d=policy.playbackSpeed?.denominator,r=policy.sourceTickRoundingRemainder??0;
     if(!Number.isSafeInteger(n)||n<1||!Number.isSafeInteger(d)||d<1||!Number.isSafeInteger(r)||r<0||r>=d||typeof policy.preserveAudioPitch!=='boolean'||legacy&&(n!==1||d!==1||r!==0))fail('Saved Draft timing policy is unsupported.');
     // Match ClipTiming's nonnegative round-half-up mapping, including its origin
     // remainder. BigInt avoids losing a source Tick in large rational products.
     const round=(a,b)=>(2n*a+b)/(2n*b);
     const delta=current?Number(round(BigInt(r)+BigInt(n)*BigInt(duration),BigInt(d))-round(BigInt(r),BigInt(d))):duration;
     if(!Number.isSafeInteger(delta)||!Number.isSafeInteger(start+delta))fail('Saved Draft source time exceeds its exact range.');
     const unit=current?705600000:fps;
     clips.push({clipId:row.id,trackId:track.id,trackKind:kind,resourceId,startFrame:offset,endFrame:offset+frames,source:{clipId:row.id,startSeconds:start/unit,endSeconds:(start+delta)/unit},playbackSpeed:n/d});
    }
    offset+=frames;
    if(!Number.isSafeInteger(offset))fail('Saved Draft placement exceeds its exact range.');
   }
  }
  revision=witness;
 }
 const ids=new Set();
 if(clips.length>1000)fail('Saved Draft contains too many media clips.');
 for(const row of clips){
  const key=JSON.stringify([row.trackId,row.clipId]);
  if(ids.has(key)||!Number.isSafeInteger(row.clipId)||row.clipId<0||typeof row.trackId!=='string'||!row.trackId||!['main','video','audio'].includes(row.trackKind)||typeof row.resourceId!=='string'||!row.resourceId||!Number.isSafeInteger(row.startFrame)||row.startFrame<0||!Number.isSafeInteger(row.endFrame)||row.endFrame<=row.startFrame||!Number.isFinite(row.source.startSeconds)||row.source.startSeconds<0||!Number.isFinite(row.source.endSeconds)||row.source.endSeconds<=row.source.startSeconds||!Number.isFinite(row.playbackSpeed)||row.playbackSpeed<=0)fail('Saved Draft source observation is invalid.');
  ids.add(key);
 }
 // This function runs in the panel, where Web Crypto already backs durable run
 // receipts. Keep the revision witness bounded when it is passed into scripts.
 if(!globalThis.crypto?.subtle||typeof TextEncoder!=='function')fail('Saved Draft revision hashing is unavailable.');
 revision=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(revision))),n=>n.toString(16).padStart(2,'0')).join('');
 return {revision,owner:{projectId,libraryId:owner.libraryId},clips};
}

// SDK-safe projection of a caller-supplied *actual saved* observation. Resource
// aliases are checked by the existing SDK structural verifier, not guessed here.
function templateObservedSource(observation,row){
 const invalid=()=>{throw Error('Saved source target could not be confirmed.');};
 if(!Array.isArray(observation?.clips)||!row||!Number.isSafeInteger(row.clipId)||typeof row.trackId!=='string')invalid();
 const found=observation.clips.filter(c=>c.clipId===row.clipId&&c.trackId===row.trackId);
 if(found.length!==1)invalid();
 const actual=found[0],source=actual.source;
 if(actual.trackKind!==row.trackKind||actual.startFrame!==row.startFrame||actual.endFrame!==row.endFrame||source?.clipId!==row.clipId||!Number.isFinite(source.startSeconds)||source.startSeconds<0||!Number.isFinite(source.endSeconds)||source.endSeconds<=source.startSeconds)invalid();
 return {clipId:row.clipId,startSeconds:source.startSeconds,endSeconds:source.endSeconds};
}
// draft-observation:end
// native-image-input:start
// Original source facts and private unsaved identity checks. Canonical input feature.
// Normalize the app's handed Resource records without silently discarding malformed
// inputs or allowing conflicting kinds for one identity. Template role/count policy
// remains with the template; the public handoff supports at most 50 records.
export function templateMediaSelection(inputs) {
 const invalid=()=>{throw Object.assign(Error('The handed video/photo selection is invalid. Choose up to 50 valid Resources.'),{code:'template-input-invalid'});};
 if(!Array.isArray(inputs)||inputs.length>50)invalid();
 const selected=new Map();
 for(const input of inputs){
  const id=input?.resourceId,kind=input?.kind;
  if(typeof id!=='string'||!id||id!==id.trim()||id.length>1024||id.includes('\0')||!['video','image'].includes(kind))invalid();
  if(selected.has(id)&&selected.get(id).kind!==kind)invalid();
  if(!selected.has(id))selected.set(id,{rid:id,kind});
 }
 return [...selected.values()];
}
export async function nativeImageSources(selects, projectId, photos, { matchById=false }={}) {
 const project=selects.project(projectId), resources=await project.resources(), nodes=[];
 const visit=items=>{for(const item of items||[])item.type==='dir'?visit(item.children):nodes.push(item);};
 const overview=await project.sourceFiles();
 if('fileTree' in overview)visit(overview.fileTree);
 else for(const folder of overview.folders||[]){const detail=await project.sourceFiles({folder:folder.name});if('fileTree' in detail)visit(detail.fileTree);}
 const sources=photos.map(photo=>{
  const matches=nodes.filter(node=>node.path===photo.path&&(!matchById||node.resourceId===photo.resourceId)&&resources.some(resource=>resource.resourceId===node.resourceId&&resource.type==='Image'));
  if(matches.length!==1||matches[0].resourceId!==photo.resourceId)throw Error('A selected Image is missing or ambiguous in the Project: '+photo.name);
  const row=matches[0],size=row.frameSize;
  if(!Number.isSafeInteger(size?.width)||size.width<1||!Number.isSafeInteger(size?.height)||size.height<1)throw Error('A selected Image has no verified native dimensions: '+photo.name);
  return {resourceId:row.resourceId,path:row.path,name:photo.name,width:size.width,height:size.height};
 });
 const fail=(code,photo,message)=>{throw Object.assign(new Error(message+': '+photo.name),{code,resourceId:photo.resourceId});};
 if(typeof selects.files?.stat!=='function'||typeof selects.files?.readRange!=='function')throw Error('This Selects version does not support original photo file checks.');
 const checked=new Set();
 for(const photo of sources){
  if(checked.has(photo.path))continue;
  let before;
  try{before=await selects.files.stat(photo.path);}catch{fail('image-source-unknown',photo,'Could not confirm the original photo file');}
  if(before===null)fail('image-source-missing',photo,'The original photo file is missing');
  if(!before||!Number.isSafeInteger(before.size)||before.size<0||typeof before.isDirectory!=='boolean')fail('image-source-unknown',photo,'Could not confirm the original photo file');
  if(before.isDirectory||before.size===0)fail('image-source-unreadable',photo,'The original photo file is not readable');
  let first;
  try{first=await selects.files.readRange({path:photo.path,offset:0,length:1});}catch{fail('image-source-unreadable',photo,'Could not read the original photo file');}
  if(!first||first.bytesRead!==1||typeof first.base64!=='string'||!/^[A-Za-z0-9+/]{2}==$/.test(first.base64))fail('image-source-unknown',photo,'Could not confirm reading the original photo file');
  let after;
  try{after=await selects.files.stat(photo.path);}catch{fail('image-source-unknown',photo,'Could not confirm the original photo file after reading');}
  if(!after||after.isDirectory||['size','mtimeMs','ino'].some(key=>before[key]!==after[key]))fail('image-source-changed',photo,'The original photo file changed while reading');
  checked.add(photo.path);
 }
 return sources;
}
// Alias discovery does not carry a path. Resolve it by exact SDK identity, then
// keep the established native Image path/dimensions/file checks unchanged.
export async function nativeImageSourcesById(selects,projectId,photos) {
 const project=selects.project(projectId),nodes=[];
 const visit=items=>{for(const item of items||[]){if(!item)continue;item.type==='dir'?visit(item.children):nodes.push(item);}};
 const overview=await project.sourceFiles();
 if('fileTree' in overview)visit(overview.fileTree);
 else for(const folder of overview.folders||[]){const detail=await project.sourceFiles({folder:folder.name});if('fileTree' in detail)visit(detail.fileTree);}
 const selected=photos.map(photo=>{
  const matches=nodes.filter(node=>node.resourceId===photo.resourceId&&typeof node.path==='string'&&node.path);
  if(matches.length!==1)throw Error('The selected Image path is missing or ambiguous in the Project: '+photo.name);
  return {...photo,path:matches[0].path};
 });
 return nativeImageSources(selects,projectId,selected,{matchById:true});
}
// A source step is dispatched once, independently of persistence permission.
export async function nativeImageRun(sdk,script,summary,allowCommit=false,fallbackMessage='Image placement could not be confirmed. Inspect the Draft before retrying.',timeoutSeconds=120) {
 const response=await sdk.runScript({script,summary,allowCommit,timeoutSeconds});
 if(response.isError||response.result==null)throw Error(response.output||fallbackMessage);
 return response.result;
}
export async function prepareNativeImages(sdk,projectId,photos,knownLibraryId=null,byId=false,timeoutSeconds=120) {
 if(typeof byId!=='boolean')throw Error('The Image source matching mode is invalid.');
 if(byId&&(!Array.isArray(photos)||photos.some(photo=>!photo||typeof photo.resourceId!=='string'||!photo.resourceId||typeof photo.name!=='string')))throw Error('The selected Image identities are invalid.');
 const reader=byId?nativeImageSourcesById:nativeImageSources;
 const support=byId?nativeImageSources.toString()+'\n':'';
 const result=await nativeImageRun(sdk,support+`try{return {sources:await (${reader.toString()})(selects,${JSON.stringify(projectId)},${JSON.stringify(photos)})};}catch(error){const issue=Object(error);return {sourceError:{code:typeof issue.code==='string'?issue.code:'image-source-invalid',message:String(issue.message||error),resourceId:issue.resourceId??null}};}`,'Verify original Project Images',false,undefined,timeoutSeconds);
 if(result.sourceError){
  const error=Object.assign(new Error(result.sourceError.message),result.sourceError);
  if(['image-source-missing','image-source-unreadable','image-source-unknown','image-source-changed'].includes(error.code))error.publicMessage=error.message+'. Check the original file in the Project, then try again.';
  throw error;
 }
 if(!Array.isArray(result.sources))throw Error('Original Image verification returned an incomplete result.');
 if(byId&&(result.sources.length!==photos.length||result.sources.some((source,i)=>source?.resourceId!==photos[i].resourceId||source.name!==photos[i].name||typeof source.path!=='string'||!source.path||!Number.isSafeInteger(source.width)||source.width<1||!Number.isSafeInteger(source.height)||source.height<1)))throw Error('Original Image verification did not confirm the selected identities and dimensions.');
 return {sdk,projectId,sources:result.sources};
}
// Standalone inventories already hold SDK aliases. Resolve their current native
// facts by exact identity without guessing a source path or using a Draft canvas.
export async function prepareNativeImagesById(sdk,projectId,photos,options={}) {
 const {isCurrent=()=>true,timeoutMs=120000}=options??{};
 if(!Array.isArray(photos)||typeof isCurrent!=='function'||!Number.isFinite(timeoutMs)||timeoutMs<1||timeoutMs>120000)throw Error('The selected Image request or scope is invalid.');
 const deadline=Date.now()+timeoutMs,issue=(code,message)=>Object.assign(Error(message),{code,publicMessage:message});
 const check=()=>{
  let live=false;try{live=isCurrent();}catch{}
  if(!live)throw issue('image-source-stopped','The template run ended before original Images were confirmed.');
  if(Date.now()>=deadline)throw issue('image-source-timeout','Original Image verification timed out.');
 };
 check();const batches=[];let batch=[];
 // A large candidate set must not become one clipped SDK request/result. Bound
 // both the row count and serialized input before starting any read.
 for(const photo of photos){
  if(!photo||typeof photo.resourceId!=='string'||!photo.resourceId||typeof photo.name!=='string')throw Error('The selected Image identities are invalid.');
  const row={resourceId:photo.resourceId,name:photo.name};
  if(new TextEncoder().encode(JSON.stringify([row])).length>16384)throw Error('The selected Image input exceeds its 16 KiB selection budget.');
  if(batch.length>=16||new TextEncoder().encode(JSON.stringify([...batch,row])).length>16384){batches.push(batch);batch=[];}
  batch.push(row);
 }
 if(batch.length)batches.push(batch);
 const sources=[];
 for(const selected of batches){
  check();const prepared=await prepareNativeImages(sdk,projectId,selected,null,true,Math.max(1,Math.ceil((deadline-Date.now())/1000)));
  check();sources.push(...prepared.sources);
 }
 check();return {sdk,projectId,sources};
}

// File contents are observations, not a filesystem lock. Keep the existing
// Image availability contract unchanged; templates opt into complete identity.
export function requireSourceFileSupport(files) {
 if(typeof files?.stat!=='function'||typeof files?.readRange!=='function'){
  const message='Update Selects to verify complete source file contents before creating this template.';
  throw Object.assign(new Error(message),{code:'source-file-unsupported',publicMessage:message});
 }
}
export async function observeSourceFiles(files,paths,expected=null) {
 const issue=(code,message,cause=null)=>Object.assign(new Error(message),{code,publicMessage:message,cause});
 if(!Array.isArray(paths)||paths.some(path=>typeof path!=='string'||!path||path.includes('\0')))throw issue('source-file-input','The selected source paths are invalid.');
 const selected=[...new Set(paths)];
 const valid=row=>row&&typeof row.path==='string'&&Number.isSafeInteger(row.size)&&row.size>0&&typeof row.sha256==='string'&&/^[0-9a-f]{64}$/.test(row.sha256);
 if(expected!==null&&(!Array.isArray(expected)||expected.length!==selected.length||new Set(expected.map(row=>row?.path)).size!==expected.length||expected.some(row=>!valid(row)||!selected.includes(row.path))))throw issue('source-file-input','The expected source observations do not match the selection.');
 if(!selected.length)return [];
 requireSourceFileSupport(files);
 const observed=[];
 for(const path of selected){
  let fingerprint;
  try{fingerprint=await fingerprintTemplateFile(files,path);}catch(cause){throw issue('source-file-unknown','The selected source file could not be confirmed. Check the Project file and try again.',cause);}
  if(fingerprint===null)throw issue('source-file-missing','The selected source file is missing. Check the Project file and try again.');
  const row={...fingerprint,path};
  if(!valid(row))throw issue('source-file-unknown','The selected source file has no complete, nonempty content identity.');
  const before=expected?.find(row=>row.path===path);
  if(before&&(before.size!==row.size||before.sha256!==row.sha256))throw issue('source-file-changed','The selected source file changed. Reload the Project inputs before trying again.');
  observed.push({path,size:row.size,sha256:row.sha256});
 }
 return observed;
}

// Bind a physical path to the exact current Project Resource, independently of
// content hashing. A retained old file is not evidence of a current media link.
export async function confirmProjectSourcePaths(selects,projectId,bindings) {
 const issue=(code,message,cause=null)=>Object.assign(new Error(message),{code:'source-path-'+code,publicMessage:message,cause});
 const valid=value=>typeof value==='string'&&value.length>0&&value.length<=8192&&!value.includes('\0');
 if(!valid(projectId)||!Array.isArray(bindings)||bindings.length>16384||bindings.some(row=>!row||!valid(row.resourceId)||!valid(row.path))||new Set(bindings.map(row=>row.resourceId)).size!==bindings.length)throw issue('input','The selected source bindings are invalid.');
 const expected=bindings.map(row=>({resourceId:row.resourceId,path:row.path}));
 if(!expected.length)return {verified:true};
 const wanted=new Set(expected.map(row=>row.resourceId)),found=new Map(),deadline=Date.now()+25000;let nodes=0;
 const check=()=>{if(Date.now()>=deadline)throw issue('unknown','The current Project source paths could not be confirmed in time.');};
 const visit=(rows,depth=0)=>{
  check();if(!Array.isArray(rows)||depth>24)throw issue('unknown','The Project source tree is incomplete or unsupported.');
  for(const row of rows){
   if(++nodes>16384||!row||typeof row!=='object')throw issue('unknown','The Project source tree exceeds its observation budget or is incomplete.');
   if(row.type==='dir')visit(row.children,depth+1);
   else if(wanted.has(row.resourceId)){
    if(found.has(row.resourceId)||!valid(row.path))throw issue('changed','A selected source path is missing or ambiguous in the Project.');
    found.set(row.resourceId,row.path);
   }
  }
 };
 try{
  const project=selects.project(projectId),overview=await project.sourceFiles();check();
  if(!overview||typeof overview!=='object')throw issue('unknown','The current Project source tree could not be confirmed.');
  if('fileTree' in overview)visit(overview.fileTree);
  else{
   if(!Array.isArray(overview.folders)||overview.folders.length>512||overview.folders.some(row=>!row||!valid(row.name))||new Set(overview.folders.map(row=>row.name)).size!==overview.folders.length)throw issue('unknown','The Project source folder list is incomplete or unsupported.');
   for(const folder of overview.folders){check();const detail=await project.sourceFiles({folder:folder.name});check();if(!detail||typeof detail!=='object'||!('fileTree' in detail))throw issue('unknown','A Project source folder did not return its complete file tree.');visit(detail.fileTree);}
  }
 }catch(cause){if(cause?.code?.startsWith('source-path-'))throw cause;throw issue('unknown','The current Project source paths could not be read.',cause);}
 for(const row of expected)if(found.get(row.resourceId)!==row.path)throw issue('changed','A selected original has moved or changed its Project source link. Reload the Project inputs before trying again.');
 check();return {verified:true};
}

// Persistent handed IDs -> SDK aliases, observed only on private unsaved Drafts.
// Placement failures are not evidence that a source file is absent.
export async function resolveTemplateMedia(selects,projectId,files,scratchName='Template source check',options={}) {
 if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(key=>!['includeTiming','dimensions','includeKind'].includes(key))||['includeTiming','dimensions','includeKind'].some(key=>options[key]!==undefined&&typeof options[key]!=='boolean'))throw Error('The source observation options are invalid.');
 if(!Array.isArray(files)||!files.length||files.length>50||files.some(file=>!file||typeof file.rid!=='string'||!file.rid||!['video','image'].includes(file.kind))||new Set(files.map(file=>file.rid)).size!==files.length)throw Error('The selected template source request is invalid.');
 const project=selects.project(projectId),resolved=[],failed=[];let shared=null,catalogRead=null;
 const text=error=>String(Object(error).message||error||'Source preparation could not be confirmed.').slice(0,300);
 const unknown=message=>Object.assign(Error(message),{code:'source-resolution-unknown'});
 for(const file of files){
  let phase='create',insertionError;
  try{
   const photo=file.kind==='image',draft=photo||Object(options).includeTiming||!shared?await project.createDraft({name:scratchName}):shared;
   if(!photo)shared=draft;
   phase='readback';const before=await draft.clips({trackScope:'main'});
   if(!Array.isArray(before)||before.some(row=>!Number.isSafeInteger(row?.clipId))||new Set(before.map(row=>row.clipId)).size!==before.length)throw unknown('The private source check could not be observed before placement.');
   const ids=new Set(before.map(row=>row.clipId));
   const observe=async()=>{
    const rows=await draft.clips({trackScope:'main'});
    if(!Array.isArray(rows)||rows.some(row=>!Number.isSafeInteger(row?.clipId))||new Set(rows.map(row=>row.clipId)).size!==rows.length)throw unknown('The private source check returned invalid clips.');
    const added=rows.filter(row=>!ids.has(row.clipId));
    if(added.length>1||added.length===1&&(typeof added[0].resourceId!=='string'||!added[0].resourceId))throw unknown('The placed source alias could not be uniquely confirmed.');
    return added[0]??null;
   };
   phase='insert';
   try{await draft.insertResource({resourceId:file.rid,sourceRange:{startSeconds:0,endSeconds:0.5}});}catch(error){insertionError=error;}
   phase='readback';let clip=await observe();
   // Only the SDK's pre-mutation range validation authorizes the old short-file
   // fallback. An empty observation after an arbitrary transport error does not.
   if(!clip&&insertionError&&/^invalid_source_range(?::|$)/.test(text(insertionError))){
    phase='insert';insertionError=null;
    try{await draft.insertResource({resourceId:file.rid});}catch(error){insertionError=error;}
    phase='readback';clip=await observe();
   }
   if(!clip){if(insertionError){phase='insert';throw insertionError;}throw unknown('Source placement returned no confirmed clip.');}
   let kind=null;
   if(Object(options).includeKind){
    phase='kind';
    const rows=await (catalogRead??=project.resources());
    if(!Array.isArray(rows)||rows.some(row=>!row||typeof row.resourceId!=='string'||!row.resourceId||typeof row.type!=='string')||new Set(rows.map(row=>row.resourceId)).size!==rows.length)throw unknown('The current Project Resource kinds could not be confirmed.');
    const row=rows.find(row=>row.resourceId===clip.resourceId);
    if(!row)throw unknown('The placed source has no confirmed Project Resource kind.');
    kind=row.type==='Video'?'video':row.type==='Image'?'image':null;
    if(kind!==file.kind)throw Object.assign(Error('The selected source kind differs from the handed video/photo declaration.'),{code:'source-kind-mismatch'});
   }
   let size=null;
   if(photo&&Object(options).dimensions!==false){phase='dimensions';const sources=await nativeImageSourcesById(selects,projectId,[{resourceId:clip.resourceId,name:file.rid}]);size={width:sources[0].width,height:sources[0].height};}
   let timing=null;
   if(Object(options).includeTiming){phase='timing';const meta=await draft.meta();if(!Number.isFinite(meta.fps)||meta.fps<=0)throw unknown('The source frame grid could not be confirmed.');timing={insertionFps:meta.fps};}
   resolved.push({rid:file.rid,alias:clip.resourceId,size,...kind?{kind}:{},...timing?{timing}:{}});
  }catch(error){
   const code=typeof Object(error).code==='string'?Object(error).code.slice(0,80):['readback','kind'].includes(phase)?'source-resolution-unknown':'source-resolution-failed';
   failed.push({rid:file.rid,phase,code,error:text(error),...insertionError&&insertionError!==error?{insertionError:text(insertionError)}:{}});
  }
 }
 return {resolved,failed};
}

// A clipped or contradictory response cannot silently drop handed sources.
export function validateTemplateMediaResult(result,files,options={}) {
 const invalid=()=>{throw Object.assign(Error('The selected source resolution could not be confirmed. Check the Project inputs and try again.'),{code:'source-resolution-unknown'});};
 if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(key=>key!=='includeKind')||options.includeKind!==undefined&&typeof options.includeKind!=='boolean')invalid();
 if(!result||!Array.isArray(result.resolved)||!Array.isArray(result.failed))invalid();
 const wanted=new Set(files.map(file=>file.rid)),rows=[...result.resolved,...result.failed];
 if(rows.length!==wanted.size||new Set(rows.map(row=>row?.rid)).size!==wanted.size||rows.some(row=>!wanted.has(row?.rid)))invalid();
 if(result.resolved.some(row=>typeof row.alias!=='string'||!row.alias||row.size!==null&&(!Number.isSafeInteger(row.size?.width)||row.size.width<1||!Number.isSafeInteger(row.size?.height)||row.size.height<1)))invalid();
 if(options.includeKind&&result.resolved.some(row=>!['video','image'].includes(row.kind)||row.kind!==files.find(file=>file.rid===row.rid)?.kind))invalid();
 if(result.failed.some(row=>typeof row.phase!=='string'||typeof row.code!=='string'||typeof row.error!=='string'||row.error.length>300))invalid();
 return result;
}
// native-image-input:end
// native-image-authoring:start
// Cover a chosen Draft interval on the original source frame grid, then let
// the authoring owner verify and trim its explicit surplus.
function nativeMediaWindow({startFrame,endFrame,draftFps,sourceFps,sourceStartSeconds=0,sourceDurationSeconds=null,still=false}) {
 const frames=endFrame-startFrame;
 if(!Number.isFinite(draftFps)||draftFps<=0||!Number.isFinite(sourceFps)||sourceFps<=0||!Number.isSafeInteger(startFrame)||startFrame<0||!Number.isSafeInteger(endFrame)||!Number.isSafeInteger(frames)||frames<1||!Number.isFinite(sourceStartSeconds)||sourceStartSeconds<0||typeof still!=='boolean'||sourceDurationSeconds!==null&&(!Number.isFinite(sourceDurationSeconds)||sourceDurationSeconds<=0))throw Error('The media plan has no valid whole-frame interval.');
 const count=Math.max(1,Math.ceil(frames/draftFps*sourceFps-1e-8)),cap=sourceDurationSeconds!==null?Math.floor(sourceDurationSeconds*sourceFps+1e-6)-count:Infinity;
 if(!Number.isSafeInteger(count)||count<1||cap!==Infinity&&(!Number.isSafeInteger(cap)||cap<0))throw Error('The planned source cannot cover its playback interval.');
 const start=still?0:Math.max(0,Math.min(Math.round(sourceStartSeconds*sourceFps),cap));
 if(!Number.isSafeInteger(start)||start<0||!Number.isSafeInteger(start+count))throw Error('The planned source interval cannot be represented.');
 return {startFrame,endFrame,frames,sourceStart:start/sourceFps,sourceEnd:(start+count)/sourceFps,insertedFrames:Math.round(count/sourceFps*draftFps)};
}
// Bind one authoring mutation to its requested occurrence. Existing rows may
// not move or change identity; SDK array order is never a placement identity.
function bindMediaPlacement(before,rows,wanted) {
 const fail=()=>{throw Error('The media placement differs from its requested interval or source.');};
 const valid=list=>Array.isArray(list)&&list.length<=1024&&list.every(row=>row&&Number.isSafeInteger(row.clipId)&&row.clipId>=0&&typeof row.trackId==='string'&&row.trackId)&&new Set(list.map(row=>row.clipId)).size===list.length;
 if(!valid(before)||!valid(rows)||!wanted||typeof wanted.resourceId!=='string'||!wanted.resourceId)fail();
 const keys=['trackId','trackKind','resourceId','startFrame','endFrame'],ids=new Set(before.map(row=>row.clipId)),added=rows.filter(row=>!ids.has(row.clipId));
 if(rows.length!==before.length+1||added.length!==1||before.some(old=>{const current=rows.find(row=>row.clipId===old.clipId);return !current||keys.some(key=>current[key]!==old[key]);}))fail();
 const row=added[0];if(!Number.isSafeInteger(row.startFrame)||row.startFrame<0||!Number.isSafeInteger(row.endFrame)||row.endFrame<=row.startFrame)fail();
 for(const key of ['resourceId','trackKind','startFrame','endFrame'])if(wanted[key]!==undefined&&row[key]!==wanted[key])fail();
 return row;
}
// Prepare editable Image occurrences in one working copy. The caller owns its
// trusted Project/Draft handle and the sole final commit.
async function placeWorkingCopyImages(selects,projectId,draft,plan,sources,items,sourceFacts,bindPlacement){
 const project=selects.project(projectId),meta=await draft.meta();
 if(meta.fps!==plan.fps||meta.durationFrames!==plan.durationFrames||meta.frameSize.width!==plan.canvas.width||meta.frameSize.height!==plan.canvas.height)throw Error('The Draft frame grid differs from the plan.');
 const fresh=await sourceFacts(selects,projectId,sources);
 if(fresh.length!==sources.length||fresh.some((source,index)=>source.resourceId!==sources[index].resourceId||source.width!==sources[index].width||source.height!==sources[index].height))throw Error('A selected Image changed. Prepare the Images again.');
 const placements=[];
 for(const item of items){
  const source=fresh[item.source];if(!source)throw Error('An Image occurrence has no source.');
  const before=await draft.clips({trackScope:'all'});
  await draft.overlayResource({resource:project.resource(source.resourceId),over:await draft.rangeAtFrames(item.startFrame,item.endFrame)});
  const added=bindPlacement(before,await draft.clips({trackScope:'all'}),{resourceId:source.resourceId,trackKind:'video',startFrame:item.startFrame,endFrame:item.endFrame});
  placements.push({...item,clipId:added.clipId,trackId:added.trackId,resourceId:source.resourceId});
 }
 if((await draft.meta()).durationFrames!==plan.durationFrames)throw Error('Image placement changed the Draft duration.');
 return {placements,photos:fresh.map(source=>({width:source.width,height:source.height}))};
}
async function inspectImageGraphics(draft,expected){
 if(!('motionGraphics' in draft)||!('motionGraphicProgram' in draft))throw Error('Update Selects to verify editable graphics.');
 const same=(a,b)=>{
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(key=>Object.prototype.hasOwnProperty.call(b,key)&&same(a[key],b[key]));
 };
 const graphics=await draft.motionGraphics();
 if(!Array.isArray(graphics)||graphics.length!==expected.length)throw Error('Graphic count could not be confirmed.');
 for(const wanted of expected){
  const actual=graphics.find(g=>g.clip.clipId===wanted.clipId&&g.clip.trackId===wanted.trackId)?.clip;
  if(!actual||actual.startFrame!==wanted.startFrame||actual.endFrame!==wanted.endFrame)throw Error('Graphic placement could not be confirmed.');
  const program=await draft.motionGraphicProgram(actual);
  if(!program||!program.parameters||typeof program.parameters!=='object'||Array.isArray(program.parameters)||!Object.entries(wanted.parameters).every(([key,value])=>Object.prototype.hasOwnProperty.call(program.parameters,key)&&same(program.parameters[key],value)))throw Error('Graphic parameters could not be confirmed.');
 }
}
async function inspectImageTransforms(draft,expected,includeMain=false){
 // Both consumers author fixed intrinsic transforms; motion belongs to their
 // separate effects. Never adopt an observed transform as the expected value.
 if(!('clipTransform' in draft))throw Error('Update Selects to verify Image transforms.');
 const rows=(await draft.clips({trackScope:'all'})).filter(clip=>clip.trackKind==='video'||includeMain&&clip.trackKind==='main'&&clip.resourceId!=null);
 if(!Array.isArray(expected)||expected.length!==rows.length||new Set(expected.map(row=>row.clipId)).size!==expected.length)throw Error('Visual transform count could not be confirmed.');
 const same=(a,b)=>{
  // Converting domain coordinates to the SDK may introduce floating-point noise.
  if(typeof a==='number'||typeof b==='number')return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(b));
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const keys=Object.keys(b);return Object.keys(a).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(a,key)&&same(a[key],b[key]));
 };
 const receipts=[];
 for(const wanted of expected){
  const clip=rows.find(row=>row.clipId===wanted.clipId&&row.trackId===wanted.trackId);
  if(!clip)throw Error('Visual transform target could not be confirmed.');
  const patch=wanted.transform,transform={enabled:true,rotation:0,flipHorizontal:false,flipVertical:false,positionKeys:[],scaleKeys:[],rotationKeys:[],...patch,position:{x:0,y:0,...patch.position},scale:{x:1,y:1,...patch.scale},anchor:{x:0,y:0,...patch.anchor}};
  const actual=await draft.clipTransform(clip);
  if(!actual||!Object.entries(transform).every(([key,value])=>same(actual[key],value)))throw Error('Visual transform could not be confirmed.');
  receipts.push({clipId:wanted.clipId,trackId:wanted.trackId,transform});
 }
 return receipts;
}
async function inspectImageAudio(draft,expected,project,overlayOnly=false,observedSources=null,readSource=null){
 const mismatch=message=>Object.assign(Error(message),{code:'IMAGE_AUDIO_MISMATCH'});
 const rows=(await draft.clips({trackScope:'all'})).filter(row=>row.trackKind==='audio'||!overlayOnly&&row.trackKind==='main'&&row.resourceId);
 if(!Array.isArray(expected)||rows.length!==expected.length||new Set(expected.map(row=>row.clipId)).size!==expected.length)throw mismatch('Audio clip count could not be confirmed.');
 if(!expected.length)return [];
 if(!('clipAudio' in draft))throw Error('Update Selects to verify Audio settings.');
 const types=new Map((await project.resources()).map(row=>[row.resourceId,row.type])),receipts=[];
 const same=(a,b)=>{
  if(typeof a==='number'||typeof b==='number')return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(b));
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const keys=Object.keys(b);return Object.keys(a).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(a,key)&&same(a[key],b[key]));
 };
 for(const wanted of expected){
  const row=rows.find(c=>c.clipId===wanted.clipId&&c.trackId===wanted.trackId);
  if(!row||row.trackKind!==wanted.trackKind||row.resourceId!==wanted.resourceId||row.startFrame!==wanted.startFrame||row.endFrame!==wanted.endFrame||types.get(row.resourceId)!=='Audio'||!same(row.audioSourceIndexes,wanted.audioSourceIndexes))throw mismatch('Audio placement or routing could not be confirmed.');
  const settings={volumeDb:0,volumeKeys:[],fadeInSeconds:0,fadeOutSeconds:0,...wanted.settings},actual=await draft.clipAudio(row);
  if(!actual||actual.clipId!==row.clipId||!Object.entries(settings).every(([key,value])=>same(actual[key],value)))throw mismatch('Audio volume or fades could not be confirmed.');
  if(!wanted.source||!Number.isFinite(wanted.source.startSeconds)||wanted.source.startSeconds<0||!Number.isFinite(wanted.source.endSeconds)||wanted.source.endSeconds<=wanted.source.startSeconds)throw Error('Audio source evidence is unavailable.');
  const source={startSeconds:wanted.source.startSeconds,endSeconds:wanted.source.endSeconds,playbackSpeed:{numerator:1,denominator:1},preserveAudioPitch:true,...wanted.source};
  if(!Number.isSafeInteger(source.playbackSpeed?.numerator)||source.playbackSpeed.numerator<1||!Number.isSafeInteger(source.playbackSpeed?.denominator)||source.playbackSpeed.denominator<1||typeof source.preserveAudioPitch!=='boolean')throw Error('Audio source evidence is invalid.');
  if(row.playbackSpeed?.numerator!==source.playbackSpeed.numerator||row.playbackSpeed?.denominator!==source.playbackSpeed.denominator||row.preserveAudioPitch!==source.preserveAudioPitch)throw mismatch('Audio playback policy could not be confirmed.');
  // Time uses floating-point arithmetic noise only, not the relative tolerance
  // used for level/fades. A small changed source instant must remain detectable.
  const timeSame=(a,b)=>Number.isFinite(a)&&Math.abs(a-b)<=8*Number.EPSILON*Math.max(1,Math.abs(a),Math.abs(b));
  // An unsaved working copy has no persisted source read. Keep the requested
  // interval as intent; only saved verification supplies independently read
  // sources. Never infer the source offset from timeline placement.
  if(observedSources!==null){
   if(typeof readSource!=='function')throw Error('Audio source observation is unavailable.');
   let observed;try{observed=readSource(observedSources,row);}catch(cause){throw Object.assign(Error('Audio source timing could not be confirmed.'),{cause});}
   if(!observed||observed.clipId!==row.clipId||!timeSame(observed.startSeconds,source.startSeconds)||!timeSame(observed.endSeconds,source.endSeconds))throw mismatch('Audio source timing could not be confirmed.');
  }
  receipts.push({clipId:wanted.clipId,trackId:wanted.trackId,trackKind:wanted.trackKind,resourceId:wanted.resourceId,startFrame:wanted.startFrame,endFrame:wanted.endFrame,audioSourceIndexes:wanted.audioSourceIndexes,settings,source});
 }
 return receipts;
}
function imageProgramsFeature(selects,config=null,format=null){
 const issue=message=>Object.assign(Error(message),{code:'IMAGE_PROGRAM_INVALID',publicMessage:message});
 const guarded=fn=>async(...args)=>{try{return await fn(...args);}catch(cause){if(cause?.code==='IMAGE_PROGRAM_INVALID')throw cause;throw Object.assign(issue('Image program state could not be confirmed.'),{cause});}};
 const same=(a,b)=>{
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const keys=Object.keys(b);return Object.keys(a).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(a,key)&&same(a[key],b[key]));
 };
 const source=program=>program.shader?{shader:program.shader}:{tsxCode:program.tsxCode};
 const validSource=program=>program&&((typeof program.tsxCode==='string'&&program.tsxCode.length>0&&!program.shader)||(!program.tsxCode&&program.shader?.graph?.schema==='Cutback.ShaderEffect.1'));
 const normalized=program=>({...source(program),editableParameters:program.editableParameters,parameters:{...Object.fromEntries(program.editableParameters.map(d=>[d.key,d.defaultValue])),...program.parameters}});
 const matches=(actual,wanted)=>actual&&same(source(actual),source(wanted))&&same(actual.editableParameters,wanted.editableParameters)&&same(actual.parameters,wanted.parameters);
 // Reconcile a caller-owned program intent on Main or overlay visuals. Names
 // only locate candidates; code, values, controls, intervals and order prove a
 // match. Preflight the whole intent before the caller's optional mutation.
 const reconcile=guarded(async(draft,input,beforeApply=null)=>{
  if(!['clips','motionGraphics','motionGraphicProgram','videoEffects','videoEffectProgram','addMotionGraphic','addVideoEffect','rangeAtFrames'].every(key=>typeof draft[key]==='function'))throw issue('Update Selects to verify authored programs.');
  const text=JSON.stringify(input,(_key,value)=>{if(typeof value==='number'&&!Number.isFinite(value)||['function','bigint','symbol'].includes(typeof value))throw issue('Program intent contains an unsupported value.');return value;});
  if(!text||text.length>8*1024*1024)throw issue('Program intent exceeds its input limit.');
  const intent=JSON.parse(text),names=value=>Array.isArray(value)&&value.length<=32&&new Set(value).size===value.length&&value.every(name=>typeof name==='string'&&name.length>0&&name.length<=256);
  if(!intent||!names(intent.graphicNames)||!names(intent.effectNames)||!Array.isArray(intent.graphics)||intent.graphics.length>256||!Array.isArray(intent.clips)||intent.clips.length>256||new Set(intent.graphics.map(g=>g.name)).size!==intent.graphics.length||new Set(intent.clips.map(c=>c.clipId)).size!==intent.clips.length||beforeApply!==null&&typeof beforeApply!=='function')throw issue('Program intent is incomplete.');
  const prepare=program=>{
   if(!validSource(program)||!program.parameters||typeof program.parameters!=='object'||Array.isArray(program.parameters)||!Array.isArray(program.editableParameters)||program.editableParameters.length>256||new Set(program.editableParameters.map(d=>d?.key)).size!==program.editableParameters.length)throw issue('Program source or controls are incomplete.');
   return normalized(program);
  };
  const graphicPlans=intent.graphics.map(g=>{
   if(!g||typeof g.tsxCode!=='string'||g.shader||!intent.graphicNames.includes(g.name)||!Number.isSafeInteger(g.startFrame)||g.startFrame<0||!Number.isSafeInteger(g.endFrame)||g.endFrame<=g.startFrame)throw issue('Graphic intent has an invalid interval.');
   return {...g,program:prepare(g)};
  });
  const clipPlans=intent.clips.map(c=>{
   if(!c||!Number.isSafeInteger(c.clipId)||c.clipId<0||typeof c.trackId!=='string'||!c.trackId||!Array.isArray(c.effects)||c.effects.length>32||new Set(c.effects.map(e=>e.name)).size!==c.effects.length)throw issue('Effect intent has an invalid target.');
   return {...c,effects:c.effects.map(e=>{if(!e||!intent.effectNames.includes(e.name))throw issue('Effect intent has an invalid name.');return {name:e.name,program:prepare(e)};})};
  });
  const rowFor=async wanted=>{
   const rows=await draft.clips({trackScope:'all'}),row=rows.find(c=>c.clipId===wanted.clipId&&c.trackId===wanted.trackId);
   if(!row||!['main','video'].includes(row.trackKind)||!row.resourceId)throw issue('Effect intent target could not be confirmed.');return row;
  };
  const graphicPresent=async wanted=>{
   const candidates=(await draft.motionGraphics()).filter(g=>g.name===wanted.name);
   if(candidates.length>1)throw issue('Graphic intent matches several placements.');
   if(!candidates.length)return false;
   const clip=candidates[0].clip;
   if(clip.trackKind!=='video'||clip.startFrame!==wanted.startFrame||clip.endFrame!==wanted.endFrame||!matches(await draft.motionGraphicProgram(clip),wanted.program))throw issue('Graphic program, controls or interval differ from the intended result.');
   return true;
  };
  const effectState=async(wanted,complete)=>{
   const all=await draft.videoEffects(await rowFor(wanted));
   if(!Array.isArray(all)||all.some((e,index)=>e.effectIndex!==index||e.clipId!==wanted.clipId||e.trackId!==wanted.trackId))throw issue('Effect stack target could not be confirmed.');
   const managed=all.filter(e=>intent.effectNames.includes(e.name));
   if(managed.length>wanted.effects.length||complete&&managed.length!==wanted.effects.length)throw issue('Effect intent count could not be confirmed.');
   for(const [index,e] of managed.entries()){
    const expected=wanted.effects[index];
    if(e.name!==expected.name||e.enabled!==true||!matches(await draft.videoEffectProgram(e),expected.program))throw issue('Effect program, controls or prefix order differ from the intended result.');
   }
   return {count:managed.length,stack:all.map(e=>({name:e.name,effectName:e.effectName,enabled:e.enabled}))};
  };
  for(const g of graphicPlans)g.kept=await graphicPresent(g);
  for(const c of clipPlans)c.before=await effectState(c,false);
  // Muting and other caller policy run only after every existing program was
  // checked. All targets below are reread after that edit and each addition.
  if(beforeApply)await beforeApply();
  let graphicsAdded=0,graphicsKept=0;
  const effects=Object.fromEntries(intent.effectNames.map(name=>[name,{added:0,kept:0}]));
  for(const g of graphicPlans){
   if(g.kept){graphicsKept++;continue;}
   await draft.addMotionGraphic({within:await draft.rangeAtFrames(g.startFrame,g.endFrame),label:g.name,tsxCode:g.program.tsxCode,parameters:g.program.parameters,editableParameters:g.program.editableParameters});graphicsAdded++;
  }
  for(const c of clipPlans){
   for(const [index,e] of c.effects.entries()){
    if(index<c.before.count){effects[e.name].kept++;continue;}
    await draft.addVideoEffect({clip:await rowFor(c),label:e.name,...source(e.program),parameters:e.program.parameters,editableParameters:e.program.editableParameters});effects[e.name].added++;
   }
  }
  // Writer acknowledgements are not evidence that a program was applied.
  for(const g of graphicPlans)if(!await graphicPresent(g))throw issue('The intended graphic was not applied.');
  for(const c of clipPlans){
   const after=await effectState(c,true);
   if(!same(after.stack.slice(0,c.before.stack.length),c.before.stack))throw issue('An existing effect stack changed while applying programs.');
  }
  return {graphicsAdded,graphicsKept,effects};
 });
 const inspect=async(draft,expected)=>{
  if(!('videoEffects' in draft)||!('videoEffectProgram' in draft)||!('motionGraphicProgram' in draft))throw issue('Update Selects to verify Image programs.');
  const rows=(await draft.clips({trackScope:'all'})).filter(c=>c.trackKind==='video');
  if(!Array.isArray(expected)||expected.length!==rows.length||new Set(expected.map(c=>c.clipId)).size!==expected.length)throw issue('Visual program count could not be confirmed.');
  const sources=[],clips=[];
  const pack=program=>{const p=normalized(program);const value=p.shader||p.tsxCode;let source=sources.findIndex(s=>same(s,value));if(source<0){source=sources.length;sources.push(value);}return {source,parameters:p.parameters,editableParameters:p.editableParameters};};
  for(const wanted of expected){
   const clip=rows.find(c=>c.clipId===wanted.clipId&&c.trackId===wanted.trackId);if(!clip)throw issue('Visual program target could not be confirmed.');
   const effects=await draft.videoEffects(clip);
   if(!Array.isArray(effects)||effects.length!==wanted.effects.length)throw issue('Effect stack could not be confirmed.');
   const checked=[];
   for(const [index,entry] of wanted.effects.entries()){
    const actual=effects[index],program=normalized(entry);
    if(actual.effectIndex!==index||actual.name!==entry.name||actual.enabled!==true||!matches(await draft.videoEffectProgram(actual),program))throw issue('Effect program, order or controls could not be confirmed.');
    checked.push({name:entry.name,...pack(program)});
   }
   const graphic=await draft.motionGraphicProgram(clip);
   if(wanted.graphic?!matches(graphic,normalized(wanted.graphic)):graphic!==null)throw issue('Graphic program or controls could not be confirmed.');
   clips.push({clipId:clip.clipId,trackId:clip.trackId,effects:checked,graphic:wanted.graphic?pack(wanted.graphic):null});
  }
  return {sources,clips};
 };
 const presets=new Map();
 const preset=async id=>{
  if(!config)throw issue('Effect preset preparation requires an authoring target.');
  if(presets.has(id))return presets.get(id);
  const definition=await selects.effectPresets.get(id);
  if(definition?.id!==id||definition.kind!=='effect'||typeof definition.label!=='string'||!Array.isArray(definition.editableParameters)||!definition.parameters)throw issue('Effect preset definition could not be confirmed.');
  // The public preset definition omits effect TSX. Resolve a canonical program
  // in an isolated unsaved reference, never by adopting the target's output.
  const project=selects.project(config.projectId),probe=await project.createDraft({name:'Image preset reference'});
  await probe.insertGap({seconds:config.plan.durationFrames/config.plan.fps});await probe.setFrameSize(config.plan.canvas);
  await probe.overlayResource({resource:project.resource(config.sources[0].resourceId),over:await probe.rangeAtFrames(0,config.plan.durationFrames)});
  if(!('videoEffects' in probe)||!('videoEffectProgram' in probe))throw issue('Update Selects to verify effect presets.');
  let clips=(await probe.clips({trackScope:'all'})).filter(c=>c.trackKind==='video');if(clips.length!==1)throw issue('Effect preset reference could not be confirmed.');
  const applied=await probe.applyEffectPreset({clip:clips[0],presetId:id,parameters:definition.parameters});
  if(applied?.presetId!==id)throw issue('Effect preset identity could not be confirmed.');
  clips=(await probe.clips({trackScope:'all'})).filter(c=>c.trackKind==='video');
  const effects=await probe.videoEffects(clips[0]);if(effects.length!==1||effects[0].enabled!==true||effects[0].name!==definition.label)throw issue('Effect preset reference stack could not be confirmed.');
  const program=await probe.videoEffectProgram(effects[0]),expected=normalized({...source(program||{}),parameters:definition.parameters,editableParameters:definition.editableParameters});
  if(!validSource(program)||!matches(program,expected))throw issue('Effect preset reference program could not be confirmed.');
  const value={name:definition.label,...expected};presets.set(id,value);return value;
 };
 const confirm=details=>{
  if(!config||!format)throw issue('Program receipt confirmation requires an authoring target.');
  const result={draftId:config.partialDraftId||'x'.repeat(120),fps:config.plan.fps,durationFrames:config.plan.durationFrames,frameSize:config.plan.canvas,clips:config.clips,...details};
  // Reserve more than a UUID for the post-commit identity. Check the actual
  // journal envelope and ASCII encoding before the only persistence boundary.
  try{format(config.runReceipt?{...JSON.parse(config.runReceipt.expectedText),status:'saved',result}:result);}catch(cause){throw Object.assign(issue('The Image program receipt exceeds its limit or could not be prepared.'),{cause});}
 };
 const verify=(draft,receipt)=>inspect(draft,receipt.clips.map(c=>{const expand=p=>({...typeof receipt.sources[p.source]==='string'?{tsxCode:receipt.sources[p.source]}:{shader:receipt.sources[p.source]},parameters:p.parameters,editableParameters:p.editableParameters});return {...c,effects:c.effects.map(e=>({name:e.name,...expand(e)})),graphic:c.graphic?expand(c.graphic):null};}));
 return {inspect:guarded(inspect),preset:guarded(preset),confirm,verify:guarded(verify),reconcile};
}
async function authorAtomicImageDraft(selects,config,finish,placeImages,sourceFacts,inspectGraphics,inspectTransforms,inspectAudio,programFeature,format,bindPlacement){
 let stage='read';
 try{
  const {projectId,plan,sources,items,partialDraftId}=config,project=selects.project(projectId);
  if(partialDraftId&&!(await project.meta()).draftIds.includes(partialDraftId))throw Error('Partial Draft is not in this Project.');
  const draft=partialDraftId?selects.draft(partialDraftId):await project.createDraft({name:config.name});
  if(!('motionGraphics' in draft)||!('motionGraphicProgram' in draft))throw Error('Update Selects to verify editable graphics.');
  if(!('clipTransform' in draft))throw Error('Update Selects to verify Image transforms.');
  if(!partialDraftId){
   stage='working copy';
   if(config.main){await draft.insertResource({resourceId:config.main.resourceId,sourceRange:{startSeconds:config.main.startSeconds,endSeconds:config.main.startSeconds+plan.durationFrames/plan.fps}});}
   else await draft.insertGap({seconds:plan.durationFrames/plan.fps});
   await draft.setFrameSize(plan.canvas);
  }else{
   const rows=await draft.clips({trackScope:'all'});
   if(rows.some(row=>row.trackKind!=='main'||(config.main?row.resourceId!==config.main.resourceId:Boolean(row.resourceId)))||config.main&&rows.length!==1)throw Error('Partial Draft is not empty; inspect it before retrying.');
  }
  stage='placement';const native=await placeImages(selects,projectId,draft,plan,sources,items,sourceFacts,bindPlacement);
  const clips=native.placements.map(({key,slot,appearance,clipId,trackId,resourceId,startFrame,endFrame})=>({key,slot,appearance,clipId,trackId,resourceId,startFrame,endFrame}));
  stage='finish';const result=await finish(selects,config,draft,native,inspectGraphics,inspectTransforms,inspectAudio,programFeature(selects,{...config,clips},format));
  return {...result,fps:plan.fps,durationFrames:plan.durationFrames,frameSize:plan.canvas,clips};
 }catch(error){return {status:stage==='finish'?'outcomeUnknown':'notSaved',stage,message:String(error?.message||error),draftId:config.partialDraftId||null};}
}
function buildAtomicImageDraftScript(config,finishSource){
 const receipt=config.runReceipt?`await (${writeTemplateRunResult.toString()})(selects,config.runReceipt,result,${templateRunJSON.toString()},${templateRunBase64.toString()})`:'result';
 return `const config=${JSON.stringify(config)};const result=await (${authorAtomicImageDraft.toString()})(selects,config,${finishSource},${placeWorkingCopyImages.toString()},${nativeImageSources.toString()},${inspectImageGraphics.toString()},${inspectImageTransforms.toString()},${inspectImageAudio.toString()},${imageProgramsFeature.toString()},${templateRunJSON.toString()},${bindMediaPlacement.toString()});return ${receipt};`;
}
async function verifyAtomicImageDraft(sdk,projectId,result){
 const {draftId,fps,durationFrames,frameSize,clips,graphics,transforms,audio,programs}=result,expected={draftId,fps,durationFrames,frameSize,clips,graphics,transforms,audio,programs};
 const unverified=cause=>{const message='The saved Image Draft, graphics or sound could not be confirmed. Inspect the Draft before starting a new run.';return Object.assign(Error(message),{code:'IMAGE_SAVE_UNVERIFIED',draftId,publicMessage:message,cause});};
 if(!Array.isArray(graphics))throw Object.assign(Error('Saved graphic receipts are unavailable. Inspect the existing Draft before starting a new run.'),{code:'IMAGE_SAVE_UNVERIFIED',draftId});
 if(!Array.isArray(transforms))throw unverified('Saved transform receipts are unavailable.');
 if(!Array.isArray(audio))throw unverified('Saved Audio receipts are unavailable.');
 if(audio.some(row=>!row?.source))throw unverified('Saved Audio source evidence is unavailable.');
 if(!programs)throw unverified('Saved program receipts are unavailable.');
 let response;try{
  const sources=audio.length?await readTemplateDraftSources(sdk,projectId,draftId):null;
  response=await sdk.runScript({summary:'Verify complete saved Image Draft',allowCommit:false,script:`const readSource=${sources?templateObservedSource.toString():'null'};const expected=${JSON.stringify(expected)};const project=selects.project(${JSON.stringify(projectId)});if(!(await project.meta()).draftIds.includes(expected.draftId))throw Error('Saved Draft is not in this Project');const draft=selects.draft(expected.draftId),meta=await draft.meta(),rows=await draft.clips({trackScope:'all'});if(meta.fps!==expected.fps||meta.durationFrames!==expected.durationFrames||meta.frameSize.width!==expected.frameSize.width||meta.frameSize.height!==expected.frameSize.height)throw Error('Saved Draft frame grid could not be confirmed');if(rows.filter(row=>row.trackKind==='video'&&row.resourceId).length!==expected.clips.length)throw Error('Saved Image count could not be confirmed');for(const wanted of expected.clips){const actual=rows.find(row=>row.clipId===wanted.clipId&&row.trackId===wanted.trackId);if(!actual||actual.resourceId!==wanted.resourceId||actual.startFrame!==wanted.startFrame||actual.endFrame!==wanted.endFrame)throw Error('Saved Image placement could not be confirmed');}await (${inspectImageGraphics.toString()})(draft,expected.graphics);await (${inspectImageTransforms.toString()})(draft,expected.transforms);await (${inspectImageAudio.toString()})(draft,expected.audio,project,false,${JSON.stringify(sources)},readSource);await (${imageProgramsFeature.toString()})(selects).verify(draft,expected.programs);return {verified:true};`});
  if(response?.isError||response?.result?.verified!==true)throw Error('The saved Draft inspection did not complete.');
  if(sources){
   const after=await readTemplateDraftSources(sdk,projectId,draftId,sources.owner?.libraryId??null);
   if(JSON.stringify(after)!==JSON.stringify(sources))throw Error('The saved Draft changed during source verification.');
  }
 }catch(cause){throw unverified(cause);}
 return result;
}
async function readImageDraftFps(sdk,projectId,draftId=null){
 const response=await sdk.runScript({summary:'Read the Project frame rate',allowCommit:false,script:`const p=selects.project(${JSON.stringify(projectId)}),id=${JSON.stringify(draftId)};if(id&&!(await p.meta()).draftIds.includes(id))throw Error('Partial Draft is not in this Project.');const d=id?selects.draft(id):await p.createDraft({name:'Image frame rate check'});return {fps:(await d.meta()).fps};`});
 if(response.isError||!Number.isFinite(response.result?.fps)||response.result.fps<=0)throw Error('Could not read the Project frame rate.');
 return response.result.fps;
}
// native-image-authoring:end
// template-run:start
// Durable ownership of one app-supplied template run. Original source is embedded
// into its declared consumers; no cross-plugin runtime import is required.
function templateRunJSON(value,limit=49152) {
 // Request data may opt in to a larger budget. Receipt envelopes and their
 // exclusive/CAS writes retain the original 48 KiB default and exact bytes.
 if(!Number.isSafeInteger(limit)||limit<49152||limit>131072)throw Error('Invalid template request limit.');
 const text=JSON.stringify(value).replace(/[\u007f-\uffff]/g,char=>'\\u'+char.charCodeAt(0).toString(16).padStart(4,'0'));
 if(text.length>limit)throw Error('The template run receipt exceeds the local file limit.');
 return text;
}
// SDK scripts have no browser/Node encoding globals. The JSON above is ASCII.
function templateRunBase64(text) {
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let out='';
 for(let i=0;i<text.length;i+=3){
  const a=text.charCodeAt(i),b=text.charCodeAt(i+1),c=text.charCodeAt(i+2);
  out+=alphabet[a>>2]+alphabet[((a&3)<<4)|(Number.isNaN(b)?0:b>>4)]+(Number.isNaN(b)?'=':alphabet[((b&15)<<2)|(Number.isNaN(c)?0:c>>6)])+(Number.isNaN(c)?'=':alphabet[c&63]);
 }
 return out;
}
function templateRunIssue(code,message) {
 return Object.assign(Error(message),{code,publicMessage:message});
}
// A canonical, bounded JSON value for snapshots/recipes. Unlike the small run
// envelope, state can include fonts/programs; it is stored in chunked files.
function templateStateJSON(value,limit=8388608){
 const text=JSON.stringify(value,(_key,item)=>{
  if(typeof item==='number'&&!Number.isFinite(item)||['function','symbol','bigint'].includes(typeof item))throw Error('Template state contains an unsupported value.');
  return item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item;
 }).replace(/[\u007f-\uffff]/g,char=>'\\u'+char.charCodeAt(0).toString(16).padStart(4,'0'));
 if(text.length>limit)throw Error('Template state exceeds its input limit.');return text;
}
// SDK-safe state of every exposed timeline row. Read-only targets never cross
// edits or script calls. Working copies have no source-window read capability:
// null is explicitly pending, never a source window inferred from the recipe.
async function readTemplateSavedState(draft,sources=null,observeSource=null){
 const meta=await draft.meta(),graphics=await draft.motionGraphics(),rows=await draft.clips({trackScope:'all'});
 if(!Number.isFinite(meta.fps)||meta.fps<=0||!Number.isSafeInteger(meta.durationFrames)||meta.durationFrames<1||!Number.isSafeInteger(meta.frameSize?.width)||meta.frameSize.width<1||!Number.isSafeInteger(meta.frameSize?.height)||meta.frameSize.height<1||!Array.isArray(rows)||rows.length>1024||new Set(rows.map(r=>r.clipId)).size!==rows.length||!Array.isArray(graphics))throw Error('The Draft state is incomplete.');
 const clips=[];
 for(const row of rows){
  if(!Number.isSafeInteger(row.clipId)||typeof row.trackId!=='string'||!row.trackId||!Number.isSafeInteger(row.startFrame)||row.startFrame<0||!Number.isSafeInteger(row.endFrame)||row.endFrame<=row.startFrame)throw Error('The Draft row is incomplete.');
  const graphic=graphics.find(g=>g.clip.clipId===row.clipId&&g.clip.trackId===row.trackId),media=row.resourceId!=null&&['main','video','audio'].includes(row.trackKind),visual=['main','video'].includes(row.trackKind)&&(media||!!graphic);
  const effects=[];
  if(visual)for(const effect of await draft.videoEffects(row))effects.push({effectIndex:effect.effectIndex,name:effect.name,effectName:effect.effectName,enabled:effect.enabled,program:await draft.videoEffectProgram(effect)});
  clips.push({clipId:row.clipId,trackId:row.trackId,trackKind:row.trackKind,resourceId:row.resourceId??null,startFrame:row.startFrame,endFrame:row.endFrame,videoIndex:row.videoIndex??null,audioSourceIndexes:row.audioSourceIndexes??null,color:row.color??null,playbackSpeed:row.playbackSpeed??null,preserveAudioPitch:row.preserveAudioPitch??null,text:row.text??null,
   source:media&&sources!==null?observeSource(sources,row):null,audio:media?await draft.clipAudio(row):null,transform:visual?await draft.clipTransform(row):null,effects,graphic:graphic?{name:graphic.name,program:await draft.motionGraphicProgram(row)}:null});
 }
 clips.sort((a,b)=>a.clipId-b.clipId);
 return {fps:meta.fps,durationFrames:meta.durationFrames,frameSize:{width:meta.frameSize.width,height:meta.frameSize.height},clips,...sources===null?{sourcesPending:true}:{}};
}
// SDK-safe immutable snapshot publication and comparison. Compare actual bytes
// in bounded chunks as well as their fresh fingerprint; no SDK encoding global
// or handwritten hash implementation is required.
async function templateStateFile(selects,path,text,encode,expected=null,fingerprint=null){
 const files=selects.files;
 if(!files||!['readRange','writeChunk'].every(key=>typeof files[key]==='function')||typeof fingerprint!=='function'||typeof text!=='string'||!text.length||text.length>8388608)throw Error('Update Selects to confirm template state files.');
 if(!expected){
  for(let offset=0;offset<text.length;offset+=49152){const chunk=text.slice(offset,offset+49152),reply=await files.writeChunk({path,offset,base64:encode(chunk),...offset===0?{mode:'exclusive'}:{}});if(reply?.bytesWritten!==chunk.length)throw Error('Template state file write was incomplete.');}
  const observed=await fingerprint(files,path);
  if(!observed||observed.size!==text.length||typeof observed.sha256!=='string'||!/^[a-f0-9]{64}$/.test(observed.sha256))throw Error('Template state file could not be fingerprinted.');
  expected={path,...observed};
 }
 if(expected.path!==path||expected.size!==text.length)throw Error('The saved template state has changed.');
 const before=await fingerprint(files,path);
 if(!before||before.size!==expected.size||before.sha256!==expected.sha256)throw Error('The template state file has changed.');
 for(let offset=0;offset<text.length;offset+=49152){const chunk=text.slice(offset,offset+49152),reply=await files.readRange({path,offset,length:chunk.length});if(reply?.bytesRead!==chunk.length||reply.base64!==encode(chunk))throw Error('The saved Draft differs from its owned state.');}
 const after=await fingerprint(files,path);if(!after||after.size!==expected.size||after.sha256!==expected.sha256)throw Error('The template state file changed while reading.');
 return expected;
}
function validateTemplateRun(row,scope,digest,recordPath=null) {
 const invalid=()=>templateRunIssue('TEMPLATE_RUN_INVALID','The saved run record could not be verified. Inspect the Project before starting a new run.');
 if(!row||row.version!==1||!row.scope||Object.keys(row.scope).length!==4||Object.keys(scope).some(key=>row.scope[key]!==scope[key])||row.requestDigest!==digest||
  typeof row.owner!=='string'||!/^[\da-f-]{36}$/i.test(row.owner)||!['claimed','saved','notSaved','outcomeUnknown','retired'].includes(row.status))throw invalid();
 if(row.savedDraftId!==undefined&&(row.status!=='outcomeUnknown'||typeof row.savedDraftId!=='string'||!row.savedDraftId||row.savedDraftId.length>1024||row.savedDraftId.includes('\0')))throw invalid();
 if(row.status==='saved'){
  const r=row.result;
  if(!r||typeof r.draftId!=='string'||!r.draftId||!Number.isFinite(r.fps)||r.fps<=0||!Number.isSafeInteger(r.durationFrames)||r.durationFrames<1||
   !Number.isSafeInteger(r.frameSize?.width)||r.frameSize.width<1||!Number.isSafeInteger(r.frameSize?.height)||r.frameSize.height<1||!Array.isArray(r.clips)||!r.clips.length||r.clips.length>256||
   r.clips.some(c=>!c||!Number.isSafeInteger(c.clipId)||typeof c.trackId!=='string'||!c.trackId||typeof c.resourceId!=='string'||!c.resourceId||!Number.isSafeInteger(c.startFrame)||!Number.isSafeInteger(c.endFrame)||c.startFrame<0||c.endFrame<=c.startFrame||c.endFrame>r.durationFrames))throw invalid();
  if(new Set(r.clips.map(c=>c.clipId)).size!==r.clips.length)throw invalid();
  if(r.stateFile!==undefined){const file=r.stateFile;if(!file||Object.keys(file).length!==3||typeof file.path!=='string'||!recordPath||file.path!==recordPath+'.state-'+row.owner+'.json'||typeof file.sha256!=='string'||!/^[a-f0-9]{64}$/.test(file.sha256)||!Number.isSafeInteger(file.size)||file.size<1||file.size>8388608)throw invalid();}
  if(r.sourceGuard!==undefined){
   const g=r.sourceGuard;if(!g||typeof g!=='object'||Array.isArray(g))throw invalid();
   if(g.version===1){
    if(g.owner!==row.owner||!recordPath||g.path!==recordPath+'.sources-'+row.owner+'.json'||!Array.isArray(g.intent)||!g.intent.length||g.intent.length>1000)throw invalid();
   }else if(g.version===2){
    if(scope.pluginId!=='photo-gallery-no2'||Object.keys(g).length!==4||!recordPath||g.path!==recordPath+'.gallery-sources-'+row.owner+'.json'||!Number.isSafeInteger(g.size)||g.size<1||g.size>8388608||typeof g.sha256!=='string'||!/^[a-f0-9]{64}$/.test(g.sha256))throw invalid();
   }else{
    // Gallery guards source metadata/files; Vlog's versioned guard binds saved
    // clip windows to a separately retained planner intent. Keep both contracts.
    const text=(value,max)=>typeof value==='string'&&value.length>0&&value.length<=max&&!value.includes('\0');
    const identity=item=>item&&text(item.resourceId,1024)&&text(item.path,4096);
    if(scope.pluginId!=='photo-gallery-no2'||Object.keys(g).length!==4||!Array.isArray(g.media)||!g.media.length||g.media.length>21||!Array.isArray(g.files)||!g.files.length||g.files.length>22||!text(g.signature,32768))throw invalid();
    for(const item of g.media)if(!identity(item)||!['image','video'].includes(item.kind)||!Number.isSafeInteger(item.width)||item.width<1||!Number.isSafeInteger(item.height)||item.height<1||item.kind==='video'&&(!Number.isFinite(item.durationSeconds)||item.durationSeconds<=0)||['focusX','focusY'].some(key=>item[key]!==undefined&&(!Number.isFinite(item[key])||item[key]<0||item[key]>1)))throw invalid();
    if(g.music!==null&&(!identity(g.music)||!Number.isFinite(g.music.durationSeconds)||g.music.durationSeconds<=0||g.music.startFrame!==undefined&&(!Number.isSafeInteger(g.music.startFrame)||g.music.startFrame<0)))throw invalid();
    if(new Set(g.files.map(file=>file?.path)).size!==g.files.length||g.files.some(file=>!file||Object.keys(file).length!==3||!text(file.path,4096)||!Number.isSafeInteger(file.size)||file.size<1||typeof file.sha256!=='string'||!/^[a-f0-9]{64}$/.test(file.sha256))||[...g.media,...g.music?[g.music]:[]].some(item=>!g.files.some(file=>file.path===item.path)))throw invalid();
    const signature=JSON.stringify({media:g.media.map(item=>[item.resourceId,item.path,item.kind,item.width,item.height,item.kind==='video'?item.durationSeconds:null]),music:g.music?[g.music.resourceId,g.music.path,g.music.durationSeconds]:null});
    if(signature!==g.signature)throw invalid();
   }
  }
  if(r.graphics!==undefined){
   if(!Array.isArray(r.graphics)||r.graphics.length>256||r.graphics.some(g=>!g||!Number.isSafeInteger(g.clipId)||g.clipId<0||typeof g.trackId!=='string'||!g.trackId||!Number.isSafeInteger(g.startFrame)||!Number.isSafeInteger(g.endFrame)||g.startFrame<0||g.endFrame<=g.startFrame||g.endFrame>r.durationFrames||!g.parameters||typeof g.parameters!=='object'||Array.isArray(g.parameters)||'tsxCode' in g))throw invalid();
   if(new Set(r.graphics.map(g=>g.clipId)).size!==r.graphics.length||r.graphics.some(g=>r.clips.some(c=>c.clipId===g.clipId)))throw invalid();
  }
  if(r.transforms!==undefined){
   const visual=[...r.clips,...(r.graphics??[])],point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
   if(!Array.isArray(r.transforms)||r.transforms.length!==visual.length||new Set(r.transforms.map(t=>t?.clipId)).size!==r.transforms.length)throw invalid();
   for(const row of r.transforms){
    const t=row?.transform;
    if(!row||!visual.some(c=>c.clipId===row.clipId&&c.trackId===row.trackId)||Object.keys(row).length!==3||!t||Object.keys(t).length!==10||typeof t.enabled!=='boolean'||typeof t.flipHorizontal!=='boolean'||typeof t.flipVertical!=='boolean'||!point(t.position)||!point(t.scale)||t.scale.x<=0||t.scale.y<=0||!point(t.anchor)||!Number.isFinite(t.rotation))throw invalid();
    for(const key of ['positionKeys','scaleKeys','rotationKeys'])if(!Array.isArray(t[key])||t[key].length>256||t[key].some(k=>!k||!Number.isFinite(k.atSeconds)||k.atSeconds<0||(key==='positionKeys'?!point(k):!Number.isFinite(k[key==='scaleKeys'?'scale':'rotation']))))throw invalid();
   }
  }
  if(r.audio!==undefined){
   if(!Array.isArray(r.audio)||r.audio.length>256||new Set(r.audio.map(a=>a?.clipId)).size!==r.audio.length)throw invalid();
   const db=value=>Number.isFinite(value)&&value>=-60&&value<=12,visual=[...r.clips,...(r.graphics??[])];
   for(const a of r.audio){
    const s=a?.settings;
    if(!a||Object.keys(a).length!==(a.source===undefined?8:9)||!Number.isSafeInteger(a.clipId)||a.clipId<0||typeof a.trackId!=='string'||!a.trackId||!['main','audio'].includes(a.trackKind)||typeof a.resourceId!=='string'||!a.resourceId||!Number.isSafeInteger(a.startFrame)||!Number.isSafeInteger(a.endFrame)||a.startFrame<0||a.endFrame<=a.startFrame||a.endFrame>r.durationFrames||visual.some(c=>c.clipId===a.clipId)||!s||Object.keys(s).length!==4)throw invalid();
    if(a.source!==undefined){
     const t=a.source,rate=t?.playbackSpeed;
     if(!t||Object.keys(t).length!==4||!Number.isFinite(t.startSeconds)||t.startSeconds<0||!Number.isFinite(t.endSeconds)||t.endSeconds<=t.startSeconds||!rate||Object.keys(rate).length!==2||!Number.isSafeInteger(rate.numerator)||rate.numerator<1||!Number.isSafeInteger(rate.denominator)||rate.denominator<1||rate.numerator/rate.denominator<.01||rate.numerator/rate.denominator>100||typeof t.preserveAudioPitch!=='boolean')throw invalid();
    }
    if(a.audioSourceIndexes!==null&&(!Array.isArray(a.audioSourceIndexes)||a.audioSourceIndexes.length>256||new Set(a.audioSourceIndexes).size!==a.audioSourceIndexes.length||a.audioSourceIndexes.some(i=>!Number.isSafeInteger(i)||i<0)))throw invalid();
    const duration=(a.endFrame-a.startFrame)/r.fps;
    if(!Array.isArray(s.volumeKeys)||s.volumeKeys.length>256||(s.volumeKeys.length?s.volumeDb!==null:!db(s.volumeDb))||s.volumeKeys.some(k=>!k||!Number.isFinite(k.atSeconds)||k.atSeconds<0||k.atSeconds>duration||!db(k.volumeDb))||!Number.isFinite(s.fadeInSeconds)||s.fadeInSeconds<0||s.fadeInSeconds>duration||!Number.isFinite(s.fadeOutSeconds)||s.fadeOutSeconds<0||s.fadeOutSeconds>duration)throw invalid();
   }
  }
  if(r.programs!==undefined){
   const p=r.programs,visual=[...r.clips,...(r.graphics??[])],used=new Set();
   if(!p||Object.keys(p).length!==2||!Array.isArray(p.sources)||p.sources.length>256||p.sources.some(s=>typeof s==='string'?(!s||s.length>49152):(!s||s.graph?.schema!=='Cutback.ShaderEffect.1'||JSON.stringify(s).length>49152))||new Set(p.sources.map(s=>JSON.stringify(s))).size!==p.sources.length||!Array.isArray(p.clips)||p.clips.length!==visual.length||new Set(p.clips.map(c=>c?.clipId)).size!==p.clips.length)throw invalid();
   const entry=(e,effect)=>{
    if(!e||Object.keys(e).length!==(effect?4:3)||!Number.isSafeInteger(e.source)||e.source<0||e.source>=p.sources.length||!e.parameters||typeof e.parameters!=='object'||Array.isArray(e.parameters)||!Array.isArray(e.editableParameters)||e.editableParameters.length>256||effect&&(typeof e.name!=='string'||!e.name))throw invalid();
    if(new Set(e.editableParameters.map(d=>d?.key)).size!==e.editableParameters.length||e.editableParameters.some(d=>!d||typeof d.key!=='string'||!d.key||typeof d.label!=='string'||!['text','number','color','boolean','select'].includes(d.type)||!Object.prototype.hasOwnProperty.call(e.parameters,d.key)))throw invalid();
    used.add(e.source);
   };
   for(const c of p.clips){
    if(!c||Object.keys(c).length!==4||!visual.some(v=>v.clipId===c.clipId&&v.trackId===c.trackId)||!Array.isArray(c.effects)||c.effects.length>64)throw invalid();
    c.effects.forEach(e=>entry(e,true));
    const graphic=(r.graphics??[]).some(g=>g.clipId===c.clipId);
    if(graphic)entry(c.graphic,false);else if(c.graphic!==null)throw invalid();
   }
   if(used.size!==p.sources.length)throw invalid();
  }
 }
 return row;
}
// Called inside the SAME Main SDK invocation after authoring, before the reply.
// Only the exclusive claim's owner can publish this receipt; no save is retried.
async function writeTemplateRunResult(selects,claim,result,json,encode) {
 try{
  const row=JSON.parse(claim.expectedText),status=result.status;
  if(row.status!=='claimed'||!['saved','notSaved','outcomeUnknown'].includes(status))throw Error('Invalid run receipt state');
  let saved;
  if(status==='saved'){
   if(!('fps' in result)||!('durationFrames' in result)||!('frameSize' in result)||!('clips' in result)||typeof result.draftId!=='string'||!result.draftId)throw Error('Saved run receipt is incomplete');
   saved={draftId:result.draftId,fps:result.fps,durationFrames:result.durationFrames,frameSize:result.frameSize,clips:result.clips,...'graphics' in result?{graphics:result.graphics}:{},...'transforms' in result?{transforms:result.transforms}:{},...'audio' in result?{audio:result.audio}:{},...'programs' in result?{programs:result.programs}:{},...'stateFile' in result?{stateFile:result.stateFile}:{},...'sourceGuard' in result?{sourceGuard:result.sourceGuard}:{}};
  }
  const savedDraftId=status==='outcomeUnknown'?result.draftId:null;
  if(savedDraftId!=null&&(typeof savedDraftId!=='string'||!savedDraftId||savedDraftId.length>1024||savedDraftId.includes('\0')))throw Error('Invalid saved Draft identity');
  const next=json({...row,status,...saved?{result:saved}:{},...savedDraftId?{savedDraftId}:{}});
  const reply=await selects.files.compareAndReplace({path:claim.path,expectedBase64:encode(claim.expectedText),base64:encode(next)});
  return {...result,runReceiptSaved:reply?.replaced===true};
 }catch{return {...result,runReceiptSaved:false};}
}
async function executeTemplateRun(sdk,files,scope,request,isCurrent,perform,verify,options={}) {
 const fail=(code,message)=>{throw templateRunIssue(code,message);};
 const check=()=>{if(!isCurrent())fail('TEMPLATE_RUN_DETACHED','The template run ended.');};
 check();
 if(!options||['existingOnly','retryNotSaved','retireUnstarted'].some(key=>options[key]!==undefined&&typeof options[key]!=='boolean')||options.existingOnly&&(options.retryNotSaved||options.retireUnstarted)||options.retryNotSaved&&options.retireUnstarted)fail('TEMPLATE_RUN_INVALID','Invalid run recovery options.');
 if(!scope||!['pluginId','libraryId','projectId','runId'].every(key=>typeof scope[key]==='string'&&scope[key].length>0&&scope[key].length<=1024)||!/^[a-z0-9-]+$/.test(scope.pluginId))fail('TEMPLATE_RUN_INVALID','The template run target is incomplete. Start again from the Project.');
 scope={pluginId:scope.pluginId,libraryId:scope.libraryId,projectId:scope.projectId,runId:scope.runId};
 const targetCheck=async()=>{
  const target=await sdk.call('getProjectDraftScaffold',scope.projectId);
  if(target?.owner?.libraryId!==scope.libraryId||target.owner.projectId!==scope.projectId)fail('TEMPLATE_RUN_TARGET','The template run belongs to a different Project or library. Start again from the intended Project.');
  check();
 };
 await targetCheck();
 if(!files||!['join','homedir','exists','stat','readRange','writeFile','compareAndReplace','mkdir'].every(key=>typeof files[key]==='function'))fail('TEMPLATE_RUN_UNSUPPORTED','Update Selects to save and recover template runs safely.');
 if(typeof globalThis.crypto?.subtle?.digest!=='function'||typeof globalThis.TextEncoder!=='function'||typeof globalThis.TextDecoder!=='function')fail('TEMPLATE_RUN_UNSUPPORTED','Update Selects to save and recover template runs safely.');
 const digest=async(value,limit=49152)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(templateRunJSON(value,limit)))),n=>n.toString(16).padStart(2,'0')).join('');
 const key=await digest(scope),requestDigest=await digest(request,options.requestLimit??49152);
 const directory=files.join(files.homedir(),'.selects','plugin-data',scope.pluginId,'template-runs'),path=files.join(directory,key+'.json');
 let lastReadText=null;
 const read=async()=>{
  if(!await files.exists(path))return null;
  let row;
  try{
   for(let attempt=0;attempt<3;attempt++){
   const stat=await files.stat(path);if(stat?.isDirectory===false&&stat.size===0)continue;
   if(!stat||stat.isDirectory!==false||!Number.isSafeInteger(stat.size)||stat.size<1||stat.size>49152)throw Error('Invalid record size');
   const bytes=await files.readRange(path,0,stat.size),after=await files.stat(path);
   if(Object.prototype.toString.call(bytes)!=='[object Uint8Array]')throw Error('Invalid run record bytes');
   // A legitimate Main-side receipt may replace the claim between these reads.
   // Retry bounded observations; never parse a mixture or retry authoring.
   if(!after||['size','mtimeMs','ino'].some(key=>stat[key]!==after[key]))continue;
   if(bytes.byteLength!==stat.size)throw Error('Invalid run record bytes');
   lastReadText=new TextDecoder().decode(bytes);row=JSON.parse(lastReadText);break;
   }
   if(row===undefined)fail('TEMPLATE_RUN_PENDING','The run record is changing. Check its saved result again.');
  }catch(error){if(error?.code==='TEMPLATE_RUN_PENDING')throw error;fail('TEMPLATE_RUN_INVALID','The saved run record could not be read. Inspect the Project before starting a new run.');}
  return validateTemplateRun(row,scope,requestDigest,path);
 };
 const recover=async row=>{
  if(row.status==='saved'){await targetCheck();return verify({...row.result,status:'saved',projectId:scope.projectId});}
  if(row.status==='retired')throw Object.assign(templateRunIssue('TEMPLATE_RUN_RETIRED','This old operation was retired before saving. Start a new template run with the updated version.'),{outcome:'notSaved'});
  if(row.status==='notSaved')fail('TEMPLATE_RUN_NOT_SAVED','This run stopped before saving a Draft. Start a new run to retry.');
  if(row.status==='outcomeUnknown'&&row.savedDraftId)throw Object.assign(templateRunIssue('TEMPLATE_RUN_PENDING','The saved Draft '+row.savedDraftId+' could not be confirmed. Inspect it before starting another run.'),{draftId:row.savedDraftId});
  fail('TEMPLATE_RUN_PENDING','This run may still be saving or awaiting confirmation. Inspect the Project before starting another run.');
 };
 const existing=await read(),retryText=lastReadText;
 if(existing&&!((options.retryNotSaved||options.retireUnstarted)&&existing.status==='notSaved'))return recover(existing);
 if(options.existingOnly)fail('TEMPLATE_RUN_MISSING','The owned assembly record is missing. Inspect the Project before starting another run.');
 if(typeof globalThis.crypto?.randomUUID!=='function')fail('TEMPLATE_RUN_UNSUPPORTED','Update Selects to save and recover template runs safely.');
 const capability=await sdk.runScript({summary:'Check durable template run support',allowCommit:false,script:"return {supported:'files' in selects&&typeof selects.files?.compareAndReplace==='function'&&typeof selects.files?.writeChunk==='function'};"});
 if(capability.isError||capability.result?.supported!==true)fail('TEMPLATE_RUN_UNSUPPORTED','Update Selects to save and recover template runs safely.');
 await files.mkdir(directory,{recursive:true});check();
 const owner=crypto.randomUUID(),expectedText=templateRunJSON({version:1,scope,requestDigest,owner,status:'claimed'}),claim={path,expectedText};
 // Exclusive creation is a filesystem operation, including across app windows.
 // compareAndReplace alone serializes only one renderer bridge's own writes.
 if(existing){
  // Only a positive no-save is eligible. The exclusive generation lock covers
  // other renderer bridges too; a CAS alone does not provide that guarantee.
  const lock=path+'.retry-'+existing.owner;
  try{await files.writeFile(lock,owner,{flag:'wx'});}catch(cause){
   const stat=await files.stat(lock),bytes=stat?.size===owner.length?await files.readRange(lock,0,stat.size):null;
   if(!bytes||new TextDecoder().decode(bytes)!==owner)fail('TEMPLATE_RUN_PENDING','A retry of this known no-save run is awaiting confirmation.');
  }
  try{
   const replaced=await files.compareAndReplace(path,retryText,expectedText);
   if(!replaced){const row=await read();if(row?.owner!==owner)return recover(row);}
  }catch(cause){const row=await read();if(row?.owner!==owner)throw cause;}
 }else try{await files.writeFile(path,expectedText,{flag:'wx'});}catch(cause){
  const row=await read();
  if(!row)fail('TEMPLATE_RUN_STORAGE','The run could not be recorded. Nothing was dispatched. Check local file access and start a new run.');
  if(row.owner!==owner)return recover(row);
  // A lost claim ACK is safe to recover here: authoring has not been dispatched.
 }
 if(options.retireUnstarted){
  // An exclusive claim excludes older windows too. A distinct terminal state
  // cannot be mistaken for their retryable pre-save failure.
  const retired=templateRunJSON({...JSON.parse(expectedText),status:'retired'});
  try{await files.compareAndReplace(path,expectedText,retired);}catch{}
  const row=await read();if(row?.status==='retired')return recover(row);
  fail('TEMPLATE_RUN_PENDING','Retirement of this old operation could not be confirmed. Check the same run again.');
 }
 let dispatched=false;
 try{
  check();
  return await perform(claim,async()=>{await targetCheck();dispatched=true;});
 }catch(cause){
  if(!dispatched){
   // No authoring was dispatched. Never overwrite a later Main-side receipt.
   await files.compareAndReplace(path,expectedText,templateRunJSON({...JSON.parse(expectedText),status:'notSaved'})).catch(()=>{});
   if(cause&&typeof cause==='object')Object.assign(cause,{outcome:'notSaved'});
  }else{
   // Main may finish after the transport failed. Keep its expected claim intact
   // so the late receipt can land. A positively saved receipt permits readback.
   const row=await read();if(row?.status==='saved')return recover(row);
   if(row?.status==='notSaved')throw Object.assign(templateRunIssue('TEMPLATE_RUN_NOT_SAVED','This run stopped before saving a Draft. Start a new run to retry.'),{cause});
  }
  throw cause;
 }
}

// SDK-safe projection for an assembly receipt. Main media identity and frame
// intervals, routing, source windows, transforms and Main audio are confirmed
// here; this is not title/effect or other-track semantic approval.
async function readTemplateAssemblyState(draft,sources=null,observeSource=null){
 const meta=await draft.meta(),rows=await draft.clips({trackScope:'main'});
 if(!Number.isFinite(meta.fps)||meta.fps<=0||!Number.isSafeInteger(meta.frameSize?.width)||meta.frameSize.width<1||!Number.isSafeInteger(meta.frameSize?.height)||meta.frameSize.height<1||!Array.isArray(rows))throw Error('The assembled Draft metadata is incomplete.');
 const clips=[];
 for(const row of rows.filter(row=>row.resourceId!=null))clips.push({clipId:row.clipId,trackId:row.trackId,resourceId:row.resourceId,startFrame:row.startFrame,endFrame:row.endFrame,
  videoIndex:row.videoIndex??null,audioSourceIndexes:row.audioSourceIndexes??null,playbackSpeed:row.playbackSpeed??null,preserveAudioPitch:row.preserveAudioPitch??null,
  source:sources!==null?observeSource(sources,row):null,transform:await draft.clipTransform(row),audio:await draft.clipAudio(row)});
 clips.sort((a,b)=>a.clipId-b.clipId);
 if(!clips.length||clips.length>256||new Set(clips.map(c=>c.clipId)).size!==clips.length||clips.some(c=>!Number.isSafeInteger(c.clipId)||c.clipId<0||typeof c.trackId!=='string'||!c.trackId||typeof c.resourceId!=='string'||!c.resourceId||!Number.isSafeInteger(c.startFrame)||!Number.isSafeInteger(c.endFrame)||c.startFrame<0||c.endFrame<=c.startFrame))throw Error('The assembled Draft clips could not be confirmed.');
 const state={fps:meta.fps,durationFrames:Math.max(...clips.map(c=>c.endFrame)),frameSize:{width:meta.frameSize.width,height:meta.frameSize.height},clips,...sources===null?{sourcesPending:true}:{}};
 JSON.stringify(state,(_key,value)=>{if(typeof value==='number'&&!Number.isFinite(value)||['bigint','function','symbol'].includes(typeof value))throw Error('The assembly returned an invalid nonfinite or unsupported value.');return value;});
 return state;
}

async function readTemplateAssemblyFacts(selects,projectId,draftId,readState,sources=null,observeSource=null){
 if(typeof draftId!=='string'||!draftId)throw Error('The assembly returned no Draft identity.');
 const ids=(await selects.project(projectId).meta()).draftIds;
 if(!Array.isArray(ids)||!ids.includes(draftId))throw Error('The assembled Draft is not in its Project.');
 return {draftId,...await readState(selects.draft(draftId),sources,observeSource)};
}

// The pending working snapshot stays immutable. Its source fields cannot be
// treated as observations; the new, owner-bound guard records actual saved
// sources only after they match the planner's separately named intent.
function templatePendingSourceState(state){
 return {...state,clips:state.clips.map(row=>({...row,source:null})),sourcesPending:true};
}
function templateSourceIntentState(intent,sources,observeSource){
 if(!Array.isArray(intent)||!intent.length||intent.length>1000||!Array.isArray(sources?.clips)||sources.clips.length!==intent.length||typeof observeSource!=='function')throw Error('The planned source guard is incomplete.');
 const ids=new Set(),clips=[];
 const same=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=8*Number.EPSILON*Math.max(1,Math.abs(a),Math.abs(b));
 for(const row of intent){
  const key=JSON.stringify([row?.trackId,row?.clipId]),want=row?.source;
  if(ids.has(key)||!Number.isSafeInteger(row?.clipId)||row.clipId<0||typeof row.trackId!=='string'||!row.trackId||!['main','video','audio'].includes(row.trackKind)||typeof row.resourceId!=='string'||!row.resourceId||!Number.isSafeInteger(row.startFrame)||!Number.isSafeInteger(row.endFrame)||row.startFrame<0||row.endFrame<=row.startFrame||want?.clipId!==row.clipId||!Number.isFinite(want.startSeconds)||want.startSeconds<0||!Number.isFinite(want.endSeconds)||want.endSeconds<=want.startSeconds)throw Error('The planned source intent is invalid.');
  ids.add(key);
  const actual=observeSource(sources,row),observed=sources.clips.find(c=>c.clipId===row.clipId&&c.trackId===row.trackId);
  if(!same(actual.startSeconds,want.startSeconds)||!same(actual.endSeconds,want.endSeconds)||observed.playbackSpeed!==1)throw Error('The saved source differs from the original planned source window.');
  clips.push({...row,source:actual,playbackSpeed:observed.playbackSpeed});
 }
 return clips;
}
// SDK-safe exclusive publication/readback. Existence alone proves nothing;
// every caller compares all canonical bytes with a fresh file observation.
async function templateSourceGuardFile(selects,guard,clips,stateFile,stateJSON,encode,fingerprint){
 if(guard?.version!==1||typeof guard.owner!=='string'||typeof guard.path!=='string')throw Error('The source guard owner is invalid.');
 const text=stateJSON({version:1,owner:guard.owner,clips});
 if(!await selects.files.exists(guard.path)){
  try{return await stateFile(selects,guard.path,text,encode,null,fingerprint);}
  catch(error){if(!await selects.files.exists(guard.path))throw error;}
 }
 const observed=await fingerprint(selects.files,guard.path);
 if(!observed)throw Error('The source guard file could not be observed.');
 return stateFile(selects,guard.path,text,encode,{path:guard.path,...observed},fingerprint);
}
// Only a known historical read-only verifier receives this local adapter. It
// shadows one saved target's missing source reader from an independent saved
// observation; the SDK and private unsaved timing probes remain unchanged.
function templateLegacySavedDraft(selects,draftId,sources,observeSource){
 const reads=new Set(['meta','clips','motionGraphics','motionGraphicProgram','videoEffects','videoEffectProgram','clipTransform','clipAudio']);
 return new Proxy(selects,{get(target,key){
  if(key==='draft')return id=>{
   const draft=target.draft(id);if(id!==draftId)return draft;
   return new Proxy(draft,{has(handle,method){return method==='clipSourceWindow'||Reflect.has(handle,method);},get(handle,method){
    if(method==='clipSourceWindow')return async row=>observeSource(sources,row);
    if(!reads.has(method))throw Error('Historical source verification is read-only.');
    const value=Reflect.get(handle,method,handle);return typeof value==='function'?value.bind(handle):value;
   }});
  };
  const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
 }});
}
function templateObservationScript(source=null,sources=null,draftId=null){
 const helpers=`const templateObservedSource=${templateObservedSource.toString()};const fingerprintTemplateFile=${fingerprintTemplateFile.toString()};`;
 if(source===null&&sources===null&&draftId===null)return helpers;
 if(typeof source!=='string'||!source||!Array.isArray(sources?.clips)||typeof sources.revision!=='string'||!sources.revision||typeof draftId!=='string'||!draftId)throw Error('Historical verification requires an independently observed saved target.');
 return `${helpers}return await(async(selects)=>{${source}\n})((${templateLegacySavedDraft.toString()})(selects,${JSON.stringify(draftId)},${templateStateJSON(sources)},templateObservedSource));`;
}
async function templateStableSavedRead(sdk,projectId,draftId,libraryId,check,read){
 check();const before=await readTemplateDraftSources(sdk,projectId,draftId,libraryId);check();
 const result=await read(before);check();
 const after=await readTemplateDraftSources(sdk,projectId,draftId,libraryId);check();
 if(before.revision!==after.revision)throw templateRunIssue('TEMPLATE_RUN_INVALID','The saved Draft changed during source verification. Inspect it before retrying.');
 return result;
}

// Extend the existing durable run owner for templates whose assembly script
// commits before a separate title/look step. A name never proves ownership.
async function executeTemplateAssembly(sdk,files,scope,config,source,isCurrent,options={}){
 const fail=(code,message)=>{throw templateRunIssue(code,message);};
 if(typeof isCurrent!=='function'||!scope||typeof scope.projectId!=='string'||!scope.projectId||typeof scope.runId!=='string'||!scope.runId||!config||config.projectId!==scope.projectId||typeof source!=='string'||source.split('__CONFIG__').length!==2||!source.startsWith('// @template-assembly 1\n'))fail('TEMPLATE_RUN_INVALID','The assembly request is incomplete.');
 if(typeof globalThis.TextEncoder!=='function'||typeof sdk?.call!=='function')fail('TEMPLATE_RUN_UNSUPPORTED','Update Selects to save and recover template runs safely.');
 if(new TextEncoder().encode(source).length>131072)fail('TEMPLATE_RUN_INVALID','The assembly script exceeds its input limit.');
 scope={pluginId:scope.pluginId,projectId:scope.projectId,runId:scope.runId,libraryId:scope.libraryId};
 const requestLimit=options.requestLimit??49152;
 const frozen=JSON.parse(templateRunJSON(config,requestLimit));
 // A display label can be regenerated on remount; it is never run identity.
 const {draftName:displayName,...contentConfig}=frozen;
 const request={config:contentConfig,source};templateRunJSON(request,requestLimit);
 const check=()=>{if(!isCurrent())fail('TEMPLATE_RUN_DETACHED','The template run ended.');};check();
 const target=await sdk.call('getProjectDraftScaffold',scope.projectId);check();
 if(target?.owner?.projectId!==scope.projectId||typeof target.owner.libraryId!=='string'||!target.owner.libraryId||scope.libraryId!=null&&scope.libraryId!==target.owner.libraryId)fail('TEMPLATE_RUN_TARGET','The assembly belongs to a different Project or library.');
 scope={pluginId:scope.pluginId,libraryId:target.owner.libraryId,projectId:scope.projectId,runId:scope.runId};
 const query=async(script,allowCommit=false,summary='Confirm owned assembly Draft')=>{check();const reply=await sdk.runScript({summary,allowCommit,script});check();if(reply.isError||!reply.result)fail('TEMPLATE_RUN_INVALID','The owned Draft could not be read back. Inspect it before starting another run.');return reply.result;};
 const verify=async receipt=>{
  if(options.receiptOnly)return {sequenceId:receipt.draftId,fps:receipt.fps,totalFrames:receipt.durationFrames,stateFile:receipt.stateFile??null,sourceGuard:receipt.sourceGuard??null,assemblyConfirmed:false};
  check();const target=await sdk.call('getProjectDraftScaffold',scope.projectId);check();
  if(target?.owner?.projectId!==scope.projectId||target.owner.libraryId!==scope.libraryId)fail('TEMPLATE_RUN_TARGET','The assembly belongs to a different Project or library.');
  return templateStableSavedRead(sdk,scope.projectId,receipt.draftId,scope.libraryId,check,async sources=>{
   const observed=await query(`${templateObservationScript()}return await (${readTemplateAssemblyFacts.toString()})(selects,${JSON.stringify(scope.projectId)},${JSON.stringify(receipt.draftId)},${readTemplateAssemblyState.toString()},${templateStateJSON(sources)},templateObservedSource);`);
   const expected={draftId:receipt.draftId,fps:receipt.fps,durationFrames:receipt.durationFrames,frameSize:receipt.frameSize,clips:receipt.clips,...receipt.sourceGuard?{sourcesPending:true}:{}};
   let sourceClips;
   if(receipt.sourceGuard){try{sourceClips=templateSourceIntentState(receipt.sourceGuard.intent,sources,templateObservedSource);}catch(cause){throw Object.assign(templateRunIssue('TEMPLATE_RUN_INVALID','The saved assembly source differs from its original plan.'),{cause});}}
   if(templateRunJSON(receipt.sourceGuard?templatePendingSourceState(observed):observed)!==templateRunJSON(expected))fail('TEMPLATE_RUN_INVALID','The saved Draft has changed since its assembly receipt. Inspect it before starting another run.');
   if(options.captureState&&!receipt.stateFile)fail('TEMPLATE_RUN_INVALID','This assembly has no complete state receipt. Inspect it before finishing.');
   if(receipt.stateFile)await query(`${templateObservationScript()}const actual=await (${readTemplateSavedState.toString()})(selects.draft(${JSON.stringify(receipt.draftId)}),${templateStateJSON(sources)},templateObservedSource);await (${templateStateFile.toString()})(selects,${JSON.stringify(receipt.stateFile.path)},(${templateStateJSON.toString()})(${receipt.sourceGuard?`(${templatePendingSourceState.toString()})(actual)`:'actual'}),${templateRunBase64.toString()},${JSON.stringify(receipt.stateFile)},fingerprintTemplateFile);return {verified:true};`);
   if(receipt.sourceGuard)await query(`${templateObservationScript()}await (${templateSourceGuardFile.toString()})(selects,${templateStateJSON(receipt.sourceGuard)},${templateStateJSON(sourceClips)},${templateStateFile.toString()},${templateStateJSON.toString()},${templateRunBase64.toString()},fingerprintTemplateFile);return {verified:true};`,true,'Publish owned assembly source guard');
   return {sequenceId:receipt.draftId,fps:receipt.fps,totalFrames:receipt.durationFrames,notes:[],assemblyConfirmed:true,...receipt.stateFile?{stateFile:receipt.stateFile}:{},...receipt.sourceGuard?{sourceGuard:receipt.sourceGuard}:{}};
  });
 };
 return executeTemplateRun(sdk,files,scope,request,isCurrent,async(claim,onDispatch)=>{
  const capability=await sdk.runScript({summary:'Check assembly recovery support',allowCommit:false,script:`const p=selects.project(${JSON.stringify(scope.projectId)});const ids=(await p.meta()).draftIds;const d=ids?.length?selects.draft(ids[0]):await p.createDraft({name:'Template recovery support check'});return {supported:typeof d.clipTransform==='function'&&typeof d.clipAudio==='function'};`});
  check();if(capability.isError||capability.result?.supported!==true)fail('TEMPLATE_RUN_UNSUPPORTED','Update Selects to confirm saved assembly state before retrying.');
  const body=source.replace('__CONFIG__',()=>`Object.assign(JSON.parse(${JSON.stringify(templateRunJSON(frozen,requestLimit))}),{__beforeCommit:__templateBeforeCommit})`);
  const script=`return await(async(assemble,readFacts,readState,publish,json,encode,readFull,stateJSON,stateFile,fingerprint)=>{
   let result,preparedState,preparedFull,snapshot,sourceGuard,maySave=false;
   try{
    result=await assemble(async(draft,sourceIntent)=>{
     if(maySave)throw Error('The assembly pre-save hook ran more than once.');
     preparedState=await readState(draft);
     if(!Array.isArray(sourceIntent)||!sourceIntent.length||sourceIntent.length>1000)throw Error('The assembly did not retain its planned source intent.');
     const owner=JSON.parse(${templateRunJSON(claim)}.expectedText).owner;
     sourceGuard={version:1,owner,path:${JSON.stringify(claim.path)}+'.sources-'+owner+'.json',intent:JSON.parse(json(sourceIntent))};
     json({...JSON.parse(${templateRunJSON(claim)}.expectedText),status:'saved',result:{draftId:'x'.repeat(1024),...preparedState,sourceGuard}});
     if(${options.captureState===true}){
      preparedFull=stateJSON(await readFull(draft));
      const path=${JSON.stringify(claim.path)}+'.state-'+JSON.parse(${templateRunJSON(claim)}.expectedText).owner+'.json';
      json({...JSON.parse(${templateRunJSON(claim)}.expectedText),status:'saved',result:{draftId:'x'.repeat(1024),...preparedState,sourceGuard,stateFile:{path,size:preparedFull.length,sha256:'x'.repeat(64)}}});
      snapshot=await stateFile(selects,path,preparedFull,encode,null,fingerprint);
     }
     maySave=true;
    });
    if(!maySave)throw Error('The assembly skipped its pre-save confirmation.');
    const facts=await readFacts(selects,${JSON.stringify(scope.projectId)},result?.sequenceId,readState);
    const {draftId,...savedState}=facts;
    if(json(savedState)!==json(preparedState))throw Error('The saved Draft disagrees with its prepared state.');
    if(facts.fps!==result.fps||facts.durationFrames!==result.totalFrames)throw Error('The assembly result disagrees with its saved Draft.');
    if(snapshot)await stateFile(selects,snapshot.path,stateJSON(await readFull(selects.draft(facts.draftId))),encode,snapshot,fingerprint);
    const receipt=await publish(selects,${templateRunJSON(claim)},{status:'saved',...facts,sourceGuard,...snapshot?{stateFile:snapshot}:{}},json,encode);
    if(receipt.runReceiptSaved!==true)throw Error('The assembly receipt could not be confirmed.');
    return {assembly:result,facts:{...facts,sourceGuard,...snapshot?{stateFile:snapshot}:{}}};
   }catch(error){
    if(typeof result?.sequenceId==='string'&&result.sequenceId)await publish(selects,${templateRunJSON(claim)},{status:'outcomeUnknown',draftId:result.sequenceId},json,encode);
    else if(!maySave)await publish(selects,${templateRunJSON(claim)},{status:'notSaved'},json,encode);
    throw error;
   }
  })(async(__templateBeforeCommit)=>{${body}},${readTemplateAssemblyFacts.toString()},${readTemplateAssemblyState.toString()},${writeTemplateRunResult.toString()},${templateRunJSON.toString()},${templateRunBase64.toString()},${readTemplateSavedState.toString()},${templateStateJSON.toString()},${templateStateFile.toString()},${fingerprintTemplateFile.toString()});`;
  if(new TextEncoder().encode(script).length>256*1024)fail('TEMPLATE_RUN_INVALID','The assembly request exceeds the SDK transport limit.');
  await onDispatch();const reply=await sdk.runScript({summary:'Assemble template with owned receipt',allowCommit:true,script});
  if(reply.isError||!reply.result?.facts||!reply.result?.assembly)throw Object.assign(templateRunIssue('TEMPLATE_RUN_PENDING','The assembly response could not be confirmed. Inspect the Project before starting another run.'),{cause:Error(String(reply.output||'The SDK returned no complete assembly result.'))});
  const confirmed=await verify(reply.result.facts);
  return {...reply.result.assembly,...confirmed,notes:reply.result.assembly.notes??[]};
 },verify,{existingOnly:options.receiptOnly===true,retireUnstarted:options.retireUnstarted===true,requestLimit});
}

// The base assembly record proves which Draft belongs to this workflow. A phase
// receipt supersedes its earlier state for recovery; unknown outcomes never save
// again. Only positively recorded pre-save failures permit a new phase attempt.
async function executeTemplateDecoration(sdk,files,pending,config,source,isCurrent,options={}){
 const fail=(code,message)=>{throw templateRunIssue(code,message);};
 const check=()=>{if(!isCurrent())fail('TEMPLATE_RUN_DETACHED','The template run ended.');};check();
 if(!pending?.scope||!config||config.projectId!==pending.scope.projectId||typeof config.sequenceId!=='string'||!config.sequenceId||typeof source!=='string'||!source.startsWith('// @template-decoration 1\n')||source.split('__CONFIG__').length!==2)fail('TEMPLATE_RUN_INVALID','The title/look request is incomplete.');
 const stateLimit=options.stateLimit??262144;
 if(!Number.isSafeInteger(stateLimit)||stateLimit<262144||stateLimit>524288)fail('TEMPLATE_RUN_INVALID','Invalid continuation state limit.');
 templateStateJSON(pending,stateLimit);
 pending=JSON.parse(JSON.stringify(pending));
 const frozen=JSON.parse(templateStateJSON(config,262144)),recipe=templateStateJSON({config:frozen,source},262144);
 const base=await executeTemplateAssembly(sdk,files,pending.scope,pending.config,pending.source,isCurrent,{receiptOnly:true,requestLimit:options.requestLimit});check();
 if(base.sequenceId!==frozen.sequenceId||!base.stateFile)fail('TEMPLATE_RUN_INVALID','The title/look target has no complete owned assembly receipt.');
 const target=await sdk.call('getProjectDraftScaffold',pending.scope.projectId);check();
 if(target?.owner?.projectId!==pending.scope.projectId||typeof target.owner.libraryId!=='string')fail('TEMPLATE_RUN_TARGET','The title/look target belongs to a different Project.');
 const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),n=>n.toString(16).padStart(2,'0')).join('');
 const rootScope={pluginId:pending.scope.pluginId,libraryId:target.owner.libraryId,projectId:pending.scope.projectId,runId:pending.scope.runId};
 const scope={...rootScope,runId:'look-'+await digest(templateRunJSON(rootScope))},request={phase:'decoration',draftId:base.sequenceId,recipeDigest:await digest(recipe),assemblyState:base.stateFile};
 const query=async(script,summary,allowCommit=false)=>{check();const reply=await sdk.runScript({summary,allowCommit,script});check();if(reply.isError||reply.result?.verified!==true)fail('TEMPLATE_RUN_INVALID','The saved title/look state has changed or could not be read. Inspect the Draft before another run.');return reply.result;};
 const verify=async receipt=>{
  check();if(receipt.draftId!==frozen.sequenceId||!receipt.stateFile)fail('TEMPLATE_RUN_INVALID','The title/look receipt could not be verified.');
  return templateStableSavedRead(sdk,scope.projectId,receipt.draftId,scope.libraryId,check,async sources=>{
   let sourceClips;
   if(receipt.sourceGuard){try{sourceClips=templateSourceIntentState(receipt.sourceGuard.intent,sources,templateObservedSource);}catch(cause){throw Object.assign(templateRunIssue('TEMPLATE_RUN_INVALID','The saved title/look source differs from the original assembly.'),{cause});}}
   await query(`${templateObservationScript()}const p=selects.project(${JSON.stringify(scope.projectId)});if(!(await p.meta()).draftIds.includes(${JSON.stringify(receipt.draftId)}))throw Error('The title/look Draft is not in its Project.');const actual=await (${readTemplateSavedState.toString()})(selects.draft(${JSON.stringify(receipt.draftId)}),${templateStateJSON(sources)},templateObservedSource);await (${templateStateFile.toString()})(selects,${JSON.stringify(receipt.stateFile.path)},(${templateStateJSON.toString()})(${receipt.sourceGuard?`(${templatePendingSourceState.toString()})(actual)`:'actual'}),${templateRunBase64.toString()},${JSON.stringify(receipt.stateFile)},fingerprintTemplateFile);return {verified:true};`,'Confirm owned title and look');
   if(receipt.sourceGuard)await query(`${templateObservationScript()}await (${templateSourceGuardFile.toString()})(selects,${templateStateJSON(receipt.sourceGuard)},${templateStateJSON(sourceClips)},${templateStateFile.toString()},${templateStateJSON.toString()},${templateRunBase64.toString()},fingerprintTemplateFile);return {verified:true};`,'Publish owned title/look source guard',true);
   return {sequenceId:receipt.draftId,fps:base.fps,totalFrames:base.totalFrames,decorationConfirmed:true};
  });
 };
 const work=executeTemplateRun(sdk,files,scope,request,isCurrent,async(claim,onDispatch)=>{
  // Bind the saved base before opening its working copy. This observation is
  // not used as an observation of the later unsaved decoration.
  let sources;try{sources=await templateStableSavedRead(sdk,scope.projectId,base.sequenceId,scope.libraryId,check,async sources=>{
   if(base.sourceGuard)templateSourceIntentState(base.sourceGuard.intent,sources,templateObservedSource);
   await query(`${templateObservationScript()}const actual=await (${readTemplateSavedState.toString()})(selects.draft(${JSON.stringify(base.sequenceId)}),${templateStateJSON(sources)},templateObservedSource);await (${templateStateFile.toString()})(selects,${JSON.stringify(base.stateFile.path)},(${templateStateJSON.toString()})(${base.sourceGuard?`(${templatePendingSourceState.toString()})(actual)`:'actual'}),${templateRunBase64.toString()},${JSON.stringify(base.stateFile)},fingerprintTemplateFile);return {verified:true};`,'Confirm original assembly before title and look');
   return sources;
  });}catch(cause){
   if(cause?.code==='TEMPLATE_RUN_DETACHED')throw cause;
   throw Object.assign(templateRunIssue('TEMPLATE_RUN_NOT_SAVED','The original assembly changed or could not be read before title and look.'),{cause});
  }
  const phaseIntent=base.sourceGuard?.intent??sources.clips.map(row=>({clipId:row.clipId,trackId:row.trackId,trackKind:row.trackKind,resourceId:row.resourceId,startFrame:row.startFrame,endFrame:row.endFrame,source:row.source}));
  const body=source.replace('__CONFIG__',()=>`Object.assign(JSON.parse(${JSON.stringify(templateStateJSON(frozen,262144))}),{__sources:${templateStateJSON(sources)},__beforeCommit:__templateBeforeCommit})`);
  const script=`${templateObservationScript()}return await(async(decorate,readFull,stateJSON,stateFile,publish,json,encode,fingerprint)=>{
   let prepared,snapshot,sourceGuard,maySave=false,preparedOnce=false;
   try{
    const original=selects.draft(${JSON.stringify(frozen.sequenceId)});
    if(!(await selects.project(${JSON.stringify(scope.projectId)}).meta()).draftIds.includes(${JSON.stringify(frozen.sequenceId)}))throw Error('The title/look target is not in its Project.');
    await stateFile(selects,${JSON.stringify(base.stateFile.path)},stateJSON(${base.sourceGuard?'await readFull(original)':`await readFull(original,${templateStateJSON(sources)},templateObservedSource)`}),encode,${JSON.stringify(base.stateFile)},fingerprint);
    const result=await decorate(async(draft,committing)=>{
     if(preparedOnce)throw Error('The title/look pre-save hook ran more than once.');preparedOnce=true;
     prepared=await readFull(draft);const text=stateJSON(prepared),path=${JSON.stringify(claim.path)}+'.state-'+JSON.parse(${templateRunJSON(claim)}.expectedText).owner+'.json';
     snapshot=await stateFile(selects,path,text,encode,null,fingerprint);
     const owner=JSON.parse(${templateRunJSON(claim)}.expectedText).owner;sourceGuard={version:1,owner,path:${JSON.stringify(claim.path)}+'.sources-'+owner+'.json',intent:${templateStateJSON(phaseIntent)}};
     const clips=prepared.clips.filter(c=>c.trackKind==='main'&&c.resourceId).map(({clipId,trackId,resourceId,startFrame,endFrame})=>({clipId,trackId,resourceId,startFrame,endFrame}));
     json({...JSON.parse(${templateRunJSON(claim)}.expectedText),status:'saved',result:{draftId:${JSON.stringify(frozen.sequenceId)},fps:prepared.fps,durationFrames:prepared.durationFrames,frameSize:prepared.frameSize,clips,stateFile:snapshot,sourceGuard}});
     maySave=committing===true;
    });
    if(!preparedOnce)throw Error('The title/look operation skipped its pre-save hook.');
    const observed=await readFull(selects.draft(${JSON.stringify(frozen.sequenceId)}));
    await stateFile(selects,snapshot.path,stateJSON(observed),encode,snapshot,fingerprint);
    const clips=observed.clips.filter(c=>c.trackKind==='main'&&c.resourceId).map(({clipId,trackId,resourceId,startFrame,endFrame})=>({clipId,trackId,resourceId,startFrame,endFrame}));
    const facts={draftId:${JSON.stringify(frozen.sequenceId)},fps:observed.fps,durationFrames:observed.durationFrames,frameSize:observed.frameSize,clips,stateFile:snapshot,sourceGuard};
    const receipt=await publish(selects,${templateRunJSON(claim)},{status:'saved',...facts},json,encode);if(!receipt.runReceiptSaved)throw Error('The title/look receipt could not be confirmed.');return {facts,result};
   }catch(error){await publish(selects,${templateRunJSON(claim)},{status:maySave?'outcomeUnknown':'notSaved',...maySave?{draftId:${JSON.stringify(frozen.sequenceId)}}:{}},json,encode);throw error;}
  })(async(__templateBeforeCommit)=>{${body}},${readTemplateSavedState.toString()},${templateStateJSON.toString()},${templateStateFile.toString()},${writeTemplateRunResult.toString()},${templateRunJSON.toString()},${templateRunBase64.toString()},${fingerprintTemplateFile.toString()});`;
  if(new TextEncoder().encode(script).length>262144)fail('TEMPLATE_RUN_INVALID','The title/look request exceeds the SDK transport limit.');
  await onDispatch();const reply=await sdk.runScript({summary:'Decorate template with owned receipt',allowCommit:true,script});
  if(reply.isError||!reply.result?.facts)throw Object.assign(templateRunIssue('TEMPLATE_RUN_PENDING','The title/look save is awaiting confirmation. Check the same run again.'),{draftId:frozen.sequenceId,cause:Error(String(reply.output||'No complete title/look result.'))});
  return verify(reply.result.facts);
 },verify,options.retireUnstarted?{retireUnstarted:true}:{retryNotSaved:true});
 return work.catch(cause=>{
  check();
  const known=cause?.outcome==='notSaved'||cause?.code==='TEMPLATE_RUN_NOT_SAVED';
  const message=cause?.code==='TEMPLATE_RUN_RETIRED'?cause.publicMessage:known?'The title/look attempt stopped before saving. Retry its original inputs.':cause?.publicMessage||'The title/look save is awaiting confirmation. Check the same run again.';
  throw Object.assign(templateRunIssue(cause?.code||'TEMPLATE_RUN_PENDING',message),{phase:'decoration',draftId:base.sequenceId,cause,...known?{outcome:'notSaved'}:{}});
 });
}

// Discover an uncertain standalone assembly after its renderer realm is gone.
// Payloads are published before their small exclusive manifest. Completed run
// tombstones prevent an old callback from republishing the same run identity.
async function openTemplateAssemblyContinuations(sdk,files,target,isCurrent){
 const fail=(code,message)=>{throw templateRunIssue(code,message);};
 const requestLimit=target?.requestLimit??49152,stateLimit=target?.stateLimit??262144;
 templateRunJSON(null,requestLimit);
 if(!Number.isSafeInteger(stateLimit)||stateLimit<262144||stateLimit>524288)fail('TEMPLATE_RUN_INVALID','Invalid continuation state limit.');
 const invalid=()=>fail('TEMPLATE_RUN_INVALID','The pending assembly record could not be verified. Inspect the Project before starting another run.');
 const check=()=>{if(!isCurrent())fail('TEMPLATE_RUN_DETACHED','The template run ended.');};
 check();
 if(!target||typeof target.pluginId!=='string'||!/^[a-z0-9-]+$/.test(target.pluginId)||typeof target.projectId!=='string'||!target.projectId||target.projectId.length>1024)invalid();
 target={pluginId:target.pluginId,projectId:target.projectId,libraryId:target.libraryId};
 if(!files||!['join','homedir','exists','stat','readRange','writeFile','mkdir','readdir','rm'].every(key=>typeof files[key]==='function')||typeof sdk?.call!=='function'||typeof globalThis.crypto?.subtle?.digest!=='function'||typeof globalThis.TextEncoder!=='function'||typeof globalThis.TextDecoder!=='function')fail('TEMPLATE_RUN_UNSUPPORTED','Update Selects to find pending template runs safely.');
 const owner=await sdk.call('getProjectDraftScaffold',target.projectId);check();
 if(owner?.owner?.projectId!==target.projectId||typeof owner.owner.libraryId!=='string'||!owner.owner.libraryId||target.libraryId!=null&&target.libraryId!==owner.owner.libraryId)fail('TEMPLATE_RUN_TARGET','The pending assembly belongs to a different Project or library.');
 target={pluginId:target.pluginId,projectId:target.projectId,libraryId:owner.owner.libraryId};
 const current=async()=>{check();const row=await sdk.call('getProjectDraftScaffold',target.projectId);check();if(row?.owner?.projectId!==target.projectId||row.owner.libraryId!==target.libraryId)fail('TEMPLATE_RUN_TARGET','The pending assembly belongs to a different Project or library.');};
 const json=value=>{
  let text;
  try{text=JSON.stringify(value,(_key,item)=>{if(typeof item==='number'&&!Number.isFinite(item)||['bigint','function','symbol'].includes(typeof item))throw Error('Unsupported value');return item;}).replace(/[\u007f-\uffff]/g,char=>'\\u'+char.charCodeAt(0).toString(16).padStart(4,'0'));}catch{invalid();}
  if(text.length>stateLimit)fail('TEMPLATE_RUN_INVALID','The pending assembly exceeds its continuation input limit.');
  return text;
 };
 const hash=async text=>{const result=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),n=>n.toString(16).padStart(2,'0')).join('');check();return result;};
 const directory=files.join(files.homedir(),'.selects','plugin-data',target.pluginId,'template-runs','assembly-pending',await hash(json(target)));
 const completed=files.join(directory,'acknowledged');
 const readText=async(path,limit)=>{
  for(let attempt=0;attempt<3;attempt++){
  check();const before=await files.stat(path);check();if(!before)return null;
  if(before.isDirectory===false&&before.size===0)continue;
  if(before.isDirectory!==false||!Number.isSafeInteger(before.size)||before.size<1||before.size>limit)invalid();
  const bytes=await files.readRange(path,0,before.size);check();const after=await files.stat(path);check();
  if(!after)return null;
  if(['size','mtimeMs','ino'].some(key=>before[key]!==after[key]))continue;
  if(Object.prototype.toString.call(bytes)!=='[object Uint8Array]'||bytes.byteLength!==before.size)invalid();
  return new TextDecoder().decode(bytes);
  }
  fail('TEMPLATE_RUN_PENDING','The pending assembly record is changing. Check it again.');
 };
 const parse=text=>{try{return JSON.parse(text);}catch{invalid();}};
 const manifest=async row=>{
  if(!row||Object.keys(row).length!==3||row.version!==1||typeof row.digest!=='string'||!/^[a-f0-9]{64}$/.test(row.digest)||!row.scope||Object.keys(row.scope).length!==4||Object.keys(target).some(key=>row.scope[key]!==target[key])||typeof row.scope.runId!=='string'||!row.scope.runId||row.scope.runId.length>1024)invalid();
  return await hash(json(row.scope));
 };
 const done=async(row,key)=>{
  const text=await readText(files.join(completed,key+'.json'),49152);if(text===null)return false;
  const end=parse(text);if(!end||!['saved','notSaved'].includes(end.status)||json(end.record)!==json(row))invalid();return true;
 };
 const validate=(value,row,kind='assembly')=>{
  if(!value||json(value.scope)!==json(row.scope)||value.config?.projectId!==target.projectId||typeof value.source!=='string'||!value.source.startsWith(kind==='look'?'// @template-decoration 1\n':'// @template-assembly 1\n')||value.source.split('__CONFIG__').length!==2)invalid();
  // Match the existing assembly adapter's request budget before any new save.
  if(kind==='look'){
   if(typeof value.config.sequenceId!=='string'||value.assembly?.sequenceId!==value.config.sequenceId)invalid();
   templateStateJSON({config:value.config,source:value.source},262144);
  }else{const {draftName,...content}=value.config;templateRunJSON({config:content,source:value.source},requestLimit);}
  return value;
 };
 const load=async(row,key,kind='assembly')=>{
  if(await manifest(row)!==key)invalid();
  const name=key+(kind==='look'?'.look':'')+'-'+row.digest+'.data';
  const text=await readText(files.join(directory,name),stateLimit)??await readText(files.join(completed,name),stateLimit);
  if(text===null)invalid();if(await hash(text)!==row.digest)invalid();
  return validate(parse(text),row,kind);
 };
 const recordOf=async(pending,kind='assembly')=>{
  if(!pending?.scope||Object.keys(target).some(key=>key==='libraryId'?pending.scope[key]!=null&&pending.scope[key]!==target[key]:pending.scope[key]!==target[key]))invalid();
  const scope={...target,runId:pending.scope.runId},text=json({...pending,scope}),row={version:1,scope,digest:await hash(text)},key=await manifest(row);
  return {row,key,text,value:validate(parse(text),row,kind)};
 };
 const store=async(pending,kind='assembly',allowCompleted=false)=>{
  pending=JSON.parse(json(pending));
  await current();const item=await recordOf(pending,kind),{row,key,text}=item,name=key+(kind==='look'?'.look':'');
  if(kind==='assembly'&&await done(row,key)){
   if(allowCompleted)return load(row,key);
   fail('TEMPLATE_RUN_COMPLETED','This assembly was already confirmed. Start a new run for another Draft.');
  }
  await files.mkdir(directory,{recursive:true});check();
  const file=files.join(directory,name+'.json'),expected=templateRunJSON(row),prior=await readText(file,49152);
  if(prior!==null&&prior!==expected)invalid();
  const dataPath=files.join(directory,name+'-'+row.digest+'.data');
  if(await files.exists(dataPath)){if(await readText(dataPath,stateLimit)!==text)invalid();}
  else{check();await files.writeFile(dataPath,text);check();}
  try{check();await files.writeFile(file,expected,{flag:'wx'});}catch(error){
   const actual=await readText(file,49152);if(actual===null)throw error;if(actual!==expected)invalid();
  }
  check();if(kind==='assembly'&&await done(row,key)){
   if(allowCompleted)return load(row,key);
   fail('TEMPLATE_RUN_COMPLETED','This assembly was already confirmed. Start a new run for another Draft.');
  }
  try{return await load(row,key,kind);}catch(error){if(kind==='assembly'&&await done(row,key))fail('TEMPLATE_RUN_COMPLETED','This assembly was already confirmed. Start a new run for another Draft.');throw error;}
 };
 const read=async(runId=null,includeCompleted=false)=>{
  if(runId!==null){
   await current();if(typeof runId!=='string'||!runId||runId.length>1024)invalid();
   const key=await hash(json({...target,runId})),text=await readText(files.join(directory,key+'.json'),49152);
   let row=text===null?null:parse(text);
   if(!row&&includeCompleted){const end=await readText(files.join(completed,key+'.json'),49152);if(end!==null){const value=parse(end);if(!['saved','notSaved'].includes(value?.status))invalid();row=value.record;}}
   if(!row)return null;if(await manifest(row)!==key)invalid();
   if(!includeCompleted&&await done(row,key))return null;
   return load(row,key);
  }
  await current();if(!await files.exists(directory)){check();return null;}
  const names=await files.readdir(directory);check();
  if(!Array.isArray(names)||names.length>4096||names.some(name=>typeof name!=='string'||name.includes('/')||name.includes('\\')))invalid();
  const entries=names.filter(name=>/^[a-f0-9]{64}\.json$/.test(name));
  if(entries.length>64)fail('TEMPLATE_RUN_PENDING','Too many pending assemblies need inspection before another run.');
  const found=[];
  for(const name of entries.sort()){
   const text=await readText(files.join(directory,name),49152);if(text===null)continue;
   const row=parse(text),key=await manifest(row);if(name!==key+'.json')invalid();
   if(!await done(row,key)){
    try{found.push(await load(row,key));}catch(error){if(!await done(row,key))throw error;}
   }
  }
  if(found.length>1)fail('TEMPLATE_RUN_AMBIGUOUS','Several unfinished assemblies belong to this Project. Inspect their run records before starting another run.');
  return found[0]??null;
 };
 const lookFor=async pending=>{
  const {row:root,key}=await recordOf(pending);
  const text=await readText(files.join(directory,key+'.look.json'),49152)??await readText(files.join(completed,key+'.look.json'),49152);
  if(text===null)return null;const row=parse(text);if(await manifest(row)!==key||json(row.scope)!==json(root.scope))invalid();return load(row,key,'look');
 };
 const acknowledge=async(pending,status,retain=false)=>{
  await current();const {row,key,text:rootText}=await recordOf(pending);
  await files.mkdir(completed,{recursive:true});check();
  let look=null,lookRow=null;
  if(retain){
   await files.writeFile(files.join(completed,key+'-'+row.digest+'.data'),rootText);check();
   look=await lookFor(pending);
   if(look){lookRow=await recordOf(look,'look');await files.writeFile(files.join(completed,key+'.look-'+lookRow.row.digest+'.data'),lookRow.text);check();await files.writeFile(files.join(completed,key+'.look.json'),templateRunJSON(lookRow.row));check();}
  }
  const path=files.join(completed,key+'.json'),text=templateRunJSON({record:row,status});
  try{await files.writeFile(path,text,{flag:'wx'});}catch(error){if(await readText(path,49152)!==text)throw error;}
  check();
  // Only this immutable run's files are removed. Its tombstone is retained.
  await files.rm(files.join(directory,key+'.json'),{force:true}).catch(()=>{});check();
  await files.rm(files.join(directory,key+'-'+row.digest+'.data'),{force:true}).catch(()=>{});check();
  if(lookRow){await files.rm(files.join(directory,key+'.look.json'),{force:true}).catch(()=>{});check();await files.rm(files.join(directory,key+'.look-'+lookRow.row.digest+'.data'),{force:true}).catch(()=>{});check();}
 };
 const resumeAssembly=async pending=>{
  const value=await store(pending);
  let result;
  try{result=await executeTemplateAssembly(sdk,files,value.scope,value.config,value.source,()=>{check();return true;},{requestLimit});}
  catch(error){if(error?.outcome==='notSaved'||error?.code==='TEMPLATE_RUN_NOT_SAVED')await acknowledge(value,'notSaved');throw error;}
  check();if(result?.assemblyConfirmed!==true)invalid();
  await acknowledge(value,'saved');return result;
 };
 const workflow=async(pending,prepareLook,onAssembly=()=>{},options={})=>{
  if(!options||typeof options!=='object'||options.retireUnstarted!==undefined&&typeof options.retireUnstarted!=='boolean'||options.verifyAssembly!==undefined&&typeof options.verifyAssembly!=='function')invalid();
  options={retireUnstarted:options.retireUnstarted===true,verifyAssembly:options.verifyAssembly};
 const value=await store(pending,'assembly',true);let look=await lookFor(value);
  if(!look){
   let assembly;
   try{assembly=await executeTemplateAssembly(sdk,files,value.scope,value.config,value.source,()=>{check();return true;},{captureState:true,retireUnstarted:options.retireUnstarted===true,requestLimit});}
   catch(error){if(error?.outcome==='notSaved'||error?.code==='TEMPLATE_RUN_NOT_SAVED')await acknowledge(value,'notSaved',true);throw error;}
   check();let prepared;
   try{prepared=await prepareLook(JSON.parse(json(value)),{...assembly});check();}catch(cause){check();throw Object.assign(templateRunIssue('TEMPLATE_LOOK_PREPARATION','The original title/look inputs could not be prepared. Check this run again.'),{phase:'decoration',draftId:assembly.sequenceId,cause});}
   look=await store({...prepared,scope:value.scope,assembly},'look');
  }
  await onAssembly(JSON.parse(json(value)),{...look.assembly});check();
  if(options.verifyAssembly){
   try{await options.verifyAssembly(JSON.parse(json(value)),{...look.assembly},JSON.parse(json(look)));check();}
   catch(cause){
    check();
    if(options.retireUnstarted&&cause?.code==='TEMPLATE_ASSEMBLY_MISMATCH'){
     // Revoke an unstarted/retryable old look as well. A claimed/unknown or
     // already-saved phase cannot be relabeled as a no-save.
     try{await executeTemplateDecoration(sdk,files,value,look.config,look.source,()=>{check();return true;},{retireUnstarted:true,requestLimit,stateLimit});}
     catch(error){throw Object.assign(error,{cause});}
    }
    throw cause;
   }
  }
  const result=await executeTemplateDecoration(sdk,files,value,look.config,look.source,()=>{check();return true;},{requestLimit,stateLimit});check();
  await acknowledge(value,'saved',true);
  return {...look.assembly,...result};
 };
 return {read,store:pending=>store(pending),run:resumeAssembly,workflow};
}
// template-run:end
async function nativeImagePlacement(selects,input,placeImages,sourceFacts,bindPlacement) {
 const {projectId,draftId,plan,items,sources}=input,project=selects.project(projectId),draft=selects.draft(draftId);
 if(!(await project.meta()).draftIds.includes(draftId))throw Error('The Draft is not owned by the selected Project.');
 const result=await placeImages(selects,projectId,draft,plan,sources,items,sourceFacts,bindPlacement);
 await draft.commitAll('Place original editable Images');
 return {...result,status:'committed'};
}
export async function placeNativeImages(prepared,draftId,plan,items,label) {
 const {sdk,projectId,sources}=prepared;
 items=plan.occurrences.map(item=>({...item,source:'ABCD'.indexOf(item.slot)}));
 const input={projectId,draftId,plan,items,sources};
 const result=await nativeImageRun(sdk,`return await (${nativeImagePlacement.toString()})(selects,${JSON.stringify(input)},${placeWorkingCopyImages.toString()},${nativeImageSources.toString()},${bindMediaPlacement.toString()});`,'Place original editable Images',true);
 // A separate script reads persisted state, rather than verifying the same working copy.
 await nativeImageRun(sdk,`const d=selects.draft(${JSON.stringify(draftId)}),clips=await d.clips({trackScope:'all'});for(const expected of ${JSON.stringify(result.placements)}){const actual=clips.find(c=>c.clipId===expected.clipId);if(!actual||actual.trackId!==expected.trackId||actual.startFrame!==expected.startFrame||actual.endFrame!==expected.endFrame)throw Error('Saved Image placement could not be read back.');}if((await d.meta()).durationFrames!==${JSON.stringify(plan.durationFrames)})throw Error('Saved Image Draft duration changed.');return {ok:true};`,'Verify saved Image placement');
 return result;
}
// native-sdk:end

// A template run gets its own component, so it never touches the Panel's state.
function Panel(props){
  hostUseSdk(props.sdk);return props.context?.template?<No14TemplateRun {...props}/>:<No14Panel {...props}/>;}

// A new Draft takes its Project's frame rate and the SDK cannot change it, so the
// plan is made at that rate. Read it from a Draft this run never saves.
export async function readProjectFps(sdk,projectId,draftId=null){
 return readImageDraftFps(sdk,projectId,draftId);
}

export const DEFAULT_DECORATION={shape:'none',color:'#ffffff'},DEFAULT_DRAFT_NAME='No.14 photo format',DEFAULT_MUSIC='on';

// av-host:start
// Local files and media tools use the public async SDK. Paths remain host-native.
let hostSdk = null;
function hostUseSdk(sdk) { hostSdk = panelLocalClient(sdk); }
function hostError(code, message, member = "") { return Object.assign(new Error(message), { code, member }); }
// A host service when it has every named method, else null.
function hostApi(name, ...methods) {
  const s = name === "FileSystem" ? hostSdk?.files : name === "Runtime" ? hostSdk?.media : null;
  return s && methods.every((m) => typeof s[m] === "function") ? s : null;
}
// A host service that must have `method`; throws a 'host-missing' error when this build lacks it.
function hostNeed(name, method) {
  const s = hostApi(name, method);
  if (!s) throw hostError("host-missing", "Update Selects to use this plugin: missing SDK " + name + "." + method, name + "." + method);
  return s;
}
// The host initializes the environment before mounting the panel.
function hostIsWindows() { return /^win/i.test(String(hostSdk?.environment?.platform || "")); }
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
// Cleanup is best effort; all disk operations cross the async SDK bridge.
async function hostRemove(path) {
  try { await hostNeed("FileSystem", "removeFile").removeFile({ filePath: path }); } catch { /* leftover temporary file */ }
}
async function hostRoots(sdk, id, marker) {
  hostUseSdk(sdk);
  const fs = hostNeed("FileSystem", "exists");
  const plugin = fs.join(fs.homedir(), ".selects", "skills", id);
  if (!await fs.exists(fs.join(plugin, marker))) throw hostError("not-found", "the plugin folder could not be found");
  let data = fs.join(fs.homedir(), ".selects", "plugin-data", id);
  try { await fs.mkdir(data, { recursive: true }); } catch { data = null; }
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
// bundled-assets:start
// Installed bytes -> verified owned data file -> one confirmed Project Resource.
// File publication is delegated to the canonical asynchronous atomic client.
function bundledAssetIssue(code,message,cause=undefined){
 return Object.assign(Error(message),{code:'BUNDLED_ASSET_'+code,publicMessage:message,...cause?{cause}:{}});
}
async function readBundledAssetBytes(files,path,limit,current){
 current();if(typeof files?.readRange!=='function')throw bundledAssetIssue('UNSUPPORTED','Update Selects to verify and prepare the bundled asset.');
 const stat=await files.stat(path);current();
 if(!stat||stat.isDirectory!==false||!Number.isSafeInteger(stat.size)||stat.size<1||stat.size>limit)throw bundledAssetIssue('BYTES','The bundled file is missing, unreadable or exceeds its size limit.');
 // Freeze the observation as a read budget. readFile would stat again and could
 // allocate a larger, changed file before this feature gets to reject it.
 const raw=await files.readRange(path,0,stat.size);current();
 const after=await files.stat(path);current();
 if(!ArrayBuffer.isView(raw)||raw.byteLength!==stat.size||!after||after.isDirectory!==false||['size','mtimeMs','ino'].some(key=>stat[key]!==after[key]))throw bundledAssetIssue('CHANGED','The bundled file changed while reading. Start a new run.');
 return Uint8Array.from(new Uint8Array(raw.buffer,raw.byteOffset,raw.byteLength));
}
async function readBundledAssetResource(selects,projectId,path,platform,normalizeUnicode=false,requireComplete=false){
 const project=selects.project(projectId),resources=new Map(),matches=[];
 const rows=await project.resources();
 if(requireComplete&&!Array.isArray(rows))throw Error('The Project Resource catalog is incomplete.');
 for(const resource of rows){
  if(requireComplete&&(!resource||typeof resource.resourceId!=='string'||!resource.resourceId||resources.has(resource.resourceId)))throw Error('The Project Resource catalog is contradictory.');
  resources.set(resource.resourceId,resource);
 }
 const key=value=>{const text=normalizeUnicode?String(value).normalize('NFC'):String(value);return platform==='win32'?text.replace(/\\/g,'/').toLowerCase():text;};
 const visit=items=>{
  if(requireComplete&&!Array.isArray(items))throw Error('The Project file tree is incomplete.');
  for(const n of items||[]){
   if(matches.length>=2)return;
   if(requireComplete&&(!n||typeof n!=='object'))throw Error('The Project file tree is incomplete.');
   if(n.type==='dir')visit(n.children);
   else if(n.path&&key(n.path)===key(path)){
    if(requireComplete&&!resources.has(n.resourceId))throw Error('The selected Project file has no Resource metadata.');
    if(resources.has(n.resourceId)){const r=resources.get(n.resourceId);matches.push({resourceId:r.resourceId,path:n.path,type:r.type,durationSeconds:r.durationSeconds,...r.type==='Image'?{frameSize:n.frameSize}:{}});}
   }
  }
 };
 const tree=await project.sourceFiles();
 if('fileTree' in tree)visit(tree.fileTree);
 else{
  if(requireComplete&&(!Array.isArray(tree.folders)||!tree.folders.length&&tree.fileCount!==0))throw Error('The Project file overview is incomplete.');
  const seen=new Set();
  for(const folder of tree.folders||[]){
   if(matches.length>=2)break;
   if(requireComplete&&(!folder||typeof folder.name!=='string'||!folder.name||seen.has(folder.name)))throw Error('The Project folder overview is contradictory.');
   seen.add(folder.name);const detail=await project.sourceFiles({folder:folder.name});
   if('fileTree' in detail)visit(detail.fileTree);
   else if(requireComplete)throw Error('The Project folder detail is incomplete.');
  }
 }
 return {matches};
}
// Selected Audio adoption owns one import attempt and its Project readback.
// Physical content and run lifetime remain the caller's input/run contracts.
async function ensureProjectAudio(selects,cfg){
 const minimumSeconds=cfg?.minimumSeconds??0,path=cfg?.path;
 const win=typeof path==='string'&&(/^[a-z]:[\\/]/i.test(path)||path.startsWith('\\\\'));
 if(!cfg||typeof cfg.projectId!=='string'||!cfg.projectId||typeof path!=='string'||!path||!win&&!path.startsWith('/')||!Number.isFinite(minimumSeconds)||minimumSeconds<0||cfg.withPath!==undefined&&typeof cfg.withPath!=='boolean')throw bundledAssetIssue('INPUT','The music import requirements are invalid.');
 const p=selects.project(cfg.projectId),result=(row,imported)=>({resourceId:row.resourceId,imported,...cfg.withPath?{path:row.path,durationSeconds:row.durationSeconds}:{}});
 const read=async()=>{
  let result;
  try{result=await readBundledAssetResource(selects,cfg.projectId,path,win?'win32':'darwin',true,true);}
  catch(cause){throw bundledAssetIssue('READ','The selected music in this Project could not be confirmed. Check the Project files.',cause);}
  if(!result||!Array.isArray(result.matches)||result.matches.length>1)throw bundledAssetIssue('READ','The selected music in this Project could not be uniquely confirmed. Check the Project files.');
  const row=result.matches[0];
  if(row&&(typeof row.resourceId!=='string'||!row.resourceId||typeof row.path!=='string'||!row.path||row.type!=='Audio'||!Number.isFinite(row.durationSeconds)||row.durationSeconds<=0||row.durationSeconds<minimumSeconds))throw bundledAssetIssue('METADATA','The selected file could not be confirmed as Audio. Check the Project files.');
  return row;
 };
 const existing=await read();if(existing)return result(existing,false);
 let imported,importFailure;
 try{imported=await p.importFiles({paths:[path]});}catch(cause){importFailure=cause;}
 // The SDK invalidates read snapshots on a dispatched write, including a lost
 // reply. Observe the actual Resource/path after that one attempt; never resend.
 const row=await read(),ids=imported?.addedResourceIds;
 if(row){
  if(Array.isArray(ids)&&ids.length&&(ids.length!==1||ids[0]!==row.resourceId))throw bundledAssetIssue('IMPORT_UNKNOWN','The selected music import could not be confirmed. Inspect the Project before starting again.');
  return result(row,true);
 }
 if(Array.isArray(ids)&&!ids.length)throw bundledAssetIssue('SKIPPED','The music file was not imported.');
 throw bundledAssetIssue('IMPORT_UNKNOWN','The selected music import could not be confirmed. Inspect the Project before starting again.',importFailure);
}
async function prepareBundledAsset(sdk,files,options){
 const {projectId,pluginId,sourcePath,type,extension,encoding='binary',expectedBytes,expectedSha256,frameSize,platform='darwin',normalizeUnicode=false,minimumSeconds=0,label='asset',isCurrent=()=>true}=options??{};
 let importStarted=false;
 const current=()=>{if(!isCurrent())throw bundledAssetIssue('STOPPED',importStarted?'The template run ended after an asset import was requested. Check the Project files.':'The template run ended before importing the bundled asset.');};
 try{
  const pinned=expectedBytes!==undefined||expectedSha256!==undefined;
  if(typeof projectId!=='string'||!projectId||projectId!==projectId.trim()||typeof pluginId!=='string'||pluginId.length>63||!/^[a-z0-9][a-z0-9-]*$/.test(pluginId)||typeof sourcePath!=='string'||!sourcePath||!['Image','Audio'].includes(type)||!(type==='Image'?extension==='png':['mp3','m4a','wav'].includes(extension))||!['binary','base64'].includes(encoding)||!['asset','frame','music'].includes(label)||!Number.isFinite(minimumSeconds)||minimumSeconds<0||type==='Image'&&minimumSeconds!==0||encoding==='base64'&&!pinned||pinned&&(!Number.isSafeInteger(expectedBytes)||expectedBytes<1||expectedBytes>32*1024*1024||typeof expectedSha256!=='string'||!/^[0-9a-f]{64}$/.test(expectedSha256)))throw bundledAssetIssue('INPUT','The bundled asset request is invalid.');
  if(typeof normalizeUnicode!=='boolean'||typeof isCurrent!=='function'||frameSize&&(type!=='Image'||!Number.isSafeInteger(frameSize.width)||frameSize.width<1||!Number.isSafeInteger(frameSize.height)||frameSize.height<1))throw bundledAssetIssue('INPUT','The bundled asset comparison or Image dimensions are invalid.');
  const subtle=globalThis.crypto?.subtle;
  if(!subtle||encoding==='base64'&&typeof globalThis.atob!=='function'||['stat','readRange','writeFile','exists','mkdir','join','homedir'].some(name=>typeof files?.[name]!=='function'))throw bundledAssetIssue('UNSUPPORTED','Update Selects to verify and prepare the bundled asset.');
  const hash=async bytes=>{current();const digest=await subtle.digest('SHA-256',bytes);current();return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');};
  const installed=async()=>{
   // Base64 permits ordinary line wrapping, with bounded whitespace overhead.
   const limit=encoding==='binary'?32*1024*1024:4*Math.ceil(expectedBytes/3)+Math.max(4096,Math.ceil(expectedBytes*.1));
   const bytes=await readBundledAssetBytes(files,sourcePath,limit,current);
   let decoded=bytes;
   if(encoding==='base64'){
    const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/\s/g,'');
    if(text.length!==4*Math.ceil(expectedBytes/3)||!/^[A-Za-z0-9+/]*={0,2}$/.test(text))throw bundledAssetIssue('ENCODING','The encoded bundled asset is invalid.');
    const binary=globalThis.atob(text);current();decoded=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)decoded[i]=binary.charCodeAt(i);
   }
   if(pinned&&decoded.length!==expectedBytes)throw bundledAssetIssue('BYTES','The bundled asset byte count does not match its manifest.');
   const digest=await hash(decoded);
   if(pinned&&digest!==expectedSha256)throw bundledAssetIssue('HASH','The bundled asset does not match its manifest. Check the installed template files before starting again.');
   return {bytes:decoded,digest};
  };
  current();const original=await installed();current();const home=await files.homedir();current();
  const directory=files.join(home,'.selects','plugin-data',pluginId,'assets'),path=files.join(directory,original.digest+'.'+extension);
  current();await files.mkdir(directory,{recursive:true});current();const exists=await files.exists(path);current();const stored=exists?await files.stat(path):null;current();
  const have=stored?.isDirectory===false&&stored.size===original.bytes.length?await readBundledAssetBytes(files,path,32*1024*1024,current):null;
  if(!have||await hash(have)!==original.digest){current();await files.writeFile(path,original.bytes);current();}
  if(await hash(await readBundledAssetBytes(files,path,32*1024*1024,current))!==original.digest)throw bundledAssetIssue('COPY','The bundled asset data copy could not be confirmed.');
  if((await installed()).digest!==original.digest)throw bundledAssetIssue('CHANGED','The installed asset changed during preparation. Start a new run.');
  const read=async()=>{
   current();const reply=await sdk.runScript({summary:'Find bundled '+label+' Resource',allowCommit:false,script:`return await (${readBundledAssetResource.toString()})(selects,${JSON.stringify(projectId)},${JSON.stringify(path)},${JSON.stringify(platform)},${JSON.stringify(normalizeUnicode)});`});current();
   if(reply?.isError||!Array.isArray(reply?.result?.matches)||reply.result.matches.length>1)throw bundledAssetIssue('READ','The bundled asset in this Project could not be uniquely confirmed. Check the Project files.');
   return reply.result.matches[0]??null;
  };
  const ready=row=>{
   if(!row||typeof row.resourceId!=='string'||!row.resourceId||typeof row.path!=='string'||!row.path||row.type!==type)throw bundledAssetIssue('METADATA','The bundled Resource type, path or identity could not be confirmed. Check the Project files.');
   if(type==='Audio'&&(!Number.isFinite(row.durationSeconds)||row.durationSeconds<=0||row.durationSeconds<minimumSeconds))throw bundledAssetIssue('METADATA','The bundled file could not be confirmed as full-length Audio. Check the Project files.');
   const size=row.frameSize;
   if(type==='Image'&&(!Number.isSafeInteger(size?.width)||size.width<1||!Number.isSafeInteger(size?.height)||size.height<1||frameSize&&(size.width!==frameSize.width||size.height!==frameSize.height)))throw bundledAssetIssue('METADATA','The bundled Image dimensions could not be confirmed. Check the Project files.');
   return {resourceId:row.resourceId,path:row.path,...type==='Image'?{width:size.width,height:size.height}:{durationSeconds:row.durationSeconds}};
  };
  const existing=await read();if(existing)return ready(existing);
  current();let imported,importFailure;importStarted=true;
  try{imported=await sdk.runScript({summary:'Import bundled '+label,allowCommit:true,script:`return await selects.project(${JSON.stringify(projectId)}).importFiles({paths:${JSON.stringify([path])}});`});}catch(error){importFailure=error;}
  const ids=imported?.result?.addedResourceIds,row=await read();
  if(row){if(Array.isArray(ids)&&ids.length&&(ids.length!==1||ids[0]!==row.resourceId))throw bundledAssetIssue('IMPORT_UNKNOWN','The added asset could not be confirmed. Check the Project files.');return ready(row);}
  if(!imported?.isError&&Array.isArray(ids)&&!ids.length)throw bundledAssetIssue('SKIPPED','Selects did not add the bundled asset. Check the Project import result before starting again.');
  throw bundledAssetIssue('IMPORT_UNKNOWN','The asset import outcome could not be confirmed. Inspect the Project before starting again.',importFailure);
 }catch(error){if(/^BUNDLED_ASSET_/.test(error?.code||''))throw error;throw bundledAssetIssue('PREPARE','The bundled asset could not be prepared. Check the installed files and Project resources.',error);}
}
// Compatibility API: existing MP3 consumers retain IDs, summaries and codes.
async function readBundledAudioResource(selects,projectId,path,platform){return readBundledAssetResource(selects,projectId,path,platform);}
async function prepareBundledAudio(sdk,files,options){
 try{const result=await prepareBundledAsset(sdk,files,{...options,type:'Audio',extension:'mp3',normalizeUnicode:false,label:'music'});return {resourceId:result.resourceId};}
 catch(error){if(/^BUNDLED_ASSET_/.test(error?.code||''))error.code=error.code.replace('BUNDLED_ASSET_','BUNDLED_AUDIO_');throw error;}
}

// Whole-file hashing is supplied by the host media tool, so large source Videos
// are streamed without allocating their bytes in the browser. Stat is a change
// observation; the content digest, not size/mtime, is the source identity.
async function readAssetFileIdentity(files,path,hashFile,current){
 try{
 current();const before=await files.stat(path);current();
 if(!before||before.isDirectory!==false||!Number.isSafeInteger(before.size)||before.size<1)throw bundledAssetIssue('SOURCE','The media file is missing or unreadable.');
 const sha256=await hashFile(path);current();const after=await files.stat(path);current();
 if(typeof sha256!=='string'||!/^[0-9a-f]{64}$/.test(sha256)||!after||after.isDirectory!==false||['size','mtimeMs','ino'].some(key=>before[key]!==after[key]))throw bundledAssetIssue('CHANGED','The media file changed while its contents were checked. Start a new run.');
 return {sha256,bytes:before.size};
 }catch(error){
  if(error?.terminal||error?.code==='host-missing'||typeof error?.publicMessage==='string'||/^BUNDLED_ASSET_/.test(error?.code??''))throw error;
  throw bundledAssetIssue('SOURCE','The media file could not be read. Check the selected source and file access.',error);
 }
}

// One derived file from a frozen private source copy. Media objects are complete
// and content addressed before an atomic, bounded index points at them. Concurrent
// writers may publish different valid generations; neither mixes media/metadata.
// Reservation ownership is shared by persistent derived media and temporary
// analysis files. A filename or a lost write response never proves ownership.
function reserveAssetFiles(files,current,owner){
 const owned=new Set(),tokens=new Set();
 const reservationUnknown=cause=>Object.assign(bundledAssetIssue('RESERVATION_UNKNOWN','The media file reservation could not be confirmed. Inspect the preparation workspace before starting again.',cause),{terminal:true});
 // Ownership observations are bounded and can run after cancellation so only
 // positively identified reservations enter cleanup. A filename alone is not proof.
 const observe=async path=>{
  try{
   const before=await files.stat(path);
   if(!before||before.isDirectory!==false||!Number.isSafeInteger(before.size)||before.size<0||before.size>1024)return null;
   const bytes=await files.readRange(path,0,before.size),after=await files.stat(path);
   if(!(bytes instanceof Uint8Array)||bytes.length!==before.size||!after||after.isDirectory!==false||['size','mtimeMs','ino'].some(key=>before[key]!==after[key]))return null;
   return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  }catch{return null;}
 };
 const reserve=async(path,role)=>{
  current();const token=crypto.randomUUID();
  if(typeof token!=='string'||!/^[0-9a-f-]{36}$/i.test(token)||token===owner||tokens.has(token))throw bundledAssetIssue('UNSUPPORTED','The media reservation owner could not be created.');
  tokens.add(token);const marker=JSON.stringify({version:1,kind:'derived-reservation',owner,token,role});let creationFailure;
  try{await files.writeFile(path,marker,{flag:'wx'});}catch(error){creationFailure=error;}
  if(await observe(path)!==marker)throw reservationUnknown(creationFailure);
  owned.add(path);current();
  // Consume exactly this marker to retain the established empty-output contract.
  // During an unobserved replacement, cleanup must not race a late rename.
  owned.delete(path);let replaced,clearFailure;
  try{replaced=await files.compareAndReplace(path,marker,'');}catch(error){clearFailure=error;}
  const cleared=await observe(path);
  if(replaced===false){if(cleared===marker)owned.add(path);throw reservationUnknown(clearFailure);}
  if(cleared!=='')throw reservationUnknown(clearFailure);
  owned.add(path);current();
 };
 return {reserve,paths:()=>[...owned],cleanup:async({observeFailure=false}={})=>{
  const failures=[];
  for(const path of owned){
   try{await files.removeFile({filePath:path});}
   catch(cause){
    // A lost deletion reply is observed once, never replayed. Existing derived
    // callers retain best-effort cleanup; transient readers require a verdict.
    if(observeFailure){try{if(await files.stat(path)===null)continue;}catch{}}
    failures.push({path,cause});
   }
  }
  return failures;
 }};
}

// A host job with an unknown exit may still read/write these reservations. Keep
// them for inspection; neither an abort acknowledgement nor a cleanup attempt
// proves that the producer has settled. Preserve diagnostics without mutating
// the thrown object supplied by a different owner.
function retainUnconfirmedAssetFiles(error,reservations){
 return Object.assign(bundledAssetIssue('WORKSPACE_UNKNOWN','The media job exit could not be confirmed. Its temporary workspace is retained for inspection.',error),{
  terminal:true,preserveTemporaryFiles:true,
  ...(typeof (error?.unconfirmedJobId??error?.jobId)==='string'?{unconfirmedJobId:error.unconfirmedJobId??error.jobId}:{}),
  retainedTemporaryFiles:[...new Set([...(Array.isArray(error?.retainedTemporaryFiles)?error.retainedTemporaryFiles:[]),...reservations.paths()])]
 });
}

async function prepareDerivedAsset(files,options){
 const {directory,key,sourcePath,source,extension='mp4',cleanupRequired=false,isCurrent=()=>true,signal,hashFile,produce,verify}=options??{};
 if(typeof isCurrent!=='function')throw bundledAssetIssue('INPUT','The derived media liveness check must be callable.');
 if(signal&&(typeof signal.aborted!=='boolean'||typeof signal.addEventListener!=='function'||typeof signal.removeEventListener!=='function'))throw bundledAssetIssue('INPUT','The derived media cancellation signal is invalid.');
 const current=()=>{if(signal?.aborted||!isCurrent())throw bundledAssetIssue('STOPPED','The template run ended before media preparation completed.');};
 const same=(a,b)=>a?.sha256===b?.sha256&&a?.bytes===b?.bytes;
 const valid=value=>value&&typeof value.sha256==='string'&&/^[0-9a-f]{64}$/.test(value.sha256)&&Number.isSafeInteger(value.bytes)&&value.bytes>0;
 const freshSource=async()=>{if(!same(await readAssetFileIdentity(files,sourcePath,hashFile,current),source))throw bundledAssetIssue('CHANGED','The source media changed during preparation. Start a new run.');};
 current();
 if(typeof directory!=='string'||!directory||typeof sourcePath!=='string'||!sourcePath||!valid(source)||typeof key!=='string'||!/^[0-9a-f]{64}$/.test(key)||!['mp4','m4a','wav','mp3','png','f32','json'].includes(extension)||typeof cleanupRequired!=='boolean'||[isCurrent,hashFile,produce,verify].some(fn=>typeof fn!=='function'))throw bundledAssetIssue('INPUT','The derived media request is invalid.');
 if(['join','stat','readFile','readRange','exists','mkdir','writeFile','compareAndReplace','copyFile','rename','removeFile'].some(name=>typeof files?.[name]!=='function'))throw bundledAssetIssue('UNSUPPORTED','Update Selects to prepare media files safely.');
 const indexDirectory=files.join(directory,'index'),objectDirectory=files.join(directory,'objects',key),indexPath=files.join(indexDirectory,key+'.json');
 const cached=async()=>{
  current();let candidate;
  try{
   if(!await files.exists(indexPath)){current();return null;}
   // A different live writer may atomically replace a complete index between
   // our stat/read/stat observations. Reobserve only this read; never replay
   // publication or treat an unconfirmed, changing index as a cache miss.
   let bytes;
   for(let attempt=0;attempt<3;attempt++){
    current();
    try{bytes=await readBundledAssetBytes(files,indexPath,49152,current);break;}
    catch(error){
     current();if(error?.code!=='BUNDLED_ASSET_CHANGED')throw error;
     if(attempt===2)throw Object.assign(bundledAssetIssue('PUBLISH','The prepared media index could not be confirmed. Inspect the cache before starting again.',error),{terminal:true});
    }
   }
   const row=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
   if(row?.version!==1||row.key!==key||!same(row.source,source)||!valid(row.output))return null;
   const path=files.join(objectDirectory,row.output.sha256+'.'+extension);
   if(!same(await readAssetFileIdentity(files,path,hashFile,current),row.output))return null;
   await verify(path);current();candidate={path,output:row.output,reused:true};
  }catch(error){current();if(error?.terminal||error?.code==='host-missing')throw error;return null;}
  await freshSource();return candidate;
 };
 const previous=await cached();current();if(previous)return previous;
 if(typeof globalThis.crypto?.randomUUID!=='function')throw bundledAssetIssue('UNSUPPORTED','Update Selects to prepare media files safely.');
 const owner=crypto.randomUUID();
 if(typeof owner!=='string'||!/^[0-9a-f-]{36}$/i.test(owner))throw bundledAssetIssue('UNSUPPORTED','The media preparation owner could not be created.');
 current();await files.mkdir(directory,{recursive:true});current();
 const snapshot=files.join(directory,'.source-'+owner),temporary=files.join(directory,'.output-'+owner+'.'+extension+'.tmp');
 let result,preparationFailure;const reservations=reserveAssetFiles(files,current,owner);

 try{
  // Reserve each private path exclusively before copying/encoding over it.
  await reservations.reserve(snapshot,'source');await reservations.reserve(temporary,'output');
  await files.copyFile(sourcePath,snapshot);current();
  if(!same(await readAssetFileIdentity(files,snapshot,hashFile,current),source))throw bundledAssetIssue('CHANGED','The source media changed while its working copy was prepared. Start a new run.');
  await produce(snapshot,temporary);current();await freshSource();
  await verify(temporary);current();const output=await readAssetFileIdentity(files,temporary,hashFile,current);
  current();await files.mkdir(objectDirectory,{recursive:true});current();
  const path=files.join(objectDirectory,output.sha256+'.'+extension);
  let have=false;
  try{have=same(await readAssetFileIdentity(files,path,hashFile,current),output);}catch{current();}
  if(!have){
   // A lost rename reply is observed, never retried or implemented as delete+move.
   try{current();await files.rename(temporary,path);}catch{}
   current();let confirmed=false;
   try{confirmed=same(await readAssetFileIdentity(files,path,hashFile,current),output);}catch(error){current();if(error?.terminal||error?.code==='host-missing')throw error;}
   if(!confirmed)throw bundledAssetIssue('PUBLISH','The prepared media publication could not be confirmed. Inspect the cache before starting again.');
  }
  await freshSource();current();await files.mkdir(indexDirectory,{recursive:true});current();
  const text=JSON.stringify({version:1,key,source,output});
  try{await files.writeFile(indexPath,text);}catch{/* Observe an acknowledged or concurrent complete index below. */}
  current();const confirmed=await cached();
  if(!confirmed)throw bundledAssetIssue('PUBLISH','The prepared media index could not be confirmed. Inspect the cache before starting again.');
  result={...confirmed,reused:false};
 }catch(error){
  preparationFailure=error;
  if(error?.terminal||error?.code==='host-missing'||typeof error?.publicMessage==='string'||/^BUNDLED_ASSET_/.test(error?.code??''))throw error;
  throw bundledAssetIssue('DERIVED','Prepared media could not be completed. Check the source, available storage and media tools.',error);
 }finally{
  // Only this invocation's reserved staging paths are disposable. Published
  // objects/indexes may already be referenced by a different run or old Draft.
  if(preparationFailure?.preserveTemporaryFiles)throw retainUnconfirmedAssetFiles(preparationFailure,reservations);
  const cleanupFailures=await reservations.cleanup({observeFailure:cleanupRequired});
  if(cleanupRequired&&cleanupFailures.length)throw Object.assign(bundledAssetIssue('CLEANUP','Analysis workspace cleanup could not be confirmed. Inspect the preparation workspace before starting again.',preparationFailure),{terminal:true,cleanupFailures});
 }
 // Cleanup is asynchronous too: a detached owner must not receive a late success.
 current();return result;
}

// A derived beat grid is reusable only for these exact source bytes, algorithm
// and sampling policy. File publication/cleanup remains in prepareDerivedAsset;
// decoding and Worker execution are supplied by the existing runtime owners.
function validateAudioBeatGrid(value,maxSeconds){
 const number=(v,max=Number.MAX_VALUE)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max;
 const vector=(v,max)=>Array.isArray(v)&&v.length<=max&&v.every(x=>number(x));
 if(!value||typeof value!=='object'||!number(value.durationSeconds,maxSeconds)||value.durationSeconds<=0||!number(value.bpm,600)||value.bpm<=0||
  !number(value.firstBeat,value.durationSeconds)||!number(value.lastOnsetSeconds,value.durationSeconds+.1)||!number(value.hitRate,1)||
  !(value.residualMedianMs===null||number(value.residualMedianMs))||!(value.sixteenthRatio===null||number(value.sixteenthRatio))||
  !['accepted','approximate','none'].includes(value.grid)||value.accepted!==(value.grid==='accepted')||
  !vector(value.peaks,400)||!vector(value.beatEnergy,2400)||!Array.isArray(value.onsets)||value.onsets.length>40000||
  value.onsets.some(row=>!Array.isArray(row)||row.length!==3||!number(row[0],value.durationSeconds+.1)||!['l','m','h'].includes(row[1])||!number(row[2]))||
  !['l','m','h'].every(key=>number(value.onsetThresholds?.[key])))throw bundledAssetIssue('ANALYSIS_RESULT','The music analysis result could not be confirmed. Select the music again.');
 return Object.fromEntries(['durationSeconds','bpm','firstBeat','lastOnsetSeconds','hitRate','residualMedianMs','sixteenthRatio','grid','accepted','peaks','beatEnergy','onsets','onsetThresholds'].map(key=>[key,value[key]]));
}
async function prepareAudioBeatAnalysis(client,options){
 const {path,directory,worker,rate,maxSeconds,namespace,signal,isCurrent=()=>true,hashFile,decode,analyze,probe}=options??{};
 if(typeof path!=='string'||!path||typeof directory!=='string'||!directory||typeof worker!=='string'||!worker||
  new TextEncoder().encode(worker).length>1024*1024||typeof namespace!=='string'||!namespace||
  !Number.isSafeInteger(rate)||rate<1||rate>192000||!Number.isFinite(maxSeconds)||maxSeconds<=0||maxSeconds>240||
  [isCurrent,hashFile,decode,analyze,probe].some(fn=>typeof fn!=='function')||!signal||typeof signal.aborted!=='boolean')throw bundledAssetIssue('INPUT','The music analysis inputs are incomplete.');
 const deadline=Date.now()+240000,files=client?.files;
 const current=()=>{if(signal.aborted||!isCurrent())throw bundledAssetIssue('STOPPED','Music analysis ended before completion.');if(Date.now()>=deadline)throw bundledAssetIssue('TIMEOUT','Music analysis timed out. Select the music again.');};
 const hash=async file=>{current();const digest=await hashFile(file);current();return digest;};
 current();const source=await readAssetFileIdentity(files,path,hash,current);
 const keyBytes=new TextEncoder().encode(JSON.stringify([namespace,source,worker,rate,maxSeconds]));
 const key=[...new Uint8Array(await crypto.subtle.digest('SHA-256',keyBytes))].map(v=>v.toString(16).padStart(2,'0')).join('');current();
 let grid,fallback,fallbackFailure;
 const verify=async file=>{const bytes=await readBundledAssetBytes(files,file,4*1024*1024,current);grid=validateAudioBeatGrid(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)),maxSeconds);current();};
 try{
  await prepareDerivedAsset(files,{directory:files.join(directory,'own-music'),key,sourcePath:path,source,extension:'json',cleanupRequired:true,signal,isCurrent:()=>{current();return true;},hashFile:hash,verify,
   produce:async(snapshot,target)=>{
    let samples=null;
    try{
     samples=await decode(snapshot,current);current();
     grid=validateAudioBeatGrid(await analyze(worker,samples,current),maxSeconds);current();
     if(Math.abs(grid.durationSeconds-samples.length/rate)>.001)throw bundledAssetIssue('ANALYSIS_RESULT','The music analysis duration does not match its samples.');
    }catch(error){
     current();if(error?.terminal||error?.preserveTemporaryFiles||error?.code==='host-missing')throw error;
     const duration=samples?.length?samples.length/rate:await probe(snapshot);current();
     if(!Number.isFinite(duration)||duration<=0)throw error;
     fallback={accepted:false,grid:'none',failed:true,durationSeconds:Math.min(duration,maxSeconds),peaks:[]};
     fallbackFailure=bundledAssetIssue('ANALYSIS_FALLBACK','Music analysis is unavailable; use fixed timing.',error);throw fallbackFailure;
    }
    current();await files.writeFile(target,JSON.stringify(grid));current();
   }});
 }catch(error){current();if(error!==fallbackFailure)throw error;grid=fallback;}
 const after=await readAssetFileIdentity(files,path,hash,current);current();
 if(after.bytes!==source.bytes||after.sha256!==source.sha256)throw bundledAssetIssue('CHANGED','The source media changed during preparation. Start a new run.');
 return {...grid,sourceObservation:{path,size:source.bytes,sha256:source.sha256}};
}

// An ephemeral output belongs to one invocation and one captured file/media
// client. Producer policy stays with the caller; the owner never publishes a
// cache or imports a Project Resource. Cleanup waits for producer settlement.
async function readTransientAsset(client,options){
 const {directory,extension,maxBytes,produce,signal,timeoutMs=120000,deadline:requestedDeadline,isCurrent=()=>true}=options??{};
 const files=client?.files,media=client?.media;
 if(typeof directory!=='string'||!directory||!['f32','mp3','gray'].includes(extension)||!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>32*1024*1024||typeof produce!=='function'||typeof isCurrent!=='function'||!Number.isFinite(timeoutMs)||timeoutMs<1||timeoutMs>2147483647||requestedDeadline!==undefined&&!Number.isFinite(requestedDeadline)||signal&&(typeof signal.aborted!=='boolean'||typeof signal.addEventListener!=='function'||typeof signal.removeEventListener!=='function'))throw bundledAssetIssue('INPUT','The temporary media request is invalid.');
 const deadline=Math.min(Date.now()+timeoutMs,requestedDeadline??Infinity);
 const live=()=>{try{return !signal?.aborted&&isCurrent();}catch{return false;}};
 const current=()=>{if(!live())throw bundledAssetIssue('STOPPED','Media preparation ended before completion.');if(Date.now()>=deadline)throw bundledAssetIssue('TIMEOUT','Media preparation timed out.');};
 current();
 if(['join','stat','readRange','writeFile','compareAndReplace','removeFile','mkdir'].some(name=>typeof files?.[name]!=='function')||typeof globalThis.crypto?.randomUUID!=='function')throw bundledAssetIssue('UNSUPPORTED','Update Selects to prepare temporary media safely.');
 const owner=crypto.randomUUID();if(typeof owner!=='string'||!/^[0-9a-f-]{36}$/i.test(owner))throw bundledAssetIssue('UNSUPPORTED','The media preparation owner could not be created.');
 const path=files.join(directory,'.media-'+owner+'.'+extension),reservations=reserveAssetFiles(files,current,owner);let bytes,failure,cleanupFailures;
 try{
  await files.mkdir(directory,{recursive:true});current();await reservations.reserve(path,'output');
  await produce({path,files,media,current,deadline});current();
  bytes=await readBundledAssetBytes(files,path,maxBytes,current);current();
 }catch(error){
  failure=error?.terminal||/^BUNDLED_ASSET_/.test(error?.code??'')?error:bundledAssetIssue('PREPARE','Media could not be prepared. Check the source file and media tools.',error);
 }finally{
  if(failure?.preserveTemporaryFiles){failure=retainUnconfirmedAssetFiles(failure,reservations);cleanupFailures=[];}
  else cleanupFailures=await reservations.cleanup({observeFailure:true});
 }
 if(failure){
  if(cleanupFailures.length){
   // Keep the primary failure/cause, but do not allow a decoder fallback to
   // conceal an unconfirmed workspace cleanup. Copy, never mutate thrown data.
   failure=Object.assign(bundledAssetIssue(/^BUNDLED_ASSET_/.test(failure.code??'')?failure.code.slice('BUNDLED_ASSET_'.length):'PREPARE',failure.publicMessage??failure.message,/^BUNDLED_ASSET_/.test(failure.code??'')?failure.cause:failure),{terminal:true,cleanupFailures});
  }
  throw failure;
 }
 if(cleanupFailures.length)throw Object.assign(bundledAssetIssue('CLEANUP','Temporary media cleanup could not be confirmed. Inspect the preparation workspace before starting again.',cleanupFailures),{terminal:true});
 current();return bytes;
}

// A bounded mono PCM recipe. Rate/time are caller policy. Returned samples are
// independent little-endian values; malformed or non-finite output is rejected.
async function decodeAssetPcm(client,options){
 const {path,directory,rate,maxSeconds,signal,timeoutMs=120000,isCurrent=()=>true}=options??{};
 if(typeof path!=='string'||!path||!Number.isSafeInteger(rate)||rate<1||!Number.isFinite(maxSeconds)||maxSeconds<=0||typeof client?.media?.runFFmpeg!=='function')throw bundledAssetIssue('INPUT','The audio sample request is invalid.');
 const maxBytes=Math.ceil(rate*maxSeconds)*4;
 if(!Number.isSafeInteger(maxBytes)||maxBytes<4||maxBytes>32*1024*1024)throw bundledAssetIssue('INPUT','The requested audio sample budget is invalid.');
 const deadline=Date.now()+timeoutMs;
 const bytes=await readTransientAsset(client,{directory,extension:'f32',maxBytes,signal,timeoutMs,deadline,isCurrent,
  produce:({path:target,media,deadline})=>runAssetMediaTool(media,'runFFmpeg',['-nostdin','-v','error','-y','-t',String(maxSeconds),'-i',path,'-vn','-ac','1','-ar',String(rate),'-f','f32le',target],{isCurrent,signal,timeoutMs,deadline})});
 if(bytes.length%4!==0)throw bundledAssetIssue('PCM','The decoded audio sample length is invalid.');
 const samples=new Float32Array(bytes.length/4),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 for(let i=0;i<samples.length;i++){samples[i]=view.getFloat32(i*4,true);if(!Number.isFinite(samples[i]))throw bundledAssetIssue('PCM','The decoded audio contains an invalid sample.');}
 if(signal?.aborted||!isCurrent())throw bundledAssetIssue('STOPPED','Audio preparation ended before completion.');
 if(Date.now()>=deadline)throw bundledAssetIssue('TIMEOUT','Audio preparation timed out.');
 return samples;
}

// A media process belongs to one captured client and one live invocation. Abort
// requests stop useful work; await host settlement before callers clean staging
// files. A late successful response never turns an ended invocation into success.
async function runAssetMediaTool(media,kind,args,options={}){
 if(!options||typeof options!=='object'||Array.isArray(options))throw bundledAssetIssue('INPUT','The media process options are invalid.');
 const {isCurrent=()=>true,signal,timeoutMs=120000,deadline}=options;
 if(!['runFFmpeg','runFFprobe'].includes(kind)||!Array.isArray(args)||args.some(arg=>typeof arg!=='string')||typeof isCurrent!=='function'||!Number.isFinite(timeoutMs)||timeoutMs<1||timeoutMs>2147483647||deadline!==undefined&&!Number.isFinite(deadline)||signal&&(typeof signal.aborted!=='boolean'||typeof signal.addEventListener!=='function'||typeof signal.removeEventListener!=='function'))throw bundledAssetIssue('INPUT','The media process request or scope is invalid.');
 if(typeof media?.[kind]!=='function'||typeof AbortController!=='function')throw bundledAssetIssue('UNSUPPORTED','Update Selects to run and cancel media preparation safely.');
 const controller=new AbortController();let stopped=false,timedOut=false,watch,timer;
 const stop=()=>{stopped=true;controller.abort();};
 const live=()=>{try{return isCurrent()&&!signal?.aborted;}catch{return false;}};
 const check=()=>{if(!live())stop();else watch=setTimeout(check,50);};
 const expiresAt=Math.min(Date.now()+timeoutMs,deadline===undefined?Infinity:deadline),remaining=expiresAt-Date.now();
 signal?.addEventListener('abort',stop,{once:true});check();
 if(remaining<=0){timedOut=true;controller.abort();}
 else timer=setTimeout(()=>{timedOut=true;controller.abort();},remaining);
 try{
  if(stopped||timedOut)throw Error('The media process was not dispatched.');
  const result=await media[kind](args,true,controller.signal);
  if(!live())stop();
  if(Date.now()>=expiresAt){timedOut=true;controller.abort();}
  if(stopped||timedOut||controller.signal.aborted)throw Error('The media process ended after its scope.');
  return result;
 }catch(cause){
  if(cause?.preserveTemporaryFiles)throw retainUnconfirmedAssetFiles(cause,{paths:()=>[]});
  if(!live())stop();
  if(Date.now()>=expiresAt){timedOut=true;controller.abort();}
  if(stopped)throw Object.assign(bundledAssetIssue('STOPPED','The template run ended before media preparation completed.',cause),{terminal:true});
  if(timedOut)throw Object.assign(bundledAssetIssue('TIMEOUT','Media preparation timed out.',cause),{terminal:true});
  if(cause?.terminal||cause?.code==='host-missing')throw cause;
  throw bundledAssetIssue('MEDIA','Media preparation could not be completed. Check the source file and media tools.',cause);
 }finally{clearTimeout(timer);clearTimeout(watch);signal?.removeEventListener('abort',stop);}
}

// A host local URL names the original without transferring it into a renderer
// Blob. Older POSIX hosts leave literal #/? in that path; encode those delimiters
// and independently confirm the host's reverse mapping before a browser uses it.
async function readAssetPlaybackURL(client,path,current){
 const files=client?.files,platform=client?.environment?.platform;
 if(typeof path!=='string'||!path||path.includes('\0')||typeof current!=='function')throw bundledAssetIssue('INPUT','The media preview source is invalid.');
 if(['stat','pathToLocalURL','localURLToPath'].some(key=>typeof files?.[key]!=='function'))throw bundledAssetIssue('UNSUPPORTED','Update Selects to preview local media.');
 const key=value=>{const normalized=typeof files.normalize==='function'?files.normalize(value):value;return platform==='win32'?normalized.replace(/\\/g,'/').toLowerCase():normalized;};
 current();const before=await files.stat(path);current();
 if(!before||before.isDirectory!==false||!Number.isSafeInteger(before.size)||before.size<1)throw bundledAssetIssue('SOURCE','The media preview source is unavailable.');
 const raw=await files.pathToLocalURL(path);current();
 if(typeof raw!=='string'||!raw.startsWith('local://'))throw bundledAssetIssue('SOURCE','The local media preview URL could not be confirmed.');
 // Electron's standard custom-scheme parser otherwise makes the first POSIX
 // directory a lower-cased host. A dot authority preserves path case, and the
 // existing host reverse mapping normalizes that dot out independently below.
 const addressed=platform!=='win32'&&raw.startsWith('local:///')?'local://.'+raw.slice('local://'.length):raw;
 const url=addressed.replace(/[?#]/g,char=>encodeURIComponent(char)),observed=await files.localURLToPath(url);current();
 const after=await files.stat(path);current();
 if(typeof observed!=='string'||key(observed)!==key(path)||!after||after.isDirectory!==false||['size','mtimeMs','ino'].some(key=>before[key]!==after[key]))throw bundledAssetIssue('CHANGED','The media preview source changed while preparing playback.');
 return url;
}

// One browser media request, its readiness/seek/play waits and its subscriptions.
// The caller supplies source admission and section/fade policy. No originals,
// native producers, installed assets or local URLs are removed by this owner.
async function playAssetAudioPreview(options){
 const {prepare,startSeconds,durationSeconds,fadeSeconds=0,timeoutMs=60000,signal,isCurrent=()=>true,onPlaying=()=>{},createMedia=()=>new Audio()}=options??{};
 if(typeof prepare!=='function'||typeof createMedia!=='function'||typeof isCurrent!=='function'||typeof onPlaying!=='function'||
  !Number.isFinite(startSeconds)||startSeconds<0||!Number.isFinite(durationSeconds)||durationSeconds<=0||!Number.isFinite(startSeconds+durationSeconds)||
  !Number.isFinite(fadeSeconds)||fadeSeconds<0||!Number.isFinite(timeoutMs)||timeoutMs<1||timeoutMs>2147483647||
  !signal||typeof signal.aborted!=='boolean'||typeof signal.addEventListener!=='function'||typeof signal.removeEventListener!=='function')throw bundledAssetIssue('INPUT','The media preview request is invalid.');
 const expires=Date.now()+timeoutMs,end=startSeconds+durationSeconds;
 const volumeAt=at=>fadeSeconds>0?Math.max(0,Math.min(1,(end-at)/fadeSeconds)):1;
 let media,closed=false,playing=false,timer,watch,lastAt=startSeconds,lastProgress=Date.now(),playStarted=0;
 const pending=new Set(),subscriptions=[];
 const live=()=>{try{return !signal.aborted&&isCurrent();}catch{return false;}};
 const current=()=>{if(closed||!live())throw bundledAssetIssue('STOPPED','The media preview ended.');if(!playing&&Date.now()>=expires)throw bundledAssetIssue('TIMEOUT','The media preview timed out.');};
 return new Promise((resolve,reject)=>{
  const close=(failure=null)=>{
   if(closed)return;closed=true;const cleanup=[];
   for(const id of [timer,watch])try{clearTimeout(id);}catch(error){cleanup.push(error);}
   try{signal.removeEventListener('abort',abort);}catch(error){cleanup.push(error);}
   for(const finish of [...pending])try{finish(failure||bundledAssetIssue('STOPPED','The media preview ended.'));}catch(error){cleanup.push(error);}
   for(const [name,fn] of subscriptions)try{media.removeEventListener(name,fn);}catch(error){cleanup.push(error);}
   if(media)for(const release of [()=>media.pause(),()=>media.removeAttribute('src'),()=>media.load()])try{release();}catch(error){cleanup.push(error);}
   if(cleanup.length){failure=Object.assign(bundledAssetIssue('CLEANUP','Media preview cleanup could not be confirmed. Close and reopen the panel before previewing again.',failure||cleanup[0]),{terminal:true,cleanupFailures:cleanup,ownedMedia:media});}
   failure?reject(failure):resolve(undefined);
  };
  const abort=()=>close(bundledAssetIssue('STOPPED','The media preview ended.'));
  const listen=(name,fn)=>{media.addEventListener(name,fn);subscriptions.push([name,fn]);};
  const waitFor=(name,action,ready)=>new Promise((ok,fail)=>{
   let done=false;
   const finish=error=>{if(done)return;done=true;pending.delete(finish);try{media.removeEventListener(name,heard);}catch(cause){error=Object.assign(bundledAssetIssue('CLEANUP','Media preview cleanup could not be confirmed.',error||cause),{terminal:true});}error?fail(error):ok(undefined);};
   const heard=()=>{try{current();if(ready())finish();}catch(error){finish(error);}};
   pending.add(finish);listen(name,heard);
   try{current();action();heard();}catch(error){finish(error);}
  });
  const tick=()=>{
   try{
    current();
    if(playing){
     const at=media.currentTime,now=Date.now();
     if(!Number.isFinite(at)||at<startSeconds-.05)throw bundledAssetIssue('PLAYBACK','The media preview position is invalid.');
     if(at>=end){close();return;}
     if(at>lastAt+.001){lastAt=at;lastProgress=now;}
     if(now-lastProgress>=timeoutMs||now-playStarted>=durationSeconds*1000+timeoutMs)throw bundledAssetIssue('TIMEOUT','The media preview stopped making progress.');
     media.volume=volumeAt(at);
    }
    watch=setTimeout(tick,40);
   }catch(error){close(error);}
  };
  signal.addEventListener('abort',abort,{once:true});
  timer=setTimeout(()=>close(bundledAssetIssue('TIMEOUT','The media preview timed out.')),Math.max(0,expires-Date.now()));
  tick();
  const run=async()=>{
   current();const source=await prepare(current);current();
   if(!source||typeof source.url!=='string'||!source.url||source.verify!==undefined&&typeof source.verify!=='function')throw bundledAssetIssue('SOURCE','The media preview source could not be confirmed.');
   media=createMedia();current();
   if(!media||['addEventListener','removeEventListener','play','pause','removeAttribute','load'].some(key=>typeof media[key]!=='function'))throw bundledAssetIssue('UNSUPPORTED','This browser cannot preview the media.');
   listen('error',()=>close(bundledAssetIssue('PLAYBACK','The selected media could not be played.')));
   listen('ended',()=>playing&&media.currentTime>=end-.05?close():close(bundledAssetIssue('PLAYBACK','The media preview ended before the selected section.')));
   media.preload='metadata';
   await waitFor('loadedmetadata',()=>{media.src=source.url;media.load();},()=>media.readyState>=1);
   current();if(!Number.isFinite(media.duration)||media.duration<=0||end>media.duration+.05)throw bundledAssetIssue('SOURCE','The selected preview section is outside the media duration.');
   if(Math.abs(media.currentTime-startSeconds)>.001)await waitFor('seeked',()=>{media.currentTime=startSeconds;},()=>!media.seeking&&Math.abs(media.currentTime-startSeconds)<=.05);
   current();if(source.verify)await source.verify(current);current();
   media.volume=volumeAt(media.currentTime);await media.play();if(closed){media.pause();return;}current();
   playing=true;clearTimeout(timer);lastAt=media.currentTime;lastProgress=playStarted=Date.now();onPlaying(media);current();
  };
  run().catch(error=>{if(!closed)close(/^BUNDLED_ASSET_/.test(error?.code||'')?error:bundledAssetIssue('PLAYBACK','The selected media could not be played.',error));});
 });
}
// bundled-assets:end
// The create steps, shared by the Panel and a template run. `stillCurrent` says the
// run still belongs to its Project; await `onSeed` before dispatch, then await
// `onDraft` after the complete save, even if its observer detached. Verify saved state.
export async function createNo14Draft(sdk,{projectId,selected,decoration,framing,music=DEFAULT_MUSIC,name,partialDraftId=null,libraryId=null,stillCurrent,say,onSeed=()=>{},onDraft=_id=>{},runReceipt=null,onDispatch=()=>{}}){
 const fresh=await readMediaPages(sdk, {script:"const scope=JSON.parse('{}');"+INVENTORY.replace('PROJECT_ID',JSON.stringify(projectId)),summary:'Confirm selected Image sources',allowCommit:false});
 if(fresh.isError||!Array.isArray(fresh.result)||selected.some(p=>fresh.result.filter(r=>r.resourceId===p.resourceId&&r.path===p.path).length!==1))throw Error('The selected photos changed. Reload the Project photos.');
 const prepared=await prepareNativeImages(sdk,projectId,selected,libraryId);
 if(!stillCurrent())throw Error('The Project changed. Start again in the selected Project.');
 const fps=await readProjectFps(sdk,projectId,partialDraftId);
 // Music on (the default) is Semin's reference edit; Music off keeps the single reference phrase.
 const plan=music==='on'?seminScenePlan(fps):nativeScenePlan(fps);
 if(plan.fps!==fps||!Number.isSafeInteger(plan.durationFrames)||plan.durationFrames<1||(fps===30&&music!=='on'&&plan.durationFrames!==266)||plan.occurrences?.length!==8)throw Error('The reference plan is incomplete.');
 let musicResource=null;
 if(music==='on'){
  say('Checking bundled music…');
  hostUseSdk(sdk);if(!hostApi('FileSystem','join','homedir','exists'))throw Error('This Selects build cannot read the plugin files. Update Selects, then try again.');
  const roots=await hostRoots(sdk,'no14-still-video',hostJoin('assets','music.mp3')).catch(()=>null);
  if(!roots)throw Error('The installed music asset could not be located. Reinstall the plugin.');
  const musicPath=hostJoin(roots.plugin,'assets','music.mp3');
  if(!stillCurrent())throw Error('The template run ended before importing music.');
  const client=panelLocalClient(sdk);
  musicResource=await prepareBundledAudio(sdk,client.files,{projectId,pluginId:'no14-still-video',sourcePath:musicPath,platform:client.environment?.platform,minimumSeconds:plan.musicStartSeconds+plan.durationFrames/plan.fps,isCurrent:stillCurrent});
 }
 if(!stillCurrent())throw Error('The Project changed. Start again in the selected Project.');
 say('Creating an editable Image Draft…');
 const config={projectId,name,partialDraftId,runReceipt,plan,sources:prepared.sources,items:plan.occurrences.map(item=>({...item,source:'ABCD'.indexOf(item.slot)})),main:musicResource?{resourceId:musicResource.resourceId,startSeconds:plan.musicStartSeconds}:null,
  finishRequest:{mode:'native-finish',projectId,draftId:partialDraftId,decoration,framing,music:musicResource,fps:plan.fps}};
 const finishSource=`async function(selects,config,draft,native,inspectGraphics,inspectTransforms,inspectAudio,programs){const photos=config.sources.map(({resourceId,path,width,height})=>({resourceId,path,width,height}));const input=(${normalizeNativeFinishForPlan.toString()})({...config.finishRequest,photos,placements:native.placements.map(({key,slot,appearance,clipId,trackId,startFrame,endFrame})=>({key,slot,appearance,clipId,trackId,startFrame,endFrame}))},config.plan,true);const EFFECT_CODE=${JSON.stringify(effectCodeFor(plan.fps))};const DECORATION_CODE=${JSON.stringify(DECORATION_CODE)};return await (${authorNativeFinishSource})(selects,input,config.plan,draft,inspectGraphics,inspectTransforms,inspectAudio,programs);}`;
 if(!partialDraftId)await onSeed();
 if(!stillCurrent())throw Error('The template run ended before the Draft was saved.');
 const script=buildAtomicImageDraftScript(config,finishSource);
 await onDispatch();
 const reply=await sdk.runScript({summary:'Create complete No.14 Image Draft',allowCommit:true,timeoutSeconds:120,script});
 if(reply.isError||!reply.result)throw Object.assign(Error(reply.output||'Could not confirm the saved Draft. Inspect the Project before retrying.'),{seedOutput:reply.output});
 const result=reply.result;
 if(result.status!=='saved'||!result.draftId)throw Object.assign(Error(result.message||'Could not confirm the saved Draft. Inspect the Project before retrying.'),{outcome:result.status,draftId:result.draftId});
 await onDraft(result.draftId);
 return verifyAtomicImageDraft(sdk,projectId,result);
}

function No14Panel({sdk,context,ui}){
  useAppUpdateGuard(sdk, context?.language, () => !!(busy || running.current));
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
   const r=await readMediaPages(sdk, {script:"const scope=JSON.parse('{}');"+INVENTORY.replace('PROJECT_ID',JSON.stringify(projectId)),summary:'List project photos',allowCommit:false});
   if(r.isError||!Array.isArray(r.result))throw Error(r.output||'Could not read project photos.');
   if(currentProject.current!==projectId)return;
   const rows=r.result;
   setPhotos(rows);setLoadedProject(projectId);
   // Fill empty slots in Project order; the user can change any slot.
   setSlots(old=>old.map((x,i)=>x||rows[i]?.resourceId||''));
   setStatus(rows.length>=4?'Check the order of photos A–D.':rows.length?'This Project has '+rows.length+' photos. The format needs 4; import more or choose a photo twice on purpose.':'This Project has no photos. Import photos first.');
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
  <ui.Select label="Music" value={music} onChange={setMusic} options={[{value:'on',label:'Graceful Resolution'},{value:'off',label:'Off'}]} disabled={busy}/>
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
 if(error?.outcome==='notSaved')return 'No Draft was created. The operation stopped before saving the Draft.';
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
// Image rows, so join by media.path, the same working file sourceFiles() returns
// and prepareNativeImages checks. For HEIC this is the converted JPEG, not originalPath.
// sdk-selected-media:start
// Match host Resource ids to run_script's project-scoped ids through the SDK.
// Return only the selected files so large Projects stay below the script result limit.
async function sdkSelectedMedia(sdk, projectId, picks) {
  const before = await sdk.call('listProjectResources', projectId);
  if (!Array.isArray(before)) throw Error('Could not read the Project resources.');
  const indices = picks.map(pick => before.findIndex(row => row.resourceId === pick.resourceId));
  if (indices.includes(-1)) throw Error('A picked file is missing from this Project.');
  const response = await sdk.runScript({
    summary: 'Read selected Project files', allowCommit: false,
    script: `const p=selects.project(${JSON.stringify(projectId)});
const resources=await p.resources(),indices=${JSON.stringify(indices)};
const selected=indices.map(i=>resources[i]),ids=new Set(selected.filter(Boolean).map(r=>r.resourceId));
const files=[];
const walk=nodes=>{for(const n of nodes||[])if(n.type==='dir')walk(n.children);else if(ids.has(n.resourceId))files.push(n);};
const top=await p.sourceFiles();
if(Array.isArray(top))walk(top);else if('fileTree' in top)walk(top.fileTree);
else for(const folder of top.folders||[]){const detail=await p.sourceFiles({folder:folder.name});if('fileTree' in detail)walk(detail.fileTree);}
return {count:resources.length,rows:selected.map(r=>r?{name:r.name,type:r.type,files:files.filter(f=>f.resourceId===r.resourceId).map(f=>({resourceId:f.resourceId,path:f.path}))}:null)};`
  });
  if (response.isError || !response.result || !Array.isArray(response.result.rows))
    throw Error(response.output || 'Could not read the selected Project files.');
  const result = response.result, after = await sdk.call('listProjectResources', projectId);
  if (!Array.isArray(after) || before.length !== result.count || after.length !== before.length ||
      after.some((row, i) => row.resourceId !== before[i].resourceId || row.name !== before[i].name || row.type !== before[i].type) ||
      result.rows.length !== picks.length || indices.some((index, i) =>
        result.rows[i]?.name !== before[index].name || result.rows[i]?.type !== before[index].type))
    throw Error('The selected Project files changed. Refresh your media and try again.');
  return result.rows.map((row, i) => {
    const expected = { image: 'Image', video: 'Video', audio: 'Audio' }[picks[i].kind];
    if (expected && row.type !== expected) throw Error('A picked file has the wrong media type.');
    if (row.files.length !== 1 || !row.files[0].path)
      throw Error((picks[i].name || 'A picked file') + ' is missing from this Project or matches more than one file.');
    return { ...row.files[0], resourceType: row.type };
  });
}
// sdk-selected-media:end

async function templateSelection(sdk,app,projectId,libraryId,inputs){
 const picks=Array.isArray(inputs?.photos)?inputs.photos:[];
 if(picks.length!==4||picks.some(x=>x?.kind!=='image'||!x.resourceId))throw templateIssue('Pick exactly four photos, then try again.');
 const pickedFiles=await sdkSelectedMedia(sdk,projectId,picks);
 const paths=pickedFiles.map(row=>row.path);
 const rows=await inventory(sdk,projectId,'List project photos',{paths});
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
 if(/^Could not read the Project frame rate/.test(said))return 'Four Photo Reveal could not read this project\'s frame rate; try again.';
 if(/frame rate cannot hold/.test(said))return 'Four Photo Reveal cannot fit its timing to this project\'s frame rate.';
 if(/^The selected photos changed/.test(said))return 'The picked photos changed while the Draft was being made; try again.';
 return TEMPLATE_FAILED;
}
// This hidden frame reports only for its pinned live run. Durable ownership
// survives a new panel realm; unknown authoring is inspected, never replayed.
function No14TemplateRun({sdk,context}){
  useAppUpdateGuard(sdk, context?.language, () => !!(true));
 const runId=context.template?.runId,[status,setStatus]=React.useState('Making your Draft…');
 const started=React.useRef(null),alive=React.useRef(true),latest=React.useRef(context);latest.current=context;
 React.useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 React.useEffect(()=>{
  if(!runId||started.current===runId)return;started.current=runId;
  const projectId=context.projectId,template=context.template;
  const live=()=>alive.current&&latest.current.template?.runId===runId&&latest.current.projectId===projectId&&latest.current.template?.libraryId===template?.libraryId;
  let ended=false;
  const finish=result=>{if(ended)return;ended=true;if(!live())return;try{sdk.finishTemplate(result);}catch{}};
  const say=text=>{if(live())setStatus(text);};
  let seeding=false,draftId=null;
  (async()=>{
   try{
    if(!projectId)throw templateIssue('Open a Project, then try again.');
    const app=window.parent,libraryId=templateLibrary(template);
    say('Finding your photos…');
    const done=await executeTemplateRun(sdk,panelLocalClient(sdk).files,{pluginId:'no14-still-video',libraryId,projectId,runId},{photos:template?.inputs?.photos?.map(({resourceId,kind})=>({resourceId,kind})),music:DEFAULT_MUSIC,decoration:DEFAULT_DECORATION,framing:{}},live,async(runReceipt,onDispatch)=>{
    const selected=await templateSelection(sdk,app,projectId,libraryId,template?.inputs);
    if(!live())throw Error('The template run ended before the Draft was made.');
    const result=await createNo14Draft(sdk,{projectId,selected,runReceipt,onDispatch,decoration:{...DEFAULT_DECORATION},framing:{},music:DEFAULT_MUSIC,name:DEFAULT_DRAFT_NAME,libraryId,stillCurrent:live,say,
     onSeed:()=>{if(!live())throw Error('The template run ended before the Draft was made.');seeding=true;},onDraft:id=>{draftId=id;}});return result;
    },result=>verifyAtomicImageDraft(sdk,projectId,result));
    draftId=done.draftId;
    if(!draftId||!Array.isArray(done.clips)||done.clips.length!==8)throw Error('The saved Draft did not report its photo clips.');
    say('Done.');
    finish({sequenceId:done.draftId});
   }catch(error){
    if(!draftId&&error?.draftId)draftId=error.draftId;
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


async function inventory(sdk,projectId,summary,scope={}) {
 const r=await readMediaPages(sdk,{script:`const scope=JSON.parse(${JSON.stringify(JSON.stringify(scope))});`+INVENTORY.replace('PROJECT_ID',JSON.stringify(projectId)),summary});
 return r.result;
}

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

// local-sdk:start
/** Pure host-platform path operations; no filesystem or renderer globals. */
function panelLocalPaths(platform: string) {
  const windows = platform === "win32";
  const slash = (path: string) => {
    if (typeof path !== "string")
      throw new TypeError("A path must be a string.");
    return windows ? path.replace(/\\/g, "/") : path;
  };
  const rootOf = (path: string) => {
    if (windows) {
      const unc = path.match(/^\/\/[^/]+\/[^/]+\/?/);
      if (unc) return unc[0].replace(/\/?$/, "/");
      const drive = path.match(/^[a-z]:\/?/i);
      if (drive) return drive[0];
    }
    return path.startsWith("/") ? "/" : "";
  };
  const native = (value: string) =>
    windows ? value.replace(/\//g, "\\") : value;
  const normalize = (value: string) => {
    const path = slash(value),
      root = rootOf(path),
      absolute = root.endsWith("/");
    const segments: string[] = [];
    for (const segment of path
      .slice(Math.min(root.length, path.length))
      .split("/")) {
      if (!segment || segment === ".") continue;
      if (segment === ".." && segments.length && segments.at(-1) !== "..")
        segments.pop();
      else if (segment !== ".." || !absolute) segments.push(segment);
    }
    let result = root + segments.join("/");
    if (!result || (windows && /^[a-z]:$/i.test(result))) result += ".";
    if (path.endsWith("/") && !result.endsWith("/")) result += "/";
    return native(result);
  };
  const basename = (value: string, extension?: string) => {
    const path = slash(value).replace(/\/+$/, "");
    const withoutDrive = windows ? path.replace(/^[a-z]:/i, "") : path;
    const name = withoutDrive.slice(withoutDrive.lastIndexOf("/") + 1);
    return extension && name.endsWith(extension)
      ? name.slice(0, -extension.length)
      : name;
  };
  return {
    normalize,
    join: (...paths: string[]) => {
      const parts = paths.map(slash).filter(Boolean);
      let joined = parts.join("/");
      if (windows && !/^\/\/[^/]/.test(parts[0] || ""))
        joined = joined.replace(/^\/{2,}/, "/");
      return normalize(joined);
    },
    dirname(value: string) {
      const path = slash(value),
        root = rootOf(path);
      const end = path.replace(/\/+$/, "").lastIndexOf("/");
      if (end < root.length) return value.slice(0, root.length) || ".";
      return value.slice(0, end);
    },
    basename,
    extname(value: string) {
      const name = basename(value),
        dot = name.lastIndexOf(".");
      return dot <= 0 || name === ".." ? "" : name.slice(dot);
    },
    isAbsolute: (value: string) => rootOf(slash(value)).endsWith("/"),
  };
}


/** Plugin-private composition of canonical SDK methods, not a public SDK surface. */
async function createPanelLocalClient(sdk: any) {
  const SCRIPT_BYTES = 256 * 1024;
  const runSource = async (script: string, write = false) => {
    if (new TextEncoder().encode(script).byteLength > SCRIPT_BYTES) throw new Error("The local file script exceeds the 256 KiB limit.");
    const response = await sdk.runScript({
      summary: "Use local media workspace",
      allowCommit: write,
      script,
    });
    if (response.isError) throw new Error(response.output || "Local SDK operation failed.");
    // A clipped report has no result. Every read returning data rejects that case below.
    return response.result;
  };
  // Direct arguments keep object literals contextually typed by the SDK signature.
  const run = (method: string, args: unknown[], write = false) =>
    runSource("return await selects." + method + "(" + JSON.stringify(args).slice(1, -1) + ");", write);
  const environment = await run("files.environment", []);
  if (!environment || typeof environment.platform !== "string" || !environment.homedir)
    throw new Error("Update Selects to use this plugin's local media workspace.");
  const paths = panelLocalPaths(environment.platform);
  const CHUNK_BYTES = 48 * 1024;
  // Three encoded chunks occupy 192 KiB, below the Panel's default 256 KiB result
  // budget. The same script still awaits each canonical file operation in order.
  const fileBatch = async (method: "readRange" | "writeChunk", inputs: unknown[], lengths: number[]) => {
    let count = Math.min(3, inputs.length), script = "";
    while (count > 0) {
      script = "const rows=[];" + inputs.slice(0, count).map((input, index) => {
        const call = "{const result=await selects.files." + method + "(" + JSON.stringify(input) + ");";
        if (method === "writeChunk")
          return call + "if(result?.bytesWritten!==" + lengths[index] + ")throw Error('The file write returned an incomplete result. Check the file before retrying.');rows.push(result);}";
        return call + "if(!result||typeof result.base64!=='string'||!Number.isSafeInteger(result.bytesRead)||result.bytesRead<0||result.bytesRead>" + lengths[index] + ")throw Error('The file read returned an incomplete result.');rows.push(result);if(result.bytesRead<" + lengths[index] + ")return rows;}";
      }).join("") + "return rows;";
      if (new TextEncoder().encode(script).byteLength <= SCRIPT_BYTES) break;
      count--;
    }
    if (!count) throw new Error("The local file script exceeds the 256 KiB limit.");
    return { count, rows: await runSource(script, method === "writeChunk") };
  };
  const readRange = async (path: string, offset: number, length: number) => {
    const parts: Uint8Array[] = [];
    let total = 0;
    while (total < length) {
      const inputs = Array.from({ length: Math.min(3, Math.ceil((length - total) / CHUNK_BYTES)) }, (_, index) =>
        ({ path, offset: offset + total + index * CHUNK_BYTES, length: Math.min(CHUNK_BYTES, length - total - index * CHUNK_BYTES) }));
      const lengths = inputs.map(input => input.length);
      const { rows, count } = await fileBatch("readRange", inputs, lengths);
      if (!Array.isArray(rows) || rows.length < 1 || rows.length > count) throw new Error("The file read returned an incomplete result.");
      let short = false;
      for (let index = 0; index < rows.length; index++) {
        const result = rows[index];
        if (!result || typeof result.base64 !== "string" || !Number.isSafeInteger(result.bytesRead) || result.bytesRead < 0 || result.bytesRead > lengths[index]) throw new Error("The file read returned an incomplete result.");
        const bytes = Uint8Array.from(atob(result.base64), (character) => character.charCodeAt(0));
        if (bytes.length !== result.bytesRead) throw new Error("The file read returned invalid bytes.");
        short = bytes.length < lengths[index];
        if (short && index !== rows.length - 1) throw new Error("The file read returned invalid bytes.");
        parts.push(bytes); total += bytes.length;
      }
      if (rows.length !== count && !short) throw new Error("The file read returned an incomplete result.");
      if (short) break;
    }
    const output = new Uint8Array(total);
    let position = 0;
    for (const bytes of parts) { output.set(bytes, position); position += bytes.length; }
    return output;
  };
  const files = {
    ...paths,
    homedir: () => environment.homedir,
    getOrCreateTmpDirPath: async () => environment.tempDirectory,
    exists: (path: string) => run("files.exists", [path]),
    stat: (path: string) => run("files.stat", [path]),
    // One script owns every read and its deadline; only the compact digest returns.
    fingerprint: (path: string) => runSource("return await (" + fingerprintTemplateFile.toString() + ")(selects.files," + JSON.stringify(path) + ");"),
    readdir: (path: string) => run("files.readdir", [path]),
    // SDK-shaped requests support the same shared observation in SDK scripts and
    // the panel. Positional reads retain their existing byte/partial-EOF contract.
    readRange: (path: string | {path: string; offset: number; length: number}, offset?: number, length?: number) =>
      typeof path === "string" ? readRange(path, offset!, length!) : run("files.readRange", [path]),
    async readFile(path: string, encoding?: string) {
      const stat = await run("files.stat", [path]);
      if (!stat || !Number.isSafeInteger(stat.size) || stat.size < 0) throw new Error("The file is unavailable.");
      const bytes = await readRange(path, 0, stat.size);
      if (bytes.length !== stat.size) throw new Error("The file changed while it was being read.");
      if (encoding !== undefined && encoding !== "utf8") throw new Error("Only utf8 text encoding is supported.");
      return encoding === "utf8" ? new TextDecoder().decode(bytes) : bytes;
    },
    async writeFile(path: string, data: string | Uint8Array, options?: string | { encoding?: string; flag?: "w" | "a" | "wx" }) {
      const encoding = typeof options === "string" ? options : options?.encoding;
      const flag = typeof options === "object" ? options.flag : undefined;
      if (flag !== undefined && !["w", "a", "wx"].includes(flag)) throw new Error("Unsupported file write flag.");
      if (encoding !== undefined && encoding !== "utf8") throw new Error("Only utf8 text encoding is supported.");
      const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
      if ((flag === "a" || flag === "wx") && bytes.length > CHUNK_BYTES) throw new Error("Atomic append and exclusive creation are limited to 48 KiB.");
      // Each complete replacement has its own sibling file. Other panels cannot
      // overwrite one of its chunks before the final atomic rename publishes it.
      const replacement = flag !== "a" && flag !== "wx";
      const destination = replacement ? path + ".tmp-" + crypto.randomUUID() : path;
      let published = false;
      try {
        let offset = 0;
        do {
          const inputs = [], lengths = [];
          for (let index = 0; index < (replacement ? 3 : 1) && (offset + index * CHUNK_BYTES < bytes.length || index === 0); index++) {
            const position = offset + index * CHUNK_BYTES, chunk = bytes.subarray(position, position + CHUNK_BYTES);
            let binary = "";
            for (const byte of chunk) binary += String.fromCharCode(byte);
            const mode = position === 0 ? (flag === "a" ? "append" : "exclusive") : undefined;
            inputs.push({ path: destination, offset: position, base64: btoa(binary), ...(mode ? { mode } : {}) });
            lengths.push(chunk.length);
          }
          if (!replacement) {
            const result = await run("files.writeChunk", [inputs[0]], true);
            if (result?.bytesWritten !== lengths[0]) throw new Error("The file write returned an incomplete result. Check the file before retrying.");
          } else {
            const { rows, count } = await fileBatch("writeChunk", inputs, lengths);
            if (!Array.isArray(rows) || rows.length !== count || rows.some((row, index) => row?.bytesWritten !== lengths[index])) throw new Error("The file write returned an incomplete result. Check the file before retrying.");
            lengths.length = count;
          }
          offset += lengths.reduce((sum, size) => sum + size, 0);
        } while (offset < bytes.length);
        if (replacement) await run("files.rename", [destination, path], true);
        published = true;
      } finally {
        if (replacement && !published) await run("files.remove", [destination, { recursive: false, force: true }], true).catch(() => {});
      }
    },
    async compareAndReplace(path: string, expectedText: string | null, text: string) {
      const encode = (value: string) => {
        const bytes = new TextEncoder().encode(value);
        if (bytes.length > CHUNK_BYTES) throw new Error("Atomic file values are limited to 48 KiB.");
        let binary = "";
        for (const byte of bytes) binary += String.fromCharCode(byte);
        return btoa(binary);
      };
      const result = await run("files.compareAndReplace", [{path, expectedBase64: expectedText === null ? null : encode(expectedText), base64: encode(text)}], true);
      if (typeof result?.replaced !== "boolean") throw new Error("The atomic file update returned an incomplete result. Read the file before retrying.");
      return result.replaced;
    },
    mkdir: (path: string, options?: { recursive?: boolean }) => run("files.mkdir", [path, options ?? {}], true),
    rm: (path: string, options?: { recursive?: boolean; force?: boolean }) => run("files.remove", [path, { recursive: options?.recursive ?? false, force: options?.force ?? false }], true),
    removeFile: ({ filePath }: { filePath: string }) => run("files.remove", [filePath, { recursive: false, force: true }], true),
    rename: (from: string, to: string) => run("files.rename", [from, to], true),
    copyFile: (from: string, to: string) => run("files.copy", [from, to], true),
    downloadFile: (url: string, path: string) => run("files.download", [url, path], true),
    pathToLocalURL: (path: string) => run("files.localUrl", [path]),
    localURLToPath: (url: string) => run("files.pathFromLocalUrl", [url]),
  };
  const activeJobs = new Map<string, () => Promise<void>>();
  let disposed = false;
  const SETTLEMENT_MS = 5000, OUTPUT_BYTES = 4 * 1024 * 1024;
  const mediaIssue = (code: string, message: string, cause?: unknown, uncertain = false) =>
    Object.assign(new Error(message), { code: "LOCAL_MEDIA_" + code, publicMessage: message, terminal: true, cause,
      ...(uncertain ? { preserveTemporaryFiles: true } : {}) });
  const cancel = async (jobId: string) => {
    const response = await sdk.runScript({ summary: "Cancel local media processing", allowCommit: true, script: "await selects.media.job(" + JSON.stringify(jobId) + ").cancel();" });
    if (response.isError) throw new Error(response.output || "Media cancellation failed.");
  };
  const observeMedia = (read: () => Promise<any>, deadline: number): Promise<any> => new Promise((resolve, reject) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) { reject(mediaIssue("STATUS", "The media job response could not be confirmed.")); return; }
    const timer = setTimeout(() => reject(mediaIssue("STATUS", "The media job response could not be confirmed.")), remaining);
    Promise.resolve().then(read).then(
      value => { clearTimeout(timer); resolve(value); },
      cause => { clearTimeout(timer); reject(mediaIssue("STATUS", "The media job response could not be confirmed.", cause)); });
  });
  const validJob = (value: any) => typeof value?.jobId === "string" && !!value.jobId && value.jobId.length <= 1024;
  const process = async (executable: "FFmpeg" | "FFprobe", args: string[], _withoutLog?: boolean, signal?: AbortSignal, onStdout?: (text: string) => void, onStderr?: (text: string) => void) => {
    if (!Array.isArray(args) || args.some(arg => typeof arg !== "string" || arg.includes("\0")) ||
      signal && (typeof signal.aborted !== "boolean" || typeof signal.addEventListener !== "function" || typeof signal.removeEventListener !== "function") ||
      onStdout !== undefined && typeof onStdout !== "function" || onStderr !== undefined && typeof onStderr !== "function")
      throw mediaIssue("INPUT", "The local media arguments or subscriptions are invalid.");
    if (disposed || signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const startSource = "return await selects.media.start" + executable + "(" + JSON.stringify({ args }) + ");";
    if (new TextEncoder().encode(startSource).byteLength > SCRIPT_BYTES) throw mediaIssue("INPUT", "The local media request exceeds its script byte budget.");
    let started: any;
    const starting = runSource(startSource, true);
    try { started = await observeMedia(() => starting, Date.now() + SETTLEMENT_MS); }
    catch (cause) {
      // A late start identity can only stop that original job. Never start again
      // or authorize cleanup from this background cancellation acknowledgement.
      void starting.then(value => validJob(value) ? cancel(value.jobId) : undefined, () => {}).catch(() => {});
      throw mediaIssue("START_UNKNOWN", "The media job start could not be confirmed. Its temporary workspace is retained for inspection.", cause, true);
    }
    if (!validJob(started))
      throw mediaIssue("START_UNKNOWN", "The media job identity could not be confirmed. Its temporary workspace is retained for inspection.", undefined, true);
    const jobId = started.jobId;
    let cancellation: Promise<void> | null = null, cancellationDeadline: number | null = null, settled = false;
    const requestCancel = () => {
      if (!cancellation) {
        cancellationDeadline = Date.now() + SETTLEMENT_MS;
        cancellation = cancel(jobId);
        void cancellation.catch(() => {});
      }
      return cancellation;
    };
    const abort = () => { void requestCancel(); };
    activeJobs.set(jobId, requestCancel);
    signal?.addEventListener("abort", abort, { once: true });
    if (disposed || signal?.aborted) abort();
    let cursor = 0, outputBytes = 0, stdout = "", stderr = "";
    const knownState = (status: any) => ["running", "succeeded", "failed", "cancelled"].includes(status?.state);
    // Read-only observations may time out; a late reply cannot authorize cleanup.
    const statusAt = (deadline: number) => observeMedia(() => sdk.call("getLocalMediaJobStatus", jobId, { cursor }), deadline);
    const settleAfterFailure = async (cause: unknown) => {
      requestCancel();
      const deadline = cancellationDeadline!;
      while (Date.now() < deadline) {
        try {
          const status = await statusAt(deadline);
          if (knownState(status) && status.state !== "running") { settled = true; return; }
        } catch { /* Only independent status reads may recover an unknown reply. */ }
        if (Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, Math.min(50, deadline - Date.now())));
      }
      throw Object.assign(mediaIssue("SETTLEMENT_UNKNOWN", "The media job exit could not be confirmed. Its temporary workspace is retained for inspection.", cause, true), { jobId });
    };
    try {
      while (true) {
        if (cancellationDeadline !== null && Date.now() >= cancellationDeadline)
          throw mediaIssue("STATUS", "The cancelled media job status could not be confirmed.");
        const status = await statusAt(cancellationDeadline ?? Date.now() + SETTLEMENT_MS);
        if (!knownState(status)) throw mediaIssue("STATUS", "The media job returned an unknown status.");
        settled = status.state !== "running";
        if (!Array.isArray(status.events) || status.events.length > 8 || typeof status.truncated !== "boolean" || !Number.isSafeInteger(status.nextCursor) || status.nextCursor < cursor)
          throw mediaIssue("STATUS", "The media job returned an incomplete status.");
        if (status.truncated) throw mediaIssue("OUTPUT", "Media output was truncated; no incomplete result was accepted.");
        let position = cursor;
        for (const event of status.events) {
          if (!event || !["stdout", "stderr"].includes(event.stream) || typeof event.text !== "string" || event.text.length > 4096 || !Number.isSafeInteger(event.cursor) || event.cursor !== position + 1 || event.cursor > status.nextCursor)
            throw mediaIssue("OUTPUT", "The media job returned incomplete output.");
          outputBytes += new TextEncoder().encode(event.text).byteLength;
          if (outputBytes > OUTPUT_BYTES) throw mediaIssue("OUTPUT_LIMIT", "The media output exceeds its 4 MiB byte budget.");
          position = event.cursor;
          if (event.stream === "stdout") { stdout += event.text; onStdout?.(event.text); }
          else { stderr += event.text; onStderr?.(event.text); }
        }
        if (position !== status.nextCursor) throw mediaIssue("OUTPUT", "The media job returned an incomplete output cursor.");
        cursor = status.nextCursor;
        if (settled && status.events.length === 0) {
          if (status.state === "cancelled" || signal?.aborted || disposed) throw new DOMException("Aborted", "AbortError");
          if (status.state === "failed") throw new Error(status.error || stderr || "Media processing failed.");
          return { stdout, stderr };
        }
        if (!settled) await new Promise(resolve => setTimeout(resolve, 150));
      }
    } catch (error) {
      if (!settled) await settleAfterFailure(error);
      throw error;
    } finally {
      signal?.removeEventListener("abort", abort);
      activeJobs.delete(jobId);
    }
  };
  return {
    files,
    environment,
    media: {
      runFFmpeg: (args: string[], quiet?: boolean, signal?: AbortSignal, stdout?: (text: string) => void, stderr?: (text: string) => void) => process("FFmpeg", args, quiet, signal, stdout, stderr),
      runFFprobe: (args: string[], quiet?: boolean, signal?: AbortSignal) => process("FFprobe", args, quiet, signal),
    },
    dialogs: {
      pickFilePath: (filters?: Array<{ name: string; extensions: string[] }>) => run("editor.pickFile", [{ filters }]),
      pickDirectoryPath: () => run("editor.pickDirectory", []),
      pickSavePath: (defaultPath: string) => run("editor.pickSavePath", [{ defaultPath }]),
    },
    dispose() { disposed = true; for (const requestCancel of activeJobs.values()) void requestCancel().catch(() => {}); },
  };
}

const panelLocalClients = new WeakMap<object, any>();
function panelLocalClient(sdk: any): any {
  const client = panelLocalClients.get(sdk);
  if (!client) throw new Error("Local SDK has not initialized.");
  return client;
}
function withPanelLocalClient(Component: any) {
  return function LocalSdkPanel(props: any) {
    const [state, setState] = React.useState<any>(null);
    const reported = React.useRef(new WeakMap<object, Set<string>>());
    const key = JSON.stringify([props.context?.projectId ?? null,
      props.context?.template?.libraryId ?? props.context?.libraryId ?? null,
      props.context?.template?.runId ?? null]);
    React.useEffect(() => {
      let active = true, settled = false;
      let client: any;
      const fail = (timeout: boolean, cause?: unknown) => {
        if (!active || settled) return;
        settled = true; clearTimeout(timer);
        const error = timeout
          ? "Connecting to Selects took too long. Reopen the Project and try again."
          : "Could not connect to Selects. Reopen the Project and try again; update Selects if the problem continues.";
        // Diagnostics stay private; neither the DOM nor finishTemplate receives
        // raw SDK output, paths or an exception stack.
        setState({sdk: props.sdk, key, error, cause});
      };
      // This is a read-only bootstrap observation, not a mutation retry or cancel.
      const timer = setTimeout(() => fail(true), 30000);
      createPanelLocalClient(props.sdk).then(value => {
        client = {...props.sdk, ...value};
        if (!active || settled) { value.dispose(); return; }
        settled = true; clearTimeout(timer);
        panelLocalClients.set(props.sdk, client);
        setState({sdk: props.sdk, key});
      }).catch(error => fail(false, error));
      return () => {
        active = false; clearTimeout(timer);
        if (client) {
          if (panelLocalClients.get(props.sdk) === client) panelLocalClients.delete(props.sdk);
          client.dispose();
        }
      };
    }, [props.sdk, key]);
    React.useEffect(() => {
      if (!props.context?.template || state?.sdk !== props.sdk || state?.key !== key || !state?.error) return;
      if (typeof props.sdk?.finishTemplate !== "function") return;
      const seen = reported.current.get(props.sdk) ?? new Set<string>();
      if (seen.has(key)) return;
      seen.add(key); reported.current.set(props.sdk, seen);
      // A failed connection never mounts the child, so the wrapper must finish
      // a hidden app run itself. Visible standalone panels keep an alert only.
      try { Promise.resolve(props.sdk.finishTemplate({error: state.error})).catch(() => {}); }
      catch { /* Do not replay completion or expose a transport exception. */ }
    }, [props.sdk, key, state, !!props.context?.template]);
    if (state?.sdk !== props.sdk || state?.key !== key) return React.createElement("div", {role: "status"}, "Connecting to Selects…");
    if (state?.error) return React.createElement("div", {role: "alert"}, state.error);
    return React.createElement(Component, props);
  };
}

export default withPanelLocalClient(Panel);
// local-sdk:end

// app-update-guard:start
// Shared source, inlined into portable panels by tools/sync_app_update_guards.py.
import * as AppUpdateGuardReact from 'react';

const appUpdateGuardScopes = new WeakMap<object, any>();

/** Each mounted editor contributes a live veto; the host receives one guard per SDK. */
function useAppUpdateGuard(sdk: any, language: string | undefined, readBlocked: (context: any) => boolean) {
  const live = AppUpdateGuardReact.useRef({ language, readBlocked });
  live.current = { language, readBlocked };
  AppUpdateGuardReact.useEffect(() => {
    const api = sdk?.updates;
    if (typeof api?.registerGuard !== 'function') return;
    let group = appUpdateGuardScopes.get(api);
    if (!group) {
      group = { entries: new Set(), dispose: null };
      appUpdateGuardScopes.set(api, group);
    }
    group.entries.add(live);
    if (!group.dispose) {
      group.dispose = api.registerGuard({
        async canUpdate(context: any) {
          for (const entry of group.entries) {
            // A partially initialized editor must not lose state during reload.
            let blocked = true;
            try { blocked = Boolean(entry.current.readBlocked(context)); } catch { /* fail closed */ }
            if (blocked) {
              const korean = String(entry.current.language || '').toLowerCase().startsWith('ko');
              throw new Error(korean
                ? '\uc9c4\ud589 \uc911\uc778 \uc791\uc5c5\uc744 \ub9c8\uce58\uace0 \ubcc0\uacbd\uc0ac\ud56d\uc744 \uc800\uc7a5\ud55c \ub4a4 \uc571\uc744 \uc5c5\ub370\uc774\ud2b8\ud574\uc8fc\uc138\uc694.'
                : 'Finish the current operation and save changes before updating this app.');
            }
          }
        },
      });
    }
    return () => {
      group.entries.delete(live);
      if (!group.entries.size) {
        group.dispose?.();
        appUpdateGuardScopes.delete(api);
      }
    };
  }, [sdk?.updates]);
}
// app-update-guard:end
