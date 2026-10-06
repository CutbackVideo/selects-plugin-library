import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {topLevel} from './windows_host.mjs';

const multicam = fs.readFileSync(new URL('../plugins/multicam-generator/panel.tsx', import.meta.url), 'utf8');
const doac = fs.readFileSync(new URL('../plugins/doac-style/panel.tsx', import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));

function session(storage, source = multicam, caption = false) {
  const states = [], refs = [], effects = [], cleanups = [];
  let stateIndex = 0, refIndex = 0, first = true;
  const scope = {projectId:'project-a', sequenceId:'draft-a'};
  const sdk = {storage, runScript:async () => ({result:{name:'Source'}})};
  const ctx = vm.createContext({
    console, Date, JSON, Error, Set, crypto, TextDecoder, window:{},
    LABELS:{}, JOB_ID:/^job-/, report:()=>{}, safeDetail:String, UI_KO:{}, ERRORS:{submission_unknown:'Submission unknown'},
    writeLocalDiagnostic:async()=>{},
    localStorage: new Proxy({}, {get(){throw Error('Sandbox storage forbidden');}}),
    React:{useContext:()=>'en'}, UILanguage:{}, ANGLE_OPTIONS:[['right']], PLAN_VERSION:'v5-llm-editor',
    useState(value) {const i=stateIndex++; if(first)states[i]=typeof value==='function'?value():value; return [states[i],next=>{states[i]=typeof next==='function'?next(states[i]):next;}];},
    useRef(value) {const i=refIndex++; if(first)refs[i]={current:value}; return refs[i];},
    useEffect(fn) {if(first)effects.push(fn);},
    captionSteps:()=>({fs(){throw Error('No preview files');},read:async()=>'',run:async()=>{},sameProject:()=>{}}),
  });
  const name=caption?'CaptionPanel':'Session';
  let body=source.slice(source.indexOf('function '+name+'(')).replace(/ as any/g,'').replace(/: any/g,'').replace('images?', 'images');
  body=body.slice(0,body.indexOf(caption?' const complete=':'  const active ='));
  body += caption?' return {job, save, action, pending: typeof pendingSave === "undefined" ? null : pendingSave.current};\n}':' return {job, savedRequest, save, generate, pipeline, latest, ready: typeof storageReady === "undefined" ? false : storageReady.current};\n}';
  vm.runInContext(body,ctx);
  function render(){stateIndex=0;refIndex=0;const result=ctx[name]({sdk,context:scope,ui:{}});first=false;return result;}
  let result=render(); for(const effect of effects)cleanups.push(effect());
  return {render, ctx, states, scope, sdk, unmount(){for(const cleanup of cleanups)cleanup?.();}, get value(){return result;}};
}

for (const caption of [false,true]) {
  test(`${caption?'DOAC':'Multicam'} restoration awaits SDK without browser storage or default writes`, async () => {
    let resolveRead, writes=0;
    const restored=caption?{projectId:'project-a',targetId:'target',editorial:[],next:0}:{id:'existing',phase:'queued',generationId:'job-existing',plan:{settings:{model:'seedance25',angle:'left',duration:7}}};
    const h=session({getItem:key=>key.endsWith(':saved-request')?Promise.resolve(null):new Promise(resolve=>{resolveRead=resolve;}),setItem:async()=>{writes++;}},caption?doac:multicam,caption);
    let calls=0;
    if(caption)await h.value.action(async()=>calls++); else await h.value.generate();
    assert.equal(calls,0);assert.equal(writes,0);
    resolveRead(JSON.stringify(restored));await tick();
    assert.equal(h.render().job?.[caption?'targetId':'id'],caption?'target':'existing');
    assert.equal(writes,0);
  });
}

test('Multicam retains acknowledged generation ID when persistence fails', async () => {
  const h=session({getItem:async()=>null,setItem:async()=>{throw Error('disk full');}});
  await tick();
  const panel=h.render();
  await assert.rejects(panel.save({id:'request',phase:'queued',generationId:'job-acknowledged'}));
  assert.equal(panel.latest.current.generationId,'job-acknowledged');
});

