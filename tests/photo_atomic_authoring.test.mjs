import assert from 'node:assert/strict';
import test from 'node:test';
import {checkScriptTypes} from './run_script_types.mjs';
import {fixture} from './photo_authoring_fixture.mjs';
import fs from 'node:fs';
import {loadPanelFunctions} from './windows_host.mjs';

const ids=['no14-still-video','camera-shutter-dump'];

for(const id of ids){
 test(id+': saved-state verification carries only the receipt, not original paths or recipes',async()=>{
  const f=fixture(id);await f.create();
  const writes=f.calls.filter(c=>c.summary.startsWith('Create complete'));
  assert.equal(writes.length,1);
  assert.equal(writes[0].script.split('/photos/0.png').length-1,1,'an original path belongs to the source list only');
  const verification=f.calls.find(c=>c.summary==='Verify complete saved Image Draft');
  assert.ok(verification);assert.ok(!verification.script.includes('/photos/'),'readback needs IDs and intervals, not paths');
  assert.ok(!verification.script.includes('recipe'),'readback must not serialize a template recipe');
 });
 test(id+': one complete working copy is saved once',async()=>{
  const f=fixture(id),result=await f.create();assert.equal(result.status,'saved');assert.equal(f.saved.size,1);
  assert.equal(f.commits.length,1,'seed, placement and styling belong to one commit');
  assert.equal(result.draftId,f.commits[0].draftId);
 });
 test(id+': a failed effect leaves no partially saved Draft',async()=>{
  const f=fixture(id,{failEffect:true});await assert.rejects(f.create(),/effect compiler|save|author/i);
  assert.equal(f.commits.length,0);assert.equal(f.saved.size,0);
 });
 test(id+': replacing the run during its durable pre-dispatch callback prevents the save',async()=>{
  const f=fixture(id);await assert.rejects(f.create({onSeed:async()=>{await Promise.resolve();f.stop();}}),/changed|ended|stopped/i);
  assert.equal(f.commits.length,0);assert.equal(f.saved.size,0);
 });
 test(id+': the acknowledged Draft callback receives the complete saved images',async()=>{
  const f=fixture(id);await f.create();assert.equal(f.receipts.length,1);
  assert.equal(f.receipts[0].images,id==='no14-still-video'?8:12);
 });
 test(id+': persisted readback cannot be replaced by the pre-commit working copy',async()=>{
  const f=fixture(id,{tamperSaved:true});await assert.rejects(f.create(),/saved|readback|confirm|grid/i);
  assert.equal(f.commits.length,1,'a readback error must never replay the save');assert.equal(f.saved.size,1);
 });
 test(id+': a new-Draft receipt needs no existing-Draft commit ID',async()=>{
  const f=fixture(id,{newReceiptOnly:true});assert.equal((await f.create()).status,'saved');assert.equal(f.commits.length,1);
 });
 for(const fps of [25,24000/1001,60])test(id+': reference timing survives one commit at '+fps+' fps',async()=>{
  const f=fixture(id,{fps}),result=await f.create();assert.equal(result.fps,fps);assert.equal(f.saved.get(result.draftId).durationFrames,result.durationFrames);assert.equal(f.commits.length,1);
 });
 test(id+': a late acknowledgment is retained after the observer stops, without another write',async()=>{
  const f=fixture(id);f.hooks.afterScript=input=>{if(input.allowCommit&&input.summary.startsWith('Create complete'))f.stop();};
  const result=await f.create();assert.equal(result.status,'saved');assert.equal(f.receipts[0].draftId,result.draftId);
  assert.equal(f.commits.length,1);assert.equal(f.calls.filter(c=>c.allowCommit).length,1);
 });
 test(id+': legacy empty seeds can finish without creating another Draft',async()=>{
  const f=fixture(id),durationFrames=id==='no14-still-video'?266:300;
  f.saved.set('legacy',{name:'Legacy',fps:30,durationFrames,frameSize:{width:720,height:1280},clips:[]});
  assert.equal((await f.create({partialDraftId:'legacy'})).draftId,'legacy');assert.equal(f.saved.size,1);assert.equal(f.commits.length,1);
 });
 test(id+': resuming a legacy seed keeps its frame rate when the Project default changed',async()=>{
  const f=fixture(id,{fps:60}),durationFrames=id==='no14-still-video'?Math.round(266*25/30):250;
  f.saved.set('legacy',{name:'Legacy 25fps',fps:25,durationFrames,frameSize:{width:720,height:1280},clips:[]});
  const result=await f.create({partialDraftId:'legacy'});
  assert.equal(result.draftId,'legacy');assert.equal(result.fps,25);assert.equal(result.durationFrames,durationFrames);
  assert.equal(f.saved.size,1);assert.equal(f.commits.length,1);
 });
 test(id+': a legacy Draft with a manual graphic is preserved without any save',async()=>{
  const f=fixture(id),durationFrames=id==='no14-still-video'?266:300;
  const state={name:'Manual',fps:30,durationFrames,frameSize:{width:720,height:1280},clips:[{clipId:99,trackId:'manual',trackKind:'video',resourceId:null,startFrame:0,endFrame:30}]};
  f.saved.set('legacy',structuredClone(state));await assert.rejects(f.create({partialDraftId:'legacy'}),/not empty|inspect/i);
  assert.deepEqual(f.saved.get('legacy'),state);assert.equal(f.commits.length,0);
 });
}
test('Camera stops before importing sounds when original verification outlives the run',async()=>{
 const f=fixture('camera-shutter-dump');f.hooks.afterScript=input=>{if(input.summary==='Verify original Project Images')f.stop();};
 await assert.rejects(f.create(),/changed|ended|stopped/i);assert.equal(f.imports,0);assert.equal(f.commits.length,0);
});
test('No.14 default music is prepared before the single complete Draft save',async()=>{
 const f=fixture('no14-still-video'),result=await f.create({music:'on'});
 assert.equal(result.status,'saved');assert.equal(f.imports,1);assert.equal(f.commits.length,1);
 const main=f.saved.get(result.draftId).clips.filter(c=>c.trackKind==='main');assert.equal(main.length,1);assert.equal(main[0].resourceId,'music');
});
test('complete single-commit scripts typecheck against the installed public SDK',async()=>{
 const scripts=[];
 for(const id of ids){const f=fixture(id);await f.create();for(const input of f.calls)scripts.push({name:id+' '+input.summary,script:input.script});}
 assert.ok(checkScriptTypes(scripts).scripts>=6);
});
for(const id of ids)test(id+': a proven pre-commit failure is not reported as an unknown creation',async()=>{
 const f=fixture(id,{failEffect:true}),error=await f.create().catch(error=>error);
 const source=fs.readFileSync(new URL('../plugins/'+id+'/panel.tsx',import.meta.url),'utf8');
 const api=loadPanelFunctions(source,['templateSeedMessage','templateUncertain','templateReport']);
 assert.match(api.templateSeedMessage(error,'Fixture'),/No Draft was created/);
});
test('Camera rechecks run ownership after preparing sounds and before importing them',async()=>{
 let live=true,imports=0;
 const source=fs.readFileSync(new URL('../plugins/camera-shutter-dump/panel.tsx',import.meta.url),'utf8');
 const api=loadPanelFunctions(source,['ensureSounds'],{unpackSounds:async()=>({sound:{path:'/sound.wav'}}),inventory:async()=>{live=false;return [];}});
 const sdk={runScript:async()=>{imports++;throw Error('unexpected import');}};
 await assert.rejects(api.ensureSounds(sdk,'p',()=>live),/ended|changed|stopped/i);assert.equal(imports,0);
});
