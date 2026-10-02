// plugins/summer-trip/tests/no-analysis.test.cjs: building without Selects analysis. Clips without analysis get local
// candidates from the quick-score block (kit tools/panel/quick-score.js, pasted verbatim into panel.tsx) through the
// planner's stLocalCandidates, or evenly spaced fallback candidates; analysed clips keep scene search. Runs the panel's
// planner, quick-score and st-panel blocks in node:vm, with the block's `io` seam standing in for the host.
'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const panel = fs.readFileSync(path.join(root, 'panel.tsx'), 'utf8');
const between = (a, b) => { const i = panel.indexOf(a), j = panel.indexOf(b); assert.ok(i >= 0 && j > i, 'markers ' + a); return panel.slice(i, j + b.length); };
const block = ['// st-planner:start', '// st-graphics:start', '// st-muffle:start', '// quick-score:start', '// st-panel:start']
  .map(a => between(a, a.replace(':start', ':end'))).join('\n');
const box = { console, setTimeout, clearTimeout, AbortController, TextDecoder, Uint8Array, Map, Set, Promise, Date, Math, JSON, Object, Number, String, Array, Error, Infinity, NaN, isFinite, parseFloat };
vm.createContext(box);
vm.runInContext(block + '\n;globalThis.X = { stLocalCandidates, stFallbackCandidates, stPseudoCandidates, stQuickId, stQuickResources, stQuickCandidates, stPlanBuild, stFillers, stWindow, quickScore, quickScoreAll, pickWindowsLocal, ST_LOCAL_MIN_START, ST_LOCAL_SCORE_MIN, ST_LOCAL_SCORE_MAX, ST_LOCAL_FALLBACK_SCORE, ST_LOCAL_ROLES, ST_QUICK_CONCURRENCY, ST_QUICK_BUDGET_MS, ST_QUERIES, ST_SOURCE_TAIL };', box);
const X = box.X;
const j = v => JSON.parse(JSON.stringify(v));
const clean = { black: false, fade: false, flash: false, blur: false, dark: false, bright: false, cut: false };

// A quickScore result: 0.5 s bins from 0.5 s to the end, with optional bad spans and a moving span.
function scores(rid, duration, o = {}) {
  const windows = [];
  for (let t = 0.5; t + 0.5 <= duration + 1e-9; t += 0.5) {
    const a = Math.round(t * 1000) / 1000, b = a + 0.5, inSpan = s => s && a < s[1] - 1e-9 && b > s[0] + 1e-9;
    windows.push({ start: a, end: b, motion: inSpan(o.moving) ? 0.08 : 0.004, sharp: inSpan(o.blurry) ? 0.004 : 0.12, luma: 0.45, clipped: 0,
      flags: { ...clean, fade: inSpan(o.fade), black: inSpan(o.black), flash: inSpan(o.flash), blur: inSpan(o.blurry) } });
  }
  return { rid, windows, sceneCuts: o.cuts || [], ms: 1, fallback: false, cached: false, duration };
}
const overlaps = (c, span) => { const need = X.ST_LOCAL_ROLES[c.role]; const a = Math.max(X.ST_LOCAL_MIN_START, c.t - need / 2); return a < span[1] && a + need > span[0]; };

