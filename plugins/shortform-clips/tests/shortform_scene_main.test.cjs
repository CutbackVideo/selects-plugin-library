'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modulesRoot=process.env.SBS_PANEL_TEST_MODULES;

test('shared original Main initialization',{skip:!modulesRoot&&'Set SBS_PANEL_TEST_MODULES'},async t=>{
 const dep=createRequire(path.resolve(modulesRoot,'../package.json')),esbuild=dep('esbuild');
 const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8'),module={exports:{}};
 new Function('require','module','exports',esbuild.transformSync(source+'\nexport {createSceneMainDraft,sceneBuildPrompt,validateSceneSourcePlan};',{loader:'tsx',format:'cjs'}).code)(dep,module,module.exports);
 const api=module.exports;
 function fixture(){
  const fps=30000/1001,files=[{resourceId:'r1',name:'A.mov',path:'/original/a',frameRate:fps,durationSeconds:20},{resourceId:'r2',name:'B.mov',path:'/original/b',frameRate:24,durationSeconds:20}],evidence=files.map(f=>({...f,fps:f.frameRate}));
  const clip={name:'Fresh job episode',beats:[{resourceName:'A.mov',startSeconds:100/fps,endSeconds:172/fps},{resourceName:'B.mov',startSeconds:1.25,endSeconds:2.75}]};
  const states=new Map(),calls=[];let serial=0;
  function handle(state){let committed=false;return{
   meta:async()=>({name:state.name,fps:state.fps,frameSize:state.frameSize,durationFrames:state.clips.at(-1)?.endFrame||0}),
   setSettings:async value=>{assert(!committed);calls.push(['settings',value]);const [a,b]=value.frameRate.split('/').map(Number);state.fps=a/b;state.frameSize=value.frameSize;},
   insertResource:async value=>{assert(!committed);calls.push(['insert',value]);const start=state.clips.at(-1)?.endFrame||0,end=start+Math.round((value.sourceRange.endSeconds-value.sourceRange.startSeconds)*state.fps);state.clips.push({clipId:state.clips.length+1,trackId:'main-track',resourceId:value.resourceId,trackKind:'main',startFrame:start,endFrame:end,playbackSpeed:{numerator:1,denominator:1},audioSourceIndexes:null});},
   clips:async({trackScope})=>structuredClone(trackScope==='main'?state.clips:[...state.clips,...state.visuals]),
   commitAll:async()=>{assert(!committed);committed=true;calls.push(['commit']);state.id='saved-'+(++serial);states.set(state.id,state);return{createdDraftId:state.id};}
  };}
  const p={sourceFiles:async()=>({fileTree:files}),resources:async()=>files.map(f=>({resourceId:f.resourceId,type:'Video'})),meta:async()=>({draftIds:[...states.keys()]}),createDraft:async({name})=>{calls.push(['create',name]);return handle({name,fps:24,frameSize:{width:1920,height:1080},clips:[],visuals:[]});}};
  const sdk={project:id=>{assert.equal(id,'project');return p;},draft:id=>{assert(states.has(id));return handle(states.get(id));}};
  return {fps,files,evidence,clip,states,calls,sdk,run:checkpoint=>api.createSceneMainDraft(sdk,'project',clip,evidence,checkpoint)};
 }
 await t.test('fresh exact original ranges and mixed FPS commit once without visual or audio edits',async()=>{
  const f=fixture(),r=await f.run(null);assert.equal(r.status,'main-saved');assert.equal(r.reused,false);assert.equal(r.sourceRanges[0].sourceStartFrame,100);assert.equal(r.sourceRanges[0].sourceEndFrame,172);assert.equal(r.sourceRanges[1].sourceStartFrame,30);assert.equal(r.sourceRanges[1].sourceEndFrame,66);assert.deepEqual(r.main.map(c=>[c.startFrame,c.endFrame]),[[0,72],[72,117]]);assert(r.main.every(c=>c.audioSourceIndexes===null));assert.deepEqual(f.calls.map(c=>c[0]),['create','settings','insert','insert','commit']);assert.equal(f.states.get(r.finalDraftId).visuals.length,0);
 });
 await t.test('same saved Main is observed on Resume and existing visuals remain untouched',async()=>{
  const f=fixture(),r=await f.run(null),state=f.states.get(r.finalDraftId);state.visuals.push({clipId:44,trackKind:'video',label:'builder-owned visual'});const before=structuredClone(state),calls=f.calls.length;const resumed=await f.run(r);assert.equal(resumed.finalDraftId,r.finalDraftId);assert.equal(resumed.status,'existing-main-observed');assert.equal(resumed.reused,true);assert.equal(f.calls.length,calls);assert.deepEqual(state,before);assert.equal(f.states.size,1);
 });
 await t.test('supplied ownership and source-plan conflicts cannot be silently adopted',async()=>{
  for(const corrupt of [r=>({...r,projectId:'foreign'}),r=>({...r,finalDraftId:'other'}),r=>({...r,sourceRanges:r.sourceRanges.map((x,i)=>i?x:{...x,sourceStartFrame:101})}),r=>({...r,main:r.main.map((x,i)=>i?x:{...x,clipId:99})})]){
   const f=fixture(),r=await f.run(null),count=f.calls.length;await assert.rejects(f.run(corrupt(structuredClone(r))),/project changed|ownership|plan changed|references changed/);assert.equal(f.calls.length,count);assert.equal(f.states.size,1);
  }
  const f=fixture(),r=await f.run(null);f.states.get(r.finalDraftId).clips[0].audioSourceIndexes=[];await assert.rejects(f.run(r),/Main structure/);
 });
 await t.test('commit-before-checkpoint and legacy checkpoints recover observed Main without duplicating or clearing visuals',async()=>{
  for(const checkpoint of [null,{status:'dialogue-saved'}, {projectId:'project',finalDraftId:'saved-1'}]){
   const f=fixture(),r=await f.run(null),state=f.states.get(r.finalDraftId);state.visuals.push({clipId:80,label:'existing overlay'});const before=structuredClone(state),count=f.calls.length,recovered=await f.run(checkpoint);
   assert.equal(recovered.finalDraftId,r.finalDraftId);assert.equal(recovered.status,'existing-main-observed');assert.equal(recovered.sourceRangesBasis,'confirmed-plan');assert.deepEqual(state,before);assert.equal(f.calls.length,count);assert.equal(f.states.size,1);assert(recovered.limitations.some(x=>x.includes('source offsets')));
  }
 });
 await t.test('all source inputs are checked before a new Draft mutation',async()=>{
  for(const corrupt of [f=>f.evidence[0].path='/foreign',f=>f.evidence[0].fps=24,f=>f.clip.beats[1].endSeconds=30,f=>f.clip.beats[0].endSeconds=f.clip.beats[0].startSeconds+.00001,f=>f.evidence.push({...f.evidence[0]})]){
   const f=fixture();corrupt(f);await assert.rejects(f.run(null));assert.deepEqual(f.calls,[]);
  }
 });
 await t.test('ambiguous target names and altered observed settings fail without resetting a Draft',async()=>{
  const f=fixture(),r=await f.run(null),count=f.calls.length;f.states.set('duplicate',structuredClone(f.states.get(r.finalDraftId)));await assert.rejects(f.run(r),/Ambiguous/);f.states.delete('duplicate');f.states.get(r.finalDraftId).frameSize.width=1920;await assert.rejects(f.run(r),/settings changed/);assert.equal(f.calls.length,count);
 });
 await t.test('public Main observations do not replace final host original-offset validation',async()=>{
  const f=fixture(),r=await f.run(null),snapshot={fps:f.fps,durationFrames:117,clips:r.main.map((c,i)=>({...c,playbackSpeed:1,media:{path:f.evidence[i].path},sourceStartSeconds:r.sourceRanges[i].sourceStartFrame/r.sourceRanges[i].sourceFps,sourceEndSeconds:r.sourceRanges[i].sourceEndFrame/r.sourceRanges[i].sourceFps}))};snapshot.clips[0].sourceStartSeconds+=1;snapshot.clips[0].sourceEndSeconds+=1;
  assert.throws(()=>api.validateSceneSourcePlan(snapshot,{owned:true,meta:{name:f.clip.name,fps:f.fps},main:r.main},f.clip,f.evidence),/source range/);const resumed=await f.run(r);assert.equal(resumed.status,'existing-main-observed');assert(resumed.limitations.some(x=>x.includes('source offsets')));
 });
 await t.test('both actual builder prompts emit runnable helper and require separate post-commit editing',async()=>{
  for(const bounded of [false,true]){
   const f=fixture(),prompt=api.sceneBuildPrompt({bounded,instructions:'Channel',clip:f.clip});const a=prompt.indexOf('async function createSceneMainDraft('),b=prompt.indexOf('\nInitialize after',a);assert(a>=0&&b>a);assert(prompt.includes('In a SEPARATE call'));const script=prompt.slice(a,b)+'\nreturn await createSceneMainDraft(selects,"project",'+JSON.stringify(f.clip)+','+JSON.stringify(f.evidence)+',null);';const code=esbuild.transformSync('async function run(selects){'+script+'}\nmodule.exports=run;',{loader:'ts',format:'cjs'}).code,m={exports:{}};new Function('module','exports',code)(m,m.exports);const result=await m.exports(f.sdk);assert.equal(result.status,'main-saved');assert.equal(f.calls.filter(c=>c[0]==='commit').length,1);
  }
 });
});
