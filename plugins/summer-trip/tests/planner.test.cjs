// plugins/summer-trip/tests/planner.test.cjs
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'planner.js'), 'utf8');
const box = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON };
vm.createContext(box);
vm.runInContext(source + ';globalThis.P={stMontageBeats,stSchedule,stFrameSchedule,stMusicOffset,stTitleSchedule,stTitleTimes,stSeasonFor,stOctave,stDefaultSection,stClampSection,stDropStart,stSnapAnchors,stTotalBeats,stCueDuration,stLatestStart,stTotalSeconds,ST_LENGTHS,ST_W,ST_H,ST_QUERIES,ST_MONTAGE_ROLES};', box);
const P = box.P;
const j = v => JSON.parse(JSON.stringify(v));
let checks = 0;
const eq = (a, b, m) => { assert.deepEqual(j(a), j(b), m); checks++; };
const ok = (v, m) => { assert.ok(v, m); checks++; };

// Canvas and lengths.
eq([P.ST_W, P.ST_H], [1920, 1080]);
eq(P.ST_LENGTHS, { short: 6, standard: 8, long: 12 });
eq(P.ST_MONTAGE_ROLES, ['beach', 'town', 'water', 'street', 'food', 'landmark', 'people', 'detail']);
eq(Object.keys(P.ST_QUERIES).sort(), ['beach', 'detail', 'ending', 'food', 'grid', 'landmark', 'opener', 'people', 'place', 'street', 'town', 'water']);

// Montage beats: 2 each, 3-beat holds at 1-based shots ceil(N/2)+1 and +2; M = 2N + 2.
eq(P.stMontageBeats(4), [2, 2, 3, 3]);
eq(P.stMontageBeats(6), [2, 2, 2, 3, 3, 2]);
eq(P.stMontageBeats(8), [2, 2, 2, 2, 3, 3, 2, 2]);
eq(P.stMontageBeats(12), [2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2]);
for (const n of [4, 6, 8, 10, 12]) eq(P.stMontageBeats(n).reduce((a, b) => a + b, 0), 2 * n + 2, 'M = 2N + 2 for ' + n);
eq([6, 8, 12].map(n => P.stMontageBeats(n).reduce((a, b) => a + b, 0)), [14, 18, 26]);
assert.throws(() => P.stMontageBeats(0)); assert.throws(() => P.stMontageBeats(2.5)); checks += 2;

// Beat schedule (contract shape).
const s8 = P.stSchedule({ montageShots: 8 });
eq(s8.mainBeats, [0, 9.5, 14, 16, 18, 20, 22, 25, 28, 30, 32, 34, 36, 40]);
eq(s8.grid, [{ quad: 'TL', a: 8, b: 10 }, { quad: 'TR', a: 8.5, b: 10.5 }, { quad: 'BR', a: 9, b: 11 }, { quad: 'BL', a: 9.5, b: 11.5 }]);
eq(s8.gridStates, [8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5]);
eq(s8.title, [0, 8]);
eq(s8.labels, [[6, 8], [12, 32]]);
eq(s8.place, [12, 14]);
eq([s8.endingStart, s8.end, s8.fadeStart], [32, 40, 39.5]);
eq(s8.leak, { a: 31.75, b: 32.25 });
eq(s8.pulses, [34, 37.5]);
eq(s8.anchors, [8, 14, 32]);
const s6 = P.stSchedule({ montageShots: 6 }), s12 = P.stSchedule({ montageShots: 12 }), s4 = P.stSchedule({ montageShots: 4 });
eq(s6.mainBeats.slice(2, 8), [14, 16, 18, 20, 23, 26]);
eq(s12.mainBeats.slice(2, 14), [14, 16, 18, 20, 22, 24, 26, 29, 32, 34, 36, 38]);
eq(s4.mainBeats, [0, 9.5, 14, 16, 18, 21, 24, 26, 28, 32]);
eq([s6, s8, s12].map(s => s.endingStart), [28, 32, 40], 'the ending starts on a bar line');
eq([s6, s8, s12].map(s => s.end), [36, 40, 48]);
eq([6, 8, 12].map(P.stTotalBeats), [36, 40, 48]);
eq([6, 8, 12].map(n => P.stTotalSeconds(120, n)), [18, 20, 24]);
for (const s of [s4, s6, s8, s12]) {
  eq(s.mainBeats.length, s.montageShots + 6, 'opener, place, N montage, 3 ending clips');
  ok(s.mainBeats.every((b, i) => i === 0 || b > s.mainBeats[i - 1]), 'strictly increasing');
  eq(s.anchors, [8, 14, s.endingStart]);
  // Every bar line from the ending on: E is a multiple of 4.
  eq(s.endingStart % 4, 0);
}

