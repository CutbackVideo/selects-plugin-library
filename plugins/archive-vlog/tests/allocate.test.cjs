// plugins/archive-vlog/tests/allocate.test.cjs
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const box = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON };
vm.createContext(box);
vm.runInContext(fs.readFileSync(path.join(root, 'planner.js'), 'utf8') + ';globalThis.P={avAllocate,avPlanBuild,avFillers,avHash,avProgress,avSchedule,avTemplate,avMontageShots,AV_BUILD_STEPS,AV_ROLES,AV_MONTAGE_ROLES};', box);
const P = box.P, j = v => JSON.parse(JSON.stringify(v));
const F = 30000 / 1001;
const ROLES = j(P.AV_ROLES), MONTAGE = j(P.AV_MONTAGE_ROLES);

// Helpers: mk(rid, role, t, score) -> a video hit; photo(rid) -> a photo candidate.
const mk = (rid, role, t, score, sourceDuration = 60) => ({ rid, role, t, score, sourceDuration });
const photo = rid => ({ rid, kind: 'photo' });
const photos = (n, prefix = 'p') => Array.from({ length: n }, (_, i) => photo(prefix + String(i).padStart(2, '0')));
// A long video with hits for every role, spread out so the windows never collide.
const video = (rid, score = 0.5, dur = 60) => {
  const out = [];
  for (let k = 0; k * 1.5 + 3 < dur - 3; k++) out.push(mk(rid, ROLES[k % ROLES.length], 3 + k * 1.5, score, dur));
  return out;
};
const adjacent = picks => picks.some((p, i) => i > 0 && p && picks[i - 1] && p.rid === picks[i - 1].rid);
const maxRun = picks => { let run = 0, best = 0; for (const p of picks) { run = p && p.kind === 'photo' ? run + 1 : 0; best = Math.max(best, run); } return best; };
const sig = picks => picks.map(p => (p ? p.rid + (p.kind === 'photo' ? '' : '@' + p.startSeconds.toFixed(2)) : '-')).join(' ');
// A Standard plan at 72 bpm (the default cue) at the plan rate of 30 fps.
const plan = (candidates, extra = {}) => j(P.avPlanBuild({ candidates, bpm: 72, accepted: true, fps: 30, pace: 'cinematic', requested: 16, seed: 's1', ...extra }));
const intro = r => [r.picks[0], r.picks[1], r.picks[r.picks.length - 1]];
// Template slots for avAllocate, as avPlanBuild makes them.
const tplSlots = (n = 16, bpm = 72, pace = 'cinematic', fps = 30) => {
  const t = j(P.avTemplate({ bpm, pace, montageShots: n }));
  const s = j(P.avSchedule({ bpm, fps, beatsList: t.beatsList, roles: t.roles }));
  return s.slots.map((x, i) => ({ index: i, role: x.role, seconds: (x.endFrame - x.startFrame) / fps, videoOnly: t.videoOnly[i] }));
};

// 1) Strict adjacency: two videos only -> filled in timeline order, alternating sources, also through the 5 s opening.
// Filling the final shot early (the default) can pick the source the alternation leaves for the slot before it; the
// plan then retries in timeline order.
const two = video('a').concat(video('b'));
for (const seed of ['s1', 's2', 's3']) {
  const r = j(P.avAllocate({ candidates: two, slots: tplSlots(), seed, finalEarly: false }));
  assert.equal(r.missing, 0); assert.equal(r.filled, 19);
  const early = j(P.avAllocate({ candidates: two, slots: tplSlots(), seed }));
  assert.ok(!adjacent(early.picks), 'the early final shot respects both neighbours');
  assert.ok(!adjacent(r.picks), 'no two shots in a row from one source');
  r.picks.forEach((p, i) => { if (i > 1) assert.equal(p.rid, r.picks[i - 2].rid, 'two sources alternate'); });
  assert.deepEqual(Object.keys(r).sort(), ['filled', 'fillerShots', 'missing', 'photoShots', 'picks']);
}
const twoPlan = plan(two);
assert.equal(twoPlan.ok, true); assert.equal(twoPlan.shots, 16); assert.ok(!adjacent(twoPlan.picks));
assert.match(twoPlan.attempt, /^spread(-in-order)?$/);
// With a single source the second slot stays empty (no relaxation).
const oneSrc = j(P.avAllocate({ candidates: video('a'), slots: tplSlots(2), seed: 'x' }));
assert.equal(oneSrc.picks[0].rid, 'a'); assert.equal(oneSrc.picks[1], null); assert.ok(oneSrc.missing >= 1);

// 2) Preflight: no video at all, or a single video source (the opening and credit shots are adjacent video-only
// shots, so they need two videos; photos cannot help).
const failOf = r => [r.ok, r.reason, r.usableShots, r.usableSlots];
assert.deepEqual(failOf(plan([])), [false, 'no-video', 0, 0]);
assert.deepEqual(failOf(plan(photos(1))), [false, 'no-video', 0, 0]);
assert.deepEqual(failOf(plan(photos(30))), [false, 'no-video', 0, 0], 'photos alone never build');
assert.deepEqual(failOf(plan(photos(30), { bpm: 100 })), [false, 'no-video', 0, 0]);
assert.equal(plan(video('a')).reason, 'one-video');
assert.equal(plan(video('a').concat(photos(20))).reason, 'one-video', 'photos do not replace a second video');
assert.equal(plan(video('a').concat(video('a', 0.7))).reason, 'one-video', 'duplicate rids count once');
assert.equal(plan(video('a').concat([{ rid: 'b', role: 'crowd', t: 1, score: 0.5 }])).reason, 'one-video', 'an invalid video is no source');

