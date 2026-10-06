#!/usr/bin/env node
'use strict';
const path = require('node:path');
const fs = require('node:fs/promises');
const { writeSync } = require('node:fs');
const { readJson, writeJson, ensureEmptyDirectory } = require('./lib/files.cjs');
const { validateRequest } = require('./lib/request.cjs');
const { verifyModel } = require('./lib/models.cjs');
const { probeVideo, decodeFrames } = require('./lib/video.cjs');
const { verifyOutputs } = require('./lib/outputs.cjs');
const { throwIfAborted } = require('./lib/errors.cjs');
const { collectTool } = require('./lib/process.cjs');

function argument(name) {
  const position = process.argv.indexOf(name);
  if (position === -1 || !process.argv[position + 1]) throw new Error(`Missing ${name}`);
  return path.resolve(process.argv[position + 1]);
}

const controller = new AbortController();
let abortCause = 'canceled';
let outputDir;
let ownsOutput = false;
let finished = false;
let observedPeakRssBytes = process.memoryUsage().rss;
const eventFdPosition = process.argv.indexOf('--event-output-fd');
const eventFd = eventFdPosition === -1 ? 1 : Number(process.argv[eventFdPosition + 1]);
if (![1, 4].includes(eventFd)) throw new Error('Unsupported event output descriptor');
function emit(event) {
  observedPeakRssBytes = Math.max(observedPeakRssBytes, process.memoryUsage().rss);
  writeSync(eventFd, `${JSON.stringify({ ...event, at: new Date().toISOString() })}\n`);
}
function abort(cause) {
  if (finished) return;
  abortCause = cause;
  controller.abort();
  const backstop = setTimeout(() => process.exit(cause === 'interrupted' ? 3 : 2), 2500);
  backstop.unref();
}
async function main() {
  const began = performance.now();
  const request = validateRequest(await readJson(argument('--request')));
  const config = await readJson(argument('--config'));
  outputDir = argument('--output');
  await ensureEmptyDirectory(outputDir);
  ownsOutput = true;
  const emitProgress = progress => emit({ type: 'progress', ...progress });
  emit({ type: 'accepted', task: request.task, pid: process.pid, parentPid: process.ppid });
  emitProgress({ step: 'preparing' });
  if (!['auto', 'cpu', 'dml'].includes(config.provider ?? 'cpu')) throw new Error('Unsupported PoC execution provider');
  config.provider ??= request.task === 'person.matte' ? 'auto' : 'cpu';
  if (request.task === 'faces.detect' && config.provider !== 'cpu') throw new Error('Face detection supports only CPU');
  if (config.provider === 'dml' && process.platform !== 'win32') throw new Error('DirectML requires Windows');
  if (!Number.isInteger(config.intraOpNumThreads ?? 4) || (config.intraOpNumThreads ?? 4) < 1) throw new Error('Invalid inference thread limit');
  const model = config.models?.[request.task === 'faces.detect' ? 'yunet' : 'rvm'];
  if (model?.sha256 !== require('./runtime.json').tasks[request.task].sha256) throw new Error('Model checksum differs from the pinned task descriptor');
  await verifyModel(model);
  throwIfAborted(controller.signal);
  const ortVersion = require(path.join(config.ortModule, 'package.json')).version;
  if (ortVersion !== '1.30.0') throw new Error('PoC is pinned to onnxruntime-node 1.30.0');
  const ort = require(config.ortModule);
  const sourceStat = await fs.stat(request.input.source.path);
  if (!sourceStat.isFile()) throw new Error('Source is not a regular file');
  const toolVersions = await Promise.all(['ffmpeg', 'ffprobe'].map(async name => {
    const version = await collectTool(config.tools[name], ['-version'], { signal: controller.signal, limit: 256 * 1024 });
    return [name, version.split('\n')[0]];
  }));
  const prepareMs = performance.now() - began;
  const probeBegan = performance.now();
  const video = await probeVideo(config, request, controller.signal);
  const probeMs = performance.now() - probeBegan;
  const decoderMetrics = { decoderWaitMs: 0, decodedFrames: 0 };
  const memorySampler = setInterval(() => { observedPeakRssBytes = Math.max(observedPeakRssBytes, process.memoryUsage().rss); }, 50);
  memorySampler.unref();
  let result;
  try {
    const context = {
      request, config, outputDir, ort, video, emitProgress, signal: controller.signal,
      frames: () => decodeFrames(config, request, video, controller.signal, emitProgress, decoderMetrics,
        { reuseFrameBuffer: request.task === 'person.matte' }),
    };
    const run = request.task === 'faces.detect' ? require('./tasks/faces-detect.cjs').runFaces : require('./tasks/person-matte.cjs').runMatte;
    result = await run(context);
    throwIfAborted(controller.signal);
    emitProgress({ step: 'validating-output' });
    await verifyOutputs(outputDir, request, result, video);
  } finally {
    clearInterval(memorySampler);
  }
  const finalSourceStat = await fs.stat(request.input.source.path);
  if (finalSourceStat.size !== sourceStat.size || finalSourceStat.mtimeMs !== sourceStat.mtimeMs) throw new Error('Source changed during execution');
  throwIfAborted(controller.signal);
  observedPeakRssBytes = Math.max(observedPeakRssBytes, process.memoryUsage().rss);
  const summary = {
    contractVersion: 1, task: request.task, status: 'succeeded', files: result.files,
    metrics: { ...result.metrics, ...decoderMetrics, prepareMs, probeMs, totalMs: performance.now() - began, observedPeakRssBytes },
    diagnostics: {
      ...result.diagnostics, node: process.versions.node, electron: process.versions.electron ?? null,
      platform: process.platform, arch: process.arch, ortVersion, requestedProvider: config.provider,
      modelSha256: model.sha256, timestampOriginSeconds: video.timestampOriginSeconds,
      tools: Object.fromEntries(toolVersions), decoderPixelFormat: 'rgb24', colorConversion: 'ffmpeg-default',
      sourceSampleAspectRatio: video.sourceSampleAspectRatio, pixelAspectRatioPolicy: video.pixelAspectRatioPolicy,
      source: { byteSize: sourceStat.size, modificationTimeMs: sourceStat.mtimeMs },
    },
  };
  await writeJson(path.join(outputDir, 'result.json'), summary);
  throwIfAborted(controller.signal);
  await writeJson(path.join(outputDir, 'worker-state.json'), { status: 'succeeded' });
  throwIfAborted(controller.signal);
  emit({ type: 'result', result: summary });
}

