// Postcard Cutout Studio on Windows: the panel's port of pipeline.py's helper ops (pc-port block) against
// pipeline.py itself, on the same inputs. The av-host, pc-ledger and pc-port blocks run in node:vm with a
// window.parent.__DI__ stand-in in another realm (bytes from that realm, stats as plain objects, as the host
// returns them) backed by node fs and the local ffmpeg/ffprobe, which stand in for the host's bundled tools.
// pipeline.py runs in python3 with HOME pointed at a temporary folder; its mask service is replaced by a stub (no
// port is opened). Tests skip without ffmpeg/ffprobe (and the parity halves without python3).
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile, execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');
const PKG = path.join(ROOT, 'plugins/postcard-cutout-studio');
const panel = fs.readFileSync(path.join(PKG, 'panel.tsx'), 'utf8');
const block = name => { const m = panel.match(new RegExp('// ' + name + ':start\\n[\\s\\S]*?// ' + name + ':end')); assert.ok(m, name + ' block'); return m[0]; };
const has = (tool, args = ['-version']) => { try { return spawnSync(tool, args).status === 0; } catch { return false; } };
// An ffmpeg that can make the fixtures: an input rotation flag (ffmpeg 6+), geq alpha and VP9 with alpha.
const tools = has('ffprobe') && has('ffmpeg', ['-v', 'error', '-display_rotation', '90', '-f', 'lavfi', '-i', 'testsrc2=size=64x36:rate=30:duration=0.1',
  '-vf', "format=yuva420p,geq=lum='lum(X,Y)':cb='cb(X,Y)':cr='cr(X,Y)':a='255'", '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-f', 'null', '-']);
