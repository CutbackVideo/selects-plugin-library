'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {
  deriveRvmWebGpuModel, transformPinnedRvmModelBytes, padRvmGraph,
  ORIGINAL_RVM_SHA256, TRANSFORM_VERSION, GRAPH_OPTIMIZATION_LEVEL,
} = require('../lib/rvm-webgpu-model.cjs');

const CONVS = [
  ['Conv_8', '824', [16, 3, 3, 3]], ['Conv_200', '965', [80, 171, 3, 3]],
  ['Conv_230', '968', [40, 107, 3, 3]], ['Conv_260', '971', [32, 59, 3, 3]],
  ['Conv_290', '974', [16, 35, 3, 3]],
];
function fixture() {
  return { graph: {
    node: CONVS.map(([name, weight], index) => ({
      name, opType: 'Conv', input: ['source_' + index, weight], output: ['output_' + index],
      attribute: [{ name: 'group', i: 1 }],
    })),
    initializer: CONVS.map(([, name, dims]) => {
      const rawData = Buffer.alloc(dims.reduce((a, b) => a * b, 4));
      for (let offset = 0; offset < rawData.length; offset += 4) rawData.writeFloatLE((offset / 4 % 23 - 11) / 8, offset);
      return { name, dims: [...dims], dataType: 1, rawData };
    }),
  } };
}

test('pads the end of NCHW channel axis and each output-channel weight row', () => {
  const model = fixture();
  const originals = model.graph.initializer.map(weight => Buffer.from(weight.rawData));
  padRvmGraph(model);
  assert.equal(model.graph.node.length, 10);
  assert.equal(model.graph.initializer.length, 10);
  for (let index = 0; index < CONVS.length; index++) {
    const [name, weightName, [cout, cin, h, w]] = CONVS[index];
    const pad = model.graph.node[index * 2], conv = model.graph.node[index * 2 + 1];
    assert.equal(pad.name, name + '_Pad');
    assert.equal(pad.opType, 'Pad');
    assert.equal(pad.attribute[0].s.toString(), 'constant');
    assert.equal(conv.input[0], pad.output[0]);
    const pads = model.graph.initializer.find(weight => weight.name === pad.input[1]);
    assert.equal(pads.dataType, 7);
    assert.deepEqual(pads.dims, [8]);
    assert.deepEqual(Array.from({ length: 8 }, (_, axis) => Number(pads.rawData.readBigInt64LE(axis * 8))), [0, 0, 0, 0, 0, 1, 0, 0]);
    const weight = model.graph.initializer.find(weight => weight.name === weightName);
    assert.deepEqual(weight.dims, [cout, cin + 1, h, w]);
    const oldRowBytes = cin * h * w * 4, newRowBytes = (cin + 1) * h * w * 4;
    for (let output = 0; output < cout; output++) {
      assert.deepEqual(weight.rawData.subarray(output * newRowBytes, output * newRowBytes + oldRowBytes), originals[index].subarray(output * oldRowBytes, (output + 1) * oldRowBytes));
      assert.deepEqual(weight.rawData.subarray(output * newRowBytes + oldRowBytes, (output + 1) * newRowBytes), Buffer.alloc(h * w * 4));
    }
  }
});

test('zero-padded inputs and weights preserve convolution contributions', () => {
  const model = fixture(), original = Buffer.from(model.graph.initializer[0].rawData);
  const [cout, cin, h, w] = model.graph.initializer[0].dims;
  const input = Array.from({ length: cin * h * w }, (_, index) => (index % 7 - 3) / 4);
  padRvmGraph(model);
  const derived = model.graph.initializer[0].rawData, paddedInput = [...input, ...Array(h * w).fill(0)];
  for (let output = 0; output < cout; output++) {
    let before = 0, after = 0;
    for (let index = 0; index < input.length; index++) before += original.readFloatLE((output * input.length + index) * 4) * input[index];
    for (let index = 0; index < paddedInput.length; index++) after += derived.readFloatLE((output * paddedInput.length + index) * 4) * paddedInput[index];
    assert.equal(after, before);
  }
});

test('validates every site before mutating the model', () => {
  const model = fixture();
  model.graph.initializer[4].dims[1] = 36;
  const before = JSON.stringify(model);
  assert.throws(() => padRvmGraph(model), /Conv_290/);
  assert.equal(JSON.stringify(model), before);
});

test('rejects changed groups, data types, storage, names and repeated transformation', () => {
  for (const mutate of [
    model => { model.graph.node[0].attribute[0].i = 3; },
    model => { model.graph.initializer[0].dataType = 10; },
    model => { model.graph.initializer[0].rawData = Buffer.alloc(4); },
    model => { model.graph.initializer[0].externalData = [{ key: 'location', value: 'weights.bin' }]; },
    model => { model.graph.node.push({ ...model.graph.node[0] }); },
    model => { model.graph.node.push({ name: 'Conv_8_Pad', input: [], output: [] }); },
    model => { model.graph.node[0].input[1] = 'other'; },
  ]) {
    const model = fixture(); mutate(model);
    assert.throws(() => padRvmGraph(model));
  }
  const model = fixture(); padRvmGraph(model);
  assert.throws(() => padRvmGraph(model), /Unexpected RVM/);
  assert.throws(() => padRvmGraph({}), /model graph/);
});

