import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {loadPhotoPanel} from './photo_face_fixture.mjs';

// Compile the whole published panel. Only public SDK/files/AI/Draft boundaries are simulated.
function fixture({manual='all',storage=true,ai=true,mutateAt,aliasAt,pathAt,afterIntroAlias=false,sourceFps=24,draftFps=24,staleSelection=false}={}) {
  const api=loadPhotoPanel('recap-2026',['buildRecap','planRecap','createScript']);
  const hop=.025, length=480;
  const measurement={durationSeconds:12,audio:{status:'measured',hopSeconds:hop,startSeconds:0,
    frames:{flux:Array.from({length},(_,i)=>i%10===0?10:0),rmsDb:Array(length).fill(-12)},
    onsets:Array.from({length:48},(_,i)=>({t:i*.25,flux:10}))}};
  const plan=api.planRecap(measurement), size={width:1920,height:1080};
  const byId=Object.fromEntries(['r0','r1'].map((id,i)=>[id,{resourceId:id,name:id+'.mp4',path:'/'+id+'.mp4',durationSeconds:30,frameRate:sourceFps,frameSize:size}]));
  const slots=Array.from({length:plan.slotCount},(_,i)=>({resourceId:i===0?'r0':'r1',startSeconds:1,
    ...(manual==='all'||manual==='mixed'&&i>0?{focusX:0,focusY:.5}:{})}));
  if(staleSelection)byId.r1.sourceResourceId='00000000-0000-4000-8000-000000000009';
  const raw=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002'];
  const bytes=new Map(Object.values(byId).map(v=>[v.path,Buffer.from(v.resourceId+' original video')]));
  const scripts=[],submitted=[],transforms=[],commits=[],inserts=[],reads=[],store=new Map();
  let clips=[],overlay=[],graphics=[],created=0,shift=false,next=0;
  const projectRows=()=>Object.values(byId).map(v=>({resourceId:v.resourceId,name:v.name,type:'Video',path:v.path}));
  const files={stat:async p=>{reads.push(p);return bytes.has(p)?{size:bytes.get(p).length,mtimeMs:1,ino:1,isDirectory:false}:null},
    readRange:async({path:p,offset,length})=>({bytesRead:length,base64:bytes.get(p).subarray(offset,offset+length).toString('base64')})};
  const d={meta:async()=>({fps:draftFps}),clips:async({trackScope}={})=>trackScope==='all'?[...clips,...overlay]:clips,
    rangeAtFrames:async(start,end)=>({start,end}),insertResource:async value=>{inserts.push(value);const start=clips.at(-1)?.endFrame||0;
      clips.push({clipId:++next,resourceId:value.resourceId,startFrame:start,endFrame:start+Math.round((value.sourceRange.endSeconds-value.sourceRange.startSeconds)*draftFps)})},
    remove:async range=>{clips=clips.filter(c=>c.startFrame<range.start).map(c=>({...c,endFrame:Math.min(c.endFrame,range.start)}))},
    setFrameSize:async()=>{},setClipTransform:async value=>transforms.push(value),setAudioTracks:async()=>{},
    overlayResource:async()=>overlay.push({resourceId:'song'}),motionGraphics:async()=>graphics,
    addMotionGraphic:async value=>graphics.push({name:value.label}),commitAll:async label=>{commits.push(label);return{createdDraftId:'saved-recap',commitId:'commit-'+commits.length}}};
  const p={resources:async()=>[...projectRows(),{resourceId:'song',name:'brighter-year-ahead.wav',type:'Audio'}],
    sourceFiles:async()=>({fileTree:projectRows().map(v=>({...v,type:'video',frameSize:size,frameRate:24,durationSeconds:30}))}),
    createDraft:async()=>{created++;return d},resource:id=>({resourceId:id})};
  const jobs=new Map();
  const selects={project:id=>{assert.equal(id,'project');return p},draft:id=>{assert.equal(id,'saved-recap');return d},files,
    media:{measureBeatSync:async()=>[measurement]},
    ...(ai?{ai:{submit:async input=>{submitted.push(input);const id='ai:'+submitted.length;jobs.set(id,input);return{workflowId:id}},
      job:id=>({status:async()=>({workflowId:id,projectId:'project',runtimeId:'selects-ai-runtime',task:'faces.detect',status:'succeeded'}),result:async()=>({workflowId:id,task:'faces.detect',files:{detections:{id,mediaType:'application/json'}}})}),
      readJSON:async artifact=>{const input=jobs.get(artifact.id);return{contractVersion:1,task:'faces.detect',coordinateSpace:'display-pixels',boxFormat:'xyxy',frameSize:size,parameters:{sourceRange:input.sourceRange},samples:[{sourceTimeSeconds:input.sourceRange.startSeconds,faces:[{box:{xmin:0,ymin:200,xmax:100,ymax:700}}]}]}}}}:{})};
  const sdk={...(storage?{storage:{getItem:async key=>store.get(key)??null,setItem:async(key,v)=>store.set(key,v),removeItem:async key=>store.delete(key)}}:{}),
    call:async(name,id)=>{assert.equal(name,'listProjectResources');assert.equal(id,'project');return [...projectRows().map((v,i)=>({...v,resourceId:shift&&i===1?raw[0]:raw[i]})),{resourceId:'00000000-0000-4000-8000-000000000003',name:'brighter-year-ahead.wav',type:'Audio'}]},
    runScript:async input=>{scripts.push(input.summary);if(input.summary===mutateAt)bytes.set('/r1.mp4',Buffer.from('changed original video'));if(input.summary===aliasAt)shift=true;if(input.summary===pathAt)byId.r1.path='/replaced.mp4';
      try{const result=await new Function('selects','return (async()=>{'+input.script+'})()')(selects);if(afterIntroAlias&&input.summary==='Create recap intro')shift=true;return{result}}catch(error){return{isError:true,output:error.message}}}};
  api.__setLocal(sdk,{files:{join:path.posix.join,homedir:()=>'/fixture',exists:async()=>true,mkdir:async()=>{}},environment:{platform:'darwin'}});
  const run=()=>api.buildRecap(sdk,{projectId:'project',slots,byId,intro:{...slots[0],frameSize:size},mode:'full'});
  return{run,api,sdk,plan,slots,byId,submitted,transforms,commits,inserts,reads,scripts,get created(){return created},get clips(){return clips}};
}
for(const options of [{manual:'all'},{manual:'mixed'},{manual:'all',ai:false},{manual:'all',storage:false},{manual:'all',ai:false,storage:false},{manual:'all',sourceFps:null},{manual:'all',draftFps:30}]){
  test('whole production preparation → intro → batch → song/title save: '+JSON.stringify(options),async()=>{
    const f=fixture(options),out=await f.run();assert.equal(out.draftId,'saved-recap');assert.equal(out.mainCount,f.plan.placements.length);
    assert.equal(f.commits.length,2+Math.ceil((f.plan.placements.length-1)/24));assert.ok(f.reads.includes('/r0.mp4')&&f.reads.includes('/r1.mp4'));
    assert.equal(f.submitted.length,options.manual==='mixed'?1:0);
    assert.equal(f.transforms.filter(v=>v.position).length,f.plan.placements.length);
    assert.ok(f.transforms.find(v=>v.clip.resourceId==='r1').position.x>0);
    assert.equal(f.clips.at(-1).endFrame,Math.round(f.plan.durationSeconds*(options.draftFps||24)));
  });
}
test('unchanged automatic full production retains selected windows and source-bound transforms',async()=>{
  const f=fixture({manual:'none'});await f.run();assert.equal(f.submitted.length,2);assert.ok(f.submitted.every(v=>v.task==='faces.detect'));
  assert.equal(f.clips.at(-1).endFrame,288);assert.equal(f.transforms.filter(v=>v.position).length,f.plan.placements.length);
});
for(const [kind,options,message] of [
  ['changed bytes',{mutateAt:'Add recap footage'},/Footage changed after face analysis/],
  ['rebound alias',{aliasAt:'Find fixed soundtrack'},/source.*changed|source.*matched|source.*binding/i]]){
  test('manual-only source rejects '+kind+' before batch insertion/commit',async()=>{
    const f=fixture({...options,manual:'all'});await assert.rejects(f.run(),message);assert.equal(f.commits.length,kind==='changed bytes'?1:0);assert.equal(f.inserts.length,kind==='changed bytes'?1:0);
  });
}
test('focused intro without source evidence cannot silently save',async()=>{
  const f=fixture();const script=f.api.createScript({projectId:'project',intro:{...f.slots[0],frameSize:{width:1920,height:1080}},introEnd:5,expectedFps:24,faceTransform:{position:{x:1,y:0}}});
  await assert.rejects(f.sdk.runScript({summary:'Guard-only probe',script}).then(r=>{if(r.isError)throw Error(r.output)}),/source evidence missing/);
  assert.equal(f.created,0);
});

