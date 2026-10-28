import assert from 'node:assert/strict';
import test from 'node:test';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {archivePreviewFixture,flushTurn} from './archive_preview_fixture.mjs';

test('Archive actual preview: Stop settles missing metadata and releases media request/listeners',async t=>{
 const f=archivePreviewFixture(t);f.hooks.metadata=false;let ended=false;const work=f.run().finally(()=>{ended=true;});await f.waitFor('metadata');
 assert.equal(f.audio.length,1);f.stop();await work;
 assert.equal(ended,true,'Stop must settle the metadata wait');
 assert.equal(f.audio[0].src,'');assert.equal(f.timers.size,0);
 assert.equal([...f.audio[0].handlers.values()].reduce((n,set)=>n+set.size,0),0);
 assert.ok(f.calls.some(row=>row[0]==='load'&&row[1]===''));await work;
});

test('Archive actual preview: existing local URL streams large originals without whole-file/Blob copies and preserves absolute seek/fade',async t=>{
 const f=archivePreviewFixture(t),work=f.run();await f.waitFor('playing');
 assert.equal(f.calls.filter(row=>row[0]==='whole-read'||row[0]==='blob').length,0);
 assert.equal(f.audio[0].src,'local://.'+encodeURI(f.file));assert.ok(f.states.includes('playing'));
 assert.equal(f.calls.find(row=>row[0]==='play')[1],12.345);
 f.audio[0]._time=17.145;await f.advance(40);assert.ok(Math.abs(f.audio[0].volume-.5)<1e-8);
 f.audio[0]._time=17.345;await f.advance(40);await work;
 assert.equal(f.audio[0].src,'');assert.equal(f.states.at(-1),'idle');assert.equal(f.timers.size,0);
});

test('Archive actual preview: second click in the same render stops the first request instead of opening another Audio',async t=>{
 const f=archivePreviewFixture(t);f.hooks.metadata=false;let ended=0;const first=f.run().finally(()=>ended++);await f.waitFor('metadata');
 const second=f.run().finally(()=>ended++);await Promise.all([first,second]);assert.equal(f.audio.length,1);assert.equal(ended,2);await Promise.all([first,second]);
});

for(const phase of ['metadata','seek','play'])test('Archive actual preview: '+phase+' timeout releases source and permits a healthy retry',async t=>{
 const f=archivePreviewFixture(t);if(phase==='metadata')f.hooks.metadata=false;else if(phase==='seek')f.hooks.seek=false;else f.hooks.play=()=>new Promise(()=>{});
 let ended=false;const work=f.run().finally(()=>{ended=true;});await f.waitFor(phase);await f.advance(1001);await work;
 assert.equal(ended,true);assert.equal(f.errors.length,1);assert.equal(f.audio[0].src,'');assert.equal(f.timers.size,0);await work;
 f.hooks.metadata=true;f.hooks.seek=true;f.hooks.play=()=>Promise.resolve();const next=f.run();await f.waitFor('playing');assert.equal(f.audio.length,2);assert.equal(f.states.at(-1),'playing');f.stop();await next;
});

test('Archive actual preview: Project replacement during pending media cannot publish late playback',async t=>{
 const f=archivePreviewFixture(t);f.hooks.metadata=false;let ended=false;const work=f.run().finally(()=>{ended=true;});await f.waitFor('metadata');
 f.box.projectRef.current='new-project';await f.advance(51);await work;assert.equal(ended,true);assert.equal(f.errors.length,0);f.audio[0].emit('loadedmetadata');await flushTurn();assert.equal(f.calls.filter(row=>row[0]==='play').length,0);await work;
});

test('Archive actual preview: reserved filename delimiters remain part of the exact original path',async t=>{
 const f=archivePreviewFixture(t),file='/music/\ud55c\uae00 #part?50%.wav';f.box.ownMusic.path=file;f.box.ownGrid.sourceObservation.path=file;
 const work=f.run();await f.waitFor('playing');assert.equal(f.audio[0].src,'local://./music/%ED%95%9C%EA%B8%80%20%23part%3F50%25.wav');
 assert.ok(f.calls.some(row=>row[0]==='fromURL'&&row[1]===f.audio[0].src));f.stop();await work;
});

