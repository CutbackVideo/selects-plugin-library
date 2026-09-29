// plugins/city-weekend-vlog/tests/cues.test.cjs
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const dir = path.resolve(__dirname, '..', 'assets', 'cues');
const m = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
assert.equal(m.version, 1);
assert.deepEqual(m.cues.map(c => c.id), ['sunny-soul-strut', 'golden-hour-disco', 'easy-sunday-lofi', 'weekend-indie-pop']);
const expected = { 'sunny-soul-strut': 99, 'golden-hour-disco': 104, 'easy-sunday-lofi': 88, 'weekend-indie-pop': 112 };
for (const c of m.cues) {
  const buf = fs.readFileSync(path.join(dir, c.file));
  assert.equal(crypto.createHash('sha256').update(buf).digest('hex'), c.sha256, c.id + ' hash');
  assert.ok(buf.length < 20 * 1024 * 1024);
  assert.ok(Math.abs(c.bpm - expected[c.id]) < 0.3, c.id + ' bpm ' + c.bpm);
  assert.ok(c.firstBeat >= 0 && c.firstBeat < 0.05, c.id + ' firstBeat');
  assert.ok(Math.abs(c.lufs + 14) <= 1, c.id + ' lufs ' + c.lufs);
  // The longest video (12 montage shots) must fit from the start of the cue.
  assert.ok(c.firstBeat + (8 + 24) * 60 / c.bpm <= c.usableEnd, c.id + ' fits long');
  // The 16th-onset ratio measured by beat-detect.cjs decides the title burst.
  assert.ok(typeof c.sixteenthRatio === 'number' && c.sixteenthRatio >= 0 && c.sixteenthRatio < 2, c.id + ' sixteenthRatio');
  assert.equal(c.peaks.length, 400);
  assert.ok(c.beatEnergy.length > 40);
  assert.ok(c.duration >= c.usableEnd);
}
// Measured on the bundled cues: only Sunny Soul Strut has a clear enough 16th pulse for the 16th burst.
assert.deepEqual(m.cues.map(c => c.sixteenthRatio >= 0.35), [true, false, false, false]);
console.log(JSON.stringify({ cues: 'ok' }));
