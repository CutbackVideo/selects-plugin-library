import fs from 'node:fs';import vm from 'node:vm';import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {topLevel} from './windows_host.mjs';import {miniMusicFixture} from './mini_music_fixture.mjs';
const require=createRequire(import.meta.url),esbuild=require(process.env.SELECTS_ESBUILD||process.env.SBS_PANEL_TEST_MODULES+'/esbuild');
const plain=esbuild.transformSync(fs.readFileSync(new URL('../plugins/mini-vlog/panel.tsx',import.meta.url),'utf8'),{loader:'tsx',format:'esm',jsx:'preserve'}).code,nested=plain.replace(/^  /gm,'');
test('Mini run ownership: an old run cannot release a newer busy state in the same Project',()=>{
 const writes=[],box=vm.createContext({projectRef:{current:'p'},mountedRef:{current:true},runEpochRef:{current:2},busyRef:{current:true},setBusy:v=>writes.push(v),setStep:()=>{},setProgress:()=>{},progressRef:{current:{}}});
 const live=nested.includes('const runLive =')?topLevel(nested,'runLive'):'';vm.runInContext(live+'\n'+topLevel(nested,'endRun')+'\nthis.end=endRun;',box);box.end('p',1);assert.equal(box.busyRef.current,true);assert.deepEqual(writes,[]);
});
test('Mini run ownership: A to B to A cannot revive an old assembly callback',async t=>{
 const f=await miniMusicFixture(t,{entry:'panel',silent:true});f.box.runEpochRef={current:0};let accepted;
 f.box.executeTemplateAssembly=async(_sdk,_files,_scope,_config,_source,current)=>{f.box.projectRef.current='other';f.box.runEpochRef.current++;f.box.projectRef.current='p';try{current();accepted=true;}catch(e){assert.equal(e,f.box.STALE);accepted=false;}throw f.box.STALE;};
 await f.box.api.build(1);assert.equal(accepted,false);
});
function local(){
 const checking=[],controller=new AbortController(),calls={score:0},hooks={};let release;const done=new Promise(resolve=>release=resolve);
 const box=vm.createContext({sdk:{},panelLocalClient:()=>({}),mountedRef:{current:true},projectRef:{current:'p'},localAbortRef:{current:null},PLUGIN_ID:'mini-vlog',MV_LOCAL_CONCURRENCY:2,MV_LOCAL_BUDGET_MS:1000,CANCELLED:Symbol('cancelled'),STALE:Symbol('stale'),
  mvHostDataDir:async()=>hooks.folder?hooks.folder():'/data',mvQuickCheckAvailable:()=>true,setChecking:v=>checking.push(v),console:{info(){}},
  quickScoreAll:async()=>{calls.score++;return hooks.hold?done:new Map();}});
 vm.runInContext(topLevel(nested,'checkLocalClips')+'\nthis.local=checkLocalClips;',box);
 return {box,checking,controller,calls,hooks,release:()=>release(new Map()),run:()=>box.local([{rid:'r0',duration:20,path:'/video'}],'p',controller,()=>{})};
}
test('Mini local analysis: late folder lookup cannot launch scoring after a Project switch',async()=>{
 const f=local();let release;f.hooks.folder=()=>new Promise(resolve=>release=resolve);const pending=f.run();f.box.projectRef.current='other';release('/data');await assert.rejects(pending,e=>e===f.box.STALE);assert.equal(f.calls.score,0);assert.deepEqual(f.checking,[]);assert.equal(f.box.localAbortRef.current,null);
});
test('Mini local analysis: old cleanup cannot hide a replacement check or clear its controller',async()=>{
 const f=local();f.hooks.hold=true;const pending=f.run();await new Promise(resolve=>setImmediate(resolve));assert.equal(f.calls.score,1);const replacement=new AbortController();f.box.localAbortRef.current=replacement;f.checking.length=0;f.release();await pending;assert.equal(f.box.localAbortRef.current,replacement);assert.deepEqual(f.checking,[]);
});
function scene(run){const box=vm.createContext({assets:{scripts:{searchJs:'query'}},SEARCH_BATCH:6,projectRef:{current:'p'},fill:()=> 'query',run});vm.runInContext(topLevel(nested,'findCandidates')+'\nthis.find=findCandidates;',box);return box;}
test('Mini scene search: an ended caller cannot emit progress or dispatch another query',async()=>{
 let calls=0,progress=0;const stopped=Symbol('stale'),box=scene(async()=>{calls++;return {candidates:[],failed:[]};});await assert.rejects(box.find(['r0'],'p',()=>{throw stopped;},{role:'query'},()=>{progress++;}),e=>e===stopped);assert.equal(calls,0);assert.equal(progress,0);
});
test('Mini scene search: retry liveness observes cancellation in the same Project and preserves its signal',async()=>{
 let live=true,after;const stopped=Symbol('cancelled'),check=()=>{if(!live)throw stopped;};const box=scene(async(_summary,_script,_commit,opts)=>{assert.equal(opts.wanted(),true);live=false;after=opts.wanted();throw Error('late query failure');});
 await assert.rejects(box.find(['r0'],'p',check,{role:'query'},()=>{}),e=>e===stopped);assert.equal(after,false);
});
