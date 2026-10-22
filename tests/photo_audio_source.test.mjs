import assert from 'node:assert/strict';
import test from 'node:test';
import {fixture} from './photo_authoring_fixture.mjs';
import {templateFixture} from './photo_template_run_fixture.mjs';
const ids=['no14-still-video','camera-shutter-dump','four-photo-stop-motion','polaroid-photo-dump'];
const options=id=>id==='no14-still-video'?{music:'on'}:{};
const sound=state=>state.clips.find(c=>c.trackKind==='audio'||c.trackKind==='main'&&c.resourceId);
const mutate=(row,kind)=>{
 if(kind==='source start'){row._source.startSeconds+=1;row._source.endSeconds+=1;}
 if(kind==='source end')row._source.endSeconds-=.01;
 if(kind==='small source drift'){row._source.startSeconds+=1/705600000;row._source.endSeconds+=1/705600000;}
 if(kind==='speed'){row.playbackSpeed={numerator:2,denominator:1};row._source.endSeconds=row._source.startSeconds+2*(row._source.endSeconds-row._source.startSeconds);}
 if(kind==='pitch')row.preserveAudioPitch=false;
 if(kind==='missing source')delete row._source;
 if(kind==='wrong source identity')row.clipId+=100;
};
for(const id of ids){
 test(id+': source intent is retained independently of Draft placement',async()=>{
  const f=fixture(id),r=await f.create(options(id));
  for(const a of r.audio){
   const start=id==='no14-still-video'?26.2:0;
   assert.deepEqual(JSON.parse(JSON.stringify(a.source)),{startSeconds:start,endSeconds:start+(a.endFrame-a.startFrame)/r.fps,playbackSpeed:{numerator:1,denominator:1},preserveAudioPitch:true});
  }
 });
 for(const kind of ['source start','source end','small source drift','speed','pitch','missing source','wrong source identity'])test(id+': persisted '+kind+' mismatch is not a verified save',async()=>{
  const f=fixture(id);f.hooks.afterScript=input=>{if(input.summary.startsWith('Create complete'))mutate(sound([...f.saved.values()][0]),kind);};
  await assert.rejects(f.create(options(id)),e=>e.code==='IMAGE_SAVE_UNVERIFIED');assert.equal(f.commits.length,1);
 });
 test(id+': existing saved read methods verify sound without a source-window SDK method',async()=>{
  const f=fixture(id,{sourceReadSupported:false});assert.equal((await f.create(options(id))).status,'saved');assert.equal(f.commits.length,1);
 });
 test(id+': an unrelated non-callable source capability is never used',async()=>{
  const f=fixture(id),p=f.selects.project('p'),create=p.createDraft;
  p.createDraft=async input=>({...await create(input),clipSourceWindow:{}});
  assert.equal((await f.create(options(id))).status,'saved');assert.equal(f.commits.length,1);
 });
 test(id+': an ignored source offset is detected after the sole commit',async()=>{
  const f=fixture(id),p=f.selects.project('p'),create=p.createDraft;
  p.createDraft=async input=>{const d=await create(input),commit=d.commitAll;d.commitAll=async reason=>{const result=await commit(reason);const row=sound(f.saved.get(result.createdDraftId));row._source.startSeconds+=1;row._source.endSeconds+=1;return result;};return d;};
  await assert.rejects(f.create(options(id)),e=>e.code==='IMAGE_SAVE_UNVERIFIED');assert.equal(f.commits.length,1);
 });
 test(id+': private source-read diagnostics do not enter the public failure',async()=>{
  const f=fixture(id),call=f.sdk.call;
  f.sdk.call=async(method,...args)=>{if(method==='getDraftMediaSnapshot')throw Error('/private/internal/music-key');return call(method,...args);};
  await assert.rejects(f.create(options(id)),e=>!e.message.includes('/private/')&&/source|sound|audio/i.test(e.message));assert.equal(f.commits.length,1);
 });
 test(id+': changed source timing survives a fresh minified panel and is never overwritten',async()=>{
  const f=templateFixture(id,{minify:true});await f.mount();await f.until(()=>f.finishes.length===1);const draftId=f.finishes[0].sequenceId;
  mutate(sound(f.saved.get(draftId)),'source start');const before=structuredClone(f.saved.get(draftId));
  await f.mount();await f.until(()=>f.finishes.length===2);assert.ok(f.finishes[1].error);assert.equal(f.commits.length,1);assert.deepEqual(f.saved.get(draftId),before);
 });
 test(id+': old source evidence needs inspection without another dispatch',async()=>{
  const f=templateFixture(id);await f.mount();await f.until(()=>f.finishes.length===1);
  const path=[...f.files.keys()].find(p=>p.includes('/template-runs/')),row=JSON.parse(f.files.get(path));delete row.result.audio[0].source;
  f.files.set(path,Buffer.from(JSON.stringify(row)));const before=Buffer.from(f.files.get(path)),requests=f.requests.length;
  await f.mount();await f.until(()=>f.finishes.length===2);assert.ok(f.finishes[1].error);assert.equal(f.requests.length,requests);assert.equal(f.commits.length,1);assert.deepEqual(f.files.get(path),before);
 });
 for(const kind of ['reversed window','invalid rate','invalid pitch'])test(id+': corrupt '+kind+' source evidence is preserved before dispatch',async()=>{
  const f=templateFixture(id);await f.mount();await f.until(()=>f.finishes.length===1);
  const path=[...f.files.keys()].find(p=>p.includes('/template-runs/')),row=JSON.parse(f.files.get(path));
  assert.ok(row.result.audio[0].source);const source=row.result.audio[0].source;
  if(kind==='reversed window')source.endSeconds=source.startSeconds;
  if(kind==='invalid rate')source.playbackSpeed.denominator=0;
  if(kind==='invalid pitch')source.preserveAudioPitch='true';
  f.files.set(path,Buffer.from(JSON.stringify(row)));const before=Buffer.from(f.files.get(path)),requests=f.requests.length;
  await f.mount();await f.until(()=>f.finishes.length===2);assert.ok(f.finishes[1].error);assert.equal(f.requests.length,requests);assert.equal(f.commits.length,1);assert.deepEqual(f.files.get(path),before);
 });
}
test('Music Off does not require source timing on an older host',async()=>{
 const f=fixture('no14-still-video',{sourceReadSupported:false}),r=await f.create();assert.deepEqual(Array.from(r.audio),[]);assert.equal(f.commits.length,1);
});
for(const fps of [25,24000/1001,30000/1001,60])test('Music retains its source instant after 120fps-to-'+fps+'fps conformance',async()=>{
 const f=fixture('no14-still-video',{fps}),r=await f.create({music:'on'});assert.equal(r.fps,fps);assert.equal(r.audio[0].source?.startSeconds,26.2);assert.equal(r.audio[0].source.endSeconds,26.2+r.durationFrames/fps);assert.equal(f.commits.length,1);
});