for (const caption of [false,true]) {
  test(`${caption?'DOAC':'Multicam'} missing SDK storage blocks work with update guidance`, async () => {
    const h=session(undefined,caption?doac:multicam,caption);await tick();
    let calls=0;const panel=h.render();
    if(caption)await panel.action(async()=>calls++);else await panel.generate();
    assert.equal(calls,0);assert(h.states.some(value=>typeof value==='string'&&/Update Selects/.test(value)));
  });
  test(`${caption?'DOAC':'Multicam'} ignores a restored value after unmount`, async () => {
    let resolveRead;
    const h=session({getItem:key=>key.endsWith(':saved-request')?Promise.resolve(null):new Promise(resolve=>resolveRead=resolve),setItem:async()=>{}},caption?doac:multicam,caption);
    h.unmount();resolveRead(JSON.stringify({id:'stale'}));await tick();
    assert.equal(h.render().job,null);
  });
}

test('Multicam cannot resubmit restored submitting or placing intents', async () => {
  for(const phase of ['submitting','lip_submitting','placing']) {
    let submits=0;
    const h=session({getItem:async()=>JSON.stringify({storageVersion:1,job:{id:'request',phase},savedRequest:null}),setItem:async()=>{}});
    h.sdk.call=async()=>({projectId:'project-a',onScreenTab:{kind:'draft',sequenceId:'draft-a'}});
    h.sdk.askAI=async()=>{submits++;throw Error('Must not submit');};await tick();
    const panel=h.render();await assert.rejects(panel.pipeline(panel.job),/submission_unknown/);
    assert.equal(submits,0);
  }
});

test('Multicam acknowledged job save failure halts before querying or submitting another stage', async () => {
  let writes=0,queries=0;
  const initial={id:'request',phase:'queued',generationId:'job-original',plan:{settings:{}}};
  const h=session({getItem:async()=>JSON.stringify({storageVersion:1,job:initial,savedRequest:null}),setItem:async()=>{writes++;throw Error('disk full');}});
  h.sdk.call=async()=>({projectId:'project-a',onScreenTab:{kind:'draft',sequenceId:'draft-a'}});
  h.ctx.runGenerationCall=async()=>{queries++;return {selects:{jobId:'job-original',status:'completed',deliveryStatus:'imported'}};};
  await tick();const panel=h.render();
  await assert.rejects(panel.pipeline(panel.job),/Could not save progress/);
  assert.equal(writes,1);assert.equal(queries,1);assert.equal(panel.latest.current.generationId,'job-original');
});

test('DOAC failed save retains target progress and retries persistence without running the next action',async()=>{
  let fail=true,writes=0,actions=0;
  const h=session({getItem:async()=>null,setItem:async()=>{writes++;if(fail)throw Error('full');}},doac,true);await tick();
  const panel=h.render();
  await assert.rejects(panel.save({targetId:'already-created',next:1,clipIds:[17],uncertain:false}),/Could not save caption progress/);
  assert.equal(h.render().job.targetId,'already-created');
  fail=false;await h.render().action(async()=>actions++);
  assert.equal(actions,0);assert.equal(writes,2);
});

test('Multicam awaits intent before placing, and a failed completion save never places twice', async () => {
  let releaseIntent, writes=0, placements=0;
  const initial={id:'request',phase:'imported',task:'lipsync',actualResourceId:'resource',plan:{fingerprint:'same',settings:{}}};
  const h=session({
    getItem:async()=>JSON.stringify({storageVersion:1,job:initial,savedRequest:null}),
    setItem:async()=>{writes++;if(writes===1)await new Promise(resolve=>releaseIntent=resolve);else throw Error('disk full');},
  });
  h.sdk.call=async()=>({projectId:'project-a',onScreenTab:{kind:'draft',sequenceId:'draft-a'}});
  h.ctx.readPlan=async()=>({fingerprint:'same'});
  h.ctx.sdkSelectedMedia=async()=>[{resourceId:'resource'}];
  h.ctx.placeDirect=async()=>{placements++;return {clipId:10};};
  await tick();const panel=h.render();
  const running=panel.pipeline(panel.job);await tick();
  assert.equal(placements,0);releaseIntent();
  await assert.rejects(running,/Could not save progress/);
  assert.equal(placements,1);assert.equal(panel.latest.current.phase,'placed');
  await panel.pipeline(panel.latest.current);assert.equal(placements,1);
});

