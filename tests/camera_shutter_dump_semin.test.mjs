// Builds the Camera Shutter Dump Draft with every default at 25 fps through the Panel's real
// finishing script (against a recording fake Selects) and diffs the resulting timeline against
// Semin's reference Draft (tests/fixtures/camera_shutter_dump_semin.json, read back from Staging).
// Target: zero differences, apart from two intentional ones (NOT_REPRODUCED).
// Not reproduced on purpose, and checked separately below:
// - crop focusX/focusY: Semin picked them for her own photos; every slot starts at 0.5.
// - the title text: Semin's "Lake District\nMemories" was about her trip; the title is
//   the Project name (as Vlog Opening seeds its title). Its look, timing and code are hers.
const NOT_REPRODUCED=[/\.effects\.\d+\.parameters\.focus[XY]$/,/^video\.0\.parameters\.body$/,/\.effects\.\d+\.codeSha256$/];
const PROJECT_NAME='Lake District';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {loadPanelOperation} from './panel_operation.mjs';

const {scenePlan,buildFinishScript}=loadPanelOperation('camera-shutter-dump');
const ref=JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname,'fixtures/camera_shutter_dump_semin.json'),'utf8'));
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const refPhotos=ref.videoTopFirst.filter(c=>c.photo).reverse();   // bottom (photo 1) first
const refGraphics=ref.videoTopFirst.filter(c=>c.graphic);

// The plan, run on a fake Draft whose tracks stack the way the editor's do: every placed
// clip gets a new track above the existing ones; audio overlays go to one audio track.
async function buildDefault(){
 const plan=scenePlan(25);
 const tracks=[],clips=[],effects=new Map(),graphics=new Map();
 const add=(row,kind)=>{const c={clipId:clips.length+1,trackId:kind+tracks.length,trackKind:kind,transform:null,...row};clips.push(c);if(kind==='video')tracks.push(c.clipId);return c;};
 const sounds=Object.fromEntries([1,2,3,4,5,6].map(i=>['shutter.'+i,'shutter-v3-'+i+'.wav']));
 // Semin's photos (sizes from her crop effects; 11-12 carry no crop and are 2048x1365 like the rest).
 const sizes=refPhotos.map(p=>p.effects[0]?{width:p.effects[0].parameters.g.w,height:p.effects[0].parameters.g.h}:{width:2048,height:1365});
 const placements=plan.occurrences.map((o,i)=>{const c=add({resourceId:'img'+i,startFrame:o.startFrame,endFrame:o.endFrame},'video');return {slot:o.slot,clipId:c.clipId,trackId:c.trackId,startFrame:o.startFrame,endFrame:o.endFrame};});
 const types=new Map([...plan.occurrences.map((_,i)=>['img'+i,'Image']),...Object.values(sounds).map(id=>[id,'Audio'])]);
 let commits=0;
 const d={meta:async()=>({fps:25,durationFrames:plan.durationFrames,frameSize:{width:720,height:1280}}),
  clips:async()=>clips.map(c=>({...c})),rangeAtFrames:async(a,b)=>({a,b}),
  setClipTransform:async({clip,...t})=>{clips.find(c=>c.clipId===clip.clipId).transform=t;},
  addVideoEffect:async({clip,...e})=>{const list=effects.get(clip.clipId)||[];list.push(e);effects.set(clip.clipId,list);},
  overlayResource:async({resource,over})=>{add({resourceId:resource.id,startFrame:over.a,endFrame:over.b},'audio');return {atFrame:over.a};},
  addMotionGraphic:async({within,...g})=>{const c=add({resourceId:null,startFrame:within.a,endFrame:within.b},'video');graphics.set(c.clipId,g);return {clipId:c.clipId,startFrame:c.startFrame,endFrame:c.endFrame};},
  commitAll:async()=>{commits++;return {commitId:'c1'};}};
 const project={meta:async()=>({draftIds:['d']}),resources:async()=>[...types].map(([resourceId,type])=>({resourceId,type})),resource:id=>({id})};
 const script=buildFinishScript({mode:'finish',projectId:'p',draftId:'d',fps:25,title:PROJECT_NAME,photos:sizes.map((s,i)=>({resourceId:'img'+i,...s})),placements,sounds});
 const result=await vm.runInNewContext('(async()=>{'+script+'})()',{selects:{project:()=>project,draft:()=>d,
  // The preset controls as Staging lists them (trimmed); an empty font control must be left out.
  effectPresets:{get:async id=>({editableParameters:[{key:'fontFamily',type:'text',defaultValue:''},{key:id==='text-default'?'body':'kind',type:'text'}]})}}});
 return {plan,result,commits,clips,tracks,effects,graphics};
}

