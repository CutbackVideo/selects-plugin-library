import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {loadPanelOperation} from './panel_operation.mjs';
import {hostBlock,REFERENCE_BLOCK,posixHits,NEWER_SELECTS,loadPanelFunctions,fakeHost,hostGlobals} from './windows_host.mjs';

const {scenePlan,normalizeFinish,buildFinishScript,authorFinish,LOOK}=loadPanelOperation('four-photo-stop-motion');

const dir=path.resolve(import.meta.dirname,'../plugins/four-photo-stop-motion');
// Independent reference measurements (ffmpeg, 30 fps, 347 frames): photo cut frames.
const INTRO_CUTS=[0,5,12,17,24,28,36,40];
const BLACK=[48,80];
const BEATS=[80,98,117,136,155,174,193,212,231,250,269,288,307];
const OUTRO=[325,347];

test('plan matches the measured reference timeline',()=>{
 const plan=scenePlan();
 assert.equal(plan.durationFrames,347);
 assert.deepEqual(plan.canvas,{width:1080,height:1440});
 const o=plan.occurrences;
 assert.equal(o.length,21);
 assert.deepEqual(o.slice(0,8).map(x=>x.startFrame),INTRO_CUTS);
 assert.equal(o[7].endFrame,BLACK[0]);
 assert.deepEqual(o.slice(8).map(x=>x.startFrame),BEATS);
 assert.equal(o[20].endFrame,OUTRO[0]);
 assert.deepEqual([plan.outro.startFrame,plan.outro.endFrame],OUTRO);
 assert.deepEqual(o.map(x=>x.slot).join(''),'ABCDABCDABCDABCDABCDA');
 assert.ok(o.slice(0,8).every(x=>x.kind==='intro')&&o.slice(8).every(x=>x.kind==='hit'));
 for(let i=1;i<o.length;i++)if(i!==8)assert.equal(o[i].startFrame,o[i-1].endFrame,'no gaps except the black pause');
 // Beats are ~0.631 s apart (about 95 BPM).
 const gaps=BEATS.slice(1).map((b,i)=>b-BEATS[i]);assert.ok(gaps.every(g=>g>=18&&g<=19));
});

test('other frame rates keep the same times',()=>{
 for(const fps of [24000/1001,60]){
  const plan=scenePlan(fps),k=fps/30;
  assert.equal(plan.durationFrames,Math.round(347*k));
  assert.deepEqual(plan.occurrences.slice(8).map(x=>x.startFrame),BEATS.map(f=>Math.round(f*k)));
  assert.ok(plan.occurrences.every(x=>x.endFrame>x.startFrame));
 }
 assert.throws(()=>scenePlan(0),/frame rate/);
});

test('beat hit shows the reference states by time at 23.976, 30 and 60 fps',async()=>{
 // Evaluate the effect's frame logic with a stub renderer.
 const src=fs.readFileSync(path.join(dir,'panel.tsx'),'utf8');
 const body=src.slice(src.indexOf('const refFrame='),src.indexOf('const x=Math.max'));
 const state=(frame,fps,refStart=80)=>{const startFrame=Math.round(refStart*fps/30);return new Function('frame','data','g',body+'return {hit,blur,shake};')(frame,{fps,startFrame,refStart,kind:'hit',introBlur:5,hitBlur:10,hitShake:[0,0,12]},{q:1});};
 const at=(fps,refStart)=>Array.from({length:Math.ceil(fps*0.2)},(_,f)=>state(f,fps,refStart)).filter(s=>s.hit).map(s=>s.shake);
 assert.deepEqual(at(30,80),[0,0,12]);
 assert.deepEqual(at(24000/1001,80),[0,0,12]);
 assert.deepEqual(at(60,80),[0,0,0,0,12,12]);
 assert.equal(state(3,30).hit,false);
 // Beat 117 starts 21 ms late at 23.976 fps (frame 94 = 3.921 s vs 3.900 s): by 4.004 s
 // (clip frame 2) the reference is already sharp, so the Draft must be too.
 assert.equal(Math.round(117*(24000/1001)/30),94);
 assert.equal(state(2,24000/1001,117).hit,false);
});

