import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {loadPanelModule,disposePanelModule} from './panel_module_fixture.mjs';
const source=fs.readFileSync(new URL('../plugins/jude-kinetic-style/panel.tsx',import.meta.url),'utf8');
async function run(layouts){
 const words=layouts.flatMap((_,scene)=>Array.from({length:4},(_,line)=>({text:'word'+scene+line,startFrame:scene*120+line*24,endFrame:scene*120+line*24+20})));
 const scenes=layouts.map((layout,i)=>({layout,lines:Array.from({length:4},(_,j)=>({from:i*4+j,to:i*4+j,serif:false}))}));
 const tracks=[],placed=[];
 const api=loadPanelModule(source,{names:['runPipeline','placements'],overrides:{judeAttached:()=>{},readDraft:async()=>({words,files:{},mains:[],fps:24,endFrame:layouts.length*120}),probeFrameSizes:async()=>{},validatePlan:()=>scenes,hostJoin:(...parts)=>parts.join('/'),hostNeed:()=>({mkdir:async()=>{}}),judeSharedCaptionFaces:async()=>({}),judeProtectObservedFaces:async()=>({}),placeBehind:async(_env,_src,_draft,items)=>{for(const row of items.captions)row.parameters.matte={sprite:'fixture-mask',w:20,h:20};return[]}}});
 // Native Sequence.placeAsOverlay only reuses its outermost video lane.
 // A collision mints a new outer lane; it never searches empty inner lanes.
 const draft={rangeAtFrames:async(start,end)=>({start,end}),addMotionGraphic:async row=>{
  let lane=tracks.at(-1);if(!lane||lane.some(x=>x.within.start<row.within.end&&x.within.end>row.within.start)){lane=[];tracks.push(lane)}lane.push(row);placed.push({...row,lane:tracks.length-1});
 },commitAll:async()=>{}};
 try{
  const expected=api.placements(scenes,words,24,layouts.length*120);
  await api.runPipeline({dataDir:'/fixture',status:()=>{},writeText:async()=>{},runScript:async(script,summary)=>{
   if(!summary.startsWith('Add editable'))return 0;
   return new Function('selects','return '+stripTypeScriptTypes('(async()=>{'+script+'})()',{mode:'strip'}))({draft:()=>draft});
  }},'project','draft',{copy:false,planOverride:{},music:false});
  return {tracks,placed,expected};
 }finally{disposePanelModule(api)}
}
test('three four-line scenes reuse four editable tracks instead of climbing to ten',async()=>{
 const {tracks,placed,expected}=await run(['stack','stack','stack']);assert.equal(tracks.length,4);assert.equal(placed.length,12);
 const key=x=>JSON.stringify([x.start,x.end,x.parameters]);
 assert.deepEqual(placed.map(x=>key({start:x.within.start,end:x.within.end,parameters:x.parameters})).sort(),[...expected.captions].map(key).sort());
});
test('card backgrounds stay below their timed editable words; sequential card lines share lanes',async()=>{
 const {tracks,placed}=await run(['stack','card','stack']);assert.equal(tracks.length,4);assert.equal(placed.length,13);
 const card=placed.find(x=>x.label.includes('Card'));const words=placed.filter(x=>x.label.includes('Caption')&&x.within.start>=120&&x.within.start<240);
 assert.equal(words.length,4);assert.ok(words.every(x=>x.lane>card.lane));
 for(const lane of tracks)for(let i=0;i<lane.length;i++)for(let j=i+1;j<lane.length;j++)assert.ok(lane[i].within.end<=lane[j].within.start||lane[j].within.end<=lane[i].within.start);
});

test('left captions retain their individual person masks while reusing the same four depths',async()=>{
 const {tracks,placed}=await run(['left','left']);assert.equal(tracks.length,4);assert.equal(placed.length,8);
 assert.ok(placed.every(x=>x.parameters.matte?.sprite==='fixture-mask'));assert.ok(placed.every(x=>x.editableParameters.some(p=>p.key==='text')));
});