// Frame schedule: F(b) = round((b * 60 / bpm + delta) * fps), F(0) = 0.
const f25 = P.stFrameSchedule({ schedule: s8, bpm: 120, delta: 0, fps: 25 });
eq(f25.gridStateFrames, [100, 106, 113, 119, 125, 131, 138, 144]);
eq(f25.endFrame, 500);
eq(f25.mainFrames, [0, 119, 175, 200, 225, 250, 275, 313, 350, 375, 400, 425, 450, 500]);
eq(f25.grid.map(g => [g.quad, g.aFrame, g.bFrame]), [['TL', 100, 125], ['TR', 106, 131], ['BR', 113, 138], ['BL', 119, 144]]);
eq(f25.titleFrames, [0, 100]);
eq(f25.labelsFrames, [[75, 100], [150, 400]]);
eq(f25.placeFrames, [150, 175]);
eq([f25.endingFrame, f25.fadeStartFrame], [400, 494]);
eq(f25.leakFrames, [397, 403]);
eq(f25.pulseFrames, [425, 469]);
const ntsc = 30000 / 1001;
const f2997 = P.stFrameSchedule({ schedule: s8, bpm: 120, delta: 0, fps: ntsc });
eq(f2997.gridStateFrames, [120, 127, 135, 142, 150, 157, 165, 172]);
eq(f2997.endFrame, 599);
// Spans are F differences, never a multiplied rounded frame count: at 29.97 the 2-beat shots are 30 or 29 frames.
const d2997 = f2997.mainFrames.slice(1).map((x, i) => x - f2997.mainFrames[i]);
ok(d2997.includes(30) && d2997.includes(29), 'uneven 2-beat spans at 29.97: ' + d2997);
// Every cut is within half a frame of its planned time (quantisation), at several rates and offsets.
for (const fps of [23.976, 24, 25, ntsc, 30, 50, 60]) for (const bpm of [100, 118, 120, 124, 143]) for (const delta of [0, 0.4 / fps, -0.5 / fps]) for (const s of [s6, s8, s12]) {
  const f = P.stFrameSchedule({ schedule: s, bpm, delta, fps });
  for (const r of f.report) if (r.beat !== 0) ok(Math.abs(r.quantErrorSeconds) <= 0.5 / fps + 1e-9, 'half-frame rule ' + fps + '/' + bpm + '/' + r.beat);
  ok(f.report.every(r => r.gridSeconds === r.plannedSeconds && !r.snapped));
  eq(f.mainFrames[0], 0);
  eq(f.endFrame, Math.round((s.end * 60 / bpm + delta) * fps));
}
// The report lists every distinct cut beat (Main cuts and grid states).
eq(f25.report.map(r => r.beat), [0, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 14, 16, 18, 20, 22, 25, 28, 30, 32, 34, 36, 40]);
// delta shifts every frame (not frame 0).
const fd = P.stFrameSchedule({ schedule: s8, bpm: 120, delta: 0.019, fps: 25 });
eq(fd.gridStateFrames, [100, 107, 113, 119, 125, 132, 138, 144]);
eq(fd.mainFrames[0], 0);

// Snaps: only anchors; a snapped anchor moves every event defined at its beat and nothing else.
assert.throws(() => P.stFrameSchedule({ schedule: s8, bpm: 120, delta: 0, fps: 25, snaps: { 16: 8.01 } }), /not an anchor/); checks++;
const fs1 = P.stFrameSchedule({ schedule: s8, bpm: 120, delta: 0, fps: 25, snaps: { 8: 4.07, 14: 6.96, 32: 16.05 } });
eq(fs1.gridStateFrames, [102, 106, 113, 119, 125, 131, 138, 144], 'drop moves grid state 1 only');
eq(fs1.grid[0].aFrame, 102);
eq(fs1.titleFrames, [0, 102], 'title off at the snapped drop');
eq(fs1.labelsFrames[0], [75, 102]);
eq(fs1.placeFrames, [150, 174], 'place title off at the snapped 14');
eq(fs1.mainFrames.slice(0, 4), [0, 119, 174, 200]);
eq(fs1.endingFrame, 401);
eq(fs1.labelsFrames[1], [150, 401]);
eq(fs1.leakFrames, [398, 404], 'the leak is centred on the snapped ending cut');
eq(fs1.mainFrames.slice(-3), [425, 450, 500], 'later ending shots and the end stay on the grid');
eq(fs1.pulseFrames, [425, 469]);
const r8 = fs1.report.find(r => r.beat === 8);
eq([r8.snapped, r8.frame], [true, 102]);
ok(Math.abs(r8.plannedSeconds - r8.gridSeconds - 0.07) < 1e-9, 'grid deviation reported');
ok(Math.abs(r8.quantErrorSeconds - (102 / 25 - 4.07)) < 1e-12);
// A null snap is ignored.
eq(P.stFrameSchedule({ schedule: s8, bpm: 120, delta: 0, fps: 25, snaps: { 8: null } }).gridStateFrames[0], 100);

