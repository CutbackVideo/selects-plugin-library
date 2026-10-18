const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('template director validates plans before layout application',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),m={exports:{}};
 new Function('require','module','exports',dep('esbuild').transformSync(fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8')+'\nexport {compileTemplateCameraPlan,cameraManifestFromSequence,reframingPreferences,reframingPreset,reframingPreferencePrompt};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 await t.test('camera source offsets preserve gaps and trims and reject retiming',()=>{
  const tick=705600000;const clip={schema:'Cutback.Clip.2',sourceRange:{startTime:3*tick,duration:5*tick},mediaReferences:{defaultMedia:{id:'cam'}},timing:{playbackSpeed:{numerator:1,denominator:1}}};
  const payload={resourceJson:{id:'sync',type:'Sequence',videoSources:[{kind:'sequence',sequenceId:'seq',trackId:'v',slotIndex:0}],content:{id:'seq',ownerResourceId:'sync',frameRate:24,tracks:{children:[{kind:'Audio',children:[]},{id:'v',kind:'Video',children:[{schema:'Cutback.Gap.2',sourceRange:{startTime:0,duration:2*tick}},clip]}]}}}};
  assert.deepEqual(m.exports.cameraManifestFromSequence(payload).cameras,[{videoIndex:0,resourceId:'cam',windows:[{srcStartSec:3,srcEndSec:8,offsetSec:-1}]}]);
  // Analysis has only Main clips; original synchronized content owns the cameras.
  payload.analyzedSequenceJson={frameRate:24,tracks:{children:[{kind:'Main',children:[]}]}};
  const second={...payload.resourceJson.content.tracks.children[1],id:'v2',children:[{...clip,mediaReferences:{defaultMedia:{id:'cam2'}}}]};
  payload.resourceJson.content.tracks.children.push(second);
  payload.resourceJson.videoSources.unshift({kind:'sequence',sequenceId:'seq',trackId:'v2',slotIndex:0});
  assert.deepEqual(m.exports.cameraManifestFromSequence(payload).cameras.map(c=>[c.videoIndex,c.resourceId]),[[0,'cam2'],[1,'cam']]);
  assert.throws(()=>m.exports.cameraManifestFromSequence({analyzedSequenceJson:payload.analyzedSequenceJson}),/unavailable/);
  payload.resourceJson.content.ownerResourceId='foreign';assert.throws(()=>m.exports.cameraManifestFromSequence(payload),/ownership/);
  payload.resourceJson.content.ownerResourceId='sync';
  clip.timing.playbackSpeed.numerator=2;assert.throws(()=>m.exports.cameraManifestFromSequence(payload),/Retimed/);
 });
 const layout={windowTop:400,windowBottom:1500,cameraMode:'auto',closeUp:4.5,faceY:40};
 const panels=[0,1].map(videoIndex=>({videoIndex,resourceId:'r'+videoIndex,startFrame:0,endFrame:300,sourceStartSeconds:20,playbackSpeed:{numerator:1,denominator:1},observation:{W:1920,H:1080}}));
 const options=panels.map((panel,i)=>({id:i+':0',panel,x:960,y:400,w:180,h:200,headTop:210,headBottom:550}));
 const obs=[{unit:{startFrame:0,endFrame:300},available:panels,options}];
 const shot={startFrame:0,endFrame:300,style:'speaker',primary:'0:0',secondary:null,confidence:.9};
 const run=(s=shot,l=layout,o=obs)=>m.exports.compileTemplateCameraPlan({shots:[s]},o,l,30);
 await t.test('uncertainty never silently enables forbidden wide',()=>{const p=run({...shot,confidence:.3});assert.equal(p[0].style,'speaker');assert.throws(()=>run({...shot,style:'wide',primary:null,camera:0}),/forbids wide/);});
 await t.test('split uses two silent placements with exact source timing',()=>{const p=run({...shot,style:'stacked',secondary:'1:0',distinctPeople:true});assert.equal(p.length,2);assert.deepEqual(p.map(x=>x.slot),[0,1]);assert.ok(p.every(x=>x.sourceStartSeconds===20&&x.count===2&&Number.isFinite(x.crop.w)));});
 await t.test('forbidden, duplicate, unknown and uncovered plans reject',()=>{
  for(const s of [{...shot,style:'stacked',secondary:'0:0',distinctPeople:true},{...shot,primary:'9:0'},{...shot,startFrame:1},{...shot,style:'two-shot',secondary:'1:0',distinctPeople:true},{...shot,confidence:NaN}])assert.throws(()=>run(s));
  assert.throws(()=>run({...shot,style:'stacked',secondary:'1:0',distinctPeople:true},{...layout,cameraMode:'speaker'}));
 });
 await t.test('missing faces still allow safe whole-camera view',()=>{const p=run({...shot,style:'wide',primary:null,camera:0},{...layout,widePolicy:'essential'},[{...obs[0],options:[]}]);assert.deepEqual(p[0].crop,{fit:'contain'});});
 await t.test('one speaker keeps identical geometry across noisy analysis units and adjacent AI shots',()=>{
  const units=[0,100,200].map((start,i)=>({unit:{startFrame:start,endFrame:start+100},available:panels,options:options.map(f=>({...f,x:f.x+i*12,y:f.y-i*3,w:f.w+i*4,headTop:f.headTop-i*2}))}));
  const out=m.exports.compileTemplateCameraPlan({shots:[{...shot,endFrame:100},{...shot,startFrame:100}]},units,layout,30);
  assert.equal(out.length,3);assert.deepEqual(out[0].crop,out[1].crop);assert.deepEqual(out[1].crop,out[2].crop);
  assert.deepEqual(out.map(r=>r.sourceStartSeconds),[20,20+100/30,20+200/30]);
  assert.ok(!('framingFaces' in out[0]));
 });
 await t.test('split slots each stay fixed without sharing the other subject crop',()=>{
  const units=[0,150].map((start,i)=>({unit:{startFrame:start,endFrame:start+150},available:panels,options:options.map((f,j)=>({...f,x:f.x+j*200+i*20}))}));
  const out=run({...shot,style:'stacked',secondary:'1:0',distinctPeople:true},layout,units);
  assert.deepEqual(out[0].crop,out[2].crop);assert.deepEqual(out[1].crop,out[3].crop);assert.notEqual(out[0].crop.cx,out[1].crop.cx);
 });
 await t.test('forward source cuts retain framing while camera changes start new crops',()=>{
  const p2={...panels[0],startFrame:150,sourceStartSeconds:50};
  const units=[{unit:{startFrame:0,endFrame:150},available:panels,options},{unit:{startFrame:150,endFrame:300},available:[p2,panels[1]],options:[{...options[0],panel:p2,x:1200},options[1]]}];
  const out=run(shot,layout,units);assert.deepEqual(out[0].crop,out[1].crop);assert.equal(out[1].sourceStartSeconds,50);
  const changed=m.exports.compileTemplateCameraPlan({shots:[{...shot,endFrame:150},{...shot,startFrame:150,primary:'1:0'}]},units,layout,30);
  assert.deepEqual(changed.map(r=>r.videoIndex),[0,1]);
 });

 await t.test('silence removal keeps crop and zoom fixed without bridging source timing',()=>{
  const starts=[20,25.7,32.2];
  const units=starts.map((sourceStartSeconds,i)=>{
   const panel={...panels[0],startFrame:i*100,endFrame:(i+1)*100,sourceStartSeconds};
   return {unit:{startFrame:i*100,endFrame:(i+1)*100},available:[panel],options:[{...options[0],panel,x:500+i*17,w:200+i*11,headTop:120-i*3}]};
  });
  const out=run(shot,layout,units);
  assert.deepEqual(out.map(x=>x.sourceStartSeconds),starts);
  assert.deepEqual(out.map(x=>[x.startFrame,x.endFrame]),[[0,100],[100,200],[200,300]]);
  assert.deepEqual(out[0].crop,out[1].crop);assert.deepEqual(out[1].crop,out[2].crop);
  const rewind=structuredClone(units);rewind[1].options[0].panel.sourceStartSeconds=10;
  const changed=run(shot,layout,rewind);assert.notDeepEqual(changed[0].crop,changed[1].crop);
 });
 await t.test('each split slot retains its own crop across removed silence',()=>{
  const units=[0,150].map((start,i)=>{
   const available=panels.map(p=>({...p,startFrame:start,sourceStartSeconds:20+i*6}));
   return {unit:{startFrame:start,endFrame:start+150},available,options:options.map((f,j)=>({...f,panel:available[j],x:f.x+j*200+i*20,w:f.w+i*10}))};
  });
  const out=run({...shot,style:'stacked',secondary:'1:0',distinctPeople:true},layout,units);
  assert.deepEqual(out[0].crop,out[2].crop);assert.deepEqual(out[1].crop,out[3].crop);
  assert.notEqual(out[0].crop.cx,out[1].crop.cx);
  assert.deepEqual(out.map(p=>p.sourceStartSeconds),[20,20,26,26]);
 });

 await t.test('default tastes, preset changes and prohibitions reach the AI and compiler',()=>{
  assert.deepEqual(m.exports.reframingPreferences({}),{focus:'reactions',split:'selective',wide:'never',pacing:'balanced',motion:'fixed'});
  const focused=m.exports.reframingPreset(layout,'speaker');assert.equal(focused.splitPolicy,'never');
  assert.throws(()=>run({...shot,style:'stacked',secondary:'1:0',distinctPeople:true},focused),/Unsupported|forbids/);
  const context=m.exports.reframingPreset(layout,'context');assert.equal(run({...shot,style:'wide',primary:null,camera:0},context)[0].style,'wide');
  assert.match(m.exports.reframingPreferencePrompt({}),/Never use wide/);
  assert.match(m.exports.reframingPreferencePrompt(focused),/Never use stacked/);
  assert.match(m.exports.reframingPreferencePrompt({}),/hesitation, ordinary listening/);
 });

});
