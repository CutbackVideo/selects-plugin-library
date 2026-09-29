const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const box = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON };
vm.createContext(box);
vm.runInContext(fs.readFileSync(path.join(root, 'planner.js'), 'utf8') + ';globalThis.P={mvAllocate,mvPlanBuild,mvFillers,mvHash,mvProgress,MV_BUILD_STEPS};', box);
const P = box.P, j = v => JSON.parse(JSON.stringify(v));
const roles = ['street', 'architecture', 'landmark', 'park', 'detail', 'wide'];
// 12 sources x 6 roles x 2 hits = plenty of candidates, each source 30 s long.
const rich = [];
for (let r = 0; r < 12; r++) for (const role of roles) for (const t of [5, 20]) rich.push({ rid: 'r' + r, role, t: t + r * 0.1, score: 0.5 + ((r * 7 + roles.indexOf(role)) % 10) / 20, sourceDuration: 30 });

const a = j(P.mvPlanBuild({ candidates: rich, bpm: 99.2, fps: 30, montageShots: 7, seed: 's1' }));
assert.equal(a.ok, true);
assert.equal(a.picks.length, 19);
assert.equal(a.burst, 'sixteenth');
assert.equal(a.titleSlots, 12);
assert.equal(a.montageShots, 7);
// Windows stay in bounds, have the slot's length and never overlap within one source.
const bySource = {};
a.picks.forEach((p, i) => {
  const slot = a.schedule.slots[i];
  assert.ok(p.startSeconds >= 0 && p.endSeconds <= 30);
  assert.ok(Math.abs((p.endSeconds - p.startSeconds) - (slot.endFrame - slot.startFrame) / 30) < 1e-9);
  (bySource[p.rid] = bySource[p.rid] || []).push([p.startSeconds, p.endSeconds]);
});
for (const list of Object.values(bySource)) {
  list.sort((x, y) => x[0] - y[0]);
  for (let i = 1; i < list.length; i++) assert.ok(list[i][0] >= list[i - 1][1], 'no overlap');
}
// Deterministic for the same seed; a different seed changes at least one pick.
assert.deepEqual(j(P.mvPlanBuild({ candidates: rich, bpm: 99.2, fps: 30, montageShots: 7, seed: 's1' })).picks, a.picks);
const b = j(P.mvPlanBuild({ candidates: rich, bpm: 99.2, fps: 30, montageShots: 7, seed: 's2' }));
assert.notDeepEqual(b.picks, a.picks);

// Shortage: 2 short sources cannot fill 16 slots (14 with the 8th burst).
const poor = [{ rid: 'r0', role: 'street', t: 1, score: 1, sourceDuration: 3 }, { rid: 'r1', role: 'park', t: 1, score: 1, sourceDuration: 3 }];
const c = j(P.mvPlanBuild({ candidates: poor, bpm: 99.2, fps: 30, montageShots: 7, seed: 's1' }));
assert.equal(c.ok, false);
assert.equal(c.needed, 16);
assert.equal(j(P.mvPlanBuild({ candidates: poor, bpm: 99.2, fps: 30, montageShots: 7, seed: 's1', burst: 'eighth' })).needed, 14);
assert.ok(c.usableShots < c.needed);

// (a) Limited footage: montage shrinks to what fits (>= 4) instead of failing; deterministic per seed.
const mk = (n, dur, roleList) => { const out = []; for (let r = 0; r < n; r++) for (const role of roleList) out.push({ rid: 'm' + r, role, t: dur / 2, score: 0.6, sourceDuration: dur }); return out; };
let shrunk = null;
for (let n = 8; n <= 40 && !shrunk; n++) {
  const r = j(P.mvPlanBuild({ candidates: mk(n, 4, roles), bpm: 99.2, fps: 30, montageShots: 12, seed: 's1' }));
  if (r.ok && r.montageShots < 12) shrunk = { n, r };
}
assert.ok(shrunk, 'some footage level shrinks the montage');
assert.ok(shrunk.r.montageShots >= 4 && shrunk.r.montageShots < 12);
assert.equal(shrunk.r.picks.length, 12 + shrunk.r.montageShots);
assert.ok(shrunk.r.picks.every(Boolean));
// (e) Determinism for the shrunk case.
assert.deepEqual(j(P.mvPlanBuild({ candidates: mk(shrunk.n, 4, roles), bpm: 99.2, fps: 30, montageShots: 12, seed: 's1' })), shrunk.r);

