// plugins/city-weekend-vlog/tests/planner.test.cjs
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'planner.js'), 'utf8');
const box = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON };
vm.createContext(box);
vm.runInContext(source + ';globalThis.P={cwvSchedule,cwvFitMontage,cwvSnapSection,cwvDefaultSection,cwvVideoSeconds,CWV_TITLE_BEATS,CWV_MIN_WINDOWS};', box);
const P = box.P;
const j = v => JSON.parse(JSON.stringify(v));

// Title section is exactly 9 beats.
assert.equal(P.CWV_TITLE_BEATS.reduce((a, b) => a + b, 0), 9);
assert.equal(P.CWV_MIN_WINDOWS, 17);

// Reference tempo, 30 fps, 7 montage shots.
const s = j(P.cwvSchedule({ bpm: 99.2, fps: 30, montageShots: 7 }));
assert.equal(s.slots.length, 20);
assert.deepEqual(s.slots.slice(0, 4).map(x => [x.startFrame, x.endFrame]), [[0, 32], [32, 59], [59, 77], [77, 82]]);
assert.equal(s.slots[12].section, 'hold');
assert.equal(s.slots[13].section, 'montage');
assert.equal(s.title.endFrame, s.slots[12].endFrame);
assert.equal(s.title.endFrame, Math.round(9 * 60 / 99.2 * 30));           // 163
assert.equal(s.totalFrames, Math.round(23 * 60 / 99.2 * 30));             // 417
for (let i = 1; i < s.slots.length; i++) assert.equal(s.slots[i].startFrame, s.slots[i - 1].endFrame, 'no gaps');
assert.equal(s.title.line1Frame, Math.round(0.25 * 60 / 99.2 * 30));
assert.equal(s.title.connectorFrame, s.slots[1].startFrame);
assert.equal(s.title.placeFrame, s.slots[2].startFrame);
assert.deepEqual(s.title.fontSwitches.map(f => f.state), ['A', 'B', 'C', 'D', 'A', 'B', 'C', 'D', 'A']);
assert.equal(s.title.fontSwitches[1].frame, s.slots[3].startFrame);
assert.deepEqual(s.slots.slice(13).map(x => x.role), ['architecture', 'park', 'street', 'detail', 'architecture', 'park', 'street']);

// Montage fit: 40 s cue at 99 BPM starting at 0 fits 12; starting at 30 s fits fewer; too late fits none.
assert.equal(P.cwvFitMontage({ bpm: 99.02, sectionStart: 0, usableEnd: 39.3, requested: 12 }), 12);
assert.equal(P.cwvFitMontage({ bpm: 99.02, sectionStart: 26.66, usableEnd: 39.3, requested: 12 }), 5);
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
