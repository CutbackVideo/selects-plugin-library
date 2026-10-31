'use strict';
// Windows runs every file operation as a separate run_script, and each one carries a large fixed cost. These
// tests pin how many host calls the survey and the job saves make, and that the survey still picks the same
// frames.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const h=require('./survey_harness.cjs');
const modules=process.env.SBS_PANEL_TEST_MODULES;

const GOLDEN={
 samples:[{resourceId:'r',sourceFrames:[300,400,454,455,614,615,617,618,777,1002,1003,1199,2000,2100,2300,2301,2599]}],
 boundaries:[[454,455],[614,615],[617,618],[1002,1003],[2300,2301]].map(([a,b])=>({resourceId:'r',lastOldSourceFrame:a,firstNewSourceFrame:b,kind:'appearance-change-candidate'})),
 images:[
  {name:'source-0-0.jpg',dataUrl:'page:[300,400,454,455,614,615]'},
  {name:'source-0-1.jpg',dataUrl:'page:[617,618,777,1002,1003,1199]'},
  {name:'source-0-2.jpg',dataUrl:'page:[2000,2100,2300,2301,2599]'},
 ],
};

const ROOT='C:\\Users\\u\\.selects\\plugin-data\\shortform-clips';
function rawHost({statusCall=true,taint=false}={}){
 const calls={starts:[],statusScripts:0,statusCalls:0,removeScripts:0,removed:[],ensures:[],reads:[],other:[],scripts:[]};
 const outputs=new Map();let next=0;
 const store={root:ROOT,join:(...p)=>p.join('\\'),ensure:async d=>{calls.ensures.push(d);},
  fs:{readFile:async p=>{calls.reads.push(p);return Buffer.from(JSON.stringify(outputs.get(p)));}}};
 const framesOf=args=>{
  const first=Math.round(Number(args[args.indexOf('-ss')+1])*h.FPS);
  const graph=args[args.indexOf('-filter_complex')+1];
  return [...graph.matchAll(/trim=start_frame=(\d+)/g)].map(m=>first+Number(m[1]));
 };
 const sdk={
  call:async(method,id)=>{
   if(method==='getLocalMediaJobStatus'){calls.statusCalls++;if(!statusCall)throw Error('Unknown method getLocalMediaJobStatus');return {state:'succeeded',events:[],nextCursor:0,truncated:false};}
   throw Error('unexpected call '+method);
  },
  runScript:async({script})=>{
   calls.scripts.push(script);
   const start=/startFFmpeg\(\{\s*args:\s*(\[.*?\])\s*\}\)/s.exec(script);
   if(start){
    const args=JSON.parse(start[1]),output=args[args.length-1],frames=framesOf(args);
    outputs.set(output,frames);calls.starts.push(frames);
    const url='local:///'+output.replace(/\\/g,'/')+'#'+(next++);
    h.installCanvas.current.FakeImage.byUrl.set(url,frames);if(taint)h.installCanvas.current.FakeImage.tainted.add(url);
    return {result:script.includes('localUrl')?{jobId:'j'+next,url}:{jobId:'j'+next}};
   }
   if(/selects\.media\.job\(.*\)\.status\(\)/.test(script)){calls.statusScripts++;return {result:{state:'succeeded'}};}
   if(script.includes('selects.files.remove')){calls.removeScripts++;calls.removed.push(...[...script.matchAll(/survey-[^"\\]*\.jpg/g)].map(m=>m[0]));return {result:null};}
   calls.other.push(script.slice(0,80));return {result:null};
  },
 };
 return {sdk,store,calls,outputs};
}

function setup(){
 return h.loadPanel(['prepareSourceSurvey','sdkFiles','throttledSave','removeSurveyCaptures']).exports;
}
function withCanvas(fn){return async()=>{const c=h.installCanvas();h.installCanvas.current=c;try{await fn(c);}finally{c.restore();h.installCanvas.current=null;}};}
const rawScenario=()=>{const s=h.scenario();s.before.sources[0].path='F:\\episode.mp4';return s;};
const survey=(m,sdk,store,projectId,s=rawScenario())=>m.prepareSourceSurvey({sdk,guard:p=>p,projectId,before:s.before,catalog:s.catalog,note:()=>{},store});

test('shortform survey and saves on hosts where file access is costly',{skip:!modules},async t=>{
 const m=setup();

 await t.test('sequence-frame survey picks the same frames in fewer batches',withCanvas(async()=>{
  const calls=[];const {before,catalog}=h.scenario();
  const r=await m.prepareSourceSurvey({sdk:h.visualSdk(calls),guard:p=>p,projectId:'visual',before,catalog,note:()=>{}});
  assert.deepEqual(h.summarize(r),GOLDEN);
  assert.ok(calls.every(c=>c.length<=12));
  assert.ok(calls.length<=15,`expected at most 15 batches, got ${calls.length}`);
 }));

 await t.test('raw source survey: one host script per batch, status by call, pixels by local URL, one cleanup',withCanvas(async()=>{
  const host=rawHost();
  const r=await survey(m,host.sdk,host.store,'raw');
  assert.deepEqual(h.summarize(r),GOLDEN);
  assert.ok(host.calls.starts.every(f=>f.length<=24));
  // 105 coarse and chosen frames, then 71 refinement frames, in batches of at most 24 frames within 12 seconds.
  assert.equal(host.calls.starts.length,9);
  assert.equal(host.calls.statusScripts,0);assert.ok(host.calls.statusCalls>=host.calls.starts.length);
  assert.deepEqual(host.calls.reads,[]);
  assert.equal(host.calls.removeScripts,1);
  assert.deepEqual([...new Set(host.calls.removed)].sort(),[...host.outputs.keys()].map(p=>p.split('\\').pop()).sort());
  assert.ok(host.calls.ensures.length<=1);
 }));

 await t.test('raw source survey falls back to script polling on hosts without the status call',withCanvas(async()=>{
  const host=rawHost({statusCall:false});
  const r=await survey(m,host.sdk,host.store,'raw-old-host');
  assert.deepEqual(h.summarize(r),GOLDEN);
  assert.ok(host.calls.statusScripts>=host.calls.starts.length);
 }));

 await t.test('raw source survey reads the bytes when local pixels cannot be used',withCanvas(async()=>{
  const host=rawHost({taint:true});
  const r=await survey(m,host.sdk,host.store,'raw-tainted');
  assert.deepEqual(h.summarize(r),GOLDEN);
  assert.equal(host.calls.reads.length,host.calls.starts.length);
  assert.equal(host.calls.removeScripts,1);
 }));

 await t.test('retrying the same clip reuses its survey',withCanvas(async()=>{
  const host=rawHost();
  const first=await survey(m,host.sdk,host.store,'retry');
  const starts=host.calls.starts.length;
  const second=await survey(m,host.sdk,host.store,'retry');
  assert.equal(host.calls.starts.length,starts);
  assert.deepEqual(h.summarize(second),h.summarize(first));
  const other=rawScenario();other.catalog=[...other.catalog,{id:'F4',resourceId:'r',sourceFrame:1100}];
  await survey(m,host.sdk,host.store,'retry',other);
  assert.ok(host.calls.starts.length>starts,'a different face catalog is a different survey');
 }));

 await t.test('cleanup touches only this survey, regardless of unrelated captures',async()=>{
  const {esbuild}=h.loadPanel([]),removed=[];
  const own=[ROOT+'\\frames\\survey-own-a.jpg',ROOT+'\\frames\\survey-own-b.jpg'];
  const sdk={runScript:async({script})=>{
   const code=esbuild.transformSync('return (async()=>{'+script+'})();',{loader:'ts'}).code;
   await new Function('selects',code)({files:{
    stat:async()=>{throw Error('cleanup must not stat the shared directory');},
    readdir:async()=>{throw Error('cleanup must not enumerate old captures');},
    remove:async(p,options)=>{assert.ok(own.includes(p));assert.equal(options.force,true);removed.push(p);if(p===own[0])throw Error('already gone');},
   }});
   return {result:null};
  }};
  await m.removeSurveyCaptures(sdk,[...own,own[0]]);
  assert.deepEqual(removed,own,'a missing capture does not prevent other owned captures being removed');
 });

 await t.test('a 340 KB save takes three host scripts that each fit the script cap',async()=>{
  const scripts=[],files=new Map();
  const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild');
  const run=(code,selects)=>new Function('selects',esbuild.transformSync('return (async()=>{'+code+'})();',{loader:'ts'}).code)(selects);
  const selects={files:{
   environment:async()=>({platform:'win32',homedir:'C:\\Users\\u'}),
   mkdir:async()=>{},
   writeChunk:async({path:p,offset,base64})=>{const b=Buffer.from(base64,'base64');assert.ok(b.length<=49152);const old=files.get(p)||Buffer.alloc(0);assert.equal(offset,old.length);files.set(p,Buffer.concat([old,b]));return {bytesWritten:b.length};},
   rename:async(a,b)=>{files.set(b,files.get(a));files.delete(a);},
   stat:async()=>null,remove:async()=>{},
  }};
  const backend=await m.sdkFiles({runScript:async({script})=>{scripts.push(script);return {result:await run(script,selects)};}});
  scripts.length=0;
  const bytes=Uint8Array.from({length:340*1024},(_,i)=>(i*7)%256);
  await backend.write('C:\\jobs\\a.json',bytes);
  assert.equal(scripts.length,3);
  assert.ok(scripts.every(s=>Buffer.byteLength(s)<256*1024));
  assert.equal(scripts.filter(s=>s.includes('selects.files.rename')).length,1);
  assert.deepEqual(new Uint8Array(files.get('C:\\jobs\\a.json')),bytes);
  scripts.length=0;
  await backend.write('C:\\jobs\\empty.json',new Uint8Array(0));
  assert.equal(scripts.length,1);assert.equal(files.get('C:\\jobs\\empty.json').length,0);
 });

 await t.test('new host scripts pass the script type check',withCanvas(async()=>{
  const host=rawHost({statusCall:false});
  await survey(m,host.sdk,host.store,'types');
  const pick=re=>host.calls.scripts.find(s=>re.test(s));
  const scripts=[
   {name:'start capture',script:pick(/localUrl/)},
   {name:'job status',script:pick(/\.status\(\)/)},
   {name:'remove captures',script:pick(/selects\.files\.remove/)},
  ];
  const saved=[];
  const backend=await m.sdkFiles({runScript:async({script})=>{saved.push(script);return {result:script.includes('environment')?{platform:'win32',home:'C:\\Users\\u'}:98304};}});
  await backend.write('C:\\jobs\\a.json',new Uint8Array(98304)).catch(()=>{});
  scripts.push({name:'save pieces',script:saved.find(s=>s.includes('writeChunk'))});
  assert.ok(scripts.every(s=>typeof s.script==='string'),'every script kind was generated');
  process.env.SELECTS_TSC??=path.join(modules,'typescript/bin/tsc');
  const {checkScriptTypes}=await import(path.join(__dirname,'../../../tests/run_script_types.mjs'));
  assert.equal(checkScriptTypes(scripts).scripts,4);
 }));

 await t.test('progress saves at most once per window',async()=>{
  let saves=0;const errors=[];
  const saver=m.throttledSave(async()=>{saves++;},30,e=>errors.push(e));
  for(let i=0;i<20;i++)saver.soon();
  assert.equal(saves,0);
  await new Promise(r=>setTimeout(r,60));
  assert.equal(saves,1);
  saver.soon();saver.cancel();
  await new Promise(r=>setTimeout(r,60));
  assert.equal(saves,1);
  const failing=m.throttledSave(async()=>{throw Error('disk');},5,e=>errors.push(e));
  failing.soon();await new Promise(r=>setTimeout(r,30));
  assert.equal(errors.length,1);
 });

 await t.test('saves made while one is writing share a single write of the newest state',async()=>{
  const src=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
  const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild');
  const start=src.indexOf('    let saveQueue:');
  const code=esbuild.transformSync(src.slice(start,src.indexOf('    try {\n      const list',start)),{loader:'ts'}).code;
  const writes=[],release=[];
  const env={clone:structuredClone,setRunInfo:()=>{},saveJob:s=>new Promise((resolve,reject)=>{writes.push(s);release.push({resolve,reject});}),resultProject:{current:'other'}};
  const persist=new Function(...Object.keys(env),'let job={id:"j",projectId:"p"};'+code+'return persist;')(...Object.values(env));
  const first=persist({n:1}),second=persist({n:2}),third=persist({n:3}),fourth=persist({n:4});
  await new Promise(r=>setImmediate(r));
  assert.equal(writes.length,1);assert.equal(writes[0].n,1);
  release[0].resolve();await first;
  await new Promise(r=>setImmediate(r));
  assert.equal(writes.length,2);assert.equal(writes[1].n,4);
  release[1].resolve();await Promise.all([second,third,fourth]);
  const fifth=persist({n:5});await new Promise(r=>setImmediate(r));
  assert.equal(writes.length,3);release[2].reject(Error('disk full'));
  await assert.rejects(fifth,/disk full/);
  const sixth=persist({n:6});await new Promise(r=>setImmediate(r));
  assert.equal(writes.length,4);release[3].resolve();await sixth;
 });
});
