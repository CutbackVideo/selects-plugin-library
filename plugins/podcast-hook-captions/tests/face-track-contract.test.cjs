'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');

async function loadTracker() {
  const executable = async name => stripTypeScriptTypes(await fs.readFile(path.join(__dirname, '../src/pipeline', name), 'utf8'))
    .replace(/^import[^\n]+\n/gm, '').replace(/^export /gm, '');
  const stats = new Function(await executable('cvstats.ts') + '\nreturn {chiSquareAlt,frameStats,npMean,npMedian,pyRound};')();
  return new Function(...Object.keys(stats), 'sampleFrames', await executable('faceTrack.ts') + '\nreturn {scanProbed,samplePlan};')(
    ...Object.values(stats), () => { throw new Error('Tests must provide a frame source'); });
}
const tracker = loadTracker();
const info = { W: 64, H: 32, fps: 24 };
const plan = { f0: 30, f1: 54, step: 4, w: 64, h: 32, count: 6 };
const job = { id: 7, path: 'owned-fixture', start: 1.25, end: 2.25 };
const samples = () => Array.from({ length: plan.count }, (_, i) => ({ f: plan.f0 + i * plan.step, faces: [{
  box: [16, 6.4, 16, 12.8], score: .91, landmarks: [[20, 9.6], [28, 9.6], [24, 12.8], [22, 16], [26, 16]],
}] }));
const image = () => {
  const bgr = new Uint8Array(plan.w * plan.h * 3);
  for (let i = 0; i < bgr.length; i += 3) bgr.set([40, 80, 120], i);
  return bgr;
};
async function scan(overrides = {}) {
  const { scanProbed } = await tracker;
  return scanProbed(job, info, plan, {
    workDir: 'unused', sharedSamples: samples(),
    frames: async function* () { for (let i = 0; i < plan.count; i++) yield image(); },
    ...overrides,
  });
}

test('tracking consumes shared observations and preserves shot, color and source coordinates', async () => {
  const result = await scan();
  assert.equal(result.shots.length, 1);
  assert.deepEqual(result.shots[0], { start: 1.25, end: 2.25, face: { cx: .375, eyes: .3, h: .4, w: .25, top: .2, coverage: 1 }, faces: 1, ambiguous: false });
  assert.equal(result.color.r, 120); assert.equal(result.color.g, 80); assert.equal(result.color.b, 40);
  const empty = await scan({ sharedSamples: samples().map(s => ({ ...s, faces: [] })) });
  assert.equal(empty.shots[0].face, null); assert.deepEqual(empty.color, result.color);
});

test('missing, short and extra shared samples fail before decoding', async () => {
  let opened = 0;
  const frames = () => { opened++; throw new Error('Unexpected decoding'); };
  for (const sharedSamples of [undefined, samples().slice(1), [...samples(), samples()[0]]]) {
    await assert.rejects(scan({ sharedSamples, frames }), /Shared face sample count/);
  }
  assert.equal(opened, 0);
});

test('a shifted shared sample is rejected instead of aligning observations to another source frame', async () => {
  const shifted = samples(); shifted[2].f++;
  await assert.rejects(scan({ sharedSamples: shifted }), /Shared face sample frame/);
});

test('fractional-fps timestamp rounding is retained within the source-frame tolerance', async () => {
  const rounded = samples().map(s => ({ ...s, f: s.f + 0.000008 }));
  assert.equal((await scan({ sharedSamples: rounded })).shots[0].face.coverage, 1);
});

test('negative floating-point rounding cannot drop the first source observation', async () => {
  const { scanProbed } = await tracker;
  const sourceInfo = { ...info, fps: 25 };
  const sourcePlan = { ...plan, f0: 29, f1: 54, step: 5, count: 5 };
  const rows = Array.from({ length: 5 }, (_, i) => ({
    f: i === 0 ? 1.16 * 25 : 29 + i * 5,
    faces: i === 0 ? samples()[0].faces : [],
  }));
  assert.ok(rows[0].f < sourcePlan.f0);
  const result = await scanProbed(job, sourceInfo, sourcePlan, {
    workDir: 'unused', sharedSamples: rows,
    frames: async function* () { for (let i = 0; i < 5; i++) yield image(); },
  });
  assert.equal(result.shots[0].faces, 1);
  assert.equal(result.shots[0].face.coverage, .2);
  assert.equal(rows[0].f, 1.16 * 25); // shared timing is not mutated
});

