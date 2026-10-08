// plugins/archive-vlog/dev/build-cues.cjs
// Dev-only: bring the bundled CC0 tracks to -16.3 LUFS (static gain + a true-peak limiter), measure their grids,
// onsets, hook windows and soft-intro starts, and write assets/cues/manifest.json.
// Usage: node dev/build-cues.cjs <folder-with-the-source-mp3s>   (the HoliznaCC0 downloads named in CUES; see
//        assets/cues/LICENSES.csv for where each came from)
//        node dev/build-cues.cjs --onsets   (re-measure only the onsets and hook windows of the shipped cues)
// Env SELECTS_APP_KIT: the selects-app-kit checkout (required to build). Its tools/eval/cue-metrics.cjs measures the
// downbeat and the band onset envelopes the intro detection uses.
// Nothing here edits the music: no time-stretch, no pitch shift, no cut. The tempo is the track's own, measured.
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { execFileSync, spawnSync } = require('node:child_process');
const { analyze, sixteenthRatio, bandOnsets } = require('../beat-detect.cjs');
const PROVENANCE = 'Marimba Motif (Suno, generated for Cutback and bundled with the plugin) and CC0 1.0 (public domain) tracks by HoliznaCC0 from the Free Music Archive, levelled to -16.3 LUFS and re-encoded (no tempo, pitch or structure edit). Track pages and access dates: THIRD_PARTY.md and assets/cues/LICENSES.csv.';
const CC0 = { name: 'CC0 1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/', author: 'HoliznaCC0', accessed: '2026-10-01' };
// Manifest order = panel order; the first is the default (Marimba Motif, Suno). All five sit in the 'reference' group
// (group: 'reference' | 'alternative'; the panel labels the list by it). page: the Free Music Archive track page that
// states the CC0 licence (checked 2026-10-01).
const FMA = 'https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/';
const SUNO = { name: 'Suno (generated for Cutback)', url: '', author: 'Suno for Cutback', accessed: '2026-10-08' };
const CUES = [
  // measureSeconds: the grid is measured on the first part only. Marimba Motif's beat holds (71.03 BPM, median residual
  // 7-9 ms) to about 80 s; its sparse 30-60 s stretch and loose ending pull the whole-file residual to 12 ms.
  { id: 'marimba-motif', label: 'Marimba Motif', source: 'suno-marimba-motif.wav', group: 'reference', page: '', license: SUNO, measureSeconds: 80,
    // The team's reference timeline (Archive Vlog in the Clip highlights demo project) plays the track from 28.8986 s
    // (measured against its audio, about bar 8) and cuts on a 72 BPM grid from there with no onset snapping; the panel
    // runs this cue on that grid (referenceBpm, referenceStart), so the default output has its cuts.
    startBar: 8, referenceBpm: 72, referenceStart: 28.8986 },
  { id: 'peaceful-drift', label: 'Peaceful Drift', source: 'holiznacc0-peaceful-drift.mp3', group: 'reference', page: FMA + 'peaceful-drift-lofi-nostalgic-calm/' },
  { id: 'theta-frequency', label: 'Theta Frequency', source: 'holiznacc0-theta-frequency.mp3', group: 'reference', page: FMA + 'theta-frequency-lofi-chill-calm/' },
  { id: 'before-everything', label: 'Before Everything', source: 'holiznacc0-before-everything.mp3', group: 'reference', page: FMA + 'before-everything-lofi-nostalgic-mp3/' },
  { id: 'fractured', label: 'Fractured', source: 'holiznacc0-fractured.mp3', group: 'reference', page: FMA + 'fractured-1/' },
];
// Downbeat, measured, never declared: downbeatRatio is the low-band onset median on beat 1 over the median on beats
// 2-4, per beat from firstBeat to usableEnd minus a beat (the cue-metrics.cjs --manifest formula, with its code), and
// downbeatConfidence is 'high' when it is at least 1.5, else 'low'. The build first moves firstBeat by whole beats
// (barPhaseBeats, 0-3) to the bar phase with the highest ratio, so beatEnergy, hookBars and introStart are indexed
// from the real bar line (Before Everything: beat-detect locks its first beat at 0.806 s, bar phase 3, so firstBeat
// moves three beats on to 3.206 s).
const DOWNBEAT_HIGH = 1.5;
const kit = process.env.SELECTS_APP_KIT ? require(path.join(path.resolve(process.env.SELECTS_APP_KIT), 'tools', 'eval', 'cue-metrics.cjs')) : null;
// Low-band onset strength per beat from firstBeat (cue-metrics.cjs manifestMode), and the beat-1 ratio at bar phase k.
const lowPerBeat = (file, bpm, firstBeat, usableEnd) => {
  const x = kit.decode(file), E = kit.bandEnvelopes(x), P = 60 / bpm, low = [];
  for (let t = firstBeat; t < usableEnd - P; t += P) low.push(kit.envAt(E.bands.low, E, t));
  return low;
};
const beatOneRatio = (low, k) => kit.median(low.filter((_, i) => (i - k) % 4 === 0 && i >= k)) / kit.median(low.filter((_, i) => i < k || (i - k) % 4 !== 0));
const round2 = v => Math.round(v * 100) / 100, round3 = v => Math.round(v * 1000) / 1000;

