'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('crop precision does not reject feasible boundaries',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),m={exports:{}};
 new Function('require','module','exports',dep('esbuild').transformSync(fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8')+'\nexport {validateCompositionGeometry,measuredFaceShots,compileSourceCropPlan};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 await t.test('touching caption boundary survives normalized pixel conversion; real overlap still fails',()=>{
  for(const size of [1,1080,1920,3840]) {
   const row={sourceWidth:size,sourceHeight:size,crop:{x:0,y:0,width:size,height:size},protectedRegions:[{x:.1*size,y:.1*size,width:.2*size,height:.2*size}],destination:{x:0,y:0,width:size,height:size}};
   const caption={x:0,y:.3*size,width:size,height:.2*size};
   assert.doesNotThrow(()=>m.exports.validateCompositionGeometry([row],{reservedAreas:[caption]}));
   assert.throws(()=>m.exports.validateCompositionGeometry([row],{reservedAreas:[{...caption,y:caption.y-.01}]}),/occlusion/);
  }
 });
 await t.test('fixed composition tolerates pixel-normalized roundtrip error without changing subject',()=>{
  const W=803.2414403092116,H=901.8973114900291,left=.1740538381272927,right=.4740538381272927;
  const face={id:'f',resourceId:'r',draftFrame:0,box:{xmin:left*W,xmax:right*W,ymin:20,ymax:84.25931522473692}};
  const shot={startFrame:0,endFrame:30,resourceId:'r',style:'speaker',compositionId:'c',subjects:[{faceId:'f',left,right}]};
  const sources=[{resourceId:'r',meta:{frameSize:{width:W,height:H}}}],layout={windowTop:0,windowBottom:960};
  const measured=m.exports.measuredFaceShots([shot],[face],sources,layout);
  const p=m.exports.compileSourceCropPlan(measured,sources,30,layout)[0].panels[0],height=p.w*960/1080;
  assert.ok(p.cx-p.w/2<=face.box.xmin+1e-6);assert.ok(p.cx+p.w/2>=face.box.xmax-1e-6);
  assert.ok(p.cy-height*.4<=face.box.ymin+1e-6);assert.ok(p.cy+height*.6>=face.box.ymax-1e-6);
 });
});
