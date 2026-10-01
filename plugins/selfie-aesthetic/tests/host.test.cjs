// plugins/selfie-aesthetic/tests/host.test.cjs
// Host helpers: the panel's shell-agnostic block (root probe parsing, path joins, node command quoting) and
// tools/run.cjs (jobs run through real ffmpeg when it is installed).
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), vm = require('node:vm');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const RUN = path.join(root, 'tools', 'run.cjs');

// ---- host block, evaluated as plain JS exactly like the panel copy ----
const src = fs.readFileSync(path.join(root, 'dev', 'host-block.ts'), 'utf8');
const a = src.indexOf('// sae-host:start'), z = src.indexOf('// sae-host:end');
assert.ok(a >= 0 && z > a, 'host block markers');
const block = src.slice(a, z);
const box = { String, RegExp, Error }; vm.createContext(box);
vm.runInContext(block + ';globalThis.H={saeRootProbeCommand,saeParseRoot,saeSep,saeJoin,saeNodeCmd};', box);
const H = box.H;

assert.equal(H.saeRootProbeCommand(), 'echo %SELECTS_USER_SKILLS_ROOT% $SELECTS_USER_SKILLS_ROOT');
// cmd.exe expands the first word; CRLF and spaces in the path.
assert.equal(H.saeParseRoot('C:\\Users\\a b\\.selects\\skills $SELECTS_USER_SKILLS_ROOT\r\n'), 'C:\\Users\\a b\\.selects\\skills');
assert.equal(H.saeParseRoot('\r\nC:\\Users\\a b\\.selects\\skills\\ $SELECTS_USER_SKILLS_ROOT\r\n'), 'C:\\Users\\a b\\.selects\\skills');
// sh expands the second word.
assert.equal(H.saeParseRoot('%SELECTS_USER_SKILLS_ROOT% /Users/x/.selects/skills\n'), '/Users/x/.selects/skills');
assert.equal(H.saeParseRoot('%SELECTS_USER_SKILLS_ROOT% /Users/x y/Library/Application Support/skills/\r\n'), '/Users/x y/Library/Application Support/skills');
// Neither expanded: unset in cmd.exe (both literal) or in sh (empty second word).
assert.equal(H.saeParseRoot('%SELECTS_USER_SKILLS_ROOT% $SELECTS_USER_SKILLS_ROOT\r\n'), null);
assert.equal(H.saeParseRoot('%SELECTS_USER_SKILLS_ROOT% \n'), null);
assert.equal(H.saeParseRoot(''), null);
assert.equal(H.saeParseRoot(undefined), null);

assert.equal(H.saeSep('C:\\Users\\a b\\.selects\\skills'), '\\');
assert.equal(H.saeSep('\\\\server\\share\\skills'), '\\');
assert.equal(H.saeSep('/Users/x/.selects/skills'), '/');
assert.equal(H.saeJoin('C:\\Users\\a b\\skills', 'selfie-aesthetic', 'assets/cues/a.mp3'), 'C:\\Users\\a b\\skills\\selfie-aesthetic\\assets\\cues\\a.mp3');
assert.equal(H.saeJoin('C:\\Users\\a b\\skills\\', '\\selfie-aesthetic\\', 'tools', 'run.cjs'), 'C:\\Users\\a b\\skills\\selfie-aesthetic\\tools\\run.cjs');
assert.equal(H.saeJoin('C:\\', 'x'), 'C:\\x');
assert.equal(H.saeJoin('/Users/x/skills/', '/selfie-aesthetic/', 'assets\\cues', 'a.mp3'), '/Users/x/skills/selfie-aesthetic/assets/cues/a.mp3');
assert.equal(H.saeJoin('/', 'tmp-like'), '/tmp-like');
assert.equal(H.saeJoin('/Users/x/skills'), '/Users/x/skills');

assert.equal(H.saeNodeCmd('/Users/x y/skills/selfie-aesthetic/tools/run.cjs', '/Users/x y/skills/selfie-aesthetic/.local/job.json'),
  'node "/Users/x y/skills/selfie-aesthetic/tools/run.cjs" "/Users/x y/skills/selfie-aesthetic/.local/job.json"');
assert.equal(H.saeNodeCmd('C:\\Users\\a b\\run.cjs', 'C:\\Users\\a b\\job.json'), 'node "C:\\Users\\a b\\run.cjs" "C:\\Users\\a b\\job.json"');
assert.equal(H.saeNodeCmd('/s/run.cjs', '/s/job.json', '/opt/homebrew/bin/node'), '/opt/homebrew/bin/node "/s/run.cjs" "/s/job.json"');
assert.equal(H.saeNodeCmd('C:\\s\\run.cjs', 'C:\\s\\j.json', 'C:\\Program Files\\nodejs\\node.exe'),
  '"C:\\Program Files\\nodejs\\node.exe" "C:\\s\\run.cjs" "C:\\s\\j.json"');
