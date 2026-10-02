// plugins/selfie-aesthetic/tests/local.test.cjs (run: node plugins/selfie-aesthetic/tests/local.test.cjs)
// Build without analysis: the planner's path for clips Selects has not analysed (planner.js saeLocalClip /
// saeLocalNorm and the allocation tiers), fed with real quickScore results made by the kit block's own pure maths
// (panel.tsx `// quick-score:start/end`) from synthetic frames, and the kit's pickWindowsLocal as `pickLocal`.
//   - unanalysed-only pools plan; holds avoid flagged windows and come from the calmest part; A/B pairs are apart
//   - fallback (no score / the kit's fallback / no picker): evenly spaced moments from 0.5 s, still builds
//   - mixed pools: analysed face clips first, then unanalysed clips (fresh-first), then photos, then non-face clips
//   - rank normalisation within the unanalysed group; key bars take the steadiest pair; framing; truthful notes
'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const P = require(path.join(root, 'planner.js'));
const panel = fs.readFileSync(path.join(root, 'panel.tsx'), 'utf8');
const qa = panel.indexOf('// quick-score:start'), qb = panel.indexOf('// quick-score:end');
assert.ok(qa >= 0 && qb > qa, 'quick-score block present');
const ctx = { console, setTimeout, clearTimeout, AbortController, TextDecoder, Uint8Array, Map, Promise, Date, Math, JSON, Object, Number, String, Array, Error };
vm.createContext(ctx);
vm.runInContext(panel.slice(qa, qb) + '\nthis.Q = { pickWindowsLocal, qsFrameStats, qsSceneCuts, qsWindowScores, qsBins, qsFallback, QS_HEAD, QS_W, QS_H, QS_FPS };', ctx);
const Q = ctx.Q;
const plain = (x) => JSON.parse(JSON.stringify(x));
const pickLocal = Q.pickWindowsLocal;
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// ---- synthetic quickScore results through the kit's own maths ----
const W = Q.QS_W, H = Q.QS_H, FPS = Q.QS_FPS;
const checker = (x, y, shift) => (((Math.floor((x + shift) / 4) + Math.floor(y / 4)) % 2) ? 190 : 70);
// A clip of `dur` seconds decoded from QS_HEAD like quickScore does; lumaAt(t, x, y) gives each pixel.
function scored(rid, dur, lumaAt) {
  const n = Math.round((dur - Q.QS_HEAD) * FPS), bytes = new Uint8Array(n * W * H);
  for (let i = 0; i < n; i++) {
    const t = Q.QS_HEAD + i / FPS;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) bytes[i * W * H + y * W + x] = Math.max(0, Math.min(255, Math.round(lumaAt(t, x, y))));
  }
  const stats = Q.qsFrameStats(bytes, W, H);
  const cuts = Q.qsSceneCuts(stats, FPS, Q.QS_HEAD);
  const windows = Q.qsWindowScores(stats, FPS, Q.QS_HEAD, Q.qsBins(dur, Q.QS_HEAD, dur - Q.QS_HEAD), cuts);
  return plain({ rid, windows, sceneCuts: cuts, ms: 0, fallback: false, cached: false, duration: dur });
}
// Moving everywhere except a calm stretch [calm0, calm1).
const calmClip = (rid, dur, calm0, calm1, extra = () => null) => scored(rid, dur, (t, x, y) => {
  const e = extra(t, x, y);
  if (e !== null) return e;
  return checker(x, y, t >= calm0 && t < calm1 ? 0 : Math.round(t * 30));
});
const FPS30 = 30, CUE = null; // no music: the fixed 97 BPM grid
const winOf = (fps) => 60 / 97 + P.SAE_LEAD + 2 / fps; // saePlanBuild's moment length without music
const holdsOf = (plan, rid) => plan.holds.filter((h) => h.rid === rid);
const windowsOverlap = (s, win, a, b) => s < b && s + win > a;

