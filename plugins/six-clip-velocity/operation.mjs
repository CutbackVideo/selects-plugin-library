import fs from 'node:fs';
import path from 'node:path';

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

export function musicFile(pkgDir=path.dirname(new URL(import.meta.url).pathname)){
 const file=path.join(pkgDir,'assets','music.mp3');
 if(!fs.existsSync(file))throw Error('Bundled music is missing: '+file);
 return {path:file};
}

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
 // Placements arrive compact (the shell command is limited to 16 KB): one [clipId, trackIndex]
 // per planned piece, in plan order. Frames come from the plan; authorFinish then checks
 // the Draft's real clips against them before editing.
 const expected=plan.segments.flatMap(s=>s.pieces.map(p=>({video:s.video,startFrame:p.startFrame,endFrame:p.startFrame+p.frames,speed:p.speed})));
 if(!Array.isArray(raw.tracks)||!raw.tracks.length||raw.tracks.length>expected.length||raw.tracks.some(t=>typeof t!=='string'||!t||t.length>120))throw Error('Invalid track list');
 if(!Array.isArray(raw.clips)||raw.clips.length!==expected.length)throw Error('Expected '+expected.length+' video pieces');
 const placements=raw.clips.map((row,i)=>{if(!Array.isArray(row)||row.length!==2||!Number.isSafeInteger(row[0])||!Number.isSafeInteger(row[1])||!raw.tracks[row[1]])throw Error('Invalid video piece '+(i+1));return {...expected[i],clipId:row[0],trackId:raw.tracks[row[1]]};});
 if(new Set(placements.map(p=>p.clipId)).size!==placements.length)throw Error('Video pieces must be independent clips');
 return {projectId,draftId,fps:plan.fps,videos,framing,musicResourceId,text,fontFamily,placements};
}

export async function authorFinish(selects,input,plan,look,subs,codes){
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
}

export function buildFinishScript(raw){
 const input=normalizeFinish(raw);
 return `const input=${JSON.stringify(input)};const plan=${JSON.stringify(scenePlan(input.fps))};return await (${authorFinish.toString()})(selects,input,plan,${JSON.stringify(LOOK)},${JSON.stringify(SUBTITLES)},${JSON.stringify({effect:EFFECT_CODE,overlay:OVERLAY_CODE,subtitles:SUBTITLE_CODE})});`;
}
