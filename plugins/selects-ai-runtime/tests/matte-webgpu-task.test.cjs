'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const path = require('node:path');
const os = require('node:os');
const { runMatte } = require('../tasks/person-matte.cjs');
const { tensorElements, dispatchShape } = require('../lib/webgpu-matte.cjs');

async function rig(t, behavior = {}) {
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'matte-webgpu-'));
  t.after(() => fs.rm(outputDir, { recursive: true, force: true }));
  const modelBytes = Buffer.from('test native model'), modelPath = path.join(outputDir, 'model');
  await fs.writeFile(modelPath, modelBytes);
  const tensors = [], gpuCalls = [], cpuCalls = [], controller = new AbortController();
  let released = 0, closed = false, validated = 0;
  class Tensor {
    constructor(type, data, dims) { Object.assign(this, { type, data, dims, disposed: 0 }); tensors.push(this); }
    dispose() { this.disposed++; }
  }
  function gpuTensor(values, dims, serial) {
    const v = { type: 'float32', dims, location: 'gpu-buffer', serial, disposed: 0, downloads: 0,
      async getData() { this.downloads++; this.location = 'cpu'; this.data = Float32Array.from(values); return this.data; },
      dispose() { this.disposed++; } };
    tensors.push(v); return v;
  }
  const engine = {
    session: {}, createMilliseconds: 10, preprocessMilliseconds: 2, adapterInfo: { vendor: 'apple' }, derivedModel: {},
    async run(rgb, rec) {
      gpuCalls.push({ rgb: [...rgb], rec });
      if (behavior.failAt === gpuCalls.length) throw new Error('late GPU failure');
      if (rec) assert.ok(rec.every(v => v.location === 'gpu-buffer' && v.downloads === 0));
      const result = { pha: gpuTensor([.3, .6], [1, 1, 1, 2]) };
      for (let i = 1; i <= 4; i++) result['r' + i + 'o'] = gpuTensor([gpuCalls.length], [1, 1, 1, 1], gpuCalls.length);
      return result;
    },
    async validateFirst() {
      validated++;
      if (behavior.cancelProbe) controller.abort();
      if (behavior.invalidProbe) throw new Error('invalid GPU first output');
    },
    async release() { released++; },
  };
  const context = {
    outputDir, signal: controller.signal, request: { input: {} },
    config: { provider: behavior.explicitCpu ? 'cpu' : 'auto', webgpu: behavior.preparationUnavailable ? undefined : {},
      ...(behavior.preparationUnavailable ? { webgpuPreparationFailure: 'GPU dependency download unavailable' } : {}),
      models: { rvm: { path: modelPath, sha256: crypto.createHash('sha256').update(modelBytes).digest('hex') } } },
    video: { width: 2, height: 1, frameTimes: [0, 1] },
    frames: async function* () { try { for (let index = 0; index < 2; index++) yield { index, sourceTimeSeconds: index, rgb: Buffer.from([10, 20, 30, 40, 50, 60]) }; } finally { closed = true; } },
    emitProgress(event) { if (behavior.cancelAfterFirst && event.step === 'inference') controller.abort(); },
    ort: { Tensor, listSupportedBackends: () => [{ name: 'cpu' }], InferenceSession: {
      async create() { return {
        inputNames: ['src', 'r1i', 'r2i', 'r3i', 'r4i', 'downsample_ratio'], outputNames: ['pha', 'r1o', 'r2o', 'r3o', 'r4o'],
        async run(input) {
          cpuCalls.push({ rec: input.r1i.data[0], rgb: [...input.src.data] });
          const result = { pha: new Tensor('float32', Float32Array.from([.3, .6]), [1, 1, 1, 2]) };
          for (let i = 1; i <= 4; i++) result['r' + i + 'o'] = new Tensor('float32', Float32Array.from([input.r1i.data[0] + 1]), [1, 1, 1, 1]);
          return result;
        }, async release() {},
      }; },
    } },
  };
  const run = () => runMatte(context, { platform: 'darwin', async createWebGpuMatte() {
    if (behavior.failCreate) throw new Error('no hardware adapter'); return engine;
  } });
  return { run, context, engine, gpuCalls, cpuCalls, tensors, released: () => released, closed: () => closed, validated: () => validated };
}

test('WebGPU consumes the verified first frame once and retains recurrent GPU tensors', async t => {
  const r = await rig(t), result = await r.run();
  assert.equal(result.diagnostics.selectedProvider, 'webgpu');
  assert.equal(result.metrics.frames, 2); assert.equal(r.gpuCalls.length, 2); assert.equal(r.cpuCalls.length, 0);
  assert.equal(r.gpuCalls[0].rec, undefined); assert.ok(r.gpuCalls[1].rec.every(v => v.serial === 1 && v.downloads === 0));
  assert.equal(r.validated(), 1); assert.equal(r.released(), 1); assert.ok(r.closed());
  assert.ok(r.tensors.every(v => v.disposed === 1));
});

