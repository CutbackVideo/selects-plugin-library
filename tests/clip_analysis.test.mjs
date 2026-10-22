import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import test from 'node:test';
import {clipAnalysisFixture as fixture} from './clip_analysis_fixture.mjs';import {replaceSameFacts} from './gallery_hold_fixture.mjs';
const privateFiles=f=>fs.existsSync(f.data)?fs.readdirSync(f.data,{recursive:true}).filter(p=>/\.(?:source|output|media)-/.test(p)):[];
test('clip analysis: same bytes reuse one confirmed source-bound score',async t=>{const f=await fixture(t),a=await f.score(),b=await f.score();assert.equal(a.fallback,false);assert.equal(b.cached,true);assert.deepEqual(JSON.parse(JSON.stringify(a.windows)),JSON.parse(JSON.stringify(b.windows)));assert.equal(f.decodes(),1);assert.deepEqual(privateFiles(f),[]);});
test('clip analysis: same-size same-mtime replacement invalidates the disk cache',async t=>{const f=await fixture(t),a=await f.score();replaceSameFacts(f.source,f.other);const b=await f.score();assert.equal(b.cached,false);assert.notEqual(b.windows[0].luma,a.windows[0].luma);assert.equal(f.decodes(),2);assert.deepEqual(privateFiles(f),[]);});
test('clip analysis: another source replacing the original during decode is refused and staging is cleaned',async t=>{const f=await fixture(t);f.hooks.beforeTool=()=>replaceSameFacts(f.source,f.other);await assert.rejects(f.score(),e=>/CHANGED|SOURCE/.test(e.code));assert.deepEqual(privateFiles(f),[]);assert.equal(fs.readdirSync(f.data,{recursive:true}).filter(p=>p.includes('/index/')&&p.endsWith('.json')).length,0);});
test('clip analysis: cancellation waits for media settlement and staging cleanup',async t=>{const f=await fixture(t),c=new AbortController();f.hooks.beforeTool=()=>c.abort();await assert.rejects(f.score({signal:c.signal}),e=>e.code==='CLIP_ANALYSIS_STOPPED'||e.code==='BUNDLED_ASSET_STOPPED');assert.deepEqual(privateFiles(f),[]);});
test('clip analysis: corrupted cached score objects are regenerated without deleting old published objects',async t=>{const f=await fixture(t);await f.score();const objects=fs.readdirSync(f.data,{recursive:true}).filter(p=>p.includes('objects/')&&p.endsWith('.json'));assert.equal(objects.length,1);const old=path.join(f.data,objects[0]);fs.writeFileSync(old,'{}');const next=await f.score();assert.equal(next.cached,false);assert.equal(f.decodes(),2);assert.ok(fs.existsSync(old));assert.deepEqual(privateFiles(f),[]);});
for(const options of [{windows:4},{windows:[{start:NaN,end:1}]},{fps:NaN},{budgetMs:-1}])test('clip analysis: invalid scoped input cannot create cache files '+JSON.stringify(options),async t=>{const f=await fixture(t);await assert.rejects(f.score(options));assert.equal(f.writes.length,0);});
test('clip analysis: a missing original never becomes a decoder fallback',async t=>{const f=await fixture(t);fs.unlinkSync(f.source);await assert.rejects(f.score(),e=>/SOURCE/.test(e.code));assert.equal(f.writes.length,0);});

test('clip analysis: decoder failure remains uncached and the next healthy attempt analyses again',async t=>{
 const f=await fixture(t);f.hooks.beforeTool=()=>{throw Error('controlled decoder failure');};const a=await f.score();assert.equal(a.fallback,true);assert.deepEqual(privateFiles(f),[]);assert.equal(fs.readdirSync(f.data,{recursive:true}).filter(p=>p.includes('/index/')&&p.endsWith('.json')).length,0);
 f.hooks.beforeTool=null;const b=await f.score();assert.equal(b.fallback,false);assert.equal(b.cached,false);assert.equal(f.decodes(),2);
});
test('clip analysis: a source replaced during a cache-hit read cannot return the old score',async t=>{
 const f=await fixture(t);await f.score();let replaced=false;f.hooks.beforeRead=p=>{if(!replaced&&p.includes('/objects/')){replaced=true;replaceSameFacts(f.source,f.other);}};
 await assert.rejects(f.score(),e=>/CHANGED/.test(e.code));assert.equal(f.decodes(),1);assert.deepEqual(privateFiles(f),[]);
});
test('clip analysis: private source cleanup failure is terminal even after successful result publication',async t=>{
 const f=await fixture(t),remove=f.files.remove;f.files.remove=async(p,o)=>{if(path.basename(p).startsWith('.source-'))throw Error('controlled cleanup failure');return remove(p,o);};
 await assert.rejects(f.score(),e=>e.code==='BUNDLED_ASSET_CLEANUP'&&e.terminal===true);assert.equal(f.decodes(),1);
});
test('clip analysis: captured input and client survive caller mutation during decoding',async t=>{
 const f=await fixture(t),opts={client:f.local,dataDir:f.data},original=f.input.path;f.hooks.beforeTool=()=>{f.input.path=f.other;f.input.durationSeconds=1;opts.client={};};
 const result=await f.box.api.quickScore(f.input,opts);assert.equal(result.duration,4);assert.equal(result.sourceObservation.path,original);assert.equal(f.decodes(),1);assert.deepEqual(privateFiles(f),[]);
});
for(const opts of [{concurrency:0},{concurrency:4},{concurrency:1.5},{budgetMs:NaN}])test('clip analysis batch: invalid ownership limits cannot reserve files '+JSON.stringify(opts),async t=>{
 const f=await fixture(t);await assert.rejects(f.scoreAll(undefined,opts),e=>e.code==='CLIP_ANALYSIS_INPUT');assert.equal(f.writes.length,0);
});
test('clip analysis batch: failed source aborts its sibling and waits for decoder and cleanup settlement',async t=>{
 const f=await fixture(t);let reached;const started=new Promise(r=>reached=r);f.files.fingerprint=async p=>{if(p===f.other){await started;return null;}const b=fs.readFileSync(p);return {size:b.length,sha256:(await import('node:crypto')).createHash('sha256').update(b).digest('hex')};};
 let settled=false;f.hooks.beforeTool=async(_bin,_args,signal)=>{reached();await new Promise(resolve=>signal.aborted?resolve():signal.addEventListener('abort',resolve,{once:true}));settled=true;};
 await assert.rejects(f.scoreAll([f.input,{rid:'r1',path:f.other,durationSeconds:4}],{concurrency:2}),e=>/SOURCE/.test(e.code));assert.equal(settled,true);assert.deepEqual(privateFiles(f),[]);
});

for(const opts of [{dataDir:'bad\0directory'},{onProgress:3}])test('clip analysis: invalid path or callback is rejected before any source request '+JSON.stringify(opts),async t=>{
 const f=await fixture(t);let reads=0;f.hooks.beforeFingerprint=()=>reads++;
 await assert.rejects(f.scoreAll(undefined,opts),e=>e.code==='CLIP_ANALYSIS_INPUT');assert.equal(reads,0);assert.equal(f.writes.length,0);
});
