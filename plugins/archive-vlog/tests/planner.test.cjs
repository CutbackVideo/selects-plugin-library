// plugins/archive-vlog/tests/planner.test.cjs
const assert = require('assert'); const fs = require('fs'); const vm = require('vm');
const ctx = {}; vm.createContext(ctx); vm.runInContext(fs.readFileSync(__dirname + '/../planner.js', 'utf8'), ctx);
// Objects built inside the vm context have that realm's prototypes, which deepStrictEqual rejects; compare plain copies.
const j = v => JSON.parse(JSON.stringify(v));
const F = 30000 / 1001;
const near = (x, y, eps, msg) => assert.ok(Math.abs(x - y) <= eps, (msg || '') + ': ' + x + ' vs ' + y);

// Constants.
const K = j(vm.runInContext('({ AV_LENGTHS, AV_INTRO_BEATS, AV_TEMPO_MIN, AV_TEMPO_MAX, AV_FALLBACK_BPM, AV_SLOW_MAX_BPM, AV_MIN_MONTAGE, AV_ROLES, AV_MONTAGE_ROLES, AV_ROLE_FALLBACK, AV_SOURCE_TAIL, AV_PHOTO_SHARE, AV_PHOTO_RUN_MAX })', ctx));
assert.deepStrictEqual(K.AV_LENGTHS, { short: 8, standard: 16, long: 24 });
assert.deepStrictEqual(K.AV_INTRO_BEATS, { opening: 6, credit: 2 });
assert.strictEqual(K.AV_TEMPO_MIN, 70); assert.strictEqual(K.AV_TEMPO_MAX, 160);
assert.strictEqual(K.AV_FALLBACK_BPM, 72); assert.strictEqual(K.AV_SLOW_MAX_BPM, 110); assert.strictEqual(K.AV_MIN_MONTAGE, 4);
assert.strictEqual(K.AV_SOURCE_TAIL, 0.15); assert.strictEqual(K.AV_PHOTO_SHARE, 1 / 3); assert.strictEqual(K.AV_PHOTO_RUN_MAX, 2);
assert.deepStrictEqual(K.AV_MONTAGE_ROLES, ['crowd', 'transit', 'water', 'architecture', 'ride', 'food', 'skyline']);
assert.deepStrictEqual(K.AV_ROLES, ['opening', 'portrait', 'crowd', 'transit', 'water', 'architecture', 'ride', 'food', 'skyline', 'ending']);
assert.deepStrictEqual(Object.keys(K.AV_ROLE_FALLBACK).sort(), K.AV_ROLES.slice().sort(), 'a fallback list per role');
for (const [role, list] of Object.entries(K.AV_ROLE_FALLBACK)) {
  assert.ok(list.length >= 1 && list.every(r => K.AV_ROLES.includes(r) && r !== role), role + ' fallbacks are other roles');
  assert.ok(!list.includes('portrait') && !list.includes('ending'), role + ': the credit and final roles are never fallbacks');
}
assert.deepStrictEqual(K.AV_ROLE_FALLBACK.opening, ['crowd', 'ride', 'skyline']);
assert.deepStrictEqual(K.AV_ROLE_FALLBACK.ending, ['skyline', 'transit', 'crowd']);
// Mini Vlog's Groove, hook section and per-shot pace machinery are gone.
for (const name of ['AV_GROOVE_PHRASE_BEATS', 'AV_GROOVE_FILL_RATIO', 'AV_MIN_SHOTS', 'AV_FALLBACK_SHOT', 'avGrooveBeats', 'avGrooveSpan', 'avGrooveFit',
  'avGrooveCandidates', 'avGrooveHolds', 'avGrooveOpener', 'avFillBeats', 'avHookSection', 'avBeatsPerShot', 'avShotSeconds'])
  assert.strictEqual(vm.runInContext('typeof ' + name, ctx), 'undefined', name + ' removed');

// Grid and tempo.
assert.strictEqual(ctx.avGridUsable({ bpm: 65, accepted: true }), false);
assert.strictEqual(ctx.avGridUsable({ bpm: 70, accepted: true }), true);
assert.strictEqual(ctx.avGridUsable({ bpm: 160, accepted: true }), true);
assert.strictEqual(ctx.avGridUsable({ bpm: 161, accepted: true }), false);
assert.strictEqual(ctx.avGridUsable({ bpm: 108, accepted: false }), false);
assert.strictEqual(ctx.avGridUsable({ bpm: null, accepted: true }), false);
assert.deepStrictEqual(j(ctx.avTempo({ bpm: 72, accepted: true })), { gridded: true, approxBpm: null, tempo: 72, beatSeconds: 60 / 72 });
// No music, own music 'none' (not accepted, no approximate tempo), or a tempo outside the range: the 72 bpm beat.
for (const o of [{ bpm: null, accepted: false }, { bpm: 108, accepted: false }, { bpm: 60, accepted: true }, {}])
  assert.deepStrictEqual(j(ctx.avTempo(o)), { gridded: false, approxBpm: null, tempo: 72, beatSeconds: 60 / 72 }, JSON.stringify(o));
