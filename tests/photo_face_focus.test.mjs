import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {faceSafeCoverFocus}=require('../shared/cover-focus.cjs');
const raster={width:1920,height:1080};
const observation=(boxes)=>({coordinateSpace:'display-pixels',boxFormat:'xyxy',frameSize:raster,
  samples:[{sourceTimeSeconds:0,faces:boxes.map(box=>({box}))}]});
const box=(xmin,ymin,xmax,ymax)=>({xmin,ymin,xmax,ymax});
for(const [name,focus,frame]of [['Gallery aspect',faceSafeCoverFocus,{width:356,height:270}],['Recap aspect',faceSafeCoverFocus,{width:1080,height:1920}]]){
 test(name+' keeps an already visible face and the original centered composition',()=>{
  const result=focus(raster,frame,observation([box(900,300,1000,650)]));
  assert.equal(result.changed,false);assert.equal(result.focusX,.5);assert.equal(result.focusY,.5);
 });
 test(name+' shifts only focus to contain a source-edge face under the unchanged cover crop',()=>{
  const face=box(0,200,140,700),result=focus(raster,frame,observation([face]));
  assert.equal(result.status,'focused');assert.equal(result.changed,true);
  const left=result.focusX*raster.width-result.cropWidth/2,top=result.focusY*raster.height-result.cropHeight/2;
  assert.ok(left<=face.xmin&&left+result.cropWidth>=face.xmax);
  assert.ok(top<=face.ymin&&top+result.cropHeight>=face.ymax);
  assert.ok(left>=0&&left+result.cropWidth<=raster.width);
 });
 test(name+' reports opposite-edge people cannot fit instead of claiming that a focus solves it',()=>{
  const result=focus(raster,frame,observation([box(0,200,200,700),box(1720,200,1920,700)]));
  assert.equal(result.status,'cannot-fit');assert.equal(result.focusX,undefined);
 });
 test(name+' preserves explicit manual focus even with missing analysis',()=>{
  const result=focus(raster,frame,null,{focusX:.1,focusY:.8});
  assert.equal(result.status,'manual');assert.equal(result.focusX,.1);assert.equal(result.focusY,.8);
 });
 test(name+' rejects a mismatched coordinate raster and malformed or absent face boxes',()=>{
  for(const value of [null,{...observation([]),frameSize:{width:1080,height:1920}},observation([box(-1,2,10,20)]),observation([])]){
   assert.equal(focus(raster,frame,value).status,'unavailable');
  }
 });
 test(name+' requires every observed video position to fit, not only the first sample',()=>{
  const value=observation([box(0,200,140,700)]);value.samples.push({sourceTimeSeconds:.5,faces:[{box:box(1780,200,1920,700)}]});
  assert.equal(focus(raster,frame,value).status,'cannot-fit');
 });
}