// 3) Video-only slots: the opening, credit and final shots never take a photo, even when every slot is a photo slot,
// and the photo share (1/3) counts only the montage: Standard 16 -> 5 photos, never 3 in a row, each photo once.
const three = video('a').concat(video('b'), video('c'));
for (const seed of ['s1', 's2', 's3', 's4', 's5', 's6']) {
  const r = j(P.avAllocate({ candidates: three.concat(photos(12)), slots: tplSlots(), seed }));
  assert.equal(r.missing, 0);
  assert.ok(intro(r).every(p => p.kind === 'video'), 'intro and final are video ' + seed);
  assert.equal(r.photoShots, Math.round(16 / 3)); assert.equal(r.photoShots, 5);
  assert.ok(maxRun(r.picks) <= 2, 'at most two photos in a row'); assert.ok(!adjacent(r.picks));
  const ids = r.picks.filter(p => p.kind === 'photo').map(p => p.rid);
  assert.equal(new Set(ids).size, ids.length, 'one use per photo');
  const all = j(P.avAllocate({ candidates: three.concat(photos(30)), slots: tplSlots(), seed, photoShare: 1 }));
  assert.ok(intro(all).every(p => p.kind === 'video'), 'share 1: intro and final still video ' + seed);
  assert.ok(maxRun(all.picks) <= 2);
  const p = plan(three.concat(photos(12)), { seed });
  assert.ok(p.ok); assert.ok(intro(p).every(x => x.kind === 'video')); assert.equal(p.photoShots, 5);
  const q = plan(three.concat(photos(20)), { seed, pace: 'quick', requested: 32 });
  assert.ok(q.ok); assert.ok(intro(q).every(x => x.kind === 'video')); assert.equal(q.photoShots, Math.round(32 / 3));
  assert.ok(maxRun(q.picks) <= 2 && !adjacent(q.picks));
}
// Fewer photos than the share: every photo is used, no more; no photos: all video.
assert.equal(j(P.avAllocate({ candidates: three.concat(photos(3)), slots: tplSlots(), seed: 's1' })).photoShots, 3);
assert.equal(j(P.avAllocate({ candidates: three, slots: tplSlots(), seed: 's1' })).missing, 0);
assert.equal(j(P.avAllocate({ candidates: three.concat(photos(10)), slots: tplSlots(), seed: 's1', photoShare: 0 })).photoShots, 0);
// A video-only slot with only photos stays empty.
assert.equal(j(P.avAllocate({ candidates: photos(4), slots: [{ index: 0, role: 'opening', seconds: 5, videoOnly: true }], seed: 'x' })).missing, 1);

// 4) Bookend preflight: some video source must hold the opening (6 beats) and the final shot (4 beats, 8 above 110
// bpm) whole, with AV_SOURCE_TAIL; the failure says how long a source must be. At 72 bpm (30 fps): opening 150 frames
// = 5 s -> 5.15 s, final 100 frames = 3.33 s -> 3.48 s. Photos (at most 4.85 s) never count.
{
  const clips = (dur, n = 4) => Array.from({ length: n }, (_, i) => mk('v' + i, 'crowd', dur / 2, 0.5, dur));
  const op = plan(clips(4).concat(photos(20)));
  assert.deepEqual(failOf(op), [false, 'opening-too-short', 0, 0]);
  assert.ok(Math.abs(op.neededSeconds - 5.15) < 1e-9 && Math.abs(op.shotSeconds - 5) < 1e-9 && op.longestSeconds === 4, JSON.stringify(op));
  // One long clip is enough to pass the preflight (the allocator may still fall short: too-few).
  assert.notEqual(plan(clips(4).concat([mk('L', 'crowd', 3, 0.5, 5.15)])).reason, 'opening-too-short');
  // Faster cue: a shorter opening (6 beats at 150 bpm = 2.4 s) passes, the 8-beat final shot (3.2 s) does not.
  const en = plan(clips(3.3), { bpm: 150 });
  assert.deepEqual(failOf(en), [false, 'ending-too-short', 0, 0]);
  assert.ok(Math.abs(en.neededSeconds - 3.35) < 1e-9 && Math.abs(en.shotSeconds - 3.2) < 1e-9 && en.longestSeconds === 3.3, JSON.stringify(en));
  // The footage checks come before the music check.
  assert.equal(plan(clips(4), { sectionStart: 0, usableEnd: 5 }).reason, 'opening-too-short');
  // A photo holds at most 5 s - AV_SOURCE_TAIL = 4.85 s.
  assert.equal(j(P.avAllocate({ candidates: photos(1), slots: [{ index: 0, role: 'crowd', seconds: 4.9 }], seed: 'x' })).missing, 1, '4.9 s + tail > 5 s');
  assert.equal(j(P.avAllocate({ candidates: photos(1), slots: [{ index: 0, role: 'crowd', seconds: 4.85 }], seed: 'x' })).missing, 0);
  // Notes stay empty; the bookends are video.
  const ok = plan(three.concat(photos(5)));
  assert.deepEqual(ok.notes, []); assert.ok(intro(ok).every(p => p.kind === 'video'));
}

