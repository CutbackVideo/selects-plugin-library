// plugins/mini-vlog/tests/allocate.test.cjs
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const box = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON };
vm.createContext(box);
vm.runInContext(fs.readFileSync(path.join(root, 'planner.js'), 'utf8') + ';globalThis.P={mvAllocate,mvPlanBuild,mvFillers,mvHash,mvProgress,mvSchedule,MV_BUILD_STEPS,MV_ROLES};', box);
const P = box.P, j = v => JSON.parse(JSON.stringify(v));
const F = 30000 / 1001;
const ROLES = j(P.MV_ROLES);

// Helpers (brief): mk(rid, role, t, score) -> a video hit; photo(rid) -> a photo candidate.
const mk = (rid, role, t, score, sourceDuration = 60) => ({ rid, role, t, score, sourceDuration });
const photo = rid => ({ rid, kind: 'photo' });
const photos = (n, prefix = 'p') => Array.from({ length: n }, (_, i) => photo(prefix + String(i).padStart(2, '0')));
// A long video with hits for every role, spread out so the windows never collide.
const video = (rid, score = 0.5, dur = 60) => {
  const out = [];
  for (let k = 0; k * 1.5 + 1 < dur - 1; k++) out.push(mk(rid, ROLES[k % ROLES.length], 1 + k * 1.5, score, dur));
  return out;
};
const slotsOf = (n, seconds = 0.55) => Array.from({ length: n }, (_, i) => ({ index: i, role: ROLES[i % ROLES.length], seconds }));
const adjacent = picks => picks.some((p, i) => i > 0 && p && picks[i - 1] && p.rid === picks[i - 1].rid);
const maxRun = picks => { let run = 0, best = 0; for (const p of picks) { run = p && p.kind === 'photo' ? run + 1 : 0; best = Math.max(best, run); } return best; };
const plan = (candidates, extra = {}) => j(P.mvPlanBuild({ candidates, bpm: 108, accepted: true, fps: F, pace: 'quick', requested: 12, seed: 's1', ...extra }));

// 1) Strict adjacency: two videos only, 12 slots -> filled, alternating sources.
const two = video('a').concat(video('b'));
for (const seed of ['s1', 's2', 's3']) {
  const r = j(P.mvAllocate({ candidates: two, slots: slotsOf(12), seed }));
  assert.equal(r.missing, 0); assert.equal(r.filled, 12);
  assert.ok(!adjacent(r.picks), 'no two shots in a row from one source');
  r.picks.forEach((p, i) => { if (i > 1) assert.equal(p.rid, r.picks[i - 2].rid, 'two sources alternate'); });
  assert.deepEqual(Object.keys(r).sort(), ['filled', 'fillerShots', 'missing', 'photoShots', 'picks']);
}
const twoPlan = plan(two);
assert.equal(twoPlan.ok, true); assert.equal(twoPlan.shots, 12); assert.ok(!adjacent(twoPlan.picks));
// The previous source is excluded from every tier: its only preferred hit loses to another source's filler, and with
// a single source the second slot stays empty (no relaxation).
const twoSrc = [mk('a', 'street', 5, 0.9, 30), mk('a', 'street', 20, 0.9, 30), mk('b', 'park', 5, 0.5, 30)];
const street = i => ({ index: i, role: 'street', seconds: 1.2 });
assert.deepEqual(j(P.mvAllocate({ candidates: twoSrc.concat(P.mvFillers(twoSrc)), slots: [street(0), street(1)], seed: 'x' })).picks.map(p => p.rid), ['a', 'b']);
const oneSrc = j(P.mvAllocate({ candidates: [mk('a', 'street', 5, 0.5, 30), mk('a', 'street', 20, 0.5, 30)], slots: [street(0), street(1)], seed: 'x' }));
assert.equal(oneSrc.picks[0].rid, 'a'); assert.equal(oneSrc.picks[1], null); assert.equal(oneSrc.missing, 1);

// 2) One resource: every candidate from rid 'a' (however many hits) -> one-resource.
const solo = plan(video('a'));
assert.equal(solo.ok, false); assert.equal(solo.reason, 'one-resource');
assert.equal(plan(photos(1)).reason, 'one-resource');
assert.equal(plan([]).reason, 'one-resource');
assert.equal(plan(photos(1).concat(photos(1))).reason, 'one-resource', 'duplicate rids count once');

// 3) Photo run: 3 videos + 10 photos, 24 slots -> a third photos, never 3 in a row.
const three = video('a').concat(video('b'), video('c'));
for (const seed of ['s1', 's2', 's3', 's4', 's5', 's6']) {
  const r = j(P.mvAllocate({ candidates: three.concat(photos(10)), slots: slotsOf(24), seed }));
  assert.equal(r.missing, 0);
  assert.equal(r.photoShots, Math.round(24 / 3)); assert.equal(r.photoShots, 8);
  assert.ok(maxRun(r.picks) <= 2, 'at most two photos in a row');
  assert.ok(!adjacent(r.picks));
  const ids = r.picks.filter(p => p.kind === 'photo').map(p => p.rid);
  assert.equal(new Set(ids).size, ids.length, 'one use per photo');
  r.picks.filter(p => p.kind === 'photo').forEach(p => assert.deepEqual(Object.keys(p).sort(), ['holdSeconds', 'kind', 'rid', 'slot']));
}
// photoShare 0: no photo slots; plenty of real hits then need no photo.
assert.equal(j(P.mvAllocate({ candidates: three.concat(photos(10)), slots: slotsOf(24), seed: 's1', photoShare: 0 })).photoShots, 0);
// Fewer photos than the share: every photo is used, no more.
assert.equal(j(P.mvAllocate({ candidates: three.concat(photos(3)), slots: slotsOf(24), seed: 's1' })).photoShots, 3);
// No photo candidates: photo slots fall back to videos.
assert.equal(j(P.mvAllocate({ candidates: three, slots: slotsOf(24), seed: 's1' })).missing, 0);
// The run rule is strict: in the role-and-score order (spread: false, where a photo ranks before fillers) fillers of
// one video and photos on a strip of street slots go P P v P P v P (the third photo never comes, even where a photo
// slot would want it).
const strip = Array.from({ length: 7 }, (_, i) => street(i));
const onlyFillers = P.mvFillers([mk('v', 'park', 5, 0.5, 60)]);
for (const seed of ['x', 'y', 'z']) {
  const st = j(P.mvAllocate({ candidates: onlyFillers.concat(photos(10)), slots: strip, seed, spread: false }));
  assert.deepEqual(st.picks.map(p => p.kind), ['photo', 'photo', 'video', 'photo', 'photo', 'video', 'photo']);
  assert.equal(st.photoShots, 5); assert.equal(st.fillerShots, 2);
  // Variety first (default): outside photo slots a photo is the last resort, so the one video alternates with photos.
  const sp = j(P.mvAllocate({ candidates: onlyFillers.concat(photos(10)), slots: strip, seed }));
  assert.equal(sp.missing, 0); assert.ok(maxRun(sp.picks) <= 2 && !adjacent(sp.picks));
}
// With the video out of room the run limit still holds: the slot stays empty instead.
const shortStrip = j(P.mvAllocate({ candidates: [mk('v', 'street', 0.6, 0.5, 1.9)].concat(photos(10)), slots: strip.map(s => ({ ...s, seconds: 1.2 })), seed: 'x', photoShare: 0 }));
assert.ok(maxRun(shortStrip.picks) <= 2);
assert.ok(shortStrip.missing > 0);