// Music offset (as City Weekend Vlog).
eq(P.stMusicOffset(10, 25), 0);
ok(Math.abs(P.stMusicOffset(10.013, 25) - 0.013) < 1e-9);
ok(Math.abs(P.stMusicOffset(10.03, 25) - (-0.01)) < 1e-9);
eq(P.stMusicOffset(undefined, 25), 0);
eq(P.stMusicOffset(NaN, 25), 0);
for (let x = 0; x < 3; x += 0.0137) ok(Math.abs(P.stMusicOffset(x, ntsc)) <= 0.5 / ntsc + 1e-12);

// Title schedule (spec 4.2 / 15.8).
const t4 = P.stTitleSchedule('that one trip in', 'SUMMER');
eq(t4.words, ['that', 'one', 'trip', 'in']);
// A clean start: words on the off-beats from 0.5, SUM at 5, SUMMER and the labels at 6 (the drop stays at 8).
eq(t4.wordBeats, [0.5, 1.5, 2.5, 3.5]);
eq([t4.seasonPartBeat, t4.seasonPartLength, t4.seasonFullBeat, t4.labelsBeat, t4.source], [5, 3, 6, 6, 'beats']);
eq(P.stTitleSchedule('our trip', 'SUMMER').wordBeats, [0.5, 1.5]);
eq(P.stTitleSchedule('  the   best trip  ', 'AUTUMN').words, ['the', 'best', 'trip']);
const t5 = P.stTitleSchedule('the one trip we took in', 'SUMMER');
eq(t5.wordBeats, [0.5, 1, 1.5, 2, 2.5, 3]);
eq(t5.source, 'eighths');
eq(P.stTitleSchedule('a b c d e', 'X').wordBeats, [0.5, 1, 1.5, 2, 2.5]);
eq(P.stTitleSchedule('a b c d e f g h i j', 'X').wordBeats, [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 3.5, 3.5, 3.5], 'words past the 7th share 3.5');
ok(P.stTitleSchedule('a b c d e f', 'X').wordBeats[0] > 0, 'the first frame has no title text');
ok(P.stTitleSchedule('a b c d e f g h i j', 'X').wordBeats.every(b => b <= 3.5), 'words stay before the season word');
// Season part: ceil(len/2) when len >= 4, else the whole word at 4.
eq(P.stTitleSchedule('x', 'AUTUMN').seasonPartLength, 3);
eq(P.stTitleSchedule('x', 'SPRING').seasonPartLength, 3);
eq(P.stTitleSchedule('x', 'WINTER').seasonPartLength, 3);
eq(P.stTitleSchedule('x', 'JULY').seasonPartLength, 2);
eq(P.stTitleSchedule('x', 'SEPTEMBER').seasonPartLength, 5);
eq(P.stTitleSchedule('x', 'MAY').seasonPartLength, 3, 'short word: whole word on beat 5');
eq(P.stTitleSchedule('x', 'MAY').seasonPartBeat, 5);
eq(P.stTitleSchedule('x', '').seasonPartLength, 0);
eq(P.stTitleSchedule('', 'SUMMER').words, []);
// titleHits: used only for <= 4 words, and only when valid (6 sorted finite values in [0, 8)).
const hits = [0.25, 1.1, 2, 2.75, 4.5, 5.25];
const th = P.stTitleSchedule('that one trip in', 'SUMMER', hits);
eq([th.wordBeats, th.seasonPartBeat, th.seasonFullBeat, th.labelsBeat, th.source], [[0.25, 1.1, 2, 2.75], 4.5, 5.25, 5.25, 'hits']);
// Labels never come before the full season word: max(5, second season hit) with hits, 6 without.
eq(P.stTitleSchedule('that one trip in', 'SUMMER', [0, 1, 2, 3, 3.5, 4.5]).labelsBeat, 5, 'an early season hit keeps the labels on 5');
eq(P.stTitleSchedule('that one trip in', 'SUMMER', [0, 1, 2, 3, 4.5, 6]).labelsBeat, 6);
eq(P.stTitleSchedule('the one trip we took in', 'SUMMER', [0, 1, 2, 3, 4.5, 6]).labelsBeat, 6, '5+ words ignore the hits');
eq(P.stTitleSchedule('our trip', 'SUMMER', hits).wordBeats, [0.25, 1.1]);
eq(P.stTitleSchedule('the one trip we took in', 'SUMMER', hits).source, 'eighths', '5+ words ignore the hits');
for (const bad of [[0, 1, 2, 3, 4], [0, 1, 2, 3, 4, 8], [-0.1, 1, 2, 3, 4, 5], [0, 2, 1, 3, 4, 5], [0, 1, 1, 3, 4, 5], [0, 1, 2, 3, 4, NaN], [0, 1, 2, 3, 4, Infinity], null, 'x']) {
  eq(P.stTitleSchedule('that one trip in', 'SUMMER', bad).source, 'beats', 'invalid hits ignored: ' + JSON.stringify(bad));
}
// Title times: frame-aligned seconds from the graphic start, with the same F as the cuts.
const tt = P.stTitleTimes(t4, 120, 0, ntsc);
eq(tt.wordTimes.map(x => Math.round(x * ntsc)), [7, 22, 37, 52]);
eq(Math.round(tt.seasonPartTime * ntsc), 75);
eq(Math.round(tt.seasonFullTime * ntsc), 90);
eq(Math.round(tt.labelsTime * ntsc), 90);
eq(P.stTitleTimes(t4, 120, 0, 25).wordTimes, [0.24, 0.76, 1.24, 1.76]);

