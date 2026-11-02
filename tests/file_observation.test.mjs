import {mediaFingerprint} from './media_fingerprint_fixture.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import test from 'node:test';
import {createRequire} from 'node:module';
import {fingerprintTemplateFile} from '../shared/file-observation.js';
const execute=(files,path='/original',check=()=>{},scheme=null)=>vm.runInNewContext('('+fingerprintTemplateFile.toString()+')(files,path,check,scheme)',{files,path,check,scheme},{codeGeneration:{strings:false,wasm:false}});
test('serialized observer delegates a large original to one host call without reading bytes',async()=>{
 const expected={size:94853361,sha256:'a'.repeat(64)};let calls=0;
 const result=await execute({fingerprint:async path=>{assert.equal(path,'/original');calls++;return expected;},readRange:()=>{throw Error('Guest file read');},stat:()=>{throw Error('Guest stat');}});
 assert.deepEqual(JSON.parse(JSON.stringify(result)),expected);assert.equal(calls,1);

});
test('missing files stay null, while host failures propagate',async()=>{
 assert.equal(await execute({fingerprint:async()=>null}),null);
 await assert.rejects(execute({fingerprint:async()=>{throw Error('changed during hashing');}}),/changed during hashing/);
 assert.equal(await execute({stat:async()=>null,readRange:async()=>{throw Error('unexpected read');}}),null);
});
for(const observed of [{size:-1,sha256:'a'.repeat(64)},{size:1,sha256:'bad'},undefined])test('rejects invalid host result '+JSON.stringify(observed),async()=>{
 await assert.rejects(execute({fingerprint:async()=>observed}),/fingerprint/);
});
test('scope checks prevent dispatch and discard results after cancellation',async()=>{
 let calls=0,expired=true;const files={fingerprint:async()=>{calls++;expired=true;return {size:0,sha256:'a'.repeat(64)};}};
 const check=()=>{if(expired)throw Error('expired');};
 await assert.rejects(execute(files,'/original',check),/expired/);assert.equal(calls,0);
 expired=false;await assert.rejects(execute(files,'/original',check),/expired/);assert.equal(calls,1);
});
test('the pure JS copy passes the SDK TypeScript shape check without suppressing SDK diagnostics',{skip:!process.env.SELECTS_DEV_REPO},()=>{
 const ts=createRequire(process.env.SELECTS_DEV_REPO+'/package.json')('typescript');
 const prefix='declare const selects: { files: {stat(path:string):Promise<any>;readRange(input:{path:string;offset:number;length:number}):Promise<{bytesRead:number;base64:string}>;fingerprint(path:string):Promise<{size:number;sha256:string}|null>} };\n';
 const check=(extra,legacy=false)=>{
  const source=(legacy?prefix.replace('fingerprint(path:string):Promise<{size:number;sha256:string}|null>',''):prefix)+'async function request(){return await ('+fingerprintTemplateFile.toString()+')(selects.files,"/original");}\n'+extra,file='/fingerprint.ts';
  const options={noEmit:true,strict:false,noImplicitAny:false,skipLibCheck:true,target:ts.ScriptTarget.ES2022,lib:['lib.es2022.d.ts'],types:[]};
  const host=ts.createCompilerHost(options),get=host.getSourceFile;host.getSourceFile=(name,...args)=>name===file?ts.createSourceFile(file,source,options.target,true):get(name,...args);
  return ts.getPreEmitDiagnostics(ts.createProgram([file],options,host));
 };
 const valid=check('');assert.equal(valid.length,0,valid.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join('\n'));
 const old=check('',true);assert.equal(old.length,0,old.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join('\n'));
 const invalid=check('selects.files.fingerprint(123);');assert(invalid.some(d=>d.code===2345),'SDK argument errors must remain visible');
});