// Loudness: -16.3 LUFS integrated (the reference video's level) by static gain, then a true-peak limiter at -1 dBTP,
// so the intro-to-groove swell keeps its shape (no dynamic loudnorm). The gain is measured with ebur128; the limiter
// (alimiter, auto level off, 5 ms attack, 50 ms release, its lookahead delay compensated so the grid does not move)
// runs at 4x the sample rate so it catches inter-sample peaks. The mp3 encode adds a little overshoot, so the ceiling
// starts 0.3 dB under -1 dBTP and both are corrected from the encoded file's measurement until it lands within 0.1 LU
// of the target and at or under -1 dBTP. Output: 44.1 kHz stereo, 192 kbps (the sources are 48 kHz, 320 kbps).
const TARGET_LUFS = -16.3, CEILING_DBTP = -1, LUFS_TOLERANCE = 0.5;
// Integrated loudness (LUFS), loudness range (LU) and true peak (dBTP) from ebur128's summary; `trim` = [from, to]
// seconds measures that part only.
const loudness = (file, trim) => {
  const af = (trim ? 'atrim=' + trim[0].toFixed(3) + ':' + trim[1].toFixed(3) + ',' : '') + 'ebur128=peak=true';
  const err = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-i', file, '-af', af, '-f', 'null', '-']).stderr.toString();
  const sum = err.slice(err.lastIndexOf('Summary:')), num = re => Number(sum.match(re)[1]);
  return { lufs: num(/I:\s+(-?[\d.]+) LUFS/), lra: num(/LRA:\s+(-?[\d.]+) LU/), tp: num(/Peak:\s+(-?[\d.]+) dBFS/) };
};
const encodeLoud = (input, dst) => {
  const before = loudness(input);
  let gain = TARGET_LUFS - before.lufs, ceiling = CEILING_DBTP - 0.3;
  for (let pass = 1; pass <= 8; pass++) {
    const chain = 'volume=' + gain.toFixed(2) + 'dB,aresample=176400,alimiter=limit=' + Math.pow(10, ceiling / 20).toFixed(4) +
      ':attack=5:release=50:level=false:latency=true,aresample=44100';
    execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', input, '-af', chain, '-ar', '44100', '-ac', '2', '-b:a', '192k', '-map_metadata', '-1', dst]);
    const after = loudness(dst);
    if (Math.abs(after.lufs - TARGET_LUFS) <= 0.1 && after.tp <= CEILING_DBTP) {
      // Peak gain reduction: how far the gained input's true peak went over the limiter ceiling.
      return { before, after, gain: round2(gain), ceiling: round2(ceiling), limiterMaxGainReduction: round2(Math.max(0, before.tp + gain - ceiling)), passes: pass };
    }
    if (after.tp > CEILING_DBTP) ceiling -= after.tp - CEILING_DBTP + 0.1;
    gain += TARGET_LUFS - after.lufs;
  }
  throw Error(dst + ': loudness did not converge');
};

