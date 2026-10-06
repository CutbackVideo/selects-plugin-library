import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {loadPanelOperation} from './panel_operation.mjs';
import {hostBlock,REFERENCE_BLOCK,posixHits,NEWER_SELECTS,loadPanelFunctions,fakeHost,hostGlobals} from './windows_host.mjs';

const {scenePlan,normalizeFinish,buildFinishScript,authorFinish}=loadPanelOperation('camera-shutter-dump');

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

// The bundled sounds as the panel unpacks them on Windows: through a fake host
// (another realm, so its bytes fail `instanceof`) that holds the real .b64 files.
const W_HOME='C:\\Users\\\uD64D\uAE38\uB3D9';
const W_PLUGIN=W_HOME+'\\.selects\\skills\\camera-shutter-dump';
const W_STORE=W_HOME+'\\.selects\\plugin-data\\camera-shutter-dump\\sfx';
function soundHost(manifestText){
 const files={[W_PLUGIN+'\\sfx\\manifest.json']:manifestText??fs.readFileSync(path.join(dir,'sfx','manifest.json'),'utf8')};
 for(const name of fs.readdirSync(path.join(dir,'sfx')))if(name.endsWith('.b64'))files[W_PLUGIN+'\\sfx\\'+name]=fs.readFileSync(path.join(dir,'sfx',name),'utf8');
 const host=fakeHost({files});
 const {unpackSounds,samePath}=loadPanelFunctions(panelText,['unpackSounds','sha256Hex','samePath'],{...hostGlobals(host),atob,crypto:globalThis.crypto});
 const sdk={runShell:()=>{throw Error('no shell on this path')}};
 return {host,unpack:()=>unpackSounds(sdk),samePath};
}
const panelText=fs.readFileSync(path.join(dir,'panel.tsx'),'utf8');

test('the host I/O block is Archive Vlog\'s, unchanged, and no POSIX shell is left',()=>{
 assert.equal(hostBlock(panelText),REFERENCE_BLOCK);
 assert.deepEqual(posixHits(panelText),[]);
 assert.doesNotMatch(panelText,/runShell/,'no shell call at all');
});

test('bundled sounds unpack through FileSystem, with matching hashes, and are reused',async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'sfx','manifest.json'),'utf8'));
 const {host,unpack}=soundHost();
 const files=await unpack();
 assert.deepEqual(Object.keys(files).sort(),[1,2,3,4,5,6].map(i=>'shutter.'+i));
 for(const [key,v] of Object.entries(manifest))assert.deepEqual({...files[key]},{path:W_STORE+'\\'+v.file,duration:v.duration});
 const first=Buffer.from(host.store.get(files['shutter.1'].path));
 assert.equal(first.toString('ascii',0,4),'RIFF');
 assert.equal(first.readUInt32LE(24),44100);
 // Padded past the longest Draft range (14/30 s) so an overlay always fits inside the file.
 assert.ok(manifest['shutter.1'].duration>14/30+0.02);
 // Selects skips imported media shorter than one second, so every file is padded past it.
 for(const v of Object.values(manifest)){
  const data=Buffer.from(host.store.get(W_STORE+'\\'+v.file)),at=data.indexOf('data',12,'ascii');
  const seconds=data.readUInt32LE(at+4)/data.readUInt32LE(28);
  assert.ok(seconds>=1.1&&Math.abs(seconds-v.duration)<1e-6,v.file+' lasts '+seconds+' s');
 }
 const writes=()=>host.calls.filter(c=>c[0]==='writeFile').length;
 assert.equal(writes(),6);
 await unpack();
 assert.equal(writes(),6,'matching copies are reused');
 host.store.set(files['shutter.1'].path,host.RealmBytes.from(Buffer.from('corrupt')));
 await unpack();
 assert.equal(writes(),7);
 assert.equal(Buffer.from(host.store.get(files['shutter.1'].path)).toString('ascii',0,4),'RIFF');
});

test('a bad manifest or a tampered sound is refused',async()=>{
 await assert.rejects(soundHost(JSON.stringify({x:{file:'../x',sha256:'0'.repeat(64)}})).unpack(),/manifest/);
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'sfx','manifest.json'),'utf8'));
 manifest['shutter.1'].sha256='0'.repeat(64);
 await assert.rejects(soundHost(JSON.stringify(manifest)).unpack(),/does not match its manifest: shutter-v3-1\.wav/);
});

test('imports are matched whatever the path\'s case or slashes',()=>{
 const {samePath}=soundHost();
 assert.ok(samePath(W_STORE+'\\shutter-v3-1.wav',W_STORE.toLowerCase().replaceAll('\\','/')+'/shutter-v3-1.wav'));
 assert.ok(!samePath(W_STORE+'\\shutter-v3-1.wav',W_STORE+'\\shutter-v3-2.wav'));
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

test('the Panel builds the plan and finishing step itself, with no Node.js',()=>{
 const panel=fs.readFileSync(path.join(dir,'panel.tsx'),'utf8');
 assert.doesNotMatch(panel,/\bnode ["$]|build-script/);
 assert.match(buildFinishScript(request()),/Finish Camera Shutter Dump Draft/);
 assert.throws(()=>buildFinishScript({...request(),mode:'other'}),/Unsupported/);
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

test('an old Selects build gets the update message, not "Reinstall"',()=>{
 assert.ok(panelText.includes(NEWER_SELECTS));
});
