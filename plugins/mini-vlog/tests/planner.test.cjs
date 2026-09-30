// plugins/mini-vlog/tests/planner.test.cjs
const assert = require('assert'); const fs = require('fs'); const vm = require('vm');
const ctx = {}; vm.createContext(ctx); vm.runInContext(fs.readFileSync(__dirname + '/../planner.js', 'utf8'), ctx);
// Objects built inside the vm context have that realm's prototypes, which deepStrictEqual rejects; compare plain copies.
const j = v => JSON.parse(JSON.stringify(v));
const F = 30000 / 1001;

// Constants.
const K = j(vm.runInContext('({ MV_LENGTHS, MV_MIN_SHOTS, MV_TEMPO_MIN, MV_TEMPO_MAX, MV_FALLBACK_SHOT, MV_ROLES, MV_ROLE_FALLBACK })', ctx));
assert.deepStrictEqual(K.MV_LENGTHS, { short: 12, standard: 24, long: 36 });
assert.strictEqual(K.MV_MIN_SHOTS, 4);
assert.strictEqual(K.MV_TEMPO_MIN, 70); assert.strictEqual(K.MV_TEMPO_MAX, 160);
assert.deepStrictEqual(K.MV_FALLBACK_SHOT, { quick: 0.55, relaxed: 1.10 });
assert.deepStrictEqual(K.MV_ROLES, ['drink', 'street', 'food', 'park', 'book', 'transit', 'flowers', 'cafe']);
assert.deepStrictEqual(K.MV_ROLE_FALLBACK, { drink: ['cafe', 'food'], cafe: ['drink', 'book', 'food'], food: ['drink', 'cafe'], book: ['cafe'], street: ['transit', 'park'], transit: ['street'], park: ['flowers', 'street'], flowers: ['park'] });
// The CWV title machinery is gone.
for (const name of ['MV_TITLE_BEATS', 'MV_FONT_STATES', 'mvTitle', 'mvMinWindows', 'mvBurstFor', 'mvFitMontage', 'MV_MONTAGE_ROLES'])
  assert.strictEqual(vm.runInContext('typeof ' + name, ctx), 'undefined', name + ' removed');

// pace guard
assert.deepStrictEqual(j(ctx.mvBeatsPerShot('quick', 108)), { beats: 1, overridden: false });
assert.deepStrictEqual(j(ctx.mvBeatsPerShot('quick', 158)), { beats: 2, overridden: true });
assert.deepStrictEqual(j(ctx.mvBeatsPerShot('relaxed', 108)), { beats: 2, overridden: false });
assert.deepStrictEqual(j(ctx.mvBeatsPerShot('relaxed', 84)), { beats: 1, overridden: true });
assert.deepStrictEqual(j(ctx.mvBeatsPerShot('quick', 150)), { beats: 1, overridden: false });
assert.deepStrictEqual(j(ctx.mvBeatsPerShot('relaxed', 86)), { beats: 2, overridden: false });
assert.strictEqual(ctx.mvGridUsable({ bpm: 65, accepted: true }), false);
assert.strictEqual(ctx.mvGridUsable({ bpm: 108, accepted: true }), true);
assert.strictEqual(ctx.mvGridUsable({ bpm: 70, accepted: true }), true);
assert.strictEqual(ctx.mvGridUsable({ bpm: 160, accepted: true }), true);
assert.strictEqual(ctx.mvGridUsable({ bpm: 161, accepted: true }), false);
assert.strictEqual(ctx.mvGridUsable({ bpm: 108, accepted: false }), false);
assert.strictEqual(ctx.mvGridUsable({ bpm: null, accepted: true }), false);
// shot length
assert.ok(Math.abs(ctx.mvShotSeconds({ bpm: 108, beatsPerShot: 1, pace: 'quick', gridded: true }) - 60 / 108) < 1e-12);
assert.ok(Math.abs(ctx.mvShotSeconds({ bpm: 108, beatsPerShot: 2, pace: 'relaxed', gridded: true }) - 120 / 108) < 1e-12);
assert.strictEqual(ctx.mvShotSeconds({ bpm: null, beatsPerShot: 1, pace: 'quick', gridded: false }), 0.55);
assert.strictEqual(ctx.mvShotSeconds({ bpm: 200, beatsPerShot: 2, pace: 'relaxed', gridded: false }), 1.10);

// frame fixture (spec §14.7)
const end = (shots, b) => ctx.mvSchedule({ bpm: 108, fps: F, shots, beatsPerShot: b }).totalFrames;
assert.deepStrictEqual([end(12,1), end(24,1), end(36,1)], [200, 400, 599]);
assert.deepStrictEqual([end(12,2), end(24,2), end(36,2)], [400, 799, 1199]);
const s = ctx.mvSchedule({ bpm: 108, fps: F, shots: 24, beatsPerShot: 1 });
assert.strictEqual(s.slots.length, 24); assert.strictEqual(s.slots[0].startFrame, 0);
s.slots.forEach((x, i) => { if (i) assert.strictEqual(x.startFrame, s.slots[i - 1].endFrame); assert.ok(x.endFrame - x.startFrame >= 16 && x.endFrame - x.startFrame <= 17); });
assert.deepStrictEqual(j(s.slots.slice(0, 9).map(x => x.role)), ['drink','street','food','park','book','transit','flowers','cafe','drink']);
assert.strictEqual(s.gridded, true); assert.strictEqual(s.offset, 0);
assert.deepStrictEqual(j(Object.keys(s.slots[0]).sort()), ['endBeat', 'endFrame', 'index', 'role', 'startBeat', 'startFrame']);
s.slots.forEach((x, i) => { assert.strictEqual(x.index, i); assert.strictEqual(x.startBeat, i); assert.strictEqual(x.endBeat, i + 1); });
const r2 = ctx.mvSchedule({ bpm: 108, fps: F, shots: 12, beatsPerShot: 2 });
assert.deepStrictEqual(j(r2.slots.map(x => x.endBeat)), [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]);
// Absolute boundaries: every cut is round(beats * 60 / bpm * fps), no accumulated rounding.
r2.slots.forEach(x => assert.strictEqual(x.endFrame, Math.round(x.endBeat * 60 / 108 * F)));
assert.throws(() => ctx.mvSchedule({ bpm: 108, fps: F, shots: 0, beatsPerShot: 1 }));

