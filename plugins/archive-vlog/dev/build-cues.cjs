// plugins/archive-vlog/dev/build-cues.cjs
// Dev-only: bring the cues to -11 LUFS (static gain + a true-peak limiter), measure their grids, onsets and hook windows
// and write assets/cues/manifest.json.
// Usage: node dev/build-cues.cjs <folder-with-generated-mp3s>   (builds the cues whose source is in the folder; a
//        shipped cue without a source keeps its mp3 and grid, and is re-processed from its shipped mp3 only when its
//        recorded loudness is off target; an optional cue with neither is skipped)
//        node dev/build-cues.cjs --onsets   (re-measure only the onsets and hook windows of the shipped cues)
// Env SELECTS_APP_KIT: the selects-app-kit checkout. Its tools/eval/cue-metrics.cjs measures the downbeat (required to
// build or re-process a cue; kept cues are re-measured when it is set and keep their recorded values otherwise).
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { execFileSync, spawnSync } = require('node:child_process');
const { analyze, sixteenthRatio, bandOnsets } = require('../beat-detect.cjs');
const PROVENANCE = "Generated with ElevenLabs Music v2.5 (instrumental) for the Selects plugin library; bundled for use in the plugin's output videos, not for redistribution as standalone tracks. Prompts and sources: THIRD_PARTY.md.";
// Manifest order: reference-type cues first (the two new cues, then the reused City Weekend Vlog ones), the
// alternatives last. group: 'reference' | 'alternative' (the panel labels the list by it).
// Downbeat, measured, never declared: downbeatRatio is the low-band onset median on beat 1 over the median on beats
// 2-4, per beat from firstBeat to usableEnd minus a beat (the cue-metrics.cjs --manifest formula, with its code), and
// downbeatConfidence is 'high' when it is at least 1.5, else 'low'. A built cue first moves firstBeat by whole beats
// (barPhaseBeats, 0-3) to the bar phase with the highest ratio, dropping as many beatEnergy values so that stays
// indexed from firstBeat. At -14 LUFS: Bedroom Pop 1.63 at phase 0 (high); Acoustic Pop 0.83 at phase 0 and 1.48 at
// phase 2, so it starts two beats in; the reused cues 1.20 / 1.25 / 3.28 / 4.52 (indie, disco, soul, lofi; indie and
// disco were checked at every bar phase, indie 1.20 / 0.95 / 0.86 / 0.94, disco 1.25 / 0.81 / 0.70 / 1.02, so they
// keep beat alignment only). Re-measured at -11 LUFS on the same grids (the limiter reshapes the kicks): Bedroom Pop
// 1.70, Acoustic Pop 1.71 (now high), indie 1.35, disco 1.16, soul 3.09, lofi 3.14. The ratio is sensitive to the
// grid (Bedroom Pop reads 1.44 on the 107.99 BPM an analysis of the -11 LUFS file gives), one reason the grid is kept.
// optional: a cue the build skips while its source is missing and it is not shipped yet.
const CUES = [
  { id: 'bedroom-pop-108', label: 'Bedroom Pop', source: 'minivlog-bedroom-pop-108bpm.mp3', group: 'reference', optional: true },
  { id: 'acoustic-pop-104', label: 'Acoustic Pop', source: 'minivlog-acoustic-pop-104bpm.mp3', group: 'reference', optional: true },
  { id: 'weekend-indie-pop', label: 'Weekend Indie Pop', source: 'nyvlog-weekend-indie-pop-112bpm.mp3', group: 'reference' },
  { id: 'golden-hour-disco', label: 'Golden Hour Disco', source: 'nyvlog-golden-hour-disco-104bpm.mp3', group: 'reference' },
  { id: 'sunny-soul-strut', label: 'Sunny Soul Strut', source: 'nyvlog-sunny-soul-strut-99bpm.mp3', group: 'alternative' },
  { id: 'easy-sunday-lofi', label: 'Easy Sunday Lo-fi', source: 'nyvlog-easy-sunday-lofi-88bpm.mp3', group: 'alternative' },
];
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

