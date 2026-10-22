import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {runFixture,assembly,decoration} from './sdk_free_run_fixture.mjs';
const clone=value=>JSON.parse(JSON.stringify(value));
const record=f=>[...f.disk].find(([path])=>path.endsWith('.json')&&!path.includes('.state-')&&!path.includes('.sources-'));
test('SDK-free run: save once, confirm actual source, then recover without another commit',async()=>{
 const f=runFixture(),a=await f.run({captureState:true}),before=[...f.disk];
 assert.equal(a.assemblyConfirmed,true);assert.equal(f.commits(),1);assert.equal(f.sourceReads(),2);
 const [path,text]=record(f),r=JSON.parse(text);assert.equal(r.result.sourceGuard.version,1);assert.equal(r.result.sourceGuard.owner,r.owner);
 const state=JSON.parse(f.disk.get(r.result.stateFile.path));assert.equal(state.sourcesPending,true);assert.equal(state.clips[0].source,null);
 const guard=JSON.parse(f.disk.get(r.result.sourceGuard.path));assert.equal(guard.clips[0].source.startSeconds,7.25);
 assert.equal((await f.run({captureState:true})).sequenceId,a.sequenceId);assert.equal(f.commits(),1);assert.deepEqual([...f.disk],before);
 assert.equal(path.endsWith('.json'),true);
});
test('SDK-free run: a wrong first saved source cannot become the guard or a confirmed assembly',async()=>{
 const f=runFixture();f.hooks.commit=id=>{f.saved.get(id).rows[0]._source.startSeconds+=.1;};
 await assert.rejects(f.run({captureState:true}),error=>error.code==='TEMPLATE_RUN_INVALID');
 assert.equal(f.commits(),1);assert.equal([...f.disk.keys()].some(path=>path.includes('.sources-')),false);
 await assert.rejects(f.run({captureState:true}));assert.equal(f.commits(),1);
});
test('SDK-free run: valid existing guard bytes are mandatory, not file existence',async()=>{
 const f=runFixture();await f.run({captureState:true});const guardPath=JSON.parse(record(f)[1]).result.sourceGuard.path;
 f.disk.set(guardPath,'{"unrelated":true}');
 await assert.rejects(f.run({captureState:true}),error=>error.code==='TEMPLATE_RUN_INVALID');assert.equal(f.commits(),1);assert.equal(f.disk.get(guardPath),'{"unrelated":true}');
});
test('SDK-free run: later source-only edits remain guarded across recovery',async()=>{
 const f=runFixture(),a=await f.run({captureState:true});f.saved.get(a.sequenceId).rows[0]._source.endSeconds+=.001;
 await assert.rejects(f.run({captureState:true}),error=>error.code==='TEMPLATE_RUN_INVALID');assert.equal(f.commits(),1);
});
test('SDK-free run: a changed revision during independent reads cannot confirm the source',async()=>{
 const f=runFixture();f.hooks.revision=count=>'revision-'+count;
 await assert.rejects(f.run({captureState:true}),error=>error.code==='TEMPLATE_RUN_INVALID');assert.equal(f.commits(),1);
});
test('SDK-free run: reply loss adopts only the same recorded saved result',async()=>{
 const f=runFixture();f.hooks.lostReply=true;
 const result=await f.run({captureState:true});assert.equal(result.assemblyConfirmed,true);assert.equal(f.commits(),1);
});
test('SDK-free run: historical source-containing receipt/state bytes are compared with actual saved source and never rewritten',async()=>{
 const f=runFixture(),a=await f.run({captureState:true}),[path,text]=record(f),old=JSON.parse(text),r=old.result;
 const source={clipId:1,...f.saved.get(a.sequenceId).rows[0]._source};r.clips[0].source=clone(source);
 f.disk.delete(r.sourceGuard.path);delete r.sourceGuard;
 const state=JSON.parse(f.disk.get(r.stateFile.path));delete state.sourcesPending;state.clips[0].source=clone(source);
 const canonical=f.box.templateStateJSON(state);f.disk.set(r.stateFile.path,canonical);r.stateFile.size=canonical.length;
 f.disk.set(path,JSON.stringify(old));const original=clone([...f.disk]);
 assert.equal((await f.run({captureState:true})).assemblyConfirmed,true);assert.deepEqual([...f.disk],original);
 f.saved.get(a.sequenceId).rows[0]._source.startSeconds+=.1;
 await assert.rejects(f.run({captureState:true}),error=>error.code==='TEMPLATE_RUN_INVALID');assert.equal(f.commits(),1);assert.deepEqual([...f.disk],original);
});
test('SDK-free look: a pending working snapshot is verified by actual saved source after its sole decoration commit',async()=>{
 const f=runFixture(),a=await f.run({captureState:true});
 const pending={scope:f.scope,config:f.config,source:assembly},config={projectId:'p',sequenceId:a.sequenceId};
 const finish=()=>f.box.executeTemplateDecoration(f.sdk,f.raw,pending,config,decoration,()=>true);
 const result=await finish();assert.equal(result.decorationConfirmed,true);assert.equal(f.commits(),2);
 assert.equal((await finish()).decorationConfirmed,true);assert.equal(f.commits(),2);
 f.saved.get(a.sequenceId).rows[0]._source.endSeconds+=.1;
 await assert.rejects(finish());assert.equal(f.commits(),2);
});

test('SDK-free legacy verifier: only the observed saved target gains a local read-only source adapter',async()=>{
 const f=runFixture(),row={clipId:4,trackId:'main',trackKind:'main',startFrame:0,endFrame:30},actual={revision:'saved-read',clips:[{...row,source:{clipId:4,startSeconds:11,endSeconds:12}}]};
 const target={clips:async()=>[row],commitAll:async()=>{throw Error('must never dispatch');}},probe={probe:true},selects={draft(id){assert.equal(this,selects);return id==='saved'?target:probe;}};
 const frozen="const d=selects.draft('saved');if(!('clipSourceWindow' in d))throw Error('missing legacy capability');const row=(await d.clips())[0];return {source:await d.clipSourceWindow(row),probe:selects.draft('private-probe').probe};";
 const script=f.box.templateObservationScript(frozen,actual,'saved');
 const run=source=>vm.runInNewContext('(async()=>{'+source+'})()',{selects});
 assert.deepEqual(clone(await run(script)),{source:{clipId:4,startSeconds:11,endSeconds:12},probe:true});
 assert.equal('clipSourceWindow' in target,false,'SDK target capability is unchanged');assert.ok(script.includes(frozen),'the known frozen verifier bytes are preserved');
 await assert.rejects(run(f.box.templateObservationScript("await selects.draft('saved').commitAll('forbidden');",actual,'saved')),/read-only/);
 row.startFrame=1;await assert.rejects(run(script),/placement changed/);
 assert.throws(()=>f.box.templateObservationScript(frozen,null,'saved'),/independently observed/);
});