// Season from capture months.
eq(P.stSeasonFor([7, 7, 8, 1]), 'SUMMER');
eq(P.stSeasonFor([10, 10, 7]), 'AUTUMN');
eq(P.stSeasonFor([12, 12, 1]), 'WINTER');
eq(P.stSeasonFor([2]), 'WINTER');
eq(P.stSeasonFor([4, 4, 5, 9]), 'SPRING');
eq(P.stSeasonFor(['2024-03-02T10:00:00Z', '2024-03-05', '2023-07-01']), 'SPRING');
eq(P.stSeasonFor([10, 10, 3, 3]), 'SUMMER', 'a tie gives SUMMER');
eq(P.stSeasonFor([12, 1]), 'SUMMER', 'a tie between months gives SUMMER, even in one season');
eq(P.stSeasonFor([]), 'SUMMER');
eq(P.stSeasonFor(null), 'SUMMER');
eq(P.stSeasonFor([0, 13, 'x', NaN, 6.5]), 'SUMMER', 'unknown months');

// Tempo octave: closest to 120 in log scale; below 70 after that -> null (fixed timing).
eq(P.stOctave(120), 120);
eq(P.stOctave(60), 120);
eq(P.stOctave(240), 120);
eq(P.stOctave(99), 99);
eq(P.stOctave(85), 85, '85 is closer to 120 than 170 in log scale');
eq(P.stOctave(84), 168, '84 * 2 = 168 is closer than 84');
eq(P.stOctave(172), 86);
eq(P.stOctave(168), 168);
eq(P.stOctave(30), null);
eq(P.stOctave(34), null);
eq(P.stOctave(36), 72);
eq(P.stOctave(0), null);
eq(P.stOctave(NaN), null);
eq(P.stOctave(undefined), null);

