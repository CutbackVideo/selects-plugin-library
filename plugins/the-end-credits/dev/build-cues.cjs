// plugins/the-end-credits/dev/build-cues.cjs
// Dev-only: normalise generated cues to -14 LUFS, measure their felt grid, swell and drift, and write
// assets/cues/manifest.json. Adapted from the City Weekend Vlog build (two-pass loudnorm, the plugin's own
// beat-detect.cjs); the 16th-note / burst / onset fields are not used by this app and are not written.
//
// Usage: node dev/build-cues.cjs [--out <dir>] <cues.json>
//   cues.json: [{ "id": "kebab-id", "title": "Title", "source": "file.mp3", "prompt": "the generation prompt",
//                 "default": true (optional, one cue: the panel's default) }, ...]
//   `source` is resolved against the folder of cues.json. --out defaults to assets/cues next to this script.
//   Cues already in <out>/manifest.json with other ids are kept; an entry with the same id is replaced.
//   A rejected cue (tempo outside 60-66 felt bpm, |driftBpm| > 1.5, or loudness off -14 LUFS by > 0.5 LU) gets no
//   mp3 and no entry; the other cues are still written and the exit status is 2.
//
// Section anchor for the planner (spec R3 default j): `swell` when it is not null (a >= 6 LU rise on a bar
// downbeat), else `swellFallback` (the bar downbeat >= 5.1 s with the largest phrase-energy rise). Both are on the
// felt-bar grid firstBeat + k * phraseBeats * 60 / bpm; swellFallback is written for every cue.
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { execFileSync, spawnSync } = require('node:child_process');
const { analyze, onsetEnvelope, bandFlux } = require('../beat-detect.cjs');

const GENERATOR = 'ElevenLabs Music v2.5 via Selects chat';
const TARGET_LUFS = -14, LUFS_TOLERANCE = 0.5;
// LRA=20 (CWV uses 11): the swell is the point of these cues, and a target LRA below the source's makes loudnorm
// fall back to dynamic mode, which compresses the swell.
const LOUDNORM = 'loudnorm=I=-14:TP=-1.5:LRA=20';
// The felt tempo of the bundled cues is 60-66 bpm (spec section 9). The detector's 70-180 search reads them
// double-time; its reading is halved in [119.5, 132.5], so a nominal 60 bpm cue measured at 119.95 still counts.
const DOUBLE_MIN = 119.5, DOUBLE_MAX = 132.5;
const PHRASE_BEATS = 4;                        // one felt 4/4 bar per phrase (planner: m = 4 at 60-66 bpm)
const MAX_DRIFT = 1.5;                         // detected bpm, second half minus first half
const SWELL_RISE = 6;                          // LU over the median of the first 2 bars
const SHORT_TERM = 3;                          // EBU R128 short-term window, s
const LEAD_IN = 5.1;                           // the planner's lead-in L: the reveal downbeat can't be earlier
const SR = 22050;
// As in beat-detect.cjs: onset-envelope framing and lag, band-flux lag, and the phase-evidence window.
const HOP = 256, FRAME_LAG = -HOP / 2, ONSET_LAG = 0.007, BAND_ONSET_LAG = 0.015, PARITY_WINDOW = 0.03;
// Low-band means closer than this (relative) don't decide the parity; the broadband onset envelope does.
const PARITY_MARGIN = 0.05;

const round = (x, d) => Math.round(x * 10 ** d) / 10 ** d;
const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// Mean peak of `env` (frame i stamped at t0 + i / fps; an event at time t peaks at frame time t + lag) near the even
// and the odd lines of the grid fb + k * period.
function parityMeans(env, fps, t0, lag, fb, period, end) {
  const sum = [0, 0], n = [0, 0], r = PARITY_WINDOW * fps;
  for (let k = 0; fb + k * period < end - 0.05; k++) {
    const c = (fb + k * period + lag - t0) * fps;
    let m = 0;
    for (let i = Math.max(0, Math.floor(c - r)); i <= Math.min(env.length - 1, Math.ceil(c + r)); i++) if (env[i] > m) m = env[i];
    sum[k % 2] += m; n[k % 2]++;
  }
  return [n[0] ? sum[0] / n[0] : 0, n[1] ? sum[1] / n[1] : 0];
}

