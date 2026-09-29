// plugins/the-end-credits/dev/build-cues.cjs
// Dev-only: normalise generated cues to -14 LUFS, measure their felt grid, swell and drift, and write
// assets/cues/manifest.json. Adapted from the City Weekend Vlog build (two-pass loudnorm, the plugin's own
// beat-detect.cjs); the 16th-note / burst / onset fields are not used by this app and are not written.
//
// Usage: node dev/build-cues.cjs [--out <dir>] <cues.json>
//   cues.json: [{ "id": "kebab-id", "title": "Title", "source": "file.mp3", "prompt": "the generation prompt" }, ...]
//   `source` is resolved against the folder of cues.json. --out defaults to assets/cues next to this script.
//   Cues already in <out>/manifest.json with other ids are kept; an entry with the same id is replaced.
//   A rejected cue (tempo outside 60-66 felt bpm, |driftBpm| > 1.5, or loudness off -14 LUFS by > 0.5 LU) gets no
//   mp3 and no entry; the other cues are still written and the exit status is 2.
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { execFileSync, spawnSync } = require('node:child_process');
const { analyze, onsetEnvelope } = require('../beat-detect.cjs');

const GENERATOR = 'ElevenLabs Music v2.5 via Selects chat';
const TARGET_LUFS = -14, LUFS_TOLERANCE = 0.5;
// LRA=20 (CWV uses 11): the swell is the point of these cues, and a target LRA below the source's makes loudnorm
// fall back to dynamic mode, which compresses the swell.
const LOUDNORM = 'loudnorm=I=-14:TP=-1.5:LRA=20';
const FELT_MIN = 60, FELT_MAX = 66;            // the felt tempo of the bundled cues (spec section 9)
const DOUBLE_MIN = 120, DOUBLE_MAX = 132;      // the detector's 70-180 search reads them double-time
const PHRASE_BEATS = 4;                        // one felt 4/4 bar per phrase (planner: m = 4 at 60-66 bpm)
const MAX_DRIFT = 1.5;                         // detected bpm, second half minus first half
const SWELL_RISE = 6;                          // LU over the median of the first 2 bars
const SHORT_TERM = 3;                          // EBU R128 short-term window, s
const SR = 22050;
const HOP = 256, FRAME_LAG = -HOP / 2, ONSET_LAG = 0.007, PARITY_WINDOW = 0.03;   // as in beat-detect.cjs

const round = (x, d) => Math.round(x * 10 ** d) / 10 ** d;
const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// Mean onset-envelope peak on the even and the odd lines of the detected (double-time) grid from `fb`.
function parityStrength(samples, sampleRate, fb, period) {
  const { env } = onsetEnvelope(samples);
  const fps = sampleRate / HOP, t0 = FRAME_LAG / sampleRate, end = samples.length / sampleRate;
  const sum = [0, 0], n = [0, 0];
  for (let k = 0; fb + k * period < end - 0.05; k++) {
    const c = (fb + k * period + ONSET_LAG - t0) * fps, r = PARITY_WINDOW * fps;
    let m = 0;
    for (let i = Math.max(0, Math.floor(c - r)); i <= Math.min(env.length - 1, Math.ceil(c + r)); i++) if (env[i] > m) m = env[i];
    sum[k % 2] += m; n[k % 2]++;
  }
  return [n[0] ? sum[0] / n[0] : 0, n[1] ? sum[1] / n[1] : 0];
}

