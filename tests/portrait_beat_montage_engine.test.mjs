import { asyncSdk, topLevel } from './windows_host.mjs';
// The Windows engine of portrait-beat-montage (panel.tsx `// pbm-engine` + the `@operation` section) end to end on a
// fake Windows host: FileSystem on node:fs (bytes from another realm), Runtime.runFFmpeg/runFFprobe on a real ffmpeg,
// the pixel kernels in a Web Worker (a worker_threads stand-in for the blob: Worker), and the person mattes from one
// alpha video of the concatenated unit sources (a luma key stands in for Selects generation). Then pipeline.py renders
// the same clips with the same mattes, and every Draft piece must decode to the same frames: exactly with the numpy and
// Pillow pipeline.py ships with (rvm/requirements-hashed.txt: numpy 1.26.4, Pillow 11.3.0); with another numpy, within
// a small tolerance (numpy 2 promotes float32 x float64 to float64, which moves pipeline.py's uint8 truncations).
// ffmpeg: PORTRAIT_BEAT_MONTAGE_FFMPEG/FFPROBE or PATH; Python: PORTRAIT_BEAT_MONTAGE_PYTHON or python3. Without
// ffmpeg the test is skipped; without numpy/Pillow the pipeline.py comparison is.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {spawn, spawnSync} from 'node:child_process';
import {Worker as NodeWorker} from 'node:worker_threads';

const repo = path.resolve(import.meta.dirname, '..');
const plugin = path.join(repo, 'plugins/portrait-beat-montage');
const which = (name) => { const r = spawnSync('/bin/sh', ['-c', 'command -v ' + name], {encoding: 'utf8'}); return r.status === 0 ? r.stdout.trim() : null; };
const FFMPEG = process.env.PORTRAIT_BEAT_MONTAGE_FFMPEG || which('ffmpeg');
const FFPROBE = process.env.PORTRAIT_BEAT_MONTAGE_FFPROBE || which('ffprobe');
const PYTHON = process.env.PORTRAIT_BEAT_MONTAGE_PYTHON || 'python3';
const pyVersions = spawnSync(PYTHON, ['-c', 'import numpy, PIL; print(numpy.__version__, PIL.__version__)'], {encoding: 'utf8'});
const NUMPY = pyVersions.status === 0 ? pyVersions.stdout.trim().split(' ') : null;
const plain = (v) => JSON.parse(JSON.stringify(v));   // a value from the panel's realm, for deepEqual
const skip = !FFMPEG || !FFPROBE ? 'ffmpeg and ffprobe are needed' : false;

const run = (bin, args) => new Promise((resolve, reject) => {
  const p = spawn(bin, args, {stdio: ['ignore', 'pipe', 'pipe']});
  let out = '', err = '';
  p.stdout.on('data', (d) => { out += d; });
  p.stderr.on('data', (d) => { err += d; });
  p.on('close', (code) => (code === 0 ? resolve({stdout: out, stderr: err}) : reject(new Error(err.trim() || bin + ' exited ' + code))));
});