// music offset: sectionStart 1.0 at 29.97 -> round(29.97)=30 -> delta = 1 - 30/F
assert.ok(Math.abs(ctx.mvMusicOffset(1.0, F) - (1 - 30 / F)) < 1e-12);
assert.strictEqual(ctx.mvMusicOffset(null, F), 0);
const o = ctx.mvSchedule({ bpm: 108, fps: F, shots: 12, beatsPerShot: 1, sectionStart: 1.0 });
assert.strictEqual(o.slots[0].startFrame, 0);
o.slots.forEach(x => assert.strictEqual(x.endFrame, Math.round((x.endBeat * 60 / 108 + o.offset) * F)));

// capacity (weekend-indie-pop 111.99: firstBeat 0.027, usableEnd 34.82)
const q = 60 / 111.99;
assert.strictEqual(ctx.mvFitShots({ requested: 36, sectionStart: 0.027, usableEnd: 34.82, shotSeconds: q }), 36);
assert.strictEqual(ctx.mvFitShots({ requested: 36, sectionStart: 0.027, usableEnd: 34.82, shotSeconds: 2 * q }), 32);
assert.strictEqual(ctx.mvFitShots({ requested: 12, sectionStart: 0, usableEnd: 1, shotSeconds: 0.5 }), 0);
assert.strictEqual(ctx.mvFitShots({ requested: 24, sectionStart: 0, usableEnd: Infinity, shotSeconds: 0.55 }), 24);
assert.strictEqual(ctx.mvFitShots({ requested: 12, sectionStart: 0, usableEnd: 2, shotSeconds: 0.5 }), 4, 'exactly 4 shots fit');

// no grid: fixed shots
const g = ctx.mvSchedule({ bpm: null, fps: F, shots: 12, beatsPerShot: 1, shotSeconds: 0.55 });
assert.strictEqual(g.gridded, false); assert.strictEqual(g.totalFrames, Math.round(12 * 0.55 * F));
g.slots.forEach((x, i) => { assert.strictEqual(x.startBeat, null); assert.strictEqual(x.endBeat, null); assert.strictEqual(x.endFrame, Math.round((i + 1) * 0.55 * F)); });

// Sections (CWV maths): snap to bars and clamp so the video fits; default = most energetic bar-aligned window.
const bar = 4 * 60 / 99.02, vid = 24 * 60 / 99.02;
assert.strictEqual(ctx.mvSnapSection({ value: 5.1, firstBeat: 0, bpm: 99.02, usableEnd: 39.3, videoSeconds: vid, gridAccepted: true }), 2 * bar);
assert.strictEqual(ctx.mvSnapSection({ value: 99, firstBeat: 0, bpm: 99.02, usableEnd: 39.3, videoSeconds: vid, gridAccepted: true }), 10 * bar);
assert.strictEqual(ctx.mvSnapSection({ value: 3.14159, firstBeat: 0, bpm: 99.02, usableEnd: 39.3, videoSeconds: vid, gridAccepted: false }), 3.1);
assert.strictEqual(ctx.mvSnapSection({ value: 0, firstBeat: 0, bpm: 99.02, usableEnd: 5, videoSeconds: vid, gridAccepted: true }), null);
const energy = Array(64).fill(0.1); for (let i = 16; i < 64; i++) energy[i] = 0.9;
for (const downbeatHigh of [true, false, undefined]) {
  assert.strictEqual(ctx.mvDefaultSection({ firstBeat: 0, bpm: 99.02, beatEnergy: energy, usableEnd: 39.3, videoSeconds: vid, downbeatHigh }), 4 * bar);
  assert.strictEqual(ctx.mvDefaultSection({ firstBeat: 0, bpm: 99.02, beatEnergy: Array(64).fill(0.5), usableEnd: 39.3, videoSeconds: vid, downbeatHigh }), 0);
}

