import assert from 'node:assert/strict';import test from 'node:test';import fs from 'node:fs';import vm from 'node:vm';
import {assemblyIntentFixture as fixture} from './mini_assembly_intent_fixture.mjs';import {checkScriptTypes} from './run_script_types.mjs';
const source=fs.readFileSync(new URL('../plugins/mini-vlog/scripts/verify-assembly.js',import.meta.url),'utf8');
const clone=v=>JSON.parse(JSON.stringify(v));
async function saved(options={}){const f=fixture(options),result=await f.run(),target=f.drafts.at(-1);f.project.meta=async()=>({draftIds:[result.sequenceId]});return {...f,target,result,verify:(extra={})=>vm.runInNewContext('(async()=>{'+source.replace('__CONFIG__',()=>JSON.stringify({config:f.cfg,draftId:result.sequenceId,legacyPunch:null,...extra}))+'})()',{selects:{project:()=>f.project,draft:id=>{assert.equal(id,result.sequenceId);return target.d;}}})};}
for(const rate of [24000/1001,25,30,60])test('read-only Mini plan: native clocks and photo crop confirm at '+rate,async()=>{
 const f=await saved({rate,sourceRates:{photo:30,video:25}}),before=JSON.stringify(f.target.rows()),count=f.calls.commits,r=await f.verify();assert.equal(r.verified,true);assert.equal(f.calls.commits,count);assert.equal(JSON.stringify(f.target.rows()),before);
});
for(const change of ['cut','source','window','speed','crop','overlay','music'])test('read-only Mini plan: a self-consistent historical '+change+' mismatch is refused without editing it',async()=>{
 const f=await saved(),rows=f.target.rows();
 if(change==='cut')rows[1].endFrame++;if(change==='source')rows[1].resourceId='other';if(change==='window')rows[1]._source.startSeconds+=1/30;if(change==='speed')rows[1].playbackSpeed={numerator:2,denominator:1};if(change==='crop')rows[0]._transform.scale.x=1;if(change==='overlay')rows.push({...clone(rows[0]),clipId:900,trackKind:'video'});if(change==='music')rows.push({...clone(rows[1]),clipId:901,trackKind:'audio'});
 const before=JSON.stringify(rows);const rejected=await f.verify();assert.equal(rejected.status,'mismatch');assert.equal(rejected.verified,false);assert.equal(f.calls.commits,1);assert.equal(JSON.stringify(rows),before);
});
test('read-only Mini plan: music source clock and fades match the explicit normal-speed plan',async()=>{
 const f=fixture({rate:24000/1001});f.cfg.music={resourceId:'music',sectionStart:2.345,tailSeconds:.68,referenceCuts:true};const r=await f.run(),target=f.drafts.at(-1);f.project.meta=async()=>({draftIds:[r.sequenceId]});
 const run=()=>vm.runInNewContext('(async()=>{'+source.replace('__CONFIG__',()=>JSON.stringify({config:f.cfg,draftId:r.sequenceId,legacyPunch:null}))+'})()',{selects:{project:()=>f.project,draft:()=>target.d}});
 assert.equal((await run()).verified,true);target.rows().find(r=>r.trackKind==='audio')._audio.fadeOutSeconds=0;assert.equal((await run()).status,'mismatch');assert.equal(f.calls.commits,1);
});
test('read-only Mini plan: legacy Beat punch cannot use an obsolete requested origin',async()=>{
 const f=await saved(),picks=clone(f.cfg.picks);assert.equal((await f.verify({legacyPunch:picks})).verified,true);picks[1].startSeconds+=1/30;assert.equal((await f.verify({legacyPunch:picks})).status,'mismatch');assert.equal(f.calls.commits,1);
});
test('read-only Mini plan: generated request matches the current SDK declarations',()=>{const f=fixture();checkScriptTypes([{name:'Mini read-only plan admission',script:source.replace('__CONFIG__',()=>JSON.stringify({config:f.cfg,draftId:'owned',legacyPunch:null}))}]);});
test('read-only Mini plan: unreadable native timing is unavailable and remains retryable',async()=>{
 const f=await saved(),original=f.project.createDraft;f.project.createDraft=async input=>{const d=await original(input);d.meta=async()=>{throw Error('temporary source metadata failure');};return d;};assert.equal((await f.verify()).status,'unavailable');f.project.createDraft=original;assert.equal((await f.verify()).verified,true);assert.equal(f.calls.commits,1);
});
test('read-only Mini plan: a target read exception is unavailable rather than a declared mismatch',async()=>{
 const f=await saved(),original=f.target.d.clipTransform;f.target.d.clipTransform=async()=>{throw Error('temporary target metadata failure');};assert.equal((await f.verify()).status,'unavailable');f.target.d.clipTransform=original;assert.equal((await f.verify()).verified,true);assert.equal(f.calls.commits,1);
});
