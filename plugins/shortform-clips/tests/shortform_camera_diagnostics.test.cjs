const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('camera planning diagnostics survive failed responses',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),m={exports:{}};
 new Function('require','module','exports',dep('esbuild').transformSync(fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8')+'\nexport {requestTemplateCameraPlan};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 const panel={videoIndex:0,resourceId:'r',startFrame:0,endFrame:90,sourceStartSeconds:0,playbackSpeed:{numerator:1,denominator:1},observation:{W:1920,H:1080,samples:[{privateLargeSample:true}]}};
 const options=[{id:'0:0',panel,x:900,y:400,w:180,h:180,headTop:220,headBottom:540}];
 const valid=JSON.stringify({version:1,draftId:'draft',status:'planned',shots:[{startFrame:0,endFrame:90,compositionId:'person',layout:'speaker',panels:[{camera:'0',targets:[{subjectId:'person',refs:['0:0']}]}]}]});
 const base={guard:p=>p,draftId:'draft',prompt:'test prompt',images:[{name:'face.jpg',dataUrl:'not persisted'}],observations:[{unit:{startFrame:0,endFrame:90},available:[panel],options}],layout:{windowTop:0,windowBottom:1920},fps:30};
 await t.test('invalid JSON is repaired without re-running the visual planner',async()=>{
  const events=[],requests=[],broken=valid.replace('"shots":','"shots"::');
  const result=await m.exports.requestTemplateCameraPlan({...base,note:async e=>{events.push(structuredClone(e));},sdk:{askAI:async r=>{requests.push(r);return {text:requests.length===1?broken:valid,usage:{output_tokens:5}};}}});
  assert.ok(result.length);assert.equal(requests.length,2);assert.equal(requests[1].images,undefined);
  const repair=events.find(e=>e.plan==='reframe-json-repair'&&e.status==='requested');
  assert.equal(repair.responseText,broken);assert.ok(requests[1].prompt.includes(repair.error));assert.ok(events.some(e=>e.status==='accepted'));
  assert.equal(events[0].observations[0].options[0].panel.observation.samples,undefined);assert.equal(JSON.stringify(events[0]).includes('not persisted'),false);
 });
 await t.test('second malformed answer fails without a full planning retry',async()=>{
  let calls=0;const broken=valid.replace('"shots":','"shots"::');
  await assert.rejects(m.exports.requestTemplateCameraPlan({...base,note:async()=>{},sdk:{askAI:async()=>{calls++;return {text:broken}}}}),/JSON repair/);assert.equal(calls,2);
 });
 await t.test('compiler rejection is distinct from transport timeout and never silently succeeds',async()=>{
  const events=[];let calls=0;
  await assert.rejects(m.exports.requestTemplateCameraPlan({...base,note:async e=>events.push(structuredClone(e)),sdk:{askAI:async()=>{calls++;if(calls===2)throw Error('deadline exceeded');return {text:valid.replace('0:0','9:9')};}}}),/deadline/);
  assert.equal(events.find(e=>e.status==='validation-failed').failurePhase,'compile');assert.equal(events.at(-1).status,'request-failed');assert.equal(events.at(-1).attempt,1);assert.ok(!events.some(e=>e.status==='accepted'));
 });
 await t.test('cannot start an unlogged model request when durable logging fails',async()=>{
  let calls=0;await assert.rejects(m.exports.requestTemplateCameraPlan({...base,note:async()=>{throw Error('disk full');},sdk:{askAI:async()=>{calls++;return {text:valid}}}}),/disk full/);assert.equal(calls,0);
 });
});
