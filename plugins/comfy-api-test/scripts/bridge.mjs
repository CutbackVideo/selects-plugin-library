import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { failure, readJson, writeJson, validateWorkflow, verifyKey, runWorkflow } from './cloud.mjs';
import { importScript } from './import-result.mjs';

export const VERSION = '0.1.0';
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value);
export async function createBridge({ origin, dataRoot, allowGeneration = false, generationPolicy = async () => allowGeneration, fetcher = fetch, pollMs = 1500, testLabel = null }) {
  if (!origin || (origin !== 'null' && new URL(origin).origin !== origin)) throw failure('invalid_origin');
  const token = randomBytes(32).toString('hex');
  let key = null;
  const running = new Map();
  const runDirectory = id => {
    if (!uuid(id)) throw failure('invalid_run');
    return join(dataRoot, 'runs', id);
  };
  async function getRun(id) {
    const state = await readJson(join(runDirectory(id), 'run.json'));
    if (!state) throw failure('run_not_found');
    return { ...state, operationId: id, active: running.has(id) };
  }
  async function launch(input) {
    if (!key) throw failure('not_connected');
    const directory = runDirectory(input.operationId);
    const previous = await readJson(join(directory, 'request.json'));
    const request = previous ?? { workflow: validateWorkflow(input.workflow), images: input.images ?? {}, projectId: input.projectId };
    if (!uuid(request.projectId)) throw failure('project_missing');
    if (previous && input.projectId !== previous.projectId) throw failure('project_mismatch');
    const saved = await readJson(join(directory, 'run.json'));
    if (!await generationPolicy() && !saved?.jobUrl && !saved?.paths?.length) throw failure('generation_disabled');
    if (running.has(input.operationId)) return getRun(input.operationId);
    if (saved?.paths?.length) return getRun(input.operationId);
    if (!previous) await writeJson(join(directory, 'request.json'), request);
    if (!saved) await writeJson(join(directory, 'run.json'), { projectId: request.projectId, createdAt: new Date().toISOString(), assets: {} });
    const activeKey = key;
    const task = runWorkflow({ ...request, key: activeKey, directory, fetcher, pollMs }).catch(async error => {
      const state = await readJson(join(directory, 'run.json'), { projectId: request.projectId });
      await writeJson(join(directory, 'run.json'), { ...state, phase: 'error', error: error.code ?? 'connection_failed' });
    }).finally(() => running.delete(input.operationId));
    running.set(input.operationId, task);
    return getRun(input.operationId);
  }
  const server = createServer(async (request, response) => {
    if (request.headers.origin !== origin) { response.writeHead(403).end(); return; }
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
    response.setHeader('Cache-Control', 'no-store');
    if (request.method === 'OPTIONS') {
      response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST');
      response.writeHead(204).end(); return;
    }
    response.setHeader('Content-Type', 'application/json');
    if (request.headers.authorization !== `Bearer ${token}`) { response.writeHead(403).end(JSON.stringify({ error: 'bridge_unauthorized' })); return; }
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      let input = {};
      if (request.method === 'POST') {
        if (!request.headers['content-type']?.startsWith('application/json')) throw failure('invalid_request');
        let bytes = 0; const chunks = [];
        for await (const chunk of request) {
          bytes += chunk.length;
          if (bytes > 2000000) throw failure('workflow_too_large');
          chunks.push(chunk);
        }
        input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      }
      let result;
      if (request.method === 'GET' && url.pathname === '/health') result = { version: VERSION, authenticated: !!key, allowGeneration: await generationPolicy(), testLabel };
      else if (request.method === 'POST' && url.pathname === '/connect') {
        await verifyKey(input.key, fetcher); key = input.key;
        result = { authenticated: true, allowGeneration: await generationPolicy(), testLabel };
      } else if (request.method === 'POST' && url.pathname === '/disconnect') { key = null; result = { authenticated: false }; }
      else if (request.method === 'GET' && url.pathname === '/workflow') result = await readJson(join(dataRoot, 'workflow.json'), { name: '', workflow: null });
      else if (request.method === 'POST' && url.pathname === '/workflow') {
        let graph = input.workflow;
        if (input.path) {
          if ((await stat(input.path)).size > 1900000) throw failure('workflow_too_large');
          graph = JSON.parse(await readFile(input.path, 'utf8'));
        }
        if (input.example) graph = JSON.parse(await readFile(new URL('../workflow_api.json', import.meta.url), 'utf8'));
        validateWorkflow(graph);
        result = { name: String(input.name ?? 'Workflow').slice(0, 200), workflow: graph };
        await writeJson(join(dataRoot, 'workflow.json'), result);
      } else if (request.method === 'POST' && url.pathname === '/run') result = await launch(input);
      else if (request.method === 'GET' && url.pathname.startsWith('/runs/')) result = await getRun(url.pathname.slice(6));
      else if (request.method === 'GET' && url.pathname === '/runs') {
        const ids = await readdir(join(dataRoot, 'runs')).catch(error => { if (error.code !== 'ENOENT') throw error; return []; });
        result = [];
        for (const id of ids.filter(uuid)) {
          const run = await getRun(id);
          if (!run.imported && !run.dismissed && run.projectId === url.searchParams.get('projectId')) result.push(run);
        }
        result.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
      } else if (request.method === 'POST' && url.pathname === '/import-script') {
        const run = await getRun(input.operationId);
        if (!run.paths?.length) throw failure('no_outputs');
        result = { script: importScript(run.projectId, run.paths), projectId: run.projectId, paths: run.paths };
      } else if (request.method === 'POST' && url.pathname === '/dismiss') {
        const run = await getRun(input.operationId);
        if (run.active || !run.error || run.paths?.length) throw failure('run_active');
        await writeJson(join(runDirectory(input.operationId), 'run.json'), { ...run, dismissed: true });
        result = { dismissed: true };
      } else if (request.method === 'POST' && url.pathname === '/imported') {
        const run = await getRun(input.operationId);
        if (!run.paths?.length) throw failure('no_outputs');
        await writeJson(join(runDirectory(input.operationId), 'run.json'), { ...run, imported: true });
        result = { imported: true };
      } else throw failure('unknown_action');
      response.end(JSON.stringify(result));
    } catch (error) { response.writeHead(400).end(JSON.stringify({ error: error.code ?? 'invalid_request' })); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, connection: { version: VERSION, origin, url: `http://127.0.0.1:${server.address().port}`, token }, running };
}
