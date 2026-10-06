const { asyncSdk } = require('../../../tests/windows_host.mjs');
// plugins/summer-trip/tests/host.test.cjs (run: node plugins/summer-trip/tests/host.test.cjs; adapted from
// plugins/selfie-aesthetic/tests/host.test.cjs). The panel's host block (dev/host-block.ts, embedded verbatim in
// panel.tsx between // st-host:start and // st-host:end) evaluated as plain JS in node:vm with a fake
// window.parent.__DI__ built on node:fs/node:path and a fake Runtime that runs the real ffmpeg/ffprobe (ST_FFMPEG_DIR,
// else PATH; the ffmpeg cases are skipped with a note when neither has them).
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), vm = require('node:vm'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFile, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// ---- sources ----
const hostSrc = fs.readFileSync(path.join(root, 'dev', 'host-block.ts'), 'utf8');
const ha = hostSrc.indexOf('// st-host:start'), hz = hostSrc.indexOf('// st-host:end');
assert.ok(ha >= 0 && hz > ha, 'host block markers');
const block = hostSrc.slice(ha, hz);
const API = ['hostDI', 'hostHas', 'hostNeed', 'hostPlatform', 'hostJoin', 'hostSkillsDir', 'hostDataDir', 'hostMkdir', 'hostFFmpeg', 'hostFFprobe',
  'hostProbeDuration', 'hostBytes', 'hostReadBytes', 'hostReadText', 'hostReadOutput', 'hostWriteBytes', 'hostFileSize', 'hostRename', 'hostList',
  'hostRemove', 'hostToken', 'hostDecodePcm', 'hostPreviewUrl', 'hostSamePath', 'hostBaseName', 'hostSha256Hex'];

// ---- tools ----
const toolDir = process.env.ST_FFMPEG_DIR || '';
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
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'st-host-'));
const HOME = path.join(tmp, 'home dir');
fs.mkdirSync(HOME, { recursive: true });

function realFS(overrides) {
  return Object.assign({
    join: path.join, homedir: () => HOME, mkdirSync: fs.mkdirSync, existsSync: fs.existsSync, statSync: fs.statSync,
    readFileSync: fs.readFileSync, readFile: fs.promises.readFile, writeFile: fs.promises.writeFile, writeFileSync: fs.writeFileSync,
    renameSync: fs.renameSync, readdirSync: fs.readdirSync, unlinkSync: fs.unlinkSync, removeFile: async ({ filePath }) => fs.promises.unlink(filePath),
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
    setTimeout, clearTimeout, AbortController, Blob, TextDecoder,
    URL: { createObjectURL: (b) => { blobs.push(b); return 'blob:st/' + (++urls); }, revokeObjectURL() {} },
    navigator: { userAgent: opts.ua || '' },
  };
  box.window = opts.where === 'self' ? { parent: {}, __DI__: di } : { parent: { __DI__: di } };
  vm.createContext(box);
  box.sdk = di ? asyncSdk(di) : undefined;
  if (box.sdk) box.sdk.environment.platform = di.Runtime?.getPlatform?.() || '';
  vm.runInContext('function panelLocalClient(sdk){return sdk;}\n' + block + ';hostUseSdk(sdk);globalThis.H={' + API.join(',') + '};', box);
  return { H: box.H, box, blobs };
}

async function rejectsCode(p, code) {
  let err = null;
  try { await p; } catch (e) { err = e; }
  assert.ok(err, 'expected rejection ' + code);
  assert.equal(err.code, code, String(err && err.message));
  return err;
}
function throwsCode(fn, code) {
  let err = null;
  try { fn(); } catch (e) { err = e; }
  assert.ok(err, 'expected throw ' + code);
  assert.equal(err.code, code);
  return err;
}

// ---- fixtures ----
// 16-bit PCM WAV written in JS (no ffmpeg needed). The name has a space, a quote and Hangul built from code points.
function writeWav(file, sr, samples) {
  const n = samples.length, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2);
  fs.writeFileSync(file, buf);
}
const KO = String.fromCodePoint(0xC74C, 0xC545); // two Hangul syllables
const media = path.join(tmp, "my " + KO + " track's (1).wav");
const SR_IN = 44100;
writeWav(media, SR_IN, Float32Array.from({ length: 2 * SR_IN }, (_, i) => 0.5 * Math.sin(2 * Math.PI * 440 * i / SR_IN)));
const lsData = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir) : []);

