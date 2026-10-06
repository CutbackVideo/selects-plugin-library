#!/usr/bin/env node
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { startJob, readStatus } = require('./job-host.cjs');
const { readJson, writeJson } = require('../lib/files.cjs');

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
function alive(pid) { try { process.kill(pid, 0); return true; } catch { return false; } }
async function verifyExited(pids) {
  const unique = [...new Set(pids.filter(Number.isInteger))];
  for (let attempt = 0; attempt < 60; attempt++) {
    if (unique.every(pid => !alive(pid))) return unique;
    await sleep(50);
  }
  throw new Error(`Task processes still running: ${unique.filter(alive).join(',')}`);
}

async function cancelCase(requestFile, configFile, runRoot) {
  let cancel;
  let requestedAt;
  const seen = [];
  const job = await startJob({ requestFile, configFile, jobDir: path.join(runRoot, 'cancel'), onEvent: event => {
    if (event.decoderPid) seen.push(event.decoderPid);
    if (event.type === 'progress' && event.step === 'inference' && event.completed >= 1 && !requestedAt) {
      requestedAt = performance.now();
      cancel();
    }
  } });
  cancel = job.cancel;
  const record = await job.done;
  assert.ok(requestedAt, 'Must cancel during actual inference');
  assert.equal(record.status, 'canceled');
  assert.equal(await fs.access(path.join(record.outputDir, 'result.json')).then(() => true, () => false), false);
  const exited = await verifyExited([record.workerPid, ...seen]);
  return { status: 'passed', terminalStatus: record.status, cancellationMilliseconds: performance.now() - requestedAt, exitedPids: exited };
}

