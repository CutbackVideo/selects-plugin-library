import test from 'node:test';import assert from 'node:assert/strict';import {loadPhotoPanel} from './photo_face_fixture.mjs';
const api=loadPhotoPanel('recap-2026',['recapFocusTransform','recapFaceWindows','recapMergeFaceWindows','createScript','batchScript','prepareRecapFaceFocus']);
const transform=api.recapFocusTransform,windows=api.recapFaceWindows,merge=api.recapMergeFaceWindows;
const plain=value=>JSON.parse(JSON.stringify(value));
test('Recap left-edge focus changes position in FCP height units while retaining exact cover scale',()=>{
 const size={width:640,height:338},central=transform(size,{focusX:.5,focusY:.5}),moved=transform(size,{focusX:.39291833639144896,focusY:.5});
 assert.deepEqual(plain(moved.scale),plain(central.scale));assert.ok(moved.position.x>0);assert.equal(moved.position.y,0);
 const sourcePoint=181.04452514648438,displayX=1080/2+(sourcePoint-640/2)*1920/338+moved.position.x*1920/100;
 assert.ok(displayX>=0&&displayX<=1080);
});
test('Recap positive source-Y focus moves the image upward under the FCP sign convention',()=>{
 const value=transform({width:500,height:2000},{focusX:.5,focusY:.7});assert.equal(value.position.x,0);assert.ok(value.position.y>0);
});
test('Recap disjoint selected source windows never become one enclosing range',()=>{
 const result=merge([{resourceId:'r0',startSeconds:1,endSeconds:2},{resourceId:'r0',startSeconds:5,endSeconds:6},{resourceId:'r0',startSeconds:1.5,endSeconds:2.5},{resourceId:'r1',startSeconds:1,endSeconds:9}]);
 assert.deepEqual(plain(result),[{resourceId:'r0',startSeconds:1,endSeconds:2.5},{resourceId:'r0',startSeconds:5,endSeconds:6},{resourceId:'r1',startSeconds:1,endSeconds:9}]);
});
test('Recap preserves the original source clock and repeated short-source prefix',()=>{
 const slots=[{resourceId:'r0',startSeconds:2},{resourceId:'r1',startSeconds:1.8}],media={r0:{durationSeconds:18},r1:{durationSeconds:2}};
 const result=windows(slots,media,[{slot:1,startSeconds:0,endSeconds:8.1},{slot:2,startSeconds:8.1,endSeconds:9.2}],8.1,2,24);
 assert.equal(result[0].startSeconds,2);assert.equal(result[0].endSeconds,10.4);assert.equal(result[1].startSeconds,1.8);assert.equal(result[1].endSeconds,1.95);assert.equal(result[2].startSeconds,0);assert.ok(result[2].endSeconds<=1.95);
 assert.equal(windows(slots,media,[],8.1,0,undefined).length,0);
});
function script(name,cfg){return api[name](cfg);}
async function batch(fps=24,{short=false,focus=false}={}){
 let clips=[{clipId:1,resourceId:'r0',startFrame:0,endFrame:Math.round(8.1*fps)}],next=2;const inserted=[],transforms=[];
 const d={meta:async()=>({fps}),clips:async()=>clips,rangeAtFrames:async(start,end)=>({start,end}),insertResource:async input=>{inserted.push(input);const start=clips.at(-1).endFrame;clips.push({clipId:next++,resourceId:input.resourceId,startFrame:start,endFrame:start+Math.round((input.sourceRange.endSeconds-input.sourceRange.startSeconds)*fps)})},remove:async range=>{clips=clips.filter(c=>c.startFrame<range.start).map(c=>({...c,endFrame:Math.min(c.endFrame,range.start)}))},setClipTransform:async value=>transforms.push(value),commitAll:async()=>({commitId:'committed'})};
 const cfg={projectId:'p',draftId:'d',start:1,end:3,placements:[{slot:1,startSeconds:0,endSeconds:8.1},{slot:2,startSeconds:8.1,endSeconds:9.2},{slot:3,startSeconds:9.2,endSeconds:9.5}],slots:[{resourceId:'r0',startSeconds:2},{resourceId:'r1',startSeconds:short?1.8:6.3},{resourceId:'r0',startSeconds:6.3}],media:{r0:{durationSeconds:18,frameSize:{width:640,height:338}},r1:{durationSeconds:short?2:18,frameSize:{width:640,height:338}}},faceFocus:focus?{2:transform({width:640,height:338},{focusX:.3,focusY:.5})}:{},sourceGuard:focus?{r1:{path:'/r1',size:1,sha256:'4bf5122f344554c53bde2ebb8cd2b7e3d1600ad631c385a5d7cce23c7785459a'}}:{}};
 const text=script('batchScript',cfg);await new Function('selects','return (async()=>{'+text+'})()')({project:()=>({}),draft:()=>d,files:{stat:async()=>({size:1,mtimeMs:1,ino:1,isDirectory:false}),readRange:async()=>({bytesRead:1,base64:'AQ=='})}});
 return{cfg,inserted,transforms,clips};
}
for(const fps of [24,24000/1001,30])test('Recap source-window planner covers the real production assembler requests at '+fps+' fps',async()=>{
 for(const short of [false,true]){const b=await batch(fps,{short}),planned=windows(b.cfg.slots,b.cfg.media,b.cfg.placements,8.1,3,fps);
 for(const request of b.inserted)assert.ok(planned.some(row=>row.resourceId===request.resourceId&&row.startSeconds<=request.sourceRange.startSeconds+1e-9&&row.endSeconds>=request.sourceRange.endSeconds-1e-9),JSON.stringify({request,planned}));
 assert.equal(b.clips.at(-1).endFrame,Math.round(9.5*fps));}
});
test('Recap production batch applies focus only to the corresponding slot and preserves all source ranges/timing',async()=>{
 const before=await batch(24),after=await batch(24,{focus:true});assert.deepEqual(after.inserted,before.inserted);assert.deepEqual(after.clips,before.clips);
 assert.equal(after.transforms[0].clip.resourceId,'r1');assert.ok(after.transforms[0].position.x>0);assert.equal(after.transforms.at(-1).position,undefined);
});
test('Recap production intro refuses a focus planned on a different Project grid',async()=>{
 const cfg={projectId:'p',intro:{resourceId:'r0',startSeconds:2,frameSize:{width:640,height:338}},introEnd:8.1,name:'Recap',sourceGuard:{r0:{path:'/r0',size:1,sha256:'4bf5122f344554c53bde2ebb8cd2b7e3d1600ad631c385a5d7cce23c7785459a'}},expectedFps:24,faceTransform:transform({width:640,height:338},{focusX:.3,focusY:.5})};
 for(const fps of [24,30]){let writes=0;const calls=[],d={insertResource:async()=>{},setFrameSize:async()=>{},meta:async()=>({fps}),clips:async()=>[{clipId:1,resourceId:'r0',startFrame:0,endFrame:Math.round(8.1*fps)}],setClipTransform:async value=>{if(writes++)throw Error('stale_clip_target');calls.push(value)},commitAll:async()=>({createdDraftId:'saved'})};await new Function('selects','return (async()=>{'+script('createScript',cfg)+'})()')({project:()=>({createDraft:async()=>d}),files:{stat:async()=>({size:1,mtimeMs:1,ino:1,isDirectory:false}),readRange:async()=>({bytesRead:1,base64:'AQ=='})}});assert.equal(calls.filter(x=>x.position).length,fps===24?1:0);}
});

