// plugins/city-weekend-vlog/dev/build-cues.cjs
// Dev-only: normalize the generated cues to -14 LUFS, measure their grids and write assets/cues/manifest.json.
// Usage: node dev/build-cues.cjs <folder-with-generated-mp3s>
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
];
const src = process.argv[2];
if (!src) throw Error('usage: node dev/build-cues.cjs <folder> | --onsets');
const out = path.resolve(__dirname, '..', 'assets', 'cues');
fs.mkdirSync(out, { recursive: true });
const decode = file => {
  const pcm = execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-i', file, '-ac', '1', '-ar', '22050', '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  return new Float32Array(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + Math.floor(pcm.byteLength / 4) * 4));
};
// Qualifying band onsets for cut snapping (planner cwvSnapCuts), in cue seconds: [[t, 'l' | 'm' | 'h', strength]].
const onsetFields = samples => { const o = bandOnsets(samples, 22050); return { onsetThresholds: o.thresholds, onsets: o.onsets }; };
if (src === '--onsets') {
  const m = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
  m.cues = m.cues.map(c => ({ ...c, ...onsetFields(decode(path.join(out, c.file))) }));
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(m) + '\n');
  m.cues.forEach(c => console.log(c.id, c.onsets.length, 'onsets', JSON.stringify(c.onsetThresholds)));
  process.exit(0);
}
const cues = [];
for (const c of CUES) {
  const file = c.id + '.mp3', dst = path.join(out, file);
  execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', path.join(src, c.source), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '44100', '-ac', '2', '-b:a', '192k', '-map_metadata', '-1', dst]);
  const samples = decode(dst);
  const a = analyze(samples, 22050);
  const usableEnd = Math.round(Math.min(a.durationSeconds, a.lastOnsetSeconds + 0.5) * 100) / 100;
  const stderr = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-i', dst, '-af', 'ebur128', '-f', 'null', '-']).stderr.toString();
  // The last "I: x LUFS" occurrence is the integrated summary.
  const lufs = Number((stderr.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop().match(/-?[\d.]+/)[0]);
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
