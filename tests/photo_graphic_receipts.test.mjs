import assert from 'node:assert/strict';
import test from 'node:test';
import {fixture} from './photo_authoring_fixture.mjs';
import {templateFixture} from './photo_template_run_fixture.mjs';
for(const id of ['no14-still-video','camera-shutter-dump']){
 test(id+': complete authoring returns minimal graphic receipts',async()=>{
  const f=fixture(id),result=await f.create();assert.equal(result.graphics.length,id==='camera-shutter-dump'?2:1);
  for(const g of result.graphics){assert.ok(g.clipId);assert.ok(g.trackId);assert.ok(g.parameters);assert.equal(g.tsxCode,undefined);}
 });
 test(id+': wrong persisted graphic data cannot be reported as a verified save',async()=>{
  const f=fixture(id);f.hooks.afterScript=input=>{if(input.summary.startsWith('Create complete')){
   const graphic=[...f.saved.values()][0].clips.find(c=>c._graphic?.label===(id==='camera-shutter-dump'?'Text':'No.14 decoration'));
   graphic._graphic.parameters[id==='camera-shutter-dump'?'body':'shape']='unexpected';
  }};
  await assert.rejects(f.create(),/graphic|parameter|title/i);assert.equal(f.commits.length,1,'verification never replays a save');
 });
 test(id+': unsupported graphic readback stops before committing an unverified Draft',async()=>{
  const f=fixture(id,{graphicsReadSupported:false});await assert.rejects(f.create(),/graphic|Selects|support/i);assert.equal(f.commits.length,0);
 });
 test(id+': reopening uses graphic receipts and preserves a later manual edit',async()=>{
  const f=templateFixture(id);await f.mount();await f.until(()=>f.finishes.length===1);const draftId=f.finishes[0].sequenceId;assert.ok(draftId);
  const path=[...f.files.keys()].find(p=>p.includes('/template-runs/'));
  assert.equal(JSON.parse(f.files.get(path)).result.graphics.length,id==='camera-shutter-dump'?2:1);
  const graphic=f.saved.get(draftId).clips.find(c=>c._graphic?.label===(id==='camera-shutter-dump'?'Text':'No.14 decoration'));
  graphic._graphic.parameters[id==='camera-shutter-dump'?'body':'shape']='manual';
  await f.mount();await f.until(()=>f.finishes.length===2);assert.ok(f.finishes[1].error);assert.equal(f.commits.length,1);assert.equal(graphic._graphic.parameters[id==='camera-shutter-dump'?'body':'shape'],'manual');
 });
 test(id+': a wrong working-copy graphic stops before the sole commit',async()=>{
  const f=fixture(id),p=f.selects.project('p'),create=p.createDraft;
  p.createDraft=async opts=>{const draft=await create(opts),read=draft.motionGraphicProgram;draft.motionGraphicProgram=async clip=>{const program=await read(clip);program.parameters[id==='camera-shutter-dump'?'body':'shape']='wrong';return program;};return draft;};
  await assert.rejects(f.create(),/graphic parameters/i);assert.equal(f.commits.length,0);
 });
 test(id+': parameter key order does not turn an identical saved graphic into a failure',async()=>{
  const f=fixture(id);f.hooks.afterScript=input=>{if(input.summary.startsWith('Create complete'))for(const c of [...f.saved.values()][0].clips)if(c._graphic)c._graphic.parameters=Object.fromEntries(Object.entries(c._graphic.parameters).reverse());};
  assert.equal((await f.create()).status,'saved');assert.equal(f.commits.length,1);
 });
 test(id+': old run receipts without graphic evidence are inspected without save replay',async()=>{
  const f=templateFixture(id);await f.mount();await f.until(()=>f.finishes.length===1);const path=[...f.files.keys()].find(p=>p.includes('/template-runs/')),row=JSON.parse(f.files.get(path));delete row.result.graphics;f.files.set(path,Buffer.from(JSON.stringify(row)));
  const before=Buffer.from(f.files.get(path));await f.mount();await f.until(()=>f.finishes.length===2);assert.ok(f.finishes[1].error);assert.equal(f.commits.length,1);assert.deepEqual(f.files.get(path),before);
 });
 for(const transport of ['throw','error-reply'])test(id+': saved readback '+transport+' retains the Draft ID without exposing private diagnostics',async()=>{
  const f=fixture(id),run=f.sdk.runScript;
  f.sdk.runScript=async input=>{if(input.summary==='Verify complete saved Image Draft'){if(transport==='throw')throw Error('private TOKEN=secret');return {isError:true,output:'private TOKEN=secret'};}return run(input);};
  await assert.rejects(f.create(),error=>error.code==='IMAGE_SAVE_UNVERIFIED'&&typeof error.draftId==='string'&&typeof error.publicMessage==='string'&&!/private|secret/.test(error.message));assert.equal(f.commits.length,1);
 });
}
