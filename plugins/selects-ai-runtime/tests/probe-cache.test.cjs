'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { probeJSON, MAX_BYTES, MAX_TOTAL_BYTES, MAX_ENTRIES } = require('../lib/probe-cache.cjs');

async function fixture(run) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'probe-query-'));
  try {
    const source = path.join(dir, 'source.mp4');
    const counter = path.join(dir, 'calls');
    const runner = path.join(dir, 'probe.cjs');
    await fs.writeFile(source, 'original');
    await fs.writeFile(runner, `require('node:fs').appendFileSync(process.argv[2], 'x'); console.log(JSON.stringify({frames:[{best_effort_timestamp:17}]}));`);
    const config = { tools: { ffprobe: process.execPath }, timelineCache: dir };
    const args = [runner, counter, source];
    const calls = async () => (await fs.readFile(counter, 'utf8')).length;
    await run({ dir, source, config, args, calls });
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
}

test('exact queries persist across module reloads and different queries never share entries', async () => fixture(async ({ source, config, args, calls }) => {
  const first = await probeJSON(config, source, args);
  delete require.cache[require.resolve('../lib/probe-cache.cjs')];
  const second = await require('../lib/probe-cache.cjs').probeJSON(config, source, args);
  assert.deepEqual(second, first);
  assert.equal(await calls(), 1);
  await probeJSON(config, source, [...args, 'different interval']);
  assert.equal(await calls(), 2);
}));

test('source replacement invalidates the query even with restored size and mtime', async () => fixture(async ({ source, config, args, calls }) => {
  await probeJSON(config, source, args);
  const stat = await fs.stat(source);
  const replacement = source + '.new';
  await fs.writeFile(replacement, 'replaced');
  await fs.utimes(replacement, stat.atime, stat.mtime);
  await fs.rename(replacement, source);
  await probeJSON(config, source, args);
  assert.equal(await calls(), 2);
}));

test('corrupt, oversized, unavailable and symlink caches fall back to probing', async () => fixture(async ({ dir, source, config, args, calls }) => {
  await probeJSON(config, source, args);
  const root = path.join(dir, 'probe-v1');
  const entry = path.join(root, (await fs.readdir(root))[0]);
  await fs.writeFile(entry, '{}');
  await probeJSON(config, source, args);
  const data = JSON.parse(await fs.readFile(entry, 'utf8'));
  data.output = '{"frames":[{"best_effort_timestamp":99}]}';
  await fs.writeFile(entry, JSON.stringify(data));
  assert.equal((await probeJSON(config, source, args)).frames[0].best_effort_timestamp, 17);
  const handle = await fs.open(entry, 'r+');
  await handle.truncate(MAX_BYTES + 1); await handle.close();
  await probeJSON(config, source, args);
  await probeJSON({ ...config, timelineCache: path.join(dir, 'missing') }, source, args);
  assert.equal(await calls(), 5);
  if (process.platform !== 'win32') {
    await fs.rm(root, { recursive: true });
    await fs.symlink(dir, root);
    await probeJSON(config, source, args);
    assert.equal(await calls(), 6);
  }
}));

test('cancellation wins over a cache hit', async () => fixture(async ({ source, config, args, calls }) => {
  await probeJSON(config, source, args);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(probeJSON(config, source, args, controller.signal));
  assert.equal(await calls(), 1);
}));

test('invalid probe output is never cached and invalid cached shapes are re-probed', async () => fixture(async ({ dir, source, config, args, calls }) => {
  const reject = () => { throw new Error('invalid timestamp document'); };
  await assert.rejects(probeJSON(config, source, args, undefined, reject), /invalid timestamp/);
  await assert.rejects(probeJSON(config, source, args, undefined, reject), /invalid timestamp/);
  assert.equal(await calls(), 2);
  assert.deepEqual(await fs.readdir(path.join(dir, 'probe-v1')), []);
  await probeJSON(config, source, args);
  await assert.rejects(probeJSON(config, source, args, undefined, reject), /invalid timestamp/);
  assert.equal(await calls(), 4);
}));

test('a source modified during a probe is not cached under its earlier identity', async () => fixture(async ({ dir, source, config, args, calls }) => {
  const runner = args[0];
  await fs.appendFile(runner, `require('node:fs').appendFileSync(process.argv[3], 'changed');`);
  await probeJSON(config, source, args);
  await probeJSON(config, source, args);
  assert.equal(await calls(), 2);
  assert.deepEqual(await fs.readdir(path.join(dir, 'probe-v1')), []);
}));


test('cache publication enforces both count and total byte budgets', async () => fixture(async ({ dir, source, config, args, calls }) => {
  const root = path.join(dir, 'probe-v1'); await fs.mkdir(root);
  for (let i = 0; i < MAX_ENTRIES + 8; i++) {
    const file = path.join(root, i.toString(16).padStart(64, '0') + '.json');
    const handle = await fs.open(file, 'w'); await handle.truncate(512 * 1024); await handle.close();
    await fs.utimes(file, 1, 1);
  }
  await probeJSON(config, source, args);
  const names = await fs.readdir(root);
  assert.ok(names.length <= MAX_ENTRIES);
  const sizes = await Promise.all(names.map(async name => (await fs.stat(path.join(root, name))).size));
  assert.ok(sizes.reduce((a, b) => a + b, 0) <= MAX_TOTAL_BYTES);
  await probeJSON(config, source, args);
  assert.equal(await calls(), 1);
}));
