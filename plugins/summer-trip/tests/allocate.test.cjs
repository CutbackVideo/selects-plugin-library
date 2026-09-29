// plugins/summer-trip/tests/allocate.test.cjs
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const box = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON };
vm.createContext(box);
vm.runInContext(fs.readFileSync(path.join(root, 'planner.js'), 'utf8') + ';globalThis.P={stAllocate,stPlanBuild,stFillers,stHash,stWindow,stProgress,stPhotoMotions,stSchedule,stFrameSchedule,ST_BUILD_STEPS,ST_MONTAGE_ROLES,ST_FILLER_MAX};', box);
const P = box.P, j = v => JSON.parse(JSON.stringify(v));
let checks = 0;
const eq = (a, b, m) => { assert.deepEqual(j(a), j(b), m); checks++; };
const ok = (v, m) => { assert.ok(v, m); checks++; };

const roles = ['opener', 'grid', 'place', 'beach', 'town', 'water', 'street', 'food', 'landmark', 'people', 'detail', 'ending'];
// 12 sources x 12 roles x 2 hits, each source 30 s long.
const rich = [];
for (let r = 0; r < 12; r++) for (const role of roles) for (const t of [5, 20]) rich.push({ rid: 'r' + String(r).padStart(2, '0'), role, t: t + r * 0.1, score: 0.5 + ((r * 7 + roles.indexOf(role)) % 10) / 20, sourceDuration: 30 });
const photoSet = n => Array.from({ length: n }, (_, i) => ({ rid: 'p' + String(i).padStart(2, '0'), kind: 'photo' }));
const durOf = cands => { const d = {}; for (const c of cands) if (c.kind !== 'photo') d[c.rid] = Math.max(d[c.rid] || 0, c.sourceDuration); return d; };
const build = (candidates, extra) => j(P.stPlanBuild({ candidates, bpm: 120, fps: 30, montageShots: 8, seed: 's1', ...extra }));
const adjacent = main => main.reduce((n, p, i) => n + (i > 0 && p.rid === main[i - 1].rid ? 1 : 0), 0);
const maxFlowRun = plan => { let run = 0, best = 0; for (const p of plan.picks.main.slice(2)) { run = p.kind === 'photo' ? run + 1 : 0; best = Math.max(best, run); } return best; };

// Checks every plan must pass: contract order and roles, six distinct fixed resources, Main never repeats a resource
// in adjacent slots, frame-aligned windows of exactly the slot's frames with a 0.15 s tail, no overlapping windows
// within one source (0.5 s gap) unless the overlap pass ran, photos hold <= 5 s from 0.
function checkPlan(plan, cands, fps, label) {
  const dur = durOf(cands), n = plan.montageShots, f = plan.frames;
  ok(plan.ok, label + ': ok');
  eq(plan.disabledReason, null);
  eq(plan.picks.main.length, n + 5, label + ': Main clips');
  eq(plan.picks.main.map(p => p.role), ['opener', 'place'].concat(Array(n).fill('montage'), ['ending', 'ending', 'ending']));
  eq(plan.picks.main.slice(2, 2 + n).map(p => p.slotRole), Array.from({ length: n }, (_, i) => P.ST_MONTAGE_ROLES[i % 8]));
  eq(plan.picks.grid.map(p => p.quad), ['TL', 'TR', 'BR', 'BL']);
  const fixed = [plan.picks.main[0], plan.picks.main[1]].concat(plan.picks.grid).map(p => p.rid);
  eq(new Set(fixed).size, 6, label + ': opener, place and grid A-D differ');
  eq(adjacent(plan.picks.main), 0, label + ': no adjacent repeats on Main');
  const spans = f.mainFrames.slice(1).map((x, i) => [f.mainFrames[i], x]).map(([a, b]) => b - a);
  const gridSpans = f.grid.map(g => g.bFrame - g.aFrame);
  const windows = {};
  const each = (p, frames) => {
    ok(['rid', 'kind', 'startSeconds', 'role'].every(k => k in p), 'contract keys');
    if (p.kind === 'photo') {
      eq(p.startSeconds, 0);
      ok(frames / fps <= 5 + 1e-9, 'photo hold <= 5 s');
      ok(Math.abs(p.holdSeconds - frames / fps) < 1e-9);
      return;
    }
    ok(Math.abs(p.startSeconds * fps - Math.round(p.startSeconds * fps)) < 1e-6, label + ': start on a whole frame');
    ok(Math.abs((p.endSeconds - p.startSeconds) * fps - frames) < 1e-6, label + ': window = slot frames');
    ok(p.startSeconds >= 0 && p.endSeconds + 0.15 <= dur[p.rid] + 1e-9, label + ': tail >= 0.15 s');
    (windows[p.rid] = windows[p.rid] || []).push([p.startSeconds, p.endSeconds]);
  };
  plan.picks.main.forEach((p, i) => each(p, spans[i]));
  plan.picks.grid.forEach((p, i) => each(p, gridSpans[i]));
  if (!plan.overlapShots) for (const list of Object.values(windows)) {
    list.sort((x, y) => x[0] - y[0]);
    for (let i = 1; i < list.length; i++) ok(list[i][0] >= list[i - 1][1] + 0.5 - 1e-9, label + ': gap between windows of one source');
  }
}