// 4) Photo-only pool: no run limit, adjacency still holds. Each photo holds one slot (as in CWV), so 6 photos fill 6
// slots; asked for 12 the plan shrinks to the 4 shots they can hold.
const po6 = j(P.mvAllocate({ candidates: photos(6), slots: slotsOf(6), seed: 's1' }));
assert.equal(po6.missing, 0); assert.equal(po6.photoShots, 6); assert.equal(maxRun(po6.picks), 6); assert.ok(!adjacent(po6.picks));
const poPlan = plan(photos(6), { requested: 12 });
assert.equal(poPlan.ok, true); assert.equal(poPlan.shots, 4); assert.equal(maxRun(poPlan.picks), 4); assert.ok(!adjacent(poPlan.picks));
assert.equal(poPlan.photoShots, 4); assert.equal(poPlan.fillerShots, 0);
const po24 = plan(photos(24), { requested: 24 });
assert.equal(po24.ok, true); assert.equal(po24.shots, 24); assert.equal(maxRun(po24.picks), 24);
po24.picks.forEach((p, i) => { const sl = po24.schedule.slots[i]; assert.ok(Math.abs(p.holdSeconds - (sl.endFrame - sl.startFrame) / F) < 1e-9); });
// A photo cannot hold longer than the 5 s an image source lasts.
assert.equal(j(P.mvAllocate({ candidates: photos(1), slots: [{ index: 0, role: 'drink', seconds: 5.5 }], seed: 'x' })).picks[0], null);

// 5) Shrink: supply that fills only 13 slots under the strict rules -> 12 shots.
// One strong long video plus six one-window clips (1.2 s: a second 0.55 s window never fits with the 0.5 s gap). The
// best any order can do is a s a s ... a = 13, so 16 fails and 12 fits.
const singles = Array.from({ length: 6 }, (_, i) => ROLES.map(role => mk('s' + i, role, 0.6, 0.1, 1.2))).flat();
const shrink = plan(video('a', 1).concat(singles), { requested: 16 });
assert.equal(shrink.ok, true); assert.equal(shrink.shots, 12); assert.equal(shrink.requested, 16);
assert.equal(shrink.fittedByMusic, false, 'the footage shrank it, not the music');
assert.ok(!adjacent(shrink.picks));
assert.equal(shrink.picks.filter(p => p.rid === 'a').length, 6);
// The same with photos: 13 photos only.
const shrinkP = plan(photos(13), { requested: 16 });
assert.equal(shrinkP.ok, true); assert.equal(shrinkP.shots, 12);
// Fewer than 4: too-few, with the shots the 4-slot attempt managed.
const tooFew = plan([mk('a', 'drink', 0.6, 0.5, 1.2), mk('b', 'street', 0.6, 0.5, 1.2)]);
assert.equal(tooFew.ok, false); assert.equal(tooFew.reason, 'too-few'); assert.equal(tooFew.usableShots, 2);
assert.equal(plan(photos(3)).reason, 'too-few');

