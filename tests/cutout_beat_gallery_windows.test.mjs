import { asyncSdk } from './windows_host.mjs';
// Beat Cutout Gallery on Windows, end to end in a mock host: the panel's own Windows functions (winFrames,
// winCutouts, the engine Worker) run against a fake window.parent.__DI__ built in another JavaScript realm, with
// FileSystem over node fs, Runtime.runFFmpeg/runFFprobe over the local ffmpeg, and a MediaGeneration stub that
// "cuts out" the people by returning the fixture masks as a clip with the same hold layout as the clip it was sent.
// The photos are the synthetic folder of tests/fixtures/cutout_beat_gallery/parity.json (written as PNG), so the
// result must equal prepare.py's. Skipped when ffmpeg is not on PATH.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { panelSource, loadPanelFunctions } from './windows_host.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, '..');
const PLUGIN = path.join(ROOT, 'plugins/cutout-beat-gallery');
const E = require(path.join(PLUGIN, 'cutout-engine.js'));
const FIXTURE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/cutout_beat_gallery/parity.json'), 'utf8'));
const HAVE_FFMPEG = spawnSync('ffmpeg', ['-version']).status === 0 && spawnSync('ffprobe', ['-version']).status === 0;
const source = panelSource('cutout-beat-gallery');
const NAMES = ['CLOUD_MODEL', 'CLOUD_MIN_HOST', 'CLOUD_FAILED', 'HOLD', 'WIN_MIN_PHOTOS', 'FRAME_SIZE', 'cloudProblem', 'cloudScope', 'startEngine',
  'hostFFmpeg', 'encoderCache', 'encoders', 'pad2', 'fileName', 'winFrames', 'winCutouts', 'removeWork'];

// ---- the synthetic folder (make_parity.py's formulas) -------------------------------------------------------------
function src(p, sw, sh) {
  const out = new Uint8Array(sw * sh * 3);
  let o = 0;
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    out[o] = (x * (3 + p % 5) + y * (1 + p % 3) + p * 37) % 256;
    out[o + 1] = (Math.floor((x * y) / (7 + p)) + p * 11) % 256;
    out[o + 2] = (((x ^ y) * (p + 1)) + Math.floor((x * x + y * y) / (50 + p))) % 256;
    o += 3;
  }
  return out;
}
function photo([, p, [sw, sh], [w, h], tweak]) {
  const raw = src(p, sw, sh);
  for (let k = 0; k < tweak * 40; k++) raw[(k * 7919) % raw.length] ^= 1;
  return E.resize(E.image(sw, sh, 3, raw), w, h, 'bicubic');
}
function mask(i, scenario) {
  const w = 270, h = 480;
  let cx = 135 + ((i * 29) % 61 - 30), cy = 300 + (i * 17) % 80;
  const rx = 60 + (i * 13) % 40, ry = 120 + (i * 7) % 60;
  if (i % 5 === 0) cx = 20;
  if (scenario === 'short' && (i % 3 === 0 || i === 26)) cy = 40;
  const R = BigInt(rx * rx * ry * ry), out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = BigInt((x - cx) ** 2 * ry * ry + (y - cy) ** 2 * rx * rx);
    out[y * w + x] = d * 100n <= 90n * R ? 255 : d * 100n >= 110n * R ? 0 : Number(((110n * R - d * 100n) * 255n) / (20n * R));
  }
  return E.resize(E.image(w, h, 1, out), E.W, E.H, 'bicubic');
}
const ff = (args) => execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', ...args], { maxBuffer: 1 << 26 });
const probeJson = (file, entries) => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-show_entries', entries, '-of', 'json', file]).toString());

// Writes the folder as PNG files (the copy is a byte copy, so its SHA-256 matches).
function writeFolder(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return FIXTURE.photos.map((entry) => {
    const file = path.join(dir, entry[0]);
    if (entry[0] === 'p03-copy.png') fs.copyFileSync(path.join(dir, 'p03.png'), file);
    else {
      const im = photo(entry), raw = file + '.rgb';
      fs.writeFileSync(raw, im.d);
      ff(['-f', 'rawvideo', '-pix_fmt', 'rgb24', '-video_size', im.w + 'x' + im.h, '-i', raw, '-frames:v', '1', file]);
      fs.rmSync(raw);
    }
    return { name: entry[0], path: file };
  });
}