const python = has('python3', ['-c', 'import fcntl']);
const skip = !tools && 'ffmpeg/ffprobe not available';
const skipParity = (!tools && 'ffmpeg/ffprobe not available') || (!python && 'python3 not available');
const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const real = p => fs.realpathSync(p);
const tmp = (tag = 'pc-port-') => real(fs.mkdtempSync(path.join(os.tmpdir(), tag)));
const ff = args => execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', ...args], { maxBuffer: 256 << 20 });
const frames = (file, extra = []) => md5(execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-i', file, ...extra, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 512 << 20 }));
const streams = file => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_tag_string', '-of', 'json', file], { encoding: 'utf8' })).streams;

// The host as the panel sees it. `platform` sets Runtime.getPlatform; `home` FileSystem.homedir.
function host({ platform = 'darwin', home, calls = [], stderrInResult = true, downloads = {} } = {}) {
  const other = vm.runInNewContext('({bytes:b=>{const u=new Uint8Array(b.length);u.set(b);return u}})');
  const run = bin => (args, _quiet, signal, _onStdout, onStderr) => new Promise((resolve, reject) => {
    calls.push([bin, ...args]);
    const child = execFile(bin, args, { encoding: 'utf8', maxBuffer: 256 << 20 }, (error, stdout, stderr) => {
      if (error) return reject(JSON.stringify({ type: 'FFmpegExecutionError', message: String(error.code), stderr }));
      if (onStderr && stderr) onStderr(stderr);
      resolve({ stdout, stderr: stderrInResult ? stderr : '' });
    });
    signal?.addEventListener('abort', () => child.kill());
  });
  const FileSystem = {
    join: (...p) => path.join(...p), dirname: p => path.dirname(p), basename: p => path.basename(p), homedir: () => home,
    exists: async p => fs.existsSync(p), mkdir: async (p, o) => fs.mkdirSync(p, o), readdir: async p => fs.readdirSync(p),
    stat: async p => ({ ...fs.statSync(p), isDirectory: fs.statSync(p).isDirectory() }), rename: async (a, b) => fs.renameSync(a, b), rm: async (p, o) => fs.rmSync(p, o),
    readFile: async p => other.bytes(fs.readFileSync(p)), readRange: async (p, start, n) => { const fd = fs.openSync(p, 'r'); try { const b = Buffer.alloc(n); const got = fs.readSync(fd, b, 0, n, start); return other.bytes(b.subarray(0, got)); } finally { fs.closeSync(fd); } },
    writeFile: async (p, d) => fs.writeFileSync(p, typeof d === 'string' ? d : Buffer.from(d)), removeFile: async ({ filePath }) => fs.rmSync(filePath, { force: true }),
    pathToLocalURL: async p => 'selects-file://' + encodeURI(p.split(path.sep).join('/')) + '/',
    downloadFile: async (url, dest) => { calls.push(['download', url, dest]); fs.writeFileSync(dest, downloads[url] ?? Buffer.alloc(0)); },
  };
  return { files: FileSystem, media: { runFFmpeg: run('ffmpeg'), runFFprobe: run('ffprobe') }, dialogs: {}, environment: {platform, version:'2.0.520'} };
}
function load(di) {
  const ctx = vm.createContext({ sdk: di, panelLocalClient: s => s, window: { parent: { get __DI__(){throw Error('Migrated operations must not use DI');} } }, navigator: {}, crypto: globalThis.crypto, TextEncoder, TextDecoder,
    AbortController, setTimeout, clearTimeout, atob, btoa, console, performance });
  vm.runInContext(block('av-host') + '\n' + block('pc-ledger') + '\n' + block('pc-port') + '\nbindLocalSdk(sdk);this.pcLedger=pcLedger;this.pcPort=pcPort;this.pcToolError=pcToolError;', ctx);
  return ctx;
}
// The port with its ledger, storing under `home` the way pipeline.py does (<home>/.selects/plugin-data/<id>).
function port(home, opts = {}) {
  const di = host({ home, ...opts }), ctx = load(di);
  const data = path.join(home, '.selects', 'plugin-data', 'postcard-cutout-studio');
  fs.mkdirSync(data, { recursive: true });
  let p = null;
  const ledger = ctx.pcLedger(data, { sfx: () => p.sfx() });
  p = ctx.pcPort({ plugin: PKG, data }, { ledger });
  // Plain values, as the panel's own realm would see them after a structured read (deepEqual checks prototypes).
  const plain = f => async (...a) => { const v = await f(...a); return v == null || typeof v !== 'object' ? v : JSON.parse(JSON.stringify(v)); };
  return { ...Object.fromEntries(Object.entries({ ...p, ...ledger }).filter(([, v]) => typeof v === 'function').map(([k, v]) => [k, plain(v)])), data, ctx };
}
// pipeline.py, its CLI as the panel calls it, or a harness that stubs the mask service and urllib.
function py(home, op, args = {}, payload = null) {
  const harness = `
import sys,json,io,base64
sys.path.insert(0,${JSON.stringify(PKG)})
import pipeline
pipeline.heavy()
import urllib.request
urls=[]
payload=base64.b64decode(${JSON.stringify(payload ? Buffer.from(payload).toString('base64') : '')})
class R(io.BytesIO):
 status=200
 def __enter__(self):return self
 def __exit__(self,*a):return False
def urlopen(u,timeout=None):
 urls.append(u if isinstance(u,str) else u.full_url);return R(payload)
urllib.request.urlopen=urlopen
pipeline.ensure=lambda:{'port':1}
try:print(json.dumps({'out':pipeline.main(sys.argv[1],json.loads(sys.argv[2])),'urls':urls}))
except Exception as e:print(json.dumps({'error':str(e)}))
`;
  const env = { ...process.env, HOME: home }; delete env.SELECTS_USER_PANELS_ROOT;
  fs.mkdirSync(path.join(home, '.selects', 'plugin-data', 'postcard-cutout-studio'), { recursive: true });
  const r = spawnSync('python3', ['-c', harness, op, JSON.stringify(args)], { env, encoding: 'utf8', maxBuffer: 64 << 20 });
  assert.equal(r.status, 0, r.stderr);
  const res = JSON.parse(r.stdout.trim().split('\n').pop());
  if (res.error) { const e = Error(res.error); e.py = true; throw e; }
  return res;
}

// Media made once: a busy landscape clip with sound and a timecode, a short clip, a still, a JPEG turned by EXIF, a
// clip with a rotation, and a background-removed cutout of the first clip (VP9 with alpha) as Bria returns it.
let M = null;
function media() {
  if (M) return M;
  const dir = tmp('pc-media-'), f = n => path.join(dir, n);
  ff(['-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=30:duration=3', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', '-shortest', '-timecode', '01:00:00:00', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', f('Clip one.mp4')]);
  ff(['-f', 'lavfi', '-i', 'testsrc2=size=240x136:rate=25:duration=0.8', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', f('short.mov')]);
  ff(['-f', 'lavfi', '-i', 'smptebars=size=161x91', '-frames:v', '1', f('still.png')]);
  ff(['-f', 'lavfi', '-i', 'smptebars=size=200x120', '-frames:v', '1', '-q:v', '4', f('plain.jpg')]);
  const jpg = fs.readFileSync(f('plain.jpg'));
  const tiff = Buffer.from([0x4D, 0x4D, 0, 0x2A, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, 0, 0, 0, 0]);
  const app1 = Buffer.concat([Buffer.from([0xFF, 0xE1]), Buffer.from([0, 0]), Buffer.from('Exif\0\0', 'latin1'), tiff]); app1.writeUInt16BE(app1.length - 2, 2);
  fs.writeFileSync(f('turned.jpg'), Buffer.concat([jpg.subarray(0, 2), app1, jpg.subarray(2)]));
  ff(['-f', 'lavfi', '-i', 'testsrc2=size=160x96:rate=30:duration=1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', f('upright.mp4')]);
  ff(['-display_rotation', '90', '-i', f('upright.mp4'), '-c', 'copy', f('rotated.mp4')]);
  const alpha = "geq=lum='lum(X,Y)':cb='cb(X,Y)':cr='cr(X,Y)':a='if(lt(hypot(X-160-40*sin(T*3),Y-95),52),255,0)'";
  ff(['-i', f('Clip one.mp4'), '-t', '1.6', '-an', '-vf', 'format=yuva420p,' + alpha, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '20', f('cutout.webm')]);
  ff(['-ss', '0.5', '-i', f('Clip one.mp4'), '-t', '1.6', '-an', '-vf', 'format=yuva420p,' + alpha, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '20', f('shifted.webm')]);
  M = { dir, f };
  return M;
}

test('a failed host tool call reports ffmpeg\'s own words', { skip }, () => {
  const { ctx } = port(tmp());
  assert.equal(ctx.pcToolError(JSON.stringify({ type: 'FFmpegExecutionError', message: '1', stderr: 'No such file\n' })), 'No such file');
  assert.equal(ctx.pcToolError(Error('plain')), 'plain');
});

test('bundled sounds decode, match their manifest, and equal pipeline.py\'s', { skip: skip }, async () => {
  const home = tmp(), p = port(home), out = await p.sfx(), manifest = JSON.parse(fs.readFileSync(path.join(PKG, 'sfx/manifest.json'), 'utf8'));
  assert.deepEqual(Object.keys(out).sort(), Object.keys(manifest).sort());
  for (const [key, v] of Object.entries(manifest)) {
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(out[key].path)).digest('hex'), v.sha256, key);
    assert.equal(out[key].duration, v.duration);
  }
  if (python) {
    const ph = tmp(), env = { ...process.env, HOME: ph };
    const r = spawnSync('python3', ['-c', `import sys,json;sys.path.insert(0,${JSON.stringify(PKG)});import pipeline;print(json.dumps(pipeline.sfx_manifest()))`], { env, encoding: 'utf8' });
    const want = JSON.parse(r.stdout);
    for (const key of Object.keys(want)) {
      assert.deepEqual({ ...out[key], path: path.basename(out[key].path) }, { ...want[key], path: path.basename(want[key].path) }, key);
      assert.equal(md5(fs.readFileSync(out[key].path)), md5(fs.readFileSync(want[key].path)), key);
    }
  }
  const again = await p.sfx();
  assert.deepEqual(again, out, 'a decoded sound is never rewritten');
  const bad = tmp(), plugin = path.join(bad, 'pkg'); fs.mkdirSync(path.join(plugin, 'sfx'), { recursive: true });
  fs.writeFileSync(path.join(plugin, 'sfx/manifest.json'), JSON.stringify({ tone: { file: 'x.wav', duration: 1, sha256: '00' } }));
  fs.writeFileSync(path.join(plugin, 'sfx/x.wav.b64'), Buffer.from('RIFF').toString('base64'));
  const ctx = load(host({ home: bad })), L = ctx.pcLedger(bad), q = ctx.pcPort({ plugin, data: bad }, { ledger: L });
  await assert.rejects(q.sfx(), /does not match its manifest/);
});

test('folder listing matches pipeline.py: order, hidden files, subfolders, search, pages', { skip: skip }, async () => {
  const root = tmp('pc-folder-'), w = (rel, body = 'x') => { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, body); };
  for (const rel of ['b.mp4', 'a.JPG', '.hidden.mp4', 'notes.txt', 'Sub/c.mov', 'Sub/Deeper/d.webp', '.Hidden/e.mp4', '\uC5EC\uD589 \uC0AC\uC9C4/f g.png', 'Z/z.mkv']) w(rel);
  for (let i = 0; i < 30; i++) w('many/' + String(i).padStart(2, '0') + '.mp4');
  const p = port(tmp());
  const first = await p['folder-media']({ path: root });
  assert.equal(first.total, 36);
  assert.deepEqual(first.rows.slice(0, 2).map(r => r.relativePath), ['a.JPG', 'b.mp4']);
  assert.ok(!first.rows.some(r => /hidden/i.test(r.relativePath)));
  const search = await p['folder-media']({ path: root, query: 'SUB' });
  assert.deepEqual(search.rows.map(r => r.relativePath), [path.join('Sub', 'c.mov'), path.join('Sub', 'Deeper', 'd.webp')]);
  await assert.rejects(p['folder-media']({ path: path.join(root, 'b.mp4') }), /not an individual file/);
  if (python) for (const args of [{ path: root }, { path: root, offset: 24 }, { path: root, query: 'sub' }, { path: root, query: '\uC0AC\uC9C4' }]) {
    const want = py(tmp(), 'folder-media', args).out, got = await p['folder-media'](args);
    assert.deepEqual(JSON.parse(JSON.stringify(got)), want, JSON.stringify(args));
  }
});

