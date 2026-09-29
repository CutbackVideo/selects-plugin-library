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
assert.deepEqual(Object.keys(cap).sort(), ['beatsPerShot', 'fillerShots', 'fittedByMusic', 'ok', 'overridden', 'photoShots', 'picks', 'requested', 'schedule', 'shotSeconds', 'shots']);
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
