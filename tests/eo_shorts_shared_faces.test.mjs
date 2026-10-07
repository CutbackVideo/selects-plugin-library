import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {adaptSharedFaces, sharedFaces} from '../plugins/eo-shorts/src/stages/speaker/sharedFaces.ts';
import {pieceSourceOffsets} from '../plugins/eo-shorts/src/speaker/sourceTime.ts';
const face={box:{xmin:100,ymin:50,xmax:200,ymax:250},score:.95,landmarks:[{x:120,y:100},{x:180,y:100},{x:150,y:150},{x:120,y:200},{x:180,y:200}]};
const page={frameSize:{width:1000,height:500},samples:[{index:0,sourceTimeSeconds:240,faces:[face]},{index:1,sourceTimeSeconds:240.5,faces:[]}]};
test('shared detection geometry stays in original display pixels and original source seconds',()=>{
  assert.deepEqual(adaptSharedFaces(page,[240,240.5],30),[[{x:100,y:50,w:100,h:200,score:.95,landmarks:[[120,100],[180,100],[150,150],[120,200],[180,200]]}],[]]);
  assert.throws(()=>adaptSharedFaces(page,[0],30),/source clock/);
  assert.throws(()=>adaptSharedFaces({...page,samples:[{...page.samples[0],faces:[{...face,box:{...face.box,xmax:2000}}]}]},[240],30),/geometry/);
});
test('speaker source-clock extraction ignores transcript from a different Resource',()=>{
  const got=pieceSourceOffsets([{clipId:7,startFrame:300,endFrame:330,resourceId:'r0'}],[{startFrame:300,endFrame:310,sourceStartFrame:14400,sourceResourceId:'r0'},{startFrame:301,endFrame:305,sourceStartFrame:60,sourceResourceId:'r1'}],[],30,()=>60);
  assert.equal(got[0].t0,230);assert.equal(got[0].words,1);
});
test('production EO bundle uses shared jobs and preserves FFmpeg cut and style framing paths',()=>{
  const panel=readFileSync(new URL('../plugins/eo-shorts/panel.tsx',import.meta.url),'utf8');
  assert.doesNotMatch(panel,/onnxruntime-web|startWorkerEngine|FaceDetectorYN|loadFaceDetector|wasmBinary|decodeYuNet/);
  for(const text of ['createSharedAiJobClient','adaptSharedFaces','scdet=threshold=','segmentFaces','planApply','canonicalResourceBindings'])assert.ok(panel.includes(text),text);
});

function sharedFixture(observations) {
  const files=new Map(), jobs=new Map(); let submitted=0, canceled=0, complete=true;
  const root='/job/speaker', resourceId='11111111-1111-4111-8111-111111111111';
  const fs={join:(...p)=>p.join('/'),dirname:p=>p.slice(0,p.lastIndexOf('/')),exists:async p=>files.has(p),mkdir:async()=>{},writeFile:async(p,v)=>files.set(p,v),readFile:async p=>{if(!files.has(p))throw Error('The file is unavailable.');return files.get(p);},rename:async(a,b)=>{files.set(b,files.get(a));files.delete(a);},unlink:async p=>files.delete(p)};
  const selects={ai:{submit:async input=>{submitted++; const id='ai:'+submitted;jobs.set(id,{input,status:'running'});return{workflowId:id};},job:(id,pid)=>({status:async()=>{const j=jobs.get(id);return{workflowId:id,projectId:pid,runtimeId:'selects-ai-runtime',task:'faces.detect',status:complete?'succeeded':j.status};},cancel:async()=>{canceled++;jobs.get(id).status='canceled';return{workflowId:id,projectId:pid,runtimeId:'selects-ai-runtime',task:'faces.detect',status:'canceled'};},result:async()=>({workflowId:id,task:'faces.detect',files:{detections:{id,mediaType:'application/json'}}})}),readJSON:async artifact=>{const input=jobs.get(artifact.id).input;return{contractVersion:1,task:'faces.detect',coordinateSpace:'display-pixels',boxFormat:'xyxy',parameters:{sourceRange:input.sourceRange,scoreThreshold:input.options.scoreThreshold,sampleEverySeconds:input.options.sampleEverySeconds},...(observations?observations(input):page)};}}};
  const host={fs, sdk:{runScript:async({script,allowCommit})=>{const {stripTypeScriptTypes}=await import('node:module');const body=stripTypeScriptTypes('async function run(){'+script+'}',{mode:'strip'});try{const result=await new Function('selects',body+';return run();')(selects);return{isError:false,result,output:JSON.stringify({result})};}catch(e){return{isError:true,output:JSON.stringify({error:e.message})};}}}};
  return {host,options:{projectId:'project',journalPath:root+'/ai-jobs.json',scope:'run:speaker',resources:{'source.mp4':{resourceId,duration:300}}},get inputs(){return [...jobs.values()].map(j=>j.input);},get submitted(){return submitted;},get canceled(){return canceled;},set complete(v){complete=v;}};
}
test('EO shared source adapter submits once and reuses the durable workflow after reopen',async()=>{
  const f=sharedFixture();
  const first=await sharedFaces(f.host,f.options)('source.mp4',[240,240.5],30);
  assert.deepEqual(adaptSharedFaces(first,[240,240.5],30),adaptSharedFaces(page,[240,240.5],30));
  await sharedFaces(f.host,f.options)('source.mp4',[240,240.5],30);
  assert.equal(f.submitted,1);
});
test('EO explicit Cancel stops shared inference; panel detach preserves it for Resume',async()=>{
  for(const explicit of [false,true]){
    const f=sharedFixture();f.complete=false;
    const controller=new AbortController();let observed;const started=new Promise(r=>observed=r);
    const run=sharedFaces(f.host,{...f.options,signal:controller.signal,progress:()=>observed()})('source.mp4',[240,240.5],30);
    await started;controller.abort(new Error(explicit?'Canceled.':'Panel closed.'));
    await assert.rejects(run,/observation stopped|canceled/i);
    assert.equal(f.canceled,explicit?1:0);
    f.complete=true;await sharedFaces(f.host,f.options)('source.mp4',[240,240.5],30);
    assert.equal(f.submitted,explicit?2:1);
  }
});

