'use strict';

const { collectToolBytes } = require('./process.cjs');
const { MICROSECONDS_PER_SECOND } = require('./speaker-time.cjs');

const SAMPLE_RATE = 16_000;
const BYTES_PER_SAMPLE = 2;
const SAMPLE_LOG = /^\[ashowinfo@window(\d+) @ [^\]]+\]\s+n:\d+\s+pts:(-?\d+)\s.*\brate:16000\s+nb_samples:(\d+)/;

async function decodeSpeakerAudio({ executable, source, windows, seek, signal, metrics }) {
  const start = seek(windows[0].start);
  const firstUs = Math.round(start * MICROSECONDS_PER_SECOND);
  const inputs = windows.map((_, i) => `[audio${i}]`);
  const outputs = windows.map((_, i) => `[pcm${i}]`);
  const counts = windows.map(({ duration }) =>
    Math.round(Math.round(duration * MICROSECONDS_PER_SECOND) * SAMPLE_RATE / MICROSECONDS_PER_SECOND));
  const filters = windows.map((window, i) => {
    const offset = (Math.round(seek(window.start) * MICROSECONDS_PER_SECOND) - firstUs) / MICROSECONDS_PER_SECOND;
    // Decode once, but restart the resampler at each model boundary so its
    // filter history matches an independent seek. Keep original clock offsets
    // until the window's PCM is checked; rebasing to STARTPTS could hide a gap.
    return `${inputs[i]}atrim=start=${offset},asetpts=PTS-${offset}/TB,` +
      `aresample=${SAMPLE_RATE}:ochl=mono:osf=s16,atrim=end_sample=${counts[i]},` +
      `ashowinfo@window${i}${outputs[i]}`;
  });
  const graph = [
    `asplit=${windows.length}${inputs.join('')}`,
    ...filters,
    `${outputs.join('')}concat=n=${windows.length}:v=0:a=1`,
  ].join(';');

  const nextPts = counts.map(() => 0);
  let continuous = true;
  let pending = '';
  const onStderr = chunk => {
    const lines = (pending + chunk.toString()).split('\n');
    pending = lines.pop().slice(-8192);
    for (const line of lines) {
      if (!line.startsWith('[ashowinfo@window')) continue;
      const frame = SAMPLE_LOG.exec(line);
      if (!frame || Number(frame[2]) !== nextPts[Number(frame[1])]) {
        continuous = false;
        continue;
      }
      nextPts[Number(frame[1])] += Number(frame[3]);
    }
  };

  const limit = counts.reduce((total, count) => total + count, 0) * BYTES_PER_SAMPLE;
  const pcm = await collectToolBytes(executable, [
    '-hide_banner', '-nostats', '-loglevel', 'info', '-nostdin',
    '-ss', String(start), '-i', source, '-vn',
    // A simple filtergraph retains FFmpeg's existing automatic audio stream selection.
    '-af', graph, '-f', 's16le', 'pipe:1',
  ], { signal, metrics, operation: 'audioDecode', onStderr, limit });
  if (!continuous || counts.some((count, i) => nextPts[i] !== count) || pcm.length !== limit)
    throw new Error('Speaker audio does not cover a continuous sample timeline');

  let cursor = 0;
  return counts.map(count => {
    const from = cursor;
    cursor += count * BYTES_PER_SAMPLE;
    return pcm.subarray(from, cursor);
  });
}

module.exports = { decodeSpeakerAudio };
