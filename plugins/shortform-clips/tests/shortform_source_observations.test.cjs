'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('upfront observations retain silent and untracked source faces',{skip:!modules},async()=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild'),m={exports:{}};
 const src=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 new Function('require','module','exports',esbuild.transformSync(src+'\nexport {collectSourceObservations,reframingPlanningFacts};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 const box={xmin:100,xmax:200,ymin:100,ymax:250};
 const data={frameSize:{width:1920,height:1080},samples:Array.from({length:25},(_,i)=>({sourceTimeSeconds:10+i/25,faces:[{box,score:.99}]}))};
 const requests=[];
 const sdk={runScript:async({script,summary})=>{
  if(summary==='Analyze source faces and speaking'){requests.push(JSON.parse(script.match(/submit\((.*)\);/)[1]));return {result:{workflowId:'wf'}};}
  if(summary==='Check source observations')return {result:{status:'succeeded'}};
  if(summary==='Read compact source observations'){
   const js=esbuild.transformSync('async function read(selects){'+script+'}\nmodule.exports=read;',{loader:'ts',format:'cjs'}).code;const out={exports:{}};new Function('module','exports',js)(out,out.exports);
   return {result:await out.exports({ai:{job:()=>({result:async()=>({files:{detections:'d'},metrics:{}})}),readJSON:async()=>data}})};
  }
  throw Error(summary);
 }};
 const before={meta:{durationFrames:30,fps:30},sources:[{resourceId:'r',meta:{fps:30,frameSize:data.frameSize}}],words:[],segments:[{startFrame:0,endFrame:30,sourceResourceId:'r',sourceStartFrame:300,sourceEndFrame:330}]};
 const result=await m.exports.collectSourceObservations({sdk,guard:p=>p,projectId:'untracked-regression',before,note:()=>{}});
 assert.equal(requests.length,1);assert.equal(requests[0].task,'speakers.detect');assert.equal(result.catalog.length,3);
 assert.equal(result.catalog[0].draftFrame,0);assert.deepEqual(result.catalog[0].box,box);assert.ok(result.activeSpeakers.every(r=>r.scores.length===0));
 const facts=m.exports.reframingPlanningFacts(before,result.catalog);assert.equal(facts.mapping.length,1);assert.equal(facts.mapping[0].startFrame,0);assert.equal(facts.turns.length,0);
});

test('source survey rounds fractional mapping frames before requesting pixels',{skip:!modules},async()=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild'),m={exports:{}};
 const src=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 new Function('require','module','exports',esbuild.transformSync(src+'\nexport {prepareSourceSurvey};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 const oldImage=global.Image,oldDocument=global.document,seen=[];
 global.Image=class{async decode(){}};
 global.document={createElement:()=>({width:0,height:0,toDataURL:()=>'',getContext:()=>({drawImage(){},fillRect(){},fillText(){},getImageData:()=>({data:new Uint8Array(32*18*4)})})})};
 const words=[{startFrame:0,endFrame:30,sourceResourceId:'r',sourceStartFrame:18387.999999999996,sourceEndFrame:18418,speakerId:'s',text:'hello'}];
 const before={words,sources:[{resourceId:'r',meta:{fps:30,frameSize:{width:1920,height:1080}}}]};
 const sdk={call:async(method,p)=>{
  if(method==='getResourceAnalyzedSequence')return {owner:{projectId:'p'},analyzedSequenceJson:{id:'r'}};
  assert.equal(method,'captureVisualFrames');
  p.frames.forEach(f=>{assert.ok(Number.isInteger(f.frameNumber));seen.push(f.frameNumber);});
  return {data:'',frames:p.frames.map(f=>({...f,hasSourceImage:true,x:0,y:0,width:640,height:360}))};
 }};
 try{await m.exports.prepareSourceSurvey({sdk,guard:p=>p,projectId:'p',before,catalog:[],note:()=>{}});assert.ok(seen.includes(18388));}
 finally{global.Image=oldImage;global.document=oldDocument;}
});