// The panel code the engine needs, in a fresh realm with a fake Windows host.
function loadEngine(home, {MediaGeneration = null, version = '2.0.535', panelSource = null} = {}) {
  const src = panelSource || fs.readFileSync(path.join(plugin, 'panel.tsx'), 'utf8');
  const cut = (a, b) => src.slice(src.indexOf(a), src.indexOf(b));
  const code = ['const PLUGIN = "portrait-beat-montage";', cut('// av-host:start', '// av-host:end'), cut(src.includes('const MAC_ONLY_TEXT')?'const MAC_ONLY_TEXT':'const PLAIN_TEXT', '// @operation-start'),
    cut('// @operation-start', '// @operation-end').replace(/^export /gm, ''), cut('// pbm-engine:start', '// pbm-engine:end'),
    ...(src.includes('function generationApi(') ? [topLevel(src, 'generationApi')] : []),
    'globalThis.engine = { pbmWindowsMontage, pbmMatteSource, pbmMattesFromAlpha, pbmWorkerKernels, pbmKernels, pbmUnits, pbmAssemble, plainText: typeof plainText === "function" ? plainText : null };'].join('\n');
  const removeFile = async ({filePath}) => fs.rmSync(filePath, {force: true});
  const FileSystem = {
    join: (...p) => path.join(...p), homedir: () => home, basename: (p) => path.basename(p), existsSync: (p) => fs.existsSync(p),
    mkdirSync: (p, o) => fs.mkdirSync(p, o), readdirSync: (p) => fs.readdirSync(p), readFile: async (p) => fs.readFileSync(p),
    writeFile: async (p, d) => fs.writeFileSync(p, typeof d === 'string' ? d : Buffer.from(d.buffer, d.byteOffset, d.byteLength)),
    statSync: (p) => { const s = fs.statSync(p); return {size: s.size, mtimeMs: s.mtimeMs}; }, renameSync: (a, b) => fs.renameSync(a, b),
    copyFile: async (a, b) => fs.copyFileSync(a, b), removeFile,
  };
  const calls = [];
  const Runtime = {
    getPlatform: () => 'win32', getHostingVersion: () => version,
    runFFmpeg: (args, quiet, signal) => { calls.push(args); if (signal?.aborted) return Promise.reject(new Error('aborted')); return run(FFMPEG, args); },
    runFFprobe: (args) => run(FFPROBE, args),
  };
  // A blob: Worker on worker_threads: the source runs with onmessage/postMessage as in a browser Worker.
  const blobs = new Map();
  class Blob { constructor(parts) { this.text = parts.join(''); } }
  const URL = {createObjectURL: (b) => { const u = 'blob:' + blobs.size; blobs.set(u, b.text); return u; }, revokeObjectURL: (u) => blobs.delete(u)};
  class Worker {
    constructor(url) {
      this.w = new NodeWorker('const {parentPort} = require("node:worker_threads"); globalThis.postMessage = (m, t) => parentPort.postMessage(m, t);'
        + ' parentPort.on("message", (m) => globalThis.onmessage({data: m}));\n' + blobs.get(url), {eval: true});
      this.w.on('message', (m) => this.onmessage?.({data: m}));
      this.w.on('error', (e) => this.onerror?.(e));
    }
    postMessage(m, t) { this.w.postMessage(m, t); }
    terminate() { this.w.terminate(); }
  }
  const sdk = asyncSdk({FileSystem, Runtime});
  const ctx = vm.createContext({sdk, panelLocalClient: sdk => sdk, sdkGeneration: () => MediaGeneration, window: {parent: {__DI__: {FileSystem, Runtime, ...(MediaGeneration ? {MediaGeneration} : {})}, location: {pathname: '/libraries/lib-1/projects/p-1'}}}, navigator: {platform: 'Win32'}, crypto: globalThis.crypto,
    TextEncoder, TextDecoder, AbortController, setTimeout, clearTimeout, atob, Blob, URL, Worker, console});
  vm.runInContext(code + (src.includes('function hostUseSdk(') ? '\nhostUseSdk(sdk);' : ''), ctx);
  const montage = ctx.engine.pbmWindowsMontage;
  ctx.engine.pbmWindowsMontage = (provided, options) => montage({ ...sdk, ...provided }, options);
  return {engine: ctx.engine, calls, FileSystem: src.includes('function hostUseSdk(') ? sdk.files : FileSystem};
}