test('Multicam failed pre-effect checkpoint can safely retry the prior stage', async () => {
  const initial={id:'request',phase:'analyzed'};
  const h=session({getItem:async()=>JSON.stringify({storageVersion:1,job:initial,savedRequest:null}),setItem:async()=>{throw Error('full');}});
  await tick();const panel=h.render();
  await assert.rejects(panel.save({...panel.job,phase:'submitting'},null,true),/Could not save progress/);
  assert.equal(panel.latest.current.phase,'analyzed');
});

function captionCreation(persist, runScript) {
  const files={getOrCreateTmpDirPath:async()=>'/tmp',join:(...parts)=>parts.join('/'),mkdir:async()=>{},writeFile:async()=>{},readFile:async()=>'{"signature":"none"}'};
  const ctx=vm.createContext({console,TextDecoder,hostUseSdk:()=>{},hostSdk:{files},rendererCode:async()=>'<Caption/>',PLAN_VERSION:'v5-llm-editor'});
  vm.runInContext(topLevel(doac,'captionSteps'),ctx);
  return ctx.captionSteps({sdk:{runScript},currentProject:()=> 'project-a',onStatus:()=>{},persist});
}
const captionJob=()=>({projectId:'project-a',sourceId:'source',targetId:'target',next:0,baseCount:1,clipIds:[],editorial:[{},{}],input:{words:[]},manifest:{scenes:[{payload:'/one',start:0,end:10},{payload:'/two',start:10,end:20}]}});

test('DOAC waits for the intent checkpoint before committing caption scenes',async()=>{
  let releaseIntent,commits=0;
  const steps=captionCreation(async j=>{if(j.uncertain)await new Promise(resolve=>releaseIntent=resolve);},async()=>{commits++;return {result:{clipId:commits}};});
  const running=steps.create({...captionJob(),manifest:{scenes:[{payload:'/one',start:0,end:10}]}},{open:false});
  await tick();assert.equal(commits,0);releaseIntent();await running;assert.equal(commits,1);
});

test('DOAC completion checkpoint failure halts following scenes and preserves durable uncertainty',async()=>{
  let durable=null,commits=0;
  const steps=captionCreation(async j=>{
    if(j.uncertain){durable=JSON.parse(JSON.stringify(j));return;}
    throw Object.assign(Error('storage unavailable'),{storageFailure:true});
  },async()=>{commits++;return {result:{clipId:commits}};});
  await assert.rejects(steps.create(captionJob(),{open:false,skipFailedScenes:true}),/storage unavailable/);
  assert.equal(commits,1);assert.equal(durable.uncertain,true);
  await assert.rejects(steps.create(durable,{open:false}),/last save was not confirmed/);
  assert.equal(commits,1);
});

test('DOAC rejects action closures from the previous project while a new project restores',async()=>{
  const h=session({getItem:async()=>null,setItem:async()=>{}},doac,true);await tick();
  const old=h.render();h.scope.projectId='project-b';h.render();let actions=0;
  await old.action(async()=>actions++);await assert.rejects(old.save({projectId:'project-a'}),/Project changed/);
  assert.equal(actions,0);
});

for(const caption of [false,true]) {
  test(`${caption?'DOAC':'Multicam'} read failure never turns into an empty writable session`,async()=>{
    let writes=0,actions=0;
    const h=session({getItem:async()=>{throw Error('Saved data unavailable. Reopen to retry.');},setItem:async()=>writes++},caption?doac:multicam,caption);
    await tick();const panel=h.render();
    if(caption)await panel.action(async()=>actions++);else await panel.generate();
    assert.equal(actions,0);assert.equal(writes,0);
    assert(h.states.includes('Saved data unavailable. Reopen to retry.'));
  });
}

