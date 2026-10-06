'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { setImmediate } = require('node:timers/promises');

// Load the real assembler with a child-process boundary fake. Fragment sizes
// and cancellation are deterministic; no installed media binary is required.
const processModule = require('../lib/process.cjs');
const originalStartTool = processModule.startTool;
let startDecoder;
processModule.startTool = (...args) => startDecoder(...args);
delete require.cache[require.resolve('../lib/video.cjs')];
const { decodeFrames } = require('../lib/video.cjs');
processModule.startTool = originalStartTool;

function fixture({ chunks, count = 3, options } = {}) {
  const bytes = Buffer.from(Array.from({ length: 18 }, (_, i) => i));
  chunks ??= [bytes.subarray(0, 2), bytes.subarray(2, 9), bytes.subarray(9, 10), bytes.subarray(10)];
  const stdout = Readable.from(chunks);
  const controller = new AbortController();
  const child = { stdout, exitCode: null, killed: [], kill(signal) { this.killed.push(signal); this.exitCode = -1; } };
  const completed = new Promise(resolve => {
    stdout.once('end', () => { child.exitCode ??= 0; resolve(); });
    stdout.once('close', resolve);
  });
  let args;
  startDecoder = (binary, suppliedArgs, settings) => {
    assert.equal(binary, '/fake/ffmpeg'); args = suppliedArgs;
    settings.onSpawn(42);
    return { child, completed };
  };
  const video = { width: 2, height: 1, frameTimes: [0, 0.04, 0.08].slice(0, count), rangeStartPts: 0, rangeEndPts: count };
  const metrics = { decoderWaitMs: 0, decodedFrames: 0 }, progress = [];
  const iterator = decodeFrames({ tools: { ffmpeg: '/fake/ffmpeg' } }, { input: { source: { path: '/fake/input.mp4' } } },
    video, controller.signal, event => progress.push(event), metrics, options);
  return { iterator, bytes, child, controller, metrics, progress, args: () => args };
}

test('default decoding retains independent RGB frames across fragmented boundaries', async () => {
  const f = fixture(), frames = [];
  for await (const frame of f.iterator) frames.push(frame);
  assert.deepEqual(frames.map(frame => frame.index), [0, 1, 2]);
  assert.deepEqual(frames.map(frame => frame.sourceTimeSeconds), [0, 0.04, 0.08]);
  for (let i = 0; i < frames.length; i++) {
    assert.deepEqual(frames[i].rgb, f.bytes.subarray(i * 6, i * 6 + 6));
    if (i) assert.notEqual(frames[i].rgb, frames[i - 1].rgb);
  }
  assert.equal(f.metrics.decodedFrames, 3);
  assert.deepEqual(f.progress, [{ step: 'decoding', decoderPid: 42 }]);
  assert.equal(f.args()[f.args().indexOf('-frames:v') + 1], '3');
  assert.deepEqual(f.child.killed, []);
});

test('borrowed RGB remains valid while inference awaits, and is reused only after next()', async () => {
  const f = fixture({ options: { reuseFrameBuffer: true } });
  const first = await f.iterator.next();
  const held = first.value.rgb;
  assert.deepEqual(held, f.bytes.subarray(0, 6));
  await setImmediate(); await setImmediate();
  assert.deepEqual(held, f.bytes.subarray(0, 6));
  const second = await f.iterator.next();
  assert.equal(second.value.rgb, held);
  assert.deepEqual(held, f.bytes.subarray(6, 12));
  const third = await f.iterator.next();
  assert.equal(third.value.rgb, held);
  assert.deepEqual(held, f.bytes.subarray(12));
  assert.equal((await f.iterator.next()).done, true);
  assert.equal(f.metrics.decodedFrames, 3);
});

for (const reuseFrameBuffer of [false, true]) {
  test(`decoder rejects truncated and excess frames with reuse=${reuseFrameBuffer}`, async () => {
    const truncated = fixture({ chunks: [Buffer.alloc(17)], options: { reuseFrameBuffer } });
    await assert.rejects(async () => { for await (const _ of truncated.iterator) {} }, /frame count mismatch/);
    const excess = fixture({ chunks: [Buffer.alloc(18)], count: 2, options: { reuseFrameBuffer } });
    await assert.rejects(async () => { for await (const _ of excess.iterator) {} }, /more frames/);
  });
}

test('cancel while holding borrowed RGB preserves it and closes the owned decoder', async () => {
  const f = fixture({ options: { reuseFrameBuffer: true } });
  const first = await f.iterator.next(), copy = Buffer.from(first.value.rgb);
  f.controller.abort();
  await assert.rejects(f.iterator.next(), /canceled|aborted/i);
  assert.deepEqual(first.value.rgb, copy);
  assert.equal(f.child.stdout.destroyed, true);
  assert.deepEqual(f.child.killed, ['SIGKILL']);
});

test('consumer return closes the decoder without waiting for unread frames', async () => {
  const f = fixture({ options: { reuseFrameBuffer: true } });
  await f.iterator.next();
  assert.equal((await f.iterator.return()).done, true);
  assert.equal(f.child.stdout.destroyed, true);
  assert.deepEqual(f.child.killed, ['SIGKILL']);
});
