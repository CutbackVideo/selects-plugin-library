// plugins/torn-paper-love/tests/pick.test.cjs
// Ordering, picking (photos first, seeded strata), video windows, slots and filler candidates.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'planner.js'), 'utf8');
const box = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON, Date };
vm.createContext(box);
vm.runInContext(source + ';globalThis.P={tplOrder,tplPick,tplVideoWindow,tplSlots,tplSchedule,tplFillers,TPL_FILLER_MAX,TPL_SOURCE_TAIL};', box);
const P = box.P;
const j = v => JSON.parse(JSON.stringify(v));
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= (eps || 1e-9), (msg || '') + ' expected ' + b + ' got ' + a);
const day = d => new Date(Date.UTC(2026, 0, d, 12)).toISOString();

// tplOrder: recording date ascending; missing dates after dated ones in input (Project) order; ties by rid.
{
  const input = [
    { rid: 'n1' },
    { rid: 'c', recordedAt: day(3) },
    { rid: 'b2', recordedAt: day(1) },
    { rid: 'n0', recordedAt: '' },
    { rid: 'a', recordedAt: day(2) },
    { rid: 'b1', recordedAt: day(1) },
    { rid: 'n2', recordedAt: 'not a date' },
  ];
  const out = j(P.tplOrder(input)).map(x => x.rid);
  assert.deepEqual(out, ['b1', 'b2', 'a', 'c', 'n1', 'n0', 'n2']);
  assert.equal(input[0].rid, 'n1', 'input is not mutated');
  // ISO strings with offsets compare by instant.
  const tz = j(P.tplOrder([{ rid: 'x', recordedAt: '2026-01-01T10:00:00+09:00' }, { rid: 'y', recordedAt: '2026-01-01T02:00:00Z' }])).map(x => x.rid);
  assert.deepEqual(tz, ['x', 'y']);
  assert.deepEqual(j(P.tplOrder([])), []);
}

// Fixtures.
const photo = (i, d) => ({ rid: 'p' + String(i).padStart(2, '0'), kind: 'photo', name: 'Photo ' + i, width: 3000, height: 4000, recordedAt: d == null ? undefined : day(d) });
const video = (i, d, start) => ({ rid: 'v' + String(i).padStart(2, '0'), kind: 'video', name: 'Clip ' + i, width: 1920, height: 1080, recordedAt: d == null ? undefined : day(d), startSeconds: start == null ? 1 : start });

