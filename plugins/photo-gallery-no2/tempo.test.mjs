import { asyncSdk, realFileReservationMethods } from '../../tests/windows_host.mjs';
// The panel's BPM estimate (the `// tempo:start` block of panel.template.tsx) run in node:vm on the av-host helpers,
// with an initialized async SDK fixture backed by node fs and local ffmpeg (the bundled ffmpeg in Selects). It replaces
// tempo.py; dev/tempo.py stays as the parity reference on a dev Mac, on the fixtures of dev/tempo_test.py.
import assert from 'node:assert/strict';
import { execFile, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const here = import.meta.dirname;
const template = fs.readFileSync(path.join(here, 'panel.template.tsx'), 'utf8');
const section = (start, end) => {
  const from = template.indexOf(start), to = template.indexOf(end);
  assert.ok(from >= 0 && to > from, start);
  return template.slice(from, to + end.length);
};
const blocks = fs.readFileSync(new URL('../../shared/bundled-assets.js',import.meta.url),'utf8')+'\n'+section('// av-host:start', '// av-host:end') + '\n' + section('// hold:start','// hold:end')+'\n'+section('// tempo:start', '// tempo:end');
const ffmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const python = spawnSync('python3', ['--version']).status === 0;

function load({ calls = [], withFFmpeg = true } = {}) {
  const FileSystem = { join: (...parts) => path.join(...parts), homedir: () => os.homedir(),
    exists:async p=>fs.existsSync(p),mkdir:async(p,o)=>fs.mkdirSync(p,o),
    stat:async p=>{try{const s=fs.statSync(p);return {size:s.size,mtimeMs:s.mtimeMs,ino:s.ino,isDirectory:s.isDirectory()};}catch(e){if(e.code==='ENOENT')return null;throw e;}},
    copyFile:async(a,b)=>fs.copyFileSync(a,b),rename:async(a,b)=>fs.renameSync(a,b),writeFile:async(p,d,o)=>fs.writeFileSync(p,d,o),
    readFile: async p => fs.readFileSync(p), removeFile: async ({ filePath }) => fs.rmSync(filePath, { force: true }),
    ...realFileReservationMethods() };
  const Runtime = { getPlatform: () => process.platform };
  if (withFFmpeg) Runtime.runFFmpeg = (args, _quiet, signal) => new Promise((resolve, reject) => {
    calls.push([...args]);
    const child = execFile('ffmpeg', args, { encoding: 'utf8' }, (error, stdout, stderr) =>
      error ? reject(JSON.stringify({ type: 'FFmpegExecutionError', stderr })) : resolve({ stdout, stderr }));
    signal?.addEventListener('abort', () => child.kill());
  });
  const context = vm.createContext({ panelLocalClient: sdk => sdk, sdk: asyncSdk({ FileSystem, Runtime }), window: { parent: { __DI__: new Proxy({}, {get(){throw Error('Unexpected DI access');}}) } }, navigator: {},
    crypto:globalThis.crypto,TextEncoder,AbortController, setTimeout, clearTimeout, TextDecoder, Int16Array, Float32Array, Uint8Array, Math });
  vm.runInContext(blocks + '\nhostUseSdk(sdk); this.tempoEstimate = tempoEstimate; this.tempoOfFile = tempoOfFile;', context);
  return context;
}
// A 16-bit mono WAV, as dev/tempo_test.py writes them.
function wav(file, samples, rate = 11025) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(v, i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([header, data]));
}
function clickTrack(file, bpm, seconds = 14) {
  const rate = 11025, samples = new Array(rate * seconds).fill(0), period = 60 * rate / bpm;
  for (let beat = 0; beat < Math.ceil(seconds * bpm / 60); beat++) {
    // Python's round(): halves to even.
    const x = beat * period, r = Math.round(x), at = Math.abs(x % 1) === 0.5 && r % 2 ? r - 1 : r;
    for (let i = 0; i < 55; i++) if (at + i < samples.length) samples[at + i] = Math.trunc(25000 * Math.exp(-i / 10));
  }
  wav(file, samples);
}
const scratch = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pg2-tempo-'));
const reference = file => JSON.parse(spawnSync('python3', [path.join(here, 'dev', 'tempo.py'), file], { encoding: 'utf8' }).stdout);