for(const file of ['c:\\music space\\\ud55c\uae00 #part?50%.wav','\\\\Server\\Share\\\ud55c\uae00 #part.wav'])test('Asset URL: Windows host roundtrip retains '+file,async t=>{
 const f=archivePreviewFixture(t);f.box.sdk.environment.platform='win32';
 f.files.pathToLocalURL=async value=>pathToFileURL(value,{windows:true}).href.replace('file:','local:');
 f.files.localURLToPath=async value=>fileURLToPath(value.replace('local:','file:'),{windows:true});
 const url=await f.box.readAssetPlaybackURL(f.box.sdk,file,()=>{});assert.equal(f.files.localURLToPath?fileURLToPath(url.replace('local:','file:'),{windows:true}).toLowerCase():null,file.toLowerCase());assert.ok(url.includes('%23'));assert.equal(f.audio.length,0);
});

for(const change of ['missing','changed'])test('Archive actual preview: '+change+' original is refused before playback',async t=>{
 const f=archivePreviewFixture(t);let count=0;
 f.hooks.fingerprint=()=>change==='missing'?null:{size:2**31+17,sha256:(++count===1?'a':'b').repeat(64)};
 await f.run();assert.equal(f.calls.some(row=>row[0]==='play'),false);assert.equal(f.errors.length,1);assert.equal(f.timers.size,0);
 if(f.audio[0])assert.equal(f.audio[0].src,'');
});

test('Asset URL: a different resolved original cannot be played',async t=>{
 const f=archivePreviewFixture(t);f.files.localURLToPath=async()=>'/other.wav';await f.run();assert.equal(f.audio.length,0);assert.equal(f.errors.length,1);
});

test('Archive actual preview: stopped URL preparation and late old replies cannot replace a newer playback',async t=>{
 const f=archivePreviewFixture(t);let release;f.hooks.url=()=>new Promise(resolve=>{release=resolve;});
 let ended=false;const old=f.run().finally(()=>ended=true);await f.waitFor('url');f.stop();await old;assert.equal(ended,true);assert.equal(f.audio.length,0);
 delete f.hooks.url;const next=f.run();await f.waitFor('playing');const current=f.audio[0];assert.equal(f.states.at(-1),'playing');
 release('local:///old.wav');await flushTurn();assert.equal(current.src,'local://.'+encodeURI(f.file));assert.equal(f.states.at(-1),'playing');f.stop();await Promise.all([old,next]);
});

test('Archive actual preview: play refusal and early end settle visibly; stalled playback times out',async t=>{
 const f=archivePreviewFixture(t);f.hooks.play=()=>Promise.reject(Error('autoplay denied'));await f.run();assert.equal(f.errors.length,1);assert.equal(f.audio[0].src,'');
 delete f.hooks.play;const early=f.run();await f.waitFor('playing');f.audio[1].emit('ended');await early;assert.equal(f.errors.length,2);
 const stalled=f.run();await f.waitFor('playing');await f.advance(1001);await stalled;assert.equal(f.errors.length,3);assert.equal(f.timers.size,0);
});

test('Archive actual preview: unmount settles waits and cannot publish late UI state',async t=>{
 const f=archivePreviewFixture(t);f.hooks.metadata=false;const work=f.run();await f.waitFor('metadata');const count=f.states.length;f.box.mountedRef.current=false;await f.advance(41);await work;f.audio[0].emit('loadedmetadata');await flushTurn();assert.equal(f.states.length,count);assert.equal(f.audio[0].src,'');assert.equal(f.errors.length,0);
});

