const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
test('runtime speaker scores map through source cuts and speed without inventing identity',{skip:!process.env.SBS_PANEL_TEST_MODULES},()=>{
 const dep=createRequire(path.resolve(process.env.SBS_PANEL_TEST_MODULES,'../package.json')),m={exports:{}};
 new Function('require','module','exports',dep('esbuild').transformSync(fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8')+'\nexport {activeSpeakerRows};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 const panel={videoIndex:1,startFrame:100,endFrame:190,sourceStartSeconds:50,playbackSpeed:{numerator:2,denominator:1}};
 const options=[{videoIndex:1,id:'1:0',x:100,y:100,w:40}];const samples=[0,.04,.08,.12].map(dt=>({sourceTimeSeconds:51+dt,faces:[{box:{xmin:80,ymin:80,xmax:120,ymax:120},activeSpeakerScore:-1}]}));
 const rows=m.exports.activeSpeakerRows({samples},options,panel,51,30);assert.equal(rows[0].startFrame,115);assert.equal(rows[0].score,-1);assert.equal(rows[0].candidateId,'1:0');
 assert.deepEqual(m.exports.activeSpeakerRows({samples},[...options,{...options[0],id:'1:1',x:101}],panel,51,30),[]);
 assert.deepEqual(m.exports.activeSpeakerRows({samples:samples.map(s=>({...s,faces:s.faces.map(f=>({...f,activeSpeakerScore:undefined}))}))},options,panel,51,30),[]);
});
test('single-video runtime evidence uses source rate, bounds and exact measured IDs',{skip:!process.env.SBS_PANEL_TEST_MODULES},async()=>{
 const dep=createRequire(path.resolve(process.env.SBS_PANEL_TEST_MODULES,'../package.json')),m={exports:{}};
 new Function('require','module','exports',dep('esbuild').transformSync(fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8')+'\nexport {sourceActiveSpeakerBursts,collectSourceActiveSpeakers};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 const before={meta:{fps:30},sources:[{resourceId:'r',meta:{fps:25,durationFrames:500}}]};
 const catalog=[{id:'F0',resourceId:'r',sourceFrame:100,box:{xmin:20,xmax:60,ymin:20,ymax:60}}];
 const sample={resourceId:'r',sourceFrames:[100,110,120,130],faceIds:['F0'],sourceChange:{firstNewSourceFrame:125}};
 const [burst]=m.exports.sourceActiveSpeakerBursts(before,catalog,[sample]);
 assert.equal(burst.fps,25);assert.equal(burst.observation.available[0].endFrame,125);assert.equal(burst.observation.available[0].sourceStartSeconds,4);assert.equal(burst.observation.options[0].id,'F0');
 assert.deepEqual(m.exports.sourceActiveSpeakerBursts(before,catalog,[{...sample,sourceFrames:[100,103]}]),[]);
 assert.deepEqual(m.exports.sourceActiveSpeakerBursts(before,catalog,[{...sample,faceIds:['other']}]),[]);
 const notes=[],requests=[];
 const sdk={runScript:async({script,summary})=>{
  if(summary==='Check active speaker support')return {result:true};
  if(summary==='Analyze audio and mouth motion'){requests.push(JSON.parse(script.slice('return await selects.ai.submit('.length,-2)));return {result:{workflowId:'wf'}};}
  if(summary==='Check active speaker analysis')return {result:{status:'succeeded'}};
  if(summary==='Read active speaker evidence')return {result:{scoreKind:'uncalibrated-logit',samples:[4,4.04,4.08].map(sourceTimeSeconds=>({sourceTimeSeconds,faces:[{box:catalog[0].box,activeSpeakerScore:2}]}))}};
  throw Error(summary);
 }};
 const evidence=await m.exports.collectSourceActiveSpeakers({sdk,guard:p=>p,projectId:'p',before,catalog,samples:[sample],note:e=>notes.push(e)});
 assert.deepEqual(requests[0].sourceRange,{startSeconds:4,endSeconds:5});assert.equal(requests[0].task,'speakers.detect');
 assert.equal(evidence[0].rows[0].faceId,'F0');assert.equal(evidence[0].rows[0].sourceStartFrame,100);assert.equal(evidence[0].sourceFps,25);assert.equal(notes.at(-1).status,'complete');
 const unavailable=await m.exports.collectSourceActiveSpeakers({sdk:{runScript:async()=>({result:false})},guard:p=>p,projectId:'p',before,catalog,samples:[sample],note:e=>notes.push(e)});
 assert.deepEqual(unavailable,[]);assert.equal(notes.at(-1).status,'unavailable');
});
