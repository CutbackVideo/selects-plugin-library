import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const selected='/owned/music.wav';
for(const plugin of ['mini-vlog','archive-vlog']){
 const source=fs.readFileSync(new URL('../plugins/'+plugin+'/scripts/ensure-audio.js',import.meta.url),'utf8');
 function fixture({tree={fileTree:[]},resources=[],cfg={}}={}){
  let imports=0,reads=0;
  const project={resources:async()=>resources,sourceFiles:async()=>{reads++;return tree;},importFiles:async()=>{imports++;return {addedResourceIds:['unconfirmed']};}};
  return {imports:()=>imports,reads:()=>reads,run:()=>vm.runInNewContext('(async()=>{'+source+'})()',{
   selects:{project:()=>project},__CONFIG__:{projectId:'p',path:selected,...cfg},
  })};
 }
 for(const [name,tree] of [['missing overview',{}],['missing folder detail',{folders:[{name:'Clips'}]}],['missing directory children',{fileTree:[{type:'dir',name:'Clips'}]}]])test(plugin+' selected Audio: '+name+' cannot prove absence or authorize import',async()=>{
  const f=fixture({tree});await assert.rejects(f.run(),e=>e.code==='BUNDLED_ASSET_READ');assert.equal(f.imports(),0);
 });
 test(plugin+' selected Audio: a selected source node without Resource metadata is uncertainty, not absence',async()=>{
  const f=fixture({tree:{fileTree:[{type:'audio',resourceId:'missing',path:selected}]}});await assert.rejects(f.run(),e=>e.code==='BUNDLED_ASSET_READ');assert.equal(f.imports(),0);
 });
 for(const cfg of [{path:'relative.wav'},{minimumSeconds:-1},{withPath:'yes'}])test(plugin+' selected Audio: invalid requirements stop before Project reads '+JSON.stringify(cfg),async()=>{
  const f=fixture({cfg});await assert.rejects(f.run(),e=>e.code==='BUNDLED_ASSET_INPUT');assert.equal(f.imports(),0);assert.equal(f.reads(),0);
 });
 test(plugin+' selected Audio: requested provenance returns the actual observed path and full duration',async()=>{
  const actual=selected.normalize('NFD'),f=fixture({resources:[{resourceId:'r0',type:'Audio',durationSeconds:30}],tree:{fileTree:[{type:'audio',resourceId:'r0',path:actual}]},cfg:{minimumSeconds:29,withPath:true}});
  const result=await f.run();assert.deepEqual(JSON.parse(JSON.stringify(result)),{resourceId:'r0',imported:false,path:actual,durationSeconds:30});assert.equal(f.imports(),0);
 });
}
