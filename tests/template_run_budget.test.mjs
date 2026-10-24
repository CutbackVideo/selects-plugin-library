import assert from 'node:assert/strict';
import test from 'node:test';
import {lookPhaseFixture} from './mini_look_fixture.mjs';

test('run budgets: opt-in serialization preserves the original request bytes and default envelope limit',async t=>{
 const f=await lookPhaseFixture(t),box=f.mount(),value={z:'\ud55c\uae00',a:2};
 assert.equal(box.templateRunJSON(value,131072),box.templateRunJSON(value));
 assert.equal(box.templateRunJSON(value),'{"z":"\\ud55c\\uae00","a":2}');
 assert.throws(()=>box.templateRunJSON('x'.repeat(50000)),/limit/);
 assert.equal(box.templateRunJSON('x'.repeat(50000),131072).length,50002);
 for(const limit of [0,NaN,131073,Infinity,1.5])assert.throws(()=>box.templateRunJSON({},limit),/limit/i);
});
test('run budgets: a larger request can recover the same saved Mini Draft while receipts stay small',async t=>{
 const f=await lookPhaseFixture(t),box=f.mount(),config={...f.root.config,padding:'x'.repeat(50000)},run=options=>box.executeTemplateAssembly(f.sdk,f.local.files,f.root.scope,config,f.root.source,()=>true,options);
 await assert.rejects(run(),/limit/);assert.equal(f.commits(),0);
 const first=await run({requestLimit:131072}),second=await run({requestLimit:131072});
 assert.equal(first.sequenceId,second.sequenceId);assert.equal(f.commits(),1);
 assert.ok(f.requests.every(row=>Buffer.byteLength(row.script)<=262144));
});
test('run budgets: continuation storage opts in independently and keeps the same scope identity',async t=>{
 const f=await lookPhaseFixture(t),box=f.mount(),target={pluginId:'mini-vlog',projectId:'p'},open=options=>box.openTemplateAssemblyContinuations(f.sdk,f.local.files,{...target,...options},()=>true),pending={...f.root,retained:'x'.repeat(270000)};
 const ordinary=await open();await assert.rejects(ordinary.store(pending),/limit/);
 const extended=await open({stateLimit:524288,requestLimit:131072}),stored=await extended.store(pending);
 assert.equal(stored.retained,pending.retained);assert.deepEqual(Object.keys(stored.scope).sort(),['libraryId','pluginId','projectId','runId']);
 const restored=await (await open({stateLimit:524288,requestLimit:131072})).read();
 assert.equal(restored.retained,pending.retained);
 await assert.rejects(ordinary.read(),error=>error.code==='TEMPLATE_RUN_INVALID');
 await assert.rejects(open({stateLimit:524289}),/limit/i);
});
