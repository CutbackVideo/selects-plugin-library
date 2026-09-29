// plugins/torn-paper-love/tests/planner.test.cjs
// Unit, template, schedule (spec 12.4 fixture), fit, snapping, letter ticks, vis rect, seeds, sections, progress.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'planner.js'), 'utf8');
const box = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON, Date };
vm.createContext(box);
vm.runInContext(source + ';globalThis.P={TPL_W,TPL_H,TPL_LENGTHS,TPL_MIN_PICTURES,TPL_UNIT_TARGET,TPL_UNIT_RANGE,TPL_FALLBACK_UNIT,TPL_SOURCE_TAIL,TPL_EFFECT_CLOCK,TPL_LETTER_SHARE,tplUnit,tplTemplate,tplMusicOffset,tplSchedule,tplFitN,tplLetterTicks,tplVisRect,tplSeedFor,tplHash,tplDefaultSection,tplSnapSection,TPL_BUILD_STEPS,tplProgress};', box);
const P = box.P;
const j = v => JSON.parse(JSON.stringify(v));
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= (eps || 1e-9), (msg || '') + ' expected ' + b + ' got ' + a);

// Constants.
assert.equal(P.TPL_W, 1440);
assert.equal(P.TPL_H, 1080);
assert.deepEqual(j(P.TPL_LENGTHS), { short: 5, standard: 7, long: 10 });
assert.equal(P.TPL_MIN_PICTURES, 3);
assert.equal(P.TPL_UNIT_TARGET, 0.35);
assert.deepEqual(j(P.TPL_UNIT_RANGE), [0.28, 0.45]);
assert.equal(P.TPL_FALLBACK_UNIT, 0.35);
assert.equal(P.TPL_SOURCE_TAIL, 0.15);
assert.equal(P.TPL_EFFECT_CLOCK, 'clip');
assert.equal(P.TPL_LETTER_SHARE, 0.4);

// tplUnit: the 8th for about 67-107 BPM, the beat for about 134-214 BPM, else null. A musical bar is 8 units.
assert.equal(P.tplUnit(60), null, '60 BPM: 8th 0.5 s and beat 1.0 s are both out of range');
{
  const u = j(P.tplUnit(85.6));
  assert.equal(u.unitBeats, 0.5); assert.equal(u.barUnits, 8); near(u.unitSec, 30 / 85.6);
}
assert.equal(P.tplUnit(110), null, '110 BPM: 8th 0.273 s < 0.28, beat 0.545 s > 0.45');
{
  const u = j(P.tplUnit(170));
  assert.equal(u.unitBeats, 1); assert.equal(u.barUnits, 8); near(u.unitSec, 60 / 170);
}
assert.equal(P.tplUnit(230), null, '230 BPM: beat 0.261 s < 0.28');
assert.equal(P.tplUnit(null), null);
assert.equal(P.tplUnit(0), null);
assert.equal(P.tplUnit(NaN), null);
// Range edges are inclusive; 8th wins when it is in range (closest to 0.35 s).
assert.equal(P.tplUnit(30 / 0.45).unitBeats, 0.5);
assert.equal(P.tplUnit(30 / 0.28).unitBeats, 0.5);
assert.equal(P.tplUnit(60 / 0.45).unitBeats, 1);

