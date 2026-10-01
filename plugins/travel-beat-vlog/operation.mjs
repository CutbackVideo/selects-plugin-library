import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {analyseSong} from './analyze.mjs';

const PKG=path.dirname(new URL(import.meta.url).pathname);
const STORE=path.join(os.homedir(),'.selects','plugin-data','travel-beat-vlog');

// Measured frame by frame from the reference (30 fps, 468 frames, 9:16). V1-V26 are
// the user's videos in order; H is the hero photo. Montage 2 reuses V1-V9 (V6 and V7
// continue after their montage-1 part) and adds V24 and V25.
// The fade is linear from frame 449.45 to 463.7 (least-squares fit to the reference's per-frame fade level, rms 0.01)
// onto the reference's near-black, which holds to the end. Export turns this CSS colour into (4.4,3.6,2.0) against the
// reference's (5.5,4.2,3.6); 8-bit video steps near black allow no closer match (rgb(8,6,6) gives blue +3.2).
const END_COLOR='rgb(8,6,5)';
// A timing table, in 30 fps frames: m1/m2 are the montage cuts (last = the next shot's start: hero / video 26),
// g1/g2 the grid panel entries, v12-v23 the long and short shots, then the fade and the end. analyze.mjs builds one
// per song; this is the reference's own.
export const REFERENCE_TIMING={durationFrames:468,m1:[12,16,19,22,25,28,32,35,38,42,48,55],g1:[149,153,158,163],g2:[229,233,237,242],
 m2:[364,368,374,379,384,390,395,400,405,410,416,424],v12:102,v17:182,v22:263,v23:343,fadeStart:449.45,fadeEnd:463.7,clipEnd:465,title:[62,102]};
const M2_SLOTS=['V1','V2','V3','V4','V5','V6','V7','V8','V9','V24','V25'];
export const VIDEO_SLOTS=Array.from({length:26},(_,i)=>'V'+(i+1));

export function validateTiming(t){
 const int=(v,l)=>{if(!Number.isSafeInteger(v)||v<0)throw Error('Timing: '+l+' must be a frame number');return v;};
 const list=(v,n,l)=>{if(!Array.isArray(v)||v.length!==n)throw Error('Timing: '+l+' needs '+n+' frames');v.forEach((x,i)=>int(x,l+'['+i+']'));return v;};
 if(!t||typeof t!=='object')throw Error('Timing is missing');
 const m1=list(t.m1,12,'m1'),m2=list(t.m2,12,'m2'),g1=list(t.g1,4,'g1'),g2=list(t.g2,4,'g2'),title=list(t.title,2,'title');
 const order=[...m1,int(t.v12,'v12'),int(t.v17,'v17'),int(t.v22,'v22'),int(t.v23,'v23'),...m2,int(t.clipEnd,'clipEnd'),int(t.durationFrames,'durationFrames')];
 for(let i=1;i<order.length;i++)if(order[i]-order[i-1]<2)throw Error('Timing: shots must be at least 2 frames long');
 for(const [g,a,z,l] of [[g1,t.v12,t.v17,'grid 1'],[g2,t.v17,t.v22,'grid 2']])if(g.some((v,i)=>v<=a||v>=z||(i&&v-g[i-1]<2)))throw Error('Timing: '+l+' must fall inside its long shot');
 if(m1[0]<1||t.durationFrames>900)throw Error('Timing: the vlog must start after frame 0 and last at most 30 s');
 if(!(t.fadeStart<t.fadeEnd&&t.fadeEnd<=t.durationFrames&&t.fadeStart>m2[11]))throw Error('Timing: the fade must sit in the last shot');
 if(title[0]<=m1[11]||title[1]!==t.v12)throw Error('Timing: the title runs over the hero photo');
 return t;
}

