// plugins/mini-vlog/dev/build-cues.cjs
// Dev-only: normalize the generated cues to -14 LUFS, measure their grids and write assets/cues/manifest.json.
// Usage: node dev/build-cues.cjs <folder-with-generated-mp3s>   (builds the cues whose source is in the folder; the
//        others keep their shipped mp3 and manifest entry unchanged)
//        node dev/build-cues.cjs --onsets   (re-measure only the onsets of the shipped cues; every other value stays)
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { execFileSync, spawnSync } = require('node:child_process');
const { analyze, sixteenthRatio, bandOnsets } = require('../beat-detect.cjs');
const PROVENANCE = "Generated with ElevenLabs Music for this plugin; bundled for use in the plugin's output videos, not for redistribution as standalone tracks.";
const CUES = [
  { id: 'sunny-soul-strut', label: 'Sunny Soul Strut', source: 'nyvlog-sunny-soul-strut-99bpm.mp3', downbeatConfidence: 'high' },
  { id: 'golden-hour-disco', label: 'Golden Hour Disco', source: 'nyvlog-golden-hour-disco-104bpm.mp3', downbeatConfidence: 'low' },
  { id: 'easy-sunday-lofi', label: 'Easy Sunday Lo-fi', source: 'nyvlog-easy-sunday-lofi-88bpm.mp3', downbeatConfidence: 'high' },
  { id: 'weekend-indie-pop', label: 'Weekend Indie Pop', source: 'nyvlog-weekend-indie-pop-112bpm.mp3', downbeatConfidence: 'low' },
  // v2.5 drum-forward cues. downbeatConfidence: 'high' when the low-band onset median on beat 1 is at least 1.5x the
  // median on beats 2-4 (measured on the shipped mp3 and its grid), else 'low'. The first four measure 3.28 / 1.25 /
  // 4.52 / 1.20. Boom bap 1.86 -> high. Funk break 2.53 on the corrected grid -> high. Afro house 0.95 (1.08 at its
  // best bar phase) -> low: the kick is four on the floor, so no beat of the bar stands out (low-band medians by bar
  // position 0.96 / 1.05 / 1.02 / 0.97).
  { id: 'brooklyn-boom-bap', label: 'Brooklyn Boom Bap', source: 'boom-bap-neosoul-90bpm.mp3', downbeatConfidence: 'high' },
  // The broadband fit locks onto the 8th off-beats (0.341 s); beat-detect.cjs's phase check (v2.6) moves it half a beat
  // to 0.034 s, where the kick opens bar 1 at 0.03 s and the snare lands on beats 2 and 4 (v2.5 set phaseBeats: -0.5).
  { id: 'downtown-funk-break', label: 'Downtown Funk Break', source: 'funk-breakbeat-98bpm.mp3', downbeatConfidence: 'high' },
  { id: 'sunset-afro-house', label: 'Sunset Afro House', source: 'afro-house-lite-115bpm.mp3', downbeatConfidence: 'low' },
];
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
    if (!kept) throw Error(c.id + ': ' + c.source + ' is not in ' + src + ' and the cue is not shipped yet');
    cues.push(kept);
    console.log(c.id, 'kept');
    continue;
  }
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
    // Single-pass loudnorm undershoots on a dense, limited master (Sunset Afro House: -15.2 LUFS). Run the documented
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
  cues.push({
    id: c.id, label: c.label, file, duration: a.durationSeconds,
    bpm: a.bpm, firstBeat: a.firstBeat, usableEnd,
    lufs, sha256: crypto.createHash('sha256').update(fs.readFileSync(dst)).digest('hex'),
    // The 16th-onset ratio over the usable part of the cue decides the title burst (see planner.js).
    downbeatConfidence: c.downbeatConfidence, sixteenthRatio: sixteenthRatio(samples, 22050, a.bpm, a.firstBeat, usableEnd), peaks: a.peaks, beatEnergy: a.beatEnergy,
    ...onsetFields(samples),
  });
  console.log(c.id, a.bpm, a.firstBeat, lufs, a.residualMedianMs, a.hitRate);
}
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ version: 1, provenance: PROVENANCE, cues }) + '\n');