// Every field that differs, as "where: ours vs reference" lines. Numbers within 1e-9.
function diff(a,b,where,out){
 if(NOT_REPRODUCED.some(r=>r.test(where)))return out;
 if(typeof a==='number'&&typeof b==='number'){if(Math.abs(a-b)>1e-9)out.push(where+': '+a+' vs '+b);return out;}
 if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[k],b[k],where+'.'+k,out);return out;}
 if(a!==b)out.push(where+': '+JSON.stringify(a)+' vs '+JSON.stringify(b));
 return out;
}

test('default build at 25 fps equals Semin\'s Camera shutter dump Draft',async()=>{
 const {plan,result,commits,clips,tracks,effects,graphics}=await buildDefault();
 assert.equal(result.status,'saved',result.message);assert.equal(commits,1);
 const out=[];
 diff({fps:plan.fps,frameSize:plan.canvas,durationFrames:plan.durationFrames},{fps:ref.fps,frameSize:ref.frameSize,durationFrames:ref.durationFrames},'draft',out);
 // Video tracks, top first: the two closing graphics above the twelve photos.
 const top=[...tracks].reverse().map(id=>clips.find(c=>c.clipId===id));
 const ours=top.map(c=>{
  const t={...{rotation:0,anchor:{x:0,y:0}},...c.transform};
  const base={start:c.startFrame,end:c.endFrame,transform:{position:t.position,scale:t.scale,rotation:t.rotation,anchor:t.anchor},opacityPercent:100};
  if(c.resourceId===null){const g=graphics.get(c.clipId);return {graphic:g.label,...base,codeSha256:sha(g.tsxCode),parameters:g.parameters};}
  return {photo:refPhotos[Number(c.resourceId.slice(3))].photo,...base,effects:(effects.get(c.clipId)||[]).map(e=>({name:e.label,enabled:true,codeSha256:(assert.equal(e.shader.graph.schema,'Cutback.ShaderEffect.1'),'wgsl'),parameters:e.parameters}))};
 });
 diff(ours,ref.videoTopFirst,'video',out);
 const audio=clips.filter(c=>c.trackKind==='audio').map(c=>({file:c.resourceId,start:c.startFrame,end:c.endFrame}));
 diff(audio,ref.audio,'audio',out);
 diff({transitions:[],music:null},{transitions:ref.transitions,music:ref.music},'draft',out);
 assert.deepEqual(out,[],'differences from the reference:\n'+out.join('\n'));
 assert.equal(refGraphics.length,2);
 // The two intentional differences, as they come out.
 assert.equal(ours[0].graphic,'Text');assert.equal(ours[0].parameters.body,PROJECT_NAME);
 assert.ok(ours.filter(c=>c.photo).every(c=>c.effects.every(e=>e.parameters.focusX===.5&&e.parameters.focusY===.5)));
 assert.equal(ours.filter(c=>c.photo).flatMap(c=>c.effects).length,10);
 const defs=Object.fromEntries([...graphics.values()].map(g=>[g.label,g.editableParameters.map(x=>x.key).join()]));
 assert.deepEqual(defs,{Burst:'kind',Text:'fontFamily,body'});
});

test('other frame rates keep the reference times',()=>{
 const plan=scenePlan(50);
 assert.equal(plan.durationFrames,500);
 assert.deepEqual(plan.occurrences.map(o=>o.startFrame),refPhotos.map(p=>p.start*2));
 assert.deepEqual(plan.graphics.map(g=>[g.startFrame,g.endFrame]),refGraphics.map(g=>[g.start*2,500]).reverse());
});
