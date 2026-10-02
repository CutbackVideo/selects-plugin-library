#!/usr/bin/env node
// Dev check (macOS or Windows with ffmpeg on PATH): the panel's own-music path (cwvBeatWorkerSource around
// beat-detect.cjs, run as the Worker would) gives exactly the CLI's analyze() result on every bundled cue.
// usage: node plugins/city-weekend-vlog/dev/beat-parity.cjs plugins/city-weekend-vlog
const fs = require('fs'), path = require('path'), vm = require('vm'), { execFileSync } = require('child_process');
const root = process.argv[2];
const panel = fs.readFileSync(path.join(root, 'panel.tsx'), 'utf8');
const block = panel.slice(panel.indexOf('// cwv-beat-worker:start'), panel.indexOf('// cwv-beat-worker:end'));
const box = {}; vm.createContext(box); vm.runInContext(block + '\n;this.src = cwvBeatWorkerSource;', box);
const src = box.src(fs.readFileSync(path.join(root, 'beat-detect.cjs'), 'utf8'));
const cli = require(path.resolve(root, 'beat-detect.cjs'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/cues/manifest.json'), 'utf8'));
for (const cue of manifest.cues) {
  const raw = execFileSync(process.env.FFMPEG || 'ffmpeg', ['-v', 'error', '-t', '360', '-i', path.join(root, 'assets/cues', cue.file), '-ac', '1', '-ar', '22050', '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  const samples = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.byteLength / 4));
  let got = null; const w = { postMessage: m => { got = m; } }; vm.createContext(w);
  vm.runInContext(src, w); w.onmessage({ data: { samples, rate: 22050 } });
  const a = got.ok, b = cli.analyze(samples, 22050);
  const same = JSON.stringify(a) === JSON.stringify(b);
  console.log(cue.id, same ? 'identical' : 'DIFF', a.bpm, a.firstBeat, a.grid, '| manifest', cue.bpm, cue.firstBeat);
}
