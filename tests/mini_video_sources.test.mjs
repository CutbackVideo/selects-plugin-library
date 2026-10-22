import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {miniMusicFixture} from './mini_music_fixture.mjs';
import {hash,replaceSameFacts} from './gallery_hold_fixture.mjs';

async function fixture(t,entry='panel'){
 const f=await miniMusicFixture(t,{entry,silent:true});
 fs.writeFileSync(f.source,'original A');fs.writeFileSync(f.other,'original B');
 f.inventory.resources=[{rid:'r0',path:f.source,duration:4,analysed:true},{rid:'r1',path:f.other,duration:4,analysed:true}];
 f.files.fingerprint=async p=>fs.existsSync(p)?{size:fs.statSync(p).size,sha256:hash(p)}:null;
 f.box.setCandidates=v=>{f.box.candidates=v;};f.box.candidates=null;f.box.checkLocalClips=async()=>({results:[],unavailable:false});
 let searches=0,searchHook=()=>{};
 f.box.findCandidates=async()=>{searches++;await searchHook();return {list:[{rid:'r0',role:'main',t:1,score:.8},{rid:'r1',role:'main',t:1,score:.8}],failed:[]};};
 const original=f.box.sdk.runScript;f.box.sdk.runScript=async input=>{if(input.summary==='Search shots'){searches++;await searchHook();}return original(input);};
 const oldPlan=f.box.mvPlanBuild;f.box.mvPlanBuild=opts=>{f.hooks.beforePlan?.();return oldPlan(opts);};
 return {...f,searches:()=>searches,onSearch:fn=>{searchHook=fn;}};
}
for(const entry of ['panel','template']){
 test('Mini video sources: '+entry+' rejects a missing analyzed original before assembly',async t=>{
  const f=await fixture(t,entry);fs.unlinkSync(f.source);let failure;try{await f.run();}catch(e){failure=e;}
  assert.equal(f.saved.length,0,'analysis data is not evidence of original file availability');assert.equal(f.searches(),0,'do not search an unavailable original');assert.ok(f.errors.length||failure);
 });
 test('Mini video sources: '+entry+' freezes every selected video identity into recovery config',async t=>{
  const f=await fixture(t,entry);await f.run();assert.equal(f.saved.length,1);const rows=f.saved[0].analysisSources;
  assert.deepEqual(Array.from(rows||[],r=>r.path).sort(),[f.source,f.other].sort());for(const r of rows)assert.equal(r.sha256,hash(r.path));
 });
 test('Mini video sources: '+entry+' detects replacement while scene search is in flight',async t=>{
  const f=await fixture(t,entry);f.onSearch(()=>replaceSameFacts(f.source,f.other));try{await f.run();}catch{}
  assert.ok(f.searches()>0);assert.equal(f.saved.length,0,'old search observations cannot authorize current physical media');
 });
 test('Mini video sources: '+entry+' detects replacement after planning before dispatch',async t=>{
  const f=await fixture(t,entry);f.hooks.beforePlan=()=>replaceSameFacts(f.source,f.other);try{await f.run();}catch{}
  assert.equal(f.saved.length,0,'selected analyzed sources must still match at assembly dispatch');
 });
}
test('Mini video sources: a cached scene result is reused only for the same observed original bytes',async t=>{
 const f=await fixture(t);await f.run();assert.equal(f.saved.length,1);assert.equal(f.searches(),1);
 await f.run();assert.equal(f.saved.length,2);assert.equal(f.searches(),1);
 replaceSameFacts(f.source,f.other);await f.run();assert.equal(f.saved.length,3);assert.equal(f.searches(),2,'same metadata must not reuse scene candidates from different original bytes');
});
test('Mini video sources: an unselected missing video does not block selected originals',async t=>{
 const f=await fixture(t);f.box.only=['r1'];fs.unlinkSync(f.source);await f.run();assert.equal(f.saved.length,1,JSON.stringify(f.errors));assert.deepEqual(Array.from(f.saved[0].analysisSources||[],r=>r.path),[f.other]);
});

for(const entry of ['panel','template'])test('Mini video source binding: '+entry+' refuses a relink while the observed old original still exists',async t=>{
 const f=await fixture(t,entry);f.project.sourceFiles=async()=>({fileTree:[{type:'video',resourceId:'r0',path:f.other},{type:'video',resourceId:'r1',path:f.other}]});let failure;try{await f.run();}catch(e){failure=e;}assert.equal(f.saved.length,0);assert.equal(f.searches(),0);assert.ok(fs.existsSync(f.source));assert.ok(f.errors.length||failure);
});
