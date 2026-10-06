'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const syncFs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { selectMatteSession, validateMatteFirstResult, matteSessionOptions } = require('../lib/matte-provider.cjs');

function tensor(values = [0], dims = [1, 1, 1, 1]) {
  return { type: 'float32', dims, data: Float32Array.from(values), disposed: 0,
    dispose() { this.disposed++; } };
}
function result() {
  return { pha: tensor([0.3, 0.6], [1, 1, 1, 2]), r1o: tensor(), r2o: tensor(), r3o: tensor(), r4o: tensor() };
}
async function rig(t, changes = {}) {
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'matte-provider-'));
  t.after(() => fs.rm(outputDir, { recursive: true, force: true }));
  const attempts = [], sessions = [], first = result();
  const options = {
    config: { provider: 'auto' }, ort: { listSupportedBackends: () => [{ name: 'cpu' }, { name: 'dml' }, { name: 'coreml' }] },
    model: {}, outputDir, platform: 'win32', signal: new AbortController().signal,
    createSession: async (_ort, _model, settings) => {
      attempts.push(settings.executionProviders);
      const session = { released: 0, profileEnded: 0,
        release: async () => { session.released++; },
        endProfiling: () => {
          session.profileEnded++;
          const name = settings.executionProviders[0]?.name;
          if (settings.profileFilePrefix) syncFs.writeFileSync(settings.profileFilePrefix + '_1.json', JSON.stringify([
            { cat: 'Node', name: 'model_kernel_time', dur: 20, args: { provider: name === 'coreml' ? 'CoreMLExecutionProvider' : 'DmlExecutionProvider' } },
          ]));
        } };
      sessions.push(session); return session;
    },
    runFirstFrame: async () => first,
    validateFirstFrame: value => validateMatteFirstResult(value, 2, 1, false), ...changes,
  };
  return { options, attempts, sessions, first, select: () => selectMatteSession(options) };
}

test('Windows auto keeps the verified first result and recurrent session, with bounded first-frame profile', async t => {
  const r = await rig(t), selected = await r.select();
  assert.equal(selected.selectedProvider, 'dml');
  assert.equal(selected.firstResult, r.first); assert.equal(selected.session, r.sessions[0]);
  assert.equal(selected.profileScope, 'first-source-frame');
  assert.equal(selected.placement.providers.DmlExecutionProvider.kernelEvents, 1);
  assert.equal(r.sessions[0].profileEnded, 1); assert.equal(r.sessions[0].released, 0);
  assert.deepEqual(r.attempts, [[{ name: 'dml', deviceId: 0 }]]);
});

test('Mac auto chooses the same ONNX model through CoreML CPUAndGPU MLProgram options', async t => {
  const r = await rig(t, { platform: 'darwin', config: { provider: 'auto', enableCoreMlAuto: true } }), selected = await r.select();
  assert.equal(selected.selectedProvider, 'coreml');
  assert.deepEqual(r.attempts, [[{ name: 'coreml', coreMlFlags: 0x32 }]]);
  assert.equal(selected.placement.providers.CoreMLExecutionProvider.kernelEvents, 1);
});

test('Mac keeps CPU by default until the CoreML experiment is explicitly enabled', async t => {
  const r = await rig(t, { platform: 'darwin' }), selected = await r.select();
  assert.equal(selected.selectedProvider, 'cpu');
  assert.equal(selected.providerSelectionReason, 'auto-coreml-experiment-disabled');
  assert.deepEqual(r.attempts, [['cpu']]);
});

test('missing compatible backend chooses CPU and records why', async t => {
  const r = await rig(t, { ort: { listSupportedBackends: () => [{ name: 'cpu' }] } });
  const selected = await r.select();
  assert.equal(selected.selectedProvider, 'cpu');
  assert.equal(selected.providerSelectionReason, 'auto-compatible-gpu-backend-unavailable');
  assert.deepEqual(r.attempts, [['cpu']]);
});

test('GPU session creation failure falls back once before accepting the first source frame', async t => {
  const r = await rig(t), original = r.options.createSession;
  r.options.createSession = async (...args) => {
    if (args[2].executionProviders[0]?.name === 'dml') throw new Error('device unavailable');
    return original(...args);
  };
  const selected = await r.select();
  assert.equal(selected.selectedProvider, 'cpu');
  assert.equal(selected.providerSelectionReason, 'auto-dml-initial-create-failed');
  assert.equal(selected.attempts[0].message, 'device unavailable');
  assert.equal(selected.attempts.length, 2);
});

test('first GPU inference failure releases its session and retries CPU with the same first frame', async t => {
  const r = await rig(t); let calls = 0;
  r.options.runFirstFrame = async () => { if (++calls === 1) throw new Error('unsupported kernel'); return r.first; };
  const selected = await r.select();
  assert.equal(selected.selectedProvider, 'cpu'); assert.equal(calls, 2);
  assert.equal(r.sessions[0].released, 1);
  assert.equal(selected.providerSelectionReason, 'auto-dml-initial-first-frame-failed');
});

test('invalid GPU tensor output is disposed before CPU fallback', async t => {
  const r = await rig(t), bad = result(); bad.pha.data[0] = NaN; let calls = 0;
  r.options.runFirstFrame = async () => ++calls === 1 ? bad : r.first;
  const selected = await r.select();
  assert.equal(selected.selectedProvider, 'cpu');
  assert.ok(Object.values(bad).every(value => value.disposed === 1));
});

test('a GPU session with no observed accelerated kernel is not reported as GPU execution', async t => {
  const r = await rig(t), original = r.options.createSession;
  r.options.createSession = async (...args) => {
    const session = await original(...args);
    session.endProfiling = () => {
      if (args[2].profileFilePrefix) syncFs.writeFileSync(args[2].profileFilePrefix + '_1.json', JSON.stringify([]));
    };
    return session;
  };
  const selected = await r.select();
  assert.equal(selected.selectedProvider, 'cpu');
  assert.equal(selected.providerSelectionReason, 'auto-dml-initial-profile-failed');
});

test('cancel during the first GPU inference never starts a CPU retry', async t => {
  const controller = new AbortController(), r = await rig(t, { signal: controller.signal });
  r.options.runFirstFrame = async () => { controller.abort(); return r.first; };
  await assert.rejects(r.select(), { code: 'JOB_CANCELED' });
  assert.equal(r.attempts.length, 1); assert.equal(r.sessions[0].released, 1);
});

test('explicit GPU failure remains a failure and explicit CPU never probes a GPU', async t => {
  const r = await rig(t, { config: { provider: 'dml' }, runFirstFrame: async () => { throw new Error('GPU failed'); } });
  await assert.rejects(r.select(), /GPU failed/); assert.equal(r.attempts.length, 1);
  const cpu = await rig(t, { config: { provider: 'cpu' } });
  assert.equal((await cpu.select()).selectedProvider, 'cpu'); assert.deepEqual(cpu.attempts, [['cpu']]);
});

test('invalid configuration and malformed recurrent tensors reject before publication', async t => {
  const r = await rig(t, { config: { provider: 'auto', deviceId: -1 } });
  await assert.rejects(r.select(), /deviceId/); assert.equal(r.attempts.length, 0);
  const bad = result(); bad.r2o.dims = [1, 0, 1, 1];
  assert.throws(() => validateMatteFirstResult(bad, 2, 1, false), /tensor contract/);
  assert.equal(matteSessionOptions({}, 'dml').enableMemPattern, false);
});
