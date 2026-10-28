import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadPanelModule,disposePanelModule} from './panel_module_fixture.mjs';
const React={createElement:(type,props,...children)=>({type,props:{...props,children}})};
let frame=0;
const api=loadPanelModule(fs.readFileSync(new URL('../plugins/ali-abdaal-style/panel.tsx',import.meta.url),'utf8'),{names:['CAMERA_EFFECT','styleScript','aliReserveTitleSpace','cameraAt']});
const renderer=loadPanelModule(api.CAMERA_EFFECT,{names:['Camera'],React,modules:{remotion:{useCurrentFrame:()=>frame,useVideoConfig:()=>({width:1080,height:1920})}}});
test.after(()=>{disposePanelModule(api);disposePanelModule(renderer)});
async function parameters(ranges,camera=[]){
 const words=ranges.map(([startFrame,endFrame])=>({text:'title',startFrame,endFrame}));
 const scenes=ranges.map(([startFrame,endFrame,height],i)=>({start:i,end:i+1,kind:'headline',title:'Title',layout:{status:'cannot-fit',reserved:true,...api.aliReserveTitleSpace({height,startFrame,endFrame,camera})}}));
 let data;const draft={clips:async()=>[{clipId:1,resourceId:'r',startFrame:0,endFrame:200}],addVideoEffect:async o=>data=o.parameters,rangeAtFrames:async()=>({}),addMotionGraphic:async()=>{}};
 await new Function('d','return (async()=>{'+api.styleScript(words,{camera,scenes,captions:[]})+'})()')(draft);return data;
}
function sample(at,data){frame=at;const tree=renderer.Camera({Source:()=>null,data});
 function find(node){if(!node||!node.props)return;const transform=node.props.style?.transform;if(transform?.startsWith('translate('))return transform;for(const child of node.props.children||[]){const value=find(child);if(value)return value;}}
 const value=find(tree);if(!value)return{x:0,y:0,scale:1};const [x,y,scale]=[...value.matchAll(/-?[0-9]*\.?[0-9]+(?:e[+-]?[0-9]+)?/gi)].map(x=>Number(x[0]));return{x,y,scale};
}
test('a title near frame zero starts fitted and never cuts from full-frame on its first visible frame',async()=>{
 const data=await parameters([[3,40,385]]);assert.deepEqual(sample(2,data),sample(3,data));assert.ok(sample(0,data).scale<1);
});
test('source eases into its slot six frames before a headline and leaves six frames after it',async()=>{
 const data=await parameters([[20,40,385]]);
 assert.equal(sample(14,data).scale,1);assert.ok(sample(17,data).scale<1);assert.ok(sample(17,data).scale>sample(20,data).scale);
 assert.deepEqual(sample(20,data),sample(40,data));assert.ok(sample(43,data).scale>sample(40,data).scale);assert.equal(sample(46,data).scale,1);
 for(const edge of [14,20,40,46]){const a=sample(edge-1e-6,data),b=sample(edge,data);for(const k of ['x','y','scale'])assert.ok(Math.abs(a[k]-b[k])<.001,edge+':'+k);}
});
test('nearby reservations share one safe slot instead of jumping between different header sizes',async()=>{
 const camera=[{at:0,frames:18,zoom:1.03,y:4},{at:18,frames:26,zoom:1.1,y:-6},{at:55,frames:20,zoom:1.04,y:3}];
 const data=await parameters([[20,40,300],[50,80,500]],camera);assert.equal(data.layouts.length,1);
 assert.deepEqual(sample(39,data),sample(50,data));assert.ok(sample(45,data).scale<1);
 const slot=data.layouts[0].sourceSlot;
 for(let at=20;at<=80;at++){
  const s=sample(at,data),c=api.cameraAt(at,{camera}),x=1080*.509*(1-c.zoom),y=1920*.17*(1-c.zoom)+c.y*19.2;
  assert.ok(x*s.scale+s.x>=-1e-6);assert.ok((x+1080*c.zoom)*s.scale+s.x<=1080+1e-6);
  assert.ok(y*s.scale+s.y>=slot.bodyTop-1e-6);assert.ok((y+1920*c.zoom)*s.scale+s.y<=slot.bodyBottom+1e-6);
 }
});

test('overlapping reserved intervals merge and distant intervals return smoothly to the source framing',async()=>{
 const merged=await parameters([[20,50,300],[48,80,500]]);assert.equal(merged.layouts.length,1);assert.deepEqual(sample(30,merged),sample(70,merged));
 const distant=await parameters([[20,40,300],[70,90,500]]);assert.equal(distant.layouts.length,2);assert.equal(sample(55,distant).scale,1);
 for(const edge of [40,46,64,70,90,96]){const a=sample(edge-1e-6,distant),b=sample(edge,distant);for(const k of ['x','y','scale'])assert.ok(Math.abs(a[k]-b[k])<.001,edge+':'+k);}
});

test('reserved paper header approaches and releases continuously with the same source interpolation',async()=>{
 const data=await parameters([[20,40,385]]);
 const header=at=>{frame=at;const root=renderer.Camera({Source:()=>null,data}),background=root.props.style.background;if(!background)return 0;return Number([...background.matchAll(/#eef0e8 ([0-9.e+-]+)px/g)][1][1]);};
 assert.equal(header(14),0);assert.ok(header(17)>0&&header(17)<header(20));assert.equal(header(20),header(40));assert.equal(header(46),0);
 for(const edge of [14,20,40,46])assert.ok(Math.abs(header(edge-1e-6)-header(edge))<.001);
});
