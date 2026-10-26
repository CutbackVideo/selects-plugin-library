import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {holdFixture,hash,jsonFiles} from './gallery_hold_fixture.mjs';

const stage=(_f,file)=>/^(?:\.source-|\.output-)/.test(path.basename(file));
const stages=f=>fs.existsSync(f.data)?fs.readdirSync(f.data,{recursive:true}).filter(file=>stage(f,file)):[];
const encodes=f=>f.calls.filter(call=>call.args.includes('-vf')).length;

for(const minify of [false,true])for(const role of ['source','output']){
 test('Gallery staging: observe a lost '+role+' reservation acknowledgement without replay (minify='+minify+')',async t=>{
  const f=await holdFixture(t,{minify});let lost=0;
  f.hooks.afterWrite=input=>{if(path.basename(input.path).startsWith('.'+role+'-')&&!lost++){throw Error('mutation completed, acknowledgement lost');}};
  const result=await f.run();assert.equal(result.status,'converted');assert.equal(encodes(f),1);assert.equal(lost>0,true);
  assert.equal(f.writes.filter(file=>stage(f,file)).length,2,'each exclusive reservation is attempted once');
  assert.equal(stages(f).length,0);assert.equal(jsonFiles(f.data).length,1);
 });
}

for(const role of ['source','output'])test('Gallery staging: cancellation after a lost '+role+' reservation reply removes only its confirmed file',async t=>{
 const f=await holdFixture(t);let ended=false;
 f.hooks.afterWrite=input=>{if(path.basename(input.path).startsWith('.'+role+'-')&&!ended){ended=true;f.stop();throw Error('reply lost on close');}};
 await assert.rejects(f.run());assert.equal(ended,true);assert.equal(encodes(f),0);assert.equal(stages(f).length,0);
});

for(const role of ['source','output'])test('Gallery staging: observe a lost '+role+' marker-consumption reply without replay',async t=>{
 const f=await holdFixture(t);let lost=0;const clears=[];
 f.hooks.afterCompareAndReplace=input=>{clears.push(input.path);if(path.basename(input.path).startsWith('.'+role+'-')&&!lost++){throw Error('clear acknowledged late');}};
 assert.equal((await f.run()).status,'converted');assert.equal(encodes(f),1);assert.equal(lost,1);
 assert.equal(clears.length,2);assert.equal(new Set(clears).size,2);assert.equal(stages(f).length,0);
});

for(const phase of ['before','after'])test('Gallery staging: foreign replacement '+phase+' consuming the marker is retained',async t=>{
 const f=await holdFixture(t);let changed;
 f.hooks[phase==='before'?'beforeCompareAndReplace':'afterCompareAndReplace']=input=>{
  if(!changed){changed=input.path;fs.writeFileSync(changed,'foreign during clear');if(phase==='after')throw Error('reply lost');}
 };
 await assert.rejects(f.run(),error=>error.publicMessage?.includes('reservation'));
 assert.equal(fs.readFileSync(changed,'utf8'),'foreign during clear');assert.equal(encodes(f),0);
});

test('Gallery staging: an unsettled marker clear is never raced by cleanup or another clear',async t=>{
 const f=await holdFixture(t),clear=f.local.files.compareAndReplace;let release,pending,staging,calls=0;
 const gate=new Promise(resolve=>{release=resolve;});
 f.local.files.compareAndReplace=async(file,expected,text)=>{
  calls++;staging=file;pending=(async()=>{await gate;return clear(file,expected,text);})();throw Error('observation ended before the mutation');
 };
 await assert.rejects(f.run(),error=>error.code==='hold-failed'&&error.publicMessage?.includes('reservation'));
 assert.equal(calls,1);assert.equal(encodes(f),0);assert.equal(fs.existsSync(staging),true);
 release();assert.equal(await pending,true,'the delayed operation still finds its intact marker');
 assert.equal(fs.statSync(staging).size,0);assert.equal(fs.existsSync(staging),true);
});

