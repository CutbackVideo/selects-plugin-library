import assert from 'node:assert/strict';
import test from 'node:test';
import * as input from '../shared/native-image-input.mjs';
const video=id=>({resourceId:id,kind:'video'});
test('Handed media selection: preserve order and deduplicate the same declared Resource',()=>{
 const selected=[video('v1'),{resourceId:'p1',kind:'image'},video('v1'),video('v2')],before=JSON.stringify(selected);
 assert.deepEqual(input.templateMediaSelection(selected),[{rid:'v1',kind:'video'},{rid:'p1',kind:'image'},{rid:'v2',kind:'video'}]);assert.equal(JSON.stringify(selected),before);
 assert.deepEqual(input.templateMediaSelection([]),[]);
});
for(const value of [null,{},[null],[{resourceId:7,kind:'video'}],[video('')],[video(' v1')],[video('x'.repeat(1025))],[{resourceId:'v1',kind:'audio'}],[video('v1'),{resourceId:'v1',kind:'image'}],Array.from({length:51},(_,i)=>video('v'+i))])test('Handed media selection: malformed or contradictory selection refuses '+JSON.stringify(value).slice(0,90),()=>{
 assert.throws(()=>input.templateMediaSelection(value),error=>error.code==='template-input-invalid');
});
test('Handed media selection: declared 50-file bound is inclusive',()=>assert.equal(input.templateMediaSelection(Array.from({length:50},(_,i)=>video('v'+i))).length,50));

function kindFixture(rows){
 const calls={placements:0,resources:0},selects={project:()=>({resources:async()=>{calls.resources++;return rows;},createDraft:async()=>{const clips=[];return {clips:async()=>clips,insertResource:async({resourceId})=>{calls.placements++;clips.push({clipId:clips.length+1,resourceId:resourceId==='original'?'r0':'r1'});}};}})};
 return {calls,run:(kind='video',options={includeKind:true,dimensions:false})=>input.resolveTemplateMedia(selects,'p',[{rid:'original',kind}],'kind fixture',options)};
}
for(const [type,kind] of [['Video','video'],['Image','image']])test('Observed source kind: '+type+' is confirmed by current Project metadata',async()=>{
 const f=kindFixture([{resourceId:'r0',type}]),r=await f.run(kind);assert.equal(r.resolved[0].kind,kind);assert.equal(f.calls.resources,1);assert.deepEqual(r.failed,[]);
});
for(const type of ['Image','Audio','Sequence'])test('Observed source kind: declaring a '+type+' as video cannot pass',async()=>{
 const f=kindFixture([{resourceId:'r0',type}]),r=await f.run();assert.equal(r.resolved.length,0);assert.equal(r.failed[0].code,'source-kind-mismatch');assert.equal(r.failed[0].phase,'kind');assert.equal(f.calls.placements,1);
});
for(const rows of [null,[],[{resourceId:'r0',type:'Video'},{resourceId:'r0',type:'Image'}]])test('Observed source kind: incomplete/ambiguous catalog is unknown '+JSON.stringify(rows),async()=>{
 const r=await kindFixture(rows).run();assert.equal(r.resolved.length,0);assert.equal(r.failed[0].code,'source-resolution-unknown');
});
test('Observed source kind: legacy callers keep their exact result shape and require no catalog',async()=>{
 const f=kindFixture(null),r=await f.run('video',{});assert.deepEqual(r,{resolved:[{rid:'original',alias:'r0',size:null}],failed:[]});assert.equal(f.calls.resources,0);
});
test('Observed source kind: unreadable metadata is unknown without a second placement',async()=>{
 let placements=0;
 const selects={project:()=>({resources:async()=>{throw Error('catalog transport unavailable');},createDraft:async()=>{const clips=[];return {clips:async()=>clips,insertResource:async()=>{placements++;clips.push({clipId:1,resourceId:'r0'});}};}})};
 const r=await input.resolveTemplateMedia(selects,'p',[{rid:'original',kind:'video'}],'kind fixture',{includeKind:true});
 assert.equal(r.resolved.length,0);assert.equal(r.failed[0].phase,'kind');assert.equal(r.failed[0].code,'source-resolution-unknown');assert.equal(placements,1);
});
test('Observed source kind: a batch shares one metadata observation',async()=>{
 let reads=0;
 const selects={project:()=>({resources:async()=>{reads++;return [{resourceId:'r0',type:'Video'},{resourceId:'r1',type:'Video'}];},createDraft:async()=>{const clips=[];return {clips:async()=>clips,insertResource:async({resourceId})=>clips.push({clipId:clips.length+1,resourceId})};}})};
 const r=await input.resolveTemplateMedia(selects,'p',[{rid:'r0',kind:'video'},{rid:'r1',kind:'video'}],'kind fixture',{includeKind:true});
 assert.deepEqual(r.failed,[]);assert.deepEqual(r.resolved.map(row=>row.kind),['video','video']);assert.equal(reads,1);
});
test('Observed source kind: contradictory or missing kind cannot pass the opted-in receipt validator',()=>{
 const files=[{rid:'original',kind:'video'}];
 for(const kind of [undefined,'image','audio'])assert.throws(()=>input.validateTemplateMediaResult({resolved:[{rid:'original',alias:'r0',size:null,...kind?{kind}:{}}],failed:[]},files,{includeKind:true}),e=>e.code==='source-resolution-unknown');
});
