import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {miniMusicFixture} from './mini_music_fixture.mjs';
import {checkScriptTypes} from './run_script_types.mjs';
for(const entry of ['panel','template']){
 test('Mini owned cue: '+entry+' imports a verified owned copy instead of the installation',async t=>{
  const f=await miniMusicFixture(t,{entry}),result=await f.run();assert.ok(result?.music?.resourceId,'the real caller reaches its assembly boundary');
  assert.deepEqual(f.imports,[f.ownedPath()]);assert.deepEqual(fs.readFileSync(f.imports[0]),f.bytes);
 });
 test('Mini owned cue: '+entry+' keeps earlier Draft music after the installation disappears',async t=>{
  const f=await miniMusicFixture(t,{entry});await f.run();assert.equal(f.imports.length,1);fs.unlinkSync(f.file);
  assert.equal(fs.existsSync(f.imports[0]),true);assert.deepEqual(fs.readFileSync(f.imports[0]),f.bytes);
 });
 test('Mini owned cue: '+entry+' rejects installed bytes that disagree with the planning manifest',async t=>{
  const f=await miniMusicFixture(t,{entry});fs.writeFileSync(f.file,Buffer.from('different cue data'));await f.run().catch(error=>f.errors.push(error));
  assert.equal(f.imports.length,0);assert.equal(f.saved.length,0);assert.ok(f.errors.length);
 });
 test('Mini owned cue: '+entry+' reuses the same owned Audio without a second import',async t=>{
  const f=await miniMusicFixture(t,{entry});await f.run();await f.run();assert.deepEqual(f.imports,[f.ownedPath()]);assert.equal(f.saved.length,2);
 });
 test('Mini owned cue: '+entry+' a new cue generation cannot overwrite earlier referenced bytes',async t=>{
  const f=await miniMusicFixture(t,{entry});await f.run();const first=f.imports[0],updated=Buffer.from('updated selected cue');fs.writeFileSync(f.file,updated);f.cue.bytes=updated.length;f.cue.sha256=f.digest(updated);
  await f.run();assert.equal(f.imports.length,2);assert.notEqual(f.imports[1],first);assert.deepEqual(fs.readFileSync(first),f.bytes);assert.deepEqual(fs.readFileSync(f.imports[1]),updated);
 });
 test('Mini owned cue: '+entry+' observes a completed import whose reply was lost without replay',async t=>{
  const f=await miniMusicFixture(t,{entry});f.hooks.lost=true;const result=await f.run();assert.ok(result?.music?.resourceId);assert.deepEqual(f.imports,[f.ownedPath()]);
 });
 for(const invalid of [{file:'../cue.mp3'},{bytes:0},{bytes:32*1024*1024+1},{sha256:'bad'},{duration:0}])test('Mini owned cue: '+entry+' refuses invalid manifest before publication '+JSON.stringify(invalid),async t=>{
  const f=await miniMusicFixture(t,{entry});Object.assign(f.cue,invalid);await f.run().catch(error=>f.errors.push(error));assert.equal(f.saved.length,0);assert.equal(f.imports.length,0);assert.equal(f.writes.length,0);assert.ok(f.errors.length);
 });
 test('Mini owned cue: '+entry+' a detached run stops after owned-file publication before import',async t=>{
  const f=await miniMusicFixture(t,{entry});f.hooks.afterWrite=()=>f.stop();await f.run().catch(error=>f.errors.push(error));assert.equal(f.saved.length,0);assert.equal(f.imports.length,0);assert.ok(f.writes.length,'the detachment hook actually ran during publication');
 });
 test('Mini owned cue: '+entry+' repairs a changed data copy from the pinned installed bytes',async t=>{
  const f=await miniMusicFixture(t,{entry});await f.run();fs.writeFileSync(f.imports[0],Buffer.from('bad'));await f.run();assert.equal(f.imports.length,1);assert.deepEqual(fs.readFileSync(f.imports[0]),f.bytes);assert.equal(f.saved.length,2);
 });
 test('Mini owned cue: '+entry+' an Audio shorter than the planned section cannot reach assembly',async t=>{
  const f=await miniMusicFixture(t,{entry});f.hooks.duration=1;await f.run().catch(error=>f.errors.push(error));assert.equal(f.imports.length,1);assert.equal(f.saved.length,0);assert.ok(f.errors.some(error=>error?.code==='BUNDLED_ASSET_METADATA'));
 });
}
test('Mini own music control: the selected user path and exact-path reuse are retained',async t=>{
 const f=await miniMusicFixture(t,{entry:'panel',own:true});const a=await f.run(),b=await f.run();assert.ok(a?.music?.resourceId);assert.equal(a.music.resourceId,b.music.resourceId);assert.deepEqual(f.imports,[f.file]);
});
test('Mini silence control: no music means no asset publication or Audio import',async t=>{
 const f=await miniMusicFixture(t,{entry:'panel',silent:true}),result=await f.run();assert.equal(result.music,null);assert.equal(f.imports.length,0);assert.equal(f.writes.length,0);
});
test('Mini owned cue: emitted Audio lookup and import scripts pass the actual SDK declarations',async t=>{
 const f=await miniMusicFixture(t);await f.run();const scripts=f.scripts.filter(c=>/bundled music/.test(c.summary));assert.equal(scripts.length,3);assert.ok(checkScriptTypes(scripts.map(c=>({name:c.summary,script:c.script}))).scripts>0);
});
