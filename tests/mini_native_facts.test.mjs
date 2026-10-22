import {assemblyIntentFixture} from './mini_assembly_intent_fixture.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import {createRequire} from 'node:module';
import {miniMusicFixture} from './mini_music_fixture.mjs';
import {archiveMusicFixture} from './archive_music_fixture.mjs';
import {topLevel} from './windows_host.mjs';
import {prepareNativeImagesById} from '../shared/native-image-input.mjs';

async function selectedPhoto(t,{missing=false,unknownSize=false,archive=false}={}){
 const f=await (archive?archiveMusicFixture:miniMusicFixture)(t,{entry:'panel'}),file=path.join(f.root,'selected.png');
 if(!missing)fs.writeFileSync(file,Buffer.from([137,80,78,71,13,10,26,10]));
 f.resources.push({resourceId:'selected-image',type:'Image'});
 f.nodes.push({resourceId:'selected-image',type:'image',path:file,frameSize:unknownSize?null:{width:96,height:160}});
 f.inventory.photos=[{rid:'selected-image',name:'Portrait',path:file,width:1920,height:1080,kind:'photo'}];
 f.plan.picks=archive?[{rid:'r0',kind:'video',startSeconds:0,sourceDuration:20},{rid:'selected-image',kind:'photo'}]:[{rid:'selected-image',kind:'photo'},{rid:'selected-image',kind:'photo'}];
 if(archive)f.box.usePhotos=true;
 return f;
}
for(const mode of ['healthy','missing','unknown'])test('Archive standalone: native Image preflight '+mode,async t=>{
 const f=await selectedPhoto(t,{missing:mode==='missing',unknownSize:mode==='unknown',archive:true});
 await f.run();
 if(mode==='healthy'){assert.ok(f.saved.length,f.errors.map(error=>error.message??error).join('; '));assert.deepEqual(JSON.parse(JSON.stringify(f.saved.at(-1)?.crops?.['selected-image'])),{width:96,height:160});assert.equal(f.imports.length,1);}
 else{assert.equal(f.imports.length,0);assert.equal(f.saved.length,0);assert.equal(f.writes.length,0);assert.ok(f.errors.some(error=>/^image-source-|verified native dimensions/.test(error.code??error.message??error)));}
});
test('Mini standalone: original Image dimensions replace a cached canvas before assembly',async t=>{
 const f=await selectedPhoto(t),result=await f.run();
 assert.deepEqual(JSON.parse(JSON.stringify(result?.crops?.['selected-image'])),{width:96,height:160});
 assert.equal(f.saved.length,1);assert.equal(f.imports.length,1);
});
test('Mini standalone: an unavailable selected photo stops before music publication or assembly',async t=>{
 const f=await selectedPhoto(t,{missing:true});await f.run();
 assert.equal(f.imports.length,0);assert.equal(f.saved.length,0);assert.equal(f.writes.length,0);assert.ok(f.errors.length);
});
test('Mini standalone: unknown native dimensions cannot inherit a cached canvas',async t=>{
 const f=await selectedPhoto(t,{unknownSize:true});await f.run();
 assert.equal(f.imports.length,0);assert.equal(f.saved.length,0);assert.equal(f.writes.length,0);assert.ok(f.errors.length);
});
for(const plugin of ['mini-vlog','archive-vlog'])test(plugin+': inventory must keep unknown native Image dimensions unknown',async()=>{
 const source=fs.readFileSync(new URL('../plugins/'+plugin+'/scripts/inventory.js',import.meta.url),'utf8');let scratch=0;
 const project={resources:async()=>[{resourceId:'portrait',type:'Image',name:'Portrait'}],sourceFiles:async()=>({fileTree:[{resourceId:'portrait',type:'image',path:'/photo.png',frameSize:null}]}),
  createDraft:async()=>{scratch++;return {insertResource:async()=>{},meta:async()=>({frameSize:{width:1920,height:1080}})};}};
 const result=await vm.runInNewContext('(async()=>{'+source.replace('__CONFIG__',JSON.stringify({projectId:'p',measureMs:4000}))+'})()',{selects:{project:()=>project}});
 assert.equal(result.photos[0].width,null);assert.equal(result.photos[0].height,null);assert.equal(scratch,0,'a Draft canvas is not an Image measurement');
});
for(const plugin of ['mini-vlog','archive-vlog'])for(const known of [false,true])test(plugin+': assembly '+(known?'uses native photo dimensions':'rejects missing native photo facts before creating a Draft'),async()=>{
 const source=fs.readFileSync(new URL('../plugins/'+plugin+'/scripts/assemble.js',import.meta.url),'utf8');
 const f=assemblyIntentFixture({scriptSource:source,probeName:plugin==='archive-vlog'?'Archive source timing check':'Mini source timing check'});
 f.cfg.picks=[{rid:'photo',kind:'photo',startSeconds:0}];f.cfg.boundaries=[0,1];if(!known)f.cfg.crops={};
 if(known){await f.run();assert.equal(f.calls.commits,1);assert.equal(f.drafts.at(-1).rows().length,1);assert.equal(f.calls.transforms,1);assert.ok(Math.abs(f.drafts.at(-1).rows()[0]._transform.scale.x-80/27)<1e-9);}
 else{await assert.rejects(f.run(),/plan|native|dimension|photo|Image/i);assert.equal(f.calls.creates,0);assert.equal(f.calls.commits,0);}
});
for(const plugin of ['mini-vlog','archive-vlog'])test(plugin+': Finish uses the build-owned photo facts after an inventory refresh',async t=>{
 if(plugin==='archive-vlog'){
  // The actual Archive preparation crosses the SDK serialization boundary with
  // its captured native facts; the fixture's pure builder stops before a save.
  const f=await selectedPhoto(t,{archive:true}),finishAssets=await f.box.api.snapshotArchiveFinishAssets(f.box.assets,'en',async()=>'',()=>{});
  const pending={photoSizes:{'selected-image':{width:96,height:160}},openingSize:null,finishAssets,plan:f.plan,frozen:{pid:'p',seed:1,preset:'preset',fields:{},clipSound:'full',music:'none',sectionStart:0,look:{on:false},credit:{on:false}}};
  const result=await f.box.api.prepareArchiveDecoration(f.box.sdk,pending,{sequenceId:'result',totalFrames:60,fps:30},()=>{});
  assert.deepEqual(JSON.parse(JSON.stringify(result.config.sizes['selected-image'])),{width:96,height:160});
  assert.equal(f.inventory.photos[0].width,1920);assert.equal(f.imports.length,0);assert.equal(f.saved.length,0);return;
 }
 const f=await selectedPhoto(t),require=createRequire(import.meta.url),esbuild=require(process.env.SELECTS_ESBUILD||process.env.SBS_PANEL_TEST_MODULES+'/esbuild');
 const file=process.env.NATIVE_FACTS_DECORATE_SOURCE_ROOT?path.join(process.env.NATIVE_FACTS_DECORATE_SOURCE_ROOT,plugin+'.tsx'):new URL('../plugins/'+plugin+'/panel.tsx',import.meta.url);
 const plain=esbuild.transformSync(fs.readFileSync(file,'utf8'),{loader:'tsx',format:'esm',jsx:'preserve'}).code.replace(/^  /gm,'');
 const seen=[];f.box.assets.presets={presets:[{id:'preset',fields:[],colors:{primary:'#fff',secondary:'#000'}}],metrics:{}};
 Object.assign(f.box,{langRef:{current:'en'},PLUGIN_VERSION:'fixture',presetFonts:()=>[],TITLE_LOOK:{shadow:0,size:100,x:50,y:50},MOTION_OPTIONS:[],MOTION_STRENGTH:.5,SOFT_STRENGTH:.5,MV_W:1920,MV_H:1080,
  photoSizesRef:{current:{'selected-image':{width:1920,height:1080}}},
  mvPhotoMotions:(_picks,_seed,sizes)=>{seen.push(sizes);return [];},allFonts:async()=>({}),
  avDecorateConfig:options=>{seen.push(options.sizes);return {};},run:async()=>({link:null,openError:null}),sayError:(_lang,error)=>error.message});
 vm.runInContext(topLevel(plain,plugin==='mini-vlog'?'prepareMiniDecoration':'decorate')+'\nthis.finish='+(plugin==='mini-vlog'?'prepareMiniDecoration':'decorate')+';',f.box);
 const result={sequenceId:'result',videoEnd:60,fps:30,plan:f.plan,photoSizes:Object.freeze({'selected-image':Object.freeze({width:96,height:160})}),frozen:{seed:1,preset:'preset',fields:{},clipSound:'full',punch:false,soft:false,music:'none',look:{on:false},credit:{on:false}}};
 if(plugin==='mini-vlog'){const finishAssets=await f.box.snapshotMiniFinishAssets(f.box.assets,{preset:'preset'},'en',async()=>'',()=>{});await f.box.finish({...result,finishAssets}, {sequenceId:'result',totalFrames:60,fps:30},()=>{});}
 else await f.box.finish(result,()=>{});
 assert.equal(seen.length,1);assert.deepEqual(JSON.parse(JSON.stringify(seen[0]['selected-image'])),{width:96,height:160});
});
for(const sources of [[],[{resourceId:'other',name:'Portrait',path:'/photo.png',width:96,height:160}],[{resourceId:'selected',name:'Portrait',path:'/photo.png',width:Infinity,height:160}]])test('Shared ID preflight: a partial or contradictory response cannot supply Image facts '+JSON.stringify(sources),async()=>{
 let calls=0;const sdk={runScript:async input=>{calls++;assert.equal(input.allowCommit,false);return {result:{sources}};}};
 await assert.rejects(prepareNativeImagesById(sdk,'p',[{resourceId:'selected',name:'Portrait'}]),/confirm.*identities.*dimensions/);assert.equal(calls,1);
});
test('Shared ID preflight: invalid selections stop before SDK dispatch',async()=>{
 let calls=0;const sdk={runScript:async()=>{calls++;throw Error('dispatch forbidden');}};
 await assert.rejects(prepareNativeImagesById(sdk,'p',[{resourceId:'selected'}]),/identities/);assert.equal(calls,0);
});
test('Mini photo selection control: excluded unavailable photos do not enter preflight or assembly',async t=>{
 const f=await selectedPhoto(t,{missing:true});f.box.usePhotos=false;f.plan.picks=[{rid:'r0',kind:'video'},{rid:'r1',kind:'video'}];
 const result=await f.run();assert.ok(result);assert.equal(f.imports.length,1);assert.equal(f.scripts.filter(row=>row.summary==='Verify original Project Images').length,0);assert.equal(result.crops['selected-image'],undefined);
});
function manyPhotoSdk({bounded=false,afterRead=()=>{}}={}){
 const selected=Array.from({length:129},(_,i)=>({resourceId:'image-'+i,name:'Photo '+i+' '+ 'x'.repeat(2200)})),calls=[];
 const project={resources:async()=>selected.map(row=>({...row,type:'Image'})),sourceFiles:async()=>({fileTree:selected.map(row=>({...row,path:'/original/'+row.resourceId+'.png',frameSize:{width:96,height:160}}))})};
 const files={stat:async()=>({size:8,isDirectory:false,mtimeMs:1,ino:1}),readRange:async()=>({bytesRead:1,base64:'iQ=='})};
 const sdk={runScript:async request=>{
  calls.push(request);assert.equal(request.allowCommit,false);
  if(bounded&&Buffer.byteLength(request.script)>256*1024)return {isError:true,output:'Script exceeds the real transport limit.'};
  const result=await vm.runInNewContext('(async()=>{'+request.script+'})()',{selects:{project:()=>project,files}});await afterRead();return {result};
 }};return {sdk,selected,calls};
}
test('Shared ID preflight: a large valid selection is chunked below transport limits without changing order',async()=>{
 const f=manyPhotoSdk({bounded:true}),result=await prepareNativeImagesById(f.sdk,'p',f.selected);
 assert.deepEqual(result.sources.map(row=>row.resourceId),f.selected.map(row=>row.resourceId));assert.ok(f.calls.length>1);assert.ok(f.calls.every(row=>Buffer.byteLength(row.script)<256*1024));
});
test('Shared ID preflight: a detached owner stops before the next read and never returns late facts',async()=>{
 let live=true;const f=manyPhotoSdk({afterRead:()=>{live=false;}});
 await assert.rejects(prepareNativeImagesById(f.sdk,'p',f.selected,{isCurrent:()=>live}),error=>error.code==='image-source-stopped');assert.equal(f.calls.length,1);
});
test('Shared ID preflight: a late successful read cannot exceed its overall deadline',async()=>{
 const f=manyPhotoSdk({afterRead:()=>new Promise(resolve=>setTimeout(resolve,30))});
 await assert.rejects(prepareNativeImagesById(f.sdk,'p',f.selected.slice(0,1),{timeoutMs:5}),error=>error.code==='image-source-timeout');assert.equal(f.calls.length,1);
});
test('Shared ID preflight: an oversized single identity is rejected before dispatch',async()=>{
 const f=manyPhotoSdk();await assert.rejects(prepareNativeImagesById(f.sdk,'p',[{resourceId:'image-0',name:'x'.repeat(20000)}]),/input.*budget|selection.*budget/i);assert.equal(f.calls.length,0);
});
test('Shared ID preflight: an already detached request performs no SDK work',async()=>{
 const f=manyPhotoSdk();await assert.rejects(prepareNativeImagesById(f.sdk,'p',f.selected,{isCurrent:()=>false}),error=>error.code==='image-source-stopped');assert.equal(f.calls.length,0);
});
