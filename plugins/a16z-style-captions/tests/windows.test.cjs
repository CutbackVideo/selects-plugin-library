// plugins/a16z-style-captions/tests/windows.test.cjs (run: node plugins/a16z-style-captions/tests/windows.test.cjs)
// Static Windows check of the GENERATED panel.tsx: on Windows sdk.runShell is cmd.exe, so runtime code must not
// send POSIX shell syntax to it; ffmpeg/ffprobe go through the host (Runtime.runFFmpeg / runFFprobe). One narrow
// exclusion: the macOS-only speaker framing module (src/pipeline/faces.ts, and the Python source it runs), which
// makeShort reaches only behind `if (hostIsWindows())`.
const fs = require('node:fs'), path = require('node:path');
const assert = require('node:assert/strict');

const panel = fs.readFileSync(path.join(__dirname, '..', 'panel.tsx'), 'utf8');
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// esbuild heads each bundled module with a "// plugins/<id>/src/<file>" line.
const MODULE = '// plugins/a16z-style-captions/src/';
function withoutModule(text, file) {
  const a = text.indexOf(MODULE + file + '\n');
  assert.ok(a >= 0, 'module marker for ' + file);
  const b = text.indexOf('\n' + MODULE, a + 1);
  assert.ok(b > a, 'next module after ' + file);
  return text.slice(0, a) + text.slice(b);
}
const runtime = withoutModule(withoutModule(panel, 'pipeline/faces.ts'), 'pipeline/face_track.py');

const POSIX = [
  ['printf', /\bprintf\b/], ['$HOME', /\$HOME\b/], ['$SELECTS_USER', /\$SELECTS_USER/], ['command -v', /command -v/],
  ['mkdir -p', /mkdir -p/], ['rm -f', /rm -f/], ['base64 ', /base64 /], ['export PATH', /export PATH/], ['| grep', /\| grep/],
  ['shasum', /shasum/], ['cat "', /cat "/], ['node " spawn', /["'`]node ["']/], ['$FF / $FP', /"\$F[FP]"/],
];

test('runtime code sends no POSIX shell syntax', () => {
  const hits = [];
  for (const [label, re] of POSIX) {
    runtime.split('\n').forEach((line, i) => { if (re.test(line)) hits.push(label + ': ' + line.trim().slice(0, 140)); });
  }
  assert.deepEqual(hits, []);
});

test('runShell is only called by the shell() helper', () => {
  const calls = runtime.match(/\.runShell\(/g) || [];
  assert.equal(calls.length, 1);
  // shell() itself is used only by the excluded speaker framing module
  const uses = runtime.match(/(?<!function )\bshell\(sdk/g) || [];
  assert.deepEqual(uses, []);
});

test('ffmpeg and ffprobe go through the host runtime', () => {
  assert.match(panel, /hostApi\("Runtime", tool\)/);
  for (const tool of ['runFFmpeg', 'runFFprobe']) assert.ok(panel.includes('hostFF("' + tool + '"'), tool);
  assert.ok(!/\bFF\s*\+/.test(panel), 'no FF shell prefix');
});

test('speaker framing is skipped on Windows before the macOS-only runtime', () => {
  const gate = panel.indexOf('if (hostIsWindows()) {');
  const call = panel.indexOf('await ensureFaceRuntime(');
  assert.ok(gate > 0 && call > gate, 'gate precedes ensureFaceRuntime');
  assert.ok(panel.slice(gate, call).includes('Speaker framing is available on macOS for now'));
  assert.equal((panel.match(/ensureFaceRuntime\(/g) || []).length, 2, 'one definition, one gated call');
  assert.equal((panel.match(/trackFaces\(/g) || []).length, 2, 'one definition, one gated call');
  assert.ok(!/navigator\.userAgent\)/.test(panel.replace(/function hostIsWindows[\s\S]*?\n}\n/, '')), 'platform comes from hostIsWindows');
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
