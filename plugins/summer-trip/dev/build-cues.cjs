// plugins/summer-trip/dev/build-cues.cjs
// Dev-only: build the bundled music cues. For each cue in <cues.json>:
//   1. decode the source ONCE to 44.1 kHz stereo float PCM;
//   2. normalise it to -14 LUFS with a STATIC gain and a peak limiter (never loudnorm: its dynamic mode flattens the
//      quiet intro -> drop swell the app is built on);
//   3. encode the dry <id>.mp3 (192k) and the wet <id>-muffled.mp3 (muffle.cjs filter, 96k) from that same PCM, so
//      both have the same length, encoder delay and padding (tests/cues.test.cjs checks the alignment);
//   4. measure the grid, drop, downbeat clarity and 16th ratio on the dry mp3 and write the manifest entry.
// Usage: node plugins/summer-trip/dev/build-cues.cjs <cues.json> <outDir> [--manifest <name.json>]
//   <cues.json>: { "provenance"?: string, "cues": [{ "id", "title", "source" }] } (source relative to the json file).
//   The manifest (default manifest.json) is rewritten with exactly these cues, in this order.
//   Development placeholders: ids start with "dev-" and the manifest is dev-manifest.json, all gitignored
//   (plugins/summer-trip/assets/cues/dev-*): node plugins/summer-trip/dev/build-cues.cjs \
//     plugins/summer-trip/dev/dev-cues.json plugins/summer-trip/assets/cues --manifest dev-manifest.json
'use strict';
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), crypto = require('node:crypto');
const { execFileSync, spawnSync } = require('node:child_process');
const { analyze, sixteenthRatio, detectDrop, anchorOnDrop, downbeatClarity, _internal: { octaveBpm, ST_MIN_BPM } } = require('../beat-detect.cjs');
const { ST_MUFFLE_FILTER, ST_MUFFLE_BITRATE } = require('../muffle.cjs');

const TARGET_LUFS = -14;
const LUFS_TOLERANCE = 0.3;
// Sample-peak ceiling of the limiter (-1.5 dBFS, CWV's true-peak target) and its timing. level=false keeps the
// limiter from adding its own make-up gain (auto level is dynamic); latency=1 removes its lookahead delay so the
// output lines up with the input sample for sample.
const LIMIT_DB = -1.5;
const LIMITER = 'alimiter=limit=' + (10 ** (LIMIT_DB / 20)).toFixed(4) + ':attack=5:release=50:level=false:latency=1';
// Tempo drift between the halves (each analysed on its own, octave-matched) above this rejects the cue. The City
// Weekend Vlog cues measure 0.01-0.03 BPM; 0.2 BPM is ~0.1 s of phase error after a minute at 120 BPM.
const DRIFT_MAX_BPM = 0.2;
const SR = 44100, ASR = 22050;

const args = process.argv.slice(2);
const mi = args.indexOf('--manifest');
const manifestName = mi >= 0 ? args.splice(mi, 2)[1] : 'manifest.json';
const [cuesJson, outArg] = args;
if (!cuesJson || !outArg || !manifestName) throw Error('usage: node dev/build-cues.cjs <cues.json> <outDir> [--manifest <name.json>]');
const spec = JSON.parse(fs.readFileSync(cuesJson, 'utf8'));
const list = Array.isArray(spec) ? spec : spec.cues;
const out = path.resolve(outArg);
fs.mkdirSync(out, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'st-cues-'));

