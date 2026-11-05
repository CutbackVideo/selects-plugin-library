'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { mkdtemp, readFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { buildWebRuntime, OUTPUT } = require('../scripts/build-web-runtime.cjs');
const { MODELS } = require('../lib/runtime-assets.cjs');

const loadWebRuntime = () => import(pathToFileURL(OUTPUT).href);

// Hand-crafted YuNet tensors, as in yunet-reference.test.cjs: one confident
// anchor at stride 8, row 1, column 2 decodes to the box (32, 4)-(48, 36).
function outputs(anchors = []) {
  const output = {};
  for (const stride of [8, 16, 32]) {
    const count = (640 / stride) ** 2;
    output[`cls_${stride}`] = new Float32Array(count);
    output[`obj_${stride}`] = new Float32Array(count);
    output[`bbox_${stride}`] = new Float32Array(count * 4);
    output[`kps_${stride}`] = new Float32Array(count * 10).fill(0.5);
  }
  for (const { index, box } of anchors) {
    output.cls_8[index] = 0.9;
    output.obj_8[index] = 0.9;
    output.bbox_8.set(box, index * 4);
  }
  return output;
}
const ONE_FACE = outputs([{ index: 82, box: [0.5, 0.25, 0, Math.log(2)] }]);

// A stand-in for the imported ONNX Runtime Web module.
function fakeOrt(results) {
  const state = { released: false, created: null, runs: 0 };
  const ort = {
    env: { wasm: {} },
    Tensor: class { constructor(type, data, dims) { assert.equal(type, 'float32'); assert.deepEqual(dims, [1, 3, 640, 640]); } },
    InferenceSession: {
      create: async (model, options) => {
        state.created = { model, options };
        return {
          inputNames: ['input'],
          run: async () => Object.fromEntries(Object.entries(results[state.runs++] ?? outputs())
            .map(([name, data]) => [name, { data }])),
          release: async () => { state.released = true; },
        };
      },
    },
  };
  return { ort, state };
}

function context(runtime, { request, width = 1280, height = 720, frameTimes, results = [ONE_FACE], signal } = {}) {
  const { ort, state } = fakeOrt(results);
  const downloads = [];
  const progress = [];
  const bytes = new Map(Object.entries(runtime.assets).map(([name], index) => [name, Uint8Array.of(index + 1)]));
  return {
    state, downloads, progress, ort, bytes,
    value: {
      request,
      source: {
        width, height, frameTimes,
        async *frames(indices) {
          for (const index of indices) {
            yield { index, sourceTimeSeconds: frameTimes[index], rgb: new Uint8Array(width * height * 3) };
          }
        },
      },
      download: async (pin) => {
        downloads.push(pin);
        const name = Object.keys(runtime.assets).find((key) => runtime.assets[key] === pin);
        return bytes.get(name);
      },
      importModule: async (moduleBytes) => {
        assert.equal(moduleBytes, bytes.get('ortModule'));
        return ort;
      },
      emitProgress: (event) => progress.push(event),
      signal: signal ?? new AbortController().signal,
    },
  };
}

const videoRequest = (input = {}) => ({
  contractVersion: 1, task: 'faces.detect',
  input: { source: {}, sourceRange: { startSeconds: 1, endSeconds: 2 }, ...input },
});

