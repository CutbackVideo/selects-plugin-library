const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('local resource queues leave agents parallel',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild'),mod={exports:{}};
 const src=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 new Function('require','module','exports',esbuild.transformSync(src+'\nexport {createWorkQueue,createReframeWork,cameraFaceRanges,clipStageLabel};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
 const {createWorkQueue,createReframeWork,cameraFaceRanges,clipStageLabel}=mod.exports;
 const tick=()=>new Promise(r=>setImmediate(r));
 await t.test('duplicate source analyses share in-flight and completed work; errors can retry',async()=>{
  const work=createReframeWork();let calls=0,release;
  const task=()=>{calls++;return new Promise(r=>release=r);};
  const a=work.face('source/range',task),b=work.face('source/range',task);
  assert.equal(a,b);await tick();assert.equal(calls,1);release({samples:[1]});
  assert.deepEqual(await a,{samples:[1]});await work.face('source/range',task);assert.equal(calls,1);
  await assert.rejects(work.face('bad',async()=>{throw Error('decode');}),/decode/);
  assert.equal(await work.face('bad',async()=>42),42);
 });
 await t.test('cancelled queued work never submits, even after the caller has stopped waiting',async()=>{
  let stopped=false,release,submitted=0;
  const work=createReframeWork(()=>{if(stopped)throw Error('cancelled');});
  const first=work.face('a',()=>new Promise(r=>release=r));await tick();
  const second=work.face('b',async()=>{submitted++;});void second.catch(()=>{});
  stopped=true;release(1);await first;await assert.rejects(second,/cancelled/);assert.equal(submitted,0);
 });
 await t.test('one local operation runs at a time, failures release the slot; all AI calls can overlap',async()=>{
  const local=createWorkQueue();let active=0,peak=0,agents=0;const finish=[];
  const runs=Array.from({length:6},(_,i)=>(async()=>{
   await local(async()=>{active++;peak=Math.max(peak,active);await tick();active--;});
   await new Promise(resolve=>{agents++;finish.push(resolve);});
   await local(async()=>{active++;peak=Math.max(peak,active);await tick();active--;if(i===2)throw Error('preview');});
  })());
  const settled=Promise.allSettled(runs);
  while(agents<6)await tick();
  assert.equal(peak,1);assert.equal(agents,6);
  finish.forEach(resolve=>resolve());
  const results=await settled;assert.equal(results.filter(r=>r.status==='rejected').length,1);assert.equal(peak,1);
  assert.equal(await local(async()=>7),7);
 });
 await t.test('small removed-silence gaps merge; long omitted passages are not decoded',()=>{
  assert.deepEqual(cameraFaceRanges([[2,4],[0,1.5],[4.8,6],[20,22],[21,23]]),[[0,6],[20,23]]);
  assert.deepEqual(cameraFaceRanges([]),[]);
 });
 await t.test('UI labels report actual work rather than calling every phase face detection',()=>{
  const R={stages:{ai:'AI 판단',faces:'얼굴 분석',verify:'검증',done:'완료'}};
  assert.equal(clipStageLabel({progressStage:'ai',reframeState:'pending'},R),'AI 판단');
  assert.equal(clipStageLabel({progressStage:'verify'},R),'검증');
  assert.equal(clipStageLabel({reframeState:'done'},R),'완료');
 });
});
