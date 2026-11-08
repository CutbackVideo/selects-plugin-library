// Web runtime contract v1 for selects-ai-runtime: faces.detect,
// speakers.detect and person.matte in a browser.
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
//                   { width, height, decodeWindow(options) } for speakers.detect;
//                   { width, height, frameTimes, canvases(indices), timeline? } for person.matte
//                     width/height  displayed pixels (rotation and EXIF orientation applied)
//                     frameTimes    ascending source seconds of the frames inside sourceRange,
//                                   the first displayed frame of the file being zero;
//                                   [0] for an image
//                     frames(i[])   async iterable of { index, sourceTimeSeconds, rgb }
//                                   (packed RGB24) for the requested frameTimes indices
//                     canvases(i[]) async iterable of { index, sourceTimeSeconds, canvas }
//                                   (OffscreenCanvas or ImageBitmap at width x height)
//                     timeline      video only: { timeBase: { numerator, denominator }, pts,
//                                   averageFrameRate: 'N/D', firstIndex } where pts are the integer
//                                   ticks of every displayed frame relative to the first and
//                                   firstIndex is the pts index of frameTimes[0]
//                     decodeWindow({ startSeconds, durationSeconds, fps, width, height, audioSampleRate })
//                                   resolves { rgb, pcm }: frames at fps scaled to width x height
//                                   (packed RGB24) and mono signed 16-bit audio from the same
//                                   source time, as desktop FFmpeg decodes a speaker window
//   readPackageFile(pin)  verified bytes of a file bundled with the installed plugin
//                   ({ path, size, sha256 })
//   download(pin)   resolves verified bytes for { url, size, sha256 }
//   importModule(bytes)  imports verified JavaScript module bytes
//   writeOutput(relativePath, bytes)  person.matte only: stores one job output file
//   emitProgress({ step, completed?, total? }), signal
// and receives { files: { <detections|manifest>: { name, mediaType, json } }, metrics, diagnostics }.
import yunetDecode from '../lib/yunet-decode.cjs';
import faceSampling from '../lib/face-sampling.cjs';
import runtimeAssets from '../lib/runtime-assets.cjs';
import speakerWindow from '../lib/speaker-window.cjs';
import speakerTime from '../lib/speaker-time.cjs';
import rvmConvPadding from '../lib/rvm-conv-padding.cjs';
import webgpuRvmSession from '../lib/webgpu-rvm-session.cjs';
import grayPng from '../lib/gray-png.cjs';
import constantFrameRateClock from '../lib/constant-frame-rate.cjs';

const { YUNET_INPUT_SIZE, rgbToLetterboxBlob, decodeYuNet, mapFaceToDisplay } = yunetDecode;
const { faceParameters, sampleSelector } = faceSampling;
const { speakerWindows, speakerAnalysisSize, scoreSpeakerWindow, newSpeakerState, speakersOutput } = speakerWindow;
const { padRvmModelBytes, TRANSFORM_VERSION, GRAPH_OPTIMIZATION_LEVEL } = rvmConvPadding;
const { RVM_INPUTS, rvmSessionOptions, validateGpuFirstResult, dispatchShape } = webgpuRvmSession;
const { encodeGrayPng } = grayPng;
const { constantFrameRate } = constantFrameRateClock;

export const contractVersion = 1;
export const tasks = Object.freeze(['faces.detect', 'speakers.detect', 'person.matte']);