// Rich footage, Standard: the full plan, deterministic, seed-dependent.
const a = build(rich);
checkPlan(a, rich, 30, 'rich');
eq([a.montageShots, a.requestedShots, a.shrunk, a.distinct, a.fillerShots, a.photoShots], [8, 8, false, 12, 0, 0]);
eq(a.notes, []);
eq(a.schedule.endingStart, 32);
eq(a.frames.endFrame, 600);
ok(a.picks.main[0].kind === 'video');
eq(build(rich), a, 'deterministic');
ok(JSON.stringify(build(rich, { seed: 's2' }).picks) !== JSON.stringify(a.picks), 'another seed, other picks');
for (const n of [6, 8, 12]) for (const fps of [23.976, 25, 30000 / 1001, 30, 60]) for (const bpm of [118, 120, 124]) {
  const plan = j(P.stPlanBuild({ candidates: rich, bpm, fps, montageShots: n, seed: 'x' + n, sectionStart: 3.217 }));
  checkPlan(plan, rich, fps, 'rich ' + n + '@' + fps + '/' + bpm);
  eq(plan.montageShots, n);
}
// Requested lengths are clamped to 4..12.
eq(build(rich, { montageShots: 20 }).montageShots, 12);
eq(build(rich, { montageShots: 1 }).montageShots, 4);

// Fresh-first: every clip is used once before any clip repeats, and use counts end up within one of each other.
for (const seed of ['s1', 's2', 's3']) {
  const r = j(P.stPlanBuild({ candidates: rich, bpm: 120, fps: 30, montageShots: 12, seed }));
  checkPlan(r, rich, 30, 'fresh ' + seed);
  const order = [r.picks.main[0], r.picks.main[1]].concat(r.picks.grid, r.picks.main.slice(2)).map(p => p.rid);
  eq(new Set(order.slice(0, 12)).size, 12, 'the first 12 slots use 12 different clips (' + seed + ')');
  const uses = {};
  order.forEach(rid => { uses[rid] = (uses[rid] || 0) + 1; });
  const counts = Object.values(uses);
  ok(Math.max(...counts) - Math.min(...counts) <= 1, 'uses spread evenly: ' + counts);
}
// Role only ranks equal use counts: a used clip's preferred-role hit loses to an unused clip's weaker hit.
const slot = (index, role, extra) => ({ index, track: 'main', section: 'montage', role, frames: 60, seconds: 2, ...extra });
const hit = (rid, role, extra) => ({ rid, role, t: 10, score: 0.5, sourceDuration: 60, ...extra });
const fr = j(P.stAllocate({ candidates: [hit('a', 'beach', { score: 0.9 }), hit('a', 'beach', { t: 40, score: 0.9 }), hit('b', 'food', { score: 0.1 }), hit('c', 'detail', { score: 0.1 })], slots: [slot(0, 'beach'), slot(1, 'food'), slot(2, 'beach')], fps: 30, seed: 'x', photoShare: 0 }));
eq(fr.picks.map(p => p.rid), ['a', 'b', 'c'], 'fresh clips first, whatever their role');
// At equal use counts the preferred role wins over a better score, and any real hit beats a filler.
const pr = j(P.stAllocate({ candidates: [hit('a', 'town', { score: 0.9 }), hit('b', 'beach', { score: 0.1 })], slots: [slot(0, 'beach')], fps: 30, seed: 'x' }));
eq(pr.picks[0].rid, 'b');
const rf = j(P.stAllocate({ candidates: [hit('a', 'filler', { score: -2 })].concat([hit('b', 'people', { score: 0.01 })]), slots: [slot(0, 'beach')], fps: 30, seed: 'x' }));
eq(rf.picks[0].rid, 'b');
// Main never repeats a resource in adjacent slots, even when it is the only preferred hit; grid slots do not count.
const adj = j(P.stAllocate({ candidates: [hit('a', 'beach'), hit('a', 'beach', { t: 40 })], slots: [slot(0, 'beach'), slot(1, 'beach')], fps: 30, seed: 'x' }));
eq(adj.picks.map(p => p && p.rid), ['a', null], 'no fallback to an adjacent repeat');
eq(adj.missing, 1);

