import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import {createRequire} from 'node:module';
import * as inputFeature from '../shared/native-image-input.mjs';
import {topLevel} from './windows_host.mjs';
import {checkScriptTypes} from './run_script_types.mjs';

function fixture(plugin,mode='healthy'){
 const panel=fs.readFileSync(new URL('../plugins/'+plugin+'/panel.tsx',import.meta.url),'utf8');
 const box={resolveTemplateMedia:inputFeature.resolveTemplateMedia,nativeImageSources:inputFeature.nativeImageSources,nativeImageSourcesById:inputFeature.nativeImageSourcesById};vm.runInNewContext(topLevel(panel,'TEMPLATE_ALIAS_JS')+'\nthis.script=TEMPLATE_ALIAS_JS;',box);
 const calls={create:0,insert:0,commit:0,read:0},files=[{rid:'original-video',kind:'video'},{rid:'original-image',kind:'image'}];
 let nextClip=1;
 const selects={files:{stat:async()=>({size:32,isDirectory:false,mtimeMs:1,ino:1}),readRange:async()=>({bytesRead:1,base64:'iQ=='})},project:()=>({
  resources:async()=>[{resourceId:'r0',type:'Video'},{resourceId:'r1',type:'Image'}],
  sourceFiles:async()=>{if(mode==='dimensions-failure')throw Error('frame metadata unavailable '+'.'.repeat(700));return {fileTree:[{resourceId:'r1',type:'image',path:'/original.png',frameSize:{width:96,height:160}}]};},
  createDraft:async()=>{
  calls.create++;if(mode==='create-failure')throw Error('project database temporarily unavailable');const clips=[];let inserted=0;
  return {clips:async()=>{calls.read++;if(mode==='unknown-readback'&&inserted)throw Error('readback failed');return clips.map(c=>({...c}));},
   insertResource:async({resourceId,sourceRange})=>{
    calls.insert++;inserted++;
    if(mode==='both-fail')throw Object.assign(Error('sequence_settings_mismatch: source exists'),{code:'sequence_settings_mismatch'});
    if((mode==='fallback'||mode==='unknown-readback')&&sourceRange)throw Error('invalid_source_range');
    if(mode==='no-clip')return;
    clips.push({clipId:nextClip++,resourceId:mode==='invalid-alias'?undefined:resourceId==='original-video'?'r0':'r1'});
    if(mode==='many-clips')clips.push({clipId:nextClip++,resourceId:'other'});
    if(mode==='lost-reply'&&sourceRange)throw Error('insertion completed; reply lost');
   },meta:async()=>{if(mode==='dimensions-failure')throw Error('frame metadata unavailable '+'.'.repeat(700));return {frameSize:{width:1920,height:1080}};},
   commitAll:async()=>{calls.commit++;throw Error('resolution must never commit');},
  };
 }})};
 const run=async(chosen=files)=>{
  const script=box.script.replace('__CONFIG__',()=>JSON.stringify({projectId:'p',files:chosen}));
  const result=await new Function('selects','return (async()=>{'+script+'})();')(selects);
  return JSON.parse(JSON.stringify(result));
 };
 return {run,calls,files,script:box.script};
}

