import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const source=fs.readFileSync(new URL('../shared/bundled-assets.js',import.meta.url),'utf8');
const load=()=>vm.runInNewContext(source+'\nrunAssetMediaTool',{AbortController,setTimeout,clearTimeout});
test('shared asset media runner retains the receiver and completed response',async()=>{
 const run=load(),media={token:'owned',runFFmpeg:async function(args,quiet,signal){assert.equal(this.token,'owned');assert.deepEqual(Array.from(args),['-version']);assert.equal(quiet,true);assert.equal(signal.aborted,false);return {stdout:'complete'};}};
 assert.equal((await run(media,'runFFmpeg',['-version'],{timeoutMs:1000})).stdout,'complete');
});
test('shared asset media runner rejects pre-aborted work before dispatch',async()=>{
 const run=load(),controller=new AbortController();controller.abort();let calls=0;
 await assert.rejects(run({runFFmpeg:async()=>calls++},'runFFmpeg',[],{signal:controller.signal}),e=>e.code==='BUNDLED_ASSET_STOPPED'&&e.terminal);
 assert.equal(calls,0);
});
test('shared asset media runner cancels a detached owner and discards a late response',async()=>{
 const run=load();let live=true,signal;
 const promise=run({runFFmpeg:async(a,q,s)=>{signal=s;live=false;await new Promise(r=>setTimeout(r,80));return {stdout:'late'};}},'runFFmpeg',[],{isCurrent:()=>live});
 await assert.rejects(promise,e=>e.code==='BUNDLED_ASSET_STOPPED'&&e.terminal);assert.equal(signal.aborted,true);
});
test('shared asset media runner discards completion after its deadline',async()=>{
 const run=load();let signal;
 await assert.rejects(run({runFFmpeg:async(a,q,s)=>{signal=s;await new Promise(r=>setTimeout(r,40));return {stdout:'late'};}},'runFFmpeg',[],{timeoutMs:10}),e=>e.code==='BUNDLED_ASSET_TIMEOUT'&&e.terminal);assert.equal(signal.aborted,true);
});
for(const options of [null,[],{timeoutMs:0},{isCurrent:false},{deadline:NaN}])test('shared asset media runner validates '+JSON.stringify(options)+' before dispatch',async()=>{
 const run=load();let calls=0;await assert.rejects(run({runFFmpeg:async()=>calls++},'runFFmpeg',[],options),e=>e.code==='BUNDLED_ASSET_INPUT');assert.equal(calls,0);
});
test('shared asset media runner rechecks scope on same-turn settlement',async()=>{
 const run=load();for(const reject of [false,true]){let live=true;
 await assert.rejects(run({runFFmpeg:async()=>{live=false;if(reject)throw Error('late failure');return {stdout:'stale'};}},'runFFmpeg',[],{isCurrent:()=>live}),e=>e.code==='BUNDLED_ASSET_STOPPED');}
});
test('shared asset media runner checks elapsed time when a blocked loop delays its timer',async()=>{
 const run=load();for(const reject of [false,true])await assert.rejects(run({runFFmpeg:async()=>{const end=Date.now()+20;while(Date.now()<end){}if(reject)throw Error('late failure');return {stdout:'late'};}},'runFFmpeg',[],{timeoutMs:5}),e=>e.code==='BUNDLED_ASSET_TIMEOUT');
});
test('shared asset media runner preserves private failures only as causes',async()=>{
 const run=load();await assert.rejects(run({runFFmpeg:async()=>{throw Error('private paths and diagnostics');}},'runFFmpeg',[]),e=>e.code==='BUNDLED_ASSET_MEDIA'&&!e.publicMessage.includes('private paths')&&e.cause.message.includes('private paths'));
});
