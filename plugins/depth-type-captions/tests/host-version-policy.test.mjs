import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../panel.tsx',import.meta.url),'utf8');
const start=source.indexOf('const DEPTH_MIN_HOST ='),end=source.indexOf('// The smallest export preset',start);
function policy(version){const hostSdk={environment:{version}};return vm.runInNewContext(source.slice(start,end)+';({depthHostVersion,depthHostProblem,depthRequireHost})',{hostSdk});}
test('recognized supported hosts retain the existing behind-speaker path',()=>{for(const version of ['2.0.508','2.0.512','2.1.0']){const p=policy(version);assert.equal(p.depthHostVersion(),version);assert.equal(p.depthHostProblem(),'');assert.doesNotThrow(()=>p.depthRequireHost());}});
test('recognized old hosts identify the current and required versions instead of enabling incompatible mask reads',()=>{const p=policy('2.0.507');assert.match(p.depthHostProblem(),/2\.0\.508.*2\.0\.507/);assert.match(p.depthHostProblem(),/turn off Behind speaker/);assert.throws(()=>p.depthRequireHost(),/Update Selects/);});
test('unknown host version retains the agreed fail-closed policy and explicitly identifies the missing version',()=>{for(const version of [undefined,null,'']){const p=policy(version);assert.equal(p.depthHostVersion(),null);assert.match(p.depthHostProblem(),/this app is unknown/);assert.throws(()=>p.depthRequireHost(),/2\.0\.508/);}});