// 6) Music cap: requested 36, Relaxed, weekend-indie-pop (111.99 bpm, firstBeat 0.027, usableEnd 34.82) -> 32 shots.
const rich = []; for (let r = 0; r < 12; r++) rich.push(...video('r' + r, 0.5 + (r % 5) / 10, 90));
const cap = j(P.mvPlanBuild({ candidates: rich, bpm: 111.99, accepted: true, fps: F, pace: 'relaxed', requested: 36, sectionStart: 0.027, usableEnd: 34.82, seed: 's1' }));
assert.equal(cap.ok, true);
assert.equal(cap.shots, 32); assert.equal(cap.requested, 36); assert.equal(cap.fittedByMusic, true);
assert.equal(cap.beatsPerShot, 2); assert.equal(cap.overridden, false);
assert.ok(Math.abs(cap.shotSeconds - 120 / 111.99) < 1e-12);
assert.equal(cap.picks.length, 32); assert.equal(cap.schedule.slots.length, 32); assert.equal(cap.schedule.gridded, true);
assert.ok(0.027 + cap.schedule.totalFrames / F <= 34.82 + 1 / F, 'the picture never outruns the music');
assert.deepEqual(Object.keys(cap).sort(), ['attempt', 'beatsPerShot', 'fillerShots', 'fittedByMusic', 'ok', 'overridden', 'photoShots', 'picks', 'requested', 'schedule', 'shotSeconds', 'shots']);
// Quick at the same start fits all 36.
const capQ = j(P.mvPlanBuild({ candidates: rich, bpm: 111.99, accepted: true, fps: F, pace: 'quick', requested: 36, sectionStart: 0.027, usableEnd: 34.82, seed: 's1' }));
assert.equal(capQ.shots, 36); assert.equal(capQ.fittedByMusic, false);
// Music too short for even 4 shots.
const tooShort = j(P.mvPlanBuild({ candidates: rich, bpm: 111.99, accepted: true, fps: F, pace: 'relaxed', requested: 12, sectionStart: 30, usableEnd: 34, seed: 's1' }));
assert.equal(tooShort.ok, false); assert.equal(tooShort.reason, 'music-too-short'); assert.equal(tooShort.usableShots, 0);
// Pace guard: Quick at 158 bpm uses 2 beats.
const fast = j(P.mvPlanBuild({ candidates: rich, bpm: 158, accepted: true, fps: F, pace: 'quick', requested: 12, seed: 's1' }));
assert.equal(fast.beatsPerShot, 2); assert.equal(fast.overridden, true);
// No usable grid (65 bpm, or not accepted): fixed 0.55 s / 1.10 s shots, no beats.
for (const [bpm, accepted] of [[65, true], [108, false], [null, false]]) {
  const ng = j(P.mvPlanBuild({ candidates: rich, bpm, accepted, fps: F, pace: 'quick', requested: 12, seed: 's1' }));
  assert.equal(ng.ok, true); assert.equal(ng.schedule.gridded, false); assert.equal(ng.shotSeconds, 0.55);
  assert.equal(ng.beatsPerShot, null); assert.equal(ng.overridden, false);
  assert.equal(ng.schedule.totalFrames, Math.round(12 * 0.55 * F));
}
assert.equal(j(P.mvPlanBuild({ candidates: rich, bpm: null, accepted: false, fps: F, pace: 'relaxed', requested: 12, seed: 's1' })).shotSeconds, 1.1);

// No grid with the music cap: 108 bpm not accepted, Relaxed -> fixed 1.10 s shots; 0.3 + 16 x 1.1 = 17.9 <= 20 but
// 0.3 + 20 x 1.1 = 22.3 > 20, so 16 shots.
const ngCap = j(P.mvPlanBuild({ candidates: rich, bpm: 108, accepted: false, fps: F, pace: 'relaxed', requested: 24, sectionStart: 0.3, usableEnd: 20, seed: 's1' }));
assert.equal(ngCap.ok, true); assert.equal(ngCap.shots, 16); assert.equal(ngCap.fittedByMusic, true);
assert.equal(ngCap.shotSeconds, 1.1); assert.equal(ngCap.schedule.gridded, false); assert.equal(ngCap.beatsPerShot, null);
// A non-finite requested length falls back to Standard (24) instead of failing as 'music-too-short'.
for (const requested of [NaN, undefined, Infinity]) {
  const r = j(P.mvPlanBuild({ candidates: rich, bpm: 108, accepted: true, fps: F, pace: 'quick', requested, seed: 's1' }));
  assert.equal(r.ok, true); assert.equal(r.requested, 24); assert.equal(r.shots, 24);
}
// one-resource counts only sources the allocator can use: an invalid video (no duration) does not make a second one.
assert.equal(plan(video('a').concat([{ rid: 'b', role: 'drink', t: 1, score: 0.5 }])).reason, 'one-resource');
assert.equal(plan(video('a').concat([{ rid: 'b', role: 'drink', t: NaN, score: 0.5, sourceDuration: 30 }])).reason, 'one-resource');
assert.equal(plan(video('a').concat(photos(1))).reason, 'too-few', 'a video and a photo are two sources (a p a: 3 shots)');
assert.equal(plan(video('a').concat(photos(2)), { requested: 4 }).shots, 4, 'a p a p');

// Scarce video + many photos: the greedy default share spends a video window after every photo outside photo slots and
// strands photos behind the run limit; the plan retries the same length with every slot a photo slot before shrinking.
// (a) Two 2.5 s videos with one centred hit each. The hit window [0.97, 1.53] leaves no room for a second window (0.5 s
// gap each side of a 0.53-0.57 s window), so each video gives one shot and the longest valid order is P P a P P b P P:
// 8 shots.
const scarceA = [mk('a', 'drink', 1.25, 0.5, 2.5), mk('b', 'street', 1.25, 0.5, 2.5)].concat(photos(20));
for (const seed of ['s1', 's2', 's3']) {
  const r = plan(scarceA, { requested: 24, seed });
  assert.equal(r.ok, true); assert.equal(r.shots, 8);
  assert.equal(r.picks.map(p => (p.kind === 'photo' ? 'P' : p.rid)).join(''), 'PPaPPbPP');
  assert.ok(!adjacent(r.picks) && maxRun(r.picks) <= 2);
}
// (b) One 10.5 s video: windows sit on the 0.5 s candidate grid and need >= 1.03 s between starts, so at most 7 fit
// (0, 1.47, 2.97, 4.47, 5.97, 7.47, 8.97); 7 videos separate at most 8 photo pairs -> 23 shots, so 20 is the longest
// multiple of 4 (24 cannot be filled).
const scarceB = [mk('v', 'drink', 5.25, 0.5, 10.5)].concat(photos(20));
for (const seed of ['s1', 's2', 's3']) {
  const r = plan(scarceB, { requested: 24, seed });
  assert.equal(r.ok, true); assert.equal(r.shots, 20);
  assert.ok(!adjacent(r.picks) && maxRun(r.picks) <= 2);
  assert.equal(r.photoShots, 14);
  assert.deepEqual(plan(scarceB, { requested: 24, seed }), r, 'deterministic');
}
assert.equal(plan(scarceB, { requested: 24, photoShare: 1 }).shots, 20);

