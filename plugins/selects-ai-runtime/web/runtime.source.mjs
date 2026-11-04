// Web runtime contract v1 for selects-ai-runtime: faces.detect and
// speakers.detect in a browser.
//
// Selects' web host loads the generated web/runtime.mjs (this file with the
// imported CommonJS libraries inlined; see scripts/build-web-runtime.cjs) in a
// dedicated Worker. The host owns the job, source decoding and verified
// downloads; this module owns the model and ONNX Runtime pins and the
// inference itself, exactly like runtime.cjs does on desktop.
//
// The host calls run(context) with:
//   request         { contractVersion: 1, task, input: { source: { kind? }, sourceRange?, ...options } }
//                   (the desktop request.json shape without a file path)
//   source          { width, height, frameTimes, frames(indices) } for faces.detect;
//                   { width, height, decodeWindow(options) } for speakers.detect
//                     width/height  displayed pixels (rotation and EXIF orientation applied)
//                     frameTimes    ascending source seconds of the frames inside sourceRange,
//                                   the first displayed frame of the file being zero;
//                                   [0] for an image
//                     frames(i[])   async iterable of { index, sourceTimeSeconds, rgb }
//                                   (packed RGB24) for the requested frameTimes indices
//                     decodeWindow({ startSeconds, durationSeconds, fps, width, height, audioSampleRate })
//                                   resolves { rgb, pcm }: frames at fps scaled to width x height
//                                   (packed RGB24) and mono signed 16-bit audio from the same
//                                   source time, as desktop FFmpeg decodes a speaker window
//   readPackageFile(pin)  verified bytes of a file bundled with the installed plugin
//                   ({ path, size, sha256 })
//   download(pin)   resolves verified bytes for { url, size, sha256 }
//   importModule(bytes)  imports verified JavaScript module bytes
//   emitProgress({ step, completed?, total? }), signal
// and receives { files: { detections: { name, mediaType, json } }, metrics, diagnostics }.
import yunetDecode from '../lib/yunet-decode.cjs';
import faceSampling from '../lib/face-sampling.cjs';
import runtimeAssets from '../lib/runtime-assets.cjs';
import speakerWindow from '../lib/speaker-window.cjs';

const { YUNET_INPUT_SIZE, rgbToLetterboxBlob, decodeYuNet, mapFaceToDisplay } = yunetDecode;
const { faceParameters, sampleSelector } = faceSampling;
const { speakerWindows, speakerAnalysisSize, scoreSpeakerWindow, newSpeakerState, speakersOutput } = speakerWindow;

export const contractVersion = 1;
export const tasks = Object.freeze(['faces.detect', 'speakers.detect']);