// Own music 'approximate': its detected beat, still gridless.
assert.deepStrictEqual(j(ctx.avTempo({ bpm: null, accepted: false, approxBpm: 96 })), { gridded: false, approxBpm: 96, tempo: 96, beatSeconds: 60 / 96 });
assert.strictEqual(ctx.avTempo({ bpm: 108, accepted: true, approxBpm: 96 }).tempo, 108, 'a usable grid wins');
assert.strictEqual(ctx.avTempo({ bpm: null, accepted: false, approxBpm: 200 }).tempo, 72, 'approximate tempo out of range');
assert.strictEqual(ctx.avApproxTempo({ gridded: false, approxBpm: 120 }), 120);
assert.strictEqual(ctx.avApproxTempo({ gridded: true, approxBpm: 120 }), null);
assert.strictEqual(ctx.avApproxTempo({ gridded: false, approxBpm: 65 }), null);
assert.strictEqual(ctx.avApproxTempo({ gridded: false }), null);

// Template rhythm: montage beats per shot and final beats, split at 110 bpm.
for (const [bpm, cin, quick, fin] of [[60, 2, 1, 4], [72, 2, 1, 4], [110, 2, 1, 4], [110.01, 4, 2, 8], [120, 4, 2, 8], [150, 4, 2, 8], [160, 4, 2, 8]]) {
  assert.strictEqual(ctx.avMontageBeats('cinematic', bpm), cin, 'cinematic M at ' + bpm);
  assert.strictEqual(ctx.avMontageBeats(undefined, bpm), cin, 'Cinematic is the default pace');
  assert.strictEqual(ctx.avMontageBeats('quick', bpm), quick, 'quick M at ' + bpm);
  assert.strictEqual(ctx.avFinalBeats(bpm), fin, 'F at ' + bpm);
}
// Lengths: Quick doubles the shots so a Length keeps its duration.
assert.deepStrictEqual(['short', 'standard', 'long', 'nope'].map(l => ctx.avMontageShots(l, 'cinematic')), [8, 16, 24, 16]);
assert.deepStrictEqual(['short', 'standard', 'long'].map(l => ctx.avMontageShots(l, 'quick')), [16, 32, 48]);
for (const bpm of [72, 100, 120, 150]) for (const l of ['short', 'standard', 'long'])
  assert.strictEqual(ctx.avTemplate({ bpm, pace: 'quick', montageShots: ctx.avMontageShots(l, 'quick') }).totalBeats,
    ctx.avTemplate({ bpm, pace: 'cinematic', montageShots: ctx.avMontageShots(l, 'cinematic') }).totalBeats, l + ' keeps its length at ' + bpm);

// The template: 6 + 2 + M x N + F, roles opening / portrait / montage cycle / ending, intro and final video-only.
const t72 = j(ctx.avTemplate({ bpm: 72, pace: 'cinematic', montageShots: 16 }));
assert.deepStrictEqual(t72.beatsList, [6, 2].concat(Array(16).fill(2), [4]));
assert.strictEqual(t72.totalBeats, 44); assert.strictEqual(t72.montageStart, 8);
near(ctx.avVideoSeconds({ bpm: 72, pace: 'cinematic', montageShots: 16 }), 44 * 60 / 72, 1e-9, 'Standard at 72 bpm = 36.7 s');
assert.deepStrictEqual(t72.roles.slice(0, 11), ['opening', 'portrait', 'crowd', 'transit', 'water', 'architecture', 'ride', 'food', 'skyline', 'crowd', 'transit']);
assert.strictEqual(t72.roles[17], 'transit'); assert.strictEqual(t72.roles[18], 'ending');
assert.deepStrictEqual(t72.parts.filter((p, i) => i < 2 || i === 18), ['opening', 'credit', 'final']);
assert.ok(t72.parts.slice(2, 18).every(p => p === 'montage'));
assert.deepStrictEqual(t72.videoOnly, [true, true].concat(Array(16).fill(false), [true]));
assert.deepStrictEqual(j(ctx.avTemplate({ bpm: 120, pace: 'cinematic', montageShots: 16 })).beatsList, [6, 2].concat(Array(16).fill(4), [8]));
assert.deepStrictEqual(j(ctx.avTemplate({ bpm: 120, pace: 'quick', montageShots: 32 })).beatsList, [6, 2].concat(Array(32).fill(2), [8]));
assert.deepStrictEqual(j(ctx.avTemplate({ bpm: 90, pace: 'quick', montageShots: 4 })).beatsList, [6, 2, 1, 1, 1, 1, 4]);
// The montage must be whole bars.
assert.throws(() => ctx.avTemplate({ bpm: 72, pace: 'cinematic', montageShots: 3 }), /whole bars/);
assert.throws(() => ctx.avTemplate({ bpm: 72, pace: 'quick', montageShots: 6 }), /whole bars/);
assert.throws(() => ctx.avTemplate({ bpm: 72, pace: 'cinematic', montageShots: 0 }), /whole bars/);
assert.doesNotThrow(() => ctx.avTemplate({ bpm: 120, pace: 'cinematic', montageShots: 1 }));