test('manual placement preserves the automatic assembler source ranges, timing, song and title',async()=>{
  const manual=fixture(),automatic=fixture({manual:'none'});await manual.run();await automatic.run();
  assert.deepEqual(manual.inserts,automatic.inserts);assert.deepEqual(manual.clips,automatic.clips);assert.deepEqual(manual.commits,automatic.commits);
});
test('manual source path replacement is rejected even when the old source bytes still exist',async()=>{
  const f=fixture({pathAt:'Find fixed soundtrack'});await assert.rejects(f.run(),/source binding changed/);assert.equal(f.created,0);
});
test('manual alias is rebound after intro commit: no footage from the new resource is inserted',async()=>{
  const f=fixture({afterIntroAlias:true});await assert.rejects(f.run(),/source binding changed/);assert.equal(f.commits.length,1);assert.equal(f.inserts.length,1);
});

for(const options of [{ai:false},{storage:false}])test('mixed input keeps manual-only framing when automatic analysis is unavailable '+JSON.stringify(options),async()=>{
  const f=fixture({...options,manual:'mixed'});await f.run();assert.equal(f.submitted.length,0);
  assert.equal(f.transforms.filter(v=>v.clip.resourceId==='r0'&&v.position).length,0);
  assert.ok(f.transforms.filter(v=>v.clip.resourceId==='r1').every(v=>v.position.x>0));
});
test('persistent selection identity mismatch rejects unchanged filename/path/bytes',async()=>{
  const f=fixture({staleSelection:true});await assert.rejects(f.run(),/source binding changed/);assert.equal(f.created,0);
});
test('different actual Project grid still excludes automatic transforms',async()=>{
  const f=fixture({manual:'mixed',draftFps:30});await f.run();
  assert.equal(f.transforms.filter(v=>v.clip.resourceId==='r0'&&v.position).length,0);
  assert.ok(f.transforms.filter(v=>v.clip.resourceId==='r1').every(v=>v.position.x>0));
});