// Hook windows (spec 15.3), from the manifest onsets alone ([t, band, strength], see bandOnsets). P = 60 / bpm. Grid
// beat g (0, 1, ...) spans [firstBeat + gP - 0.03, firstBeat + (g + 1)P - 0.03) (the 30 ms lead keeps an onset
// detected a hair before its beat in that beat); beats run while they end by usableEnd.
//   B[g] = the sum of the strengths of every onset in beat g (how much hits there);
//   L[g] = the strongest low-band ('l') onset in beat g (0 when none; per beat, not only on the beat line, so a bass
//          that pushes the off-beats (Weekend Indie Pop, Sunny Soul Strut) still counts).
// Beat 0 is left out of everything: the track's opening hit comes out of silence and is always its strongest onset
// (Bedroom Pop 'l' 22 against a cue p90 of 9.1), so with it bar 0 won on 5 of 6 cues.
// Bar start b (0, 1, ...) is s_b = firstBeat + 4bP; its window is the HOOK_BEATS = 16 beats g = 4b ... 4b + 15 (beat 0
// dropped), and only starts whose window ends by usableEnd are scored (s_b + 16P <= usableEnd), so hookBars has
// floor((usableEnd - firstBeat) / P / 4) - 3 values.
//   contrast_b = p90 / max(1, p50) of B over the window's beats (percentiles with linear interpolation);
//   punch_b    = mean of L over the window's beats / the median strength of the cue's low-band onsets from beat 1 on;
//   fill_b     = 1 when the last beat of one of the window's four bars (g with (g + 1) % 4 == 0) is a fill, B[g] >=
//                1.5 x the median of B over beats 1 ... (the spec 15.1 density rule), else 0. On the phrase-end beat
//                alone (every 16th) no bundled cue reaches 1.5 x: their fills are mostly softer than the qualifying
//                onset thresholds, so the bar ends are the boundaries that can be seen;
//   hookBars[b] = round3(0.45 contrast_b / max contrast + 0.45 punch_b / max punch + 0.1 fill_b), each term normalised
//                by its maximum over the cue's scored starts, so values lie in [0, 1] and the best is at least 0.45.
// A consumer picks the start with the highest hookBars[b] among those whose fitted length fits (s_b + length <=
// usableEnd), earliest on ties. hookStart is that pick for a Standard Quick video (24 one-beat shots), in seconds.
const HOOK_BEATS = 16, HOOK_TOLERANCE = 0.03, HOOK_STANDARD_QUICK_BEATS = 24, HOOK_FILL = 1.5, HOOK_FILL_BONUS = 0.1;
const percentile = (a, q) => {
  const s = [...a].sort((x, y) => x - y), i = q * (s.length - 1), lo = Math.floor(i), hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
};
const hookBars = c => {
  const P = 60 / c.bpm, n = Math.floor((c.usableEnd - c.firstBeat) / P + 1e-9), B = [], L = [];
  for (let g = 0; g < n; g++) {
    const line = c.firstBeat + g * P, w = c.onsets.filter(([t]) => t >= line - HOOK_TOLERANCE && t < line + P - HOOK_TOLERANCE);
    B.push(w.reduce((x, o) => x + o[2], 0));
    L.push(Math.max(0, ...w.filter(o => o[1] === 'l').map(o => o[2])));
  }
  const lowMedian = percentile(c.onsets.filter(([t, band]) => band === 'l' && t >= c.firstBeat + P - HOOK_TOLERANCE).map(o => o[2]), 0.5);
  const beatMedian = percentile(B.slice(1), 0.5), raw = [];
  for (let b = 0; 4 * b + HOOK_BEATS <= n; b++) {
    const gs = Array.from({ length: HOOK_BEATS }, (_, j) => 4 * b + j).filter(g => g > 0), bs = gs.map(g => B[g]);
    const fill = gs.some(g => (g + 1) % 4 === 0 && B[g] >= HOOK_FILL * beatMedian);
    raw.push([percentile(bs, 0.9) / Math.max(1, percentile(bs, 0.5)), gs.reduce((x, g) => x + L[g], 0) / gs.length / lowMedian, fill ? 1 : 0]);
  }
  const maxC = Math.max(...raw.map(r => r[0])) || 1, maxP = Math.max(...raw.map(r => r[1])) || 1;
  return raw.map(([con, pun, fill]) => round3(0.45 * con / maxC + 0.45 * pun / maxP + HOOK_FILL_BONUS * fill));
};
// The best bar start (seconds) for a section of `beats` beats: highest hookBars among the starts that fit.
const hookStart = (c, bars, beats) => {
  const P = 60 / c.bpm; let best = -1;
  bars.forEach((v, b) => { if (c.firstBeat + (4 * b + beats) * P <= c.usableEnd + 1e-9 && (best < 0 || v > bars[best])) best = b; });
  return best < 0 ? null : round3(c.firstBeat + 4 * best * P);
};
const withHook = c => { const bars = hookBars(c); return { ...c, hookBars: bars, hookStart: hookStart(c, bars, HOOK_STANDARD_QUICK_BEATS) }; };
const decode = file => {
  const pcm = execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-i', file, '-ac', '1', '-ar', '22050', '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  return new Float32Array(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + Math.floor(pcm.byteLength / 4) * 4));
};
// Qualifying band onsets for cut snapping (planner avSnapCuts), in cue seconds: [[t, 'l' | 'm' | 'h', strength]].
const onsetFields = samples => { const o = bandOnsets(samples, 22050); return { onsetThresholds: o.thresholds, onsets: o.onsets }; };

