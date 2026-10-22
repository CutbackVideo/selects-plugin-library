'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('autonomous reframing contract',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild'),m={exports:{}};
 const src=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 new Function('require','module','exports',esbuild.transformSync(src+'\nexport {FRAMING_WORDS_SCRIPT,runAgentReframing,parseAgentReframeReport,normalizeReframeWords,validateSpeakerEvidence};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 await t.test('long framing reads omit editing spans while retaining timing and speaker facts',async()=>{
  const word={text:'babyfood',startFrame:0,endFrame:30,wordId:'w1',speakerId:1,speakerName:'Speaker',sourceResourceId:'source',sourceStartFrame:100,sourceEndFrame:130};
  const words=Array.from({length:400},(_,i)=>({...word,wordId:'w'+i,span:{owner:'x'.repeat(2000)},within:{owner:'y'.repeat(2000)}}));
  const execute=new Function('d','return (async()=>'+m.exports.FRAMING_WORDS_SCRIPT+')()');
  const compact=await execute({words:async()=>words});
  assert.deepEqual(compact,words.map(({span,within,...facts})=>facts));
  assert.ok(Buffer.byteLength(JSON.stringify({words}))>262144);
  assert.ok(Buffer.byteLength(JSON.stringify({words:compact},null,2))<262144);
  assert.ok(!src.includes('words:await d.words()'),'baseline and verification reads must both omit Span objects');
 });
 const baseline={meta:{durationFrames:90,fps:30,frameSize:{width:1080,height:1920}},words:[{text:'Hello',startFrame:0,endFrame:30,wordId:'w1',sourceResourceId:'r',sourceStartFrame:100,sourceEndFrame:130}],sources:[{resourceId:'r',meta:{frameSize:{width:1920,height:1080}}}]};
 const shot={startFrame:0,endFrame:90,resourceId:'r',style:'speaker',compositionId:'person',subjects:[{faceId:'F1'}]};
 const valid={version:1,draftId:'d',status:'planned',shots:[{startFrame:0,endFrame:90,compositionId:'person',layout:'speaker',panels:[{camera:'r',targets:[{subjectId:'person',refs:['F1']}]}]}],speakerEvidence:[{startFrame:0,endFrame:90,resourceId:'r',sourceFrames:[0,8,16],subject:'right person',basis:'mouth-motion',evidence:'sustained articulation'}]};
 async function run({transcriptOnly=false,after=baseline,report=valid,failRead=false,failAi=false,review={status:'complete',summary:'Acceptable'},missingFrame=false,failEvidence=false,raw,repairText,afterApply}={}){
  let reads=0,calls=0,applies=0;const notes=[];
  const sdk={runScript:async input=>{
    if(input.summary==='Apply agent-selected source crops'){applies++;return {result:{applied:[shot]}};}
    reads++;
    if(transcriptOnly && reads===1){
      const project={meta:async()=>({draftIds:['d']}),resources:async()=>[{resourceId:'r',name:'source.mp4',status:'sampling',hasAnalysis:false,hasTranscription:true}],
        resource:()=>{throw Error('resource_not_analyzed');},
        sourceFiles:async()=>({fileTree:[{type:'file',resourceId:'r',path:'/source.mp4',frameRate:30,durationSeconds:3,frameSize:{width:1920,height:1080}}]}),
        transcription:async()=>({utterances:[]})};
      const draft={meta:async()=>baseline.meta,words:async()=>baseline.words,clips:async()=>[{resourceId:'r'}]};
      const code=esbuild.transformSync('return (async()=>{'+input.script+'})();',{loader:'ts'}).code;
      return {result:await new Function('selects',code)({project:()=>project,draft:()=>draft})};
    }
    return {result:reads===1?baseline:(applies&&afterApply?afterApply:after),isError:failRead};
   },
   call:async(method)=>{throw Error('Unexpected analyzed read or preview: '+method);},
   askAI:async input=>{
    calls++;if(calls===1){assert.equal(input.timeoutMs,600000);assert.equal(input.ephemeral,false);assert.ok(input.prompt.includes('"cameras":["r"]'));assert.ok(input.prompt.includes("Light-ASD AVA"));assert.ok(input.prompt.includes('"score":1.5'));
     assert.ok(input.prompt.includes('Use your existing Selects SDK tools READ-ONLY'));assert.ok(!input.prompt.includes('"closeUp":6'));
     assert.ok(input.prompt.includes('UNCROPPED SOURCE'));assert.ok(input.prompt.includes('speakerTurns'));assert.ok(!input.prompt.includes('Hello'));assert.ok(src.includes('speakerId:w.speakerId,speakerName:w.speakerName'));assert.ok(input.prompt.includes('Do not specify closeUp'));assert.ok(input.prompt.includes('do not call resource.captureFrames'));assert.ok(!input.prompt.includes('SOURCE-CROP SCRIPT'));
     if(failAi)throw Error('timeout');return {text:raw??JSON.stringify(report)};
    }
    if(raw!==undefined){assert.equal(input.images,undefined);assert.equal(input.timeoutMs,120000);assert.ok(input.prompt.includes('Repair JSON syntax only'));return {text:repairText??JSON.stringify(report)};}
    assert.equal(input.advanced,undefined);assert.equal(input.timeoutMs,120000);assert.ok(input.images.length);assert.ok(input.prompt.includes('covering the eyes or mouth'));return {text:JSON.stringify(review)};
   }};
  return {execute:()=>m.exports.runAgentReframing({sdk,guard:p=>p,projectId:'p',draftId:'d',layout:{closeUp:6,faceY:35,cameraMode:'speaker'},note:e=>notes.push(e),measureSpeakers:async()=>[{resourceId:"r",rows:[{faceId:"F1",score:1.5}]}],prepareEvidence:async()=>{if(failEvidence)throw Error('capture unavailable');return ({images:[{dataUrl:"data:image/jpeg;base64,test"}],samples:[]});},measureFaces:async()=>[{id:'F1',resourceId:'r',draftFrame:20,box:{xmin:800,xmax:1000,ymin:250,ymax:500}}]}),state:()=>({reads,calls,applies,notes})};
 }
 await t.test('transcript-ready sampling source reaches framing without an analyzed Resource read',async()=>{
  const r=await run({transcriptOnly:true});
  assert.equal((await r.execute()).status,'complete');assert.equal(r.state().applies,1);
 });
 await t.test('repairs a malformed plan once then applies through normal validation',async()=>{
  const raw=JSON.stringify(valid).replace('"shots":','"shots"::');
  const r=await run({raw});assert.equal((await r.execute()).status,'complete');assert.equal(r.state().calls,2);assert.equal(r.state().applies,1);
 });
 await t.test('failed syntax repair keeps the existing framing and reports it as limited',async()=>{
  const raw=JSON.stringify(valid).replace('"shots":','"shots"::');
  for(const repairText of [raw,JSON.stringify({...valid,draftId:'other'})]){
   const r=await run({raw,repairText}),result=await r.execute();
   assert.equal(result.preservedAll,true);assert.equal(result.qualityStatus,'limited');assert.match(result.preservedRanges[0].reason,/JSON repair/);
   assert.equal(r.state().calls,2);assert.equal(r.state().applies,0);
  }
 });
 await t.test('repaired JSON still has to pass the existing composition validator',async()=>{
  const report={...valid,shots:[]},raw=JSON.stringify(report).replace('"shots":','"shots"::');
  const r=await run({report,raw}),result=await r.execute();assert.equal(result.preservedAll,true);assert.match(result.preservedRanges[0].reason,/composition:schema/);assert.equal(r.state().calls,2);assert.equal(r.state().applies,0);
 });
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
 await t.test('descriptive evidence cannot discard executable framing or change its geometry',async()=>{
  const baselineRun=await run(),expected=await baselineRun.execute();
  for(const speakerEvidence of [undefined,[],[null],[{...valid.speakerEvidence[0],basis:'visual'}],[{...valid.speakerEvidence[0],basis:'appearance-only'}],[{...valid.speakerEvidence[0],subject:''}],[{...valid.speakerEvidence[0],sourceFrames:[]}],[{...valid.speakerEvidence[0],startFrame:1}],[{...valid.speakerEvidence[0],endFrame:30}]]){
   const r=await run({report:{...valid,speakerEvidence}}),result=await r.execute();
   assert.equal(r.state().applies,1);assert.equal(r.state().calls,1);
   assert.deepEqual(result.appliedShots,expected.appliedShots);
   assert.equal(result.qualityStatus,'complete');
   assert.ok(['incomplete','reported'].includes(result.evidenceReview.status));
   if(!speakerEvidence?.[0]?.basis||speakerEvidence[0].subject===''||speakerEvidence[0].sourceFrames.length===0||speakerEvidence[0].startFrame===1||speakerEvidence[0].endFrame===30)assert.ok(result.evidenceReview.warnings.length);
  }
 });
 await t.test('rejects speech edits and timing changes outside framing scope',async()=>{
  for(const after of [{...baseline,meta:{...baseline.meta,durationFrames:80}},{...baseline,words:[]}]){const r=await run({after});await assert.rejects(r.execute,/dialogue or timing changed/);}
 });
 await t.test('canvas and fps changes remain blocked; object key order is not a change',async()=>{
  for(const change of [{fps:24},{frameSize:{width:1920,height:1080}}]) {
   const r=await run({after:{...baseline,meta:{...baseline.meta,...change}}});
   await assert.rejects(r.execute,/dialogue or timing changed/);assert.equal(r.state().applies,0);
  }
  const r=await run({after:{...baseline,meta:{...baseline.meta,frameSize:{height:1920,width:1080}}}});
  assert.equal((await r.execute()).status,'complete');
 });
 await t.test('crop-induced word fragments are not annotation changes',async()=>{
  const w=baseline.words[0],afterApply={...baseline,words:[{...w,endFrame:15,sourceEndFrame:115},{...w,startFrame:15,sourceStartFrame:115}]};
  const r=await run({afterApply});assert.equal((await r.execute()).status,'complete');
  assert.ok(!r.state().notes.some(n=>n.plan==='reframe-speaker-annotations-updated'));
 });
 await t.test('background speaker annotations do not count as dialogue edits',async()=>{
  for(const change of [{speakerName:'Speaker 2'},{speakerId:9,speakerName:'Updated name'}]) {
   const r=await run({after:{...baseline,words:baseline.words.map(w=>({...w,...change}))}});
   assert.equal((await r.execute()).status,'complete');assert.equal(r.state().applies,1);
   assert.ok(r.state().notes.some(n=>n.plan==='reframe-speaker-annotations-updated'));
  }
 });
 await t.test('every dialogue/source field remains protected before and after applying crops',async()=>{
  for(const change of [{text:'Changed'},{wordId:'other'},{startFrame:1},{endFrame:29},{sourceResourceId:'other'},{sourceStartFrame:101},{sourceEndFrame:129}]) {
   const altered={...baseline,words:baseline.words.map(w=>({...w,...change}))};
   for(const postApply of [false,true]) {
    const r=await run(postApply?{afterApply:altered}:{after:altered});
    await assert.rejects(r.execute,/dialogue or timing changed/);
    assert.equal(r.state().applies,postApply?1:0);
    const diagnostic=r.state().notes.find(n=>n.plan==='reframe-integrity-mismatch');
    assert.deepEqual(diagnostic.changedFields,['words']);assert.equal(diagnostic.firstMismatch,0);
    assert.deepEqual(diagnostic.afterWord,{...baseline.words[0],...change});
   }
  }
 });
 await t.test('does not automatically replay an agent turn after partial failure',async()=>{const r=await run({failAi:true}),result=await r.execute();assert.equal(result.preservedAll,true);assert.equal(r.state().calls,1);assert.equal(r.state().applies,0);});
 await t.test('keeping the existing framing still rejects dialogue or timing edits made meanwhile',async()=>{const r=await run({failAi:true,after:{...baseline,words:[]}});await assert.rejects(r.execute,/dialogue or timing changed/);assert.equal(r.state().applies,0);});
 await t.test('missing evidence keeps the existing framing without claiming it was framed',async()=>{
  const r=await run({failEvidence:true}),result=await r.execute();
  assert.equal(result.preservedAll,true);assert.equal(result.qualityStatus,'limited');assert.equal(result.verification.status,'not-run');assert.match(result.preservedRanges[0].reason,/capture unavailable/);
  assert.equal(r.state().applies,0);assert.equal(r.state().calls,0);
 });
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
 await t.test('blocked, wrong-target and invalid plans never reach application and keep the existing framing',async()=>{
  for(const report of [{...valid,draftId:'x'},{draftId:'d',status:'blocked'},{...valid,shots:[]},{...valid,shots:[{...shot,endFrame:80}]}]){const r=await run({report}),result=await r.execute();assert.equal(result.preservedAll,true);assert.equal(result.qualityStatus,'limited');assert.equal(r.state().applies,0);}
 });
 await t.test('completion reports geometry checks without claiming visual verification',async()=>{
  const r=await run();const result=await r.execute();assert.equal(result.visualReview.status,'not-run');assert.equal(result.verification.kind,'geometry-and-timing');assert.equal(result.verifiedFrames,undefined);
 });
});
