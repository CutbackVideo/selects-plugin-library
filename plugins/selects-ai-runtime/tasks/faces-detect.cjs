'use strict';

const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { writeJson } = require('../lib/files.cjs');
const { throwIfAborted } = require('../lib/errors.cjs');
const { createVerifiedModelSession } = require('../lib/models.cjs');
const { YUNET_INPUT_SIZE, rgbToLetterboxBlob, decodeYuNet, mapFaceToDisplay } = require('../lib/yunet-decode.cjs');

const YUNET_MODEL_SHA256 = '8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4';
const EPSILON_SECONDS = 1e-7;

function faceParameters(request) {
  const input = request.input;
  const range = input?.sourceRange;
  const sampleEverySeconds = input?.sampleEverySeconds ?? 0.5;
  const scoreThreshold = input?.scoreThreshold ?? 0.8;
  if (input?.source?.kind === 'image') {
    if (range !== undefined || input.sampleEverySeconds !== undefined) throw new Error('Image input cannot have sourceRange or video sampling options');
    if (!Number.isFinite(scoreThreshold) || scoreThreshold < 0 || scoreThreshold > 1) throw new Error('scoreThreshold must be in [0, 1]');
    return { scoreThreshold };
  }
  if (!range || !Number.isFinite(range.startSeconds) || !Number.isFinite(range.endSeconds)
    || range.startSeconds < 0 || range.endSeconds <= range.startSeconds) {
    throw new Error('Expected nonempty sourceRange [startSeconds, endSeconds)');
  }
  if (!Number.isFinite(sampleEverySeconds) || sampleEverySeconds <= 0) throw new Error('sampleEverySeconds must be positive');
  if (!Number.isFinite(scoreThreshold) || scoreThreshold < 0 || scoreThreshold > 1) throw new Error('scoreThreshold must be in [0, 1]');
  return { sourceRange: { startSeconds: range.startSeconds, endSeconds: range.endSeconds }, sampleEverySeconds, scoreThreshold };
}

// Use actual source PTS, choosing the first available frame at/after each sample
// boundary. Advance directly over missing intervals; never invent VFR times.
function sampleSelector(parameters) {
  const { sourceRange, sampleEverySeconds } = parameters;
  if (!sourceRange) return time => time === 0;
  let next = sourceRange.startSeconds;
  return (time) => {
    if (!Number.isFinite(time)) throw new Error('Frame sourceTimeSeconds must be finite');
    if (time < sourceRange.startSeconds || time >= sourceRange.endSeconds || time + EPSILON_SECONDS < next) return false;
    const elapsed = Math.max(0, time - sourceRange.startSeconds);
    next = sourceRange.startSeconds + (Math.floor((elapsed + EPSILON_SECONDS) / sampleEverySeconds) + 1) * sampleEverySeconds;
    return true;
  };
}