// 5) Fresh first: a slot takes an unused resource whenever one fits before reusing any; reuse goes to the least-used
// resource first, so use counts differ by at most 1. 22 clips with hits in 1-2 roles (four strong 'crowd' clips).
{
  const clips = [];
  for (let r = 0; r < 22; r++) {
    const id = 'c' + String(r).padStart(2, '0');
    const rs = r < 4 ? ['crowd'] : [ROLES[(r * 3) % ROLES.length], ROLES[(r * 7 + 1) % ROLES.length]];
    for (const role of rs) for (const t of [4, 12]) clips.push(mk(id, role, t + rs.indexOf(role) * 0.5, r < 4 ? 0.95 : 0.3 + (r % 5) / 20, 18));
  }
  const counts = rids => rids.reduce((m, x) => ((m[x] = (m[x] || 0) + 1), m), {});
  for (const seed of ['s1', 's2', 's3', 's4']) {
    const r = j(P.avAllocate({ candidates: clips, slots: tplSlots(), seed }));
    assert.equal(r.missing, 0);
    assert.equal(new Set(r.picks.map(p => p.rid)).size, 19, 'Standard: 19 distinct clips (' + seed + ')');
    const q = j(P.avAllocate({ candidates: clips, slots: tplSlots(32, 72, 'quick'), seed }));
    assert.equal(q.missing, 0);
    // In fill order: the opening, the final shot (filled early), then the rest of the timeline.
    const order = [q.picks[0], q.picks[q.picks.length - 1]].concat(q.picks.slice(1, -1)).map(p => p.rid);
    assert.equal(new Set(order.slice(0, 22)).size, 22, 'every clip before any reuse (' + seed + ')');
    const c = Object.values(counts(order));
    assert.ok(Math.max(...c) - Math.min(...c) <= 1, 'reuse is spread: ' + JSON.stringify(counts(order)));
    assert.ok(!adjacent(q.picks));
  }
  const p = plan(clips.concat(photos(8)), { seed: '7' });
  assert.ok(p.ok); assert.equal(new Set(p.picks.map(x => x.rid)).size, p.slots, 'plan: every slot a fresh resource');
}

// 6) Shrink: footage that cannot fill Standard shrinks the montage by whole bars (2 shots), never the intro or final.
{
  // Nine 5.3 s clips with one centred hit each: a clip holds the 5 s opening, the 3.33 s final shot or one centred
  // 1.67 s window (no second window fits beside it with the 0.5 s gap), so opening + final + credit leave 6 montage
  // shots. Quick's 0.83 s windows fit up to three per clip.
  const singles = Array.from({ length: 9 }, (_, i) => mk('s' + i, MONTAGE[i % MONTAGE.length], 2.65, 0.5, 5.3));
  const r = plan(singles);
  assert.equal(r.ok, true); assert.equal(r.shots, 6, 'shrunk by whole bars');
  assert.equal(r.requested, 16); assert.equal(r.fittedByMusic, false);
  assert.deepEqual(r.schedule.beatsList.slice(0, 2), [6, 2]); assert.equal(r.schedule.beatsList[r.schedule.beatsList.length - 1], 4);
  assert.equal(r.slots, r.shots + 3); assert.ok(!adjacent(r.picks));
  // Nothing long enough for the 5 s opening: the preflight says so before any allocation.
  const short = plan(['a', 'b', 'c', 'd', 'e', 'f'].map(rid => mk(rid, 'crowd', 2, 0.5, 4)));
  assert.equal(short.ok, false); assert.equal(short.reason, 'opening-too-short'); assert.equal(short.usableShots, 0);
  // Long enough bookends but too little footage for 4 montage shots: too-few, with what the shortest plan filled
  // (four 5.3 s clips, one window each: opening, final and two montage shots; the credit and two montage shots stay
  // empty, so no 4-shot montage).
  const few = plan(singles.slice(0, 4));
  assert.deepEqual([few.ok, few.reason, few.usableShots, few.usableSlots], [false, 'too-few', 2, 4]);
  // Quick shrinks by 4 shots (one bar of 1-beat shots). With the 0.5 s source head (AV_SOURCE_HEAD) a 5.3 s clip
  // holds one fewer 0.83 s window, so these short clips give 16 (20 before the head margin).
  const q = plan(singles, { pace: 'quick', requested: 32 });
  assert.equal(q.ok, true); assert.equal(q.shots, 16);
  // Source head: a video window never starts in the first 0.5 s of a source long enough to skip it, even when the
  // scene hit sits at t = 0 (stock clips that fade in from black).
  {
    const atZero = Array.from({ length: 9 }, (_, i) => mk('z' + i, MONTAGE[i % MONTAGE.length], 0, 0.5, 12));
    const z = plan(atZero);
    assert.equal(z.ok, true);
    for (const k of z.picks) if (k && k.kind === 'video') assert.ok(k.startSeconds >= 0.5 - 1e-9, 'window starts after the head: ' + k.startSeconds);
  }
  // The final shot is filled early: in timeline order the montage spends the long windows and Quick gets only 4.
  const tl = j(P.avAllocate({ candidates: singles.concat(P.avFillers(singles)), slots: tplSlots(8, 72, 'quick'), seed: 's1', finalEarly: false }));
  assert.equal(tl.missing, 1); assert.equal(tl.picks[tl.picks.length - 1], null, 'no window left for the final shot');
  assert.equal(j(P.avAllocate({ candidates: singles.concat(P.avFillers(singles)), slots: tplSlots(8, 72, 'quick'), seed: 's1' })).missing, 0);
}

