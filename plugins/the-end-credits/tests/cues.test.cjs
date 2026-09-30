// plugins/the-end-credits/tests/cues.test.cjs
// The bundled cue manifest schema, the shipped cue files, and dev/build-cues.cjs on synthetic cues generated here
// (nothing synthetic is committed).
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), { execFileSync, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'assets', 'cues');
const build = path.join(root, 'dev', 'build-cues.cjs');
const { analyzeCue, findSwell, findSwellFallback, GENERATOR, TARGET_LUFS, MAX_TRUE_PEAK } = require(build);
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const sr = 22050;

const KEYS = ['id', 'title', 'file', 'bpm', 'sourceBpm', 'detectedBpm', 'firstBeat', 'phraseBeats', 'swell', 'swellSource', 'swellFallback', 'usableEnd', 'driftBpm', 'lufs',
  'truePeak', 'durationSeconds', 'sha256', 'provenance'];
function checkEntry(c) {
  // `default: true` marks the panel's default cue; it is absent on the others.
  assert.deepEqual(Object.keys(c).filter(k => k !== 'default').sort(), [...KEYS].sort(), 'manifest keys of ' + c.id);
  if ('default' in c) assert.equal(c.default, true, c.id + ' default is true or absent');
  assert.match(c.id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  assert.ok(typeof c.title === 'string' && c.title.length > 0, c.id + ' title');
  assert.equal(c.file, c.id + '.mp3');
  // Felt 60-66 bpm; the build halves detector readings in [119.5, 132.5] (a nominal 60 bpm cue reads 119.95).
  assert.ok(c.bpm >= 59.75 && c.bpm <= 66.25, c.id + ' felt bpm ' + c.bpm);
  assert.ok(c.sourceBpm >= 59.75 && c.sourceBpm <= 66.25, c.id + ' source felt bpm ' + c.sourceBpm);
  assert.ok(Math.abs(c.detectedBpm - 2 * c.bpm) < 1e-9, c.id + ' detectedBpm ' + c.detectedBpm);
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
  assert.ok(['auto', 'manual'].includes(c.swellSource), c.id + ' swellSource');
  if (c.swellSource === 'manual') assert.equal(typeof c.swell, 'number', c.id + ' manual swell is a number');
  // The fallback anchor is always there: a bar downbeat at or after the 5.1 s lead-in whose phrase fits the cue.
  assert.ok(typeof c.swellFallback === 'number', c.id + ' swellFallback');
  const kf = Math.round((c.swellFallback - c.firstBeat) / bar);
  assert.ok(kf >= 1 && Math.abs(c.swellFallback - (c.firstBeat + kf * bar)) <= 0.002, c.id + ' swellFallback on a bar downbeat ' + c.swellFallback);
  assert.ok(c.swellFallback >= 5.1 - 1e-9 && c.swellFallback + bar <= c.usableEnd + 1e-6, c.id + ' swellFallback range ' + c.swellFallback);
  assert.ok(Math.abs(c.driftBpm) <= 1.5, c.id + ' drift ' + c.driftBpm);
  // Mastered to -12.5 LUFS with a true peak at or below -1.2 dBTP (the gate allows -1.0).
  assert.equal(TARGET_LUFS, -12.5); assert.equal(MAX_TRUE_PEAK, -1.2);
  assert.ok(Math.abs(c.lufs + 12.5) <= 0.5, c.id + ' lufs ' + c.lufs);
  assert.ok(c.truePeak <= -1.0, c.id + ' true peak ' + c.truePeak);
  assert.match(c.sha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(Object.keys(c.provenance).sort(), ['generator', 'prompt']);
  assert.equal(c.provenance.generator, GENERATOR);
  assert.ok(typeof c.provenance.prompt === 'string' && c.provenance.prompt.length > 0, c.id + ' prompt');
}

// Integrated loudness and true peak of a file (ebur128).
const loudnessOf = file => {
  const e = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr.toString();
  return { lufs: Number((e.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop().match(/-?[\d.]+/)[0]),
    truePeak: Number((e.match(/Peak:\s+(-?[\d.]+|-inf) dBFS/g) || []).pop().match(/-?[\d.]+|-inf/)[0]) };
};
const lufsOf = file => loudnessOf(file).lufs;

// 1. The shipped manifest (empty until GATE-MUSIC) and its files.
const m = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
assert.deepEqual(Object.keys(m).sort(), ['cues', 'version']);
assert.equal(m.version, 1);
assert.ok(Array.isArray(m.cues));
assert.equal(new Set(m.cues.map(c => c.id)).size, m.cues.length, 'unique ids');
m.cues.forEach(checkEntry);
if (m.cues.length) assert.equal(m.cues.filter(c => c.default).length, 1, 'exactly one default cue');
// The bundled set (GATE-MUSIC, 2026-09-30): ids, nominal source tempo, and the default. Since the similarity wave
// (2026-09-30) every cue is time-stretched to the reference's felt 61.5 bpm (a 3.90 s phrase of 4 beats).
const NOMINAL = { 'piano-strings': 62, 'rhodes-soul': 64, 'post-rock': 66, orchestral: 60, 'dream-synth': 65 };
const TARGET_BPM = 61.5;
assert.deepEqual(m.cues.map(c => c.id), Object.keys(NOMINAL));
for (const c of m.cues) {
  assert.ok(Math.abs(c.sourceBpm - NOMINAL[c.id]) <= 0.5, c.id + ' source bpm ' + c.sourceBpm + ' vs nominal ' + NOMINAL[c.id]);
  assert.ok(Math.abs(c.bpm - TARGET_BPM) <= 0.3, c.id + ' stretched felt bpm ' + c.bpm);
  // Standard = L 5.1 + 7 phrases + T 0.5, like the reference's 32.97 s.
  const standard = 5.1 + 7 * c.phraseBeats * 60 / c.bpm + 0.5;
  assert.ok(Math.abs(standard - 32.9) <= 0.1, c.id + ' Standard lasts ' + standard.toFixed(3) + ' s');
}
assert.deepEqual(m.cues.filter(c => c.default).map(c => c.id), ['post-rock']);
// Anchor rulings (2026-09-30), set in source seconds in dev/cues-input.json and mapped through the stretch:
// post-rock at the full-band entry (bar 4), orchestral at the start of the rise, piano (flat) early at bar 3, rhodes
// at its measured v1.2 swell (bar 9; after mastering its rise reads under 6 LU, so it is pinned). dream-synth has no
// swell (null), so its fallback anchors it.
if (m.cues.length) {
  const src = Object.fromEntries(m.cues.map(c => [c.id, c.swellSource]));
  assert.deepEqual(src, { 'piano-strings': 'manual', 'rhodes-soul': 'manual', 'post-rock': 'manual', orchestral: 'manual', 'dream-synth': 'auto' });
  const byId = Object.fromEntries(m.cues.map(c => [c.id, c]));
  const barOf = c => 4 * 60 / c.bpm;
  const atBar = (id, bar) => Math.abs(byId[id].swell - (byId[id].firstBeat + (bar - 1) * barOf(byId[id]))) <= 0.002;
  assert.ok(atBar('post-rock', 4), 'post-rock swell at bar 4 of the grid');
  // The v1.2 anchor 14.577 s at 66 bpm, in stretched time.
  assert.ok(Math.abs(byId['post-rock'].swell - 14.577 * byId['post-rock'].sourceBpm / byId['post-rock'].bpm) <= 0.02, 'post-rock swell ' + byId['post-rock'].swell);
  assert.equal(byId.orchestral.swell, byId.orchestral.swellFallback, 'orchestral swell on the start of the rise');
  assert.ok(atBar('piano-strings', 3), 'piano swell at bar 3');
  assert.ok(atBar('rhodes-soul', 9), 'rhodes swell at bar 9');
  assert.equal(byId['dream-synth'].swell, null);
}
const mp3s = fs.readdirSync(dir).filter(f => f.endsWith('.mp3')).sort();
assert.deepEqual(mp3s, m.cues.map(c => c.file).sort(), 'every cue file is listed and every listed file exists');
for (const c of m.cues) {
  const buf = fs.readFileSync(path.join(dir, c.file));
  assert.ok(buf.length < 20 * 1024 * 1024, c.id + ' size');
  assert.equal(crypto.createHash('sha256').update(buf).digest('hex'), c.sha256, c.id + ' hash');
  if (hasFfmpeg) {
    const l = loudnessOf(path.join(dir, c.file));
    assert.ok(Math.abs(l.lufs + 12.5) <= 0.5, c.id + ' measured loudness ' + l.lufs);
    assert.ok(l.truePeak <= -1.0, c.id + ' measured true peak ' + l.truePeak);
  }
}

// 2. Synthetic cues. A pad chord (so the track has a realistic crest factor and loudnorm stays linear) and a kick +
// click on every felt beat; `ticks` adds soft 8th-note clicks between the beats; `quietBars` bars at -10 dB, then
// full level from that bar's downbeat. `bpmAt(t)` gives the tempo (constant unless testing drift).
// `kick: false` leaves only the 1 kHz clicks (no low band), louder on the beats than the ticks.
function fixture({ bpm = 62, first = 0.25, bars = 16, quietBars = 2, ticks = false, bpmAt = null, tickFirst = false, kick: withKick = true } = {}) {
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
      x[i0 + k] += g * ((kick && withKick ? 0.2 * Math.sin(2 * Math.PI * (55 + 60 * Math.exp(-k / 400)) * k / sr) * Math.exp(-k / 3000) : 0) +
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
  assert.equal(g.parity.basis, 'low', 'the kick decides: ' + JSON.stringify(g.parity));
  assert.equal(g.parity.line, 1, 'detector beat 1 (the kick) is the felt beat: ' + JSON.stringify(g.parity));
  assert.ok(Math.abs(g.firstBeat - (0.25 + 30 / 62)) < 0.02, 'felt first beat on the kick, not the tick: ' + g.firstBeat);
  assert.ok(Math.abs(g.bpm - 62) <= 0.5, 'felt bpm with ticks ' + g.bpm);
}
// Without a low band (clicks only, louder on the beats) the broadband onset envelope decides the same way.
{
  const { x } = fixture({ bars: 12, first: 0.25 + 30 / 62, ticks: true, tickFirst: true, kick: false });
  const g = analyzeCue(x, sr);
  assert.deepEqual(g.problems, []);
  assert.ok(Math.abs(g.firstBeat - (0.25 + 30 / 62)) < 0.02, 'felt first beat on the loud click: ' + g.firstBeat + ' ' + JSON.stringify(g.parity));
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

// findSwellFallback on a short-term series (S at t covers [t - 3, t]). bpm 60, firstBeat 1: bar downbeats 1, 5, 9,
// 13, ...; a phrase's loudness is the mean S over t in [d + 3, d + 4]. The biggest rise (+10 LU into the phrase at
// 5 s) is before the 5.1 s lead-in, so the anchor is the +4 LU rise into the phrase at 13 s.
{
  const series = [];
  for (let i = 1; i < 400; i++) { const t = i / 10; series.push({ t, S: t < 3 ? -120.7 : t < 8 ? -40 : t < 16 ? -30 : -26 }); }
  assert.equal(findSwellFallback(series, 1, 60, 39.9), 13);
  // Ties go to the first: a flat track anchors on the first allowed downbeat (9 s: 5 s is before the lead-in).
  assert.equal(findSwellFallback(series.map(p => ({ t: p.t, S: p.t < 3 ? p.S : -20 })), 1, 60, 39.9), 9);
  assert.equal(findSwellFallback(series, 1, 60, 12), null, 'no phrase fits');
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
      { id: 'synthetic-swell', title: 'Synthetic Swell', source: 'fixture.mp3', prompt: 'test fixture: 62 bpm kick and pad, 2 quiet bars', default: true },
      { id: 'synthetic-drift', title: 'Synthetic Drift', source: 'drifting.mp3', prompt: 'test fixture: 62 to 64 bpm' },
      // A manual swell near the bar-4 downbeat (first + 12 beats = 11.863 s) snaps onto it.
      { id: 'synthetic-manual', title: 'Synthetic Manual', source: 'fixture.mp3', prompt: 'test fixture: manual swell', swell: 12.3 },
    ]));
    const out = path.join(tmp, 'out');
    const r = spawnSync('node', [build, '--out', out, path.join(tmp, 'cues.json')]);
    assert.equal(r.status, 2, 'one cue rejected -> exit 2\n' + r.stderr);
    assert.match(r.stderr.toString(), /synthetic-drift REJECTED: .*drift/);
    const built = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
    assert.equal(built.version, 1);
    assert.deepEqual(built.cues.map(c => c.id), ['synthetic-swell', 'synthetic-manual']);
    assert.deepEqual(fs.readdirSync(out).filter(f => f.endsWith('.mp3')).sort(), ['synthetic-manual.mp3', 'synthetic-swell.mp3'], 'no mp3 for the rejected cue');
    const manual = built.cues[1];
    checkEntry(manual);
    assert.equal(manual.swellSource, 'manual');
    assert.ok(Math.abs(manual.swell - (manual.firstBeat + 3 * 4 * 60 / manual.bpm)) <= 0.002, 'manual swell snapped to bar 4: ' + manual.swell);
    assert.equal(manual.swellFallback, built.cues[0].swellFallback, 'fallback still measured');
    const c = built.cues[0];
    checkEntry(c);
    assert.equal(c.default, true, 'default flag carried');
    assert.equal(c.swellSource, 'auto');
    assert.ok(Math.abs(c.bpm - 62) <= 0.5, 'bpm ' + c.bpm);
    assert.ok(Math.abs(c.detectedBpm - 124) <= 1, 'detectedBpm ' + c.detectedBpm);
    // mp3 encoder delay shifts the audio by a few ms; the first beat stays within 30 ms of the first kick.
    assert.ok(Math.abs(c.firstBeat - first) < 0.03, 'firstBeat ' + c.firstBeat);
    assert.ok(Math.abs(c.swell - swellT) <= 0.1, 'swell ' + c.swell + ' vs bar 3 downbeat ' + swellT.toFixed(3));
    assert.ok(Math.abs(c.swellFallback - swellT) <= 0.1, 'swellFallback ' + c.swellFallback);
    assert.ok(Math.abs(c.driftBpm) <= 0.1, 'drift ' + c.driftBpm);
    assert.ok(Math.abs(lufsOf(path.join(out, c.file)) + 12.5) <= 0.5, 'measured loudness');
    assert.ok(Math.abs(c.sourceBpm - c.bpm) <= 0.05, 'no targetBpm: not stretched');
    assert.equal(c.provenance.prompt, 'test fixture: 62 bpm kick and pad, 2 quiet bars');

    // The { targetBpm, cues } form: the 62 bpm fixture stretched to 61.5 (rubberband, pitch kept). A manual swell is
    // in source seconds (12.3 s, near the bar-4 downbeat) and lands on bar 4 of the stretched grid.
    fs.writeFileSync(path.join(tmp, 'stretch.json'), JSON.stringify({ targetBpm: 61.5, cues: [
      { id: 'synthetic-stretch', title: 'Synthetic Stretch', source: 'fixture.mp3', prompt: 'test fixture: stretched', swell: 12.3 }] }));
    const out2 = path.join(tmp, 'out2');
    const r2 = spawnSync('node', [build, '--out', out2, path.join(tmp, 'stretch.json')]);
    assert.equal(r2.status, 0, 'stretched build\n' + r2.stderr);
    const st = JSON.parse(fs.readFileSync(path.join(out2, 'manifest.json'), 'utf8')).cues[0];
    checkEntry(st);
    assert.ok(Math.abs(st.sourceBpm - 62) <= 0.3, 'sourceBpm ' + st.sourceBpm);
    assert.ok(Math.abs(st.bpm - 61.5) <= 0.3, 'stretched bpm ' + st.bpm);
    const ratio = st.sourceBpm / st.bpm;
    assert.ok(Math.abs(st.durationSeconds - c.durationSeconds * ratio) <= 0.1, 'duration scaled by the stretch: ' + st.durationSeconds);
    assert.ok(Math.abs(st.firstBeat - first * ratio) < 0.03, 'firstBeat mapped: ' + st.firstBeat);
    assert.equal(st.swellSource, 'manual');
    assert.ok(Math.abs(st.swell - (st.firstBeat + 3 * 4 * 60 / st.bpm)) <= 0.002, 'source-time swell snapped to bar 4 of the stretched grid: ' + st.swell);
    const l2 = loudnessOf(path.join(out2, st.file));
    assert.ok(Math.abs(l2.lufs + 12.5) <= 0.5 && l2.truePeak <= -1.0, 'stretched loudness ' + JSON.stringify(l2));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
} else {
  console.log('ffmpeg not found: skipped the end-to-end build-cues check');
}
console.log(JSON.stringify({ cues: 'ok', shipped: m.cues.length, endToEnd: hasFfmpeg }));