// Schedules at every tempo, both paces, every Length, at 29.97 and 25 fps, with and without a music offset: the
// boundaries are integer frames at round((beats * 60 / bpm + delta) * fps), the beat sums are exact, the montage starts
// on beat 8 and the final shot ends the video.
const totals = {};
for (const bpm of [60, 70, 72, 75, 80, 100, 120, 150]) for (const pace of ['cinematic', 'quick']) for (const length of ['short', 'standard', 'long'])
  for (const fps of [F, 25]) for (const ss of [undefined, 0.013, 7.31]) {
    const tpl = ctx.avTemplate({ bpm, pace, montageShots: ctx.avMontageShots(length, pace) });
    const s = ctx.avSchedule({ bpm, fps, beatsList: tpl.beatsList, roles: tpl.roles, parts: tpl.parts, sectionStart: ss });
    const off = ctx.avMusicOffset(ss, fps), tag = [bpm, pace, length, fps.toFixed(2), ss].join(' ');
    assert.strictEqual(s.slots.length, tpl.beatsList.length, tag);
    assert.strictEqual(s.slots[0].startFrame, 0, tag);
    let beats = 0;
    s.slots.forEach((x, i) => {
      assert.ok(Number.isInteger(x.startFrame) && Number.isInteger(x.endFrame), tag + ' integer frames');
      if (i) assert.strictEqual(x.startFrame, s.slots[i - 1].endFrame, tag + ' contiguous');
      assert.strictEqual(x.startBeat, beats, tag + ' exact beat sum'); beats += tpl.beatsList[i];
      assert.strictEqual(x.endBeat, beats, tag);
      assert.strictEqual(x.endFrame, Math.round((x.endBeat * 60 / bpm + off) * fps), tag + ' absolute boundary');
      assert.strictEqual(x.role, tpl.roles[i]); assert.strictEqual(x.part, tpl.parts[i]); assert.strictEqual(x.beats, tpl.beatsList[i]);
    });
    assert.strictEqual(beats, tpl.totalBeats, tag);
    assert.strictEqual(s.slots[2].startBeat, 8, tag + ' montage on beat 8');
    assert.strictEqual(s.slots[s.slots.length - 1].endBeat, tpl.totalBeats, tag);
    assert.strictEqual(s.totalFrames, Math.round((tpl.totalBeats * 60 / bpm + off) * fps), tag + ' totalFrames');
    if (fps === F && ss === undefined) totals[bpm + ' ' + pace + ' ' + length] = s.totalFrames;
  }
// Literal fixtures at 29.97 fps (delta 0), Standard: 44 beats up to 110 bpm, 80 above.
assert.deepStrictEqual([60, 70, 72, 75, 80, 100, 120, 150].map(b => totals[b + ' cinematic standard']), [1319, 1130, 1099, 1055, 989, 791, 1199, 959]);
assert.deepStrictEqual([60, 70, 72, 75, 80, 100, 120, 150].map(b => totals[b + ' quick standard']), [1319, 1130, 1099, 1055, 989, 791, 1199, 959]);
assert.deepStrictEqual(['short', 'standard', 'long'].map(l => totals['72 cinematic ' + l]), [699, 1099, 1499]);
// Keys of a template slot.
assert.deepStrictEqual(j(Object.keys(ctx.avSchedule({ bpm: 72, fps: F, beatsList: t72.beatsList, roles: t72.roles, parts: t72.parts }).slots[0]).sort()),
  ['beats', 'endBeat', 'endFrame', 'index', 'part', 'role', 'startBeat', 'startFrame']);
assert.throws(() => ctx.avSchedule({ bpm: 72, fps: F, beatsList: [6, 2], roles: ['opening'] }), /one entry per slot/);
// No grid: the same template on the 72 bpm beat (seconds per beat as shotSeconds), beats null.
const g = j(ctx.avSchedule({ bpm: null, fps: F, beatsList: t72.beatsList, roles: t72.roles, shotSeconds: 60 / 72 }));
assert.strictEqual(g.gridded, false); assert.strictEqual(g.totalFrames, 1099);
const gat = t72.beatsList.reduce((a, b) => (a.push(a[a.length - 1] + b), a), [0]);
g.slots.forEach((x, i) => { assert.strictEqual(x.startBeat, null); assert.strictEqual(x.endFrame, Math.round(gat[i + 1] * (60 / 72) * F)); });
// Without beatsList the schedule is uniform (shots x beatsPerShot) and roles cycle through the montage roles.
const u = j(ctx.avSchedule({ bpm: 108, fps: F, shots: 9, beatsPerShot: 1 }));
assert.deepStrictEqual(u.slots.map(x => x.role), ['crowd', 'transit', 'water', 'architecture', 'ride', 'food', 'skyline', 'crowd', 'transit']);
assert.throws(() => ctx.avSchedule({ bpm: 108, fps: F, shots: 0, beatsPerShot: 1 }));

