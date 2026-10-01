import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {scenePlan,slotNeeds,colorTransfer,normalizeFinish,buildFinishScript,buildCutoutScript,VIDEO_SLOTS} from '../plugins/travel-beat-vlog/operation.mjs';

const dir=path.resolve(import.meta.dirname,'../plugins/travel-beat-vlog');
// Independent reference measurements (30 fps, 468 frames), typed from the frame analysis.
const MONTAGE1=[12,16,19,22,25,28,32,35,38,42,48];
const MONTAGE2=[364,368,374,379,384,390,395,400,405,410,416];
const GRID1={V13:149,V14:153,V15:158,V16:163}, GRID2={V18:229,V19:233,V20:237,V21:242};

test('plan matches the measured reference timeline',()=>{
 const p=scenePlan(30),c=p.clips;
 assert.equal(p.durationFrames,468);assert.deepEqual(p.canvas,{width:1080,height:1920});
 assert.deepEqual(c.slice(0,11).map(x=>x.startFrame),MONTAGE1);
 assert.deepEqual(c.slice(0,11).map(x=>x.slot),VIDEO_SLOTS.slice(0,11));
 const hero=c.find(x=>x.image);assert.deepEqual([hero.startFrame,hero.endFrame],[55,102]);
 assert.deepEqual([p.title.startFrame,p.title.endFrame],[62,102]);
 for(const [slot,start] of Object.entries({...GRID1,...GRID2})){const x=c.find(y=>y.slot===slot);assert.equal(x.startFrame,start);assert.notEqual(x.quad,'full');}
 assert.deepEqual(c.filter(x=>x.slot==='V13'||x.slot==='V14'||x.slot==='V15'||x.slot==='V16').map(x=>x.quad),['TL','TR','BL','BR']);
 const m2=c.filter(x=>x.startFrame>=364&&x.startFrame<424);
 assert.deepEqual(m2.map(x=>x.startFrame),MONTAGE2);
 assert.deepEqual(m2.map(x=>x.slot),['V1','V2','V3','V4','V5','V6','V7','V8','V9','V24','V25']);
 assert.deepEqual(m2.filter(x=>x.inSeconds>0).map(x=>[x.slot,Math.round(x.inSeconds*30)]),[['V6',4],['V7',3]]);
 const last=c.at(-1);assert.equal(last.slot,'V26');assert.deepEqual([last.startFrame,last.endFrame],[424,465]);assert.deepEqual([last.fade.startFrame,last.fade.endFrame],[449,464]);assert.ok(Math.abs(last.fade.startSeconds-449.45/30)<1e-9&&Math.abs(last.fade.endSeconds-463.7/30)<1e-9);
 assert.equal(new Set(c.filter(x=>!x.image).map(x=>x.slot)).size,26);
});

test('other frame rates keep the same times',()=>{
 for(const fps of [24000/1001,60]){const p=scenePlan(fps),k=fps/30;assert.equal(p.durationFrames,Math.round(468*k));
  assert.deepEqual(p.clips.slice(0,11).map(x=>x.startFrame),MONTAGE1.map(f=>Math.round(f*k)));}
});

test('slot needs cover the longest use of each video',()=>{
 const n=slotNeeds();assert.equal(Object.keys(n).length,26);
 assert.ok(Math.abs(n.V12-80/30)<1e-9);assert.ok(Math.abs(n.V6-(4+5)/30)<1e-9);assert.ok(Math.abs(n.V26-41/30)<1e-9);
});

test('colour transfer is identity when the clip already matches, and clamps extremes',()=>{
 const t={mean:[.4,.45,.5],std:[.2,.22,.25]};
 assert.deepEqual(colorTransfer(t,t,1).map(c=>[c.gain,c.offset]),[[1,0],[1,0],[1,0]]);
 const flat=colorTransfer(t,{mean:[.9,.9,.9],std:[.001,.001,.001]},1);
 assert.ok(flat.every(c=>c.gain<=1.6&&c.offset>=-0.35));
 assert.deepEqual(colorTransfer(t,{mean:[.2,.2,.2],std:[.1,.1,.1]},0).map(c=>[c.gain,c.offset]),[[1,0],[1,0],[1,0]]);
});

const plan=scenePlan(30);
const request=()=>({mode:'finish',projectId:'p',draftId:'d',fps:30,musicResourceId:'m',
 videos:Object.fromEntries(VIDEO_SLOTS.map((s,i)=>[s,{resourceId:'v'+i,width:1080,height:1920}])),
 hero:{resourceId:'h',width:3000,height:4000},placements:[{clipId:7,trackId:'th'}],grades:{},title:{text:'TRAVEL',color:'#F4C711'}});

test('finish input needs all 26 videos and the hero clip',()=>{
 const r=request();delete r.videos.V17;assert.throws(()=>normalizeFinish(r),/V17/);
 const n=normalizeFinish(request());assert.equal(n.framing.H,null);assert.equal(Object.keys(n.framing).length,27);
});