// Loudness (spec 15.3): -11 LUFS integrated by static gain, then a true-peak limiter at -1 dBTP, so swells keep their
// shape (no dynamic loudnorm). The gain is measured with ebur128; the limiter (alimiter, auto level off, 5 ms attack,
// 50 ms release, its lookahead delay compensated so the grid does not move) runs at 4x the sample rate so it catches
// inter-sample peaks. The mp3 encode adds a little overshoot, so the ceiling starts 0.3 dB under -1 dBTP and both are
// corrected from the encoded file's measurement until it lands within 0.1 LU of the target and at or under -1 dBTP.
const TARGET_LUFS = -11, CEILING_DBTP = -1, LUFS_TOLERANCE = 0.5;
// Integrated loudness (LUFS), loudness range (LU) and true peak (dBTP) from ebur128's summary.
const loudness = file => {
  const err = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr.toString();
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
module.exports = { hookBars, hookStart, HOOK_BEATS, HOOK_STANDARD_QUICK_BEATS, TARGET_LUFS, CEILING_DBTP, LUFS_TOLERANCE };

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
// Encode `input` to the cue's mp3 at the target loudness and measure it. kept: the cue's shipped entry. Loudness
// processing does not move the music (the limiter's lookahead is compensated; cross-correlation with the input: 0 ms
// lag), so a shipped cue keeps its recorded grid (bpm, firstBeat, barPhaseBeats, usableEnd) and only the values that
// depend on the level or the encode are re-measured on it. The beat analysis of the new file is logged as a check: any
// re-encode moves its reading by up to 0.02 BPM and 5 ms (Weekend Indie Pop reads 112 instead of 111.99 after a plain
// re-encode at unchanged level). Only a cue that is not shipped yet takes the detected grid and searches its bar phase.
const buildCue = (c, input, kept) => {
  const file = c.id + '.mp3', dst = path.join(out, file);
  const loud = encodeLoud(input, dst);
  const samples = decode(dst);
  // phaseBeats: a manual half-beat correction for a cue whose grid the phase check does not fix (none since v2.6).
  const a = analyze(samples, 22050, { phaseBeats: c.phaseBeats || 0 });
  let bpm, firstBeat, k, usableEnd, ratios = [];
  if (kept) {
    ({ bpm, firstBeat, usableEnd } = kept);
    k = kept.barPhaseBeats || 0;
    // The detected first beat may be a whole beat off the recorded one (which beat the fit locks first is arbitrary):
    // compare with the nearest recorded beat.
    const P = 60 / bpm, d = a.firstBeat - firstBeat - Math.round((a.firstBeat - firstBeat) / P) * P;
    console.log(c.id, 'grid kept', bpm, firstBeat, '| analysis', a.bpm, a.firstBeat, 'off the grid by', Math.round(d * 1000), 'ms, usableEnd', usableEnd, '| analysis', Math.round(Math.min(a.durationSeconds, a.lastOnsetSeconds + 0.5) * 100) / 100);
  } else {
    bpm = a.bpm;
    usableEnd = Math.round(Math.min(a.durationSeconds, a.lastOnsetSeconds + 0.5) * 100) / 100;
    // Bar phase: the whole-beat offset with the highest beat-1 ratio on the detected grid, then the ratio re-measured
    // on the moved grid (what cue-metrics.cjs --manifest reports for the shipped cue).
    const low = lowPerBeat(dst, a.bpm, a.firstBeat, usableEnd);
    ratios = [0, 1, 2, 3].map(j => beatOneRatio(low, j));
    k = ratios.indexOf(Math.max(...ratios));
    firstBeat = Math.round((a.firstBeat + k * 60 / a.bpm) * 1000) / 1000;
  }
  const downbeatRatio = round2(beatOneRatio(lowPerBeat(dst, bpm, firstBeat, usableEnd), 0));
  console.log(c.id, JSON.stringify(loud), bpm, firstBeat, 'phase +' + k, ratios.map(round2).join('/'), 'downbeat', downbeatRatio, a.residualMedianMs, a.hitRate);
  return withHook({
    id: c.id, label: c.label, group: c.group, file, duration: a.durationSeconds,
    bpm, firstBeat, barPhaseBeats: k, usableEnd,
    lufs: loud.after.lufs, truePeak: loud.after.tp, sha256: crypto.createHash('sha256').update(fs.readFileSync(dst)).digest('hex'),
    downbeatConfidence: downbeatRatio >= DOWNBEAT_HIGH ? 'high' : 'low', downbeatRatio,
    // The 16th-onset ratio over the usable part of the cue decides the title burst (see planner.js).
    sixteenthRatio: sixteenthRatio(samples, 22050, bpm, firstBeat, usableEnd), peaks: a.peaks, beatEnergy: beatEnergyOn(samples, bpm, firstBeat),
    ...onsetFields(samples),
  });
};

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
  const shipped = fs.existsSync(path.join(out, 'manifest.json')) ? JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8')).cues : [];
  const cues = [];
  for (const c of CUES) {
    const kept = shipped.find(k => k.id === c.id);
    if (fs.existsSync(path.join(src, c.source))) {
      if (!kit) throw Error(c.id + ': set SELECTS_APP_KIT to the selects-app-kit checkout to measure the downbeat');
      cues.push(buildCue(c, path.join(src, c.source), kept));
      continue;
    }
    if (!kept && c.optional) { console.log(c.id, 'skipped (no source yet)'); continue; }
    if (!kept) throw Error(c.id + ': ' + c.source + ' is not in ' + src + ' and the cue is not shipped yet');
    if (Math.abs(kept.lufs - TARGET_LUFS) > LUFS_TOLERANCE) {
      // Off-target shipped cue without a source (the reused City Weekend Vlog cues have no originals): re-process a
      // copy of the shipped mp3 (one more lossy generation) on its recorded grid.
      if (!kit) throw Error(c.id + ': set SELECTS_APP_KIT to re-process the shipped cue');
      const copy = path.join(fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'av-cue-')), kept.file);
      fs.copyFileSync(path.join(out, kept.file), copy);
      cues.push(buildCue(c, copy, kept));
      continue;
    }
    // The kept entry takes its group from CUES (placed after the label, like a built entry). Its grid stays; its
    // downbeat is re-measured on that grid when the kit is available.
    const entry = Object.assign({ id: kept.id, label: kept.label, group: c.group }, kept, { group: c.group });
    if (kit) {
      const ratio = round2(beatOneRatio(lowPerBeat(path.join(out, kept.file), kept.bpm, kept.firstBeat, kept.usableEnd), 0));
      Object.assign(entry, { downbeatConfidence: ratio >= DOWNBEAT_HIGH ? 'high' : 'low', downbeatRatio: ratio });
    }
    cues.push(withHook(entry));
    console.log(c.id, 'kept', entry.downbeatRatio, entry.downbeatConfidence);
  }
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ version: 1, provenance: PROVENANCE, cues }) + '\n');
}
if (require.main === module) main();
