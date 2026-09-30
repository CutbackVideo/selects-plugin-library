// plugins/the-end-credits/tests/allocate.test.cjs
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const box = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON, Date };
vm.createContext(box);
vm.runInContext(fs.readFileSync(path.join(root, 'planner.js'), 'utf8') + ';globalThis.P={tecAllocate,tecPlanBuild,tecFillers,tecHash,tecTimeline,tecFootageSlots,tecPhotoMotions,tecShotMotions,tecParseMotion,tecMotionStats,tecMotionAt,tecMotionPool,tecMotionScore,tecMotionStill,' +
  'TEC_PHOTO_MOTIONS,TEC_SEARCH_ROLES,TEC_MOTION_WEIGHT,TEC_MOTION_FILTER};', box);
const P = box.P, j = v => JSON.parse(JSON.stringify(v));
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, (msg || 'near') + ': ' + a + ' vs ' + b);
let checks = 0;
const t = (name, fn) => { fn(); checks++; };
const p62 = 240 / 62;
const roles = ['wide', 'sunset', 'water', 'street', 'architecture', 'people'];
// 10 sources x 6 roles x 2 hits, each source 40 s long.
const rich = [];
for (let r = 0; r < 10; r++) for (const role of roles) for (const at of [8, 28]) rich.push({ rid: 'r' + r, role, t: at + r * 0.1, score: 0.5 + ((r * 7 + roles.indexOf(role)) % 10) / 20, sourceDuration: 40 });
const noAdjacent = picks => { for (let i = 1; i < picks.length; i++) if (picks[i] && picks[i - 1]) assert.notEqual(picks[i].rid, picks[i - 1].rid, 'adjacent repeat at ' + i); };
const noOverlap = picks => {
  const bySource = {};
  for (const p of picks) if (p && p.kind === 'video') (bySource[p.rid] = bySource[p.rid] || []).push([p.startSeconds, p.endSeconds]);
  for (const list of Object.values(bySource)) {
    list.sort((x, y) => x[0] - y[0]);
    for (let i = 1; i < list.length; i++) assert.ok(list[i][0] >= list[i - 1][1], 'no overlap');
  }
};

t('Classic Standard: 7 shots, windows fit their slots', () => {
  const a = j(P.tecPlanBuild({ layout: 'classic', N: 7, P: p62, candidates: rich, seed: 's1' }));
  assert.equal(a.ok, true); assert.equal(a.N, 7); assert.equal(a.shrunk, false);
  assert.equal(a.picks.length, 7); assert.equal(a.visibleShots, 7); assert.equal(a.needed, 4);
  assert.deepEqual(a.picks.map(p => p.slot), [1, 2, 3, 4, 5, 6, 7], 'the opening generator slot takes no footage');
  a.picks.forEach(p => {
    const slot = a.timeline.slots[p.slot];
    assert.ok(p.startSeconds >= 0 && p.endSeconds <= 40 - 0.05 + 1e-9);
    assert.ok(Math.abs((p.endSeconds - p.startSeconds) - slot.seconds) < 1e-9);
  });
  noAdjacent(a.picks); noOverlap(a.picks);
  // Deterministic per seed; another seed changes something.
  assert.deepEqual(j(P.tecPlanBuild({ layout: 'classic', N: 7, P: p62, candidates: rich, seed: 's1' })).picks, a.picks);
  assert.notDeepEqual(j(P.tecPlanBuild({ layout: 'classic', N: 7, P: p62, candidates: rich, seed: 's2' })).picks, a.picks);
});

t('Full frame: shot 0 plus N shots', () => {
  const f = j(P.tecPlanBuild({ layout: 'full', N: 5, P: 3.9, candidates: rich, seed: 's1' }));
  assert.equal(f.ok, true); assert.equal(f.picks.length, 6); assert.equal(f.visibleShots, 6); assert.equal(f.needed, 5);
  assert.equal(f.picks[0].slot, 0); assert.equal(f.picks[0].kind, 'video');
  assert.ok(Math.abs(f.picks[0].endSeconds - f.picks[0].startSeconds - 5.1) < 1e-9);
  noAdjacent(f.picks); noOverlap(f.picks);
});

