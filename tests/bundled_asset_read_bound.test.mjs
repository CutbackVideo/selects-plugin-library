import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {webcrypto} from 'node:crypto';
import test from 'node:test';

const require=createRequire(import.meta.url),esbuild=require(process.env.SELECTS_ESBUILD||process.env.SBS_PANEL_TEST_MODULES+'/esbuild');
const source=fs.readFileSync(process.env.BUNDLED_READER_SOURCE||new URL('../shared/bundled-assets.js',import.meta.url),'utf8');
const clientSource=fs.readFileSync(new URL('../shared/local-client.ts',import.meta.url),'utf8');
const codes=new Map();
function fixture(t,{minify=false,size=65536,limit=65536}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'asset-read-bound-')),file=path.join(root,'\uc790\ub8cc $() quoted.bin');
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.writeFileSync(file,Buffer.alloc(size,65));
 const hooks={},reads=[],requests=[];let stats=0,live=true;
 const host={environment:async()=>({platform:process.platform,homedir:root,tempDirectory:root,version:'fixture'}),
  stat:async p=>{
   stats++;let row;try{const s=fs.statSync(p);row={size:s.size,mtimeMs:s.mtimeMs,ino:s.ino,isDirectory:s.isDirectory()};}catch(e){if(e.code!=='ENOENT')throw e;row=null;}
   await hooks.afterStat?.(p,stats,row);return row;
  },
  readRange:async input=>{
   reads.push({...input});await hooks.beforeRead?.(input);
   const handle=fs.openSync(input.path,'r');
   try{const bytes=Buffer.alloc(input.length),count=fs.readSync(handle,bytes,0,input.length,input.offset);return {bytesRead:count,base64:bytes.subarray(0,count).toString('base64')};}
   finally{fs.closeSync(handle);}
  },
 };
 const sdk={runScript:async input=>{requests.push(input);try{return {result:await vm.runInNewContext('(async()=>{'+input.script+'})()',{selects:{files:host}})};}catch(error){return {isError:true,output:error.message};}}};
 if(!codes.has(minify))codes.set(minify,{
  reader:esbuild.transformSync(source+'\nexport {readBundledAssetBytes};',{format:'cjs',target:'es2022',minify}).code,
  client:esbuild.transformSync(clientSource,{loader:'ts',format:'cjs',target:'es2022',minify}).code,
 });
 const globals={crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,atob,btoa,setTimeout,clearTimeout};
 const load=code=>{const module={exports:{}};vm.runInNewContext(code,{...globals,module,exports:module.exports,require:()=>({})});return module.exports;};
 const reader=load(codes.get(minify).reader).readBundledAssetBytes;
 const read=async()=>{const local=await load(codes.get(minify).client).createPanelLocalClient(sdk);await hooks.client?.(local);return reader(local.files,file,limit,()=>{if(!live)throw Object.assign(Error('stopped'),{code:'BUNDLED_ASSET_STOPPED'});});};
 return {root,file,hooks,reads,requests,read,reader,stop:()=>{live=false;},stats:()=>stats};
}
const transferred=f=>f.reads.reduce((sum,row)=>sum+row.length,0);

