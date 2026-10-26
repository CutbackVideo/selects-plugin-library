import assert from 'node:assert/strict';
import path from 'node:path';
import {loadPhotoPanel} from './photo_face_fixture.mjs';

// Entire production module; only public SDK/IO boundaries are fixtures.
export function recapAuthoringFixture({manual='all',storage=true,ai=true,mutateAt,aliasAt,pathAt,afterIntroAlias=false,sourceFps=24,draftFps=24,staleSelection=false,sampleUnusedManual=false,missingManualSource=false,sameResourceMixed=false,faceMode='focused'}={}) {
  const api=loadPhotoPanel('recap-2026',['buildRecap','planRecap','createScript']);
  const duration=sampleUnusedManual?20:12,hop=.025,length=Math.round(duration/hop);
  const measurement={durationSeconds:duration,audio:{status:'measured',hopSeconds:hop,startSeconds:0,
    frames:{flux:Array.from({length},(_,i)=>i%10===0?10:0),rmsDb:Array(length).fill(-12)},
    onsets:Array.from({length:duration*4},(_,i)=>({t:i*.25,flux:10}))}};
  const plan=api.planRecap(measurement), size={width:1920,height:1080};
  const byId=Object.fromEntries(['r0','r1'].map((id,i)=>[id,{resourceId:id,name:id+'.mp4',path:'/'+id+'.mp4',durationSeconds:30,frameRate:sourceFps,frameSize:size}]));
  const slots=Array.from({length:plan.slotCount},(_,i)=>({resourceId:i===0?'r0':'r1',startSeconds:1,
    ...(manual==='all'||manual==='mixed'&&i>0?{focusX:0,focusY:.5}:{})}));
  if(sameResourceMixed)for(const slot of slots)slot.resourceId='r0';
  if(sampleUnusedManual){
    const unused=slots.findIndex((_slot,index)=>plan.placements.filter(row=>row.slot===index+1).every(row=>row.startSeconds>=12));
    assert.ok(unused>0,'The production plan must contain a manual slot entirely outside the sample');
    byId.r2={...byId.r1,resourceId:'r2',name:'r2.mp4',path:'/r2.mp4'};slots[unused]={resourceId:'r2',startSeconds:1,focusX:0,focusY:.5};
  }
  if(staleSelection)byId.r1.sourceResourceId='00000000-0000-4000-8000-000000000009';
  const raw=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000004'];
  const bytes=new Map(Object.values(byId).map(v=>[v.path,Buffer.from(v.resourceId+' original video')]));
  if(sampleUnusedManual)bytes.delete('/r2.mp4');
  if(missingManualSource)bytes.delete('/r1.mp4');
  const scripts=[],requests=[],submitted=[],transforms=[],commits=[],inserts=[],reads=[],overlays=[],store=new Map();
  let clips=[],overlay=[],graphics=[],created=0,shift=false,next=0,current=true;
  const projectRows=()=>Object.values(byId).map(v=>({resourceId:v.resourceId,name:v.name,type:'Video',path:v.path}));
  const files={stat:async p=>{reads.push(p);return bytes.has(p)?{size:bytes.get(p).length,mtimeMs:1,ino:1,isDirectory:false}:null},
    readRange:async({path:p,offset,length})=>({bytesRead:length,base64:bytes.get(p).subarray(offset,offset+length).toString('base64')})};
  const d={meta:async()=>({fps:draftFps}),clips:async({trackScope}={})=>trackScope==='all'?[...clips,...overlay]:clips,
    rangeAtFrames:async(start,end)=>({start,end}),insertResource:async value=>{inserts.push(value);const start=clips.at(-1)?.endFrame||0;
      clips.push({clipId:++next,resourceId:value.resourceId,startFrame:start,endFrame:start+Math.round((value.sourceRange.endSeconds-value.sourceRange.startSeconds)*draftFps)})},
    remove:async range=>{clips=clips.filter(c=>c.startFrame<range.start).map(c=>({...c,endFrame:Math.min(c.endFrame,range.start)}))},
    setFrameSize:async()=>{},setClipTransform:async value=>transforms.push(value),setAudioTracks:async()=>{},
    overlayResource:async value=>{overlays.push(value);overlay.push({resourceId:'song'})},motionGraphics:async()=>graphics,
    addMotionGraphic:async value=>graphics.push({name:value.label,...value}),commitAll:async label=>{commits.push(label);return{createdDraftId:'saved-recap',commitId:'commit-'+commits.length}}};
  const p={resources:async()=>[...projectRows(),{resourceId:'song',name:'brighter-year-ahead.wav',type:'Audio'}],
    sourceFiles:async()=>({fileTree:projectRows().map(v=>({...v,type:'video',frameSize:size,frameRate:24,durationSeconds:30}))}),
    createDraft:async()=>{created++;return d},resource:id=>({resourceId:id})};
  const jobs=new Map();
  const selects={project:id=>{assert.equal(id,'project');return p},draft:id=>{assert.equal(id,'saved-recap');return d},files,
    media:{measureBeatSync:async()=>[measurement]},
    ...(ai?{ai:{submit:async input=>{submitted.push(input);const id='ai:'+submitted.length;jobs.set(id,input);return{workflowId:id}},
      job:id=>({status:async()=>({workflowId:id,projectId:'project',runtimeId:'selects-ai-runtime',task:'faces.detect',status:'succeeded'}),result:async()=>({workflowId:id,task:'faces.detect',files:{detections:{id,mediaType:'application/json'}}})}),
      readJSON:async artifact=>{if(faceMode==='error')throw Error('fixture observation read failed');if(faceMode==='detach')current=false;const input=jobs.get(artifact.id);return{contractVersion:1,task:'faces.detect',coordinateSpace:'display-pixels',boxFormat:'xyxy',frameSize:faceMode==='invalid'?{width:99,height:99}:size,parameters:{sourceRange:input.sourceRange},samples:[{sourceTimeSeconds:input.sourceRange.startSeconds,faces:faceMode==='no-faces'?[]:faceMode==='cannot-fit'?[{box:{xmin:0,ymin:200,xmax:100,ymax:700}},{box:{xmin:1820,ymin:200,xmax:1920,ymax:700}}]:[{box:{xmin:0,ymin:200,xmax:100,ymax:700}}]}]}}}}:{})};
  const sdk={...(storage?{storage:{getItem:async key=>store.get(key)??null,setItem:async(key,v)=>store.set(key,v),removeItem:async key=>store.delete(key)}}:{}),
    call:async(name,id)=>{assert.equal(name,'listProjectResources');assert.equal(id,'project');return [...projectRows().map((v,i)=>({...v,resourceId:shift&&i===1?raw[0]:raw[i]})),{resourceId:'00000000-0000-4000-8000-000000000003',name:'brighter-year-ahead.wav',type:'Audio'}]},
    runScript:async input=>{scripts.push(input.summary);requests.push(input);if(input.summary===mutateAt)bytes.set('/r1.mp4',Buffer.from('changed original video'));if(input.summary===aliasAt)shift=true;if(input.summary===pathAt)byId.r1.path='/replaced.mp4';
      try{const result=await new Function('selects','return (async()=>{'+input.script+'})()')(selects);if(afterIntroAlias&&input.summary==='Create recap intro')shift=true;return{result}}catch(error){return{isError:true,output:error.message}}}};
  api.__setLocal(sdk,{files:{join:path.posix.join,homedir:()=>'/fixture',exists:async()=>true,mkdir:async()=>{}},environment:{platform:'darwin'}});
  const run=()=>api.buildRecap(sdk,{projectId:'project',slots,byId,intro:{...slots[0],frameSize:size},mode:sampleUnusedManual?'sample':'full',isCurrent:()=>current});
  return{run,api,sdk,plan,slots,byId,submitted,transforms,commits,inserts,reads,scripts,requests,overlays,graphics,get created(){return created},get clips(){return clips}};
}
