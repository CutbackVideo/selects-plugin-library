const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('parallel usage and persistence',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild');
 const src=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8'),mod={exports:{}};
 new Function('require','module','exports',esbuild.transformSync(src+'\nexport {askReframingAI,reframingTokenLabel,jobTokenLabel};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
 const {askReframingAI,reframingTokenLabel,jobTokenLabel}=mod.exports;
 await t.test('records actual usage and failed attempts without accepting counts from model text',async()=>{
  const events=[],context={guard:p=>p,note:e=>events.push(e),sdk:{askAI:async()=>({text:'{"usage":{"input_tokens":99999}}',usage:{input_tokens:120,output_tokens:30}})}};
  await askReframingAI(context,{});
  context.sdk.askAI=async()=>{throw Error('timeout');};
  await assert.rejects(askReframingAI(context,{}),/timeout/);
  assert.deepEqual(events.map(e=>e.usage),[{input_tokens:120,output_tokens:30},null]);
  const R={tokensUnavailable:'unavailable',partialTokens:'partial',tokenFields:['in','out','read','write']};
  assert.equal(reframingTokenLabel({reframeUsageCalls:events.map(e=>e.usage)},R),'in 120 · out 30 (partial)');
  assert.equal(reframingTokenLabel({},R),'unavailable');
  assert.equal(reframingTokenLabel({reframeUsageCalls:[{input_tokens:0,output_tokens:0}]},R),'in 0 · out 0');
 });
 await t.test('job totals combine shared calls once with all clip retries and mark old coverage partial',()=>{
  const R={tokensUnavailable:'unavailable',partialTokens:'partial',tokenFields:['in','out','read','write']};
  const job={usageTracking:true,sharedUsageCalls:[{stage:'choose',usage:{input_tokens:100,output_tokens:20}}],built:[
   {reframeUsageCalls:[{input_tokens:50,output_tokens:10},{input_tokens:30,output_tokens:5}]},
   {reframeUsageCalls:[{input_tokens:70,output_tokens:15}]},
   {reframeState:'skipped'}]};
  assert.equal(jobTokenLabel(job,R),'in 250 · out 50');
  assert.equal(jobTokenLabel({...job,usageTracking:undefined},R),'in 250 · out 50 (partial)');
  job.sharedUsageCalls.push({stage:'identify',usage:null});
  assert.equal(jobTokenLabel(job,R),'in 250 · out 50 (partial)');
  assert.equal(jobTokenLabel({built:[{draftId:'old'}]},R),'unavailable');
 });
 await t.test('shared usage persists before parsing and preserves failed attempts on resume',async()=>{
  const start=src.indexOf('    const askShared =');
  const end=src.indexOf('    try {\n      const list',start);
  const code=esbuild.transformSync(src.slice(start,end),{loader:'ts'}).code;
  let job={sharedUsageCalls:[{stage:'identify',usage:{input_tokens:10,output_tokens:2}}]};
  const snapshots=[];
  const env={job,persist:async patch=>{Object.assign(job,structuredClone(patch));snapshots.push(structuredClone(job));},guard:p=>p,sdk:{askAI:async()=>({text:'invalid JSON',usage:{input_tokens:100,output_tokens:20}})}};
  const ask=new Function(...Object.keys(env),code+'return askShared;')(...Object.values(env));
  await ask('choose')({});
  assert.equal(snapshots[0].sharedUsageCalls[1].usage,null);
  assert.equal(job.sharedUsageCalls[1].usage.input_tokens,100);
  env.sdk.askAI=async()=>{throw Error('timeout');};
  await assert.rejects(ask('choose')({}),/timeout/);
  assert.equal(job.sharedUsageCalls.length,3);
  assert.equal(job.sharedUsageCalls[2].usage,null);
 });
 await t.test('queued writes hold immutable snapshots and finish in revision order',async()=>{
  const start=src.indexOf('    let saveQueue:');
  const end=src.indexOf('    try {\n      const list',start);
  const code=esbuild.transformSync(src.slice(start,end),{loader:'ts'}).code;
  const writes=[],release=[];
  const env={clone:structuredClone,setRunInfo:()=>{},saveJob:snapshot=>new Promise(resolve=>{writes.push(snapshot);release.push(resolve);}),resultProject:{current:'other'}};
  const persist=new Function(...Object.keys(env),'let job={id:"j",projectId:"p"};'+code+'return persist;')(...Object.values(env));
  const made=[{draftId:'a',reframeState:'pending'}];
  const first=persist({built:made});
  made[0]={draftId:'a',reframeState:'done'};
  const second=persist({built:made});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(writes.length,1);assert.equal(writes[0].built[0].reframeState,'pending');
  release[0]();await first;
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(writes.length,2);assert.equal(writes[1].built[0].reframeState,'done');
  release[1]();await second;
 });
});
