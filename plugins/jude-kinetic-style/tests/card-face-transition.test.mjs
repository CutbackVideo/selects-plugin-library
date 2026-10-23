import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {loadPanelModule,disposePanelModule} from '../../../tests/panel_module_fixture.mjs';

const modules=process.env.SBS_PANEL_TEST_MODULES||process.env.AI_PANEL_TEST_MODULES;
assert.ok(modules,'Set SBS_PANEL_TEST_MODULES to existing React test dependencies');
const dependency=createRequire(path.resolve(modules,'../package.json'));
const React=dependency('react'),{renderToStaticMarkup}=dependency('react-dom/server');
const source=fs.readFileSync(new URL('../panel.tsx',import.meta.url),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
const api=loadPanelModule(source,{names:['placements','CARD_TSX'],React});
test.after(()=>disposePanelModule(api));
const historicalFade='fadeSeconds:Math.min(.43,(words[scene.lines[1].from].startFrame-first.startFrame)/fps)';
// Replay the one former parameter policy through the same complete production
// module. Do not copy placements, typography helpers, or the card renderer.
const historical=loadPanelModule(source.replace('fadeSeconds:0,circleAt,expandAt',historicalFade+',circleAt,expandAt'),{names:['placements','CARD_TSX'],React});
test.after(()=>disposePanelModule(historical));
function fixture(start=443) {
 const frames=[start,start+8,start+24,start+35,start+51,start+65];
 const words=[{text:'Opening',startFrame:10,endFrame:20},{text:'aside',startFrame:30,endFrame:40},
  ...frames.map((frame,i)=>({text:['Say','the words','with','a circle','then','return'][i],startFrame:frame,endFrame:frame+7})),
  {text:'Ending',startFrame:start+90,endFrame:start+100}];
 return {words,scenes:[{layout:'stack',lines:[{from:0,to:0,serif:false}]},{layout:'right',lines:[{from:1,to:1,serif:true}]},
  {layout:'card',lines:frames.map((_,i)=>({from:2+i,to:2+i,serif:i%2===1}))},
  {layout:'left',lines:[{from:8,to:8,serif:false}]}],total:start+110};
}
function renderer(program,{fps=24000/1001,width=1080,height=1920}={}) {
 let frame=0;
 const bindings=loadPanelModule(program,{names:['JudeCard'],React,modules:{remotion:{
  AbsoluteFill:props=>React.createElement('div',props),useCurrentFrame:()=>frame,useVideoConfig:()=>({fps,width,height}),
 }}});
 return {render(data,relativeFrame){frame=relativeFrame;return renderToStaticMarkup(React.createElement(bindings.JudeCard,{data}));},dispose:()=>disposePanelModule(bindings)};
}
function opacity(markup){return Number(/\bopacity:([^;" ]+)/.exec(markup)?.[1]);}
const withoutOpacity=markup=>markup.replace(/opacity:[^;" ]+/,'opacity:EXCLUDED');

test('first centered card words never coexist with a translucent speaker background',()=>{
 const f=fixture(),items=api.placements(f.scenes,f.words,24000/1001,f.total),card=items.cards[0],view=renderer(api.CARD_TSX);
 try {
  assert.deepEqual([card.start,card.end],[443,521]);
  for(const absolute of [443,444,447,450,451])assert.equal(opacity(view.render(card.parameters,absolute-card.start)),1,'speaker must be hidden at frame '+absolute);
 } finally {view.dispose();}
});

test('the recorded former fade exposes the face at frames443 to450; only opacity changes afterward',()=>{
 const f=fixture(),before=historical.placements(f.scenes,f.words,24000/1001,f.total),after=api.placements(f.scenes,f.words,24000/1001,f.total);
 const view=renderer(api.CARD_TSX);
 try {
  assert.deepEqual([443,444,447,450,451].map(frame=>opacity(view.render(before.cards[0].parameters,frame-443))),[0,.125,.5,.875,1]);
  for(const frame of [443,444,447,450,451,467,478,485,520]){
   const a=view.render(before.cards[0].parameters,frame-443),b=view.render(after.cards[0].parameters,frame-443);
   assert.equal(withoutOpacity(a),withoutOpacity(b),'cream, circle and expansion must retain the same absolute clock');
  }
 } finally {view.dispose();}
});

test('all caption content and other layouts retain words, typography, timings, placement and behind regions',()=>{
 const f=fixture(),original=plain(f),before=plain(historical.placements(f.scenes,f.words,24000/1001,f.total)),after=plain(api.placements(f.scenes,f.words,24000/1001,f.total));
 assert.deepEqual(f,original,'the genuine plan input must not be rewritten');
 assert.equal(after.cards.length,1);assert.equal(after.cards[0].parameters.fadeSeconds,0);
 const oldFade=before.cards[0].parameters.fadeSeconds;assert.ok(oldFade>0);
 after.cards[0].parameters.fadeSeconds=oldFade;
 assert.deepEqual(after,before,'only the card background fade parameter may differ');
 assert.equal(after.captions.length,9);assert.ok(after.behind.length>0);
});

test('cards at the first source frame and different fps/output sizes are opaque without moving events',()=>{
 for(const fps of [24,24000/1001,30])for(const width of [720,1080]){
  const words=[0,8,24,35].map((startFrame,i)=>({text:'word'+i,startFrame,endFrame:startFrame+7}));
  const scenes=[{layout:'card',lines:words.map((_,i)=>({from:i,to:i,serif:i===1}))}];
  const item=api.placements(scenes,words,fps,50).cards[0],before=historical.placements(scenes,words,fps,50).cards[0],view=renderer(api.CARD_TSX,{fps,width,height:width*16/9});
  try {
   assert.equal(item.start,0);assert.equal(opacity(view.render(item.parameters,0)),1);
   assert.equal(item.parameters.circleAt,before.parameters.circleAt);assert.equal(item.parameters.expandAt,before.parameters.expandAt);
   for(let frame=0;frame<item.end;frame++)assert.equal(opacity(view.render(item.parameters,frame)),1);
  } finally {view.dispose();}
 }
});
