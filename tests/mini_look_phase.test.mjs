import assert from 'node:assert/strict';import test from 'node:test';
import {lookPhaseFixture as fixture} from './mini_look_fixture.mjs';
import {vlogOperation} from './sdk_free_helpers.mjs';
const clone=v=>JSON.parse(JSON.stringify(v));
test('Mini workflow: losing the look reply recovers one exact saved Draft with no second decoration',async t=>{
 const f=await fixture(t);f.hooks.reply=input=>{if(input.summary==='Decorate template with owned receipt')throw Error('lost reply after save');};const result=await (await f.open()).workflow(f.root,f.prepare);
 assert.equal(result.sequenceId,'d1');assert.equal(result.decorationConfirmed,true);assert.equal(f.commits(),2);assert.equal(f.requests.filter(r=>r.summary==='Decorate template with owned receipt').length,1);assert.equal(await (await f.open()).read(),null);
});
test('Mini workflow: remount during a late look commit keeps original inputs and observes the late receipt',async t=>{
 const f=await fixture(t);let release;const hold=new Promise(resolve=>release=resolve);f.hooks.commit=(_id,reason)=>/title and look/.test(reason)?hold:null;f.hooks.lostEarly=true;
 await assert.rejects((await f.open()).workflow(f.root,f.prepare),e=>e.code==='TEMPLATE_RUN_PENDING');const log=await f.open(),resumed=await log.read();assert.equal(resumed.frozen.seed,7);
 await assert.rejects(log.workflow(resumed,()=>{throw Error('must reuse frozen phase inputs');}),e=>e.code==='TEMPLATE_RUN_PENDING');assert.equal(f.commits(),2);release();await Promise.all(f.pending);f.hooks.lostEarly=false;
 const done=await (await f.open()).workflow(resumed,()=>{throw Error('must not prepare again');});assert.equal(done.sequenceId,'d1');assert.equal(done.decorationConfirmed,true);assert.equal(f.commits(),2);
});
for(const change of ['title','audio','source','transform','overlay'])test('Mini workflow: '+change+' edit after saving prevents adoption and is preserved',async t=>{
 const f=await fixture(t),log=await f.open();await log.workflow(f.root,f.prepare);const state=f.saved.get('d1'),main=state.clips.find(r=>r.resourceId),graphic=state.clips.find(r=>r._graphic);
 if(change==='title')graphic._graphic.program.parameters.text='Manual';if(change==='audio')main._volume=-12;if(change==='source')main._source.startSeconds=.1;if(change==='transform')main._scale=2;if(change==='overlay')state.clips.push({...clone(main),clipId:900,trackId:'overlay',trackKind:'video'});
 const before=JSON.stringify(state);await assert.rejects((await f.open()).workflow(f.root,f.prepare),e=>e.code==='TEMPLATE_RUN_INVALID');assert.equal(JSON.stringify(f.saved.get('d1')),before);assert.equal(f.commits(),2);
});
test('Mini workflow: known no-save may retry the same frozen phase while an unknown save cannot replay',async t=>{
 const f=await fixture(t);let reject=true;f.hooks.beforeWrite=input=>{if(reject&&input.path.includes('.state-')&&f.hooks.currentInput==='Decorate template with owned receipt')throw Error('disk unavailable before look save');};
 const log=await f.open();await assert.rejects(log.workflow(f.root,f.prepare),e=>e.code==='TEMPLATE_RUN_NOT_SAVED');assert.equal(f.commits(),1);reject=false;await (await f.open()).workflow(f.root,()=>{throw Error('no new recipe');});assert.equal(f.commits(),2);
});

import {miniMusicFixture} from './mini_music_fixture.mjs';
import fs from 'node:fs';
import {checkScriptTypes} from './run_script_types.mjs';
test('Mini standalone: an unknown look remains discoverable and Finish works without reloading current assets',async t=>{
 const f=await fixture(t),ui=await miniMusicFixture(t,{entry:'panel',silent:true}),log=await f.open();await log.store(f.root);
 let release;const hold=new Promise(resolve=>release=resolve);f.hooks.commit=(_id,reason)=>/title and look/.test(reason)?hold:null;f.hooks.lostEarly=true;
 let result=null;ui.box.setResult=value=>{result=typeof value==='function'?value(result):value;ui.box.result=result;};
 ui.box.openAssemblyContinuations=()=>f.open();ui.box.prepareMiniDecoration=f.prepare;
 await ui.box.api.build(91);assert.equal(result.sequenceId,'d1');assert.equal(result.decorated,false);assert.equal(result.lookOutcome,'unknown');assert.equal((await (await f.open()).read()).frozen.seed,7);
 result=null;ui.box.result=null;await ui.box.api.build(92);assert.equal(result?.sequenceId,'d1','a fresh UI must retain the known Draft even when the frozen recipe already exists');assert.equal(result.lookOutcome,'unknown');
 ui.box.assets=null;ui.box.roots=null;release();await Promise.all(f.pending);f.hooks.lostEarly=false;
 await ui.box.api.finishTitle();assert.equal(result.decorated,true);assert.equal(f.commits(),2);assert.equal(ui.imports.length,0);assert.equal(await (await f.open()).read(),null);
});
test('Mini standalone: a known pre-save failure retains its original run for Finish, with no new assembly',async t=>{
 const f=await fixture(t),ui=await miniMusicFixture(t,{entry:'panel',silent:true}),log=await f.open();await log.store(f.root);
 let reject=true;f.hooks.beforeWrite=input=>{if(reject&&input.path.includes('.state-')&&f.hooks.currentInput==='Decorate template with owned receipt')throw Error('no space before save');};
 let result=null;ui.box.setResult=value=>{result=typeof value==='function'?value(result):value;ui.box.result=result;};ui.box.openAssemblyContinuations=()=>f.open();ui.box.prepareMiniDecoration=f.prepare;
 await ui.box.api.build(2);assert.equal(result.lookOutcome,'notSaved');assert.equal(ui.box.assemblyPendingRef.current.p.scope.runId,'original');assert.equal(f.commits(),1);
 reject=false;await ui.box.api.finishTitle();assert.equal(result.decorated,true);assert.equal(f.commits(),2);assert.equal(f.requests.filter(r=>r.summary==='Assemble template with owned receipt').length,1);
});