// Sections (spec 15.5). A cue at 120 BPM: beat 0.5 s, bar 2 s; the drop at beat 16 from firstBeat 0.1 -> drop
// section at 0.1 + 8 * 0.5 = 4.1 s. Standard lasts 20 s: latest start = 60 - 0.5 - 20 = 39.5.
const cue = { bpm: 120, firstBeat: 0.1, dropBeat: 16, duration: 60 };
const near = (a, b, m) => ok(Math.abs(a - b) < 1e-9, (m || '') + ' ' + a + ' ~ ' + b);
near(P.stDropStart(cue), 4.1);
near(P.stDropStart({ bpm: 120, firstBeat: 0.1, dropSeconds: 8.1 }), 4.1);
eq(P.stDropStart({ bpm: 120, firstBeat: 0.1 }), null);
for (const n of [6, 8, 12]) {
  const d = P.stDefaultSection(cue, n);
  near(d.start, 4.1); eq([d.kind, d.clamped, d.note], ['drop', false, null]);
}
// The drop section does not fit: the latest fitting bar-aligned start, and a note.
const late = { bpm: 120, firstBeat: 0.1, dropBeat: 100, duration: 60 };      // drop section at 46.1
const dl = P.stDefaultSection(late, 8);
ok(Math.abs(dl.start - 38.1) < 1e-9, 'latest start on the drop bar grid: ' + dl.start);
eq([dl.kind, dl.clamped], ['section', true]);
ok(/does not fit/.test(dl.note));
ok(dl.start + P.stTotalSeconds(120, 8) + 0.5 <= 60 + 1e-9);
ok(Math.abs(P.stDefaultSection(late, 6).start - 40.1) < 1e-9);
ok(Math.abs(P.stDefaultSection(late, 12).start - 34.1) < 1e-9);
// Nothing fits.
eq(P.stDefaultSection({ bpm: 120, firstBeat: 0, dropBeat: 16, duration: 20 }, 8), null);
// No drop: the highest-energy window on the bar grid from the first beat.
const energy = Array.from({ length: 120 }, (_, i) => (i >= 16 && i < 56 ? 2 : 1));
eq(P.stDefaultSection({ bpm: 120, firstBeat: 0.2, duration: 60, beatEnergy: energy }, 8).start, 0.2 + 16 * 0.5);
eq(P.stDefaultSection({ bpm: 120, firstBeat: 0.2, duration: 60 }, 8).kind, 'section');
eq(P.stDefaultSection({ bpm: 120, firstBeat: 0.2, duration: 60 }, 8).start, 0.2);
// usableEnd fallback: duration = usableEnd + 0.5.
near(P.stDefaultSection({ bpm: 120, firstBeat: 0.1, dropBeat: 16, usableEnd: 24.6 }, 8).start, 4.1);
// Both known: the usable length is min(duration, usableEnd + 0.5), so a long silent tail does not count.
// N = 8 spans 20 s at 120 BPM: latest start = 25.1 - 0.5 - 20 = 4.6 with usableEnd 24.6, but duration 60 alone gives 39.5.
eq(P.stCueDuration({ duration: 60, usableEnd: 24.6 }), 25.1);
eq(P.stCueDuration({ duration: 20, usableEnd: 24.6 }), 20);
eq(P.stCueDuration({ duration: 30 }), 30);
near(P.stCueDuration({ usableEnd: 24.6 }), 25.1);
eq(P.stCueDuration({}), 0);
near(P.stLatestStart({ bpm: 120, duration: 60, usableEnd: 24.6 }, 8), 4.6);
const tail = P.stDefaultSection({ bpm: 120, firstBeat: 0.1, dropBeat: 40, duration: 60, usableEnd: 24.6 }, 8); // drop section at 16.1
ok(tail && tail.clamped && tail.start <= 4.6 + 1e-9 && /does not fit/.test(tail.note), 'the silent tail is not usable: ' + JSON.stringify(tail));
// A drop within the first 8 beats of the file: the section would start before 0. The earliest bar start on the drop's
// grid is used, with its own note (not the "does not fit" note).
const early = P.stDefaultSection({ bpm: 120, firstBeat: 0.1, dropBeat: 4, duration: 60 }, 8); // drop section at 0.1 - 2 = -1.9
near(early.start, 0.1); eq([early.kind, early.clamped], ['section', true]);
eq(early.note, 'The drop is too close to the start of the track; the title runs over the first two bars');
ok(!/does not fit/.test(early.note));
// Clamp: slider values snap to bars through the drop section, within [0, latest]; the drop position says 'drop'.
const c1 = P.stClampSection({ cue, montageShots: 8, value: 4.3 });
near(c1.start, 4.1); eq([c1.kind, c1.moved], ['drop', false]);
const c2 = P.stClampSection({ cue, montageShots: 8, value: 7 });
ok(Math.abs(c2.start - 6.1) < 1e-9 && c2.kind === 'section' && !c2.moved);
ok(Math.abs(P.stClampSection({ cue, montageShots: 8, value: -5 }).start - 0.1) < 1e-9);
const c3 = P.stClampSection({ cue, montageShots: 8, value: 55 });
ok(Math.abs(c3.start - 38.1) < 1e-9 && c3.moved, 'past the end moves to the latest start');
// Length change re-evaluates the clamp: Long's latest start is earlier.
ok(Math.abs(P.stClampSection({ cue, montageShots: 12, value: 38.1 }).start - 34.1) < 1e-9);
// Bar grid: 4 beats at the cue tempo.
for (const bpm of [118, 120, 124]) {
  const c = { bpm, firstBeat: 0.05, dropBeat: 16, duration: 65 };
  const d = P.stDefaultSection(c, 8), bar = 240 / bpm;
  eq(d.kind, 'drop');
  ok(Math.abs(d.start - (0.05 + 8 * 60 / bpm)) < 1e-9);
  const x = P.stClampSection({ cue: c, montageShots: 8, value: d.start + 3 * bar + 0.3 });
  ok(Math.abs(x.start - (d.start + 3 * bar)) < 1e-9);
}

