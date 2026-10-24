import test from'node:test';import assert from'node:assert/strict';import{loadPhotoPanel}from'./photo_face_fixture.mjs';
for(const mode of ['gallery','recap'])test(mode+' keeps one global face-observation budget and never duplicates an unconfirmed job',async()=>{
 let clock=0,recovery=false,resultReads=0;const submitted=[],jobs=new Map(),store=new Map();
 class Clock extends Date{static now(){return clock}}
 const names=mode==='gallery'?['focusGalleryPhotos']:['prepareRecapFaceFocus'];
 const api=loadPhotoPanel(mode==='gallery'?'photo-gallery-no2':'recap-2026',names,{Date:Clock});
 const resources=Array.from({length:3},(_,i)=>({resourceId:'r'+i,name:'source'+i,type:mode==='gallery'?'Image':'Video'})),raw=resources.map((row,i)=>({...row,resourceId:'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0')}));
 const files={stat:async()=>({size:1,mtimeMs:1,ino:3,isDirectory:false}),readRange:async()=>({bytesRead:1,base64:'AQ=='})};
 const selects={files,project:()=>({resources:async()=>resources}),ai:{imageSourceSupported:true,
  submit:async input=>{const workflowId='ai:budget-'+(submitted.length+1);submitted.push(input);jobs.set(workflowId,input);return{workflowId}},
  job:workflowId=>({status:async()=>{if(!recovery)clock=workflowId==='ai:budget-1'?110000:125000;return{workflowId,projectId:'p',runtimeId:'selects-ai-runtime',task:'faces.detect',status:'succeeded'}},result:async()=>{resultReads++;return{workflowId,task:'faces.detect',files:{detections:{id:workflowId,mediaType:'application/json'}}}}}),
  readJSON:async artifact=>{const request=jobs.get(artifact.id);return{contractVersion:1,task:'faces.detect',...mode==='gallery'?{sourceKind:'image'}:{},coordinateSpace:'display-pixels',boxFormat:'xyxy',frameSize:{width:1920,height:1080},parameters:{sourceRange:request.sourceRange},samples:[{sourceTimeSeconds:request.sourceRange?.startSeconds??0,faces:[{box:{xmin:0,ymin:200,xmax:140,ymax:700}}]}]}}}};
 const sdk={storage:{getItem:async key=>store.get(key)??null,setItem:async(key,value)=>store.set(key,value),removeItem:async key=>store.delete(key)},call:async()=>raw,runScript:async input=>{try{return{result:await new Function('selects','return(async()=>{'+input.script+'})()')(selects)}}catch(error){return{isError:true,output:error.message}}}};
 const media=resources.map(row=>({...row,path:'/'+row.resourceId,width:1920,height:1080,frameSize:{width:1920,height:1080},frameRate:24,durationSeconds:30,kind:'image',focusX:.5,focusY:.5}));
 const run=mode==='gallery'?()=>api.focusGalleryPhotos(sdk,{projectId:'p',media},()=>true):()=>api.prepareRecapFaceFocus(sdk,{projectId:'p',slots:[{resourceId:'r0',startSeconds:2},{resourceId:'r1',startSeconds:14},{resourceId:'r2',startSeconds:16}],byId:Object.fromEntries(media.map(row=>[row.resourceId,row])),manifest:{introEnd:8.1,placements:[{slot:1,startSeconds:0,endSeconds:8.1},{slot:2,startSeconds:8.1,endSeconds:8.4},{slot:3,startSeconds:8.4,endSeconds:8.7}]},limit:3});
 const result=await run(),diagnostics=result.faceFocus??result.diagnostics;
 assert.equal(submitted.length,2,'No new job after the overall deadline');
 assert.equal(resultReads,1,'The second window must not read or apply a late result after its remaining budget');
 assert.ok(diagnostics.some(row=>row.reason==='SHARED_AI_OBSERVATION_PENDING'));
 assert.ok(diagnostics.some(row=>row.reason==='observation-budget'));
 if(mode==='gallery')assert.equal(result.media[1].focusX,.5);else assert.equal(result.focusBySlot[2],undefined);
 const journals=[...store.values()].map(value=>JSON.parse(value));assert.equal(journals[0].records.filter(row=>row.workflowId==='ai:budget-2').length,1);
 recovery=true;clock=0;await run();assert.equal(submitted.length,3,'Only the previously unobserved third source may submit during explicit recovery');
 for(const input of submitted)assert.equal(submitted.filter(row=>row.requestKey===input.requestKey).length,1);
});
