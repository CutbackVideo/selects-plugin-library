// plugins/torn-paper-love/tests/windows.test.cjs
// Windows safety of the runtime (selects-app-kit references/windows.md): no POSIX shell, no node spawn and no paths
// built with "/" in the code users run; the host I/O block (tpl-host) against fake macOS and Windows hosts, including
// values from another JavaScript realm; the in-panel beat worker equals beat-detect.cjs; ensure-audio matches host
// paths after normalising.
'use strict';
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const panel = read('panel.tsx');
const j = v => JSON.parse(JSON.stringify(v));

const block = (src, name) => {
  const open = '\n// ' + name + ':start\n', close = '\n// ' + name + ':end\n';
  const a = src.indexOf(open), b = src.indexOf(close);
  assert.ok(a >= 0 && b > a, name + ' markers');
  assert.equal(src.indexOf(open, a + 1), -1, name + ' start marker appears once');
  return src.slice(a + open.length, b + 1);
};
const hostBlock = block(panel, 'tpl-host'), workerBlock = block(panel, 'tpl-beat-worker'), quickBlock = block(panel, 'quick-score');
// Code without its comment lines (the comments may name the shell syntax they avoid).
const uncomment = text => text.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).map(l => l.replace(/\s\/\/ .*$/, '')).join('\n');

// ---- Runtime code: no POSIX shell, no node, no Homebrew / nvm / Finder PATH -----------------------------------------
const runtime = { 'panel.tsx': panel, 'build-config.js': read('build-config.js'), 'planner.js': read('planner.js') };
for (const dir of ['scripts', 'assets']) {
  for (const f of fs.readdirSync(path.join(root, dir)).sort()) if (/\.(js|tsx)$/.test(f)) runtime[dir + '/' + f] = read(dir + '/' + f);
}
assert.ok(Object.keys(runtime).length >= 10, 'every runtime file is scanned');
const BANNED = ['mkdir -p', 'printf', '$HOME', 'rm -f', 'base64 ', 'export PATH', 'command -v', 'TOOL_PATH', '/opt/homebrew', '/usr/local/bin', '.nvm', 'child_process',
  'runtime.sh', 'nodePath'];
