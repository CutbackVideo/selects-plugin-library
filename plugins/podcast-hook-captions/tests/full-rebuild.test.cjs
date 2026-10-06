'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {createRequire}=require('node:module');
const modules=process.env.AI_PANEL_TEST_MODULES;
const plugin=path.resolve(__dirname,'..');
function memory() {
 const files=new Map();
 const storage={join:path.join,normalize:path.normalize,homedir:()=>'/owned',mkdirSync:()=>{},rmSync:()=>{},existsSync:p=>files.has(p)||[...files.keys()].some(n=>n.startsWith(p+'/')),readdirSync:p=>[...files.keys()].filter(n=>n.startsWith(p+'/')).map(n=>n.slice(p.length+1)),readFile:async p=>{if(!files.has(p))throw Error('ENOENT');return files.get(p);},readFileSync:p=>files.get(p),writeFileSync:(p,v)=>files.set(p,v),writeFile:async(p,v)=>files.set(p,v),renameSync:(a,b)=>{assert.ok(files.has(a));files.set(b,files.get(a));files.delete(a);}};
 return {files,storage};
}
function load(source,dependency) {
 const target={exports:{}};new Function('require','module','exports',source)(dependency,target,target.exports);return target.exports;
}
test('actual make/rebuild face integration, with all paid generation and Draft edits stubbed',{skip:!modules&&'Set AI_PANEL_TEST_MODULES to existing Selects node_modules'},async t=>{
 const dependency=createRequire(path.join(path.resolve(modules),'..','package.json')),esbuild=dependency('esbuild');
 const mocks={
  './reel':'export const readReel=async()=>globalThis.__rebuildFixture.reel;export const readSource=async()=>{};export const createReel=async()=>{};',
  './media':'export const mediaGeneration=()=>{globalThis.__rebuildFixture.prepared=(globalThis.__rebuildFixture.prepared||0)+1;return {};};export const ensureSfxLibrary=async()=>({});export const generate=async()=>{throw Error("Paid generation must not run");};',
  './sound':'export const makeMusic=async()=>null;export const mixSound=async()=>({lufs:-14});',
  './stock':'export const stockSearchAvailable=()=>false;export const stockClip=async()=>null;',
  './render':'export const renderDraft=async()=>{};export const makeMattes=async()=>({base:"unused",count:48});',
  './apply':'export const stripReel=async()=>{};export const applyLook=async(...a)=>{globalThis.__rebuildFixture.shots.push(a[5]);};export const importFiles=async()=>[];export const finishReel=async()=>{};',
  '../plan':'export const buildPlan=()=>({notes:[],broll:[],flashes:[]});',
  './faceFrames':'export const probeVideo=async()=>({W:64,H:32,fps:24,timeBase:"1/12288",offset:0,frameS:1/24});export const verifyConstantSourceClock=async()=>{};export const sampleFrames=async function*(path,info,plan){for(let i=0;i<plan.count;i++)yield new Uint8Array(plan.w*plan.h*3).fill(80);};'
 };
 const built=await esbuild.build({entryPoints:[path.join(plugin,'src/pipeline/make.ts')],bundle:true,write:false,platform:'node',format:'cjs',plugins:[{name:'unpaid-disposable-fixtures',setup(b){
  b.onResolve({filter:/^\.\.?\//},a=>mocks[a.path]?{path:a.path,namespace:'fixture'}:undefined);
  b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:mocks[a.path],loader:'ts'}));
 }}]});
 await t.test('make and Rebuild reject a 559 host before native preparation, storage or Draft edits',async()=>{
  const {files,storage}=memory();const oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),oldFixture=Object.getOwnPropertyDescriptor(globalThis,'__rebuildFixture');
  globalThis.window={parent:{__DI__:{FileSystem:storage,Runtime:{getHostingVersion:()=> '2.0.559'}}}};globalThis.__rebuildFixture={prepared:0};
  try{
   const make=load(built.outputFiles[0].text,dependency);
   await assert.rejects(make.makeReel({}, {projectId:'project',sequenceId:'source'}, {seconds:30,hint:''}, ()=>{}),/Selects 2\.0\.560 or later/);
   await assert.rejects(make.rebuildReel({}, 'reel', ()=>{}),/Selects 2\.0\.560 or later/);
   assert.equal(globalThis.__rebuildFixture.prepared,0);assert.equal(files.size,0);
  }finally{for(const [name,previous]of [['window',oldWindow],['__rebuildFixture',oldFixture]]){if(previous)Object.defineProperty(globalThis,name,previous);else delete globalThis[name];}}
 });
 for(const terminal of ['failed','canceled'])await t.test('explicit Rebuild retries only the '+terminal+' clip and reuses successful clips',async()=>{
  const {files,storage}=memory(),dir='/owned/.selects/plugin-data/podcast-hook-captions/reels/reel';
  const oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),oldFixture=Object.getOwnPropertyDescriptor(globalThis,'__rebuildFixture');
  globalThis.window={parent:{__DI__:{FileSystem:storage,Runtime:{getHostingVersion:()=> '2.0.560'}}}};
  const clips=[0,1].map(i=>({clipId:i+7,rid:`11111111-1111-4111-8111-11111111111${i}`,s:i*24,e:(i+1)*24,path:'/owned/source.mp4',srcStart:i,sw:64,sh:32}));
  globalThis.__rebuildFixture={reel:{fps:24,endFrame:48,words:[],clips},shots:[]};
  files.set(dir+'/job.json',JSON.stringify({version:2,projectId:'project',sourceId:'source',reelId:'reel',name:'Reel',picks:{}}));
  const requests=new Map(),submissions=[],statusReads=[];
  const sdk={runScript:async({script})=>{
   if(script.includes('.submit(')){
    const request=JSON.parse(script.match(/\.submit\((.*)\); return/)[1]);submissions.push(request);
    const id='ai:job-'+submissions.length;requests.set(id,request);return {isError:false,result:{workflowId:id}};
   }
   const id=JSON.parse(script.match(/selects\.ai\.job\(("[^"]+"),/)[1]),request=requests.get(id);assert.ok(request);
   if(script.includes('.status()')){statusReads.push(id);return {isError:false,result:{workflowId:id,projectId:'project',status:id==='ai:job-2'?terminal:'succeeded',lastErrorMessage:'Temporary provider setup failure'}};}
   const start=request.sourceRange.startSeconds;
   return {isError:false,result:{contractVersion:1,task:'faces.detect',frameSize:{width:64,height:32},coordinateSpace:'display-pixels',boxFormat:'xyxy',landmarkOrder:['rightEye','leftEye','nose','rightMouth','leftMouth'],parameters:{sourceRange:request.sourceRange,sampleEverySeconds:request.options.sampleEverySeconds,scoreThreshold:.8},total:6,samples:Array.from({length:6},(_,i)=>({index:i*4,sourceTimeSeconds:start+i/6,faces:[{box:{xmin:10,ymin:8,xmax:32,ymax:24},score:.95,landmarks:[{x:14,y:12},{x:26,y:12},{x:20,y:16},{x:16,y:20},{x:24,y:20}]}]}))}};
  }};
  try {
   const make=load(built.outputFiles[0].text,dependency);
   const first=await make.rebuildReel(sdk,'reel',()=>{});assert.equal(first.notes.some(n=>n.includes('shots are centred')),true);assert.equal(submissions.length,2);
   const second=await make.rebuildReel(sdk,'reel',()=>{});assert.equal(second.notes.some(n=>n.includes('Face tracking unavailable')),false);assert.equal(submissions.length,3);
   assert.equal(submissions[2].resourceId,clips[1].rid);assert.notEqual(submissions[2].requestKey,submissions[1].requestKey);assert.deepEqual(statusReads,['ai:job-1','ai:job-2','ai:job-1','ai:job-3']);
   assert.equal(globalThis.__rebuildFixture.shots[1].filter(s=>s.face).length,2);
   await make.rebuildReel(sdk,'reel',()=>{});assert.equal(submissions.length,3);assert.equal(statusReads.length,4);
  } finally {for(const [name,previous]of [['window',oldWindow],['__rebuildFixture',oldFixture]]){if(previous)Object.defineProperty(globalThis,name,previous);else delete globalThis[name];}}
 });
 await t.test('actual cancel bridge ignores a superseded unknown receipt and cancels the current retry',async()=>{
  const compiled=await esbuild.build({entryPoints:[path.join(plugin,'src/pipeline/sharedFaceJobs.ts')],bundle:true,write:false,platform:'node',format:'cjs'});
  const {files,storage}=memory(),dir='/owned/retry-cancel',c=require('../src/pipeline/sharedAiFaces.cjs');
  const old={input:c.faceInput('project','raw-video',{f0:0,f1:24,step:4},24,'old-key'),workflowId:'ai:old',status:'failed'};
  const retry=await c.faceRequestRecord([old],old.input,'legacy',dir,true);retry.status='running';retry.workflowId='ai:retry';
  files.set(dir+'/face-ai-input-legacy-old-key.json',JSON.stringify({version:1,input:old.input}));
  files.set(dir+'/face-ai-jobs.json',JSON.stringify({version:1,records:[retry]}));
  const previous=Object.getOwnPropertyDescriptor(globalThis,'window');globalThis.window={parent:{__DI__:{FileSystem:storage}}};
  const calls=[];
  try {
   const api=load(compiled.outputFiles[0].text,dependency);
   await api.cancelFaceJobs({runScript:async({script})=>{calls.push(script);assert.ok(script.includes('ai:retry'));return {isError:false,result:{workflowId:'ai:retry',projectId:'project',status:'canceled'}};}},dir,'project');
   assert.equal(calls.length,2);assert.ok(calls[0].includes('.cancel()'));assert.ok(calls[1].includes('.status()'));
  } finally {if(previous)Object.defineProperty(globalThis,'window',previous);else delete globalThis.window;}
 });
});