export function segments(t=REFERENCE_TIMING){
 const s=[];
 t.m1.slice(0,-1).forEach((a,i)=>s.push({slot:'V'+(i+1),start:a,end:t.m1[i+1],quad:'full'}));
 s.push({slot:'H',start:t.m1[11],end:t.v12,quad:'full',image:true});
 s.push({slot:'V12',start:t.v12,end:t.v17,quad:'full'});
 ['V13','V14','V15','V16'].forEach((slot,i)=>s.push({slot,start:t.g1[i],end:t.v17,quad:['TL','TR','BL','BR'][i]}));
 s.push({slot:'V17',start:t.v17,end:t.v22,quad:'full'});
 ['V18','V19','V20','V21'].forEach((slot,i)=>s.push({slot,start:t.g2[i],end:t.v22,quad:['TL','TR','BL','BR'][i]}));
 s.push({slot:'V22',start:t.v22,end:t.v23,quad:'full'});
 s.push({slot:'V23',start:t.v23,end:t.m2[0],quad:'full'});
 t.m2.slice(0,-1).forEach((a,i)=>{const slot=M2_SLOTS[i],first=s.find(x=>x.slot===slot);
  // V6 and V7 pick up where their montage-1 part ended; the others restart from the same in-point.
  s.push({slot,start:a,end:t.m2[i+1],quad:'full',inRef:(slot==='V6'||slot==='V7')?first.end-first.start:0});});
 s.push({slot:'V26',start:t.m2[11],end:t.clipEnd,quad:'full',fade:[t.fadeStart,t.fadeEnd]});
 return s;
}
export const SEGMENTS=segments();

export function scenePlan(fps=30,timing=REFERENCE_TIMING){
 if(!Number.isFinite(fps)||fps<10||fps>120)throw Error('Unsupported Draft frame rate');
 const t=validateTiming(timing),at=f=>Math.round(f*fps/30);
 return {fps,canvas:{width:1080,height:1920},durationFrames:at(t.durationFrames),
  clips:segments(t).map((s,i)=>({index:i,slot:s.slot,image:!!s.image,quad:s.quad,refStart:s.start,startFrame:at(s.start),endFrame:at(s.end),
   inSeconds:(s.inRef||0)/30,fade:s.fade?{startFrame:at(s.fade[0]),endFrame:at(s.fade[1]),startSeconds:s.fade[0]/30,endSeconds:s.fade[1]/30}:null})),
  title:{startFrame:at(t.title[0]),endFrame:at(t.title[1])},blackTail:at(t.fadeEnd),endColor:END_COLOR};
}

// Longest source span each video slot needs (in-point + longest use), in seconds.
export function slotNeeds(timing=REFERENCE_TIMING){
 const need={};
 for(const s of segments(validateTiming(timing)))if(!s.image)need[s.slot]=Math.max(need[s.slot]||0,((s.inRef||0)+s.end-s.start)/30);
 return need;
}

// The longest source span (seconds) the template promises for its inputs: the long shots (V12, V17, V22) and the
// 23 clips. A song's timing never asks for more: if a montage would, its cuts are spread evenly instead.
export const LIMITS={long:3.6,clip:2.0};
const LONG=['V12','V17','V22'];
export function withinLimits(timing){
 const over=t=>Object.entries(slotNeeds(t)).some(([s,v])=>v>(LONG.includes(s)?LIMITS.long:LIMITS.clip)+1e-9);
 if(!over(timing))return timing;
 const even=c=>[...Array.from({length:11},(_,i)=>Math.round(c[0]+(c[11]-c[0])*i/11)),c[11]];
 const t={...timing,m1:even(timing.m1),m2:even(timing.m2)};
 if(over(t))throw Error('This song is too slow for the format; pick a song with a faster beat.');
 return t;
}

// Fits the format to the user's song (analyze.mjs) and writes the song's window as the Draft's music.
export function songFit(song,cuts='hits'){
 if(typeof song!=='string'||!path.isAbsolute(song)||!fs.existsSync(song))throw Error('The song file is missing.');
 if(!['hits','reference'].includes(cuts))throw Error('Unknown cuts option');
 const fit=analyseSong(ffmpegPath(),song,{cuts,store:STORE});
 return {...fit,timing:withinLimits(validateTiming(fit.timing))};
}

// Per-slot colour transfer. Target: the reference clip's per-channel mean/std in that
// slot. Source: the user's clip over the frames the slot uses. Gains are clamped so an
// unusual clip is nudged, not wrecked.
export function colorTransfer(target,source,strength=1){
 return [0,1,2].map(c=>{
  const g=Math.max(0.6,Math.min(1.6,target.std[c]/Math.max(0.02,source.std[c])));
  const o=Math.max(-0.35,Math.min(0.35,target.mean[c]-g*source.mean[c]));
  return {gain:+(1+(g-1)*strength).toFixed(4),offset:+(o*strength).toFixed(4)};
 });
}

