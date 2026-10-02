// plugins/the-end-credits/tests/windows.test.cjs (run: node plugins/the-end-credits/tests/windows.test.cjs)
// Windows: nothing in the runtime path may need a POSIX shell, Node.js or user-installed tools. The panel's
// sdk.runShell is cmd.exe on Windows (and its HOME a throwaway folder), Selects bundles no Node, and Homebrew/nvm do
// not exist there. Runtime files are what users run: panel.tsx, the run_script bodies (scripts/*.js) and the effects
// and graphics (assets/*.tsx). Host I/O goes through panel.tsx's tec-host block (FileSystem + Runtime.runFFmpeg /
// runFFprobe with argv arrays). Build-time tools (dev/, beat-detect.cjs's CLI) stay macOS-only and are not scanned;
// kit-beat-detect.cjs runs in the panel's Worker, where its CLI branch is disabled (tests/host.test.cjs).
// Allow-list: none. (Hyun/Jay's template code in panel.tsx needs no exception: it reads through locateRoots/readText.)
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');

const runtime = ['panel.tsx',
  ...fs.readdirSync(path.join(root, 'scripts')).filter((f) => f.endsWith('.js')).map((f) => 'scripts/' + f),
  ...fs.readdirSync(path.join(root, 'assets')).filter((f) => f.endsWith('.tsx')).map((f) => 'assets/' + f)];
assert.ok(runtime.length >= 9, 'panel, 5 scripts, 3 assets: ' + runtime.join(', '));

// [name, pattern]: each must not occur in any runtime file (comments included: a comment that shows a shell recipe is
// how one creeps back in).
const BANNED = [
  ['runShell', /\brunShell\b/],
  ['$HOME / ${VAR} / $VAR shell expansion', /\$HOME\b|\$\{?SELECTS_[A-Z_]+|\$PATH\b|\$\?/],
  ['%VAR% (cmd.exe expansion)', /%(USERPROFILE|HOME|APPDATA|SELECTS_[A-Z_]+)%/],
  ['printf', /\bprintf\b/],
  ['mkdir -p', /\bmkdir\s+-p\b/],
  ['rm -f / rm -rf', /\brm\s+-r?f\b/],
  ['base64 CLI', /\bbase64\s+(<|-[a-zA-Z]|["'])/],
  ['export PATH', /\bexport\s+PATH\b/],
  ['command -v', /\bcommand\s+-v\b/],
  ['/opt/homebrew or /usr/local/bin', /\/opt\/homebrew|\/usr\/local\/bin/],
  ['nvm', /\.nvm\b|\bnvm\s/],
  ['sh <script>', /["'`]\s*(ba|z)?sh\s|\b(ba|z)?sh\s+["'$]|\.sh\b/],
  ['/dev/null redirection', /[12]?>\s*\/dev\/null/],
  ['/tmp paths', /["'`]\/tmp\b/],
  ['a node / python subprocess', /(["'`]|&&|\|\|)\s*(node|python3?)\s+["'$\-\/\w]|child_process|\bexecFile(Sync)?\(|\bspawn(Sync)?\(/],
  ['shell single-quote escaping', /'\\\\''/],
  ['TOOL_PATH / ensureNode / runtime.sh', /\bTOOL_PATH\b|\bensureNode\b|runtime\.sh/],
];

// The patterns catch what they are meant to, and not the legitimate font data URLs or JS `&&`.
const hits = (text) => BANNED.filter(([, re]) => re.test(text)).map(([name]) => name);
for (const sample of ['sdk.runShell({ command })', '"mkdir -p " + dq(DATA_DIR)', "printf '%s'", 'TOOL_PATH + "rm -f " + x', '" && base64 < " + f',
  'export PATH="$PATH:/opt/homebrew/bin"', 'command -v ffmpeg >/dev/null', '"sh " + dq(dir + "/runtime.sh")', 'command: "sh " + script', "'bash -lc x'", 'ls -d "$HOME"/.nvm/versions', '"/tmp/x.f32"',
  '" && node " + sq(f)', "x.replace(/'/g, \"'\\\\''\")", 'echo(%SELECTS_USER_SKILLS_ROOT%', 'execFileSync(ffmpeg, args)']) {
  assert.ok(hits(sample).length, 'the check sees: ' + sample);
}
for (const sample of ['url(data:font/woff2;base64," + b64 + ")', 'a && b', 'sh /= group.length; (sh / sharpMax)', 'for (const node of nodes)', 'tecHostJoin(root, "assets", "cues", cue.file)', 'fs.join(fs.homedir(), ".selects")']) {
  assert.deepEqual(hits(sample), [], 'no false positive: ' + sample);
}

const found = [];
for (const rel of runtime) {
  const lines = fs.readFileSync(path.join(root, rel), 'utf8').split('\n');
  lines.forEach((line, i) => { for (const name of hits(line)) found.push(rel + ':' + (i + 1) + ' ' + name + ': ' + line.trim().slice(0, 140)); });
}
assert.deepEqual(found, [], 'POSIX shell / tool dependencies in runtime files:\n' + found.join('\n'));

// Paths in the panel are joined by the host (tecHostJoin / FileSystem.join), never with a hand-written "/" or "\\".
const panel = fs.readFileSync(path.join(root, 'panel.tsx'), 'utf8');
const template = panel.slice(panel.indexOf('const TEMPLATE_ALIAS_JS'), panel.indexOf('// The handed videos and photos'));
const own = panel.replace(template, '');
const slash = own.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /\+\s*["'`](\/|\\\\)["'`]|["'`](\/|\\\\)["'`]\s*\+/.test(l))
  // Not a path: the template run's "Choosing shots i/n" progress count (Hyun/Jay's code, unchanged).
  .filter(([, l]) => !l.includes('say("Choosing shots", i + "/" + todo.length'));
assert.deepEqual(slash, [], 'hand-built paths in panel.tsx');
console.log(JSON.stringify({ windows: 'ok', files: runtime.length, patterns: BANNED.length }));