// Windows: frame-aligned at the real fps, centred on the hit, a 0.15 s tail.
const w = P.stWindow(10, 60, 30, 60);
eq([w.start, w.end], [9, 11]);
const w2 = P.stWindow(59.9, 60, 30, 60);
ok(Math.abs(w2.end - (60 - 0.15)) <= 1 / 30 && w2.end <= 60 - 0.15 + 1e-9);
eq(P.stWindow(1, 60, 30, 2.1), null, '2 s + 0.15 s tail does not fit 2.1 s');
eq(j(P.stWindow(1, 60, 30, 2.15)), { start: 0, end: 2 });
const w3 = P.stWindow(7.777, 50, 30000 / 1001, 60);
ok(Math.abs(w3.start * 30000 / 1001 - Math.round(w3.start * 30000 / 1001)) < 1e-9);

// Fillers: 0.5 s grid, capped at 48 evenly spaced times per source.
const grid = j(P.stFillers([{ rid: 'b', role: 'town', t: 1, score: 1, sourceDuration: 2 }, { rid: 'a', role: 'beach', t: 1, score: 1, sourceDuration: 1.1 }, { rid: 'p', kind: 'photo' }]));
eq(grid.map(g => g.rid + '@' + g.t), ['a@0.25', 'a@0.75', 'b@0.25', 'b@0.75', 'b@1.25', 'b@1.75']);
ok(grid.every(g => g.role === 'filler' && g.score < 0));
eq(P.ST_FILLER_MAX, 48);
const longF = j(P.stFillers([{ rid: 'h', role: 'town', t: 1, score: 1, sourceDuration: 3600 }]));
eq(longF.length, 48);
eq([longF[0].t, longF[47].t], [0.25, 3599.75]);
ok(longF.every((g, i) => i === 0 || g.t > longF[i - 1].t));
eq(j(P.stFillers([{ rid: 'e', role: 'town', t: 1, score: 1, sourceDuration: 24.25 }])).length, 48, 'exactly 48 on the 0.5 s grid');
// Long sources stay fast (cached hashes, capped fillers): 20 one-hour clips, Long.
const hours = [];
for (let r = 0; r < 20; r++) for (const role of roles) hours.push({ rid: 'h' + r, role, t: 100 + r * 37 + roles.indexOf(role) * 5, score: 0.4, sourceDuration: 3600 });
const t0 = process.hrtime.bigint();
const hp = j(P.stPlanBuild({ candidates: hours, bpm: 120, fps: 30, montageShots: 12, seed: 's1' }));
const ms = Number(process.hrtime.bigint() - t0) / 1e6;
checkPlan(hp, hours, 30, 'hours');
ok(ms < 10000, 'one-hour sources plan in reasonable time (' + Math.round(ms) + ' ms)');

// Scene-search hits collapse onto a few times per clip: fillers keep every length reachable.
const collapsed = [];
[['c0', 24.6], ['c1', 9.7], ['c2', 8.7], ['c3', 5.5], ['c4', 12.2], ['c5', 7.4]].forEach(([rid, dur], r) => {
  const times = Array.from({ length: 6 }, (_, k) => Math.round(k * dur / 6 * 1000) / 1000);
  roles.forEach((role, ri) => [0, 1].forEach(k => collapsed.push({ rid, role, t: times[(ri + k * 3 + r) % 6], score: 0.15 + ((r * 13 + ri * 7 + k * 5) % 25) / 100, sourceDuration: dur })));
});
for (const seed of ['s1', 's2', 's3']) for (const n of [6, 8, 12]) {
  const r = j(P.stPlanBuild({ candidates: collapsed, bpm: 120, fps: 30, montageShots: n, seed }));
  checkPlan(r, collapsed, 30, 'collapsed ' + seed + '/' + n);
  eq(r.montageShots, n, 'requested ' + n + ' fits with fillers');
  if (n === 12) ok(r.fillerShots > 0);
}

