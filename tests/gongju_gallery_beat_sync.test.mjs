import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadPanelModule,disposePanelModule} from './panel_module_fixture.mjs';

const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/gongju-gallery/beat-sync-v1.json',import.meta.url),'utf8'));
const source=fs.readFileSync(new URL('../plugins/gongju-gallery/panel.tsx',import.meta.url),'utf8');
const panel=loadPanelModule(source,{names:['galleryScript']});
test.after(()=>disposePanelModule(panel));
const referenceFps=30000/1001;
const beat=fixture.measurement.beatAnalysis;
// Existing composition: title, then15 consecutive quarter-note shots. Choose
// one global first-beat index, not a different nearest event for every cut.
const firstVisibleBeatIndex=7;
const targets=Array.from({length:15},(_,i)=>beat.firstBeat+(firstVisibleBeatIndex+i)*60/beat.bpm);
const bandTargets=beat.onsets.filter(([t,band])=>band==='m'&&t>3.5&&t<11.2).map(([t])=>t);

async function author(fps){
 const rows=[],graphics=[],audio=[],resources=[];let cursor=0,commits=0,canvas;
 const draft={meta:async()=>({fps}),setFrameSize:async value=>{canvas=value;},
   insertGap:async({seconds})=>{cursor+=Math.round(seconds*fps);},
   insertResource:async value=>{const duration=Math.round((value.sourceRange.endSeconds-value.sourceRange.startSeconds)*fps);rows.push({clipId:rows.length,resourceId:value.resourceId,startFrame:cursor,endFrame:cursor+duration,sourceRange:value.sourceRange});cursor+=duration;},
   clips:async()=>rows,rangeAtFrames:async(start,end)=>({start,end}),
   addMotionGraphic:async value=>{graphics.push(value);},overlayResource:async value=>{audio.push(value);},
   validate:async()=>({ok:true}),commitAll:async()=>{commits++;return{createdDraftId:'measured-montage'};}};
 const selects={project:()=>({createDraft:async()=>draft,resource:(...args)=>{resources.push(args);return{resourceId:args[0]};}})};
 const script=panel.galleryScript({projectId:'p',draftName:'same-song',shotIds:Array.from({length:15},(_,i)=>'original-'+i),audioId:'fixed-song',title:'pov: you open my gallery'});
 const result=await new Function('selects','return (async()=>{'+script+'})()')(selects);
 return{rows,graphics,audio,resources,canvas,commits,result};
}
function assertPhase(times,targets,fps){
 assert.equal(times.length,targets.length);
 times.forEach((t,i)=>assert.ok(Math.abs(t-targets[i])<=1/fps+.001,`cut${i+1} differs from the measured event by ${(t-targets[i]).toFixed(6)} seconds`));
}
function assertMusicZero(actual,end){
 assert.equal(actual.audio.length,1);
 assert.deepEqual(actual.resources,[['fixed-song']],'music resource is used without a trimmed resource span');
 assert.equal(actual.audio[0].resource.resourceId,'fixed-song');
 assert.deepEqual({...actual.audio[0].over},{start:0,end});
 assert.equal(actual.audio[0].sourceStartSeconds??0,0,'SDK default music source start remains zero');
 assert.equal(actual.audio[0].sourceRange,undefined,'music is not shifted with an alternate source interval');
 assert.equal(actual.audio[0].playbackSpeed,undefined,'music is not retimed');
}

test('statistical timing fixture belongs to the exact unchanged fixed song and real analyzer',()=>{
 const bytes=fs.readFileSync(new URL('../plugins/gongju-gallery/assets/'+fixture.source.filename,import.meta.url));
 assert.equal(bytes.length,fixture.source.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.source.sha256);
 const generator=fs.readFileSync(new URL('./fixtures/gongju-gallery/measure.mjs',import.meta.url));
 assert.equal(createHash('sha256').update(generator).digest('hex'),fixture.generation.generator.sha256);
 assert.equal(fixture.generation.factory,'createBeatSyncMeasurer');assert.ok(fixture.generation.implementation.length>=8);
 assert.ok(fixture.generation.implementation.every(row=>/^[a-f0-9]{64}$/.test(row.sha256)));
 assert.equal(fixture.measurement.status,'measured');assert.equal(fixture.measurement.startSeconds,0);assert.equal(beat.grid,'accepted');
 assert.equal(bandTargets.length,15);assert.ok(beat.hitRate>=.7);assert.ok(beat.residualMedianMs<=20);
});
for(const fps of [24000/1001,referenceFps])test('whole production script stays on the measured same-song phase at '+fps+' fps',async()=>{
 const actual=await author(fps),times=actual.rows.map(row=>row.startFrame/fps);
 assertPhase(times,targets,fps);assertPhase(times,bandTargets,fps);
 assert.equal(actual.rows.length,15);assert.equal(new Set(actual.rows.map(row=>row.resourceId)).size,15);
 assert.equal(actual.commits,1);assert.equal(actual.result.draftId,'measured-montage');
 assert.deepEqual({...actual.canvas},{width:1080,height:1440});
 assert.deepEqual({...actual.graphics[0].within},{start:0,end:actual.rows[0].startFrame});
 const end=Math.round(341/referenceFps*fps);
 assert.equal(actual.rows.at(-1).endFrame,end);assertMusicZero(actual,end);
 for(let i=1;i<actual.rows.length;i++)assert.equal(actual.rows[i].startFrame,actual.rows[i-1].endFrame,'no inter-shot gap');
 assert.ok(actual.rows.every(row=>row.endFrame>row.startFrame));
});
test('measurement comparison rejects an explicitly injected minus0.4second phase fault',async()=>{
 const actual=await author(referenceFps);
 // Negative sensitivity control only, NOT a historical failure reproduction.
 const injected=actual.rows.map(row=>row.startFrame/referenceFps-.4);
 assert.throws(()=>assertPhase(injected,targets,referenceFps),/cut1 differs/);
 assert.throws(()=>assertPhase(injected,bandTargets,referenceFps),/cut1 differs/);
});
test('music source offset sensitivity is checked separately from visual phase',async()=>{
 const actual=await author(referenceFps);
 // Injected request fault only; the production script does not set this offset.
 actual.audio[0]={...actual.audio[0],sourceStartSeconds:.4};
 assert.throws(()=>assertMusicZero(actual,341),/music source start remains zero/);
});
