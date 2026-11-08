// The independent plugin/host boundary: exercise real recipe entry points and
// inspect both the structured request and the unchanged legacy command.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadPanelModule,disposePanelModule} from './panel_module_fixture.mjs';
const read = file => fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const source = {width:1920,height:1080,avg_frame_rate:'30/1',side_data_list:[{rotation:90}]};
const files = {join:(...parts)=>parts.join('/'),mkdir:async()=>{},exists:async()=>false,rename:async()=>{},rm:async()=>{},stat:async()=>({size:123})};

test('a16z candidate uses upright cover-size output and keeps the provider URL legacy argv',async t=>{
 const calls=[],sourceInfo={...source};
 const host={fs:()=>files,isTerminalMediaFailure:()=>false,hostFF:async(tool,args,timeout,request)=>{
  if(tool==='runFFmpeg'){calls.push({args,request});return {stdout:'',stderr:''};}
  return {stdout:args.includes('json')?JSON.stringify({streams:[sourceInfo]}):'1080,1920,2',stderr:''};
 }};
 const api=loadPanelModule(read('plugins/a16z-style-captions/src/pipeline/stock.ts'),{names:['cutCandidate'],modules:{'./host':host}});t.after(()=>disposePanelModule(api));
 await api.cutCandidate({}, {id:'stock',url:'https://example.test/video.mp4',width:1080,height:1920,duration:10},'/clips',2,.4);
 const {args,request}=plain(calls[0]);
 assert.deepEqual([request.width,request.height,request.frameRate,request.frameCount,request.sourceStartSeconds,request.sourceEndSeconds,request.fit,request.endBehavior],[1080,1920,30,60,.4,2.4,'fill','stop']);
 assert.equal(request.sourcePath,'https://example.test/video.mp4');
 assert.deepEqual(args.slice(0,10),['-v','error','-y','-ss','0.40','-t','2.00','-i',request.sourcePath,'-an']);
 assert.equal(args.at(-1),request.outputPath);
 for(const unsupported of [{sample_aspect_ratio:'2:1'},{r_frame_rate:'60/1'},{side_data_list:[{rotation:45}]}]){
  Object.assign(sourceInfo,source,{sample_aspect_ratio:'1:1',r_frame_rate:'30/1'},unsupported);
  await api.cutCandidate({}, {id:'stock',url:'https://example.test/video.mp4',width:1080,height:1920,duration:10},'/clips',2,.4);
  assert.equal(calls.at(-1).request,undefined,'unrepresentable geometry/timing selects original argv before dispatch');
 }
});

test('podcast stock uses downloaded input and upright dimensions without changing its cut argv',async t=>{
 const calls=[],stock={originalUrl:'https://example.test/original',duration:10,width:1080,height:1920,files:[{url:'https://example.test/asset',width:1080,height:1920}]};
 const host={fs:()=>({...files,downloadFile:async()=>{}}),getSdk:()=>({runScript:async()=>({result:[stock]})}),sleep:()=>new Promise(()=>{}),removeFile:async()=>{},
 ffprobe:async()=>JSON.stringify({streams:[source]}),ffmpeg:async(label,args,timeout,capture,request)=>{calls.push({args,request});}};
 // The final csv probe is separate from the metadata JSON probe.
 host.ffprobe=async(label)=>label==='Probe stock source'?JSON.stringify({streams:[source]}):'1080,1920';
 const api=loadPanelModule(read('plugins/podcast-hook-captions/src/pipeline/stock.ts'),{names:['stockClip'],modules:{'./host':host}});t.after(()=>disposePanelModule(api));
 await api.stockClip({},['mountains'],'portrait','/clips',4);
 const {args,request}=plain(calls[0]);
 assert.deepEqual([request.width,request.height,request.frameRate,request.frameCount,request.sourceStartSeconds,request.sourceEndSeconds],[1080,1920,30,120,.4,4.4]);
 assert.ok(request.sourcePath.endsWith('.src'));
 assert.deepEqual(args.slice(0,10),['-v','error','-y','-ss','0.4','-t','4.0','-i',request.sourcePath,'-an']);
 assert.equal(args.at(-1),request.outputPath);
});