// Variety first (live Staging: Paris 24 shots from ~15 usable clips used 9 of them, one 6 times). A slot takes an unused
// resource whenever one fits (any role, then photos, then fillers of unused clips) before reusing any; reuse goes to
// the least-used resource first, so use counts differ by at most 1.
// (a) 15 clips, each with hits in only 1-2 roles; one 'drink' clip has the top scores and many windows.
const varied = [];
for (const t of [2, 5, 8, 11, 14, 17]) varied.push(mk('d', 'drink', t, 0.95 + t / 1000, 20));
for (let r = 1; r < 15; r++) {
  const id = 'r' + String(r).padStart(2, '0');
  const rs = r % 3 === 0 ? [ROLES[r % 8]] : [ROLES[r % 8], ROLES[(r + 3) % 8]];
  for (const role of rs) for (const t of [3, 10]) varied.push(mk(id, role, t + rs.indexOf(role) * 0.5, 0.3 + (r % 5) / 20, 15));
}
const useOrder = picks => picks.filter(p => p && p.kind === 'video').map(p => p.rid);
const counts = rids => rids.reduce((m, r) => ((m[r] = (m[r] || 0) + 1), m), {});
for (const seed of ['s1', 's2', 's3', 's4']) {
  const r = j(P.mvAllocate({ candidates: varied, slots: slotsOf(24), seed }));
  assert.equal(r.missing, 0);
  const order = useOrder(r.picks);
  const firstRepeat = order.findIndex((rid, i) => order.indexOf(rid) < i);
  assert.equal(new Set(order.slice(0, 15)).size, 15, 'every clip is used before any is used twice (' + seed + ')');
  assert.equal(firstRepeat, 15);
  const c = Object.values(counts(order));
  assert.equal(c.length, 15);
  assert.ok(Math.max(...c) - Math.min(...c) <= 1, 'reuse is spread: ' + JSON.stringify(counts(order)));
  assert.ok(!adjacent(r.picks));
}
// Through the plan (fillers added): 24 shots from the 15 clips, each used once or twice.
const variedPlan = plan(varied, { requested: 24 });
assert.equal(variedPlan.ok, true); assert.equal(variedPlan.shots, 24);
{ const c = Object.values(counts(useOrder(variedPlan.picks))); assert.equal(c.length, 15); assert.ok(Math.max(...c) - Math.min(...c) <= 1); }
// (b) A daily-like Project: 30 clips of 3-20 s with hits in 1-2 roles (a few strong drink clips) + 8 photos, 12 shots
// -> 12 distinct resources.
const daily = [];
for (let r = 0; r < 30; r++) {
  const id = 'c' + String(r).padStart(2, '0'), dur = 3 + (r * 7) % 18;
  const rs = r < 4 ? ['drink'] : [ROLES[(r * 5) % 8], ROLES[(r * 3 + 1) % 8]];
  for (const role of rs) for (let k = 0; k < 1 + (r % 3); k++) {
    const t = Math.min(dur - 0.5, 0.8 + k * 2.2 + rs.indexOf(role) * 0.3);
    daily.push(mk(id, role, t, r < 4 ? 0.9 : 0.2 + ((r * 13) % 10) / 20, dur));
  }
}
for (const seed of ['1', '2', '3']) {
  const d = plan(daily.concat(photos(8)), { requested: 12, seed });
  assert.equal(d.ok, true); assert.equal(d.shots, 12);
  assert.equal(new Set(d.picks.map(p => p.rid)).size, 12, 'daily: 12 distinct resources (' + seed + ')');
  assert.equal(d.photoShots, 4);
}

// The attempt that built the plan is reported: variety first, then photos first everywhere, then role-first.
assert.equal(cap.attempt, 'spread');
assert.equal(plan(scarceA, { requested: 24 }).attempt, 'spread-share1');
assert.equal(shrink.attempt, 'role-first', 'case 5 needs the role-first order for 12 shots');
assert.equal(plan(scarceB, { requested: 24, photoShare: 1 }).attempt, 'spread', 'a requested share of 1 has no share-1 retry');

// Long sources: fillers are capped at MV_FILLER_MAX (48) per source, an even subset of the 0.5 s grid with both edges;
// sources up to 24 s keep the full grid.
const fillT = d => j(P.mvFillers([mk('a', 'drink', 1, 1, d)])).map(x => x.t);
assert.equal(fillT(24).length, 48); assert.equal(fillT(24)[47], 23.75);
for (const d of [24.5, 90, 600, 3600]) {
  const t = fillT(d);
  assert.equal(t.length, 48); assert.equal(t[0], 0.25);
  assert.equal(t[47], 0.25 + Math.floor((d - 0.5 + 1e-9) / 0.5) * 0.5, 'last window kept (' + d + ')');
  t.forEach((x, i) => { assert.ok(Math.abs((x - 0.25) / 0.5 - Math.round((x - 0.25) / 0.5)) < 1e-9, 'on the grid'); if (i) assert.ok(x > t[i - 1]); });
}
// ... so the panel's readiness check (two plans) stays fast on an hour-long clip, a 1 s clip and photos, where every
// length fails and all attempts run (live review: 5.0 s before the cap). Generous bound for CI.
{
  for (const [np, expect] of [[0, 'too-few'], [2, 4], [8, 16]]) {
    const longPool = [mk('L', 'drink', 100, 0.5, 3600), mk('s', 'street', 0.5, 0.5, 1)].concat(photos(np));
    const t0 = Date.now();
    let r;
    for (const requested of [24, 36]) r = plan(longPool, { requested });
    const ms = Date.now() - t0;
    assert.ok(ms < 1000, 'long source plans in ' + ms + ' ms (' + np + ' photos)');
    assert.equal(r.ok ? r.shots : r.reason, expect);
  }
}

// Windows stay in their source, have the slot's length and never overlap (with the gap) within one source.
const spans = {};
cap.picks.forEach((p, i) => {
  const sl = cap.schedule.slots[i];
  if (p.kind !== 'video') return;
  assert.ok(p.startSeconds >= 0 && p.endSeconds <= 90);
  assert.ok(Math.abs((p.endSeconds - p.startSeconds) - (sl.endFrame - sl.startFrame) / F) < 1e-9);
  (spans[p.rid] = spans[p.rid] || []).push([p.startSeconds, p.endSeconds]);
});
for (const list of Object.values(spans)) { list.sort((x, y) => x[0] - y[0]); for (let i = 1; i < list.length; i++) assert.ok(list[i][0] >= list[i - 1][1] + 0.5 - 1e-9); }
// Plenty of real hits: fillers never leak in.
assert.equal(cap.fillerShots, 0);

