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

// 2) One resource.
assert.equal(plan(video('a')).reason, 'one-resource');
assert.equal(plan(photos(1)).reason, 'one-resource');
assert.equal(plan([]).reason, 'one-resource');
assert.equal(plan(photos(1).concat(photos(1))).reason, 'one-resource', 'duplicate rids count once');
assert.equal(plan(video('a').concat([{ rid: 'b', role: 'crowd', t: 1, score: 0.5 }])).reason, 'one-resource', 'an invalid video is no source');

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

// 4) No video at all (Mini Vlog's photo-only case): photos may take every slot and play in any run; the plan says so
// in notes. A photo holds at most 5 s, so the opening (6 beats) needs >= 72 bpm at the plan's 30 fps.
{
  const po = plan(photos(30), { bpm: 100 });
  assert.equal(po.ok, true); assert.deepEqual(po.notes, ['no-video']);
  assert.equal(po.photoShots, po.slots); assert.equal(maxRun(po.picks), po.slots); assert.ok(!adjacent(po.picks));
  const at72 = plan(photos(30));
  assert.equal(at72.ok, true, '72 bpm: the opening is exactly 5 s'); assert.equal(at72.picks[0].holdSeconds, 5);
  const at70 = plan(photos(30), { bpm: 70 });
  assert.deepEqual([at70.ok, at70.reason, at70.notes], [false, 'no-video', ['no-video']], '70 bpm: a 5.14 s opening no photo can hold');
  assert.equal(at70.usableShots, 2, 'the one-bar montage filled'); assert.ok(at70.usableSlots >= 3);
  // Too few photos for the shortest plan (opening, credit, one bar of montage, final = 5 slots).
  assert.equal(plan(photos(4), { bpm: 100 }).reason, 'no-video');
  assert.equal(plan(photos(5), { bpm: 100 }).shots, 2);
  // With any usable video the notes stay empty and the intro is video.
  assert.deepEqual(plan(three.concat(photos(5))).notes, []);
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
  // Nothing long enough for the 5 s opening: too-few, with what the shortest plan filled.
  const short = plan(['a', 'b', 'c', 'd', 'e', 'f'].map(rid => mk(rid, 'crowd', 2, 0.5, 4)));
  assert.equal(short.ok, false); assert.equal(short.reason, 'too-few'); assert.equal(short.usableShots, 2); assert.equal(short.usableSlots, 4);
  // Quick shrinks by 4 shots (one bar of 1-beat shots).
  const q = plan(singles, { pace: 'quick', requested: 32 });
  assert.equal(q.ok, true); assert.equal(q.shots, 20);
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
