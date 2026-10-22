import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {archiveWorkflowFixture as fixture} from './archive_workflow_fixture.mjs';
const context=runId=>({projectId:'p',template:{runId,inputs:{footage:[{resourceId:'original-0',kind:'video'},{resourceId:'original-1',kind:'video'}]},options:{title:'cinematic'}}});
test('Archive workflow: a lost completed Finish reply confirms one save without resending',async t=>{
 const f=await fixture(t,{realFinish:true});f.hooks.reply=input=>{if(input.summary==='Decorate template with owned receipt')throw Error('Finish response lost after saving');};await f.build();assert.equal(f.result()?.decorated,true);assert.equal(f.commits(),2);assert.equal(f.requests.filter(r=>r.summary==='Decorate template with owned receipt').length,1);
});
test('Archive workflow: a late Finish remains owned through repeated Build and Finish without current assets',async t=>{
 const f=await fixture(t,{realFinish:true});let release,entered;const hold=new Promise(resolve=>release=resolve),committing=new Promise(resolve=>entered=resolve);f.hooks.commit=(_id,reason)=>{if(/title and look/.test(reason)){entered();return hold;}};f.hooks.lostEarly=true;
 try{
  await f.build();await Promise.race([committing,Promise.all(f.pending)]);assert.equal(f.result()?.lookOutcome,'unknown');assert.equal(f.commits(),2);
  f.ui.box.assets=null;f.ui.box.roots=null;f.ui.box.inventory=null;await f.build(99);assert.equal(f.result()?.lookOutcome,'unknown');assert.equal(f.result().frozen.seed,1);assert.equal(f.requests.filter(r=>r.summary==='Decorate template with owned receipt').length,1);
 }finally{release();await Promise.all(f.pending);}
 f.hooks.lostEarly=false;await f.finish();assert.equal(f.result().decorated,true);assert.equal(f.commits(),2);assert.equal(await(await f.open()).read(),null);
});
test('Archive workflow: known pre-save failure retries the original Finish instead of creating another Draft',async t=>{
 const f=await fixture(t,{realFinish:true});let reject=true;f.hooks.beforeWrite=input=>{if(reject&&input.path.includes('.state-')&&f.hooks.currentInput==='Decorate template with owned receipt')throw Error('No space before Finish save');};await f.build();assert.equal(f.result()?.lookOutcome,'notSaved');assert.equal(f.commits(),1);
 f.ui.box.assets=null;f.ui.box.roots=null;reject=false;await f.finish();assert.equal(f.result().decorated,true);assert.equal(f.commits(),2);assert.equal(f.requests.filter(r=>r.summary==='Assemble template with owned receipt').length,1);
});
test('Archive workflow: failure before preparing Finish keeps the original builder/fonts after installation changes',async t=>{
 const f=await fixture(t,{realFinish:true});let fail=true;f.hooks.reply=input=>{if(fail&&input.summary==='Prepare original Archive title and look')throw Error('Temporary response failure');};await f.build();assert.equal(f.result()?.decorated,false);assert.equal(f.commits(),1);
 f.ui.box.avDecorateConfig=()=>{throw Error('New package policy must not replace the frozen builder');};f.ui.box.assets=null;f.ui.box.roots=null;f.ui.box.fontB64=async()=>{throw Error('Do not reload new fonts');};fail=false;
 await f.finish();assert.equal(f.result().decorated,true);const graphic=f.saved.get(f.result().sequenceId).clips.find(row=>row._graphic);assert.equal(graphic._graphic.program.parameters.title,'SATURDAY');assert.equal(f.commits(),2);
});
for(const change of ['title','audio','source','transform','overlay'])test('Archive workflow: same-run '+change+' manual edits are preserved and refuse adoption',async t=>{
 const f=await fixture(t,{realFinish:true});await f.build();const result=f.result(),state=f.saved.get(result.sequenceId),main=state.clips.find(row=>row.resourceId),graphic=state.clips.find(row=>row._graphic);
 if(change==='title')graphic._graphic.program.parameters.title='Manual';if(change==='audio')(main._audio??={}).volumeDb=-12;if(change==='source')main._source.startSeconds=.1;if(change==='transform')main._scale=2;if(change==='overlay')state.clips.push({...JSON.parse(JSON.stringify(main)),clipId:900,trackId:'overlay',trackKind:'video'});
 const original=JSON.stringify(state);await assert.rejects(f.template({projectId:'p',template:{runId:result.pending.scope.runId}}),error=>['TEMPLATE_RUN_INVALID','TEMPLATE_ASSEMBLY_MISMATCH'].includes(error.code));assert.equal(f.commits(),2);assert.equal(JSON.stringify(f.saved.get(result.sequenceId)),original);
});
test('Archive selected entry: an acknowledged run reopens its exact result without footage or current assets',async t=>{
 const f=await fixture(t,{realFinish:true});await f.build();const result=f.result(),before=f.requests.filter(r=>r.summary==='Assemble template with owned receipt'||r.summary==='Decorate template with owned receipt').length;f.ui.box.assets=null;f.ui.box.roots=null;
 const done=await f.template({projectId:'p',template:{runId:result.pending.scope.runId,options:{title:'golden-hour'}}});assert.equal(done.sequenceId,result.sequenceId);assert.equal(f.requests.filter(r=>r.summary==='Assemble template with owned receipt'||r.summary==='Decorate template with owned receipt').length,before);assert.equal(f.commits(),2);
});
test('Archive selected entry: both commits use the real frozen music/title operation',async t=>{
 const f=await fixture(t,{realFinish:true}),run=context('selected-run');const a=await f.template(run),before=f.requests.filter(r=>r.summary==='Assemble template with owned receipt'||r.summary==='Decorate template with owned receipt').length,b=await f.template(run);assert.equal(a.sequenceId,b.sequenceId);assert.equal(f.commits(),2);assert.equal(f.requests.filter(r=>r.summary==='Assemble template with owned receipt'||r.summary==='Decorate template with owned receipt').length,before);assert.ok(f.saved.get(a.sequenceId).clips.some(row=>row.trackKind==='audio'));
});
test('Archive workflow: changed physical originals block Finish until restored, preserving the same run',async t=>{
 const f=await fixture(t,{realFinish:true}),original=fs.readFileSync(f.source);let fail=true;f.hooks.reply=input=>{if(fail&&input.summary==='Prepare original Archive title and look')throw Error('Temporary response failure');};await f.build();const id=f.result().sequenceId;fs.writeFileSync(f.source,Buffer.from('changed original'));fail=false;
 await f.finish();assert.equal(f.commits(),1);assert.equal(f.result().decorated,false);fs.writeFileSync(f.source,original);await f.finish();assert.equal(f.result().sequenceId,id);assert.equal(f.result().decorated,true);assert.equal(f.commits(),2);
});
