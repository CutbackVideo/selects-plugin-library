// Chris Williamson Style: host path keys, and the panel's port of engine.mjs (shots, faces, candidates, assets on
// the host's ffmpeg) checked against engine.mjs itself on the same inputs. The panel code runs in node:vm with a
// stand-in host (window.parent.__DI__) whose ffmpeg is the local one, so values cross realms as they do in Selects.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import os from 'node:os';
import {spawn, spawnSync} from 'node:child_process';

const PLUGIN = path.resolve(import.meta.dirname, '../plugins/chris-williamson-style');
const PANEL = fs.readFileSync(path.join(PLUGIN, 'panel.tsx'), 'utf8');

function line(prefix) {
  const at = PANEL.indexOf('\n' + prefix);
  assert.ok(at >= 0, prefix + ' is missing');
  return PANEL.slice(at + 1, PANEL.indexOf('\n', at + 1));
}
const keys = new Function(line('function pathKey(') + '\n' + line('function treePaths(') + '\nreturn {pathKey, treePaths};')();

test('path keys: macOS paths compare as before, Windows paths fold case and separators', () => {
  const {pathKey} = keys;
  assert.equal(pathKey('/Volumes/A/Chris/b001.mp4'), '/Volumes/A/Chris/b001.mp4');
  assert.notEqual(pathKey('/Volumes/A/B.mp4'), pathKey('/Volumes/A/b.mp4'));
  assert.equal(pathKey('C:\\Users\\\ud64d\\.selects\\B001.MP4'), pathKey('c:/users/\ud64d/.selects/b001.mp4'));
  assert.equal(pathKey('\\\\nas\\Share\\x.mp4'), '//nas/share/x.mp4');
  // NFD (as some macOS volumes report names) and NFC are one key.
  assert.equal(pathKey('/x/\u1112\u1169\u11bc.mp4'), pathKey('/x/\ud64d.mp4'));
});

