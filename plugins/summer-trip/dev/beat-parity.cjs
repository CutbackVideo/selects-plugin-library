#!/usr/bin/env node
// Regression evidence for the in-panel beat detection (adapted from plugins/selfie-aesthetic/dev/beat-parity.cjs): for
// each audio file, decode it exactly as the panel does (ffmpeg -t ST_PCM_SECONDS -i <file> -ac 1 -ar ST_PCM_RATE -f
// f32le, the arguments of hostDecodePcm and of the old CLI path), then compare
//   (a) the CLI path the panel used before: `node beat-detect.cjs <pcm> <rate> <out.json> largest`
//   (b) the panel path: stBeatWorkerSource(<beat-detect.cjs text>) from panel.tsx, run in a worker thread (its own
//       isolate) behind a Worker-global `self` shim, fed the same PCM as a transferred buffer with pick 'largest'
// and report bpm, firstBeat, grid and the drop for each. (a) and (b) must be identical (the whole JSON).
// Usage: node plugins/summer-trip/dev/beat-parity.cjs [--json out.json] <audio files or folders...>
// Build-time tool (dev machine): needs ffmpeg on PATH (or FFMPEG_DIR). tests/beat-worker.test.cjs uses the exports.
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const detectorFile = path.join(root, 'beat-detect.cjs');

function block(text, start, end) {
  const a = text.indexOf('\n' + start + '\n'), b = text.indexOf('\n' + end + '\n', a + 1);
  if (a < 0 || b < 0) throw new Error('panel.tsx: markers not found: ' + start);
  return text.slice(a + start.length + 2, b);
}
// The worker block is plain JS: ST_PCM_RATE, ST_PCM_SECONDS, ST_BEAT_TIMEOUT_MS, stBeatWorkerSource.
function workerBlock() {
  const panel = fs.readFileSync(path.join(root, 'panel.tsx'), 'utf8');
  const box = {};
  vm.createContext(box);
  vm.runInContext(block(panel, '// st-beat-worker:start', '// st-beat-worker:end')
    + '\nglobalThis.W = { ST_PCM_RATE, ST_PCM_SECONDS, ST_BEAT_TIMEOUT_MS, stBeatWorkerSource };', box);
  return box.W;
}
const W = workerBlock();

const ffmpeg = process.env.FFMPEG_DIR ? path.join(process.env.FFMPEG_DIR, 'ffmpeg') : 'ffmpeg';
function decode(file, out) {
  execFileSync(ffmpeg, ['-nostdin', '-v', 'error', '-y', '-t', String(W.ST_PCM_SECONDS), '-i', file, '-ac', '1', '-ar', String(W.ST_PCM_RATE), '-f', 'f32le', out]);
  return out;
}

// (a) The CLI: its JSON text exactly as written to the file.
function viaCli(pcmPath, tmp) {
  const out = path.join(tmp, 'cli.json');
  execFileSync(process.execPath, [detectorFile, pcmPath, String(W.ST_PCM_RATE), out, 'largest']);
  return fs.readFileSync(out, 'utf8').trim();
}

// (b) The panel's worker source in a real worker thread (its own isolate, as a browser Worker): `self` is a small
// Worker-global shim over parentPort; the PCM goes in as an ArrayBuffer and is transferred, as the panel does.
function viaWorker(pcmBytes, detectorText) {
  const { Worker } = require('node:worker_threads');
  const shim = "const { parentPort } = require('node:worker_threads');\n"
    + 'globalThis.self = { postMessage: (m) => parentPort.postMessage(m) };\n'
    + "parentPort.on('message', (d) => self.onmessage({ data: d }));\n";
  const source = W.stBeatWorkerSource(detectorText == null ? fs.readFileSync(detectorFile, 'utf8') : detectorText);
  const buf = pcmBytes.buffer.slice(pcmBytes.byteOffset, pcmBytes.byteOffset + Math.floor(pcmBytes.byteLength / 4) * 4);
  return new Promise((resolve, reject) => {
    const w = new Worker(shim + source, { eval: true });
    w.once('message', (reply) => {
      w.terminate();
      if (!reply || reply.id !== 7 || !reply.ok) reject(new Error('worker failed: ' + (reply && reply.error)));
      else resolve(JSON.stringify(reply.result));
    });
    w.once('error', (e) => { w.terminate(); reject(e); });
    w.postMessage({ id: 7, buf, rate: W.ST_PCM_RATE, pick: 'largest' }, [buf]);
  });
}

async function compareFile(file) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'st-parity-'));
  try {
    const pcmPath = decode(file, path.join(tmp, 'pcm.f32'));
    return await comparePcm(path.basename(file), pcmPath, tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
async function comparePcm(name, pcmPath, tmp) {
  const bytes = new Uint8Array(fs.readFileSync(pcmPath));
  const cli = viaCli(pcmPath, tmp);
  const t0 = Date.now();
  const worker = await viaWorker(bytes);
  const workerMs = Date.now() - t0;
  const pick = (s) => { const r = JSON.parse(s); return { bpm: r.bpm, firstBeat: r.firstBeat, grid: r.grid, drop: r.drop ? r.drop.dropSeconds : null }; };
  return { file: name, seconds: +(bytes.byteLength / 4 / W.ST_PCM_RATE).toFixed(1), cli: pick(cli), worker: pick(worker), identical: cli === worker, workerMs };
}

module.exports = { W, viaCli, viaWorker, comparePcm, compareFile };

if (require.main === module) (async () => {
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
  for (const file of files) rows.push(await compareFile(file));
  const f = (x) => x.bpm + ' / ' + x.firstBeat + ' / ' + x.grid + ' / drop ' + x.drop;
  console.log('file | s | CLI bpm/firstBeat/grid/drop | panel worker | identical | worker ms');
  for (const r of rows) console.log([r.file, r.seconds, f(r.cli), f(r.worker), r.identical ? 'yes' : 'NO', r.workerMs].join(' | '));
  const mismatches = rows.filter((r) => !r.identical).length;
  const summary = { files: rows.length, identical: rows.length - mismatches, mismatches };
  console.log(JSON.stringify(summary));
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ summary, rows }, null, 1));
  process.exit(mismatches ? 1 : 0);
})();
