// plugins/torn-paper-love/tests/cues.test.cjs
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const dir = path.resolve(__dirname, '..', 'assets', 'cues');
const m = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
assert.equal(m.version, 1);
assert.deepEqual(m.cues.map(c => c.id), ['easy-sunday-lofi', 'sunny-soul-strut']);
assert.ok(m.cues.some(c => c.id === m.defaultCue), 'defaultCue is one of the cue ids');
const expected = { 'easy-sunday-lofi': 88, 'sunny-soul-strut': 99 };
for (const c of m.cues) {
  const buf = fs.readFileSync(path.join(dir, c.file));
  assert.equal(crypto.createHash('sha256').update(buf).digest('hex'), c.sha256, c.id + ' hash');
  assert.ok(buf.length < 20 * 1024 * 1024);
  assert.ok(Math.abs(c.bpm - expected[c.id]) < 0.3, c.id + ' bpm ' + c.bpm);
  assert.ok(c.firstBeat >= 0 && c.firstBeat < 0.05, c.id + ' firstBeat');
  assert.ok(Math.abs(c.lufs + 14) <= 1, c.id + ' lufs ' + c.lufs);
  assert.ok(['high', 'low'].includes(c.downbeatConfidence), c.id + ' downbeatConfidence');
  // The longest Torn Paper Love video (Long Relaxed, 52 eighth-note units) must fit from the start of the cue.
  assert.ok(c.firstBeat + 52 * 30 / c.bpm <= c.usableEnd, c.id + ' fits long');
  // The 16th-onset ratio measured by beat-detect.cjs decides the title burst.
  assert.ok(typeof c.sixteenthRatio === 'number' && c.sixteenthRatio >= 0 && c.sixteenthRatio < 2, c.id + ' sixteenthRatio');
  assert.equal(c.peaks.length, 400);
  assert.ok(c.beatEnergy.length > 40);
  assert.ok(c.duration >= c.usableEnd);
  // Qualifying band onsets for cut snapping: [t, band, strength] sorted by time, every strength at or above its
  // band's threshold (max(2, the band's 80th percentile)), times to the millisecond inside the cue.
  assert.deepEqual(Object.keys(c.onsetThresholds).sort(), ['h', 'l', 'm'], c.id + ' onset thresholds');
  for (const v of Object.values(c.onsetThresholds)) assert.ok(v >= 2 && v < 50, c.id + ' threshold ' + v);
  assert.ok(Array.isArray(c.onsets) && c.onsets.length >= 60 && c.onsets.length <= 400, c.id + ' onsets ' + c.onsets.length);
  assert.ok(JSON.stringify(c.onsets).length < 6000, c.id + ' onsets stay compact');
  const bands = new Set();
  c.onsets.forEach(([t, band, s], i) => {
    assert.ok(t >= 0 && t <= c.duration && Math.abs(Math.round(t * 1000) - t * 1000) < 1e-6, c.id + " onset time " + t);
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
// Measured on the bundled cues: Sunny Soul Strut has a clear enough 16th pulse for the 16th burst, the lo-fi cue swings.
assert.deepEqual(m.cues.map(c => c.sixteenthRatio >= 0.35), [false, true]);
// Every grid is the detector's own (no cue needs a phaseBeats override). downbeatConfidence: beat-1 low-band clarity >= 1.5 (see dev/build-cues.cjs).
assert.deepEqual(m.cues.map(c => c.downbeatConfidence), ['high', 'high']);
// beat-detect.cjs reproduces every shipped first beat and tempo from the mp3 (when ffmpeg is available).
const { execFileSync, spawnSync } = require('node:child_process');
if (spawnSync('ffmpeg', ['-version']).status === 0) {
  const { analyze } = require(path.resolve(__dirname, '..', 'beat-detect.cjs'));
  for (const c of m.cues) {
    const pcm = execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-i', path.join(dir, c.file), '-ac', '1', '-ar', '22050', '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
    const a = analyze(new Float32Array(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + Math.floor(pcm.byteLength / 4) * 4)), 22050);
    assert.equal(a.bpm, c.bpm, c.id + ' bpm reproduced');
    assert.ok(Math.abs(a.firstBeat - c.firstBeat) <= 0.001, c.id + ' firstBeat reproduced: ' + a.firstBeat + ' vs ' + c.firstBeat);
    assert.equal(a.accepted, true, c.id + ' accepted');
  }
}
console.log(JSON.stringify({ cues: 'ok' }));
