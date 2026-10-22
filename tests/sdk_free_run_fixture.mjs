import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const runSource=fs.readFileSync(new URL('../shared/template-run.js',import.meta.url),'utf8');
const clone=v=>JSON.parse(JSON.stringify(v));
// Contract mocks for helpers implemented by the parent in draft-observation.js
// and its file observer. These tests exercise durable ownership, not hashing or
// the production bridge's JSON parser (each has its own parent-owned suite).
export async function readTemplateDraftSources(sdk,projectId,draftId,libraryId){return sdk.call('getDraftMediaSnapshot',projectId,draftId,libraryId);}
export function templateObservedSource(sources,row){
 const found=sources?.clips?.filter(c=>c.clipId===row.clipId&&c.trackId===row.trackId);
 if(found?.length!==1||found[0].trackKind!==row.trackKind||found[0].startFrame!==row.startFrame||found[0].endFrame!==row.endFrame)throw Error('Saved source placement changed.');
 return {clipId:row.clipId,startSeconds:found[0].source.startSeconds,endSeconds:found[0].source.endSeconds};
}
export async function fingerprintTemplateFile(files,path){const stat=await files.stat(path);return stat?{size:stat.size,sha256:'a'.repeat(64)}:null;}
export const assembly=`// @template-assembly 1
const cfg = __CONFIG__, d = await selects.project(cfg.projectId).createDraft({name:cfg.draftName});
const rows=await d.clips({trackScope:'main'});
const intent=rows.map(row=>({clipId:row.clipId,trackId:row.trackId,trackKind:row.trackKind,resourceId:row.resourceId,startFrame:row.startFrame,endFrame:row.endFrame,source:{clipId:row.clipId,startSeconds:cfg.plannedStart,endSeconds:cfg.plannedStart+1}}));
await cfg.__beforeCommit(d,intent);const commit=await d.commitAll('assemble');
return {sequenceId:commit.createdDraftId,fps:30,totalFrames:30};`;
export const decoration=`// @template-decoration 1
const cfg = __CONFIG__, d=selects.draft(cfg.sequenceId);
await d.addVideoEffect({name:'fixture'});await cfg.__beforeCommit(d,true);await d.commitAll('decorate');return {committed:true};`;
export function runFixture(){
 const disk=new Map(),saved=new Map(),requests=[],hooks={};let serial=0,commits=0,sourceReads=0;
 const key=p=>typeof p==='string'?p:p.path;
 const raw={homedir:()=>'/home',join:(...parts)=>parts.join('/'),mkdir:async()=>{},exists:async p=>disk.has(key(p)),
  stat:async p=>disk.has(key(p))?{isDirectory:false,size:Buffer.byteLength(disk.get(key(p))),ino:1,mtimeMs:1}:null,
  readRange:async(p,offset,length)=>{const object=typeof p==='object',path=key(p),start=object?p.offset:offset,size=object?p.length:length;
   if(!disk.has(path))throw Error('missing file');const bytes=Buffer.from(disk.get(path)).subarray(start,start+size);
   return object?{bytesRead:bytes.length,base64:bytes.toString('base64')}:new Uint8Array(bytes);},
  writeChunk:async({path,offset,base64,mode})=>{if(mode==='exclusive'&&disk.has(path))throw Error('exists');const value=Buffer.from(base64,'base64').toString();disk.set(path,(disk.get(path)??'').slice(0,offset)+value);return {bytesWritten:Buffer.byteLength(value)};},
  writeFile:async(path,text,options={})=>{if(options.flag==='wx'&&disk.has(path))throw Error('exists');disk.set(path,String(text));},
  compareAndReplace:async(p,expected,text)=>{if(typeof p==='object'){const found=disk.get(p.path)===Buffer.from(p.expectedBase64,'base64').toString();if(found)disk.set(p.path,Buffer.from(p.base64,'base64').toString());return {replaced:found};}
   const found=disk.get(p)===expected;if(found)disk.set(p,text);return found;}
 };
 const rows=()=>[{clipId:1,trackId:'main',trackKind:'main',resourceId:'alias',startFrame:0,endFrame:30,playbackSpeed:{numerator:1,denominator:1},preserveAudioPitch:true,_source:{startSeconds:7.25,endSeconds:8.25}}];
 function handle(id,state){return {
  meta:async()=>({fps:30,durationFrames:30,frameSize:{width:1920,height:1080}}),
  clips:async({trackScope}={})=>state.rows.filter(row=>trackScope!=='main'||row.trackKind==='main').map(({_source,...r})=>clone(r)),
  motionGraphics:async()=>[],videoEffects:async row=>(state.effects??[]).map((e,i)=>({...e,clipId:row.clipId,effectIndex:i})),videoEffectProgram:async()=>({tsxCode:'fixture',parameters:{},editableParameters:[]}),
  addVideoEffect:async()=>{state.effects=[{name:'fixture',effectName:'fixture',enabled:true}];},
  clipAudio:async()=>({volumeDb:0,volumeKeys:[],fadeInSeconds:0,fadeOutSeconds:0}),clipTransform:async()=>({enabled:true,position:{x:0,y:0},scale:{x:1,y:1},anchor:{x:0,y:0},rotation:0,flipHorizontal:false,flipVertical:false,positionKeys:[],scaleKeys:[],rotationKeys:[]}),
  commitAll:async reason=>{commits++;saved.set(id,clone(state));await hooks.commit?.(id,reason);return {createdDraftId:id};}
 };}
 const project={meta:async()=>({draftIds:[...saved.keys()]}),createDraft:async()=>handle('d'+ ++serial,{rows:rows()})};
 const sdk={call:async(method,projectId,id)=>{
  if(method==='getProjectDraftScaffold')return {owner:{projectId:'p',libraryId:'library'}};
  assert.equal(method,'getDraftMediaSnapshot');assert.ok(saved.has(id),'only saved drafts have observable sources');sourceReads++;
  await hooks.beforeSource?.(id,sourceReads);
  return {owner:{projectId:'p',libraryId:'library'},revision:hooks.revision?.(sourceReads)??JSON.stringify(saved.get(id)),clips:saved.get(id).rows.map(row=>({...clone(row),playbackSpeed:1,source:{clipId:row.clipId,...clone(row._source)}}))};
 },runScript:async input=>{
  requests.push(input);try{
   const result=await vm.runInNewContext('(async()=>{'+input.script+'})()',{selects:{files:raw,project:()=>project,draft:id=>{assert.ok(saved.has(id));return handle(id,clone(saved.get(id)));}}});
   if(input.allowCommit&&hooks.lostReply)throw Error('lost reply');return {result};
  }catch(error){return {isError:true,output:error.message};}
 }};
 const box=vm.createContext({crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,readTemplateDraftSources,templateObservedSource,fingerprintTemplateFile});vm.runInContext(runSource,box);
 const scope={pluginId:'mini-vlog',projectId:'p',runId:'sdk-free'},config={projectId:'p',draftName:'Owned',plannedStart:7.25};
 const run=options=>box.executeTemplateAssembly(sdk,raw,scope,config,assembly,()=>true,options);
 return {box,sdk,raw,disk,saved,hooks,requests,scope,config,run,commits:()=>commits,sourceReads:()=>sourceReads};
}