async function crashCase(requestFile, configFile, runRoot) {
  const directory = path.join(runRoot, 'host-crash');
  const env = { ELECTRON_RUN_AS_NODE: '1' };
  for (const key of ['SystemRoot', 'TEMP', 'TMP', 'TMPDIR', 'HOME', 'USERPROFILE']) if (process.env[key]) env[key] = process.env[key];
  const child = spawn(process.execPath, [path.join(__dirname, 'job-host.cjs'), '--request', requestFile, '--config', configFile, '--job-dir', directory], {
    env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const seen = [];
  let pending = '', stderr = '', crashed = false;
  child.stderr.on('data', bytes => { stderr += bytes; });
  child.stdout.on('data', bytes => {
    pending += bytes;
    let split;
    while ((split = pending.indexOf('\n')) !== -1) {
      const line = pending.slice(0, split); pending = pending.slice(split + 1);
      if (!line) continue;
      const event = JSON.parse(line);
      if (event.workerPid) seen.push(event.workerPid);
      if (event.decoderPid) seen.push(event.decoderPid);
      if (event.type === 'progress' && event.step === 'inference' && event.completed >= 1 && !crashed) {
        crashed = true;
        child.kill('SIGKILL'); // Only this task's host; do not kill its process group.
      }
    }
  });
  const watchdog = setTimeout(() => child.kill('SIGKILL'), 15000);
  try {
    await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
  } finally { clearTimeout(watchdog); }
  assert.ok(crashed, `Host must crash during inference: ${stderr}`);
  const exited = await verifyExited(seen);
  const status = await readStatus(directory);
  assert.equal(status.status, 'interrupted');
  assert.equal(await fs.access(path.join(status.outputDir, 'result.json')).then(() => true, () => false), false);
  return { status: 'passed', terminalStatus: status.status, hostPid: child.pid, exitedPids: exited };
}

async function failureCase(requestFile, configFile, runRoot) {
  const wrong = await readJson(configFile);
  wrong.models.rvm.sha256 = '0'.repeat(64);
  const badConfig = path.join(runRoot, 'wrong-checksum.json');
  await writeJson(badConfig, wrong);
  const job = await startJob({ requestFile, configFile: badConfig, jobDir: path.join(runRoot, 'wrong-checksum') });
  const record = await job.done;
  assert.equal(record.status, 'failed');
  assert.match(record.error.message, /checksum/i);
  const exited = await verifyExited([record.workerPid]);
  return { status: 'passed', terminalStatus: record.status, rejectedChecksum: true, exitedPids: exited };
}

async function validationCancelCase(requestFile, configFile, runRoot) {
  let cancel;
  let requestedAt;
  let resultEventSeen = false;
  const seen = [];
  const job = await startJob({ requestFile, configFile, jobDir: path.join(runRoot, 'validation-cancel'), onEvent: event => {
    if (event.decoderPid) seen.push(event.decoderPid);
    if (event.type === 'result') resultEventSeen = true;
    if (event.type === 'progress' && event.step === 'validating-output' && !requestedAt) {
      requestedAt = performance.now();
      cancel();
    }
  } });
  cancel = job.cancel;
  const record = await job.done;
  assert.ok(requestedAt, 'Must cancel after inference, at validating-output');
  assert.equal(record.status, 'canceled');
  assert.equal(resultEventSeen, false, 'Cancellation must prevent publication of a result event');
  assert.equal(await fs.access(path.join(record.outputDir, 'result.json')).then(() => true, () => false), false);
  const worker = await readJson(path.join(record.outputDir, 'worker-state.json')).catch(() => null);
  // Windows forcibly terminates the tree; Unix gets the worker's graceful
  // cancellation acknowledgement and must not leave a success commit marker.
  if (process.platform !== 'win32') assert.equal(worker?.status, 'canceled');
  assert.notEqual(worker?.status, 'succeeded');
  const exited = await verifyExited([record.workerPid, ...seen]);
  return {
    status: 'passed', terminalStatus: record.status, requestedAtStep: 'validating-output',
    workerTerminalStatus: worker?.status ?? 'terminated', resultEventSeen,
    cancellationMilliseconds: performance.now() - requestedAt, exitedPids: exited,
  };
}

async function timeoutCase(requestFile, configFile, runRoot) {
  const seen = [];
  let workerCancellationCode;
  const job = await startJob({ requestFile, configFile, jobDir: path.join(runRoot, 'timeout'), timeoutMs: 300, onEvent: event => {
    if (event.decoderPid) seen.push(event.decoderPid);
    if (event.type === 'error') workerCancellationCode = event.error?.code;
  } });
  const record = await job.done;
  assert.equal(record.status, 'canceled');
  assert.equal(record.error?.code, 'JOB_TIMEOUT', 'A worker cancellation error must not overwrite the host timeout reason');
  if (process.platform !== 'win32') assert.equal(workerCancellationCode, 'JOB_CANCELED');
  assert.equal(await fs.access(path.join(record.outputDir, 'result.json')).then(() => true, () => false), false);
  const exited = await verifyExited([record.workerPid, ...seen]);
  return { status: 'passed', terminalStatus: record.status, errorCode: record.error.code, workerCancellationCode, exitedPids: exited };
}

async function main() {
  const value = name => { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; };
  if (!value('--request') || !value('--config') || !value('--output')) throw new Error('Expected --request, --config, --output');
  const requestFile = path.resolve(value('--request'));
  const configFile = path.resolve(value('--config'));
  const output = path.resolve(value('--output'));
  await fs.mkdir(output, { recursive: true });
  const extraOnly = process.argv.includes('--finalization-only');
  const report = {
    runtime: { node: process.versions.node, electron: process.versions.electron ?? null, platform: process.platform, arch: process.arch },
    ...(extraOnly ? {} : {
      cancellation: await cancelCase(requestFile, configFile, output),
      parentCrash: await crashCase(requestFile, configFile, output),
      checksumFailure: await failureCase(requestFile, configFile, output),
    }),
    validationCancellation: await validationCancelCase(requestFile, configFile, output),
    timeout: await timeoutCase(requestFile, configFile, output),
  };
  await writeJson(path.join(output, 'lifecycle-report.json'), report);
  console.log(JSON.stringify(report, null, 2));
}
if (require.main === module) main().catch(error => { console.error(error.stack); process.exitCode = 1; });
