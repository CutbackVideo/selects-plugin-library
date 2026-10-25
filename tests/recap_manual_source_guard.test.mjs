import test from 'node:test';
import assert from 'node:assert/strict';
import {recapAuthoringFixture as fixture} from './recap_authoring_fixture.mjs';

// Compile the whole published panel. Only public SDK/files/AI/Draft boundaries are simulated.

for(const options of [{manual:'all'},{manual:'mixed'},{manual:'all',ai:false},{manual:'all',storage:false},{manual:'all',ai:false,storage:false},{manual:'all',sourceFps:null},{manual:'all',draftFps:30}]){
  test('whole production preparation → intro → batch → song/title save: '+JSON.stringify(options),async()=>{
    const f=fixture(options),out=await f.run();assert.equal(out.draftId,'saved-recap');assert.equal(out.mainCount,f.plan.placements.length);
    assert.equal(f.commits.length,2+Math.ceil((f.plan.placements.length-1)/24));assert.ok(f.reads.includes('/r0.mp4')&&f.reads.includes('/r1.mp4'));
    assert.equal(f.submitted.length,options.manual==='mixed'?1:0);
    assert.equal(f.transforms.filter(v=>v.position).length,f.plan.placements.length);
    assert.ok(f.transforms.find(v=>v.clip.resourceId==='r1').position.x>0);
    assert.equal(f.clips.at(-1).endFrame,Math.round(f.plan.durationSeconds*(options.draftFps||24)));
  });
}
test('unchanged automatic full production retains selected windows and source-bound transforms',async()=>{
  const f=fixture({manual:'none'});await f.run();assert.equal(f.submitted.length,2);assert.ok(f.submitted.every(v=>v.task==='faces.detect'));
  assert.equal(f.clips.at(-1).endFrame,288);assert.equal(f.transforms.filter(v=>v.position).length,f.plan.placements.length);
});
for(const [kind,options,message] of [
  ['changed bytes',{mutateAt:'Add recap footage'},/Footage changed after face analysis/],
  ['rebound alias',{aliasAt:'Find fixed soundtrack'},/source.*changed|source.*matched|source.*binding/i]]){
  test('manual-only source rejects '+kind+' before batch insertion/commit',async()=>{
    const f=fixture({...options,manual:'all'});await assert.rejects(f.run(),message);assert.equal(f.commits.length,kind==='changed bytes'?1:0);assert.equal(f.inserts.length,kind==='changed bytes'?1:0);
  });
}
test('focused intro without source evidence cannot silently save',async()=>{
  const f=fixture();const script=f.api.createScript({projectId:'project',intro:{...f.slots[0],frameSize:{width:1920,height:1080}},introEnd:5,expectedFps:24,faceTransform:{position:{x:1,y:0}}});
  await assert.rejects(f.sdk.runScript({summary:'Guard-only probe',script}).then(r=>{if(r.isError)throw Error(r.output)}),/source evidence missing/);
  assert.equal(f.created,0);
});

test('manual placement preserves the automatic assembler source ranges, timing, song and title',async()=>{
  const manual=fixture(),automatic=fixture({manual:'none'});await manual.run();await automatic.run();
  assert.deepEqual(manual.inserts,automatic.inserts);assert.deepEqual(manual.clips,automatic.clips);assert.deepEqual(manual.commits,automatic.commits);
});
test('manual source path replacement is rejected even when the old source bytes still exist',async()=>{
  const f=fixture({pathAt:'Find fixed soundtrack'});await assert.rejects(f.run(),/source binding changed/);assert.equal(f.created,0);
});
test('manual alias is rebound after intro commit: no footage from the new resource is inserted',async()=>{
  const f=fixture({afterIntroAlias:true});await assert.rejects(f.run(),/source binding changed/);assert.equal(f.commits.length,1);assert.equal(f.inserts.length,1);
});

for(const options of [{ai:false},{storage:false}])test('mixed input keeps manual-only framing when automatic analysis is unavailable '+JSON.stringify(options),async()=>{
  const f=fixture({...options,manual:'mixed'});await f.run();assert.equal(f.submitted.length,0);
  assert.equal(f.transforms.filter(v=>v.clip.resourceId==='r0'&&v.position).length,0);
  assert.ok(f.transforms.filter(v=>v.clip.resourceId==='r1').every(v=>v.position.x>0));
});
test('persistent selection identity mismatch rejects unchanged filename/path/bytes',async()=>{
  const f=fixture({staleSelection:true});await assert.rejects(f.run(),/source binding changed/);assert.equal(f.created,0);
});
test('different actual Project grid still excludes automatic transforms',async()=>{
  const f=fixture({manual:'mixed',draftFps:30});await f.run();
  assert.equal(f.transforms.filter(v=>v.clip.resourceId==='r0'&&v.position).length,0);
  assert.ok(f.transforms.filter(v=>v.clip.resourceId==='r1').every(v=>v.position.x>0));
});

test('sample does not inspect a missing manual source that none of its placements use',async()=>{
  const f=fixture({sampleUnusedManual:true}),out=await f.run();
  const used=f.plan.placements.filter(row=>row.startSeconds<12);
  assert.ok(f.slots.some(slot=>slot.resourceId==='r2'));
  assert.equal(out.mainCount,used.length);assert.equal(f.created,1);assert.ok(f.commits.length>=3);
  assert.equal(f.reads.includes('/r2.mp4'),false);assert.equal(f.inserts.some(row=>row.resourceId==='r2'),false);
  assert.equal(f.submitted.length,0);assert.equal(f.clips.at(-1).endFrame,Math.round(used.at(-1).endSeconds*24));
});
test('used manual file stat=null rejects before creating or saving any Draft',async()=>{
  // The public script returns null for stat=null; recapFaceScript rejects that incomplete observation.
  const f=fixture({missingManualSource:true});await assert.rejects(f.run(),/Face analysis could not be read/);
  assert.ok(f.reads.includes('/r1.mp4'));assert.equal(f.created,0);assert.equal(f.inserts.length,0);assert.equal(f.commits.length,0);assert.equal(f.submitted.length,0);
});
test('one persistent source can retain distinct automatic intro and manual batch focus per slot',async()=>{
  const f=fixture({manual:'mixed',sameResourceMixed:true}),out=await f.run();
  assert.equal(out.mainCount,f.plan.placements.length);assert.equal(f.submitted.length,1);
  assert.equal(f.submitted[0].resourceId,'00000000-0000-4000-8000-000000000001');
  const intro=f.transforms.find(row=>row.clip.startFrame===0),manual=f.transforms.filter(row=>row.clip.startFrame>0);
  assert.ok(intro.position.x>0);assert.ok(manual.length>0);
  const manualX=.5*1920*(1920/1080)/1920*100;
  assert.ok(manual.every(row=>Math.abs(row.position.x-manualX)<1e-9));
  assert.notEqual(intro.position.x,manual[0].position.x);
  assert.ok(f.inserts.every(row=>row.resourceId==='r0'));
  assert.equal(f.overlays.length,1);assert.equal(f.overlays[0].resource.resourceId,'song');
  assert.equal(f.overlays[0].over.start,0);assert.equal(f.overlays[0].over.end,288);
  const title=f.graphics.find(row=>row.name==='2026 Recap title');
  assert.equal(title.parameters.top,'thank you');assert.equal(title.parameters.year,'2026');
});
