import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import {webcrypto} from 'node:crypto';
import {createRequire} from 'node:module';
import {topLevel} from './windows_host.mjs';
function fixture(plugin='mini-vlog'){
 const source=fs.readFileSync(process.env.MINI_MEDIA_PANEL||new URL('../plugins/'+plugin+'/panel.tsx',import.meta.url),'utf8');
 const block=source.slice(source.indexOf('// av-host:start'),source.indexOf('// av-host:end'));
 const feature=source.includes('// bundled-assets:start')?source.slice(source.indexOf('// bundled-assets:start'),source.indexOf('// bundled-assets:end')):'';
 const stores=[new Map(),new Map()],calls=[[],[]],hooks={};
 const clients=stores.map((store,index)=>({environment:{platform:'darwin'},files:{join:path.posix.join,homedir:()=>'/home',mkdir:async()=>{},
  writeFile:async(file,data,options)=>{if(options?.flag==='wx'&&store.has(file))throw Error('already exists');store.set(file,typeof data==='string'?new TextEncoder().encode(data):Uint8Array.from(data));},
  compareAndReplace:async(file,expected,text)=>{if(!store.has(file)||new TextDecoder().decode(store.get(file))!==expected)return false;store.set(file,new TextEncoder().encode(text));return true;},
  exists:async file=>store.has(file),stat:async file=>store.has(file)?{isDirectory:false,size:store.get(file).length,mtimeMs:1,ino:1}:null,
  readFile:async file=>{calls[index].push(['read',file]);if(!store.has(file))throw Error('missing');return store.get(file);},
  readRange:async(file,offset,length)=>{calls[index].push(['range',file,offset,length]);if(!store.has(file))throw Error('missing');return store.get(file).subarray(offset,offset+length);},
  removeFile:async({filePath})=>{calls[index].push(['remove',filePath]);store.delete(filePath);},
 },media:{runFFmpeg:async(args,quiet,signal)=>{
  calls[index].push(['ffmpeg',args,signal]);const output=args.at(-1);store.set(output,hooks.bytes??new Uint8Array(new Float32Array([.25,-.5,1]).buffer));
  await hooks.afterProduce?.(output,signal);return {stdout:''};
 },runFFprobe:async()=>({stdout:hooks.probe??'12.5\n'})}}));
 const box=vm.createContext({panelLocalClient:sdk=>sdk,crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,Float32Array,AbortController,setTimeout,clearTimeout,console});
 vm.runInContext(feature+'\n'+block+'\nthis.api={hostUseSdk,hostDecodePcm,hostProbeSeconds,readTransientAsset};',box);const api=box.api;api.hostUseSdk(clients[0]);
 return {api,box,clients,stores,calls,hooks,decode:signal=>api.hostDecodePcm('/music.wav','/data',11025,1,signal,1000)};
}
test('Mini PCM scope: a rebinding cannot select another client’s samples or cleanup',async()=>{
 const f=fixture();f.hooks.afterProduce=output=>{f.stores[1].set(output,new Uint8Array(new Float32Array([.9,.8]).buffer));f.api.hostUseSdk(f.clients[1]);};
 assert.deepEqual(Array.from(await f.decode()),[.25,-.5,1]);assert.equal(f.calls[1].length,0);assert.equal(f.stores[0].size,0);assert.equal(f.stores[1].size,1);
});
test('Mini PCM scope: the originating client cleans its own output after a failed decode',async()=>{
 const f=fixture();f.hooks.afterProduce=output=>{f.stores[1].set(output,new Uint8Array([9]));f.api.hostUseSdk(f.clients[1]);throw Error('producer failed');};
 await assert.rejects(f.decode(),error=>(error.cause?.message??error.message).includes('producer failed'));assert.equal(f.calls[1].length,0);assert.equal(f.stores[0].size,0);assert.equal(f.stores[1].size,1);
});
test('Mini PCM scope: a late successful producer cannot turn cancellation into samples',async()=>{
 const f=fixture(),controller=new AbortController();f.hooks.afterProduce=()=>controller.abort();await assert.rejects(f.decode(controller.signal),/ended|cancel|abort|stopped/i);assert.equal(f.stores[0].size,0);
});
for(const [name,bytes] of [['unaligned',new Uint8Array([0,0,0,0,1])],['nonfinite',new Uint8Array(new Float32Array([NaN]).buffer)],['oversized',new Uint8Array(11025*4+4)]])test('Mini PCM scope: '+name+' output cannot enter beat analysis',async()=>{
 const f=fixture();f.hooks.bytes=bytes;await assert.rejects(f.decode());assert.equal(f.stores[0].size,0);
});
test('Mini PCM scope control: healthy samples remain bounded and temporary',async()=>{
 const f=fixture();assert.deepEqual(Array.from(await f.decode()),[.25,-.5,1]);assert.equal(f.stores[0].size,0);assert.equal(f.calls[0].filter(c=>c[0]==='ffmpeg').length,1);
});
test('Transient owner: failed cleanup cannot be reported as a clean success',async()=>{
 const f=fixture();let removals=0;f.clients[0].files.removeFile=async()=>{removals++;throw Error('private delete failure');};
 await assert.rejects(f.decode(),error=>error.code==='BUNDLED_ASSET_CLEANUP'&&!error.message.includes('private delete failure')&&error.cause?.length===1);
 assert.equal(removals,1);assert.equal(f.stores[0].size,1);
});
test('Transient owner: a completed deletion with a lost reply is observed, never replayed',async()=>{
 const f=fixture();let removals=0;f.clients[0].files.removeFile=async({filePath})=>{removals++;f.stores[0].delete(filePath);throw Error('lost reply');};
 assert.deepEqual(Array.from(await f.decode()),[.25,-.5,1]);assert.equal(removals,1);assert.equal(f.stores[0].size,0);
});
test('Transient owner: primary failure retains private cleanup diagnostics',async()=>{
 const f=fixture();f.hooks.afterProduce=()=>{throw Error('original producer failure');};f.clients[0].files.removeFile=async()=>{throw Error('delete failure');};
 await assert.rejects(f.decode(),error=>error.code==='BUNDLED_ASSET_MEDIA'&&error.cause?.message==='original producer failure'&&error.cleanupFailures?.length===1&&error.terminal===true);
});
test('Transient owner: an unknown delete observation does not authorize another deletion',async()=>{
 const f=fixture();let removing=false,removals=0;const stat=f.clients[0].files.stat;
 f.clients[0].files.removeFile=async()=>{removing=true;removals++;throw Error('delete unknown');};
 f.clients[0].files.stat=async file=>{if(removing)throw Error('observation unknown');return stat(file);};
 await assert.rejects(f.decode(),error=>error.code==='BUNDLED_ASSET_CLEANUP');assert.equal(removals,1);assert.equal(f.stores[0].size,1);
});
test('Transient owner: cancellation during cleanup rejects the late sample handoff',async()=>{
 const f=fixture(),abort=new AbortController(),remove=f.clients[0].files.removeFile;
 f.clients[0].files.removeFile=async options=>{await remove(options);abort.abort();};
 await assert.rejects(f.decode(abort.signal),error=>error.code==='BUNDLED_ASSET_STOPPED');assert.equal(f.stores[0].size,0);
});
test('Transient owner: invalid budgets and a pre-aborted request have no file or process effects',async()=>{
 const f=fixture(),abort=new AbortController();abort.abort();let produced=0;
 const options={directory:'/data',extension:'mp3',maxBytes:1024,produce:async()=>{produced++;}};
 for(const maxBytes of [0,NaN,32*1024*1024+1])await assert.rejects(f.api.readTransientAsset(f.clients[0],{...options,maxBytes}),error=>error.code==='BUNDLED_ASSET_INPUT');
 await assert.rejects(f.api.readTransientAsset(f.clients[0],{...options,signal:abort.signal}),error=>error.code==='BUNDLED_ASSET_STOPPED');
 assert.equal(produced,0);assert.equal(f.stores[0].size,0);assert.equal(f.calls[0].length,0);
});
test('Transient owner: a completed reservation with a lost creation reply is recovered without replay',async()=>{
 const f=fixture(),write=f.clients[0].files.writeFile;let creations=0;
 f.clients[0].files.writeFile=async(...args)=>{creations++;await write(...args);throw Error('write reply lost');};
 assert.deepEqual(Array.from(await f.decode()),[.25,-.5,1]);assert.equal(creations,1);assert.equal(f.stores[0].size,0);
});
test('Transient owner: an unowned reservation is neither produced nor removed',async()=>{
 const f=fixture();f.clients[0].files.writeFile=async file=>{f.stores[0].set(file,new TextEncoder().encode('another owner'));throw Error('already exists');};
 await assert.rejects(f.decode(),error=>error.code==='BUNDLED_ASSET_RESERVATION_UNKNOWN');
 assert.equal(f.calls[0].filter(row=>['remove','ffmpeg'].includes(row[0])).length,0);assert.equal(f.stores[0].size,1);
});
test('Transient owner: an expired producer cannot return bytes even when it ignores the deadline',async()=>{
 const f=fixture();let clock=100;vm.runInContext('Date.now=()=>this.__clock',f.box);f.box.__clock=clock;
 await assert.rejects(f.api.readTransientAsset(f.clients[0],{directory:'/data',extension:'mp3',maxBytes:512,timeoutMs:10,
  produce:async({path})=>{f.stores[0].set(path,new Uint8Array(200));f.box.__clock=111;}}),error=>error.code==='BUNDLED_ASSET_TIMEOUT');
 assert.equal(f.stores[0].size,0);
});
test('Archive PCM consumer: the same shared decode captures its client and retains its requested recipe',async()=>{
 const f=fixture('archive-vlog');f.hooks.afterProduce=output=>{f.stores[1].set(output,new Uint8Array([9]));f.api.hostUseSdk(f.clients[1]);};
 const samples=await f.api.hostDecodePcm('/selected music.mp3','/owned-data',22050,240,null);
 assert.deepEqual(Array.from(samples),[.25,-.5,1]);assert.equal(f.calls[1].length,0);const call=f.calls[0].find(c=>c[0]==='ffmpeg');assert.ok(call[1].includes('22050'));assert.ok(call[1].includes('240'));assert.equal(f.stores[0].size,0);
});
for(const terminal of [false,true])test('Archive own-music caller: '+(terminal?'terminal ownership failure stops fallback':'ordinary decode failure preserves WebAudio fallback'),async()=>{
 const f=fixture('archive-vlog'),require=createRequire(import.meta.url),esbuild=require(process.env.SELECTS_ESBUILD||process.env.SBS_PANEL_TEST_MODULES+'/esbuild');
 const panel=fs.readFileSync(new URL('../plugins/archive-vlog/panel.tsx',import.meta.url),'utf8'),plain=esbuild.transformSync(panel,{loader:'tsx',format:'esm',jsx:'preserve'}).code;
 let decoded=0,read=0;f.clients[0].files.readFile=async()=>{read++;return new Uint8Array([1,2]);};
 const failure=Object.assign(Error('media failed'),{terminal});
 Object.assign(f.box,{OWN_RATE:22050,OWN_MAX_SECONDS:240,hostDecodePcm:async()=>{throw failure;},window:{OfflineAudioContext:class{
  async decodeAudioData(){decoded++;return {length:2,sampleRate:22050,numberOfChannels:1,getChannelData:()=>new Float32Array([.25,-.5])};}
 }}});
 vm.runInContext(topLevel(plain,'decodeOwnMusic')+'\nthis.decodeOwn=decodeOwnMusic;',f.box);
 const work=f.box.decodeOwn('/selected.wav','/data',new AbortController().signal,f.clients[0]);
 if(terminal){await assert.rejects(work,error=>error===failure);assert.equal(read,0);assert.equal(decoded,0);}
 else{assert.deepEqual(Array.from(await work),[.25,-.5]);assert.equal(read,1);assert.equal(decoded,1);}
});
test('Mini preview caller: Stop aborts the producer and waits before cleaning its output',async()=>{
 const f=fixture(),require=createRequire(import.meta.url),esbuild=require(process.env.SELECTS_ESBUILD||process.env.SBS_PANEL_TEST_MODULES+'/esbuild');
 const panel=fs.readFileSync(new URL('../plugins/mini-vlog/panel.tsx',import.meta.url),'utf8'),plain=esbuild.transformSync(panel,{loader:'tsx',format:'esm',jsx:'preserve'}).code.replace(/^  /gm,'');
 const refs={previewTokenRef:{current:0},previewAbortRef:{current:null},previewUrlRef:{current:null},audioRef:{current:null},mountedRef:{current:true}};
 Object.assign(f.box,refs,{sdk:f.clients[0],playState:'idle',ownMusic:{path:'/music.mp3'},cue:null,roots:{plugin:'/install',data:'/data'},start:0,musicKind:'own',videoSeconds:1,setPlayState:()=>{},setPlayingAudio:()=>{},setStatus:()=>{}});
 vm.runInContext(topLevel(plain,'stopPreview')+'\n'+topLevel(plain,'preview')+'\nthis.view={stopPreview,preview};',f.box);
 let ready,release;const started=new Promise(resolve=>{ready=resolve;}),pending=new Promise(resolve=>{release=resolve;});
 f.hooks.bytes=new Uint8Array(256);f.hooks.afterProduce=async(output,signal)=>{ready({output,signal});await pending;};
 const running=f.box.view.preview(),job=await started;f.box.view.stopPreview();
 try{assert.equal(job.signal?.aborted,true);assert.equal(f.stores[0].has(job.output),true,'never delete output under an unsettled producer');}
 finally{release();await running;}
 assert.equal(f.stores[0].size,0);
});
for(const value of ['Infinity','19extra','0','-1','N/A'])test('Music duration observation: invalid stdout is unknown '+value,async()=>{
 const f=fixture();f.hooks.probe=value;assert.equal(await f.api.hostProbeSeconds('/music.wav'),null);
});
test('Shared PCM decoder: real FFmpeg and canonical asynchronous files preserve requested samples and remove staging',async t=>{
 const {holdFixture}=await import('./gallery_hold_fixture.mjs'),f=await holdFixture(t),rate=22050,frames=2205;
 const file=path.join(f.root,"music 'quote' $() \uc74c\uc545.wav"),wav=Buffer.alloc(44+frames*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(frames*2,40);
 for(let i=0;i<frames;i++)wav.writeInt16LE(Math.round(16384*Math.sin(i*2*Math.PI*440/rate)),44+i*2);fs.writeFileSync(file,wav);
 const api=fixture().api;api.hostUseSdk(f.local);const samples=await api.hostDecodePcm(file,f.data,rate,1,null);
 assert.equal(samples.length,frames);assert.ok(Array.from(samples).every(Number.isFinite));assert.ok(Math.max(...samples)>.49);assert.equal(fs.readdirSync(f.data).length,0);assert.equal(f.calls.filter(c=>c.bin==='ffmpeg').length,1);
});
