// plugins/the-end-credits/dev/build-cues.cjs
// Dev-only: time-stretch generated cues to one felt tempo, master them to -12.5 LUFS (true peak <= -1.2 dBTP),
// measure their felt grid, swell and drift, and write assets/cues/manifest.json. Adapted from the City Weekend Vlog
// build (the plugin's own beat-detect.cjs); the 16th-note / burst / onset fields are not used by this app.
//
// Usage: node dev/build-cues.cjs [--out <dir>] [--src <dir>] [--target-bpm <bpm>] <cues.json>
//   cues.json: [cue, ...] or { "targetBpm": 61.5, "cues": [cue, ...] }, where a cue is
//     { "id": "kebab-id", "title": "Title", "source": "file.mp3", "prompt": "the generation prompt",
//       "default": true (optional, one cue: the panel's default),
//       "targetBpm": 61.5 (optional, overrides the file-level / --target-bpm value for this cue),
//       "swell": 14.6 (optional, seconds IN THE SOURCE FILE: a manual swell) }
//   `source` is resolved against --src (default: the folder of cues.json). --out defaults to assets/cues next to
//   this script. Cues already in <out>/manifest.json with other ids are kept; an entry with the same id is replaced.
//   A rejected cue (tempo outside 60-66 felt bpm, |driftBpm| > 1.5, loudness off -12.5 LUFS by > 0.5 LU, or a true
//   peak above -1.2 dBTP) gets no mp3 and no entry; the other cues are still written and the exit status is 2.
//
// Tempo: the source's felt tempo (`sourceBpm`) is measured first. With a targetBpm the cue is time-stretched by
// ffmpeg's rubberband filter (tempo = targetBpm / sourceBpm, pitch kept), so every bar lasts 4 * 60 / targetBpm s;
// the manifest `bpm` is the felt tempo measured again after stretching (sourceBpm = bpm when not stretched).
// A manual `swell` is in source time: the build maps it to stretched time (x sourceBpm / targetBpm) and snaps it to
// the nearest felt-bar downbeat of the stretched grid.
// Loudness: one static gain and a 4x-oversampled peak limiter (alimiter, auto level off), never a dynamic loudnorm,
// so the phrase-level dynamics (the swell) are kept. The gain and the limiter ceiling are iterated until the mp3
// measures -12.5 LUFS (to the 0.1 LU ebur128 reports) with a true peak <= -1.2 dBTP.
//
// `swellSource` is "manual" when cues.json set the swell, else "auto" (findSwell).
// Section anchor for the planner (spec R3 default j): `swell` when it is not null (a >= 6 LU rise on a bar
// downbeat), else `swellFallback` (the bar downbeat >= 5.1 s with the largest phrase-energy rise). Both are on the
// felt-bar grid firstBeat + k * phraseBeats * 60 / bpm; swellFallback is written for every cue.
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { execFileSync, spawnSync } = require('node:child_process');
const { analyze, onsetEnvelope, bandFlux } = require('../beat-detect.cjs');