// ---- the mock host ------------------------------------------------------------------------------------------------
function mockHost({ home, scenario = 'full', delivery = { codec: 'ffv1', fps: 30 }, encodersList = null, version = '2.0.520', plugin = true } = {}) {
  const realm = vm.createContext({});
  const RealmBytes = vm.runInContext('Uint8Array', realm);
  const calls = [], submits = [];
  const runTool = (bin, args, signal) => new Promise((resolve, reject) => {
    const child = spawn(bin, args);
    let stdout = '', stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    signal?.addEventListener('abort', () => child.kill());
    child.on('close', (code) => (code === 0 ? resolve({ stdout, stderr }) : reject(Object.assign(new Error(stderr || 'exit ' + code), { stderr }))));
  });
  const FileSystem = {
    join: (...p) => path.join(...p), homedir: () => home, basename: (p) => path.basename(p),
    existsSync: (p) => fs.existsSync(p), exists: async (p) => fs.existsSync(p),
    mkdirSync: (p, o) => fs.mkdirSync(p, o),
    // Bytes from the host realm, as Selects hands them to a panel.
    readFile: async (p) => RealmBytes.from(fs.readFileSync(p)),
    writeFile: async (p, data) => { calls.push(['writeFile', p]); fs.writeFileSync(p, data); },
    copyFile: async (a, b) => fs.copyFileSync(a, b),
    readdirSync: (p) => fs.readdirSync(p), rmSync: (p, o) => fs.rmSync(p, o),
    removeFile: async ({ filePath }) => fs.rmSync(filePath, { force: true }),
  };
  const Runtime = {
    getPlatform: () => 'win32', getHostingVersion: () => version,
    runFFmpeg: async (args, quiet, signal) => {
      calls.push(['runFFmpeg', args]);
      if (args[0] === '-hide_banner' && args[1] === '-encoders' && encodersList) return { stdout: encodersList, stderr: '' };
      return runTool('ffmpeg', args, signal);
    },
    runFFprobe: async (args, quiet, signal) => { calls.push(['runFFprobe', args]); return runTool('ffprobe', args, signal); },
  };
  const jobs = [];
  const MediaGeneration = {
    supportsPluginFiles: () => true, isAvailable: () => true,
    submit: async (req) => {
      submits.push(JSON.parse(JSON.stringify(req)));
      const jobId = 'selects-' + 'a'.repeat(64);
      // The clip it was sent: HOLD frames per photo at 30 fps, photo k's frame at k*HOLD+6.
      const clip = req.uploads.source.pluginFile, info = probeJson(clip, 'stream=nb_read_frames,width,height');
      const frames = Number(info.streams[0].nb_read_frames), count = Math.round(frames / 10);
      const outDir = req.delivery.pluginFolder;
      fs.mkdirSync(outDir, { recursive: true });
      const raw = path.join(outDir, 'masks.gray');
      const fd = fs.openSync(raw, 'w');
      for (let k = 0; k < count; k++) fs.writeSync(fd, mask(k + 1, scenario).d);
      fs.closeSync(fd);
      const out = path.join(outDir, delivery.codec === 'ffv1' ? 'person-masks.mkv' : 'person-masks.mp4');
      const codec = delivery.codec === 'ffv1' ? ['-c:v', 'ffv1', '-pix_fmt', 'gray'] : ['-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p'];
      const seconds = delivery.seconds ?? count * 10 / 30;
      ff(['-f', 'rawvideo', '-pix_fmt', 'gray', '-video_size', '1080x1920', '-framerate', String(count / seconds), '-i', raw, '-vf', 'fps=' + delivery.fps, ...codec, out]);
      fs.rmSync(raw);
      jobs.push({ jobId, status: 'succeeded', deliveryStatus: 'delivered', outputs: [{ outputIndex: 0, status: 'delivered', path: out }], clip, frames, count });
      return { jobIds: [jobId] };
    },
    list: async () => jobs.map((j) => ({ ...j })),
    cancel: async () => {},
  };
  return { di: { FileSystem, Runtime, MediaGeneration }, calls, submits, jobs };
}

