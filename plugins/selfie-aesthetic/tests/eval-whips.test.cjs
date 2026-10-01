// plugins/selfie-aesthetic/tests/eval-whips.test.cjs (run: node plugins/selfie-aesthetic/tests/eval-whips.test.cjs)
// Runs dev/eval-whips.py --selftest: a synthetic 25 fps clip with known 2+2 frame whips (sharp, low-texture and
// soft-source holds plus one faint whip) must be found with offset 0, and the negative checks must fail as expected.
// Skips with a note when python3, numpy or ffmpeg is not available.
const path = require('node:path'), assert = require('node:assert/strict'), { spawnSync } = require('node:child_process');
const script = path.resolve(__dirname, '..', 'dev', 'eval-whips.py');

const has = (cmd, args) => { const r = spawnSync(cmd, args, { stdio: 'ignore' }); return !r.error && r.status === 0; };
const missing = [];
if (!has('python3', ['-c', 'import numpy'])) missing.push('python3 + numpy');
if (!has('ffmpeg', ['-version'])) missing.push('ffmpeg');
if (!has('ffprobe', ['-version'])) missing.push('ffprobe');
if (missing.length) {
  console.log(`eval-whips.test: SKIPPED (${missing.join(', ')} not available)`);
  process.exit(0);
}

const r = spawnSync('python3', [script, '--selftest'], { encoding: 'utf8', timeout: 120000 });
if (r.status !== 0) console.error(r.stdout + r.stderr);
assert.equal(r.status, 0, 'eval-whips.py --selftest failed');
assert.match(r.stdout, /SELFTEST OK/);
const summaryLine = r.stdout.split('\n').find(l => l.startsWith('{"pass"'));
const s = JSON.parse(summaryLine);
assert.equal(s.pass, true);
assert.equal(s.found, 10);
assert.equal(s.weak, 1);
assert.equal(s.extra, 0);
assert.equal(s.maxAbsOffsetMs, 0);
assert.equal(s.toleranceMs, 20);
console.log('eval-whips.test: ok');