// 7) Determinism: same seed -> identical picks; another seed -> other picks for a 4-video pool.
const four = video('a').concat(video('b'), video('c'), video('d'));
const d1 = plan(four, { seed: '1', requested: 24 }), d1b = plan(four, { seed: '1', requested: 24 }), d2 = plan(four, { seed: '2', requested: 24 });
assert.equal(d1.ok, true);
assert.deepEqual(d1b, d1);
assert.notDeepEqual(d2.picks, d1.picks);

// Tiers on single slots: preferred role (with its fallbacks) > any real hit > photo > filler.
const one = (cands, slot) => j(P.mvAllocate({ candidates: cands, slots: [slot], seed: 'x', photoShare: 0 })).picks[0];
const drinkSlot = { index: 0, role: 'drink', seconds: 1.2 };
assert.equal(one([mk('a', 'street', 5, 1, 30), mk('b', 'drink', 5, 0, 30)], drinkSlot).rid, 'b', 'the slot role beats a higher score');
assert.equal(one([mk('a', 'street', 5, 1, 30), mk('b', 'cafe', 5, 0, 30)], drinkSlot).rid, 'b', 'a fallback role beats any other role');
assert.equal(one([mk('a', 'food', 5, 0.9, 30), mk('b', 'cafe', 5, 0.9, 30)], drinkSlot).rid, 'b', 'cafe is the first fallback for drink');
assert.equal(one([mk('v', 'street', 5, 0.01, 30), photo('p')], drinkSlot).rid, 'v', 'any real hit beats a photo');
// Outside photo slots a filler of an unused clip beats a photo (variety first keeps the photo share); in the
// role-and-score order (spread: false) the photo beats fillers.
assert.equal(one(P.mvFillers([mk('v', 'street', 5, 0.5, 30)]).concat([photo('p')]), drinkSlot).rid, 'v', 'an unused filler beats a photo');
assert.equal(j(P.mvAllocate({ candidates: P.mvFillers([mk('v', 'street', 5, 0.5, 30)]).concat([photo('p')]), slots: [drinkSlot], seed: 'x', photoShare: 0, spread: false })).picks[0].rid, 'p', 'a photo beats fillers without spread');
// A photo slot puts photos first.
assert.equal(j(P.mvAllocate({ candidates: [mk('v', 'drink', 5, 1, 30), photo('p')], slots: [drinkSlot], seed: 'x', photoShare: 1 })).picks[0].rid, 'p');
// Non-finite candidate fields are ignored.
assert.equal(j(P.mvAllocate({ candidates: [mk('a', 'drink', NaN, 1, 30), mk('b', 'drink', 5, Infinity, 30)], slots: [drinkSlot], seed: 'x' })).filled, 0);
// A real hit is centred in its window.
assert.ok(Math.abs(one([mk('a', 'park', 7, 0.05, 20)], drinkSlot).startSeconds - 6.4) < 1e-9);
// A window near the end of its source ends MV_SOURCE_TAIL (0.15 s) before it: at the Draft's real rate a slot can grow
// by about 1/30 + 1/fps s and Selects caps a source at its whole frames (live d-lofi at 23.976 fps), so a source must
// hold the slot plus that margin. Video picks carry their sourceDuration so assemble.js can keep the window inside.
const nearEnd = one([mk('a', 'drink', 19.5, 1, 20)], drinkSlot);
assert.ok(Math.abs(nearEnd.endSeconds - (20 - 0.15)) < 1e-9, 'ends 0.15 s before the source end');
assert.equal(nearEnd.sourceDuration, 20);
assert.equal(j(P.mvAllocate({ candidates: [mk('a', 'drink', 0.6, 1, 1.3)], slots: [drinkSlot], seed: 'x', photoShare: 0 })).filled, 0, 'a source only 0.1 s longer than the slot is skipped');
assert.equal(j(P.mvAllocate({ candidates: [mk('a', 'drink', 0.6, 1, 1.35)], slots: [drinkSlot], seed: 'x', photoShare: 0 })).filled, 1);
// Filler grid: every 0.5 s from 0.25 s to duration - 0.25 s, per source, in rid order.
const grid = j(P.mvFillers([mk('b', 'street', 1, 1, 2), mk('a', 'park', 1, 1, 1.1)]));
assert.deepEqual(grid.map(g => g.rid + '@' + g.t), ['a@0.25', 'a@0.75', 'b@0.25', 'b@0.75', 'b@1.25', 'b@1.75']);
assert.ok(grid.every(g => g.role === 'filler' && g.score < 0));

// ---- Groove (spec 15.1) ----
// 8th slots (videoOnly) never take a photo; the photo share counts only >= 1-beat slots.
const halfSlots = slotsOf(16).map((s, i) => (i === 7 || i === 8 ? { ...s, seconds: 0.28, videoOnly: true } : s));
for (const seed of ['s1', 's2', 's3', 's4']) {
  const r = j(P.mvAllocate({ candidates: three.concat(photos(10)), slots: halfSlots, seed, photoShare: 1 }));
  assert.equal(r.missing, 0);
  assert.equal(r.picks[7].kind, 'video'); assert.equal(r.picks[8].kind, 'video');
  assert.ok(!adjacent(r.picks) && maxRun(r.picks) <= 2);
  const d = j(P.mvAllocate({ candidates: three.concat(photos(10)), slots: halfSlots, seed }));
  assert.equal(d.photoShots, Math.round(14 / 3), 'share over the 14 >= 1-beat slots');
}
// A photo-only pool cannot fill an 8th slot.
assert.equal(j(P.mvAllocate({ candidates: photos(4), slots: [{ index: 0, role: 'drink', seconds: 0.28, videoOnly: true }], seed: 'x' })).missing, 1);