// ---- static ----
test('block is plain JS with no host shell and no hand-built paths', () => {
  for (const name of API) assert.ok(new RegExp('function ' + name + '\\(').test(block), 'defines ' + name);
  for (const bad of ['runShell', '/tmp', '~/', '$HOME', '%USERPROFILE%', 'process.env', 'require(', 'import ', 'child_process'])
    assert.ok(!block.includes(bad), 'block must not contain ' + bad);
  assert.ok(!/\+\s*["'`][\\/]+["'`]/.test(block), 'no + "/" path concatenation');
  assert.ok(!/["'`][\\/]+["'`]\s*\+/.test(block), 'no "/" + path concatenation');
  assert.ok(!/:\s*(string|number|boolean|any)\b|\bas any\b|\binterface\s/.test(block), 'no TS-only syntax');
});

// ---- cross-realm bytes ----
test('bytes from another realm (window.parent FileSystem results) decode', async () => {
  // The panel runs in an iframe; FileSystem.readFile results are created in window.parent's realm, so
  // `instanceof Uint8Array/ArrayBuffer` is false for them (this broke Archive Vlog's asset reads). Build the inputs in
  // a separate vm realm and decode them with the block loaded in yet another realm.
  const host = {};
  vm.createContext(host);
  vm.runInContext(block + ';globalThis.B=hostBytes;', host);
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
  assert.equal(host.B(null).byteLength, 0);
  // End to end: a FileSystem whose readFile answers with another realm's Uint8Array (text and binary reads).
  const file = path.join(tmp, 'realm.json');
  fs.writeFileSync(file, '{"a":1}');
  const foreign = (p) => make('(b => new Uint8Array(b))')(Array.from(fs.readFileSync(p)));
  const { H } = sandbox({ FileSystem: realFS({ readFile: async (p) => foreign(p), readFileSync: undefined }) });
  assert.equal(JSON.parse(await H.hostReadText(file)).a, 1);
  const bytes = await H.hostReadBytes(file);
  assert.equal(bytes.byteLength, 7);
  assert.equal(H.hostSha256Hex(bytes), crypto.createHash('sha256').update('{"a":1}').digest('hex'), 'hash over foreign bytes');
  // A host that hands binary back as text is an error, not garbage bytes.
  const textHost = sandbox({ FileSystem: realFS({ readFile: async () => 'RIFF' }) }).H;
  await rejectsCode(textHost.hostReadBytes(file), 'media_failed');
  assert.equal(await textHost.hostReadText(file), 'RIFF');
});

// ---- missing host ----
test('missing __DI__ or members -> host_tools', async () => {
  const { H } = sandbox(undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(H.hostDI())), {});
  const has = H.hostHas(['fs.join', 'rt.runFFmpeg']);
  assert.equal(has.ok, false);
  assert.deepEqual(Array.from(has.missing), ['fs.join', 'rt.runFFmpeg']);
  await rejectsCode(H.hostDataDir('x'), 'host_tools');
  await rejectsCode(H.hostSkillsDir('x', 'planner.js'), 'host_tools');
  throwsCode(() => H.hostJoin('a', 'b'), 'host_tools');
  await rejectsCode(H.hostRename('a', 'b'), 'host_tools');
  await rejectsCode(H.hostFFmpeg(['-version']), 'host_tools');
  await rejectsCode(H.hostFFprobe(['-version']), 'host_tools');
  await rejectsCode(H.hostProbeDuration(media), 'host_tools');
  await rejectsCode(H.hostDecodePcm(media, tmp, 22050, 360), 'host_tools');
  await rejectsCode(H.hostPreviewUrl(media, 0, 1, tmp, 0.4), 'host_tools');
  await rejectsCode(H.hostReadText(media), 'host_tools');
  await rejectsCode(H.hostWriteBytes(path.join(tmp, 'x'), new Uint8Array(1)), 'host_tools');
  assert.equal((await H.hostFileSize(media)), 0, 'no FileSystem: nothing is there');
  assert.deepEqual(Array.from((await H.hostList(tmp))), []);
  await H.hostRemove(media);
  assert.ok(fs.existsSync(media), 'no remover: nothing removed');

  // Partial hosts: FileSystem without mkdirSync or any reader; Runtime without runFFprobe. The reader is checked before
  // ffmpeg runs, so nothing is written.
  let ran = 0;
  const partial = sandbox({ FileSystem: realFS({ mkdirSync: undefined, readFileSync: undefined, readFile: undefined }),
    Runtime: { runFFmpeg: async () => { ran++; return { stdout: '', stderr: '' }; } } }).H;
  const err = await rejectsCode(partial.hostDataDir('x'), 'host_tools');
  assert.deepEqual(Array.from(err.missing), ['fs.mkdir']);
  await rejectsCode(partial.hostFFprobe(['-version']), 'host_tools');
  await rejectsCode(partial.hostDecodePcm(media, tmp, 22050, 360), 'host_tools');
  await rejectsCode(partial.hostPreviewUrl(media, 0, 1, tmp, 0.4), 'host_tools');
  assert.equal(ran, 0, 'ffmpeg not started without a reader');

  // window.__DI__ is accepted when window.parent has none; a throwing window.parent does not escape hostDI.
  const self = sandbox({ FileSystem: realFS(), Runtime: realRT() }, { where: 'self' }).H;
  assert.equal(self.hostHas(['fs.join', 'rt.runFFmpeg']).ok, true);
  const box = { window: {} };
  Object.defineProperty(box.window, 'parent', { get() { throw new Error('SecurityError'); } });
  vm.createContext(box);
  vm.runInContext(block + ';globalThis.D=hostDI();', box);
  assert.equal(box.D.fs, undefined);
});

test('timeouts, cancels and tool failures map to timeout / cancelled / media_failed', async () => {
  const hung = (args, quiet, signal) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')));
  });
  const { H, box } = sandbox({ FileSystem: realFS(), Runtime: { runFFmpeg: hung, runFFprobe: hung } });
  const t = await rejectsCode(H.hostFFmpeg(['-i', 'x'], { timeoutMs: 50 }), 'timeout');
  assert.match(t.message, /took too long/);
  await rejectsCode(H.hostFFprobe(['-i', 'x'], { timeoutMs: 50 }), 'timeout');
  const ac = new box.AbortController();
  const p = H.hostFFmpeg(['-i', 'x'], { timeoutMs: 5000, signal: ac.signal });
  ac.abort();
  await rejectsCode(p, 'cancelled');
  await rejectsCode(H.hostFFmpeg(['-i', 'x'], { signal: ac.signal }), 'cancelled');
  const failing = sandbox({ FileSystem: realFS(), Runtime: {
    runFFmpeg: async () => { const e = new Error('ffmpeg exited 1'); e.stderr = 'No such file'; throw e; },
    runFFprobe: async () => ({ stdout: 'N/A\n', stderr: '' }) } }).H;
  const err = await rejectsCode(failing.hostFFmpeg(['-i', 'x']), 'media_failed');
  assert.match(err.detail, /No such file/);
  assert.match(err.message, /^ffmpeg failed: No such file/);
  await rejectsCode(failing.hostProbeDuration('x'), 'media_failed');
  // Arguments reach the host as strings, unchanged (no quoting).
  let seen = null;
  const echo = sandbox({ Runtime: { runFFmpeg: async (args) => { seen = args; return { stdout: '', stderr: '' }; } } }).H;
  await echo.hostFFmpeg(['-i', "C:\\a b\\it's.mp3", 3]);
  assert.deepEqual(Array.from(seen), ['-i', "C:\\a b\\it's.mp3", '3']);
});

test('ffmpeg that succeeds without writing its output maps to media_failed', async () => {
  for (const write of [false, true]) {
    const s = sandbox({ FileSystem: realFS(), Runtime: { runFFmpeg: async (args) => {
      if (write) fs.writeFileSync(args[args.length - 1], '');
      return { stdout: '', stderr: '' };
    } } });
    const dir = (await s.H.hostDataDir('no-output-' + write));
    const pcm = await rejectsCode(s.H.hostDecodePcm(path.join(tmp, 'in.wav'), dir, 22050, 360), 'media_failed');
    assert.ok(pcm.detail && pcm.detail.length, 'pcm detail');
    const prev = await rejectsCode(s.H.hostPreviewUrl(path.join(tmp, 'in.wav'), 0, 1, dir, 0.4), 'media_failed');
    assert.ok(prev.detail && prev.detail.length, 'preview detail');
    if (!write) assert.match(pcm.detail + prev.detail, /missing/);
    assert.deepEqual(fs.readdirSync(dir), [], 'nothing left behind');
  }
});

// ---- paths and files ----
test('platform, skills dir, data dir, join', async () => {
  assert.equal(sandbox({ Runtime: { getPlatform: () => 'win32' } }).H.hostPlatform(), 'win32');
  assert.equal(sandbox({ Runtime: { getPlatform: () => 'darwin' } }).H.hostPlatform(), 'darwin');

  const { H } = sandbox({ FileSystem: realFS(), Runtime: realRT() });
  const skill = path.join(HOME, '.selects', 'skills', 'summer-trip');
  assert.equal((await H.hostSkillsDir('summer-trip', 'planner.js')), null, 'no folder yet');
  fs.mkdirSync(skill, { recursive: true });
  assert.equal((await H.hostSkillsDir('summer-trip', 'planner.js')), null, 'folder without planner.js');
  fs.writeFileSync(path.join(skill, 'planner.js'), '');
  assert.equal((await H.hostSkillsDir('summer-trip', 'planner.js')), skill);

  const data = path.join(HOME, '.selects', 'plugin-data', 'summer-trip');
  assert.ok(!fs.existsSync(data));
  assert.equal((await H.hostDataDir('summer-trip')), data);
  assert.ok(fs.statSync(data).isDirectory());
  assert.equal((await H.hostDataDir('summer-trip')), data, 'idempotent');

  // A Windows host: every path comes from its join (backslashes), with a Korean user name.
  const winHome = 'C:\\Users\\' + KO;
  const made = [];
  const win = sandbox({ FileSystem: { join: path.win32.join, homedir: () => winHome, existsSync: (p) => p === path.win32.join(winHome, '.selects', 'skills', 'summer-trip', 'planner.js'),
    mkdirSync: (p) => made.push(p) } }).H;
  assert.equal((await win.hostSkillsDir('summer-trip', 'planner.js')), winHome + '\\.selects\\skills\\summer-trip');
  assert.equal((await win.hostDataDir('summer-trip')), winHome + '\\.selects\\plugin-data\\summer-trip');
  assert.deepEqual(made, [winHome + '\\.selects\\plugin-data\\summer-trip']);
  assert.equal(win.hostJoin(winHome, 'sfx', 'shutter-1.wav'), winHome + '\\sfx\\shutter-1.wav');
});

test('write, size, rename, list, remove (the SFX and muffle steps)', async () => {
  const { H } = sandbox({ FileSystem: realFS() });
  const dir = (await H.hostMkdir(path.join(tmp, 'files ' + KO, 'sfx')));
  assert.ok(fs.statSync(dir).isDirectory());
  const f = path.join(dir, 'a.wav');
  assert.equal((await H.hostFileSize(f)), 0, 'missing');
  await H.hostWriteBytes(f, new Uint8Array([1, 2, 3]));
  assert.equal((await H.hostFileSize(f)), 3);
  assert.deepEqual(Array.from(fs.readFileSync(f)), [1, 2, 3]);
  (await H.hostRename(f, path.join(dir, 'b.wav')));
  assert.deepEqual(Array.from((await H.hostList(dir))), ['b.wav']);
  await H.hostRemove(path.join(dir, 'b.wav'));
  assert.deepEqual(Array.from((await H.hostList(dir))), []);
  assert.deepEqual(Array.from((await H.hostList(path.join(dir, 'nope')))), [], 'an unreadable folder lists nothing');
  // writeFileSync / existsSync-only hosts.
  const sync = sandbox({ FileSystem: realFS({ writeFile: undefined, statSync: undefined }) }).H;
  await sync.hostWriteBytes(f, new Uint8Array([9]));
  assert.equal((await sync.hostFileSize(f)), 1, 'existsSync: 1 for there');
  assert.equal((await sync.hostFileSize(f + '.x')), 0);
  // removeFile-only host.
  const rmOnly = sandbox({ FileSystem: realFS({ unlinkSync: undefined }) }).H;
  await rmOnly.hostRemove(f);
  assert.ok(!fs.existsSync(f));
});

test('samePath / baseName', () => {
  const { H } = sandbox(undefined);
  assert.equal(H.hostSamePath('C:\\Users\\A\\x.mp3', 'c:/users/a/x.mp3'), true);
  assert.equal(H.hostSamePath('C:\\Users\\A\\x.mp3', 'C:\\Users\\A\\y.mp3'), false);
  assert.equal(H.hostSamePath('D:\\Music\\', 'd:/music'), true);
  const nfc = String.fromCodePoint(0xD55C, 0xAE00), nfd = nfc.normalize('NFD');
  assert.equal(H.hostSamePath('/srv/m/' + nfc + '.mp3', '/srv/m/' + nfd + '.mp3'), true);
  assert.equal(H.hostSamePath('C:\\m\\' + nfd + '.mp3', 'c:/M/' + nfc + '.mp3'), true);
  assert.equal(H.hostSamePath('/srv/a/X.mp3', '/srv/a/x.mp3'), false, 'POSIX stays case-sensitive');
  assert.equal(H.hostSamePath(null, '/srv/a'), false);
  assert.equal(H.hostBaseName('C:\\m\\a b.mp3'), 'a b.mp3');
  assert.equal(H.hostBaseName('/srv/m/' + nfd + '.mp3'), nfc + '.mp3');
  assert.equal(H.hostBaseName(undefined), '');
});

test('SHA-256 in JS equals node:crypto (and shasum) on every padding boundary', () => {
  const { H } = sandbox(undefined);
  const lens = [0, 1, 3, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 129, 1000, 4096, 100003];
  for (const n of lens) {
    const b = Buffer.alloc(n);
    for (let i = 0; i < n; i++) b[i] = (i * 31 + 7) & 255;
    assert.equal(H.hostSha256Hex(new Uint8Array(b)), crypto.createHash('sha256').update(b).digest('hex'), 'length ' + n);
  }
  assert.equal(H.hostSha256Hex(new Uint8Array(0)), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  // The own-music cache key: the first 8 hex, as `shasum -a 256 < file | cut -c1-8` printed.
  const want = crypto.createHash('sha256').update(fs.readFileSync(media)).digest('hex').slice(0, 8);
  assert.equal(H.hostSha256Hex(new Uint8Array(fs.readFileSync(media))).slice(0, 8), want);
  const shasum = spawnSync('shasum', ['-a', '256', media]);
  if (shasum.status === 0) assert.equal(String(shasum.stdout).slice(0, 8), want, 'shasum agrees');
});

// ---- real ffmpeg through the fake host ----
const ffTest = (name, fn) => test(name, async () => {
  if (!HAVE_FF) { console.log('  SKIP (no ffmpeg/ffprobe; set ST_FFMPEG_DIR or install them): ' + name); return 'skip'; }
  return fn();
});

ffTest('probe duration', async () => {
  const { H } = sandbox({ FileSystem: realFS(), Runtime: realRT() });
  const d = await H.hostProbeDuration(media);
  assert.ok(Math.abs(d - 2) <= 0.05, 'duration ' + d);
  await rejectsCode(H.hostProbeDuration(path.join(tmp, 'missing.wav')), 'media_failed');
});

ffTest('decode PCM (Buffer, ArrayBuffer and foreign readers) leaves no file', async () => {
  const other = {};
  vm.createContext(other);
  const readers = {
    buffer: realFS(),
    arraybuffer: realFS({ readFile: async (p) => { const b = fs.readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); } }),
    foreignRealm: realFS({ readFile: async (p) => vm.runInContext('(a => new Uint8Array(a))', other)(Array.from(fs.readFileSync(p))) }),
    syncOnly: realFS({ readFile: undefined }),
    removeFileOnly: realFS({ unlinkSync: undefined }),
  };
  for (const [name, FileSystem] of Object.entries(readers)) {
    const { H } = sandbox({ FileSystem, Runtime: realRT() });
    const dir = (await H.hostDataDir('pcm-' + name));
    const pcm = await H.hostDecodePcm(media, dir, 22050, 360);
    assert.equal(Object.prototype.toString.call(pcm), '[object Float32Array]', name);
    assert.ok(Math.abs(pcm.length - 44100) <= 64, name + ' length ' + pcm.length);
    let peak = 0; for (let i = 0; i < pcm.length; i++) peak = Math.max(peak, Math.abs(pcm[i]));
    assert.ok(peak > 0.4 && peak < 0.6, name + ' peak ' + peak);
    assert.deepEqual(lsData(dir), [], name + ' leaves nothing behind');
    const short = await H.hostDecodePcm(media, dir, 22050, 1);
    assert.ok(Math.abs(short.length - 22050) <= 64, name + ' maxSeconds ' + short.length);
  }
  const { H } = sandbox({ FileSystem: realFS(), Runtime: realRT() });
  const dir = (await H.hostDataDir('pcm-missing'));
  await rejectsCode(H.hostDecodePcm(path.join(tmp, 'missing.wav'), dir, 22050, 360), 'media_failed');
  assert.deepEqual(lsData(dir), []);
});

ffTest('decoded PCM equals the CLI decode (the arguments beat-detect always used)', async () => {
  const { H } = sandbox({ FileSystem: realFS(), Runtime: realRT() });
  const pcm = await H.hostDecodePcm(media, (await H.hostDataDir('cli')), 22050, 360);
  const out = path.join(tmp, 'cli.f32');
  spawnSync(tool('ffmpeg'), ['-nostdin', '-v', 'error', '-y', '-t', '360', '-i', media, '-ac', '1', '-ar', '22050', '-f', 'f32le', out]);
  const cli = fs.readFileSync(out);
  assert.equal(Buffer.compare(Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength), cli), 0, 'byte-identical samples');
});

