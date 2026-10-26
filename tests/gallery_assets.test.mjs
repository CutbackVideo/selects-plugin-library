import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {assetFixture} from './bundled_asset_fixture.mjs';
import {checkScriptTypes} from './run_script_types.mjs';
import {buildScript} from '../plugins/photo-gallery-no2/operation-builder.mjs';
const fixture=options=>assetFixture({plugin:'photo-gallery-no2',...options});

for(const minify of [false,true])test('Gallery music: publish pinned bytes to an owned content path (minify='+minify+')',async()=>{
 const f=fixture({minify}),r=await f.prepare();assert.equal(r.path,f.dataPath('music'));assert.ok(f.filesOnDisk.get(r.path).equals(f.decoded.music));assert.deepEqual(f.imports,[[r.path]]);assert.equal(r.durationFrames,853);
});
test('Gallery music: repeat requests reuse verified owned bytes and one Project Resource',async()=>{
 const f=fixture(),a=await f.prepare(),b=await f.prepare();assert.equal(b.resourceId,a.resourceId);assert.equal(f.imports.length,1);assert.equal(f.writes.length,1);assert.ok(f.reads.filter(p=>p===f.dataPath('music')).length>=2);
});
test('Gallery music: installed file path is never a newly registered Resource',async()=>{
 const f=fixture();const legacy=f.add(f.sourcePath('music'));const r=await f.prepare();assert.notEqual(r.resourceId,legacy);assert.equal(r.path,f.dataPath('music'));assert.equal(f.nodes[0].path,f.sourcePath('music'),'old resources remain untouched');
});
test('Gallery music: corruption of the owned copy is repaired before reuse',async()=>{
 const f=fixture(),r=await f.prepare();f.filesOnDisk.set(r.path,Buffer.alloc(f.decoded.music.length,1));await f.prepare();assert.ok(f.filesOnDisk.get(r.path).equals(f.decoded.music));assert.equal(f.imports.length,1);
});
test('Gallery music: changed installed bytes cannot reuse or import another track',async()=>{
 const f=fixture(),r=await f.prepare(),before=f.imports.length;f.filesOnDisk.set(f.sourcePath('music'),Buffer.alloc(f.decoded.music.length,2));await assert.rejects(f.prepare(),/manifest|match|installed/i);assert.equal(f.imports.length,before);assert.ok(f.filesOnDisk.get(r.path).equals(f.decoded.music));
});
test('Gallery music: oversized installed file is refused before allocation or import',async()=>{
 const f=fixture(),stat=f.files.stat;f.files.stat=async p=>p===f.sourcePath('music')?{size:33*1024*1024,isDirectory:false}:stat(p);
 await assert.rejects(f.prepare(),/size|limit|byte|file/i);assert.equal(f.reads.includes(f.sourcePath('music')),false);assert.equal(f.imports.length,0);
});
test('Gallery music: hash support is required before publishing or importing',async()=>{
 const f=fixture({cryptoSupported:false});await assert.rejects(f.prepare(),/Update Selects|verify/i);assert.equal(f.writes.length,0);assert.equal(f.imports.length,0);
});
test('Gallery music: duplicate or wrong-type owned Project paths are not replaced or selected',async()=>{
 for(const wrongType of [false,true]){const f=fixture();f.filesOnDisk.set(f.dataPath('music'),f.decoded.music);f.add(f.dataPath('music'),{type:wrongType?'Video':'Audio'});if(!wrongType)f.add(f.dataPath('music'));
  await assert.rejects(f.prepare(),/confirm|type|unique|Audio|ambiguous/i);assert.equal(f.imports.length,0);}
});
test('Gallery music: lost import reply is confirmed from registered state without retry',async()=>{
 const f=fixture();f.hooks.afterScript=input=>{if(input.allowCommit)throw Error('reply lost');};const r=await f.prepare();assert.ok(r.resourceId);assert.equal(r.path,f.dataPath('music'));assert.equal(f.imports.length,1);
});
test('Gallery music: contradictory import receipt cannot claim success',async()=>{
 const f=fixture();f.hooks.reply={addedResourceIds:['foreign']};await assert.rejects(f.prepare(),/confirm|added|import/i);assert.equal(f.imports.length,1);
});
test('Gallery music: skipped import is a terminal result, never a polling loop',async()=>{
 const f=fixture();f.hooks.skip=true;await assert.rejects(f.prepare(),/did not add|skip/i);assert.equal(f.imports.length,1);
});
for(const fps of [25,60,120])test('Gallery music: compatible Project grid '+fps+' validates full rounded duration',async()=>{
 const f=fixture();f.hooks.fps=fps;const r=await f.prepare();assert.equal(r.path,f.dataPath('music'));assert.equal(f.imports.length,1);
});
test('Gallery music: 30fps rounded output outlasts the excerpt and stops before import',async()=>{
 const f=fixture();f.hooks.fps=30;await assert.rejects(f.prepare(),/short|cover|length|music/i);assert.equal(f.imports.length,0);assert.equal(f.writes.length,0);
});
test('Gallery music: an async import observer is awaited and stale work cannot import',async()=>{
 const f=fixture();await assert.rejects(f.prepare({onImportStarted:async()=>{await Promise.resolve();f.stop();}}));assert.equal(f.imports.length,0);
});
for(const [platform,home] of [['win32','C:\\Profiles\\\uc0ac\uc6a9\uc790'],['win32','\\\\studio\\share\\\uc0ac\uc6a9\uc790'],['darwin','/Users/\uc0ac\uc6a9\uc790']])test('Gallery music: host-native '+platform+' '+home+' keeps ownership',async()=>{
 const f=fixture({platform,home}),r=await f.prepare();assert.equal(r.path,f.dataPath('music'));assert.ok(f.filesOnDisk.get(r.path).equals(f.decoded.music));assert.equal(f.imports.length,1);
});
test('Gallery music: serialized asset requests typecheck without browser globals',async()=>{
 const f=fixture({minify:true});await f.prepare();assert.ok(checkScriptTypes(f.requests).scripts>1);assert.ok(checkScriptTypes(f.requests,{sdkTypes:false}).scripts>1);assert.ok(f.requests.every(r=>Buffer.byteLength(r.script)<256*1024));
});
test('Gallery music: packaged byte identity and actual excerpt duration match release intent',()=>{
 const source=fs.readFileSync(new URL('../plugins/photo-gallery-no2/panel.template.tsx',import.meta.url),'utf8'),literal=source.match(/const GALLERY_MUSIC=(\{[^\n]+\});/)[1],spec=new Function('return '+literal)(),f=fixture();
 assert.equal(spec.bytes,f.decoded.music.length);assert.equal(spec.sha256,f.manifest.music.sha256);
 const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','json',new URL('../plugins/photo-gallery-no2/assets/music.mp3',import.meta.url).pathname],{encoding:'utf8'});
 assert.equal(probe.status,0,probe.stderr);assert.ok(Math.abs(Number(JSON.parse(probe.stdout).format.duration)-spec.seconds)<1e-6);
});
for(const fps of [24,30000/1001])test('Gallery music: fractional/reference-adjacent Project grid '+fps+' fits without padding',async()=>{
 const f=fixture();f.hooks.fps=fps;const r=await f.prepare();assert.equal(r.path,f.dataPath('music'));assert.equal(f.imports.length,1);
});
for(const fps of [50,90])test('Gallery music: rounded Project grid '+fps+' cannot silently exceed the pinned excerpt',async()=>{
 const f=fixture();f.hooks.fps=fps;await assert.rejects(f.prepare(),/too short|frame grid/i);assert.equal(f.writes.length,0);assert.equal(f.imports.length,0);
});
for(const fps of [0,-1,NaN,Infinity])test('Gallery music: unavailable or invalid Project fps '+fps+' stops before asset writes',async()=>{
 const f=fixture();f.hooks.fps=fps;await assert.rejects(f.prepare(),/frame rate/i);assert.equal(f.writes.length,0);assert.equal(f.imports.length,0);
});
test('Gallery music: sub-frame output on the Project grid cannot prepare an asset',async()=>{
 const f=fixture();f.hooks.fps=10;await assert.rejects(f.prepare({durationFrames:1}),/frame|duration|length/i);assert.equal(f.writes.length,0);assert.equal(f.imports.length,0);
});
test('Gallery music: installed content changing after publication cannot reach Project registration',async()=>{
 const f=fixture();let n=0;f.hooks.beforeRead=p=>{if(p===f.sourcePath('music')&&++n===2)f.filesOnDisk.set(p,Buffer.alloc(f.decoded.music.length,3));};
 await assert.rejects(f.prepare(),/manifest|match|changed/i);assert.equal(f.imports.length,0);
});
test('Gallery music: detached owner cannot continue after owned file publication',async()=>{
 const f=fixture();f.hooks.afterWrite=()=>f.stop();await assert.rejects(f.prepare(),/ended|stopped/i);assert.equal(f.imports.length,0);
});
test('Gallery music: Project import confirms the host spelling across Windows path forms',async()=>{
 const f=fixture({platform:'win32',home:'C:\\Profiles\\\uc0ac\uc6a9\uc790'});f.hooks.afterScript=input=>{if(input.allowCommit)f.nodes[0].path=f.nodes[0].path.replace(/\\/g,'/').toLowerCase();};
 const r=await f.prepare();assert.equal(r.path,f.nodes[0].path);assert.equal(f.imports.length,1);
});
test('Gallery music: file publication failure cannot start a Project import',async()=>{
 const f=fixture();f.hooks.beforeWrite=()=>{throw Error('EACCES');};await assert.rejects(f.prepare(),/prepare|file/i);assert.equal(f.imports.length,0);
});