test('EO B-roll cuts keep upright source framing, source fps and exact legacy argv',async t=>{
 const calls=[],probe={durationSec:2,video:{width:1920,height:1080,rotation:90,fps:'30/1'}};
 const api=loadPanelModule(read('plugins/eo-shorts/src/broll/cut.ts'),{names:['cutClip','cutArgs'],modules:{
 '../host/ffmpeg.ts':{probeMedia:async()=>probe,encode:async(rt,args,options)=>{calls.push({args,request:options.transcode});}},
 '../host/fs.ts':{readJsonIfExists:async()=>null,removeFile:async()=>{},renameWithRetry:async()=>{},statFile:async()=>({size:123}),writeJsonAtomic:async()=>{}}
 }});t.after(()=>disposePanelModule(api));
 await api.cutClip({fs:files,runtime:{runVideoTranscode:()=>{}},tmpDir:'/tmp'},'https://example.test/video.mp4',1,2,'/out.mp4');
 const {args,request}=plain(calls[0]);
 assert.deepEqual([request.width,request.height,request.frameRate,request.frameCount,request.sourceStartSeconds,request.sourceEndSeconds,request.fit],[1080,1920,30,60,1,3,'fill']);
 assert.deepEqual(args,plain(api.cutArgs(request.sourcePath,1,2,request.outputPath)));
});

test('gongju portrait shots request center cover and preserve spare frames and legacy args',async t=>{
 const calls=[],runtime={runFFmpeg:()=>{},runVideoTranscode:async(request,args)=>{calls.push({request,args});}};
 const api=loadPanelModule(read('plugins/gongju-gallery/panel.tsx'),{names:['cropShots','galleryCropArgs'],overrides:{hostUseSdk:()=>{},hostNeed:name=>name==='Runtime'?runtime:files,hostApi:()=>({...files,exists:async()=>true}),hostRoots:async()=>({plugin:'/plugin',data:'/data'}),hostJoin:(...parts)=>parts.join('/')}});t.after(()=>disposePanelModule(api));
 const clip={path:'/source.mp4',startSeconds:1.25,frames:30};
 await api.cropShots({}, {clips:[clip]});
 const {args,request}=plain(calls[0]);
 assert.deepEqual([request.width,request.height,request.frameRate,request.frameCount,request.fit,request.position,request.endBehavior],[1080,1440,30000/1001,32,'cover',{x:.5,y:.5},'stop']);
 assert.deepEqual(args,plain(api.galleryCropArgs(clip,request.outputPath)));
});

test('Chris reviewed image cutaways retain focus and image hold timing',async t=>{
 const calls=[],runtime={runFFmpeg:()=>{},runVideoTranscode:async(request,args)=>{calls.push({request,args});return {};}};
 const api=loadPanelModule(read('plugins/chris-williamson-style/src/engine.ts'),{names:['cwAssets'],overrides:{cwMkdir:async()=>{},cwEncoders:async()=>'',cwFfmpeg:async()=>({ok:true})},globals:{hostNeed:name=>name==='Runtime'?runtime:{writeFile:async()=>{}},hostJoin:(...parts)=>parts.join('/'),hostReadText:async()=> '[]'}});t.after(()=>disposePanelModule(api));
 await api.cwAssets({assets:{fps:24,mediaFolder:'media',items:[{id:'b1',seconds:2,candidate:{kind:'still',file:'/image.png'},review:{accepted:true,focusX:.25,focusY:.75}}]}},'/run');
 const {args,request}=plain(calls[0]);
 assert.deepEqual([request.width,request.height,request.frameRate,request.frameCount,request.inputKind,request.fit,request.position,request.endBehavior],[1080,1920,24,48,'image','cover',{x:.25,y:.75},'stop']);
 assert.deepEqual(args.slice(0,9),['-v','error','-y','-loop','1','-i','/image.png','-t','2']);
 assert.equal(args.at(-1),request.outputPath);
});
