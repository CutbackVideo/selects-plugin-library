import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createRequire} from 'node:module';
import {topLevel} from './windows_host.mjs';
import {miniMusicFixture} from './mini_music_fixture.mjs';
const require=createRequire(import.meta.url),esbuild=require(process.env.SELECTS_ESBUILD||process.env.SBS_PANEL_TEST_MODULES+'/esbuild'),ts=require(process.env.SBS_PANEL_TEST_MODULES+'/typescript');
const sources={};
for(const plugin of ['mini-vlog','archive-vlog']){
 const panel=fs.readFileSync(new URL('../plugins/'+plugin+'/panel.tsx',import.meta.url),'utf8'),plain=esbuild.transformSync(panel,{loader:'tsx',format:'esm',jsx:'preserve'}).code;
 const ast=ts.createSourceFile('panel.tsx',plain,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),name=plugin==='mini-vlog'?'MiniVlogPanel':'ArchiveVlogPanel';
 const component=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);assert.ok(component?.body);
 sources[plugin]={plain,nested:component.body.getText(ast).slice(1,-1).replace(/^  /gm,'')};
}
function consumer(plugin){
 const {plain,nested}=sources[plugin],old={resources:[{rid:'r0',name:'Video',kind:'video',duration:20,width:1920,height:1080,path:'/video.mp4',analysed:true,status:'ready'}],photos:[{rid:'ph0',name:'Photo',kind:'photo',width:96,height:160}],skipped:{unanalysed:0,notAnalysed:0},incomplete:false};
 const state={inventory:old,candidates:{cached:true},error:null,loading:false},hooks={};let box;
 const g={projectId:'p',projectRef:{current:'p'},mountedRef:{current:true},inventorySnapshotRef:{current:{projectId:'p',inventory:old}},invLoadingRef:{current:null},busyRef:{current:false},inventoryJsRef:{current:'query'},invSigRef:{current:null},photoSizesRef:{current:{ph0:{width:96,height:160}}},
  inventory:old,assets:{},roots:{},INVENTORY_MEASURE_MS:4000,INCOMPLETE_POLL_MAX:3,WAIT_POLL_MAX:3,WAITING_POLL_MAX:3,incompleteReadsRef:{current:0},waitReadsRef:{current:0},waitingReadsRef:{current:0},
  readInventoryPages:async()=>{if(hooks.read)return hooks.read();return structuredClone(hooks.next??old);},run:()=>{},fill:()=>{},BusyError:class extends Error{},sayError:(_lang,error)=>error.message,
  setInvLoading:value=>{state.loading=value;box.invLoading=value;},setInventory:value=>{state.inventory=value;box.inventory=value;},setInvError:value=>{state.error=value;box.invError=value;},setCandidates:value=>state.candidates=value,
  setIncompleteStalled:()=>{},setWaitStalled:()=>{},setWaitingStalled:()=>{},mvFootageCounts:()=>({unusable:0}),console:{warn:()=>{}}};
 box=vm.createContext(g);
 const admission=plain.includes('function isInventorySnapshotCurrent(')?topLevel(plain,'isInventorySnapshotCurrent')+'\n'+topLevel(nested,'inventoryCurrent'):'';
 vm.runInContext(admission+'\n'+topLevel(nested,'loadInventory')+'\nthis.load=loadInventory;this.ready=()=>{'+topLevel(nested,'ready')+'\nreturn ready;};',box);
 return {box,state,hooks,old,load:(...args)=>box.load(...args)};
}
for(const plugin of ['mini-vlog','archive-vlog']){
 test(plugin+': a pending refresh blocks Build using the previous rendered list',async()=>{const f=consumer(plugin);let resolve;f.hooks.read=()=>new Promise(done=>resolve=done);const pending=f.load();assert.equal(f.box.ready(),false);resolve(structuredClone(f.old));await pending;assert.equal(f.box.ready(),true);});
 test(plugin+': failed refresh blocks Build while preserving the displayed previous list',async()=>{const f=consumer(plugin);f.hooks.read=async()=>{throw Object.assign(Error('media changed'),{code:'MEDIA_INVENTORY_CHANGED'});};await f.load();assert.equal(f.box.ready(),false);assert.equal(f.state.inventory,f.old);assert.ok(f.state.error);});
 for(const [field,value] of [['duration',11],['path','/replaced.mp4'],['width',1080],['name','Renamed']])test(plugin+': confirmed '+field+' change invalidates source candidates even with identical IDs',async()=>{const f=consumer(plugin);await f.load();f.state.candidates={cached:true};f.hooks.next=structuredClone(f.old);f.hooks.next.resources[0][field]=value;await f.load();assert.equal(f.state.candidates,null);});
 test(plugin+': stable confirmed source observations retain candidate reuse',async()=>{const f=consumer(plugin);await f.load();const cached={cached:true};f.state.candidates=cached;await f.load();assert.equal(f.state.candidates,cached);assert.equal(f.box.ready(),true);});
 test(plugin+': an old Project refresh cannot revoke the current confirmed list',async()=>{const f=consumer(plugin);let calls=0;f.hooks.read=async()=>{calls++;throw Error('must not dispatch');};assert.equal(await f.load('old-project'),'skipped');assert.equal(calls,0);assert.equal(f.box.ready(),true);});
 test(plugin+': a Project switch blocks the previous frame before its reset effect',async()=>{const f=consumer(plugin);f.box.projectRef.current='another-project';assert.equal(f.box.ready(),false);});
}
async function builder(t,plugin){
 const f=await miniMusicFixture(t,{entry:'panel'}),{plain,nested}=sources[plugin];
 Object.assign(f.box,{invLoadingRef:{current:null},inventorySnapshotRef:{current:{projectId:'p',inventory:f.inventory}}});
 if(plugin==='archive-vlog'){
  Object.assign(f.box,{pjoin:()=>'/unused',runEpochRef:{current:0},runLive:()=>true,creditUsed:false,prefixText:'',nameText:'',look:true,strength:.5,L:'en',fit:{requested:2},adjustLabelsFor:()=>({}),motionOptionsFor:()=>[],draftNameOf:()=> 'Archive fixture',avShotCandidates:()=>[],avPlanBuild:()=>f.plan,MUSIC_FADE_OUT:.12,tempo:110});
  f.box.candidates.key='p|null';
  vm.runInContext(['avSizesOf','avAssembleConfig'].map(name=>topLevel(plain,name)).join('\n')+'\n'+topLevel(nested,'build')+'\nthis.api.build=build;',f.box);
 }
 return f;
}
for(const plugin of ['mini-vlog','archive-vlog'])for(const mode of ['no-confirmation','different-project','newer-observation','pending-read'])test(plugin+': actual Build cannot start imports on '+mode,async t=>{
 const f=await builder(t,plugin);
 if(mode==='no-confirmation')f.box.inventorySnapshotRef.current=null;
 if(mode==='different-project')f.box.inventorySnapshotRef.current.projectId='other';
 if(mode==='newer-observation')f.box.inventorySnapshotRef.current.inventory=structuredClone(f.inventory);
 if(mode==='pending-read')f.box.invLoadingRef.current='p';
 await f.box.api.build(1);assert.equal(f.imports.length,0);assert.equal(f.scripts.length,0);assert.equal(f.saved.length,0);
});
for(const plugin of ['mini-vlog','archive-vlog'])test(plugin+': an unconfirmed Another Version cannot clear an already-built result',async t=>{
 const f=await builder(t,plugin);f.box.inventorySnapshotRef.current=null;const held={sequenceId:'existing-result'},writes=[];let requests=0;
 Object.assign(f.box,{result:held,setResult:value=>writes.push(value),setSeed:()=>{},build:()=>{requests++;}});
 vm.runInContext(topLevel(sources[plugin].nested,'buildAnother')+'\nthis.another=buildAnother;',f.box);f.box.another();
 assert.equal(writes.length,0);assert.equal(requests,0);assert.equal(f.box.result,held);
});

for(const plugin of ['mini-vlog','archive-vlog'])test(plugin+': a confirmed Another Version starts exactly one request',async t=>{
 const f=await builder(t,plugin),writes=[],seeds=[];let requests=0;
 Object.assign(f.box,{setResult:value=>writes.push(value),setSeed:value=>seeds.push(value),build:()=>{requests++;}});
 vm.runInContext(topLevel(sources[plugin].nested,'buildAnother')+'\nthis.another=buildAnother;',f.box);f.box.another();
 assert.equal(writes.length,0);assert.deepEqual(seeds,[2]);assert.equal(requests,1);
});

for(const plugin of ['mini-vlog','archive-vlog'])test(plugin+': another version preserves the result when Build rejects a missing preset',async t=>{
 const f=await builder(t,plugin),writes=[];Object.assign(f.box,{chosen:null,setResult:value=>writes.push(value),setSeed:()=>{}});
 vm.runInContext(topLevel(sources[plugin].nested,'buildAnother')+'\nthis.another=buildAnother;',f.box);f.box.another();
 assert.equal(writes.length,0);assert.equal(f.imports.length,0);
});
