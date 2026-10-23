import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';
import {topLevel} from './windows_host.mjs';

const require=createRequire(import.meta.url),esbuild=require(process.env.SELECTS_ESBUILD||process.env.SBS_PANEL_TEST_MODULES+'/esbuild');
const plugins=['city-weekend-vlog','torn-paper-love','summer-trip','the-end-credits'];
const plain=plugin=>esbuild.transformSync(fs.readFileSync(new URL('../plugins/'+plugin+'/panel.tsx',import.meta.url),'utf8'),{loader:'tsx',format:'esm',jsx:'preserve'}).code;

function fixture(plugin,mode='pending'){
 const panel=fs.readFileSync(new URL('../plugins/'+plugin+'/panel.tsx',import.meta.url),'utf8');
 const feature=panel.includes('// analysis-worker:start')?panel.slice(panel.indexOf('// analysis-worker:start'),panel.indexOf('// analysis-worker:end')):'';
 const state={workers:[],urls:new Set(),timers:new Map(),listeners:new Set(),clock:1000,terminated:0},hooks={};let next=0;
 const signal={aborted:false,addEventListener:(_type,fn)=>state.listeners.add(fn),removeEventListener:(_type,fn)=>state.listeners.delete(fn)};
 class Worker{
  constructor(){state.workers.push(this);}
  postMessage(payload,transfer){
   if(mode==='dispatch')throw Error('native dispatch failed');
   state.transfer=transfer;state.payload=structuredClone(payload,transfer?{transfer}:undefined);
   if(mode==='success')this.onmessage({data:plugin==='city-weekend-vlog'||plugin==='torn-paper-love'?{ok:{durationSeconds:1}}:{ok:true,id:1,result:{durationSeconds:1}}});
  }
  terminate(){state.terminated++;hooks.terminate?.();}
 }
 const stale=Error('Project changed');
 const box=vm.createContext({Worker,Blob,TextEncoder,Float32Array,OWN_RATE:22050,ST_PCM_RATE:22050,TEC_PCM_RATE:22050,STALE:stale,
  BEAT_TIMEOUT_MS:60000,ST_BEAT_TIMEOUT_MS:60000,TEC_BEAT_TIMEOUT_MS:60000,
  URL:{createObjectURL:()=>{state.urls.add('blob:owned');return 'blob:owned';},revokeObjectURL:url=>state.urls.delete(url)},
  setTimeout:(fn,delay)=>{state.timers.set(++next,{fn,delay});return next;},clearTimeout:id=>state.timers.delete(id),__now:()=>state.clock});
 vm.runInContext('Date.now=__now;\n'+feature+'\n'+topLevel(plain(plugin),'analyseBeat')+'\nthis.analyse=analyseBeat;',box);
 const samples=new Float32Array([.25,.5]);
 return {state,hooks,samples,box,work:(live=()=>true,input=samples)=>box.analyse('worker source',input,signal,1000,live),
  clean:()=>{assert.equal(state.terminated,1);assert.equal(state.urls.size,0);assert.equal(state.timers.size,0);assert.equal(state.listeners.size,0);}};
}

