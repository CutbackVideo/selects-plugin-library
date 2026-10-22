import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import {createRequire} from 'node:module';
import {webcrypto,createHash} from 'node:crypto';
import {holdFixture,jsonFiles} from './gallery_hold_fixture.mjs';
import {topLevel} from './windows_host.mjs';
import {clickAudio} from '../tools/repro_mini_own_music.mjs';
const require=createRequire(import.meta.url),esbuild=require(process.env.SELECTS_ESBUILD||process.env.SBS_PANEL_TEST_MODULES+'/esbuild'),engine=require('../shared/audio-beat-analysis.cjs');
const panel=fs.readFileSync(new URL('../plugins/mini-vlog/panel.tsx',import.meta.url),'utf8'),plain=esbuild.transformSync(panel,{loader:'tsx',format:'esm',jsx:'preserve'}).code;
const input=panel.slice(panel.indexOf('// native-image-input:start'),panel.indexOf('// native-image-input:end')).replace(/^export /gm,'');
const assets=panel.slice(panel.indexOf('// bundled-assets:start'),panel.indexOf('// bundled-assets:end'));
const helpers=['hostProbeSeconds','validateMiniOwnGrid','prepareMiniOwnMusic'].map(name=>topLevel(plain,name)).join('\n');
const music=clickAudio(120),replacement=clickAudio(100);
async function fixture(t){
 const f=await holdFixture(t),file=path.join(f.root,"own 'quote' $() \uc74c\uc545.wav"),hooks={},abort=new AbortController();let live=true,runs=0;
 fs.writeFileSync(file,music.wav);
 f.files.fingerprint=async p=>fs.existsSync(p)?{size:fs.statSync(p).size,sha256:createHash('sha256').update(fs.readFileSync(p)).digest('hex')}:null;
 const box=vm.createContext({crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,Float32Array,DataView,AbortController,setTimeout,clearTimeout,OWN_RATE:22050,OWN_MAX_SECONDS:240,BEAT_TIMEOUT_MS:60000,
  analyseBeat:async(_source,samples)=>{runs++;await hooks.worker?.(samples);return engine.analyze(samples,22050);}});
 vm.runInContext(input+'\n'+assets+'\n'+helpers+'\nthis.prepare=prepareMiniOwnMusic;',box);
 return {...f,file,box,abort,analysisHooks:hooks,workerRuns:()=>runs,stopAnalysis:()=>{live=false;},analyze:(worker='source-v1')=>box.prepare(f.local,file,f.data,worker,abort.signal,()=>live),replace:()=>fs.writeFileSync(file,replacement.wav)};
}
test('Mini own analysis: real PCM and engine bind a validated grid to original contents, reuse verified JSON and leave no staging',async t=>{
 const f=await fixture(t),a=await f.analyze(),b=await f.analyze();
 assert.ok(Math.abs(a.bpm-120)<.2);assert.equal(a.sourceObservation.path,f.file);assert.equal(a.sourceObservation.sha256,createHash('sha256').update(music.wav).digest('hex'));
 assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));assert.equal(f.workerRuns(),1);assert.equal(f.calls.filter(c=>c.bin==='ffmpeg').length,1);
 assert.equal(fs.readdirSync(f.data).some(name=>name.startsWith('sbs-')),false);
 assert.equal(fs.readdirSync(path.join(f.data,'own-music')).some(name=>name.startsWith('.')),false);
});
test('Mini own analysis: changed contents and Worker source each invalidate the derived result',async t=>{
 const f=await fixture(t),a=await f.analyze();f.replace();const b=await f.analyze(),c=await f.analyze('source-v2');
 assert.ok(Math.abs(a.bpm-120)<.2);assert.ok(Math.abs(b.bpm-100)<.2);assert.equal(b.bpm,c.bpm);assert.notEqual(a.sourceObservation.sha256,b.sourceObservation.sha256);assert.equal(f.workerRuns(),3);
});
test('Mini own analysis: original replacement during Worker execution never returns the old grid',async t=>{
 const f=await fixture(t);f.analysisHooks.worker=()=>f.replace();await assert.rejects(f.analyze(),/changed/i);
 assert.equal(jsonFiles(f.data).length,0);assert.equal(fs.readdirSync(path.join(f.data,'own-music')).some(name=>name.startsWith('.')),false);
});
test('Mini own analysis: ordinary Worker error uses confirmed sample duration without caching transient failure',async t=>{
 const f=await fixture(t);f.analysisHooks.worker=()=>{throw Error('Worker failed');};const a=await f.analyze();
 assert.equal(a.failed,true);assert.equal(a.durationSeconds,30);assert.equal(a.sourceObservation.path,f.file);assert.equal(jsonFiles(f.data).length,0);
 delete f.analysisHooks.worker;const b=await f.analyze();assert.equal(b.accepted,true);assert.equal(f.workerRuns(),2);
});
for(const flag of ['terminal','preserveTemporaryFiles'])test('Mini own analysis: '+flag+' Worker failure cannot become fixed timing',async t=>{
 const f=await fixture(t);f.analysisHooks.worker=()=>{throw Object.assign(Error('cleanup unconfirmed'),{[flag]:true});};
 await assert.rejects(f.analyze(),e=>e.terminal||e.preserveTemporaryFiles);assert.equal(jsonFiles(f.data).length,0);
});
test('Mini own analysis: source replacement during ordinary Worker failure cannot become fixed timing',async t=>{
 const f=await fixture(t);f.analysisHooks.worker=()=>{f.replace();throw Error('Worker failed');};await assert.rejects(f.analyze(),/changed/i);
});
test('Mini own analysis: decoder failure probes the verified snapshot and retains no cache',async t=>{
 const f=await fixture(t);f.hooks.beforeTool=(bin)=>{if(bin==='ffmpeg')throw Error('decoder unavailable');};const result=await f.analyze();
 assert.equal(result.failed,true);assert.equal(result.durationSeconds,30);assert.equal(jsonFiles(f.data).length,0);
 const probe=f.calls.find(call=>call.bin==='ffprobe');assert.ok(probe.args.at(-1).includes('.source-'));assert.notEqual(probe.args.at(-1),f.file);
});
test('Mini own analysis: cancellation during native decode rejects late output and cleans only owned staging',async t=>{
 const f=await fixture(t);f.hooks.afterTool=()=>f.abort.abort();await assert.rejects(f.analyze(),/ended|stopped/i);
 assert.equal(f.workerRuns(),0);assert.equal(jsonFiles(f.data).length,0);
 assert.equal(fs.readdirSync(path.join(f.data,'own-music')).some(name=>name.startsWith('.')),false);
});
test('Mini own analysis: corrupted published JSON is recomputed through the same verified source owner',async t=>{
 const f=await fixture(t);await f.analyze();const object=jsonFiles(f.data).find(p=>p.includes(path.sep+'objects'+path.sep));assert.ok(object);fs.writeFileSync(object,'{}');
 const b=await f.analyze();assert.equal(b.accepted,true);assert.equal(f.workerRuns(),2);
});
