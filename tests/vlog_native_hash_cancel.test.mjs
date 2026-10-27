import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import {createRequire} from 'node:module';
import {loadPanelModule,disposePanelModule} from './panel_module_fixture.mjs';
import {topLevel} from './windows_host.mjs';
import {fingerprintTemplateFile} from '../shared/file-observation.js';
import {observeSourceFiles} from '../shared/native-image-input.mjs';
const require=createRequire(import.meta.url),esbuild=require(process.env.SELECTS_ESBUILD||process.env.SBS_PANEL_TEST_MODULES+'/esbuild');
const localSource=fs.readFileSync(new URL('../shared/local-client.ts',import.meta.url),'utf8');
const digest='a'.repeat(64),identity={size:4,mtimeMs:1,ino:1,isDirectory:false};
async function fixture(t,{native=true,guard=()=>{},unknown=false,cancelDelay=0,firstStatusWait,globals={}}={}){
 let startedResolve,observedResolve,reads=0,dispatches=0,statusCalls=0;const readRequests=[];
 const started=new Promise(r=>startedResolve=r),observed=new Promise(r=>observedResolve=r),cancelled=[];
 const jobs=new Map([['foreign',{state:'running'}]]);
 const selects={files:{environment:async()=>({platform:'darwin',homedir:'/tmp',tempDirectory:'/tmp',version:'test'}),stat:async()=>identity,
  readRange:async input=>{reads++;readRequests.push(input);guard();return {bytesRead:4,base64:Buffer.from('data').toString('base64')};}},media:{job:id=>({cancel:async()=>{cancelled.push(id);if(cancelDelay)await new Promise(r=>setTimeout(r,cancelDelay));if(!unknown)jobs.get(id).state='cancelled';}})}};
 if(native)selects.media.startFFmpeg=async()=>{dispatches++;jobs.set('own',{state:'running'});startedResolve();return {jobId:'own'};};
 const sdk={runScript:async input=>({isError:false,result:await new Function('selects','return (async()=>{'+input.script+'})()')(selects)}),call:async(method,id,{cursor=0})=>{
  assert.equal(method,'getLocalMediaJobStatus');assert.equal(id,'own');const first=++statusCalls===1;observedResolve();
  if(first)await firstStatusWait?.();
  const state=jobs.get(id).state,events=state==='succeeded'&&!cursor?[{cursor:1,stream:'stdout',text:'SHA256='+digest+'\n'}]:[];
  return {state,events,nextCursor:events.length?1:cursor,truncated:false};
 }};
 const module=loadPanelModule(localSource,{names:['createPanelLocalClient'],modules:{'./file-observation.js':{fingerprintTemplateFile}},globals});
 t.after(()=>disposePanelModule(module));
 const client=await module.createPanelLocalClient(sdk);
 // Safely end the baseline's missing guard without waiting for its native deadline.
 const rescue=()=>{const timer=setTimeout(()=>{jobs.get('own').state='succeeded';},700);t.after(()=>clearTimeout(timer));return timer;};
 return {client,jobs,started,observed,cancelled,rescue,readRequests,get reads(){return reads;},get dispatches(){return dispatches;},get statusCalls(){return statusCalls;}};
}

