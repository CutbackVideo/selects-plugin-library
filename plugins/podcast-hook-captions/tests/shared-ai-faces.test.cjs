'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const c=require('../src/pipeline/sharedAiFaces.cjs');
const plan={f0:30,f1:42,step:4,w:640,h:360,count:3};
const info={W:1920,H:1080,fps:24};
const input=()=>c.faceInput('project-a','11111111-1111-4111-8111-111111111111',plan,24,'same-key');
const sample=(n,faces=[])=>({index:1000+n*9,sourceTimeSeconds:(30+n*4)/24,faces});
const face={box:{xmin:480,ymin:216,xmax:960,ymax:648},score:.91,landmarks:[{x:600,y:324},{x:840,y:324},{x:720,y:432},{x:660,y:540},{x:780,y:540}]};
const status=(phase='succeeded')=>({workflowId:'ai:same',projectId:'project-a',status:phase});
function api(overrides={}) { return {save:async()=>{},run:async()=>status(),sleep:async()=>{},...overrides}; }
test('preserves original fractional-fps phase and stride rather than blindly using 1/6',()=>{
 const v=c.faceInput('p','uuid',{f0:7,f1:31,step:5},30000/1001,'key');
 assert.ok(Math.abs(v.sourceRange.startSeconds-7/(30000/1001))<1e-12);assert.ok(v.sourceRange.startSeconds<=7/(30000/1001));assert.equal(v.options.sampleEverySeconds,5/(30000/1001));assert.equal(v.options.scoreThreshold,.8);
 assert.throws(()=>c.faceInput('p','r3',plan,24,'key'),/current Project Resource/);
});
test('fractional source grid does not skip an exact first PTS due to binary float division',()=>{
 const value=c.faceInput('p','raw',{f0:12,f1:60,step:4},24000/1001,'key');
 assert.ok(value.sourceRange.startSeconds<=.5005);assert.ok(.5005-value.sourceRange.startSeconds<1.1e-12);assert.ok(value.sourceRange.endSeconds<=2.5025);assert.ok(2.5025-value.sourceRange.endSeconds<1.1e-12);
});
test('concurrent observers share a per-pass input key, while different Draft scopes and new passes do not collide',async()=>{
 const first=await c.deterministicRequestKey('legacy',input(),'project/draft-a');
 const replay=await c.deterministicRequestKey('legacy',{...input(),requestKey:'other-nonce'},'project/draft-a');
 assert.equal(first,replay);assert.notEqual(first,await c.deterministicRequestKey('legacy',input(),'project/draft-b'));
 assert.notEqual(first,await c.deterministicRequestKey('fresh',input(),'project/draft-a'));
});
test('converts display xyxy + eye order to analysis xywh without changing normalized framing',()=>{
 const rows=c.adaptSamples([sample(0,[face]),sample(1),sample(2)],input(),info,plan);
 assert.deepEqual(rows[0].faces[0].box,[160,72,160,144]);
 assert.deepEqual(rows[0].faces[0].landmarks.slice(0,2),[[200,108],[280,108]]);
 assert.equal(rows[0].f,30);assert.equal(rows[0].faces[0].score,.91);assert.equal(rows[1].faces.length,0);
 assert.equal(rows[0].faces[0].box[3]/plan.h,.4);
});
test('actual timestamp owns tracking coordinates even when interval-local indexes disagree',()=>{
 const rows=[sample(0),sample(1),sample(2)];rows[1].sourceTimeSeconds+=.001;
 assert.equal(c.adaptSamples(rows,input(),info,plan)[1].f,34+.024);
});
test('rejects out-of-order, VFR-misaligned, missing or out-of-interval observations',()=>{
 assert.throws(()=>c.adaptSamples([sample(0),sample(0),sample(2)],input(),info,plan),/ordered/);
 const rows=[sample(0),sample(1),sample(2)];rows[1].sourceTimeSeconds+=.1;
 assert.throws(()=>c.adaptSamples(rows,input(),info,plan),/Variable-rate/);
 assert.throws(()=>c.adaptSamples([sample(0)],input(),info,plan),/count/);
 const late=[sample(0),sample(1),sample(2)];late[2].sourceTimeSeconds=4;
 assert.throws(()=>c.adaptSamples(late,input(),info,plan),/inside/);
});
test('malformed confidence or geometry does not become a no-face observation',()=>{
 for(const row of [{...face,score:2},{...face,box:{...face.box,xmax:2000}},{...face,landmarks:[]}])
  assert.throws(()=>c.adaptSamples([sample(0,[row]),sample(1),sample(2)],input(),info,plan),/geometry/);
});
test('declared fps cannot conceal a VFR clock, even when sampled PTS fit a half-frame tolerance',()=>{
 assert.equal(c.assertConstantFrameClock([100,1100,2100,3100],'1/30000',30),true);
 assert.throws(()=>c.assertConstantFrameClock([100,1100,2590,3100],'1/30000',30),/Variable-rate/);
 assert.throws(()=>c.assertConstantFrameClock([0,1,3,4],'1/30',30),/Variable-rate/);
 assert.throws(()=>c.assertConstantFrameClock([0,1000,1000],'1/30000',30),/Variable-rate/);
});
test('millisecond-quantized CFR is rejected before a nominal range can skip the first frame',()=>{
 assert.throws(()=>c.assertConstantFrameClock([0,33,67,100,133,167],'1/1000',30),/Quantized source frame clock is not supported/);
});
test('rational fractional fps with exact integer source ticks remains supported',()=>{
 const pts=[0,1001,2002,3003];
 assert.equal(c.assertConstantFrameClock(pts,'1/24000',24000/1001),true);
 assert.equal(c.assertConstantFrameClock(pts,'1/24000',(24000/1001)*(1+Number.EPSILON)),true);
 assert.equal(c.assertConstantFrameClock([0,1,2,3],'1001/24000',(24000/1001)*(1+Number.EPSILON)),true);
});
test('worst-case bounded valid float-face page stays below the Panel inline result limit',()=>{
 const huge={box:{xmin:1.123456789012345,ymin:2.123456789012345,xmax:101.123456789012345,ymax:102.123456789012345},score:.8765432109876543,landmarks:Array.from({length:5},()=>({x:21.123456789012345,y:22.123456789012345}))};
 const projection={samples:Array.from({length:c.PAGE_SAMPLES},()=>({index:20000,sourceTimeSeconds:2000.1234567890123,faces:Array.from({length:32},()=>huge)}))};
 assert.ok(Buffer.byteLength(JSON.stringify({result:projection}))<256*1024);
 assert.ok(c.resultScript({input:input(),workflowId:'ai:same'}).includes('slice(0, 16)'));
});
test('raw Resource UUIDs come only from the current owning Draft, including grouped Main clips',()=>{
 const core={owner:{projectId:'project-a'},sequenceJson:{id:'draft',tracks:{children:[{kind:'Main',children:[{id:'group',children:[{id:7,mediaReferences:{defaultMedia:{id:'raw-video'}}}]}]},{kind:'Video',children:[{id:8,mediaReferences:{defaultMedia:{id:'overlay'}}}]}]}}};
 assert.deepEqual([...c.rawResources(core,'project-a','draft')],[[7,'raw-video']]);
 assert.throws(()=>c.rawResources(core,'project-b','draft'),/Project/);assert.throws(()=>c.rawResources(core,'project-a','other'),/Project/);
});
test('recovery storage failure prevents submission',async()=>{
 let calls=0;await assert.rejects(c.runRecord({input:input()},api({save:async()=>{throw Error('disk full');},run:async()=>{calls++;}})),/disk full/);assert.equal(calls,0);
});
test('lost submission ACK retries the same saved input/key and recovers one job',async()=>{
 const record={input:input()};let submitted=0;const bodies=[];let lost=true;
 const transport=api({run:async(body,write)=>{bodies.push(body);if(body.includes('.submit(')){submitted++;assert.equal(write,true);if(lost){lost=false;throw Error('lost ACK');}return {workflowId:'ai:same'};}return status();}});
 await assert.rejects(c.runRecord(record,transport),/lost ACK/);assert.equal(record.workflowId,undefined);
 await c.runRecord(record,transport);assert.equal(record.workflowId,'ai:same');assert.equal(submitted,2);assert.equal(bodies[0],bodies[1]);
});
test('reopening a known workflow observes it without a new submission',async()=>{
 let reads=0;const record={input:input(),workflowId:'ai:same'};
 await c.runRecord(record,api({run:async body=>{assert.ok(!body.includes('.submit('));reads++;return status();}}));assert.equal(reads,1);
});
test('closing a panel detaches observation without canceling the background job',async()=>{
 const ac=new AbortController();let canceled=false;const record={input:input(),workflowId:'ai:same'};
 await assert.rejects(c.runRecord(record,api({signal:ac.signal,run:async body=>{canceled ||= body.includes('.cancel(');return status('running');},sleep:async()=>ac.abort()})),/detached/);assert.equal(canceled,false);
});
test('abort during durable write prevents a late submission from the old Project',async()=>{
 const ac=new AbortController();let calls=0;
 await assert.rejects(c.runRecord({input:input()},api({signal:ac.signal,save:async()=>ac.abort(),run:async()=>calls++})),/detached/);assert.equal(calls,0);
});
test('a late status ACK after detach cannot save/progress a terminal result',async()=>{
 const record={input:input(),workflowId:'ai:same'},ac=new AbortController();let saved=0,progress=0;
 await assert.rejects(c.runRecord(record,api({signal:ac.signal,save:async()=>saved++,progress:()=>progress++,run:async()=>{ac.abort();return status();}})),/detached/);
 assert.equal(saved,1);assert.equal(progress,0);assert.equal(record.status,undefined);
});
test('late result pages after detach are rejected rather than returned',async()=>{
 const ac=new AbortController(),record={input:input(),workflowId:'ai:same'};
 const page={contractVersion:1,task:'faces.detect',frameSize:{width:1920,height:1080},coordinateSpace:'display-pixels',boxFormat:'xyxy',landmarkOrder:['rightEye','leftEye','nose','rightMouth','leftMouth'],parameters:{sourceRange:input().sourceRange,sampleEverySeconds:input().options.sampleEverySeconds,scoreThreshold:.8},total:1,samples:[sample(0)]};
 await assert.rejects(c.readSamples(record,api({signal:ac.signal,run:async()=>{ac.abort();return page;}}),info),/detached/);
});
test('explicit cancellation is persisted and the terminal canceled state is observed',async()=>{
 const record={input:input(),workflowId:'ai:same',cancelRequested:true};const calls=[];
 await assert.rejects(c.runRecord(record,api({run:async(body,write)=>{calls.push([body,write]);return status('canceled');}})),/canceled/);
 assert.ok(calls[0][0].includes('.cancel('));assert.equal(calls[0][1],true);assert.equal(record.status,'canceled');
});
test('unknown cancellation ACK retains intent for same-job recovery',async()=>{
 const record={input:input(),workflowId:'ai:same',cancelRequested:true};let first=true;
 const transport=api({run:async body=>{if(body.includes('.cancel(')&&first){first=false;throw Error('cancel ACK lost');}return status('canceled');}});
 await assert.rejects(c.runRecord(record,transport),/ACK lost/);assert.equal(record.cancelRequested,true);
 await assert.rejects(c.runRecord(record,transport),/canceled/);assert.equal(record.workflowId,'ai:same');
});
test('late cancellation requests are refreshed while polling and failures keep diagnostic meaning',async()=>{
 const record={input:input(),workflowId:'ai:same'};let round=0,canceled=0;
 await assert.rejects(c.runRecord(record,api({refresh:async r=>{if(round)r.cancelRequested=true;},run:async body=>{if(body.includes('.cancel(')){canceled++;return status('canceling');}return status(round++?'canceled':'running');}})),/canceled/);assert.equal(canceled,1);
 await assert.rejects(c.runRecord({input:input(),workflowId:'ai:same'},api({run:async()=>({...status('failed'),lastErrorMessage:'runtime missing'})})),/runtime missing/);
});
test('a response for another Project is rejected',async()=>{
 await assert.rejects(c.runRecord({input:input(),workflowId:'ai:same'},api({run:async()=>({...status(),projectId:'project-b'})})),/scope/);
});
test('bounded pages preserve successful empty observations and detect partial results',async()=>{
 const r={input:input(),workflowId:'ai:same'};const page={contractVersion:1,task:'faces.detect',frameSize:{width:1920,height:1080},coordinateSpace:'display-pixels',boxFormat:'xyxy',landmarkOrder:['rightEye','leftEye','nose','rightMouth','leftMouth'],parameters:{sourceRange:input().sourceRange,sampleEverySeconds:input().options.sampleEverySeconds,scoreThreshold:.8},total:34};let i=0;
 const rows=await c.readSamples(r,api({run:async()=>({...page,samples:Array.from({length:i++<2?16:2},()=>sample(0))})}),info);assert.equal(rows.length,34);
 await assert.rejects(c.readSamples(r,api({run:async()=>({...page,samples:[]})}),info),/incomplete/);
 assert.throws(()=>c.checkPage({...page,frameSize:{width:1080,height:1920},samples:[]},input(),info),/source/);
});
test('shipped panel has no duplicated model, WASM, inference worker or downloader',()=>{
 const built=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 for(const removed of ['onnxruntime-web','ort.wasm','faceRuntime.ts','faceWorker.ts','face_detection_yunet_2023mar.onnx'])assert.ok(!built.includes(removed),removed);
 for(const file of ['faceRuntime.ts','faceWorker.ts','yunetModel.ts','yunetDecode.ts'])assert.equal(fs.existsSync(path.join(__dirname,'../src/pipeline',file)),false,file);
 assert.ok(built.includes('selects.ai.submit('));assert.ok(built.includes('Run or recover face pass'));
});
