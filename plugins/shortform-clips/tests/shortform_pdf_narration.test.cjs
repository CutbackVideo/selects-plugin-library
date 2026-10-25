'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('PDF generates narration without a recorded source',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild'),source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8'),mod={exports:{}};
 new Function('require','module','exports',esbuild.transformSync(source+'\nexport {parsePdfNarration,pdfNarrationWords,preparePdfNarration,pdfNarrationPrompt,timePdfCaptions};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
 const api=mod.exports,doc={pages:[{page:1,path:'/paper.png'}]},plan={title:'News',sections:[{page:1,headline:'Headline',sourceQuote:'Evidence',narration:'Hello world.',focus:'headline'}]};
 const chars=[...'Hello world.'].map((character,i)=>({character,startSeconds:i*.1,endSeconds:(i+1)*.1}));
 await t.test('rejects unknown pages, empty evidence and oversized paid text',()=>{
  assert.equal(api.parsePdfNarration(plan,doc).text,'Hello world.');
  for(const s of [{page:2},{sourceQuote:''},{narration:'a'.repeat(1501)}])assert.throws(()=>api.parsePdfNarration({...plan,sections:[{...plan.sections[0],...s}]},doc));
 });
 await t.test('uses provider character timing and refuses guessed speech timing',()=>{
  assert.deepEqual(api.pdfNarrationWords('Hello world.',chars,1.3).map(w=>[Number(w[0].toFixed(4)),Number(w[1].toFixed(4)),w[2]]),[[0,.5,'Hello'],[.6,1.2,'world.']]);
  assert.throws(()=>api.pdfNarrationWords('Other words',chars,1.3),/does not match/);
  assert.throws(()=>api.pdfNarrationWords('Hello world.',null,1.3),/unavailable/);
  assert.throws(()=>api.pdfNarrationWords('Hello world.',chars.map(c=>({...c,endSeconds:NaN})),1.3),/Invalid/);
 });
 await t.test('caption timing comes from TTS while omissions, rewrites and cut words fail',()=>{
  const words=[[0,.5,'Hello'],[.6,1.2,'world.']],plan={clips:[{beats:[{resourceName:'voice',kind:'speech',startSeconds:0,endSeconds:1.2,captions:[{text:'Hello',startSeconds:0,endSeconds:.1},{text:'world.',startSeconds:.1,endSeconds:.3}]}]}]};
  const result=api.timePdfCaptions(plan,words,'voice');assert.deepEqual(result.clips[0].beats[0].captions.map(c=>[c.startSeconds,c.endSeconds]),[[0,.5],[.6,1.2]]);
  assert.equal(plan.clips[0].beats[0].captions[0].endSeconds,.1);
  const change=patch=>({...plan,clips:[{beats:[{...plan.clips[0].beats[0],...patch}]}]});
  assert.throws(()=>api.timePdfCaptions(change({captions:[{text:'Hello'}]}),words,'voice'),/omit/);
  assert.throws(()=>api.timePdfCaptions(change({captions:[{text:'Different words.'}]}),words,'voice'),/preserve/);
  assert.throws(()=>api.timePdfCaptions(change({endSeconds:.7}),words,'voice'),/boundary cuts/);
 });
 let state={id:'run1',projectId:'p',pdfVoiceId:'voice',note:''},submits=0,plans=0,ffmpegs=0;
 const scripts=[];
 const io={save:async patch=>{state={...state,...patch};},check:()=>{},guard:p=>p,pause:async()=>{},plan:async()=>{plans++;return plan;},submit:async code=>{scripts.push(code);submits++;assert.equal(state.pdfTts.state,'submitting');assert.match(code,/selects.narration.generate/);return {workflowId:'wf'};},execute:async(code,label)=>{
  scripts.push(code);
  if(label==='Check PDF narration')return {status:{status:'succeeded'},result:{resourceId:'audio',durationSeconds:1.3}};
  if(label==='Read generated speech timing')return chars;
  if(label==='Locate generated narration')return '/voice.mp3';
  if(label==='Prepare narration timeline'){ffmpegs++;assert.match(code,/voice.mp3/);assert.match(code,/run1/);return {jobId:'media'};}
  if(label==='Check narration timeline')return {state:'succeeded'};
  if(label==='Import narration timeline'||label==='Resolve saved narration timeline')return [{page:1,resourceId:'carrier'}];
  throw Error(label);
 }};
 io.start=async(code,label,register)=>{const result=await io.execute(code,label,true);await register(result);return result;};
 await t.test('PDF-only run persists every paid checkpoint and resumes without another charge',async()=>{
  await api.preparePdfNarration(state,doc,'/run',io);assert.equal(submits,1);assert.equal(state.resourceId,'carrier');assert.equal(state.pdfWords.length,2);
  await api.preparePdfNarration(state,doc,'/run',io);assert.equal(submits,1);assert.equal(plans,1);assert.equal(ffmpegs,1);
 });
 await t.test('failed carrier resumes without paying for narration again',async()=>{
  let saved={...state,id:'carrier-retry',pdfCarrier:null,pdfCarrierJob:null},starts=0,failed=true;
  const retryIO={...io,save:async patch=>{saved={...saved,...patch};},submit:async()=>{throw Error('Narration must be reused');},execute:async(code,label)=>{
   if(label==='Prepare narration timeline'){starts++;return {jobId:'retry-'+starts};}
   if(label==='Check narration timeline')return failed?{state:'failed',error:'Disk full'}:{state:'succeeded'};
   return io.execute(code,label);
  }};
  retryIO.start=async(code,label,register)=>{const result=await retryIO.execute(code,label,true);await register(result);return result;};
  await assert.rejects(api.preparePdfNarration(saved,doc,'/run',retryIO),/Disk full/);
  assert.equal(saved.pdfCarrierJob,null);assert.equal(saved.pdfTts.workflowId,'wf');
  failed=false;await api.preparePdfNarration(saved,doc,'/run',retryIO);
  assert.equal(starts,2);assert.equal(saved.pdfCarrier.resourceId,'carrier');
 });
 await t.test('cancellation keeps observing a late carrier start for registration and cleanup',async()=>{
  let saved={...state,id:'carrier-cancel',pdfCarrier:null,pdfCarrierJob:null},cancelled=false,reply,stop,startedResolve,observed;
  const hostReply=new Promise(resolve=>{reply=resolve;}),stopped=new Promise((_,reject)=>{stop=reject;}),hasStarted=new Promise(resolve=>{startedResolve=resolve;}),cancelledJobs=[];
  const cancelIO={...io,save:async patch=>{saved={...saved,...patch};},check:()=>{if(cancelled)throw Error('Cancelled');},start:async(code,label,register)=>{
   startedResolve();
   const pending=hostReply.then(async value=>{await register(value);try{cancelIO.check();}catch(error){cancelledJobs.push(value.jobId);throw error;}return value;});
   observed=pending.catch(()=>{});return Promise.race([pending,stopped]);
  }};
  const run=api.preparePdfNarration(saved,doc,'/run',cancelIO);await hasStarted;
  cancelled=true;stop(Error('Cancelled'));await assert.rejects(run,/Cancelled/);
  reply({jobId:'late-carrier'});await observed;
  assert.equal(saved.pdfCarrierJob,'late-carrier');assert.deepEqual(cancelledJobs,['late-carrier']);
  assert.match(source,/start:\(code:string,summary:string,register:any\)=>started\(code,summary,register,async\(value:any\)=>cancelOutput\('media',value.jobId\)\)/);
  assert.match(source,/\['media',job.pdfCarrierJob\]/);
 });
 await t.test('generated PDF scripts compile against the host SDK',{skip:!process.env.SBS_PANEL_TEST_SDK},()=>{
  const ts=dep('typescript'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'pdf-sdk-'));
  try{
   const files=scripts.map((body,i)=>{const file=path.join(dir,'script'+i+'.ts');fs.writeFileSync(file,'export {};async function run(){'+body+'}');return file;});
   const sdk=process.env.SBS_PANEL_TEST_SDK,program=ts.createProgram([...files,...fs.readdirSync(sdk).filter(n=>n.endsWith('.d.ts')).map(n=>path.join(sdk,n))],{target:ts.ScriptTarget.ES2022,noEmit:true,skipLibCheck:true});
   assert.deepEqual(ts.getPreEmitDiagnostics(program).filter(d=>files.includes(d.file?.fileName)).map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[]);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
 });
 await t.test('unknown paid outcome blocks automatic resubmission',async()=>{
  await assert.rejects(api.preparePdfNarration({...state,pdfTts:{state:'submitting',text:'Hello world.'}},doc,'/run',io),/outcome is unknown/);assert.equal(submits,1);
 });
 await t.test('missing voice fails before any paid work',async()=>{await assert.rejects(api.preparePdfNarration({...state,pdfVoiceId:null},doc,'/run',io),/voice/);assert.equal(submits,1);});
 await t.test('PDF UI and dispatcher no longer require project narration video',()=>{
  const fields=source.slice(source.indexOf('function PdfInputFields'),source.indexOf('function validateTemplateInput'));
  assert.doesNotMatch(fields,/Narration video|onPick|transcribed narration/);assert.match(fields,/TTS voice/);
  assert.match(source,/!resume && !isPdfInput && mode === "project" && !pick/);
  assert.match(source,/source.sourceWords=job.pdfWords/);
 });
});
