import test from 'node:test';
import assert from 'node:assert/strict';
import {miniMusicFixture} from './mini_music_fixture.mjs';

test('Mini Build: a lost assembly reply cannot adopt a same-name unrelated Draft',async t=>{
 const f=await miniMusicFixture(t,{entry:'panel',silent:true}),adopted=[];let lookups=0;
 Object.assign(f.box,{findDraftByName:async()=>{lookups++;return {sequenceId:'unrelated-draft',fps:30,totalFrames:60};},planShort:()=>false,
  prepareMiniDecoration:async (_pending,result)=>{adopted.push(result.sequenceId);return {};},setResult:()=>{}});
 await f.box.api.build(1);
 assert.equal(f.saved.length,1,'the actual Build reached assembly dispatch');
 assert.deepEqual(adopted,[],'never decorate a Draft identified only by its name');
 assert.equal(lookups,0,'a name is not an execution-ownership receipt');
});

import fs from 'node:fs';
import {sdkFreeHelpersSource,vlogOperation} from './sdk_free_helpers.mjs';
import vm from 'node:vm';
import path from 'node:path';
import {webcrypto} from 'node:crypto';
import {createRequire} from 'node:module';
import {holdFixture} from './gallery_hold_fixture.mjs';
const runSource=sdkFreeHelpersSource()+'\n'+fs.readFileSync(new URL('../shared/template-run.js',import.meta.url),'utf8');
const assembly=vlogOperation('mini-vlog','assemble');
async function receiptFixture(t,{minify=false}={}){
 const f=await holdFixture(t),hooks={},requests=[],saved=new Map(),pending=[];let created=0,commits=0,probeSerial=0;
 const unrelated={id:'unrelated',name:'Same name',fps:30,frameSize:{width:1920,height:1080},clips:[{clipId:0,trackId:'main',resourceId:'foreign',startFrame:0,endFrame:30}]};saved.set(unrelated.id,unrelated);
 const project={meta:async()=>({draftIds:[...saved.keys()]}),createDraft:async({name})=>{
  const data={id:name==='Mini source timing check'?'probe-'+ ++probeSerial:'owned-'+(++created),name,fps:30,durationFrames:0,frameSize:{width:1920,height:1080},clips:[]};
  return {...reader(data),meta:async()=>data,setFrameSize:async size=>{data.frameSize=size;},clips:async()=>data.clips,
   insertResource:async({resourceId,sourceRange})=>{const startFrame=data.clips.at(-1)?.endFrame??0;data.clips.push({clipId:data.clips.length,trackId:'main',trackKind:'main',resourceId,sourceStartSeconds:sourceRange.startSeconds,playbackSpeed:{numerator:1,denominator:1},preserveAudioPitch:true,startFrame,endFrame:startFrame+Math.round((sourceRange.endSeconds-sourceRange.startSeconds)*data.fps)});data.durationFrames=data.clips.at(-1).endFrame;},
   setClipTransform:async({clip,scale})=>{data.clips.find(c=>c.clipId===clip.clipId).scale=scale.x;},setClipAudio:async()=>{},commitAll:async()=>{commits++;saved.set(data.id,data);await hooks.commit?.(data);return {createdDraftId:data.id};}};
 }};
 const reader=row=>({meta:async()=>row,clips:async()=>row.clips,clipTransform:async clip=>hooks.transform?hooks.transform():({enabled:true,scale:{x:clip.scale??1,y:clip.scale??1},position:{x:0,y:0},anchor:{x:0,y:0},rotation:0,flipHorizontal:false,flipVertical:false,positionKeys:[],scaleKeys:[],rotationKeys:[]}),clipAudio:async()=>({volumeDb:0,volumeKeys:[],fadeInSeconds:0,fadeOutSeconds:0})});
 const selects={files:f.files,project:id=>{assert.equal(id,'p');return project;},draft:id=>{const row=saved.get(id);assert.ok(row);return reader(row);}};
 const sdk={call:async(method,id,draftId)=>{
  const owner={projectId:'p',libraryId:hooks.library??'library'};
  if(method==='getProjectDraftScaffold'){assert.equal(id,'p');return {owner};}
  const key=method==='getDraftCore'?id:draftId,row=saved.get(key);assert.ok(row,'only saved fixture state is observable');
  if(method==='getDraftCore')return {owner,sequenceJson:{...row,frameRate:30}};
  assert.equal(method,'getDraftMediaSnapshot');return {revision:JSON.stringify(row),fps:30,durationFrames:row.durationFrames,clips:row.clips.map(clip=>({clipId:clip.clipId,trackId:clip.trackId,trackKind:clip.trackKind,resourceId:clip.resourceId,startFrame:clip.startFrame,endFrame:clip.endFrame,sourceStartSeconds:clip.sourceStartSeconds??0,sourceEndSeconds:(clip.sourceStartSeconds??0)+(clip.endFrame-clip.startFrame)/30,playbackSpeed:1}))};
 },runScript:async input=>{
  requests.push(input);
  const work=(async()=>{try{const result=await vm.runInNewContext('(async()=>{'+input.script+'})()',{selects});await hooks.reply?.(input,result);return {result};}catch(e){return {isError:true,output:e.message};}})();
  if(input.allowCommit&&hooks.lostEarly){pending.push(work);return {isError:true,output:'response channel disconnected'};}return work;
 }};
 const box=vm.createContext({crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array});
 if(minify){
  const require=createRequire(import.meta.url),esbuild=require(process.env.SELECTS_ESBUILD||process.env.SBS_PANEL_TEST_MODULES+'/esbuild'),module={exports:{}};
  Object.assign(box,{module,exports:module.exports});vm.runInContext(esbuild.transformSync(runSource+'\nexport {executeTemplateAssembly,openTemplateAssemblyContinuations};',{loader:'js',format:'cjs',minify:true}).code,box);box.execute=module.exports.executeTemplateAssembly;box.openTemplateAssemblyContinuations=module.exports.openTemplateAssemblyContinuations;
 }else vm.runInContext(runSource+'\nthis.execute=executeTemplateAssembly;',box);
 const scope={pluginId:'mini-vlog',projectId:'p',runId:'run-1'},config={projectId:'p',draftName:'Same name',picks:[{rid:'r0',startSeconds:0,sourceDuration:20},{rid:'r1',startSeconds:0,sourceDuration:20}],boundaries:[0,1,2],crops:{},music:null,clipSound:'full'};
 const run=()=>box.execute(sdk,f.local.files,scope,config,assembly,()=>true,{requestLimit:98304});
 return {...f,fileHooks:f.hooks,sdk,box,hooks,requests,saved,scope,config,run,unrelated,pending,commits:()=>commits};
}
test('Mini assembly receipt: healthy save and retry use one exact owned Draft',async t=>{
 const f=await receiptFixture(t),a=await f.run(),b=await f.run();assert.equal(a.sequenceId,'owned-1');assert.equal(b.sequenceId,a.sequenceId);assert.equal(f.commits(),1);assert.equal(a.totalFrames,60);assert.equal(b.assemblyConfirmed,true);
});
test('Mini assembly receipt: reply lost after save recovers without a name lookup or second commit',async t=>{
 const f=await receiptFixture(t);f.hooks.reply=input=>{if(input.summary==='Assemble template with owned receipt')throw Error('save response lost');};const a=await f.run();assert.equal(a.sequenceId,'owned-1');assert.equal(f.commits(),1);assert.equal(f.requests.filter(r=>r.summary==='Assemble template with owned receipt'||r.summary==='Decorate template with owned receipt').length,1);
});
test('Mini assembly receipt: an edited owned Draft is rejected and unrelated same-name data stays untouched',async t=>{
 const f=await receiptFixture(t),before=JSON.stringify(f.unrelated),a=await f.run();f.saved.get(a.sequenceId).clips[0].resourceId='user-edit';await assert.rejects(f.run(),e=>e.code==='TEMPLATE_RUN_INVALID');assert.equal(f.commits(),1);assert.equal(JSON.stringify(f.unrelated),before);
});
test('Mini assembly receipt: changed inputs under one run cannot reuse or overwrite its record',async t=>{
 const f=await receiptFixture(t);await f.run();f.config.boundaries=[0,2,3];await assert.rejects(f.run(),e=>e.code==='TEMPLATE_RUN_INVALID');assert.equal(f.commits(),1);
});
test('Mini assembly receipt: foreign library stops before persistent writes or commit',async t=>{
 const f=await receiptFixture(t);f.scope.libraryId='other';await assert.rejects(f.run(),e=>e.code==='TEMPLATE_RUN_TARGET');assert.equal(f.writes.length,0);assert.equal(f.commits(),0);
});
test('Mini assembly receipt: concurrent owners cannot both commit the same run',async t=>{
 const f=await receiptFixture(t),results=await Promise.allSettled([f.run(),f.run()]);assert.equal(f.commits(),1);assert.ok(results.some(r=>r.status==='fulfilled'));assert.ok(results.every(r=>r.status==='fulfilled'||r.reason.code==='TEMPLATE_RUN_PENDING'));
});
test('Mini assembly receipt: a late Main receipt completes an unknown dispatch without replay',async t=>{
 const f=await receiptFixture(t);let release;const held=new Promise(resolve=>release=resolve);f.hooks.commit=()=>held;f.hooks.lostEarly=true;
 await assert.rejects(f.run(),e=>e.code==='TEMPLATE_RUN_PENDING');await assert.rejects(f.run(),e=>e.code==='TEMPLATE_RUN_PENDING');assert.equal(f.commits(),1);
 release();await Promise.all(f.pending);f.hooks.lostEarly=false;const a=await f.run();assert.equal(a.sequenceId,'owned-1');assert.equal(f.commits(),1);
});

