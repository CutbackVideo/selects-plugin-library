import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// The actual shipped operation against a controlled Project catalog. Whole-file
// content checks and durable Draft recovery have separate caller-level contracts.
const source=fs.readFileSync(new URL('../plugins/archive-vlog/scripts/ensure-audio.js',import.meta.url),'utf8');
const manifest=JSON.parse(fs.readFileSync(new URL('../plugins/archive-vlog/assets/cues/manifest.json',import.meta.url),'utf8'));
const cue=manifest.cues[0],selected='/installed/archive-vlog/assets/cues/'+cue.file;
const plain=value=>JSON.parse(JSON.stringify(value));
function fixture({existing=[],lost=false,unobservable=false,mismatched=false}={}){
 const resources=[],nodes=[],imports=[];
 const add=({id,path:location,duration=cue.duration,type='Audio'})=>{
  resources.push({resourceId:id,name:cue.file,type,durationSeconds:duration});
  if(location)nodes.push({type:'audio',resourceId:id,path:location});
 };
 existing.forEach(add);
 const project={resources:async()=>resources,sourceFiles:async()=>({fileTree:nodes}),importFiles:async({paths})=>{
  assert.deepEqual(plain(paths),[selected]);imports.push(...paths);
  if(!unobservable)add({id:'selected-audio',path:selected});
  if(lost)throw Error('import completed; response lost');
  return {addedResourceIds:[mismatched?'unrelated-id':'selected-audio']};
 }};
 return {imports,run:(extra={})=>vm.runInNewContext('(async()=>{'+source+'})()',{
  selects:{project:id=>{assert.equal(id,'fixture-project');return project;}},
  __CONFIG__:{projectId:'fixture-project',path:selected,duration:cue.duration,...extra},
 })};
}

test('Archive Audio: same basename and exact cue length cannot identify the selected music',async()=>{
 const f=fixture({existing:[{id:'other-music',path:'/user/unrelated/'+path.basename(selected)}]});
 const result=await f.run();assert.equal(result.resourceId,'selected-audio');assert.equal(result.imported,true);assert.equal(f.imports.length,1);
});
test('Archive Audio: a name-only Resource without the selected physical path cannot be adopted',async()=>{
 const f=fixture({existing:[{id:'name-only'}]});
 assert.equal((await f.run()).resourceId,'selected-audio');assert.equal(f.imports.length,1);
});
test('Archive Audio: a different-length unrelated file remains an import control',async()=>{
 const f=fixture({existing:[{id:'other-music',path:'/user/'+path.basename(selected),duration:cue.duration+5}]});
 assert.equal((await f.run()).resourceId,'selected-audio');assert.equal(f.imports.length,1);
});
test('Archive Audio: the exact selected Project path reuses the existing Audio without import',async()=>{
 const f=fixture({existing:[{id:'selected-existing',path:selected}]});
 assert.deepEqual(plain(await f.run()),{resourceId:'selected-existing',imported:false});assert.equal(f.imports.length,0);
});
test('Archive Audio: own music without published duration retains exact-path import behavior',async()=>{
 const f=fixture({existing:[{id:'other-music',path:'/user/'+path.basename(selected)}]});
 assert.equal((await f.run({duration:null})).resourceId,'selected-audio');assert.equal(f.imports.length,1);
});
test('Archive Audio: an import reply loss is resolved by actual Project readback without resending',async()=>{
 const f=fixture({lost:true});assert.deepEqual(plain(await f.run()),{resourceId:'selected-audio',imported:true});assert.equal(f.imports.length,1);
});
test('Archive Audio: an unobserved imported ID is not success',async()=>{
 const f=fixture({unobservable:true});await assert.rejects(f.run());assert.equal(f.imports.length,1);
});
test('Archive Audio: contradictory import IDs and observed selected Audio are rejected',async()=>{
 const f=fixture({mismatched:true});await assert.rejects(f.run());assert.equal(f.imports.length,1);
});
test('Archive Audio: duplicate selected-path Audio is ambiguous and cannot authorize import',async()=>{
 const f=fixture({existing:[{id:'first',path:selected},{id:'second',path:selected}]});await assert.rejects(f.run());assert.equal(f.imports.length,0);
});
test('Archive Audio: selected-path Audio shorter than the planned section is rejected',async()=>{
 const f=fixture({existing:[{id:'short',path:selected,duration:1}]});await assert.rejects(f.run({minimumSeconds:10}));assert.equal(f.imports.length,0);
});
