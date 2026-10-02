// plugins/selfie-aesthetic/tests/still.test.cjs (run: node plugins/selfie-aesthetic/tests/still.test.cjs)
// Stillness picker: holds come from the stillest moments of a clip when the still weight is > 0.
//   1. Regression: with weight 0 (the default) saePlanBuild returns byte-for-byte the plans the planner returned
//      before the stillness change. tests/fixtures/plan-baseline.json holds the sha256 of every case's plan JSON,
//      dumped with the pre-change planner (`--update` rewrites it; only do that for an intended plan change).
//   2. Planner: at equal face score the still window wins over a moving one; still fillers come from motion minima.
//   3. Host block: saeMotionCurve on a synthetic clip (static first half, moving second half) gives low then high
//      values (needs ffmpeg/ffprobe on PATH or SAE_FFMPEG_DIR; skipped with a note otherwise).
'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), vm = require('node:vm'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFile, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const P = require(path.join(root, 'planner.js'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'cues', 'manifest.json'), 'utf8'));
const FIXTURE = path.join(__dirname, 'fixtures', 'plan-baseline.json');
const sha = (v) => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// ---- regression cases: a fixed, deterministic set of planner inputs ----
// A tiny seeded generator (no Math.random) so the inputs never change.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function footage(seed, nVideos, nPhotos) {
  const r = rng(seed), durations = {}, candidates = [], badSpans = {}, photos = [];
  for (let k = 0; k < nVideos; k++) {
    const rid = 'v' + seed + '-' + k;
    const dur = Math.round((1.3 + r() * 20) * 100) / 100;
    durations[rid] = dur;
    const face = r() < 0.6;
    for (const role of ['selfie', 'hand', 'expression', 'glance', 'control']) {
      const n = 1 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const score = role === 'control' ? 0.15 + r() * 0.05 : face ? 0.2 + r() * 0.1 : 0.1 + r() * 0.06;
        candidates.push({ rid, role, t: Math.round(r() * dur * 1000) / 1000, score: Math.round(score * 1e4) / 1e4 });
      }
    }
    if (r() < 0.3) { const s = Math.round(r() * dur * 100) / 100; badSpans[rid] = [[s, Math.min(dur, s + 0.5 + r())]]; }
  }
  for (let k = 0; k < nPhotos; k++) photos.push('p' + seed + '-' + k);
  return { durations, candidates, badSpans, photos };
}
function cases() {
  const out = [];
  const cues = [null, ...manifest.cues, { bpm: 128, firstBeat: 0.21, grid: 'accepted', durationSeconds: 40 },
    { own: true, bpm: 0, firstBeat: 0, grid: 'none', durationSeconds: 50, onsets: [], onsetThresholds: undefined }];
  let n = 0;
  for (const cue of cues) {
    for (const bars of [4, 6, 8]) {
      for (const seed of [1, 2]) {
        n++;
        const f = footage(n, 2 + (n % 9), n % 5);
        for (const fps of [30, 24000 / 1001]) {
          out.push({ name: (cue ? cue.id || 'cue' + cue.bpm : 'none') + ' b' + bars + ' s' + seed + ' fps' + fps.toFixed(3),
            opts: { fps, bars, seed, cue, candidates: f.candidates, durations: f.durations, badSpans: f.badSpans, photos: f.photos, usePhotos: n % 3 !== 0 } });
        }
      }
    }
  }
  return out;
}
// A synthetic motion curve per clip (8 fps), deterministic.
function motionFor(durations, seed) {
  const r = rng(seed), motion = {};
  for (const rid of Object.keys(durations)) {
    const values = [];
    for (let i = 0; i < Math.floor(durations[rid] * 8); i++) values.push(Math.round((0.5 + r() * 9) * 100) / 100);
    motion[rid] = { fps: 8, values };
  }
  return motion;
}

