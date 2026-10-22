'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('agent composition plans deliver the clip when one composition is unusable',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild'),m={exports:{}};
 const src=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 new Function('require','module','exports',esbuild.transformSync(src+'\nexport {runAgentReframing,sourceCompositionAdapter,sourceCompositionPrompt,salvageSourceComposition,resolveSourceComposition,sourceCropApplyScript,DraftResultCard,STRINGS,RESULT_STRINGS};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 const renderCard=report=>dep('react-dom/server').renderToStaticMarkup(dep('react').createElement(m.exports.DraftResultCard,{
  draft:{draftId:'d',headline1:'Test',seconds:3,reframeState:'done',reframeReport:report},
  current:false,opening:null,onOpen:()=>{},ui:{},S:m.exports.STRINGS.ko,R:m.exports.RESULT_STRINGS.ko,sdk:{},store:{},busy:false,
 }));
 const baseline={meta:{durationFrames:90,fps:30,frameSize:{width:1080,height:1920}},words:[{text:'Hello',startFrame:0,endFrame:30,wordId:'w1',sourceResourceId:'r',sourceStartFrame:100,sourceEndFrame:130}],sources:[{resourceId:'r',meta:{frameSize:{width:1920,height:1080}}}]};
 const faces=[
  {id:'F1',resourceId:'r',draftFrame:20,draftStartFrame:0,draftEndFrame:90,box:{xmin:300,xmax:420,ymin:250,ymax:400}},
  {id:'F2',resourceId:'r',draftFrame:20,draftStartFrame:0,draftEndFrame:90,box:{xmin:1500,xmax:1620,ymin:250,ymax:400}},
 ];
 const layout={closeUp:6,faceY:35,windowTop:421,windowBottom:1228,allowedLayouts:['stacked'],splitPolicy:'selective',widePolicy:'never'};
 const evidence=[{startFrame:0,endFrame:90,resourceId:'r',sourceFrames:[0,8,16],subject:'left person',basis:'mouth-motion',evidence:'sustained articulation'}];
 const speaker=(startFrame,endFrame,compositionId,subjectId,ref)=>({startFrame,endFrame,compositionId,layout:'speaker',panels:[{camera:'r',targets:[{subjectId,refs:[ref]}]}]});
 const plan=shots=>({version:1,draftId:'d',status:'planned',shots,speakerEvidence:evidence});
 const missingRefs={startFrame:45,endFrame:90,compositionId:'pair',layout:'stacked',people:[{camera:'r',subjectId:'left',refs:['F1']},{camera:'r',subjectId:'right',refs:[]}]};
 async function run(report,{boundaries=[],previousEdit,failAi=false}={}){
  let applies=0,prompt='';const notes=[],applied=[];
  const sdk={
   runScript:async input=>{
    if(input.summary==='Apply agent-selected source crops'){applies++;const shots=JSON.parse(input.script.slice(input.script.indexOf('const shots = ')+14,input.script.indexOf(';\n')));applied.push(shots);return {result:{applied:shots}};}
    return {result:baseline};
   },
   call:async method=>{throw Error('Unexpected analyzed read or preview: '+method);},
   askAI:async input=>{prompt=input.prompt;if(failAi)throw Error('timeout');return {text:JSON.stringify(report)};},
  };
  const execute=()=>m.exports.runAgentReframing({sdk,guard:p=>p,projectId:'p',draftId:'d',layout,previousEdit,note:e=>notes.push(e),
   measureSpeakers:async()=>[],prepareEvidence:async()=>({images:[{dataUrl:'data:image/jpeg;base64,test'}],samples:[],boundaries}),measureFaces:async()=>faces});
  return {execute,state:()=>({applies,prompt,notes,applied})};
 }

 await t.test('a composition whose person has no observed face keeps existing framing while the rest applies',async()=>{
  const r=await run(plan([speaker(0,45,'left-solo','left','F1'),missingRefs]));
  const report=await r.execute();
  assert.equal(report.status,'complete');
  assert.equal(r.state().applies,1);
  assert.equal(report.qualityStatus,'limited');
  assert.equal(report.preservedAll,false);
  assert.match(renderCard(report),/일부 구도 유지/);
  assert.deepEqual(report.appliedShots.map(s=>[s.startFrame,s.endFrame,s.style]),[[0,45,'speaker'],[45,90,'preserve']]);
  const preserved=report.preservedRanges.find(p=>p.startFrame===45&&p.endFrame===90);
  assert.ok(preserved,'the unusable composition is reported as a preserved range');
  assert.match(preserved.reason,/observed face references/);
  assert.ok(r.state().notes.some(n=>n.plan==='composition-preserved'),'the fallback is recorded in the run log');
 });

 await t.test('a plan whose every composition is unusable still delivers the clip with existing framing',async()=>{
  const r=await run(plan([{...missingRefs,startFrame:0,endFrame:45,compositionId:'bad-1'},{...missingRefs,compositionId:'bad-2'}]));
  const report=await r.execute();
  assert.equal(report.status,'complete');
  assert.equal(report.qualityStatus,'limited');
  assert.deepEqual(report.appliedShots.map(s=>s.style),['preserve','preserve']);
  assert.equal(report.preservedAll,true);
  const card=renderCard(report);
  assert.match(card,/기본 구도 유지/);
  assert.doesNotMatch(card,/일부 구도 유지/);
  assert.doesNotMatch(card, /disabled=""/);
 });

 await t.test('one observed face assigned to two people preserves both compositions involved',async()=>{
  const r=await run(plan([speaker(0,45,'a','left','F1'),speaker(45,90,'b','right','F1')]));
  const report=await r.execute();
  assert.equal(report.status,'complete');
  assert.deepEqual(report.appliedShots.map(s=>s.style),['preserve','preserve']);
 });

 await t.test('plan structure errors keep the existing framing for the whole clip',async()=>{
  const gap=plan([speaker(0,30,'left-solo','left','F1'),missingRefs]);
  const r=await run(gap);
  const report=await r.execute();
  assert.equal(report.preservedAll,true);
  assert.deepEqual(report.preservedRanges.map(p=>[p.startFrame,p.endFrame]),[[0,90]]);
  assert.match(report.preservedRanges[0].reason,/composition:time/);
  assert.equal(r.state().applies,0);
  assert.ok(r.state().notes.some(n=>n.plan==='agent-reframe-preserved'));
 });

 await t.test('valid plans apply exactly as before',async()=>{
  const r=await run(plan([speaker(0,45,'left-solo','left','F1'),speaker(45,90,'right-solo','right','F2')]));
  const report=await r.execute();
  assert.equal(report.qualityStatus,'complete');
  assert.equal(report.preservedAll,false);
  assert.doesNotMatch(renderCard(report),/기본 구도 유지|일부 구도 유지/);
  assert.deepEqual(report.appliedShots.map(s=>s.style),['speaker','speaker']);
  assert.ok(!r.state().notes.some(n=>n.plan==='composition-preserved'));
 });

 await t.test('the strict adapter still rejects an unusable composition',()=>{
  assert.throws(()=>m.exports.sourceCompositionAdapter(plan([speaker(0,45,'left-solo','left','F1'),missingRefs]),baseline.sources,90,layout,faces),/observed face references/);
 });

 await t.test('the prompt states the enforced rules once, lists usable faces and layouts, and puts data last',async()=>{
  const r=await run(plan([speaker(0,45,'left-solo','left','F1'),speaker(45,90,'right-solo','right','F2')]));
  await r.execute();
  const prompt=r.state().prompt,input=prompt.indexOf('## Input');
  assert.ok(input>0,'the input JSON has its own section');
  const instructions=prompt.slice(0,input);
  assert.ok(instructions.length<7000,`instructions stay concise (${instructions.length} chars)`);
  for(const section of ['## Tools','## Priorities','## Reading the evidence','## Composing','## Output','## Final check'])assert.ok(instructions.includes(section),section);
  assert.ok(!prompt.includes('containing EVERY person to preserve'),'the contradictory every-person rule is gone');
  assert.match(instructions,/non-empty refs from observedRefs/);
  assert.match(instructions,/Leave out a person you cannot cite/);
  assert.match(instructions,/keeps the existing framing for the whole clip/);
  assert.ok(prompt.slice(input).includes('"observedRefs":{"r":["F1","F2"]}'),'observed face IDs are listed per camera');
  assert.ok(prompt.slice(input).includes('"layouts":["speaker","stacked","two-shot","insert"]'),'wide is not offered when the template forbids it');
  assert.match(instructions,/Layouts this template allows \(use no other\): speaker = one panel with one person; stacked = 2 panels, top and bottom; two-shot = [^;]+; insert = a non-person area[^.]*\./);
 });
 await t.test('layouts the template does not allow are not described at all',()=>{
  const prompt=m.exports.sourceCompositionPrompt({draftId:'d',layout:{...layout,splitPolicy:'never',widePolicy:'never'},sources:baseline.sources,duration:90,input:'{}'});
  const instructions=prompt.slice(0,prompt.indexOf('## Input'));
  for(const word of ['stacked','side-by-side','columns-3','grid-4','shot.people','people:[','Grouping',' split','wide'])assert.ok(!instructions.includes(word),`no mention of ${word}`);
  assert.match(instructions,/speaker = one panel with one person/);
  const splits=m.exports.sourceCompositionPrompt({draftId:'d',layout:{...layout,allowedLayouts:['stacked','grid-4'],widePolicy:'essential'},sources:baseline.sources,duration:90,input:'{}'});
  for(const word of ['stacked','grid-4','shot.people','wide = the whole source frame'])assert.ok(splits.includes(word),`describes ${word}`);
  assert.ok(!splits.includes('columns-3'),'only the allowed splits are described');
 });
 await t.test('only layouts the template settings can offer reach the agent',()=>{
  const prompt=m.exports.sourceCompositionPrompt({draftId:'d',layout:{...layout,allowedLayouts:['stacked','top-main-3','left-main-3']},sources:baseline.sources,duration:90,input:'{}'});
  assert.ok(prompt.includes('stacked'));
  assert.ok(!prompt.includes('top-main-3')&&!prompt.includes('left-main-3'));
 });

 await t.test('non-person shots are called insert, and saved detail plans still apply',async()=>{
  const prompt=m.exports.sourceCompositionPrompt({draftId:'d',layout,sources:baseline.sources,duration:90,input:'{}'});
  assert.match(prompt,/insert = a non-person area/);
  assert.ok(!/\bdetail\b/.test(prompt.slice(0,prompt.indexOf('## Input'))),'the old name is gone from the instructions');
  const region={x:0.4,y:0.2,width:0.2,height:0.3};
  for(const name of ['insert','detail']){
   const r=await run(plan([speaker(0,45,'left-solo','left','F1'),{startFrame:45,endFrame:90,compositionId:'map',layout:name,panels:[{camera:'r',targets:[],region}]}]));
   const report=await r.execute();
   assert.equal(report.qualityStatus,'complete',name);
   assert.deepEqual(report.appliedShots.map(s=>s.style),['speaker','insert'],name);
  }
 });

 await t.test('the agent is told how two-shot and automatic grouping count people',()=>{
  const prompt=m.exports.sourceCompositionPrompt({draftId:'d',layout,sources:baseline.sources,duration:90,input:'{}'});
  assert.match(prompt,/two-shot = one panel with two people/);
  assert.match(prompt,/at least as many people as the layout has panels/);
 });

 await t.test('small gaps between agent shots are closed in code',async()=>{
  const r=await run(plan([speaker(0,44,'left-solo','left','F1'),speaker(46,89,'right-solo','right','F2')]));
  const report=await r.execute();
  assert.equal(report.qualityStatus,'complete');
  assert.deepEqual(report.appliedShots.map(s=>[s.startFrame,s.endFrame]),[[0,44],[44,90]]);
  assert.ok(r.state().notes.some(n=>n.plan==='shot-boundaries-snapped'));
 });

 await t.test('source cut candidates arrive already converted to Draft frames',async()=>{
  const r=await run(plan([speaker(0,45,'left-solo','left','F1'),speaker(45,90,'right-solo','right','F2')]),{boundaries:[{resourceId:'r',lastOldSourceFrame:114,firstNewSourceFrame:115,kind:'appearance-change'}]});
  await r.execute();
  assert.ok(r.state().prompt.includes('"firstNewDraftFrame":15'));
  assert.match(r.state().prompt,/firstNewDraftFrame/);
 });
 await t.test('keeping the existing framing also keeps manually locked shots for the next regeneration',async()=>{
  const locked={startFrame:0,endFrame:45,compositionId:'manual-0-45',layout:'speaker',panels:[{camera:'r',targets:[{subjectId:'left',refs:['F1']}]}],locked:true};
  const previousEdit={kind:'source',duration:90,layout,catalog:faces,
   plan:{version:1,draftId:'d',status:'planned',shots:[locked,speaker(45,90,'right-solo','right','F2')]},
   appliedShots:[{...locked,style:'speaker',resourceId:'r',autoFrame:true},{startFrame:45,endFrame:90,compositionId:'right-solo',style:'speaker',resourceId:'r',autoFrame:true}]};
  const r=await run(plan([]),{previousEdit,failAi:true});
  const report=await r.execute();
  assert.equal(r.state().applies,0);
  assert.deepEqual(report.appliedShots.map(s=>[s.startFrame,s.endFrame,s.style,!!s.locked]),[[0,45,'speaker',true],[45,90,'preserve',false]]);
  assert.ok(report.editContext.plan.shots.some(s=>s.locked&&s.startFrame===0&&s.endFrame===45),'the lock survives in the saved edit context');
  assert.ok(report.editContext.appliedShots.some(s=>s.locked),'applied locked framing is kept');
  assert.deepEqual(report.preservedRanges.map(p=>[p.startFrame,p.endFrame]),[[45,90]]);
  assert.equal(report.preservedAll,false);
 });

 await t.test('a kept range in a multi-source Draft does not guess its source and applies cleanly',async()=>{
  const sources=[{resourceId:'a',meta:{fps:30,frameSize:{width:1920,height:1080}}},{resourceId:'b',meta:{fps:30,frameSize:{width:1920,height:1080}}}];
  const catalog=[{id:'FA',resourceId:'a',draftFrame:10,draftStartFrame:0,draftEndFrame:45,box:{xmin:800,xmax:1000,ymin:250,ymax:500}}];
  const bad={version:1,draftId:'d',status:'planned',shots:[{startFrame:0,endFrame:45,compositionId:'a1',layout:'speaker',panels:[{camera:'a',targets:[{subjectId:'host',refs:['FA']}]}]},{startFrame:45,endFrame:90,compositionId:'b1',layout:'speaker',panels:[{camera:'unknown',targets:[{subjectId:'guest',refs:['FB']}]}]}]};
  const salvaged=m.exports.salvageSourceComposition(bad,sources,90,layout,catalog);
  assert.equal(salvaged.preserved.length,1);
  const resolved=m.exports.resolveSourceComposition(salvaged.plan.shots,catalog,sources,90,layout);
  const script=m.exports.sourceCropApplyScript('p','d',layout,sources,90).replace('__SHOTS__',JSON.stringify(resolved.shots));
  const clips=[{clipId:'c1',trackId:'t',resourceId:'a',startFrame:0,endFrame:45},{clipId:'c2',trackId:'t',resourceId:'b',startFrame:45,endFrame:90}];
  const touched=[];let committed=false;
  const draft={meta:async()=>({durationFrames:90}),clips:async()=>clips,splitAt:async()=>{},setClipTransform:async({clip})=>touched.push(clip.clipId),videoEffects:async()=>[],addVideoEffect:async({clip})=>touched.push(clip.clipId),replaceVideoEffect:async()=>{},commitAll:async()=>{committed=true;}};
  const project={meta:async()=>({draftIds:['d']}),resource:id=>({rangeAtFrames:async()=>({resourceId:id})}),sourceFiles:async()=>({fileTree:[]})};
  const code=esbuild.transformSync('return (async()=>{'+script+'})();',{loader:'ts'}).code;
  await new Function('selects',code)({project:()=>project,draft:()=>draft});
  assert.ok(committed);
  assert.ok(!touched.includes('c2'),'the kept range is left untouched');
 });
});
