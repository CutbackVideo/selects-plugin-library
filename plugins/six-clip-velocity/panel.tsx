// @name Six Clip Velocity
// @name:de Six Clip Velocity
// @name:en Six Clip Velocity
// @name:es Six Clip Velocity
// @name:fr Six Clip Velocity
// @name:it Six Clip Velocity
// @name:ja Six Clip Velocity
// @name:ko Six Clip Velocity
// @name:pt Six Clip Velocity
// @name:tr Six Clip Velocity
// @name:zh Six Clip Velocity
// @icon video
import React from 'react';

const SLOTS=6;
// --- Reference plan and finishing step -----------------------------------------
// Runs in the Panel itself, so the machine needs no Node.js. A `...Source` constant
// is a function kept as source text: run_script receives exactly the code written here.
// tests/six_clip_velocity.test.mjs loads everything between the two marker lines.
// @operation-start
// Measured frame by frame from the reference (30 fps, 699 frames, 1080x1440).
// Frame numbers below are reference frames at 30 fps; scenePlan converts them.
export const REF={fps:30,durationFrames:699,canvas:{width:1080,height:1440}};
export const VIDEOS=6;
// Every beat cut (about 0.976 s, two beats at ~123 BPM) sits in a vertical blur
// transition, except 411, which is a white flash.
export const CUTS=[206,235,264,293,323,352,382,411,440,469,499,527,557,587,616,645];
const BLOCK=[2,3,1,4,5,5,3]; // video index (0-based) for the seven-shot block, played twice
// Segments: [video, start, end, kind]. 'plain' plays at 1x; 'ramp' is a velocity ramp.
const SEGMENTS=[
 [0,0,175,'plain'],
 [1,175,206,'ramp'],
 ...BLOCK.map((v,i)=>[v,CUTS[i],CUTS[i+1],'ramp']),
 [0,411,440,'ramp'],
 ...BLOCK.map((v,i)=>[v,CUTS[i+8],CUTS[i+9],'ramp'])
];
// The last shot keeps playing at 1x under the fade to black (645-672); 672-699 is black.
// The shot runs to 699 under the opaque fade because export ends at the last video clip.
const TAIL={start:645,end:699};
// Velocity ramp measured as relative motion inside each segment (fast at both cuts,
// slow in the middle): piece boundaries as fractions of the segment, and speeds.
export const RAMP={bounds:[0,0.1,0.25,0.37,0.6,0.75,0.9,1],speeds:[4,2.5,1.2,0.5,1,1.8,4]};
// Shots whose footage repeats: the second block (segments 10-16) replays the exact
// source ranges of the first block (segments 2-8), as the reference does.
const REPEAT_OF=Object.fromEntries(BLOCK.map((_,i)=>[10+i,2+i]));

export const LOOK={
 // Vertical motion blur on the cut frames c-2..c+2 (canvas px) plus a Gaussian.
 blurProfile:[0.55,0.85,1,0.75,0.45],blurLength:160,blurSoft:6,
 // White flash around 411 (overlay alpha per frame 408..418; negative = black).
 flash:{start:408,alpha:[0.03,0.3,0.65,0.92,0.45,-0.1,-0.45,-0.4,-0.3,-0.2,-0.1]},
 // Fade: 35% black at 645, linear to black at 672, then black to the end.
 fade:{start:645,full:672,first:0.35}
};

// Subtitles: two phrases over the first shot. Onsets in reference frames. Tracking (em) is
// fitted so the reference's own words reach the measured widths in the default font.
export const SUBTITLES={
 line1:{onsets:[2,16,26,36],fadeIn:3,out:[85,94],y:684,capPx:36,tracking:0.1,widthAt40:712,growPerFrame:3.06},
 line2:{onset:73,fadeIn:3,y:727,capPx:22,tracking:0.55},
 // Phrase 2 also grows: 83% of its frame-139 size at frame 112.
 phrase2:{onsets:[97,131],fadeIn:3,out:[140,144],y:719,capPx:30,tracking:0.48,growAnchor:139,growPerFrame:0.0063}
};
export const DEFAULT_TEXT={line1:['MOVE','WITH','ME','TONIGHT'],line2:'SLOW',phrase2:['SLOW','DOWN']};

// Reference frames are 30 fps; a Draft at another rate gets the same times in its own frames.
export function scenePlan(fps=30){
 if(!Number.isFinite(fps)||fps<10||fps>120)throw Error('Unsupported Draft frame rate');
 const at=f=>Math.round(f*fps/REF.fps);
 const segments=[];const cursor=Array(VIDEOS).fill(0); // seconds of source used per video
 for(const [i,[video,s,e,kind]] of SEGMENTS.entries()){
  const start=at(s),end=at(i===SEGMENTS.length-1?TAIL.end:e);
  const pieces=[];
  if(REPEAT_OF[i]!==undefined){
   const src=segments[REPEAT_OF[i]];const shift=start-src.startFrame;
   for(const p of src.pieces)pieces.push({...p,startFrame:p.startFrame+shift});
   // Rounding can make the repeat one frame longer or shorter at non-30 fps; the last piece absorbs it.
   const segLen=at(e)-start,sum=pieces.reduce((a,p)=>a+p.frames,0);pieces[pieces.length-1].frames+=segLen-sum;
   if(i===SEGMENTS.length-1){const tailFrames=end-at(e);const last=pieces[pieces.length-1];pieces.push({startFrame:at(e),frames:tailFrames,speed:1,inSec:+(last.inSec+last.frames/fps*last.speed).toFixed(4)});}
  }else if(kind==='plain'){
   pieces.push({startFrame:start,frames:end-start,speed:1,inSec:cursor[video]});
   cursor[video]+= (end-start)/fps;
  }else{
   // Back-to-back shots of the same video (block shots 5 and 6) skip 0.5 s of source,
   // otherwise the editor joins the two contiguous clips into one. In-points snap to
   // whole Draft frames (up to 4 source frames at speed 4), so a smaller gap can vanish.
   if(segments[i-1]?.video===video)cursor[video]+=0.5;
   const len=end-start;let t=start;
   for(let k=0;k<RAMP.speeds.length;k++){
    const pEnd=k===RAMP.speeds.length-1?end:start+Math.round(RAMP.bounds[k+1]*len);
    const frames=Math.max(1,pEnd-t);
    pieces.push({startFrame:t,frames,speed:RAMP.speeds[k],inSec:+cursor[video].toFixed(4)});
    cursor[video]+=frames/fps*RAMP.speeds[k];t+=frames;
   }
  }
  segments.push({index:i,video,kind,startFrame:start,endFrame:end,pieces});
 }
 // Seconds of footage each video must have (with a small safety margin).
 const need=Array(VIDEOS).fill(0);
 for(const s of segments)for(const p of s.pieces)need[s.video]=Math.max(need[s.video],p.inSec+p.frames/fps*p.speed);
 return {fps,canvas:REF.canvas,durationFrames:at(REF.durationFrames),segments,
  requiredSeconds:need.map(x=>+(x+0.2).toFixed(2)),
  cuts:CUTS.map(c=>({ref:c,frame:at(c),kind:c===411?'flash':'blur'}))};
}

// The bundled music, relative to the install folder, and its length in seconds (it also
// identifies an imported copy whose path the host spells differently).
export const MUSIC={file:['assets','music.mp3'],seconds:23.736};

// Clip effect: cover-crops the video to 3:4 around an editable focus and, on the
// frames around each blur cut, stacks vertically shifted blurred copies (a vertical
// motion blur). Times come from absolute timeline time, so rounded clip starts at any
// Draft frame rate still hit the reference's cut frames.
const EFFECT_CODE=`import {useCurrentFrame} from 'remotion';
export default function VelocityShot({Source,data}) {
 const g=data.g,frame=useCurrentFrame();
 // In a retimed clip the frame counter runs in source frames (speed x Draft frames).
 const t=(frame/data.speed+data.startFrame)/data.fps*30;
 let amt=0;
 for(const c of data.blurCuts){const k=Math.round(t-c);if(k>=-2&&k<=2)amt=Math.max(amt,data.profile[k+2]);}
 const x=Math.max(g.mw-g.w,Math.min(0,g.mw/2-data.focusX*g.w));
 const y=Math.max(g.mh-g.h,Math.min(0,g.mh/2-data.focusY*g.h));
 const box={position:'absolute',left:x,top:y,width:g.w,height:g.h};
 const layers=[];
 if(amt>0){const n=8,len=data.blurLength*amt*g.q,soft=data.blurSoft*amt*g.q;for(let i=0;i<n;i++){const dy=(i/(n-1)-0.5)*len;layers.push(<div key={i} style={{...box,top:y+dy,opacity:1/(i+1),filter:'blur('+soft+'px)'}}><Source /></div>);}}
 return <div style={{position:'absolute',inset:0}}><div style={{position:'absolute',left:g.left,top:g.top,width:g.mw,height:g.mh,overflow:'hidden'}}><div style={box}><Source /></div>{layers}</div></div>;
}`;
// Layer i uses opacity 1/(i+1) over the stack below it, so the n copies average equally.

const OVERLAY_CODE=`import {useCurrentFrame} from 'remotion';
export default function VelocityOverlay({data}) {
 const t=(useCurrentFrame()+data.startFrame)/data.fps*30;
 let a=0;
 if(data.kind==='flash'){const k=Math.round(t-data.flash.start);a=k>=0&&k<data.flash.alpha.length?data.flash.alpha[k]:0;}
 else{a=-(t<data.fade.start?0:t>=data.fade.full?1:data.fade.first+(1-data.fade.first)*(t-data.fade.start)/(data.fade.full-data.fade.start));} // fade is to black
 return <div style={{position:'absolute',inset:0,background:a>=0?'#fff':'#000',opacity:Math.abs(a)}}/>;
}`;

