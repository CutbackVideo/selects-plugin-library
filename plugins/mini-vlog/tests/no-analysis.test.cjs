// plugins/mini-vlog/tests/no-analysis.test.cjs
// Build without analysis: clips Selects has not analysed get planner candidates from the kit's quick local score
// (panel.tsx mv-local block over the quick-score block), on one scale with scene-search hits. The planner, the mv-hook
// block, the mv-local block and the quick-score block run together in node:vm, as the headless driver loads them.
// Quick-score results here are stubs in the block's result shape ({ windows: [{ start, end, motion, sharp, luma,
// clipped, flags }], sceneCuts, duration, fallback }); tests/quick-score.test.cjs covers the real decoding.
'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const panel = fs.readFileSync(path.join(root, 'panel.tsx'), 'utf8');
const block = (name) => {
  const a = panel.indexOf('// ' + name + ':start\n'), b = panel.indexOf('// ' + name + ':end');
  assert.ok(a >= 0 && b > a, name + ' block present');
  assert.equal(panel.split('// ' + name + ':start').length, 2, 'one ' + name + ' block');
  return panel.slice(a, b);
};
const hook = block('mv-hook'), local = block('mv-local'), qs = block('quick-score');
assert.ok(!/:\s*(any|string|number|boolean)\b|Promise<|\bas any\b/.test(local), 'mv-local is plain JS');
assert.ok(!/runShell|child_process|require\(|\bwindow(\.parent|\[)|__DI__/.test(local), 'mv-local has no host access');
// The kit block is pasted verbatim. Hermetic (CI has no kit checkout): the block from its start marker up to (not
// including) its end marker must hash to the recorded copy of selects-app-kit tools/panel/quick-score.js. To take a kit
// update, paste the new block over this one and record the kit commit and the new hash here.
const QS_KIT_COMMIT = '753eb81';
const QS_KIT_SHA256 = 'b99a7847f21a07b8848ce138f722e59c1119b8d34ce785b13e83cfbeec009218';
assert.equal(require('node:crypto').createHash('sha256').update(qs).digest('hex'), QS_KIT_SHA256,
  'panel.tsx quick-score block equals selects-app-kit ' + QS_KIT_COMMIT + ' tools/panel/quick-score.js');
assert.ok(/var QS_VERSION = (\d+);/.test(qs) && Number(/var QS_VERSION = (\d+);/.exec(qs)[1]) >= 2, 'QS_VERSION >= 2 (duration in the cache key)');
const box = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON, isFinite, Promise, Date, setTimeout, clearTimeout, AbortController, TextDecoder, Uint8Array };
vm.createContext(box);
vm.runInContext(fs.readFileSync(path.join(root, 'planner.js'), 'utf8') + '\n' + hook + '\n' + local + '\n' + qs
  + ';globalThis.P={mvPlanBuild,mvAllocate,mvMotionBonus,mvLocalWindows,mvScoreRange,mvLocalCandidates,mvWithLocal,qsFallback,MV_LOCAL_ROLE,MV_LOCAL_RANGE,MV_LOCAL_WINDOW,MV_MOTION_BONUS,MV_ROLES,MV_PHOTO_SHARE};', box);
const P = box.P, j = v => JSON.parse(JSON.stringify(v));

// --- mvLocalWindows equals search.js's copy (the template run's candidates for clips without analysis) ----------------
{
  const search = fs.readFileSync(path.join(root, 'scripts', 'search.js'), 'utf8');
  const fn = /function localWindows\(dur\) \{[\s\S]*?\n\}/.exec(search);
  assert.ok(fn, 'search.js localWindows');
  const sbox = { Math, Array };
  const first = Number(/const LOCAL_FIRST = ([\d.]+);/.exec(search)[1]);
  assert.equal(first, 0.5 + P.MV_LOCAL_WINDOW / 2, 'search.js LOCAL_FIRST = 0.5 s + MV_LOCAL_WINDOW / 2');
  vm.runInNewContext('const LOCAL_MAX = ' + /const LOCAL_MAX = (\d+)/.exec(search)[1] + ';\nconst LOCAL_FIRST = ' + first + ';\n' + fn[0] + '\nthis.f = localWindows;', sbox);
  for (const d of [0.3, 1.2, 1.5, 1.7, 1.9, 4.2, 10, 24.4, 25.6, 26.6, 100, 3600]) assert.deepEqual(j(sbox.f(d)), j(P.mvLocalWindows(d)), 'windows for ' + d + ' s');
  // The first window (MV_LOCAL_WINDOW long, centred on t) starts at 0.5 s or later, each centre half a second clear of the end.
  assert.deepEqual(j(P.mvLocalWindows(4.2)), [1.2, 2.2, 3.2]);
  for (const d of [1.7, 4.2, 10, 25.6, 100, 3600]) {
    const w = P.mvLocalWindows(d);
    assert.ok(w[0] - P.MV_LOCAL_WINDOW / 2 >= 0.5 - 1e-9 && w[w.length - 1] <= d - 0.5 + 1e-9 && w.length <= 24, 'windows inside ' + d + ' s');
  }
  // Too short for one clean window: the middle.
  assert.deepEqual(j(P.mvLocalWindows(1.2)), [0.6]);
}

// --- Stub quick-score results --------------------------------------------------------------------------------------
const FLAGS = { black: false, fade: false, flash: false, blur: false, dark: false, bright: false, cut: false };
// 0.5 s bins from 0.5 s to `dur`; `at(t)` overrides a bin's figures and flags.
function scored(rid, dur, at = () => ({})) {
  const windows = [];
  for (let t = 0.5; t + 0.5 <= dur + 1e-9; t += 0.5) {
    const o = at(t) || {};
    windows.push({ start: t, end: t + 0.5, motion: o.motion ?? 0.03, sharp: o.sharp ?? 0.12, luma: o.luma ?? 0.45, clipped: 0, flags: { ...FLAGS, ...(o.flags || {}) } });
  }
  return { rid, duration: dur, scores: { rid, windows, sceneCuts: [], ms: 5, fallback: false, cached: false, duration: dur } };
}
const scene = (rid, role, t, score, dur = 20) => ({ rid, role, t, score, sourceDuration: dur });
const photo = rid => ({ rid, kind: 'photo' });
const planOf = (candidates, extra = {}) => j(P.mvPlanBuild({ candidates, bpm: 108, accepted: true, fps: 30, pace: 'quick', requested: 24, seed: '1', ...extra }));

// --- One scale -------------------------------------------------------------------------------------------------------
{
  // Every clip analysed: the list comes back unchanged (the same array), so analysed builds plan exactly as before.
  const list = [scene('a', 'drink', 3, 0.3), scene('a', 'motion', 3, 0.28), scene('b', 'street', 5, 0.27)];
  assert.equal(P.mvWithLocal(list, [], true), list);
  assert.equal(P.mvWithLocal(list, null, false), list);
  // Mixed: local scores land inside the scene hits' 10th..90th percentile range; scene scores are untouched; motion
  // hits (the Beat punch query) do not set the range.
  const hits = [0.26, 0.27, 0.28, 0.29, 0.3, 0.31, 0.32, 0.33, 0.34, 0.35, 0.36].map((s, i) => scene('a', 'drink', i, s));
  const range = j(P.mvScoreRange(hits.concat([scene('a', 'motion', 1, 0.9)])));
  assert.deepEqual(range, { lo: 0.27, hi: 0.35 });
  const mixed = j(P.mvWithLocal(hits, [scored('u', 12, t => ({ motion: t / 40, sharp: 0.05 + t / 100 }))], false));
  assert.deepEqual(mixed.slice(0, hits.length), j(hits), 'scene hits unchanged');
  const loc = mixed.slice(hits.length);
  assert.ok(loc.length > 3 && loc.every(c => c.role === P.MV_LOCAL_ROLE && c.score >= range.lo - 1e-9 && c.score <= range.hi + 1e-9), 'local scores inside [lo, hi]');
  assert.ok(new Set(loc.map(c => c.score)).size > 1, 'local scores spread over the range');
  assert.ok(loc.every(c => !('motion' in c)), 'no motion without Beat punch');
  assert.deepEqual(Object.keys(loc[0]).sort(), ['rid', 'role', 'score', 'sourceDuration', 't']);
  // A tight scene range is widened to 0.05 around its middle; no scene hits at all: the default range.
  const tight = j(P.mvScoreRange([scene('a', 'drink', 1, 0.3), scene('b', 'park', 1, 0.3)]));
  assert.ok(Math.abs(tight.lo - 0.275) < 1e-9 && Math.abs(tight.hi - 0.325) < 1e-9, 'widened: ' + JSON.stringify(tight));
  assert.deepEqual(j(P.mvScoreRange([])), j(P.MV_LOCAL_RANGE));
  const only = j(P.mvWithLocal([], [scored('u', 12, t => ({ sharp: 0.05 + t / 100 }))], false));
  assert.ok(only.every(c => c.score >= 0.25 - 1e-9 && c.score <= 0.35 + 1e-9), 'unanalysed-only: the default range');
  // A clip the check could not decode (fallback) gets evenly spaced windows (first from 0.5 s) at the bottom of the range.
  const fb = j(P.mvLocalCandidates([{ rid: 'f', duration: 4.2, scores: P.qsFallback({ rid: 'f', durationSeconds: 4.2 }, 0, null) }, { rid: 'g', duration: 3, scores: null }], range, true));
  assert.deepEqual(fb.map(c => [c.rid, c.t, c.score]), [['f', 1.2, 0.27], ['f', 2.2, 0.27], ['f', 3.2, 0.27], ['g', 1.2, 0.27], ['g', 2.2, 0.27]]);
  assert.ok(fb.every(c => !('motion' in c)), 'fallback windows have no motion');
}

// --- Beat punch: the windows' own motion gives the motion bonus and tag ------------------------------------------------
{
  const calm = scored('c', 12, () => ({ motion: 0.005 })), busy = scored('m', 12, () => ({ motion: 0.09 }));
  const off = j(P.mvLocalCandidates([calm, busy], P.MV_LOCAL_RANGE, false));
  const on = j(P.mvLocalCandidates([calm, busy], P.MV_LOCAL_RANGE, true));
  assert.equal(on.length, off.length);
  const moving = on.filter(c => c.rid === 'm'), still = on.filter(c => c.rid === 'c');
  assert.ok(moving.every(c => c.motion > 0.5), 'the moving clip ranks high');
  assert.ok(still.every(c => !(c.motion > 0.5)), 'the calm clip ranks low');
  // Every window gets the bonus by its motion rank; only ranks of 0.5 and up carry the `motion` tag (the motion opener).
  on.forEach((c, i) => {
    const d = c.score - off[i].score;
    if ('motion' in c) assert.ok(c.motion >= 0.5 && Math.abs(d - P.MV_MOTION_BONUS * c.motion) < 1e-9, 'bonus = MV_MOTION_BONUS x motion rank');
    else assert.ok(d > -1e-9 && d < P.MV_MOTION_BONUS * 0.5, 'untagged: a bonus below half');
  });
  assert.ok(still.every(c => !('motion' in c)), 'the calm clip carries no motion tag');
  // mvMotionBonus (scene motion hits) leaves local candidates alone, whatever the other clips' motion hits.
  const withHits = [scene('a', 'drink', 3, 0.3), scene('a', 'motion', 3, 0.2), scene('a', 'motion', 9, 0.3)].concat(on);
  const after = j(P.mvMotionBonus(withHits));
  assert.deepEqual(after.filter(c => c.rid === 'm' || c.rid === 'c'), on);
}

// --- Unanalysed-only Project builds; black, fade, flash and blurry windows are avoided ---------------------------------
{
  // Four clips: each fades in from black over its first 1.5 s; clip u1 flashes at 6 s, u2 is blurry from 8 s, u3 is dark
  // over 3-5 s.
  const bad = { u0: [], u1: [[6, 6.5, { flags: { flash: true } }]], u2: [[8, 20, { sharp: 0.004, flags: { blur: true } }]], u3: [[3, 5, { luma: 0.08, flags: { dark: true, black: true } }]] };
  const results = Object.keys(bad).map((rid, k) => scored(rid, 20 + k, t => {
    if (t < 1.5) return { luma: t / 3, flags: { fade: true, black: t < 1 } };
    const hit = bad[rid].find(([a, b]) => t >= a - 1e-9 && t < b - 1e-9);
    return hit ? hit[2] : { motion: 0.02 + ((t * 7) % 3) / 100 };
  }));
  for (const punch of [false, true]) {
    const cands = j(P.mvWithLocal([], results, punch));
    for (const c of cands) {
      const a = c.t - P.MV_LOCAL_WINDOW / 2, b = c.t + P.MV_LOCAL_WINDOW / 2;
      assert.ok(a >= 1.5 - 1e-9, 'no window over the fade-in: ' + JSON.stringify(c));
      for (const [x, y, o] of bad[c.rid]) if (o.flags.flash || o.flags.black) assert.ok(b <= x + 1e-9 || a >= y - 1e-9, 'no window over a flash or black frames: ' + JSON.stringify(c));
    }
    // Blurry windows rank below the clip's sharp ones.
    const u2 = cands.filter(c => c.rid === 'u2');
    const sharpBest = Math.max(...u2.filter(c => c.t + P.MV_LOCAL_WINDOW / 2 <= 8).map(c => c.score));
    assert.ok(u2.filter(c => c.t - P.MV_LOCAL_WINDOW / 2 >= 8).every(c => c.score < sharpBest), 'blurry windows rank lower');
    for (const pace of ['quick', 'relaxed', 'groove']) {
      const plan = planOf(cands, { pace });
      assert.equal(plan.ok, true, pace + ' builds from clips without analysis only');
      // The planner's own filler windows (every 0.5 s from 0.25 s, its last tier) are rare: local windows cover the
      // clips. Every shot, filler or not, starts after the fade-in here.
      assert.ok(plan.fillerShots <= 2, pace + ': filler shots ' + plan.fillerShots);
      for (const k of plan.picks) assert.ok(k.startSeconds >= 1.5 - 1e-9, pace + ': every shot starts after the fade-in: ' + JSON.stringify(k));
      // Fresh first: every clip is used before any clip is used twice, and uses differ by at most one.
      const uses = {};
      for (const k of plan.picks) uses[k.rid] = (uses[k.rid] || 0) + 1;
      assert.deepEqual(Object.keys(uses).sort(), ['u0', 'u1', 'u2', 'u3']);
      assert.ok(Math.max(...Object.values(uses)) - Math.min(...Object.values(uses)) <= 1, pace + ': uses spread evenly ' + JSON.stringify(uses));
      const firstFour = new Set(plan.picks.slice(0, 4).map(k => k.rid));
      assert.equal(firstFour.size, 4, pace + ': the first shots use four different clips');
    }
  }
  // With photos: the photo share holds (round(slots / 3) photo shots).
  const photos = Array.from({ length: 10 }, (_, i) => photo('p' + i));
  const withPhotos = planOf(j(P.mvWithLocal([], results, true)).concat(photos));
  assert.equal(withPhotos.ok, true);
  assert.equal(withPhotos.photoShots, Math.round(withPhotos.shots * P.MV_PHOTO_SHARE), 'photo share kept');
}

// --- Mixed Project: role order, fresh first, interleaving ---------------------------------------------------------------
{
  // Analysed clips a, b with drink/street hits; clips u, v without analysis.
  const hits = [];
  for (const [rid, role] of [['a', 'drink'], ['b', 'street']]) for (let t = 2; t < 19; t += 2.5) hits.push(scene(rid, role, t, 0.28 + (t % 3) / 100));
  const results = [scored('u', 16, t => ({ motion: 0.01 + t / 300 })), scored('v', 16, t => ({ motion: 0.06 - t / 400 }))];
  const cands = j(P.mvWithLocal(hits, results, false));
  // A drink slot: the analysed drink hit beats an unused clip without analysis... when both are unused.
  const drink = j(P.mvAllocate({ candidates: cands, slots: [{ index: 0, role: 'drink', seconds: 0.55 }], seed: '1' }));
  assert.equal(drink.picks[0].rid, 'a', 'a preferred-role scene hit comes first');
  // ...and an unused clip without analysis beats reusing an analysed one.
  const slots = Array.from({ length: 4 }, (_, i) => ({ index: i, role: 'drink', seconds: 0.55 }));
  const four = j(P.mvAllocate({ candidates: cands, slots, seed: '1' }));
  assert.deepEqual(four.picks.map(k => k.rid).sort(), ['a', 'b', 'u', 'v'], 'four slots, four different clips (fresh first)');
  const plan = planOf(cands);
  assert.equal(plan.ok, true);
  const uses = {};
  for (const k of plan.picks) uses[k.rid] = (uses[k.rid] || 0) + 1;
  assert.deepEqual(Object.keys(uses).sort(), ['a', 'b', 'u', 'v'], 'both kinds interleave');
  assert.ok(Math.max(...Object.values(uses)) - Math.min(...Object.values(uses)) <= 1, 'mixed: uses spread evenly ' + JSON.stringify(uses));
  // Every local pick starts at least 0.5 s in.
  for (const k of plan.picks) if (k.rid === 'u' || k.rid === 'v') assert.ok(k.startSeconds >= 0.5 - 1e-9);
}

console.log(JSON.stringify({ noAnalysis: 'ok' }));