test('an unanalysed-only pool plans: calm moments, no flagged windows, A/B apart, tight framing, notes', () => {
  // Three 12 s clips: each calm in a different stretch; c1 fades in from black over its first 1.5 s and flashes at 8 s.
  const lum = (t) => (t < 1.5 ? t / 1.5 : 1);
  const local = {
    c1: calmClip('c1', 12, 3, 7, (t, x, y) => (Math.abs(t - 8) < 0.07 ? 250 : t < 1.5 ? checker(x, y, 0) * lum(t) : null)),
    c2: calmClip('c2', 12, 6, 10),
    c3: calmClip('c3', 12, 1, 5),
  };
  const durations = { c1: 12, c2: 12, c3: 12 }, analysed = { c1: false, c2: false, c3: false };
  const plan = P.saePlanBuild({ fps: FPS30, bars: 4, seed: 1, cue: CUE, candidates: [], durations, analysed, local, pickLocal, photos: [] });
  assert.equal(plan.ok, true);
  assert.equal(plan.localClips, 3);
  assert.equal(plan.localFallback, 0);
  assert.equal(plan.faceClips, 0);
  assert.ok(!plan.notes.includes('few-face') || plan.notes.includes('reused'), 'three likely close-ups fill 4 bars with one repeat');
  const win = winOf(FPS30);
  const calm = { c1: [3, 7], c2: [6, 10], c3: [1, 5] };
  for (const h of plan.holds) {
    assert.equal(h.kind, 'video');
    assert.equal(h.framing, 'tight', 'unanalysed clips are framed as likely close-ups');
    assert.ok(h.srcStart >= P.SAE_LOCAL_HEAD - 1e-9, 'no window in the first 0.5 s');
    if (h.rid === 'c1') {
      assert.ok(h.srcStart >= 1.5 - 1e-9, 'c1 skips its fade-in: ' + h.srcStart);
      assert.ok(!windowsOverlap(h.srcStart, win, 7.9, 8.1), 'c1 skips its flash: ' + h.srcStart);
    }
    const [a, b] = calm[h.rid];
    assert.ok(h.srcStart >= a - 1e-9 && h.srcStart + win <= b + 0.26, h.rid + ' plays its calm stretch: ' + h.srcStart.toFixed(3));
  }
  // A and B of a bar differ by at least SAE_PAIR_GAP (and the window).
  for (let k = 0; k < plan.bars; k++) {
    const a = plan.holds.find((h) => h.bar === k && h.moment === 'A'), b = plan.holds.find((h) => h.bar === k && h.moment === 'B');
    assert.ok(Math.abs(a.srcStart - b.srcStart) >= Math.max(P.SAE_PAIR_GAP, win) - 1e-9, 'bar ' + k + ' A/B apart');
  }
  // Deterministic.
  assert.equal(JSON.stringify(P.saePlanBuild({ fps: FPS30, bars: 4, seed: 1, cue: CUE, candidates: [], durations, analysed, local, pickLocal, photos: [] })), JSON.stringify(plan));
});

test('pairs prefer moments 1.5 s apart or across a scene cut', () => {
  // A calm 2 s stretch on each side of a hard cut at 5 s: the best pair spans the cut.
  const local = { c: scored('c', 9, (t, x, y) => (t >= 3 && t < 7 ? (t < 5 ? checker(x, y, 0) : 255 - checker(x, y, 2)) : checker(x, y, Math.round(t * 30)))) };
  assert.ok(local.c.sceneCuts.some((t) => Math.abs(t - 5) < 0.2), 'the kit finds the cut: ' + local.c.sceneCuts);
  const win = winOf(FPS30);
  const m = P.saeMoments({ fps: FPS30, beatSeconds: win, durations: { c: 9 }, candidates: [], analysed: { c: false }, local, pickLocal });
  const c = m.clips[0];
  assert.equal(c.local, true);
  assert.equal(c.fallback, false);
  const best = c.pairs[0], lo = Math.min(best.a, best.b), hi = Math.max(best.a, best.b);
  assert.ok(hi - lo >= P.SAE_PAIR_SEP - 1e-9 || (lo + win <= 5 && hi >= 5), 'best pair apart or across the cut: ' + lo + ' / ' + hi);
  assert.ok(lo >= 3 - 1e-9 && hi + win <= 7 + 0.26, 'both in the calm stretch: ' + lo + ' / ' + hi);
  for (const p of c.pairs) assert.ok(Math.abs(p.a - p.b) >= Math.max(P.SAE_PAIR_GAP, win) - 1e-9);
  assert.equal(m.localCount, 1);
  assert.equal(m.faceCount, 0);
});

