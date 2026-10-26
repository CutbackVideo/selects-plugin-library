import assert from 'node:assert/strict';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {planGallery} from '../plugins/photo-gallery-no2/format.mjs';
import {galleryFixture} from './gallery_authoring_fixture.mjs';
import {holdFixture} from './gallery_hold_fixture.mjs';

const media = (kind='video',seconds=853/60) => Array.from({length:21},(_,i)=>({resourceId:'v'+i,kind,width:128,height:96,durationFrames:Math.round(seconds*60),durationSeconds:seconds}));
const input = (fps=60,kind='video') => ({media:media(kind),manualBpm:113,durationFrames:853,fps});
for(const fps of [25,30000/1001,30,50,60,90,120])test('Gallery preparation covers the actual Project duration at '+fps,()=>{
 const plan=planGallery(input(fps),{preparing:true});
 const seconds=Math.round(853*fps/60)/fps,expected=Math.max(853,Math.ceil(seconds*60-1e-9));
 assert.equal(plan.preparation.durationFrames,expected);
 assert.equal(plan.preparation.minimumSeconds,seconds);
 assert.ok(plan.preparation.durationFrames/60+1e-9>=seconds);
 const prepared={...input(fps),media:media('video',expected/60)};
 assert.equal(planGallery(prepared).durationFrames,Math.round(853*fps/60));
});
for(const fps of [30,50,90])test('Gallery refuses a rounded duration that conceals a physical shortage at '+fps,()=>{
 assert.throws(()=>planGallery(input(fps)),/short/i);
 assert.throws(()=>planGallery({...input(fps,'image'),music:{resourceId:'audio',durationFrames:853,durationSeconds:853/60}}),/music.*short/i);
});
test('Gallery exact seconds take precedence over rounded frames, including a sub-frame shortage',()=>{
 const rows=media();rows[0]={...rows[0],durationSeconds:853/60-.001};
 assert.throws(()=>planGallery({...input(),media:rows}),/short/i);
 assert.throws(()=>planGallery({...input(60,'image'),music:{resourceId:'audio',durationFrames:913,durationSeconds:913/60-.001,startFrame:60}}),/music.*short/i);
});
test('Gallery can prepare a valid source shorter than half a reference frame',()=>{
 const rows=media('video',1/240),plan=planGallery({...input(),media:rows},{preparing:true});
 assert.equal(rows[0].durationFrames,0);assert.equal(plan.preparation.durationFrames,853);
});
test('Gallery preparation validates timing and focus before a short video is processed',()=>{
 const short={...input(30),media:media('video',1)};
 for(const change of [{manualBpm:0},{manualBpm:1},{manualBpm:999999},{durationFrames:0},{durationFrames:200},{fps:0},{media:short.media.map((m,i)=>i?m:{...m,focusY:-.1})}])assert.throws(()=>planGallery({...short,...change},{preparing:true}));
 const plan=planGallery({...short,manualBpm:undefined},{preparing:true,pendingBpm:true});
 assert.equal(plan.bpmSource,'pending');assert.equal(plan.bpm,null);
 assert.throws(()=>planGallery({...short,manualBpm:undefined},{preparing:true}),/BPM/);
 assert.throws(()=>planGallery({...short,manualBpm:undefined},{pendingBpm:true}),/pending|BPM/i);
});
for(const minify of [false,true])for(const fault of ['manualBpm','durationFrames','music','seconds'])test('Gallery compiled preparation rejects '+fault+' before any imports or save (minify='+minify+')',async()=>{
 const f=galleryFixture({minify,mix:'video',fps:30,music:false}),request=structuredClone(f.input);
 if(fault==='manualBpm')request.manualBpm=1;
 if(fault==='durationFrames')request.durationFrames=200;
 if(fault==='music'){
  for(const r of f.resources.filter(r=>r.type==='Audio'))r.durationSeconds=853/60;
  for(const n of f.nodes.filter(n=>n.type==='audio'))n.durationSeconds=853/60;
  request.music={resourceId:'a0',path:'/audio/Sound 0.wav',durationFrames:853,startFrame:0};
 }
 if(fault==='seconds'){
  for(const r of f.resources.filter(r=>r.type==='Video'))r.durationSeconds=0;
  for(const n of f.nodes.filter(n=>n.type==='video'))n.durationSeconds=0;
 }
 await assert.rejects(f.create({input:request}));
 assert.equal(f.commits.length,0);assert.equal(f.saved.size,0);assert.equal(f.observed.length,0);
});
for(const fps of [30,50,90])test('Gallery real prepared file covers the Project source window at '+fps,async t=>{
 const f=await holdFixture(t),plan=planGallery(input(fps),{preparing:true});
 const result=await f.run({},{videos:[{path:f.source}],durationFrames:plan.preparation.durationFrames});
 const info=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-count_frames','-show_entries','stream=nb_read_frames,r_frame_rate:format=duration','-of','json',result.videos[0].outputPath],{encoding:'utf8'}));
 assert.equal(Number(info.streams[0].nb_read_frames),854);
 assert.ok(Number(info.format.duration)+1e-6>=plan.durationFrames/fps);
});
