import test from 'node:test';import assert from 'node:assert/strict';import {loadMediaClient} from './local_media_fixture.mjs';
async function fixture({status,cancel=async()=>{},start=async()=>({jobId:'owned-job'})}){
 const requests=[],calls=[];
 const sdk={runScript:async input=>{requests.push(input);if(input.script.includes('files.environment'))return {result:{platform:'darwin',homedir:'/fixture',tempDirectory:'/fixture/tmp'}};if(input.script.includes('media.startFFmpeg'))return {result:await start()};if(input.script.includes('.cancel()')){await cancel();return {};}throw Error('Unexpected script');},call:async(method,id,input)=>{assert.equal(method,'getLocalMediaJobStatus');assert.equal(id,'owned-job');calls.push(input);return status(input);}};
 const client=await loadMediaClient(sdk);return {client,requests,calls,starts:()=>requests.filter(r=>r.script.includes('media.startFFmpeg')).length,cancels:()=>requests.filter(r=>r.script.includes('.cancel()')).length};
}
const page=(state='succeeded')=>({state,events:[],nextCursor:0,truncated:false});
test('local media lifetime: unknown status cannot be accepted as completed processing',async()=>{
 let reads=0;const f=await fixture({status:()=>page(++reads===1?'not-a-job-state':'cancelled')});await assert.rejects(f.client.media.runFFmpeg(['-version']),e=>e.terminal===true&&/status|confirm/i.test(e.message));assert.equal(f.starts(),1);
});
test('local media lifetime: a failed status read and acknowledged abort do not prove native process exit',async()=>{
 let running=true,reads=0,read;const firstRead=new Promise(r=>read=r),f=await fixture({status:()=>{reads++;if(reads===1){read();throw Error('controlled status transport loss');}return page(running?'running':'cancelled');}});
 let settled=false,error;const work=f.client.media.runFFmpeg(['-version']).then(()=>{settled=true;},e=>{settled=true;error=e;});
 try{await firstRead;await new Promise(r=>setImmediate(r));assert.equal(settled,false,'native cancel only requests abort; the client must observe later process settlement');}
 finally{running=false;await work;}
 assert.ok(error);assert.equal(f.starts(),1);assert.equal(f.cancels(),1,'read recovery must not replay a cancel request');
});
test('local media lifetime: lost cancel reply is observed through status without another cancel request',async()=>{
 let stopped=false;const controller=new AbortController(),f=await fixture({status:()=>page(stopped?'cancelled':'running'),cancel:async()=>{stopped=true;throw Error('controlled lost cancel reply');}});
 const work=f.client.media.runFFmpeg(['-version'],true,controller.signal);await new Promise(r=>setImmediate(r));controller.abort();await assert.rejects(work);assert.equal(f.cancels(),1,'the returned job identity supports read-only cancellation recovery');
});

for(const status of [null,{...page(),nextCursor:1},{...page(),events:[{cursor:2,stream:'stdout',text:'missing earlier log'}],nextCursor:2},{...page(),events:[{cursor:1,stream:'unknown',text:'bad stream'}],nextCursor:1},{...page(),events:[{cursor:1,stream:'stdout',text:'x'.repeat(4097)}],nextCursor:1}])test('local media protocol: incomplete output is never accepted '+JSON.stringify(status).slice(0,100),async()=>{
 let first=true;const f=await fixture({status:()=>{if(first){first=false;return status;}return {...page(),nextCursor:status?.nextCursor??0};}});await assert.rejects(f.client.media.runFFmpeg(['-version']),e=>e.terminal);assert.equal(f.starts(),1);
});
test('local media protocol: cumulative output has a bounded byte budget',async()=>{
 let cursor=0;const f=await fixture({status:()=>{if(cursor>=1032)return {...page(),nextCursor:cursor};const events=Array.from({length:8},()=>({cursor:++cursor,stream:'stdout',text:'x'.repeat(4096)}));return {...page(),events,nextCursor:cursor};}});
 await assert.rejects(f.client.media.runFFmpeg(['-version']),e=>e.terminal&&/budget|limit|large/i.test(e.message));assert.equal(f.starts(),1);
});
test('local media startup: a lost start reply cannot be replayed or counted as a decoder failure',async()=>{
 const f=await fixture({status:()=>page(),start:async()=>{throw Error('controlled lost start reply');}});await assert.rejects(f.client.media.runFFmpeg(['-version']),e=>e.code==='LOCAL_MEDIA_START_UNKNOWN'&&e.terminal&&e.preserveTemporaryFiles);assert.equal(f.starts(),1);assert.equal(f.calls.length,0);assert.equal(f.cancels(),0);
});
test('local media startup: cancellation while the start reply is pending has a bounded unknown outcome and cancels a late identity once',async()=>{
 let release;const controller=new AbortController(),f=await fixture({status:()=>page('cancelled'),start:()=>new Promise(r=>release=r)});let failure;
 const work=f.client.media.runFFmpeg(['-version'],true,controller.signal).catch(e=>{failure=e;});await new Promise(r=>setImmediate(r));controller.abort();
 const expired=await Promise.race([work.then(()=>true),new Promise(r=>setTimeout(()=>r(false),5500))]);release({jobId:'owned-job'});await work;await new Promise(r=>setImmediate(r));assert.equal(expired,true,'an unobserved start cannot keep the caller alive forever');assert.ok(failure?.preserveTemporaryFiles);assert.equal(f.starts(),1);assert.equal(f.cancels(),1);
});

for(const input of [{args:['bad\0argument']},{args:[3]},{args:[],signal:{aborted:false}},{args:[],onStdout:4}])test('local media input: invalid argv and subscriptions fail before creating a native job '+JSON.stringify(input),async()=>{
 const f=await fixture({status:()=>page()});await assert.rejects(f.client.media.runFFmpeg(input.args,true,input.signal,input.onStdout),e=>e.code==='LOCAL_MEDIA_INPUT'&&!e.preserveTemporaryFiles);assert.equal(f.starts(),0);
});
