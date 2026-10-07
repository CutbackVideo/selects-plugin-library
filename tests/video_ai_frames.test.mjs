import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
const {prepareSharedAiVideoFrames}=require('../shared/video-ai-frames.cjs');
const resourceId='01234567-89ab-cdef-0123-456789abcdef';
const base=()=>({sourceResourceId:resourceId,sourceRange:{startSeconds:0,endSeconds:3/30},frameSize:{width:540,height:720},alphaEncoding:'grayscale-png-8bit',frames:Array.from({length:3},(_,index)=>({index,sourceTimeSeconds:index/30,url:'selects-local://durable/'+index}))});
function fixture(m=base()) {
 const events=[];
 const selects={ai:{prepareMatte:async(file,pid)=>{events.push(['prepare',file,pid]);return m;}},files:{mkdir:async(...args)=>events.push(['mkdir',...args]),pathFromLocalUrl:async(url)=>{events.push(['resolve',url]);return '/durable/'+url.split('/').at(-1)+'.png';},copy:async(...args)=>events.push(['copy',...args])}};
 const sdk={runScript:async({script,allowCommit})=>{assert.equal(allowCommit,true);const result=await vm.runInNewContext('(async()=>{'+script+'})()',{selects});return {result};}};
 return {sdk,events};
}
const expected={resourceId,width:540,height:720,fps:30,frames:3};
test('adopts masks before copying durable capabilities; result stays bounded and source-clock ordered',async()=>{
 const {sdk,events}=fixture();
 const result=await prepareSharedAiVideoFrames(sdk,'project',{id:'manifest-capability'},'/plugin/masks',expected);
 assert.deepEqual({...result},{count:3,width:540,height:720,pattern:'/plugin/masks/frame_%06d.png'});
 assert.equal(events[0][0],'prepare');assert.equal(events.filter(e=>e[0]==='copy').length,3);
 assert.deepEqual(events.filter(e=>e[0]==='copy').map(e=>e[2]),['/plugin/masks/frame_000001.png','/plugin/masks/frame_000002.png','/plugin/masks/frame_000003.png']);
 assert.ok(events.filter(e=>e[0]==='resolve').every(e=>e[1].startsWith('selects-local://durable/')));
 assert.equal('frames' in result,false);
});
test('Windows paths retain native separators and never reach a shell',async()=>{
 const {sdk,events}=fixture();const result=await prepareSharedAiVideoFrames(sdk,'project',{},'C:\\\u4EBA\u7269\\masks',expected);
 assert.equal(result.pattern,'C:\\\u4EBA\u7269\\masks\\frame_%06d.png');
 assert.equal(events.find(e=>e[0]==='copy')[2],'C:\\\u4EBA\u7269\\masks\\frame_000001.png');
});
for(const [name,mutate] of [
 ['wrong Resource',m=>m.sourceResourceId='wrong'],['wrong geometry',m=>m.frameSize.height=960],['wrong encoding',m=>m.alphaEncoding='grayscale-avif-8bit'],['incomplete sequence',m=>m.frames=[]],['frame index gap',m=>m.frames[1].index=3],['shifted source clock',m=>m.frames[0].sourceTimeSeconds=1],['nonfinite timestamp',m=>m.frames[0].sourceTimeSeconds=NaN]
])test('refuses '+name+' before making any destination files',async()=>{
 const m=base();mutate(m);const {sdk,events}=fixture(m);
 await assert.rejects(prepareSharedAiVideoFrames(sdk,'project',{},'/masks',expected),/geometry|count|clock/);
 assert.equal(events.filter(e=>e[0]==='mkdir'||e[0]==='copy').length,0);
});
test('copy failure rejects a result rather than announcing success',async()=>{
 const {sdk}=fixture();const original=sdk.runScript;
 sdk.runScript=async(args)=>{await original(args);throw Error('write denied');};
 await assert.rejects(prepareSharedAiVideoFrames(sdk,'project',{},'/masks',expected),/write denied/);
});
test('all three panels bundle the same shared source and preserve old postprocessing contracts',()=>{
 const module=fs.readFileSync(new URL('../shared/video-ai-frames.cjs',import.meta.url),'utf8');
 for(const id of ['jude-kinetic-style','depth-type-captions','portrait-beat-montage']){
  const source=fs.readFileSync(new URL('../plugins/'+id+'/panel.tsx',import.meta.url),'utf8');
  assert.ok(source.includes(module));assert.match(source,/task:["']person\.matte["']/);assert.match(source,/importSharedAiVideo\(/);
  assert.doesNotMatch(source,/selects\.generation|osascript|VNGenerate|env\.node\(\)/);
 }
 const depth=fs.readFileSync(new URL('../plugins/depth-type-captions/panel.tsx',import.meta.url),'utf8');
 assert.match(depth,/const depthSubject = \(settings\) => \(settings.subject === "person" \? "person" : "foreground"\)/);
 assert.match(depth,/format=gray,negate,split=2/);assert.match(depth,/mode: depthSubject\(settings\)/);
 const jude=fs.readFileSync(new URL('../plugins/jude-kinetic-style/panel.tsx',import.meta.url),'utf8');
 assert.match(jude,/format=gray,negate,tile=/);assert.match(jude,/coverage:levels.reduce/);assert.match(jude,/f.box.xmin\/w/);
 const portrait=fs.readFileSync(new URL('../plugins/portrait-beat-montage/panel.tsx',import.meta.url),'utf8');
 assert.match(portrait,/MATTE_FRAMES\*W\*H/);assert.match(portrait,/await kernels\("unit"/);
});
// Validate the emitted edit script against the current app's public declarations
// when that checkout is available; standalone library CI keeps behavioral tests.
const app=process.env.SELECTS_CLIENT_REPO || new URL('../../cutback-client',import.meta.url).pathname;
const declarationDirectory=app+'/electron/mcp/script-runtime/sdk-declarations';
let ts;
try{ts=require(app+'/node_modules/typescript');}catch{}
test('durable video materialization script typechecks against the real SDK',
 {skip:!ts || !fs.existsSync(declarationDirectory+'/ai.d.ts') ? 'AI-enabled app checkout needed (SELECTS_CLIENT_REPO)' : false},async()=>{
  const {default:os}=await import('node:os'),{default:path}=await import('node:path');
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'video-ai-types-'));
  try{
   let script;
   const sdk={runScript:async input=>{script=input.script;return {result:{count:3,width:540,height:720}};}};
   await prepareSharedAiVideoFrames(sdk,'project',{id:'manifest',name:'matte.json',mediaType:'application/json',byteSize:100},'/plugin/masks',expected);
   const file=path.join(temp,'materialize.ts');fs.writeFileSync(file,'export {};\nasync function run(){\n'+script+'\n}');
   const files=fs.readdirSync(declarationDirectory).filter(f=>f.endsWith('.d.ts')).map(f=>path.join(declarationDirectory,f));
   const program=ts.createProgram([...files,file],{noEmit:true,strict:true,skipLibCheck:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,lib:['lib.es2022.d.ts','lib.dom.d.ts']});
   const errors=ts.getPreEmitDiagnostics(program);
   assert.equal(errors.length,0,ts.formatDiagnosticsWithColorAndContext(errors,{getCurrentDirectory:()=>temp,getCanonicalFileName:n=>n,getNewLine:()=> '\n'}));
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
 });

function panelFunction(id,name) {
 const source=fs.readFileSync(new URL('../plugins/'+id+'/panel.tsx',import.meta.url),'utf8');
 const start=source.search(new RegExp('^(?:async )?function '+name+'\\(','m'));
 assert.ok(start>=0,name);
 const next=source.slice(start+1).search(/\n(?:async )?function [A-Za-z]/);
 return source.slice(start,next<0?undefined:start+1+next).replace(/return <small>\{status\}<\/small>;/g,'return null;');
}
function templateFixture(saved=new Map()) {
 let effect, refs=[],refIndex=0;
 const finishes=[],statuses=[],calls=[];
 const sdk={storage:{getItem:async k=>saved.get(k)||null,setItem:async(k,v)=>saved.set(k,v)},finishTemplate:value=>finishes.push(value)};
 const React={useRef:value=>refs[refIndex++]||(refs[refIndex-1]={current:value}),useState:value=>[value,v=>statuses.push(v)],useEffect:fn=>{effect=fn;}};
 const globals={React,AbortController,PLUGIN:'portrait-beat-montage',FAILED:'failed',SHOTS:10,T:{steps:['read','mattes']},
 pbmCancelled:()=>Object.assign(Error('Cancelled.'),{code:'cancelled'}),
 scriptResourceIds:async(s,p,ids)=>new Map(ids.map(id=>[id,id])),
 readMediaPages:async()=>({result:{videos:Array.from({length:10},(_,i)=>({resourceId:'r'+i,path:'/media/'+i+'.mp4'}))}}),
 mediaScript:()=>'',buildMontage:async(s,options)=>{calls.push(options);return new Promise((resolve,reject)=>{options.resolve=resolve;options.signal.addEventListener('abort',()=>reject(Error('Cancelled.')),{once:true});});}};
 const code=panelFunction('portrait-beat-montage','TemplateRun');
 const ctx=vm.createContext(globals);vm.runInContext(code+';this.run=TemplateRun;',ctx);
 return {sdk,saved,finishes,statuses,calls,render:(runId,{reopen=false}={})=>{
  if(reopen)refs=[];refIndex=0;
  ctx.run({sdk,context:{projectId:'project',template:{runId,inputs:{clips:Array.from({length:10},(_,i)=>({resourceId:'r'+i}))}}}});
  return effect();
 }};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('Portrait template close and newer run stop the old observer and suppress old completion',async()=>{
 const f=templateFixture(),close=f.render('old');await tick();
 assert.equal(f.calls[0].retryAi,true);close();
 assert.equal(f.calls[0].signal.aborted,true);await tick();assert.equal(f.finishes.length,0);
 f.render('new');await tick();
 f.calls[0].setStep(1);assert.equal(f.statuses.length,0,'old progress cannot update the current template');
 f.calls[1].resolve('new-draft');await tick();await tick();
 assert.deepEqual(JSON.parse(JSON.stringify(f.finishes)),[{sequenceId:'new-draft'}]);
});
test('Portrait template remount of a canceled run preserves cancel, new user run permits retry',async()=>{
 const f=templateFixture(),close=f.render('same');await tick();close();await tick();
 const closeAgain=f.render('same',{reopen:true});await tick();assert.equal(f.calls[1].retryAi,false);closeAgain();await tick();
 const closeNew=f.render('next');await tick();assert.equal(f.calls[2].retryAi,true);closeNew();await tick();
});
test('Portrait detachment after inference or during import prevents later Draft edits',async()=>{
 for(const at of ['inference','import']) {
  const signal=new AbortController();let scripts=0;
  const manifest={clips:[{path:'/shot.mp4',frames:1,start:0,name:'shot'}],audio:[],gapFrames:0,durationFrames:1};
  const ctx=vm.createContext({pbmWindowsMontage:async()=>{if(at==='inference')signal.abort();return manifest;},pbmCancelled:()=>Object.assign(Error('Cancelled.'),{code:'cancelled'}),json:JSON.stringify,T:{title:'Montage'}});
  vm.runInContext(panelFunction('portrait-beat-montage','buildMontage')+';this.build=buildMontage;',ctx);
  const sdk={runScript:async()=>{scripts++;signal.abort();return {result:{addedResourceIds:['r0']}};}};
  await assert.rejects(ctx.build(sdk,{projectId:'p',files:[],setStep:()=>{},setProgress:()=>{},signal:signal.signal}),{code:'cancelled'});
  assert.equal(scripts,at==='inference'?0:1);
 }
});
test('Portrait detachment during draft commit saves the acknowledged draft but never opens it',async()=>{
 const observer=new AbortController(),saved=[],summaries=[];
 const manifest={clips:[{path:'/shot.mp4',frames:1,start:0,name:'shot'}],audio:[],gapFrames:0,durationFrames:1};
 const ctx=vm.createContext({pbmWindowsMontage:async()=>manifest,pbmCancelled:()=>Object.assign(Error('Cancelled.'),{code:'cancelled'}),json:JSON.stringify,T:{title:'Montage'}});
 vm.runInContext(panelFunction('portrait-beat-montage','buildMontage')+';this.build=buildMontage;',ctx);
 const sdk={runScript:async input=>{summaries.push(input.summary);if(input.summary==='Import montage shots')return {result:{addedResourceIds:['r0']}};observer.abort();return {result:{draftId:'committed'}};}};
 await assert.rejects(ctx.build(sdk,{projectId:'p',files:[],setStep:()=>{},setProgress:()=>{},signal:observer.signal,onDraftCommitted:async id=>saved.push(id)}),{code:'cancelled'});
 assert.deepEqual(saved,['committed']);assert.equal(summaries.includes('Open montage draft'),false);
});
test('Depth template retry intent is true once per new run and false on its remount',async()=>{
 const saved=new Map(),controls=[];let effect;const refs=[];let i=0;
 const globals={useRef:v=>refs[i++]||(refs[i-1]={current:v}),useState:()=>['',()=>{}],useEffect:fn=>{effect=fn;},h:()=>null,
 DEPTH_TAG:'depth',DEPTH_TEMPLATE_SECONDS:90,DEPTH_DEFAULTS:{},DEPTH_TEMPLATE_FAILED:'failed',DEPTH_TEMPLATE_ERRORS:{},
 depthStorage:()=>({getItem:async key=>saved.get(key)||null}),depthSave:async(key,value)=>saved.set(key,JSON.stringify(value)),depthHostProblem:()=>null,
 depthTemplateError:code=>Object.assign(Error(code),{code}),depthMakeCaptions:async({control})=>{controls.push(control);throw Error('fixture stops after AI intent');},console:{warn:()=>{}}};
 const ctx=vm.createContext(globals);vm.runInContext(panelFunction('depth-type-captions','DepthTemplateRun')+';this.run=DepthTemplateRun;',ctx);
 const sdk={runScript:async()=>({result:{seconds:3}}),finishTemplate:()=>{}};
 const render=runId=>{i=0;ctx.run({sdk,context:{projectId:'project',template:{runId,libraryId:'library',inputs:{speaker:[{kind:'timeline',sequenceId:'draft'}]}}}});return effect();};
 render('same');await tick();assert.equal(controls[0].retryAi,true);
 refs.length=0;render('same');await tick();assert.equal(controls[1].retryAi,false);
 render('next');await tick();assert.equal(controls[2].retryAi,true);
});
test('Windows Portrait retries missing x264 with built-in MPEG4, retaining frame clock and rejects other failures',async()=>{
 for(const message of ["Unknown encoder 'libx264'",'invalid input data']) {
  const calls=[];
  const rt={runFFmpeg:async args=>{calls.push(args);if(calls.length===1)throw Error(message);return {};}};
  const ctx=vm.createContext({AbortController,setTimeout,clearTimeout,hostIsWindows:()=>true,hostNeed:()=>rt,pbmCancelled:()=>Error('Cancelled.')});
  vm.runInContext(panelFunction('portrait-beat-montage','pbmBuiltinOutputArgs')+'\n'+panelFunction('portrait-beat-montage','pbmFFmpeg')+'\n;this.ff=pbmFFmpeg;',ctx);
  const args=['-y','-r','30000/1001','-frames:v','15','-c:v','libx264','-preset','medium','-crf','16','-pix_fmt','yuv420p','out.mp4'];
  if(message.startsWith('Unknown')) {
   await ctx.ff(args,null,null);assert.equal(calls.length,2);
   assert.ok(calls[1].includes('mpeg4'));assert.ok(!calls[1].includes('-preset')&&!calls[1].includes('-crf'));
   assert.equal(calls[1][calls[1].indexOf('-r')+1],'30000/1001');assert.equal(calls[1][calls[1].indexOf('-frames:v')+1],'15');
  }else {await assert.rejects(ctx.ff(args,null,null),/invalid input/);assert.equal(calls.length,1);}
 }
});
test('Jude cropped and joined FFV1 input is lossless RGB at the exact fractional frame rate',async t=>{
 const {spawnSync}=await import('node:child_process'),{stripTypeScriptTypes}=await import('node:module'),{default:os}=await import('node:os'),{default:path}=await import('node:path');
 const ff=process.env.VIDEO_AI_FFMPEG||'ffmpeg',probe=process.env.VIDEO_AI_FFPROBE||'ffprobe';
 if(spawnSync(ff,['-version']).status!==0||spawnSync(probe,['-version']).status!==0){t.skip('ffmpeg and ffprobe required');return;}
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jude-ffv1-'));
 try {
  const rate=30000/1001,source=path.join(dir,'input.avi');
  const run=args=>{const r=spawnSync(ff,args,{maxBuffer:32<<20});assert.equal(r.status,0,String(r.stderr));return r.stdout;};
  run(['-v','error','-y','-f','lavfi','-i','testsrc=s=540x960:r=30000/1001:d=1','-c:v','ffv1','-pix_fmt','bgr0',source]);
  let imported,input,runOptions;
  const ctx=vm.createContext({Math,JSON,hostJoin:path.join,hostNeed:()=>fs.promises,
   videoAiClient:()=>({run:async(request,options)=>{input=request;runOptions=options;return {result:{files:{manifest:{}}}};}}),
   judeRunFFmpeg:async args=>{run(['-nostdin',...args]);},importSharedAiVideo:async(s,p,file)=>{imported=file;return resourceId;},
   prepareSharedAiVideoFrames:async()=>({count:6}),Uint8Array});
  vm.runInContext(stripTypeScriptTypes(panelFunction('jude-kinetic-style','judeSharedSprites'))+'\n;this.sprites=judeSharedSprites;',ctx);
  const piece={sw:540,sh:960,scale:1,posX:0,posY:0,path:source,playbackRate:1};
  await ctx.sprites({sdk:{},retryAi:true,status:()=>{},writeText:async(p,v)=>fs.promises.writeFile(p,v)},'project',
   {fps:rate,step:2,blocks:[{key:'block',pieces:[{...piece,from:0,to:6,startSeconds:0},{...piece,from:6,to:12,startSeconds:6/rate}],lines:[]}]},dir);
  assert.match(imported,/source\.avi$/);assert.equal(runOptions.retryTerminal,true);
  const meta=JSON.parse(spawnSync(probe,['-v','error','-count_frames','-show_entries','stream=codec_name,nb_read_frames,avg_frame_rate,start_time','-of','json',imported],{encoding:'utf8'}).stdout).streams[0];
  assert.equal(meta.codec_name,'ffv1');assert.equal(meta.nb_read_frames,'6');assert.equal(meta.avg_frame_rate,'15000/1001');assert.equal(Number(meta.start_time),0);
  assert.equal(input.sourceRange.endSeconds,6/(rate/2));
  const got=run(['-v','error','-i',imported,'-f','rawvideo','-pix_fmt','rgb24','-']);
  const expected=run(['-v','error','-i',source,'-vf','fps=15000/1001:start_time=0,format=rgb24','-frames:v','6','-f','rawvideo','-pix_fmt','rgb24','-']);
  assert.deepEqual(got,expected);assert.equal(fs.existsSync(path.join(dir,'matte-block','piece-0.avi')),false);
  // A rounded landscape scale changes SAR unless the derived raster explicitly sets square pixels.
  const wide=path.join(dir,'wide.avi');
  run(['-v','error','-y','-f','lavfi','-i','testsrc=s=1920x1080:r=30000/1001:d=1','-c:v','ffv1','-pix_fmt','bgr0',wide]);
  const fit=Math.min(1080/1920,1920/1080);
  await ctx.sprites({sdk:{},retryAi:true,status:()=>{},writeText:async(p,v)=>fs.promises.writeFile(p,v)},'project',
   {fps:rate,step:2,blocks:[{key:'wide',pieces:[{from:0,to:12,startSeconds:0,path:wide,sw:1920,sh:1080,scale:1920/(1080*fit),posX:0,posY:0}],lines:[]}]},dir);
  const raster=JSON.parse(spawnSync(probe,['-v','error','-show_entries','stream=sample_aspect_ratio,width,height','-of','json',imported],{encoding:'utf8'}).stdout).streams[0];
  assert.equal(raster.sample_aspect_ratio,'1:1');assert.deepEqual([raster.width,raster.height],[540,960]);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('Jude template retries failed AI only for a new user run and reuses its video Draft on remount',async()=>{
 const {stripTypeScriptTypes}=await import('node:module');
 const saved=new Map(),runs=[],finishes=[];let effect,refs=[],i=0,made=0;
 const globals={AbortController,useRef:v=>refs[i++]||(refs[i-1]={current:v}),useState:()=>['',()=>{}],useEffect:fn=>{effect=fn;},
 TEMPLATE_FAILED:'failed',templateSpeaker:()=>({kind:'video',resourceId:'r0',name:'source'}),
 pluginPaths:async()=>({data:'/plugin-data',plugin:'/plugin'}),panelEnv:sdk=>({sdk}),
 templateDraftFromVideo:async()=>{made++;return 'template-draft';},runPipeline:async(env,pid,sid)=>{runs.push({retryAi:env.retryAi,sid});throw Error('fixture AI canceled');},hostMessage:e=>e.message};
 const ctx=vm.createContext(globals);vm.runInContext(stripTypeScriptTypes(panelFunction('jude-kinetic-style','TemplateRun'))+'\n;this.run=TemplateRun;',ctx);
 const sdk={storage:{getItem:async k=>saved.get(k)||null,setItem:async(k,v)=>saved.set(k,v)},finishTemplate:r=>finishes.push(r)};
 const render=runId=>{i=0;ctx.run({sdk,context:{projectId:'project',template:{runId}}});return effect();};
 render('same');await tick();assert.equal(runs[0].retryAi,true);assert.equal(made,1);
 refs=[];render('same');await tick();assert.equal(runs[1].retryAi,false);assert.equal(runs[1].sid,'template-draft');assert.equal(made,1);
 render('next');await tick();assert.equal(runs[2].retryAi,true);assert.equal(made,2);
});
