import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {loadPanelOperation} from './panel_operation.mjs';

const {scenePlan,normalizeFinish,buildFinishScript,authorFinish,LOOK,SUBTITLES,DEFAULT_TEXT,RAMP,MUSIC}=loadPanelOperation('six-clip-velocity');

const dir=path.resolve(import.meta.dirname,'../plugins/six-clip-velocity');
// Independent reference measurements (ffmpeg, 30 fps, 699 frames, 1080x1440).
const SHOTS=[0,175,206,235,264,293,323,352,382,411,440,469,499,527,557,587,616]; // shot starts
const FLASH_CUT=411;
const FADE=[645,672]; // last shot fades to black; 672-699 is black
const BLOCK='3425664'; // 1-based video per shot in the seven-shot block, played twice

const pieces=plan=>plan.segments.flatMap(s=>s.pieces.map(p=>({...p,video:s.video})));

test('plan matches the measured reference timeline',()=>{
 const plan=scenePlan();
 assert.equal(plan.durationFrames,699);
 assert.deepEqual(plan.canvas,{width:1080,height:1440});
 assert.deepEqual(plan.segments.map(s=>s.startFrame),SHOTS);
 assert.equal(plan.segments.map(s=>s.video+1).join(''),'12'+BLOCK+'1'+BLOCK);
 assert.deepEqual(plan.cuts.filter(c=>c.kind==='flash').map(c=>c.frame),[FLASH_CUT]);
 assert.equal(plan.cuts.filter(c=>c.kind==='blur').length,15);
 // Cuts are two beats apart (about 0.976 s at ~123 BPM).
 const gaps=SHOTS.slice(3).map((s,i)=>s-SHOTS[i+2]);assert.ok(gaps.every(g=>g>=28&&g<=30));
 const all=pieces(plan);
 assert.equal(all.length,114);
 assert.equal(all[0].startFrame,0);
 for(let i=1;i<all.length;i++)assert.equal(all[i].startFrame,all[i-1].startFrame+all[i-1].frames,'pieces are contiguous');
 // The last shot runs under the fade to the end, because export stops at the last video clip.
 const last=all.at(-1);assert.equal(last.startFrame+last.frames,699);assert.equal(last.speed,1);
});

test('ramps are fast at both cuts and slow in the middle',()=>{
 assert.deepEqual(RAMP.speeds,[4,2.5,1.2,0.5,1,1.8,4]);
 const s=scenePlan().segments[3];
 assert.deepEqual(s.pieces.map(p=>p.speed),RAMP.speeds);
 assert.equal(s.pieces.reduce((a,p)=>a+p.frames,0),s.endFrame-s.startFrame);
});

test('the second block replays the exact source ranges of the first',()=>{
 for(const fps of [30,24000/1001,60]){
  const seg=scenePlan(fps).segments;
  for(let i=0;i<7;i++){
   const a=seg[2+i].pieces,b=seg[10+i].pieces;
   assert.deepEqual(b.map(p=>[p.speed,p.inSec]).slice(0,a.length),a.map(p=>[p.speed,p.inSec]));
  }
 }
});

test('back-to-back shots of one video never touch in the source',()=>{
 // Contiguous source at the same speed makes the editor join two clips into one.
 for(const fps of [30,24000/1001,60]){
  const seg=scenePlan(fps).segments;
  for(let i=1;i<seg.length;i++)if(seg[i].video===seg[i-1].video){
   const p=seg[i-1].pieces.at(-1),n=seg[i].pieces[0];
   const snap=(sec,speed)=>Math.round(sec*fps/speed)*speed/fps; // start trims snap to Draft frames
   const gap=snap(n.inSec,n.speed)-(snap(p.inSec,p.speed)+p.frames*p.speed/fps);
   assert.ok(gap>0.2,`gap ${gap} at ${fps} fps`);
  }
 }
});

test('other frame rates keep the same times',()=>{
 for(const fps of [24000/1001,60]){
  const plan=scenePlan(fps),k=fps/30;
  assert.equal(plan.durationFrames,Math.round(699*k));
  assert.deepEqual(plan.segments.map(s=>s.startFrame),SHOTS.map(f=>Math.round(f*k)));
  const all=pieces(plan);assert.equal(all.length,114);
  for(let i=1;i<all.length;i++)assert.equal(all[i].startFrame,all[i-1].startFrame+all[i-1].frames);
  assert.ok(all.every(p=>p.frames>=1));
 }
 assert.throws(()=>scenePlan(0),/frame rate/);
});

