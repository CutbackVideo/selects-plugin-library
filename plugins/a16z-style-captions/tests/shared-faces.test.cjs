const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {stripTypeScriptTypes} = require('node:module');
const test = require('node:test');
const root = path.join(__dirname, '..');
function pure(file, symbols, context = {}) {
  const source = fs.readFileSync(path.join(root, file), 'utf8').replace(/^import .*$/gm, '').replace(/^export type \{.*$/gm, '').replace(/^export /gm, '');
  const ctx = vm.createContext(context);
  vm.runInContext(stripTypeScriptTypes(source, {mode:'strip'}) + '\nthis.api = {' + symbols.join(',') + '};', ctx);
  return ctx.api;
}
const plain = value => JSON.parse(JSON.stringify(value));
const {hsvHistogram, histogramDistance, histogramCuts} = pure('src/pipeline/shotHistogram.ts', ['hsvHistogram', 'histogramDistance', 'histogramCuts']);
const {speakerShots} = pure('src/pipeline/faceTracks.ts', ['speakerShots']);
const face = (x, w = 120) => ({box:{xmin:x,ymin:100,xmax:x+w,ymax:300}, score:.95, landmarks:[{x:x+20,y:150},{x:x+60,y:150},{x:x+40,y:210},{x:x+20,y:260},{x:x+60,y:260}]});
test('HSV camera cut rule preserves old normalized bins and ChiSquare-alt threshold', async () => {
  const red = Uint8Array.from([255,0,0,255,0,0]);
  const blue = Uint8Array.from([0,0,255,0,0,255]);
  const r = hsvHistogram(red), b = hsvHistogram(blue);
  assert.equal(r[15], 1); assert.equal(b[21*16+15], 1);
  assert.equal(histogramDistance(r, r), 0); assert.equal(histogramDistance(r, b), 4);
  const cuts = await histogramCuts({read:async i => [red,red,blue,blue][i], count:4, times:Array.from({length:4},(_,i)=>240+i*5/30)});
  assert.deepEqual(plain(cuts), [240 + 10/30]);
});
test('persistent speaker track outranks a briefly larger face, keeping normalized eye framing', () => {
  const samples = [0, .2, .4, .6].map(t => ({sourceTimeSeconds:240+t, faces:[face(300), ...(t===0?[face(50,150)]:[])]}));
  const result = speakerShots(samples, [], 240, 241, 1000, 500);
  assert.deepEqual(plain(result), {W:1000,H:500,shots:[{start:240,end:241,face:{cx:.34,eyes:.3,h:.4,w:.12,top:.2}}]});
});
test('camera cuts isolate tracks and short detection flickers merge into their neighbour', () => {
  const result = speakerShots([{sourceTimeSeconds:0,faces:[face(100)]},{sourceTimeSeconds:1.1,faces:[face(600)]},{sourceTimeSeconds:1.4,faces:[face(600)]}], [1,1.2], 0, 2, 1000, 500);
  assert.deepEqual(plain(result.shots.map(s=>[s.start,s.end,s.face.cx])), [[0,1.2,.14],[1.2,2,.64]]);
});
test('Draft source join accepts canonical transcript IDs and preserves source FPS separately', async () => {
  const id='11111111-1111-4111-8111-111111111111';
  const bindings={7:id};
  const {READ} = pure('src/pipeline/source.ts', ['READ'], {J:JSON.stringify, LIST_FILES:'const listFiles=async()=>[{resourceId:"r0",path:"source.mp4",frameSize:{width:1000,height:500}}];'});
  const script = stripTypeScriptTypes('async function read(){'+READ('draft','project',bindings)+'}', {mode:'strip'});
  const selects={project:()=>({resource:()=>({meta:async()=>({fps:60,durationSeconds:300,frameSize:{width:1000,height:500}})})}),draft:()=>({meta:async()=>({fps:30,name:'Draft',frameSize:{width:1080,height:1920}}),words:async()=>[{text:'a',startFrame:300,endFrame:310,sourceStartFrame:14400,sourceResourceId:id},{text:'foreign',startFrame:311,endFrame:312,sourceStartFrame:600,sourceResourceId:'foreign'}],clips:async()=>[{clipId:7,resourceId:'r0',trackKind:'main',startFrame:300,endFrame:330}]})};
  const result=await new Function('selects',script+';return read();')(selects);
  assert.equal(result.clips[0].srcStart,240);
  assert.equal(result.clips[0].sourceFps,60);
  assert.equal(result.clips[0].canonicalResourceId,id);
});
test('A16Z bundle has no private model, runtime installer or Windows centred-only branch',()=>{
  const panel=fs.readFileSync(path.join(root,'panel.tsx'),'utf8');
  assert.doesNotMatch(panel,/FaceDetectorYN|opencv-python|face_track\.py|python-envs|ensureFaceRuntime|macOS for now/);
  assert.match(panel,/createSharedAiJobClient/);assert.match(panel,/hsvHistogram/);
});

test('shared observations reject a timeline timestamp, malformed box, and sample reordering',()=>{
  assert.throws(()=>speakerShots([{sourceTimeSeconds:0,faces:[]}],[],240,241,1000,500),/sample order/);
  assert.throws(()=>speakerShots([{sourceTimeSeconds:240,faces:[{...face(300),box:{xmin:900,ymin:0,xmax:1100,ymax:100}}]}],[],240,241,1000,500),/geometry/);
  assert.throws(()=>speakerShots([{sourceTimeSeconds:240.5,faces:[]},{sourceTimeSeconds:240,faces:[]}],[],240,241,1000,500),/sample order/);
});
test('A16Z long 30/60fps requests merge globally before the original speaker tracking and recover without resubmitting',async()=>{
 const {createSharedAiJobClient}=require('../../../shared/ai-job-client.cjs');
 const {faceRequestWindows,appendFaceSamples}=require('../../../shared/face-request-windows.cjs');
 const {sampleSelector}=require('../../selects-ai-runtime/tasks/faces-detect.cjs');
 const {cameraSampleArgs,cameraSampleTimes}=pure('src/pipeline/cameraSamples.ts',['cameraSampleArgs','cameraSampleTimes']);
 for(const fps of [30,60]){
  const files=new Map(),jobs=new Map();let admitted=0;
  const job={id:'long',path:'/source.mp4',resourceId:'11111111-1111-4111-8111-111111111111',start:240.1,end:961.1,fps,width:1000,height:500};
  const raster=new Uint8Array(640*320*3),io={join:(...p)=>p.join('/'),mkdir:async()=>{},exists:async p=>files.has(p),writeFile:async(p,v)=>files.set(p,v),readFile:async p=>files.get(p),rm:async p=>files.delete(p),stat:async()=>({size:raster.length}),readRange:async()=>raster};
  const selects={ai:{submit:async input=>{assert.ok((input.sourceRange.endSeconds-input.sourceRange.startSeconds)*fps<19000);const id='ai:'+ ++admitted;jobs.set(id,input);return{workflowId:id};},job:(id,pid)=>({status:async()=>({workflowId:id,projectId:pid,runtimeId:'selects-ai-runtime',task:'faces.detect',status:'succeeded'}),result:async()=>({workflowId:id,task:'faces.detect',files:{detections:{id}}})}),readJSON:async artifact=>{
   const input=jobs.get(artifact.id),range=input.sourceRange,choose=sampleSelector({sourceRange:range,sampleEverySeconds:input.options.sampleEverySeconds}),samples=[];
   const first=Math.ceil(range.startSeconds*fps-1e-6),after=Math.ceil(range.endSeconds*fps-1e-6);
   for(let index=first;index<after;index++)if(choose(index/fps))samples.push({index:index-first,sourceTimeSeconds:index/fps,faces:[face(300),...(index/fps<job.start+.4?[face(50,150)]:[])]});
   return {contractVersion:1,task:'faces.detect',coordinateSpace:'display-pixels',boxFormat:'xyxy',frameSize:{width:1000,height:500},parameters:{sourceRange:range,...input.options},samples};
  }}};
  const sdk={runScript:async({script})=>({result:await new Function('selects',stripTypeScriptTypes('async function run(){'+script+'}',{mode:'strip'})+';return run();')(selects)})};
  const {trackFaces}=pure('src/pipeline/faces.ts',['trackFaces'],{createSharedAiJobClient,faceRequestWindows,appendFaceSamples,speakerShots,histogramCuts,cameraSampleArgs,cameraSampleTimes,fs:()=>io,
   script:async(sdk,summary,body,allowCommit)=>(await sdk.runScript({script:body,summary,allowCommit})).result,
   hostFF:async()=>({stderr:`showinfo config in time_base: 1/${fps}\nshowinfo n: 0 pts: ${Math.round(job.start*fps)} pts_time:rounded`}),
  });
  const result=await trackFaces(sdk,'project','/job',[job]);
  assert.ok(admitted>1);
  // Whole-span reference from the same model observations; tracking must span chunks.
  const input={sourceRange:{startSeconds:job.start,endSeconds:job.end},options:{sampleEverySeconds:Math.round(fps/6)/fps,scoreThreshold:.8}};
  jobs.set('baseline',input);
  const reference=await selects.ai.readJSON({id:'baseline'});
  assert.deepEqual(plain(result.long),plain(speakerShots(reference.samples,[],job.start,job.end,1000,500)));
  const prior=admitted;await trackFaces(sdk,'project','/job',[job]);assert.equal(admitted,prior);
 }
});
