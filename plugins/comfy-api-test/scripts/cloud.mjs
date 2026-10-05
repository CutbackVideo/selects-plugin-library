import { randomUUID } from 'node:crypto';
import { openAsBlob } from 'node:fs';
import { mkdir, readFile, writeFile, rename, stat } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { basename, extname, isAbsolute, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { setTimeout as sleep } from 'node:timers/promises';

export const CLOUD = 'https://cloud.comfy.org';
export const failure = code => Object.assign(new Error(code), { code });
export function validateWorkflow(graph) {
  if (!graph || typeof graph !== 'object' || Array.isArray(graph) || !Object.keys(graph).length ||
      !Object.values(graph).every(node => node && typeof node.class_type === 'string' && node.inputs &&
        typeof node.inputs === 'object' && !Array.isArray(node.inputs))) throw failure('invalid_workflow');
  return graph;
}
export function validateKey(key) {
  if (!/^comfyui-[a-f0-9]{64}$/.test(key ?? '')) throw failure('invalid_key');
}
export async function readJson(path, fallback = null) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}
export async function writeJson(path, value) {
  await mkdir(join(path, '..'), { recursive: true, mode: 0o700 });
  const temporary = path + '.' + randomUUID() + '.tmp';
  await writeFile(temporary, JSON.stringify(value), { mode: 0o600 });
  await rename(temporary, path);
}
function cloudUrl(link) {
  const url = new URL(link, CLOUD);
  if (url.origin !== CLOUD) throw failure('credential_origin');
  return url;
}
async function api(key, link, options = {}, fetcher = fetch) {
  const response = await fetcher(cloudUrl(link), {
    ...options, redirect: 'error', signal: AbortSignal.timeout(60000),
    headers: { Authorization: `Bearer ${key}`, ...options.headers }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const code = body.error?.code;
    throw failure(typeof code === 'string' && /^[a-z0-9_]+$/.test(code) ? code : `http_${response.status}`);
  }
  return response.json();
}
export async function verifyKey(key, fetcher = fetch) {
  validateKey(key);
  await api(key, '/api/user', { headers: { 'X-API-Key': key } }, fetcher);
}
const imageTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
export async function runWorkflow({ key, workflow, images = {}, directory, projectId, fetcher = fetch, pollMs = 1500, onUpdate = () => {} }) {
  validateKey(key); validateWorkflow(workflow);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const statePath = join(directory, 'run.json');
  let state = await readJson(statePath);
  if (state && state.projectId !== projectId) throw failure('project_mismatch');
  if (state?.submissionStarted && !state.jobUrl) throw failure('submission_unknown');
  if (state?.paths?.length) {
    for (const path of state.paths) await stat(path);
    return state;
  }
  state ??= { projectId, createdAt: new Date().toISOString(), assets: {} };
  state.idempotencyKey ??= randomUUID();
  async function update(patch) {
    Object.assign(state, patch);
    await writeJson(statePath, state);
    onUpdate(state);
  }
  let job;
  if (state.jobUrl) job = await api(key, state.jobUrl, {}, fetcher);
  else {
    const graph = structuredClone(workflow);
    await update({ phase: 'uploading' });
    for (const [nodeId, path] of Object.entries(images)) {
      if (graph[nodeId]?.class_type !== 'LoadImage' || typeof path !== 'string' || !isAbsolute(path)) throw failure('invalid_image');
      const mime = imageTypes[extname(path).toLowerCase()];
      const info = await stat(path);
      if (!mime || !info.isFile() || info.size > 100000000) throw failure('invalid_image');
      if (!state.assets[nodeId]) {
        const form = new FormData();
        form.set('file', await openAsBlob(path, { type: mime }), basename(path));
        form.set('content_type', mime);
        form.set('file_path', `selects-${state.idempotencyKey}-${nodeId.replace(/[^a-z0-9]/gi, '-')}${extname(path).toLowerCase()}`);
        const asset = await api(key, '/api/v2/assets', { method: 'POST', body: form }, fetcher);
        if (typeof asset.id !== 'string') throw failure('invalid_response');
        state.assets[nodeId] = { id: asset.id };
        await update({ assets: state.assets });
      }
      graph[nodeId].inputs.image = { __type: 'core/ASSET', info: state.assets[nodeId] };
    }
    await update({ phase: 'submitting', submissionStarted: true });
    job = await api(key, '/api/v2/jobs', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': state.idempotencyKey },
      body: JSON.stringify({ workflow: graph, extra_data: { api_key_comfy_org: key } })
    }, fetcher);
    if (!job.id || !job.urls?.self) throw failure('submission_unknown');
    await update({ jobId: job.id, jobUrl: cloudUrl(job.urls.self).href });
  }
  while (['queued', 'running', 'canceling'].includes(job.status)) {
    await update({ phase: job.status, progress: job.progress?.value });
    await sleep(pollMs);
    job = await api(key, state.jobUrl, {}, fetcher);
  }
  if (job.status !== 'succeeded') throw failure(`job_${job.status ?? 'unknown'}`);
  if (!Array.isArray(job.outputs) || !job.outputs.length) throw failure('no_outputs');
  await update({ phase: 'downloading', progress: undefined, downloads: state.downloads ?? {} });
  const paths = [];
  for (const [index, output] of job.outputs.entries()) {
    const name = basename(String(output.filename ?? output.file_path ?? output.name ?? 'output.bin').replaceAll('\\', '/'));
    const path = join(directory, `${index}-${name}`);
    const saved = state.downloads[index];
    const existing = await stat(path).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
    if (!saved || existing?.size !== saved.size) {
      let reply = await fetcher(cloudUrl(output.url), {
        headers: { Authorization: `Bearer ${key}` }, redirect: 'manual', signal: AbortSignal.timeout(300000)
      });
      if ([301, 302, 303, 307, 308].includes(reply.status)) {
        const location = reply.headers.get('location');
        if (!location) throw failure('download_failed');
        const signed = new URL(location, CLOUD);
        if (signed.protocol !== 'https:' || signed.username || signed.password) throw failure('credential_origin');
        reply = await fetcher(signed, { redirect: 'error', signal: AbortSignal.timeout(300000) });
      }
      if (!reply.ok || !reply.body) throw failure('download_failed');
      await pipeline(Readable.fromWeb(reply.body), createWriteStream(path + '.part', { mode: 0o600 }));
      await rename(path + '.part', path);
      state.downloads[index] = { size: (await stat(path)).size };
      await update({ downloads: state.downloads });
    }
    paths.push(path);
  }
  await update({ phase: 'completed', paths, error: undefined });
  return state;
}
