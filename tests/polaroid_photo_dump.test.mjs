import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {scenePlan,unpackAssets,normalizeFinish,buildFinishScript,authorFinish,ZOOM} from '../plugins/polaroid-photo-dump/operation.mjs';

const dir=path.resolve(import.meta.dirname,'../plugins/polaroid-photo-dump');
// Independent reference measurements (ffmpeg on the 60 fps source).
const CUTS60=[21,71,122,174,224,274,326,376,428,479,530,581,633,683,736,786];
const END60=835;
// Frame width in the reference at 1 s and 12 s.
const FRAME_W={1:587,12:668};

test('plan matches the measured reference cuts',()=>{
 const plan=scenePlan(60);
 assert.equal(plan.durationFrames,END60);
 assert.deepEqual(plan.canvas,{width:1080,height:1920});
 assert.equal(plan.occurrences.length,17);
 assert.deepEqual(plan.occurrences.slice(1).map(o=>o.startFrame),CUTS60);
 assert.equal(plan.occurrences[0].startFrame,0);
 for(let i=0;i<16;i++)assert.equal(plan.occurrences[i].endFrame,plan.occurrences[i+1].startFrame,'photos switch with no gap');
 assert.equal(plan.occurrences[16].endFrame,END60);
});

test('other Draft frame rates keep the same times',()=>{
 for(const fps of [24000/1001,30]){
  const plan=scenePlan(fps);
  assert.deepEqual(plan.occurrences.slice(1).map(o=>o.startFrame),CUTS60.map(f=>Math.round(f*fps/60)));
  assert.equal(plan.durationFrames,Math.round(END60*fps/60));
 }
 assert.throws(()=>scenePlan(0),/frame rate/);
});

test('zoom rate reproduces the reference frame growth',()=>{
 const ratio=(1+ZOOM.perSecond*12)/(1+ZOOM.perSecond*1);
 assert.ok(Math.abs(ratio-FRAME_W[12]/FRAME_W[1])<0.01,'zoom ratio '+ratio);
 assert.ok(Math.abs(ZOOM.center.x-540)<10&&Math.abs(ZOOM.center.y-960)<15,'zoom centre near canvas centre');
});

test('bundled frame and music unpack with matching hashes',()=>{
 const store=fs.mkdtempSync(path.join(os.tmpdir(),'pol-'));
 const files=unpackAssets(dir,store);
 const png=fs.readFileSync(files.frame.path);
 assert.equal(png.toString('latin1',1,4),'PNG');
 assert.equal(png.readUInt32BE(16),1080);assert.equal(png.readUInt32BE(20),1920);
 assert.equal(png[25],6,'RGBA PNG (transparent window)');
 assert.equal(fs.readFileSync(files.music.path).toString('latin1',4,8),'ftyp');
 const first=fs.statSync(files.music.path).mtimeMs;unpackAssets(dir,store);assert.equal(fs.statSync(files.music.path).mtimeMs,first);
});

const plan=scenePlan(60);
const request=()=>({mode:'finish',projectId:'p',draftId:'d',fps:60,
 photos:plan.occurrences.map((_,i)=>({resourceId:'img'+i,width:i%2?1086:1448,height:i%2?1448:1086})),
 placements:plan.occurrences.map((o,i)=>({clipId:100+i,trackId:'t'+i,startFrame:o.startFrame,endFrame:o.endFrame})),
 frame:{clipId:200,trackId:'tf',startFrame:0,endFrame:END60,resourceId:'frame',width:1080,height:1920},
 caption:'hello',grade:1,assets:{music:'music'}});

test('finish input is validated',()=>{
 assert.equal(normalizeFinish(request()).photos.length,17);
 const short=request();short.photos.pop();assert.throws(()=>normalizeFinish(short),/exactly 17/);
 const moved=request();moved.placements[5].startFrame+=1;assert.throws(()=>normalizeFinish(moved),/reference plan/);
 const frame=request();frame.frame.endFrame-=1;assert.throws(()=>normalizeFinish(frame),/Frame placement/);
 assert.throws(()=>normalizeFinish({...request(),caption:'x'.repeat(121)}),/120/);
 assert.throws(()=>normalizeFinish({...request(),assets:{}}),/Music/);
});

test('build-script modes run as the panel calls them',()=>{
 const run=value=>spawnSync(process.execPath,[path.join(dir,'build-script.mjs'),Buffer.from(JSON.stringify(value)).toString('base64url')],{encoding:'utf8'});
 assert.deepEqual(JSON.parse(run({mode:'plan',fps:60}).stdout),plan);
 const finish=run(request());assert.equal(finish.status,0,finish.stderr);assert.match(finish.stdout,/Finish Polaroid Photo Dump Draft/);
 assert.notEqual(run({mode:'other'}).status,0);
});

