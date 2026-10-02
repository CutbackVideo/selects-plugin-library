// plugins/summer-trip/tests/no-shell.test.cjs (run: node plugins/summer-trip/tests/no-shell.test.cjs)
// Windows (kit references/windows.md rules 1-2): nothing in the runtime path may need a POSIX shell or Node.js. On
// Windows sdk.runShell is cmd.exe, and Selects bundles no Node, so the runtime files use the host's services instead
// (st-host block: FileSystem, Runtime.runFFmpeg/runFFprobe with argument arrays, a Web Worker for beat detection).
// Runtime files: panel.tsx, scripts/*.js (run_script), assets/*.tsx (effects and graphics), and the files the panel
// embeds or loads (muffle.cjs, graphics-defs.js, planner.js, beat-detect.cjs up to its node-only CLI branch).
// Comments are not code: they may name the old shell commands. dev/ tools are build-time only and are not scanned.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const list = (dir, re) => fs.readdirSync(path.join(root, dir)).filter((f) => re.test(f)).sort().map((f) => dir + '/' + f);

// Line comments (whole lines, and a trailing ` // ...` after code) and block comments removed; strings stay.
function code(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => (/^\s*\/\//.test(l) ? '' : l.replace(/\s\/\/\s.*$/, ''))).join('\n');
}

// POSIX shell syntax and tools, shell-only folders, and ways to start a process or Node.js.
const TOKENS = ['runShell', 'mkdir -p', 'printf ', 'printf\'', '$HOME', '${HOME}', 'rm -f', 'rm -rf', 'mv -f', 'base64 ', 'base64 -', 'export PATH', 'command -v',
  'shasum', 'cut -c', '2>/dev/null', '>/dev/null', '$SELECTS_USER_SKILLS_ROOT', '%SELECTS_USER_SKILLS_ROOT%', '%USERPROFILE%', '/opt/homebrew', '/usr/local/bin',
  '.nvm/', '/bin/sh', 'sh -c', '/tmp/', 'runtime.sh', 'child_process', 'execFile', 'execSync', 'spawnSync', 'process.env'];
const PATTERNS = [
  [/["'`]\s*node\s/, 'a node command'], [/\bnode\s+["'`]/, 'a node command'], [/\bspawn\s*\(/, 'spawn('], [/\bexec\s*\(\s*["'`]/, 'exec("...")'],
  [/'\\''/, 'POSIX single-quote escaping'], [/\[\s+-[sefd]\s/, 'a [ -s file ] test'], [/;\s*exit\s+\$/, 'exit $status'], [/\$\(\s*[a-z]/, '$(command)'],
  [/\$\?/, '$?'], [/\b[sd]q\(/, 'a shell quoting helper (sq/dq)'], [/\|\s*(cut|grep|sed|awk|head|tail)\b/, 'a shell pipe'],
];
function violations(text) {
  const c = code(text);
  return [...TOKENS.filter((t) => c.includes(t)), ...PATTERNS.filter(([re]) => re.test(c)).map(([, name]) => name)];
}

// The check itself sees the old shell steps (the shapes panel.tsx had before), and leaves plain panel code alone.
for (const sample of ['sdk.runShell({ command })', 'TOOL_PATH + "mkdir -p " + sq(dir)', '"shasum -a 256 < " + sq(path) + " | cut -c1-8"', '"base64 -d < " + src',
  "'\\''", '"[ -s " + out + " ] || x"', '"; s=$?; rm -f " + sq(pcm) + "; exit $s"', 'command: "node " + q', 'sq(node) + " " + sq(f)',
  'const SKILLS_DIR = "$SELECTS_USER_SKILLS_ROOT/" + id', 'export PATH="$PATH:/opt/homebrew/bin"', 'require("node:child_process")'])
  assert.ok(violations(sample).length, 'the check sees: ' + sample);
for (const sample of ['for (const node of nodes) x(node);', 'await hostFFmpeg(stMuffleArgs(path, part), { timeoutMs: 180000 });', 'const k = a && b ? c : d;',
  '// shasum -a 256 printed the same name', 'url("data:font/woff2;base64," + b64)', 'hostJoin(dataDir, "pcm-" + hostToken() + ".f32")'])
  assert.deepEqual(violations(sample), [], 'no false alarm: ' + sample);

// The runtime files.
const files = ['panel.tsx', ...list('scripts', /\.js$/), ...list('assets', /\.tsx$/), 'muffle.cjs', 'graphics-defs.js', 'planner.js'];
assert.ok(files.length >= 14, 'runtime files found: ' + files.length);
const found = {};
for (const rel of files) { const v = violations(read(rel)); if (v.length) found[rel] = v; }
// beat-detect.cjs runs in the panel's Web Worker: its core (everything before module.exports) must be shell- and
// node-free; the `require.main === module` CLI branch after it is the dev/CI path and never runs in the panel.
const beat = read('beat-detect.cjs');
const core = beat.slice(0, beat.search(/^module\.exports\b/m));
const vb = [...violations(core), ...['require(', 'process.', 'Buffer'].filter((t) => code(core).includes(t))];
if (vb.length) found['beat-detect.cjs (core)'] = vb;
assert.deepEqual(found, {}, 'POSIX shell or Node.js in the runtime path');

// The panel starts no shell at all: no runShell anywhere (comments included), and every ffmpeg/ffprobe call is an
// argument array through the host block.
const panel = read('panel.tsx');
assert.ok(!panel.includes('runShell'), 'no runShell in panel.tsx, not even in a comment');
assert.ok(!/\bshell\(/.test(code(panel)), 'no shell() helper');
for (const m of code(panel).matchAll(/\b(hostFFmpeg|hostFFprobe|runFFmpeg|runFFprobe)\(([^)]*)/g)) {
  const arg = m[2].trim();
  assert.ok(arg === '' || /^(\[|args\b|stMuffleArgs\(|cut\.concat\(|member\b)/.test(arg) || /^\w+\.map\(String\)/.test(arg), 'argv array: ' + m[0]);
}
console.log(JSON.stringify({ noShell: 'ok', files: files.length + 1 }));
