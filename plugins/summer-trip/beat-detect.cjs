'use strict';
// Beat grid for Summer Trip (copied from City Weekend Vlog, plus drop detection and downbeat clarity). Spectral-flux onsets, then the tempo and phase whose grid best meets them.
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
// The smoothed flux of each band ([low, mid, high] Float64Arrays), the hop in samples and the frame count; frame i is
// stamped at i * hop / sampleRate, so an onset peaking at frame i is at that time + BAND_ONSET_LAG.
function bandFlux(samples, sampleRate) {
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
  const smooth = flux.map(d => {
    const e = new Float64Array(frames);
    for (let f = 0; f < frames; f++) e[f] = ((f > 0 ? d[f - 1] : 0) + d[f] + (f + 1 < frames ? d[f + 1] : 0)) / 3;
    return e;
  });
  return { flux: smooth, hop, frames };
}

// Returns { onsets: [[seconds, band 'l' | 'm' | 'h', strength], ...] sorted by time (qualifying onsets only; time to
// the millisecond, strength to 0.1), thresholds: { l, m, h } (floored to 0.1, so every listed strength reaches its
// band's threshold) }. `flux` (a bandFlux result) is reused when given.
function bandOnsets(samples, sampleRate, flux) {
  const { flux: smooth, hop, frames } = flux || bandFlux(samples, sampleRate);
  const gap = Math.round(0.05 * sampleRate / hop), onsets = [], thresholds = {};
  ONSET_BANDS.forEach(([band], b) => {
    const e = smooth[b];
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

// Phase sanity check (v2.6). The broadband fit can lock onto the 8th off-beats when hats or ghost notes on the "and"s
// carry more flux than the beats (Downtown Funk Break: first beat 0.341 s, half a beat late). On the beat the kick
// (low band) should hit, and in 4/4 pop and funk the snare (mid band) marks every other beat (the backbeat, 2 and 4).
// For the fitted phase and the phase half a beat on, over [0, t1): low = the mean low-band flux peak within
// PHASE_WINDOW of each grid line; backbeat = the mean mid-band peak on the stronger of the two alternating beat sets
// (which beat is 1 is unknown). The phase moves only when the other grid wins on both, by PHASE_LOW_MARGIN and
// PHASE_BACKBEAT_MARGIN: a track with its bass on the off-beats (Weekend Indie Pop: low 1.66x on the off-beats, but
// backbeat 1.01x) or the reference edit's music (low 1.28x, backbeat 0.76x) keeps its grid. Measured on the bundled
// cues' fitted grids: Downtown Funk Break low 1.16x / backbeat 1.22x on the other phase; every other cue, the reference
// audio and the two Sinatra references at most 1.03x backbeat when low is above 1.
const PHASE_WINDOW = 0.03;
const PHASE_LOW_MARGIN = 1.05;
const PHASE_BACKBEAT_MARGIN = 1.1;
function phaseEvidence(bf, sampleRate, attack, period, t1) {
  const peak = (e, t) => {
    const c = (t - BAND_ONSET_LAG) * sampleRate / bf.hop, r = PHASE_WINDOW * sampleRate / bf.hop;
    let m = 0;
    for (let i = Math.max(0, Math.floor(c - r)); i <= Math.min(e.length - 1, Math.ceil(c + r)); i++) if (e[i] > m) m = e[i];
    return m;
  };
  let low = 0, n = 0;
  const mid = [0, 0], count = [0, 0];
  for (let t = attack; t < t1 - 0.05; t += period, n++) {
    low += peak(bf.flux[0], t);
    mid[n % 2] += peak(bf.flux[1], t); count[n % 2]++;
  }
  return { beats: n, low: n ? low / n : 0, backbeat: Math.max(count[0] ? mid[0] / count[0] : 0, count[1] ? mid[1] / count[1] : 0) };
}
// true when the grid half a beat on is clearly the beat (phaseEvidence of both, at the attack times).
function offBeatLocked(bf, sampleRate, attack, period, t1) {
  const fit = phaseEvidence(bf, sampleRate, attack, period, t1), alt = phaseEvidence(bf, sampleRate, attack + period / 2, period, t1);
  if (fit.beats < 8 || alt.beats < 8 || !(fit.low > 0) || !(fit.backbeat > 0)) return false;
  return alt.low >= PHASE_LOW_MARGIN * fit.low && alt.backbeat >= PHASE_BACKBEAT_MARGIN * fit.backbeat;
}

// opts.phaseBeats (dev only, default 0): move the grid by this many beats before the first beat is chosen, after the
// phase sanity check (offBeatLocked); no bundled cue needs it since v2.6.
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
  // Level, first beat and acceptance of the grid at one phase (fitted phase, before opts.phaseBeats).
  const evaluate = ph => {
    ph = ((ph % period) + period) % period;
    if (ph > period - 0.03) ph = Math.max(0, ph - period);
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
    for (let t = ph; t + period <= durationSeconds; t += period) levels.push(beatRms(t));
    levels.sort((a, b) => a - b);
    const quiet = SILENT_BEAT * (levels.length ? levels[Math.floor(levels.length / 2)] : 0);
    let fb = ph;
    while (fb + period < durationSeconds && beatRms(fb) <= quiet) fb += period;
    if (beatRms(fb) <= quiet) fb = ph;
    // Onsets peak ONSET_LAG after the attack, so the grid fitted to them is that much late (measured 6-8 ms on the
    // bundled cues against the rendered audio). Move the first beat back onto the attack.
    fb = Math.max(0, fb - ONSET_LAG);
    const residuals = [];
    let beats = 0;
    for (let t = fb; t < durationSeconds; t += period) {
      beats++;
      let near = Infinity;
      for (const o of onsets) { const d = Math.abs(o - t); if (d < near) near = d; }
      if (near < 0.07) residuals.push(near * 1000);
    }
    residuals.sort((a, b) => a - b);
    const med = residuals.length ? residuals[Math.floor(residuals.length / 2)] : Infinity;
    const rate = beats ? residuals.length / beats : 0;
    return { firstBeat: fb, residualMedianMs: med, hitRate: rate, accepted: med <= 20 && rate >= 0.7 };
  };
  // The fitted phase is on the onset-envelope peaks, ONSET_LAG after the attacks that the band flux is stamped at.
  // The half-beat move is refused when it would lose the acceptance that the fitted phase had.
  const bf = bandFlux(samples, sampleRate);
  const shift = opts && opts.phaseBeats ? opts.phaseBeats * period : 0;
  let g = evaluate(phase + shift);
  if (offBeatLocked(bf, sampleRate, phase - ONSET_LAG, period, t1)) {
    const flipped = evaluate(phase + period / 2 + shift);
    if (!(g.accepted && !flipped.accepted)) g = flipped;
  }
  const { firstBeat, residualMedianMs, hitRate, accepted } = g;

  const peaks = [];
  const bucket = Math.max(1, Math.floor(samples.length / 400));
  for (let b = 0; b < 400; b++) {
    let m = 0;
    for (let i = b * bucket; i < Math.min(samples.length, (b + 1) * bucket); i++) m = Math.max(m, Math.abs(samples[i]));
    peaks.push(Math.round(m * 1000) / 1000);
  }
  const bands = bandOnsets(samples, sampleRate, bf);
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
    accepted,
    lastOnsetSeconds: onsets.length ? Math.round(onsets[onsets.length - 1] * 100) / 100 : 0,
    sixteenthRatio: sixteenthRatio(samples, sampleRate, 60 / period, firstBeat, durationSeconds),
    peaks,
    beatEnergy,
    // Qualifying band onsets and their thresholds (bandOnsets), also when the grid is not accepted: the fixed-timing
    // cuts then snap to low-band onsets.
    onsets: bands.onsets,
    onsetThresholds: bands.thresholds,
    // Summer Trip: the drop (detectDrop on the tempo-octave grid, null when none qualifies) and the downbeat clarity
    // measured from the drop (or the first beat) on, with the drop's bar line as beat 1.
    ...dropAndDownbeat(samples, sampleRate, 60 / period, firstBeat),
  };
}

// ---- Summer Trip additions -------------------------------------------------------------------------------------

// Tempo octave (spec 15.5): of bpm/2, bpm and 2 bpm, the one closest to 120 BPM in log scale. The detector itself
// reports 80-160 BPM, so in practice only 70-84.85 BPM doubles. Below ST_MIN_BPM after this, the build uses fixed
// timing. The planner has its own copy (stOctave); this one is internal to the cue build and the drop grid.
const ST_MIN_BPM = 70;
function octaveBpm(bpm) {
  if (!(bpm > 0)) return null;
  return [bpm / 2, bpm, bpm * 2].reduce((a, b) => (Math.abs(Math.log2(b / 120)) < Math.abs(Math.log2(a / 120)) ? b : a));
}

// Drop detection. Bars are 4 beats of the given grid, their lines at firstBeat + 4k beats, extended back towards the
// file start (a quiet intro can sit below analyze()'s leading-silence level, which pushes firstBeat onto the drop).
// A bar's level is its RMS in dB; a 2-bar level is the dB of the mean power of the two bars. The drop is the FIRST bar
// line (opts.pick = 'largest': the largest step instead, spec 7.3's own-music wording) where
//   - the bar line is at least DROP_MIN_BEATS beats from the file start (the 2-bar title intro fits before it),
//   - the next 2 bars are at least DROP_STEP_DB louder than the previous 2 bars, and
//   - the previous 2 bars are quiet relative to the track: at least DROP_QUIET_DB below the median bar level.
// Returns { dropBeat, dropSeconds, stepDb } with dropBeat in beats from firstBeat (it can be below 8, even negative,
// when firstBeat skipped a quiet intro; the cue build re-anchors firstBeat then), or null.
const DROP_MIN_BEATS = 8;
const DROP_STEP_DB = 4;
const DROP_QUIET_DB = 3;
function detectDrop(samples, sampleRate, grid, opts) {
  const bpm = grid && grid.bpm, firstBeat = grid && grid.firstBeat;
  if (!(bpm > 0) || !(firstBeat >= 0)) return null;
  const period = 60 / bpm, bar = 4 * period, duration = samples.length / sampleRate;
  const power = (a, z) => {
    const i0 = Math.max(0, Math.floor(a * sampleRate)), i1 = Math.min(samples.length, Math.floor(z * sampleRate));
    let q = 0;
    for (let i = i0; i < i1; i++) q += samples[i] * samples[i];
    return i1 > i0 ? q / (i1 - i0) : 0;
  };
  const dB = p => 10 * Math.log10(p + 1e-12);
  // Bar k starts at origin + k * bar; origin is the earliest bar line at or after 0 s (small tolerance for rounding).
  const origin = firstBeat - Math.floor((firstBeat + 1e-6) / bar) * bar;
  const bars = [];
  for (let t = origin; t + bar <= duration + 1e-6; t += bar) bars.push(power(t, t + bar));
  if (bars.length < 4) return null;
  const median = [...bars].map(dB).sort((a, b) => a - b)[bars.length >> 1];
  let best = null;
  for (let k = 2; k + 2 <= bars.length; k++) {
    const t = origin + k * bar;
    if (t < DROP_MIN_BEATS * period - 1e-6) continue;
    const before = dB((bars[k - 2] + bars[k - 1]) / 2), after = dB((bars[k] + bars[k + 1]) / 2), step = after - before;
    if (step < DROP_STEP_DB || before > median - DROP_QUIET_DB) continue;
    const hit = { dropBeat: Math.round((t - firstBeat) / period), dropSeconds: Math.round(t * 1000) / 1000, stepDb: Math.round(step * 10) / 10 };
    if (!(opts && opts.pick === 'largest')) return hit;
    if (!best || hit.stepDb > best.stepDb) best = hit;
  }
  return best;
}

// Downbeat clarity, the kit's cue-metrics "downbeat" measure (selects-app-kit tools/eval/cue-metrics.cjs, copied so
// the 1.5 threshold means the same here): the low-band (< 150 Hz) log-magnitude spectral flux with its local mean
// (+/- 93 ms) removed, its maximum within 20 ms of each beat; the median on beat 1 of each bar over the median on beats
// 2-4, over the beats in [from, end - 1 beat), bar lines at barOrigin + 4k beats. ratio >= DOWNBEAT_HIGH -> 'high'.
// bestPhase is the bar position (0-3) with the highest ratio (0 = the given bar lines are the clearest). Measured,
// never declared. On the seven City Weekend Vlog cues the kit gives 3.28 / 1.25 / 4.52 / 1.20 / 1.86 / 2.53 / 0.95 and
// this copy 3.22 / 1.23 / 3.98 / 1.36 / 1.57 / 2.57 / 0.95 (it reads to the end of the file, the kit to its usable
// end): the same high/low on every cue.
const DOWNBEAT_HIGH = 1.5;
function lowBandEnvelope(x, sampleRate) {
  const W = 1024, H = 128, frames = Math.floor(x.length / H) + 1, kLow = Math.round(150 * W / sampleRate);
  const win = new Float64Array(W).map((_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (W - 1)));
  const env = new Float64Array(frames), re = new Float64Array(W), im = new Float64Array(W);
  let prev = null;
  for (let f = 0; f < frames; f++) {
    for (let i = 0, j = f * H - W; i < W; i++, j++) { re[i] = (j >= 0 && j < x.length ? x[j] : 0) * win[i]; im[i] = 0; }
    fft(re, im);
    const mag = new Float64Array(kLow + 1);
    let lo = 0;
    for (let k = 1; k <= kLow; k++) {
      mag[k] = Math.log1p(10 * Math.hypot(re[k], im[k]));
      if (prev) lo += Math.max(0, mag[k] - prev[k]);
    }
    env[f] = lo / kLow; prev = mag;
  }
  const out = new Float64Array(frames), R = 16;
  for (let f = 0; f < frames; f++) {
    let s = 0, c = 0;
    for (let q = Math.max(0, f - R); q < Math.min(frames, f + R); q++) { s += env[q]; c++; }
    out[f] = Math.max(0, env[f] - s / c);
  }
  return { env: out, rate: sampleRate / H, t0: -H / 2 / sampleRate };
}
function downbeatClarity(samples, sampleRate, bpm, barOrigin, from, end) {
  if (!(bpm > 0)) return null;
  const E = lowBandEnvelope(samples, sampleRate), period = 60 / bpm;
  const stop = Math.min(end == null ? Infinity : end, samples.length / sampleRate) - period;
  const at = t => {
    const c = (t - E.t0) * E.rate, w = 0.02 * E.rate;
    let m = 0;
    for (let i = Math.max(0, Math.floor(c - w)); i <= Math.min(E.env.length - 1, Math.ceil(c + w)); i++) m = Math.max(m, E.env[i]);
    return m;
  };
  const vals = [];
  for (let k = Math.ceil((from - barOrigin) / period - 1e-6); barOrigin + k * period < stop; k++) vals.push([((k % 4) + 4) % 4, at(barOrigin + k * period)]);
  if (vals.length < 16) return null;
  const ratios = [0, 1, 2, 3].map(ph => {
    const one = vals.filter(v => (v[0] - ph + 4) % 4 === 0).map(v => v[1]), rest = vals.filter(v => (v[0] - ph + 4) % 4 !== 0).map(v => v[1]);
    return median(one) / (median(rest) || 1e-9);
  });
  const ratio = Math.round(ratios[0] * 100) / 100;
  return { ratio, confidence: ratio >= DOWNBEAT_HIGH ? 'high' : 'low', bestPhase: ratios.indexOf(Math.max(...ratios)) };
}

// A quiet intro below analyze()'s leading-silence level pushes firstBeat onto (or towards) the drop, so detectDrop's
// dropBeat can be below 8. Re-anchor the first beat on the drop's bar grid at the file's first bar line, so dropBeat
// counts the intro (>= 8, a multiple of 4). Returns { firstBeat, dropBeat } (unchanged when dropBeat >= 8).
function anchorOnDrop(drop, bpm, firstBeat) {
  if (!drop || drop.dropBeat >= DROP_MIN_BEATS) return { firstBeat, dropBeat: drop ? drop.dropBeat : null };
  const period = 60 / bpm, bar = 4 * period;
  const fb = Math.round((drop.dropSeconds - Math.floor((drop.dropSeconds + 1e-6) / bar) * bar) * 1000) / 1000;
  return { firstBeat: fb, dropBeat: Math.round((drop.dropSeconds - fb) / period) };
}

// The drop on the octave grid and the downbeat clarity from it (analyze() and the cue build share this). The drop
// carries its grid: bpm (the tempo-octave choice, which can differ from analyze()'s bpm for 70-85 BPM detections)
// and firstBeat (analyze()'s, re-anchored by anchorOnDrop), dropBeat counting from that firstBeat in beats of bpm.
function dropAndDownbeat(samples, sampleRate, bpm, firstBeat) {
  const obpm = octaveBpm(bpm), drop = obpm ? detectDrop(samples, sampleRate, { bpm: obpm, firstBeat }) : null;
  const barOrigin = drop ? drop.dropSeconds : firstBeat;
  return {
    drop: drop ? { ...drop, ...anchorOnDrop(drop, obpm, Math.round(firstBeat * 1000) / 1000), bpm: Math.round(obpm * 100) / 100 } : null,
    downbeat: obpm ? downbeatClarity(samples, sampleRate, obpm, barOrigin, barOrigin, null) : null,
  };
}

module.exports = { analyze, sixteenthRatio, bandOnsets, bandFlux, detectDrop, anchorOnDrop, downbeatClarity, dropAndDownbeat, _internal: { octaveBpm, ST_MIN_BPM, DROP_MIN_BEATS, DROP_STEP_DB, DROP_QUIET_DB, DOWNBEAT_HIGH } };

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
