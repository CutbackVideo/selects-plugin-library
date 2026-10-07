import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import {loadPanelOperation} from './panel_operation.mjs';

const plugins = ['camera-shutter-dump','four-photo-stop-motion','no14-still-video','polaroid-photo-dump','travel-beat-vlog'];
function fixture(plugin, { duplicate = false, wrongOwner = false, moved = false } = {}) {
  const source = fs.readFileSync(new URL(`../plugins/${plugin}/panel.tsx`, import.meta.url), 'utf8');
  const start = source.indexOf('// native-sdk:start');
  assert.ok(start >= 0, 'panel contains the public SDK placement implementation');
  const end = source.indexOf('// native-sdk:end', start);
  const api = vm.runInThisContext(`(()=>{${source.slice(start,end).replaceAll('export async function','async function')}\nreturn {prepareNativeImages:typeof prepareNativeImages!=='undefined'?prepareNativeImages:prepareVideos,placeNativeImages:typeof placeNativeImages!=='undefined'?placeNativeImages:placeVideos};})()`);
  const photos = Array.from({length:24},(_,i)=>['A','B','C','D','frame'][i]??String(i)).map((slot,i)=>({resourceId:`r${i}`,name:slot,path:`/photos/${slot}.png`}));
  const rows = photos.map(photo=>({...photo,type:plugin==='six-clip-velocity'?'Video':'Image',frameSize:{width:640,height:960}}));
  if(duplicate) rows.push({...rows[0],resourceId:'duplicate'});
  let clips=[], commits=0, calls=[];
  const plan={fps:30,durationFrames:600,canvas:{width:720,height:1280},occurrences:[{slot:'A',appearance:'grid',startFrame:0,endFrame:600},{slot:'A',appearance:'fullscreen',startFrame:300,endFrame:600}]};
  const draft={
    meta:async()=>({fps:plan.fps,durationFrames:plan.durationFrames,frameSize:plan.canvas}),
    clips:async()=>clips.map(c=>({...c})),
    rangeAtFrames:async(startFrame,endFrame)=>({startFrame,endFrame}),
    overlayResource:async({resource,over,...options})=>{calls.push({overlay:{resource,over,...options}});clips.push({clipId:clips.length+1,trackId:`video-${clips.length}`,trackKind:'video',resourceId:resource.id,...over,...(moved?{startFrame:over.startFrame+1}:{})});},
    commitAll:async()=>{commits++;return {commitId:'commit'};},
  };
  const project={meta:async()=>({draftIds:wrongOwner?[]:['draft']}), resources:async()=>rows,
    sourceFiles:async()=>({fileTree:rows.map(r=>({...r,type:'video'}))}),resource:id=>({id})};
  const selects={project:id=>{assert.equal(id,'project');return project;},draft:id=>{assert.equal(id,'draft');return draft;}};
  const sdk={runScript:async input=>{calls.push(input);return {result:await new Function('selects',`return (async()=>{${input.script}})()`)(selects)};}};
  return {api,sdk,photos,plan,rows,calls,get clips(){return clips;},get commits(){return commits;}};
}
for(const plugin of plugins){
  test(`${plugin}: native Image placement preserves long holds and independent occurrences through runScript`,async()=>{
    const f=fixture(plugin);
    const selected=plugin==='polaroid-photo-dump'?f.photos:plugin==='camera-shutter-dump'?f.photos.slice(0,2):f.photos.slice(0,4);
    const ready=await f.api.prepareNativeImages(f.sdk,'project',selected);
    const result=await f.api.placeNativeImages(ready,'draft',f.plan,[{source:0,startFrame:0,endFrame:600},{source:0,startFrame:300,endFrame:600}],'test');
    assert.equal(f.commits,1);
    assert.equal(result.placements.length,2);
    assert.deepEqual(result.placements.map(c=>[c.startFrame,c.endFrame]),[[0,600],[300,600]]);
    assert.equal(new Set(result.placements.map(c=>c.clipId)).size,2);
    assert.equal(f.calls.filter(c=>c.allowCommit).length,1);
    if(plugin==='polaroid-photo-dump')assert.equal(result.frame.endFrame,600);
  });
  test(`${plugin}: rejects ambiguous paths before any edit`,async()=>{
    const f=fixture(plugin,{duplicate:true});
    await assert.rejects(f.api.prepareNativeImages(f.sdk,'project',f.photos),/missing or ambiguous/i);
    assert.equal(f.commits,0);
  });
  test(`${plugin}: rejects a changed Project owner or realized frame before saving`,async()=>{
    for(const options of [{wrongOwner:true},{moved:true}]){
      const f=fixture(plugin,options),ready=await f.api.prepareNativeImages(f.sdk,'project',f.photos);
      await assert.rejects(f.api.placeNativeImages(ready,'draft',f.plan,[{source:0,startFrame:0,endFrame:600}],'test'),/owned|interval|position/i);
      assert.equal(f.commits,0);
    }
  });
}

for(const plugin of plugins.filter(id=>id!=='travel-beat-vlog')){
 test(`${plugin}: every reference occurrence survives native SDK migration on fractional grids`,async()=>{
  for(const fps of [30,24000/1001,60]){
   const f=fixture(plugin),operations=loadPanelOperation(plugin);
   Object.assign(f.plan,plugin==='no14-still-video'?operations.nativeScenePlan(fps):operations.scenePlan(fps));
   const count=plugin==='polaroid-photo-dump'?f.plan.occurrences.length+1:plugin==='camera-shutter-dump'?f.plan.occurrences.length:4;
   const ready=await f.api.prepareNativeImages(f.sdk,'project',f.photos.slice(0,count));
   const result=await f.api.placeNativeImages(ready,'draft',f.plan);
   assert.deepEqual(result.placements.map(c=>[c.slot,c.startFrame,c.endFrame]),f.plan.occurrences.map(c=>[c.slot,c.startFrame,c.endFrame]));
   if(plugin==='polaroid-photo-dump')assert.equal(f.clips.at(-1).clipId,result.frame.clipId);
   if(plugin==='four-photo-stop-motion')assert.equal(f.clips.map(c=>c.resourceId).join(','),f.plan.occurrences.map(c=>'r'+'ABCD'.indexOf(c.slot)).join(','));
  }
 });
}
test('six-clip-velocity: all 114 source offsets, exact durations and speed rates pass through the SDK',async()=>{
 const f=fixture('six-clip-velocity');
 Object.assign(f.plan,loadPanelOperation('six-clip-velocity').scenePlan());
 const ready=await f.api.prepareNativeImages(f.sdk,'project',f.photos.slice(0,6));
 const result=await f.api.placeNativeImages(ready,'draft',f.plan);
 const pieces=f.plan.segments.flatMap(segment=>segment.pieces);
 assert.equal(result.placements.length,114);
 assert.deepEqual(f.calls.filter(c=>c.overlay).map(c=>[c.overlay.sourceStartSeconds,c.overlay.playbackSpeed.numerator/c.overlay.playbackSpeed.denominator]),pieces.map(p=>[p.inSec,p.speed]));
 assert.deepEqual(result.placements.map(c=>[c.startFrame,c.endFrame]),pieces.map(p=>[p.startFrame,p.startFrame+p.frames]));
});
