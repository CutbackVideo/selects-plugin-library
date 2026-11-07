'use strict';
// One speakers.detect window (at most 3 s), shared by the desktop worker and
// the web runtime (web/runtime.mjs inlines this file). Callers decode the
// window themselves: 25 fps RGB24 frames at the analysis size and 16 kHz mono
// signed 16-bit samples, both starting at the window's source time.
const {rgbToLetterboxBlob,decodeYuNet,mapFaceToDisplay}=require('./yunet-decode.cjs');
const {mfcc}=require('./speaker-audio.cjs');
const {trackFaces,interpolateTrack,smoothBoxes,facePixels}=require('./speaker-tracks.cjs');
const {detectFrameChanges}=require('./frame-change.cjs');
const {MICROSECONDS_PER_SECOND,SPEAKER_WINDOW_MICROSECONDS,speakerDurationMicroseconds}=require('./speaker-time.cjs');
// Stable windows use ~3 fps YuNet; changed windows and Light-ASD use every frame.
const DETECT_STRIDE=8;
// Distribute the remainder across windows so a sub-frame tail cannot become
// an empty decode request. Every window remains within the model's 3s scope.
function speakerWindows(range) {
  const length = speakerDurationMicroseconds(range);
  const count = Math.ceil(length / SPEAKER_WINDOW_MICROSECONDS);
  return Array.from({length: count}, (_, i) => {
    const offset = Math.floor(length * i / count);
    const end = Math.floor(length * (i + 1) / count);
    return {
      start: range.startSeconds + offset / MICROSECONDS_PER_SECOND,
      duration: (end - offset) / MICROSECONDS_PER_SECOND,
    };
  });
}
// The analysis raster: at most 960x540, never upscaled.
function speakerAnalysisSize(video) {
  const scale=Math.min(1,960/video.width,540/video.height);
  return {width:Math.max(2,Math.round(video.width*scale)),height:Math.max(2,Math.round(video.height*scale))};
}
/**
 * Scores one decoded window. `state` carries what spans windows: the sample
 * index, the track counter, the reusable letterbox buffer and timings.
 * `pcm` holds signed 16-bit sample values. Returns the window's samples in
 * display pixels of `video`.
 */
