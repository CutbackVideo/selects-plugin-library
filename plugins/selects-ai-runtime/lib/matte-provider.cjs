'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { createVerifiedModelSession } = require('./models.cjs');
const { throwIfAborted } = require('./errors.cjs');

function matteSessionOptions(config, provider, profilePrefix) {
  const threads = config.intraOpNumThreads ?? 4, deviceId = config.deviceId ?? 0;
  if (!Number.isInteger(threads) || threads < 1 || threads > 64) throw new Error('intraOpNumThreads must be an integer from 1 to 64.');
  if (!Number.isInteger(deviceId) || deviceId < 0) throw new Error('deviceId must be a non-negative integer.');
  return {
    // CoreML flags: MLProgram (0x10), CPUAndGPU (0x20), subgraphs (0x02).
    executionProviders: provider === 'cpu' ? ['cpu'] : provider === 'coreml'
      ? [{ name: 'coreml', coreMlFlags: 0x32 }] : [{ name: 'dml', deviceId }],
    graphOptimizationLevel: 'all', executionMode: 'sequential',
    ...(provider === 'dml' ? { enableMemPattern: false } : {}),
    intraOpNumThreads: threads, interOpNumThreads: 1, logSeverityLevel: 3,
    ...(profilePrefix ? { enableProfiling: true, profileFilePrefix: profilePrefix } : {}),
  };
}

function disposeResult(result) {
  for (const tensor of new Set(Object.values(result ?? {}))) tensor?.dispose?.();
}

function validateMatteFirstResult(result, width, height, wantsForeground) {
  const fixed = { pha: [1, 1, height, width], ...(wantsForeground ? { fgr: [1, 3, height, width] } : {}) };
  for (const name of [...Object.keys(fixed), 'r1o', 'r2o', 'r3o', 'r4o']) {
    const tensor = result?.[name], dims = tensor?.dims;
    if (tensor?.type !== 'float32' || !Array.isArray(dims) || dims.length !== 4 || dims[0] !== 1
      || dims.some(size => !Number.isSafeInteger(size) || size < 1)
      || (fixed[name] && dims.join(',') !== fixed[name].join(','))
      || tensor.data?.length !== dims.reduce((a, b) => a * b, 1)) {
      throw new Error('RVM first-frame ' + name + ' output does not match its tensor contract.');
    }
    for (const value of tensor.data) if (!Number.isFinite(value)) throw new Error('RVM first-frame output contains a non-finite value.');
  }
}

async function readMattePlacement(profileDir, prefix) {
  const files = (await fs.readdir(profileDir)).filter(name => name.startsWith(prefix + '_') && name.endsWith('.json'));
  const providers = {};
  if (files.length > 8) throw new Error('Unexpected RVM profiling file count');
  for (const file of files) {
    const filename = path.join(profileDir, file);
    if ((await fs.stat(filename)).size > 32 * 1024 * 1024) throw new Error('RVM profiling metadata exceeds the bound');
    const events = JSON.parse(await fs.readFile(filename, 'utf8'));
    if (!Array.isArray(events) || events.length > 200000) throw new Error('Invalid RVM profiling events');
    for (const event of events) {
      if (event.cat !== 'Node' || !event.name?.endsWith('_kernel_time') || typeof event.args?.provider !== 'string') continue;
      const name = event.args.provider;
      providers[name] ||= { kernelEvents: 0, durationMilliseconds: 0 };
      providers[name].kernelEvents++;
      providers[name].durationMilliseconds += Number(event.dur || 0) / 1000;
    }
  }
  for (const provider of Object.values(providers)) provider.durationMilliseconds = Number(provider.durationMilliseconds.toFixed(3));
  return { providers, profileFiles: files.map(file => 'profiling/' + file) };
}