t('the preferred role wins; the ending prefers sunset/water/wide', () => {
  const pref = j(P.tecAllocate({ candidates: [{ rid: 'a', role: 'street', t: 5, score: 1, sourceDuration: 30 }, { rid: 'b', role: 'sunset', t: 5, score: 0, sourceDuration: 30 }],
    slots: [{ index: 1, role: 'ending', seconds: 4.4 }], seed: 'x' }));
  assert.equal(pref.picks[0].rid, 'b');
  const alloc = j(P.tecAllocate({ candidates: [{ rid: 'a', role: 'filler', t: 5, score: -2, sourceDuration: 30 }], slots: [{ index: 1, role: 'wide', seconds: 3.9 }], seed: 'x' }));
  assert.equal(alloc.fillerShots, 1);
  const bad = j(P.tecAllocate({ candidates: [{ rid: 'a', role: 'wide', t: NaN, score: 1, sourceDuration: 30 }, { rid: 'b', role: 'wide', t: 5, score: Infinity, sourceDuration: 30 }],
    slots: [{ index: 1, role: 'wide', seconds: 3.9 }], seed: 'x' }));
  assert.equal(bad.filled, 0); assert.equal(bad.missing, 1);
});

t('adjacency is strict: a single source never fills two shots in a row', () => {
  const one = [{ rid: 'solo', role: 'wide', t: 10, score: 1, sourceDuration: 120 }];
  const r = j(P.tecAllocate({ candidates: one.concat(P.tecFillers(one)), slots: [{ index: 1, role: 'wide', seconds: 3.9 }, { index: 2, role: 'street', seconds: 3.9 }], seed: 'x' }));
  assert.equal(r.filled, 1); assert.equal(r.missing, 1); assert.equal(r.picks[1], null);
  // Two long sources alternate (a long clip is reused non-adjacently, never overlapping).
  const two = [{ rid: 'a', role: 'wide', t: 10, score: 1, sourceDuration: 120 }, { rid: 'b', role: 'water', t: 10, score: 1, sourceDuration: 120 }];
  const plan = j(P.tecPlanBuild({ layout: 'classic', N: 7, P: 3.9, candidates: two, seed: 's1' }));
  assert.equal(plan.ok, true); assert.equal(plan.N, 7);
  noAdjacent(plan.picks); noOverlap(plan.picks);
  // Only one source: nothing can alternate, so the build fails even though the clip is long.
  const solo = j(P.tecPlanBuild({ layout: 'classic', N: 7, P: 3.9, candidates: one, seed: 's1' }));
  assert.equal(solo.ok, false); assert.equal(solo.needed, 4);
});

t('footage shrink: N drops to what fits, minimum 4 (R5)', () => {
  // Five 5 s clips: each fits one 3.9 s window only (no second non-overlapping window), so 5 shots at most.
  const five = [];
  for (let r = 0; r < 5; r++) five.push({ rid: 'c' + r, role: roles[r], t: 2.5, score: 0.6, sourceDuration: 5 });
  const s = j(P.tecPlanBuild({ layout: 'classic', N: 10, P: 3.9, candidates: five, seed: 's1' }));
  assert.equal(s.ok, true); assert.equal(s.N, 5, 'five clips, one window each (the 4.4 s last shot still fits a 5 s clip)');
  assert.equal(s.shrunk, true); assert.equal(s.requestedN, 10);
  assert.ok(s.picks.every(Boolean)); noAdjacent(s.picks);
  // Deterministic.
  assert.deepEqual(j(P.tecPlanBuild({ layout: 'classic', N: 10, P: 3.9, candidates: five, seed: 's1' })), s);
  // Three clips cannot give 4 non-overlapping, non-adjacent shots: Build is disabled (needs 4, found 3).
  const three = five.slice(0, 3);
  const f = j(P.tecPlanBuild({ layout: 'classic', N: 7, P: 3.9, candidates: three, seed: 's1' }));
  assert.equal(f.ok, false); assert.equal(f.needed, 4); assert.equal(f.usableShots, 3);
  // Full frame needs 4 + 1.
  const ff = j(P.tecPlanBuild({ layout: 'full', N: 7, P: 3.9, candidates: five.map(c => ({ ...c, sourceDuration: 6 })), seed: 's1' }));
  assert.equal(ff.ok, true); assert.equal(ff.N, 4); assert.equal(ff.visibleShots, 5);
  const ffBad = j(P.tecPlanBuild({ layout: 'full', N: 7, P: 3.9, candidates: five.slice(0, 4).map(c => ({ ...c, sourceDuration: 6 })), seed: 's1' }));
  assert.equal(ffBad.ok, false); assert.equal(ffBad.needed, 5);
});

