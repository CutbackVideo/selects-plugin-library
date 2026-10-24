import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {archiveMusicFixture} from './archive_music_fixture.mjs';
import {checkScriptTypes} from './run_script_types.mjs';
for(const entry of ['panel','template']){
 test('Archive owned cue control: '+entry+' reaches the actual music/assembly boundary',async t=>{
  const f=await archiveMusicFixture(t,{entry});assert.ok((await f.run())?.music?.resourceId);assert.equal(f.imports.length,1);
 });
 test('Archive owned cue: '+entry+' imports pinned data outside the installation',async t=>{
  const f=await archiveMusicFixture(t,{entry});assert.ok((await f.run())?.music?.resourceId);assert.deepEqual(f.imports,[f.ownedPath()]);assert.deepEqual(fs.readFileSync(f.imports[0]),f.bytes);
 });
 test('Archive owned cue: '+entry+' keeps Draft music after the installation disappears',async t=>{
  const f=await archiveMusicFixture(t,{entry});await f.run();assert.equal(f.imports.length,1);fs.unlinkSync(f.file);assert.equal(fs.existsSync(f.imports[0]),true);assert.deepEqual(fs.readFileSync(f.imports[0]),f.bytes);
 });
 test('Archive owned cue: '+entry+' refuses bytes that disagree with the planning manifest',async t=>{
  const f=await archiveMusicFixture(t,{entry});fs.writeFileSync(f.file,Buffer.from('changed cue'));await f.run().catch(error=>f.errors.push(error));assert.equal(f.imports.length,0);assert.equal(f.saved.length,0);assert.ok(f.errors.length);
 });
 test('Archive owned cue: '+entry+' reuses one owned Audio without reimport',async t=>{
  const f=await archiveMusicFixture(t,{entry});await f.run();await f.run();assert.deepEqual(f.imports,[f.ownedPath()]);assert.equal(f.saved.length,2);
 });
 test('Archive owned cue: '+entry+' a new cue generation preserves earlier referenced bytes',async t=>{
  const f=await archiveMusicFixture(t,{entry});await f.run();const first=f.imports[0],updated=Buffer.from('updated selected cue');fs.writeFileSync(f.file,updated);f.cue.bytes=updated.length;f.cue.sha256=f.digest(updated);await f.run();assert.equal(f.imports.length,2);assert.notEqual(f.imports[1],first);assert.deepEqual(fs.readFileSync(first),f.bytes);assert.deepEqual(fs.readFileSync(f.imports[1]),updated);
 });
 test('Archive owned cue: '+entry+' observes a completed import with lost reply once',async t=>{
  const f=await archiveMusicFixture(t,{entry});f.hooks.lost=true;assert.ok((await f.run())?.music?.resourceId);assert.deepEqual(f.imports,[f.ownedPath()]);
 });
 for(const invalid of [{file:'../cue.mp3'},{bytes:0},{bytes:32*1024*1024+1},{sha256:'bad'},{duration:0}])test('Archive owned cue: '+entry+' refuses invalid manifest before publication '+JSON.stringify(invalid),async t=>{
  const f=await archiveMusicFixture(t,{entry});Object.assign(f.cue,invalid);await f.run().catch(error=>f.errors.push(error));assert.equal(f.saved.length,0);assert.equal(f.imports.length,0);assert.equal(f.writes.length,0);assert.ok(f.errors.length);
 });
 test('Archive owned cue: '+entry+' detachment during publication cannot import',async t=>{
  const f=await archiveMusicFixture(t,{entry});f.hooks.afterWrite=()=>f.stop();await f.run().catch(error=>f.errors.push(error));assert.equal(f.saved.length,0);assert.equal(f.imports.length,0);assert.ok(f.writes.length);
 });
 test('Archive owned cue: '+entry+' an Audio shorter than the planned section cannot reach assembly',async t=>{
  const f=await archiveMusicFixture(t,{entry});f.hooks.duration=1;await f.run().catch(error=>f.errors.push(error));assert.equal(f.imports.length,1);assert.equal(f.saved.length,0);assert.ok(f.errors.some(error=>error?.code==='BUNDLED_ASSET_METADATA'));
 });
}
test('Archive own music control: selected user path and exact-path reuse are retained',async t=>{
 const f=await archiveMusicFixture(t,{entry:'panel',own:true});assert.ok((await f.run())?.music?.resourceId);await f.run();assert.deepEqual(f.imports,[f.file]);
});
test('Archive silence control: no asset publication or Audio import',async t=>{
 const f=await archiveMusicFixture(t,{entry:'panel',silent:true});assert.equal((await f.run()).music,null);assert.equal(f.imports.length,0);assert.equal(f.writes.length,0);
});
test('Archive owned cue: emitted lookup/import scripts pass the actual SDK declarations',async t=>{
 const f=await archiveMusicFixture(t);await f.run();const scripts=f.scripts.filter(call=>/bundled music/.test(call.summary));assert.equal(scripts.length,3);assert.equal(checkScriptTypes(scripts.map(call=>({name:call.summary,script:call.script}))).scripts,3);
});
