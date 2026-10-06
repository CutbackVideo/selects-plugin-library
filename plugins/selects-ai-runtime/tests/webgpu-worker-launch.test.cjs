'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { maybeLaunchWebGpuWorker, readBoundedJson, verifyNodeExecutable } = require('../lib/webgpu-worker-launch.cjs');

class Parent extends EventEmitter {
  connected = true;
  disconnects = 0;
  disconnect() { this.disconnects++; this.connected = false; this.emit('disconnect'); }
}
class Child extends EventEmitter {
  connected = true;
  exitCode = null;
  signalCode = null;
  sends = [];
  kills = [];
  send(message, callback) { this.sends.push(message); callback?.(null); }
  kill(signal) { this.kills.push(signal); return true; }
  finish(code, signal = null) { this.exitCode = code; this.signalCode = signal; this.connected = false; this.emit('exit', code, signal); }
}
function rig(changes = {}) {
  const parent = new Parent(), child = new Child(), spawns = [];
  const request = { task: 'person.matte' };
  const config = { provider: 'auto', webgpu: { nodeExecutable: '/owned/cache/bin/node', nodeSha256: 'a'.repeat(64) } };
  let started;
  const spawned = new Promise(resolve => { started = resolve; });
  const options = {
    argv: ['/electron', '/plugin/runtime.cjs', '--request', '/private/request.json', '--config', '/private/config.json', '--output', '/private/out', '--event-output-fd', '4'],
    environment: { ELECTRON_RUN_AS_NODE: '1', NODE_OPTIONS: '--require unsafe.cjs', PATH: '/existing/path', OTHER: 'kept' },
    versions: { electron: '43.2.0' }, platform: 'darwin', arch: 'arm64', processObject: parent,
    readJson: async filename => filename.includes('request') ? request : config,
    verifyExecutable: async settings => settings.nodeExecutable,
    spawnChild: (executable, args, settings) => { spawns.push({ executable, args, settings }); started(); return child; },
    ...changes,
  };
  return { parent, child, spawns, request, config, options, spawned };
}
function assertClean(parent) {
  for (const event of ['message', 'disconnect', 'SIGTERM', 'SIGINT']) assert.equal(parent.listenerCount(event), 0, event);
}

test('routes only an Electron Mac arm64 auto matte with configured standalone runtime', async () => {
  for (const change of [
    { versions: {} }, { platform: 'win32' }, { arch: 'x64' },
    { readJson: async () => ({ task: 'faces.detect' }) },
    { readJson: async filename => filename.includes('request') ? { task: 'person.matte' } : { provider: 'cpu', webgpu: null } },
    { readJson: async filename => filename.includes('request') ? { task: 'person.matte' } : { provider: 'auto' } },
  ]) {
    const r = rig(change);
    assert.equal(await maybeLaunchWebGpuWorker(r.options), false);
    assert.equal(r.spawns.length, 0); assert.equal(r.parent.disconnects, 0); assertClean(r.parent);
  }
});

test('preserves argv, Main fd4 and process group while removing Electron/Node injection variables', async () => {
  const r = rig(), task = maybeLaunchWebGpuWorker(r.options);
  await r.spawned;
  assert.equal(r.spawns.length, 1);
  const { executable, args, settings } = r.spawns[0];
  assert.equal(executable, r.config.webgpu.nodeExecutable);
  assert.equal(args[0], path.resolve(__dirname, '../runtime.cjs'));
  assert.deepEqual(args.slice(1), r.options.argv.slice(2));
  assert.deepEqual(settings.stdio, ['ignore', 'inherit', 'inherit', 'ipc', 4]);
  assert.equal(settings.shell, false); assert.equal(settings.detached, false);
  assert.deepEqual(settings.env, { PATH: '/existing/path', OTHER: 'kept' });
  assert.equal(r.options.environment.ELECTRON_RUN_AS_NODE, '1');
  assert.equal(r.parent.disconnects, 0);
  r.child.finish(0);
  assert.equal(await task, true); assert.equal(r.parent.exitCode, 0);
  assert.equal(r.parent.disconnects, 1); assertClean(r.parent);
});

test('forwards valid stop IPC and waits for child exit before releasing ownership', async () => {
  const r = rig(), task = maybeLaunchWebGpuWorker(r.options); await r.spawned;
  const message = { type: 'stop', cause: 'canceled' };
  r.parent.emit('message', { type: 'stop', cause: 'other' });
  r.parent.emit('message', message);
  assert.deepEqual(r.child.sends, [message]); assert.equal(r.parent.disconnects, 0);
  r.child.finish(2);
  assert.equal(await task, true); assert.equal(r.parent.exitCode, 2); assertClean(r.parent);
});