// A Web Worker for the panel's blob URL: the engine runs in its own context, with createImageBitmap/OffscreenCanvas
// decoding the photo with ffmpeg (PNG is lossless, so the pixels equal Pillow's). Messages are structured clones
// (with transfers) delivered on later turns, as between a page and its Worker.
function workerGlobals() {
  const blobs = new Map();
  let n = 0;
  class Worker {
    constructor(url) {
      if (!blobs.has(url)) throw new Error('no such blob');
      this.terminated = false;
      this.ready = blobs.get(url).then((text) => {
        const self = { postMessage: (data, transfer) => { const copy = structuredClone(data, { transfer }); setImmediate(() => { if (!this.terminated) this.onmessage?.({ data: copy }); }); } };
        const ctx = vm.createContext({ self, console, Blob, setTimeout,
          createImageBitmap: async (blob) => {
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cbg-decode-')), file = path.join(dir, 'in');
            fs.writeFileSync(file, Buffer.from(await blob.arrayBuffer()));
            const info = probeJson(file, 'stream=width,height').streams[0];
            const rgba = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1 << 28 });
            fs.rmSync(dir, { recursive: true });
            return { width: info.width, height: info.height, rgba: new Uint8Array(rgba), close() {} };
          },
          OffscreenCanvas: class { getContext() { let b = null; return { drawImage: (bitmap) => { b = bitmap; }, getImageData: () => ({ data: b.rgba }) }; } },
        });
        new vm.Script(text).runInContext(ctx);
        return self;
      });
    }
    postMessage(data, transfer) {
      const copy = structuredClone(data, { transfer });
      this.ready.then((self) => setImmediate(() => { if (!this.terminated) self.onmessage({ data: copy }); }));
    }
    terminate() { this.terminated = true; }
  }
  const URL_ = { createObjectURL: (blob) => { const url = 'blob:cbg/' + (++n); blobs.set(url, blob.text()); return url; }, revokeObjectURL: (u) => blobs.delete(u) };
  return { Worker, URL: URL_ };
}

async function load(host) {
  const w = workerGlobals();
  const fns = loadPanelFunctions(source, NAMES, {
    window: { parent: { __DI__: host.di, location: { pathname: '/libraries/lib-1/projects/proj-1' } } },
    navigator: { platform: 'Win32', userAgent: 'Windows NT 10.0' },
    Worker: w.Worker, URL: w.URL, Blob, AbortController,
  });
  return { fns };
}

function setup(t, options = {}) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'cbg-win-'));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const home = path.join(base, 'home'), data = path.join(home, '.selects', 'plugin-data', 'cutout-beat-gallery');
  fs.mkdirSync(data, { recursive: true });
  const photos = writeFolder(path.join(base, 'photos'));
  return { base, home, data, photos, host: mockHost({ home, ...options }) };
}

// The panel's Windows analysis: free frames, then (after consent) cutouts, as analyze() and sendCloud() run them.
async function analyse(env, fns, name = 'beat-cutout-test') {
  const engine = fns.startEngine(fs.readFileSync(path.join(PLUGIN, 'cutout-engine.js'), 'utf8'));
  const work = path.join(env.data, 'work', name);
  fs.mkdirSync(work, { recursive: true });
  try {
    const { frames, rejected } = await fns.winFrames({ engine, work, photos: env.photos, control: { canceled: false } });
    const result = await fns.winCutouts({ engine, plugin: PLUGIN, data: env.data, work, name, pid: 'proj-1', frames, rejected, control: { canceled: false } });
    return { result, frames, rejected, work };
  } finally {
    engine.stop();
    await fns.removeWork(work);
  }
}

const skip = HAVE_FFMPEG ? false : 'ffmpeg is not on PATH';