const YUNET = runtimeAssets.MODELS['faces.detect'];
const LIGHT_ASD = runtimeAssets.MODELS['speakers.detect'];
/** runtime.json tasks['speakers.detect'].model; the document names the model by it. */
export const LIGHT_ASD_MODEL_ID = 'light-asd-ava';
const ORT_DIST = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${runtimeAssets.ORT_VERSION}/dist`;
// The single-file WASM build embeds its Emscripten glue, so only the module and
// its WebAssembly binary are fetched. Both match the npm registry tarball.
export const assets = Object.freeze({
  yunet: Object.freeze({ url: YUNET.url, size: YUNET.size, sha256: YUNET.sha256 }),
  // Bundled with the plugin, as on desktop; read from the installed package.
  lightAsd: Object.freeze({ path: LIGHT_ASD.bundled, size: LIGHT_ASD.size, sha256: LIGHT_ASD.sha256 }),
  ortModule: Object.freeze({
    url: `${ORT_DIST}/ort.wasm.bundle.min.mjs`, size: 73054,
    sha256: '11e64bd8ffe11bd1a2a2f0d6275fdfbbba7262f0b76b99b53d228a8a22ef3d90',
  }),
  ortWasm: Object.freeze({
    url: `${ORT_DIST}/ort-wasm-simd-threaded.wasm`, size: 14239897,
    sha256: '3398c10d07d229bd91b364548e130e0e51a8e5704b88c7c083ebbeb78842dee2',
  }),
});

const now = () => globalThis.performance?.now() ?? Date.now();
const throwIfAborted = (signal) => {
  if (signal?.aborted) throw signal.reason instanceof Error ? signal.reason : new Error('Canceled');
};

/** ONNX Runtime Web plus a YuNet session; both tasks detect faces with it. */
async function createSession(context) {
  const [moduleBytes, wasmBytes, modelBytes] = await Promise.all([
    context.download(assets.ortModule),
    context.download(assets.ortWasm),
    context.download(assets.yunet),
  ]);
  throwIfAborted(context.signal);
  const ort = await context.importModule(moduleBytes);
  if (!ort?.InferenceSession || !ort?.Tensor || !ort?.env?.wasm) throw new Error('ONNX Runtime Web module is not usable');
  // The verified binary is handed over directly, so nothing else is fetched.
  // Without cross-origin isolation a browser offers no shared memory, so the
  // runtime is single-threaded and runs inside the host's Worker.
  ort.env.wasm.wasmBinary = wasmBytes;
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  const session = await ort.InferenceSession.create(modelBytes, {
    executionProviders: ['wasm'], graphOptimizationLevel: 'all',
  });
  return { ort, session };
}

export async function run(context) {
  throwIfAborted(context.signal);
  const { request } = context;
  if (request?.contractVersion !== 1) throw new Error('Unsupported web runtime request contract');
  if (!tasks.includes(request.task)) throw new Error(`The web runtime does not support ${request.task}`);
  const provider = request.input.provider ?? 'cpu';
  if (provider !== 'cpu') throw new Error('Face and speaker detection support the CPU provider only');
  return request.task === 'speakers.detect' ? runSpeakers(context) : runFaces(context);
}

async function runFaces(context) {
  const { request, source, emitProgress, signal } = context;
  const parameters = faceParameters(request);
  const provider = 'cpu';
  const isImage = request.input.source?.kind === 'image';
  const { width, height, frameTimes } = source;
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) {
    throw new Error('Source has no displayed frame size');
  }
  if (!Array.isArray(frameTimes) || frameTimes.some((time, index) => !Number.isFinite(time) || (index && time <= frameTimes[index - 1]))) {
    throw new Error('Source frame timestamps are unavailable or not ordered');
  }
  const select = sampleSelector(parameters);
  const indices = frameTimes.flatMap((time, index) => (select(time) ? [index] : []));
  const total = indices.length;
  if (total === 0) throw new Error('No source frames are available in the requested range');

  const started = now();
  await emitProgress({ step: 'loading-model', completed: 0, total: 1 });
  const { ort, session } = await createSession(context);
  const samples = [];
  let inferenceMilliseconds = 0;
  let discardedPaddingFaces = 0;
  let tensorData;
  let preprocessing;
  try {
    if (session.inputNames.length !== 1) throw new Error('YuNet requires exactly one input tensor');
    throwIfAborted(signal);
    await emitProgress({ step: 'faces.detect', completed: 0, total });
    for await (const frame of source.frames(indices)) {
      throwIfAborted(signal);
      const expected = indices[samples.length];
      if (frame.index !== expected || frame.sourceTimeSeconds !== frameTimes[expected]) {
        throw new Error('Source frames must arrive in the requested order');
      }
      preprocessing = rgbToLetterboxBlob(frame.rgb, width, height, tensorData);
      tensorData = preprocessing.data;
      const inputTensor = new ort.Tensor('float32', tensorData, [1, 3, YUNET_INPUT_SIZE, YUNET_INPUT_SIZE]);
      let outputs;
      let detected;
      const inferenceStarted = now();
      try {
        outputs = await session.run({ [session.inputNames[0]]: inputTensor });
        inferenceMilliseconds += now() - inferenceStarted;
        throwIfAborted(signal);
        detected = decodeYuNet(Object.fromEntries(Object.entries(outputs).map(([name, tensor]) => [name, tensor.data])),
          YUNET_INPUT_SIZE, YUNET_INPUT_SIZE, { score: parameters.scoreThreshold });
      } finally {
        inputTensor.dispose?.();
        if (outputs) for (const tensor of Object.values(outputs)) tensor.dispose?.();
      }
      const faces = detected.map((face) => mapFaceToDisplay(face, preprocessing, width, height)).filter(Boolean);
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
    return {
      files: {
        detections: {
          name: 'faces.json', mediaType: 'application/json',
          json: {
            contractVersion: 1, task: 'faces.detect',
            ...(isImage ? { sourceKind: 'image' } : {}),
            model: { id: 'yunet-2023mar', sha256: assets.yunet.sha256 },
            coordinateSpace: 'display-pixels', frameSize: { width, height },
            boxFormat: 'xyxy', landmarkOrder: ['rightEye', 'leftEye', 'nose', 'rightMouth', 'leftMouth'],
            parameters, preprocessing: preprocessingInfo, samples,
          },
        },
      },
      metrics: {
        sampleCount: samples.length, faceCount,
        emptySampleCount: samples.filter((sample) => sample.faces.length === 0).length,
        inferenceMilliseconds, elapsedMilliseconds: now() - started,
      },
      diagnostics: {
        provider, backend: 'onnxruntime-web-wasm', ortVersion: runtimeAssets.ORT_VERSION,
        modelSha256: assets.yunet.sha256, preprocessing: preprocessingInfo, discardedPaddingFaces, tracking: false,
      },
    };
  } finally {
    await session.release?.();
  }
}

// Mirrors tasks/speakers-detect.cjs: the same windows and shared scoring, with
// the host decoding each window instead of FFmpeg.
async function runSpeakers(context) {
  const { request, source, emitProgress, signal } = context;
  const range = request.input.sourceRange;
  if (request.input.source?.kind === 'image') throw new Error('Speaker detection requires a video source');
  if (!range || !Number.isFinite(range.startSeconds) || !Number.isFinite(range.endSeconds)
    || range.startSeconds < 0 || range.endSeconds <= range.startSeconds) {
    throw new Error('Expected nonempty sourceRange [startSeconds, endSeconds)');
  }
  if (typeof source.decodeWindow !== 'function' || typeof context.readPackageFile !== 'function') {
    throw new Error('This host cannot decode speaker windows');
  }
  const video = { width: source.width, height: source.height };
  if (!Number.isSafeInteger(video.width) || !Number.isSafeInteger(video.height) || video.width <= 0 || video.height <= 0) {
    throw new Error('Source has no displayed frame size');
  }
  const started = now();
  const { width, height } = speakerAnalysisSize(video);
  await emitProgress({ step: 'loading-model', completed: 0, total: 1 });
  const { ort, session: yunet } = await createSession(context);
  let model;
  const all = [], state = newSpeakerState();
  let decodeMilliseconds = 0;
  try {
    model = await ort.InferenceSession.create(await context.readPackageFile(assets.lightAsd), { executionProviders: ['wasm'] });
    for (const { start, duration } of speakerWindows(range)) {
      throwIfAborted(signal);
      const progress = { completed: start - range.startSeconds, total: range.endSeconds - range.startSeconds };
      await emitProgress({ step: 'decoding', ...progress });
      const decodeBegan = now();
      const { rgb, pcm } = await source.decodeWindow({
        startSeconds: start, durationSeconds: duration, fps: 25, width, height, audioSampleRate: 16000,
      });
      decodeMilliseconds += now() - decodeBegan;
      const window = await scoreSpeakerWindow({
        ort, yunet, model, video, width, height, rgb, pcm: Float64Array.from(pcm), start, duration,
        rangeStart: range.startSeconds, scoreThreshold: request.input.scoreThreshold, state, signal,
        onFacesDetected: () => emitProgress({ step: 'speakers.detect', ...progress }),
      });
      all.push(...window.samples);
    }
    const output = speakersOutput({
      video, range, model: { id: LIGHT_ASD_MODEL_ID, sha256: assets.lightAsd.sha256 },
      samples: all, state, decodeMilliseconds, elapsedMilliseconds: now() - started,
    });
    return {
      files: { detections: { name: 'speakers.json', mediaType: 'application/json', json: output.document } },
      metrics: output.metrics,
      diagnostics: { ...output.diagnostics, backend: 'onnxruntime-web-wasm', ortVersion: runtimeAssets.ORT_VERSION },
    };
  } finally {
    await model?.release?.();
    await yunet.release?.();
  }
}