test('Multicam archives the resumable request and current job in one checkpoint',async()=>{
  const writes=[];
  const prior={id:'prior',phase:'queued',generationId:'job-prior'};
  const h=session({getItem:async()=>JSON.stringify({storageVersion:1,job:prior,savedRequest:null}),setItem:async(key,value)=>writes.push([key,JSON.parse(value)])});
  await tick();await h.render().save(null,prior);
  assert.equal(writes.length,1);
  assert.deepEqual(writes[0],['selects-multicam-v3:["project-a","draft-a"]',{storageVersion:1,job:null,savedRequest:prior}]);
});

function planningSteps(persist, replyText='[]') {
  let paidCalls=0;
  const files={getOrCreateTmpDirPath:async()=>'/tmp',join:(...parts)=>parts.join('/'),mkdir:async()=>{},writeFile:async()=>{},readFile:async()=>'{"signature":"none"}'};
  const ctx=vm.createContext({console,TextDecoder,hostUseSdk:()=>{},hostSdk:{files},PLAN_VERSION:'v5-llm-editor',
    ensureRuntime:async()=>{},hostIsWindows:()=>true,panelEngine:async()=>({templates:[]}),planningPrompt:()=> 'Plan captions',completePlan:()=>[],
    stepError:(code,message)=>Object.assign(Error(message),{code}),
  });
  vm.runInContext(topLevel(doac,'captionSteps'),ctx);
  const sdk={askAI:async()=>{paidCalls++;return {text:replyText};},runScript:async()=>({result:{meta:{fps:30,frameSize:{width:1080,height:1920}},clips:[{trackKind:'main',endFrame:30}],words:[{text:'Hello',start:0,end:30}]}})};
  return {steps:ctx.captionSteps({sdk,currentProject:()=> 'project-a',onStatus:()=>{},persist}),get paidCalls(){return paidCalls;}};
}

test('DOAC cannot ask AI when the planning intent checkpoint fails',async()=>{
  const p=planningSteps(async()=>{throw Object.assign(Error('storage full'),{storageFailure:true});});
  await assert.rejects(p.steps.prepare({projectId:'project-a',sourceId:'source'}),/storage full/);
  assert.equal(p.paidCalls,0);
});

test('DOAC template checkpoints before initial timeline mutation',async()=>{
  let created=0;
  const ctx=vm.createContext({JSON,Error,captionSteps:()=>({createFromClip:async()=>{created++;return {id:'new-draft'};}}),stepError:(code,message)=>Object.assign(Error(message),{code})});
  vm.runInContext(topLevel(doac,'runCaptionTemplate'),ctx);
  await assert.rejects(ctx.runCaptionTemplate({
    sdk:{storage:{getItem:async()=>null,setItem:async()=>{throw Error('storage full');}}},
    context:{projectId:'project-a',template:{runId:'run-a',inputs:{speaker:[{kind:'video',resourceId:'resource'}]}}},currentProject:()=> 'project-a',onStatus:()=>{},
  }),/save|storage/i);
  assert.equal(created,0);
});

test('DOAC keeps acknowledged AI text before caching and reuses it without another paid call',async()=>{
  let acknowledged, durable;
  const first=planningSteps(async job=>{
    if(job.uncertain){durable=JSON.parse(JSON.stringify(job));return;}
    acknowledged=job;throw Object.assign(Error('checkpoint failed'),{storageFailure:true});
  });
  await assert.rejects(first.steps.prepare({projectId:'project-a',sourceId:'source'}),/checkpoint failed/);
  assert.equal(first.paidCalls,1);assert.equal(durable.uncertain,true);assert.equal(acknowledged.planText,'[]');
  const retry=planningSteps(async()=>{throw Object.assign(Error('stop after recovery'),{storageFailure:true});});
  await assert.rejects(retry.steps.prepare({projectId:'project-a',sourceId:'source',resume:acknowledged}),/stop after recovery/);
  assert.equal(retry.paidCalls,0);
  await assert.rejects(retry.steps.prepare({projectId:'project-a',sourceId:'source',resume:durable}),/not confirmed/);
  assert.equal(retry.paidCalls,0);
});