test('cloudProblem: Windows cutouts need MediaGeneration plug-in files and Selects 2.0.512', { skip }, async () => {
  const host = mockHost({ home: os.tmpdir() });
  const { fns } = await load(host);
  assert.equal(fns.cloudProblem(), '');
  fns.hostUseSdk({ ...asyncSdk(host.di), environment: { platform: 'win32', version: '2.0.511' } });
  assert.equal(fns.cloudProblem(), 'newer');
  fns.hostUseSdk({ ...asyncSdk(host.di), environment: { platform: 'win32', version: '2.1.0' } });
  assert.equal(fns.cloudProblem(), '');
  host.di.MediaGeneration.isAvailable = () => false;
  assert.equal(fns.cloudProblem(), 'noGeneration');
  host.di.MediaGeneration.isAvailable = () => true;
  host.di.MediaGeneration.supportsPluginFiles = () => false;
  assert.equal(fns.cloudProblem(), 'newer');
  delete host.di.MediaGeneration;
  assert.equal(fns.cloudProblem(), 'newer');
});

test('Windows analysis in a mock host equals prepare.py (lossless masks, 30 fps)', { skip, timeout: 600000 }, async (t) => {
  const env = setup(t);
  const { fns } = await load(env.host);
  const { result } = await analyse(env, fns);
  const want = FIXTURE.scenarios.full.result;
  const { outputDir, folder, ...rest } = result;
  assert.equal(folder, 'beat-cutout-test');
  assert.equal(outputDir, path.join(env.data, 'runs', 'beat-cutout-test'));
  assert.deepEqual(rest.rejected, want.rejected);
  assert.deepEqual(rest.rows, want.rows);
  assert.deepEqual(rest.cues, want.cues);
  assert.deepEqual(rest, want);
  // The request: the photos as one clip in the plugin's data folder, delivered back there, no Project import.
  const [req] = env.host.submits;
  assert.equal(req.modelId, 'model_v1_dmVlZC92aWRlby1iYWNrZ3JvdW5kLXJlbW92YWwvZmFzdA');
  assert.deepEqual(req.input, { video_url: 'selects-input:source', output_codec: 'h264', refine_foreground_edges: false, subject_is_person: true });
  assert.deepEqual(req.scope, { libraryId: 'lib-1', projectId: 'proj-1' });
  assert.equal(req.key, 'cbg-beat-cutout-test');
  assert.ok(req.uploads.source.pluginFile.startsWith(env.data + path.sep));
  assert.ok(req.delivery.pluginFolder.startsWith(env.data + path.sep));
  assert.equal(req.inputMediaSeconds.video, 26 * 10 / 30);
  assert.equal(env.host.jobs[0].frames, 260, 'each of the 26 photos held 10 frames');
  // The run folder holds exactly what the Draft imports, with prepare.py's frame counts and one stream each.
  const files = fs.readdirSync(outputDir).sort();
  const expected = [...Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(2, '0') + '-base.mp4'), ...Array.from({ length: 14 }, (_, i) => String(i + 1).padStart(2, '0') + '-sticker.mov'), 'fixed-bgm.mp3'].sort();
  assert.deepEqual(files, expected);
  const edges = E.PHOTO_EDGES;
  for (let i = 0; i < 15; i++) {
    const info = probeJson(path.join(outputDir, String(i + 1).padStart(2, '0') + '-base.mp4'), 'stream=nb_read_frames,width,height,codec_name');
    assert.equal(info.streams.length, 1);
    assert.deepEqual([info.streams[0].codec_name, info.streams[0].width, info.streams[0].height, Number(info.streams[0].nb_read_frames)],
      ['h264', 1080, 1920, edges[i + 1] - edges[i] + (i === 14 ? 8 : 0)]);
  }
  for (const f of files.filter((f) => f.endsWith('.mov'))) {
    const info = probeJson(path.join(outputDir, f), 'stream=nb_read_frames,codec_name,pix_fmt,codec_type');
    assert.equal(info.streams.length, 1, f + ': one stream (no timecode track)');
    assert.deepEqual([info.streams[0].codec_name, info.streams[0].pix_fmt, Number(info.streams[0].nb_read_frames)], ['prores', 'yuva444p12le', 60]);
  }
  assert.deepEqual(fs.readFileSync(path.join(outputDir, 'fixed-bgm.mp3')), fs.readFileSync(path.join(PLUGIN, 'fixed-bgm.mp3')));
  // The first sticker's alpha survives ProRes 4444.
  const alpha = execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(outputDir, '01-sticker.mov'), '-frames:v', '1', '-vf', 'alphaextract', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 26 });
  const row = rest.rows.find((r) => r.stickerNumber === 1), frameRgb = photo(FIXTURE.photos.find((p) => p[0] === row.name));
  const layer = E.compose(E.fit(frameRgb, E.W, E.H, 'lanczos'), mask(row.index, 'full'), 'clean');
  let diff = 0, inter = 0, union = 0;
  for (let i = 0; i < alpha.length; i++) {
    const a = alpha[i], b = layer.d[i * 4 + 3];
    diff += Math.abs(a - b);
    if (a >= 128 && b >= 128) inter++;
    if (a >= 128 || b >= 128) union++;
  }
  assert.ok(diff / alpha.length < 0.5, 'alpha mean difference ' + diff / alpha.length);
  assert.ok(inter / union > 0.999, 'alpha IoU ' + inter / union);
  // The work folder is gone; nothing else was written outside the data folder.
  assert.equal(fs.existsSync(path.join(env.data, 'work', 'beat-cutout-test')), false);
  for (const [kind, p] of env.host.calls) if (kind === 'writeFile') assert.ok(p.startsWith(env.data + path.sep), p);
});

