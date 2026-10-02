// Postcard Cutout Studio: the in-panel run ledger (pc-ledger block, for the Windows port) keeps pipeline.py's
// files and rules. The block and the av-host block run in node:vm against a temporary folder, through a FileSystem
// stand-in with the host's method names; bytes come from another realm, as they do from window.parent.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

const panel=fs.readFileSync(path.resolve(import.meta.dirname,'../plugins/postcard-cutout-studio/panel.tsx'),'utf8');
const block=name=>{const m=panel.match(new RegExp('// '+name+':start\\n[\\s\\S]*?// '+name+':end'));assert.ok(m,name+' block');return m[0]};

function ledger(store,opts={}){
 const other=vm.runInNewContext('({bytes:s=>new Uint8Array([...s].map(c=>c.charCodeAt(0)))})');
 const FileSystem={join:(...p)=>path.join(...p),dirname:p=>path.dirname(p),homedir:()=>store,existsSync:p=>fs.existsSync(p),mkdirSync:(p,o)=>fs.mkdirSync(p,o),
  readFile:async p=>other.bytes(Buffer.from(fs.readFileSync(p)).toString('latin1')),writeFile:async(p,d)=>fs.writeFileSync(p,d),renameSync:(a,b)=>fs.renameSync(a,b),
  readdirSync:p=>fs.readdirSync(p),statSync:p=>fs.statSync(p)};
 const ctx={window:{parent:{__DI__:{FileSystem,Runtime:{getPlatform:()=>'win32'}}}},navigator:{},TextDecoder,crypto:globalThis.crypto,Date,JSON,Promise,Error,Object,Number,String,Math};
 vm.createContext(ctx);
 vm.runInContext(block('av-host')+'\n'+block('pc-ledger')+'\nthis.pcLedger=pcLedger;',ctx);
 return ctx.pcLedger(store,opts);
}
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'pc-ledger-'));
const settings={subjectId:'r1',subjectStartSec:0};

test('init starts one run per project and keeps an unsettled one',async()=>{
 const store=tmp(),source=path.join(store,'clip.mp4');fs.writeFileSync(source,'x');
 const L=ledger(store,{sfx:async()=>({tone:{path:'t.wav'}})});
 const d=await L.init({projectId:'p1',settings,source:{path:source}});
 assert.equal(d.phase,'ready');assert.match(d.runId,/^[a-f0-9-]{36}$/);
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(store,'active-runs.json'),'utf8')),{p1:d.runId});
 assert.deepEqual(d.sfx,{tone:{path:'t.wav'}});
 assert.equal(d.sourceIdentity.size,1);
 assert.ok(fs.existsSync(path.join(store,'runs',d.runId,'run.json')));
 assert.ok(fs.existsSync(path.join(d.logDir,'run.json')));
 const again=await L.init({projectId:'p1',settings,source:{path:source}});
 assert.equal(again.runId,d.runId,'an unsettled run is returned, not duplicated');
 await assert.rejects(L.init({projectId:'p1',replaceSettled:true,previousRunId:d.runId,settings,source:{path:source}}),/still active/);
 assert.equal((await L.load({projectId:'p1'})).runId,d.runId);
 assert.equal(await L.load({projectId:'p2'}),null);
 await assert.rejects(L.load({runId:'../x'}),/Invalid run id/);
});

