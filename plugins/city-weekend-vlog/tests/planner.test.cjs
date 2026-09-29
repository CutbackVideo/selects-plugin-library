// plugins/city-weekend-vlog/tests/planner.test.cjs
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'planner.js'), 'utf8');
const box = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON };
vm.createContext(box);
vm.runInContext(source + ';globalThis.P={cwvSnapCuts,cwvPlanBuild,CWV_TITLE_TOTAL_BEATS,cwvSchedule,cwvFitMontage,cwvSnapSection,cwvDefaultSection,cwvVideoSeconds,cwvBurstFor,cwvMinWindows,cwvMusicOffset,CWV_TITLE_BEATS,CWV_TITLE_ROLES,CWV_FONT_STATES,CWV_TITLE_BEATS_EIGHTH,CWV_TITLE_ROLES_EIGHTH,CWV_FONT_STATES_EIGHTH,CWV_MIN_WINDOWS};', box);
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

// ---- Onset-anchored cuts (cwvSnapCuts) ----
const B = 60 / 99.2;                                  // one beat at the reference tempo (W = 0.1 beat = 60.5 ms)
const grid16 = j(P.cwvSchedule({ bpm: 99.2, fps: 30, montageShots: 4 })).cuts;
const tpl16 = { beats: P.CWV_TITLE_BEATS.concat([2, 2, 2, 2]), burstFrom: 3, burstTo: 7 };
const snap = (onsets, o = {}, g = grid16, t = tpl16) => j(P.cwvSnapCuts(g, t, onsets, { bpm: 99.2, fps: 30, sectionStart: 0, thresholds: { l: 2, m: 2, h: 2 }, ...o }));
const logAt = (r, i) => r.log.find(e => e.index === i);
// The schedule's grid cuts are its beat boundaries in seconds.
assert.deepEqual(grid16, [0, ...[1.5, 3, 4, 4.25, 4.5, 4.75, 5, 5.5, 6, 6.5, 7, 8, 10, 12, 14, 16].map(b => b * B)]);
// No onsets: exactly the grid, and the schedule is unchanged.
assert.deepEqual(snap([]).cuts, grid16);
assert.deepEqual(snap(null).cuts, grid16);
assert.deepEqual(j(P.cwvSchedule({ bpm: 99.2, fps: 30, montageShots: 4, sectionStart: 0, onsets: [] })).slots, j(P.cwvSchedule({ bpm: 99.2, fps: 30, montageShots: 4, sectionStart: 0 })).slots);
// A snappable cut (montage, index 13 = beat 10) moves onto an onset inside the window; the window is 0.1 beat
// (60.5 ms at 99.2 BPM) ...
assert.equal(snap([[10 * B + 0.058, 'l', 5]]).cuts[13], 10 * B + 0.058);
assert.equal(snap([[10 * B + 0.062, 'l', 5]]).cuts[13], 10 * B);
assert.equal(snap([[10 * B - 0.058, 'h', 5]]).cuts[13], 10 * B - 0.058);
// ... capped at 70 ms at slower tempi (0.1 beat is 75 ms at 80 BPM).
const B80 = 0.75, grid80 = j(P.cwvSchedule({ bpm: 80, fps: 30, montageShots: 4 })).cuts;
const snap80 = on => j(P.cwvSnapCuts(grid80, tpl16, on, { bpm: 80, fps: 30, sectionStart: 0 }));
assert.equal(snap80([[10 * B80 + 0.068, 'l', 5]]).cuts[13], 10 * B80 + 0.068);
assert.equal(snap80([[10 * B80 + 0.072, 'l', 5]]).cuts[13], 10 * B80, 'the 70 ms cap');
assert.equal(snap80([[10 * B80 + 0.072, 'l', 5]]).log.find(e => e.index === 13).reason, 'no onset');
// Strength: an onset is listed at max(2, the band threshold); a snap target needs 1.5 times that (v2.6). The onsets
// sit 45 ms from the grid, more than a frame at 30 fps.
assert.equal(logAt(snap([[10 * B + 0.045, 'l', 1.9]], { thresholds: {} }), 13).reason, 'no onset', 'below 2 is not an onset');
assert.equal(snap([[10 * B + 0.045, 'l', 2.9]], { thresholds: {} }).cuts[13], 10 * B, 'ratio 1.45');
assert.equal(logAt(snap([[10 * B + 0.045, 'l', 2.9]], { thresholds: {} }), 13).reason, 'weak onset');
assert.equal(snap([[10 * B + 0.045, 'l', 3]], { thresholds: {} }).cuts[13], 10 * B + 0.045, 'ratio 1.5');
assert.equal(snap([[10 * B + 0.045, 'l', 5.9]], { thresholds: { l: 4 } }).cuts[13], 10 * B, 'below 1.5 of the band threshold');
assert.equal(snap([[10 * B + 0.045, 'l', 6]], { thresholds: { l: 4 } }).cuts[13], 10 * B + 0.045, 'at 1.5 of the band threshold');
// Already on an onset: a qualifying onset of any band within one frame of the grid keeps the cut there, however
// strong a farther onset is (Brooklyn Boom Bap live, cut 12: mid -2 ms at 1.23, low +47 ms at 1.04; here the low one
// is strong).
assert.equal(snap([[10 * B + 0.03, 'l', 9]]).cuts[13], 10 * B, 'a strong onset 30 ms away is within the frame');
assert.match(logAt(snap([[10 * B + 0.03, 'l', 9]]), 13).reason, /^on grid \(l onset/);
assert.equal(snap([[10 * B - 0.002, 'h', 2], [10 * B + 0.047, 'l', 9]]).cuts[13], 10 * B, 'a threshold-level hat on the grid');
assert.match(logAt(snap([[10 * B - 0.002, 'm', 2], [10 * B + 0.047, 'l', 9]]), 13).reason, /^on grid \(m onset/);
assert.equal(snap([[10 * B + 0.035, 'l', 9]]).cuts[13], 10 * B + 0.035, 'just beyond a frame');
assert.equal(snap([[10 * B + 0.02, 'l', 9]], { fps: 60 }).cuts[13], 10 * B + 0.02, 'a frame is 16.7 ms at 60 fps');
assert.equal(snap([[10 * B + 0.047, 'l', 4.8]], { thresholds: { l: 4.6, m: 6.2, h: 6.3 } }).cuts[13], 10 * B, 'Brooklyn cut 12 without its mid onset: 1.04 is weak');
// Score: ratio - 0.5 * |offset| / window, over all bands (v2.6; no band goes first). A nearer, weaker onset beats a
// farther one unless the farther one is clearly stronger.
const th = { thresholds: { l: 4, m: 2, h: 3 } };
assert.equal(snap([[10 * B + 0.036, 'm', 4], [10 * B - 0.060, 'h', 6.3]], th).cuts[13], 10 * B + 0.036, 'mid 2.0 at 36 ms (1.70) beats high 2.1 at 60 ms (1.60)');
assert.equal(logAt(snap([[10 * B + 0.036, 'm', 4], [10 * B - 0.060, 'h', 6.3]], th), 13).band, 'm');
assert.equal(snap([[10 * B + 0.036, 'm', 4], [10 * B - 0.060, 'h', 9]], th).cuts[13], 10 * B - 0.060, 'high 3.0 at 60 ms (2.50) wins');
assert.equal(snap([[10 * B + 0.045, 'm', 4], [10 * B - 0.045, 'h', 6]], th).cuts[13], 10 * B - 0.045, 'equal scores: the earlier of two equally near onsets');
assert.equal(snap([[10 * B + 0.04, 'm', 4], [10 * B - 0.05, 'h', 6]], th).cuts[13], 10 * B + 0.04, 'equal ratios: the nearer onset');
// Low band: the target must also beat the grid position's own onset (the strongest qualifying onset nearer the grid,
// else ratio 1) by 0.25. Brooklyn Boom Bap live, cut 11: mid -3 ms at 1.47 and low +32 ms at 1.50; at 60 fps the mid
// onset (here -20 ms) is outside the frame, so only this guard keeps the cut.
const bk = { fps: 60, thresholds: { l: 4.6, m: 6.2, h: 6.3 } };
assert.equal(snap([[10 * B - 0.02, 'm', 9.1], [10 * B + 0.032, 'l', 6.9]], bk).cuts[13], 10 * B, 'low 1.50 vs its grid onset 1.47');
assert.equal(logAt(snap([[10 * B - 0.02, 'm', 9.1], [10 * B + 0.032, 'l', 6.9]], bk), 13).reason, 'low onset not above the grid');
assert.equal(snap([[10 * B - 0.02, 'm', 9.1], [10 * B + 0.032, 'l', 7.95]], bk).cuts[13], 10 * B + 0.032, 'low 1.73 clears 1.47 + 0.25');
assert.equal(snap([[10 * B - 0.02, 'm', 9.1], [10 * B + 0.032, 'h', 9.45]], bk).cuts[13], 10 * B + 0.032, 'the guard is for the low band only');
assert.equal(snap([[10 * B + 0.05, 'l', 4]]).cuts[13], 10 * B + 0.05, 'a lone low onset needs only the 1.5 floor');
// Which cuts snap: the burst anchor (index 3), cuts that start a slot of at least one beat (1, 2, 11, 12 and the
// montage), never the burst's own cuts or the half-beat run; frame 0 and the end never move.
const everywhere = grid16.map(g => [g + 0.045, 'l', 5]);
const all = snap(everywhere);
assert.deepEqual(all.log.filter(e => e.reason === 'onset').map(e => e.index), [1, 2, 3, 11, 12, 13, 14, 15]);
assert.deepEqual(all.log.filter(e => e.kind === 'burst').map(e => e.index), [4, 5, 6, 7]);
assert.deepEqual(all.log.filter(e => e.kind === 'grid').map(e => e.index), [8, 9, 10]);
assert.equal(all.cuts[0], 0); assert.equal(all.cuts[16], grid16[16]);
for (const i of [8, 9, 10]) assert.equal(all.cuts[i], grid16[i], 'the half-beat run returns to the grid');
// Burst spacing (the reference's anchor nudge: 58 ms after the grid onto a clear mid onset, nothing on the grid): the
// burst is laid out from the snapped anchor in fixed alternating frames (4.54 frames per 16th at 30 fps), and the
// first half-beat shot absorbs the shift.
const anchored = snap([[4 * B + 0.058, 'm', 5]]);
assert.equal(anchored.cuts[3], 4 * B + 0.058);
for (const i of [4, 5, 6, 7]) assert.ok(Math.abs(anchored.cuts[i] - (grid16[i] + 0.058)) < 1e-12, 'burst cut ' + i + ' keeps the template spacing');
assert.deepEqual(anchored.frames.slice(3, 8).map((f, k, a) => (k ? f - a[k - 1] : 0)).slice(1), [5, 4, 5, 4]);
assert.equal(anchored.cuts[8], grid16[8]);
assert.equal(anchored.frames[8] - anchored.frames[7], Math.round(5.5 * B * 30) - Math.round((5 * B + 0.058) * 30), 'the first half-beat shot is shorter');
// An onset on the anchor's grid frame keeps the anchor, and so the whole burst, on the grid (v2.6: a cut within a
// frame of an onset never moves; v2.5 moved the anchor onto it and kept the burst on the grid only while the anchor
// kept its frame). Any snap moves a cut by more than a frame, so the burst is re-laid from every snapped anchor.
const gridFrames = anchored.frames.map((_, i) => (grid16[i] === 0 ? 0 : Math.round(grid16[i] * 30)));
const subFrame = snap([[4 * B - 0.0007, 'm', 5]]);
assert.equal(subFrame.cuts[3], grid16[3], 'the anchor stays on the grid');
assert.match(logAt(subFrame, 3).reason, /^on grid/);
for (const i of [4, 5, 6, 7]) {
  assert.equal(subFrame.cuts[i], grid16[i], 'burst cut ' + i + ' stays on the grid');
  assert.equal(logAt(subFrame, i).reason, 'grid (anchor frame unchanged)');
}
assert.deepEqual(subFrame.frames, gridFrames, 'every frame is the grid frame');
// Snapping never puts a cut more than half a frame before its onset, at any frame rate and music offset.
for (const fps of [23.976, 24, 25, 29.97, 30, 60]) {
  for (const ss of [0, 0.013, 7.31, 14.58]) {
    const on = grid16.slice(1, -1).map((g, k) => [ss + g + ((k * 7919) % 110 - 55) / 1000, 'l', 5]);
    const r = j(P.cwvSnapCuts(grid16, tpl16, on, { bpm: 99.2, fps, sectionStart: ss }));
    const off = P.cwvMusicOffset(ss, fps);
    assert.ok(r.log.some(e => e.reason === 'onset'), 'some cuts snap (' + fps + ', ' + ss + ')');
    r.log.filter(e => e.reason === 'onset').forEach(e => {
      assert.ok(r.frames[e.index] / fps - (e.onset + off) >= -0.5 / fps - 1e-9, 'half a frame early at most (' + fps + ', ' + ss + ', cut ' + e.index + ')');
      assert.ok(r.frames[e.index] / fps - (e.onset + off) <= 0.5 / fps + 1e-9, 'nearest frame');
    });
  }
}
// Onsets are in music seconds: the section start shifts them onto the timeline.
assert.ok(Math.abs(snap([[20 + 10 * B + 0.045, 'l', 5]], { sectionStart: 20 }).cuts[13] - (10 * B + 0.045)) < 1e-9);
// Minimum shot: a snap that leaves a neighbour below 4 frames, or below 0.75 of its template length, is reverted.
// Template [1.02 s, 0.17 s, 1.81 s] at 60 BPM: moving the cut at 1.19 s to 1.145 s (45 ms, beyond a frame) keeps 0.74
// of the middle shot but first leaves it 3 frames long; 1.153 s leaves 4 frames and 0.78.
const tinyGrid = [0, 1.02, 1.19, 3], tinyTpl = { beats: [1.02, 0.17, 1.81], burstFrom: -1, burstTo: -1 };
const tiny = j(P.cwvSnapCuts(tinyGrid, tinyTpl, [[1.145, 'l', 5]], { bpm: 60, fps: 30, sectionStart: 0 }));
assert.equal(tiny.cuts[2], 1.19);
assert.match(tiny.log.find(e => e.index === 2).reason, /reverted: slot 1 min-frames/);
assert.equal(j(P.cwvSnapCuts(tinyGrid, tinyTpl, [[1.153, 'l', 5]], { bpm: 60, fps: 30, sectionStart: 0 })).cuts[2], 1.153, '4 frames is enough');
// Low confidence (fixed timing, beat not found): only low-band onsets, within +/- 120 ms regardless of the tempo.
const grid8 = j(P.cwvSchedule({ bpm: 99.2, fps: 30, montageShots: 4, burst: 'eighth' })).cuts;
const tpl8 = { beats: P.CWV_TITLE_BEATS_EIGHTH.concat([2, 2, 2, 2]), burstFrom: 3, burstTo: 5 };
const low = (on, o = {}) => j(P.cwvSnapCuts(grid8, tpl8, on, { bpm: 99.2, fps: 30, sectionStart: 0, lowConfidence: true, ...o }));
assert.equal(low([[10 * B + 0.1, 'l', 5]]).cuts[11], 10 * B + 0.1, 'a bass onset 100 ms away');
assert.equal(low([[10 * B + 0.125, 'l', 5]]).cuts[11], 10 * B, 'beyond 120 ms');
assert.equal(low([[10 * B + 0.05, 'h', 9], [10 * B + 0.05, 'm', 9]]).cuts[11], 10 * B, 'high and mid are ignored');
assert.equal(low([[10 * B + 0.1, 'l', 2.9]]).cuts[11], 10 * B, 'the 1.5 floor applies');
assert.equal(low([[10 * B + 0.1, 'l', 5], [10 * B + 0.01, 'h', 2]]).cuts[11], 10 * B, 'so does an onset of any band on the grid');
// ... where the 0.75 rule binds: the hold (index 9, beat 7) pulled 100 ms early would leave the half-beat shot before
// it at 0.67 of its length, so it stays; 70 ms early leaves 0.77.
assert.equal(low([[7 * B - 0.1, 'l', 5]]).cuts[9], 7 * B);
assert.match(low([[7 * B - 0.1, 'l', 5]]).log.find(e => e.index === 9).reason, /reverted: slot 8 min-share/);
assert.equal(low([[7 * B - 0.07, 'l', 5]]).cuts[9], 7 * B - 0.07);
// The same happens to the anchor of a burst: its first half-beat shot must keep 0.75 of its length.
assert.match(low([[4 * B + 0.1, 'l', 5]]).log.find(e => e.index === 3).reason, /reverted: slot 5 min-share/);
// Deterministic: the same input gives the same cuts; input order does not matter.
const shuffled = everywhere.slice().reverse();
assert.deepEqual(snap(shuffled).cuts, all.cuts);

// The schedule uses the snapped cuts for every frame: slots, the title's font switches (on the burst cuts), the
// connector and place lines and the title end (title -> montage cut). line1 stays on its grid position.
const on16 = [[4 * B + 0.05, 'h', 6], [1.5 * B - 0.045, 'l', 6], [8 * B + 0.04, 'l', 6], [5.5 * B + 0.04, 'l', 9]];
const ss = j(P.cwvSchedule({ bpm: 99.2, fps: 30, montageShots: 4, sectionStart: 0, onsets: on16, onsetThresholds: { l: 3, m: 3, h: 3 } }));
const plain = j(P.cwvSchedule({ bpm: 99.2, fps: 30, montageShots: 4, sectionStart: 0 }));
assert.equal(ss.cuts[3], 4 * B + 0.05);
assert.equal(ss.cuts[1], 1.5 * B - 0.045);
assert.equal(ss.cuts[12], 8 * B + 0.04);
assert.equal(ss.cuts[8], plain.cuts[8], 'half-beat cut on the grid despite a strong onset');
ss.slots.forEach((x, i) => { assert.equal(x.startFrame, Math.round(ss.cuts[i] * 30) || 0); assert.equal(x.endFrame, Math.round(ss.cuts[i + 1] * 30)); });
for (let i = 1; i < ss.slots.length; i++) assert.equal(ss.slots[i].startFrame, ss.slots[i - 1].endFrame, 'contiguous');
assert.deepEqual(ss.title.fontSwitches.map(x => x.frame), [2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => ss.slots[i].startFrame));
assert.notEqual(ss.title.fontSwitches[1].frame, plain.title.fontSwitches[1].frame, 'the burst font switch moved with its cut');
assert.equal(ss.title.connectorFrame, ss.slots[1].startFrame);
assert.equal(ss.title.endFrame, ss.slots[11].endFrame);
assert.equal(ss.title.endFrame, Math.round((8 * B + 0.04) * 30));
assert.equal(ss.title.line1Frame, plain.title.line1Frame);
assert.equal(ss.totalFrames, plain.totalFrames, 'the end never moves');
assert.ok(ss.snapLog.length === ss.slots.length - 1);
// Without music (no section start) nothing snaps.
assert.deepEqual(j(P.cwvSchedule({ bpm: 99.2, fps: 30, montageShots: 4, onsets: on16 })).cuts, plain.cuts);
// cuts: reusing the planned seconds at the Draft's real rate gives the frames assemble.js places (same expression),
// with the music offset of that rate.
for (const fps of [23.976, 25, 29.97]) {
  const at = j(P.cwvSchedule({ bpm: 99.2, fps, montageShots: 4, sectionStart: 14.58, cuts: ss.cuts }));
  const off = P.cwvMusicOffset(14.58, fps);
  at.slots.forEach((x, i) => assert.equal(x.endFrame, Math.round((ss.cuts[i + 1] + off) * fps)));
  assert.deepEqual(at.title.fontSwitches.map(x => x.frame), [2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => at.slots[i].startFrame));
}
assert.throws(() => P.cwvSchedule({ bpm: 99.2, fps: 30, montageShots: 5, cuts: ss.cuts }), /cuts do not match/);
// The plan allocates shots for the snapped slot lengths and hands the cuts on.
const cands = []; for (let r = 0; r < 12; r++) for (const role of ['street', 'architecture', 'landmark', 'wide', 'park', 'detail']) cands.push({ rid: 'r' + r, role, t: 5 + r, score: 1, sourceDuration: 30 });
const plan = j(P.cwvPlanBuild({ candidates: cands, bpm: 99.2, fps: 30, montageShots: 4, seed: '1', burst: 'sixteenth', sectionStart: 0, onsets: on16, onsetThresholds: { l: 3, m: 3, h: 3 } }));
assert.ok(plan.ok);
assert.deepEqual(plan.schedule.cuts, ss.cuts);
plan.picks.forEach((k, i) => { if (k.kind === 'video') assert.ok(Math.abs((k.endSeconds - k.startSeconds) - (ss.slots[i].endFrame - ss.slots[i].startFrame) / 30) < 1e-9, 'shot ' + i + ' fits its snapped slot'); });

console.log(JSON.stringify({ planner: 'ok' }));
