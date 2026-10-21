'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const modulesRoot=process.env.SBS_PANEL_TEST_MODULES;


function renderFixture(api,runScript){
 const catalog=[{name:'A.mov',resourceId:'a',path:'/a',frameRate:30,durationSeconds:10,frameSize:{width:1920,height:1080}},{name:'B.mov',resourceId:'b',path:'/b',frameRate:24,durationSeconds:10,frameSize:{width:1920,height:1080}},{name:'head.mov',resourceId:'head',path:'/head',frameRate:30,durationSeconds:1,frameSize:{width:600,height:640}},{name:'logo.png',resourceId:'logo',path:'/logo',frameSize:{width:1080,height:240}},{name:'card.png',resourceId:'card',path:'/card',durationSeconds:0,frameSize:{width:300,height:200}}];
 const prepared=[{id:'actor',resourceId:'head',path:'/head',sourceResourceName:'A.mov',sourceStartFrame:60,sourceEndFrame:90,fps:30,width:600,height:640,visibleBounds:[100,40,500,600]},{id:'template-logo',resourceId:'logo',path:'/logo',width:1080,height:240}];
 const clip={name:'Draft α',headline1:'\uccab \uc81c\ubaa9',headline2:'Second',beats:[{resourceName:'A.mov',startSeconds:2,endSeconds:3,layers:[{kind:'media',name:'actor',preparedId:'actor',startSeconds:2.2,endSeconds:2.8,x:600,y:800,width:200,height:280,opacity:.7,adjust:{tint:12,contrast:20,saturation:15}},{kind:'text',name:'label',text:'\ud55c\uae00 \ubb38\uc7a5',x:400,y:500,width:500,height:100,fontSize:50},{kind:'media',name:'card',resourceName:'card.png',x:400,y:1000,width:300,height:200}]},{resourceName:'B.mov',startSeconds:1,endSeconds:2,layers:[{kind:'color',name:'square',color:'#FF0000',x:100,y:100,width:100,height:100}]}]};
 const tpl={background:{mode:'color',color:'#121212'},logo:{mode:'image',width:500},layout:{logoCenter:130,headlineCenter:300},headline:{size1:60,size2:50,font:'TestFont',color1:'#FFFFFF',color2:'#AABBCC'}};
 const calls=[],store=new Map(),draftIds=[],graphics=[];let clips=[],frame=0,id=0,meta={name:clip.name,fps:30,frameSize:{width:1080,height:1920}};
 const add=(a,b,r,kind='video')=>{const c={clipId:++id,resourceId:r,startFrame:a,endFrame:b,trackKind:kind};clips.push(c);return c;};
 const d={meta:async()=>({...meta,durationFrames:frame}),setSettings:async o=>{calls.push(['settings',o]);const [n,d]=o.frameRate.split('/').map(Number);meta.fps=n/d;},insertResource:async o=>{calls.push(['main',o]);const length=Math.round((o.sourceRange.endSeconds-o.sourceRange.startSeconds)*meta.fps);add(frame,frame+length,o.resourceId,'main');frame+=length;},clips:async o=>structuredClone(o.trackScope==='main'?clips.filter(x=>x.trackKind==='main'):clips),rangeAtFrames:async(a,b)=>({a,b}),overlayResource:async o=>{calls.push(['media',o]);add(o.over.a,o.over.b,o.resource.id);},addMotionGraphic:async o=>{calls.push(['graphic',o]);const clip=add(o.within.a,o.within.b,null);graphics.push({name:o.label,clip,parameters:o.parameters});return {clipId:clip.clipId};},motionGraphics:async()=>graphics,motionGraphicProgram:async clip=>({parameters:graphics.find(g=>g.clip.clipId===clip.clipId).parameters}),setClipTransform:async o=>{calls.push(['transform',o]);},setClipOpacity:async o=>{calls.push(['opacity',o]);},applyEffectPreset:async o=>{calls.push(['adjust',o]);},commitAll:async()=>{calls.push(['commit']);if(!draftIds.length)draftIds.push('draft-id');return {createdDraftId:'draft-id'};}};
 const p={resources:async()=>catalog.map(x=>({resourceId:x.resourceId,type:x.name.endsWith('.png')?'Image':'Video'})),sourceFiles:async()=>({fileTree:catalog}),resource:id=>({id}),meta:async()=>({draftIds}),createDraft:async()=>{calls.push(['create']);return d;}};
 const sdk={project:()=>p,draft:()=>d,effectPresets:{get:async id=>({tsxCode:'export default function Text(){return null}',parameters:{},editableParameters:id==='basic-adjust'?['tint','contrast','saturation'].map(key=>({key,type:'number',min:-100,max:100})):[]})},files:{mkdir:async()=>{},stat:async p=>store.has(p)?{size:store.get(p).length}:null,readRange:async({path,offset,length})=>{const b=store.get(path).subarray(offset,offset+length);return{base64:b.toString('base64'),bytesRead:b.length};},writeChunk:async({path,offset,base64})=>{const chunk=Buffer.from(base64,'base64');store.set(path,offset?Buffer.concat([store.get(path),chunk]):chunk);return{bytesWritten:chunk.length};}}};
 return {catalog,prepared,clip,tpl,sdk,calls,store,graphics,run:()=>runScript(api.sceneRenderScript('p',clip,tpl,prepared,'/work',{}),sdk)};
}

function revealFixture(){
 const words={'A.mov':[[2,2.5,'\ubb38\uc774'],[2.5,3,'\uc5f4\ub9b0\ub2e4.']]},inventory=[{name:'A.mov',type:'Video',durationSeconds:10}];
 const plan={episode:'Explain a visible action',sourceReview:[{resourceName:'A.mov',role:'speaker',observed:'An opening door',excluded:[]}],assetReview:[],clips:[{name:'Draft α',headline1:'Door',headline2:'Opening',beats:[{resourceName:'A.mov',startSeconds:2,endSeconds:3,kind:'speech',anchor:'\ubb38\uc774 \uc5f4\ub9b0\ub2e4.',intent:'Explain opening',focus:'Door',composition:'The label appears with the action verb',assets:[],captions:[{startSeconds:2,endSeconds:2.5,text:'\ubb38\uc774'},{startSeconds:2.5,endSeconds:3,text:'\uc5f4\ub9b0\ub2e4.'}],disclosures:[{sourceSeconds:2.5,anchor:'\uc5f4\ub9b0\ub2e4.',token:'\uc5f4\ub9b0\ub2e4'}],layers:[{kind:'text',name:'Door label',startSeconds:2.5,endSeconds:3,text:'\ubb38 \uc5f4\ub9bc',x:540,y:900,width:500,height:100,fontSize:48,color:'#FFFFFF'}]}]}]};
 return{plan,words,inventory};
}

function mediaFixture(api,runScript,mode='head'){
 const req={id:'safe-id',resourceName:'actor.mov',startSeconds:2,endSeconds:2.1,cutout:{mode,crop:{x:1400,y:200,width:1100,height:1600},...(mode==='head'?{headCrop:{x:250,y:20,width:600,height:640}}:{})}};
 const files=[{name:'actor.mov',resourceId:'original',path:'/original',frameRate:30,durationSeconds:10,frameSize:{width:3840,height:2160}}],existing=new Set(),jobs=new Map(),calls=[];let count=0,nativeState='succeeded',badFrames=false;
 const artifact={id:'artifact',name:'foreground.mov',byteSize:10000,mediaType:'video/quicktime'},nativeUuid='f85c64d5-142d-4cb5-bda5-24b335d81e16',receipt={version:1,artifactId:artifact.id,projectId:'project',resourceId:nativeUuid,fileName:artifact.name,byteSize:artifact.byteSize},receipts=new Map();
 const geometry=p=>p.endsWith('-head.mov')?req.cutout.headCrop:req.cutout.crop;
 const imported=p=>{const existing=files.find(f=>f.path===p);if(existing)return existing;const d=geometry(p);const row={name:p.split('/').at(-1),resourceId:'r'+files.length,path:p,frameRate:30,frameSize:{width:d.width,height:d.height}};files.push(row);return row;};
 const p={sourceFiles:async()=>({fileTree:files}),importFiles:async o=>{calls.push(['importFiles',o]);return{addedResourceIds:o.paths.map(p=>imported(p).resourceId)};},importArtifact:async o=>{calls.push(['importArtifact',o]);imported('/artifacts/ours/foreground.mov');receipts.set('/artifacts/ours/receipt.json',Buffer.from(JSON.stringify(receipt)));return{resourceId:nativeUuid};}};
 const aiHandle={workflowId:'wf',status:async()=>({status:nativeState,resourceId:files.find(f=>f.path.endsWith('-roi.mov'))?.resourceId}),result:async()=>({files:{foreground:artifact,manifest:{id:'mask-manifest'}}}),cancel:async()=>{calls.push(['nativeCancel']);nativeState='canceled';}};
 const sdk={project:()=>p,files:{exists:async p=>existing.has(p),mkdir:async()=>{},pathFromLocalUrl:async u=>u.slice('local://'.length),stat:async p=>receipts.has(p)?{size:receipts.get(p).length,isDirectory:false}:files.some(f=>f.path===p)?{size:artifact.byteSize,isDirectory:false}:null,readRange:async({path,offset,length})=>{const b=receipts.get(path).subarray(offset,offset+length);return{base64:b.toString('base64'),bytesRead:b.length};}},ai:{submit:async i=>{calls.push(['nativeSubmit',i]);return aiHandle;},job:()=>aiHandle,prepareMatte:async()=>({sourceResourceId:'roi-uuid',alphaEncoding:'grayscale-png-8bit',frameSize:{width:req.cutout.crop.width,height:req.cutout.crop.height},sourceRange:{startSeconds:0,endSeconds:(Math.round(req.endSeconds*30)-Math.round(req.startSeconds*30))/30},frames:Array.from({length:Math.round(req.endSeconds*30)-Math.round(req.startSeconds*30)},(_,index)=>({index,sourceTimeSeconds:index/30,url:'local:///masks/alpha_'+String(index).padStart(6,'0')+'.png'}))})},media:{probe:async input=>{calls.push(['probe',input]);return{files:[{hasAudioStream:false}]};},startFFmpeg:async o=>{const jobId='job'+(++count);calls.push(['ffmpeg',o]);existing.add(o.args.at(-1));jobs.set(jobId,{kind:'media',state:'succeeded'});return{jobId};},startFFprobe:async o=>{const jobId='job'+(++count);const file=o.args.at(-1),d=geometry(file);jobs.set(jobId,{kind:'probe',state:'succeeded',text:JSON.stringify({streams:[{codec_type:'video',width:d.width,height:d.height,pix_fmt:file.endsWith('-roi.mov')?'yuv422p10le':'yuva444p12le',r_frame_rate:'30/1',avg_frame_rate:'30/1',nb_read_frames:String(badFrames?9:Math.max(2,Math.round(req.endSeconds*30)-Math.round(req.startSeconds*30)))}]})});return{jobId};},job:id=>({status:async o=>{const j=jobs.get(id);assert(j);return{state:j.state,events:j.kind==='probe'&&!(o?.cursor)?[{stream:'stdout',text:j.text}]:[],nextCursor:1,truncated:false};},cancel:async()=>{calls.push(['mediaCancel',id]);jobs.get(id).state='cancelled';}})}};
 return {req,sdk,calls,jobs,files,imported,artifact,nativeUuid,receipt,receipts,setBad:()=>badFrames=true,setNative:v=>nativeState=v,run:(state,deadline=Date.now()+100000,action='step')=>runScript(api.sceneMediaStepScript('project',req,state,'/work',deadline,action),sdk)};
}

