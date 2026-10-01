// plugins/selfie-aesthetic/dev/build-cues.cjs
// Dev-only: cut the CC0 source tracks to 65 s excerpts, bring them to -10.5 LUFS with a static gain and a true-peak
// limiter, measure their grids and write assets/cues/manifest.json.
// Usage: node plugins/selfie-aesthetic/dev/build-cues.cjs <folder-with-the-source-mp3s>   (ffmpeg on PATH)
// The excerpts keep their native tempo and pitch: nothing here stretches or pitches the audio.
'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto');
const { execFileSync, spawnSync } = require('node:child_process');
const { analyze } = require('../beat-detect.cjs');

const TARGET_LUFS = -10.5;
// Sample-peak ceiling of the limiter (dBFS). The limiter runs at 4x the sample rate, so this is close to a true-peak
// limit; the MP3 encode then adds a little overshoot, which the -1 dBTP check below catches.
const LIMIT_DB = -2;
const MAX_TRUE_PEAK = -1.0;
const LENGTH = 65, FADE_IN = 0.5, FADE_OUT = 2;
const SECTION_BEATS = 16;
// The longest edit is 12 bars (48 beats); the default section must leave room for it before the fade-out.
const LONGEST_BEATS = 48;
const CC0 = { licence: 'CC0 1.0 Universal', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', accessed: '2026-10-01' };

// start: excerpt start in the source (seconds). Each start is 0.5 s before a source bar line, so the fade-in ends on
// beat 1 of a bar (bar 1 at 0.5 s in the excerpt). Windows were chosen from the source's per-beat energy:
//  make-funk: flat energy throughout; bar line at 21.212 s (whole-track downbeat phase 3, 99 BPM).
//  day-trips: the last lift (138.7-181.3 s, about 3 dB up) with 8 bars before it; bar line at 117.338 s (90 BPM).
//             The track is 183.9 s, so the window ends at 181.84 s, just after the lift.
//  sensual-melancholia: starts on the drop (beat 296 at 169.148 s: -14.6 -> -7 dB per beat); post-drop flat to ~237 s.
//  pantheon: steady 808 section; bar line at 109.834 s (106 BPM).
// phaseBeats (beat-detect's dev option): a half-beat grid correction for a cue whose fitted grid sits on the 8th
// off-beats and that the detector's own phase check does not move. Sensual Melancholia's post-drop section has its
// claps/hats on the off-beats (mid band 1.36 there vs 0.52 on the beat), so the fit lands at 0.217 s; the kick (low band
// 1.10 vs 0.85, beats 1 and 3) and the drop itself (per-beat RMS -14.1 -> -7.5 dB at 169.148 s in the source, 0.5 s
// in the cue) are on the grid half a beat later. The kit beat-detect.cjs is shipped unchanged, so the correction lives
// here and in the manifest (phaseBeats).
const CUES = [
  {
    id: 'make-funk', source: 'holi_make-funk.mp3', start: 20.712, title: 'Make Funk', author: 'HoliznaCC0',
    sourceUrl: 'https://freemusicarchive.org/music/holiznacc0/bassic/make-funk/',
    downloadUrl: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/tracks/gvipQswrNI4uF5PNymw5d1cWq9gqqdTIsgHDMKCJ.mp3',
    licenceLine: 'Make Funk by HoliznaCC0 is licensed under a CC0 1.0 Universal License.',
  },
  {
    id: 'day-trips', source: 'holi_day-trips.mp3', start: 116.838, title: 'Day Trips', author: 'HoliznaCC0',
    sourceUrl: 'https://freemusicarchive.org/music/holiznacc0/city-slacker/day-trips/',
    downloadUrl: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/tracks/8mlLtuhQCO7ohFxygnQb39fJBNNxM2iTjr6Bdrff.mp3',
    licenceLine: 'Day Trips by HoliznaCC0 is licensed under a CC0 1.0 Universal License.',
  },
  {
    id: 'sensual-melancholia', source: 'loya_sensual-melancholia.mp3', start: 168.648, phaseBeats: 0.5, title: 'Sensual Melancholia', author: 'Loyalty Freak Music',
    sourceUrl: 'https://freemusicarchive.org/music/Loyalty_Freak_Music/INSTRUMENTAL_RB_BEATS_TO_SING_OR_RAP_ON/Loyalty_Freak_Music_-_INSTRUMENTAL_RB_BEATS_TO_SING_OR_RAP_ON_-_03_Sensual_Melancholia/',
    downloadUrl: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/Music_for_Video/Loyalty_Freak_Music/INSTRUMENTAL_RB_BEATS_TO_SING_OR_RAP_ON/Loyalty_Freak_Music_-_03_-_Sensual_Melancholia.mp3',
    licenceLine: 'Sensual Melancholia by Loyalty Freak Music is licensed under a CC0 1.0 Universal License.',
  },
  {
    id: 'pantheon', source: 'holi_pantheon.mp3', start: 109.334, title: 'Pantheon', author: 'HoliznaCC0',
    sourceUrl: 'https://freemusicarchive.org/music/holiznacc0/phonk-aura-farming/pantheon/',
    downloadUrl: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/tracks/15yiCDxLujj0mWw7LZHHsSxb33E1qfdAHyzoTqPB.mp3',
    licenceLine: 'Pantheon by HoliznaCC0 is licensed under a CC0 1.0 Universal License.',
  },
];

// ---- Downbeat clarity: the documented ratio of the kit's tools/eval/cue-metrics.cjs (copied, same constants) ----
// Low-band (<150 Hz) log spectral flux, local mean removed; per beat the max within +/-20 ms; the bar phase (0-3)
// with the strongest median(beat 1) / median(beats 2-4). >= 1.5 is downbeat confidence "high".
const SR = 22050, CM_WIN = 1024, CM_HOP = 128;
const median = a => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2, br = re[b] * cr - im[b] * ci, bi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - br; im[b] = im[a] - bi; re[a] += br; im[a] += bi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}
function lowEnvelope(x) {
  const frames = Math.floor(x.length / CM_HOP) + 1;
  const win = new Float64Array(CM_WIN).map((_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (CM_WIN - 1)));
  const kLow = Math.round(150 * CM_WIN / SR);
  const env = new Float64Array(frames), re = new Float64Array(CM_WIN), im = new Float64Array(CM_WIN);
  let prev = null;
  for (let f = 0; f < frames; f++) {
    for (let i = 0, j = f * CM_HOP - CM_WIN; i < CM_WIN; i++, j++) { re[i] = (j >= 0 && j < x.length ? x[j] : 0) * win[i]; im[i] = 0; }
    fft(re, im);
    const mag = new Float64Array(CM_WIN / 2);
    let lo = 0;
    for (let k = 1; k < CM_WIN / 2; k++) {
      mag[k] = Math.log1p(10 * Math.hypot(re[k], im[k]));
      if (prev && k <= kLow) lo += Math.max(0, mag[k] - prev[k]);
    }
    env[f] = lo / kLow;
    prev = mag;
  }
  const out = new Float64Array(frames), R = 16;
  for (let f = 0; f < frames; f++) {
    let s = 0, c = 0;
    for (let q = Math.max(0, f - R); q < Math.min(frames, f + R); q++) { s += env[q]; c++; }
    out[f] = Math.max(0, env[f] - s / c);
  }
  return { env: out, rate: SR / CM_HOP, t0: -CM_HOP / 2 / SR };
}
const envAt = (E, t, w = 0.02) => {
  const c = (t - E.t0) * E.rate; let m = 0;
  for (let i = Math.max(0, Math.floor(c - w * E.rate)); i <= Math.min(E.env.length - 1, Math.ceil(c + w * E.rate)); i++) m = Math.max(m, E.env[i]);
  return m;
};
function downbeatClarity(lowOn) {
  let best = { ratio: 0, phase: 0 };
  for (let ph = 0; ph < 4; ph++) {
    const one = [], rest = [];
    lowOn.forEach((v, i) => (((i - ph) % 4 + 4) % 4 === 0 ? one : rest).push(v));
    const r = median(one) / (median(rest) || 1e-9);
    if (r > best.ratio) best = { ratio: r, phase: ph };
  }
  return best;
}

