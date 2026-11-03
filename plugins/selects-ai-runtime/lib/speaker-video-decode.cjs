'use strict';
const { startTool } = require('./process.cjs');

class SpeakerVideoDecodeError extends Error {}

function frameCount(duration) {
  // FFmpeg parses -t at microsecond resolution. Output timestamps are i/25.
  return Math.ceil(Math.round(duration * 1_000_000) / 40_000);
}

function startSpeakerVideo({ executable, source, windows, seek, width, height, signal }) {
  const start = seek(windows[0].start);
  const firstUs = Math.round(start * 1_000_000);
  const inputs = windows.map((_, i) => `[in${i}]`);
  const outputs = windows.map((_, i) => `[part${i}]`);
  const filters = windows.map((window, i) => {
    const relative = (Math.round(seek(window.start) * 1_000_000) - firstUs) / 1_000_000;
    // Reset the fps filter's clock at every boundary, just as a fresh seek does.
    return `${inputs[i]}trim=start=${relative},setpts=PTS-${relative}/TB,` +
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
  ], { signal });
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