t('photos: about 1/3, at most 2 in a row, not first/last, never the 5.1 s shot 0', () => {
  const photos = Array.from({ length: 12 }, (_, i) => ({ rid: 'ph' + String(i).padStart(2, '0'), kind: 'photo' }));
  const a = j(P.tecPlanBuild({ layout: 'classic', N: 10, P: p62, candidates: rich.concat(photos), seed: 's1' }));
  assert.equal(a.ok, true);
  assert.equal(a.photoShots, Math.round(10 / 3));
  assert.equal(a.picks[0].kind, 'video'); assert.equal(a.picks[9].kind, 'video');
  let run = 0;
  for (const p of a.picks) { run = p.kind === 'photo' ? run + 1 : 0; assert.ok(run <= 2); }
  a.picks.filter(p => p.kind === 'photo').forEach(p => assert.ok(p.holdSeconds <= 5));
  assert.equal(new Set(a.picks.filter(p => p.kind === 'photo').map(p => p.rid)).size, a.photoShots, 'each photo once');
  // Full frame shot 0 lasts 5.1 s: never a photo, even in a photo-heavy project.
  const f = j(P.tecPlanBuild({ layout: 'full', N: 5, P: 3.9, candidates: rich.slice(0, 24).concat(photos), seed: 's3' }));
  assert.equal(f.ok, true); assert.equal(f.picks[0].kind, 'video');
  // Photos only: Classic builds (each shot <= 5 s); Full frame cannot fill the 5.1 s shot 0.
  const onlyPhotos = j(P.tecPlanBuild({ layout: 'classic', N: 5, P: 3.9, candidates: photos, seed: 's1' }));
  assert.equal(onlyPhotos.ok, true); assert.equal(onlyPhotos.photoShots, 5); assert.equal(onlyPhotos.photoRunRelaxed, true);
  assert.equal(j(P.tecPlanBuild({ layout: 'full', N: 5, P: 3.9, candidates: photos, seed: 's1' })).ok, false);
  // photoShare 0 turns photo slots off: with enough video, no photo is used.
  assert.equal(j(P.tecPlanBuild({ layout: 'classic', N: 7, P: p62, candidates: rich.concat(photos), seed: 's1', photoShare: 0 })).photoShots, 0);
  // First and last prefer video over fillers too: a photo only when no video fits at all.
  const firstLast = j(P.tecAllocate({ candidates: [{ rid: 'v', role: 'filler', t: 5, score: -2, sourceDuration: 30 }, { rid: 'p', kind: 'photo' }],
    slots: [{ index: 1, role: 'wide', seconds: 3.9, prefersVideo: true }], seed: 'x', photoShare: 1 }));
  assert.equal(firstLast.picks[0].kind, 'video');
});

t('footage slots: first and last prefer video', () => {
  const c = j(P.tecFootageSlots(P.tecTimeline({ layout: 'classic', N: 5, P: 3.9 })));
  assert.deepEqual(c.map(s => s.index), [1, 2, 3, 4, 5]);
  assert.deepEqual(c.map(s => s.prefersVideo), [true, false, false, false, true]);
  const f = j(P.tecFootageSlots(P.tecTimeline({ layout: 'full', N: 5, P: 3.9 })));
  assert.deepEqual(f.map(s => s.index), [0, 1, 2, 3, 4, 5]);
  assert.equal(f[0].role, 'opening-wide'); assert.equal(f[0].prefersVideo, true);
});

t('fillers', () => {
  const f = j(P.tecFillers([{ rid: 'b', role: 'wide', t: 1, score: 1, sourceDuration: 2 }, { rid: 'a', role: 'wide', t: 1, score: 1, sourceDuration: 1.5 }, { rid: 'p', kind: 'photo' }]));
  assert.deepEqual(f.map(x => x.rid + '@' + x.t), ['a@0.25', 'a@0.75', 'a@1.25', 'b@0.25', 'b@0.75', 'b@1.25', 'b@1.75']);
  assert.ok(f.every(x => x.role === 'filler' && x.score === -2));
});

