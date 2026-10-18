'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('agent face selection uses runtime measurements',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild'),m={exports:{}};
 const src=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8');
 new Function('require','module','exports',esbuild.transformSync(src+'\nexport {measuredFaceShots,compileSourceCropPlan,collectMeasuredFaces};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 const sources=[{resourceId:'r',meta:{fps:30,frameSize:{width:1920,height:1080}}}],layout={windowTop:0,windowBottom:1920,faceY:40,closeUp:4.5};
 const catalog=[{id:'F1',resourceId:'r',draftFrame:30,sourceFrame:300,box:{xmin:1178,xmax:1361,ymin:299,ymax:531}},{id:'F2',resourceId:'r',draftFrame:40,sourceFrame:310,box:{xmin:145,xmax:331,ymin:310,ymax:553}}];
 const shot={startFrame:0,endFrame:90,resourceId:'r',style:'speaker',compositionId:'woman',subjects:[{faceId:'F1',left:.5,right:.75}]};
 const compile=shots=>m.exports.compileSourceCropPlan(m.exports.measuredFaceShots(shots,catalog,sources,layout),sources,90,layout);
 await t.test('off-center measured face stays in its selected pane with head room and template height',()=>{
  const p=compile([shot])[0].panels[0],h=p.w*1920/1080,x=p.cx-p.w/2,y=p.cy-h*.4;
  assert.ok(x>=960-1e-6&&x+p.w<=1440+1e-6);
  assert.ok(x<=1178&&x+p.w>=1361);assert.ok(y<=299-232*.48&&y+h>=531+232*.12);
  assert.ok(Math.abs(((299+531)/2-y)/h-.4)<1e-6);
  // Fabricated coordinates on a model result never drive the crop.
  assert.deepEqual(compile([{...shot,regions:[{x:0,y:0,width:.1,height:.1}]}])[0].panels,[p]);
 });
 await t.test('unknown faces, wrong sources, impossible panes and references from another shot are rejected',()=>{
  for(const change of [{subjects:[{faceId:'invented'}]},{resourceId:'other'},{subjects:[{faceId:'F1',left:0,right:.25}]},{startFrame:50}]) assert.throws(()=>compile([{...shot,...change}]));
 });
 await t.test('silence fragments reuse exact geometry and split panels contain distinct measured people',()=>{
  const repeated=compile([{...shot,endFrame:45},{...shot,startFrame:45}]);assert.deepEqual(repeated[0].panels,repeated[1].panels);
  const stacked=compile([{...shot,style:'stacked',subjects:[...shot.subjects,{faceId:'F2',left:0,right:.25}]}])[0];assert.equal(stacked.panels.length,2);assert.equal(stacked.panels[1].slot,1);
  assert.throws(()=>compile([{...shot,style:'stacked',subjects:[...shot.subjects,...shot.subjects]}]));
 });
 await t.test('runtime analysis is limited to edited source ranges and maps detections into playback time',async()=>{
  const requests=[];const before={sources,words:[{sourceResourceId:'r',sourceStartFrame:300,sourceEndFrame:330,startFrame:0,endFrame:30}]};
  const sdk={runScript:async({script,summary})=>{
   if(summary==='Measure source faces'){requests.push(JSON.parse(script.match(/submit\((.*)\);/)[1]));return {result:{workflowId:'wf'}};}
   if(summary==='Check source face measurements')return {result:{status:'succeeded'}};
   if(summary==='Read measured source faces')return {result:{frameSize:{width:1920,height:1080},samples:[{sourceTimeSeconds:10.5,faces:[{score:.9,box:catalog[0].box},{score:.1,box:catalog[1].box}]}]}};
   throw Error(summary);
  }};
  const faces=await m.exports.collectMeasuredFaces({sdk,guard:p=>p,projectId:'measured-face-test',before,note:()=>{}});
  assert.equal(requests.length,1);assert.deepEqual(requests[0].sourceRange,{startSeconds:10,endSeconds:11});assert.equal(faces.length,1);assert.equal(faces[0].draftFrame,15);assert.equal(faces[0].sourceFrame,315);
 });
});
