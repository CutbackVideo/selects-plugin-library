import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import {fixture} from './photo_authoring_fixture.mjs';
import {templateFixture} from './photo_template_run_fixture.mjs';
import {galleryFixture} from './gallery_authoring_fixture.mjs';
import {checkScriptTypes} from './run_script_types.mjs';

function authoring(){
 const source=fs.readFileSync(new URL('../shared/native-image-authoring.js',import.meta.url),'utf8');
 return vm.runInNewContext(source+'\n({inspectImageAudio,verifyAtomicImageDraft})');
}
function audio(){
 const row={clipId:3,trackId:'audio-track',trackKind:'audio',resourceId:'sound',startFrame:0,endFrame:30,audioSourceIndexes:null,playbackSpeed:{numerator:1,denominator:1},preserveAudioPitch:true};
 const wanted={...row,settings:{},source:{startSeconds:26.2,endSeconds:27.2}};
 const draft={clips:async()=>[row],clipAudio:async()=>({clipId:3,volumeDb:0,volumeKeys:[],fadeInSeconds:0,fadeOutSeconds:0})};
 return {row,wanted,draft,project:{resources:async()=>[{resourceId:'sound',type:'Audio'}]}};
}
test('precommit keeps independent source intent without a source-window SDK capability',async()=>{
 const {draft,wanted,project}=audio(),receipts=await authoring().inspectImageAudio(draft,[wanted],project);
 assert.equal(receipts.length,1);assert.equal(receipts[0].source.startSeconds,26.2);
 assert.equal(receipts[0].source.endSeconds,27.2);
});
for(const change of ['speed','pitch'])test('precommit still refuses a changed '+change,async()=>{
 const {draft,wanted,project,row}=audio();
 if(change==='speed')row.playbackSpeed={numerator:2,denominator:1};else row.preserveAudioPitch=false;
 await assert.rejects(authoring().inspectImageAudio(draft,[wanted],project),/playback policy/);
});
const ids=['no14-still-video','camera-shutter-dump','four-photo-stop-motion','polaroid-photo-dump','photo-gallery-no2'];
const options=id=>id==='no14-still-video'?{music:'on'}:{};
const projectFixture=id=>id==='photo-gallery-no2'?galleryFixture({canonicalAuthoring:true,sourceReadSupported:false}):fixture(id,{canonicalAuthoring:true,sourceReadSupported:false});
for(const id of ids){
 test(id+' canonical authoring saves and verifies with no source-window SDK method',async()=>{
  const f=projectFixture(id),run=f.sdk.runScript;
  f.sdk.runScript=async input=>{assert.ok(Object.keys(input).every(key=>['summary','script','allowCommit','timeoutSeconds'].includes(key)),'An older host rejects new execution options.');return run(input);};
  const r=await f.create(options(id));
  assert.equal(r.status,'saved');assert.equal(f.commits.length,1);assert.ok(r.audio.length);
  assert.ok(f.calls.every(input=>!input.script.includes('clipSourceWindow')));
 });
 test(id+' saved observation retains persistent resource identities without confusing SDK aliases',async()=>{
  const f=projectFixture(id);
  f.hooks.afterSourceSnapshot=actual=>{for(const row of actual.clips)row.resourceId='persistent-'+row.resourceId;};
  assert.equal((await f.create(options(id))).status,'saved');assert.equal(f.commits.length,1);
 });
 test(id+' a single changed source Tick is not accepted as a verified save',async()=>{
  const f=projectFixture(id);
  f.hooks.afterScript=input=>{if(input.summary.startsWith('Create complete')){const state=[...f.saved.values()][0],row=state.clips.find(row=>row.trackKind==='audio'||row.trackKind==='main'&&row.resourceId);row._source.startSeconds+=1/705600000;row._source.endSeconds+=1/705600000;}};
  await assert.rejects(f.create(options(id)),error=>error.code==='IMAGE_SAVE_UNVERIFIED');assert.equal(f.commits.length,1);
 });
 test(id+' canonical authoring detects an ignored offset only after the single save',async()=>{
  const f=projectFixture(id),project=f.selects.project('p'),create=project.createDraft;
  project.createDraft=async input=>{const d=await create(input),commit=d.commitAll;d.commitAll=async reason=>{const result=await commit(reason);for(const state of f.saved.values())for(const row of state.clips.filter(row=>row.trackKind==='audio'||row.trackKind==='main'&&row.resourceId)){row._source.startSeconds+=1;row._source.endSeconds+=1;}return result;};return d;};
  await assert.rejects(f.create(options(id)),error=>error.code==='IMAGE_SAVE_UNVERIFIED');assert.equal(f.commits.length,1);
 });
 test(id+' canonical authoring rejects a Draft changed between saved observations',async()=>{
  const f=projectFixture(id);let reads=0;
  f.hooks.afterSourceSnapshot=()=>{if(++reads===1){const state=[...f.saved.values()][0];state.name='Changed during inspection';}};
  await assert.rejects(f.create(options(id)),error=>error.code==='IMAGE_SAVE_UNVERIFIED');assert.equal(f.commits.length,1);
 });
 test(id+' canonical minified recovery rereads actual sources without another save',async()=>{
  const f=templateFixture(id,{canonicalAuthoring:true,minify:true,sourceReadSupported:false});
  const context=id==='photo-gallery-no2'?{template:{...f.context.template,options:{music:'bundled'}}}:{};
  await f.mount(context);await f.until(()=>f.finishes.length===1);assert.ok(f.finishes[0].sequenceId,JSON.stringify(f.finishes));
  const state=f.saved.get(f.finishes[0].sequenceId),row=state.clips.find(row=>row.trackKind==='audio'||row.trackKind==='main'&&row.resourceId);
  assert.ok(row);row._source.startSeconds+=1;row._source.endSeconds+=1;
  const original=structuredClone(state);
  await f.mount(context);await f.until(()=>f.finishes.length===2);assert.ok(f.finishes[1].error);
  assert.equal(f.commits.length,1);assert.deepEqual(f.saved.get(f.finishes[0].sequenceId),original);
 });
}
test('canonical photo requests retain the existing script shape and SDK type checks',async()=>{
 const scripts=[];
 for(const id of ids.filter(id=>id!=='photo-gallery-no2')){
  const f=projectFixture(id);await f.create(options(id));
  scripts.push(...f.calls.map(input=>({name:id+' '+input.summary,script:input.script})));
 }
 const checked=checkScriptTypes(scripts);
 assert.ok(checked.scripts>0);
 if(process.env.SELECTS_SDK_TYPES)assert.equal(checked.sdkTypings,true,'An explicit SDK path must use real declarations.');
});
