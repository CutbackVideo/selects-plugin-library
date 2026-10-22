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
const panel=fs.readFileSync(new URL('../plugins/archive-vlog/panel.tsx',import.meta.url),'utf8'),plain=esbuild.transformSync(panel,{loader:'tsx',format:'esm',jsx:'preserve'}).code,nested=plain.replace(/^  /gm,'');
const block=name=>panel.slice(panel.indexOf('// '+name+':start'),panel.indexOf('// '+name+':end')).replace(/^export /gm,'');
const helpers=['hostBytes','hostDecodePcm','hostProbeSeconds','decodeOwnMusic',...(plain.includes('function prepareArchiveOwnMusic(')?['prepareArchiveOwnMusic']:[])].map(name=>topLevel(plain,name)).join('\n');
const callers=['cancelOwnMusic','detectOwnMusic'].map(name=>topLevel(nested,name)).join('\n');
const music=clickAudio(120),replacement=clickAudio(100),digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function fixture(t){
 const f=await holdFixture(t),file=path.join(f.root,"own 'quote' $() \uc74c\uc545.wav"),hooks={},errors=[];let runs=0,grid=null,selected=null,status=null;
 fs.writeFileSync(file,music.wav);
 f.files.fingerprint=async p=>fs.existsSync(p)?{size:fs.statSync(p).size,sha256:digest(fs.readFileSync(p))}:null;
 const globals={crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,Float32Array,DataView,AbortController,setTimeout,clearTimeout,window:{},OWN_RATE:22050,OWN_MAX_SECONDS:240,BEAT_TIMEOUT_MS:60000,
  analyseBeat:async(_source,samples)=>{runs++;await hooks.worker?.(samples);return engine.analyze(samples,22050);},panelLocalClient:()=>f.local,sdk:{},busyRef:{current:false},roots:{data:f.data},assets:{beatWorker:'source-v1'},ownJobRef:{current:{id:0,abort:null}},mountedRef:{current:true},projectRef:{current:'p'},stopPreview:()=>{},setListening:()=>{},setOwnMusic:value=>{selected=value;},setOwnGrid:value=>{grid=value;},setStatus:value=>{status=value;},
  errorSay:(error,format)=>{errors.push(error);return lang=>format(lang,error.message);},t:(_lang,key)=>key,uiError:say=>Error(say('en')),
 };
 const box=vm.createContext(globals);vm.runInContext(block('native-image-input')+'\n'+block('bundled-assets')+'\n'+helpers+'\n'+callers+'\nthis.detect=detectOwnMusic;',box);
 return {...f,file,box,analysisHooks:hooks,errors,workerRuns:()=>runs,selected:()=>selected,
  analyze:async()=>{await box.detect({path:file,name:path.basename(file)});if(status?.tone==='error')throw errors.at(-1)||Error('analysis refused');return grid;},
  replace:()=>fs.writeFileSync(file,replacement.wav)};
}
test('Archive own analysis control: real PCM and engine retain the 120 BPM grid',async t=>{
 const f=await fixture(t),a=await f.analyze();assert.ok(Math.abs(a.bpm-120)<.2);assert.equal(a.accepted,true);
});
test('Archive own analysis: actual caller binds the grid to original contents and reuses verified JSON',async t=>{
 const f=await fixture(t),a=await f.analyze(),b=await f.analyze();assert.equal(a.sourceObservation?.path,f.file);assert.equal(a.sourceObservation?.sha256,digest(music.wav));assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));assert.equal(f.workerRuns(),1);assert.equal(f.calls.filter(call=>call.bin==='ffmpeg').length,1);
});
test('Archive own analysis: source replacement during Worker execution cannot publish the old grid',async t=>{
 const f=await fixture(t);f.analysisHooks.worker=()=>f.replace();await assert.rejects(f.analyze(),/changed/i);assert.equal(f.selected(),null);assert.equal(jsonFiles(f.data).length,0);
});
test('Archive own analysis: changed source and Worker revision invalidate the result',async t=>{
 const f=await fixture(t),a=await f.analyze();f.replace();const b=await f.analyze();f.box.assets.beatWorker='source-v2';const c=await f.analyze();assert.ok(Math.abs(a.bpm-120)<.2);assert.ok(Math.abs(b.bpm-100)<.2);assert.equal(c.bpm,b.bpm);assert.notEqual(a.sourceObservation?.sha256,b.sourceObservation?.sha256);assert.equal(f.workerRuns(),3);
});
test('Archive own analysis: ordinary Worker failure uses confirmed duration without caching failure',async t=>{
 const f=await fixture(t);f.analysisHooks.worker=()=>{throw Error('Worker failed');};const a=await f.analyze();assert.equal(a.failed,true);assert.equal(a.durationSeconds,30);assert.equal(a.sourceObservation?.path,f.file);assert.equal(jsonFiles(f.data).length,0);delete f.analysisHooks.worker;assert.equal((await f.analyze()).accepted,true);assert.equal(f.workerRuns(),2);
});
for(const flag of ['terminal','preserveTemporaryFiles'])test('Archive own analysis: '+flag+' Worker failure cannot become fixed timing',async t=>{
 const f=await fixture(t);f.analysisHooks.worker=()=>{throw Object.assign(Error('cleanup unconfirmed'),{[flag]:true});};await assert.rejects(f.analyze());assert.equal(f.selected(),null);assert.equal(jsonFiles(f.data).length,0);
});
test('Archive own analysis: an unconfirmed probe exit propagates instead of becoming an unavailable duration',async t=>{
 const f=await fixture(t);f.local.media.runFFmpeg=async()=>{throw Error('decoder unavailable');};f.local.media.runFFprobe=async()=>{throw Object.assign(Error('probe exit unknown'),{preserveTemporaryFiles:true});};await assert.rejects(f.analyze());assert.equal(f.selected(),null);
});
test('Archive own analysis: source uncertainty clears the track before decoding',async t=>{
 const f=await fixture(t);f.files.fingerprint=async()=>null;await assert.rejects(f.analyze());assert.equal(f.workerRuns(),0);assert.equal(f.calls.length,0);assert.equal(f.selected(),null);
});
test('Archive own analysis: corrupt published JSON is recomputed using the same source owner',async t=>{
 const f=await fixture(t);await f.analyze();const object=jsonFiles(f.data).find(p=>p.includes(path.sep+'objects'+path.sep));assert.ok(object);fs.writeFileSync(object,'{}');assert.equal((await f.analyze()).accepted,true);assert.equal(f.workerRuns(),2);
});
test('Archive own analysis: ordinary native decode failure preserves WebAudio fallback on the verified snapshot',async t=>{
 const f=await fixture(t);f.local.media.runFFmpeg=async()=>{throw Error('native decoder unavailable');};const decoded=[];
 f.box.window.OfflineAudioContext=class{async decodeAudioData(buffer){decoded.push(new Uint8Array(buffer));const view=new DataView(buffer),samples=new Float32Array((buffer.byteLength-44)/2);for(let i=0;i<samples.length;i++)samples[i]=view.getInt16(44+i*2,true)/32768;return {sampleRate:22050,length:samples.length,numberOfChannels:1,getChannelData:()=>samples};}};
 const a=await f.analyze();assert.equal(a.accepted,true);assert.equal(a.sourceObservation?.sha256,digest(music.wav));assert.equal(decoded.length,1);assert.equal(digest(decoded[0]),digest(music.wav));
});