// One RMS value per beat from firstBeat (the analyze() beatEnergy formula, on a given grid).
const beatEnergyOn = (samples, bpm, firstBeat) => {
  const P = 60 / bpm, e = [], dur = samples.length / 22050;
  for (let t = firstBeat; t + P <= dur; t += P) {
    let s = 0;
    const a = Math.floor(t * 22050), z = Math.floor((t + P) * 22050);
    for (let i = a; i < z; i++) s += samples[i] * samples[i];
    e.push(Math.round(Math.sqrt(s / Math.max(1, z - a)) * 10000) / 10000);
  }
  return e;
};
// Soft-intro start (spec 7, 7.1). The video opens with 8 beats (opening 6 + credit 2) that should play over the cue's
// soft intro, so the montage starts as the drums come in (the reference's ~6 LU lift at the handover comes from the
// music, not from ducking). introStart is the bar start (firstBeat + k * 4P, k >= 0) INTRO_BEATS beats before the
// groove arrives, measured:
//   groove[b] = the mid-band (150 Hz - 5 kHz, cue-metrics bandEnvelopes) onset strength summed over the 16 sixteenth
//               positions of bar b, over the 75th percentile of that sum across the bars that end by usableEnd. The
//               mid band carries the snare / clap / hat attacks; the low band does not separate the drums from the
//               intro's bass and keys (Peaceful Drift bars 2-3 and Fractured bars 2-5 read as much low-band onset as
//               the groove, at a third of its mid-band onset);
//   rms[b]    = the bar's RMS level in dB (mono, 22.05 kHz).
// The groove arrives at the first bar b >= 1 with groove[b] >= GROOVE_ON, the mean of groove[b .. b + 3] >= GROOVE_ON
// and the mean of rms[b .. b + 3] >= the median bar rms - 3 dB (a whole 4-bar phrase of drums at body level, so a
// lone fill does not count). introStart = the bar INTRO_BEATS / 4 bars earlier, clamped to bar 0. A cue whose drums
// play from bar 0 (no soft intro) gets introStart = firstBeat. introLiftLu = the integrated loudness of the 20 s after
// the intro minus that of the intro itself ([introStart, introStart + INTRO_BEATS * P]), on the built file.
const INTRO_BEATS = 8, GROOVE_ON = 0.6, LIFT_BODY_SECONDS = 20;
// startBar (per cue): the team's reference timeline starts the track on this bar, so the default section starts there
// instead of at the measured soft intro (the arrival is still measured and logged).
const introOf = (file, bpm, firstBeat, usableEnd, startBar) => {
  const x = kit.decode(file), E = kit.bandEnvelopes(x), P = 60 / bpm, sr = 22050, groove = [], rms = [];
  for (let t = firstBeat; t + 4 * P <= usableEnd; t += 4 * P) {
    let m = 0, s = 0;
    for (let j = 0; j < 16; j++) m += kit.envAt(E.bands.mid, E, t + j * P / 4);
    const a = Math.floor(t * sr), z = Math.floor((t + 4 * P) * sr);
    for (let i = a; i < z; i++) s += x[i] * x[i];
    groove.push(m);
    rms.push(10 * Math.log10(s / Math.max(1, z - a) + 1e-12));
  }
  const ref = percentile(groove, 0.75) || 1, g = groove.map(v => v / ref), rmsMedian = percentile(rms, 0.5);
  const mean = a => a.reduce((p, q) => p + q, 0) / a.length;
  let arrival = 0;
  for (let b = 1; b + 4 <= g.length; b++) {
    if (g[b] >= GROOVE_ON && mean(g.slice(b, b + 4)) >= GROOVE_ON && mean(rms.slice(b, b + 4)) >= rmsMedian - 3) { arrival = b; break; }
  }
  if (g[0] >= GROOVE_ON) arrival = 0;
  const bar = Number.isInteger(startBar) ? startBar : Math.max(0, arrival - INTRO_BEATS / 4), introStart = round3(firstBeat + bar * 4 * P);
  const intro = loudness(file, [introStart, introStart + INTRO_BEATS * P]), body = loudness(file, [introStart + INTRO_BEATS * P, introStart + INTRO_BEATS * P + LIFT_BODY_SECONDS]);
  return { arrival, bar, introStart, introLiftLu: round2(body.lufs - intro.lufs), groove: g.map(round2), rms: rms.map(v => Math.round(v * 10) / 10) };
};

