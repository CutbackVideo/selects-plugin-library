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

// A stand-in for window.parent.__DI__: the local ffmpeg and node:fs. `downloads` maps URLs to local files.
function host(platform, downloads = {}) {
  return {
    Runtime: {
      getPlatform: () => platform,
      runFFmpeg: (args, _quiet, signal, _out, onStderr) => run('ffmpeg', args, {signal, onStderr}),
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
function loadEngine(platform, {downloads, fetch} = {}) {
  const code = [region('// av-host:start', '// av-host:end'), line('const q = ').replace('(v: string)', '(v)'), region('// cw-engine:start', '// cw-engine:end'),
    '({cwEngine, cwCommonsRows: typeof cwCommonsRows === "function" ? cwCommonsRows : null})'].join('\n');
  const context = vm.createContext({window: {parent: {__DI__: host(platform, downloads)}}, navigator: {platform: platform === 'win32' ? 'Win32' : 'MacIntel', userAgent: ''},
    setTimeout, clearTimeout, AbortController, TextEncoder, TextDecoder, console, fetch});
  return vm.runInContext(code, context);
}
// engine.mjs on the same job, in its own folder.
function engineMjs(cmd, job, dir) {
  fs.mkdirSync(dir, {recursive: true});
  const file = path.join(dir, cmd + '.json');
  fs.writeFileSync(file, JSON.stringify(job));
  const r = spawnSync(process.execPath, [path.join(PLUGIN, 'engine.mjs'), cmd, file], {encoding: 'utf8'});
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