// 7) Windows stay in their source, have the slot's length, end AV_SOURCE_TAIL before the source end and never overlap
// (with the gap) within one source; fillers never leak in with plenty of real hits.
{
  const rich = []; for (let r = 0; r < 10; r++) rich.push(...video('r' + r, 0.5 + (r % 5) / 10, 90));
  const cap = plan(rich, { sectionStart: 0.3, usableEnd: 200 });
  assert.equal(cap.ok, true); assert.equal(cap.fillerShots, 0);
  const spans = {};
  cap.picks.forEach((p, i) => {
    const sl = cap.schedule.slots[i];
    assert.ok(p.startSeconds >= 0 && p.endSeconds <= 90 - 0.15 + 1e-9);
    assert.ok(Math.abs((p.endSeconds - p.startSeconds) - (sl.endFrame - sl.startFrame) / 30) < 1e-9);
    (spans[p.rid] = spans[p.rid] || []).push([p.startSeconds, p.endSeconds]);
  });
  for (const list of Object.values(spans)) { list.sort((x, y) => x[0] - y[0]); for (let i = 1; i < list.length; i++) assert.ok(list[i][0] >= list[i - 1][1] + 0.5 - 1e-9); }
  assert.ok(Math.abs(cap.picks[0].endSeconds - cap.picks[0].startSeconds - 5) < 1e-9, 'a 5 s opening window');
}

// 8) Tiers on single slots: preferred role (with its fallbacks) > any real hit > photo > filler; the source tail.
const one = (cands, slot) => j(P.avAllocate({ candidates: cands, slots: [slot], seed: 'x', photoShare: 0 })).picks[0];
const crowdSlot = { index: 0, role: 'crowd', seconds: 1.2 };
assert.equal(one([mk('a', 'water', 5, 1, 30), mk('b', 'crowd', 5, 0, 30)], crowdSlot).rid, 'b', 'the slot role beats a higher score');
assert.equal(one([mk('a', 'water', 5, 1, 30), mk('b', 'ride', 5, 0, 30)], crowdSlot).rid, 'b', 'a fallback role beats any other role');
assert.equal(one([mk('a', 'opening', 5, 0.9, 30), mk('b', 'ride', 5, 0.9, 30)], crowdSlot).rid, 'b', 'ride is the first fallback for crowd');
assert.equal(one([mk('a', 'water', 5, 0.9, 30), mk('b', 'skyline', 5, 0.9, 30)], { index: 0, role: 'ending', seconds: 3.3 }).rid, 'b', 'skyline ends');
assert.equal(one([mk('v', 'water', 5, 0.01, 30), photo('p')], crowdSlot).rid, 'v', 'any real hit beats a photo');
assert.equal(one(P.avFillers([mk('v', 'water', 5, 0.5, 30)]).concat([photo('p')]), crowdSlot).rid, 'v', 'an unused filler beats a photo');
assert.equal(j(P.avAllocate({ candidates: [mk('v', 'crowd', 5, 1, 30), photo('p')], slots: [crowdSlot], seed: 'x', photoShare: 1 })).picks[0].rid, 'p', 'a photo slot puts photos first');
assert.equal(j(P.avAllocate({ candidates: [mk('a', 'crowd', NaN, 1, 30), mk('b', 'crowd', 5, Infinity, 30)], slots: [crowdSlot], seed: 'x' })).filled, 0);
assert.ok(Math.abs(one([mk('a', 'water', 7, 0.05, 20)], crowdSlot).startSeconds - 6.4) < 1e-9, 'a hit is centred in its window');
const nearEnd = one([mk('a', 'crowd', 19.5, 1, 20)], crowdSlot);
assert.ok(Math.abs(nearEnd.endSeconds - (20 - 0.15)) < 1e-9, 'ends 0.15 s before the source end'); assert.equal(nearEnd.sourceDuration, 20);
assert.equal(j(P.avAllocate({ candidates: [mk('a', 'crowd', 0.6, 1, 1.3)], slots: [crowdSlot], seed: 'x', photoShare: 0 })).filled, 0);
assert.equal(j(P.avAllocate({ candidates: [mk('a', 'crowd', 0.6, 1, 1.35)], slots: [crowdSlot], seed: 'x', photoShare: 0 })).filled, 1);
// Filler grid and its cap.
const grid = j(P.avFillers([mk('b', 'water', 1, 1, 2), mk('a', 'ride', 1, 1, 1.1)]));
assert.deepEqual(grid.map(g => g.rid + '@' + g.t), ['a@0.25', 'a@0.75', 'b@0.25', 'b@0.75', 'b@1.25', 'b@1.75']);
assert.ok(grid.every(g => g.role === 'filler' && g.score < 0));
for (const d of [24, 90, 3600]) assert.equal(j(P.avFillers([mk('a', 'crowd', 1, 1, d)])).length, 48);
{
  const t0 = Date.now();
  const r = plan([mk('L', 'crowd', 100, 0.5, 3600), mk('s', 'water', 0.5, 0.5, 1)].concat(photos(2)));
  assert.ok(Date.now() - t0 < 2000, 'an hour-long clip plans fast'); assert.equal(r.ok, false);
}