// ---- ffmpeg helpers ----
const decode = file => {
  const pcm = execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  return new Float32Array(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + Math.floor(pcm.byteLength / 4) * 4));
};
// Integrated loudness, loudness range and true peak (ebur128 summary).
function loudness(file) {
  const r = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const s = r.stderr.toString(), summary = s.slice(s.lastIndexOf('Summary:'));
  const num = re => { const m = summary.match(re); if (!m) throw Error('ebur128: no ' + re + ' in ' + file); return Number(m[1]); };
  return { lufs: num(/I:\s+(-?[\d.]+) LUFS/), lra: num(/LRA:\s+(-?[\d.]+) LU/), truePeak: num(/Peak:\s+(-?[\d.]+|-inf) dBFS/) };
}
// trim -> fades -> static gain -> limiter (4x oversampled, lookahead delay compensated, auto level off).
function filterChain(start, gainDb) {
  const lim = Math.pow(10, LIMIT_DB / 20).toFixed(4);
  return [
    `atrim=start=${start}:end=${start + LENGTH}`, 'asetpts=PTS-STARTPTS',
    `afade=t=in:st=0:d=${FADE_IN}`, `afade=t=out:st=${LENGTH - FADE_OUT}:d=${FADE_OUT}`,
    ...(gainDb == null ? [] : [`volume=${gainDb.toFixed(2)}dB`, 'aresample=176400', `alimiter=limit=${lim}:level=false:latency=true:attack=5:release=50`, 'aresample=44100']),
  ].join(',');
}

