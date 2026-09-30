// plugins/summer-trip/dev/measure-muffle.cjs
// Dev-only: how much treble the ending muffle keeps. For each bundled cue, the share of spectral energy above 3 kHz
// (Hann-windowed 4096-point frames, hop 2048, mono 44.1 kHz) in the dry mp3 and in the dry audio run through a
// candidate filter, and the wet/dry ratio of the shares. The similarity reference falls from 2.56 % to 0.30 % across
// its ending (ratio 0.117, -9.3 dB); muffle.cjs records the pick.
// Usage: node plugins/summer-trip/dev/measure-muffle.cjs [filter ...]     (default: the current ST_MUFFLE_FILTER)
//        node plugins/summer-trip/dev/measure-muffle.cjs --file <audio> [<from> <to>]   (one file or a window of it)
'use strict';
const path = require('node:path'), { execFileSync } = require('node:child_process');
const { ST_MUFFLE_FILTER } = require('../muffle.cjs');
const SR = 44100, N = 4096, HOP = 2048, SPLIT_HZ = 3000;

const decode = (file, af, from, to) => {
  const pcm = execFileSync('ffmpeg', ['-nostdin', '-v', 'error', ...(from != null ? ['-ss', String(from), '-to', String(to)] : []), '-i', file,
    ...(af ? ['-af', af] : []), '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 29 });
  return new Float32Array(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + Math.floor(pcm.byteLength / 4) * 4));
};
// In-place radix-2 FFT.
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}
// Share (0-1) of the spectral energy above SPLIT_HZ.
function highShare(x) {
  const win = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)));
  const k0 = Math.ceil(SPLIT_HZ * N / SR);
  let hi = 0, all = 0;
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let s = 0; s + N <= x.length; s += HOP) {
    for (let i = 0; i < N; i++) { re[i] = x[s + i] * win[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 1; k <= N / 2; k++) { const p = re[k] * re[k] + im[k] * im[k]; all += p; if (k >= k0) hi += p; }
  }
  return all > 0 ? hi / all : 0;
}
module.exports = { highShare, decode };

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args[0] === '--file') {
    const [, file, from, to] = args;
    console.log(file, from != null ? from + '-' + to + ' s' : '', (100 * highShare(decode(file, null, from, to))).toFixed(3) + ' % above 3 kHz');
    process.exit(0);
  }
  const dir = path.resolve(__dirname, '..', 'assets', 'cues');
  const manifest = require(path.join(dir, 'manifest.json'));
  const filters = args.length ? args : [ST_MUFFLE_FILTER];
  for (const f of filters) {
    const rows = manifest.cues.map(c => {
      const dry = highShare(decode(path.join(dir, c.file))), wet = highShare(decode(path.join(dir, c.file), f));
      return { id: c.id, dry: +(100 * dry).toFixed(3), wet: +(100 * wet).toFixed(3), ratio: +(wet / dry).toFixed(3), db: +(10 * Math.log10(wet / dry)).toFixed(1) };
    });
    const mean = rows.reduce((s, r) => s + r.db, 0) / rows.length;
    console.log(f, 'mean', mean.toFixed(1), 'dB', JSON.stringify(rows));
  }
}
