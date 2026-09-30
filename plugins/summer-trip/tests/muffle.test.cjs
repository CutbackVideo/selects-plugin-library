// plugins/summer-trip/tests/muffle.test.cjs
const path = require('node:path'), fs = require('node:fs'), os = require('node:os'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { sq, stMuffleCommand, ST_MUFFLE_FILTER, ST_MUFFLE_TAG } = require(path.resolve(__dirname, '..', 'muffle.cjs'));

assert.equal(ST_MUFFLE_FILTER, 'lowpass=f=2800:p=2,volume=-1dB');
// The own-music cache tag is the filter's FNV-1a hash: fixed for this filter, different for any other.
assert.equal(ST_MUFFLE_TAG, 'a263eda4');
const fnv = s => { let h = 0x811c9dc5; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0; return h.toString(16).padStart(8, '0'); };
assert.equal(fnv(ST_MUFFLE_FILTER), ST_MUFFLE_TAG);
assert.notEqual(fnv('lowpass=f=1200:p=2,volume=-1dB'), ST_MUFFLE_TAG, 'the previous filter has another tag');
assert.equal(sq('plain'), "'plain'");
assert.equal(sq("it's"), "'it'\\''s'");
assert.equal(sq(''), "''");
assert.equal(sq("a'b'c"), "'a'\\''b'\\''c'");
assert.equal(sq('$HOME `x` "q" \\ ;&|'), "'$HOME `x` \"q\" \\ ;&|'");

const cmd = stMuffleCommand("/Volumes/Media/Summer's Day (1).mp3", '/data/st/muffled-abc.mp3');
assert.equal(cmd, "ffmpeg -nostdin -v error -y -i '/Volumes/Media/Summer'\\''s Day (1).mp3' -af 'lowpass=f=2800:p=2,volume=-1dB' "
  + "-ar 44100 -ac 2 -c:a libmp3lame -b:a 96k -map_metadata -1 '/data/st/muffled-abc.mp3'");
assert.ok(stMuffleCommand('/a.m4a', '/b.WAV').includes('-c:a pcm_s16le'), 'wav output is PCM');

// The quoting survives a real shell: sh -c 'printf %s\\n <quoted>' prints each path back unchanged.
const tricky = ["it's", 'a b', '$(echo no)', '`no`', 'x"y', "'", "''", 'back\\slash', 'semi;colon & amp', 'ümlaut'];
for (const v of tricky) {
  const r = spawnSync('sh', ['-c', 'printf %s ' + sq(v)]);
  assert.equal(r.stdout.toString(), v, 'round trip ' + v);
}

// With ffmpeg: the command runs through a shell on a path with a quote and a space, and writes the muffled file.
if (spawnSync('ffmpeg', ['-version']).status === 0) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "st muffle '"));
  const src = path.join(dir, "tone's in.wav"), dst = path.join(dir, "out 'x'.wav");
  const gen = spawnSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=f=440:d=1', '-ar', '44100', src]);
  assert.equal(gen.status, 0);
  const r = spawnSync('sh', ['-c', stMuffleCommand(src, dst)]);
  assert.equal(r.status, 0, r.stderr.toString());
  assert.ok(fs.statSync(dst).size > 44100 * 2 * 2 * 0.9, 'muffled wav written');
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log(JSON.stringify({ muffle: 'ok' }));
