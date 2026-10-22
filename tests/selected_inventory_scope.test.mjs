import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {topLevel} from './windows_host.mjs';
const require=createRequire(import.meta.url),esbuild=require(process.env.SELECTS_ESBUILD||process.env.SBS_PANEL_TEST_MODULES+'/esbuild');
const sources={};
for(const plugin of ['mini-vlog','archive-vlog'])sources[plugin]=esbuild.transformSync(fs.readFileSync(new URL('../plugins/'+plugin+'/panel.tsx',import.meta.url),'utf8'),{loader:'tsx',format:'esm',jsx:'preserve'}).code;
function fixture(plugin){
 const plain=sources[plugin],name=plugin==='mini-vlog'?'runMiniVlogTemplate':'runArchiveVlogTemplate';
 const script=fs.readFileSync(new URL('../plugins/'+plugin+'/scripts/inventory.js',import.meta.url),'utf8');
 const hooks={},calls=[],boundary=Error('Catalog accepted: planning outside this fixture');let live=true;
 const rows=Array.from({length:64},(_,i)=>({resourceId:'r'+i,name:'Video '+i,type:'Video',durationSeconds:20,hasAnalysis:true}));
 const project={resources:async()=>rows,sourceFiles:async()=>{if(hooks.incomplete)throw Error('Source tree unavailable');return {fileTree:rows.map(row=>({resourceId:row.resourceId,path:'/video/'+row.resourceId+'.mp4',frameSize:{width:1920,height:1080}}))};}};
 const cue={id:'cue'},presets={presets:[{id:'preset',label:'Preset'}]},manifest={cues:[cue]};
 const selected=[{resourceId:'original-0',kind:'video'},{resourceId:'original-1',kind:'video'}];
 const sdk={runScript:async input=>{calls.push(input);assert.equal(input.allowCommit,false,'catalog must never commit');await hooks.before?.(calls.length);const result=await vm.runInNewContext('(async()=>{'+input.script+'})()',{selects:{project:()=>project}});await hooks.after?.(calls.length,result);return {result};}};
 const box=vm.createContext({openTemplateAssemblyContinuations:async()=>({read:async()=>null}),panelLocalClient:()=>({files:{}}),PLUGIN_ID:plugin,TextEncoder,setTimeout,clearTimeout,console:{warn(){}},sdk,DEFAULT_CUE:'cue',PREFERRED_CUE:'cue',DEFAULT_PRESET:'preset',DEFAULT_LENGTH:'standard',DEFAULT_PACE:'quick',DEFAULT_PUNCH:true,TEMPLATE_ALIAS_BATCH:6,INVENTORY_MEASURE_MS:0,
  TEMPLATE_ALIAS_JS:'resolve original inputs',EMPTY_READ:/Cannot read properties of (undefined|null)|is not iterable/,
  locateRoots:async()=>({plugin:'/installed'}),uiLang:()=> 'en',t:(_lang,key)=>key,uiError:say=>Error(say('en')),avPreset:()=>presets.presets[0],
  loadAssets:async()=>({manifest,presets,scripts:{inventoryJs:script}}),readText:async(_root,rel)=>rel==='scripts/inventory.js'?script:JSON.stringify(rel.includes('presets')?presets:manifest),
  nativeImageRun:async()=>({resolved:selected.map((row,i)=>({rid:row.resourceId,alias:hooks.aliases?.[i]??'r'+i,size:null})),failed:[]}),
  validateTemplateMediaResult:value=>value,cueGrid:()=>{throw boundary;}});
 vm.runInContext(['fill','runTemplateStep','templateFootage','templateIssue','readInventoryPages',name].map(n=>topLevel(plain,n)).join('\n')+'\nthis.run='+name+';',box);
 const run=()=>box.run(sdk,{projectId:'p',template:{runId:'fixture-run',inputs:{footage:selected}}},()=>{if(!live)throw Error('Run detached');},()=>{});
 return {box,hooks,calls,rows,boundary,run,stop:()=>{live=false;}};
}
for(const plugin of ['mini-vlog','archive-vlog']){
 test(plugin+': selected files collect and verify raw Project pages before planning',async()=>{const f=fixture(plugin);await assert.rejects(f.run(),e=>e===f.boundary);assert.equal(f.calls.length,4);assert.ok(f.calls.every(row=>row.timeoutSeconds>0&&row.timeoutSeconds<=90));});
 test(plugin+': selected source metadata changes cannot reach planning',async()=>{const f=fixture(plugin);f.hooks.after=call=>{if(call===1)f.rows[0].durationSeconds=11;};await assert.rejects(f.run(),e=>e!==f.boundary&&e.code==='MEDIA_INVENTORY_CHANGED');});
 test(plugin+': selected catalog incomplete source tree cannot reach planning',async()=>{const f=fixture(plugin);f.hooks.incomplete=true;await assert.rejects(f.run(),e=>e!==f.boundary&&e.code==='MEDIA_INVENTORY_INCOMPLETE');});
 test(plugin+': a detached selected run stops before its next page',async()=>{const f=fixture(plugin);f.hooks.after=call=>{if(call===1)f.stop();};await assert.rejects(f.run(),e=>e!==f.boundary);assert.equal(f.calls.length,1);});
}
function runner(plugin,{now=0}={}){
 const hooks={},calls=[],delays=[];let time=now,live=true;
 const box=vm.createContext({EMPTY_READ:/is not iterable/,console:{warn(){}},Date:{now:()=>time},setTimeout:done=>{hooks.wait?.();done();},uiError:say=>Error(say('en')),t:(_lang,key)=>key});
 vm.runInContext(topLevel(sources[plugin],'runTemplateStep')+'\nthis.run=runTemplateStep;',box);
 const sdk={runScript:async input=>{calls.push(input);return hooks.send?hooks.send(calls.length):{result:{ok:true}};}};
 const scope={wanted:()=>live,deadline:now+120000,wait:async ms=>{delays.push(ms);await hooks.wait?.();}};
 return {box,hooks,calls,delays,scope,run:(script='read',commit=false)=>box.run(sdk,'Read footage',script,commit,scope),stop:()=>{live=false;},advance:ms=>{time+=ms;}};
}
for(const plugin of ['mini-vlog','archive-vlog']){
 test(plugin+': selected read sends remaining deadline and regenerates scripts for empty retry',async()=>{const f=runner(plugin);f.scope.deadline=2300;f.hooks.send=n=>n===1?{result:undefined}:{result:{ok:true}};f.hooks.wait=()=>f.advance(1500);await f.run(attempt=>'attempt-'+attempt);assert.deepEqual(f.calls.map(r=>[r.script,r.timeoutSeconds]),[['attempt-0',3],['attempt-1',1]]);assert.deepEqual(f.delays,[1500]);});
 for(const reply of [{isError:true,output:'No valid session ID'},{result:undefined}])test(plugin+': selected read cannot retry after detachment '+JSON.stringify(reply),async()=>{const f=runner(plugin);f.hooks.send=n=>n===1?reply:{result:{ok:true}};f.hooks.wait=f.stop;await assert.rejects(f.run(),e=>e.code==='MEDIA_INVENTORY_STOPPED');assert.equal(f.calls.length,1);});
 test(plugin+': selected read cannot retry after its deadline',async()=>{const f=runner(plugin);f.scope.deadline=100;f.hooks.send=n=>n===1?{isError:true,output:'No valid session ID'}:{result:{ok:true}};f.hooks.wait=()=>f.advance(101);await assert.rejects(f.run(),e=>e.code==='MEDIA_INVENTORY_TIMEOUT');assert.equal(f.calls.length,1);});
 test(plugin+': selected read rejects a late successful reply',async()=>{const f=runner(plugin);f.hooks.send=()=>{f.advance(120001);return {result:{ok:true}};};await assert.rejects(f.run(),e=>e.code==='MEDIA_INVENTORY_TIMEOUT');});
 test(plugin+': committing calls ignore catalog clocks and never retry a lost reply',async()=>{const f=runner(plugin);f.scope.wanted=()=>{throw Error('catalog liveness accessed by commit');};Object.defineProperty(f.scope,'deadline',{get(){throw Error('catalog clock accessed by commit');}});f.hooks.send=()=>({isError:true,output:'No valid session ID'});await assert.rejects(f.run('commit',true),/No valid session ID/);assert.deepEqual(JSON.parse(JSON.stringify(f.calls)),[{summary:'Read footage',script:'commit',allowCommit:true}]);assert.equal(f.delays.length,0);});
}

