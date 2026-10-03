// The panel's short-video hold (the `// hold:start` block of panel.template.tsx) run in node:vm on the av-host
// helpers, with window.parent.__DI__ backed by node fs and the local ffmpeg/ffprobe (the host's bundled tools in
// Selects). It replaces hold_video.py; dev/hold_video.py stays as the parity reference on a dev Mac.
import assert from 'node:assert/strict';
import { execFile, execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const here = import.meta.dirname;
const template = fs.readFileSync(path.join(here, 'panel.template.tsx'), 'utf8');
const section = (start, end) => {
  const from = template.indexOf(start), to = template.indexOf(end);
  assert.ok(from >= 0 && to > from, start);
  return template.slice(from, to + end.length);
};
const blocks = section('// av-host:start', '// av-host:end') + '\n' + section('// hold:start', '// hold:end');
const has = tool => spawnSync(tool, ['-version']).status === 0;
const tools = has('ffmpeg') && has('ffprobe');

// Host services as the panel sees them; `runFFmpeg`/`runFFprobe` reject with a JSON string like the host does.
function host({ calls = [] } = {}) {
  const run = bin => (args, _quiet, signal) => new Promise((resolve, reject) => {
    calls.push([bin, ...args]);
    const child = execFile(bin, args, { encoding: 'utf8', maxBuffer: 64 << 20 }, (error, stdout, stderr) =>
      error ? reject(JSON.stringify({ type: 'FFmpegExecutionError', message: String(error.code), stderr })) : resolve({ stdout, stderr }));
    signal?.addEventListener('abort', () => child.kill());
  });
  const FileSystem = {
    join: (...parts) => path.join(...parts), homedir: () => os.homedir(), existsSync: p => fs.existsSync(p),
    mkdirSync: (p, o) => fs.mkdirSync(p, o), statSync: p => { try { return { ...fs.statSync(p) }; } catch { return null; } },
    renameSync: (a, b) => fs.renameSync(a, b), writeFile: async (p, d) => fs.writeFileSync(p, d),
    readFile: async p => fs.readFileSync(p), removeFile: async ({ filePath }) => fs.rmSync(filePath, { force: true }),
  };
  const Runtime = { getPlatform: () => process.platform, runFFmpeg: run('ffmpeg'), runFFprobe: run('ffprobe') };
  return { FileSystem, Runtime };
}
function load(di) {
  const window = { parent: { __DI__: di } };
  const context = vm.createContext({ window, navigator: {}, crypto: globalThis.crypto, TextEncoder, TextDecoder,
    AbortController, setTimeout, clearTimeout, console });
  vm.runInContext(blocks + '\nthis.holdVideos = holdVideos; this.holdDimensions = holdDimensions;', context);
  return context;
}
function sourceVideo(file, duration = 0.1) {
  execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-f', 'lavfi', '-i', `testsrc2=size=128x96:rate=30:duration=${duration}`,
    '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', file]);
}
const rawFrames = file => execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 256 << 20 });
const probe = file => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-show_entries',
  'stream=codec_name,width,height,r_frame_rate,avg_frame_rate,nb_read_frames', '-of', 'json', file], { encoding: 'utf8' })).streams;
function scratch() { return fs.mkdtempSync(path.join(os.tmpdir(), 'pg2-hold-')); }

test('output size follows hold_video.py: long edge at most 1920, even sides', () => {
  const { holdDimensions } = load(host());
  assert.deepEqual([...holdDimensions(128, 96)], [128, 96]);
  assert.deepEqual([...holdDimensions(3840, 2160)], [1920, 1080]);
  assert.deepEqual([...holdDimensions(1081, 1921)], [1080, 1920]);
  assert.deepEqual([...holdDimensions(4000, 3001)], [1920, 1440]);
  assert.deepEqual([...holdDimensions(2881, 3840)], [1440, 1920]);
  assert.deepEqual([...holdDimensions(1921, 961)], [1920, 960]);
});

