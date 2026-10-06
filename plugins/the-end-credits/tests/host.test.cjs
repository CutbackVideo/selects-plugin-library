// plugins/the-end-credits/tests/host.test.cjs (run: node plugins/the-end-credits/tests/host.test.cjs)
// The panel's host block (panel.tsx between // tec-host:start and // tec-host:end) evaluated as plain JS in node:vm
// with a fake window.parent.__DI__ built on node:fs/node:path and a fake Runtime that runs the real ffmpeg/ffprobe
// (TEC_FFMPEG_DIR, else PATH; those cases are skipped with a note when neither has them). Also the beat worker block:
// its source, built from the shipped kit detector (kit-beat-detect.cjs), runs in a bare vm "worker" and answers like
// the plugin's beat-detect.cjs. Adapted from Selfie Aesthetic's tests/host.test.cjs.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), vm = require('node:vm');
const assert = require('node:assert/strict');
const { execFile, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// ---- sources ----
const panel = fs.readFileSync(path.join(root, 'panel.tsx'), 'utf8');
const between = (start, end) => {
  const a = panel.indexOf('\n' + start + '\n'), b = panel.indexOf('\n' + end + '\n', a + 1);
  assert.ok(a >= 0 && b > a, 'markers ' + start);
  return panel.slice(a + 1, b);
};
const block = between('// tec-host:start', '// tec-host:end');
const workerBlock = between('// tec-beat-worker:start', '// tec-beat-worker:end');
const planner = fs.readFileSync(path.join(root, 'planner.js'), 'utf8');
const API = ['tecHostDI', 'tecHostHas', 'tecHostNeed', 'tecHostCanRead', 'tecHostJoin', 'tecHostSkillsDir', 'tecHostDataDir', 'tecHostFFmpeg', 'tecHostFFprobe',
  'tecHostProbeSeconds', 'tecHostBytes', 'tecHostReadBytes', 'tecHostReadText', 'tecHostRemove', 'tecHostFFmpegBytes', 'tecHostDecodePcm', 'tecHostPeaks', 'tecHostPreviewUrl'];
const kitText = fs.readFileSync(path.join(root, 'kit-beat-detect.cjs'), 'utf8');

// ---- tools ----
const toolDir = process.env.TEC_FFMPEG_DIR || '';
const tool = (name) => (toolDir ? path.join(toolDir, name) : name);
const hasTool = (name) => { try { return spawnSync(tool(name), ['-version'], { stdio: 'ignore' }).status === 0; } catch (e) { return false; } };
const HAVE_FF = hasTool('ffmpeg') && hasTool('ffprobe');
function runTool(name, args, signal) {
  return new Promise((resolve, reject) => {
    execFile(tool(name), args, { signal, maxBuffer: 64 << 20, encoding: 'utf8' }, (err, stdout, stderr) => {
      if (err) { err.stderr = stderr; reject(err); } else resolve({ stdout, stderr });
    });
  });
}

// ---- vm sandbox ----
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tec-host-'));
const HOME = path.join(tmp, 'home dir');
fs.mkdirSync(HOME, { recursive: true });
function realFS(overrides) {
  return Object.assign({
    join: path.join, homedir: () => HOME, mkdirSync: fs.mkdirSync, existsSync: fs.existsSync,
    readFileSync: fs.readFileSync, readFile: fs.promises.readFile, unlinkSync: fs.unlinkSync, remove: async (p) => fs.promises.unlink(p),
  }, overrides || {});
}
function realRT(overrides) {
  return Object.assign({
    getPlatform: () => process.platform,
    runFFmpeg: (args, quiet, signal) => runTool('ffmpeg', args, signal),
    runFFprobe: (args, quiet, signal) => runTool('ffprobe', args, signal),
  }, overrides || {});
}
function sandbox(di, opts) {
  opts = opts || {};
  const blobs = [];
  let urls = 0;
  class Blob { constructor(parts, o) { this.parts = parts; this.type = (o && o.type) || ''; this.size = parts.reduce((n, p) => n + p.byteLength, 0); } }
  const box = { setTimeout, clearTimeout, AbortController, Blob, TextDecoder,
    URL: { createObjectURL: (b) => { blobs.push(b); return 'blob:tec/' + (++urls); }, revokeObjectURL() {} } };
  box.window = opts.where === 'self' ? { parent: {}, __DI__: di } : { parent: { __DI__: di } };
  vm.createContext(box);
  vm.runInContext(block + ';globalThis.H={' + API.join(',') + '};', box);
  return { H: box.H, box, blobs };
}
async function rejectsCode(p, code) {
  let err = null;
  try { await p; } catch (e) { err = e; }
  assert.ok(err, 'expected rejection ' + code);
  assert.equal(err.message, code);
  return err;
}
function throwsCode(fn, code) {
  let err = null;
  try { fn(); } catch (e) { err = e; }
  assert.ok(err, 'expected throw ' + code);
  assert.equal(err.message, code);
  return err;
}

// ---- fixtures: WAVs written in JS; names with a space and Hangul built from code points ----
function writeWav(file, sr, samples) {
  const n = samples.length, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2);
  fs.writeFileSync(file, buf);
}
function clickTrack(bpm, first, seconds, sr) {
  const x = new Float32Array(Math.round(seconds * sr));
  for (let t = first; t < seconds; t += 60 / bpm) {
    const i0 = Math.round(t * sr);
    for (let k = 0; k < 400 && i0 + k < x.length; k++) x[i0 + k] += Math.sin(2 * Math.PI * 1000 * k / sr) * Math.exp(-k / 80);
  }
  return x;
}
const KO = String.fromCodePoint(0xC74C, 0xC545);
const media = path.join(tmp, 'my ' + KO + ' track (1).wav');
const SR_IN = 44100;
writeWav(media, SR_IN, Float32Array.from({ length: 2 * SR_IN }, (_, i) => 0.5 * Math.sin(2 * Math.PI * 440 * i / SR_IN)));
const clicks = path.join(tmp, 'clicks ' + KO + '.wav');
writeWav(clicks, SR_IN, clickTrack(120, 0.5, 30, SR_IN));
const lsData = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir) : []);