/** Auto changes provider only before the first source frame is accepted. */
async function selectMatteSession({ config, ort, model, outputDir, signal, runFirstFrame, validateFirstFrame,
  platform = process.platform, createSession = createVerifiedModelSession, emitProgress }) {
  const requestedProvider = config.provider ?? 'cpu';
  if (!['auto', 'cpu', 'dml'].includes(requestedProvider)) throw new Error('RVM supports auto, cpu or dml.');
  if (requestedProvider === 'dml' && platform !== 'win32') throw new Error('DirectML requires Windows. CPU was not substituted.');
  const backendAvailable = name => typeof ort.listSupportedBackends !== 'function'
    || ort.listSupportedBackends().some(backend => backend.name === name);
  const candidate = platform === 'win32' ? 'dml' : platform === 'darwin' ? 'coreml' : null;
  // The measured Mac path is slower and uses substantially more memory.
  // Keep it an explicit runtime-config experiment until its cost improves.
  const coreMlDisabled = candidate === 'coreml' && config.enableCoreMlAuto !== true;
  const autoGpu = requestedProvider === 'auto' && candidate && !coreMlDisabled && backendAvailable(candidate);
  let selectedProvider = requestedProvider === 'auto' ? autoGpu ? candidate : 'cpu' : requestedProvider;
  let reason = requestedProvider === 'auto' ? autoGpu ? 'auto-' + candidate + '-first-frame-verified'
    : coreMlDisabled ? 'auto-coreml-experiment-disabled' : 'auto-compatible-gpu-backend-unavailable' : 'explicit-' + selectedProvider;
  // Validate configuration before a GPU error can be treated as compatibility fallback.
  matteSessionOptions(config, selectedProvider);
  const attempts = [];
  let createMilliseconds = 0, inferenceMilliseconds = 0;
  while (true) {
    throwIfAborted(signal);
    const prefix = requestedProvider === 'auto' ? 'rvm_auto_' + selectedProvider : 'rvm';
    const profiling = selectedProvider !== 'cpu' && requestedProvider === 'auto' || config.profile;
    const profileDir = profiling ? path.join(outputDir, 'profiling') : null;
    if (profileDir) await fs.mkdir(profileDir, { recursive: true });
    const options = matteSessionOptions(config, selectedProvider, profileDir && path.join(profileDir, prefix));
    let session, firstResult, profileEnded = false, placement = null, stage = 'create';
    try {
      if (!backendAvailable(selectedProvider)) throw new Error('The installed ONNX Runtime does not support ' + selectedProvider + '.');
      emitProgress?.({ step: 'selecting-provider', requestedProvider, candidateProvider: selectedProvider });
      let began = performance.now();
      try { session = await createSession(ort, model, options); }
      finally { createMilliseconds += performance.now() - began; }
      throwIfAborted(signal);
      stage = 'first-frame';
      began = performance.now();
      try { firstResult = await runFirstFrame(session); }
      finally { inferenceMilliseconds += performance.now() - began; }
      throwIfAborted(signal);
      stage = 'output';
      validateFirstFrame(firstResult);
      if (selectedProvider !== 'cpu' && requestedProvider === 'auto') {
        stage = 'profile';
        session.endProfiling(); profileEnded = true;
        placement = await readMattePlacement(profileDir, prefix);
        const expected = selectedProvider === 'dml' ? 'DmlExecutionProvider' : 'CoreMLExecutionProvider';
        if (!(placement.providers[expected]?.kernelEvents > 0)) throw new Error('First-frame profile did not verify ' + selectedProvider + ' kernel execution.');
      }
      throwIfAborted(signal);
      attempts.push({ provider: selectedProvider, status: 'selected', stage: 'first-frame' });
      return { session, firstResult, options, requestedProvider, selectedProvider, providerSelectionReason: reason,
        attempts, createMilliseconds, inferenceMilliseconds, profileDir, profilePrefix: prefix, profileEnded, placement,
        profileScope: placement ? 'first-source-frame' : profiling ? 'whole-job' : null };
    } catch (error) {
      disposeResult(firstResult);
      if (session) {
        if (profileDir && !profileEnded) { try { session.endProfiling(); } catch { /* Failed probe has no successful profile claim. */ } }
        await session.release();
      }
      throwIfAborted(signal);
      if (requestedProvider !== 'auto' || selectedProvider === 'cpu' || error.code === 'JOB_CANCELED' || error.name === 'AbortError') throw error;
      attempts.push({ provider: selectedProvider, status: 'rejected', stage, message: String(error.message).slice(0, 2048) });
      reason = 'auto-' + selectedProvider + '-initial-' + stage + '-failed';
      selectedProvider = 'cpu';
      emitProgress?.({ step: 'selecting-provider', requestedProvider, candidateProvider: 'cpu', providerSelectionReason: reason });
    }
  }
}

module.exports = { matteSessionOptions, selectMatteSession, validateMatteFirstResult, readMattePlacement, disposeResult };
