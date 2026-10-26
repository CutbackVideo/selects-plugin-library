import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import {webcrypto} from 'node:crypto';import {holdFixture,hash} from './gallery_hold_fixture.mjs';
const source=fs.readFileSync(new URL('../shared/bundled-assets.js',import.meta.url),'utf8');
const mount=()=>{const box=vm.createContext({crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,AbortController,setTimeout,clearTimeout});vm.runInContext(source+'\nthis.api={readTransientAsset,prepareDerivedAsset,runAssetMediaTool};',box);return box.api;};
const unknown=()=>Object.assign(Error('native exit not confirmed'),{code:'LOCAL_MEDIA_SETTLEMENT_UNKNOWN',publicMessage:'The media job exit could not be confirmed.',terminal:true,preserveTemporaryFiles:true});
const reservations=f=>fs.existsSync(f.data)?fs.readdirSync(f.data,{recursive:true}).filter(p=>/\.(?:source|output|media)-/.test(p)):[];
test('unconfirmed media: temporary output is retained rather than removed under an unresolved job',async t=>{
 const f=await holdFixture(t),api=mount();let output;
 await assert.rejects(api.readTransientAsset(f.local,{directory:f.data,extension:'gray',maxBytes:1024,produce:async({path})=>{output=path;await f.local.files.writeFile(path,'unfinished decoder output');throw unknown();}}),e=>e.terminal&&e.preserveTemporaryFiles);
 assert.ok(fs.existsSync(output));assert.equal(reservations(f).length,1);
});
test('unconfirmed media: nested decoder uncertainty retains its private source and all private outputs',async t=>{
 const f=await holdFixture(t),api=mount();
 await assert.rejects(api.prepareDerivedAsset(f.local.files,{directory:f.data,key:'a'.repeat(64),sourcePath:f.source,source:{sha256:hash(f.source),bytes:fs.statSync(f.source).size},extension:'json',cleanupRequired:true,hashFile:async p=>hash(p),verify:async()=>{},produce:async()=>api.readTransientAsset(f.local,{directory:f.data,extension:'gray',maxBytes:1024,produce:async({path})=>{await f.local.files.writeFile(path,'unfinished output');throw unknown();}})}),e=>e.terminal&&e.preserveTemporaryFiles);
 assert.equal(reservations(f).length,3,'a potentially running decoder still owns its snapshot and working outputs');assert.ok(!fs.existsSync(path.join(f.data,'index')));
});
test('confirmed media control: a known stopped producer still removes its exclusively reserved files',async t=>{
 const f=await holdFixture(t),api=mount();await assert.rejects(api.readTransientAsset(f.local,{directory:f.data,extension:'gray',maxBytes:1024,produce:async()=>{throw Object.assign(Error('known stopped'),{code:'BUNDLED_ASSET_STOPPED',terminal:true});}}));assert.deepEqual(reservations(f),[]);
});
test('unconfirmed media: cancellation classification preserves unresolved job ownership',async()=>{
 const api=mount(),c=new AbortController();await assert.rejects(api.runAssetMediaTool({runFFmpeg:async()=>{c.abort();throw unknown();}},'runFFmpeg',[],{signal:c.signal}),e=>e.terminal&&e.preserveTemporaryFiles);
});

import {loadMediaClient} from './local_media_fixture.mjs';
test('unconfirmed media integration: the actual private client retains nested staging when all exit observations are lost',async t=>{
 const f=await holdFixture(t),api=mount(),unrelated=path.join(f.root,'unrelated.txt');fs.writeFileSync(unrelated,'keep');let starts=0,cancels=0,output;
 const selects={files:f.files,media:{startFFmpeg:async({args})=>{starts++;output=args.at(-1);fs.writeFileSync(output,'native writer still owns output');return {jobId:'uncertain-native-job'};},job:()=>({cancel:async()=>{cancels++;}})}};
 const sdk={runScript:async input=>({result:await vm.runInNewContext('(async()=>{'+input.script+'})()',{selects})}),call:async()=>{throw Error('controlled unreadable native status');}};
 const local=await loadMediaClient(sdk),started=Date.now();
 await assert.rejects(api.prepareDerivedAsset(local.files,{directory:f.data,key:'b'.repeat(64),sourcePath:f.source,source:{sha256:hash(f.source),bytes:fs.statSync(f.source).size},extension:'json',cleanupRequired:true,hashFile:async p=>hash(p),verify:async()=>{},produce:async(snapshot)=>api.readTransientAsset(local,{directory:f.data,extension:'gray',maxBytes:1024,produce:async({path})=>api.runAssetMediaTool(local.media,'runFFmpeg',['-i',snapshot,path],{timeoutMs:20})})}),e=>e.terminal&&e.preserveTemporaryFiles&&e.retainedTemporaryFiles.length===3);
 assert.ok(Date.now()-started<6500,'lost read/cancel acknowledgements have a bounded observation lifetime');assert.equal(starts,1);assert.equal(cancels,1);assert.equal(reservations(f).length,3);assert.ok(fs.existsSync(output));fs.appendFileSync(output,' late native write');assert.equal(reservations(f).length,3);assert.equal(fs.readFileSync(unrelated,'utf8'),'keep');assert.ok(!fs.existsSync(path.join(f.data,'index')));
});
test('confirmed media cleanup failure preserves the primary native error without corrupting its code or mutating it',async t=>{
 const f=await holdFixture(t),api=mount(),error=Object.freeze(Object.assign(Error('controlled malformed native status'),{code:'LOCAL_MEDIA_STATUS',publicMessage:'The media status could not be confirmed.',terminal:true}));f.files.remove=async()=>{throw Error('controlled cleanup denial');};
 await assert.rejects(api.readTransientAsset(f.local,{directory:f.data,extension:'gray',maxBytes:1024,produce:async()=>{throw error;}}),e=>/^BUNDLED_ASSET_(PREPARE|CLEANUP)$/.test(e.code)&&e.terminal&&e.cleanupFailures.length===1&&e.cause===error);assert.equal(error.code,'LOCAL_MEDIA_STATUS');
});
