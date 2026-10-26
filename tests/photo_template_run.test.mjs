import assert from 'node:assert/strict';
import test from 'node:test';
import {templateFixture} from './photo_template_run_fixture.mjs';
import {checkScriptTypes} from './run_script_types.mjs';
const ids=['no14-still-video','camera-shutter-dump','four-photo-stop-motion','polaroid-photo-dump'];
const records=f=>[...f.files.keys()].filter(p=>p.includes('/template-runs/'));
test('template completion waits for delayed host I/O instead of counting event-loop turns',{timeout:4000},async()=>{
 const f=templateFixture('no14-still-video');
 f.hooks.beforeWrite=()=>new Promise(resolve=>setTimeout(resolve,40));
 await f.mount();await f.until(()=>f.finishes.length===1);assert.ok(f.finishes[0].sequenceId);assert.equal(f.commits.length,1);
});
for(const id of ids){
test(id+': remounting the same run reuses one complete saved Draft',{timeout:4000},async()=>{
 const f=templateFixture(id);const close=await f.mount();await f.until(()=>f.finishes.length===1);
 assert.ok(f.finishes[0].sequenceId,JSON.stringify(f.finishes));close();
 await f.mount();await f.until(()=>f.finishes.length===2);
 assert.equal(f.commits.length,1,'a new React mount must recover its saved run receipt');
 assert.equal(f.finishes[1].sequenceId,f.finishes[0].sequenceId);
});
test(id+': saved recovery does not need a new-claim UUID or SDK file writes',{timeout:4000},async()=>{
 const f=templateFixture(id);await f.mount();await f.until(()=>f.finishes.length===1);assert.ok(f.finishes[0].sequenceId);
 delete f.selects.files.writeChunk;delete f.selects.files.compareAndReplace;const before=f.requests.length;
 await f.mount({},{cryptoFault:'missing UUID'});await f.until(()=>f.finishes.length===2);
 assert.equal(f.finishes[1].sequenceId,f.finishes[0].sequenceId);assert.equal(f.commits.length,1);assert.equal(f.requests.slice(before).some(r=>r.allowCommit),false);
});
test(id+': separate concurrent panel realms cannot both author the same run',{timeout:4000},async()=>{
 const f=templateFixture(id);await Promise.all([f.mount(),f.mount()]);await f.until(()=>f.finishes.length===2);
 assert.equal(f.commits.length,1);assert.equal(f.saved.size,1);
 assert.ok(f.finishes.some(r=>r.sequenceId));assert.equal(records(f).length,1);
});
test(id+': lost complete-save acknowledgment recovers Main receipt without another save',{timeout:4000},async()=>{
 const f=templateFixture(id);f.hooks.afterReply=input=>{if(input.summary.startsWith('Create complete'))throw Error('response lost');};
 await f.mount();await f.until(()=>f.finishes.length===1);
 assert.ok(f.finishes[0].sequenceId,JSON.stringify(f.finishes));assert.equal(f.commits.length,1);
 await f.mount();await f.until(()=>f.finishes.length===2);assert.equal(f.commits.length,1);
 assert.equal(f.finishes[1].sequenceId,f.finishes[0].sequenceId);
});
test(id+': a late Main receipt survives closing the whole old panel realm',{timeout:4000},async()=>{
 const f=templateFixture(id);let release;
 const held=new Promise(resolve=>{release=resolve;});
 f.hooks.afterReply=async input=>{if(input.summary.startsWith('Create complete'))await held;};
 const close=await f.mount();await f.until(()=>f.commits.length===1);close();
 assert.equal(JSON.parse(f.files.get(records(f)[0])).status,'saved','Main saved the receipt before replying');
 await f.mount();await f.until(()=>f.finishes.length===1);assert.ok(f.finishes[0].sequenceId);
 release();await new Promise(r=>setImmediate(r));assert.equal(f.commits.length,1);assert.equal(f.finishes.length,1);
});
test(id+': changing selected inputs under one run ID cannot reuse or overwrite its receipt',{timeout:4000},async()=>{
 const f=templateFixture(id);await f.mount();await f.until(()=>f.finishes.length===1);
 const key=records(f)[0],before=Buffer.from(f.files.get(key));
 const inputs={photos:[...f.context.template.inputs.photos].reverse()};
 await f.mount({template:{...f.context.template,inputs}});await f.until(()=>f.finishes.length===2);
 assert.ok(f.finishes[1].error);assert.equal(f.commits.length,1);assert.deepEqual(f.files.get(key),before);
});
test(id+': a saved Draft edited after creation is inspected, never rewritten',{timeout:4000},async()=>{
 const f=templateFixture(id);await f.mount();await f.until(()=>f.finishes.length===1);
 f.saved.get(f.finishes[0].sequenceId).frameSize.width=123;
 await f.mount();await f.until(()=>f.finishes.length===2);
 assert.ok(f.finishes[1].error);assert.equal(f.commits.length,1);assert.equal(f.saved.values().next().value.frameSize.width,123);
});
test(id+': corrupt durable state cannot start a replacement save',{timeout:4000},async()=>{
 const f=templateFixture(id);await f.mount();await f.until(()=>f.finishes.length===1);const path=records(f)[0];f.files.set(path,Buffer.from('{broken'));
 await f.mount();await f.until(()=>f.finishes.length===2);assert.ok(f.finishes[1].error);assert.equal(f.commits.length,1);assert.equal(f.files.get(path).toString(),'{broken');
});
test(id+': foreign library ownership stops before importing or saving',{timeout:4000},async()=>{
 const f=templateFixture(id);await f.mount({template:{...f.context.template,libraryId:'other-library'}});await f.until(()=>f.finishes.length===1);
 assert.ok(f.finishes[0].error);assert.equal(f.commits.length,0);assert.equal(f.requests.some(r=>/Import/.test(r.summary)),false);assert.equal(records(f).length,0);
});
test(id+': a lost exclusive-claim reply is read before dispatching once',{timeout:4000},async()=>{
 const f=templateFixture(id);let lost=0;f.hooks.afterWrite=path=>{if(path.includes('/template-runs/')){lost++;throw Error('claim reply lost');}};
 await f.mount();await f.until(()=>f.finishes.length===1);assert.ok(f.finishes[0].sequenceId);assert.equal(f.commits.length,1);
 assert.equal(lost,1);assert.equal(JSON.parse(f.files.get(records(f)[0])).status,'saved');
});
for(const cryptoFault of ['absent crypto','missing digest','missing UUID','noncallable UUID','missing encoder','missing decoder'])test(id+': '+cryptoFault+' asks for host support before recording/importing/authoring',{timeout:4000},async()=>{
 const f=templateFixture(id,{cryptoFault});await f.mount();await f.until(()=>f.finishes.length===1);
 assert.match(f.finishes[0].error,/Update Selects/);assert.equal(f.commits.length,0);assert.equal(records(f).length,0);assert.equal(f.requests.some(r=>r.allowCommit),false);
});
test(id+': explicitly starting a new run can create a revised Draft',{timeout:4000},async()=>{
 const f=templateFixture(id);await f.mount();await f.until(()=>f.finishes.length===1);
 await f.mount({template:{...f.context.template,runId:id+':revision'}});await f.until(()=>f.finishes.length===2);
 assert.ok(f.finishes[1].sequenceId);assert.notEqual(f.finishes[1].sequenceId,f.finishes[0].sequenceId);assert.equal(f.commits.length,2);
});
test(id+': failed effects persist a no-save receipt and never automatically retry',{timeout:4000},async()=>{
 const f=templateFixture(id,{failEffect:true});await f.mount();await f.until(()=>f.finishes.length===1);
 assert.equal(JSON.parse(f.files.get(records(f)[0])).status,'notSaved');assert.equal(f.commits.length,0);
 const before=f.requests.filter(r=>r.summary.startsWith('Create complete')).length;
 await f.mount();await f.until(()=>f.finishes.length===2);assert.ok(f.finishes[1].error);
 assert.equal(f.requests.filter(r=>r.summary.startsWith('Create complete')).length,before);assert.equal(f.commits.length,0);
});
test(id+': generated run authoring survives real minification',{timeout:4000},async()=>{
 const f=templateFixture(id,{minify:true});await f.mount();await f.until(()=>f.finishes.length===1);
 assert.ok(f.finishes[0].sequenceId,JSON.stringify(f.finishes));assert.equal(JSON.parse(f.files.get(records(f)[0])).status,'saved');assert.equal(f.commits.length,1);
});
test(id+': changed Project ownership is checked again immediately before authoring',{timeout:4000},async()=>{
 const f=templateFixture(id),call=f.sdk.call;let checks=0;
 f.sdk.call=async(method,pid)=>{if(method==='getProjectDraftScaffold'&&++checks>1)return {owner:{projectId:pid,libraryId:'moved'}};return call(method,pid);};
 await f.mount();await f.until(()=>f.finishes.length===1);
 assert.match(f.finishes[0].error,/No Draft was created/);assert.equal(f.commits.length,0);assert.equal(JSON.parse(f.files.get(records(f)[0])).status,'notSaved');
});
test(id+': a lost commit receipt is unknown and is never replayed',{timeout:4000},async()=>{
 const f=templateFixture(id,{commitReplyLost:true});await f.mount();await f.until(()=>f.finishes.length===1);
 assert.ok(f.finishes[0].error);assert.equal(f.commits.length,1);assert.equal(JSON.parse(f.files.get(records(f)[0])).status,'outcomeUnknown');
 await f.mount();await f.until(()=>f.finishes.length===2);assert.ok(f.finishes[1].error);assert.equal(f.commits.length,1);
});
test(id+': failed receipt persistence keeps the known saved ID and prevents a blind retry',{timeout:4000},async()=>{
 const f=templateFixture(id);f.selects.files.compareAndReplace=async()=>{throw Error('receipt disk unavailable');};
 await f.mount();await f.until(()=>f.finishes.length===1);assert.ok(f.finishes[0].sequenceId);assert.equal(f.commits.length,1);
 assert.equal(JSON.parse(f.files.get(records(f)[0])).status,'claimed');
 await f.mount();await f.until(()=>f.finishes.length===2);assert.ok(f.finishes[1].error);assert.equal(f.commits.length,1);
});
test(id+': unsupported file capabilities stop before Project imports or saves',{timeout:4000},async()=>{
 const f=templateFixture(id);delete f.selects.files.compareAndReplace;
 await f.mount();await f.until(()=>f.finishes.length===1);assert.ok(f.finishes[0].error);assert.equal(f.commits.length,0);assert.equal(records(f).length,0);
 assert.equal(f.requests.some(r=>/Import/.test(r.summary)),false);
});
for(const member of ['compareAndReplace','writeChunk'])test(id+': noncallable SDK '+member+' stops before claiming or preparing assets',{timeout:4000},async()=>{
 const f=templateFixture(id);f.selects.files[member]={};await f.mount();await f.until(()=>f.finishes.length===1);
 assert.match(f.finishes[0].error,/Update Selects/);assert.equal(f.commits.length,0);assert.equal(records(f).length,0);assert.equal(f.requests.some(r=>r.allowCommit),false);
});
for(const damage of ['duplicate','omitted'])test(id+': a '+damage+' saved Image receipt cannot claim successful recovery',{timeout:4000},async()=>{
 const f=templateFixture(id);await f.mount();await f.until(()=>f.finishes.length===1);const path=records(f)[0],row=JSON.parse(f.files.get(path));
 if(damage==='duplicate')row.result.clips[1]=row.result.clips[0];else row.result.clips.pop();
 f.files.set(path,Buffer.from(JSON.stringify(row)));const before=Buffer.from(f.files.get(path));
 await f.mount();await f.until(()=>f.finishes.length===2);assert.ok(f.finishes[1].error);assert.equal(f.commits.length,1);assert.deepEqual(f.files.get(path),before);
});
test(id+': oversized run records are refused before reading the whole file',{timeout:4000},async()=>{
 const f=templateFixture(id);await f.mount();await f.until(()=>f.finishes.length===1);const path=records(f)[0];f.files.set(path,Buffer.alloc(49153,32));
 const read=f.local.files.readRange;let oversizedReads=0;
 f.local.files.readRange=async(p,...args)=>{if(p===path)oversizedReads++;return read(p,...args);};
 await f.mount();await f.until(()=>f.finishes.length===2);assert.ok(f.finishes[1].error);assert.equal(oversizedReads,0);assert.equal(f.commits.length,1);
});
test(id+': an unreadable journal cannot be replaced by a fresh save',{timeout:4000},async()=>{
 const f=templateFixture(id);await f.mount();await f.until(()=>f.finishes.length===1);const path=records(f)[0],before=Buffer.from(f.files.get(path)),read=f.local.files.readRange;
 f.local.files.readRange=async(p,...args)=>{if(p===path)throw Error('EACCES');return read(p,...args);};
 await f.mount();await f.until(()=>f.finishes.length===2);assert.ok(f.finishes[1].error);assert.equal(f.commits.length,1);assert.deepEqual(f.files.get(path),before);
});
test(id+': a run record growing after stat is read within the bound and refused',{timeout:4000},async()=>{
 const f=templateFixture(id);await f.mount();await f.until(()=>f.finishes.length===1);const path=records(f)[0],read=f.local.files.readRange;let requested=0;
 f.local.files.readRange=async(p,offset,length)=>{if(p===path){requested=length;f.files.set(p,Buffer.alloc(100000,32));}return read(p,offset,length);};
 await f.mount();await f.until(()=>f.finishes.length===2);assert.ok(f.finishes[1].error);assert.ok(requested>0&&requested<=49152);assert.equal(f.commits.length,1);
});
}
test('complete durable-run scripts typecheck and fit the default script budget',async()=>{
 const scripts=[];
 for(const id of ids){const f=templateFixture(id);await f.mount();await f.until(()=>f.finishes.length===1);assert.ok(f.finishes[0].sequenceId);
  for(const input of f.requests){assert.ok(Buffer.byteLength(input.script)<256*1024);scripts.push({name:id+' '+input.summary,script:input.script});}
 }
 assert.ok(checkScriptTypes(scripts).scripts>10);
});