test('Gallery staging: an oversized foreign file is refused without reading its body',async t=>{
 const f=await holdFixture(t);let occupied;
 f.hooks.beforeWrite=input=>{if(stage(f,input.path)&&!occupied){occupied=input.path;fs.writeFileSync(occupied,Buffer.alloc(8192,65));}};
 await assert.rejects(f.run(),error=>error.publicMessage?.includes('reservation'));
 assert.equal(f.reads.filter(row=>row.path===occupied).length,0);assert.equal(fs.statSync(occupied).size,8192);assert.equal(encodes(f),0);
});

test('Gallery staging: growth between stat and read remains bounded and unclaimed',async t=>{
 const f=await holdFixture(t);let changed;
 f.hooks.beforeRead=file=>{if(stage(f,file)&&!changed){changed=file;fs.appendFileSync(file,Buffer.alloc(8192,65));}};
 await assert.rejects(f.run(),error=>error.publicMessage?.includes('reservation'));
 assert.ok(f.reads.filter(row=>row.path===changed).every(row=>row.length<=1024));
 assert.ok(fs.statSync(changed).size>8192);assert.equal(encodes(f),0);
});

test('Gallery staging: an incomplete reservation is retained as unknown, never replayed',async t=>{
 const f=await holdFixture(t);let changed;
 f.hooks.afterWrite=input=>{if(stage(f,input.path)&&!changed){changed=input.path;fs.truncateSync(changed,Math.max(1,fs.statSync(changed).size-1));throw Error('partial write with lost reply');}};
 await assert.rejects(f.run(),error=>error.publicMessage?.includes('reservation'));
 assert.equal(f.writes.filter(file=>stage(f,file)).length,1);assert.equal(fs.existsSync(changed),true);assert.equal(encodes(f),0);
});

test('Gallery staging: an acknowledged no-op clear does not become prepared media',async t=>{
 const f=await holdFixture(t);let attempted;
 f.local.files.compareAndReplace=async file=>{attempted=file;return true;};
 await assert.rejects(f.run(),error=>error.publicMessage?.includes('reservation'));
 assert.equal(fs.existsSync(attempted),true);assert.equal(encodes(f),0);
});

for(const bytes of ['', 'foreign contents'])test('Gallery staging: an existing '+(bytes?'nonempty':'empty')+' path is never adopted or deleted',async t=>{
 const f=await holdFixture(t);let occupied;
 f.hooks.beforeWrite=input=>{if(stage(f,input.path)&&!occupied){occupied=input.path;fs.writeFileSync(occupied,bytes);}};
 await assert.rejects(f.run());assert.equal(fs.readFileSync(occupied,'utf8'),bytes);assert.equal(encodes(f),0);
});

test('Gallery staging: an acknowledged file replaced before observation is not overwritten or removed',async t=>{
 const f=await holdFixture(t);let replaced;
 f.hooks.afterWrite=input=>{if(stage(f,input.path)&&!replaced){replaced=input.path;fs.writeFileSync(replaced,'foreign replacement');}};
 await assert.rejects(f.run());assert.equal(fs.readFileSync(replaced,'utf8'),'foreign replacement');assert.equal(encodes(f),0);
});

test('Shared staging: existing producers still receive an empty reserved output',async t=>{
 const f=await holdFixture(t),source={sha256:hash(f.source),bytes:fs.statSync(f.source).size};let produced=0;
 const result=await f.derive({directory:path.join(f.data,'append-control'),key:'a'.repeat(64),sourcePath:f.source,source,
  hashFile:async file=>hash(file),verify:async file=>assert.equal(hash(file),source.sha256),
  produce:async(snapshot,target)=>{produced++;assert.equal(fs.statSync(target).size,0);fs.appendFileSync(target,fs.readFileSync(snapshot));}});
 assert.equal(produced,1);assert.equal(hash(result.path),source.sha256);assert.equal(stages(f).length,0);
});
