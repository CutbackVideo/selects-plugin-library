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
  assert.deepEqual(runtime.tasks, ['faces.detect', 'speakers.detect']);
  const yunet = MODELS['faces.detect'], lightAsd = MODELS['speakers.detect'];
  assert.deepEqual(runtime.assets.yunet, { url: yunet.url, size: yunet.size, sha256: yunet.sha256 });
  assert.deepEqual(runtime.assets.lightAsd, { path: lightAsd.bundled, size: lightAsd.size, sha256: lightAsd.sha256 });
  assert.equal(runtime.LIGHT_ASD_MODEL_ID, require('../runtime.json').tasks['speakers.detect'].model);
  for (const pin of Object.values(runtime.assets)) {
    assert.match(pin.url ?? pin.path, pin.url ? /^https:\/\// : /^models\/[\w.-]+\.onnx$/);
    assert.match(pin.sha256, /^[a-f0-9]{64}$/);
    assert.ok(Number.isSafeInteger(pin.size) && pin.size > 0);
  }
  assert.match(runtime.assets.ortModule.url, /onnxruntime-web@1\.30\.0\/dist\/ort\.wasm\.bundle\.min\.mjs$/);
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
    request: { ...videoRequest(), task: 'person.matte' }, frameTimes,
  }).value), /does not support person\.matte/);
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
    assert.deepEqual({ ...web.metrics, inferenceMilliseconds: 0, elapsedMilliseconds: 0 },
      { ...result.metrics, inferenceMilliseconds: 0, elapsedMilliseconds: 0 });
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
