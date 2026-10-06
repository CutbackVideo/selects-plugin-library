import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import {topLevel} from './windows_host.mjs';
const source=fs.readFileSync(new URL('../plugins/multicam-generator/panel.tsx',import.meta.url),'utf8');
const context=vm.createContext({window:{get parent(){throw Error('Parent access is blocked');}}});
vm.runInContext(['multicamScript','readPlan','placeDirect'].map(name=>topLevel(source,name)).join('\n'),context);
const owner={projectId:'project',sequenceId:'draft'};
function fixture({speed=1,gap=false}={}) {
 const fps=30000/1001;
 const media={id:'source',type:'video',path:'/source.mp4',checksum:'one'};
 const sourceClips=[{clipId:1,trackId:'main',trackKind:'main',resourceId:'source',startFrame:gap?1:0,endFrame:300,sourceStartSeconds:2,playbackSpeed:speed,media}];
 let persisted=sourceClips.slice(),pending=persisted.slice(),commits=0,seek=0;
 const sdk={
  call:async(name,...args)=>{
   if(name==='getEditorState')return {projectId:'project',libraryId:'library',onScreenTab:{kind:'draft',sequenceId:'draft'},playhead:{resolvedFrame:30}};
   assert.equal(name,'getDraftMediaSnapshot');assert.deepEqual(args,['project','draft']);
   return {fps,durationFrames:300,clips:persisted};
  },
  runScript:async({script,allowCommit})=>{
   const d={
    clips:async()=>pending.map(c=>({...c})),rangeAtFrames:async(startFrame,endFrame)=>({startFrame,endFrame}),
    removeClips:async rows=>{assert(allowCommit);pending=pending.filter(c=>!rows.some(r=>r.clipId===c.clipId));},
    overlayResource:async({resource,over})=>{assert(allowCommit);pending.push({clipId:2,trackId:'generated',trackKind:'video',resourceId:resource,...over});},
    commitAll:async()=>{assert(allowCommit);commits++;persisted=pending.slice();},
   };
   const selects={project:()=>({meta:async()=>({draftIds:['draft']}),resource:id=>id}),draft:()=>d,editor:{seekDraftFrame:async()=>{seek++;return {requested:true}}}};
   try{return {result:await new Function('selects','return (async()=>{'+script+'})()')(selects)}}catch(error){return {isError:true,output:error.message}}
  },
 };
 return {sdk,fps,get persisted(){return persisted},get commits(){return commits},get seek(){return seek}};
}
test('SDK source plan uses resolved frames and exact source seconds without reading parent',async()=>{
 const f=fixture(),plan=await context.readPlan(owner,{duration:2},undefined,f.sdk);
 assert.equal(plan.startFrame,30);assert.equal(plan.endFrame,90);
 assert.equal(plan.sourceStartSeconds,2+30/f.fps);
 assert.equal(plan.durationSeconds,60/f.fps);
 await assert.rejects(context.readPlan(owner,{duration:2},0,fixture({gap:true}).sdk),/gaps/);
 await assert.rejects(context.readPlan(owner,{duration:2},0,fixture({speed:0.5}).sdk),/normal-speed/);
});
test('placement commits one overlay, verifies persistence, and retries without duplication',async()=>{
 const f=fixture(),plan=await context.readPlan(owner,{duration:2},undefined,f.sdk);
 const original=JSON.stringify(f.persisted);
 const result=await context.placeDirect(plan,'generated-resource',f.sdk);
 assert.equal(result.saved,true);assert.equal(f.commits,1);assert.equal(f.seek,1);
 assert.equal(JSON.stringify(f.persisted.slice(0,1)),original);
 const retry=await context.placeDirect(plan,'generated-resource',f.sdk);
 assert.equal(retry.alreadyAdded,true);assert.equal(f.commits,1);
});
test('an ambiguous replacement aborts before commit',async()=>{
 const f=fixture(),plan=await context.readPlan(owner,{duration:2},undefined,f.sdk);
 plan.replaces={resourceId:'missing',startFrame:30,endFrame:90};
 await assert.rejects(context.placeDirect(plan,'new',f.sdk),/draft_changed/);
 assert.equal(f.commits,0);
});
