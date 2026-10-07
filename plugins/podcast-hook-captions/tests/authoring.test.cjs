'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {createRequire}=require('node:module');
const c=require('../src/pipeline/sharedAiFaces.cjs');
const {sdkFixturePlugin,initializedSdk,asyncMemoryFiles}=require('./sdk-fixture.cjs');
const modules=process.env.AI_PANEL_TEST_MODULES;
test('actual SDK typechecker and legacy tracking integration',{skip:!modules&&'Set AI_PANEL_TEST_MODULES to an existing Selects node_modules'},async t=>{
 const dependency=createRequire(path.join(path.resolve(modules),'..','package.json'));
 const esbuild=dependency('esbuild');const appRoot=path.dirname(path.resolve(modules));
 const result=await esbuild.build({entryPoints:[path.join(appRoot,'electron/mcp/script-runtime/typecheck.ts')],bundle:true,write:false,platform:'node',format:'cjs',external:['typescript'],plugins:[sdkFixturePlugin(),{name:'raw-sdk',setup(b){
  b.onResolve({filter:/\?raw$/},a=>({path:path.resolve(a.resolveDir,a.path.slice(0,-4)),namespace:'raw'}));
  b.onLoad({filter:/.*/,namespace:'raw'},async a=>({contents:await fs.readFile(a.path,'utf8'),loader:'text'}));
 }}]});const typed={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(dependency,typed,typed.exports);
 await t.test('every literal AI script passes the shipped public SDK checker',()=>{
  const input=c.faceInput('project','11111111-1111-4111-8111-111111111111',{f0:0,f1:24,step:4},24,'stable-key');
  const record={input,workflowId:'ai:11111111-1111-4111-8111-111111111111'};
  for(const script of [c.submitScript(input),c.statusScript(record),c.cancelScript(record),c.resultScript(record),c.resultScript(record,64)]){
   const check=typed.exports.typecheckQueryScript(script);assert.equal(check.ok,true,JSON.stringify(check));
  }
 });
 await t.test('actual host gate rejects old or unknown binaries and accepts the first shared-AI release',async()=>{
  const compiled=await esbuild.build({entryPoints:[path.join(__dirname,'../src/pipeline/host.ts')],bundle:true,write:false,platform:'node',format:'cjs',plugins:[sdkFixturePlugin()]});
  const host={exports:{}};new Function('require','module','exports',compiled.outputFiles[0].text)(dependency,host,host.exports);
  const old=Object.getOwnPropertyDescriptor(globalThis,'window');let version;
  host.exports.hostUseSdk(initializedSdk({},()=>version));
  try{
   for(version of ['', '2.0.537', '2.0.554', '2.0.559', '2.0.560junk'])assert.throws(()=>host.exports.requireSharedAiHost(),/Selects 2\.0\.560 or later/);
   for(version of ['2.0.560','2.0.561','3.0.0'])assert.doesNotThrow(()=>host.exports.requireSharedAiHost());
  }finally{if(old)Object.defineProperty(globalThis,'window',old);else delete globalThis.window;}
 });
 await t.test('late face observation cannot update a switched Project and close does not cancel host work',async()=>{
  const React=dependency('react'),{createRoot}=dependency('react-dom/client'),{JSDOM}=dependency('jsdom');
  const built=await esbuild.build({entryPoints:[path.join(__dirname,'../src/FaceStage.tsx')],bundle:true,write:false,platform:'node',format:'cjs',external:['react'],plugins:[sdkFixturePlugin(),{name:'face-stage-observation',setup(b){
   b.onResolve({filter:/^\.\/pipeline\//},a=>a.path.endsWith('/host')?undefined:{path:a.path,namespace:'mock'});
   b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path.endsWith('/reel')?'export const readReel=(...a)=>globalThis.__faceTest.readReel(...a);':a.path.endsWith('/faces')?'export const trackFaces=(...a)=>globalThis.__faceTest.trackFaces(...a);export const reelShots=()=>[];':'export const cancelFaceJobs=(...a)=>globalThis.__faceTest.cancel(...a);export const newFacePass=async()=>{};',loader:'ts'}));
  }}]});const loaded={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(dependency,loaded,loaded.exports);
  const dom=new JSDOM('<div id="root"></div>');const old={};
  for(const name of ['window','document','IS_REACT_ACT_ENVIRONMENT','__faceTest'])old[name]=Object.getOwnPropertyDescriptor(globalThis,name);
  Object.defineProperty(globalThis,'window',{configurable:true,value:dom.window});Object.defineProperty(globalThis,'document',{configurable:true,value:dom.window.document});Object.defineProperty(globalThis,'IS_REACT_ACT_ENVIRONMENT',{configurable:true,value:true});
  let finish,signal,cancels=0,reads=0,writes=0,version="2.0.559";globalThis.__faceTest={fs:{join:(...p)=>p.join('/'),homedir:()=>"/owned",mkdir:async ()=>writes++},readReel:async()=>{reads++;return {clips:[{path:'fixture',srcStart:0}],fps:24};},trackFaces:async(...a)=>{signal=a[6];return await new Promise(r=>finish=r);},cancel:async()=>cancels++};
  globalThis.__initializePodcastHost(initializedSdk(globalThis.__faceTest.fs,()=>version));
  const h=React.createElement,U={Section:p=>h('section',null,p.children),Stack:p=>h('div',null,p.children),Actions:p=>h('div',null,p.children),Message:p=>h('p',null,p.children),Button:p=>h('button',{disabled:p.disabled,onClick:p.onClick},p.children)};
  const root=createRoot(dom.window.document.getElementById('root'));const render=async pid=>React.act(async()=>root.render(h(loaded.exports.default,{sdk:{},context:{projectId:pid,sequenceId:'draft'},ui:U})));
  const click=async index=>React.act(async()=>{dom.window.document.querySelectorAll('button')[index].dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true}));await new Promise(r=>setTimeout(r,0));});
  try{await render('A');await click(0);assert.ok(dom.window.document.body.textContent.includes('Selects 2.0.560 or later'));assert.deepEqual([reads,writes,cancels],[0,0,0]);await click(2);assert.equal(cancels,0);version='2.0.560';await click(0);assert.ok(finish);assert.deepEqual([reads,writes],[1,1]);await render('B');assert.equal(signal.aborted,true);await React.act(async()=>finish({}));assert.ok(!dom.window.document.body.textContent.includes('Face pass complete'));assert.equal(cancels,0);}
  finally{await React.act(async()=>root.unmount());dom.window.close();for(const [name,descriptor]of Object.entries(old)){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}}
 });
 await t.test('late old-pass ACK after detach/new pass cannot resurrect the old workflow',async()=>{
  const built=await esbuild.build({entryPoints:[path.join(__dirname,'../src/pipeline/sharedFaceJobs.ts')],bundle:true,write:false,platform:'node',format:'cjs',plugins:[sdkFixturePlugin()]});
  const loaded={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(dependency,loaded,loaded.exports);
  const storage=new Map(),dir='owned/pass';const file=dir+'/face-ai-jobs.json';
  const input=c.faceInput('project-a','raw',{f0:30,f1:42,step:4},24,'old-key');
  storage.set(file,JSON.stringify({version:1,generation:'old-generation',records:[{input,workflowId:'ai:old',status:'succeeded'}]}));
  const old=Object.getOwnPropertyDescriptor(globalThis,'window');
  Object.defineProperty(globalThis,'window',{configurable:true,value:{parent:{}}});
  globalThis.__initializePodcastHost(initializedSdk(asyncMemoryFiles(storage)));
  let ack,started;const called=new Promise(r=>started=r);let submitCount=0;
  const sdk={runScript:async({script})=>{
   if(script.includes('.submit(')){submitCount++;return {isError:false,result:{workflowId:'ai:new'}};}
   if(script.includes('.status()')&&script.includes('ai:old')){started();return await new Promise(r=>ack=r);}
   if(script.includes('.status()'))return {isError:false,result:{workflowId:'ai:new',projectId:'project-a',status:'succeeded'}};
   return {isError:false,result:{contractVersion:1,task:'faces.detect',frameSize:{width:1920,height:1080},coordinateSpace:'display-pixels',boxFormat:'xyxy',landmarkOrder:['rightEye','leftEye','nose','rightMouth','leftMouth'],parameters:{sourceRange:input.sourceRange,sampleEverySeconds:input.options.sampleEverySeconds,scoreThreshold:.8},total:3,samples:[0,1,2].map(i=>({index:i,sourceTimeSeconds:(30+i*4)/24,faces:[]}))}};
  }};
  try{
   const ac=new AbortController();const observing=loaded.exports.detectShared(sdk,dir,input,{W:1920,H:1080},()=>{},ac.signal);const rejected=assert.rejects(observing,/detached/);
   await called;ac.abort();await loaded.exports.newFacePass(dir);ack({isError:false,result:{workflowId:'ai:old',projectId:'project-a',status:'succeeded'}});await rejected;
   assert.equal((await loaded.exports.journal(dir)).records.length,0);
   await loaded.exports.detectShared(sdk,dir,{...input,requestKey:'new-key'},{W:1920,H:1080},()=>{});
   assert.equal(submitCount,1);assert.equal((await loaded.exports.journal(dir)).records[0].workflowId,'ai:new');
  }finally{if(old)Object.defineProperty(globalThis,'window',old);else delete globalThis.window;}
 });
 await t.test('independent iframe modules reject an unaborted old observer after another module starts a pass',async()=>{
  const built=await esbuild.build({entryPoints:[path.join(__dirname,'../src/pipeline/sharedFaceJobs.ts')],bundle:true,write:false,platform:'node',format:'cjs',plugins:[sdkFixturePlugin()]});
  const loaded={exports:{}},reopened={exports:{}};
  for(const target of [loaded,reopened]){new Function('require','module','exports',built.outputFiles[0].text)(dependency,target,target.exports);target.initialize=globalThis.__initializePodcastHost;}
  const storage=new Map(),dir='owned/unaborted',file=dir+'/face-ai-jobs.json';const input=c.faceInput('project-a','raw',{f0:0,f1:24,step:4},24,'old-key');
  storage.set(file,JSON.stringify({version:1,generation:'old',records:[{input,workflowId:'ai:old',status:'succeeded'}]}));
  const old=Object.getOwnPropertyDescriptor(globalThis,'window');Object.defineProperty(globalThis,'window',{configurable:true,value:{parent:{}}});
  for(const target of [loaded,reopened])target.initialize(initializedSdk(asyncMemoryFiles(storage)));
  let ack,started;const called=new Promise(r=>started=r);
  try{const observation=loaded.exports.detectShared({runScript:async()=>{started();return await new Promise(r=>ack=r);}},dir,input,{W:1920,H:1080},()=>{});const rejected=assert.rejects(observation,/older pass/);await called;await reopened.exports.newFacePass(dir);ack({isError:false,result:{workflowId:'ai:old',projectId:'project-a',status:'succeeded'}});await rejected;assert.equal((await loaded.exports.journal(dir)).records.length,0);}
  finally{if(old)Object.defineProperty(globalThis,'window',old);else delete globalThis.window;}
 });
 const built=await esbuild.build({entryPoints:[path.join(__dirname,'../src/pipeline/faceTrack.ts')],bundle:true,write:false,platform:'node',format:'cjs',plugins:[sdkFixturePlugin()]});
 const tracker={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(dependency,tracker,tracker.exports);
 await t.test('real unchanged track/cut/color reducer consumes common rows at 6 samples per second',async()=>{
  const info={W:1920,H:1080,fps:24},plan=tracker.exports.samplePlan(info,1.25,2.25);
  assert.equal(plan.step,4);assert.equal(plan.count,6);
  const input=c.faceInput('p','raw',plan,24,'key');
  const row={box:{xmin:480,ymin:216,xmax:960,ymax:648},score:.91,landmarks:[{x:600,y:324},{x:840,y:324},{x:720,y:432},{x:660,y:540},{x:780,y:540}]};
  const shared=c.adaptSamples(Array.from({length:6},(_,i)=>({index:100+i*8,sourceTimeSeconds:(plan.f0+i*plan.step)/24,faces:[row]})),input,info,plan);
  const image=new Uint8Array(plan.w*plan.h*3);for(let i=0;i<image.length;i+=3){image[i]=40;image[i+1]=80;image[i+2]=120;}
  const frames=async function*(){for(let i=0;i<6;i++)yield image;};
  const run=async samples=>tracker.exports.scanProbed({id:7,path:'owned-fixture',start:1.25,end:2.25},info,plan,{workDir:'unused',frames,sharedSamples:samples});
  const observed=await run(shared);assert.equal(observed.shots.length,1);assert.equal(observed.shots[0].face.h,.4);assert.equal(observed.shots[0].face.eyes,.3);assert.equal(observed.shots[0].face.coverage,1);assert.equal(observed.shots[0].start,1.25);assert.equal(observed.shots[0].end,2.25);
  assert.equal(observed.color.r,120);assert.equal(observed.color.g,80);assert.equal(observed.color.b,40);
  const empty=await run(shared.map(s=>({...s,faces:[]})));assert.equal(empty.shots[0].face,null);assert.deepEqual(empty.color,observed.color);
  const low=await run(shared.map(s=>({...s,faces:s.faces.map(f=>({...f,score:.79}))})));assert.equal(low.shots[0].face,null);
 });
});