// ---- static ----
test('block is plain JS with no host shell and no hand-built paths', () => {
  for (const name of API) assert.ok(new RegExp('function ' + name + '\\(').test(block), 'defines ' + name);
  for (const bad of ['runShell', '/tmp', '~/', '$HOME', '%USERPROFILE%', 'process.env', 'require(', 'import '])
    assert.ok(!block.includes(bad), 'block must not contain ' + bad);
  assert.ok(!/\+\s*["'`][\\/]+["'`]/.test(block) && !/["'`][\\/]+["'`]\s*\+/.test(block), 'no "/" path concatenation');
  assert.ok(!/:\s*(string|number|boolean|any)\b|\bas any\b|\binterface\s/.test(block), 'no TS-only syntax');
});

// ---- cross-realm bytes (regression: Archive Vlog's first panel open could read no file) ----
test('bytes from another realm (window.parent FileSystem results) decode', async () => {
  const want = [104, 105, 0, 255];
  const cases = {
    'Uint8Array': vm.runInNewContext('new Uint8Array([104, 105, 0, 255])'),
    'offset Uint8Array view': vm.runInNewContext('new Uint8Array(new Uint8Array([9, 104, 105, 0, 255, 9]).buffer, 1, 4)'),
    'ArrayBuffer': vm.runInNewContext('new Uint8Array([104, 105, 0, 255]).buffer'),
    'DataView': vm.runInNewContext('new DataView(new Uint8Array([104, 105, 0, 255]).buffer)'),
    'Node Buffer (main realm)': Buffer.from(want),
    'IPC Buffer shape': vm.runInNewContext('({ type: "Buffer", data: [104, 105, 0, 255] })'),
    'plain array': vm.runInNewContext('[104, 105, 0, 255]'),
    'index-keyed array-like': vm.runInNewContext('({ length: 4, 0: 104, 1: 105, 2: 0, 3: 255 })'),
  };
  const { H } = sandbox(undefined);
  for (const [name, raw] of Object.entries(cases)) {
    if (!name.startsWith('Node')) assert.ok(!(raw instanceof Uint8Array) && !(raw instanceof ArrayBuffer), name + ' is foreign to this realm');
    assert.deepEqual(Array.from(H.tecHostBytes(raw)), want, name + ' decodes to the same bytes');
  }
  const out = H.tecHostBytes(cases['offset Uint8Array view']);
  assert.equal(out.byteOffset, 0);
  assert.equal(out.buffer.byteLength, 4, 'a fresh 0-offset copy (safe for a Float32Array view and a transfer)');
  assert.equal(H.tecHostBytes(null).byteLength, 0);
  // readText through a FileSystem whose results come from another realm: bytes (Uint8Array / ArrayBuffer) and text.
  const json = '{"a":1,"ko":"' + KO + '"}';
  const enc = Array.from(Buffer.from(json, 'utf8'));
  for (const [name, make] of [['Uint8Array', () => vm.runInNewContext('new Uint8Array(' + JSON.stringify(enc) + ')')],
    ['ArrayBuffer', () => vm.runInNewContext('new Uint8Array(' + JSON.stringify(enc) + ').buffer')], ['string', () => json]]) {
    for (const sync of [true, false]) {
      const FileSystem = sync ? { join: path.join, readFileSync: make } : { join: path.join, readFile: async () => make() };
      const { H: R } = sandbox({ FileSystem });
      const got = JSON.parse(await R.tecHostReadText(R.tecHostJoin(tmp, 'assets', 'cues', 'manifest.json')));
      assert.deepEqual(got, { a: 1, ko: KO }, 'readText ' + name + (sync ? ' (sync)' : ' (async)'));
    }
  }
});