async function runEntry() {
  if (await require('./lib/webgpu-worker-launch.cjs').maybeLaunchWebGpuWorker()) return;
  process.once('SIGTERM', () => abort('canceled'));
  process.once('SIGINT', () => abort('canceled'));
  process.once('disconnect', () => abort('interrupted'));
  process.on('message', message => {
    if (message?.type === 'stop' && ['canceled', 'interrupted'].includes(message.cause)) abort(message.cause);
  });
  await main();
  finished = true;
  if (process.connected) process.disconnect();
}

runEntry().catch(async error => {
  const status = controller.signal.aborted ? abortCause : 'failed';
  const failure = { status, error: { code: status === 'interrupted' ? 'JOB_INTERRUPTED' : error.code ?? (status === 'failed' ? 'RUNTIME_FAILED' : 'JOB_CANCELED'), message: error.message } };
  if (ownsOutput) await fs.rm(path.join(outputDir, 'result.json'), { force: true }).catch(() => {});
  if (ownsOutput) await writeJson(path.join(outputDir, 'worker-state.json'), failure).catch(() => {});
  emit({ type: 'error', ...failure });
  process.exitCode = status === 'failed' ? 1 : status === 'interrupted' ? 3 : 2;
  finished = true;
  if (process.connected) process.disconnect();
});
