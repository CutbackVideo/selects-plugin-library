import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import test from 'node:test';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import {fingerprintTemplateFile} from '../shared/file-observation.js';

function fixture(bytes) {
 const calls=[];
 let statCount=0;
 const files={
  stat:async path=>{calls.push(['stat',path]);statCount++;return {size:bytes.length,mtimeMs:123,ino:42,isDirectory:false};},
  readRange:async request=>{calls.push(['readRange',request]);const part=bytes.subarray(request.offset,request.offset+request.length);return {bytesRead:part.length,base64:Buffer.from(part).toString('base64')};},
 };
 return {files,calls,get statCount(){return statCount;}};
}
const execute=(files,path='/original',check=()=>{})=>vm.runInNewContext('('+fingerprintTemplateFile.toString()+')(files,path,check)',{files,path,check,Buffer:undefined,atob:undefined,btoa:undefined,crypto:undefined,TextEncoder:undefined,TextDecoder:undefined,process:undefined,require:undefined},{codeGeneration:{strings:false,wasm:false},timeout:10000});

for(const size of [0,1,55,56,63,64,65,49151,49152,49153,3*49152+7])test('complete SHA-256 in the SDK VM for '+size+' bytes',async()=>{
 const bytes=Buffer.alloc(size);for(let i=0;i<size;i++)bytes[i]=(i*131+17)%256;
 const f=fixture(bytes),result=await execute(f.files);
 assert.deepEqual(JSON.parse(JSON.stringify(result)),{size,sha256:createHash('sha256').update(bytes).digest('hex')});
 assert.equal(f.statCount,2);
 const reads=f.calls.filter(row=>row[0]==='readRange').map(row=>row[1]);
 assert(reads.every(row=>row.length>0&&row.length<=49152));assert.equal(reads.reduce((n,row)=>n+row.length,0),size);
});
test('initial missing remains null and does not read',async()=>{
 let reads=0;assert.equal(await execute({stat:async()=>null,readRange:async()=>{reads++;}}),null);assert.equal(reads,0);
});
for(const change of [{isDirectory:true},{size:NaN},{size:-1},{mtimeMs:NaN},{ino:undefined}])test('rejects unusable initial identity '+JSON.stringify(change),async()=>{
 const f=fixture(Buffer.from('a')),stat=f.files.stat;f.files.stat=async p=>({...await stat(p),...change});
 await assert.rejects(execute(f.files),/identity|size/);assert.equal(f.calls.filter(row=>row[0]==='readRange').length,0);
});
for(const reply of [{bytesRead:0,base64:''},{bytesRead:1,base64:'YQ'},{bytesRead:1,base64:'YQ==\n'},{bytesRead:1,base64:'YR=='},{bytesRead:1,base64:'YQ=Z'},{bytesRead:2,base64:'YQ=='},null])test('rejects incomplete or noncanonical Base64 '+JSON.stringify(reply),async()=>{
 const f=fixture(Buffer.from('a'));f.files.readRange=async()=>reply;await assert.rejects(execute(f.files),/chunk|binary/);
});
for(const change of [{size:4},{mtimeMs:124},{ino:43},{isDirectory:true},null])test('rejects changed final observation '+JSON.stringify(change),async()=>{
 const f=fixture(Buffer.from('abc')),stat=f.files.stat;f.files.stat=async p=>{const value=await stat(p);return f.statCount===1?value:change===null?null:{...value,...change};};
 await assert.rejects(execute(f.files),/changed/);
});
test('checks lifetime before and after every awaited SDK read',async()=>{
 const f=fixture(Buffer.alloc(49153));let expired=false,checks=0,reads=0;const read=f.files.readRange;
 f.files.readRange=async request=>{reads++;const reply=await read(request);expired=true;return reply;};
 await assert.rejects(execute(f.files,'/original',()=>{checks++;if(expired)throw Error('expired');}),/expired/);
 assert.equal(reads,1);assert(checks>=4);assert.equal(f.statCount,1);
});
test('streams a synthetic original without allocating or returning the complete file',async()=>{
 const size=4*1024*1024+17,hash=createHash('sha256');let largest=0,count=0;
 const files={stat:async()=>({size,mtimeMs:0,ino:1,isDirectory:false}),readRange:async({offset,length})=>{assert.equal(offset,count);largest=Math.max(largest,length);const bytes=Buffer.alloc(length,offset%251);count+=length;hash.update(bytes);return {bytesRead:length,base64:bytes.toString('base64')};}};
 const row=await execute(files);assert.equal(row.sha256,hash.digest('hex'));assert.equal(row.size,size);assert.equal(count,size);assert.equal(largest,49152);
});
test('serialized copies retain the complete dependency license and need no host imports',()=>{
 const source=fingerprintTemplateFile.toString(),license=fs.readFileSync(new URL('../shared/file-observation.LICENSE',import.meta.url),'utf8').trim();
 assert(source.includes(license));assert.doesNotMatch(source,/\brequire\s*\(|\bimport\s|\bglobalThis\b|(?<![.\w])process\s*[.\[]|\beval\s*\(|new Function|@ts-(?:ignore|nocheck)/);
});
test('the pure JS copy passes the SDK TypeScript shape check without suppressing SDK diagnostics',{skip:!process.env.SELECTS_DEV_REPO},()=>{
 const ts=createRequire(process.env.SELECTS_DEV_REPO+'/package.json')('typescript');
 const prefix='declare const selects: { files: {stat(path:string):Promise<{size:number;mtimeMs:number;ino:number;isDirectory:boolean}|null>;readRange(input:{path:string;offset:number;length:number}):Promise<{base64:string;bytesRead:number}>} };\n';
 const check=extra=>{
  const source=prefix+'async function request(){return await ('+fingerprintTemplateFile.toString()+')(selects.files,"/original");}\n'+extra,file='/fingerprint.ts';
  const options={noEmit:true,strict:false,noImplicitAny:false,skipLibCheck:true,target:ts.ScriptTarget.ES2022,lib:['lib.es2022.d.ts'],types:[]};
  const host=ts.createCompilerHost(options),get=host.getSourceFile;host.getSourceFile=(name,...args)=>name===file?ts.createSourceFile(file,source,options.target,true):get(name,...args);
  return ts.getPreEmitDiagnostics(ts.createProgram([file],options,host));
 };
 const valid=check('');assert.equal(valid.length,0,valid.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join('\n'));
 const invalid=check('selects.files.readRange({path:"/a",offset:0,length:"wrong"});');assert(invalid.some(d=>d.code===2322),'SDK argument errors must remain visible');
});
