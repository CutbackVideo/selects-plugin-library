import assert from 'node:assert/strict';import test from 'node:test';import fs from 'node:fs';
import {lookPhaseFixture as fixture} from './mini_look_fixture.mjs';
const legacy=source=>source.replace('// @template-assembly-intent 1\n','');
const opts={retireUnstarted:true};
const run=(f,options=opts)=>f.mount().executeTemplateAssembly(f.sdk,f.local.files,f.root.scope,f.root.config,f.root.source,()=>true,options);
test('old assembly: an unstarted frozen operation is exclusively retired without executing it',async t=>{
 const f=await fixture(t);f.root.source=legacy(f.root.source);await assert.rejects(run(f),e=>e.code==='TEMPLATE_RUN_RETIRED');assert.equal(f.commits(),0);assert.equal(f.requests.filter(r=>r.allowCommit).length,0);
 await assert.rejects(run(f),e=>e.code==='TEMPLATE_RUN_RETIRED');assert.equal(f.commits(),0);
});
test('old assembly: a saved exact receipt recovers without substituting source or dispatching again',async t=>{
 const f=await fixture(t);f.root.source=legacy(f.root.source);const saved=await run(f,{}),recovered=await run(f);assert.equal(recovered.sequenceId,saved.sequenceId);assert.equal(recovered.assemblyConfirmed,true);assert.equal(f.commits(),1);assert.equal(f.requests.filter(r=>r.allowCommit).length,1);
});
test('old assembly: retirement and an older live window cannot both author the run',async t=>{
 const f=await fixture(t);f.root.source=legacy(f.root.source);const results=await Promise.allSettled([run(f),run(f,{})]);assert.ok(f.commits()<=1);assert.ok(results.every(r=>r.status==='fulfilled'||['TEMPLATE_RUN_PENDING','TEMPLATE_RUN_RETIRED'].includes(r.reason.code)));if(results[0].status==='rejected'&&results[0].reason.code==='TEMPLATE_RUN_NOT_SAVED')assert.equal(f.commits(),0);
});
test('old workflow: semantic admission runs before the first decoration mutation',async t=>{
 const f=await fixture(t),log=await f.open();await assert.rejects(log.workflow(f.root,f.prepare,()=>{},{verifyAssembly:async()=>{throw Error('plan mismatch');}}),/plan mismatch/);assert.equal(f.commits(),1);assert.equal(f.requests.filter(r=>r.summary==='Decorate template with owned receipt').length,0);
});
test('old workflow: a frozen look recipe does not bypass semantic admission on remount',async t=>{
 const f=await fixture(t);let blocked=true;const log=await f.open();await assert.rejects(log.workflow(f.root,f.prepare,()=>{},{verifyAssembly:async()=>{throw Error('plan mismatch');}}),/plan mismatch/);
 await assert.rejects((await f.open()).workflow(f.root,()=>{throw Error('must retain original look');},()=>{},{verifyAssembly:async()=>{throw Error('plan mismatch');}}),/plan mismatch/);assert.equal(f.commits(),1);
});
import {miniMusicFixture} from './mini_music_fixture.mjs';
test('Mini old standalone: a self-consistent saved receipt for the wrong cut cannot continue to a look commit',async t=>{
 const f=await fixture(t);f.root.source=legacy(f.root.source).replace('const cfg = __CONFIG__;','const cfg = __CONFIG__; cfg.boundaries=[0,3];');
 await f.mount().executeTemplateAssembly(f.sdk,f.local.files,f.root.scope,f.root.config,f.root.source,()=>true,{captureState:true});assert.equal(f.saved.get('d1').clips[0].endFrame,90);
 const log=await f.open();await log.store(f.root);const ui=await miniMusicFixture(t,{entry:'panel',silent:true});
 ui.box.sdk=f.sdk;ui.box.openAssemblyContinuations=()=>f.open();ui.box.prepareMiniDecoration=f.prepare;ui.box.readText=async(_root,rel)=>fs.readFileSync(new URL('../plugins/mini-vlog/'+rel,import.meta.url),'utf8');
 await ui.box.api.build(3);assert.ok(f.requests.some(r=>r.summary==='Verify original Mini assembly plan'),'the actual read-only admission operation must run');assert.equal(f.commits(),1,'the frozen owner receipt is not evidence of the original 60-frame plan');assert.equal(f.requests.filter(r=>r.summary==='Decorate template with owned receipt').length,0);
});
import vm from 'node:vm';import {createHash} from 'node:crypto';
// Frozen verbatim bb58bcde33d396afb13f65d745c61fe4104bc124; CI needs no Git history.
const oldOwner=fs.readFileSync(new URL('./fixtures/mini-owner-alpha23.js',import.meta.url),'utf8');
assert.equal(createHash('sha256').update(oldOwner).digest('hex'),'aeb582d8776f4506e9e17dc0a2e68bde7362d80ec1747bbebea1b2110c109e61');
test('retired assembly: an actual older owner cannot validate it as a retryable failure',async t=>{
 const f=await fixture(t);await assert.rejects(run(f),e=>e.code==='TEMPLATE_RUN_RETIRED');const box=f.mount();vm.runInContext(oldOwner,box);
 await assert.rejects(box.executeTemplateAssembly(f.sdk,f.local.files,f.root.scope,f.root.config,f.root.source,()=>true),e=>e.code==='TEMPLATE_RUN_INVALID');assert.equal(f.commits(),0);
});
test('old assembly: a claimed late save is not retired and its eventual receipt recovers read-only',async t=>{
 const f=await fixture(t);let release;const hold=new Promise(r=>release=r);f.hooks.commit=(_id,reason)=>/assemble/.test(reason)?hold:null;
 const original=f.sdk.runScript;let late;f.sdk.runScript=input=>{if(input.summary==='Assemble template with owned receipt'){late=original(input);return Promise.resolve({isError:true,output:'transport lost while Main may save'});}return original(input);};
 await assert.rejects(run(f,{}),e=>e.code==='TEMPLATE_RUN_PENDING');await assert.rejects(run(f),e=>e.code==='TEMPLATE_RUN_PENDING');assert.equal(f.commits(),1);release();await late;
 const result=await run(f);assert.equal(result.sequenceId,'d1');assert.equal(f.commits(),1);assert.equal(f.requests.filter(r=>r.allowCommit).length,1);
});
for(const entry of ['panel','template'])test('Mini old '+entry+': a healthy saved assembly finishes with original input and remount never authors again',async t=>{
 const f=await fixture(t);f.root.source=legacy(f.root.source);await run(f,{captureState:true});await(await f.open()).store(f.root);
 const ui=await miniMusicFixture(t,{entry,silent:true});ui.box.sdk=f.sdk;ui.box.openAssemblyContinuations=()=>f.open();ui.box.openTemplateAssemblyContinuations=()=>f.open();ui.box.prepareMiniDecoration=f.prepare;ui.box.templateRunIssue=f.mount().templateRunIssue;
 ui.box.readText=async(_root,rel)=>fs.readFileSync(new URL('../plugins/mini-vlog/'+rel,import.meta.url),'utf8');
 const invoke=()=>entry==='panel'?ui.box.api.build(3):ui.box.api.runMiniVlogTemplate(f.sdk,{projectId:'p',template:{runId:'original'}},()=>{},()=>{});
 await invoke();assert.equal(f.commits(),2);assert.ok(f.requests.some(r=>r.summary==='Verify original Mini assembly plan'));assert.equal(await(await f.open()).read(),null);
 if(entry==='template')await invoke();assert.equal(f.commits(),2);
});
test('Mini old selected entry: an original wrong plan is refused and its look is durably retired',async t=>{
 const f=await fixture(t);f.root.source=legacy(f.root.source).replace('const cfg = __CONFIG__;','const cfg = __CONFIG__; cfg.boundaries=[0,3];');await run(f,{captureState:true});await(await f.open()).store(f.root);
 const ui=await miniMusicFixture(t,{silent:true});ui.box.openTemplateAssemblyContinuations=()=>f.open();ui.box.prepareMiniDecoration=f.prepare;ui.box.templateRunIssue=f.mount().templateRunIssue;ui.box.readText=async(_root,rel)=>fs.readFileSync(new URL('../plugins/mini-vlog/'+rel,import.meta.url),'utf8');
 const invoke=()=>ui.box.api.runMiniVlogTemplate(f.sdk,{projectId:'p',template:{runId:'original'}},()=>{},()=>{});
 await assert.rejects(invoke(),e=>e.code==='TEMPLATE_RUN_RETIRED');await assert.rejects(invoke(),e=>e.code==='TEMPLATE_RUN_RETIRED');assert.equal(f.commits(),1);assert.equal(f.saved.get('d1').clips[0].endFrame,90);
});
test('old assembly: a positive pre-save failure is terminally retired, not left retryable',async t=>{
 const f=await fixture(t);let fail=true;f.hooks.beforeWrite=()=>{if(fail&&f.hooks.currentInput==='Assemble template with owned receipt')throw Error('before save');};await assert.rejects(run(f,{captureState:true}),e=>e.code==='TEMPLATE_RUN_NOT_SAVED');fail=false;await assert.rejects(run(f),e=>e.code==='TEMPLATE_RUN_RETIRED');assert.equal(f.commits(),0);
});
test('old look: retirement revokes a retryable phase and an actual older workflow cannot retry it',async t=>{
 const f=await fixture(t);let fail=true;f.hooks.beforeWrite=input=>{if(fail&&input.path.includes('.state-')&&f.hooks.currentInput==='Decorate template with owned receipt')throw Error('before look save');};
 await assert.rejects((await f.open()).workflow(f.root,f.prepare),e=>e.code==='TEMPLATE_RUN_NOT_SAVED');fail=false;
 await assert.rejects((await f.open()).workflow(f.root,f.prepare,()=>{},{retireUnstarted:true,verifyAssembly:async()=>{throw Object.assign(Error('bad old intent'),{code:'TEMPLATE_ASSEMBLY_MISMATCH'});}}),e=>e.code==='TEMPLATE_RUN_RETIRED');
 const box=f.mount();vm.runInContext(oldOwner,box);const oldLog=await box.openTemplateAssemblyContinuations(f.sdk,f.local.files,{pluginId:'mini-vlog',projectId:'p'},()=>true);
 await assert.rejects(oldLog.workflow(f.root,f.prepare),e=>e.code==='TEMPLATE_RUN_INVALID');assert.equal(f.commits(),1);
});
test('old look: failed admission cannot retire a claimed late phase or dispatch a second save',async t=>{
 const f=await fixture(t);let release;const hold=new Promise(r=>release=r);f.hooks.commit=(_id,reason)=>/title and look/.test(reason)?hold:null;f.hooks.lostEarly=true;
 await assert.rejects((await f.open()).workflow(f.root,f.prepare),e=>e.code==='TEMPLATE_RUN_PENDING');await assert.rejects((await f.open()).workflow(f.root,f.prepare,()=>{},{retireUnstarted:true,verifyAssembly:async()=>{throw Object.assign(Error('unconfirmed old intent'),{code:'TEMPLATE_ASSEMBLY_MISMATCH'});}}),e=>e.code==='TEMPLATE_RUN_PENDING');
 release();await Promise.all(f.pending);f.hooks.lostEarly=false;assert.equal((await(await f.open()).workflow(f.root,f.prepare)).decorationConfirmed,true);assert.equal(f.commits(),2);
});
test('Mini old recovery: a transient plan read failure preserves the original look for a later successful retry',async t=>{
 const f=await fixture(t);f.root.source=legacy(f.root.source);await run(f,{captureState:true});await(await f.open()).store(f.root);
 const ui=await miniMusicFixture(t,{silent:true});ui.box.openTemplateAssemblyContinuations=()=>f.open();ui.box.prepareMiniDecoration=f.prepare;ui.box.templateRunIssue=f.mount().templateRunIssue;ui.box.readText=async(_root,rel)=>fs.readFileSync(new URL('../plugins/mini-vlog/'+rel,import.meta.url),'utf8');
 const original=f.sdk.runScript;let failed=false;f.sdk.runScript=input=>{if(!failed&&input.summary==='Verify original Mini assembly plan'){failed=true;return Promise.resolve({isError:true,output:'Temporary read interruption'});}return original(input);};
 const invoke=()=>ui.box.api.runMiniVlogTemplate(f.sdk,{projectId:'p',template:{runId:'original'}},()=>{},()=>{});
 await assert.rejects(invoke(),e=>e.code==='TEMPLATE_RUN_PENDING');assert.equal(f.commits(),1);const result=await invoke();assert.equal(result.sequenceId,'d1');assert.equal(f.commits(),2);
});