test('Mini Build: receipt-confirmed ID alone reaches decoration',async t=>{
 const f=await miniMusicFixture(t,{entry:'panel',silent:true}),seen=[];
 Object.assign(f.box,{executeTemplateAssembly:async(_sdk,_files,scope,config,_source,current)=>{assert.equal(scope.projectId,'p');assert.match(scope.runId,/^[a-f0-9-]{36}$/);assert.equal(config.picks.length,2);assert.equal(current(),true);return {sequenceId:'owned',fps:30,totalFrames:60,notes:[]};},prepareMiniDecoration:async (pending,r)=>{seen.push({...r,pending});return {};}});
 await f.box.api.build(1);assert.equal(seen.length,1);assert.equal(seen[0].sequenceId,'owned');assert.equal(Object.keys(f.box.assemblyPendingRef.current).length,0);
});
test('Mini Build: pending confirmation retries the same owner and frozen request without new planning',async t=>{
 const f=await miniMusicFixture(t,{entry:'panel',silent:true}),seen=[],decorated=[];
 Object.assign(f.box,{executeTemplateAssembly:async(_sdk,_files,scope,config)=>{seen.push({scope,config});if(seen.length===1)throw Object.assign(Error('pending'),{code:'TEMPLATE_RUN_PENDING'});return {sequenceId:'owned',fps:30,totalFrames:60,notes:[]};},prepareMiniDecoration:async (pending,r)=>{decorated.push({...r,frozen:pending.frozen});return {};}});
 await f.box.api.build(1);assert.equal(seen.length,1);const before=f.scripts.length;f.box.inventorySnapshotRef.current=null;await f.box.api.build(2);
 assert.equal(seen.length,2);assert.equal(seen[0].scope,seen[1].scope);assert.equal(seen[0].config,seen[1].config);assert.equal(f.scripts.length,before);assert.equal(decorated[0].frozen.seed,1);assert.equal(Object.keys(f.box.assemblyPendingRef.current).length,0);
});

