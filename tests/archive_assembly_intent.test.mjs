import {vlogOperation} from './sdk_free_helpers.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {assemblyIntentFixture} from './mini_assembly_intent_fixture.mjs';
import {checkScriptTypes} from './run_script_types.mjs';
const source=vlogOperation('archive-vlog','assemble');
export const fixture=options=>{const f=assemblyIntentFixture({scriptSource:source,probeName:'Archive source timing check',...options});f.cfg.musicFadeOut=1;return f;};
test('Archive large analysis source: generated assembly uses native bytes before placement and commit',async()=>{
 const f=fixture(),file=f.addFile('/large-original');f.cfg.analysisSources=[file.observation];
 const stat=f.files.stat;file.observation.size=4*1024**3;f.files.stat=async path=>({...await stat(path),size:file.observation.size});
 f.files.readRange=async()=>{throw Error('Large original must not cross the range-read bridge');};
 await f.run();assert.equal(file.entry.nativeReads,2);assert.equal(f.calls.commits,1);
});
for(const kinds of [['chapter','subchapter'],['other']])test('Archive assembly: native '+kinds.join('/')+' rows '+(kinds[0]==='other'?'cannot enter the saved assembly':'are preserved without counting as media'),async()=>{
 const f=fixture(),create=f.project.createDraft;
 f.project.createDraft=async options=>{
  const d=await create(options),clips=d.clips;
  d.clips=async options=>{const rows=await clips(options);return options?.trackScope==='all'?rows.concat(rows.filter(row=>row.trackKind==='main').flatMap(row=>kinds.map((trackKind,index)=>({...row,clipId:10000+row.clipId*2+index,trackId:trackKind,trackKind,resourceId:null,text:'NA'})))):rows;};
  return d;
 };
 if(kinds[0]==='other'){await assert.rejects(f.run());assert.equal(f.calls.commits,0);}
 else{const result=await f.run();assert.equal(result.placed,2);assert.equal(f.calls.commits,1);}
});
test('Archive assembly control: normal mixed photo/video layout retains its intended cuts',async()=>{
 const f=fixture();const a=await f.run();assert.equal(a.totalFrames,65);assert.equal(f.calls.commits,1);assert.equal(a.placed,2);
});
for(const rate of [24000/1001,25,30000/1001,60])test('Archive assembly: native source windows cover exact Draft cuts at '+rate,async()=>{
 const f=fixture({rate,sourceRates:{photo:30,video:25}});f.cfg.picks[1].startSeconds=3.23;
 const a=await f.run(),rows=f.drafts.at(-1).rows();assert.equal(a.totalFrames,Math.round(2.17*rate));assert.equal(rows[0].endFrame,Math.round(1.03*rate));assert.equal(rows[1].startFrame,rows[0].endFrame);assert.equal(rows[1].endFrame,a.totalFrames);
 assert.equal(rows[1]._source.startSeconds,Math.round(3.23*25)/25);assert.ok(Math.abs(rows[1]._source.endSeconds-rows[1]._source.startSeconds-(rows[1].endFrame-rows[1].startFrame)/rate)<1e-10);assert.equal(f.calls.commits,1);
});
for(const fault of ['ignored insert','duplicate insert','wrong source','wrong interval','changed earlier','ignored crop','canvas','ignored trim'])test('Archive assembly: '+fault+' cannot be committed as the requested plan',async()=>{
 const f=fixture({fault,rate:24000/1001,sourceRates:{photo:30,video:25}});await assert.rejects(f.run());assert.equal(f.calls.commits,0);
});
for(const fault of ['wrong music','ignored fade'])test('Archive assembly: '+fault+' cannot silently pass Audio admission',async()=>{
 const f=fixture({fault});f.cfg.music={resourceId:'music',sectionStart:2.345};f.cfg.musicFadeOut=1;await assert.rejects(f.run());assert.equal(f.calls.commits,0);
});
test('Archive assembly: music keeps its explicit normal-speed source and one-second fade',async()=>{
 const f=fixture({rate:30000/1001});f.cfg.music={resourceId:'music',sectionStart:2.345};f.cfg.musicFadeOut=1;const a=await f.run(),audio=f.drafts.at(-1).rows().find(row=>row.trackKind==='audio');
 assert.equal(audio.resourceId,'music');assert.equal(audio.endFrame,a.totalFrames);assert.equal(audio._source.startSeconds,Math.round(2.345*(30000/1001))/(30000/1001));assert.equal(audio._audio.fadeOutSeconds,Math.round(30000/1001)/(30000/1001));
});
test('Archive assembly: one pre-save hook owns the complete prepared state',async()=>{
 const f=fixture();let hooked=0;f.cfg.__beforeCommit=async d=>{hooked++;assert.equal(f.calls.commits,0);assert.equal((await d.clips()).filter(row=>row.trackKind==='main').length,2);};await f.run();assert.equal(hooked,1);assert.equal(f.calls.commits,1);
});
test('Archive assembly: failed pre-save confirmation cannot dispatch a commit',async()=>{
 const f=fixture();f.cfg.__beforeCommit=async()=>{throw Error('prepared state refused');};await assert.rejects(f.run(),/prepared state refused/);assert.equal(f.calls.commits,0);
});
for(const missing of ['source path','file contents'])test('Archive assembly: '+missing+' changed before admission prevents save',async()=>{
 const f=fixture(),file=f.addFile('/source.wav');f.cfg.analysisSources=[file.observation];f.cfg.sourceBindings=[{resourceId:'music',path:'/source.wav'}];
 f.project.sourceFiles=async()=>({fileTree:[{resourceId:'music',type:'audio',path:missing==='source path'?'/other.wav':'/source.wav'}]});if(missing==='file contents')file.entry.bytes=Buffer.from('changed fixture bytes');
 await assert.rejects(f.run());assert.equal(f.calls.commits,0);
});
test('Archive assembly: generated operation matches actual SDK declarations',()=>{
 const f=fixture();checkScriptTypes([{name:'Archive assembly intent',script:source.replace('__CONFIG__',()=> 'JSON.parse('+JSON.stringify(JSON.stringify(f.cfg))+')')}]);
});
