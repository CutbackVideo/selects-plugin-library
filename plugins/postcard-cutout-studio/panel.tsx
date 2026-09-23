// @name Postcard Cutout Studio
// @icon video
// Editable postcard pipeline with immutable HTTP masks and resumable job ledger.
import React,{useEffect,useMemo,useRef,useState} from "react";
// The Draft is named after the postcard's title; if the project already has a
// Draft by that name, the first free 'Title (1)', 'Title (2)', ... is used.
function uniqueDraftName(sdk,pid,title){
  const base=String(title||'').trim()||'Postcard';
  // readFootage lists every Draft's name in one read (38ms for 42 Drafts, where
  // opening each one took 1.2s); any Draft it leaves out is opened by itself.
  return runScript(sdk,`const p=selects.project(${json(pid)});const [ids,footage]=await Promise.all([p.meta().then(m=>m.draftIds),p.readFootage()]);const names=new Set(footage.drafts.map(d=>d.name)),listed=new Set(footage.drafts.map(d=>d.sequenceId));for(const id of ids)if(!listed.has(id))names.add((await selects.draft(id).meta()).name);const base=${json(base)};if(!names.has(base))return base;for(let n=1;;n++){const name=base+' ('+n+')';if(!names.has(name))return name}`,'Name the postcard Draft');
}
async function prepareForegroundResource(sdk,run,justMade=false){
  // Normally made alongside the masks; the helper only has to build it when not.
  const prepared=run.foregroundPath&&run.foregroundVersion===2?run:await helper(sdk,'foreground',{runId:run.runId});
  // The sound effects are project media too, so they go in with the foreground
  // in one import; once a project has them, later postcards reuse them.
  const sfx=Object.entries(run.sfx||{});
  let rows=justMade&&!sfx.length?[]:await readInventory(sdk,run.projectId);
  const missing=[prepared.foregroundPath,...sfx.map(([,s])=>s.path)].filter(path=>!rows.some(x=>x.path===path));
  if(missing.length){
    await runScript(sdk,`return await selects.project(${json(run.projectId)}).importFiles({paths:${json(missing)}});`,'Import postcard foreground and sounds',true);
    rows=await readInventory(sdk,run.projectId);
  }
  const matches=rows.filter(x=>x.path===prepared.foregroundPath);
  if(matches.length!==1||matches[0].resourceId===run.settings.subjectId)throw Error('Distinct cutout Resource was not confirmed; assembly stopped.');
  const sfxIds=Object.fromEntries(sfx.map(([key,s])=>[key,{id:rows.find(x=>x.path===s.path)?.resourceId,duration:s.duration,soundSeconds:s.soundSeconds,sixteenth:s.sixteenth,ticks:s.ticks}]).filter(([,v])=>v.id));
  return {...prepared,foregroundResourceId:matches[0].resourceId,sfxIds};
}
// The ending cuts on every 16th note of the music asset (manifest `sixteenth`),
// each cut placed on absolute frames so 60 of them never drift off the beat.
// The postcard's clock, read frame by frame off the reference reel (cal1star,
// "moving postcards"): panels snap in one by one on a shutter click, the subject
// flashes white and is gone, the picture shuts in three bites, the subtitle and
// then the already-scrambled title land on black, and the ending opens behind
// the title at a steady rate while its footage cuts every 0.125s. The title
// re-rolls on every tick of its sound and its last letter lands on the last one
// (the reference's 12, 4.51-5.42), so nothing ticks over a settled title.
const TIMING={stripFirst:.18,stripEvery:.174,stripEnd:3.58,flashAt:1.43,subjectEnd:1.52,
  closeAt:[2.38,2.87,3.37],closeSlide:.22,subtitleAt:4.06,titleAt:4.51,titleTicks:12,tickEvery:.083,
  revealAt:5.95,revealEnd:13.55,slice:.125,end:13.575};