function callerFixture(compiled,count=1,bounded=false){
 if(bounded){assert(compiled.includes("const maxMs = null;"));compiled=compiled.replace("const maxMs = null;","const maxMs = 600000;");}
 let time=0,stopReject,reply=async()=>{throw Error('Unexpected SDK call');};
 const clone=value=>JSON.parse(JSON.stringify(value)),patches=[],started=[],canceled=[],scriptCalls=[];
 class Clock extends Date{static now(){return time;}}
 class RunCancelled extends Error{}
 const token={cancelled:false,stop:new Promise((_,reject)=>stopReject=reject)};token.stop.catch(()=>{});
 const job={id:'test',created:new Date(0).toISOString(),sceneStudy:{clips:[{beats:[{resourceName:'source',startSeconds:0,endSeconds:1,layers:Array.from({length:count},()=>({cutout:{mode:'person'}}))}]}]}};
 const context={Date:Clock,Error,Promise,Math,Number,Object,Array,Set,Map,JSON,RunCancelled,runRef:{current:token},projectId:'p',lang:'en',
  store:{fs:{readFile:async()=>new Uint8Array([255,216])}},prepareSceneEvidence:async()=>({images:[{name:'original-video',dataUrl:'data:image/jpeg;base64,/9g='},{name:'original-images',dataUrl:'data:image/jpeg;base64,/9g='}],visualEvidence:{sheets:[],journalisticMetadata:[]},limitations:[]}),setStatus(){},setStep(){},clone,guard:p=>Promise.race([p,token.stop]),sleep:async()=>{},scriptError:x=>x,scriptCode:()=>'',scenePreflightScript:()=>'',
  sceneMediaStepScript:(projectId,request,state,directory,deadline,action)=>JSON.stringify({request,state,action}),
  script:async(code,summary)=>{scriptCalls.push(summary);if(summary==='Locate scene workspace')return{homedir:'/test'};
   if(summary==='Read original evidence and prepared media')return{sources:[{type:'Video',name:'source',sourceWords:[[0,1,'hello',0,1,false]]}],authoredDocuments:[],preparedMedia:[]};throw Error(summary);},
  scriptNow:async code=>{if(code.startsWith('{')){const p=JSON.parse(code);canceled.push(p.state?.mediaJobId);return{state:{...p.state,phase:'canceled'}};}const id=/selects\.media\.job\(("[^"]+")\)/.exec(code);if(id)canceled.push(JSON.parse(id[1]));return{state:'cancelled'};},
  sdk:{runScript:async input=>{started.push(input);return reply(input);}}};
 const run=require('node:vm').runInNewContext(compiled,context);
 return{job,patches,started,canceled,scriptCalls,context,setTime:v=>time=v,setReply:f=>reply=f,
  cancel:()=>{token.cancelled=true;stopReject(new RunCancelled());},run:(tpl={logo:{mode:'none'}})=>run(job,async patch=>patches.push(clone(patch)),tpl)};
}
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('production scene runtime',{skip:!modulesRoot && 'Set SBS_PANEL_TEST_MODULES'},async t=>{
  const dep=createRequire(path.resolve(modulesRoot,'../package.json')),esbuild=dep('esbuild');
  const source=fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8'),loaded={exports:{}};
  new Function('require','module','exports',esbuild.transformSync(source+'\nexport {sceneVision,startScenePreparationWorker,createSceneMainDraft,createSceneMediaTools,createSceneBudget,sceneLayerPrompt,sceneStudyPrompt,sceneBuildPrompt,validateSceneSourcePlan,parseSceneStudy,validateSceneDraft,validateSceneLayers,sceneRenderScript,sceneMediaStepScript,sceneCaptionScript};',{loader:'tsx',format:'cjs'}).code)(dep,loaded,loaded.exports);
  const api=loaded.exports;
  const runScript=(body,sdk)=>{
    const output=esbuild.transformSync('async function run(selects){'+body+'}',{loader:'ts',target:'es2022'}).code;
    return new Function(output+';return run;')()(sdk);
  };
  function mediaToolsFixture(){
    const fps=30000/1001,calls=[],clips=[{clipId:1,resourceId:'original',trackKind:'main',startFrame:0,endFrame:300}];
    const files=[{resourceId:'image',name:'wide.png',type:'video',path:'/wide.png',durationSeconds:0},{resourceId:'head',name:'head.mov',path:'/head.mov',frameSize:{width:600,height:640},frameRate:fps,durationSeconds:20/fps}];
    const descriptors=[{resourceId:'image',path:'/wide.png',width:6000,height:1000},{resourceId:'head',path:'/head.mov',width:600,height:640,sourceResourceName:'A.mov',sourceStartFrame:100,sourceEndFrame:120,fps}];
    const p={sourceFiles:async()=>({fileTree:files}),resources:async()=>[{resourceId:'image',type:'Image'},{resourceId:'head',type:'Video'}],resource:id=>({id})};
    const d={meta:async()=>({fps,frameSize:{width:1080,height:1920}}),clips:async()=>structuredClone(clips),rangeAtFrames:async(a,b)=>({a,b}),overlayResource:async o=>{calls.push(['overlay',o]);clips.push({clipId:clips.length+1,resourceId:o.resource.id,trackKind:'video',startFrame:o.over.a,endFrame:o.over.b});},setClipTransform:async o=>{assert(o.scale.x>=.01&&o.scale.x<=4);assert(o.scale.y>=.01&&o.scale.y<=4);assert(Math.abs(o.position.x)<=100*1080/1920&&Math.abs(o.position.y)<=100);calls.push(['transform',o]);}};
    const sdk={project:()=>p,draft:()=>d};
    return{fps,calls,clips,files,descriptors,p,d,sdk,tools:()=>api.createSceneMediaTools(sdk,p,d,descriptors)};
  }
  await t.test('shared media factory emitted in both builder prompts runs with sparse image metadata',async()=>{
    for(const bounded of [false,true]){
      const f=mediaToolsFixture(),prompt=api.sceneBuildPrompt({bounded,instructions:'Channel style'});
      const start=prompt.indexOf('async function createSceneMediaTools('),end=prompt.indexOf('\nInitialize after',start);
      assert(start>=0&&end>start);
      const result=await runScript(prompt.slice(start,end)+'\nconst tools=await createSceneMediaTools(selects,selects.project("p"),selects.draft("d"),'+JSON.stringify(f.descriptors)+');return tools.asset("image");',f.sdk);
      assert.equal(result.type,'Image');assert.equal(result.durationSeconds,0);assert.equal(result.width,6000);assert.equal(result.height,1000);
      assert.equal(f.calls.length,0);
    }
    const f=mediaToolsFixture(),tools=await f.tools();f.descriptors[0].path='/wrong';
    assert.throws(()=>tools.asset('image'),/path mismatch/);
    assert.throws(()=>tools.asset('image',{path:'/wide.png'}),/dimensions missing/);
  });
  await t.test('shared geometry preserves visible subject placement and exposes unsupported scale without clamping',async()=>{
    const f=mediaToolsFixture(),tools=await f.tools(),item=tools.asset('head');
    const normal=tools.transform(item,{x:540,y:960,width:600,height:640});
    assert.deepEqual(normal.position,{x:0,y:0});assert(Math.abs(normal.scale.x-1/1.8)<1e-12);
    const asym={...item,visibleBounds:[100,40,400,500]},rotated=tools.transform(asym,{x:540,y:960,width:300,height:460,rotation:90});
    assert(Math.abs(rotated.position.x-50/19.2)<1e-12);assert(Math.abs(rotated.position.y-50/19.2)<1e-12);assert.equal(rotated.rotation,90);
    for(const scale of [.01,4])assert.equal(tools.transform(item,{x:540,y:960,width:600*1.8*scale,height:640*1.8*scale}).supported,true);
    for(const scale of [.009,4.001]){const result=tools.transform(item,{x:540,y:960,width:600*1.8*scale,height:640*1.8*scale});assert.equal(result.supported,false);assert(Math.abs(result.scale.x-scale)<1e-12);assert(result.preparationRequired);}
    assert.equal(tools.transform(item,{x:3000,y:960,width:100,height:100}).supported,false);
    assert.throws(()=>tools.transform({...item,visibleBounds:[0,0,601,640]},{x:540,y:960,width:300,height:300}),/visible media bounds/);
    assert.throws(()=>tools.transform(item,{x:540,y:960,width:300,height:300,rotation:181}),/Rotation/);
    const wide=tools.asset('image'),box={x:540,y:960,width:1080,height:1920,fit:'cover'};
    assert.equal(tools.transform(wide,box).supported,false);
    const crop=tools.imageCrop(wide,box);assert.deepEqual([crop.width,crop.height,crop.x,crop.y],[562,1000,2719,0]);
    assert.equal(tools.transform({...wide,width:crop.width,height:crop.height},box).supported,true);
    assert.throws(()=>tools.imageCrop(wide,{...box,cropX:5999}),/Crop outside source/);
  });
  await t.test('shared prepared coverage exposes head, tail and interior gaps on the source frame grid',async()=>{
    const f=mediaToolsFixture(),tools=await f.tools(),head=tools.asset('head');
    const cover=(a,b,items=[head])=>tools.coverage('A.mov',a,b,items,200,f.fps);
    const full=cover(103,118);assert.equal(full.complete,true);assert.deepEqual(full.missing,[]);
    assert.deepEqual(full.segments.map(s=>[s.sourceStartFrame,s.sourceEndFrame,s.startFrame,s.endFrame]),[[103,118,200,215]]);
    assert(Math.abs(full.segments[0].sourceStartSeconds-3/f.fps)<1e-12);
    assert.deepEqual(cover(99,120).missing,[{sourceStartFrame:99,sourceEndFrame:100}]);
    assert.deepEqual(cover(100,121).missing,[{sourceStartFrame:120,sourceEndFrame:121}]);
    const second={...head,resourceId:'head2',sourceStartFrame:125,sourceEndFrame:135,durationSeconds:10/f.fps};
    assert.deepEqual(cover(100,135,[head,second]).missing,[{sourceStartFrame:120,sourceEndFrame:125}]);
    assert.deepEqual(cover(100,120,[{...head,sourceResourceName:'Other.mov'}]).missing,[{sourceStartFrame:100,sourceEndFrame:120}]);
    for(const change of [{fps:30},{mediaFps:30}])assert.throws(()=>cover(100,120,[{...head,...change}]),/FPS mismatch/);
    const short=cover(100,120,[{...head,durationSeconds:19/f.fps}]);
    assert.equal(short.complete,false);assert.deepEqual(short.missing,[{sourceStartFrame:119,sourceEndFrame:120}]);assert.equal(short.segments[0].endFrame,219);
  });
  await t.test('verified CFR extent survives import millisecond quantization without padding or re-encoding',async()=>{
    for(const count of [172,227,72,82,74]){
      const f=mediaToolsFixture(),duration=Number((count/f.fps).toFixed(3));
      Object.assign(f.files[1],{durationSeconds:duration});Object.assign(f.descriptors[1],{sourceEndFrame:100+count,verifiedFrameCount:count});
      const tools=await f.tools(),head=tools.asset('head'),box={x:540,y:960,width:300,height:320};
      const coverage=tools.coverage('A.mov',100,100+count,[head],0,f.fps);assert.equal(coverage.complete,true);
      assert.equal((await tools.place(head,coverage.segments[0],box)).endFrame,count);
      const offset=tools.coverage('A.mov',103,100+count,[head],200,f.fps).segments[0];
      assert.equal((await tools.place(head,offset,box)).endFrame,200+count-3);
      const before=f.calls.length;await assert.rejects(tools.place(head,{startFrame:0,endFrame:count,sourceStartSeconds:1/f.fps},box),/does not cover/);assert.equal(f.calls.length,before);
      assert.deepEqual(tools.coverage('A.mov',100,101+count,[head],0,f.fps).missing,[{sourceStartFrame:100+count,sourceEndFrame:101+count}]);
    }
  });
  await t.test('verified extent rejects short imports, forged identity, mapping and FPS while legacy remains conservative',async()=>{
    const f=mediaToolsFixture();Object.assign(f.files[1],{durationSeconds:5.739});Object.assign(f.descriptors[1],{sourceEndFrame:272,verifiedFrameCount:172});
    const tools=await f.tools(),head=tools.asset('head'),box={x:540,y:960,width:300,height:320};
    assert.throws(()=>tools.asset('head',{...f.descriptors[1],resourceId:'other'}),/resource mismatch/);
    for(const change of [{resourceId:'other'},{path:'/other'},{verifiedFrameCount:173},{sourceEndFrame:273},{sourceResourceName:'Other.mov'},{fps:30},{mediaFps:30}])await assert.rejects(tools.place({...head,...change},{startFrame:0,endFrame:172},box));
    f.files[1].durationSeconds=171/f.fps;
    await assert.rejects(tools.place(head,{startFrame:0,endFrame:172},box),/duration mismatch/);assert.equal(f.calls.length,0);
    delete f.descriptors[1].verifiedFrameCount;f.files[1].durationSeconds=5.739;
    const unverified=tools.asset('head');assert.deepEqual(tools.coverage('A.mov',100,272,[unverified],0,f.fps).missing,[{sourceStartFrame:271,sourceEndFrame:272}]);
    await assert.rejects(tools.place(unverified,{startFrame:0,endFrame:172},box),/does not cover/);
    const short={...unverified,durationSeconds:171/f.fps};assert.equal(tools.coverage('A.mov',100,272,[short],0,f.fps).complete,false);
  });
  await t.test('placement refuses an SDK overlay that returns a shorter interval',async()=>{
    const f=mediaToolsFixture(),original=f.d.overlayResource;f.d.overlayResource=async o=>{await original(o);f.clips.at(-1).endFrame--;};
    const tools=await f.tools();await assert.rejects(tools.place(tools.asset('head'),{startFrame:0,endFrame:20},{x:540,y:960,width:300,height:320}),/requested frame interval/);assert.equal(f.calls.filter(c=>c[0]==='transform').length,0);
  });
  await t.test('shared placement validates before mutation and returns the actual silent overlay with exact local offset',async()=>{
    const f=mediaToolsFixture(),tools=await f.tools(),head=tools.asset('head'),image=tools.asset('image'),box={x:540,y:960,width:300,height:320};
    for(const [item,span,b] of [[head,{startFrame:0,endFrame:21},box],[head,{startFrame:0,endFrame:20,sourceStartSeconds:1/f.fps},box],[image,{startFrame:0,endFrame:30,sourceStartSeconds:1},box],[head,{startFrame:0,endFrame:10},{...box,width:10000,height:10000}]]){
      await assert.rejects(tools.place(item,span,b));assert.equal(f.calls.length,0);assert.equal(f.clips.length,1);
    }
    const segment=tools.coverage('A.mov',103,118,[head],200,f.fps).segments[0],placed=await tools.place(head,segment,box);
    assert.deepEqual(placed,{clipId:2,resourceId:'head',trackKind:'video',startFrame:200,endFrame:215});
    const overlay=f.calls.find(c=>c[0]==='overlay')[1];assert.equal(overlay.withSound,false);assert.equal(overlay.sourceStartSeconds,3/f.fps);assert.deepEqual(overlay.over,{a:200,b:215});
    assert.deepEqual(f.calls.find(c=>c[0]==='transform')[1].clip,placed);
    await tools.place(image,{startFrame:0,endFrame:300},box);assert.equal(f.calls.filter(c=>c[0]==='overlay').at(-1)[1].sourceStartSeconds,0);
  });
  function workerFixture(requests,saved=null){
    const entries=[],writes=[],checkpoints=[],calls=[];let canceled=false,active=0,peak=0;
    const io={readResults:async()=>saved,readRequests:async()=>requests,write:async value=>writes.push(structuredClone(value)),checkpoint:async rows=>checkpoints.push(rows),
      isCanceled:()=>canceled,pause:tick,step:async(request,state)=>{
        calls.push({id:request.id,phase:state?.phase||null});active++;peak=Math.max(peak,active);await tick();active--;
        return{state:{projectId:'p',signature:JSON.stringify(request),phase:state?'done':'native',workflowId:'wf-'+request.id},done:!!state,descriptor:state?{id:request.id,resourceId:'r-'+request.id}:null};
      }};
    return{entries,writes,checkpoints,calls,io,get peak(){return peak;},cancel:()=>canceled=true,start:()=>api.startScenePreparationWorker('p','/work',null,entries,io)};
  }
  await t.test('shared preparation bounds concurrency, preserves each request and records fresh elapsed work',async()=>{
    const f=workerFixture(['a','b','c','d'].map(id=>({id,resourceName:'A.mov'}))),worker=f.start();
    for(let i=0;i<100&&!f.writes.some(w=>w.requests.length===4&&w.requests.every(e=>e.state?.phase==='done'));i++)await tick();
    await worker.stop();
    assert.equal(f.peak,2);assert.equal(f.entries.length,4);
    assert(f.entries.every(e=>e.state.phase==='done'&&e.mode==='fresh'&&e.elapsedMs>=0&&e.transitions.length===2));
    for(const id of ['a','b','c','d'])assert.deepEqual(f.calls.filter(c=>c.id===id).map(c=>c.phase),[null,'native']);
    assert.deepEqual(f.writes.at(-1).requests,f.checkpoints.at(-1));assert.equal(f.writes.at(-1).error,null);
  });
  await t.test('shared preparation resumes the saved native job, never repeats completed work and rejects changed mapping',async()=>{
    const requests=[{id:'done',resourceName:'A.mov'},{id:'pending',resourceName:'B.mov'}];
    const saved={version:1,projectId:'p',workDirectory:'/work',requests:requests.map((request,i)=>({workDirectory:'/work',request,state:{projectId:'p',signature:JSON.stringify(request),phase:i?'native':'done',workflowId:'wf-'+request.id},startedAt:new Date(0).toISOString(),mode:'fresh',transitions:[]}))};
    const f=workerFixture(requests,saved),worker=f.start();
    for(let i=0;i<100&&!(f.entries.length===2&&f.entries.every(e=>e.state.phase==='done'));i++)await tick();await worker.stop();
    assert.deepEqual(f.calls,[{id:'pending',phase:'native'}]);assert.equal(f.entries[1].mode,'fresh');assert.equal(f.entries[1].state.workflowId,'wf-pending');
    const altered=structuredClone(requests);altered[1].resourceName='Other.mov';const bad=workerFixture(altered,saved),rejected=bad.start();
    await assert.rejects(rejected.promise,/request changed/);assert.equal(bad.calls.length,0);assert.match(bad.writes.at(-1).error,/request changed/);
    const foreign=workerFixture(requests,{...saved,projectId:'wrong'});await assert.rejects(foreign.start().promise,/identity mismatch/);assert.equal(foreign.calls.length,0);
  });
  await t.test('shared preparation records failed inputs without overwriting their state and can append an independent retry',async()=>{
    const requests=[{id:'bad',resourceName:'A.mov'}],f=workerFixture(requests),step=f.io.step;
    f.io.step=async(req,state)=>{if(req.id==='bad')throw Error('ROI outside source');return step(req,state);};
    const worker=f.start();for(let i=0;i<100&&!f.entries[0]?.error;i++)await tick();
    requests.push({id:'retry',resourceName:'A.mov'});
    for(let i=0;i<100&&f.entries[1]?.state?.phase!=='done';i++)await tick();await worker.stop();
    assert.equal(f.entries[0].error,'ROI outside source');assert.equal(f.entries[0].state,null);assert.equal(f.entries[1].state.phase,'done');
    assert.equal(f.writes.at(-1).requests[0].request.id,'bad');
  });
  await t.test('transport failure waits for Resume, preserves history and retries the same durable state once',async()=>{
    const req={id:'resume',resourceName:'A.mov'},f=workerFixture([req]),step=f.io.step;
    f.io.step=async(r,state)=>{if(state)throw Error('fetch failed');return step(r,state);};
    const worker=f.start();for(let i=0;i<100&&!f.entries[0]?.error;i++)await tick();await worker.stop();
    const failed=structuredClone(f.writes.at(-1));assert.equal(failed.requests[0].error,'fetch failed');assert.equal(failed.requests[0].errorHistory.length,1);assert.equal(failed.requests[0].transportResumeAt,undefined);
    const resumed=workerFixture([req],structuredClone(failed)),savedState=structuredClone(failed.requests[0].state),normal=resumed.io.step;
    resumed.io.step=async(r,state)=>{assert.deepEqual(state,savedState);return normal(r,state);};
    const next=resumed.start();for(let i=0;i<100&&resumed.entries[0]?.state?.phase!=='done';i++)await tick();await next.stop();
    const entry=resumed.entries[0];assert.equal(entry.state.workflowId,savedState.workflowId);assert.equal(entry.error,null);assert.equal(entry.failedAt,null);assert.equal(entry.errorHistory.length,1);assert(entry.transportResumeAt);assert.deepEqual(resumed.calls,[{id:'resume',phase:'native'}]);
    const again=workerFixture([req],structuredClone(failed));again.io.step=async()=>{throw Error('fetch failed');};const retry=again.start();for(let i=0;i<100&&!again.entries[0]?.transportResumeAt;i++)await tick();for(let i=0;i<100&&!again.entries[0]?.error;i++)await tick();await retry.stop();assert.equal(again.entries[0].errorHistory.length,2);
    const exhausted=workerFixture([req],again.writes.at(-1));exhausted.io.pause=async()=>exhausted.cancel();await exhausted.start().promise;assert.equal(exhausted.calls.length,0);assert.equal(exhausted.entries[0].error,'fetch failed');assert.equal(exhausted.entries[0].errorHistory.length,2);
  });
  await t.test('results-file merge clears stale job error explicitly and never revives terminal, canceled or invalid preparation',async()=>{
    const req={id:'resume',resourceName:'A.mov'},row={workDirectory:'/work',request:req,state:{projectId:'p',signature:JSON.stringify(req),phase:'native',workflowId:'same'},error:'fetch failed',failedAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z',transitions:[]};
    const saved=entry=>({version:1,projectId:'p',workDirectory:'/work',requests:[entry]});
    const recovered={...structuredClone(row),error:null,failedAt:null,transportResumeAt:'2026-01-02T00:00:00.000Z',updatedAt:'2026-01-02T00:00:00.000Z',errorHistory:[{error:'fetch failed',failedAt:row.failedAt}]};
    const merge=workerFixture([req],saved(recovered));merge.entries.push(structuredClone(row));const w=merge.start();for(let i=0;i<100&&merge.entries[0]?.state.phase!=='done';i++)await tick();await w.stop();assert.equal(merge.entries[0].error,null);assert.equal(merge.entries[0].errorHistory.length,1);assert.equal(merge.calls.length,1);
    for(const patch of [{state:null},{state:{...row.state,phase:'done'}},{state:{...row.state,phase:'failed',error:'fetch failed'}},{state:{...row.state,phase:'canceled'}},{state:{...row.state,phase:'canceling'}},{state:{...row.state,phase:'native',workflowId:null}},{error:'ROI outside source'},{error:'Preparation step identity mismatch'},{error:'fetch failed',errorCode:'VALIDATION_ERROR'}]){
      const f=workerFixture([req],saved({...structuredClone(row),...patch}));f.io.pause=async()=>f.cancel();await f.start().promise;assert.equal(f.calls.length,0);assert.equal(f.entries[0].transportResumeAt,undefined);assert.equal(f.entries[0].error,patch.error||'fetch failed');
    }
    const canceled=workerFixture([req],saved(structuredClone(row)));canceled.cancel();await canceled.start().promise;assert.equal(canceled.calls.length,0);assert.equal(canceled.entries[0].error,'fetch failed');
    const expired=workerFixture([req],saved(structuredClone(row)));expired.io.pause=async()=>expired.cancel();await api.startScenePreparationWorker('p','/work',0,expired.entries,expired.io).promise;assert.equal(expired.calls.length,0);assert.equal(expired.entries[0].error,'fetch failed');
    const wrong=workerFixture([req],saved({...structuredClone(row),state:{...row.state,projectId:'foreign'}}));await assert.rejects(wrong.start().promise,/retry state identity mismatch/);assert.equal(wrong.calls.length,0);
  });
  await t.test('actual native-completed Resume finishes import and head preparation without a second native submission',async()=>{
    const f=mediaFixture(api,runScript);let state=null;for(let i=0;i<15&&state?.phase!=='native';i++)state=(await f.run(state,null)).state;assert.equal(state.phase,'native');assert.equal(f.calls.filter(c=>c[0]==='nativeSubmit').length,1);
    const original=structuredClone(state),entry={workDirectory:'/work',request:f.req,state,error:'fetch failed',failedAt:new Date(0).toISOString(),transitions:[]},entries=[],writes=[];let canceled=false;
    const io={readResults:async()=>({version:1,projectId:'project',workDirectory:'/work',requests:[entry]}),readRequests:async()=>[f.req],write:async v=>writes.push(structuredClone(v)),checkpoint:async()=>{},isCanceled:()=>canceled,pause:tick,step:(req,s)=>f.run(s,null)};
    const worker=api.startScenePreparationWorker('project','/work',null,entries,io);for(let i=0;i<100&&entries[0]?.state?.phase!=='done';i++)await tick();await worker.stop();
    assert.equal(entries[0].state.phase,'done');assert.equal(entries[0].state.workflowId,original.workflowId);assert.equal(entries[0].descriptor.resourceId,f.files.find(r=>r.path==='/work/safe-id-head.mov').resourceId);assert.equal(f.calls.filter(c=>c[0]==='nativeSubmit').length,1);assert.equal(entries[0].errorHistory[0].workflowId,original.workflowId);assert.equal(entries[0].error,null);
  });
  await t.test('unchanged running preparation polls with a pause and does not rewrite durable checkpoints',async()=>{
    const request={id:'pending',resourceName:'A.mov'},f=workerFixture([request]);let pauses=0,steps=0;
    f.io.step=async()=>{steps++;return{state:{projectId:'p',signature:JSON.stringify(request),phase:'native',workflowId:'same-job'}};};
    f.io.pause=async()=>{if(++pauses===2)f.cancel();};
    await f.start().promise;
    assert.equal(steps,3);assert.equal(pauses,2);assert.equal(f.writes.length,2);
    assert.equal(f.entries[0].transitions.length,1);assert.equal(f.entries[0].state.workflowId,'same-job');
  });

  const callerStart=source.indexOf('  async function runLayerScenes('),callerEnd=source.indexOf('  async function run(resume?: any,',callerStart);
  const budgetStart=source.indexOf('function createSceneBudget('),budgetEnd=source.indexOf('function sceneLayerPrompt(',budgetStart);
  assert(callerStart>0&&callerEnd>callerStart&&budgetStart>0&&budgetEnd>budgetStart);
  const callerCode=esbuild.transformSync(source.slice(budgetStart,budgetEnd)+source.slice(callerStart,callerEnd),{loader:'ts',target:'es2022'}).code+'\nrunLayerScenes';
  await t.test('host persists and cancels a media job returned after the shared deadline',async()=>{
    const f=callerFixture(callerCode,1,true);f.context.prepareSceneEvidence=async(p,d,io)=>io.start('start','Evidence',value=>io.register(value.jobId));f.setReply(async()=>{f.setTime(600001);return{result:{jobId:'late-deadline'}};});
    await assert.rejects(f.run(),/budget exhausted/);assert(f.canceled.includes('late-deadline'));
    assert(f.patches.some(p=>p.sceneEvidenceJobs?.includes('late-deadline')));assert.equal(f.patches.at(-1).runtime.status,'fail');
  });
  await t.test('host still cleans up a late reply after cancellation and clearing the active token',async()=>{
    const f=callerFixture(callerCode),reply=deferred();f.context.prepareSceneEvidence=async(p,d,io)=>io.start('start','Evidence',value=>io.register(value.jobId));f.setReply(()=>reply.promise);
    const run=f.run();await tick();assert.equal(f.started.length,1);f.cancel();await assert.rejects(run);f.context.runRef.current=null;
    reply.resolve({result:{jobId:'late-cancel'}});await tick();await tick();
    assert(f.canceled.includes('late-cancel'));assert(f.patches.some(p=>p.sceneEvidenceJobs?.includes('late-cancel')));
  });
  await t.test('expired Resume preserves prior timing and cancels saved work without starting new work',async()=>{
    const f=callerFixture(callerCode,1,true);f.setTime(600001);f.job.runtime={phases:[{name:'previous',startedAt:new Date(0).toISOString(),durationMs:1000}]};
    f.job.scenePreparations=[{request:{id:'old'},state:{phase:'roi',mediaJobId:'old-job'}}];
    await assert.rejects(f.run(),/budget exhausted/);assert.equal(f.scriptCalls.length,0);assert(f.canceled.includes('old-job'));
    assert.equal(f.patches.at(-1).runtime.phases[0].name,'previous');assert.equal(f.patches.at(-1).runtime.elapsedMs,600001);
  });
  await t.test('uncapped failure preserves preparation, while explicit cancellation still cancels with no deadline',async()=>{
    const media=mediaFixture(api,runScript),state=(await media.run()).state;media.jobs.get(state.mediaJobId).state='running';
    const f=callerFixture(callerCode);f.job.scenePreparations=[{request:media.req,state:{...state,projectId:'p'}}];
    f.context.sceneMediaStepScript=api.sceneMediaStepScript;f.context.script=async()=>{throw Error('stop before generation');};
    f.context.scriptNow=body=>runScript(body,media.sdk);
    await assert.rejects(f.run(),/stop before generation/);assert(!media.calls.some(c=>c[0]==='mediaCancel'));
    f.cancel();await assert.rejects(f.run());assert(media.calls.some(c=>c[0]==='mediaCancel'));
    assert.equal(f.patches.at(-1).scenePreparations[0].state.phase,'canceling');assert(!f.patches.at(-1).cleanup.some(c=>c.error));
    f.job.scenePreparations=f.patches.at(-1).scenePreparations;await assert.rejects(f.run());
    assert.equal(f.patches.at(-1).scenePreparations[0].state.phase,'canceled');
  });
  await t.test('missing original visual evidence fails before either AI is requested',async()=>{
    const f=callerFixture(callerCode);delete f.job.sceneStudy;
    f.context.prepareSceneEvidence=async()=>({images:[],visualEvidence:{sheets:[],journalisticMetadata:[]},limitations:['original unavailable']});
    f.context.sdk.askAI=async()=>assert.fail('No AI without original visual evidence');
    await assert.rejects(f.run(),/Original video visual evidence is unavailable/);assert.equal(f.patches.at(-1).done,false);
  });
  await t.test('structural validation permits unreviewed fast output without weakening legacy review or caption checks',()=>{
    const clip=revealFixture().plan.clips[0],result={draftId:'draft',name:clip.name,warnings:[],verifiedFrames:[]};
    const actual={owned:true,meta:{name:clip.name,durationSeconds:1,durationFrames:30,fps:30,frameSize:{width:1080,height:1920}},visualLayers:2,graphics:[{name:'HA caption 0:0',text:'\ubb38\uc774',startFrame:0,endFrame:15},{name:'HA caption 0:1',text:'\uc5f4\ub9b0\ub2e4.',startFrame:15,endFrame:30}]};
    assert.throws(()=>api.validateSceneDraft(result,actual,clip,clip.name),/preview checks/);
    assert.equal(api.validateSceneDraft(result,actual,clip,clip.name,{requireVisualReview:false}).draftId,'draft');
    const wrong=structuredClone(actual);wrong.graphics[1].text='Different dialogue';
    assert.throws(()=>api.validateSceneDraft(result,wrong,clip,clip.name,{requireVisualReview:false}),/captions do not match/);
    assert.throws(()=>api.validateSceneDraft({...result,verifiedFrames:[30]},actual,clip,clip.name,{requireVisualReview:false}),/saved-layer/);
  });
  await t.test('disabled scene captions emit no graphics and only bypass caption checks',async()=>{
    const clip=revealFixture().plan.clips[0],result={draftId:'draft',name:clip.name,warnings:[],verifiedFrames:[0]};
    const actual={owned:true,meta:{name:clip.name,durationSeconds:1,durationFrames:30,fps:30,frameSize:{width:1080,height:1920}},visualLayers:2,graphics:[]};
    const calls=[],sdk={project:()=>{calls.push('project');throw Error('Disabled captions must not read a Draft');},draft:()=>{calls.push('draft');throw Error('Disabled captions must not edit a Draft');}};
    assert.deepEqual(await runScript(api.sceneCaptionScript('project','draft',clip,{captions:{on:false}},{}),sdk),{added:0});
    assert.deepEqual(calls,[]);
    assert.equal(api.validateSceneDraft(result,actual,clip,clip.name,{captions:false}).draftId,'draft');
    for(const options of [{},{captions:true}])assert.throws(()=>api.validateSceneDraft(result,actual,clip,clip.name,options),/captions do not match/);
    assert.throws(()=>api.validateSceneDraft(result,{...actual,owned:false},clip,clip.name,{captions:false}),/saved-layer/);
  });
  function readyCaller(){
    const f=callerFixture(callerCode,0),original=revealFixture(),events=[],aiCalls=[],localFiles=new Map();delete f.job.sceneStudy;
    Object.assign(f.context,{sceneVision:api.sceneVision,startScenePreparationWorker:api.startScenePreparationWorker,createSceneMainDraft:api.createSceneMainDraft,createSceneMediaTools:api.createSceneMediaTools,enc:s=>Buffer.from(s),dec:b=>Buffer.from(b).toString(),sleep:tick});
    f.context.store={ensure:async()=>{},exists:async p=>localFiles.has(p),fs:{readFile:async p=>localFiles.get(p),writeFile:async(p,bytes)=>localFiles.set(p,bytes)}};
    const scriptNow=f.context.scriptNow;f.context.scriptNow=async(body,summary,...args)=>{if(summary==='Save foreground preparation checkpoint'){const [from,to]=JSON.parse('['+body.slice(body.indexOf('rename(')+7,body.indexOf(');return'))+']');localFiles.set(to,localFiles.get(from));localFiles.delete(from);return true;}return scriptNow(body,summary,...args);};
    const clip=structuredClone(original.plan.clips[0]);clip.name='Test 1 · Door · test';
    const result={draftId:'draft',name:clip.name,warnings:[],verifiedFrames:[0,15]};
    const actual={owned:true,meta:{name:clip.name,durationSeconds:1,durationFrames:30,fps:30,frameSize:{width:1080,height:1920}},visualLayers:2,main:[{startFrame:0,endFrame:30}],graphics:[{name:'HA caption 0:0',text:'\ubb38\uc774',startFrame:0,endFrame:15},{name:'HA caption 0:1',text:'\uc5f4\ub9b0\ub2e4.',startFrame:15,endFrame:30}]};
    const base=f.context.script;f.context.script=async(code,summary,...args)=>{events.push(summary);
      if(summary==='Read original evidence and prepared media')return{sources:[{resourceId:'a',type:'Video',name:'A.mov',path:'/a',fps:30,durationSeconds:10,sourceWords:original.words['A.mov'].map(w=>[...w,0,0,false])}],authoredDocuments:[],preparedMedia:[]};
      if(summary==='Verify builder Draft ownership')return{owned:true,meta:{name:clip.name,fps:30},main:[{clipId:1,trackId:'main',resourceId:'a'}]};if(summary==='Place planned dialogue captions')return{added:2};if(summary==='Check saved scene structure')return actual;
      if(['Record export composition','Verify exported composition'].includes(summary))return{key:'same-composition'};
      if(summary==='Check final export')return{status:'succeeded'};return base(code,summary,...args);};
    Object.assign(f.context,{sceneStudyPrompt:api.sceneStudyPrompt,sceneBuildPrompt:api.sceneBuildPrompt,parseSceneStudy:api.parseSceneStudy,validateSceneSourcePlan:api.validateSceneSourcePlan,extractJson:JSON.parse,nameOf:()=> 'Test',sceneCaptionScript:()=>'caption-script',validateSceneDraft:api.validateSceneDraft,S:{done:n=>'done '+n},setDrafts:()=>{},loadResources:()=>{}});
    f.context.sdk.call=async method=>{assert.equal(method,'getDraftMediaSnapshot');return{fps:30,durationFrames:30,clips:[{clipId:1,trackId:'main',trackKind:'main',startFrame:0,endFrame:30,sourceStartSeconds:2,sourceEndSeconds:3,playbackSpeed:1,media:{path:'/a'}}]};};
    f.context.sdk.askAI=async options=>{aiCalls.push(options);events.push(aiCalls.length===1?'plan':'build');return{text:JSON.stringify(aiCalls.length===1?original.plan:result)};};
    f.setReply(async input=>{events.push(input.summary);if(input.summary==='Export full episode'){assert.match(input.script,/resolution:'FHD'/);return{result:{workflowId:'export-job'}};}throw Error(input.summary);});
    const tpl={logo:{mode:'none'},editorial:{instructions:'FIXED TEMPLATE POLICY'},prompt:{lengthGuide:'One complete episode'},headline:{font:'Fixed font',size1:60,size2:50},captions:{bottom:1610}};
    return{...f,events,aiCalls,result,original,tpl,localFiles,run:()=>f.run(tpl)};
  }
  await t.test('two AI stages share visual evidence, implement the confirmed plan and export without a third review call',async()=>{
    const f=readyCaller();await f.run();assert.equal(f.aiCalls.length,2);assert.deepEqual(f.aiCalls[0].images,f.aiCalls[1].images);
    const context=prompt=>JSON.parse(prompt.slice(prompt.lastIndexOf('\n')+1)),planInput=context(f.aiCalls[0].prompt),buildInput=context(f.aiCalls[1].prompt);
    assert.equal(planInput.sourceEvidence[0].sourceWords.length,2);assert.equal(buildInput.sourceEvidence[0].sourceWords,undefined);
    assert.equal(buildInput.clip.beats[0].captions[1].text,'\uc5f4\ub9b0\ub2e4.');assert.deepEqual(buildInput.headlineDefaults,planInput.headlineDefaults);
    assert.match(f.aiCalls[1].prompt,/run_script/);assert.match(f.aiCalls[1].prompt,/WHOLE episode first/);assert(!f.aiCalls[1].prompt.includes('at most three primary beats'));
    assert.equal(f.aiCalls[0].timeoutMs,600000);assert.equal(f.aiCalls[1].timeoutMs,600000);assert.equal(buildInput.deadlineAt,null);assert.equal(f.patches.at(-1).runtime.status,'completed');
    for(const call of f.aiCalls)assert.equal(call.prompt.split('FIXED TEMPLATE POLICY').length-1,1);
    const built=f.patches.find(p=>p.built)?.built[0];assert.equal(built.reframeState,'skipped');assert.equal(built.compositionKey,'same-composition');assert.equal(built.review.status,'pending');assert.equal(built.review.fullPlayback,false);assert.equal(built.review.audio,false);assert.deepEqual(built.review.frames,[]);
    assert.equal(f.patches.at(-1).done,true);assert(f.events.indexOf('build')<f.events.indexOf('Place planned dialogue captions'));assert(f.events.includes('Verify exported composition'));
  });
  await t.test('scene usage persists before parsing and retains failed calls without extra AI requests',async()=>{
    const previous={stage:'earlier',usage:{input_tokens:10,output_tokens:2}},usage=[{input_tokens:100,output_tokens:20},{input_tokens:300,output_tokens:40}];
    for(const outcome of ['success','invalid-json','unavailable']){
      const f=readyCaller(),ask=f.context.sdk.askAI;let calls=0;
      f.job.sharedUsageCalls=[structuredClone(previous)];
      f.context.sdk.askAI=async request=>{
        const index=calls++;
        if(outcome==='unavailable'&&index===1)throw Error('Provider unavailable');
        const response=await ask(request);
        return{...response,usage:usage[index],...(outcome==='invalid-json'&&index===1?{text:'invalid JSON'}:{})};
      };
      if(outcome==='success')await f.run();else await assert.rejects(f.run(),outcome==='unavailable'?/Provider unavailable/:/JSON/);
      assert.equal(calls,2,outcome);
      const snapshots=f.patches.filter(p=>p.sharedUsageCalls).map(p=>p.sharedUsageCalls);
      assert.deepEqual(snapshots[0],[previous,{stage:'scene-plan',usage:null}]);
      assert.deepEqual(snapshots.at(-1),[previous,{stage:'scene-plan',usage:usage[0]},{stage:'scene-build',usage:outcome==='unavailable'?null:usage[1]}]);
      if(outcome!=='success')assert(!f.events.includes('Export full episode'));
    }
  });
  await t.test('Resume restarts terminal exports and reuses live or completed exports',async()=>{
    for(const status of ['failed','canceled','running','succeeded']){
      const f=readyCaller(),read=f.context.script,terminal=['failed','canceled'].includes(status),savedId='saved-export';
      f.job.sceneStudy=structuredClone(f.original.plan);f.job.sceneStudy.clips[0].name=f.result.name;
      f.job.scenePending={clipIndex:0,...f.result};
      f.job.sceneExport={clipIndex:0,draftId:'draft',workflowId:savedId,outPath:'/test/.selects/plugin-data/shortform-clips/scene-runs/test/0/video.mp4',compositionKey:'same-composition',status:'running'};
      f.context.sdk.askAI=async()=>assert.fail('Resume must retain the confirmed plan and saved Draft');
      let checks=0,polls=0;
      f.context.script=async(code,summary,...args)=>{
        if(summary==='Check saved export'){checks++;assert.ok(code.includes(JSON.stringify(savedId)));return{status};}
        if(summary==='Check final export'){polls++;assert.ok(code.includes(JSON.stringify(terminal?'export-job':savedId)));return{status:status==='running'&&polls===1?'running':'succeeded'};}
        return read(code,summary,...args);
      };
      await f.run();
      assert.equal(checks,1,status);assert.equal(f.started.filter(call=>call.summary==='Export full episode').length,terminal?1:0,status);
      assert.equal(polls,status==='running'?2:1,status);assert.equal(f.aiCalls.length,0,status);
      const saved=f.patches.filter(p=>p.sceneExport).at(-1).sceneExport;
      assert.equal(saved.workflowId,terminal?'export-job':savedId,status);assert.equal(saved.status,'succeeded',status);
      assert.equal(f.patches.at(-1).done,true,status);
    }
  });
  await t.test('saved Main source identity, exact selection and speed are checked before captions or export',async()=>{
    for(const change of [s=>s.clips[0].media.path='/other.mov',s=>{s.clips[0].sourceStartSeconds=4;s.clips[0].sourceEndSeconds=5;},s=>s.clips[0].playbackSpeed=2]){
      const f=readyCaller(),read=f.context.sdk.call;f.context.sdk.call=async(...args)=>{const snapshot=await read(...args);change(snapshot);return snapshot;};
      await assert.rejects(f.run(),/Saved source plan mismatch/);assert(!f.events.includes('Place planned dialogue captions'));assert(!f.events.includes('Export full episode'));assert.equal(f.patches.at(-1).done,false);
    }
    const f=readyCaller(),read=f.context.script;f.context.script=async(code,summary,...args)=>summary==='Verify builder Draft ownership'?{owned:false}:read(code,summary,...args);
    f.context.sdk.call=async()=>assert.fail('Unowned Draft must not be inspected or mutated');await assert.rejects(f.run(),/ownership/);assert(!f.events.includes('Place planned dialogue captions'));
  });
  await t.test('Resume rebuilds an invalid saved Draft from the confirmed plan and validation feedback',async()=>{
    for(const fault of ['source','warnings','name']){
      const f=readyCaller(),read=f.context.sdk.call,validResult=structuredClone(f.result);
      if(fault==='source')f.context.sdk.call=async(...args)=>{const snapshot=await read(...args);snapshot.clips[0].media.path='/wrong-source.mov';return snapshot;};
      if(fault==='warnings')delete f.result.warnings;
      if(fault==='name')f.result.name='Wrong saved name';
      await assert.rejects(f.run(),fault==='source'?/Saved source plan mismatch/:/saved-layer/);
      assert.equal(f.aiCalls.length,2,fault);assert(!f.events.includes('Export full episode'));
      assert(f.patches.some(p=>p.scenePending?.draftId==='draft'));
      const saved=Object.assign({},f.job,...f.patches);
      assert.equal(saved.scenePending,null,fault);assert.equal(typeof saved.sceneValidationError,'string');assert.ok(saved.sceneValidationError.length>0);
      const confirmed=structuredClone(saved.sceneStudy),error=saved.sceneValidationError;
      Object.assign(f.job,structuredClone(saved));f.context.sdk.call=read;Object.assign(f.result,validResult);
      await f.run();
      assert.equal(f.aiCalls.length,3,fault);
      const request=f.aiCalls.at(-1),input=JSON.parse(request.prompt.slice(request.prompt.lastIndexOf('\n')+1));
      assert.equal(input.draftName,validResult.name);assert.equal(input.validationError,error);
      assert.deepEqual(input.clip,confirmed.clips[0]);
      assert.equal(f.patches.at(-1).done,true,fault);
    }
  });
  await t.test('the full two-AI caller supplies the channel guide alongside original evidence',async()=>{
    const f=readyCaller(),image='data:image/jpeg;base64,'+fs.readFileSync(path.join(__dirname,'../template-packs/hankook-ilbo/assets/huick-alpha-visual-guide.jpg')).toString('base64');
    f.tpl.editorial.mode='scenes';f.tpl.editorial.visualGuide={image,description:'Channel composition reference'};
    await f.run();assert.equal(f.aiCalls.length,2);
    for(const call of f.aiCalls){
      assert.deepEqual(call.images.map(item=>item.name),['original-video','original-images','template-visual-guide']);
      assert.equal(call.images[2].dataUrl,image);assert(!call.prompt.includes(image));
      assert.equal(JSON.parse(call.prompt.slice(call.prompt.lastIndexOf('\n')+1)).visualGuide.description,'Channel composition reference');
    }
    assert.equal(f.patches.at(-1).done,true);
  });
  await t.test('empty, partial and complete episode briefs reach both AI stages without changing template defaults',async()=>{
    for(const brief of ['', 'Keep the supplied teacher role.', 'Use the supplied classroom concept and roles; show the calendar on the date mention.']){
      const f=readyCaller();f.job.note=brief;const before=structuredClone(f.tpl);await f.run();
      assert.equal(f.aiCalls.length,2);
      for(const call of f.aiCalls){
        const input=JSON.parse(call.prompt.slice(call.prompt.lastIndexOf('\n')+1));
        assert.equal(input.brief,brief);
        assert.match(call.prompt,/explicit requirement overrides the corresponding template default only/);
        assert.match(call.prompt,/brief can be partial or empty/);
        assert.match(call.prompt,/propose a concept when none is supplied/);
        assert.equal(call.prompt.split(f.tpl.editorial.instructions).length-1,1);
      }
      assert.match(f.aiCalls[0].prompt,/Use captionDefaults.bottom for captionBottom unless the brief explicitly requests another placement/);
      assert.match(f.aiCalls[1].prompt,/implement the confirmed plan without reopening its concept or timing decisions/);
      assert.deepEqual(f.tpl,before);
    }
  });
  await t.test('source validation accepts frame rounding and silent action while rejecting wrong resource IDs',()=>{
    const fps=30000/1001,clip={name:'Action',beats:[{resourceName:'original',kind:'action',startSeconds:2.001,endSeconds:3.009}]},sources=[{name:'original',resourceId:'r8',path:'/original.mov',fps}],start=Math.round(2.001*fps)/fps,end=Math.round(3.009*fps)/fps,length=Math.round((end-start)*30);
    const snapshot={fps:30,durationFrames:length,clips:[{clipId:1,trackId:'main',trackKind:'main',startFrame:0,endFrame:length,sourceStartSeconds:start,sourceEndSeconds:end,playbackSpeed:1,media:{path:'/original.mov'}}]},saved={owned:true,meta:{name:'Action',fps:30},main:[{clipId:1,trackId:'main',resourceId:'r8'}]};
    assert.equal(api.validateSceneSourcePlan(snapshot,saved,clip,sources),snapshot);saved.main[0].resourceId='r9';assert.throws(()=>api.validateSceneSourcePlan(snapshot,saved,clip,sources),/source identity/);
  });
  await t.test('builder timeout preserves the confirmed plan and never exports or starts another AI turn',async()=>{
    const f=readyCaller(),ask=f.context.sdk.askAI;let n=0;f.context.sdk.askAI=async o=>{if(++n===2){f.setTime(510000);throw Error('Selects AI did not finish within 360000ms.');}return ask(o);};
    await assert.rejects(f.run(),/Selects AI did not finish/);assert.equal(n,2);assert(f.patches.some(p=>p.sceneStudy));assert(!f.events.includes('Export full episode'));assert.equal(f.patches.at(-1).done,false);
  });
  await t.test('the actual builder runs shared preparation concurrently and preserves its native job on AI timeout',async()=>{
    const f=readyCaller(),ask=f.context.sdk.askAI,scriptNow=f.context.scriptNow,req={id:'foreground',resourceName:'A.mov',startSeconds:2,endSeconds:3,cutout:{mode:'person',crop:{x:0,y:0,width:100,height:100}}};let n=0,steps=0;
    f.context.scriptNow=async(body,summary,...args)=>{
      if(summary==='Prepare requested foreground'){const input=JSON.parse(body);assert.equal(input.action,undefined);steps++;return{state:{projectId:'p',signature:JSON.stringify(input.request),phase:'native',workflowId:'same-native'}};}
      return scriptNow(body,summary,...args);
    };
    f.context.sdk.askAI=async options=>{
      if(++n===1)return ask(options);
      const input=JSON.parse(options.prompt.slice(options.prompt.lastIndexOf('\n')+1));
      assert.equal(input.preparation.requestsPath,'/test/.selects/plugin-data/shortform-clips/scene-runs/test/0/prep-requests.json');
      assert(f.localFiles.has(input.mediaToolsPath));assert(!options.prompt.includes('async function createSceneMediaTools('));
      f.localFiles.set(input.preparation.requestsPath,Buffer.from(JSON.stringify([req])));
      for(let i=0;i<100&&!f.patches.some(p=>p.scenePreparations?.some(e=>e.state?.workflowId==='same-native'));i++)await tick();
      assert(steps>0);throw Error('Selects AI did not finish within 600000ms.');
    };
    await assert.rejects(f.run(),/Selects AI did not finish/);
    const preparation=f.patches.at(-1).scenePreparations[0];assert.equal(preparation.state.workflowId,'same-native');assert.equal(preparation.state.phase,'native');
    assert.equal(f.canceled.length,0);assert.equal(n,2);assert(!f.events.includes('Export full episode'));
    const before=steps;await tick();await tick();assert.equal(steps,before);
  });
  await t.test('an incomplete builder response is checkpoint evidence, never successful output or automatic continuation',async()=>{
    const f=readyCaller(),ask=f.context.sdk.askAI;let n=0;f.context.sdk.askAI=async o=>++n===2?{text:JSON.stringify({status:'in_progress',draftId:'partial',nextStep:'missing closing'})}:ask(o);
    await assert.rejects(f.run(),/missing closing/);assert.equal(n,2);assert(f.patches.some(p=>p.sceneBuildAttempt?.draftId==='partial'));assert(!f.events.includes('Export full episode'));
  });
  await t.test('a late builder response after cancellation is saved as evidence but cannot trigger captions or export',async()=>{
    const f=readyCaller(),ask=f.context.sdk.askAI,reply=deferred();let n=0;f.context.sdk.askAI=async o=>++n===2?reply.promise:ask(o);
    const run=f.run();await tick();f.cancel();await assert.rejects(run);reply.resolve({text:JSON.stringify(f.result)});await tick();await tick();
    assert(f.patches.some(p=>p.sceneBuildAttempt?.draftId==='draft'));assert(!f.patches.some(p=>p.scenePending));assert(!f.events.includes('Place planned dialogue captions'));assert(!f.events.includes('Export full episode'));
  });
  await t.test('one deadline covers planning and host completion, including caption time',()=>{
    let now=1000;const budget=api.createSceneBudget(1000,600000,()=>now);
    budget.phase('planning');assert.equal(budget.aiTimeoutMs(210000),390000);
    now+=390000;assert.throws(()=>budget.aiTimeoutMs(210000),e=>e.code==='SCENE_BUDGET_EXCEEDED');
    budget.phase('composition');now+=100000;budget.phase('captions');now+=40000;budget.phase('export');now+=70001;
    assert.throws(()=>budget.assertTime(),e=>e.code==='SCENE_BUDGET_EXCEEDED');
    const report=budget.complete();assert.equal(report.status,'fail');assert.equal(report.elapsedMs,600001);
    assert.deepEqual(report.phases.map(x=>[x.name,x.durationMs]),[['planning',390000],['composition',100000],['captions',40000],['export',70001]]);
    assert.throws(()=>budget.phase('another'));assert.deepEqual(budget.complete(),report);
  });
  await t.test('unbounded generation retains elapsed time beyond ten minutes without reporting a speed pass',()=>{
    let now=0;const budget=api.createSceneBudget(0,null,()=>now);budget.phase('planning');now=650000;budget.assertTime();assert.equal(budget.aiTimeoutMs(390000),600000);budget.phase('composition');now=1300000;
    const report=budget.complete();assert.equal(report.status,'completed');assert.equal(report.elapsedMs,1300000);assert.equal(report.maxMs,null);assert.equal(report.deadlineAt,null);assert.equal(report.remainingMs,null);assert.equal(JSON.parse(JSON.stringify(report)).elapsedMs,1300000);
  });
  await t.test('planner context and template instructions remain distinct and immutable',()=>{
    for(const instructions of ['Template A: observe the actor.','Template B: use evidence first.']){
      const input={instructions,brief:'Original language',sourceWords:{camera:[[2,3,'\uc6d0\ubb38']]},preparedMedia:[],headlineDefaults:{font:'Font A'}};
      const before=structuredClone(input),prompt=api.sceneLayerPrompt(input);
      assert.equal(prompt.split(instructions).length-1,1);
      assert.deepEqual(JSON.parse(prompt.slice(prompt.lastIndexOf('\n')+1)),{brief:input.brief,sourceWords:input.sourceWords,preparedMedia:[],headlineDefaults:input.headlineDefaults});
      assert.deepEqual(input,before);
    }
  });
  await t.test('verified embedded image metadata reaches the planner and persisted preflight by exact identity',async()=>{
    const f=callerFixture(callerCode,0);delete f.job.sceneStudy;
    const metadata={resourceId:'photo',path:'/photo.jpg',status:'read',fields:[{field:'caption',value:'Original descriptive evidence'}]},prior=f.context.script;
    f.context.script=async(code,summary)=>{const value=await prior(code,summary);if(summary==='Read original evidence and prepared media')value.sources.push({type:'Image',name:'photo.jpg',resourceId:'photo',path:'/photo.jpg'},{type:'Image',name:'another.jpg',resourceId:'another',path:'/photo.jpg'});return value;};
    f.context.prepareSceneEvidence=async()=>({images:[{name:'original-video'}],visualEvidence:{sheets:[],journalisticMetadata:[metadata]},limitations:[]});
    f.context.sceneStudyPrompt=api.sceneStudyPrompt;f.context.sceneVision=api.sceneVision;let input;
    f.context.sdk.askAI=async options=>{input=JSON.parse(options.prompt.slice(options.prompt.lastIndexOf('\n')+1));throw Error('captured planner input');};
    await assert.rejects(f.run({logo:{mode:'none'},editorial:{instructions:'Policy'},prompt:{}}),/captured planner input/);
    assert.deepEqual(input.sourceEvidence.find(x=>x.resourceId==='photo').journalisticMetadata,metadata);
    assert.equal(input.sourceEvidence.find(x=>x.resourceId==='another').journalisticMetadata,undefined);
    assert(f.patches.some(p=>p.scenePreflight?.sources.some(s=>s.journalisticMetadata?.fields[0].value==='Original descriptive evidence')));
  });
  await t.test('actual planner input excludes legacy windows and matches rendered logo/headline centers',async()=>{
    for(const layout of [undefined,{windowTop:760,windowBottom:1720,sourceTop:120,sourceBottom:1000,offsetX:90,reframe:true,splitHalves:true,logoCenter:0,headlineCenter:245}]){
      const f=callerFixture(callerCode,0),render=renderFixture(api,runScript);delete f.job.sceneStudy;
      const tpl={...render.tpl,layout,editorial:{instructions:'Template policy'},prompt:{lengthGuide:'One episode'},logo:{...render.tpl.logo,image:'configured-image',imageName:'Channel logo'}};
      let input,prompt;f.context.sceneStudyPrompt=api.sceneStudyPrompt;f.context.sceneVision=api.sceneVision;
      f.context.sdk.askAI=async options=>{prompt=options.prompt;input=JSON.parse(prompt.slice(prompt.lastIndexOf('\n')+1));throw Error('captured planner input');};
      await assert.rejects(f.run(tpl),/captured planner input/);
      assert.deepEqual(input.layoutDefaults,{logoCenter:layout?.logoCenter??120,headlineCenter:layout?.headlineCenter??300});
      assert.deepEqual(input.brandLogo,{provided:true,name:'Channel logo',width:500});
      for(const key of ['windowTop','windowBottom','sourceTop','sourceBottom','offsetX','reframe','splitHalves'])assert(!Object.hasOwn(input.layoutDefaults,key));
      assert.match(prompt,/1080x1920/);assert.match(prompt,/attached original-video/);assert.match(prompt,/tile-to-file mapping/);
      assert(!prompt.includes('Same information continuing across a reaction'));
      Object.assign(render.tpl,tpl);await render.run();
      const logo=render.calls.find(c=>c[0]==='transform'&&c[1].clip.resourceId==='logo')[1];
      assert.equal(logo.position.y,(960-input.layoutDefaults.logoCenter)/19.2);
      const headline=render.graphics.find(g=>g.name==='Headline 1');
      const placement=render.calls.find(c=>c[0]==='transform'&&c[1].clip.clipId===headline.clip.clipId)[1];
      assert.equal(placement.position.y,(960-(input.layoutDefaults.headlineCenter-tpl.headline.size1/2))/19.2);
    }
  });
  await t.test('layer validation preserves valid source choices and rejects uninspected or out-of-range media',()=>{
    const f=renderFixture(api,runScript),study={clips:[f.clip]};f.clip.beats[0].assets=['card.png'];f.clip.beats[1].assets=[];
    const before=structuredClone(study);assert.equal(api.validateSceneLayers(study,f.prepared),study);assert.deepEqual(study,before);
    for(const mutate of [x=>x.clips[0].beats[0].layers[0].endSeconds=3.1,x=>x.clips[0].beats[0].layers[0].preparedId='unknown',x=>x.clips[0].beats[0].layers[2].resourceName='uninspected.png',x=>x.clips[0].beats[0].layers[2].name='actor']){
      const copy=structuredClone(study);mutate(copy);assert.throws(()=>api.validateSceneLayers(copy,f.prepared));
    }
  });
  await t.test('prepared handles stay in composition and invalid asset references identify the offending asset without repair',()=>{
    const f=revealFixture();f.plan.sourceReview[0].observed+=' Prepared head shows the chosen face.';f.plan.clips[0].beats[0].composition+=' Use prepared:head or request a supported original crop.';
    assert.equal(api.parseSceneStudy(f.plan,f.inventory,1,f.words),f.plan);
    const invalid=structuredClone(f.plan);invalid.assetReview=[{resourceName:'prepared:head · matte · A.mov',role:'actor',observed:'A prepared head'}];
    const before=JSON.stringify(invalid);assert.throws(()=>api.parseSceneStudy(invalid,f.inventory,1,f.words),/Invalid asset review prepared:head · matte · A.mov:/);assert.equal(JSON.stringify(invalid),before);
    const invalidBeat=structuredClone(f.plan);invalidBeat.clips[0].beats[0].assets=['prepared:head'];assert.throws(()=>api.parseSceneStudy(invalidBeat,f.inventory,1,f.words),/clip 1 beat 1/);
  });
  await t.test('bounded planner contracts preserve asset namespaces, processing choices, fixed brand and editor-only metadata',()=>{
    const prompt=api.sceneStudyPrompt({bounded:true,instructions:'Channel-owned style',brandLogo:{provided:true,name:'Configured logo',width:1080}});
    assert.match(prompt,/exact ORIGINAL inventory names only/);assert.match(prompt,/preparedMedia\[\]\.id is an implementation handle/);
    assert.match(prompt,/supported crop, alpha\/occlusion and selected-interval matte processing/);assert.match(prompt,/fixed template logo that the builder receives exactly/);
    assert.match(prompt,/inspection limitations are editor-only metadata/);assert.match(api.sceneBuildPrompt({bounded:true,instructions:'Channel-owned style'}),/render only the viewer-facing wording explicitly planned/);
    assert.match(prompt,/leaving scene-specific pixel dimensions, coordinates, movement distances, crop rectangles and mask implementation to the builder/);
    assert.match(prompt,/put inspection limitations and evidence observations in sourceReview or assetReview/);
    assert.match(prompt,/Preserve numerical settings supplied by the template and explicit user requirements/);
    const builder=api.sceneBuildPrompt({bounded:true,instructions:'Channel-owned style'});
    assert.match(builder,/you determine scene-specific pixel dimensions/);
    assert.match(builder,/not in another planning response or approval stage/);
    assert.match(builder,/source ranges, caption wording\/timing and visual reveal timing/);
    assert.equal(prompt.split('Channel-owned style').length-1,1);
  });
  await t.test('caption grouping is preserved while unsupported disclosure tokens remain invalid',async()=>{
    const f=revealFixture(),before=JSON.stringify(f.plan),visual=structuredClone(f.plan);
    visual.clips[0].beats[0].disclosures[0].token='\ubb38 \uc5f4\ub9bc';
    assert.throws(()=>api.parseSceneStudy(visual,f.inventory,1,f.words),/caption token is unsupported/);
    const early=structuredClone(f.plan);early.clips[0].beats[0].captions=[{startSeconds:2,endSeconds:3,text:'\ubb38\uc774 \uc5f4\ub9b0\ub2e4.'}];
    const beforeEarly=JSON.stringify(early);assert.equal(api.parseSceneStudy(early,f.inventory,1,f.words),early);assert.equal(JSON.stringify(early),beforeEarly);
    const render=renderFixture(api,runScript);Object.assign(render.clip,early.clips[0]);render.tpl.captions={mode:'box',bottom:1610,fontSize:54};
    const made=await render.run();await runScript(api.sceneCaptionScript('p',made.draftId,render.clip,render.tpl,{editable:{caption:'Text',size:'Size',font:'Font'}}),render.sdk);
    const captions=render.graphics.filter(g=>g.name.startsWith('HA caption '));assert.deepEqual(captions.map(g=>[g.clip.startFrame,g.clip.endFrame,g.parameters.text]),[[0,30,'\ubb38\uc774 \uc5f4\ub9b0\ub2e4.']]);
    assert.equal(JSON.stringify(early),beforeEarly);
    assert.equal(JSON.stringify(f.plan),before);
  });
  await t.test('joint source-clock plan renders the split caption and its independent label at the spoken reveal',async()=>{
    const f=revealFixture();assert.equal(api.parseSceneStudy(f.plan,f.inventory,1,f.words),f.plan);assert.equal(api.validateSceneLayers(f.plan,[]),f.plan);
    const empty=structuredClone(f.plan);empty.clips[0].beats[0].disclosures=[];
    assert.equal(api.parseSceneStudy(empty,f.inventory,1,f.words),empty);assert.equal(api.validateSceneLayers(empty,[]),empty);
    const render=renderFixture(api,runScript);Object.assign(render.clip,f.plan.clips[0]);render.tpl.captions={mode:'box',bottom:1490,fontSize:54,font:'Caption font'};
    const made=await render.run();await runScript(api.sceneCaptionScript('p',made.draftId,render.clip,render.tpl,{editable:{caption:'Text',size:'Size',font:'Font'}}),render.sdk);
    const label=render.graphics.find(g=>g.name==='Door label'),captions=render.graphics.filter(g=>g.name.startsWith('HA caption '));
    assert.deepEqual(captions.map(g=>[g.clip.startFrame,g.clip.endFrame,g.parameters.text]),[[0,15,'\ubb38\uc774'],[15,30,'\uc5f4\ub9b0\ub2e4.']]);
    assert.deepEqual([label.clip.startFrame,label.clip.endFrame,label.parameters.body],[15,30,'\ubb38 \uc5f4\ub9bc']);
  });
  await t.test('renderer preserves source FPS, prepared offsets and ordered silent editable overlays',async()=>{
    const f=renderFixture(api,runScript),before=JSON.stringify([f.clip,f.tpl,f.prepared]);const result=await f.run();
    assert.equal(result.draftId,'draft-id');assert.deepEqual(result.verifiedFrames,[]);assert.equal(JSON.stringify([f.clip,f.tpl,f.prepared]),before);
    assert.equal(f.calls.filter(x=>x[0]==='main').length,2);assert(f.calls.filter(x=>x[0]==='media').every(x=>x[1].withSound===false));
    const actor=f.calls.find(x=>x[0]==='media'&&x[1].resource.id==='head')[1];assert.deepEqual(actor.over,{a:6,b:24});assert(Math.abs(actor.sourceStartSeconds-.2)<1e-9);
    assert.equal(f.calls.find(x=>x[0]==='media'&&x[1].resource.id==='card')[1].sourceStartSeconds,0);
    const grade=f.calls.filter(x=>x[0]==='adjust');assert.equal(grade.length,1);assert.equal(grade[0][1].presetId,'basic-adjust');assert.equal(grade[0][1].clip.resourceId,'head');assert.deepEqual(grade[0][1].parameters,{tint:12,contrast:20,saturation:15});
    assert.deepEqual(f.calls.filter(x=>['media','graphic'].includes(x[0])).map(x=>x[0]==='media'?x[1].resource.id:x[1].label),['Scene background','head','label','card','square','logo','Headline 1','Headline 2']);
    const evidence=JSON.parse(f.store.get('/work/scene-execution.json').toString());assert.equal(evidence.sourceRanges[1].sourceFps,24);assert.equal(evidence.sourceRanges[1].timelineEndFrame,60);
    const count=f.calls.length;assert.equal((await f.run()).reused,true);assert.equal(f.calls.length,count);
    f.clip.headline1='changed';await assert.rejects(f.run(),/Existing Draft/);
  });
  await t.test('unchanged scene geometry inherits template typography and color while explicit overrides remain exact',async()=>{
    for(const style of [{font:'Font A',size2:44,color2:'#123456',italic:false,strokeOn:false,strokeWidth:2,strokeColor:'#ABCDEF',weight:500},{font:'Font B',size2:68,color2:'#FEDCBA',italic:true,strokeOn:true,strokeWidth:8,strokeColor:'#112233',weight:900}]){
      const f=renderFixture(api,runScript),label=f.clip.beats[0].layers[1];delete label.fontSize;delete label.color;
      f.clip.beats[0].assets=['card.png'];f.clip.beats[1].assets=[];Object.assign(f.tpl.headline,style);f.tpl.captions={fontWeight:style.weight};
      const before=JSON.stringify(f.clip);assert.equal(api.validateSceneLayers({clips:[f.clip]},f.prepared).clips[0],f.clip);await f.run();assert.equal(JSON.stringify(f.clip),before);
      const graphic=f.graphics.find(g=>g.name==='label'),transform=f.calls.find(c=>c[0]==='transform'&&c[1].clip.clipId===graphic.clip.clipId)[1];
      assert.equal(graphic.parameters.fontFamily,style.font);assert.equal(graphic.parameters.fontWeight,String(style.weight));assert.equal(graphic.parameters.color,style.color2);assert.equal(graphic.parameters.italic,style.italic);
      assert(Math.abs(graphic.parameters.fontSize*transform.scale.x-style.size2)<1e-9);assert(Math.abs(graphic.parameters.strokeWidth*transform.scale.x-(style.strokeOn?style.strokeWidth:0))<1e-9);assert.equal(graphic.parameters.strokeColor,style.strokeColor);
      assert.deepEqual([graphic.clip.startFrame,graphic.clip.endFrame],[0,30]);
    }
    const explicit=renderFixture(api,runScript),label=explicit.clip.beats[0].layers[1];Object.assign(label,{fontSize:72,fontWeight:600,color:'#FF00AA'});await explicit.run();
    const graphic=explicit.graphics.find(g=>g.name==='label'),scale=explicit.calls.find(c=>c[0]==='transform'&&c[1].clip.clipId===graphic.clip.clipId)[1].scale.x;
    assert(Math.abs(graphic.parameters.fontSize*scale-72)<1e-9);assert.equal(graphic.parameters.fontWeight,'600');assert.equal(graphic.parameters.color,'#FF00AA');
    const bad=revealFixture();bad.plan.clips[0].beats[0].layers[0].fontSize=0;assert.throws(()=>api.validateSceneLayers(bad.plan,[]),/body and size/);
  });
  await t.test('renderer refuses invalid source, layout and color requests before creating a Draft',async()=>{
    const failures=[g=>g.clip.beats[0].layers[1].fontSize=0,g=>g.prepared[0].path='/wrong',g=>g.prepared[0].fps=24,g=>g.clip.beats[0].layers[0].endSeconds=3.2,g=>g.clip.beats[0].layers[0].crop=[0,0,10,10],g=>g.clip.beats[0].layers[0].fit='cover',g=>g.clip.beats[0].layers[0].opacity=2,g=>g.clip.beats[0].layers[1].name='actor',g=>g.catalog.push({...g.catalog[0]}),g=>g.prepared[0].sourceStartFrame=67,g=>g.tpl.background.mode='image',g=>g.tpl.logo.width=0,g=>g.tpl.logo.width='500',g=>g.tpl.layout.logoCenter=NaN,g=>g.clip.beats[0].layers[0].adjust.tint=101,g=>g.clip.beats[0].layers[0].adjust.saturation='15',g=>g.clip.beats[0].layers[0].adjust.temperature=5,g=>g.clip.beats[0].layers[1].adjust={tint:1}];
    for(const mutate of failures){const f=renderFixture(api,runScript);mutate(f);await assert.rejects(f.run());assert.equal(f.calls.filter(x=>x[0]==='create').length,0);}
  });
  await t.test('the actual host caller adds timed dialogue captions after scene commit',async()=>{
    const f=renderFixture(api,runScript);
    f.clip.beats[0].captions=[{startSeconds:2,endSeconds:2.5,text:'\uccab\uc9f8'},{startSeconds:2.5,endSeconds:3,text:'\ub458\uc9f8'}];
    f.clip.beats[1].captions=[{startSeconds:1,endSeconds:2,text:'\ub9c8\uc9c0\ub9c9'}];
    f.tpl.captions={mode:'box',bottom:1490,barHeight:150,fontSize:54,fontWeight:700,font:'Caption font',boxColor:'#000000',color:'#FFFFFF'};
    const start=source.indexOf('        await execute(sceneCaptionScript',source.indexOf('  async function runLayerScenes('));
    const end=source.indexOf('        const actual=await execute(',start);assert(start>0&&end>start);
    const result=await f.run(),events=[];
    const execute=async(body,title,commit)=>{events.push(['execute',title,commit]);return runScript(body,f.sdk);};
    const caller=esbuild.transformSync('async function call(api,execute,result,clip,tpl){const {sceneCaptionScript}=api,projectId="p",S={editable:{caption:"Text",size:"Size",font:"Font"}};'+source.slice(start,end)+'}',{loader:'ts'}).code;
    await new Function(caller+';return call;')()(api,execute,result,f.clip,f.tpl);
    assert.deepEqual(events.map(e=>e[0]),['execute']);
    const captions=f.graphics.filter(g=>g.name.startsWith('HA caption '));assert.equal(captions.length,3);
    assert.deepEqual(captions.map(g=>[g.clip.startFrame,g.clip.endFrame,g.parameters.text,g.parameters.bottom]),[[0,15,'\uccab\uc9f8',1490],[15,30,'\ub458\uc9f8',1490],[30,60,'\ub9c8\uc9c0\ub9c9',1490]]);
    assert.equal(f.calls.filter(c=>c[0]==='commit').length,2);
  });
  await t.test('cold person and head preparation use a zero-origin CFR native input and verified silent media',async()=>{
    for(const mode of ['head','person']){const f=mediaFixture(api,runScript,mode);let state;
      for(let i=0;i<30;i++){const r=await f.run(state);state=r.state;if(r.done)break;}
      assert.equal(state.phase,'done');assert.deepEqual([state.descriptor.fps,state.descriptor.sourceStartFrame,state.descriptor.sourceEndFrame],[30,60,63]);assert.equal(state.descriptor.width,mode==='head'?600:1100);assert.equal(state.descriptor.verifiedFrameCount,3);
      const native=f.calls.find(c=>c[0]==='nativeSubmit')[1];assert.deepEqual(native.sourceRange,{startSeconds:0,endSeconds:.1});assert.equal(native.task,'person.matte');assert.equal(native.options.outputMode,'alpha-frames');
      assert(f.calls.filter(c=>c[0]==='ffmpeg').every(c=>c[1].args.includes('-an')));assert.equal(f.calls.filter(c=>c[0]==='ffmpeg').length,2);
    }
  });
  await t.test('legacy foreground native import resolves UUID to the current short ID by exact receipt despite foreign imports and retry',async()=>{
    const f=mediaFixture(api,runScript,'person');let state;
    for(let i=0;i<30;i++){state=(await f.run(state)).state;if(state.phase==='native')break;}
    assert.equal(state.phase,'native');state.nativeInput.options.outputMode='foreground-video';
    f.imported('/artifacts/foreign/foreground.mov');f.receipts.set('/artifacts/foreign/receipt.json',Buffer.from(JSON.stringify({...f.receipt,artifactId:'foreign-artifact',resourceId:'foreign-uuid'})));
    const imported=await f.run(state),retry=await f.run(state),current=f.files.find(x=>x.path==='/artifacts/ours/foreground.mov');
    assert.match(current.resourceId,/^r\d+$/);assert.notEqual(current.resourceId,f.nativeUuid);
    assert.equal(imported.state.nativeResourceUuid,f.nativeUuid);assert.equal(imported.state.matteResourceId,current.resourceId);assert.equal(retry.state.matteResourceId,current.resourceId);
    assert.equal(f.files.filter(x=>x.path==='/artifacts/ours/foreground.mov').length,1);
    state=retry.state;for(let i=0;i<30&&state.phase!=='done';i++)state=(await f.run(state)).state;
    assert.equal(state.phase,'done');assert.equal(state.descriptor.resourceId,current.resourceId);assert.equal(state.descriptor.path,current.path);
    assert(f.calls.filter(c=>c[0]==='probe').every(c=>c[1].filePaths[0]===current.path));
  });
  await t.test('legacy foreground native import refuses ambiguous exact receipts, wrong receipt identity and altered media bytes',async()=>{
    for(const change of ['ambiguous','wrong-project','wrong-size']){
      const f=mediaFixture(api,runScript,'person');let state;
      for(let i=0;i<30;i++){state=(await f.run(state)).state;if(state.phase==='native')break;}
      assert.equal(state.phase,'native');state.nativeInput.options.outputMode='foreground-video';
      if(change==='ambiguous'){f.imported('/artifacts/duplicate/foreground.mov');f.receipts.set('/artifacts/duplicate/receipt.json',Buffer.from(JSON.stringify(f.receipt)));}
      if(change==='wrong-project')f.receipt.projectId='different-project';
      if(change==='wrong-size'){const stat=f.sdk.files.stat;f.sdk.files.stat=async p=>p==='/artifacts/ours/foreground.mov'?{size:9999,isDirectory:false}:stat(p);}
      await assert.rejects(f.run(state),/exactly one matching host receipt/);assert(!f.calls.some(c=>c[0]==='probe'));
    }
  });
  await t.test('cold preparation keeps one-frame selection, rejects crop/frame mismatches and honors expiry',async()=>{
    const one=mediaFixture(api,runScript);one.req.endSeconds=2+1/30;const a=await one.run();assert.deepEqual([a.state.sourceStartFrame,a.state.sourceEndFrame,a.state.selectedSourceStartFrame],[59,61,60]);
    const expired=mediaFixture(api,runScript);assert.equal((await expired.run(null,Date.now()-1)).state.phase,'canceled');assert.equal(expired.calls.length,0);
    const bad=mediaFixture(api,runScript);bad.req.cutout.crop.x=3800;await assert.rejects(bad.run(),/outside source/);assert.equal(bad.calls.length,0);
    const frame=mediaFixture(api,runScript);frame.setBad();let state=(await frame.run()).state;state=(await frame.run(state)).state;state=(await frame.run(state)).state;await assert.rejects(frame.run(state),/frame count mismatch/);assert(!frame.calls.some(c=>c[0]==='nativeSubmit'));
  });
  await t.test('cold preparation accepts an uncapped deadline and scopes native idempotency to project and run',async()=>{
    const f=mediaFixture(api,runScript,'person');let state;
    for(let i=0;i<30&&state?.phase!=='done';i++)state=(await f.run(state,null)).state;
    assert.equal(state.phase,'done');const input=f.calls.find(c=>c[0]==='nativeSubmit')[1];
    assert.equal(input.requestKey,'scene-matte:project::work:safe-id');assert.equal(input.sourceRange.startSeconds,0);
    assert.equal(state.descriptor.sourceStartFrame,60);assert.equal(state.descriptor.sourceEndFrame,63);
  });
  await t.test('scene runtime source compiles against installed SDK declarations before serialization',{skip:!process.env.SBS_PANEL_TEST_SDK},()=>{
    const ts=dep('typescript'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'huick-scene-sdk-check-'));
    try {
      const sdk=process.env.SBS_PANEL_TEST_SDK,ast=ts.createSourceFile('panel.tsx',source,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TSX);
      const functions=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&['createSceneMainDraft','createSceneMediaTools','sceneRuntimeScript','sceneRenderScript','sceneMediaStepScript'].includes(n.name?.text));
      assert.equal(functions.length,5);
      const scriptFiles=functions.map(node=>{const file=path.join(dir,node.name.text+'.ts');fs.writeFileSync(file,node.getText(ast));return file;});
      const roots=[...scriptFiles,...fs.readdirSync(sdk).filter(n=>n.endsWith('.d.ts')).map(n=>path.join(sdk,n))];
      const program=ts.createProgram(roots,{target:ts.ScriptTarget.ES2022,noEmit:true,skipLibCheck:true});
      const errors=ts.getPreEmitDiagnostics(program).filter(d=>scriptFiles.includes(d.file?.fileName));
      assert.deepEqual(errors.map(d=>path.basename(d.file.fileName)+': '+ts.flattenDiagnosticMessageText(d.messageText,' ')),[]);
    } finally {fs.rmSync(dir,{recursive:true,force:true});}
  });
  await t.test('scripts returned by the compiled production API pass the host TypeScript boundary',{skip:!process.env.SBS_PANEL_TEST_SDK},async t=>{
    const ts=dep('typescript'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'huick-generated-sdk-check-'));
    try{
      const render=renderFixture(api,runScript),media=mediaFixture(api,runScript),sdk=process.env.SBS_PANEL_TEST_SDK;
      const scripts={preflight:api.scenePreflightScript({projectId:'p',sourceName:'A.mov',sceneRunsDirectory:'/scene-runs'}),logo:api.sceneLogoPreparationScript({projectId:'p',directory:'/work',imageBase64:'iVBORw0KGgo='}),media:api.sceneMediaStepScript('p',media.req,null,'/work',Date.now()+600000),renderer:api.sceneRenderScript('p',render.clip,render.tpl,render.prepared,'/work',{})};
      const prompt=api.sceneBuildPrompt({bounded:true,instructions:'Channel style'}),start=prompt.indexOf('async function createSceneMediaTools('),end=prompt.indexOf('\nInitialize after',start);
      assert(start>=0&&end>start);
      scripts.sharedMediaTools=prompt.slice(start,end)+'\nconst tools=await createSceneMediaTools(selects,selects.project("p"),selects.draft("d"),[]);return tools;';
      const mainStart=prompt.indexOf('async function createSceneMainDraft(');assert(mainStart>=0&&mainStart<start);
      scripts.mainInitialization=prompt.slice(mainStart,end)+'\nreturn await createSceneMainDraft(selects,"p",{name:"Draft",beats:[{resourceName:"A.mov",startSeconds:1,endSeconds:2}]},[{name:"A.mov",resourceId:"r1",path:"/A.mov",fps:30}],null);';
      const scriptFiles=Object.entries(scripts).map(([name,body])=>{const file=path.join(dir,name+'.ts');fs.writeFileSync(file,'async function check_'+name+'(){\n'+body+'\n}');return file;});
      const roots=[...scriptFiles,...fs.readdirSync(sdk).filter(n=>n.endsWith('.d.ts')).map(n=>path.join(sdk,n))];
      const program=ts.createProgram(roots,{target:ts.ScriptTarget.ES2022,noEmit:true,skipLibCheck:true});
      const diagnostics=ts.getPreEmitDiagnostics(program);
      for(const file of scriptFiles)await t.test(path.basename(file),()=>{
        const errors=diagnostics.filter(d=>d.file?.fileName===file).map(d=>({line:d.file.getLineAndCharacterOfPosition(d.start??0).line+1,message:ts.flattenDiagnosticMessageText(d.messageText,' ')}));
        assert.deepEqual(errors,[]);
      });
    }finally{fs.rmSync(dir,{recursive:true,force:true});}
  });
  await t.test('cancel targets the current media stage and rejects changed preparation identity',async()=>{
    const f=mediaFixture(api,runScript);let state=(await f.run()).state;f.jobs.get(state.mediaJobId).state='running';state={...state,phase:'head',workflowId:'old-native'};
    let r=await f.run(state,Date.now()+100000,'cancel');assert.equal(r.state.phase,'canceling');r=await f.run(r.state);assert.equal(r.state.phase,'canceled');assert(f.calls.some(c=>c[0]==='mediaCancel'));assert(!f.calls.some(c=>c[0]==='nativeCancel'));
    const g=mediaFixture(api,runScript),before=(await g.run()).state;g.req.endSeconds=2.2;await assert.rejects(g.run(before),/different request/);
  });
});
