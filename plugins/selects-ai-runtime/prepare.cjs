#!/usr/bin/env node
'use strict';
const path = require('node:path');
const fs = require('node:fs/promises');
const { MODELS, ORT_VERSION } = require('./lib/runtime-assets.cjs');
const { downloadAsset } = require('./lib/runtime-download.cjs');
const { prepareEnvironment } = require('./lib/runtime-environment.cjs');
const { writeJson } = require('./lib/files.cjs');
const { collectTool } = require('./lib/process.cjs');
const { ensureCacheDirectory } = require('./lib/runtime-cache.cjs');
const { resolveRuntimeTool } = require('./lib/runtime-tools.cjs');
const { createVerifiedModelSession } = require('./lib/models.cjs');

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}`);
  return process.argv[index + 1];
}
const controller = new AbortController();
let finished = false;
function abort() {
  if (finished) return;
  controller.abort(new Error('Runtime preparation canceled'));
  const backstop = setTimeout(() => process.exit(2), 2500); backstop.unref();
}
process.once('SIGTERM', abort);
process.once('SIGINT', abort);
process.once('disconnect', abort);
process.on('message', message => { if (message?.type === 'stop') abort(); });
function emit(progress) { process.stdout.write(`${JSON.stringify({ type: 'progress', ...progress })}\n`); }

async function main() {
  const task = argument('--task'), model = MODELS[task];
  if (!model) throw new Error('Unsupported runtime task');
  const cache = path.resolve(argument('--cache'));
  await fs.mkdir(cache, { recursive: true });
  const stat = await fs.lstat(cache);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Invalid runtime cache');
  const ortModule = await prepareEnvironment(cache, `${process.platform}-${process.arch}`, { signal: controller.signal, emit });
  await ensureCacheDirectory(cache, 'models');
  const modelPath = await downloadAsset(model, path.join(cache, 'models', `${model.sha256}.onnx`), { signal: controller.signal, emit, step: 'download-model' });
  controller.signal.throwIfAborted();
  emit({ step: 'verify-runtime' });
  let ort;
  try { ort = require(ortModule); }
  catch (error) {
    error.message = `ONNX native module could not load on ${process.platform}/${process.arch}: ${error.message}` +
      (process.platform === 'win32' ? '. The pinned Windows build requires Microsoft Visual C++ 2019-or-newer x64 runtime (MSVCP140, MSVCP140_1, MSVCP140_ATOMIC_WAIT, VCRUNTIME140 and VCRUNTIME140_1 DLLs).' : '');
    throw error;
  }
  if (require(path.join(ortModule, 'package.json')).version !== ORT_VERSION) throw new Error('Unexpected ONNX Runtime version');
  const session = await createVerifiedModelSession(ort, { path: modelPath, sha256: model.sha256 }, { executionProviders: ['cpu'], intraOpNumThreads: 4 });
  await session.release();
  controller.signal.throwIfAborted();
  const tools = { ffmpeg: await resolveRuntimeTool(argument('--ffmpeg')), ffprobe: await resolveRuntimeTool(argument('--ffprobe')) };
  for (const executable of Object.values(tools)) await collectTool(executable, ['-version'], { signal: controller.signal, limit: 256 * 1024 });
  let webgpu, webgpuPreparationFailure;
  if (task === 'person.matte' && process.platform === 'darwin' && process.arch === 'arm64') {
    try { webgpu = await require('./lib/webgpu-environment.cjs').prepareWebGpuEnvironment(cache, { signal: controller.signal, emit }); }
    catch (error) {
      controller.signal.throwIfAborted();
      webgpuPreparationFailure = String(error.message).slice(0, 2048);
      emit({ step: 'gpu-backend-unavailable' });
    }
  }
  controller.signal.throwIfAborted();
  await writeJson(path.resolve(argument('--output')), {
    ortModule, tools, models: { [model.name]: { path: modelPath, sha256: model.sha256 } }, provider: 'cpu', intraOpNumThreads: 4,
    ...(webgpu ? { webgpu } : {}),
    ...(webgpuPreparationFailure ? { webgpuPreparationFailure } : {}),
  });
  controller.signal.throwIfAborted();
  emit({ step: 'ready' });
}
if (require.main === module) main().then(() => {
  finished = true; if (process.connected) process.disconnect();
}).catch(error => {
  process.stdout.write(`${JSON.stringify({ type: 'error', message: error.message })}\n`);
  process.exitCode = controller.signal.aborted ? 2 : 1;
  finished = true; if (process.connected) process.disconnect();
});