test('negative timestamp rounding at a cut belongs to the new shot', async () => {
  const rows = samples().map(s => ({ ...s, faces: [] }));
  rows[3].f = 42 - Number.EPSILON * 42;
  rows[3].faces = samples()[0].faces;
  assert.ok(rows[3].f < 42);
  const result = await scan({ sharedSamples: rows, frames: async function* () {
    for (let i = 0; i < 6; i++) {
      const frame = image();
      if (i >= 3) for (let p = 0; p < frame.length; p += 3) frame.set([120, 80, 40], p);
      yield frame;
    }
  } });
  assert.equal(result.shots.length, 2);
  assert.equal(result.shots[0].end, 1.75);
  assert.equal(result.shots[0].face, null);
  assert.equal(result.shots[1].start, 1.75);
  assert.equal(result.shots[1].face.coverage, .333);
});

test('early color decode EOF cannot publish a complete tracked result', async () => {
  await assert.rejects(scan({ frames: async function* () { yield image(); } }), /Color sample count does not match/);
});

test('extra color frames are rejected and close the frame iterator', async () => {
  let closed = false;
  await assert.rejects(scan({ frames: async function* () {
    try { for (let i = 0; i <= plan.count; i++) yield image(); } finally { closed = true; }
  } }), /Color sample count exceeds/);
  assert.equal(closed, true);
});

test('an incomplete BGR raster cannot become valid color metadata', async () => {
  await assert.rejects(scan({ frames: async function* () { yield image().subarray(3); } }), /complete packed BGR/);
});

test('canceling during decode or after the last sample prevents successful publication', async () => {
  for (const afterLast of [false, true]) {
    const controller = new AbortController(); const reason = new Error('owned cancellation');
    let closed = false;
    await assert.rejects(scan({ signal: controller.signal, frames: async function* () {
      try {
        for (let i = 0; i < plan.count; i++) {
          if (!afterLast && i === 2) controller.abort(reason);
          yield image();
        }
        controller.abort(reason);
      } finally { closed = true; }
    } }), e => e === reason);
    assert.equal(closed, true);
  }
});

test('the actual consumer rejects a quantized source clock before any shared AI request', async () => {
  const c = require('../src/pipeline/sharedAiFaces.cjs');
  const executable = async name => stripTypeScriptTypes(await fs.readFile(path.join(__dirname, '../src/pipeline', name), 'utf8'))
    .replace(/^import[^\n]+\n/gm, '').replace(/^export /gm, '');
  let aiRequests = 0, colorDecodes = 0;
  const storage = { join: path.join, writeFile: async () => {}, rm: async () => {} };
  const runtime = { runFFmpeg: async () => { colorDecodes++; }, runFFprobe: async args => ({ stdout: JSON.stringify(
    args.includes('-show_frames') ? { frames: Array.from({ length: 21 }, (_, i) => ({ best_effort_timestamp: Math.round(i * 1000 / 30) })) }
      : { streams: [{ width: 64, height: 32, avg_frame_rate: '30/1', r_frame_rate: '30/1', time_base: '1/1000', start_time: '0' }], format: { start_time: '0' } },
  ) }) };
  const frameCode = new Function('assertConstantFrameClock', 'media', 'fs', await executable('faceFrames.ts') + '\nreturn {probeVideo,verifyConstantSourceClock};')(
    c.assertConstantFrameClock, () => runtime, () => storage);
  const reducer = await tracker;
  const imports = { fs: () => storage, J: JSON.stringify, ...frameCode,
    samplePlan: reducer.samplePlan, scanProbed: reducer.scanProbed,
    faceInput: c.faceInput, adaptSamples: c.adaptSamples,
    detectShared: async () => { aiRequests++; throw Error('AI must not be requested'); } };
  const trackFaces = new Function(...Object.keys(imports), await executable('faces.ts') + '\nreturn trackFaces;')(...Object.values(imports));
  await assert.rejects(trackFaces({}, 'owned-project', 'owned-pass', [{ clipId: 7, rid: 'owned-resource', s: 0, e: 15, path: 'owned-source', srcStart: 1 / 30 }], 30), /Quantized source frame clock is not supported/);
  assert.equal(aiRequests, 0); assert.equal(colorDecodes, 0);
});
