// plugins/summer-trip/tests/cues.test.cjs
// The shipped cue manifest (may be empty until the new cues land) and, when they exist locally, the gitignored dev
// placeholder cues (dev/build-cues.cjs ... --manifest dev-manifest.json). CI has no dev cues and skips that part.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const dir = path.resolve(__dirname, '..', 'assets', 'cues');

const isNum = v => typeof v === 'number' && Number.isFinite(v);
function checkManifest(m, { dev }) {
  assert.equal(m.version, 1);
  assert.ok(Array.isArray(m.cues), 'cues array');
  assert.equal(new Set(m.cues.map(c => c.id)).size, m.cues.length, 'unique ids');
  for (const c of m.cues) {
    const at = c.id + ': ';
    assert.match(c.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, at + 'id');
    assert.equal(c.id.startsWith('dev-'), dev, at + (dev ? 'dev cues start with dev-' : 'shipped cues never start with dev-'));
    assert.ok(typeof c.title === 'string' && c.title.length > 0, at + 'title');
    assert.equal(c.file, c.id + '.mp3', at + 'file');
    assert.equal(c.muffledFile, c.id + '-muffled.mp3', at + 'muffledFile');
    for (const [f, h] of [[c.file, c.sha256], [c.muffledFile, c.muffledSha256]]) {
      const buf = fs.readFileSync(path.join(dir, f));
      assert.equal(crypto.createHash('sha256').update(buf).digest('hex'), h, at + f + ' hash');
      assert.ok(buf.length < 20 * 1024 * 1024, at + f + ' size');
    }
    assert.ok(isNum(c.bpm) && c.bpm >= 70 && c.bpm <= 180, at + 'bpm ' + c.bpm);
    // Tempo octave: the manifest tempo is the one closest to 120 BPM of bpm/2, bpm, 2 bpm.
    assert.ok(Math.abs(Math.log2(c.bpm / 120)) <= 0.5 + 1e-3, at + 'bpm in the 120 octave');
    assert.ok(isNum(c.firstBeat) && c.firstBeat >= 0 && c.firstBeat < 4 * 60 / c.bpm, at + 'firstBeat ' + c.firstBeat);
    assert.ok(isNum(c.duration) && c.duration > 0 && isNum(c.usableEnd) && c.usableEnd <= c.duration, at + 'duration');
    assert.equal(typeof c.accepted, 'boolean', at + 'accepted');
    if (c.accepted) {
      assert.equal(c.rejectReason, null, at + 'rejectReason');
      assert.ok(c.sections && typeof c.sections === 'object', at + 'sections');
      assert.equal(c.sections.drop, c.dropBeat == null ? null : c.dropBeat - 8, at + 'drop section = dropBeat - 8');
    } else {
      assert.ok(typeof c.rejectReason === 'string' && c.rejectReason, at + 'rejectReason');
      assert.equal(c.sections, null, at + 'rejected cue has no sections');
    }
    if (c.dropBeat == null) {
      assert.equal(c.dropSeconds, null, at + 'dropSeconds');
    } else {
      // The drop is a bar line (4 beats from firstBeat) with at least the 8-beat title intro before it.
      assert.ok(Number.isInteger(c.dropBeat) && c.dropBeat >= 8 && c.dropBeat % 4 === 0, at + 'dropBeat ' + c.dropBeat);
      assert.ok(Math.abs(c.firstBeat + c.dropBeat * 60 / c.bpm - c.dropSeconds) < 0.01, at + 'dropSeconds on the grid');
      assert.ok(isNum(c.stepDb) && c.stepDb >= 4, at + 'stepDb');
    }
    if (c.titleHits != null) {
      assert.ok(Array.isArray(c.titleHits) && c.titleHits.length === 6, at + 'titleHits: 4 words + 2 season hits');
      c.titleHits.forEach((h, i) => assert.ok(isNum(h) && h >= 0 && h < 8 && (i === 0 || h >= c.titleHits[i - 1]), at + 'titleHits sorted in [0, 8)'));
    }
    assert.ok(c.sixteenthRatio === null || (isNum(c.sixteenthRatio) && c.sixteenthRatio >= 0 && c.sixteenthRatio < 2), at + 'sixteenthRatio');
    assert.ok(['high', 'low'].includes(c.downbeatConfidence), at + 'downbeatConfidence');
    assert.ok(c.downbeatRatio === null || isNum(c.downbeatRatio), at + 'downbeatRatio');
    if (isNum(c.downbeatRatio)) assert.equal(c.downbeatConfidence, c.downbeatRatio >= 1.5 ? 'high' : 'low', at + 'downbeatConfidence is measured');
    assert.ok(Math.abs(c.lufs + 14) <= 0.5, at + 'lufs ' + c.lufs);
    assert.ok(Array.isArray(c.peaks) && c.peaks.length === 400, at + 'peaks');
    assert.ok(Array.isArray(c.beatEnergy) && c.beatEnergy.length > 16, at + 'beatEnergy');
  }
}

const shipped = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
checkManifest(shipped, { dev: false });

// Wet/dry alignment (spec 15.6): both decode to the same number of samples, and the cross-correlation of the dry and
// the muffled signal peaks within 1 ms (the 2-pole low-pass adds well under that).
const SR = 22050;
const decode = file => {
  const pcm = execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  return new Float32Array(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + Math.floor(pcm.byteLength / 4) * 4));
};
const probeDuration = file => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim());
function lagMs(a, b, startSeconds, seconds = 3, maxLagMs = 30) {
  const s0 = Math.floor(startSeconds * SR), n = Math.floor(seconds * SR), L = Math.round(maxLagMs / 1000 * SR);
  let best = { lag: 0, r: -Infinity };
  let ea = 0; for (let i = 0; i < n; i++) ea += a[s0 + i] ** 2;
  for (let lag = -L; lag <= L; lag++) {
    let s = 0, eb = 0;
    for (let i = 0; i < n; i++) { const v = b[s0 + i + lag] || 0; s += a[s0 + i] * v; eb += v * v; }
    const r = s / Math.sqrt(ea * eb + 1e-12);
    if (r > best.r) best = { lag, r };
  }
  return { ms: best.lag / SR * 1000, r: best.r };
}
function checkAlignment(m) {
  for (const c of m.cues) {
    const dry = decode(path.join(dir, c.file)), wet = decode(path.join(dir, c.muffledFile));
    assert.equal(dry.length, wet.length, c.id + ' dry and wet decode to the same length');
    assert.equal(probeDuration(path.join(dir, c.file)), probeDuration(path.join(dir, c.muffledFile)), c.id + ' equal durations');
    // Three windows: early, middle and late.
    for (const f of [0.15, 0.5, 0.8]) {
      const x = lagMs(dry, wet, f * (dry.length / SR - 3));
      assert.ok(Math.abs(x.ms) <= 1, c.id + ' wet/dry lag ' + x.ms.toFixed(3) + ' ms at ' + f);
      assert.ok(x.r > 0.5, c.id + ' wet/dry correlation ' + x.r.toFixed(3));
    }
  }
}
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
if (hasFfmpeg) checkAlignment(shipped);

const devPath = path.join(dir, 'dev-manifest.json');
let dev = 'absent';
if (fs.existsSync(devPath)) {
  const m = JSON.parse(fs.readFileSync(devPath, 'utf8'));
  checkManifest(m, { dev: true });
  if (hasFfmpeg) { checkAlignment(m); dev = m.cues.length + ' checked'; } else dev = 'schema only (no ffmpeg)';
}
console.log(JSON.stringify({ cues: 'ok', shipped: shipped.cues.length, dev }));
