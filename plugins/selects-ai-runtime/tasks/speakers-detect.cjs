'use strict';
const path=require('node:path');
const {StageTimings}=require('../lib/stage-timings.cjs');
const {startTool}=require('../lib/process.cjs');
const {startSpeakerVideo,SpeakerVideoDecodeError}=require('../lib/speaker-video-decode.cjs');
const {writeJson}=require('../lib/files.cjs');
const {createVerifiedModelSession}=require('../lib/models.cjs');
const descriptor=require('../runtime.json');
const {speakerWindows,speakerAnalysisSize,scoreSpeakerWindow,newSpeakerState,speakersOutput}=require('../lib/speaker-window.cjs');
async function bytes(executable,args,signal,limit,metrics,operation) {
  const p=startTool(executable,args,{signal,limit,metrics,operation});let size=0;const chunks=[];
  try {for await(const chunk of p.child.stdout){size+=chunk.length;if(size>limit)throw new Error('Speaker decode exceeded bounded window');chunks.push(chunk);}await p.completed;return Buffer.concat(chunks);}
  finally {if(p.child.exitCode===null)p.child.kill('SIGKILL');p.child.stdout.destroy();await p.completed.catch(()=>{});}
}
async function runSpeakers(options) {
  const started=performance.now();
  try {
    return await analyzeWindows(options, options.video.singleMp4Video);
  } catch (error) {
    if (!(error instanceof SpeakerVideoDecodeError)) throw error;
    options.signal.throwIfAborted();
    // The stream must finish successfully before publishing any results.
    if (options.decoderMetrics) options.decoderMetrics.decodedFrames=0;
    const retryBegan=performance.now();
    const result=await analyzeWindows(options,false);
    const fallbackMs=retryBegan-started;
    result.metrics.elapsedMilliseconds+=fallbackMs;
    result.metrics.stageTimings.totalMilliseconds+=fallbackMs;
    result.metrics.stageTimings.stages.videoDecodeFallback={calls:1,milliseconds:fallbackMs};
    return result;
  }
}
async function analyzeWindows({request,config,outputDir,ort,video,emitProgress,signal,decoderMetrics={}},useStream) {
  const started=performance.now(),range=request.input.sourceRange;
  const timings=new StageTimings();let result;
  if(config.models.yunet?.sha256!==descriptor.tasks['faces.detect'].sha256)throw new Error('Speaker face model checksum differs from pinned detector');
  const {width,height}=speakerAnalysisSize(video);
  const options={executionProviders:['cpu'],intraOpNumThreads:config.intraOpNumThreads??4};
  const yunet=await timings.measureAsync('modelLoad',()=>createVerifiedModelSession(ort,config.models.yunet,options));let model,stream;
  const all=[],state=newSpeakerState();let decodeMilliseconds=0;
  try {
    model=await timings.measureAsync('modelLoad',()=>createVerifiedModelSession(ort,config.models.lightAsd,options));
    const windows=speakerWindows(range);
    const seek=start=>start+(video.timestampOriginSeconds??0)-(video.formatStartTime??0);
    if(useStream && windows.length>1 && seek(windows[0].start)>=0)
      stream=startSpeakerVideo({executable:config.tools.ffmpeg,source:request.input.source.path,windows,seek,width,height,signal,metrics:config.processMetrics});
    for(const {start,duration} of windows) {
      signal.throwIfAborted();
      // Source audio and video are decoded from the same origin. No external
      // recorder offsets or per-camera identities are guessed here.
      const common=['-v','error','-ss',String(start+(video.timestampOriginSeconds??0)-(video.formatStartTime??0)),'-i',request.input.source.path,'-t',String(duration)];
      await emitProgress({step:'decoding',completed:start-range.startSeconds,total:range.endSeconds-range.startSeconds});
      const decodeBegan=performance.now();
      // Tool walls overlap; mediaDecode is the exclusive combined wait.
      const decode=async(kind,...args)=>{const began=performance.now();try{return await bytes(...args,config.processMetrics,kind+'Decode');}finally{decoderMetrics[kind+'DecodeMs']=(decoderMetrics[kind+'DecodeMs']??0)+performance.now()-began;}};
      const [rgb,audio]=await timings.measureAsync('mediaDecode',()=>Promise.all([
        stream ? stream.read(duration) : decode('video',config.tools.ffmpeg,[...common,'-an','-vf',`fps=25:start_time=0,scale=${width}:${height}`,'-pix_fmt','rgb24','-f','rawvideo','pipe:1'],signal,width*height*3*77),
        decode('audio',config.tools.ffmpeg,[...common,'-vn','-ac','1','-ar','16000','-f','s16le','pipe:1'],signal,16000*2*4),
      ]));
      decodeMilliseconds+=performance.now()-decodeBegan;
      const pcm=timings.measure('pcmInput',()=>Float64Array.from({length:audio.length/2},(_,i)=>audio.readInt16LE(i*2)));
      const window=await scoreSpeakerWindow({ort,yunet,model,video,width,height,rgb,pcm,start,duration,rangeStart:range.startSeconds,scoreThreshold:request.input.scoreThreshold,state,signal,timings,
        onFacesDetected:()=>emitProgress({step:'speakers.detect',completed:start-range.startSeconds,total:range.endSeconds-range.startSeconds})});
      decoderMetrics.decodedFrames=(decoderMetrics.decodedFrames??0)+window.frameCount;
      all.push(...window.samples);
    }
    if (stream) {
      const drainBegan=performance.now();
      await timings.measureAsync('videoDrain',()=>stream.finish());
      decodeMilliseconds+=performance.now()-drainBegan;
    }
    const output=speakersOutput({video,range,model:{id:descriptor.tasks['speakers.detect'].model,sha256:descriptor.tasks['speakers.detect'].sha256},samples:all,state,decodeMilliseconds,elapsedMilliseconds:performance.now()-started});
    await timings.measureAsync('outputWrite',()=>writeJson(path.join(outputDir,'speakers.json'),output.document));
    result={files:{detections:'speakers.json'},metrics:output.metrics,diagnostics:{...output.diagnostics,videoDecode:stream?"streaming":"per-window"}};
  } finally {await timings.measureAsync('modelRelease',async()=>{try{await stream?.close();}finally{await model?.release();await yunet.release();}});}
  result.metrics.stageTimings=timings.summary();
  return result;
}
module.exports={runSpeakers,speakerWindows};
