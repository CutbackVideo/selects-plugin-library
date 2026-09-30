// plugins/summer-trip/dev/build-cues.cjs
// Dev-only: build the bundled music cues. For each cue in <cues.json>:
//   1. decode the source ONCE to 44.1 kHz stereo float PCM;
//   2. bring it to -11 LUFS integrated with a STATIC gain and a true-peak limiter at -1 dBTP (never loudnorm: its
//      dynamic mode flattens the quiet intro -> drop swell the app is built on), measured on the encoded dry mp3;
//   3. encode the dry <id>.mp3 (192k) and the wet <id>-muffled.mp3 (muffle.cjs filter, 96k) from that same PCM, so
//      both have the same length, encoder delay and padding (tests/cues.test.cjs checks the alignment);
//   4. measure the grid, drop, downbeat clarity and 16th ratio on the source PCM before the limiter, the waveform peaks
//      and per-beat energy on the dry mp3, and write the manifest entry.
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

// Loudness (the Mini Vlog No.17 approach): -11 LUFS integrated (the similarity reference measures -11.2) by a static
// gain, then a limiter holding the true peak at or under -1 dBTP, so the intro -> drop swell keeps its shape. Both are
// measured with ebur128 on the ENCODED dry mp3 (the file the app plays) and corrected until it lands within
// LUFS_TOLERANCE of the target and at or under the ceiling: the gain by the loudness error, the limiter's sample-peak
// ceiling (it starts CEILING_START_DB under the true-peak target, for inter-sample and mp3 overshoot) by the true-peak
// excess. level=false keeps the limiter from adding its own make-up gain (auto level is dynamic); latency=1 removes its
// lookahead delay so the output lines up with the input sample for sample (the length check below).
const TARGET_LUFS = -11, CEILING_DBTP = -1, CEILING_START_DB = 0.5;
const LUFS_TOLERANCE = 0.1;
const limiter = ceilingDb => 'alimiter=limit=' + (10 ** (ceilingDb / 20)).toFixed(4) + ':attack=5:release=50:level=false:latency=1';
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
// Integrated loudness (LUFS), loudness range (LU) and true peak (dBTP) from ebur128's summary; `input` is ffmpeg input
// arguments (a raw PCM file through rawIn, or ['-i', file]).
function loudness(input) {
  const err = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', ...input, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr.toString();
  const summary = err.slice(err.lastIndexOf('Summary:')), num = re => Number(summary.match(re)[1]);
  return { lufs: num(/I:\s+(-?[\d.]+) LUFS/), lra: num(/LRA:\s+(-?[\d.]+) LU/), truePeak: num(/Peak:\s+(-?[\d.inf]+) dBFS/) };
}
const decodeMono = (file, input = ['-i', file]) => {
  const pcm = execFileSync('ffmpeg', ['-nostdin', '-v', 'error', ...input, '-ac', '1', '-ar', String(ASR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
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
  // 2. Static gain + true-peak limiter, corrected on the encoded dry mp3 until it is on target (3. encodes the dry).
  const file = c.id + '.mp3', muffledFile = c.id + '-muffled.mp3';
  const before = loudness(rawIn(raw));
  let gain = TARGET_LUFS - before.lufs, ceiling = CEILING_DBTP - CEILING_START_DB, after = null, passes = 0;
  for (let pass = 1; pass <= 8 && !after; pass++) {
    ff([...rawIn(raw), '-af', 'volume=' + gain.toFixed(3) + 'dB,' + limiter(ceiling), '-f', 'f32le', norm]);
    ff([...rawIn(norm), '-c:a', 'libmp3lame', '-b:a', '192k', '-map_metadata', '-1', path.join(out, file)]);
    const m = loudness(['-i', path.join(out, file)]);
    if (Math.abs(m.lufs - TARGET_LUFS) <= LUFS_TOLERANCE && m.truePeak <= CEILING_DBTP) { after = m; passes = pass; break; }
    if (m.truePeak > CEILING_DBTP) ceiling -= m.truePeak - CEILING_DBTP + 0.1;
    gain += TARGET_LUFS - m.lufs;
  }
  if (!after) throw Error(c.id + ': loudness did not converge');
  if (fs.statSync(norm).size !== fs.statSync(raw).size) throw Error(c.id + ': the limiter changed the length');
  // 3. Dry (encoded above, from the final PCM) and wet from that same PCM.
  ff([...rawIn(norm), '-af', ST_MUFFLE_FILTER, '-c:a', 'libmp3lame', '-b:a', ST_MUFFLE_BITRATE, '-map_metadata', '-1', path.join(out, muffledFile)]);
  const dry = decodeMono(path.join(out, file)), wet = decodeMono(path.join(out, muffledFile));
  if (dry.length !== wet.length) throw Error(c.id + ': dry ' + dry.length + ' vs wet ' + wet.length + ' samples');

  // 4. The music's structure (grid, drop, downbeat, 16th ratio) is measured on the source PCM before the limiter: at
  // -11 LUFS the limiter takes 2-3 dB off the loud body and not off the quiet intro, which pulls Surf Indie's drop step
  // from 5.2 dB to 3.9 dB, under detectDrop's 4 dB, although the music has not changed (at -14 LUFS the limiter barely
  // acted and both readings agree). The source decode lines up with the encoded mp3s sample for sample (ffmpeg trims
  // the encoder delay). What depends on the level (waveform peaks, per-beat energy) is measured on the dry mp3.
  const src = decodeMono(raw, rawIn(raw));
  if (src.length !== dry.length) console.log(c.id, "source", src.length, "vs dry", dry.length, "samples");
  const a = analyze(src, ASR), heard = analyze(dry, ASR);
  const bpm = octaveBpm(a.bpm), period = 60 / bpm;
  const half = src.length >> 1;
  const b1 = octaveBpm(analyze(src.subarray(0, half), ASR).bpm), b2 = octaveBpm(analyze(src.subarray(half), ASR).bpm);
  const driftBpm = Math.round((b2 - b1) * 100) / 100;
  let firstBeat = a.firstBeat, drop = detectDrop(src, ASR, { bpm, firstBeat });
  // A quiet intro below analyze()'s leading-silence level pushes firstBeat towards the drop: re-anchor it.
  if (drop) { const k = anchorOnDrop(drop, bpm, firstBeat); firstBeat = k.firstBeat; drop = { ...drop, dropBeat: k.dropBeat }; }
  // A silent lead-in (a generated cue opened with a silent bar) leaves firstBeat a bar or more in: move it back by whole
  // bars to the earliest bar line at or after 0, so bar-aligned sections and the manifest grid start at the file start.
  const leadBars = Math.floor((firstBeat + 1e-6) / (4 * period));
  if (leadBars > 0) {
    firstBeat = Math.round((firstBeat - leadBars * 4 * period) * 1000) / 1000;
    if (drop) drop = { ...drop, dropBeat: drop.dropBeat + 4 * leadBars };
  }
  const usableEnd = Math.round(Math.min(a.durationSeconds, a.lastOnsetSeconds + 0.5) * 100) / 100;
  const barOrigin = drop ? drop.dropSeconds : firstBeat;
  const downbeat = downbeatClarity(src, ASR, bpm, barOrigin, barOrigin, usableEnd);
  let rejectReason = null;
  // hitRate is counted up to the last onset (beat-detect.cjs), so it can read 1 on a lone onset: the reason names the grid
  // state first, which already weighs the hit count.
  if (!a.accepted) rejectReason = 'beat grid ' + a.grid + ', not accepted (residual ' + a.residualMedianMs + ' ms, hit rate ' + a.hitRate + ')';
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
    sixteenthRatio: sixteenthRatio(src, ASR, bpm, firstBeat, usableEnd),
    // Measured (beat-detect.cjs downbeatClarity, the kit's measure) from the drop (else the first beat) on.
    downbeatConfidence: downbeat ? downbeat.confidence : 'low',
    downbeatRatio: downbeat ? downbeat.ratio : null, downbeatBestPhase: downbeat ? downbeat.bestPhase : null,
    duration: a.durationSeconds, usableEnd,
    accepted, rejectReason,
    // Diagnostics. hitRate: beat-detect.cjs's active-span rate (lines up to the last onset), written as measured; the
    // committed manifest predates that and holds the whole-file rate (bpm, firstBeat, the drop and acceptance agree).
    driftBpm, residualMedianMs: a.residualMedianMs, hitRate: a.hitRate,
    // Measured on the encoded dry mp3 (ebur128): integrated loudness, loudness range, true peak; the static gain and
    // the limiter's sample-peak ceiling that produced it; the source's loudness.
    lufs: after.lufs, lra: after.lra, truePeak: after.truePeak, gainDb: Math.round(gain * 100) / 100,
    limiterCeilingDb: Math.round(ceiling * 100) / 100, loudnessPasses: passes, sourceLufs: before.lufs, sourceLra: before.lra,
    sha256: sha(path.join(out, file)), muffledSha256: sha(path.join(out, muffledFile)),
    peaks: heard.peaks, beatEnergy,
  });
  console.log(c.id, JSON.stringify({ bpm: cues.at(-1).bpm, firstBeat, dropBeat: cues.at(-1).dropBeat, stepDb: cues.at(-1).stepDb,
    downbeat, driftBpm, lufs: after.lufs, lra: after.lra, truePeak: after.truePeak, gainDb: cues.at(-1).gainDb, passes, accepted, rejectReason }));
}
fs.rmSync(tmp, { recursive: true, force: true });
const manifest = { version: 1, ...(spec.provenance ? { provenance: spec.provenance } : {}), cues };
fs.writeFileSync(path.join(out, manifestName), JSON.stringify(manifest) + '\n');
console.log('wrote', path.join(out, manifestName));