function caller(plugin){
 const panel=fs.readFileSync(new URL('../plugins/'+plugin+'/panel.tsx',import.meta.url),'utf8');
 const name=plugin==='mini-vlog'?'runMiniVlogTemplate':'runArchiveVlogTemplate';
 const require=createRequire(import.meta.url),esbuild=require(process.env.SELECTS_ESBUILD||process.env.SBS_PANEL_TEST_MODULES+'/esbuild');
 const plain=esbuild.transformSync(panel,{loader:'tsx',format:'esm',target:'es2022',jsx:'preserve'}).code;
 const source=[...plugin==='archive-vlog'?['avVideoRequirement']:[],'TEMPLATE_ALIAS_JS','EMPTY_READ','runTemplateStep','nativeImageRun','templateFootage','templateIssue','fill',name].map(n=>topLevel(plain,n)).join('\n')+'\nexport {runTemplateStep,nativeImageRun,'+name+' as run};';
 const module={exports:{}};
 const cue={id:'cue'},presets={presets:[{id:'preset',label:'Preset'}]},manifest={cues:[cue]};
 vm.runInNewContext(esbuild.transformSync(source,{loader:'ts',format:'cjs',target:'es2022'}).code,{
  module,exports:module.exports,openTemplateAssemblyContinuations:async()=>({read:async()=>null}),panelLocalClient:()=>({files:{}}),PLUGIN_ID:plugin,templateMediaSelection:inputFeature.templateMediaSelection,resolveTemplateMedia:inputFeature.resolveTemplateMedia,validateTemplateMediaResult:inputFeature.validateTemplateMediaResult,nativeImageSources:inputFeature.nativeImageSources,nativeImageSourcesById:inputFeature.nativeImageSourcesById,
  setTimeout:fn=>fn(),console:{warn(){}},DEFAULT_CUE:'cue',PREFERRED_CUE:'cue',DEFAULT_PRESET:'preset',DEFAULT_LENGTH:'standard',TEMPLATE_ALIAS_BATCH:6,
  uiLang:()=> 'en',locateRoots:async()=>({plugin:'/installed'}),avPreset:()=>presets.presets[0],
  loadAssets:async()=>({manifest,presets,scripts:{inventoryJs:'inventory'}}),
  readText:async(_root,rel)=>JSON.stringify(rel.includes('presets')?presets:manifest),
  t:(_language,key,values)=>key==='stepFailed'?'Selects could not complete this step.':key==='tpl.notFound'?'None of the chosen files could be found.':key==='tpl.notFoundDetail'?'Selects said: '+values.detail:key,
 });
 return module.exports;
}
for(const plugin of ['mini-vlog','archive-vlog']){
 for(const response of [{result:undefined},{isError:true,output:'No valid session ID'}])test(plugin+': private source scripts cannot replay an unconfirmed response '+JSON.stringify(response),async()=>{
  const api=caller(plugin);let calls=0;const sdk={runScript:async input=>{calls++;assert.equal(input.allowCommit,false);return response;}};
  await assert.rejects(api.nativeImageRun(sdk,'source-script','source check',false));assert.equal(calls,1);
 });
 test(plugin+': ordinary read observation keeps its existing bounded retry',async()=>{
  const api=caller(plugin);let calls=0;const r=await api.runTemplateStep({runScript:async()=>++calls===1?{result:undefined}:{result:{observed:true}}},'read','read-script');assert.equal(r.observed,true);assert.equal(calls,2);
 });
 for(const clipped of [false,true])test(plugin+': template caller rejects source failure without replay or a missing-file diagnosis (clipped='+clipped+')',async()=>{
  const api=caller(plugin);let calls=0;const chosen=[{resourceId:'original-video',kind:'video'},...plugin==='archive-vlog'?[{resourceId:'original-other-video',kind:'video'}]:[]],context={projectId:'p',template:{runId:'fixture-run',inputs:{footage:chosen},options:{}}};
  const sdk={runScript:async()=>{calls++;return {result:{resolved:[],failed:clipped?[]:chosen.map(row=>({rid:row.resourceId,phase:'insert',code:'source-resolution-failed',error:'sequence_settings_mismatch'}))}};}};
  const error=await api.run(sdk,context,()=>{},()=>{}).then(()=>null,error=>error);
  assert.ok(error);assert.equal(calls,1);assert.doesNotMatch(error.message,/could be found|not found/i);assert.equal(error.code,clipped?'source-resolution-unknown':'source-resolution-failed');
  if(!clipped)assert.equal(error.failures[0].error,'sequence_settings_mismatch');
 });
}