function fakeSelects(){
 const log={overlays:[],audio:[],effects:[],transforms:[],graphics:[],commits:0};let next=100;
 let clips=[{clipId:7,trackId:'th',trackKind:'video',resourceId:'h',startFrame:55,endFrame:102}];
 const types=new Map([...VIDEO_SLOTS.map((s,i)=>['v'+i,'Video']),['h','Image'],['m','Audio']]);
 const d={meta:async()=>({fps:30,durationFrames:468,frameSize:{width:1080,height:1920}}),clips:async()=>clips.map(c=>({...c})),
  rangeAtFrames:async(a,b)=>({a,b}),
  overlayResource:async({resource,over,sourceStartSeconds})=>{log.overlays.push({id:resource.id,a:over.a,b:over.b,in:sourceStartSeconds});clips.push({clipId:next++,trackId:'t'+next,trackKind:types.get(resource.id)==='Audio'?'audio':'video',resourceId:resource.id,startFrame:over.a,endFrame:over.b});return {atFrame:over.a};},
  setClipAudio:async o=>{log.audio.push(o);},setClipTransform:async o=>{log.transforms.push(o);},addVideoEffect:async o=>{log.effects.push(o);},addMotionGraphic:async o=>{log.graphics.push(o);},
  commitAll:async()=>{log.commits++;return {commitId:'c'};}};
 const project={meta:async()=>({draftIds:['d']}),resources:async()=>[...types].map(([resourceId,type])=>({resourceId,type})),resource:id=>({id})};
 return {selects:{project:()=>project,draft:()=>d},log};
}

test('finish places 35 muted video clips, grids, the hero, the title and music, then saves once',async()=>{
 const {selects,log}=fakeSelects();
 const r=await vm.runInNewContext('(async()=>{'+buildFinishScript(request()).replace(/const (input|plan):any=/g,'const $1=')+'})()',{selects});
 assert.equal(r.status,'saved',r.message);
 const vids=log.overlays.filter(o=>o.id!=='m');assert.equal(vids.length,35);assert.equal(log.audio.length,35);assert.ok(log.audio.every(a=>a.volumeDb===-60));
 assert.deepEqual(vids.slice(0,11).map(o=>o.a),MONTAGE1);
 assert.ok(Math.abs(vids.find(o=>o.a===390).in-4/30)<1e-9);
 assert.equal(log.effects.length,36);
 assert.deepEqual([log.graphics[0].within.a,log.graphics[0].within.b],[62,102]);
 assert.deepEqual([log.graphics[1].within.a,log.graphics[1].within.b],[464,468]);assert.equal(log.graphics[1].parameters.color,plan.endColor);
 assert.equal(log.effects.find(e=>e.parameters.fade).parameters.fadeTo,plan.endColor);
 assert.deepEqual(log.overlays.find(o=>o.id==='m'),{id:'m',a:0,b:468,in:undefined});
 // A grid panel sits in its quadrant: top-left centre at (-25 %, +25 %) of the frame height... in x: -270/1920*100.
 const tl=log.transforms[vids.findIndex(o=>o.a===149)];assert.ok(Math.abs(tl.position.x-(-270/1920*100))<1e-9&&Math.abs(tl.position.y-(480/1920*100))<1e-9);
 assert.equal(log.commits,1);
});

test('builder modes run as the panel calls them',()=>{
 const run=v=>spawnSync(process.execPath,[path.join(dir,'build-script.mjs'),Buffer.from(JSON.stringify(v)).toString('base64url')],{encoding:'utf8'});
 assert.equal(JSON.parse(run({mode:'plan',fps:30}).stdout).clips.length,36);
 assert.equal(Object.keys(JSON.parse(run({mode:'needs'}).stdout)).length,26);
 assert.equal(run(request()).status,0);
 assert.equal(run({mode:'cutoutFinish',fps:30,draftId:'d',cutout:{clipId:1,trackId:'t'},hero:{width:10,height:10}}).status,0);
 assert.notEqual(run({mode:'other'}).status,0);
});

// The panel's Image bridge: stills are held past their 5 s source (hero 47 frames is shorter; cutout 40).
const panelSource=fs.readFileSync(path.join(dir,'panel.tsx'),'utf8');
const bridge=panelSource.slice(panelSource.indexOf('export async function placeNativeImages'),panelSource.indexOf('// Registers the bundled music'));
const {placeNativeImages}=vm.runInThisContext('(function(){'+bridge.replaceAll('export async function','async function')+';return {placeNativeImages};})()');
test('bridge places each item at its frames with a safe sourceDuration',async()=>{
 const trims=[];let n=1;const clips=new Map();
 const cand={place:(_s,start)=>{const id=n++;clips.set(id,{start,dur:150});return [id];},getClipPositionById:id=>{const c=clips.get(id);return c&&{trackId:'t'+id,resolvedOffset:c.start,clip:{getDuration:()=>c.dur}};},
  trimClipBoundary:({clipId,delta,sourceDuration})=>{const c=clips.get(clipId);trims.push(sourceDuration);if(sourceDuration<c.dur)throw Error('Source range exceeded');c.dur+=delta;return {trimmedClipPosition:cand.getClipPositionById(clipId)};},getDuration:()=>468,slice:()=>{}};
 const di={ProjectRepository:{findById:async()=>({getEditedSequences:()=>['d']})},SequenceRepository:{findById:async()=>({getFrameRate:()=>30,getDuration:()=>468})},TimelineMutation:{run:async(_s,_l,fn)=>({status:'committed',sequence:fn({clone:()=>cand})})}};
 const out=await placeNativeImages({di,libraryId:'l',projectId:'p',sources:[{analyzed:{},main:{},primary:{getId:()=>1},width:3000,height:4000}]},'d',plan,[{source:0,startFrame:55,endFrame:102}],'hero');
 assert.deepEqual(out.placements.map(p=>[p.startFrame,p.endFrame]),[[55,102]]);assert.deepEqual(trims,[150]);
});
