const test=require('node:test');
const assert=require('node:assert/strict');
const {fixture,request}=require('./shared_ai_fixture.cjs');
const fs=require('node:fs'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
// Control the platform clock, rather than depending on CI CPU scheduling to
// fit setup and hashing inside a small observation budget.
function clockFixture(states){
 let now=0;const module={exports:{}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../shared/ai-job-client.cjs'),'utf8'),
  {module,crypto:webcrypto,TextEncoder,setTimeout,clearTimeout,performance:{now:()=>now}});
 const f=fixture(states,module.exports.createSharedAiJobClient);f.advance=ms=>{now+=ms;};return f;
}

test('one failed status read recovers without another submit or cancel',async()=>{
 const f=fixture();let fail=true;
 f.hooks.status=()=>{if(fail){fail=false;throw Error('status offline');}};
 const result=await f.make().run(request);
 assert.equal(result.workflowId,'ai:1');assert.equal(f.calls.status,2);
 assert.equal(f.calls.submit,1);assert.equal(f.calls.cancel,0);
});
test('exhausted status reads remain pending and reopening recovers the acknowledged job',async()=>{
 const f=fixture();f.hooks.status=()=>{throw Error('status offline');};
 await assert.rejects(f.make().run(request),error=>error.code==='SHARED_AI_OBSERVATION_PENDING'&&error.workflowId==='ai:1'&&error.cause?.message==='status offline');
 assert.equal(f.calls.status,3);assert.equal(f.calls.submit,1);assert.equal(f.calls.cancel,0);
 assert.equal(f.journal.records[0].status,undefined);
 delete f.hooks.status;await f.make().run(request);assert.equal(f.calls.submit,1);
});
test('a failed result read is retried without resubmitting completed inference',async()=>{
 const f=fixture();let fail=true;
 f.hooks.result=(_job,workflowId)=>{if(fail){fail=false;throw Error('result offline');}return {workflowId,task:request.task,files:{}};};
 await f.make().run(request);
 assert.equal(f.calls.result,2);assert.equal(f.calls.submit,1);
 assert.equal(f.journal.records[0].status,'succeeded');
});
test('invalid ownership is refused once, rather than retried as a transport failure',async()=>{
 const f=fixture();f.hooks.result=()=>({workflowId:'foreign',task:request.task,files:{}});
 await assert.rejects(f.make().run(request),{code:'SHARED_AI_INVALID'});
 assert.equal(f.calls.result,1);assert.equal(f.calls.submit,1);
});
test('saving an observation cannot be retried by the read retry loop',async()=>{
 const f=fixture();f.hooks.save=journal=>{if(journal.records[0]?.status)throw Error('EACCES');};
 await assert.rejects(f.make().run(request),/EACCES/);
 assert.equal(f.calls.status,1);assert.equal(f.calls.submit,1);
});
test('server failure stays terminal without another read or submit',async()=>{
 const f=fixture(['failed']);await assert.rejects(f.make().run(request),{code:'SHARED_AI_FAILED'});
 assert.equal(f.calls.status,1);assert.equal(f.calls.submit,1);assert.equal(f.calls.cancel,0);
});
test('a lost submit acknowledgement is not automatically retried',async()=>{
 const f=fixture();f.hooks.afterSubmit=()=>{throw Error('submit offline');};
 await assert.rejects(f.make().run(request),/submit offline/);
 assert.equal(f.calls.submit,1);assert.equal(f.calls.status,0);
 assert.equal(f.journal.records[0].workflowId,undefined);
});
test('a cancellation write is not automatically retried after a transport failure',async()=>{
 const f=fixture(['running']),c=new AbortController(),client=f.make();
 await assert.rejects(client.run(request,{signal:c.signal,onProgress:()=>c.abort()}),{code:'SHARED_AI_DETACHED'});
 f.hooks.cancel=()=>{throw Error('cancel offline');};
 await assert.rejects(client.cancel(),/cancel offline/);
 assert.equal(f.calls.cancel,1);assert.equal(f.journal.records[0].cancelRequested,true);
});
test('canceling status reads can recover without repeating the cancellation write',async()=>{
 const f=fixture(['running']),c=new AbortController(),client=f.make();
 await assert.rejects(client.run(request,{signal:c.signal,onProgress:()=>c.abort()}),{code:'SHARED_AI_DETACHED'});
 f.hooks.cancelStatus='canceling';let fail=true;
 f.hooks.status=()=>{if(fail){fail=false;throw Error('status offline');}f.jobs.get('ai:1').statuses=['canceled'];};
 await client.cancel();assert.equal(f.calls.cancel,1);assert.equal(f.calls.status,3);
 assert.equal(f.journal.records[0].status,'canceled');
});
test('exhausted cancel observation preserves canceling state and the saved request',async()=>{
 const f=fixture(['running']),c=new AbortController(),client=f.make();
 await assert.rejects(client.run(request,{signal:c.signal,onProgress:()=>c.abort()}),{code:'SHARED_AI_DETACHED'});
 f.hooks.cancelStatus='canceling';f.hooks.status=()=>{throw Error('status offline');};
 await assert.rejects(client.cancel(),error=>error.code==='SHARED_AI_CANCEL_PENDING'&&error.workflowId==='ai:1');
 assert.equal(f.calls.cancel,1);assert.equal(f.journal.records[0].cancelRequested,true);
 assert.equal(f.journal.records[0].status,'canceling');
});
test('exhausted result observation retains succeeded inference for reopening',async()=>{
 const f=fixture();f.hooks.result=()=>{throw Error('result offline');};
 await assert.rejects(f.make().run(request),{code:'SHARED_AI_OBSERVATION_PENDING'});
 assert.equal(f.calls.result,3);assert.equal(f.journal.records[0].status,'succeeded');
 delete f.hooks.result;await f.make().run(request);assert.equal(f.calls.submit,1);
});
test('the overall budget caps a retry delay instead of extending it',{timeout:1000},async()=>{
 const f=clockFixture();f.hooks.status=()=>{throw Error('status offline');};
 await assert.rejects(f.make().run(request,{maxWaitMs:80,readRetryMs:60000}),{code:'SHARED_AI_OBSERVATION_PENDING'});
 assert.equal(f.calls.status,1);assert.equal(f.calls.submit,1);
});
test('a running job has a bounded observation budget and retains its recovery identity',{timeout:1000},async t=>{
 const f=clockFixture(['running']),c=new AbortController();t.after(()=>c.abort());
 await assert.rejects(f.make().run(request,{maxWaitMs:80,signal:c.signal,onProgress:()=>f.advance(80)}),error=>error.code==='SHARED_AI_OBSERVATION_PENDING'&&error.workflowId==='ai:1');
 assert.equal(f.journal.records[0].status,'running');assert.equal(f.calls.submit,1);assert.equal(f.calls.cancel,0);
 f.jobs.get('ai:1').statuses=['succeeded'];
 await f.make().run(request);assert.equal(f.calls.submit,1);
});
test('a hung status read returns pending; its late reply cannot rewrite the journal',{timeout:1000},async()=>{
 const f=clockFixture();let release;f.hooks.status=()=>new Promise(resolve=>{release=resolve;});
 await assert.rejects(f.make().run(request,{maxWaitMs:200,readTimeoutMs:5}),{code:'SHARED_AI_OBSERVATION_PENDING'});
 assert.equal(f.calls.status,3);assert.equal(f.journal.records[0].status,undefined);
 release();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.journal.records[0].status,undefined);assert.equal(f.calls.cancel,0);
});
test('detaching interrupts a hung read without canceling inference',{timeout:1000},async()=>{
 const f=fixture(),c=new AbortController();
 f.hooks.status=()=>{queueMicrotask(()=>c.abort());return new Promise(()=>{});};
 await assert.rejects(f.make().run(request,{signal:c.signal}),{code:'SHARED_AI_DETACHED'});
 assert.equal(f.calls.status,1);assert.equal(f.calls.cancel,0);assert.equal(f.journal.records[0].workflowId,'ai:1');
});
test('detaching interrupts a long polling delay',{timeout:1000},async()=>{
 const f=fixture(['running']),c=new AbortController();
 await assert.rejects(f.make().run(request,{pollMs:60000,signal:c.signal,onProgress:()=>queueMicrotask(()=>c.abort())}),{code:'SHARED_AI_DETACHED'});
 assert.equal(f.calls.status,1);assert.equal(f.calls.cancel,0);
});
test('prompt detach does not pretend an independent cancellation write has settled',{timeout:1000},async()=>{
 const f=fixture(['running']),controller=new AbortController(),client=f.make();
 let release,started,cancel;
 const held=new Promise(resolve=>{release=resolve;}),cancelStarted=new Promise(resolve=>{started=resolve;});
 f.hooks.save=async journal=>{if(journal.records.some(r=>r.cancelRequested&&!r.status?.includes('canceled'))){started();await held;}};
 controller.signal.addEventListener('abort',()=>{cancel=client.cancel();},{once:true});
 await assert.rejects(client.run(request,{signal:controller.signal,pollMs:60000,onProgress:()=>controller.abort()}),{code:'SHARED_AI_DETACHED'});
 await cancelStarted;assert.equal(f.calls.cancel,0);
 release();await cancel;
 assert.equal(f.calls.cancel,1);assert.equal(f.journal.records[0].status,'canceled');
});
for(const options of [{maxWaitMs:0},{maxWaitMs:Infinity},{maxWaitMs:NaN},{pollMs:-1},{readTimeoutMs:0},{readRetryMs:-1}])test('invalid observation timing stops before submitting: '+JSON.stringify(options),async()=>{
 const f=fixture();await assert.rejects(f.make().run(request,options),{code:'SHARED_AI_INVALID'});assert.equal(f.calls.submit,0);
});