// One clip per piece of the look, so each can be moved or edited on its own;
// every animation runs on its own clip's clock.
const TITLE=`import React from "react";import{AbsoluteFill,useCurrentFrame,useVideoConfig}from"remotion";const G="ABCDEFGHIJKLMNOPQRSTUVWXYZ";export default function Title({data}){const f=useCurrentFrame(),{fps,width,height}=useVideoConfig(),k=Math.min(width/1920,height/1080),s=f/fps,settle=Number(data.settleSeconds||.913),tick=Number(data.tickSeconds||.083),t=(v=>data.upper===false?v:v.toUpperCase())(String(data.title||"SWITZERLAND")),n=Math.max(1,t.length-1),seed=i=>{const v=Math.sin((i+1)*78.233)*43758.5453;return v-Math.floor(v)},steps=Math.max(1,Math.round(settle/tick)),order=i=>.2+.8*(.7*i/n+.3*seed(i)),last=Math.max(0,...Array.from(t).map((c,i)=>c===" "?0:order(i)))||1,lockAt=i=>tick*Math.max(1,Math.round(steps*order(i)/last)),roll=Math.floor(s/tick),shown=Array.from(t).map((c,i)=>c===" "||s>=lockAt(i)?c:G[Math.floor(seed(i*31+roll)*G.length)]).join(""),fam=String(data.fontFamily||"").trim(),ff=(fam?'"'+fam+'", ':"")+'"DIN Condensed","Bahnschrift Condensed","Arial Narrow",sans-serif';return <AbsoluteFill style={{pointerEvents:"none"}}><div style={{position:"absolute",top:Number(data.titleY??49)+"%",left:Number(data.titleX??50)+"%",transform:"translateX(-50%)",color:String(data.titleColor||"#ed0000"),fontFamily:ff,fontSize:Number(data.titleSize||244)*k,fontWeight:700,lineHeight:1,whiteSpace:"nowrap"}}>{shown}</div></AbsoluteFill>}`;
// The subtitle spans the title: first words at its left edge, the last word at
// its right, measured off an invisible copy of the title.
const SUBTITLE=`import React from "react";import{AbsoluteFill,useVideoConfig}from"remotion";export default function Subtitle({data}){const{width,height}=useVideoConfig(),k=Math.min(width/1920,height/1080),words=String(data.subtitle||"moving postcards from").trim().split(/\\s+/),last=words.length>1?words.pop():"",first=words.join(" "),fam=String(data.fontFamily||"").trim(),ff=(fam?'"'+fam+'", ':"")+'"DIN Condensed","Bahnschrift Condensed","Arial Narrow",sans-serif',small=Number(data.subtitleSize||60)*k,big=Number(data.titleSize||244)*k,lift=Math.max(small*.05,big*.172-small*.183);return <AbsoluteFill style={{pointerEvents:"none"}}><div style={{position:"absolute",top:Number(data.titleY??49)+"%",left:Number(data.titleX??50)+"%",transform:"translateX(-50%)",display:"flex",flexDirection:"column",width:"max-content"}}><div style={{height:0,display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:small*.28,padding:"0 "+big*.088+"px",transform:"translateY("+(-lift)+"px)",color:String(data.subtitleColor||"#f5f3f5"),fontFamily:'"Avenir Next","Helvetica Neue",Arial,sans-serif',fontWeight:400,fontSize:small,lineHeight:1,whiteSpace:"nowrap"}}><span>{first}</span><span>{last}</span></div><div style={{visibility:"hidden",fontFamily:ff,fontSize:big,fontWeight:700,lineHeight:1,whiteSpace:"nowrap"}}>{(v=>data.upper===false?v:v.toUpperCase())(String(data.title||"SWITZERLAND"))}</div></div></AbsoluteFill>}`;
const PANEL=`import React from "react";import{AbsoluteFill,interpolate,useCurrentFrame,useVideoConfig}from"remotion";export default function P({Source,data}){const f=useCurrentFrame(),{fps}=useVideoConfig(),secs=Number(data.revealSeconds||0),p=secs>0?interpolate(f,[0,fps*secs],[0,1],{extrapolateLeft:"clamp",extrapolateRight:"clamp"}):1,l=Number(data.leftPct||0),r=l+(Number(data.rightPct||100)-l)*p;return <AbsoluteFill style={{clipPath:"inset(0 "+(100-r)+"% 0 "+l+"%)"}}><Source/></AbsoluteFill>}`;
// One bite of the close: the bars slide from one height to the next, then hold.
const CLOSE=`import React from "react";import{AbsoluteFill,useCurrentFrame,useVideoConfig}from"remotion";export default function Close({data}){const f=useCurrentFrame(),{fps}=useVideoConfig(),p=Math.max(0,Math.min(1,f/fps/Number(data.slideSeconds||.22))),from=Number(data.from??0),to=Number(data.to??1),h=(from+(to-from)*p)*50;if(h<=0)return null;return <AbsoluteFill style={{pointerEvents:"none"}}><div style={{position:"absolute",inset:"0 0 auto 0",height:h+"%",background:"#000"}}/><div style={{position:"absolute",inset:"auto 0 0 0",height:h+"%",background:"#000"}}/></AbsoluteFill>}`;
// The slit behind the title, opening at a steady rate.
const REVEAL=`import React from "react";import{AbsoluteFill,useCurrentFrame,useVideoConfig}from"remotion";export default function Reveal({data}){const f=useCurrentFrame(),{fps}=useVideoConfig(),h=(1-Math.max(0,Math.min(1,f/fps/Number(data.openSeconds||7.6))))*50;if(h<=0)return null;return <AbsoluteFill style={{pointerEvents:"none"}}><div style={{position:"absolute",inset:"0 0 auto 0",height:h+"%",background:"#000"}}/><div style={{position:"absolute",inset:"auto 0 0 0",height:h+"%",background:"#000"}}/></AbsoluteFill>}`;
const VERSION='0.2.0-alpha.3';
const LOG_ROOT='';
const HELPER='"$HOME/.selects/panels/postcard-cutout-studio/pipeline.py"';
const DEFAULTS={subjectId:'',subjectStartSec:0,bgIds:['','',''],photoIds:['','',''],title:'SWITZERLAND',upperTitle:true,subtitle:'moving postcards from',fontFamily:'DIN Condensed',titleColor:'#ed0000',subtitleColor:'#f5f3f5',aspect:'landscape',fitMode:'cover',forceNew:false,autoExport:false};
const json=JSON.stringify,quote=x=>"'"+String(x).replace(/'/g,"'\\''")+"'",sleep=ms=>new Promise(r=>setTimeout(r,ms));
const MAX_SUBJECT=1,MAX_PANELS=6,MAX_ENDING=12;
// The subject is on screen until the flash is over; the cutout check also
// compares the window half a second later, so a short clip is held to 2.1s.
const SUBJECT_SECONDS=TIMING.subjectEnd,SUBJECT_HOLD=2.1;
// Up to ~10 minutes of checks, 0.5s apart, before the run stops waiting.
const GENERATION_CHECKS=1200,GENERATION_POLL_MS=500;
const isVideo=x=>/\.(mp4|mov|mkv|webm|m4v)$/i.test(x.path),isPhoto=x=>/\.(png|jpe?g|webp)$/i.test(x.path),isSubject=x=>isVideo(x)&&!/^(?:subject_cutout_|postcard_cutout_|Cutout Foreground - )/i.test(x.name)&&!/reference|template|base_no_title|swiss-postcard-black-base/i.test(x.name);
function layout(s,size){const w=Number(size?.width),h=Number(size?.height);if(!(w>0&&h>0))throw Error('Could not read the source video dimensions.');const [width,height]=({original:[w,h],landscape:[1920,1080],portrait:[1080,1920],square:[1080,1080]})[s.aspect]||[1920,1080];return{width,height,scale:s.fitMode==='contain'?1:Math.max(width/w,height/h)/Math.min(width/w,height/h)}}
const MASK=`import React from 'react';import{AbsoluteFill,Img,useCurrentFrame,useVideoConfig}from'remotion';export default function Mask({Source,data}){const f=useCurrentFrame(),{fps}=useVideoConfig(),t=f/fps+Number(data.sourceStartSeconds||0),i=Math.round(t*data.maskFps);if(i<0||i>=data.count)return null;const url=data.baseUrl+'/mask_'+String(i+1).padStart(6,'0')+'.png',white=!!data.white;return <AbsoluteFill style={{filter:white?'brightness(0) invert(1)':'none'}}><Img src={url} style={{position:'absolute',width:'100%',height:'100%',opacity:0}}/><AbsoluteFill style={{maskImage:'url("'+url+'")',maskMode:'luminance',maskSize:'100% 100%',maskRepeat:'no-repeat'}}><Source/></AbsoluteFill></AbsoluteFill>}`;
async function runScript(sdk,script,summary,allowCommit=false){const t0=performance.now(),r=await sdk.runScript({script,summary,allowCommit});traceStep('script: '+summary,t0);if(r.isError)throw Error(r.output||'Could not complete this action.');if(r.result==null)throw Error('The response was too large. Refresh your media and try again.');return r.result}
// Each host round trip is timed so a run's log shows where its seconds went.
// A media row with the size it is shown at, when the helper could read one.
function sized(row,size){return row&&size?.width&&size?.height?{...row,frameSize:size}:row}
function traceStep(label,t0){(window.__postcardTrace??=[]).push([label,Math.round(t0-(window.__postcardTraceStart||t0)),Math.round(performance.now()-t0)])}
async function helper(sdk,op,args={}){const t0=performance.now(),r=await sdk.runShell({summary:'Postcard '+op,command:`python3 ${HELPER} ${quote(op)} ${quote(json(args))}`,timeoutMs:180000,maxOutputBytes:49152});traceStep('shell: '+op,t0);if(r.isError||r.exitCode!==0)throw Error(r.stderr||r.output||'Helper failed');return JSON.parse(r.stdout)}
function inventoryCode(pid,offset=0){return `const p=selects.project(${json(pid)});const rs=await p.resources();let sf,warning='';try{sf=await p.sourceFiles()}catch{sf=await p.sourceFiles({folder:'(root)'});warning='Only top-level media could be loaded. Refresh media to retry the full library.'}const flat=(ns,o=[])=>{for(const n of ns||[])n.type==='dir'?flat(n.children,o):n.path&&o.push(n);return o};let fs=[];if('fileTree'in sf)fs=flat(sf.fileTree);else for(const f of sf.folders||[]){const s=await p.sourceFiles({folder:f.name});if('fileTree'in s)fs.push(...flat(s.fileTree))}const by=new Map(fs.map(f=>[f.resourceId,f]));const inventory=rs.flatMap(r=>{const f=by.get(r.resourceId);return f?.path?[{resourceId:r.resourceId,name:r.name,path:f.path,durationSeconds:r.durationSeconds||f.durationSeconds||null,frameSize:f.frameSize||null,frameRate:f.frameRate||null}]:[]});return {rows:inventory.slice(${offset},${offset+32}),total:inventory.length,warning}`}
// A sound with takes in the manifest (`panel.1`..`panel.6`, `curtain.1`..) gets a
// different take on each hit, as the reference never repeats one; others play as-is.
// Every clip but the subject shares the ending. A photo is one shot; a video
// gives one shot per 0.6s of its length, spread from start to end and played in
// order. Past that a video still gives new frames, closer together, so a photo
// repeats only when there is no video; and no clip plays twice running while
// another is left.
function planEnding(pool,slots){
  const items=pool.map((row,k)=>{const d=Number(row?.durationSeconds)||0,video=row?.kind!=='photo'&&d>.6;return{id:row?.resourceId,k,d,video,cap:video?Math.max(1,Math.floor((d-.5)/.6)):1,count:0}}).filter(it=>it.id);
  if(!items.length)return[];
  let left=slots;
  for(const it of items){if(left<=0)break;it.count++;left--}
  const videos=items.filter(it=>it.video);
  while(left>0){const fresh=items.filter(it=>it.count<it.cap),from=fresh.length?fresh:videos.length?videos:items;from.sort((a,b)=>a.count/a.cap-b.count/b.cap||a.count-b.count||a.k-b.k);from[0].count++;left--}
  const queues=items.map(it=>Array.from({length:it.count},(_,j)=>({id:it.id,k:it.k,at:it.video?Math.round((.2+Math.max(0,it.d-.65)*(it.count>1?j/(it.count-1):.5))*1000)/1000:0})));
  const total=items.reduce((n,it)=>n+it.count,0),credit=items.map(()=>0),out=[];
  for(let n=0;n<total;n++){
    const live=items.map((_,i)=>i).filter(i=>queues[i].length);
    live.forEach(i=>credit[i]+=items[i].count);
    live.sort((a,b)=>credit[b]-credit[a]||a-b);
    let pick=live[0];
    if(out.length&&out[out.length-1].k===items[pick].k&&live.length>1)pick=live[1];
    credit[pick]-=total;out.push(queues[pick].shift());
  }
  return out.map(({id,at})=>({id,at}));
}
// A panel's strip is cut inside the clip's own picture (the effect runs before
// the clip is scaled and moved), so the frame's strip is given in that
// picture's terms: the clip is centred on its strip, and the strip is its middle.
function makeAssembly(run){const s=run.settings,shape=layout(s,run.source.frameSize);const titleDefs=[{key:'title',label:'Title',type:'text',defaultValue:s.title},{key:'upper',label:'All caps',type:'boolean',defaultValue:s.upperTitle!==false},{key:'fontFamily',label:'Font',type:'text',defaultValue:s.fontFamily},{key:'titleColor',label:'Color',type:'color',defaultValue:s.titleColor},{key:'titleSize',label:'Size',type:'number',defaultValue:244,min:120,max:360,step:1}],subtitleDefs=[{key:'subtitle',label:'Subtitle',type:'text',defaultValue:s.subtitle},{key:'subtitleColor',label:'Color',type:'color',defaultValue:s.subtitleColor},{key:'subtitleSize',label:'Size',type:'number',defaultValue:60,min:32,max:160,step:1}];
return `const cfg=${json({projectId:run.projectId,name:run.draftName,s,shape,mask:run.mask,rvmResourceId:run.foregroundResourceId||run.rvmResourceId||null,backgroundSizes:run.backgrounds?.map(x=>x?.frameSize||null),subjectSize:run.source.frameSize||null,box:run.mask?.box||null,endingPlan:planEnding(run.ending||[],Math.round((TIMING.end-TIMING.revealAt)/(Number(run.sfxIds?.music?.sixteenth)||TIMING.slice))),endingSizeById:Object.fromEntries((run.ending||[]).map(x=>[x?.resourceId,x?.frameSize||null])),sfx:run.sfxIds||{},T:TIMING})};const T=cfg.T,SFX:Record<string,any>=cfg.sfx,FW=cfg.shape.width,FH=cfg.shape.height;const fill=(sz:any,w:number,h:number)=>{const fit=Math.min(FW/sz.width,FH/sz.height);return Math.max(1,w/(sz.width*fit),h/(sz.height*fit))};const subPos=(()=>{const sz:any=cfg.subjectSize,b:any=cfg.box,k=cfg.shape.scale;if(!sz?.width||!sz?.height||!b)return{x:0,y:0};const f=Math.min(FW/sz.width,FH/sz.height),dw=sz.width*f*k,dh=sz.height*f*k,mx=Math.max(0,(dw-FW)/2),my=Math.max(0,(dh-FH)/2),clamp=(v:number,m:number)=>Math.max(-m,Math.min(m,v)),right=-((b.x0+b.x1)/2-.5)*dw,down=(b.y1-b.y0)*dh<=.92*FH?-((b.y0+b.y1)/2-.5)*dh:-.46*FH-(b.y0-.5)*dh;return{x:clamp(right,mx)/FH*100,y:-clamp(down,my)/FH*100}})();const p=selects.project(cfg.projectId),d=await p.createDraft({name:cfg.name});const source=cfg.s.subjectId,start=cfg.s.subjectStartSec;await d.insertResource({resourceId:source,sourceRange:{startSeconds:start,endSeconds:start+T.subjectEnd}});await d.setFrameSize({width:cfg.shape.width,height:cfg.shape.height});const all=()=>d.clips({trackScope:'all'});let sub=(await d.clips({trackScope:'main'})).find(c=>c.resourceId===source);if(!sub)throw Error('Subject missing');await d.setClipColor({clips:sub,color:'blue'});sub=(await all()).find(c=>c.clipId===sub.clipId);if(!sub)throw Error('Subject refresh failed');await d.setClipTransform({clip:sub,scale:{x:cfg.shape.scale,y:cfg.shape.scale},position:subPos});await d.insertGap({seconds:T.revealAt-T.subjectEnd});const six=Number(SFX.music?.sixteenth)||T.slice,rate=(await d.meta()).fps,plan=cfg.endingPlan,endIds=new Set(plan.map(x=>x.id)),ES:Record<string,any>=cfg.endingSizeById;for(let i=0;i<plan.length;i++){const len=(Math.round((i+1)*six*rate)-Math.round(i*six*rate))/rate,at=plan[i].at;await d.insertResource({resourceId:plan[i].id,sourceRange:{startSeconds:at,endSeconds:at+len}});}let main=await d.clips({trackScope:'main'});const photos=main.filter(c=>endIds.has(c.resourceId));await d.setClipColor({clips:photos,color:'orange'});main=await d.clips({trackScope:'main'});for(const {id,rid} of main.filter(c=>endIds.has(c.resourceId)).map(c=>({id:c.clipId,rid:String(c.resourceId)}))){const sz:any=ES[rid];if(!sz?.width||!sz?.height)continue;const k=fill(sz,FW,FH);if(k<=1.0001)continue;const c=(await d.clips({trackScope:'main'})).find(x=>x.clipId===id);if(c)await d.setClipTransform({clip:c,scale:{x:k,y:k}})}const fps=(await d.meta()).fps,END=main.reduce((n,c)=>Math.max(n,c.endFrame),0),at=t=>Math.min(END,Math.round(t*fps)),REVEAL_AT=Math.min(...photos.map(c=>c.startFrame));async function over(id,a,b,ss,color){const before=new Set((await all()).map(c=>c.clipId));await d.overlayResource({resource:p.resource(id),over:await d.rangeAtFrames(a,b),sourceStartSeconds:ss});const c=(await all()).find(c=>!before.has(c.clipId)&&c.resourceId===id);if(!c)throw Error('Overlay missing');await d.setClipColor({clips:c,color});return(await all()).find(x=>x.clipId===c.clipId)||c}for(let i=0;i<cfg.s.bgIds.length;i++){let c=await over(cfg.s.bgIds[i],at(T.stripFirst+T.stripEvery*i),at(T.stripEnd),0,'green');const sz:any=cfg.backgroundSizes?.[i],n=cfg.s.bgIds.length,strip=FW/n;let lp=i*100/n,rp=(i+1)*100/n;if(sz?.width&&sz?.height){const k=fill(sz,strip,FH),dw=sz.width*Math.min(FW/sz.width,FH/sz.height)*k;await d.setClipTransform({clip:c,scale:{x:k,y:k},position:{x:((i+.5)*strip-FW/2)/FH*100,y:0}});lp=(dw-strip)/2/dw*100;rp=(dw+strip)/2/dw*100}c=(await all()).find(x=>x.clipId===c.clipId)||c;await d.addVideoEffect({clip:c,label:'Panel '+(i+1)+' Reveal',tsxCode:${json(PANEL)},parameters:{leftPct:lp,rightPct:rp,revealSeconds:0}})}if(!cfg.rvmResourceId||cfg.rvmResourceId===source)throw Error('A distinct cutout Resource is required');const maskParams={baseUrl:cfg.mask.baseUrl,maskFps:cfg.mask.fps,count:cfg.mask.count};async function cutout(a,b,label,white){let c=await over(cfg.rvmResourceId,a,b,a/fps,'violet');await d.setClipTransform({clip:c,scale:{x:cfg.shape.scale,y:cfg.shape.scale},position:subPos});c=(await all()).find(x=>x.clipId===c.clipId)||c;await d.addVideoEffect({clip:c,label,tsxCode:${json(MASK)},parameters:{...maskParams,sourceStartSeconds:a/fps,white}});return c}await cutout(0,at(T.flashAt),'Cutout',false);await cutout(at(T.flashAt),at(T.subjectEnd),'White flash',true);const graphics=[];for(let k=0;k<T.closeAt.length;k++){const a=at(T.closeAt[k]),b=k+1<T.closeAt.length?at(T.closeAt[k+1]):REVEAL_AT;graphics.push(await d.addMotionGraphic({label:'Close '+(k+1),tsxCode:${json(CLOSE)},parameters:{from:k/T.closeAt.length,to:(k+1)/T.closeAt.length,slideSeconds:T.closeSlide},within:await d.rangeAtFrames(a,b)}))}graphics.push(await d.addMotionGraphic({label:'Reveal',tsxCode:${json(REVEAL)},parameters:{openSeconds:T.revealEnd-T.revealAt},within:await d.rangeAtFrames(REVEAL_AT,END)}));const look={title:cfg.s.title,upper:cfg.s.upperTitle!==false,fontFamily:cfg.s.fontFamily,titleColor:cfg.s.titleColor,titleSize:244,titleX:50,titleY:49};graphics.push(await d.addMotionGraphic({label:'Subtitle',tsxCode:${json(SUBTITLE)},parameters:{...look,subtitle:cfg.s.subtitle,subtitleColor:cfg.s.subtitleColor,subtitleSize:60},editableParameters:${json(subtitleDefs)},within:await d.rangeAtFrames(at(T.subtitleAt),END)}));graphics.push(await d.addMotionGraphic({label:'Title',tsxCode:${json(TITLE)},parameters:{...look,tickSeconds:T.tickEvery,settleSeconds:((Number(SFX.scramble?.ticks)||T.titleTicks)-1)*T.tickEvery},editableParameters:${json(titleDefs)},within:await d.rangeAtFrames(at(T.titleAt),END)}));await d.setClipColor({clips:(await all()).filter(c=>graphics.some(g=>g.clipId===c.clipId)),color:'red'});const hits=[...cfg.s.bgIds.map((_,i)=>['panel',T.stripFirst+T.stripEvery*i,i]),...T.closeAt.map((t,i)=>['curtain',t,i]),['title',T.subtitleAt,0],['scramble',T.titleAt,0]],takes=key=>Object.keys(SFX).filter(k=>k===key||k.startsWith(key+'.')).sort().map(k=>SFX[k]);for(const [key,t,n] of [...hits,['tone',0,0],['riser',T.flashAt-.5,0]]){const v=takes(String(key)),s=v[Number(n)%Math.max(1,v.length)];if(!s?.id)continue;const a=at(t),len=Math.min(Math.floor(s.duration*fps),Math.ceil((s.soundSeconds||s.duration)*fps));await over(s.id,a,Math.min(END,a+len),0,'yellow')}if(SFX.music?.id)await over(SFX.music.id,REVEAL_AT,Math.min(END,REVEAL_AT+Math.floor(SFX.music.duration*fps)),0,'yellow');const commit=await d.commitAll('postcard-cutout-studio: immutable mask assets and one assembly commit');if(!commit.createdDraftId)throw Error('Created Draft id missing');const saved=selects.draft(commit.createdDraftId),[m,clips]=await Promise.all([saved.meta(),saved.clips({trackScope:'all'})]);return{draftId:commit.createdDraftId,commit,meta:m,clipCount:clips.length,mainCount:clips.filter(c=>c.trackKind==='main').length,graphics:clips.filter(c=>c.resourceId===null).map(c=>({clipId:c.clipId,startFrame:c.startFrame,endFrame:c.endFrame})),scale:cfg.shape.scale}`}
export default function PostcardPanel(props){return <PostcardEditor key={props.context.projectId || 'none'} {...props}/>}
function PostcardEditor({sdk,context,ui}){
const [s,setS]=useState({...DEFAULTS,bgIds:[],photoIds:[],aspect:'original',title:'MY POSTCARD'}),[rows,setRows]=useState([]),[loading,setLoading]=useState(false),[hydrated,setHydrated]=useState(true),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[run,setRun]=useState(null),[duration,setDuration]=useState(0),[sourceError,setSourceError]=useState(false),[preview,setPreview]=useState([]);
const busyRef=useRef(false),projectRef=useRef(context.projectId);projectRef.current=context.projectId;
const byId=useMemo(()=>new Map(rows.map(x=>[x.resourceId,x])),[rows]),subject=byId.get(s.subjectId),videos=rows.filter(isSubject),images=rows.filter(isPhoto),change=(key,value)=>{dirty.current=true;setS(old=>({...old,[key]:value,forceNew:false,autoExport:false}));};

const [error,setError]=useState(''),[tab,setTab]=useState('all'),[query,setQuery]=useState(''),[page,setPage]=useState(0),[customize,setCustomize]=useState(false);
const [thumbs,setThumbs]=useState({}),[strips,setStrips]=useState({}),[scrub,setScrub]=useState(null);
const [badgeHover,setBadgeHover]=useState(null);
const stripAsked=useRef(new Set()),hoverTimer=useRef(0);
const [folder,setFolder]=useState(null),[folderIds,setFolderIds]=useState([]),[selection,setSelection]=useState([]),[picking,setPicking]=useState(false);
const folderBusy=useRef(false);
async function readFolder(path,offset=0,search=''){
  setLoading(true);setError('');
  try{
    const result=await helper(sdk,'folder-media',{path,offset,query:search});guard(context.projectId);
    setRows(old=>{const byPath=new Map(old.map(row=>[row.path,row]));return [...byPath.values(),...result.rows.filter(row=>!byPath.has(row.path))]});
    setFolderIds(result.rows.map(row=>rows.find(old=>old.path===row.path)?.resourceId||row.resourceId));
    setFolder(result);setPage(offset/24);
  }catch(e){setError('Could not open this folder.');setStatus(String(e.message||e));}
  finally{setLoading(false);}
}
// A new folder is a fresh start. Picks used to carry over when the folder
// changed, and the grid then showed only the new folder while the count still
// held clips from the old one — selections nobody could see or undo. A
// finished postcard is let go too (its Draft stays in the project); the title
// stays.
function clearPicks(){
  setSelection([]);setCustomize(false);
  setS(old=>({...old,subjectId:'',subjectStartSec:0,bgIds:[],photoIds:[]}));
  if(run&&!active)setRun(null);
}
// Back to the start screen. Nothing can be let go while a postcard is being made.
function startOver(){
  if(folderBusy.current||busyRef.current||locked)return;
  setError('');setStatus('');setQuery('');setPage(0);
  setFolder(null);setFolderIds([]);clearPicks();
}
async function chooseFolder(){
  if(folderBusy.current||busyRef.current||locked)return;
  folderBusy.current=true;setPicking(true);setError('');
  try{
    const picker=window.parent?.__DI__?.CutbackMediaPicker;
    if(typeof picker?.pickDirectoryPath!=='function'||(typeof picker.isAvailablePickDirectoryPath==='function'&&!picker.isAvailablePickDirectoryPath()))throw Error('This app version does not support choosing folders. Drop a folder here, or update Selects.');
    const path=await picker.pickDirectoryPath();guard(context.projectId);
    if(path){setQuery('');await readFolder(path);}
  }catch(e){setError('Could not choose a folder.');setStatus(String(e.message||e));}
  finally{folderBusy.current=false;setPicking(false);}
}
async function dropFolder(event){
  event.preventDefault();
  if(folderBusy.current||busyRef.current||locked)return;
  const files=event.dataTransfer.files;
  if(files.length!==1){setError('Drop one folder at a time. Your selections will be kept.');return;}
  folderBusy.current=true;setPicking(true);setError('');
  try{const path=await droppedFolderPath(files[0]);guard(context.projectId);if(!path)throw Error('Drop a folder saved on this computer.');setQuery('');clearPicks();await readFolder(path);}
  catch(e){setError('Could not open the dropped folder.');setStatus(String(e.message||e));}
  finally{folderBusy.current=false;setPicking(false);}
}

const dirty=useRef(false);
useEffect(()=>()=>{projectRef.current=null},[]);
useEffect(()=>{let alive=true;setSourceError(false);setPreview([]);setDuration(Number(subject?.durationSeconds)||0);if(!subject?.path)return;const path=subject.path;(async()=>{try{const r=await sdk.runShell({summary:'Probe subject duration',command:`ffprobe -v error -select_streams v:0 -show_entries format=duration:stream=width,height -of json ${quote(path)}`,timeoutMs:15000,maxOutputBytes:2000});if(r.isError||r.exitCode!==0)throw Error(r.stderr);const info=JSON.parse(r.stdout),d=Number(info.format?.duration)||Number(subject.durationSeconds)||0;if(!alive)return;setDuration(d);setRows(old=>old.map(row=>row.path===path?{...row,durationSeconds:d,frameSize:{width:info.streams?.[0]?.width,height:info.streams?.[0]?.height}}:row));}catch(e){if(alive){setSourceError(true);setStatus('Preview: '+e.message)}}})();return()=>{alive=false}},[subject?.path]);
useEffect(()=>{let alive=true;if(!customize||!subject?.path||!duration)return;const t=setTimeout(async()=>{try{const r=await sdk.runShell({summary:'Preview selected range',command:`python3 "$HOME/.selects/skills/postcard-cutout-studio/scene_preview.py" ${quote(subject.path)} ${s.subjectStartSec} ${Math.min(duration,s.subjectStartSec+8.5)} 4`,timeoutMs:30000,maxOutputBytes:49152});if(alive&&r.exitCode===0)setPreview(JSON.parse(r.stdout).frames||[])}catch(e){if(alive)setStatus(e.message)}},250);return()=>{alive=false;clearTimeout(t)}},[subject?.path,duration,s.subjectStartSec,customize]);
async function persist(r,patch,stage,status='end',details={}){const next=await helper(sdk,'update',{runId:r.runId,patch,stage,status,details});setRun(next);return next}
function guard(pid){if(projectRef.current!==pid)throw Error('The Project changed. Stopped without resubmitting the current operation.')}
async function claim(r,expected,patch,stage,details){const x=await helper(sdk,'claim',{runId:r.runId,expected,patch,stage,details});if(!x.claimed)throw Error('Another run already started this step. Resume that run without starting a new generation.');setRun(x.run);return x.run}
// Background removal goes through the app's own generation service - the path
// the built-in Generate video/audio tools use - rather than asking the AI to
// call generate_media. Those AI round trips (model lookup, upload, submit, then
// a status check that often came back "still running") took about five of a
// run's six minutes; the provider itself needs well under one.
const BRIA_MODEL_ID='model_v1_YnJpYS92aWRlby9iYWNrZ3JvdW5kLXJlbW92YWwvdjM';
// The cutout is only on screen until the flash (TIMING.subjectEnd), so a little
// more than that is all that is sent; the provider bills and works by the second.
const CUTOUT_SECONDS=1.6;
function appServices(){const di=window.parent?.__DI__;if(!di?.MediaGeneration?.isAvailable?.())throw Error('This version of Selects cannot remove backgrounds from a panel. Update Selects.');return di;}
function generationScope(pid){
  const m=String(window.parent?.location?.pathname||'').match(/\/libraries\/([^/]+)\/projects\/([^/]+)/);
  const libraryId=(m&&decodeURIComponent(m[2])===pid?decodeURIComponent(m[1]):null)||window.parent?.__DI__?.SequenceState?.getOnScreenTab?.()?.libraryId;
  if(!libraryId)throw Error('Could not tell which library this project is in. Reopen the project and try again.');
  return {libraryId,projectId:pid};
}
// The app's services speak in its own resource ids, which share nothing with
// the run_script aliases the rest of this panel uses; the file path joins them.
async function appResourceIdForPath(di,scope,path){
  const ids=(await di.ProjectRepository.findById(scope.libraryId,scope.projectId)).getResources();
  for(const id of ids){const res=await di.ResourceRepository.findById(scope.libraryId,id);if(res?.getVideoSources?.()?.some(v=>v.path===path))return id;}
  throw Error('Could not find the subject clip in this project.');
}
async function appResourcePath(di,scope,id){
  const res=await di.ResourceRepository.findById(scope.libraryId,id);
  const path=res?.getVideoSources?.()?.find(v=>v.path)?.path;
  if(!path)throw Error('The background-removed clip was imported, but its file could not be found.');
  return path;
}
async function generation(r,collect=false){guard(r.projectId);const di=appServices(),mg=di.MediaGeneration;
if(!collect){
  if(r.phase!=='generationSubmitting')r=await claim(r,['ready'],{phase:'generationSubmitting',generationStartedMs:Date.now()},'generation');
  const scope=generationScope(r.projectId);
  // The exact stretch goes up as its own file: given a whole clip and a range,
  // the app re-encodes the range on one thread first (about 8s).
  const cut=r.cutoutInput?.path?r.cutoutInput:await helper(sdk,'cutout-input',{path:r.source.path,start:Number(r.settings.subjectStartSec)||0,seconds:CUTOUT_SECONDS});
  let resourceId=await appResourceIdForPath(di,scope,cut.path).catch(()=>null);
  if(!resourceId){
    await runScript(sdk,'return await selects.project('+json(r.projectId)+').importFiles({paths:'+json([cut.path])+'});','Register postcard cutout input',true);
    for(let i=0;!resourceId&&i<10;i++){resourceId=await appResourceIdForPath(di,scope,cut.path).catch(()=>null);if(!resourceId)await sleep(300);}
    if(!resourceId)throw Error('Could not find the subject clip in this project.');
  }
  // The key is fixed per run, so submitting again after a crash returns the
  // same job instead of paying for a second one. VP9 carries the alpha at about
  // 1MB where ProRes 4444 was 290MB (a 16s download); its mask measured 48dB
  // PSNR / 0.9994 SSIM against the ProRes one.
  const {jobIds}=await mg.submit({scope,key:'pc-'+r.runId,modelId:BRIA_MODEL_ID,
    input:{video_url:'selects-input:source',background_color:'Transparent',output_container_and_codec:'webm_vp9',auto_zoom:false,preserve_audio:false},
    uploads:{source:{resourceId}},
    outputName:'postcard_cutout_'+r.runId,batch:1,origin:{tool:'video',tab:'postcard',recipeId:'postcard-cutout'}});
  const jobId=jobIds?.[0];
  if(!/^selects-[a-f0-9]{64}$/.test(jobId||''))throw Error('The app did not return a background-removal job.');
  return persist(r,{generation:{jobId,scope,modelId:BRIA_MODEL_ID,submittedAt:new Date().toISOString(),status:'submitted',deliveredBy:'media-generation'},phase:'generationPending'},'generation','pending',{jobId});
}
const gen=r.generation||{};
if(!/^selects-[a-f0-9]{64}$/.test(gen.jobId||''))throw Error('No generation job ID is available. Stopped without submitting a duplicate.');
const scope=gen.scope||generationScope(r.projectId);
const job=(await mg.list(scope)).find(j=>j.jobId===gen.jobId);
if(!job)return r;
// Where the wait goes (preparing, uploading, queued...), kept for the log.
const trail=(window.__postcardTrail??=new Map()),steps=trail.get(gen.jobId)||[],step=job.status+'/'+job.deliveryStatus;
if(steps[steps.length-1]?.[1]!==step)trail.set(gen.jobId,[...steps,[Date.now(),step]]);
if(['failed','canceled','cancelled'].includes(job.status)){const failed={...gen,status:job.status,error:job.errorCode||job.status};await persist(r,{generation:failed,phase:'generationFailed'},'generation','failed',{generation:failed});throw Error('Background removal '+job.status+(job.errorCode?' ('+job.errorCode+')':'')+'.');}
const out=(job.outputs||[]).find(o=>o.resourceId);
if(!out&&job.status!=='succeeded')return r;
// Background removal finishes with no delivered outputs (the app lists none
// for this model), so take the clip straight from the app's job journal.
const cutoutPath=out?await appResourcePath(di,scope,out.resourceId):(await helper(sdk,'fetch-result',{jobId:gen.jobId,dest:r.logDir+'/cutout.webm'}).catch(()=>null))?.path;
if(!cutoutPath)return r;
// Recorded by the next step ('prepare') in the same call that starts it; if
// that never runs, the next check finds the job done and the clip on disk.
const done={...gen,status:'succeeded',resourceId:out?.resourceId??null,cutoutPath,chargedCredits:job.chargedCredits??null};
return {...r,generation:done,phase:'cutoutReady',finished:{durationMs:Date.now()-(r.generationStartedMs||Date.now()),jobId:gen.jobId,chargedCredits:job.chargedCredits??null,trail:trail.get(gen.jobId)||[]}};
}
async function exportRun(r){guard(r.projectId);await helper(sdk,'ensure');
if(r.phase==='draftReady'){r=await claim(r,['draftReady'],{phase:'exportSubmitting',exportStartedMs:Date.now()},'export');const outPath=r.logDir+'/final.mp4';const result=await runScript(sdk,`const e=await selects.export.video({projectId:${json(r.projectId)},draftSequenceId:${json(r.draftId)},outPath:${json(outPath)},resolution:'FHD'});return{workflowId:e.workflowId,outPath:${json(outPath)}}`,'Start postcard Export',true);r=await persist(r,{phase:'exportPending',export:result},'export','submitted',result)}
if(r.phase!=='exportPending')throw Error('The panel will not resubmit an Export with an uncertain submission state. Inspect the run log.');
for(let i=0;i<90;i++){guard(r.projectId);const w=await runScript(sdk,`return(await selects.project(${json(r.projectId)}).workflows()).find(w=>w.workflowId===${json(r.export.workflowId)})||{status:'unknown'}`,'Check postcard Export');setStatus('Export: '+w.status+' '+Math.round((w.progress||0)*100)+'%');if(w.status==='succeeded'){r=await persist(r,{phase:'exportRendered'},'export','end',{durationMs:Date.now()-r.exportStartedMs,workflow:w,wallClockMs:Date.now()-r.startedMs,outPath:r.export.outPath});const q=await sdk.runShell({summary:'Decode exported postcard',command:`ffprobe -v error -show_entries stream=codec_name,width,height,nb_frames,r_frame_rate -show_entries format=duration,size -of json ${quote(r.export.outPath)} && ffmpeg -v error -i ${quote(r.export.outPath)} -f null -`,timeoutMs:180000,maxOutputBytes:10000});await helper(sdk,'event',{runId:r.runId,stage:'decode-check',status:q.exitCode===0?'end':'failed',details:{exitCode:q.exitCode,stdout:q.stdout,stderr:q.stderr}});if(q.exitCode!==0)throw Error('The exported file failed decode verification.');r=await persist(r,{phase:'complete',finishedMs:Date.now()},'run','end',{wallClockMs:Date.now()-r.startedMs,outPath:r.export.outPath});setStatus('Complete · '+r.export.outPath+' · total '+((Date.now()-r.startedMs)/1000).toFixed(1)+'s');return r}if(['failed','canceled','cancelled'].includes(w.status)){r=await persist(r,{phase:'exportFailed',export:{...r.export,terminalStatus:w.status}},'export','failed',{workflow:w,durationMs:Date.now()-r.exportStartedMs});throw Error(w.lastErrorMessage||'Export failed. It will not be resubmitted automatically.')}await sleep(2000)}setStatus('Export is still running. Resume this run to check the same Export.');return r;
}
async function execute(kind){if(busyRef.current)return;setError('');busyRef.current=true;setBusy(true);let current=run;const selectedSettings=s;const clickedAtMs=Date.now(),prepMs={};window.__postcardTrace=[];window.__postcardTraceStart=performance.now();
try{const pid=context.projectId;guard(pid);let s=selectedSettings,byId=new Map(rows.map(row=>[row.resourceId,row]));
let heldSubject=null,cutoutInput=null,madeForeground=false,shownPaths=new Map(),shownSizes=Promise.resolve({}),pool=[];
if(kind!=='resume'&&kind!=='export'){
 const previous=await helper(sdk,'load',{projectId:pid});guard(pid);
 if(previous&&!['draftReady','complete','abandoned','exportFailed','generationFailed'].includes(previous.phase)){
   setRun(previous);return;
 }
 let selected=[...new Set([s.subjectId,...s.bgIds,...s.photoIds].filter(Boolean))].map(id=>byId.get(id));
 if(selected.some(row=>!row?.path))throw Error('Choose the missing files again.');
 // The composition keeps one fixed slot for the subject and hangs its curtain
 // and title off that same clock, so anything too short to fill the slot used
 // to be turned away at the door. Extend the material instead of rewriting the
 // timeline: what comes back plays the chosen range and then holds its own last
 // frame, and the cutout, the overlays and the assembly never learn it was ever
 // short. A photograph is extended the same way, which is the whole reason a
 // still can be the subject at all.
 // Every hold runs at once, and the cutout's own 6.5s input is cut from the
 // subject as soon as that one is ready - unless an earlier cutout of the same
 // stretch can be reused, in which case no input is made at all.
 const original=byId.get(s.subjectId);
 if(!original?.path)throw Error('Choose the subject again.');
 setStatus('Preparing the subject\u2026');
 // The postcard's only sound is its own effects, so every video that goes in
 // is a silent file: extended clips already are, the rest get a silent copy.
 const subjectHold=helper(sdk,'hold',{path:original.path,start:isVideo(original)?s.subjectStartSec:0,target:SUBJECT_HOLD,silent:true});
 // Everything but the subject plays in the ending, a video whole and silent.
 const poolIds=[...new Set([...s.bgIds,...s.photoIds])].filter(id=>id!==s.subjectId),poolOriginal=poolIds.map(id=>byId.get(id));
 const poolQuiet=Promise.all(poolOriginal.map(row=>row?.path&&isVideo(row)?helper(sdk,'silent',{path:row.path}):null));
 const endingQuiet=s.photoIds.map(id=>{const row=byId.get(id);return row?.path&&isVideo(row)?helper(sdk,'silent',{path:row.path}):null;});
 // Every picture's size as it is shown, for framing: read beside the holds.
 // Keyed by path: a folder pick gets its Project id only after import.
 shownPaths=new Map([...s.bgIds,...s.photoIds].map(id=>[id,byId.get(id)?.path]));
 shownSizes=helper(sdk,'sizes',{paths:[...shownPaths.values()].filter(Boolean)}).catch(()=>({}));
 const panelHolds=s.bgIds.map((id,i)=>{const row=byId.get(id);return row?.path?helper(sdk,'hold',{path:row.path,start:0,target:Math.max(.5,TIMING.stripEnd-(TIMING.stripFirst+TIMING.stripEvery*i))+.25,silent:true}):null;});
 const cutInput=subjectHold.then(h=>helper(sdk,'cutout-input',{path:h.path,start:h.start||0,seconds:CUTOUT_SECONDS,projectId:pid}));
 cutInput.catch(()=>{});
 const [held,...rest]=await Promise.all([subjectHold,...panelHolds,...endingQuiet]);
 const panelHeld=rest.slice(0,panelHolds.length),endingHeld=rest.slice(panelHolds.length);
 guard(pid);
 if(held.path!==original.path){
  const replacement={...original,path:held.path,name:held.name||original.name,durationSeconds:held.durationSeconds,frameSize:{width:held.width,height:held.height}};
  selected=selected.map(row=>row.resourceId===original.resourceId?replacement:row);
  byId=new Map([...byId,[original.resourceId,replacement]]);
  // A held clip starts where the kept range starts, so the offset is spent; a
  // silent copy is the whole file and keeps it.
  if(held.held){heldSubject=held;s={...s,subjectStartSec:0};}
 }
 endingHeld.forEach((h,i)=>{
  const row=byId.get(s.photoIds[i]);
  if(!h||!row||h.path===row.path)return;
  const replacement={...row,path:h.path,name:h.name||row.name};
  selected=selected.map(x=>x.resourceId===row.resourceId?replacement:x);
  byId=new Map([...byId,[row.resourceId,replacement]]);
 });
 // Each panel is up from its snap-in until the picture has shut
 // (TIMING.stripEnd), so footage that runs out before then was extended too,
 // and a photo becomes a still video: the Draft overlays footage only.
 panelHeld.forEach((h,i)=>{
  const row=byId.get(s.bgIds[i]);
  // Extended or silenced: either way a different file now stands in for it.
  if(!h||h.path===row.path)return;
  const replacement={...row,path:h.path,name:h.name||row.name,durationSeconds:h.durationSeconds,frameSize:{width:h.width,height:h.height}};
  selected=selected.map(x=>x.resourceId===row.resourceId?replacement:x);
  byId=new Map([...byId,[row.resourceId,replacement]]);
 });
 const poolRows=(await poolQuiet).map((q,i)=>{const row=poolOriginal[i];return {...row,...(q&&q.path!==row.path?{path:q.path,name:q.name||row.name}:{}),shownPath:row.path,kind:isVideo(row)?'video':'photo'};});
 cutoutInput=await cutInput;guard(pid);
 prepMs.hold=Date.now()-clickedAtMs;
 let inventory=await readInventory(sdk,pid);guard(pid);
 const missing=[...new Set([...selected.map(row=>row.path),...poolRows.map(row=>row.path),...(cutoutInput?.path?[cutoutInput.path]:[])])].filter(path=>!inventory.some(item=>item.path===path));
 if(missing.length){
   await runScript(sdk,'return await selects.project('+json(pid)+').importFiles({paths:'+json(missing)+'});','Register postcard media',true);
   guard(pid);inventory=await readInventory(sdk,pid);guard(pid);
 }
 prepMs.import=Date.now()-clickedAtMs-prepMs.hold;
 const mapped=new Map(selected.map(row=>{
   const matches=inventory.filter(item=>item.path===row.path);
   if(matches.length!==1)throw Error('Could not uniquely identify '+row.name+'. No generation was submitted.');
   return [row.resourceId,matches[0]];
 }));
 pool=poolRows.map(row=>{const matches=inventory.filter(item=>item.path===row.path);if(matches.length!==1)throw Error('Could not uniquely identify '+row.name+'. No generation was submitted.');return {...matches[0],durationSeconds:matches[0].durationSeconds||row.durationSeconds,shownPath:row.shownPath,kind:row.kind};});
 s={...s,subjectId:mapped.get(s.subjectId)?.resourceId,bgIds:s.bgIds.map(id=>mapped.get(id).resourceId),photoIds:s.photoIds.map(id=>mapped.get(id).resourceId)};
 byId=new Map([...mapped.values()].map(row=>[row.resourceId,row]));
 setRows(old=>old.map(row=>{const m=mapped.get(row.resourceId);return m?{...row,resourceId:m.resourceId}:row;}));setSelection(old=>old.map(id=>mapped.get(id)?.resourceId||id));setFolderIds(old=>old.map(id=>mapped.get(id)?.resourceId||id));setS(s);setRun(previous);current=previous;
 if(previous?.draftId&&requestKey(s)===requestKey(previous.settings)&&previous.version===VERSION){setStatus('Your postcard is ready to play and edit.');return;}
 kind=primaryAction(previous,s).kind;
 if(kind==='resume')throw Error('The previous attempt needs review. Check its status; no new generation was submitted.');
 if(!s.subjectId||!s.bgIds.length||!s.photoIds.length)throw Error('Choose a subject video.');
 for(let i=0;i<s.bgIds.length;i++){
  const row=byId.get(s.bgIds[i]);if(!row?.path)throw Error('A background is missing. Refresh media.');
 }
}
const ensured=helper(sdk,'ensure');ensured.catch(()=>{});let fresh=false;
if(kind==='new'||!current||['complete','abandoned'].includes(current.phase)){if(kind==='resume')return;let verifiedExportTerminalStatus=null;if(kind==='new'&&current?.phase==='exportFailed'){const old=await runScript(sdk,`return(await selects.project(${json(pid)}).workflows()).find(w=>w.workflowId===${json(current.export?.workflowId)})||{status:'unknown'}`,'Check previous Export');if(old.status==='unknown'&&['failed','canceled','cancelled'].includes(current.export?.terminalStatus))old.status=current.export.terminalStatus;if(!['failed','canceled','cancelled'].includes(old.status))throw Error('The previous Export is not terminal. A new run was not started.');verifiedExportTerminalStatus=old.status;}const src=byId.get(s.subjectId);if(!src?.path)throw Error('Select a subject.');layout(s,src.frameSize);if(s.subjectStartSec<0)throw Error('The chosen start is before the beginning of this video.');if([...s.bgIds,...s.photoIds].some(id=>!byId.has(id)))throw Error('Select every background and photo again.');const frames=await shownSizes;current=await helper(sdk,'init',{projectId:pid,replaceSettled:kind==='new',previousRunId:kind==='new'?current?.runId:null,verifiedExportTerminalStatus,settings:{...s,forceNew:false,autoExport:false},source:{...src,durationSeconds:heldSubject?heldSubject.durationSeconds:(duration||src.durationSeconds)},backgrounds:s.bgIds.map(id=>sized(byId.get(id),frames[byId.get(id)?.path]||frames[shownPaths.get(id)])),ending:(pool.length?pool:s.photoIds.map(id=>byId.get(id))).map(row=>sized(row,frames[row?.shownPath]||frames[row?.path])),forceNew:false,autoExport:false,version:VERSION,logRoot:LOG_ROOT,clickedAtMs,prepMs:{...prepMs,beforeInit:Date.now()-clickedAtMs},cutoutInput:cutoutInput?.path?cutoutInput:null});fresh=true;setRun(current);setS(prev=>({...prev,forceNew:false}))}
guard(current.projectId);if(!fresh)current=await helper(sdk,'load',{runId:current.runId});
// A fresh run already looked for a reusable cutout when it was created.
if(current.phase==='ready'&&!fresh)current=await helper(sdk,'reuse',{runId:current.runId});
if(current.phase==='ready')current=await generation(current,false);
if(current.phase==='generationSubmitting')current=await generation(current,false);
if(current.phase==='generationFailed'&&!['failed','canceled','cancelled'].includes(current.generation?.status)){current=await persist(current,{phase:'generationPending'},'generation','recovered-observation');}
// Keep checking until the cutout is back, inside this one run. Handing the
// button back after a single early check left 'Resume' showing between polls,
// which read as a stopped run, and the polls lived in a timer that any panel
// reload quietly dropped.
for(let checks=0;current.phase==='generationPending';checks++){
 setRun(current);
 current=await generation(current,true);
 if(current.phase!=='generationPending'||checks>=GENERATION_CHECKS)break;
 guard(current.projectId);
 await sleep(GENERATION_POLL_MS);
}
if(current.phase==='generationPending'){setRun(current);setStatus('Background removal is taking longer than usual. It keeps checking while this panel is open.');return;}
if(current.phase==='cutoutReady'){const id=current.generation?.resourceId||null,cutPath=current.generation?.cutoutPath;if(!cutPath)throw Error('The background-removed clip is missing. Stopped without paying for another one.');current=await helper(sdk,'prepare',{runId:current.runId,sourcePath:current.source.path,cutoutPath:cutPath,startSeconds:current.settings.subjectStartSec,seconds:TIMING.subjectEnd,patch:{generation:current.generation,phase:'cutoutReady',cutoutMode:current.generation?.jobId?'generated':'reused',cutoutResourceId:id||null},details:current.finished??null});setRun(current);madeForeground=true;}
if(current.phase==='assemblySubmitting'){const match=await runScript(sdk,`const p=selects.project(${json(pid)}),out=[];for(const id of(await p.meta()).draftIds){if((await selects.draft(id).meta()).name===${json(current.draftName)})out.push(id)}return out`,'Recover postcard save');if(match.length===1)current=await persist(current,{phase:'draftReady',draftId:match[0]},'assembly','recovered');else throw Error('Could not confirm the save result. No duplicate Draft was created; inspect the log.')}
if(current.phase==='maskReady'){guard(pid);const [fg,draftName,box]=await Promise.all([prepareForegroundResource(sdk,current,madeForeground),uniqueDraftName(sdk,pid,current.settings.title),helper(sdk,'subject-box',{runId:current.runId}).catch(()=>null)]);guard(pid);await ensured;current=await claim(current,['maskReady'],{phase:'assemblySubmitting',assemblyStartedMs:Date.now(),foregroundPath:fg.foregroundPath,foregroundVersion:fg.foregroundVersion,foregroundResourceId:fg.foregroundResourceId,sfxIds:fg.sfxIds,draftName},'assembly',{foregroundResourceId:fg.foregroundResourceId,draftName});if(box&&!current.mask?.box)current={...current,mask:{...current.mask,box}};const script=makeAssembly(current);let result;try{result=await runScript(sdk,script,'Create postcard with one commit',true);}catch(e){const said=String(e?.message||e);if((/TypeScript check failed|"committed":\s*false/.test(said))&&!/"committed":\s*true/.test(said))current=await persist(current,{phase:'maskReady'},'assembly','failed',{error:said.slice(0,600)});throw e;}current=await persist(current,{phase:'draftReady',draftId:result.draftId,assembly:result},'assembly','end',{durationMs:Date.now()-current.assemblyStartedMs,result,trace:window.__postcardTrace||[]});}
if(current.phase==='draftReady'&&kind==='export')current=await exportRun(current);else if(current.phase==='exportPending')current=await exportRun(current);else if(current.phase==='draftReady')setStatus('Your postcard is ready to play and edit.');else if(/Failed$/.test(current.phase))throw Error('This run is in a failed state. Generation and Export will not be retried automatically.');setRun(current);
}catch(e){setError('We could not finish your postcard. Your progress is saved. See details below.');setStatus(String(e.message||e));if(current?.runId)try{await helper(sdk,'event',{runId:current.runId,stage:'pipeline',status:'failed',details:{error:String(e.stack||e)}})}catch{}}finally{busyRef.current=false;setBusy(false)}}

const active=run&&!['draftReady','complete','abandoned','exportFailed','generationFailed'].includes(run.phase);
const locked=busy||loading||!!active;
const action=primaryAction(run,s);
const hasDraft=!!run?.draftId&&requestKey(s)===requestKey(run.settings);
// A finished or unfinished run with no folder open has no grid to stand on, so
// it gets the summary card; with a folder open the grid stays put.
const cardView=!folder&&selection.length===0&&(hasDraft||!!(run&&!['draftReady','complete','abandoned','exportFailed','generationFailed'].includes(run.phase)));
const cutoutKey=x=>JSON.stringify([x?.subjectId??null,x?.subjectStartSec??null]);
const draftDrifted=!!run?.draftId&&!hasDraft;
const driftNeedsCutout=draftDrifted&&cutoutKey(s)!==cutoutKey(run?.settings);
const chosen=[...new Set([s.subjectId,...s.bgIds,...s.photoIds].filter(Boolean))];
const shown=folderIds.map(id=>byId.get(id)).filter(Boolean);
const thumbnailRows=!folder&&selection.length===0?chosen.map(id=>byId.get(id)).filter(Boolean):shown;
const thumbKey=thumbnailRows.map(x=>x.path).join('|');
const STRIP_FRAMES=10;
useEffect(()=>{
  let alive=true;
  const queue=[...new Map(thumbnailRows.filter(row=>thumbs[row.path]===undefined).map(row=>[row.path,row])).values()];
  if(!queue.length)return;
  let cursor=0;
  // Four at a time. The same work ran strictly one after another before, so a
  // full page of 24 spent 24 round trips end to end and the grid filled by
  // inches; four keeps every tile's request in flight without queueing a shell
  // per file at once.
  const worker=async()=>{
    while(alive&&cursor<queue.length){
      const row=queue[cursor++];
      let tile={thumb:''};
      try{tile=await helper(sdk,'tile',{path:row.path})}catch{}
      if(!alive)return;
      setThumbs(old=>({...old,[row.path]:tile}));
      // The folder listing knows only names and paths, so the duration and the
      // pixel size the rest of the panel needs arrive with the still.
      if(tile.width&&tile.height)setRows(old=>old.map(x=>x.path===row.path?{...x,durationSeconds:tile.durationSeconds||x.durationSeconds,frameSize:{width:tile.width,height:tile.height}}:x));
    }
  };
  void Promise.all([worker(),worker(),worker(),worker()]);
  return()=>{alive=false};
},[thumbKey]);
// A tile scrubs through its clip under the pointer. The sheet is fetched once
// per file, after a short hover so that sweeping across the grid asks for
// nothing, and the scrub itself is a background offset on an image already in
// the page — no request, no decode, no state beyond which frame is showing.
function beginScrub(row){
  if(!isVideo(row))return;
  clearTimeout(hoverTimer.current);
  const path=row.path;
  hoverTimer.current=setTimeout(async()=>{
    if(stripAsked.current.has(path))return;
    stripAsked.current.add(path);
    let sheet={strip:'',count:0};
    try{
      sheet=await helper(sdk,'strip',{path,count:STRIP_FRAMES,durationSeconds:thumbs[path]?.durationSeconds||0});
      if(!sheet.strip||!sheet.count)throw Error('No preview frames were returned.');
      setError(old=>old.startsWith('Could not preview '+row.name+'.')?'':old);
    }catch(e){
      stripAsked.current.delete(path);
      setError('Could not preview '+row.name+'. Hover over it again to retry.');
      setStatus(String(e.message||e));
      return;
    }
    setStrips(old=>({...old,[path]:sheet}));
  },220);
}
function moveScrub(row,event){
  const sheet=strips[row.path];
  if(!sheet?.count)return;
  const box=event.currentTarget.getBoundingClientRect();
  if(box.width<=0)return;
  const ratio=Math.min(.9999,Math.max(0,(event.clientX-box.left)/box.width));
  const index=Math.floor(ratio*sheet.count);
  setScrub(old=>old?.path===row.path&&old.index===index?old:{path:row.path,index});
}
function endScrub(){clearTimeout(hoverTimer.current);setScrub(null);}
useEffect(()=>()=>clearTimeout(hoverTimer.current),[]);
useEffect(()=>{
  if(!active||busy||error)return;
  const timer=setTimeout(()=>execute('resume'),2000);
  return()=>clearTimeout(timer);
},[run?.phase,run?.generation?.status,busy,error]);
// The run lives in this panel's memory, so closing or reloading the panel used
// to strand it wherever it stood - a paid cutout could sit uncollected for good.
// On open, an unfinished run for this project is taken back up; the effect
// above then carries it the rest of the way.
useEffect(()=>{let alive=true;(async()=>{try{
  const prev=await helper(sdk,'load',{projectId:context.projectId});
  if(!alive||!prev||['draftReady','complete','abandoned','exportFailed','generationFailed'].includes(prev.phase))return;
  if(prev.settings)setS(old=>({...old,...prev.settings}));
  setRun(prev);
}catch{}})();return()=>{alive=false};},[]);
function setSelected(ids,preferred=s.subjectId){
  const selectedVideos=ids.filter(id=>isVideo(byId.get(id)));
  // The real ceilings belong to the roles, not to file types: the reference
  // fills the frame with six strips, so there are at most six panels, however
  // many videos or photos are picked.
  if(ids.length>MAX_SUBJECT+MAX_PANELS+MAX_ENDING){setError('A postcard holds up to '+(MAX_SUBJECT+MAX_PANELS+MAX_ENDING)+' clips and photos.');return;}
  const subjectId=preferred&&ids.includes(preferred)?preferred:(selectedVideos[0]||ids[0]||'');
  // Only the subject has to be footage: its cutout is what moves. A photo
  // picked for a panel goes in as a still video (the Draft overlays footage
  // only), and the ending cuts slices out of either kind, so either kind fills
  // either role. Video
  // behind and stills at the end is the better-looking default and stays the
  // default; when one kind is absent the other takes the role instead of the
  // postcard becoming impossible to make.
  const rest=ids.filter(id=>id!==subjectId);
  const restVideos=rest.filter(id=>isVideo(byId.get(id))),restPhotos=rest.filter(id=>isPhoto(byId.get(id)));
  const fallback=[subjectId].filter(Boolean);
  // With both kinds present the nicer default holds: footage behind, stills at
  // the end. With only one kind the pool is split instead of reused, so a
  // folder of nothing but video still fills the panels and the ending with
  // different clips. Each role is trimmed to what the template can lay out.
  const mixed=restVideos.length&&restPhotos.length;
  const bgPool=mixed?restVideos:rest,endPool=mixed?restPhotos:rest.slice(MAX_PANELS).length?rest.slice(MAX_PANELS):rest;
  const bgIds=(bgPool.length?bgPool:fallback).slice(0,MAX_PANELS);
  const photoIds=(endPool.length?endPool:fallback).slice(0,MAX_ENDING);
  setSelection(ids);setS(old=>({...old,subjectId,subjectStartSec:old.subjectId===subjectId?old.subjectStartSec:0,bgIds,photoIds}));
  setError('');
}
function toggleMedia(row){
  if(locked||picking)return;
  setSelected(selection.includes(row.resourceId)?selection.filter(id=>id!==row.resourceId):[...selection,row.resourceId]);
}
function chooseSubject(id){if(!locked&&!picking)setSelected(selection,id);}
async function openDraft(){
  if(busyRef.current||!run?.draftId)return;
  busyRef.current=true;setBusy(true);setError('');
  try{await runScript(sdk,'return await selects.editor.openDraft('+json(run.draftId)+');','Open postcard draft',true);}
  catch(e){setError('Could not open the timeline.');setStatus(String(e.message||e));}
  finally{busyRef.current=false;setBusy(false);}
}
// How much of the subject actually plays from the chosen start.
const subjectSpan=Math.max(0,Math.min(SUBJECT_SECONDS,(duration||0)-s.subjectStartSec));
const issue=sourceError?'Reconnect the original file or choose another.':!subject?'Choose a subject.':isVideo(subject)&&!duration?'Reading video details…':!subject.frameSize?.width?'Could not read this file. Choose another.':'';
// Every gap and inset in this panel is a step off --panel-gap, and every corner
// is one of the kit's two radii, so the panel keeps the app's rhythm instead of
// the hand-picked 6/10/12/20px it grew.
const GAP='var(--panel-gap)',GAP_HALF='calc(var(--panel-gap) / 2)',GAP_INSET='calc(var(--panel-gap) * 0.75)',GAP_LG='calc(var(--panel-gap) * 2)';
const RADIUS='var(--panel-button-radius)';
const pane={border:'1px solid var(--panel-border)',borderRadius:RADIUS,overflow:'hidden',minWidth:0};
const muted={color:'var(--panel-muted-fg)',fontSize:12,lineHeight:1.5};
// The one place fixed colours are right: a chip sits on photography, where a
// theme token would land on whatever the frame happens to show. A dark scrim
// and white text read on every image, in either theme.
const chip={position:'absolute',display:'flex',alignItems:'center',justifyContent:'center',gap:4,fontSize:11,lineHeight:1,borderRadius:999,padding:'4px 7px',background:'rgba(0,0,0,.58)',backdropFilter:'blur(8px)',color:'#fff',pointerEvents:'none'};
const clock=seconds=>{const whole=Math.max(0,Math.round(Number(seconds)||0));return Math.floor(whole/60)+':'+String(whole%60).padStart(2,'0');};
const mediaImage=(row,alt)=>{
  const still=thumbs[row?.path]?.thumb;
  return still
    ?<img alt={alt} src={'data:image/jpeg;base64,'+still} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
    :<div style={{height:'100%',display:'grid',placeItems:'center',background:'var(--panel-muted)',color:'var(--panel-muted-fg)'}}><ui.Icon name={row&&isPhoto(row)?'image':'video'} size={16}/></div>;
};
const reviewNeeded=/Failed$/.test(run?.phase||'')&&action.kind==='resume';
const unplaced=selection.length-new Set([s.subjectId,...s.bgIds,...s.photoIds].filter(Boolean)).size;
const selectionIssue=!subject?'Select a video to be your subject.':'';
const blocker=selectionIssue||issue;
const selectionNeed=!subject?'Create':sourceError?'Reconnect':isVideo(subject)&&!duration?'':!subject.frameSize?.width?'Choose Another':'';
if(!context.projectId)return <ui.Message>Open a project to make a postcard.</ui.Message>;
return <div style={{maxWidth:640,margin:'0 auto',minWidth:0,height:'calc(100vh - var(--panel-gap))',display:'flex',flexDirection:'column'}}>
  <style>{'.pc-tile{outline:none}.pc-tile:focus-visible .pc-ring{outline:2px solid var(--panel-ring);outline-offset:-5px}.pc-bar{display:flex;align-items:center;gap:8px;padding-top:4px}.pc-count{flex:1 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pc-actions{display:flex;gap:8px;flex:0 0 auto;margin-left:auto}@media (max-width:359px){.pc-bar{flex-wrap:wrap}.pc-count{flex-basis:100%}.pc-actions{flex:1 1 100%}.pc-actions>*{flex:1 1 0}}'}</style>
  <div style={{flex:'1 1 auto',minHeight:0,overflowY:'auto',paddingBottom:GAP}}>
  {!folder&&selection.length===0&&!active&&!hasDraft?<div onDragOver={event=>event.preventDefault()} onDrop={dropFolder} style={{...pane,padding:GAP_LG+' '+GAP_LG,textAlign:'center',display:'grid',gap:GAP_LG}}>
    <div style={{display:'flex',justifyContent:'center'}}><ui.Icon name="folder" size={16}/></div>
    <strong>Start with a folder of memories.</strong>
    <p style={{...muted,margin:0}}>Drop a folder here, or choose one below.<br/>Nothing is imported until you create.</p>
    <ui.Actions><ui.Button variant="primary" disabled={picking||loading} onClick={chooseFolder}>Choose Folder</ui.Button></ui.Actions>
  </div>:cardView?<>
    {/* What was made, and the two things to do with it. The screen this
        replaced showed the setup form again, so finishing a postcard looked
        exactly like not having started one. */}
    <div style={{...pane,padding:GAP_LG,display:'grid',gap:GAP}}>
      <strong style={{fontSize:16,minWidth:0,overflowWrap:'anywhere'}}>{s.title||'Your postcard'}</strong>
      {!!s.subtitle&&<p style={{...muted,margin:0}}>{s.subtitle}</p>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(48px,1fr))',gap:GAP_HALF}}>
        {chosen.map(id=>byId.get(id)).filter(Boolean).slice(0,12).map(row=>
          <div key={row.resourceId} style={{position:'relative',aspectRatio:'1 / 1',overflow:'hidden',borderRadius:'var(--panel-radius)',background:'var(--panel-muted)'}}>{mediaImage(row,row.name)}</div>)}
      </div>
      <p style={{...muted,margin:0}}>1 subject · {s.bgIds.length} in the panels · {s.photoIds.length} in the ending</p>
    </div>
  </>:<>
    <div onDragOver={event=>event.preventDefault()} onDrop={dropFolder} style={{marginBottom:GAP_LG}}>
      <ui.Row><strong style={{minWidth:0,overflowWrap:'anywhere'}}>{folder?.name||'Your media'}</strong><ui.Button variant="ghost" disabled={locked||picking} onClick={startOver}>Start over</ui.Button></ui.Row>
      <p style={{...muted,margin:GAP+' 0 0'}}>Click to select. The ★ is your subject — click a number to change it.</p>
    </div>
    {folder?.limited&&<ui.Message>Showing media from the first 10,000 files. Choose a smaller folder to see more.</ui.Message>}
    {!!folder?.unreadable&&<ui.Message>Some subfolders could not be read. Check their access permissions.</ui.Message>}
    {loading?<ui.Progress label="Reading this folder…"/>:<>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(84px,100%),1fr))',gap:GAP}}>
        {shown.map(row=>{
          const selected=selection.includes(row.resourceId),isMain=s.subjectId===row.resourceId;
          // The subject wears the star; the rest count up from 1 in the order picked,
          // which is the order the panels and the ending use them.
          const number=selection.filter(id=>id!==s.subjectId).indexOf(row.resourceId)+1,previewStar=!isMain&&badgeHover===row.resourceId;
          const sheet=strips[row.path],scrubbing=scrub?.path===row.path&&sheet?.count>0,seconds=thumbs[row.path]?.durationSeconds;
          return <div key={row.resourceId} role="button" tabIndex={0} aria-pressed={selected} aria-label={row.relativePath||row.name}
            onClick={()=>toggleMedia(row)}
            onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleMedia(row);}}}
            onPointerEnter={()=>beginScrub(row)} onPointerMove={event=>moveScrub(row,event)} onPointerLeave={endScrub}
            className="pc-tile" style={{minWidth:0,cursor:locked?'default':'pointer'}}>
            {/* The tile is the frame itself: selection draws a ring over it and
                every label floats on the still, so nothing here changes the
                tile's height. Choosing a clip no longer reflows the grid under
                the pointer, which is what the old Select / Make Subject buttons
                stacked below the name did on every click. */}
            <div style={{position:'relative',aspectRatio:'1 / 1',overflow:'hidden',borderRadius:RADIUS,background:'var(--panel-muted)'}}>
              {mediaImage(row,row.name)}
              {scrubbing&&<div aria-hidden="true" style={{position:'absolute',inset:0,backgroundImage:'url(data:image/jpeg;base64,'+sheet.strip+')',backgroundSize:(sheet.count*100)+'% 100%',backgroundPosition:(scrub.index/Math.max(1,sheet.count-1))*100+'% 0',backgroundRepeat:'no-repeat'}}/>}
              {selected&&<span
                role={isMain?'img':'button'} tabIndex={isMain||locked?undefined:0}
                aria-label={isMain?'Subject':'Make this the subject'}
                onPointerEnter={()=>{if(!isMain&&!locked)setBadgeHover(row.resourceId);}}
                onPointerLeave={()=>setBadgeHover(old=>old===row.resourceId?null:old)}
                onClick={event=>{event.stopPropagation();if(!isMain)chooseSubject(row.resourceId);}}
                onKeyDown={event=>{if(event.key!=='Enter'&&event.key!==' ')return;event.preventDefault();event.stopPropagation();if(!isMain)chooseSubject(row.resourceId);}}
                style={{...chip,top:GAP_INSET,right:GAP_INSET,minWidth:20,height:20,padding:0,fontWeight:600,pointerEvents:'auto',
                  cursor:isMain||locked?'default':'pointer',background:'var(--panel-primary)',color:'var(--panel-primary-fg)',
                  opacity:previewStar?.75:1,transform:previewStar?'scale(1.12)':'none',transition:'transform 120ms ease,opacity 120ms ease'}}>
                {isMain||previewStar?'\u2605':number}
              </span>}
              {isVideo(row)&&!!seconds&&<span className="font-tabular" style={{...chip,bottom:GAP_INSET,right:GAP_INSET}}>{clock(seconds)}</span>}
              <div aria-hidden="true" className="pc-ring" style={{position:'absolute',inset:0,borderRadius:'inherit',pointerEvents:'none',boxShadow:selected?'inset 0 0 0 2px var(--panel-primary), inset 0 0 0 3px rgba(0,0,0,.35)':'inset 0 0 0 1px var(--panel-border)',transition:'box-shadow 140ms ease'}}/>
              {scrubbing&&<div aria-hidden="true" style={{position:'absolute',left:0,right:0,bottom:0,height:3,background:'rgba(0,0,0,.45)'}}><div style={{height:'100%',width:((scrub.index+1)/sheet.count)*100+'%',background:'#fff'}}/></div>}
            </div>
            <p title={row.relativePath||row.name} style={{...muted,margin:GAP_HALF+' 0 0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',color:selected?'var(--panel-fg)':'var(--panel-muted-fg)'}}>{row.name}</p>
          </div>;
        })}
      </div>
      {!shown.length&&<ui.Message>No supported videos or photos in this folder. Choose another folder.</ui.Message>}
      {folder?.total>24&&<ui.Row><ui.Button variant="ghost" disabled={locked||picking||page===0} onClick={()=>readFolder(folder.path,(page-1)*24)}>Previous</ui.Button><small>{page+1} / {Math.ceil(folder.total/24)}</small><ui.Button variant="ghost" disabled={locked||picking||(page+1)*24>=folder.total} onClick={()=>readFolder(folder.path,(page+1)*24)}>Next</ui.Button></ui.Row>}
    </>}
    {selection.some(id=>!folderIds.includes(id))&&<div style={{marginTop:GAP_LG,display:'grid',gap:GAP}}>
      {<details><summary>Selected from other pages or folders</summary>{selection.filter(id=>!folderIds.includes(id)).map(id=><ui.Row key={id}><small style={{minWidth:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{id===s.subjectId?'\u2605 ':''}{byId.get(id)?.name}</small><ui.Button variant="ghost" disabled={locked} onClick={()=>toggleMedia(byId.get(id))}>Remove</ui.Button></ui.Row>)}</details>}
    </div>}
        {customize&&<ui.Stack gap={16}>
      <p style={{...muted,margin:0}}>Cloud background removal may use credits. Verified cutouts are reused for the same source and range.</p>
      <ui.TextField label="Subtitle" value={s.subtitle} onChange={v=>change('subtitle',v)} disabled={locked}/>
        <ui.Section title="Subject timing">
          <ui.Slider label="Start time" value={s.subjectStartSec} min={0} max={Math.max(0,duration-.5)} step={.5} unit="s" onChange={v=>change('subjectStartSec',v)} disabled={locked||duration<=.5}/>
          <small>{subjectSpan.toFixed(1)} seconds from {s.subjectStartSec.toFixed(1)}s{subjectSpan<SUBJECT_SECONDS-.05?', then its last frame holds':''}. Changing this range needs a different cutout.</small>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:GAP_HALF}}>{preview.filter(Boolean).map((x,i)=><img key={i} alt={'Range preview '+(i+1)} src={'data:image/jpeg;base64,'+x} style={{width:'100%',borderRadius:'var(--panel-radius)'}}/>)}</div>
        </ui.Section>
        <ui.Section title="Style">
          <ui.Select label="Format" value={s.aspect} onChange={v=>change('aspect',v)} options={[{value:'original',label:'Match subject'},{value:'portrait',label:'Portrait · 9:16'},{value:'landscape',label:'Landscape · 16:9'},{value:'square',label:'Square · 1:1'}]} disabled={locked}/>
          <ui.Select label="Framing" value={s.fitMode} onChange={v=>change('fitMode',v)} options={[{value:'cover',label:'Fill frame'},{value:'contain',label:'Fit entire video'}]} disabled={locked}/>
          <ui.FontField label="Font" value={s.fontFamily} onChange={v=>change('fontFamily',v)} disabled={locked}/>
          <ui.ColorField label="Title color" value={s.titleColor} onChange={v=>change('titleColor',v)} disabled={locked}/>
          <ui.Toggle label="All caps" value={s.upperTitle!==false} onChange={v=>change('upperTitle',v)} disabled={locked}/>
          <ui.ColorField label="Subtitle color" value={s.subtitleColor} onChange={v=>change('subtitleColor',v)} disabled={locked}/>
        </ui.Section>
      </ui.Stack>}
  </>}
  <div aria-live="polite" style={{marginTop:GAP_LG}}>
    {error?<ui.Message tone="error">{error}</ui.Message>:busy||active?null:folder&&subject&&issue?<p style={{...muted,margin:'0 0 '+GAP}}>{issue}</p>:null}
  </div>
  {error&&<details style={{marginTop:GAP_LG}}><summary>Details</summary><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{status}</p></details>}
  </div>
  {(folder||selection.length>0||active||hasDraft)&&<footer style={{flex:'0 0 auto',background:'var(--background)',borderTop:'1px solid var(--panel-border)',padding:GAP+' 0 0',display:'grid',gap:GAP_HALF}}>
    {/* One row: the kit stacks its label above the box, which spent a whole
        line of the bar on the word "Title". Wrapping the field in a <label>
        keeps the word as the input's accessible name. */}
    {!cardView&&<label style={{display:'flex',alignItems:'center',gap:GAP,minWidth:0,opacity:subject?1:.5}}>
      <span style={{...muted,flex:'0 0 auto'}}>Title</span>
      <div style={{flex:'1 1 auto',minWidth:0}}><ui.TextField value={s.title} onChange={v=>change('title',v)} disabled={locked||!subject}/></div>
    </label>}
    {/* The kit's Actions stacks every button full width under 360px, which
        made this bar four lines tall in a docked panel. This row keeps the
        two buttons side by side at any width; only the count wraps above. */}
    <div className="pc-bar">{!cardView&&<small className="pc-count" aria-live="polite" style={muted}>{hasDraft?'Ready':draftDrifted?(driftNeedsCutout?'Changed \u00b7 needs a new cutout':'Changed \u00b7 cutout is reused'):selection.length?selection.length+' selected \u00b7 '+s.bgIds.length+(s.bgIds.length===1?' panel':' panels')+' \u00b7 '+s.photoIds.length+' ending'+(unplaced>0?' \u00b7 '+unplaced+' not used':''):active?'Finishing your last postcard':'Nothing selected'}</small>}<div className="pc-actions">{!cardView&&<ui.Button variant="ghost" disabled={locked||!subject} onClick={()=>setCustomize(!customize)}>{customize?'Hide':'Options'}</ui.Button>}{cardView&&hasDraft&&<ui.Button variant="ghost" disabled={locked} onClick={startOver}>Start over</ui.Button>}<ui.Button variant="primary" busy={busy||(active&&!error)} busyLabel={friendlyPhase(run?.phase)} disabled={loading||picking||(!active&&!hasDraft&&!!blocker)} onClick={()=>hasDraft?openDraft():active?execute('resume'):execute(action.kind)}>{hasDraft?'Open':active?'Resume':selectionNeed||(reviewNeeded?'Review':draftDrifted?'Rebuild':'Create')}</ui.Button></div></div>
  </footer>}