async function scoreSpeakerWindow({ort,yunet,model,video,width,height,rgb,pcm,start,duration,rangeStart,scoreThreshold,state,onFacesDetected,signal,timings}) {
  // Web callers omit the optional desktop measurements.
  const timed=timings??{measure:(_,fn)=>fn(),measureAsync:(_,fn)=>fn()};
  const stride=width*height*3,n=Math.min(Math.floor(rgb.length/stride),Math.floor((1+Math.ceil(Math.max(0,pcm.length-400)/160))/4),Math.ceil(Math.round(duration * MICROSECONDS_PER_SECOND) / 40_000));
  if(n<1)throw new Error('No synchronized audio/video samples in speaker window');
  // Decide using every decoded frame before skipping any face detections.
  // Detect throughout changed windows so brief shots between sparse samples
  // are observable. Quiet windows retain the 8-frame stride.
  const changeBegan=performance.now(),changes=timed.measure('frameChange',()=>detectFrameChanges(rgb,width,height,n));
  state.changeMilliseconds+=performance.now()-changeBegan;
  const detectionStride=changes.length?1:DETECT_STRIDE;
  if(changes.length){state.denseWindows++;state.changeWindows.push({start,duration,changes});}else state.sparseWindows++;
  const audioFeatures=timed.measure('audioFeatures',()=>mfcc(pcm));const frames=[],samples=[],detected=[];const faceBegan=performance.now();
  for(let i=0;i<n;i++) {
    signal.throwIfAborted();const frame=rgb.subarray(i*stride,(i+1)*stride);frames.push(frame);
    samples.push({index:state.sampleCount+i,sourceTimeSeconds:start+i/25,faces:[]});
    if(i%detectionStride&&i!==n-1)continue;
    let blob;const input=timed.measure('faceInput',()=>{blob=rgbToLetterboxBlob(frame,width,height,state.letterbox);state.letterbox=blob.data;return new ort.Tensor('float32',blob.data,[1,3,640,640]);});
    const raw=await timed.measureAsync('faceInference',()=>yunet.run({[yunet.inputNames[0]]:input}));
    try {samples[i].faces=timed.measure('faceOutput',()=>decodeYuNet(Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,v.data])),640,640,{score:scoreThreshold??.8}).map(f=>mapFaceToDisplay(f,blob,width,height)).filter(Boolean));}
    finally{input.dispose();for(const v of Object.values(raw))v.dispose();}
    detected.push(i);
  }
  state.faceMilliseconds+=performance.now()-faceBegan;state.faceDetections+=detected.length;
  await onFacesDetected?.();
  const tracks=timed.measure('tracking',()=>trackFaces(detected.map(i=>samples[i]),detectionStride,n));
  for(const observed of tracks) {
    const {track,id,visual}=timed.measure('faceCrops',()=>{
      const track=observed.map(({i,face})=>({i:detected[i],face}));
      const id=state.trackCount++,boxes=smoothBoxes(track,n),visual=new Float32Array(n*112*112);
      frames.forEach((f,i)=>visual.set(facePixels(f,width,height,boxes[i]),i*112*112));
      // ASD scores every frame of the track, so the faces between detections
      // carry its score too; they are marked as interpolated geometry.
      for(const between of interpolateTrack(track)){samples[between.i].faces.push(between.face);track.push(between);}
      return {track,id,visual};
    });
    const scores=new Float64Array(n);const began=performance.now();
    for(const seconds of [1,2,3])for(let offset=0;offset<n;offset+=seconds*25) {
      signal.throwIfAborted();const end=Math.min(n,offset+seconds*25),count=end-offset;
      const {at,vt}=timed.measure('speakerInput',()=>({
        at:new ort.Tensor('float32',audioFeatures.slice(offset*4*13,end*4*13),[1,count*4,13]),
        vt:new ort.Tensor('float32',visual.slice(offset*112*112,end*112*112),[1,count,112,112]),
      }));
      const out=await timed.measureAsync('speakerInference',()=>model.run({audio:at,video:vt}));
      try {timed.measure('speakerOutput',()=>{if(out.scores.data.length!==count)throw new Error('Speaker model output length mismatch');for(let i=0;i<count;i++){const score=out.scores.data[i];if(!Number.isFinite(score))throw new Error('Non-finite speaker score');scores[offset+i]+=score/3;}});}
      finally{at.dispose();vt.dispose();for(const v of Object.values(out))v.dispose();}
    }
    state.inferenceMilliseconds+=performance.now()-began;
    // No face is extrapolated beyond a track's detections. IDs belong to
    // this short window only; callers cannot treat them as person IDs.
    for(const {i,face} of track){face.activeSpeakerScore=scores[i];face.trackId=`window-${Math.round((start-rangeStart)*25)}:${id}`;}
  }
  state.sampleCount+=n;
  return {frameCount:n,samples:samples.map(sample=>({...sample,faces:sample.faces.map(face=>({
    ...face,
    box:Object.fromEntries(Object.entries(face.box).map(([key,value])=>{
      const displaySize=key.includes('x')?video.width:video.height;
      const analysisSize=key.includes('x')?width:height;
      // Rescaling a clamped edge can round beyond the displayed raster.
      return [key,Math.max(0,Math.min(displaySize,value/(analysisSize/displaySize)))];
    })),
    landmarks:face.landmarks?.map(({x,y})=>({x:x/(width/video.width),y:y/(height/video.height)})),
  }))}))};
}
function newSpeakerState() {
  return {sampleCount:0,trackCount:0,letterbox:undefined,changeMilliseconds:0,faceMilliseconds:0,inferenceMilliseconds:0,faceDetections:0,denseWindows:0,sparseWindows:0,changeWindows:[]};
}
// The speakers.json document and job summary both hosts publish.
function speakersOutput({video,range,model,samples,state,decodeMilliseconds,elapsedMilliseconds,provider='cpu'}) {
  const document={contractVersion:1,task:'speakers.detect',coordinateSpace:'display-pixels',boxFormat:'xyxy',frameSize:{width:video.width,height:video.height},model,parameters:{sourceRange:range},scoreKind:'uncalibrated-logit',sampleRate:25,faceDetectionStride:DETECT_STRIDE,faceDetectionPolicy:'frame-change-dense-window',trackingScope:'three-second-window',samples};
  return {document,metrics:{sampleCount:samples.length,faceDetections:state.faceDetections,trackCount:state.trackCount,changeMilliseconds:state.changeMilliseconds,denseWindows:state.denseWindows,sparseWindows:state.sparseWindows,decodeMilliseconds,faceMilliseconds:state.faceMilliseconds,inferenceMilliseconds:state.inferenceMilliseconds,elapsedMilliseconds},diagnostics:{provider,changeWindows:state.changeWindows,faceDetectionStride:DETECT_STRIDE,modelSha256:model.sha256,scoreKind:document.scoreKind,trackingScope:document.trackingScope}};
}
module.exports={DETECT_STRIDE,speakerWindows,speakerAnalysisSize,scoreSpeakerWindow,newSpeakerState,speakersOutput};