// ---- missing host ----
test('missing __DI__ or members -> host_tools, never a crash', async () => {
  const { H } = sandbox(undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(H.tecHostDI())), { fs: null, rt: null });
  const has = H.tecHostHas(['fs.join', 'rt.runFFmpeg']);
  assert.equal(has.ok, false);
  assert.deepEqual(Array.from(has.missing), ['fs.join', 'rt.runFFmpeg']);
  assert.equal(H.tecHostCanRead(), false);
  throwsCode(() => H.tecHostDataDir('x'), 'host_tools');
  throwsCode(() => H.tecHostSkillsDir('x', 'planner.js'), 'host_tools');
  throwsCode(() => H.tecHostJoin('a', 'b'), 'host_tools');
  await rejectsCode(H.tecHostReadText('x'), 'host_tools');
  await rejectsCode(H.tecHostFFmpeg(['-version']), 'host_tools');
  await rejectsCode(H.tecHostFFprobe(['-version']), 'host_tools');
  await rejectsCode(H.tecHostProbeSeconds(media), 'host_tools');
  await rejectsCode(H.tecHostDecodePcm(media, tmp, 22050, 10), 'host_tools');
  await rejectsCode(H.tecHostPeaks(media, tmp, 400), 'host_tools');
  await rejectsCode(H.tecHostPreviewUrl(media, 0, 1, 0.5, tmp), 'host_tools');
  await H.tecHostRemove(path.join(tmp, 'nothing'));
  // Partial hosts: no reader, no data folder: ffmpeg never starts.
  let ran = 0;
  const partial = sandbox({ FileSystem: realFS({ mkdirSync: undefined, readFileSync: undefined, readFile: undefined }),
    Runtime: { runFFmpeg: async () => { ran++; return { stdout: '', stderr: '' }; } } }).H;
  assert.deepEqual(Array.from(throwsCode(() => partial.tecHostDataDir('x'), 'host_tools').missing), ['fs.mkdirSync']);
  await rejectsCode(partial.tecHostFFprobe(['-version']), 'host_tools');
  await rejectsCode(partial.tecHostDecodePcm(media, tmp, 22050, 10), 'host_tools');
  await rejectsCode(partial.tecHostPreviewUrl(media, 0, 1, 0.5, tmp), 'host_tools');
  const noData = sandbox({ FileSystem: realFS(), Runtime: { runFFmpeg: async () => { ran++; return {}; } } }).H;
  await rejectsCode(noData.tecHostPeaks(media, null, 400), 'host_tools');
  assert.equal(ran, 0, 'ffmpeg not started without a reader or a data folder');
  // window.__DI__ is accepted when window.parent has none; a throwing window.parent does not escape tecHostDI.
  assert.equal(sandbox({ FileSystem: realFS(), Runtime: realRT() }, { where: 'self' }).H.tecHostHas(['fs.join', 'rt.runFFmpeg']).ok, true);
  const box = { window: {} };
  Object.defineProperty(box.window, 'parent', { get() { throw new Error('SecurityError'); } });
  vm.createContext(box);
  vm.runInContext(block + ';globalThis.D=tecHostDI();', box);
  assert.equal(box.D.fs, null);
});

