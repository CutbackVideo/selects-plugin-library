'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('autonomous reframing contract',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild'),m={exports:{}};
 const src=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 new Function('require','module','exports',esbuild.transformSync(src+'\nexport {runAgentReframing,parseAgentReframeReport,normalizeReframeWords,validateSpeakerEvidence};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 const baseline={meta:{durationFrames:90,fps:30},words:[{text:'Hello',startFrame:0,endFrame:30}],sources:[{resourceId:'r',meta:{frameSize:{width:1920,height:1080}}}]};
 const shot={startFrame:0,endFrame:90,resourceId:'r',style:'speaker',compositionId:'person',subjects:[{faceId:'F1'}]};
 const valid={draftId:'d',status:'planned',shots:[shot],speakerEvidence:[{startFrame:0,endFrame:90,resourceId:'r',sourceFrames:[0,8,16],subject:'right person',basis:'mouth-motion',evidence:'sustained articulation'}]};
 async function run({after=baseline,report=valid,failRead=false,failAi=false,review={status:'complete',summary:'Acceptable'},missingFrame=false}={}){
  let reads=0,calls=0,applies=0;const notes=[];
  const sdk={runScript:async input=>input.summary==='Apply agent-selected source crops'?(applies++,{result:{applied:[shot]}}):({result:++reads===1?baseline:after,isError:failRead}),
   call:async()=>{throw Error('Runtime review must not capture previews');},
   askAI:async input=>{
    calls++;if(calls===1){assert.equal(input.timeoutMs,600000);assert.equal(input.ephemeral,false);assert.ok(input.prompt.includes("Light-ASD AVA"));assert.ok(input.prompt.includes('"score":1.5'));
     assert.ok(input.prompt.includes('Use your existing Selects SDK tools READ-ONLY'));assert.ok(input.prompt.includes('"closeUp":6'));
     assert.ok(input.prompt.includes('face-center height'));assert.ok(input.prompt.includes('UNCROPPED SOURCE'));assert.ok(input.prompt.includes('Group consecutive words by speakerId'));assert.ok(src.includes('speakerId:w.speakerId,speakerName:w.speakerName'));assert.ok(input.prompt.includes('never write face boxes or crop coordinates'));assert.ok(input.prompt.includes('not draft.captureCameraAngles'));assert.ok(!input.prompt.includes('SOURCE-CROP SCRIPT'));
     if(failAi)throw Error('timeout');return {text:JSON.stringify(report)};
    }
    assert.equal(input.advanced,undefined);assert.equal(input.timeoutMs,120000);assert.ok(input.images.length);assert.ok(input.prompt.includes('covering the eyes or mouth'));return {text:JSON.stringify(review)};
   }};
  return {execute:()=>m.exports.runAgentReframing({sdk,guard:p=>p,projectId:'p',draftId:'d',layout:{closeUp:6,faceY:35,cameraMode:'speaker'},note:e=>notes.push(e),measureSpeakers:async()=>[{resourceId:"r",rows:[{faceId:"F1",score:1.5}]}],prepareEvidence:async()=>({images:[{dataUrl:"data:image/jpeg;base64,test"}],samples:[]}),measureFaces:async()=>[{id:'F1',resourceId:'r',draftFrame:20,box:{xmin:800,xmax:1000,ymin:250,ymax:500}}]}),state:()=>({reads,calls,applies,notes})};
 }
 await t.test('reads fenced reports even when the agent adds a completion note',()=>{
  const report={draftId:'d',status:'complete',verifiedFrames:[1]};
  assert.deepEqual(m.exports.parseAgentReframeReport('Saved.\n```json\n'+JSON.stringify(report)+'\n```\n'),report);
  assert.throws(()=>m.exports.parseAgentReframeReport('Still working'));
 });
 await t.test('accepts only contiguous split fragments of the same source word',()=>{
  const w={text:'word',startFrame:10,endFrame:30,wordId:'w1',sourceResourceId:'r1',sourceStartFrame:110,sourceEndFrame:130};
  const parts=[{...w,endFrame:20,sourceEndFrame:120},{...w,startFrame:20,sourceStartFrame:120}];
  const normalize=m.exports.normalizeReframeWords;
  assert.deepEqual(normalize(parts),[w]);
  for(const change of [{wordId:'w2'},{sourceResourceId:'r2'},{startFrame:21},{sourceStartFrame:121},{text:'changed'}]) assert.equal(normalize([parts[0],{...parts[1],...change}]).length,2);
  assert.deepEqual(parts[0].endFrame,20);
 });
 await t.test('agent plans once and code validates and applies without runtime previews',async()=>{const r=await run();assert.equal((await r.execute()).status,'complete');assert.equal(r.state().reads,3);assert.equal(r.state().calls,1);assert.equal(r.state().applies,1);});
 await t.test('rejects speech edits and timing changes outside framing scope',async()=>{
  for(const after of [{...baseline,meta:{...baseline.meta,durationFrames:80}},{...baseline,words:[]}]){const r=await run({after});await assert.rejects(r.execute,/outside reframing scope/);}
 });
 await t.test('does not automatically replay an agent turn after partial failure',async()=>{const r=await run({failAi:true});await assert.rejects(r.execute,/timeout/);assert.equal(r.state().calls,1);});
 await t.test('rejects missing, fabricated-shaped and uncovered opening evidence',()=>{
  const validate=m.exports.validateSpeakerEvidence;
  for(const speakerEvidence of [undefined,[],[{startFrame:1,endFrame:90,resourceId:'r',sourceFrames:[0,8,16],subject:'person',basis:'mouth-motion',evidence:'motion'}],[{startFrame:0,endFrame:90,resourceId:'r',sourceFrames:[0,0,0],subject:'person',basis:'mouth-motion',evidence:'motion'}]]) assert.throws(()=>validate({speakerEvidence},90));
 });
 await t.test('source evidence may group real frames by burst instead of global frame order',()=>{
  const row={startFrame:0,endFrame:90,resourceId:'r',sourceFrames:[100,110,120,105,115,125],subject:'person',basis:'mouth-motion',evidence:'multiple source bursts'};
  m.exports.validateSpeakerEvidence({speakerEvidence:[row]},90);
  m.exports.validateSpeakerEvidence({speakerEvidence:[{...row,sourceFrames:[100,110,120,100]}]},90);
  for(const sourceFrames of [[100,100,100],[100,110,110],[-1,100,110],[100,110,NaN]])assert.throws(()=>m.exports.validateSpeakerEvidence({speakerEvidence:[{...row,sourceFrames}]},90));
 });
 await t.test('opening evidence alone cannot certify the rest of the clip',()=>{
  const row={startFrame:0,endFrame:30,resourceId:'r',sourceFrames:[0,8,16],subject:'person',basis:'mouth-motion',evidence:'motion'};
  assert.throws(()=>m.exports.validateSpeakerEvidence({speakerEvidence:[row]},90),/full Draft/);
  assert.throws(()=>m.exports.validateSpeakerEvidence({speakerEvidence:[row,{...row,startFrame:31,endFrame:90}]},90),/uncovered interval/);
  m.exports.validateSpeakerEvidence({speakerEvidence:[{...row,startFrame:30,endFrame:90},row]},90);
 });
 await t.test('blocked, wrong-target and invalid plans never reach application',async()=>{
  for(const report of [{...valid,draftId:'x'},{draftId:'d',status:'blocked'},{...valid,shots:[]},{...valid,shots:[{...shot,endFrame:80}]}]){const r=await run({report});await assert.rejects(r.execute);assert.equal(r.state().applies,0);}
 });
 await t.test('completion reports geometry checks without claiming visual verification',async()=>{
  const r=await run();const result=await r.execute();assert.equal(result.visualReview.status,'not-run');assert.equal(result.verification.kind,'geometry-and-timing');assert.equal(result.verifiedFrames,undefined);
 });
});