function fakeSelects(){
 const log={transforms:[],effects:[],graphics:[],overlays:[],commits:0};
 const r=request();
 let clips=[...r.placements.map((p,i)=>({...p,trackKind:'video',resourceId:'img'+i})),{...r.frame,trackKind:'video'}];
 const types=new Map([...clips.map(c=>[c.resourceId,'Image']),['music','Audio']]);
 const d={meta:async()=>({fps:60,durationFrames:END60,frameSize:{width:1080,height:1920}}),clips:async()=>clips.map(c=>({...c})),
  setClipTransform:async o=>{log.transforms.push(o);},addVideoEffect:async o=>{log.effects.push(o);},addMotionGraphic:async o=>{log.graphics.push(o);},
  rangeAtFrames:async(a,b)=>({a,b}),
  overlayResource:async({resource,over})=>{log.overlays.push({id:resource.id,...over});clips.push({clipId:900,trackId:'a',trackKind:'audio',resourceId:resource.id,startFrame:over.a,endFrame:over.b});return {atFrame:over.a};},
  commitAll:async()=>{log.commits++;return {commitId:'c1'};}};
 const project={meta:async()=>({draftIds:['d']}),resources:async()=>[...types].map(([resourceId,type])=>({resourceId,type})),resource:id=>({id})};
 return {selects:{project:()=>project,draft:()=>d},log};
}

test('finish zooms 18 layers on one clock, adds caption and music, saves once',async()=>{
 const {selects,log}=fakeSelects();
 const result=await vm.runInNewContext('(async()=>{'+buildFinishScript(request())+'})()',{selects});
 assert.equal(result.status,'saved',result.message);
 assert.equal(log.transforms.length,18);assert.equal(log.effects.length,18);assert.equal(log.commits,1);
 for(const e of log.effects){assert.equal(e.parameters.zoom,ZOOM.perSecond);assert.equal(e.parameters.fps,60);assert.equal(e.parameters.cx,ZOOM.center.x);}
 assert.deepEqual(log.effects.slice(0,17).map(e=>e.parameters.startFrame),plan.occurrences.map(o=>o.startFrame));
 // A 1448x1086 photo covers the 1080x1920 canvas: fit=1080/1448, cover=1920/1086.
 assert.ok(Math.abs(log.transforms[0].scale.x-(1920/1086)/(1080/1448))<1e-9);
 const w=log.effects[0].parameters.win;assert.ok(w.x<plan.window.x&&w.x+w.width>plan.window.x+plan.window.width,'photo bleeds under the frame border');
 assert.equal(log.effects[17].label,'Polaroid zoom');
 assert.equal(log.graphics.length,1);assert.equal(log.graphics[0].parameters.text,'hello');
 assert.deepEqual(log.overlays,[{id:'music',a:0,b:END60}]);
});

test('finish refuses moved clips without saving',async()=>{
 const {selects,log}=fakeSelects();
 const input=normalizeFinish(request());input.frame.clipId=999;
 assert.equal((await authorFinish(selects,input,plan,{})).status,'notSaved');assert.equal(log.commits,0);
});

// The panel's Image placement bridge, extracted as the installed panel runs it.
const panelSource=fs.readFileSync(path.join(dir,'panel.tsx'),'utf8');
const bridge=panelSource.slice(panelSource.indexOf('export async function placeNativeImages'),panelSource.indexOf('// Registers the bundled frame image'));
const {placeNativeImages}=vm.runInThisContext('(function(){'+bridge.replaceAll('export async function','async function')+';return {placeNativeImages};})()');

test('photos are placed first and the frame last, holding past the still source',async()=>{
 const fps=24000/1001,p=scenePlan(fps),order=[],trims=[];let next=1;const clips=new Map();
 const candidate={
  place:(src,start)=>{const id=next++;clips.set(id,{trackId:'t'+id,start,dur:120});order.push(src.working.name);return [id];},
  getClipPositionById:id=>{const c=clips.get(id);return c&&{trackId:c.trackId,resolvedOffset:c.start,clip:{getDuration:()=>c.dur}};},
  trimClipBoundary:({clipId,delta,sourceDuration})=>{const c=clips.get(clipId);trims.push({before:c.dur,delta,sourceDuration});if(sourceDuration<c.dur)throw Error('Source range exceeded');c.dur+=delta;return {trimmedClipPosition:candidate.getClipPositionById(clipId)};},
  getDuration:()=>p.durationFrames,slice:()=>{}};
 const sequence={getFrameRate:()=>fps,getDuration:()=>p.durationFrames,getFrameSize:()=>p.canvas};
 const di={ProjectRepository:{findById:async()=>({getEditedSequences:()=>['d']})},SequenceRepository:{findById:async()=>sequence},TimelineMutation:{run:async(_s,_l,fn)=>({status:'committed',sequence:fn({clone:()=>candidate})})}};
 const sources=[...p.occurrences.map((_,i)=>({analyzed:{name:'photo'+i},main:{},primary:{getId:()=>1},width:1086,height:1448})),{analyzed:{name:'frame'},main:{},primary:{getId:()=>1},width:1080,height:1920}];
 const out=await placeNativeImages({di,libraryId:'l',projectId:'p',sources},'d',p);
 assert.equal(order.at(-1),'frame');assert.equal(out.placements.length,17);
 assert.deepEqual([out.frame.startFrame,out.frame.endFrame,out.frame.width],[0,p.durationFrames,1080]);
 for(const t of trims)assert.equal(t.sourceDuration,Math.max(t.before+t.delta,t.before));
 assert.ok(trims.some(t=>t.delta>0),'frame holds past the 120-frame source');
});
