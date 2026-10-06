'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createPassJournal}=require('../src/pipeline/facePassJournal.cjs');
const {asyncMemoryFiles}=require('./sdk-fixture.cjs');
const {faceInput,runRecord}=require('../src/pipeline/sharedAiFaces.cjs');
const input=key=>faceInput('project','raw-video',{f0:0,f1:24,step:4},24,key);
function memory() {
 const files=new Map();const storage={...asyncMemoryFiles(files),join:(...p)=>p.join('/'),exists:async p=>files.has(p)||[...files.keys()].some(name=>name.startsWith(p+'/')),readdir:async p=>[...files.keys()].filter(name=>name.startsWith(p+'/')).map(name=>name.slice(p.length+1)),readFile:async p=>files.get(p),writeFile:async(p,v)=>files.set(p,v),rename:async (a,b)=>{assert.ok(files.has(a));files.set(b,files.get(a));files.delete(a);}};
 return {files,storage};
}
for(const oldStatus of ['succeeded','canceled'])test('independent realm late '+oldStatus+' history write cannot restore an old active generation',async()=>{
 const {files,storage}=memory(),dir='owned';
 const old={input:input('old-key'),workflowId:'ai:old',status:oldStatus};
 files.set(dir+'/face-ai-jobs.json',JSON.stringify({version:1,generation:'previous-schema',records:[old]}));
 let release,started;const waiting=new Promise(r=>started=r);const write=storage.writeFile;
 storage.writeFile=async(p,v)=>{if(p.startsWith(dir+'/face-ai-jobs.json.tmp-')){started();await new Promise(r=>release=r);}return write(p,v);};
 const stale=createPassJournal(storage,dir,()=> 'old-nonce');
 const reopened=createPassJournal(storage,dir,()=> 'fresh-nonce');
 const pending=stale.saveRecord('legacy',old);const rejected=assert.rejects(pending,/older pass/);
 await waiting;await reopened.newPass();release();await rejected;
 const current=await reopened.read();assert.equal(current.generation,'fresh-nonce');assert.equal(current.records.length,0);
 await reopened.saveRecord(current.generation,{input:input('new-key'),workflowId:'ai:new',status:'queued'});
 assert.equal((await stale.read()).records[0].workflowId,'ai:new');
 assert.equal(JSON.parse(files.get(dir+'/face-ai-current.json')).generation,'fresh-nonce');
 assert.equal(JSON.parse(files.get(dir+'/face-ai-jobs.json')).records[0].workflowId,'ai:old');
});
test('only an explicit new pass changes the active pointer, and pending input cannot be discarded',async()=>{
 const {files,storage}=memory(),owner=createPassJournal(storage,'owned',()=> 'pass-id');
 const book=await owner.read();await owner.saveRecord(book.generation,{input:input('stable-key')});
 assert.equal(files.has('owned/face-ai-current.json'),false);
 await assert.rejects(owner.newPass(),/pending/);assert.equal((await owner.read()).records[0].input.requestKey,'stable-key');
});
test('failed durable journal write prevents any public submission',async()=>{
 const {storage}=memory();storage.writeFile=async()=>{throw Error('disk full');};const owner=createPassJournal(storage,'owned');let calls=0;
 await assert.rejects(runRecord({input:input('stable-key')},{save:r=>owner.saveRecord('legacy',r),run:async()=>calls++,sleep:async()=>{}}),/disk full/);
 assert.equal(calls,0);
});
test('same-generation status writes retain an explicit cancellation intent',async()=>{
 const {storage}=memory(),owner=createPassJournal(storage,'owned');
 await owner.saveRecord('legacy',{input:input('stable-key'),workflowId:'ai:job',status:'running',cancelRequested:true});
 await owner.saveRecord('legacy',{input:input('stable-key'),workflowId:'ai:job',status:'running'});
 assert.equal((await owner.read()).records[0].cancelRequested,true);
});
test('legacy completed jobs are read without rewriting user recovery data',async()=>{
 const {files,storage}=memory(),filename='owned/face-ai-jobs.json';const text=JSON.stringify({version:1,records:[{input:input('old-key'),workflowId:'ai:old',status:'succeeded'}]});files.set(filename,text);
 const owner=createPassJournal(storage,'owned');assert.equal((await owner.read()).generation,'legacy');assert.equal(files.get(filename),text);
});

