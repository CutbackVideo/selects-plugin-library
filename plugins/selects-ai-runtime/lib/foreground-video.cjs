'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { startTool, collectTool } = require('./process.cjs');
const { throwIfAborted } = require('./errors.cjs');

function foregroundRgba(foreground, alpha, width, height) {
  const pixels = width * height;
  if (foreground?.type !== 'float32' || foreground.dims.join(',') !== [1, 3, height, width].join(',') || alpha.length !== pixels) throw new Error('RVM foreground does not match the display raster');
  const rgba = Buffer.allocUnsafe(pixels * 4);
  for (let p = 0; p < pixels; p++) {
    for (let c = 0; c < 3; c++) {
      const value = foreground.data[c * pixels + p];
      if (!Number.isFinite(value)) throw new Error('RVM returned non-finite foreground color');
      rgba[p * 4 + c] = Math.round(Math.min(1, Math.max(0, value)) * 255);
    }
    rgba[p * 4 + 3] = alpha[p];
  }
  return rgba;
}

function startForegroundVideo({ config, video, outputDir, signal, emitProgress }) {
  const rate = video.constantFrameRate;
  if (!rate) throw new Error('Foreground video requires verified constant-frame-rate source timestamps; alpha-frames still supports VFR');
  const { width, height } = video;
  const partial = path.join(outputDir, 'foreground.partial.mov');
  const target = path.join(outputDir, 'foreground.mov');
  const encoder = startTool(config.tools.ffmpeg, [
    '-v', 'error', '-nostdin', '-n', '-f', 'rawvideo', '-pix_fmt', 'rgba',
    '-video_size', `${width}x${height}`, '-framerate', `${rate.numerator}/${rate.denominator}`, '-i', 'pipe:0',
    '-an', '-c:v', 'prores_ks', '-profile:v', '4', '-pix_fmt', 'yuva444p10le', '-alpha_bits', '16', '-threads', '2', partial,
  ], { signal, stdin: true, onSpawn: encoderPid => emitProgress?.({ step: 'encoding-foreground', encoderPid }) });
  encoder.child.stdout.resume();
  // Writes reject through their callback. The stream error event must also be
  // observed when cancellation or an early encoder exit closes the pipe.
  encoder.child.stdin.on('error', () => {});
  let frames = 0;
  return {
    async write(foreground, alpha) {
      throwIfAborted(signal);
      const bytes = foregroundRgba(foreground, alpha, width, height);
      await new Promise((resolve, reject) => encoder.child.stdin.write(bytes, error => error ? reject(error) : resolve()));
      frames++;
    },
    async finish() {
      throwIfAborted(signal);
      encoder.child.stdin.end();
      await encoder.completed;
      const info = JSON.parse(await collectTool(config.tools.ffprobe, ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,profile,pix_fmt,width,height,nb_read_frames,avg_frame_rate,duration', '-of', 'json', partial], { signal }));
      const s = info.streams?.[0];
      const seconds = frames * rate.denominator / rate.numerator;
      const [num, den] = String(s?.avg_frame_rate).split('/').map(Number);
      if (!s || s.codec_name !== 'prores' || s.profile !== '4444' || !s.pix_fmt?.startsWith('yuva444') || s.width !== width || s.height !== height || Number(s.nb_read_frames) !== frames || !Number.isFinite(num / den) || Math.abs(num / den - rate.numerator / rate.denominator) > 1e-6 || Math.abs(Number(s.duration) - seconds) > 1e-4) throw new Error('Encoded foreground video failed alpha/frame/clock verification');
      throwIfAborted(signal);
      await fs.rename(partial, target);
      return { file: 'foreground.mov', encoding: 'prores-4444', frameRate: rate, frameCount: frames, width, height, durationSeconds: seconds, sourceStartSeconds: video.frameTimes[0] };
    },
    async dispose() {
      if (encoder.child.exitCode === null) encoder.child.kill('SIGKILL');
      encoder.child.stdin.destroy(); encoder.child.stdout.destroy();
      await encoder.completed.catch(() => {});
      await fs.rm(partial, { force: true }).catch(() => {});
    },
  };
}
module.exports = { foregroundRgba, startForegroundVideo };
