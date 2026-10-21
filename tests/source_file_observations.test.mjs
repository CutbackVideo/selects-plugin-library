import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import * as input from '../shared/native-image-input.mjs';
const fixture=()=>{const calls=[],contents=new Map([['/a',Buffer.from('alpha')],['/b',Buffer.from('beta')]]);const files={fingerprint:async path=>{calls.push(path);const bytes=contents.get(path);return bytes?{size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}:null;}};return {files,calls,contents};};
test('source observations preserve distinct-path order and reuse repeated inputs',async()=>{
 const f=fixture(),rows=await input.observeSourceFiles(f.files,['/b','/a','/b']);assert.deepEqual(rows.map(r=>r.path),['/b','/a']);assert.deepEqual(f.calls,['/b','/a']);
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
 const files={fingerprint:async()=>{throw Error('private /user/secret');}};await assert.rejects(input.observeSourceFiles(files,['/a']),e=>e.code==='source-file-unknown'&&!e.publicMessage.includes('private')&&e.cause.message.includes('private'));
});
test('source observations ask unsupported SDKs to update before reading',async()=>{
 await assert.rejects(input.observeSourceFiles({},['/a']),e=>e.code==='source-file-unsupported'&&/Update Selects/.test(e.publicMessage));
});
for(const row of [{size:0,sha256:'0'.repeat(64)},{size:1,sha256:'short'},{size:NaN,sha256:'0'.repeat(64)}])test('source observations reject invalid media identity '+JSON.stringify(row),async()=>{
 await assert.rejects(input.observeSourceFiles({fingerprint:async()=>row},['/a']),e=>/source-file-/.test(e.code));
});
test('source observations refuse an inconsistent expected set before file I/O',async()=>{
 const f=fixture();await assert.rejects(input.observeSourceFiles(f.files,['/a'],[{path:'/b',size:1,sha256:'0'.repeat(64)}]),e=>e.code==='source-file-input');assert.equal(f.calls.length,0);
});
test('unused source observation does not require a file capability',async()=>{
 assert.deepEqual(await input.observeSourceFiles({},[]),[]);
});