for(const plugin of plugins){
 test(plugin+': synchronous dispatch failure releases every owned browser resource',async()=>{
  const f=fixture(plugin,'dispatch');await assert.rejects(f.work());f.clean();
 });
 test(plugin+': a late message cannot beat the absolute deadline',async()=>{
  const f=fixture(plugin),work=f.work();f.state.clock+=1001;
  f.state.workers[0].onmessage({data:plugin==='city-weekend-vlog'||plugin==='torn-paper-love'?{ok:{durationSeconds:1}}:{ok:true,result:{durationSeconds:1}}});
  await assert.rejects(work,/too long|timed out/i);f.clean();
 });
 test(plugin+': cleanup failure rejects instead of returning successful analysis',async()=>{
  const f=fixture(plugin,'success');f.hooks.terminate=()=>{throw Error('native terminate failed');};
  await assert.rejects(f.work(),error=>error.terminal===true);f.clean();
 });
 test(plugin+': current owner replacement ends pending analysis',async()=>{
  const f=fixture(plugin);let live=true;const work=f.work(()=>live);live=false;
  const tick=[...f.state.timers.values()].find(timer=>timer.delay===50);assert.ok(tick);tick.fn();
  await assert.rejects(work);f.clean();
 });
 test(plugin+': healthy protocol preserves sample rate, bytes and transfer/copy ownership',async()=>{
  const f=fixture(plugin,'success');assert.equal((await f.work()).durationSeconds,1);f.clean();
  assert.equal(f.state.payload.rate,22050);
  const transferred=plugin==='summer-trip'||plugin==='the-end-credits';
  assert.equal(f.state.transfer?.length??0,transferred?1:0);
  assert.deepEqual(Array.from(transferred?new Float32Array(f.state.payload.buf):f.state.payload.samples),[.25,.5]);
  assert.equal(f.samples.byteLength,plugin==='summer-trip'?0:8);
  if(plugin==='summer-trip')assert.equal(f.state.payload.pick,'largest');
 });
}
for(const plugin of ['summer-trip','the-end-credits'])test(plugin+': a partial sample view transfers only its copy and retains the caller buffer',async()=>{
 const f=fixture(plugin,'success'),backing=new Float32Array([9,.25,.5,9]);
 await f.work(()=>true,backing.subarray(1,3));f.clean();
 assert.deepEqual(Array.from(new Float32Array(f.state.payload.buf)),[.25,.5]);
 assert.deepEqual(Array.from(backing),[9,.25,.5,9]);
});
test('the common owner refuses a malformed transfer list before allocating resources',async()=>{
 const f=fixture('summer-trip');
 await assert.rejects(f.box.runPanelWorker('source',{}, {transfer:{}}),error=>error.code==='PANEL_WORKER_INPUT');
 assert.equal(f.state.workers.length,0);assert.equal(f.state.urls.size,0);assert.equal(f.state.timers.size,0);
});
test('a native invalid transfer failure uses the common dispatch cleanup path',async()=>{
 const f=fixture('summer-trip'),buffer=new ArrayBuffer(4);
 await assert.rejects(f.box.runPanelWorker('source',{buffer},{transfer:[buffer,buffer]}),error=>error.code==='PANEL_WORKER_DISPATCH'&&error.cause?.name==='DataCloneError');
 f.clean();assert.equal(buffer.byteLength,4);
});

function caller(plugin,terminal){
 const state={music:null,grid:null,status:null,probes:0};
 const failure=Object.assign(Error('analysis failed'),{terminal});
 const box=vm.createContext({AbortController,Float32Array,OWN_RATE:22050,OWN_MAX_SECONDS:360,ST_PCM_RATE:22050,ST_PCM_SECONDS:360,ST_BEAT_TIMEOUT_MS:60000,TEC_PCM_RATE:22050,TEC_PCM_SECONDS:360,TEC_BEAT_TIMEOUT_MS:60000,BEAT_TIMEOUT_MS:60000,TPL_FALLBACK_UNIT:4,
  busyRef:{current:false},roots:{data:'/owned',plugin:'/installed'},assets:{beatWorker:'source'},ownAbortRef:{current:null},projectRef:{current:'project'},mountedRef:{current:true},ownRequestRef:{current:0},
  tplExclusive:async(_ref,fn)=>fn(),readText:async()=>'',tplBeatWorkerSource:()=>'',
  decodeOwnMusic:async()=>new Float32Array(22050),hostDecodePcm:async()=>new Float32Array(22050),tecHostDecodePcm:async()=>new Float32Array(22050),
  analyseBeat:async(_source,_samples,_signal,_timeout,current)=>{assert.equal(typeof current,'function');assert.equal(current(),true);throw failure;},
  hostProbeSeconds:async()=>{state.probes++;return 1;},hostProbeDuration:async()=>{state.probes++;return 1;},tecHostProbeSeconds:async()=>{state.probes++;return 1;},
  setOwnMusic:value=>state.music=value,setOwnGrid:value=>state.grid=value,setStatus:value=>state.status=value,setBusy:()=>{},setStep:()=>{},
  sayError:()=>failure.message,hostSay:()=>null,tplSayOf:()=>failure.message,t:(_lang,key)=>key});
 vm.runInContext(topLevel(plain(plugin).replace(/^  /gm,''),'detectOwnMusic')+'\nthis.detect=detectOwnMusic;',box);
 return {box,state};
}
for(const plugin of plugins)for(const terminal of [true,false])test(plugin+': music caller '+(terminal?'blocks fallback after unconfirmed cleanup':'retains ordinary fixed-timing fallback'),async()=>{
 const f=caller(plugin,terminal);await f.box.detect({path:'/music.wav',name:'Track'});
 if(terminal){assert.equal(f.state.music,null);assert.equal(f.state.grid,null);assert.equal(f.state.status?.tone,'error');assert.equal(f.state.probes,0);}
 else{assert.equal(f.state.music.path,'/music.wav');assert.equal(f.state.grid.accepted,false);assert.equal(f.state.grid.durationSeconds,1);}
});
