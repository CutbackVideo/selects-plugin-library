'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('agent selected source crop geometry',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild'),m={exports:{}};
 const src=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 new Function('require','module','exports',esbuild.transformSync(src+'\nexport {compileSourceCropPlan,sourceCropApplyScript,validateSourceCropRepair};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 const sources=[{resourceId:'r',meta:{frameSize:{width:1920,height:1080}}}],layout={windowTop:0,windowBottom:1920};
 const shot={startFrame:0,endFrame:90,resourceId:'r',style:'speaker',compositionId:'right-man',regions:[{x:.75,y:.1,width:.25,height:.8}]};
 const compile=(shots,l=layout)=>m.exports.compileSourceCropPlan(shots,sources,90,l);
 await t.test('rightmost broadcast pane fills the portrait without exposing adjacent panes or blank edges',()=>{
  const s=compile([shot])[0],p=s.panels[0],h=p.w*1920/1080,x=p.cx-p.w/2,y=p.cy-h*.4;
  assert.ok(x>=1440&&x+p.w<=1920);assert.ok(y>=108&&y+h<=972);assert.equal(p.w/h,1080/1920);
 });
 await t.test('off-center head stays fully visible instead of centering the broad region',()=>{
  const region={x:.1,y:0,width:.8,height:1,focus:{x:.65,y:.2,width:.12,height:.23}};
  const p=compile([{...shot,regions:[region]}])[0].panels[0],h=p.w*1920/1080,x=p.cx-p.w/2,y=p.cy-h*.4;
  assert.ok(x<=region.focus.x*1920&&x+p.w>=(region.focus.x+region.focus.width)*1920);
  assert.ok(y<=region.focus.y*1080&&y+h>=(region.focus.y+region.focus.height)*1080);
  assert.notEqual(p.cx,960);
  assert.throws(()=>compile([{...shot,regions:[{...region,focus:{x:0,y:0,width:.1,height:.1}}]}]),/Head bounds/);
 });
 await t.test('stacked windows each retain the correct aspect and stay in their chosen pane',()=>{
  const s=compile([{...shot,style:'stacked',regions:[shot.regions[0],{x:0,y:.1,width:.25,height:.8}]}])[0];
  s.panels.forEach((p,i)=>{const h=p.w*960/1080;assert.equal(p.count,2);assert.equal(p.slot,i);assert.ok(h<=864);assert.ok(p.cx-p.w/2>=s.regions[i].x*1920);});
 });
 await t.test('silence cuts reuse an identical crop but changed compositions can move',()=>{
  const a={...shot,endFrame:40},b={...shot,startFrame:40,regions:[{...shot.regions[0],x:.76,width:.24}]};
  const same=compile([a,b]);assert.deepEqual(same[0].panels,same[1].panels);
  const changed=compile([a,{...b,compositionId:'new-source-layout'}]);assert.notDeepEqual(changed[0].panels,changed[1].panels);
 });
 await t.test('rejects incomplete, overlapping, out-of-source and forbidden plans before applying',()=>{
  for(const shots of [[],[{...shot,endFrame:80}],[{...shot,startFrame:1}],[{...shot,endFrame:50},{...shot,startFrame:49}],[{...shot,resourceId:'other'}],[{...shot,regions:[{x:.8,y:0,width:.3,height:1}]}],[{...shot,style:'wide'}]]) assert.throws(()=>compile(shots));
  assert.throws(()=>compile([{...shot,style:'stacked',regions:[...shot.regions,...shot.regions]}],{...layout,splitPolicy:'never'}));
 });
 await t.test('rejects invalid numeric geometry and a head outside a reused crop before application',()=>{
  const focus={x:.4,y:.3,width:.1,height:.2};
  const first={...shot,endFrame:40,regions:[{x:0,y:0,width:1,height:1,focus}]};
  assert.throws(()=>compile([{...first,endFrame:90}],{...layout,faceY:NaN}),/Invalid computed crop/);
  const second={...first,startFrame:40,endFrame:90,regions:[{x:0,y:0,width:1,height:1,focus:{...focus,x:.85}}]};
  assert.throws(()=>compile([first,second]),/Fixed composition clips/);
  assert.throws(()=>m.exports.compileSourceCropPlan([shot],[{resourceId:'r',meta:{frameSize:{width:Infinity,height:1080}}}],90,layout),/dimensions/);
 });
 await t.test('one-frame cut alignment requires observed adjacent frames and an explicit agent reason',()=>{
  const previous=[{...shot,endFrame:40},{...shot,startFrame:40,compositionId:'solo'}],next=[{...previous[0],endFrame:41},{...previous[1],startFrame:41}];
  const fix=[{oldFrame:40,newFrame:41,reason:'Frame 40 is still the mosaic; 41 is the solo shot'}];
  m.exports.validateSourceCropRepair(previous,next,fix,[39,40,41]);
  assert.throws(()=>m.exports.validateSourceCropRepair(previous,next,[],[39,40,41]));
  assert.throws(()=>m.exports.validateSourceCropRepair(previous,next,fix,[39,40]));
  assert.throws(()=>m.exports.validateSourceCropRepair(previous,[{...next[0],endFrame:42},{...next[1],startFrame:42}],fix,[40,41,42]));
  assert.throws(()=>m.exports.validateSourceCropRepair(previous,[next[0],{...next[1],compositionId:'other-person'}],fix,[39,40,41]));
 });
 await t.test('transcript-only application resolves current aliases without reading analyzed resources',async()=>{
  let commits=0,transforms=0,foreign=false;
  const clip={clipId:1,trackId:'t',resourceId:'current-alias',startFrame:0,endFrame:90};
  const d={meta:async()=>({durationFrames:90}),clips:async()=>[clip],setClipTransform:async()=>transforms++,videoEffects:async()=>[],addVideoEffect:async()=>{},commitAll:async()=>commits++};
  const project={meta:async()=>({draftIds:['d']}),sourceFiles:async()=>({fileTree:[{resourceId:foreign?'other':'current-alias',path:'/source.mp4'}]}),resource:()=>{throw Error('resource_not_analyzed');}};
  const script=m.exports.sourceCropApplyScript('p','d',layout,sources.map(s=>({...s,path:'/source.mp4'})),90).replace('__SHOTS__',JSON.stringify([shot]));
  const execute=()=>new Function('selects','return (async()=>{'+script+'})()')({project:()=>project,draft:()=>d});
  await execute();assert.equal(commits,1);assert.equal(transforms,1);
  foreign=true;await assert.rejects(execute,/source file changed/);assert.equal(commits,1);assert.equal(transforms,1);
 });
 await t.test('application is reusable and replaces its effect without touching unrelated effects',async()=>{
  let effects=[{name:'User color grade'}],commits=0,transforms=0;
  const clip={clipId:1,trackId:'t',resourceId:'r4',startFrame:0,endFrame:90};
  const d={meta:async()=>({durationFrames:90}),clips:async()=>[clip],setClipTransform:async()=>{transforms++;},videoEffects:async()=>effects,addVideoEffect:async o=>effects.push({name:o.label}),replaceVideoEffect:async()=>{},commitAll:async reason=>{assert.equal(typeof reason,"string");assert.ok(reason.length);commits++;}};
  const selects={project:()=>({meta:async()=>({draftIds:['d']}),resource:()=>({rangeAtFrames:async()=>({resourceId:'r4'})})}),draft:()=>d};
  const script=m.exports.sourceCropApplyScript('p','d',layout,sources,90).replace('__SHOTS__',JSON.stringify([shot]));
  const exec=new Function('selects','return (async()=>{'+script+'})()');
  await exec(selects);await exec(selects);assert.equal(effects.length,2);assert.equal(effects[0].name,'User color grade');assert.equal(commits,2);assert.equal(transforms,2);
  const preserveScript=m.exports.sourceCropApplyScript('p','d',layout,sources,90).replace('__SHOTS__',JSON.stringify([{...shot,style:'preserve',regions:[]}]));
  await new Function('selects','return (async()=>{'+preserveScript+'})()')(selects);
  assert.equal(transforms,2);assert.equal(effects.length,2);assert.equal(commits,3);
  clip.resourceId='unrelated';await assert.rejects(()=>exec(selects),/source does not match/);assert.equal(commits,3);
 });
});