// Kinetic subtitles: words fade in one by one and the line slowly grows about the centre.
const SUBTITLE_CODE=`import {useCurrentFrame} from 'remotion';
export default function VelocitySubtitles({data}) {
 const t=(useCurrentFrame()+data.startFrame)/data.fps*30;
 const S=data.sub,W=data.width;
 // Words are flat editable parameters so they can be changed in the Draft.
 const line1=[data.w1,data.w2,data.w3,data.w4],line2=data.l2,phrase2=[data.p1,data.p2];
 const fin=(on,d)=>Math.max(0,Math.min(1,(t-on)/d));
 const fout=(o)=>t<=o[0]?1:t>=o[1]?0:1-(t-o[0])/(o[1]-o[0]);
 const font=(data.fontFamily||'Optima, Candara, "Segoe UI", sans-serif');
 const word={display:'inline-block',color:'#fff',fontFamily:font,fontWeight:400,textShadow:'0 0 10px rgba(255,255,255,0.55), 0 2px 6px rgba(0,0,0,0.75)',whiteSpace:'pre'};
 const l1=S.line1,scale=1+(t-40)*l1.growPerFrame/l1.widthAt40,o1=fout(l1.out);
 const size1=l1.capPx/0.7,size2=S.line2.capPx/0.7,size3=S.phrase2.capPx/0.7;
 const o3=fout(S.phrase2.out),scale3=1+(t-S.phrase2.growAnchor)*S.phrase2.growPerFrame;
 return <div style={{position:'absolute',inset:0,pointerEvents:'none'}}>
  {t<l1.out[1]&&<div style={{position:'absolute',left:0,width:W,top:l1.y-size1/2,textAlign:'center',fontSize:size1,transform:'scale('+scale+')',transformOrigin:(W/2)+'px '+(size1/2)+'px',opacity:o1}}>
   {line1.map((w,i)=><span key={i} style={{...word,letterSpacing:l1.tracking+'em',opacity:fin(l1.onsets[i],l1.fadeIn)}}>{w+(i<line1.length-1?' ':'')}</span>)}
   <div style={{fontSize:size2,marginTop:4}}><span style={{...word,letterSpacing:S.line2.tracking+'em',opacity:fin(S.line2.onset,S.line2.fadeIn)}}>{line2}</span></div>
  </div>}
  {t>=S.phrase2.onsets[0]&&t<S.phrase2.out[1]&&<div style={{position:'absolute',left:0,width:W,top:S.phrase2.y-size3/2,textAlign:'center',fontSize:size3,transform:'scale('+scale3+')',transformOrigin:(W/2)+'px '+(size3/2)+'px',opacity:o3}}>
   {phrase2.map((w,i)=><span key={i} style={{...word,letterSpacing:S.phrase2.tracking+'em',opacity:fin(S.phrase2.onsets[i],S.phrase2.fadeIn)}}>{w+(i<phrase2.length-1?' ':'')}</span>)}
  </div>}
 </div>;
}`;

const clean=(value,label,max=1000)=>{if(typeof value!=='string'||!value.trim()||value!==value.trim()||value.length>max||/[\u0000-\u001f]/u.test(value))throw Error(label+' is required');return value;};
const cleanWord=(w,label)=>{if(typeof w!=='string'||w.length>24||/[\u0000-\u001f]/u.test(w))throw Error(label+' must be up to 24 characters');return w.trim().toUpperCase();};

export function normalizeFinish(raw){
 const keys=['mode','projectId','draftId','fps','videos','tracks','clips','framing','musicResourceId','text','fontFamily'];
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!keys.includes(k))||raw.mode!=='finish')throw Error('Unsupported request');
 const projectId=clean(raw.projectId,'Project ID'),draftId=clean(raw.draftId,'Draft ID',120),musicResourceId=clean(raw.musicResourceId,'Music Resource ID');
 if(!Array.isArray(raw.videos)||raw.videos.length!==VIDEOS)throw Error('Choose exactly '+VIDEOS+' videos');
 const videos=raw.videos.map(v=>{
  if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!['resourceId','width','height'].includes(k)))throw Error('Invalid video Resource');
  if(!Number.isSafeInteger(v.width)||v.width<1||!Number.isSafeInteger(v.height)||v.height<1)throw Error('Invalid video dimensions');
  return {resourceId:clean(v.resourceId,'Video Resource ID'),width:v.width,height:v.height};
 });
 const inF=raw.framing??[];if(!Array.isArray(inF)||inF.length>VIDEOS)throw Error('Invalid framing');
 const framing=Array.from({length:VIDEOS},(_,i)=>{const p=inF[i]??{},x=p.x??.5,y=p.y??.5;if(!Number.isFinite(x)||x<0||x>1||!Number.isFinite(y)||y<0||y>1)throw Error('Framing must be between 0 and 1');return {x,y};});
 const tx=raw.text??DEFAULT_TEXT;
 if(!tx||!Array.isArray(tx.line1)||tx.line1.length!==4||!Array.isArray(tx.phrase2)||tx.phrase2.length!==2)throw Error('Subtitle text needs 4 words, 1 word and 2 words');
 const text={line1:tx.line1.map((w,i)=>cleanWord(w,'Word '+(i+1))),line2:cleanWord(tx.line2??'','Line 2'),phrase2:tx.phrase2.map((w,i)=>cleanWord(w,'Second phrase word '+(i+1)))};
 const fontFamily=typeof raw.fontFamily==='string'&&raw.fontFamily.length<=200&&!/[<>{}\u0000-\u001f]/u.test(raw.fontFamily)?raw.fontFamily.trim():'';
 const plan=scenePlan(raw.fps??30);
 // Placements arrive compact (the finishing script carries them inline): one [clipId, trackIndex]
 // per planned piece, in plan order. Frames come from the plan; authorFinish then checks
 // the Draft's real clips against them before editing.
 const expected=plan.segments.flatMap(s=>s.pieces.map(p=>({video:s.video,startFrame:p.startFrame,endFrame:p.startFrame+p.frames,speed:p.speed})));
 if(!Array.isArray(raw.tracks)||!raw.tracks.length||raw.tracks.length>expected.length||raw.tracks.some(t=>typeof t!=='string'||!t||t.length>120))throw Error('Invalid track list');
 if(!Array.isArray(raw.clips)||raw.clips.length!==expected.length)throw Error('Expected '+expected.length+' video pieces');
 const placements=raw.clips.map((row,i)=>{if(!Array.isArray(row)||row.length!==2||!Number.isSafeInteger(row[0])||!Number.isSafeInteger(row[1])||!raw.tracks[row[1]])throw Error('Invalid video piece '+(i+1));return {...expected[i],clipId:row[0],trackId:raw.tracks[row[1]]};});
 if(new Set(placements.map(p=>p.clipId)).size!==placements.length)throw Error('Video pieces must be independent clips');
 return {projectId,draftId,fps:plan.fps,videos,framing,musicResourceId,text,fontFamily,placements};
}

export const authorFinishSource=String.raw`async function authorFinish(selects,input,plan,look,subs,codes){
 let commitStarted=false,stage='read';
 try{
  const project=selects.project(input.projectId),d=selects.draft(input.draftId);
  if(!(await project.meta()).draftIds?.includes(input.draftId))throw Error('Draft is not in the selected Project');
  const meta=await d.meta();
  if(meta.fps!==plan.fps||meta.durationFrames!==plan.durationFrames||meta.frameSize?.width!==plan.canvas.width||meta.frameSize?.height!==plan.canvas.height)throw Error('Draft frame grid changed');
  const types=new Map((await project.resources()).map(r=>[r.resourceId,r.type]));
  if(types.get(input.musicResourceId)!=='Audio')throw Error('Music is not an Audio resource');
  const rows=await d.clips({trackScope:'all'});
  for(const [i,p] of input.placements.entries()){
   const c=rows.find(r=>r.clipId===p.clipId&&r.trackId===p.trackId);
   if(!c||c.startFrame!==p.startFrame||c.endFrame!==p.endFrame||c.resourceId!==input.videos[p.video].resourceId||types.get(c.resourceId)!=='Video')throw Error('Video piece readback differs from the plan (piece '+(i+1)+')');
  }
  const W=plan.canvas.width,H=plan.canvas.height;
  const blurCuts=plan.cuts.filter(c=>c.kind==='blur').map(c=>c.ref);
  for(const [i,p] of input.placements.entries()){
   const v=input.videos[p.video],w=v.width,h=v.height;
   const clip=(await d.clips({trackScope:'all'})).find(r=>r.clipId===p.clipId&&r.trackId===p.trackId);
   if(!clip)throw Error('Video piece changed during authoring');
   const q=Math.min(w/W,h/H),c=Math.min(W/w,H/h);
   const g={w,h,q,mw:W*q,mh:H*q,left:(w-W*q)/2,top:(h-H*q)/2};
   stage='transform piece '+(i+1);
   await d.setClipTransform({clip,enabled:true,scale:{x:1/(q*c),y:1/(q*c)},position:{x:0,y:0},anchor:{x:0,y:0},rotation:0});
   const cur=(await d.clips({trackScope:'all'})).find(r=>r.clipId===clip.clipId&&r.trackId===clip.trackId);
   const f=input.framing[p.video];
   stage='effect piece '+(i+1);
   await d.addVideoEffect({clip:cur,label:'Video '+(p.video+1)+' shot',tsxCode:codes.effect,parameters:{g,fps:plan.fps,startFrame:p.startFrame,speed:p.speed,blurCuts,profile:look.blurProfile,blurLength:look.blurLength,blurSoft:look.blurSoft,focusX:f.x,focusY:f.y},editableParameters:[{key:'focusX',label:'Horizontal focus',type:'number',defaultValue:f.x,min:0,max:1,step:.01},{key:'focusY',label:'Vertical focus',type:'number',defaultValue:f.y,min:0,max:1,step:.01}]});
  }
  const at=f=>Math.round(f*plan.fps/30);
  stage='subtitles';
  const t=input.text,words={w1:t.line1[0],w2:t.line1[1],w3:t.line1[2],w4:t.line1[3],l2:t.line2,p1:t.phrase2[0],p2:t.phrase2[1]};
  // Inline literals: run_script type-checks them against the editable parameter union.
  await d.addMotionGraphic({label:'Velocity subtitles',within:await d.rangeAtFrames(0,at(150)),tsxCode:codes.subtitles,parameters:{fps:plan.fps,startFrame:0,width:W,sub:subs,...words,fontFamily:input.fontFamily},editableParameters:[{key:'w1',label:'Line 1, word 1',type:'text',defaultValue:words.w1},{key:'w2',label:'Line 1, word 2',type:'text',defaultValue:words.w2},{key:'w3',label:'Line 1, word 3',type:'text',defaultValue:words.w3},{key:'w4',label:'Line 1, word 4',type:'text',defaultValue:words.w4},{key:'l2',label:'Line 2',type:'text',defaultValue:words.l2},{key:'p1',label:'Phrase 2, word 1',type:'text',defaultValue:words.p1},{key:'p2',label:'Phrase 2, word 2',type:'text',defaultValue:words.p2},{key:'fontFamily',label:'Font',type:'text',defaultValue:input.fontFamily}]});
  stage='flash';
  await d.addMotionGraphic({label:'Velocity flash',within:await d.rangeAtFrames(at(look.flash.start),at(look.flash.start+look.flash.alpha.length)),tsxCode:codes.overlay,parameters:{kind:'flash',fps:plan.fps,startFrame:at(look.flash.start),flash:look.flash,fade:look.fade}});
  stage='fade';
  await d.addMotionGraphic({label:'Velocity fade',within:await d.rangeAtFrames(at(look.fade.start),plan.durationFrames),tsxCode:codes.overlay,parameters:{kind:'fade',fps:plan.fps,startFrame:at(look.fade.start),flash:look.flash,fade:look.fade}});
  stage='music';
  await d.overlayResource({resource:project.resource(input.musicResourceId),over:await d.rangeAtFrames(0,plan.durationFrames)});
  commitStarted=true;const saved=await d.commitAll('Finish Six Clip Velocity Draft');
  if(!saved?.commitId)throw Error('Draft save response did not include its commit ID');
  return {status:'saved',projectId:input.projectId,draftId:input.draftId,pieces:input.placements.length};
 }catch(error){return {status:commitStarted?'outcomeUnknown':'notSaved',stage,message:String(error?.message||error),draftId:input?.draftId};}
}`;

