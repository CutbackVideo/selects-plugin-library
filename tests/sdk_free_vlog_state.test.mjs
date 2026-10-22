import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import {assemblyIntentFixture} from './mini_assembly_intent_fixture.mjs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
// Exercise the edited template with its existing SDK-safe dependencies. The
// parent owns regenerating installed operations after integrating this packet.
function operation(plugin,kind){
 const installed=read(`plugins/${plugin}/scripts/${kind}.js`),body=read(`plugins/${plugin}/dev/${kind}.template.js`);
 const marker=kind==='verify-assembly'?'// Read-only admission of an already-owned historical assembly.':'const cfg = __CONFIG__;';
 const index=installed.indexOf(marker);assert.ok(index>=0,marker);
 return installed.slice(0,index)+body;
}
function observedSource(sources,row){
 const matches=sources?.clips?.filter(c=>c.clipId===row.clipId&&c.trackId===row.trackId);
 if(matches?.length!==1)throw Error('Saved source observation is missing.');
 const c=matches[0];
 if(c.resourceId!==row.resourceId||c.startFrame!==row.startFrame||c.endFrame!==row.endFrame||row.trackKind&&c.trackKind!==row.trackKind)throw Error('Saved source placement changed.');
 return clone(c.source);
}
function observation(rows){return {revision:'saved-v1',owner:{projectId:'p',libraryId:'library'},clips:rows.filter(r=>r.resourceId).map(r=>({clipId:r.clipId,trackId:r.trackId,trackKind:r.trackKind,resourceId:r.resourceId,startFrame:r.startFrame,endFrame:r.endFrame,playbackSpeed:r.playbackSpeed.numerator/r.playbackSpeed.denominator,source:{clipId:r.clipId,...clone(r._source)}}))};}
const row={clipId:1,trackId:'main',trackKind:'main',resourceId:'r',startFrame:0,endFrame:30,playbackSpeed:{numerator:1,denominator:1},preserveAudioPitch:true};
function reader(){return {meta:async()=>({fps:30,durationFrames:30,frameSize:{width:1920,height:1080}}),clips:async()=>[clone(row)],motionGraphics:async()=>[],videoEffects:async()=>[],clipAudio:async()=>({volumeDb:0}),clipTransform:async()=>({scale:{x:1,y:1}})};}
test('SDK-free working state records pending source without inventing a source window',async()=>{
 const box=vm.createContext({});vm.runInContext(read('shared/template-run.js'),box);
 for(const name of ['readTemplateSavedState','readTemplateAssemblyState']){
  const result=await box[name](reader());
  assert.equal(result.sourcesPending,true);assert.equal(result.clips[0].source,null);
 }
});
test('SDK-free saved state binds actual source data and rejects stale placement',async()=>{
 const box=vm.createContext({});vm.runInContext(read('shared/template-run.js'),box);
 const sources={clips:[{...row,playbackSpeed:1,source:{clipId:1,startSeconds:7.25,endSeconds:8.25}}]};
 const result=await box.readTemplateSavedState(reader(),sources,observedSource);
 assert.equal(result.sourcesPending,undefined);assert.deepEqual(clone(result.clips[0].source),sources.clips[0].source);
 sources.clips[0].endFrame++;
 await assert.rejects(box.readTemplateSavedState(reader(),sources,observedSource),/placement changed/);
});
for(const plugin of ['mini-vlog','archive-vlog']){
 const probeName=plugin==='mini-vlog'?'Mini source timing check':'Archive source timing check';
 test(`${plugin}: working assembly has no source reader and hands explicit planned source intents to its pre-save owner`,async()=>{
  const f=assemblyIntentFixture({scriptSource:operation(plugin,'assemble'),probeName});
  const create=f.project.createDraft;f.project.createDraft=async input=>{const d=await create(input);delete d.clipSourceWindow;return d;};
  let intents;f.cfg.__beforeCommit=async(_draft,value)=>{intents=clone(value);};
  await f.run();assert.equal(f.calls.commits,1);assert.equal(intents.length,2);
  assert.equal(intents[1].source.startSeconds,f.drafts.at(-1).rows()[1]._source.startSeconds);
  assert.equal(intents[1].source.endSeconds,f.drafts.at(-1).rows()[1]._source.endSeconds);
 });
 test(`${plugin}: saved verifier requires actual observations and catches source-only drift`,async()=>{
  const f=assemblyIntentFixture({scriptSource:operation(plugin,'assemble'),probeName});await f.run();
  const target=f.drafts.at(-1),id='saved',sources=observation(target.rows());
  f.project.meta=async()=>({draftIds:[id]});delete target.d.clipSourceWindow;
  const verify=extra=>vm.runInNewContext('(async()=>{'+operation(plugin,'verify-assembly').replace('__CONFIG__',()=>JSON.stringify({config:f.cfg,draftId:id,__sources:sources,...extra}))+'})()',{selects:{project:()=>f.project,draft:()=>target.d},templateObservedSource:observedSource});
  assert.equal((await verify()).verified,true);
  sources.clips[1].source.endSeconds+=1/30;assert.equal((await verify()).status,'mismatch');
  assert.equal((await verify({__sources:null})).verified,false);assert.equal(f.calls.commits,1);
 });
}