// ---- Default section: the loudest steady 16-beat window, starting on a bar line of the measured downbeat ----
// Candidates start on beat indices of the downbeat phase, after the fade-in, and leave the longest edit room before
// the fade-out. Steady: the window's beat RMS varies by at most 25 % (coefficient of variation); the loudest steady
// window wins (the loudest of all when none is steady).
function defaultSection(a, phase, durationSeconds) {
  const P = 60 / a.bpm, be = a.beatEnergy, rows = [];
  for (let i = phase; i + SECTION_BEATS <= be.length; i += 4) {
    const t = a.firstBeat + i * P;
    if (t < FADE_IN) continue;
    if (t + LONGEST_BEATS * P > durationSeconds - FADE_OUT) break;
    const w = be.slice(i, i + SECTION_BEATS), mean = w.reduce((p, q) => p + q, 0) / w.length;
    const cv = Math.sqrt(w.reduce((p, q) => p + (q - mean) ** 2, 0) / w.length) / (mean || 1e-9);
    rows.push({ t, mean, cv });
  }
  if (!rows.length) throw Error('no default-section candidate');
  const steady = rows.filter(r => r.cv <= 0.25);
  const best = (steady.length ? steady : rows).reduce((p, q) => (q.mean > p.mean + 1e-9 ? q : p));
  return Math.round(best.t * 1000) / 1000;
}