test('tiles, scrub strips and shown sizes match pipeline.py byte for byte', { skip: skipParity }, async () => {
  const { f } = media(), p = port(tmp());
  for (const file of [f('Clip one.mp4'), f('short.mov'), f('still.png'), f('plain.jpg')]) {
    const got = await p.tile({ path: file }), want = py(tmp(), 'tile', { path: file }).out;
    assert.deepEqual({ ...got, thumb: md5(got.thumb) }, { ...want, thumb: md5(want.thumb) }, path.basename(file));
  }
  const home = tmp(), strip = await p.strip({ path: f('Clip one.mp4'), count: 10 }), want = py(home, 'strip', { path: f('Clip one.mp4'), count: 10 }).out;
  assert.equal(strip.count, 10); assert.deepEqual(strip.times, want.times); assert.equal(md5(strip.strip), md5(want.strip));
  assert.deepEqual(await p.strip({ path: f('Clip one.mp4'), count: 10 }), strip, 'cached');
  await assert.rejects(p.strip({ path: f('still.png') }), /duration/);
  const paths = ['Clip one.mp4', 'still.png', 'plain.jpg', 'turned.jpg', 'rotated.mp4', 'missing.mp4'].map(f);
  const sizes = await p.sizes({ paths });
  assert.deepEqual(sizes[f('turned.jpg')], { width: 120, height: 200 });
  assert.deepEqual(sizes[f('rotated.mp4')], { width: 96, height: 160 });
  assert.equal(sizes[f('missing.mp4')], null);
  assert.deepEqual(JSON.parse(JSON.stringify(sizes)), py(tmp(), 'sizes', { paths }).out);
});

