const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const {fixture,request}=require('./shared_ai_fixture.cjs');

const consumers=['depth-type-captions','travel-beat-vlog','jude-kinetic-style','portrait-beat-montage','cutout-beat-gallery'];
async function panelClient(id,f){
 const source=fs.readFileSync(require.resolve('../plugins/'+id+'/panel.tsx'),'utf8');
 const start='// ai-job-client:start',end='// ai-job-client:end';
 const a=source.indexOf(start),b=source.indexOf(end);assert.ok(a>=0&&b>a,'registered shared AI module exists');
 const module={exports:{}};
 vm.runInNewContext(source.slice(a+start.length,b),{module,crypto:webcrypto,TextEncoder,setTimeout,clearTimeout,performance});
 const {loadPanelFunctions}=await import('./windows_host.mjs');
 const photo=['travel-beat-vlog','cutout-beat-gallery'].includes(id),names=photo?['photoAiClient','photoAiScript']:['videoAiClient'];
 const api=loadPanelFunctions(source,names,{sharedAiJobs:module.exports,createSharedAiJobClient:module.exports.createSharedAiJobClient});
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
function bundledA16z(){
 const source=fs.readFileSync(require.resolve('../plugins/a16z-style-captions/panel.tsx'),'utf8');
 const a=source.indexOf('var require_ai_job_client ='),b=source.indexOf('// shared/face-request-windows.cjs',a);
 assert.ok(a>=0&&b>a);
 const context={crypto:webcrypto,TextEncoder,setTimeout,clearTimeout,performance,
  __commonJS:body=>{let cached;return()=>{if(!cached){cached={exports:{}};Object.values(body)[0](cached.exports,cached);}return cached.exports;};}};
 return vm.runInNewContext(source.slice(a,b)+'\nrequire_ai_job_client();',context);
}
test('a16z generated bundle preserves the read-retry contract',async()=>{
 const f=fixture(['succeeded'],bundledA16z().createSharedAiJobClient);let once=true;
 f.hooks.status=()=>{if(once){once=false;throw Error('transport offline');}};
 await f.make().run(request);assert.equal(f.calls.status,2);assert.equal(f.calls.submit,1);
});
test('a16z generated bundle keeps exhausted observation recoverable',async()=>{
 const f=fixture(['succeeded'],bundledA16z().createSharedAiJobClient);
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
 const {loadPanelFunctions}=await import('./windows_host.mjs');
 const source=fs.readFileSync(require.resolve('../plugins/travel-beat-vlog/panel.tsx'),'utf8');
 const api=loadPanelFunctions(source,['templateMessage'],{TEMPLATE_FAILED:'Generic failure',NEWER:'Update',NOT_INSTALLED:'Install'});
 assert.equal(api.templateMessage(error),error.message);
});
test('Depth template finish retains the recoverable observation message',async()=>{
 const error=await pendingError(),effects=[];let finish;
 const finished=new Promise(resolve=>{finish=resolve;});
 const {topLevel}=await import('./windows_host.mjs');
 const source=fs.readFileSync(require.resolve('../plugins/depth-type-captions/panel.tsx'),'utf8');
 const context=vm.createContext({useAppUpdateGuard:()=>{},useRef:value=>({current:value}),useState:value=>[value,()=>{}],useEffect:fn=>effects.push(fn),h:()=>null,
  DEPTH_TAG:'depth',DEPTH_TEMPLATE_SECONDS:90,DEPTH_DEFAULTS:{},DEPTH_TEMPLATE_ERRORS:{},DEPTH_TEMPLATE_FAILED:'Generic failure',
  depthStorage:()=>({getItem:async()=>null}),depthSave:async()=>{},depthHostProblem:()=>false,
  depthMakeCaptions:async()=>{throw error;},console:{warn:()=>{}},
 });
 const component=vm.runInContext(topLevel(source,'DepthTemplateRun')+';DepthTemplateRun;',context);
 component({sdk:{runScript:async()=>({result:{seconds:10}}),finishTemplate:finish},context:{projectId:'p',template:{runId:'run',libraryId:'lib',inputs:{speaker:[{kind:'timeline',sequenceId:'d'}]}}}});
 effects[0]();assert.equal((await finished).error,error.message);
});
