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
// native-image-input:start
// Read-only original Image facts. Canonical input feature for photo templates.
async function nativeImageSources(selects, projectId, photos) {
 const project=selects.project(projectId), resources=await project.resources(), nodes=[];
 const visit=items=>{for(const item of items||[])item.type==='dir'?visit(item.children):nodes.push(item);};
 const overview=await project.sourceFiles();
 if('fileTree' in overview)visit(overview.fileTree);
 else for(const folder of overview.folders||[]){const detail=await project.sourceFiles({folder:folder.name});if('fileTree' in detail)visit(detail.fileTree);}
 const sources=photos.map(photo=>{
  const matches=nodes.filter(node=>node.path===photo.path&&resources.some(resource=>resource.resourceId===node.resourceId&&resource.type==='Image'));
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
async function nativeImageRun(sdk,script,summary,allowCommit=false) {
 const response=await sdk.runScript({script,summary,allowCommit,timeoutSeconds:120});
 if(response.isError||response.result==null)throw Error(response.output||'Image placement could not be confirmed. Inspect the Draft before retrying.');
 return response.result;
}
export async function prepareNativeImages(sdk,projectId,photos,knownLibraryId=null) {
 const result=await nativeImageRun(sdk,`try{return {sources:await (${nativeImageSources.toString()})(selects,${JSON.stringify(projectId)},${JSON.stringify(photos)})};}catch(error){const issue=Object(error);return {sourceError:{code:typeof issue.code==='string'?issue.code:'image-source-invalid',message:String(issue.message||error),resourceId:issue.resourceId??null}};}`,'Verify original Project Images');
 if(result.sourceError){
  const error=Object.assign(new Error(result.sourceError.message),result.sourceError);
  if(['image-source-missing','image-source-unreadable','image-source-unknown','image-source-changed'].includes(error.code))error.publicMessage=error.message+'. Check the original file in the Project, then try again.';
  throw error;
 }
 if(!Array.isArray(result.sources))throw Error('Original Image verification returned an incomplete result.');
 return {sdk,projectId,sources:result.sources};
}
// native-image-input:end
// native-image-authoring:start
// Prepare editable Image occurrences in one working copy. The caller owns its
// trusted Project/Draft handle and the sole final commit.
async function placeWorkingCopyImages(selects,projectId,draft,plan,sources,items,sourceFacts){
 const project=selects.project(projectId),meta=await draft.meta();
 if(meta.fps!==plan.fps||meta.durationFrames!==plan.durationFrames||meta.frameSize.width!==plan.canvas.width||meta.frameSize.height!==plan.canvas.height)throw Error('The Draft frame grid differs from the plan.');
 const fresh=await sourceFacts(selects,projectId,sources);
 if(fresh.length!==sources.length||fresh.some((source,index)=>source.resourceId!==sources[index].resourceId||source.width!==sources[index].width||source.height!==sources[index].height))throw Error('A selected Image changed. Prepare the Images again.');
 const placements=[];
 for(const item of items){
  const source=fresh[item.source];if(!source)throw Error('An Image occurrence has no source.');
  const before=new Set((await draft.clips({trackScope:'all'})).map(clip=>clip.clipId));
  await draft.overlayResource({resource:project.resource(source.resourceId),over:await draft.rangeAtFrames(item.startFrame,item.endFrame)});
  const added=(await draft.clips({trackScope:'all'})).filter(clip=>!before.has(clip.clipId));
  if(added.length!==1||added[0].resourceId!==source.resourceId||added[0].startFrame!==item.startFrame||added[0].endFrame!==item.endFrame)throw Error('The Image interval changed during placement.');
  placements.push({...item,clipId:added[0].clipId,trackId:added[0].trackId,resourceId:source.resourceId});
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
async function inspectImageTransforms(draft,expected){
 // Both consumers author fixed intrinsic transforms; motion belongs to their
 // separate effects. Never adopt an observed transform as the expected value.
 if(!('clipTransform' in draft))throw Error('Update Selects to verify Image transforms.');
 const rows=(await draft.clips({trackScope:'all'})).filter(clip=>clip.trackKind==='video');
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
async function inspectImageAudio(draft,expected,project){
 const rows=(await draft.clips({trackScope:'all'})).filter(row=>row.trackKind==='audio'||row.trackKind==='main'&&row.resourceId);
 if(!Array.isArray(expected)||rows.length!==expected.length||new Set(expected.map(row=>row.clipId)).size!==expected.length)throw Error('Audio clip count could not be confirmed.');
 if(!expected.length)return [];
 if(!('clipAudio' in draft))throw Error('Update Selects to verify Audio settings.');
 if(!('clipSourceWindow' in draft))throw Error('Update Selects to verify Audio source timing.');
 const types=new Map((await project.resources()).map(row=>[row.resourceId,row.type])),receipts=[];
 const same=(a,b)=>{
  if(typeof a==='number'||typeof b==='number')return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(b));
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const keys=Object.keys(b);return Object.keys(a).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(a,key)&&same(a[key],b[key]));
 };
 for(const wanted of expected){
  const row=rows.find(c=>c.clipId===wanted.clipId&&c.trackId===wanted.trackId);
  if(!row||row.trackKind!==wanted.trackKind||row.resourceId!==wanted.resourceId||row.startFrame!==wanted.startFrame||row.endFrame!==wanted.endFrame||types.get(row.resourceId)!=='Audio'||!same(row.audioSourceIndexes,wanted.audioSourceIndexes))throw Error('Audio placement or routing could not be confirmed.');
  const settings={volumeDb:0,volumeKeys:[],fadeInSeconds:0,fadeOutSeconds:0,...wanted.settings},actual=await draft.clipAudio(row);
  if(!actual||actual.clipId!==row.clipId||!Object.entries(settings).every(([key,value])=>same(actual[key],value)))throw Error('Audio volume or fades could not be confirmed.');
  if(!wanted.source||!Number.isFinite(wanted.source.startSeconds)||wanted.source.startSeconds<0||!Number.isFinite(wanted.source.endSeconds)||wanted.source.endSeconds<=wanted.source.startSeconds)throw Error('Audio source evidence is unavailable.');
  const source={startSeconds:wanted.source.startSeconds,endSeconds:wanted.source.endSeconds,playbackSpeed:{numerator:1,denominator:1},preserveAudioPitch:true,...wanted.source};
  // Time uses floating-point arithmetic noise only, not the relative tolerance
  // used for level/fades. A small changed source instant must remain detectable.
  const timeSame=(a,b)=>Number.isFinite(a)&&Math.abs(a-b)<=8*Number.EPSILON*Math.max(1,Math.abs(a),Math.abs(b));
  let observed;try{observed=await draft.clipSourceWindow(row);}catch(cause){throw Object.assign(Error('Audio source timing could not be confirmed.'),{cause});}
  if(!observed||observed.clipId!==row.clipId||!timeSame(observed.startSeconds,source.startSeconds)||!timeSame(observed.endSeconds,source.endSeconds)||row.playbackSpeed?.numerator!==source.playbackSpeed.numerator||row.playbackSpeed?.denominator!==source.playbackSpeed.denominator||row.preserveAudioPitch!==source.preserveAudioPitch)throw Error('Audio source timing or playback policy could not be confirmed.');
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
 const normalized=program=>({tsxCode:program.tsxCode,editableParameters:program.editableParameters,parameters:{...Object.fromEntries(program.editableParameters.map(d=>[d.key,d.defaultValue])),...program.parameters}});
 const matches=(actual,wanted)=>actual&&actual.tsxCode===wanted.tsxCode&&same(actual.editableParameters,wanted.editableParameters)&&same(actual.parameters,wanted.parameters);
 const inspect=async(draft,expected)=>{
  if(!('videoEffects' in draft)||!('videoEffectProgram' in draft)||!('motionGraphicProgram' in draft))throw issue('Update Selects to verify Image programs.');
  const rows=(await draft.clips({trackScope:'all'})).filter(c=>c.trackKind==='video');
  if(!Array.isArray(expected)||expected.length!==rows.length||new Set(expected.map(c=>c.clipId)).size!==expected.length)throw issue('Visual program count could not be confirmed.');
  const sources=[],clips=[];
  const pack=program=>{const p=normalized(program);let source=sources.indexOf(p.tsxCode);if(source<0){source=sources.length;sources.push(p.tsxCode);}return {source,parameters:p.parameters,editableParameters:p.editableParameters};};
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
  const program=await probe.videoEffectProgram(effects[0]),expected=normalized({tsxCode:program?.tsxCode,parameters:definition.parameters,editableParameters:definition.editableParameters});
  if(typeof program?.tsxCode!=='string'||!program.tsxCode||!matches(program,expected))throw issue('Effect preset reference program could not be confirmed.');
  const value={name:definition.label,...expected};presets.set(id,value);return value;
 };
 const confirm=details=>{
  if(!config||!format)throw issue('Program receipt confirmation requires an authoring target.');
  const result={draftId:config.partialDraftId||'x'.repeat(120),fps:config.plan.fps,durationFrames:config.plan.durationFrames,frameSize:config.plan.canvas,clips:config.clips,...details};
  // Reserve more than a UUID for the post-commit identity. Check the actual
  // journal envelope and ASCII encoding before the only persistence boundary.
  try{format(config.runReceipt?{...JSON.parse(config.runReceipt.expectedText),status:'saved',result}:result);}catch(cause){throw Object.assign(issue('The Image program receipt exceeds its limit or could not be prepared.'),{cause});}
 };
 const verify=(draft,receipt)=>inspect(draft,receipt.clips.map(c=>{const expand=p=>({tsxCode:receipt.sources[p.source],parameters:p.parameters,editableParameters:p.editableParameters});return {...c,effects:c.effects.map(e=>({name:e.name,...expand(e)})),graphic:c.graphic?expand(c.graphic):null};}));
 return {inspect:guarded(inspect),preset:guarded(preset),confirm,verify:guarded(verify)};
}
async function authorAtomicImageDraft(selects,config,finish,placeImages,sourceFacts,inspectGraphics,inspectTransforms,inspectAudio,programFeature,format){
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
  stage='placement';const native=await placeImages(selects,projectId,draft,plan,sources,items,sourceFacts);
  const clips=native.placements.map(({key,slot,appearance,clipId,trackId,resourceId,startFrame,endFrame})=>({key,slot,appearance,clipId,trackId,resourceId,startFrame,endFrame}));
  stage='finish';const result=await finish(selects,config,draft,native,inspectGraphics,inspectTransforms,inspectAudio,programFeature(selects,{...config,clips},format));
  return {...result,fps:plan.fps,durationFrames:plan.durationFrames,frameSize:plan.canvas,clips};
 }catch(error){return {status:stage==='finish'?'outcomeUnknown':'notSaved',stage,message:String(error?.message||error),draftId:config.partialDraftId||null};}
}
function buildAtomicImageDraftScript(config,finishSource){
 const receipt=config.runReceipt?`await (${writeTemplateRunResult.toString()})(selects,config.runReceipt,result,${templateRunJSON.toString()},${templateRunBase64.toString()})`:'result';
 return `const config=${JSON.stringify(config)};const result=await (${authorAtomicImageDraft.toString()})(selects,config,${finishSource},${placeWorkingCopyImages.toString()},${nativeImageSources.toString()},${inspectImageGraphics.toString()},${inspectImageTransforms.toString()},${inspectImageAudio.toString()},${imageProgramsFeature.toString()},${templateRunJSON.toString()});return ${receipt};`;
}
async function verifyAtomicImageDraft(sdk,projectId,result){
 const {draftId,fps,durationFrames,frameSize,clips,graphics,transforms,audio,programs}=result,expected={draftId,fps,durationFrames,frameSize,clips,graphics,transforms,audio,programs};
 const unverified=cause=>{const message='The saved Image Draft, graphics or sound could not be confirmed. Inspect the Draft before starting a new run.';return Object.assign(Error(message),{code:'IMAGE_SAVE_UNVERIFIED',draftId,publicMessage:message,cause});};
 if(!Array.isArray(graphics))throw Object.assign(Error('Saved graphic receipts are unavailable. Inspect the existing Draft before starting a new run.'),{code:'IMAGE_SAVE_UNVERIFIED',draftId});
 if(!Array.isArray(transforms))throw unverified('Saved transform receipts are unavailable.');
 if(!Array.isArray(audio))throw unverified('Saved Audio receipts are unavailable.');
 if(audio.some(row=>!row?.source))throw unverified('Saved Audio source evidence is unavailable.');
 if(!programs)throw unverified('Saved program receipts are unavailable.');
 let response;try{response=await sdk.runScript({summary:'Verify complete saved Image Draft',allowCommit:false,script:`const expected=${JSON.stringify(expected)};const project=selects.project(${JSON.stringify(projectId)});if(!(await project.meta()).draftIds.includes(expected.draftId))throw Error('Saved Draft is not in this Project');const draft=selects.draft(expected.draftId),meta=await draft.meta(),rows=await draft.clips({trackScope:'all'});if(meta.fps!==expected.fps||meta.durationFrames!==expected.durationFrames||meta.frameSize.width!==expected.frameSize.width||meta.frameSize.height!==expected.frameSize.height)throw Error('Saved Draft frame grid could not be confirmed');if(rows.filter(row=>row.trackKind==='video'&&row.resourceId).length!==expected.clips.length)throw Error('Saved Image count could not be confirmed');for(const wanted of expected.clips){const actual=rows.find(row=>row.clipId===wanted.clipId&&row.trackId===wanted.trackId);if(!actual||actual.resourceId!==wanted.resourceId||actual.startFrame!==wanted.startFrame||actual.endFrame!==wanted.endFrame)throw Error('Saved Image placement could not be confirmed');}await (${inspectImageGraphics.toString()})(draft,expected.graphics);await (${inspectImageTransforms.toString()})(draft,expected.transforms);await (${inspectImageAudio.toString()})(draft,expected.audio,project);await (${imageProgramsFeature.toString()})(selects).verify(draft,expected.programs);return {verified:true};`});}catch(cause){throw unverified(cause);}
 if(response?.isError||response?.result?.verified!==true)throw unverified(response?.output);
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
function templateRunJSON(value) {
 const text=JSON.stringify(value).replace(/[\u007f-\uffff]/g,char=>'\\u'+char.charCodeAt(0).toString(16).padStart(4,'0'));
 if(text.length>49152)throw Error('The template run receipt exceeds the local file limit.');
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
function validateTemplateRun(row,scope,digest) {
 const invalid=()=>templateRunIssue('TEMPLATE_RUN_INVALID','The saved run record could not be verified. Inspect the Project before starting a new run.');
 if(!row||row.version!==1||!row.scope||Object.keys(row.scope).length!==4||Object.keys(scope).some(key=>row.scope[key]!==scope[key])||row.requestDigest!==digest||
  typeof row.owner!=='string'||!/^[\da-f-]{36}$/i.test(row.owner)||!['claimed','saved','notSaved','outcomeUnknown'].includes(row.status))throw invalid();
 if(row.status==='saved'){
  const r=row.result;
  if(!r||typeof r.draftId!=='string'||!r.draftId||!Number.isFinite(r.fps)||r.fps<=0||!Number.isSafeInteger(r.durationFrames)||r.durationFrames<1||
   !Number.isSafeInteger(r.frameSize?.width)||r.frameSize.width<1||!Number.isSafeInteger(r.frameSize?.height)||r.frameSize.height<1||!Array.isArray(r.clips)||!r.clips.length||r.clips.length>256||
   r.clips.some(c=>!c||!Number.isSafeInteger(c.clipId)||typeof c.trackId!=='string'||!c.trackId||typeof c.resourceId!=='string'||!c.resourceId||!Number.isSafeInteger(c.startFrame)||!Number.isSafeInteger(c.endFrame)||c.startFrame<0||c.endFrame<=c.startFrame||c.endFrame>r.durationFrames))throw invalid();
  if(new Set(r.clips.map(c=>c.clipId)).size!==r.clips.length)throw invalid();
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
   if(!p||Object.keys(p).length!==2||!Array.isArray(p.sources)||p.sources.length>256||p.sources.some(s=>typeof s!=='string'||!s||s.length>49152)||new Set(p.sources).size!==p.sources.length||!Array.isArray(p.clips)||p.clips.length!==visual.length||new Set(p.clips.map(c=>c?.clipId)).size!==p.clips.length)throw invalid();
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
   saved={draftId:result.draftId,fps:result.fps,durationFrames:result.durationFrames,frameSize:result.frameSize,clips:result.clips,...'graphics' in result?{graphics:result.graphics}:{},...'transforms' in result?{transforms:result.transforms}:{},...'audio' in result?{audio:result.audio}:{},...'programs' in result?{programs:result.programs}:{}};
  }
  const next=json({...row,status,...saved?{result:saved}:{}});
  const reply=await selects.files.compareAndReplace({path:claim.path,expectedBase64:encode(claim.expectedText),base64:encode(next)});
  return {...result,runReceiptSaved:reply?.replaced===true};
 }catch{return {...result,runReceiptSaved:false};}
}
async function executeTemplateRun(sdk,files,scope,request,isCurrent,perform,verify) {
 const fail=(code,message)=>{throw templateRunIssue(code,message);};
 const check=()=>{if(!isCurrent())fail('TEMPLATE_RUN_DETACHED','The template run ended.');};
 check();
 if(!scope||!['pluginId','libraryId','projectId','runId'].every(key=>typeof scope[key]==='string'&&scope[key].length>0&&scope[key].length<=1024)||!/^[a-z0-9-]+$/.test(scope.pluginId))fail('TEMPLATE_RUN_INVALID','The template run target is incomplete. Start again from the Project.');
 scope={pluginId:scope.pluginId,libraryId:scope.libraryId,projectId:scope.projectId,runId:scope.runId};
 const targetCheck=async()=>{
  const target=await sdk.call('getProjectDraftScaffold',scope.projectId);
  if(target?.owner?.libraryId!==scope.libraryId||target.owner.projectId!==scope.projectId)fail('TEMPLATE_RUN_TARGET','The template run belongs to a different Project or library. Start again from the intended Project.');
  check();
 };
 await targetCheck();
 if(!files||!['join','homedir','exists','stat','readRange','writeFile','compareAndReplace','mkdir'].every(key=>typeof files[key]==='function'))fail('TEMPLATE_RUN_UNSUPPORTED','Update Selects to save and recover template runs safely.');
 const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(templateRunJSON(value)))),n=>n.toString(16).padStart(2,'0')).join('');
 const key=await digest(scope),requestDigest=await digest(request);
 const directory=files.join(files.homedir(),'.selects','plugin-data',scope.pluginId,'template-runs'),path=files.join(directory,key+'.json');
 const read=async()=>{
  if(!await files.exists(path))return null;
  let row;
  try{
   const stat=await files.stat(path);if(!stat||stat.isDirectory!==false||!Number.isSafeInteger(stat.size)||stat.size<1||stat.size>49152)throw Error('Invalid record size');
   const bytes=await files.readRange(path,0,stat.size),after=await files.stat(path);
   if(Object.prototype.toString.call(bytes)!=='[object Uint8Array]'||bytes.byteLength!==stat.size||!after||['size','mtimeMs','ino'].some(key=>stat[key]!==after[key]))throw Error('Run record changed while reading');
   row=JSON.parse(new TextDecoder().decode(bytes));
  }catch{fail('TEMPLATE_RUN_INVALID','The saved run record could not be read. Inspect the Project before starting a new run.');}
  return validateTemplateRun(row,scope,requestDigest);
 };
 const recover=async row=>{
  if(row.status==='saved'){await targetCheck();return verify({...row.result,status:'saved',projectId:scope.projectId});}
  if(row.status==='notSaved')fail('TEMPLATE_RUN_NOT_SAVED','This run stopped before saving a Draft. Start a new run to retry.');
  fail('TEMPLATE_RUN_PENDING','This run may still be saving or awaiting confirmation. Inspect the Project before starting another run.');
 };
 const existing=await read();if(existing)return recover(existing);
 const capability=await sdk.runScript({summary:'Check durable template run support',allowCommit:false,script:"return {supported:'files' in selects&&'compareAndReplace' in selects.files&&'writeChunk' in selects.files};"});
 if(capability.isError||capability.result?.supported!==true)fail('TEMPLATE_RUN_UNSUPPORTED','Update Selects to save and recover template runs safely.');
 await files.mkdir(directory,{recursive:true});check();
 const owner=crypto.randomUUID(),expectedText=templateRunJSON({version:1,scope,requestDigest,owner,status:'claimed'}),claim={path,expectedText};
 // Exclusive creation is a filesystem operation, including across app windows.
 // compareAndReplace alone serializes only one renderer bridge's own writes.
 try{await files.writeFile(path,expectedText,{flag:'wx'});}catch(cause){
  const row=await read();
  if(!row)fail('TEMPLATE_RUN_STORAGE','The run could not be recorded. Nothing was dispatched. Check local file access and start a new run.');
  if(row.owner!==owner)return recover(row);
  // A lost claim ACK is safe to recover here: authoring has not been dispatched.
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
  }
  throw cause;
 }
}
// template-run:end
async function nativeImagePlacement(selects,input,placeImages,sourceFacts) {
 const {projectId,draftId,plan,items,sources}=input,project=selects.project(projectId),draft=selects.draft(draftId);
 if(!(await project.meta()).draftIds.includes(draftId))throw Error('The Draft is not owned by the selected Project.');
 const result=await placeImages(selects,projectId,draft,plan,sources,items,sourceFacts);
 await draft.commitAll('Place original editable Images');
 return {...result,status:'committed'};
}
export async function placeNativeImages(prepared,draftId,plan,items,label) {
 const {sdk,projectId,sources}=prepared;
 items=plan.occurrences.map(item=>({...item,source:'ABCD'.indexOf(item.slot)}));
 const input={projectId,draftId,plan,items,sources};
 const result=await nativeImageRun(sdk,`return await (${nativeImagePlacement.toString()})(selects,${JSON.stringify(input)},${placeWorkingCopyImages.toString()},${nativeImageSources.toString()});`,'Place original editable Images',true);
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
// bundled-audio:start
// Panel-owned preparation; host files and Project imports keep their existing
// canonical transports. SDK inventory is bounded before leaving the worker.
async function readBundledAudioResource(selects,projectId,path,platform){
 const project=selects.project(projectId),resources=new Map((await project.resources()).map(r=>[r.resourceId,r])),matches=[];
 const key=value=>platform==='win32'?String(value).replace(/\\/g,'/').toLowerCase():String(value);
 const visit=items=>{for(const n of items||[]){if(n.type==='dir')visit(n.children);else if(n.path&&key(n.path)===key(path)&&resources.has(n.resourceId)){const r=resources.get(n.resourceId);matches.push({resourceId:r.resourceId,type:r.type,durationSeconds:r.durationSeconds});}}};
 const tree=await project.sourceFiles();
 if('fileTree' in tree)visit(tree.fileTree);
 else for(const folder of tree.folders||[]){const detail=await project.sourceFiles({folder:folder.name});if('fileTree' in detail)visit(detail.fileTree);}
 return {matches:matches.slice(0,2)};
}
async function prepareBundledAudio(sdk,files,{projectId,pluginId,sourcePath,platform='darwin',minimumSeconds=0,isCurrent=()=>true}){
 const issue=(code,message,cause)=>Object.assign(Error(message),{code:'BUNDLED_AUDIO_'+code,publicMessage:message,...cause?{cause}:{}});
 let importStarted=false;
 const current=()=>{if(!isCurrent())throw issue('STOPPED',importStarted?'The template run ended after a music import was requested. Check the Project files.':'The template run ended before importing music.');};
 try{
  if(typeof projectId!=='string'||!projectId||projectId!==projectId.trim()||typeof pluginId!=='string'||!/^[a-z0-9][a-z0-9-]*$/.test(pluginId)||typeof sourcePath!=='string'||!sourcePath||!Number.isFinite(minimumSeconds)||minimumSeconds<0)throw issue('INPUT','The bundled music request is invalid.');
  const subtle=globalThis.crypto?.subtle;if(!subtle)throw issue('UNSUPPORTED','Update Selects to check the bundled music.');
  const bytes=async path=>{
   const stat=await files.stat(path);
   if(!stat||stat.isDirectory!==false||!Number.isSafeInteger(stat.size)||stat.size<1||stat.size>32*1024*1024)throw issue('BYTES','The bundled music must be a readable file between 1 byte and 32 MiB.');
   const raw=await files.readFile(path);if(!ArrayBuffer.isView(raw)||raw.byteLength!==stat.size)throw issue('CHANGED','The bundled music file changed while reading. Start a new run.');
   return Uint8Array.from(new Uint8Array(raw.buffer,raw.byteOffset,raw.byteLength));
  };
  const hash=async value=>Array.from(new Uint8Array(await subtle.digest('SHA-256',value)),b=>b.toString(16).padStart(2,'0')).join('');
  current();const original=await bytes(sourcePath),digest=await hash(original);
  const directory=files.join(await files.homedir(),'.selects','plugin-data',pluginId,'assets'),path=files.join(directory,digest+'.mp3');
  current();await files.mkdir(directory,{recursive:true});
  const stored=await files.exists(path)?await files.stat(path):null;
  const have=stored?.isDirectory===false&&stored.size===original.length?await bytes(path):null;
  if(!have||await hash(have)!==digest){current();await files.writeFile(path,original);}
  current();if(await hash(await bytes(path))!==digest)throw issue('COPY','The bundled music data copy could not be confirmed.');
  if(await hash(await bytes(sourcePath))!==digest)throw issue('CHANGED','The installed music changed while it was being prepared. Start a new run.');
  const read=async()=>{
   current();const response=await sdk.runScript({summary:'Find bundled music Resource',allowCommit:false,script:`return await (${readBundledAudioResource.toString()})(selects,${JSON.stringify(projectId)},${JSON.stringify(path)},${JSON.stringify(platform)});`});
   if(response?.isError||!Array.isArray(response?.result?.matches)||response.result.matches.length>1)throw issue('READ','The music in this Project could not be uniquely confirmed. Check the Project files.');
   return response.result.matches[0]??null;
  };
  const ready=row=>{
   if(!row||typeof row.resourceId!=='string'||!row.resourceId||row.type!=='Audio'||!Number.isFinite(row.durationSeconds)||row.durationSeconds<=0||row.durationSeconds<minimumSeconds)throw issue('METADATA','The bundled file could not be confirmed as full-length audio. Check the Project files.');
   return {resourceId:row.resourceId};
  };
  const existing=await read();if(existing)return ready(existing);
  current();let imported,importFailure;importStarted=true;
  try{imported=await sdk.runScript({summary:'Import bundled music',allowCommit:true,script:`return await selects.project(${JSON.stringify(projectId)}).importFiles({paths:${JSON.stringify([path])}});`});}catch(error){importFailure=error;}
  const ids=imported?.result?.addedResourceIds;
  const row=await read();
  if(row){
   if(Array.isArray(ids)&&ids.length&&(ids.length!==1||ids[0]!==row.resourceId))throw issue('IMPORT_UNKNOWN','The added music could not be confirmed. Check the Project files.');
   return ready(row);
  }
  if(!imported?.isError&&Array.isArray(ids)&&!ids.length)throw issue('SKIPPED','Selects did not add the bundled music. Check the file and Project import result before starting again.');
  throw issue('IMPORT_UNKNOWN','The music import outcome could not be confirmed. Check the Project files before starting again.',importFailure);
 }catch(error){if(/^BUNDLED_AUDIO_/.test(error?.code||''))throw error;throw issue('PREPARE','The bundled music could not be prepared. Check the installed music and Project files.',error);}
}
// bundled-audio:end
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
    readdir: (path: string) => run("files.readdir", [path]),
    readRange,
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
  const activeJobs = new Set<string>();
  let disposed = false;
  const cancel = async (jobId: string) => {
    const response = await sdk.runScript({ summary: "Cancel local media processing", allowCommit: true, script: "await selects.media.job(" + JSON.stringify(jobId) + ").cancel();" });
    if (response.isError) throw new Error(response.output || "Media cancellation failed.");
  };
  const process = async (executable: "FFmpeg" | "FFprobe", args: string[], _withoutLog?: boolean, signal?: AbortSignal, onStdout?: (text: string) => void, onStderr?: (text: string) => void) => {
    if (disposed || signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const started = await run("media.start" + executable, [{ args }], true);
    if (!started?.jobId) throw new Error("The media process did not return a job id.");
    const jobId = started.jobId;
    activeJobs.add(jobId);
    let cancellation: Promise<void> | null = null;
    const abort = () => { cancellation ??= cancel(jobId); void cancellation.catch(() => {}); };
    signal?.addEventListener("abort", abort, { once: true });
    if (disposed || signal?.aborted) abort();
    let cursor = 0, stdout = "", stderr = "";
    try {
      while (true) {
        if (cancellation) await cancellation;
        const status = await sdk.call("getLocalMediaJobStatus", jobId, { cursor });
        if (!status || !Array.isArray(status.events)) throw new Error("Media status is unavailable.");
        if (status.truncated) throw new Error("Media output was truncated; no incomplete result was accepted.");
        for (const event of status.events) {
          if (event.stream === "stdout") { stdout += event.text; onStdout?.(event.text); }
          else { stderr += event.text; onStderr?.(event.text); }
        }
        cursor = status.nextCursor;
        if (status.state !== "running" && status.events.length === 0) {
          if (status.state === "cancelled" || signal?.aborted) throw new DOMException("Aborted", "AbortError");
          if (status.state === "failed") throw new Error(status.error || stderr || "Media processing failed.");
          return { stdout, stderr };
        }
        if (status.state === "running") await new Promise((resolve) => setTimeout(resolve, 150));
      }
    } catch (error) {
      await cancel(jobId).catch(() => {});
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
    dispose() { disposed = true; for (const jobId of activeJobs) void cancel(jobId).catch(() => {}); },
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
