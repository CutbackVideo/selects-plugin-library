import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';

const panel=fs.readFileSync(path.resolve(import.meta.dirname,'../plugins/depth-type-captions/panel.tsx'),'utf8');
// The speaker mask script the panel writes to disk and runs with osascript.
function maskSource(){
 const start=panel.indexOf('const DEPTH_MASK_SOURCE=');
 assert.ok(start>=0,'the panel embeds its mask script');
 const line=panel.slice(start+'const DEPTH_MASK_SOURCE='.length,panel.indexOf('\n',start));
 return JSON.parse(line.replace(/;\s*$/,''));
}

test('macOS speaker masks need no Xcode Command Line Tools',()=>{
 for(const tool of ['swiftc','xcrun','xcode-select','python3'])assert.ok(!panel.includes(tool),tool+' is not used');
 assert.match(panel,/"\/usr\/bin\/osascript -l JavaScript " \+ depthQuote\(source\)/);
 // The job leaves the launching call's process group but keeps its workers in its own.
 assert.match(panel,/set -m; nohup \/bin\/zsh run\.sh/);
 assert.match(panel,/kill -TERM -\$\(cat pgid\)/);
});

test('the mask script is plain JavaScript for osascript',()=>{
 const source=maskSource();
 assert.doesNotThrow(()=>new vm.Script(source,{filename:'depth-type-mattes-v4.js'}));
 assert.match(source,/VNGeneratePersonSegmentationRequest/);
 assert.match(source,/^function run\(args\)/m);
 // Workers start through sh (NSTask would give each its own process group, out of reach of the cancel).
 assert.ok(!/NSTask\.alloc/.test(source));
});

test('the mask script reports a missing render the way the panel reads it',{skip:process.platform!=='darwin'&&'needs macOS osascript'},()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'depth-masks-'));
 const script=path.join(dir,'depth-type-mattes-v4.js');
 fs.writeFileSync(script,maskSource());
 const r=spawnSync('/usr/bin/osascript',['-l','JavaScript',script,path.join(dir,'missing.mp4'),dir,'1080','1920','person','0','100'],{encoding:'utf8',env:{PATH:'/usr/bin:/bin',HOME:dir}});
 assert.equal(r.status,3);
 assert.equal(r.stderr.trim(),'The render has no video track.');
});