const ff = argv => execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', ...argv], { maxBuffer: 1 << 28 });
const rawIn = file => ['-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', file];
// Integrated loudness (LUFS) and sample peak (dBFS) of a raw PCM file.
function loudness(file) {
  const err = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', ...rawIn(file), '-af', 'ebur128=peak=sample', '-f', 'null', '-']).stderr.toString();
  const summary = err.slice(err.lastIndexOf('Summary:'));
  return { lufs: Number(summary.match(/I:\s+(-?[\d.]+) LUFS/)[1]), peak: Number(summary.match(/Peak:\s+(-?[\d.inf]+) dBFS/)[1]) };
}
const decodeMono = file => {
  const pcm = execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-i', file, '-ac', '1', '-ar', String(ASR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  return new Float32Array(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + Math.floor(pcm.byteLength / 4) * 4));
};
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const cues = [];
for (const c of list) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(c.id)) throw Error('bad cue id ' + c.id);
  const source = path.resolve(path.dirname(cuesJson), c.source);
  // 1. Decode once.
  const raw = path.join(tmp, c.id + '.raw.f32'), norm = path.join(tmp, c.id + '.norm.f32');
  ff(['-i', source, '-map', '0:a:0', '-ac', '2', '-ar', String(SR), '-f', 'f32le', raw]);
  // 2. Static gain + limiter, the gain corrected until the limited result is on target.
  const before = loudness(raw);
  let gain = TARGET_LUFS - before.lufs, after;
  for (let pass = 0; pass < 4; pass++) {
    ff([...rawIn(raw), '-af', 'volume=' + gain.toFixed(3) + 'dB,' + LIMITER, '-f', 'f32le', norm]);
    after = loudness(norm);
    if (Math.abs(after.lufs - TARGET_LUFS) <= LUFS_TOLERANCE) break;
    gain += TARGET_LUFS - after.lufs;
  }
  if (fs.statSync(norm).size !== fs.statSync(raw).size) throw Error(c.id + ': the limiter changed the length');
  // 3. Dry and wet from the same PCM.
  const file = c.id + '.mp3', muffledFile = c.id + '-muffled.mp3';
  ff([...rawIn(norm), '-c:a', 'libmp3lame', '-b:a', '192k', '-map_metadata', '-1', path.join(out, file)]);
  ff([...rawIn(norm), '-af', ST_MUFFLE_FILTER, '-c:a', 'libmp3lame', '-b:a', ST_MUFFLE_BITRATE, '-map_metadata', '-1', path.join(out, muffledFile)]);
  const dry = decodeMono(path.join(out, file)), wet = decodeMono(path.join(out, muffledFile));
  if (dry.length !== wet.length) throw Error(c.id + ': dry ' + dry.length + ' vs wet ' + wet.length + ' samples');

  // 4. Measure on the dry mp3, as the app hears it.
  const a = analyze(dry, ASR);
  const bpm = octaveBpm(a.bpm), period = 60 / bpm;
  const half = dry.length >> 1;
  const b1 = octaveBpm(analyze(dry.subarray(0, half), ASR).bpm), b2 = octaveBpm(analyze(dry.subarray(half), ASR).bpm);
  const driftBpm = Math.round((b2 - b1) * 100) / 100;
  let firstBeat = a.firstBeat, drop = detectDrop(dry, ASR, { bpm, firstBeat });
  // A quiet intro below analyze()'s leading-silence level pushes firstBeat towards the drop: re-anchor it.
  if (drop) { const k = anchorOnDrop(drop, bpm, firstBeat); firstBeat = k.firstBeat; drop = { ...drop, dropBeat: k.dropBeat }; }
  const usableEnd = Math.round(Math.min(a.durationSeconds, a.lastOnsetSeconds + 0.5) * 100) / 100;
  const barOrigin = drop ? drop.dropSeconds : firstBeat;
  const downbeat = downbeatClarity(dry, ASR, bpm, barOrigin, barOrigin, usableEnd);
  let rejectReason = null;
  if (!a.accepted) rejectReason = 'beat grid not accepted (residual ' + a.residualMedianMs + ' ms, hit rate ' + a.hitRate + ')';
  else if (bpm < ST_MIN_BPM) rejectReason = 'tempo ' + bpm + ' BPM below ' + ST_MIN_BPM;
  else if (!(Math.abs(driftBpm) <= DRIFT_MAX_BPM)) rejectReason = 'tempo drift ' + driftBpm + ' BPM between the halves';
  const accepted = rejectReason === null;
  const beatEnergy = [];
  for (let t = firstBeat; t + period <= a.durationSeconds; t += period) {
    let s = 0;
    const i0 = Math.floor(t * ASR), i1 = Math.floor((t + period) * ASR);
    for (let i = i0; i < i1; i++) s += dry[i] * dry[i];
    beatEnergy.push(Math.round(Math.sqrt(s / Math.max(1, i1 - i0)) * 10000) / 10000);
  }
  cues.push({
    id: c.id, title: c.title, file, muffledFile,
    bpm: Math.round(bpm * 100) / 100, firstBeat,
    // Beats from firstBeat to the drop's bar line; null when no bar line has a >= 4 dB step after >= 8 quiet beats.
    dropBeat: drop ? drop.dropBeat : null, dropSeconds: drop ? drop.dropSeconds : null, stepDb: drop ? drop.stepDb : null,
    // The drop section starts 8 beats (the title intro) before the drop. { drop: null }: accepted cue without a drop,
    // usable only as ordinary bar-aligned sections. null: the cue is rejected.
    sections: accepted ? { drop: drop ? drop.dropBeat - 8 : null } : null,
    dropNote: drop ? null : 'no bar line with a >= 4 dB loudness step after >= 8 quiet intro beats; ordinary sections only',
    titleHits: null,
    sixteenthRatio: sixteenthRatio(dry, ASR, bpm, firstBeat, usableEnd),
    // Measured (beat-detect.cjs downbeatClarity, the kit's measure) from the drop (else the first beat) on.
    downbeatConfidence: downbeat ? downbeat.confidence : 'low',
    downbeatRatio: downbeat ? downbeat.ratio : null, downbeatBestPhase: downbeat ? downbeat.bestPhase : null,
    duration: a.durationSeconds, usableEnd,
    accepted, rejectReason,
    driftBpm, residualMedianMs: a.residualMedianMs, hitRate: a.hitRate,
    lufs: after.lufs, peakDb: after.peak, gainDb: Math.round(gain * 100) / 100, sourceLufs: before.lufs,
    sha256: sha(path.join(out, file)), muffledSha256: sha(path.join(out, muffledFile)),
    peaks: a.peaks, beatEnergy,
  });
  console.log(c.id, JSON.stringify({ bpm: cues.at(-1).bpm, firstBeat, dropBeat: cues.at(-1).dropBeat, stepDb: cues.at(-1).stepDb,
    downbeat, driftBpm, lufs: after.lufs, gainDb: cues.at(-1).gainDb, accepted, rejectReason }));
}
fs.rmSync(tmp, { recursive: true, force: true });
const manifest = { version: 1, ...(spec.provenance ? { provenance: spec.provenance } : {}), cues };
fs.writeFileSync(path.join(out, manifestName), JSON.stringify(manifest) + '\n');
console.log('wrote', path.join(out, manifestName));
