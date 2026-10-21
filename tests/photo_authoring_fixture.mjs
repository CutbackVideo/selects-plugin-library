import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadPanelFunctions} from './windows_host.mjs';
import {loadPanelOperation} from './panel_operation.mjs';

export function fixture(id,{failEffect=false,tamperSaved=false,fps=30,newReceiptOnly=false,commitReplyLost=false,projectTitle='Fixture Project',graphicsReadSupported=true,transformReadSupported=true}={}){
 const count=id==='no14-still-video'?4:12,photos=Array.from({length:count},(_,i)=>({resourceId:'r'+i,name:'Photo '+i,path:'/photos/'+i+'.png'}));
 const resources=[...photos.map(p=>({...p,type:'Image'})),...Array.from({length:6},(_,i)=>({resourceId:'a'+i,name:'Sound '+i,type:'Audio',durationSeconds:10}))];
 const nodes=resources.map(r=>({...r,type:r.type.toLowerCase(),path:r.path||'/audio/'+r.name+'.wav',frameSize:{width:640,height:960},durationSeconds:10}));
 const saved=new Map(),calls=[],commits=[],hooks={},receipts=[];let serial=0,live=true,imports=0;
 const project={resources:async()=>resources,sourceFiles:async()=>({fileTree:nodes}),meta:async()=>({id:'p',title:projectTitle,draftIds:[...saved.keys()]}),resource:id=>({id}),
  importFiles:async({paths})=>{imports++;resources.push({resourceId:'music',name:'Music',type:'Audio',durationSeconds:60});nodes.push({resourceId:'music',type:'audio',path:paths[0],durationSeconds:60});return {addedResourceIds:['music']};},
  createDraft:async({name})=>handle('draft-'+ ++serial,{name,fps,durationFrames:0,frameSize:{width:720,height:1280},clips:[]})};
 function handle(draftId,state){
  const clips=state.clips;
  const add=(kind,resourceId,over)=>{const clip={clipId:clips.length+1,trackId:'track-'+clips.length,trackKind:kind,resourceId,...over};clips.push(clip);return {...clip,atFrame:clip.startFrame};};
  return {meta:async()=>({...state}),clips:async()=>structuredClone(clips),rangeAtFrames:async(startFrame,endFrame)=>({startFrame,endFrame}),
   insertGap:async({seconds})=>{state.durationFrames=Math.round(seconds*state.fps);},setFrameSize:async size=>{state.frameSize=size;},
   insertResource:async({resourceId,sourceRange})=>{state.durationFrames=Math.round((sourceRange.endSeconds-sourceRange.startSeconds)*state.fps);add('main',resourceId,{startFrame:0,endFrame:state.durationFrames});},
   overlayResource:async({resource,over})=>add(resources.find(r=>r.resourceId===resource.id)?.type==='Audio'?'audio':'video',resource.id,over),
   setClipTransform:async({clip,...patch})=>{const row=clips.find(c=>c.clipId===clip.clipId&&c.trackId===clip.trackId);assert.ok(row);row._transform={...row._transform,...structuredClone(patch)};},
   ...transformReadSupported?{clipTransform:async clip=>{const row=clips.find(c=>c.clipId===clip.clipId&&c.trackId===clip.trackId);assert.ok(row);return structuredClone({enabled:true,position:{x:0,y:0},scale:{x:1,y:1},anchor:{x:0,y:0},rotation:0,flipHorizontal:false,flipVertical:false,positionKeys:[],scaleKeys:[],rotationKeys:[],...row._transform});}}:{},
   addVideoEffect:async()=>{if(failEffect)throw Error('effect compiler failed');},applyEffectPreset:async()=>{},
   addMotionGraphic:async({within,...program})=>{const placed=add('video',null,within);clips.find(c=>c.clipId===placed.clipId)._graphic=structuredClone(program);return placed;},
   ...graphicsReadSupported?{motionGraphics:async()=>clips.filter(c=>c._graphic).map(c=>({name:c._graphic.label,clip:structuredClone(c)})),motionGraphicProgram:async clip=>structuredClone(clips.find(c=>c.clipId===clip.clipId)?._graphic??null)}:{},
   commitAll:async reason=>{const isNew=!saved.has(draftId);saved.set(draftId,structuredClone(state));commits.push({draftId,reason});if(commitReplyLost)throw Error('commit reply lost');if(tamperSaved&&/Finish/.test(reason))saved.get(draftId).frameSize.width=123;return isNew?{createdDraftId:draftId,...newReceiptOnly?{}:{commitId:'c'+commits.length}}:{commitId:'c'+commits.length};},
  };
 }
 const selects={project:()=>project,draft:draftId=>{assert.ok(saved.has(draftId),'only persisted IDs may be reopened');return handle(draftId,structuredClone(saved.get(draftId)));},
  files:{stat:async()=>({size:32,isDirectory:false,mtimeMs:1,ino:1}),readRange:async()=>({bytesRead:1,base64:'iQ=='})},effectPresets:{get:async()=>({editableParameters:[]})}};
 const sdk={files:{join:(...parts)=>parts.join('/'),homedir:()=>'/user',exists:async()=>true,mkdir:async()=>{}},runScript:async input=>{calls.push(input);try{const result=await vm.runInNewContext('(async()=>{'+input.script+'})()',{selects});await hooks.afterScript?.(input);return {result};}catch(error){return {isError:true,output:error.message};}}};
 const source=fs.readFileSync(new URL('../plugins/'+id+'/panel.tsx',import.meta.url),'utf8');
 const common=['nativeImageSources','nativeImageRun','prepareNativeImages','nativeImagePlacement','placeNativeImages','readMediaPages'];
 const extra=id==='no14-still-video'?['INVENTORY','DECORATION_CODE','readProjectFps','createNo14Draft']:['INVENTORY','EFFECT_CODE','BURST_CODE','TEXT_CODE','samePath','inventory','createPhotoDraft'];
 const future=['placeWorkingCopyImages','authorAtomicImageDraft','buildAtomicImageDraftScript','verifyAtomicImageDraft','readImageDraftFps','inspectImageGraphics','inspectImageTransforms'];
 const api=loadPanelFunctions(source,[...common,...extra,...future.filter(name=>source.includes('function '+name+'('))],{
  ...loadPanelOperation(id),SLOTS:count,DEFAULT_MUSIC:'off',ensureSounds:async()=>{imports++;return Object.fromEntries(Array.from({length:6},(_,i)=>['shutter.'+(i+1),'a'+i]));},
 });
 const args={projectId:'p',selected:photos,decoration:{shape:'none',color:'#ffffff'},framing:id==='no14-still-video'?{}:[],music:'off',name:'Fixture',stillCurrent:()=>live,say:()=>{},onDraft:async draftId=>{await Promise.resolve();receipts.push({draftId,images:saved.get(draftId).clips.filter(c=>c.trackKind==='video'&&c.resourceId).length});}};
 const invoke=(fn,options={})=>fn(sdk,{...args,...options});
 const create=(options={})=>invoke(api[id==='no14-still-video'?'createNo14Draft':'createPhotoDraft'],options);
 return {create,invoke,commits,saved,calls,hooks,receipts,api,sdk,selects,photos,resources,nodes,args,stop:()=>{live=false;},get imports(){return imports;}};
}
