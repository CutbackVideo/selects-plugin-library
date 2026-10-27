import assert from 'node:assert/strict';import test from 'node:test';import {checkScriptTypes} from './run_script_types.mjs';import {assemblyIntentFixture as fixture,script} from './mini_assembly_intent_fixture.mjs';
for(const fault of ['ignored insert','wrong source','wrong interval','duplicate insert','changed earlier','ignored crop','canvas'])test('Mini assembly intent: '+fault+' cannot be committed as the plan',async()=>{
 const f=fixture({fault});await assert.rejects(f.run(),/placement|interval|source|transform|canvas|plan|frame/i);assert.equal(f.calls.commits,0);
});
for(const invalid of ['missing cut','nonfinite cut','reversed cut','empty picks','invalid photo size','negative music start'])test('Mini assembly intent: '+invalid+' is rejected before creating a working Draft',async()=>{
 const f=fixture();if(invalid==='missing cut')f.cfg.boundaries.pop();if(invalid==='nonfinite cut')f.cfg.boundaries[1]=NaN;if(invalid==='reversed cut')f.cfg.boundaries[1]=3;if(invalid==='empty picks')f.cfg.picks=[];if(invalid==='invalid photo size')f.cfg.crops.photo.width=0;if(invalid==='negative music start')f.cfg.music={resourceId:'music',sectionStart:-1};
 await assert.rejects(f.run());assert.equal(f.calls.creates,0);assert.equal(f.calls.commits,0);
});
for(const rate of [25,30,30000/1001])test('Mini assembly intent: healthy repeated video sources and exact frame boundaries at '+rate,async()=>{
 const f=fixture({rate,reverse:true});f.cfg.picks.push({rid:'video',kind:'video',startSeconds:8.3,sourceDuration:20});f.cfg.boundaries.push(3.42);
 const r=await f.run();assert.equal(f.calls.commits,1);assert.equal(r.placed,3);const rows=f.drafts.at(-1).rows().filter(c=>c.resourceId);assert.deepEqual(rows.map(c=>c.endFrame),f.cfg.boundaries.slice(1).map(t=>Math.round(t*rate)));
 assert.ok(Math.abs(rows[0]._transform.scale.x-80/27)<1e-8,'the correct original photo receives its crop despite SDK row order');assert.equal(rows[1]._source.startSeconds,Math.round(3.21*rate)/rate);
});
test('Mini assembly intent: adopting the first source rate replans an unsaved probe and commits only the exact final layout',async()=>{
 const f=fixture({rate:30,adopt:25}),r=await f.run();assert.equal(f.drafts.filter(d=>!d.probe).length,2);assert.equal(f.calls.commits,1);assert.equal(r.fps,25);assert.equal(r.totalFrames,Math.round(2.17*25));
});
test('Mini assembly intent: an ignored ambient write is reported rather than counted as applied',async()=>{
 const f=fixture({fault:'ignored sound'});f.cfg.clipSound='ambient';const r=await f.run();assert.equal(r.ambientClips,0);assert.equal(r.notes.length,1);assert.equal(f.calls.commits,1);
});
for(const fault of ['wrong music','ignored fade'])test('Mini assembly intent: '+fault+' cannot pass music completion',async()=>{
 const f=fixture({fault});f.cfg.music={resourceId:'music',sectionStart:2.345,tailSeconds:.68,referenceCuts:true};await assert.rejects(f.run(),/Audio|music|source|fade|settings|intent/i);assert.equal(f.calls.commits,0);
});
test('Mini assembly intent: generated operation matches the actual SDK declarations',()=>{assert.equal(checkScriptTypes([{name:'Mini assembly intent',script:script.replace('__CONFIG__',JSON.stringify(fixture().cfg))}]).scripts,1);});