// (b) No footage for the first montage role (architecture) or its fallbacks: a later-role fallback still fills it.
const noArch = rich.filter(x => x.role !== 'architecture' && x.role !== 'landmark');
const e2 = j(P.mvPlanBuild({ candidates: noArch, bpm: 99.2, fps: 30, montageShots: 7, seed: 's1' }));
assert.equal(e2.ok, true);
assert.equal(e2.picks.length, 12 + e2.montageShots);

// (c) Street/detail-only footage still builds (last-resort tier).
const sd = rich.filter(x => x.role === 'street' || x.role === 'detail');
const e3 = j(P.mvPlanBuild({ candidates: sd, bpm: 99.2, fps: 30, montageShots: 7, seed: 's1' }));
assert.equal(e3.ok, true);
assert.equal(e3.picks.length, 12 + e3.montageShots);

// A preferred role wins over the last-resort tier even with a much lower score.
const pref = P.mvAllocate({ candidates: [{ rid: 'a', role: 'wide', t: 5, score: 1, sourceDuration: 30 }, { rid: 'b', role: 'street', t: 5, score: 0, sourceDuration: 30 }], slots: [{ index: 0, role: 'street', seconds: 1 }], seed: 'x' });
assert.equal(pref.picks[0].rid, 'b');
// Non-finite candidate fields are ignored.
const bad = P.mvAllocate({ candidates: [{ rid: 'a', role: 'street', t: NaN, score: 1, sourceDuration: 30 }, { rid: 'b', role: 'street', t: 5, score: Infinity, sourceDuration: 30 }], slots: [{ index: 0, role: 'street', seconds: 1 }], seed: 'x' });
assert.equal(bad.filled, 0);

// Scene-search hits collapse onto ~6 distinct times per clip (live readback on 4 clips of 24.6/9.7/8.7/5.5 s).
// Without fillers every length shrank to 4-5 montage shots; evenly spaced fillers let every requested length fit.
const collapsed = [];
[['c0', 24.6], ['c1', 9.7], ['c2', 8.7], ['c3', 5.5]].forEach(([rid, dur], r) => {
  const times = Array.from({ length: 6 }, (_, k) => Math.round(k * dur / 6 * 1000) / 1000);
  roles.forEach((role, ri) => [0, 1].forEach(k => {
    const t = times[(ri + k * 3 + r) % times.length];
    collapsed.push({ rid, role, t, score: 0.15 + ((r * 13 + ri * 7 + k * 5) % 25) / 100, sourceDuration: dur });
  }));
});
for (const rid of ['c0', 'c1', 'c2', 'c3']) assert.ok(new Set(collapsed.filter(c => c.rid === rid).map(c => c.t)).size <= 6);
for (const seed of ['s1', 's2', 's3']) for (const n of [4, 7, 12]) {
  const r = j(P.mvPlanBuild({ candidates: collapsed, bpm: 99.2, fps: 30, montageShots: n, seed }));
  assert.equal(r.ok, true);
  assert.equal(r.montageShots, n, 'requested ' + n + ' fits with fillers (seed ' + seed + ')');
  assert.ok(r.picks.every(Boolean));
  if (n === 12) assert.ok(r.fillerShots > 0);
  const spans = {};
  r.picks.forEach((p, i) => {
    const d = { c0: 24.6, c1: 9.7, c2: 8.7, c3: 5.5 }[p.rid];
    assert.ok(p.startSeconds >= -1e-9 && p.endSeconds <= d + 1e-9, 'filler windows stay in the source');
    (spans[p.rid] = spans[p.rid] || []).push([p.startSeconds, p.endSeconds]);
  });
  for (const list of Object.values(spans)) {
    list.sort((x, y) => x[0] - y[0]);
    for (let i = 1; i < list.length; i++) assert.ok(list[i][0] >= list[i - 1][1] + 0.5 - 1e-9, 'gap between windows');
  }
}
// Fillers spread across sources: the repeat penalty applies to them too.
const fl = j(P.mvPlanBuild({ candidates: collapsed, bpm: 99.2, fps: 30, montageShots: 12, seed: 's1' }));
assert.deepEqual(j(P.mvPlanBuild({ candidates: collapsed, bpm: 99.2, fps: 30, montageShots: 12, seed: 's1' })), fl);
assert.ok(new Set(fl.picks.map(p => p.rid)).size === 4);
// Plenty of real hits: fillers never leak in.
assert.equal(a.fillerShots, 0);

