// plugins/torn-paper-love/dev/build-cues.cjs
// Dev-only: normalize the generated cues to -14 LUFS, measure their grids and write assets/cues/manifest.json.
// Usage: node dev/build-cues.cjs <folder-with-generated-mp3s>   (builds the cues whose source is in the folder; the
//        others keep their shipped mp3 and manifest entry unchanged)
//        node dev/build-cues.cjs --onsets   (re-measure only the onsets of the shipped cues; every other value stays)
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { execFileSync, spawnSync } = require('node:child_process');
const { analyze, sixteenthRatio, bandOnsets } = require('../beat-detect.cjs');
const PROVENANCE = "Generated with ElevenLabs Music: Bedroom Pop Love, Slow R&B Glow and First Love Guitar for Torn Paper Love; Easy Sunday Lo-fi and Sunny Soul Strut for City Weekend Vlog, reused by Torn Paper Love. Bundled for use in the plugin's output videos, not for redistribution as standalone tracks.";
// The Track picked when the panel opens.
const DEFAULT_CUE = 'bedroom-pop-love';
// Manifest order. downbeatConfidence: 'high' when beat 1 of the bar is clear in the low band (kick on 1 and 3,
// low-band clarity >= 1.5), else 'low'.
// phaseBeats (optional): moves the detected grid by this many beats after tempo and phase detection and the phase
// sanity check (beat-detect.cjs analyze opts.phaseBeats), before the first beat, beat energy and 16th ratio are taken.
// First Love Guitar: the detector locks half a beat late onto the snare (first beat 0.371 s); the kick is on the
// beat half a beat earlier (low band 1.43 vs 0.46 at the snare phase), so its grid moves back half a beat.
const CUES = [
  { id: 'bedroom-pop-love', label: 'Bedroom Pop Love', source: 'torn-paper-love-bedroom-pop-86bpm.mp3', downbeatConfidence: 'high' },
  { id: 'slow-rnb-glow', label: 'Slow R&B Glow', source: 'torn-paper-love-slow-rnb-84bpm.mp3', downbeatConfidence: 'high' },
  { id: 'first-love-guitar', label: 'First Love Guitar', source: 'torn-paper-love-guitar-pop-88bpm.mp3', downbeatConfidence: 'low', phaseBeats: -0.5 },
  { id: 'easy-sunday-lofi', label: 'Easy Sunday Lo-fi', source: 'nyvlog-easy-sunday-lofi-88bpm.mp3', downbeatConfidence: 'high' },
  { id: 'sunny-soul-strut', label: 'Sunny Soul Strut', source: 'nyvlog-sunny-soul-strut-99bpm.mp3', downbeatConfidence: 'high' },
];
const src = process.argv[2];
if (!src) throw Error('usage: node dev/build-cues.cjs <folder> | --onsets');
const out = path.resolve(__dirname, '..', 'assets', 'cues');
fs.mkdirSync(out, { recursive: true });
const decode = file => {
  const pcm = execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-i', file, '-ac', '1', '-ar', '22050', '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  return new Float32Array(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + Math.floor(pcm.byteLength / 4) * 4));
};
// Qualifying band onsets for cut snapping (planner cut snapping), in cue seconds: [[t, 'l' | 'm' | 'h', strength]].
const onsetFields = samples => { const o = bandOnsets(samples, 22050); return { onsetThresholds: o.thresholds, onsets: o.onsets }; };
if (src === '--onsets') {
  const m = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
  m.cues = m.cues.map(c => ({ ...c, ...onsetFields(decode(path.join(out, c.file))) }));
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(m) + '\n');
  m.cues.forEach(c => console.log(c.id, c.onsets.length, 'onsets', JSON.stringify(c.onsetThresholds)));
  process.exit(0);
}
const shippedManifest = fs.existsSync(path.join(out, 'manifest.json')) ? JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8')) : {};
const shipped = shippedManifest.cues || [];
const defaultCue = DEFAULT_CUE;
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
  const input = path.join(src, c.source);
  const encode = filter => execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', input, '-af', filter, '-ar', '44100', '-ac', '2', '-b:a', '192k', '-map_metadata', '-1', dst]);
  const measure = () => {
    const stderr = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-i', dst, '-af', 'ebur128', '-f', 'null', '-']).stderr.toString();
    // The last "I: x LUFS" occurrence is the integrated summary.
    return Number((stderr.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop().match(/-?[\d.]+/)[0]);
  };
  const loudnormJson = filter => {
    const stderr = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-i', input, '-af', filter + ':print_format=json', '-f', 'null', '-']).stderr.toString();
    return JSON.parse(stderr.slice(stderr.lastIndexOf('{'), stderr.lastIndexOf('}') + 1));
  };
  // Linear (static gain) normalization only: dynamic loudnorm flattens the swells of a cue. Two-pass loudnorm with
  // linear=true is a static gain when the true-peak ceiling allows it; when it would fall back to dynamic mode, use a
  // static gain into a -1.5 dBTP limiter instead.
  const j = loudnormJson(LOUDNORM);
  const linear = LOUDNORM + ':linear=true:measured_I=' + j.input_i + ':measured_TP=' + j.input_tp + ':measured_LRA=' + j.input_lra + ':measured_thresh=' + j.input_thresh + ':offset=' + j.target_offset;
  let normalization = loudnormJson(linear).normalization_type;
  if (normalization === 'linear') encode(linear);
  else { normalization = 'gain+limiter'; encode('volume=' + (-14 - Number(j.input_i)).toFixed(2) + 'dB,alimiter=limit=0.84:level=false'); }
  const lufs = measure();
  const samples = decode(dst);
  // phaseBeats: the per-cue half-beat correction above, for a grid the phase check does not fix.
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
  console.log(c.id, a.bpm, a.firstBeat, lufs, normalization, a.residualMedianMs, a.hitRate);
}
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ version: 1, provenance: PROVENANCE, defaultCue, cues }) + '\n');
