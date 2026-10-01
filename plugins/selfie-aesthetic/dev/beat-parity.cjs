#!/usr/bin/env node
// Regression evidence for the in-panel beat detection: for each audio file, decode it exactly as the panel does
// (ffmpeg, mono f32le at SAE_PCM_RATE, first SAE_PCM_SECONDS), then compare
//   (a) the kit CLI path: `node beat-detect.cjs <pcm> <rate> <out.json>`
//   (b) the panel path: saeBeatWorkerSource(<beat-detect.cjs text>) from panel.tsx, run in node:vm with a fake
//       Worker `self`, fed the same PCM as a transferred buffer
//   (c) the panel's main-thread fallback: the pasted saeBeat block on the first SAE_FALLBACK_SECONDS
// and report bpm, firstBeat and grid for each. (a) and (b) must be identical; (c) is reported, not required equal.
// Usage: node plugins/selfie-aesthetic/dev/beat-parity.cjs [--json out.json] <audio files or folders...>
// Build-time tool (macOS dev machine): needs ffmpeg on PATH.
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const panel = fs.readFileSync(path.join(root, 'panel.tsx'), 'utf8');
const detectorFile = path.join(root, 'beat-detect.cjs');
const detectorText = fs.readFileSync(detectorFile, 'utf8');

function block(start, end) {
  const a = panel.indexOf('\n' + start + '\n'), b = panel.indexOf('\n' + end + '\n', a + 1);
  if (a < 0 || b < 0) throw new Error('panel.tsx: markers not found: ' + start);
  return panel.slice(a + start.length + 2, b);
}
// The worker block is plain JS: SAE_PCM_RATE, SAE_PCM_SECONDS, SAE_FALLBACK_SECONDS, saeBeatWorkerSource.
const workerBox = {};
vm.createContext(workerBox);
vm.runInContext(block('// sae-beat-worker:start', '// sae-beat-worker:end')
  + '\nglobalThis.W = { SAE_PCM_RATE, SAE_PCM_SECONDS, SAE_FALLBACK_SECONDS, saeBeatWorkerSource };', workerBox);
const W = workerBox.W;
const fallbackBox = { Math, Float32Array, Float64Array, Int32Array, Uint8Array, Array, Number, Object, JSON, Infinity, NaN };
vm.createContext(fallbackBox);
vm.runInContext(block('// sae-beat:start', '// sae-beat:end') + '\nglobalThis.B = saeBeat;', fallbackBox);

function decode(file, tmp) {
  const out = path.join(tmp, 'pcm.f32');
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', file, '-t', String(W.SAE_PCM_SECONDS),
    '-vn', '-ac', '1', '-ar', String(W.SAE_PCM_RATE), '-f', 'f32le', out]);
  return out;
}

function viaCli(pcmPath, tmp) {
  const out = path.join(tmp, 'cli.json');
  execFileSync(process.execPath, [detectorFile, pcmPath, String(W.SAE_PCM_RATE), out]);
  return JSON.parse(fs.readFileSync(out, 'utf8'));
}

function viaWorker(pcmBytes) {
  let reply = null;
  const self = { postMessage: (m) => { reply = m; } };
  const box = { self, Math, Float32Array, Float64Array, Int32Array, Uint8Array, Array, Number, Object, JSON, Infinity, NaN, String, Error };
  vm.createContext(box);
  vm.runInContext(W.saeBeatWorkerSource(detectorText), box);
  const buf = pcmBytes.buffer.slice(pcmBytes.byteOffset, pcmBytes.byteOffset + pcmBytes.byteLength);
  self.onmessage({ data: { id: 1, buf, rate: W.SAE_PCM_RATE } });
  if (!reply || !reply.ok) throw new Error('worker failed: ' + (reply && reply.error));
  return reply.result;
}

function viaFallback(pcmBytes) {
  const n = Math.min(Math.floor(pcmBytes.byteLength / 4), W.SAE_FALLBACK_SECONDS * W.SAE_PCM_RATE);
  const buf = pcmBytes.buffer.slice(pcmBytes.byteOffset, pcmBytes.byteOffset + n * 4);
  return fallbackBox.B.analyze(new Float32Array(buf), W.SAE_PCM_RATE);
}

const pick = (r) => ({ bpm: r.bpm, firstBeat: r.firstBeat, grid: r.grid });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const args = process.argv.slice(2);
let jsonOut = null;
const inputs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--json') jsonOut = args[++i];
  else inputs.push(args[i]);
}
const files = [];
for (const p of inputs) {
  if (fs.statSync(p).isDirectory()) for (const f of fs.readdirSync(p).sort()) { if (/\.(mp3|wav|m4a|aac|flac|ogg)$/i.test(f)) files.push(path.join(p, f)); }
  else files.push(p);
}
if (!files.length) { console.error('usage: beat-parity.cjs [--json out.json] <audio files or folders>'); process.exit(2); }

const rows = [];
let mismatches = 0;
for (const file of files) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sae-parity-'));
  try {
    const pcmPath = decode(file, tmp);
    const bytes = new Uint8Array(fs.readFileSync(pcmPath));
    const cli = viaCli(pcmPath, tmp);
    const t0 = Date.now();
    const worker = viaWorker(bytes);
    const workerMs = Date.now() - t0;
    const t1 = Date.now();
    const fallback = viaFallback(bytes);
    const fallbackMs = Date.now() - t1;
    const full = same(cli, worker);
    if (!full) mismatches++;
    rows.push({ file: path.basename(file), seconds: +(bytes.byteLength / 4 / W.SAE_PCM_RATE).toFixed(1), cli: pick(cli), worker: pick(worker),
      identical: full, workerMs, fallback: pick(fallback), fallbackMs, fallbackSame: same(pick(cli), pick(fallback)) });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
console.log('file | s | CLI bpm/firstBeat/grid | panel worker | identical | fallback (60 s) | same | worker ms');
for (const r of rows) {
  const f = (x) => x.bpm + ' / ' + x.firstBeat + ' / ' + x.grid;
  console.log([r.file, r.seconds, f(r.cli), f(r.worker), r.identical ? 'yes' : 'NO', f(r.fallback), r.fallbackSame ? 'yes' : 'no', r.workerMs].join(' | '));
}
const summary = { files: rows.length, identical: rows.length - mismatches, mismatches, fallbackSame: rows.filter(r => r.fallbackSame).length };
console.log(JSON.stringify(summary));
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ summary, rows }, null, 1));
process.exit(mismatches ? 1 : 0);