t('photo motions: 16:9 window axis, strength 0.6, no family twice in a row', () => {
  const picks = [null, { rid: 'port', kind: 'photo' }, { rid: 'four3', kind: 'photo' }, { rid: 'v', kind: 'video' }, { rid: 'pano', kind: 'photo' }, { rid: 'unknown', kind: 'photo' }];
  const sizes = { port: { width: 1080, height: 1920 }, four3: { width: 4000, height: 3000 }, pano: { width: 4000, height: 1500 } };
  const m = j(P.tecPhotoMotions(picks, 's1', sizes));
  assert.equal(m.length, 6); assert.equal(m[0], null); assert.equal(m[3], null);
  assert.equal(m[1].axis, 'y'); assert.equal(m[2].axis, 'y', 'a 4:3 photo cover-cropped into 16:9 has room on y');
  assert.equal(m[4].axis, 'x', 'wider than 16:9: room on x'); assert.equal(m[5].axis, 'y');
  for (const e of m.filter(Boolean)) { assert.equal(e.strength, 0.6); assert.ok(P.TEC_PHOTO_MOTIONS.includes(e.motion)); assert.ok(e.direction === 1 || e.direction === -1); }
  const fam = x => (x.motion.startsWith('drift-') ? 'drift' : x.motion);
  const many = j(P.tecPhotoMotions(Array.from({ length: 30 }, (_, i) => ({ rid: 'p' + i, kind: 'photo' })), 'seed', {}));
  for (let i = 1; i < many.length; i++) assert.notEqual(fam(many[i]), fam(many[i - 1]));
  // Drift directions alternate per axis.
  const drifts = many.filter(x => x.motion.startsWith('drift-'));
  for (let i = 1; i < drifts.length; i++) assert.equal(drifts[i].direction, -drifts[i - 1].direction);
  assert.deepEqual(j(P.tecPhotoMotions(picks, 's1', sizes)), m);
});

// Motion curves at 4 samples/s: a constant level, optionally with spikes at given seconds.
const curve = (dur, level, spikes = {}) => {
  const times = [], values = [];
  for (let k = 1; k / 4 <= dur + 1e-9; k++) { const t = k / 4; times.push(t); values.push(spikes[t] != null ? spikes[t] : typeof level === 'function' ? level(t) : level); }
  return { times, values };
};

t('motion: ffmpeg metadata parse, spike-capped window stats', () => {
  assert.ok(P.TEC_MOTION_FILTER.startsWith('fps=4,scale=64:-2,format=gray,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file='));
  const text = 'frame:0    pts:2       pts_time:0.5\nlavfi.signalstats.YAVG=2.5\nframe:1 pts:1 pts_time:0.25\nlavfi.signalstats.YAVG=1.5\nframe:2 pts:3 pts_time:0.75\n';
  assert.deepEqual(j(P.tecParseMotion(text)), { times: [0.25, 0.5], values: [1.5, 2.5] }, 'sorted, a frame without a value is dropped');
  assert.equal(P.tecParseMotion(''), null);
  assert.equal(P.tecParseMotion('garbage'), null);
  // A flash in a still window is capped (3 x the median) and flagged; the mean stays low.
  const still = curve(10, 0.3, { 5: 40 });
  const st = j(P.tecMotionStats(still, 3, 4));
  assert.equal(st.n, 16); assert.equal(st.median, 0.3); assert.equal(st.peak, 40); assert.equal(st.flash, true);
  assert.ok(Math.abs(st.mean - (15 * 0.3 + 0.9) / 16) < 1e-12, 'capped mean ' + st.mean);
  assert.equal(P.tecMotionStats(still, 6, 3).flash, false, 'the flash is outside this window');
  assert.equal(P.tecMotionAt(still, 20, 3), null, 'no samples: unknown');
  assert.equal(P.tecMotionAt(null, 0, 3), null);
  near(P.tecMotionAt(curve(10, 4), 1, 3.9), 4, 1e-12);
});

