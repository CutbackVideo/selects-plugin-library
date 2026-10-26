import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {loadPanelModule,disposePanelModule} from './panel_module_fixture.mjs';
const source=fs.readFileSync(new URL('../plugins/chris-williamson-style/panel.tsx',import.meta.url),'utf8');
const plain=x=>JSON.parse(JSON.stringify(x));
function moduleFixture(extra={}) {
 let now=0;const api=loadPanelModule(source,{names:['searchBrollQuery','chooseAssets','notifyTemplateIssues','templateIssueNotice','TemplateRun'],globals:{Date:{now:()=>now}},...extra});
 return {api,tick:n=>now+=n,dispose:()=>disposePanelModule(api)};
}
for(const message of ['Something went wrong with the agent','\uc5d0\uc774\uc804\ud2b8\uc5d0 \ubb38\uc81c\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.','Network transport unavailable','Authentication unavailable']) {
 test('read-only search retries once regardless of display language: '+message,async()=>{
  const f=moduleFixture(),calls=[],status=[],cause=Error(message);let call=0;
  try {const result=await f.api.searchBrollQuery({askAI:async(prompt,timeout)=>{calls.push({prompt,timeout});f.tick(1000);if(!call++)throw cause;return JSON.stringify({candidates:[{url:'https://example.invalid/valid.mp4'}]});},status:s=>status.push(s)},'q','same query prompt',async()=>[]);assert.equal(result.length,1);assert.deepEqual(calls.map(c=>c.timeout),[240000,239000]);assert.equal(calls[0].prompt,calls[1].prompt);assert.equal(status.filter(s=>/^Retrying search \(attempt 2\/2\)/.test(s)).length,1);}finally{f.dispose();}
 });
}
test('two persistent unknown errors stop at two attempts and retain both exact causes',async()=>{
 const f=moduleFixture(),errors=[Error('\uc5d0\uc774\uc804\ud2b8 \uccab \uc2e4\ud328: detail A'),Error('Authentication unavailable: detail B')];let calls=0;
 try {await assert.rejects(f.api.searchBrollQuery({askAI:async()=>{throw errors[calls++];},status:()=>{}},'q','prompt',async()=>[]),e=>{assert.equal(e.cause,errors[1]);assert.deepEqual(plain(e.searchFailures),[{attempt:0,message:errors[0].message},{attempt:1,message:errors[1].message}]);return true;});assert.equal(calls,2);}finally{f.dispose();}
});
test('a matching sidecar recovered after the first failure prevents a new AI turn',async()=>{
 const f=moduleFixture();let calls=0;
 try {const result=await f.api.searchBrollQuery({askAI:async()=>{calls++;throw Error('\ud55c\uad6d\uc5b4 \uc2e4\ud328');},status:()=>{}},'q','prompt',async()=>[{page:'saved matching request'}]);assert.equal(calls,1);assert.equal(result[0].page,'saved matching request');}finally{f.dispose();}
});
test('cancel and supersede before call, during rejection/readback, or status never dispatch a retry',async()=>{
 for(const at of ['before','reject','readback','status']){
  const f=moduleFixture(),controller=new AbortController();let calls=0;if(at==='before')controller.abort();
  try {await assert.rejects(f.api.searchBrollQuery({signal:controller.signal,status:()=>{if(at==='status')controller.abort();},askAI:async()=>{calls++;if(at==='reject')controller.abort();throw Error('late request failed');}},'q','prompt',async()=>{if(at==='readback')controller.abort();return [];}));assert.equal(calls,at==='before'||at==='status'?0:1);}finally{f.dispose();}
 }
});
test('abort after resolved AI or recovered sidecar cannot return stale candidates',async()=>{
 for(const phase of ['AI','sidecar']){
  const f=moduleFixture(),controller=new AbortController();let calls=0;
  try {await assert.rejects(f.api.searchBrollQuery({signal:controller.signal,status:()=>{},askAI:async()=>{calls++;if(phase==='AI'){controller.abort();return '{"candidates":[{"page":"stale"}]}';}throw Error('unknown');}},'q','prompt',async()=>{controller.abort();return [{page:'late'}];}));assert.equal(calls,1);}finally{f.dispose();}
 }
});
test('query preparation, sidecar reads and first call share the same 240s budget',async()=>{
 const f=moduleFixture();let calls=0;
 try {await assert.rejects(f.api.searchBrollQuery({status:()=>{},askAI:async()=>{calls++;f.tick(239000);throw Error('unknown');}},'q','prompt',async()=>{f.tick(1001);return [];}));assert.equal(calls,1);}finally{f.dispose();}
});
test('attempt workspace preparation counts against the query deadline and observes supersession',async()=>{
 for(const abort of [false,true]){
  const f=moduleFixture(),controller=new AbortController();let calls=0;
  try {await assert.rejects(f.api.searchBrollQuery({signal:controller.signal,status:()=>{},askAI:async()=>{calls++;return '{}';}},'q',async()=>{if(abort)controller.abort();else f.tick(240001);return 'prompt';},async()=>[]));assert.equal(calls,0);}finally{f.dispose();}
 }
});
function assetsFixture({failures=1,lateFirst=true}={}){
 const files=new Map(),calls=[],status=[],warnings=[],attemptDirs=[];let searches=0;
 const f=moduleFixture({overrides:{mkdirs:async p=>attemptDirs.push(p)}}),env={ffmpeg:'/bin/ffmpeg',pluginDir:'/plugin',node:async()=>'/node',status:s=>status.push(s),runScript:async()=>[],writeText:async(p,t)=>files.set(p,t),readText:async p=>{if(p.endsWith('candidates-result.json')){const job=JSON.parse(files.get(p.replace('candidates-result.json','candidates.json')));return JSON.stringify({items:job.candidates.items.map(item=>({...item,candidates:[]}))});}if(p.endsWith('assets-result.json'))return '{"items":[]}';if(files.has(p))return files.get(p);throw Error('No sidecar');},runShell:async()=>{},imageData:async()=>'',askAI:async(prompt,timeout)=>{
   assert.ok(prompt.startsWith('Find B-roll'));const match=prompt.match(/immediately overwrite ("(?:[^"\\]|\\.)*")/);assert.ok(match);const file=JSON.parse(match[1]);calls.push({prompt,timeout,file});searches++;
   if(searches<=failures)throw Error(searches===1?'\uc5d0\uc774\uc804\ud2b8\uc5d0 \ubb38\uc81c\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.':'Second permanent exact failure');
   if(lateFirst)files.set(calls[0].file,JSON.stringify({candidates:[{url:'https://example.invalid/stale-first.mp4'}]}));
   return '{"candidates":[]}';
 }};
 return {...f,env,files,calls,status,warnings,attemptDirs,run:()=>f.api.chooseAssets(env,'/owned/job','/owned/media',{brolls:[{key:{text:'charge',start:100,end:110},start:100,end:120,query:'actual query'}]},10,'owned-project',{},warnings,'b',[{text:'Taking responsibility',startFrame:99,endFrame:111}])};
}
test('whole assets path isolates retry sidecars/workspaces and never revives a late first attempt',async()=>{
 const f=assetsFixture();try{await f.run();assert.equal(f.calls.length,2);assert.notEqual(f.calls[0].file,f.calls[1].file);assert.notEqual(path.dirname(f.calls[0].file),path.dirname(f.calls[1].file));for(const c of f.calls){assert.ok(c.prompt.includes(path.dirname(c.file)));assert.ok(c.prompt.includes('Taking responsibility'));assert.ok(c.prompt.includes('Do not write downloads, candidates or sidecars outside this attempt workspace'));}const job=JSON.parse(f.files.get('/owned/job/candidates.json'));assert.deepEqual(job.candidates.items[0].candidates,[]);assert.ok(f.files.has(f.calls[0].file));}finally{f.dispose();}
});
test('a new query/context scope never reuses an earlier invocation sidecar in the same job folder',async()=>{
 const f=assetsFixture();try{await f.run();const previous=f.calls.map(c=>c.file);await f.api.chooseAssets(f.env,'/owned/job','/owned/media',{brolls:[{key:{text:'charge',start:100,end:110},start:100,end:120,query:'actual query'}]},10,'owned-project',{},[],'b',[{text:'SECOND_CONTEXT_ONLY',startFrame:99,endFrame:111}]);const current=f.calls.at(-1);assert.ok(current.prompt.includes('SECOND_CONTEXT_ONLY'));assert.ok(!previous.includes(current.file));assert.ok(!previous.some(p=>path.dirname(p)===path.dirname(current.file)));const job=JSON.parse(f.files.get('/owned/job/candidates.json'));assert.deepEqual(job.candidates.items[0].candidates,[]);assert.equal(job.candidates.items[0].context,'SECOND_CONTEXT_ONLY');}finally{f.dispose();}
});
test('exhausted search retains each exact error in the full report warning, with no extra query',async()=>{
 const f=assetsFixture({failures:2});try{await f.run();assert.equal(f.calls.length,2);assert.ok(f.warnings.some(w=>w.includes('\uc5d0\uc774\uc804\ud2b8\uc5d0 \ubb38\uc81c\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.')));assert.ok(f.warnings.some(w=>w.includes('Second permanent exact failure')));assert.ok(f.warnings.some(w=>w.includes('trying credited Commons photographs')));}finally{f.dispose();}
});
test('actual TemplateRun notification path reports partial saved result and dismissal cannot regenerate',async()=>{
 const effects=[],finishes=[],notices=[],saved={draftId:'only-saved-draft',jobDir:'/owned/job',warnings:['B-roll search failed for \u201cq\u201d; trying credited Commons photographs: \ud55c\uad6d\uc5b4 \uc6d0\uc778']};let pipelineCalls=0;
 const React={useRef:x=>({current:x}),useState:x=>[x,()=>{}],useEffect:f=>effects.push(f),createElement:()=>null};
 const f=moduleFixture({React,overrides:{useAppUpdateGuard:()=>{},templatePaths:async()=>({data:'/owned',plugin:'/plugin',ffmpeg:'/ffmpeg'}),panelEnv:()=>({status:()=>{},writeText:async()=>{}}),runPipeline:async()=>{pipelineCalls++;return saved;}}});
 const sdk={confirm:async notice=>{notices.push(notice);return false;},finishTemplate:r=>finishes.push(r)};
 try{f.api.TemplateRun({sdk,context:{projectId:'owned-project',language:'ko',template:{runId:'one-run',inputs:{speaker:[{kind:'timeline',sequenceId:'retained-input'}]}}}});effects.at(-1)();for(let i=0;i<6;i++)await Promise.resolve();await new Promise(resolve=>setImmediate(resolve));assert.equal(pipelineCalls,1);assert.equal(notices.length,1);assert.ok(notices[0].message.includes('1'));assert.ok(notices[0].message.includes('/owned/job/report.json'));assert.deepEqual(plain(finishes),[{sequenceId:'only-saved-draft'}]);assert.equal(saved.notification.acknowledged,false);}finally{f.dispose();}
});