test('requests are validated before any tool runs', async () => {
  const calls = [], { holdVideos } = load(host({ calls }));
  for (const [request, message] of [[{ videos: [], durationFrames: 18 }, /between 1 and 21/],
    [{ videos: [{ path: '/x.mp4' }], durationFrames: 0 }, /durationFrames/], [{ videos: [{}], durationFrames: 18 }, /needs a file path/]]) {
    await assert.rejects(holdVideos(request, os.tmpdir()), message);
  }
  await assert.rejects(holdVideos({ videos: [{ path: '/x.mp4' }], durationFrames: 18 }, null), /data folder/);
  assert.equal(calls.length, 0);
});

test('a Selects build without Runtime.runFFmpeg reports the missing host member', async () => {
  const di = host(); delete di.Runtime.runFFmpeg;
  await assert.rejects(load(di).holdVideos({ videos: [{ path: '/x.mp4' }], durationFrames: 18 }, os.tmpdir()),
    error => error.code === 'host-missing' && error.member === 'Runtime.runFFmpeg');
});

test('the last frame is cloned to an exact 60 fps output in the data folder', { skip: !tools && 'ffmpeg/ffprobe required' }, async () => {
  const dir = scratch(), source = path.join(dir, 'short.mp4');
  sourceVideo(source);
  const result = await load(host()).holdVideos({ videos: [{ path: source }], durationFrames: 18 }, path.join(dir, 'data'));
  assert.equal(result.status, 'converted'); assert.equal(result.fps, 60); assert.equal(result.durationFrames, 18);
  const item = result.videos[0];
  assert.equal(item.inputIndex, 0); assert.equal(item.sourcePath, source); assert.equal(item.cacheHit, false);
  assert.equal(path.dirname(item.outputPath), path.join(dir, 'data', 'held-v2'));
  assert.match(path.basename(item.outputPath), /^[0-9a-f]{64}\.mp4$/);
  const [stream] = probe(item.outputPath);
  assert.deepEqual([stream.codec_name, stream.width, stream.height, stream.r_frame_rate, stream.nb_read_frames], ['h264', 128, 96, '60/1', '18']);
  const frames = rawFrames(item.outputPath), stride = 128 * 96 * 3;
  assert.equal(frames.length, 18 * stride);
  assert.deepEqual(frames.subarray(-stride), frames.subarray(-2 * stride, -stride));
  assert.notDeepEqual(frames.subarray(0, stride), frames.subarray(4 * stride, 5 * stride));
  assert.deepEqual(fs.readdirSync(path.join(dir, 'data', 'held-v2')).filter(name => name.endsWith('.tmp')), []);
});

test('identical requests reuse the cache and a corrupt cache entry is rebuilt', { skip: !tools && 'ffmpeg/ffprobe required' }, async () => {
  const dir = scratch(), source = path.join(dir, 'short.mp4'), data = path.join(dir, 'data');
  sourceVideo(source);
  const { holdVideos } = load(host());
  const a = await holdVideos({ videos: [{ path: source }, { path: source }], durationFrames: 18 }, data);
  assert.equal(a.videos[0].outputPath, a.videos[1].outputPath);
  const b = await holdVideos({ videos: [{ path: source }], durationFrames: 18 }, data);
  assert.equal(b.videos[0].cacheHit, true);
  fs.writeFileSync(b.videos[0].outputPath, 'broken');
  const c = await holdVideos({ videos: [{ path: source }], durationFrames: 18 }, data);
  assert.equal(c.videos[0].cacheHit, false);
  assert.ok(fs.statSync(c.videos[0].outputPath).size > 100);
});

