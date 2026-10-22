import assert from 'node:assert/strict';
import test from 'node:test';
import {fixture} from './photo_authoring_fixture.mjs';
import {checkScriptTypes} from './run_script_types.mjs';
import {assetFixture} from './bundled_asset_fixture.mjs';

const id='polaroid-photo-dump';
test('Polaroid saves the complete 17 photos, frame, caption and music once',async()=>{
 const f=fixture(id),result=await f.create();assert.equal(result.status,'saved');
 assert.equal(f.commits.length,1);assert.equal(f.saved.size,1);assert.equal(result.clips.length,18);
 const state=f.saved.get(result.draftId);assert.equal(state.clips.filter(c=>c.trackKind==='video'&&c.resourceId).length,18);
 assert.equal(state.clips.filter(c=>c._graphic).length,1);assert.equal(state.clips.filter(c=>c.trackKind==='audio').length,1);
});
test('Polaroid effect failure never persists an empty seed or partial photo placement',async()=>{
 const f=fixture(id,{failEffect:true});await assert.rejects(f.create(),/effect compiler|save|author/i);
 assert.equal(f.commits.length,0);assert.equal(f.saved.size,0);
});
test('Polaroid awaits the pre-dispatch callback and rechecks the run before any save',async()=>{
 const f=fixture(id);await assert.rejects(f.create({onSeed:async()=>{await Promise.resolve();f.stop();}}),/changed|ended|stopped/i);
 assert.equal(f.commits.length,0);assert.equal(f.saved.size,0);
});
test('Polaroid acknowledges a complete save to observers, including the frame',async()=>{
 const f=fixture(id);await f.create();assert.equal(f.receipts.length,1);assert.equal(f.receipts[0].images,18);
});
test('Polaroid persisted verification detects changed saved state without replay',async()=>{
 const f=fixture(id,{tamperSaved:true});await assert.rejects(f.create(),/saved|readback|confirm|grid/i);
 assert.equal(f.commits.length,1);assert.equal(f.saved.size,1);
});
test('Polaroid accepts the new-Draft createdDraftId response without a commitId',async()=>{
 const f=fixture(id,{newReceiptOnly:true});assert.equal((await f.create()).status,'saved');assert.equal(f.commits.length,1);
});
for(const fps of [10,25,24000/1001,60,120])test('Polaroid preserves the reference frame conversion at '+fps+' fps',async()=>{
 const f=fixture(id,{fps}),r=await f.create();assert.equal(r.fps,fps);assert.equal(r.durationFrames,Math.round(835*fps/60));assert.equal(f.commits.length,1);
 assert.deepEqual(f.saved.get(r.draftId).frameSize,{width:1080,height:1920});
});
test('Polaroid preserves repeated photo selections with independent focus and grade',async()=>{
 const f=fixture(id),selected=f.photos.map((p,i)=>i===2?f.photos[0]:p),framing=selected.map((p,i)=>({x:i/16,y:1-i/16}));
 const before=JSON.stringify(selected),r=await f.create({selected,framing,grade:1.4,caption:'My photos'}),images=f.saved.get(r.draftId).clips.filter(c=>c.resourceId&&c.trackKind==='video');
 assert.deepEqual(images.slice(0,17).map(c=>c.resourceId),selected.map(p=>p.resourceId));assert.equal(new Set(images.map(c=>c.clipId)).size,18);
 for(let i=0;i<17;i++){const p=images[i]._effects[0].parameters;assert.equal(p.focusX,framing[i].x);assert.equal(p.focusY,framing[i].y);assert.equal(p.grade,1.4);}
 assert.equal(JSON.stringify(selected),before);assert.equal(r.graphics[0].parameters.text,'My photos');
});
test('Polaroid retains the acknowledged complete result after the observer detaches',async()=>{
 const f=fixture(id);f.hooks.afterScript=input=>{if(input.summary.startsWith('Create complete'))f.stop();};
 const result=await f.create();assert.equal(result.status,'saved');assert.equal(f.receipts[0].draftId,result.draftId);assert.equal(f.commits.length,1);
});
test('Polaroid can complete a legacy empty seed in one save at its own frame rate',async()=>{
 const f=fixture(id,{fps:60});f.saved.set('legacy',{fps:25,durationFrames:348,frameSize:{width:1080,height:1920},clips:[]});
 const r=await f.create({partialDraftId:'legacy'});assert.equal(r.draftId,'legacy');assert.equal(r.fps,25);assert.equal(f.saved.size,1);assert.equal(f.commits.length,1);
});
test('Polaroid refuses a legacy seed containing a manual graphic before saving',async()=>{
 const f=fixture(id),state={fps:30,durationFrames:418,frameSize:{width:1080,height:1920},clips:[{clipId:99,trackId:'manual',trackKind:'video',resourceId:null,startFrame:0,endFrame:10}]};
 f.saved.set('legacy',structuredClone(state));await assert.rejects(f.create({partialDraftId:'legacy'}),/empty|inspect/i);assert.deepEqual(f.saved.get('legacy'),state);assert.equal(f.commits.length,0);
});
test('Polaroid unknown commit result never triggers a second save',async()=>{
 const f=fixture(id,{commitReplyLost:true});await assert.rejects(f.create(),/lost|unknown|confirm/i);assert.equal(f.commits.length,1);assert.equal(f.saved.size,1);
});
test('Polaroid independent persisted readback carries bounded receipts without original paths',async()=>{
 const f=fixture(id);await f.create();const r=f.calls.find(c=>c.summary==='Verify complete saved Image Draft');assert.ok(r);assert.ok(!r.script.includes('/photos/'));assert.ok(r.script.length<48*1024);
});
test('Polaroid complete scripts typecheck against available SDK declarations',async()=>{
 const f=fixture(id);await f.create();assert.ok(checkScriptTypes(f.calls).scripts>=3);assert.ok(checkScriptTypes(f.calls,{sdkTypes:false}).scripts>=3);
});
for(const capability of ['graphicsReadSupported','transformReadSupported','audioReadSupported','programReadSupported'])test('Polaroid missing '+capability+' stops before the sole save',async()=>{
 const f=fixture(id,{[capability]:false});await assert.rejects(f.create(),/update|verify|confirm/i);assert.equal(f.commits.length,0);assert.equal(f.saved.size,0);
});
test('Polaroid verifies music using existing saved-Draft reads without clipSourceWindow',async()=>{
 const f=fixture(id,{sourceReadSupported:false});delete f.sdk.maxScriptTimeoutSeconds;delete f.selects.files.fingerprint;
 const result=await f.create();assert.equal(result.status,'saved');assert.equal(f.commits.length,1);assert.equal(f.saved.size,1);
 assert.equal(f.saved.get(result.draftId).clips.filter(clip=>clip.trackKind==='audio').length,1);
});
for(const fault of ['transform','program','caption','sound'])test('Polaroid ignored '+fault+' mutation cannot become a completed save',async()=>{
 const f=fixture(id),project=f.selects.project('p'),original=project.createDraft;
 project.createDraft=async options=>{const d=await original(options);
  if(fault==='transform')d.setClipTransform=async()=>{};
  if(fault==='program')d.addVideoEffect=async()=>{};
  if(fault==='caption'){const add=d.addMotionGraphic;d.addMotionGraphic=async args=>add({...args,parameters:{...args.parameters,text:'Lost caption'}});}
  if(fault==='sound'){const read=d.clipAudio;d.clipAudio=async c=>({...await read(c),volumeDb:-9});}
  return d;
 };
 await assert.rejects(f.create(),/confirm|graphic|program|transform|Audio/i);assert.equal(f.commits.length,0);assert.equal(f.saved.size,0);
});
test('Polaroid a stale dispatch callback cannot start authoring',async()=>{
 const f=fixture(id);await assert.rejects(f.create({onDispatch:async()=>{await Promise.resolve();f.stop();}}),/changed|ended|stopped/i);assert.equal(f.commits.length,0);
});
for(const minify of [false,true])test('Polaroid whole compiled panel prepares real bundled bytes and authors once (minify='+minify+')',async()=>{
 const f=fixture(id),assets=assetFixture({minify});assets.api.__bind(f.sdk,{files:assets.files,environment:{platform:'darwin'}});
 const r=await f.invoke(assets.api.createPhotoDraft);assert.equal(r.status,'saved');assert.equal(f.commits.length,1);assert.equal(f.imports,2);assert.equal(assets.writes.length,2);
 assert.equal(r.clips.length,18);assert.equal(r.programs.sources.length,3);assert.equal(r.audio.length,1);assert.equal(r.transforms.length,19);
 const calls=f.calls.filter(c=>c.allowCommit);assert.equal(calls.length,3,'two reusable imports and one Draft authoring request');
});
