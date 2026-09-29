// plugins/city-weekend-vlog/tests/beat-detect.test.cjs
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

const b = analyze(clickTrack(66, 0.2, 30), sr);          // below range: resolved to double tempo
assert.ok(Math.abs(b.bpm - 132) < 0.3 || Math.abs(b.bpm - 66) < 0.2, 'bpm ' + b.bpm);

let seed = 1; const rnd = () => ((seed = Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296;
const noise = Float32Array.from({ length: 20 * sr }, () => (rnd() - 0.5) * 0.2);
assert.equal(analyze(noise, sr).accepted, false);

// CLI round trip.
const tmp = path.join(require('node:os').tmpdir(), 'cwv-beat-test.f32');
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

console.log(JSON.stringify({ beatDetect: 'ok' }));
