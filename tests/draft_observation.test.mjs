import test from 'node:test';
import assert from 'node:assert/strict';
import {readTemplateDraftSources,templateObservedSource} from '../shared/draft-observation.js';

const ticks=705600000;
function core(schema='Cutback.Clip.2',timing){return {owner:{projectId:'p',libraryId:'l'},isEditedDraft:true,sequenceJson:{schema:'Cutback.Timeline.1',id:'d',libraryId:'l',frameRate:30,frameRateRatio:{numerator:30,denominator:1},tracks:{children:[{schema:'Cutback.Track.1',id:'a',kind:'Audio',children:[{schema,id:7,sourceRange:{startTime:schema.endsWith('.2')?26.2*ticks:786,duration:schema.endsWith('.2')?196*ticks/30:196},mediaReferences:{defaultMedia:{id:'song'}},cut:false,...timing?{timing}:{}}]}]}}};}
function host({unsupported=false,fail=false,raw=core(),snapshot}={}){const calls=[];return {calls,call:async(method,...args)=>{calls.push([method,...args]);if(method==='getDraftCore'){assert.deepEqual(args,['d']);return structuredClone(raw);}assert.equal(method,'getDraftMediaSnapshot');assert.deepEqual(args,['p','d']);if(unsupported)throw Error('Panels cannot call "getDraftMediaSnapshot".');if(fail)throw Error('Draft unavailable');return snapshot??{revision:'r1',fps:30,clips:[{clipId:7,trackId:'a',trackKind:'audio',resourceId:'song',startFrame:0,endFrame:196,sourceStartSeconds:26.2,sourceEndSeconds:26.2+196/30,playbackSpeed:1}]};}};}

test('existing saved bridge returns actual source independently from timeline placement',async()=>{
 const h=host(),result=await readTemplateDraftSources(h,'p','d','l');
 const row={clipId:7,trackId:'a',trackKind:'audio',resourceId:'alias',startFrame:0,endFrame:196};
 assert.deepEqual(templateObservedSource(result,row),{clipId:7,startSeconds:26.2,endSeconds:26.2+196/30});
 assert.equal(result.owner.libraryId,'l');assert.equal(h.calls.length,2);
 assert.throws(()=>templateObservedSource(result,{...row,trackId:'wrong'}),/source|target/i);
 assert.throws(()=>templateObservedSource(result,{...row,endFrame:197}),/source|target/i);
});
test('legacy host fallback reads saved Clip.1 frame ranges without a new SDK method',async()=>{
 const h=host({unsupported:true,raw:core('Cutback.Clip.1')}),result=await readTemplateDraftSources(h,'p','d','l');
 assert.equal(result.clips[0].source.startSeconds,26.2);
 assert.equal(result.clips[0].source.endSeconds,(786+196)/30);
 assert.equal(result.clips[0].endFrame,196);
});
test('Clip.2 fallback respects exact rational timing and nonzero rounding phase',async()=>{
 const policy={playbackSpeed:{numerator:17,denominator:19},sourceTickRoundingRemainder:18,preserveAudioPitch:true};
 const raw=core('Cutback.Clip.2',policy),r=await readTemplateDraftSources(host({unsupported:true,raw}),'p','d','l');
 const duration=BigInt(raw.sequenceJson.tracks.children[0].children[0].sourceRange.duration);
 const round=(n,d)=>(2n*n+d)/(2n*d),delta=round(18n+17n*duration,19n)-round(18n,19n);
 assert.equal(r.clips[0].source.endSeconds,(26.2*ticks+Number(delta))/ticks);
 assert.equal(r.clips[0].playbackSpeed,17/19);
});
test('unknown schema, duplicate identity, malformed source and wrong owner fail closed',async()=>{
 for(const mutate of [r=>r.owner.projectId='other',r=>r.sequenceJson.id='other',r=>r.sequenceJson.tracks.children[0].children[0].schema='Future.Clip.3',r=>r.sequenceJson.tracks.children[0].children.push(structuredClone(r.sequenceJson.tracks.children[0].children[0])),r=>r.sequenceJson.tracks.children[0].children[0].sourceRange.duration=NaN]){
  const raw=core();mutate(raw);await assert.rejects(readTemplateDraftSources(host({unsupported:true,raw}),'p','d','l'));
 }
 const snapshot={revision:'r',fps:30,clips:[{clipId:7,trackId:'a',trackKind:'audio',resourceId:'song',startFrame:0,endFrame:196,sourceStartSeconds:NaN,sourceEndSeconds:40,playbackSpeed:1}]};
 await assert.rejects(readTemplateDraftSources(host({snapshot}),'p','d','l'));
});
test('real bridge failures never silently switch to a different observation',async()=>{
 await assert.rejects(readTemplateDraftSources(host({fail:true}),'p','d','l'),/unavailable/);
});
test('revision witness changes when the saved source changes',async()=>{
 const h=host({unsupported:true}),first=await readTemplateDraftSources(h,'p','d','l');
 const raw=core();raw.sequenceJson.tracks.children[0].children[0].sourceRange.startTime+=1;
 const second=await readTemplateDraftSources(host({unsupported:true,raw}),'p','d','l');
 assert.notEqual(first.revision,second.revision);
});
