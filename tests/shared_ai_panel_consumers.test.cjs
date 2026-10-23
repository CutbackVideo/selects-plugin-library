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
test('Depth template finish retains the recoverable observation message',async()=>{
 const error=await pendingError(),effects=[],scripts=[];let finish,captionCalls=0;
 const finished=new Promise(resolve=>{finish=resolve;});
 const {loadPanelModule}=await import('./panel_module_fixture.mjs');
 const source=fs.readFileSync(require.resolve('../plugins/depth-type-captions/panel.tsx'),'utf8');
 const {DepthTemplateRun:component}=loadPanelModule(source,{names:['DepthTemplateRun'],
  React:{useRef:value=>({current:value}),useState:value=>[value,()=>{}],useEffect:fn=>effects.push(fn),createElement:()=>null},
  overrides:{useAppUpdateGuard:()=>{},depthStorage:()=>({getItem:async()=>null}),depthSave:async()=>{},depthHostProblem:()=>false,
   depthMakeCaptions:async()=>{captionCalls++;throw error;}},globals:{console:{warn:()=>{}}},
 });
 component({sdk:{runScript:async input=>{scripts.push(input);return {result:input.summary==="Read the draft's length"?{seconds:10}:true};},finishTemplate:finish},context:{projectId:'p',template:{runId:'run',libraryId:'lib',inputs:{speaker:[{kind:'timeline',sequenceId:'d'}]}}}});
 effects[0]();const result=await finished;
 assert.equal(captionCalls,1,'the template reaches the intended AI observation failure');
 assert.deepEqual(scripts.map(s=>s.summary),["Read the draft's length",'Frame Depth Type template to portrait']);
 assert.match(scripts[1].script,/await d\.setFrameSize\(\{width:1080,height:1920\}\)/);
 assert.equal(result.error,error.message);
});