// 9) Determinism: same seed -> identical picks; another seed -> other picks.
const four = video('a').concat(video('b'), video('c'), video('d'));
assert.deepEqual(plan(four, { seed: '1' }), plan(four, { seed: '1' }));
assert.notDeepEqual(plan(four, { seed: '2' }).picks, plan(four, { seed: '1' }).picks);

// 10) Motion opener on the opening slot: a motion-tagged window that holds the whole opening (>= 5 s + tail) opens the
// video; a tagged clip shorter than that cannot, and the normal order applies. Untagged input is unchanged by the rule.
{
  const base = plan(three.concat(photos(8)));
  assert.deepEqual(plan(three.concat(photos(8)), { motionOpener: false }), base, 'a no-op without tags');
  const tagged = three.map(c => (c.rid === 'c' && c.t === 30 ? { ...c, role: 'transit', score: 0.6, motion: 1 } : c));
  assert.ok(tagged.some(c => c.motion));
  for (const seed of ['s1', 's2', 's3', 's4']) {
    const r = plan(tagged.concat(photos(8)), { seed });
    assert.equal(r.ok, true); assert.equal(r.attempt, 'spread');
    assert.equal(r.picks[0].rid, 'c'); assert.ok(Math.abs((r.picks[0].startSeconds + r.picks[0].endSeconds) / 2 - 30) < 1e-9, 'centred on the moving moment');
    assert.equal(r.photoShots, 5, 'photo share kept'); assert.ok(!adjacent(r.picks) && maxRun(r.picks) <= 2);
    assert.deepEqual(r.picks.filter(p => p.kind === 'video').slice(0, 3).map(p => p.rid).sort(), ['a', 'b', 'c'], 'fresh first');
  }
  // Role rank decides among tagged windows: an opening hit beats a stronger transit hit.
  const twoTags = tagged.map(c => (c.rid === 'b' && c.role === 'opening' && c.t === 18 ? { ...c, motion: 0.5 } : c));
  assert.ok(twoTags.some(c => c.rid === 'b' && c.motion));
  assert.equal(plan(twoTags).picks[0].rid, 'b');
  // Too short for the opening: a 4 s tagged clip never opens (the opening is 5 s); the plan is as without its tag.
  const shortTag = three.concat([{ ...mk('d', 'opening', 2, 0.9, 4), motion: 1 }]);
  const st = plan(shortTag.concat(photos(8)));
  assert.notEqual(st.picks[0].rid, 'd');
  assert.equal(sig(st.picks), sig(plan(three.concat([mk('d', 'opening', 2, 0.9, 4)], photos(8))).picks), 'too short: unchanged');
  // Above 110 bpm the opening is shorter (6 beats at 150 = 2.4 s), so the same 4 s clip can open.
  assert.equal(plan(shortTag.concat(photos(8)), { bpm: 150 }).picks[0].rid, 'd');
}
// The motion opener never costs length (fuzz): over sparse random pools, tagging never loses a plan or shots, and the
// '-no-opener' retry is what keeps them. (The other way round is allowed: a moving opening window can leave a pool
// fillable that the plain order strands, since the 5 s opening takes a large share of a short clip.)
{
  let r = 12345;
  const rnd = () => ((r = (Math.imul(r, 1103515245) + 12345) >>> 0) / 4294967296);
  let built = 0, opened = 0, retried = 0;
  for (let n = 0; n < 200; n++) {
    const pool = [];
    const clips = 2 + Math.floor(rnd() * 4);
    for (let c = 0; c < clips; c++) {
      const dur = 2 + rnd() * 12, hits = 1 + Math.floor(rnd() * 5);
      for (let h = 0; h < hits; h++) pool.push(mk('v' + c, ROLES[Math.floor(rnd() * ROLES.length)], rnd() * dur, 0.2 + rnd() * 0.6, dur));
    }
    const pics = photos(Math.floor(rnd() * 7));
    const tag = pool.map(c => (rnd() < 0.3 ? { ...c, motion: 0.1 + rnd() * 0.9 } : c));
    const o = { pace: rnd() < 0.5 ? 'quick' : 'cinematic', bpm: rnd() < 0.5 ? 72 : 120, requested: 8, sectionStart: 0.5, seed: 's' + n };
    const off = plan(tag.concat(pics), { ...o, motionOpener: false });
    const on = plan(tag.concat(pics), o);
    if (off.ok) { built++; assert.ok(on.ok, 'ok never lost ' + n); assert.ok(on.shots >= off.shots, 'shots never lost ' + n); }
    if (on.ok && /-no-opener$/.test(on.attempt)) retried++;
    if (on.ok && on.picks[0] && tag.some(c => c.motion > 0 && c.rid === on.picks[0].rid)) opened++;
  }
  assert.ok(built > 40 && opened > 10 && retried > 0, 'fuzz exercised the opener: built ' + built + ', opened ' + opened + ', retried ' + retried);
}