</div>;
}
let dropRequestId=-Date.now();
function droppedFolderPath(file){
  return new Promise((resolve,reject)=>{
    const callId=dropRequestId--;
    const finish=(error,value)=>{clearTimeout(timer);window.removeEventListener('message',answer);error?reject(error):resolve(value);};
    const answer=event=>{if(event.source===window.parent&&event.data?.type==='panel:sdk-result'&&event.data.callId===callId)finish(event.data.ok?null:Error(event.data.error),event.data.value);};
    const timer=setTimeout(()=>finish(Error('The app did not resolve the dropped folder. Use Choose Folder instead.')),15000);
    window.addEventListener('message',answer);
    window.parent.postMessage({type:'panel:file-path',callId,file},'*');
  });
}

// The first read after the app starts can come back empty. In the MCP process an
// alias-checkpoint ack shares its numeric id space with executeJS requests
// (electron/mcp/server.ts:94, agent-id-ipc.ts:56) and can answer the wrong one,
// so sourceFiles() gets undefined and the script dies on '.filter'. The same read
// a moment later is clean, so try it again before failing the run.
async function readInventory(sdk,pid){
  for(let attempt=0;;attempt++){
    try{return await readInventoryOnce(sdk,pid);}
    catch(e){if(attempt>=2||!/reading '(filter|reduce|map)'|is not iterable/.test(String(e?.message||e)))throw e;await sleep(1500);}
  }
}
async function readInventoryOnce(sdk,pid){
  const rows=[];
  for(let offset=0;;offset+=32){
    const page=await runScript(sdk,inventoryCode(pid,offset),'Read postcard sources');
    if(!Array.isArray(page.rows))throw Error('Could not read the media library.');
    rows.push(...page.rows);rows.warning=page.warning||rows.warning||'';
    if(rows.length>=page.total||!page.rows.length)return rows;
  }
}
function friendlyPhase(phase){
  return ({generationSubmitting:'Cutting out…',generationPending:'Cutting out…',cutoutReady:'Preparing…',maskReady:'Composing…',assemblySubmitting:'Saving…',draftReady:'Ready',exportPending:'Exporting…'})[phase]||'Preparing…';
}

