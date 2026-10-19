const test=require('node:test'),assert=require('node:assert/strict');
const {mfcc}=require('../lib/speaker-audio.cjs'),{trackFaces}=require('../lib/speaker-tracks.cjs'),{validateRequest}=require('../lib/request.cjs'),{verifySpeakerOutput}=require('../lib/speaker-output.cjs');
test('MFCC matches independent python_speech_features reference including energy and lifter',()=>{
 const fixture=require('./fixtures/speaker-mfcc-reference.json'),pcm=Float64Array.from({length:16000},(_,i)=>Math.floor(12000*Math.sin(i*.13)+4000*Math.sin(i*.031)+.5)),got=mfcc(pcm);
 assert.equal(got.length,fixture.frames*13);
 fixture.indices.forEach((fi,ri)=>fixture.values[ri].forEach((v,ci)=>assert.ok(Math.abs(v-got[fi*13+ci])<.0001,`${fi}/${ci}: ${v} != ${got[fi*13+ci]}`)));
 assert.ok([...mfcc(new Float64Array(16000))].every(Number.isFinite));
});
test('speaker task rejects images and unbounded windows',()=>{
 const base={contractVersion:1,task:'speakers.detect',input:{source:{path:__filename},sourceRange:{startSeconds:1,endSeconds:4}}};assert.equal(validateRequest(base),base);
 assert.throws(()=>validateRequest({...base,input:{source:{path:__filename,kind:'image'}}}),/video window/);
 assert.throws(()=>validateRequest({...base,input:{...base.input,sourceRange:{startSeconds:0,endSeconds:61}}}),/60/);
});
test('tracks do not assign one detection to multiple people and ignore sporadic faces',()=>{
 const face=x=>({box:{xmin:x,ymin:10,xmax:x+30,ymax:50},score:.9});
 const samples=Array.from({length:25},(_,i)=>({faces:[face(20+i),face(200-i),...(i===0?[face(400)]:[])]}));const tracks=trackFaces(samples);assert.equal(tracks.length,2);assert.ok(tracks.every(t=>t.length===25));
});
test('speaker outputs reject invented probabilities, nonfinite scores and out-of-range time',()=>{
 const d={contractVersion:1,task:'speakers.detect',scoreKind:'uncalibrated-logit',trackingScope:'three-second-window',frameSize:{width:100,height:100},samples:[{index:0,sourceTimeSeconds:1,faces:[{box:{xmin:1,ymin:1,xmax:20,ymax:20},score:.9,activeSpeakerScore:-2,trackId:'window-0:0'}]}]};
 const check=x=>verifySpeakerOutput(x,{startSeconds:1,endSeconds:2},d.frameSize);check(d);assert.throws(()=>check({...d,scoreKind:'probability'}));
 const bad=structuredClone(d);bad.samples[0].faces[0].activeSpeakerScore=NaN;assert.throws(()=>check(bad));bad.samples[0].sourceTimeSeconds=2;assert.throws(()=>check(bad));
});

test('speaker windows cover fractional ranges without a sub-frame remainder',()=>{
 const {speakerWindows}=require('../tasks/speakers-detect.cjs');
 for(const length of [21.017633333333,30,0.5338666667,60]) {
  const start=1239.3414666666667,windows=speakerWindows({startSeconds:start,endSeconds:start+length});
  assert.ok(windows.every(w=>w.duration>=.04&&w.duration<=3));
  assert.equal(windows[0].start,start);
  windows.forEach((w,i)=>{if(i)assert.ok(Math.abs(w.start-windows[i-1].start-windows[i-1].duration)<1e-9);});
  assert.ok(Math.abs(windows.at(-1).start+windows.at(-1).duration-start-length)<1e-9);
 }
});
