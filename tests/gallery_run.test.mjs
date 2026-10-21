import assert from 'node:assert/strict';
import test from 'node:test';
import {templateFixture} from './photo_template_run_fixture.mjs';
import {checkScriptTypes} from './run_script_types.mjs';
const fixture=options=>templateFixture('photo-gallery-no2',options);
const records=f=>[...f.files.keys()].filter(p=>p.includes('/template-runs/'));
const settle=async(f,n=1)=>f.until(()=>f.finishes.length===n);
const success=f=>assert.ok(f.finishes.at(-1)?.sequenceId,JSON.stringify(f.finishes));

for(const minify of [false,true])test('Gallery run: fresh realms recover the same complete Draft (minify='+minify+')',async()=>{
 const f=fixture({minify}),close=await f.mount();await settle(f);success(f);const id=f.finishes[0].sequenceId;close();
 await f.mount();await settle(f,2);success(f);assert.equal(f.finishes[1].sequenceId,id);assert.equal(f.commits.length,1);
 assert.equal(records(f).length,1);assert.equal(JSON.parse(f.files.get(records(f)[0])).result.clips.length,21);
});
test('Gallery run: independent concurrent panel realms cannot both create a Draft',async()=>{
 const f=fixture();await Promise.all([f.mount(),f.mount()]);await settle(f,2);assert.equal(f.commits.length,1);assert.equal(f.saved.size,1);assert.ok(f.finishes.some(r=>r.sequenceId));assert.equal(records(f).length,1);
});
test('Gallery run: lost authoring reply recovers the SDK-side saved receipt',async()=>{
 const f=fixture();f.hooks.afterReply=input=>{if(input.summary==='Create complete Photo Gallery Draft')throw Error('lost reply');};
 await f.mount();await settle(f);success(f);await f.mount();await settle(f,2);success(f);assert.equal(f.commits.length,1);
});
test('Gallery run: commit reply loss is unknown and never automatically replayed',async()=>{
 const f=fixture({commitReplyLost:true});await f.mount();await settle(f);assert.ok(f.finishes[0].error);assert.equal(f.commits.length,1);assert.equal(JSON.parse(f.files.get(records(f)[0])).status,'outcomeUnknown');
 await f.mount();await settle(f,2);assert.ok(f.finishes[1].error);assert.equal(f.commits.length,1);
});
test('Gallery run: effect failure records no save and remount is not a retry',async()=>{
 const f=fixture({failEffect:true});await f.mount();await settle(f);assert.equal(f.commits.length,0);assert.equal(JSON.parse(f.files.get(records(f)[0])).status,'notSaved');
 const before=f.requests.length;await f.mount();await settle(f,2);assert.ok(f.finishes[1].error);assert.equal(f.requests.slice(before).some(r=>r.allowCommit),false);
});
for(const field of ['photos','clips','music'])test('Gallery run: changed '+field+' under one run cannot reuse or overwrite it',async()=>{
 const f=fixture();await f.mount();await settle(f);success(f);const key=records(f)[0],before=Buffer.from(f.files.get(key));
 const template=structuredClone(f.context.template);if(field==='music')template.options.music='bundled';else template.inputs[field].reverse();
 await f.mount({template});await settle(f,2);assert.ok(f.finishes[1].error);assert.equal(f.commits.length,1);assert.deepEqual(f.files.get(key),before);
});
test('Gallery run: renamed picks and explicit default music preserve effective request identity',async()=>{
 const f=fixture();await f.mount();await settle(f);success(f);
 const template=structuredClone(f.context.template);for(const group of Object.values(template.inputs))for(const p of group)p.name='renamed '+p.name;
 await f.mount({template});await settle(f,2);success(f);assert.equal(f.finishes[1].sequenceId,f.finishes[0].sequenceId);assert.equal(f.commits.length,1);
});
test('Gallery run: corrupted journal stops without replacing the saved Draft',async()=>{
 const f=fixture();await f.mount();await settle(f);success(f);const path=records(f)[0];f.files.set(path,Buffer.from('{broken'));
 await f.mount();await settle(f,2);assert.ok(f.finishes[1].error);assert.equal(f.commits.length,1);assert.equal(f.files.get(path).toString(),'{broken');
});
test('Gallery run: edited persisted programs cannot pass recovery or be rewritten',async()=>{
 const f=fixture();await f.mount();await settle(f);success(f);f.saved.get(f.finishes[0].sequenceId).clips.find(c=>c._effects)._effects[0].parameters.focusX=.2;
 await f.mount();await settle(f,2);assert.ok(f.finishes[1].error);assert.equal(f.commits.length,1);
});
for(const change of ['Project','library'])test('Gallery run: same-run '+change+' replacement stops old preparation and completion',async()=>{
 const f=fixture();let enter,release;const entered=new Promise(r=>{enter=r;}),held=new Promise(r=>{release=r;});let once=false;
 f.hooks.afterReply=async input=>{if(input.summary==='Verify Gallery original inputs'&&!once){once=true;enter();await held;}};
 const close=await f.mount();await entered;close.rerender(change==='Project'?{projectId:'replacement'}:{template:{...f.context.template,libraryId:'replacement'}});release();
 // Await an actual durable transition or an incorrectly completed old run.
 await f.until(()=>f.finishes.length>0||records(f).some(p=>JSON.parse(f.files.get(p)).status==='notSaved'));
 assert.equal(f.commits.length,0);assert.equal(f.finishes.length,0);close();
});
for(const capability of ['graphicsReadSupported','transformReadSupported','audioReadSupported','sourceReadSupported','programReadSupported'])test('Gallery run: absent '+capability+' stops before claim or music import',async()=>{
 const f=fixture({[capability]:false});await f.mount({template:{...f.context.template,options:{music:'bundled'}}});await settle(f);
 assert.match(f.finishes[0].error,/Update Selects/);assert.equal(records(f).length,0);assert.equal(f.requests.some(r=>r.allowCommit),false);assert.equal(f.commits.length,0);
});
test('Gallery run: Music Off does not require unused Audio source timing',async()=>{
 const f=fixture({sourceReadSupported:false});await f.mount();await settle(f);success(f);assert.equal(f.commits.length,1);
});
for(const member of ['compareAndReplace','writeChunk'])test('Gallery run: unsupported '+member+' stops before claiming or importing',async()=>{
 const f=fixture();delete f.selects.files[member];await f.mount({template:{...f.context.template,options:{music:'bundled'}}});await settle(f);
 assert.match(f.finishes[0].error,/Update Selects/);assert.equal(records(f).length,0);assert.equal(f.requests.some(r=>r.allowCommit),false);
});
test('Gallery run: incomplete saved Audio evidence is inspected without authoring',async()=>{
 const f=fixture();await f.mount();await settle(f);success(f);const p=records(f)[0],row=JSON.parse(f.files.get(p));delete row.result.audio;f.files.set(p,Buffer.from(JSON.stringify(row)));
 const n=f.requests.length;await f.mount();await settle(f,2);assert.ok(f.finishes[1].error);assert.equal(f.requests.slice(n).some(r=>r.allowCommit),false);assert.equal(f.commits.length,1);
});
test('Gallery run: saved recovery does not require new-claim SDK file writes or UUID',async()=>{
 const f=fixture();await f.mount();await settle(f);success(f);delete f.selects.files.compareAndReplace;delete f.selects.files.writeChunk;
 const n=f.requests.length;await f.mount({},{cryptoFault:'missing UUID'});await settle(f,2);success(f);assert.equal(f.commits.length,1);assert.equal(f.requests.slice(n).some(r=>r.allowCommit),false);
});
test('Gallery run: explicit new app run can create a revised Draft',async()=>{
 const f=fixture();await f.mount();await settle(f);success(f);await f.mount({template:{...f.context.template,runId:'revision'}});await settle(f,2);success(f);assert.notEqual(f.finishes[1].sequenceId,f.finishes[0].sequenceId);assert.equal(f.commits.length,2);
});
test('Gallery run: generated ownership scripts fit the SDK budget and typecheck',async()=>{
 const f=fixture({minify:true});await f.mount();await settle(f);success(f);assert.equal(records(f).length,1);
 assert.ok(f.requests.every(r=>Buffer.byteLength(r.script)<256*1024));assert.ok(checkScriptTypes(f.requests).scripts>5);assert.ok(checkScriptTypes(f.requests,{sdkTypes:false}).scripts>5);
});