for (const [name, text] of Object.entries(runtime)) {
  const code = uncomment(text);
  for (const bad of BANNED) assert.ok(!code.includes(bad), name + ' has no ' + JSON.stringify(bad));
  // A node spawn: `node <script>` in a command string, or a process API.
  assert.ok(!/["'`]\s*node\s/.test(code) && !/\bnode\s+["'\w./-]*\.c?js\b/.test(code), name + ' spawns no node');
  assert.ok(!/\b(execFile|spawn|execSync|spawnSync)\s*\(/.test(code), name + ' starts no process');
  // ffmpeg / ffprobe only as argv arrays through the host, never as a command line.
  assert.ok(!/\bffmpeg\s+-/.test(code) && !/\bffprobe\s+-/.test(code), name + ' has no ffmpeg / ffprobe command line');
  // The one shell call is hostSkillsRoot's (checked below); nothing else reaches the shell.
  if (name !== 'panel.tsx') assert.ok(!/runShell/.test(code), name + ' never calls runShell');
}
// panel.tsx: exactly one sdk.runShell call, in hostSkillsRoot inside the tpl-host block, with a cmd.exe branch for
// Windows; only an environment variable's value comes back, nothing goes in.
{
  const code = uncomment(panel);
  assert.equal((code.match(/runShell\(/g) || []).length, 1, 'one runShell call');
  const fn = hostBlock.slice(hostBlock.indexOf('async function hostSkillsRoot('), hostBlock.indexOf('async function hostRoots('));
  assert.ok(fn.includes('await sdk.runShell({ summary: "Locate the plugin folder", command, timeoutMs: 10000 })'), 'runShell lives in hostSkillsRoot');
  assert.ok(fn.includes(`const command = hostIsWindows() ? "echo(%SELECTS_USER_SKILLS_ROOT%" : 'echo "$SELECTS_USER_SKILLS_ROOT"';`), 'per-platform one-liner (cmd.exe on Windows)');
  assert.ok(!uncomment(panel.replace(hostBlock, '')).includes('runShell'), 'no runShell outside the host block');
}
// The host's services only through the guarded blocks (tpl-host, the kit quick score and its data folder helper).
{
  const helper = panel.slice(panel.indexOf('function tplQuickDataDir('), panel.indexOf('// tpl-host:start'));
  const outside = uncomment(panel.replace(hostBlock, '').replace(quickBlock, '').replace(helper, ''));
  assert.ok(!/__DI__|window\.parent/.test(outside), '__DI__ only in the host blocks');
  assert.ok(!/runFFmpeg\(|runFFprobe\(/.test(outside), 'ffmpeg only in the host blocks');
  assert.ok(!/:\s*(any|string|number|boolean)\b|Promise<|\bas any\b/.test(hostBlock + workerBlock), 'the host and worker blocks are plain JS');
}
// Paths are joined (FileSystem.join through hostJoin), never built with "/".
{
  const code = uncomment(panel);
  assert.ok(!/(?:plugin|root|data|dir|path|Dir|Path)\)?\s*\+\s*["'][\\/]|["'][\\/]assets/.test(code), 'paths are joined, never built with "/"');
  assert.ok(!/\.data\s*\+|\.plugin\s*\+/.test(code), 'no string-built install / data paths');
}

// ---- The host block in node:vm against fake hosts -------------------------------------------------------------------
function hostBox({ platform, files = new Set(), shell = null, ffmpeg = null, ffprobe = null, noJoin = false, readFile = null, noMkdir = false }) {
  const pathMod = platform === 'win32' ? path.win32 : path.posix;
  const calls = { shell: [], mkdir: [], removed: [], ffmpeg: [], ffprobe: [] };
  const FileSystem = {
    ...(noJoin ? {} : { join: (...a) => pathMod.join(...a) }),
    homedir: () => (platform === 'win32' ? 'C:\\Users\\\ud64d\uae38\ub3d9' : '/u/me'),
    existsSync: p => files.has(p),
    ...(noMkdir ? {} : { mkdirSync: (p, o) => calls.mkdir.push([p, o]) }),
    readFile: readFile || (async p => { throw Error('no file ' + p); }),
    removeFile: async ({ filePath }) => calls.removed.push(filePath),
  };
  const Runtime = { getPlatform: () => platform,
    ...(ffmpeg ? { runFFmpeg: async (argv, quiet, signal) => { calls.ffmpeg.push(argv); return ffmpeg(argv); } } : {}),
    ...(ffprobe ? { runFFprobe: async (argv) => { calls.ffprobe.push(argv); return ffprobe(argv); } } : {}) };
  const ctx = { window: { parent: { __DI__: { FileSystem, Runtime } } }, navigator: { platform: '', userAgent: '' }, TextDecoder, Uint8Array, ArrayBuffer, Float32Array,
    setTimeout, clearTimeout, AbortController, Date, Math, String, Error, Object, parseFloat };
  vm.createContext(ctx);
  vm.runInContext(hostBlock + '\nthis.H = { hostRoots, hostJoin, hostReadBytes, hostReadText, hostDecodePcm, hostCutAudio, hostProbeSeconds, hostNeed, hostApi, hostIsWindows, hostSkillsRoot, hostRemove };', ctx);
  const sdk = { runShell: async (o) => { calls.shell.push(o.command); return shell ? shell(o.command) : { stdout: '' }; } };
  return { H: ctx.H, calls, sdk };
}
const ID = 'torn-paper-love';
const hostTests = (async () => {
  // macOS: the default skills folder, no shell; the data folder is created under the home folder.
  {
    const { H, calls, sdk } = hostBox({ platform: 'darwin', files: new Set(['/u/me/.selects/skills/' + ID + '/planner.js']) });
    assert.deepEqual(j(await H.hostRoots(sdk, ID, 'planner.js')), { plugin: '/u/me/.selects/skills/' + ID, data: '/u/me/.selects/plugin-data/' + ID });
    assert.deepEqual(calls.shell, []);
    assert.deepEqual(j(calls.mkdir), [['/u/me/.selects/plugin-data/' + ID, { recursive: true }]]);
  }
  // Windows with a Korean user name: the default folder through FileSystem, backslashes, no shell.
  {
    const home = 'C:\\Users\\\ud64d\uae38\ub3d9';
    const { H, calls, sdk } = hostBox({ platform: 'win32', files: new Set([home + '\\.selects\\skills\\' + ID + '\\planner.js']) });
    assert.deepEqual(j(await H.hostRoots(sdk, ID, 'planner.js')), { plugin: home + '\\.selects\\skills\\' + ID, data: home + '\\.selects\\plugin-data\\' + ID });
    assert.deepEqual(calls.shell, []);
  }
  // Windows: SELECTS_USER_SKILLS_ROOT through cmd.exe when the default folder is not the install.
  {
    const { H, calls, sdk } = hostBox({ platform: 'win32', files: new Set(['D:\\Skills\\' + ID + '\\planner.js']), shell: () => ({ stdout: 'D:\\Skills\r\n' }) });
    assert.equal((await H.hostRoots(sdk, ID, 'planner.js')).plugin, 'D:\\Skills\\' + ID);
    assert.deepEqual(calls.shell, ['echo(%SELECTS_USER_SKILLS_ROOT%']);
  }
  // An unset variable (cmd prints an empty line, the literal or "ECHO is on.") is no folder.
  for (const stdout of ['\r\n', '%SELECTS_USER_SKILLS_ROOT%\r\n', 'ECHO is on.\r\n']) {
    const { H, sdk } = hostBox({ platform: 'win32', shell: () => ({ stdout }) });
    await assert.rejects(H.hostRoots(sdk, ID, 'planner.js'), e => e.code === 'not-found', JSON.stringify(stdout));
  }
  {
    const { H, calls, sdk } = hostBox({ platform: 'darwin', files: new Set(['/opt/skills/' + ID + '/planner.js']), shell: () => ({ stdout: '/opt/skills\n' }) });
    assert.equal((await H.hostRoots(sdk, ID, 'planner.js')).plugin, '/opt/skills/' + ID);
    assert.deepEqual(calls.shell, ['echo "$SELECTS_USER_SKILLS_ROOT"']);
  }
  // A host that cannot make the data folder: data is null (own music and the preview then stay off).
  {
    const { H, sdk } = hostBox({ platform: 'darwin', files: new Set(['/u/me/.selects/skills/' + ID + '/planner.js']), noMkdir: true });
    assert.equal((await H.hostRoots(sdk, ID, 'planner.js')).data, null);
  }
  // Without the host's join: the OS separator.
  assert.equal(hostBox({ platform: 'win32', noJoin: true }).H.hostJoin('C:\\a\\', 'assets', 'x.mp3'), 'C:\\a\\assets\\x.mp3');
  assert.equal(hostBox({ platform: 'darwin', noJoin: true }).H.hostJoin('/a/', 'assets', 'x.mp3'), '/a/assets/x.mp3');
  // A missing member: one host-missing error, never a crash; no ffmpeg means no decode and no cut (null).
  {
    const { H } = hostBox({ platform: 'darwin' });
    assert.equal(H.hostApi('Runtime', 'runFFmpeg'), null);
    assert.throws(() => H.hostNeed('Runtime', 'runFFmpeg'), e => e.code === 'host-missing' && e.member === 'Runtime.runFFmpeg');
    assert.equal(await H.hostDecodePcm('/x.mp3', '/data', 22050, 360), null);
    assert.equal(await H.hostCutAudio('/x.mp3', '/data', 1, 2, ['-f', 'mp3'], 'mp3', null), null);
    assert.equal(await H.hostProbeSeconds('/x.mp3'), null);
  }
  // Cross-realm reads: FileSystem.readFile lives in window.parent, so its bytes come from another JavaScript realm,
  // where `instanceof Uint8Array/ArrayBuffer` is false. The block reads them anyway (Archive Vlog's first panel open
  // failed here with "the file could not be read").
  {
    const foreignU8 = vm.runInNewContext('new Uint8Array([104, 105, 33])');
    const foreignAB = vm.runInNewContext('new Uint8Array([111, 107]).buffer');
    const foreignBuf = vm.runInNewContext('(() => { const b = new ArrayBuffer(16); const v = new Uint8Array(b, 5, 3); v.set([97, 98, 99]); return v; })()');
    assert.ok(!(foreignU8 instanceof Uint8Array) && !(foreignAB instanceof ArrayBuffer), 'the test values really are from another realm');
    for (const [v, text] of [[foreignU8, 'hi!'], [foreignAB, 'ok'], [foreignBuf, 'abc']]) {
      const { H } = hostBox({ platform: 'win32', readFile: async () => v });
      assert.equal(await H.hostReadText('C:\\x.txt'), text);
      assert.equal(Buffer.from(await H.hostReadBytes('C:\\x.bin')).toString(), text);
    }
    // Text straight from the host, and a Buffer view into a larger pool.
    assert.equal(await hostBox({ platform: 'darwin', readFile: async () => 'plain' }).H.hostReadText('/f'), 'plain');
    const pool = Buffer.alloc(64, 7); Buffer.from('hello').copy(pool, 13);
    assert.equal(await hostBox({ platform: 'darwin', readFile: async () => pool.subarray(13, 18) }).H.hostReadText('/f'), 'hello');
    // Bytes for a decode, from another realm, at an odd offset.
    const foreignPcm = vm.runInNewContext('(() => { const b = new ArrayBuffer(3 + 16); const v = new Uint8Array(b, 3, 16); v.set(new Uint8Array(new Float32Array([0.5, -0.25, 1, 0]).buffer)); return v; })()');
    let wrote = null;
    const { H, calls } = hostBox({ platform: 'win32', ffmpeg: argv => { wrote = argv[argv.length - 1]; return { stdout: '' }; }, readFile: async p => { assert.equal(p, wrote); return foreignPcm; } });
    const userTrack = 'C:\\Users\\\ud64d\uae38\ub3d9\\Music\\my song (1).mp3';
    const out = await H.hostDecodePcm(userTrack, 'C:\\Users\\\ud64d\uae38\ub3d9\\.selects\\plugin-data\\' + ID, 22050, 360);
    assert.deepEqual(Array.from(out), [0.5, -0.25, 1, 0]);
    const argv = j(calls.ffmpeg[0]);
    assert.deepEqual(argv.slice(0, 8), ['-nostdin', '-v', 'error', '-y', '-t', '360', '-i', userTrack], 'an argv, the user path as one element');
    assert.deepEqual(argv.slice(8, 14), ['-ac', '1', '-ar', '22050', '-f', 'f32le']);
    assert.ok(/\\plugin-data\\torn-paper-love\\pcm-[\w-]+\.f32$/.test(wrote) && /^[\x20-\x7e]+$/.test(path.win32.basename(wrote)), 'temp file in the data folder, ASCII name: ' + wrote);
    assert.deepEqual(calls.removed, [wrote], 'the temp file is removed');
  }
  // The section preview: an argv with the span and the encoder arguments, an ASCII temp file, the bytes back, removed.
  {
    let wrote = null;
    const mp3 = vm.runInNewContext('new Uint8Array(400).fill(255)');
    const { H, calls } = hostBox({ platform: 'win32', ffmpeg: argv => { wrote = argv[argv.length - 1]; return {}; }, readFile: async () => mp3 });
    const bytes = await H.hostCutAudio('D:\\\uc74c\uc545\\track.m4a', 'C:\\data', 12.5, 9.33, ['-ac', '1', '-f', 'mp3'], 'mp3', null);
    assert.equal(bytes.byteLength, 400);
    assert.deepEqual(j(calls.ffmpeg[0]), ['-nostdin', '-v', 'error', '-y', '-ss', '12.5', '-t', '9.33', '-i', 'D:\\\uc74c\uc545\\track.m4a', '-ac', '1', '-f', 'mp3', wrote]);
    assert.ok(/^C:\\data\\cut-[\w-]+\.mp3$/.test(wrote), wrote);
    assert.deepEqual(calls.removed, [wrote]);
  }
  // ffmpeg failing still removes the temp file and rejects (the panel then reports it).
  {
    const { H, calls } = hostBox({ platform: 'darwin', ffmpeg: () => { throw Error('Invalid data found'); }, readFile: async () => new Uint8Array(0) });
    await assert.rejects(H.hostDecodePcm('/m.mp3', '/data', 22050, 360), /Invalid data/);
    assert.equal(calls.removed.length, 1);
  }
  // ffprobe: the length from an argv.
  {
    const { H, calls } = hostBox({ platform: 'win32', ffprobe: () => ({ stdout: '187.43\r\n' }) });
    assert.equal(await H.hostProbeSeconds('C:\\m.mp3'), 187.43);
    assert.deepEqual(j(calls.ffprobe[0]).slice(-1), ['C:\\m.mp3']);
  }
})();

// ---- The panel's error mapping and helpers --------------------------------------------------------------------------
assert.ok(panel.includes('return e?.code === "host-missing" ? (l) => t(l, "adapterNeeded", { name: e.member }) : e?.code === "not-found" ? (l) => t(l, "foldersNotFound") : null;'), 'one "needs an update" message');

// ---- The beat worker runs beat-detect.cjs unmodified and answers like the CLI ----------------------------------------
const detectorText = read('beat-detect.cjs');
{
  // One source: the kit's beat-detect.cjs, byte for byte (checked when a kit checkout is at hand; CI has none).
  const kit = path.join(process.env.SELECTS_APP_KIT || path.join(os.homedir(), 'Workspaces', 'selects-app-kit'), 'tools', 'audio', 'beat-detect.cjs');
  if (fs.existsSync(kit)) assert.equal(detectorText, fs.readFileSync(kit, 'utf8'), 'beat-detect.cjs is the kit file, unmodified');
  const box = {}; vm.createContext(box);
  vm.runInContext(workerBlock + '\nthis.src = tplBeatWorkerSource;', box);
  const source = box.src(detectorText);
  assert.ok(source.includes(detectorText), 'the worker embeds the file unmodified');
  // A 100 BPM click track, 20 s at 22.05 kHz.
  const rate = 22050, n = rate * 20, samples = new Float32Array(n);
  for (let b = 0.4; b < 20; b += 0.6) { const s = Math.round(b * rate); for (let i = 0; i < 400 && s + i < n; i++) samples[s + i] = Math.exp(-i / 60) * Math.sin(i * 0.9); }
  const posted = [];
  const ctx = { postMessage: m => posted.push(m) };
  vm.createContext(ctx);
  vm.runInContext(source, ctx);
  ctx.onmessage({ data: { samples, rate } });
  assert.ok(posted[0] && posted[0].ok, 'the worker answers ' + JSON.stringify(posted[0] && posted[0].error));
  const cli = require(path.join(root, 'beat-detect.cjs')).analyze(samples, rate);
  assert.deepEqual(j(posted[0].ok), j(cli), 'worker result = beat-detect.cjs result');
  assert.ok(Math.abs(cli.bpm - 100) < 1, 'click track at 100 BPM: ' + cli.bpm);
  // A failure comes back as { error }, never a thrown worker.
  posted.length = 0;
  ctx.onmessage({ data: { samples: null, rate } });
  assert.ok(posted[0] && typeof posted[0].error === 'string', 'errors are posted');
}

// ---- ensure-audio.js and its read-only twin (tplFindAudioScript) match host paths after normalising ---------------
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const ensureJs = read('scripts/ensure-audio.js');
const runEnsure = (cfg, sel) => new AsyncFunction('selects', ensureJs.replace('__CONFIG__', () => JSON.stringify(cfg)))(sel);
const findScript = (() => {
  const a = panel.indexOf('function tplFindAudioScript('), b = panel.indexOf('function tplOpenScript(');
  return new Function(panel.slice(a, b) + '\nreturn tplFindAudioScript;')();
})();
const runFind = (cfg, sel) => new AsyncFunction('selects', findScript(cfg.projectId, cfg.path, cfg.duration))(sel);
const audioProject = (stored, name, durationSeconds = 65.045) => {
  const imports = [];
  return { imports, sel: { project: () => ({
    sourceFiles: async () => ({ fileTree: [{ type: 'dir', name: 'cues', children: [{ type: 'audio', name, resourceId: 'a1', path: stored }] }] }),
    resources: async () => [{ resourceId: 'v1', type: 'Video', name: 'x.mov' }, { resourceId: 'a1', type: 'Audio', name, durationSeconds }],
    importFiles: async ({ paths }) => { imports.push(...paths); return { addedResourceIds: ['a9'] }; },
  }) } };
};
const winCue = 'C:\\Users\\\ud64d\uae38\ub3d9\\.selects\\skills\\torn-paper-love\\assets\\cues\\bedroom-pop-love.mp3';
const ensureTests = (async () => {
  const cases = [
    // [label, stored path, stored name, stored length, cfg, found]
    ['Windows: slashes and drive-letter case differ', 'c:/users/\ud64d\uae38\ub3d9/.selects/skills/torn-paper-love/assets/cues/bedroom-pop-love.mp3', 'bedroom-pop-love.mp3', 65.045, { path: winCue }, true],
    ['a Korean name stored decomposed (NFD)', '/m/' + '\ub0b4 \ub178\ub798.mp3'.normalize('NFD'), '\ub0b4 \ub178\ub798.mp3'.normalize('NFD'), 120, { path: '/m/\ub0b4 \ub178\ub798.mp3' }, true],
    ['same cue file elsewhere, same length', '/old/place/bedroom-pop-love.mp3', 'bedroom-pop-love.mp3', 65.2, { path: winCue, duration: 65.045 }, true],
    ['same name, another length', '/my/music/bedroom-pop-love.mp3', 'bedroom-pop-love.mp3', 180, { path: winCue, duration: 65.045 }, false],
    ['same name, no length in cfg', '/my/music/bedroom-pop-love.mp3', 'bedroom-pop-love.mp3', 65.045, { path: winCue }, false],
    ['the exact path needs no length', winCue, 'bedroom-pop-love.mp3', 999, { path: winCue, duration: 65.045 }, true],
  ];
  for (const [label, stored, name, len, cfg, found] of cases) {
    const full = { projectId: 'p', ...cfg };
    const a = audioProject(stored, name, len);
    assert.deepEqual(await runEnsure(full, a.sel), found ? { resourceId: 'a1', imported: false } : { resourceId: 'a9', imported: true }, 'ensure-audio: ' + label);
    assert.deepEqual(a.imports, found ? [] : [cfg.path], label);
    const b = audioProject(stored, name, len);
    assert.deepEqual(await runFind(full, b.sel), { resourceId: found ? 'a1' : null, imported: false }, 'tplFindAudioScript: ' + label);
    assert.deepEqual(b.imports, [], 'the recovery never imports');
  }
})();

Promise.all([hostTests, ensureTests]).then(() => console.log(JSON.stringify({ windows: 'ok' })), e => { console.error(e); process.exit(1); });