for(const minify of [false,true]){
 test('Asset read bound: growth after size preflight cannot expand the read (minify='+minify+')',async t=>{
  const f=fixture(t,{minify});f.hooks.afterStat=(_p,count)=>{if(count===1)fs.appendFileSync(f.file,Buffer.alloc(2*1024*1024));};
  await assert.rejects(f.read(),e=>e.code==='BUNDLED_ASSET_CHANGED');
  assert.ok(transferred(f)<=65536,JSON.stringify({budget:65536,requested:transferred(f)}));
  assert.ok(f.reads.every(row=>row.offset+row.length<=65536));
 });
 test('Asset read bound: growth during bounded transport cannot be accepted as the old file (minify='+minify+')',async t=>{
  const f=fixture(t,{minify});let changed=false;f.hooks.beforeRead=()=>{if(!changed){changed=true;fs.appendFileSync(f.file,Buffer.alloc(2*1024*1024));}};
  await assert.rejects(f.read(),e=>e.code==='BUNDLED_ASSET_CHANGED');assert.ok(transferred(f)<=65536);
 });
 test('Asset read bound: same-size replacement during read is rejected (minify='+minify+')',async t=>{
  const f=fixture(t,{minify});let changed=false;f.hooks.beforeRead=()=>{if(!changed){changed=true;const next=path.join(f.root,'replacement');fs.writeFileSync(next,Buffer.alloc(65536,66));fs.renameSync(next,f.file);}};
  await assert.rejects(f.read(),e=>e.code==='BUNDLED_ASSET_CHANGED');assert.ok(transferred(f)<=65536);
 });
 test('Asset read bound: an unchanged exact-limit file retains all its bytes (minify='+minify+')',async t=>{
  const f=fixture(t,{minify}),result=await f.read();assert.deepEqual(Buffer.from(result),fs.readFileSync(f.file));assert.equal(transferred(f),65536);
  assert.ok(f.requests.every(input=>input.allowCommit===false),'asset observation remains read-only');
 });
}

test('Asset read bound: short reads are rejected rather than treated as a smaller asset',async t=>{
 const f=fixture(t);let changed=false;f.hooks.beforeRead=()=>{if(!changed){changed=true;fs.truncateSync(f.file,13);}};
 await assert.rejects(f.read(),e=>e.code==='BUNDLED_ASSET_CHANGED');assert.ok(transferred(f)<=65536);
});
test('Asset read bound: disappearing after a read cannot return a successful asset',async t=>{
 const f=fixture(t);f.hooks.client=local=>{const read=local.files.readRange;local.files.readRange=async(...args)=>{const bytes=await read(...args);fs.unlinkSync(f.file);return bytes;};};
 await assert.rejects(f.read(),e=>e.code==='BUNDLED_ASSET_CHANGED');
});
test('Asset read bound: cancellation after the final metadata reply retains its error',async t=>{
 const f=fixture(t);f.hooks.afterStat=(_p,count)=>{if(count===2)f.stop();};await assert.rejects(f.read(),e=>e.code==='BUNDLED_ASSET_STOPPED');
});
for(const size of [0,65537])test('Asset read bound: an invalid initial size '+size+' is refused without body transport',async t=>{
 const f=fixture(t,{size});await assert.rejects(f.read(),e=>e.code==='BUNDLED_ASSET_BYTES');assert.equal(f.reads.length,0);
});
test('Asset read bound: a client without bounded reads gets an explicit unsupported error',async t=>{
 const f=fixture(t);f.hooks.client=local=>{delete local.files.readRange;};
 await assert.rejects(f.read(),e=>e.code==='BUNDLED_ASSET_UNSUPPORTED');assert.equal(f.reads.length,0);
});
test('Asset read bound: supported clients never fall back to a whole-file read',async t=>{
 const f=fixture(t);f.hooks.client=local=>{local.files.readFile=()=>{throw Error('whole-file allocation is forbidden');};};
 assert.equal((await f.read()).length,65536);assert.equal(transferred(f),65536);
});
test('Asset read bound: DataView and subarray input retain the established byte-view contract',async t=>{
 const f=fixture(t,{size:4,limit:4}),backing=new Uint8Array([0,65,65,65,65,0]);
 for(const raw of [new DataView(backing.buffer,1,4),backing.subarray(1,5)]){
  const files={stat:async()=>({size:4,isDirectory:false,mtimeMs:1,ino:1}),readRange:async()=>raw,readFile:async()=>raw};
  const result=await f.reader(files,f.file,4,()=>{});assert.deepEqual([...result],[65,65,65,65]);result[0]=66;assert.equal(backing[1],65,'return bytes remain an independent copy');
 }
});