t('motion: pool quartiles, log score, flash / shake penalty, still threshold', () => {
  const pool = j(P.tecMotionPool({ a: curve(10, 0.2), b: curve(10, 1), c: curve(10, 5), d: curve(10, 12) }));
  assert.ok(pool.q25 >= 0.2 && pool.q25 <= 1 && pool.q75 >= 5 && pool.q75 <= 12, JSON.stringify(pool));
  assert.equal(P.tecMotionPool({}), null);
  const score = m => P.tecMotionScore({ mean: m, flash: false }, pool);
  assert.equal(score(0.1), 0); assert.equal(score(50 / 2), 1, 'capped at 1 above the upper quartile');
  assert.ok(score(2) > 0.2 && score(2) < 0.8, 'the middle scores in between: ' + score(2));
  for (let m = 0.1; m < 20; m *= 1.3) assert.ok(score(m * 1.3) >= score(m), 'monotonic');
  assert.equal(P.tecMotionScore({ mean: 2, flash: true }, pool), -1, 'a flash or cut is penalised');
  assert.equal(P.tecMotionScore({ mean: 45, flash: false }, pool), -1, 'shake is penalised');
  assert.equal(P.tecMotionScore(null, pool), 0); assert.equal(P.tecMotionScore({ mean: 3 }, null), 0, 'no data: neutral');
  assert.equal(P.tecMotionStill(null, pool), true, 'unknown counts as still');
  assert.equal(P.tecMotionStill(0.4, pool), true); assert.equal(P.tecMotionStill(8, pool), false);
  assert.equal(P.tecMotionStill(0.9, { q33: 1.2 }), true, 'lower third of the pool'); assert.equal(P.tecMotionStill(1.5, { q33: 1.2 }), false);
});

t('motion scoring: a moving window beats a static one at an equal scene score; scene relevance still wins', () => {
  // Two sources with the same role and score; one still, one moving.
  const cands = [{ rid: 'a-still', role: 'wide', t: 10, score: 0.5, sourceDuration: 20 }, { rid: 'b-moving', role: 'wide', t: 10, score: 0.5, sourceDuration: 20 }];
  const motion = { 'a-still': curve(20, 0.2), 'b-moving': curve(20, 6) };
  const slots = [{ index: 1, role: 'wide', seconds: 3.9 }];
  const slot1 = seed => j(P.tecAllocate({ candidates: cands, slots, seed })).picks[0].rid;
  const pool = j(P.tecMotionPool(motion));
  const withMotion = seed => j(P.tecAllocate({ candidates: cands, slots, seed, motion: { curves: motion, pool } })).picks[0];
  for (const seed of ['s1', 's2', 's3', 's4', 's5', 's6']) {
    const pk = withMotion(seed);
    assert.equal(pk.rid, 'b-moving', 'moving wins with seed ' + seed + ' (without motion: ' + slot1(seed) + ')');
    assert.equal(pk.motion, 6, 'the pick records its window motion');
  }
  // A clearly better scene match (+0.15, one role-rank step) still beats motion.
  const better = [{ ...cands[0], score: 0.65 }, cands[1]];
  for (const seed of ['s1', 's2', 's3']) assert.equal(j(P.tecAllocate({ candidates: better, slots, seed, motion: { curves: motion, pool } })).picks[0].rid, 'a-still', 'scene relevance wins');
  // Inside one clip, the moving part is preferred over the still part; a window with a flash is avoided.
  const one = [{ rid: 'c', role: 'wide', t: 4, score: 0.5, sourceDuration: 30 }, { rid: 'c', role: 'wide', t: 24, score: 0.5, sourceDuration: 30 }];
  const cm = { c: curve(30, tt => (tt > 20 ? 5 : 0.3)), other: curve(30, 2) };
  const cp = j(P.tecMotionPool(cm));
  assert.equal(j(P.tecAllocate({ candidates: one, slots, seed: 's1', motion: { curves: cm, pool: cp } })).picks[0].startSeconds, 24 - 3.9 / 2);
  const flashy = { c: curve(30, 4, { 23: 60 }), other: curve(30, 2) };
  assert.equal(j(P.tecAllocate({ candidates: one, slots, seed: 's1', motion: { curves: flashy, pool: j(P.tecMotionPool(flashy)) } })).picks[0].startSeconds, 4 - 3.9 / 2, 'the flash window is avoided');
  // tecPlanBuild wires it through (and without motion the picks carry no motion key, as before).
  const plan = j(P.tecPlanBuild({ layout: 'classic', N: 4, P: 3.9, candidates: rich, seed: 's1', motion: { r0: curve(40, 0.2), r1: curve(40, 8) } }));
  assert.ok(plan.ok && plan.motionPool && plan.motionPool.samples > 0);
  assert.ok(plan.picks.every(p => 'motion' in p) && plan.picks.some(p => p.motion === null), 'unmeasured clips: motion null');
  const plain = j(P.tecPlanBuild({ layout: 'classic', N: 4, P: 3.9, candidates: rich, seed: 's1' }));
  assert.equal(plain.motionPool, null); assert.ok(plain.picks.every(p => !('motion' in p)));
});