test('an H.264 alpha clip at another frame rate still maps each photo to its mask', { skip, timeout: 600000 }, async (t) => {
  const env = setup(t, { scenario: 'short', delivery: { codec: 'h264', fps: 25 } });
  const { fns } = await load(env.host);
  const { result } = await analyse(env, fns);
  const want = FIXTURE.scenarios.short.result;
  assert.equal(result.ready, true);
  assert.deepEqual(result.rows.map((r) => [r.name, r.stickerReady, r.stickerNumber ?? null, r.baseSlot ?? null]),
    want.rows.map((r) => [r.name, r.stickerReady, r.stickerNumber ?? null, r.baseSlot ?? null]));
  for (const [i, r] of result.rows.entries()) assert.ok(Math.abs(r.area - want.rows[i].area) <= 0.005, r.name + ' area ' + r.area + ' vs ' + want.rows[i].area);
  assert.equal(result.cues.length, want.cues.length);
});

test('a clip that comes back with another length is refused before any layer is made', { skip, timeout: 600000 }, async (t) => {
  const env = setup(t, { delivery: { codec: 'ffv1', fps: 30, seconds: 4 } });
  const { fns } = await load(env.host);
  await assert.rejects(analyse(env, fns), /came back 4\.00 s long instead of 8\.67 s/);
  assert.equal(fs.existsSync(path.join(env.data, 'runs', 'beat-cutout-test')), false);
});

test('without ProRes and libx264 the stickers use QuickTime Animation and the scenes MPEG-4, same frame counts', { skip, timeout: 600000 }, async (t) => {
  const encodersList = ' V....D qtrle                QuickTime Animation (RLE) video\n V.S... mpeg4                MPEG-4 part 2\n V....D png                  PNG (Portable Network Graphics) image\n';
  const env = setup(t, { encodersList });
  const { fns } = await load(env.host);
  const { result } = await analyse(env, fns);
  assert.equal(result.ready, true);
  const sticker = probeJson(path.join(result.outputDir, '01-sticker.mov'), 'stream=nb_read_frames,codec_name,pix_fmt');
  assert.deepEqual([sticker.streams.length, sticker.streams[0].codec_name, sticker.streams[0].pix_fmt, Number(sticker.streams[0].nb_read_frames)], [1, 'qtrle', 'argb', 60]);
  const base = probeJson(path.join(result.outputDir, '15-base.mp4'), 'stream=nb_read_frames,codec_name');
  assert.deepEqual([base.streams[0].codec_name, Number(base.streams[0].nb_read_frames)], ['mpeg4', 67 + 8]);
});
