// plugins/selfie-aesthetic/tests/cues.test.cjs (run: node plugins/selfie-aesthetic/tests/cues.test.cjs)
// The bundled cues and their manifest (built by dev/build-cues.cjs). The audio checks need ffmpeg on PATH.
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'assets', 'cues');
const m = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const { CUES } = require(path.join(root, 'dev', 'build-cues.cjs'));

assert.equal(m.version, 1);
const ids = ['make-funk', 'day-trips', 'sensual-melancholia', 'pantheon'];
assert.deepEqual(m.cues.map(c => c.id), ids);
assert.deepEqual(CUES.map(c => c.id), ids, 'build table and manifest list the same cues');
// Every mp3 in the folder is in the manifest, and every manifest file exists.
assert.deepEqual(fs.readdirSync(dir).filter(f => f.endsWith('.mp3')).sort(), m.cues.map(c => c.file).sort());
// The manifest stays one line (the panel reads it whole).
assert.equal(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8').trim().split('\n').length, 1);

const CC0_URL = 'https://creativecommons.org/publicdomain/zero/1.0/';
for (const c of m.cues) {
  const t = CUES.find(k => k.id === c.id);
  assert.equal(c.file, c.id + '.mp3');
  const buf = fs.readFileSync(path.join(dir, c.file));
  assert.equal(crypto.createHash('sha256').update(buf).digest('hex'), c.sha256, c.id + ' hash');
  assert.ok(buf.length < 3 * 1024 * 1024, c.id + ' size ' + buf.length);
  // Provenance: every field present, CC0 1.0, the page's own licence line, the access date.
  const p = c.provenance;
  for (const k of ['title', 'author', 'sourceUrl', 'downloadUrl', 'licence', 'licenceUrl', 'licenceLine', 'accessed', 'excerpt'])
    assert.ok(p[k] != null && p[k] !== '', c.id + ' provenance.' + k);
  assert.equal(p.licence, 'CC0 1.0 Universal', c.id + ' licence');
  assert.equal(p.licenceUrl, CC0_URL, c.id + ' licence url');
  assert.equal(p.accessed, '2026-10-01', c.id + ' accessed');
  assert.equal(p.licenceLine, `${c.title} by ${c.author} is licensed under a CC0 1.0 Universal License.`, c.id + ' licence line');
  assert.ok(/^https:\/\/freemusicarchive\.org\/music\//.test(p.sourceUrl), c.id + ' source url');
  assert.ok(/^https:\/\/files\.freemusicarchive\.org\/.+\.mp3$/.test(p.downloadUrl), c.id + ' download url');
  assert.equal(p.title, c.title); assert.equal(p.author, c.author);
  assert.deepEqual(p.excerpt, { start: t.start, length: 65, fadeIn: 0.5, fadeOut: 2 }, c.id + ' excerpt recorded');
  assert.ok(/native tempo and pitch/.test(p.processing), c.id + ' processing note');
  // Grid and measurements.
  assert.ok(c.bpm >= 85 && c.bpm <= 110, c.id + ' bpm ' + c.bpm);
  assert.equal(c.grid, 'accepted', c.id + ' grid');
  assert.ok(c.firstBeat >= 0 && c.firstBeat < 60 / c.bpm + 0.5, c.id + ' firstBeat ' + c.firstBeat);
  assert.ok(typeof c.sixteenthRatio === 'number' && c.sixteenthRatio >= 0, c.id + ' sixteenthRatio');
  assert.ok(Math.abs(c.durationSeconds - 65) < 0.1, c.id + ' duration ' + c.durationSeconds);
  assert.ok(Math.abs(c.lufs + 10.5) <= 0.5, c.id + ' manifest lufs ' + c.lufs);
  assert.ok(c.truePeak <= -0.9, c.id + ' manifest true peak ' + c.truePeak);
  assert.ok(typeof c.lra === 'number' && c.lra >= 0 && c.lra < 6, c.id + ' lra ' + c.lra);
  const P = 60 / c.bpm, d = c.downbeat;
  assert.ok([0, 1, 2, 3].includes(d.phase) && d.ratio > 0, c.id + ' downbeat');
  assert.equal(d.confidence, d.ratio >= 1.5 ? 'high' : 'low', c.id + ' downbeat confidence');
  assert.ok(Math.abs(d.firstBar - (c.firstBeat + d.phase * P)) < 0.002, c.id + ' downbeat firstBar');
  // Default section: on a bar line of the downbeat, after the fade-in, leaving 48 beats before the fade-out.
  assert.equal(typeof c.defaultSection, 'number');
  const bars = (c.defaultSection - d.firstBar) / (4 * P);
  assert.ok(bars >= 0 && Math.abs(bars - Math.round(bars)) * 4 * P < 0.002, c.id + ' defaultSection on a bar: ' + c.defaultSection);
  assert.ok(c.defaultSection >= 0.5 && c.defaultSection + 48 * P <= c.durationSeconds - 2, c.id + ' defaultSection room ' + c.defaultSection);
  assert.equal(c.peaks.length, 400);
  assert.ok(c.beatEnergy.length > 90, c.id + ' beatEnergy');
}
// No absolute home-directory paths in the committed build files.
for (const f of [path.join(dir, 'manifest.json'), path.join(root, 'dev', 'build-cues.cjs')])
  assert.ok(!/\/Users\/|\/home\/|[A-Z]:\\\\Users/.test(fs.readFileSync(f, 'utf8')), path.basename(f) + ' has an absolute path');

// Audio checks: loudness and true peak (ebur128), and the plugin's beat-detect reproduces the manifest grid with no
// tempo change between the halves.
if (spawnSync('ffmpeg', ['-version']).status === 0) {
  const { analyze } = require(path.join(root, 'beat-detect.cjs'));
  const decode = file => {
    const pcm = execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-i', file, '-ac', '1', '-ar', '22050', '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
    return new Float32Array(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + Math.floor(pcm.byteLength / 4) * 4));
  };
  for (const c of m.cues) {
    const file = path.join(dir, c.file);
    const s = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr.toString();
    const sum = s.slice(s.lastIndexOf('Summary:'));
    const lufs = Number(sum.match(/I:\s+(-?[\d.]+) LUFS/)[1]), tp = Number(sum.match(/Peak:\s+(-?[\d.]+) dBFS/)[1]);
    assert.ok(Math.abs(lufs + 10.5) <= 0.5, c.id + ' measured lufs ' + lufs);
    assert.ok(tp <= -0.9, c.id + ' measured true peak ' + tp + ' dBTP');
    const x = decode(file);
    const a = analyze(x, 22050, { phaseBeats: c.phaseBeats || 0 });
    assert.ok(Math.abs(a.bpm - c.bpm) <= 0.5, c.id + ' detector bpm ' + a.bpm + ' vs ' + c.bpm);
    assert.ok(Math.abs(a.firstBeat - c.firstBeat) <= 0.001, c.id + ' detector firstBeat ' + a.firstBeat + ' vs ' + c.firstBeat);
    assert.equal(a.grid, 'accepted', c.id + ' detector grid');
    const half = Math.floor(x.length / 2);
    const b1 = analyze(x.subarray(0, half), 22050).bpm, b2 = analyze(x.subarray(half), 22050).bpm;
    assert.ok(Math.abs(b2 - b1) < 0.5, c.id + ' tempo change between halves: ' + b1 + ' -> ' + b2);
  }
} else {
  console.log('cues.test: ffmpeg not on PATH, skipping the loudness, true-peak and detector checks');
}
console.log(JSON.stringify({ cues: 'ok' }));
