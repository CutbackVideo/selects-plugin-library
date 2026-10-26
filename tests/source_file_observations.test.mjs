import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import * as input from '../shared/native-image-input.mjs';
const fixture=()=>{const calls=[],contents=new Map([['/a',Buffer.from('alpha')],['/b',Buffer.from('beta')]]);const files={stat:async path=>{calls.push(path);const bytes=contents.get(path);return bytes?{size:bytes.length,mtimeMs:1,ino:2,isDirectory:false}:null;},readRange:async({path,offset,length})=>{const bytes=contents.get(path).subarray(offset,offset+length);return {bytesRead:bytes.length,base64:bytes.toString('base64')};}};return {files,calls,contents};};
test('source observations preserve distinct-path order and reuse repeated inputs',async()=>{
 const f=fixture(),rows=await input.observeSourceFiles(f.files,['/b','/a','/b']);assert.deepEqual(rows.map(r=>r.path),['/b','/a']);assert.deepEqual(f.calls,['/b','/b','/a','/a']);
 assert.equal(rows[0].sha256,createHash('sha256').update(f.contents.get('/b')).digest('hex'));
 assert.deepEqual(await input.observeSourceFiles(f.files,['/b','/a'],rows),rows);
});
test('source observations reject same-length content replacement',async()=>{
 const f=fixture(),before=await input.observeSourceFiles(f.files,['/a']);f.contents.set('/a',Buffer.from('omega'));
 await assert.rejects(input.observeSourceFiles(f.files,['/a'],before),e=>e.code==='source-file-changed');
});
test('source observations distinguish a missing source',async()=>{
 const f=fixture();await assert.rejects(input.observeSourceFiles(f.files,['/missing']),e=>e.code==='source-file-missing');
});
test('source observations keep private fingerprint diagnostics out of public messages',async()=>{
 const files={stat:async()=>{throw Error('private /user/secret');},readRange:async()=>{throw Error('unreachable');}};await assert.rejects(input.observeSourceFiles(files,['/a']),e=>e.code==='source-file-unknown'&&!e.publicMessage.includes('private')&&e.cause.message.includes('private'));
});
test('source observations ask unsupported SDKs to update before reading',async()=>{
 await assert.rejects(input.observeSourceFiles({},['/a']),e=>e.code==='source-file-unsupported'&&/Update Selects/.test(e.publicMessage));
});
for(const row of [{size:0,mtimeMs:1,ino:2,isDirectory:false},{size:1},{size:NaN,mtimeMs:1,ino:2,isDirectory:false}])test('source observations reject invalid media identity '+JSON.stringify(row),async()=>{
 await assert.rejects(input.observeSourceFiles({stat:async()=>row,readRange:async()=>({bytesRead:0,base64:''})},['/a']),e=>/source-file-/.test(e.code));
});
test('source observations refuse an inconsistent expected set before file I/O',async()=>{
 const f=fixture();await assert.rejects(input.observeSourceFiles(f.files,['/a'],[{path:'/b',size:1,sha256:'0'.repeat(64)}]),e=>e.code==='source-file-input');assert.equal(f.calls.length,0);
});
test('unused source observation does not require a file capability',async()=>{
 assert.deepEqual(await input.observeSourceFiles({},[]),[]);
});
