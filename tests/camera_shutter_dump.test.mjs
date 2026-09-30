import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {scenePlan,unpackSounds,normalizeFinish,buildFinishScript,authorFinish} from '../plugins/camera-shutter-dump/operation.mjs';

const dir=path.resolve(import.meta.dirname,'../plugins/camera-shutter-dump');
// Independent reference measurements (ffmpeg on the 30 fps source): photo cut frames
// and first-autofocus-beep frames of each shutter sound.
const CUTS=[17,41,61,83,103,124,148,170,193,213,234,255];
const BEEPS=[7,30,50,73,92,113,137,159,183,202,224,245];

test('plan matches the measured reference timing',()=>{
 const plan=scenePlan();
 assert.equal(plan.fps,30);assert.equal(plan.durationFrames,279);
 assert.deepEqual(plan.canvas,{width:720,height:1280});
 assert.deepEqual(plan.occurrences.map(o=>o.startFrame),CUTS);
 assert.ok(plan.occurrences.every(o=>o.endFrame===279));
 assert.deepEqual(plan.sounds.map(s=>s.startFrame),BEEPS);
 for(const [i,s] of plan.sounds.entries())assert.ok(CUTS[i]-s.startFrame>=10&&CUTS[i]-s.startFrame<=12,'shutter leads its cut by ~0.35 s');
 for(let i=1;i<plan.sounds.length;i++)assert.ok(plan.sounds[i].startFrame>=plan.sounds[i-1].endFrame,'sounds do not overlap');
});

test('other Draft frame rates keep the same times in their own frames',()=>{
 for(const fps of [24,60]){
  const plan=scenePlan(fps),k=fps/30;
  assert.equal(plan.durationFrames,Math.round(279*k));
  assert.deepEqual(plan.occurrences.map(o=>o.startFrame),CUTS.map(f=>Math.round(f*k)));
  assert.deepEqual(plan.sounds.map(s=>s.startFrame),BEEPS.map(f=>Math.round(f*k)));
  // Never longer than the 14/30 s file (a longer overlay is rejected), and long enough for the click (0.42 s).
  assert.ok(plan.sounds.every(s=>{const d=(s.endFrame-s.startFrame)/fps;return d<0.5&&d>=0.42;}));
 }
 assert.throws(()=>scenePlan(0),/frame rate/);
});

test('slot shapes: ten portrait 3:4 tiles, two landscape 4:3 tiles, all overlapping the canvas',()=>{
 for(const [i,o] of scenePlan().occurrences.entries()){
  const ar=o.rect.width/o.rect.height;
  assert.ok(Math.abs(ar-(i<10?3/4:4/3))<0.02,'slot '+(i+1)+' aspect '+ar);
  assert.ok(o.rect.width>=380&&o.rect.width<=520);
  assert.ok(o.rect.x<720&&o.rect.x+o.rect.width>0&&o.rect.y<1280&&o.rect.y+o.rect.height>0);
 }
});

test('bundled sounds unpack with matching hashes and are reused',()=>{
 const store=fs.mkdtempSync(path.join(os.tmpdir(),'csd-'));
 const files=unpackSounds(dir,store);
 assert.deepEqual(Object.keys(files).sort(),[1,2,3,4,5,6].map(i=>'shutter.'+i));
 const first=files['shutter.1'].path,mtime=fs.statSync(first).mtimeMs;
 const wav=fs.readFileSync(first);
 assert.equal(wav.toString('ascii',0,4),'RIFF');
 assert.equal(wav.readUInt32LE(24),44100);
 // Padded past the longest Draft range (14/30 s) so an overlay always fits inside the file.
 assert.ok(files['shutter.1'].duration>14/30+0.02);
 unpackSounds(dir,store);
 assert.equal(fs.statSync(first).mtimeMs,mtime);
 fs.writeFileSync(first,'corrupt');unpackSounds(dir,store);
 assert.equal(fs.readFileSync(first).toString('ascii',0,4),'RIFF');
});

const plan=scenePlan();
const sounds=Object.fromEntries([1,2,3,4,5,6].map(i=>['shutter.'+i,'snd'+i]));
const request=()=>({mode:'finish',projectId:'p',draftId:'d',
 photos:CUTS.map((_,i)=>({resourceId:'img'+i,width:i%3?3000:4000,height:i%3?4000:3000})),
 placements:plan.occurrences.map((o,i)=>({slot:o.slot,clipId:100+i,trackId:'t'+i,startFrame:o.startFrame,endFrame:o.endFrame})),
 sounds:{...sounds}});

test('finish input requires exactly twelve photos and all sounds',()=>{
 assert.equal(normalizeFinish(request()).photos.length,12);
 const short=request();short.photos.pop();assert.throws(()=>normalizeFinish(short),/exactly 12/);
 const moved=request();moved.placements[3].startFrame+=1;assert.throws(()=>normalizeFinish(moved),/reference plan/);
 const dup=request();dup.placements[1].clipId=100;assert.throws(()=>normalizeFinish(dup),/independent/);
 const noSound=request();delete noSound.sounds['shutter.4'];assert.throws(()=>normalizeFinish(noSound),/Shutter sound/);
 assert.throws(()=>normalizeFinish({...request(),extra:1}),/Unsupported/);
});

test('build-script modes run as the installed panel calls them',()=>{
 const run=value=>spawnSync(process.execPath,[path.join(dir,'build-script.mjs'),Buffer.from(JSON.stringify(value)).toString('base64url')],{encoding:'utf8'});
 assert.deepEqual(JSON.parse(run({mode:'plan'}).stdout),plan);
 const finish=run(request());assert.equal(finish.status,0);assert.match(finish.stdout,/Finish Camera Shutter Dump Draft/);
 assert.notEqual(run({mode:'other'}).status,0);
});