// tplTemplate: pass 1 all 2s for N <= 4, [2,2] + cycle [1,2,1,1] from N = 5; pass 2 ones + a last 2 (3 for an even total).
const TEMPLATES = {
  3: [[2, 2, 2], [1, 1, 2], 10],
  4: [[2, 2, 2, 2], [1, 1, 1, 3], 14],
  5: [[2, 2, 1, 2, 1], [1, 1, 1, 1, 2], 14],
  7: [[2, 2, 1, 2, 1, 1, 1], [1, 1, 1, 1, 1, 1, 2], 18],
  10: [[2, 2, 1, 2, 1, 1, 1, 2, 1, 1], [1, 1, 1, 1, 1, 1, 1, 1, 1, 3], 26],
};
for (const [N, [p1, p2, total]] of Object.entries(TEMPLATES)) {
  const q = j(P.tplTemplate(Number(N), 'quick'));
  assert.deepEqual(q.pass1, p1, 'quick pass 1 N=' + N);
  assert.deepEqual(q.pass2, p2, 'quick pass 2 N=' + N);
  assert.equal(q.total, total, 'quick total N=' + N);
  assert.equal(q.total % 2, 0, 'even total N=' + N);
  assert.equal(q.pass1.reduce((a, b) => a + b, 0) + q.pass2.reduce((a, b) => a + b, 0), q.total);
  const r = j(P.tplTemplate(Number(N), 'relaxed'));
  assert.deepEqual(r.pass1, p1.map(x => 2 * x), 'relaxed pass 1 N=' + N);
  assert.deepEqual(r.pass2, p2.map(x => 2 * x), 'relaxed pass 2 N=' + N);
  assert.equal(r.total, 2 * total, 'relaxed total N=' + N);
}
// Unknown pace = quick; pass 2 is always faster (shorter) than pass 1.
assert.deepEqual(j(P.tplTemplate(7)), j(P.tplTemplate(7, 'quick')));
for (let N = 3; N <= 12; N++) {
  const t = P.tplTemplate(N, 'quick');
  assert.ok(t.pass2.reduce((a, b) => a + b, 0) < t.pass1.reduce((a, b) => a + b, 0), 'pass 2 faster N=' + N);
  assert.equal(t.total % 2, 0);
}

// Music offset = CWV's delta.
assert.equal(P.tplMusicOffset(null, 30), 0);
assert.equal(P.tplMusicOffset(14.5, 30), 0);
near(P.tplMusicOffset(14.58, 30), 14.58 - 437 / 30, 1e-12);
for (let x = 0; x < 40; x += 0.137) assert.ok(Math.abs(P.tplMusicOffset(x, 30)) <= 0.5 / 30 + 1e-12);

