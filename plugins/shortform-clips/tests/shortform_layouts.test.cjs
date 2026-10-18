'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const modules=process.env.SBS_PANEL_TEST_MODULES;
test('speaker and multicamera layout contracts',{skip:!modules},async t=>{
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild');
 const src=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8'),mod={exports:{}};
 new Function('require','module','exports',esbuild.transformSync(src+'\nexport {cameraPanelPlacements,cameraHeadroom,stableCameraShots,planShots,STACKED_REFRAME_EFFECT};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
 const {cameraPanelPlacements,cameraHeadroom,stableCameraShots,planShots,STACKED_REFRAME_EFFECT}=mod.exports;
 const manifest={s:{cameras:[{videoIndex:0,resourceId:'a',windows:[{srcStartSec:0,srcEndSec:10,offsetSec:0}]},{videoIndex:1,resourceId:'b',windows:[{srcStartSec:1,srcEndSec:6,offsetSec:2}]}]}};
 const clip={trackKind:'main',resourceId:'s',startFrame:0,endFrame:240,sourceStartSeconds:2,playbackSpeed:1};
 await t.test('synchronized overlap maps to playback and recording tails retain their one available camera',()=>{
  const rows=cameraPanelPlacements({fps:30,clips:[clip]},manifest);
  assert.equal(rows.length,4);assert.deepEqual(rows.filter(x=>x.count===2).map(x=>[x.startFrame,x.endFrame,x.sourceStartSeconds]),[[30,180,3],[30,180,1]]);
  assert.deepEqual(rows.filter(x=>x.count===1).map(x=>[x.startFrame,x.endFrame,x.resourceId]),[[0,30,'a'],[180,240,'a']]);
 });
 await t.test('repeated source passages and retimed cuts keep distinct placements and source clocks',()=>{
  const rows=cameraPanelPlacements({fps:30,clips:[clip,{...clip,startFrame:300,endFrame:390,sourceStartSeconds:4,playbackSpeed:2}]},manifest);
  const repeat=rows.filter(x=>x.startFrame>=300&&x.count===2);
  assert.deepEqual(repeat.map(x=>[x.startFrame,x.endFrame,x.sourceStartSeconds]),[[300,360,4],[300,360,2]]);
  assert.equal(repeat[0].playbackSpeed.numerator/repeat[0].playbackSpeed.denominator,2);
 });
 await t.test('subframe camera boundaries never request footage outside recorded windows',()=>{
  const m={s:{cameras:manifest.s.cameras.map(x=>({...x,windows:[{srcStartSec:0.019,srcEndSec:2.989,offsetSec:0}]}))}};
  const rows=cameraPanelPlacements({fps:30,clips:[{...clip,sourceStartSeconds:0}]},m);
  for(const r of rows){assert.ok(r.sourceStartSeconds>=.019);assert.ok(r.sourceStartSeconds+(r.endFrame-r.startFrame)/30<=2.989);}
 });
 await t.test('headroom keeps detected heads inside the crop; unobserved cameras fit whole',()=>{
  const crop=cameraHeadroom([{xmin:750,xmax:1050,ymin:150,ymax:350}],1920,1080,378);
  const h=crop.w*378/1080,y=crop.cy-h*.4;
  assert.ok(y<=150&&y+h>=350);assert.ok(crop.w<=1920 && h<=1080);
  assert.deepEqual(cameraHeadroom([],1920,1080,378),{fit:'contain'});
  assert.deepEqual(cameraHeadroom([{xmin:100,xmax:700,ymin:0,ymax:1000}],1920,1080,252),{fit:'contain'});
 });
 await t.test('portrait two-person crops never extend beyond source bounds',()=>{
  const far=[{xmin:100,xmax:300,ymin:80,ymax:220},{xmin:650,xmax:850,ymin:90,ymax:230}];
  assert.deepEqual(cameraHeadroom(far,960,540,1920),{fit:'contain'});
  const close=[{xmin:380,xmax:440,ymin:150,ymax:230},{xmin:460,xmax:520,ymin:150,ymax:230}];
  const p=cameraHeadroom(close,960,540,1920),h=p.w*1920/1080,y=p.cy-h*.4,x=p.cx-p.w/2;
  assert.ok(x>=0 && y>=0 && x+p.w<=960 && y+h<=540);
  for(const b of close) assert.ok(x<=b.xmin && x+p.w>=b.xmax && y<=b.ymin && y+h>=b.ymax);
 });
 await t.test('brief backchannels stabilize only within the same resource and contiguous passage',()=>{
  const rows=[{startFrame:0,endFrame:60,videoIndex:0,resourceId:'a'},{startFrame:60,endFrame:70,videoIndex:1,resourceId:'a'},{startFrame:70,endFrame:130,videoIndex:0,resourceId:'a'}];
  assert.deepEqual(stableCameraShots(rows,20),[{...rows[0],endFrame:130}]);
  assert.equal(stableCameraShots(rows.map((r,i)=>({...r,resourceId:i===1?'b':'a'})),20).length,3);
  assert.equal(stableCameraShots([{...rows[0]}, {...rows[1],startFrame:61},rows[2]],20).length,3);
 });
 await t.test('missing mouth evidence cannot manufacture a single speaker; adaptive mode stacks two people',()=>{
  const samples=Array.from({length:101},(_,i)=>[i/10,[[480,180,200,100,350],[1440,180,200,100,350]]]);
  const turns=[{start:0,end:10,spk:1}],log={};
  const shots=planShots(samples,turns,1920,1000,4.5,0,false,1000,2.8,log,turns,[],{mode:'auto'});
  assert.ok(shots.length);assert.ok(shots.every(s=>s.layout==='stacked'&&s.panels.length===2));
  assert.ok(log.units.every(u=>u.face===null));
 });
 await t.test('the split effect renders independent source instances without duplicating audio',()=>{
  const React=dep('react'),{renderToStaticMarkup}=dep('react-dom/server'),module={exports:{}};
  const req=name=>name==='remotion'?{AbsoluteFill:({children,...p})=>React.createElement('div',p,children)}:dep(name);
  new Function('require','module','exports',esbuild.transformSync(STACKED_REFRAME_EFFECT,{loader:'tsx',format:'cjs'}).code)(req,module,module.exports);
  const html=renderToStaticMarkup(React.createElement(module.exports.default,{Source:()=>React.createElement('canvas',{'data-source':true}),data:{sourceW:1920,sourceH:1080,windowH:850,panels:[{cx:480,cy:350,w:900},{cx:1440,cy:350,w:900}]}}));
  assert.equal((html.match(/data-source/g)||[]).length,2);assert.match(html,/overflow:hidden/);assert.doesNotMatch(html,/NaN|Infinity|audio/);
  const fit=renderToStaticMarkup(React.createElement(module.exports.default,{Source:()=>React.createElement('canvas'),data:{sourceW:1920,sourceH:1080,windowH:756,panels:[{fit:'contain',slot:2,count:3}]}}));
  assert.doesNotMatch(fit,/NaN|Infinity/);assert.match(fit,/top:720px/);
 });
});