// Which line of the detected (double-time) grid from `fb` is the felt beat: 0 (fb) or 1 (fb + period). The felt beat
// 1 is on the stronger low-band hit (the kick / bass note on the beat; band flux as in beat-detect.cjs's phase check).
// When the low band doesn't separate the two (no bass, or within 5 %), the broadband onset envelope decides.
function feltParity(samples, sampleRate, fb, period) {
  const end = samples.length / sampleRate;
  const bf = bandFlux(samples, sampleRate);
  // Band-flux frame i is stamped at i * hop / sampleRate, BAND_ONSET_LAG before the attack.
  const low = parityMeans(bf.flux[0], sampleRate / bf.hop, 0, -BAND_ONSET_LAG, fb, period, end);
  const { env } = onsetEnvelope(samples);
  const broad = parityMeans(env, sampleRate / HOP, FRAME_LAG / sampleRate, ONSET_LAG, fb, period, end);
  const top = Math.max(low[0], low[1]);
  const basis = top > 0 && Math.abs(low[0] - low[1]) >= PARITY_MARGIN * top ? 'low' : 'broadband';
  const [a, b] = basis === 'low' ? low : broad;
  // Low-band flux is unnormalised; report it relative to the stronger line.
  return { line: b > a ? 1 : 0, basis, low: low.map(v => round(top > 0 ? v / top : 0, 3)), broad: broad.map(v => round(v, 3)) };
}

// Felt grid and drift of a decoded cue (mono float samples). Pure: no ffmpeg.
// Returns { detectedBpm, bpm, firstBeat, driftBpm, parity, problems[] } (problems empty = usable).
function analyzeCue(samples, sampleRate = SR) {
  const a = analyze(samples, sampleRate), problems = [];
  const detectedBpm = a.bpm;
  let bpm = null, firstBeat = a.firstBeat, parity = null;
  if (detectedBpm >= DOUBLE_MIN && detectedBpm <= DOUBLE_MAX) {
    bpm = detectedBpm / 2;
    // The double-time grid has two phases. The felt first beat is the first line of the felt-beat phase at or after
    // the detector's first sounding beat.
    const period = 60 / detectedBpm;
    parity = feltParity(samples, sampleRate, a.firstBeat, period);
    if (parity.line === 1) firstBeat = round(a.firstBeat + period, 3);
  } else {
    problems.push('detected ' + detectedBpm + ' bpm: not a 60-66 bpm cue (expected ' + DOUBLE_MIN + '-' + DOUBLE_MAX + ' double-time)');
  }
  // Tempo drift, as the kit's cue-metrics: each half analysed on its own. Halves that resolve to different tempo
  // octaves show a huge drift and are rejected too, which is right (no steady grid).
  const half = samples.length >> 1;
  const driftBpm = round(analyze(samples.subarray(half), sampleRate).bpm - analyze(samples.subarray(0, half), sampleRate).bpm, 2);
  if (!(Math.abs(driftBpm) <= MAX_DRIFT)) problems.push('tempo drift ' + driftBpm + ' bpm between the halves (max ' + MAX_DRIFT + ')');
  return { detectedBpm, bpm, firstBeat, driftBpm, parity, problems };
}

// The swell: the first felt-bar downbeat d = firstBeat + k * bar (k >= 1) whose short-term loudness over [d, d + 3 s)
// is at least 6 LU above the median short-term loudness of the first 2 bars. `series` is the ebur128 short-term log,
// [{ t, S }] with S covering [t - 3, t]. Returns seconds (3 decimals) or null. Pure.
function findSwell(series, firstBeat, bpm) {
  const bar = PHRASE_BEATS * 60 / bpm, eps = 1e-3;
  const level = s => (Number.isFinite(s) && s > -70 ? s : -70);
  const at = t => { const e = series.find(p => p.t >= t - eps); return e ? level(e.S) : null; };  // window starting at t - 3
  const intro = series.filter(p => p.t >= firstBeat + SHORT_TERM - eps && p.t <= firstBeat + 2 * bar + eps).map(p => level(p.S));
  if (!intro.length) { const v = at(firstBeat + SHORT_TERM); if (v == null) return null; intro.push(v); }
  const base = median(intro);
  for (let k = 1; ; k++) {
    const d = firstBeat + k * bar, v = at(d + SHORT_TERM);
    if (v == null) return null;
    if (v >= base + SWELL_RISE) return round(d, 3);
  }
}