// FFmpeg on PATH, else the copy Selects ships inside its app bundle (the panel shell's PATH may not include Homebrew).
export function ffmpegPath(){
 const dirs=(process.env.PATH||'').split(path.delimiter).filter(Boolean);
 const apps=[process.execPath.split('.app/')[0]+'.app',...(fs.existsSync('/Applications')?fs.readdirSync('/Applications').filter(n=>/^Selects.*\.app$/.test(n)).map(n=>'/Applications/'+n):[])];
 const found=[...dirs.map(d=>path.join(d,'ffmpeg')),...apps.map(a=>path.join(a,'Contents/Resources/app.asar.unpacked/dist/bin/ffmpeg'))].find(f=>fs.existsSync(f));
 if(!found)throw Error('FFmpeg was not found. Install it (for example with Homebrew) or run the panel from Selects.');
 return found;
}

export function measureClip(file,inSeconds,seconds){
 const still=/\.(jpe?g|png|heic|webp|tiff?)$/i.test(file);
 const args=still?['-v','error','-i',file,'-frames:v','1','-vf','scale=64:-2','-f','rawvideo','-pix_fmt','rgb24','-']
  :['-v','error','-ss',String(inSeconds),'-t',String(Math.max(0.1,seconds)),'-i',file,'-vf','fps=6,scale=64:-2','-f','rawvideo','-pix_fmt','rgb24','-'];
 const raw=execFileSync(ffmpegPath(),args,{maxBuffer:64<<20});
 const n=raw.length/3; if(!n)throw Error('Could not read frames from '+path.basename(file));
 const sum=[0,0,0],sq=[0,0,0];
 for(let i=0;i<raw.length;i+=3)for(let c=0;c<3;c++){const v=raw[i+c]/255;sum[c]+=v;sq[c]+=v*v;}
 const mean=sum.map(s=>s/n);
 return {mean,std:sq.map((s,c)=>Math.sqrt(Math.max(0,s/n-mean[c]*mean[c])))};
}

export function gradeClips(clips,strength){
 const targets=JSON.parse(fs.readFileSync(path.join(PKG,'color-targets.json'),'utf8'));
 const out={};
 for(const c of clips){
  if(!targets[c.slot])throw Error('No colour target for '+c.slot);
  out[c.key]=strength>0?colorTransfer(targets[c.slot],measureClip(c.path,c.inSeconds,c.seconds),strength):null;
 }
 return out;
}

// Local Apple Vision cutout of the hero photo (people, or the main subject), written as
// an RGBA PNG the size of the photo into plugin-data. The Swift tool is compiled once.
export function heroCutout(photo,mode){
 if(!['person','foreground'].includes(mode))throw Error('Unknown cutout mode');
 fs.mkdirSync(path.join(STORE,'bin'),{recursive:true});
 const src=path.join(PKG,'tools','cutout.swift'),bin=path.join(STORE,'bin','cutout-v1');
 if(!fs.existsSync(bin)||fs.statSync(src).mtimeMs>fs.statSync(bin).mtimeMs){
  try{execFileSync('swiftc',['-O',src,'-o',bin+'.tmp'],{stdio:'pipe'});fs.renameSync(bin+'.tmp',bin);}
  catch(e){throw Error('The cutout tool did not compile. Install the Xcode Command Line Tools (xcode-select --install).');}
 }
 const stat=fs.statSync(photo),key=Buffer.from(photo+':'+stat.size+':'+stat.mtimeMs+':'+mode).toString('base64url').slice(-40);
 const out=path.join(STORE,'cutouts','hero-'+key+'.png');
 fs.mkdirSync(path.dirname(out),{recursive:true});
 if(!fs.existsSync(out)){
  const tmp=out+'.tmp.png';
  try{execFileSync(bin,[photo,tmp,mode],{stdio:'pipe'});}catch(e){throw Error(String(e.stderr||'').trim()||'Apple Vision found no subject in the hero photo.');}
  fs.renameSync(tmp,out);
 }
 return {path:out};
}