test('the committed web runtime is the current build of its source', () => {
  const built = readFileSync(OUTPUT, 'utf8');
  assert.equal(built, buildWebRuntime());
  // A browser Worker can load nothing else: no imports, only sibling lib requires.
  assert.doesNotMatch(built, /^import\s/m);
  for (const [, specifier] of built.matchAll(/\brequire\s*\(\s*'([^']*)'\s*\)/g)) assert.match(specifier, /^\.\/[\w-]+\.cjs$/);
});

test('web runtime pins the desktop YuNet model and npm ONNX Runtime Web files', async () => {
  const runtime = await loadWebRuntime();
  assert.equal(runtime.contractVersion, 1);
  assert.deepEqual(runtime.tasks, ['faces.detect', 'speakers.detect', 'person.matte']);
  const yunet = MODELS['faces.detect'], lightAsd = MODELS['speakers.detect'], rvm = MODELS['person.matte'];
  assert.deepEqual(runtime.assets.yunet, { url: yunet.url, size: yunet.size, sha256: yunet.sha256 });
  assert.deepEqual(runtime.assets.lightAsd, { path: lightAsd.bundled, size: lightAsd.size, sha256: lightAsd.sha256 });
  // The same RVM bytes as desktop, served from a CORS-enabled copy.
  assert.deepEqual(runtime.assets.rvm, { url: 'https://static.cutback.video/assets/ai-runtime/rvm/v1.0.0/rvm_mobilenetv3_fp32.onnx', size: rvm.size, sha256: rvm.sha256 });
  assert.equal(runtime.LIGHT_ASD_MODEL_ID, require('../runtime.json').tasks['speakers.detect'].model);
  for (const pin of Object.values(runtime.assets)) {
    assert.match(pin.url ?? pin.path, pin.url ? /^https:\/\// : /^models\/[\w.-]+\.onnx$/);
    assert.match(pin.sha256, /^[a-f0-9]{64}$/);
    assert.ok(Number.isSafeInteger(pin.size) && pin.size > 0);
  }
  assert.match(runtime.assets.ortModule.url, /onnxruntime-web@1\.30\.0\/dist\/ort\.wasm\.bundle\.min\.mjs$/);
  assert.match(runtime.assets.ortWebGpuModule.url, /onnxruntime-web@1\.30\.0\/dist\/ort\.webgpu\.bundle\.min\.mjs$/);
  assert.match(runtime.assets.ortWebGpuWasm.url, /onnxruntime-web@1\.30\.0\/dist\/ort-wasm-simd-threaded\.asyncify\.wasm$/);
});

test('video faces sample actual source times, map boxes, report progress and release the session', async () => {
  const runtime = await loadWebRuntime();
  const frameTimes = [1.04, 1.1, 1.55, 1.9];
  const run = context(runtime, { request: videoRequest(), frameTimes });
  const result = await runtime.run(run.value);
  const document = result.files.detections.json;
  assert.equal(result.files.detections.name, 'faces.json');
  assert.equal(document.sourceKind, undefined);
  assert.deepEqual(document.samples.map((sample) => [sample.index, sample.sourceTimeSeconds]), [[0, 1.04], [2, 1.55]]);
  assert.deepEqual(document.samples[0].faces[0].box, { xmin: 32, ymin: 4, xmax: 48, ymax: 36 });
  assert.deepEqual(document.samples[1].faces, []);
  assert.deepEqual(document.parameters, { sourceRange: { startSeconds: 1, endSeconds: 2 }, sampleEverySeconds: 0.5, scoreThreshold: 0.8 });
  assert.deepEqual(document.model, { id: 'yunet-2023mar', sha256: MODELS['faces.detect'].sha256 });
  assert.equal(result.metrics.emptySampleCount, 1);
  assert.deepEqual(run.progress.at(-1), { step: 'faces.detect', completed: 2, total: 2 });
  // The verified binary is handed to ONNX Runtime; nothing else is fetched.
  assert.deepEqual(new Set(run.downloads), new Set([runtime.assets.ortModule, runtime.assets.ortWasm, runtime.assets.yunet]));
  assert.equal(run.ort.env.wasm.wasmBinary, run.bytes.get('ortWasm'));
  assert.equal(run.ort.env.wasm.numThreads, 1);
  assert.equal(run.state.created.model, run.bytes.get('yunet'));
  assert.deepEqual(run.state.created.options.executionProviders, ['wasm']);
  assert.equal(run.state.released, true);
});

test('an image yields one zero-time sample with the image contract', async () => {
  const runtime = await loadWebRuntime();
  const run = context(runtime, {
    request: { contractVersion: 1, task: 'faces.detect', input: { source: { kind: 'image' } } },
    frameTimes: [0], width: 640, height: 360,
  });
  const document = (await runtime.run(run.value)).files.detections.json;
  assert.equal(document.sourceKind, 'image');
  assert.deepEqual(document.parameters, { scoreThreshold: 0.8 });
  assert.deepEqual(document.frameSize, { width: 640, height: 360 });
  assert.deepEqual(document.samples.map((sample) => [sample.index, sample.sourceTimeSeconds]), [[0, 0]]);
});

test('web runtime rejects unsupported tasks, providers and frame orders before claiming success', async () => {
  const runtime = await loadWebRuntime();
  const frameTimes = [1.04, 1.55];
  await assert.rejects(runtime.run(context(runtime, {
    request: { ...videoRequest(), task: 'person.segment' }, frameTimes,
  }).value), /does not support person\.segment/);
  await assert.rejects(runtime.run(context(runtime, {
    request: videoRequest({ provider: 'dml' }), frameTimes,
  }).value), /CPU provider only/);
  await assert.rejects(runtime.run(context(runtime, {
    request: videoRequest(), frameTimes: [1.55, 1.04],
  }).value), /not ordered/);
  const reordered = context(runtime, { request: videoRequest(), frameTimes });
  reordered.value.source.frames = async function* () {
    yield { index: 1, sourceTimeSeconds: 1.55, rgb: new Uint8Array(1280 * 720 * 3) };
  };
  await assert.rejects(runtime.run(reordered.value), /requested order/);
  assert.equal(reordered.state.released, true);
});

test('cancellation stops between frames and still releases the session', async () => {
  const runtime = await loadWebRuntime();
  const controller = new AbortController();
  const run = context(runtime, { request: videoRequest(), frameTimes: [1.04, 1.55], signal: controller.signal });
  const frames = run.value.source.frames;
  run.value.source.frames = async function* (indices) {
    for await (const frame of frames(indices)) {
      yield frame;
      controller.abort(new Error('JOB_CANCELED'));
    }
  };
  await assert.rejects(runtime.run(run.value), /JOB_CANCELED/);
  assert.equal(run.state.released, true);
});

test('web and desktop faces tasks write the same detections for the same frames', async (t) => {
  // runFaces verifies the real pinned model file before using the session stub.
  const modelPath = process.env.YUNET_MODEL;
  if (!modelPath) return t.skip('Set YUNET_MODEL to compare with the desktop job adapter');
  const { runFaces } = require('../tasks/faces-detect.cjs');
  const runtime = await loadWebRuntime();
  const frameTimes = [1.04, 1.1, 1.55, 1.9];
  const web = await runtime.run(context(runtime, { request: videoRequest(), frameTimes }).value);
  const directory = await mkdtemp(path.join(tmpdir(), 'selects-web-parity-'));
  try {
    const desktop = context(runtime, { request: videoRequest(), frameTimes });
    const result = await runFaces({
      request: videoRequest(), config: { models: { yunet: { path: modelPath } } }, outputDir: directory,
      ort: desktop.ort, video: { width: 1280, height: 720, frameTimes },
      frames: () => desktop.value.source.frames(frameTimes.map((_, index) => index)),
      emitProgress() {}, signal: new AbortController().signal,
    });
    const stored = JSON.parse(await readFile(path.join(directory, result.files.detections), 'utf8'));
    assert.deepEqual(web.files.detections.json, stored);
    // Desktop adds host-side measurements; detections and existing counters match.
    const { stageTimings, ...desktopMetrics } = result.metrics;
    assert.equal(stageTimings.stages.faceInference.calls, 2);
    assert.deepEqual({ ...web.metrics, inferenceMilliseconds: 0, elapsedMilliseconds: 0 },
      { ...desktopMetrics, inferenceMilliseconds: 0, elapsedMilliseconds: 0 });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

// Speakers: YuNet answers every detection with one face; the Light-ASD stand-in
// scores frame i of a chunk as i, so window scores are deterministic.
function speakerContext(runtime, { request, decodeWindow, width = 1280, height = 720, faceOutputs = ONE_FACE } = {}) {
  const yunetBytes = Uint8Array.of(9), asdBytes = Uint8Array.of(8);
  const state = { released: [], decoded: [], asdRuns: 0 };
  const ort = {
    env: { wasm: {} },
    Tensor: class { constructor(type, data, dims) { this.data = data; this.dims = dims; } dispose() {} },
    InferenceSession: {
      create: async (model) => ({
        inputNames: ['input'],
        run: async (inputs) => {
          if (model === asdBytes) {
            state.asdRuns++;
            const count = inputs.video.dims[1];
            assert.deepEqual(inputs.audio.dims, [1, count * 4, 13]);
            return { scores: { data: Float32Array.from({ length: count }, (_, i) => i), dispose() {} } };
          }
          return Object.fromEntries(Object.entries(faceOutputs).map(([name, data]) => [name, { data, dispose() {} }]));
        },
        release: async () => state.released.push(model === asdBytes ? 'asd' : 'yunet'),
      }),
    },
  };
  const value = {
    request: request ?? { contractVersion: 1, task: 'speakers.detect', input: { source: {}, sourceRange: { startSeconds: 0, endSeconds: 6 }, scoreThreshold: 0.8 } },
    source: {
      width, height,
      decodeWindow: decodeWindow ?? (async (options) => {
        state.decoded.push(options);
        const frames = Math.ceil(options.durationSeconds * options.fps);
        return { rgb: new Uint8Array(frames * options.width * options.height * 3), pcm: new Int16Array(Math.round(options.durationSeconds * options.audioSampleRate)) };
      }),
    },
    download: async (pin) => (pin === runtime.assets.yunet ? yunetBytes : Uint8Array.of(1)),
    readPackageFile: async (pin) => { assert.equal(pin, runtime.assets.lightAsd); return asdBytes; },
    importModule: async () => ort,
    emitProgress() {},
    signal: new AbortController().signal,
  };
  return { value, state };
}

test('speakers decode desktop-sized windows and publish the desktop document shape', async () => {
  const runtime = await loadWebRuntime();
  const run = speakerContext(runtime);
  const result = await runtime.run(run.value);
  // Two 3 s windows, each decoded at 25 fps and 16 kHz at the 960x540 analysis size.
  assert.deepEqual(run.state.decoded, [0, 3].map((startSeconds) => ({
    startSeconds, durationSeconds: 3, fps: 25, width: 960, height: 540, audioSampleRate: 16000,
  })));
  const document = result.files.detections.json;
  assert.equal(result.files.detections.name, 'speakers.json');
  assert.deepEqual(
    Object.keys(document),
    ['contractVersion', 'task', 'coordinateSpace', 'boxFormat', 'frameSize', 'model', 'parameters', 'scoreKind', 'sampleRate', 'faceDetectionStride', 'faceDetectionPolicy', 'trackingScope', 'samples'],
  );
  assert.deepEqual(document.model, { id: 'light-asd-ava', sha256: MODELS['speakers.detect'].sha256 });
  assert.deepEqual(document.frameSize, { width: 1280, height: 720 });
  // A window keeps the frames that also have audio features: 3 s of 16 kHz
  // audio gives 74 (desktop decodes 222 samples for 9 s the same way).
  assert.equal(document.samples.length, 148);
  assert.deepEqual(document.samples.slice(73, 75).map((sample) => [sample.index, sample.sourceTimeSeconds]), [[73, 2.92], [74, 3]]);
  // Every frame of the kept track is scored; frame 0 of each 1/2/3 s chunk scores 0.
  const faces = document.samples.flatMap((sample) => sample.faces);
  assert.ok(faces.length >= 148 && faces.every((face) => Number.isFinite(face.activeSpeakerScore) && /^window-(0|75):\d+$/.test(face.trackId)));
  assert.equal(document.samples[0].faces[0].activeSpeakerScore, 0);
  // Boxes return to display pixels: YuNet's (16,2)-(24,18) in the 640 letterbox
  // is (24,3)-(36,27) at 960x540, then x4/3 at 1280x720.
  assert.deepEqual(document.samples[0].faces[0].box, { xmin: 32, ymin: 4, xmax: 48, ymax: 36 });
  assert.equal(result.metrics.trackCount, 2);
  assert.equal(result.diagnostics.backend, 'onnxruntime-web-wasm');
  assert.deepEqual(run.state.released.sort(), ['asd', 'yunet']);
});

test('speakers reject images, hosts without window decoding and windows without audio', async () => {
  const runtime = await loadWebRuntime();
  await assert.rejects(runtime.run(speakerContext(runtime, {
    request: { contractVersion: 1, task: 'speakers.detect', input: { source: { kind: 'image' } } },
  }).value), /requires a video source/);
  const noWindows = speakerContext(runtime);
  delete noWindows.value.source.decodeWindow;
  await assert.rejects(runtime.run(noWindows.value), /cannot decode speaker windows/);
  const silent = speakerContext(runtime, {
    decodeWindow: async ({ width, height }) => ({ rgb: new Uint8Array(75 * width * height * 3), pcm: new Int16Array(0) }),
  });
  await assert.rejects(runtime.run(silent.value), /No (audio samples|synchronized audio\/video samples)/);
  assert.deepEqual(silent.state.released.sort(), ['asd', 'yunet']);
});


test('speaker boxes touching an analysis edge stay inside the display raster', async () => {
  const runtime = await loadWebRuntime();
  const faceOutputs = outputs([{ index: 10 * 80 + 78, box: [0, 0, Math.log(8), Math.log(4)] }]);
  const run = speakerContext(runtime, {
    width: 1680, height: 1050, faceOutputs,
    request: { contractVersion: 1, task: 'speakers.detect', input: { source: {}, sourceRange: { startSeconds: 0, endSeconds: 0.12 } } },
  });
  const document = (await runtime.run(run.value)).files.detections.json;
  const faces = document.samples.flatMap(sample => sample.faces);
  assert.ok(faces.length > 0);
  for (const { box } of faces) {
    assert.ok(box.xmin >= 0 && box.ymin >= 0);
    assert.ok(box.xmax <= document.frameSize.width && box.ymax <= document.frameSize.height);
    assert.equal(box.xmax, document.frameSize.width);
  }
});

// person.matte: a stand-in WebGPU device and ONNX Runtime Web module. The
// stand-in session returns alpha values -0.5, 0.5 and 1.5 in turn (0, 128 and
// 255 once clamped) and GPU-resident recurrent tensors.
const DERIVED_RVM_SHA256 = '424978d0ec0aada0037344adfac6d562a5f459c61843fc671c8d54fd8b906df6';

async function withWebGpu({ fallback = false, validationError = false } = {}, body) {
  const state = { copies: 0, destroyed: false, requiredLimits: null };
  let onUncapturedError;
  const pass = { setPipeline() {}, setBindGroup() {}, dispatchWorkgroups() {}, end() {} };
  const device = {
    limits: { maxStorageBufferBindingSize: 2 ** 30, maxComputeWorkgroupsPerDimension: 65535, maxTextureDimension2D: 8192 },
    addEventListener(type, listener) { if (type === 'uncapturederror') onUncapturedError = listener; }, lost: new Promise(() => {}),
    createTexture: () => ({ createView: () => ({}), destroy() {} }),
    createBuffer: ({ size }) => ({
      size, destroy() {}, getMappedRange: () => new ArrayBuffer(size), unmap() {},
      // The first-frame validator's flag readback is the only mapped buffer.
      async mapAsync() { if (validationError) onUncapturedError?.({ error: new Error('stand-in validation error') }); },
    }),
    createShaderModule: ({ code }) => ({ code }),
    createComputePipeline: () => ({ getBindGroupLayout: () => ({}) }),
    createBindGroup: () => ({}),
    createCommandEncoder: () => ({ beginComputePass: () => pass, copyBufferToBuffer() {}, finish: () => ({}) }),
    queue: { writeBuffer() {}, submit() {}, onSubmittedWorkDone: async () => {}, copyExternalImageToTexture: () => { state.copies++; } },
    destroy() { state.destroyed = true; },
  };
  const adapter = {
    info: { vendor: 'apple', architecture: 'metal-3', device: '', description: '', isFallbackAdapter: fallback },
    limits: { maxStorageBufferBindingSize: 2 ** 30, maxBufferSize: 2 ** 30, maxTextureDimension2D: 16384 },
    requestDevice: async ({ requiredLimits }) => { state.requiredLimits = requiredLimits; Object.assign(device.limits, requiredLimits); return device; },
  };
  Object.assign(globalThis, {
    GPUBufferUsage: { MAP_READ: 1, COPY_SRC: 4, COPY_DST: 8, STORAGE: 128 }, GPUMapMode: { READ: 1 },
    GPUTextureUsage: { COPY_DST: 2, TEXTURE_BINDING: 4, RENDER_ATTACHMENT: 16 },
  });
  Object.defineProperty(globalThis.navigator, 'gpu', { value: { requestAdapter: async () => adapter }, configurable: true });
  try { return await body(state); } finally {
    delete globalThis.navigator.gpu;
    delete globalThis.GPUBufferUsage; delete globalThis.GPUMapMode; delete globalThis.GPUTextureUsage;
  }
}

function matteContext(runtime, { input = {}, width = 4, height = 2, frameTimes = [0], timeline, modelBytes } = {}) {
  const state = { created: null, runs: [], results: [], released: false, written: new Map(), downloads: [], progress: [] };
  const gpuTensor = (dims, values) => ({
    type: 'float32', location: 'gpu-buffer', dims, gpuBuffer: { size: dims.reduce((a, b) => a * b, 4) },
    getData: async () => values, dispose() { this.disposed = true; },
  });
  class Tensor {
    constructor(type, data, dims) { Object.assign(this, { type, data, dims }); }
    dispose() { this.disposed = true; }
    static fromGpuBuffer(buffer, { dims }) { return new Tensor('float32', buffer, dims); }
  }
  const ort = {
    env: { wasm: {} }, Tensor,
    InferenceSession: {
      create: async (model, options) => {
        state.created = { model, options };
        return {
          inputNames: ['src', 'r1i', 'r2i', 'r3i', 'r4i', 'downsample_ratio'],
          outputNames: ['fgr', 'pha', 'r1o', 'r2o', 'r3o', 'r4o'],
          run: async (feeds, outputs) => {
            state.runs.push({ feeds, outputs });
            const offset = state.runs.length;
            const alpha = Float32Array.from({ length: width * height }, (_, p) => [-0.5, 0.5, 1.5][(p + offset) % 3]);
            const result = { pha: gpuTensor([1, 1, height, width], alpha) };
            for (const name of ['r1o', 'r2o', 'r3o', 'r4o']) result[name] = gpuTensor([1, 16, 1, 1]);
            state.results.push(result);
            return result;
          },
          release: async () => { state.released = true; },
        };
      },
    },
  };
  const request = { contractVersion: 1, task: 'person.matte', input: { source: {}, ...input } };
  const value = {
    request,
    source: {
      width, height, frameTimes, timeline,
      async *canvases(indices) {
        for (const index of indices) yield { index, sourceTimeSeconds: frameTimes[index], canvas: { width, height } };
      },
    },
    download: async (pin) => { state.downloads.push(pin); return pin === runtime.assets.rvm ? modelBytes : Uint8Array.of(1); },
    importModule: async () => ort,
    writeOutput: async (relativePath, bytes) => { state.written.set(relativePath, bytes); },
    emitProgress: (event) => state.progress.push(event),
    signal: new AbortController().signal,
  };
  return { value, state };
}

test('person.matte refuses unsupported options and hosts without hardware WebGPU before downloading', async () => {
  const runtime = await loadWebRuntime();
  for (const [input, message] of [
    [{ provider: 'cpu' }, /auto provider \(WebGPU\) only/],
    [{ alphaEncoding: 'grayscale-avif-8bit' }, /grayscale-png-8bit alpha only/],
    [{ outputMode: 'foreground-video' }, /foreground-video is desktop-only/],
    [{ downsampleRatio: 0 }, /downsampleRatio/],
  ]) {
    const run = matteContext(runtime, { input });
    await assert.rejects(runtime.run(run.value), message);
    assert.deepEqual(run.state.downloads, []);
  }
  const noGpu = matteContext(runtime);
  await assert.rejects(runtime.run(noGpu.value), /requires WebGPU/);
  const software = matteContext(runtime);
  await withWebGpu({ fallback: true }, () => assert.rejects(runtime.run(software.value), /hardware WebGPU adapter/));
  // A panorama within the host's pixel bound but wider than the adapter's 2D texture limit.
  const panorama = matteContext(runtime, { width: 16385, height: 1, input: { source: { kind: 'image' } } });
  const granted = await withWebGpu({}, async (state) => {
    await assert.rejects(runtime.run(panorama.value), /WebGPU texture size limit/);
    return state.requiredLimits;
  });
  assert.equal(granted.maxTextureDimension2D, 16384);
  assert.deepEqual([...noGpu.state.downloads, ...software.state.downloads, ...panorama.state.downloads], []);
});

test('person.matte writes desktop-shaped PNG masks and manifest with recurrent GPU state', async (t) => {
  // The derived model comes from the real pinned bytes.
  const modelPath = process.env.RVM_MODEL;
  if (!modelPath) return t.skip('Set RVM_MODEL to the original rvm_mobilenetv3_fp32.onnx');
  const modelBytes = new Uint8Array(readFileSync(modelPath));
  const { encodeGrayPng } = require('../lib/gray-png.cjs');
  const zlib = require('node:zlib');
  const scanlines = (png) => {
    const view = Buffer.from(png), parts = [];
    for (let p = 8; p < view.length; p += view.readUInt32BE(p) + 12) {
      if (view.toString('ascii', p + 4, p + 8) === 'IDAT') parts.push(view.subarray(p + 8, p + 8 + view.readUInt32BE(p)));
    }
    return zlib.inflateSync(Buffer.concat(parts));
  };
  const runtime = await loadWebRuntime();
  // 25 fps on a 1/12800 clock; the range selects displayed frames 2..4.
  const timeBase = { numerator: 1, denominator: 12800 };
  const pts = Array.from({ length: 10 }, (_, index) => index * 512);
  const frameTimes = pts.slice(2, 5).map((tick) => tick / 12800);
  const video = matteContext(runtime, {
    modelBytes, frameTimes, timeline: { timeBase, pts, averageFrameRate: '25/1', firstIndex: 2 },
    input: { sourceRange: { startSeconds: 0.07, endSeconds: 0.19 } },
  });
  const gpu = await withWebGpu({}, async (state) => ({ result: await runtime.run(video.value), state }));
  const manifest = gpu.result.files.manifest;
  assert.equal(manifest.name, 'matte.json');
  assert.deepEqual(Object.keys(manifest.json), ['schemaVersion', 'task', 'frameSize', 'alphaEncoding', 'sourceFrameRate', 'sourceRange', 'frames', 'downsampleRatio', 'model', 'diagnostics']);
  assert.deepEqual(manifest.json.sourceFrameRate, { numerator: 25, denominator: 1 });
  assert.deepEqual(manifest.json.sourceRange, { startSeconds: 2 / 25, endSeconds: 5 / 25 });
  assert.deepEqual(manifest.json.frames, frameTimes.map((sourceTimeSeconds, index) => ({ index, sourceTimeSeconds, file: `alpha/00000${index}.png` })));
  assert.deepEqual(manifest.json.model, { name: 'rvm-mobilenetv3-fp32', sha256: MODELS['person.matte'].sha256 });
  assert.equal(manifest.json.downsampleRatio, 0.25);
  const { diagnostics } = gpu.result;
  assert.equal(diagnostics.backend, 'onnxruntime-web-webgpu');
  assert.equal(diagnostics.selectedProvider, 'webgpu');
  assert.deepEqual(diagnostics.webgpu.derivedModel, {
    sha256: DERIVED_RVM_SHA256, originalSha256: MODELS['person.matte'].sha256, transformVersion: 'rvm-conv-pad4-v1', graphOptimizationLevel: 'basic',
  });
  assert.equal(diagnostics.webgpu.preprocessing, 'canvas-copy-external-image-rgba8-to-planar-f32');
  // The desktop WebGPU session options; recurrent outputs feed the next frame.
  const { options } = video.state.created;
  assert.equal(options.executionProviders[0].name, 'webgpu');
  assert.equal(options.graphOptimizationLevel, 'basic');
  assert.deepEqual(options.preferredOutputLocation, { pha: 'gpu-buffer', r1o: 'gpu-buffer', r2o: 'gpu-buffer', r3o: 'gpu-buffer', r4o: 'gpu-buffer' });
  assert.deepEqual(video.state.runs[0].feeds.r1i.dims, [1, 1, 1, 1]);
  assert.equal(video.state.runs[1].feeds.r1i, video.state.results[0].r1o);
  assert.equal(video.state.runs[2].feeds.r4i, video.state.results[1].r4o);
  assert.equal(video.state.runs[0].feeds.downsample_ratio.data[0], 0.25);
  // Same scanlines as the desktop PNG writer for the clamped, rounded alpha.
  for (let index = 0; index < 3; index++) {
    const expected = Uint8Array.from({ length: 8 }, (_, p) => [0, 128, 255][(p + index + 1) % 3]);
    assert.deepEqual(scanlines(video.state.written.get(`alpha/00000${index}.png`)), scanlines(await encodeGrayPng(4, 2, expected, zlib.deflateSync)));
  }
  assert.equal(gpu.state.copies, 3);
  assert.equal(gpu.state.destroyed, true);
  assert.equal(video.state.released, true);
  assert.deepEqual(video.state.progress.at(-1), { step: 'inference', completed: 3, total: 3 });

  const image = matteContext(runtime, { modelBytes, input: { source: { kind: 'image' } } });
  const imageManifest = (await withWebGpu({}, () => runtime.run(image.value))).files.manifest.json;
  assert.equal(imageManifest.sourceKind, 'image');
  assert.equal(imageManifest.sourceRange, undefined);
  assert.deepEqual(imageManifest.frames, [{ index: 0, sourceTimeSeconds: 0, file: 'alpha/000000.png' }]);
  assert.equal(image.state.runs.length, 1);

  // A GPU error raised while validating the only frame fails the job.
  const invalid = matteContext(runtime, { modelBytes, input: { source: { kind: 'image' } } });
  await withWebGpu({ validationError: true }, () => assert.rejects(runtime.run(invalid.value), /stand-in validation error/));
});

test('speaker measurements preserve detections and count both model calls', async () => {
  const { scoreSpeakerWindow, newSpeakerState } = require('../lib/speaker-window.cjs');
  const { StageTimings } = require('../lib/stage-timings.cjs');
  const ort = { Tensor: class { constructor(type, data, dims) { this.data=data; this.dims=dims; } dispose() {} } };
  const yunet = { inputNames: ['input'], run: async () => Object.fromEntries(Object.entries(ONE_FACE).map(([k,data])=>[k,{data,dispose(){}}])) };
  const model = { run: async ({video}) => ({ scores: { data: new Float32Array(video.dims[1]).fill(.5), dispose(){} } }) };
  const context = { ort, yunet, model, video:{width:64,height:36}, width:64, height:36,
    rgb:Buffer.alloc(25*64*36*3), pcm:new Float64Array(16000),
    start:0,duration:1,rangeStart:0,signal:new AbortController().signal };
  const plain = await scoreSpeakerWindow({...context,state:newSpeakerState()});
  const timings = new StageTimings();
  const timed = await scoreSpeakerWindow({...context,state:newSpeakerState(),timings});
  assert.deepEqual(timed,plain);
  const stages = timings.summary().stages;
  assert.equal(stages.faceInference.calls,4);
  assert.equal(stages.faceInput.calls,4);
  assert.equal(stages.speakerInference.calls,3);
  assert.equal(stages.faceCrops.calls,1);
});
