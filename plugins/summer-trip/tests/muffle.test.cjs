// plugins/summer-trip/tests/muffle.test.cjs
const path = require('node:path'), fs = require('node:fs'), os = require('node:os'), assert = require('node:assert/strict');
const { spawnSync, execFileSync } = require('node:child_process');
const muffle = require(path.resolve(__dirname, '..', 'muffle.cjs'));
const { stMuffleArgs, ST_MUFFLE_FILTER, ST_MUFFLE_TAG } = muffle;

assert.equal(ST_MUFFLE_FILTER, 'lowpass=f=2800:p=2,volume=-1dB');
// The own-music cache tag is the filter's FNV-1a hash: fixed for this filter, different for any other.
assert.equal(ST_MUFFLE_TAG, 'a263eda4');
const fnv = s => { let h = 0x811c9dc5; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0; return h.toString(16).padStart(8, '0'); };
assert.equal(fnv(ST_MUFFLE_FILTER), ST_MUFFLE_TAG);
assert.notEqual(fnv('lowpass=f=1200:p=2,volume=-1dB'), ST_MUFFLE_TAG, 'the previous filter has another tag');
// No shell helpers left: the bake runs through the host's ffmpeg with an argument array (Windows has no POSIX shell).
assert.deepEqual(Object.keys(muffle).sort(), ['ST_MUFFLE_BITRATE', 'ST_MUFFLE_FILTER', 'ST_MUFFLE_TAG', 'stMuffleArgs']);

// Each path is one argument, unquoted: quotes, spaces, Hangul and Windows separators pass through unchanged.
const tricky = "C:\\Users\\\uD64D\uAE38\uB3D9\\Music\\Summer's Day (1) $(x) `y`.mp3";
assert.deepEqual(stMuffleArgs(tricky, 'C:\\data\\st\\muffled-abc.mp3'), ['-nostdin', '-v', 'error', '-y', '-i', tricky, '-af', 'lowpass=f=2800:p=2,volume=-1dB',
  '-ar', '44100', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '96k', '-map_metadata', '-1', 'C:\\data\\st\\muffled-abc.mp3']);
const wav = stMuffleArgs('/a.m4a', '/b.WAV');
assert.deepEqual(wav.slice(wav.indexOf('-c:a'), wav.indexOf('-c:a') + 2), ['-c:a', 'pcm_s16le'], 'wav output is PCM');
assert.ok(!wav.includes('libmp3lame'));
for (const a of stMuffleArgs("it's", 'o.wav')) assert.equal(typeof a, 'string');

// With ffmpeg: the arguments run through execFile (no shell) on paths with a quote, a space and Hangul, and write the
// muffled file.
if (spawnSync('ffmpeg', ['-version']).status === 0) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "st muffle '"));
  const src = path.join(dir, "tone's \uC74C in.wav"), dst = path.join(dir, "out 'x'.wav");
  execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=f=440:d=1', '-ar', '44100', src]);
  execFileSync('ffmpeg', stMuffleArgs(src, dst));
  assert.ok(fs.statSync(dst).size > 44100 * 2 * 2 * 0.9, 'muffled wav written');
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log(JSON.stringify({ muffle: 'ok' }));