test('Archive actual preview: a section shorter than its fade starts at the same gain as its playback curve',async t=>{
 const f=archivePreviewFixture(t);f.box.videoSeconds=.2;let volume;f.hooks.play=audio=>{volume=audio.volume;return Promise.resolve();};
 const work=f.run();await f.waitFor('playing');assert.ok(Math.abs(volume-.5)<1e-8);f.stop();await work;
});

test('Asset playback: cleanup attempts every owned release and reports failure rather than success',async t=>{
 const f=archivePreviewFixture(t),abort=new AbortController(),work=f.box.playAssetAudioPreview({signal:abort.signal,prepare:async()=>({url:'local:///a.wav'}),startSeconds:0,durationSeconds:5,createMedia:()=>{const a=new f.box.Audio();a.pause=()=>{throw Error('private pause failure');};return a;}});
 await f.waitFor('play');abort.abort();await assert.rejects(work,error=>error.code==='BUNDLED_ASSET_CLEANUP'&&error.terminal&&error.cleanupFailures.length===1);
 assert.equal(f.audio[0].src,'');assert.ok(f.calls.some(row=>row[0]==='load'&&row[1]===''));assert.equal(f.timers.size,0);
});

test('Archive actual preview: Stop cleanup uncertainty remains visible and blocks replacement playback in the same panel',async t=>{
 const f=archivePreviewFixture(t);f.hooks.metadata=false;const work=f.run();await f.waitFor('metadata');f.audio[0].pause=()=>{throw Error('pause outcome unknown');};f.stop();await work;
 assert.equal(f.errors.length,1);assert.equal(f.box.previewCleanupRef.current?.code,'BUNDLED_ASSET_CLEANUP');
 const count=f.audio.length;await f.run();assert.equal(f.audio.length,count);assert.equal(f.errors.length,2);
});

for(const fields of [{startSeconds:NaN},{durationSeconds:0},{fadeSeconds:-1},{timeoutMs:Infinity}])test('Asset playback rejects invalid policy before preparing or creating resources '+JSON.stringify(fields),async t=>{
 const f=archivePreviewFixture(t);let prepared=0;await assert.rejects(f.box.playAssetAudioPreview({signal:new AbortController().signal,prepare:async()=>{prepared++;return{url:'local:///a.wav'};},startSeconds:0,durationSeconds:5,...fields}),error=>error.code==='BUNDLED_ASSET_INPUT');assert.equal(prepared,0);assert.equal(f.audio.length,0);assert.equal(f.timers.size,0);
});

for(const phase of ['fingerprint','url','play'])test('Archive fixture waits for actual playing after delayed '+phase+', not promise depth',async t=>{
 const f=archivePreviewFixture(t);let release,ready=false;
 const gate=new Promise(resolve=>{release=resolve;});f.hooks[phase]=()=>gate;
 const work=f.run(),playing=f.waitFor('playing').then(()=>{ready=true;});
 await f.waitFor(phase);await flushTurn();assert.equal(ready,false,'the held production boundary has not reported playing');
 release(phase==='fingerprint'?{size:2**31+17,sha256:'a'.repeat(64)}:phase==='url'?'local://.'+encodeURI(f.file):undefined);
 await playing;assert.equal(f.states.at(-1),'playing');f.stop();await work;
 assert.equal(f.timers.size,0);assert.equal(f.audio[0].src,'');
});

test('Archive fixture teardown awaits an owned preview even while source preparation is unresolved',async t=>{
 const f=archivePreviewFixture(t);let release;
 f.hooks.fingerprint=()=>new Promise(resolve=>{release=resolve;});
 const work=f.run();await f.waitFor('fingerprint');assert.equal(f.running.size,1);
 await f.dispose();await work;assert.equal(f.running.size,0);assert.equal(f.timers.size,0);assert.equal(f.audio.length,0);
 release({size:2**31+17,sha256:'a'.repeat(64)});await flushTurn();assert.equal(f.audio.length,0);assert.equal(f.states.includes('playing'),false);
});