test('rejects malformed or altered source bytes before calling the codec', () => {
  let called = false;
  const schema = { ModelProto: { decode() { called = true; throw new Error('unexpected'); } } };
  assert.throws(() => transformPinnedRvmModelBytes(Buffer.alloc(14975696), { schema }), /original pinned model bytes/);
  assert.throws(() => transformPinnedRvmModelBytes(Buffer.from('invalid protobuf'), { schema }), /original pinned model bytes/);
  assert.equal(called, false);
});

test('file API refuses another declared hash and unexpected sizes', async () => {
  await assert.rejects(deriveRvmWebGpuModel({ model: { path: 'unopened', sha256: '0'.repeat(64) } }), /original pinned RVM/);
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'rvm-webgpu-model-'));
  try {
    const filename = path.join(directory, 'model.onnx');
    await fs.writeFile(filename, 'not a model');
    await assert.rejects(deriveRvmWebGpuModel({ model: { path: filename, sha256: ORIGINAL_RVM_SHA256 } }), /original RVM model size/);
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

const integrationConfig = process.env.AI_RUNTIME_CONFIG;
const ortWebModule = process.env.AI_RUNTIME_ORT_WEB_MODULE;
test('actual pinned RVM transforms deterministically and loads in the native CPU runtime', {
  skip: !integrationConfig || !ortWebModule,
}, async () => {
  const config = JSON.parse(await fs.readFile(integrationConfig, 'utf8'));
  const first = await deriveRvmWebGpuModel({ model: config.models.rvm, ortWebModule });
  const second = await deriveRvmWebGpuModel({ model: config.models.rvm, ortWebModule });
  assert.equal(first.sha256, second.sha256);
  assert.deepEqual(first.bytes, second.bytes);
  assert.equal(first.transformVersion, TRANSFORM_VERSION);
  assert.equal(first.graphOptimizationLevel, GRAPH_OPTIMIZATION_LEVEL);
  const ort = require(config.ortModule);
  const session = await ort.InferenceSession.create(first.bytes, { executionProviders: ['cpu'], intraOpNumThreads: 2 });
  try { assert.ok(session.inputNames.includes('src')); }
  finally { await session.release(); }
  // A derived or changed source is refused even if its protobuf is valid.
  assert.throws(() => transformPinnedRvmModelBytes(first.bytes, {}), /original pinned model bytes/);
  const changed = await fs.readFile(config.models.rvm.path); changed[changed.length - 1] ^= 1;
  assert.throws(() => transformPinnedRvmModelBytes(changed, {}), /original pinned model bytes/);
});

test('actual original and derived models preserve CPU alpha, foreground and recurrent outputs', {
  skip: !integrationConfig || !ortWebModule,
}, async () => {
  const config = JSON.parse(await fs.readFile(integrationConfig, 'utf8'));
  const derived = await deriveRvmWebGpuModel({ model: config.models.rvm, ortWebModule });
  const ort = require(config.ortModule), sessions = [], tensors = new Set();
  const tensor = (...args) => { const value = new ort.Tensor(...args); tensors.add(value); return value; };
  const dispose = value => { value.dispose(); tensors.delete(value); };
  try {
    const options = { executionProviders: ['cpu'], graphOptimizationLevel: 'basic', intraOpNumThreads: 2 };
    sessions.push(await ort.InferenceSession.create(await fs.readFile(config.models.rvm.path), options));
    sessions.push(await ort.InferenceSession.create(derived.bytes, options));
    let states = sessions.map(() => Array.from({ length: 4 }, () => tensor('float32', new Float32Array(1), [1, 1, 1, 1])));
    const ratio = tensor('float32', new Float32Array([0.25]), [1]);
    for (let frame = 0; frame < 3; frame++) {
      const source = tensor('float32', Float32Array.from({ length: 192 * 128 * 3 }, (_, index) => ((index * 13 + frame * 17) % 257) / 256), [1, 3, 128, 192]);
      const results = [];
      for (let index = 0; index < sessions.length; index++) {
        const state = states[index];
        const result = await sessions[index].run({ src: source, r1i: state[0], r2i: state[1], r3i: state[2], r4i: state[3], downsample_ratio: ratio });
        Object.values(result).forEach(value => tensors.add(value)); results.push(result);
      }
      for (const name of ['pha', 'fgr', 'r1o', 'r2o', 'r3o', 'r4o']) {
        const first = results[0][name], second = results[1][name];
        assert.deepEqual(second.dims, first.dims);
        let maxError = 0;
        for (let index = 0; index < first.data.length; index++) maxError = Math.max(maxError, Math.abs(first.data[index] - second.data[index]));
        assert.ok(Number.isFinite(maxError) && maxError <= 0.000001, name + ' changed by ' + maxError);
      }
      states.forEach(state => state.forEach(dispose));
      states = results.map(result => [result.r1o, result.r2o, result.r3o, result.r4o]);
      results.forEach(result => { dispose(result.pha); dispose(result.fgr); });
      dispose(source);
    }
  } finally {
    tensors.forEach(value => value.dispose());
    await Promise.all(sessions.map(session => session.release()));
  }
});