function heldFixture({duplicate=false,wrongType=false,lost=false,wrongAck=false}={}){
 const resources=[{resourceId:'source',type:'Video',durationSeconds:1}],nodes=[{resourceId:'source',type:'video',path:'/source.mp4',frameSize:{width:640,height:960},durationSeconds:1}],imports=[];
 const add=(id,type='Video')=>{resources.push({resourceId:id,type,durationSeconds:20});nodes.push({resourceId:id,type:type.toLowerCase(),path:'/owned/held.mp4',frameSize:{width:640,height:960},durationSeconds:20});};
 if(duplicate){add('held-1');add('held-2');}if(wrongType)add('audio','Audio');
 const project={resources:async()=>resources,sourceFiles:async()=>({fileTree:nodes}),importFiles:async({paths})=>{imports.push(paths);add('held');if(lost)throw Error('reply lost');return {addedResourceIds:[wrongAck?'foreign':'held']};}};
 const hooks={};
 const selects={project:()=>project,media:{probe:async({filePaths})=>{await hooks.onProbe?.();return {files:filePaths.map(path=>({path,type:'video'}))};}}};
 const input={operation:'importConverted',projectId:'p',durationFrames:853,converted:[{sourceResourceId:'source',sourcePath:'/source.mp4',path:'/owned/held.mp4'}]};
 return {imports,resources,nodes,input,hooks,run:async()=>new Function('selects','return (async()=>{'+buildScript(input)+'})()')(selects)};
}
test('Gallery held import: duplicate cached paths are refused instead of last-entry selection',async()=>{
 const f=heldFixture({duplicate:true}),r=await f.run();assert.equal(r.status,'notSaved');assert.match(r.message,/ambiguous|unique|multiple/i);assert.equal(f.imports.length,0);
});
test('Gallery held import: existing wrong-kind path is not imported over',async()=>{
 const f=heldFixture({wrongType:true}),r=await f.run();assert.equal(r.status,'notSaved');assert.equal(f.imports.length,0);
});
test('Gallery held import: lost import reply is independently confirmed without another import',async()=>{
 const f=heldFixture({lost:true}),r=await f.run();assert.equal(r.status,'prepared',r.message);assert.equal(r.converted[0].resourceId,'held');assert.equal(f.imports.length,1);
});
test('Gallery held import: contradictory positive added identity is not called prepared',async()=>{
 const f=heldFixture({wrongAck:true}),r=await f.run();assert.equal(r.status,'outcomeUnknown');assert.equal(f.imports.length,1);
});
test('Gallery held import: distinct sources cannot be rebound to one shared output path',async()=>{
 const f=heldFixture();f.resources.push({resourceId:'source-2',type:'Video',durationSeconds:1});f.nodes.push({...f.nodes[0],resourceId:'source-2',path:'/source-2.mp4'});
 f.input.converted.push({sourceResourceId:'source-2',sourcePath:'/source-2.mp4',path:'/owned/held.mp4'});
 const r=await f.run();assert.equal(r.status,'notSaved');assert.equal(f.imports.length,0);
});
test('Gallery held import: incomplete existing metadata cannot be replaced by another import',async()=>{
 const f=heldFixture({duplicate:true});f.resources.pop();f.nodes.pop();f.nodes[1].frameSize.width=1.5;
 const r=await f.run();assert.equal(r.status,'notSaved');assert.equal(f.imports.length,0);
});
test('Gallery held import: unconfirmed lost import stays unknown and is never automatically replayed',async()=>{
 const f=heldFixture({lost:true});f.resources.length=1;f.nodes.length=1;
 // The registered Resource disappearing after the import simulates lost state.
 const push=f.nodes.push.bind(f.nodes);f.nodes.push=(...rows)=>{push(...rows);f.nodes.pop();return f.nodes.length;};
 const r=await f.run();assert.equal(r.status,'outcomeUnknown');assert.equal(f.imports.length,1);
});
test('Gallery held import: an existing target changing during probe is reread before reuse',async()=>{
 const f=heldFixture({duplicate:true});f.resources.pop();f.nodes.pop();f.hooks.onProbe=()=>{f.nodes[1].durationSeconds=1;};
 const r=await f.run();assert.equal(r.status,'notSaved');assert.equal(f.imports.length,0);
});
for(const path of ['/installed/photo-gallery-no2/assets/music.mp3','C:\\Users\\\uc0ac\uc6a9\uc790\\.selects\\skills\\photo-gallery-no2\\assets\\music.mp3'])test('Gallery legacy music: installation path '+path+' cannot become a new Project Resource',async()=>{
 let imports=0;const project={resources:async()=>[],sourceFiles:async()=>({fileTree:[]}),importFiles:async()=>{imports++;return {addedResourceIds:[]};}};
 const selects={project:()=>project,media:{probe:async()=>({files:[{path,type:'audio'}]})}};
 const r=await new Function('selects','return (async()=>{'+buildScript({operation:'importBundledMusic',projectId:'p',path,durationFrames:853})+'})()')(selects);
 assert.equal(r.status,'notSaved');assert.equal(imports,0);assert.match(r.message,/owned|panel|installation/i);
});
