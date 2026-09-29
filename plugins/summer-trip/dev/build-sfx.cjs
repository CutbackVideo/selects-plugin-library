// plugins/summer-trip/dev/build-sfx.cjs
// Dev-only: build the sound effects in sfx/ (spec 8, 15.8) and sfx/manifest.json.
// Usage: node plugins/summer-trip/dev/build-sfx.cjs <xkeril-701104.mp3>
//   shutter-1..4: plugins/postcard-cutout-studio/sfx/panel-shutter-v4-{1..4}.wav.b64, that plugin's takes of
//     "Pentax K1000 Camera Shutter.wav" by yfjesse (CC0), https://freesound.org/people/yfjesse/sounds/579883/
//   whoosh-1: the Freesound HQ preview (mp3) of the CC0 original "Whoosh stereo light (transition)" by xkeril,
//     https://freesound.org/people/xkeril/sounds/701104/ (the argument; not kept in the repo).
// Each sound: decoded to 44.1 kHz stereo, DC removed per channel, trimmed to its sound (10 ms windows within 40 dB of the
// loudest 10 ms, see processSound) with a pre-roll equal to the 10 ms fade-in (so the fade never touches the attack)
// and a 20 ms fade-out after it, peak-normalised to -3 dBFS and written as a 16-bit WAV (no dither: the build is
// deterministic, so the sha256 in the manifest survives a rebuild). Shipped base64-encoded (.wav.b64, 76-column
// lines) because the library's public check rejects binary files; the manifest's `file` names the decoded WAV and
// its sha256 is of the decoded bytes.
// Manifest times, in seconds from the file start: onsetSeconds (where the sound starts: the attack, = the pre-roll),
// peakSeconds (the loudest 10 ms RMS window's centre), soundSeconds (where the sound ends; the fade-out follows),
// duration (the file).
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { execFileSync } = require('node:child_process');

const SR = 44100, FADE_IN = 0.010, FADE_OUT = 0.020, FLOOR_DB = -40, PEAK_DB = -3;
const root = path.resolve(__dirname, '..'), outDir = path.join(root, 'sfx');
const postcard = path.resolve(root, '..', 'postcard-cutout-studio', 'sfx');
const whooshSrc = process.argv[2];
if (!whooshSrc) throw Error('usage: node dev/build-sfx.cjs <xkeril-701104.mp3>');

const SHUTTER_NOTE = 'Pentax K1000 Camera Shutter.wav by yfjesse - https://freesound.org/people/yfjesse/sounds/579883/ (CC0 1.0); '
  + 'postcard-cutout-studio take panel-shutter-v4-';
const SOUNDS = [
  ...[1, 2, 3, 4].map(n => ({
    key: 'shutter-' + n, input: { b64: path.join(postcard, 'panel-shutter-v4-' + n + '.wav.b64') },
    note: SHUTTER_NOTE + n + ' (trimmed, EQ, pitch and stereo room there), re-trimmed, faded and levelled here',
  })),
  {
    key: 'whoosh-1', input: { file: whooshSrc }, peak: true,
    note: 'Whoosh stereo light (transition) by xkeril - https://freesound.org/people/xkeril/sounds/701104/ (CC0 1.0); '
      + 'HQ preview of the CC0 original, trimmed, faded and levelled',
  },
];

function decode(input) {
  let file = input.file;
  if (input.b64) {
    file = path.join(require('node:os').tmpdir(), 'st-sfx-' + path.basename(input.b64, '.b64'));
    fs.writeFileSync(file, Buffer.from(fs.readFileSync(input.b64, 'utf8'), 'base64'));
  }
  const buf = execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-i', file, '-ac', '2', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 26 });
  if (input.b64) fs.rmSync(file);
  const x = new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + Math.floor(buf.byteLength / 8) * 8));
  const n = x.length / 2, L = new Float64Array(n), R = new Float64Array(n);
  for (let i = 0; i < n; i++) { L[i] = x[2 * i]; R[i] = x[2 * i + 1]; }
  return [L, R];
}