// Shortage rule (spec 15.4).
// Fewer than six distinct resources: disabled with the count.
const five = rich.filter(c => ['r00', 'r01', 'r02', 'r03', 'r04'].includes(c.rid));
const d5 = build(five);
eq([d5.ok, d5.disabledReason, d5.distinct, d5.montageShots], [false, 'Needs at least 6 different clips or photos (found 5)', 5, 0]);
eq(d5.picks, { main: [], grid: [] });
eq(build(five.concat(photoSet(1))).ok, true, 'a photo counts as the sixth resource');
// Clips too short for a grid panel (1 s + tail) do not count.
const tiny = [0, 1, 2, 3, 4, 5].map(i => hit('t' + i, 'beach', { t: 0.5, sourceDuration: i < 5 ? 30 : 1.1 }));
eq(build(tiny).disabledReason, 'Needs at least 6 different clips or photos (found 5)');
// No clip long enough for the opener (4.77 s at 120 BPM / 30 fps + 0.15 s) and no photo: disabled.
const short = [0, 1, 2, 3, 4, 5, 6].map(i => hit('s' + i, 'beach', { t: 2, sourceDuration: 4.5 }));
eq(build(short).disabledReason, 'Needs one video clip at least 5.0 s long for the opening');
// Photos only: at 120 BPM the opener fits a photo's 5 s hold, at 100 BPM (5.7 s) it does not.
const po = build(photoSet(20));
checkPlan(po, [], 30, 'photos only');
eq(po.picks.main[0].kind, 'photo');
ok(po.photoRunRelaxed && po.notes.some(n => /photos play in a row/.test(n)));
eq(j(P.stPlanBuild({ candidates: photoSet(20), bpm: 100, fps: 30, montageShots: 8, seed: 's1' })).disabledReason, 'Needs one video clip at least 5.9 s long for the opening');
// One long clip, five 2-second clips, no photo: nothing holds the 4.5-beat place shot.
const noPlace = [hit('long', 'opener', { sourceDuration: 60 })].concat([0, 1, 2, 3, 4].map(i => hit('q' + i, 'beach', { t: 1, sourceDuration: 2 })));
eq(build(noPlace).disabledReason, 'Needs a second clip at least 2.4 s long (or a photo) for the place shot');
// The opener prefers a video; with a long clip it never takes a photo.
eq(build(rich.concat(photoSet(10))).picks.main[0].kind, 'video');

// Shrink: short clips fit fewer montage shots; N drops by 2 (never below 4) and the note says so.
// One long opener clip, one 3 s place clip and `count` short clips (one window each).
const mk = (count, dur) => [hit('open', 'opener', { t: 10, sourceDuration: 30 }), hit('plc', 'place', { t: 1.5, sourceDuration: 3 })].concat(Array.from({ length: count }, (_, i) => hit('m' + String(i).padStart(2, '0'), roles[i % roles.length], { t: dur / 2, sourceDuration: dur })));
const shrunk = [];
const fitted = [];
for (let count = 10; count <= 18; count++) {
  const r = j(P.stPlanBuild({ candidates: mk(count, 2), bpm: 120, fps: 30, montageShots: 12, seed: 's1' }));
  checkPlan(r, mk(count, 2), 30, 'shrink ' + count);
  fitted.push(r.montageShots);
  if (r.shrunk) shrunk.push(r);
}
eq(fitted, [4, 4, 6, 6, 8, 8, 10, 10, 12], 'more clips fit more montage shots');
for (const r of shrunk) {
  ok([4, 6, 8, 10].includes(r.montageShots), 'shrinks by 2: ' + r.montageShots);
  ok(r.notes.some(n => n === 'Your footage fits ' + r.montageShots + ' montage shots (about ' + Math.round(r.frames.endFrame / 30) + ' s)'));
}
// Overlap pass: very little footage fills N = 4 by reusing overlapping windows, and says so.
const tight = mk(4, 2);
const ov = build(tight);
checkPlan(ov, tight, 30, 'overlap');
eq(ov.montageShots, 4);
ok(ov.overlapShots > 0 && ov.notes.includes('Some shots reuse footage from the same moment of a clip'));