// Fillers exist only through mvPlanBuild; a real hit wins over them whenever it fits, even outside the fallback roles.
const oneSlot = [{ index: 13, role: 'street', seconds: 1.2 }];
const plan1 = (cands) => {
  const all = cands.concat(P.mvFillers(cands));
  return P.mvAllocate({ candidates: all, slots: oneSlot, seed: 'x' });
};
const realOnly = { rid: 'a', role: 'wide', t: 7, score: 0.05, sourceDuration: 20 };
const r1 = plan1([realOnly]);
assert.equal(r1.fillerShots, 0);
assert.ok(Math.abs(r1.picks[0].startSeconds - 6.4) < 1e-9, 'centred on the real hit');
// Filler grid: every 0.5 s from 0.25 s to duration - 0.25 s, per source, deterministic order.
const grid = P.mvFillers([{ rid: 'b', role: 'street', t: 1, score: 1, sourceDuration: 2 }, { rid: 'a', role: 'park', t: 1, score: 1, sourceDuration: 1.1 }]);
assert.deepEqual(j(grid).map(g => g.rid + '@' + g.t), ['a@0.25', 'a@0.75', 'b@0.25', 'b@0.75', 'b@1.25', 'b@1.75']);
assert.ok(grid.every(g => g.role === 'filler' && g.score < 0));

// Photos: { rid, kind: 'photo' } candidates, one use each, no role.
const photoSet = n => Array.from({ length: n }, (_, i) => ({ rid: 'p' + String(i).padStart(2, '0'), kind: 'photo' }));
const maxRun = picks => { let run = 0, best = 0; for (const p of picks) { run = p && p.kind === 'photo' ? run + 1 : 0; best = Math.max(best, run); } return best; };
const onceEach = picks => { const ids = picks.filter(p => p.kind === 'photo').map(p => p.rid); assert.equal(new Set(ids).size, ids.length, 'one use per photo'); };
// Photos only (no analysed video): 22 photos build a full plan; every pick is a photo with the slot's hold.
const po = j(P.mvPlanBuild({ candidates: photoSet(22), bpm: 99.2, fps: 30, montageShots: 7, seed: 's1' }));
assert.equal(po.ok, true);
assert.equal(po.montageShots, 7);
assert.equal(po.photoShots, 19);
assert.equal(po.fillerShots, 0);
assert.equal(po.photoRunRelaxed, true, 'photos only cannot keep the two-in-a-row rule');
po.picks.forEach((p, i) => {
  const slot = po.schedule.slots[i];
  assert.deepEqual(Object.keys(p).sort(), ['holdSeconds', 'kind', 'rid', 'slot']);
  assert.equal(p.kind, 'photo');
  assert.ok(Math.abs(p.holdSeconds - (slot.endFrame - slot.startFrame) / 30) < 1e-9);
});
onceEach(po.picks);
assert.deepEqual(j(P.mvPlanBuild({ candidates: photoSet(22), bpm: 99.2, fps: 30, montageShots: 7, seed: 's1' })), po, 'deterministic');
assert.notDeepEqual(j(P.mvPlanBuild({ candidates: photoSet(22), bpm: 99.2, fps: 30, montageShots: 7, seed: 's2' })).picks, po.picks);
// 16 photos fit exactly the shortest plan; 15 do not, and the shortage counts them. The 8th burst needs 14.
const p16 = j(P.mvPlanBuild({ candidates: photoSet(16), bpm: 99.2, fps: 30, montageShots: 12, seed: 's1' }));
assert.equal(p16.ok, true);
assert.equal(p16.montageShots, 4);
const p15 = j(P.mvPlanBuild({ candidates: photoSet(15), bpm: 99.2, fps: 30, montageShots: 7, seed: 's1' }));
assert.equal(p15.ok, false);
assert.equal(p15.usableShots, 15);
assert.equal(p15.photoShots, 15);
assert.ok(p15.usableShots < p15.needed);
const p14 = j(P.mvPlanBuild({ candidates: photoSet(14), bpm: 99.2, fps: 30, montageShots: 12, seed: 's1', burst: 'eighth' }));
assert.equal(p14.ok, true);
assert.equal(p14.picks.length, 14);
// Duplicate photo rids count once.
assert.equal(j(P.mvPlanBuild({ candidates: photoSet(15).concat(photoSet(15)), bpm: 99.2, fps: 30, montageShots: 7, seed: 's1' })).ok, false);

