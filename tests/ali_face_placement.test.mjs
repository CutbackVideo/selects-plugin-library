import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {loadPanelModule,disposePanelModule} from './panel_module_fixture.mjs';
const require=createRequire(import.meta.url);
const geometry=require('../shared/cover-focus.cjs');
const api=loadPanelModule(fs.readFileSync(new URL('../plugins/ali-abdaal-style/panel.tsx',import.meta.url),'utf8'),{names:['aliPlaceGraphic','aliFaceWindows','aliReserveTitleSpace','cameraAt']});
test.after(()=>disposePanelModule(api));
const face={x:320,y:250,w:400,h:380};
test('shared projection maps cover crop, SDK percent coordinates and margin consistently',()=>{
 assert.equal(typeof geometry.projectObservedFace,'function');
 assert.deepEqual(geometry.projectObservedFace([.25,.1,.5,.3],{width:1080,height:1920},{enabled:true,scale:{x:1,y:1},position:{x:0,y:0}}),{x:200,y:118.4,w:680,h:723.2});
 assert.equal(geometry.projectObservedFace([0,0,1,1],{width:1080,height:1920},{enabled:true,rotation:1,scale:{x:1,y:1}}),null);
});
test('headline stays in its existing place when faces are clear, otherwise moves without covering face or captions',()=>{
 const base={kind:'headline',height:250,startFrame:0,endFrame:100,camera:[]};
 assert.equal(api.aliPlaceGraphic(base,[{x:320,y:800,w:400,h:300}]).top,307);
 const moved=api.aliPlaceGraphic(base,[face]);assert.equal(moved.status,'moved');assert.ok(moved.top+moved.height<=face.y||moved.top>=face.y+face.h);assert.ok(moved.top+moved.height<=1320);
});
test('missing observations are explicitly unknown, full close-up never claims clearance',()=>{
 assert.equal(api.aliPlaceGraphic({kind:'headline',height:250,startFrame:0,endFrame:100,camera:[]},null).status,'unavailable');
 assert.equal(api.aliPlaceGraphic({kind:'headline',height:700,startFrame:0,endFrame:100,camera:[]},[{x:0,y:0,w:1080,h:1920}]).status,'cannot-fit');
});
test('observation windows cover only scene/Main intersections, source trim and playback speed',()=>{
 const windows=api.aliFaceWindows([{start:0,end:1},{start:2,end:3}],[{startFrame:24,endFrame:48},{startFrame:100,endFrame:120},{startFrame:240,endFrame:264}], [{startFrame:0,endFrame:250,sourceStartSeconds:10,playbackRate:2,sourceFps:30,sourceDurationSeconds:100,aiResourceId:'r'}],24);
 assert.deepEqual(JSON.parse(JSON.stringify(windows)).map(x=>[x.sceneIndex,x.sourceRange.startSeconds,x.sourceRange.endSeconds]),[[0,12,14],[1,30,30+20/24]]);
});

test('reserved title space contains the entire moving source below the header at every frame',()=>{
 const scene={height:410,startFrame:0,endFrame:200,camera:[{at:0,frames:18,zoom:1.03,y:4},{at:8,frames:26,zoom:1.11,y:-8},{at:18,frames:26,zoom:1.085,y:-6}]};
 const result=api.aliReserveTitleSpace(scene),s=result.sourceSlot,b=result.bounds;
 for(let f=scene.startFrame;f<=scene.endFrame;f++){const c=api.cameraAt(f,{camera:scene.camera}),x=1080*.509*(1-c.zoom),y=1920*.17*(1-c.zoom)+c.y*19.2;assert.ok(x*s.scale+s.x>=-1e-6);assert.ok((x+1080*c.zoom)*s.scale+s.x<=1080+1e-6);assert.ok(y*s.scale+s.y>=s.bodyTop-1e-6);assert.ok((y+1920*c.zoom)*s.scale+s.y<=s.bodyBottom+1e-6);}
 assert.ok(b.x*s.scale+s.x>=-1e-6);assert.ok(b.right*s.scale+s.x<=1080+1e-6);
 assert.ok(b.y*s.scale+s.y>=s.bodyTop-1e-6);assert.ok(b.bottom*s.scale+s.y<=s.bodyBottom+1e-6);
 assert.ok(s.bodyTop>=result.top+result.height+32);
});

test('invalid source clock never treats null trim as zero',()=>{
 assert.throws(()=>api.aliFaceWindows([{start:0,end:1}],[{startFrame:0,endFrame:24}],[{startFrame:0,endFrame:24,sourceStartSeconds:null,sourceFps:24,sourceDurationSeconds:3,aiResourceId:'r'}],24),/source interval/);
});