export function buildFinishScript(raw){
 const input=normalizeFinish(raw);
 return `const input=${JSON.stringify(input)};const plan=${JSON.stringify(scenePlan(input.fps))};return await (${authorFinishSource})(selects,input,plan,${JSON.stringify(LOOK)},${JSON.stringify(SUBTITLES)},${JSON.stringify({effect:EFFECT_CODE,overlay:OVERLAY_CODE,subtitles:SUBTITLE_CODE})});`;
}
// @operation-end

const INVENTORY=`const p=selects.project(PROJECT_ID);const resources=await p.resources();const types=new Map(resources.map(r=>[r.resourceId,r.type]));const nodes=[];const walk=tree=>{for(const n of tree||[])n.type==='dir'?walk(n.children):nodes.push(n)};const view=await p.sourceFiles();if('fileTree' in view)walk(view.fileTree);else if('folders' in view)for(const folder of view.folders){const detail=await p.sourceFiles({folder:folder.name});if('fileTree' in detail)walk(detail.fileTree)}return nodes.filter(n=>n.path&&types.has(n.resourceId)).map(n=>({resourceId:n.resourceId,type:types.get(n.resourceId),name:n.name,path:n.path,seconds:n.durationSeconds??null}));`;
async function inventory(sdk,projectId,summary){
 const r=await readMediaPages(sdk, {script:INVENTORY.replace('PROJECT_ID',JSON.stringify(projectId)),summary,allowCommit:false});
 if(r.isError||!Array.isArray(r.result))throw Error(r.output||'Could not read the Project files.');
 return r.result;
}

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

// native-sdk:start
// Read verified Project resources and place editable images through the Draft working copy.
async function nativeVideoSources(selects, projectId, photos) {
 const project=selects.project(projectId), resources=await project.resources(), nodes=[];
 const visit=items=>{for(const item of items||[])item.type==='dir'?visit(item.children):nodes.push(item);};
 const overview=await project.sourceFiles();
 if(Array.isArray(overview.fileTree))visit(overview.fileTree);
 else for(const folder of overview.folders||[])visit((await project.sourceFiles({folder:folder.name})).fileTree);
 return photos.map(photo=>{
  const matches=nodes.filter(node=>node.path===photo.path&&resources.some(resource=>resource.resourceId===node.resourceId&&resource.type==='Video'));
  if(matches.length!==1)throw Error('A selected Video is missing or ambiguous in the Project: '+photo.name);
  const row=matches[0],size=row.frameSize;
  if(!Number.isSafeInteger(size?.width)||size.width<1||!Number.isSafeInteger(size?.height)||size.height<1)throw Error('A selected Video has no verified native dimensions: '+photo.name);
  return {resourceId:row.resourceId,path:row.path,name:photo.name,width:size.width,height:size.height};
 });
}
async function nativeVideoRun(sdk,script,summary,allowCommit=false) {
 const response=await sdk.runScript({script,summary,allowCommit,timeoutSeconds:120});
 if(response.isError||response.result==null)throw Error(response.output||'Video placement could not be confirmed. Inspect the Draft before retrying.');
 return response.result;
}
export async function prepareVideos(sdk,projectId,photos,knownLibraryId=null) {
 const sources=await nativeVideoRun(sdk,`return await (${nativeVideoSources.toString()})(selects,${JSON.stringify(projectId)},${JSON.stringify(photos)});`,'Verify original Project Videos');
 return {sdk,projectId,sources};
}
async function nativeVideoPlacement(selects,input) {
 const {projectId,draftId,plan,items,sources}=input,project=selects.project(projectId),draft=selects.draft(draftId);
 if(!(await project.meta()).draftIds.includes(draftId))throw Error('The Draft is not owned by the selected Project.');
 const meta=await draft.meta();
 if(meta.fps!==plan.fps||meta.durationFrames!==plan.durationFrames||(plan.canvas&&(meta.frameSize.width!==plan.canvas.width||meta.frameSize.height!==plan.canvas.height)))throw Error('The Draft frame grid differs from the plan.');
 const fresh=await nativeVideoSources(selects,projectId,sources);
 if(fresh.some((source,index)=>source.resourceId!==sources[index].resourceId||source.width!==sources[index].width||source.height!==sources[index].height))throw Error('A selected Video changed. Prepare the Videos again.');
 const placements=[];
 for(const item of items){
  const source=fresh[item.source];
  if(!source)throw Error('An Video occurrence has no source.');
  const before=new Set((await draft.clips({trackScope:'all'})).map(clip=>clip.clipId));
  await draft.overlayResource({resource:project.resource(source.resourceId),over:await draft.rangeAtFrames(item.startFrame,item.endFrame),sourceStartSeconds:item.inSec,playbackSpeed:{numerator:Math.round(item.speed*100),denominator:100}});
  const added=(await draft.clips({trackScope:'all'})).filter(clip=>!before.has(clip.clipId));
  if(added.length!==1||added[0].resourceId!==source.resourceId||added[0].startFrame!==item.startFrame||added[0].endFrame!==item.endFrame)throw Error('The Video interval changed during placement.');
  placements.push({...item,clipId:added[0].clipId,trackId:added[0].trackId});
 }
 if((await draft.meta()).durationFrames!==plan.durationFrames)throw Error('Video placement changed the Draft duration.');
 await draft.commitAll('Place original editable Videos');
 return {placements,videos:fresh.map(source=>({width:source.width,height:source.height})),status:'committed'};
}
export async function placeVideos(prepared,draftId,plan,items,label) {
 const {sdk,projectId,sources}=prepared;
 items=plan.segments.flatMap(segment=>segment.pieces.map(piece=>({source:segment.video,video:segment.video,startFrame:piece.startFrame,endFrame:piece.startFrame+piece.frames,inSec:piece.inSec,speed:piece.speed})));
 const input={projectId,draftId,plan,items,sources};
 const result=await nativeVideoRun(sdk,`const nativeVideoSources=${nativeVideoSources.toString()};return await (${nativeVideoPlacement.toString()})(selects,${JSON.stringify(input)});`,'Place original editable Videos',true);
 // A separate script reads persisted state, rather than verifying the same working copy.
 await nativeVideoRun(sdk,`const d=selects.draft(${JSON.stringify(draftId)}),clips=await d.clips({trackScope:'all'});for(const expected of ${JSON.stringify(result.placements)}){const actual=clips.find(c=>c.clipId===expected.clipId);if(!actual||actual.trackId!==expected.trackId||actual.startFrame!==expected.startFrame||actual.endFrame!==expected.endFrame)throw Error('Saved Video placement could not be read back.');}if((await d.meta()).durationFrames!==${JSON.stringify(plan.durationFrames)})throw Error('Saved Video Draft duration changed.');return {ok:true};`,'Verify saved Video placement');
 return result;
}
// native-sdk:end

// Host paths compare normalised: Unicode NFC (macOS may store a name decomposed), backslashes as
// slashes, and case-folded on Windows (drive letters and the host's own spelling).
const normPath=s=>{const v=String(s||'').normalize('NFC').replace(/\\/g,'/');return hostIsWindows()?v.toLowerCase():v;};
const baseName=s=>normPath(s).split('/').pop();
// The bundled music in this Project: the same path, else an Audio file of the same name and
// length (a user's own file that only shares the name is never taken for it).
const findMusic=(rows,file)=>rows.find(r=>r.type==='Audio'&&normPath(r.path)===normPath(file))
 ||rows.find(r=>r.type==='Audio'&&baseName(r.path)===baseName(file)&&typeof r.seconds==='number'&&Math.abs(r.seconds-MUSIC.seconds)<=0.5);
async function ensureMusic(sdk,projectId){
  hostUseSdk(sdk);
 hostNeed('FileSystem','exists');
 const {plugin}=await hostRoots(sdk,'six-clip-velocity',MUSIC.file.join('/'));
 const file=hostJoin(plugin,...MUSIC.file);
 let rows=await inventory(sdk,projectId,'Find bundled music');
 if(!findMusic(rows,file)){
  const r=await sdk.runScript({script:`return await selects.project(${JSON.stringify(projectId)}).importFiles({paths:${JSON.stringify([file])}});`,summary:'Import velocity music',allowCommit:true});
  if(r.isError)throw Error(r.output||'Could not import the music.');
  rows=await inventory(sdk,projectId,'Confirm bundled music');
 }
 const m=findMusic(rows,file);
 if(!m)throw Error('The music is not ready in the Project yet. Try again in a moment.');
 return m.resourceId;
}

