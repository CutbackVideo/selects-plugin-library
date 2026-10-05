import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { runWorkflow, writeJson, readJson } from '../scripts/cloud.mjs';
import { createBridge } from '../scripts/bridge.mjs';
import { importScript } from '../scripts/import-result.mjs';

const key = 'comfyui-' + 'a'.repeat(64);
const projectId = randomUUID();
const workflow = { '1': { class_type: 'SaveImage', inputs: { images: ['2', 0] } } };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const job = (status = 'succeeded', outputs = [{ url: '/api/v2/assets/result/content', filename: '../../result.png' }]) => ({ id: 'job-1', urls: { self: '/api/v2/jobs/job-1' }, status, outputs });
async function temporary(t) {
  const root = await mkdtemp(join(tmpdir(), 'comfy-plugin-'));
  t.after(() => rm(root, { recursive: true, force: true })); return root;
}
test('one submission, authentic progress, streamed download and credential-free signed URL', async t => {
  const directory = await temporary(t); const calls = []; const phases = []; let polls = 0;
  const fetcher = async (url, options) => {
    const link = String(url); calls.push({ link, options });
    if (options.method === 'POST') return json(job('queued'));
    if (link.endsWith('/jobs/job-1')) return json(++polls === 1 ? { ...job('running'), progress: { value: 0.4 } } : job());
    if (link.includes('/content')) return new Response(null, { status: 302, headers: { location: 'https://storage.example/result' } });
    assert.equal(options.headers, undefined); return new Response('png-bytes');
  };
  const options = { key, workflow, directory, projectId, fetcher, pollMs: 1, onUpdate: state => phases.push([state.phase, state.progress]) };
  const first = await runWorkflow(options);
  assert.equal(await readFile(first.paths[0], 'utf8'), 'png-bytes');
  assert(phases.some(([phase, progress]) => phase === 'running' && progress === 0.4));
  assert(calls.find(call => call.options.method === 'POST').options.headers['Idempotency-Key']);
  await runWorkflow(options);
  assert.equal(calls.filter(call => call.options.method === 'POST').length, 1);
  assert(!(await readFile(join(directory, 'run.json'), 'utf8')).includes(key));
  assert.equal((await stat(join(directory, 'run.json'))).mode & 0o777, 0o600);
});
test('LoadImage uploads multipart and substitutes an owned asset reference', async t => {
  const directory = await temporary(t); const path = join(directory, 'input.png'); await writeFile(path, 'image');
  const graph = { '2': { class_type: 'LoadImage', inputs: { image: 'old.png' } }, ...workflow };
  let upload = 0;
  const fetcher = async (url, options) => {
    if (String(url).endsWith('/assets')) {
      upload++; assert(options.body instanceof FormData);
      assert.equal(options.body.get('content_type'), 'image/png');
      assert.equal(await options.body.get('file').text(), 'image'); return json({ id: 'asset-1' });
    }
    if (options.method === 'POST') {
      const body = JSON.parse(options.body);
      assert.deepEqual(body.workflow['2'].inputs.image, { __type: 'core/ASSET', info: { id: 'asset-1' } });
      assert.equal(body.extra_data.api_key_comfy_org, key); return json(job());
    }
    return new Response('result');
  };
  await runWorkflow({ key, workflow: graph, images: { '2': path }, directory: join(directory, 'run'), projectId, fetcher });
  assert.equal(upload, 1); assert.equal(graph['2'].inputs.image, 'old.png');
});
test('a partial download resumes the same job and reuses finished files', async t => {
  const directory = await temporary(t); let submissions = 0; let firstDownloads = 0; let failSecond = true;
  const outputs = [{ url: '/first', filename: 'first.png' }, { url: '/second', filename: 'second.png' }];
  const fetcher = async (url, options) => {
    if (options.method === 'POST') { submissions++; return json(job('succeeded', outputs)); }
    if (String(url).includes('/jobs/')) return json(job('succeeded', outputs));
    if (String(url).endsWith('/first')) { firstDownloads++; return new Response('first'); }
    if (failSecond) throw new Error('offline'); return new Response('second');
  };
  const options = { key, workflow, directory, projectId, fetcher };
  await assert.rejects(runWorkflow(options)); failSecond = false;
  assert.equal((await runWorkflow(options)).paths.length, 2);
  assert.equal(submissions, 1); assert.equal(firstDownloads, 1);
});
test('unknown submission and off-origin API URLs cannot be retried or leak the key', async t => {
  const directory = await temporary(t); let submissions = 0;
  const options = { key, workflow, directory, projectId, fetcher: async () => { submissions++; throw new Error('timeout'); } };
  await assert.rejects(runWorkflow(options));
  await assert.rejects(runWorkflow(options), { code: 'submission_unknown' });
  assert.equal(submissions, 1);
  const second = join(directory, 'other'); let requests = 0;
  await writeJson(join(second, 'run.json'), { projectId, jobUrl: 'https://evil.example/job', submissionStarted: true });
  await assert.rejects(runWorkflow({ ...options, directory: second, fetcher: async () => { requests++; } }), { code: 'credential_origin' });
  assert.equal(requests, 0);
});
test('bridge persists workflows, requires origin/token, and blocks paid submission', async t => {
  const root = await temporary(t); let requests = 0;
  const origin = 'http://localhost:3000';
  const { server, connection } = await createBridge({ origin, dataRoot: root, fetcher: async () => { requests++; return json({ status: 'active' }); } });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const call = (path, body, headers = {}) => fetch(connection.url + path, {
    method: body ? 'POST' : 'GET', headers: { Origin: origin, Authorization: `Bearer ${connection.token}`, 'Content-Type': 'application/json', ...headers }, ...(body ? { body: JSON.stringify(body) } : {})
  });
  assert.equal((await call('/health', null, { Origin: 'http://evil.example' })).status, 403);
  assert.equal((await call('/health', null, { Authorization: '' })).status, 403);
  assert((await (await call('/connect', { key })).json()).authenticated);
  await call('/workflow', { name: 'Saved', workflow });
  assert.deepEqual((await (await call('/workflow')).json()).workflow, workflow);
  const blocked = await call('/run', { operationId: randomUUID(), projectId, workflow });
  assert.equal((await blocked.json()).error, 'generation_disabled'); assert.equal(requests, 1);
  assert(!(await readFile(join(root, 'workflow.json'), 'utf8')).includes(key));
  await call('/disconnect', {}); assert.equal((await (await call('/health')).json()).authenticated, false);
});
test('bridge returns async jobs, prevents duplicate submission and binds recovery to the original project', async t => {
  const root = await temporary(t); let submissions = 0;
  const { server, connection, running } = await createBridge({ origin: 'null', dataRoot: root, allowGeneration: true, fetcher: async (url, options) => {
    if (String(url).endsWith('/api/user')) return json({});
    if (options.method === 'POST') { submissions++; return json(job()); }
    return new Response('result');
  } });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const call = async (path, body) => (await fetch(connection.url + path, {
    method: body ? 'POST' : 'GET', headers: { Origin: 'null', Authorization: `Bearer ${connection.token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {})
  })).json();
  await call('/connect', { key });
  const operationId = randomUUID();
  const input = { operationId, projectId, workflow };
  await call('/run', input); await call('/run', input); await Promise.all(running.values());
  const done = await call('/runs/' + operationId); assert.equal(done.paths.length, 1); assert.equal(submissions, 1);
  assert.equal((await call('/run', { ...input, projectId: randomUUID() })).error, 'project_mismatch');
  assert.equal((await call('/runs?projectId=' + projectId)).length, 1);
  assert((await call('/import-script', { operationId })).script.includes(projectId));
  await call('/imported', { operationId }); assert.equal((await call('/runs?projectId=' + projectId)).length, 0);
});
test('shared import checks full folder inventory and retries only missing files', async () => {
  const paths = ['/tmp/one.png', '/tmp/two.png']; const found = new Map([[paths[0], 'r0']]); let imports = 0;
  const project = {
    sourceFiles: async opts => opts ? { fileTree: [...found].map(([path, resourceId]) => ({ type: 'image', path, resourceId })) } : { mode: 'summary', folders: [{ name: '(root)' }] },
    importFiles: async ({ paths: missing }) => { imports++; assert.deepEqual(missing, [paths[1]]); found.set(paths[1], 'r1'); return { addedResourceIds: ['r1'] }; }
  };
  const execute = new Function('selects', `return (async () => { ${importScript(projectId, paths)} })()`);
  assert.equal((await execute({ project: () => project })).resourceIds.length, 2);
  assert.equal((await execute({ project: () => project })).existing, 2); assert.equal(imports, 1);
});
test('failed runs can be dismissed without deleting recovery records or submitting again', async t => {
  const root = await temporary(t); let submissions = 0;
  const { server, connection, running } = await createBridge({ origin: 'null', dataRoot: root, allowGeneration: true, fetcher: async (url, options) => {
    if (String(url).endsWith('/api/user')) return json({});
    if (options.method === 'POST') { submissions++; return json(job('failed')); }
    throw new Error('Unexpected request');
  } });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const call = async (path, body) => (await fetch(connection.url + path, {
    method: body ? 'POST' : 'GET', headers: { Origin: 'null', Authorization: `Bearer ${connection.token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {})
  })).json();
  await call('/connect', { key }); const operationId = randomUUID();
  await call('/run', { operationId, projectId, workflow }); await Promise.all(running.values());
  assert.equal((await call('/runs/' + operationId)).error, 'job_failed');
  await call('/dismiss', { operationId });
  assert.equal((await call('/runs?projectId=' + projectId)).length, 0);
  assert.equal((await readJson(join(root, 'runs', operationId, 'run.json'))).jobId, 'job-1');
  assert.equal(submissions, 1);
});
