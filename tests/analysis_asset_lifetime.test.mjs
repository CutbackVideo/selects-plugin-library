import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import test from 'node:test';
import {holdFixture,hash} from './gallery_hold_fixture.mjs';
function options(f,more={}){return {directory:path.join(f.data,'analysis'),key:'b'.repeat(64),sourcePath:f.source,source:{sha256:hash(f.source),bytes:fs.statSync(f.source).size},extension:'json',cleanupRequired:true,hashFile:async p=>hash(p),produce:async(_source,out)=>f.local.files.writeFile(out,'{"score":0.8}'),verify:async p=>assert.deepEqual(JSON.parse(fs.readFileSync(p)),{score:.8}),...more};}
test('analysis asset: a JSON result is source-bound and reused without another production',async t=>{
 const f=await holdFixture(t);let calls=0;const o=options(f,{produce:async(_source,out)=>{calls++;await f.local.files.writeFile(out,'{"score":0.8}');}});const a=await f.derive(o),b=await f.derive(o);assert.equal(a.reused,false);assert.equal(b.reused,true);assert.equal(a.path,b.path);assert.equal(calls,1);
});
test('analysis asset: unconfirmed cleanup cannot be concealed as reusable analysis success',async t=>{
 const f=await holdFixture(t),remove=f.files.remove;f.files.remove=async(p,o)=>{if(path.basename(p).startsWith('.source-'))throw Error('controlled cleanup failure');return remove(p,o);};
 await assert.rejects(f.derive(options(f)),e=>e.terminal===true&&/cleanup/i.test(e.publicMessage));
});
