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
function loadEngine(home, {MediaGeneration = null, version = '2.0.535'} = {}) {
  const src = fs.readFileSync(path.join(plugin, 'panel.tsx'), 'utf8');
  const cut = (a, b) => src.slice(src.indexOf(a), src.indexOf(b));
  const code = ['const PLUGIN = "portrait-beat-montage";', cut('// av-host:start', '// av-host:end'), cut('const MAC_ONLY_TEXT', '// @operation-start'),
    cut('// @operation-start', '// @operation-end').replace(/^export /gm, ''), cut('// pbm-engine:start', '// pbm-engine:end'),
    'globalThis.engine = { pbmWindowsMontage, pbmMatteSource, pbmMattesFromAlpha, pbmWorkerKernels, pbmKernels };'].join('\n');
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
  const ctx = vm.createContext({window: {parent: {__DI__: {FileSystem, Runtime, ...(MediaGeneration ? {MediaGeneration} : {})}, location: {pathname: '/libraries/lib-1/projects/p-1'}}}, navigator: {platform: 'Win32'}, crypto: globalThis.crypto,
    TextEncoder, TextDecoder, AbortController, setTimeout, clearTimeout, atob, Blob, URL, Worker, console});
  vm.runInContext(code, ctx);
  return {engine: ctx.engine, calls};
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
  assert.ok(calls.every((a) => a[0] === '-nostdin'));
  const sourcesMade = calls.filter((a) => a.some((x) => String(x).includes('minterpolate')));
  assert.equal(sourcesMade.length, 4);
  assert.ok(sourcesMade.every((a) => a.includes('-write_tmcd')));
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
from pathlib import Path
import numpy as np
sys.path.insert(0, sys.argv[1])
import pipeline as P
P.DATA = Path(sys.argv[2]); js_root = Path(sys.argv[3]); clips = json.loads(sys.argv[4])
def mattes(video, folder):
    raw = np.fromfile(js_root / folder.name / "matte.gray", np.uint8).reshape(P.MATTE_FRAMES, P.H, P.W)
    return raw.astype(np.float32) / 255
P.mattes = mattes
plan = P.op_plan({"clips": clips})
for key in plan["units"]: P.op_unit({"runId": plan["runId"], "key": key})
print(json.dumps({"plan": plan, "manifest": P.op_assemble({"runId": plan["runId"], "master": False})}))
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

// The paid matte request: nothing is sent before the credits notice is accepted; one request for the montage, with
// the run's key, the clip's seconds and the joined sources; a declined notice, an old Selects or a Clip highlights run
// (no panel to click) stops before submit; a rebuild reuses the result and never asks again; Cancel cancels the job.
test('Windows mattes: credits notice first, one generation request, cached for rebuilds', {skip, timeout: 900000}, async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pbm-cloud-'));
  const home = path.join(tmp, 'home');
  const skills = path.join(home, '.selects', 'skills', 'portrait-beat-montage');
  fs.mkdirSync(skills, {recursive: true});
  fs.copyFileSync(path.join(plugin, 'SKILL.md'), path.join(skills, 'SKILL.md'));
  fs.symlinkSync(path.join(plugin, 'assets'), path.join(skills, 'assets'));
  const sources = await makeClips(tmp);
  const files = Array.from({length: 10}, (_, i) => ({path: sources[i % 2]}));
  // Selects generation stand-in: the alpha video is a luma key of the uploaded clip, saved in the delivery folder.
  const submitted = [], jobs = new Map(), cancelled = [];
  const MediaGeneration = {
    supportsPluginFiles: () => true,
    submit: async (req) => {
      submitted.push(req);
      const jobId = 'job-' + submitted.length;
      jobs.set(jobId, {jobId, status: 'running', deliveryStatus: 'pending', outputs: []});
      fs.mkdirSync(req.delivery.pluginFolder, {recursive: true});
      const out = path.join(req.delivery.pluginFolder, 'person-mattes.mp4');
      run(FFMPEG, ['-v', 'error', '-y', '-i', req.uploads.source.pluginFile, '-vf', "format=gray,lut=y='if(gt(val,150),255,0)',gblur=sigma=2", '-c:v', 'libx264', '-pix_fmt', 'yuv420p', out])
        .then(() => Object.assign(jobs.get(jobId), {status: 'succeeded', deliveryStatus: 'delivered', outputs: [{path: out}]}));
      return {jobIds: [jobId]};
    },
    list: async () => [...jobs.values()],
    cancel: async (scope, jobId) => { cancelled.push(jobId); },
  };
  const {engine} = loadEngine(home, {MediaGeneration});
  const data = path.join(home, '.selects', 'plugin-data', 'portrait-beat-montage');
  const build = (confirm, extra = {}, e = engine) => e.pbmWindowsMontage({}, {projectId: 'p-1', files, confirm, setStep: () => {}, setProgress: () => {}, signal: new AbortController().signal, ...extra});
  const asked = [];

  // Declined: nothing submitted, nothing rendered.
  await assert.rejects(build(async (q) => { asked.push(q); return false; }), (e) => e.code === 'cancelled');
  assert.equal(submitted.length, 0);
  assert.deepEqual(plain(asked), [{seconds: 4 * 36 / 60, shots: 4}]);
  // A Clip highlights run: its confirm refuses, before submit.
  await assert.rejects(build(() => { throw Object.assign(new Error('needs a click'), {code: 'needs-confirm'}); }), /needs a click/);
  assert.equal(submitted.length, 0);
  // An old Selects: refused before the notice.
  await assert.rejects(build(async () => { throw Error('asked'); }, {}, loadEngine(home, {MediaGeneration, version: '2.0.511'}).engine), /2\.0\.512 or later/);
  const runs = fs.readdirSync(path.join(data, 'runs'));
  assert.equal(runs.length, 1, 'one resumable run');
  assert.ok(!fs.existsSync(path.join(data, 'runs', runs[0], 'manifest.json')));

  // Accepted: one request for the 4 distinct windows, then the montage.
  const manifest = await build(async (q) => { asked.push(q); return true; });
  assert.equal(submitted.length, 1);
  const req = submitted[0];
  assert.equal(req.modelId, 'model_v1_dmVlZC92aWRlby1iYWNrZ3JvdW5kLXJlbW92YWwvZmFzdA');
  assert.deepEqual(plain(req.scope), {libraryId: 'lib-1', projectId: 'p-1'});
  assert.deepEqual(plain(req.inputMediaSeconds), {video: 4 * 36 / 60});
  assert.match(req.key, /^pbm-[0-9a-f]{24}$/);
  assert.ok(req.uploads.source.pluginFile.startsWith(path.join(data, 'runs')));
  assert.ok(req.delivery.pluginFolder.startsWith(path.join(data, 'runs')));
  assert.equal(req.input.subject_is_person, true);
  assert.equal(manifest.clips.length, 17);

  // Rebuild of the same clips: a new run, every window from the cache, no notice, no request.
  const again = await build(async () => { throw Error('asked again'); });
  assert.equal(submitted.length, 1);
  assert.equal(again.clips.length, 17);
  // Cancel while the request runs cancels it (fresh windows: a cleared cache).
  fs.rmSync(path.join(data, 'cache-w1'), {recursive: true, force: true});
  MediaGeneration.submit = async (r) => { submitted.push(r); jobs.set('slow', {jobId: 'slow', status: 'running', deliveryStatus: 'pending', outputs: []}); return {jobIds: ['slow']}; };
  const c = new AbortController();
  await assert.rejects(build(async () => { setTimeout(() => c.abort(), 1500); return true; }, {signal: c.signal}), (e) => e.code === 'cancelled');
  assert.deepEqual(plain(cancelled), ['slow']);
  t.diagnostic('notice shown ' + asked.length + 'x, requests ' + submitted.length);
  fs.rmSync(tmp, {recursive: true, force: true});
});