test('holds, silent copies and the cutout input show the same frames as pipeline.py, as one stream', { skip: skipParity }, async () => {
  const { f } = media(), p = port(tmp());
  const cases = [['hold', { path: f('Clip one.mp4'), start: 0, target: 2.1, silent: true }], ['hold', { path: f('Clip one.mp4'), start: 2.2, target: 2.1, silent: true }],
    ['hold', { path: f('short.mov'), start: 0, target: 1.5 }], ['hold', { path: f('still.png'), start: 0, target: 2.1 }],
    ['silent', { path: f('Clip one.mp4') }], ['silent', { path: f('upright.mp4') }], ['cutout-input', { path: f('Clip one.mp4'), start: 0.5, seconds: 1.6 }]];
  for (const [op, args] of cases) {
    const got = await p[op](args), want = py(tmp(), op, args).out, label = op + ' ' + JSON.stringify(args);
    const strip = x => { const { path: q, name, ...rest } = x; return rest; };
    assert.deepEqual(JSON.parse(JSON.stringify(strip(got))), strip(want), label);
    assert.equal(path.basename(got.path).replace(/[a-f0-9]{24}/, 'KEY'), path.basename(want.path).replace(/[a-f0-9]{24}/, 'KEY'), label);
    assert.equal(frames(got.path), frames(want.path), label);
    if (got.path !== args.path) assert.deepEqual(streams(got.path).map(s => s.codec_type), ['video'], label + ': one stream');
  }
  assert.equal((await p.silent({ path: f('upright.mp4') })).path, f('upright.mp4'), 'a clip with no sound is used as it is');
  await assert.rejects(p.hold({ path: f('Clip one.mp4'), start: 5, target: 2 }), /past the end/);
});