// Photos first: with enough photos, no video is used.
{
  const pictures = [video(1, 1), photo(1, 5), video(2, 2), photo(2, 3), photo(3, 9), photo(4, 1), photo(5, 2), photo(6, 7), photo(7, 4)];
  const r = j(P.tplPick({ pictures, N: 7, seed: 1, useVideos: true }));
  assert.equal(r.photoCount, 7); assert.equal(r.videoCount, 0);
  assert.deepEqual(r.picks.map(x => x.rid), ['p04', 'p05', 'p02', 'p07', 'p01', 'p06', 'p03'], 'date order');
  for (const k of r.picks) {
    assert.deepEqual(Object.keys(k).sort(), ['height', 'identity', 'kind', 'name', 'recordedAt', 'rid', 'width']);
    assert.equal(k.identity, k.rid, 'a photo identity is its resource id');
  }
}
// Videos fill in when photos run short (and only with useVideos).
{
  const pictures = [photo(1, 5), photo(2, 1), video(1, 3, 2.5), video(2, 2, 0), video(3, 9, 4)];
  const r = j(P.tplPick({ pictures, N: 4, seed: 'a', useVideos: true }));
  assert.equal(r.photoCount, 2); assert.equal(r.videoCount, 2);
  assert.equal(r.picks.length, 4);
  assert.deepEqual(r.picks.map(x => x.kind).filter(k => k === 'photo').length, 2);
  // Result is in date order across kinds.
  const dates = r.picks.map(x => x.recordedAt);
  assert.deepEqual(dates, dates.slice().sort());
  for (const k of r.picks.filter(x => x.kind === 'video')) {
    assert.equal(typeof k.startSeconds, 'number');
    assert.ok(k.identity.startsWith(k.rid + '@'), 'a video identity is rid + source start');
  }
  const off = j(P.tplPick({ pictures, N: 4, seed: 'a', useVideos: false }));
  assert.equal(off.photoCount, 2); assert.equal(off.videoCount, 0); assert.equal(off.picks.length, 2);
  // The same video with another start is another identity.
  const a = P.tplPick({ pictures: [video(1, 1, 1)], N: 1, seed: 1, useVideos: true }).picks[0].identity;
  const b = P.tplPick({ pictures: [video(1, 1, 2)], N: 1, seed: 1, useVideos: true }).picks[0].identity;
  assert.notEqual(a, b);
}
// Strata: 20 dated photos, N = 5 -> one pick from each quarter-block of 4, deterministic by seed.
{
  const pictures = [];
  for (let i = 0; i < 20; i++) pictures.push(photo(i, i + 1));
  const shuffled = pictures.slice().reverse();
  const seen = new Set();
  for (let seed = 0; seed < 40; seed++) {
    const r = j(P.tplPick({ pictures: shuffled, N: 5, seed, useVideos: true }));
    const idx = r.picks.map(x => Number(x.rid.slice(1)));
    idx.forEach((v, k) => assert.ok(v >= 4 * k && v < 4 * k + 4, 'stratum ' + k + ' seed ' + seed + ' got ' + v));
    assert.deepEqual(j(P.tplPick({ pictures: shuffled, N: 5, seed, useVideos: true })), r, 'deterministic');
    assert.deepEqual(j(P.tplPick({ pictures, N: 5, seed, useVideos: true })), r, 'independent of input order for dated photos');
    seen.add(idx.join(','));
  }
  assert.ok(seen.size > 10, 'seeds change the picks');
  // Uneven strata (7 of 10) still pick one per stratum, all distinct.
  const ten = pictures.slice(0, 10);
  for (let seed = 0; seed < 20; seed++) {
    const r = P.tplPick({ pictures: ten, N: 7, seed, useVideos: true });
    const idx = r.picks.map(x => Number(x.rid.slice(1)));
    assert.equal(new Set(idx).size, 7);
    idx.forEach((v, k) => assert.ok(v >= Math.floor(k * 10 / 7) && v < Math.floor((k + 1) * 10 / 7)));
  }
}
// Videos among more candidates than needed are stratified too; exact count is taken whole.
{
  const pictures = [photo(1, 1)];
  for (let i = 0; i < 12; i++) pictures.push(video(i, i + 2, i));
  const r = j(P.tplPick({ pictures, N: 4, seed: 3, useVideos: true }));
  assert.equal(r.photoCount, 1); assert.equal(r.videoCount, 3);
  const vids = r.picks.filter(x => x.kind === 'video').map(x => Number(x.rid.slice(1)));
  vids.forEach((v, k) => assert.ok(v >= 4 * k && v < 4 * k + 4));
  const exact = j(P.tplPick({ pictures: [photo(1, 1), photo(2, 2), photo(3, 3)], N: 3, seed: 9, useVideos: true }));
  assert.deepEqual(exact.picks.map(x => x.rid), ['p01', 'p02', 'p03']);
}
// Duplicate resources in the pool count once.
{
  const r = P.tplPick({ pictures: [photo(1, 1), photo(1, 1), photo(2, 2), photo(3, 3)], N: 3, seed: 1, useVideos: true });
  assert.deepEqual(j(r.picks.map(x => x.rid)), ['p01', 'p02', 'p03']);
}

