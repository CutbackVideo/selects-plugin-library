import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadPanelModule,disposePanelModule} from './panel_module_fixture.mjs';
const panel=loadPanelModule(fs.readFileSync(new URL('../plugins/ali-abdaal-style/panel.tsx',import.meta.url),'utf8'),{names:['CAMERA_EFFECT','GRAPHIC','makeCamera']});
const React={createElement:(type,props,...children)=>({type,props:{...props,children}})};
let frame=0;
const video=loadPanelModule(panel.CAMERA_EFFECT,{names:['Camera'],React,modules:{remotion:{useCurrentFrame:()=>frame,useVideoConfig:()=>({width:1080,height:1920})}}});
const graphic=loadPanelModule(panel.GRAPHIC,{names:['Camera'],React,modules:{remotion:{useCurrentFrame:()=>frame,useVideoConfig:()=>({width:1080,height:1920})}}});
const keys=panel.makeCamera([{start:0,end:1,kind:'headline'}],[{text:'test',startFrame:0,endFrame:180}],300);
const render=(at,data={camera:keys})=>{frame=at;return video.Camera({Source:()=>null,data}).props.style};
const xy=style=>[...style.transform.matchAll(/[-+]?[0-9]*\.?[0-9]+/g)].map(x=>Number(x[0]));
test('overlapping production camera transitions stay continuous at every key',()=>{
 for(const key of keys){if(!key.at)continue;const before=xy(render(key.at-1e-6)),after=xy(render(key.at));for(let i=0;i<2;i++)assert.ok(Math.abs(after[i]-before[i])<1e-5,JSON.stringify({key,before,after}));}
});
test('video and graphic sample one global camera path including trimmed clips',()=>{
 for(const start of [0,31])for(const at of [0,8,16,18,30,71,150,299]){const data={camera:keys,start};const actual=render(at,data);assert.equal(actual.transform,graphic.Camera({children:null,data,f:at+start}).props.style.transform);}
});
test('short drafts, clamped duplicate scene keys and a completed move remain finite and continuous',()=>{
 for(const total of [1,8,19,25,45]){
  const camera=panel.makeCamera([{start:0,end:1,kind:'list'},{start:0,end:1,kind:'note'}],[{text:'test',startFrame:0,endFrame:total}],total);
  for(const key of camera){const a=xy(render(key.at-1e-6,{camera})),b=xy(render(key.at,{camera}));assert.ok(b.every(Number.isFinite));for(let i=0;i<2;i++)assert.ok(Math.abs(a[i]-b[i])<1e-5);}
 }
 assert.deepEqual(xy(render(100,{camera:[{at:0,frames:10,zoom:1.2,y:-3}]})),[-3,1.2]);
});
test('camera preserves source colour and an empty camera stays at identity',()=>{
 assert.equal(render(72).filter,undefined);assert.deepEqual(xy(render(0,{camera:[]})),[0,1]);
});
test.after(()=>{for(const p of [panel,video,graphic])disposePanelModule(p)});