async function runFaces(context) {
  const { request, config, outputDir, ort, video, frames, emitProgress, signal } = context;
  throwIfAborted(signal);
  const parameters = faceParameters(request);
  const provider = config.provider ?? 'cpu';
  if (provider !== 'cpu') throw new Error('YuNet PoC currently supports the CPU provider only');
  const model = config.models?.yunet;
  if (!model?.path) throw new Error('Missing config.models.yunet.path');
  const modelSha256 = YUNET_MODEL_SHA256;
  const selectForTotal = sampleSelector(parameters);
  const total = video.frameTimes.filter(selectForTotal).length;
  if (total === 0) throw new Error('No source frames are available in the requested range');
  await emitProgress({ step: 'loading-model', completed: 0, total: 1 });
  const options = { executionProviders: ['cpu'], graphOptimizationLevel: 'all' };
  if (config.intraOpNumThreads !== undefined) options.intraOpNumThreads = config.intraOpNumThreads;
  const started = performance.now();
  const session = await createVerifiedModelSession(ort, { path: model.path, sha256: modelSha256 }, options);
  let tensorData;
  const samples = [];
  const select = sampleSelector(parameters);
  let inferenceMilliseconds = 0;
  let discardedPaddingFaces = 0;
  let previousTime = -Infinity;
  let preprocessing;
  try {
    if (session.inputNames.length !== 1) throw new Error('YuNet requires exactly one input tensor');
    throwIfAborted(signal);
    await emitProgress({ step: 'faces.detect', completed: 0, total });
    for await (const frame of await frames()) {
      throwIfAborted(signal);
      if (frame.sourceTimeSeconds < previousTime) throw new Error('Source frames must arrive in timestamp order');
      previousTime = frame.sourceTimeSeconds;
      if (!select(frame.sourceTimeSeconds)) continue;
      preprocessing = rgbToLetterboxBlob(frame.rgb, video.width, video.height, tensorData);
      tensorData = preprocessing.data;
      const inputTensor = new ort.Tensor('float32', tensorData, [1, 3, YUNET_INPUT_SIZE, YUNET_INPUT_SIZE]);
      let outputs;
      let detected;
      const inferenceStarted = performance.now();
      try {
        outputs = await session.run({ [session.inputNames[0]]: inputTensor });
        inferenceMilliseconds += performance.now() - inferenceStarted;
        throwIfAborted(signal);
        detected = decodeYuNet(Object.fromEntries(Object.entries(outputs).map(([name, tensor]) => [name, tensor.data])),
          YUNET_INPUT_SIZE, YUNET_INPUT_SIZE, { score: parameters.scoreThreshold });
      } finally {
        inputTensor.dispose?.();
        if (outputs) for (const tensor of Object.values(outputs)) tensor.dispose?.();
      }
      const faces = detected.map((face) => mapFaceToDisplay(face, preprocessing, video.width, video.height)).filter(Boolean);
      discardedPaddingFaces += detected.length - faces.length;
      samples.push({ index: frame.index, sourceTimeSeconds: frame.sourceTimeSeconds, faces });
      await emitProgress({ step: 'faces.detect', completed: samples.length, total });
    }
    if (samples.length !== total) throw new Error(`Decoded ${samples.length} samples; expected ${total} from source PTS`);
    throwIfAborted(signal);
    const faceCount = samples.reduce((sum, sample) => sum + sample.faces.length, 0);
    const preprocessingInfo = {
      kind: 'bilinear-top-left-zero-pad', tensorLayout: 'NCHW', channels: 'BGR', valueRange: [0, 255],
      inputSize: { width: YUNET_INPUT_SIZE, height: YUNET_INPUT_SIZE },
      contentSize: { width: preprocessing.contentWidth, height: preprocessing.contentHeight },
      noUpscale: true,
    };
    await writeJson(path.join(outputDir, 'faces.json'), {
      contractVersion: 1, task: 'faces.detect',
      ...(request.input.source?.kind === 'image' ? { sourceKind: 'image' } : {}),
      model: { id: 'yunet-2023mar', sha256: modelSha256 },
      coordinateSpace: 'display-pixels', frameSize: { width: video.width, height: video.height },
      boxFormat: 'xyxy', landmarkOrder: ['rightEye', 'leftEye', 'nose', 'rightMouth', 'leftMouth'],
      parameters, preprocessing: preprocessingInfo, samples,
    });
    return {
      files: { detections: 'faces.json' },
      metrics: {
        sampleCount: samples.length, faceCount,
        emptySampleCount: samples.filter((sample) => sample.faces.length === 0).length,
        inferenceMilliseconds, elapsedMilliseconds: performance.now() - started,
      },
      diagnostics: { provider, modelSha256, preprocessing: preprocessingInfo, discardedPaddingFaces, tracking: false },
    };
  } finally {
    await session.release();
  }
}

module.exports = { runFaces, faceParameters, sampleSelector, YUNET_MODEL_SHA256 };