// tplVideoWindow: whole-frame start, slide back to keep the slot + 0.15 s tail, null when too short.
{
  const w = j(P.tplVideoWindow({ duration: 10, hitStart: 2.345, maxSlotFrames: 21, fps: 30 }));
  near(w.startSeconds, 70 / 30, 1e-12);
  // 30 fps, slot 21 frames (0.7 s): must end by 10 - 0.15 = 9.85 -> start <= 9.15 -> floor(274.5) = 274 frames.
  const s = j(P.tplVideoWindow({ duration: 10, hitStart: 9.9, maxSlotFrames: 21, fps: 30 }));
  near(s.startSeconds, 274 / 30, 1e-12);
  assert.ok(s.startSeconds + 21 / 30 + P.TPL_SOURCE_TAIL <= 10 + 1e-9);
  // Exactly fitting.
  const e = j(P.tplVideoWindow({ duration: 21 / 30 + 0.15, hitStart: 0.5, maxSlotFrames: 21, fps: 30 }));
  near(e.startSeconds, 0);
  assert.equal(P.tplVideoWindow({ duration: 0.8, hitStart: 0, maxSlotFrames: 21, fps: 30 }), null);
  assert.equal(P.tplVideoWindow({ duration: NaN, hitStart: 0, maxSlotFrames: 21, fps: 30 }), null);
  // Negative or missing hit -> 0; whole frames at 29.97 and 23.976.
  near(P.tplVideoWindow({ duration: 5, hitStart: -1, maxSlotFrames: 10, fps: 30 }).startSeconds, 0);
  near(P.tplVideoWindow({ duration: 5, hitStart: null, maxSlotFrames: 10, fps: 30 }).startSeconds, 0);
  for (const fps of [29.97, 23.976, 25]) {
    const x = P.tplVideoWindow({ duration: 3, hitStart: 1.2345, maxSlotFrames: 12, fps });
    const f = x.startSeconds * fps;
    near(f, Math.round(f), 1e-6, 'whole frame at ' + fps);
    assert.ok(x.startSeconds <= 1.2345);
    const y = P.tplVideoWindow({ duration: 3, hitStart: 2.99, maxSlotFrames: 12, fps });
    near(y.startSeconds * fps, Math.round(y.startSeconds * fps), 1e-6);
    assert.ok(y.startSeconds + 12 / fps + 0.15 <= 3 + 1e-9);
  }
  // A hit already on a frame boundary is kept (no float drift down a frame).
  near(P.tplVideoWindow({ duration: 10, hitStart: 0.7, maxSlotFrames: 5, fps: 30 }).startSeconds, 21 / 30, 1e-12);
}

// tplSlots: 2N entries, pass 2 repeats pass 1, no adjacent same resource.
{
  const s = P.tplSchedule({ bpm: 85.6, accepted: true, fps: 30, N: 5, pace: 'quick', sectionStart: 0 });
  const picks = P.tplPick({ pictures: [photo(1, 1), video(2, 2, 3.5), photo(3, 3), photo(4, 4), photo(5, 5)], N: 5, seed: 1, useVideos: true }).picks;
  const slots = j(P.tplSlots(s, picks));
  assert.equal(slots.length, 10);
  for (let k = 0; k < 5; k++) {
    const a = slots[k], b = slots[k + 5];
    assert.equal(a.pass, 1); assert.equal(b.pass, 2);
    assert.equal(a.pos, k); assert.equal(b.pos, k);
    assert.equal(a.rid, b.rid); assert.equal(a.identity, b.identity); assert.equal(a.kind, b.kind);
    assert.equal(a.startSeconds, b.startSeconds, 'a video repeats its window start');
  }
  for (let i = 1; i < slots.length; i++) assert.notEqual(slots[i].rid, slots[i - 1].rid);
  slots.forEach((x, i) => { assert.equal(x.index, i); assert.equal(x.startFrame, s.frames[i]); assert.equal(x.endFrame, s.frames[i + 1]); });
  const v = slots.find(x => x.kind === 'video');
  near(v.startSeconds, 3.5);
  assert.equal(slots.find(x => x.kind === 'photo').startSeconds, 0);
  // Adjacent repeats throw.
  const dup = picks.slice(); dup[1] = dup[0];
  assert.throws(() => P.tplSlots(s, dup), /adjacent/);
  // Wrong pick count throws.
  assert.throws(() => P.tplSlots(s, picks.slice(0, 4)));
}

// Filler candidates: 0.5 s grid from 0.25 s, capped per source.
{
  const f = j(P.tplFillers([{ rid: 'b', sourceDuration: 2 }, { rid: 'a', sourceDuration: 1.2 }, { rid: 'a', sourceDuration: 1.3 }, { rid: 'c' }]));
  assert.deepEqual(f.map(x => [x.rid, x.t]), [['a', 0.25], ['a', 0.75], ['b', 0.25], ['b', 0.75], ['b', 1.25], ['b', 1.75]]);
  assert.ok(f.every(x => x.role === 'filler' && x.score < 0));
  assert.equal(P.TPL_FILLER_MAX, 48);
  assert.equal(P.tplFillers([{ rid: 'long', sourceDuration: 600 }]).length, 48);
}

console.log('pick tests passed');
