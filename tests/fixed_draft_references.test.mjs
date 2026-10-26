import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const suites = [
  ['thank-you-recap', 'thank_you_recap_fps.test.mjs'],
  ['cinema-vlog-studio', 'cinema_vlog_studio_fps.test.mjs'],
  ['portrait-beat-montage', 'portrait_beat_montage_fps.test.mjs'],
];
function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fixed-draft-references-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  function copy(file) {
    const from = path.join(root, file), to = path.join(directory, file);
    if (!fs.existsSync(from)) return;
    fs.mkdirSync(path.dirname(to), {recursive: true});
    fs.cpSync(from, to, {recursive: true});
  }
  for (const [, suite] of suites) copy('tests/' + suite);
  for (const id of [...suites.map(([id]) => id), 'city-weekend-vlog']) copy('plugins/' + id + '/panel.tsx');
  for (const file of ['tests/windows_host.mjs', 'tests/fixed_draft_reference.mjs', 'tests/fixtures/draft-references']) copy(file);
  const env = {...process.env};
  // Run the real test CLI, not the parent's internal test-worker protocol.
  delete env.NODE_TEST_CONTEXT;
  for (const key of ['THANK_YOU_RECAP_PANEL', 'THANK_YOU_RECAP_BASE', 'CINEMA_VLOG_STUDIO_PANEL', 'CINEMA_VLOG_STUDIO_BASE', 'PORTRAIT_BEAT_MONTAGE_PANEL', 'PORTRAIT_BEAT_MONTAGE_BASE']) delete env[key];
  const run = (files = suites.map(([, suite]) => suite)) => spawnSync(process.execPath, ['--test', '--test-reporter=tap', ...files.map(file => path.join(directory, 'tests', file))], {cwd: directory, env, encoding: 'utf8', timeout: 30000});
  const git = (...args) => {
    const out = spawnSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.com', ...args], {cwd: directory, encoding: 'utf8'});
    assert.equal(out.status, 0, out.stderr);
  };
  return {directory, run, git};
}
function verified(result) {
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /# skipped 0\b/, 'a missing Git reference must never hide a regression check');
  assert.equal((result.stdout.match(/# Subtest: .*fixed reference/g) || []).length, 6);
}

test('all six reference contracts execute in a source download without any Git directory', t => {
  const f = fixture(t);
  verified(f.run());
});

test('main and PR checkouts use the same fixed contracts even when origin/main changes', t => {
  const f = fixture(t), panel = path.join(f.directory, 'plugins/thank-you-recap/panel.tsx');
  f.git('init', '-q');
  f.git('add', '.');
  f.git('commit', '-qm', 'Current accepted files');
  f.git('update-ref', 'refs/remotes/origin/main', 'HEAD');
  verified(f.run());
  const accepted = fs.readFileSync(panel, 'utf8');
  fs.writeFileSync(panel, 'This moving branch is not a reference fixture.');
  f.git('add', '.');
  f.git('commit', '-qm', 'Change only the moving comparison branch');
  f.git('update-ref', 'refs/remotes/origin/main', 'HEAD');
  fs.writeFileSync(panel, accepted);
  verified(f.run());
});

for (const [id, suite] of suites) test(id + ': a missing fixed reference fails instead of skipping', t => {
  const f = fixture(t), file = path.join(f.directory, 'tests/fixtures/draft-references', id + '.json');
  if (fs.existsSync(file)) fs.unlinkSync(file);
  const result = f.run([suite]);
  assert.notEqual(result.status, 0, 'missing reference must fail: ' + result.stdout);
  assert.doesNotMatch(result.stdout, /# SKIP/);
});

for (const [id, suite] of suites) test(id + ': a real output change still fails the fixed reference', t => {
  const f = fixture(t), file = path.join(f.directory, 'plugins', id, 'panel.tsx');
  const original = fs.readFileSync(file, 'utf8');
  const mutated = id === 'thank-you-recap'
    ? original.replace('const END = 20.633;', 'const END = 20.733;')
    : original.replace(/setFrameSize\(\{width:(1920|1080),height:(1080|1440)\}\)/, 'setFrameSize({width:720,height:1280})');
  assert.notEqual(mutated, original, 'the mutation must reach the actual Draft script');
  fs.writeFileSync(file, mutated);
  const result = f.run([suite]);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /not ok .*fixed reference/);
});
