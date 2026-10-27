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
function host({native=true,fail=false,mutate,stdout,hold=false}={}) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'template-native-hash-'));
 const filename=path.join(root,'\ud55c\uae00 "quoted" ; $file.bin'),calls=[],jobs=new Map();let reads=0,cancels=0;
 const selects={files:{
  environment:async()=>({platform:'darwin',homedir:root,tempDirectory:root,version:'test'}),
  stat:async p=>{try{const s=fs.statSync(p);return {size:s.size,mtimeMs:s.mtimeMs,ino:s.ino,isDirectory:s.isDirectory()};}catch(e){if(e.code==='ENOENT')return null;throw e;}},
  readRange:async({path:p,offset,length})=>{reads++;const b=fs.readFileSync(p).subarray(offset,offset+length);return {bytesRead:b.length,base64:b.toString('base64')};},
 },media:{}};
 if(native)selects.media.startFFmpeg=async({args})=>{
  calls.push(args);assert.equal(args[args.indexOf('-i')+1],'file:'+filename);
  const result=fail?{status:1,stdout:'',stderr:'read failed'}:spawnSync('ffmpeg',args,{encoding:'utf8'});
  assert(!result.error,result.error?.message);mutate?.(filename);
  const id='hash-'+jobs.size;jobs.set(id,{state:hold?'running':result.status===0?'succeeded':'failed',text:stdout??result.stdout,error:result.stderr});return {jobId:id};
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
 return {root,filename,calls,jobs,selects,get reads(){return reads;},get cancels(){return cancels;},
  client:()=>module.createPanelLocalClient(sdk),close(){disposePanelModule(module);fs.rmSync(root,{recursive:true,force:true});}};
}
for(const size of [0,1,49153,1024*1024+7])test('raw native hashing matches every original byte: '+size,async()=>{
 const h=host();try{
  const bytes=Buffer.alloc(size);for(let i=0;i<size;i++)bytes[i]=(i*131+17)%256;fs.writeFileSync(h.filename,bytes);
  const client=await h.client();const progress=[];
  const result=await client.files.fingerprint(h.filename,{native:true,onProgress:n=>progress.push(n)});
  assert.deepEqual(JSON.parse(JSON.stringify(result)),{size,sha256:createHash('sha256').update(bytes).digest('hex')});
  assert.equal(h.calls.length,1);assert.equal(h.reads,0);assert.deepEqual(progress,[size]);
 }finally{h.close();}
});
test('missing native capability alone falls back to complete legacy hashing',async()=>{
 const h=host({native:false});try{fs.writeFileSync(h.filename,'original');const client=await h.client();
  assert.equal((await client.files.fingerprint(h.filename,{native:true})).sha256,createHash('sha256').update('original').digest('hex'));assert.equal(h.reads,1);
 }finally{h.close();}
});
for(const options of [{fail:true},{stdout:'SHA256=invalid\n'},{mutate:p=>fs.appendFileSync(p,'changed')}])test('native failure or changed identity never falls back '+JSON.stringify(options),async()=>{
 const h=host(options);try{fs.writeFileSync(h.filename,'original');const client=await h.client();await assert.rejects(client.files.fingerprint(h.filename,{native:true}));assert.equal(h.reads,0);}finally{h.close();}
});
test('same stat metadata never authorizes reusing an earlier digest',async()=>{
 const h=host();try{fs.writeFileSync(h.filename,'alpha');const client=await h.client(),first=await client.files.fingerprint(h.filename,{native:true});const s=fs.statSync(h.filename);fs.writeFileSync(h.filename,'omega');fs.utimesSync(h.filename,s.atime,s.mtime);const second=await client.files.fingerprint(h.filename,{native:true});assert.notEqual(first.sha256,second.sha256);assert.equal(h.calls.length,2);}finally{h.close();}
});
test('abort cancels only the owned native read and publishes no completion',async()=>{
 const h=host({hold:true});try{fs.writeFileSync(h.filename,'original');const client=await h.client(),controller=new AbortController(),progress=[];
  const pending=client.files.fingerprint(h.filename,{native:true,signal:controller.signal,onProgress:n=>progress.push(n)});
  setTimeout(()=>controller.abort(),10);await assert.rejects(pending,e=>e.name==='AbortError');assert.equal(h.cancels,1);assert.equal(h.reads,0);assert.deepEqual(progress,[]);
 }finally{h.close();}
});
test('invalid or relative paths fail before any process starts',async()=>{
 const h=host();try{const client=await h.client();for(const p of ['relative','/bad\0path','https://example.com/input'])await assert.rejects(client.files.fingerprint(p,{native:true}));assert.equal(h.calls.length,0);}finally{h.close();}
});
const sdkObserver=(h,globals={})=>vm.runInNewContext('('+nativeSourceFiles.toString()+')(selects)',{selects:h.selects,...globals});
test('SDK assembly source observer hashes actual original bytes without sandbox globals or range reads',async()=>{
 const h=host();try{
  const bytes=Buffer.alloc(1024*1024+7,23);fs.writeFileSync(h.filename,bytes);
  const result=await sdkObserver(h).fingerprint(h.filename);
  assert.deepEqual(JSON.parse(JSON.stringify(result)),{size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});assert.equal(h.reads,0);assert.equal(h.calls.length,1);assert.equal(h.cancels,0);
 }finally{h.close();}
});
for(const options of [{fail:true},{stdout:'SHA256=invalid\n'},{mutate:p=>fs.appendFileSync(p,'changed')},{native:false}])test('SDK assembly native failure never falls back '+JSON.stringify(options),async()=>{
 const h=host(options);try{fs.writeFileSync(h.filename,'original');await assert.rejects(sdkObserver(h).fingerprint(h.filename));assert.equal(h.reads,0);}finally{h.close();}
});
test('SDK assembly shared deadline cancels and confirms only its own pending native read',async()=>{
 const h=host({hold:true});try{
  fs.writeFileSync(h.filename,'original');let clock=0;
  const observer=vm.runInNewContext('('+nativeSourceFiles.toString()+')(selects,10)',{selects:h.selects,Date:{now:()=>++clock}});
  await assert.rejects(observer.fingerprint(h.filename),/timed out/);assert.equal(h.cancels,1);assert.equal(h.reads,0);assert.equal(h.jobs.get('hash-0').state,'cancelled');
 }finally{h.close();}
});
test('SDK assembly uncertain native exit retains work and forbids a successful source observation',async()=>{
 const h=host({hold:true});try{
  fs.writeFileSync(h.filename,'original');let checks=0;
  const job=h.selects.media.job;h.selects.media.job=id=>({...job(id),cancel:async()=>{throw Error('lost cancellation response');}});
  await assert.rejects(sdkObserver(h).fingerprint(h.filename,{check:()=>{if(++checks===4)throw Error('scope changed');}}),e=>e.preserveTemporaryFiles===true&&/exit/.test(e.message));assert.equal(h.reads,0);assert.equal(h.calls.length,1);
 }finally{h.close();}
});
test('SDK assembly unknown native start is retained without retrying or cancelling another job',async()=>{
 const h=host();try{
  fs.writeFileSync(h.filename,'original');let starts=0;h.selects.media.startFFmpeg=async()=>{starts++;throw Error('lost start response');};
  await assert.rejects(sdkObserver(h).fingerprint(h.filename),e=>e.preserveTemporaryFiles===true&&/start/.test(e.message));assert.equal(starts,1);assert.equal(h.cancels,0);assert.equal(h.reads,0);
 }finally{h.close();}
});
