const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {fixture,request}=require('./shared_ai_fixture.cjs');

const consumers=['depth-type-captions','travel-beat-vlog','jude-kinetic-style','portrait-beat-montage','cutout-beat-gallery'];
async function panelClient(id,f){
 const source=fs.readFileSync(require.resolve('../plugins/'+id+'/panel.tsx'),'utf8');
 const {loadPanelModule}=await import('./panel_module_fixture.mjs');
 const photo=['travel-beat-vlog','cutout-beat-gallery'].includes(id),names=photo?['photoAiClient','photoAiScript']:['videoAiClient'];
 const api=loadPanelModule(source,{names,overrides:{panelLocalClient:sdk=>sdk}});
 const storage=new Map();
 const sdk={storage:{getItem:async key=>storage.get(key)??null,setItem:async(key,value)=>storage.set(key,value)},
  runScript:async({script,summary,allowCommit})=>{try{return {result:await f.env.runScript(script,summary,allowCommit)};}catch(error){return {isError:true,output:error.message};}}};
 return {make:()=>api[photo?'photoAiClient':'videoAiClient'](sdk,'project','plugin:persistent-run'),
  journal:()=>JSON.parse([...storage.values()][0])};
}
for(const id of consumers){
 test(id+': the actual panel adapter recovers one failed status read without another inference',async()=>{
  const f=fixture();let once=true;f.hooks.status=()=>{if(once){once=false;throw Error('transport offline');}};
  const panel=await panelClient(id,f);await panel.make().run(request,{readRetryMs:0});
  assert.equal(f.calls.status,2);assert.equal(f.calls.submit,1);assert.equal(f.calls.cancel,0);
  assert.equal(panel.journal().records[0].status,'succeeded');
 });
 test(id+': exhausted reads keep the job in actual panel storage for reopening',async()=>{
  const f=fixture();f.hooks.status=()=>{throw Error('transport offline');};
  const panel=await panelClient(id,f);
  await assert.rejects(panel.make().run(request,{readRetryMs:0}),{code:'SHARED_AI_OBSERVATION_PENDING'});
  assert.equal(panel.journal().records[0].workflowId,'ai:1');assert.equal(f.calls.status,3);
  delete f.hooks.status;await panel.make().run(request,{readRetryMs:0});assert.equal(f.calls.submit,1);
 });
}
async function bundledA16z(){
 const source=fs.readFileSync(require.resolve('../plugins/a16z-style-captions/panel.tsx'),'utf8');
 const {loadPanelModule}=await import('./panel_module_fixture.mjs');
 return loadPanelModule(source,{names:['require_ai_job_client']}).require_ai_job_client();
}
test('a16z generated bundle preserves the read-retry contract',async()=>{
 const f=fixture(['succeeded'],(await bundledA16z()).createSharedAiJobClient);let once=true;
 f.hooks.status=()=>{if(once){once=false;throw Error('transport offline');}};
 await f.make().run(request);assert.equal(f.calls.status,2);assert.equal(f.calls.submit,1);
});
test('a16z generated bundle keeps exhausted observation recoverable',async()=>{
 const f=fixture(['succeeded'],(await bundledA16z()).createSharedAiJobClient);
 f.hooks.status=()=>{throw Error('transport offline');};
 await assert.rejects(f.make().run(request),{code:'SHARED_AI_OBSERVATION_PENDING'});
 assert.equal(f.journal.records[0].workflowId,'ai:1');delete f.hooks.status;
 await f.make().run(request);assert.equal(f.calls.submit,1);
});
async function pendingError(){
 const f=fixture();f.hooks.status=()=>{throw Error('transport offline');};
 return f.make().run(request).catch(error=>error);
}
test('Travel shows the recoverable observation message instead of a generic template failure',async()=>{
 const error=await pendingError();
 const {loadPanelModule}=await import('./panel_module_fixture.mjs');
 const source=fs.readFileSync(require.resolve('../plugins/travel-beat-vlog/panel.tsx'),'utf8');
 const api=loadPanelModule(source,{names:['templateMessage']});
 assert.equal(api.templateMessage(error),error.message);
});
test('Depth preserves landscape framing while its real caption pipeline retains the recoverable observation message',async t=>{
 const error=await pendingError(),effects=[],scripts=[],geometries=[];let finish,maskCalls=0,writes=0;
 const finished=new Promise(resolve=>{finish=resolve;});
 const frameSize={width:1920,height:1080},transform={scale:{x:1.2,y:1.2},position:{x:12,y:-8}};
 const main=[{clipId:1,trackId:'main',trackKind:'main',resourceId:'r0',startFrame:0,endFrame:300,transform}];
 const draft={meta:async()=>({name:'Landscape QA',fps:30,durationFrames:300,frameSize}),clips:async()=>main,
  words:async()=>['This','is','one','complete','spoken','sentence.'].map((text,i)=>({text,startFrame:i*50,endFrame:(i+1)*50})),
  setFrameSize:async size=>{writes++;Object.assign(frameSize,size);return{opCount:1};},
  setClipTransform:async input=>{writes++;Object.assign(transform,{scale:input.scale,position:input.position});return{diff:{opCount:writes}};},
  commitAll:async()=>{writes++;},
 };
 const selects={draft:()=>draft,listProjects:async()=>[{id:'p',title:'QA',draftIds:['d']}],project:()=>({resource:()=>({meta:async()=>({frameSize:{width:1920,height:1080}})})})};
 const {loadPanelModule,disposePanelModule}=await import('./panel_module_fixture.mjs');
 const source=fs.readFileSync(require.resolve('../plugins/depth-type-captions/panel.tsx'),'utf8');
 const api=loadPanelModule(source,{names:['DepthTemplateRun'],
  React:{useRef:value=>({current:value}),useState:value=>[value,()=>{}],useEffect:fn=>effects.push(fn),createElement:()=>null},
  overrides:{useAppUpdateGuard:()=>{},depthStorage:()=>({getItem:async()=>null}),depthSave:async()=>{},depthHostProblem:()=>false,
   // Rendering/AI is the host boundary; dialogue, composition and template error handling remain actual code.
   depthMakeSpeakerMasks:async(_sdk,_pid,_sid,meta)=>{maskCalls++;geometries.push({width:meta.width,height:meta.height,duration:meta.duration});throw error;}},
  globals:{console:{warn:()=>{}}},
 });
 const cleanups=[];t.after(()=>{for(const cleanup of cleanups)cleanup();disposePanelModule(api);});
 const sdk={runScript:async input=>{scripts.push(input);let execution;try{
   execution=loadPanelModule('async function execute(){\n'+input.script+'\n}',{names:['execute'],globals:{selects}});
   return{result:await execution.execute()};
  }finally{if(execution)disposePanelModule(execution);}},finishTemplate:finish};
 api.DepthTemplateRun({sdk,context:{projectId:'p',template:{runId:'run',libraryId:'lib',inputs:{speaker:[{kind:'timeline',sequenceId:'d'}]}}}});
 for(const effect of effects){const cleanup=effect();if(cleanup)cleanups.push(cleanup);}const result=await finished;
 assert.equal(maskCalls,1,'the actual caption pipeline reaches the intended AI observation boundary');
 assert.deepEqual(scripts.map(s=>s.summary),["Read the draft's length",'Read dialogue for Depth Type captions']);
 assert.ok(scripts.every(s=>s.allowCommit===false));
 assert.deepEqual(geometries,[{width:1920,height:1080,duration:10}]);
 assert.deepEqual(frameSize,{width:1920,height:1080});
 assert.deepEqual(transform,{scale:{x:1.2,y:1.2},position:{x:12,y:-8}});
 assert.equal(main[0].endFrame,300);assert.equal(writes,0);
 assert.equal(result.error,error.message);assert.equal(result.sequenceId,undefined);
});
