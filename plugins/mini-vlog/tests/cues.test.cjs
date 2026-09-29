// plugins/mini-vlog/tests/cues.test.cjs
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), dir = path.join(root, 'assets', 'cues');
const m = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
assert.equal(m.version, 1);
// Every cue the plugin may ship, in manifest order: reference-type first (the two new cues, then the reused
// weekend-indie-pop and golden-hour-disco), the alternatives last. Only the cues present in the manifest are checked;
// the four reused ones must always be there. downbeat: the measured confidence (see dev/build-cues.cjs); barPhase: the
// whole beats the build moved firstBeat by to reach the best bar phase.
const ALL = [
  { id: 'bedroom-pop-108', bpm: 108, group: 'reference', downbeat: 'high', barPhase: 0 },
  { id: 'acoustic-pop-104', bpm: 104, group: 'reference', downbeat: 'low', barPhase: 2 },
  { id: 'weekend-indie-pop', bpm: 112, group: 'reference', downbeat: 'low', barPhase: 0 },
  { id: 'golden-hour-disco', bpm: 104, group: 'reference', downbeat: 'low', barPhase: 0 },
  { id: 'sunny-soul-strut', bpm: 99, group: 'alternative', downbeat: 'high', barPhase: 0 },
  { id: 'easy-sunday-lofi', bpm: 88, group: 'alternative', downbeat: 'high', barPhase: 0 },
];
const REUSED = ['weekend-indie-pop', 'golden-hour-disco', 'sunny-soul-strut', 'easy-sunday-lofi'];
const ids = m.cues.map(c => c.id);
assert.deepEqual(ids, ALL.map(e => e.id).filter(id => ids.includes(id)), 'manifest ids in the known order: ' + ids);
for (const id of REUSED) assert.ok(ids.includes(id), id + ' shipped');
// Manifest <-> files <-> plugin.json: every mp3 in the folder is a manifest cue and the other way round, and the
// plugin ships exactly the manifest and its mp3s from assets/cues.
assert.deepEqual(fs.readdirSync(dir).filter(f => f.endsWith('.mp3')).sort(), m.cues.map(c => c.file).sort());
const shipped = JSON.parse(fs.readFileSync(path.join(root, 'plugin.json'), 'utf8')).files.filter(f => f.startsWith('assets/cues/'));
assert.deepEqual(shipped.sort(), ['assets/cues/manifest.json', ...m.cues.map(c => 'assets/cues/' + c.file)].sort());
// Relaxed shots (2 beats each) that fit from the earliest start (spec 14.2: the largest multiple of 4 <= 36).
const fitted = (c, beatsPerShot) => { let n = 36; while (n > 4 && c.firstBeat + n * beatsPerShot * 60 / c.bpm > c.usableEnd) n -= 4; return n; };
for (const c of m.cues) {
  const e = ALL.find(x => x.id === c.id);
  assert.equal(c.file, c.id + '.mp3');
  assert.equal(c.group, e.group, c.id + ' group');
  const buf = fs.readFileSync(path.join(dir, c.file));
  assert.equal(crypto.createHash('sha256').update(buf).digest('hex'), c.sha256, c.id + ' hash');
  assert.ok(buf.length < 20 * 1024 * 1024);
  assert.ok(Math.abs(c.bpm - e.bpm) < 0.3, c.id + ' bpm ' + c.bpm);
  // The reused cues start on a beat; a generated cue may start up to a bar in (its first beat moved to the best bar phase).
  assert.ok(c.firstBeat >= 0 && c.firstBeat < (REUSED.includes(c.id) ? 0.05 : 4 * 60 / c.bpm), c.id + ' firstBeat');
  assert.equal(c.barPhaseBeats || 0, e.barPhase, c.id + ' barPhaseBeats');
  assert.ok(c.usableEnd > c.firstBeat, c.id + ' usableEnd after firstBeat');
  assert.ok(Math.abs(c.lufs + 14) <= 1, c.id + ' lufs ' + c.lufs);
  // downbeatConfidence follows the measured beat-1 ratio at the manifest's bar phase (high at 1.5 or more).
  assert.equal(c.downbeatConfidence, e.downbeat, c.id + ' downbeatConfidence');
  assert.ok(typeof c.downbeatRatio === 'number' && c.downbeatRatio > 0, c.id + ' downbeatRatio');
  assert.equal(c.downbeatConfidence, c.downbeatRatio >= 1.5 ? 'high' : 'low', c.id + ' downbeatConfidence vs ratio ' + c.downbeatRatio);
  // Long + Quick (36 one-beat shots) fits every cue from its first beat.
  assert.equal(fitted(c, 1), 36, c.id + ' fits Long Quick');
  assert.ok(typeof c.sixteenthRatio === 'number' && c.sixteenthRatio >= 0 && c.sixteenthRatio < 2, c.id + ' sixteenthRatio');
  assert.equal(c.peaks.length, 400);
  // beatEnergy is one RMS value per beat from firstBeat (the default section picks the loudest bar-aligned window).
  assert.ok(c.beatEnergy.length > 40 && c.beatEnergy.length <= Math.floor((c.duration - c.firstBeat) * c.bpm / 60) + 1, c.id + ' beatEnergy');
  assert.ok(c.duration >= c.usableEnd);
  // New cues (accepted by the user at GATE-MUSIC): no busy 16th layer, and generated at 60 s so Long + Relaxed fits.
  // Acoustic Pop measures 1.48, just under 1.5, so it ships with a low downbeat confidence (bar starts best effort).
  if (!REUSED.includes(c.id)) {
    assert.ok(c.sixteenthRatio < 0.3, c.id + ' sixteenthRatio ' + c.sixteenthRatio);
    assert.ok(c.usableEnd >= 45, c.id + ' usableEnd ' + c.usableEnd);
    assert.equal(fitted(c, 2), 36, c.id + ' fits Long Relaxed');
  }
  // Qualifying band onsets for cut snapping: [t, band, strength] sorted by time, every strength at or above its
  // band's threshold (max(2, the band's 80th percentile)), times to the millisecond inside the cue.
  assert.deepEqual(Object.keys(c.onsetThresholds).sort(), ['h', 'l', 'm'], c.id + ' onset thresholds');
  for (const v of Object.values(c.onsetThresholds)) assert.ok(v >= 2 && v < 50, c.id + ' threshold ' + v);
  assert.ok(Array.isArray(c.onsets) && c.onsets.length >= 60 && c.onsets.length <= 400, c.id + ' onsets ' + c.onsets.length);
  assert.ok(JSON.stringify(c.onsets).length < 6000, c.id + ' onsets stay compact');
  const bands = new Set();
  c.onsets.forEach(([t, band, s], i) => {
    assert.ok(t >= 0 && t <= c.duration && Math.abs(Math.round(t * 1000) - t * 1000) < 1e-6, c.id + ' onset time ' + t);
    assert.ok(i === 0 || t >= c.onsets[i - 1][0], c.id + ' onsets sorted');
    assert.ok(['l', 'm', 'h'].includes(band), c.id + ' band ' + band);
    assert.ok(s >= c.onsetThresholds[band], c.id + ' onset ' + t + ' below its band threshold');
    bands.add(band);
  });
  assert.equal(bands.size, 3, c.id + ' has onsets in every band');
  // The cues are on a tight grid: most qualifying onsets sit within 30 ms of a 16th note (the lo-fi cue swings).
  const q16 = 60 / c.bpm / 4, near = c.onsets.filter(([t]) => { const k = Math.round((t - c.firstBeat) / q16); return Math.abs(t - c.firstBeat - k * q16) < 0.03; });
  assert.ok(near.length >= 0.7 * c.onsets.length, c.id + ' onsets on the 16th grid ' + near.length + '/' + c.onsets.length);
}
const reused = REUSED.map(id => m.cues.find(c => c.id === id));
// Spec 14.2: the reused ~40 s cues fit at most 32 (indie, disco, soul) / 24 (lofi) Relaxed shots at the earliest start.
assert.deepEqual(reused.map(c => fitted(c, 2)), [32, 32, 32, 24]);
// Measured on the reused cues: only Sunny Soul Strut has a clear 16th pulse.
assert.deepEqual(reused.map(c => c.sixteenthRatio >= 0.35), [false, false, true, false]);
// The measured beat-1 ratios of the reused cues (the two low ones are best at phase 0 too, so their sections are
// beat-aligned only).
assert.deepEqual(reused.map(c => c.downbeatRatio), [1.2, 1.25, 3.28, 4.52]);
// The reused mp3s are the City Weekend Vlog files unchanged (never re-encoded).
assert.deepEqual(reused.map(c => c.sha256.slice(0, 12)), ['892819e9d672', 'f35098387dc8', 'cedd6c13db48', '7c251130324e']);
// beat-detect.cjs reproduces every shipped first beat (plus barPhaseBeats whole beats) and tempo from the mp3 (when
// ffmpeg is available).
const { execFileSync, spawnSync } = require('node:child_process');
if (spawnSync('ffmpeg', ['-version']).status === 0) {
  const { analyze } = require(path.join(root, 'beat-detect.cjs'));
  for (const c of m.cues) {
    const pcm = execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-i', path.join(dir, c.file), '-ac', '1', '-ar', '22050', '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
    const a = analyze(new Float32Array(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + Math.floor(pcm.byteLength / 4) * 4)), 22050);
    assert.equal(a.bpm, c.bpm, c.id + ' bpm reproduced');
    const k = c.barPhaseBeats || 0, fb = a.firstBeat + k * 60 / a.bpm;
    assert.ok(Math.abs(fb - c.firstBeat) <= 0.001, c.id + ' firstBeat reproduced: ' + fb + ' vs ' + c.firstBeat);
    assert.equal(a.accepted, true, c.id + ' accepted');
    // beatEnergy is indexed in whole beats from firstBeat: the re-measured values line up beat for beat (they differ
    // slightly because the analysis runs on the unrounded grid; a one-beat shift would differ by up to 0.2 on the lo-fi cue).
    // A re-anchored cue drops the first k values.
    assert.ok(Math.abs(a.beatEnergy.length - k - c.beatEnergy.length) <= 1, c.id + ' beatEnergy length');
    c.beatEnergy.forEach((v, i) => i + k < a.beatEnergy.length && assert.ok(Math.abs(a.beatEnergy[i + k] - v) < 0.03, c.id + ' beatEnergy ' + i + ' aligned with firstBeat'));
  }
}
console.log(JSON.stringify({ cues: 'ok' }));
