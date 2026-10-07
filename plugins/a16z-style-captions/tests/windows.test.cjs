// plugins/a16z-style-captions/tests/windows.test.cjs (run: node plugins/a16z-style-captions/tests/windows.test.cjs)
// Shared faces and bundled media tools must run identically without POSIX setup on Windows.
const fs = require('node:fs'), path = require('node:path');
const assert = require('node:assert/strict');

const panel = fs.readFileSync(path.join(__dirname, '..', 'panel.tsx'), 'utf8');
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

const runtime = panel;

const POSIX = [
  ['printf', /\bprintf\b/], ['$HOME', /\$HOME\b/], ['$SELECTS_USER', /\$SELECTS_USER/], ['command -v', /command -v/],
  ['mkdir -p', /mkdir -p/], ['rm -f', /rm -f/], ['base64 ', /(?<![\w.])base64\s/], ['export PATH', /export PATH/], ['| grep', /\| grep/],
  ['shasum', /shasum/], ['cat "', /cat "/], ['node " spawn', /["'`]node ["']/], ['$FF / $FP', /"\$F[FP]"/],
];

test('runtime code sends no POSIX shell syntax', () => {
  const hits = [];
  for (const [label, re] of POSIX) {
    runtime.split('\n').forEach((line, i) => { if (re.test(line)) hits.push(label + ': ' + line.trim().slice(0, 140)); });
  }
  assert.deepEqual(hits, []);
});

test('speaker framing no longer needs runShell', () => {
  const calls = runtime.match(/\.runShell\(/g) || [];
  assert.equal(calls.length, 0);
  // shell() itself is used only by the excluded speaker framing module
  const uses = runtime.match(/(?<!function )\bshell\(sdk/g) || [];
  assert.deepEqual(uses, []);
});

test('ffmpeg and ffprobe go through the host runtime', () => {
  assert.match(panel, /hostApi\("Runtime", tool\)/);
  for (const tool of ['runFFmpeg', 'runFFprobe']) assert.ok(panel.includes('hostFF("' + tool + '"'), tool);
  assert.ok(!/\bFF\s*\+/.test(panel), 'no FF shell prefix');
});

test('speaker framing uses shared AI on both platforms', () => {
  assert.ok(!panel.includes('ensureFaceRuntime'));
  assert.ok(!panel.includes('Speaker framing is available on macOS for now'));
  assert.match(panel, /createSharedAiJobClient/);
  assert.match(panel, /task: "faces.detect"/);
  assert.match(panel, /canonicalResourceId/);
  assert.doesNotMatch(panel, /opencv-python|FaceDetectorYN|python-envs/);
});

test('fonts are found through the host folders, not a shell variable', () => {
  assert.ok(panel.includes('await hostRoots(sdk, PANEL_ID, "fonts")'));
  assert.ok(panel.includes('fs().join(root, "fonts", file)'));
});

let failed = 0;
for (const t of tests) {
  try { t.fn(); console.log('ok - ' + t.name); } catch (e) { failed += 1; console.log('not ok - ' + t.name + '\n  ' + String(e.message).split('\n').join('\n  ')); }
}
console.log(tests.length - failed + '/' + tests.length + ' passed');
if (failed) process.exit(1);