function fakeSelects(){
 const log={transforms:[],effects:[],overlays:[],commits:0};
 let clips=plan.occurrences.map((o,i)=>({clipId:100+i,trackId:'t'+i,trackKind:'video',resourceId:'img'+i,startFrame:o.startFrame,endFrame:o.endFrame}));
 const types=new Map([...clips.map(c=>[c.resourceId,'Image']),...Object.values(sounds).map(id=>[id,'Audio'])]);
 const d={meta:async()=>({fps:30,durationFrames:279,frameSize:{width:720,height:1280}}),clips:async()=>clips.map(c=>({...c})),
  setClipTransform:async o=>{log.transforms.push(o);},addVideoEffect:async o=>{log.effects.push(o);},
  rangeAtFrames:async(a,b)=>({a,b}),
  overlayResource:async({resource,over})=>{log.overlays.push({id:resource.id,...over});clips.push({clipId:500+log.overlays.length,trackId:'a',trackKind:'audio',resourceId:resource.id,startFrame:over.a,endFrame:over.b});return {atFrame:over.a};},
  commitAll:async()=>{log.commits++;return {commitId:'c1'};}};
 const project={meta:async()=>({draftIds:['d']}),resources:async()=>[...types].map(([resourceId,type])=>({resourceId,type})),resource:id=>({id})};
 return {selects:{project:()=>project,draft:()=>d},log};
}

test('finish crops every photo into its slot and lays twelve shutter sounds, then saves once',async()=>{
 const {selects,log}=fakeSelects();
 const script=buildFinishScript(request());
 const result=await vm.runInNewContext('(async()=>{'+script+'})()',{selects});
 assert.equal(result.status,'saved',result.message);
 assert.equal(log.transforms.length,12);assert.equal(log.effects.length,12);assert.equal(log.commits,1);
 assert.deepEqual(log.overlays.map(o=>o.a),BEEPS);
 assert.ok(log.overlays.every(o=>o.b-o.a===14));
 // Slot 1 (157,371 404x539) on a 4000x3000 photo: centered at x=359 -> (359-360)/1280*100.
 assert.ok(Math.abs(log.transforms[0].position.x-(157+202-360)/1280*100)<1e-9);
 assert.ok(Math.abs(log.transforms[0].position.y-(640-371-269.5)/1280*100)<1e-9);
 const g=log.effects[0].parameters.g;assert.ok(Math.abs(g.mw/g.mh-404/539)<1e-9);assert.ok(g.mw<=g.w&&g.mh<=g.h);
});

test('finish refuses a Draft whose clips moved and does not save',async()=>{
 const {selects,log}=fakeSelects();
 const input=normalizeFinish(request());input.placements[0].clipId=999;
 const result=await authorFinish(selects,input,plan,'');
 assert.equal(result.status,'notSaved');assert.equal(log.commits,0);
});

// The panel's Image placement bridge, extracted as the installed panel runs it.
const panelSource=fs.readFileSync(path.join(dir,'panel.tsx'),'utf8');
const bridge=panelSource.slice(panelSource.indexOf('export async function placeNativeImages'),panelSource.indexOf('// Registers the bundled shutter sounds'));
const {placeNativeImages}=vm.runInThisContext('(function(){'+bridge.replaceAll('export async function','async function')+';return {placeNativeImages};})()');

function fakeTimeline(fps){
 const plan=scenePlan(fps),trims=[];let next=1;const clips=new Map();
 const candidate={
  place:(_src,start)=>{const id=next++;clips.set(id,{trackId:'t'+id,start,dur:120});return [id];},
  getClipPositionById:id=>{const c=clips.get(id);return c&&{trackId:c.trackId,resolvedOffset:c.start,clip:{getDuration:()=>c.dur}};},
  trimClipBoundary:({clipId,delta,sourceDuration})=>{const c=clips.get(clipId);trims.push({before:c.dur,delta,sourceDuration});
   // Mirrors the host: the source may not end before the clip's current source end.
   if(sourceDuration<c.dur)throw Error('Source range exceeded');c.dur+=delta;return {trimmedClipPosition:candidate.getClipPositionById(clipId),effectiveDelta:delta};},
  getDuration:()=>plan.durationFrames,slice:()=>{}};
 const sequence={getFrameRate:()=>fps,getDuration:()=>plan.durationFrames,getFrameSize:()=>plan.canvas};
 const di={ProjectRepository:{findById:async()=>({getEditedSequences:()=>['d']})},SequenceRepository:{findById:async()=>sequence},
  TimelineMutation:{run:async(_s,_l,fn)=>({status:'committed',sequence:fn({clone:()=>candidate})})}};
 const sources=plan.occurrences.map(()=>({analyzed:{},main:{},primary:{getId:()=>1},width:1200,height:1600}));
 return {plan,trims,prepared:{di,libraryId:'l',projectId:'p',sources}};
}

test('stills are held past and trimmed below their 120-frame source without a source-range error',async()=>{
 for(const fps of [24000/1001,30]){
  const {plan,trims,prepared}=fakeTimeline(fps);
  const out=await placeNativeImages(prepared,'d',plan);
  assert.deepEqual(out.placements.map(p=>p.endFrame-p.startFrame),plan.occurrences.map(o=>o.endFrame-o.startFrame));
  assert.ok(trims.some(t=>t.delta>0)&&trims.some(t=>t.delta<0),'covers both longer and shorter holds');
  for(const t of trims)assert.equal(t.sourceDuration,Math.max(t.before+t.delta,t.before));
  assert.equal(new Set(out.placements.map(p=>p.trackId)).size,12);
 }
});