const groove = (candidates, extra = {}) => j(P.mvPlanBuild({ candidates, bpm: 108, accepted: true, fps: F, pace: 'groove', requested: 24, seed: 's1', ...extra }));
const beatsOf = r => r.schedule.slots.map(s => s.beats);
// Standard, no music section: 24 beats, pattern splits (beats 7, 15 and the final beat 23) -> 25 shots.
const gStd = groove(rich.concat(photos(10)));
assert.equal(gStd.ok, true); assert.equal(gStd.shots, 25); assert.equal(gStd.picks.length, 25);
assert.deepEqual(beatsOf(gStd), [2, 1, 1, 1, 1, 1, 0.5, 0.5, 1, 1, 1, 1, 1, 1, 1, 0.5, 0.5, 2, 1, 1, 1, 1, 1, 0.5, 0.5]);
assert.deepEqual(gStd.groove, { beats: 24, requestedBeats: 24, splits: [7, 15, 23], fillSource: 'pattern', ratios: [], beatSeconds: 60 / 108, opener: 2 });
assert.equal(gStd.beatsPerShot, null); assert.equal(gStd.overridden, false); assert.equal(gStd.fittedByMusic, false);
assert.equal(gStd.schedule.totalFrames, 400);
assert.ok(!adjacent(gStd.picks) && maxRun(gStd.picks) <= 2);
gStd.schedule.slots.forEach((s, i) => { if (s.beats < 1) assert.equal(gStd.picks[i].kind, 'video'); });
assert.deepEqual(Object.keys(gStd).sort(), ['attempt', 'beatsPerShot', 'fillerShots', 'fittedByMusic', 'groove', 'ok', 'overridden', 'photoShots', 'picks', 'requested', 'schedule', 'shotSeconds', 'shots']);
assert.equal(gStd.shotSeconds, null);
// Windows have the slot's length at the plan's rate and stay 0.15 s inside their source.
gStd.picks.forEach((p, i) => {
  const sl = gStd.schedule.slots[i];
  if (p.kind === 'video') { assert.ok(Math.abs((p.endSeconds - p.startSeconds) - (sl.endFrame - sl.startFrame) / F) < 1e-9); assert.ok(p.endSeconds <= p.sourceDuration - 0.15 + 1e-9); }
});
assert.deepEqual(groove(rich.concat(photos(10))), gStd, 'deterministic');
// Short and Long spans; a detected fill (onsets) replaces the pattern within its class (phrase ends here).
assert.deepEqual(beatsOf(groove(rich, { requested: 12 })), [2, 1, 1, 1, 1, 1, 0.5, 0.5, 2, 1, 0.5, 0.5]);
assert.equal(groove(rich, { requested: 36 }).shots, 38);
{
  const B = 60 / 108, on = [];
  for (let k = 0; k < 32; k++) for (let i = 0; i < (k === 31 ? 3 : 2); i++) on.push([2 + k * B + i * B / 4, 'm', 5]);
  const gf = groove(rich, { requested: 36, sectionStart: 2, usableEnd: 60, onsets: on, onsetThresholds: { l: 3, m: 3, h: 3 } });
  assert.deepEqual(gf.groove.splits, [7, 23, 31]); assert.equal(gf.groove.fillSource, 'mixed');
  assert.deepEqual(gf.groove.ratios, [1, 1, 1, 1.5, 0], 'density / median per candidate (7, 15, 23, 31, 35)');
  assert.equal(gf.shots, 36);
  assert.deepEqual(beatsOf(gf).slice(15, 18), [1, 2, 1], "beat 15 stays whole, then the phrase opener");
}
// Music capacity on beats: 22 beats of music from the start -> 20 beats (21 shots), fitted by the music.
const gCap = groove(rich, { requested: 36, sectionStart: 0, usableEnd: 22 * 60 / 108 });
assert.equal(gCap.ok, true); assert.equal(gCap.groove.beats, 20); assert.equal(gCap.shots, 21); assert.equal(gCap.fittedByMusic, true);
assert.equal(groove(rich, { sectionStart: 0, usableEnd: 3 * 60 / 108 }).reason, 'music-too-short');
// Footage shrink goes by whole bars: four 1.2 s one-window clips + photos fill 8 beats (P P a P P b c d: the 8ths need
// two clips) but not 12 (its 12 slots need 6 clips: two to break photo runs, four for the 8ths).
const gSmall = groove(['a', 'b', 'c', 'd'].map((rid, i) => mk(rid, ROLES[i], 0.6, 0.5, 1.2)).concat(photos(10)));
assert.equal(gSmall.ok, true); assert.equal(gSmall.groove.beats, 8); assert.equal(gSmall.shots, 8);
assert.deepEqual(gSmall.picks.slice(6).map(p => p.kind), ['video', 'video']);
assert.equal(groove(video('a')).reason, 'one-resource');
// The shortest Groove span is one bar (4 shots, MV_MIN_SHOTS): 6 beats of music still build ...
const gBar = groove(rich, { requested: 12, sectionStart: 0, usableEnd: 6 * 60 / 108 });
assert.equal(gBar.ok, true); assert.equal(gBar.groove.beats, 4); assert.equal(gBar.shots, 4); assert.equal(gBar.fittedByMusic, true);
assert.deepEqual(beatsOf(gBar), [2, 1, 0.5, 0.5]);
// ... and three 2.5 s clips (too few windows for the 8 shots of two bars; with an 8-beat minimum this was 'too-few',
// usableShots 5) fill a one-bar Groove.
const g3 = groove(['a', 'b', 'c'].map((rid, i) => mk(rid, ROLES[i], 1.25, 0.5, 2.5)));
assert.equal(g3.ok, true); assert.equal(g3.groove.beats, 4); assert.equal(g3.shots, 4); assert.ok(!adjacent(g3.picks));
// Fillers cover 8th slots: two videos with a single hit each still fill a phrase with its split.
const gFill = groove([mk('a', 'drink', 10, 0.5, 30), mk('b', 'street', 10, 0.5, 30)], { requested: 16 });
assert.equal(gFill.ok, true); assert.ok(gFill.fillerShots > 0); assert.ok(!adjacent(gFill.picks));
assert.ok(gFill.schedule.slots.some(s => s.beats === 0.5));
// A photo-only pool never gets an 8th split (photos cannot take one).
const gPo = groove(photos(24));
assert.equal(gPo.ok, true); assert.ok(gPo.schedule.slots.every(s => s.beats >= 1)); assert.deepEqual(gPo.groove.splits, []); assert.equal(gPo.groove.fillSource, 'no-video');
// No grid: the same pattern on 0.55 s beats.
const gNg = groove(rich, { bpm: null, accepted: false });
assert.equal(gNg.ok, true); assert.equal(gNg.schedule.gridded, false); assert.equal(gNg.shots, 25);
assert.equal(gNg.groove.beatSeconds, 0.55); assert.equal(gNg.schedule.totalFrames, Math.round(24 * 0.55 * F));
assert.equal(gNg.schedule.slots[15].endFrame - gNg.schedule.slots[15].startFrame, Math.round(15.5 * 0.55 * F) - Math.round(15 * 0.55 * F));
// Below 85.71 bpm the 2-beat opener would exceed 1.40 s: the opener is 1 beat and there are no 2-beat holds
// (Standard -> 20 beats / 23 shots, splits 7, 15, 19).
const gSlow = groove(rich, { bpm: 80 });
assert.equal(gSlow.ok, true); assert.equal(gSlow.overridden, true); assert.equal(gSlow.groove.opener, 1); assert.equal(gSlow.shots, 23);
assert.deepEqual(beatsOf(gSlow).slice(0, 2), [1, 1]); assert.deepEqual(beatsOf(gSlow).slice(7, 10), [0.5, 0.5, 1]); assert.ok(beatsOf(gSlow).every(b => b <= 1));
assert.ok(gSlow.schedule.slots.every(s => (s.endFrame - s.startFrame) / F <= 1.40 + 1 / F));
assert.equal(groove(rich, { bpm: 86 }).schedule.slots[0].beats, 2);
// Above 150 bpm Groove uses 2 beats per shot, like Quick (no 8ths under 0.2 s).
const gFast = groove(rich, { bpm: 158, requested: 12 });
assert.equal(gFast.beatsPerShot, 2); assert.equal(gFast.overridden, true); assert.equal(gFast.shots, 12); assert.ok(!('groove' in gFast));

