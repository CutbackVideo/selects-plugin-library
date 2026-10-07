// Chris framing reads source-frame clocks through the SDK and persists only canonical Resource IDs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';

const panel = fs.readFileSync(new URL('../plugins/chris-williamson-style/src/panel.template.tsx', import.meta.url), 'utf8');
const pipeline = fs.readFileSync(new URL('../plugins/chris-williamson-style/src/pipeline.ts', import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const panelRead = panel.slice(panel.indexOf('export async function readDraft('), panel.indexOf('/*SECTION_planning*/')).replace(/^export /m, '');
const helpers = pipeline.slice(pipeline.indexOf('export function attachedPipelineEnv('), pipeline.indexOf('export async function runPipeline(')).replace(/^export /gm, '');
const functions = vm.runInNewContext(stripTypeScriptTypes(panelRead + helpers) + ';({readDraft,attachedPipelineEnv,sourceClipSeconds,framingSamples,cameraCutFrames})', {AbortController});
const {readDraft,attachedPipelineEnv,sourceClipSeconds,framingSamples,cameraCutFrames} = functions;

function fixture({sourceFps = 24, draftFps = 30, rate = 1, sourceStartFrame = 720, sourceDuration = 60, summary = false} = {}) {
  const core = {owner:{projectId:'project'}, sequenceJson:{id:'draft',tracks:{children:[{kind:'Main',children:[{id:7,mediaReferences:{defaultMedia:{id:'canonical-source'}}}]}]}}};
  const rows = [{resourceId:'r3',path:'/footage/source.mp4',frameSize:{width:1920,height:1080}}];
  const calls = [];
  const d = {
    meta:async()=>({name:'Draft',fps:draftFps,frameSize:{width:1920,height:1080}}),
    words:async()=>[
      {text:'another camera',startFrame:330,endFrame:350,sourceStartFrame:9999,sourceResourceId:'r9'},
      {text:'spoken word',startFrame:360,endFrame:375,sourceStartFrame,sourceResourceId:'r3'},
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

test('template unmount detaches and prevents a late finishTemplate response',async()=>{
  const template=panel.slice(panel.indexOf('function TemplateRun('),panel.indexOf('/** A template run (`context.template`)')).replace('  return <small>{status}</small>;','  return status;');
  const effects=[];let release,env;const finished=[];
  const exports=vm.runInNewContext(stripTypeScriptTypes(template)+';({TemplateRun})',{
    AbortController,useRef:value=>({current:value}),useState:value=>[value,()=>{}],useEffect:fn=>effects.push(fn),
    templateSpeaker:()=>({kind:'timeline',sequenceId:'draft'}),templatePaths:async()=>({}),
    panelEnv:(_sdk,_paths,_status,signal)=>{env={signal};return env;},
    runPipeline:async()=>new Promise(resolve=>{release=()=>resolve({draftId:'draft'});}),TEMPLATE_FAILED:'Failed',MUSIC:{levelDb:-5},
  });
  exports.TemplateRun({sdk:{finishTemplate:result=>finished.push(result)},context:{projectId:'project',template:{runId:'run'}}});
  const cleanup=effects[0]();
  for(let i=0;!release&&i<10;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.ok(release,JSON.stringify(finished));
  cleanup();assert.equal(env.signal.aborted,true);release();
  await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(finished,[]);
});

test('template effect cleanup/setup before async preparation does not strand a StrictMode run',async()=>{
  const template=panel.slice(panel.indexOf('function TemplateRun('),panel.indexOf('/** A template run (`context.template`)')).replace('  return <small>{status}</small>;','  return status;');
  const effects=[],finished=[];let calls=0;
  const TemplateRun=vm.runInNewContext(stripTypeScriptTypes(template)+';TemplateRun',{
    AbortController,useRef:value=>({current:value}),useState:value=>[value,()=>{}],useEffect:fn=>effects.push(fn),
    templateSpeaker:()=>({kind:'timeline',sequenceId:'draft'}),templatePaths:async()=>({}),
    panelEnv:(_sdk,_paths,_status,signal)=>({signal}),
    runPipeline:async()=>{calls++;return {draftId:'draft'};},TEMPLATE_FAILED:'Failed',MUSIC:{levelDb:-5},
  });
  TemplateRun({sdk:{finishTemplate:result=>finished.push(result)},context:{projectId:'project',template:{runId:'run'}}});
  effects[0]()();const cleanup=effects[0]();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls,1);assert.deepEqual(plain(finished),[{sequenceId:'draft'}]);cleanup();
});

function styleHarness({deferCancel=false,transcriptRead} = {}) {
  const raw=panel.slice(panel.indexOf('function StylePanel('),panel.indexOf('// Clip highlights template run.'));
  const source=raw.slice(0,raw.indexOf('  return <ui.Section'))+'  return {create,cancelFaces,actionLabel};\n}';
  const states=[],refs=[],effects=[],cancelCalls=[],editorCalls=[],runs=[];
  let stateIndex=0,refIndex=0,release,activeEnv,finishCancel;
  const paths={data:'/data',plugin:'/plugin',ffmpeg:'ffmpeg'};
  const StylePanel=vm.runInNewContext(stripTypeScriptTypes(source)+';StylePanel',{
    AbortController,MUSIC:{levelDb:-5},SUFFIX:' · Chris Williamson Style',faceUI:()=>['Resume styling','Cancel AI','Canceled','Canceling'],
    useRef:value=>refs[refIndex++]??=( {current:value} ),
    useState:value=>{const i=stateIndex++;if(!(i in states))states[i]=i===0?paths:value;return [states[i],next=>states[i]=next];},
    useEffect:fn=>effects.push(fn),resolvePaths:async()=>paths,
    readOpenDraft:transcriptRead|| (async()=>({name:'Draft · Chris Williamson Style',words:12,resource:{status:'analyzed'}})),
    readState:async(_env,id)=>({pending:true,faceJournal:'/data/runs/'+(id==='draft'?'existing':id)+'/shared-faces.json'}),readText:async()=>'',
    panelEnv:(_sdk,_paths,status,signal,onFaceStage)=>({status,signal,onFaceStage}),
    runPipeline:async(env,_pid,sid,options)=>{if(env.signal.aborted)throw Object.assign(new Error('Detached'),{code:'CW_FACE_DETACHED'});activeEnv=env;assert.equal(options.retryFaceFailures,true);env.onFaceStage(true,'/data/runs/'+(sid==='draft'?'existing':sid)+'/shared-faces.json');return new Promise(resolve=>{release=()=>resolve({draftId:sid});runs.push({env,release});});},
    cwCancelSharedFaces:async(env,pid,journal)=>{assert.equal(env.signal,undefined);assert.equal(activeEnv.signal.aborted,false);cancelCalls.push([pid,journal]);if(deferCancel)await new Promise(resolve=>finishCancel=resolve);return {canceled:1};},
  });
  const props={sdk:{runScript:async args=>editorCalls.push(args)},context:{projectId:'project',sequenceId:'draft'},ui:{}};
  const render=()=>{stateIndex=refIndex=0;return StylePanel(props);};
  return {render,props,states,effects,cancelCalls,editorCalls,runs,get finishCancel(){return finishCancel;},get activeEnv(){return activeEnv;},get release(){return release;}};
}

test('reopening a pending styled Draft offers Resume; explicit AI cancel detaches after canceling the saved job',async()=>{
  const h=styleHarness();h.render();const cleanup=h.effects[1]();
  await new Promise(resolve=>setImmediate(resolve));const panel=h.render();
  assert.equal(panel.actionLabel,'Resume styling');assert.equal(h.states[3],false,'a pending suffix Draft stays actionable');
  const running=panel.create();
  for(let i=0;!h.release&&i<10;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.ok(h.release);assert.equal(h.activeEnv.signal.aborted,false);
  await panel.cancelFaces();assert.equal(h.activeEnv.signal.aborted,true);
  assert.deepEqual(h.cancelCalls,[['project','/data/runs/existing/shared-faces.json']]);
  h.release();await running;assert.deepEqual(h.editorCalls,[],'canceled observation cannot open a late result');
  assert.equal(h.states[9],true);cleanup();
});

test('normal panel unmount detaches without calling cancel and ignores late completion',async()=>{
  const h=styleHarness();const panel=h.render();const cleanup=h.effects[1]();
  await new Promise(resolve=>setImmediate(resolve));const running=panel.create();
  for(let i=0;!h.release&&i<10;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.ok(h.release);cleanup();assert.equal(h.activeEnv.signal.aborted,true);
  h.release();await running;assert.deepEqual(h.cancelCalls,[]);assert.deepEqual(h.editorCalls,[]);
});


test('a late face-stage callback from the old Draft cannot overwrite the new cancellation target',async()=>{
  const h=styleHarness();h.render();const cleanup=h.effects[1]();
  await new Promise(resolve=>setImmediate(resolve));const first=h.render().create();
  for(let i=0;h.runs.length<1&&i<10;i++)await new Promise(resolve=>setImmediate(resolve));
  const old=h.runs[0];assert.ok(old);cleanup();
  h.props.context={projectId:'next-project',sequenceId:'next-draft'};
  h.render();const nextCleanup=h.effects.at(-1)();
  await new Promise(resolve=>setImmediate(resolve));const nextPanel=h.render();const second=nextPanel.create();
  for(let i=0;h.runs.length<2&&i<10;i++)await new Promise(resolve=>setImmediate(resolve));
  const current=h.runs[1];assert.ok(current);
  old.env.onFaceStage(false,'/data/runs/existing/shared-faces.json');
  assert.equal(h.states[10],true,'the old finally cannot hide the new AI stage');
  await h.render().cancelFaces();
  assert.deepEqual(h.cancelCalls,[['next-project','/data/runs/next-draft/shared-faces.json']]);
  assert.equal(current.env.signal.aborted,true);old.release();current.release();
  await Promise.all([first,second]);nextCleanup();
});

test('old cancellation completion cannot detach a newly opened Draft or overwrite its status',async()=>{
  const h=styleHarness({deferCancel:true});h.render();const cleanup=h.effects[1]();
  await new Promise(resolve=>setImmediate(resolve));const first=h.render().create();
  for(let i=0;h.runs.length<1&&i<10;i++)await new Promise(resolve=>setImmediate(resolve));
  const old=h.runs[0];assert.ok(old);const cancel=h.render().cancelFaces();
  assert.equal(h.states[11],true);cleanup();
  h.props.context={projectId:'next-project',sequenceId:'next-draft'};
  h.render();const nextCleanup=h.effects.at(-1)();
  await new Promise(resolve=>setImmediate(resolve));assert.equal(h.states[11],false,'new context is not canceling');
  const second=h.render().create();
  for(let i=0;h.runs.length<2&&i<10;i++)await new Promise(resolve=>setImmediate(resolve));
  const current=h.runs[1];assert.ok(current);current.env.status('New job running');
  h.finishCancel();await cancel;
  assert.equal(current.env.signal.aborted,false,'previous cancel only detaches its own controller');
  assert.equal(h.states[6],'New job running');assert.equal(h.states[10],true);
  old.release();current.release();await Promise.all([first,second]);nextCleanup();
});


test('a late transcript observation cannot mark the newly opened Draft ready',async()=>{
  let releaseTranscript;
  const h=styleHarness({transcriptRead:async(_sdk,_pid,sid,summary)=>{
    if(sid==='draft'&&summary==='Check transcript analysis')return await new Promise(resolve=>releaseTranscript=()=>resolve({words:12,resource:{status:'analyzed'}}));
    return {name:'Unfinished Draft',words:0,sourceResourceId:'r3',resource:{status:'analyzing'}};
  }});
  h.render();const cleanup=h.effects[1]();await new Promise(resolve=>setImmediate(resolve));
  const first=h.render().create();
  for(let i=0;!releaseTranscript&&i<10;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.ok(releaseTranscript);cleanup();
  h.props.context={projectId:'next-project',sequenceId:'next-draft'};
  h.render();const nextCleanup=h.effects.at(-1)();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.states[4],'analyzing');releaseTranscript();await first;
  assert.equal(h.states[4],'analyzing','old ready result must not replace the current transcript state');
  assert.equal(h.states[6],'');assert.equal(h.runs.length,0);assert.deepEqual(h.editorCalls,[]);nextCleanup();
});
