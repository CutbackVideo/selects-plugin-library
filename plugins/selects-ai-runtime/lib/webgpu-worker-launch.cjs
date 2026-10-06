'use strict';

const fs = require('node:fs/promises');
const syncFs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

const JSON_LIMIT = 512 * 1024;
const ENTRYPOINT = path.resolve(__dirname, '../runtime.cjs');

function argument(argv, flag) {
  const positions = argv.flatMap((value, index) => value === flag ? [index] : []);
  if (positions.length !== 1 || typeof argv[positions[0] + 1] !== 'string'
    || !path.isAbsolute(argv[positions[0] + 1])) {
    throw new Error('Expected one absolute private worker argument: ' + flag);
  }
  return argv[positions[0] + 1];
}

async function readBoundedJson(filename) {
  const handle = await fs.open(filename, 'r');
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > JSON_LIMIT) throw new Error('Private worker JSON exceeds its file bound.');
    // A bounded read also covers a file growing after stat().
    const buffer = Buffer.alloc(JSON_LIMIT + 1);
    let length = 0;
    while (length < buffer.length) {
      const result = await handle.read(buffer, length, buffer.length - length, length);
      if (result.bytesRead === 0) break;
      length += result.bytesRead;
    }
    if (length > JSON_LIMIT) throw new Error('Private worker JSON exceeds its file bound.');
    return JSON.parse(buffer.subarray(0, length).toString('utf8'));
  } finally { await handle.close(); }
}

async function verifyNodeExecutable(settings) {
  const filename = settings?.nodeExecutable;
  if (typeof filename !== 'string' || !path.isAbsolute(filename)
    || path.basename(filename) !== 'node' || path.basename(path.dirname(filename)) !== 'bin'
    || !/^[a-f0-9]{64}$/.test(settings.nodeSha256 ?? '')) {
    throw new Error('Expected a pinned plugin-owned standalone Node executable.');
  }
  const stat = await fs.lstat(filename);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 1 || stat.size > 256 * 1024 * 1024) {
    throw new Error('Standalone Node must be a bounded regular cache file.');
  }
  const hash = crypto.createHash('sha256');
  for await (const bytes of syncFs.createReadStream(filename)) hash.update(bytes);
  if (hash.digest('hex') !== settings.nodeSha256) throw new Error('Standalone Node executable checksum mismatch.');
  return filename;
}

/** Runs only the Electron-to-standalone hop. The standalone worker cannot relaunch itself. */
async function maybeLaunchWebGpuWorker({
  argv = process.argv, environment = process.env, versions = process.versions,
  platform = process.platform, arch = process.arch, processObject = process,
  spawnChild = spawn, readJson = readBoundedJson, verifyExecutable = verifyNodeExecutable,
} = {}) {
  if (!versions.electron || platform !== 'darwin' || arch !== 'arm64') return false;
  const request = await readJson(argument(argv, '--request'));
  if (request?.task !== 'person.matte') return false;
  const config = await readJson(argument(argv, '--config'));
  if (config?.provider !== 'auto' || config.webgpu === undefined || config.enableCoreMlAuto === true) return false;
  if (!config.webgpu || typeof config.webgpu !== 'object' || Array.isArray(config.webgpu)) {
    throw new Error('Invalid standalone WebGPU worker configuration.');
  }
  const fdIndex = argv.indexOf('--event-output-fd');
  const eventFd = fdIndex === -1 ? 1 : Number(argv[fdIndex + 1]);
  if (![1, 4].includes(eventFd) || argv.filter(value => value === '--event-output-fd').length > 1) {
    throw new Error('Unsupported worker event descriptor.');
  }
  let child, stopMessage, signal, handled = false;
  const sendStop = () => {
    if (!child?.connected || !stopMessage || child.exitCode !== null || child.signalCode !== null) return;
    child.send(stopMessage, error => {
      if (error && child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
    });
  };
  const onMessage = message => {
    if (message?.type !== 'stop' || !['canceled', 'interrupted'].includes(message.cause)) return;
    stopMessage = message; sendStop();
  };
  const onDisconnect = () => { stopMessage = { type: 'stop', cause: 'interrupted' }; sendStop(); };
  const forwardSignal = value => { signal = value; if (child) child.kill(value); };
  const onTerm = () => forwardSignal('SIGTERM');
  const onInt = () => forwardSignal('SIGINT');
  processObject.on('message', onMessage);
  processObject.once('disconnect', onDisconnect);
  processObject.once('SIGTERM', onTerm);
  processObject.once('SIGINT', onInt);
  try {
    // Control messages during verification are retained for the child.
    const executable = await verifyExecutable(config.webgpu);
    const env = { ...environment };
    delete env.ELECTRON_RUN_AS_NODE;
    delete env.NODE_OPTIONS;
    child = spawnChild(executable, [ENTRYPOINT, ...argv.slice(2)], {
      env, detached: false, shell: false,
      // The child writes directly to Main's event pipe. The launcher emits no events.
      stdio: ['ignore', 'inherit', 'inherit', 'ipc', eventFd === 4 ? 4 : 'ignore'],
    });
    const outcome = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code, terminationSignal) => resolve({ code, terminationSignal }));
      if (signal) child.kill(signal);
      else sendStop();
    });
    processObject.exitCode = outcome.code ?? (outcome.terminationSignal
      ? 128 + (os.constants.signals[outcome.terminationSignal] ?? 0) : 1);
    handled = true;
    return true;
  } finally {
    processObject.removeListener('message', onMessage);
    processObject.removeListener('disconnect', onDisconnect);
    processObject.removeListener('SIGTERM', onTerm);
    processObject.removeListener('SIGINT', onInt);
    // Keep Main's IPC ownership until the sole event producer has exited.
    if (handled && processObject.connected) processObject.disconnect();
  }
}

module.exports = { maybeLaunchWebGpuWorker, readBoundedJson, verifyNodeExecutable };