test('path keys: the run_script prelude carries the same function', () => {
  const pk = new Function('return ' + keys.pathKey.toString())();
  assert.equal(pk('C:\\A\\b.MP4'), 'c:/a/b.mp4');
  assert.match(PANEL, /const RESOLVE_PATHS = `const __pk=\$\{pathKey\.toString\(\)\};/);
  assert.match(PANEL, /idByPath\[__pk\(n\.path\)\] = n\.resourceId/);
  assert.doesNotMatch(PANEL, /idByPath\[\$\{JSON\.stringify/);
  assert.doesNotMatch(PANEL, /JSON\.stringify\(imported\)\.includes/);
});

test('treePaths finds every path in a Project file tree', () => {
  const tree = {fileTree: [{type: 'dir', path: 'C:\\r\\Chris Williamson Style x', children: [{type: 'video', path: 'C:\\r\\Chris Williamson Style x\\b001.mp4', resourceId: 'r1'}]}]};
  const found = keys.treePaths(tree);
  assert.deepEqual(found, ['C:\\r\\Chris Williamson Style x', 'C:\\r\\Chris Williamson Style x\\b001.mp4']);
  assert.ok(found.some((p) => keys.pathKey(p).startsWith(keys.pathKey('c:/R/chris williamson style x'))));
});

// ---------------------------------------------------------------------------------------------------------
// The engine port against engine.mjs.
const HAVE_FFMPEG = spawnSync('ffmpeg', ['-version']).status === 0;
const region = (start, end) => {
  const a = PANEL.indexOf(start), b = PANEL.indexOf(end);
  assert.ok(a >= 0 && b > a, start + ' region is missing');
  return PANEL.slice(a, b + end.length);
};

function run(cmd, args, {signal, onStderr} = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {stdio: ['ignore', 'pipe', 'pipe'], signal});
    let stdout = '', stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => { stderr += d; onStderr?.(String(d)); });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve({stdout, stderr}) : reject(Object.assign(new Error('exit ' + code), {stderr}))));
  });
}

// A stand-in for window.parent.__DI__: the local ffmpeg and node:fs. `downloads` maps URLs to local files;
// `encoders` (optional) rewrites the encoder list the host's ffmpeg reports and counts the times it is asked.
function host(platform, downloads = {}, encoders = null) {
  return {
    Runtime: {
      getPlatform: () => platform,
      runFFmpeg: async (args, _quiet, signal, onStdout, onStderr) => {
        if (!encoders || !args.includes('-encoders')) return run('ffmpeg', args, {signal, onStderr});
        encoders.calls += 1;
        const r = await run('ffmpeg', args, {signal});
        const stdout = encoders.rewrite(r.stdout);
        onStdout?.(stdout);
        return {stdout: encoders.viaCallbackOnly ? '' : stdout, stderr: ''};
      },
      runFFprobe: (args, _quiet, signal) => run('ffprobe', args, {signal}),
    },
    FileSystem: {
      join: (...p) => path.join(...p), homedir: () => os.homedir(), dirname: (p) => path.dirname(p),
      existsSync: (p) => fs.existsSync(p), statSync: (p) => fs.statSync(p), mkdirSync: (p, o) => fs.mkdirSync(p, o),
      readFile: (p) => fs.promises.readFile(p), writeFile: (p, d) => fs.promises.writeFile(p, d),
      copyFile: (a, b) => fs.promises.copyFile(a, b), removeFile: ({filePath}) => fs.promises.rm(filePath, {force: true}),
      downloadFile: async (url, dest) => { if (!downloads[url]) throw new Error('404 ' + url); await fs.promises.copyFile(downloads[url], dest); },
    },
  };
}
function loadEngine(platform, {downloads, fetch, encoders} = {}) {
  const code = [region('// av-host:start', '// av-host:end'), line('const q = ').replace('(v: string)', '(v)'), region('// cw-engine:start', '// cw-engine:end'),
    '({cwEngine, cwPickEncoder, cwCommonsRows: typeof cwCommonsRows === "function" ? cwCommonsRows : null})'].join('\n');
  const context = vm.createContext({window: {parent: {__DI__: host(platform, downloads, encoders)}}, navigator: {platform: platform === 'win32' ? 'Win32' : 'MacIntel', userAgent: ''},
    setTimeout, clearTimeout, AbortController, TextEncoder, TextDecoder, console, fetch});
  return vm.runInContext(code, context);
}
// engine.mjs on the same job, in its own folder.
function engineMjs(cmd, job, dir, env = process.env) {
  fs.mkdirSync(dir, {recursive: true});
  const file = path.join(dir, cmd + '.json');
  fs.writeFileSync(file, JSON.stringify(job));
  const r = spawnSync(process.execPath, [path.join(PLUGIN, 'engine.mjs'), cmd, file], {encoding: 'utf8', env});
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(fs.readFileSync(path.join(dir, cmd + '-result.json'), 'utf8'));
}
async function ported(platform, cmd, job, dir, opts = {}) {
  fs.mkdirSync(dir, {recursive: true});
  const file = path.join(dir, cmd + '.json');
  fs.writeFileSync(file, JSON.stringify(job));
  const {cwEngine} = loadEngine(platform, opts);
  await cwEngine(opts.env || {pluginDir: PLUGIN}, cmd, file);
  return JSON.parse(fs.readFileSync(path.join(dir, cmd + '-result.json'), 'utf8'));
}
const ff = (...args) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8'}); assert.equal(r.status, 0, r.stderr); };
let media = null;
// Test media: a clip with two hard cuts (2 s, 4 s), a moving clip and two stills.
function fixtures() {
  if (media) return media;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cws-media-'));
  const cuts = path.join(dir, 'cuts.mp4');
  ff('-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=30:duration=2', '-f', 'lavfi', '-i', 'smptebars=size=640x360:rate=30:duration=2',
    '-f', 'lavfi', '-i', 'mandelbrot=size=640x360:rate=30', '-filter_complex', '[2:v]trim=duration=2,setpts=PTS-STARTPTS[m];[0:v][1:v][m]concat=n=3:v=1[v]', '-map', '[v]', '-pix_fmt', 'yuv420p', cuts);
  const moving = path.join(dir, 'moving.mp4');
  ff('-f', 'lavfi', '-i', 'testsrc2=size=1280x720:rate=30:duration=6', '-pix_fmt', 'yuv420p', moving);
  const still = path.join(dir, 'still.jpg');
  ff('-f', 'lavfi', '-i', 'testsrc=size=1200x800', '-frames:v', '1', still);
  const still2 = path.join(dir, 'still2.png');
  ff('-f', 'lavfi', '-i', 'smptebars=size=900x700', '-frames:v', '1', still2);
  return (media = {dir, cuts, moving, still, still2});
}
test.after(() => { if (media) fs.rmSync(media.dir, {recursive: true, force: true}); });
// Results with each run's own folder replaced by <dir>.
const strip = (value, dir) => JSON.parse(JSON.stringify(value).split(JSON.stringify(dir).slice(1, -1)).join('<dir>'));

for (const platform of ['darwin', 'win32']) {
  test('shots: the panel finds the same camera changes as engine.mjs (' + platform + ')', {skip: !HAVE_FFMPEG && 'no ffmpeg'}, async () => {
    const m = fixtures();
    const job = {shots: {ffmpeg: 'ffmpeg', threshold: 0.3, ranges: [{key: '0', path: m.cuts, startSeconds: 0, seconds: 6}, {key: '1', path: m.cuts, startSeconds: 1, seconds: 4}, {key: '2', path: m.moving, startSeconds: 0.5, seconds: 5}]}};
    const want = engineMjs('shots', job, path.join(m.dir, 'e-shots'));
    const got = await ported(platform, 'shots', job, path.join(m.dir, 'p-shots-' + platform));
    assert.deepEqual(got, want);
    assert.deepEqual(want.cuts['0'], [2, 4]);
  });
}

const probe = (file) => JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,codec_name,nb_read_frames', '-of', 'json', file], {encoding: 'utf8'}).stdout).streams[0];

for (const platform of ['darwin', 'win32']) {
  test('assets: the panel renders the same cutaways and credits as engine.mjs (' + platform + ')', {skip: !HAVE_FFMPEG && 'no ffmpeg'}, async () => {
    const m = fixtures();
    const credit = {source: 'Wikimedia Commons', url: 'https://example.org/a.jpg', page: 'https://example.org/a', license: 'CC BY 4.0', author: 'A', originalPath: null};
    const items = [
      {id: 'b001', desiredKind: 'video', seconds: 2.25, review: {accepted: true, focusX: 0.3, focusY: 0.5}, candidate: {file: m.still, kind: 'still', duration: 0, motionDelta: 0, ...credit}},
      {id: 'b002', desiredKind: 'video', seconds: 1.5, review: {accepted: true, focusX: 0.5, focusY: 0.5}, candidate: {file: m.moving, kind: 'video', duration: 6, motionDelta: 12.5, ...credit}},
      {id: 'b003', desiredKind: 'video', seconds: 9, review: {accepted: true, focusX: 0.5, focusY: 0.5}, candidate: {file: m.moving, kind: 'video', duration: 6, ...credit}},
      {id: 'b004', desiredKind: 'video', seconds: 2, review: {accepted: false}, candidate: {file: m.still, kind: 'still'}},
    ];
    const job = {assets: {ffmpeg: 'ffmpeg', fps: 30, mediaFolder: 'Chris Williamson Style t', items}};
    const eDir = path.join(m.dir, 'e-assets'), pDir = path.join(m.dir, 'p-assets-' + platform);
    // An earlier pass's credits are kept.
    for (const d of [eDir, pDir]) { fs.mkdirSync(d, {recursive: true}); fs.writeFileSync(path.join(d, 'CREDITS.json'), JSON.stringify([{id: 'r001', ok: true}])); }
    const want = engineMjs('assets', job, eDir);
    const got = await ported(platform, 'assets', job, pDir);
    assert.deepEqual(strip(got, pDir), strip(want, eDir));
    assert.deepEqual(strip(JSON.parse(fs.readFileSync(path.join(pDir, 'CREDITS.json'), 'utf8')), pDir), strip(JSON.parse(fs.readFileSync(path.join(eDir, 'CREDITS.json'), 'utf8')), eDir));
    assert.deepEqual(got.items.map((i) => i.ok), [true, true, false, false]);
    for (const row of got.items.filter((i) => i.ok)) {
      const a = probe(row.path), b = probe(row.path.replace(pDir, eDir));
      assert.deepEqual(a, b);
      assert.equal(a.width, 1080); assert.equal(a.height, 1920); assert.equal(a.codec_name, 'h264');
      for (const f of row.frames) assert.ok(fs.statSync(f).size > 0);
    }
  });
}

// The cutaway encoder: libx264 when the host's ffmpeg lists it, else mpeg4 in the same .mp4; an unreadable list keeps
// libx264 (engine.mjs's choice). Hardware H.264 encoders and libx264rgb don't count.
const ENCODERS = `Encoders:
 V..... = Video
 A..... = Audio
 ------
 V....D libx264              libx264 H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10 (codec h264)
 V....D libx264rgb           libx264 H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10 RGB (codec h264)
 V....D h264_mf              H264 via MediaFoundation (codec h264)
 V....D mpeg4                MPEG-4 part 2
 V....D mjpeg                MJPEG (Motion JPEG)
`;
test('cwPickEncoder: libx264 when listed, else mpeg4; an unreadable list keeps libx264', () => {
  const {cwPickEncoder} = loadEngine('win32');
  const x264 = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18'], mpeg4 = ['-c:v', 'mpeg4', '-q:v', '2'];
  const pick = (list) => { const e = cwPickEncoder(list); return [e.codec, [...e.args]]; };
  const noX264 = ENCODERS.replace(/^ V\S* libx264 .*\n/m, '');
  assert.ok(!/^ V\S* libx264 /m.test(noX264) && /^ V\S* libx264rgb /m.test(noX264));
  assert.deepEqual(pick(ENCODERS), ['libx264', x264]);
  assert.deepEqual(pick(noX264), ['mpeg4', mpeg4]);
  assert.deepEqual(pick(noX264.replace(/\n/g, '\r\n')), ['mpeg4', mpeg4]);
  for (const unreadable of ['', null, undefined, 'ffmpeg: not found', 'Encoders:\n V..... = Video\n ------\n'])
    assert.deepEqual(pick(unreadable), ['libx264', x264], String(unreadable));
});

for (const viaCallbackOnly of [false, true]) {
  test('assets without libx264: mpeg4 cutaways with the same size and frames as engine.mjs, one encoder probe (' + (viaCallbackOnly ? 'onStdout' : 'stdout') + ')', {skip: !HAVE_FFMPEG && 'no ffmpeg'}, async () => {
    const m = fixtures();
    const items = [
      {id: 'b001', desiredKind: 'video', seconds: 2.25, review: {accepted: true, focusX: 0.3, focusY: 0.5}, candidate: {file: m.still, kind: 'still', duration: 0}},
      {id: 'b002', desiredKind: 'video', seconds: 1.5, review: {accepted: true, focusX: 0.5, focusY: 0.5}, candidate: {file: m.moving, kind: 'video', duration: 6}},
    ];
    const job = {assets: {ffmpeg: 'ffmpeg', fps: 30, mediaFolder: 'Chris Williamson Style t', items}};
    const tag = viaCallbackOnly ? 'cb' : 'out';
    const eDir = path.join(m.dir, 'e-assets-nox264-' + tag), pDir = path.join(m.dir, 'p-assets-nox264-' + tag);
    const encoders = {calls: 0, viaCallbackOnly, rewrite: (text) => text.split('\n').filter((l) => !/^\s*V\S*\s+libx264\s/.test(l)).join('\n')};
    const want = engineMjs('assets', job, eDir);
    const got = await ported('win32', 'assets', job, pDir, {encoders});
    assert.deepEqual(strip(got, pDir), strip(want, eDir));
    assert.equal(encoders.calls, 1);
    for (const row of got.items) {
      const a = probe(row.path), b = probe(row.path.replace(pDir, eDir));
      assert.equal(a.codec_name, 'mpeg4'); assert.equal(b.codec_name, 'h264');
      assert.deepEqual([a.width, a.height, a.nb_read_frames], [b.width, b.height, b.nb_read_frames]);
      assert.equal(path.extname(row.path), '.mp4');
      const streams = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type', '-of', 'json', row.path], {encoding: 'utf8'}).stdout).streams;
      assert.deepEqual(streams.map((x) => x.codec_type), ['video']);
    }
  });
}

// A stand-in `curl` for engine.mjs and the macOS branch: web URLs come from local files, the Commons API from a
// fixture; every call's user agent is logged. The Windows branch gets the same through downloadFile and fetch.
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
function network(m) {
  const web = {'https://img.example/a.jpg': m.still2, 'https://upload.wikimedia.org/c1.jpg': m.still, 'https://upload.wikimedia.org/c2.png': m.still2};
  const page = (i, title, mime, w, h, url) => ({index: i, title, imageinfo: [{mime, width: w, height: h, url, thumburl: url, descriptionurl: 'https://commons.wikimedia.org/wiki/' + title,
    extmetadata: {LicenseShortName: {value: 'CC BY-SA 4.0'}, Artist: {value: '<a href="x">Someone</a> '}}}]});
  const commons = JSON.stringify({query: {pages: {'9': page(2, 'File:C2.png', 'image/png', 1600, 900, 'https://upload.wikimedia.org/c2.png'),
    '7': page(1, 'File:C1.jpg', 'image/jpeg', 1600, 1200, 'https://upload.wikimedia.org/c1.jpg'), '5': page(3, 'File:Small.jpg', 'image/jpeg', 300, 200, 'https://upload.wikimedia.org/s.jpg')}}});
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'cws-bin-'));
  const log = path.join(bin, 'agents.log');
  fs.writeFileSync(path.join(bin, 'commons.json'), commons);
  fs.writeFileSync(path.join(bin, 'curl'), `#!${process.execPath}
const fs=require('fs'),a=process.argv.slice(2),web=${JSON.stringify(web)};
const opt=(k)=>{const i=a.indexOf(k);return i>=0?a[i+1]:null;};const url=a[a.length-1],w=opt('-w')||'';
fs.appendFileSync(${JSON.stringify(log)},(opt('-A')||'')+' '+url.split('?')[0]+'\\n');
let code=404;
if(url.startsWith(${JSON.stringify(COMMONS_API)})){process.stdout.write(fs.readFileSync(${JSON.stringify(path.join(bin, 'commons.json'))},'utf8'));code=200;}
else if(web[url]){fs.copyFileSync(web[url],opt('-o'));code=200;}
process.stdout.write(w.replace(/\\\\n/g,'\\n').replace('%{http_code}',String(code)));
`, {mode: 0o755});
  const env = {...process.env, PATH: bin + path.delimiter + process.env.PATH};
  const shell = {pluginDir: PLUGIN, runShell: async (command) => {
    const r = spawnSync('/bin/sh', ['-c', command], {encoding: 'utf8', env});
    if (r.status !== 0) throw new Error(r.stderr || 'exit ' + r.status);
    return r.stdout;
  }};
  const downloads = {...web};
  const fetch = async (url) => ({status: 200, text: async () => (fs.appendFileSync(log, 'fetch ' + url.split('?')[0] + '\n'), commons)});
  return {bin, log, env, shell, downloads, fetch, agents: () => fs.readFileSync(log, 'utf8').trim().split('\n'), reset: () => fs.rmSync(log, {force: true})};
}

for (const platform of ['darwin', 'win32']) {
  test('candidates: the panel fetches, measures and previews like engine.mjs (' + platform + ')', {skip: !HAVE_FFMPEG && 'no ffmpeg'}, async () => {
    const m = fixtures(), net = network(m);
    try {
      const items = [
        {id: 'b001', query: 'runner sunrise', desiredKind: 'video', candidates: [{path: m.still, source: 'project'}, {path: m.moving}, {path: path.join(m.dir, 'missing.jpg')}]},
        {id: 'b002', query: 'oyster shell', desiredKind: 'video', candidates: [{url: 'https://img.example/a.jpg', page: 'https://img.example/a', license: 'Pexels', author: 'P', source: 'Pexels', title: 'A'}]},
        {id: 'b003', query: 'brain', desiredKind: 'video', candidates: [{url: 'https://img.example/missing.jpg'}]},
      ];
      const job = {candidates: {ffmpeg: 'ffmpeg', ffprobe: 'ffprobe', items}};
      const eDir = path.join(m.dir, 'e-cand-' + platform), pDir = path.join(m.dir, 'p-cand-' + platform);
      net.reset();
      const want = engineMjs('candidates', job, eDir, net.env);
      const engineAgents = net.agents();
      net.reset();
      const got = await ported(platform, 'candidates', job, pDir, {env: net.shell, downloads: net.downloads, fetch: net.fetch});
      assert.deepEqual(strip(got, pDir), strip(want, eDir));
      const rows = got.items.flatMap((i) => i.candidates);
      assert.deepEqual(rows.map((r) => r.error ? 'error' : r.kind), ['still', 'video', 'error', 'still', 'still', 'still', 'still', 'still']);
      assert.equal(rows[3 + 1].source, 'Wikimedia Commons');
      assert.equal(rows[3 + 1].author, 'Someone');
      for (const r of rows.filter((r) => !r.error)) for (const f of r.frames) assert.ok(fs.statSync(f).size > 0);
      // macOS sends what engine.mjs sent (browser agent for the web, the descriptive one for Wikimedia).
      if (platform === 'darwin') assert.deepEqual(net.agents(), engineAgents);
      else assert.deepEqual(net.agents().filter((l) => l.startsWith('fetch ')), ['fetch ' + COMMONS_API, 'fetch ' + COMMONS_API]);
    } finally { fs.rmSync(net.bin, {recursive: true, force: true}); }
  });
}

test('faces (macOS): the same frames as engine.mjs go to vision-helper.js, and its answer is read back', {skip: !HAVE_FFMPEG && 'no ffmpeg'}, async () => {
  const m = fixtures();
  const samples = Array.from({length: 23}, (_, i) => ({key: Math.floor(i / 3) + ':' + [0.25, 0.5, 0.75][i % 3], path: i % 2 ? m.moving : m.cuts, seconds: 0.2 * i}));
  samples.push({key: 'bad', path: path.join(m.dir, 'missing.mp4'), seconds: 1});
  const job = {ffmpeg: 'ffmpeg', faces: {samples}};
  // engine.mjs grabs its frames before it calls Apple Vision (osascript may be unavailable where tests run).
  const eDir = path.join(m.dir, 'e-faces');
  fs.mkdirSync(eDir, {recursive: true});
  fs.writeFileSync(path.join(eDir, 'faces.json'), JSON.stringify(job));
  spawnSync(process.execPath, [path.join(PLUGIN, 'engine.mjs'), 'faces', path.join(eDir, 'faces.json')], {encoding: 'utf8'});
  // The helper's answer for each image it is given (one call per 20 images).
  const calls = [];
  const env = {pluginDir: PLUGIN, runShell: async (command) => {
    calls.push(command);
    const files = [...command.matchAll(/'([^']+\.jpg)'/g)].map((x) => x[1]);
    assert.ok(command.startsWith("/usr/bin/osascript -l JavaScript '" + path.join(PLUGIN, 'vision-helper.js') + "' faces "));
    return files.map((f, i) => JSON.stringify({file: f, w: 640, h: 360, faces: i % 2 ? [] : [[0.4, 0.2, 0.2, 0.3]]})).join('\n') + '\n';
  }};
  const pDir = path.join(m.dir, 'p-faces');
  const got = await ported('darwin', 'faces', job, pDir, {env});
  assert.equal(got.sampled, 24);
  assert.equal(got.readable, 23);
  assert.deepEqual(calls.map((c) => (c.match(/\.jpg'/g) || []).length), [20, 3]);
  assert.equal(Object.keys(got.detected).length, 23);
  assert.deepEqual(got.detected['0:0.25'], {w: 640, h: 360, faces: [[0.4, 0.2, 0.2, 0.3]]});
  const grabbed = fs.readdirSync(path.join(pDir, 'faces')).sort();
  assert.deepEqual(grabbed, fs.readdirSync(path.join(eDir, 'faces')).sort());
  for (const f of grabbed) assert.ok(fs.readFileSync(path.join(pDir, 'faces', f)).equals(fs.readFileSync(path.join(eDir, 'faces', f))), f);
});

test('faces (Windows): nothing is detected and nothing is run; the pipeline centre-crops', async () => {
  const m = fixtures();
  const env = {pluginDir: PLUGIN, runShell: async () => assert.fail('no shell on Windows')};
  const got = await ported('win32', 'faces', {faces: {samples: [{key: '0:0.5', path: m.cuts, seconds: 1}]}}, path.join(m.dir, 'p-faces-win'), {env});
  assert.deepEqual(got, {detected: {}, sampled: 1, readable: 0});
  assert.ok(!fs.existsSync(path.join(m.dir, 'p-faces-win', 'faces')));
  assert.match(PANEL, /const face=ff\.length\?\[0,1,2,3\]\.map\(k=>median\(ff\.map\(r=>r\.faces\[0\]\[k\]\)\)\):\[0\.25,0\.2,0\.5,0\.3\];/);
});
