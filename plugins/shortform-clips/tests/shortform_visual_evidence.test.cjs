'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('bounded source evidence and targeted review',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),m={exports:{}};
 const src=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 new Function('require','module','exports',dep('esbuild').transformSync(src+'\nexport {sourceEvidenceBursts,sourceReviewFrames,sourceEvidenceDiscontinuity,reframingPlanningFacts};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 const {sourceEvidenceBursts:sample,sourceReviewFrames:review}=m.exports;
 await t.test('dense bursts retain measured IDs, source timing and turn scope',()=>{
  const catalog=Array.from({length:100},(_,i)=>({id:'f'+i,resourceId:'r',sourceFrame:1000+i*15,draftFrame:i*15}));
  const words=[0,300,600].map((startFrame,i)=>({startFrame,endFrame:startFrame+300,sourceStartFrame:1000+startFrame,sourceEndFrame:1300+startFrame,sourceResourceId:'r',speakerId:i}));
  const before={meta:{fps:30,durationFrames:900},words,sources:[{resourceId:'r',meta:{fps:30,durationFrames:10000}}]};
  const bursts=sample(before,catalog.filter(c=>c.draftFrame<900));
  assert.ok(bursts.length<=8);
  for(const speaker of [0,1,2])assert.ok(bursts.some(b=>b.speakerId===speaker));
  for(const b of bursts){
   assert.ok(b.sourceFrames.length>=3);assert.ok(b.sourceFrames.length<=8);
   assert.equal(b.sourceFrames[0],b.sourceFrame);
   assert.ok(b.sourceFrames.at(-1)-b.sourceFrame<=45);
   assert.ok(b.faceIds.every(id=>catalog.some(c=>c.id===id&&c.sourceFrame===b.sourceFrame)));
   const w=words.find(w=>w.speakerId===b.speakerId);assert.ok(b.sourceFrames.at(-1)<w.sourceEndFrame);
  }
 });
 await t.test('compact planning facts retain all words and face references across sources',()=>{
  const words=[{text:'one',startFrame:0,endFrame:8,sourceResourceId:'r',sourceStartFrame:100,sourceEndFrame:108,speakerId:7,wordId:'w1'},
   {text:'two',startFrame:8,endFrame:20,sourceResourceId:'r',sourceStartFrame:115,sourceEndFrame:127,speakerId:7,wordId:'w2'},
   {text:'three',startFrame:20,endFrame:30,sourceResourceId:'s',sourceStartFrame:5,sourceEndFrame:15,speakerId:7}];
  const faces=[{id:'f',resourceId:'s',sourceFrame:7,draftFrame:22,orderFromLeft:2,facesInFrame:4,box:{xmin:1,xmax:2}}];
  const facts=m.exports.reframingPlanningFacts({sources:[{resourceId:'r'},{resourceId:'s'}],words},faces);
  assert.equal(facts.words.length,3);assert.equal(facts.faces.length,1);
  assert.deepEqual(facts.words.map(w=>[w.source,w.sourceStartFrame,w.sourceEndFrame]),[[0,100,108],[0,115,127],[1,5,15]]);
  assert.deepEqual(facts.turns.map(t=>[t.source,t.startFrame,t.endFrame,t.text]),[[0,0,20,'one two'],[1,20,30,'three']]);
  assert.equal(facts.faces[0].source,1);assert.equal(facts.faces[0].id,'f');
  assert.equal(facts.words[0].wordId,undefined);assert.equal(facts.faces[0].box,undefined);
  assert.equal(words[0].wordId,'w1');assert.ok(faces[0].box);
 });
 await t.test('real source cut breaks identity strips while articulation within each layout does not',()=>{
  const {frames}=require('./fixtures/source-evidence-cut.json');
  const changed=m.exports.sourceEvidenceDiscontinuity;
  assert.equal(changed(frames['72131'],frames['72135']),false);
  assert.equal(changed(frames['72135'],frames['72140']),true);
  assert.equal(changed(frames['72140'],frames['72144']),false);
 });
 const shot=(a,b,id='same')=>({startFrame:a,endFrame:b,resourceId:'r',style:'speaker',compositionId:id,subjects:[{faceId:'f',closeUp:4}]});
 await t.test('repeated compositions share representative but every boundary is checked',()=>{
  const frames=review([shot(0,100),shot(100,200),shot(200,300)],300);
  assert.ok(frames.includes(49));assert.ok(!frames.includes(149));assert.ok(!frames.includes(249));
  for(const f of [0,299,98,99,100,101,198,199,200,201])assert.ok(frames.includes(f));
 });
 await t.test('one-frame repair only rechecks the moved edge',()=>{
  const old=[shot(0,100),shot(100,200,'other')],next=[shot(0,99),shot(99,200,'other')];
  assert.deepEqual(review(next,200,old),[97,98,99,100,101]);
 });
 await t.test('crop repair checks all occurrences of affected composition only',()=>{
  const old=[shot(0,100),shot(100,200,'other'),shot(200,300)];
  const next=old.map(s=>s.compositionId==='same'?{...s,subjects:[{faceId:'f',closeUp:5}]}:s);
  assert.deepEqual(review(next,300,old),[0,49,99,200,249,299]);
  assert.deepEqual(review(old,300,old),[]);
 });
});
