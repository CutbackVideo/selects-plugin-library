import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import test from 'node:test';

function fixture(t) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'panel-version-delivery-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'tools'));fs.copyFileSync(new URL('../tools/sync_panel_versions.mjs',import.meta.url),path.join(root,'tools/sync_panel_versions.mjs'));
 const panel=id=>path.join(root,'plugins',id,'panel.tsx'),manifest=id=>path.join(root,'plugins',id,'plugin.json');
 for(const id of ['mini-vlog','archive-vlog','shortform-clips']) {
  fs.mkdirSync(path.dirname(panel(id)),{recursive:true});
  fs.writeFileSync(panel(id),'// preserved header\nconst PLUGIN_VERSION = "0.1.0-alpha.1";\nconst pendingRecoveryPolicy = "unchanged";\n');
  fs.writeFileSync(manifest(id),JSON.stringify({id,version:'0.1.0-alpha.2'}));
 }
 const snapshot=()=>Object.fromEntries(['mini-vlog','archive-vlog','shortform-clips'].flatMap(id=>[panel(id),manifest(id)]).map(p=>[p,fs.readFileSync(p,'utf8')]));
 const run=(...args)=>spawnSync(process.execPath,[path.join(root,'tools/sync_panel_versions.mjs'),...args],{encoding:'utf8'});
 return {root,panel,manifest,snapshot,run};
}
test('prepare delivers only manifest versions and is idempotent without changing recovery policy',t=>{
 const f=fixture(t),before=f.snapshot(),result=f.run();assert.equal(result.status,0,result.stderr);
 for(const id of ['mini-vlog','archive-vlog'])assert.equal(fs.readFileSync(f.panel(id),'utf8'),before[f.panel(id)].replace('0.1.0-alpha.1','0.1.0-alpha.2'));
 assert.equal(fs.readFileSync(f.panel('shortform-clips'),'utf8'),before[f.panel('shortform-clips')]);
 const prepared=f.snapshot();assert.equal(f.run().status,0);assert.equal(f.run('--check').status,0);assert.deepEqual(f.snapshot(),prepared);
});
test('check fails for drift without changing either source or manifest',t=>{
 const f=fixture(t),before=f.snapshot(),result=f.run('--check');assert.notEqual(result.status,0);assert.match(result.stderr,/Out-of-date panel version/);assert.deepEqual(f.snapshot(),before);
});
for(const version of ['01.2.3','1.2','1.2.3-01','1.2.3-','1.2.3+','1.2.3\n',null,12])test('invalid second manifest cannot partially update the first panel: '+JSON.stringify(version),t=>{
 const f=fixture(t);fs.writeFileSync(f.manifest('archive-vlog'),JSON.stringify({id:'archive-vlog',version}));
 const before=f.snapshot(),result=f.run();assert.notEqual(result.status,0);assert.match(result.stderr,/Invalid manifest version/);assert.deepEqual(f.snapshot(),before);
});
for(const version of ['1.2.3','1.2.3-alpha.0','1.2.3-rc.12+build.001'])test('valid semantic version is delivered exactly: '+version,t=>{
 const f=fixture(t);fs.writeFileSync(f.manifest('mini-vlog'),JSON.stringify({id:'mini-vlog',version}));assert.equal(f.run().status,0);assert.ok(fs.readFileSync(f.panel('mini-vlog'),'utf8').includes('"'+version+'"'));
});
for(const source of ['const OTHER_VERSION="1.0.0";\n','const PLUGIN_VERSION="1.0.0";\nconst PLUGIN_VERSION="2.0.0";\n','const PLUGIN_VERSION = computeVersion();\n'])test('unsupported second declaration fails all-target preflight: '+source.trim(),t=>{
 const f=fixture(t);fs.writeFileSync(f.panel('archive-vlog'),source);const before=f.snapshot(),result=f.run();assert.notEqual(result.status,0);assert.match(result.stderr,/Expected one literal/);assert.deepEqual(f.snapshot(),before);
});
test('unknown command arguments never mutate targets',t=>{
 const f=fixture(t),before=f.snapshot();assert.notEqual(f.run('--all').status,0);assert.notEqual(f.run('--check','--check').status,0);assert.deepEqual(f.snapshot(),before);
});