if (process.argv.includes('--update')) {
  const base = {};
  for (const c of cases()) base[c.name] = sha(P.saePlanBuild(c.opts));
  fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
  fs.writeFileSync(FIXTURE, JSON.stringify(base, null, 1) + '\n');
  console.log('wrote ' + Object.keys(base).length + ' plan hashes to ' + path.relative(process.cwd(), FIXTURE));
  process.exit(0);
}

test('weight 0 reproduces the pre-change plans byte for byte', () => {
  const base = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  const list = cases();
  assert.equal(Object.keys(base).length, list.length, 'every case has a baseline hash');
  let ok = 0, okPlans = 0;
  for (const c of list) {
    const plain = P.saePlanBuild(c.opts);
    assert.equal(sha(plain), base[c.name], c.name + ': plan differs from the baseline');
    // Motion given but weight 0 (explicit or the default) changes nothing either.
    const motion = motionFor(c.opts.durations, c.name.length);
    assert.equal(sha(P.saePlanBuild({ ...c.opts, motion })), base[c.name], c.name + ': motion with the default weight');
    assert.equal(sha(P.saePlanBuild({ ...c.opts, motion, stillWeight: 0 })), base[c.name], c.name + ': motion with weight 0');
    // Build without analysis: every clip analysed (with quick scores and the kit picker at hand) changes nothing.
    const analysed = Object.fromEntries(Object.keys(c.opts.durations).map((rid) => [rid, true]));
    const local = Object.fromEntries(Object.keys(c.opts.durations).map((rid) => [rid, { rid, windows: [], sceneCuts: [], fallback: false, duration: c.opts.durations[rid] }]));
    const pickLocal = () => [{ start: 0.5, end: 1.5, score: 1, motion: 0, flags: {} }];
    assert.equal(sha(P.saePlanBuild({ ...c.opts, analysed, local, pickLocal })), base[c.name], c.name + ': every clip analysed');
    ok++;
    if (plain.ok) okPlans++;
  }
  assert.ok(okPlans >= list.length * 0.8, 'most cases plan (' + okPlans + '/' + list.length + ')');
  console.log('  ' + ok + ' cases identical to the baseline (' + okPlans + ' ok plans)');
});

test('SAE_STILL_WEIGHT is exported and off by default', () => {
  assert.equal(P.SAE_STILL_WEIGHT, 0);
});

// ---- planner with weight > 0 ----
const FPS = 30, WIN = 0.9;
// A curve at 8 fps over `dur` seconds: value(t) per sample start time.
const curve = (dur, value) => ({ fps: 8, values: Array.from({ length: Math.floor(dur * 8) }, (_, i) => value(i / 8)) });
const pairTimes = (p) => [p.a, p.b].map((t) => Math.round(t * 1000) / 1000).sort((x, y) => x - y);

test('at equal face score the still window wins over a moving one', () => {
  const candidates = [1, 3, 5.5, 7.5].map((t) => ({ rid: 'c', role: 'selfie', t, score: 0.3 })).concat([{ rid: 'c', role: 'control', t: 0.5, score: 0.1 }]);
  const motion = { c: curve(10, (t) => (t < 4.5 ? 6 : 1)) };
  const run = (stillWeight) => P.saeMoments({ fps: FPS, beatSeconds: WIN, durations: { c: 10 }, candidates, motion, stillWeight }).clips[0];
  const off = run(0), on = run(0.6);
  // Weight 0: equal scores, so the farthest-apart pair (one moment in the moving part).
  assert.deepEqual(pairTimes(off.pairs[0]), [1, 7.5]);
  // Weight 0.6: both moments in the still part.
  assert.deepEqual(pairTimes(on.pairs[0]), [5.5, 7.5]);
  assert.ok(on.pairs[0].score < off.pairs[0].score, 'the penalty lowers pair scores');
  // Clip-level fields (the allocator's clip choice) never move with the weight: only moments do.
  for (const k of ['face', 'faceScore', 'control', 'duration']) assert.equal(on[k], off[k], k);
});