// Spec 12.4 fixture: 85.6 BPM, fps 30, delta 0, no snap.
const FIX = { bpm: 85.6, accepted: true, fps: 30, sectionStart: 0 };
{
  const s = j(P.tplSchedule(Object.assign({ N: 7, pace: 'quick' }, FIX)));
  assert.equal(s.gridded, true);
  near(s.unitSec, 30 / 85.6);
  assert.equal(s.offset, 0);
  assert.deepEqual(s.frames, [0, 21, 42, 53, 74, 84, 95, 105, 116, 126, 137, 147, 158, 168, 189]);
  const units = [0, 2, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18];
  assert.equal(s.targets.length, 15);
  s.targets.forEach((t, k) => near(t, units[k] * 30 / 85.6, 1e-9, 'target ' + k));
  assert.equal(s.totalFrames, 189);
  assert.equal(s.lettersStartFrame, 21, 'letters start at pass-1 shot 2');
  assert.equal(s.slots.length, 14);
  assert.deepEqual(s.slots.map(x => x.pass), [1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2]);
  assert.deepEqual(s.slots.map(x => x.pos), [0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(s.slots.map(x => x.units), [2, 2, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2]);
  s.slots.forEach((x, i) => { assert.equal(x.index, i); assert.equal(x.startFrame, s.frames[i]); assert.equal(x.endFrame, s.frames[i + 1]); });
  assert.deepEqual(s.snapLog, []);
}
assert.equal(P.tplSchedule(Object.assign({ N: 5, pace: 'quick' }, FIX)).totalFrames, 147, 'Short Quick end');
assert.equal(P.tplSchedule(Object.assign({ N: 10, pace: 'quick' }, FIX)).totalFrames, 273, 'Long Quick end');
{
  const r = j(P.tplSchedule(Object.assign({ N: 7, pace: 'relaxed' }, FIX)));
  assert.equal(r.totalFrames, 379, 'Standard Relaxed end (378.50 rounds up)');
  assert.equal(r.slots.length, 14);
  assert.equal(r.lettersStartFrame, 42, 'relaxed letters start after 4 base 8ths');
}
// Absolute rounding: every frame is round(target * fps), never a sum of rounded durations.
for (const fps of [23.976, 25, 29.97, 30, 60]) {
  const s = P.tplSchedule({ bpm: 85.6, accepted: true, fps, N: 10, pace: 'relaxed', sectionStart: 0 });
  s.targets.forEach((t, k) => assert.equal(s.frames[k], k === 0 ? 0 : Math.round(t * fps)));
  for (let k = 1; k < s.frames.length; k++) assert.ok(s.frames[k] > s.frames[k - 1]);
}
// Music offset is applied once to every boundary except 0.
{
  const s = P.tplSchedule({ bpm: 85.6, accepted: true, fps: 30, N: 7, pace: 'quick', sectionStart: 14.58 });
  const d = P.tplMusicOffset(14.58, 30);
  near(s.offset, d, 1e-12);
  assert.equal(s.frames[0], 0);
  s.targets.forEach((t, k) => { if (k) assert.equal(s.frames[k], Math.round((t + d) * 30)); });
}
// Double-time grid: 170 BPM uses the beat as the unit.
{
  const s = P.tplSchedule({ bpm: 170, accepted: true, fps: 30, N: 7, pace: 'quick', sectionStart: 0 });
  assert.equal(s.gridded, true); near(s.unitSec, 60 / 170);
}
// No grid: bpm null, not accepted, or out of range -> fixed 0.35 s unit, gridded false.
for (const opts of [{ bpm: null, accepted: false }, { bpm: 85.6, accepted: false }, { bpm: 110, accepted: true }]) {
  const s = P.tplSchedule(Object.assign({ fps: 30, N: 7, pace: 'quick', sectionStart: null }, opts));
  assert.equal(s.gridded, false); assert.equal(s.unitSec, 0.35); assert.equal(s.offset, 0);
  assert.equal(s.totalFrames, Math.round(18 * 0.35 * 30));
  assert.deepEqual(j(s.snapLog), []);
}

// Snapping (spec 15.4): only pass-1 boundaries that start a 2-unit slot; never index 0 or the end.
{
  const u = 30 / 85.6, end = 18 * u;
  // Strong mid-band onsets 50 ms after every boundary (more than a frame from the grid), plus onsets near 0 and the end.
  const onsets = [[0.05, 'm', 8], [end + 0.05, 'm', 8], [end - 0.05, 'm', 8]];
  for (const b of [2, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]) onsets.push([b * u + 0.05, 'm', 8]);
  const s = j(P.tplSchedule(Object.assign({ N: 7, pace: 'quick', onsets }, FIX)));
  assert.equal(s.frames[0], 0);
  near(s.targets[0], 0);
  near(s.targets[14], end, 1e-9, 'the end never snaps');
  assert.equal(s.frames[14], 189);
  // Pass-1 slots that are 2 units long: 0, 1, 3 -> snappable boundaries 1 and 3 (0 excluded).
  const moved = s.targets.map((t, k) => Math.abs(t - [0, 2, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18][k] * u) > 1e-9);
  assert.deepEqual(moved.map((m, k) => (m ? k : -1)).filter(k => k >= 0), [1, 3]);
  near(s.targets[1], 2 * u + 0.05);
  near(s.targets[3], 5 * u + 0.05);
  assert.equal(s.frames[1], Math.round((2 * u + 0.05) * 30));
  assert.deepEqual(s.snapLog.map(x => x.index), [1, 3]);
  for (const e of s.snapLog) {
    assert.equal(e.band, 'm');
    near(e.offsetMs, 50, 0.11);
    near(e.to - e.from, 0.05, 1e-9);
  }
  // Slots follow the snapped frames.
  s.slots.forEach((x, i) => { assert.equal(x.startFrame, s.frames[i]); assert.equal(x.endFrame, s.frames[i + 1]); });
  assert.equal(s.lettersStartFrame, s.frames[1]);
}
// An onset already within a frame of the grid keeps the cut on the grid; weak onsets never snap.
{
  const u = 30 / 85.6;
  const s = j(P.tplSchedule(Object.assign({ N: 7, pace: 'quick', onsets: [[2 * u + 0.02, 'm', 8], [5 * u + 0.05, 'm', 2.2]] }, FIX)));
  near(s.targets[1], 2 * u); near(s.targets[3], 5 * u);
  assert.deepEqual(s.snapLog, []);
}
// No grid with onsets: low-band only, within +/-120 ms (CWV fixed-timing fallback). Mid-band onsets are ignored.
{
  const s = j(P.tplSchedule({ bpm: null, accepted: false, fps: 30, N: 7, pace: 'quick', sectionStart: 0,
    onsets: [[0.70 + 0.10, 'l', 10], [1.75 + 0.06, 'm', 10], [0.05, 'l', 10], [6.3 - 0.1, 'l', 10]] }));
  assert.equal(s.gridded, false);
  near(s.targets[1], 0.80, 1e-9);
  near(s.targets[3], 1.75, 1e-9, 'a mid-band onset does not snap without a grid');
  near(s.targets[0], 0); near(s.targets[14], 18 * 0.35, 1e-9);
  assert.deepEqual(s.snapLog.map(x => [x.index, x.band]), [[1, 'l']]);
}
// Onsets are in music-source seconds: they shift with the section start.
{
  const u = 30 / 85.6, start = 12;
  const s = P.tplSchedule({ bpm: 85.6, accepted: true, fps: 30, N: 7, pace: 'quick', sectionStart: start, onsets: [[start + 2 * u + 0.05, 'm', 8]] });
  near(s.targets[1], 2 * u + 0.05);
}

// tplFitN.
const fitBase = { sectionStart: 0, usableEnd: Infinity, bpm: 85.6, accepted: true, pace: 'quick' };
assert.deepEqual(j(P.tplFitN(Object.assign({}, fitBase, { requested: 7, available: 20 }))), { N: 7, reason: null });
assert.deepEqual(j(P.tplFitN(Object.assign({}, fitBase, { requested: 7, available: 4 }))), { N: 4, reason: 'pictures' });
assert.deepEqual(j(P.tplFitN(Object.assign({}, fitBase, { requested: 7, available: 2 }))), { N: 0, reason: 'pictures' });
{
  // Units: N=5 -> 14, N=6 -> 9 + 7 = 16, N=7 -> 18. Room for exactly 14 units -> N = 5.
  const u = 30 / 85.6;
  assert.equal(P.tplTemplate(6, 'quick').total, 16);
  const r = j(P.tplFitN(Object.assign({}, fitBase, { requested: 7, available: 20, sectionStart: 10, usableEnd: 10 + 14 * u + 0.001 })));
  assert.deepEqual(r, { N: 5, reason: 'music' });
  // Both limits: the pictures cap first, then the music.
  assert.deepEqual(j(P.tplFitN(Object.assign({}, fitBase, { requested: 10, available: 6, sectionStart: 10, usableEnd: 10 + 14 * u + 0.001 }))), { N: 5, reason: 'music' });
  assert.deepEqual(j(P.tplFitN(Object.assign({}, fitBase, { requested: 10, available: 5, sectionStart: 10, usableEnd: 10 + 14 * u + 0.001 }))), { N: 5, reason: 'pictures' });
  assert.deepEqual(j(P.tplFitN(Object.assign({}, fitBase, { requested: 7, available: 20, sectionStart: 10, usableEnd: 12 }))), { N: 0, reason: 'music' });
  // Relaxed doubles the length.
  assert.equal(P.tplFitN(Object.assign({}, fitBase, { requested: 7, available: 20, pace: 'relaxed', usableEnd: 36 * u + 0.001 })).N, 7);
  assert.equal(P.tplFitN(Object.assign({}, fitBase, { requested: 7, available: 20, pace: 'relaxed', usableEnd: 36 * u - 0.001 })).reason, 'music');
  // No grid -> 0.35 s units.
  assert.equal(P.tplFitN(Object.assign({}, fitBase, { requested: 7, available: 20, bpm: null, accepted: false, usableEnd: 18 * 0.35 + 1e-9 })).N, 7);
  assert.equal(P.tplFitN(Object.assign({}, fitBase, { requested: 7, available: 20, bpm: null, accepted: false, usableEnd: 18 * 0.35 - 0.01 })).N, 6);
}

// Letter ticks: every unit boundary after the letters start, relative to it, before the end.
{
  const s = P.tplSchedule(Object.assign({ N: 7, pace: 'quick' }, FIX));
  const ticks = j(P.tplLetterTicks(s));
  const expected = [];
  for (let unit = 3; unit < 18; unit++) expected.push(Math.round(unit * (30 / 85.6) * 30) - 21);
  assert.deepEqual(ticks, expected);
  assert.ok(ticks.every(t => t > 0 && t < s.totalFrames - s.lettersStartFrame));
  for (let k = 1; k < ticks.length; k++) assert.ok(ticks[k] > ticks[k - 1]);
  // Relaxed: one tick per (doubled) unit, i.e. every quarter.
  const r = P.tplSchedule(Object.assign({ N: 7, pace: 'relaxed' }, FIX));
  const rt = j(P.tplLetterTicks(r));
  const rexp = [];
  for (let unit = 6; unit < 36; unit += 2) rexp.push(Math.round(unit * (30 / 85.6) * 30) - 42);
  assert.deepEqual(rt, rexp);
  assert.ok(rt.every(t => t > 0 && t < r.totalFrames - r.lettersStartFrame));
  // A snapped boundary's tick lands on its cut.
  const u = 30 / 85.6;
  const sn = P.tplSchedule(Object.assign({ N: 7, pace: 'quick', onsets: [[5 * u + 0.05, 'm', 8]] }, FIX));
  const st = P.tplLetterTicks(sn);
  assert.ok(st.indexOf(sn.frames[3] - sn.lettersStartFrame) >= 0);
  // Other fps.
  for (const fps of [23.976, 25, 29.97]) {
    const x = P.tplSchedule({ bpm: 85.6, accepted: true, fps, N: 5, pace: 'quick', sectionStart: 3.3 });
    const t = P.tplLetterTicks(x);
    assert.ok(t.length > 0 && t.every(v => v > 0 && v < x.totalFrames - x.lettersStartFrame));
  }
}

// tplVisRect: cover = fill / fit, vis = the canvas window in % of the clip's own box.
{
  const a = j(P.tplVisRect(4000, 3000, 1440, 1080));
  assert.equal(a.cover, 1); assert.deepEqual(a.vis, { x: 0, y: 0, w: 100, h: 100 }); assert.deepEqual(a.shift, { x: 0, y: 0 });
  const b = j(P.tplVisRect(3000, 4000, 1440, 1080));
  near(b.cover, 16 / 9, 1e-9);
  near(b.vis.w, 100); near(b.vis.x, 0);
  near(b.vis.h, 56.25, 1e-9);
  near(b.vis.y, 0.4 * (100 - 56.25), 1e-9, 'portrait crop anchored at 40 % from the top');
  // The clip box covers 1440x1920 canvas px; anchoring at 40 % moves it 0.1 * (1920 - 1080) = 84 px down.
  near(b.shift.x, 0); near(b.shift.y, 84, 1e-9);
  const c = j(P.tplVisRect(1920, 1080, 1440, 1080));
  near(c.cover, 4 / 3, 1e-9);
  near(c.vis.w, 75, 1e-9); near(c.vis.x, 12.5, 1e-9, 'landscape centred');
  near(c.vis.h, 100); near(c.vis.y, 0);
  assert.deepEqual(c.shift, { x: 0, y: 0 });
  for (const bad of [[0, 0], [null, 1080], [undefined, undefined], [NaN, 5]]) {
    assert.deepEqual(j(P.tplVisRect(bad[0], bad[1], 1440, 1080)), { cover: 1, vis: { x: 0, y: 0, w: 100, h: 100 }, shift: { x: 0, y: 0 } });
  }
  // Defaults to the canvas constants.
  assert.deepEqual(j(P.tplVisRect(3000, 4000)), b);
}

// tplSeedFor: uint32, deterministic, differs by identity and version.
{
  const a = P.tplSeedFor('rid-1', 1), b = P.tplSeedFor('rid-1', 1), c = P.tplSeedFor('rid-2', 1), d = P.tplSeedFor('rid-1', 2);
  assert.equal(a, b);
  assert.notEqual(a, c); assert.notEqual(a, d);
  for (const v of [a, c, d]) assert.ok(Number.isInteger(v) && v >= 0 && v < 4294967296);
  assert.equal(a, Math.floor(P.tplHash('rid-1:1') * 4294967296));
}

// Sections: bars are 8 units (4 beats for an 8th unit, 8 beats for a double-time beat unit).
{
  const bpm = 85.6, beat = 60 / bpm;
  const energy = Array.from({ length: 200 }, (_, i) => (i >= 40 && i < 60 ? 5 : 1));
  const def = P.tplDefaultSection({ bpm, firstBeat: 0.2, usableEnd: 60, videoSeconds: 6.3, beatEnergy: energy });
  near(def, 0.2 + 40 * beat, 1e-9, 'highest-energy bar');
  assert.equal(P.tplDefaultSection({ bpm, firstBeat: 0.2, usableEnd: 5, videoSeconds: 6.3, beatEnergy: energy }), null);
  // Snap to the nearest 4-beat bar at 85.6 BPM.
  near(P.tplSnapSection({ value: 0.2 + 4 * beat * 3 + 0.4, bpm, firstBeat: 0.2, usableEnd: 60, videoSeconds: 6.3, gridAccepted: true }), 0.2 + 12 * beat, 1e-9);
  // Double time (170 BPM): a bar is 8 detected beats.
  const b2 = 60 / 170;
  near(P.tplSnapSection({ value: 0.1 + 8 * b2 * 2 + 0.3, bpm: 170, firstBeat: 0.1, usableEnd: 60, videoSeconds: 6.3, gridAccepted: true }), 0.1 + 16 * b2, 1e-9);
  const e2 = Array.from({ length: 300 }, (_, i) => (i >= 80 && i < 100 ? 5 : 1));
  near(P.tplDefaultSection({ bpm: 170, firstBeat: 0.1, usableEnd: 80, videoSeconds: 6.3, beatEnergy: e2 }), 0.1 + 80 * b2, 1e-9);
  // Clamped to starts that fit; null when nothing fits.
  const latest = 30 - 6.3;
  const cl = P.tplSnapSection({ value: 100, bpm, firstBeat: 0.2, usableEnd: 30, videoSeconds: 6.3, gridAccepted: true });
  assert.ok(cl <= latest + 1e-9 && cl > latest - 4 * beat);
  assert.equal(P.tplSnapSection({ value: 0, bpm, firstBeat: 0.2, usableEnd: 5, videoSeconds: 6.3, gridAccepted: true }), null);
  // Without a grid: 0.1 s steps.
  assert.equal(P.tplSnapSection({ value: 3.14159, bpm: null, firstBeat: 0, usableEnd: 30, videoSeconds: 6.3, gridAccepted: false }), 3.1);
}

// Progress.
{
  assert.deepEqual(j(P.TPL_BUILD_STEPS.map(s => s.label)), ['Reading your pictures', 'Finding moments', 'Planning', 'Placing pictures', 'Adding letters and paper']);
  assert.equal(P.TPL_BUILD_STEPS.reduce((a, s) => a + s.weight, 0), 100);
  const first = P.tplProgress(P.TPL_BUILD_STEPS[0].id, 0);
  assert.equal(first.percent, 0); assert.equal(first.current, 0);
  assert.ok(first.label.startsWith('Step 1/5 · Reading your pictures'));
  const last = P.tplProgress(P.TPL_BUILD_STEPS[4].id, 1);
  assert.equal(last.percent, 100);
  const mid = P.tplProgress(P.TPL_BUILD_STEPS[3].id, 0.5, '3/14');
  assert.ok(mid.label.includes('(3/14)'));
  assert.throws(() => P.tplProgress('nope', 0));
}

console.log('planner tests passed');
