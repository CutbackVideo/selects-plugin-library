import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { createBridge, VERSION } from './bridge.mjs';
import { failure, readJson, writeJson } from './cloud.mjs';

export function dataRoot() {
  const panels = process.env.SELECTS_USER_PANELS_ROOT;
  return join(panels ? dirname(panels) : join(homedir(), '.selects'), 'plugin-data', 'comfy-api-test');
}
export function registryPath(root, origin) {
  return join(root, 'runtime', createHash('sha256').update(origin).digest('hex') + '.json');
}
async function call(connection, path, body) {
  if (new URL(connection.url).hostname !== '127.0.0.1') throw failure('invalid_bridge');
  const reply = await fetch(connection.url + path, {
    method: body === undefined ? 'GET' : 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
    headers: { Origin: connection.origin, Authorization: `Bearer ${connection.token}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const result = await reply.json();
  if (!reply.ok) throw failure(result.error);
  return result;
}
export async function connect(origin) {
  const root = dataRoot();
  const registry = registryPath(root, origin);
  const current = await readJson(registry);
  if (current?.version === VERSION) {
    try { return { ...current, ...await call(current, '/health') }; } catch {}
  }
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'serve', origin], {
    detached: true, stdio: 'ignore', cwd: dirname(fileURLToPath(import.meta.url)),
    env: { PATH: process.env.PATH, ...(process.env.SELECTS_USER_PANELS_ROOT ? { SELECTS_USER_PANELS_ROOT: process.env.SELECTS_USER_PANELS_ROOT } : {}) }
  });
  child.unref();
  for (let count = 0; count < 50; count++) {
    await sleep(100);
    const next = await readJson(registry);
    if (next?.version === VERSION) {
      try { return { ...next, ...await call(next, '/health') }; } catch {}
    }
  }
  throw failure('bridge_start_failed');
}
async function main() {
  const [command, origin, argument, projectId] = process.argv.slice(2);
  if (command === 'set-generation') {
    if (!['on', 'off'].includes(origin)) throw failure('invalid_request');
    await writeJson(join(dataRoot(), 'policy.json'), { allowGeneration: origin === 'on' });
    console.log(JSON.stringify({ allowGeneration: origin === 'on' })); return;
  }
  if (!origin || (origin !== 'null' && new URL(origin).origin !== origin)) throw failure('invalid_origin');
  if (command === 'peek') {
    const root = dataRoot();
    const current = await readJson(registryPath(root, origin));
    let connection = null;
    if (current?.version === VERSION) {
      try { connection = { ...current, ...await call(current, '/health') }; } catch {}
    }
    let saved = await readJson(join(root, 'workflow.json'), { name: '', workflow: null });
    if (Buffer.byteLength(JSON.stringify(saved), 'utf8') > 40000) saved = { name: saved.name, workflow: null, needsLoad: true };
    console.log(JSON.stringify({ connection, saved })); return;
  }
  if (command === 'serve') {
    const root = dataRoot();
    const bridge = await createBridge({ origin, dataRoot: root,
      generationPolicy: async () => (await readJson(join(root, 'policy.json'), {})).allowGeneration !== false });
    await writeJson(registryPath(root, origin), { ...bridge.connection, pid: process.pid }); return;
  }
  const connection = await connect(origin);
  if (command === 'connect') { console.log(JSON.stringify(connection)); return; }
  let result;
  if (command === 'status') result = await call(connection, '/health');
  else if (command === 'workflow') result = await call(connection, '/workflow');
  else if (command === 'save-workflow') result = await call(connection, '/workflow', await readJson(argument));
  else if (command === 'run') result = await call(connection, '/run', { ...await readJson(argument), projectId });
  else if (command === 'poll') result = await call(connection, `/runs/${argument}`);
  else if (command === 'import-script') result = await call(connection, '/import-script', { operationId: argument });
  else if (command === 'imported') result = await call(connection, '/imported', { operationId: argument });
  else if (command === 'disconnect') result = await call(connection, '/disconnect', {});
  else throw failure('unknown_action');
  console.log(JSON.stringify(result));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(error => { console.error(JSON.stringify({ error: error.code ?? 'connection_failed' })); process.exitCode = 1; });
}
