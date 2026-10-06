'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, readFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const {
  rgbToLetterboxBlob, decodeYuNet, rectOverlap, nmsBoxes, mapFaceToDisplay,
} = require('../lib/yunet-decode.cjs');
const { faceParameters, sampleSelector, runFaces } = require('../tasks/faces-detect.cjs');

function outputs(width, height, anchors = []) {
  const output = {};
  for (const stride of [8, 16, 32]) {
    const count = (width / stride) * (height / stride);
    output[`cls_${stride}`] = new Float32Array(count);
    output[`obj_${stride}`] = new Float32Array(count);
    output[`bbox_${stride}`] = new Float32Array(count * 4);
    output[`kps_${stride}`] = new Float32Array(count * 10);
  }
  for (const { stride, index, cls, obj, box, landmarks } of anchors) {
    output[`cls_${stride}`][index] = cls;
    output[`obj_${stride}`][index] = obj;
    output[`bbox_${stride}`].set(box, index * 4);
    output[`kps_${stride}`].set(landmarks ?? new Array(10).fill(0.5), index * 10);
  }
  return output;
}

test('RGB preprocessing preserves uint8 BGR planes and clears right/bottom padding', () => {
  const rgb = Uint8Array.from({ length: 18 }, (_, index) => index + 1);
  const reused = new Float32Array(3 * 640 * 640).fill(123);
  const blob = rgbToLetterboxBlob(rgb, 3, 2, reused);
  assert.equal(blob.data, reused);
  assert.deepEqual([blob.contentWidth, blob.contentHeight, blob.scaleX, blob.scaleY], [3, 2, 1, 1]);
  const plane = 640 * 640;
  assert.deepEqual([blob.data[0], blob.data[1], blob.data[640 + 2]], [3, 6, 18]);
  assert.deepEqual([blob.data[plane], blob.data[2 * plane], blob.data[2 * plane + 640 + 2]], [2, 1, 16]);
  assert.deepEqual([blob.data[3], blob.data[2 * 640], blob.data[3 * plane - 1]], [0, 0, 0]);
  assert.throws(() => rgbToLetterboxBlob(new Uint8Array(5), 3, 2), /RGB24/);
});

test('portrait resize keeps aspect ratio and uses bilinear pixel centres without upscaling', () => {
  const rgb = new Uint8Array(4 * 1280 * 3);
  for (let y = 0; y < 1280; y += 1) {
    for (let x = 0; x < 4; x += 1) rgb.set([x * 20, 40, 80], (y * 4 + x) * 3);
  }
  const blob = rgbToLetterboxBlob(rgb, 4, 1280);
  assert.deepEqual([blob.contentWidth, blob.contentHeight, blob.scaleX, blob.scaleY], [2, 640, 2, 2]);
  assert.deepEqual([blob.data[2 * 640 * 640], blob.data[2 * 640 * 640 + 1]], [10, 50]);
  assert.equal(blob.data[2], 0);
});

test('OpenCV equations decode known grid anchors, five landmarks and clamped scores', () => {
  // Independent hand-computed example: row=1,col=2,stride=8; centre=(20,10),
  // width=8,height=16, score=sqrt(.81*clamp(1.5))=.9.
  const result = decodeYuNet(outputs(64, 32, [{
    stride: 8, index: 10, cls: 0.81, obj: 1.5, box: [0.5, 0.25, 0, Math.log(2)],
    landmarks: [0, 0, 1, 0, 0.5, 0.5, 0, 1, 1, 1],
  }]), 64, 32);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].box, [16, 2, 8, 16]);
  assert.deepEqual(result[0].landmarks, [[16, 8], [24, 8], [20, 12], [16, 16], [24, 16]]);
  assert.ok(Math.abs(result[0].score - 0.9) < 1e-6);
  const broken = outputs(64, 32);
  broken.obj_16 = new Float32Array(1);
  assert.throws(() => decodeYuNet(broken, 64, 32), /stride-16/);
});