test('fallback: no score, the kit fallback result or no picker -> evenly spaced moments from 0.5 s; it still builds', () => {
  const durations = { u1: 8, u2: 10, u3: 6 }, analysed = { u1: false, u2: false, u3: false };
  const fb = plain(Q.qsFallback({ rid: 'u2', durationSeconds: 10 }, 0, null));
  const variants = [
    { local: {}, pickLocal },
    { local: { u1: fb, u2: fb, u3: fb }, pickLocal },
    { local: { u1: calmClip('u1', 8, 2, 5) }, pickLocal: undefined },
  ];
  const plans = variants.map((v) => P.saePlanBuild({ fps: FPS30, bars: 4, seed: 3, cue: CUE, candidates: [], durations, analysed, photos: [], ...v }));
  for (const plan of plans) {
    assert.equal(plan.ok, true);
    assert.equal(plan.localClips, 3);
    assert.equal(plan.localFallback, 3, 'every clip planned from the fallback');
    for (const h of plan.holds) {
      assert.ok(h.srcStart >= P.SAE_LOCAL_HEAD - 1e-9, 'skips the first 0.5 s');
      assert.ok(Math.abs(h.srcStart * 2 - Math.round(h.srcStart * 2)) < 1e-6, 'on the 0.5 s grid: ' + h.srcStart);
    }
  }
  assert.equal(JSON.stringify(plans[0].holds), JSON.stringify(plans[2].holds), 'all fallbacks plan alike');
  // The fallback's first pair is the farthest-apart one.
  const m = P.saeMoments({ fps: FPS30, beatSeconds: winOf(FPS30), durations: { u: 8 }, candidates: [], analysed: { u: false } });
  assert.equal(m.clips[0].fallback, true);
  assert.deepEqual([m.clips[0].pairs[0].a, m.clips[0].pairs[0].b].sort(), [0.5, 7].sort());
});

test('mixed pools: face clips first, then unanalysed (before any face repeat), then photos, then non-face', () => {
  // Two analysed face clips (f1, f2), one analysed non-face (n1), three unanalysed (u1-u3), three photos.
  const cand = [];
  for (const rid of ['f1', 'f2']) cand.push({ rid, role: 'selfie', t: 2, score: 0.3 }, { rid, role: 'selfie', t: 5, score: 0.29 }, { rid, role: 'control', t: 1, score: 0.1 });
  cand.push({ rid: 'n1', role: 'selfie', t: 2, score: 0.1 }, { rid: 'n1', role: 'control', t: 1, score: 0.3 });
  const durations = { f1: 9, f2: 9, n1: 9, u1: 9, u2: 9, u3: 9 };
  const analysed = { f1: true, f2: true, n1: true, u1: false, u2: false, u3: false };
  const local = { u1: calmClip('u1', 9, 2, 6), u2: calmClip('u2', 9, 3, 7), u3: calmClip('u3', 9, 4, 8) };
  const base = { fps: FPS30, seed: 1, cue: CUE, candidates: cand, durations, analysed, local, pickLocal };
  // Long (8 bars): photos take their share; the video bars go face, face, then every unanalysed clip once before any
  // face clip repeats; the non-face clip only after the unanalysed ones are spent.
  const long = P.saePlanBuild({ ...base, bars: 8, photos: ['p1', 'p2', 'p3'] });
  assert.equal(long.ok, true);
  const order = []; for (const h of long.holds) if (order[h.bar] === undefined) order[h.bar] = (h.kind === 'photo' ? 'P' : '') + h.rid;
  const vids = order.filter((r) => !r.startsWith('P'));
  assert.deepEqual(vids.slice(0, 2).sort(), ['f1', 'f2'], 'face clips open: ' + order);
  assert.deepEqual(vids.slice(2, 5).sort(), ['u1', 'u2', 'u3'], 'then each unanalysed clip once: ' + order);
  assert.ok(!vids.includes('n1'), 'the non-face clip waits behind face and unanalysed clips: ' + order);
  assert.ok(!long.notes.includes('few-face'), 'face + unanalysed clips cover the video bars, so no few-face note');
  assert.equal(long.faceClips, 2);
  assert.equal(long.localClips, 3);
  for (const h of long.holds) if (h.kind === 'video') assert.equal(h.framing, h.rid === 'n1' ? 'full' : 'tight');
  // Unanalysed clips rank before photos: a Short edit with face + unanalysed clips takes no photo bar.
  const short = P.saePlanBuild({ ...base, bars: 4, photos: ['p1', 'p2'] });
  assert.equal(short.photoBars, 0, 'video-rich input (face + unanalysed >= 3) keeps Short all video');
  // Without unanalysed clips the same pool falls back to photos / the non-face clip, and few-face fires.
  const noLocal = P.saePlanBuild({ ...base, bars: 8, photos: ['p1', 'p2', 'p3'], durations: { f1: 9, f2: 9, n1: 9 }, analysed: { f1: true, f2: true, n1: true } });
  assert.equal(noLocal.ok, true);
  assert.ok(noLocal.notes.includes('few-face'));
  assert.equal(noLocal.localClips, undefined, 'no localClips key without unanalysed clips');
});

