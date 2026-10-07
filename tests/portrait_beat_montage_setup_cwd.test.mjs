// portrait-beat-montage's rvm/setup.sh runs in the background from a panel shell call whose working folder is deleted
// when the call returns. uv exits with "Current directory does not exist" from such a folder, so setup must move to a
// folder that stays before it runs uv. A stand-in uv fails the same way uv does and then stops the script.
import test from 'node:test';
import assert from 'node:assert/strict';
import cp from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

test('setup runs uv from a folder that exists when started from a deleted one', { skip: process.platform === 'win32' }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pbm-setup-cwd-'));
  try {
    const rvm = path.join(tmp, 'skill', 'rvm');
    fs.mkdirSync(rvm, { recursive: true });
    fs.copyFileSync(path.join(root, 'plugins/portrait-beat-montage/rvm/setup.sh'), path.join(rvm, 'setup.sh'));
    const bin = path.join(tmp, 'bin');
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, 'uname'), '#!/bin/sh\ncase "$1" in -s) echo Darwin;; -m) echo arm64;; esac\n', { mode: 0o755 });
    const uvDir = path.join(rvm, '.local', 'uv-aarch64-apple-darwin');
    fs.mkdirSync(uvDir, { recursive: true });
    fs.writeFileSync(path.join(uvDir, 'uv'),
      '#!/bin/sh\n/bin/pwd -P >/dev/null 2>&1 || { echo "Current directory does not exist"; exit 2; }\necho "UV RAN IN $(/bin/pwd -P)"; exit 9\n',
      { mode: 0o755 });
    const gone = path.join(tmp, 'gone');
    fs.mkdirSync(gone);
    // Start inside `gone`, delete it, then run setup the way the panel's background launch does.
    const run = cp.spawnSync('/bin/sh', ['-c', 'cd "$1" && rmdir "$1" && exec sh "$2"', 'sh', gone, path.join(rvm, 'setup.sh')],
      { env: { ...process.env, PATH: `${bin}:${process.env.PATH}` }, encoding: 'utf8' });
    const log = fs.readFileSync(path.join(rvm, '.local', 'setup.log'), 'utf8');
    assert.equal(run.status, 9, log);
    assert.doesNotMatch(log, /Current directory does not exist/);
    assert.match(log, /UV RAN IN \//);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
