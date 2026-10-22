import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {archiveMusicFixture} from './archive_music_fixture.mjs';
import {clipAnalysisFixture} from './clip_analysis_fixture.mjs';
import {hash,replaceSameFacts} from './gallery_hold_fixture.mjs';
import {topLevel} from './windows_host.mjs';
const require=createRequire(import.meta.url),esbuild=require(process.env.SELECTS_ESBUILD||process.env.SBS_PANEL_TEST_MODULES+'/esbuild');
const panel=fs.readFileSync(new URL('../plugins/archive-vlog/panel.tsx',import.meta.url),'utf8'),plain=esbuild.transformSync(panel,{loader:'tsx',format:'esm',jsx:'preserve'}).code,nested=plain.replace(/^  /gm,'');
const block=panel.slice(panel.indexOf('// quick-score:start'),panel.indexOf('// quick-score:end'));
async function scoring(t){
 const f=await clipAnalysisFixture(t);
 vm.runInContext(block+'\nthis.archive={quickScore,quickScoreAll,analyse:typeof analyseArchiveClips==="function"?analyseArchiveClips:null};',f.box);
 f.box.panelLocalClient=()=>f.local;f.box.AV_LOCAL_BUDGET_MS=25000;f.box.AV_LOCAL_CONCURRENCY=3;
 const io={join:f.local.files.join,mkdir:p=>f.local.files.mkdir(p,{recursive:true}),readBytes:p=>f.local.files.readFile(p),readText:async p=>new TextDecoder().decode(await f.local.files.readFile(p)),writeText:(p,s)=>f.local.files.writeFile(p,s),remove:p=>f.local.files.remove(p,{force:true}),mtimeMs:async p=>(await f.local.files.stat(p)).mtimeMs,runFFmpeg:(args,signal)=>f.local.media.runFFmpeg(args,true,signal)};
 return {...f,score:opts=>f.box.archive.quickScore(f.input,{io,client:f.local,dataDir:f.data,...opts}),analyse:(resources,opts)=>f.box.archive.analyse({},resources,f.data,opts)};
}
test('Archive scorer: unchanged source reuses confirmed persistent scores',async t=>{
 const f=await scoring(t),a=await f.score(),b=await f.score();assert.equal(a.fallback,false);assert.equal(b.cached,true);assert.equal(f.decodes(),1);assert.deepEqual(JSON.parse(JSON.stringify(a.windows)),JSON.parse(JSON.stringify(b.windows)));
});
test('Archive scorer: same-size/time/duration replacement cannot return old scores',async t=>{
 const f=await scoring(t),a=await f.score(),before=hash(f.source);replaceSameFacts(f.source,f.other);assert.notEqual(hash(f.source),before);
 const b=await f.score();assert.equal(b.cached,false);assert.notEqual(b.windows[0].luma,a.windows[0].luma);assert.equal(f.decodes(),2);
});
test('Archive scorer: replacement during decoding cannot publish a successful result',async t=>{
 const f=await scoring(t);f.hooks.beforeTool=()=>replaceSameFacts(f.source,f.other);await assert.rejects(f.score(),e=>/CHANGED|SOURCE/.test(e.code));
});
test('Archive scorer: a missing original is never an ordinary decoder fallback',async t=>{
 const f=await scoring(t);fs.unlinkSync(f.source);await assert.rejects(f.score(),e=>/SOURCE/.test(e.code));assert.equal(f.decodes(),0);
});
test('Archive scorer: ordinary decoder failure stays uncached and retries with confirmed bytes',async t=>{
 const f=await scoring(t);f.hooks.beforeTool=()=>{throw Error('known decode failure');};assert.equal((await f.score()).fallback,true);f.hooks.beforeTool=null;assert.equal((await f.score()).fallback,false);assert.equal(f.decodes(),2);
});
test('Archive adapter: 257 declared standalone videos use bounded batches without dropping a source',async t=>{
 const f=await scoring(t),calls=[];assert.equal(typeof f.box.archive.analyse,'function');
 const observation={path:f.source,size:fs.statSync(f.source).size,sha256:hash(f.source)};
 f.box.quickScoreAll=async(resources,opts)=>{calls.push({resources,opts});return new Map(resources.map(r=>[r.rid,{rid:r.rid,sourceObservation:observation}]));};
 const inputs=Array.from({length:257},(_,i)=>({rid:'r'+i,path:f.source,duration:4}));
 const scores=await f.analyse(inputs,{budgetMs:1000,isCurrent:()=>true});assert.equal(scores.length,257);assert.deepEqual([...scores].map(r=>r.rid),inputs.map(r=>r.rid));assert.deepEqual(calls.map(c=>c.resources.length),[256,1]);assert.equal(calls[0].opts.deadline,calls[1].opts.deadline);assert.equal(calls[0].opts.client,f.local);
});
test('Archive adapter: invalid records stop before any cache reservation',async t=>{
 const f=await scoring(t);await assert.rejects(f.analyse([null],{}),e=>e.code==='CLIP_ANALYSIS_INPUT');assert.equal(f.writes.length,0);
});
test('Archive adapter: expected source facts are captured before the caller can mutate them',async t=>{
 const f=await scoring(t),expected=[{path:f.source,size:fs.statSync(f.source).size,sha256:hash(f.source)}],before=expected[0].sha256;
 f.hooks.beforeTool=()=>{expected[0].sha256='f'.repeat(64);};
 const result=await f.analyse([{rid:'r0',path:f.source,duration:4}],{expectedSources:expected});assert.equal(result[0].sourceObservation.sha256,before);
});
async function caller(t,{analysed=false}={}){
 const f=await archiveMusicFixture(t,{entry:'panel',silent:true});
 for(const [file,color] of [[f.source,'red'],[f.other,'blue']])execFileSync('ffmpeg',['-nostdin','-v','error','-y','-f','lavfi','-i','color=c='+color+':size=128x96:rate=30:duration=4','-an','-c:v','libx264','-pix_fmt','yuv420p',file]);
 const bytes=[f.source,f.other].map(p=>fs.readFileSync(p)),length=Math.max(...bytes.map(b=>b.length))+128;
 [f.source,f.other].forEach((p,i)=>{fs.writeFileSync(p,Buffer.concat([bytes[i],Buffer.alloc(length-bytes[i].length)]));fs.utimesSync(p,946684800,946684800);});
 f.inventory.resources=[{rid:'r0',path:f.source,duration:4,analysed},{rid:'r1',path:f.other,duration:4,analysed}];
 const planned=[],searched=[];f.box.panelLocalClient=()=>f.local;f.box.hostSdk=f.local;f.box.localAbortRef={current:null};f.box.AV_LOCAL_CONCURRENCY=3;f.box.AV_LOCAL_BUDGET_MS=25000;f.box.candidates=null;f.box.setCandidates=value=>{f.box.candidates=value;};
 vm.runInContext(block+'\n'+topLevel(nested,'scoreLocal'),f.box);
 f.box.findCandidates=async rids=>{searched.push([...rids]);return {list:rids.map(rid=>({rid,role:'opening',t:1,score:.8,content:hash(f.inventory.resources.find(r=>r.rid===rid).path)})),failed:[]};};
 f.box.avShotCandidates=(hits,local)=>local.length?local.map(s=>({rid:s.rid,luma:s.windows[0].luma})):hits;
 f.box.avPlanBuild=options=>{planned.push(options.candidates.map(c=>({...c})));f.hooks.beforePlan?.();return f.plan;};
 const run=async()=>{f.box.assemblyPendingRef.current={};return f.run();};
 return {...f,run,planned,searched,decodes:()=>f.calls.filter(c=>c.args.includes('-vf')).length};
}
test('Archive Build: local memory cannot conceal a changed original between builds',async t=>{
 const f=await caller(t);await f.run();assert.equal(f.saved.length,1,JSON.stringify(f.errors));replaceSameFacts(f.source,f.other);await f.run();assert.equal(f.saved.length,2,JSON.stringify(f.errors));assert.notEqual(f.planned[1][0].luma,f.planned[0][0].luma);assert.equal(f.decodes(),3);
});
test('Archive Build: unchanged local sources reuse disk scores on the next explicit build',async t=>{
 const f=await caller(t);await f.run();await f.run();assert.equal(f.saved.length,2,JSON.stringify(f.errors));assert.equal(f.decodes(),2);assert.deepEqual(f.planned[1],f.planned[0]);
});
test('Archive Build: scene memory is bound to current original contents',async t=>{
 const f=await caller(t,{analysed:true});await f.run();replaceSameFacts(f.source,f.other);await f.run();assert.equal(f.saved.length,2,JSON.stringify(f.errors));assert.equal(f.searched.length,2);assert.notEqual(f.planned[1][0].content,f.planned[0][0].content);
});
test('Archive Build: unchanged scene inputs reuse the previous search',async t=>{
 const f=await caller(t,{analysed:true});await f.run();await f.run();assert.equal(f.saved.length,2);assert.equal(f.searched.length,1);
});
test('Archive Build: source duration metadata also invalidates cached scene inputs',async t=>{
 const f=await caller(t,{analysed:true});await f.run();f.inventory.resources[0].duration=3;await f.run();assert.equal(f.saved.length,2,JSON.stringify(f.errors));assert.equal(f.searched.length,2);
});
test('Archive Build: original replacement after scoring stops before assembly',async t=>{
 const f=await caller(t);f.hooks.beforePlan=()=>replaceSameFacts(f.source,f.other);await f.run();assert.equal(f.saved.length,0);
});
test('Archive Build: failed scene search waits for owned local cleanup before ending',async t=>{
 const f=await caller(t);let release,started;const begun=new Promise(r=>started=r),cleanup=new Promise(r=>release=r);f.inventory.resources[0].analysed=true;
 f.box.findCandidates=async()=>{await begun;throw Error('controlled scene failure');};
 f.box.scoreLocal=async()=>{f.box.localAbortRef.current=new AbortController();started();await cleanup;return [];};
 let settled=false;const work=f.run().finally(()=>{settled=true;});
 try{await Promise.race([begun,work.then(()=>{throw Error('Build settled before its controlled local analysis started.');})]);await new Promise(r=>setTimeout(r,20));assert.equal(settled,false,'busy must remain until sibling cleanup settles');}finally{release();await work;}
});
