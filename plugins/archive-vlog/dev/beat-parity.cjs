#!/usr/bin/env node
// Dev check (not shipped): the panel's own-music analysis equals beat-detect.cjs's. Every track is decoded once with
// the panel's ffmpeg command (mono f32le, 22050 Hz, the first 240 s: panel.tsx hostDecodePcm / OWN_MAX_SECONDS), then
// analysed twice: by the panel's worker source (av-beat-worker block around the shipped beat-detect.cjs, run in
// node:vm the way the Web Worker runs it) and by require('../beat-detect.cjs'). The two results must be identical (the
// whole JSON; the table shows bpm, first beat and grid state). Tracks: the four bundled cues and every audio file in
// ~/Downloads/test-music (or the folders given as arguments). Needs ffmpeg on PATH.
//   node plugins/archive-vlog/dev/beat-parity.cjs [folder ...] [--out <table.md>]
'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), vm = require('node:vm'), { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
const out = outAt >= 0 ? args[outAt + 1] : path.join(os.tmpdir(), 'archive-vlog-beat-parity.md');
const folders = args.filter((a, i) => a !== '--out' && i !== outAt + 1);
const RATE = 22050, MAX_SECONDS = 240;

const panel = fs.readFileSync(path.join(root, 'panel.tsx'), 'utf8');
const panelConst = (name) => Number(new RegExp('const ' + name + ' = (\\d+);').exec(panel)[1]);
if (panelConst('OWN_RATE') !== RATE || panelConst('OWN_MAX_SECONDS') !== MAX_SECONDS) throw Error('panel.tsx decode settings changed; update this script');
const a = panel.indexOf('// av-beat-worker:start\n'), b = panel.indexOf('// av-beat-worker:end');
const box = {}; vm.createContext(box); vm.runInContext(panel.slice(a, b) + '\nthis.src = avBeatWorkerSource;', box);
const workerSource = box.src(fs.readFileSync(path.join(root, 'beat-detect.cjs'), 'utf8'));
const cli = require(path.join(root, 'beat-detect.cjs'));

// The worker's answer for one message, as the panel gets it.
function viaWorker(samples) {
  const posted = [];
  const ctx = { postMessage: (m) => posted.push(m) };
  vm.createContext(ctx);
  vm.runInContext(workerSource, ctx);
  ctx.onmessage({ data: { samples, rate: RATE } });
  if (!posted[0] || posted[0].error) throw Error('worker: ' + (posted[0] && posted[0].error));
  return JSON.parse(JSON.stringify(posted[0].ok));
}
function decode(file) {
  const tmp = path.join(os.tmpdir(), 'archive-vlog-parity-' + process.pid + '.f32');
  try {
    execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-t', String(MAX_SECONDS), '-i', file, '-ac', '1', '-ar', String(RATE), '-f', 'f32le', tmp]);
    const buf = fs.readFileSync(tmp);
    return new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + Math.floor(buf.byteLength / 4) * 4));
  } finally { try { fs.unlinkSync(tmp); } catch { /* gone */ } }
}

const tracks = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'cues', 'manifest.json'), 'utf8')).cues.map((c) => ({ name: 'cue: ' + c.label, file: path.join(root, 'assets', 'cues', c.file) }));
for (const dir of folders.length ? folders : [path.join(os.homedir(), 'Downloads', 'test-music')]) {
  if (!fs.existsSync(dir)) { console.error('skipped (missing): ' + dir); continue; }
  for (const f of fs.readdirSync(dir).sort()) if (/\.(mp3|m4a|aac|wav|flac|ogg|opus)$/i.test(f)) tracks.push({ name: f, file: path.join(dir, f) });
}
const rows = ['| Track | Seconds | bpm (panel / CLI) | first beat (panel / CLI) | grid (panel / CLI) | identical |', '| --- | --- | --- | --- | --- | --- |'];
let bad = 0;
for (const tr of tracks) {
  const samples = decode(tr.file);
  const w = viaWorker(samples), c = JSON.parse(JSON.stringify(cli.analyze(samples, RATE)));
  const same = JSON.stringify(w) === JSON.stringify(c);
  if (!same) bad++;
  rows.push('| ' + [tr.name, (samples.length / RATE).toFixed(1), w.bpm + ' / ' + c.bpm, w.firstBeat + ' / ' + c.firstBeat, w.grid + ' / ' + c.grid, same ? 'yes' : 'NO'].join(' | ') + ' |');
}
const table = '# Archive Vlog: in-panel beat detection vs beat-detect.cjs\n\nDecoded with `ffmpeg -t ' + MAX_SECONDS + ' -ac 1 -ar ' + RATE + ' -f f32le` (the panel\'s command); ' +
  'identical = the whole result JSON matches.\n\n' + rows.join('\n') + '\n';
fs.writeFileSync(out, table);
console.log(table + '\nwritten: ' + out);
process.exitCode = bad ? 1 : 0;