if (require.main === module) {
  const src = process.argv[2];
  if (!src) throw Error('usage: node dev/build-cues.cjs <folder-with-the-source-mp3s>');
  const out = path.resolve(__dirname, '..', 'assets', 'cues');
  fs.mkdirSync(out, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sae-cues-'));
  const cues = [];
  for (const c of CUES) {
    const input = path.join(src, c.source), file = c.id + '.mp3', dst = path.join(out, file);
    if (!fs.existsSync(input)) throw Error(c.id + ': ' + c.source + ' is not in ' + src);
    // Pass 1: the loudness of the faded excerpt itself (not the whole track).
    const raw = path.join(tmp, c.id + '.wav');
    execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', input, '-map', '0:a:0', '-af', filterChain(c.start), '-ar', '44100', '-ac', '2', raw]);
    const before = loudness(raw);
    // Pass 2: static gain, limiter, encode; re-measure the MP3 and correct the gain for what the limiter took (<= 3 x).
    // The limiter takes more loudness the harder it is driven, so each correction is scaled by the measured slope
    // (LU out per dB of gain) of the last two passes (a secant step).
    let gain = TARGET_LUFS - before.lufs, m, prev = null;
    for (let k = 0; k < 8; k++) {
      execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', input, '-map', '0:a:0', '-af', filterChain(c.start, gain), '-ar', '44100', '-ac', '2',
        '-c:a', 'libmp3lame', '-b:a', '160k', '-map_metadata', '-1', '-id3v2_version', '0', dst]);
      m = loudness(dst);
      if (process.env.DEBUG) console.log('  pass', k, gain.toFixed(2), JSON.stringify(m));
      if (Math.abs(m.lufs - TARGET_LUFS) <= 0.1) break;
      const slope = prev && Math.abs(gain - prev.gain) > 0.05 ? Math.min(1, Math.max(0.2, (m.lufs - prev.lufs) / (gain - prev.gain))) : 1;
      prev = { gain, lufs: m.lufs };
      gain += (TARGET_LUFS - m.lufs) / slope;
    }
    if (Math.abs(m.lufs - TARGET_LUFS) > 0.3) throw Error(c.id + ': ' + m.lufs + ' LUFS after limiting');
    if (m.truePeak > MAX_TRUE_PEAK) throw Error(c.id + ': true peak ' + m.truePeak + ' dBTP');
    const samples = decode(dst);
    const a = analyze(samples, SR, { phaseBeats: c.phaseBeats || 0 });
    const P = 60 / a.bpm, beats = [];
    for (let t = a.firstBeat; t < Math.min(a.lastOnsetSeconds || a.durationSeconds, a.durationSeconds) - P; t += P) beats.push(t);
    const E = lowEnvelope(samples), db = downbeatClarity(beats.map(t => envAt(E, t)));
    cues.push({
      id: c.id, file, title: c.title, author: c.author,
      provenance: { title: c.title, author: c.author, sourceUrl: c.sourceUrl, downloadUrl: c.downloadUrl, ...CC0, licenceLine: c.licenceLine,
        excerpt: { start: c.start, length: LENGTH, fadeIn: FADE_IN, fadeOut: FADE_OUT }, processing: 'Excerpt at native tempo and pitch; static gain ' + gain.toFixed(2) + ' dB and a ' + LIMIT_DB + ' dBFS limiter (4x oversampled) to ' + TARGET_LUFS + ' LUFS; 44.1 kHz stereo MP3 160 kbps.' },
      bpm: a.bpm, firstBeat: a.firstBeat, ...(c.phaseBeats ? { phaseBeats: c.phaseBeats } : {}), grid: a.grid, hitRate: a.hitRate, sixteenthRatio: a.sixteenthRatio,
      // phase: the beat index (0-3 from firstBeat) of beat 1; firstBar: its first time; confidence "high" when ratio >= 1.5.
      downbeat: { ratio: Math.round(db.ratio * 100) / 100, phase: db.phase, firstBar: Math.round((a.firstBeat + db.phase * P) * 1000) / 1000, confidence: db.ratio >= 1.5 ? 'high' : 'low' },
      lufs: m.lufs, lra: m.lra, truePeak: m.truePeak, durationSeconds: a.durationSeconds,
      // Seconds into the cue: the start of the loudest steady 16-beat window, on a bar line.
      defaultSection: defaultSection(a, db.phase, a.durationSeconds),
      sha256: crypto.createHash('sha256').update(fs.readFileSync(dst)).digest('hex'),
      peaks: a.peaks, beatEnergy: a.beatEnergy, onsetThresholds: a.onsetThresholds, onsets: a.onsets,
    });
    const q = cues[cues.length - 1];
    console.log(c.id, JSON.stringify({ before: before.lufs, gain: +gain.toFixed(2), lufs: m.lufs, lra: m.lra, tp: m.truePeak, bpm: a.bpm, firstBeat: a.firstBeat, grid: a.grid, hitRate: a.hitRate, sixteenth: a.sixteenthRatio, downbeat: q.downbeat, defaultSection: q.defaultSection }));
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ version: 1, cues }) + '\n');
}

module.exports = { CUES, downbeatClarity, defaultSection };
