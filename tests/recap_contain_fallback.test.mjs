import test from 'node:test';
import assert from 'node:assert/strict';
import {recapAuthoringFixture} from './recap_authoring_fixture.mjs';
import {checkScriptTypes} from './run_script_types.mjs';
const plain=x=>JSON.parse(JSON.stringify(x));
for(const faceMode of ['no-faces','cannot-fit'])for(const draftFps of [24,30])test('Recap whole prepare→intro→batch→save contains '+faceMode+' at '+draftFps+' fps',async()=>{
 const f=recapAuthoringFixture({manual:'none',faceMode,draftFps}),out=await f.run();
 assert.equal(out.mainCount,f.plan.placements.length);assert.equal(f.transforms.length,f.plan.placements.length);
 for(const row of f.transforms)assert.deepEqual(plain({scale:row.scale,position:row.position}),{scale:{x:1,y:1},position:{x:0,y:0}});
 assert.equal(f.clips.at(-1).endFrame,Math.round(f.plan.durationSeconds*draftFps));
 assert.ok(out.faceFocus.every(row=>row.status==='cannot-fit'||row.reason==='no-faces'));
});
for(const faceMode of ['focused','invalid','error'])test('Recap '+faceMode+' retains cover/error policy in full authoring',async()=>{
 const f=recapAuthoringFixture({manual:'none',faceMode});await f.run();assert.ok(f.transforms.every(row=>row.scale.x>1));
 if(faceMode!=='focused')assert.ok(f.transforms.every(row=>row.position===undefined));
});
test('Recap manual and automatic slots of same source keep separate fit decisions',async()=>{
 const f=recapAuthoringFixture({manual:'mixed',sameResourceMixed:true,faceMode:'no-faces'});await f.run();
 assert.equal(f.transforms[0].scale.x,1);assert.ok(f.transforms.slice(1).every(row=>row.scale.x>1&&row.position.x>0));
});
test('Recap fallback still refuses source bytes changed at the real authoring boundary',async()=>{
 const f=recapAuthoringFixture({manual:'none',faceMode:'no-faces',mutateAt:'Add recap footage'});
 await assert.rejects(f.run(),/Footage changed after face analysis/);assert.equal(f.commits.length,1);
});

test('Recap fallback preserves sources, music, title and cut clock compared with normal cover authoring',async()=>{
 const a=recapAuthoringFixture({manual:'none'}),b=recapAuthoringFixture({manual:'none',faceMode:'no-faces'});await a.run();await b.run();
 assert.deepEqual(a.inserts,b.inserts);assert.deepEqual(a.clips,b.clips);assert.deepEqual(a.overlays,b.overlays);assert.deepEqual(a.graphics,b.graphics);assert.deepEqual(a.commits,b.commits);
});

test('actual prepared full-source intro/batch/finish scripts compile against the public SDK',async()=>{
 const f=recapAuthoringFixture({manual:'none',faceMode:'no-faces'});await f.run();
 const scripts=f.requests.filter(request=>['Create recap intro','Add recap footage','Finish recap Draft'].includes(request.summary));
 assert.ok(scripts.length>=3);assert.equal(checkScriptTypes(scripts.map((request,index)=>({name:request.summary+' '+index,script:request.script}))).scripts,scripts.length);
});

for(const options of [{ai:false},{storage:false},{sourceFps:null}])test('Recap unavailable analysis is not relabeled as valid no-faces '+JSON.stringify(options),async()=>{
 const f=recapAuthoringFixture({manual:'none',faceMode:'no-faces',...options});await f.run();assert.equal(f.submitted.length,0);assert.ok(f.transforms.every(row=>row.scale.x>1&&row.position===undefined));
});
test('Recap late observation after scope change does not contain, create or save',async()=>{
 const f=recapAuthoringFixture({manual:'none',faceMode:'detach'});await assert.rejects(f.run(),/recap ended/);assert.equal(f.created,0);assert.equal(f.commits.length,0);
});
test('Recap full-source fallback cannot bypass persistent alias source binding',async()=>{
 const f=recapAuthoringFixture({manual:'none',faceMode:'no-faces',aliasAt:'Find fixed soundtrack'});await assert.rejects(f.run(),/source binding changed/);assert.equal(f.created,0);assert.equal(f.commits.length,0);
});