function wav16(ch) {
  const n = ch[0].length, data = Buffer.alloc(n * 4), head = Buffer.alloc(44);
  for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(ch[c][i] * 32767))), (2 * i + c) * 2);
  head.write('RIFF', 0); head.writeUInt32LE(36 + data.length, 4); head.write('WAVE', 8);
  head.write('fmt ', 12); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(2, 22);
  head.writeUInt32LE(SR, 24); head.writeUInt32LE(SR * 4, 28); head.writeUInt16LE(4, 32); head.writeUInt16LE(16, 34);
  head.write('data', 36); head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

function processSound(ch) {
  // DC.
  for (const c of ch) { let m = 0; for (const v of c) m += v; m /= c.length; for (let i = 0; i < c.length; i++) c[i] -= m; }
  // The sound spans the 10 ms RMS windows (1 ms steps, both channels) within FLOOR_DB of the loudest one: from the
  // first such window's start to the last one's end. A sample-level floor would keep the whoosh's long, inaudible
  // reverb tail (-45 to -65 dB for a second) and its pre-noise, which would move its body away from its anchor.
  const n = ch[0].length, w = Math.round(0.010 * SR), hop = Math.round(0.001 * SR), win = [];
  for (let a = 0; a + w <= n; a += hop) { let e = 0; for (let i = a; i < a + w; i++) e += ch[0][i] ** 2 + ch[1][i] ** 2; win.push(e); }
  const top = Math.max(...win), floor = top * 10 ** (FLOOR_DB / 10);
  const first = win.findIndex(e => e >= floor) * hop, last = (win.length - 1 - [...win].reverse().findIndex(e => e >= floor)) * hop + w - 1;
  const fi = Math.round(FADE_IN * SR), fo = Math.round(FADE_OUT * SR);
  const start = Math.max(0, first - fi), end = Math.min(n, last + 1 + fo);
  const out = ch.map(c => c.slice(start, end)), len = end - start;
  // Raised-cosine fades.
  for (const c of out) {
    for (let i = 0; i < Math.min(fi, len); i++) c[i] *= 0.5 - 0.5 * Math.cos(Math.PI * i / fi);
    for (let i = 0; i < Math.min(fo, len); i++) c[len - 1 - i] *= 0.5 - 0.5 * Math.cos(Math.PI * i / fo);
  }
  let p2 = 0; for (let i = 0; i < len; i++) p2 = Math.max(p2, Math.abs(out[0][i]), Math.abs(out[1][i]));
  const g = 10 ** (PEAK_DB / 20) / p2;
  for (const c of out) for (let i = 0; i < len; i++) c[i] *= g;
  // Loudest 10 ms (RMS over both channels), 1 ms steps, in the output.
  let best = { e: -1, at: 0 };
  for (let a = 0; a + w <= len; a += hop) {
    let e = 0; for (let i = a; i < a + w; i++) e += out[0][i] ** 2 + out[1][i] ** 2;
    if (e > best.e) best = { e, at: a + w / 2 };
  }
  const r3 = v => Math.round(v * 1000) / 1000;
  return { out, duration: r3(len / SR), onsetSeconds: r3((first - start) / SR), soundSeconds: r3((last + 1 - start) / SR), peakSeconds: r3(best.at / SR) };
}

fs.mkdirSync(outDir, { recursive: true });
const manifest = {};
for (const s of SOUNDS) {
  const r = processSound(decode(s.input)), bytes = wav16(r.out), file = s.key + '.wav';
  fs.writeFileSync(path.join(outDir, file + '.b64'), bytes.toString('base64').replace(/.{76}/g, '$&\n').replace(/\n?$/, '\n'));
  manifest[s.key] = {
    file, duration: r.duration, onsetSeconds: r.onsetSeconds, soundSeconds: r.soundSeconds,
    ...(s.peak ? { peakSeconds: r.peakSeconds } : {}),
    note: s.note, sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  };
  console.log(s.key, JSON.stringify(manifest[s.key]));
}
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
