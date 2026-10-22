import test from 'node:test';
import assert from 'node:assert/strict';
import {miniMusicFixture} from './mini_music_fixture.mjs';

test('Mini remount: Build finds the original durable attempt before planning or importing',async t=>{
 const f=await miniMusicFixture(t,{entry:'panel',silent:true}),calls=[];
 const original={scope:{pluginId:'mini-vlog',libraryId:'library',projectId:'p',runId:'original-run'},config:{projectId:'p'},source:'original',frozen:{pid:'p',seed:7},photoSizes:{},plan:{shots:2},fitted:2,unchecked:0,quickUnavailable:false};
 f.box.assemblyPendingRef.current={};
 Object.assign(f.box,{openAssemblyContinuations:async()=>({read:async()=>{calls.push('discover');return original;},run:async pending=>{calls.push('confirm');assert.equal(pending,original);return {sequenceId:'owned-before-close',totalFrames:60,fps:30,notes:[]};}}),decorate:async res=>calls.push(['decorate',res.sequenceId,res.frozen.seed])});
 await f.box.api.build(99);
 assert.deepEqual(calls,['discover','confirm',['decorate','owned-before-close',7]]);
 assert.equal(f.saved.length,0,'no new assembly dispatch');assert.equal(f.imports.length,0,'no new music import');
});

import fs from 'node:fs';import fsp from 'node:fs/promises';import path from 'node:path';import vm from 'node:vm';import {webcrypto} from 'node:crypto';
import {holdFixture} from './gallery_hold_fixture.mjs';
const source=fs.readFileSync(new URL('../shared/template-run.js',import.meta.url),'utf8');
async function fixture(t){
 const f=await holdFixture(t),calls=[],hooks=f.hooks;f.files.readdir=p=>fsp.readdir(p);
 const sdk={call:async()=>({owner:{projectId:'p',libraryId:hooks.library??'library'}})};
 const pending={scope:{pluginId:'mini-vlog',projectId:'p',runId:'run-original'},config:{projectId:'p',draftName:'Original',picks:[{rid:'r0'}]},source:'// @template-assembly 1\nconst cfg=__CONFIG__; return {};',frozen:{pid:'p',seed:7},plan:{picks:[{rid:'r0'}]}};
 const mount=async()=>{
  const box=vm.createContext({crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array});
  vm.runInContext(source+'\nthis.open=openTemplateAssemblyContinuations;',box);
  box.executeTemplateAssembly=async(_sdk,_files,scope,config,_source,current)=>{calls.push({scope,config});current();if(hooks.run)await hooks.run();return {sequenceId:'owned',totalFrames:30,fps:30,assemblyConfirmed:true};};
  return box.open(sdk,f.local.files,{pluginId:'mini-vlog',projectId:'p'},()=>hooks.live!==false);
 };
 return {...f,pending,mount,calls,hooks};
}
test('assembly continuation: fresh realm finds frozen inputs and clears only after confirmation',async t=>{
 const f=await fixture(t),a=await f.mount();await a.store(f.pending);f.pending.frozen.seed=99;
 const b=await f.mount(),p=await b.read();assert.equal(p.frozen.seed,7);const result=await b.run(p);assert.equal(result.sequenceId,'owned');assert.equal(f.calls.length,1);assert.equal(await (await f.mount()).read(),null);
});
test('assembly continuation: unknown save remains discoverable without advancing to a new run',async t=>{
 const f=await fixture(t),a=await f.mount();f.hooks.run=()=>{throw Object.assign(Error('pending'),{code:'TEMPLATE_RUN_PENDING'});};
 await assert.rejects(a.run(f.pending),e=>e.code==='TEMPLATE_RUN_PENDING');assert.equal((await (await f.mount()).read()).scope.runId,'run-original');
});
test('assembly continuation: a proven no-save clears the index and preserves the error',async t=>{
 const f=await fixture(t),a=await f.mount();const error=Object.assign(Error('not saved'),{code:'TEMPLATE_RUN_NOT_SAVED'});f.hooks.run=()=>{throw error;};
 await assert.rejects(a.run(f.pending),e=>e===error);assert.equal(await (await f.mount()).read(),null);
});
test('assembly continuation: different libraries cannot see or reuse another library attempt',async t=>{
 const f=await fixture(t),a=await f.mount();await a.store(f.pending);f.hooks.library='other';const b=await f.mount();assert.equal(await b.read(),null);await assert.rejects(a.read(),e=>e.code==='TEMPLATE_RUN_TARGET');
});
test('assembly continuation: more than one unresolved attempt is explicit and causes no authoring',async t=>{
 const f=await fixture(t),a=await f.mount();await a.store(f.pending);await a.store({...f.pending,scope:{...f.pending.scope,runId:'second'}});await assert.rejects((await f.mount()).read(),e=>e.code==='TEMPLATE_RUN_AMBIGUOUS');assert.equal(f.calls.length,0);
});
test('assembly continuation: immutable run identity rejects changed inputs before authoring',async t=>{
 const f=await fixture(t),a=await f.mount();await a.store(f.pending);f.pending.config.picks=[{rid:'different'}];await assert.rejects(a.run(f.pending),e=>e.code==='TEMPLATE_RUN_INVALID');assert.equal(f.calls.length,0);
});
test('assembly continuation: large payload uses chunked publication while its claim stays within 48 KiB',async t=>{
 const f=await fixture(t),a=await f.mount();f.pending.extra='x'.repeat(60000);await a.store(f.pending);assert.equal((await (await f.mount()).read()).extra.length,60000);assert.ok(f.writes.length>=3);
});
test('assembly continuation: persistence failure prevents authoring',async t=>{
 const f=await fixture(t),a=await f.mount();f.hooks.beforeWrite=()=>{throw Error('disk unavailable');};await assert.rejects(a.run(f.pending),/disk unavailable|record|store/i);assert.equal(f.calls.length,0);
});
test('assembly continuation: completion tombstone prevents stale callbacks from republishing a completed run',async t=>{
 const f=await fixture(t),a=await f.mount(),b=await f.mount();await a.run(f.pending);await assert.rejects(b.store(f.pending),e=>e.code==='TEMPLATE_RUN_COMPLETED');assert.equal(await a.read(),null);assert.equal(f.calls.length,1);
});
test('assembly continuation: corrupt payload or a late caller fails before dispatch',async t=>{
 const f=await fixture(t),a=await f.mount();await a.store(f.pending);const files=fs.readdirSync(f.root,{recursive:true}).filter(p=>p.endsWith('.data'));assert.equal(files.length,1);fs.appendFileSync(path.join(f.root,files[0]),' ');await assert.rejects(a.read(),e=>e.code==='TEMPLATE_RUN_INVALID');f.hooks.live=false;await assert.rejects(a.run(f.pending),e=>e.code==='TEMPLATE_RUN_DETACHED');assert.equal(f.calls.length,0);
});
for(const kind of ['nonfinite','source','budget'])test('assembly continuation: invalid '+kind+' payload cannot leave a blocking manifest or dispatch',async t=>{
 const f=await fixture(t),log=await f.mount();if(kind==='nonfinite')f.pending.extra=NaN;else if(kind==='source')f.pending.source='return 1';else f.pending.extra='x'.repeat(262145);
 await assert.rejects(log.run(f.pending),e=>e.code==='TEMPLATE_RUN_INVALID');assert.equal(f.writes.length,0);assert.equal(f.calls.length,0);assert.equal(await log.read(),null);
});
