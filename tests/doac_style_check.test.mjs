// DOAC Style on Windows: the panel's layout recovery asks the Worker engine to
// 'check' each trial (lay out and validate every scene, draw nothing) instead of a
// full compile. This shows check refuses exactly when compile refuses before it
// draws, with the same Python error, and that the panel's own compileWithRecovery
// picks the same templates through check as through full compiles, with only the
// first and the final compile drawing frames.
// DOAC_FIXTURE_DIR=<dir of revision-*/job.json> also replays real drafts (slow).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN = path.join(ROOT, 'plugins/doac-style');
const AP = path.join(PLUGIN, 'approved');
const golden = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/doac-style/parity.json'), 'utf8'));

// The Worker blob and its inputs, as tests/doac_style_parity.test.mjs builds them.
const panel = fs.readFileSync(path.join(PLUGIN, 'panel.tsx'), 'utf8');
const names = [...panel.match(/const ENGINE_DATA=\[([^\]]*)\]/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
const files = Object.fromEntries(names.map(n => [n, fs.readFileSync(path.join(AP, n), 'utf8')]));
const b64 = p => new Uint8Array(Buffer.from(fs.readFileSync(path.join(AP, p), 'utf8'), 'base64'));
const fonts = { 'permanent-marker': b64('native/fonts/permanentmarker/PermanentMarker-Regular.ttf.b64') };
for (const w of ['Regular', 'Medium', 'Bold']) fonts['arimo:' + w] = b64('native/fonts/arimo/Arimo-' + w + '.ttf.b64');
const wasm = b64('web/raster.wasm.b64');
const source = [...panel.match(/\[('web\/[^\]]*)\]\.map\(read\)/)[1].matchAll(/'([^']+)'/g)].map(m => fs.readFileSync(path.join(AP, m[1]), 'utf8')).join('\n;\n');
const runBlob = self => new Function('self', 'module', source + '\n;return typeof doacEngine === "function" ? doacEngine : null;')(self, self ? undefined : { exports: {} });
const engine = runBlob(undefined)({ wasm, files, fonts, useSystem: false });

// Synthetic jobs, as plugins/doac-style/dev/parity/make_jobs.py writes them.
function makeJob(fps, scenes, speed = 0.3, gap = 2) {
  const words = [], editorial = [];
  let t = 6;
  const add = (w, min, a, b) => { const dur = Math.max(min, Math.round(fps * speed * (a + b * w.length))); words.push({ text: w, start: t, end: t + dur }); t += dur + gap; };
  for (const sc of scenes) {
    if (sc[0] === 'plain') {
      const a = words.length;
      for (const w of sc[1].split(/\s+/)) add(w, 4, 0.12, 0.045);
      editorial.push({ words: [a, words.length - 1], kind: 'plain' });
    } else {
      const [, tid, groups, texts, order] = sc;
      const a = words.length, spans = [];
      for (const g of groups) { const s = words.length; for (const w of g.split(/\s+/)) add(w, 5, 0.16, 0.05); spans.push([s, words.length - 1]); }
      const e = { words: [a, words.length - 1], kind: 'emphasis', template: tid, slots: (order || groups.map((_, i) => i)).map(i => spans[i]), focusSlot: 0 };
      if (texts) e.texts = texts;
      editorial.push(e);
    }
    t += 3;
  }
  return { input: { fps, frames: t + 12, words }, editorial };
}
const TPL = {
  '06': ['kids', 'with', 'bigger', 'dreams', 'of', 'new', 'worlds'],
  '09': ['and', 'they', 'just', 'signed', 'a', 'deal'],
  '11': ['and', 'would', 'you', 'be', 'dreaming', 'about'],
  '13': ['but', 'designing', 'the platform'],
  '19': ['why', 'does', 'this', 'happen', 'now?'],
  '21': ['this looks', 'like a', 'big win'],
  '22': ['and', 'if', 'you', 'own', 'a', 'small', 'company'],
  '23': ['that', 'achieves', 'nothing', 'except'],
  '33': ['people', 'call', 'him', 'brilliant'],
  '38': ['delay', 'the', 'launch'],
  '40': ['money'],
};
const SYNTHETIC = {
  ...Object.fromEntries(Object.entries(TPL).map(([id, g], k) => ['t' + id, makeJob([30, 24, 30000 / 1001, 25, 60][k % 5], [['plain', 'So here is the thing'], ['tpl', id, g], ['plain', 'Okay.']])])),
  t24: makeJob(30, [['tpl', '24', ['so', "let's", 'talk', 'about', 'that'], null, [1, 0, 2, 3, 4]]]),
  t05: makeJob(24, [['tpl', '05', ['three', 'things', 'you', 'should never', 'do'], ['3', 'things', 'you', 'should never', '2', 'do'], [0, 1, 2, 3, 0, 4]]]),
  'err-hierarchy-13': makeJob(30, [['tpl', '13', ['go', 'now', 'ok']]]),
  't11-long': makeJob(30, [['tpl', '11', ['and', 'would', 'you', 'be', 'dreaming', 'about absolutely everything']]]),
  't06-long': makeJob(30, [['tpl', '06', ['incredibly', 'talented', 'engineers', 'building', 'remarkable', 'software', 'everywhere']]]),
  'err-one-word': makeJob(30, [['plain', 'supercalifragilisticexpialidocious-and-beyond-everything-else-entirely-forever']]),
  'err-two-lines': makeJob(25, [['plain', 'Honestly the most important lesson I have learned in business is that consistency beats intensity']]),
  'err-mismatch': (() => { const j = makeJob(30, [['tpl', '13', ['are', 'watching', 'you']]]); j.editorial[0].texts = ['are', 'seeing', 'you']; return j; })(),
  'err-policy': (() => { const j = makeJob(30, [['tpl', '13', ['are', 'watching', 'you.']]]); j.editorial[0].template = '32'; return j; })(),
  'err-missing-word': (() => { const j = makeJob(30, [['plain', 'one two three']]); j.editorial[0].words = [0, 1]; return j; })(),
};

const plain = v => JSON.parse(JSON.stringify(v));
const refusal = e => ({ ok: false, type: e.pyType, message: e.pyMessage });

// check and compile agree: both pass (with the same records, placement and scene
// count), or both refuse with the same Python error.
async function agree(name, job) {
  let c, f, checked, full;
  try { checked = engine.checkJob(job); c = { ok: true }; } catch (e) { c = refusal(e); }
  try { full = await engine.compileJob(job); f = { ok: true }; } catch (e) { f = refusal(e); }
  assert.deepEqual(c, f, name);
  if (c.ok) {
    assert.equal(checked.scenes, full.scenes.length, name + ' scenes');
    assert.deepEqual(plain(checked.records), plain(full.records), name + ' records');
    assert.deepEqual(plain(checked.placement), plain(full.placement), name + ' placement');
  }
  return c;
}

// The parity goldens are the Python engine's full compiles: check refuses where
// they refused, with the same error, and otherwise has their records and placement.
test('check refuses exactly when the Python compile refuses (parity jobs)', () => {
  for (const { name, job, expect } of golden.jobs) {
    let r = null, err = null;
    try { r = engine.checkJob(job); } catch (e) { err = { type: e.pyType, message: e.pyMessage }; }
    assert.deepEqual(err, expect.error || null, name);
    if (r) {
      assert.equal(r.scenes, expect.scenes.length, name);
      assert.deepEqual(plain(r.records), expect.records, name);
      assert.deepEqual(plain(r.placement), expect.placement, name);
    }
  }
});

test('check refuses exactly when compile refuses (every template, every refusal)', async () => {
  const seen = { ok: 0, refused: new Set() };
  for (const [name, job] of Object.entries(SYNTHETIC)) {
    const c = await agree(name, job);
    if (c.ok) seen.ok++; else seen.refused.add(c.message);
    assert.equal(c.ok, !name.startsWith('err-'), name + ': ' + JSON.stringify(c));
  }
  assert.equal(seen.ok, 15);
  for (const m of ['This wording does not fit the reference hierarchy. Try a different phrase.', 'min() arg is an empty sequence', 'Missing/repeated/out-of-order speech', 'Template 32 needs a verified film adapter; do not silently substitute another template'])
    assert.ok(seen.refused.has(m), m);
});

test('the Worker answers check: a result, or the error compile posts', async () => {
  const posted = [];
  const self = { postMessage: m => posted.push(m) };
  runBlob(self);
  for (const name of ['t13', 'err-hierarchy-13', 'err-policy', 'err-two-lines']) {
    const job = SYNTHETIC[name];
    await self.onmessage({ data: { cmd: 'check', wasm, files, fonts, job } });
    const check = posted.splice(0);
    assert.equal(check.length, 1, 'check posts once, no progress');
    await self.onmessage({ data: { cmd: 'compile', wasm, files, fonts, job, only: null } });
    const compiled = posted.splice(0).filter(m => !m.progress);
    if (check[0].error) assert.deepEqual(plain(check[0].error), plain(compiled[0].error), name);
    else {
      assert.equal(check[0].result.ok, true, name);
      assert.equal(check[0].result.scenes, compiled[0].result.scenes.length, name);
    }
  }
});

// The panel's own compileWithRecovery, taken from panel.tsx, run with the engine:
// hostIsWindows() true sends trials to check, false to compile (as macOS does).
const recoverySource = (() => { const i = panel.indexOf(' async function compileWithRecovery(j){'); return panel.slice(i, panel.indexOf('\n }\n', i) + 3); })();
function panelRecovery(windows) {
  const counts = { compile: 0, drawn: 0, check: 0 }, status = [];
  // As panelEngine rejects: engine refusals carry the Python message and `refused`.
  const refuse = e => { throw Object.assign(Error((e.pyType === 'ValueError' || e.pyType === 'AssertionError') && e.pyMessage || 'render failed'), { code: 'render', refused: true }); };
  const compile = async j => { counts.compile++; try { const r = await engine.compileJob({ input: j.input, editorial: j.editorial }); counts.drawn++; return r; } catch (e) { refuse(e); } };
  const check = async j => { counts.check++; try { engine.checkJob({ input: j.input, editorial: j.editorial }); } catch (e) { refuse(e); } };
  const run = new Function('compile', 'check', 'hostIsWindows', 'onStatus', recoverySource + '\nreturn compileWithRecovery;')(compile, check, () => windows, s => status.push(s));
  return { run, counts, status };
}
// Five designed scenes between plain captions: two that fit, two that only a
// sibling with as many slots carries (13 -> 38, 33 -> 23), one nothing carries.
const RECOVERY = makeJob(30, [
  ['plain', 'Listen'],
  ['tpl', '13', ['go', 'now', 'ok']],
  ['tpl', '09', TPL['09']],
  ['plain', 'and so'],
  ['tpl', '13', ['a', 'b', 'c']],
  ['tpl', '33', ['a', 'b', 'c', 'd']],
  ['tpl', '38', TPL['38']],
  ['plain', 'Okay.'],
]);

test('recovery through check picks what recovery through full compiles picks', async () => {
  const win = panelRecovery(true), mac = panelRecovery(false);
  const a = await win.run(RECOVERY), b = await mac.run(RECOVERY);
  assert.deepEqual(plain(a.job.editorial), plain(b.job.editorial));
  assert.deepEqual(a.removed, b.removed);
  assert.deepEqual(plain(a.manifest.records), plain(b.manifest.records));
  assert.deepEqual(a.job.editorial.map(x => x.template || 'plain'), ['plain', '38', '09', 'plain', 'plain', '23', '38', 'plain']);
  assert.deepEqual(a.removed, [4]);
  // Windows draws twice (the first compile refuses before drawing; the final one draws), macOS once per fitting trial too.
  assert.deepEqual([win.counts.compile, win.counts.drawn], [2, 1]);
  assert.equal(win.counts.check, mac.counts.compile - 2);
  assert.ok(mac.counts.drawn > win.counts.drawn);
  assert.equal(win.status.filter(s => s.startsWith('Checking which layouts fit… ')).length, 5);
  assert.equal(win.status.at(-1), 'Checking which layouts fit… 5 of 5');
  assert.equal(mac.status.length, 0, 'macOS status unchanged');
});

test('recovery stops on a Worker failure with its own message; a refusal still means "does not fit"', async () => {
  const failing = new Function('compile', 'check', 'hostIsWindows', 'onStatus', recoverySource + '\nreturn compileWithRecovery;')(
    async j => { await engine.compileJob(j).catch(e => { throw Object.assign(Error(e.pyMessage), { refused: true }); }); },
    async () => { throw Object.assign(Error('The caption renderer could not complete this version.'), { code: 'render' }); },
    () => true, () => {});
  await assert.rejects(failing(RECOVERY), /caption renderer could not complete/);
  // A final compile that the Worker cannot finish keeps its message too.
  let n = 0;
  const finalFails = new Function('compile', 'check', 'hostIsWindows', 'onStatus', recoverySource + '\nreturn compileWithRecovery;')(
    async () => { if (n++ === 0) throw Object.assign(Error('This wording does not fit the reference hierarchy. Try a different phrase.'), { refused: true }); throw Object.assign(Error('timed out'), { code: 'render' }); },
    async () => {}, () => true, () => {});
  await assert.rejects(finalFails(RECOVERY), /timed out/);
});

const FIXTURES = process.env.DOAC_FIXTURE_DIR;
test('real drafts: check agrees with compile', { skip: !FIXTURES && 'set DOAC_FIXTURE_DIR' }, async () => {
  for (const d of fs.readdirSync(FIXTURES).filter(d => fs.existsSync(path.join(FIXTURES, d, 'job.json')))) {
    const job = JSON.parse(fs.readFileSync(path.join(FIXTURES, d, 'job.json'), 'utf8'));
    await agree(d, { input: job.input, editorial: job.editorial });
  }
});
