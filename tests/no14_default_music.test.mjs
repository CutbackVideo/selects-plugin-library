import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPanelOperation} from './panel_operation.mjs';

const {authorNativeFinish,nativeScenePlan,normalizeNativeFinish}=loadPanelOperation('no14-still-video');

function fixture(musicType='Audio',durationSeconds=9) {
 const plan=nativeScenePlan();
 const photos='ABCD'.split('').map(slot=>({resourceId:slot,path:`/${slot}.jpg`,width:1024,height:1536}));
 const placements=plan.occurrences.map((o,i)=>({...o,clipId:i+1,trackId:`image-${i}`}));
 const images=placements.map(p=>({...p,trackKind:'video',resourceId:p.slot}));
 // createNo14Draft seeds the Draft with the song on Main; the finish step reads it back.
 const rows=[...images,{clipId:100,trackId:'main',trackKind:'main',resourceId:'music',startFrame:0,endFrame:plan.durationFrames}];
 const calls=[];
 const input={projectId:'project',draftId:'draft',photos,placements,decoration:{shape:'heart',color:'#ffffff'},framing:Object.fromEntries(placements.map(p=>[`${p.appearance}-${p.slot}`,{x:.5,y:.5}])),music:{resourceId:'music'}};
 const resources=[...photos.map(p=>({resourceId:p.resourceId,type:'Image'})),{resourceId:'music',type:musicType,durationSeconds}];
 const project={meta:async()=>({draftIds:['draft']}),resources:async()=>resources,resource:id=>({id})};
 const draft={meta:async()=>({fps:30,durationFrames:266,frameSize:{width:720,height:1280}}),clips:async()=>rows.map(r=>({...r})),rangeAtFrames:async(startFrame,endFrame)=>({startFrame,endFrame}),setClipTransform:async()=>calls.push('transform'),addVideoEffect:async()=>calls.push('effect'),addMotionGraphic:async()=>calls.push('decoration'),commitAll:async()=>{calls.push('commit');return{commitId:'saved'};}};
 return{input,plan,images,rows,calls,selects:{project:()=>project,draft:()=>draft}};
}

test('default music is one full-length Main clip without altering native Images',async()=>{
 const f=fixture();const before=structuredClone(f.images);
 const result=await authorNativeFinish(f.selects,f.input,f.plan);
 assert.equal(result.status,'saved',result.message);
 assert.deepEqual(f.rows.filter(r=>r.trackKind==='video'),before);
 assert.deepEqual(f.rows.filter(r=>r.trackKind==='main').map(r=>[r.resourceId,r.startFrame,r.endFrame]),[['music',0,266]]);
 assert.equal(f.calls.filter(c=>c==='commit').length,1);
 assert.deepEqual(result.recipe.music,f.input.music);
});

for(const [label,type,duration] of [['wrong resource kind','Image',9],['too short','Audio',2],['unknown duration','Audio',undefined]]) {
 test(`music preflight rejects ${label} before Draft mutations`,async()=>{
  const f=fixture(type,duration);if(label==='unknown duration')f.selects.project().resources=async()=>[{resourceId:'music',type:'Audio'},...f.input.photos.map(p=>({resourceId:p.resourceId,type:'Image'}))];
  const result=await authorNativeFinish(f.selects,f.input,f.plan);
  assert.equal(result.status,'notSaved');assert.deepEqual(f.calls,[]);
 });
}

test('music disabled preserves silent native authoring',async()=>{
 const f=fixture();f.input.music=null;
 const result=await authorNativeFinish(f.selects,f.input,f.plan);
 assert.equal(result.status,'saved',result.message);
 assert.equal(f.rows.filter(r=>r.trackKind==='audio').length,0);
});


test('music request accepts a resource or explicit silence and rejects malformed choices',()=>{
 const f=fixture();const raw={...f.input,mode:'native-finish',placements:f.input.placements.map(({key,slot,appearance,clipId,trackId,startFrame,endFrame})=>({key,slot,appearance,clipId,trackId,startFrame,endFrame}))};
 assert.deepEqual(normalizeNativeFinish(raw).music,{resourceId:'music'});
 assert.equal(normalizeNativeFinish({...raw,music:null}).music,null);
 for(const music of [true,[],{}, {resourceId:' '}, {resourceId:'music',path:'/music.mp3'}])assert.throws(()=>normalizeNativeFinish({...raw,music}));
});

test('music accepts exactly the Draft duration',async()=>{
 const f=fixture('Audio',266/30);assert.equal((await authorNativeFinish(f.selects,f.input,f.plan)).status,'saved');
});

test('pre-existing audio is rejected before any mutation',async()=>{
 const f=fixture();f.rows.push({clipId:99,trackKind:'audio',resourceId:'music'});
 assert.equal((await authorNativeFinish(f.selects,f.input,f.plan)).status,'notSaved');assert.deepEqual(f.calls,[]);
});

test('a short Main music clip is never committed',async()=>{
 const f=fixture();f.rows.find(r=>r.trackKind==='main').endFrame=265;
 assert.equal((await authorNativeFinish(f.selects,f.input,f.plan)).status,'notSaved');assert.ok(!f.calls.includes('commit'));
});
