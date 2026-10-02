#!/usr/bin/env node
// Regression evidence for the in-panel beat detection of "Your own music" (kit windows.md rule 3): for each audio file,
// decode it exactly as the panel does (ffmpeg, mono f32le at OWN_RATE, first OWN_MAX_SECONDS: av-host hostDecodePcm's
// arguments), then compare
//   (a) the kit CLI path: `node beat-detect.cjs <pcm> <rate> <out.json>`
//   (b) the panel path: avBeatWorkerSource(<beat-detect.cjs text>) from panel.tsx (the av-beat-worker block), run in
//       node:vm with a fake Worker global, fed the same samples as the panel's analyseBeat posts them
// The two results must be identical (the whole JSON); bpm, firstBeat and grid are printed per file.
// Usage: node plugins/mini-vlog/dev/beat-parity.cjs [--json out.json] [--synth] <audio files or folders...>
//   --synth adds two generated tracks (a 97 BPM drum loop of 60 s and a 128 BPM one of 260 s, past the 240 s cap).
// Build-time tool (dev machine): needs ffmpeg on PATH.
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

function block(name) {
  const a = panel.indexOf('// ' + name + ':start\n'), b = panel.indexOf('// ' + name + ':end', a);
  if (a < 0 || b < 0) throw new Error('panel.tsx: markers not found: ' + name);
  return panel.slice(a, b);
}
const num = (name) => Number((new RegExp('const ' + name + ' = (\\d+);').exec(panel) || [])[1]);
const RATE = num('OWN_RATE'), SECONDS = num('OWN_MAX_SECONDS');
if (!(RATE > 0 && SECONDS > 0)) throw new Error('panel.tsx: OWN_RATE / OWN_MAX_SECONDS not found');
const workerBox = {};
vm.createContext(workerBox);
vm.runInContext(block('av-beat-worker') + '\nglobalThis.avBeatWorkerSource = avBeatWorkerSource;', workerBox);
const workerSource = workerBox.avBeatWorkerSource(detectorText);

// The panel's decode (hostDecodePcm): -t before -i, mono, OWN_RATE, f32le.
function decode(file, tmp) {
  const out = path.join(tmp, 'pcm.f32');
  execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-t', String(SECONDS), '-i', file, '-ac', '1', '-ar', String(RATE), '-f', 'f32le', out]);
  return out;
}
function viaCli(pcmPath, tmp) {
  const out = path.join(tmp, 'cli.json');
  execFileSync(process.execPath, [detectorFile, pcmPath, String(RATE), out]);
  return JSON.parse(fs.readFileSync(out, 'utf8'));
}
function viaWorker(bytes) {
  let reply = null;
  const box = { postMessage: (m) => { reply = m; }, Math, Float32Array, Float64Array, Int32Array, Uint8Array, Array, Number, Object, JSON, Infinity, NaN, String, Error };
  vm.createContext(box);
  vm.runInContext(workerSource, box);
  // hostDecodePcm copies the bytes so the samples sit on a 4-byte boundary, then posts { samples, rate }.
  const samples = new Float32Array(bytes.slice(0, Math.floor(bytes.byteLength / 4) * 4).buffer);
  box.onmessage({ data: { samples, rate: RATE } });
  if (!reply || reply.error || !reply.ok) throw new Error('worker failed: ' + (reply && reply.error));
  return reply.ok;
}

// A drum loop: kick on every beat, snare on 2 and 4, closed hats on eighths, a little noise; 16-bit mono WAV.
function synth(file, bpm, seconds, sr = 44100) {
  const n = Math.round(seconds * sr), pcm = new Int16Array(n);
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  const beat = 60 / bpm, add = (at, len, f) => { const s = Math.round(at * sr); for (let i = 0; i < len && s + i < n; i++) pcm[s + i] = Math.max(-32767, Math.min(32767, pcm[s + i] + f(i))); };
  for (let k = 0, t = 0.25; t < seconds; k++, t = 0.25 + k * beat / 2) {
    if (k % 2 === 0) add(t, 6000, (i) => 14000 * Math.exp(-i / 1500) * Math.sin(2 * Math.PI * (60 + 90 * Math.exp(-i / 400)) * i / sr));
    if (k % 4 === 2) add(t, 4000, (i) => 7000 * Math.exp(-i / 900) * rnd());
    add(t, 900, (i) => 2500 * Math.exp(-i / 200) * rnd());
  }
  const head = Buffer.alloc(44);
  head.write('RIFF', 0); head.writeUInt32LE(36 + n * 2, 4); head.write('WAVE', 8); head.write('fmt ', 12); head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20); head.writeUInt16LE(1, 22); head.writeUInt32LE(sr, 24); head.writeUInt32LE(sr * 2, 28); head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34);
  head.write('data', 36); head.writeUInt32LE(n * 2, 40);
  fs.writeFileSync(file, Buffer.concat([head, Buffer.from(pcm.buffer)]));
  return file;
}

const pick = (r) => ({ bpm: r.bpm, firstBeat: r.firstBeat, grid: r.grid, durationSeconds: r.durationSeconds });
const args = process.argv.slice(2);
let jsonOut = null, withSynth = false;
const inputs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--json') jsonOut = args[++i];
  else if (args[i] === '--synth') withSynth = true;
  else inputs.push(args[i]);
}
const files = [];
for (const p of inputs) {
  if (fs.statSync(p).isDirectory()) for (const f of fs.readdirSync(p).sort()) { if (/\.(mp3|wav|m4a|aac|flac|ogg)$/i.test(f)) files.push(path.join(p, f)); }
  else files.push(p);
}
const synthDir = withSynth ? fs.mkdtempSync(path.join(os.tmpdir(), 'mv-parity-synth-')) : null;
if (synthDir) files.push(synth(path.join(synthDir, 'synth-97bpm-60s.wav'), 97, 60), synth(path.join(synthDir, 'synth-128bpm-260s.wav'), 128, 260));
if (!files.length) { console.error('usage: beat-parity.cjs [--json out.json] [--synth] <audio files or folders>'); process.exit(2); }

const rows = [];
let mismatches = 0;
for (const file of files) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mv-parity-'));
  try {
    const pcmPath = decode(file, tmp);
    const bytes = new Uint8Array(fs.readFileSync(pcmPath));
    const t0 = Date.now();
    const cli = viaCli(pcmPath, tmp);
    const cliMs = Date.now() - t0;
    const t1 = Date.now();
    const worker = viaWorker(bytes);
    const workerMs = Date.now() - t1;
    const identical = JSON.stringify(cli) === JSON.stringify(worker);
    if (!identical) mismatches++;
    rows.push({ file: path.basename(file), seconds: +(bytes.byteLength / 4 / RATE).toFixed(1), cli: pick(cli), worker: pick(worker), identical, cliMs, workerMs });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
if (synthDir) fs.rmSync(synthDir, { recursive: true, force: true });
console.log('file | s | CLI bpm / firstBeat / grid | panel worker | identical | worker ms');
for (const r of rows) {
  const f = (x) => x.bpm + ' / ' + x.firstBeat + ' / ' + x.grid;
  console.log([r.file, r.seconds, f(r.cli), f(r.worker), r.identical ? 'yes' : 'NO', r.workerMs].join(' | '));
}
const summary = { files: rows.length, identical: rows.length - mismatches, mismatches, rate: RATE, maxSeconds: SECONDS };
console.log(JSON.stringify(summary));
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ summary, rows }, null, 1));
process.exit(mismatches ? 1 : 0);