// Each piece travels as [clipId, trackIndex], so the finishing script stays small.
const compactPlacements=placements=>{const tracks=[...new Set(placements.map(p=>p.trackId))];return {tracks,clips:placements.map(p=>[p.clipId,tracks.indexOf(p.trackId)])};};
const ROLE=['Opening shot, 8 s or longer (subtitles play over it)','Second shot','Shot 3','Shot 4','Shot 5','Shot 6'];
const STRINGS={"en":{"intro":"Six videos become a 23-second 3:4 velocity edit with speed ramps, vertical blur cuts, a white flash, kinetic subtitles, a repeated block and a fade to black. Music is included.","noProject":"Open a Project first.","load":"Load Project videos","loading":"Loading project videos\u2026","ready":"Check the order and length of videos 1\u20136.","some":"This Project has {n} videos. The format needs 6; import more or choose one twice on purpose.","none":"This Project has no videos. Import videos first.","checking":"Checking videos\u2026","addingMusic":"Adding music to the Project\u2026","creating":"Creating the Draft\u2026","placing":"Placing and retiming {n} video pieces\u2026","finishing":"Adding blur cuts, subtitles, flash, fade and music\u2026","saved":"Saved. Each velocity piece is an editable clip; adjust framing in clip effects and the font in the subtitle graphic.","partial":" The partial Draft will be checked before continuing.","choose":"Choose video","needs":"Needs at least {s} s of footage.","subtitle":"Subtitle words (optional)","lineWord":"Line 1, word {n}","line2":"Line 2","phraseWord":"Second phrase, word {n}","draftName":"Draft name","continue":"Inspect and continue partial Draft","another":"Create another Draft","create":"Create Draft","open":"Open saved Draft","roles":["Opening shot, 8 s or longer (with subtitles)","Second shot","Shot 3","Shot 4","Shot 5","Shot 6"],"summary":"Turn six videos into an editable 23-second velocity edit with speed ramps, vertical blur cuts, a white flash, kinetic subtitles, a fade to black and bundled music.","hostTooOld":"Six Clip Velocity needs a newer version of Selects. Update Selects, then open this panel again.","musicMissing":"The bundled music was not found. Reinstall Six Clip Velocity from the plugin library."},"de":{"intro":"Sechs Videos werden zu einem 23-sek\u00fcndigen 3:4-Velocity-Schnitt mit Speed Ramps, vertikalen Blur-\u00dcberg\u00e4ngen, wei\u00dfem Blitz, kinetischen Untertiteln, Wiederholung und Schwarzblende. Musik ist enthalten.","noProject":"\u00d6ffne zuerst ein Projekt.","load":"Projektvideos laden","loading":"Projektvideos werden geladen\u2026","ready":"Pr\u00fcfe Reihenfolge und L\u00e4nge der Videos 1\u20136.","some":"Dieses Projekt enth\u00e4lt {n} Videos. Das Format ben\u00f6tigt 6; importiere weitere oder w\u00e4hle bewusst eines doppelt.","none":"Dieses Projekt enth\u00e4lt keine Videos. Importiere zuerst Videos.","checking":"Videos werden gepr\u00fcft\u2026","addingMusic":"Musik wird dem Projekt hinzugef\u00fcgt\u2026","creating":"Entwurf wird erstellt\u2026","placing":"{n} Videoteile werden platziert und retimed\u2026","finishing":"Blur-\u00dcberg\u00e4nge, Untertitel, Blitz, Blende und Musik werden hinzugef\u00fcgt\u2026","saved":"Gespeichert. Jeder Velocity-Abschnitt ist ein editierbarer Clip; passe Bildausschnitt und Untertitelschrift an.","partial":" Der teilweise erstellte Entwurf wird vor dem Fortsetzen gepr\u00fcft.","choose":"Video ausw\u00e4hlen","needs":"Mindestens {s} s Material erforderlich.","subtitle":"Untertitelw\u00f6rter (optional)","lineWord":"Zeile 1, Wort {n}","line2":"Zeile 2","phraseWord":"Zweite Phrase, Wort {n}","draftName":"Entwurfsname","continue":"Teilweisen Entwurf pr\u00fcfen und fortsetzen","another":"Weiteren Entwurf erstellen","create":"Entwurf erstellen","open":"Gespeicherten Entwurf \u00f6ffnen","roles":["Er\u00f6ffnung, mindestens 8 s (mit Untertiteln)","Zweite Einstellung","Einstellung 3","Einstellung 4","Einstellung 5","Einstellung 6"],"summary":"Verwandelt sechs Videos in einen editierbaren 23-Sekunden-Velocity-Schnitt mit Speed Ramps, vertikalen Blur-\u00dcberg\u00e4ngen, wei\u00dfem Blitz, kinetischen Untertiteln, Schwarzblende und Musik.","hostTooOld":"Six Clip Velocity braucht eine neuere Version von Selects. Aktualisiere Selects und \u00f6ffne dieses Panel dann erneut.","musicMissing":"Die mitgelieferte Musik wurde nicht gefunden. Installiere Six Clip Velocity aus der Plugin-Bibliothek neu."},"es":{"intro":"Seis v\u00eddeos se convierten en un montaje de velocidad 3:4 de 23 segundos con rampas, cortes de desenfoque vertical, destello blanco, subt\u00edtulos cin\u00e9ticos, repetici\u00f3n y fundido a negro. Incluye m\u00fasica.","noProject":"Abre primero un proyecto.","load":"Cargar v\u00eddeos del proyecto","loading":"Cargando v\u00eddeos del proyecto\u2026","ready":"Comprueba el orden y la duraci\u00f3n de los v\u00eddeos 1\u20136.","some":"Este proyecto tiene {n} v\u00eddeos. El formato necesita 6; importa m\u00e1s o elige uno dos veces a prop\u00f3sito.","none":"Este proyecto no tiene v\u00eddeos. Importa v\u00eddeos primero.","checking":"Comprobando v\u00eddeos\u2026","addingMusic":"A\u00f1adiendo m\u00fasica al proyecto\u2026","creating":"Creando el borrador\u2026","placing":"Colocando y ajustando {n} fragmentos\u2026","finishing":"A\u00f1adiendo cortes desenfocados, subt\u00edtulos, destello, fundido y m\u00fasica\u2026","saved":"Guardado. Cada fragmento es un clip editable; ajusta el encuadre y la fuente de los subt\u00edtulos.","partial":" El borrador parcial se comprobar\u00e1 antes de continuar.","choose":"Elegir v\u00eddeo","needs":"Necesita al menos {s} s de material.","subtitle":"Palabras de subt\u00edtulos (opcional)","lineWord":"L\u00ednea 1, palabra {n}","line2":"L\u00ednea 2","phraseWord":"Segunda frase, palabra {n}","draftName":"Nombre del borrador","continue":"Revisar y continuar el borrador parcial","another":"Crear otro borrador","create":"Crear borrador","open":"Abrir borrador guardado","roles":["Toma inicial, 8 s o m\u00e1s (con subt\u00edtulos)","Segunda toma","Toma 3","Toma 4","Toma 5","Toma 6"],"summary":"Convierte seis v\u00eddeos en un montaje de velocidad editable de 23 segundos con rampas, cortes de desenfoque vertical, destello blanco, subt\u00edtulos cin\u00e9ticos, fundido a negro y m\u00fasica.","hostTooOld":"Six Clip Velocity necesita una versi\u00f3n m\u00e1s reciente de Selects. Actualiza Selects y vuelve a abrir este panel.","musicMissing":"No se encontr\u00f3 la m\u00fasica incluida. Reinstala Six Clip Velocity desde la biblioteca de plugins."},"fr":{"intro":"Six vid\u00e9os deviennent un montage de vitesse 3:4 de 23 secondes avec acc\u00e9l\u00e9rations, coupes en flou vertical, flash blanc, sous-titres cin\u00e9tiques, r\u00e9p\u00e9tition et fondu au noir. Musique incluse.","noProject":"Ouvrez d\u2019abord un projet.","load":"Charger les vid\u00e9os du projet","loading":"Chargement des vid\u00e9os du projet\u2026","ready":"V\u00e9rifiez l\u2019ordre et la dur\u00e9e des vid\u00e9os 1 \u00e0 6.","some":"Ce projet contient {n} vid\u00e9os. Le format en demande 6 ; importez-en d\u2019autres ou choisissez-en une deux fois.","none":"Ce projet ne contient aucune vid\u00e9o. Importez d\u2019abord des vid\u00e9os.","checking":"V\u00e9rification des vid\u00e9os\u2026","addingMusic":"Ajout de la musique au projet\u2026","creating":"Cr\u00e9ation du brouillon\u2026","placing":"Placement et changement de vitesse de {n} segments\u2026","finishing":"Ajout des coupes floues, sous-titres, flash, fondu et musique\u2026","saved":"Enregistr\u00e9. Chaque segment est un clip modifiable ; ajustez le cadrage et la police des sous-titres.","partial":" Le brouillon partiel sera v\u00e9rifi\u00e9 avant de continuer.","choose":"Choisir une vid\u00e9o","needs":"N\u00e9cessite au moins {s} s de vid\u00e9o.","subtitle":"Mots des sous-titres (facultatif)","lineWord":"Ligne 1, mot {n}","line2":"Ligne 2","phraseWord":"Deuxi\u00e8me phrase, mot {n}","draftName":"Nom du brouillon","continue":"V\u00e9rifier et continuer le brouillon partiel","another":"Cr\u00e9er un autre brouillon","create":"Cr\u00e9er un brouillon","open":"Ouvrir le brouillon enregistr\u00e9","roles":["Plan d\u2019ouverture, 8 s ou plus (avec sous-titres)","Deuxi\u00e8me plan","Plan 3","Plan 4","Plan 5","Plan 6"],"summary":"Transforme six vid\u00e9os en un montage de vitesse modifiable de 23 secondes avec acc\u00e9l\u00e9rations, flou vertical, flash blanc, sous-titres cin\u00e9tiques, fondu au noir et musique.","hostTooOld":"Six Clip Velocity n\u00e9cessite une version plus r\u00e9cente de Selects. Mettez Selects \u00e0 jour, puis rouvrez ce panneau.","musicMissing":"La musique fournie est introuvable. R\u00e9installez Six Clip Velocity depuis la biblioth\u00e8que de plugins."},"it":{"intro":"Sei video diventano un montaggio velocity 3:4 di 23 secondi con rampe di velocit\u00e0, stacchi sfocati verticali, flash bianco, sottotitoli cinetici, ripetizione e dissolvenza al nero. Musica inclusa.","noProject":"Apri prima un progetto.","load":"Carica i video del progetto","loading":"Caricamento dei video del progetto\u2026","ready":"Controlla ordine e durata dei video 1\u20136.","some":"Questo progetto contiene {n} video. Il formato ne richiede 6; importane altri o scegline uno due volte.","none":"Questo progetto non contiene video. Importa prima dei video.","checking":"Controllo dei video\u2026","addingMusic":"Aggiunta della musica al progetto\u2026","creating":"Creazione della bozza\u2026","placing":"Posizionamento e cambio velocit\u00e0 di {n} segmenti\u2026","finishing":"Aggiunta di stacchi sfocati, sottotitoli, flash, dissolvenza e musica\u2026","saved":"Salvato. Ogni segmento \u00e8 una clip modificabile; regola inquadratura e carattere dei sottotitoli.","partial":" La bozza parziale verr\u00e0 controllata prima di continuare.","choose":"Scegli video","needs":"Servono almeno {s} s di ripresa.","subtitle":"Parole dei sottotitoli (facoltative)","lineWord":"Riga 1, parola {n}","line2":"Riga 2","phraseWord":"Seconda frase, parola {n}","draftName":"Nome bozza","continue":"Controlla e continua la bozza parziale","another":"Crea un\u2019altra bozza","create":"Crea bozza","open":"Apri la bozza salvata","roles":["Inquadratura iniziale, almeno 8 s (con sottotitoli)","Seconda inquadratura","Inquadratura 3","Inquadratura 4","Inquadratura 5","Inquadratura 6"],"summary":"Trasforma sei video in un montaggio velocity modificabile di 23 secondi con rampe di velocit\u00e0, sfocature verticali, flash bianco, sottotitoli cinetici, dissolvenza al nero e musica.","hostTooOld":"Six Clip Velocity richiede una versione pi\u00f9 recente di Selects. Aggiorna Selects, poi riapri questo pannello.","musicMissing":"La musica inclusa non \u00e8 stata trovata. Reinstalla Six Clip Velocity dalla libreria dei plugin."},"ja":{"intro":"6\u672c\u306e\u52d5\u753b\u309223\u79d2\u306e3:4\u30d9\u30ed\u30b7\u30c6\u30a3\u7de8\u96c6\u306b\u3057\u307e\u3059\u3002\u30b9\u30d4\u30fc\u30c9\u30e9\u30f3\u30d7\u3001\u7e26\u65b9\u5411\u306e\u30d6\u30e9\u30fc\u5207\u308a\u66ff\u3048\u3001\u767d\u30d5\u30e9\u30c3\u30b7\u30e5\u3001\u52d5\u304f\u5b57\u5e55\u3001\u53cd\u5fa9\u3001\u9ed2\u3078\u306e\u30d5\u30a7\u30fc\u30c9\u3001\u97f3\u697d\u3092\u542b\u307f\u307e\u3059\u3002","noProject":"\u5148\u306b\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u3092\u958b\u3044\u3066\u304f\u3060\u3055\u3044\u3002","load":"\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u52d5\u753b\u3092\u8aad\u307f\u8fbc\u3080","loading":"\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u52d5\u753b\u3092\u8aad\u307f\u8fbc\u307f\u4e2d\u2026","ready":"\u52d5\u753b1\u301c6\u306e\u9806\u756a\u3068\u9577\u3055\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002","some":"\u3053\u306e\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u306b\u306f\u52d5\u753b\u304c{n}\u672c\u3042\u308a\u307e\u3059\u30026\u672c\u5fc5\u8981\u3067\u3059\u3002\u8ffd\u52a0\u3059\u308b\u304b\u3001\u610f\u56f3\u7684\u306b\u540c\u3058\u52d5\u753b\u30922\u56de\u9078\u3093\u3067\u304f\u3060\u3055\u3044\u3002","none":"\u3053\u306e\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u306b\u306f\u52d5\u753b\u304c\u3042\u308a\u307e\u305b\u3093\u3002\u5148\u306b\u8aad\u307f\u8fbc\u3093\u3067\u304f\u3060\u3055\u3044\u3002","checking":"\u52d5\u753b\u3092\u78ba\u8a8d\u4e2d\u2026","addingMusic":"\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u306b\u97f3\u697d\u3092\u8ffd\u52a0\u4e2d\u2026","creating":"\u30c9\u30e9\u30d5\u30c8\u3092\u4f5c\u6210\u4e2d\u2026","placing":"{n}\u500b\u306e\u52d5\u753b\u30d1\u30fc\u30c4\u3092\u914d\u7f6e\u3057\u3066\u901f\u5ea6\u3092\u8abf\u6574\u4e2d\u2026","finishing":"\u30d6\u30e9\u30fc\u3001\u5b57\u5e55\u3001\u30d5\u30e9\u30c3\u30b7\u30e5\u3001\u30d5\u30a7\u30fc\u30c9\u3001\u97f3\u697d\u3092\u8ffd\u52a0\u4e2d\u2026","saved":"\u4fdd\u5b58\u3057\u307e\u3057\u305f\u3002\u5404\u533a\u9593\u306f\u7de8\u96c6\u53ef\u80fd\u306a\u30af\u30ea\u30c3\u30d7\u3067\u3059\u3002\u753b\u89d2\u3068\u5b57\u5e55\u30d5\u30a9\u30f3\u30c8\u3092\u8abf\u6574\u3067\u304d\u307e\u3059\u3002","partial":" \u7d9a\u884c\u524d\u306b\u9014\u4e2d\u306e\u30c9\u30e9\u30d5\u30c8\u3092\u78ba\u8a8d\u3057\u307e\u3059\u3002","choose":"\u52d5\u753b\u3092\u9078\u629e","needs":"\u5c11\u306a\u304f\u3068\u3082{s}\u79d2\u306e\u6620\u50cf\u304c\u5fc5\u8981\u3067\u3059\u3002","subtitle":"\u5b57\u5e55\u306e\u5358\u8a9e\uff08\u4efb\u610f\uff09","lineWord":"1\u884c\u76ee\u3001\u5358\u8a9e{n}","line2":"2\u884c\u76ee","phraseWord":"2\u3064\u76ee\u306e\u30d5\u30ec\u30fc\u30ba\u3001\u5358\u8a9e{n}","draftName":"\u30c9\u30e9\u30d5\u30c8\u540d","continue":"\u9014\u4e2d\u306e\u30c9\u30e9\u30d5\u30c8\u3092\u78ba\u8a8d\u3057\u3066\u7d9a\u884c","another":"\u5225\u306e\u30c9\u30e9\u30d5\u30c8\u3092\u4f5c\u6210","create":"\u30c9\u30e9\u30d5\u30c8\u3092\u4f5c\u6210","open":"\u4fdd\u5b58\u3057\u305f\u30c9\u30e9\u30d5\u30c8\u3092\u958b\u304f","roles":["\u5192\u982d\u30b7\u30e7\u30c3\u30c8\u30018\u79d2\u4ee5\u4e0a\uff08\u5b57\u5e55\u3042\u308a\uff09","2\u756a\u76ee\u306e\u30b7\u30e7\u30c3\u30c8","\u30b7\u30e7\u30c3\u30c83","\u30b7\u30e7\u30c3\u30c84","\u30b7\u30e7\u30c3\u30c85","\u30b7\u30e7\u30c3\u30c86"],"summary":"6\u672c\u306e\u52d5\u753b\u3092\u3001\u30b9\u30d4\u30fc\u30c9\u30e9\u30f3\u30d7\u3001\u7e26\u30d6\u30e9\u30fc\u3001\u767d\u30d5\u30e9\u30c3\u30b7\u30e5\u3001\u52d5\u304f\u5b57\u5e55\u3001\u9ed2\u3078\u306e\u30d5\u30a7\u30fc\u30c9\u3001\u97f3\u697d\u3092\u5099\u3048\u305f\u7de8\u96c6\u53ef\u80fd\u306a23\u79d2\u306e\u30d9\u30ed\u30b7\u30c6\u30a3\u7de8\u96c6\u306b\u3057\u307e\u3059\u3002","hostTooOld":"Six Clip Velocity \u306b\u306f\u65b0\u3057\u3044\u30d0\u30fc\u30b8\u30e7\u30f3\u306e Selects \u304c\u5fc5\u8981\u3067\u3059\u3002Selects \u3092\u30a2\u30c3\u30d7\u30c7\u30fc\u30c8\u3057\u3066\u304b\u3089\u3001\u3053\u306e\u30d1\u30cd\u30eb\u3092\u958b\u304d\u76f4\u3057\u3066\u304f\u3060\u3055\u3044\u3002","musicMissing":"\u540c\u68b1\u306e\u97f3\u697d\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3002\u30d7\u30e9\u30b0\u30a4\u30f3\u30e9\u30a4\u30d6\u30e9\u30ea\u304b\u3089 Six Clip Velocity \u3092\u518d\u30a4\u30f3\u30b9\u30c8\u30fc\u30eb\u3057\u3066\u304f\u3060\u3055\u3044\u3002"},"ko":{"intro":"6\uac1c \uc601\uc0c1\uc744 23\ucd08 \uae38\uc774\uc758 3:4 \ubca8\ub85c\uc2dc\ud2f0 \ud3b8\uc9d1\uc73c\ub85c \ub9cc\ub4ed\ub2c8\ub2e4. \uc2a4\ud53c\ub4dc \ub7a8\ud504, \uc138\ub85c \ube14\ub7ec \ucef7, \ud770\uc0c9 \ud50c\ub798\uc2dc, \ud0a4\ub124\ud2f1 \uc790\ub9c9, \ubc18\ubcf5, \uac80\uc740\uc0c9 \ud398\uc774\ub4dc\uc640 \uc74c\uc545\uc774 \ud3ec\ud568\ub429\ub2c8\ub2e4.","noProject":"\uba3c\uc800 \ud504\ub85c\uc81d\ud2b8\ub97c \uc5ec\uc138\uc694.","load":"\ud504\ub85c\uc81d\ud2b8 \uc601\uc0c1 \ubd88\ub7ec\uc624\uae30","loading":"\ud504\ub85c\uc81d\ud2b8 \uc601\uc0c1\uc744 \ubd88\ub7ec\uc624\ub294 \uc911\u2026","ready":"\uc601\uc0c1 1\u20136\uc758 \uc21c\uc11c\uc640 \uae38\uc774\ub97c \ud655\uc778\ud558\uc138\uc694.","some":"\uc774 \ud504\ub85c\uc81d\ud2b8\uc5d0\ub294 \uc601\uc0c1\uc774 {n}\uac1c \uc788\uc2b5\ub2c8\ub2e4. 6\uac1c\uac00 \ud544\uc694\ud569\ub2c8\ub2e4. \uc601\uc0c1\uc744 \ub354 \uac00\uc838\uc624\uac70\ub098 \uac19\uc740 \uc601\uc0c1\uc744 \uc758\ub3c4\uc801\uc73c\ub85c \ub450 \ubc88 \uc120\ud0dd\ud558\uc138\uc694.","none":"\uc774 \ud504\ub85c\uc81d\ud2b8\uc5d0 \uc601\uc0c1\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \uba3c\uc800 \uc601\uc0c1\uc744 \uac00\uc838\uc624\uc138\uc694.","checking":"\uc601\uc0c1\uc744 \ud655\uc778\ud558\ub294 \uc911\u2026","addingMusic":"\ud504\ub85c\uc81d\ud2b8\uc5d0 \uc74c\uc545\uc744 \ucd94\uac00\ud558\ub294 \uc911\u2026","creating":"Draft\ub97c \ub9cc\ub4dc\ub294 \uc911\u2026","placing":"\uc601\uc0c1 \uc870\uac01 {n}\uac1c\ub97c \ubc30\uce58\ud558\uace0 \uc18d\ub3c4\ub97c \uc870\uc815\ud558\ub294 \uc911\u2026","finishing":"\ube14\ub7ec \ucef7, \uc790\ub9c9, \ud50c\ub798\uc2dc, \ud398\uc774\ub4dc\uc640 \uc74c\uc545\uc744 \ucd94\uac00\ud558\ub294 \uc911\u2026","saved":"\uc800\uc7a5\ud588\uc2b5\ub2c8\ub2e4. \uac01 \uad6c\uac04\uc740 \ud3b8\uc9d1 \uac00\ub2a5\ud55c \ud074\ub9bd\uc774\uba70 \ud654\uba74 \uad6c\ub3c4\uc640 \uc790\ub9c9 \uae00\uaf34\uc744 \uc870\uc815\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.","partial":" \uacc4\uc18d\ud558\uae30 \uc804\uc5d0 \uc77c\ubd80 \uc0dd\uc131\ub41c Draft\ub97c \ud655\uc778\ud569\ub2c8\ub2e4.","choose":"\uc601\uc0c1 \uc120\ud0dd","needs":"\ucd5c\uc18c {s}\ucd08 \ubd84\ub7c9\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.","subtitle":"\uc790\ub9c9 \ub2e8\uc5b4(\uc120\ud0dd \uc0ac\ud56d)","lineWord":"\uccab\uc9f8 \uc904, {n}\ubc88\uc9f8 \ub2e8\uc5b4","line2":"\ub458\uc9f8 \uc904","phraseWord":"\ub450 \ubc88\uc9f8 \ubb38\uad6c, {n}\ubc88\uc9f8 \ub2e8\uc5b4","draftName":"Draft \uc774\ub984","continue":"\uc77c\ubd80 Draft \ud655\uc778 \ud6c4 \uacc4\uc18d","another":"Draft \ud558\ub098 \ub354 \ub9cc\ub4e4\uae30","create":"Draft \ub9cc\ub4e4\uae30","open":"\uc800\uc7a5\ub41c Draft \uc5f4\uae30","roles":["\uccab \uc7a5\uba74, 8\ucd08 \uc774\uc0c1(\uc790\ub9c9 \ud3ec\ud568)","\ub450 \ubc88\uc9f8 \uc7a5\uba74","\uc7a5\uba74 3","\uc7a5\uba74 4","\uc7a5\uba74 5","\uc7a5\uba74 6"],"summary":"6\uac1c \uc601\uc0c1\uc744 \uc2a4\ud53c\ub4dc \ub7a8\ud504, \uc138\ub85c \ube14\ub7ec \ucef7, \ud770\uc0c9 \ud50c\ub798\uc2dc, \ud0a4\ub124\ud2f1 \uc790\ub9c9, \uac80\uc740\uc0c9 \ud398\uc774\ub4dc\uc640 \uc74c\uc545\uc774 \ud3ec\ud568\ub41c \ud3b8\uc9d1 \uac00\ub2a5\ud55c 23\ucd08 \ubca8\ub85c\uc2dc\ud2f0 \uc601\uc0c1\uc73c\ub85c \ub9cc\ub4ed\ub2c8\ub2e4.","hostTooOld":"Six Clip Velocity\ub97c \uc0ac\uc6a9\ud558\ub824\uba74 \ucd5c\uc2e0 \ubc84\uc804\uc758 Selects\uac00 \ud544\uc694\ud569\ub2c8\ub2e4. Selects\ub97c \uc5c5\ub370\uc774\ud2b8\ud55c \ub4a4 \uc774 \ud328\ub110\uc744 \ub2e4\uc2dc \uc5ec\uc138\uc694.","musicMissing":"\ud3ec\ud568\ub41c \uc74c\uc545\uc744 \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \ud50c\ub7ec\uadf8\uc778 \ub77c\uc774\ube0c\ub7ec\ub9ac\uc5d0\uc11c Six Clip Velocity\ub97c \ub2e4\uc2dc \uc124\uce58\ud558\uc138\uc694."},"pt":{"intro":"Seis v\u00eddeos viram uma edi\u00e7\u00e3o de velocidade 3:4 de 23 segundos com rampas, cortes de desfoque vertical, flash branco, legendas cin\u00e9ticas, repeti\u00e7\u00e3o e fade para preto. M\u00fasica inclu\u00edda.","noProject":"Abra primeiro um projeto.","load":"Carregar v\u00eddeos do projeto","loading":"Carregando v\u00eddeos do projeto\u2026","ready":"Confira a ordem e a dura\u00e7\u00e3o dos v\u00eddeos 1\u20136.","some":"Este projeto tem {n} v\u00eddeos. O formato precisa de 6; importe mais ou escolha um duas vezes de prop\u00f3sito.","none":"Este projeto n\u00e3o tem v\u00eddeos. Importe v\u00eddeos primeiro.","checking":"Verificando v\u00eddeos\u2026","addingMusic":"Adicionando m\u00fasica ao projeto\u2026","creating":"Criando o rascunho\u2026","placing":"Posicionando e ajustando {n} trechos\u2026","finishing":"Adicionando cortes desfocados, legendas, flash, fade e m\u00fasica\u2026","saved":"Salvo. Cada trecho \u00e9 um clipe edit\u00e1vel; ajuste o enquadramento e a fonte das legendas.","partial":" O rascunho parcial ser\u00e1 verificado antes de continuar.","choose":"Escolher v\u00eddeo","needs":"Precisa de pelo menos {s} s de v\u00eddeo.","subtitle":"Palavras das legendas (opcional)","lineWord":"Linha 1, palavra {n}","line2":"Linha 2","phraseWord":"Segunda frase, palavra {n}","draftName":"Nome do rascunho","continue":"Verificar e continuar rascunho parcial","another":"Criar outro rascunho","create":"Criar rascunho","open":"Abrir rascunho salvo","roles":["Cena inicial, 8 s ou mais (com legendas)","Segunda cena","Cena 3","Cena 4","Cena 5","Cena 6"],"summary":"Transforma seis v\u00eddeos em uma edi\u00e7\u00e3o de velocidade edit\u00e1vel de 23 segundos com rampas, desfoque vertical, flash branco, legendas cin\u00e9ticas, fade para preto e m\u00fasica.","hostTooOld":"Six Clip Velocity precisa de uma vers\u00e3o mais recente do Selects. Atualize o Selects e abra este painel novamente.","musicMissing":"A m\u00fasica inclu\u00edda n\u00e3o foi encontrada. Reinstale o Six Clip Velocity pela biblioteca de plugins."},"tr":{"intro":"Alt\u0131 video; h\u0131z rampalar\u0131, dikey bulan\u0131kl\u0131k ge\u00e7i\u015fleri, beyaz fla\u015f, hareketli altyaz\u0131lar, tekrar, siyaha ge\u00e7i\u015f ve m\u00fczik i\u00e7eren 23 saniyelik 3:4 h\u0131z kurgusuna d\u00f6n\u00fc\u015f\u00fcr.","noProject":"\u00d6nce bir proje a\u00e7\u0131n.","load":"Proje videolar\u0131n\u0131 y\u00fckle","loading":"Proje videolar\u0131 y\u00fckleniyor\u2026","ready":"1\u20136 numaral\u0131 videolar\u0131n s\u0131ras\u0131n\u0131 ve s\u00fcrelerini kontrol edin.","some":"Bu projede {n} video var. Format i\u00e7in 6 video gerekir; daha fazla i\u00e7e aktar\u0131n veya birini bilerek iki kez se\u00e7in.","none":"Bu projede video yok. \u00d6nce video i\u00e7e aktar\u0131n.","checking":"Videolar kontrol ediliyor\u2026","addingMusic":"M\u00fczik projeye ekleniyor\u2026","creating":"Taslak olu\u015fturuluyor\u2026","placing":"{n} video par\u00e7as\u0131 yerle\u015ftirilip h\u0131zland\u0131r\u0131l\u0131yor\u2026","finishing":"Bulan\u0131kl\u0131k, altyaz\u0131, fla\u015f, kararma ve m\u00fczik ekleniyor\u2026","saved":"Kaydedildi. Her b\u00f6l\u00fcm d\u00fczenlenebilir bir kliptir; kadraj\u0131 ve altyaz\u0131 yaz\u0131 tipini ayarlayabilirsiniz.","partial":" Devam etmeden \u00f6nce k\u0131smi taslak kontrol edilecek.","choose":"Video se\u00e7","needs":"En az {s} sn g\u00f6r\u00fcnt\u00fc gerekir.","subtitle":"Altyaz\u0131 kelimeleri (iste\u011fe ba\u011fl\u0131)","lineWord":"1. sat\u0131r, {n}. kelime","line2":"2. sat\u0131r","phraseWord":"\u0130kinci ifade, {n}. kelime","draftName":"Taslak ad\u0131","continue":"K\u0131smi tasla\u011f\u0131 kontrol et ve devam et","another":"Ba\u015fka taslak olu\u015ftur","create":"Taslak olu\u015ftur","open":"Kaydedilen tasla\u011f\u0131 a\u00e7","roles":["A\u00e7\u0131l\u0131\u015f plan\u0131, en az 8 sn (altyaz\u0131l\u0131)","\u0130kinci plan","Plan 3","Plan 4","Plan 5","Plan 6"],"summary":"Alt\u0131 videoyu h\u0131z rampalar\u0131, dikey bulan\u0131kl\u0131k ge\u00e7i\u015fleri, beyaz fla\u015f, hareketli altyaz\u0131lar, siyaha ge\u00e7i\u015f ve m\u00fczik i\u00e7eren d\u00fczenlenebilir 23 saniyelik bir kurguya d\u00f6n\u00fc\u015ft\u00fcr\u00fcr.","hostTooOld":"Six Clip Velocity i\u00e7in Selects'in daha yeni bir s\u00fcr\u00fcm\u00fc gerekir. Selects'i g\u00fcncelleyin, ard\u0131ndan bu paneli yeniden a\u00e7\u0131n.","musicMissing":"Birlikte gelen m\u00fczik bulunamad\u0131. Six Clip Velocity'yi eklenti kitapl\u0131\u011f\u0131ndan yeniden y\u00fckleyin."},"zh":{"intro":"\u5c06\u516d\u6bb5\u89c6\u9891\u5236\u4f5c\u621023\u79d2\u76843:4\u901f\u5ea6\u611f\u526a\u8f91\uff0c\u5305\u542b\u53d8\u901f\u3001\u7eb5\u5411\u6a21\u7cca\u5207\u6362\u3001\u767d\u8272\u95ea\u5149\u3001\u52a8\u6001\u5b57\u5e55\u3001\u91cd\u590d\u6bb5\u843d\u3001\u6de1\u51fa\u81f3\u9ed1\u8272\u548c\u97f3\u4e50\u3002","noProject":"\u8bf7\u5148\u6253\u5f00\u4e00\u4e2a\u9879\u76ee\u3002","load":"\u52a0\u8f7d\u9879\u76ee\u89c6\u9891","loading":"\u6b63\u5728\u52a0\u8f7d\u9879\u76ee\u89c6\u9891\u2026","ready":"\u8bf7\u68c0\u67e5\u89c6\u98911\u20136\u7684\u987a\u5e8f\u548c\u65f6\u957f\u3002","some":"\u6b64\u9879\u76ee\u6709{n}\u6bb5\u89c6\u9891\u3002\u8be5\u683c\u5f0f\u9700\u89816\u6bb5\uff1b\u8bf7\u5bfc\u5165\u66f4\u591a\u89c6\u9891\uff0c\u6216\u6709\u610f\u91cd\u590d\u9009\u62e9\u4e00\u6bb5\u3002","none":"\u6b64\u9879\u76ee\u6ca1\u6709\u89c6\u9891\u3002\u8bf7\u5148\u5bfc\u5165\u89c6\u9891\u3002","checking":"\u6b63\u5728\u68c0\u67e5\u89c6\u9891\u2026","addingMusic":"\u6b63\u5728\u5411\u9879\u76ee\u6dfb\u52a0\u97f3\u4e50\u2026","creating":"\u6b63\u5728\u521b\u5efa\u8349\u7a3f\u2026","placing":"\u6b63\u5728\u653e\u7f6e\u5e76\u8c03\u6574{n}\u4e2a\u89c6\u9891\u7247\u6bb5\u7684\u901f\u5ea6\u2026","finishing":"\u6b63\u5728\u6dfb\u52a0\u6a21\u7cca\u5207\u6362\u3001\u5b57\u5e55\u3001\u95ea\u5149\u3001\u6de1\u51fa\u548c\u97f3\u4e50\u2026","saved":"\u5df2\u4fdd\u5b58\u3002\u6bcf\u4e2a\u533a\u6bb5\u90fd\u662f\u53ef\u7f16\u8f91\u526a\u8f91\uff1b\u53ef\u8c03\u6574\u753b\u9762\u6784\u56fe\u548c\u5b57\u5e55\u5b57\u4f53\u3002","partial":" \u7ee7\u7eed\u524d\u4f1a\u5148\u68c0\u67e5\u672a\u5b8c\u6210\u7684\u8349\u7a3f\u3002","choose":"\u9009\u62e9\u89c6\u9891","needs":"\u81f3\u5c11\u9700\u8981{s}\u79d2\u7d20\u6750\u3002","subtitle":"\u5b57\u5e55\u6587\u5b57\uff08\u53ef\u9009\uff09","lineWord":"\u7b2c1\u884c\uff0c\u7b2c{n}\u4e2a\u8bcd","line2":"\u7b2c2\u884c","phraseWord":"\u7b2c\u4e8c\u4e2a\u77ed\u8bed\uff0c\u7b2c{n}\u4e2a\u8bcd","draftName":"\u8349\u7a3f\u540d\u79f0","continue":"\u68c0\u67e5\u5e76\u7ee7\u7eed\u672a\u5b8c\u6210\u7684\u8349\u7a3f","another":"\u518d\u521b\u5efa\u4e00\u4e2a\u8349\u7a3f","create":"\u521b\u5efa\u8349\u7a3f","open":"\u6253\u5f00\u5df2\u4fdd\u5b58\u7684\u8349\u7a3f","roles":["\u5f00\u573a\u955c\u5934\uff0c\u81f3\u5c118\u79d2\uff08\u542b\u5b57\u5e55\uff09","\u7b2c\u4e8c\u4e2a\u955c\u5934","\u955c\u59343","\u955c\u59344","\u955c\u59345","\u955c\u59346"],"summary":"\u5c06\u516d\u6bb5\u89c6\u9891\u5236\u4f5c\u6210\u53ef\u7f16\u8f91\u768423\u79d2\u901f\u5ea6\u611f\u526a\u8f91\uff0c\u5305\u542b\u53d8\u901f\u3001\u7eb5\u5411\u6a21\u7cca\u3001\u767d\u8272\u95ea\u5149\u3001\u52a8\u6001\u5b57\u5e55\u3001\u6de1\u51fa\u81f3\u9ed1\u8272\u548c\u97f3\u4e50\u3002","hostTooOld":"Six Clip Velocity \u9700\u8981\u66f4\u65b0\u7248\u672c\u7684 Selects\u3002\u8bf7\u66f4\u65b0 Selects\uff0c\u7136\u540e\u91cd\u65b0\u6253\u5f00\u6b64\u9762\u677f\u3002","musicMissing":"\u627e\u4e0d\u5230\u9644\u5e26\u7684\u97f3\u4e50\u3002\u8bf7\u4ece\u63d2\u4ef6\u5e93\u91cd\u65b0\u5b89\u88c5 Six Clip Velocity\u3002"}};
const fmt=(value,key,replacement)=>value.replace('{'+key+'}',String(replacement));
// Host errors (av-host block) by their code; anything else as its own message.
const sayError=(t,error)=>error?.code==='host-missing'?t.hostTooOld:error?.code==='not-found'?t.musicMissing:String(error?.message||error);

