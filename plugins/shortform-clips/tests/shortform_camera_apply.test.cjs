'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('camera layouts apply atomically to an editable Draft',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild');
 const src=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8'),mod={exports:{}};
 new Function('require','module','exports',esbuild.transformSync(src+'\nexport {SCRIPT_APPLY_REFRAME,STACKED_REFRAME_EFFECT};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
 const P={projectId:'p',draftId:'d',resourceId:'v',resourceName:'Video',sourceKind:'video',transform:{scale:1,posY:0},frame:{windowTop:450,windowBottom:1300},reframe:[{start:0,end:10,cx:960,w:1920}],stackEffect:mod.exports.STACKED_REFRAME_EFFECT,cameraPanels:[0,1].map(slot=>({resourceId:'cam'+slot,startFrame:0,endFrame:90,sourceStartSeconds:5,playbackSpeed:{numerator:1,denominator:1},slot,count:2,crop:{fit:'contain'}}))};
 async function run(options={}){
  let commits=0,id=10;const overlays=[],changed=[];
  let clips=[{clipId:1,trackId:'m',trackKind:'main',resourceId:'v',startFrame:0,endFrame:90},{clipId:2,trackId:'a',trackKind:'audio',resourceId:'sound',startFrame:0,endFrame:90}];
  const effects=new Map();
  const d={clips:async({trackScope}={})=>clips.filter(c=>trackScope!=='main'||c.trackKind==='main'),words:async()=>[],motionGraphics:async()=>[],rangeAtFrames:async(startFrame,endFrame)=>({startFrame,endFrame}),
   videoEffects:async c=>effects.get(c.clipId)||[],removeClips:async c=>{clips=clips.filter(x=>x.clipId!==c.clipId);effects.delete(c.clipId);},
   setVideoAngle:async()=>({uncovered:options.gap?[{}]:[]}),
   overlayResource:async p=>{overlays.push(p);clips.push({clipId:id++,trackId:'overlay',trackKind:'video',resourceId:p.resource.id,...p.over});},
   setClipTransform:async p=>{changed.push(p);if(options.fail)throw Error('placement failed');},
   addVideoEffect:async p=>effects.set(p.clip.clipId,[{name:p.label}]),commitAll:async()=>{commits++;}};
  const project={meta:async()=>({draftIds:['d']}),resources:async()=>[{resourceId:'v',name:'Video',hasAnalysis:true}],resource:id=>({id,meta:async()=>({fps:30,frameSize:{width:1920,height:1080}}),words:async()=>[]})};
  const params={...P,...(options.four?{cameraPanels:Array.from({length:4},(_,slot)=>({...P.cameraPanels[0],resourceId:'cam'+slot,slot,count:4,destination:{x:slot%2*.5,y:Math.floor(slot/2)*.5,width:.5,height:.5}}))}:{}),cameraShots:options.gap?[{startFrame:0,endFrame:90,videoIndex:1}]:[]};
  const script=mod.exports.SCRIPT_APPLY_REFRAME.replace('const P: any = __P__;','const P: any = '+JSON.stringify(params)+';');
  const execute=()=>new Function('selects',esbuild.transformSync('return (async()=>{'+script+'})();',{loader:'ts'}).code)({project:()=>project,draft:()=>d});
  return {execute,state:()=>({commits,clips,overlays,changed})};
 }
 await t.test('two cameras add only silent video, retain timing and allow a safe reapply',async()=>{
  const r=await run();await r.execute();await r.execute();const s=r.state();
  assert.equal(s.commits,2);assert.equal(s.clips.filter(c=>c.trackKind==='video').length,2);
  assert.equal(s.clips.filter(c=>c.trackKind==='audio').length,1);
  assert.ok(s.overlays.every(x=>x.withSound===false&&x.sourceStartSeconds===5));
  assert.ok(s.clips.every(c=>c.startFrame===0&&c.endFrame===90));
 });
 await t.test('four camera panels reapply without duplicating overlays or audio',async()=>{
  const r=await run({four:true});await r.execute();await r.execute();const s=r.state();
  assert.equal(s.clips.filter(c=>c.trackKind==='video').length,4);assert.equal(s.clips.filter(c=>c.trackKind==='audio').length,1);
  assert.ok(s.overlays.every(o=>o.withSound===false));assert.equal(s.commits,2);
 });
 await t.test('camera gaps and placement failures never commit a partial layout',async()=>{
  for(const opts of [{gap:true},{fail:true}]){const r=await run(opts);await assert.rejects(r.execute);assert.equal(r.state().commits,0);}
 });
});