// Crop to the slot (cover, editable focus), colour transfer through an SVG matrix, and the
// closing fade on the last clip onto the ending colour, sampled by timeline time.
const CLIP_CODE=`import {useCurrentFrame} from 'remotion';
export default function TravelClip({Source,data}) {
 const g=data.g,frame=useCurrentFrame(),t=(frame+data.startFrame)/data.fps;
 const x=Math.max(g.mw-g.w,Math.min(0,g.mw/2-data.focusX*g.w));
 const y=Math.max(g.mh-g.h,Math.min(0,g.mh/2-data.focusY*g.h));
 const k=data.fade?Math.max(0,Math.min(1,(data.fade[1]-t)/(data.fade[1]-data.fade[0]))):1;
 const m=data.grade;
 const id='tbv'+data.id;
 const values=m?[m[0].gain,0,0,0,m[0].offset,0,m[1].gain,0,0,m[1].offset,0,0,m[2].gain,0,m[2].offset,0,0,0,1,0].join(' '):null;
 return <div style={{position:'absolute',inset:0,background:data.fade?data.fadeTo:'transparent'}}><div style={{position:'absolute',inset:0,opacity:k}}>{m&&<svg width="0" height="0" style={{position:'absolute'}}><filter id={id} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values={values}/></filter></svg>}<div style={{position:'absolute',left:g.left,top:g.top,width:g.mw,height:g.mh,overflow:'hidden',filter:m?'url(#'+id+')':'none'}}><div style={{position:'absolute',left:x,top:y,width:g.w,height:g.h}}><Source /></div></div></div></div>;
}`;

// Title sized and placed as measured (glyph box 248x108 of 432x768, centred at 215.5, 369.5),
// calibrated on an export: Impact squeezed to the reference's 2.3:1 word shape.
const TITLE_CODE=`export default function TravelTitle({data}) {
 return <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{position:'absolute',left:(data.cx-data.w/2)*100+'%',top:(data.cy-data.h/2)*100+'%',width:data.w*100+'%',height:data.h*100+'%',display:'flex',alignItems:'center',justifyContent:'center',overflow:'visible'}}><span style={{fontFamily:data.fontFamily||'Impact',fontSize:data.h*1920*1.2+'px',lineHeight:1,color:data.color,whiteSpace:'nowrap',display:'inline-block',transform:'scaleX('+data.squeeze+')',letterSpacing:0}}>{data.text}</span></div></div>;
}`;

const BLACK_CODE=`export default function EndingBlack({data}){ return <div style={{position:'absolute',inset:0,background:data.color}}/>; }`;

export function normalizeFinish(raw){
 const keys=['mode','projectId','draftId','fps','videos','hero','placements','framing','grades','songResourceId','title','timing'];
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!keys.includes(k))||raw.mode!=='finish')throw Error('Unsupported request');
 const clean=(v,l,max=1000)=>{if(typeof v!=='string'||!v.trim()||v!==v.trim()||v.length>max||/[\u0000-\u001f]/u.test(v))throw Error(l+' is required');return v;};
 const timing=validateTiming(raw.timing),plan=scenePlan(raw.fps??30,timing);
 const media=m=>{if(!m||typeof m!=='object'||!Number.isSafeInteger(m.width)||m.width<1||!Number.isSafeInteger(m.height)||m.height<1)throw Error('Invalid media size');return {resourceId:clean(m.resourceId,'Resource ID'),width:m.width,height:m.height};};
 if(!raw.videos||typeof raw.videos!=='object')throw Error('Choose 26 videos');
 const videos={};for(const s of VIDEO_SLOTS){if(!raw.videos[s])throw Error('Choose a video for '+s);videos[s]=media(raw.videos[s]);}
 const hero=media(raw.hero);
 const title={text:String(raw.title?.text??'TRAVEL').slice(0,40),color:/^#[0-9a-fA-F]{6}$/.test(raw.title?.color||'')?raw.title.color:'#F4C711'};
 if(!Array.isArray(raw.placements)||raw.placements.length!==1||raw.placements.some(p=>!p||!Number.isSafeInteger(p.clipId)||typeof p.trackId!=='string'))throw Error('Expected the hero photo clip');
 const grades=raw.grades&&typeof raw.grades==='object'?raw.grades:{};
 // Every key present (null = centred) so the generated TypeScript never reads a missing property.
 const framing=Object.fromEntries([...VIDEO_SLOTS,'H'].map(k=>{const f=raw.framing?.[k];return [k,f&&Number.isFinite(f.x)&&Number.isFinite(f.y)?{x:Math.min(1,Math.max(0,f.x)),y:Math.min(1,Math.max(0,f.y))}:null];}));
 return {projectId:clean(raw.projectId,'Project ID'),draftId:clean(raw.draftId,'Draft ID',120),fps:plan.fps,videos,hero,title,grades,framing,songResourceId:clean(raw.songResourceId,'Song Resource ID'),timing,placements:raw.placements.map(p=>({clipId:p.clipId,trackId:p.trackId}))};
}

