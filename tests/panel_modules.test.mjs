import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import test from 'node:test';

const root=path.resolve(import.meta.dirname,'..');
function fixture(fn){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'panel-modules-'));
 try{
  for(const sub of ['tools','shared','plugins/no14-still-video','plugins/camera-shutter-dump','plugins/shortform-clips'])fs.mkdirSync(path.join(dir,sub),{recursive:true});
  fs.copyFileSync(path.join(root,'tools/sync_panel_modules.mjs'),path.join(dir,'tools/sync_panel_modules.mjs'));
  const module='function sourceFact() { return 19; }\n';
  const targets=['no14-still-video','camera-shutter-dump'];
  fs.writeFileSync(path.join(dir,'shared/example.js'),module);
  fs.writeFileSync(path.join(dir,'shared/panel-modules.json'),JSON.stringify({schemaVersion:1,modules:[{id:'example',source:'shared/example.js',targets:targets.map(id=>`plugins/${id}/panel.tsx`)}]}));
  for(const id of targets){
   fs.writeFileSync(path.join(dir,`plugins/${id}/plugin.json`),JSON.stringify({id,collection:'visual-highlights'}));
   fs.writeFileSync(path.join(dir,`plugins/${id}/panel.tsx`),'// HEADER\n// example:start\n'+module+'// example:end\n// KEEP TAIL\n');
  }
  fs.writeFileSync(path.join(dir,'plugins/shortform-clips/panel.tsx'),'excluded sentinel');
  const file=id=>path.join(dir,`plugins/${id}/panel.tsx`);
  const run=(...args)=>spawnSync(process.execPath,[path.join(dir,'tools/sync_panel_modules.mjs'),...args],{encoding:'utf8'});
  fn({dir,file,run});
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
test('module check is read-only and detects a stale second consumer',()=>fixture(({file,run})=>{
 assert.equal(run('--check').status,0);
 fs.writeFileSync(file('camera-shutter-dump'),fs.readFileSync(file('camera-shutter-dump'),'utf8').replace('return 19','return 0'));
 const before=fs.readFileSync(file('camera-shutter-dump'),'utf8'),r=run('--check');
 assert.equal(r.status,1);assert.match(r.stderr,/out.of.date/i);assert.equal(fs.readFileSync(file('camera-shutter-dump'),'utf8'),before);
}));
test('sync updates declared consumers and preserves the surrounding code and excluded panel',()=>fixture(({dir,file,run})=>{
 fs.writeFileSync(path.join(dir,'shared/example.js'),'function sourceFact() { return 20; }\n');
 assert.equal(run().status,0);
 for(const id of ['no14-still-video','camera-shutter-dump'])assert.equal(fs.readFileSync(file(id),'utf8'),'// HEADER\n// example:start\nfunction sourceFact() { return 20; }\n// example:end\n// KEEP TAIL\n');
 assert.equal(fs.readFileSync(file('shortform-clips'),'utf8'),'excluded sentinel');
 assert.equal(run('--check').status,0);
}));
test('every target is validated before any earlier file is rewritten',()=>fixture(({dir,file,run})=>{
 fs.writeFileSync(path.join(dir,'shared/example.js'),'function sourceFact() { return 20; }\n');
 fs.writeFileSync(file('camera-shutter-dump'),'no markers');
 const before=fs.readFileSync(file('no14-still-video'),'utf8'),r=run();
 assert.notEqual(r.status,0);assert.match(r.stderr,/marker/i);
 assert.equal(fs.readFileSync(file('no14-still-video'),'utf8'),before);
}));
test('duplicate markers and unknown options are rejected without mutation',()=>fixture(({file,run})=>{
 fs.appendFileSync(file('camera-shutter-dump'),'\n// example:start\n// example:end\n');
 const before=fs.readFileSync(file('no14-still-video'),'utf8');
 assert.notEqual(run().status,0);assert.notEqual(run('--force').status,0);
 assert.equal(fs.readFileSync(file('no14-still-video'),'utf8'),before);
}));
test('explicit compatibility consumers are checked and synchronized with the same source',()=>fixture(({dir,file,run})=>{
 const registryPath=path.join(dir,'shared/panel-modules.json'),registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
 const target='plugins/existing-consumer/panel.tsx';
 fs.mkdirSync(path.join(dir,'plugins/existing-consumer'));
 fs.writeFileSync(path.join(dir,'plugins/existing-consumer/plugin.json'),JSON.stringify({id:'existing-consumer'}));
 fs.writeFileSync(path.join(dir,target),'// example:start\nold\n// example:end\n');
 registry.modules[0].compatibilityTargets=[target];fs.writeFileSync(registryPath,JSON.stringify(registry));
 assert.equal(run('--check').status,1);
 assert.equal(run().status,0);
 assert.match(fs.readFileSync(path.join(dir,target),'utf8'),/return 19/);
 assert.equal(run('--check').status,0);
}));
test('excluded compatibility consumers stop synchronization before any file is changed',()=>fixture(({dir,file,run})=>{
 const registryPath=path.join(dir,'shared/panel-modules.json'),registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
 registry.modules[0].compatibilityTargets=['plugins/shortform-clips/panel.tsx'];fs.writeFileSync(registryPath,JSON.stringify(registry));
 fs.writeFileSync(path.join(dir,'shared/example.js'),'function sourceFact() { return 20; }\n');
 const before=fs.readFileSync(file('no14-still-video'),'utf8');
 assert.notEqual(run().status,0);assert.equal(fs.readFileSync(file('no14-still-video'),'utf8'),before);
 assert.equal(fs.readFileSync(file('shortform-clips'),'utf8'),'excluded sentinel');
}));
test('declared build-time consumers import the same source without rewriting their builder',()=>fixture(({dir,run})=>{
 const folder=path.join(dir,'plugins/photo-gallery-no2');fs.mkdirSync(folder);
 fs.writeFileSync(path.join(folder,'plugin.json'),JSON.stringify({id:'photo-gallery-no2',collection:'visual-highlights'}));
 const builder=path.join(folder,'operation-builder.mjs'),source="import {sourceFact} from '../../shared/example.js';\n";fs.writeFileSync(builder,source);
 const registryPath=path.join(dir,'shared/panel-modules.json'),registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));registry.modules[0].buildTimeTargets=['plugins/photo-gallery-no2/operation-builder.mjs'];fs.writeFileSync(registryPath,JSON.stringify(registry));
 const result=run('--check');assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/3 consumers/);assert.equal(fs.readFileSync(builder,'utf8'),source);
}));
test('a missing build-time import refuses sync before rewriting any panel',()=>fixture(({dir,file,run})=>{
 const folder=path.join(dir,'plugins/photo-gallery-no2');fs.mkdirSync(folder);fs.writeFileSync(path.join(folder,'plugin.json'),JSON.stringify({id:'photo-gallery-no2',collection:'visual-highlights'}));fs.writeFileSync(path.join(folder,'operation-builder.mjs'),"import {sourceFact} from '../../shared/other.js';\n");
 const registryPath=path.join(dir,'shared/panel-modules.json'),registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));registry.modules[0].buildTimeTargets=['plugins/photo-gallery-no2/operation-builder.mjs'];fs.writeFileSync(registryPath,JSON.stringify(registry));
 fs.writeFileSync(path.join(dir,'shared/example.js'),'function sourceFact(){return 20;}\n');const before=fs.readFileSync(file('no14-still-video'),'utf8');
 assert.notEqual(run().status,0);assert.equal(fs.readFileSync(file('no14-still-video'),'utf8'),before);
}));
test('excluded build-time consumers cannot be registered',()=>fixture(({dir,run})=>{
 const registryPath=path.join(dir,'shared/panel-modules.json'),registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));registry.modules[0].buildTimeTargets=['plugins/shortform-clips/operation-builder.mjs'];fs.writeFileSync(registryPath,JSON.stringify(registry));
 assert.notEqual(run('--check').status,0);
}));
test('a declared canonical URL read is a valid build-time source edge',()=>fixture(({dir,run})=>{
 const folder=path.join(dir,'plugins/photo-gallery-no2');fs.mkdirSync(folder);
 fs.writeFileSync(path.join(folder,'plugin.json'),JSON.stringify({id:'photo-gallery-no2',collection:'visual-highlights'}));
 fs.writeFileSync(path.join(folder,'build-panel.mjs'),"const source = readFileSync(new URL('../../shared/example.js', import.meta.url), 'utf8');\n");
 const registryPath=path.join(dir,'shared/panel-modules.json'),registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
 registry.modules[0].buildTimeTargets=['plugins/photo-gallery-no2/build-panel.mjs'];fs.writeFileSync(registryPath,JSON.stringify(registry));
 assert.equal(run('--check').status,0);
}));