// 11) Soft preferences (never a reason to leave a slot empty).
// The opening prefers a landscape source among the same or a better role rank; a portrait-only pool still opens.
{
  const tall = { width: 1080, height: 1920 }, wide = { width: 1920, height: 1080 }, four3 = { width: 1440, height: 1080 };
  const openSlot = { index: 0, role: 'opening', seconds: 5, videoOnly: true, part: 'opening' };
  const first = (cands, sizes, seed = 'x') => j(P.avAllocate({ candidates: cands, slots: [openSlot], seed, sizes })).picks[0].rid;
  const pair = [mk('p', 'opening', 10, 0.9, 30), mk('l', 'opening', 10, 0.5, 30)];
  assert.equal(first(pair), 'p', 'no sizes: score decides');
  assert.equal(first(pair, { p: tall, l: wide }), 'l', 'a landscape opening over a portrait one of the same role');
  assert.equal(first(pair, { p: tall, l: four3 }), 'l', '4:3 counts as landscape');
  assert.equal(first(pair, { p: tall }), 'l', 'an unknown size counts as landscape');
  assert.equal(first([mk('p', 'opening', 10, 0.9, 30), mk('l', 'ride', 10, 0.9, 30)], { p: tall, l: wide }), 'p', 'never over a better role match');
  assert.equal(first([mk('p', 'crowd', 10, 0.9, 30), mk('l', 'opening', 10, 0.1, 30)], { p: tall, l: wide }), 'l', 'a better role rank is fine');
  assert.equal(first([mk('p', 'opening', 10, 0.9, 30), mk('q', 'crowd', 10, 0.9, 30)], { p: tall, q: tall }), 'p', 'portrait only: still opens');
  // The plan passes sizes through; the montage may still use the portrait clip.
  const pool = video('p', 0.9).concat(video('l', 0.3), video('m', 0.3), video('n', 0.3));
  const sizes = { p: tall, l: wide, m: wide, n: wide };
  const with_ = plan(pool, { sizes }), without = plan(pool);
  assert.equal(with_.ok, true); assert.equal(with_.shots, without.shots, 'the preference never shortens the plan');
  assert.equal(without.picks[0].rid, 'p');
  assert.notEqual(with_.picks[0].rid, 'p', 'the opening is landscape');
  assert.deepEqual(plan(pool, { sizes }), with_, 'deterministic per seed');
  assert.equal(plan(['p', 'q', 'r'].flatMap(r => video(r)), { sizes: { p: tall, q: tall, r: tall } }).ok, true, 'never fails for it');
}
// The montage leaves the opening's and the credit's sources alone while other sources fit.
{
  const pool = ['a', 'b', 'c', 'd', 'e'].flatMap(r => video(r));
  for (const seed of ['s1', 's2', 's3', 's4']) {
    const r = plan(pool, { seed });
    assert.equal(r.ok, true); assert.equal(r.shots, 16);
    const book = [r.picks[0].rid, r.picks[1].rid];
    const parts = r.schedule.slots.map(x => x.part);
    const back = r.picks.filter((p, i) => parts[i] === 'montage' && book.includes(p.rid)).length;
    assert.equal(back, 0, seed + ': bookend sources back in the montage: ' + sig(r.picks));
    assert.ok(!adjacent(r.picks));
  }
  // With four sources the last montage shot sits between two others (the final shot's source and the shot before), so
  // a bookend's source fills it rather than shortening the plan; with three, they fill the montage throughout.
  const four = plan(['a', 'b', 'c', 'd'].flatMap(r => video(r)));
  assert.equal(four.ok, true); assert.equal(four.shots, 16);
  const three = plan(['a', 'b', 'c'].flatMap(r => video(r)));
  assert.equal(three.ok, true); assert.equal(three.shots, 16);
}
// A reused source shows a window apart from its earlier ones (AV_REUSE_APART s, or the other half of the clip).
{
  const slots = [0, 1, 2, 3].map(i => ({ index: i, role: 'crowd', seconds: 1.2, part: 'montage' }));
  const cands = [mk('c', 'crowd', 10, 0.9, 60), mk('c', 'crowd', 12, 0.8, 60), mk('c', 'crowd', 40, 0.1, 60),
    mk('d', 'crowd', 20, 0.85, 60), mk('d', 'crowd', 22.5, 0.8, 60), mk('d', 'crowd', 25, 0.1, 60)];
  const r = j(P.avAllocate({ candidates: cands, slots, seed: 'x', photoShare: 0 }));
  assert.equal(r.missing, 0);
  const at = r.picks.map(p => p.rid + '@' + ((p.startSeconds + p.endSeconds) / 2).toFixed(1));
  assert.deepEqual(at.slice(0, 2), ['c@10.0', 'd@20.0']);
  assert.equal(at[2], 'c@40.0', 'the other half of c, not 2 s from its first window');
  assert.equal(at[3], 'd@25.0', '5 s from d\'s first window, same half');
  // Nothing apart left: the near window is still used.
  const near = j(P.avAllocate({ candidates: cands.filter(c => c.t !== 40), slots, seed: 'x', photoShare: 0 }));
  assert.equal(near.missing, 0); assert.equal(near.picks[2].rid, 'c');
}
// A full motion bonus (0.2, av-hook) on a fallback-role window never beats an equal window of the slot's own role.
for (let k = 0; k < 40; k++) {
  const r = one([mk('own', 'crowd', 5, 0.3, 30), mk('moving', 'ride', 5, 0.3 + 0.2, 30)].map(c => c), { index: 0, role: 'crowd', seconds: 1.2 });
  assert.equal(r.rid, 'own');
  const s2 = j(P.avAllocate({ candidates: [mk('own', 'crowd', 5, 0.3, 30), mk('moving' + k, 'ride', 5, 0.5, 30)], slots: [{ index: 0, role: 'crowd', seconds: 1.2 }], seed: 'm' + k, photoShare: 0 }));
  assert.equal(s2.picks[0].rid, 'own', 'seed m' + k);
}