const YUNET = runtimeAssets.MODELS['faces.detect'];
const LIGHT_ASD = runtimeAssets.MODELS['speakers.detect'];
const RVM = runtimeAssets.MODELS['person.matte'];
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
  // The desktop model bytes from Cutback's CDN: the GitHub release has no CORS.
  rvm: Object.freeze({
    url: 'https://static.cutback.video/assets/ai-runtime/rvm/v1.0.0/rvm_mobilenetv3_fp32.onnx',
    size: RVM.size, sha256: RVM.sha256,
  }),
  // The WebGPU build runs on the Asyncify WASM binary.
  ortWebGpuModule: Object.freeze({
    url: `${ORT_DIST}/ort.webgpu.bundle.min.mjs`, size: 117732,
    sha256: '0730816731ce2cdfb06f273da065d4a1c7091eb9d1756a83b2916c8a89d015e2',
  }),
  ortWebGpuWasm: Object.freeze({
    url: `${ORT_DIST}/ort-wasm-simd-threaded.asyncify.wasm`, size: 26781914,
    sha256: '39f9f0894d478800487ed9f7dbe92618498db320cf55c8e3d89adff8dce658da',
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

function checkedFrames(source) {
  const { width, height, frameTimes } = source;
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) {
    throw new Error('Source has no displayed frame size');
  }
  if (!Array.isArray(frameTimes) || frameTimes.some((time, index) => !Number.isFinite(time) || (index && time <= frameTimes[index - 1]))) {
    throw new Error('Source frame timestamps are unavailable or not ordered');
  }
  return { width, height, frameTimes };
}

export async function run(context) {
  throwIfAborted(context.signal);
  const { request } = context;
  if (request?.contractVersion !== 1) throw new Error('Unsupported web runtime request contract');
  if (!tasks.includes(request.task)) throw new Error(`The web runtime does not support ${request.task}`);
  if (request.task === 'person.matte') {
    if ((request.input.provider ?? 'auto') !== 'auto') throw new Error('Person matte on web supports the auto provider (WebGPU) only');
    return runMatte(context);
  }
  const provider = request.input.provider ?? 'cpu';
  if (provider !== 'cpu') throw new Error('Face and speaker detection support the CPU provider only');
  return request.task === 'speakers.detect' ? runSpeakers(context) : runFaces(context);
}

async function runFaces(context) {
  const { request, source, emitProgress, signal } = context;
  const parameters = faceParameters(request);
  const provider = 'cpu';
  const isImage = request.input.source?.kind === 'image';
  const { width, height, frameTimes } = checkedFrames(source);
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
    || range.startSeconds < 0 || !speakerTime.isSpeakerDurationSupported(range)) {
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

// person.matte mirrors tasks/person-matte.cjs on its WebGPU path: the same
// derived model, session options, first-frame validation and manifest. The
// host draws each displayed frame on a canvas; the GPU copies it into the RVM
// input, so source pixels are never read back. There is no CPU fallback.
const RVM_OUTPUTS = ['pha', 'r1o', 'r2o', 'r3o', 'r4o'];
const CANVAS_SHADER = `
@group(0) @binding(0) var frame: texture_2d<f32>;
@group(0) @binding(1) var<storage, read_write> planar: array<f32>;
@compute @workgroup_size(256) fn main(@builtin(global_invocation_id) id: vec3<u32>, @builtin(num_workgroups) groups: vec3<u32>) {
  let size = textureDimensions(frame); let pixels = size.x * size.y; let p = id.x + id.y * groups.x * 256u;
  if (p >= pixels) { return; }
  let c = textureLoad(frame, vec2<u32>(p % size.x, p / size.x), 0);
  planar[p] = c.r;
  planar[pixels + p] = c.g;
  planar[2u * pixels + p] = c.b;
}`;
const SOFTWARE_ADAPTER = /swiftshader|llvmpipe|lavapipe|software|basic render/i;

async function sha256Hex(bytes) {
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

const deflate = async (bytes) => new Uint8Array(
  await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer(),
);

/** sourceFrameRate and the exact frame-index sourceRange when the PTS verify CFR, as lib/video.cjs derives them. */
function verifiedClock(timeline, frameTimes) {
  if (!timeline) return null;
  const { timeBase, pts, averageFrameRate, firstIndex } = timeline;
  if (!Array.isArray(pts) || !Number.isSafeInteger(firstIndex) || firstIndex < 0 || firstIndex + frameTimes.length > pts.length) {
    throw new Error('Source timeline does not cover the requested frames');
  }
  const rate = constantFrameRate(averageFrameRate, pts, timeBase);
  if (!rate) return null;
  if (frameTimes.some((time, index) => Math.abs(pts[firstIndex + index] * timeBase.numerator / timeBase.denominator - time) > 0.000001)) {
    throw new Error('Source timeline does not match the frame timestamps');
  }
  const fps = rate.numerator / rate.denominator;
  return { sourceFrameRate: rate, sourceRange: { startSeconds: firstIndex / fps, endSeconds: (firstIndex + frameTimes.length) / fps } };
}

async function requestHardwareDevice() {
  const gpu = globalThis.navigator?.gpu;
  if (!gpu) throw new Error('Person matte on web requires WebGPU, which this browser does not provide');
  const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
  const info = adapter?.info ?? {};
  const adapterInfo = Object.fromEntries(['vendor', 'architecture', 'device', 'description'].map((key) => [key, info[key]]));
  adapterInfo.isFallbackAdapter = info.isFallbackAdapter ?? adapter?.isFallbackAdapter ?? false;
  if (!adapter || adapterInfo.isFallbackAdapter || SOFTWARE_ADAPTER.test(Object.values(adapterInfo).join(' '))) {
    throw new Error('Person matte on web requires a hardware WebGPU adapter; this browser offers only a software adapter');
  }
  const device = await adapter.requestDevice({ requiredLimits: {
    maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize, maxBufferSize: adapter.limits.maxBufferSize,
    maxTextureDimension2D: adapter.limits.maxTextureDimension2D,
  } });
  return { device, adapterInfo };
}

async function runMatte(context) {
  const { request, source, emitProgress, signal } = context;
  const { input } = request;
  const isImage = input.source?.kind === 'image';
  const downsampleRatio = input.downsampleRatio ?? 0.25;
  if (!Number.isFinite(downsampleRatio) || downsampleRatio <= 0 || downsampleRatio > 1) {
    throw new Error('downsampleRatio must be greater than zero and at most one.');
  }
  const alphaEncoding = input.alphaEncoding ?? 'grayscale-png-8bit';
  if (alphaEncoding !== 'grayscale-png-8bit') throw new Error('Person matte on web writes grayscale-png-8bit alpha only');
  if ((input.outputMode ?? 'alpha-frames') !== 'alpha-frames') throw new Error('Person matte on web writes alpha frames only; foreground-video is desktop-only');
  const { width, height, frameTimes } = checkedFrames(source);
  if (frameTimes.length === 0) throw new Error('RVM requires at least one frame timestamp.');
  if (isImage && (frameTimes.length !== 1 || frameTimes[0] !== 0)) throw new Error('Image inference requires exactly one independent raster');
  if (typeof source.canvases !== 'function' || typeof context.writeOutput !== 'function') {
    throw new Error('This host cannot provide frame canvases or write matte frames');
  }
  const clock = isImage ? null : verifiedClock(source.timeline, frameTimes);

  const started = now();
  const pixels = width * height;
  await emitProgress({ step: 'loading-model', completed: 0, total: 1 });
  const { device, adapterInfo } = await requestHardwareDevice();
  let gpuError, session, texture, planarBuffer, sourceTensor, ratio, rec, result;
  device.addEventListener('uncapturederror', (event) => { gpuError ??= event.error; });
  device.lost.then((info) => { if (info.reason !== 'destroyed') gpuError ??= new Error('WebGPU device lost: ' + info.message); });
  const dispose = (tensors) => { for (const tensor of tensors ?? []) tensor?.dispose?.(); };
  try {
    if (pixels * 3 * 4 > device.limits.maxStorageBufferBindingSize) throw new Error('Source frame exceeds the WebGPU storage limit.');
    if (Math.max(width, height) > device.limits.maxTextureDimension2D) throw new Error('Source frame exceeds the WebGPU texture size limit.');
    const [moduleBytes, wasmBytes, modelBytes] = await Promise.all([
      context.download(assets.ortWebGpuModule), context.download(assets.ortWebGpuWasm), context.download(assets.rvm),
    ]);
    throwIfAborted(signal);
    const derivedBytes = padRvmModelBytes(modelBytes);
    const derivedModel = {
      sha256: await sha256Hex(derivedBytes), originalSha256: assets.rvm.sha256,
      transformVersion: TRANSFORM_VERSION, graphOptimizationLevel: GRAPH_OPTIMIZATION_LEVEL,
    };
    const ort = await context.importModule(moduleBytes);
    if (!ort?.InferenceSession || !ort?.Tensor?.fromGpuBuffer || !ort?.env?.wasm) throw new Error('ONNX Runtime Web WebGPU module is not usable');
    ort.env.wasm.wasmBinary = wasmBytes;
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    ort.env.logLevel = 'error';
    session = await ort.InferenceSession.create(derivedBytes, rvmSessionOptions(device, RVM_OUTPUTS));
    if (!RVM_INPUTS.every((name) => session.inputNames.includes(name)) || !RVM_OUTPUTS.every((name) => session.outputNames.includes(name))) {
      throw new Error('Unexpected WebGPU RVM model inputs or outputs.');
    }
    texture = device.createTexture({
      size: [width, height], format: 'rgba8unorm',
      usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    planarBuffer = device.createBuffer({ size: pixels * 3 * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
    const pipeline = device.createComputePipeline({ layout: 'auto', compute: { module: device.createShaderModule({ code: CANVAS_SHADER }), entryPoint: 'main' } });
    const bindGroup = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: texture.createView() }, { binding: 1, resource: { buffer: planarBuffer } },
    ] });
    sourceTensor = ort.Tensor.fromGpuBuffer(planarBuffer, { dataType: 'float32', dims: [1, 3, height, width] });
    ratio = new ort.Tensor('float32', new Float32Array([downsampleRatio]), [1]);
    // Recurrent state starts from zero for every job, as on desktop.
    rec = Array.from({ length: 4 }, () => new ort.Tensor('float32', new Float32Array(1), [1, 1, 1, 1]));
    const createMilliseconds = now() - started;
    const dispatch = dispatchShape(pixels, device.limits.maxComputeWorkgroupsPerDimension);
    const alphaBytes = new Uint8Array(pixels);
    const entries = [];
    let preprocessMilliseconds = 0, inferenceMilliseconds = 0, readbackMilliseconds = 0, writeMilliseconds = 0;
    await emitProgress({ step: 'inference', completed: 0, total: frameTimes.length });
    for await (const frame of source.canvases(frameTimes.map((_, index) => index))) {
      throwIfAborted(signal);
      if (gpuError) throw gpuError;
      const expected = entries.length;
      if (frame.index !== expected || frame.sourceTimeSeconds !== frameTimes[expected]) throw new Error('Source frames must arrive in the requested order');
      if (frame.canvas?.width !== width || frame.canvas?.height !== height) throw new Error('Source canvas does not match the displayed frame size');
      const preprocessBegan = now();
      device.queue.copyExternalImageToTexture({ source: frame.canvas }, { texture }, [width, height]);
      const encoder = device.createCommandEncoder(), pass = encoder.beginComputePass();
      pass.setPipeline(pipeline); pass.setBindGroup(0, bindGroup); pass.dispatchWorkgroups(...dispatch); pass.end();
      device.queue.submit([encoder.finish()]);
      preprocessMilliseconds += now() - preprocessBegan;
      const inferenceBegan = now();
      result = await session.run({ src: sourceTensor, r1i: rec[0], r2i: rec[1], r3i: rec[2], r4i: rec[3], downsample_ratio: ratio }, RVM_OUTPUTS);
      // GPU-resident outputs alone do not mean submitted work has finished.
      await device.queue.onSubmittedWorkDone();
      inferenceMilliseconds += now() - inferenceBegan;
      if (gpuError) throw gpuError;
      if (expected === 0) {
        await validateGpuFirstResult(device, result, width, height, false);
        if (gpuError) throw gpuError;
      }
      dispose(rec);
      rec = [result.r1o, result.r2o, result.r3o, result.r4o];
      const alpha = result.pha;
      result = null;
      try {
        throwIfAborted(signal);
        const readBegan = now();
        const values = await alpha.getData();
        readbackMilliseconds += now() - readBegan;
        const writeBegan = now();
        for (let p = 0; p < pixels; p++) {
          const value = values[p];
          if (!Number.isFinite(value)) throw new Error('RVM returned a non-finite alpha value.');
          alphaBytes[p] = Math.round(Math.min(1, Math.max(0, value)) * 255);
        }
        const file = 'alpha/' + String(frame.index).padStart(6, '0') + '.png';
        await context.writeOutput(file, await encodeGrayPng(width, height, alphaBytes, deflate));
        writeMilliseconds += now() - writeBegan;
        entries.push({ index: frame.index, sourceTimeSeconds: frame.sourceTimeSeconds, file });
      } finally {
        alpha.dispose?.();
      }
      await emitProgress({ step: 'inference', completed: entries.length, total: frameTimes.length });
    }
    throwIfAborted(signal);
    if (entries.length !== frameTimes.length) throw new Error('RVM decoded frame count does not match the timestamp count.');
    const diagnostics = {
      requestedProvider: 'auto', selectedProvider: 'webgpu', providerSelectionReason: 'web-webgpu-first-frame-verified',
      providerAttempts: [{ provider: 'webgpu', status: 'selected', stage: 'first-frame' }],
      observedExecutionProviders: null, providerObservation: 'hardware-webgpu-adapter-and-gpu-resident-outputs',
      backend: 'onnxruntime-web-webgpu', ortVersion: runtimeAssets.ORT_VERSION,
      webgpu: {
        adapter: adapterInfo, derivedModel, preprocessing: 'canvas-copy-external-image-rgba8-to-planar-f32',
        recurrentStateLocation: 'gpu-buffer', firstFrameFiniteValidation: 'gpu-reduction-with-one-flag-readback', kernelPlacement: 'not-profiled',
      },
      recurrentState: 'initialized-at-interval-start-and-kept-per-job',
      alphaEncoding,
    };
    return {
      files: {
        manifest: {
          name: 'matte.json', mediaType: 'application/json',
          json: {
            schemaVersion: 1, task: 'person.matte',
            ...(isImage ? { sourceKind: 'image' } : {}),
            frameSize: { width, height }, alphaEncoding,
            ...(clock ?? {}),
            frames: entries, downsampleRatio,
            model: { name: 'rvm-mobilenetv3-fp32', sha256: assets.rvm.sha256 },
            diagnostics,
          },
        },
      },
      metrics: {
        frames: entries.length, createMilliseconds, preprocessMilliseconds, inferenceMilliseconds,
        readbackMilliseconds, writeMilliseconds, totalMilliseconds: now() - started,
      },
      diagnostics,
    };
  } finally {
    if (result) dispose(Object.values(result));
    dispose(rec);
    dispose([sourceTensor, ratio]);
    texture?.destroy();
    planarBuffer?.destroy();
    try { await session?.release(); } finally { device.destroy(); }
  }
}