test('invalid initial GPU output is disposed and CPU restarts the identical frame at zero', async t => {
  const r = await rig(t, { invalidProbe: true }), result = await r.run();
  assert.equal(result.diagnostics.providerSelectionReason, 'auto-webgpu-initial-output-failed');
  assert.equal(result.diagnostics.requestedProvider, 'auto'); assert.equal(result.diagnostics.selectedProvider, 'cpu');
  assert.deepEqual(r.cpuCalls.map(c => c.rec), [0, 1]);
  assert.deepEqual(r.gpuCalls[0].rgb, [10, 20, 30, 40, 50, 60]);
  const expected = [...Float32Array.from([10 / 255, 40 / 255, 20 / 255, 50 / 255, 30 / 255, 60 / 255])];
  assert.deepEqual(r.cpuCalls[0].rgb, expected); assert.equal(r.released(), 1);
  assert.ok(r.tensors.every(v => v.disposed === 1));
});

test('GPU initialization failure falls back and explicit CPU never probes WebGPU', async t => {
  const r = await rig(t, { failCreate: true }), result = await r.run();
  assert.equal(result.diagnostics.providerSelectionReason, 'auto-webgpu-initial-create-failed');
  assert.equal(r.gpuCalls.length, 0); assert.equal(r.cpuCalls.length, 2);
  const cpu = await rig(t, { explicitCpu: true }); await cpu.run();
  assert.equal(cpu.gpuCalls.length, 0); assert.equal(cpu.cpuCalls.length, 2);
});

test('cancel during probe or after acceptance cleans up without a CPU retry', async t => {
  for (const behavior of [{ cancelProbe: true }, { cancelAfterFirst: true }]) {
    const r = await rig(t, behavior); await assert.rejects(r.run(), { code: 'JOB_CANCELED' });
    assert.equal(r.cpuCalls.length, 0); assert.equal(r.gpuCalls.length, 1);
    assert.equal(r.released(), 1); assert.ok(r.closed()); assert.ok(r.tensors.every(v => v.disposed === 1));
    await assert.rejects(fs.stat(path.join(r.context.outputDir, 'matte.json')), { code: 'ENOENT' });
  }
});

test('later GPU failure releases the current state and never switches provider', async t => {
  const r = await rig(t, { failAt: 2 }); await assert.rejects(r.run(), /late GPU failure/);
  assert.equal(r.cpuCalls.length, 0); assert.equal(r.released(), 1); assert.ok(r.closed());
  assert.ok(r.tensors.every(v => v.disposed === 1));
  await assert.rejects(fs.stat(path.join(r.context.outputDir, 'matte.json')), { code: 'ENOENT' });
});

test('GPU validation rejects CPU tensors, wrong shapes and undersized buffers without downloading state', () => {
  const tensor = { type: 'float32', location: 'gpu-buffer', dims: [1, 2, 2, 2], gpuBuffer: { size: 32 } };
  assert.equal(tensorElements(tensor), 8);
  assert.throws(() => tensorElements({ ...tensor, location: 'cpu' }), /GPU tensor contract/);
  assert.throws(() => tensorElements(tensor, [1, 1, 2, 2]), /GPU tensor contract/);
  assert.throws(() => tensorElements({ ...tensor, gpuBuffer: { size: 28 } }), /smaller/);
  assert.throws(() => tensorElements({ ...tensor, dims: [1, 0, 2, 2] }), /contract/);
});

test('optional GPU dependency preparation failure retains a usable CPU job and its reason', async t => {
  const r = await rig(t, { preparationUnavailable: true }), result = await r.run();
  assert.equal(result.diagnostics.selectedProvider, 'cpu'); assert.equal(r.gpuCalls.length, 0);
  assert.equal(result.diagnostics.providerSelectionReason, 'auto-webgpu-dependency-preparation-failed');
  assert.equal(result.diagnostics.providerAttempts[0].stage, 'prepare');
  assert.deepEqual(r.cpuCalls.map(c => c.rec), [0, 1]);
});

test('large tensors use two dispatch axes while each axis obeys the adapter limit', () => {
  assert.deepEqual(dispatchShape(1920 * 1080, 65535), [8100, 1]);
  assert.deepEqual(dispatchShape(32000000, 65535), [65535, 2]);
  assert.throws(() => dispatchShape(1025, 2), /dispatch limit/);
  assert.throws(() => dispatchShape(0, 65535), /Invalid GPU dispatch/);
});
