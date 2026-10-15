'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const modulesRoot = process.env.SBS_PANEL_TEST_MODULES;

test('SBS transcript readiness', {skip: !modulesRoot && 'Set SBS_PANEL_TEST_MODULES'}, async t => {
  const dependency = createRequire(path.join(path.resolve(modulesRoot), '..', 'package.json'));
  const ts = dependency('typescript'), esbuild = dependency('esbuild');
  const source = fs.readFileSync(path.join(__dirname, '../plugins/sbs-radio-clip/panel.tsx'), 'utf8');
  const ast = ts.createSourceFile('panel.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let waitFunction, resolver;
  function visit(n) {
    if (ts.isFunctionDeclaration(n) && n.name?.text === 'ensureTranscriptReady') waitFunction = n.getText(ast);
    if (ts.isVariableDeclaration(n) && n.name.getText(ast) === 'resolver') resolver = n.initializer.getText(ast);
    ts.forEachChild(n, visit);
  }
  visit(ast);
  assert.ok(waitFunction && resolver);
  const extra = `\nexport {SCRIPT_SOURCE_READER,SCRIPT_TRANSCRIPT};
export function waitForTranscript(deps) {
 const {script,guard,sleep,setStatus,setSub,S}=deps;
 const projectId='project';const resolver=${resolver};
 ${waitFunction}
 return ensureTranscriptReady('r1','source.mp4');
}`;
  const loaded = {exports:{}};
  new Function('require','module','exports',esbuild.transformSync(source+extra,{loader:'tsx',format:'cjs'}).code)(dependency,loaded,loaded.exports);
  const api=loaded.exports;
  const run = (body, selects) => new Function('selects',esbuild.transformSync('return (async()=>{'+body+'})();',{loader:'ts'}).code)(selects);
  const word = (word,start,end)=>({word,start,end});
  const project = {
    resources:async()=>[{resourceId:'r1',name:'source.mp4',status:'analyzing',hasAnalysis:false,hasTranscription:true,durationSeconds:10}],
    resource:()=>{throw Error('Analysis-gated source access');},
    sourceFiles:async()=>({fileTree:[{type:'video',resourceId:'r1',frameRate:30000/1001,durationSeconds:10,frameSize:{width:1920,height:1080}}]}),
    transcription:async()=>({utterances:[
      {resourceId:'other',speaker:0,words:[word('Excluded',0,1)]},
      {resourceId:'r1',speaker:2,utteranceId:'u',words:[word('Hello',1,1.4),{...word('world',1.5,2),punctuatedWord:'world.'},word('',2,3)]},
    ]}),
  };
  const read = p => run(api.SCRIPT_SOURCE_READER+'return await readClipSource(selects.project("project"),"r1");',{project:()=>p});
  await t.test('reads only the selected persisted transcript while analysis is still running',async()=>{
    const result=await read(project);
    assert.deepEqual(result.words.map(w=>w.text),['Hello','world.']);
    assert.equal(result.words[0].speakerId,2);
    assert.equal(result.words[0].startFrame/result.meta.fps,1);
    const body=api.SCRIPT_TRANSCRIPT.replace('const P: any = __P__;','const P: any = '+JSON.stringify({projectId:'project',resourceId:'r1',resourceName:'source.mp4',offset:0,limit:250})+';');
    assert.deepEqual(await run(body,{project:()=>project}),{duration:10,total:1,lines:[[1,2,'Hello world.']]});
  });
  await t.test('resolves file metadata in large nested project inventories',async()=>{
    const folders=[];
    const result=await read({...project,sourceFiles:async opts=>{
      if(!opts)return {mode:'summary',folders:[{name:'A'},{name:'B'}]};
      folders.push(opts.folder);
      return {fileTree:opts.folder==='A'?[]:[{type:'dir',children:[{type:'video',resourceId:'r1',frameRate:25,durationSeconds:10}]}]};
    }});
    assert.deepEqual(folders,['A','B']);
    assert.equal(result.meta.fps,25);
  });
  await t.test('refuses to invent a frame rate when early source metadata is missing',async()=>{
    await assert.rejects(read({...project,sourceFiles:async()=>({fileTree:[]})}),/metadata is not available/);
  });
  const wait = async (states,{active=false,startError=null,cancel=false}={})=>{
    let index=0,started=0,sleeps=0;
    const p={
      resources:async()=>[{resourceId:'r1',name:'source.mp4',...states[Math.min(index++,states.length-1)]}],
      workflows:async()=>active?[{resourceId:'r1',status:'running'}]:[],
      startAnalysis:async()=>{started++;if(startError)throw Error(startError);return {};},
    };
    await api.waitForTranscript({
      script:body=>run(body,{project:()=>p}),
      guard:async promise=>{await promise;if(cancel)throw Error('cancelled');},
      sleep:async()=>{if(++sleeps>3)throw Error('Waited after transcript was ready');},
      setStatus:()=>{},setSub:()=>{},
      S:{confirmCredits:'confirm',waitingAnalysis:'waiting',confirmMissed:'confirmation missed',analysisFailed:s=>'analysis failed '+s},
    });
    return {started,sleeps};
  };
  await t.test('starts immediately for ready transcripts, including later visual-analysis failure',async()=>{
    for(const status of ['analyzing','analyzingFailed','analyzingSucceeded'])
      assert.deepEqual(await wait([{status,hasAnalysis:false,hasTranscription:true}]),{started:0,sleeps:0});
  });
  await t.test('joins active analysis and stops polling as soon as transcription is saved',async()=>{
    assert.deepEqual(await wait([
      {status:'analyzing',hasAnalysis:false,hasTranscription:false},
      {status:'analyzing',hasAnalysis:false,hasTranscription:true},
    ],{active:true}),{started:0,sleeps:1});
  });
  await t.test('requests analysis only when missing, and preserves denial, failure and cancellation',async()=>{
    assert.deepEqual(await wait([
      {status:'pending',hasTranscription:false},
      {status:'analyzing',hasTranscription:true},
    ]),{started:1,sleeps:1});
    await assert.rejects(wait([{status:'pending'}],{startError:'Analysis canceled by user'}),/confirmation missed/);
    await assert.rejects(wait([{status:'analyzing'},{status:'analyzingFailed'}]),/analysis failed/);
    await assert.rejects(wait([{status:'analyzing'}],{cancel:true}),/cancelled/);
    assert.deepEqual(await wait([{status:'analyzingSucceeded',hasAnalysis:true}]),{started:0,sleeps:0},'Older hosts without hasTranscription remain supported');
  });
});