// Two synthetic "person" clips (a bright figure moving over a darker room): one portrait, one landscape.
async function makeClips(dir) {
  const clips = [
    ['a b.mp4', 'color=c=0x283848:s=720x1280:r=30:d=4', "drawbox=x='220+120*sin(t*2.3)':y=300:w=280:h=700:color=0xE8C0A0:t=fill"],
    ['\uD074\uB9BD 2.mov', 'color=c=0x404030:s=1280x720:r=25:d=3', "drawbox=x='500+200*sin(t*3)':y=120:w=260:h=560:color=0xF0D0B8:t=fill"],
  ];
  const out = [];
  for (const [name, src, box] of clips) {
    const p = path.join(dir, name);
    await run(FFMPEG, ['-v', 'error', '-y', '-f', 'lavfi', '-i', src, '-vf', box + ',noise=alls=8:allf=t', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', p]);
    out.push(p);
  }
  return out;
}

test('Windows engine: plan, one matte request, transitions, 17 Draft pieces; same frames as pipeline.py', {skip, timeout: 900000}, async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pbm-engine-'));
  const home = path.join(tmp, 'home');
  const skills = path.join(home, '.selects', 'skills', 'portrait-beat-montage');
  fs.mkdirSync(skills, {recursive: true});
  fs.copyFileSync(path.join(plugin, 'SKILL.md'), path.join(skills, 'SKILL.md'));
  fs.symlinkSync(path.join(plugin, 'assets'), path.join(skills, 'assets'));
  const sources = await makeClips(tmp);
  const files = Array.from({length: 10}, (_, i) => ({path: sources[i % 2]}));
  const {engine, calls} = loadEngine(home);
  const data = path.join(home, '.selects', 'plugin-data', 'portrait-beat-montage');
  const mattesAsked = [];
  // One "generation" request: the concatenated sources -> an alpha video (a luma key, softened), split per unit.
  const mattes = async (io, units, signal, progress) => {
    mattesAsked.push(units.map((u) => u.key));
    const concat = path.join(io.data, 'matte-source.mp4');
    const {seconds} = await engine.pbmMatteSource(io, units, concat, signal);
    assert.equal(seconds, units.length * 36 / 60);
    const alpha = path.join(io.data, 'matte-alpha.mp4');
    await run(FFMPEG, ['-v', 'error', '-y', '-i', concat, '-vf', "format=gray,lut=y='if(gt(val,150),255,0)',gblur=sigma=2", '-c:v', 'libx264', '-pix_fmt', 'yuv420p', alpha]);
    progress(.5);
    await engine.pbmMattesFromAlpha(io, units, alpha, signal);
  };
  const steps = [];
  const signal = new AbortController().signal;

  await t.test('cancel stops before any Draft piece and leaves the run resumable', async () => {
    const c = new AbortController();
    const p = engine.pbmWindowsMontage({}, {files, signal: c.signal, mattes, setProgress: () => {}, setStep: (n) => { if (n === 1) c.abort(); }});
    await assert.rejects(p, (e) => e.code === 'cancelled');
    const runs = fs.readdirSync(path.join(data, 'runs'));
    assert.equal(runs.length, 1);
    assert.ok(!fs.existsSync(path.join(data, 'runs', runs[0], 'manifest.json')));
  });

  const manifest = await engine.pbmWindowsMontage({}, {files, signal, mattes, setStep: (n) => steps.push(n), setProgress: () => {}});
  assert.deepEqual(steps, [0, 1, 2]);
  // Two files: 2 first windows + 2 second windows render; the other 11 units are copies.
  assert.equal(mattesAsked.length, 1);
  assert.equal(mattesAsked[0].length, 4);
  assert.equal(manifest.clips.length, 17);
  assert.equal(manifest.gapFrames, 125);
  assert.equal(manifest.durationFrames, 490);
  assert.ok(!("plainShots" in manifest), "all-person manifest is structurally unchanged");
  assert.equal(engine.plainText("en", manifest.plainShots), "");
  assert.ok(calls.every((a) => a[0] === '-nostdin'));
  const sourcesMade = calls.filter((a) => a.some((x) => String(x).includes('minterpolate')));
  assert.equal(sourcesMade.length, 4);
  assert.ok(sourcesMade.every((a) => a.includes('ffv1') && a.includes('bgr0')), 'Windows source encoding is lossless and built in');
  for (const clip of manifest.clips) {
    const probe = JSON.parse((await run(FFPROBE, ['-v', 'error', '-count_frames', '-show_entries', 'stream=codec_type,nb_read_frames,width,height,r_frame_rate', '-of', 'json', clip.path])).stdout);
    assert.equal(probe.streams.length, 1, clip.name + ' has one stream');
    assert.equal(Number(probe.streams[0].nb_read_frames), clip.frames, clip.name);
    assert.equal(probe.streams[0].r_frame_rate, '30000/1001');
  }
  const runRoot = path.dirname(path.dirname(manifest.clips[0].path));
  const plan = JSON.parse(fs.readFileSync(path.join(runRoot, 'plan.json'), 'utf8'));

  if (!NUMPY) { t.diagnostic('pipeline.py comparison skipped: ' + PYTHON + ' has no numpy/Pillow'); return; }
  // pipeline.py on the same clips, with the mattes the engine used (RVM replaced by them), the same ffmpeg.
  const py = String.raw`
import json, sys
import hashlib
from pathlib import Path
import numpy as np
sys.path.insert(0, sys.argv[1])
import pipeline as P
P.DATA = Path(sys.argv[2]); js_root = Path(sys.argv[3]); clips = json.loads(sys.argv[4])
def mattes(video, folder):
    raw = np.fromfile(js_root / folder.name / "matte.gray", np.uint8).reshape(P.MATTE_FRAMES, P.H, P.W)
    return raw.astype(np.float32) / 255
P.mattes = mattes
original_run = P.run
normalized_sources = 0
def shared_source_run(argv, **kwargs):
    global normalized_sources
    # op_unit normally rewrites source.mp4 unconditionally. Keep only the supplied source normalization
    # step so the independent Python compositor receives the same lossless RGB frames as the live engine.
    if Path(argv[-1]).name == "source.mp4" and "minterpolate=" in " ".join(map(str, argv)):
        assert Path(argv[-1]).exists()
        normalized_sources += 1
        return
    return original_run(argv, **kwargs)
P.run = shared_source_run
plan = P.op_plan({"clips": clips})
source_checks = []; raw_checks = []
for key in plan["units"]:
    # Feed both renderers the identical normalized source. The Windows source codec is now lossless FFV1.
    import shutil
    folder = P.DATA / "runs" / plan["runId"] / key
    folder.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(js_root / key / "source.avi", folder / "source.mp4")
    P.op_unit({"runId": plan["runId"], "key": key})
    ours = P.decode(js_root / key / "source.avi", P.SRC_FRAMES)
    theirs = P.decode(folder / "source.mp4", P.SRC_FRAMES)
    source_checks.append(hashlib.sha256(ours.tobytes()).hexdigest() == hashlib.sha256(theirs.tobytes()).hexdigest())
    actual = np.fromfile(js_root / key / "post.rgb", np.uint8)
    expected = np.load(folder / "post-held.npy").reshape(-1)
    delta = np.abs(actual.astype(np.int16) - expected.astype(np.int16))
    raw_checks.append({"key": key, "max": int(delta.max()), "mean": float(delta.mean())})
print(json.dumps({"plan": plan, "sourceChecks": source_checks, "normalizedSources": normalized_sources,
                 "rawChecks": raw_checks, "manifest": P.op_assemble({"runId": plan["runId"], "master": False})}))
`;
  const r = spawnSync(PYTHON, ['-c', py, plugin, path.join(tmp, 'pydata'), runRoot, JSON.stringify(files.map((f) => f.path))],
    {encoding: 'utf8', maxBuffer: 1 << 26, env: {...process.env, POSTCARD_CUTOUT_RVM_FFMPEG: FFMPEG, POSTCARD_CUTOUT_RVM_FFPROBE: FFPROBE}});
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout.trim().split('\n').pop());
  const pyPlan = JSON.parse(fs.readFileSync(path.join(tmp, 'pydata', 'runs', out.plan.runId, 'plan.json'), 'utf8'));
  assert.deepEqual(Object.fromEntries(Object.entries(plan.units).map(([k, u]) => [k, [u.start, u.width, u.height, u.duration]])),
    Object.fromEntries(Object.entries(pyPlan.units).map(([k, u]) => [k, [u.start, u.width, u.height, u.duration]])));
  assert.deepEqual(plan.slots, pyPlan.slots);
  assert.equal(out.plan.runId.slice(-6), plan.runId.slice(-6), 'same run digest');
  const exact = NUMPY[0] === '1.26.4' && NUMPY[1] === '11.3.0';
  assert.ok(out.normalizedSources > 0, 'reference consumes the supplied normalization instead of re-encoding it');
  assert.ok(out.sourceChecks.every(Boolean), 'each source decodes to byte-identical RGB before compositing');
  for (const raw of out.rawChecks) {
    assert.ok(raw.max <= (exact ? 0 : 1), raw.key + ' raw transition maximum difference ' + raw.max);
    assert.ok(raw.mean <= (exact ? 0 : .1), raw.key + ' raw transition mean difference ' + raw.mean);
  }
  const decode = async (p) => { const f = path.join(tmp, 'decoded.rgb'); await run(FFMPEG, ['-v', 'error', '-y', '-i', p, '-f', 'rawvideo', '-pix_fmt', 'rgb24', f]); return fs.readFileSync(f); };
  let worst = 0, lowest = Infinity;
  for (const [i, clip] of manifest.clips.entries()) {
    const theirs = out.manifest.clips[i];
    assert.deepEqual([clip.name, clip.start, clip.end, clip.frames], [theirs.name, theirs.start, theirs.end, theirs.frames]);
    const [a, b] = [await decode(clip.path), await decode(theirs.path)];
    assert.equal(a.length, b.length, clip.name);
    let max = 0, sq = 0;
    for (let k = 0; k < a.length; k++) { const d = a[k] - b[k]; if (Math.abs(d) > max) max = Math.abs(d); sq += d * d; }
    const psnr = sq ? 10 * Math.log10(255 * 255 / (sq / a.length)) : Infinity;
    worst = Math.max(worst, max); lowest = Math.min(lowest, psnr);
    // Exact build: the same raw frames, so the same H.264 and the same decoded frames. Otherwise the raw frames differ
    // by a few levels on some pixels, which x264 then codes differently: compare by PSNR.
    if (exact) assert.equal(max, 0, clip.name + ' decodes to the same frames as pipeline.py');
    else assert.ok(psnr >= 40, clip.name + ' PSNR ' + psnr.toFixed(1) + ' dB');
  }
  t.diagnostic('numpy ' + NUMPY.join('/Pillow ') + ': largest per-pixel difference ' + worst + ', lowest PSNR ' + lowest.toFixed(1) + ' dB' + (exact ? ' (exact build)' : ' (tolerance)'));
  fs.rmSync(tmp, {recursive: true, force: true});
});