// Music offset: sectionStart 1.0 at 29.97 -> round(29.97)=30 -> delta = 1 - 30/F.
near(ctx.avMusicOffset(1.0, F), 1 - 30 / F, 1e-12, 'offset');
assert.strictEqual(ctx.avMusicOffset(null, F), 0);

// The shrink ladder: whole bars, Cinematic by 2 shots, Quick by 4, down to 4 montage shots at both paces.
const ladder = (requested, pace, bpm) => j(ctx.avMontageLadder({ requested, pace, bpm }));
assert.deepStrictEqual(ladder(16, 'cinematic', 72), [16, 14, 12, 10, 8, 6, 4]);
assert.deepStrictEqual(ladder(8, 'cinematic', 120), [8, 6, 4]);
assert.deepStrictEqual(ladder(32, 'quick', 72), [32, 28, 24, 20, 16, 12, 8, 4]);
assert.deepStrictEqual(ladder(16, 'quick', 120), [16, 12, 8, 4]);
assert.deepStrictEqual(ladder(2, 'cinematic', 72), [4], 'a request under the minimum asks for 4');
assert.deepStrictEqual(ladder(0, 'quick', 120), [4]);
assert.deepStrictEqual(ladder(15, 'cinematic', 72)[0], 14, 'a request rounds down to a step');
for (const requested of [NaN, undefined, Infinity]) {
  assert.strictEqual(ladder(requested, 'cinematic', 72)[0], 16, 'non-finite -> Standard');
  assert.strictEqual(ladder(requested, 'quick', 72)[0], 32);
}
for (const pace of ['cinematic', 'quick']) for (const bpm of [72, 100, 110, 120, 150]) for (const l of ['short', 'standard', 'long']) {
  const m = ctx.avMontageBeats(pace, bpm), list = ladder(ctx.avMontageShots(l, pace), pace, bpm);
  list.forEach(n => assert.strictEqual((n * m) % 4, 0, pace + ' ' + bpm + ' ' + n + ' shots are whole bars'));
  assert.strictEqual(list[list.length - 1], 4, 'the shortest montage is 4 shots');
  assert.ok(list.every(n => n >= 4));
}

// Music capacity: the longest montage whose whole video fits from the section start.
const b72 = 60 / 72;
assert.strictEqual(ctx.avFitShots({ requested: 16, pace: 'cinematic', bpm: 72, sectionStart: 0, usableEnd: Infinity }), 16);
assert.strictEqual(ctx.avFitShots({ requested: 16, pace: 'cinematic', bpm: 72 }), 16, 'no music: no cap');
assert.strictEqual(ctx.avFitShots({ requested: 16, pace: 'cinematic', bpm: 72, sectionStart: 1, usableEnd: 1 + 44 * b72 }), 16, 'exactly fits');
assert.strictEqual(ctx.avFitShots({ requested: 16, pace: 'cinematic', bpm: 72, sectionStart: 1, usableEnd: 1 + 43 * b72 }), 14);
assert.strictEqual(ctx.avFitShots({ requested: 24, pace: 'cinematic', bpm: 72, sectionStart: 0, usableEnd: 30 }), 12, '8 + 24 + 4 = 36 beats = 30 s');
assert.strictEqual(ctx.avFitShots({ requested: 32, pace: 'quick', bpm: 72, sectionStart: 0, usableEnd: 30 }), 24);
assert.strictEqual(ctx.avFitShots({ requested: 16, pace: 'cinematic', bpm: 72, sectionStart: 0, usableEnd: 20 * b72 }), 4, 'the 4-shot montage: 8 + 8 + 4 beats');
assert.strictEqual(ctx.avFitShots({ requested: 16, pace: 'cinematic', bpm: 72, sectionStart: 0, usableEnd: 19 * b72 }), 0, 'not even 4 shots');
assert.strictEqual(ctx.avFitShots({ requested: 32, pace: 'quick', bpm: 72, sectionStart: 0, usableEnd: 16 * b72 }), 4, 'Quick: 8 + 4 + 4 beats');
assert.strictEqual(ctx.avFitShots({ requested: 32, pace: 'quick', bpm: 72, sectionStart: 0, usableEnd: 15 * b72 }), 0);
assert.strictEqual(ctx.avFitShots({ requested: 8, pace: 'cinematic', bpm: 120, sectionStart: 0, usableEnd: 32 * 0.5 }), 4, '8 + 16 + 8 beats at 120');
assert.strictEqual(ctx.avFitShots({ requested: 8, pace: 'cinematic', bpm: 120, sectionStart: 0, usableEnd: 31 * 0.5 }), 0);

