'use strict';
// Beat grid for City Weekend Vlog. Spectral-flux onsets, then the tempo and phase whose grid best meets them.
// CLI: node beat-detect.cjs <mono-f32le-file> <sampleRate> [<out.json>]  -> one JSON line on stdout, or, with
// <out.json>, the result written there and {"ok":true} on stdout (the panel's shell output is capped at 48 KB, and a
// long track's onsets can come close). Errors are always {"error": ...} on stdout with exit status 1.
const WIN = 1024, HOP = 256;
// Frame f analyses samples [f*HOP - WIN, f*HOP) (negative indices read as silence, so an onset
// at t = 0 still registers). Its flux measures what entered since frame f-1, i.e. samples
// [f*HOP - HOP, f*HOP); each frame is stamped at the middle of that span so onset times are
// approximately unbiased, +7 ms on clicks (stamping at the window start put every onset ~36 ms early).
const FRAME_LAG = -HOP / 2;
// An onset must rise at least this far above the local flux mean, relative to that mean.
// Measured on picked peaks: white noise 0.05-0.19, a real 99 BPM track 1.15-4.0, clicks 7-11.
const MIN_PROMINENCE = 0.5;
// A beat window below this fraction of the track's median per-beat RMS (-20 dB) is leading silence.
const SILENT_BEAT = 0.1;
// Onsets in the envelope peak about this long after the attack (7 ms on clicks through the flux window). The first
// beat is corrected by it, and the 16th-onset ratio reads the envelope this much after each grid position.
const ONSET_LAG = 0.007;
// 16th-onset ratio window: the envelope maximum within this many seconds of each grid position.
const RATIO_WINDOW = 0.03;

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k], ai = im[i + k];
        const br = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const bi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ar + br; im[i + k] = ai + bi;
        re[i + k + len / 2] = ar - br; im[i + k + len / 2] = ai - bi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

// Spectral flux per frame of `hop` samples; the local mean spans +/- 8 default hops (~93 ms) at any hop.
function onsetEnvelope(x, hop = HOP) {
  const frames = Math.floor(x.length / hop) + 1;
  const radius = Math.round(8 * HOP / hop);
  const win = new Float64Array(WIN).map((_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (WIN - 1)));
  const env = new Float64Array(frames);
  let prev = new Float64Array(WIN / 2);
  const re = new Float64Array(WIN), im = new Float64Array(WIN);
  for (let f = 0; f < frames; f++) {
    for (let i = 0, j = f * hop - WIN; i < WIN; i++, j++) { re[i] = (j >= 0 ? x[j] : 0) * win[i]; im[i] = 0; }
    fft(re, im);
    let flux = 0;
    const mag = new Float64Array(WIN / 2);
    for (let k = 0; k < WIN / 2; k++) {
      mag[k] = Math.log1p(10 * Math.hypot(re[k], im[k]));
      if (f > 0) flux += Math.max(0, mag[k] - prev[k]);
    }
    env[f] = flux; prev = mag;
  }
  // Remove the local mean so sustained loud passages do not look like onsets.
  // Normalising by the maximum makes the envelope scale-free, so `strong` keeps the absolute
  // prominence test that separates real onsets from broadband noise fluctuations.
  const out = new Float64Array(frames), strong = new Uint8Array(frames);
  let max = 0;
  for (let f = 0; f < frames; f++) {
    let s = 0, c = 0;
    for (let k = Math.max(0, f - radius); k < Math.min(frames, f + radius); k++) { s += env[k]; c++; }
    const mean = s / c;
    out[f] = Math.max(0, env[f] - mean);
    strong[f] = out[f] > MIN_PROMINENCE * mean ? 1 : 0;
    if (out[f] > max) max = out[f];
  }
  if (max > 0) for (let f = 0; f < frames; f++) out[f] /= max;
  return { env: out, strong };
}

function gridScore(env, fps, t0, period, phase, t1) {
  let s = 0, c = 0;
  for (let t = phase; t < t1; t += period) {
    const i = Math.round((t - t0) * fps);
    if (i < 1 || i >= env.length - 1) continue;
    s += Math.max(env[i - 1], env[i], env[i + 1]); c++;
  }
  return c ? s / c : 0;
}

function bestPhase(env, fps, t0, period, t1, step) {
  let best = { score: -1, phase: 0 };
  for (let phase = 0; phase < period; phase += step) {
    const score = gridScore(env, fps, t0, period, phase, t1);
    if (score > best.score) best = { score, phase };
  }
  return best;
}