// Empty local RVM coverage keeps the source footage and montage timing. A genuine inference failure must
// propagate before postprocessing; only an actual empty matte takes the existing plain-footage path.
test('Windows no-person unit keeps plain footage, timing, SAR and cached note; genuine failures still fail', {skip, timeout: 900000}, async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pbm-plain-'));
  try {
    const {engine, FileSystem, calls} = loadEngine(tmp);
    const io = {fs: FileSystem, data: tmp, plugin};
    const root = path.join(tmp, 'run'); fs.mkdirSync(root);
    const source = path.join(tmp, 'clip.mp4');
    await run(FFMPEG, ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=s=540x720:r=60:d=2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', source]);
    const plan = {runId: 'plain-test', units: {u: {path: source, start: 0, width: 540, height: 720}}, slots: Array(15).fill('u')};
    const runPlan = {root, plan};
    let requests = 0;
    const mattes = async (io, units) => {
      requests++;
      for (const unit of units) fs.writeFileSync(path.join(unit.folder, 'matte.gray'), Buffer.alloc(30 * 540 * 720));
    };
    const worker = engine.pbmWorkerKernels();
    try {
      // A failed local inference must never become a plain-footage fallback or be retried here.
      await assert.rejects(engine.pbmUnits(io, worker.call, runPlan, async () => { throw Error('model inference failed'); }, null), /model inference failed/);
      assert.ok(!fs.existsSync(path.join(root, 'u', 'post.rgb')));
      await engine.pbmUnits(io, worker.call, runPlan, mattes, null);
      assert.equal(requests, 1);
      assert.ok(fs.existsSync(path.join(root, 'u', 'plain.json')));
      // Independent reference: the pre-cutout speed curve sampled from the normalized source.
      const raw = path.join(tmp, 'source.rgb');
      await run(FFMPEG, ['-v', 'error', '-y', '-i', path.join(root, 'u', 'source.avi'), '-f', 'rawvideo', '-pix_fmt', 'rgb24', raw]);
      const frames = fs.readFileSync(raw), post = fs.readFileSync(path.join(root, 'u', 'post.rgb'));
      assert.deepEqual(post.subarray(0, 540 * 720 * 3), frames.subarray(0, 540 * 720 * 3));
      assert.equal(post.length, 21 * 540 * 720 * 3);
      const manifest = await engine.pbmAssemble(io, worker.call, runPlan, null);
      assert.equal(manifest.plainShots, 15);
      assert.equal(manifest.clips.length, 17);
      assert.equal(manifest.durationFrames, 490);
      assert.match(engine.plainText('en', manifest.plainShots), /15 shots.*plain footage/);
      for (const lang of ['en', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'tr', 'zh']) assert.ok(engine.plainText(lang, 15).includes('15'));
      for (const clip of manifest.clips) {
        const probe = JSON.parse((await run(FFPROBE, ['-v', 'error', '-count_frames', '-show_entries', 'stream=nb_read_frames,sample_aspect_ratio', '-of', 'json', clip.path])).stdout);
        assert.equal(Number(probe.streams[0].nb_read_frames), clip.frames);
        assert.ok(['1:1', undefined, 'N/A'].includes(probe.streams[0].sample_aspect_ratio), 'square pixels (unspecified SAR defaults to 1:1)');
      }
      const nextRoot = path.join(tmp, 'next'); fs.mkdirSync(nextRoot);
      const before = calls.length;
      await engine.pbmUnits(io, worker.call, {root: nextRoot, plan}, async () => { throw Error('inference repeated'); }, null);
      assert.equal(calls.length, before, 'cache reuse makes no ffmpeg calls');
      assert.ok(fs.existsSync(path.join(nextRoot, 'u', 'plain.json')));
    } finally { worker.close(); }
  } finally { fs.rmSync(tmp, {recursive: true, force: true}); }
});