test('EO speaker pass retains camera cuts while batch inference reads source times and no BGR files',async()=>{
  const {analyzeSpeaker}=await import('../plugins/eo-shorts/src/speaker/analyze.ts');
  const calls=[], detected=[];
  const result=await analyzeSpeaker({draftId:'draft',draftFps:30,frameSize:{width:1080,height:1920},durationFrames:90,pieces:[{clipId:7,startFrame:0,endFrame:90,resourceId:'r0'}],words:[{startFrame:0,endFrame:10,sourceStartFrame:7200,sourceResourceId:'r0'}],seams:[],resources:{r0:{fps:30,path:'source.mp4'}}},{
    probe:async()=>({width:1920,height:1080,fps:30,startOffset:0}),
    ffmpeg:async args=>{calls.push(args);return '[scdet] lavfi.scd.score: 90, lavfi.scd.time: 2\n'+Array.from({length:10},(_,i)=>'[showinfo] n: '+i+' pts: '+(i*15)+' pts_time: '+(i*.5)).join('\n');},
    scratchPath:name=>'/scratch/'+name,remove:()=>{},readRange:async()=>{throw Error('Shared analysis must not read raw frame files');},
    detectSamples:async(path,times,fps,size)=>{detected.push({path,times,fps,size});return times.map(()=>[{x:700,y:200,w:240,h:300,score:.95,landmarks:[[750,260],[870,260],[810,350],[760,430],[850,430]]}]);},
  });
  assert.equal(calls.length,1);assert.deepEqual(calls[0].slice(-3),['-f','null','-']);
  assert.ok(calls[0].find(a=>a.includes('scdet=threshold=')));
  assert.equal(detected.length,1);assert.equal(detected[0].times[0],239);
  assert.equal(detected[0].times.at(-1),243.5);
  assert.equal(result.framing.segments.length,2);
  assert.equal(result.framing.segments[1].start,241);
  assert.ok(result.framing.segments.every(s=>s.faces.withFace>0));
});
test('EO fifteen-minute source batches stay below runtime frame budget and recover all windows without resubmitting',async()=>{
 const {sampleSelector}=await import('../plugins/selects-ai-runtime/tasks/faces-detect.cjs');
 const f=sharedFixture(input=>{
  const range=input.sourceRange,choose=sampleSelector({sourceRange:range,sampleEverySeconds:input.options.sampleEverySeconds}),samples=[];
  const first=Math.ceil(range.startSeconds*30-1e-6),after=Math.ceil(range.endSeconds*30-1e-6);
  assert.ok(after-first<19000);
  for(let frame=first;frame<after;frame++)if(choose(frame/30))samples.push({index:frame-first,sourceTimeSeconds:frame/30,faces:[face]});
  return {frameSize:page.frameSize,samples};
 });
 f.options.resources['source.mp4'].duration=1200;
 const times=Array.from({length:1800},(_,i)=>120+i*.5),infer=()=>sharedFaces(f.host,f.options)('source.mp4',times,30);
 const result=await infer();
 assert.ok(f.inputs.length>1);
 assert.deepEqual(result.samples.map(s=>s.sourceTimeSeconds),times);
 assert.deepEqual(result.samples.map(s=>s.index),times.map((_,i)=>i));
 assert.equal(adaptSharedFaces(result,times,30).length,times.length);
 const admitted=f.submitted;await infer();assert.equal(f.submitted,admitted);
});