test('timeouts and tool failures map to timeout / media_failed', async () => {
  const hung = (args, quiet, signal) => new Promise((resolve, reject) => { signal.addEventListener('abort', () => reject(new Error('aborted'))); });
  const { H } = sandbox({ FileSystem: realFS(), Runtime: { runFFmpeg: hung, runFFprobe: hung } });
  await rejectsCode(H.tecHostFFmpeg(['-i', 'x'], { timeoutMs: 50 }), 'timeout');
  await rejectsCode(H.tecHostFFprobe(['-i', 'x'], { timeoutMs: 50 }), 'timeout');
  const failing = sandbox({ FileSystem: realFS(), Runtime: {
    runFFmpeg: async () => { const e = new Error('ffmpeg exited 1'); e.stderr = 'No such file'; throw e; },
    runFFprobe: async () => ({ stdout: '{}', stderr: '' }) } }).H;
  assert.match((await rejectsCode(failing.tecHostFFmpeg(['-i', 'x']), 'media_failed')).detail, /No such file/);
  await rejectsCode(failing.tecHostProbeSeconds('x'), 'media_failed');
});

test('ffmpeg that writes nothing maps to media_failed and leaves no file', async () => {
  for (const write of [false, true]) {
    const s = sandbox({ FileSystem: realFS(), Runtime: { runFFmpeg: async (args) => { if (write) fs.writeFileSync(args[args.length - 1], ''); return {}; } } });
    const dir = s.H.tecHostDataDir('no-output-' + write);
    const e = await rejectsCode(s.H.tecHostDecodePcm(path.join(tmp, 'in.wav'), dir, 22050, 10), 'media_failed');
    assert.ok(e.detail && e.detail.length);
    await rejectsCode(s.H.tecHostPreviewUrl(path.join(tmp, 'in.wav'), 0, 1, 0.5, dir), 'media_failed');
    assert.deepEqual(fs.readdirSync(dir), [], 'nothing left behind');
  }
});

// ---- paths ----
test('skills dir (marker file), data dir, joins and ASCII temporary names', async () => {
  const { H } = sandbox({ FileSystem: realFS(), Runtime: realRT() });
  const skill = path.join(HOME, '.selects', 'skills', 'the-end-credits');
  assert.equal(H.tecHostSkillsDir('the-end-credits', 'planner.js'), null, 'no folder yet');
  fs.mkdirSync(skill, { recursive: true });
  assert.equal(H.tecHostSkillsDir('the-end-credits', 'planner.js'), null, 'folder without planner.js');
  fs.writeFileSync(path.join(skill, 'planner.js'), '');
  assert.equal(H.tecHostSkillsDir('the-end-credits', 'planner.js'), skill);
  const data = path.join(HOME, '.selects', 'plugin-data', 'the-end-credits');
  assert.equal(H.tecHostDataDir('the-end-credits'), data);
  assert.ok(fs.statSync(data).isDirectory());
  assert.equal(H.tecHostDataDir('the-end-credits'), data, 'idempotent');
  // A Windows host's join (backslashes) is used as is.
  const win = sandbox({ FileSystem: { join: (...p) => p.join('\\') } }).H;
  assert.equal(win.tecHostJoin('C:\\Users\\' + KO, 'assets', 'cues', 'a.mp3'), 'C:\\Users\\' + KO + '\\assets\\cues\\a.mp3');
  // The temporary file ffmpeg writes has an ASCII name in the data folder.
  let seen = null;
  const spy = sandbox({ FileSystem: realFS(), Runtime: { runFFmpeg: async (args) => { seen = args[args.length - 1]; fs.writeFileSync(seen, 'x'); return {}; } } }).H;
  await spy.tecHostFFmpegBytes((out) => ['-i', 'in', out], data, 'u8');
  assert.equal(path.dirname(seen), data);
  assert.match(path.basename(seen), /^tmp-[a-z0-9]+\.u8$/);
  assert.deepEqual(lsData(data), []);
  // Removers: whichever the host has (unlinkSync, removeFile, remove, rmSync, unlink).
  for (const only of ['unlinkSync', 'removeFile', 'remove', 'rmSync', 'unlink']) {
    const f = path.join(data, 'r-' + only);
    fs.writeFileSync(f, 'x');
    const impl = { unlinkSync: fs.unlinkSync, removeFile: async ({ filePath }) => fs.promises.unlink(filePath), remove: async (p) => fs.promises.unlink(p),
      rmSync: fs.rmSync, unlink: async (p) => fs.promises.unlink(p) };
    await sandbox({ FileSystem: { [only]: impl[only] } }).H.tecHostRemove(f);
    assert.ok(!fs.existsSync(f), 'removed with ' + only);
  }
});