test('cross-realm stale status writes cannot erase a durable unknown-ACK cancellation intent',async()=>{
 const {files,storage}=memory(),dir='owned';const record={input:input('same-key'),workflowId:'ai:job',status:'running'};
 files.set(dir+'/face-ai-jobs.json',JSON.stringify({version:1,records:[record]}));
 let release,started;const ready=new Promise(r=>started=r);const original=storage.writeFile;let held=false;
 storage.writeFile=async(p,v)=>{if(!held&&p.startsWith(dir+'/face-ai-jobs.json.tmp-')){held=true;started();await new Promise(r=>release=r);}return original(p,v);};
 const old=createPassJournal(storage,dir,()=> 'old-nonce'),cancel=createPassJournal(storage,dir,()=> 'cancel-nonce');
 const pending=old.saveRecord('legacy',{...record});await ready;
 await cancel.saveRecord('legacy',{...record,cancelRequested:true});release();await pending;
 const recovered=(await createPassJournal(storage,dir).read()).records[0];assert.equal(recovered.cancelRequested,true);
 const observed={...record};await old.refreshRecord('legacy',observed);assert.equal(observed.cancelRequested,true);
});
test('immutable request receipts recover rows lost by another realm stale registry write',async()=>{
 const {storage}=memory(),dir='owned';let release,started;const ready=new Promise(r=>started=r),write=storage.writeFile;let held=false;
 storage.writeFile=async(p,v)=>{if(!held&&p.startsWith(dir+'/face-ai-jobs.json.tmp-')){held=true;started();await new Promise(r=>release=r);}return write(p,v);};
 const a=createPassJournal(storage,dir,()=> 'a-nonce'),b=createPassJournal(storage,dir,()=> 'b-nonce');
 const pending=a.saveRecord('legacy',{input:input('key-a'),status:'queued'});await ready;
 await b.saveRecord('legacy',{input:input('key-b'),status:'queued'});release();await pending;
 const rows=(await b.read()).records;assert.deepEqual(rows.map(r=>r.input.requestKey).sort(),['key-a','key-b']);
});

test('a deferred old new-pass command cannot publish over a later active running pass',async()=>{
 const {files,storage}=memory();let release,started;const waiting=new Promise(r=>started=r),write=storage.writeFile;
 storage.writeFile=async(p,v)=>{if(p.startsWith('owned/face-ai-pass-old-pass.json.tmp-')){started();await new Promise(r=>release=r);}return write(p,v);};
 const old=createPassJournal(storage,'owned',()=> 'old-pass'),next=createPassJournal(storage,'owned',()=> 'next-pass');
 const pending=old.newPass(),rejected=assert.rejects(pending,/newer face pass/);await waiting;
 await next.newPass();await next.saveRecord('next-pass',{input:input('running-key'),workflowId:'ai:new',status:'running'});
 release();await rejected;const active=await old.read();assert.equal(active.generation,'next-pass');assert.equal(active.records[0].workflowId,'ai:new');
});
test('closing during a new-pass data write leaves the active pass untouched',async()=>{
 const {files,storage}=memory(),ac=new AbortController();let release,started;const waiting=new Promise(r=>started=r),write=storage.writeFile;
 storage.writeFile=async(p,v)=>{if(p.startsWith('owned/face-ai-pass-detached-pass.json.tmp-')){started();await new Promise(r=>release=r);}return write(p,v);};
 const owner=createPassJournal(storage,'owned',()=> 'detached-pass');
 const pending=owner.newPass(ac.signal),rejected=assert.rejects(pending,/detached/);await waiting;ac.abort();release();await rejected;
 assert.equal(files.has('owned/face-ai-current.json'),false);assert.equal((await owner.read()).generation,'legacy');
});

test('a delayed compare-and-replace cannot publish over a newer panel realm',async()=>{
 const {files,storage}=memory();let release,started;const entered=new Promise(resolve=>started=resolve),replace=storage.compareAndReplace;
 storage.compareAndReplace=async(path,expected,text)=>{
  if(JSON.parse(text).generation==='first'){started();await new Promise(resolve=>release=resolve);}
  return replace(path,expected,text);
 };
 const first=createPassJournal(storage,'owned',()=> 'first'),second=createPassJournal(storage,'owned',()=> 'second');
 const publishing=first.newPass(),rejected=assert.rejects(publishing,/newer face pass/);await entered;
 await second.newPass();release();await rejected;
 assert.equal(JSON.parse(files.get('owned/face-ai-current.json')).generation,'second');
});
test('dispatched publication may finish after detachment and is recovered without a new pass',async()=>{
 const {files,storage}=memory(),controller=new AbortController();let release,started;const entered=new Promise(resolve=>started=resolve),replace=storage.compareAndReplace;
 storage.compareAndReplace=async(...args)=>{started();await new Promise(resolve=>release=resolve);return replace(...args);};
 const owner=createPassJournal(storage,'owned',()=> 'committed');
 const pending=owner.newPass(controller.signal);await entered;controller.abort();release();await pending;
 assert.equal((await createPassJournal(storage,'owned').read()).generation,'committed');
 assert.equal(JSON.parse(files.get('owned/face-ai-current.json')).generation,'committed');
});