// Optional before/after oracle: supply an original panel snapshot to compare the compositor with identical RGB inputs.
// Source encoding intentionally changed to built-in lossless FFV1; it is tested separately, rather than expecting
// old lossy source encoding to produce identical downstream pixels.
// git show origin/main:plugins/portrait-beat-montage/panel.tsx > /tmp/pbm-baseline-panel.tsx
// PORTRAIT_BEAT_MONTAGE_BASELINE_PANEL=/tmp/pbm-baseline-panel.tsx node --test --test-name-pattern='all-person baseline' tests/portrait_beat_montage_engine.test.mjs
test('all-person baseline: identical composition and encoded output from the same normalized RGB', {skip: skip || (!process.env.PORTRAIT_BEAT_MONTAGE_BASELINE_PANEL && 'provide the original panel snapshot'), timeout: 900000}, async () => {
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pbm-baseline-'));
try {
  const source = path.join(tmp, 'source.mp4');
  await run(FFMPEG, ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=s=540x720:r=60:d=2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', source]);
  const normalized = path.join(tmp, 'normalized.avi');
  await run(FFMPEG, ['-v', 'error', '-y', '-i', source, '-vf', 'setsar=1,fps=60', '-frames:v', '60', '-an', '-c:v', 'ffv1', '-level', '3', '-pix_fmt', 'bgr0', normalized]);
  const results = [];
  for (const baseline of [true, false]) {
    const home = path.join(tmp, baseline ? 'before' : 'after'); fs.mkdirSync(home);
    const root = path.join(home, 'run'); fs.mkdirSync(root);
    const {engine, FileSystem, calls} = loadEngine(home, {panelSource: baseline ? fs.readFileSync(process.env.PORTRAIT_BEAT_MONTAGE_BASELINE_PANEL, 'utf8') : null});
    const worker = engine.pbmWorkerKernels();
    const io = {fs: FileSystem, data: home, plugin};
    const plan = {runId: 'parity', units: {u: {path: source, start: 0, width: 540, height: 720}}, slots: Array(15).fill('u')};
    fs.mkdirSync(path.join(root, 'u'));
    // Both FFmpeg decoders detect the AVI container regardless of the legacy source.mp4 filename.
    fs.copyFileSync(normalized, path.join(root, 'u', baseline ? 'source.mp4' : 'source.avi'));
    let requested = 0;
    try {
      await engine.pbmUnits(io, worker.call, {root, plan}, async (io, units) => {
        requested++;
        for (const u of units) fs.writeFileSync(path.join(u.folder, 'matte.gray'), Buffer.alloc(30 * 540 * 720, 128));
      }, null);
      const manifest = await engine.pbmAssemble(io, worker.call, {root, plan}, null);
      results.push({requested, calls: JSON.stringify(calls).split(home).join('HOME').replaceAll('/u/source.mp4', '/u/source.normalized').replaceAll('/u/source.avi', '/u/source.normalized'), manifest: JSON.stringify(manifest).split(home).join('HOME'), post: fs.readFileSync(path.join(root, 'u', 'post.rgb')), clips: Array.from(manifest.clips, c => fs.readFileSync(c.path))});
    } finally { worker.close(); }
  }
  assert.deepEqual(results[1], results[0]);
  console.log('PASS: all-person baseline vs working tree with identical normalized RGB: exact post bytes, all 17 encoded files, manifest, matte request count and downstream ffmpeg argv');
} finally { fs.rmSync(tmp, {recursive:true, force:true}); }

});