export async function authorFinish(selects,input,plan,CLIP_CODE,TITLE_CODE,BLACK_CODE){
 let commitStarted=false,stage='read';
 try{
  const project=selects.project(input.projectId),d=selects.draft(input.draftId);
  if(!(await project.meta()).draftIds?.includes(input.draftId))throw Error('Draft is not in the selected Project');
  const meta=await d.meta();
  if(meta.fps!==plan.fps||meta.durationFrames!==plan.durationFrames||meta.frameSize?.width!==1080||meta.frameSize?.height!==1920)throw Error('Draft frame grid changed');
  const types=new Map((await project.resources()).map(r=>[r.resourceId,r.type]));
  for(const s of Object.keys(input.videos))if(types.get(input.videos[s].resourceId)!=='Video')throw Error(s+' is not a Video resource');
  if(types.get(input.songResourceId)!=='Audio')throw Error('The song is not an Audio resource');
  const W=1080,H=1920;
  const rectOf=quad=>quad==='full'?{x:0,y:0,width:W,height:H}:{x:(quad[1]==='R'?W/2:0),y:(quad[0]==='B'?H/2:0),width:W/2,height:H/2};
  const shape=(media,rect)=>{const w=media.width,h=media.height,q=Math.min(w/rect.width,h/rect.height),c=Math.min(W/w,H/h);
   return {g:{w,h,mw:rect.width*q,mh:rect.height*q,left:(w-rect.width*q)/2,top:(h-rect.height*q)/2},scale:1/(q*c),position:{x:(rect.x+rect.width/2-W/2)/H*100,y:(H/2-rect.y-rect.height/2)/H*100}};};
  const style=async(clip,media,rect,params,label)=>{
   const s=shape(media,rect);
   await d.setClipTransform({clip,enabled:true,scale:{x:s.scale,y:s.scale},position:s.position,anchor:{x:0,y:0},rotation:0});
   const cur=(await d.clips({trackScope:'all'})).find(c=>c.clipId===clip.clipId&&c.trackId===clip.trackId);
   const f=params.focus||{x:.5,y:.5};
   await d.addVideoEffect({clip:cur,label,tsxCode:CLIP_CODE,parameters:{...params,g:s.g,fps:plan.fps,focusX:f.x,focusY:f.y},editableParameters:[{key:'focusX',label:'Horizontal focus',type:'number',defaultValue:f.x,min:0,max:1,step:.01},{key:'focusY',label:'Vertical focus',type:'number',defaultValue:f.y,min:0,max:1,step:.01}]});
  };
  const quadName=q=>q==='full'?'full':q;
  let n=0;
  for(const c of plan.clips){
   if(c.image)continue;
   stage='place '+c.slot+' at '+c.startFrame;
   const v=input.videos[c.slot];
   const before=new Set((await d.clips({trackScope:'all'})).map(r=>r.clipId+':'+r.trackId));
   await d.overlayResource({resource:project.resource(v.resourceId),over:await d.rangeAtFrames(c.startFrame,c.endFrame),sourceStartSeconds:c.inSeconds});
   const row=(await d.clips({trackScope:'all'})).find(r=>r.resourceId===v.resourceId&&r.startFrame===c.startFrame&&!before.has(r.clipId+':'+r.trackId));
   if(!row)throw Error('Video clip for '+c.slot+' was not placed at frame '+c.startFrame);
   await d.setClipAudio({clip:row,volumeDb:-60});
   const cur=(await d.clips({trackScope:'all'})).find(r=>r.clipId===row.clipId&&r.trackId===row.trackId);
   await style(cur,v,rectOf(quadName(c.quad)),{id:++n,startFrame:c.startFrame,grade:input.grades[c.slot+'@'+c.index]||null,fade:c.fade?[c.fade.startSeconds,c.fade.endSeconds]:null,fadeTo:plan.endColor,focus:input.framing[c.slot]},c.slot+' '+(c.quad==='full'?'':c.quad+' ')+'@'+c.refStart);
  }
  stage='hero';
  const rows=await d.clips({trackScope:'all'});
  const hero=plan.clips.find(c=>c.image);
  const heroRow=rows.find(r=>r.clipId===input.placements[0].clipId&&r.trackId===input.placements[0].trackId);
  if(!heroRow||heroRow.resourceId!==input.hero.resourceId||heroRow.startFrame!==hero.startFrame||heroRow.endFrame!==hero.endFrame)throw Error('Hero photo clip differs from the plan');
  await style(heroRow,input.hero,rectOf('full'),{id:++n,startFrame:hero.startFrame,grade:input.grades['H']||null,focus:input.framing.H},'Hero photo');
  stage='title';
  await d.addMotionGraphic({label:'Title',within:await d.rangeAtFrames(plan.title.startFrame,plan.title.endFrame),tsxCode:TITLE_CODE,
   parameters:{text:input.title.text,color:input.title.color,fontFamily:'Impact',cx:(91+341)/2/432,cy:((313+423)/2+2)/768,w:250/432,h:110*1.0385/768,squeeze:0.6537},
   editableParameters:[{key:'text',label:'Title',type:'text',defaultValue:input.title.text},{key:'color',label:'Colour',type:'color',defaultValue:input.title.color},{key:'fontFamily',label:'Font',type:'text',defaultValue:'Impact'}]});
  stage='ending';
  // The reference holds black after the fade; an empty tail would be dropped from the export.
  if(plan.durationFrames>plan.blackTail)await d.addMotionGraphic({label:'Ending black',within:await d.rangeAtFrames(plan.blackTail,plan.durationFrames),tsxCode:BLACK_CODE,parameters:{color:plan.endColor}});
  stage='song';
  await d.overlayResource({resource:project.resource(input.songResourceId),over:await d.rangeAtFrames(0,plan.durationFrames)});
  commitStarted=true;const saved=await d.commitAll('Finish Travel Beat Vlog Draft');
  if(!saved?.commitId)throw Error('Draft save response did not include its commit ID');
  return {status:'saved',draftId:input.draftId,clips:n};
 }catch(error){return {status:commitStarted?'outcomeUnknown':'notSaved',stage,message:String(error?.message||error),draftId:input?.draftId};}
}

