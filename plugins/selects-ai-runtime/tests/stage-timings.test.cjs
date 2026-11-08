'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { StageTimings } = require('../lib/stage-timings.cjs');

test('exclusive stages accumulate calls and leave unmeasured time visible', async () => {
  let now = 0;
  const timings = new StageTimings(() => now);
  assert.equal(timings.measure('input', () => { now += 2; return 42; }), 42);
  await timings.measureAsync('model', async () => { now += 10; });
  timings.measure('input', () => { now += 3; });
  now += 5;
  assert.deepEqual(timings.summary(), {
    totalMilliseconds: 20, otherMilliseconds: 5,
    stages: { input: { calls: 2, milliseconds: 5 }, model: { calls: 1, milliseconds: 10 } },
  });
  const snapshot = timings.summary();
  timings.measure('input', () => { now += 1; });
  assert.equal(snapshot.stages.input.calls, 2);
});

test('timing preserves sync errors and async rejections', async () => {
  let now = 0;
  const timings = new StageTimings(() => now);
  const failure = new Error('original');
  assert.throws(() => timings.measure('sync', () => { now += 2; throw failure; }), error => error === failure);
  await assert.rejects(timings.measureAsync('async', async () => { now += 3; throw failure; }), error => error === failure);
  assert.equal(timings.summary().otherMilliseconds, 0);
  assert.equal(timings.summary().stages.async.milliseconds, 3);
});