// Photo share: even with plenty of real hits, about a third of the slots are photos, spread out (never two in a row
// here), title slots included for some seeds, deterministic per seed.
assert.ok(a.picks.every(p => p.kind === 'video'));
let titlePhotos = 0;
for (const seed of ['s1', 's2', 's3', 's4', 's5', 's6']) for (const burst of ['sixteenth', 'eighth']) {
  const rp = j(P.mvPlanBuild({ candidates: rich.concat(photoSet(10)), bpm: 99.2, fps: 30, montageShots: 7, seed, burst }));
  assert.equal(rp.photoShots, Math.round(rp.picks.length / 3), 'a third of ' + rp.picks.length + ' slots');
  assert.equal(maxRun(rp.picks), 1, 'photo slots are spread out');
  onceEach(rp.picks);
  assert.deepEqual(j(P.mvPlanBuild({ candidates: rich.concat(photoSet(10)), bpm: 99.2, fps: 30, montageShots: 7, seed, burst })), rp, 'deterministic');
  titlePhotos += rp.picks.slice(0, rp.titleSlots).filter(p => p.kind === 'photo').length;
}
assert.ok(titlePhotos > 0, 'photos also land in the title');
// Fewer photos than the share: every photo is used, no more.
assert.equal(j(P.mvPlanBuild({ candidates: rich.concat(photoSet(3)), bpm: 99.2, fps: 30, montageShots: 7, seed: 's1' })).photoShots, 3);
// photoShare 0 turns photo slots off: plenty of real hits then need no photo, and unused photos change nothing.
const richPhotos = j(P.mvPlanBuild({ candidates: rich.concat(photoSet(10)), bpm: 99.2, fps: 30, montageShots: 7, seed: 's1', photoShare: 0 }));
assert.equal(richPhotos.photoShots, 0);
assert.deepEqual(richPhotos.picks, a.picks, 'unused photos change nothing');
// The live mix: 4 videos and 22 photos (nature test Project) gets at least a third photos at every length.
for (const n of [4, 7, 12]) {
  const nat = j(P.mvPlanBuild({ candidates: collapsed.concat(photoSet(22)), bpm: 99.2, fps: 30, montageShots: n, seed: '1', burst: 'eighth' }));
  assert.ok(nat.photoShots >= Math.round(nat.picks.length / 3), 'nature mix ' + n + ': ' + nat.photoShots + ' of ' + nat.picks.length);
  assert.ok(maxRun(nat.picks) <= 2);
}

