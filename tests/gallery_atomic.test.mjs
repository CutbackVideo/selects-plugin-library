import assert from 'node:assert/strict';
import test from 'node:test';
import {galleryFixture} from './gallery_authoring_fixture.mjs';
import {checkScriptTypes} from './run_script_types.mjs';

for(const minify of [false,true])test('Gallery saves all 21 mixed tiles and music once (minify='+minify+')',async()=>{
 const f=galleryFixture({minify}),r=await f.create();assert.equal(r.verified,true);assert.equal(f.commits.length,1);assert.equal(f.saved.size,1);
 const saved=f.saved.get(r.draftId);assert.equal(saved.clips.filter(c=>c.trackKind==='video'&&c.resourceId).length,21);assert.equal(saved.clips.filter(c=>c.trackKind==='audio').length,1);
 assert.equal(f.observed.length,1);assert.equal(f.observed[0].visuals,21,'observers never receive an empty seed');
});
test('Gallery effect failure cannot persist a seed or partially placed tiles',async()=>{
 const f=galleryFixture({failEffect:true});await assert.rejects(f.create());assert.equal(f.commits.length,0);assert.equal(f.saved.size,0);
});
test('Gallery does not report a completed tile count after failed authoring',async()=>{
 const f=galleryFixture({failEffect:true}),run=f.sdk.runScript;let reported;
 f.sdk.runScript=async input=>{const r=await run(input);if(input.summary==='Create complete Photo Gallery Draft')reported=r.result;return r;};
 await assert.rejects(f.create());assert.equal(reported.status,'notSaved');assert.equal(reported.tileCount,undefined);assert.equal(f.commits.length,0);
});
for(const mix of ['image','video'])test('Gallery '+mix+'-only repeated inputs retain independent tiles in one save',async()=>{
 const f=galleryFixture({mix,music:false}),r=await f.create();assert.equal(r.verified,true);assert.equal(f.commits.length,1);
 assert.deepEqual(f.saved.get(r.draftId).clips.filter(c=>c.trackKind==='video').map(c=>c.resourceId),f.input.media.map(m=>m.resourceId));
});
for(const limit of [undefined,30])test('Gallery completes one save without the added deadline capability ('+limit+')',async()=>{
 const f=galleryFixture();if(limit===undefined)delete f.sdk.maxScriptTimeoutSeconds;else f.sdk.maxScriptTimeoutSeconds=limit;
 const result=await f.create();assert.equal(result.verified,true);assert.equal(f.commits.length,1);assert.equal(f.saved.size,1);
});
test('Gallery awaits dispatch and rechecks liveness before authoring',async()=>{
 const f=galleryFixture();await assert.rejects(f.create({onDispatched:async()=>{await Promise.resolve();f.stop();}}),/changed|ended|stopped/i);assert.equal(f.commits.length,0);
});
test('Gallery persisted tampering is rejected without another save',async()=>{
 const f=galleryFixture(),run=f.sdk.runScript;let tampered=false;
 f.sdk.runScript=async args=>{const r=await run(args);if(args.allowCommit&&!r.isError&&f.saved.size&&!tampered){for(const s of f.saved.values())s.frameSize.width=123;tampered=true;}return r;};
 await assert.rejects(f.create(),/saved|readback|confirm|grid|canvas/i);assert.equal(f.commits.length,1);assert.equal(f.saved.size,1);
});
test('Gallery unknown commit result is not replayed',async()=>{
 const f=galleryFixture({commitReplyLost:true});await assert.rejects(f.create(),/unknown|lost|confirm|save/i);assert.equal(f.commits.length,1);assert.equal(f.saved.size,1);
});
for(const limit of ['120',Infinity,NaN,{}])test('Gallery does not depend on an unknown host deadline field '+String(limit),async()=>{
 const f=galleryFixture();f.sdk.maxScriptTimeoutSeconds=limit;const result=await f.create();assert.equal(result.verified,true);assert.equal(f.commits.length,1);assert.equal(f.saved.size,1);
});
for(const fps of [25,30,60,24000/1001,120])test('Gallery authors one complete Draft on its Project grid '+fps,async()=>{
 const f=galleryFixture({fps}),r=await f.create();assert.equal(r.verified,true);assert.equal(f.commits.length,1);
 assert.equal(f.saved.get(r.draftId).durationFrames,Math.round(853*fps/60));assert.deepEqual(f.saved.get(r.draftId).frameSize,{width:1080,height:1920});
});
for(const capability of ['graphicsReadSupported','transformReadSupported','audioReadSupported','programReadSupported'])test('Gallery missing '+capability+' stops before persistence',async()=>{
 const f=galleryFixture({[capability]:false});await assert.rejects(f.create(),/update|verify|confirm/i);assert.equal(f.commits.length,0);assert.equal(f.saved.size,0);
});
test('Gallery music source verification uses existing saved-Draft reads without clipSourceWindow',async()=>{
 const f=galleryFixture({sourceReadSupported:false});delete f.sdk.maxScriptTimeoutSeconds;delete f.selects.files.fingerprint;
 f.input.music.startFrame=60;const result=await f.create();assert.equal(result.verified,true);assert.equal(f.commits.length,1);assert.equal(f.saved.size,1);
 const sound=f.saved.get(result.draftId).clips.find(clip=>clip.trackKind==='audio');assert.equal(sound._source.startSeconds,1);
});
test('Gallery Music Off does not need an unused Audio source-window reader',async()=>{
 const f=galleryFixture({music:false,sourceReadSupported:false}),r=await f.create();assert.equal(r.verified,true);assert.equal(f.commits.length,1);
});
for(const fault of ['transform','program','audio','enabled'])test('Gallery ignored '+fault+' mutation cannot become a saved complete result',async()=>{
 const f=galleryFixture(),project=f.selects.project('p'),original=project.createDraft;
 project.createDraft=async options=>{const d=await original(options);
  if(fault==='transform')d.setClipTransform=async()=>{};
  if(fault==='program')d.addVideoEffect=async()=>{};
  if(fault==='audio'){const read=d.clipAudio;d.clipAudio=async c=>({...await read(c),volumeDb:-9});}
  if(fault==='enabled'){const read=d.videoEffects;d.videoEffects=async c=>(await read(c)).map(e=>({...e,enabled:false}));}
  return d;
 };
 await assert.rejects(f.create(),/confirm|program|transform|Audio/i);assert.equal(f.commits.length,0);assert.equal(f.saved.size,0);
});
test('Gallery retains acknowledged saved identity when the observer detaches',async()=>{
 const f=galleryFixture();f.hooks.afterScript=request=>{if(request.summary==='Create complete Photo Gallery Draft')f.stop();};
 const r=await f.create();assert.equal(r.verified,true);assert.equal(f.commits.length,1);assert.equal(f.observed[0].draftId,r.draftId);
});
test('Gallery rechecks originals after preflight before any Draft persistence',async()=>{
 const f=galleryFixture();f.hooks.afterScript=request=>{if(request.summary==='Check Photo Gallery media and timing')f.selects.files.stat=async()=>null;};
 await assert.rejects(f.create(),/missing/i);assert.equal(f.commits.length,0);
});
test('Gallery preserves explicit music source start and records bounded independent readback',async()=>{
 const f=galleryFixture();f.input.music.startFrame=60;const r=await f.create();
 const sound=f.saved.get(r.draftId).clips.find(c=>c.trackKind==='audio');assert.equal(sound._source.startSeconds,1);
 const read=f.calls.find(c=>c.summary==='Verify complete saved Image Draft');assert.ok(read);assert.ok(!read.script.includes('/photos/'));assert.ok(read.script.length<48*1024);
 assert.ok(f.calls.every(c=>Buffer.byteLength(c.script)<256*1024));assert.equal(f.calls.find(c=>c.summary==='Create complete Photo Gallery Draft').timeoutSeconds,120);
});
test('Gallery complete and saved-readback scripts typecheck with and without SDK declarations',async()=>{
 const f=galleryFixture();await f.create();assert.ok(checkScriptTypes(f.calls).scripts>=4);assert.ok(checkScriptTypes(f.calls,{sdkTypes:false}).scripts>=4);
});
