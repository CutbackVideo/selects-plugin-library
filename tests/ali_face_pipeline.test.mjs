import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadPanelModule,disposePanelModule} from './panel_module_fixture.mjs';
const source=fs.readFileSync(new URL('../plugins/ali-abdaal-style/panel.tsx',import.meta.url),'utf8');
const plain=x=>JSON.parse(JSON.stringify(x));
for(const mode of ['clear','failed','missing'])test('production layout pipeline preserves '+mode+' observation status and never waits for confirmation',async()=>{
 const api=loadPanelModule(source,{names:['aliPrepareHeadlineLayout','styleScript','CAMERA_EFFECT','GRAPHIC'],overrides:{aliReadFaceSources:async()=>({fps:24,mains:[{startFrame:0,endFrame:24,sourceStartSeconds:0,sourceFps:24,sourceDurationSeconds:1,aiResourceId:'r'}]}),aliObserveHeadlineFaces:async()=>{if(mode==='failed')throw Error('Model unavailable');return mode==='clear'?{0:[{x:100,y:900,w:800,h:200}]}:{0:null};}}});
 const writes=[],sdk={storage:{setItem:async(...args)=>writes.push(args)},confirm:()=>{throw Error('No blocking confirmation')}};
 const words=[{text:'Hello',startFrame:0,endFrame:24}],plan={camera:[],scenes:[{start:0,end:1,kind:'headline',title:'A title',body:'',items:[]}],captions:[]};
 try{
  await api.aliPrepareHeadlineLayout(sdk,'p',{kind:'video',resourceId:'r'},words,plan,()=>{},()=>{});
  const layout=plan.scenes[0].layout;assert.equal(layout.status,mode==='clear'?'clear':'unavailable');assert.equal(!!layout.reserved,mode!=='clear');assert.equal(writes.length,1);
  const effects=[],graphics=[],draft={clips:async()=>[{clipId:1,resourceId:'r',startFrame:0,endFrame:24}],addVideoEffect:async o=>effects.push(o),rangeAtFrames:async(a,b)=>({a,b}),addMotionGraphic:async o=>graphics.push(o)};
  await new Function('d','return (async()=>{'+api.styleScript(words,plan)+'})()')(draft);
  assert.equal(effects[0].parameters.layouts.length,mode==='clear'?0:1);assert.equal(graphics[0].parameters.fixedGraphic,mode!=='clear');assert.ok(graphics[0].editableParameters.find(x=>x.key==='top'));
  if(mode!=='clear')assert.match(graphics[0].label,/Face scan unavailable/);
 }finally{disposePanelModule(api)}
});
test('dense observation adapter requests only scene windows and keeps empty face frames unknown',async()=>{
 const calls=[];
 const api=loadPanelModule(source,{names:['aliObserveHeadlineFaces'],overrides:{aliFaceClient:()=>({run:async request=>{calls.push(plain(request));return{result:{files:{detections:{}},metrics:{decodedFrames:2}}}}}),aliSharedface_result_pages:{readFaceResultPages:async()=>({frameSize:{width:1080,height:1920},parameters:{sourceRange:calls.at(-1).sourceRange,sampleEverySeconds:.5/24},samples:[{index:0,sourceTimeSeconds:calls.at(-1).sourceRange.startSeconds,faces:[{score:.95,box:{xmin:200,ymin:300,xmax:500,ymax:700}}]},{index:1,sourceTimeSeconds:calls.at(-1).sourceRange.endSeconds-.001,faces:[]}]})}}});
 try{const result=await api.aliObserveHeadlineFaces({},'p',[{sceneIndex:0,main:{sourceFps:24,sourceDurationSeconds:600,width:1080,height:1920,aiResourceId:'r'},sourceRange:{startSeconds:10,endSeconds:11}}],()=>{},()=>{});assert.equal(result[0],null);assert.equal(calls.length,1);assert.ok(calls[0].sourceRange.startSeconds>=9.95);assert.ok(calls[0].sourceRange.endSeconds<=11.05);assert.equal(calls[0].options.sampleEverySeconds,.5/24);}finally{disposePanelModule(api)}
});
