// Golden frames: pbmKernels (portrait-beat-montage/panel.tsx `@operation`) against pipeline.py's own pixel functions
// on synthetic frames and mattes (tests/portrait_beat_montage_golden.py writes them): Pillow's GaussianBlur at every
// radius the pipeline uses, MaxFilter, composite and BICUBIC punch-in, the background plate, the 21 transition frames,
// the flash, the glow, a whole emitted shot, the settled positions and the window choice.
// Tolerance: none with the numpy/Pillow pipeline.py ships with (rvm/requirements-hashed.txt: numpy 1.26.4, Pillow
// 11.3.0); the kernels follow its float32 arithmetic and uint8 casts exactly. With numpy 2 (NEP 50 promotes float32 x
// float64 to float64), pipeline.py itself truncates a little differently: transition frames within 1 level, emitted
// frames within 4, mean under 0.1. PORTRAIT_BEAT_MONTAGE_PYTHON picks the Python (default python3); without numpy and
// Pillow the test is skipped.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {loadPanelOperation} from './panel_operation.mjs';

const op = loadPanelOperation('portrait-beat-montage');
const K = op.pbmKernels();
const plugin = path.resolve(import.meta.dirname, '../plugins/portrait-beat-montage');
const PYTHON = process.env.PORTRAIT_BEAT_MONTAGE_PYTHON || 'python3';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pbm-golden-'));
const r = spawnSync(PYTHON, [path.join(import.meta.dirname, 'portrait_beat_montage_golden.py'), plugin, dir], {encoding: 'utf8'});
const skip = r.status === 0 ? false : 'pipeline.py needs ' + PYTHON + ' with numpy and Pillow: ' + String(r.stderr || r.error || '').trim().split('\n').pop();
const meta = skip ? {} : JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
const exact = !skip && meta.numpy === '1.26.4' && meta.pillow === '11.3.0';
const bin = (n) => { const b = fs.readFileSync(path.join(dir, n + '.bin')); return new Uint8Array(b.buffer, b.byteOffset, b.byteLength); };
const W = 540, H = 720, N = W * H, size = N * 3;
const frame = (a, i) => a.subarray(i * size, (i + 1) * size);
function same(name, a, b, tol = 0, meanTol = 0) {
  assert.equal(a.length, b.length, name);
  let max = 0, sum = 0;
  for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); if (d > max) max = d; sum += d; }
  if (exact || !tol) assert.equal(max, 0, name + ': max difference ' + max);
  else { assert.ok(max <= tol, name + ': max difference ' + max); assert.ok(sum / a.length <= meanTol, name + ': mean ' + sum / a.length); }
}
test.after(() => fs.rmSync(dir, {recursive: true, force: true}));

test('the smear jitter and shot motion are pipeline.py\'s', {skip}, () => {
  // The embedded jitter is numpy 1.26's; numpy 2's convolve/std differ in the last bits.
  if (exact) assert.deepEqual(Array.from(K.rough.slice(0, 4)), meta.rough);
  else meta.rough.forEach((v, i) => assert.ok(Math.abs(K.rough[i] - v) < 1e-12));
  assert.deepEqual(K.positions, meta.positions);
  assert.deepEqual(meta.settled.map((_, k) => K.settledPos(21 + k)), meta.settled);
});

test('Pillow kernels: GaussianBlur, MaxFilter, composite, BICUBIC punch-in', {skip}, () => {
  const noise = bin('noise'), grey = bin('grey');
  for (const radius of meta.radii) {
    same('GaussianBlur(' + radius + ') RGB', K.gaussianBlur(noise.slice(), W, H, 3, radius), bin('blur_rgb_' + radius));
    same('GaussianBlur(' + radius + ') L', K.gaussianBlur(grey.slice(), W, H, 1, radius), bin('blur_l_' + radius));
  }
  for (const s of [41, 81]) same('MaxFilter(' + s + ')', K.maxFilter(grey, W, H, s), bin('max_' + s));
  const flipped = new Uint8Array(size);
  for (let y = 0; y < H; y++) flipped.set(noise.subarray((H - 1 - y) * W * 3, (H - y) * W * 3), y * W * 3);
  same('composite', K.composite(flipped, noise, grey), bin('composite'));
  for (const s of meta.scales) same('scale_center ' + s, K.scaleCenter(frame(bin('frames'), 3), s), bin('scale_' + s));
});

test('background plate, transition frames, flash, glow and an emitted shot', {skip, timeout: 300000}, () => {
  const frames = bin('frames'), alpha = Float32Array.from(bin('mattes'), (v) => Math.fround(v / 255));
  const plate = K.backgroundPlate(frame(frames, 0), alpha.subarray(0, N));
  same('plate', plate, bin('plate'));
  const post = K.transitionFrames(frames.subarray(0, 30 * size), alpha, plate), golden = bin('post');
  for (let i = 0; i < 21; i++) same('transition frame ' + i, frame(post, i), frame(golden, i), 1, .1);
  const settled = K.interpFrame(frames, 60, size, 23.37, new Float32Array(size));
  for (const [amount, warm, n] of [[1, 1, 'a'], [.72, .10, 'b'], [.24, 0, 'c']]) {
    same('flash ' + n, K.flash(frame(frames, 5), amount, warm), bin('flash_' + n));
    same('flash of a blended frame ' + n, K.flash(settled, amount, warm), bin('flashf_' + n));
  }
  same('glow 240', K.glowFrame(240), bin('glow_240'));
  same('glow 91', K.glowFrame(91), bin('glow_91'));
  const emitted = bin('emitted'), buf = new Float32Array(size);
  for (let i = 0; i < meta.length; i++) {
    const f = i < 21 ? frame(post, i) : K.interpFrame(frames, 60, size, K.settledPos(i), buf);
    same('emitted frame ' + i, K.emitFrame(f, i), frame(emitted, i), 4, .1);
  }
});

test('window choice: motion scores and the two windows of a clip', {skip}, () => {
  const m = K.motionScores(bin('gray'), meta.motion.duration);
  assert.deepEqual(m.scores, meta.motion.scores);
  const first = K.choose(m.starts, m.scores);
  assert.equal(first, meta.motion.first);
  assert.equal(K.choose(m.starts, m.scores, first), meta.motion.again);
});