test('weight 0.6: a still filler beats a hit only when the hit moves about 2.2x the clip median more', () => {
  // Hits (0.3) at 2 s and 8 s in parts of motion h; a still dip (0.2) at 4.5-6 s; the rest 2 (the median).
  // Hit moment = 0.3 - 0.6 h / 2; still filler = -1 - 0.6 * 0.1. The hit-hit pair beats hit + still filler while
  // 0.3 - 0.3 h > -1.06, i.e. h / median < 2.27 (cost difference < 2.17).
  const run = (h) => {
    const motion = { c: curve(12, (t) => ((t >= 1 && t < 3) || (t >= 7 && t < 9) ? h : t >= 4.5 && t < 6 ? 0.2 : 2)) };
    const candidates = [{ rid: 'c', role: 'selfie', t: 2, score: 0.3 }, { rid: 'c', role: 'selfie', t: 8, score: 0.3 }, { rid: 'c', role: 'control', t: 0.2, score: 0.1 }];
    return P.saeMoments({ fps: FPS, beatSeconds: WIN, durations: { c: 12 }, candidates, motion, stillWeight: 0.6 }).clips[0].pairs[0];
  };
  assert.deepEqual(pairTimes(run(4)), [2, 8], 'hits moving 2x the median stay');
  const fast = pairTimes(run(6));
  assert.ok(fast.some((t) => t >= 4.5 && t + WIN <= 6 + 1e-9), 'hits moving 3x the median give way to the still dip: ' + fast);
});

test('still fillers come from motion minima off the filler grid', () => {
  // No hits: moments are fillers. The stillest window starts at 6.125 s (off the 0.5 s grid), on the next frame. The
  // still stretch holds two non-overlapping windows (A and B never overlap), so the best pair can sit inside it.
  const motion = { c: curve(12, (t) => (t >= 6.1 && t < 8.3 ? 0.1 : 3)) };
  const t0 = Math.ceil(6.125 * FPS) / FPS;
  const run = (stillWeight) => P.saeMoments({ fps: FPS, beatSeconds: WIN, durations: { c: 12 }, candidates: [], motion, stillWeight }).clips[0];
  const off = run(0), on = run(0.6);
  const at = (c) => c.pairs.flatMap((p) => [p.a, p.b]);
  assert.ok(!at(off).some((t) => Math.abs(t - t0) < 1e-9), 'weight 0 keeps the grid');
  assert.ok(Math.abs(at(on).slice(0, 2).find((t) => t > 5 && t < 7) - t0) < 1e-9, 'the minimum is in the best pair: ' + at(on).slice(0, 2));
  assert.ok(on.times > off.times, 'still fillers add candidate times');
  // Deterministic.
  assert.deepEqual(JSON.stringify(run(0.6)), JSON.stringify(on));
  // A capped number of minima per clip.
  const noisy = { c: curve(120, (t) => 1 + ((Math.floor(t * 8) * 7919) % 13)) };
  const c = P.saeStillCost(noisy.c, WIN);
  assert.ok(c.minima.length <= P.SAE_STILL_MINIMA && c.minima.length > 0);
});

test('saeStillCost: median normalisation, floor, cap, unknown windows', () => {
  const c = P.saeStillCost({ fps: 8, values: [1, 1, 1, 1, 9, 9, 1, 1] }, 0.25);
  assert.equal(c.at(0), 1);
  assert.equal(c.at(0.5), 4, 'capped at SAE_STILL_COST_MAX');
  assert.equal(c.at(5), 1, 'a window past the curve is neutral');
  assert.equal(P.saeStillCost({ fps: 8, values: [0, 0, 0.25, 0] }, 0.25).at(0.25), 0.25, 'median floored at SAE_STILL_FLOOR');
  assert.equal(P.saeStillCost({ fps: 8, values: [1] }, 0.25), null);
  assert.equal(P.saeStillCost(null, 0.25), null);
  // Float32Array input (the host block's output) works the same.
  assert.equal(P.saeStillCost({ fps: 8, values: new Float32Array([1, 1, 1, 1, 9, 9, 1, 1]) }, 0.25).at(0.5), 4);
});

