import {sdkFreeHelpersSource,vlogOperation} from './sdk_free_helpers.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs';import fsp from 'node:fs/promises';import vm from 'node:vm';import {webcrypto} from 'node:crypto';
import {holdFixture} from './gallery_hold_fixture.mjs';
import {MessageChannel} from 'node:worker_threads';
const source=sdkFreeHelpersSource()+'\n'+fs.readFileSync(new URL('../shared/template-run.js',import.meta.url),'utf8'),assemble=vlogOperation('mini-vlog','assemble'),decorate=vlogOperation('mini-vlog','decorate');
const clone=v=>JSON.parse(JSON.stringify(v));
export async function lookPhaseFixture(t,{pluginId='mini-vlog',assemblySource=assemble,decorationSource=decorate,probeName='Mini source timing check'}={}){
 const f=await holdFixture(t),hooks=f.hooks,saved=new Map(),requests=[],pending=[];let serial=0,commits=0,epoch=0,probeSerial=0;
 // Assembly runs in the real SDK-script shape, including its existing native
 // media port. Keep native jobs owned by this fixture; execute actual FFmpeg so
 // source mutation and complete-byte verification remain meaningful.
 const nativeJobs=new Map(),scriptScopes=new Set();let nativeSerial=0;
 t.after(async()=>{try{for(const job of nativeJobs.values())if(job.state==='running')job.controller.abort();await Promise.all([...nativeJobs.values()].map(job=>job.done));}finally{for(const {channel} of scriptScopes){channel.port1.close();channel.port2.close();}scriptScopes.clear();}});
 const nativeMedia=authorized=>({
  startFFmpeg:async({args})=>{
   assert.equal(authorized,true,'native media start requires allowCommit');
   const jobId='look-native-'+ ++nativeSerial,job={controller:new AbortController(),state:'running',events:[],done:null,error:undefined};nativeJobs.set(jobId,job);
   job.done=f.local.media.runFFmpeg(args,true,job.controller.signal).then(result=>{
    for(const stream of ['stdout','stderr'])for(let i=0;i<result[stream].length;i+=4096)job.events.push({cursor:job.events.length+1,stream,text:result[stream].slice(i,i+4096)});
    job.state='succeeded';
   },error=>{job.state=job.controller.signal.aborted?'cancelled':'failed';job.error=error.message;if(job.state==='failed')t.diagnostic?.(JSON.stringify({fixture:'look-native',jobId,args,code:error.code,signal:error.signal,stderr:error.stderr,message:error.message}));});
   return {jobId};
  },
  job:jobId=>{const job=nativeJobs.get(jobId);assert.ok(job,'only this fixture owns its native job');return {
   status:async({cursor=0}={})=>{await new Promise(resolve=>setImmediate(resolve));const events=job.events.filter(event=>event.cursor>cursor).slice(0,8);return {state:job.state,events,nextCursor:events.at(-1)?.cursor??cursor,truncated:false,...job.error?{error:job.error}:{}};},
   cancel:async()=>{assert.equal(authorized,true,'native media cancel requires allowCommit');job.controller.abort();},
  };},
 });
 saved.set('unrelated',{name:'Unrelated',clips:[{clipId:44,trackId:'main',trackKind:'main',resourceId:'foreign',startFrame:0,endFrame:60}]});
 f.files.readdir=p=>fsp.readdir(p);
 function handle(id,state){
  let committed=false;const fresh=r=>({...clone(r),_epoch:epoch}),valid=r=>assert.equal(r._epoch,epoch,'opaque target is stale'),rows=()=>state.clips;
  return {meta:async()=>({name:state.name,fps:30,durationFrames:Math.max(0,...rows().map(r=>r.endFrame)),frameSize:{width:1920,height:1080}}),setFrameSize:async()=>{},
   clips:async({trackScope}={})=>rows().filter(r=>trackScope!=='main'||r.trackKind==='main').map(fresh),
   insertResource:async({resourceId,sourceRange})=>{const at=rows().at(-1)?.endFrame??0;rows().push({clipId:rows().length+1,trackId:'main',trackKind:'main',resourceId,startFrame:at,endFrame:at+Math.round((sourceRange.endSeconds-sourceRange.startSeconds)*30),videoIndex:0,audioSourceIndexes:[0],color:null,playbackSpeed:{numerator:1,denominator:1},preserveAudioPitch:true,_source:{startSeconds:sourceRange.startSeconds,endSeconds:sourceRange.endSeconds}});epoch++;},
   setClipTransform:async()=>{},setClipAudio:async({clip,...patch})=>{valid(clip);const row=rows().find(r=>r.clipId===clip.clipId);Object.assign(row._audio??={},clone(patch));epoch++;},clipSourceWindow:async r=>{valid(r);return r.resourceId?{clipId:r.clipId,...(r._source??{startSeconds:0,endSeconds:(r.endFrame-r.startFrame)/30})}:null;},clipTransform:async r=>{valid(r);return {enabled:true,position:{x:0,y:0},scale:{x:r._scale??1,y:1},anchor:{x:0,y:0},rotation:0,flipHorizontal:false,flipVertical:false,positionKeys:[],scaleKeys:[],rotationKeys:[]};},clipAudio:async r=>{valid(r);return {clipId:r.clipId,volumeDb:r._volume??0,volumeKeys:[],fadeInSeconds:0,fadeOutSeconds:0,...r._audio};},
   overlayResource:async({resource,over,sourceStartSeconds})=>{valid(over);rows().push({clipId:200+rows().length,trackId:'audio',trackKind:'audio',resourceId:resource.rid,startFrame:over.startFrame,endFrame:over.endFrame,videoIndex:null,audioSourceIndexes:null,playbackSpeed:{numerator:1,denominator:1},preserveAudioPitch:true,_source:{startSeconds:sourceStartSeconds,endSeconds:sourceStartSeconds+(over.endFrame-over.startFrame)/30}});epoch++;},
   rangeAtFrames:async(startFrame,endFrame)=>({startFrame,endFrame,_epoch:epoch}),
   motionGraphics:async()=>rows().filter(r=>r._graphic).map(r=>({name:r._graphic.name,clip:fresh(r)})),motionGraphicProgram:async r=>{valid(r);return clone(rows().find(c=>c.clipId===r.clipId)?._graphic?.program??null);},
   videoEffects:async r=>{valid(r);return (rows().find(c=>c.clipId===r.clipId)?._effects??[]).map((e,i)=>({clipId:r.clipId,trackId:r.trackId,effectIndex:i,name:e.name,effectName:e.name,enabled:e.enabled,_epoch:epoch}));},
   videoEffectProgram:async e=>{valid(e);return clone(rows().find(r=>r.clipId===e.clipId)._effects[e.effectIndex].program);},
   addMotionGraphic:async o=>{valid(o.within);rows().push({clipId:100+rows().length,trackId:'graphic',trackKind:'video',resourceId:null,startFrame:o.within.startFrame,endFrame:o.within.endFrame,videoIndex:null,audioSourceIndexes:null,color:null,_graphic:{name:o.label,program:{tsxCode:o.tsxCode,parameters:clone(o.parameters),editableParameters:clone(o.editableParameters)}}});epoch++;},
   addVideoEffect:async o=>{valid(o.clip);const row=rows().find(r=>r.clipId===o.clip.clipId);(row._effects??=[]).push({name:o.label,enabled:true,program:{tsxCode:o.tsxCode,parameters:clone(o.parameters),editableParameters:clone(o.editableParameters)}});epoch++;},
   setAudioTracks:async()=>{for(const r of rows().filter(r=>r.trackKind==='main'))r.audioSourceIndexes=[];epoch++;return {opCount:1};},
   commitAll:async reason=>{assert.equal(committed,false);committed=true;commits++;saved.set(id,clone(state));await hooks.commit?.(id,reason);return {createdDraftId:id};}};
 }
 const sdk={call:async(method,_projectId,draftId)=>{
  if(method==='getProjectDraftScaffold')return {owner:{projectId:'p',libraryId:hooks.library??'library'}};
  const id=method==='getDraftCore'?_projectId:draftId,state=saved.get(id);assert.ok(state,'saved read cannot see a working copy');
  if(method==='getDraftCore')return {owner:{projectId:'p',libraryId:hooks.library??'library'},sequenceJson:{id,frameRate:30,...clone(state)}};
  assert.equal(method,'getDraftMediaSnapshot');return {revision:JSON.stringify(state),fps:30,durationFrames:Math.max(...state.clips.map(r=>r.endFrame)),clips:state.clips.filter(r=>r.resourceId).map(r=>({clipId:r.clipId,trackId:r.trackId,trackKind:r.trackKind,resourceId:r.resourceId,startFrame:r.startFrame,endFrame:r.endFrame,sourceStartSeconds:r._source?.startSeconds??0,sourceEndSeconds:r._source?.endSeconds??(r.endFrame-r.startFrame)/30,playbackSpeed:r.playbackSpeed?r.playbackSpeed.numerator/r.playbackSpeed.denominator:1}))};
 },runScript:async input=>{
  requests.push(input);hooks.currentInput=input.summary;const selects={files:f.files,editor:{linkToDraftFrame:async()=>({deepLinkUrl:'selects://fixture'}),openDraft:async()=>{}},project:()=>({importFiles:async input=>{if(!hooks.importFiles)throw Error('Unexpected import in save fixture');return hooks.importFiles(input);},resources:async()=>hooks.resources??[],resource:rid=>({rid}),sourceFiles:async()=>hooks.sourceFiles?hooks.sourceFiles():({fileTree:[{type:"video",resourceId:"r0",path:f.source}]}),meta:async()=>({draftIds:[...saved.keys()]}),createDraft:async({name})=>handle(name===probeName?'probe-'+ ++probeSerial:'d'+ ++serial,{name,clips:[]})}),draft:id=>{assert.ok(saved.has(id));return handle(id,clone(saved.get(id)));}};
  selects.media=nativeMedia(input.allowCommit===true);
  // A real SDK host owns an open IPC connection while a script is running.
  // Model that transport lifetime: Atomics.waitAsync alone does not retain
  // Node's loop after FFmpeg exits between two status observations.
  // V8 may discard a context whose only pending work is waitAsync. The host
  // must retain the execution space, not just an unrelated open transport.
  const channel=new MessageChannel(),context=vm.createContext({selects}),scope={channel,context};scriptScopes.add(scope);channel.port1.on('message',()=>{});
  const work=(async()=>{try{const result=await vm.runInContext('(async()=>{'+input.script+'})()',context);await hooks.reply?.(input,result);return {result};}catch(error){if(input.summary==='Assemble template with owned receipt')t.diagnostic?.(JSON.stringify({fixture:'assembly-cause',summary:input.summary,message:error.message,cause:error.cause?.message,stack:error.stack}));return {isError:true,output:error.message};}finally{channel.port1.close();channel.port2.close();scriptScopes.delete(scope);}})();
  if(hooks.lostEarly&&input.summary==='Decorate template with owned receipt'||hooks.lostAssembly&&input.summary==='Assemble template with owned receipt'){pending.push(work);return {isError:true,output:'channel lost while Main is running'};}return work;
 }};
 const mount=()=>{const box=vm.createContext({crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array});vm.runInContext(source,box);return box;};
 const root={scope:{pluginId,projectId:'p',runId:'original'},config:{projectId:'p',draftName:'Owned',picks:[{rid:'r0',startSeconds:0,sourceDuration:20}],boundaries:[0,2],crops:{},music:null,clipSound:'full'},source:assemblySource,frozen:{pid:'p',seed:7},plan:{picks:[{rid:'r0'}]}};
 const prepare=async(value,a)=>({source:decorationSource,config:{projectId:'p',sequenceId:a.sequenceId,videoEnd:a.totalFrames,mute:true,title:{tsx:'export default function Title(){return null}',parameters:{text:'Saturday'},editableParameters:[{key:'text',label:'Text',type:'text',defaultValue:'Saturday'}]},soft:null,photos:[]}});
 const open=async()=>mount().openTemplateAssemblyContinuations(sdk,f.local.files,{pluginId,projectId:'p',requestLimit:98304},()=>hooks.live!==false);
 return {...f,sdk,hooks,saved,requests,pending,root,prepare,open,mount,commits:()=>commits};
}