for(const kind of ['source','transform'])test('Mini assembly receipt: '+kind+' edits under the same clip identity block recovery',async t=>{
 const f=await receiptFixture(t),a=await f.run(),row=f.saved.get(a.sequenceId).clips[0];
 if(kind==='source')row.sourceStartSeconds=7;else row.scale=2;
 await assert.rejects(f.run(),e=>e.code==='TEMPLATE_RUN_INVALID');assert.equal(f.commits(),1);
});

import {checkScriptTypes} from './run_script_types.mjs';
test('Mini assembly receipt: emitted requests match actual SDK declarations',async t=>{
 const f=await receiptFixture(t);await f.run();const result=checkScriptTypes(f.requests.map((r,i)=>({name:r.summary+' '+i,script:r.script})));assert.ok(result.scripts>=4);
});
test('Mini assembly receipt: a regenerated display name cannot prevent recovery of the same run',async t=>{
 const f=await receiptFixture(t),a=await f.run();f.config.draftName='Same content at a later clock time';const b=await f.run();assert.equal(a.sequenceId,b.sequenceId);assert.equal(f.commits(),1);assert.equal(f.saved.get(a.sequenceId).name,'Same name');
});
test('Mini assembly receipt: oversized confirmation state stops before the save',async t=>{
 const f=await receiptFixture(t);f.config.picks=Array.from({length:8},()=>({rid:'r0',startSeconds:0,sourceDuration:20}));f.config.boundaries=Array.from({length:9},(_,i)=>i);
 f.hooks.transform=()=>({enabled:true,scale:{x:1,y:1},position:{x:0,y:0},anchor:{x:0,y:0},rotation:0,flipHorizontal:false,flipVertical:false,positionKeys:[],scaleKeys:[],rotationKeys:Array.from({length:256},(_,i)=>({atSeconds:i/256,rotation:1+i/256}))});
 await assert.rejects(f.run(),e=>e.code==='TEMPLATE_RUN_NOT_SAVED'&&/receipt.*limit/i.test(e.cause?.cause?.message??''));assert.equal(f.commits(),0,'receipt representability is a pre-save requirement');
});

test('Mini assembly receipt: minified distribution preserves serialized SDK dependencies',async t=>{
 const f=await receiptFixture(t,{minify:true});f.hooks.reply=input=>{if(input.summary==='Assemble template with owned receipt')throw Error('save response lost');};const a=await f.run(),b=await f.run();assert.equal(a.sequenceId,b.sequenceId);assert.equal(f.commits(),1);
});
test('Mini assembly receipt: a nonfinite SDK observation cannot become a null-valued saved fact',async t=>{
 const f=await receiptFixture(t);f.hooks.transform=()=>({enabled:true,scale:{x:NaN,y:1}});await assert.rejects(f.run(),e=>e.code==='TEMPLATE_RUN_NOT_SAVED');assert.equal(f.commits(),0);
});