test('retains a cancellation arriving while executable integrity is checked', async () => {
  let verifyStarted, continueVerify;
  const checking = new Promise(resolve => { verifyStarted = resolve; });
  const proceed = new Promise(resolve => { continueVerify = resolve; });
  const r = rig({ verifyExecutable: async settings => { verifyStarted(); await proceed; return settings.nodeExecutable; } });
  const task = maybeLaunchWebGpuWorker(r.options); await checking;
  const stop = { type: 'stop', cause: 'canceled' };
  r.parent.emit('message', stop); continueVerify(); await r.spawned;
  assert.deepEqual(r.child.sends, [stop]);
  r.child.finish(2); assert.equal(await task, true); assertClean(r.parent);
});

test('upstream disconnect forwards interrupted without replacing a running worker', async () => {
  const r = rig(), task = maybeLaunchWebGpuWorker(r.options); await r.spawned;
  r.parent.connected = false; r.parent.emit('disconnect');
  assert.deepEqual(r.child.sends, [{ type: 'stop', cause: 'interrupted' }]);
  assert.equal(r.spawns.length, 1);
  r.child.finish(3); assert.equal(await task, true);
  assert.equal(r.parent.exitCode, 3); assert.equal(r.parent.disconnects, 0); assertClean(r.parent);
});

test('forwards SIGTERM/SIGINT and preserves native crash or nonzero exit without CPU retry', async () => {
  for (const signal of ['SIGTERM', 'SIGINT']) {
    const r = rig(), task = maybeLaunchWebGpuWorker(r.options); await r.spawned;
    r.parent.emit(signal); assert.deepEqual(r.child.kills, [signal]);
    r.child.finish(null, signal); assert.equal(await task, true);
    assert.equal(r.parent.exitCode, 128 + os.constants.signals[signal]); assertClean(r.parent);
  }
  const r = rig(), task = maybeLaunchWebGpuWorker(r.options); await r.spawned;
  r.child.finish(7); assert.equal(await task, true);
  assert.equal(r.parent.exitCode, 7); assert.equal(r.spawns.length, 1); assertClean(r.parent);
});

test('spawn errors are surfaced and temporary process listeners are removed', async () => {
  const r = rig(), task = maybeLaunchWebGpuWorker(r.options); await r.spawned;
  r.child.emit('error', new Error('could not execute owned runtime'));
  await assert.rejects(task, /could not execute/);
  assert.equal(r.parent.disconnects, 0); assert.equal(r.spawns.length, 1); assertClean(r.parent);
});

test('malformed routing configuration and event descriptors fail before spawning', async () => {
  for (const webgpu of [null, [], 'invalid']) {
    const r = rig(); r.config.webgpu = webgpu;
    await assert.rejects(maybeLaunchWebGpuWorker(r.options), /configuration/); assert.equal(r.spawns.length, 0);
  }
  const r = rig(); r.options.argv[r.options.argv.length - 1] = '9';
  await assert.rejects(maybeLaunchWebGpuWorker(r.options), /descriptor/); assert.equal(r.spawns.length, 0);
});

test('private JSON reads are bounded and standalone executables require a verified regular cache file', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'webgpu-launch-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const jsonPath = path.join(directory, 'request.json');
  await fs.writeFile(jsonPath, '{"task":"person.matte"}');
  assert.deepEqual(await readBoundedJson(jsonPath), { task: 'person.matte' });
  await fs.writeFile(jsonPath, Buffer.alloc(512 * 1024 + 1));
  await assert.rejects(readBoundedJson(jsonPath), /file bound/);
  await fs.mkdir(path.join(directory, 'bin'));
  const filename = path.join(directory, 'bin/node'), contents = Buffer.from('unit executable');
  await fs.writeFile(filename, contents);
  const settings = { nodeExecutable: filename, nodeSha256: crypto.createHash('sha256').update(contents).digest('hex') };
  assert.equal(await verifyNodeExecutable(settings), filename);
  await assert.rejects(verifyNodeExecutable({ nodeExecutable: filename }), /pinned plugin-owned/);
  await assert.rejects(verifyNodeExecutable({ ...settings, nodeSha256: '0'.repeat(64) }), /checksum mismatch/);
  const link = path.join(directory, 'linked/bin'); await fs.mkdir(path.dirname(link)); await fs.symlink(path.join(directory, 'bin'), link);
  // The final executable itself cannot be a link.
  const executableLink = path.join(directory, 'bin/node-link'); await fs.symlink(filename, executableLink);
  await assert.rejects(verifyNodeExecutable({ ...settings, nodeExecutable: executableLink }), /pinned plugin-owned/);
  await fs.rm(filename); await fs.symlink(executableLink, filename);
  await assert.rejects(verifyNodeExecutable(settings), /regular cache file/);
});
