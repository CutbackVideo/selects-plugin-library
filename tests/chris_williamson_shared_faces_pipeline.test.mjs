// Chris framing reads source-frame clocks through the SDK and persists only canonical Resource IDs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {createRequire,stripTypeScriptTypes} from 'node:module';
import {loadPanelModule} from './panel_module_fixture.mjs';

const panel = fs.readFileSync(new URL('../plugins/chris-williamson-style/src/panel.template.tsx', import.meta.url), 'utf8');
const pipeline = fs.readFileSync(new URL('../plugins/chris-williamson-style/src/pipeline.ts', import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
// Load the shipped module, not a list of copied helpers. New local dependencies
// must resolve exactly as they do in the portable production package.
const production = fs.readFileSync(process.env.CHRIS_UI_PANEL_SOURCE || new URL('../plugins/chris-williamson-style/panel.tsx', import.meta.url), 'utf8');
const functions = loadPanelModule(production, {names:['readDraft','attachedPipelineEnv','sourceClipSeconds','framingSamples','cameraCutFrames']});
const {readDraft,attachedPipelineEnv,sourceClipSeconds,framingSamples,cameraCutFrames} = functions;
const app = process.env.SELECTS_DEV_REPO || (process.env.SBS_PANEL_TEST_MODULES ? path.dirname(process.env.SBS_PANEL_TEST_MODULES) : null);
assert.ok(app, 'Set SELECTS_DEV_REPO or SBS_PANEL_TEST_MODULES to existing CI React test dependencies');
const require = createRequire(path.join(app, 'package.json'));
const React = require('react'), {JSDOM} = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', {url:'http://localhost'});
Object.assign(globalThis, {window:dom.window, document:dom.window.document, HTMLElement:dom.window.HTMLElement, MutationObserver:dom.window.MutationObserver});
Object.defineProperty(globalThis, 'navigator', {value:dom.window.navigator, configurable:true});
const {render,cleanup,act,fireEvent} = require('@testing-library/react');
test.afterEach(cleanup);
const tick = async action => act(async () => { await action?.(); await new Promise(resolve => setImmediate(resolve)); });
const h = React.createElement;
const ui = {
  Section:({title,children})=>h('section',null,h('h3',null,title),children), Stack:({children})=>h('div',null,children),
  Message:({children,tone})=>h('p',{'data-tone':tone},children), Progress:()=>h('span',null,'Progress'),
  Button:({children,disabled,busy,busyLabel,onClick})=>h('button',{disabled:disabled||busy,onClick,'data-busy-label':busy?busyLabel:undefined},children),
};
const deferred = () => { let resolve,reject; const promise=new Promise((a,b)=>{resolve=a;reject=b}); return {promise,resolve,reject}; };

function fixture({sourceFps = 24, draftFps = 30, rate = 1, sourceStartFrame = 720, sourceDuration = 60, summary = false, wordResourceId = 'r3'} = {}) {
  const core = {owner:{projectId:'project'}, sequenceJson:{id:'draft',tracks:{children:[{kind:'Main',children:[{id:7,mediaReferences:{defaultMedia:{id:'canonical-source'}}}]}]}}};
  const rows = [{resourceId:'r3',path:'/footage/source.mp4',frameSize:{width:1920,height:1080}}];
  const calls = [];
  const d = {
    meta:async()=>({name:'Draft',fps:draftFps,frameSize:{width:1920,height:1080}}),
    words:async()=>[
      {text:'another camera',startFrame:330,endFrame:350,sourceStartFrame:9999,sourceResourceId:'r9'},
      {text:'spoken word',startFrame:360,endFrame:375,sourceStartFrame,sourceResourceId:wordResourceId},
    ],
    clips:async()=>[{clipId:7,startFrame:300,endFrame:600,resourceId:'r3',playbackSpeed:{numerator:rate,denominator:1}}],
  };
  const project = {
    resource:id=>{assert.equal(id,'r3');return {meta:async()=>({fps:sourceFps,durationSeconds:sourceDuration})};},
    sourceFiles:async options=>{
      calls.push(options);
      return !summary || options ? {fileTree:rows} : {folders:[{name:'(root)'}]};
    },
  };
  return {core,calls,env:{readCore:async()=>core,runScript:async(script,_summary,allowCommit)=>{
    assert.ok(!allowCommit);
    return vm.runInNewContext(stripTypeScriptTypes('(async()=>{' + script + '})()'), {selects:{project:id=>{assert.equal(id,'project');return project;},draft:id=>{assert.equal(id,'draft');return d;}}});
  }}};
}

test('24fps source in a 30fps Draft uses source seconds and a canonical Resource',async()=>{
  const f=fixture();const src=await readDraft(f.env,'project','draft');
  assert.equal(src.mains[0].sourceStartSeconds,28); // 720/24 - 60/30
  assert.equal(src.mains[0].sourceFps,24);
  assert.equal(src.mains[0].resourceId,'canonical-source');
  assert.deepEqual(Object.keys(src.files),['canonical-source']);
  assert.ok(src.words.every(word=>!('sourceResourceId' in word)),'run-local aliases do not leave this observation');
  const samples=plain(framingSamples(src.mains,src.files,src.fps));
  assert.deepEqual(samples.map(s=>s.seconds),[30.5,33,35.5]);
  assert.ok(samples.every(s=>s.resourceId==='canonical-source'&&s.groupKey==='clip:7'));
});

test('retimed footage keeps source and Draft clocks separate for faces and camera cuts',async()=>{
  const src=await readDraft(fixture({sourceFps:60,sourceStartFrame:900,rate:2}).env,'project','draft');
  assert.equal(src.mains[0].sourceStartSeconds,11); // 900/60 - 60/30 * 2
  assert.equal(sourceClipSeconds(src.mains[0],30),20);
  assert.deepEqual(plain(framingSamples(src.mains,src.files,30)).map(s=>s.seconds),[16,21,26]);
  assert.deepEqual(plain(cameraCutFrames(src.mains,{'0':[0,2,8,20,25]},30,600)),[330,420]);
});

test('canonical transcript Resource IDs join the clip alias through the saved Main binding',async()=>{
  const src=await readDraft(fixture({wordResourceId:'canonical-source'}).env,'project','draft');
  assert.equal(src.mains[0].sourceStartSeconds,28);
  assert.deepEqual(plain(framingSamples(src.mains,src.files,src.fps)).map(s=>s.seconds),[30.5,33,35.5]);
});

test('a transcript word from a different persistent Resource cannot supply the Main source clock',async()=>{
  const src=await readDraft(fixture({wordResourceId:'other-canonical-source'}).env,'project','draft');
  assert.equal(src.mains[0].sourceStartSeconds,null);
  assert.deepEqual(plain(framingSamples(src.mains,src.files,src.fps)),[]);
});

test('source-end clamping keeps all three observations inside the source',async()=>{
  const src=await readDraft(fixture({sourceDuration:32}).env,'project','draft');
  assert.equal(sourceClipSeconds(src.mains[0],30),4);
  assert.deepEqual(plain(framingSamples(src.mains,src.files,30)).map(s=>s.seconds),[29,30,31]);
});

test('source file summaries are read and unknown/foreign canonical bindings fail closed',async()=>{
  const f=fixture({summary:true});const src=await readDraft(f.env,'project','draft');
  assert.equal(src.files['canonical-source'].path,'/footage/source.mp4');
  assert.deepEqual(plain(f.calls),[null,{folder:'(root)'}]);
  for(const mode of ['owner','draft','alias','missing']){
    const f=fixture();
    if(mode==='owner')f.core.owner.projectId='foreign';
    if(mode==='draft')f.core.sequenceJson.id='foreign';
    if(mode==='alias')f.core.sequenceJson.tracks.children[0].children[0].mediaReferences.defaultMedia.id='r0';
    if(mode==='missing')f.core.sequenceJson.tracks.children[0].children=[];
    await assert.rejects(readDraft(f.env,'project','draft'),/Project|persistent source/);
  }
});

test('canonical source joins reject a same-clip camera replacement during the SDK observation',async()=>{
  for(const change of ['resource','owner','draft','removed']){
    const f=fixture();let observed=false,coreReads=0;
    f.env.readCore=async()=>{
      coreReads++;const core=plain(f.core);
      if(observed){
        if(change==='resource')core.sequenceJson.tracks.children[0].children[0].mediaReferences.defaultMedia.id='new-canonical-source';
        if(change==='owner')core.owner.projectId='foreign';
        if(change==='draft')core.sequenceJson.id='foreign';
        if(change==='removed')core.sequenceJson.tracks.children[0].children=[];
      }
      return core;
    };
    const read=f.env.runScript;
    f.env.runScript=async(...args)=>{
      const result=await read(...args);
      result.files.r3.path='/footage/new-camera.mp4';observed=true;
      return result;
    };
    await assert.rejects(readDraft(f.env,'project','draft'),/Main sources changed|another Project/);
    assert.equal(coreReads,2,'both authoritative snapshots are checked before a source is returned');
  }
});

test('detaching stops the next pipeline mutation without canceling a background AI job',async()=>{
  const controller=new AbortController();const calls=[];
  const env=attachedPipelineEnv({signal:controller.signal,status:m=>calls.push(m),runScript:async()=>{calls.push('observed');controller.abort();return {};},writeText:async()=>calls.push('saved')});
  await assert.rejects(env.runScript('status','Read status'),{code:'CW_FACE_DETACHED'});
  await assert.rejects(env.writeText('state','next'),{code:'CW_FACE_DETACHED'});
  env.status('late update');
  assert.deepEqual(calls,['observed']);
});

test('a pending face journal resumes before look commits; only a user click permits failed-job retry',()=>{
  assert.match(pipeline,/state\.faceJournal=state\.faceJournal\|\|hostJoin\(jobDir,'shared-faces\.json'\);await save\(\)/);
  assert.ok(pipeline.indexOf('await cwSharedFaces(')<pipeline.indexOf('"Apply measured framing"'));
  assert.doesNotMatch(pipeline,/engine\('faces'|faces-result\.json|faceFile/);
  assert.match(pipeline,/retryTerminal:options\.retryFaceFailures/);
  const create=panel.slice(panel.indexOf('  async function create()'),panel.indexOf('  async function cancelFaces()'));
  assert.match(create,/retryFaceFailures:true/);
  const template=panel.slice(panel.indexOf('function TemplateRun('));
  assert.doesNotMatch(template,/retryFaceFailures:true/);
});

// All UI fixtures mount the complete production component with real React.
// Only filesystem/install lookup, public SDK calls and expensive pipeline/AI
// operations are controlled; UI strings, target helpers, readState, panelEnv,
// transcript polling, controller guards and JSX rendering remain production code.
function templateHarness() {
  const runs=[],finished=[];
  const paths={data:'/data',plugin:'/plugin',ffmpeg:'ffmpeg'};
  const {Panel,panelLocalClients}=loadPanelModule(production,{
    names:['Panel','panelLocalClients'],React,
    overrides:{resolvePaths:async()=>paths,runPipeline:async(env)=>{
      const gate=deferred();runs.push({env,...gate});return gate.promise;
    }},filename:'plugins/chris-williamson-style/panel.tsx',
  });
  const sdk={finishTemplate:result=>finished.push(result)};
  panelLocalClients.set(sdk,{files:{writeFile:async()=>{},join:(...parts)=>parts.join('/')}});
  return {runs,finished,mount:strict=>render(h(strict?React.StrictMode:React.Fragment,null,
    h(Panel,{sdk,context:{projectId:'project',template:{runId:'run',inputs:{speaker:[{kind:'timeline',sequenceId:'draft'}]}}}})))};
}

test('template unmount detaches and prevents a late finishTemplate response',async()=>{
  const f=templateHarness(),view=f.mount(false);await tick();assert.equal(f.runs.length,1);
  const run=f.runs[0];view.unmount();assert.equal(run.env.signal.aborted,true);
  await tick(()=>run.resolve({draftId:'draft',jobDir:'/data/run'}));assert.deepEqual(f.finished,[]);
});

test('template effect cleanup/setup before async preparation does not strand a StrictMode run',async()=>{
  const f=templateHarness(),view=f.mount(true);await tick();assert.equal(f.runs.length,1);
  assert.equal(f.runs[0].env.signal.aborted,false);
  await tick(()=>f.runs[0].resolve({draftId:'draft',jobDir:'/data/run'}));
  assert.deepEqual(plain(f.finished),[{sequenceId:'draft'}]);view.unmount();
});

function styleHarness({deferCancel=false,transcriptRead,source=production} = {}) {
  const cancelCalls=[],editorCalls=[],runs=[];let finishCancel,activeEnv;
  const paths={data:'/data',plugin:'/plugin',ffmpeg:'ffmpeg'};
  const {Panel,panelLocalClients}=loadPanelModule(source,{
    names:['Panel','panelLocalClients'],React,
    overrides:{resolvePaths:async()=>paths,
      runPipeline:async(env,pid,sid,options)=>{
        if(env.signal.aborted)throw Object.assign(new Error('Detached'),{code:'CW_FACE_DETACHED'});
        assert.equal(options.retryFaceFailures,true);activeEnv=env;
        env.onFaceStage(true,'/data/runs/'+(sid==='draft'?'existing':sid)+'/shared-faces.json');
        const gate=deferred();runs.push({env,pid,sid,...gate});return gate.promise;
      },
      cwCancelSharedFaces:async(env,pid,journal)=>{
        assert.equal(env.signal,undefined);assert.equal(activeEnv.signal.aborted,false);
        cancelCalls.push([pid,journal]);if(deferCancel)await new Promise(resolve=>finishCancel=resolve);
        return {canceled:1};
      },
    },filename:'plugins/chris-williamson-style/panel.tsx',
  });
  let context={projectId:'project',sequenceId:'draft',language:'en'};
  const sdk={
    call:async(method,id)=>{assert.equal(method,'getDraftCore');return {owner:{projectId:context.projectId},sequenceJson:{id}};},
    runScript:async request=>{
      if(request.summary==='Open the Chris Williamson Style draft'){editorCalls.push(request);return {result:true};}
      assert.ok(['Check draft transcript','Read draft transcript','Check transcript analysis'].includes(request.summary),'Only the observed public SDK boundary can run');
      // Execute the real readOpenDraft script: the host metadata/media methods
      // are the external boundary, not a replacement local helper or locale.
      const pid=JSON.parse(/selects\.project\(("[^"]*")\)/.exec(request.script)[1]);
      const sid=JSON.parse(/selects\.draft\(("[^"]*")\)/.exec(request.script)[1]);
      const data=transcriptRead?await transcriptRead(sdk,pid,sid,request.summary):{name:'Draft · Chris Williamson Style',words:12,resource:{status:'analyzed'}};
      const project={meta:async()=>({title:'Project '+pid}),resources:async()=>[{resourceId:'r3',...data.resource}],workflows:async()=>[]};
      const draft={meta:async()=>({name:data.name}),words:async()=>Array.from({length:data.words||0},()=>({text:'word'})),clips:async()=>[{resourceId:data.sourceResourceId||'r3'}]};
      return {result:await vm.runInNewContext(stripTypeScriptTypes('(async()=>{'+request.script+'})()'),{selects:{project:id=>{assert.equal(id,pid);return project;},draft:id=>{assert.equal(id,sid);return draft;}}})};
    },
  };
  panelLocalClients.set(sdk,{files:{join:(...parts)=>parts.join('/'),readFile:async path=>{
    const id=path.match(/states\/([^/]+)\.json$/)?.[1];assert.ok(id,'only durable run state is read');
    return JSON.stringify({version:2,items:{},pending:true,faceJournal:'/data/runs/'+(id==='draft'?'existing':id)+'/shared-faces.json'});
  }}});
  const view=render(h(Panel,{sdk,context,ui}));
  const update=async patch=>{context={...context,...patch};await tick(()=>view.rerender(h(Panel,{sdk,context,ui})));};
  const click=async name=>tick(()=>fireEvent.click(view.getByRole('button',{name})));
  return {view,click,update,cancelCalls,editorCalls,runs,get finishCancel(){return finishCancel;},get activeEnv(){return activeEnv;}};
}

test('reopening a pending styled Draft offers Resume; explicit AI cancel detaches after canceling the saved job',async()=>{
  const f=styleHarness();await tick();
  assert.equal(f.view.getByRole('button',{name:'Resume styling'}).disabled,false);
  assert.match(f.view.container.textContent,/Project: Project project/);
  assert.match(f.view.container.textContent,/Draft: Draft · Chris Williamson Style/);
  await f.click('Resume styling');assert.equal(f.runs.length,1);
  const run=f.runs[0];assert.equal(run.env.signal.aborted,false);
  await f.click('Cancel AI job');assert.equal(run.env.signal.aborted,true);
  assert.deepEqual(f.cancelCalls,[['project','/data/runs/existing/shared-faces.json']]);
  await tick(()=>run.resolve({draftId:'draft'}));
  assert.deepEqual(f.editorCalls,[],'canceled observation cannot open a late result');
  assert.equal(f.view.getByRole('button',{name:'Resume styling'}).disabled,false);
});

test('normal panel unmount detaches without calling cancel and ignores late completion',async()=>{
  const f=styleHarness();await tick();await f.click('Resume styling');assert.equal(f.runs.length,1);
  const run=f.runs[0];f.view.unmount();assert.equal(run.env.signal.aborted,true);
  await tick(()=>run.resolve({draftId:'draft'}));assert.deepEqual(f.cancelCalls,[]);assert.deepEqual(f.editorCalls,[]);
});

test('a late face-stage callback from the old Draft cannot overwrite the new cancellation target',async()=>{
  const f=styleHarness();await tick();await f.click('Resume styling');const old=f.runs[0];assert.ok(old);
  await f.update({projectId:'next-project',sequenceId:'next-draft'});
  await f.click('Resume styling');const current=f.runs[1];assert.ok(current);
  await tick(()=>old.env.onFaceStage(false,'/data/runs/existing/shared-faces.json'));
  assert.ok(f.view.getByRole('button',{name:'Cancel AI job'}),'old finally cannot hide new AI stage');
  await f.click('Cancel AI job');
  assert.deepEqual(f.cancelCalls,[['next-project','/data/runs/next-draft/shared-faces.json']]);
  assert.equal(current.env.signal.aborted,true);
  await tick(()=>{old.resolve({draftId:'draft'});current.resolve({draftId:'next-draft'});});
});

test('old cancellation completion cannot detach a newly opened Draft or overwrite its status',async()=>{
  const f=styleHarness({deferCancel:true});await tick();await f.click('Resume styling');const old=f.runs[0];assert.ok(old);
  await f.click('Cancel AI job');assert.equal(f.view.getByRole('button',{name:'Cancel AI job'}).disabled,true);
  await f.update({projectId:'next-project',sequenceId:'next-draft'});await f.click('Resume styling');
  const current=f.runs[1];assert.ok(current);
  await tick(()=>current.env.status('New job running'));
  await tick(()=>f.finishCancel());assert.equal(current.env.signal.aborted,false,'previous cancel only detaches its own controller');
  assert.ok(f.view.getByText('New job running'));assert.equal(f.view.getByRole('button',{name:'Cancel AI job'}).disabled,false);
  await tick(()=>{old.resolve({draftId:'draft'});current.resolve({draftId:'next-draft'});});
});

test('a late transcript observation cannot mark the newly opened Draft ready',async()=>{
  let releaseTranscript;
  const f=styleHarness({transcriptRead:async(_sdk,_pid,sid,summary)=>{
    if(sid==='draft'&&summary==='Check transcript analysis')return await new Promise(resolve=>releaseTranscript=()=>resolve({words:12,resource:{status:'analyzed'}}));
    return {name:'Unfinished Draft',words:0,sourceResourceId:'r3',resource:{status:'analyzing'}};
  }});
  await tick();await f.click('Resume styling');assert.ok(releaseTranscript);
  await f.update({projectId:'next-project',sequenceId:'next-draft'});
  assert.ok(f.view.getByText(/Project: Project next-project/));
  await tick(()=>releaseTranscript());
  assert.ok(f.view.getByText(/no transcript yet|One click turns/));
  assert.equal(f.runs.length,0);assert.deepEqual(f.editorCalls,[]);
  // The actual current analysis state must still choose the transcript busy
  // label, rather than the styling label implied by the stale ready response.
  await f.click('Resume styling');
  const button=f.view.getByRole('button',{name:'Resume styling'});assert.ok(button.disabled);
  assert.equal(button.getAttribute('data-busy-label'),'Analyzing transcript…');
  assert.ok(f.view.getByText(/Analyzing the transcript/));f.view.unmount();
});


test('a new local target dependency resolves through the complete module without a helper list',async()=>{
  const expression='TARGET_UI[String(context?.language||"en").toLowerCase().split("-")[0]]||TARGET_UI.en';
  assert.ok(production.includes(expression));
  const expanded=production.replace(expression,'newTargetDependency(context)')+
    '\nfunction newTargetDependency(context) { return TARGET_UI[String(context?.language||"en").toLowerCase().split("-")[0]]||TARGET_UI.en; }\n';
  const f=styleHarness({source:expanded});await tick();
  assert.match(f.view.container.textContent,/Project: Project project/);
  assert.match(f.view.container.textContent,/Draft: Draft · Chris Williamson Style/);
  assert.equal(f.view.getByRole('button',{name:'Resume styling'}).disabled,false);
});

test('a delayed old target read cannot replace the current rendered Project and Draft',async()=>{
  const oldReads=[];
  const f=styleHarness({transcriptRead:async(_sdk,_pid,sid,summary)=>{
    if(sid==='draft'&&summary==='Check draft transcript'){
      const gate=deferred();oldReads.push(gate);return gate.promise;
    }
    return {name:'Current target',words:12,resource:{status:'analyzed'}};
  }});
  await tick();assert.ok(oldReads.length);
  await f.update({projectId:'next-project',sequenceId:'next-draft'});
  assert.match(f.view.container.textContent,/Project: Project next-project/);
  assert.match(f.view.container.textContent,/Draft: Current target/);
  await tick(()=>oldReads.forEach(gate=>gate.resolve({name:'Stale target',words:12,resource:{status:'analyzed'}})));
  assert.doesNotMatch(f.view.container.textContent,/Stale target|Project: Project project/);
  assert.equal(f.view.container.querySelector('[data-draft-id]').getAttribute('data-draft-id'),'next-draft');
});