test('claim is first come, first served, and every step is logged',async()=>{
 const store=tmp(),source=path.join(store,'clip.mp4');fs.writeFileSync(source,'x');
 const L=ledger(store);
 const d=await L.init({projectId:'p1',settings,source:{path:source}});
 const [a,b]=await Promise.all([L.claim({runId:d.runId,expected:['ready'],patch:{phase:'generationSubmitting'},stage:'generation'}),
  L.claim({runId:d.runId,expected:['ready'],patch:{phase:'generationSubmitting'},stage:'generation'})]);
 assert.deepEqual([a.claimed,b.claimed],[true,false]);
 const u=await L.update({runId:d.runId,patch:{phase:'draftReady',draftId:'s1'},stage:'assembly',status:'end'});
 assert.equal(u.draftId,'s1');
 await L.event({runId:d.runId,stage:'pipeline',status:'failed',details:{error:'x'}});
 const events=fs.readFileSync(path.join(d.logDir,'events.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
 assert.deepEqual(events.map(e=>e.stage+'/'+e.status),['run/start','generation/start','assembly/end','pipeline/failed']);
 assert.match(events[0].at,/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d{4}$/);
 const next=await L.init({projectId:'p1',replaceSettled:true,previousRunId:d.runId,settings,source:{path:source}});
 assert.notEqual(next.runId,d.runId,'a settled run is replaced on request');
});

test('a finished cutout of the same stretch is reused',async()=>{
 const store=tmp(),source=path.join(store,'clip.mp4');fs.writeFileSync(source,'x');
 const L=ledger(store);
 const first=await L.init({projectId:'p1',settings,source:{path:source}});
 const masks=path.join(store,'runs',first.runId,'masks');fs.mkdirSync(masks);
 for(const i of [1,2])fs.writeFileSync(path.join(masks,'mask_00000'+i+'.png'),'png');
 await L.update({runId:first.runId,patch:{phase:'complete',mask:{path:masks,count:2,provenanceOk:true}}});
 const second=await L.init({projectId:'p1',settings,source:{path:source}});
 assert.equal(second.phase,'maskReady');assert.equal(second.reusedFromRunId,first.runId);
 const other=await L.init({projectId:'p1',replaceSettled:true,previousRunId:second.runId,settings:{...settings,subjectStartSec:1},source:{path:source}}).catch(e=>e);
 assert.match(String(other.message||other),/still active/,'maskReady is not settled');
});

// The credit gate: createRunner runs in node:vm with the host stubbed, so a paid submit is observable.
function runnerWith({mayCharge,run}){
 const m=panel.match(/function createRunner\([\s\S]*?\nreturn \{persist,claim,generation,exportRun,build\};\n\}/);assert.ok(m,'createRunner');
 const calls=[],submits=[];let current={...run};
 const helper=async(_sdk,op,a={})=>{calls.push(op);
  if(op==='load'||op==='reuse')return {...current};
  if(op==='claim'){if(!a.expected.includes(current.phase))return{claimed:false,run:current};current={...current,...a.patch};return{claimed:true,run:{...current}}}
  if(op==='update'){current={...current,...a.patch};return{...current}}
  if(op==='ensure'||op==='event')return {};
  if(op==='cutout-input')return {path:'/tmp/in.mp4'};
  throw Error('unexpected op '+op)};
 const ctx={helper,appServices:()=>({MediaGeneration:{submit:async x=>{submits.push(x);return{jobIds:['selects-'+'a'.repeat(64)]}},list:async()=>[]}}),
  generationScope:()=>({kind:'library',id:'lib'}),appResourceIdForPath:async()=>'res-1',runScript:async()=>{throw Error('no script')},
  BRIA_MODEL_ID:'m',CUTOUT_SECONDS:1.6,GENERATION_CHECKS:0,GENERATION_POLL_MS:0,hostIsWindows:()=>false,hostJoin:(...p)=>p.join('/'),
  json:JSON.stringify,sleep:async()=>{},window:{},Date,JSON,Promise,Error,Object,Number,String,Math};
 vm.createContext(ctx);
 vm.runInContext(m[0]+'\nthis.createRunner=createRunner;',ctx);
 const runner=ctx.createRunner({sdk:{},guard:()=>{},...(mayCharge?{mayCharge}:{})});
 return {runner,calls,submits,get current(){return current}};
}
const readyRun={runId:'11111111-1111-1111-1111-111111111111',projectId:'p1',phase:'ready',settings:{subjectStartSec:0},source:{path:'/tmp/s.mp4'},logDir:'/tmp/log',cutoutInput:{path:'/tmp/in.mp4'}};

test('the panel stops before a paid cutout until the user confirms',async()=>{
 const t=runnerWith({mayCharge:()=>false,run:readyRun});
 const out=await t.runner.build('resume',{pid:'p1',settings:readyRun.settings,rows:[],run:readyRun});
 assert.equal(out.phase,'ready');assert.equal(t.submits.length,0);assert.ok(!t.calls.includes('claim'),'nothing claimed');
 const direct=await t.runner.generation({...readyRun},false).catch(e=>e);
 assert.match(String(direct.message),/not confirmed/);assert.equal(t.submits.length,0);assert.equal(t.current.phase,'ready');
});

test('a confirmed panel run submits once',async()=>{
 const ok=new Set([readyRun.runId]),t=runnerWith({mayCharge:r=>ok.has(r.runId),run:readyRun});
 const out=await t.runner.build('resume',{pid:'p1',settings:readyRun.settings,rows:[],run:readyRun});
 assert.equal(t.submits.length,1);assert.equal(t.submits[0].key,'pc-'+readyRun.runId);assert.equal(out.phase,'generationPending');
});

test('a resumed submission is not asked again and keeps its key',async()=>{
 const run={...readyRun,phase:'generationSubmitting'},t=runnerWith({mayCharge:()=>false,run});
 await t.runner.build('resume',{pid:'p1',settings:run.settings,rows:[],run});
 assert.equal(t.submits.length,1);assert.equal(t.submits[0].key,'pc-'+run.runId,'same idempotent key, no second job');
 const pending={...readyRun,phase:'generationPending',generation:{jobId:'selects-'+'b'.repeat(64),scope:{}}},p=runnerWith({mayCharge:()=>false,run:pending});
 await p.runner.build('resume',{pid:'p1',settings:pending.settings,rows:[],run:pending});
 assert.equal(p.submits.length,0,'a pending job is only checked');
});

test('a template run is not gated',async()=>{
 const t=runnerWith({run:readyRun});
 await t.runner.generation({...readyRun},false);
 assert.equal(t.submits.length,1);
});
