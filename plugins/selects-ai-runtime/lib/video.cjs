'use strict';
const { collectTool, startTool } = require('./process.cjs');
const { throwIfAborted } = require('./errors.cjs');
const { constantFrameRate } = require('./constant-frame-rate.cjs');

function parseTimeBase(value) {
  const parts = typeof value === 'string' ? value.split('/').map(Number) : [];
  if (parts.length !== 2 || parts.some(part => !Number.isSafeInteger(part) || part <= 0)) {
    throw new Error('Source video time base is unavailable');
  }
  return { numerator: parts[0], denominator: parts[1] };
}

// Interpret the request's decimal seconds exactly when finding the first tick
// at/after a boundary. Floating-point ceil can add a tick at values such as 0.3.
function ceilingTimeTicks(seconds, timeBase) {
  const [coefficient, exponent = '0'] = String(seconds).toLowerCase().split('e');
  const [whole, fraction = ''] = coefficient.split('.');
  let numerator = BigInt(whole + fraction);
  let denominator = 1n;
  const scale = fraction.length - Number(exponent);
  if (scale >= 0) denominator = 10n ** BigInt(scale);
  else numerator *= 10n ** BigInt(-scale);
  numerator *= BigInt(timeBase.denominator);
  denominator *= BigInt(timeBase.numerator);
  const ticks = (numerator + denominator - 1n) / denominator;
  if (ticks > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Source range exceeds the safe timestamp limit');
  return Number(ticks);
}

async function probeVideo(config, request, signal) {
  const filename = request.input.source.path;
  const data = JSON.parse(await collectTool(config.tools.ffprobe, [
    '-v', 'error', '-select_streams', 'v:0', '-show_entries',
    'stream=width,height,sample_aspect_ratio,avg_frame_rate,time_base,duration,start_time:stream_tags=rotate:stream_side_data=rotation:format=duration',
    '-of', 'json', filename,
  ], { signal }));
  const stream = data.streams?.[0];
  if (!stream || !stream.width || !stream.height) throw new Error('Source has no decodable video stream');
  const sourceSampleAspectRatio = stream.sample_aspect_ratio ?? null;
  if (sourceSampleAspectRatio !== null && sourceSampleAspectRatio !== '1:1') {
    throw new Error('PoC supports square sample aspect ratio 1:1 only; source reports ' + sourceSampleAspectRatio);
  }
  const pixelAspectRatioPolicy = sourceSampleAspectRatio === null ? 'unspecified-assumed-square' : 'square';
  const timeBase = parseTimeBase(stream.time_base);
  const rotation = Number(stream.side_data_list?.find(item => item.rotation != null)?.rotation ?? stream.tags?.rotate ?? 0);
  const quarterTurn = Math.abs(rotation % 180) === 90;
  const width = quarterTurn ? stream.height : stream.width;
  const height = quarterTurn ? stream.width : stream.height;
  if (width * height > 32_000_000) throw new Error('Source exceeds the PoC raster limit');
  const timeline = JSON.parse(await collectTool(config.tools.ffprobe, [
    '-v', 'error', '-select_streams', 'v:0', '-show_frames',
    '-show_entries', 'frame=best_effort_timestamp', '-of', 'json', filename,
  ], { signal }));
  const rawPts = (timeline.frames ?? []).map(frame => frame.best_effort_timestamp);
  if (!rawPts.length || rawPts.some(value => !Number.isSafeInteger(value))) throw new Error('Source frame timestamps are unavailable');
  const origin = rawPts[0];
  const sourcePts = rawPts.map(pts => pts - origin);
  if (sourcePts.some((pts, index) => !Number.isSafeInteger(pts) || pts < 0 || (index && pts < sourcePts[index - 1]))) {
    throw new Error('Source timestamps are not ordered or exceed the safe timestamp limit');
  }
  const { startSeconds, endSeconds } = request.input.sourceRange;
  const rangeStartPts = ceilingTimeTicks(startSeconds, timeBase);
  const rangeEndPts = ceilingTimeTicks(endSeconds, timeBase);
  const selectedPts = sourcePts.filter(pts => pts >= rangeStartPts && pts < rangeEndPts);
  const frameTimes = selectedPts
    .map(pts => pts * timeBase.numerator / timeBase.denominator);
  if (!frameTimes.length || frameTimes.length > 20_000) throw new Error('Range has no frames or exceeds the PoC frame limit');
  const verifiedRate = constantFrameRate(stream.avg_frame_rate, sourcePts, timeBase);
  // A mask covers complete displayed frames. Close a CFR interval on the
  // same exact frame-index quotient used by the editor, rather than the
  // requested decimal duration (which may cut through its last frame).
  const firstFrame = sourcePts.indexOf(selectedPts[0]);
  const fps = verifiedRate && verifiedRate.numerator / verifiedRate.denominator;
  return {
    width, height, rotation, frameTimes, sourceFrameCount: rawPts.length, sourceSampleAspectRatio, pixelAspectRatioPolicy,
    timestampOriginSeconds: origin * timeBase.numerator / timeBase.denominator,
    averageFrameRate: stream.avg_frame_rate,
    constantFrameRate: verifiedRate,
    ...(verifiedRate ? {
      sourceRange: { startSeconds: firstFrame / fps, endSeconds: (firstFrame + frameTimes.length) / fps },
    } : {}),
    timeBase: stream.time_base, rangeStartPts, rangeEndPts,
  };
}

async function* decodeFrames(config, request, video, signal, emitProgress, decoderMetrics, { reuseFrameBuffer = false } = {}) {
  throwIfAborted(signal);
  // Match the probe clock: first displayed video frame is source playback zero.
  // Integer PTS avoids ffprobe's rounded *_time strings disagreeing with trim.
  const filters = `setpts=PTS-STARTPTS,trim=start_pts=${video.rangeStartPts}:end_pts=${video.rangeEndPts}`;
  const decoder = startTool(config.tools.ffmpeg, [
    '-v', 'error', '-nostdin', '-threads', '2', '-i', request.input.source.path,
    '-map', '0:v:0', '-an', '-sn', '-dn', '-vf', filters, '-fps_mode', 'passthrough',
    // trim alone continues decoding the tail. The known frame bound makes ffmpeg
    // stop after the range's last output frame instead of traversing the file.
    '-frames:v', String(video.frameTimes.length), '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1',
  ], { signal, onSpawn: pid => emitProgress({ step: 'decoding', decoderPid: pid }) });
  const size = video.width * video.height * 3;
  let frame = Buffer.allocUnsafe(size);
  let filled = 0;
  let index = 0;
  const iterator = decoder.child.stdout[Symbol.asyncIterator]();
  try {
    while (true) {
      const began = performance.now();
      const next = await iterator.next();
      decoderMetrics.decoderWaitMs += performance.now() - began;
      if (next.done) break;
      const chunk = next.value;
      let offset = 0;
      while (offset < chunk.length) {
        throwIfAborted(signal);
        const take = Math.min(size - filled, chunk.length - offset);
        chunk.copy(frame, filled, offset, offset + take);
        filled += take;
        offset += take;
        if (filled === size) {
          if (index >= video.frameTimes.length) throw new Error('Decoder produced more frames than the probed range');
          // Reused RGB is borrowed until the consumer calls next() again. All
          // copying resumes after yield, so serial inference and its initial
          // provider fallback can finish with this frame before it is replaced.
          yield { index, sourceTimeSeconds: video.frameTimes[index], rgb: frame };
          index++;
          if (!reuseFrameBuffer) frame = Buffer.allocUnsafe(size);
          filled = 0;
        }
      }
    }
    await decoder.completed;
    if (filled || index !== video.frameTimes.length) throw new Error(`Decoder frame count mismatch: expected ${video.frameTimes.length}, got ${index}`);
    decoderMetrics.decodedFrames = index;
  } finally {
    if (decoder.child.exitCode === null) decoder.child.kill('SIGKILL');
    // ChildProcess 'close' waits for stdio to close. A consumer can stop after a
    // yielded frame while stdout still holds unread bytes, so waiting for close
    // first deadlocks. Destroy the pipe before returning its manual iterator.
    decoder.child.stdout.destroy();
    if (iterator.return) await iterator.return().catch(() => {});
    await decoder.completed.catch(() => {});
  }
}
module.exports = { probeVideo, decodeFrames, ceilingTimeTicks };
