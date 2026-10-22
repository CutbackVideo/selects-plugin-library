import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto,createHash} from 'node:crypto';
import {loadPanelFunctions} from './windows_host.mjs';
import {loadPanelOperation} from './panel_operation.mjs';
// Independent client preset metadata: pin real controls and source size instead
// of modelling only an empty Inspector. This is test data, never panel code.
const presetSnapshot=JSON.parse(fs.readFileSync(new URL('./fixtures/photo-program-presets.json',import.meta.url),'utf8'));
export function canonicalPhotoPanel(source){
 const authoring=fs.readFileSync(new URL('../shared/native-image-authoring.js',import.meta.url),'utf8');
 const observation=fs.readFileSync(process.env.PHOTO_OBSERVATION_SOURCE||new URL('../shared/draft-observation.js',import.meta.url),'utf8');
 return source.replace(/\/\/ native-image-authoring:start\n[\s\S]*?\/\/ native-image-authoring:end/,'// native-image-authoring:start\n'+authoring+'// native-image-authoring:end')+'\n'+observation;
}

export function fixture(id,{failEffect=false,tamperSaved=false,fps=30,newReceiptOnly=false,commitReplyLost=false,projectTitle='Fixture Project',graphicsReadSupported=true,transformReadSupported=true,audioReadSupported=true,sourceReadSupported=true,programReadSupported=true,canonicalAuthoring=process.env.PHOTO_CANONICAL_AUTHORING==='1'}={}){
 const count=id==='polaroid-photo-dump'?17:id==='camera-shutter-dump'?12:4,photos=Array.from({length:count},(_,i)=>({resourceId:'r'+i,name:'Photo '+i,path:'/photos/'+i+'.png'}));
 const resources=[...photos.map(p=>({...p,type:'Image'})),...Array.from({length:6},(_,i)=>({resourceId:'a'+i,name:'Sound '+i,type:'Audio',durationSeconds:10}))];
 const nodes=resources.map(r=>({...r,type:r.type.toLowerCase(),path:r.path||'/audio/'+r.name+'.wav',frameSize:{width:640,height:960},durationSeconds:10}));
 const saved=new Map(),calls=[],commits=[],hooks={},receipts=[];let serial=0,live=true,imports=0;
 const project={resources:async()=>resources,sourceFiles:async()=>({fileTree:nodes}),meta:async()=>({id:'p',title:projectTitle,draftIds:[...saved.keys()]}),resource:id=>({id}),
  importFiles:async({paths})=>{imports++;const image=/\.png$/.test(paths[0]),resourceId=image?'frame':'music',type=image?'Image':'Audio';resources.push({resourceId,name:image?'Frame':'Music',type,durationSeconds:60});nodes.push({resourceId,type:type.toLowerCase(),path:paths[0],durationSeconds:60,...image?{frameSize:{width:1080,height:1920}}:{}});return {addedResourceIds:[resourceId]};},
  createDraft:async({name})=>handle('draft-'+ ++serial,{name,fps,durationFrames:0,frameSize:{width:720,height:1280},clips:[]})};
 function handle(draftId,state){
  const clips=state.clips;
  const add=(kind,resourceId,over)=>{const clip={clipId:clips.length+1,trackId:'track-'+clips.length,trackKind:kind,resourceId,audioSourceIndexes:null,playbackSpeed:{numerator:1,denominator:1},preserveAudioPitch:true,...over};clips.push(clip);return {...clip,atFrame:clip.startFrame};};
  return {meta:async()=>({...state}),clips:async()=>structuredClone(clips),rangeAtFrames:async(startFrame,endFrame)=>({startFrame,endFrame}),
   insertGap:async({seconds})=>{state.durationFrames=Math.round(seconds*state.fps);},setFrameSize:async size=>{state.frameSize=size;},
   // Imported Audio's source skeleton uses 120 fps in the pinned client. Source
   // In/Out snap there before its single media clip conforms to the Draft grid.
   insertResource:async({resourceId,sourceRange})=>{const startSeconds=Math.round(sourceRange.startSeconds*120)/120,endSeconds=Math.round(sourceRange.endSeconds*120)/120;state.durationFrames=Math.round((endSeconds-startSeconds)*state.fps);add('main',resourceId,{startFrame:0,endFrame:state.durationFrames,_source:{startSeconds,endSeconds:startSeconds+state.durationFrames/state.fps}});},
   overlayResource:async({resource,over,sourceStartSeconds=0})=>add(resources.find(r=>r.resourceId===resource.id)?.type==='Audio'?'audio':'video',resource.id,{...over,_source:{startSeconds:sourceStartSeconds,endSeconds:sourceStartSeconds+(over.endFrame-over.startFrame)/state.fps}}),
   setClipTransform:async({clip,...patch})=>{const row=clips.find(c=>c.clipId===clip.clipId&&c.trackId===clip.trackId);assert.ok(row);row._transform={...row._transform,...structuredClone(patch)};},
   ...transformReadSupported?{clipTransform:async clip=>{const row=clips.find(c=>c.clipId===clip.clipId&&c.trackId===clip.trackId);assert.ok(row);return structuredClone({enabled:true,position:{x:0,y:0},scale:{x:1,y:1},anchor:{x:0,y:0},rotation:0,flipHorizontal:false,flipVertical:false,positionKeys:[],scaleKeys:[],rotationKeys:[],...row._transform});}}:{},
   addVideoEffect:async({clip,label,...program})=>{if(failEffect)throw Error('effect compiler failed');const row=clips.find(c=>c.clipId===clip.clipId);(row._effects??=[]).push({name:label,enabled:true,...structuredClone(program)});},
   applyEffectPreset:async({clip,presetId,parameters})=>{const def=await selects.effectPresets.get(presetId),row=clips.find(c=>c.clipId===clip.clipId);(row._effects??=[]).push({name:def.label,enabled:true,tsxCode:presetSnapshot.presets.find(p=>p.id===presetId).referenceSource,editableParameters:def.editableParameters,parameters:{...def.parameters,...parameters}});return {presetId};},
   ...programReadSupported?{videoEffects:async clip=>(clips.find(c=>c.clipId===clip.clipId)._effects??[]).map((e,effectIndex)=>({clipId:clip.clipId,trackId:clip.trackId,effectIndex,name:e.name,enabled:e.enabled,effectName:'remotion'})),videoEffectProgram:async e=>{const {name,enabled,...program}=clips.find(c=>c.clipId===e.clipId)._effects[e.effectIndex];const values=Object.fromEntries((program.editableParameters??[]).map(d=>[d.key,d.defaultValue]));return structuredClone({...program,parameters:{...values,...program.parameters}});}}:{},
   ...audioReadSupported?{clipAudio:async clip=>{const row=clips.find(c=>c.clipId===clip.clipId&&c.trackId===clip.trackId);assert.ok(row);return structuredClone({clipId:row.clipId,volumeDb:0,volumeKeys:[],fadeInSeconds:0,fadeOutSeconds:0,...row._audio});}}:{},
   ...sourceReadSupported?{clipSourceWindow:async clip=>{const row=clips.find(c=>c.clipId===clip.clipId&&c.trackId===clip.trackId);assert.ok(row);return row._source?structuredClone({clipId:row.clipId,...row._source}):null;}}:{},
   addMotionGraphic:async({within,...program})=>{const placed=add('video',null,within);clips.find(c=>c.clipId===placed.clipId)._graphic=structuredClone(program);return placed;},
   ...graphicsReadSupported?{motionGraphics:async()=>clips.filter(c=>c._graphic).map(c=>({name:c._graphic.label,clip:structuredClone(c)})),motionGraphicProgram:async clip=>{const p=clips.find(c=>c.clipId===clip.clipId)?._graphic;if(!p)return null;return structuredClone({...p,parameters:{...Object.fromEntries((p.editableParameters??[]).map(d=>[d.key,d.defaultValue])),...p.parameters}});}}:{},
   commitAll:async reason=>{const isNew=!saved.has(draftId);saved.set(draftId,structuredClone(state));commits.push({draftId,reason});if(commitReplyLost)throw Error('commit reply lost');if(tamperSaved&&/Finish/.test(reason))saved.get(draftId).frameSize.width=123;return isNew?{createdDraftId:draftId,...newReceiptOnly?{}:{commitId:'c'+commits.length}}:{commitId:'c'+commits.length};},
  };
 }
 const selects={project:()=>project,draft:draftId=>{assert.ok(saved.has(draftId),'only persisted IDs may be reopened');return handle(draftId,structuredClone(saved.get(draftId)));},
  files:{stat:async()=>({size:32,isDirectory:false,mtimeMs:1,ino:1}),readRange:async()=>({bytesRead:1,base64:'iQ=='})},effectPresets:{get:async presetId=>{const {referenceSource,...definition}=presetSnapshot.presets.find(p=>p.id===presetId);return structuredClone({...definition,tsxCode:null});}}};
 const hostFiles=new Map([['/user/.selects/skills/'+id+'/assets/music.mp3',Buffer.from('fixture music')]]);
 const sdk={environment:{platform:'darwin'},files:{join:(...parts)=>parts.join('/'),homedir:()=>'/user',exists:async path=>hostFiles.has(path),mkdir:async()=>{},stat:async path=>hostFiles.has(path)?{size:hostFiles.get(path).length,isDirectory:false}:null,readFile:async(path,encoding)=>{if(!hostFiles.has(path))throw Error('ENOENT');return encoding==='utf8'?hostFiles.get(path).toString():new Uint8Array(hostFiles.get(path));},writeFile:async(path,bytes)=>{hostFiles.set(path,Buffer.from(bytes));}},runScript:async input=>{calls.push(input);try{const result=await vm.runInNewContext('(async()=>{'+input.script+'})()',{selects});await hooks.afterScript?.(input);return {result};}catch(error){return {isError:true,output:error.message};}}};
 sdk.files.readRange=async(path,offset,length)=>{if(!hostFiles.has(path))throw Error('ENOENT');return new Uint8Array(hostFiles.get(path).subarray(offset,offset+length));};
 sdk.call=async(method,...args)=>{
  await hooks.beforeBridge?.(method,...args);
  if(method==='getProjectDraftScaffold')return {owner:{libraryId:'library',projectId:args[0]}};
  if(method==='getDraftCore'){
   const draftId=args[0],state=saved.get(draftId);assert.ok(state,'Only persisted Drafts can be inspected by the bridge.');
   return {owner:{projectId:'p',libraryId:'library'},sequenceJson:{schema:'Cutback.Timeline.1',id:draftId,libraryId:'library',frameRate:state.fps,...structuredClone(state)},isEditedDraft:true};
  }
  if(method==='getDraftMediaSnapshot'){
   const [projectId,draftId]=args;assert.equal(projectId,'p');const state=saved.get(draftId);assert.ok(state,'Only persisted Drafts can be inspected by the bridge.');
   const result={revision:createHash('sha256').update(JSON.stringify(state)).digest('hex'),fps:state.fps,durationFrames:state.durationFrames,order:{},clips:state.clips.filter(row=>row.resourceId).map(row=>({clipId:row.clipId,trackId:row.trackId,trackKind:row.trackKind,resourceId:row.resourceId,startFrame:row.startFrame,endFrame:row.endFrame,sourceStartSeconds:row._source?.startSeconds,sourceEndSeconds:row._source?.endSeconds,playbackSpeed:row.playbackSpeed.numerator/row.playbackSpeed.denominator,media:{id:row.resourceId,type:resources.find(r=>r.resourceId===row.resourceId)?.type}}))};
   await hooks.afterSourceSnapshot?.(result);return structuredClone(result);
  }
  throw Error('Unexpected SDK call '+method);
 };
 let source=fs.readFileSync(id==='polaroid-photo-dump'&&process.env.PHOTO_AUTHORING_PANEL||new URL('../plugins/'+id+'/panel.tsx',import.meta.url),'utf8');
 if(canonicalAuthoring){
  source=canonicalPhotoPanel(source);
 }
 const common=['nativeImageSources','nativeImageRun','prepareNativeImages','nativeImagePlacement','placeNativeImages','readMediaPages'];
 const extra=id==='no14-still-video'?['INVENTORY','DECORATION_CODE','readProjectFps','createNo14Draft']:id==='four-photo-stop-motion'?['INVENTORY','EFFECT_CODE','OUTRO_CODE','inventory','ensureMusic','templateIssue','createPhotoDraft']:id==='polaroid-photo-dump'?['INVENTORY','PHOTO_EFFECT','FRAME_EFFECT','CAPTION_CODE','inventory','isPolaroidAssetPath','templateIssue','createPhotoDraft',...source.includes('function normalizeFinishForPlan(')?['normalizeFinishForPlan']:[]]:['INVENTORY','EFFECT_CODE','BURST_CODE','TEXT_CODE','samePath','inventory','createPhotoDraft'];
 const future=['bindMediaPlacement','placeWorkingCopyImages','authorAtomicImageDraft','buildAtomicImageDraftScript','verifyAtomicImageDraft','readImageDraftFps','inspectImageGraphics','inspectImageTransforms','inspectImageAudio','imageProgramsFeature','templateRunJSON','prepareBundledAudio','readBundledAudioResource','readTemplateDraftSources','templateObservedSource'];
 const api=loadPanelFunctions(source,[...common,...extra,...future.filter(name=>source.includes('function '+name+'('))],{
  ...loadPanelOperation(id),crypto:webcrypto,SLOTS:count,DEFAULT_MUSIC:'off',ensureSounds:async()=>{imports++;return Object.fromEntries(Array.from({length:6},(_,i)=>['shutter.'+(i+1),'a'+i]));},
  // Asset preparation has separate compiled byte/import tests. This fixture
  // isolates Draft authoring with already prepared, typed Project assets.
  ensureAssets:async()=>{imports+=2;const path='/assets/frame.png';if(!resources.some(r=>r.resourceId==='frame')){resources.push({resourceId:'frame',type:'Image'},{resourceId:'music',type:'Audio',durationSeconds:60});nodes.push({resourceId:'frame',type:'image',path,frameSize:{width:1080,height:1920}});}return {frame:{resourceId:'frame',path,name:'Frame',width:1080,height:1920},music:{resourceId:'music',path:'/assets/music.m4a',name:'Music',durationSeconds:60}};},
 });
 const args={projectId:'p',selected:photos,decoration:{shape:'none',color:'#ffffff'},framing:id==='no14-still-video'?{}:[],music:'off',name:'Fixture',stillCurrent:()=>live,say:()=>{},onDraft:async draftId=>{await Promise.resolve();receipts.push({draftId,images:saved.get(draftId).clips.filter(c=>c.trackKind==='video'&&c.resourceId).length});}};
 const invoke=(fn,options={})=>fn(sdk,{...args,...options});
 const create=(options={})=>invoke(api[id==='no14-still-video'?'createNo14Draft':'createPhotoDraft'],options);
 return {create,invoke,commits,saved,calls,hooks,receipts,api,sdk,selects,photos,resources,nodes,args,hostFiles,stop:()=>{live=false;},get imports(){return imports;}};
}