// Sections: snap to bars and clamp so the video fits; default = most energetic bar-aligned window.
const bar = 4 * 60 / 99.02, vid = 24 * 60 / 99.02;
assert.strictEqual(ctx.avSnapSection({ value: 5.1, firstBeat: 0, bpm: 99.02, usableEnd: 39.3, videoSeconds: vid, gridAccepted: true }), 2 * bar);
assert.strictEqual(ctx.avSnapSection({ value: 99, firstBeat: 0, bpm: 99.02, usableEnd: 39.3, videoSeconds: vid, gridAccepted: true }), 10 * bar);
assert.strictEqual(ctx.avSnapSection({ value: 3.14159, firstBeat: 0, bpm: 99.02, usableEnd: 39.3, videoSeconds: vid, gridAccepted: false }), 3.1);
assert.strictEqual(ctx.avSnapSection({ value: 0, firstBeat: 0, bpm: 99.02, usableEnd: 5, videoSeconds: vid, gridAccepted: true }), null);
const energy = Array(64).fill(0.1); for (let i = 16; i < 64; i++) energy[i] = 0.9;
for (const downbeatHigh of [true, false, undefined]) {
  assert.strictEqual(ctx.avDefaultSection({ firstBeat: 0, bpm: 99.02, beatEnergy: energy, usableEnd: 39.3, videoSeconds: vid, downbeatHigh }), 4 * bar);
  assert.strictEqual(ctx.avDefaultSection({ firstBeat: 0, bpm: 99.02, beatEnergy: Array(64).fill(0.5), usableEnd: 39.3, videoSeconds: vid, downbeatHigh }), 0);
}
// Intro section (spec 7): the manifest's introStart when the video fits from there, else the energy default.
{
  const bar72 = 4 * b72, v = 44 * b72, e = Array(120).fill(0.1); for (let i = 40; i < 120; i++) e[i] = 0.9;
  const base = { firstBeat: 0.3, bpm: 72, usableEnd: 90, videoSeconds: v, beatEnergy: e };
  assert.strictEqual(ctx.avIntroSection({ ...base, introStart: 0.3 + 2 * bar72 }), 0.3 + 2 * bar72, 'introStart fits');
  assert.strictEqual(ctx.avIntroSection({ ...base, introStart: 90 - v }), 90 - v, 'exactly fits');
  const energyDefault = ctx.avDefaultSection(base);
  assert.strictEqual(energyDefault, 0.3 + 10 * bar72);
  assert.strictEqual(ctx.avIntroSection({ ...base, introStart: 60 }), energyDefault, 'too late for the video: energy default');
  for (const introStart of [undefined, null, NaN, -1, 'x']) assert.strictEqual(ctx.avIntroSection({ ...base, introStart }), energyDefault, 'no introStart: ' + introStart);
  assert.strictEqual(ctx.avIntroSection({ ...base, introStart: undefined, beatEnergy: undefined }), null, 'no energy data and no introStart');
  assert.strictEqual(ctx.avIntroSection({ ...base, introStart: undefined, usableEnd: 10 }), null, 'nothing fits');
  assert.strictEqual(ctx.avIntroSection({ ...base, bpm: null, introStart: 2 }), 2, 'introStart needs no grid');
}

// The bundled cues (manifest): introStart is a bar start on the grid, every Length and pace fits from it, so it is the
// default section; the schedule from there (with onset snapping) keeps every boundary on an integer frame within the
// snap window of its grid time, and the montage starts 8 beats in.
{
  const manifest = JSON.parse(fs.readFileSync(__dirname + '/../assets/cues/manifest.json', 'utf8'));
  assert.deepStrictEqual(manifest.cues.map(c => c.id).sort(), ['before-everything', 'fractured', 'peaceful-drift', 'theta-frequency']);
  for (const cue of manifest.cues) {
    const tempo = j(ctx.avTempo({ bpm: cue.bpm, accepted: true }));
    assert.strictEqual(tempo.gridded, true, cue.id + ' has a usable grid');
    const bar = 4 * 60 / cue.bpm;
    // The manifest rounds seconds to 1 ms.
    near(cue.introStart, cue.firstBeat + Math.round((cue.introStart - cue.firstBeat) / bar) * bar, 0.001, cue.id + ' introStart on a bar');
    for (const pace of ['cinematic', 'quick']) for (const length of ['short', 'standard', 'long']) {
      const requested = ctx.avMontageShots(length, pace), tag = cue.id + ' ' + pace + ' ' + length;
      const videoSeconds = ctx.avVideoSeconds({ bpm: cue.bpm, pace, montageShots: requested });
      const ss = ctx.avIntroSection({ introStart: cue.introStart, firstBeat: cue.firstBeat, bpm: cue.bpm, usableEnd: cue.usableEnd, videoSeconds, beatEnergy: cue.beatEnergy });
      assert.strictEqual(ss, cue.introStart, tag + ' starts at introStart');
      near(ctx.avSnapSection({ value: ss, firstBeat: cue.firstBeat, bpm: cue.bpm, usableEnd: cue.usableEnd, videoSeconds, gridAccepted: true }), ss, 0.001, tag + ' snap keeps it');
      assert.strictEqual(ctx.avFitShots({ requested, pace, bpm: cue.bpm, sectionStart: ss, usableEnd: cue.usableEnd }), requested, tag + ' fits whole');
      const tpl = ctx.avTemplate({ bpm: cue.bpm, pace, montageShots: requested });
      for (const fps of [F, 25]) {
        const sch = j(ctx.avSchedule({ bpm: cue.bpm, fps, beatsList: tpl.beatsList, roles: tpl.roles, sectionStart: ss, onsets: cue.onsets, onsetThresholds: cue.onsetThresholds }));
        assert.strictEqual(sch.slots[2].startBeat, 8, tag);
        const win = Math.min(0.1 * 60 / cue.bpm, 0.07);
        sch.slots.forEach((x, i) => {
          assert.ok(Number.isInteger(x.endFrame), tag);
          if (i < sch.slots.length - 1) assert.ok(Math.abs(sch.cuts[i + 1] - x.endBeat * 60 / cue.bpm) <= win + 1e-9, tag + ' cut within the snap window');
        });
        assert.strictEqual(sch.totalFrames, Math.round((tpl.totalBeats * 60 / cue.bpm + sch.offset) * fps), tag + ' the end is on the grid');
        assert.ok(ss + sch.totalFrames / fps <= cue.usableEnd + 1 / fps, tag + ' inside the music');
      }
    }
  }
}