// ---- 1. Candidates from quick scores: every role, black / fade / flash skipped, >= 0.5 s, on the 0.10-0.30 scale.
{
  const sc = scores('r1', 14, { fade: [0.5, 2], flash: [6, 6.5], moving: [9, 13] });
  const c = j(X.stLocalCandidates({ rid: 'r1', duration: 14 }, sc, X.pickWindowsLocal));
  assert.deepEqual([...new Set(c.map(x => x.role))].sort(), ['ending', 'grid', 'montage', 'opener', 'place']);
  for (const x of c) {
    assert.equal(x.rid, 'r1'); assert.equal(x.sourceDuration, 14); assert.equal(x.minStart, 0.5); assert.equal(x.local, 'score');
    assert.ok(x.score >= X.ST_LOCAL_SCORE_MIN - 1e-9 && x.score <= X.ST_LOCAL_SCORE_MAX + 1e-9, 'normalised score ' + x.score);
    assert.ok(x.t - X.ST_LOCAL_ROLES[x.role] / 2 >= 0.5 - 1e-9, 'window starts at 0.5 s or later: ' + JSON.stringify(x));
    assert.ok(!overlaps(x, [0.5, 2]), 'the fade-in is skipped: ' + JSON.stringify(x));
    assert.ok(!overlaps(x, [6, 6.5]), 'the flash is skipped: ' + JSON.stringify(x));
  }
  assert.ok(c.filter(x => x.role === 'opener').length <= 4, 'at most 4 per role');
  const best = role => c.filter(x => x.role === role).sort((p, q) => q.score - p.score)[0];
  assert.ok(best('montage').t > 8.5, 'the montage prefers the moving part: ' + best('montage').t);
  // A scene cut inside a window is avoided too.
  const cut = j(X.stLocalCandidates({ rid: 'r2', duration: 10 }, scores('r2', 10, { cuts: [5] }), X.pickWindowsLocal));
  for (const x of cut) { const need = X.ST_LOCAL_ROLES[x.role], a = Math.max(0.5, x.t - need / 2); assert.ok(!(a + 0.13 < 5 && a + need - 0.13 > 5), 'no cut inside: ' + JSON.stringify(x)); }
  // Every planner window from these candidates honours minStart (stWindow clamps the start).
  for (const x of c) { const w = X.stWindow(x.t, 60, 30, 14, x.minStart); if (w) assert.ok(w.start >= 0.5 - 1e-9); }
  assert.deepEqual(j(X.stWindow(0.2, 30, 30, 10, 0.5)), { start: 0.5, end: 1.5 }, 'a window never starts before minStart');
  assert.equal(X.stWindow(1, 60, 30, 2.6, 0.5), null, '0.5 + 2 + 0.15 s does not fit 2.6 s');
  // Fillers of a local source carry its minStart; others stay as they were.
  const fill = j(X.stFillers([{ rid: 'a', role: 'opener', t: 3, score: 0.2, sourceDuration: 6, minStart: 0.5 }, { rid: 'b', role: 'town', t: 3, score: 0.4, sourceDuration: 6 }]));
  assert.ok(fill.filter(f => f.rid === 'a').every(f => f.minStart === 0.5) && fill.filter(f => f.rid === 'b').every(f => !('minStart' in f)));
}