ffTest('preview blob URL, mp3 with WAV fallback, leftovers cleared, no file left', async () => {
  const s = sandbox({ FileSystem: realFS(), Runtime: realRT() });
  const dir = (await s.H.hostDataDir('preview'));
  fs.writeFileSync(path.join(dir, 'preview-old.b64'), 'x');
  fs.writeFileSync(path.join(dir, 'preview-old.mp3'), 'x');
  fs.writeFileSync(path.join(dir, 'keep.json'), '{}');
  const url = await s.H.hostPreviewUrl(media, 0.5, 1, dir, 0.4);
  assert.equal(url, 'blob:st/1');
  assert.equal(s.blobs.length, 1);
  assert.equal(s.blobs[0].type, 'audio/mpeg');
  assert.ok(s.blobs[0].size > 1000, 'mp3 bytes ' + s.blobs[0].size);
  assert.deepEqual(lsData(dir), ['keep.json'], 'earlier previews removed, the new one read and removed');

  // A host ffmpeg without libmp3lame: the WAV fallback still yields a preview (mono 22.05 kHz).
  const noLame = sandbox({ FileSystem: realFS(), Runtime: realRT({
    runFFmpeg: (args, quiet, signal) => (args.includes('mp3') ? Promise.reject(new Error('Unknown encoder')) : runTool('ffmpeg', args, signal)),
  }) });
  await noLame.H.hostPreviewUrl(media, 0, 1, dir, 0.4);
  assert.equal(noLame.blobs[0].type, 'audio/wav');
  assert.ok(Math.abs(noLame.blobs[0].size - (44 + 22050 * 2)) < 2048, 'wav bytes ' + noLame.blobs[0].size);
  assert.deepEqual(lsData(dir), ['keep.json']);

  await rejectsCode(s.H.hostPreviewUrl(path.join(tmp, 'missing.wav'), 0, 1, dir, 0.4), 'media_failed');
  assert.deepEqual(lsData(dir), ['keep.json']);
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
