'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const syncFs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const os = require('node:os');
const { runMatte } = require('../tasks/person-matte.cjs');

async function rig(t, behavior = {}) {
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'matte-task-'));
  t.after(() => fs.rm(outputDir, { recursive: true, force: true }));
  const bytes = Buffer.from('pinned test model'), modelPath = path.join(outputDir, 'model');
  await fs.writeFile(modelPath, bytes);
  const tensors = [], sessions = [], feeds = [], controller = new AbortController();
  class Tensor {
    constructor(type, data, dims) { Object.assign(this, { type, data, dims, disposed: 0 }); tensors.push(this); }
    dispose() { this.disposed++; }
  }
  let closed = false, calls = 0;
  const platform = behavior.platform ?? 'win32', candidate = platform === 'win32' ? 'dml' : 'coreml';
  const context = {
    outputDir, signal: controller.signal,
    request: { input: { sourceRange: { startSeconds: 0, endSeconds: 2 } } },
    config: { provider: 'auto', enableCoreMlAuto: true, models: { rvm: { path: modelPath, sha256: crypto.createHash('sha256').update(bytes).digest('hex') } } },
    video: { width: 2, height: 1, frameTimes: [0, 1] },
    frames: async function* () {
      try { for (let index = 0; index < 2; index++) yield { index, sourceTimeSeconds: index, rgb: Buffer.from([10, 20, 30, 40, 50, 60]) }; }
      finally { closed = true; }
    },
    ort: {
      Tensor, listSupportedBackends: () => [{ name: 'cpu' }, { name: candidate }],
      InferenceSession: { create: async (_model, options) => {
        const provider = options.executionProviders[0]?.name ?? 'cpu';
        const session = {
          inputNames: ['src', 'r1i', 'r2i', 'r3i', 'r4i', 'downsample_ratio'],
          outputNames: ['pha', 'r1o', 'r2o', 'r3o', 'r4o'], released: 0,
          run: async input => {
            calls++; feeds.push({ provider, rec: input.r1i.data[0], rgb: [...input.src.data] });
            if (behavior.failAt === calls) throw new Error('mid-job device failure');
            const result = { pha: new Tensor('float32', new Float32Array([0.3, 0.6]), [1, 1, 1, 2]) };
            for (let i = 1; i <= 4; i++) result['r' + i + 'o'] = new Tensor('float32', new Float32Array([input.r1i.data[0] + 1]), [1, 1, 1, 1]);
            if (behavior.invalidFirst && calls === 1) result.pha.data[0] = NaN;
            return result;
          },
          endProfiling: () => syncFs.writeFileSync(options.profileFilePrefix + '_1.json', JSON.stringify([
            { cat: 'Node', name: 'rvm_kernel_time', args: { provider: provider === 'dml' ? 'DmlExecutionProvider' : 'CoreMLExecutionProvider' } },
          ])),
          release: async () => { session.released++; },
        };
        sessions.push(session); return session;
      } },
    },
    emitProgress: event => { if (behavior.cancelAfterFirst && event.step === 'inference') controller.abort(); },
  };
  return { context, tensors, sessions, feeds, closed: () => closed, run: () => runMatte(context, { platform }) };
}

test('auto accepts the first result exactly once and preserves recurrent state across frames', async t => {
  const r = await rig(t), result = await r.run();
  assert.equal(result.metrics.frames, 2); assert.deepEqual(r.feeds.map(f => f.rec), [0, 1]);
  assert.equal(r.sessions.length, 1); assert.equal(r.sessions[0].released, 1);
  assert.ok(r.closed()); assert.ok(r.tensors.every(tensor => tensor.disposed === 1));
  const manifest = JSON.parse(await fs.readFile(path.join(r.context.outputDir, 'matte.json')));
  assert.deepEqual(manifest.frames.map(frame => frame.sourceTimeSeconds), [0, 1]);
});

test('a failed first GPU output restarts CPU from zero recurrent state with the same RGB frame', async t => {
  const r = await rig(t, { invalidFirst: true }), result = await r.run();
  assert.equal(result.diagnostics.selectedProvider, 'cpu');
  assert.deepEqual(r.feeds.map(f => f.rec), [0, 0, 1]);
  assert.deepEqual(r.feeds[0].rgb, r.feeds[1].rgb);
  assert.ok(r.sessions.every(session => session.released === 1));
  assert.ok(r.tensors.every(tensor => tensor.disposed === 1)); assert.ok(r.closed());
});

test('a non-finite first CPU result on an unsupported GPU platform fails without a compatibility retry', async t => {
  const r = await rig(t, { platform: 'linux', invalidFirst: true });
  await assert.rejects(r.run(), /non-finite value/);
  assert.deepEqual(r.feeds.map(f => [f.provider, f.rec]), [['cpu', 0]]);
  assert.equal(r.sessions.length, 1); assert.equal(r.sessions[0].released, 1);
  await assert.rejects(fs.stat(path.join(r.context.outputDir, 'matte.json')), { code: 'ENOENT' });
  assert.ok(r.tensors.every(tensor => tensor.disposed === 1)); assert.ok(r.closed());
});

test('a later GPU failure does not switch providers or publish a manifest', async t => {
  const r = await rig(t, { failAt: 2 });
  await assert.rejects(r.run(), /mid-job device failure/);
  assert.equal(r.sessions.length, 1); assert.equal(r.sessions[0].released, 1);
  await assert.rejects(fs.stat(path.join(r.context.outputDir, 'matte.json')), { code: 'ENOENT' });
  assert.ok(r.tensors.every(tensor => tensor.disposed === 1)); assert.ok(r.closed());
});

test('cancel after the first frame releases the decoder/session/state without starting CPU', async t => {
  const r = await rig(t, { cancelAfterFirst: true });
  await assert.rejects(r.run(), { code: 'JOB_CANCELED' });
  assert.equal(r.sessions.length, 1); assert.equal(r.feeds.length, 1);
  assert.ok(r.tensors.every(tensor => tensor.disposed === 1)); assert.ok(r.closed());
});
