// Postcard Cutout Studio: the in-panel run ledger (pc-ledger block, for the Windows port) keeps pipeline.py's
// files and rules. The block and the av-host block run in node:vm against a temporary folder, through a FileSystem
// stand-in with the host's method names; bytes come from another realm, as they do from window.parent.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { topLevel } from './windows_host.mjs';

const panel=fs.readFileSync(path.resolve(import.meta.dirname,'../plugins/postcard-cutout-studio/panel.tsx'),'utf8');
const block=name=>{const m=panel.match(new RegExp('// '+name+':start\\n[\\s\\S]*?// '+name+':end'));assert.ok(m,name+' block');return m[0]};

function ledger(store,opts={}){
 const other=vm.runInNewContext('({bytes:s=>new Uint8Array([...s].map(c=>c.charCodeAt(0)))})');
 const FileSystem={join:(...p)=>path.join(...p),dirname:p=>path.dirname(p),homedir:()=>store,exists:async p=>fs.existsSync(p),mkdir:async(p,o)=>fs.mkdirSync(p,o),
  readFile:async p=>other.bytes(Buffer.from(fs.readFileSync(p)).toString('latin1')),writeFile:async(p,d)=>fs.writeFileSync(p,d),rename:async(a,b)=>fs.renameSync(a,b),
  readdir:async p=>fs.readdirSync(p),stat:async p=>fs.statSync(p)};
 const sdk={files:FileSystem,environment:{platform:'win32',version:'2.0.520'}};
 const ctx={sdk,panelLocalClient:s=>s,window:{parent:{get __DI__(){throw Error('Migrated operations must not use DI');}}},navigator:{},TextDecoder,crypto:globalThis.crypto,Date,JSON,Promise,Error,Object,Number,String,Math};
 vm.createContext(ctx);
 vm.runInContext(block('av-host')+'\n'+block('pc-ledger')+'\nbindLocalSdk(sdk);this.pcLedger=pcLedger;',ctx);
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

// The paid step: createRunner's generation() runs in node:vm with stubbed host calls. A confirm that answers no
// (the Panel's Cancel) or the default (no confirm handed over) stops before claim, import and submit. A template run
// hands over a confirm that answers yes: starting the template is the consent (2026-10-06).
function runner(confirmCredits){
 const calls=[],ctx=vm.createContext({calls,console,Date,setTimeout,
  helper:async(_sdk,op,args)=>{calls.push(op);return op==='claim'?{claimed:true,run:{runId:'r',projectId:'p',phase:'generationSubmitting',settings:{subjectStartSec:0},source:{path:'/s.mp4'},logDir:'/logs/r'}}:op==='cutout-input'?{path:'/c.mp4'}:{phase:'generationPending'}},
  runScript:async(_sdk,script)=>{calls.push(/importFiles/.test(script)?'importFiles':'script')},
  sdkGeneration:()=>({submit:async()=>{calls.push('submit');return{jobIds:['selects-'+'a'.repeat(64)]}},supportsPluginFiles:()=>false}),
  generationScope:()=>({libraryId:'l',projectId:'p'}),appResourceIdForPath:async()=>calls.includes('importFiles')?'res':null,hostIsWindows:()=>true,hostJoin:(...p)=>p.join('/')});
 const consts=['CUTOUT_SECONDS','CREDITS_NOTICE','CREDITS_DECLINED','TEMPLATE_CREDITS','BRIA_MODEL_ID','json'].map(n=>topLevel(panel,n)).join('\n');
 vm.runInContext(consts+'\n'+topLevel(panel,'createRunner')+'\nthis.make=createRunner;',ctx);
 const opts={sdk:{},guard:()=>{}};if(confirmCredits)opts.confirmCredits=confirmCredits;
 return {r:ctx.make(opts),calls};
}
const ready={runId:'r',projectId:'p',phase:'ready',settings:{subjectStartSec:0},source:{path:'/s.mp4'},logDir:'/logs/r'};
test('Cancel on the credit card stops before claim, import and submit',async()=>{
 const asked=[],{r,calls}=runner(async run=>{asked.push(run.runId);return false});
 await assert.rejects(r.generation({...ready}),e=>e.creditsDeclined===true&&/no credits were used/.test(e.message));
 assert.deepEqual(asked,['r']);assert.deepEqual(calls,[]);
});
test('a runner with no confirm handed over still refuses the paid step before anything',async()=>{
 const {r,calls}=runner(null);
 await assert.rejects(r.generation({...ready}),/Open Postcard Cutout Studio and press Create to confirm/);
 assert.deepEqual(calls,[]);
});
test('Use credits and continue submits once; a confirmed run resubmitting is not asked again',async()=>{
 let asked=0;const {r,calls}=runner(async()=>{asked++;return true});
 await r.generation({...ready});
 assert.deepEqual(calls.filter(c=>['claim','importFiles','submit'].includes(c)),['claim','importFiles','submit']);
 await r.generation({...ready,phase:'generationSubmitting'});
 assert.equal(asked,1);
});