function observationClock(){
 let now=0,next=0;const timers=new Map(),flush=()=>new Promise(r=>setImmediate(r));
 return {globals:{Date:{now:()=>now},setTimeout:(fn,ms)=>{const id=++next;timers.set(id,{at:now+ms,fn});return id;},clearTimeout:id=>timers.delete(id)},
  async advance(ms){const until=now+ms;for(;;){const due=[...timers.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(!due||due[1].at>until)break;now=due[1].at;timers.delete(due[0]);due[1].fn();await flush();}now=until;await flush();},get pending(){return timers.size;}};
}

test('owned generic media waits for one delayed reply within the operation budget',async t=>{
 let release;const clock=observationClock(),wait=new Promise(r=>release=r),h=await fixture(t,{firstStatusWait:()=>wait,globals:clock.globals});
 const pending=h.client.media.runFFmpeg([],true,undefined,undefined,undefined,{deadline:10000,check(){}});
 const result=pending.then(value=>({value}),error=>({error}));await h.observed;
 await clock.advance(5303);h.jobs.get('own').state='succeeded';release();const outcome=await result;
 assert.equal(outcome.error,undefined);assert.equal(outcome.value.stdout,'SHA256='+digest+'\n');
 assert.equal(h.statusCalls,2);assert.equal(h.dispatches,1);assert.deepEqual(h.cancelled,[]);assert.equal(clock.pending,0);
});
for(const reason of ['scope','abort','deadline'])test('owned generic pending media preserves '+reason+' and one cancellation',async t=>{
 let release,live=true,finished=false;const clock=observationClock(),wait=new Promise(r=>release=r),h=await fixture(t,{firstStatusWait:()=>wait,globals:clock.globals}),controller=new AbortController(),sentinel=Error('owner ended');
 const pending=h.client.media.runFFmpeg([],true,controller.signal,undefined,undefined,{deadline:reason==='deadline'?80:10000,check(){if(!live)throw sentinel;}});
 const result=pending.then(value=>({value}),error=>({error})).then(row=>{finished=true;return row;});await h.observed;
 if(reason==='scope')live=false;if(reason==='abort')controller.abort();
 await clock.advance(reason==='deadline'?80:150);const observed=finished;h.jobs.get('own').state='succeeded';release();const row=await result;
 assert.ok(observed,'the operation lifetime must interrupt the same pending observation');assert.ok(row.error);
 if(reason==='scope')assert.equal(row.error,sentinel);
 assert.equal(h.dispatches,1);assert.deepEqual(h.cancelled,['own']);assert.equal(h.jobs.get('foreign').state,'running');assert.equal(clock.pending,0);
});

test('native source observation accepts one valid delayed status within its existing total deadline',async t=>{
 let release;const clock=observationClock(),wait=new Promise(r=>release=r),h=await fixture(t,{firstStatusWait:()=>wait,globals:clock.globals});
 const pending=h.client.files.fingerprint('/music',{native:true,timeoutMs:10000});
 // Attach the rejection handler before the baseline's premature five-second failure.
 const result=pending.then(value=>({value}),error=>({error}));
 await h.observed;await clock.advance(5303);h.jobs.get('own').state='succeeded';release();
 const outcome=await result;
 assert.equal(outcome.error,undefined,'a slow valid reply is not a failed native job');
 assert.equal(outcome.value.sha256,digest);assert.equal(h.dispatches,1);assert.deepEqual(h.cancelled,[]);
 assert.equal(h.statusCalls,2,'one pending observation, followed only by terminal output drainage');
 assert.equal(clock.pending,0);
});

for(const reason of ['scope','abort','deadline'])test('pending source status still observes '+reason+' without waiting for its response',async t=>{
 let release,live=true,finished=false;const clock=observationClock(),wait=new Promise(r=>release=r),h=await fixture(t,{firstStatusWait:()=>wait,globals:clock.globals}),controller=new AbortController(),sentinel=Error('scope changed');
 const pending=h.client.files.fingerprint('/music',{native:true,signal:controller.signal,timeoutMs:reason==='deadline'?80:10000,check(){if(!live)throw sentinel;}});
 const result=pending.then(value=>({value}),error=>({error})).then(value=>{finished=true;return value;});await h.observed;
 if(reason==='scope')live=false;if(reason==='abort')controller.abort();
 await clock.advance(reason==='deadline'?80:150);const observed=finished;
 // Always release the artificial boundary, including on a failing baseline.
 release();const outcome=await result;
 assert.ok(observed,'cancellation and the total deadline must interrupt a pending observation');
 assert.ok(outcome.error);if(reason==='scope')assert.equal(outcome.error,sentinel);
 if(reason==='abort')assert.equal(outcome.error.name,'AbortError');
 if(reason==='deadline')assert.match(outcome.error.message,/timed out/);
 assert.deepEqual(h.cancelled,['own']);assert.equal(h.dispatches,1);assert.equal(h.jobs.get('foreign').state,'running');
 assert.equal(clock.pending,0);
});
for(const [id,helper,sentinelName] of [['mini-vlog','prepareMiniOwnMusic','CANCELLED'],['archive-vlog','prepareArchiveOwnMusic','STALE']]){
 const panel=fs.readFileSync(new URL('../plugins/'+id+'/panel.tsx',import.meta.url),'utf8');
 test(id+': actual music callback preserves its existing cancellation sentinel',async t=>{
  let callback;
  const api=loadPanelModule(panel,{names:[helper,sentinelName],overrides:{prepareAudioBeatAnalysis:async(_client,options)=>{callback=options.hashFile;}}});t.after(()=>disposePanelModule(api));
  await api[helper]({files:{stat(){},readRange(){}}},'/music','/data','worker',new AbortController().signal,()=>false);
  await assert.rejects(callback('/music'),e=>e===api[sentinelName]);
 });
 test(id+': Korean caller stops owned hash on scope change, with no failed UI or later work',async t=>{
  const h=await fixture(t),errors=[],statuses=[];let later=0;
  const api=loadPanelModule(panel,{names:[helper,sentinelName,'t',id==='mini-vlog'?'sayError':'errorSay'],overrides:{observeSourceFiles:async(...args)=>{try{return await observeSourceFiles(...args);}catch(e){errors.push(e);throw e;}},decodeAssetPcm:()=>{later++;throw Error('unexpected decode');},...(id==='archive-vlog'?{decodeOwnMusic:()=>{later++;throw Error('unexpected decode');}}:{}),analyseBeat:()=>{later++;throw Error('unexpected analysis');}}});t.after(()=>disposePanelModule(api));
  const plain=esbuild.transformSync(panel,{loader:'tsx',format:'esm',jsx:'preserve'}).code.replace(/^  /gm,'');
  const box=vm.createContext({AbortController,panelLocalClient:()=>h.client,sdk:{},[helper]:api[helper],busyRef:{current:false},roots:{data:'/data'},assets:{beatWorker:'worker'},ownJobRef:{current:{id:0,abort:null}},mountedRef:{current:true},projectRef:{current:'original'},stopPreview(){},setListening(){},setBusy(){},setStep(){},setOwnMusic(){},setOwnGrid(){},setStatus:s=>{if(s)statuses.push({tone:s.tone,text:s.say?.('ko')});},t:api.t,sayError:api.sayError,errorSay:api.errorSay});
  vm.runInContext(['cancelOwnMusic','detectOwnMusic'].map(name=>topLevel(plain,name)).join('\n')+'\nthis.detect=detectOwnMusic;',box);
  const pending=box.detect({path:'/music',name:'music'});await h.observed;
  box.projectRef.current='changed';const rescue=h.rescue();await pending;clearTimeout(rescue);
  assert.equal(errors[0],api[sentinelName]);assert.deepEqual(h.cancelled,['own']);assert.equal(h.jobs.get('foreign').state,'running');
  assert.equal(h.jobs.get('own').state,'cancelled');assert.equal(h.reads,1);assert.deepEqual(h.readRequests,[{path:'/music',offset:0,length:4}]);assert.equal(later,0);assert.deepEqual(statuses,[]);
 });
}
test('private guard cancellation settles own job exactly once and returns original sentinel',async t=>{
 let live=true;const sentinel=Error('scope changed'),h=await fixture(t),progress=[];
 const pending=observeSourceFiles(h.client.files,['/music'],null,{native:true,check(){if(!live)throw sentinel;},onProgress:p=>progress.push(p)});
 await h.observed;live=false;const rescue=h.rescue();await assert.rejects(pending,e=>e===sentinel);clearTimeout(rescue);
 assert.deepEqual(h.cancelled,['own']);assert.equal(h.jobs.get('foreign').state,'running');assert.equal(h.reads,1);assert.deepEqual(h.readRequests,[{path:'/music',offset:0,length:4}]);assert.equal(progress.some(p=>p.complete),false);
});
test('pre-dispatch guard and external pre-abort start no native job',async t=>{
 const h=await fixture(t),sentinel=Error('scope changed');
 const guardPending=h.client.files.fingerprint('/music',{native:true,check(){throw sentinel;}});const rescue=setTimeout(()=>{if(h.jobs.has('own'))h.jobs.get('own').state='succeeded';},700);t.after(()=>clearTimeout(rescue));await assert.rejects(guardPending,e=>e===sentinel);clearTimeout(rescue);
 const controller=new AbortController();controller.abort();await assert.rejects(h.client.files.fingerprint('/music',{native:true,signal:controller.signal}),e=>e.name==='AbortError');
 assert.equal(h.dispatches,0);assert.deepEqual(h.cancelled,[]);
});
test('capability-absent legacy full read retains synchronous guard cancellation',async t=>{
 let live=true;const sentinel=Error('scope changed'),h=await fixture(t,{native:false,guard(){live=false;}});
 await assert.rejects(h.client.files.fingerprint('/music',{native:true,check(){if(!live)throw sentinel;}}),e=>e===sentinel);
 assert.equal(h.reads,1);assert.equal(h.dispatches,0);assert.deepEqual(h.cancelled,[]);
});
test('no-check native and unsupported full-hash callers retain normal results',async t=>{
 const h=await fixture(t),pending=observeSourceFiles(h.client.files,['/music'],null,{native:true});await h.started;h.jobs.get('own').state='succeeded';
 assert.equal((await pending)[0].sha256,digest);assert.deepEqual(h.cancelled,[]);
 const legacy=await fixture(t,{native:false});assert.equal((await legacy.client.files.fingerprint('/music',{native:true})).sha256,'3a6eb0790f39ac87c94f3856b2dd2c5d110e6811602261a9a923d3bb23adc8b7');assert.equal(legacy.reads,1);
});
test('scope cancellation cannot conceal unconfirmed native settlement',async t=>{
 let live=true;const sentinel=Error('scope changed'),h=await fixture(t,{unknown:true});
 const pending=observeSourceFiles(h.client.files,['/music'],null,{native:true,check(){if(!live)throw sentinel;}});await h.observed;live=false;
 // Baseline rescue also prevents an unbounded regression; corrected owner has a fixed 5s settlement bound.
 const rescue=setTimeout(()=>{h.jobs.get('own').state='succeeded';},6500);t.after(()=>clearTimeout(rescue));
 await assert.rejects(pending,e=>e.code==='LOCAL_MEDIA_SETTLEMENT_UNKNOWN'&&e.preserveTemporaryFiles===true&&e.cause===sentinel);clearTimeout(rescue);
 assert.deepEqual(h.cancelled,['own']);assert.equal(h.jobs.get('foreign').state,'running');
});

test('external abort waits for native exit instead of only abandoning caller waiting',async t=>{
 const h=await fixture(t,{cancelDelay:80}),controller=new AbortController();let settled=false;
 const pending=observeSourceFiles(h.client.files,['/music'],null,{native:true,signal:controller.signal});
 const rejection=assert.rejects(pending,e=>e.name==='AbortError').then(()=>{settled=true;});
 await h.observed;controller.abort();await new Promise(r=>setTimeout(r,20));assert.equal(settled,false);
 await rejection;assert.deepEqual(h.cancelled,['own']);assert.equal(h.jobs.get('own').state,'cancelled');assert.equal(h.jobs.get('foreign').state,'running');
});