function requestKey(s){return JSON.stringify(['subjectId','subjectStartSec','bgIds','photoIds','title','upperTitle','subtitle','fontFamily','titleColor','subtitleColor','aspect','fitMode','newGenerationRequest'].map(k=>s?.[k]??null));}
function primaryAction(run,settings){if(!run||['complete','abandoned'].includes(run.phase))return{kind:'draft',label:settings?.forceNew?'Create Draft with a new cutout':run?'Create new Draft':'Create Draft'};const settled=['draftReady','exportFailed'].includes(run.phase)||(run.phase==='generationFailed'&&['failed','canceled','cancelled'].includes(run.generation?.status));// A postcard built by an earlier version can be built again with this one.
const changed=requestKey(settings)!==requestKey(run.settings)||(!!run.version&&run.version!==VERSION);if(settled&&(changed||(run.phase!=='draftReady'&&settings?.forceNew)))return{kind:'new',label:settings?.forceNew?'Create Draft with a new cutout':'Create Draft with changed settings'};if(run.phase==='draftReady')return{kind:'export',label:'Export'};return{kind:'resume',label:/Failed$/.test(run.phase)?'Review status':'Resume'};}
function phaseLabel(phase){return({ready:'Ready',generationSubmitting:'Submitting cutout generation',generationPending:'Generating cutout',cutoutReady:'Cutout ready',maskReady:'Draft assembly ready',assemblySubmitting:'Confirming Draft save',draftReady:'Draft saved',exportSubmitting:'Starting Export',exportPending:'Export running',exportRendered:'Verifying output file',complete:'Complete',generationFailed:'Generation needs review',exportFailed:'Export needs review'})[phase]||'Review run status';}