// ---- the beat worker (kit detector, unmodified) ----
function runWorker(source, samples, rate) {
  let reply = null;
  const self = { postMessage: (m) => { reply = m; } };
  const box = { self, Math, Float32Array, Float64Array, Int32Array, Uint8Array, Array, Number, Object, JSON, Infinity, NaN, String, Error };
  vm.createContext(box);
  vm.runInContext(source, box);
  const buf = samples.buffer.slice(samples.byteOffset, samples.byteOffset + samples.byteLength);
  self.onmessage({ data: { id: 1, buf, rate } });
  return reply;
}
test('beat worker: the kit detector runs unmodified in a bare worker and matches the plugin detector', () => {
  const box = {};
  vm.createContext(box);
  vm.runInContext(workerBlock + ';globalThis.W={TEC_PCM_RATE,TEC_PCM_SECONDS,TEC_BEAT_TIMEOUT_MS,tecBeatWorkerSource};', box);
  const W = box.W;
  assert.equal(W.TEC_PCM_RATE, 22050);
  assert.ok(W.TEC_PCM_SECONDS >= 240 && W.TEC_BEAT_TIMEOUT_MS >= 60000);
  // The shipped kit copy has none of the plugin's dev-only additions.
  assert.ok(!/minBpm|maxBpm/.test(kitText) && /^module\.exports = \{ analyze, sixteenthRatio, bandOnsets, bandFlux, takeFlip \};$/m.test(kitText), 'kit-beat-detect.cjs is the kit file, not the plugin variant');
  assert.ok(/require\.main === module/.test(kitText), 'the CLI guard the shim disables');
  const samples = clickTrack(120, 0.5, 30, 22050);
  const reply = runWorker(W.tecBeatWorkerSource(kitText), samples, 22050);
  assert.equal(reply.ok, true, String(reply.error));
  const plugin = require(path.join(root, 'beat-detect.cjs')).analyze(samples, 22050);
  assert.equal(JSON.stringify(reply.result), JSON.stringify(plugin), 'worker (kit) === plugin beat-detect.cjs');
  assert.ok(Math.abs(reply.result.bpm - 120) <= 1 && reply.result.accepted === true);
  // A detector error comes back as { ok: false, error }, never a throw in the worker.
  const bad = runWorker(W.tecBeatWorkerSource('module.exports = { analyze() { throw new Error("boom"); } };'), samples, 22050);
  assert.deepEqual({ ok: bad.ok, error: bad.error }, { ok: false, error: 'boom' });
});

