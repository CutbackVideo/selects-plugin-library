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

test('track gaps are measured in frames when faces are detected every eighth frame',()=>{
 const face=x=>({box:{xmin:x,ymin:10,xmax:x+30,ymax:50},score:.9});
 // One missed detection: two frames apart at full rate, sixteen frames apart at stride 8.
 const samples=Array.from({length:10},(_,i)=>({faces:i===5?[]:[face(20+8*i)]}));
 assert.deepEqual(trackFaces(samples).map(t=>t.length),[9]);
 assert.deepEqual(trackFaces(samples,8),[]);
 const steady=Array.from({length:10},(_,i)=>({faces:[face(20+8*i),face(300-8*i)]}));
 assert.ok(trackFaces(steady,8).every(t=>t.length===10));
});

test('faces between sparse detections are interpolated, never extrapolated',()=>{
 const {interpolateTrack}=require('../lib/speaker-tracks.cjs');
 const face=(x,score)=>({box:{xmin:x,ymin:10,xmax:x+30,ymax:50},score});
 const track=[{i:2,face:face(0,.8)},{i:10,face:face(80,1)},{i:18,face:face(80,.9)}];
 const filled=interpolateTrack(track);
 assert.deepEqual(filled.map(f=>f.i),[3,4,5,6,7,8,9,11,12,13,14,15,16,17]);
 const at6=filled.find(f=>f.i===6).face;
 assert.equal(at6.box.xmin,40);assert.equal(at6.box.xmax,70);assert.ok(Math.abs(at6.score-.9)<1e-9);assert.equal(at6.interpolated,true);
 assert.ok(filled.every(f=>f.face.interpolated===true&&f.face.landmarks===undefined));
});

test('speaker outputs accept scored interpolated faces',()=>{
 const d={contractVersion:1,task:'speakers.detect',scoreKind:'uncalibrated-logit',trackingScope:'three-second-window',frameSize:{width:100,height:100},samples:[
  {index:0,sourceTimeSeconds:1,faces:[{box:{xmin:1,ymin:1,xmax:20,ymax:20},score:.9,activeSpeakerScore:1,trackId:'window-0:0'}]},
  {index:1,sourceTimeSeconds:1.04,faces:[{box:{xmin:2,ymin:1,xmax:21,ymax:20},score:.9,activeSpeakerScore:1.2,trackId:'window-0:0',interpolated:true}]}]};
 verifySpeakerOutput(d,{startSeconds:1,endSeconds:2},d.frameSize);
});

test('speaker probe reads only the timestamp origin, not the range frames',async()=>{
 const processPath=require.resolve('../lib/process.cjs'),videoPath=require.resolve('../lib/video.cjs');
 const original=require.cache[processPath];const calls=[];
 require('../lib/process.cjs');
 require.cache[processPath]={...original,exports:{...original.exports,collectTool:async(tool,args)=>{
  calls.push(args);
  if(args.includes('-show_frames'))return JSON.stringify({frames:Array.from({length:64},(_,i)=>({best_effort_timestamp:1000+i*1001}))});
  return JSON.stringify({streams:[{width:1920,height:1080,time_base:'1/30000',avg_frame_rate:'30000/1001'}],format:{start_time:'0.033'}});
 }}};
 delete require.cache[videoPath];
 try {
  const {probeVideo}=require('../lib/video.cjs');
  const request=task=>({task,input:{source:{path:'/x.mp4'},sourceRange:{startSeconds:.5,endSeconds:1.5}}});
  const video=await probeVideo({tools:{ffprobe:'ffprobe'}},request('speakers.detect'));
  const frameReads=calls.filter(a=>a.includes('-show_frames'));
  assert.deepEqual(frameReads.map(a=>a[a.indexOf('-read_intervals')+1]),['%+#64']);
  assert.equal(video.width,1920);assert.equal(video.height,1080);
  assert.ok(Math.abs(video.timestampOriginSeconds-1000/30000)<1e-12);assert.equal(video.formatStartTime,.033);
  calls.length=0;await probeVideo({tools:{ffprobe:'ffprobe'}},request('faces.detect'));
  assert.equal(calls.filter(a=>a.includes('-show_frames')).length,2);
 } finally {require.cache[processPath]=original;delete require.cache[videoPath];}
});

test('a face cut away after 72% of a window is kept at either detection rate',()=>{
 const face=()=>({box:{xmin:100,ymin:10,xmax:130,ymax:50},score:.9});
 // 75 frames, the face is visible in frames 0-53 (a camera cut follows).
 const full=Array.from({length:75},(_,i)=>({faces:i<54?[face()]:[]}));
 assert.equal(trackFaces(full).length,1);
 const frames=[...Array.from({length:10},(_,k)=>8*k),74];
 assert.equal(trackFaces(frames.map(i=>full[i]),8,75).length,1);
 assert.equal(trackFaces(frames.map(i=>({faces:i<46?[face()]:[]})),8,75).length,0);
});
