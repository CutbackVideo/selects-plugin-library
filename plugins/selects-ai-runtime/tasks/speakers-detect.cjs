'use strict';
const path=require('node:path');
const {startTool}=require('../lib/process.cjs');
const {writeJson}=require('../lib/files.cjs');
const {createVerifiedModelSession}=require('../lib/models.cjs');
const {rgbToLetterboxBlob,decodeYuNet,mapFaceToDisplay}=require('../lib/yunet-decode.cjs');
const {mfcc}=require('../lib/speaker-audio.cjs');
const {trackFaces,interpolateTrack,smoothBoxes,facePixels}=require('../lib/speaker-tracks.cjs');
const descriptor=require('../runtime.json');
const {detectFrameChanges}=require('../lib/frame-change.cjs');
// Stable windows use ~3 fps YuNet; changed windows and Light-ASD use every frame.
const DETECT_STRIDE=8;
async function bytes(executable,args,signal,limit) {
  const p=startTool(executable,args,{signal,limit});let size=0;const chunks=[];
  try {for await(const chunk of p.child.stdout){size+=chunk.length;if(size>limit)throw new Error('Speaker decode exceeded bounded window');chunks.push(chunk);}await p.completed;return Buffer.concat(chunks);}
  finally {if(p.child.exitCode===null)p.child.kill('SIGKILL');p.child.stdout.destroy();await p.completed.catch(()=>{});}
}
// Distribute the remainder across windows so a sub-frame tail cannot become
// an empty decode request. Every window remains within the model's 3s scope.
function speakerWindows(range) {
  const length=range.endSeconds-range.startSeconds,count=Math.ceil(length/3);
  return Array.from({length:count},(_,i)=>({start:range.startSeconds+length*i/count,duration:length/count}));
}
async function runSpeakers({request,config,outputDir,ort,video,emitProgress,signal,decoderMetrics={}}) {
  const started=performance.now(),range=request.input.sourceRange;
  if(config.models.yunet?.sha256!==descriptor.tasks['faces.detect'].sha256)throw new Error('Speaker face model checksum differs from pinned detector');
  const scale=Math.min(1,960/video.width,540/video.height),width=Math.max(2,Math.round(video.width*scale)),height=Math.max(2,Math.round(video.height*scale));
  const options={executionProviders:['cpu'],intraOpNumThreads:config.intraOpNumThreads??4};
  const yunet=await createVerifiedModelSession(ort,config.models.yunet,options);let model;
  const all=[];let inferenceMilliseconds=0,faceMilliseconds=0,decodeMilliseconds=0,faceDetections=0,trackCount=0,letterbox,changeMilliseconds=0,denseWindows=0,sparseWindows=0;const changeWindows=[];
  try {
    model=await createVerifiedModelSession(ort,config.models.lightAsd,options);
    for(const {start,duration} of speakerWindows(range)) {
      signal.throwIfAborted();
      // Source audio and video are decoded from the same origin. No external
      // recorder offsets or per-camera identities are guessed here.
      const common=['-v','error','-ss',String(start+(video.timestampOriginSeconds??0)-(video.formatStartTime??0)),'-i',request.input.source.path,'-t',String(duration)];
      await emitProgress({step:'decoding',completed:start-range.startSeconds,total:range.endSeconds-range.startSeconds});
      const decodeBegan=performance.now();
      const [rgb,audio]=await Promise.all([
        bytes(config.tools.ffmpeg,[...common,'-an','-vf',`fps=25:start_time=0,scale=${width}:${height}`,'-pix_fmt','rgb24','-f','rawvideo','pipe:1'],signal,width*height*3*77),
        bytes(config.tools.ffmpeg,[...common,'-vn','-ac','1','-ar','16000','-f','s16le','pipe:1'],signal,16000*2*4),
      ]);
      decodeMilliseconds+=performance.now()-decodeBegan;
      const stride=width*height*3,n=Math.min(Math.floor(rgb.length/stride),Math.floor((1+Math.ceil(Math.max(0,audio.length/2-400)/160))/4),Math.ceil(duration*25));
      if(n<1)throw new Error('No synchronized audio/video samples in speaker window');
      decoderMetrics.decodedFrames=(decoderMetrics.decodedFrames??0)+n;
      // Decide using every decoded frame before skipping any face detections.
      // Detect throughout changed windows so brief shots between sparse samples
      // are observable. Quiet windows retain the 8-frame stride.
      const changeBegan=performance.now(),changes=detectFrameChanges(rgb,width,height,n);
      changeMilliseconds+=performance.now()-changeBegan;
      const detectionStride=changes.length?1:DETECT_STRIDE;
      if(changes.length){denseWindows++;changeWindows.push({start,duration,changes});}else sparseWindows++;
      const pcm=Float64Array.from({length:audio.length/2},(_,i)=>audio.readInt16LE(i*2));
      const audioFeatures=mfcc(pcm);const frames=[],samples=[],detected=[];const faceBegan=performance.now();
      for(let i=0;i<n;i++) {
        signal.throwIfAborted();const frame=rgb.subarray(i*stride,(i+1)*stride);frames.push(frame);
        samples.push({index:all.length+i,sourceTimeSeconds:start+i/25,faces:[]});
        if(i%detectionStride&&i!==n-1)continue;
        const blob=rgbToLetterboxBlob(frame,width,height,letterbox);letterbox=blob.data;const input=new ort.Tensor('float32',blob.data,[1,3,640,640]);
        const raw=await yunet.run({[yunet.inputNames[0]]:input});
        try {samples[i].faces=decodeYuNet(Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,v.data])),640,640,{score:request.input.scoreThreshold??.8}).map(f=>mapFaceToDisplay(f,blob,width,height)).filter(Boolean);}
        finally{input.dispose();for(const v of Object.values(raw))v.dispose();}
        detected.push(i);
      }
      faceMilliseconds+=performance.now()-faceBegan;faceDetections+=detected.length;
      await emitProgress({step:'speakers.detect',completed:start-range.startSeconds,total:range.endSeconds-range.startSeconds});
      for(const observed of trackFaces(detected.map(i=>samples[i]),detectionStride,n)) {
        const track=observed.map(({i,face})=>({i:detected[i],face}));
        const id=trackCount++,boxes=smoothBoxes(track,n),visual=new Float32Array(n*112*112);
        frames.forEach((f,i)=>visual.set(facePixels(f,width,height,boxes[i]),i*112*112));
        // ASD scores every frame of the track, so the faces between detections
        // carry its score too; they are marked as interpolated geometry.
        for(const between of interpolateTrack(track)){samples[between.i].faces.push(between.face);track.push(between);}
        const scores=new Float64Array(n);const began=performance.now();
        for(const seconds of [1,2,3])for(let offset=0;offset<n;offset+=seconds*25) {
          signal.throwIfAborted();const end=Math.min(n,offset+seconds*25),count=end-offset;
          const at=new ort.Tensor('float32',audioFeatures.slice(offset*4*13,end*4*13),[1,count*4,13]);
          const vt=new ort.Tensor('float32',visual.slice(offset*112*112,end*112*112),[1,count,112,112]);
          const out=await model.run({audio:at,video:vt});
          try {if(out.scores.data.length!==count)throw new Error('Speaker model output length mismatch');for(let i=0;i<count;i++){const score=out.scores.data[i];if(!Number.isFinite(score))throw new Error('Non-finite speaker score');scores[offset+i]+=score/3;}}
          finally{at.dispose();vt.dispose();for(const v of Object.values(out))v.dispose();}
        }
        inferenceMilliseconds+=performance.now()-began;
        // No face is extrapolated beyond a track's detections. IDs belong to
        // this short window only; callers cannot treat them as person IDs.
        for(const {i,face} of track){face.activeSpeakerScore=scores[i];face.trackId=`window-${Math.round((start-range.startSeconds)*25)}:${id}`;}
      }
      for(const sample of samples){sample.faces=sample.faces.map(face=>({...face,box:Object.fromEntries(Object.entries(face.box).map(([k,v])=>[k,v/(k.includes('x')?width/video.width:height/video.height)])),landmarks:face.landmarks?.map(({x,y})=>({x:x/(width/video.width),y:y/(height/video.height)}))}));all.push(sample);}
    }
    const document={contractVersion:1,task:'speakers.detect',coordinateSpace:'display-pixels',boxFormat:'xyxy',frameSize:{width:video.width,height:video.height},model:{id:descriptor.tasks['speakers.detect'].model,sha256:descriptor.tasks['speakers.detect'].sha256},parameters:{sourceRange:range},scoreKind:'uncalibrated-logit',sampleRate:25,faceDetectionStride:DETECT_STRIDE,faceDetectionPolicy:'frame-change-dense-window',trackingScope:'three-second-window',samples:all};
    await writeJson(path.join(outputDir,'speakers.json'),document);
    return {files:{detections:'speakers.json'},metrics:{sampleCount:all.length,faceDetections,trackCount,changeMilliseconds,denseWindows,sparseWindows,decodeMilliseconds,faceMilliseconds,inferenceMilliseconds,elapsedMilliseconds:performance.now()-started},diagnostics:{provider:'cpu',changeWindows,faceDetectionStride:DETECT_STRIDE,modelSha256:document.model.sha256,scoreKind:document.scoreKind,trackingScope:document.trackingScope}};
  } finally {await model?.release();await yunet.release();}
}
module.exports={runSpeakers,speakerWindows};