const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// How clearly the music articulates 16th notes: the median onset strength on the 16th offbeats (.25 and .75 of a
// beat) divided by the median on the beats, over [firstBeat, endSeconds). Uses a finer (128-sample) envelope so
// 16ths at up to ~180 BPM stay apart. null when there is no grid or no on-beat onset.
function sixteenthRatio(samples, sampleRate, bpm, firstBeat, endSeconds) {
  if (!(bpm > 0) || !(firstBeat >= 0)) return null;
  const hop = HOP / 2, { env } = onsetEnvelope(samples, hop);
  const rate = sampleRate / hop, t0 = -hop / 2 / sampleRate, q16 = 60 / bpm / 4;
  const end = Math.min(endSeconds == null ? Infinity : endSeconds, samples.length / sampleRate) - 0.05;
  const on = [], off = [];
  for (let q = 0; firstBeat + q * q16 < end; q++) {
    if (q % 4 === 2) continue;
    const t = firstBeat + q * q16;
    if (t < 0.03) continue;
    const c = (t + ONSET_LAG - t0) * rate;
    let m = 0;
    for (let i = Math.max(0, Math.floor(c - RATIO_WINDOW * rate)); i <= Math.min(env.length - 1, Math.ceil(c + RATIO_WINDOW * rate)); i++) m = Math.max(m, env[i]);
    (q % 4 === 0 ? on : off).push(m);
  }
  const a = median(on), b = median(off);
  return a > 0 && b != null ? Math.round(b / a * 1000) / 1000 : null;
}

// Band onsets for cut snapping (planner cwvSnapCuts). Spectral flux of log magnitudes in three bands (low < 150 Hz,
// mid 150-2000 Hz, high > 5 kHz; the bands of the reference-edit analysis), lag-2 difference over a 2.9 ms hop,
// 3-frame smoothing, then peaks that are the maximum within +/- 50 ms. A peak's strength is its flux over the band's
// median flux. It qualifies when the strength reaches the band threshold max(2, 80th percentile of the band's peak
// strengths). Frames are centred on their stamp, which puts the flux peak about 15 ms before the attack (measured on
// synthetic kick, snare and hat hits in every band), so each onset is moved forward by BAND_ONSET_LAG.
const BAND_ONSET_LAG = 0.015;
const ONSET_BANDS = [['l', 20, 150], ['m', 150, 2000], ['h', 5000, Infinity]];
const ONSET_MIN_STRENGTH = 2;
const ONSET_PERCENTILE = 0.8;
function percentile(values, q) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b), x = q * (s.length - 1), i = Math.floor(x);
  return i + 1 < s.length ? s[i] + (s[i + 1] - s[i]) * (x - i) : s[i];
}
// Returns { onsets: [[seconds, band 'l' | 'm' | 'h', strength], ...] sorted by time (qualifying onsets only; time to
// the millisecond, strength to 0.1), thresholds: { l, m, h } (floored to 0.1, so every listed strength reaches its
// band's threshold) }.
function bandOnsets(samples, sampleRate) {
  const scale = Math.max(1, Math.round(sampleRate / 22050));
  const nfft = 1024 * scale, hop = 64 * scale, lag = 2;
  const frames = Math.floor(samples.length / hop) + 1;
  const win = new Float64Array(nfft).map((_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / nfft));
  const bins = ONSET_BANDS.map(([, lo, hi]) => [Math.max(1, Math.ceil(lo * nfft / sampleRate)), Math.min(nfft / 2, Math.ceil(hi * nfft / sampleRate))]);
  const flux = ONSET_BANDS.map(() => new Float64Array(frames));
  // The last `lag` log spectra, kept in a ring so memory stays flat for long tracks.
  const ring = Array.from({ length: lag + 1 }, () => new Float64Array(nfft / 2));
  const re = new Float64Array(nfft), im = new Float64Array(nfft);
  for (let f = 0; f < frames; f++) {
    for (let i = 0, j = f * hop - nfft / 2; i < nfft; i++, j++) { re[i] = (j >= 0 && j < samples.length ? samples[j] : 0) * win[i]; im[i] = 0; }
    fft(re, im);
    const cur = ring[f % (lag + 1)], old = ring[(f + 1) % (lag + 1)];
    for (let k = 0; k < nfft / 2; k++) cur[k] = Math.log1p(100 * Math.hypot(re[k], im[k]));
    if (f < lag) continue;
    bins.forEach(([k0, k1], b) => { let s = 0; for (let k = k0; k < k1; k++) s += Math.max(0, cur[k] - old[k]); flux[b][f] = s; });
  }
  const gap = Math.round(0.05 * sampleRate / hop), onsets = [], thresholds = {};
  ONSET_BANDS.forEach(([band], b) => {
    const d = flux[b], e = new Float64Array(frames);
    for (let f = 0; f < frames; f++) e[f] = ((f > 0 ? d[f - 1] : 0) + d[f] + (f + 1 < frames ? d[f + 1] : 0)) / 3;
    const med = (percentile(Array.from(e), 0.5) || 0) + 1e-9;
    const peaks = [];
    for (let i = 1; i < frames - 1; i++) {
      if (!(e[i] > 0)) continue;
      let top = true;
      for (let q = Math.max(0, i - gap); q <= Math.min(frames - 1, i + gap) && top; q++) if (e[q] > e[i]) top = false;
      if (top) peaks.push([i * hop / sampleRate + BAND_ONSET_LAG, e[i] / med]);
    }
    const thr = Math.floor(Math.max(ONSET_MIN_STRENGTH, percentile(peaks.map(p => p[1]), ONSET_PERCENTILE) || 0) * 10) / 10;
    thresholds[band] = thr;
    for (const [t, s] of peaks) if (s >= thr) onsets.push([Math.round(t * 1000) / 1000, band, Math.round(s * 10) / 10]);
  });
  onsets.sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  return { onsets, thresholds };
}