// Build one cue from its source mp3: encode at the target loudness, then measure the encoded file. The grid is
// beat-detect's on the built file (bpm as detected, never rounded or forced), moved to the best bar phase.
const buildCue = (c, input) => {
  const file = c.id + '.mp3', dst = path.join(out, file);
  const loud = encodeLoud(input, dst);
  const all = decode(dst), samples = c.measureSeconds ? all.subarray(0, Math.round(c.measureSeconds * 22050)) : all;
  const a = analyze(samples, 22050), whole = samples === all ? a : analyze(all, 22050); // duration and waveform: the whole file
  if (!a.accepted) throw Error(c.id + ': beat-detect did not accept the grid');
  // Tempo-change guard: each half of the file analysed on its own must give the same tempo.
  const half = samples.length >> 1, b1 = analyze(samples.subarray(0, half), 22050).bpm, b2 = analyze(samples.subarray(half), 22050).bpm;
  if (Math.abs(b2 - b1) > 0.1) throw Error(c.id + ': tempo changes between the halves (' + b1 + ' / ' + b2 + ')');
  const bpm = a.bpm, usableEnd = round2(Math.min(a.durationSeconds, a.lastOnsetSeconds + 0.5));
  // Bar phase: the whole-beat offset with the highest beat-1 ratio on the detected grid, then the ratio re-measured on
  // the moved grid (what cue-metrics.cjs --manifest reports for the shipped cue).
  const ratios = [0, 1, 2, 3].map(j => beatOneRatio(lowPerBeat(dst, bpm, a.firstBeat, usableEnd), j));
  const k = ratios.indexOf(Math.max(...ratios)), firstBeat = round3(a.firstBeat + k * 60 / bpm);
  const downbeatRatio = round2(beatOneRatio(lowPerBeat(dst, bpm, firstBeat, usableEnd), 0));
  const intro = introOf(dst, bpm, firstBeat, usableEnd, c.startBar);
  console.log(c.id, JSON.stringify({ gain: loud.gain, limiterMaxGainReduction: loud.limiterMaxGainReduction, before: loud.before, after: loud.after, passes: loud.passes }));
  console.log(c.id, 'bpm', bpm, 'halves', b1, b2, 'firstBeat', firstBeat, 'phase +' + k, ratios.map(round2).join('/'), 'downbeat', downbeatRatio, 'resid', a.residualMedianMs, 'hit', a.hitRate, 'usableEnd', usableEnd);
  console.log(c.id, 'groove by bar', intro.groove.slice(0, 12).join(' '), '| rms', intro.rms.slice(0, 12).join(' '));
  console.log(c.id, 'groove arrives at bar', intro.arrival, '(' + round3(firstBeat + intro.arrival * 240 / bpm) + ' s); introStart bar', intro.bar, '=', intro.introStart, 's; intro->body lift', intro.introLiftLu, 'LU');
  return withHook({
    id: c.id, label: c.label, group: c.group, file, duration: whole.durationSeconds,
    bpm, firstBeat, barPhaseBeats: k, usableEnd, ...(c.measureSeconds ? { gridSeconds: c.measureSeconds } : {}), introStart: intro.introStart, introLiftLu: intro.introLiftLu,
    lufs: loud.after.lufs, truePeak: loud.after.tp, lra: loud.after.lra, sha256: crypto.createHash('sha256').update(fs.readFileSync(dst)).digest('hex'),
    downbeatConfidence: downbeatRatio >= DOWNBEAT_HIGH ? 'high' : 'low', downbeatRatio,
    // The 16th-onset ratio over the usable part of the cue decides the title burst (see planner.js).
    sixteenthRatio: sixteenthRatio(samples, 22050, bpm, firstBeat, usableEnd), peaks: whole.peaks, beatEnergy: beatEnergyOn(samples, bpm, firstBeat),
    ...onsetFields(samples),
    license: (({ name, url, author, accessed }) => ({ name, url, source: c.page, author, accessed }))(c.license || CC0),
    ...(c.referenceBpm ? { referenceBpm: c.referenceBpm, referenceStart: c.referenceStart } : {}),
  });
};