// ---- Onset snapping (mvSnapCuts, CWV rules without the burst template) ----
const B = 60 / 99.2;
const grid = j(ctx.mvSchedule({ bpm: 99.2, fps: 30, shots: 12, beatsPerShot: 1 }).cuts);
assert.deepStrictEqual(grid, Array.from({ length: 13 }, (_, k) => k * B));
const snap = (onsets, opt = {}, gr = grid) => j(ctx.mvSnapCuts(gr, onsets, { bpm: 99.2, fps: 30, sectionStart: 0, thresholds: { l: 2, m: 2, h: 2 }, ...opt }));
const logAt = (r, i) => r.log.find(e => e.index === i);
assert.deepStrictEqual(snap([]).cuts, grid);
assert.deepStrictEqual(snap(null).cuts, grid);
// Window: 0.1 beat (60.5 ms at 99.2 bpm).
assert.strictEqual(snap([[5 * B + 0.058, 'l', 5]]).cuts[5], 5 * B + 0.058);
assert.strictEqual(snap([[5 * B + 0.062, 'l', 5]]).cuts[5], 5 * B);
// Strength floors.
assert.strictEqual(snap([[5 * B + 0.045, 'l', 2.9]], { thresholds: {} }).cuts[5], 5 * B, 'ratio 1.45');
assert.strictEqual(logAt(snap([[5 * B + 0.045, 'l', 2.9]], { thresholds: {} }), 5).reason, 'weak onset');
assert.strictEqual(snap([[5 * B + 0.045, 'l', 3]], { thresholds: {} }).cuts[5], 5 * B + 0.045, 'ratio 1.5');
// Already on an onset within a frame: stays.
assert.strictEqual(snap([[5 * B + 0.03, 'l', 9]]).cuts[5], 5 * B);
assert.match(logAt(snap([[5 * B + 0.03, 'l', 9]]), 5).reason, /^on grid/);
// Low band must beat the grid position's own onset by 0.25.
const bk = { fps: 60, thresholds: { l: 4.6, m: 6.2, h: 6.3 } };
assert.strictEqual(snap([[5 * B - 0.02, 'm', 9.1], [5 * B + 0.032, 'l', 6.9]], bk).cuts[5], 5 * B);
assert.strictEqual(snap([[5 * B - 0.02, 'm', 9.1], [5 * B + 0.032, 'l', 7.95]], bk).cuts[5], 5 * B + 0.032);
// Every inner cut is snappable (each starts a >= 1-beat slot); frame 0 and the end never move.
const all = snap(grid.map(x => [x + 0.045, 'l', 5]));
assert.deepStrictEqual(all.log.map(e => e.index), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
assert.ok(all.log.every(e => e.reason === 'onset'));
assert.strictEqual(all.cuts[0], 0); assert.strictEqual(all.cuts[12], grid[12]);
// Minimum shot: a snap leaving a neighbour below 0.75 of its length is reverted.
const tiny = j(ctx.mvSnapCuts([0, 1.02, 1.19, 3], [[1.145, 'l', 5]], { bpm: 60, fps: 30, sectionStart: 0 }));
assert.strictEqual(tiny.cuts[2], 1.19);
assert.match(tiny.log.find(e => e.index === 2).reason, /reverted: slot 1 min-frames/);
// Onsets are in music seconds: the section start shifts them.
assert.ok(Math.abs(snap([[20 + 5 * B + 0.045, 'l', 5]], { sectionStart: 20 }).cuts[5] - (5 * B + 0.045)) < 1e-9);
// Low confidence: low band only, +/-120 ms.
assert.strictEqual(snap([[5 * B + 0.1, 'l', 5]], { lowConfidence: true }).cuts[5], 5 * B + 0.1);
assert.strictEqual(snap([[5 * B + 0.05, 'h', 9]], { lowConfidence: true }).cuts[5], 5 * B);
// Never more than half a frame early, at any rate and offset.
for (const fps of [23.976, 25, 29.97, 30, 60]) for (const ss of [0, 0.013, 7.31, 14.58]) {
  const on = grid.slice(1, -1).map((x, k) => [ss + x + ((k * 7919) % 110 - 55) / 1000, 'l', 5]);
  const r = j(ctx.mvSnapCuts(grid, on, { bpm: 99.2, fps, sectionStart: ss }));
  const off = ctx.mvMusicOffset(ss, fps);
  assert.ok(r.log.some(e => e.reason === 'onset'));
  r.log.filter(e => e.reason === 'onset').forEach(e => assert.ok(Math.abs(r.frames[e.index] / fps - (e.onset + off)) <= 0.5 / fps + 1e-9));
}
// The schedule uses snapped cuts; without music (no section start) nothing snaps; reused cuts keep their seconds.
const on = [[3 * B + 0.045, 'l', 6], [7 * B - 0.045, 'h', 6]];
const sn = j(ctx.mvSchedule({ bpm: 99.2, fps: 30, shots: 12, beatsPerShot: 1, sectionStart: 0, onsets: on, onsetThresholds: { l: 3, m: 3, h: 3 } }));
assert.strictEqual(sn.cuts[3], 3 * B + 0.045); assert.strictEqual(sn.cuts[7], 7 * B - 0.045);
assert.strictEqual(sn.slots[3].startFrame, Math.round((3 * B + 0.045) * 30));
assert.strictEqual(sn.snapLog.length, 11);
assert.deepStrictEqual(j(ctx.mvSchedule({ bpm: 99.2, fps: 30, shots: 12, beatsPerShot: 1, onsets: on }).cuts), grid);
const re = j(ctx.mvSchedule({ bpm: 99.2, fps: 25, shots: 12, beatsPerShot: 1, sectionStart: 14.58, cuts: sn.cuts }));
re.slots.forEach((x, i) => assert.strictEqual(x.endFrame, Math.round((sn.cuts[i + 1] + ctx.mvMusicOffset(14.58, 25)) * 25)));
assert.throws(() => ctx.mvSchedule({ bpm: 99.2, fps: 30, shots: 8, beatsPerShot: 1, cuts: sn.cuts }), /cuts do not match/);
// No grid with music: low-band snapping within 120 ms.
const ng = j(ctx.mvSchedule({ bpm: null, fps: 30, shots: 8, beatsPerShot: 1, shotSeconds: 0.55, sectionStart: 0, onsets: [[2.2 + 0.1, 'l', 5], [1.1 + 0.05, 'h', 9]] }));
assert.strictEqual(ng.cuts[4], 2.2 + 0.1); assert.strictEqual(ng.cuts[2], 1.1);

// ---- Groove pace (spec 15.1) ----
const G = j(vm.runInContext('({ MV_GROOVE_PHRASE_BEATS, MV_GROOVE_FILL_RATIO, MV_GROOVE_FALLBACK_BEAT, MV_GROOVE_MIN_BEATS, MV_GROOVE_ONSET_LEAD })', ctx));
assert.deepStrictEqual(G, { MV_GROOVE_PHRASE_BEATS: 16, MV_GROOVE_FILL_RATIO: 1.5, MV_GROOVE_FALLBACK_BEAT: 0.55, MV_GROOVE_MIN_BEATS: 4, MV_GROOVE_ONSET_LEAD: 1 / 30 });
// Guard: Groove keeps its phrase rhythm up to 150 bpm; above it the 8th cuts would be < 0.2 s, so it uses 2 beats (as Quick).
assert.deepStrictEqual(j(ctx.mvBeatsPerShot('groove', 108)), { beats: 1, overridden: false, groove: true, opener: 2 });
assert.deepStrictEqual(j(ctx.mvBeatsPerShot('groove', 150)), { beats: 1, overridden: false, groove: true, opener: 2 });
assert.deepStrictEqual(j(ctx.mvBeatsPerShot('groove', 158)), { beats: 2, overridden: true });
// Opener guard: a 2-beat opener longer than 1.40 s (below 85.71 bpm) becomes 1 beat.
assert.deepStrictEqual(j(ctx.mvBeatsPerShot('groove', 86)), { beats: 1, overridden: false, groove: true, opener: 2 });
assert.deepStrictEqual(j(ctx.mvBeatsPerShot('groove', 85)), { beats: 1, overridden: true, groove: true, opener: 1 });
assert.deepStrictEqual(j(ctx.mvBeatsPerShot('groove', 72)), { beats: 1, overridden: true, groove: true, opener: 1 });
assert.strictEqual(ctx.mvGrooveOpener(86), 2); assert.strictEqual(ctx.mvGrooveOpener(85.7), 1); assert.strictEqual(ctx.mvGrooveOpener(null), 2, 'no grid: 1.10 s opener');
assert.deepStrictEqual(j(ctx.mvGrooveBeats({ beats: 16, splits: [7, 15], opener: 1 })), [1, 1, 1, 1, 1, 1, 1, 0.5, 0.5, 1, 1, 1, 1, 1, 1, 1, 0.5, 0.5]);
assert.deepStrictEqual(j(ctx.mvGrooveHolds(36, 1)), [], 'a 1-beat opener has no 2-beat holds');
assert.deepStrictEqual(j(ctx.mvGrooveSpan(24, 1)), { beats: 20, shots: 23 });
assert.deepStrictEqual(j(ctx.mvGrooveFit({ requested: 24, sectionStart: 0, usableEnd: Infinity, beatSeconds: 60 / 80, opener: 1 })), { beats: 20, shots: 23, requestedBeats: 20 });
assert.strictEqual(ctx.mvShotSeconds({ bpm: null, beatsPerShot: null, pace: 'groove', gridded: false }), 0.55);
// Split candidates: the last beat of every half-phrase (beats 7 and 15 of a phrase) and the span's final beat (the video
// end counts as a phrase end mid-phrase). At most one per half-phrase (bars 1-2, bars 3-4).
assert.deepStrictEqual(j(ctx.mvGrooveCandidates(8)), [7]);
assert.deepStrictEqual(j(ctx.mvGrooveCandidates(12)), [7, 11]);
assert.deepStrictEqual(j(ctx.mvGrooveCandidates(16)), [7, 15]);
assert.deepStrictEqual(j(ctx.mvGrooveCandidates(24)), [7, 15, 23]);
assert.deepStrictEqual(j(ctx.mvGrooveCandidates(36)), [7, 15, 23, 31, 35]);
for (let beats = 8; beats <= 64; beats += 4) {
  const cands = ctx.mvGrooveCandidates(beats);
  const perHalf = {};
  cands.forEach(b => { const h = Math.floor(b / 8); perHalf[h] = (perHalf[h] || 0) + 1; });
  assert.ok(Object.values(perHalf).every(v => v === 1), 'one burst per half-phrase at most (' + beats + ')');
}
// 2-beat holds: every phrase start, plus the bar-3 downbeat of a final phrase that ends in its second half.
assert.deepStrictEqual(j(ctx.mvGrooveHolds(12, 2)), [0, 8]);
assert.deepStrictEqual(j(ctx.mvGrooveHolds(16, 2)), [0]);
assert.deepStrictEqual(j(ctx.mvGrooveHolds(24, 2)), [0, 16]);
assert.deepStrictEqual(j(ctx.mvGrooveHolds(28, 2)), [0, 16, 24]);
assert.deepStrictEqual(j(ctx.mvGrooveHolds(36, 2)), [0, 16, 32]);
// Slot lengths.
assert.deepStrictEqual(j(ctx.mvGrooveBeats({ beats: 16, splits: [7, 15] })), [2, 1, 1, 1, 1, 1, 0.5, 0.5, 1, 1, 1, 1, 1, 1, 1, 0.5, 0.5]);
assert.deepStrictEqual(j(ctx.mvGrooveBeats({ beats: 16, splits: [] })), [2].concat(Array(14).fill(1)));
assert.deepStrictEqual(j(ctx.mvGrooveBeats({ beats: 12, splits: [7, 11] })), [2, 1, 1, 1, 1, 1, 0.5, 0.5, 2, 1, 0.5, 0.5]);
assert.deepStrictEqual(j(ctx.mvGrooveBeats({ beats: 8, splits: [] })), [2, 1, 1, 1, 1, 1, 1]);
for (const beats of [8, 12, 16, 20, 24, 28, 36, 40, 48]) {
  const l = ctx.mvGrooveBeats({ beats, splits: ctx.mvGrooveCandidates(beats) });
  assert.strictEqual(l.reduce((a, b) => a + b, 0), beats, 'the slots fill the span');
}
// Nominal span for a length: the whole-bar span whose pattern (every candidate split) shot count is nearest the
// request, the longer on a tie. 12 -> 12 beats / 12 shots, 24 -> 24 / 25 (20 would be 21), 36 -> 36 / 38 (32: 34).
assert.deepStrictEqual(j(ctx.mvGrooveSpan(12)), { beats: 12, shots: 12 });
assert.deepStrictEqual(j(ctx.mvGrooveSpan(24)), { beats: 24, shots: 25 });
assert.deepStrictEqual(j(ctx.mvGrooveSpan(36)), { beats: 36, shots: 38 });
// The shortest span is one bar: 2 + 1 + 1/2 + 1/2 = 4 shots (MV_MIN_SHOTS).
assert.deepStrictEqual(j(ctx.mvGrooveSpan(4)), { beats: 4, shots: 4 });
assert.deepStrictEqual(j(ctx.mvGrooveBeats({ beats: 4, splits: ctx.mvGrooveCandidates(4) })), [2, 1, 0.5, 0.5]);
// Music capacity on beat spans: shrink by whole bars (min one bar, 4 beats), 0 when not even one bar fits.
const b108 = 60 / 108;
assert.deepStrictEqual(j(ctx.mvGrooveFit({ requested: 12, sectionStart: 0, usableEnd: 6 * b108, beatSeconds: b108 })), { beats: 4, shots: 4, requestedBeats: 12 }, '6 beats of music fit one bar');
assert.deepStrictEqual(j(ctx.mvGrooveFit({ requested: 36, sectionStart: 0.028, usableEnd: 53.6, beatSeconds: b108 })), { beats: 36, shots: 38, requestedBeats: 36 });
assert.deepStrictEqual(j(ctx.mvGrooveFit({ requested: 36, sectionStart: 0, usableEnd: 22 * b108, beatSeconds: b108 })), { beats: 20, shots: 21, requestedBeats: 36 });
assert.deepStrictEqual(j(ctx.mvGrooveFit({ requested: 24, sectionStart: 0, usableEnd: 3 * b108, beatSeconds: b108 })), { beats: 0, shots: 0, requestedBeats: 24 }, 'not even one bar');
assert.deepStrictEqual(j(ctx.mvGrooveFit({ requested: 24, sectionStart: 0, usableEnd: Infinity, beatSeconds: 0.55 })), { beats: 24, shots: 25, requestedBeats: 24 });
assert.deepStrictEqual(j(ctx.mvGrooveFit({ requested: 24, sectionStart: 0, usableEnd: null, beatSeconds: 0.55 })), { beats: 24, shots: 25, requestedBeats: 24 });

// Fill detection: onset density (sum of strengths) of each candidate beat vs the median beat of the span, detection
// first per class (phrase ends incl. the final beat / bar-2 accents), a class without a fill falls back to all of it.
const fb = (bpm, ss, beatStrengths) => {
  const B = 60 / bpm, out = [];
  beatStrengths.forEach((list, k) => list.forEach((s, i) => out.push([ss + k * B + i * B / 4, 'l', s])));
  return out;
};
const plain = Array.from({ length: 32 }, () => [10]);
const fd = (strengths, extra = {}) => j(ctx.mvFillBeats({ onsets: fb(108, 3, strengths), sectionStart: 3, bpm: 108, beats: 32, ...extra }));
assert.deepStrictEqual(fd(plain), { splits: [7, 15, 23, 31], candidates: [7, 15, 23, 31], source: 'pattern', ratios: [1, 1, 1, 1] }, 'no fill found -> every candidate');
const fillAt = (beats, add = 5) => plain.map((x, k) => (beats.indexOf(k) >= 0 ? [10, add] : x));   // 15 = 1.5 x median 10
const f2 = fd(fillAt([31]));
assert.deepStrictEqual(f2.splits, [7, 23, 31], 'phrase ends detected (31 only), accents fall back'); assert.strictEqual(f2.source, 'mixed');
assert.deepStrictEqual(f2.ratios, [1, 1, 1, 1.5]);
assert.deepStrictEqual(fd(fillAt([7])).splits, [7, 15, 31], 'accents detected (7 only), phrase ends fall back');
const both = fd(fillAt([7, 31]));
assert.deepStrictEqual(both.splits, [7, 31]); assert.strictEqual(both.source, 'onsets');
assert.strictEqual(fd(fillAt([31], 4.9)).source, 'pattern', '1.49x is no fill');
// The final beat of a span that ends mid-phrase is a phrase end: detected there, it replaces the other phrase ends.
assert.deepStrictEqual(j(ctx.mvFillBeats({ onsets: fb(108, 3, fillAt([23])), sectionStart: 3, bpm: 108, beats: 24 })).splits, [7, 23]);
// An onset up to one frame at 30 fps (1/30 s) before its beat counts for that beat (manifest onsets sit ~1 ms early);
// one further back belongs to the beat before.
const early = fb(108, 3, fillAt([7, 31])).map(o => [o[0] - 0.004, o[1], o[2]]);
assert.deepStrictEqual(j(ctx.mvFillBeats({ onsets: early, sectionStart: 3, bpm: 108, beats: 32 })).splits, [7, 31]);
const single = plain.map((x, k) => (k === 7 || k === 31 ? [15] : x));   // one onset per beat, fills on 7 and 31
assert.deepStrictEqual(j(ctx.mvFillBeats({ onsets: fb(108, 3, single), sectionStart: 3, bpm: 108, beats: 32 })).splits, [7, 31]);
const tooEarly = fb(108, 3, single).map(o => [o[0] - 0.04, o[1], o[2]]);
const te = j(ctx.mvFillBeats({ onsets: tooEarly, sectionStart: 3, bpm: 108, beats: 32 }));
assert.strictEqual(te.source, 'pattern', '40 ms early: the fills land on beats 6 and 30 (no candidates)');
// The section start is re-phased onto the beat grid from firstBeat when given.
assert.deepStrictEqual(fd(fillAt([7, 31]), { sectionStart: 3.01, firstBeat: 3 - 4 * b108 }).splits, [7, 31]);
// Onsets outside the span do not count; no onsets, no bpm, no section start, a median of 0 or no span -> pattern.
assert.strictEqual(fd(fillAt([7, 31]), { sectionStart: 30 }).source, 'pattern');
assert.deepStrictEqual(j(ctx.mvFillBeats({ onsets: [], sectionStart: 3, bpm: 108, beats: 12 })), { splits: [7, 11], candidates: [7, 11], source: 'pattern', ratios: [] });
assert.strictEqual(fd(plain, { onsets: null }).source, 'pattern');
assert.strictEqual(fd(fillAt([7, 31]), { sectionStart: null }).source, 'pattern');
assert.strictEqual(fd(fillAt([7, 31]), { bpm: null }).source, 'pattern');
assert.strictEqual(fd(Array.from({ length: 32 }, (_, k) => (k === 15 ? [9] : []))).source, 'pattern', 'median 0');
assert.deepStrictEqual(fd(fillAt([7, 31]), { beats: 0 }), { splits: [], candidates: [], source: 'pattern', ratios: [] });
assert.deepStrictEqual(fd(fillAt([31])), f2, 'deterministic');

// Groove schedule (per-slot beat lengths). Frame fixtures: every boundary is round((beat * 60 / bpm + delta) * fps),
// boundary 0 is frame 0, at 30000/1001 and at 25 fps, with and without a music offset.
const gl = ctx.mvGrooveBeats({ beats: 24, splits: [15] });
const at = l => l.reduce((acc, b) => (acc.push(acc[acc.length - 1] + b), acc), [0]);
for (const fps of [F, 25]) for (const ss of [undefined, 0, 4.472, 7.31]) {
  const gs = j(ctx.mvSchedule({ bpm: 108, fps, beatsList: gl, sectionStart: ss }));
  const delta = ctx.mvMusicOffset(ss, fps);
  assert.strictEqual(gs.slots.length, gl.length); assert.strictEqual(gs.slots[0].startFrame, 0);
  at(gl).slice(1).forEach((beat, i) => assert.strictEqual(gs.slots[i].endFrame, Math.round((beat * 60 / 108 + delta) * fps), 'boundary ' + (i + 1) + ' at ' + fps));
  gs.slots.forEach((x, i) => {
    assert.strictEqual(x.beats, gl[i]); assert.strictEqual(x.endBeat - x.startBeat, gl[i]);
    if (i) assert.strictEqual(x.startFrame, gs.slots[i - 1].endFrame);
    assert.strictEqual(x.role, ['drink', 'street', 'food', 'park', 'book', 'transit', 'flowers', 'cafe'][i % 8]);
  });
  assert.deepStrictEqual(gs.beatsList, j(gl));
}
// Literal fixture at 29.97 (delta 0): 24 beats end at frame 400; beat 15's two 8ths are 8 frames each.
const gf = j(ctx.mvSchedule({ bpm: 108, fps: F, beatsList: gl }));
assert.strictEqual(gf.totalFrames, 400);
assert.deepStrictEqual(gf.slots.slice(13, 17).map(x => [x.startFrame, x.endFrame]), [[233, 250], [250, 258], [258, 266], [266, 300]]);
const gf25 = j(ctx.mvSchedule({ bpm: 108, fps: 25, beatsList: gl }));
assert.strictEqual(gf25.totalFrames, Math.round(24 * 60 / 108 * 25));
assert.deepStrictEqual(gf25.slots.slice(14, 16).map(x => [x.startFrame, x.endFrame]), [[208, 215], [215, 222]]);
// No grid: the same pattern on 0.55 s beats (2 x 0.55, 0.55 ..., last 2 x 0.275).
const gn = j(ctx.mvSchedule({ bpm: null, fps: F, beatsList: gl, shotSeconds: 0.55 }));
assert.strictEqual(gn.gridded, false);
at(gl).slice(1).forEach((beat, i) => assert.strictEqual(gn.slots[i].endFrame, Math.round(beat * 0.55 * F)));
assert.strictEqual(gn.slots[14].beats, 0.5); assert.strictEqual(gn.slots[14].startBeat, null);
// Quick schedules keep their shape (no beats / beatsList keys).
assert.ok(!('beatsList' in j(ctx.mvSchedule({ bpm: 108, fps: F, shots: 12, beatsPerShot: 1 }))));
assert.throws(() => ctx.mvSchedule({ bpm: 108, fps: F, beatsList: [] }));
assert.throws(() => ctx.mvSchedule({ bpm: 108, fps: F, beatsList: [1, 0, 1] }));
// Snapping on a groove schedule: cuts that start an 8th slot never snap; the cut after the 8ths (phrase start) may,
// but never below the 8th slot's min-frames / min-share rule.
const gcut = at(gl).map(b => b * b108);
const thr3 = { l: 3, m: 3, h: 3 };
const snapG = on => j(ctx.mvSchedule({ bpm: 108, fps: F, beatsList: gl, sectionStart: 0, onsets: on, onsetThresholds: thr3 }));
const e1 = snapG([[gcut[14] + 0.045, 'l', 9], [gcut[15] + 0.045, 'l', 9]]);
assert.strictEqual(e1.cuts[14], gcut[14]); assert.strictEqual(e1.cuts[15], gcut[15]);
assert.strictEqual(e1.snapLog.find(e => e.index === 14).reason, 'eighth: stays on the grid');
assert.strictEqual(e1.snapLog.find(e => e.index === 15).reason, 'eighth: stays on the grid');
const e2 = snapG([[gcut[16] + 0.045, 'l', 9]]);
assert.strictEqual(e2.cuts[16], gcut[16] + 0.045, 'the phrase-start cut after the 8ths snaps later');
// An early snap shortens the second 8th, within the rules: the window (0.1 beat) is below the 0.25 beat an 8th may lose.
const e3 = snapG([[gcut[16] - 0.05, 'l', 9]]);
assert.strictEqual(e3.cuts[16], gcut[16] - 0.05);
assert.ok(e3.slots[15].endFrame - e3.slots[15].startFrame >= 4 && e3.cuts[16] - e3.cuts[15] >= 0.75 * b108 / 2);
// The min-frames / min-share rule still guards 8th slots when a snap would cross it (direct boundaries, wide window).
const guard8 = j(ctx.mvSnapCuts([0, 1, 1.25, 1.5, 3], [[1.43, 'l', 9]], { bpm: 30, fps: 30, sectionStart: 0, thresholds: thr3, beatsList: [0.5, 0.125, 0.125, 1] }));
assert.strictEqual(guard8.cuts[3], 1.5);
assert.match(guard8.log.find(e => e.index === 3).reason, /^reverted: slot 2 min-/);
// Every snapped groove cut still leaves each 8th slot >= min(4, grid frames) frames.
for (const d of [-0.07, -0.05, -0.03, 0.03, 0.05, 0.07]) {
  const r = snapG(gcut.slice(1, -1).map(x => [x + d, 'l', 9]));
  r.slots.forEach((x, i) => { if (gl[i] === 0.5) assert.ok(x.endFrame - x.startFrame >= 4); });
  [14, 15].forEach(i => assert.strictEqual(r.cuts[i], gcut[i]));
}

// Bedroom Pop 108 (manifest), default sections: interval_cv by hook-metrics' definition (population std / mean of the
// intervals between inner cuts, i.e. first and last slot dropped) in 0.30-0.45 at Short, Standard and Long, at 29.97
// and 25 fps, on every bundled cue; std / mean over all slots in 0.3-0.6 for Bedroom Pop Standard.
const manifest = JSON.parse(fs.readFileSync(__dirname + '/../assets/cues/manifest.json', 'utf8'));
const cv = xs => { const m = xs.reduce((a, b) => a + b, 0) / xs.length; return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length) / m; };
const cvOf = (cueId, requested, fps = F) => {
  const cue = manifest.cues.find(c => c.id === cueId), B = 60 / cue.bpm;
  const opener = ctx.mvGrooveOpener(cue.bpm);
  const fit = ctx.mvGrooveFit({ requested, sectionStart: cue.firstBeat, usableEnd: cue.usableEnd, beatSeconds: B, opener });
  const ss = ctx.mvDefaultSection({ firstBeat: cue.firstBeat, bpm: cue.bpm, beatEnergy: cue.beatEnergy, usableEnd: cue.usableEnd, videoSeconds: fit.beats * B });
  const fills = ctx.mvFillBeats({ onsets: cue.onsets, sectionStart: ss, firstBeat: cue.firstBeat, bpm: cue.bpm, beats: fit.beats });
  const sch = ctx.mvSchedule({ bpm: cue.bpm, fps, beatsList: ctx.mvGrooveBeats({ beats: fit.beats, splits: fills.splits, opener }), sectionStart: ss, onsets: cue.onsets, onsetThresholds: cue.onsetThresholds });
  const d = sch.slots.map(x => (x.endFrame - x.startFrame) / fps);
  // inner: hook-metrics' definition (population std / mean of the intervals between inner cuts: first and last slot dropped).
  return { cv: cv(d), inner: cv(d.slice(1, -1)), shots: sch.slots.length, beats: fit.beats, fills: j(fills) };
};
for (const cue of manifest.cues) for (const fps of [F, 25]) for (const req of [12, 24, 36]) {
  const r = cvOf(cue.id, req, fps);
  assert.ok(r.inner >= 0.30 && r.inner <= 0.45, cue.id + ' ' + req + ' at ' + fps + ': inner interval_cv ' + r.inner);
}
const bp = cvOf('bedroom-pop-108', 24);
assert.ok(bp.cv >= 0.3 && bp.cv <= 0.6, 'interval_cv ' + bp.cv);
// Quick on the same cue is flat (the A baseline).
const bq = ctx.mvSchedule({ bpm: 108, fps: F, shots: 24, beatsPerShot: 1, sectionStart: 4.472 });
assert.ok(cv(bq.slots.map(x => (x.endFrame - x.startFrame) / F)) < 0.05);