// Tier order on single slots.
const hit = (rid, role, extra) => ({ rid, role, t: 5, score: 0.5, sourceDuration: 30, ...extra });
const one = (cands, slot) => j(P.mvAllocate({ candidates: cands, slots: [slot], seed: 'x' })).picks[0];
const streetSlot = { index: 13, role: 'street', section: 'montage', seconds: 1.2 };
// A preferred-role hit beats a photo; an any-role hit beats a photo outside the burst.
assert.equal(one([hit('v', 'street'), { rid: 'p', kind: 'photo' }], streetSlot).kind, 'video');
assert.equal(one([hit('v', 'wide', { score: 0.01 }), { rid: 'p', kind: 'photo' }], streetSlot).rid, 'v');
// A photo beats fillers.
assert.equal(one(P.mvFillers([hit('v', 'street')]).concat([{ rid: 'p', kind: 'photo' }]), streetSlot).rid, 'p');
// In the title burst a photo beats an any-role hit, but not a preferred one.
const burstSlot = { index: 4, role: 'landmark', section: 'burst', seconds: 0.15 };
assert.equal(one([hit('v', 'street'), { rid: 'p', kind: 'photo' }], burstSlot).rid, 'p');
assert.equal(one([hit('v', 'landmark'), { rid: 'p', kind: 'photo' }], burstSlot).rid, 'v');
// A photo cannot hold longer than the 5 s an image source lasts.
assert.equal(one([{ rid: 'p', kind: 'photo' }], { index: 13, role: 'street', section: 'montage', seconds: 5.5 }), null);

// Mixed footage that runs out of real hits (collapsed scene search): photos come before fillers, at most two in a row.
for (const seed of ['s1', 's2', 's3']) for (const n of [4, 7, 12]) {
  const base = j(P.mvPlanBuild({ candidates: collapsed, bpm: 99.2, fps: 30, montageShots: n, seed }));
  const mix = j(P.mvPlanBuild({ candidates: collapsed.concat(photoSet(22)), bpm: 99.2, fps: 30, montageShots: n, seed }));
  assert.equal(mix.ok, true);
  assert.equal(mix.montageShots, n);
  assert.ok(mix.photoShots >= Math.round(mix.picks.length / 3), 'at least the photo share');
  assert.ok(mix.fillerShots <= base.fillerShots, 'photos replace fillers first');
  assert.ok(maxRun(mix.picks) <= 2, 'never more than two photos in a row (' + seed + ', ' + n + ')');
  assert.equal(mix.photoRunRelaxed, undefined);
  onceEach(mix.picks);
  assert.equal(mix.picks.filter(p => p.kind === 'photo').length, mix.photoShots);
  assert.deepEqual(j(P.mvPlanBuild({ candidates: collapsed.concat(photoSet(22)), bpm: 99.2, fps: 30, montageShots: n, seed })), mix, 'deterministic');
}
// The burst encourages photos beyond the share: with street-only footage the landmark burst (slots 3-10) has no
// preferred hit, so photos take it ahead of the street hits, two at a time; outside the burst street hits keep their
// place (shown without photo slots).
const mixBurst = j(P.mvPlanBuild({ candidates: rich.filter(x => x.role === 'street').concat(photoSet(22)), bpm: 99.2, fps: 30, montageShots: 7, seed: 's1', photoShare: 0 }));
assert.equal(mixBurst.ok, true);
assert.equal(mixBurst.picks.slice(3, 11).map(p => (p.kind === 'photo' ? 'P' : 'v')).join(''), 'PPvPPvPP');
assert.ok(maxRun(mixBurst.picks) <= 2);
assert.equal(mixBurst.picks[0].kind, 'video', 'a street slot keeps its preferred street hit');
// The run rule on a strip of slots: two photos, then a filler, then photos again.
const strip = Array.from({ length: 7 }, (_, i) => ({ index: 13 + i, role: 'street', section: 'montage', seconds: 1.2 }));
const st = j(P.mvAllocate({ candidates: P.mvFillers([hit('v', 'park', { sourceDuration: 60 })]).concat(photoSet(10)), slots: strip, seed: 'x' }));
assert.deepEqual(st.picks.map(p => p.kind), ['photo', 'photo', 'video', 'photo', 'photo', 'video', 'photo']);
assert.equal(st.photoShots, 5);
assert.equal(st.fillerShots, 2);