test('required footage per video',()=>{
 assert.deepEqual(scenePlan().requiredSeconds,[7.83,3.9,2,5.6,2.06,4.36]);
});

// Effect and overlay frame logic, evaluated with a stub renderer.
const src=fs.readFileSync(path.join(dir,'panel.tsx'),'utf8');
const effectBody=src.slice(src.indexOf(' const t=(frame/data.speed'),src.indexOf(' const x=Math.max'));
const blurAt=(frame,data)=>new Function('frame','data',effectBody+'return amt;')(frame,data);

test('blur covers the five reference frames around each cut, whatever the piece speed',()=>{
 const plan=scenePlan();
 const blurCuts=plan.cuts.filter(c=>c.kind==='blur').map(c=>c.ref);
 // In a retimed clip the frame counter runs in source frames: speed x Draft frames.
 const out=[];
 for(const p of pieces(plan))for(let k=0;k<p.frames;k++){
  const amt=blurAt(k*p.speed,{fps:30,startFrame:p.startFrame,speed:p.speed,blurCuts,profile:LOOK.blurProfile});
  if(amt>0)out.push(p.startFrame+k);
 }
 const want=blurCuts.flatMap(c=>[c-2,c-1,c,c+1,c+2]);
 assert.deepEqual(out,want);
});

test('flash is white then dark; the fade is to black',()=>{
 const body=src.slice(src.indexOf('const OVERLAY_CODE'));
 const logic=body.slice(body.indexOf(' let a=0;'),body.indexOf(' return <div'));
 const alpha=(t,kind)=>new Function('t','data',logic+'return a;')(t,{kind,flash:LOOK.flash,fade:LOOK.fade});
 assert.deepEqual(LOOK.flash.alpha.map((_,k)=>alpha(408+k,'flash')),LOOK.flash.alpha);
 assert.ok(Math.abs(alpha(645,'fade')+0.35)<1e-9);
 assert.equal(alpha(672,'fade'),-1);assert.equal(alpha(698,'fade'),-1);
});

test('subtitle timing and geometry match the reference',()=>{
 assert.deepEqual(SUBTITLES.line1.onsets,[2,16,26,36]);
 assert.deepEqual(SUBTITLES.line1.out,[85,94]);
 assert.equal(SUBTITLES.line2.onset,73);
 assert.deepEqual(SUBTITLES.phrase2.onsets,[97,131]);
 assert.deepEqual([SUBTITLES.line1.y,SUBTITLES.line2.y,SUBTITLES.phrase2.y],[684,727,719]);
 assert.deepEqual([SUBTITLES.line1.capPx,SUBTITLES.line2.capPx,SUBTITLES.phrase2.capPx],[36,22,30]);
});

test('bundled music exists and outlasts the Draft',()=>{
 // The panel joins MUSIC.file onto the install folder (hostJoin(plugin,...MUSIC.file)).
 const file=path.join(dir,...MUSIC.file);assert.ok(fs.statSync(file).size>50000);
 assert.ok(MUSIC.seconds>699/30,'music must cover the Draft');
 const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',file],{encoding:'utf8'});
 if(probe.status===0){assert.ok(Number(probe.stdout)>699/30,'music must cover the Draft');assert.ok(Math.abs(Number(probe.stdout)-MUSIC.seconds)<0.05,'MUSIC.seconds matches the file');}
});

const plan=scenePlan();
const TRACK='3f0c2d64-5a8e-4f7b-9c1d-2e6b8a4f0c11';
const request=()=>({mode:'finish',projectId:'p',draftId:'d',fps:30,musicResourceId:'m',text:DEFAULT_TEXT,
 videos:Array.from({length:6},(_,i)=>({resourceId:'v'+i,width:i%2?1920:1080,height:i%2?1080:1920})),
 tracks:[TRACK],clips:pieces(plan).map((_,i)=>[100+i,0])});

test('finish request stays compact',()=>{
 // Placements travel as [clipId, trackIndex]; the request stays well under 16 KB.
 const cmd=Buffer.from(JSON.stringify({...request(),projectId:TRACK,draftId:TRACK,musicResourceId:TRACK,videos:request().videos.map(v=>({...v,resourceId:TRACK}))})).toString('base64url');
 assert.ok(cmd.length<16384,'request limit is 16 KB, got '+cmd.length);
});

