'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { tmpdir } = require('node:os');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { probeVideo, decodeFrames, ceilingTimeTicks } = require('../lib/video.cjs');
const { verifyOutputFile } = require('../lib/outputs.cjs');

const exec = promisify(execFile);
const configPath = process.env.AI_RUNTIME_CONFIG;
let directory;
let config;
let base;

function request(source, startSeconds, endSeconds) {
  return { contractVersion: 1, task: 'faces.detect', input: { source: { path: source }, sourceRange: { startSeconds, endSeconds } } };
}

async function ffmpeg(args, binary = config.tools.ffmpeg) {
  return exec(binary, ['-v', 'error', '-nostdin', ...args], { encoding: 'buffer', maxBuffer: 8 * 1024 * 1024 });
}

async function readFrames(filename, start, end, overriddenConfig = config, signal = new AbortController().signal) {
  const input = request(filename, start, end);
  const video = await probeVideo(config, input, signal);
  const decoderMetrics = { decoderWaitMs: 0, decodedFrames: 0 };
  const frames = [];
  const events = [];
  for await (const frame of decodeFrames(overriddenConfig, input, video, signal, event => events.push(event), decoderMetrics)) {
    frames.push(frame);
  }
  return { video, frames, events, decoderMetrics };
}

function nearTimes(actual, expected) {
  assert.equal(actual.length, expected.length);
  actual.forEach((time, index) => assert.ok(Math.abs(time - expected[index]) < 1e-6, `${time} differs from ${expected[index]}`));
}

test.before(async () => {
  if (!configPath) return;
  config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  directory = await fs.mkdtemp(path.join(tmpdir(), 'selects-ai-media-contract-'));
  base = path.join(directory, 'cfr.mp4');
  await ffmpeg([
    '-f', 'lavfi', '-i', 'color=c=black:s=64x32:r=10:d=1.2',
    '-vf', 'drawbox=x=0:y=0:w=32:h=32:color=red:t=fill,drawbox=x=32:y=0:w=32:h=32:color=blue:t=fill',
    '-c:v', 'libx264', '-crf', '0', '-preset', 'ultrafast', '-pix_fmt', 'yuv444p', base,
  ]);
});

test.after(async () => {
  if (directory) await fs.rm(directory, { recursive: true, force: true });
});

test('decimal range boundaries convert to exact whole ticks without floating ceil drift', () => {
  assert.equal(ceilingTimeTicks(0, { numerator: 1, denominator: 10240 }), 0);
  assert.equal(ceilingTimeTicks(0.3, { numerator: 1, denominator: 10240 }), 3072);
  assert.equal(ceilingTimeTicks(0.3333332, { numerator: 1, denominator: 15360 }), 5120);
  assert.equal(ceilingTimeTicks(1e-7, { numerator: 1, denominator: 10_000_000 }), 1);
  assert.equal(ceilingTimeTicks(0.1, { numerator: 1001, denominator: 30000 }), 3);
});

test('CFR range preserves source playback timestamps and the full RGB raster', { skip: !configPath }, async () => {
  const { video, frames, decoderMetrics } = await readFrames(base, 0.3, 0.9);
  assert.deepEqual([video.width, video.height], [64, 32]);
  nearTimes(video.frameTimes, [0.3, 0.4, 0.5, 0.6, 0.7, 0.8]);
  assert.deepEqual(video.sourceRange, { startSeconds: 0.3, endSeconds: 0.9 });
  assert.deepEqual(video.constantFrameRate, { numerator: 10, denominator: 1 });
  assert.deepEqual(frames.map(frame => frame.sourceTimeSeconds), video.frameTimes);
  assert.equal(decoderMetrics.decodedFrames, 6);
  for (const frame of frames) {
    assert.equal(frame.rgb.length, 64 * 32 * 3);
    const red = frame.rgb.subarray((16 * 64 + 8) * 3, (16 * 64 + 8) * 3 + 3);
    const blue = frame.rgb.subarray((16 * 64 + 56) * 3, (16 * 64 + 56) * 3 + 3);
    assert.ok(red[0] > 200 && red[2] < 40, `Unexpected red pixel ${red}`);
    assert.ok(blue[2] > 200 && blue[0] < 40, `Unexpected blue pixel ${blue}`);
  }
});

test('nonzero container start time still uses first displayed frame as source zero', { skip: !configPath }, async () => {
  const shifted = path.join(directory, 'shifted.mp4');
  await ffmpeg(['-i', base, '-c', 'copy', '-output_ts_offset', '5', shifted]);
  const { video, frames } = await readFrames(shifted, 0.3, 0.9);
  assert.ok(video.timestampOriginSeconds >= 5);
  nearTimes(video.frameTimes, [0.3, 0.4, 0.5, 0.6, 0.7, 0.8]);
  assert.deepEqual(frames.map(frame => frame.sourceTimeSeconds), video.frameTimes);
});

test('anamorphic source is rejected before its coordinates can masquerade as display pixels', { skip: !configPath }, async () => {
  const anamorphic = path.join(directory, 'anamorphic.mp4');
  await ffmpeg(['-i', base, '-vf', 'setsar=2/1', '-c:v', 'libx264', '-crf', '0', '-preset', 'ultrafast', anamorphic]);
  await assert.rejects(probeVideo(config, request(anamorphic, 0, 1), new AbortController().signal), /square sample aspect ratio 1:1 only; source reports 2:1/);
});