// First shot on a moving moment (Beat punch: mvMotionBonus tags candidates near a motion hit with `motion` > 0).
// Slot 0 takes the best tagged video window (role rank, then score and jitter, as usual) ahead of its photo slot and the
// normal tiers; the photo share moves to the other slots. Untagged input (Beat punch off, or no usable motion hits)
// allocates exactly as before this rule: the picks below were recorded with the previous planner.
{
  const sig = picks => picks.map(p => (p ? p.rid + (p.kind === 'photo' ? '' : '@' + p.startSeconds.toFixed(2)) : '-')).join(' ');
  const three = video('a').concat(video('b'), video('c'));
  const GOLDEN = {
    s1: 'p00 b@2.23 c@51.73 p01 a@30.73 b@44.23 p02 c@11.22 a@12.72 p03 b@27.73 c@5.22 p04 a@56.23 b@21.73 p05 c@36.73 a@50.23 p06 b@53.23 c@42.73 p07 a@57.73 b@23.23',
    s2: 'b@24.73 p09 a@27.73 c@17.23 p08 b@32.23 a@45.73 p03 c@0.72 b@2.23 p02 a@17.23 c@54.73 p01 b@45.73 a@11.22 p00 c@38.23 b@27.73 p07 a@54.73 c@56.23 p06 b@35.23',
    s3: 'c@36.73 b@38.23 p04 a@53.23 c@54.73 p05 b@45.73 a@47.23 p08 c@50.23 b@51.73 p09 a@30.73 c@56.23 p02 b@47.23 a@48.73 p03 c@51.73 b@53.23 p00 a@44.23 c@45.73 p01',
    s4: 'p09 c@50.23 b@51.73 p08 a@18.73 c@20.23 p05 b@11.22 a@48.73 p04 c@3.73 b@41.23 p07 a@8.22 c@45.73 p06 b@48.73 a@26.23 p01 c@53.23 b@54.73 p00 a@45.73 c@47.23',
  };
  const base = {};
  for (const seed of Object.keys(GOLDEN)) {
    const opts = { candidates: three.concat(photos(10)), slots: slotsOf(24), seed };
    base[seed] = j(P.mvAllocate(opts));
    assert.equal(sig(base[seed].picks), GOLDEN[seed], 'untagged picks unchanged ' + seed);
    assert.deepEqual(j(P.mvAllocate({ ...opts, motionOpener: false })), base[seed], 'motionOpener is a no-op without tags ' + seed);
  }
  // Seeds s1 and s4 open on a photo without motion. Tag one window of c (t 20.5, a transit hit, not a drink role).
  const tagged = three.map(c => (c.rid === 'c' && c.t === 20.5 ? { ...c, score: c.score + 0.1, motion: 1 } : c));
  for (const seed of Object.keys(GOLDEN)) {
    const opts = { candidates: tagged.concat(photos(10)), slots: slotsOf(24), seed };
    const r = j(P.mvAllocate(opts));
    assert.equal(r.missing, 0);
    assert.deepEqual([r.picks[0].rid, r.picks[0].kind, r.picks[0].startSeconds], ['c', 'video', 20.5 - 0.55 / 2], 'slot 0 on the moving window ' + seed);
    assert.equal(r.photoShots, base[seed].photoShots, 'photo share kept ' + seed);
    assert.ok(!adjacent(r.picks) && maxRun(r.picks) <= 2, 'hard rules ' + seed);
    // Fresh first: the 24 slots still use all three clips before reusing one.
    assert.deepEqual(r.picks.filter(p => p.kind === 'video').slice(0, 3).map(p => p.rid).sort(), ['a', 'b', 'c'], 'fresh first ' + seed);
    assert.deepEqual(j(P.mvAllocate(opts)), r, 'deterministic ' + seed);
    // Off: the tags are ignored (only the bonus in the scores remains).
    const off = j(P.mvAllocate({ ...opts, motionOpener: false }));
    if (seed === 's1' || seed === 's4') assert.equal(off.picks[0].kind, 'photo', 'without the opener slot 0 stays a photo ' + seed);
  }
  // Several tagged windows: role rank, then score, decides among them (a drink hit beats a stronger transit hit).
  const two = three.map(c => (c.rid === 'b' && c.t === 13 ? { ...c, motion: 0.5 } : c.rid === 'c' && c.t === 20.5 ? { ...c, score: 0.9, motion: 1 } : c));
  assert.equal(two.find(c => c.rid === 'b' && c.t === 13).role, 'drink');
  assert.deepEqual(j(P.mvAllocate({ candidates: two, slots: slotsOf(24), seed: 's1' })).picks[0].startSeconds, 13 - 0.55 / 2);
  // Tagged windows too short for slot 0 (source tail) or fillers: the normal order applies.
  const short = three.concat([mk('d', 'drink', 1, 0.9, 1.2)].map(c => ({ ...c, motion: 1 })));
  assert.equal(sig(j(P.mvAllocate({ candidates: short.concat(photos(10)), slots: slotsOf(24, 1.5), seed: 's1' })).picks),
    sig(j(P.mvAllocate({ candidates: short.map(({ motion, ...c }) => c).concat(photos(10)), slots: slotsOf(24, 1.5), seed: 's1' })).picks), 'too short: unchanged');
  // Photos only: nothing to open on.
  assert.equal(j(P.mvAllocate({ candidates: photos(6), slots: slotsOf(4), seed: 's1' })).picks[0].kind, 'photo');
}

