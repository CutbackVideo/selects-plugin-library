import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import test from 'node:test';
const box={};vm.runInNewContext(fs.readFileSync(new URL('../shared/clip-analysis.js',import.meta.url),'utf8')+'\nthis.read=clipAnalysisSources;',box);
const row={path:'/original',size:100,sha256:'a'.repeat(64)},result={scores:{sourceObservation:row}};
test('Clip source admission: existing default returns the same observation shape',()=>assert.deepEqual(JSON.parse(JSON.stringify(box.read([result]))),[row]));
test('Clip source admission: expected pre-analysis snapshot must match returned score identity',()=>{
 assert.throws(()=>box.read([result],[{...row,sha256:'b'.repeat(64)}]),e=>e.code==='CLIP_ANALYSIS_SOURCE_CHANGED');
});
test('Clip source admission: an absent pre-analysis source cannot be accepted',()=>assert.throws(()=>box.read([result],[]),e=>e.code==='CLIP_ANALYSIS_SOURCE_CHANGED'));
