'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const modulesRoot = process.env.SBS_PANEL_TEST_MODULES;

test('field footage selection and Draft generation', {skip: !modulesRoot && 'Set SBS_PANEL_TEST_MODULES'}, async t => {
  const dep = createRequire(path.resolve(modulesRoot,'../package.json'));
  const esbuild = dep('esbuild'), ts = dep('typescript');
  const source = fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
  const ast = ts.createSourceFile('panel.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let params, chooseField;
  function visit(n) {
    if(ts.isVariableDeclaration(n) && n.name.getText(ast)==='P' && ts.isObjectLiteralExpression(n.initializer) && n.initializer.properties.some(p=>p.name?.getText(ast)==='segments')) params=n.initializer.getText(ast);
    if(ts.isFunctionDeclaration(n) && n.name?.text==='chooseFieldClips') chooseField=n.getText(ast);
    ts.forEachChild(n,visit);
  }
  visit(ast);assert.ok(params && chooseField);
  const extra=`
export {SCRIPT_BUILD,RADIO_SCRIPT_BUILD,SCRIPT_FIELD_RANGES,fieldMode,fieldBuildOptions,parseFieldPlan,fieldPlanPrompt,readTemplatePack,forPlatform,STRINGS,RADIO_STRINGS,merge};
export function buildParams(tpl,c,contentMode='field') {
 const projectId='project',job={contentMode,resourceId:'video',title:'Field footage'},name='field-test';
 const transform=cropTransform(tpl.layout),buildLogo=tpl.logo.image,overlayResourceId=null;
 const pickd={fixes:[],captionOmissions:[]},S=merge(RADIO_STRINGS.en,STRINGS.en);
 return ${params};
}
export function chooseForTest(sdk) {
 const projectId='project',lang='en',guard=p=>p,S={badJson:'bad JSON'},F={invalid:'invalid plan'};
 ${chooseField}
 return chooseFieldClips;
}`;
  const loaded={exports:{}};
  new Function('require','module','exports',esbuild.transformSync(source+extra,{loader:'tsx',format:'cjs'}).code)(dep,loaded,loaded.exports);
  const api=loaded.exports;
  const execute=(body,selects)=>new Function('selects',esbuild.transformSync('return (async()=>{'+body+'})();',{loader:'ts'}).code)(selects);
  const {preserveSceneRange,sceneTransform}=await execute(api.SCRIPT_FIELD_RANGES+'return {preserveSceneRange,sceneTransform};');
  const scene={headline1:'Flooded road',headline2:'Crews clear debris',why:'Wide view followed by the clean-up.',segments:[[8,12]],observations:[{timeSeconds:8,description:'Road and debris.'},{timeSeconds:11,description:'Crew clearing the road.'}]};
  const plan=()=>({searchComplete:true,countReason:'One complete sequence.',clips:[structuredClone(scene)]});

  await t.test('valid visual plans preserve timing and stay unrated, including partial index coverage',()=>{
    const p=plan();p.searchComplete=false;p.clips[0].assessment={hook:10,flow:10,payoff:10,reason:'Invented'};
    const result=api.parseFieldPlan(p,20,2,'invalid');
    assert.deepEqual(result.clips[0].segments,[[8,12]]);
    assert.equal(result.clips[0].assessment,null);assert.equal(result.searchComplete,false);
    assert.deepEqual(api.parseFieldPlan({...plan(),clips:[]},20,2,'invalid').clips,[]);
  });
  await t.test('rejects invalid or repeated ranges, missing observations and out-of-range evidence',()=>{
    const edits=[p=>p.clips[0].segments=[[12,8]],p=>p.clips[0].segments=[[-1,12]],p=>p.clips[0].segments=[[8,21]],
      p=>p.clips[0].segments=[['8',12]],p=>p.clips[0].segments=[[8,NaN]],p=>p.clips[0].segments=[[8,12],[10,14]],
      p=>p.clips.push(structuredClone(p.clips[0])),p=>p.clips[0].observations=[],p=>p.clips[0].observations[0].timeSeconds=1,
      p=>p.clips[0].segments.push([14,17]),p=>p.searchComplete=undefined,p=>p.clips[0].headline1='',p=>p.clips='bad'];
    for(const edit of edits){const p=plan();edit(p);assert.throws(()=>api.parseFieldPlan(p,20,2,'invalid'),/invalid/);}
    assert.throws(()=>api.parseFieldPlan(plan(),20,0,'invalid'),/invalid/);
    assert.throws(()=>api.parseFieldPlan({error:'Scene search authentication failed.'},20,2,'invalid'),/authentication failed/);
  });
  await t.test('planner uses source-scoped search and frame tools in the AI session',async()=>{
    let request;
    const choose=api.chooseForTest({askAI:async p=>{request=p;return {text:JSON.stringify(plan())};}});
    const result=await choose({prompt:{headline:'Two lines',lengthGuide:'30 seconds'}},{resourceId:'video',resourceName:'scene.mp4',countMode:'manual',count:1,note:'Show the cleanup'},[],20);
    assert.equal(result.clips.length,1);assert.equal(request.timeoutMs,600000);
    for(const pattern of [/"projectId":"project"/,/"resourceId":"video"/,/"maxClips":1/,/source.searchScenes/,/display\(await source.captureFrames/,/SAME run_script/,/complete:false/,/not an empty search/,/No clips is valid/])assert.match(request.prompt,pattern);
    await assert.rejects(api.chooseForTest({askAI:async()=>{throw Error('cancelled');}})({prompt:{}},{countMode:'auto'},[],20),/cancelled/);
  });
  await t.test('silent scenes retain heads and tails; only cuts inside speech expand to word boundaries',()=>{
    const meta={fps:30,durationSeconds:20};
    assert.deepEqual(preserveSceneRange(8,12,[[3,4]],meta),[8,12]);
    assert.deepEqual(preserveSceneRange(8,12,[],meta),[8,12]);
    assert.deepEqual(preserveSceneRange(8,12,[[7.8,8.2],[11.8,12.2]],meta),[7.8,12.2]);
    const fps=30000/1001,[a,b]=preserveSceneRange(.1,1.2,[],{fps,durationSeconds:20});
    assert.ok(a<=.1 && .1-a<1/fps && b>=1.2 && b-1.2<1/fps);
    assert.deepEqual(preserveSceneRange(0,20,[],meta),[0,20]);
    assert.throws(()=>preserveSceneRange(0,21,[],meta),/Invalid scene/);
  });
  await t.test('landscape and portrait footage fit entirely inside the template window',()=>{
    for(const [width,height] of [[1920,1080],[3840,2160],[1080,1920],[1080,1080]]) {
      const window={top:420,bottom:1255},out=sceneTransform({frameSize:{width,height}},window);
      const base=Math.min(1080/width,1920/height),w=width*base*out.scale,h=height*base*out.scale;
      const cy=960-out.posY*1920/100;
      assert.ok(w<=1080+1e-8 && cy-h/2>=window.top-1e-8 && cy+h/2<=window.bottom+1e-8);
      assert.equal(out.posX,0);
    }
  });
  const packFs={readFile:async p=>new Uint8Array(fs.readFileSync(p)),join:path.join};
  const templates=(await api.readTemplatePack(packFs,path.join(__dirname,'../template-packs/sbs-radio/pack.json'))).templates;
  async function build(tpl, words, {segments=[[8,12]],contentMode='field',size={width:1920,height:1080}}={}) {
    const P=api.buildParams(tpl,{...scene,segments},contentMode);
    // Even a stale saved parameter cannot enable speech cleanup or face following in field mode.
    P.removeFillers=true;P.removeSilences=true;P.reframe=[{start:0,end:20,cx:1500,w:500}];
    const ranges=[],graphics=[],transforms=[];let created=0,wordReads=0;
    const meta=async()=>({fps:30,durationSeconds:20,frameSize:size});
    const timelineWords=()=>words.flatMap(w=>{
      let offset=0;const result=[];
      for(const r of ranges){if(w.startFrame/30>=r.startSeconds && w.endFrame/30<=r.endSeconds)result.push({...w,startFrame:Math.round(offset*30+w.startFrame-r.startSeconds*30),endFrame:Math.round(offset*30+w.endFrame-r.startSeconds*30),sourceStartFrame:w.startFrame});offset+=r.endSeconds-r.startSeconds;}
      return result;
    });
    const clips=()=>ranges.map((r,i)=>({clipId:'c'+i,resourceId:'video',trackKind:'main',startFrame:Math.round(ranges.slice(0,i).reduce((s,r)=>s+r.endSeconds-r.startSeconds,0)*30),endFrame:Math.round(ranges.slice(0,i+1).reduce((s,r)=>s+r.endSeconds-r.startSeconds,0)*30)}));
    const d={insertResource:async x=>ranges.push(x.sourceRange),words:async()=>{wordReads++;return timelineWords();},silenceSpans:async()=>{throw Error('Must preserve ambient audio');},remove:async()=>{throw Error('Must preserve speech and ambient audio');},
      setFrameSize:async x=>assert.deepEqual(x,{width:1080,height:1920}),clips:async()=>clips(),meta,
      setClipTransform:async x=>{if(x.clip?.trackKind==='main')transforms.push(x);},rangeAtFrames:async(a,b)=>({a,b}),addMotionGraphic:async g=>{graphics.push(g);return {clipId:'graphic'};},commitAll:async()=>({createdDraftId:'field-draft'})};
    const project={resources:async()=>[{resourceId:'video',hasAnalysis:true}],resource:()=>({meta,words:async()=>words}),createDraft:async()=>{created++;return d;}};
    const selects={project:()=>project,effectPresets:{get:async()=>({tsxCode:'export default function Text(){return null}',parameters:{},editableParameters:[]})}};
    const code=(tpl.renderer==='series'?api.RADIO_SCRIPT_BUILD:api.SCRIPT_BUILD).replace('const P: any = __P__;','const P: any = '+JSON.stringify(P)+';');
    try{return {result:await execute(code,selects),ranges,graphics,transforms,wordReads,created};}
    catch(error){error.created=created;throw error;}
  }
  for(const id of ['news-direct','political-show']) {
    const tpl=api.forPlatform(templates.find(t=>t.id===id),'tiktok');
    await t.test(`${tpl.renderer}: wordless field scenes create editable Drafts without cleanup or face tracking`,async()=>{
      const r=await build(tpl,[]);assert.equal(r.result.draftId,'field-draft');assert.equal(r.wordReads,0);
      assert.deepEqual(r.ranges,[{startSeconds:8,endSeconds:12}]);assert.ok(r.graphics.length>0);
      assert.ok(r.graphics.every(g=>!g.label.startsWith('Caption ')));assert.equal(r.transforms.length,1);
      assert.equal(r.transforms[0].scale.x,1);assert.equal(r.transforms[0].position.x,0);
    });
    await t.test(`${tpl.renderer}: mixed speech gets captions while wordless stretches stay intact`,async()=>{
      const words=[{text:'Debris.',startFrame:240,endFrame:270,utteranceId:'u',speakerId:'s'}];
      const r=await build(tpl,words,{segments:[[8,10],[14,17]]});
      assert.deepEqual(r.ranges,[{startSeconds:8,endSeconds:10},{startSeconds:14,endSeconds:17}]);
      assert.ok(r.graphics.some(g=>g.label.startsWith('Caption ')));assert.equal(r.transforms.length,2);
    });
    await t.test(`${tpl.renderer}: invalid or overlapping expanded ranges fail before creating a Draft`,async()=>{
      const words=[{text:'Debris.',startFrame:240,endFrame:300}];
      for(const segments of [[[8,21]],[[8.1,8.8],[9.1,10.5]]])await assert.rejects(build(tpl,words,{segments}),e=>/scene range|Scene ranges/.test(e.message)&&e.created===0);
      await assert.rejects(build(tpl,[],{contentMode:'speech'}),e=>/no transcript/.test(e.message)&&e.created===0);
    });
  }
  await t.test('legacy jobs keep their conversation cleanup settings',()=>{
    const tpl={editing:{removeFillers:true,removeSilences:true},layout:{windowTop:400,windowBottom:1200}};
    assert.equal(api.fieldMode({}),false);assert.equal(api.fieldBuildOptions({},tpl).contentMode,'speech');
    assert.equal(api.fieldBuildOptions({},tpl).removeSilences,true);
    assert.equal(api.fieldBuildOptions({contentMode:'field'},tpl).removeSilences,false);
  });
});