for(const plugin of ['mini-vlog','archive-vlog']){
 test(plugin+': preparation errors remain failures with their actual phase and reason',async()=>{
  const f=fixture(plugin,'both-fail'),r=await f.run([f.files[0]]);assert.deepEqual(r.resolved,[]);assert.equal(r.failed.length,1);
  assert.equal(r.failed[0].rid,'original-video');assert.equal(r.failed[0].phase,'insert');assert.match(r.failed[0].error,/sequence_settings_mismatch/);assert.equal(f.calls.commit,0);
  assert.equal(f.calls.insert,1,'an arbitrary failed placement cannot authorize a whole-source replay');
 });
 test(plugin+': an acknowledged insertion with no new clip is unknown, never a missing file',async()=>{
  const f=fixture(plugin,'no-clip'),r=await f.run([f.files[0]]);assert.equal(r.resolved.length,0);assert.equal(r.failed[0].code,'source-resolution-unknown');assert.equal(r.failed[0].phase,'readback');assert.equal(f.calls.insert,1);
 });
 test(plugin+': invalid aliases cannot become resolved inputs',async()=>{
  const f=fixture(plugin,'invalid-alias'),r=await f.run([f.files[0]]);assert.equal(r.resolved.length,0);assert.equal(r.failed[0].phase,'readback');
 });
 test(plugin+': ambiguous new clips cannot choose an arbitrary source alias',async()=>{
  const f=fixture(plugin,'many-clips'),r=await f.run([f.files[0]]);assert.equal(r.resolved.length,0);assert.equal(r.failed[0].phase,'readback');
 });
 test(plugin+': a completed insertion whose reply is lost is not inserted again',async()=>{
  const f=fixture(plugin,'lost-reply'),r=await f.run([f.files[0]]);assert.deepEqual(r.resolved,[{rid:'original-video',alias:'r0',size:null,...plugin==='archive-vlog'?{kind:'video'}:{}}]);assert.equal(f.calls.insert,1);assert.deepEqual(r.failed,[]);
 });
 test(plugin+': a known non-mutating short-range failure retains the whole-source fallback',async()=>{
  const f=fixture(plugin,'fallback'),r=await f.run([f.files[0]]);assert.deepEqual(r.resolved,[{rid:'original-video',alias:'r0',size:null,...plugin==='archive-vlog'?{kind:'video'}:{}}]);assert.equal(f.calls.insert,2);assert.equal(f.calls.commit,0);
 });
 test(plugin+': an unknown readback cannot authorize another insertion',async()=>{
  const f=fixture(plugin,'unknown-readback'),r=await f.run([f.files[0]]);assert.equal(r.resolved.length,0);assert.equal(r.failed[0].phase,'readback');assert.equal(f.calls.insert,1);
 });
 test(plugin+': photo metadata failure remains distinct and diagnostics are bounded',async()=>{
  const f=fixture(plugin,'dimensions-failure'),r=await f.run([f.files[1]]);assert.equal(r.resolved.length,0);assert.equal(r.failed[0].phase,'dimensions');assert.match(r.failed[0].error,/frame metadata unavailable/);assert.ok(r.failed[0].error.length<=300);
 });
 test(plugin+': healthy video and image inputs retain aliases, native sizes and zero commits',async()=>{
  const f=fixture(plugin),r=await f.run();assert.deepEqual(r.resolved,[{rid:'original-video',alias:'r0',size:null,...plugin==='archive-vlog'?{kind:'video'}:{}},{rid:'original-image',alias:'r1',size:{width:96,height:160},...plugin==='archive-vlog'?{kind:'image'}:{}}]);assert.equal(f.calls.create,2);assert.equal(f.calls.insert,2);assert.equal(f.calls.commit,0);
 });
 test(plugin+': a Project/Draft creation failure is not converted to file absence',async()=>{
  const f=fixture(plugin,'create-failure'),r=await f.run([f.files[0]]);assert.equal(r.resolved.length,0);assert.equal(r.failed[0].phase,'create');assert.match(r.failed[0].error,/database/);assert.equal(f.calls.insert,0);
 });
}