module.exports = { hookBars, hookStart, HOOK_BEATS, HOOK_STANDARD_QUICK_BEATS, TARGET_LUFS, CEILING_DBTP, LUFS_TOLERANCE, INTRO_BEATS };

const out = path.resolve(__dirname, '..', 'assets', 'cues');
function main() {
  const src = process.argv[2];
  if (!src) throw Error('usage: node dev/build-cues.cjs <folder> | --onsets');
  fs.mkdirSync(out, { recursive: true });
  if (src === '--onsets') {
    const m = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
    m.cues = m.cues.map(c => withHook({ ...c, ...onsetFields(decode(path.join(out, c.file))) }));
    fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(m) + '\n');
    m.cues.forEach(c => console.log(c.id, c.onsets.length, 'onsets', JSON.stringify(c.onsetThresholds), 'hookStart', c.hookStart));
    return;
  }
  // A cue whose source is not in the folder keeps its shipped manifest entry unchanged (the HoliznaCC0 originals
  // are not needed to add a new cue); a cue with a source is levelled and measured.
  const shipped = fs.existsSync(path.join(out, 'manifest.json')) ? JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8')).cues : [];
  const cues = CUES.map(c => {
    const input = path.join(src, c.source), kept = shipped.find(k => k.id === c.id);
    if (!fs.existsSync(input)) {
      if (!kept) throw Error(c.id + ': ' + c.source + ' is not in ' + src + ' and the cue is not shipped yet');
      console.log(c.id, 'kept');
      return kept;
    }
    if (!kit) throw Error('set SELECTS_APP_KIT to the selects-app-kit checkout to measure the downbeat and the intro');
    return buildCue(c, input);
  });
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ version: 1, provenance: PROVENANCE, cues }) + '\n');
}
if (require.main === module) main();
