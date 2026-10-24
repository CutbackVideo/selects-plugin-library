import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {miniMusicFixture} from './mini_music_fixture.mjs';
import {clickAudio} from '../tools/repro_mini_own_music.mjs';
const original=clickAudio(120),replacement=clickAudio(100);
async function selected(t){
 const f=await miniMusicFixture(t,{entry:'panel',own:true}),file=path.join(f.root,'selected music.wav');
 fs.writeFileSync(file,original.wav);fs.utimesSync(file,946684800,946684800);
 Object.assign(f.box,{ownMusic:{path:file,name:'selected music.wav'},ownGrid:{...original.grid,sourceObservation:{path:file,size:original.wav.length,sha256:f.digest(original.wav)}},grid:{...original.grid,usableEnd:29.5}});
 f.hooks.duration=30;
 return {...f,music:file,replace(){fs.writeFileSync(file,replacement.wav);fs.utimesSync(file,946684800,946684800);}};
}
test('Mini own music: valid analyzed contents reach Audio and durable source gates together',async t=>{
 const f=await selected(t),result=await f.run();assert.ok(result?.music?.resourceId);
 assert.equal(f.digest(fs.readFileSync(f.imports[0])),f.box.ownGrid.sourceObservation.sha256);
 assert.ok(result.analysisSources.some(row=>row.path===f.music&&row.sha256===f.box.ownGrid.sourceObservation.sha256));
 assert.ok(result.sourceBindings.some(row=>row.resourceId===result.music.resourceId&&row.path===f.music));
});
for(const change of ['same-size same-mtime','missing','unknown','no provenance'])test('Mini own music: '+change+' cannot reuse a previous grid or import',async t=>{
 const f=await selected(t);
 if(change==='same-size same-mtime'){f.replace();assert.equal(fs.statSync(f.music).size,original.wav.length);assert.equal(fs.statSync(f.music).mtimeMs,946684800000);}
 if(change==='missing')fs.unlinkSync(f.music);
 if(change==='unknown'){const readRange=f.files.readRange;f.files.readRange=input=>{if(input.path===f.music)throw Error('controlled source read failure');return readRange(input);};}
 if(change==='no provenance')delete f.box.ownGrid.sourceObservation;
 let planned=0;const plan=f.box.mvPlanBuild;f.box.mvPlanBuild=(...args)=>{planned++;return plan(...args);};
 await f.run();assert.equal(planned,0);assert.equal(f.imports.length,0);assert.equal(f.saved.length,0);assert.ok(f.errors.length);
});
test('Mini own music: replacement during planning is refused before Audio import',async t=>{
 const f=await selected(t),plan=f.box.mvPlanBuild;f.box.mvPlanBuild=(...args)=>{f.replace();return plan(...args);};
 await f.run();assert.equal(f.imports.length,0);assert.equal(f.saved.length,0);assert.ok(f.errors.length);
});
test('Mini own music: replacement during import is refused before assembly',async t=>{
 const f=await selected(t);f.hooks.imported=()=>f.replace();
 await f.run();assert.equal(f.imports.length,1);assert.equal(f.saved.length,0);assert.ok(f.errors.length);
});
test('Mini own music: Audio metadata shorter than the planned section cannot reach assembly',async t=>{
 const f=await selected(t);f.hooks.duration=1;
 await f.run();assert.equal(f.imports.length,1);assert.equal(f.saved.length,0);assert.ok(f.errors.length);
});
for(const entry of ['panel','template'])test('Mini cue: '+entry+' carries the verified published Audio into durable source gates',async t=>{
 const f=await miniMusicFixture(t,{entry}),result=await f.run();assert.ok(result?.music?.resourceId);
 assert.ok(result.analysisSources.some(row=>row.path===f.imports[0]&&row.sha256===f.cue.sha256));
 assert.ok(result.sourceBindings.some(row=>row.path===f.imports[0]&&row.resourceId===result.music.resourceId));
});
