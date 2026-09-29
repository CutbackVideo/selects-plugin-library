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

// Progress (CWV labels).
assert.strictEqual(ctx.mvProgress('shots', 0).label, 'Step 1/5 · Choosing shots · 0%');
assert.strictEqual(ctx.mvProgress('open', 1).percent, 100);
console.log('planner ok');