function faceClient(options={}){
 const submitted=[],store=new Map();let bytes=Buffer.from('video source'),current=true;
 const files={stat:async()=>({size:bytes.length,mtimeMs:1,ino:3,isDirectory:false}),readRange:async({offset,length})=>({bytesRead:length,base64:bytes.subarray(offset,offset+length).toString('base64')})};
 const rawId='00000000-0000-4000-8000-000000000001',projectId='recap-project';
 const selects={files,project:()=>({resources:async()=>[{resourceId:'r0',name:'source.mp4',type:'Video'}]}),ai:{submit:async input=>{submitted.push(input);return {workflowId:'ai:recap-face'}},job:()=>({status:async()=>({workflowId:'ai:recap-face',projectId,runtimeId:'selects-ai-runtime',task:'faces.detect',status:'succeeded'}),result:async()=>({workflowId:'ai:recap-face',task:'faces.detect',files:{detections:{id:'artifact',mediaType:'application/json'}}})}),readJSON:async()=>{
  if(options.mutate)bytes=Buffer.from('different source');if(options.detach)current=false;
  return {contractVersion:1,task:'faces.detect',coordinateSpace:'display-pixels',boxFormat:'xyxy',frameSize:{width:1920,height:1080},parameters:{sourceRange:{...submitted.at(-1).sourceRange,...options.wrongWindow?{startSeconds:0}:{}}},samples:[{sourceTimeSeconds:2.25,faces:options.noFaces?[]:[{box:{xmin:0,ymin:200,xmax:150,ymax:700}}]},{sourceTimeSeconds:6.4,faces:options.noFaces?[]:[{box:{xmin:20,ymin:200,xmax:160,ymax:700}}]}]};}}};
 const sdk={storage:{getItem:async key=>store.get(key)??null,setItem:async(key,value)=>store.set(key,value),removeItem:async key=>store.delete(key)},call:async()=>[{resourceId:rawId,name:'source.mp4',type:'Video'}],runScript:async input=>{try{return {result:await new Function('selects','return (async()=>{'+input.script+'})()')(selects)}}catch(error){return{isError:true,output:error.message}}}};
 const args={projectId,slots:[{resourceId:'r0',startSeconds:2},{resourceId:'r0',startSeconds:6.3}],byId:{r0:{path:'/source.mp4',durationSeconds:18,frameRate:24,frameSize:{width:1920,height:1080}}},manifest:{introEnd:8.1,placements:[{slot:1,startSeconds:0,endSeconds:8.1},{slot:2,startSeconds:8.1,endSeconds:8.4}]},limit:2,isCurrent:()=>current};
 return {args,submitted,run:()=>api.prepareRecapFaceFocus(sdk,args)};
}
test('Recap whole consumer uses raw source identity and exact merged insertion windows, then reuses the completed job',async()=>{
 const c=faceClient(),result=await c.run();assert.equal(c.submitted.length,1);assert.equal(c.submitted[0].resourceId,'00000000-0000-4000-8000-000000000001');assert.deepEqual(plain(c.submitted[0].sourceRange),{startSeconds:2,endSeconds:10.4});assert.ok(result.focusBySlot[1].position.x>0);assert.ok(result.focusBySlot[2].position.x>0);assert.ok(result.sourceGuard.r0.sha256);await c.run();assert.equal(c.submitted.length,1);
});
test('Recap whole consumer preserves explicit manual framing and skips unsupported source clocks',async()=>{
 const manual=faceClient();for(const row of manual.args.slots){row.focusX=.5;row.focusY=.5;}const result=await manual.run();assert.equal(manual.submitted.length,0);assert.equal(result.focusBySlot[1].position.x,0);
 const absent=faceClient();delete absent.args.byId.r0.frameRate;assert.equal((await absent.run()).diagnostics[0].reason,'source-clock-or-storage');assert.equal(absent.submitted.length,0);
});
test('Recap whole consumer does not apply wrong-window or undetected coordinates',async()=>{
 for(const options of [{wrongWindow:true},{noFaces:true}]){const result=await faceClient(options).run();assert.deepEqual(plain(result.focusBySlot),{});assert.ok(result.diagnostics.some(row=>row.status==='unavailable'));}
});
test('Recap whole consumer stops before authoring if source bytes or the owning scope change',async()=>{
 await assert.rejects(faceClient({mutate:true}).run(),/footage changed during/);await assert.rejects(faceClient({detach:true}).run(),/recap ended/);
});
