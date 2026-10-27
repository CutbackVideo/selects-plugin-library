import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {loadPanelModule,disposePanelModule} from './panel_module_fixture.mjs';
import {fingerprintTemplateFile} from '../shared/file-observation.js';
import vm from 'node:vm';
import {nativeSourceFiles} from '../shared/native-source-files.js';

const source=fs.readFileSync(new URL('../shared/local-client.ts',import.meta.url),'utf8');
const prefixOnly=(h,count=1)=>{assert.equal(h.reads,count);assert.ok(h.readRequests.every(row=>row.offset===0&&row.length<=10),'native observations may read only the bounded ID3 signature');};
function host({native=true,fail=false,mutate,stdout,hold=false,skipId3=false}={}) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'template-native-hash-'));
 const filename=path.join(root,'\ud55c\uae00 "quoted" ; $file.bin'),calls=[],jobs=new Map();let reads=0,cancels=0;const readRequests=[];
 const selects={files:{
  environment:async()=>({platform:'darwin',homedir:root,tempDirectory:root,version:'test'}),
  stat:async p=>{try{const s=fs.statSync(p);return {size:s.size,mtimeMs:s.mtimeMs,ino:s.ino,isDirectory:s.isDirectory()};}catch(e){if(e.code==='ENOENT')return null;throw e;}},
  readRange:async({path:p,offset,length})=>{reads++;readRequests.push({path:p,offset,length});const b=fs.readFileSync(p).subarray(offset,offset+length);return {bytesRead:b.length,base64:b.toString('base64')};},
 },media:{}};
 if(native)selects.media.startFFmpeg=async({args})=>{
  calls.push(args);assert.equal(args[args.indexOf('-i')+1],'file:'+filename);
  const result=fail?{status:1,stdout:'',stderr:'read failed'}:spawnSync(process.env.SELECTS_NATIVE_HASH_FFMPEG||'ffmpeg',args,{encoding:'utf8'});
  assert(!result.error,result.error?.message);mutate?.(filename);
  const original=fs.readFileSync(filename),nativeText=skipId3&&original.subarray(0,3).toString()==='ID3'?'SHA256='+createHash('sha256').update(original.subarray(10)).digest('hex')+'\n':result.stdout;
  const id='hash-'+jobs.size;jobs.set(id,{state:hold?'running':result.status===0?'succeeded':'failed',text:stdout??nativeText,error:result.stderr});return {jobId:id};
 };
 selects.media.job=id=>({cancel:async()=>{cancels++;jobs.get(id).state='cancelled';},status:async({cursor=0}={})=>{const j=jobs.get(id),events=cursor||!j.text?[]:[{cursor:1,stream:'stdout',text:j.text}];return {state:j.state,events,nextCursor:events.at(-1)?.cursor??cursor,truncated:false,error:j.error};}});
 const sdk={runScript:async input=>{
  const result=await new Function('selects','return (async()=>{'+input.script+'})()')(selects);
  return {isError:false,result};
 },call:async(method,id,{cursor=0})=>{
  assert.equal(method,'getLocalMediaJobStatus');const j=jobs.get(id);
  const events=cursor||!j.text?[]:[{cursor:1,stream:'stdout',text:j.text}];
  return {state:j.state,events,nextCursor:events.at(-1)?.cursor??cursor,truncated:false,error:j.error};
 }};
 const module=loadPanelModule(source,{names:['createPanelLocalClient'],modules:{'./file-observation.js':{fingerprintTemplateFile}}});
 return {root,filename,calls,jobs,selects,readRequests,get reads(){return reads;},get cancels(){return cancels;},
  client:()=>module.createPanelLocalClient(sdk),close(){disposePanelModule(module);fs.rmSync(root,{recursive:true,force:true});}};
}
for(const size of [0,1,49153,1024*1024+7])test('raw native hashing matches every original byte: '+size,async()=>{
 const h=host();try{
  const bytes=Buffer.alloc(size);for(let i=0;i<size;i++)bytes[i]=(i*131+17)%256;fs.writeFileSync(h.filename,bytes);
  const client=await h.client();const progress=[];
  const result=await client.files.fingerprint(h.filename,{native:true,onProgress:n=>progress.push(n)});
  assert.deepEqual(JSON.parse(JSON.stringify(result)),{size,sha256:createHash('sha256').update(bytes).digest('hex')});
  assert.equal(h.calls.length,1);prefixOnly(h,size>0?1:0);assert.deepEqual(progress,[size]);
 }finally{h.close();}
});
test('missing native capability alone falls back to complete legacy hashing',async()=>{
 const h=host({native:false});try{fs.writeFileSync(h.filename,'original');const client=await h.client();
  assert.equal((await client.files.fingerprint(h.filename,{native:true})).sha256,createHash('sha256').update('original').digest('hex'));assert.equal(h.reads,1);
 }finally{h.close();}
});
for(const options of [{fail:true},{stdout:'SHA256=invalid\n'},{mutate:p=>fs.appendFileSync(p,'changed')}])test('native failure or changed identity never falls back '+JSON.stringify(options),async()=>{
 const h=host(options);try{fs.writeFileSync(h.filename,'original');const client=await h.client();await assert.rejects(client.files.fingerprint(h.filename,{native:true}));prefixOnly(h);}finally{h.close();}
});
test('same stat metadata never authorizes reusing an earlier digest',async()=>{
 const h=host();try{fs.writeFileSync(h.filename,'alpha');const client=await h.client(),first=await client.files.fingerprint(h.filename,{native:true});const s=fs.statSync(h.filename);fs.writeFileSync(h.filename,'omega');fs.utimesSync(h.filename,s.atime,s.mtime);const second=await client.files.fingerprint(h.filename,{native:true});assert.notEqual(first.sha256,second.sha256);assert.equal(h.calls.length,2);}finally{h.close();}
});
test('abort cancels only the owned native read and publishes no completion',async()=>{
 const h=host({hold:true});try{fs.writeFileSync(h.filename,'original');const client=await h.client(),controller=new AbortController(),progress=[];
  const pending=client.files.fingerprint(h.filename,{native:true,signal:controller.signal,onProgress:n=>progress.push(n)});
  setTimeout(()=>controller.abort(),10);await assert.rejects(pending,e=>e.name==='AbortError');assert.equal(h.cancels,1);prefixOnly(h);assert.deepEqual(progress,[]);
 }finally{h.close();}
});
test('invalid or relative paths fail before any process starts',async()=>{
 const h=host();try{const client=await h.client();for(const p of ['relative','/bad\0path','https://example.com/input'])await assert.rejects(client.files.fingerprint(p,{native:true}));assert.equal(h.calls.length,0);}finally{h.close();}
});
const sdkObserver=(h,globals={})=>vm.runInNewContext('('+nativeSourceFiles.toString()+')(selects)',{selects:h.selects,fingerprintTemplateFile,...globals});
function pacedObserver({cancel=false}={}){
 let now=0,reads=0,cancels=0;const waits=[],sha='a'.repeat(64),meta={size:1,mtimeMs:1,ino:1,isDirectory:false};
 const selects={files:{stat:async()=>meta,readRange:async()=>({bytesRead:1,base64:'YQ=='})},media:{
  startFFmpeg:async()=>({jobId:'own'}),job:()=>({cancel:async()=>{cancels++;},status:async({cursor=0}={})=>{
   if(++reads>20)throw Error('status polling exceeded its budget');
   const state=now<450?'running':cancel?'cancelled':'succeeded';
   const events=state==='succeeded'&&!cursor?[{cursor:1,stream:'stdout',text:'SHA256='+sha+'\n'}]:[];
   return {state,events,nextCursor:events.length?1:cursor,truncated:false};
  }})}};
 const Atomics={waitAsync:(_cell,_index,_expected,ms)=>{waits.push(ms);now+=ms;return {async:true,value:Promise.resolve('timed-out')};}};
 const observer=sdkObserver({selects},{Date:{now:()=>now},Atomics});
 return {observer,waits,sha,get reads(){return reads;},get cancels(){return cancels;}};
}
test('SDK source polling yields between running observations and drains terminal output',async()=>{
 const h=pacedObserver(),row=await h.observer.fingerprint('/owned');
 assert.equal(row.sha256,h.sha);assert.deepEqual(h.waits,[150,150,150]);assert.equal(h.reads,5);assert.equal(h.cancels,0);
});
test('SDK cancellation polling also yields without restarting its job',async()=>{
 const h=pacedObserver({cancel:true});let checks=0;
 await assert.rejects(h.observer.fingerprint('/owned',{check(){if(++checks>=4)throw Error('scope ended');}}),/scope ended/);
 assert.equal(h.cancels,1);assert.deepEqual(h.waits,[150,150,150]);assert.equal(h.reads,4);
});
test('SDK source observer refuses an unavailable nonblocking scheduler before native dispatch',async()=>{
 let starts=0;const meta={size:0,mtimeMs:1,ino:1,isDirectory:false};
 const observer=sdkObserver({selects:{files:{stat:async()=>meta},media:{startFFmpeg:async()=>{starts++;},job(){}}}},{Atomics:{}});
 await assert.rejects(observer.fingerprint('/owned'),/nonblocking|scheduler/i);assert.equal(starts,0);
});
for(const entry of ['panel','SDK'])test(entry+' ID3 originals preselect complete-byte hashing before a tag-stripping native reader',async()=>{
 const h=host({skipId3:true});try{
  const bytes=Buffer.concat([Buffer.from('ID3\x04\0\0\0\0\0\0'),Buffer.alloc(1024*1024+7,23)]);fs.writeFileSync(h.filename,bytes);
  const result=entry==='panel'?await(await h.client()).files.fingerprint(h.filename,{native:true}):await sdkObserver(h).fingerprint(h.filename);
  assert.equal(result.sha256,createHash('sha256').update(bytes).digest('hex'));assert.equal(result.size,bytes.length);assert.equal(h.calls.length,0,'ID3 is selected before any native dispatch');assert.ok(h.reads>1,'every original byte still crosses the complete-byte observer');
 }finally{h.close();}
});
test('SDK assembly source observer hashes actual original bytes without sandbox globals or whole-file range reads',async()=>{
 const h=host();try{
  const bytes=Buffer.alloc(1024*1024+7,23);fs.writeFileSync(h.filename,bytes);
  const result=await sdkObserver(h).fingerprint(h.filename);
  assert.deepEqual(JSON.parse(JSON.stringify(result)),{size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});prefixOnly(h);assert.equal(h.calls.length,1);assert.equal(h.cancels,0);
 }finally{h.close();}
});
for(const options of [{fail:true},{stdout:'SHA256=invalid\n'},{mutate:p=>fs.appendFileSync(p,'changed')},{native:false}])test('SDK assembly native failure never falls back '+JSON.stringify(options),async()=>{
 const h=host(options);try{fs.writeFileSync(h.filename,'original');await assert.rejects(sdkObserver(h).fingerprint(h.filename));prefixOnly(h);}finally{h.close();}
});
test('SDK assembly shared deadline cancels and confirms only its own pending native read',async()=>{
 const h=host({hold:true});try{
  fs.writeFileSync(h.filename,'original');let clock=0;
  // One virtual clock owns both elapsed time and nonblocking waits. A real
  // Atomics wait does not keep Node's event loop alive after this fake job ends.
  const Atomics={waitAsync:(_cell,_index,_value,ms)=>{clock+=ms;return {async:true,value:Promise.resolve('timed-out')};}};
  const observer=vm.runInNewContext('('+nativeSourceFiles.toString()+')(selects,10)',{selects:h.selects,Date:{now:()=>++clock},Atomics});
  await assert.rejects(observer.fingerprint(h.filename),/timed out/);assert.equal(h.cancels,1);prefixOnly(h);assert.equal(h.jobs.get('hash-0').state,'cancelled');
 }finally{h.close();}
});
test('SDK assembly uncertain native exit retains work and forbids a successful source observation',async()=>{
 const h=host({hold:true});try{
  fs.writeFileSync(h.filename,'original');let checks=0;
  const job=h.selects.media.job;h.selects.media.job=id=>({...job(id),cancel:async()=>{throw Error('lost cancellation response');}});
  await assert.rejects(sdkObserver(h).fingerprint(h.filename,{check:()=>{if(++checks===4)throw Error('scope changed');}}),e=>e.preserveTemporaryFiles===true&&/exit/.test(e.message));prefixOnly(h);assert.equal(h.calls.length,1);
 }finally{h.close();}
});
test('SDK assembly unknown native start is retained without retrying or cancelling another job',async()=>{
 const h=host();try{
  fs.writeFileSync(h.filename,'original');let starts=0;h.selects.media.startFFmpeg=async()=>{starts++;throw Error('lost start response');};
  await assert.rejects(sdkObserver(h).fingerprint(h.filename),e=>e.preserveTemporaryFiles===true&&/start/.test(e.message));assert.equal(starts,1);assert.equal(h.cancels,0);prefixOnly(h);
 }finally{h.close();}
});
