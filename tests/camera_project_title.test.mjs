import assert from 'node:assert/strict';
import test from 'node:test';
import {fixture} from './photo_authoring_fixture.mjs';
import {templateFixture} from './photo_template_run_fixture.mjs';
import {loadPanelOperation} from './panel_operation.mjs';
const textIn=(f,id)=>f.saved.get(id).clips.find(c=>c._graphic?.label==='Text')._graphic.parameters.body;
const clean=loadPanelOperation('camera-shutter-dump').defaultTitle;
test('Camera uses authoritative Project metadata when app context has no projectName',async()=>{
 const f=templateFixture('camera-shutter-dump',{projectTitle:'Family trip'});await f.mount();await f.until(()=>f.finishes.length===1);
 assert.ok(f.finishes[0].sequenceId);assert.equal(textIn(f,f.finishes[0].sequenceId),'Family trip');assert.equal(f.commits.length,1);
});
test('Camera ignores stale projectName injected into the app context',async()=>{
 const f=templateFixture('camera-shutter-dump',{projectTitle:'Current Project'});await f.mount({projectName:'Stale Project'});await f.until(()=>f.finishes.length===1);
 assert.ok(f.finishes[0].sequenceId);assert.equal(textIn(f,f.finishes[0].sequenceId),'Current Project');
});
for(const projectTitle of ['  Seoul\nSpring  ','Trip "A"; throw Error("not code"); //','\uc11c\uc6b8 \uc5ec\ud589 \ud83c\udfac','   ','x'.repeat(80)])test('Camera normalizes the Project title as data: '+JSON.stringify(projectTitle),async()=>{
 const f=fixture('camera-shutter-dump',{projectTitle}),result=await f.create();assert.equal(textIn(f,result.draftId),clean(projectTitle));assert.equal(f.commits.length,1);
});
test('Camera preserves an explicit caller-provided title override',async()=>{
 const f=fixture('camera-shutter-dump',{projectTitle:'Project'}),result=await f.create({title:'Custom caption'});assert.equal(textIn(f,result.draftId),'Custom caption');
});
test('unknown Project title metadata stops before Project imports or a Draft save',async()=>{
 const f=fixture('camera-shutter-dump');f.selects.project('p').meta=async()=>({id:'p',draftIds:[]});
 await assert.rejects(f.create(),error=>/Project title/.test(error.publicMessage));assert.equal(f.commits.length,0);assert.equal(f.imports,0);
});
test('title truncation preserves the 48-unit limit without a dangling surrogate',()=>{
 assert.equal(clean('a'.repeat(47)+'\ud83c\udfac'),'a'.repeat(47));assert.equal(clean('a'.repeat(46)+'\ud83c\udfac'),'a'.repeat(46)+'\ud83c\udfac');
});
test('Project renaming cannot rewrite a completed run; a new run uses the new name',async()=>{
 const f=templateFixture('camera-shutter-dump',{projectTitle:'First name'});await f.mount();await f.until(()=>f.finishes.length===1);const first=f.finishes[0].sequenceId;
 f.selects.project('p').meta=async()=>({id:'p',title:'New name',draftIds:[...f.saved.keys()]});
 await f.mount();await f.until(()=>f.finishes.length===2);assert.equal(f.finishes[1].sequenceId,first);assert.equal(textIn(f,first),'First name');assert.equal(f.commits.length,1);
 await f.mount({template:{...f.context.template,runId:'camera:new-title'}});await f.until(()=>f.finishes.length===3);
 assert.equal(textIn(f,f.finishes[2].sequenceId),'New name');assert.equal(f.commits.length,2);
});
test('foreign Project title metadata is refused without authoring',async()=>{
 const f=fixture('camera-shutter-dump');f.selects.project('p').meta=async()=>({id:'other-project',title:'Foreign',draftIds:[]});
 await assert.rejects(f.create(),/Project title/);assert.equal(f.commits.length,0);assert.equal(f.imports,0);
});
for(const response of ['throw','missing'])test('Project-title '+response+' observation has a safe error and no writes',async()=>{
 const f=fixture('camera-shutter-dump'),run=f.sdk.runScript;
 f.sdk.runScript=async input=>{if(input.summary==='Read shutter dump Project title'){if(response==='throw')throw Error('private TOKEN=secret');return undefined;}return run(input);};
 await assert.rejects(f.create(),error=>typeof error.publicMessage==='string'&&/Project title/.test(error.publicMessage)&&!/private|secret/.test(error.message));
 assert.equal(f.commits.length,0);assert.equal(f.imports,0);
});
