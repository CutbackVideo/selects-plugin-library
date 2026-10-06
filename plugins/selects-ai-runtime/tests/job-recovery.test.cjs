'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { tmpdir } = require('node:os');
const { spawn } = require('node:child_process');
const { readStatus } = require('../scripts/job-host.cjs');

let deadHostPid;
test.before(async () => {
  // Use a process owned by this test, which exits naturally. Never probe or
  // terminate an unrelated application to simulate a lost host.
  const child = spawn(process.execPath, ['-e', 'process.exit(0)'], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: 'ignore', windowsHide: true,
  });
  deadHostPid = child.pid;
  await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code) => code === 0 ? resolve() : reject(new Error('Fixture host failed to exit')));
  });
  assert.throws(() => process.kill(deadHostPid, 0), (error) => error.code === 'ESRCH');
});

async function fixture(t, { workerStatus = 'succeeded', result, rawResult, hostPid = deadHostPid } = {}) {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'selects-ai-job-recovery-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const outputDir = path.join(root, 'output');
  await fs.mkdir(outputDir);
  const record = { workflowId: 'test-owned-workflow', task: 'person.matte', status: 'running', outputDir, hostPid };
  await fs.writeFile(path.join(root, 'status.json'), JSON.stringify(record));
  await fs.writeFile(path.join(outputDir, 'worker-state.json'), JSON.stringify({ status: workerStatus }));
  if (result !== undefined) await fs.writeFile(path.join(outputDir, 'result.json'), JSON.stringify(result));
  if (rawResult !== undefined) await fs.writeFile(path.join(outputDir, 'result.json'), rawResult);
  return { root, record, persisted: async () => JSON.parse(await fs.readFile(path.join(root, 'status.json'), 'utf8')) };
}

const SUCCESS = {
  contractVersion: 1, task: 'person.matte', status: 'succeeded',
  files: { manifest: 'matte.json' }, metrics: { frames: 3 }, diagnostics: { requestedProvider: 'cpu' },
};

test('a lost host recovers the durable successful result and persists its payload', async (t) => {
  const own = await fixture(t, { result: SUCCESS });
  const recovered = await readStatus(own.root);
  assert.equal(recovered.status, 'succeeded');
  assert.deepEqual(recovered.result, SUCCESS);
  const saved = await own.persisted();
  assert.equal(saved.status, 'succeeded');
  assert.deepEqual(saved.result.files, { manifest: 'matte.json' });
  assert.deepEqual((await readStatus(own.root)).result, SUCCESS);
});

test('a success marker without the durable result cannot become a successful recovered job', async (t) => {
  const own = await fixture(t);
  const recovered = await readStatus(own.root);
  assert.equal(recovered.status, 'interrupted');
  assert.equal(Object.hasOwn(recovered, 'result'), false);
  assert.equal((await own.persisted()).status, 'interrupted');
});

test('an accepted cancellation wins over a late successful worker result after host death', async (t) => {
  const own = await fixture(t, { result: SUCCESS });
  await fs.writeFile(path.join(own.root, 'status.json'), JSON.stringify({ ...own.record, status: 'canceling' }));
  const recovered = await readStatus(own.root);
  assert.equal(recovered.status, 'canceled');
  assert.equal(Object.hasOwn(recovered, 'result'), false);
  const saved = await own.persisted();
  assert.equal(saved.status, 'canceled');
  assert.equal(Object.hasOwn(saved, 'result'), false);
});

test('broken, failed or unrelated durable results cannot satisfy success recovery', async (t) => {
  const cases = [
    ['malformed result JSON', { rawResult: '{broken' }],
    ['different task result', { result: { ...SUCCESS, task: 'faces.detect' } }],
    ['failed result', { result: { ...SUCCESS, status: 'failed' } }],
    ['worker did not succeed', { workerStatus: 'failed', result: SUCCESS }],
  ];
  for (const [name, input] of cases) {
    await t.test(name, async (child) => {
      const own = await fixture(child, input);
      const recovered = await readStatus(own.root);
      assert.equal(recovered.status, 'interrupted');
      assert.equal(Object.hasOwn(recovered, 'result'), false);
    });
  }
});

test('an active host remains responsible for completion even if the worker marker already exists', async (t) => {
  const own = await fixture(t, { hostPid: process.pid, result: SUCCESS });
  const status = await readStatus(own.root);
  assert.equal(status.status, 'running');
  assert.equal(Object.hasOwn(status, 'result'), false);
  assert.equal((await own.persisted()).status, 'running');
});