test('Gallery run: late SDK saved receipt survives the old panel closing',async()=>{
 const f=fixture();let release;const held=new Promise(r=>{release=r;});
 f.hooks.afterReply=async input=>{if(input.summary==='Create complete Photo Gallery Draft')await held;};
 const close=await f.mount();await f.until(()=>f.commits.length===1);close();
 assert.equal(JSON.parse(f.files.get(records(f)[0])).status,'saved');await f.mount();await settle(f);success(f);
 release();await new Promise(r=>setImmediate(r));assert.equal(f.commits.length,1);assert.equal(f.finishes.length,1);
});
test('Gallery run: known saved ID survives receipt disk failure and remount never replays',async()=>{
 const f=fixture();f.selects.files.compareAndReplace=async()=>{throw Error('journal unavailable');};
 await f.mount();await settle(f);success(f);assert.equal(JSON.parse(f.files.get(records(f)[0])).status,'claimed');
 await f.mount();await settle(f,2);assert.ok(f.finishes[1].error);assert.equal(f.commits.length,1);
});
test('Gallery run: a lost exclusive claim acknowledgment is reread before one authoring',async()=>{
 const f=fixture();let n=0;f.hooks.afterWrite=p=>{if(p.includes('/template-runs/')){n++;throw Error('claim reply lost');}};
 await f.mount();await settle(f);success(f);assert.equal(n,1);assert.equal(f.commits.length,1);assert.equal(JSON.parse(f.files.get(records(f)[0])).status,'saved');
});
test('Gallery run: default and explicit bundled music recover without reimporting',async()=>{
 const f=fixture();const template={...f.context.template,options:{}};await f.mount({template});await settle(f);success(f);
 const id=f.finishes[0].sequenceId,saved=f.saved.get(id);assert.equal(saved.clips.filter(c=>c.trackKind==='audio').length,1);
 const n=f.requests.length;await f.mount({template:{...template,options:{music:'bundled'}}});await settle(f,2);success(f);
 assert.equal(f.finishes[1].sequenceId,id);assert.equal(f.commits.length,1);assert.equal(f.requests.slice(n).some(r=>r.allowCommit),false);
 const audio=JSON.parse(f.files.get(records(f)[0])).result.audio;assert.equal(audio.length,1);assert.ok(audio[0].source);
});
test('Gallery run: repeated photo and video picks keep 21 distinct placements and recover',async()=>{
 const f=fixture(),template=structuredClone(f.context.template);template.inputs.photos.fill(template.inputs.photos[0]);template.inputs.clips.fill(template.inputs.clips[0]);
 await f.mount({template});await settle(f);success(f);const rows=JSON.parse(f.files.get(records(f)[0])).result.clips;
 assert.equal(rows.length,21);assert.equal(new Set(rows.map(c=>c.clipId)).size,21);assert.equal(new Set(rows.map(c=>c.resourceId)).size,2);
 await f.mount({template});await settle(f,2);success(f);assert.equal(f.commits.length,1);
});
test('Gallery run: foreign Project ownership refuses before a claim or Project mutation',async()=>{
 const f=fixture();await f.mount({template:{...f.context.template,libraryId:'foreign',options:{music:'bundled'}}});await settle(f);
 assert.match(f.finishes[0].error,/different Project or library/);assert.equal(records(f).length,0);assert.equal(f.requests.some(r=>r.allowCommit),false);
});
test('Gallery run: moved Project is checked again at dispatch before any Draft save',async()=>{
 const f=fixture(),call=f.sdk.call;let n=0;
 f.sdk.call=async(method,pid)=>method==='getProjectDraftScaffold'&&++n>1?{owner:{projectId:pid,libraryId:'moved'}}:call(method,pid);
 await f.mount();await settle(f);assert.ok(f.finishes[0].error);assert.equal(f.commits.length,0);assert.equal(JSON.parse(f.files.get(records(f)[0])).status,'notSaved');
});
for(const cryptoFault of ['absent crypto','missing digest','missing UUID','noncallable UUID','missing encoder','missing decoder'])test('Gallery run: '+cryptoFault+' stops before claim or asset preparation',async()=>{
 const f=fixture({cryptoFault});await f.mount({template:{...f.context.template,options:{music:'bundled'}}});await settle(f);
 assert.match(f.finishes[0].error,/Update Selects/);assert.equal(records(f).length,0);assert.equal(f.requests.some(r=>r.allowCommit),false);
});
for(const limit of [undefined,30,'120',Infinity])test('Gallery run: invalid deadline support '+limit+' stops before probing or claiming',async()=>{
 const f=fixture();f.sdk.maxScriptTimeoutSeconds=limit;await f.mount();await settle(f);assert.match(f.finishes[0].error,/Update Selects/);assert.equal(f.requests.length,0);assert.equal(records(f).length,0);
});
for(const damage of ['photos','clips','option'])test('Gallery run: malformed '+damage+' cannot reserve a run or prepare assets',async()=>{
 const f=fixture(),template=structuredClone(f.context.template);if(damage==='option')template.options.music='unknown';else template.inputs[damage].pop();
 await f.mount({template});await settle(f);assert.ok(f.finishes[0].error);assert.equal(records(f).length,0);assert.equal(f.requests.some(r=>r.allowCommit),false);
});
for(const damage of ['duplicate','omitted','oversized','unreadable'])test('Gallery run: '+damage+' journal refuses recovery without another Draft save',async()=>{
 const f=fixture();await f.mount();await settle(f);success(f);const p=records(f)[0],row=JSON.parse(f.files.get(p));
 if(damage==='duplicate')row.result.clips[1]=row.result.clips[0];if(damage==='omitted')row.result.clips.pop();
 if(damage==='oversized')f.files.set(p,Buffer.alloc(49153,32));else f.files.set(p,Buffer.from(JSON.stringify(row)));
 if(damage==='unreadable'){const read=f.local.files.readRange;f.local.files.readRange=(name,...args)=>{if(name===p)throw Error('EACCES');return read(name,...args);};}
 await f.mount();await settle(f,2);assert.ok(f.finishes[1].error);assert.equal(f.commits.length,1);
});

