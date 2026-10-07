// @name Timeline Shorts Builder
// @icon video
// Editable, uncropped timeline shorts with bounded self-contained thumbnail layers.
import React,{useEffect,useRef,useState} from "react";
type Row={sequenceId:string;name:string;fps:number;endFrame:number;durationSeconds:number;frameSize:{width:number;height:number}};
const CODE=`
import React from 'react';import{AbsoluteFill,Img,useCurrentFrame,useVideoConfig}from'remotion';
function tc(f,r){const s=Math.max(0,f)/r,p=n=>String(n).padStart(2,'0');return p(Math.floor(s/3600))+':'+p(Math.floor(s/60)%60)+':'+p(Math.floor(s)%60)+':'+p(Math.floor((s%1)*r))}
const colors={pink:'#ec4899',red:'#ef4444',orange:'#f97316',yellow:'#eab308',lime:'#84cc16',green:'#22c55e',blue:'#3b82f6',violet:'#8b5cf6',fuchsia:'#d946ef',stone:'#78716c'};
export default function G({data}){
  const f=useCurrentFrame(),{width:w,height:h}=useVideoConfig(),t=data.timeline,D=Math.max(1,t.durationFrames),fps=t.fps,top=Math.round(h*t.topRatio/100),ph=h-top,hh=Math.max(44,ph*.075),rh=32,fh=22,lw=Math.max(76,w*.09),vw=w-lw,tw=vw*1.55,sx=vw*.42-f/D*tw,area=ph-hh-rh-fh,lh=Math.min(84,area/Math.max(1,t.laneCount)),role=data.role,lanes=t.lanes||[],head=data.playhead||'#8ac926',bg=data.background||'#151515';
if(role==='full')return <><G data={{...data,role:'base'}}/><G data={{...data,role:'images'}}/><G data={{...data,role:'front'}}/></>;
if(role==='images')return <AbsoluteFill><div style={{position:'absolute',left:lw,right:0,top:top+hh+rh,height:area,overflow:'hidden'}}>{(data.tiles||[]).map((q,i)=>{const x=sx+q.startFrame/D*tw,cw=Math.max(3,(q.endFrame-q.startFrame)/D*tw),tx=x+cw*q.slot/q.slots;if(tx+cw/q.slots<0||tx>vw||q.row*lh>area)return null;return <div key={i} style={{position:'absolute',left:x,top:q.row*lh+5,width:cw,height:Math.max(1,lh-10),borderRadius:4,overflow:'hidden',boxSizing:'border-box',border:'2px solid transparent'}}><Img src={q.src??data.assets?.[q.asset]} style={{position:'absolute',left:(q.slot/q.slots)*100+'%',top:0,width:100/q.slots+'%',height:'100%',objectFit:'cover'}}/></div>})}</div></AbsoluteFill>;
return <AbsoluteFill style={{pointerEvents:'none',fontFamily:'Inter,Pretendard,Arial,sans-serif'}}><div style={{position:'absolute',left:0,right:0,top,bottom:0,overflow:'hidden',color:data.textColor||'#edf1f5',background:role==='base'?bg:'transparent'}}>{role==='base'&&<><div style={{height:hh,background:'#1b1b1b',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px'}}><b style={{fontSize:15,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'65%'}}>{t.name}</b><b style={{fontSize:16,color:head}}>{tc(f,fps)}</b></div><div style={{marginLeft:lw,height:rh,position:'relative',overflow:'hidden',borderBottom:'1px solid #333'}}>{Array.from({length:11},(_,i)=>i/10).map((v,i)=><div key={i} style={{position:'absolute',left:sx+v*tw,top:0,bottom:0,borderLeft:'1px solid #444'}}><span style={{fontSize:10,color:'#999',whiteSpace:'nowrap'}}>{tc(v*D,fps)}</span></div>)}</div><div style={{position:'absolute',bottom:0,left:0,right:0,height:fh,background:'#171717',fontSize:9,color:'#888',padding:'0 12px'}}>SELECTS TIMELINE · FIXED PLAYHEAD</div></>}
<div style={{position:'absolute',left:0,right:0,top:hh+rh,height:area,overflow:'hidden'}}>{lanes.map((l,i)=><div key={l.id} style={{position:'absolute',left:0,right:0,top:i*lh,height:lh,borderBottom:role==='base'?'1px solid #282828':undefined}}>{role==='base'&&<div style={{position:'absolute',width:lw,top:0,bottom:0,background:'#1a1a1a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:l.kind==='main'?'#5ad5e2':'#999'}}>{l.label}</div>}<div style={{position:'absolute',left:lw,right:0,top:0,bottom:0,overflow:'hidden'}}>{l.clips.map((c,j)=>{const color=colors[c.color]||(c.kind==='generator'?'#8b5cf6':c.kind==='audio'?'#22c55e':'#36c5d4');return <div key={j} style={{position:'absolute',left:sx+c.startFrame/D*tw,width:Math.max(3,(c.endFrame-c.startFrame)/D*tw),top:5,bottom:5,boxSizing:'border-box',borderRadius:4,overflow:'hidden',border:'2px solid '+color,background:role==='base'?(c.kind==='generator'?'#5520a3':'#164e63'):'transparent'}}>{role==='front'&&<><div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,transparent 50%,rgba(0,0,0,.6))'}}/><span style={{position:'absolute',left:6,right:5,bottom:3,fontSize:Math.min(13,lh*.25),overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',textShadow:'0 1px 2px black'}}>{c.name}</span></>}</div>})}</div></div>)}</div>
{role==='front'&&<div style={{position:'absolute',left:lw+vw*.42,top:hh+4,bottom:fh,width:2,background:head}}><div style={{position:'absolute',left:-7,top:0,width:16,height:13,background:head,clipPath:'polygon(0 0,100% 0,50% 100%)'}}/></div>}</div></AbsoluteFill>}
`;
// NATIVE_SIZE_HELPER_START
function nativePlacement(media:{width:number;height:number},top:number,rotation=0){
 if(!(media.width>0&&media.height>0&&Number.isFinite(media.width)&&Number.isFinite(media.height)))throw new Error('The native media dimensions are unavailable. Draft canvas dimensions are not used as a fallback.');
 const a=rotation*Math.PI/180,rw=Math.abs(media.width*Math.cos(a))+Math.abs(media.height*Math.sin(a)),rh=Math.abs(media.width*Math.sin(a))+Math.abs(media.height*Math.cos(a));
 const naturalScale=Math.min(1080/rw,top/rh),conform=Math.min(1080/media.width,1920/media.height),height=rh*naturalScale;
 return {enabled:true,position:{x:0,y:(960-top+height/2)/1920*100},scale:{x:naturalScale/conform,y:naturalScale/conform},rotation,anchor:{x:0,y:0}};
}
// NATIVE_SIZE_HELPER_END
// OPTIMIZATION_HELPERS_START
const CACHE_VERSION=3;
const sampleCount=(frames:number,total:number,fps:number)=>Math.min(6,Math.max(1,Math.ceil(frames/Math.max(1,total)*(1080*.91*1.55)/256)),Math.max(1,Math.ceil(frames/Math.max(1,fps)/2)));
const sampleFrames=(duration:number,count:number)=>Array.from({length:count},(_,i)=>Math.min(Math.max(0,duration-1),Math.floor((i+.5)/count*duration)));
const jsonSafe=(v:any)=>v==null?null:JSON.parse(JSON.stringify(v));
function clipSourceSeconds(c:any,frame:number,fps:number){return Math.max(0,c.sourceStartSeconds+frame/fps*c.playbackSpeed);}
async function ffmpegThumbnail(fs:any,dir:string,file:string,seconds:number):Promise<Blob|null>{const rt=hostSdk.media;if(!file||typeof rt?.runFFmpeg!=='function')return null;const out=fs.join(dir,'frame-'+Date.now()+'-'+Math.random().toString(36).slice(2,8)+'.jpg'),still=/\.(png|jpe?g|webp|bmp|tiff?|heic)$/i.test(file);try{await rt.runFFmpeg(['-nostdin','-v','error','-y',...(still?[]:['-ss',seconds.toFixed(3)]),'-i',file,'-frames:v','1','-vf','scale=384:-2','-q:v','4',out],true);if(!await fs.exists(out))return null;const bytes=new Uint8Array(await fs.readFile(out));return bytes.length?new Blob([bytes],{type:'image/jpeg'}):null;}catch{return null}finally{try{if(typeof fs.removeFile==='function')await fs.removeFile({filePath:out});}catch{}}}
async function digest(value:unknown){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return Array.from(new Uint8Array(hash)).map(x=>x.toString(16).padStart(2,'0')).join('');}
function uniqueAssets(tiles:any[]){const assets:string[]=[],index=new Map<string,number>();return {tiles:tiles.map(({src,...tile})=>{let i=index.get(src);if(i===undefined){i=assets.length;index.set(src,i);assets.push(src)}return {...tile,asset:i}}),assets};}
function planParts(t:any,tiles:any[]){const all=uniqueAssets(tiles);if(byteSize(JSON.stringify({timeline:t,...all}))<160000)return [{role:'full',timeline:t,...all}];const small={name:t.name,fps:t.fps,durationFrames:t.durationFrames,topRatio:t.topRatio,laneCount:t.laneCount},parts:any[]=[{role:'base',timeline:t,tiles:[],assets:[]}];let group:any[]=[],bytes=0;for(const tile of tiles){const n=byteSize(JSON.stringify(tile));if(n>140000)throw new Error('An individual thumbnail is too large.');if(bytes+n>140000&&group.length){parts.push({role:'images',timeline:small,...uniqueAssets(group)});group=[];bytes=0}group.push(tile);bytes+=n}if(group.length)parts.push({role:'images',timeline:small,...uniqueAssets(group)});parts.push({role:'front',timeline:t,tiles:[],assets:[]});return parts;}
function groupParts(parts:any[]){const batches:any[][]=[];let batch:any[]=[],bytes=0;for(const p of parts){const n=byteSize(JSON.stringify(p));if(n>185000)throw new Error('The timeline structure is too large.');if(bytes+n>185000&&batch.length){batches.push(batch);batch=[];bytes=0}batch.push(p);bytes+=n}if(batch.length)batches.push(batch);return batches;}
// OPTIMIZATION_HELPERS_END
const byteSize=(s:string)=>new TextEncoder().encode(s).length;
class StopWork extends Error { constructor(message:string){super(message);this.name='StopWork';} }
const yieldUI=()=>new Promise<void>(resolve=>setTimeout(resolve,32));
async function boundedRead<T>(task:()=>Promise<T>|T,signal:AbortSignal,label:string,onPending:(delta:number)=>void,ms=30000):Promise<T>{
 if(signal.aborted)throw new StopWork('Stopped.');
 onPending(1);
 let timer:ReturnType<typeof setTimeout>|undefined;
 let abort:()=>void=()=>{};
 const work=Promise.resolve().then(()=>{if(signal.aborted)throw new StopWork('Stopped.');return task();}).finally(()=>onPending(-1));
 const guard=new Promise<T>((_,reject)=>{abort=()=>reject(new StopWork('A stop was requested. New work remains locked until the active read finishes.'));signal.addEventListener('abort',abort,{once:true});timer=setTimeout(()=>reject(new StopWork(label+' has taken more than 30 seconds. Additional requests were stopped. Do not retry until the current read finishes.')),ms);if(signal.aborted)abort();});
 try{return await Promise.race([work,guard]);}finally{if(timer)clearTimeout(timer);signal.removeEventListener('abort',abort);}
}
async function toBlob(value:any,fs:any):Promise<Blob>{
 if(value&&typeof value.arrayBuffer==='function')return value;
 // Host bytes come from window.parent, another realm, where instanceof fails (Blob accepts them).
 if(ArrayBuffer.isView(value)||Object.prototype.toString.call(value)==='[object ArrayBuffer]')return new Blob([value]);
 if(typeof value!=='string')throw new Error('No thumbnail was returned.');
 if(value.startsWith('local:')||value.startsWith('file:')){const path=await fs.localURLToPath(value),bytes=new Uint8Array(await fs.readFile(path));return new Blob([bytes]);}
 if(value.startsWith('data:')){const k=value.indexOf(','),head=value.slice(0,k),raw=head.includes(';base64')?atob(value.slice(k+1)):decodeURIComponent(value.slice(k+1));return new Blob([Uint8Array.from(raw,c=>c.charCodeAt(0))],{type:head.slice(5).split(';')[0]});}
 if(/^(blob:|https?:)/.test(value)){const r=await fetch(value);if(!r.ok)throw new Error('Thumbnail request failed');return r.blob();}
 if(/^[A-Za-z0-9+/=\s]+$/.test(value))return toBlob('data:image/jpeg;base64,'+value.replace(/\s/g,''),fs);
 throw new Error('Unsupported thumbnail URL.');
}
async function imageData(value:any,fs:any){const app=window as any,blob=await toBlob(value,fs),url=app.URL.createObjectURL(blob),img=app.document.createElement('img');try{await new Promise<void>((ok,no)=>{const timer=setTimeout(()=>{img.onload=null;img.onerror=null;img.removeAttribute('src');no(new StopWork('Thumbnail decoding exceeded 20 seconds and was stopped.'));},20000);img.onload=()=>{clearTimeout(timer);ok()};img.onerror=()=>{clearTimeout(timer);no(new Error('Thumbnail image decoding failed'))};img.src=url});const scale=Math.min(1,192/img.naturalWidth,108/img.naturalHeight),canvas=app.document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));const c=canvas.getContext('2d');c.fillStyle='#111';c.fillRect(0,0,canvas.width,canvas.height);c.drawImage(img,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.78);}finally{img.onload=null;img.onerror=null;img.removeAttribute('src');app.URL.revokeObjectURL(url)}}
class ImageWorker {
 worker:Worker|null=null;disabled=false;pending:any=null;timer:any=null;mode='Idle';
 terminate(){if(this.timer)clearTimeout(this.timer);this.timer=null;const p=this.pending;this.pending=null;this.worker?.terminate();this.worker=null;if(p)p.reject(new StopWork('Image conversion stopped.'));}
 async convert(value:any,fs:any):Promise<string>{const blob=await toBlob(value,fs);if(this.disabled){this.mode='Sequential UI';return imageData(blob,fs)}
 if(!this.worker){try{const app=window as any;if(!app.Worker||!app.OffscreenCanvas)throw new Error('worker unavailable');const js=`onmessage=async(e)=>{try{const image=await createImageBitmap(e.data);const scale=Math.min(1,192/image.width,108/image.height),c=new OffscreenCanvas(Math.max(1,Math.round(image.width*scale)),Math.max(1,Math.round(image.height*scale))),x=c.getContext('2d');x.fillStyle='#111';x.fillRect(0,0,c.width,c.height);x.drawImage(image,0,0,c.width,c.height);image.close();const b=await c.convertToBlob({type:'image/jpeg',quality:.78}),a=new Uint8Array(await b.arrayBuffer());let s='';for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode(...a.subarray(i,i+8192));postMessage({src:'data:image/jpeg;base64,'+btoa(s)});}catch(err){postMessage({error:String(err)});}};`;
 const url=app.URL.createObjectURL(new Blob([js],{type:'application/javascript'}));try{this.worker=new app.Worker(url);}finally{app.URL.revokeObjectURL(url)}
 this.worker!.onmessage=(e:any)=>{if(this.timer)clearTimeout(this.timer);const p=this.pending;this.pending=null;if(!p)return;if(e.data.error)p.reject(new Error(e.data.error));else p.resolve(e.data.src)};
 this.worker!.onerror=()=>{this.disabled=true;this.mode='Sequential UI';if(this.timer)clearTimeout(this.timer);const p=this.pending;this.pending=null;this.worker?.terminate();this.worker=null;if(p)p.reject(new Error('WORKER_UNAVAILABLE'));};
 }catch{this.disabled=true;this.mode='Sequential UI';return imageData(blob,fs)}}
 this.mode='Worker';try{return await new Promise<string>((resolve,reject)=>{this.pending={resolve,reject};this.timer=setTimeout(()=>this.terminate(),20000);this.worker!.postMessage(blob)});}catch(e:any){if(e.message==='WORKER_UNAVAILABLE')return imageData(blob,fs);throw e;}
 }
}
function Layout({ratio,setRatio,disabled,aspect}:{ratio:number;setRatio:(n:number)=>void;disabled:boolean;aspect:number}){const ref=useRef<HTMLDivElement|null>(null),drag=useRef(false),update=(y:number)=>{const r=ref.current?.getBoundingClientRect();if(r&&!disabled)setRatio(Math.max(30,Math.min(80,Math.round((y-r.top)/r.height*100))))};const fit=Math.min(1080/(aspect*1000),1920*ratio/100/1000),iw=aspect*1000*fit/1080*100,ih=1000*fit/1920*100;
return <div style={{display:'grid',gap:6,justifyItems:'center'}}><div ref={ref} role="slider" aria-label="Video area ratio" aria-valuemin={30} aria-valuemax={80} aria-valuenow={ratio} tabIndex={disabled?-1:0} onPointerDown={e=>{if(disabled)return;drag.current=true;e.currentTarget.setPointerCapture(e.pointerId);update(e.clientY)}} onPointerMove={e=>{if(drag.current)update(e.clientY)}} onPointerUp={()=>{drag.current=false}} onPointerCancel={()=>{drag.current=false}} onDoubleClick={()=>{if(!disabled)setRatio(50)}} onKeyDown={e=>{if(!disabled&&(e.key==='ArrowUp'||e.key==='ArrowDown')){e.preventDefault();setRatio(Math.max(30,Math.min(80,ratio+(e.key==='ArrowUp'?-1:1))))}}} style={{position:'relative',width:'min(156px,100%)',aspectRatio:'9/16',background:'#000',overflow:'hidden',border:'1px solid var(--panel-border)',touchAction:'none',cursor:'row-resize'}}><div style={{position:'absolute',left:`${(100-iw)/2}%`,top:`${ratio-ih}%`,width:`${iw}%`,height:`${ih}%`,background:'linear-gradient(160deg,#f59e0b,#2563eb,#0f766e)'}}/><span style={{position:'absolute',left:6,top:6,fontSize:9,color:'white'}}>Fit entire source · {ratio}%</span><div style={{position:'absolute',left:0,right:0,top:`${ratio}%`,bottom:0,background:'#171717',paddingTop:20}}>{[0,1,2].map(i=><div key={i} style={{margin:'4px 8px 4px 20px',height:15,background:i===0?'#5520a3':'#164e63',border:'1px solid #36c5d4'}}/>)}<div style={{position:'absolute',left:'42%',top:8,bottom:0,width:1,background:'#8ac926'}}/></div><div style={{position:'absolute',left:0,right:0,top:`calc(${ratio}% - 2px)`,height:4,background:'#38bdf8'}}/></div><small>Drag to split · Double-click for 50:50</small></div>}
function Panel({sdk,context}:any){
  hostUseSdk(sdk);
 const [rows,setRows]=useState<Row[]>([]),[id,setId]=useState(''),[name,setName]=useState('Timeline Shorts'),[ratio,setRatio]=useState(50),[bg,setBg]=useState('#151515'),[head,setHead]=useState('#8ac926'),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[status,setStatus]=useState(''),[last,setLast]=useState(''),[pendingRead,setPendingRead]=useState(0);const job=useRef<AbortController|null>(null),pendingReads=useRef(0);const lock=useRef(false),seqRef=useRef(''),load=useRef(0),projectRef=useRef(context.projectId);projectRef.current=context.projectId;const target=rows.find(x=>x.sequenceId===id);const [prepared,setPrepared]=useState<any>(null),[metrics,setMetrics]=useState<any>(null);const preparedRef=useRef<any>(null),converter=useRef(new ImageWorker()),metricRef=useRef<any>(null),sessionNonce=useRef(String(Date.now()));
 async function checkpoint(){await yieldUI();if(job.current?.signal.aborted)throw new StopWork('Stopped. Any Draft already saved is preserved.');}
 async function readStep<T>(label:string,task:()=>Promise<T>|T):Promise<T>{const signal=job.current?.signal;if(!signal)throw new StopWork('There is no active operation.');await checkpoint();return boundedRead(task,signal,label,delta=>{pendingReads.current+=delta;setPendingRead(pendingReads.current);});}
 function requestStop(){job.current?.abort();converter.current.terminate();setStatus('Stop requested. Active saves and reads are not force-terminated; no further step will start after they finish.');}
 async function run(script:string,summary:string,write=false){if(byteSize(script)>220000)throw new Error('The edit request must be split into smaller parts. Do not create a duplicate Draft.');const started=performance.now();const r=await sdk.runScript({script,summary,allowCommit:write});if(metricRef.current){const m=metricRef.current;m.scriptMs+=performance.now()-started;if(write)m.writes++;m.maxScriptBytes=Math.max(m.maxScriptBytes,byteSize(script));setMetrics({...m,worker:converter.current.mode});}if(r.isError)throw new Error(r.output||'Operation failed');if(r.result==null)throw new Error('The save result could not be confirmed. Check the Draft list instead of creating another Draft.');return r.result;}
 function assertProject(pid:string){if(projectRef.current!==pid)throw new Error('The project changed.');}
 async function ownership(pid:string,did:string){await run(`const m=await selects.project(${JSON.stringify(pid)}).meta();if(!m.draftIds.includes(${JSON.stringify(did)}))throw new Error('The selected Draft does not belong to the current project.');return{ok:true};`,'Verify Draft ownership');}
 function choose(did:string,list=rows){if(seqRef.current!==did){preparedRef.current=null;setPrepared(null)}seqRef.current=did;setId(did);const r=list.find(x=>x.sequenceId===did);if(r)setName(r.name+' — Timeline Shorts');}
 async function refresh(initial=false){if(!context.projectId||lock.current)return;const stamp=++load.current;setLoading(true);try{const out=await run(`const p=selects.project(${JSON.stringify(context.projectId)}),m=await p.meta(),rows=[];for(const sequenceId of m.draftIds){const d=selects.draft(sequenceId),meta=await d.meta(),c=await d.clips({trackScope:'all'}),endFrame=c.filter(c=>['main','video','audio'].includes(c.trackKind)).reduce((a,c)=>Math.max(a,c.endFrame),0);rows.push({sequenceId,name:meta.name??'Draft',fps:meta.fps,endFrame,durationSeconds:endFrame/meta.fps,frameSize:meta.frameSize})}return{rows};`,'Read Draft list');if(stamp!==load.current)return;setRows(out.rows);choose(initial&&out.rows.some((r:any)=>r.sequenceId===context.sequenceId)?context.sequenceId:out.rows.some((r:any)=>r.sequenceId===seqRef.current)?seqRef.current:out.rows[0]?.sequenceId||'',out.rows);}catch(e:any){setStatus(e.message)}finally{if(stamp===load.current)setLoading(false)}}
 useEffect(()=>{seqRef.current='';setId('');setRows([]);setLast('');void refresh(true);return()=>{load.current++;job.current?.abort();converter.current.terminate()}},[context.projectId]);
 async function entries(pid:string,did:string){await ownership(pid,did);assertProject(pid);return run(`const d=selects.draft(${JSON.stringify(did)}),rows=[];for(const graphic of await d.motionGraphics()){const program=await d.motionGraphicProgram(graphic.clip);if(program)rows.push({ownerClipId:graphic.clip.clipId,label:graphic.name,values:program.parameters});}return rows;`,'Read editable graphics');}
 async function sourceSnapshot(pid:string,did:string,layout:any){
  assertProject(pid);
  const snapshot=await sdk.call('getDraftMediaSnapshot',pid,did),rows:any[]=[],nativeSizes:Record<string,{width:number;height:number}>={},byId=new Map<string,any>();
  for(const row of layout.clips){
   await checkpoint();
   const clip=snapshot.clips.find(c=>c.clipId===row.clipId&&c.trackId===row.trackId);
   if(!clip||clip.startFrame!==row.startFrame||clip.endFrame!==row.endFrame||clip.resourceId!==row.resourceId)throw new Error('The source clip changed. Run preparation again.');
   byId.set(String(row.clipId),clip);
   const media=clip.media,stamp=media?{path:media.path,width:media.width,height:media.height,modified:media.modified??sessionNonce.current,checksum:media.checksum}:null;
   if(stamp?.width>0&&stamp?.height>0)nativeSizes[String(row.clipId)]={width:stamp.width,height:stamp.height};
   rows.push({id:row.clipId,track:row.trackId,s:row.startFrame,e:row.endFrame,start:clip.sourceStartSeconds,duration:row.endFrame-row.startFrame,camera:clip.camera,effects:clip.hasEffects?[true]:[],stamp});
  }
  const fingerprint=await digest({version:CACHE_VERSION,project:pid,draft:did,meta:layout.meta,order:snapshot.order,revision:snapshot.revision,rows});
  return {fingerprint,byId,order:snapshot.order,rows,nativeSizes,revision:snapshot.revision};
 }
 async function readLayout(pid:string,did:string){await ownership(pid,did);return run(`const d=selects.draft(${JSON.stringify(did)}),m=await d.meta(),c=await d.clips({trackScope:'all'}),r=await selects.project(${JSON.stringify(pid)}).resources(),names=new Map(r.map(x=>[x.resourceId,x.name]));return{meta:m,clips:c.filter(c=>['main','video','audio'].includes(c.trackKind)).map(c=>({...c,name:c.resourceId?(names.get(c.resourceId)??'Media'):(c.text??'Motion Graphic')}))};`,'Read source layout');}
 async function collect(pid:string,did:string,layout:any,snapshot:any){assertProject(pid);const fs=hostSdk.files,clips=layout.clips,fps=layout.meta.fps,total=clips.reduce((a:number,c:any)=>Math.max(a,c.endFrame),0),images:Record<string,string[]>={},warnings:string[]=[],safe=(s:string)=>s.replace(/[^A-Za-z0-9_-]/g,'_');const root=fs.join(fs.homedir(),'.selects','generated','timeline-shorts','cache-v3',safe(pid));(await fs.mkdir(root,{recursive:true}));const m=metricRef.current,start=performance.now();let completed=0;const memory=new Map<string,string>();
 const plans=clips.filter((r:any)=>r.trackKind!=='audio').map((row:any)=>{const c=snapshot.byId.get(String(row.clipId)),dur=Math.max(1,row.endFrame-row.startFrame),count=sampleCount(Math.max(1,row.endFrame-row.startFrame),total,fps);const fingerprintRow=snapshot.rows?.find((x:any)=>x.id===row.clipId);const still=fingerprintRow?.stamp?.path&&/\.(png|jpe?g|webp|bmp|tiff?)$/i.test(fingerprintRow.stamp.path)&&!(fingerprintRow.effects?.length);return{row,c,frames:sampleFrames(dur,count),stillKey:still?{stamp:fingerprintRow.stamp,camera:fingerprintRow.camera,adjustments:fingerprintRow.adjustments}:null}});m.planned=plans.reduce((n:number,p:any)=>n+p.frames.length,0);m.oldPlanned=plans.reduce((n:number,p:any)=>n+Math.min(6,Math.max(1,Math.ceil(Math.max(1,p.row.endFrame-p.row.startFrame)/fps/2))),0);
 for(const p of plans){const a:string[]=[];for(const frame of p.frames){await checkpoint();assertProject(pid);const key=await digest({version:CACHE_VERSION,fingerprint:snapshot.fingerprint,sample:p.stillKey??{clip:p.row.clipId,frame},fps,size:[192,108],quality:.78}),path=fs.join(root,key+'.json');let src=memory.get(key);
 if(!src&&await fs.exists(path)){try{const v=JSON.parse(new TextDecoder().decode(new Uint8Array(await fs.readFile(path))));if(v.key===key&&v.version===CACHE_VERSION&&typeof v.src==='string'&&v.src.startsWith('data:image/jpeg;base64,')&&v.src.length<140000&&v.checksum===await digest(v.src))src=v.src;}catch{warnings.push('Recomputed one cache entry');}}
 if(src){m.hits++;}else{m.misses++;setStatus(`Preparing thumbnail ${completed+1}/${m.planned} · cache ${m.hits}`);try{const stampRow=snapshot.rows?.find((x:any)=>x.id===p.row.clipId);let raw=await readStep('Thumbnail request',()=>sdk.call('getDraftClipThumbnail',{projectId:pid,sequenceId:did,trackId:p.row.trackId,clipId:p.row.clipId,presentationFrame:frame,revision:snapshot.revision}));if(!raw&&stampRow?.stamp?.path)raw=await readStep('Thumbnail from file',()=>ffmpegThumbnail(fs,root,stampRow.stamp.path,clipSourceSeconds(p.c,frame,fps)));if(!raw)throw new Error('The thumbnail response was empty.');src=await readStep('Worker image conversion',()=>converter.current.convert(raw,fs));if(!src?.startsWith('data:image/jpeg;base64,'))throw new Error('The converted image is invalid.');await fs.writeFile(path,new TextEncoder().encode(JSON.stringify({version:CACHE_VERSION,key,src,checksum:await digest(src)})));}catch(e:any){if(e instanceof StopWork)throw e;warnings.push(e.message);}}
 if(src){a.push(src);memory.set(key,src);m.imageBytes+=byteSize(src);}completed++;m.completed=completed;m.prepareMs=performance.now()-start;if(completed%4===0||completed===m.planned){setMetrics({...m,worker:converter.current.mode});await new Promise(r=>setTimeout(r,100));}}
 if(a.length)images[String(p.row.clipId)]=a;}
 if(!Object.keys(images).length)throw new Error('No thumbnails could be prepared. No Draft was created.');return{images,order:snapshot.order,warnings};}
 async function prepare(){if(lock.current||pendingReads.current>0||!target)return;job.current=new AbortController();lock.current=true;setBusy(true);preparedRef.current=null;setPrepared(null);metricRef.current={planned:0,oldPlanned:0,hits:0,misses:0,completed:0,imageBytes:0,prepareMs:0,scriptMs:0,writes:0,maxScriptBytes:0};try{const pid=context.projectId,did=id,layout=await readLayout(pid,did),snapshot=await sourceSnapshot(pid,did,layout);const unresolved=layout.clips.filter((c:any)=>['main','video'].includes(c.trackKind)&&c.resourceId&&!snapshot.nativeSizes[String(c.clipId)]);if(unresolved.length)throw new Error('Native dimensions are unavailable for '+unresolved.length+' video or image clips. Preparation stopped without estimating dimensions.');const assets=await collect(pid,did,layout,snapshot);const fresh=await readLayout(pid,did),check=await sourceSnapshot(pid,did,fresh);if(check.fingerprint!==snapshot.fingerprint)throw new Error('The source changed during preparation. The result was not applied; prepare again.');const primary=layout.clips.filter((c:any)=>c.trackKind==='main'&&snapshot.nativeSizes[String(c.clipId)]).sort((a:any,b:any)=>(b.endFrame-b.startFrame)-(a.endFrame-a.startFrame))[0]??layout.clips.find((c:any)=>snapshot.nativeSizes[String(c.clipId)]);if(!primary)throw new Error('No reference native dimensions could be found.');const ready={pid,did,layout,assets,fingerprint:snapshot.fingerprint,nativeSizes:snapshot.nativeSizes,sourceSize:snapshot.nativeSizes[String(primary.clipId)],sourceName:primary.name};preparedRef.current=ready;setPrepared(ready);setStatus(`Preparation complete · ${metricRef.current.completed} images · cache ${metricRef.current.hits} images · no Draft was created yet.${assets.warnings.length?' · warnings '+assets.warnings.length+'':''}`);}catch(e:any){setStatus(e.message+' Completed thumbnail cache entries remain available for the next preparation.');}finally{job.current=null;lock.current=false;setBusy(false);if(metricRef.current)setMetrics({...metricRef.current,worker:converter.current.mode})}}
 // Every image is baked into a bounded SDK transaction. No local URL is persisted in generated layers.
 async function install(pid:string,did:string,timeline:any,images:Record<string,string[]>,oldIds:number[],background:string,playhead:string){
 const group='ts-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),t=JSON.parse(JSON.stringify(timeline)),tiles:any[]=[];t.laneCount=t.lanes.length;
 for(let row=0;row<t.lanes.length;row++){for(const c of t.lanes[row].clips){const a=images[String(c.id)]??c.thumbnails??[];for(let i=0;i<a.length;i++){if(!/^data:image\//.test(a[i]))throw new Error('Saving stopped because an external thumbnail URL remained.');tiles.push({row,startFrame:c.startFrame,endFrame:c.endFrame,slot:i,slots:a.length,src:a[i]})}delete c.thumbnails;}}
 const parts=planParts(t,tiles).map((p:any)=>({...p,bundle:group,version:3,background,playhead,textColor:'#edf1f5'}));
 const batches=groupParts(parts);
 const scripts=batches.map((batch:any[])=>`const d=selects.draft(${JSON.stringify(did)}),before=new Set((await d.clips({trackScope:'all'})).map(c=>c.clipId)),code=${JSON.stringify(CODE)},parts=${JSON.stringify(batch)};for(const values of parts){const first=await d.rangeAtFrames(0,1);await d.addMotionGraphic({at:{before:first},durationSeconds:${t.durationFrames/t.fps},label:'Selects Timeline v3 · '+values.role+' · '+values.bundle,tsxCode:code,parameters:values});}await d.commitAll('Save optimized embedded timeline');return{added:(await d.clips({trackScope:'all'})).filter(c=>!before.has(c.clipId)).map(c=>c.clipId)};`);
 for(const s of scripts)if(byteSize(s)>220000)throw new Error('The timeline exceeds the request limit. The existing Draft was not changed.');
 const added:number[]=[];let swapStarted=false;
 try{
  for(let i=0;i<scripts.length;i++){await checkpoint();assertProject(pid);setStatus(`Saving embedded graphic ${i+1}/${scripts.length}`);const r=await run(scripts[i],'Save embedded timeline layer',true);added.push(...r.added);}
  const saved=(await entries(pid,did)).filter((e:any)=>e.values?.bundle===group);if(saved.length!==parts.length)throw new Error('The number of saved graphics does not match the plan.');let verified=0;for(const e of saved){for(const q of e.values.tiles??[]){if(!(q.src??e.values.assets?.[q.asset])?.startsWith('data:image/'))throw new Error('Embedded thumbnail verification failed');verified++}if(JSON.stringify(e.values).includes('local://'))throw new Error('A local URL remains.');}if(verified!==tiles.length)throw new Error('The number of saved thumbnails does not match the plan.');
  if(oldIds.length){await checkpoint();swapStarted=true;await run(`const d=selects.draft(${JSON.stringify(did)}),ids=new Set(${JSON.stringify(oldIds)}),all=await d.clips({trackScope:'all'}),c=all.filter(c=>ids.has(c.clipId));if(c.length!==ids.size)throw new Error('The existing graphic changed, so replacement was stopped.');if(c.some(c=>c.trackKind!=='video'||c.resourceId!=null))throw new Error('The target is not a timeline graphic.');await d.removeClips(c);await d.commitAll('Replace timeline with embedded images');return{removed:c.length};`,'Replace legacy timeline',true);}
  return {count:verified,parts:saved.length,transactions:scripts.length};
 }catch(e:any){const message=e.message;try{if(swapStarted){const state=await run(`const ids=new Set(${JSON.stringify(oldIds)});return{remaining:(await selects.draft(${JSON.stringify(did)}).clips({trackScope:'all'})).filter(c=>ids.has(c.clipId)).length};`,'Check replacement persistence');if(state.remaining!==oldIds.length)throw new Error('The old-graphic replacement may have been saved, so the new graphics were preserved. Check the Draft before retrying.');}const current=(await entries(pid,did)).filter((x:any)=>x.values?.bundle===group).map((x:any)=>x.ownerClipId);if(current.length)await run(`const d=selects.draft(${JSON.stringify(did)}),ids=new Set(${JSON.stringify(current)}),c=(await d.clips({trackScope:'all'})).filter(c=>ids.has(c.clipId)&&c.trackKind==='video'&&c.resourceId==null);if(c.length){await d.removeClips(c);await d.commitAll('Remove incomplete thumbnail repair')}return{ok:true};`,'Clean incomplete repair',true);}catch(clean:any){throw new Error(message+' / Failed to clean incomplete layers: '+clean.message)}throw new Error(message);}
 }
 async function repair(){if(lock.current||pendingReads.current>0||!id)return;job.current=new AbortController();lock.current=true;setBusy(true);const pid=context.projectId;try{const es=await entries(pid,id),bases=es.filter((e:any)=>((e.values?.version>=2&&['base','full'].includes(e.values?.role))||(!e.values?.version&&/^(Selects Timeline|Actual Timeline)/.test(e.label)))&&Array.isArray(e.values?.timeline?.lanes));if(!bases.length)throw new Error('Select a generated timeline-shorts Draft.');let count=0;
 for(const base of bases){await checkpoint();const t=JSON.parse(JSON.stringify(base.values.timeline)),old=base.values.version>=2?es.filter((e:any)=>e.values?.bundle===base.values.bundle):[base],oldIds=old.map((e:any)=>e.ownerClipId);const timing=await run(`const d=selects.draft(${JSON.stringify(id)}),ids=new Set(${JSON.stringify(oldIds)});return{clips:(await d.clips({trackScope:'all'})).filter(c=>ids.has(c.clipId)).map(c=>({s:c.startFrame,e:c.endFrame}))};`,'Check repair scope');if(timing.clips.some((c:any)=>c.s!==0||Math.abs(c.e-t.durationFrames)>1))throw new Error('A timeline graphic with changed timing or position is not replaced automatically.');if(base.values.version>=2){count+=old.reduce((n:number,e:any)=>n+(e.values.tiles?.length||0),0);continue;}
 const images:Record<string,string[]>={},cache=new Map<string,string>();assertProject(pid);let missing=0;for(const lane of t.lanes)for(const c of lane.clips){const srcs=c.thumbnails??[];if(!srcs.length&&c.kind!=='audio')missing++;const a=[];for(const src of srcs){assertProject(pid);setStatus(`Reading existing thumbnail · ${cache.size+1}`);let data=cache.get(src);if(!data){data=await readStep('Read existing thumbnail',()=>imageData(src,hostSdk.files));cache.set(src,data)}a.push(data)}images[String(c.id)]=a;}
 if(!Object.values(images).some(a=>a.length))throw new Error('No recoverable image data was found. Create again from the source Draft.');const r=await install(pid,id,t,images,oldIds,base.values.background||'#151515',base.values.playhead||'#8ac926');count+=r.count;if(missing)setStatus(`Warning: clips without source thumbnails ${missing}`);}
 setStatus(`Repair saved and embedded images verified · ${count} images. The existing video layout was preserved. Final export verification remains separate.`);
 }catch(e:any){setStatus('Repair failed: '+e.message)}finally{job.current=null;lock.current=false;setBusy(false)}}
 async function build(){if(lock.current||pendingReads.current>0||!target)return;const ready=preparedRef.current;if(!ready||ready.pid!==context.projectId||ready.did!==id){setStatus('Complete step 1, thumbnail preparation, first.');return;}job.current=new AbortController();lock.current=true;setBusy(true);const pid=context.projectId,sourceId=id;let did='';try{const latest=await readLayout(pid,sourceId),snapshot=await sourceSnapshot(pid,sourceId,latest);if(snapshot.fingerprint!==ready.fingerprint){preparedRef.current=null;setPrepared(null);throw new Error('The source changed, so the prepared data cannot be used. Prepare again.');}const layout=ready.layout,duration=layout.clips.reduce((a:number,c:any)=>Math.max(a,c.endFrame),0),assets=ready.assets,map=new Map<string,any>();for(const c of layout.clips){if(!map.has(c.trackId))map.set(c.trackId,{id:c.trackId,kind:c.trackKind,clips:[]});map.get(c.trackId).clips.push({id:String(c.clipId),kind:c.trackKind==='video'&&c.resourceId==null?'generator':c.trackKind,startFrame:c.startFrame,endFrame:c.endFrame,name:c.name,color:c.color})}const lanes=[...map.values()].sort((a,b)=>(assets.order[a.id]??999999)-(assets.order[b.id]??999999));let v=0,a=0;for(const l of lanes)l.label=l.kind==='main'?'MAIN':l.kind==='audio'?'A'+(++a):'V'+(++v);const t={name:layout.meta.name,durationFrames:duration,fps:layout.meta.fps,topRatio:ratio,lanes};assertProject(pid);
 await checkpoint();const create=(copy:'duplicate'|'insert')=>run(`const p=selects.project(${JSON.stringify(pid)}),s=selects.draft(${JSON.stringify(sourceId)}),nativeSizes=${JSON.stringify(ready.nativeSizes)},reference=${JSON.stringify(ready.sourceSize)},fit=${nativePlacement.toString()};
const sourceClips=await s.clips({trackScope:'all'});const unresolved=sourceClips.filter(c=>['main','video'].includes(c.trackKind)&&c.resourceId&&!nativeSizes[String(c.clipId)]);if(unresolved.length)throw new Error('A clip without native dimensions is not placed.');
const draftName=${JSON.stringify(name.trim()||'Timeline Shorts')};const useDuplicate:boolean=${copy==='duplicate'};let d;if(useDuplicate)d=await p.duplicateDraft({sourceDraftId:${JSON.stringify(sourceId)},name:draftName});else{d=await p.createDraft({name:draftName});const total=sourceClips.reduce((a,c)=>Math.max(a,c.endFrame),0);if(total<1)throw new Error('The source Draft is empty.');await d.insert({source:await s.rangeAtFrames(0,total),tracks:'all'});}
const used=new Set<number>(),match=(c:{clipId:number;trackKind:string;resourceId:string|null;startFrame:number;endFrame:number})=>{const same=sourceClips.find(x=>x.clipId===c.clipId&&x.resourceId===c.resourceId&&x.startFrame===c.startFrame);const hit=same??sourceClips.find(x=>!used.has(x.clipId)&&x.trackKind===c.trackKind&&x.resourceId===c.resourceId&&x.startFrame===c.startFrame&&x.endFrame===c.endFrame);if(hit)used.add(hit.clipId);return hit;},next={width:1080,height:1920},top=1920*${ratio}/100,refScale=Math.min(1080/reference.width,top/reference.height),refW=reference.width*refScale,refH=reference.height*refScale,specs=[];
const copies=await d.clips({trackScope:'all'});for(const c of copies.filter(c=>c.trackKind==='main'||c.trackKind==='video')){const tr=await d.clipTransform(c);let t;if(c.resourceId){const source=match(c);const media=source?nativeSizes[String(source.clipId)]:null;if(!media)throw new Error('Native dimensions for a duplicated clip could not be found.');t=fit(media,top,tr.rotation);}else{const factor=Math.min(refW/next.width,refH/next.height);t={enabled:tr.enabled,position:{x:tr.position.x*factor,y:(960-top+refH/2)/1920*100+tr.position.y*factor},scale:{x:tr.scale.x*factor,y:tr.scale.y*factor},anchor:tr.anchor,rotation:tr.rotation};}specs.push({id:c.clipId,t});}
await d.setFrameSize(next);for(const spec of specs){const c=(await d.clips({trackScope:'all'})).find(c=>c.clipId===spec.id);if(c)await d.setClipTransform({clip:c,...spec.t})}
const out=await d.commitAll('Create uncropped timeline shorts layout');return {id:out.createdDraftId};`,'Create uncropped Draft',true);
 // duplicateDraft also copies retake groups, which needs the host's retake.contentSnapshots capability (missing on
 // Windows Staging 2.0.536). A failed run saves nothing, so rebuild the copy with createDraft + insert(tracks:'all').
 let result:any;try{result=await create('duplicate');}catch(e:any){if(!/unsupported_host_capability|retake\.contentSnapshots/.test(String(e?.message??e)))throw e;setStatus('This Selects build cannot duplicate Drafts; copying the timeline instead.');result=await create('insert');}if(!result.id)throw new Error('The saved Draft could not be identified.');did=result.id;setLast(did);preparedRef.current=null;setPrepared(null);const done=await install(pid,did,t,assets.images,[],bg,head);await run(`await selects.editor.openDraft(${JSON.stringify(did)});return{ok:true};`,'Open saved Draft');setStatus(`New Draft saved · embedded thumbnails ${done.count} images · Motion Graphics ${done.parts} · graphic saves ${done.transactions}${assets.warnings.length?' · collection warnings '+assets.warnings.length+'':''}. The source is not cropped; empty space is preserved. Export verification remains separate.`);
 }catch(e:any){setStatus((did?'The video-layout Draft was saved. Do not create a duplicate. ':'')+e.message)}finally{job.current=null;lock.current=false;setBusy(false)}}
 return <div style={{display:'grid',gap:8}}><h2>Timeline Shorts</h2><small>v3 · staged preparation · reusable cache · fit entire source</small>{busy&&<button data-variant="secondary" onClick={requestStop}>Request stop</button>}{pendingRead>0&&!busy&&<small role="status">Active reads {pendingRead} must finish. Additional creation remains locked.</small>}<label htmlFor="source">Source Draft</label><select id="source" value={id} onChange={e=>choose(e.target.value)} disabled={busy||pendingRead>0||loading}>{!rows.length&&<option value="">No Drafts</option>}{rows.map(r=><option key={r.sequenceId} value={r.sequenceId}>{r.name} · {r.durationSeconds.toFixed(1)}s</option>)}</select><button data-variant="ghost" onClick={()=>void refresh()} disabled={busy||pendingRead>0||loading}>Refresh Draft list</button><button data-variant="secondary" disabled={busy||pendingRead>0||!target} onClick={()=>void repair()}>Repair export thumbnails in selected shorts Draft</button><small style={{color:'var(--panel-muted-fg)'}}>Replaces only the timeline graphic in an existing shorts Draft. The old graphic is removed only after embedded-image storage is verified.</small><hr/><label htmlFor="new-name">New Draft name</label><input id="new-name" value={name} onChange={e=>setName(e.target.value)} disabled={busy}/>{prepared?.sourceSize?<small>Reference source: {prepared.sourceName} · {prepared.sourceSize.width}×{prepared.sourceSize.height}</small>:<small style={{color:'var(--panel-muted-fg)'}}>Native dimensions appear after step 1. The preview below is temporary.</small>}<Layout ratio={ratio} setRatio={setRatio} disabled={busy} aspect={prepared?.sourceSize?prepared.sourceSize.width/prepared.sourceSize.height:16/9}/><select aria-label="Split preset" value={[50,60,70].includes(ratio)?String(ratio):'custom'} onChange={e=>{if(e.target.value!=='custom')setRatio(Number(e.target.value))}} disabled={busy}><option value="50">50:50</option><option value="60">60:40</option><option value="70">70:30</option><option value="custom">Custom</option></select><label htmlFor="ratio">Video {ratio}% · Timeline {100-ratio}%</label><input id="ratio" type="range" min={30} max={80} value={ratio} onChange={e=>setRatio(Number(e.target.value))} disabled={busy}/><small style={{color:'var(--panel-muted-fg)'}}>Fits videos and images from their native dimensions. Existing Draft zoom and position are not reused. Unused area remains empty.</small><label htmlFor="bg">Timeline background</label><input id="bg" type="color" value={bg} onChange={e=>setBg(e.target.value)} disabled={busy}/><label htmlFor="head">Fixed playhead color</label><input id="head" type="color" value={head} onChange={e=>setHead(e.target.value)} disabled={busy}/><hr/><button data-variant="secondary" onClick={()=>void prepare()} disabled={busy||pendingRead>0||!target||!target.endFrame}>1. Prepare thumbnails / resume from cache</button><small style={{color:'var(--panel-muted-fg)'}}>Preparation does not create a Draft. Completed images are reused on the next preparation.</small><button disabled={busy||pendingRead>0||!prepared||!target||!target.endFrame||!name.trim()} onClick={()=>void build()}>2. Create Draft from prepared images</button>{metrics&&<small style={{whiteSpace:'pre-wrap',color:'var(--panel-muted-fg)'}}>{`Thumbnails ${metrics.completed}/${metrics.planned} · previous method ${metrics.oldPlanned}\nCache ${metrics.hits} · new requests ${metrics.misses} · images ${(metrics.imageBytes/1024).toFixed(0)}KB\nPreparation ${(metrics.prepareMs/1000).toFixed(1)}s · edit calls ${(metrics.scriptMs/1000).toFixed(1)}s · saves ${metrics.writes}\nImage processing: ${metrics.worker||'Idle'}`}</small>}{last&&<small>A new Draft was saved. If a later step fails, check the list instead of creating a duplicate.</small>}{status&&<small role="status" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{status}</small>}<small style={{color:'var(--panel-muted-fg)'}}>Duration is not trimmed. Image bytes are split into small save requests. The source Draft is preserved.</small></div>
}

let hostSdk: any = null;
function hostUseSdk(sdk: any) { hostSdk = panelLocalClient(sdk); if (!hostSdk?.files || !hostSdk?.media || !hostSdk?.environment) throw new Error("Update Selects to use this plugin."); }

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