// Snaps: caller snaps are filtered to the fitted N's anchors (E moves when N shrinks); bundled cues never snap.
const sp = build(rich, { snaps: { 8: 4.045, 32: 16.045 } });
eq([sp.frames.gridStateFrames[0], sp.frames.endingFrame], [121, 481]);
const spB = build(rich, { snaps: { 8: 4.045, 32: 16.045 }, bundled: true });
eq([spB.frames.gridStateFrames[0], spB.frames.endingFrame], [120, 480]);
const spS = j(P.stPlanBuild({ candidates: mk(6, 1.3), bpm: 120, fps: 30, montageShots: 8, seed: 's1', snaps: { 32: 16.045 } }));
ok(spS.ok && spS.montageShots < 8 && spS.frames.endingFrame === Math.round(spS.schedule.endingStart * 0.5 * 30), 'a stale E snap is dropped');
// Onsets: stPlanBuild snaps each attempt's anchors itself.
const so = build(rich, { sectionStart: 10, onsets: [[14.045, 'm', 9]], onsetThresholds: { m: 2 } });
eq(so.frames.gridStateFrames[0], Math.round((4.045 + so.frames.delta) * 30));
ok(so.snapLog.some(l => l.beat === 8 && l.reason === 'onset'));
eq(build(rich, { sectionStart: 10, onsets: [[14.045, 'm', 9]], onsetThresholds: { m: 2 }, bundled: true }).frames.gridStateFrames[0], 120);

// Photos: about a third of the montage + ending slots, spread out, one use each, deterministic.
for (const seed of ['s1', 's2', 's3', 's4', 's5', 's6']) for (const n of [6, 8, 12]) {
  const cands = rich.concat(photoSet(10));
  const r = j(P.stPlanBuild({ candidates: cands, bpm: 120, fps: 30, montageShots: n, seed }));
  checkPlan(r, cands, 30, 'share ' + seed + '/' + n);
  eq(r.photoShots, Math.round((n + 3) / 3), 'a third of ' + (n + 3) + ' flow slots');
  ok(maxFlowRun(r) <= 1, 'photo slots are spread out');
  eq(r.reusedPhotos, 0);
  const ids = r.picks.main.concat(r.picks.grid).filter(p => p.kind === 'photo').map(p => p.rid);
  eq(new Set(ids).size, ids.length, 'one use per photo');
  eq(j(P.stPlanBuild({ candidates: cands, bpm: 120, fps: 30, montageShots: n, seed })), r, 'deterministic');
}
eq(build(rich.concat(photoSet(10)), { photoShare: 0 }).photoShots, 0, 'photoShare 0 turns photo slots off');
eq(build(rich.concat(photoSet(2))).photoShots, 2, 'fewer photos than the share: every photo is used');
// Mixed footage short on video: at most two photos in a row while video fits.
for (const seed of ['s1', 's2', 's3']) for (const n of [6, 8, 12]) {
  const cands = collapsed.concat(photoSet(22));
  const r = j(P.stPlanBuild({ candidates: cands, bpm: 120, fps: 30, montageShots: n, seed }));
  checkPlan(r, cands, 30, 'mixed ' + seed + '/' + n);
  ok(r.photoShots >= Math.round((n + 3) / 3));
  ok(maxFlowRun(r) <= 2, 'never more than two photos in a row');
  eq(r.photoRunRelaxed, false);
}
// Grid panels may be photos when videos run short: two long videos and photos.
const gp = build([hit('v1', 'opener', { sourceDuration: 40 }), hit('v2', 'place', { sourceDuration: 40 })].concat(photoSet(12)));
checkPlan(gp, [hit('v1', 'opener', { sourceDuration: 40 }), hit('v2', 'place', { sourceDuration: 40 })], 30, 'grid photos');
ok(gp.picks.grid.every(p => p.kind === 'photo'));

