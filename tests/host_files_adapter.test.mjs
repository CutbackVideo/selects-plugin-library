import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import path from 'node:path';
import {webcrypto} from 'node:crypto';
import {panelSource,loadPanelFunctions} from './windows_host.mjs';

function fixture(id,{platform='win32'}={}){
 const removed=[],read=[],calls=[],timers=new Map();let timer=0,bytes=Uint8Array.from([65]),mkdirFail=false,missing=false;
 const paths=platform==='win32'?path.win32:path.posix,home=platform==='win32'?'C:\\User Space':'/workspace/user space';
 const sdk={environment:{platform},files:{join:paths.join,homedir:()=>home,exists:async()=>!missing,mkdir:async()=>{if(mkdirFail)throw Error('mkdir refused');},readFile:async file=>{read.push(file);return bytes;},removeFile:async value=>{removed.push(value.filePath);}},media:{runFFmpeg:async(args,quiet,signal)=>{calls.push({args,quiet,signal});},runFFprobe:async()=>({stdout:'12.5'})}};
 const api=loadPanelFunctions(panelSource(id),[],{__sdk:sdk,crypto:webcrypto,AbortController,Uint8Array,Float32Array,setTimeout:(fn,ms)=>{const id=++timer;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id)});
 return {api,sdk,paths,home,removed,read,calls,timers,setBytes:value=>{bytes=value;},setMkdirFail:()=>{mkdirFail=true;},setMissing:()=>{missing=true;}};
}

for(const id of ['archive-vlog','mini-vlog','medical-explainer']){
 test(id+' common host files await roots and preserve mkdir failure as unavailable data',async()=>{
  const f=fixture(id),roots=await f.api.hostRoots(f.sdk,id,'planner.js');
  assert.equal(roots.plugin,f.paths.join(f.home,'.selects','skills',id));assert.equal(roots.data,f.paths.join(f.home,'.selects','plugin-data',id));
  f.setMkdirFail();assert.equal((await f.api.hostRoots(f.sdk,id,'planner.js')).data,null);
  f.setMissing();await assert.rejects(f.api.hostRoots(f.sdk,id,'planner.js'),{code:'not-found'});
 });
 test(id+' common host files preserve cross-realm byte windows and text decoding',async()=>{
  const f=fixture(id),view=vm.runInNewContext('new Uint8Array([9,65,66,8]).subarray(1,3)');f.setBytes(view);
  assert.deepEqual(Array.from(await f.api.hostReadBytes('input.bin')),[65,66]);assert.equal(await f.api.hostReadText('input.bin'),'AB');
  f.setBytes('text');assert.equal(await f.api.hostReadText('input.txt'),'text');await assert.rejects(f.api.hostReadBytes('input.txt'),{code:'read-failed'});
  assert.deepEqual(Array.from(f.api.hostBytes(vm.runInNewContext('new Uint8Array([3,4]).buffer'))),[3,4]);
 });
 test(id+' common host files report missing capabilities without a legacy service fallback',async()=>{
  const f=fixture(id);f.api.hostUseSdk({files:{},environment:{platform:'win32'}});
  await assert.rejects(f.api.hostReadText('missing'),error=>error.code==='host-missing'&&error.member==='FileSystem.readFile');
 });
 test(id+' common host files keep native fallback path policy',()=>{
  for(const platform of ['win32','darwin']){
   const f=fixture(id,{platform});delete f.sdk.files.join;
   assert.equal(f.api.hostJoin(platform==='win32'?'C:\\Space\\':'/space/','/sub/','name.txt'),platform==='win32'?'C:\\Space\\sub\\name.txt':'/space/sub/name.txt');
   if(platform==='win32')assert.equal(f.api.hostJoin('\\\\server\\share\\','folder','a b.txt'),'\\\\server\\share\\folder\\a b.txt');
  }
 });
 test(id+' common host files remove only the requested path with best-effort legacy cleanup',async()=>{
  const f=fixture(id);await f.api.hostRemove('one.tmp');assert.deepEqual(f.removed,['one.tmp']);
  f.sdk.files.removeFile=async()=>{throw Error('locked');};await f.api.hostRemove('locked.tmp');
 });
}

