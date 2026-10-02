#!/usr/bin/env node
// Regression evidence for the in-panel beat detection (adapted from Selfie Aesthetic's dev/beat-parity.cjs): for each
// audio file, decode it exactly as the panel does (ffmpeg, mono f32le at TEC_PCM_RATE, first TEC_PCM_SECONDS), then
// compare
//   (a) the CLI path: `node beat-detect.cjs <pcm> <rate> <out.json>` (the plugin's own detector, used by the dev tools)
//   (b) the panel path: tecBeatWorkerSource(<kit-beat-detect.cjs text>) from panel.tsx, run in node:vm with a fake
//       Worker `self`, fed the same PCM as a transferred buffer
// and report bpm, firstBeat and grid for each. (a) and (b) must be identical (the whole result JSON).
// Usage: node plugins/the-end-credits/dev/beat-parity.cjs [--json out.json] <audio files or folders...>
// Build-time tool (macOS dev machine): needs ffmpeg on PATH.
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const panel = fs.readFileSync(path.join(root, 'panel.tsx'), 'utf8');
const cliFile = path.join(root, 'beat-detect.cjs');
const kitText = fs.readFileSync(path.join(root, 'kit-beat-detect.cjs'), 'utf8');

function block(start, end) {
  const a = panel.indexOf('\n' + start + '\n'), b = panel.indexOf('\n' + end + '\n', a + 1);
  if (a < 0 || b < 0) throw new Error('panel.tsx: markers not found: ' + start);
  return panel.slice(a + start.length + 2, b);
}
const workerBox = {};
vm.createContext(workerBox);
vm.runInContext(block('// tec-beat-worker:start', '// tec-beat-worker:end') + '\nglobalThis.W = { TEC_PCM_RATE, TEC_PCM_SECONDS, tecBeatWorkerSource };', workerBox);
const W = workerBox.W;

function decode(file, tmp) {
  const out = path.join(tmp, 'pcm.f32');
  // The panel's argv (tecHostDecodePcm).
  execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-t', String(W.TEC_PCM_SECONDS), '-i', file, '-vn', '-ac', '1', '-ar', String(W.TEC_PCM_RATE), '-f', 'f32le', out]);
  return out;
}
function viaCli(pcmPath, tmp) {
  const out = path.join(tmp, 'cli.json');
  execFileSync(process.execPath, [cliFile, pcmPath, String(W.TEC_PCM_RATE), out]);
  return JSON.parse(fs.readFileSync(out, 'utf8'));
}
function viaWorker(pcmBytes) {
  let reply = null;
  const self = { postMessage: (m) => { reply = m; } };
  const box = { self, Math, Float32Array, Float64Array, Int32Array, Uint8Array, Array, Number, Object, JSON, Infinity, NaN, String, Error };
  vm.createContext(box);
  vm.runInContext(W.tecBeatWorkerSource(kitText), box);
  const buf = pcmBytes.buffer.slice(pcmBytes.byteOffset, pcmBytes.byteOffset + pcmBytes.byteLength);
  self.onmessage({ data: { id: 1, buf, rate: W.TEC_PCM_RATE } });
  if (!reply || !reply.ok) throw new Error('worker failed: ' + (reply && reply.error));
  // Through JSON, like the CLI's file (and postMessage's structured clone drops nothing here).
  return JSON.parse(JSON.stringify(reply.result));
}

const pick = (r) => ({ bpm: r.bpm, firstBeat: r.firstBeat, grid: r.grid });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const args = process.argv.slice(2);
let jsonOut = null;
const inputs = [];
for (let i = 0; i < args.length; i++) { if (args[i] === '--json') jsonOut = args[++i]; else inputs.push(args[i]); }
const files = [];
for (const p of inputs) {
  if (fs.statSync(p).isDirectory()) for (const f of fs.readdirSync(p).sort()) { if (/\.(mp3|wav|m4a|aac|flac|ogg)$/i.test(f)) files.push(path.join(p, f)); }
  else files.push(p);
}
if (!files.length) { console.error('usage: beat-parity.cjs [--json out.json] <audio files or folders>'); process.exit(2); }

const rows = [];
let mismatches = 0;
for (const file of files) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tec-parity-'));
  try {
    const pcmPath = decode(file, tmp);
    const bytes = new Uint8Array(fs.readFileSync(pcmPath));
    const cli = viaCli(pcmPath, tmp);
    const t0 = Date.now();
    const worker = viaWorker(bytes);
    const workerMs = Date.now() - t0;
    const identical = same(cli, worker);
    if (!identical) mismatches++;
    rows.push({ file: path.basename(file), seconds: +(bytes.byteLength / 4 / W.TEC_PCM_RATE).toFixed(1), cli: pick(cli), worker: pick(worker), identical, workerMs });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
console.log('file | s | CLI bpm/firstBeat/grid | panel worker | identical | worker ms');
for (const r of rows) {
  const f = (x) => x.bpm + ' / ' + x.firstBeat + ' / ' + x.grid;
  console.log([r.file, r.seconds, f(r.cli), f(r.worker), r.identical ? 'yes' : 'NO', r.workerMs].join(' | '));
}
const summary = { files: rows.length, identical: rows.length - mismatches, mismatches };
console.log(JSON.stringify(summary));
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ summary, rows }, null, 1));
process.exit(mismatches ? 1 : 0);
