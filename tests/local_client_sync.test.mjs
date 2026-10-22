import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {fingerprintTemplateFile} from '../shared/file-observation.js';
function fixture(run){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'local-client-sync-'));
 try{
  fs.mkdirSync(path.join(root,'tools'));fs.mkdirSync(path.join(root,'shared'));
  fs.copyFileSync(new URL('../tools/sync_panel_local_client.mjs',import.meta.url),path.join(root,'tools/sync_panel_local_client.mjs'));
  fs.copyFileSync(new URL('../shared/file-observation.js',import.meta.url),path.join(root,'shared/file-observation.js'));
  fs.writeFileSync(path.join(root,'shared/local-client.ts'),'import React from "react";\nimport {fingerprintTemplateFile} from \'./file-observation.js\';\nfunction feature(){return 19;}\nexport {feature};\n');
  const ids=['no14-still-video','camera-shutter-dump','other-template','shortform-clips'];
  for(const id of ids){const dir=path.join(root,'plugins',id);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'panel.tsx'),'// HEADER\n// local-sdk:start\nfunction old(){}\nexport default withPanelLocalClient(Panel);\n// local-sdk:end\n// TAIL\n');}
  const file=id=>path.join(root,'plugins',id,'panel.tsx');
  run({root,file,call:(...args)=>spawnSync(process.execPath,[path.join(root,'tools/sync_panel_local_client.mjs'),...args],{encoding:'utf8'})});
 }finally{fs.rmSync(root,{recursive:true,force:true});}
}
test('scoped local-client sync preserves non-consumers and excluded production panels',()=>fixture(({file,call})=>{
 const others=['other-template','shortform-clips'].map(id=>fs.readFileSync(file(id),'utf8'));
 assert.equal(call('--only=no14-still-video,camera-shutter-dump').status,0);
 assert.match(fs.readFileSync(file('no14-still-video'),'utf8'),/return 19/);
 for(const [i,id] of ['other-template','shortform-clips'].entries())assert.equal(fs.readFileSync(file(id),'utf8'),others[i]);
 assert.equal(call('--only=no14-still-video,camera-shutter-dump','--check').status,0);
}));
test('local-client drift check is read-only and fails for an outdated selected consumer',()=>fixture(({file,call})=>{
 const before=fs.readFileSync(file('camera-shutter-dump'),'utf8');
 assert.equal(call('--only=camera-shutter-dump','--check').status,1);
 assert.equal(fs.readFileSync(file('camera-shutter-dump'),'utf8'),before);
}));
test('all selected local-client targets are validated before any replacement',()=>fixture(({file,call})=>{
 fs.writeFileSync(file('camera-shutter-dump'),'missing wrapper');const before=fs.readFileSync(file('no14-still-video'),'utf8');
 assert.notEqual(call('--only=no14-still-video,camera-shutter-dump').status,0);
 assert.equal(fs.readFileSync(file('no14-still-video'),'utf8'),before);
}));
test('unknown options, invalid scope and explicitly excluded consumers cannot mutate files',()=>fixture(({file,call})=>{
 const before=fs.readFileSync(file('no14-still-video'),'utf8');
 for(const arg of ['--force','--only=../parent','--only=shortform-clips','--only=missing','--only=no14-still-video,no14-still-video'])assert.notEqual(call(arg).status,0,arg);
 assert.equal(fs.readFileSync(file('no14-still-video'),'utf8'),before);
}));
test('scoped sync accepts Windows line endings without copying module imports',()=>fixture(({root,file,call})=>{
 const shared=path.join(root,'shared/local-client.ts');fs.writeFileSync(shared,fs.readFileSync(shared,'utf8').replaceAll('\n','\r\n'));
 fs.writeFileSync(file('no14-still-video'),fs.readFileSync(file('no14-still-video'),'utf8').replaceAll('\n','\r\n'));
 assert.equal(call('--only=no14-still-video').status,0);
 const result=fs.readFileSync(file('no14-still-video'),'utf8');assert.match(result,/return 19/);assert.doesNotMatch(result,/\bimport\s/);assert.match(result,/async function fingerprintTemplateFile/);assert.match(result,/Copyright \(c\) 2022 Paul Miller/);
 assert.equal(call('--only=no14-still-video','--check').status,0);
}));
test('a separately registered observation block is preserved and not duplicated inside local-sdk',()=>fixture(({file,call})=>{
 const target=file('no14-still-video'),block='// file-observation:start\n'+fingerprintTemplateFile.toString()+'\n// file-observation:end\n';
 fs.writeFileSync(target,block+fs.readFileSync(target,'utf8'));
 assert.equal(call('--only=no14-still-video').status,0);
 const result=fs.readFileSync(target,'utf8');assert(result.startsWith(block));assert.equal([...result.matchAll(/async function fingerprintTemplateFile\(/g)].length,1);
 const local=result.split('// local-sdk:start\n')[1].split('// local-sdk:end')[0];assert.doesNotMatch(local,/async function fingerprintTemplateFile\(/);assert.doesNotMatch(local,/\bimport\s/);
 assert.equal(call('--only=no14-still-video','--check').status,0);
}));
test('malformed observation markers reject before any selected client is overwritten',()=>fixture(({file,call})=>{
 const target=file('camera-shutter-dump'),other=file('no14-still-video'),before=fs.readFileSync(other,'utf8');
 fs.writeFileSync(target,'// file-observation:start\n'+fs.readFileSync(target,'utf8'));
 assert.notEqual(call('--only=no14-still-video,camera-shutter-dump').status,0);assert.equal(fs.readFileSync(other,'utf8'),before);
}));
test('an observation owner inside the replacement region is rejected rather than silently erased',()=>fixture(({file,call})=>{
 const target=file('no14-still-video');const before=fs.readFileSync(target,'utf8').replace('// local-sdk:start\n','// local-sdk:start\n// file-observation:start\n'+fingerprintTemplateFile.toString()+'\n// file-observation:end\n');fs.writeFileSync(target,before);
 assert.notEqual(call('--only=no14-still-video').status,0);assert.equal(fs.readFileSync(target,'utf8'),before);
}));