function Panel({sdk,context,ui}){
  hostUseSdk(sdk);
 const t=STRINGS[String(context.language||'en').toLowerCase().split(/[-_]/)[0]]||STRINGS.en;
 const empty=()=>Array(SLOTS).fill('');
 const [videos,setVideos]=React.useState([]),[slots,setSlots]=React.useState(empty),[loadedProject,setLoadedProject]=React.useState(null);
 const [need,setNeed]=React.useState(null),[text,setText]=React.useState(DEFAULT_TEXT);
 const [name,setName]=React.useState('Six clip velocity');
 const [busy,setBusy]=React.useState(false),[status,setStatus]=React.useState(''),[saved,setSaved]=React.useState(null),[partialDraftId,setPartialDraftId]=React.useState(null);
 const running=React.useRef(false),currentProject=React.useRef(context.projectId);currentProject.current=context.projectId;
 React.useEffect(()=>{setVideos([]);setSlots(empty());setLoadedProject(null);setSaved(null);setPartialDraftId(null);setStatus('');},[context.projectId]);
 async function load(){
  if(!context.projectId||running.current)return;running.current=true;setBusy(true);setStatus(t.loading);
  try{
   const projectId=context.projectId,rows=(await inventory(sdk,projectId,'List project videos')).filter(r=>r.type==='Video');
   const plan=scenePlan(30);
   if(currentProject.current!==projectId)return;
   setVideos(rows);setNeed(plan.requiredSeconds);setLoadedProject(projectId);
   setSlots(old=>old.map((x,i)=>x||rows[i]?.resourceId||''));
   setStatus(rows.length>=SLOTS?t.ready:rows.length?fmt(t.some,'n',rows.length):t.none);
  }catch(error){setStatus(sayError(t,error));}finally{running.current=false;setBusy(false);}
 }
 const short=slots.map((id,i)=>{const v=videos.find(x=>x.resourceId===id);return v&&need&&v.seconds!=null&&v.seconds<need[i];});
 async function create(){
  const projectId=context.projectId;
  if(running.current||!projectId||loadedProject!==projectId||slots.some(x=>!x)||short.some(Boolean)||!name.trim())return;
  running.current=true;setBusy(true);setStatus(t.checking);
  let createdDraftId=null;
  try{
   const selected=slots.map(id=>{const m=videos.filter(v=>v.resourceId===id);if(m.length!==1)throw Error('Check the selected videos again.');return m[0];});
   const fresh=await inventory(sdk,projectId,'Confirm selected videos');
   if(selected.some(v=>fresh.filter(r=>r.resourceId===v.resourceId&&r.path===v.path&&r.type==='Video').length!==1))throw Error('The selected videos changed. Reload the Project videos.');
   const prepared=await prepareVideos(sdk,projectId,selected);
   setStatus(t.addingMusic);
   const musicResourceId=await ensureMusic(sdk,projectId);
   if(currentProject.current!==projectId)throw Error('The Project changed. Start again in the selected Project.');
   setStatus(t.creating);
   const grid=`const m=await d.meta(),want=Math.round(699*m.fps/30);if(m.durationFrames!==want||m.frameSize?.width!==1080||m.frameSize?.height!==1440)throw Error('Draft frame grid differs from the plan.');`;
   let draftId,fps;
   if(partialDraftId){
    const check=await sdk.runScript({script:`const p=selects.project(${JSON.stringify(projectId)}),id=${JSON.stringify(partialDraftId)};if(!(await p.meta()).draftIds.includes(id))throw Error('Partial Draft is not in this Project.');const d=selects.draft(id);${grid}if((await d.clips({trackScope:'all'})).some(x=>x.resourceId))throw Error('Partial Draft is not empty; inspect it before retrying.');return {draftId:id,fps:m.fps};`,summary:'Inspect partial Draft',allowCommit:false});
    if(check.isError||check.result?.draftId!==partialDraftId)throw Error(check.output||'The partial Draft cannot be safely continued.');
    ({draftId,fps}=check.result);
   }else{
    const seed=await sdk.runScript({script:`const p=selects.project(${JSON.stringify(projectId)});const d=await p.createDraft({name:${JSON.stringify(name.trim())}});await d.insertGap({seconds:699/30});await d.setFrameSize({width:1080,height:1440});${grid}const saved=await d.commitAll('Start Six Clip Velocity Draft');return {draftId:saved.createdDraftId,fps:m.fps};`,summary:'Create velocity Draft',allowCommit:true});
    if(seed.isError||!seed.result?.draftId)throw Error(seed.output||'Could not create the Draft. Check the Project before retrying.');
    ({draftId,fps}=seed.result);
   }
   const plan=scenePlan(fps);
   createdDraftId=draftId;
   setStatus(fmt(t.placing,'n',plan.segments.reduce((a,s)=>a+s.pieces.length,0)));
   const native=await placeVideos(prepared,draftId,plan);
   const request={mode:'finish',projectId,draftId,fps,videos:selected.map((v,i)=>({resourceId:v.resourceId,width:native.videos[i].width,height:native.videos[i].height})),...compactPlacements(native.placements),musicResourceId,text};
   const script=buildFinishScript(request);
   setStatus(t.finishing);
   const result=await sdk.runScript({script,summary:'Finish velocity Draft',allowCommit:true,timeoutSeconds:120});
   if(result.isError||!result.result)throw Error(result.output||'Could not confirm the save. Check the Project before retrying.');
   if(result.result.status==='outcomeUnknown')throw Error('Save outcome is unknown. Check the Project Draft list before retrying.');
   if(result.result.status!=='saved')throw Error(result.result.message||'Could not save the Draft.');
   setPartialDraftId(null);setSaved(result.result);setStatus(t.saved);
  }catch(error){if(createdDraftId)setPartialDraftId(createdDraftId);setStatus(sayError(t,error)+(createdDraftId?t.partial:''));}finally{running.current=false;setBusy(false);}
 }
 const ready=!busy&&loadedProject===context.projectId;
 const setWord=(key,i,v)=>setText(old=>{const n={...old,line1:[...old.line1],phrase2:[...old.phrase2]};if(key==='line2')n.line2=v;else n[key][i]=v;return n;});
 return <ui.Stack gap={16}><ui.Section title={t.title}>
  <ui.Message>{t.intro}</ui.Message>
  {!context.projectId&&<ui.Message>{t.noProject}</ui.Message>}
  <ui.Button variant="secondary" onClick={load} disabled={!context.projectId||busy} busy={busy}>{t.load}</ui.Button>
  {slots.map((value,i)=><div key={i}><ui.Select label={'Video '+(i+1)+' — '+t.roles[i]} value={value} onChange={v=>setSlots(old=>old.map((x,j)=>j===i?v:x))} options={videos.map(v=>({value:v.resourceId,label:v.name+(v.seconds!=null?' ('+v.seconds.toFixed(1)+' s)':'')}))} placeholder={t.choose} disabled={!ready}/>{short[i]&&<ui.Message>{fmt(t.needs,'s',need[i].toFixed(1))}</ui.Message>}</div>)}
  <details><summary>{t.subtitle}</summary>
   {text.line1.map((w,i)=><ui.TextField key={i} label={fmt(t.lineWord,'n',i+1)} value={w} onChange={v=>setWord('line1',i,v)} disabled={busy}/>)}
   <ui.TextField label={t.line2} value={text.line2} onChange={v=>setWord('line2',0,v)} disabled={busy}/>
   {text.phrase2.map((w,i)=><ui.TextField key={'p'+i} label={fmt(t.phraseWord,'n',i+1)} value={w} onChange={v=>setWord('phrase2',i,v)} disabled={busy}/>)}
  </details>
  <ui.TextField label={t.draftName} value={name} onChange={setName} disabled={busy}/>
  <ui.Actions><ui.Button variant="primary" onClick={create} disabled={!ready||slots.some(x=>!x)||short.some(Boolean)||!name.trim()} busy={busy}>{partialDraftId?t.continue:saved?t.another:t.create}</ui.Button></ui.Actions>
  {status&&<ui.Message>{status}</ui.Message>}
  {saved&&<ui.Button variant="secondary" onClick={()=>sdk.runScript({script:'return await selects.editor.openDraft('+JSON.stringify(saved.draftId)+');',summary:'Open saved Draft',allowCommit:false})}>{t.open}</ui.Button>}
 </ui.Section></ui.Stack>;
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
  const run = async (method: string, args: unknown[], write = false) => {
    // method names below are fixed implementation constants; values always use JSON encoding.
    // Direct arguments keep object literals contextually typed by the SDK signature.
    const response = await sdk.runScript({
      summary: "Use local media workspace",
      allowCommit: write,
      script: "return await selects." + method + "(" + JSON.stringify(args).slice(1, -1) + ");",
    });
    if (response.isError) throw new Error(response.output || "Local SDK operation failed.");
    // A clipped report has no result. Every read returning data rejects that case below.
    return response.result;
  };
  const environment = await run("files.environment", []);
  if (!environment || typeof environment.platform !== "string" || !environment.homedir)
    throw new Error("Update Selects to use this plugin's local media workspace.");
  const paths = panelLocalPaths(environment.platform);
  const CHUNK_BYTES = 48 * 1024;
  const readRange = async (path: string, offset: number, length: number) => {
    const parts: Uint8Array[] = [];
    let total = 0;
    while (total < length) {
      const result = await run("files.readRange", [{ path, offset: offset + total, length: Math.min(CHUNK_BYTES, length - total) }]);
      if (!result || typeof result.base64 !== "string" || !Number.isInteger(result.bytesRead)) throw new Error("The file read returned an incomplete result.");
      const bytes = Uint8Array.from(atob(result.base64), (character) => character.charCodeAt(0));
      if (bytes.length !== result.bytesRead) throw new Error("The file read returned invalid bytes.");
      parts.push(bytes); total += bytes.length;
      if (bytes.length < Math.min(CHUNK_BYTES, length - (total - bytes.length))) break;
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
        for (let offset = 0; offset < bytes.length || offset === 0; offset += CHUNK_BYTES) {
          const chunk = bytes.subarray(offset, offset + CHUNK_BYTES);
          let binary = "";
          for (const byte of chunk) binary += String.fromCharCode(byte);
          const mode = offset === 0 ? (flag === "a" ? "append" : "exclusive") : undefined;
          const result = await run("files.writeChunk", [{ path: destination, offset, base64: btoa(binary), ...(mode ? { mode } : {}) }], true);
          if (result?.bytesWritten !== chunk.length) throw new Error("The file write returned an incomplete result. Check the file before retrying.");
        }
        if (replacement) await run("files.rename", [destination, path], true);
        published = true;
      } finally {
        if (replacement && !published) await run("files.remove", [destination, { force: true }], true).catch(() => {});
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
    rm: (path: string, options?: { recursive?: boolean; force?: boolean }) => run("files.remove", [path, options ?? {}], true),
    removeFile: ({ filePath }: { filePath: string }) => run("files.remove", [filePath, { force: true }], true),
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
    React.useEffect(() => {
      let active = true;
      let client: any;
      createPanelLocalClient(props.sdk).then(value => {
        client = {...props.sdk, ...value};
        if (!active) { value.dispose(); return; }
        panelLocalClients.set(props.sdk, client);
        setState({sdk: props.sdk});
      }).catch(error => { if (active) setState({error: String(error?.message || error)}); });
      return () => {
        active = false;
        if (client) {
          if (panelLocalClients.get(props.sdk) === client) panelLocalClients.delete(props.sdk);
          client.dispose();
        }
      };
    }, [props.sdk]);
    if (state?.error) return React.createElement("div", {role: "alert"}, state.error);
    if (state?.sdk !== props.sdk) return React.createElement("div", {role: "status"}, "Connecting to Selects…");
    return React.createElement(Component, props);
  };
}

export default withPanelLocalClient(Panel);
// local-sdk:end