// The swell fallback, an anchor for every cue (flat cues have swell null): among the felt-bar downbeats
// d = firstBeat + k * bar (k >= 1) with d >= 5.1 s (the lead-in) and the phrase [d, d + bar) inside usableEnd, the
// first whose phrase loudness rises most over the previous phrase's. A phrase's loudness is the mean of the
// short-term values whose 3 s windows lie inside it (`series` as in findSwell, t in [d + 3, d + bar]). Returns
// seconds (3 decimals) or null when no phrase qualifies. Pure.
function findSwellFallback(series, firstBeat, bpm, usableEnd) {
  const bar = PHRASE_BEATS * 60 / bpm, eps = 1e-3;
  const level = s => (Number.isFinite(s) && s > -70 ? s : -70);
  const phrase = d => {
    const v = series.filter(p => p.t >= d + SHORT_TERM - eps && p.t <= d + bar + eps).map(p => level(p.S));
    return v.length ? v.reduce((x, y) => x + y) / v.length : null;
  };
  let best = null;
  for (let k = 1; firstBeat + (k + 1) * bar <= usableEnd + 1e-9; k++) {
    const d = firstBeat + k * bar;
    if (d < LEAD_IN - 1e-9) continue;
    const now = phrase(d), before = phrase(d - bar);
    if (now == null || before == null) continue;
    if (!best || now - before > best.rise + 1e-9) best = { d, rise: now - before };
  }
  return best ? round(best.d, 3) : null;
}