// opts.phaseBeats (dev only, default 0): move the fitted grid by this many beats before the first beat is chosen,
// for a cue whose grid locked onto the 8th off-beats (dev/build-cues.cjs; never set for own music).
function analyze(samples, sampleRate, opts) {
  const durationSeconds = samples.length / sampleRate;
  const { env, strong } = onsetEnvelope(samples);
  const fps = sampleRate / HOP;
  const t0 = FRAME_LAG / sampleRate;                        // time of frame 0
  const t1 = Math.min(durationSeconds, 60);                 // tempo from the first minute
  let best = { score: -1, bpm: 120, phase: 0 };
  for (let bpm = 70; bpm <= 180; bpm += 0.5) {
    const r = bestPhase(env, fps, t0, 60 / bpm, t1, 0.01);
    if (r.score > best.score) best = { score: r.score, bpm, phase: r.phase };
  }
  for (let bpm = best.bpm - 0.5; bpm <= best.bpm + 0.5; bpm += 0.02) {
    const r = bestPhase(env, fps, t0, 60 / bpm, t1, 0.004);
    if (r.score > best.score) best = { score: r.score, bpm, phase: r.phase };
  }
  // Prefer the octave inside 80-160 BPM when it explains the onsets nearly as well.
  const octave = m => { const r = bestPhase(env, fps, t0, 60 / (best.bpm * m), t1, 0.004); return { score: r.score, bpm: best.bpm * m, phase: r.phase }; };
  if (best.bpm < 80) { const d = octave(2); if (d.score >= 0.9 * best.score) best = d; }
  else if (best.bpm > 160) { const h = octave(0.5); if (h.score >= 0.9 * best.score) best = h; }
  let period = 60 / best.bpm;

  const onsets = [];
  for (let i = 1; i < env.length - 1; i++) if (strong[i] && env[i] > 0.25 && env[i] >= env[i - 1] && env[i] >= env[i + 1]) onsets.push(t0 + i / fps);
  // The +/-1 frame tolerance in gridScore leaves a flat score plateau in both tempo and phase,
  // and the searches keep its lowest value. Fit t = phase + k * period by least squares to the
  // onsets that sit on the grid instead.
  let phase = best.phase;
  const ks = [], ts = [];
  for (const o of onsets) {
    if (o >= t1) break;
    const k = Math.round((o - phase) / period);
    if (Math.abs(o - phase - k * period) < 0.03) { ks.push(k); ts.push(o); }
  }
  if (ks.length >= 8) {
    const n = ks.length, mk = ks.reduce((a, b) => a + b) / n, mt = ts.reduce((a, b) => a + b) / n;
    let sxy = 0, sxx = 0;
    for (let i = 0; i < n; i++) { sxy += (ks[i] - mk) * (ts[i] - mt); sxx += (ks[i] - mk) ** 2; }
    const fit = sxx > 0 ? sxy / sxx : period;
    if (Math.abs(fit - period) < 0.01 * period) { period = fit; phase = mt - fit * mk; }
  }
  if (opts && opts.phaseBeats) phase += opts.phaseBeats * period;
  phase = ((phase % period) + period) % period;
  if (phase > period - 0.03) phase = Math.max(0, phase - period);
  // The first beat is the first grid line that is not leading silence. Judge by level, not by
  // onsets: a first beat with a soft attack (a pad swelling in) is audible music with no onset.
  // Each beat window starts 30 ms early so it holds its own attack but not the next one.
  const beatRms = t => {
    const a = Math.max(0, Math.floor((t - 0.03) * sampleRate)), z = Math.min(samples.length, Math.floor((t + period - 0.03) * sampleRate));
    let q = 0;
    for (let i = a; i < z; i++) q += samples[i] * samples[i];
    return Math.sqrt(q / Math.max(1, z - a));
  };
  const levels = [];
  for (let t = phase; t + period <= durationSeconds; t += period) levels.push(beatRms(t));
  levels.sort((a, b) => a - b);
  const quiet = SILENT_BEAT * (levels.length ? levels[Math.floor(levels.length / 2)] : 0);
  let firstBeat = phase;
  while (firstBeat + period < durationSeconds && beatRms(firstBeat) <= quiet) firstBeat += period;
  if (beatRms(firstBeat) <= quiet) firstBeat = phase;
  // Onsets peak ONSET_LAG after the attack, so the grid fitted to them is that much late (measured 6-8 ms on the
  // bundled cues against the rendered audio). Move the first beat back onto the attack.
  firstBeat = Math.max(0, firstBeat - ONSET_LAG);
  const residuals = [];
  let beats = 0;
  for (let t = firstBeat; t < durationSeconds; t += period) {
    beats++;
    let near = Infinity;
    for (const o of onsets) { const d = Math.abs(o - t); if (d < near) near = d; }
    if (near < 0.07) residuals.push(near * 1000);
  }
  residuals.sort((a, b) => a - b);
  const residualMedianMs = residuals.length ? residuals[Math.floor(residuals.length / 2)] : Infinity;
  const hitRate = beats ? residuals.length / beats : 0;

  const peaks = [];
  const bucket = Math.max(1, Math.floor(samples.length / 400));
  for (let b = 0; b < 400; b++) {
    let m = 0;
    for (let i = b * bucket; i < Math.min(samples.length, (b + 1) * bucket); i++) m = Math.max(m, Math.abs(samples[i]));
    peaks.push(Math.round(m * 1000) / 1000);
  }
  const bands = bandOnsets(samples, sampleRate);
  const beatEnergy = [];
  for (let t = firstBeat; t + period <= durationSeconds; t += period) {
    let s = 0;
    const a = Math.floor(t * sampleRate), z = Math.floor((t + period) * sampleRate);
    for (let i = a; i < z; i++) s += samples[i] * samples[i];
    beatEnergy.push(Math.round(Math.sqrt(s / Math.max(1, z - a)) * 10000) / 10000);
  }
  return {
    durationSeconds: Math.round(durationSeconds * 1000) / 1000,
    bpm: Math.round(6000 / period) / 100,
    firstBeat: Math.round(firstBeat * 1000) / 1000,
    residualMedianMs: Number.isFinite(residualMedianMs) ? Math.round(residualMedianMs * 10) / 10 : null,
    hitRate: Math.round(hitRate * 1000) / 1000,
    accepted: residualMedianMs <= 20 && hitRate >= 0.7,
    lastOnsetSeconds: onsets.length ? Math.round(onsets[onsets.length - 1] * 100) / 100 : 0,
    sixteenthRatio: sixteenthRatio(samples, sampleRate, 60 / period, firstBeat, durationSeconds),
    peaks,
    beatEnergy,
    // Qualifying band onsets and their thresholds (bandOnsets), also when the grid is not accepted: the fixed-timing
    // cuts then snap to low-band onsets.
    onsets: bands.onsets,
    onsetThresholds: bands.thresholds,
  };
}

module.exports = { analyze, sixteenthRatio, bandOnsets };

if (require.main === module) {
  try {
    const [file, rate, out] = process.argv.slice(2);
    const fs = require('node:fs');
    const buf = fs.readFileSync(file);
    const samples = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4));
    const json = JSON.stringify(analyze(samples, Number(rate) || 22050)) + '\n';
    if (out) { fs.writeFileSync(out, json); process.stdout.write('{"ok":true}\n'); } else process.stdout.write(json);
  } catch (e) {
    process.stdout.write(JSON.stringify({ error: String(e && e.message || e) }) + '\n');
    process.exit(1);
  }
}
