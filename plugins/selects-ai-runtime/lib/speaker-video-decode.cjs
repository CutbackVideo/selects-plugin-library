'use strict';
const { startTool } = require('./process.cjs');

class SpeakerVideoDecodeError extends Error {}

function frameCount(duration) {
  // FFmpeg parses -t at microsecond resolution. Output timestamps are i/25.
  return Math.ceil(Math.round(duration * 1_000_000) / 40_000);
}

function startSpeakerVideo({ executable, source, windows, seek, timeBase, width, height, signal, metrics }) {
  // Independent input seeks round timestamps in the source time base. A
  // fractional trim/setpts shift can round differently and change a frame
  // that ASD actually consumes (reproduced with 24000/1001 fps media).
  // Keep reuse only where every shift is an exact, integral source tick.
  // Unknown clocks and fractional windows use the original per-window path.
  const clock = /^1\/([1-9][0-9]*)$/.exec(timeBase ?? '');
  if (!clock || !Number.isSafeInteger(Number(clock[1])) ||
      !windows.length || windows.some(window =>
        !Number.isSafeInteger(seek(window.start)) || seek(window.start) < 0 ||
        !Number.isSafeInteger(window.duration) || window.duration <= 0 ||
        !Number.isSafeInteger(seek(window.start) * Number(clock[1])))) return null;
  const start = seek(windows[0].start);
  const ticksPerSecond = Number(clock[1]);
  const firstTicks = start * ticksPerSecond;
  const inputs = windows.map((_, i) => `[in${i}]`);
  const outputs = windows.map((_, i) => `[part${i}]`);
  const filters = windows.map((window, i) => {
    const relative = seek(window.start) - start;
    const relativeTicks = seek(window.start) * ticksPerSecond - firstTicks;
    // Reset the fps filter's clock at every boundary, just as a fresh seek does.
    // Passing integer ticks avoids double division in FFmpeg: e.g. 3/(1/161)
    // is slightly above 483 and truncates some shifted timestamps one tick early.
    return `${inputs[i]}trim=start=${relative},setpts=PTS-${relativeTicks},` +
      `fps=25:start_time=0,trim=end_frame=${frameCount(window.duration)},` +
      `scale=${width}:${height},format=rgb24${outputs[i]}`;
  });
  const graph = [
    `[0:v:0]split=${windows.length}${inputs.join('')}`,
    ...filters,
    `${outputs.join('')}concat=n=${windows.length}:v=1:a=0[out]`,
  ].join(';');
  const { child, completed } = startTool(executable, [
    '-v', 'error', '-ss', String(start), '-i', source,
    '-filter_complex', graph, '-map', '[out]', '-an', '-fps_mode', 'passthrough',
    '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1',
  ], { signal, metrics, operation: 'videoDecode' });
  const chunks = child.stdout[Symbol.asyncIterator]();
  let pending = Buffer.alloc(0);

  async function next() {
    try {
      return await chunks.next();
    } catch (error) {
      signal.throwIfAborted();
      throw new SpeakerVideoDecodeError('Streaming speaker video failed', { cause: error });
    }
  }

  return {
    async read(duration) {
      // Apply pipe backpressure and retain only the current window's RGB.
      const frame = Buffer.allocUnsafe(frameCount(duration) * width * height * 3);
      let written = 0;
      while (written < frame.length) {
        signal.throwIfAborted();
        if (!pending.length) {
          const chunk = await next();
          if (chunk.done) throw new SpeakerVideoDecodeError('Streaming speaker video ended early');
          pending = chunk.value;
        }
        const count = Math.min(pending.length, frame.length - written);
        pending.copy(frame, written, 0, count);
        written += count;
        pending = pending.subarray(count);
      }
      return frame;
    },
    async finish() {
      if (pending.length || !(await next()).done)
        throw new SpeakerVideoDecodeError('Streaming speaker video produced extra frames');
      try {
        await completed;
      } catch (error) {
        signal.throwIfAborted();
        throw new SpeakerVideoDecodeError('Streaming speaker video failed', { cause: error });
      }
    },
    async close() {
      if (child.exitCode === null) child.kill('SIGKILL');
      child.stdout.destroy();
      await completed.catch(() => {});
    },
  };
}

module.exports = { startSpeakerVideo, SpeakerVideoDecodeError };
