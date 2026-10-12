// Four Photo Reveal with its default options (Music on) at 25 fps against Semin's reference Draft
// (tests/fixtures/no14_semin_reference.json, from her "Four Photo Reveal" Draft): the seed step and the finish step
// run on a recording fake Draft and every clip, effect, preset, decoration and the song must match. Left out, because
// they depend on the photos: effect geometry (g, radius), framing (focusX/Y) and clip transforms.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadPanelOperation} from './panel_operation.mjs';

const ref=JSON.parse(fs.readFileSync(new URL('./fixtures/no14_semin_reference.json',import.meta.url),'utf8'));
const {seminScenePlan,authorNativeFinish,effectCodeFor,seedDraftScript}=loadPanelOperation('no14-still-video');
const omit=new Set(['g','radius','focusX','focusY']);
const strip=p=>Object.fromEntries(Object.entries(p).filter(([k])=>!omit.has(k)));

test('the default plan at 25 fps rebuilds Semin\'s Draft', async()=>{
 const plan=seminScenePlan(25);
 assert.equal(plan.durationFrames,ref.durationFrames);

 // Seed: the song on Main from its source start, the whole Draft long.
 const seeded=[];
 const fakeSeed={project:()=>({createDraft:async()=>({insertResource:async o=>seeded.push(['insertResource',o]),insertGap:async o=>seeded.push(['insertGap',o]),setFrameSize:async()=>{},meta:async()=>({fps:25,durationFrames:196,frameSize:{width:720,height:1280}}),commitAll:async()=>({createdDraftId:'draft'})})})};
 await new (async()=>{}).constructor('selects',seedDraftScript('project','No.14 photo format',plan,'music'))(fakeSeed);
 assert.equal(seeded.length,1);
 const [verb,{resourceId,sourceRange}]=seeded[0];
 assert.equal(verb,'insertResource');assert.equal(resourceId,'music');
 assert.equal(sourceRange.startSeconds,ref.musicSourceStartSeconds);
 assert.ok(Math.abs(sourceRange.endSeconds-(ref.musicSourceStartSeconds+ref.durationFrames/ref.fps))<1e-9);

 // Finish: images placed at the plan's frames, then effects, presets, decoration.
 const photos='ABCD'.split('').map(s=>({resourceId:s,path:'/'+s+'.jpg',width:1639,height:2048}));
 const rows=[{clipId:0,trackId:'main',trackKind:'main',resourceId:'music',startFrame:0,endFrame:plan.durationFrames},
  ...plan.occurrences.map((o,i)=>({clipId:i+1,trackId:'t'+i,trackKind:'video',resourceId:o.slot,startFrame:o.startFrame,endFrame:o.endFrame,effects:[]}))];
 const graphics=[];
 const draft={meta:async()=>({fps:25,durationFrames:plan.durationFrames,frameSize:plan.canvas}),clips:async()=>rows,rangeAtFrames:async(startFrame,endFrame)=>({startFrame,endFrame}),setClipTransform:async()=>{},
  addVideoEffect:async({clip,label,parameters})=>rows.find(r=>r.clipId===clip.clipId).effects.push({name:label,parameters}),
  applyEffectPreset:async({clip,presetId,parameters})=>{assert.equal(presetId,'reveal-fade-down');rows.find(r=>r.clipId===clip.clipId).effects.push({name:'Fade down',parameters});},
  addMotionGraphic:async({label,within,tsxCode,parameters})=>graphics.push({name:label,start:within.startFrame,end:within.endFrame,parameters,tsxCode}),
  commitAll:async()=>({commitId:'c'})};
 const project={meta:async()=>({draftIds:['draft']}),resources:async()=>[...photos.map(p=>({resourceId:p.resourceId,type:'Image'})),{resourceId:'music',type:'Audio',durationSeconds:60}],resource:id=>({id})};
 const input={projectId:'project',draftId:'draft',photos,placements:plan.occurrences.map((o,i)=>({key:o.key,slot:o.slot,appearance:o.appearance,clipId:i+1,trackId:'t'+i,startFrame:o.startFrame,endFrame:o.endFrame})),
  decoration:{shape:'none',color:'#ffffff'},framing:Object.fromEntries(plan.occurrences.map(o=>[o.appearance+'-'+o.slot,{x:.5,y:.5}])),music:{resourceId:'music'}};
 const result=await authorNativeFinish({project:()=>project,draft:()=>draft},input,plan);
 assert.equal(result.status,'saved',result.message);

 const sort=list=>list.sort((a,b)=>a.trackKind.localeCompare(b.trackKind)||a.start-b.start||(a.effects[0]?.name??'').localeCompare(b.effects[0]?.name??''));
 const got=sort(rows.map(r=>({trackKind:r.trackKind,start:r.startFrame,end:r.endFrame,resource:r.trackKind==='main'?'Audio':'Image',effects:(r.effects??[]).map(e=>({name:e.name,parameters:strip(e.parameters)}))})));
 assert.deepEqual(got,ref.clips);
 assert.deepEqual(graphics.map(({tsxCode,...g})=>g),ref.motionGraphics);
 assert.equal(graphics[0].tsxCode,ref.decorationCode);
 assert.equal(effectCodeFor(25),ref.effectCode);
 assert.deepEqual(ref.transitions,[]); // the crossfades live inside the clip effects
});

test('the template defaults choose that plan: Music on, no decoration', ()=>{
 const panel=fs.readFileSync(new URL('../plugins/no14-still-video/panel.tsx',import.meta.url),'utf8');
 assert.match(panel,/DEFAULT_DECORATION=\{shape:'none',color:'#ffffff'\}/);
 assert.match(panel,/DEFAULT_MUSIC='on'/);
 assert.match(panel,/const plan=music==='on'\?seminScenePlan\(fps\):nativeScenePlan\(fps\);/);
});