t('video motion: still or unknown video shots get a gentle push-in or drift, moving ones none, no move twice in a row', () => {
  const pool = { q25: 0.5, q33: 1, q75: 6 };
  const picks = [{ rid: 'v1', kind: 'video', motion: 0.2 }, { rid: 'v2', kind: 'video', motion: 0.3 }, { rid: 'v3', kind: 'video', motion: 8 },
    { rid: 'p1', kind: 'photo' }, { rid: 'v4', kind: 'video', motion: null }, { rid: 'v5', kind: 'video' }, null, { rid: 'v6', kind: 'video', motion: 2 }];
  const m = j(P.tecShotMotions(picks, 's1', { v1: { width: 1920, height: 1080 }, v4: { width: 1080, height: 1920 } }, { pool }));
  assert.equal(m.length, picks.length); assert.equal(m[6], null);
  const fam = x => (x.motion.startsWith('drift-') ? 'drift' : x.motion);
  for (const i of [0, 1, 4, 5]) {
    assert.ok(['push-in', 'drift-left', 'drift-right', 'drift-up', 'drift-down'].includes(m[i].motion), 'still video ' + i + ': ' + m[i].motion);
    assert.equal(m[i].frameStrength, 0.5); assert.ok(Math.abs(m[i].strength - 0.3) < 1e-12);
  }
  assert.equal(m[3].frameStrength, 1, 'photos keep the full frame strength'); assert.equal(m[3].strength, 0.6);
  assert.equal(m[2].motion, 'none', 'a moving shot stays none'); assert.equal(m[2].frameStrength, 0.5);
  assert.equal(m[7].motion, 'none', 'upper two thirds of the pool: moving');
  assert.equal(m[4].axis, 'y', 'portrait video: room on y');
  const moved = m.filter(x => x && x.motion !== 'none');
  for (let i = 1; i < moved.length; i++) assert.notEqual(fam(moved[i]), fam(moved[i - 1]), 'no family twice in a row');
  // Many still videos: alternate push-in / drift; drift directions alternate; deterministic.
  const many = j(P.tecShotMotions(Array.from({ length: 12 }, (_, i) => ({ rid: 'v' + i, kind: 'video', motion: 0.1 })), 'x', {}, { pool }));
  for (let i = 1; i < many.length; i++) { assert.notEqual(fam(many[i]), fam(many[i - 1])); assert.notEqual(many[i].motion, many[i - 1].motion); }
  const drifts = many.filter(x => x.motion.startsWith('drift-'));
  for (let i = 1; i < drifts.length; i++) assert.equal(drifts[i].direction, -drifts[i - 1].direction);
  assert.deepEqual(j(P.tecShotMotions(picks, 's1', {}, { pool })), j(P.tecShotMotions(picks, 's1', {}, { pool })));
  // No motion data at all: every video counts as still (a gentle move); the photo-only form leaves videos null.
  assert.ok(j(P.tecShotMotions([{ rid: 'a', kind: 'video' }], 's', {}, null))[0].motion !== 'none');
  assert.equal(j(P.tecPhotoMotions([{ rid: 'a', kind: 'video' }], 's', {}))[0], null);
});

console.log('allocate.test.cjs: ' + checks + ' checks passed');
