// plugins/selfie-aesthetic/tests/planner.test.cjs — template, schedule, tempo, sections, whips, moments.
// Every expected frame is computed here from the spec formulas; no frame literal is typed by hand.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'planner.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'cues', 'manifest.json'), 'utf8'));

// The panel embeds planner.js verbatim: it must run in a bare context (no require, no module, no console).
assert.ok(!/\brequire\s*\(/.test(source), 'planner.js must not require anything');
const box = { Math, Number, Object, Array, String, Set, Map, Infinity, Error, JSON };
vm.createContext(box);
const NAMES = ['SAE_LEAD', 'SAE_END_TAIL', 'SAE_FIXED_BPM', 'SAE_FACE_MARGIN', 'SAE_SOURCE_TAIL', 'SAE_PAIR_GAP', 'SAE_FADE_OUT',
  'SAE_SNAP_WINDOW', 'SAE_MIN_HOLD_FRAMES', 'SAE_LENGTHS', 'saeEditBpm', 'saeTempo', 'saeVideoSeconds', 'saeMusicOffset', 'saeTemplate',
  'saeSchedule', 'saeMoments', 'saeWhipKinds', 'saeBarGrid', 'saeDefaultSection', 'saeSnapSection', 'saePlanBuild'];
vm.runInContext(source + ';globalThis.P={' + NAMES.join(',') + '};', box);
const P = box.P;
// The CommonJS export carries the same functions.
const M = require(path.join(root, 'planner.js'));
for (const n of NAMES) assert.equal(typeof M[n], typeof P[n], n + ' exported');
const j = v => JSON.parse(JSON.stringify(v));

const LEAD = 0.15, TAIL = 0.040;
const FPS = [24000 / 1001, 25, 30000 / 1001, 30];
assert.equal(P.SAE_LEAD, LEAD);
assert.equal(P.SAE_END_TAIL, TAIL);
// FACE_MARGIN: pre-Staging default (score units of scene search); re-tune on Set A vs the daily Project and record here.
assert.equal(P.SAE_FACE_MARGIN, 0.02);
assert.deepEqual(j(P.SAE_LENGTHS), { short: 4, standard: 6, long: 8 });

// ---- Template ----
for (let N = 1; N <= 10; N++) {
  const t = j(P.saeTemplate(N));
  assert.equal(t.length, 6 * (N - 1) + 7, 'holds = 6(N-1) + 7');
  assert.equal(t[t.length - 1].endBeat, 4 * (N - 1) + 3.5, 'ends at beat 4(N-1) + 3.5');
  for (let k = 0; k < N; k++) {
    const bar = t.filter(h => h.bar === k);
    if (k < N - 1) {
      assert.deepEqual(bar.map(h => h.beats), [1, 0.5, 0.5, 0.5, 0.5, 1]);
      assert.equal(bar.map(h => h.moment).join(''), 'ABABAB');
      assert.equal(bar[0].startBeat, 4 * k, 'a standard bar starts on its downbeat');
      assert.deepEqual(bar.slice(1).map(h => h.startBeat - 4 * k), [1, 1.5, 2, 2.5, 3], 'inner cuts at +1, +1.5, +2, +2.5, +3');
    } else {
      assert.deepEqual(bar.map(h => h.beats), [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
      assert.equal(bar.map(h => h.moment).join(''), 'ABABABA');
    }
  }
  t.forEach((h, i) => { assert.equal(h.i, i); if (i) assert.equal(h.startBeat, t[i - 1].endBeat); });
}
assert.deepEqual([4, 6, 8].map(N => P.saeTemplate(N).length), [25, 37, 49]);
assert.deepEqual([4, 6, 8].map(N => P.saeTemplate(N).length - 1), [24, 36, 48]);

// ---- Tempo mapping ----
const rule = b => (b >= 70 && b <= 125 ? b : b / 2 >= 70 ? b / 2 : b);
for (const b of [60, 69.9, 70, 97.67, 125, 125.5, 139, 139.9, 140, 180, 250]) assert.equal(P.saeEditBpm(b), rule(b), 'editBpm ' + b);
assert.equal(P.saeEditBpm(97), 97);
assert.equal(P.saeEditBpm(130), 130, '125-140: bpm/2 < 70 keeps the beat');
assert.equal(P.saeEditBpm(140), 70);
assert.equal(P.saeEditBpm(250), 125);
assert.deepEqual(j(P.saeTempo(null)), { bpm: 97, editBpm: 97, fixed: true });
assert.deepEqual(j(P.saeTempo({ bpm: 120, grid: 'none' })), { bpm: 97, editBpm: 97, fixed: true });
assert.deepEqual(j(P.saeTempo({ bpm: 100, grid: 'approximate' })), { bpm: 100, editBpm: 100, fixed: false });
assert.deepEqual(j(P.saeTempo({ bpm: 180, grid: 'accepted' })), { bpm: 180, editBpm: 90, fixed: false });
assert.equal(P.saeTempo({ bpm: 300, grid: 'accepted' }).fixed, true, 'bpm outside 60-250 is not trusted');

// Sweep 60-250 BPM: the 1/2-beat hold length and the shortest hold in frames at every tested fps.
let halfMin = Infinity, halfMax = 0, framesMin = Infinity;
for (let bpm = 60; bpm <= 250 + 1e-9; bpm += 0.5) {
  const e = P.saeEditBpm(bpm), half = 30 / e;
  halfMin = Math.min(halfMin, half); halfMax = Math.max(halfMax, half);
  assert.ok(half >= 0.21 - 1e-12, 'every 1/2-beat hold >= 0.21 s (' + bpm + ' BPM)');
  if (bpm >= 70) assert.ok(half <= 30 / 70 + 1e-12, '1/2 beat <= 30/70 s from 70 BPM on');
  for (const fps of FPS) {
    const s = P.saeSchedule({ bpm, fps, bars: 4, sectionStart: 10.003 });
    for (const h of s.holds) framesMin = Math.min(framesMin, h.frames);
  }
}
assert.ok(framesMin >= 3, 'every hold >= 3 frames over the sweep');
console.log('tempo sweep 60-250 BPM: 1/2 beat ' + halfMin.toFixed(4) + '-' + halfMax.toFixed(4) + ' s (from 70 BPM: <= ' + (30 / 70).toFixed(4) + ' s); shortest hold ' + framesMin + ' frames');

// ---- Music offset ----
const delta = (s, fps) => { const m = s - LEAD; return m - Math.round(m * fps) / fps; };
assert.equal(P.saeMusicOffset(null, 30), 0);
assert.equal(P.saeMusicOffset(undefined, 30), 0);
for (const fps of FPS) {
  for (let s = 0.15; s < 60; s += 0.1373) {
    // saeMusicOffset takes the music clip's source start (sectionStart - lead), the value Selects quantises.
    assert.ok(Math.abs(P.saeMusicOffset(s - LEAD, fps) - delta(s, fps)) < 1e-12);
    assert.ok(Math.abs(P.saeMusicOffset(s, fps)) <= 0.5 / fps + 1e-12, 'at most half a frame');
  }
  assert.ok(Math.abs(P.saeMusicOffset(300 / fps, fps)) < 1e-9, 'a frame-aligned music source start has no offset');
}

// ---- Schedule: frames at 23.976 / 25 / 29.97 / 30 ----
const sections = manifest.cues.map(c => c.defaultSection).concat([0.15, 3.3333, 12.6219]);
const bpms = manifest.cues.map(c => c.bpm).concat([97.67, 97, 140, 174, 124.9]);
for (const fps of FPS) for (const bpm of bpms) for (const N of [3, 4, 6, 8]) for (const sec of sections) {
  const s = j(P.saeSchedule({ bpm, fps, bars: N, sectionStart: sec }));
  const e = rule(bpm), spb = 60 / e, d = delta(sec, fps);
  const tpl = P.saeTemplate(N);
  const frameAt = b => Math.round((LEAD + b * spb + d) * fps);
  assert.equal(s.editBpm, e);
  assert.ok(Math.abs(s.offset - d) < 1e-15);
  assert.equal(s.holds.length, 6 * (N - 1) + 7);
  assert.equal(s.cuts.length, s.holds.length - 1);
  assert.equal(s.cutSeconds.length, s.holds.length + 1);
  assert.equal(s.cutSecondsRaw.length, s.holds.length + 1);
  assert.equal(s.cutSeconds[0], 0); assert.equal(s.cutSecondsRaw[0], 0);
  assert.ok(Math.abs(s.musicSourceStart - (sec - LEAD)) < 1e-12);
  assert.equal(s.holds[0].startFrame, 0, 'the video starts at frame 0');
  s.holds.forEach((h, i) => {
    if (i) {
      assert.equal(h.startFrame, s.holds[i - 1].endFrame, 'contiguous');
      assert.equal(h.startFrame, frameAt(tpl[i].startBeat), 'cut frame = round((lead + b*60/bpm + delta) * fps)');
      assert.ok(Math.abs(s.cutSecondsRaw[i] - (LEAD + tpl[i].startBeat * spb)) < 1e-12, 'cutSecondsRaw without delta');
      assert.equal(s.cutSeconds[i], s.cutSecondsRaw[i] + d, 'cutSeconds = raw + delta');
      assert.equal(s.cuts[i - 1], h.startFrame);
      assert.equal(Math.round(s.cutSeconds[i] * fps), h.startFrame);
    }
    assert.equal(h.frames, h.endFrame - h.startFrame);
    assert.ok(h.frames >= 3, 'hold >= 3 frames');
  });
  const endBeat = 4 * (N - 1) + 3.5;
  assert.equal(s.totalFrames, Math.round((LEAD + endBeat * spb + TAIL + d) * fps), 'ends at beat 4(N-1)+3.5 + 40 ms');
  assert.equal(s.holds[s.holds.length - 1].endFrame, s.totalFrames);
  assert.ok(Math.abs(s.cutSecondsRaw[s.holds.length] - (LEAD + endBeat * spb + TAIL)) < 1e-12);
  assert.equal(Math.round(s.cutSeconds[s.holds.length] * fps), s.totalFrames);
  assert.equal(s.beats.length, Math.floor(endBeat) + 1);
  s.beats.forEach((x, b) => assert.ok(Math.abs(x - (LEAD + b * spb + d)) < 1e-12));
}
// Without music there is no offset.
{
  const s = j(P.saeSchedule({ bpm: 97, fps: 30, bars: 4 }));
  assert.equal(s.offset, 0);
  assert.equal(s.holds[1].startFrame, Math.round((LEAD + 1 * (60 / 97)) * 30));
  // Short at the reference tempo is about 9.7 s, inside the hook-metrics duration band 7.3-12.2 s.
  const r = j(P.saeSchedule({ bpm: 97.67, fps: 30, bars: 4 }));
  assert.ok(r.totalFrames / 30 > 7.3 && r.totalFrames / 30 < 12.2);
  assert.ok(Math.abs(r.totalFrames / 30 - (LEAD + 15.5 * 60 / 97.67 + TAIL)) <= 0.5 / 30 + 1e-9);
}
assert.throws(() => P.saeSchedule({ bpm: 0, fps: 30, bars: 4 }));

// ---- A music source start that is not frame-aligned at 23.976 or 30 fps ----
{
  const sourceStart = 12.38, sec = sourceStart + LEAD;
  for (const fps of [24000 / 1001, 30]) {
    const frac = sourceStart * fps - Math.round(sourceStart * fps);
    assert.ok(Math.abs(frac) > 0.05, 'not frame-aligned at ' + fps);
    const d = sourceStart - Math.round(sourceStart * fps) / fps;
    assert.ok(Math.abs(d) > 0.05 / fps);
    assert.equal(P.saeMusicOffset(sourceStart, fps), d);
    const s = j(P.saeSchedule({ bpm: 97.67, fps, bars: 6, sectionStart: sec }));
    assert.equal(s.offset, d);
    const tpl = P.saeTemplate(6), spb = 60 / 97.67;
    s.holds.forEach((h, i) => { if (i) assert.equal(h.startFrame, Math.round((LEAD + tpl[i].startBeat * spb + d) * fps)); });
    // The other rate's frames follow from cutSecondsRaw + that rate's offset (what assemble.js does at the real fps).
    const other = fps === 30 ? 24000 / 1001 : 30;
    const t = j(P.saeSchedule({ bpm: 97.67, fps: other, bars: 6, sectionStart: sec }));
    const re = s.cutSecondsRaw.map((x, k) => (k === 0 ? 0 : Math.round((x + P.saeMusicOffset(s.musicSourceStart, other)) * other)));
    assert.deepEqual(re, [0].concat(t.holds.map(h => h.endFrame)));
    assert.deepEqual(t.cutSecondsRaw, s.cutSecondsRaw, 'raw boundaries do not depend on fps');
  }
}

// ---- Fixed tempo: low-band onset snap of bar-change cuts only ----
{
  const fps = 30, sec = 10, spb = 60 / 97, d = delta(sec, fps);
  const barChange = 4; // bar 1 starts at edit beat 4 (hold index 6)
  const at = b => sec + b * spb; // music seconds of edit beat b
  const onsets = [
    [at(barChange) + 0.06, 'l', 9],   // strong bass 60 ms late: the bar-change cut moves onto it
    [at(1) + 0.03, 'l', 9],           // near an inner cut: ignored (only bar changes are anchors)
    [at(8) + 0.2, 'l', 9],            // 200 ms off the next bar change: outside the window
    [at(8) - 0.05, 'm', 9],           // mid band: ignored
    [at(12) + 0.05, 'l', 2.5],        // below the low-band threshold
  ];
  const cue = { grid: 'none', bpm: 87, firstBeat: 0.4, durationSeconds: 60, onsets, onsetThresholds: { l: 3, m: 3, h: 3 } };
  const s = j(P.saeSchedule({ editBpm: 97, fps, bars: 4, sectionStart: sec, snap: true, onsets: cue.onsets, onsetThresholds: cue.onsetThresholds }));
  const grid = j(P.saeSchedule({ editBpm: 97, fps, bars: 4, sectionStart: sec }));
  const iBar1 = 6;
  const expected = LEAD + barChange * spb + d + 0.06;
  assert.ok(Math.abs(s.cutSeconds[iBar1] - expected) < 1e-9, 'bar change snapped onto the bass onset');
  assert.ok(Math.abs(s.cutSecondsRaw[iBar1] - (expected - d)) < 1e-9);
  assert.equal(s.holds[iBar1].startFrame, Math.round(expected * fps));
  s.cutSeconds.forEach((x, k) => { if (k !== iBar1) assert.equal(x, grid.cutSeconds[k], 'other cuts stay on the grid'); });
  assert.ok(s.holds.every(h => h.frames >= 3));
  assert.equal(s.snapLog.filter(l => l.reason === 'onset').length, 1);
  // The plan uses the snap for own music without a beat, and notes the fixed tempo.
  const plan = P.saePlanBuild({ fps, bars: 4, cue, sectionStart: sec, candidates: [], durations: { v1: 20, v2: 20 } });
  assert.ok(plan.ok);
  assert.equal(plan.bpm, 97); assert.equal(plan.editBpm, 97);
  assert.ok(plan.notes.includes('fixed-tempo'));
  assert.ok(Math.abs(plan.cutSeconds[iBar1] - expected) < 1e-9);
}

// ---- Sections ----
for (const cue of manifest.cues) {
  // phaseBeats (sensual-melancholia) is already applied inside the manifest's firstBeat: the bar grid uses it as is.
  const g = P.saeBarGrid(cue);
  assert.equal(g.first, cue.downbeat.firstBar);
  assert.equal(g.first, cue.firstBeat);
  for (const N of [3, 4, 6, 8]) {
    const e = P.saeEditBpm(cue.bpm), vs = (4 * (N - 1) + 3.5) * 60 / e + TAIL;
    const s = P.saeDefaultSection(cue, N, e);
    assert.ok(s !== null);
    assert.ok(s - LEAD >= -1e-9, 'the music starts at or after 0');
    assert.ok(s + vs <= cue.durationSeconds - 2 + 1e-9, 'the edit ends before the 2 s fade-out');
    const k = (s - g.first) / g.bar;
    // The manifest stores defaultSection rounded to a millisecond, so "on a bar line" means within 1 ms.
    assert.ok(Math.abs(s - (g.first + Math.round(k) * g.bar)) <= 0.0005 + 1e-9, 'on a bar line');
    if (cue.defaultSection + vs <= cue.durationSeconds - 2) assert.equal(s, cue.defaultSection);
  }
  // Snap: the nearest bar line; clamped to what fits.
  const s1 = P.saeSnapSection(cue.defaultSection + 0.3 * g.bar, cue);
  assert.ok(Math.abs(s1 - cue.defaultSection) <= 0.0005 + 1e-9);
  const s2 = P.saeSnapSection(cue.defaultSection + 0.7 * g.bar, cue);
  assert.ok(Math.abs(s2 - (cue.defaultSection + g.bar)) <= 0.0005 + 1e-9);
  assert.ok(P.saeSnapSection(0, cue) >= LEAD);
  const e = P.saeEditBpm(cue.bpm);
  const late = P.saeSnapSection(64, cue, { bars: 8, editBpm: e });
  assert.ok(late + P.saeVideoSeconds(8, e) <= cue.durationSeconds - 2 + 1e-9);
  assert.ok(late + g.bar + P.saeVideoSeconds(8, e) > cue.durationSeconds - 2, 'the latest bar line that fits');
}
{
  // A default section too late for Long: the latest bar line that fits.
  const cue = { bpm: 100, firstBeat: 0.5, grid: 'accepted', downbeat: { firstBar: 0.5 }, durationSeconds: 30, defaultSection: 14.9 };
  const e = 100, vs = P.saeVideoSeconds(8, e), bar = 2.4;
  const s = P.saeDefaultSection(cue, 8, e);
  assert.ok(s + vs <= 28 + 1e-9 && s + bar + vs > 28);
  assert.ok(Math.abs((s - 0.5) / bar - Math.round((s - 0.5) / bar)) < 1e-9);
  assert.equal(P.saeDefaultSection({ ...cue, durationSeconds: 15 }, 8, e), null, 'too short for Long');
  assert.equal(P.saeDefaultSection(cue, 4, e), 14.9, 'the default section fits Short');
  assert.equal(P.saeSnapSection(12.345, { grid: 'none', durationSeconds: 60 }), 12.345, 'no grid: kept to the ms');
}

// ---- Whip kinds ----
{
  const holds = P.saeTemplate(6).map(h => ({ i: h.i, bar: h.bar }));
  const w1 = j(P.saeWhipKinds(holds, 1)), w1b = j(P.saeWhipKinds(holds, 1)), w2 = j(P.saeWhipKinds(holds, 2));
  assert.deepEqual(w1, w1b, 'deterministic');
  assert.notDeepEqual(w1.map(h => h.angle), w2.map(h => h.angle), 'seeded');
  assert.equal(w1[0].cutIn, 'none'); assert.equal(w1[w1.length - 1].cutOut, 'none');
  let lastSign = 0;
  for (let i = 0; i + 1 < w1.length; i++) {
    const kind = w1[i + 1].bar !== w1[i].bar ? 'spin' : 'dir';
    assert.equal(w1[i].cutOut, kind); assert.equal(w1[i + 1].cutIn, kind, 'both sides share the kind');
    assert.equal(w1[i].angleOut, w1[i + 1].angleIn, 'both sides share the angle');
    const a = w1[i].angleOut;
    assert.ok(Math.abs(a) >= 25 && Math.abs(a) <= 35, 'angle magnitude 25-35');
    if (lastSign) assert.equal(Math.sign(a), -lastSign, 'alternating sign');
    lastSign = Math.sign(a);
  }
  assert.equal(w1.filter(h => h.cutOut === 'spin').length, 5, 'one spin per bar change');
  const mags = new Set(w1.slice(0, -1).map(h => Math.abs(h.angleOut)));
  assert.ok(mags.size > 10, 'magnitudes vary cut by cut');
}

// ---- Moments ----
{
  const fps = 24000 / 1001, beat = 60 / 97 + 1 / fps;
  const cands = [
    { rid: 'a', role: 'control', t: 1, score: 0.20 },
    { rid: 'a', role: 'selfie', t: 1.0, score: 0.32 },
    { rid: 'a', role: 'hand', t: 6.04, score: 0.30 },
    { rid: 'a', role: 'glance', t: 2.6, score: 0.31 },   // inside the bad span: dropped
    { rid: 'a', role: 'expression', t: 9.7, score: 0.40 }, // window runs past the end tail: dropped
    { rid: 'b', role: 'control', t: 1, score: 0.24 },
    { rid: 'b', role: 'selfie', t: 1.5, score: 0.25 },   // 0.01 over control: not a face clip at the default margin
    { rid: 'c', role: 'selfie', t: 1.2, score: 0.35 },   // no control hit: not a face clip, still usable
    { rid: 'zz', role: 'selfie', t: 1, score: 0.9 },     // no duration: ignored
  ];
  const durations = { a: 10, b: 8, c: 3 };
  const badSpans = { a: [[2, 4]] };
  const m = j(P.saeMoments({ candidates: cands, durations, badSpans, fps, beatSeconds: beat }));
  assert.deepEqual(m.clips.map(c => c.rid), ['a', 'b', 'c']);
  const [a, b, c] = m.clips;
  assert.ok(Math.abs(a.faceScore - 0.2) < 1e-9 && a.face);
  assert.ok(Math.abs(b.faceScore - 0.01) < 1e-9 && !b.face);
  assert.equal(c.faceScore, null); assert.equal(c.face, false);
  assert.equal(m.faceCount, 1);
  assert.ok(j(P.saeMoments({ candidates: cands, durations, badSpans, fps, beatSeconds: beat, margin: 0.005 })).clips[1].face, 'margin is tunable');
  for (const clip of m.clips) {
    const dur = durations[clip.rid], spans = badSpans[clip.rid] || [];
    assert.ok(clip.pairs.length >= 2, clip.rid + ' has several pairs for reuse');
    const keys = new Set();
    for (const p of clip.pairs) {
      assert.ok(Math.abs(p.a - p.b) >= 0.8 - 1e-9, 'A and B >= 0.8 s apart');
      for (const t of [p.a, p.b]) {
        assert.ok(Math.abs(t * fps - Math.round(t * fps)) < 1e-6, 'window start on a whole frame');
        assert.ok(t >= 0 && t + beat <= dur - 0.15 + 1e-9, 'window inside the source with a 0.15 s tail');
        assert.ok(!spans.some(([s, e]) => t < e && t + beat > s), 'window clear of bad spans');
      }
      const key = p.a + ':' + p.b;
      assert.ok(!keys.has(key), 'distinct pairs'); keys.add(key);
    }
  }
  // Clip a: the best pair is the two strongest clean hits (1.0 selfie + 6.04 hand), A = the stronger one, snapped down.
  const fl = t => Math.floor(t * fps + 1e-6) / fps;
  assert.equal(a.pairs[0].a, fl(1.0)); assert.equal(a.pairs[0].b, fl(6.04));
  // Clip b: one clean hit; its partner is the farthest-apart clean filler.
  const lastFiller = (() => { let t = 0; for (let k = 0; k * 0.5 + beat <= 8 - 0.15 + 1e-9; k++) t = fl(k * 0.5); return t; })();
  assert.equal(b.pairs[0].a, fl(1.5)); assert.equal(b.pairs[0].b, lastFiller);
  // Pairs whose moments are fresh come first.
  assert.ok(Math.abs(a.pairs[1].a - a.pairs[0].a) >= 0.4 - 1e-9 && Math.abs(a.pairs[1].b - a.pairs[0].b) >= 0.4 - 1e-9);
  // Order of candidates does not matter.
  assert.deepEqual(j(P.saeMoments({ candidates: cands.slice().reverse(), durations, badSpans, fps, beatSeconds: beat })), m);
  // A long clip stays bounded.
  const big = j(P.saeMoments({ candidates: [], durations: { long: 900 }, fps: 30, beatSeconds: beat }));
  assert.ok(big.clips[0].times <= 40 && big.clips[0].pairs.length === 8);
  // A clip too short for a 0.8 s pair gets one relaxed pair.
  const short = j(P.saeMoments({ candidates: [], durations: { s: 1.3 }, fps: 30, beatSeconds: beat }));
  assert.equal(short.clips[0].pairs.length, 1); assert.equal(short.clips[0].pairs[0].relaxed, true);
}

// ---- Bar count capped by the music: the edit always ends before the cue's fade-out ----
{
  const fps = 30, durs = { v1: 20, v2: 20, v3: 20, v4: 20, v5: 20, v6: 20, v7: 20, v8: 20 };
  const own = { bpm: 100, firstBeat: 0, grid: 'accepted', durationSeconds: 14 };
  const fits = (plan, cue) => plan.musicSourceStart + plan.totalFrames / fps <= cue.durationSeconds - P.SAE_FADE_OUT + 1 / fps;
  // Long (8 bars) does not fit 14 s at 100 BPM: shrunk to the most bars that fit on a bar line.
  const long = P.saePlanBuild({ fps, bars: 8, cue: own, candidates: [], durations: durs });
  assert.equal(long.ok, true);
  assert.ok(long.bars < 8 && long.bars >= 3, 'shrunk: ' + long.bars);
  assert.ok(long.notes.includes('shrunk'), 'shrunk note');
  assert.deepEqual(j(long.fit), { bars: long.bars, wanted: 8 });
  assert.ok(fits(long, own), 'music outlasts the video: ' + (long.musicSourceStart + long.totalFrames / fps));
  // The most bars that fit: one more bar would not fit on any bar line.
  assert.equal(P.saeDefaultSection(own, long.bars + 1, 100), null);
  assert.ok(P.saeDefaultSection(own, long.bars, 100) !== null);
  // A late user section: shrunk until the edit ends before the fade-out.
  const late = P.saePlanBuild({ fps, bars: 8, cue: own, sectionStart: 4.8, candidates: [], durations: durs });
  assert.equal(late.ok, true); assert.equal(late.sectionStart, 4.8);
  assert.ok(late.bars < long.bars, 'late section shrinks further: ' + late.bars);
  assert.ok(late.notes.includes('shrunk')); assert.ok(fits(late, own), 'late section fits');
  assert.equal(late.bars, Math.max(...[3, 4, 5, 6, 7, 8].filter(n => 12 - P.saeVideoSeconds(n, 100) >= 4.8)), 'the largest n that fits');
  // Too late even for 3 bars.
  assert.deepEqual(j(P.saePlanBuild({ fps, bars: 4, cue: own, sectionStart: 9, candidates: [], durations: durs }).notes), ['music-too-short']);
  // A Long edit that fits keeps its 8 bars.
  const roomy = P.saePlanBuild({ fps, bars: 8, cue: { ...own, durationSeconds: 60 }, candidates: [], durations: durs });
  assert.equal(roomy.bars, 8); assert.ok(!roomy.notes.includes('shrunk'));
}

// ---- Source windows fit every hold, including hold 0 (lead + 1 beat + offset), the way assemble.js lays them ----
// assemble: f0 = round(srcStart * rate), n = the hold's frames; it slides the window back when f0 + n passes
// floor((duration - 0.15) * rate). Planner output must never need that slide.
for (const cue of [null, { bpm: 100, firstBeat: 0.013, grid: 'accepted', durationSeconds: 60 }]) {
  const fps = 24000 / 1001, rids = ['c1', 'c2', 'c3'], durations = {}, candidates = [];
  // Moment A (the best hit) near the end of a 3 s clip: inside the old 1-beat window, past the hold-0 window.
  for (const rid of rids) {
    durations[rid] = 3;
    candidates.push({ rid, role: 'selfie', t: 2.15, score: 0.5 }, { rid, role: 'control', t: 0.5, score: 0.1 });
  }
  const plan = P.saePlanBuild({ fps, bars: 4, cue, candidates, durations });
  assert.equal(plan.ok, true);
  assert.equal(plan.holds[0].kind, 'video'); assert.equal(plan.holds[0].moment, 'A');
  for (const h of plan.holds) {
    if (h.kind !== 'video') continue;
    const f0 = Math.round(h.srcStart * fps), last = Math.floor((durations[h.rid] - P.SAE_SOURCE_TAIL) * fps);
    assert.ok(f0 + h.frames <= last, 'hold ' + h.i + ' window ends before the source tail: ' + (f0 + h.frames) + ' > ' + last);
  }
}

console.log('planner.test: ok');