for(const plugin of ['mini-vlog','archive-vlog'])test(plugin+': selected files on later raw pages retain their alias filter',async()=>{
 const f=fixture(plugin),observed=[];f.hooks.aliases=['r40','r41'];f.hooks.after=(_call,result)=>observed.push(Array.from(result.resources,row=>row.rid));
 await assert.rejects(f.run(),e=>e===f.boundary);assert.equal(f.calls.length,4);assert.deepEqual(observed,[[],['r40','r41'],[],['r40','r41']]);
});
for(const complete of [false,true])test('inventory completeness policy preserves the display/build distinction '+complete,async()=>{
 const read=vm.runInNewContext(topLevel(sources['mini-vlog'],'readInventoryPages')+';readInventoryPages;',{TextEncoder,setTimeout,clearTimeout});let calls=0;
 const run=async()=>{calls++;return {page:{total:0,elapsedMs:0},resources:[],photos:[],incomplete:true};};
 const result=read(run,'query',{projectId:'p'},()=> 'query',()=>true,{requireComplete:complete});
 if(complete)await assert.rejects(result,e=>e.code==='MEDIA_INVENTORY_INCOMPLETE');else assert.equal((await result).incomplete,true);assert.equal(calls,2);
});
test('invalid inventory completeness policy stops before SDK dispatch',async()=>{
 const read=vm.runInNewContext(topLevel(sources['mini-vlog'],'readInventoryPages')+';readInventoryPages;',{TextEncoder,setTimeout,clearTimeout});let calls=0;
 await assert.rejects(read(async()=>{calls++;},'query',{projectId:'p'},()=> 'query',()=>true,{requireComplete:'true'}),e=>e.code==='MEDIA_INVENTORY_INPUT');assert.equal(calls,0);
});