// ffmpeg helpers.
const decode = file => {
  const pcm = execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  return new Float32Array(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + Math.floor(pcm.byteLength / 4) * 4));
};
const loudnormJson = stderr => JSON.parse(stderr.slice(stderr.lastIndexOf('{'), stderr.lastIndexOf('}') + 1));
// Integrated loudness, true peak (dBTP) and the short-term series ({ t, S } every 0.1 s) of a file, from one
// ebur128 pass.
function measureLoudness(file) {
  const stderr = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { maxBuffer: 1 << 28 }).stderr.toString();
  const series = [];
  for (const m of stderr.matchAll(/t:\s*(-?[\d.]+)\s+TARGET:.*?S:\s*(-?[\d.]+|-inf|nan)/g)) series.push({ t: Number(m[1]), S: Number(m[2]) });
  // The last "I: x LUFS" / "Peak: x dBFS" occurrences are the summary.
  const last = re => { const all = stderr.match(re) || []; return all.length ? Number(all.pop().match(/-?[\d.]+|-inf/)[0]) : null; };
  return { lufs: last(/I:\s+-?[\d.]+ LUFS/g), truePeak: last(/Peak:\s+(-?[\d.]+|-inf) dBFS/g), series };
}
const encode = (source, dst, filter) => {
  const r = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-y', '-i', source, '-af', filter, '-ar', '44100', '-ac', '2', '-b:a', '192k', '-map_metadata', '-1', dst]);
  if (r.status !== 0) throw Error('ffmpeg failed on ' + source + ': ' + r.stderr.toString().slice(-400));
  return r.stderr.toString();
};
// Normalise `source` into `dst` (44.1 kHz stereo 192 kbps mp3, metadata stripped). Returns the method:
// - 'linear': two-pass loudnorm in its linear mode (one static gain), as in CWV.
// - 'gain+limiter': when -14 LUFS needs more gain than the -1.5 dBTP ceiling allows, loudnorm falls back to its
//   dynamic mode, which rides the gain (it reshaped the Rhodes cue's short-term loudness by up to 4.6 LU and would
//   flatten a swell). Instead: a static gain and a 4x-oversampled peak limiter at -1.9 dBFS (alimiter, auto level
//   off), which leaves the phrase-level dynamics alone; the gain is iterated for the limiter's loss.
function normalise(source, dst) {
  const pass1 = loudnormJson(spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-i', source, '-af', LOUDNORM + ':print_format=json', '-f', 'null', '-']).stderr.toString());
  const filter = LOUDNORM + ':linear=true:print_format=json:measured_I=' + pass1.input_i + ':measured_TP=' + pass1.input_tp +
    ':measured_LRA=' + pass1.input_lra + ':measured_thresh=' + pass1.input_thresh + ':offset=' + pass1.target_offset;
  if (loudnormJson(encode(source, dst, filter)).normalization_type === 'linear') return 'linear';
  let gain = TARGET_LUFS - Number(pass1.input_i);
  for (let i = 0; i < 4; i++) {
    encode(source, dst, 'aresample=176400,volume=' + gain.toFixed(2) + 'dB,alimiter=limit=0.8:attack=5:release=50:level=disabled,aresample=44100');
    const { lufs } = measureLoudness(dst);
    if (Math.abs(lufs - TARGET_LUFS) <= 0.15) break;
    gain += TARGET_LUFS - lufs;
  }
  return 'gain+limiter';
}

// Build one cue into `outDir`. Returns { entry } or { rejected: [reasons] } (a rejected cue leaves no mp3).
function buildCue(cue, sourceFile, outDir) {
  const file = cue.id + '.mp3', dst = path.join(outDir, file);
  const mode = normalise(sourceFile, dst);
  const { lufs, truePeak, series } = measureLoudness(dst);
  const samples = decode(dst);
  const durationSeconds = round(samples.length / SR, 3);
  const g = analyzeCue(samples, SR);
  const problems = [...g.problems];
  if (!(Math.abs(lufs - TARGET_LUFS) <= LUFS_TOLERANCE)) problems.push('loudness ' + lufs + ' LUFS after two-pass loudnorm');
  if (problems.length) { fs.rmSync(dst, { force: true }); return { rejected: problems }; }
  const usableEnd = round(durationSeconds - 0.1, 3);
  const swell = findSwell(series, g.firstBeat, g.bpm);
  const swellFallback = findSwellFallback(series, g.firstBeat, g.bpm, usableEnd);
  console.log(cue.id, JSON.stringify({ detectedBpm: g.detectedBpm, bpm: g.bpm, firstBeat: g.firstBeat, parity: g.parity, swell, swellFallback, driftBpm: g.driftBpm, lufs, truePeak, loudness: mode }));
  return {
    entry: {
      id: cue.id, title: cue.title, file,
      bpm: g.bpm, detectedBpm: g.detectedBpm, firstBeat: g.firstBeat, phraseBeats: PHRASE_BEATS, swell, swellFallback,
      usableEnd, driftBpm: g.driftBpm, lufs, durationSeconds,
      sha256: crypto.createHash('sha256').update(fs.readFileSync(dst)).digest('hex'),
      provenance: { generator: GENERATOR, prompt: cue.prompt },
      ...(cue.default === true ? { default: true } : {}),
    },
  };
}

module.exports = { analyzeCue, findSwell, findSwellFallback, measureLoudness, buildCue, PHRASE_BEATS, MAX_DRIFT, GENERATOR };

if (require.main === module) {
  const args = process.argv.slice(2);
  let outDir = path.resolve(__dirname, '..', 'assets', 'cues');
  const o = args.indexOf('--out');
  if (o >= 0) { outDir = path.resolve(args[o + 1]); args.splice(o, 2); }
  if (args.length !== 1) { console.error('usage: node dev/build-cues.cjs [--out <dir>] <cues.json>'); process.exit(1); }
  const list = JSON.parse(fs.readFileSync(args[0], 'utf8')), base = path.dirname(path.resolve(args[0]));
  fs.mkdirSync(outDir, { recursive: true });
  const manifestFile = path.join(outDir, 'manifest.json');
  const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : { version: 1, cues: [] };
  let failed = 0;
  for (const cue of list) {
    for (const k of ['id', 'title', 'source', 'prompt']) if (typeof cue[k] !== 'string' || !cue[k]) throw Error('cue ' + JSON.stringify(cue) + ': missing ' + k);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(cue.id)) throw Error(cue.id + ': ids are kebab-case');
    const r = buildCue(cue, path.resolve(base, cue.source), outDir);
    const i = manifest.cues.findIndex(c => c.id === cue.id);
    if (r.rejected) {
      // Its mp3 is gone, so a previous entry with this id goes too.
      if (i >= 0) manifest.cues.splice(i, 1);
      failed++; console.error(cue.id + ' REJECTED: ' + r.rejected.join('; ')); continue;
    }
    // At most one default cue: a new default clears the flag on the others.
    if (r.entry.default) manifest.cues.forEach(c => { delete c.default; });
    if (i >= 0) manifest.cues[i] = r.entry; else manifest.cues.push(r.entry);
  }
  fs.writeFileSync(manifestFile, JSON.stringify({ version: 1, cues: manifest.cues }, null, 2) + '\n');
  process.exit(failed ? 2 : 0);
}
