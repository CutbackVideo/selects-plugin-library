#!/usr/bin/env node
// Dev check (not shipped): own music's in-panel beat detection equals the CLI that the panel used to run. Every track
// is decoded once with the panel's ffmpeg arguments (tpl-host hostDecodePcm: mono f32le at OWN_RATE, the first
// OWN_MAX_SECONDS, both read from panel.tsx), then analysed twice:
//   (a) the CLI: `node beat-detect.cjs <pcm> <rate> <out.json>` (the command the panel ran through the shell before);
//   (b) the panel: tplBeatWorkerSource(<beat-detect.cjs text>) from panel.tsx, run in node:vm the way the Web Worker
//       runs it, fed the same samples.
// The whole result JSON must be identical; the table shows bpm, first beat and grid state. Tracks: the bundled cues and
// every audio file in ~/Downloads/test-music (or the folders given as arguments). Needs ffmpeg on PATH.
//   node plugins/torn-paper-love/dev/beat-parity.cjs [folder ...] [--out <table.md>]
'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), vm = require('node:vm'), { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
const out = outAt >= 0 ? args[outAt + 1] : path.join(os.tmpdir(), 'torn-paper-love-beat-parity.md');
const folders = args.filter((a, i) => a !== '--out' && (outAt < 0 || i !== outAt + 1));

const panel = fs.readFileSync(path.join(root, 'panel.tsx'), 'utf8');
const panelConst = (name) => Number(new RegExp('const ' + name + ' = (\\d+);').exec(panel)[1]);
const RATE = panelConst('OWN_RATE'), MAX_SECONDS = panelConst('OWN_MAX_SECONDS');
const a = panel.indexOf('\n// tpl-beat-worker:start\n'), b = panel.indexOf('\n// tpl-beat-worker:end\n');
const box = {}; vm.createContext(box); vm.runInContext(panel.slice(a, b) + '\nthis.src = tplBeatWorkerSource;', box);
const detectorFile = path.join(root, 'beat-detect.cjs');
const workerSource = box.src(fs.readFileSync(detectorFile, 'utf8'));

function viaWorker(samples) {
  const posted = [];
  const ctx = { postMessage: (m) => posted.push(m) };
  vm.createContext(ctx);
  vm.runInContext(workerSource, ctx);
  ctx.onmessage({ data: { samples, rate: RATE } });
  if (!posted[0] || posted[0].error) throw Error('worker: ' + (posted[0] && posted[0].error));
  return JSON.parse(JSON.stringify(posted[0].ok));
}
function viaCli(pcm, tmp) {
  const json = path.join(tmp, 'cli.json');
  const line = execFileSync(process.execPath, [detectorFile, pcm, String(RATE), json]).toString().trim();
  if (line !== '{"ok":true}') throw Error('cli: ' + line);
  return JSON.parse(fs.readFileSync(json, 'utf8'));
}

const tracks = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'cues', 'manifest.json'), 'utf8')).cues.map((c) => ({ name: 'cue: ' + c.label, file: path.join(root, 'assets', 'cues', c.file) }));
for (const dir of folders.length ? folders : [path.join(os.homedir(), 'Downloads', 'test-music')]) {
  if (!fs.existsSync(dir)) { console.error('skipped (missing): ' + dir); continue; }
  for (const f of fs.readdirSync(dir).sort()) if (/\.(mp3|m4a|aac|wav|flac|ogg|opus)$/i.test(f)) tracks.push({ name: f, file: path.join(dir, f) });
}
const rows = ['| Track | Seconds | bpm (panel / CLI) | first beat (panel / CLI) | grid (panel / CLI) | identical |', '| --- | --- | --- | --- | --- | --- |'];
let bad = 0;
for (const tr of tracks) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tpl-parity-'));
  try {
    const pcm = path.join(tmp, 'pcm.f32');
    // The panel's argv (hostDecodePcm), run by the dev Mac's ffmpeg.
    execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-t', String(MAX_SECONDS), '-i', tr.file, '-ac', '1', '-ar', String(RATE), '-f', 'f32le', pcm]);
    const buf = fs.readFileSync(pcm);
    const samples = new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + Math.floor(buf.byteLength / 4) * 4));
    const w = viaWorker(samples), c = viaCli(pcm, tmp);
    const same = JSON.stringify(w) === JSON.stringify(c);
    if (!same) bad++;
    rows.push('| ' + [tr.name, (samples.length / RATE).toFixed(1), w.bpm + ' / ' + c.bpm, w.firstBeat + ' / ' + c.firstBeat, w.grid + ' / ' + c.grid, same ? 'yes' : 'NO'].join(' | ') + ' |');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
const table = '# Torn Paper Love: in-panel beat detection vs the beat-detect.cjs CLI\n\nDecoded with `ffmpeg -t ' + MAX_SECONDS + ' -ac 1 -ar ' + RATE + ' -f f32le` (the panel\'s argv); ' +
  'identical = the whole result JSON matches.\n\n' + rows.join('\n') + '\n';
fs.writeFileSync(out, table);
console.log(table + '\nwritten: ' + out);
process.exitCode = bad ? 1 : 0;
