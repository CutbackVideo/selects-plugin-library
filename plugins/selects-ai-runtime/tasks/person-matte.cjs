'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { writeGrayPng } = require('../lib/png.cjs');
const { startAvifFrames } = require('../lib/avif.cjs');
const { writeJson } = require('../lib/files.cjs');
const { throwIfAborted } = require('../lib/errors.cjs');
const { startForegroundVideo } = require('../lib/foreground-video.cjs');
const { selectMatteSession, validateMatteFirstResult, readMattePlacement } = require('../lib/matte-provider.cjs');
const { createWebGpuMatte } = require('../lib/webgpu-matte.cjs');

const INPUTS = ['src', 'r1i', 'r2i', 'r3i', 'r4i', 'downsample_ratio'];
const OUTPUTS = ['pha', 'r1o', 'r2o', 'r3o', 'r4o'];

function dispose(tensors) {
  for (const tensor of tensors) tensor?.dispose?.();
}

async function runMatte(context, dependencies = {}) {
  const { request, config, outputDir, ort, video, frames, emitProgress, signal } = context;
  const { width, height, frameTimes } = video;
  const pixels = width * height;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error('RVM requires positive integer display-frame dimensions.');
  }
  if (!Array.isArray(frameTimes) || frameTimes.length === 0) throw new Error('RVM requires at least one frame timestamp.');
  const downsampleRatio = request.input.downsampleRatio ?? 0.25;
  if (!Number.isFinite(downsampleRatio) || downsampleRatio <= 0 || downsampleRatio > 1) {
    throw new Error('downsampleRatio must be greater than zero and at most one.');
  }
  const model = config.models?.rvm;
  if (!model?.path) throw new Error('The configured RVM model is missing.');
  const wantsForeground = request.input.outputMode === 'foreground-video';
  const alphaEncoding = request.input.alphaEncoding ?? 'grayscale-png-8bit';
  if (!['grayscale-png-8bit', 'grayscale-avif-8bit'].includes(alphaEncoding)) throw new Error('Unsupported alpha encoding');
  if (wantsForeground && !video.constantFrameRate) throw new Error('Foreground video requires verified constant-frame-rate source timestamps; alpha-frames still supports VFR');
  const outputs = wantsForeground ? [...OUTPUTS, 'fgr'] : OUTPUTS;
  const alphaDir = path.join(outputDir, 'alpha');
  throwIfAborted(signal);
  await fs.mkdir(alphaDir, { recursive: true });
  const started = performance.now();
  let selection, session, webgpu, profileEnded = false;
  let createMilliseconds = 0, profileDir = null;
  const iterator = (await frames())[Symbol.asyncIterator]();
  let rec = Array.from({ length: 4 }, () => new ort.Tensor('float32', new Float32Array(1), [1, 1, 1, 1]));
  const ratio = new ort.Tensor('float32', new Float32Array([downsampleRatio]), [1]);
  const src = new Float32Array(pixels * 3);
  const alphaBytes = Buffer.alloc(pixels);
  const entries = [];
  let preprocessMilliseconds = 0, inferenceMilliseconds = 0, readbackMilliseconds = 0, writeMilliseconds = 0;
  let previousTimestamp = -Infinity;
  let foregroundWriter;
  let avifWriter;
  try {
    const first = await iterator.next();
    if (first.done) throw new Error('RVM source contains no frames.');
    function prepare(frame, convert = true) {
      throwIfAborted(signal);
      if (frame.index !== entries.length) throw new Error('RVM frames must be contiguous and ordered from index zero.');
      if (!Number.isFinite(frame.sourceTimeSeconds) || frame.sourceTimeSeconds <= previousTimestamp) throw new Error('RVM source timestamps must be finite and strictly increasing.');
      if (frame.index >= frameTimes.length || !Number.isFinite(frameTimes[frame.index]) || Math.abs(frameTimes[frame.index] - frame.sourceTimeSeconds) > 0.000001) throw new Error('Decoded RVM frame timestamps do not match the probed frame timestamps.');
      if (!Buffer.isBuffer(frame.rgb) || frame.rgb.length !== pixels * 3) throw new Error('Decoded RVM frame does not match the display size and RGB24 layout.');
      if (!convert) return;
      const began = performance.now();
      for (let p = 0, q = 0; p < pixels; p++, q += 3) {
        src[p] = frame.rgb[q] / 255;
        src[pixels + p] = frame.rgb[q + 1] / 255;
        src[2 * pixels + p] = frame.rgb[q + 2] / 255;
      }
      preprocessMilliseconds += performance.now() - began;
    }
    async function infer(target) {
      if (!INPUTS.every(name => target.inputNames.includes(name)) || !outputs.every(name => target.outputNames.includes(name))) throw new Error('The configured model does not have the expected RVM inputs and outputs.');
      const source = new ort.Tensor('float32', src, [1, 3, height, width]);
      try { return await target.run({ src: source, r1i: rec[0], r2i: rec[1], r3i: rec[2], r4i: rec[3], downsample_ratio: ratio }, outputs); }
      finally { source.dispose?.(); }
    }
    const wantsWebGpu = (dependencies.platform ?? process.platform) === 'darwin' && config.webgpu
      && (config.provider ?? 'cpu') === 'auto' && config.enableCoreMlAuto !== true;
    prepare(first.value, !wantsWebGpu);
    let gpuFailure;
    if (wantsWebGpu) {
      let firstResult, stage = 'create';
      const began = performance.now();
      emitProgress?.({ step: 'selecting-provider', requestedProvider: 'auto', candidateProvider: 'webgpu' });
      try {
        webgpu = await (dependencies.createWebGpuMatte ?? createWebGpuMatte)({ config, model, width, height, downsampleRatio, wantsForeground, signal });
        stage = 'first-frame'; const inferBegan = performance.now();
        firstResult = await webgpu.run(first.value.rgb);
        const inference = webgpu.lastInferenceMilliseconds ?? performance.now() - inferBegan;
        stage = 'output'; await webgpu.validateFirst(firstResult); throwIfAborted(signal);
        selection = { session: webgpu.session, firstResult, requestedProvider: 'auto', selectedProvider: 'webgpu',
          providerSelectionReason: 'auto-webgpu-first-frame-verified', attempts: [{ provider: 'webgpu', status: 'selected', stage: 'first-frame' }],
          createMilliseconds: webgpu.createMilliseconds, inferenceMilliseconds: inference,
          options: {}, profileDir: null, profileEnded: false, profileScope: null, placement: null };
      } catch (error) {
        for (const tensor of new Set(Object.values(firstResult ?? {}))) tensor?.dispose?.();
        await webgpu?.release(); webgpu = null; throwIfAborted(signal);
        gpuFailure = { provider: 'webgpu', status: 'rejected', stage, message: String(error.message).slice(0, 2048), milliseconds: performance.now() - began };
        prepare(first.value);
      }
    }
    if (!selection) {
      selection = await selectMatteSession({ config: gpuFailure ? { ...config, provider: 'cpu' } : config, ort, model, outputDir, signal, platform: dependencies.platform,
        runFirstFrame: infer, validateFirstFrame: result => validateMatteFirstResult(result, width, height, wantsForeground), emitProgress });
      if (gpuFailure) {
        selection.requestedProvider = 'auto'; selection.providerSelectionReason = 'auto-webgpu-initial-' + gpuFailure.stage + '-failed';
        selection.attempts.unshift(gpuFailure);
      } else if (config.webgpuPreparationFailure && (config.provider ?? 'cpu') === 'auto') {
        selection.providerSelectionReason = 'auto-webgpu-dependency-preparation-failed';
        selection.attempts.unshift({ provider: 'webgpu', status: 'rejected', stage: 'prepare', message: config.webgpuPreparationFailure });
      }
    }
    ({ session, createMilliseconds, profileDir, profileEnded } = selection);
    inferenceMilliseconds = selection.inferenceMilliseconds;
    if (wantsForeground) foregroundWriter = startForegroundVideo({ config, video, outputDir, signal, emitProgress });
    if (alphaEncoding === 'grayscale-avif-8bit') avifWriter = startAvifFrames({ config, width, height, outputDir, signal, emitProgress });
    let current = first;
    while (!current.done) {
      const frame = current.value;
      let result;
      if (entries.length === 0) { result = selection.firstResult; selection.firstResult = null; }
      else {
        prepare(frame, !webgpu);
        const began = performance.now();
        result = webgpu ? await webgpu.run(frame.rgb, rec) : await infer(session);
        inferenceMilliseconds += webgpu ? webgpu.lastInferenceMilliseconds ?? performance.now() - began : performance.now() - began;
      }
      dispose(rec);
      rec = [result.r1o, result.r2o, result.r3o, result.r4o];
      try {
        throwIfAborted(signal);
        const alpha = result.pha;
        if (alpha.type !== 'float32' || alpha.dims.join(',') !== [1, 1, height, width].join(',')) {
          throw new Error('RVM alpha output does not match the full display-frame size.');
        }
        const readBegan = performance.now();
        if (webgpu) { await alpha.getData(); if (result.fgr) await result.fgr.getData(); }
        readbackMilliseconds += performance.now() - readBegan;
        throwIfAborted(signal);
        const t = performance.now();
        const values = alpha.data;
        for (let p = 0; p < pixels; p++) {
          const value = values[p];
          if (!Number.isFinite(value)) throw new Error('RVM returned a non-finite alpha value.');
          alphaBytes[p] = Math.round(Math.min(1, Math.max(0, value)) * 255);
        }
        const file = avifWriter ? await avifWriter.write(alphaBytes)
          : 'alpha/' + String(frame.index).padStart(6, '0') + '.png';
        if (!avifWriter) await writeGrayPng(path.join(outputDir, ...file.split('/')), width, height, alphaBytes);
        if (foregroundWriter) await foregroundWriter.write(result.fgr, alphaBytes);
        writeMilliseconds += performance.now() - t;
        entries.push({ index: frame.index, sourceTimeSeconds: frame.sourceTimeSeconds, file });
        previousTimestamp = frame.sourceTimeSeconds;
        emitProgress?.({ step: 'inference', completed: entries.length, total: frameTimes.length });
      } finally {
        result.pha.dispose?.();
        result.fgr?.dispose?.();
      }
      current = await iterator.next();
    }
    throwIfAborted(signal);
    if (entries.length !== frameTimes.length) throw new Error('RVM decoded frame count does not match the timestamp count.');
    if (avifWriter) {
      emitProgress?.({ step: 'encoding-masks', completed: entries.length, total: entries.length });
      const encodingStarted = performance.now();
      await avifWriter.finish();
      writeMilliseconds += performance.now() - encodingStarted;
    }
    let foregroundVideo;
    if (foregroundWriter) {
      emitProgress?.({ step: 'encoding-foreground', completed: entries.length, total: entries.length });
      foregroundVideo = await foregroundWriter.finish();
    }
    let placement = selection.placement;
    if (profileDir && !profileEnded) {
      session.endProfiling();
      profileEnded = true;
      placement = await readMattePlacement(profileDir, selection.profilePrefix);
    }
    const observedExecutionProviders = placement
      ? Object.keys(placement.providers).sort()
      : selection.selectedProvider === 'cpu' ? ['CPUExecutionProvider'] : null;
    const diagnostics = {
      requestedProvider: selection.requestedProvider, selectedProvider: selection.selectedProvider,
      providerSelectionReason: selection.providerSelectionReason, providerAttempts: selection.attempts,
      observedExecutionProviders,
      providerObservation: profileDir ? 'onnx-runtime-kernel-profile' : selection.selectedProvider === 'cpu' ? 'cpu-only-session' : 'not-profiled',
      profileScope: selection.profileScope,
      ...(selection.selectedProvider === 'coreml' ? { coreMlFlags: 0x32, coreMlComputeUnits: 'CPUAndGPU', physicalGpuObservation: 'not-observed-by-ort-profile' } : {}),
      ...(selection.selectedProvider === 'dml' ? { deviceId: config.deviceId ?? 0 } : {}),
      ...(webgpu ? { webgpu: { backend: 'metal', adapter: webgpu.adapterInfo, derivedModel: webgpu.derivedModel,
        preprocessing: 'rgb24-to-planar-float32-gpu-shader', recurrentStateLocation: 'gpu-buffer',
        firstFrameFiniteValidation: 'gpu-reduction-with-one-flag-readback', kernelPlacement: 'not-profiled' } } : {}),
      intraOpNumThreads: selection.options.intraOpNumThreads,
      ...(placement ? { kernelProfile: placement.providers, profileFiles: placement.profileFiles } : {}),
      recurrentState: 'initialized-at-interval-start-and-kept-per-job',
      alphaEncoding,
      ...(avifWriter ? { maskEncoder: avifWriter.encoderSettings } : {}),
    };
    if (webgpu) diagnostics.providerObservation = 'hardware-webgpu-adapter-and-gpu-resident-outputs';
    if (profileDir && observedExecutionProviders.length === 0) {
      diagnostics.warning = 'ONNX Runtime did not produce kernel provider observations; GPU execution is unverified.';
    } else if (selection.selectedProvider !== 'cpu' && observedExecutionProviders?.includes('CPUExecutionProvider')) {
      diagnostics.warning = 'ONNX Runtime assigned some kernels to CPU. See kernelProfile for observed placement.';
    }
    const manifest = {
      schemaVersion: 1,
      task: 'person.matte',
      frameSize: { width, height },
      alphaEncoding,
      ...(video.constantFrameRate && video.sourceRange ? {
        sourceFrameRate: video.constantFrameRate,
        sourceRange: video.sourceRange,
      } : {}),
      ...(foregroundVideo ? { foregroundVideo } : {}),
      frames: entries,
      downsampleRatio,
      model: { name: 'rvm-mobilenetv3-fp32', ...(model.sha256 ? { sha256: model.sha256 } : {}) },
      diagnostics,
    };
    await writeJson(path.join(outputDir, 'matte.json'), manifest);
    return {
      files: { manifest: 'matte.json', ...(foregroundVideo ? { foreground: 'foreground.mov' } : {}) },
      metrics: { frames: entries.length, createMilliseconds, preprocessMilliseconds: webgpu ? webgpu.preprocessMilliseconds : preprocessMilliseconds,
        inferenceMilliseconds, readbackMilliseconds, writeMilliseconds, totalMilliseconds: performance.now() - started },
      diagnostics,
    };
  } finally {
    try {
      if (session && profileDir && !profileEnded) session.endProfiling();
    } finally {
      try { await foregroundWriter?.dispose(); }
      finally {
        try { await avifWriter?.dispose(); }
        finally {
          if (selection?.firstResult && entries.length === 0) dispose([selection.firstResult.pha, selection.firstResult.fgr, selection.firstResult.r1o, selection.firstResult.r2o, selection.firstResult.r3o, selection.firstResult.r4o]);
          dispose([...rec, ratio]);
          try { if (webgpu) await webgpu.release(); else await session?.release(); } finally { await iterator.return?.(); }
        }
      }
    }
  }
}

module.exports = { runMatte };