test('short input and silence give no BPM', () => {
  const { tempoEstimate } = load();
  assert.equal(tempoEstimate(new Float32Array(11025 * 5)).status, 'uncertain');
  assert.deepEqual({ ...tempoEstimate(new Float32Array(11025 * 8)) }, { status: 'uncertain', reason: 'No detectable rhythmic audio' });
});

test('a Selects build without ffmpeg stops with an update instruction', async () => {
  await assert.rejects(load({ withFFmpeg: false }).tempoOfFile('/x.mp3', os.tmpdir()),e=>e.code==='host-missing'&&/Update Selects/.test(e.publicMessage));
});

test('synthetic click tracks are estimated within 2 BPM', { skip: !ffmpeg && 'ffmpeg required' }, async () => {
  const dir = scratch(), calls = [], { tempoOfFile } = load({ calls });
  for (const bpm of [80, 110, 140]) {
    const file = path.join(dir, `click-${bpm}.wav`);
    clickTrack(file, bpm);
    const value = await tempoOfFile(file, dir);
    assert.equal(value.status, 'estimated', JSON.stringify(value));
    assert.ok(Math.abs(value.bpm - bpm) <= 2, JSON.stringify(value));
  }
  // The same decode as tempo.py; other invocations hash source/cache bytes.
  for (const args of calls.filter(args=>args.includes('f32le'))) {
    assert.deepEqual(args.slice(args.indexOf('-t'), args.indexOf('-t') + 2), ['-t', '30']);
    assert.deepEqual(args.slice(args.indexOf('-ar'), args.indexOf('-ar') + 2), ['-ar', '11025']);
  }
  assert.deepEqual(fs.readdirSync(path.join(dir,'tempo-v1')).filter(name=>/^\.source-|^\.output-/.test(name)),[]);
});

test('undecodable audio is uncertain, not an error', { skip: !ffmpeg && 'ffmpeg required' }, async () => {
  const dir = scratch(), file = path.join(dir, 'bad.mp3');
  fs.writeFileSync(file, 'not audio');
  assert.deepEqual({ ...(await load().tempoOfFile(file, dir)) }, { status: 'uncertain', reason: 'Audio could not be decoded' });
});

test('parity with dev/tempo.py on the click, silence and bundled-music fixtures', { skip: !(ffmpeg && python) && 'ffmpeg and python3 required' }, async () => {
  const dir = scratch(), { tempoOfFile } = load();
  const fixtures = [];
  for (const bpm of [80, 110, 113, 140, 175]) { const file = path.join(dir, `click-${bpm}.wav`); clickTrack(file, bpm, bpm === 113 ? 30 : 14); fixtures.push(file); }
  const silence = path.join(dir, 'silence.wav'); wav(silence, new Array(11025 * 8).fill(0)); fixtures.push(silence);
  fixtures.push(path.join(here, 'assets', 'music.mp3'));
  // A resampled, lossy stereo file goes through ffmpeg's float conversion path.
  const mp3 = path.join(dir, 'click-120.mp3');
  clickTrack(path.join(dir, 'click-120.wav'), 120, 20);
  spawnSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', path.join(dir, 'click-120.wav'), '-ac', '2', '-ar', '44100', '-b:a', '128k', mp3]);
  fixtures.push(mp3);
  for (const file of fixtures) {
    const ported = { ...(await tempoOfFile(file, dir)) }, expected = reference(file);
    assert.deepEqual(ported, expected, path.basename(file));
    if (process.env.PG2_TEMPO_VERBOSE) console.log(path.basename(file), JSON.stringify(ported));
  }
});
