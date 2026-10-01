// plugins/selfie-aesthetic/tests/host.test.cjs (run: node plugins/selfie-aesthetic/tests/host.test.cjs)
// The panel's host block (dev/host-block.ts) evaluated as plain JS in node:vm with a fake window.parent.__DI__ built
// on node:fs/node:path and a fake Runtime that runs the real ffmpeg/ffprobe (SAE_FFMPEG_DIR, else PATH; the ffmpeg
// cases are skipped with a note when neither has them). Also checks that the beat detector core (beat-detect.cjs up
// to module.exports) is browser-safe: it runs in a bare vm context with no require/module/process.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), vm = require('node:vm');
const assert = require('node:assert/strict');
const { execFile, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// ---- sources ----
const hostSrc = fs.readFileSync(path.join(root, 'dev', 'host-block.ts'), 'utf8');
const ha = hostSrc.indexOf('// sae-host:start'), hz = hostSrc.indexOf('// sae-host:end');
assert.ok(ha >= 0 && hz > ha, 'host block markers');
const block = hostSrc.slice(ha, hz);
const API = ['saeDI', 'saeHas', 'saePlatform', 'saeSkillsDir', 'saeDataDir', 'saeFFmpeg', 'saeFFprobe', 'saeProbeDuration',
  'saeDecodePcm', 'saePreviewUrl', 'saeSamePath', 'saeBaseName', 'saeYield'];

const beatSrc = fs.readFileSync(path.join(root, 'beat-detect.cjs'), 'utf8');
const bz = beatSrc.search(/^module\.exports\b/m);
assert.ok(bz > 0, 'beat-detect.cjs has a module.exports line');
const beatCore = beatSrc.slice(0, bz);

// ---- tools ----
const toolDir = process.env.SAE_FFMPEG_DIR || '';
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
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sae-host-'));
const HOME = path.join(tmp, 'home dir');
fs.mkdirSync(HOME, { recursive: true });

function realFS(overrides) {
  return Object.assign({
    join: path.join, homedir: () => HOME, mkdirSync: fs.mkdirSync, existsSync: fs.existsSync,
    readFileSync: fs.readFileSync, readFile: fs.promises.readFile, writeFileSync: fs.writeFileSync,
    unlinkSync: fs.unlinkSync, removeFile: async ({ filePath }) => fs.promises.unlink(filePath),
  }, overrides || {});
}
function realRT(overrides) {
  return Object.assign({
    getPlatform: () => process.platform,
    runFFmpeg: (args, quiet, signal) => runTool('ffmpeg', args, signal),
    runFFprobe: (args, quiet, signal) => runTool('ffprobe', args, signal),
  }, overrides || {});
}

// di: the __DI__ object (or undefined); where: 'parent' | 'self'.
function sandbox(di, opts) {
  opts = opts || {};
  const blobs = [];
  let urls = 0;
  class Blob { constructor(parts, o) { this.parts = parts; this.type = (o && o.type) || ''; this.size = parts.reduce((n, p) => n + p.byteLength, 0); } }
  const box = {
    setTimeout, clearTimeout, AbortController, Blob,
    URL: { createObjectURL: (b) => { blobs.push(b); return 'blob:sae/' + (++urls); }, revokeObjectURL() {} },
    navigator: { userAgent: opts.ua || '' },
  };
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

// ---- fixtures ----
// 16-bit PCM WAV written in JS (no ffmpeg needed). The name has a space and a Hangul syllable built from code points.
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
const KO = String.fromCodePoint(0xC74C, 0xC545); // two Hangul syllables
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
  assert.ok(!/\+\s*["'`][\\/]+["'`]/.test(block), 'no + "/" path concatenation');
  assert.ok(!/["'`][\\/]+["'`]\s*\+/.test(block), 'no "/" + path concatenation');
  assert.ok(!/:\s*(string|number|boolean|any)\b|\bas any\b|\binterface\s/.test(block), 'no TS-only syntax');
});

// ---- missing host ----
test('bytes from another realm (window.parent FileSystem results) decode', () => {
  // The panel runs in an iframe; FileSystem.readFile results are created in window.parent's realm, so
  // `instanceof Uint8Array/ArrayBuffer` is false for them (this broke Archive Vlog's asset reads). Build the inputs in
  // a separate vm realm and decode them with the block loaded in yet another realm.
  const host = {};
  vm.createContext(host);
  vm.runInContext(block + ';globalThis.B=saeBytes;', host);
  const other = {};
  vm.createContext(other);
  const make = (expr) => vm.runInContext(expr, other);
  const want = [104, 105, 0, 255];
  const cases = {
    'Uint8Array': make('new Uint8Array([104, 105, 0, 255])'),
    'offset Uint8Array view': make('new Uint8Array(new Uint8Array([9, 104, 105, 0, 255, 9]).buffer, 1, 4)'),
    'ArrayBuffer': make('new Uint8Array([104, 105, 0, 255]).buffer'),
    'DataView': make('new DataView(new Uint8Array([104, 105, 0, 255]).buffer)'),
    'Node Buffer (main realm)': Buffer.from(want),
    'IPC Buffer shape': make('({ type: "Buffer", data: [104, 105, 0, 255] })'),
    'plain array': make('[104, 105, 0, 255]'),
    'index-keyed array-like': make('({ length: 4, 0: 104, 1: 105, 2: 0, 3: 255 })'),
  };
  for (const [name, raw] of Object.entries(cases)) {
    assert.ok(!(raw instanceof Uint8Array) || name.startsWith('Node'), name + ' is foreign to this realm');
    assert.deepEqual(Array.from(host.B(raw)), want, name + ' decodes to the same bytes');
  }
  // The result is the block realm's own fresh, 0-offset copy (safe for a Float32Array view and a transfer).
  const out = host.B(cases['offset Uint8Array view']);
  assert.equal(out.byteOffset, 0);
  assert.equal(out.buffer.byteLength, 4);
  assert.equal(Object.prototype.toString.call(out), '[object Uint8Array]');
  // Text assets: UTF-8 decoding of foreign bytes works end to end (the panel's decodeText path).
  const text = new TextDecoder().decode(host.B(make('new Uint8Array([123, 34, 97, 34, 58, 49, 125])')));
  assert.equal(JSON.parse(text).a, 1);
  assert.equal(host.B(null).byteLength, 0);
});

test('missing __DI__ or members -> host_tools', async () => {
  const { H } = sandbox(undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(H.saeDI())), { fs: null, rt: null });
  const has = H.saeHas(['fs.join', 'rt.runFFmpeg']);
  assert.equal(has.ok, false);
  assert.deepEqual(Array.from(has.missing), ['fs.join', 'rt.runFFmpeg']);
  throwsCode(() => H.saeDataDir('x'), 'host_tools');
  throwsCode(() => H.saeSkillsDir('x'), 'host_tools');
  await rejectsCode(H.saeFFmpeg(['-version']), 'host_tools');
  await rejectsCode(H.saeFFprobe(['-version']), 'host_tools');
  await rejectsCode(H.saeProbeDuration(media), 'host_tools');
  await rejectsCode(H.saeDecodePcm(media, tmp), 'host_tools');
  await rejectsCode(H.saePreviewUrl(media, 0, 1, tmp), 'host_tools');

  // Partial hosts: FileSystem without mkdirSync; Runtime without runFFprobe; no file reader at all. The reader is
  // checked before ffmpeg runs, so nothing is written.
  let ran = 0;
  const partial = sandbox({ FileSystem: realFS({ mkdirSync: undefined, readFileSync: undefined, readFile: undefined }),
    Runtime: { runFFmpeg: async () => { ran++; return { stdout: '', stderr: '' }; } } }).H;
  const err = throwsCode(() => partial.saeDataDir('x'), 'host_tools');
  assert.deepEqual(Array.from(err.missing), ['fs.mkdirSync']);
  await rejectsCode(partial.saeFFprobe(['-version']), 'host_tools');
  await rejectsCode(partial.saeDecodePcm(media, tmp), 'host_tools');
  await rejectsCode(partial.saePreviewUrl(media, 0, 1, tmp), 'host_tools');
  assert.equal(ran, 0, 'ffmpeg not started without a reader');
  assert.equal(partial.saeHas(['rt.runFFmpeg', 'fs.join']).ok, true);

  // window.__DI__ is accepted when window.parent has none; a throwing window.parent does not escape saeDI.
  const self = sandbox({ FileSystem: realFS(), Runtime: realRT() }, { where: 'self' }).H;
  assert.equal(self.saeHas(['fs.join', 'rt.runFFmpeg']).ok, true);
  const box = { window: {} };
  Object.defineProperty(box.window, 'parent', { get() { throw new Error('SecurityError'); } });
  vm.createContext(box);
  vm.runInContext(block + ';globalThis.D=saeDI();', box);
  assert.equal(box.D.fs, null);
});

test('timeouts and tool failures map to timeout / media_failed', async () => {
  const hung = (args, quiet, signal) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')));
  });
  const { H } = sandbox({ FileSystem: realFS(), Runtime: { runFFmpeg: hung, runFFprobe: hung } });
  await rejectsCode(H.saeFFmpeg(['-i', 'x'], { timeoutMs: 50 }), 'timeout');
  await rejectsCode(H.saeFFprobe(['-i', 'x'], { timeoutMs: 50 }), 'timeout');
  const failing = sandbox({ FileSystem: realFS(), Runtime: {
    runFFmpeg: async () => { const e = new Error('ffmpeg exited 1'); e.stderr = 'No such file'; throw e; },
    runFFprobe: async () => ({ stdout: '{}', stderr: '' }) } }).H;
  const err = await rejectsCode(failing.saeFFmpeg(['-i', 'x']), 'media_failed');
  assert.match(err.detail, /No such file/);
  await rejectsCode(failing.saeProbeDuration('x'), 'media_failed');
});

test('ffmpeg that succeeds without writing its output maps to media_failed', async () => {
  // runFFmpeg resolves but writes nothing (or an empty file): the read must not leak a raw ENOENT.
  for (const write of [false, true]) {
    const s = sandbox({ FileSystem: realFS(), Runtime: { runFFmpeg: async (args) => {
      if (write) fs.writeFileSync(args[args.length - 1], '');
      return { stdout: '', stderr: '' };
    } } });
    const dir = s.H.saeDataDir('no-output-' + write);
    const pcm = await rejectsCode(s.H.saeDecodePcm(path.join(tmp, 'in.wav'), dir), 'media_failed');
    assert.ok(pcm.detail && pcm.detail.length, 'pcm detail');
    const prev = await rejectsCode(s.H.saePreviewUrl(path.join(tmp, 'in.wav'), 0, 1, dir), 'media_failed');
    assert.ok(prev.detail && prev.detail.length, 'preview detail');
    if (!write) assert.match(pcm.detail + prev.detail, /missing/);
    assert.deepEqual(fs.readdirSync(dir), [], 'nothing left behind');
  }
});

// ---- paths ----
test('platform, skills dir, data dir', () => {
  assert.equal(sandbox({ Runtime: { getPlatform: () => 'win32' } }).H.saePlatform(), 'win32');
  assert.equal(sandbox({ Runtime: { getPlatform: () => 'darwin' } }).H.saePlatform(), 'darwin');
  assert.equal(sandbox({}, { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Selects' }).H.saePlatform(), 'win32');
  assert.equal(sandbox({}, { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }).H.saePlatform(), 'darwin');
  assert.equal(sandbox(undefined, { ua: 'Mozilla/5.0 (X11; Linux x86_64)' }).H.saePlatform(), 'linux');

  const { H } = sandbox({ FileSystem: realFS(), Runtime: realRT() });
  const skill = path.join(HOME, '.selects', 'skills', 'selfie-aesthetic');
  assert.equal(H.saeSkillsDir('selfie-aesthetic'), null, 'no folder yet');
  fs.mkdirSync(skill, { recursive: true });
  assert.equal(H.saeSkillsDir('selfie-aesthetic'), null, 'folder without planner.js');
  fs.writeFileSync(path.join(skill, 'planner.js'), '');
  assert.equal(H.saeSkillsDir('selfie-aesthetic'), skill);

  const data = path.join(HOME, '.selects', 'plugin-data', 'selfie-aesthetic');
  assert.ok(!fs.existsSync(data));
  assert.equal(H.saeDataDir('selfie-aesthetic'), data);
  assert.ok(fs.statSync(data).isDirectory());
  assert.equal(H.saeDataDir('selfie-aesthetic'), data, 'idempotent');
});

test('samePath / baseName', () => {
  const { H } = sandbox(undefined);
  assert.equal(H.saeSamePath('C:\\Users\\A\\x.mp3', 'c:/users/a/x.mp3'), true);
  assert.equal(H.saeSamePath('C:\\Users\\A\\x.mp3', 'C:\\Users\\A\\y.mp3'), false);
  assert.equal(H.saeSamePath('D:\\Music\\', 'd:/music'), true);
  assert.equal(H.saeSamePath('\\\\server\\Share\\a.mp3', '//server/share/A.mp3'), true);
  const nfc = String.fromCodePoint(0xD55C, 0xAE00), nfd = nfc.normalize('NFD');
  assert.notEqual(nfc, nfd);
  assert.equal(H.saeSamePath('/srv/m/' + nfc + '.mp3', '/srv/m/' + nfd + '.mp3'), true);
  assert.equal(H.saeSamePath('C:\\m\\' + nfd + '.mp3', 'c:/M/' + nfc + '.mp3'), true);
  assert.equal(H.saeSamePath('/srv/a/X.mp3', '/srv/a/x.mp3'), false, 'POSIX stays case-sensitive');
  assert.equal(H.saeSamePath('/srv/a/x.mp3', '/srv/a/x.mp3'), true);
  assert.equal(H.saeSamePath(null, '/srv/a'), false);
  assert.equal(H.saeBaseName('C:\\m\\a b.mp3'), 'a b.mp3');
  assert.equal(H.saeBaseName('/srv/m/' + nfd + '.mp3'), nfc + '.mp3');
  assert.equal(H.saeBaseName('/srv/m/dir/'), 'dir');
  assert.equal(H.saeBaseName(undefined), '');
});

test('saeYield resolves on a later tick', async () => {
  const { H } = sandbox(undefined);
  let after = false;
  const p = H.saeYield().then(() => { assert.equal(after, true); });
  after = true;
  await p;
});

// ---- beat detector core in the panel ----
function evalBeat(wrapped) {
  const box = {}; // no require, module, exports, process, Buffer
  vm.createContext(box);
  const code = wrapped
    ? 'globalThis.B = (function () {\n' + beatCore + '\nreturn { analyze };\n})();'
    : beatCore + '\n;globalThis.B = { analyze };';
  vm.runInContext(code, box);
  return box.B;
}
test('beat detector core is browser-safe (bare and IIFE-wrapped)', () => {
  for (const bad of [/\brequire\s*\(/, /\bprocess\./, /\bBuffer\b/, /\bmodule\./, /\bexports\./])
    assert.ok(!bad.test(beatCore), 'detector core must not use ' + bad);
  for (const wrapped of [false, true]) {
    const B = evalBeat(wrapped);
    assert.equal(typeof B.analyze, 'function');
    const a = B.analyze(clickTrack(120, 0.5, 30, 22050), 22050);
    assert.ok(Math.abs(a.bpm - 120) <= 1, 'bpm ' + a.bpm);
    assert.equal(a.accepted, true);
  }
});

// ---- real ffmpeg through the fake host ----
const ffTest = (name, fn) => test(name, async () => {
  if (!HAVE_FF) { console.log('  SKIP (no ffmpeg/ffprobe; set SAE_FFMPEG_DIR or install them): ' + name); return 'skip'; }
  return fn();
});

ffTest('probe duration', async () => {
  const { H } = sandbox({ FileSystem: realFS(), Runtime: realRT() });
  const d = await H.saeProbeDuration(media);
  assert.ok(Math.abs(d - 2) <= 0.05, 'duration ' + d);
  await rejectsCode(H.saeProbeDuration(path.join(tmp, 'missing.wav')), 'media_failed');
});

ffTest('decode PCM (Buffer and ArrayBuffer readers) leaves no file', async () => {
  const readers = {
    buffer: realFS(),
    arraybuffer: realFS({ readFileSync: (p) => { const b = fs.readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); } }),
    asyncOnly: realFS({ readFileSync: undefined }),
    removeFileOnly: realFS({ unlinkSync: undefined }),
  };
  for (const [name, FileSystem] of Object.entries(readers)) {
    const { H } = sandbox({ FileSystem, Runtime: realRT() });
    const dir = H.saeDataDir('pcm-' + name);
    const pcm = await H.saeDecodePcm(media, dir);
    assert.equal(Object.prototype.toString.call(pcm), '[object Float32Array]', name);
    assert.ok(Math.abs(pcm.length - 44100) <= 64, name + ' length ' + pcm.length);
    let peak = 0; for (let i = 0; i < pcm.length; i++) peak = Math.max(peak, Math.abs(pcm[i]));
    assert.ok(peak > 0.4 && peak < 0.6, name + ' peak ' + peak);
    assert.deepEqual(lsData(dir), [], name + ' leaves nothing behind');
    const short = await H.saeDecodePcm(media, dir, 1);
    assert.ok(Math.abs(short.length - 22050) <= 64, name + ' maxSeconds ' + short.length);
  }
  const { H } = sandbox({ FileSystem: realFS(), Runtime: realRT() });
  const dir = H.saeDataDir('pcm-missing');
  await rejectsCode(H.saeDecodePcm(path.join(tmp, 'missing.wav'), dir), 'media_failed');
  assert.deepEqual(lsData(dir), []);
});

ffTest('decoded PCM feeds the vm detector (end to end)', async () => {
  const { H } = sandbox({ FileSystem: realFS(), Runtime: realRT() });
  const pcm = await H.saeDecodePcm(clicks, H.saeDataDir('e2e'));
  const a = evalBeat(true).analyze(pcm, 22050);
  assert.ok(Math.abs(a.bpm - 120) <= 1, 'bpm ' + a.bpm);
  assert.ok(Math.abs(a.firstBeat - 0.5) <= 0.03, 'firstBeat ' + a.firstBeat);
});

ffTest('preview blob URL, mp3 with WAV fallback, no file left', async () => {
  const s = sandbox({ FileSystem: realFS(), Runtime: realRT() });
  const dir = s.H.saeDataDir('preview');
  const url = await s.H.saePreviewUrl(media, 0.5, 1, dir);
  assert.equal(url, 'blob:sae/1');
  assert.equal(s.blobs.length, 1);
  assert.equal(s.blobs[0].type, 'audio/mpeg');
  assert.ok(s.blobs[0].size > 1000, 'mp3 bytes ' + s.blobs[0].size);
  assert.deepEqual(lsData(dir), []);

  // A host ffmpeg without libmp3lame: the WAV fallback still yields a preview.
  const noLame = sandbox({ FileSystem: realFS(), Runtime: realRT({
    runFFmpeg: (args, quiet, signal) => (args.includes('libmp3lame') ? Promise.reject(new Error('Unknown encoder')) : runTool('ffmpeg', args, signal)),
  }) });
  await noLame.H.saePreviewUrl(media, 0, 1, dir);
  assert.equal(noLame.blobs[0].type, 'audio/wav');
  assert.ok(Math.abs(noLame.blobs[0].size - (44 + 44100 * 4)) < 2048, 'wav bytes ' + noLame.blobs[0].size);
  assert.deepEqual(lsData(dir), []);

  await rejectsCode(s.H.saePreviewUrl(path.join(tmp, 'missing.wav'), 0, 1, dir), 'media_failed');
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