// Anchor snapping (own music only). 120 BPM, 25 fps, section start 10 s (delta 0): window = min(0.05, 0.07) = 0.05 s.
const snapOpts = { bpm: 120, fps: 25, sectionStart: 10, thresholds: { l: 2, m: 2, h: 2 } };
// A strong mid onset 45 ms after the drop with nothing on the grid: the drop snaps; the same onset near a non-anchor
// (beat 16) never moves it.
const on1 = [[10 + 4.045, 'm', 8], [10 + 8.045, 'm', 8]];
const sn1 = P.stSnapAnchors(s8, on1, snapOpts);
eq(Object.keys(sn1.snaps), ['8']);
ok(Math.abs(sn1.snaps[8] - 4.045) < 1e-9);
eq(sn1.log.find(l => l.beat === 8).reason, 'onset');
// An onset within one frame of the grid keeps the anchor on the grid.
const sn2 = P.stSnapAnchors(s8, [[10 + 4.03, 'h', 3], [10 + 4.045, 'm', 9]], snapOpts);
eq(Object.keys(sn2.snaps), []);
ok(/on grid/.test(sn2.log[0].reason));
// Weak onsets (ratio < 1.5) and onsets outside the window stay on the grid.
eq(Object.keys(P.stSnapAnchors(s8, [[10 + 4.045, 'm', 2.5]], snapOpts).snaps), []);
eq(Object.keys(P.stSnapAnchors(s8, [[10 + 4.08, 'm', 9]], snapOpts).snaps), []);
// Bundled cues never snap.
const sb = P.stSnapAnchors(s8, on1, { ...snapOpts, bundled: true });
eq(sb.snaps, {});
ok(sb.log.every(l => /bundled/.test(l.reason)));
// All three anchors can snap; the result feeds stFrameSchedule directly.
const sn3 = P.stSnapAnchors(s8, [[10 + 4.045, 'm', 8], [10 + 6.955, 'h', 8], [10 + 16.045, 'm', 8]], snapOpts);
eq(Object.keys(sn3.snaps).map(Number).sort((a, b) => a - b), [8, 14, 32]);
const fs3 = P.stFrameSchedule({ schedule: s8, bpm: 120, delta: 0, fps: 25, snaps: sn3.snaps });
eq([fs3.gridStateFrames[0], fs3.mainFrames[2], fs3.endingFrame], [101, 174, 401]);
// Low confidence (no grid): low band only, 120 ms window; a snap that would squeeze a neighbour below 75% reverts.
const lowOpts = { bpm: 120, fps: 25, sectionStart: 10, thresholds: { l: 2 }, lowConfidence: true };
const sl = P.stSnapAnchors(s8, [[10 + 7.1, 'l', 9]], lowOpts);
ok(Math.abs(sl.snaps[14] - 7.1) < 1e-9, '14 moves 100 ms on a strong bass onset');
const sl2 = P.stSnapAnchors(s8, [[10 + 4.1, 'l', 9]], lowOpts);
eq(Object.keys(sl2.snaps), [], 'the drop at 4.1 s would leave grid state 1 at 0.15 s < 75% of its 0.25 s: reverted');
eq(sl2.log.find(l => l.beat === 8).reason, 'reverted: min-share');
eq(Object.keys(P.stSnapAnchors(s8, [[10 + 7.1, 'm', 9]], lowOpts).snaps), [], 'mid band ignored without a grid');

console.log(JSON.stringify({ planner: 'ok', checks }));
