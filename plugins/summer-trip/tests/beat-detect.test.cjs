// plugins/summer-trip/tests/beat-detect.test.cjs
const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict'), { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const { analyze } = require(path.join(root, 'beat-detect.cjs'));
const sr = 22050;
function clickTrack(bpm, first, seconds) {
  const x = new Float32Array(Math.round(seconds * sr));
  for (let t = first; t < seconds; t += 60 / bpm) {
    const i0 = Math.round(t * sr);
    for (let k = 0; k < 400 && i0 + k < x.length; k++) x[i0 + k] += Math.sin(2 * Math.PI * 1000 * k / sr) * Math.exp(-k / 80);
  }
  return x;
}
const a = analyze(clickTrack(120, 0.5, 30), sr);
assert.ok(Math.abs(a.bpm - 120) < 0.2, 'bpm ' + a.bpm);
assert.ok(Math.abs(a.firstBeat - 0.5) < 0.02, 'firstBeat ' + a.firstBeat);
assert.equal(a.accepted, true);
assert.equal(a.peaks.length, 400);
assert.ok(a.beatEnergy.length >= 55);

// phaseBeats (dev only) moves the fitted grid before the first beat is chosen: half a beat back from
// 0.5 s at 120 BPM puts the first beat at 0.25 s, on the same tempo.
const half = analyze(clickTrack(120, 0.5, 30), sr, { phaseBeats: -0.5 });
assert.ok(Math.abs(half.firstBeat - 0.25) < 0.02, 'phaseBeats firstBeat ' + half.firstBeat);
assert.equal(half.bpm, a.bpm);
assert.equal(analyze(clickTrack(120, 0.5, 30), sr, { phaseBeats: 0 }).firstBeat, a.firstBeat);