test('the cutout check, masks, foreground and subject box match pipeline.py', { skip: skipParity, timeout: 240000 }, async () => {
  const { f } = media();
  const run = { projectId: 'p1', settings: { subjectId: 'r1', subjectStartSec: 0 }, source: { path: f('Clip one.mp4'), name: 'Clip one.mp4', frameSize: { width: 320, height: 180 } } };
  const args = rid => ({ runId: rid, sourcePath: f('Clip one.mp4'), cutoutPath: f('cutout.webm'), startSeconds: 0, seconds: 1.52 });
  const jh = tmp(), ph = tmp(), J = port(jh, { stderrInResult: false });
  const jd = await J.init(run), got = await J.prepare(args(jd.runId));
  const pd = py(ph, 'init', run).out, { out: want, urls } = py(ph, 'prepare', args(pd.runId), Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));
  assert.equal(urls.length, 1, 'pipeline.py checked its first mask over HTTP; the port reads the file');
  assert.equal(got.phase, 'maskReady'); assert.equal(want.phase, 'maskReady');
  for (const k of ['fps', 'count', 'sourceStartSeconds', 'provenanceOk']) assert.equal(got.mask[k], want.mask[k], k);
  assert.ok(Math.abs(got.mask.provenanceSsim - want.mask.provenanceSsim) < 1e-5, got.mask.provenanceSsim + ' vs ' + want.mask.provenanceSsim);
  assert.equal(got.mask.provenanceNeighbourSsim.length, want.mask.provenanceNeighbourSsim.length);
  got.mask.provenanceNeighbourSsim.forEach((v, i) => assert.ok(Math.abs(v - want.mask.provenanceNeighbourSsim[i]) < 1e-5, 'neighbour ' + i));
  assert.equal(got.mask.baseUrl, 'selects-file://' + encodeURI(got.mask.path), 'pathToLocalURL, no trailing slash');
  const names = fs.readdirSync(want.mask.path).sort();
  assert.deepEqual(fs.readdirSync(got.mask.path).sort(), names);
  for (const n of names) assert.equal(md5(fs.readFileSync(path.join(got.mask.path, n))), md5(fs.readFileSync(path.join(want.mask.path, n))), n);
  assert.equal(path.basename(got.foregroundPath), path.basename(want.foregroundPath));
  assert.equal(frames(got.foregroundPath, ['-c:v', 'libvpx-vp9']), frames(want.foregroundPath, ['-c:v', 'libvpx-vp9']), 'foreground colour');
  const alpha = file => md5(execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-c:v', 'libvpx-vp9', '-i', file, '-vf', 'alphaextract', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 256 << 20 }));
  assert.equal(alpha(got.foregroundPath), alpha(want.foregroundPath), 'foreground alpha');
  const events = fs.readFileSync(path.join(got.logDir, 'events.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).map(e => e.stage + '/' + e.status);
  for (const e of ['mask-prepare/start', 'cutout-check/end', 'foreground-encode/end', 'mask-coverage/end', 'mask-prepare/end']) assert.ok(events.includes(e), e);
  assert.ok(fs.existsSync(path.join(got.logDir, 'cutout-check.stderr.log')));
  // subject-box, then the foreground rebuilt from the masks (the 'foreground' op).
  const box = await J['subject-box']({ runId: jd.runId }), wantBox = py(ph, 'subject-box', { runId: pd.runId }).out;
  assert.deepEqual(box, wantBox);
  assert.deepEqual(await J['subject-box']({ runId: jd.runId }), box, 'kept with the run');
  for (const [home, rid, eng] of [[jh, jd.runId, 'js'], [ph, pd.runId, 'py']]) {
    const rp = path.join(home, '.selects/plugin-data/postcard-cutout-studio/runs', rid, 'run.json'), d = JSON.parse(fs.readFileSync(rp, 'utf8'));
    fs.rmSync(d.foregroundPath); delete d.foregroundPath; delete d.foregroundVersion; fs.writeFileSync(rp, JSON.stringify(d));
    if (eng === 'js') await J.foreground({ runId: rid }); else py(home, 'foreground', { runId: rid });
  }
  const rebuilt = rid => JSON.parse(fs.readFileSync(path.join(jh, '.selects/plugin-data/postcard-cutout-studio/runs', rid, 'run.json'), 'utf8')).foregroundPath;
  const prebuilt = JSON.parse(fs.readFileSync(path.join(ph, '.selects/plugin-data/postcard-cutout-studio/runs', pd.runId, 'run.json'), 'utf8')).foregroundPath;
  assert.equal(alpha(rebuilt(jd.runId)), alpha(prebuilt), 'rebuilt foreground alpha');
  assert.equal((await J.prepare(args(jd.runId))).mask.path, got.mask.path, 'a prepared run is returned as it is');
  // A cutout made from half a second later is refused by both, with the same scores.
  const jd2 = await J.init({ ...run, projectId: 'p2' }), pd2 = py(ph, 'init', { ...run, projectId: 'p2' }).out;
  const shifted = rid => ({ ...args(rid), cutoutPath: f('shifted.webm') });
  const jsErr = await J.prepare(shifted(jd2.runId)).then(() => null, e => e.message);
  let pyErr = null; try { py(ph, 'prepare', shifted(pd2.runId)); } catch (e) { pyErr = e.message; }
  assert.match(jsErr, /does not line up/); assert.match(pyErr, /does not line up/);
  const nums = s => s.match(/\d\.\d{4}/g).map(Number);
  nums(jsErr).forEach((v, i) => assert.ok(Math.abs(v - nums(pyErr)[i]) <= 1e-4, jsErr + ' vs ' + pyErr));
  assert.ok(!fs.readdirSync(path.join(J.data, 'runs', jd2.runId)).some(n => n.startsWith('mask-preparing') || n === 'masks'), 'nothing kept');
  // The same stretch is then reused by a new run, and needs no cutout input.
  await J.update({ runId: jd.runId, patch: { phase: 'complete' } });
  assert.deepEqual(await J['cutout-input']({ path: f('Clip one.mp4'), start: 0, seconds: 1.6, projectId: 'p1' }), { reusable: true });
});

test('the editor probes: subject facts, range preview frames as scene_preview.py makes them, the export check', { skip: skipParity }, async () => {
  const { f } = media(), p = port(tmp());
  const info = JSON.parse(await p.probeText(f('Clip one.mp4')));
  assert.equal(Number(info.format.duration).toFixed(1), '3.0'); assert.equal(info.streams[0].width, 320);
  const got = await p.rangePreview(f('Clip one.mp4'), 0.5, 2.5, 4);
  const want = JSON.parse(execFileSync('python3', [path.join(PKG, 'scene_preview.py'), f('Clip one.mp4'), '0.5', '2.5', '4'], { encoding: 'utf8' }));
  assert.deepEqual(got.frames.map(md5), want.frames.map(md5));
  assert.equal((await p.decodeCheck(f('Clip one.mp4'))).exitCode, 0);
  const broken = path.join(tmp(), 'broken.mp4'); fs.writeFileSync(broken, fs.readFileSync(f('Clip one.mp4')).subarray(0, 4000));
  assert.equal((await p.decodeCheck(broken)).exitCode, 1);
});

test('settings and the job record keep pipeline.py\'s files', { skip: skip }, async () => {
  const home = tmp(), p = port(home);
  assert.deepEqual(await p['settings-save']({ projectId: 'p1', settings: { title: 'A' } }), { saved: true });
  await p['settings-save']({ projectId: 'p1', settings: { subtitle: 'B' } });
  assert.deepEqual(await p['settings-load']({ projectId: 'p1' }), { title: 'A', subtitle: 'B' });
  assert.deepEqual(await p['settings-load']({ projectId: 'p2' }), {});
  const source = path.join(home, 'clip.mp4'); fs.writeFileSync(source, 'x');
  const d = await p.init({ projectId: 'p1', settings: { subjectStartSec: 0 }, source: { path: source } });
  fs.mkdirSync(d.logDir, { recursive: true }); fs.writeFileSync(path.join(d.logDir, 'generation-job.json'), JSON.stringify({ jobId: 'j1', status: 'submitted' }));
  assert.equal((await p['job-record']({ runId: d.runId })).generation.jobId, 'j1');
});

test('on Windows helper() runs the port, never the shell; an old Selects gets one update line', async () => {
  const from = panel.indexOf('const PC_MIN_HOST='), to = panel.indexOf('// mac-only:start');
  assert.ok(from > 0 && to > from);
  const wiring = panel.slice(from, to), trace = panel.match(/^function traceStep[^\n]*$/m)[0];
  const make = (platform, version) => {
    const home = tmp(), skills = path.join(home, '.selects', 'skills', 'postcard-cutout-studio');
    fs.mkdirSync(path.dirname(skills), { recursive: true }); fs.symlinkSync(PKG, skills);
    const di = host({ home, platform }); di.environment.version = version;
    const ctx = vm.createContext({ sdk: di, panelLocalClient: s => s, window: { parent: { get __DI__(){throw Error('Migrated operations must not use DI');} } }, navigator: {}, crypto: globalThis.crypto, TextEncoder, TextDecoder,
      AbortController, setTimeout, clearTimeout, atob, btoa, console, performance });
    const shell = name => 'function ' + name + '(){throw Error("shell reached")}';
    vm.runInContext([block('av-host'), trace, wiring, block('pc-ledger'), block('pc-port'), ...['macHelper', 'macProbeSubject', 'macRangePreview', 'macDecodeCheck'].map(shell),
      'bindLocalSdk(sdk);this.helper=helper;this.pcHostIssue=pcHostIssue;this.samePath=samePath;this.probeSubject=probeSubject;'].join('\n'), ctx);
    return { ctx, home, sdk: di };
  };
  const sdk = { runShell: () => { throw Error('runShell reached'); } };
  const win = make('win32', '2.0.520'), folder = tmp(); fs.writeFileSync(path.join(folder, 'a.mp4'), 'x');
  assert.equal(win.ctx.pcHostIssue(), '');
  assert.equal((await win.ctx.helper(win.sdk, 'folder-media', { path: folder })).total, 1);
  assert.equal(await win.ctx.helper(win.sdk, 'load', { projectId: 'p1' }), null);
  assert.equal(JSON.stringify(await win.ctx.helper(win.sdk, 'ensure')), '{}');
  await assert.rejects(win.ctx.helper(win.sdk, 'rvm-preview', {}), /Unknown operation/);
  assert.ok(fs.existsSync(path.join(win.home, '.selects', 'plugin-data', 'postcard-cutout-studio')));
  if (tools) { const { f } = media(); assert.equal(JSON.parse((await win.ctx.probeSubject(win.sdk, f('Clip one.mp4'))).stdout).streams[0].width, 320); }
  const old = make('win32', '2.0.507');
  assert.match(old.ctx.pcHostIssue(), /needs Selects 2\.0\.508 or later on Windows\. Update Selects/);
  await assert.rejects(old.ctx.helper(old.sdk, 'load', { projectId: 'p1' }), /Update Selects/);
  const mac = make('darwin', '2.0.400');
  assert.equal(mac.ctx.pcHostIssue(), '');
  await assert.rejects(mac.ctx.helper(mac.sdk, 'load', {}), /shell reached/, 'macOS keeps pipeline.py');
  assert.equal(win.ctx.samePath('C:\\Users\\A\\Clip.MP4', 'c:/users/a/clip.mp4'), true);
  assert.equal(mac.ctx.samePath('/Volumes/A/Clip.MP4', '/Volumes/a/clip.mp4'), false);
});