const GENERATOR = 'ElevenLabs Music v2.5 via Selects chat';
const TARGET_LUFS = -12.5, LUFS_TOLERANCE = 0.5, LUFS_ITERATE = 0.05;   // ebur128 reports I to 0.1 LU
const MAX_TRUE_PEAK = -1.2;                    // dBTP, measured on the encoded mp3
// The limiter's first ceiling (dBFS, at 4x oversampling); lowered while the mp3's true peak is above MAX_TRUE_PEAK
// (the mp3 encoder overshoots the limiter by a few tenths of a dB).
const LIMIT_START = -1.5, LIMIT_STEP = 0.2, LIMIT_MIN = -4;
const PHASE_AGREE = 0.03;                      // s: a stretched cue's measured first beat vs the mapped source grid
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
// expectBpm (optional): the felt tempo a time-stretched cue must have. The detector's search is then narrowed to
// 2 * expectBpm +- 2 (whole cue and both halves): a stretched pad's soft attacks can read at 4/3 of the real tempo.
// Returns { detectedBpm, bpm, firstBeat, driftBpm, parity, problems[] } (problems empty = usable).
function analyzeCue(samples, sampleRate = SR, expectBpm = null) {
  const range = expectBpm > 0 ? { minBpm: Math.floor((2 * expectBpm - 2) * 2) / 2, maxBpm: Math.ceil((2 * expectBpm + 2) * 2) / 2 } : undefined;
  const a = analyze(samples, sampleRate, range), problems = [];
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
  const driftBpm = round(analyze(samples.subarray(half), sampleRate, range).bpm - analyze(samples.subarray(0, half), sampleRate, range).bpm, 2);
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
// Stretch and master `source` into `dst` (44.1 kHz stereo 192 kbps mp3, metadata stripped). tempo: the rubberband
// tempo factor (1 = no stretch). A static gain and a 4x-oversampled limiter; the gain is iterated for the limiter's
// loss and the ceiling lowered while the true peak is too high. Returns { gainDb, limitDb, passes }.
function master(source, dst, tempo, sourceLufs) {
  const stretch = Math.abs(tempo - 1) > 1e-6 ? 'rubberband=tempo=' + tempo.toFixed(6) + ':pitch=1,' : '';
  let gain = TARGET_LUFS - sourceLufs, limit = LIMIT_START, passes = 0;
  for (let i = 0; i < 12; i++) {
    passes++;
    encode(source, dst, stretch + 'aresample=176400,volume=' + gain.toFixed(2) + 'dB,alimiter=limit=' + (10 ** (limit / 20)).toFixed(4) +
      ':attack=5:release=50:level=disabled,aresample=44100');
    const { lufs, truePeak } = measureLoudness(dst);
    const peakOk = truePeak <= MAX_TRUE_PEAK, loudOk = Math.abs(lufs - TARGET_LUFS) <= LUFS_ITERATE;
    if (peakOk && loudOk) break;
    if (!peakOk && limit - LIMIT_STEP >= LIMIT_MIN - 1e-9) limit -= LIMIT_STEP;
    if (!loudOk) gain += TARGET_LUFS - lufs;
  }
  return { gainDb: round(gain, 2), limitDb: round(limit, 2), passes };
}

// Build one cue into `outDir`. targetBpm: the felt tempo to stretch to (null: keep the source's). Returns { entry }
// or { rejected: [reasons] } (a rejected cue leaves no mp3).
function buildCue(cue, sourceFile, outDir, targetBpm = null) {
  const file = cue.id + '.mp3', dst = path.join(outDir, file);
  // The source's own felt grid decides the stretch; a source without a steady 60-66 bpm felt grid is rejected as is.
  const src = analyzeCue(decode(sourceFile), SR);
  if (src.problems.length) return { rejected: src.problems.map(p => 'source: ' + p) };
  const sourceBpm = src.bpm;
  const tempo = targetBpm == null ? 1 : targetBpm / sourceBpm;
  const mastered = master(sourceFile, dst, tempo, measureLoudness(sourceFile).lufs);
  const { lufs, truePeak, series } = measureLoudness(dst);
  const samples = decode(dst);
  const durationSeconds = round(samples.length / SR, 3);
  const g = analyzeCue(samples, SR, targetBpm);
  const problems = [...g.problems];
  if (!(Math.abs(lufs - TARGET_LUFS) <= LUFS_TOLERANCE)) problems.push('loudness ' + lufs + ' LUFS after mastering (target ' + TARGET_LUFS + ')');
  if (!(truePeak <= MAX_TRUE_PEAK)) problems.push('true peak ' + truePeak + ' dBTP above ' + MAX_TRUE_PEAK);
  if (targetBpm != null && g.bpm != null && Math.abs(g.bpm - targetBpm) > 0.3) problems.push('stretched to ' + g.bpm + ' bpm, not ' + targetBpm);
  if (problems.length) { fs.rmSync(dst, { force: true }); return { rejected: problems }; }
  // The stretch is a fixed time scale, so the source's felt grid maps onto the stretched cue exactly (rubberband adds
  // no measurable offset: < 5 ms on the bundled cues). A stretched pad can lose its attacks and lock the detector's
  // phase half a detector beat off; when the measured first beat is more than PHASE_AGREE off the mapped source grid,
  // the mapped grid wins (logged as phaseFrom: 'source').
  let phaseFrom = 'measured';
  if (tempo !== 1) {
    const mapped = src.firstBeat / tempo, beat = 60 / g.bpm;
    const off = ((g.firstBeat - mapped) % beat + 1.5 * beat) % beat - beat / 2;
    if (Math.abs(off) > PHASE_AGREE) { g.firstBeat = round(mapped, 3); phaseFrom = 'source'; }
  }
  const usableEnd = round(durationSeconds - 0.1, 3);
  // A manual swell (cues.json "swell", seconds in the source) is mapped to stretched time and snapped to the nearest
  // felt-bar downbeat after firstBeat. The manifest keeps it to the ms, so it can sit up to 0.5 ms off its downbeat;
  // the planner's default j allows for that (tecSection rounds up only past 1e-3 of a phrase).
  const bar = PHRASE_BEATS * 60 / g.bpm;
  const swellSource = cue.swell == null ? 'auto' : 'manual';
  const swellStretched = cue.swell == null ? null : cue.swell / tempo;
  const swell = swellSource === 'manual'
    ? round(g.firstBeat + Math.max(1, Math.round((swellStretched - g.firstBeat) / bar)) * bar, 3)
    : findSwell(series, g.firstBeat, g.bpm);
  const swellFallback = findSwellFallback(series, g.firstBeat, g.bpm, usableEnd);
  console.log(cue.id, JSON.stringify({ sourceBpm, tempo: round(tempo, 5), detectedBpm: g.detectedBpm, bpm: g.bpm, firstBeat: g.firstBeat, phaseFrom, parity: g.parity, swell, swellSource,
    swellFallback, driftBpm: g.driftBpm, lufs, truePeak, ...mastered }));
  return {
    entry: {
      id: cue.id, title: cue.title, file,
      bpm: g.bpm, sourceBpm, detectedBpm: g.detectedBpm, firstBeat: g.firstBeat, phraseBeats: PHRASE_BEATS, swell, swellSource, swellFallback,
      usableEnd, driftBpm: g.driftBpm, lufs, truePeak, durationSeconds,
      sha256: crypto.createHash('sha256').update(fs.readFileSync(dst)).digest('hex'),
      provenance: { generator: GENERATOR, prompt: cue.prompt },
      ...(cue.default === true ? { default: true } : {}),
    },
  };
}

module.exports = { analyzeCue, findSwell, findSwellFallback, measureLoudness, buildCue, PHRASE_BEATS, MAX_DRIFT, GENERATOR, TARGET_LUFS, MAX_TRUE_PEAK };

if (require.main === module) {
  const args = process.argv.slice(2);
  const flag = name => { const o = args.indexOf(name); if (o < 0) return null; const v = args[o + 1]; args.splice(o, 2); return v; };
  const out = flag('--out'), srcDir = flag('--src'), cliBpm = flag('--target-bpm');
  const outDir = out ? path.resolve(out) : path.resolve(__dirname, '..', 'assets', 'cues');
  if (args.length !== 1) { console.error('usage: node dev/build-cues.cjs [--out <dir>] [--src <dir>] [--target-bpm <bpm>] <cues.json>'); process.exit(1); }
  const input = JSON.parse(fs.readFileSync(args[0], 'utf8'));
  const list = Array.isArray(input) ? input : input.cues;
  if (!Array.isArray(list)) throw Error('cues.json: an array of cues, or { targetBpm?, cues: [...] }');
  const bpmOf = v => { if (v == null) return null; const n = Number(v); if (!(n >= 60 && n <= 66)) throw Error('targetBpm must be a felt tempo in 60-66, got ' + v); return n; };
  const fileBpm = bpmOf(cliBpm != null ? cliBpm : Array.isArray(input) ? null : input.targetBpm);
  const base = srcDir ? path.resolve(srcDir) : path.dirname(path.resolve(args[0]));
  fs.mkdirSync(outDir, { recursive: true });
  const manifestFile = path.join(outDir, 'manifest.json');
  const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : { version: 1, cues: [] };
  let failed = 0;
  for (const cue of list) {
    for (const k of ['id', 'title', 'source', 'prompt']) if (typeof cue[k] !== 'string' || !cue[k]) throw Error('cue ' + JSON.stringify(cue) + ': missing ' + k);
    if (cue.swell != null && !(typeof cue.swell === 'number' && cue.swell >= 0)) throw Error(cue.id + ': swell must be seconds');
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(cue.id)) throw Error(cue.id + ': ids are kebab-case');
    const r = buildCue(cue, path.resolve(base, cue.source), outDir, cue.targetBpm != null ? bpmOf(cue.targetBpm) : fileBpm);
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