// No two shots in a row from the same source while anything else fits.
const adjacent = picks => picks.reduce((n, p, i) => n + (i > 0 && p && picks[i - 1] && p.rid === picks[i - 1].rid ? 1 : 0), 0);
for (const seed of ['s1', 's2', 's3']) for (const n of [4, 7, 12]) for (const burst of ['sixteenth', 'eighth']) {
  for (const cands of [rich, collapsed, collapsed.concat(photoSet(22)), rich.filter(x => x.role === 'street')]) {
    const r = j(P.mvPlanBuild({ candidates: cands, bpm: 99.2, fps: 30, montageShots: n, seed, burst }));
    assert.equal(r.ok, true);
    // Every repeat is one the allocator could not avoid, and it is counted for the panel note.
    assert.equal(adjacent(r.picks), r.adjacentRepeats || 0, 'repeats are counted (' + seed + ', ' + n + ', ' + burst + ')');
    // Only the collapsed four-clip footage runs out: its long montage ends with the one clip that has time left.
    if (cands !== collapsed || n < 12) assert.equal(r.adjacentRepeats, undefined, 'no adjacent repeats (' + seed + ', ' + n + ', ' + burst + ')');
  }
}
// The previous source is excluded from every tier, even when it is the only preferred-role hit: another source's
// filler takes the slot.
const twoSrc = [hit('a', 'street', { t: 5, score: 0.9 }), hit('a', 'street', { t: 20, score: 0.9 }), hit('b', 'park', { t: 5, sourceDuration: 30 })];
const tw = j(P.mvAllocate({ candidates: twoSrc.concat(P.mvFillers(twoSrc)), slots: [streetSlot, { ...streetSlot, index: 14 }], seed: 'x' }));
assert.deepEqual(tw.picks.map(p => p.rid), ['a', 'b']);
assert.equal(tw.adjacentRepeats, 0);
// A single source: the repeat is unavoidable, so it is allowed and counted.
const oneSrc = [hit('a', 'street', { t: 5 }), hit('a', 'street', { t: 20 })];
const os = j(P.mvAllocate({ candidates: oneSrc, slots: [streetSlot, { ...streetSlot, index: 14 }], seed: 'x' }));
assert.deepEqual(os.picks.map(p => p.rid), ['a', 'a']);
assert.equal(os.adjacentRepeats, 1);
const osPlan = j(P.mvPlanBuild({ candidates: [{ rid: 'solo', role: 'street', t: 30, score: 0.5, sourceDuration: 120 }], bpm: 99.2, fps: 30, montageShots: 4, seed: 's1' }));
assert.equal(osPlan.ok, true);
assert.equal(osPlan.adjacentRepeats, osPlan.picks.length - 1, 'every cut of a one-clip plan is a repeat');

// Build progress: step n/total, weighted percent, never backwards, 100% only at the end.
assert.equal(P.MV_BUILD_STEPS.length, 5);
assert.equal(P.MV_BUILD_STEPS.reduce((a, s) => a + s.weight, 0), 100);
assert.equal(P.mvProgress('shots', 0).label, 'Step 1/5 · Choosing shots · 0%');
assert.equal(P.mvProgress('shots', 0.5, '12/24 clips checked').label, 'Step 1/5 · Choosing shots (12/24 clips checked) · 20%');
assert.equal(P.mvProgress('draft', 0).percent, 50);
assert.equal(P.mvProgress('draft', 0).current, 2);
assert.equal(P.mvProgress('open', 0.99).percent, 99);
assert.equal(P.mvProgress('open', 1).percent, 100);
assert.equal(P.mvProgress('music', 7).percent, 50, 'fraction is clamped');
let last = -1;
for (const s of P.MV_BUILD_STEPS) for (const f of [0, 0.5, 1]) { const v = P.mvProgress(s.id, f).value; assert.ok(v >= last); last = v; }
assert.throws(() => P.mvProgress('nope', 0));
console.log(JSON.stringify({ allocate: 'ok' }));
