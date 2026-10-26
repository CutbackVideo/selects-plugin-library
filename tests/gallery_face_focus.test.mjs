import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPhotoPanel} from './photo_face_fixture.mjs';
const rawId='00000000-0000-4000-8000-000000000001',projectId='photo-project';
const face={contractVersion:1,task:'faces.detect',sourceKind:'image',coordinateSpace:'display-pixels',boxFormat:'xyxy',frameSize:{width:1920,height:1080},samples:[{sourceTimeSeconds:0,faces:[{box:{xmin:0,ymin:200,xmax:140,ymax:700}}]}]};
function kit(options={}){
 const submitted=[],requests=[],storage=new Map();let bytes=Buffer.from('original photo'),current=true;
 const files={stat:async()=>({size:bytes.length,mtimeMs:1,ino:42,isDirectory:false}),readRange:async({offset,length})=>({bytesRead:length,base64:bytes.subarray(offset,offset+length).toString('base64')})};
 const observed=structuredClone(options.observation??face);
 const selects={files,project:()=>({resources:async()=>[{resourceId:'r0',name:'photo.jpg',type:'Image'}]}),ai:{imageSourceSupported:!options.unsupported,
  submit:async input=>{submitted.push(structuredClone(input));if(options.loseSubmit&&!options.recovered){options.recovered=true;throw Error('Reply lost');}return {workflowId:'ai:photo-face'}},
  job:()=>({status:async()=>({workflowId:'ai:photo-face',projectId,runtimeId:'selects-ai-runtime',task:'faces.detect',status:'succeeded'}),result:async()=>({workflowId:'ai:photo-face',task:'faces.detect',files:{detections:{id:'ai:artifact',name:'faces.json',mediaType:'application/json',byteSize:1024}}})}),
  readJSON:async()=>{if(options.mutate)bytes=Buffer.from('replacement photo');if(options.detach)current=false;return observed;}}};
 const sdk={files,storage:{getItem:async key=>storage.get(key)??null,setItem:async(key,value)=>storage.set(key,value)},call:async()=>[{resourceId:rawId,name:'photo.jpg',type:'Image'}],runScript:async input=>{requests.push(input);try{return{result:await new Function('selects','return (async()=>{'+input.script+'})()')(selects)}}catch(error){return{isError:true,output:error.message}}}};
 const api=loadPhotoPanel('photo-gallery-no2',['focusGalleryPhotos']);api.__setLocal(sdk,{files});
 const focus=api.focusGalleryPhotos;
 const item={resourceId:'r0',name:'photo.jpg',path:'/original/photo.jpg',kind:'image',width:1920,height:1080,focusX:.5,focusY:.5};
 const input={projectId,media:Array.from({length:21},(_,i)=>({...item,manualFocus:i!==0}))};
 return{input,submitted,requests,storage,focus:()=>focus(sdk,input,()=>current)};
}
test('Gallery uses the real shared client and persistent original UUID, then moves focus only',async()=>{
 const k=kit(),result=await k.focus();assert.equal(k.submitted.length,1);assert.equal(k.submitted[0].resourceId,rawId);assert.equal(k.submitted[0].sourceRange,undefined);assert.equal(k.submitted[0].options.provider,'cpu');
 assert.ok(result.media[0].focusX<.5);assert.equal(result.media[0].width,1920);assert.equal(result.media[0].height,1080);assert.equal(result.media[1].focusX,.5);assert.equal(result.faceFocus[0].status,'focused');assert.equal(k.input.media[0].focusX,.5);
});
test('Gallery explicit central or off-center manual choices skip all face jobs',async()=>{
 const k=kit();k.input.media[0].manualFocus=true;assert.deepEqual(JSON.parse(JSON.stringify((await k.focus()).media)),k.input.media);assert.equal(k.requests.length,0);
 const other=kit();other.input.media[0].focusX=.1;await other.focus();assert.equal(other.submitted.length,0);
});
test('Gallery reuses a completed durable job for exactly the same source bytes',async()=>{
 const k=kit();await k.focus();await k.focus();assert.equal(k.submitted.length,1);assert.equal(k.storage.size,1);
});
test('Gallery missing host support retains the original composition without a new job',async()=>{
 const k=kit({unsupported:true}),result=await k.focus();assert.equal(k.submitted.length,0);assert.equal(result.media[0].focusX,.5);assert.equal(result.faceFocus[0].reason,'host-support');
});
test('Gallery no detected faces and impossible groups do not become successful focus adjustments',async()=>{
 for(const faces of [[],[{box:{xmin:0,ymin:200,xmax:140,ymax:700}},{box:{xmin:1780,ymin:200,xmax:1920,ymax:700}}]]){
  const observation=structuredClone(face);observation.samples[0].faces=faces;const k=kit({observation}),result=await k.focus();assert.equal(result.media[0].focusX,.5);assert.ok(['unavailable','cannot-fit'].includes(result.faceFocus[0].status));
 }
});
test('Gallery rejects a changed original after inference instead of applying stale coordinates',async()=>{await assert.rejects(kit({mutate:true}).focus(),/changed during/);});
test('Gallery checks scope before using a late artifact or writing a replacement focus',async()=>{await assert.rejects(kit({detach:true}).focus(),/context changed/);});
test('Gallery unknown submit is preserved and a later explicit recovery uses its identical request key',async()=>{
 const k=kit({loseSubmit:true});const pending=await k.focus();assert.equal(pending.media[0].focusX,.5);assert.equal(pending.faceFocus[0].status,'unavailable');assert.equal(k.submitted.length,1);const recovered=await k.focus();assert.equal(recovered.faceFocus[0].status,'focused');assert.equal(k.submitted.length,2);assert.deepEqual(k.submitted[0],k.submitted[1]);
});
test('Gallery ignores a video artifact or mismatched still-image time contract while retaining the original framing',async()=>{
 for(const patch of [{sourceKind:'video'},{samples:[{sourceTimeSeconds:1,faces:[]}]}]){const result=await kit({observation:{...face,...patch}}).focus();assert.equal(result.media[0].focusX,.5);assert.equal(result.faceFocus[0].status,'unavailable');}
});