for (const bad of ['/a"b', '/a%b%', '/a$HOME', '/a`x`', '/a\nb', '/a\rb', 'C:\\dir\\', ''])
  assert.throws(() => H.saeNodeCmd(bad, '/j.json'), /saeNodeCmd/, 'rejects script ' + JSON.stringify(bad));
assert.throws(() => H.saeNodeCmd('/s.cjs', '/j$X.json'), /saeNodeCmd/);
assert.throws(() => H.saeNodeCmd('/s.cjs', '/j.json', 'no"de'), /saeNodeCmd/);
// The command really runs through the local shell (sh here; cmd.exe on Windows hosts).
{
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'sae host '));
  const script = path.join(t, 'echo args.cjs');
  fs.writeFileSync(script, 'process.stdout.write(JSON.stringify(process.argv.slice(2)))');
  const job = path.join(t, 'a & b; c.json');
  const out = execFileSync(process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
    process.platform === 'win32' ? ['/d', '/s', '/c', '"' + H.saeNodeCmd(script, job, process.execPath) + '"'] : ['-c', H.saeNodeCmd(script, job, process.execPath)],
    { encoding: 'utf8', windowsVerbatimArguments: true });
  assert.deepEqual(JSON.parse(out), [job]);
  fs.rmSync(t, { recursive: true, force: true });
}

