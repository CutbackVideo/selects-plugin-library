// plugins/archive-vlog/tests/cues.test.cjs
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), dir = path.join(root, 'assets', 'cues');
const m = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
assert.equal(m.version, 1);
assert.ok(/CC0 1\.0/.test(m.provenance) && /HoliznaCC0/.test(m.provenance) && /Free Music Archive/.test(m.provenance), 'provenance');
// The bundled cues in manifest order (the first is the default). bpm: the track's own tempo (never stretched);
// barPhase: the whole beats the build moved firstBeat by to reach the measured bar line (Before Everything: beat-detect
// locks three beats before beat 1); introStart: the bar start 8 beats before the drums arrive (dev/build-cues.cjs
// introOf, measured on the mid-band onsets: Peaceful Drift bar 3 (drums at bar 5, 16.7 s), Theta Frequency bar 2
// (bar 4, 13.7 s), Before Everything bar 1 (bar 3, 12.8 s), Fractured bar 4 (backbeat at bar 6, 20.3 s)).
const ALL = [
  // Marimba Motif (Suno, the default): no soft intro (its groove is there from bar 1), grid measured on its first 80 s.
  { id: 'marimba-motif', label: 'Marimba Motif', bpm: 71, barPhase: 2, introBar: 0, page: '', license: 'suno' },
  { id: 'peaceful-drift', label: 'Peaceful Drift', bpm: 72, barPhase: 0, introBar: 3, page: 'peaceful-drift-lofi-nostalgic-calm/' },
  { id: 'theta-frequency', label: 'Theta Frequency', bpm: 70, barPhase: 0, introBar: 2, page: 'theta-frequency-lofi-chill-calm/' },
  { id: 'before-everything', label: 'Before Everything', bpm: 75, barPhase: 3, introBar: 1, page: 'before-everything-lofi-nostalgic-mp3/' },
  { id: 'fractured', label: 'Fractured', bpm: 71, barPhase: 0, introBar: 4, page: 'fractured-1/' },
];
const { hookBars, TARGET_LUFS, CEILING_DBTP, LUFS_TOLERANCE, INTRO_BEATS } = require(path.join(root, 'dev', 'build-cues.cjs'));
assert.equal(TARGET_LUFS, -16.3);
assert.equal(INTRO_BEATS, 8);
assert.deepEqual(m.cues.map(c => c.id), ALL.map(e => e.id), 'manifest ids in order');
// Manifest <-> files <-> plugin.json: every mp3 in the folder is a manifest cue and the other way round, and the
// plugin ships exactly the manifest, the licence records and the mp3s from assets/cues.
assert.deepEqual(fs.readdirSync(dir).filter(f => f.endsWith('.mp3')).sort(), m.cues.map(c => c.file).sort());
const shipped = JSON.parse(fs.readFileSync(path.join(root, 'plugin.json'), 'utf8')).files.filter(f => f.startsWith('assets/cues/'));
assert.deepEqual(shipped.sort(), ['assets/cues/LICENSES.csv', 'assets/cues/manifest.json', ...m.cues.map(c => 'assets/cues/' + c.file)].sort());
// LICENSES.csv: one row per bundled cue, in manifest order, with its track page, the CC0 licence and the access date.
const parseCsv = text => text.trim().split('\n').map(line => {
  const cells = []; let cur = '', q = false;
  for (const ch of line) { if (ch === '"') q = !q; else if (ch === ',' && !q) { cells.push(cur); cur = ''; } else cur += ch; }
  cells.push(cur);
  return cells;
});
const [head, ...rows] = parseCsv(fs.readFileSync(path.join(dir, 'LICENSES.csv'), 'utf8'));
assert.deepEqual(head, ['bundled_file', 'file', 'title', 'author', 'source_page_url', 'download_url', 'license', 'license_url', 'verified_text_snippet', 'date_accessed']);
const csv = rows.map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
assert.deepEqual(csv.map(r => r.bundled_file), m.cues.map(c => c.file), 'LICENSES.csv rows');
const thirdParty = fs.readFileSync(path.join(root, 'THIRD_PARTY.md'), 'utf8');
assert.ok(!/ElevenLabs/.test(thirdParty), 'no generated-music text left in THIRD_PARTY.md');
for (const c of m.cues) {
  const e = ALL.find(x => x.id === c.id), P = 60 / c.bpm, bar = 4 * P;
  assert.equal(c.file, c.id + '.mp3');
  assert.equal(c.label, e.label);
  assert.equal(c.group, 'reference', c.id + ' group');
  const buf = fs.readFileSync(path.join(dir, c.file));
  assert.equal(crypto.createHash('sha256').update(buf).digest('hex'), c.sha256, c.id + ' hash');
  assert.ok(buf.length < 6 * 1024 * 1024, c.id + ' size');
  assert.ok(Math.abs(c.bpm - e.bpm) < 0.3, c.id + ' bpm ' + c.bpm);
  // firstBeat: the detected first beat moved on by barPhaseBeats whole beats to the bar line (Before Everything:
  // 0.805 s + 3 beats = 3.205 s; its music starts on a bar line at 0.005 s, a bar earlier, which the grid leaves out;
  // the detected first beat lies in the first bar).
  const lock = c.firstBeat - e.barPhase * P;
  assert.ok(lock >= -0.002 && lock < bar, c.id + ' firstBeat (detected ' + lock + ')');
  assert.equal(c.barPhaseBeats || 0, e.barPhase, c.id + ' barPhaseBeats');
  assert.ok(c.usableEnd > c.firstBeat && c.duration >= c.usableEnd, c.id + ' usableEnd');
  // -16.3 LUFS integrated (static gain + limiter) and a true peak at or under -1 dBTP.
  assert.ok(Math.abs(c.lufs - TARGET_LUFS) <= LUFS_TOLERANCE, c.id + ' lufs ' + c.lufs);
  assert.ok(typeof c.truePeak === 'number' && c.truePeak <= CEILING_DBTP, c.id + ' truePeak ' + c.truePeak);
  // Licence: CC0 1.0 from the track's Free Music Archive page, the same page as LICENSES.csv and THIRD_PARTY.md; the
  // Suno track (generated for Cutback) has no track page.
  const row = csv.find(r => r.bundled_file === c.file);
  assert.deepEqual(Object.keys(c.license).sort(), ['accessed', 'author', 'name', 'source', 'url']);
  if (e.license === 'suno') {
    assert.deepEqual(c.license, { name: 'Suno (generated for Cutback)', url: '', source: '', author: 'Suno for Cutback', accessed: '2026-10-08' });
    assert.deepEqual([row.author, row.license, row.date_accessed], ['Suno for Cutback', 'Suno (generated for Cutback)', '2026-10-08'], c.id + ' LICENSES.csv');
    assert.ok(thirdParty.includes('`' + c.file + '`'), c.id + ' in THIRD_PARTY.md');
  } else {
  assert.equal(c.license.name, 'CC0 1.0');
  assert.equal(c.license.url, 'https://creativecommons.org/publicdomain/zero/1.0/');
  assert.equal(c.license.author, 'HoliznaCC0');
  assert.equal(c.license.accessed, '2026-10-01');
  assert.equal(c.license.source, 'https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/' + e.page);
  assert.equal(row.source_page_url, c.license.source, c.id + ' LICENSES.csv page');
  assert.equal(row.author, 'HoliznaCC0');
  assert.equal(row.license, 'CC0 1.0 Universal');
  assert.equal(row.license_url, c.license.url);
  assert.equal(row.date_accessed, c.license.accessed);
  assert.ok(thirdParty.includes(c.license.source) && thirdParty.includes('`' + c.file + '`'), c.id + ' in THIRD_PARTY.md');
  }
  // introStart: a bar start (firstBeat + k bars, k = the measured bar) from which a Standard video (6 + 2 + 32 + 4 =
  // 44 beats) fits before usableEnd. introLiftLu is informational (Fractured has no soft intro before its backbeat).
  const k = (c.introStart - c.firstBeat) / bar;
  assert.ok(Math.abs(k - Math.round(k)) * bar < 0.002, c.id + ' introStart on a bar start: ' + c.introStart);
  assert.equal(Math.round(k), e.introBar, c.id + ' introStart bar');
  assert.ok(c.introStart + 44 * P <= c.usableEnd, c.id + ' Standard fits from introStart');
  assert.ok(typeof c.introLiftLu === 'number', c.id + ' introLiftLu');
  // Hook windows (kept for the planner): one score per bar start from firstBeat whose 16-beat window ends by usableEnd,
  // in [0, 1], reproduced from the manifest onsets.
  assert.equal(c.hookBars.length, Math.floor((c.usableEnd - c.firstBeat) / bar) - 3, c.id + ' hookBars length');
  assert.ok(c.hookBars.every(v => v >= 0 && v <= 1) && Math.max(...c.hookBars) >= 0.45, c.id + ' hookBars range');
  assert.deepEqual(c.hookBars, hookBars(c), c.id + ' hookBars reproduced');
  const fits = c.hookBars.map((v, b) => c.firstBeat + (4 * b + 24) * P <= c.usableEnd + 1e-9 ? v : -1), best = fits.indexOf(Math.max(...fits));
  assert.equal(c.hookStart, Math.round((c.firstBeat + 4 * best * P) * 1000) / 1000, c.id + ' hookStart');
  // downbeatConfidence follows the measured beat-1 ratio at the manifest's bar phase (high at 1.5 or more); every
  // bundled cue measures high.
  assert.equal(c.downbeatConfidence, 'high', c.id + ' downbeatConfidence');
  assert.equal(c.downbeatConfidence, c.downbeatRatio >= 1.5 ? 'high' : 'low', c.id + ' downbeatConfidence vs ratio ' + c.downbeatRatio);
  // Lo-fi grooves: no busy 16th layer.
  assert.ok(typeof c.sixteenthRatio === 'number' && c.sixteenthRatio >= 0 && c.sixteenthRatio < 0.3, c.id + ' sixteenthRatio ' + c.sixteenthRatio);
  assert.equal(c.peaks.length, 400);
  // beatEnergy is one RMS value per beat from firstBeat.
  assert.ok(c.beatEnergy.length > 40 && c.beatEnergy.length <= Math.floor((c.duration - c.firstBeat) * c.bpm / 60) + 1, c.id + ' beatEnergy');
  // Qualifying band onsets for cut snapping: [t, band, strength] sorted by time, every strength at or above its
  // band's threshold, times to the millisecond inside the cue. The cues run 2-3 minutes, so the caps are per second
  // (the Mini Vlog cues had at most 400 onsets / 6000 characters in 40-60 s).
  assert.deepEqual(Object.keys(c.onsetThresholds).sort(), ['h', 'l', 'm'], c.id + ' onset thresholds');
  for (const v of Object.values(c.onsetThresholds)) assert.ok(v >= 2 && v < 50, c.id + ' threshold ' + v);
  assert.ok(c.onsets.length >= c.duration && c.onsets.length <= 7 * c.duration, c.id + ' onsets ' + c.onsets.length);
  assert.ok(JSON.stringify(c.onsets).length < 120 * c.duration, c.id + ' onsets stay compact');
  const bands = new Set();
  c.onsets.forEach(([t, band, s], i) => {
    assert.ok(t >= 0 && t <= c.duration && Math.abs(Math.round(t * 1000) - t * 1000) < 1e-6, c.id + ' onset time ' + t);
    assert.ok(i === 0 || t >= c.onsets[i - 1][0], c.id + ' onsets sorted');
    assert.ok(['l', 'm', 'h'].includes(band), c.id + ' band ' + band);
    assert.ok(s >= c.onsetThresholds[band], c.id + ' onset ' + t + ' below its band threshold');
    bands.add(band);
  });
  assert.equal(bands.size, 3, c.id + ' has onsets in every band');
}
// From the mp3s themselves (when ffmpeg is available): beat-detect reproduces every grid and accepts it, the tempo is
// the same in both halves of the track (no tempo change), and the file measures on target.
const { execFileSync, spawnSync } = require('node:child_process');
if (spawnSync('ffmpeg', ['-version']).status === 0) {
  const { analyze } = require(path.join(root, 'beat-detect.cjs'));
  for (const c of m.cues) {
    const pcm = execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-i', path.join(dir, c.file), '-ac', '1', '-ar', '22050', '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
    // gridSeconds: a cue whose grid was measured on its first part only (Marimba Motif: 80 s).
    const full = new Float32Array(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + Math.floor(pcm.byteLength / 4) * 4));
    const x = c.gridSeconds ? full.subarray(0, Math.round(c.gridSeconds * 22050)) : full;
    if (c.gridSeconds) assert.ok(c.usableEnd <= c.gridSeconds, c.id + ' usable only where the grid was measured');
    const a = analyze(x, 22050);
    assert.equal(a.accepted, true, c.id + ' accepted');
    assert.ok(Math.abs(a.bpm - c.bpm) <= 1e-9, c.id + ' bpm reproduced: ' + a.bpm + ' vs ' + c.bpm);
    const P = 60 / c.bpm, k = Math.round((c.firstBeat - a.firstBeat) / P), fb = a.firstBeat + k * P;
    assert.equal(k, c.barPhaseBeats, c.id + ' firstBeat is the detected first beat moved by barPhaseBeats');
    assert.ok(Math.abs(fb - c.firstBeat) <= 0.002, c.id + ' firstBeat reproduced: ' + fb + ' vs ' + c.firstBeat);
    const half = x.length >> 1, b1 = analyze(x.subarray(0, half), 22050).bpm, b2 = analyze(x.subarray(half), 22050).bpm;
    assert.ok(Math.abs(b2 - b1) <= 0.1 && Math.abs(b1 - c.bpm) <= 0.1, c.id + ' no tempo change: ' + b1 + ' / ' + b2);
    const err = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-i', path.join(dir, c.file), '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr.toString();
    const sum = err.slice(err.lastIndexOf('Summary:'));
    assert.equal(Number(sum.match(/I:\s+(-?[\d.]+) LUFS/)[1]), c.lufs, c.id + ' measured lufs');
    assert.equal(Number(sum.match(/Peak:\s+(-?[\d.]+) dBFS/)[1]), c.truePeak, c.id + ' measured true peak');
    // beatEnergy is indexed in whole beats from firstBeat: it lines up with the analysis's values k beats on.
    assert.ok(Math.abs(a.beatEnergy.length - k - c.beatEnergy.length) <= 1, c.id + ' beatEnergy length');
    c.beatEnergy.forEach((v, i) => i + k < a.beatEnergy.length && assert.ok(Math.abs(a.beatEnergy[i + k] - v) < 0.03, c.id + ' beatEnergy ' + i + ' aligned with firstBeat'));
  }
}
console.log(JSON.stringify({ cues: 'ok' }));