// Felt grid and drift of a decoded cue (mono float samples). Pure: no ffmpeg.
// Returns { detectedBpm, bpm, firstBeat, driftBpm, parity, problems[] } (problems empty = usable).
function analyzeCue(samples, sampleRate = SR) {
  const a = analyze(samples, sampleRate), problems = [];
  const detectedBpm = a.bpm;
  let bpm = null, firstBeat = a.firstBeat, parity = null;
  if (detectedBpm >= DOUBLE_MIN && detectedBpm <= DOUBLE_MAX) {
    bpm = detectedBpm / 2;
    // The double-time grid has two phases; the felt beat is the one whose lines carry more onset energy (a kick or a
    // chord change on the beat, a softer note on the "and"). Its first line at or after the detector's first sounding
    // beat is the felt first beat.
    const period = 60 / detectedBpm;
    parity = parityStrength(samples, sampleRate, a.firstBeat, period).map(v => round(v, 3));
    if (parity[1] > parity[0]) firstBeat = round(a.firstBeat + period, 3);
  } else if (detectedBpm >= FELT_MIN && detectedBpm <= FELT_MAX) {
    bpm = detectedBpm;                           // unreachable with the 70-180 detector; kept for a future range
  } else {
    problems.push('detected ' + detectedBpm + ' bpm: not a 60-66 bpm cue (expected 120-132 double-time)');
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

// ffmpeg helpers.
const decode = file => {
  const pcm = execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  return new Float32Array(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + Math.floor(pcm.byteLength / 4) * 4));
};
const loudnormJson = stderr => JSON.parse(stderr.slice(stderr.lastIndexOf('{'), stderr.lastIndexOf('}') + 1));
// Integrated loudness and the short-term series ({ t, S } every 0.1 s) of a file, from one ebur128 pass.
function measureLoudness(file) {
  const stderr = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-i', file, '-af', 'ebur128', '-f', 'null', '-'], { maxBuffer: 1 << 28 }).stderr.toString();
  const series = [];
  for (const m of stderr.matchAll(/t:\s*(-?[\d.]+)\s+TARGET:.*?S:\s*(-?[\d.]+|-inf|nan)/g)) series.push({ t: Number(m[1]), S: Number(m[2]) });
  // The last "I: x LUFS" occurrence is the integrated summary.
  const lufs = Number((stderr.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop().match(/-?[\d.]+/)[0]);
  return { lufs, series };
}
// Two-pass loudnorm of `source` into `dst` (44.1 kHz stereo 192 kbps mp3, metadata stripped). Returns the second
// pass's normalization_type ('linear' is expected; 'dynamic' compresses).
function normalise(source, dst) {
  const pass1 = loudnormJson(spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-i', source, '-af', LOUDNORM + ':print_format=json', '-f', 'null', '-']).stderr.toString());
  const filter = LOUDNORM + ':linear=true:print_format=json:measured_I=' + pass1.input_i + ':measured_TP=' + pass1.input_tp +
    ':measured_LRA=' + pass1.input_lra + ':measured_thresh=' + pass1.input_thresh + ':offset=' + pass1.target_offset;
  const r = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-y', '-i', source, '-af', filter, '-ar', '44100', '-ac', '2', '-b:a', '192k', '-map_metadata', '-1', dst]);
  if (r.status !== 0) throw Error('ffmpeg failed on ' + source + ': ' + r.stderr.toString().slice(-400));
  return loudnormJson(r.stderr.toString()).normalization_type;
}

// Build one cue into `outDir`. Returns { entry } or { rejected: [reasons] } (a rejected cue leaves no mp3).
function buildCue(cue, sourceFile, outDir) {
  const file = cue.id + '.mp3', dst = path.join(outDir, file);
  const mode = normalise(sourceFile, dst);
  if (mode !== 'linear') console.warn(cue.id + ': loudnorm used ' + mode + ' mode (the swell may be compressed)');
  const { lufs, series } = measureLoudness(dst);
  const samples = decode(dst);
  const durationSeconds = round(samples.length / SR, 3);
  const g = analyzeCue(samples, SR);
  const problems = [...g.problems];
  if (!(Math.abs(lufs - TARGET_LUFS) <= LUFS_TOLERANCE)) problems.push('loudness ' + lufs + ' LUFS after two-pass loudnorm');
  if (problems.length) { fs.rmSync(dst, { force: true }); return { rejected: problems }; }
  const swell = findSwell(series, g.firstBeat, g.bpm);
  console.log(cue.id, JSON.stringify({ detectedBpm: g.detectedBpm, bpm: g.bpm, firstBeat: g.firstBeat, parity: g.parity, swell, driftBpm: g.driftBpm, lufs }));
  return {
    entry: {
      id: cue.id, title: cue.title, file,
      bpm: g.bpm, detectedBpm: g.detectedBpm, firstBeat: g.firstBeat, phraseBeats: PHRASE_BEATS, swell,
      usableEnd: round(durationSeconds - 0.1, 3), driftBpm: g.driftBpm, lufs, durationSeconds,
      sha256: crypto.createHash('sha256').update(fs.readFileSync(dst)).digest('hex'),
      provenance: { generator: GENERATOR, prompt: cue.prompt },
    },
  };
}

module.exports = { analyzeCue, findSwell, measureLoudness, buildCue, PHRASE_BEATS, MAX_DRIFT, GENERATOR };

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
    if (i >= 0) manifest.cues[i] = r.entry; else manifest.cues.push(r.entry);
  }
  fs.writeFileSync(manifestFile, JSON.stringify({ version: 1, cues: manifest.cues }, null, 2) + '\n');
  process.exit(failed ? 2 : 0);
}