// ---- static checks on run.cjs ----
const runSrc = fs.readFileSync(RUN, 'utf8');
assert.ok(!/shell\s*:\s*true/.test(runSrc), 'no shell: true');
assert.ok(!/\bexec\s*\(|\bexecSync\s*\(/.test(runSrc), 'execFile/spawn only');
assert.ok(!runSrc.includes('/tmp'), 'no /tmp');
assert.ok(!runSrc.includes('~'), 'no ~');
assert.ok(!/os\.tmpdir|tmpdir\(/.test(runSrc), 'no system temp dir');

// ---- run.cjs jobs ----
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'sae-run '));
const dataDir = path.join(work, 'data dir');
let n = 0;
function job(obj, env) {
  const f = path.join(work, 'job' + (n++) + '.json');
  fs.writeFileSync(f, typeof obj === 'string' ? obj : JSON.stringify(obj));
  const r = spawnSync(process.execPath, [RUN, f], { encoding: 'utf8', env: Object.assign({}, process.env, env || {}) });
  const lines = r.stdout.split('\n').filter(Boolean);
  assert.equal(lines.length, 1, 'one stdout line: ' + r.stdout + r.stderr);
  assert.ok(Buffer.byteLength(lines[0]) <= 2048, 'line <= 2 KB');
  return { code: r.status, out: JSON.parse(lines[0]) };
}

const tools = job({ job: 'tools' });
assert.equal(tools.code, 0);
assert.equal(tools.out.ok, true);
assert.equal(tools.out.node, process.version);
assert.equal(tools.out.platform, process.platform);
assert.ok(tools.out.ffmpeg === null || path.isAbsolute(tools.out.ffmpeg));
// Finder-launched apps have no Homebrew PATH: the script still finds ffmpeg in the usual folders.
if (process.platform === 'darwin' && tools.out.ffmpeg && /^\/(opt\/homebrew|usr\/local)\/bin\//.test(tools.out.ffmpeg)) {
  const bare = job({ job: 'tools' }, { PATH: '/usr/bin:/bin' });
  assert.equal(bare.out.ffmpeg, tools.out.ffmpeg, 'found without PATH');
}

const ens = job({ job: 'ensureDir', dataDir });
assert.equal(ens.code, 0);
assert.ok(fs.statSync(dataDir).isDirectory());

// Malformed and invalid jobs: non-zero exit and a JSON error.
for (const bad of ['{not json', JSON.stringify({ job: 'nope', dataDir }), JSON.stringify({ job: 'ensureDir', dataDir: 'relative/dir' }),
  JSON.stringify({ job: 'probe', file: path.join(work, 'missing.wav') })]) {
  const r = job(bad);
  assert.notEqual(r.code, 0, 'fails: ' + bad);
  assert.equal(r.out.ok, false);
  assert.equal(typeof r.out.error, 'string');
}
{
  const r = spawnSync(process.execPath, [RUN], { encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.equal(JSON.parse(r.stdout).ok, false);
}

// cleanup: inside dataDir only.
fs.writeFileSync(path.join(dataDir, 'tmp1.txt'), 'x');
fs.writeFileSync(path.join(work, 'outside.txt'), 'x');
for (const outside of [path.join(work, 'outside.txt'), path.join('..', 'outside.txt'), dataDir, '.']) {
  const r = job({ job: 'cleanup', dataDir, files: [path.join(dataDir, 'tmp1.txt'), outside] });
  assert.notEqual(r.code, 0, 'refuses ' + outside);
  assert.match(r.out.error, /outside dataDir/);
}
assert.ok(fs.existsSync(path.join(dataDir, 'tmp1.txt')), 'nothing deleted when one path is refused');
assert.ok(fs.existsSync(path.join(work, 'outside.txt')));
{
  const r = job({ job: 'cleanup', dataDir, files: [path.join(dataDir, 'tmp1.txt'), 'never-existed.txt'] });
  assert.equal(r.code, 0);
  assert.equal(r.out.removed, 1);
  assert.ok(!fs.existsSync(path.join(dataDir, 'tmp1.txt')));
}

const ffmpeg = tools.out.ffmpeg, ffprobe = tools.out.ffprobe;
if (!ffmpeg || !ffprobe) {
  console.log('host.test: ffmpeg/ffprobe not found, skipping probe/preview/beat');
} else {
  const sine = path.join(work, 'sine 2s.wav');
  execFileSync(ffmpeg, ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-ar', '44100', sine]);
  const pr = job({ job: 'probe', dataDir, file: sine });
  assert.equal(pr.code, 0, JSON.stringify(pr.out));
  assert.ok(Math.abs(pr.out.duration - 2) < 0.05, 'duration ' + pr.out.duration);

  const pv = job({ job: 'preview', dataDir, file: sine, start: 0.5, duration: 1 });
  assert.equal(pv.code, 0, JSON.stringify(pv.out));
  assert.equal(path.dirname(pv.out.out), path.resolve(dataDir), 'preview inside dataDir');
  const b64 = fs.readFileSync(pv.out.out, 'utf8');
  assert.match(b64, /^[A-Za-z0-9+/]+=*$/);
  const mp3 = Buffer.from(b64, 'base64');
  assert.equal(mp3.byteLength, pv.out.bytes);
  assert.ok(mp3.subarray(0, 3).toString() === 'ID3' || (mp3[0] === 0xff && (mp3[1] & 0xe0) === 0xe0), 'mp3 data');
  assert.deepEqual(fs.readdirSync(dataDir).filter((f) => f.endsWith('.mp3')), [], 'mp3 temp removed');
  assert.equal(job({ job: 'cleanup', dataDir, files: [pv.out.out] }).out.removed, 1);
  assert.equal(job({ job: 'preview', dataDir, file: sine, start: 0, duration: 'x' }).code, 1, 'bad duration');

  // beat: the detector ships as ../beat-detect.cjs (another lane); fall back to the kit copy via SAE_BEAT_DETECT.
  const shipped = path.join(root, 'beat-detect.cjs');
  const kit = path.join(os.homedir(), 'Workspaces', 'selects-app-kit', 'tools', 'audio', 'beat-detect.cjs');
  let env = null;
  if (!fs.existsSync(shipped) && fs.existsSync(kit)) {
    const copy = path.join(work, 'beat-detect.cjs');
    fs.copyFileSync(kit, copy);
    env = { SAE_BEAT_DETECT: copy };
  }
  if (!fs.existsSync(shipped) && !env) {
    console.log('host.test: beat detector not found, skipping beat');
  } else {
    // A 120 BPM click track, 8 s.
    const clicks = path.join(work, 'clicks.wav');
    execFileSync(ffmpeg, ['-v', 'error', '-y', '-f', 'lavfi', '-i',
      "aevalsrc='if(lt(mod(t,0.5),0.01),sin(2*PI*1000*t),0)':s=44100:d=8", clicks]);
    const bt = job({ job: 'beat', dataDir, file: clicks, maxSeconds: 360 }, env);
    assert.equal(bt.code, 0, JSON.stringify(bt.out));
    assert.equal(bt.out.out, path.join(path.resolve(dataDir), 'own-music.json'));
    const full = JSON.parse(fs.readFileSync(bt.out.out, 'utf8'));
    assert.ok(Math.abs(full.bpm - 120) < 1, 'bpm ' + full.bpm);
    assert.equal(full.bpm, bt.out.bpm);
    assert.ok(Array.isArray(full.beatEnergy) && Array.isArray(full.peaks), 'full result written');
    assert.deepEqual(fs.readdirSync(dataDir).filter((f) => f.endsWith('.f32')), [], 'f32 temp removed');
    // maxSeconds caps the decode.
    const capped = job({ job: 'beat', dataDir, file: clicks, maxSeconds: 4 }, env);
    assert.equal(capped.code, 0);
    assert.ok(Math.abs(capped.out.durationSeconds - 4) < 0.05, 'capped ' + capped.out.durationSeconds);
  }
}

fs.rmSync(work, { recursive: true, force: true });
console.log('host.test: ok');
