// plugins/the-end-credits/tests/allocate.test.cjs
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const box = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON, Date };
vm.createContext(box);
vm.runInContext(fs.readFileSync(path.join(root, 'planner.js'), 'utf8') + ';globalThis.P={tecAllocate,tecPlanBuild,tecFillers,tecHash,tecTimeline,tecFootageSlots,tecPhotoMotions,TEC_PHOTO_MOTIONS,TEC_SEARCH_ROLES};', box);
const P = box.P, j = v => JSON.parse(JSON.stringify(v));
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

console.log('allocate.test.cjs: ' + checks + ' checks passed');