// Photo motions: montage photos keyed by Main index, ending photos keyed by ending index; never the same family twice
// in a row over the whole sequence; opener, place and grid photos stay still.
const fam = m => (m.startsWith('drift-') ? 'drift' : m);
for (const seed of ['s1', 's2', 's3']) {
  const r = j(P.stPlanBuild({ candidates: photoSet(24), bpm: 120, fps: 30, montageShots: 8, seed, sizes: { p03: { width: 1080, height: 1920 } } }));
  const n = r.montageShots, main = r.picks.main;
  const mKeys = Object.keys(r.motions).map(Number), eKeys = Object.keys(r.endingMotion).map(Number);
  eq(mKeys, main.map((p, i) => i).filter(i => i >= 2 && i < 2 + n && main[i].kind === 'photo'));
  eq(eKeys, [0, 1, 2].filter(k => main[2 + n + k].kind === 'photo'));
  const seq = mKeys.map(k => r.motions[k]).concat(eKeys.map(k => r.endingMotion[k]));
  ok(seq.length === n + 3);
  for (let i = 1; i < seq.length; i++) ok(fam(seq[i].motion) !== fam(seq[i - 1].motion), 'no family twice in a row');
  for (const m of seq) ok([1, -1].includes(m.direction) && ['x', 'y'].includes(m.axis));
  const i3 = main.findIndex(p => p.rid === 'p03');
  const m3 = r.motions[i3] || r.endingMotion[i3 - 2 - n];
  if (m3) eq(m3.axis, 'y', 'portrait photo drifts vertically');
}
eq(j(P.stPhotoMotions([{ rid: 'v', kind: 'video', role: 'montage' }, { rid: 'p', kind: 'photo', role: 'opener' }], 's', {})), { motions: {}, endingMotion: {} });
// Motion axis on the 16:9 canvas: a photo narrower than 16:9 is cropped top and bottom and moves along y; 16:9, wider
// and unknown sizes move along x.
{
  const axisOf = size => P.stPhotoMotions([{ rid: 'a', kind: 'video', role: 'opener' }, { rid: 'b', kind: 'video', role: 'place' }, { rid: 'p', kind: 'photo', role: 'montage' }, { rid: 'e1', kind: 'video', role: 'ending' }, { rid: 'e2', kind: 'video', role: 'ending' }, { rid: 'e3', kind: 'video', role: 'ending' }], 's', size ? { p: size } : {}).motions[2].axis;
  eq(axisOf({ width: 1080, height: 1920 }), 'y', '9:16');
  eq(axisOf({ width: 1440, height: 1080 }), 'y', '4:3');
  eq(axisOf({ width: 3000, height: 2000 }), 'y', '3:2');
  eq(axisOf({ width: 1080, height: 1080 }), 'y', 'square');
  eq(axisOf({ width: 1920, height: 1080 }), 'x', '16:9');
  eq(axisOf({ width: 3840, height: 1646 }), 'x', '21:9');
  eq(axisOf(null), 'x', 'unknown size');
  // A drift on a 4:3 photo is vertical.
  for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
    const m = P.stPhotoMotions([{ rid: 'p', kind: 'photo', role: 'montage' }, { rid: 'v', kind: 'video', role: 'ending' }, { rid: 'w', kind: 'video', role: 'ending' }, { rid: 'x', kind: 'video', role: 'ending' }], seed, { p: { width: 1440, height: 1080 } }).motions[0];
    if (m.motion.startsWith('drift-')) ok(m.motion === 'drift-up' || m.motion === 'drift-down', '4:3 drift is vertical: ' + m.motion);
  }
}

// Build progress (as City Weekend Vlog).
eq(P.ST_BUILD_STEPS.length, 5);
eq(P.ST_BUILD_STEPS.reduce((x, s) => x + s.weight, 0), 100);
eq(P.stProgress('shots', 0).label, 'Step 1/5 · Choosing shots · 0%');
eq(P.stProgress('shots', 0.5, '12/24 clips checked').label, 'Step 1/5 · Choosing shots (12/24 clips checked) · 20%');
eq(P.stProgress('draft', 0).percent, 50);
eq(P.stProgress('draft', 0).current, 2);
eq(P.stProgress('open', 0.99).percent, 99);
eq(P.stProgress('open', 1).percent, 100);
eq(P.stProgress('music', 7).percent, 50, 'fraction is clamped');
let last = -1;
for (const s of P.ST_BUILD_STEPS) for (const f of [0, 0.5, 1]) { const v = P.stProgress(s.id, f).value; ok(v >= last); last = v; }
assert.throws(() => P.stProgress('nope', 0)); checks++;

console.log(JSON.stringify({ allocate: 'ok', checks }));