// Hook section (spec 15.3): the best-scoring bar start (hookBars, index = bar from firstBeat) among the starts whose
// video fits, earliest on ties. For a Standard Quick video (24 beats) it is the manifest's own hookStart on every cue.
for (const cue of manifest.cues) {
  const hs = ctx.mvHookSection({ hookBars: cue.hookBars, firstBeat: cue.firstBeat, bpm: cue.bpm, usableEnd: cue.usableEnd, videoSeconds: 24 * 60 / cue.bpm, barPhaseBeats: cue.barPhaseBeats });
  assert.ok(Math.abs(hs - cue.hookStart) < 1e-3, cue.id + ' hook section ' + hs + ' vs hookStart ' + cue.hookStart);
  // The pick is a start the section snap keeps as it is.
  const snapped = ctx.mvSnapSection({ value: hs, firstBeat: cue.firstBeat, bpm: cue.bpm, usableEnd: cue.usableEnd, videoSeconds: 24 * 60 / cue.bpm, gridAccepted: true });
  assert.ok(Math.abs(snapped - hs) < 1e-9, cue.id + ' hook section survives snapping');
}
{
  const bar = 4 * 60 / 120, base = { firstBeat: 0.5, bpm: 120, usableEnd: 0.5 + 10 * bar, videoSeconds: 4 * bar };
  // Earliest of equal scores; a start whose video would run past usableEnd is skipped even when it scores best.
  assert.strictEqual(ctx.mvHookSection({ ...base, hookBars: [0.2, 0.9, 0.4, 0.9, 0.1, 0.3, 0.2] }), 0.5 + bar);
  assert.strictEqual(ctx.mvHookSection({ ...base, hookBars: [0.2, 0.3, 0.4, 0.5, 0.1, 0.3, 0.2, 1] }), 0.5 + 3 * bar);
  // Exactly fitting counts (bar 6 ends at usableEnd).
  assert.strictEqual(ctx.mvHookSection({ ...base, hookBars: [0, 0, 0, 0, 0, 0, 0.7] }), 0.5 + 6 * bar);
  // Starts past the scored bars (the last 3 bars of a cue have no score) are never picked.
  assert.strictEqual(ctx.mvHookSection({ ...base, videoSeconds: bar, hookBars: [0.1, 0.2] }), 0.5 + bar);
  // No hookBars (own music, No music), an empty list, no tempo, or nothing that fits: null (the caller falls back).
  for (const hookBars of [undefined, null, [], 'x']) assert.strictEqual(ctx.mvHookSection({ ...base, hookBars }), null);
  assert.strictEqual(ctx.mvHookSection({ ...base, bpm: null, hookBars: [1] }), null);
  assert.strictEqual(ctx.mvHookSection({ ...base, videoSeconds: 11 * bar, hookBars: [1, 1] }), null);
  // Non-numeric scores are skipped; barPhaseBeats never shifts the start (firstBeat already carries the bar phase).
  assert.strictEqual(ctx.mvHookSection({ ...base, hookBars: [null, 0.3, 'a', 0.2] }), 0.5 + bar);
  assert.strictEqual(ctx.mvHookSection({ ...base, barPhaseBeats: 2, hookBars: [0.1, 0.5] }), 0.5 + bar);
}
// Groove sizes the hook window by its beat span: Bedroom Pop Long Groove (36 beats) cannot start at bar 17.
{
  const c = manifest.cues.find(x => x.id === 'bedroom-pop-108');
  const hs = ctx.mvHookSection({ hookBars: c.hookBars, firstBeat: c.firstBeat, bpm: c.bpm, usableEnd: c.usableEnd, videoSeconds: 36 * 60 / c.bpm });
  assert.ok(hs + 36 * 60 / c.bpm <= c.usableEnd + 1e-6 && hs < c.hookStart, 'long hook section fits ' + hs);
}

// Progress (CWV labels).
assert.strictEqual(ctx.mvProgress('shots', 0).label, 'Step 1/5 · Choosing shots · 0%');
assert.strictEqual(ctx.mvProgress('open', 1).percent, 100);
console.log('planner ok');
