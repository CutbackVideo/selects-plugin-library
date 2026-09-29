// plugins/the-end-credits/tests/cues.test.cjs
// The bundled cue manifest schema, the shipped cue files, and dev/build-cues.cjs on synthetic cues generated here
// (nothing synthetic is committed).
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), { execFileSync, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'assets', 'cues');
const build = path.join(root, 'dev', 'build-cues.cjs');
const { analyzeCue, findSwell, GENERATOR } = require(build);
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const sr = 22050;

const KEYS = ['id', 'title', 'file', 'bpm', 'detectedBpm', 'firstBeat', 'phraseBeats', 'swell', 'usableEnd', 'driftBpm', 'lufs', 'durationSeconds', 'sha256', 'provenance'];
function checkEntry(c) {
  assert.deepEqual(Object.keys(c).sort(), [...KEYS].sort(), 'manifest keys of ' + c.id);
  assert.match(c.id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  assert.ok(typeof c.title === 'string' && c.title.length > 0, c.id + ' title');
  assert.equal(c.file, c.id + '.mp3');
  assert.ok(c.bpm >= 60 && c.bpm <= 66, c.id + ' felt bpm ' + c.bpm);
  assert.ok(Math.abs(c.detectedBpm - 2 * c.bpm) < 1e-9 || c.detectedBpm === c.bpm, c.id + ' detectedBpm ' + c.detectedBpm);
  assert.equal(c.phraseBeats, 4);
  const bar = c.phraseBeats * 60 / c.bpm;
  assert.ok(c.firstBeat >= 0 && c.firstBeat < 60 / c.bpm + 5, c.id + ' firstBeat ' + c.firstBeat);
  assert.ok(Math.abs(c.usableEnd - (c.durationSeconds - 0.1)) < 1e-6, c.id + ' usableEnd');
  if (c.swell !== null) {
    // On the felt-bar grid, after bar 1, inside the cue.
    const k = (c.swell - c.firstBeat) / bar;
    assert.ok(Math.round(k) >= 1 && Math.abs(c.swell - (c.firstBeat + Math.round(k) * bar)) <= 0.002, c.id + ' swell on a bar downbeat ' + c.swell);
    assert.ok(c.swell < c.usableEnd, c.id + ' swell inside the cue');
  }
  assert.ok(Math.abs(c.driftBpm) <= 1.5, c.id + ' drift ' + c.driftBpm);
  assert.ok(Math.abs(c.lufs + 14) <= 0.5, c.id + ' lufs ' + c.lufs);
  assert.match(c.sha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(Object.keys(c.provenance).sort(), ['generator', 'prompt']);
  assert.equal(c.provenance.generator, GENERATOR);
  assert.ok(typeof c.provenance.prompt === 'string' && c.provenance.prompt.length > 0, c.id + ' prompt');
}

// Integrated loudness of a file (ebur128).
const lufsOf = file => {
  const e = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-i', file, '-af', 'ebur128', '-f', 'null', '-']).stderr.toString();
  return Number((e.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop().match(/-?[\d.]+/)[0]);
};

// 1. The shipped manifest (empty until GATE-MUSIC) and its files.
const m = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
assert.deepEqual(Object.keys(m).sort(), ['cues', 'version']);
assert.equal(m.version, 1);
assert.ok(Array.isArray(m.cues));
assert.equal(new Set(m.cues.map(c => c.id)).size, m.cues.length, 'unique ids');
m.cues.forEach(checkEntry);
const mp3s = fs.readdirSync(dir).filter(f => f.endsWith('.mp3')).sort();
assert.deepEqual(mp3s, m.cues.map(c => c.file).sort(), 'every cue file is listed and every listed file exists');
for (const c of m.cues) {
  const buf = fs.readFileSync(path.join(dir, c.file));
  assert.ok(buf.length < 20 * 1024 * 1024, c.id + ' size');
  assert.equal(crypto.createHash('sha256').update(buf).digest('hex'), c.sha256, c.id + ' hash');
  if (hasFfmpeg) assert.ok(Math.abs(lufsOf(path.join(dir, c.file)) + 14) <= 0.5, c.id + ' measured loudness');
}

// 2. Synthetic cues. A pad chord (so the track has a realistic crest factor and loudnorm stays linear) and a kick +
// click on every felt beat; `ticks` adds soft 8th-note clicks between the beats; `quietBars` bars at -10 dB, then
// full level from that bar's downbeat. `bpmAt(t)` gives the tempo (constant unless testing drift).
function fixture({ bpm = 62, first = 0.25, bars = 16, quietBars = 2, ticks = false, bpmAt = null, tickFirst = false } = {}) {
  const pf = 60 / bpm, seconds = first + bars * 4 * pf + 1.5;
  const x = new Float32Array(Math.round(seconds * sr));
  const swellT = first + quietBars * 4 * pf;
  const gain = t => (t < swellT - 0.005 ? 0.316 : 1);
  for (let i = 0; i < x.length; i++) {
    const t = i / sr;
    x[i] = gain(t) * 0.45 * (Math.sin(2 * Math.PI * 220 * t) + Math.sin(2 * Math.PI * 277.18 * t) + Math.sin(2 * Math.PI * 329.63 * t)) / 3;
  }
  const hit = (t, g, kick) => {
    const i0 = Math.round(t * sr);
    for (let k = 0; k < 6000 && i0 + k < x.length; k++) {
      x[i0 + k] += g * ((kick ? 0.2 * Math.sin(2 * Math.PI * (55 + 60 * Math.exp(-k / 400)) * k / sr) * Math.exp(-k / 3000) : 0) +
        (kick ? 0.1 : 0.03) * Math.sin(2 * Math.PI * 1000 * k / sr) * Math.exp(-k / 80));
    }
  };
  const beats = [];
  for (let t = first; t < seconds - 1; t += 60 / (bpmAt ? bpmAt(t) : bpm)) beats.push(t);
  if (tickFirst) hit(first - pf / 2, gain(first - pf / 2), false);
  beats.forEach((t, i) => { hit(t, gain(t), true); if (ticks && i + 1 < beats.length) hit((t + beats[i + 1]) / 2, gain(t), false); });
  return { x, beats, swellT };
}

// 2a. Pure maths (no ffmpeg). The detector reads 62 bpm as 124; the build halves it and keeps the kick parity.
{
  const { x } = fixture({ bars: 12 });
  const g = analyzeCue(x, sr);
  assert.deepEqual(g.problems, []);
  assert.ok(Math.abs(g.detectedBpm - 124) < 1, 'detected double-time ' + g.detectedBpm);
  assert.equal(g.bpm, g.detectedBpm / 2);
  assert.ok(Math.abs(g.bpm - 62) <= 0.5, 'felt bpm ' + g.bpm);
  assert.ok(Math.abs(g.firstBeat - 0.25) < 0.02, 'firstBeat ' + g.firstBeat);
  assert.ok(Math.abs(g.driftBpm) <= 0.1, 'drift ' + g.driftBpm);
}
// Soft 8th-note ticks between the kicks, and the track opens on a tick: the detector's first sounding line is the
// tick, and the parity check moves the felt first beat onto the kick.
{
  const { x } = fixture({ bars: 12, first: 0.25 + 30 / 62, ticks: true, tickFirst: true });
  const g = analyzeCue(x, sr);
  assert.deepEqual(g.problems, []);
  assert.ok(g.parity[0] !== g.parity[1], 'parities differ ' + g.parity);
  assert.ok(Math.abs(g.firstBeat - (0.25 + 30 / 62)) < 0.02, 'felt first beat on the kick, not the tick: ' + g.firstBeat);
  assert.ok(Math.abs(g.bpm - 62) <= 0.5, 'felt bpm with ticks ' + g.bpm);
}
// A cue whose tempo moves from 62 to 64 bpm half way is rejected for drift.
{
  const { x } = fixture({ bars: 16, bpmAt: t => (t < 31 ? 62 : 64) });
  const g = analyzeCue(x, sr);
  assert.ok(Math.abs(g.driftBpm) > 1.5, 'drift detected ' + g.driftBpm);
  assert.ok(g.problems.some(p => /drift/.test(p)), 'drift rejects: ' + g.problems);
}
// A tempo outside the felt 60-66 range is rejected.
{
  const { x } = fixture({ bpm: 90, bars: 10 });
  assert.ok(analyzeCue(x, sr).problems.some(p => /not a 60-66 bpm cue/.test(p)), '90 bpm rejected');
}
// findSwell on a short-term series: -30 LU for the intro, -20 from 10 s (S at t covers [t - 3, t]).
{
  const series = [];
  for (let t = 0.1; t < 40; t += 0.1) { t = Math.round(t * 10) / 10; series.push({ t, S: t < 3 ? -120.7 : t < 13 ? -30 : -20 }); }
  // bpm 60, firstBeat 2 -> bars at 2, 6, 10, 14: the window from 10 s is the first at >= +6 LU.
  assert.equal(findSwell(series, 2, 60), 10);
  // A rise of only 5 LU is no swell.
  assert.equal(findSwell(series.map(p => ({ t: p.t, S: p.S === -20 ? -25 : p.S })), 2, 60), null);
}

// 2b. End to end through ffmpeg: build-cues.cjs on a 62 bpm cue with 2 quiet bars, into a temp folder.
if (hasFfmpeg) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tec-cues-'));
  try {
    const bpm = 62, first = 0.25;
    const { x, swellT } = fixture({ bpm, first, bars: 16 });
    const raw = path.join(tmp, 'fixture.f32');
    fs.writeFileSync(raw, Buffer.from(x.buffer));
    execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-f', 'f32le', '-ar', String(sr), '-ac', '1', '-i', raw, '-b:a', '192k', path.join(tmp, 'fixture.mp3')]);
    const drifting = fixture({ bpm, first, bars: 16, bpmAt: t => (t < 31 ? 62 : 64) }).x;
    fs.writeFileSync(raw, Buffer.from(drifting.buffer));
    execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-f', 'f32le', '-ar', String(sr), '-ac', '1', '-i', raw, '-b:a', '192k', path.join(tmp, 'drifting.mp3')]);
    fs.writeFileSync(path.join(tmp, 'cues.json'), JSON.stringify([
      { id: 'synthetic-swell', title: 'Synthetic Swell', source: 'fixture.mp3', prompt: 'test fixture: 62 bpm kick and pad, 2 quiet bars' },
      { id: 'synthetic-drift', title: 'Synthetic Drift', source: 'drifting.mp3', prompt: 'test fixture: 62 to 64 bpm' },
    ]));
    const out = path.join(tmp, 'out');
    const r = spawnSync('node', [build, '--out', out, path.join(tmp, 'cues.json')]);
    assert.equal(r.status, 2, 'one cue rejected -> exit 2\n' + r.stderr);
    assert.match(r.stderr.toString(), /synthetic-drift REJECTED: .*drift/);
    const built = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
    assert.equal(built.version, 1);
    assert.deepEqual(built.cues.map(c => c.id), ['synthetic-swell']);
    assert.deepEqual(fs.readdirSync(out).filter(f => f.endsWith('.mp3')), ['synthetic-swell.mp3'], 'no mp3 for the rejected cue');
    const c = built.cues[0];
    checkEntry(c);
    assert.ok(Math.abs(c.bpm - 62) <= 0.5, 'bpm ' + c.bpm);
    assert.ok(Math.abs(c.detectedBpm - 124) <= 1, 'detectedBpm ' + c.detectedBpm);
    // mp3 encoder delay shifts the audio by a few ms; the first beat stays within 30 ms of the first kick.
    assert.ok(Math.abs(c.firstBeat - first) < 0.03, 'firstBeat ' + c.firstBeat);
    assert.ok(Math.abs(c.swell - swellT) <= 0.1, 'swell ' + c.swell + ' vs bar 3 downbeat ' + swellT.toFixed(3));
    assert.ok(Math.abs(c.driftBpm) <= 0.1, 'drift ' + c.driftBpm);
    assert.ok(Math.abs(lufsOf(path.join(out, c.file)) + 14) <= 0.5, 'measured loudness');
    assert.equal(c.provenance.prompt, 'test fixture: 62 bpm kick and pad, 2 quiet bars');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
} else {
  console.log('ffmpeg not found: skipped the end-to-end build-cues check');
}
console.log(JSON.stringify({ cues: 'ok', shipped: m.cues.length, endToEnd: hasFfmpeg }));