test('finish input needs six videos, 114 pieces and 4+1+2 words',()=>{
 assert.equal(normalizeFinish(request()).placements.length,114);
 const five=request();five.videos.pop();assert.throws(()=>normalizeFinish(five),/exactly 6/);
 const short=request();short.clips.pop();assert.throws(()=>normalizeFinish(short),/114/);
 const dup=request();dup.clips[1][0]=100;assert.throws(()=>normalizeFinish(dup),/independent/);
 const words=request();words.text={...DEFAULT_TEXT,line1:['ONLY','THREE','WORDS']};assert.throws(()=>normalizeFinish(words),/4 words/);
 const badTrack=request();badTrack.clips[0][1]=3;assert.throws(()=>normalizeFinish(badTrack),/Invalid video piece/);
});

function fakeSelects(){
 const log={transforms:[],effects:[],graphics:[],overlays:[],commits:0};
 const clips=pieces(plan).map((p,i)=>({clipId:100+i,trackId:TRACK,trackKind:'video',resourceId:'v'+p.video,startFrame:p.startFrame,endFrame:p.startFrame+p.frames}));
 const types=new Map([...Array.from({length:6},(_,i)=>['v'+i,'Video']),['m','Audio']]);
 const d={meta:async()=>({fps:30,durationFrames:699,frameSize:{width:1080,height:1440}}),clips:async()=>clips.map(c=>({...c})),
  setClipTransform:async o=>{log.transforms.push(o);},addVideoEffect:async o=>{log.effects.push(o);},
  addMotionGraphic:async o=>{log.graphics.push(o);},rangeAtFrames:async(a,b)=>({a,b}),
  overlayResource:async({resource,over})=>{log.overlays.push({id:resource.id,...over});return {atFrame:over.a};},
  commitAll:async()=>{log.commits++;return {commitId:'c1'};}};
 const project={meta:async()=>({draftIds:['d']}),resources:async()=>[...types].map(([resourceId,type])=>({resourceId,type})),resource:id=>({id})};
 return {selects:{project:()=>project,draft:()=>d},log,clips};
}

test('finish adds 114 crop/blur effects, subtitles, flash, fade and music, then saves once',async()=>{
 const {selects,log}=fakeSelects();
 const result=await vm.runInNewContext('(async()=>{'+buildFinishScript(request())+'})()',{selects});
 assert.equal(result.status,'saved',result.message);
 assert.equal(log.transforms.length,114);assert.equal(log.effects.length,114);assert.equal(log.commits,1);
 assert.deepEqual(log.effects.map(e=>e.parameters.speed),pieces(plan).map(p=>p.speed));
 assert.deepEqual(log.graphics.map(g=>[g.label,g.within.a,g.within.b]),[['Velocity subtitles',0,150],['Velocity flash',408,419],['Velocity fade',645,699]]);
 assert.deepEqual([log.overlays[0].a,log.overlays[0].b],[0,699]);
 // Subtitle words and font stay editable in the Draft.
 const sub=log.graphics[0];
 assert.deepEqual(JSON.parse(JSON.stringify(sub.editableParameters.map(e=>[e.key,e.defaultValue]))),[['w1','MOVE'],['w2','WITH'],['w3','ME'],['w4','TONIGHT'],['l2','SLOW'],['p1','SLOW'],['p2','DOWN'],['fontFamily','']]);
 assert.ok(sub.editableParameters.every(e=>e.key in sub.parameters));
 // Cover crop: a 1920x1080 landscape video shown in 1080x1440 keeps the 3:4 window.
 const g=log.effects[1].parameters.g;assert.ok(Math.abs(g.mw/g.mh-1080/1440)<1e-9&&g.mh===1080);
});

test('finish refuses a Draft whose pieces moved and does not save',async()=>{
 const {selects,log,clips}=fakeSelects();
 clips[40].startFrame+=1;
 const result=await authorFinish(selects,normalizeFinish(request()),plan,LOOK,SUBTITLES,{});
 assert.equal(result.status,'notSaved');assert.equal(log.commits,0);assert.match(result.message,/piece 41/);
});

// Native placement behavior is exercised through runScript in native_image_sdk_migration.test.mjs.
const panelSource=fs.readFileSync(path.join(dir,'panel.tsx'),'utf8');