test('saePlanBuild passes motion through: a still weight moves moments, never the bars', () => {
  const c = cases().find((x) => x.opts.cue && x.opts.bars === 6);
  const motion = motionFor(c.opts.durations, 7);
  const off = P.saePlanBuild(c.opts), on = P.saePlanBuild({ ...c.opts, motion, stillWeight: 0.6 });
  assert.equal(on.ok, true);
  assert.deepEqual(on.cutSecondsRaw, off.cutSecondsRaw);
  assert.equal(on.bars, off.bars);
  assert.notDeepEqual(on.holds.map((h) => h.srcStart), off.holds.map((h) => h.srcStart));
});

// ---- host block saeMotionCurve and the driver's copy (ffmpeg) ----
const toolDir = process.env.SAE_FFMPEG_DIR || '';
const tool = (name) => (toolDir ? path.join(toolDir, name) : name);
const hasTool = (name) => { try { return spawnSync(tool(name), ['-version'], { stdio: 'ignore' }).status === 0; } catch (e) { return false; } };
const HAVE_FF = hasTool('ffmpeg');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sae-still-'));
function hostBlock(di) {
  const src = fs.readFileSync(path.join(root, 'dev', 'host-block.ts'), 'utf8');
  const block = src.slice(src.indexOf('// sae-host:start'), src.indexOf('// sae-host:end'));
  const box = { setTimeout, clearTimeout, AbortController, navigator: {}, window: { parent: { __DI__: di } } };
  vm.createContext(box);
  vm.runInContext(block + ';globalThis.H={saeMotionCurve,saeMotionArgs,saeMotionValues,SAE_MOTION_FPS};', box);
  return box.H;
}
const runFF = (args, signal) => new Promise((resolve, reject) => execFile(tool('ffmpeg'), args, { signal, encoding: 'utf8' }, (err, stdout, stderr) => (err ? (err.stderr = stderr, reject(err)) : resolve({ stdout, stderr }))));
const realDI = () => ({
  FileSystem: { join: path.join, homedir: () => tmp, mkdirSync: fs.mkdirSync, existsSync: fs.existsSync, readFileSync: fs.readFileSync, unlinkSync: fs.unlinkSync },
  Runtime: { getPlatform: () => process.platform, runFFmpeg: (args, quiet, signal) => runFF(args, signal) },
});