test('DOAC template restores uncertain source creation without creating another draft',async()=>{
  let created=0;
  const ctx=vm.createContext({JSON,Error,captionSteps:()=>({createFromClip:async()=>{created++;}}),stepError:(code,message)=>Object.assign(Error(message),{code})});
  vm.runInContext(topLevel(doac,'runCaptionTemplate'),ctx);
  await assert.rejects(ctx.runCaptionTemplate({
    sdk:{storage:{getItem:async()=>JSON.stringify({projectId:'project-a',creatingSource:true,uncertain:true}),setItem:async()=>{}}},
    context:{projectId:'project-a',template:{runId:'run-a',inputs:{speaker:[{kind:'video',resourceId:'resource'}]}}},currentProject:()=> 'project-a',onStatus:()=>{},
  }),/not confirmed/);
  assert.equal(created,0);
});

test('DOAC template preserves acknowledged source ID when its checkpoint fails',async()=>{
  let writes=0,created=0,prepared=0,latest,durable;
  const ctx=vm.createContext({JSON,Error,captionSteps:()=>({createFromClip:async()=>{created++;return {id:'already-created'};},prepare:async()=>{prepared++;}}),stepError:(code,message)=>Object.assign(Error(message),{code})});
  vm.runInContext(topLevel(doac,'runCaptionTemplate'),ctx);
  await assert.rejects(ctx.runCaptionTemplate({
    sdk:{storage:{getItem:async()=>null,setItem:async(key,value)=>{assert.equal(key,'doac-style-template:["project-a","run-a"]');if(++writes===1)durable=JSON.parse(value);else throw Error('full');}}},
    context:{projectId:'project-a',template:{runId:'run-a',inputs:{speaker:[{kind:'video',resourceId:'resource'}]}}},currentProject:()=> 'project-a',onStatus:()=>{},onJob:job=>latest=job,
  }),/save caption progress/);
  assert.equal(created,1);assert.equal(prepared,0);assert.equal(latest.sourceId,'already-created');assert.equal(durable.uncertain,true);
});

test('DOAC template awaits restore and resumes saved scenes without creating another source draft',async()=>{
  let resolveRead,created=0,continued=0;
  const saved={...captionJob(),sourceId:'already-created'};
  const ctx=vm.createContext({JSON,Error,captionSteps:()=>({createFromClip:async()=>{created++;},prepare:async()=>{throw Error('Must reuse prepared plan');},create:async job=>{continued++;return {job};}}),stepError:(code,message)=>Object.assign(Error(message),{code})});
  vm.runInContext(topLevel(doac,'runCaptionTemplate'),ctx);
  const result=ctx.runCaptionTemplate({
    sdk:{storage:{getItem:()=>new Promise(resolve=>resolveRead=resolve),setItem:async()=>{}}},
    context:{projectId:'project-a',template:{runId:'run-a',inputs:{speaker:[{kind:'video',resourceId:'resource'}]}}},currentProject:()=> 'project-a',onStatus:()=>{},
  });
  await tick();assert.equal(created,0);assert.equal(continued,0);
  resolveRead(JSON.stringify(saved));assert.equal((await result).job.sourceId,'already-created');
  assert.equal(created,0);assert.equal(continued,1);
});


test('DOAC never automatically reissues an acknowledged empty AI reply',async()=>{
  let acknowledged;
  const first=planningSteps(async job=>{if(job.uncertain)return;acknowledged=job;throw Object.assign(Error('checkpoint failed'),{storageFailure:true});},'');
  await assert.rejects(first.steps.prepare({projectId:'project-a',sourceId:'source'}),/checkpoint failed/);
  assert.equal(first.paidCalls,1);assert.equal(acknowledged.planText,'');
  const retry=planningSteps(async job=>{assert.equal(job.uncertain,false);throw Object.assign(Error('stop after recovery'),{storageFailure:true});});
  await assert.rejects(retry.steps.prepare({projectId:'project-a',sourceId:'source',resume:acknowledged}),/stop after recovery/);
  assert.equal(retry.paidCalls,0);
});
