import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';import {createRequire} from 'node:module';import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url),root=path.resolve(import.meta.dirname,'..'),consumers=['mini-vlog','archive-vlog','selfie-aesthetic','city-weekend-vlog'];
function samples(){const rate=22050,x=new Float32Array(rate*30);for(let time=.5;time<30;time+=.5){const first=Math.round(time*rate);for(let k=0;k<400&&first+k<x.length;k++)x[first+k]+=Math.sin(2*Math.PI*1000*k/rate)*Math.exp(-k/80);}return x;}
const serial=value=>JSON.parse(JSON.stringify(value));
test('common beat engine: four shipped consumers deliver the exact canonical engine and preserve measured results',()=>{
 const source=fs.readFileSync(path.join(root,'shared/audio-beat-analysis.cjs'),'utf8'),engine=require('../shared/audio-beat-analysis.cjs'),input=samples(),expected=serial(engine.analyze(input,22050));assert.equal(expected.accepted,true);assert.ok(Math.abs(expected.bpm-120)<.2);
 for(const id of consumers){const file=path.join(root,'plugins',id,'beat-detect.cjs');assert.equal(fs.readFileSync(file,'utf8'),source,id);const actual=require(file);assert.deepEqual(serial(actual.analyze(input,22050)),expected,id);for(const name of ['analyze','sixteenthRatio','bandOnsets','bandFlux','takeFlip'])assert.equal(typeof actual[name],'function');}
});
test('common beat engine: browser worker evaluation has no Node CLI filesystem effect',()=>{
 const source=fs.readFileSync(path.join(root,'shared/audio-beat-analysis.cjs'),'utf8');let calls=0;const module={exports:{}};const require=()=>{calls++;throw Error('Node IO cannot run in the worker');};vm.runInNewContext('(function(module,exports,require){'+source+'\n})(module,module.exports,require)',{module,require,Float32Array});assert.equal(calls,0);const grid=module.exports.analyze(samples(),22050);assert.equal(grid.accepted,true);assert.ok(Math.abs(grid.bpm-120)<.2);
});
test('common beat engine: the Selfie main-thread fallback embeds the canonical module with the same numerical result and no Node IO',()=>{
 const source=fs.readFileSync(path.join(root,'shared/audio-beat-analysis.cjs'),'utf8'),panel=fs.readFileSync(path.join(root,'plugins/selfie-aesthetic/panel.tsx'),'utf8');
 const start=panel.indexOf('// sae-beat:start\n'),end=panel.indexOf('// sae-beat:end',start);assert.ok(start>=0&&end>start);
 const region=panel.slice(start,end);assert.ok(region.includes('// audio-beat-analysis:start\n'+source.trimEnd()+'\n// audio-beat-analysis:end'),'the embedded fallback is an actual canonical consumer');
 const box=vm.createContext({Float32Array,require:()=>{throw Error('external Node IO cannot run');}});
 vm.runInContext(region+'\nthis.inline=saeBeat;',box);assert.deepEqual(Object.keys(box.inline),['analyze']);
 const input=samples();assert.deepEqual(serial(box.inline.analyze(input,22050)),serial(require('../shared/audio-beat-analysis.cjs').analyze(input,22050)));
});
test('common beat engine: the inherited raw float32 PCM CLI remains usable in each standalone copy',t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'beat-engine-cli-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));const file=path.join(directory,'samples.f32'),input=samples();fs.writeFileSync(file,Buffer.from(input.buffer));
 for(const relative of ['shared/audio-beat-analysis.cjs',...consumers.map(id=>'plugins/'+id+'/beat-detect.cjs')]){const child=spawnSync(process.execPath,[path.join(root,relative),file,'22050'],{encoding:'utf8',timeout:30000,maxBuffer:1024*1024});assert.equal(child.status,0,relative+': '+child.stderr);const result=JSON.parse(child.stdout);assert.equal(result.accepted,true);assert.ok(Math.abs(result.bpm-120)<.2);}
});
