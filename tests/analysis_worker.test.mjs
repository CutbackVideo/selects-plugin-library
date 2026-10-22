import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createRequire} from 'node:module';
import {topLevel} from './windows_host.mjs';
const require=createRequire(import.meta.url),esbuild=require(process.env.SELECTS_ESBUILD||process.env.SBS_PANEL_TEST_MODULES+'/esbuild');
function fixture(plugin='mini-vlog',mode='pending'){
 const panel=fs.readFileSync((process.env.ANALYSIS_WORKER_PANEL_ROOT?new URL('./'+plugin+'.tsx','file://'+process.env.ANALYSIS_WORKER_PANEL_ROOT+'/'):new URL('../plugins/'+plugin+'/panel.tsx',import.meta.url)),'utf8');
 const plain=esbuild.transformSync(panel,{loader:'tsx',format:'esm',jsx:'preserve'}).code;
 const feature=panel.includes('// analysis-worker:start')?panel.slice(panel.indexOf('// analysis-worker:start'),panel.indexOf('// analysis-worker:end')):'';
 const state={started:0,posted:0,terminated:0,urls:new Set(),timers:new Map(),listeners:new Set(),workers:[],clock:1000},hooks={};let nextTimer=0;
 const signal={aborted:false,addEventListener:(_name,fn)=>state.listeners.add(fn),removeEventListener:(_name,fn)=>state.listeners.delete(fn)};
 const abort=()=>{signal.aborted=true;for(const listener of [...state.listeners])listener();};
 class Worker{
  constructor(){state.started++;if(mode==='constructor-failure')throw Error('private constructor failure');state.workers.push(this);hooks.construct?.();}
  postMessage(payload){state.posted++;state.payload=payload;if(mode==='dispatch-failure')throw Error('private DataCloneError during postMessage');hooks.post?.(this);if(mode==='success')this.onmessage({data:{ok:{grid:'none'}}});}
  terminate(){state.terminated++;hooks.terminate?.();}
 }
 const box=vm.createContext({OWN_RATE:22050,BEAT_TIMEOUT_MS:60000,Worker,Blob,TextEncoder,Uint8Array,
  URL:{createObjectURL:()=>{state.urls.add('blob:owned');return 'blob:owned';},revokeObjectURL:url=>{state.urls.delete(url);hooks.revoke?.();}},
  setTimeout:(fn,delay)=>{state.timers.set(++nextTimer,{fn,delay});return nextTimer;},clearTimeout:id=>state.timers.delete(id),__now:()=>state.clock});
 vm.runInContext('Date.now=__now;\n'+feature+'\n'+topLevel(plain,'analyseBeat')+'\nthis.analyse=analyseBeat;this.runWorker=typeof runPanelWorker===\"function\"?runPanelWorker:undefined;',box);
 const work=(options={})=>box.analyse('worker source',new Float32Array([.25]),signal,options.timeoutMs??1000,options.isCurrent);
 const clean=()=>{assert.equal(state.urls.size,0);assert.equal(state.timers.size,0);assert.equal(state.listeners.size,0);};
 return {state,hooks,box,signal,abort,work,clean};
}
function causedBy(error,text){for(let e=error;e;e=e.cause)if(e.message?.includes(text))return true;return false;}
for(const plugin of ['mini-vlog','archive-vlog'])test(plugin+': failed dispatch immediately releases worker, URL, timer and listener',async()=>{
 const f=fixture(plugin,'dispatch-failure');await assert.rejects(f.work(),error=>causedBy(error,'private DataCloneError'));assert.equal(f.state.posted,1);assert.equal(f.state.terminated,1);f.clean();
});
test('healthy beat worker preserves its payload and cleans resources',async()=>{
 const f=fixture('mini-vlog','success');assert.equal((await f.work()).grid,'none');assert.equal(f.state.payload.rate,22050);assert.deepEqual(Array.from(f.state.payload.samples),[.25]);assert.equal(f.state.terminated,1);f.clean();
});
test('a late message cannot defeat the absolute worker deadline',async()=>{
 const f=fixture(),work=f.work();f.state.clock+=1001;f.state.workers[0].onmessage({data:{ok:{grid:'none'}}});
 await assert.rejects(work,error=>error.code==='beat-timeout');assert.equal(f.state.terminated,1);f.clean();
});
test('cancellation during cleanup cannot become successful analysis',async()=>{
 const f=fixture('mini-vlog','success');f.hooks.terminate=f.abort;
 await assert.rejects(f.work(),/cancel|stopped/i);assert.equal(f.state.terminated,1);f.clean();
});
test('cleanup failure cannot be concealed by successful analysis',async()=>{
 const f=fixture('mini-vlog','success');f.hooks.terminate=()=>{throw Error('private terminate failure');};
 await assert.rejects(f.work(),error=>error.terminal===true&&causedBy(error,'private terminate failure'));f.clean();
});
test('worker constructor failure revokes the URL without posting',async()=>{
 const f=fixture('mini-vlog','constructor-failure');await assert.rejects(f.work());assert.equal(f.state.posted,0);f.clean();
});
test('already cancelled work allocates no worker or URL',async()=>{
 const f=fixture();f.abort();await assert.rejects(f.work(),/cancel|stopped/i);assert.equal(f.state.started,0);f.clean();
});
test('cancelling a pending worker settles it and ignores a subsequent message',async()=>{
 const f=fixture(),work=f.work(),late=f.state.workers[0].onmessage;f.abort();await assert.rejects(work,/cancel|stopped/i);late({data:{ok:{grid:'none'}}});assert.equal(f.state.terminated,1);f.clean();
});
test('missing URL support is an explicit unsupported environment before allocation',async()=>{
 const f=fixture();delete f.box.URL;await assert.rejects(f.box.runWorker('source',{}),error=>error.code==='PANEL_WORKER_UNSUPPORTED');assert.equal(f.state.started,0);f.clean();
});
test('constructor-time cancellation still cleans the newly returned Worker',async()=>{
 const f=fixture();f.hooks.construct=f.abort;await assert.rejects(f.work(),/cancel|stopped/i);assert.equal(f.state.terminated,1);assert.equal(f.state.posted,0);f.clean();
});
test('worker message decode errors reject and release resources immediately',async()=>{
 const f=fixture(),work=f.work();assert.equal(typeof f.state.workers[0].onmessageerror,'function');f.state.workers[0].onmessageerror({message:'private message decode failure'});
 await assert.rejects(work,error=>error.cause?.code==='PANEL_WORKER_MESSAGE');assert.equal(f.state.terminated,1);f.clean();
});
test('worker errors prevent browser reporting and retain diagnostics privately',async()=>{
 const f=fixture(),work=f.work();let prevented=0;f.state.workers[0].onerror({message:'private worker path',preventDefault:()=>{prevented++;}});
 await assert.rejects(work,error=>!error.message.includes('private')&&causedBy(error,'private worker path'));assert.equal(prevented,1);f.clean();
});
test('timeout termination preserves the established beat-timeout code',async()=>{
 const f=fixture(),work=f.work(),timer=[...f.state.timers.values()].find(row=>row.delay===1000);f.state.clock+=1000;timer.fn();
 await assert.rejects(work,error=>error.code==='beat-timeout');assert.equal(f.state.terminated,1);f.clean();
});
test('the sample rate remains explicit caller policy',async()=>{
 const f=fixture('archive-vlog','success');f.box.OWN_RATE=44100;await f.work();assert.equal(f.state.payload.rate,44100);assert.equal(f.state.payload.samples.byteLength,4);f.clean();
});
test('a worker protocol error retains the existing analysis error',async()=>{
 const f=fixture(),work=f.work();f.state.workers[0].onmessage({data:{error:'the track is too short'}});await assert.rejects(work,/track is too short/);f.clean();
});
for(const timeoutMs of [0,-1,NaN,Infinity])test('invalid worker deadline allocates nothing '+timeoutMs,async()=>{
 const f=fixture();await assert.rejects(f.box.runWorker('source',{}, {timeoutMs}),error=>error.code==='PANEL_WORKER_INPUT');assert.equal(f.state.started,0);f.clean();
});
test('an owner replacement terminates a pending worker without a signal',async()=>{
 const f=fixture();let live=true;const work=f.box.runWorker('source',{}, {isCurrent:()=>live,timeoutMs:1000});const tick=[...f.state.timers.values()].find(row=>row.delay===50),late=f.state.workers[0].onmessage;
 live=false;tick.fn();await assert.rejects(work,error=>error.code==='PANEL_WORKER_STOPPED');late({data:{ok:true}});assert.equal(f.state.terminated,1);f.clean();
});
test('a primary dispatch failure keeps cleanup diagnostics without reporting success',async()=>{
 const f=fixture('mini-vlog','dispatch-failure');f.hooks.terminate=()=>{throw Error('private cleanup failure');};
 await assert.rejects(f.work(),error=>error.terminal===true&&causedBy(error,'private DataCloneError')&&error.cause?.cleanupFailures?.length===1);f.clean();
});
test('the beat adapter carries the actual caller lifetime into its worker',async()=>{
 const f=fixture();let live=true;const work=f.work({isCurrent:()=>live}),late=f.state.workers[0].onmessage,tick=[...f.state.timers.values()].find(row=>row.delay===50);
 live=false;tick.fn();late({data:{ok:{grid:'none'}}});await assert.rejects(work,/cancel|stopped/i);assert.equal(f.state.terminated,1);f.clean();
});
function callerFixture(plugin,terminal){
 const panel=fs.readFileSync(new URL('../plugins/'+plugin+'/panel.tsx',import.meta.url),'utf8');
 const plain=esbuild.transformSync(panel,{loader:'tsx',format:'esm',jsx:'preserve'}).code.replace(/^  /gm,'');
 const state={music:null,grid:null,status:null,probes:0},failure=Object.assign(Error('analysis stopped'),{terminal});
 const box=vm.createContext({AbortController,Float32Array,OWN_RATE:22050,OWN_MAX_SECONDS:240,BEAT_TIMEOUT_MS:60000,
  busyRef:{current:false},roots:{data:'/scratch'},assets:{beatWorker:'source'},sdk:{},panelLocalClient:sdk=>sdk,
  cancelOwnMusic:()=>{},stopPreview:()=>{},ownJobRef:{current:{id:1,abort:null}},projectRef:{current:'p'},mountedRef:{current:true},
  prepareMiniOwnMusic:async()=>{if(terminal)throw failure;return {accepted:false,grid:'none',failed:true,durationSeconds:1,peaks:[]};},
  hostDecodePcm:async()=>new Float32Array(22050),decodeOwnMusic:async()=>new Float32Array(22050),analyseBeat:async()=>{throw failure;},
  hostProbeSeconds:async()=>{state.probes++;return 1;},setOwnMusic:value=>state.music=value,setOwnGrid:value=>state.grid=value,setStatus:value=>state.status=value,
  setBusy:()=>{},setStep:()=>{},setListening:()=>{},sayError:()=>failure.message,errorSay:()=>()=>failure.message,t:(_lang,key)=>key});
 vm.runInContext(topLevel(plain,'detectOwnMusic')+'\nthis.detect=detectOwnMusic;',box);return {box,state};
}
for(const plugin of ['mini-vlog','archive-vlog'])for(const terminal of [true,false])test(plugin+': actual music caller '+(terminal?'rejects unconfirmed cleanup':'retains ordinary fixed-timing fallback'),async()=>{
 const f=callerFixture(plugin,terminal);await f.box.detect({path:'/music.wav',name:'Track'});
 assert.equal(f.state.probes,0);assert.equal(f.box.ownJobRef.current.abort,null);
 if(terminal){assert.equal(f.state.music,null);assert.equal(f.state.grid,null);assert.equal(f.state.status?.tone,'error');}
 else{assert.equal(f.state.music.path,'/music.wav');assert.equal(f.state.grid.failed,true);assert.equal(f.state.grid.durationSeconds,1);assert.equal(f.state.status?.tone,'info');}
});
