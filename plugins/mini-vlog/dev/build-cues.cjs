// plugins/mini-vlog/dev/build-cues.cjs
// Dev-only: normalize the generated cues to -14 LUFS, measure their grids and write assets/cues/manifest.json.
// Usage: node dev/build-cues.cjs <folder-with-generated-mp3s>   (builds the cues whose source is in the folder; the
//        others keep their shipped mp3 and manifest entry unchanged; an optional cue with neither is skipped)
//        node dev/build-cues.cjs --onsets   (re-measure only the onsets of the shipped cues; every other value stays)
// Env SELECTS_APP_KIT: the selects-app-kit checkout. Its tools/eval/cue-metrics.cjs measures the downbeat (required to
// build a cue; kept cues are re-measured when it is set and keep their recorded values otherwise).
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
// indexed from firstBeat. Measured: Bedroom Pop 1.63 at phase 0 (high); Acoustic Pop 0.83 at phase 0 and 1.48 at
// phase 2 (1.43 re-measured on the moved grid), so it starts two beats in and stays low. The reused cues measure 1.20 / 1.25 / 3.28 / 4.52 (indie, disco,
// soul, lofi); indie and disco were checked at every bar phase (indie 1.20 / 0.95 / 0.86 / 0.94, disco 1.25 / 0.81 /
// 0.70 / 1.02), so they keep beat alignment only.
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
const round2 = v => Math.round(v * 100) / 100;
const src = process.argv[2];
if (!src) throw Error('usage: node dev/build-cues.cjs <folder> | --onsets');
const out = path.resolve(__dirname, '..', 'assets', 'cues');
fs.mkdirSync(out, { recursive: true });
const decode = file => {
  const pcm = execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-i', file, '-ac', '1', '-ar', '22050', '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  return new Float32Array(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + Math.floor(pcm.byteLength / 4) * 4));
};
// Qualifying band onsets for cut snapping (planner mvSnapCuts), in cue seconds: [[t, 'l' | 'm' | 'h', strength]].
const onsetFields = samples => { const o = bandOnsets(samples, 22050); return { onsetThresholds: o.thresholds, onsets: o.onsets }; };
if (src === '--onsets') {
  const m = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
  m.cues = m.cues.map(c => ({ ...c, ...onsetFields(decode(path.join(out, c.file))) }));
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(m) + '\n');
  m.cues.forEach(c => console.log(c.id, c.onsets.length, 'onsets', JSON.stringify(c.onsetThresholds)));
  process.exit(0);
}
const shipped = fs.existsSync(path.join(out, 'manifest.json')) ? JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8')).cues : [];
const cues = [];
for (const c of CUES) {
  const file = c.id + '.mp3', dst = path.join(out, file);
  if (!fs.existsSync(path.join(src, c.source))) {
    const kept = shipped.find(k => k.id === c.id);
    if (!kept && c.optional) { console.log(c.id, 'skipped (no source yet)'); continue; }
    if (!kept) throw Error(c.id + ': ' + c.source + ' is not in ' + src + ' and the cue is not shipped yet');
    // The kept entry takes its group from CUES (placed after the label, like a built entry). Its grid stays; its
    // downbeat is re-measured on that grid when the kit is available.
    const entry = Object.assign({ id: kept.id, label: kept.label, group: c.group }, kept, { group: c.group });
    if (kit) {
      const ratio = round2(beatOneRatio(lowPerBeat(path.join(out, kept.file), kept.bpm, kept.firstBeat, kept.usableEnd), 0));
      Object.assign(entry, { downbeatConfidence: ratio >= DOWNBEAT_HIGH ? 'high' : 'low', downbeatRatio: ratio });
    }
    cues.push(entry);
    console.log(c.id, 'kept', entry.downbeatRatio, entry.downbeatConfidence);
    continue;
  }
  if (!kit) throw Error(c.id + ': set SELECTS_APP_KIT to the selects-app-kit checkout to measure the downbeat');
  const LOUDNORM = 'loudnorm=I=-14:TP=-1.5:LRA=11';
  const encode = filter => execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', path.join(src, c.source), '-af', filter, '-ar', '44100', '-ac', '2', '-b:a', '192k', '-map_metadata', '-1', dst]);
  const measure = () => {
    const stderr = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-i', dst, '-af', 'ebur128', '-f', 'null', '-']).stderr.toString();
    // The last "I: x LUFS" occurrence is the integrated summary.
    return Number((stderr.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop().match(/-?[\d.]+/)[0]);
  };
  encode(LOUDNORM);
  let lufs = measure();
  if (Math.abs(lufs + 14) > 0.5) {
    // Single-pass loudnorm undershoots on a dense, limited master (City Weekend Vlog's Sunset Afro House: -15.2 LUFS). Run the documented
    // two-pass form with the source's measured loudness instead.
    const stats = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-i', path.join(src, c.source), '-af', LOUDNORM + ':print_format=json', '-f', 'null', '-']).stderr.toString();
    const j = JSON.parse(stats.slice(stats.lastIndexOf('{'), stats.lastIndexOf('}') + 1));
    encode(LOUDNORM + ':measured_I=' + j.input_i + ':measured_TP=' + j.input_tp + ':measured_LRA=' + j.input_lra + ':measured_thresh=' + j.input_thresh + ':offset=' + j.target_offset);
    lufs = measure();
  }
  const samples = decode(dst);
  // phaseBeats: a manual half-beat correction for a cue whose grid the phase check does not fix (none since v2.6).
  const a = analyze(samples, 22050, { phaseBeats: c.phaseBeats || 0 });
  const usableEnd = Math.round(Math.min(a.durationSeconds, a.lastOnsetSeconds + 0.5) * 100) / 100;
  // Bar phase: the whole-beat offset with the highest beat-1 ratio on the detected grid, then the ratio re-measured
  // on the moved grid (what cue-metrics.cjs --manifest reports for the shipped cue).
  const low = lowPerBeat(dst, a.bpm, a.firstBeat, usableEnd), ratios = [0, 1, 2, 3].map(k => beatOneRatio(low, k));
  const k = ratios.indexOf(Math.max(...ratios));
  const firstBeat = Math.round((a.firstBeat + k * 60 / a.bpm) * 1000) / 1000;
  const downbeatRatio = round2(beatOneRatio(lowPerBeat(dst, a.bpm, firstBeat, usableEnd), 0));
  cues.push({
    id: c.id, label: c.label, group: c.group, file, duration: a.durationSeconds,
    bpm: a.bpm, firstBeat, barPhaseBeats: k, usableEnd,
    lufs, sha256: crypto.createHash('sha256').update(fs.readFileSync(dst)).digest('hex'),
    // The 16th-onset ratio over the usable part of the cue decides the title burst (see planner.js).
    downbeatConfidence: downbeatRatio >= DOWNBEAT_HIGH ? 'high' : 'low', downbeatRatio,
    sixteenthRatio: sixteenthRatio(samples, 22050, a.bpm, firstBeat, usableEnd), peaks: a.peaks, beatEnergy: a.beatEnergy.slice(k),
    ...onsetFields(samples),
  });
  console.log(c.id, a.bpm, a.firstBeat, '+' + k + ' beats ->', firstBeat, 'downbeat', ratios.map(round2).join('/'), '->', downbeatRatio, lufs, a.residualMedianMs, a.hitRate);
}
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ version: 1, provenance: PROVENANCE, cues }) + '\n');