test('Medical PCM adapter keeps argv, cross-realm alignment and partial-sample trimming',async()=>{
 const f=fixture('medical-explainer'),raw=new Uint8Array(14);raw.set(new Uint8Array(new Float32Array([1.25,-2.5]).buffer),3);raw.set([7,8,9],11);
 const value=vm.runInNewContext('Uint8Array.from('+JSON.stringify(Array.from(raw))+').subarray(3)');f.setBytes(value);
 const samples=await f.api.hostDecodePcm('C:\\original.mp4','C:\\own',22050,2);
 assert.deepEqual(Array.from(samples),[1.25,-2.5]);assert.equal(f.calls.length,1);
 const {args,quiet,signal}=f.calls[0];assert.deepEqual(Array.from(args.slice(0,-1)),['-nostdin','-v','error','-y','-t','2','-i','C:\\original.mp4','-ac','1','-ar','22050','-f','f32le']);
 assert.equal(quiet,true);assert.ok(signal instanceof AbortSignal);assert.deepEqual(f.read,[args.at(-1)]);assert.deepEqual(f.removed,[args.at(-1)]);assert.equal(f.timers.size,0);
});
test('Medical PCM adapter preserves capability admission and empty output failure',async()=>{
 const f=fixture('medical-explainer');assert.equal(await f.api.hostDecodePcm('in',null,22050,2),null);delete f.sdk.media.runFFmpeg;assert.equal(await f.api.hostDecodePcm('in','own',22050,2),null);assert.equal(f.read.length,0);
 const empty=fixture('medical-explainer');empty.setBytes(new Uint8Array());await assert.rejects(empty.api.hostDecodePcm('in','own',22050,2),{code:'decode-failed'});assert.equal(empty.removed.length,1);assert.equal(empty.timers.size,0);
});
test('Medical PCM adapter preserves failure cleanup and abort-listener retirement',async()=>{
 const f=fixture('medical-explainer'),source=new AbortController();let adds=0,removes=0,received;
 const add=source.signal.addEventListener.bind(source.signal),remove=source.signal.removeEventListener.bind(source.signal);
 source.signal.addEventListener=(...args)=>{adds++;return add(...args);};source.signal.removeEventListener=(...args)=>{removes++;return remove(...args);};
 f.sdk.media.runFFmpeg=async(_args,_quiet,signal)=>{received=signal;throw Error('codec failed');};
 await assert.rejects(f.api.hostDecodePcm('in','own',22050,2,source.signal),/codec failed/);assert.equal(adds,1);assert.equal(removes,1);assert.equal(f.removed.length,1);assert.equal(f.timers.size,0);
 source.abort();assert.equal(received.aborted,false,'The finished decode no longer owns the external abort listener.');
});
test('Medical PCM adapter still relays its existing timeout abort request',async()=>{
 const f=fixture('medical-explainer');let received,rejectTool;
 f.sdk.media.runFFmpeg=(_args,_quiet,signal)=>{received=signal;return new Promise((_resolve,reject)=>{rejectTool=reject;});};
 const promise=f.api.hostDecodePcm('in','own',22050,2,undefined,7);assert.equal(f.timers.size,1);const timer=[...f.timers.values()][0];assert.equal(timer.ms,7);timer.fn();assert.equal(received.aborted,true);
 rejectTool(Error('aborted by host'));await assert.rejects(promise,/aborted by host/);assert.equal(f.removed.length,1);assert.equal(f.timers.size,0);
});
test('Medical probe retains its existing parsing and error-to-null policy',async()=>{
 const f=fixture('medical-explainer');f.sdk.media.runFFprobe=async(args,quiet)=>{assert.equal(quiet,true);assert.equal(args.at(-1),'input.mp4');return {stdout:'12.5suffix'};};
 assert.equal(await f.api.hostProbeSeconds('input.mp4'),12.5);
 f.sdk.media.runFFprobe=async()=>{throw Object.assign(Error('host failed'),{terminal:true});};assert.equal(await f.api.hostProbeSeconds('input.mp4'),null);
 delete f.sdk.media.runFFprobe;assert.equal(await f.api.hostProbeSeconds('input.mp4'),null);
});