test('a source with a timecode track is held as one video stream (no tmcd track copied)', { skip: !tools && 'ffmpeg/ffprobe required' }, async () => {
  // Camera and stock clips (e.g. the Staging test's field-01) carry a `timecode` tag; the mp4 muxer then writes a tmcd
  // data track into the held clip unless told not to, and the one-stream check rejects it.
  const dir = scratch(), plain = path.join(dir, 'plain.mp4'), source = path.join(dir, 'timecode.mp4');
  sourceVideo(plain);
  execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', plain, '-c', 'copy', '-timecode', '00:00:00:00', source]);
  assert.ok(probe(source).length > 1, 'fixture has no timecode track');
  const result = await load(host()).holdVideos({ videos: [{ path: source }], durationFrames: 18 }, path.join(dir, 'data'));
  assert.deepEqual(probe(result.videos[0].outputPath).map(stream => stream.codec_name), ['h264']);
});

// Phone footage is often stored landscape with a display rotation (an iPhone .MOV held upright). ffmpeg turns the
// picture upright while encoding, so the held clip is the displayed size: for +-90 degrees, width and height swap.
// (Found on Windows Staging: "Video 1: Cached video has the wrong dimensions".)
test('a source with a +-90 degree display rotation is held at its upright size', { skip: !tools && 'ffmpeg/ffprobe required' }, async () => {
  const dir = scratch(), plain = path.join(dir, 'plain.mp4');
  sourceVideo(plain);
  for (const degrees of [90, -90, 180]) {
    const source = path.join(dir, `rotated${degrees}.mp4`);
    execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-display_rotation', String(degrees), '-i', plain, '-c', 'copy', source]);
    const result = await load(host()).holdVideos({ videos: [{ path: source }], durationFrames: 18 }, path.join(dir, 'data'));
    const upright = Math.abs(degrees) === 90 ? [96, 128] : [128, 96];
    const held = result.videos[0];
    assert.deepEqual([held.sourceWidth, held.sourceHeight, held.outputWidth, held.outputHeight], [...upright, ...upright], `${degrees} degrees`);
    const [stream] = probe(held.outputPath);
    assert.deepEqual([stream.width, stream.height], upright, `${degrees} degrees`);
    // A second run reuses the cache entry (its dimensions were recorded upright too).
    assert.equal((await load(host()).holdVideos({ videos: [{ path: source }], durationFrames: 18 }, path.join(dir, 'data'))).videos[0].cacheHit, true);
  }
});

test('a missing or non-video source is rejected', { skip: !tools && 'ffmpeg/ffprobe required' }, async () => {
  const dir = scratch(), { holdVideos } = load(host());
  await assert.rejects(holdVideos({ videos: [{ path: path.join(dir, 'missing.mp4') }], durationFrames: 18 }, dir), /Video 1: Video is missing/);
  fs.writeFileSync(path.join(dir, 'bad.mp4'), 'not video');
  await assert.rejects(holdVideos({ videos: [{ path: path.join(dir, 'bad.mp4') }], durationFrames: 18 }, dir), /Video 1: /);
});

const python = spawnSync('python3', ['--version']).status === 0;
test('parity with dev/hold_video.py: same stream and the same decoded frames', { skip: !(tools && python) && 'ffmpeg, ffprobe and python3 required' }, async () => {
  const dir = scratch(), source = path.join(dir, 'short.mp4');
  sourceVideo(source, 0.4);
  const ported = (await load(host()).holdVideos({ videos: [{ path: source }], durationFrames: 90 }, path.join(dir, 'data'))).videos[0];
  const reference = spawnSync('python3', [path.join(here, 'dev', 'hold_video.py')], { encoding: 'utf8',
    input: JSON.stringify({ videos: [{ path: source }], durationFrames: 90 }), env: { ...process.env, PHOTO_GALLERY_HOLD_CACHE_DIR: path.join(dir, 'py') } });
  assert.equal(reference.status, 0, reference.stdout + reference.stderr);
  const expected = JSON.parse(reference.stdout).videos[0];
  for (const key of ['inputIndex', 'sourcePath', 'sourceWidth', 'sourceHeight', 'outputWidth', 'outputHeight']) assert.equal(ported[key], expected[key], key);
  assert.deepEqual(probe(ported.outputPath), probe(expected.outputPath));
  assert.ok(rawFrames(ported.outputPath).equals(rawFrames(expected.outputPath)), 'decoded frames differ');
});