function legacyFiles(bytes=Buffer.from('abc')) {
 return {stat:async()=>({isDirectory:false,size:bytes.length,mtimeMs:1,ino:7}),readRange:async({offset,length})=>({bytesRead:Math.min(length,bytes.length-offset),base64:bytes.subarray(offset,offset+length).toString('base64')})};
}
for(const unsupported of [null,'Unsupported file operation.'])test('legacy fallback hashes exact bytes when interface is absent: '+unsupported,async()=>{
 const files=legacyFiles();if(unsupported)files.fingerprint=async()=>{throw Error(unsupported);};
 const actual=await execute(files);
 assert.deepEqual(JSON.parse(JSON.stringify(actual)),{size:3,sha256:'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'});
});
for(const message of ['Permission denied','File changed during fingerprint','File fingerprint timed out','Unsupported file format'])test('host failure never falls back: '+message,async()=>{
 const files=legacyFiles();files.fingerprint=async()=>{throw Error(message);};
 await assert.rejects(execute(files),error=>error.message===message);
});
test('legacy fallback rejects incomplete reads and changed sources',async()=>{
 const short=legacyFiles();short.readRange=async()=>({bytesRead:1,base64:'YQ=='});
 await assert.rejects(execute(short),/incomplete/);
 const changed=legacyFiles();let count=0;changed.stat=async()=>({isDirectory:false,size:3,mtimeMs:++count,ino:7});
 await assert.rejects(execute(changed),/changed/);
});

for(const size of [0,55,56,63,64,65,49151,49152,49153,3*49152+7])test('legacy hashing preserves padding and chunk boundaries: '+size,async()=>{
 const bytes=Buffer.alloc(size);for(let index=0;index<size;index++)bytes[index]=(index*131+17)%256;
 const result=await execute(legacyFiles(bytes));
 assert.deepEqual(JSON.parse(JSON.stringify(result)),{size,sha256:createHash('sha256').update(bytes).digest('hex')});
});
test('legacy cancellation discards a completed chunk before further reads',async()=>{
 const files=legacyFiles(Buffer.alloc(49153));let expired=false;const read=files.readRange;
 files.readRange=async input=>{const result=await read(input);expired=true;return result;};
 await assert.rejects(execute(files,'/original',()=>{if(expired)throw Error('cancelled');}),/cancelled/);
});

const sample=(files,check=()=>{})=>execute(files,'/original',check,'cutback.media-content.v2');
for(const size of [1,786432,786433,2097153])test('sampled legacy observation matches native v2 bytes and stays bounded: '+size,async()=>{
 const bytes=Buffer.alloc(size);for(let i=0;i<size;i++)bytes[i]=(i*31+i%251)%256;
 const files=legacyFiles(bytes),read=files.readRange;let total=0;files.readRange=async request=>{assert(request.length<=49152);total+=request.length;return read(request);};
 assert.deepEqual(JSON.parse(JSON.stringify(await sample(files))),mediaFingerprint(bytes));assert.equal(total,Math.min(size,786432));
});
test('media native errors never downgrade to samples; only absent or exact unsupported operation does',async()=>{
 const bytes=Buffer.from('source'),files=legacyFiles(bytes);files.mediaFingerprint=async()=>{throw Error('Unsupported file operation');};
 assert.deepEqual(JSON.parse(JSON.stringify(await sample(files))),mediaFingerprint(bytes));
 files.mediaFingerprint=async()=>{throw Error('permission denied');};await assert.rejects(sample(files),/permission denied/);
 files.mediaFingerprint=async()=>null;assert.equal(await sample(files),null);
 files.mediaFingerprint=async()=>({size:1,sha256:'a'.repeat(64)});await assert.rejects(sample(files),/sampled/);
});
test('unsampled mutation can preserve source identity but never full-file integrity',async()=>{
 const bytes=Buffer.alloc(2*1024*1024),files=legacyFiles(bytes),before=await sample(files),full=await execute(files);
 bytes[262144]=1;assert.deepEqual(JSON.parse(JSON.stringify(await sample(files))),JSON.parse(JSON.stringify(before)));
 assert.notEqual((await execute(files)).sha256,full.sha256);
});