// Opening animation timings: scaled by k = min(1, opening seconds / 5.60). Reference (Codex re-measure): the letterbox
// is fully open at 2.35 s and the 9-letter decode ends at 2.90 + 9 x 0.115 = 3.935 s (~3.94 s). cutSeconds is the
// opening's own length, unscaled.
const ot = s => j(ctx.avOpeningTiming(s));
assert.deepStrictEqual(ot(5.6), { k: 1, revealStart: 0.22, revealEnd: 2.35, textIn: 2.40, decodeStart: 2.90, letterSeconds: 0.115, cutSeconds: 5.6 });
near(ot(5.6).decodeStart + 9 * ot(5.6).letterSeconds, 3.935, 1e-12, 'reference decode end');
{
  const { cutSeconds, ...rest } = ot(8);
  assert.strictEqual(cutSeconds, 8, 'cutSeconds is the opening length');
  const { cutSeconds: c56, ...ref } = ot(5.6);
  assert.deepStrictEqual(rest, ref, 'never stretched');
}
{
  const o = ot(6 * 60 / 72), k = 5 / 5.6;   // 72 bpm: 5.00 s, k = 0.8929
  near(o.k, k, 1e-12, 'k at 72 bpm'); near(o.cutSeconds, 5, 1e-12, 'cut at 72 bpm');
  near(o.revealStart, 0.22 * k, 1e-12); near(o.revealEnd, 2.35 * k, 1e-12); near(o.textIn, 2.40 * k, 1e-12);
  near(o.decodeStart, 2.90 * k, 1e-12); near(o.letterSeconds, 0.115 * k, 1e-12);
  near(o.revealStart, 0.196, 0.001); near(o.revealEnd, 2.098, 0.001); near(o.textIn, 2.143, 0.001); near(o.decodeStart, 2.589, 0.001);
  near(o.decodeStart + 9 * o.letterSeconds, 3.513, 0.001, '9 letters end at 72 bpm');
}
{
  const o = ot(6 * 60 / 150), k = 2.4 / 5.6;   // 150 bpm: 2.40 s
  near(o.k, k, 1e-12); near(o.decodeStart + 9 * o.letterSeconds, (2.9 + 9 * 0.115) * k, 1e-12);
  assert.ok(o.decodeStart + 9 * o.letterSeconds < 2.4, 'a 9-letter title decodes inside the opening at 150 bpm');
}
assert.strictEqual(ot(0).k, 0); assert.strictEqual(ot(undefined).k, 0); assert.strictEqual(ot(-1).k, 0);
assert.strictEqual(ot(0).cutSeconds, 0); assert.strictEqual(ot(undefined).cutSeconds, 0); assert.strictEqual(ot(-1).cutSeconds, 0);

