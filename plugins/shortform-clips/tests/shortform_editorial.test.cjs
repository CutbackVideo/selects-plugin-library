'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const modulesRoot=process.env.SBS_PANEL_TEST_MODULES;

test('speech-aligned editorial placements',{skip:!modulesRoot && 'Set SBS_PANEL_TEST_MODULES'},async t=>{
  const dep=createRequire(path.resolve(modulesRoot,'../package.json'));
  const esbuild=dep('esbuild');
  const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
  const loaded={exports:{}};
  new Function('require','module','exports',esbuild.transformSync(source+'\nexport {sceneVision,editorialPrompt,parseEditorialPlan,editorialFrames,SCRIPT_EDITORIAL,validateTemplate,parseSceneStudy,validateSceneDraft,sceneStudyPrompt,sceneBuildPrompt,buildSceneDraft,sceneCaptionScript};',{loader:'tsx',format:'cjs'}).code)(dep,loaded,loaded.exports);
  const api=loaded.exports;
  const assets=[{name:'patient.png',type:'Image'},{name:'pop.wav',type:'Audio',durationSeconds:.3}];
  const lines=[[10,11,'\uc7a5\uc560\uc778 \uadf8\ub9ac\uace0'],[11,12,'\uac10\uc5fc\ubcd1 \ud658\uc790'],[12,14,'\uc57d\uc744 \ubc30\uc1a1\ud569\ub2c8\ub2e4']];
  const image=(start=10,slot=0)=>({kind:'image',startSeconds:start,endSeconds:13,anchor:start===10?'\uc7a5\uc560\uc778':'\uac10\uc5fc\ubcd1',reason:'Introduce the named group',observed:'An illustrated patient',resourceName:'patient.png',slot});
  const parse=events=>api.parseEditorialPlan({events},[[10,14]],lines,assets);
  await t.test('keeps incremental lists and speech evidence',()=>{
    const timing=[[10,10.5,'first'],[10.5,11,'second']];
    assert.ok(api.editorialPrompt({wordTimes:timing}).includes(JSON.stringify(timing)));
    assert.match(api.editorialPrompt({}),/exact starts for individual list items/);
    assert.equal(parse([image(),image(11,1)]).length,2);
    assert.equal(parse([]).length,0);
    assert.equal(parse([image()])[0].reason,'Introduce the named group');
  });
  await t.test('rejects hallucinated assets, off-source times, unsupported anchors and occlusion',()=>{
    for(const patch of [{resourceName:'invented.png'},{startSeconds:0},{endSeconds:15},{startSeconds:'10'},{anchor:'\ubb34\ub8cc \ubc30\uc1a1'},{observed:''},{slot:4},{kind:'background'}]) assert.throws(()=>parse([{...image(),...patch}]));
    assert.throws(()=>parse([image(),image(11,0)]));
    assert.throws(()=>parse([image(),{kind:'quote',text:'\ud658\uc790 \ub300\uc0c1',startSeconds:11,endSeconds:12,anchor:'\uac10\uc5fc\ubcd1',reason:'Evidence'}]));
    assert.throws(()=>api.parseEditorialPlan({events:[image()]},[[10,14]],lines,[...assets,assets[0]]));
  });
  await t.test('limits SFX to existing source duration and meaningful spacing',()=>{
    const sound={kind:'sfx',startSeconds:10,endSeconds:10.2,anchor:'\uc7a5\uc560\uc778',reason:'List reveal',resourceName:'pop.wav'};
    assert.equal(parse([image(),sound]).length,2);
    assert.throws(()=>parse([{...sound,endSeconds:11}]));
    assert.throws(()=>parse([sound,{...sound,startSeconds:11,endSeconds:11.2,anchor:'\uac10\uc5fc\ubcd1'}]));
  });
  await t.test('maps source seconds through trimmed Draft words without using stale frames',()=>{
    const words=[{startFrame:0,endFrame:15,sourceStartFrame:300},{startFrame:15,endFrame:30,sourceStartFrame:330},{startFrame:30,endFrame:50,sourceStartFrame:360}];
    assert.deepEqual(api.editorialFrames(image(),words,30,40),[0,40]);
    assert.deepEqual(api.editorialFrames(image(11,1),words,30,50),[15,50]);
    assert.throws(()=>api.editorialFrames(image(),words.slice(1),30,50));
    assert.throws(()=>api.editorialFrames(image(),[],30,50));
  });
  await t.test('render script is syntactically valid and only spliced for opted-in templates',()=>{
    esbuild.transformSync('async function render(){'+api.SCRIPT_EDITORIAL+'}',{loader:'ts'});
    assert.match(source,/tpl\.editorial \? SCRIPT_BUILD\.replace\(marker,SCRIPT_EDITORIAL \+ marker\) : SCRIPT_BUILD/);
    assert.match(source,/c\.editorialEvents=parseEditorialPlan/);
    assert.match(source,/if \(c\.editorialEvents\) continue/);
    assert.match(api.editorialPrompt({instructions:'RULE',assets:[]}),/filenames alone are not visual evidence/);
    const tpl=JSON.parse(fs.readFileSync(path.join(__dirname,'../template-packs/hankook-ilbo/templates/huick-alpha.json')));
    assert.equal(api.validateTemplate(tpl).names.ko,'\ud719\uc54c\ud30c');
    assert.throws(()=>api.validateTemplate({...tpl,editorial:{instructions:'Legacy slots'},layout:{...tpl.layout,windowTop:0}}));
  });
  await t.test('scene plans share caption disclosure anchors and preserve source evidence',()=>{
    const inventory=[{name:'camera.mov',type:'Video',durationSeconds:20}];
    const words={'camera.mov':[[10,10.8,'\uccab\uc9f8'],[11,11.8,'\ub458\uc9f8']]};
    const beat={resourceName:'camera.mov',startSeconds:10,endSeconds:12,kind:'speech',anchor:'\uccab\uc9f8',intent:'explanation',focus:'list',composition:'Add each item and retain the set',assets:[],captions:[{startSeconds:10,endSeconds:11,text:'\uccab\uc9f8'},{startSeconds:11,endSeconds:12,text:'\ub458\uc9f8'}],disclosures:[{sourceSeconds:11,anchor:'\ub458\uc9f8',token:'\ub458\uc9f8'}]};
    const plan={episode:'Two speakers explaining a list',sourceReview:[{resourceName:'camera.mov',role:'actor',observed:'Speaking to the other actor',excluded:[]}],assetReview:[],clips:[{headline1:'List',headline2:'',beats:[beat]}]};
    const parse=x=>api.parseSceneStudy(x,inventory,1,words);
    assert.equal(parse(plan).clips.length,1);
    for(const baseline of [299,1721,800.5,'1000',null]){const bad=structuredClone(plan);bad.clips[0].beats[0].captionBottom=baseline;assert.throws(()=>parse(bad),/caption baseline/);}
    const positioned=structuredClone(plan);positioned.clips[0].beats[0].captionBottom=1200;assert.equal(parse(positioned).clips[0].beats[0].captionBottom,1200);
    const early=structuredClone(plan);early.clips[0].beats[0].captions=[{startSeconds:10,endSeconds:12,text:'\uccab\uc9f8 \ub458\uc9f8'}];const before=JSON.stringify(early);assert.equal(parse(early),early);assert.equal(JSON.stringify(early),before);
    const fake=structuredClone(plan);fake.clips[0].beats[0].captions[0].text='invented';assert.throws(()=>parse(fake),/clip 1 beat 1 caption 1: caption is not verbatim/);
    const wrong=structuredClone(plan);wrong.clips[0].beats[0].disclosures[0].sourceSeconds=10;assert.throws(()=>parse(wrong));
    const excluded=structuredClone(plan);excluded.sourceReview[0].excluded=[{startSeconds:10,endSeconds:11,reason:'director'}];assert.throws(()=>parse(excluded));
    const overlap=structuredClone(plan);overlap.clips[0].beats.push(beat);assert.throws(()=>parse(overlap));
    const clip=plan.clips[0];
    const result={draftId:'draft',name:'name',warnings:[],verifiedFrames:[0]};
    const actual={owned:true,meta:{name:'name',durationSeconds:2,durationFrames:60,fps:30,frameSize:{width:1080,height:1920}},visualLayers:3,graphics:[{name:'HA caption 0:0',startFrame:0,endFrame:30,text:'\uccab\uc9f8'},{name:'HA caption 0:1',startFrame:30,endFrame:60,text:'\ub458\uc9f8'}]};
    assert.equal(api.validateSceneDraft(result,actual,clip,'name').draftId,'draft');
    assert.throws(()=>api.validateSceneDraft(result,actual,positioned.clips[0],'name'));
    const withBottom={...actual,graphics:actual.graphics.map(g=>({...g,bottom:1200}))};assert.equal(api.validateSceneDraft(result,withBottom,positioned.clips[0],'name').draftId,'draft');
    const bar={...withBottom,graphics:withBottom.graphics.map(g=>({...g,mode:'bar',height:180,top:1020}))};assert.equal(api.validateSceneDraft(result,bar,positioned.clips[0],'name').draftId,'draft');bar.graphics[0].top=1720;assert.throws(()=>api.validateSceneDraft(result,bar,positioned.clips[0],'name'));
    const premature=structuredClone(actual);premature.graphics[1].startFrame=0;assert.throws(()=>api.validateSceneDraft(result,premature,clip,'name'));
    assert.throws(()=>api.validateSceneDraft(result,{...actual,owned:false},clip,'name'));
    assert.match(api.sceneStudyPrompt({brief:'Keep the question'}),/Keep the question/);
    const repair=api.sceneStudyPrompt({previousAttempt:fake,validationError:'caption is not verbatim',sourceWords:words});
    assert.ok(repair.includes(JSON.stringify(words)) && repair.includes(JSON.stringify(fake)));
    assert.match(repair,/Repair the previous inspected plan/);
    assert.match(api.sceneBuildPrompt({brief:'No personification'}),/No personification/);
  });
  await t.test('scene prompts use only the selected template instructions and preserve episode context',()=>{
    const context={projectId:'project',brief:'Keep this episode question',sourceName:'camera.mov',sourceWords:{'camera.mov':[[10,11,'\uc6d0\ubb38']]},sourceReview:[{resourceName:'camera.mov',observed:'Two speakers looking at each other'}],assetReview:[{resourceName:'evidence.png',observed:'Dated source document'}],headlineDefaults:{font:'Template Headline',size1:77,color1:'#102030'},captionDefaults:{font:'Template Caption',fontSize:61},clip:{name:'episode',beats:[]}};
    for(const prompt of [api.sceneStudyPrompt,api.sceneBuildPrompt])for(const instructions of ['TEMPLATE_A_ROLE_RULE','TEMPLATE_B_EVIDENCE_RULE']){
      const input={...structuredClone(context),instructions},before=structuredClone(input),text=prompt(input);
      assert.equal(text.split(instructions).length-1,1);
      assert.ok(!text.includes(instructions.startsWith('TEMPLATE_A')?'TEMPLATE_B_EVIDENCE_RULE':'TEMPLATE_A_ROLE_RULE'));
      assert.doesNotMatch(text,/Huick\s*Alpha|\ud719\uc54c\ud30c/i);
      assert.deepEqual(JSON.parse(text.slice(text.lastIndexOf('\n')+1)),context);
      assert.deepEqual(input,before);
    }
  });
  await t.test('spelling evidence applies to one selected source occurrence without mutating words or timing',()=>{
    const inventory=[{name:'camera.mov',type:'Video',durationSeconds:20}],words={'camera.mov':[[10,10.8,'\ud72b'],[11,11.8,'\ud72b']]};
    const correction={resourceName:'camera.mov',sourceSeconds:10,original:'\ud72b',corrected:'\ud719',evidence:{source:'/provided/script.txt',quote:'\ud719 \uce5c\uad6c\ub4e4\uc740'}};
    const plan={episode:'A question',sourceReview:[{resourceName:'camera.mov',role:'actor',observed:'Script-backed spelling',excluded:[]}],assetReview:[],transcriptCorrections:[correction],clips:[{headline1:'Topic',headline2:'',beats:[{resourceName:'camera.mov',startSeconds:10,endSeconds:12,kind:'speech',anchor:'\ud719',intent:'question',focus:'face',composition:'Readable face and caption',assets:[],captions:[{startSeconds:10,endSeconds:11,text:'\ud719'},{startSeconds:11,endSeconds:12,text:'\ud72b'}],disclosures:[{sourceSeconds:10,anchor:'\ud719',token:'\ud719'}]}]}]};
    const before=structuredClone(words);assert.equal(api.parseSceneStudy(plan,inventory,1,words),plan);assert.deepEqual(words,before);
    const originalAnchors=structuredClone(plan);originalAnchors.clips[0].beats[0].anchor='\ud72b';originalAnchors.clips[0].beats[0].disclosures[0].anchor='\ud72b';assert.equal(api.parseSceneStudy(originalAnchors,inventory,1,words),originalAnchors);
    const wrongTime=structuredClone(plan);wrongTime.clips[0].beats[0].disclosures[0].sourceSeconds=11;assert.throws(()=>api.parseSceneStudy(wrongTime,inventory,1,words),/disclosure anchor/);
    for(const patch of [{sourceSeconds:9},{original:'different'},{corrected:'\ud719 \uce5c\uad6c\ub4e4'},{evidence:null},{evidence:{source:'',quote:'\ud719'}},{evidence:{source:'script',quote:'unrelated'}}]){const bad=structuredClone(plan);Object.assign(bad.transcriptCorrections[0],patch);assert.throws(()=>api.parseSceneStudy(bad,inventory,1,words),/transcript correction/);}
    const duplicate=structuredClone(plan);duplicate.transcriptCorrections.push(correction);assert.throws(()=>api.parseSceneStudy(duplicate,inventory,1,words),/duplicated/);
    const outside=structuredClone(plan);outside.clips[0].beats[0].startSeconds=10.9;assert.throws(()=>api.parseSceneStudy(outside,inventory,1,words),/outside selected/);
    const unscoped=structuredClone(plan);unscoped.clips[0].beats[0].captions[1].text='\ud719';assert.throws(()=>api.parseSceneStudy(unscoped,inventory,1,words),/not verbatim/);
    const fabricated=structuredClone(plan);delete fabricated.transcriptCorrections;assert.throws(()=>api.parseSceneStudy(fabricated,inventory,1,words));
    const changedNumber=structuredClone(plan);Object.assign(changedNumber.transcriptCorrections[0],{original:'12\uc6d4',corrected:'11\uc6d4',evidence:{source:'script',quote:'11\uc6d4'}});assert.throws(()=>api.parseSceneStudy(changedNumber,inventory,1,{'camera.mov':[[10,10.8,'12\uc6d4'],[11,11.8,'\ud72b']]}),/cannot change numbers/);
  });
  await t.test('both planning paths expose the same source-backed correction contract',()=>{
    const contracts=[false,true].map(bounded=>{
      const text=api.sceneStudyPrompt({bounded,instructions:'Selected template',brandLogo:{provided:true,name:'Configured brand'}});
      const contract=text.match(/If an ASR word is misspelled,[\s\S]*?Never modify Project transcription or an existing Draft in planning\./)?.[0];
      assert.ok(contract);
      assert.match(contract,/configured brand identity/);
      assert.match(contract,/within the selected source intervals/);
      assert.match(contract,/transcriptCorrections:\[\{resourceName,sourceSeconds,original,corrected,evidence:\{source,quote\}\}\]/);
      assert.match(contract,/Uncertain spelling alone is not a reason to cut meaningful dialogue/);
      assert.match(contract,/Do not rewrite grammar/);
      return contract;
    });
    assert.equal(contracts[0],contracts[1]);
  });
  await t.test('bounded planning condenses prose without reducing evidence or changing exact clocks',()=>{
    const input={bounded:true,instructions:'Unique editorial rule',sourceEvidence:[{name:'camera.mov',sourceWords:[[2/30,1001/3000,'word']]}],captionDefaults:{bottom:1404}};
    const before=JSON.stringify(input),prompt=api.sceneStudyPrompt(input);
    assert.match(prompt,/Record shared cast roles, setting and recurring production treatment once in episode/);
    assert.match(prompt,/concrete changes, elements that continue, and exact source-time entrances, exits and holds/);
    assert.match(prompt,/Preserve every direction needed to implement the complete confirmed plan without guessing/);
    assert.match(prompt,/Review all visible original-image candidates/);
    assert.match(prompt,/one concise sentence[\s\S]*necessary uncertainty or inspection limitations/);
    assert.match(prompt,/Preserve sourceReview.excluded ranges and their source-backed reasons/);
    assert.match(prompt,/never omit a candidate review or material uncertainty to shorten the plan/);
    assert.match(prompt,/Preserve exact speech and word timing/);
    assert.deepEqual(JSON.parse(prompt.slice(prompt.lastIndexOf('\n')+1)).sourceEvidence,input.sourceEvidence);
    assert.equal(prompt.split(input.instructions).length-1,1);
    assert.equal(JSON.stringify(input),before);
    const row=prompt.split('\n').find(line=>line.startsWith('Return {'));
    const schema=JSON.parse(row.slice(row.indexOf('{'),row.lastIndexOf('}')+1));
    assert.ok(schema.sourceReview[0].excluded);
    assert.ok(schema.assetReview[0].observed);
    assert.ok(schema.clips[0].beats[0].captions);
    assert.ok(schema.clips[0].beats[0].disclosures);
    assert.doesNotMatch(api.sceneStudyPrompt({...input,bounded:false}),/one concise sentence/);
  });
  await t.test('scene planning and production carry the selected headline guide and caption position',()=>{
    const guide='One persistent topic line; scene questions are timed separately.';
    for(const bounded of [false,true])for(const bottom of [1404,1520]){
      const input={bounded,instructions:'Editorial',headlineGuide:guide,captionDefaults:{bottom}};
      const prompt=api.sceneStudyPrompt(input),row=prompt.split('\n').find(line=>/^(Return|Output) \{/.test(line));
      const schema=JSON.parse(row.slice(row.indexOf('{'),row.lastIndexOf('}')+1));
      assert.equal(schema.clips[0].beats[0].captionBottom,bottom);
      assert.match(schema.clips[0].headline2,/optional/);
      assert.match(prompt,/leave headline2 empty when the template calls for one line/);
      assert.equal(JSON.parse(prompt.slice(prompt.lastIndexOf('\n')+1)).headlineGuide,guide);
      assert.equal(prompt.includes('"captionBottom":1610'),false);
      const build=api.sceneBuildPrompt(input);
      assert.match(build,/headlineGuide/);
      assert.equal(JSON.parse(build.slice(build.lastIndexOf('\n')+1)).headlineGuide,guide);
    }
    const ts=dep('typescript'),sf=ts.createSourceFile('panel.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),inputs=[];
    function visit(node){
      if(ts.isVariableDeclaration(node)&&node.name.getText(sf)==='input'&&node.initializer&&ts.isObjectLiteralExpression(node.initializer)){
        const props=new Map(node.initializer.properties.filter(ts.isPropertyAssignment).map(p=>[p.name.getText(sf),p.initializer]));
        if(props.get('instructions')?.getText(sf)==='tpl.editorial.instructions'&&props.has('headlineDefaults'))inputs.push(props);
      }
      ts.forEachChild(node,visit);
    }
    visit(sf);
    assert.equal(inputs.length,4);
    for(const props of inputs)assert.equal(props.get('headlineGuide')?.getText(sf),'tpl.prompt.headline');
  });
  await t.test('planning repairs validation failures automatically and preserves bounded Resume evidence',async()=>{
    const inventory=[{name:'camera.mov',type:'Video',durationSeconds:20}],words={'camera.mov':[[10,11,'\uc6d0\ubb38']]};
    const plan={episode:'Human questioner and explainer',sourceReview:[{resourceName:'camera.mov',role:'actor',observed:'Inspected action',excluded:[]}],assetReview:[],clips:[{headline1:'Topic',headline2:'',beats:[{resourceName:'camera.mov',startSeconds:10,endSeconds:12,kind:'speech',anchor:'\uc6d0\ubb38',intent:'explanation',focus:'face',composition:'Large face above caption',assets:[],captions:[{startSeconds:10,endSeconds:12,text:'\uc6d0\ubb38'}],disclosures:[]}]}]};
    const bad=structuredClone(plan);bad.clips[0].beats[0].captions[0].text='invented';
    const start=source.indexOf('        if(!job.sceneStudy) {'),end=source.indexOf('        const study=job.sceneStudy',start);
    assert.ok(start>0 && end>start);
    const code=`async function execute(job,responses,api,guardError,scriptError){const {sceneStudyPrompt,parseSceneStudy}=api;const projectId='project',tpl={editorial:{instructions:'Shared rules'},prompt:{lengthGuide:'Full episode'},headline:{font:'Selected Headline',color1:'#123456'}},vision=api.sceneVision(tpl,[]),lang='ko',S={},prompts=[];const sdk={askAI:async input=>{prompts.push(input.prompt);const response=responses[Math.min(prompts.length-1,responses.length-1)];if(response instanceof Error)throw response;return {text:JSON.stringify(response)};}},guard=p=>guardError?p.then(()=>{throw guardError;}):p,extractJson=JSON.parse,nameOf=()=> 'Huick Alpha',script=async(_code,title)=>{if(title==='Read episode inventory')return ${JSON.stringify(inventory)};if(scriptError)throw scriptError;return ${JSON.stringify(words)};},persist=async patch=>{job={...job,...patch};};try{${source.slice(start,end)}return {job,prompts};}catch(error){return {job,prompts,error};}}`;
    const run=new Function(esbuild.transformSync(code,{loader:'ts'}).code+';return execute;')();
    const initial={id:'job',countMode:'manual',count:1,resourceName:'camera.mov',note:''};
    const repaired=await run(initial,[bad,plan],api);
    assert.equal(repaired.error,undefined);assert.equal(repaired.prompts.length,2);
    for(const prompt of repaired.prompts)assert.deepEqual(JSON.parse(prompt.slice(prompt.lastIndexOf('\n')+1)).headlineDefaults,{font:'Selected Headline',color1:'#123456'});
    assert.match(repaired.prompts[1],/Repair the previous inspected plan/);
    assert.ok(repaired.prompts[1].includes(JSON.stringify(bad)) && repaired.prompts[1].includes(JSON.stringify(words)));
    assert.equal(repaired.job.sceneAttempt,null);assert.equal(repaired.job.sceneWords,null);assert.equal(repaired.job.sceneError,'');
    assert.equal(repaired.job.sceneStudy.clips[0].beats[0].captions[0].text,'\uc6d0\ubb38');
    const lastBad=structuredClone(bad);lastBad.clips[0].beats[0].captions[0].text='last invalid';
    const rejected=await run(initial,[bad,bad,lastBad],api);
    assert.match(rejected.error.message,/caption is not verbatim/);assert.equal(rejected.prompts.length,3);
    assert.deepEqual(rejected.job.sceneAttempt,lastBad);
    assert.match(rejected.job.sceneError,/last invalid/);
    assert.deepEqual(rejected.job.sceneWords,words);assert.ok(!rejected.job.sceneStudy);
    const resumed=await run(rejected.job,[plan],api);
    assert.equal(resumed.error,undefined);assert.equal(resumed.prompts.length,1);
    assert.ok(resumed.prompts[0].includes(JSON.stringify(lastBad)));
    const unavailable=new Error('SDK unavailable'),cancelled=new Error('Run cancelled'),sourceError=new Error('Missing source');
    for(const [responses,guardError,scriptError,expected] of [[[unavailable],null,null,unavailable],[[plan],cancelled,null,cancelled],[[plan],null,sourceError,sourceError]]) {
      const stopped=await run(initial,responses,api,guardError,scriptError);
      assert.equal(stopped.error,expected);assert.equal(stopped.prompts.length,1);assert.ok(!stopped.job.sceneStudy);
    }
  });
  await t.test('scene construction continues saved progress, stops stalls and bounds retries',async()=>{
    let revision=0,calls=0;const saved=[],prompts=[];
    const complete={draftId:'draft',name:'name',warnings:[],verifiedFrames:[0]};
    const inputExpression=source.match(/const input=(\{projectId,draftName:clip\.name[^\n]+\});/);assert.ok(inputExpression);
    const headline={font:'Selected Headline',color1:'#123456'};
    const input=new Function('projectId','clip','workDirectory','study','job','tpl','vision','return '+inputExpression[1])('project',{name:'scene'},'/work',{episode:'Concept',sourceReview:[],assetReview:[]},{note:'Episode brief'},{editorial:{instructions:'Selected template'},prompt:{headline:'One topic line'},headline,logo:{},captions:{}},api.sceneVision({},[]));
    const result=await api.buildSceneDraft(input,async prompt=>{prompts.push(prompt);calls++;revision++;return calls===1?{status:'in_progress',nextStep:'Build prepared layers'}:complete;},async()=>String(revision),async p=>saved.push(p));
    assert.deepEqual(result,complete);assert.equal(calls,2);assert.equal(saved.length,1);
    for(const prompt of prompts)assert.deepEqual(JSON.parse(prompt.slice(prompt.lastIndexOf('\n')+1)).headlineDefaults,headline);
    assert.ok(prompts[1].includes('"previousProgress":{"status":"in_progress"'));
    await assert.rejects(()=>api.buildSceneDraft({},async()=>({status:'in_progress',nextStep:'Still pending'}),async()=> 'same',async()=>{}),/without updating/);
    await assert.rejects(()=>api.buildSceneDraft({},async()=>({status:'in_progress'}),async()=> 'same',async()=>{}),/no concrete next step/);
    calls=0;revision=0;
    await assert.rejects(()=>api.buildSceneDraft({},async()=>{calls++;revision++;return {status:'in_progress',nextStep:'Next batch'};},async()=>String(revision),async()=>{}),/continuation limit/);
    assert.equal(calls,8);
    const error={error:'Missing original'};
    assert.deepEqual(await api.buildSceneDraft({},async()=>error,async()=>'',async()=>assert.fail('Error must not continue')),error);
  });
  await t.test('scene turn timeout resumes only durable progress and preserves other failures',async()=>{
    const timeout=new Error('Selects AI did not finish within 600000ms. Progress is saved; press Resume to continue.');
    let revision=0,calls=0;const saved=[];
    const complete={draftId:'draft',name:'name',warnings:[],verifiedFrames:[0]};
    assert.deepEqual(await api.buildSceneDraft({},async prompt=>{calls++;if(calls===1){revision++;throw timeout;}assert.match(prompt,/same Draft/);return complete;},async()=>String(revision),async p=>saved.push(p)),complete);
    assert.equal(calls,2);assert.equal(saved.length,1);
    await assert.rejects(()=>api.buildSceneDraft({},async()=>{throw timeout;},async()=> 'same',async()=>assert.fail('No saved progress')),e=>e===timeout);
    const unavailable=new Error('Original media unavailable');
    await assert.rejects(()=>api.buildSceneDraft({},async()=>{revision++;throw unavailable;},async()=>String(revision),async()=>assert.fail('Do not retry arbitrary failures')),e=>e===unavailable);
  });
  await t.test('host captions follow actual beat frames and resume without duplication',async()=>{
    const tpl=JSON.parse(fs.readFileSync(path.join(__dirname,'../template-packs/hankook-ilbo/templates/huick-alpha.json')));
    Object.assign(tpl.captions,{font:'Selected Caption Font',fontSize:61,fontWeight:600,boxColor:'#102030',color:'#FAFAFA',bottom:1490,barHeight:164});
    const clip={name:'scene',beats:[{startSeconds:10,endSeconds:12,captions:[{startSeconds:10,endSeconds:11,text:'\uccab\uc9f8'},{startSeconds:11,endSeconds:12,text:'\ub458\uc9f8'}]},{startSeconds:20,endSeconds:22,captionBottom:1200,captions:[{startSeconds:20,endSeconds:22,text:'\ub9c8\uc9c0\ub9c9'}]}]};
    const graphics=[];let commits=0,owned=true;
    const d={meta:async()=>({name:'scene',fps:30}),clips:async()=>[{startFrame:60,endFrame:120},{startFrame:0,endFrame:60}],motionGraphics:async()=>graphics,motionGraphicProgram:async c=>({parameters:graphics.find(g=>g.clip===c).parameters}),rangeAtFrames:async(a,b)=>({startFrame:a,endFrame:b}),addMotionGraphic:async g=>{assert.match(g.tsxCode,/wordBreak: 'keep-all'/);graphics.push({name:g.label,clip:g.within,parameters:g.parameters});},commitAll:async()=>{commits++;}};
    const selects={project:()=>({meta:async()=>({draftIds:owned?['draft']:[]})}),draft:()=>d};
    const body=api.sceneCaptionScript('project','draft',clip,tpl,{editable:{caption:'Text',size:'Size',font:'Font'}});
    const run=new Function(esbuild.transformSync('async function execute(selects){'+body+'}',{loader:'ts'}).code+';return execute;')();
    assert.deepEqual(await run(selects),{added:3});
    assert.deepEqual(graphics.map(g=>[g.name,g.clip.startFrame,g.clip.endFrame,g.parameters.text]),[['HA caption 0:0',0,30,'\uccab\uc9f8'],['HA caption 0:1',30,60,'\ub458\uc9f8'],['HA caption 1:0',60,120,'\ub9c8\uc9c0\ub9c9']]);
    assert.deepEqual(graphics.map(g=>g.parameters.bottom),[tpl.captions.bottom,tpl.captions.bottom,1200]);
    for(const g of graphics)assert.deepEqual({fontFamily:g.parameters.fontFamily,fontSize:g.parameters.fontSize,fontWeight:g.parameters.fontWeight,boxColor:g.parameters.boxColor,textColor:g.parameters.textColor,mode:g.parameters.mode,height:g.parameters.height},{fontFamily:tpl.captions.font,fontSize:tpl.captions.fontSize,fontWeight:tpl.captions.fontWeight,boxColor:tpl.captions.boxColor,textColor:tpl.captions.color,mode:tpl.captions.mode,height:tpl.captions.barHeight});
    assert.deepEqual(await run(selects),{added:0});assert.equal(commits,1);
    graphics[2].parameters.bottom=1199;await assert.rejects(()=>run(selects),/differs/);graphics[2].parameters.bottom=1200;
    graphics[0].parameters.text='wrong';await assert.rejects(()=>run(selects),/differs/);
    owned=false;await assert.rejects(()=>run(selects),/outside/);assert.equal(commits,1);
    owned=true;graphics.length=0;tpl.captions.mode='bar';
    const barBody=api.sceneCaptionScript('project','draft',clip,tpl,{editable:{caption:'Text',size:'Size',font:'Font'}});
    const runBar=new Function(esbuild.transformSync('async function execute(selects){'+barBody+'}',{loader:'ts'}).code+';return execute;')();
    assert.deepEqual(await runBar(selects),{added:3});
    assert.deepEqual(graphics.map(g=>g.parameters.top),[tpl.layout.windowBottom,tpl.layout.windowBottom,1200-tpl.captions.barHeight]);
    assert.deepEqual(await runBar(selects),{added:0});
    graphics[2].parameters.top=tpl.layout.windowBottom;await assert.rejects(()=>runBar(selects),/differs/);
  });
  await t.test('host captions compile against installed SDK declarations',{skip:!process.env.SBS_PANEL_TEST_SDK},()=>{
    const ts=dep('typescript'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'huick-sdk-check-'));
    try{
      const file=path.join(dir,'caption.ts'),sdk=process.env.SBS_PANEL_TEST_SDK;
      const tpl=JSON.parse(fs.readFileSync(path.join(__dirname,'../template-packs/hankook-ilbo/templates/huick-alpha.json')));
      fs.writeFileSync(file,'async function runtime(){'+api.sceneCaptionScript('project','draft',{name:'scene',beats:[]},tpl,{editable:{caption:'Text',size:'Size',font:'Font'}})+'}');
      const roots=[file,...fs.readdirSync(sdk).filter(n=>n.endsWith('.d.ts')).map(n=>path.join(sdk,n))];
      const program=ts.createProgram(roots,{target:ts.ScriptTarget.ES2022,noEmit:true,skipLibCheck:true});
      const errors=ts.getPreEmitDiagnostics(program).filter(d=>d.file?.fileName===file);
      assert.deepEqual(errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[]);
    }finally{fs.rmSync(dir,{recursive:true,force:true});}
  });
});
