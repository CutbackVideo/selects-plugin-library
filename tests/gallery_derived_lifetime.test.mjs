import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {holdFixture, hash, jsonFiles} from './gallery_hold_fixture.mjs';

function onCleanup(fixture, end) {
 const remove=fixture.files.remove;
 fixture.files.remove=async(file,options)=>{
  const result=await remove(file,options);
  if(path.basename(file).startsWith('.source-'))end();
  return result;
 };
}

for(const minify of [false,true]){
 test('Gallery derived lifetime: detachment during cleanup cannot report conversion success (minify='+minify+')',async t=>{
  const f=await holdFixture(t,{minify});onCleanup(f,()=>f.stop());
  await assert.rejects(f.run(),error=>/ended|stopped/i.test(error.publicMessage??error.message));
  assert.equal(f.calls.filter(c=>c.args.includes('-vf')).length,1);
  const indexes=jsonFiles(f.data);assert.equal(indexes.length,1,'a complete published object is retained');
  const before=fs.readFileSync(indexes[0],'utf8');
  const next=await f.run({isCurrent:()=>true});
  assert.equal(next.videos[0].cacheHit,true,'a distinct live request can reuse the complete object');
  assert.equal(fs.readFileSync(indexes[0],'utf8'),before);
 });

 test('Gallery derived lifetime: explicit abort during cleanup cannot report conversion success (minify='+minify+')',async t=>{
  const f=await holdFixture(t,{minify}),controller=new AbortController();onCleanup(f,()=>controller.abort());
  await assert.rejects(f.run({signal:controller.signal,isCurrent:()=>true}),error=>/ended|stopped/i.test(error.publicMessage??error.message));
  assert.equal(jsonFiles(f.data).length,1);
  assert.equal(fs.readdirSync(path.join(f.data,'held-v3')).some(p=>p.startsWith('.source-')||p.startsWith('.output-')),false);
 });

 test('Gallery derived lifetime: abort in final source-stat observation cannot publish a completion (minify='+minify+')',async t=>{
  const f=await holdFixture(t,{minify}),controller=new AbortController(),stat=f.files.stat;
  let indexed=false,sourceReads=0;
  f.hooks.afterRename=(_from,to)=>{if(to.endsWith('.json'))indexed=true;};
  f.files.stat=async file=>{
   const result=await stat(file);
   if(indexed&&file===f.source&&++sourceReads===2)controller.abort();
   return result;
  };
  await assert.rejects(f.run({signal:controller.signal,isCurrent:()=>true}),error=>/ended|stopped/i.test(error.publicMessage??error.message));
  assert.equal(sourceReads,2);assert.equal(jsonFiles(f.data).length,1);
 });
}

test('Gallery derived lifetime: cached readback cannot finish after its final source observation aborts',async t=>{
 const f=await holdFixture(t);await f.run();const before=f.calls.filter(c=>c.args.includes('-vf')).length;
 const controller=new AbortController(),stat=f.files.stat;let sourceReads=0;
 f.files.stat=async file=>{const result=await stat(file);if(file===f.source&&++sourceReads===4)controller.abort();return result;};
 await assert.rejects(f.run({signal:controller.signal,isCurrent:()=>true}),error=>/ended|stopped/i.test(error.publicMessage??error.message));
 assert.equal(sourceReads,4);assert.equal(f.calls.filter(c=>c.args.includes('-vf')).length,before);
});

test('Gallery derived lifetime: a stable live request remains reusable',async t=>{
 const f=await holdFixture(t),first=await f.run(),second=await f.run();
 assert.equal(first.status,'converted');assert.equal(second.videos[0].cacheHit,true);
 assert.equal(first.videos[0].outputPath,second.videos[0].outputPath);
});

function derivedOptions(f,overrides={}){
 return {directory:path.join(f.data,'derived'),key:'a'.repeat(64),sourcePath:f.source,
  source:{sha256:hash(f.source),bytes:fs.statSync(f.source).size},
  hashFile:async file=>hash(file),produce:(from,to)=>f.local.files.copyFile(from,to),
  verify:async file=>assert.equal(hash(file),hash(f.source)),...overrides};
}

test('Shared derived owner: an already aborted signal stops before filesystem mutations',async t=>{
 const f=await holdFixture(t),controller=new AbortController();controller.abort();
 await assert.rejects(f.derive(derivedOptions(f,{signal:controller.signal})),error=>error.code==='BUNDLED_ASSET_STOPPED');
 assert.equal(f.writes.length,0);assert.equal(f.renames.length,0);
});

test('Shared derived owner: invalid cancellation inputs fail before filesystem mutations',async t=>{
 const f=await holdFixture(t);
 await assert.rejects(f.derive(derivedOptions(f,{signal:{}})),error=>error.code==='BUNDLED_ASSET_INPUT');
 assert.equal(f.writes.length,0);assert.equal(f.renames.length,0);
});

test('Shared derived owner: cancellation after snapshot copy prevents production and cleans its private paths',async t=>{
 const f=await holdFixture(t),controller=new AbortController();let produced=0;
 f.hooks.afterCopy=()=>controller.abort();
 await assert.rejects(f.derive(derivedOptions(f,{signal:controller.signal,produce:()=>{produced++;}})),error=>error.code==='BUNDLED_ASSET_STOPPED');
 assert.equal(produced,0);assert.equal(jsonFiles(f.data).length,0);
 assert.equal(fs.readdirSync(path.join(f.data,'derived')).length,0);
});

test('Shared derived owner: cleanup does not replace a production failure with a late scope error',async t=>{
 const f=await holdFixture(t);let live=true;onCleanup(f,()=>{live=false;});
 await assert.rejects(f.derive(derivedOptions(f,{isCurrent:()=>live,produce:()=>{throw Error('private disk error');}})),error=>{
  assert.equal(error.code,'BUNDLED_ASSET_DERIVED');assert.ok(!error.publicMessage.includes('private disk error'));return true;
 });
 assert.equal(jsonFiles(f.data).length,0);
});