// The motion opener never costs length: an attempt that misses slots with the opener is retried without it before the
// plan moves on or shrinks (review repro: a tagged window on a 2 s clip turned a 4-shot plan into too-few).
{
  const cands = [mk('v0', 'park', 0.33, 0.5, 2), mk('v0', 'transit', 0.2, 0.5, 2), mk('v0', 'flowers', 0.42, 0.5, 2), mk('v0', 'street', 0.75, 0.5, 2)].concat(photos(5));
  const opts = { bpm: 108, accepted: true, fps: F, pace: 'quick', requested: 12, sectionStart: 0.5, seed: 's1' };
  const untagged = j(P.mvPlanBuild({ candidates: cands, ...opts }));
  assert.equal(untagged.ok, true); assert.equal(untagged.shots, 4);
  const tagged = cands.map(c => (c.role === 'street' ? { ...c, motion: 1 } : c));
  const withOpener = j(P.mvPlanBuild({ candidates: tagged, ...opts }));
  assert.equal(withOpener.ok, true, 'tagged repro still builds'); assert.equal(withOpener.shots, 4);
  assert.match(withOpener.attempt, /-no-opener$/, 'built by the retry without the opener');
  assert.deepEqual(j(P.mvPlanBuild({ candidates: tagged, ...opts, motionOpener: false })).picks, withOpener.picks);
  // Property (fuzz): over sparse random pools, tagging never loses a plan or shots.
  let r = 12345;
  const rnd = () => ((r = (Math.imul(r, 1103515245) + 12345) >>> 0) / 4294967296);
  let built = 0, opened = 0;
  for (let n = 0; n < 250; n++) {
    const pool = [];
    const clips = 1 + Math.floor(rnd() * 3);
    for (let c = 0; c < clips; c++) {
      const dur = 1 + rnd() * 6, hits = 1 + Math.floor(rnd() * 5);
      for (let h = 0; h < hits; h++) pool.push(mk('v' + c, ROLES[Math.floor(rnd() * ROLES.length)], rnd() * dur, 0.2 + rnd() * 0.6, dur));
    }
    const pics = photos(Math.floor(rnd() * 7));
    const tag = pool.map(c => (rnd() < 0.3 ? { ...c, motion: 0.1 + rnd() * 0.9 } : c));
    const o = { bpm: 108, accepted: true, fps: F, pace: rnd() < 0.3 ? 'groove' : rnd() < 0.5 ? 'relaxed' : 'quick', requested: 12, sectionStart: 0.5, seed: 's' + n };
    const off = j(P.mvPlanBuild({ candidates: tag.concat(pics), ...o, motionOpener: false }));
    const on = j(P.mvPlanBuild({ candidates: tag.concat(pics), ...o }));
    if (off.ok) { built++; assert.ok(on.ok, 'ok never lost ' + n); assert.ok(on.shots >= off.shots, 'shots never lost ' + n + ': ' + on.shots + ' < ' + off.shots); }
    else if (on.ok) assert.fail('the opener cannot build what the plain order cannot ' + n);
    if (on.ok && off.ok && on.picks[0] && on.picks[0].kind === 'video' && tag.some(c => c.motion > 0 && c.rid === on.picks[0].rid)) opened++;
  }
  assert.ok(built > 50 && opened > 10, 'fuzz exercised the opener: built ' + built + ', opened ' + opened);
}

// Build progress: step n/total, weighted percent, never backwards, 100% only at the end.
assert.equal(P.MV_BUILD_STEPS.length, 5);
assert.equal(P.MV_BUILD_STEPS.reduce((a, s) => a + s.weight, 0), 100);
assert.equal(P.mvProgress('shots', 0.5, '12/24 clips checked').label, 'Step 1/5 · Choosing shots (12/24 clips checked) · 20%');
assert.equal(P.mvProgress('draft', 0).percent, 50);
assert.equal(P.mvProgress('open', 0.99).percent, 99);
assert.equal(P.mvProgress('music', 7).percent, 50, 'fraction is clamped');
let last = -1;
for (const s of P.MV_BUILD_STEPS) for (const f of [0, 0.5, 1]) { const v = P.mvProgress(s.id, f).value; assert.ok(v >= last); last = v; }
assert.throws(() => P.mvProgress('nope', 0));
console.log(JSON.stringify({ allocate: 'ok' }));
