// plugins/city-weekend-vlog/tests/planner.test.cjs
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'planner.js'), 'utf8');
const box = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON };
vm.createContext(box);
vm.runInContext(source + ';globalThis.P={cwvSchedule,cwvFitMontage,cwvSnapSection,cwvDefaultSection,cwvVideoSeconds,cwvBurstFor,cwvMinWindows,cwvMusicOffset,CWV_TITLE_BEATS,CWV_TITLE_ROLES,CWV_FONT_STATES,CWV_TITLE_BEATS_EIGHTH,CWV_TITLE_ROLES_EIGHTH,CWV_FONT_STATES_EIGHTH,CWV_MIN_WINDOWS};', box);
const P = box.P;
const j = v => JSON.parse(JSON.stringify(v));

// Title section is exactly 8 beats (two bars) in both burst variants, cut on 8th notes except the 16th burst.
assert.equal(P.CWV_TITLE_BEATS.reduce((a, b) => a + b, 0), 8);
assert.equal(P.CWV_TITLE_BEATS_EIGHTH.reduce((a, b) => a + b, 0), 8);
assert.equal(P.CWV_TITLE_BEATS.length, 12);
assert.equal(P.CWV_TITLE_BEATS_EIGHTH.length, 10);
assert.equal(P.CWV_MIN_WINDOWS, 16);
assert.equal(P.cwvMinWindows('sixteenth'), 16);
assert.equal(P.cwvMinWindows('eighth'), 14);
for (const [beats, roles, fonts] of [[P.CWV_TITLE_BEATS, P.CWV_TITLE_ROLES, P.CWV_FONT_STATES], [P.CWV_TITLE_BEATS_EIGHTH, P.CWV_TITLE_ROLES_EIGHTH, P.CWV_FONT_STATES_EIGHTH]]) {
  assert.equal(roles.length, beats.length); assert.equal(fonts.length, beats.length);
  assert.deepEqual(j(roles.slice(0, 3)), ['street', 'architecture', 'street']);
  assert.equal(roles[roles.length - 1], 'wide');
  assert.ok(roles.slice(3, -1).every(r => r === 'landmark'));
  assert.deepEqual(j(fonts.slice(0, 3)), [null, null, 'A']);
  assert.deepEqual(j(fonts.slice(-5)), ['B', 'C', 'D', 'A', 'A'], 'the 8th run cycles B->C->D->A and the hold stays on A');
  // Every title cut except the 16th burst sits on an 8th note.
  let at = 0; for (const b of beats) { at += b; if (b >= 0.5) assert.equal(at * 2, Math.round(at * 2)); }
}
// Burst choice: the 16th burst needs a 16th-onset ratio of at least 0.35; unknown ratios get 8ths.
assert.equal(P.cwvBurstFor(0.35), 'sixteenth');
assert.equal(P.cwvBurstFor(0.349), 'eighth');
assert.equal(P.cwvBurstFor(null), 'eighth');
assert.equal(P.cwvBurstFor(undefined), 'eighth');

// Reference tempo, 30 fps, 7 montage shots, 16th burst (the default).
const s = j(P.cwvSchedule({ bpm: 99.2, fps: 30, montageShots: 7 }));
const f = b => Math.round(b * (60 / 99.2) * 30);
assert.equal(s.burst, 'sixteenth');
assert.equal(s.titleSlots, 12);
assert.equal(s.slots.length, 19);
assert.deepEqual(s.slots.slice(0, 5).map(x => [x.startFrame, x.endFrame]), [[0, f(1.5)], [f(1.5), f(3)], [f(3), f(4)], [f(4), f(4.25)], [f(4.25), f(4.5)]]);
assert.deepEqual(s.slots.slice(0, 12).map(x => x.section), ['opening', 'opening', 'opening', 'burst', 'burst', 'burst', 'burst', 'burst', 'burst', 'burst', 'burst', 'hold']);
assert.equal(s.slots[12].section, 'montage');
assert.deepEqual(s.slots.map(x => x.endBeat), [1.5, 3, 4, 4.25, 4.5, 4.75, 5, 5.5, 6, 6.5, 7, 8, 10, 12, 14, 16, 18, 20, 22]);
assert.equal(s.slots[12].startBeat, 8, 'the montage starts on the downbeat of bar 3');
assert.equal(s.title.endFrame, s.slots[11].endFrame);
assert.equal(s.title.endFrame, f(8));
assert.equal(s.totalFrames, f(22));
for (let i = 1; i < s.slots.length; i++) assert.equal(s.slots[i].startFrame, s.slots[i - 1].endFrame, 'no gaps');
assert.equal(s.title.line1Frame, f(0.25));
assert.equal(s.title.connectorFrame, s.slots[1].startFrame);
assert.equal(s.title.placeFrame, s.slots[2].startFrame);
assert.deepEqual(s.title.fontSwitches.map(x => x.state), ['A', 'B', 'C', 'D', 'A', 'B', 'C', 'D', 'A']);
assert.deepEqual(s.title.fontSwitches.map(x => x.frame), [2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => s.slots[i].startFrame));
assert.deepEqual(s.slots.slice(12).map(x => x.role), ['architecture', 'park', 'street', 'detail', 'architecture', 'park', 'street']);

