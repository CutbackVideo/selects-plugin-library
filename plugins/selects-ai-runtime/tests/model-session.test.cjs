'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { loadVerifiedModelBytes, createVerifiedModelSession } = require('../lib/models.cjs');

async function longModel(t, bytes) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-model-long-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const directory = path.join(root, 'model-cache-'.repeat(10), 'version-cache-'.repeat(10));
  await fs.mkdir(directory, { recursive: true });
  const file = path.join(directory, 'pinned.onnx');
  assert.ok(file.length > 260, 'fixture must exercise a path beyond Windows MAX_PATH');
  await fs.writeFile(file, bytes);
  return { path: file, sha256: createHash('sha256').update(bytes).digest('hex') };
}

test('loads checksum-verified bytes from a long path and gives those bytes to ONNX', async t => {
  const bytes = Buffer.from('model fixture'), model = await longModel(t, bytes);
  const options = { executionProviders: ['cpu'], intraOpNumThreads: 4 };
  const expected = { release: async () => {} };
  const ort = { InferenceSession: { create: async (input, provided) => {
    assert.ok(Buffer.isBuffer(input), 'native session must receive bytes rather than a filesystem path');
    assert.deepEqual(input, bytes); assert.equal(provided, options); return expected;
  } } };
  assert.deepEqual(await loadVerifiedModelBytes(model), bytes);
  assert.equal(await createVerifiedModelSession(ort, model, options), expected);
});

test('file replacement and invalid pins reject before a native session can start', async t => {
  const model = await longModel(t, Buffer.from('verified'));
  const ort = { InferenceSession: { create: () => { throw new Error('native loader must not start'); } } };
  await fs.writeFile(model.path, 'replaced');
  await assert.rejects(createVerifiedModelSession(ort, model, {}), /Model checksum mismatch/);
  await assert.rejects(loadVerifiedModelBytes({ ...model, sha256: '' }), /pinned model/);
});

const configFile = process.env.AI_RUNTIME_CONFIG;
test('real pinned ONNX model creates a native session from a path longer than MAX_PATH', {
  skip: !configFile && 'Set AI_RUNTIME_CONFIG to an existing pinned native runtime config',
}, async t => {
  const config = JSON.parse(await fs.readFile(configFile, 'utf8'));
  const source = config.models.yunet ?? config.models.rvm;
  const bytes = await loadVerifiedModelBytes(source), model = await longModel(t, bytes);
  const ort = require(config.ortModule);
  const session = await createVerifiedModelSession(ort, model, { executionProviders: ['cpu'], intraOpNumThreads: 4 });
  try { assert.ok(session.inputNames.length > 0); assert.ok(session.outputNames.length > 0); }
  finally { await session.release(); }
});