// ---- 2. Fallback: no ffmpeg (no io), a failed decode or the block's fallback -> evenly spaced low-score candidates.
(async () => {
  const none = await X.quickScore({ rid: 'P_r9', path: '/v/x.mov', durationSeconds: 12 }, { io: {}, dataDir: '/data' });
  assert.equal(none.fallback, true, 'without runFFmpeg the block falls back');
  const fb = j(X.stLocalCandidates({ rid: 'r9', duration: 12 }, none, X.pickWindowsLocal));
  assert.ok(fb.length >= 5 * 6 - 1 && fb.every(x => x.score === X.ST_LOCAL_FALLBACK_SCORE && x.local === 'fallback' && x.minStart === 0.5));
  assert.ok(fb.every(x => x.t - X.ST_LOCAL_ROLES[x.role] / 2 >= 0.5 - 1e-9), 'fallback windows start at 0.5 s or later');
  assert.ok(X.ST_LOCAL_FALLBACK_SCORE < X.ST_LOCAL_SCORE_MIN, 'fallback ranks below every scored window');
  assert.deepEqual(j(X.stLocalCandidates({ rid: 'r9', duration: 12 }, null, X.pickWindowsLocal)), fb, 'no result: the same fallback');
  assert.deepEqual(j(X.stLocalCandidates({ rid: 'r9', duration: 12 }, scores('r9', 12), null)), fb, 'no picker: the same fallback');
  assert.deepEqual(j(X.stLocalCandidates({ rid: 'r9', duration: 12 }, scores('r9', 12), () => { throw Error('x'); })), fb, 'a throwing picker: the same fallback');
  // The picker's answer is read tolerantly: t instead of start/end, value instead of score, any scale clamped.
  const odd = j(X.stLocalCandidates({ rid: 'o', duration: 12 }, scores('o', 12), () => [{ t: 5, value: 7 }, { start: 8, end: 9.5, quality: -1 }, null, {}]));
  assert.ok(odd.some(x => x.t === 5 && Math.abs(x.score - X.ST_LOCAL_SCORE_MAX) < 1e-9) && odd.some(x => x.t === 8.75 && Math.abs(x.score - X.ST_LOCAL_SCORE_MIN) < 1e-9));
  // A window the picker flags as bad (only when nothing clean fits) counts half.
  const bad = j(X.stLocalCandidates({ rid: 'b', duration: 12 }, scores('b', 12), () => [{ start: 2, end: 3, score: 1, flags: { bad: true } }]));
  assert.ok(Math.abs(bad[0].score - (X.ST_LOCAL_SCORE_MIN + 0.5 * (X.ST_LOCAL_SCORE_MAX - X.ST_LOCAL_SCORE_MIN))) < 1e-9);

  // ---- 3. The panel path: quickScoreAll through the block's io seam (argument arrays, no shell), cache, progress.
  const calls = [], files = {}, W = 64, H = 36;
  let mtime = 1000;
  const frames = (seconds) => { const n = Math.round(seconds * 8), out = new Uint8Array(n * W * H); for (let i = 0; i < n; i++) for (let k = 0; k < W * H; k++) out[i * W * H + k] = ((k + i * 3) % 7) * 30 + 20; return out; };
  const io = {
    runFFmpeg: async (args) => { calls.push(args); files[args[args.length - 1]] = frames(Number(args[args.indexOf('-t') + 1])); return { stdout: '', stderr: '' }; },
    readBytes: async (p) => files[p], remove: async (p) => { delete files[p]; }, join: (...p) => p.join('/'), mkdir: () => {},
    mtimeMs: () => mtime, readText: async (p) => { if (!(p in files)) throw Error('none'); return files[p]; }, writeText: async (p, t) => { files[p] = t; },
  };
  const inv = [{ rid: 'r0', duration: 9, path: '/Volumes/Trip/My Clips/beach (1).mov', hasAnalysis: false }, { rid: 'r1', duration: 7, path: 'D:\\Trip\\clip.mp4', hasAnalysis: false }];
  const res = j(X.stQuickResources('proj-1', inv));
  assert.deepEqual(res, [{ rid: 'proj-1_r0', path: '/Volumes/Trip/My Clips/beach (1).mov', durationSeconds: 9 }, { rid: 'proj-1_r1', path: 'D:\\Trip\\clip.mp4', durationSeconds: 7 }]);
  // Cache key: the block's per-id file, so ids are qualified with the Project (aliases repeat across Projects) and ASCII.
  assert.equal(X.stQuickId('a/b c', 'r3'), 'a_b_c_r3');
  assert.notEqual(X.stQuickId('p1', 'r0'), X.stQuickId('p2', 'r0'));
  const seen = [];
  const results = await X.quickScoreAll(X.stQuickResources('proj-1', inv), { concurrency: X.ST_QUICK_CONCURRENCY, budgetMs: X.ST_QUICK_BUDGET_MS, io, dataDir: '/data', onProgress: p => seen.push(p.done) });
  assert.deepEqual(seen, [1, 2], 'progress after each clip');
  assert.equal(calls.length, 2);
  for (const args of calls) {
    assert.ok(Array.isArray(args) && args.every(a => typeof a === 'string'), 'ffmpeg gets an argument array');
    assert.ok(!args.some(a => /^['"]|['"]$/.test(a)), 'no shell quoting');
  }
  assert.ok(calls.some(a => a.includes('/Volumes/Trip/My Clips/beach (1).mov')) && calls.some(a => a.includes('D:\\Trip\\clip.mp4')), 'paths passed as given');
  assert.ok(Object.keys(files).some(f => f === '/data/quick-score/proj-1_r0.json'), 'cached per qualified id in the data folder');
  const qc = j(X.stQuickCandidates('proj-1', inv, results, X.pickWindowsLocal));
  assert.deepEqual(qc.scored, ['r0', 'r1']); assert.deepEqual(qc.rough, []);
  assert.ok(qc.list.every(c => (c.rid === 'r0' || c.rid === 'r1') && c.local === 'score'));
  // Second run: read from the cache (no decode); a changed modification time decodes again.
  calls.length = 0;
  const again = await X.quickScoreAll(X.stQuickResources('proj-1', inv), { io, dataDir: '/data' });
  assert.equal(calls.length, 0); assert.ok([...again.values()].every(r => r.cached));
  mtime = 2000;
  await X.quickScoreAll(X.stQuickResources('proj-1', inv), { io, dataDir: '/data' });
  assert.equal(calls.length, 2, 'a new modification time is a new cache key');
  // Budget gone: the fallback, retried by the next Build (rough).
  const late = await X.quickScoreAll(X.stQuickResources('proj-2', inv), { io, dataDir: '/data', budgetMs: 0 });
  assert.deepEqual(j(X.stQuickCandidates('proj-2', inv, late, X.pickWindowsLocal)).rough, ['r0', 'r1']);
  // Cancelled (Project switch): rejects, so the build stops.
  const ac = new AbortController(); ac.abort();
  await assert.rejects(X.quickScoreAll(X.stQuickResources('proj-1', inv), { io, dataDir: '/data', signal: ac.signal }), /cancelled/);
  // Missing results for a clip: rough.
  assert.deepEqual(j(X.stQuickCandidates('proj-1', inv, new Map(), X.pickWindowsLocal)).rough, ['r0', 'r1']);

  // ---- 4. Planner end to end on a Project without analysis.
  const opts = (candidates, seed = 1, n = 8) => ({ candidates, bpm: 120, fps: 30, montageShots: n, seed: String(seed), sectionStart: 0, bundled: true });
  const local = (rid, d, o) => X.stLocalCandidates({ rid, duration: d }, scores(rid, d, o), X.pickWindowsLocal);
  const vids = Array.from({ length: 7 }, (_, i) => local('u' + i, 10 + i, i % 2 ? { moving: [4, 8] } : { fade: [0.5, 1.5] }));
  const photos = ['p0', 'p1', 'p2'].map(rid => ({ rid, kind: 'photo' }));
  for (const seed of [1, 2, 3]) {
    const plan = j(X.stPlanBuild(opts([].concat(...vids, photos), seed)));
    assert.ok(plan.ok, plan.disabledReason);
    assert.ok(plan.distinct >= 6);
    const all = plan.picks.main.concat(plan.picks.grid);
    const videos = all.filter(p => p.kind === 'video');
    assert.ok(videos.every(p => p.startSeconds >= 0.5 - 1e-9), 'every window starts at 0.5 s or later');
    // Opener: one clip long enough for 9.5 beats (4.75 s) after 0.5 s; place + 4 grid panels: six different clips.
    const opener = plan.picks.main[0];
    assert.equal(opener.kind, 'video'); assert.ok(Math.abs(opener.endSeconds - opener.startSeconds - 4.75) < 0.04);
    const fixed = [plan.picks.main[0], plan.picks.main[1]].concat(plan.picks.grid).map(p => p.rid);
    assert.equal(new Set(fixed).size, 6, 'opener, place and grid A-D are six different clips');
    // Fresh-first: every clip and photo before any repeat (17 slots, 10 sources).
    assert.equal(new Set(all.map(p => p.rid)).size, 10, 'every clip and photo is used');
    assert.ok(plan.photoShots >= 1, 'photos keep their share');
    for (let i = 1; i < plan.picks.main.length; i++) assert.notEqual(plan.picks.main[i].rid, plan.picks.main[i - 1].rid, 'no clip twice in a row');
  }
  // Fewer than six clips and photos: the same message as with analysis.
  const few = j(X.stPlanBuild(opts([].concat(...vids.slice(0, 4), photos.slice(0, 1)))));
  assert.equal(few.ok, false); assert.match(few.disabledReason, /Needs at least 6 different clips or photos \(found 5\)/);
  // A clip too short for the opener after 0.5 s (0.5 + 4.75 + 0.15 = 5.4 s) never opens.
  const shortOnes = [local('s0', 5.3), local('s1', 5.3), local('s2', 5.3), local('s3', 5.3), local('s4', 5.3), local('L', 12)];
  const sp = j(X.stPlanBuild(opts([].concat(...shortOnes), 1, 4)));
  assert.ok(sp.ok, sp.disabledReason); assert.equal(sp.picks.main[0].rid, 'L');
  // Fallback only (no ffmpeg anywhere): still builds.
  const fbPlan = j(X.stPlanBuild(opts([].concat(...Array.from({ length: 7 }, (_, i) => X.stFallbackCandidates({ rid: 'f' + i, duration: 12 }))))));
  assert.ok(fbPlan.ok && fbPlan.picks.main.concat(fbPlan.picks.grid).every(p => p.startSeconds >= 0.5 - 1e-9));

  // ---- 5. Mixed Project: analysed scene-search hits and local candidates on one scale.
  const roles = Object.keys(X.ST_QUERIES);
  const analysed = Array.from({ length: 6 }, (_, i) => roles.map((role, k) => ({ rid: 'a' + i, role, t: 3 + (k % 6) * 2, score: 0.42 + 0.01 * ((i + k) % 5), sourceDuration: 20 }))).flat();
  const unanalysed = Array.from({ length: 6 }, (_, i) => local('u' + i, 15, { moving: [5, 10] })).flat();
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const plan = j(X.stPlanBuild(opts(analysed.concat(unanalysed), seed)));
    assert.ok(plan.ok, plan.disabledReason);
    // Role ties go to analysed semantic hits: a strong opener hit (0.42+) beats the best local window (<= 0.30) whatever the seed.
    assert.match(plan.picks.main[0].rid, /^a/, 'seed ' + seed + ': the opener is an analysed clip');
    // Fresh-first across both kinds: all 12 clips are used (17 slots).
    assert.equal(new Set(plan.picks.main.concat(plan.picks.grid).map(p => p.rid)).size, 12, 'seed ' + seed + ': every clip is used');
    assert.ok(plan.picks.main.concat(plan.picks.grid).filter(p => /^u/.test(p.rid)).every(p => p.startSeconds >= 0.5 - 1e-9));
  }
  // Normalisation sits inside the live search range: local 0.10-0.30, search hits about 0.2-0.56, fillers -2.
  assert.ok(X.ST_LOCAL_SCORE_MIN > -2 && X.ST_LOCAL_SCORE_MAX < 0.35 && X.ST_LOCAL_SCORE_MAX > 0.2);

  // ---- 6. Template path (Clip highlights): it hands every clip to search.js, which skips clips without analysis, and
  // plans the unsearched ones with stPseudoCandidates: evenly spaced local candidates for clips without analysis.
  const invT = [{ rid: 'r0', duration: 12, hasAnalysis: false }, { rid: 'r1', duration: 30, hasAnalysis: true }];
  const pc = j(X.stPseudoCandidates(invT));
  assert.deepEqual(pc.filter(c => c.rid === 'r1'), [{ rid: 'r1', role: 'filler', t: 15, score: -2, sourceDuration: 30 }], 'analysed: the one pseudo candidate as before');
  assert.deepEqual(pc.filter(c => c.rid === 'r0'), j(X.stFallbackCandidates({ rid: 'r0', duration: 12 })));
  const tplPlan = j(X.stPlanBuild(opts(X.stPseudoCandidates(Array.from({ length: 6 }, (_, i) => ({ rid: 'r' + i, duration: 10, hasAnalysis: false }))), 1, 4)));
  assert.ok(tplPlan.ok, tplPlan.disabledReason);

  console.log(JSON.stringify({ noAnalysis: 'ok' }));
})().catch(e => { console.error(e); process.exit(1); });