// After the cutout photo is placed above the title, give it the hero's exact framing.
export async function authorCutout(selects,input,plan,CLIP_CODE){
 let stage='cutout';
 try{
  const d=selects.draft(input.draftId);
  const row=(await d.clips({trackScope:'all'})).find(r=>r.clipId===input.cutout.clipId&&r.trackId===input.cutout.trackId);
  if(!row)throw Error('Cutout clip is missing');
  const W=1080,H=1920,w=input.hero.width,h=input.hero.height,q=Math.min(w/W,h/H),c=Math.min(W/w,H/h);
  await d.setClipTransform({clip:row,enabled:true,scale:{x:1/(q*c),y:1/(q*c)},position:{x:0,y:0},anchor:{x:0,y:0},rotation:0});
  const cur=(await d.clips({trackScope:'all'})).find(r=>r.clipId===row.clipId&&r.trackId===row.trackId);
  const f=input.focus||{x:.5,y:.5};
  await d.addVideoEffect({clip:cur,label:'Hero cutout (in front of the title)',tsxCode:CLIP_CODE,parameters:{id:999,startFrame:plan.title.startFrame,fps:plan.fps,g:{w,h,mw:W*q,mh:H*q,left:(w-W*q)/2,top:(h-H*q)/2},grade:input.grade||null,fade:null,focusX:f.x,focusY:f.y}});
  const saved=await d.commitAll('Put the hero cutout in front of the title');
  return {status:saved?.commitId?'saved':'outcomeUnknown'};
 }catch(error){return {status:'notSaved',stage,message:String(error?.message||error)};}
}

export function buildFinishScript(raw){
 const input=normalizeFinish(raw);
 return `const input:any=${JSON.stringify(input)};const plan:any=${JSON.stringify(scenePlan(input.fps,input.timing))};return await (${authorFinish.toString()})(selects,input,plan,${JSON.stringify(CLIP_CODE)},${JSON.stringify(TITLE_CODE)},${JSON.stringify(BLACK_CODE)});`;
}
export function buildCutoutScript(raw){
 const plan=scenePlan(raw.fps??30,raw.timing??REFERENCE_TIMING);
 const input={draftId:String(raw.draftId),cutout:{clipId:raw.cutout.clipId,trackId:String(raw.cutout.trackId)},hero:{width:raw.hero.width,height:raw.hero.height},grade:raw.grade||null,focus:raw.focus||null};
 return `const input:any=${JSON.stringify(input)};const plan:any=${JSON.stringify(plan)};return await (${authorCutout.toString()})(selects,input,plan,${JSON.stringify(CLIP_CODE)});`;
}