for(const rate of [24000/1001,30,60])test('Mini native clocks: 25/30 fps sources conform and trim to exact cuts on '+rate,async()=>{
 const f=fixture({rate,sourceRates:{photo:30,video:25}});f.cfg.boundaries=[0,31/30,70/30];const r=await f.run(),rows=f.drafts.at(-1).rows();
 assert.equal(r.totalFrames,Math.round(70/30*rate));assert.deepEqual(rows.map(c=>c.endFrame),f.cfg.boundaries.slice(1).map(t=>Math.round(t*rate)));assert.ok(f.calls.trims>0);assert.equal(f.calls.commits,1);
 const source=rows[1]._source;assert.ok(Math.abs(source.startSeconds*25-Math.round(source.startSeconds*25))<1e-8);assert.ok(Math.abs(source.endSeconds-source.startSeconds-(rows[1].endFrame-rows[1].startFrame)/rate)<1e-8);
});
test('Mini native clocks: an ignored declared trim cannot reach save',async()=>{
 const f=fixture({rate:24000/1001,sourceRates:{photo:30,video:25},fault:'ignored trim'});await assert.rejects(f.run(),/placement|interval|plan/);assert.equal(f.calls.commits,0);assert.ok(f.calls.trims>0);
});
test('Mini native clocks: an unexpected insertion length is rejected before any corrective trim',async()=>{
 const f=fixture({rate:24000/1001,sourceRates:{photo:30,video:25},fault:'wrong interval'});await assert.rejects(f.run(),/placement|interval|plan/);assert.equal(f.calls.trims,0);assert.equal(f.calls.commits,0);
});
for(const rate of [24000/1001,25,30])test('Mini music intent: exact Audio source/range and quantized fades at '+rate,async()=>{
 const f=fixture({rate});f.cfg.music={resourceId:'music',sectionStart:2.345,tailSeconds:.68,referenceCuts:true};const r=await f.run(),rows=f.drafts.at(-1).rows(),music=rows.find(c=>c.trackKind==='audio');
 assert.equal(r.totalFrames,Math.round(2.17*rate));assert.equal(music.endFrame,Math.round((2.17+.68)*rate));assert.equal(music._source.startSeconds,Math.round(2.345*rate)/rate);assert.equal(music._audio.fadeOutSeconds,Math.round(.12*rate)/rate);assert.equal(f.calls.commits,1);
});
test('Mini music clock: explicit normal-speed overlay aligns to the declared Draft grid',async()=>{
 const f=fixture({rate:30,sourceRates:{music:120}});f.cfg.boundaries=[0,1.0056,2.0056];f.cfg.music={resourceId:'music',sectionStart:2.345,referenceCuts:false};
 const r=await f.run(),rows=f.drafts.at(-1).rows().filter(c=>c.trackKind==='main'&&c.resourceId);assert.deepEqual(rows.map(c=>c.endFrame),[31,61]);assert.equal(r.totalFrames,61);
});
test('Mini plan contract: repeating one photo Resource rejects before authoring while repeated video Resources remain supported',async()=>{
 const f=fixture();f.cfg.picks.push({...f.cfg.picks[0]});f.cfg.boundaries.push(3.42);await assert.rejects(f.run(),/plan|photo|invalid/i);assert.equal(f.calls.creates,0);
});
test('Mini analysis source: content change after placement prevents the assembly commit',async()=>{
 const f=fixture(),file=f.addFile('/analysis-original'),create=f.project.createDraft;f.cfg.analysisSources=[file.observation];f.project.createDraft=async input=>{const d=await create(input);file.entry.bytes=Buffer.from('changed fixture bytes');return d;};
 await assert.rejects(f.run(),e=>e.code==='source-file-changed');assert.equal(f.calls.commits,0);assert.equal(file.entry.nativeReads,2);assert.equal(file.entry.reads,0);
});
test('Mini analysis source: unavailable original stops before any source probe or working Draft',async()=>{
 const f=fixture();f.cfg.analysisSources=[{path:'/analysis-original',size:4,sha256:'a'.repeat(64)}];await assert.rejects(f.run(),e=>e.code==='source-file-missing');assert.equal(f.calls.creates,0);assert.equal(f.calls.commits,0);
});
test('Mini large analysis source: generated assembly uses native bytes before placement and commit',async()=>{
 const f=fixture(),file=f.addFile('/large-original');f.cfg.analysisSources=[file.observation];let starts=0;
 const stat=f.files.stat;file.observation.size=4*1024**3;f.files.stat=async path=>({...await stat(path),size:file.observation.size});
 f.files.readRange=async()=>{throw Error('Large original must not cross the range-read bridge');};
 f.selects.media={startFFmpeg:async()=>({jobId:'hash-'+ ++starts}),job:()=>({status:async({cursor=0}={})=>({state:'succeeded',events:cursor?[]:[{cursor:1,stream:'stdout',text:'SHA256='+file.observation.sha256+'\n'}],nextCursor:1,truncated:false}),cancel:async()=>{throw Error('Completed hash must not be cancelled');}})};
 await f.run();assert.equal(starts,2);assert.equal(f.calls.commits,1);
});
test('Mini source binding: a relink during assembly refuses commit even while the old file remains',async()=>{
 const f=fixture();f.cfg.sourceBindings=[{resourceId:'video',path:'/original.mp4'}];let reads=0;f.project.sourceFiles=async()=>({fileTree:[{type:'video',resourceId:'video',path:++reads===1?'/original.mp4':'/relinked.mp4'}]});
 await assert.rejects(f.run(),e=>e.code==='source-path-changed');assert.equal(f.calls.commits,0);assert.equal(reads,2);
});