// Clips without analysis (panel av-hook avLocalCandidates / avLocalScale, the quick-score block's qsCandidates): local
// windows of the slot's kind rank with the slot's own role, scores share one scale with the scene-search hits, and
// fresh-first allocation, the photo share and the 0.5 s source head still hold.
{
  const panel = fs.readFileSync(path.join(root, 'panel.tsx'), 'utf8');
  const blk = n => { const a = panel.indexOf('// ' + n + ':start\n'), b = panel.indexOf('// ' + n + ':end'); assert.ok(a >= 0 && b > a, n); return panel.slice(a, b); };
  const hb = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON };
  vm.createContext(hb);
  vm.runInContext(fs.readFileSync(path.join(root, 'planner.js'), 'utf8') + '\n' + blk('av-hook') + '\n' + blk('quick-score')
    + ';globalThis.H={avPlanBuild,avMotionBonus,avLocalScale,avLocalCandidates,AV_LOCAL_ROLES,AV_LOCAL_MOVING,AV_SOURCE_HEAD,QS_HEAD};', hb);
  const H = hb.H, LR = j(H.AV_LOCAL_ROLES);
  assert.deepEqual(LR, { steady: 'local-steady', montage: 'local-montage' });
  // search.js hands template runs the same role strings (it cannot load the planner).
  const searchJs = fs.readFileSync(path.join(root, 'scripts', 'search.js'), 'utf8');
  assert.ok(searchJs.includes("const LOCAL_ROLES = ['" + LR.steady + "', '" + LR.montage + "']"), 'search.js local roles = planner AV_LOCAL_ROLES');
  // A quickScore result: 0.5 s bins from 0.5 s on; `moving` bins have a frame difference, the rest are calm.
  const scored = (rid, dur, moving = () => false, extra = {}) => {
    const windows = [];
    for (let t = 0.5; t + 0.5 <= dur + 1e-9; t += 0.5) windows.push({ start: t, end: t + 0.5, motion: moving(t) ? 0.05 : 0.004, sharp: 0.1 + (Math.floor(t) % 3) * 0.01, luma: 0.45, clipped: 0,
      flags: { black: false, fade: false, flash: false, blur: false, dark: false, bright: false, cut: false } });
    return { rid, windows, sceneCuts: [], ms: 1, fallback: false, cached: false, duration: dur, ...extra };
  };
  const secs = { steadySeconds: 6 * 60 / 72, montageSeconds: 2 * 60 / 72 };
  const locals = Array.from({ length: 6 }, (_, i) => scored('u' + i, 20, t => t > 10));
  const lc = j(H.avLocalCandidates(locals, secs));
  assert.ok(lc.length > 0 && lc.every(c => (c.role === LR.steady || c.role === LR.montage) && c.sourceDuration === 20 && c.t > 0 && c.score >= 0 && c.score <= 1));
  assert.ok(lc.some(c => c.role === LR.steady) && lc.some(c => c.role === LR.montage), 'both kinds per clip');
  assert.ok(lc.filter(c => c.motion > 0).every(c => c.t + (c.role === LR.steady ? secs.steadySeconds : secs.montageSeconds) / 2 > 10.5), 'only windows reaching the moving part carry motion (the motion opener)');
  assert.ok(lc.some(c => c.motion > 0) && lc.some(c => !('motion' in c)));
  // A clip too short for any window keeps a stub, so the planner still makes its filler windows.
  const stub = j(H.avLocalCandidates([scored('tiny', 0.9)], secs));
  assert.deepEqual(stub, [{ rid: 'tiny', role: LR.montage, sourceDuration: 0.9 }]);
  // The durations map wins over the result's own length (the inventory's figure).
  assert.ok(j(H.avLocalCandidates([scored('d', 20)], { ...secs, durations: { d: 19.5 } })).every(c => c.sourceDuration === 19.5));

  // avLocalScale: local scores map min-max onto the hits' range (after the motion bonus); equal ones sit mid-range;
  // without hits they stay; a list without local windows is returned as it was (analysed builds unchanged).
  const hitsOnly = video('a', 0.3).concat(video('b', 0.5));
  assert.deepEqual(j(H.avMotionBonus(hitsOnly)), j(hitsOnly));
  const mixed = j(H.avMotionBonus(hitsOnly.concat([mk('u', LR.steady, 4, 0.2, 20), mk('u', LR.montage, 8, 0.9, 20), mk('v', LR.montage, 8, 0.55, 20)])));
  const loc = mixed.filter(c => c.rid === 'u' || c.rid === 'v');
  assert.deepEqual(loc.map(c => Math.round(c.score * 1000) / 1000), [0.3, 0.5, 0.4]);
  assert.deepEqual(j(H.avLocalScale([mk('a', 'crowd', 4, 0.4), mk('u', LR.montage, 5, 0.1, 20), mk('v', LR.montage, 5, 0.1, 20), mk('b', 'food', 4, 0.6)])).map(c => c.score), [0.4, 0.5, 0.5, 0.6]);
  assert.deepEqual(j(H.avLocalScale([mk('u', LR.montage, 5, 0.7, 20)])).map(c => c.score), [0.7]);

  // Unanalysed only (Standard, 72 bpm): a full plan, every window after the 0.5 s head, fresh-first (6 clips, no source
  // twice before every clip is used), the opening on a steady or moving window of its kind.
  const only = H.avMotionBonus(H.avLocalCandidates(locals, secs));
  for (const seed of ['s1', 's2', 's3']) {
    const r = j(H.avPlanBuild({ candidates: only, bpm: 72, accepted: true, fps: 30, pace: 'cinematic', requested: 16, seed }));
    assert.ok(r.ok, 'unanalysed-only plan: ' + r.reason);
    assert.equal(r.shots, 16);
    assert.ok(r.picks.every(p => p.startSeconds >= H.AV_SOURCE_HEAD - 1e-9), 'every window after the source head');
    assert.equal(new Set(r.picks.slice(0, 5).concat(r.picks.slice(-1)).map(p => p.rid)).size, 6, 'fresh-first: six clips before any reuse (the final shot is filled second)');
    assert.ok(!adjacent(r.picks));
    assert.ok(r.fillerShots <= 1, 'local windows, hardly any filler: ' + r.fillerShots);
  }
  // Mixed: 4 analysed clips (scene-search hits) and 6 unanalysed ones. Both kinds play early in the montage (neither
  // always wins), all 10 clips are used before any repeats, and photos keep their share.
  const analysed = ['a', 'b', 'c', 'd'].flatMap((rid, i) => video(rid, 0.25 + 0.05 * i, 40));
  const both = H.avMotionBonus(analysed.concat(H.avLocalCandidates(locals, secs)));
  const isLocalRid = rid => /^u/.test(rid);
  for (const seed of ['s1', 's2', 's3', 's4']) {
    const r = j(H.avPlanBuild({ candidates: both, bpm: 72, accepted: true, fps: 30, pace: 'cinematic', requested: 16, seed }));
    assert.ok(r.ok, 'mixed plan: ' + r.reason);
    const vids = r.picks.filter(p => p.kind === 'video');
    // The final shot is filled right after the opening, so it counts among the first ten sources.
    assert.equal(new Set(vids.slice(0, 9).concat(vids.slice(-1)).map(p => p.rid)).size, 10, 'fresh-first across both kinds: ' + sig(r.picks));
    const firstMontage = r.picks.slice(2, 8).map(p => p.rid);
    assert.ok(firstMontage.some(isLocalRid) && firstMontage.some(rid => !isLocalRid(rid)), 'both kinds in the first montage shots: ' + firstMontage.join(' '));
    assert.ok(r.picks.every(p => p.kind !== 'video' || p.startSeconds >= H.AV_SOURCE_HEAD - 1e-9));
    const withPhotos = j(H.avPlanBuild({ candidates: both.concat(photos(8)), bpm: 72, accepted: true, fps: 30, pace: 'cinematic', requested: 16, seed }));
    assert.ok(withPhotos.ok);
    assert.equal(withPhotos.photoShots, Math.round(16 / 3), 'photo share kept with local windows');
    assert.ok(maxRun(withPhotos.picks) <= 2);
  }
  // The bookends take steady windows of unanalysed clips over their montage windows (same clip, same score).
  const pair = [mk('u', LR.montage, 10, 0.6, 20), mk('u', LR.steady, 5, 0.6, 20)];
  const book = j(P.avAllocate({ candidates: pair, slots: [{ index: 0, role: 'opening', part: 'opening', seconds: 5, videoOnly: true }], seed: 's', motionOpener: false }));
  assert.equal(book.picks[0].startSeconds, 2.5, 'the steady window (centred on 5 s) for the opening');
  const mont = j(P.avAllocate({ candidates: pair, slots: [{ index: 0, role: 'crowd', part: 'montage', seconds: 1.67, videoOnly: false }], seed: 's', photoShare: 0 }));
  assert.ok(Math.abs(mont.picks[0].startSeconds - (10 - 1.67 / 2)) < 1e-9, 'the montage window for a montage shot');
}

// Build progress: step n/total, weighted percent, never backwards, 100% only at the end.
assert.equal(P.AV_BUILD_STEPS.length, 5);
assert.equal(P.AV_BUILD_STEPS.reduce((a, s) => a + s.weight, 0), 100);
assert.equal(P.AV_BUILD_STEPS.map(s => s.id).join(' '), 'shots music draft look open');
assert.ok(P.AV_BUILD_STEPS.every(s => !('label' in s)), 'no English step labels in the planner');
assert.deepEqual(JSON.parse(JSON.stringify(P.avProgress('shots', 0.5))), { id: 'shots', value: 0.2, percent: 20, current: 0 });
assert.equal(P.avProgress('draft', 0).percent, 50);
assert.equal(P.avProgress('open', 0.99).percent, 99);
assert.equal(P.avProgress('music', 7).percent, 50, 'fraction is clamped');
let last = -1;
for (const s of P.AV_BUILD_STEPS) for (const f of [0, 0.5, 1]) { const v = P.avProgress(s.id, f).value; assert.ok(v >= last); last = v; }
assert.throws(() => P.avProgress('nope', 0));
console.log(JSON.stringify({ allocate: 'ok' }));
