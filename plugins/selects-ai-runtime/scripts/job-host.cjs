#!/usr/bin/env node
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn, execFile } = require('node:child_process');
const { readJson, writeJson, ensureEmptyDirectory } = require('../lib/files.cjs');

const TERMINAL = new Set(['succeeded', 'failed', 'canceled', 'interrupted']);
function childEnvironment() {
  const result = { ELECTRON_RUN_AS_NODE: '1' };
  for (const key of ['SystemRoot', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR', 'HOME', 'USERPROFILE']) {
    if (process.env[key]) result[key] = process.env[key];
  }
  return result;
}

function terminateTree(pid, signal) {
  if (process.platform === 'win32') {
    const tool = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'taskkill.exe');
    execFile(tool, ['/PID', String(pid), '/T', '/F'], { windowsHide: true }, () => {});
  } else {
    try { process.kill(-pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
}

async function startJob({ requestFile, configFile, jobDir, executable = process.execPath, cancelAfterMs, timeoutMs = 120000, onEvent = () => {} }) {
  await ensureEmptyDirectory(jobDir);
  const request = await readJson(requestFile);
  const outputDir = path.join(jobDir, 'output');
  const workflowId = `ai-${crypto.randomUUID()}`;
  const statusFile = path.join(jobDir, 'status.json');
  const record = { workflowId, task: request.task, status: 'queued', outputDir, hostPid: process.pid };
  let persistTail = Promise.resolve();
  const persist = () => {
    const snapshot = { ...record, updatedAt: new Date().toISOString() };
    persistTail = persistTail.catch(() => {}).then(() => writeJson(statusFile, snapshot));
    return persistTail;
  };
  await persist();
  const worker = spawn(executable, [path.join(__dirname, '..', 'runtime.cjs'), '--request', requestFile, '--config', configFile, '--output', outputDir, '--event-output-fd', '4'], {
    cwd: path.join(__dirname, '..'), env: childEnvironment(), detached: process.platform !== 'win32',
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc', 'pipe'],
  });
  record.workerPid = worker.pid;
  record.status = 'running';
  persist().catch(() => {});
  let pending = '';
  let stderr = '';
  let receivedResult;
  let canceled = false;
  let interrupted = false;
  let hardStop;
  let parseFailure;
  worker.stderr.on('data', bytes => { stderr = (stderr + bytes.toString()).slice(-8192); });
  worker.stdout.resume(); // Native diagnostics are not protocol events.
  worker.stdio[4].on('data', bytes => {
    pending += bytes.toString();
    if (pending.length > 256 * 1024) {
      parseFailure = 'Worker event exceeds the protocol bound';
      terminateTree(worker.pid, 'SIGKILL');
      return;
    }
    let split;
    while ((split = pending.indexOf('\n')) !== -1) {
      const line = pending.slice(0, split);
      pending = pending.slice(split + 1);
      if (!line) continue;
      let event;
      try { event = JSON.parse(line); } catch { parseFailure = 'Malformed worker event'; terminateTree(worker.pid, 'SIGKILL'); continue; }
      // Worker success is tentative until exit and host status persistence.
      if (event.type === 'result') {
        if (!canceled && !interrupted) receivedResult = event.result;
        continue;
      }
      onEvent(event);
      if (event.type === 'progress') {
        record.step = event.step;
        if (event.completed != null) record.completed = event.completed;
        if (event.total != null) record.total = event.total;
        if (event.decoderPid != null) record.decoderPid = event.decoderPid;
        persist().catch(() => {});
      } else if (event.type === 'error') record.error ??= event.error;
    }
  });
  function stop(cause) {
    if (TERMINAL.has(record.status) || canceled || interrupted) return;
    interrupted = cause === 'interrupted';
    canceled = !interrupted;
    record.status = interrupted ? 'interrupted' : 'canceling';
    persist().catch(() => {});
    if (worker.connected) worker.send({ type: 'stop', cause: interrupted ? 'interrupted' : 'canceled' }, () => {});
    // Windows taskkill is asynchronous. Give the IPC abort a chance to prevent
    // publication; the tree-kill backstop also covers stuck native inference.
    if (process.platform !== 'win32') terminateTree(worker.pid, 'SIGTERM');
    hardStop = setTimeout(() => terminateTree(worker.pid, 'SIGKILL'), 2000);
    hardStop.unref();
  }
  const shutdown = () => stop('interrupted');
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  const deadline = setTimeout(() => { record.error = { code: 'JOB_TIMEOUT', message: 'PoC job deadline exceeded' }; stop('canceled'); }, timeoutMs);
  const cancelTimer = cancelAfterMs == null ? null : setTimeout(() => stop('canceled'), cancelAfterMs);
  const done = new Promise(resolve => {
    worker.once('error', error => { record.error = { code: 'SPAWN_FAILED', message: error.message }; });
    worker.once('close', async code => {
      clearTimeout(deadline);
      clearTimeout(cancelTimer);
      clearTimeout(hardStop);
      process.removeListener('SIGTERM', shutdown);
      process.removeListener('SIGINT', shutdown);
      record.status = interrupted ? 'interrupted' : canceled ? 'canceled' : code === 0 && receivedResult ? 'succeeded' : 'failed';
      record.exitCode = code;
      if (record.status === 'failed' && !record.error) record.error = { code: 'WORKER_FAILED', message: parseFailure ?? (stderr || `Worker exit ${code}`) };
      if (record.status === 'succeeded') record.result = receivedResult;
      try {
        if (canceled || interrupted) {
          // The worker may have finished while a stop request was in transit.
          // Never leave an adoptable success payload behind a canceled job.
          await fs.rm(path.join(outputDir, 'result.json'), { force: true });
          await writeJson(path.join(outputDir, 'worker-state.json'), { status: record.status });
          delete record.result;
        }
        await persist();
      } catch (error) { record.status = 'failed'; record.error = { code: 'JOB_STATE_WRITE_FAILED', message: error.message }; }
      if (record.status === 'succeeded') onEvent({ type: 'result', result: record.result, at: new Date().toISOString() });
      resolve({ ...record });
    });
  });
  return { workflowId, workerPid: worker.pid, done, cancel: () => stop('canceled') };
}

async function readStatus(jobDir) {
  const record = await readJson(path.join(jobDir, 'status.json'));
  if (!TERMINAL.has(record.status)) {
    try { process.kill(record.hostPid, 0); } catch {
      const worker = await readJson(path.join(record.outputDir, 'worker-state.json')).catch(() => null);
      const result = worker?.status === 'succeeded' ? await readJson(path.join(record.outputDir, 'result.json')).catch(() => null) : null;
      record.status = record.status === 'canceling' ? 'canceled' : result?.status === 'succeeded' && result.task === record.task ? 'succeeded' : 'interrupted';
      if (record.status === 'succeeded') record.result = result;
      await writeJson(path.join(jobDir, 'status.json'), record);
    }
  }
  return record;
}

async function cli() {
  const value = name => { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; };
  const jobDir = path.resolve(value('--job-dir') ?? '.local/job');
  if (process.argv.includes('--status')) return readStatus(jobDir);
  if (!value('--request') || !value('--config')) throw new Error('Expected --request, --config, --job-dir');
  const job = await startJob({
    requestFile: path.resolve(value('--request')), configFile: path.resolve(value('--config')), jobDir,
    cancelAfterMs: value('--cancel-after-ms') == null ? undefined : Number(value('--cancel-after-ms')),
    timeoutMs: value('--timeout-ms') == null ? undefined : Number(value('--timeout-ms')),
    onEvent: event => process.stdout.write(`${JSON.stringify(event)}\n`),
  });
  process.stdout.write(`${JSON.stringify({ type: 'job', workflowId: job.workflowId, workerPid: job.workerPid })}\n`);
  return job.done;
}
if (require.main === module) cli().then(record => {
  process.stdout.write(`${JSON.stringify({ type: 'job-status', ...record })}\n`);
  process.exitCode = record.status === 'failed' ? 1 : 0;
}).catch(error => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
module.exports = { startJob, readStatus };
