// plugins/summer-trip/tests/sfx.test.cjs
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const dir = path.resolve(__dirname, '..', 'sfx');
const m = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));

assert.deepEqual(Object.keys(m), ['shutter-1', 'shutter-2', 'shutter-3', 'shutter-4', 'whoosh-1']);
const CC0_URL = /https:\/\/freesound\.org\/people\/[^/\s]+\/sounds\/\d+\/ \(CC0 1\.0\)/;
const listed = new Set();
for (const [key, s] of Object.entries(m)) {
  assert.equal(s.file, key + '.wav', key + ' file');
  listed.add(s.file + '.b64');
  const b64 = fs.readFileSync(path.join(dir, s.file + '.b64'), 'utf8');
  assert.ok(b64.split('\n').every(l => l.length <= 76), key + ' 76-column base64');
  const wav = Buffer.from(b64, 'base64');
  assert.equal(crypto.createHash('sha256').update(wav).digest('hex'), s.sha256, key + ' sha256 of the decoded WAV');
  // 16-bit PCM stereo 44.1 kHz, canonical 44-byte header.
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
  assert.deepEqual([wav.readUInt16LE(20), wav.readUInt16LE(22), wav.readUInt32LE(24), wav.readUInt16LE(34)], [1, 2, 44100, 16], key + ' format');
  assert.equal(wav.toString('ascii', 36, 40), 'data');
  const frames = wav.readUInt32LE(40) / 4;
  assert.equal(wav.length, 44 + frames * 4, key + ' data size');
  assert.ok(Math.abs(s.duration - frames / 44100) < 0.001, key + ' duration');
  // Peak at -3 dBFS, no DC, faded ends.
  let peak = 0, sum = 0;
  for (let i = 0; i < frames * 2; i++) { const v = wav.readInt16LE(44 + 2 * i) / 32767; peak = Math.max(peak, Math.abs(v)); sum += v; }
  assert.ok(Math.abs(20 * Math.log10(peak) + 3) < 0.05, key + ' peak ' + (20 * Math.log10(peak)).toFixed(2) + ' dBFS');
  assert.ok(Math.abs(sum / (frames * 2)) < 0.002, key + ' DC');
  for (const i of [0, frames - 1]) assert.ok(Math.abs(wav.readInt16LE(44 + 4 * i)) <= 2 && Math.abs(wav.readInt16LE(46 + 4 * i)) <= 2, key + ' faded end at frame ' + i);
  assert.ok(s.onsetSeconds >= 0 && s.onsetSeconds < s.soundSeconds && s.soundSeconds < s.duration, key + ' onset < sound end < duration');
  if (s.peakSeconds != null) assert.ok(s.peakSeconds > s.onsetSeconds && s.peakSeconds < s.soundSeconds, key + ' peakSeconds inside the sound');
  // Every note names its Freesound source URL and CC0.
  assert.match(s.note, CC0_URL, key + ' note names a CC0 Freesound URL');
}
assert.equal(typeof m['whoosh-1'].peakSeconds, 'number', 'whoosh records its loudest point');
assert.match(m['whoosh-1'].note, /xkeril\/sounds\/701104\/.*HQ preview of the CC0 original/);
for (let n = 1; n <= 4; n++) assert.match(m['shutter-' + n].note, /yfjesse\/sounds\/579883\//);
// Nothing else in sfx/.
assert.deepEqual(fs.readdirSync(dir).filter(f => f !== 'manifest.json').sort(), [...listed].sort());
console.log(JSON.stringify({ sfx: 'ok' }));
