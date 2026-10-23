const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('split source clips occupy reusable silent lanes with exact retimed source windows',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),m={exports:{}};
 new Function('require','module','exports',dep('esbuild').transformSync(fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8')+'\nexport {sourceCropApplyScript};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 for(const [style,count] of [['stacked',2],['side-by-side',2],['columns-3',3],['grid-4',4]])await t.test(style,async()=>{
  let serial=10,tracks=['main','user'],commits=0,clips=[{clipId:1,trackId:'main',trackKind:'main',resourceId:'r',startFrame:0,endFrame:30},{clipId:2,trackId:'main',trackKind:'main',resourceId:'r',startFrame:30,endFrame:60},{clipId:3,trackId:'user',trackKind:'video',resourceId:'broll',startFrame:80,endFrame:90}],effects=new Map(),placements=[];
  const key=c=>c.trackId+':'+c.clipId;
  const d={meta:async()=>({durationFrames:60}),clips:async o=>clips.filter(c=>o.trackScope==='all'||c.trackKind==='main'),videoEffects:async c=>effects.get(key(c))||[],addVideoEffect:async o=>effects.set(key(o.clip),[{name:o.label,parameters:o.parameters}]),applyEffectPreset:async o=>{assert.equal(o.presetId,'effects-mask');effects.set(key(o.clip),[{name:'Shape mask',parameters:o.parameters}]);},videoEffectProgram:async e=>({tsxCode:'native',parameters:e.parameters}),removeVideoEffect:async e=>{for(const [k,v] of effects)effects.set(k,v.filter(x=>x!==e));},replaceVideoEffect:async(e,o)=>{e.name=o.label;if(o.parameters)e.parameters=o.parameters;},setClipTransform:async()=>{},removeClips:async c=>{clips=clips.filter(x=>key(x)!==key(c));},deleteTrack:async({trackId})=>{tracks=tracks.filter(x=>x!==trackId);},addTrack:async()=>{tracks.push('lane'+serial++);},rangeAtFrames:async(a,b)=>({a,b}),motionGraphics:async()=>[],overlayResource:async o=>{assert.equal(o.withSound,false);placements.push(o);clips.push({clipId:serial++,trackId:tracks.at(-1),trackKind:'video',resourceId:'r',startFrame:o.over.a,endFrame:o.over.b});},commitAll:async()=>commits++};
  const p={meta:async()=>({draftIds:['d']}),resource:()=>({rangeAtFrames:async()=>({resourceId:'r'})})};
  const sources=[{resourceId:'r',meta:{frameSize:{width:1920,height:1080}}}],layout={windowTop:300,windowBottom:1100,allowedLayouts:[style]};
  const shots=[{startFrame:0,endFrame:60,resourceId:'r',compositionId:'split',style,regions:Array.from({length:count},()=>({x:0,y:0,width:1,height:1,letterbox:true}))}];
  const snapshot={fps:30,clips:[{...clips[0],sourceStartSeconds:10,playbackSpeed:2},{...clips[1],sourceStartSeconds:40,playbackSpeed:.5}]};
  const execute=snap=>new Function('selects','return (async()=>{'+m.exports.sourceCropApplyScript('p','d',layout,sources,60,snap).replace('__SHOTS__',JSON.stringify(shots))+'})()')({project:()=>p,draft:()=>d});
  await assert.rejects(()=>execute(null),/timing is unavailable/);assert.equal(commits,0);
  for(let retry=0;retry<2;retry++){
   placements=[];await execute(snapshot);
   assert.equal(tracks.length,count+1); // includes unrelated user lane
   assert.equal(clips.filter(c=>c.trackKind==='main').length,2);
   assert.ok(clips.some(c=>c.resourceId==='broll'));
   assert.equal(placements.length,(count-1)*2);
   for(let slot=0;slot<count-1;slot++){
    assert.equal(placements[slot*2].sourceStartSeconds,10);assert.equal(placements[slot*2+1].sourceStartSeconds,40);
    assert.equal(placements[slot*2].playbackSpeed.numerator/placements[slot*2].playbackSpeed.denominator,2);
   }
   for(const c of clips.filter(c=>c.resourceId==='r')){const e=effects.get(key(c))[0];assert.equal(e.name,'Shape mask');assert.equal(e.parameters.shortformSourceCrop,true);assert.equal(e.parameters.shape,'rectangle');assert.ok(e.parameters.width>0&&e.parameters.height>0);};
  }
  assert.equal(commits,2);
 });
});
