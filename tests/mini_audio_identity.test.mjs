import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const source=fs.readFileSync(process.env.MINI_AUDIO_SCRIPT||new URL('../plugins/mini-vlog/scripts/ensure-audio.js',import.meta.url),'utf8');
function fixture({path='/installed/cues/bedroom-pop-108.mp3',duration=60.029}={}){
 const resources=[],nodes=[],imports=[],hooks={};let reads=0;
 const add=(resourceId,file,extra={})=>{resources.push({resourceId,name:file.split(/[\\/]/).at(-1),type:'Audio',durationSeconds:60.029,...extra});nodes.push({resourceId,type:'audio',path:file});};
 const project={resources:async()=>resources,sourceFiles:async()=>{reads++;if(hooks.readFailure)throw Error('private lookup failure');return {fileTree:nodes};},importFiles:async input=>{
  imports.push(input);if(!hooks.skip)add('wanted',input.paths[0],hooks.metadata);if(hooks.lost)throw Error('lost import acknowledgement');return hooks.reply??{addedResourceIds:['wanted']};
 }};
 const run=()=>new Function('selects','return (async()=>{'+source.replace('__CONFIG__',()=>JSON.stringify({projectId:'p',path,duration}))+'})();')({project:()=>project});
 return {path,resources,nodes,imports,hooks,add,run,reads:()=>reads};
}
for(const misleading of ['same path basename','same resource name'])test('Mini audio identity: '+misleading+' and duration do not identify the chosen cue',async()=>{
 const f=fixture();f.add('unrelated','/other/'+(misleading==='same path basename'?'bedroom-pop-108.mp3':'different.mp3'),{name:'bedroom-pop-108.mp3'});
 const row=await f.run();assert.equal(row.resourceId,'wanted');assert.equal(row.imported,true);assert.deepEqual(f.imports,[{paths:[f.path]}]);assert.equal(f.resources[0].resourceId,'unrelated');
});
test('Mini audio identity: the exact selected path retains its Resource despite a renamed label',async()=>{
 const f=fixture();f.add('selected',f.path,{name:'renamed by the user'});assert.deepEqual(await f.run(),{resourceId:'selected',imported:false});assert.equal(f.imports.length,0);
});
test('Mini audio identity: Windows case/separators/Unicode keep the existing path contract',async()=>{
 const f=fixture({path:'d:/media/\ud64d/song.mp3'});f.add('selected','D:\\Media\\\u1112\u1169\u11bc\\SONG.mp3');assert.equal((await f.run()).resourceId,'selected');assert.equal(f.imports.length,0);
});
test('Mini audio identity: POSIX differently cased paths remain different inputs',async()=>{
 const f=fixture({path:'/Music/song.mp3'});f.add('other','/Music/Song.mp3');assert.equal((await f.run()).resourceId,'wanted');assert.equal(f.imports.length,1);
});
test('Mini audio identity: own music also retains exact-path selection',async()=>{
 const f=fixture({duration:null});f.add('other','/other/bedroom-pop-108.mp3');assert.equal((await f.run()).resourceId,'wanted');assert.equal(f.imports.length,1);
});
test('Mini audio identity: duplicate exact-path Resources are ambiguous before import',async()=>{
 const f=fixture();f.add('first',f.path);f.add('second',f.path);await assert.rejects(f.run(),e=>e.code==='BUNDLED_ASSET_READ');assert.equal(f.imports.length,0);
});
for(const extra of [{type:'Video'},{durationSeconds:0}])test('Mini audio identity: invalid existing Audio metadata is not accepted or replaced',async()=>{
 const f=fixture();f.add('invalid',f.path,extra);await assert.rejects(f.run(),e=>e.code==='BUNDLED_ASSET_METADATA');assert.equal(f.imports.length,0);
});
test('Mini audio identity: a lost completed import reply is observed without resubmission',async()=>{
 const f=fixture();f.hooks.lost=true;assert.deepEqual(await f.run(),{resourceId:'wanted',imported:true});assert.equal(f.imports.length,1);assert.equal(f.reads(),2);
});
test('Mini audio identity: an empty reply can be satisfied by confirmed Project state',async()=>{
 const f=fixture();f.hooks.reply={addedResourceIds:[]};assert.equal((await f.run()).resourceId,'wanted');assert.equal(f.imports.length,1);
});
for(const reply of [{},{addedResourceIds:['unrelated']},{addedResourceIds:['wanted','other']}])test('Mini audio identity: contradictory or missing import IDs cannot substitute an unobserved choice '+JSON.stringify(reply),async()=>{
 const f=fixture();f.hooks.reply=reply;if(!('addedResourceIds' in reply))f.hooks.skip=true;
 await assert.rejects(f.run(),e=>e.code==='BUNDLED_ASSET_IMPORT_UNKNOWN');assert.equal(f.imports.length,1);
});
test('Mini audio identity: a confirmed skipped import is distinct from unknown',async()=>{
 const f=fixture();f.hooks.skip=true;f.hooks.reply={addedResourceIds:[]};await assert.rejects(f.run(),e=>e.code==='BUNDLED_ASSET_SKIPPED');assert.equal(f.imports.length,1);
});
test('Mini audio identity: an unsettled import is not resubmitted',async()=>{
 const f=fixture();f.hooks.skip=true;f.hooks.lost=true;await assert.rejects(f.run(),e=>e.code==='BUNDLED_ASSET_IMPORT_UNKNOWN'&&!e.message.includes('acknowledgement'));assert.equal(f.imports.length,1);
});
test('Mini audio identity: lookup failure stops before importing a duplicate',async()=>{
 const f=fixture();f.hooks.readFailure=true;await assert.rejects(f.run(),e=>e.code==='BUNDLED_ASSET_READ'&&!e.message.includes('private'));assert.equal(f.imports.length,0);
});
test('Mini audio identity: new imports are independently confirmed by path, type and ID',async()=>{
 const f=fixture();assert.deepEqual(await f.run(),{resourceId:'wanted',imported:true});assert.equal(f.imports.length,1);assert.equal(f.reads(),2);
});
test('Mini audio distribution: check detects stale generated code without rewriting it',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mini-audio-build-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 for(const dir of ['shared','plugins/mini-vlog/dev','plugins/mini-vlog/scripts'])fs.mkdirSync(path.join(root,dir),{recursive:true});
 for(const file of ['shared/bundled-assets.js','shared/native-image-authoring.js','plugins/mini-vlog/operation-builder.mjs','plugins/mini-vlog/dev/ensure-audio.template.js','plugins/mini-vlog/dev/decorate.template.js','plugins/mini-vlog/scripts/ensure-audio.js','plugins/mini-vlog/scripts/decorate.js'])fs.copyFileSync(new URL('../'+file,import.meta.url),path.join(root,file));
 const run=(...args)=>spawnSync(process.execPath,[path.join(root,'plugins/mini-vlog/operation-builder.mjs'),...args],{encoding:'utf8'});
 assert.equal(run('--check').status,0);
 const output=path.join(root,'plugins/mini-vlog/scripts/ensure-audio.js'),stale=fs.readFileSync(output,'utf8')+'\n// stale artifact\n';fs.writeFileSync(output,stale);
 assert.equal(run('--check').status,1);assert.equal(fs.readFileSync(output,'utf8'),stale);
 assert.equal(run().status,0);assert.equal(run('--check').status,0);assert.equal(fs.readFileSync(output,'utf8'),source);
 const graphicOutput=path.join(root,'plugins/mini-vlog/scripts/decorate.js'),graphic=fs.readFileSync(graphicOutput,'utf8'),changed=graphic+'\n// stale program artifact\n';fs.writeFileSync(graphicOutput,changed);
 assert.equal(run('--check').status,1);assert.equal(fs.readFileSync(graphicOutput,'utf8'),changed);assert.equal(fs.readFileSync(output,'utf8'),source);
 assert.equal(run().status,0);assert.equal(run('--check').status,0);assert.equal(fs.readFileSync(graphicOutput,'utf8'),graphic);
});