for(const minify of [false,true])test('Gallery run: a source change after save retains the Draft ID and never replays (minify='+minify+')',async()=>{
 const f=fixture({minify}),project=f.selects.project('p'),create=project.createDraft;
 project.createDraft=async options=>{const d=await create(options),commit=d.commitAll;d.commitAll=async reason=>{const r=await commit(reason);const file=f.nodes.find(n=>n.type==='video').path;f.sourceBytes.set(file,Buffer.alloc(32,99));return r;};return d;};
 await f.mount();await settle(f);assert.ok(f.finishes[0].error);assert.equal(f.commits.length,1);
 const row=JSON.parse(f.files.get(records(f)[0]));assert.equal(row.status,'outcomeUnknown');
 assert.equal(row.savedDraftId,[...f.saved.keys()][0]);
 assert.ok(f.finishes[0].error.includes(row.savedDraftId));
 await f.mount();await settle(f,2);assert.ok(f.finishes[1].error.includes(row.savedDraftId));assert.equal(f.commits.length,1);
});
test('Gallery run: unsupported file fingerprint stops before ownership or assets',async()=>{
 const f=fixture();delete f.selects.files.fingerprint;await f.mount();await settle(f);
 assert.match(f.finishes[0].error,/Update Selects/);assert.equal(records(f).length,0);assert.equal(f.requests.some(r=>r.allowCommit),false);assert.equal(f.commits.length,0);
});