// The 8th burst: 10 title slots, same 8 beats, same montage.
const e = j(P.cwvSchedule({ bpm: 99.2, fps: 30, montageShots: 7, burst: 'eighth' }));
assert.equal(e.burst, 'eighth');
assert.equal(e.titleSlots, 10);
assert.equal(e.slots.length, 17);
assert.deepEqual(e.slots.slice(0, 10).map(x => x.endBeat), [1.5, 3, 4, 4.5, 5, 5.5, 6, 6.5, 7, 8]);
assert.deepEqual(e.slots.slice(0, 10).map(x => x.section), ['opening', 'opening', 'opening', 'burst', 'burst', 'burst', 'burst', 'burst', 'burst', 'hold']);
assert.equal(e.title.endFrame, s.title.endFrame);
assert.equal(e.totalFrames, s.totalFrames);
assert.deepEqual(e.title.fontSwitches.map(x => x.state), ['A', 'B', 'C', 'B', 'C', 'D', 'A']);
assert.deepEqual(e.title.fontSwitches.map(x => x.frame), [2, 3, 4, 5, 6, 7, 8].map(i => e.slots[i].startFrame));
assert.deepEqual(e.slots.slice(10).map(x => x.role), ['architecture', 'park', 'street', 'detail', 'architecture', 'park', 'street']);
// Music offset: Selects snaps the music's source start to a frame, so the cuts shift by
// delta = sectionStart - round(sectionStart * fps) / fps, never by more than half a frame; frame 0 stays 0.
assert.equal(P.cwvMusicOffset(null, 30), 0);
assert.equal(P.cwvMusicOffset(14.5, 30), 0);
assert.ok(Math.abs(P.cwvMusicOffset(14.58, 30) - (14.58 - 437 / 30)) < 1e-12, 'C1: bar at 14.58 s plays from 14.567 s');
assert.ok(Math.abs(P.cwvMusicOffset(4.845, 30) - 0.35 / 30) < 1e-9);
for (let x = 0; x < 40; x += 0.137) assert.ok(Math.abs(P.cwvMusicOffset(x, 30)) <= 0.5 / 30 + 1e-12);
const d0 = j(P.cwvSchedule({ bpm: 99.2, fps: 30, montageShots: 7 }));
const d1 = j(P.cwvSchedule({ bpm: 99.2, fps: 30, montageShots: 7, sectionStart: 14.58 }));
assert.equal(d0.offset, 0);
assert.ok(Math.abs(d1.offset - P.cwvMusicOffset(14.58, 30)) < 1e-12);
assert.equal(d1.slots[0].startFrame, 0, 'the video starts at frame 0');
d1.slots.forEach((x, i) => assert.equal(x.endFrame, Math.round((x.endBeat * (60 / 99.2) + d1.offset) * 30), 'slot ' + i + ' end'));
assert.ok(d1.slots.some((x, i) => x.endFrame !== d0.slots[i].endFrame), 'the offset moves some cuts');
assert.equal(d1.title.line1Frame, Math.round((0.25 * (60 / 99.2) + d1.offset) * 30));
// A start exactly between two frames never pushes the first frame off 0.
assert.equal(P.cwvSchedule({ bpm: 120, fps: 30, montageShots: 4, sectionStart: 0.5 / 30 }).slots[0].startFrame, 0);
// Video length: 8 + 2N beats.
assert.equal(P.cwvVideoSeconds(99.2, 7), 22 * 60 / 99.2);

// Montage fit: 40 s cue at 99 BPM starting at 0 fits 12; starting at 30 s fits fewer; too late fits none.
assert.equal(P.cwvFitMontage({ bpm: 99.02, sectionStart: 0, usableEnd: 39.3, requested: 12 }), 12);
assert.equal(P.cwvFitMontage({ bpm: 99.02, sectionStart: 26.66, usableEnd: 39.3, requested: 12 }), 6);
assert.equal(P.cwvFitMontage({ bpm: 99.02, sectionStart: 32, usableEnd: 39.3, requested: 7 }), 0);

// Section snapping to bars; clamp so the video fits.
const bar = 4 * 60 / 99.02, vid = P.cwvVideoSeconds(99.02, 7);
assert.equal(P.cwvSnapSection({ value: 5.1, firstBeat: 0, bpm: 99.02, usableEnd: 39.3, videoSeconds: vid, gridAccepted: true }), 2 * bar);
assert.equal(P.cwvSnapSection({ value: 99, firstBeat: 0, bpm: 99.02, usableEnd: 39.3, videoSeconds: vid, gridAccepted: true }), 10 * bar);
assert.equal(P.cwvSnapSection({ value: 3.14159, firstBeat: 0, bpm: 99.02, usableEnd: 39.3, videoSeconds: vid, gridAccepted: false }), 3.1);
assert.equal(P.cwvSnapSection({ value: 0, firstBeat: 0, bpm: 99.02, usableEnd: 5, videoSeconds: vid, gridAccepted: true }), null);

// Default section = most energetic bar-aligned window (earliest on ties).
const energy = Array(64).fill(0.1); for (let i = 16; i < 64; i++) energy[i] = 0.9;
assert.equal(P.cwvDefaultSection({ firstBeat: 0, bpm: 99.02, beatEnergy: energy, usableEnd: 39.3, videoSeconds: vid }), 4 * bar);
assert.equal(P.cwvDefaultSection({ firstBeat: 0, bpm: 99.02, beatEnergy: Array(64).fill(0.5), usableEnd: 39.3, videoSeconds: vid }), 0);
console.log(JSON.stringify({ planner: 'ok' }));