test('the Panel builds the plan and finishing step itself, with no Node.js',()=>{
 assert.doesNotMatch(fs.readFileSync(path.join(dir,'panel.tsx'),'utf8'),/\bnode ["$]|build-script/);
});

test('look constants match the measured blur and shake',()=>{
 assert.equal(LOOK.introBlur,5);assert.equal(LOOK.hitBlur,10);assert.deepEqual(LOOK.hitShake,[0,0,12]);
});

test('bundled music outlasts the Draft',()=>{
 const file=path.join(dir,'assets','music.mp3');assert.ok(fs.statSync(file).size>50000);
 const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',file],{encoding:'utf8'});
 if(probe.status===0)assert.ok(Number(probe.stdout)>347/30+0.1,'music must be longer than the Draft');
});

// Windows: the music is found through the host FileSystem (no shell) and an
// earlier import is reused whatever the path's case or slashes.
const W_HOME='C:\\Users\\\uD64D\uAE38\uB3D9';
const W_MUSIC=W_HOME+'\\.selects\\skills\\four-photo-stop-motion\\assets\\music.mp3';
const loadMusic=host=>loadPanelFunctions(panelSource,['readMediaPages','inventory','isBundledMusic','ensureMusic'],{...hostGlobals(host),INVENTORY:''});

test('the host I/O block is Archive Vlog\'s, unchanged, and no POSIX shell is left',()=>{
 assert.equal(hostBlock(panelSource),REFERENCE_BLOCK);
 assert.deepEqual(posixHits(panelSource),[]);
 assert.doesNotMatch(panelSource,/runShell/,"no shell call at all");
});

test('Windows: the music resolves through FileSystem and is imported once',async()=>{
 const host=fakeHost({files:{[W_MUSIC]:'x'}});
 const {ensureMusic}=loadMusic(host);
 const imports=[];let rows=[];
 const sdk={runShell:()=>{throw Error('no shell on this path')},runScript:async({script})=>{
  if(script.includes('importFiles')){imports.push(JSON.parse(/paths:(\[.*?\])/.exec(script)[1])[0]);rows=[{resourceId:'m1',type:'Audio',path:imports[0]}];return{result:{}};}
  return{result:{array:true,page:{rows},total:rows.length}};
 }};
 assert.equal(await ensureMusic(sdk,'p'),'m1');
 assert.deepEqual(imports,[W_MUSIC]);
 rows=[{resourceId:'m1',type:'Audio',path:W_MUSIC.toLowerCase().replaceAll('\\','/')}];
 assert.equal(await ensureMusic(sdk,'p'),'m1');
 assert.equal(imports.length,1,'an earlier import is reused');
});

test('an import through a linked install folder is reused, other music.mp3 files are not',()=>{
 const {isBundledMusic}=loadMusic(fakeHost());
 assert.ok(isBundledMusic('/Volumes/dev/plugins/four-photo-stop-motion/assets/music.mp3','~/.selects/skills/four-photo-stop-motion/assets/music.mp3'));
 assert.ok(!isBundledMusic('~/Music/music.mp3','~/.selects/skills/four-photo-stop-motion/assets/music.mp3'));
});

test('a missing install says the music is missing',async()=>{
 const {ensureMusic}=loadMusic(fakeHost());
 const sdk={runShell:async()=>({stdout:'\r\n'}),runScript:async()=>{throw Error('not reached')}};
 await assert.rejects(ensureMusic(sdk,'p'),/Bundled music is missing/);
});

const plan=scenePlan();
const request=()=>({mode:'finish',projectId:'p',draftId:'d',fps:30,musicResourceId:'m',
 photos:['A','B','C','D'].map((_,i)=>({resourceId:'img'+i,width:i%2?1200:1600,height:i%2?1600:1200})),
 placements:plan.occurrences.map((o,i)=>({slot:o.slot,clipId:100+i,trackId:'t',startFrame:o.startFrame,endFrame:o.endFrame}))});

test('finish input needs exactly four photos and the reference placements',()=>{
 assert.equal(normalizeFinish(request()).placements.length,21);
 const short=request();short.photos.pop();assert.throws(()=>normalizeFinish(short),/exactly 4/);
 const moved=request();moved.placements[9].startFrame+=1;assert.throws(()=>normalizeFinish(moved),/reference plan/);
 const noMusic=request();delete noMusic.musicResourceId;assert.throws(()=>normalizeFinish(noMusic),/Music/);
});

function fakeSelects(){
 const log={transforms:[],effects:[],graphics:[],overlays:[],commits:0};
 let clips=plan.occurrences.map((o,i)=>({clipId:100+i,trackId:'t',trackKind:'video',resourceId:'img'+'ABCD'.indexOf(o.slot),startFrame:o.startFrame,endFrame:o.endFrame}));
 const types=new Map([['img0','Image'],['img1','Image'],['img2','Image'],['img3','Image'],['m','Audio']]);
 const d={meta:async()=>({fps:30,durationFrames:347,frameSize:{width:1080,height:1440}}),clips:async()=>clips.map(c=>({...c})),
  setClipTransform:async o=>{log.transforms.push(o);},addVideoEffect:async o=>{log.effects.push(o);},
  addMotionGraphic:async o=>{log.graphics.push(o);},rangeAtFrames:async(a,b)=>({a,b}),
  overlayResource:async({resource,over})=>{log.overlays.push({id:resource.id,...over});clips.push({clipId:900,trackId:'a',trackKind:'audio',resourceId:resource.id,startFrame:over.a,endFrame:over.b});return {atFrame:over.a};},
  commitAll:async()=>{log.commits++;return {commitId:'c1'};}};
 const project={meta:async()=>({draftIds:['d']}),resources:async()=>[...types].map(([resourceId,type])=>({resourceId,type})),resource:id=>({id})};
 return {selects:{project:()=>project,draft:()=>d},log};
}

test('finish adds 21 crop/blur effects, the outro and full-length music, then saves once',async()=>{
 const {selects,log}=fakeSelects();
 const result=await vm.runInNewContext('(async()=>{'+buildFinishScript(request())+'})()',{selects});
 assert.equal(result.status,'saved',result.message);
 assert.equal(log.transforms.length,21);assert.equal(log.effects.length,21);assert.equal(log.commits,1);
 assert.deepEqual(log.effects.map(e=>e.parameters.kind),[...Array(8).fill('intro'),...Array(13).fill('hit')]);
 assert.deepEqual([log.graphics[0].within.a,log.graphics[0].within.b],OUTRO);
 assert.deepEqual([log.overlays[0].a,log.overlays[0].b],[0,347]);
 // Cover crop: a 1600x1200 landscape photo shown in 1080x1440 keeps the 3:4 window.
 const g=log.effects[0].parameters.g;assert.ok(Math.abs(g.mw/g.mh-1080/1440)<1e-9&&g.mh===1200);
});

test('finish refuses a Draft whose clips moved and does not save',async()=>{
 const {selects,log}=fakeSelects();
 const input=normalizeFinish(request());input.placements[3].clipId=999;
 const result=await authorFinish(selects,input,plan,LOOK,'','');
 assert.equal(result.status,'notSaved');assert.equal(log.commits,0);
});

// Native placement behavior is exercised through runScript in native_image_sdk_migration.test.mjs.
const panelSource=fs.readFileSync(path.join(dir,'panel.tsx'),'utf8');

test('an old Selects build gets the update message, not "Reinstall"',()=>{
 assert.ok(panelSource.includes(NEWER_SELECTS));
});