test('integer rectangle NMS suppresses overlap and keeps stable score order', () => {
  const result = decodeYuNet(outputs(64, 32, [
    { stride: 8, index: 10, cls: 0.8, obj: 0.8, box: [0, 0, Math.log(2), Math.log(2)] },
    { stride: 8, index: 11, cls: 0.9, obj: 0.9, box: [0, 0, Math.log(2), Math.log(2)] },
    { stride: 16, index: 3, cls: 0.7, obj: 0.7, box: [0, 0, 0, 0] },
  ]), 64, 32, { score: 0.6 });
  assert.deepEqual(result.map((face) => face.score.toFixed(2)), ['0.90', '0.70']);
  assert.ok(Math.abs(rectOverlap([0, 0, 10, 10], [5, 0, 10, 10]) - 1 / 3) < 1e-6);
  const faces = [0.6, 0.7, 0.7].map((score, index) => ({ box: [index * 100, 0, 10, 10], score }));
  assert.deepEqual(nmsBoxes(faces, 0.6, 0.3, 5000), [1, 2]);
});

test('source-pixel boxes use separate axis scales, clamp bounds and discard padding-only detections', () => {
  const face = { box: [-2, 5, 20, 12], landmarks: [[-2, 5], [18, 17]], score: 0.9 };
  const mapped = mapFaceToDisplay(face, { scaleX: 3, scaleY: 2 }, 40, 30);
  assert.deepEqual(mapped.box, { xmin: 0, ymin: 10, xmax: 40, ymax: 30 });
  assert.deepEqual(mapped.landmarks, [{ x: -6, y: 10 }, { x: 54, y: 34 }]);
  assert.equal(mapFaceToDisplay({ ...face, box: [50, 0, 10, 10] }, { scaleX: 1, scaleY: 1 }, 40, 30), null);
});

test('source PTS sampling includes empty boundaries, skips gaps and respects a half-open range', () => {
  const parameters = faceParameters({ input: { sourceRange: { startSeconds: 1, endSeconds: 3 } } });
  assert.equal(parameters.sampleEverySeconds, 0.5);
  assert.equal(parameters.scoreThreshold, 0.8);
  const select = sampleSelector(parameters);
  assert.deepEqual([0, 0.99, 1.02, 1.1, 1.51, 2.8, 2.9, 3].filter(select), [1.02, 1.51, 2.8]);
});

test('faces task records empty samples, actual source times, progress and releases session', async (t) => {
  // A real pinned model file is read for integrity; the session stub supplies
  // hand-crafted tensor outputs, so this checks job/coordinate behavior only.
  const modelPath = process.env.YUNET_MODEL;
  if (!modelPath) return t.skip('Set YUNET_MODEL to exercise the job adapter with the pinned model');
  const directory = await mkdtemp(path.join(tmpdir(), 'selects-yunet-job-'));
  let released = false;
  const progress = [];
  const tensorOutputs = outputs(640, 640, [{
    stride: 8, index: 82, cls: 0.9, obj: 0.9, box: [0.5, 0.25, 0, Math.log(2)],
  }]);
  let calls = 0;
  const ort = {
    Tensor: class { constructor(type, data, dims) { assert.equal(type, 'float32'); assert.deepEqual(dims, [1, 3, 640, 640]); } },
    InferenceSession: { create: async () => ({
      inputNames: ['input'],
      run: async () => Object.fromEntries(Object.entries(calls++ === 0 ? tensorOutputs : outputs(640, 640))
        .map(([name, data]) => [name, { data }])),
      release: async () => { released = true; },
    }) },
  };
  try {
    const result = await runFaces({
      request: { input: { sourceRange: { startSeconds: 1, endSeconds: 2 } } },
      config: { models: { yunet: { path: modelPath } } }, outputDir: directory, ort,
      video: { width: 1280, height: 720, frameTimes: [1.04, 1.1, 1.55, 1.9] },
      frames: async function* () {
        for (const [index, time] of [1.04, 1.1, 1.55, 1.9].entries()) {
          yield { index, sourceTimeSeconds: time, rgb: Buffer.alloc(1280 * 720 * 3) };
        }
      },
      emitProgress: (event) => progress.push(event), signal: new AbortController().signal,
    });
    const stored = JSON.parse(await readFile(path.join(directory, result.files.detections), 'utf8'));
    assert.deepEqual(stored.samples.map((sample) => sample.sourceTimeSeconds), [1.04, 1.55]);
    assert.deepEqual(stored.samples[0].faces[0].box, { xmin: 32, ymin: 4, xmax: 48, ymax: 36 });
    assert.deepEqual(stored.samples[1].faces, []);
    assert.equal(result.metrics.emptySampleCount, 1);
    assert.deepEqual(progress.at(-1), { step: 'faces.detect', completed: 2, total: 2 });
    assert.equal(released, true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