// Phase sanity check (v2.6): a kit whose loud hats sit on the 8th off-beats makes the broadband fit lock onto them;
// the kick on every beat and the snare on every other beat (the backbeat) move the grid back half a beat. Beats at
// 0.3 + 0.5 k s (120 BPM), hats at 0.55 + 0.5 k s.
function offBeatKit({ snare = true } = {}) {
  let s = 7; const rnd = () => ((s = Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296 - 0.5;
  const x = new Float32Array(20 * sr).map(() => rnd() * 0.002);
  const add = (t, n, f) => { const i0 = Math.round(t * sr); for (let k = 0; k < n && i0 + k < x.length; k++) x[i0 + k] += f(k); };
  for (let k = 0; 0.3 + k * 0.5 < 19.5; k++) {
    const t = 0.3 + k * 0.5;
    add(t, 6000, i => 0.5 * Math.sin(2 * Math.PI * (55 + 60 * Math.exp(-i / 400)) * i / sr) * Math.exp(-i / 3000) + 0.1 * rnd() * Math.exp(-i / 40));
    if (snare && k % 2) add(t, 4000, i => 0.1 * (Math.sin(2 * Math.PI * 330 * i / sr) + Math.sin(2 * Math.PI * 720 * i / sr) + Math.sin(2 * Math.PI * 1250 * i / sr)) * Math.exp(-i / 900));
    add(t + 0.25, 2500, i => 0.3 * rnd() * Math.exp(-i / 250) * (i % 2 ? 1 : -1));
  }
  return x;
}
const kitOn = analyze(offBeatKit(), sr);
assert.ok(Math.abs(kitOn.bpm - 120) < 0.2, 'kit bpm ' + kitOn.bpm);
assert.ok(Math.abs(kitOn.firstBeat - 0.3) < 0.01, 'on the kick, not the hats: ' + kitOn.firstBeat);
assert.equal(kitOn.accepted, true);
// Without the backbeat the evidence is not clear, and the fitted grid (on the hats) stays.
const kitNoSnare = analyze(offBeatKit({ snare: false }), sr);
assert.ok(Math.abs(kitNoSnare.firstBeat - 0.05) < 0.01, 'fitted grid kept on the hats: ' + kitNoSnare.firstBeat);
// The half-beat move is refused when it would lose acceptance: with the kick on every other beat (gain 0.6) the kick
// grid is still the clear low/backbeat winner, but only about 0.65 of its lines meet an onset (hitRate below 0.7), while
// the fitted hat grid is accepted. On a 12 s kit the kick grid has too few hits (15) for the sparse rule too, so the
// fitted phase stays. On the 20 s kit (26 hits, 6.3 ms median) the sparse rule (v2.7) accepts the kick grid, and the
// move goes through onto the kick.
function sparseKickKit(seconds = 20) {
  let s = 7; const rnd = () => ((s = Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296 - 0.5;
  const x = new Float32Array(seconds * sr).map(() => rnd() * 0.002);
  const add = (t, n, f) => { const i0 = Math.round(t * sr); for (let k = 0; k < n && i0 + k < x.length; k++) x[i0 + k] += f(k); };
  for (let k = 0; 0.3 + k * 0.5 < seconds - 0.5; k++) {
    const t = 0.3 + k * 0.5;
    if (k % 2 === 0) add(t, 6000, i => 0.6 * (0.5 * Math.sin(2 * Math.PI * (55 + 60 * Math.exp(-i / 400)) * i / sr) * Math.exp(-i / 3000) + 0.1 * rnd() * Math.exp(-i / 40)));
    if (k % 2) add(t, 4000, i => 0.1 * (Math.sin(2 * Math.PI * 330 * i / sr) + Math.sin(2 * Math.PI * 720 * i / sr) + Math.sin(2 * Math.PI * 1250 * i / sr)) * Math.exp(-i / 900));
    add(t + 0.25, 2500, i => 0.3 * rnd() * Math.exp(-i / 250) * (i % 2 ? 1 : -1));
  }
  return x;
}
const sparse = analyze(sparseKickKit(12), sr);
assert.ok(Math.abs(sparse.firstBeat - 0.05) < 0.01, 'flip refused, fitted phase kept: ' + sparse.firstBeat);
assert.equal(sparse.accepted, true);
// The move never lowers the grid state (accepted > approximate > none).
const { takeFlip } = require(path.join(root, 'beat-detect.cjs'));
for (const [fit, flip, take] of [['accepted', 'accepted', true], ['accepted', 'approximate', false], ['accepted', 'none', false],
  ['approximate', 'accepted', true], ['approximate', 'approximate', true], ['approximate', 'none', false], ['none', 'none', true], ['none', 'approximate', true]])
  assert.equal(takeFlip({ grid: fit }, { grid: flip }), take, fit + ' -> ' + flip);
const sparseLong = analyze(sparseKickKit(), sr);
assert.ok(Math.abs(sparseLong.firstBeat - 0.3) < 0.01, 'sparse kick grid accepted, flip onto the kick: ' + sparseLong.firstBeat);
assert.ok(sparseLong.hitRate < 0.7, 'accepted by the sparse rule: ' + sparseLong.hitRate);
assert.equal(sparseLong.accepted, true);
// phaseBeats still applies after the check.
assert.ok(Math.abs(analyze(offBeatKit(), sr, { phaseBeats: -0.5 }).firstBeat - 0.05) < 0.01, 'phaseBeats after the check');

const b = analyze(clickTrack(66, 0.2, 30), sr);          // below range: resolved to double tempo
assert.ok(Math.abs(b.bpm - 132) < 0.3 || Math.abs(b.bpm - 66) < 0.2, 'bpm ' + b.bpm);

let seed = 1; const rnd = () => ((seed = Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296;
const noise = Float32Array.from({ length: 20 * sr }, () => (rnd() - 0.5) * 0.2);
assert.equal(analyze(noise, sr).accepted, false);

// Sparse drums (v2.7): lo-fi and half-time grooves put a kick or snare on only some beats. A kick on beats 1 and 3
// only, with an 8th-note fill on beat 4 every fourth bar, at 120 BPM: about half the grid lines meet an onset
// (hitRate under 0.7), but those that do sit within a few ms. The sparse branch accepts it on the right tempo.
function sparseDrums({ bpm = 120, first = 0.4, seconds = 32, bars = () => [0, 2], fills = true } = {}) {
  let s = 11; const rnd = () => ((s = Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296 - 0.5;
  const x = new Float32Array(Math.round(seconds * sr)).map(() => rnd() * 0.002);
  const kick = t => { const i0 = Math.round(t * sr); for (let k = 0; k < 6000 && i0 + k < x.length; k++) x[i0 + k] += 0.5 * Math.sin(2 * Math.PI * (55 + 60 * Math.exp(-k / 400)) * k / sr) * Math.exp(-k / 3000) + 0.05 * rnd() * Math.exp(-k / 40); };
  const snare = t => { const i0 = Math.round(t * sr); for (let k = 0; k < 3000 && i0 + k < x.length; k++) x[i0 + k] += 0.25 * rnd() * Math.exp(-k / 600); };
  const beat = 60 / bpm;
  for (let bar = 0; first + bar * 4 * beat < seconds - 0.5; bar++) {
    const t0 = first + bar * 4 * beat;
    for (const b of bars(bar)) kick(t0 + b * beat);
    if (fills && bar % 4 === 3) { snare(t0 + 3 * beat); snare(t0 + 3.5 * beat); }
  }
  return x;
}
const sp = analyze(sparseDrums(), sr);
assert.ok(Math.abs(sp.bpm - 120) < 0.2, 'sparse bpm ' + sp.bpm);
assert.ok(Math.abs(sp.firstBeat - 0.4) < 0.01, 'sparse firstBeat ' + sp.firstBeat);
assert.ok(sp.hitRate < 0.7, 'sparse hitRate below the strict rule: ' + sp.hitRate);
assert.equal(sp.accepted, true);
assert.equal(sp.grid, 'accepted');
// The same at 96 BPM, without fills.
const sp96 = analyze(sparseDrums({ bpm: 96, first: 0.2, seconds: 40, fills: false }), sr);
assert.ok(Math.abs(sp96.bpm - 96) < 0.2, 'sparse 96 bpm ' + sp96.bpm);
assert.equal(sp96.accepted, true);
// Kicks on 1 and 3 in every other bar only: a quarter of the lines meet an onset. Too sparse to accept, but the grid
// is tight and holds, so it is reported as approximate (tempo and first beat still usable as a guide).
const spApprox = analyze(sparseDrums({ seconds: 40, bars: bar => (bar % 2 ? [] : [0, 2]), fills: false }), sr);
assert.ok(Math.abs(spApprox.bpm - 120) < 0.2, 'approximate bpm ' + spApprox.bpm);
assert.ok(spApprox.hitRate < 0.35, 'approximate hitRate ' + spApprox.hitRate);
assert.equal(spApprox.accepted, false);
assert.equal(spApprox.grid, 'approximate');
// Clicks on every beat are the strict case.
assert.equal(a.grid, 'accepted');
// Noise has no grid.
assert.equal(analyze(noise, sr).grid, 'none');
// A tempo change: 40 s of clicks at 100 BPM, then 30 s of 8th-note clicks at 126 BPM (dense, so about 0.6 of the
// 100 BPM lines there meet an onset by chance). Before v2.7 the whole track was accepted on the first part's tempo
// (hitRate 0.83, median 7.8 ms); the consistency check (every 30 s window with enough hits keeps its median residual
// within 20 ms) rejects it. A change that leaves under about 30 s on the wrong tempo can still pass.
const change = new Float32Array(70 * sr);
change.set(clickTrack(100, 0.1, 40), 0); change.set(clickTrack(252, 0.1, 30), 40 * sr);
const ch = analyze(change, sr);
assert.equal(ch.accepted, false, 'tempo change accepted at ' + ch.bpm);
assert.equal(ch.grid, 'none');
// Rubato: clicks whose tempo drifts between about 75 and 115 BPM, with +/- 40 ms jitter. No grid.
const rubato = new Float32Array(60 * sr);
{ let s = 5; const rnd = () => ((s = Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296 - 0.5;
  for (let t = 0.3; t < 59.5;) {
    const i0 = Math.round(t * sr);
    for (let k = 0; k < 400 && i0 + k < rubato.length; k++) rubato[i0 + k] += Math.sin(2 * Math.PI * 1000 * k / sr) * Math.exp(-k / 80);
    t += 60 / (95 + 20 * Math.sin(2 * Math.PI * t / 13)) + rnd() * 0.08;
  } }
const rb = analyze(rubato, sr);
assert.equal(rb.accepted, false, 'rubato accepted at ' + rb.bpm);
assert.equal(rb.grid, 'none');

// Sparse music that changes tempo, or whose hits are too rare to fix a tempo: never a grid, not even approximate. In
// the wrong-tempo stretch sparse kicks give misses rather than loose hits, so the residual check never has enough hits
// in a window; the on-grid share of the window's onsets (0.30 of the track's) refuses it. (Reviewer cases.)
function kickTrack(seconds, times) {
  let q = 3; const r = () => ((q = Math.imul(q, 1103515245) + 12345) >>> 0) / 4294967296 - 0.5;
  const x = new Float32Array(seconds * sr).map(() => r() * 0.002);
  for (const t of times) { const i0 = Math.round(t * sr); for (let k = 0; k < 6000 && i0 + k < x.length; k++) x[i0 + k] += 0.5 * Math.sin(2 * Math.PI * (55 + 60 * Math.exp(-k / 400)) * k / sr) * Math.exp(-k / 3000); }
  return x;
}
{
  // Kicks on 1 and 3 of every other bar, 60 s at 120 BPM, then 60 s at 100 BPM.
  const t = [];
  for (let bar = 0; 0.4 + bar * 2 < 60; bar += 2) t.push(0.4 + bar * 2, 1.4 + bar * 2);
  for (let bar = 0; 60.3 + bar * 2.4 < 119; bar += 2) t.push(60.3 + bar * 2.4, 61.5 + bar * 2.4);
  const r = analyze(kickTrack(120, t), sr);
  assert.equal(r.grid, 'none', 'sparse 120 -> 100 BPM: ' + r.grid + ' at ' + r.bpm);
}
{
  // A kick every 3.0 s for 100 s, then every 2.85 s.
  const t = [];
  for (let x = 0.4; x < 100; x += 3) t.push(x);
  for (let x = 100.4; x < 199; x += 2.85) t.push(x);
  const r = analyze(kickTrack(200, t), sr);
  assert.equal(r.grid, 'none', 'sparse 3.0 -> 2.85 s kicks: ' + r.grid + ' at ' + r.bpm);
}
{
  // One kick every 8 s for 200 s: tight and steady, but one hit in 16 lines fits many tempos.
  const t = [];
  for (let x = 0.4; x < 199; x += 8) t.push(x);
  const r = analyze(kickTrack(200, t), sr);
  assert.equal(r.grid, 'none', 'a kick every 8 s: ' + r.grid + ' at ' + r.bpm);
}
// The on-grid share gate on its own: 120 s of sparse drums with a quarter-beat (0.125 s) silent gap at 90 s, so the
// last 30 s sit a quarter beat off the grid. hitRate is about 0.32 (between the approximate and sparse floors) and the
// residual check has no window with 12 loose hits; only the on-grid share of the late windows refuses it (without the
// gate it is 'approximate'). (Reviewer case.)
{
  const a = sparseDrums({ seconds: 120 }), i = Math.round(90 * sr);
  const x = new Float32Array(a.length + Math.round(0.125 * sr));
  x.set(a.subarray(0, i), 0); x.set(a.subarray(i), i + Math.round(0.125 * sr));
  const r = analyze(x, sr);
  assert.ok(r.hitRate > 0.2 && r.hitRate < 0.35, 'quarter-beat slip hitRate ' + r.hitRate);
  assert.equal(r.grid, 'none', 'quarter-beat slip at 90 s: ' + r.grid + ' at ' + r.bpm);
}
// A silent outro does not dilute hitRate: lines are counted up to the last onset.
{
  const body = sparseDrums();
  const padded = new Float32Array(body.length + 40 * sr); padded.set(body, 0);
  const r = analyze(padded, sr);
  assert.equal(r.grid, 'accepted', 'sparse drums + 40 s silence: ' + r.grid);
  assert.ok(Math.abs(r.hitRate - sp.hitRate) < 0.02, 'hitRate ' + r.hitRate + ' vs ' + sp.hitRate);
}
// A lone onset in noise is not a grid (strict needs at least 8 hits).
{
  const x = new Float32Array(20 * sr).map((_, i) => 0.001 * Math.sin(i));
  for (let k = 0; k < 400; k++) x[5 * sr + k] += Math.sin(2 * Math.PI * 1000 * k / sr) * Math.exp(-k / 80);
  assert.equal(analyze(x, sr).accepted, false, 'a single click');
}

// CLI round trip.
const tmp = path.join(require('node:os').tmpdir(), 'st-beat-test.f32');
fs.writeFileSync(tmp, Buffer.from(clickTrack(100, 0, 20).buffer));
const out = JSON.parse(execFileSync('node', [path.join(root, 'beat-detect.cjs'), tmp, String(sr)]).toString().trim().split('\n').pop());
assert.ok(Math.abs(out.bpm - 100) < 0.2);

// A track that starts on the beat anchors the grid at 0.
const c = analyze(clickTrack(100, 0, 20), sr);
assert.ok(Math.abs(c.firstBeat) < 0.03, 'firstBeat at 0: ' + c.firstBeat);

// A soft first beat is still music: it must not be skipped as leading silence.
const soft = clickTrack(100, 0, 20);
for (let k = 0; k < 400; k++) soft[k] *= 0.3;
const d = analyze(soft, sr);
assert.ok(Math.abs(d.firstBeat) < 0.03, 'soft firstBeat ' + d.firstBeat);
assert.equal(d.accepted, true);

// A first beat with no attack (a pad swelling in, as in the weekend-indie-pop cue) is audible
// music too; the grid line at 0 must not be skipped as leading silence.
const swell = clickTrack(100, 0.6, 20);
for (let i = 0; i < Math.round(0.6 * sr); i++) swell[i] += 0.3 * (i / (0.6 * sr)) * Math.sin(2 * Math.PI * 220 * i / sr);
const e = analyze(swell, sr);
assert.ok(Math.abs(e.firstBeat) < 0.03, 'swell firstBeat ' + e.firstBeat);
assert.equal(e.accepted, true);

// 16th-onset ratio: clicks only on the beat give ~0; clicks on every 16th give ~1. analyze reports it too.
const { sixteenthRatio } = require(path.join(root, 'beat-detect.cjs'));
const beatsOnly = clickTrack(100, 0.3, 20);
const sixteenths = clickTrack(400, 0.3, 20);
assert.ok(sixteenthRatio(beatsOnly, sr, 100, 0.3, 20) < 0.1, 'beats only');
assert.ok(sixteenthRatio(sixteenths, sr, 100, 0.3, 20) > 0.8, 'every 16th');
assert.equal(sixteenthRatio(beatsOnly, sr, 0, 0.3, 20), null);
assert.ok(typeof a.sixteenthRatio === 'number' && a.sixteenthRatio < 0.1, 'analyze reports the ratio');
// The first beat sits on the attack: the onset lag is taken off (clicks at 0.5 s).
assert.ok(Math.abs(a.firstBeat - 0.5) < 0.006, 'firstBeat on the attack ' + a.firstBeat);

// Band onsets for cut snapping: a kick (60 Hz) lands in the low band and a hat (noise burst) in the high band, each
// stamped on its attack; strengths are relative to the band median and every listed onset reaches its threshold.
const { bandOnsets } = require(path.join(root, 'beat-detect.cjs'));
let s2 = 3; const rnd2 = () => ((s2 = Math.imul(s2, 1103515245) + 12345) >>> 0) / 4294967296 - 0.5;
const kit = new Float32Array(12 * sr).map(() => rnd2() * 0.002);
const kicks = [], hats = [];
for (let t = 0.5; t < 11.5; t += 0.613) kicks.push(t);
for (let t = 0.8; t < 11.5; t += 0.613) hats.push(t);
for (const t of kicks) { const i0 = Math.round(t * sr); for (let k = 0; k < 6000 && i0 + k < kit.length; k++) kit[i0 + k] += 0.5 * Math.sin(2 * Math.PI * (60 + 60 * Math.exp(-k / 400)) * k / sr) * Math.exp(-k / 3000); }
for (const t of hats) { const i0 = Math.round(t * sr); for (let k = 0; k < 3000 && i0 + k < kit.length; k++) kit[i0 + k] += rnd2() * Math.exp(-k / 300) * (k % 2 ? 1 : -1); }
const bo = bandOnsets(kit, sr);
assert.deepEqual(Object.keys(bo.thresholds).sort(), ['h', 'l', 'm']);
for (const v of Object.values(bo.thresholds)) assert.ok(v >= 2);
for (const [t, band, str] of bo.onsets) { assert.ok(['l', 'm', 'h'].includes(band)); assert.ok(str >= bo.thresholds[band]); }
const nearest = (band, t) => Math.min(...bo.onsets.filter(o => o[1] === band).map(o => Math.abs(o[0] - t)));
const med = v => [...v].sort((x, y) => x - y)[v.length >> 1];
assert.ok(med(kicks.map(t => nearest('l', t))) < 0.006, 'kicks in the low band, on the attack');
assert.ok(med(hats.map(t => nearest('h', t))) < 0.006, 'hats in the high band, on the attack');
assert.ok(bo.onsets.filter(o => o[1] === 'h').every(o => kicks.every(t => Math.abs(o[0] - t) > 0.02)), 'a kick is no high-band onset');
for (let i = 1; i < bo.onsets.length; i++) assert.ok(bo.onsets[i][0] >= bo.onsets[i - 1][0], 'sorted by time');
// analyze() returns them too, also for music whose grid is not accepted (the fixed-timing cuts snap to bass onsets).
assert.ok(Array.isArray(a.onsets) && a.onsets.length > 10 && a.onsetThresholds && a.onsetThresholds.h >= 2, 'analyze reports onsets');
const na = analyze(kit, sr);
assert.deepEqual(na.onsets, bo.onsets);
assert.deepEqual(na.onsetThresholds, bo.thresholds);
// CLI with an output file: the result goes to the file, stdout carries only {"ok":true}.
const outFile = path.join(require('node:os').tmpdir(), 'st-beat-test.json');
const okLine = execFileSync('node', [path.join(root, 'beat-detect.cjs'), tmp, String(sr), outFile]).toString().trim();
assert.equal(okLine, '{"ok":true}');
const full = JSON.parse(fs.readFileSync(outFile, 'utf8'));
assert.ok(Math.abs(full.bpm - 100) < 0.2 && Array.isArray(full.onsets));

// ---- Summer Trip: drop detection, downbeat clarity, tempo octave ----
const { detectDrop, downbeatClarity, _internal } = require(path.join(root, 'beat-detect.cjs'));
// 120 BPM (bar = 2 s), one level per bar in dB: a pad (220 + 330 Hz) and a click with a low thump on every beat, all
// scaled by the bar's level, so each bar's RMS follows `levels` exactly.
function barsTrack(levels, { bpm = 120, beat1 = 1 } = {}) {
  const P = 60 / bpm, bar = 4 * P, x = new Float32Array(Math.round(levels.length * bar * sr));
  for (let i = 0; i < x.length; i++) {
    const t = i / sr, b = Math.min(levels.length - 1, Math.floor(t / bar)), g = 0.3 * 10 ** (levels[b] / 20);
    const k = Math.floor(t / P + 1e-9), u = t - k * P, accent = k % 4 === 0 ? beat1 : 1;
    x[i] = g * (0.3 * Math.sin(2 * Math.PI * 220 * t) + 0.2 * Math.sin(2 * Math.PI * 330 * t)
      + accent * (Math.sin(2 * Math.PI * 1000 * u) * Math.exp(-u * sr / 80) + 0.8 * Math.sin(2 * Math.PI * 60 * u) * Math.exp(-u / 0.06)));
  }
  return x;
}
const grid120 = { bpm: 120, firstBeat: 0 };
const loud = n => Array(n).fill(0);
// Quiet 2 bars (-12 dB), then loud clicked bars: the drop is bar 3, beat 8, 4 s, a 12 dB step.
const dropTrack = barsTrack([-12, -12, ...loud(12)]);
const drop = detectDrop(dropTrack, sr, grid120);
assert.deepEqual([drop.dropBeat, drop.dropSeconds], [8, 4], 'drop at bar 3: ' + JSON.stringify(drop));
assert.ok(Math.abs(drop.stepDb - 12) < 0.5, 'step ' + drop.stepDb);
// analyze() finds it on its own grid and reports it with the grid it used.
const ad = analyze(dropTrack, sr);
assert.ok(Math.abs(ad.bpm - 120) < 0.2 && Math.abs(ad.firstBeat) < 0.02, 'drop track grid ' + ad.bpm + ' ' + ad.firstBeat);
assert.equal(ad.drop.dropBeat, 8);
assert.ok(Math.abs(ad.drop.dropSeconds - 4) < 0.02 && ad.drop.bpm === ad.bpm && ad.drop.firstBeat === ad.firstBeat, JSON.stringify(ad.drop));
// Flat: no step, no drop.
assert.equal(detectDrop(barsTrack(loud(14)), sr, grid120), null, 'flat');
// A step before beat 8 (bar 2) leaves no bar line with 2 quiet bars before it and 8 beats from the start.
assert.equal(detectDrop(barsTrack([-12, ...loud(13)]), sr, grid120), null, 'step too early');
// A step whose previous bars are not quiet relative to the track (a +4.5 dB bump over an even level) is no drop.
assert.equal(detectDrop(barsTrack([0, 0, 4.5, 4.5, ...loud(10)]), sr, grid120), null, 'bump over an even level');
// A long quiet intro with an abrupt drop: the bar line one bar early already qualifies (one loud bar in its "after"
// window), so the first-mode pick slides to the bar line with the larger step (live: a generated cue read 14 s, not 16 s).
const longIntro = detectDrop(barsTrack([-12, -12, -12, -12, -12, -12, ...loud(10)]), sr, grid120);
assert.deepEqual([longIntro.dropBeat, longIntro.dropSeconds], [24, 12], 'abrupt drop after 6 quiet bars: ' + JSON.stringify(longIntro));
// A 3 dB step is not enough.
assert.equal(detectDrop(barsTrack([-3, -3, ...loud(12)]), sr, grid120), null, '3 dB step');
// The first qualifying bar line wins; pick 'largest' takes the biggest step instead (spec 7.3's own-music wording).
const twoSteps = barsTrack([-12, -12, -7, -7, -20, -20, ...loud(6)]);
assert.equal(detectDrop(twoSteps, sr, grid120).dropBeat, 8, 'first step');
assert.equal(detectDrop(twoSteps, sr, grid120, { pick: 'largest' }).dropBeat, 24, 'largest step');
// analyze() reports the first by default and the largest with dropPick 'largest' (the panel's own-music analysis).
assert.equal(analyze(twoSteps, sr).drop.dropBeat, 8, 'analyze: first step');
assert.equal(analyze(twoSteps, sr, { dropPick: 'largest' }).drop.dropBeat, 24, 'analyze: largest step');
{
  // CLI: a 4th argument 'largest' does the same (the panel runs it for own music).
  const pcm = path.join(require('node:os').tmpdir(), 'st-beat-two-steps.f32'), json = pcm + '.json';
  fs.writeFileSync(pcm, Buffer.from(twoSteps.buffer, twoSteps.byteOffset, twoSteps.byteLength));
  assert.equal(execFileSync('node', [path.join(root, 'beat-detect.cjs'), pcm, String(sr), json, 'largest']).toString().trim(), '{"ok":true}');
  assert.equal(JSON.parse(fs.readFileSync(json, 'utf8')).drop.dropBeat, 24, 'CLI largest');
  execFileSync('node', [path.join(root, 'beat-detect.cjs'), pcm, String(sr), json]);
  assert.equal(JSON.parse(fs.readFileSync(json, 'utf8')).drop.dropBeat, 8, 'CLI default first');
  fs.rmSync(pcm, { force: true }); fs.rmSync(json, { force: true });
}
// Bar lines follow firstBeat: the same track delayed by one beat has its drop one beat later in seconds, same beat.
const delayed = new Float32Array(dropTrack.length + sr / 2); delayed.set(dropTrack, sr / 2);
assert.deepEqual([detectDrop(delayed, sr, { bpm: 120, firstBeat: 0.5 }).dropBeat, detectDrop(delayed, sr, { bpm: 120, firstBeat: 0.5 }).dropSeconds], [8, 4.5]);
// A very quiet intro (-26 dB) is below analyze()'s leading-silence level, so its first beat lands on the drop; the bar
// grid is extended back to the file start and the drop is still found at 4 s, dropBeat 0 from that first beat.
const hushed = barsTrack([-26, -26, ...loud(12)]);
const ah = analyze(hushed, sr);
assert.ok(Math.abs(ah.firstBeat - 4) < 0.02, 'first beat on the drop ' + ah.firstBeat);
const raw = detectDrop(hushed, sr, { bpm: 120, firstBeat: 4 });
assert.deepEqual([raw.dropBeat, raw.dropSeconds], [0, 4], 'raw drop from the late first beat');
// anchorOnDrop moves the first beat back to the file's first bar line; analyze() reports the drop on that grid.
const { anchorOnDrop } = require(path.join(root, 'beat-detect.cjs'));
assert.deepEqual(anchorOnDrop(raw, 120, 4), { firstBeat: 0, dropBeat: 8 });
assert.deepEqual(anchorOnDrop({ dropBeat: 1, dropSeconds: 5.1 }, 120, 4.6), { firstBeat: 1.1, dropBeat: 8 });
assert.deepEqual(anchorOnDrop(drop, 120, 0), { firstBeat: 0, dropBeat: 8 }, 'an intro already counted stays');
assert.ok(ah.drop && ah.drop.dropBeat === 8 && Math.abs(ah.drop.firstBeat) < 0.02 && Math.abs(ah.drop.dropSeconds - 4) < 0.02, 'hushed intro drop ' + JSON.stringify(ah.drop));
// No grid, no drop.
assert.equal(detectDrop(dropTrack, sr, { bpm: 0, firstBeat: 0 }), null);

// Downbeat clarity: a thump accented 5x on beat 1 of each bar reads 'high' with its bar lines at phase 0; moved one
// beat on, the best phase is 3. An even thump reads 'low'.
const accented = barsTrack(loud(12), { beat1: 5 });
const dc = downbeatClarity(accented, sr, 120, 0, 0, null);
assert.equal(dc.confidence, 'high', JSON.stringify(dc));
assert.equal(dc.bestPhase, 0);
assert.equal(downbeatClarity(accented, sr, 120, 0.5, 0.5, null).bestPhase, 3);
assert.equal(downbeatClarity(barsTrack(loud(12)), sr, 120, 0, 0, null).confidence, 'low');
assert.equal(downbeatClarity(accented, sr, 0, 0, 0, null), null);
assert.ok(ad.downbeat && ['high', 'low'].includes(ad.downbeat.confidence), 'analyze reports downbeat clarity');

// Tempo octave (spec 15.5): of bpm/2, bpm and 2 bpm, the one closest to 120 BPM in log scale.
const { octaveBpm } = _internal;
assert.equal(octaveBpm(120), 120);
assert.equal(octaveBpm(80), 160);
assert.equal(octaveBpm(84), 168);
assert.equal(octaveBpm(86), 86);
assert.equal(octaveBpm(160), 160);
assert.equal(octaveBpm(250), 125);
assert.equal(octaveBpm(62), 124);
assert.equal(octaveBpm(0), null);

console.log(JSON.stringify({ beatDetect: 'ok' }));