for(const change of ['Project','library'])test('polaroid-photo-dump: same-run '+change+' context replacement stops later preparation',{timeout:4000},async()=>{
 const f=templateFixture('polaroid-photo-dump');let release,enter;
 const held=new Promise(resolve=>{release=resolve;}),entered=new Promise(resolve=>{enter=resolve;});let reached=false;
 f.hooks.afterReply=async input=>{if(input.summary==='Verify original Project Images'&&!reached){reached=true;enter();await held;}};
 const close=await f.mount();await entered;
 close.rerender(change==='Project'?{projectId:'replacement'}:{template:{...f.context.template,libraryId:'replacement'}});
 release();await f.until(()=>f.finishes.length>0||records(f).some(p=>JSON.parse(f.files.get(p)).status==='notSaved'));
 assert.equal(f.commits.length,0);assert.equal(f.requests.some(r=>/^Import bundled/.test(r.summary)),false);assert.equal(f.finishes.length,0,'old scope cannot report completion into replacement context');
 close();
});
for(const field of ['graphics','transforms','audio','programs'])test('polaroid-photo-dump: missing legacy '+field+' evidence is inspected without authoring',{timeout:4000},async()=>{
 const f=templateFixture('polaroid-photo-dump');await f.mount();await f.until(()=>f.finishes.length===1);assert.ok(f.finishes[0].sequenceId);
 const path=records(f)[0],record=JSON.parse(f.files.get(path));delete record.result[field];f.files.set(path,Buffer.from(JSON.stringify(record)));const before=Buffer.from(f.files.get(path)),requests=f.requests.length;
 await f.mount();await f.until(()=>f.finishes.length===2);assert.ok(f.finishes[1].error);assert.equal(f.commits.length,1);assert.equal(f.requests.length,requests);assert.deepEqual(f.files.get(path),before);
});
test('polaroid-photo-dump: display-name changes do not change effective input identity',{timeout:4000},async()=>{
 const f=templateFixture('polaroid-photo-dump');await f.mount();await f.until(()=>f.finishes.length===1);
 const path=records(f)[0],before=Buffer.from(f.files.get(path));
 await f.mount({template:{...f.context.template,inputs:{photos:f.context.template.inputs.photos.map(p=>({...p,name:'Renamed '+p.name}))}}});await f.until(()=>f.finishes.length===2);
 assert.equal(f.finishes[1].sequenceId,f.finishes[0].sequenceId);assert.equal(f.commits.length,1);assert.deepEqual(f.files.get(path),before);
});
