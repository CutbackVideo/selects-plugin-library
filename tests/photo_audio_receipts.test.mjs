import assert from 'node:assert/strict';
import test from 'node:test';
import {fixture} from './photo_authoring_fixture.mjs';
import {templateFixture} from './photo_template_run_fixture.mjs';
const options=id=>id==='no14-still-video'?{music:'on'}:{};
const sound=state=>state.clips.find(c=>c.trackKind==='audio'||c.trackKind==='main'&&c.resourceId);
for(const id of ['no14-still-video','camera-shutter-dump','four-photo-stop-motion']){
 test(id+': the saved receipt contains verified Audio identities and settings',async()=>{
  const f=fixture(id),result=await f.create(options(id));
  assert.equal(result.audio?.length,id==='camera-shutter-dump'?12:1);
  for(const row of result.audio){assert.equal(row.settings.volumeDb,0);assert.equal(row.audioSourceIndexes,null);assert.equal(row.settings.fadeInSeconds,0);}
 });
 for(const kind of ['volume','fade','keys','route','resource','missing','interval','resource type'])test(id+': wrong persisted '+kind+' sound data cannot be verified',async()=>{
  const f=fixture(id);f.hooks.afterScript=input=>{if(!input.summary.startsWith('Create complete'))return;
   const state=[...f.saved.values()][0],row=sound(state);row._audio??={};
   if(kind==='volume')row._audio.volumeDb=-60;
   if(kind==='fade')row._audio.fadeOutSeconds=1;
   if(kind==='keys'){row._audio.volumeDb=null;row._audio.volumeKeys=[{atSeconds:0,volumeDb:-60}];}
   if(kind==='route')row.audioSourceIndexes=[];
   if(kind==='resource')row.resourceId='a5';
   if(kind==='missing')state.clips.splice(state.clips.indexOf(row),1);
   if(kind==='interval')row.endFrame--;
   if(kind==='resource type')f.resources.find(r=>r.resourceId===row.resourceId).type='Image';
  };
  await assert.rejects(f.create(options(id)),error=>error.code==='IMAGE_SAVE_UNVERIFIED'&&typeof error.draftId==='string');assert.equal(f.commits.length,1);
 });
 test(id+': a silently muted working copy is refused before commit',async()=>{
  const f=fixture(id),p=f.selects.project('p'),create=p.createDraft;
  p.createDraft=async opts=>{const d=await create(opts),read=d.clipAudio;d.clipAudio=async clip=>({...await read(clip),volumeDb:-60});return d;};
  await assert.rejects(f.create(options(id)),/audio|sound|volume/i);assert.equal(f.commits.length,0);
 });
 test(id+': unavailable Audio readback stops before committing a sound-bearing Draft',async()=>{
  const f=fixture(id,{audioReadSupported:false});await assert.rejects(f.create(options(id)),/audio|sound|Selects/i);assert.equal(f.commits.length,0);
 });
 test(id+': a later manual sound edit survives a fresh minified panel mount',async()=>{
  const f=templateFixture(id,{minify:true});await f.mount();await f.until(()=>f.finishes.length===1);const draftId=f.finishes[0].sequenceId;assert.ok(draftId);
  const path=[...f.files.keys()].find(p=>p.includes('/template-runs/'));assert.ok(JSON.parse(f.files.get(path)).result.audio.length>0);
  sound(f.saved.get(draftId))._audio={volumeDb:-12};await f.mount();await f.until(()=>f.finishes.length===2);
  assert.ok(f.finishes[1].error);assert.equal(f.commits.length,1);assert.equal(sound(f.saved.get(draftId))._audio.volumeDb,-12);
 });
 test(id+': old sound evidence is never reconstructed by another save',async()=>{
  const f=templateFixture(id);await f.mount();await f.until(()=>f.finishes.length===1);
  const path=[...f.files.keys()].find(p=>p.includes('/template-runs/')),row=JSON.parse(f.files.get(path));delete row.result.audio;f.files.set(path,Buffer.from(JSON.stringify(row)));const before=Buffer.from(f.files.get(path));
  await f.mount();await f.until(()=>f.finishes.length===2);assert.ok(f.finishes[1].error);assert.equal(f.commits.length,1);assert.deepEqual(f.files.get(path),before);
 });
 for(const corruption of ['duplicate identity','invalid route','invalid volume'])test(id+': '+corruption+' in an Audio journal is preserved and refused before dispatch',async()=>{
  const f=templateFixture(id);await f.mount();await f.until(()=>f.finishes.length===1);
  const path=[...f.files.keys()].find(p=>p.includes('/template-runs/')),row=JSON.parse(f.files.get(path)),a=row.result.audio[0];
  if(corruption==='duplicate identity')row.result.audio.push(a);
  if(corruption==='invalid route')a.audioSourceIndexes=[-1];
  if(corruption==='invalid volume')a.settings.volumeDb=100;
  f.files.set(path,Buffer.from(JSON.stringify(row)));const before=Buffer.from(f.files.get(path)),requests=f.requests.length;
  await f.mount();await f.until(()=>f.finishes.length===2);assert.ok(f.finishes[1].error);assert.equal(f.commits.length,1);assert.equal(f.requests.length,requests);assert.deepEqual(f.files.get(path),before);
 });
}
test('No.14 Music Off verifies silence without requiring an unused Audio read API',async()=>{
 const f=fixture('no14-still-video',{audioReadSupported:false}),result=await f.create();assert.equal(result.audio?.length,0);assert.equal(f.commits.length,1);
});
test('No.14 Music Off cannot silently retain an unexpected sound clip',async()=>{
 const f=fixture('no14-still-video');f.hooks.afterScript=input=>{if(input.summary.startsWith('Create complete'))[...f.saved.values()][0].clips.push({clipId:999,trackId:'unexpected-sound',trackKind:'audio',resourceId:'a0',startFrame:0,endFrame:30,audioSourceIndexes:null});};
 await assert.rejects(f.create(),error=>error.code==='IMAGE_SAVE_UNVERIFIED');assert.equal(f.commits.length,1);
});
test('Camera refuses swapped shutter Resources even when every start and count still matches',async()=>{
 const f=fixture('camera-shutter-dump');f.hooks.afterScript=input=>{if(input.summary.startsWith('Create complete')){const rows=[...f.saved.values()][0].clips.filter(c=>c.trackKind==='audio');[rows[0].resourceId,rows[1].resourceId]=[rows[1].resourceId,rows[0].resourceId];}};
 await assert.rejects(f.create(),error=>error.code==='IMAGE_SAVE_UNVERIFIED');assert.equal(f.commits.length,1);
});
for(const fps of [25,24000/1001,60])test('No.14 full music interval is verified at '+fps+' fps',async()=>{
 const f=fixture('no14-still-video',{fps}),result=await f.create({music:'on'});assert.equal(result.audio.length,1);assert.equal(result.audio[0].endFrame,result.durationFrames);assert.equal(f.commits.length,1);
});
