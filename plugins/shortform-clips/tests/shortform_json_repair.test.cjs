const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('bounded JSON syntax repair',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),m={exports:{}};
 new Function('require','module','exports',dep('esbuild').transformSync(fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8')+'\nexport {parseReframePlanWithRepair,RunCancelled};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 const plan={version:1,draftId:'draft',status:'planned',shots:[{startFrame:0,endFrame:49,compositionId:'host-solo',layout:'speaker',panels:[{camera:'r',targets:[{subjectId:'host',refs:['F0']}]}],reason:'Host before source cut.'}]};
 const valid=JSON.stringify(plan),broken=valid.replace('],"reason":',']},"reason":'); // Production failure: premature shot-closing brace.
 async function run(text=broken,answer=valid,budget={used:false}){
  const requests=[],events=[];const task=m.exports.parseReframePlanWithRepair({text,draftId:'draft',budget,guard:p=>p,note:async e=>events.push(e),sdk:{askAI:async r=>{requests.push(r);if(answer instanceof Error)throw answer;return {text:answer,usage:{output_tokens:12}}}}});
  return {task,requests,events,budget};
 }
 await t.test('normal and fenced JSON never invoke AI',async()=>{for(const text of [valid,'Done\n```json\n'+valid+'\n```']){const r=await run(text);assert.deepEqual(await r.task,plan);assert.equal(r.requests.length,0);}});
 await t.test('production premature brace is repaired with original text and exact parser error',async()=>{
  const r=await run();assert.deepEqual(await r.task,plan);assert.equal(r.requests.length,1);const req=r.requests[0];assert.equal(req.images,undefined);assert.equal(req.timeoutMs,120000);assert.match(req.prompt,/Do not use tools/);assert.ok(req.prompt.includes(JSON.stringify(broken)));assert.ok(req.prompt.includes(r.events[0].error));assert.ok(r.events.some(e=>e.plan==='reframe-usage'&&e.usage.output_tokens===12));
 });
 await t.test('changed identity, time, layout and missing shots are rejected',async()=>{
  for(const answer of [valid.replace('"host"','"guest"'),valid.replace('49','50'),valid.replace('"speaker"','"wide"'),JSON.stringify({...plan,shots:[]})]){const r=await run(broken,answer);await assert.rejects(r.task,/changed plan values/);assert.equal(r.requests.length,1);}
 });
 await t.test('malformed correction and request errors are terminal',async()=>{for(const answer of [broken,new Error('timeout')]){const r=await run(broken,answer);await assert.rejects(r.task,/repair failed/);assert.equal(r.requests.length,1);assert.equal(r.events.at(-1).status,'failed');}});
 await t.test('cancellation propagates unchanged',async()=>{const error=new m.exports.RunCancelled();const r=await run(broken,error);await assert.rejects(r.task,e=>e===error);});
 await t.test('one repair budget spans attempts; non-JSON text cannot invent a plan',async()=>{
  const r=await run(broken,valid,{used:true});await assert.rejects(r.task,/already attempted/);assert.equal(r.requests.length,0);
  const empty=await run('No plan');await assert.rejects(empty.task,/repair failed/);assert.equal(empty.requests.length,0);
 });
});