test('VFR gaps keep real source PTS and corresponding pixels', { skip: !configPath }, async () => {
  const variable = path.join(directory, 'vfr.mkv');
  await ffmpeg([
    '-f', 'lavfi', '-i', 'testsrc2=s=64x32:r=10:d=1.2',
    '-vf', 'select=eq(n\\,0)+eq(n\\,1)+eq(n\\,4)+eq(n\\,8)+eq(n\\,11)',
    '-fps_mode', 'passthrough', '-c:v', 'ffv1', variable,
  ]);
  const { video, frames } = await readFrames(variable, 0.05, 1);
  nearTimes(video.frameTimes, [0.1, 0.4, 0.8]);
  assert.equal(video.constantFrameRate, null);
  assert.equal(video.sourceRange, undefined);
  assert.deepEqual(frames.map(frame => frame.sourceTimeSeconds), video.frameTimes);
  const { stdout } = await ffmpeg([
    '-i', variable, '-vf', 'select=eq(n\\,1)+eq(n\\,2)+eq(n\\,3)',
    '-fps_mode', 'passthrough', '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1',
  ]);
  assert.deepEqual(Buffer.concat(frames.map(frame => frame.rgb)), stdout);
});

test('rotation changes display dimensions and rotates pixels consistently', { skip: !configPath }, async () => {
  const rotated = path.join(directory, 'rotated.mp4');
  await ffmpeg(['-display_rotation', '90', '-i', base, '-c', 'copy', rotated]);
  const { video, frames } = await readFrames(rotated, 0, 0.1);
  assert.equal(Math.abs(video.rotation), 90);
  assert.deepEqual([video.width, video.height], [32, 64]);
  assert.equal(frames.length, 1);
  assert.equal(frames[0].rgb.length, 32 * 64 * 3);
  const transpose = video.rotation > 0 ? 'transpose=cclock' : 'transpose=clock';
  const { stdout } = await ffmpeg([
    '-noautorotate', '-i', base, '-vf', transpose, '-frames:v', '1',
    '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1',
  ]);
  assert.deepEqual(frames[0].rgb, stdout);
});

test('fractional CFR range boundary uses the same clock in probe and decoder', { skip: !configPath }, async () => {
  const fractional = path.join(directory, 'fractional.mp4');
  await ffmpeg([
    '-f', 'lavfi', '-i', 'color=c=red:s=64x32:r=30:d=1',
    '-c:v', 'libx264', '-crf', '0', '-preset', 'ultrafast', fractional,
  ]);
  // The 10th frame is exactly 1/3 second, which ffprobe's *_time fields round
  // to 0.333333. A range beginning just before 1/3 must include this frame.
  const { video, frames } = await readFrames(fractional, 0.3333332, 0.8);
  assert.equal(frames.length, 14);
  assert.ok(Math.abs(video.frameTimes[0] - 1 / 3) < 1e-6);
});

test('fractional-rate source keeps rational 30000/1001 frame times', { skip: !configPath }, async () => {
  const fractionalRate = path.join(directory, 'fractional-rate.mp4');
  await ffmpeg([
    '-f', 'lavfi', '-i', 'color=c=blue:s=64x32:r=30000/1001:d=0.5',
    '-c:v', 'libx264', '-crf', '0', '-preset', 'ultrafast', fractionalRate,
  ]);
  const { video, frames } = await readFrames(fractionalRate, 0.1, 0.2);
  nearTimes(video.frameTimes, [3, 4, 5].map(index => index * 1001 / 30000));
  assert.deepEqual(video.sourceRange, { startSeconds: 3 / (30000 / 1001), endSeconds: 6 / (30000 / 1001) });
  assert.deepEqual(frames.map(frame => frame.sourceTimeSeconds), video.frameTimes);
});

test('decoder failure is reported instead of yielding a successful empty result', { skip: !configPath }, async () => {
  const broken = path.join(directory, 'broken.mp4');
  await fs.copyFile(base, broken);
  const input = request(broken, 0, 0.5);
  const signal = new AbortController().signal;
  const video = await probeVideo(config, input, signal);
  await fs.writeFile(broken, 'damaged');
  await assert.rejects(async () => {
    for await (const frame of decodeFrames(config, input, video, signal, () => {}, { decoderWaitMs: 0, decodedFrames: 0 })) {
      void frame;
    }
  }, /Media tool exited/);
});

test('canceling after a decoded frame kills the decoder and rejects the stream', { skip: !configPath }, async () => {
  const input = request(base, 0, 1.2);
  const controller = new AbortController();
  const video = await probeVideo(config, input, controller.signal);
  let decoded = 0;
  await assert.rejects(async () => {
    for await (const frame of decodeFrames(config, input, video, controller.signal, () => {}, { decoderWaitMs: 0, decodedFrames: 0 })) {
      decoded += 1;
      controller.abort();
      void frame;
    }
  }, error => error.code === 'JOB_CANCELED');
  assert.equal(decoded, 1);
});

test('result file resolution accepts only files inside the job output folder', async (t) => {
  const own = await fs.mkdtemp(path.join(tmpdir(), 'selects-ai-output-fence-'));
  try {
    const output = path.join(own, 'output');
    await fs.mkdir(output);
    await fs.writeFile(path.join(output, 'faces.json'), '{}');
    await fs.writeFile(path.join(own, 'outside.json'), '{}');
    assert.equal(await verifyOutputFile(output, 'faces.json'), await fs.realpath(path.join(output, 'faces.json')));
    await assert.rejects(verifyOutputFile(output, '../outside.json'), /Invalid relative/);
    await assert.rejects(verifyOutputFile(output, path.join(own, 'outside.json')), /Invalid relative/);
    try {
      await fs.symlink(path.join(own, 'outside.json'), path.join(output, 'escaped.json'));
    } catch (error) {
      if (process.platform === 'win32' && error.code === 'EPERM') return t.skip('Windows account cannot create symbolic links');
      throw error;
    }
    await assert.rejects(verifyOutputFile(output, 'escaped.json'), /escapes/);
  } finally {
    await fs.rm(own, { recursive: true, force: true });
  }
});