test('Mini continuation: a remounted realm confirms a late real assembly without a second commit',async t=>{
 const f=await receiptFixture(t);f.files.readdir=async p=>fs.readdirSync(p);
 const open=async()=>{const box=vm.createContext({crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array});vm.runInContext(runSource,box);return box.openTemplateAssemblyContinuations(f.sdk,f.local.files,{pluginId:'mini-vlog',projectId:'p',requestLimit:98304},()=>true);};
 const original={scope:f.scope,config:f.config,source:assembly,frozen:{pid:'p',seed:7},plan:{picks:f.config.picks}};
 let release;const held=new Promise(resolve=>release=resolve);f.hooks.commit=()=>held;f.hooks.lostEarly=true;
 await assert.rejects((await open()).run(original),e=>e.code==='TEMPLATE_RUN_PENDING');assert.equal(f.commits(),1);
 release();await Promise.all(f.pending);f.hooks.lostEarly=false;
 const remounted=await open(),pending=await remounted.read();assert.equal(pending.frozen.seed,7);
 const result=await remounted.run(pending);assert.equal(result.sequenceId,'owned-1');assert.equal(f.commits(),1);assert.equal(await (await open()).read(),null);
});

test('Mini continuation: concurrent remounted callers share the existing exclusive assembly claim',async t=>{
 const f=await receiptFixture(t);f.files.readdir=async p=>fs.readdirSync(p);
 const log=await f.box.openTemplateAssemblyContinuations(f.sdk,f.local.files,{pluginId:'mini-vlog',projectId:'p',requestLimit:98304},()=>true),pending={scope:f.scope,config:f.config,source:assembly,frozen:{seed:7}};
 const results=await Promise.allSettled([log.run(pending),log.run(pending)]);
 assert.equal(f.commits(),1);assert.ok(results.some(r=>r.status==='fulfilled'));assert.ok(results.every(r=>r.status==='fulfilled'||['TEMPLATE_RUN_PENDING','TEMPLATE_RUN_COMPLETED'].includes(r.reason.code)),JSON.stringify(results.map(r=>r.reason&&{code:r.reason.code,message:r.reason.message,stack:r.reason.stack})));
});

test('Mini run record: legitimate atomic replacement during read is observed again without authoring',async t=>{
 const f=await receiptFixture(t);await f.run();let replaced=false;
 f.fileHooks.beforeRead=(file)=>{if(!replaced&&file.endsWith('.json')&&file.includes('template-runs')){replaced=true;const old=fs.readFileSync(file,'utf8');fs.writeFileSync(file+'.next',old+'\n');fs.renameSync(file+'.next',file);}};
 assert.equal((await f.run()).sequenceId,'owned-1');assert.equal(replaced,true);assert.equal(f.commits(),1);
});
test('Mini run record: sustained replacement is a bounded pending observation rather than corruption or replay',async t=>{
 const f=await receiptFixture(t);await f.run();let reads=0;
 f.fileHooks.beforeRead=(file)=>{if(file.endsWith('.json')&&file.includes('template-runs')){reads++;fs.writeFileSync(file+'.next',fs.readFileSync(file,'utf8')+'\n');fs.renameSync(file+'.next',file);}};
 await assert.rejects(f.run(),e=>e.code==='TEMPLATE_RUN_PENDING');assert.equal(reads,3);assert.equal(f.commits(),1);
});
test('Mini continuation: minified distribution keeps discovery and real serialized save dependencies',async t=>{
 const f=await receiptFixture(t,{minify:true});f.files.readdir=async p=>fs.readdirSync(p);
 const log=await f.box.openTemplateAssemblyContinuations(f.sdk,f.local.files,{pluginId:'mini-vlog',projectId:'p',requestLimit:98304},()=>true),pending={scope:f.scope,config:f.config,source:assembly,frozen:{seed:7}};
 await log.store(pending);const resumed=await log.read();assert.equal(resumed.frozen.seed,7);assert.equal((await log.run(resumed)).sequenceId,'owned-1');assert.equal(f.commits(),1);assert.equal(await log.read(),null);
});
test('Mini run record: stable JSON null is invalid rather than an indefinitely changing record',async t=>{
 const f=await receiptFixture(t);await f.run();const directory=path.join(f.root,'.selects/plugin-data/mini-vlog/template-runs'),name=fs.readdirSync(directory).find(name=>name.endsWith('.json'));fs.writeFileSync(path.join(directory,name),'null');
 await assert.rejects(f.run(),e=>e.code==='TEMPLATE_RUN_INVALID');assert.equal(f.commits(),1);
});
