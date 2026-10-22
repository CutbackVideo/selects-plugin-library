// Developer diagnostic, not a passing regression for the current defect.
// Uses actual Mini Build/beat-engine code with the existing disposable SDK/save
// fixture. Never connects to Electron or writes a real Project.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {miniMusicFixture} from '../tests/mini_music_fixture.mjs';
const require=createRequire(import.meta.url);
const {analyze}=require('../plugins/mini-vlog/beat-detect.cjs');
const rate=22050,seconds=30;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');

function clickAudio(bpm){
 const samples=new Float32Array(rate*seconds);
 for(let time=.5;time<seconds;time+=60/bpm){
  const first=Math.round(time*rate);
  for(let k=0;k<400&&first+k<samples.length;k++)samples[first+k]+=Math.sin(2*Math.PI*1000*k/rate)*Math.exp(-k/80);
 }
 const wav=Buffer.alloc(44+samples.length*2);
 wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);
 wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);
 wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);
 wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples.length*2,40);
 for(let i=0;i<samples.length;i++){
  const value=Math.round(Math.max(-1,Math.min(1,samples[i]))*32767);
  wav.writeInt16LE(value,44+i*2);samples[i]=value/32768;
 }
 const grid=analyze(samples,rate);
 assert.equal(grid.accepted,true);assert.ok(Math.abs(grid.bpm-bpm)<.2);
 return {wav,grid};
}

export async function reproduceMiniOwnMusic(){
 const original=clickAudio(120),replacement=clickAudio(100),cleanup=[],observations=[];
 assert.equal(original.wav.length,replacement.wav.length);
 try{
  for(const mode of ['unchanged','same-size same-mtime replacement','missing']){
   const fixture=await miniMusicFixture({after:fn=>cleanup.push(fn)},{entry:'panel',own:true});
   const file=path.join(fixture.root,'own-track.wav'),planned=[];
   fs.writeFileSync(file,original.wav);fs.utimesSync(file,946684800,946684800);
   fixture.hooks.duration=seconds;
   Object.assign(fixture.box,{ownMusic:{path:file,name:'own-track.wav'},ownGrid:original.grid,ownDuration:seconds,grid:{...original.grid,usableEnd:seconds-.5},musicStart:original.grid.firstBeat});
   const plan=fixture.box.mvPlanBuild;
   fixture.box.mvPlanBuild=options=>{planned.push(options.bpm);return plan(options);};
   await fixture.run();assert.equal(fixture.saved.length,1,JSON.stringify(fixture.errors));
   const before=planned.length;
   if(mode.startsWith('same-size')){fs.writeFileSync(file,replacement.wav);fs.utimesSync(file,946684800,946684800);assert.equal(fs.statSync(file).size,original.wav.length);assert.equal(fs.statSync(file).mtimeMs,946684800000);}
   if(mode==='missing')fs.unlinkSync(file);
   await fixture.run();
   observations.push({mode,secondAssemblyDispatched:fixture.saved.length>1,secondPlannerCalls:planned.length-before,plannerBpmForSecond:planned.length>before?planned.at(-1):null,originalMusicExists:fs.existsSync(file),fileBytes:original.wav.length,mtimeMs:946684800000,originalSha256:digest(original.wav),currentSha256:fs.existsSync(file)?digest(fs.readFileSync(file)):null,actualOriginalEngineBpm:original.grid.bpm,actualReplacementEngineBpm:mode.startsWith('same-size')?replacement.grid.bpm:null,errors:fixture.errors.map(error=>String(error))});
  }
  return {observations,input:'Valid 30-second mono PCM16 WAV at 22050 Hz. Actual existing engine analyzes the quantized samples.',limits:'Prior React state is supplied from actual engine output. The actual Build callback runs; SDK Project/save boundaries use the existing fixture. No native Worker/UI/Project save/playback/export proof. A diagnostic does not require the defect to remain present.',cleanup:'All disposable fixtures are removed after their fixture video producers have completed.'};
 }finally{for(const finish of cleanup.reverse())await finish();}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await reproduceMiniOwnMusic(),null,2));
