'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {asyncMemoryFiles}=require('./sdk-fixture.cjs');
const {createPassJournal}=require('../src/pipeline/facePassJournal.cjs');
const {faceInput,faceRequestRecord,latestFaceRecords,runRecord}=require('../src/pipeline/sharedAiFaces.cjs');
const input=key=>faceInput('project','raw-video',{f0:0,f1:24,step:4},24,key);
function fixture() {
 const files=new Map(),dir='owned/reels/reel';
 const storage={...asyncMemoryFiles(files),join:(...p)=>p.join('/'),exists:async p=>files.has(p)||[...files.keys()].some(n=>n.startsWith(p+'/')),readdir:async p=>[...files.keys()].filter(n=>n.startsWith(p+'/')).map(n=>n.slice(p.length+1)),readFile:async p=>files.get(p),writeFile:async(p,v)=>files.set(p,v),rename:async (a,b)=>{assert.ok(files.has(a));files.set(b,files.get(a));files.delete(a);}};
 const owner=createPassJournal(storage,dir);
 return {files,dir,storage,owner};
}
for(const status of ['failed','canceled'])test('explicit Rebuild retries a completed '+status+' input once with a deterministic isolated key',async()=>{
 const old={input:input('old-key'),workflowId:'ai:old',status,cancelRequested:true};
 const a=await faceRequestRecord([old],input('ignored'),'legacy','owned/reel',true);
 const b=await faceRequestRecord([old],input('another-ignored'),'legacy','owned/reel',true);
 assert.equal(a.input.requestKey,b.input.requestKey);assert.notEqual(a.input.requestKey,old.input.requestKey);
 assert.equal(a.retryAttempt,1);assert.equal(a.retryOf,'old-key');assert.equal(a.workflowId,undefined);assert.equal(a.cancelRequested,undefined);
 const other=await faceRequestRecord([old],input('ignored'),'legacy','owned/another-reel',true);
 assert.notEqual(a.input.requestKey,other.input.requestKey);
});
test('recovery and Rebuild preserve unknown, active and successful request identities',async()=>{
 for(const status of [undefined,'queued','running','canceling','succeeded']){
  const old={input:input('old-key'),workflowId:status===undefined?undefined:'ai:old',status};
  assert.equal(await faceRequestRecord([old],input('ignored'),'legacy','owned',true),old);
 }
 const failed={input:input('old-key'),workflowId:'ai:old',status:'failed'};
 assert.equal(await faceRequestRecord([failed],input('ignored'),'legacy','owned',false),failed);
});
test('a newer retry wins over late old terminal history and preserves partial successes',async()=>{
 const failed={input:input('old-key'),workflowId:'ai:old',status:'failed'};
 const retry=await faceRequestRecord([failed],input('ignored'),'legacy','owned',true);
 retry.status='running';retry.workflowId='ai:retry';
 const successful={input:{...input('other-key'),resourceId:'another-video'},workflowId:'ai:successful',status:'succeeded'};
 assert.equal(await faceRequestRecord([retry,successful,failed],input('ignored'),'legacy','owned',true),retry);
 assert.deepEqual(latestFaceRecords([failed,retry,successful]).map(r=>r.workflowId),['ai:retry','ai:successful']);
 assert.equal(await faceRequestRecord([failed,retry,successful],successful.input,'legacy','owned',true),successful);
});
test('a persisted retry with a lost submission ACK recovers the same new key and one host job',async()=>{
 const {owner}=fixture();const failed={input:input('old-key'),workflowId:'ai:old',status:'failed'};
 await owner.saveRecord('legacy',failed);
 const retry=await faceRequestRecord((await owner.read()).records,input('ignored'),'legacy','owned',true);
 const keys=[],jobs=new Map();let lost=true;
 const api=record=>({save:()=>owner.saveRecord('legacy',record),refresh:()=>owner.refreshRecord('legacy',record),sleep:async()=>{},run:async script=>{
  if(script.includes('.submit(')){
   keys.push(record.input.requestKey);jobs.set(record.input.requestKey,'ai:retry');
   if(lost){lost=false;throw Error('ACK lost');}return {workflowId:jobs.get(record.input.requestKey)};
  }
  return {workflowId:'ai:retry',projectId:'project',status:'succeeded'};
 }});
 await assert.rejects(runRecord(retry,api(retry)),/ACK lost/);
 const recovering=await faceRequestRecord((await owner.read()).records,input('ignored'),'legacy','owned',true);
 assert.equal(recovering.retryAttempt,1);assert.equal(recovering.input.requestKey,retry.input.requestKey);
 await runRecord(recovering,api(recovering));assert.deepEqual(keys,[retry.input.requestKey,retry.input.requestKey]);assert.equal(jobs.size,1);
});
test('retry receipts retain latest rank after another realm overwrites the registry with old history',async()=>{
 const {files,dir,owner}=fixture();const old={input:input('old-key'),workflowId:'ai:old',status:'failed'};
 await owner.saveRecord('legacy',old);
 const retry=await faceRequestRecord([old],input('ignored'),'legacy',dir,true);await owner.saveRecord('legacy',retry);
 files.set(dir+'/face-ai-jobs.json',JSON.stringify({version:1,records:[old]}));
 const records=(await owner.read()).records,recovered=await faceRequestRecord(records,input('ignored'),'legacy',dir,true);
 assert.equal(recovered.input.requestKey,retry.input.requestKey);assert.equal(recovered.retryAttempt,1);assert.equal(recovered.retryOf,'old-key');
 assert.equal(recovered.status,undefined);
});
test('sticky cancellation stays on its original key and late writes do not cancel the retry',async()=>{
 const {owner,dir}=fixture();const old={input:input('old-key'),workflowId:'ai:old',status:'canceled',cancelRequested:true};
 await owner.saveRecord('legacy',old);
 const retry=await faceRequestRecord([old],input('ignored'),'legacy',dir,true);retry.status='running';retry.workflowId='ai:retry';
 await owner.saveRecord('legacy',retry);await owner.saveRecord('legacy',{...old,status:'running'});
 const latest=latestFaceRecords((await owner.read()).records);assert.equal(latest.length,1);assert.equal(latest[0].workflowId,'ai:retry');assert.equal(latest[0].cancelRequested,undefined);
});
test('terminal failure of a new attempt needs another explicit Rebuild before retrying again',async()=>{
 const old={input:input('old-key'),workflowId:'ai:old',status:'failed'};
 const first=await faceRequestRecord([old],input('ignored'),'legacy','owned',true);first.status='failed';first.workflowId='ai:failed-retry';
 assert.equal(await faceRequestRecord([old,first],input('ignored'),'legacy','owned',false),first);
 const second=await faceRequestRecord([old,first],input('ignored'),'legacy','owned',true);
 assert.equal(second.retryAttempt,2);assert.equal(second.retryOf,first.input.requestKey);assert.notEqual(second.input.requestKey,first.input.requestKey);
});
test('a late retry journal write cannot publish into an explicitly replaced face pass',async()=>{
 const {owner,files,dir,storage}=fixture();const old={input:input('old-key'),workflowId:'ai:old',status:'failed'};
 await owner.saveRecord('legacy',old);
 const retry=await faceRequestRecord([old],input('ignored'),'legacy',dir,true);
 let release,started;const waiting=new Promise(r=>started=r),write=storage.writeFile;
 storage.writeFile=async(p,v)=>{if(p.startsWith(dir+'/face-ai-input-legacy-'+retry.input.requestKey+'.json.tmp-')){started();await new Promise(r=>release=r);}return write(p,v);};
 const pending=owner.saveRecord('legacy',retry),rejected=assert.rejects(pending,/older pass/);await waiting;
 await createPassJournal(storage,dir,()=> 'new-pass').newPass();release();await rejected;
 assert.equal((await owner.read()).generation,'new-pass');assert.equal((await owner.read()).records.length,0);assert.ok(files.has(dir+'/face-ai-current.json'));
});
test('an obsolete unknown receipt cannot block a new pass after its latest retry succeeds',async()=>{
 const {owner,files,dir}=fixture();const old={input:input('old-key'),workflowId:'ai:old',status:'failed'};
 await owner.saveRecord('legacy',old);
 const retry=await faceRequestRecord([old],input('ignored'),'legacy',dir,true);retry.status='succeeded';retry.workflowId='ai:retry';
 await owner.saveRecord('legacy',retry);
 // A stale registry rename can omit old status; its immutable receipt restores
 // the input as unknown, even though that input's current retry is complete.
 files.set(dir+'/face-ai-jobs.json',JSON.stringify({version:1,records:[retry]}));
 assert.equal((await owner.read()).records.find(r=>r.input.requestKey==='old-key').status,undefined);
 await owner.newPass();assert.notEqual((await owner.read()).generation,'legacy');assert.equal((await owner.read()).records.length,0);
});
for(const status of [undefined,'queued','running','canceling'])test('the latest retry '+String(status)+' still blocks an explicit new pass',async()=>{
 const {owner,files,dir}=fixture();const old={input:input('old-key'),workflowId:'ai:old',status:'failed'};
 await owner.saveRecord('legacy',old);
 const retry=await faceRequestRecord([old],input('ignored'),'legacy',dir,true);retry.status=status;
 await owner.saveRecord('legacy',retry);
 await assert.rejects(owner.newPass(),/pending/);assert.equal((await owner.read()).generation,'legacy');assert.equal(files.has(dir+'/face-ai-current.json'),false);
});
for(const status of [undefined,'running'])test('a separate input '+String(status)+' still blocks a new pass beside a completed retry',async()=>{
 const {owner,files,dir}=fixture();const old={input:input('old-key'),workflowId:'ai:old',status:'failed'};
 await owner.saveRecord('legacy',old);
 const retry=await faceRequestRecord([old],input('ignored'),'legacy',dir,true);retry.status='succeeded';retry.workflowId='ai:retry';
 await owner.saveRecord('legacy',retry);
 const pending={input:{...input('pending-key'),resourceId:'another-video'},status};
 await owner.saveRecord('legacy',pending);
 files.set(dir+'/face-ai-jobs.json',JSON.stringify({version:1,records:[retry,pending]}));
 await assert.rejects(owner.newPass(),/pending/);assert.equal((await owner.read()).generation,'legacy');assert.equal(files.has(dir+'/face-ai-current.json'),false);
});
