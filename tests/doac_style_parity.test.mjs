// DOAC Style on Windows draws captions with approved/web (engine.js on FreeType +
// Pillow compiled to WebAssembly) instead of the Python engine. This replays the
// dev/parity ci-* jobs through the panel engine, loaded the way the panel's Worker
// loads it, and compares with the Python engine's goldens: records, placement and
// scene metadata equal, frame maps equal, and every unique frame byte-identical
// (SHA-256 of its RGBA crop). No Python needed: tests/fixtures/doac-style/parity.json
// comes from plugins/doac-style/dev/parity (run.sh, then fixtures.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN = path.join(ROOT, 'plugins/doac-style');
const AP = path.join(PLUGIN, 'approved');
const golden = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/doac-style/parity.json'), 'utf8'));

// What the panel sends to the Worker: the data files (panel.tsx ENGINE_DATA), the
// bundled fonts (no Windows system fonts here) and one script, as in the Worker blob.
const panel = fs.readFileSync(path.join(PLUGIN, 'panel.tsx'), 'utf8');
const names = [...panel.match(/const ENGINE_DATA=\[([^\]]*)\]/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
const files = Object.fromEntries(names.map(n => [n, fs.readFileSync(path.join(AP, n), 'utf8')]));
const b64 = p => new Uint8Array(Buffer.from(fs.readFileSync(path.join(AP, p), 'utf8'), 'base64'));
const fonts = { 'permanent-marker': b64('native/fonts/permanentmarker/PermanentMarker-Regular.ttf.b64') };
for (const w of ['Regular', 'Medium', 'Bold']) fonts['arimo:' + w] = b64('native/fonts/arimo/Arimo-' + w + '.ttf.b64');
const wasm = b64('web/raster.wasm.b64');
const source = [...panel.match(/\[('web\/[^\]]*)\]\.map\(read\)/)[1].matchAll(/'([^']+)'/g)].map(m => fs.readFileSync(path.join(AP, m[1]), 'utf8')).join('\n;\n');
// The blob runs as one script; a Function keeps its globals fast (node:vm contexts are slow).
const runBlob = self => new Function('self', 'module', source + '\n;return typeof doacEngine === "function" ? doacEngine : null;')(self, self ? undefined : { exports: {} });

function loadEngine() {
  return runBlob(undefined)({ wasm, files, fonts, useSystem: false });
}

const engine = loadEngine();
const plain = v => JSON.parse(JSON.stringify(v));

test('the Worker script answers the panel: catalogue, compile with progress, refusals', async () => {
  const posted = [];
  const self = { postMessage: (m, transfer) => posted.push({ m, transfer }) };
  runBlob(self);
  assert.equal(typeof self.onmessage, 'function');
  await self.onmessage({ data: { cmd: 'catalogue', wasm, files, fonts } });
  assert.equal(posted.pop().m.result.templates.length, 13);
  const job = { input: { fps: 30, frames: 20, words: [{ text: 'Hello', start: 0, end: 6 }, { text: 'there.', start: 8, end: 14 }] }, editorial: [{ words: [0, 1], kind: 'plain' }] };
  await self.onmessage({ data: { cmd: 'compile', wasm, files, fonts, job, only: null } });
  const last = posted.pop();
  assert.ok(posted.some(p => p.m.progress), 'progress messages');
  const r = last.m.result;
  assert.equal(r.scenes.length, 1);
  assert.equal(r.scenes[0].scene.template, 'REF-E48');
  assert.equal(r.scenes[0].payload.frameMap.length, 20);
  assert.match(r.scenes[0].payload.atlas, /^data:image\/png;base64,/);
  assert.equal(Object.prototype.toString.call(r.scenes[0].preview), '[object Uint8Array]');
  assert.equal(last.transfer.length, 1);
  assert.equal(last.transfer[0], r.scenes[0].preview.buffer);
  posted.length = 0;
  await self.onmessage({ data: { cmd: 'compile', wasm, files, fonts, job: { ...job, editorial: [{ words: [0, 1], kind: 'emphasis', template: '32', slots: [[0, 0], [1, 1]] }] } } });
  assert.deepEqual(plain(posted.pop().m.error), { pyType: 'AssertionError', pyMessage: 'Template 32 needs a verified film adapter; do not silently substitute another template', message: 'Template 32 needs a verified film adapter; do not silently substitute another template' });
});

test('catalogue equals the Python catalogue', () => {
  const c = plain(engine.catalogue());
  assert.equal(crypto.createHash('sha256').update(c.planning).digest('hex'), golden.catalogue.planningSha256);
  delete c.planning;
  const { planningSha256, ...expected } = golden.catalogue;
  assert.deepEqual(c, expected);
});

for (const { name, job, expect } of golden.jobs) {
  test('job ' + name + ' matches the Python engine', async () => {
    let r;
    try { r = await engine.compileJob(job, { keepFrames: true }); } catch (e) {
      assert.ok(expect.error, name + ': ' + e.message);
      assert.deepEqual({ type: e.pyType, message: e.pyMessage }, expect.error);
      return;
    }
    assert.ok(!expect.error, name + ' should refuse: ' + JSON.stringify(expect.error));
    assert.deepEqual(plain(r.records), expect.records);
    assert.deepEqual(plain(r.placement), expect.placement);
    assert.deepEqual([r.words, r.frames, r.fps], [expect.words, expect.frames, expect.fps]);
    assert.equal(r.scenes.length, expect.scenes.length);
    r.scenes.forEach((s, i) => {
      const e = expect.scenes[i], label = name + ' scene ' + i + ' (' + e.template + ')';
      for (const k of ['index', 'start', 'end', 'template', 'text', 'uniqueFrames']) assert.deepEqual(s.scene[k], e[k], label + ' ' + k);
      for (const k of ['frameMap', 'fps', 'x', 'y', 'w', 'h', 'cols', 'rows', 'size']) assert.deepEqual(plain(s.payload[k]), e[k], label + ' ' + k);
      assert.match(s.payload.atlas, /^data:image\/png;base64,iVBORw0KGgo/);
      assert.deepEqual([...s.uniqueCrops].map(c => crypto.createHash('sha256').update(c).digest('hex')), e.frameHashes, label + ' frames');
    });
  });
}