for(const plugin of ['mini-vlog','archive-vlog'])test(plugin+': emitted source-check script passes actual SDK declarations',()=>{
 const f=fixture(plugin),script=f.script.replace('__CONFIG__',()=>JSON.stringify({projectId:'p',files:f.files}));assert.ok(checkScriptTypes([{name:plugin+' source resolution',script}]).scripts>0);
});
for(const invalid of [null,{}, {resolved:[],failed:[]}, {resolved:[{rid:'foreign',alias:'r0',size:null}],failed:[]}, {resolved:[{rid:'original',alias:'',size:null}],failed:[]}, {resolved:[{rid:'original',alias:'r0',size:{width:0,height:1}}],failed:[]}])test('Source result: incomplete or contradictory reply cannot drop input '+JSON.stringify(invalid),()=>{
 assert.throws(()=>inputFeature.validateTemplateMediaResult(invalid,[{rid:'original',kind:'video'}]),error=>error.code==='source-resolution-unknown');
});
function duplicatePathImageSdk(){
 const nodes=['r1','r2'].map(resourceId=>({resourceId,type:'image',path:'/original.png',frameSize:{width:96,height:160}}));
 return {project:()=>({resources:async()=>nodes.map(n=>({resourceId:n.resourceId,type:'Image'})),sourceFiles:async()=>({fileTree:nodes})}),files:{stat:async()=>({size:32,isDirectory:false}),readRange:async()=>({bytesRead:1,base64:'iQ=='})}};
}
test('Known source alias: another Resource at the same file path does not replace or hide the selected Image',async()=>{
 const result=await inputFeature.nativeImageSourcesById(duplicatePathImageSdk(),'p',[{resourceId:'r1',name:'chosen'}]);assert.equal(result[0].resourceId,'r1');assert.equal(result[0].width,96);
});
test('Existing Image consumers: their strict path ambiguity contract remains unchanged',async()=>{
 await assert.rejects(inputFeature.nativeImageSources(duplicatePathImageSdk(),'p',[{resourceId:'r1',name:'chosen',path:'/original.png'}]),/ambiguous/);
});

for(const includeTiming of [false,true])test('Source clocks: independent native probes preserve legacy alias-only callers (timing='+includeTiming+')',async()=>{
 let creates=0;const selects={project:()=>({createDraft:async()=>{creates++;let fps=30;const rows=[];return {insertResource:async({resourceId})=>{if(!rows.length)fps=resourceId==='r25'?25:30;rows.push({clipId:rows.length+1,resourceId});},clips:async()=>rows,meta:async()=>({fps})};}})};
 const result=await inputFeature.resolveTemplateMedia(selects,'p',[{rid:'r25',kind:'video'},{rid:'r30',kind:'video'}],'Clock fixture',{includeTiming,dimensions:false});
 assert.equal(result.failed.length,0);assert.equal(creates,includeTiming?2:1);assert.equal(result.resolved.length,2);
 if(includeTiming)assert.deepEqual(result.resolved.map(r=>r.timing.insertionFps),[25,30]);else assert.ok(result.resolved.every(r=>!('timing' in r)));
});
test('Source clocks: unreadable clock is an explicit timing failure, never a fabricated fallback rate',async()=>{
 const selects={project:()=>({createDraft:async()=>({insertResource:async()=>{},clips:async()=>[{clipId:1,resourceId:'r'}],meta:async()=>({fps:NaN})})})};let reads=0;
 selects.project=()=>({createDraft:async()=>{const rows=[];return {insertResource:async()=>rows.push({clipId:1,resourceId:'r'}),clips:async()=>rows,meta:async()=>{reads++;return {fps:NaN};}};}});
 const r=await inputFeature.resolveTemplateMedia(selects,'p',[{rid:'r',kind:'video'}],'Clock fixture',{includeTiming:true,dimensions:false});assert.equal(r.resolved.length,0);assert.equal(r.failed[0].phase,'timing');assert.equal(reads,1);
});