test('saeMotionValues: mean absolute difference per frame pair, null for partial frames', () => {
  const H = hostBlock(undefined);
  const size = 32 * 56, bytes = new Uint8Array(size * 3);
  bytes.fill(10, size, 2 * size); // frame 1 differs from frames 0 and 2 by 10 everywhere
  assert.deepEqual(Array.from(H.saeMotionValues(bytes)), [10, 10]);
  assert.equal(H.saeMotionValues(new Uint8Array(size)), null);
  assert.equal(H.saeMotionValues(new Uint8Array(size * 2 + 1)), null);
  const args = Array.from(H.saeMotionArgs('in.mov', 'out.gray'));
  assert.deepEqual(args, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', 'in.mov', '-t', '120', '-an', '-vf', 'fps=8,scale=32:56,setsar=1,format=gray', '-f', 'rawvideo', 'out.gray']);
});

test('saeMotionCurve on a static-then-moving clip: low then high; the driver computes the same curve', async () => {
  if (!HAVE_FF) { console.log('  (skipped: no ffmpeg on PATH or SAE_FFMPEG_DIR)'); return; }
  const clip = path.join(tmp, 'still then moving.mp4');
  await runFF(['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=gray:s=320x568:r=30:d=2', '-f', 'lavfi', '-i', 'testsrc2=s=320x568:r=30:d=2',
    '-filter_complex', '[0][1]concat=n=2:v=1:a=0,format=yuv420p', '-c:v', 'mpeg4', '-q:v', '3', clip]);
  const H = hostBlock(realDI());
  const dir = path.join(tmp, 'data');
  fs.mkdirSync(dir, { recursive: true });
  const m = await H.saeMotionCurve(clip, dir);
  assert.equal(m.fps, 8);
  assert.ok(m.values.length >= 28 && m.values.length <= 32, 'about 4 s x 8 fps: ' + m.values.length);
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const v = Array.from(m.values), still = mean(v.slice(0, 14)), moving = mean(v.slice(17));
  assert.ok(still < 0.5 && moving > 3 && moving > 10 * still, 'static ' + still.toFixed(3) + ' vs moving ' + moving.toFixed(3));
  assert.deepEqual(fs.readdirSync(dir), [], 'temp frames removed');
  // A missing file is media_failed (the panel then plans without motion).
  let err = null;
  try { await H.saeMotionCurve(path.join(tmp, 'missing.mov'), dir); } catch (e) { err = e; }
  assert.equal(err && err.message, 'media_failed');
  // The driver adapter: same argv and arithmetic in node.
  const { createAdapter } = await import(require('node:url').pathToFileURL(path.join(root, 'dev', 'driver-adapter.mjs')).href);
  const A = await createAdapter({ pluginDir: root, installedDir: '/installed/selfie-aesthetic', read: (rel) => fs.readFileSync(path.join(root, rel), 'utf8') });
  const d = A.motionCurve(clip);
  assert.equal(d.fps, m.fps);
  assert.deepEqual(Array.from(d.values), v);
  assert.equal(A.motionCurve(path.join(tmp, 'missing.mov')), null);
  console.log('  motion static ' + still.toFixed(3) + ', moving ' + moving.toFixed(2) + ' (' + v.length + ' values; driver identical)');
});

test('driver still row: measures source paths and plans with the weight', async () => {
  const { createAdapter } = await import(require('node:url').pathToFileURL(path.join(root, 'dev', 'driver-adapter.mjs')).href);
  const A = await createAdapter({ pluginDir: root, installedDir: '/installed/selfie-aesthetic', read: (rel) => fs.readFileSync(path.join(root, rel), 'utf8') });
  assert.equal(A.panelConstants.STILL_WEIGHT, 0.6, 'the panel ships with the stillness picker at 0.6 (Staging A/B, round 2)');
  assert.equal(P.SAE_STILL_WEIGHT, 0, 'the planner default stays off');
  const c = cases().find((x) => x.opts.cue && x.opts.cue.id === 'make-funk' && x.opts.bars === 4);
  const inv = { resources: Object.keys(c.opts.durations).map((rid) => ({ rid, name: rid, duration: c.opts.durations[rid], width: 1080, height: 1920, path: null })), photos: [] };
  const found = { failed: [], list: c.opts.candidates.map((x) => ({ ...x, sourceDuration: c.opts.durations[x.rid] })) };
  const row = { key: 's', pid: '28579d3f-de18-4af5-8f3d-f1bf9245fc20', cue: 'make-funk', photos: false };
  const off = A.plan({ row: { ...row, still: 0 }, seed: 1, inv, found });
  assert.deepEqual(off.still, { weight: 0, measured: 0, videos: inv.resources.length });
  // No source paths at all with a weight: an old inventory, refused.
  assert.throws(() => A.plan({ row: { ...row, still: 0.6 }, seed: 1, inv, found }), /source paths/);
  // A path that does not exist: no curve, so the plan equals weight 0.
  inv.resources[0].path = path.join(tmp, 'gone.mov');
  const on = A.plan({ row: { ...row, still: 0.6 }, seed: 1, inv, found });
  assert.deepEqual(on.still, { weight: 0.6, measured: 0, videos: inv.resources.length });
  assert.deepEqual(on.plan, off.plan);
  assert.equal(A.record(on, { fps: 30 }).rec.inputs.still, 0.6);
});

(async () => {
  let failed = 0;
  for (const { name, fn } of tests) {
    try { await fn(); console.log('ok   ' + name); } catch (e) { failed++; console.log('FAIL ' + name + '\n     ' + (e && e.stack || e)); }
  }
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* best effort */ }
  console.log(JSON.stringify({ still: failed ? 'FAIL' : 'ok', tests: tests.length, failed }));
  process.exit(failed ? 1 : 0);
})();