// ---- real ffmpeg through the fake host ----
const ffTest = (name, fn) => test(name, async () => {
  if (!HAVE_FF) { console.log('  SKIP (no ffmpeg/ffprobe; set TEC_FFMPEG_DIR or install them): ' + name); return 'skip'; }
  return fn();
});
ffTest('probe seconds', async () => {
  const { H } = sandbox({ FileSystem: realFS(), Runtime: realRT() });
  assert.ok(Math.abs((await H.tecHostProbeSeconds(media)) - 2) <= 0.05);
  await rejectsCode(H.tecHostProbeSeconds(path.join(tmp, 'missing.wav')), 'media_failed');
});
ffTest('decode PCM (sync, async and ArrayBuffer readers) leaves no file; feeds the worker', async () => {
  const readers = {
    buffer: realFS(),
    arraybuffer: realFS({ readFileSync: (p) => { const b = fs.readFileSync(p); return vm.runInNewContext('(b) => new Uint8Array(b).buffer')(b); } }),
    asyncOnly: realFS({ readFileSync: undefined }),
  };
  for (const [name, FileSystem] of Object.entries(readers)) {
    const { H } = sandbox({ FileSystem, Runtime: realRT() });
    const dir = H.tecHostDataDir('pcm-' + name);
    const pcm = await H.tecHostDecodePcm(media, dir, 22050, 360);
    assert.equal(Object.prototype.toString.call(pcm), '[object Float32Array]', name);
    assert.ok(Math.abs(pcm.length - 44100) <= 64, name + ' length ' + pcm.length);
    assert.deepEqual(lsData(dir), [], name + ' leaves nothing behind');
    assert.ok(Math.abs((await H.tecHostDecodePcm(media, dir, 22050, 1)).length - 22050) <= 64, name + ' maxSeconds');
  }
  const { H } = sandbox({ FileSystem: realFS(), Runtime: realRT() });
  const box = {};
  vm.createContext(box);
  vm.runInContext(workerBlock + ';globalThis.S=tecBeatWorkerSource;', box);
  const reply = runWorker(box.S(kitText), await H.tecHostDecodePcm(clicks, H.tecHostDataDir('e2e'), 22050, 360), 22050);
  assert.ok(Math.abs(reply.result.bpm - 120) <= 1 && Math.abs(reply.result.firstBeat - 0.5) <= 0.03, JSON.stringify([reply.result.bpm, reply.result.firstBeat]));
});
ffTest('waveform peaks and motion frames through the host ffmpeg', async () => {
  const { H } = sandbox({ FileSystem: realFS(), Runtime: realRT() });
  const dir = H.tecHostDataDir('peaks');
  const peaks = await H.tecHostPeaks(media, dir, 400);
  assert.equal(peaks.length, 400);
  assert.ok(Math.max(...peaks) > 0.4 && Math.max(...peaks) < 0.6, 'peak ' + Math.max(...peaks));
  assert.deepEqual(lsData(dir), []);
  // Motion: planner tecMotionArgs into the data folder, tecMotionCurve on the bytes (the panel's measureMotion).
  const video = path.join(tmp, 'clip ' + KO + '.mp4');
  await runTool('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=25:duration=2', '-pix_fmt', 'yuv420p', video]);
  const P = {};
  vm.createContext(P);
  vm.runInContext(planner + ';globalThis.M={tecMotionArgs,tecMotionCurve};', P);
  const curve = P.M.tecMotionCurve(await H.tecHostFFmpegBytes((out) => P.M.tecMotionArgs(video, out), dir, 'gray'));
  assert.equal(curve.times.length, 7, '8 frames at 4 fps -> 7 differences');
  assert.equal(curve.times[0], 0.25);
  assert.ok(curve.values.every((v) => v > 0), 'testsrc moves');
  assert.deepEqual(lsData(dir), []);
});
ffTest('preview blob URL, mp3 with WAV fallback, no file left', async () => {
  const s = sandbox({ FileSystem: realFS(), Runtime: realRT() });
  const dir = s.H.tecHostDataDir('preview');
  assert.equal(await s.H.tecHostPreviewUrl(media, 0.5, 1, 0.5, dir), 'blob:tec/1');
  assert.equal(s.blobs[0].type, 'audio/mpeg');
  assert.ok(s.blobs[0].size > 1000, 'mp3 bytes ' + s.blobs[0].size);
  assert.deepEqual(lsData(dir), []);
  const noLame = sandbox({ FileSystem: realFS(), Runtime: realRT({
    runFFmpeg: (args, quiet, signal) => (args.includes('libmp3lame') ? Promise.reject(new Error('Unknown encoder')) : runTool('ffmpeg', args, signal)) }) });
  await noLame.H.tecHostPreviewUrl(media, 0, 1, 0.5, dir);
  assert.equal(noLame.blobs[0].type, 'audio/wav');
  assert.deepEqual(lsData(dir), []);
  await rejectsCode(s.H.tecHostPreviewUrl(path.join(tmp, 'missing.wav'), 0, 1, 0.5, dir), 'media_failed');
  assert.deepEqual(lsData(dir), []);
});

(async () => {
  let failed = 0, skipped = 0;
  for (const t of tests) {
    try {
      if ((await t.fn()) === 'skip') skipped++; else console.log('ok   ' + t.name);
    } catch (e) {
      failed++;
      console.log('FAIL ' + t.name + '\n' + (e && e.stack || e));
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log((failed ? 'host tests FAILED: ' + failed : 'host tests passed') + ' (' + tests.length + ' tests, ' + skipped + ' skipped, ffmpeg ' + (HAVE_FF ? (toolDir || 'PATH') : 'absent') + ')');
  process.exit(failed ? 1 : 0);
})();