test('Mini workflow: real shipped title/fonts fit transport and snapshots, with SDK-checked generated requests',async t=>{
 const f=await fixture(t),ui=await miniMusicFixture(t),base=new URL('../plugins/mini-vlog/',import.meta.url),presets=JSON.parse(fs.readFileSync(new URL('assets/fonts/presets.json',base),'utf8'));
 const read=rel=>fs.readFileSync(new URL(rel,base),'utf8');
 const assets={presets,scripts:{decorateJs:vlogOperation('mini-vlog','decorate')},titleTsx:read('assets/title-lockup.tsx'),softTsx:read('assets/soft-look.tsx'),motionTsx:read('assets/photo-motion.tsx'),punchTsx:read('assets/beat-punch.tsx')};
 const frozen={pid:'p',seed:7,preset:'mini-vlog',fields:{big:'SATURDAY',small:'weekend'},music:'none',sectionStart:0,pace:'quick',length:'standard',clipSound:'off',punch:false,soft:true,bpm:null};
 const finishAssets=await ui.box.api.snapshotMiniFinishAssets(assets,frozen,'ko',file=>read('assets/fonts/'+file),()=>{});
 const root={...f.root,finishAssets,frozen,photoSizes:{}};let recipe;
 await (await f.open()).workflow(root,async(value,a)=>{recipe=await ui.box.api.prepareMiniDecoration(value,a,()=>{});return recipe;});
 assert.ok(recipe.config.title.parameters.fonts.length>0);assert.equal(f.commits(),2);assert.ok(f.requests.every(r=>Buffer.byteLength(r.script)<262144));
 assert.equal((await (await f.open()).read('original',true)).frozen.fields.big,'SATURDAY');
 assert.ok(checkScriptTypes(f.requests.map((r,i)=>({name:r.summary+' '+i,script:r.script}))).scripts>=6);
});

test('Mini workflow: concurrent windows cannot save either assembly or look twice',async t=>{
 const f=await fixture(t),a=await f.open(),b=await f.open();const results=await Promise.allSettled([a.workflow(f.root,f.prepare),b.workflow(f.root,f.prepare)]);
 assert.equal(f.commits(),2);assert.ok(results.some(r=>r.status==='fulfilled'));assert.ok(results.every(r=>r.status==='fulfilled'||['TEMPLATE_RUN_PENDING','TEMPLATE_RUN_COMPLETED'].includes(r.reason.code)),JSON.stringify(results.map(r=>r.reason?.code)));
});
test('Mini workflow: two windows retry a positive no-save through one exclusive generation',async t=>{
 const f=await fixture(t);let reject=true;f.hooks.beforeWrite=input=>{if(reject&&input.path.includes('.state-')&&f.hooks.currentInput==='Decorate template with owned receipt')throw Error('disk unavailable');};
 await assert.rejects((await f.open()).workflow(f.root,f.prepare),e=>e.code==='TEMPLATE_RUN_NOT_SAVED');reject=false;
 const a=await f.open(),b=await f.open(),results=await Promise.allSettled([a.workflow(f.root,f.prepare),b.workflow(f.root,f.prepare)]);
 assert.equal(f.commits(),2);assert.ok(results.some(r=>r.status==='fulfilled'));assert.ok(results.every(r=>r.status==='fulfilled'||['TEMPLATE_RUN_PENDING','TEMPLATE_RUN_COMPLETED'].includes(r.reason.code)),JSON.stringify(results.map(r=>r.reason?.code)));
});
test('Mini workflow: manual changes between assembly and first look reject before any look save',async t=>{
 const f=await fixture(t);await assert.rejects((await f.open()).workflow(f.root,async(pending,a)=>{f.saved.get(a.sequenceId).clips[0]._volume=-20;return f.prepare(pending,a);}),e=>e.code==='TEMPLATE_RUN_NOT_SAVED');
 assert.equal(f.commits(),1);assert.equal(f.saved.get('d1').clips[0]._volume,-20);assert.equal((await (await f.open()).read()).scope.runId,'original');
});
test('Mini workflow: mutated caller inputs cannot alter the captured request while discovery awaits',async t=>{
 const f=await fixture(t),log=await f.open(),work=log.workflow(f.root,f.prepare);f.root.config.boundaries=[0,7];f.root.frozen.seed=99;
 const result=await work;assert.equal(result.totalFrames,60);const original=await(await f.open()).read('original',true);assert.equal(original.frozen.seed,7);assert.deepEqual(Array.from(original.config.boundaries),[0,2]);
});

test('Mini standalone: assembly handoff cannot acknowledge the workflow before decoration owns it',async t=>{
 const f=await fixture(t),ui=await miniMusicFixture(t,{entry:'panel',silent:true}),log=await f.open();await log.store(f.root);let observed='not reached';
 ui.box.openAssemblyContinuations=()=>f.open();ui.box.decorate=async()=>{observed=await(await f.open()).read();};
 await ui.box.api.build(2);assert.notEqual(observed,'not reached');assert.ok(observed,'the durable workflow must still be discoverable at decoration handoff');assert.equal(observed.scope.runId,'original');
});