// ---- Onset snapping (avSnapCuts, Mini Vlog rules) ----
const B = 60 / 99.2;
const grid = j(ctx.avSchedule({ bpm: 99.2, fps: 30, shots: 12, beatsPerShot: 1 }).cuts);
assert.deepStrictEqual(grid, Array.from({ length: 13 }, (_, k) => k * B));
const snap = (onsets, opt = {}, gr = grid) => j(ctx.avSnapCuts(gr, onsets, { bpm: 99.2, fps: 30, sectionStart: 0, thresholds: { l: 2, m: 2, h: 2 }, ...opt }));
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
const tiny = j(ctx.avSnapCuts([0, 1.02, 1.19, 3], [[1.145, 'l', 5]], { bpm: 60, fps: 30, sectionStart: 0 }));
assert.strictEqual(tiny.cuts[2], 1.19);
assert.match(tiny.log.find(e => e.index === 2).reason, /reverted: slot 1 min-frames/);
// Onsets are in music seconds: the section start shifts them.
near(snap([[20 + 5 * B + 0.045, 'l', 5]], { sectionStart: 20 }).cuts[5], 5 * B + 0.045, 1e-9, 'shifted');
// Low confidence: low band only, +/-120 ms.
assert.strictEqual(snap([[5 * B + 0.1, 'l', 5]], { lowConfidence: true }).cuts[5], 5 * B + 0.1);
assert.strictEqual(snap([[5 * B + 0.05, 'h', 9]], { lowConfidence: true }).cuts[5], 5 * B);
// Never more than half a frame early, at any rate and offset.
for (const fps of [23.976, 25, 29.97, 30, 60]) for (const ss of [0, 0.013, 7.31, 14.58]) {
  const on = grid.slice(1, -1).map((x, k) => [ss + x + ((k * 7919) % 110 - 55) / 1000, 'l', 5]);
  const r = j(ctx.avSnapCuts(grid, on, { bpm: 99.2, fps, sectionStart: ss }));
  const off = ctx.avMusicOffset(ss, fps);
  assert.ok(r.log.some(e => e.reason === 'onset'));
  r.log.filter(e => e.reason === 'onset').forEach(e => assert.ok(Math.abs(r.frames[e.index] / fps - (e.onset + off)) <= 0.5 / fps + 1e-9));
}
// The template schedule snaps its inner cuts (all slots are >= 1 beat), the montage start included; reused cuts keep
// their seconds at another rate.
{
  const tpl = j(ctx.avTemplate({ bpm: 72, pace: 'cinematic', montageShots: 8 }));
  const on = [[8 * b72 + 0.045, 'l', 6], [12 * b72 - 0.045, 'h', 6]];
  const sn = j(ctx.avSchedule({ bpm: 72, fps: 30, beatsList: tpl.beatsList, roles: tpl.roles, sectionStart: 0, onsets: on, onsetThresholds: { l: 3, m: 3, h: 3 } }));
  assert.strictEqual(sn.cuts[2], 8 * b72 + 0.045, 'the montage start snaps');
  assert.strictEqual(sn.cuts[4], 12 * b72 - 0.045);
  assert.strictEqual(sn.slots[2].startFrame, Math.round((8 * b72 + 0.045) * 30));
  assert.strictEqual(sn.snapLog.length, tpl.beatsList.length - 1);
  assert.deepStrictEqual(j(ctx.avSchedule({ bpm: 72, fps: 30, beatsList: tpl.beatsList, onsets: on }).cuts), j(ctx.avSchedule({ bpm: 72, fps: 30, beatsList: tpl.beatsList }).cuts), 'no section start: no snapping');
  const re = j(ctx.avSchedule({ bpm: 72, fps: 25, beatsList: tpl.beatsList, sectionStart: 14.58, cuts: sn.cuts }));
  re.slots.forEach((x, i) => assert.strictEqual(x.endFrame, Math.round((sn.cuts[i + 1] + ctx.avMusicOffset(14.58, 25)) * 25)));
  assert.throws(() => ctx.avSchedule({ bpm: 72, fps: 30, beatsList: [6, 2, 4], cuts: sn.cuts }), /cuts do not match/);
  // No grid with music: low-band snapping within 120 ms.
  const ng = j(ctx.avSchedule({ bpm: null, fps: 30, beatsList: tpl.beatsList, shotSeconds: b72, sectionStart: 0, onsets: [[8 * b72 + 0.1, 'l', 5], [6 * b72 + 0.05, 'h', 9]] }));
  near(ng.cuts[2], 8 * b72 + 0.1, 1e-12, 'gridless low-band snap'); near(ng.cuts[1], 6 * b72, 1e-12, 'gridless: high band ignored');
}

