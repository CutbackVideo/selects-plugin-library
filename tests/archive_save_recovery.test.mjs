import assert from 'node:assert/strict';
import test from 'node:test';
import {archiveWorkflowFixture as fixture} from './archive_workflow_fixture.mjs';

// Retains the original two actual-Build counterexamples, now exercising the
// real durable owner, actual generated operations and disposable file records.
// Project/save transport is controlled; no real app Project is created.
test('Archive save: a lost assembly reply cannot adopt an unrelated same-name Draft',async t=>{
 const f=await fixture(t);f.saved.get('unrelated').name='Archive fixture';const original=JSON.stringify(f.saved.get('unrelated'));
 let release,entered;const hold=new Promise(resolve=>release=resolve),committing=new Promise(resolve=>entered=resolve);f.hooks.commit=(_id,reason)=>{if(/assemble/.test(reason)){entered();return hold;}};f.hooks.lostAssembly=true;
 try{
  await f.build();await Promise.race([committing,Promise.all(f.pending)]);assert.equal(f.commits(),1);assert.equal(f.result(),null);
  assert.equal(f.requests.filter(r=>r.summary==='Decorate template with owned receipt').length,0);
  assert.equal(JSON.stringify(f.saved.get('unrelated')),original);
 }finally{release();await Promise.all(f.pending);}
});
test('Archive save: another Build click confirms the same unknown request without resending',async t=>{
 const f=await fixture(t);let release,entered;const hold=new Promise(resolve=>release=resolve),committing=new Promise(resolve=>entered=resolve);f.hooks.commit=(_id,reason)=>{if(/assemble/.test(reason)){entered();return hold;}};f.hooks.lostAssembly=true;
 try{
  await f.build();await Promise.race([committing,Promise.all(f.pending)]);f.ui.box.inventory=null;f.ui.box.assets=null;await f.build(99);
  assert.equal(f.requests.filter(r=>r.summary==='Assemble template with owned receipt').length,1);assert.equal(f.commits(),1);assert.equal(f.result(),null);
 }finally{release();await Promise.all(f.pending);}
 f.hooks.lostAssembly=false;await f.build(100);assert.equal(f.result()?.decorated,true);assert.equal(f.result().frozen.seed,1);assert.equal(f.commits(),2);
});
test('Archive save control: one returned assembly reaches its own confirmed Finish',async t=>{
 const f=await fixture(t);await f.build();assert.equal(f.result()?.sequenceId,'d1');assert.equal(f.result().decorated,true);assert.equal(f.commits(),2);assert.equal(f.requests.filter(r=>r.summary==='Assemble template with owned receipt'||r.summary==='Decorate template with owned receipt').length,2);assert.equal(await(await f.open()).read(),null);
});
test('Archive save: real bundled title/fonts/effects fit the frozen request and saved-state protocol',async t=>{
 const f=await fixture(t,{realFinish:true});await f.build();assert.equal(f.result()?.decorated,true,JSON.stringify(f.ui.errors));assert.equal(f.commits(),2);assert.ok(f.requests.every(r=>Buffer.byteLength(r.script)<262144));
 const saved=f.saved.get(f.result().sequenceId),graphic=saved.clips.find(row=>row._graphic?.name==='Archive title');assert.equal(graphic._graphic.program.parameters.title,'SATURDAY');assert.ok(graphic._graphic.program.parameters.fonts.length>0);
});