test('few-face counts face + unanalysed clips; it fires only when both together fall short', () => {
  const durations = { u1: 9 }, analysed = { u1: false }, local = { u1: calmClip('u1', 9, 2, 6) };
  const plan = P.saePlanBuild({ fps: FPS30, bars: 4, seed: 1, cue: CUE, candidates: [], durations, analysed, local, pickLocal, photos: ['p1', 'p2'] });
  assert.equal(plan.ok, true);
  assert.ok(plan.notes.includes('few-face'), 'one unanalysed clip for several video bars');
  assert.equal(plan.faceClips, 0);
  assert.equal(plan.localClips, 1);
});

test('rank normalisation: 0-1 within the unanalysed group, ties share a rank, one clip is 1', () => {
  const clips = [{ local: true, quality: 0.2, steadyBest: 1 }, { local: true, quality: 0.8, steadyBest: 1 }, { local: true, quality: 0.5, steadyBest: 0.4 },
    { local: true, quality: 0.5, steadyBest: 0.9 }, { face: true, faceScore: 0.3 }];
  P.saeLocalNorm(clips);
  assert.deepEqual(clips.slice(0, 4).map((c) => c.norm), [0, 1, 0.5, 0.5]);
  assert.deepEqual(clips.slice(0, 4).map((c) => c.steadyNorm), [5 / 6, 5 / 6, 0, 1 / 3]);
  assert.equal(clips[4].norm, undefined, 'analysed clips keep their own scale');
  const one = [{ local: true, quality: 0.1, steadyBest: 0 }];
  P.saeLocalNorm(one);
  assert.equal(one[0].norm, 1);
  // From real scores: a sharp, calm, well-exposed clip outranks a dim, shaky one.
  const good = calmClip('g', 9, 1, 9), dim = scored('d', 9, (t, x, y) => checker(x, y, Math.round(t * 30)) * 0.35);
  const m = P.saeMoments({ fps: FPS30, beatSeconds: winOf(FPS30), durations: { d: 9, g: 9 }, candidates: [], analysed: { d: false, g: false }, local: { g: good, d: dim }, pickLocal });
  const by = Object.fromEntries(m.clips.map((c) => [c.rid, c]));
  assert.ok(by.g.quality > by.d.quality, 'quality ' + by.g.quality + ' vs ' + by.d.quality);
  assert.equal(by.g.norm, 1);
  assert.equal(by.d.norm, 0);
});

test('key bars: bar 0 and the finale take the steadiest pair of an unanalysed clip', () => {
  // One clip, many pairs; the steady scores differ by window. Key bars add SAE_LOCAL_KEY_WEIGHT * steady.
  const local = { u: calmClip('u', 14, 2, 12) };
  const durations = { u: 14 }, analysed = { u: false };
  const m = P.saeMoments({ fps: FPS30, beatSeconds: winOf(FPS30), durations, candidates: [], analysed, local, pickLocal });
  const pairs = m.clips[0].pairs;
  assert.ok(pairs.length >= 2 && pairs.every((p) => p.local && typeof p.steady === 'number'));
  const alloc = P.saeAllocate({ clips: m.clips, photos: [], bars: 3, seed: 1, allowAdjacent: true, allowPairReuse: true });
  assert.equal(alloc.ok, true);
  const keyed = (p) => p.score + P.SAE_LOCAL_KEY_WEIGHT * p.steady;
  const bestKey = Math.max(...pairs.map(keyed));
  assert.ok(keyed(alloc.bars[0].pair) >= bestKey - 0.06, 'bar 0 takes a top keyed pair (jitter 0.05)');
});

(async () => {
  let failed = 0;
  for (const { name, fn } of tests) {
    try { await fn(); console.log('ok   ' + name); } catch (e) { failed++; console.log('FAIL ' + name + '\n     ' + (e && e.stack || e)); }
  }
  console.log(JSON.stringify({ local: failed ? 'FAIL' : 'ok', tests: tests.length, failed }));
  process.exit(failed ? 1 : 0);
})();