// avPlanBuild on the template (allocation details are in allocate.test.cjs).
{
  const ROLES = K.AV_ROLES, mk = (rid, role, t) => ({ rid, role, t, score: 0.5, sourceDuration: 60 });
  const pool = ['a', 'b', 'c', 'd'].flatMap(rid => Array.from({ length: 38 }, (_, k) => mk(rid, ROLES[k % ROLES.length], 3 + k * 1.5)));
  const build = extra => j(ctx.avPlanBuild({ candidates: pool, bpm: 72, accepted: true, fps: 30, pace: 'cinematic', requested: 16, seed: 's1', ...extra }));
  const p = build();
  assert.ok(p.ok);
  assert.strictEqual(p.shots, 16); assert.strictEqual(p.requested, 16); assert.strictEqual(p.slots, 19); assert.strictEqual(p.fittedByMusic, false);
  assert.strictEqual(p.pace, 'cinematic'); assert.strictEqual(p.montageBeats, 2); assert.strictEqual(p.finalBeats, 4);
  assert.strictEqual(p.tempo, 72); assert.strictEqual(p.gridded, true); assert.strictEqual(p.approxBpm, null); assert.deepStrictEqual(p.notes, []);
  assert.deepStrictEqual(p.schedule.beatsList, [6, 2].concat(Array(16).fill(2), [4]));
  assert.deepStrictEqual(p.schedule.slots.map(s => s.part).filter((x, i, a) => a.indexOf(x) === i), ['opening', 'credit', 'montage', 'final']);
  assert.deepStrictEqual(Object.keys(p).sort(), ['approxBpm', 'attempt', 'beatSeconds', 'fillerShots', 'finalBeats', 'fittedByMusic', 'gridded', 'montageBeats', 'musicShots', 'notes', 'ok', 'pace', 'photoShots',
    'picks', 'requested', 'schedule', 'shots', 'slots', 'tempo']);
  assert.strictEqual(p.musicShots, 16, 'no music: no cap');
  // An unknown pace is Cinematic; Quick doubles the shots at the same length.
  assert.strictEqual(build({ pace: 'relaxed' }).pace, 'cinematic');
  const q = build({ pace: 'quick', requested: 32 });
  assert.ok(q.ok); assert.strictEqual(q.shots, 32); assert.strictEqual(q.montageBeats, 1); assert.strictEqual(q.schedule.totalFrames, p.schedule.totalFrames);
  // Above 110 bpm: 4-beat montage shots and an 8-beat final shot.
  const fast = build({ bpm: 120 });
  assert.strictEqual(fast.montageBeats, 4); assert.strictEqual(fast.finalBeats, 8); assert.strictEqual(fast.schedule.slots[18].beats, 8);
  // No usable grid: the 72 bpm beat; own music 'approximate': its beat.
  for (const extra of [{ bpm: null, accepted: false }, { bpm: 108, accepted: false }, { bpm: 65, accepted: true }]) {
    const ng = build(extra);
    assert.ok(ng.ok); assert.strictEqual(ng.gridded, false); assert.strictEqual(ng.tempo, 72); assert.strictEqual(ng.schedule.gridded, false);
    assert.strictEqual(ng.schedule.totalFrames, Math.round(44 * b72 * 30));
  }
  const ap = build({ bpm: null, accepted: false, approxBpm: 120, sectionStart: 0.04, usableEnd: 200 });
  assert.strictEqual(ap.tempo, 120); assert.strictEqual(ap.approxBpm, 120); assert.strictEqual(ap.montageBeats, 4); assert.strictEqual(ap.schedule.gridded, false);
  assert.deepStrictEqual(ap.schedule.cuts.map(c => Math.round(c * 1000) / 1000), [0, 3, 4].concat(Array.from({ length: 16 }, (_, k) => 4 + 2 * (k + 1)), [40]), 'no onsets: every cut on the beat');
  // An accepted grid ignores approxBpm.
  assert.strictEqual(build({ bpm: 108, approxBpm: 120 }).tempo, 108);
  // Music cap: the section and usableEnd shrink the montage by whole bars, the intro and final shot stay.
  const cap = build({ sectionStart: 2, usableEnd: 2 + 27 });   // 32.4 beats: 8 + 2 x 10 + 4
  assert.ok(cap.ok); assert.strictEqual(cap.shots, 10); assert.strictEqual(cap.fittedByMusic, true); assert.strictEqual(cap.musicShots, 10);
  assert.strictEqual(cap.slots, 13, 'counts exclude the 3 bookends: slots = shots + 3');
  assert.ok(2 + cap.schedule.totalFrames / 30 <= 29 + 1 / 30, 'the picture never outruns the music');
  assert.deepStrictEqual(cap.schedule.beatsList.slice(0, 2), [6, 2]); assert.strictEqual(cap.schedule.beatsList[cap.schedule.beatsList.length - 1], 4);
  // Too short for intro + 4 montage shots + final (20 beats = 16.67 s at 72 bpm).
  const tooShort = build({ sectionStart: 2, usableEnd: 14 });
  assert.deepStrictEqual(tooShort, { ok: false, reason: 'music-too-short', usableShots: 0, usableSlots: 0, notes: [], neededSeconds: 20 * b72, availableSeconds: 12 });
  assert.ok(build({ sectionStart: 0, usableEnd: 20 * b72 }).ok, 'exactly the minimum');
  assert.strictEqual(build({ sectionStart: 0, usableEnd: 20 * b72 }).shots, 4);
  assert.deepStrictEqual(build({ pace: 'quick', requested: 32, sectionStart: 0, usableEnd: 15 * b72 }),
    { ok: false, reason: 'music-too-short', usableShots: 0, usableSlots: 0, notes: [], neededSeconds: 16 * b72, availableSeconds: 15 * b72 });
  // No credit option: Credit off only drops the graphic, the plan (and its 2-beat credit shot) never changes.
  for (const extra of [{ credit: false }, { credit: true }, { creditOn: false }, { credit: { enabled: false, name: '' } }])
    assert.deepStrictEqual(build(extra), p, 'credit input ignored: ' + JSON.stringify(extra));
  assert.strictEqual(p.schedule.slots[1].part, 'credit'); assert.strictEqual(p.schedule.slots[1].beats, 2);
  assert.ok(!/opts\.credit/i.test(fs.readFileSync(__dirname + '/../planner.js', 'utf8')), 'the planner reads no credit option');
  // A non-finite request falls back to Standard.
  for (const requested of [NaN, undefined, Infinity]) assert.strictEqual(build({ requested }).shots, 16);
}

// Progress: ids and numbers only (the panel labels the steps in the UI language).
assert.strictEqual(JSON.stringify(ctx.avProgress('shots', 0)), JSON.stringify({ id: 'shots', value: 0, percent: 0, current: 0 }));
assert.strictEqual(ctx.avProgress('open', 1).percent, 100);
console.log('planner ok');
