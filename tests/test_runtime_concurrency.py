"""No downloads: disposable HOME and controlled tool fixtures exercise the real bootstrap."""
from pathlib import Path
import os
import subprocess
import tempfile
import time
import unittest
import tarfile

ROOT = Path(__file__).resolve().parents[1]

class RuntimeConcurrencyTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='template-runtime-')
        self.home = Path(self.tmp.name)
        self.store = self.home / '.selects/plugin-data/_runtime'
        self.store.mkdir(parents=True)
        self.bin = self.home / 'bin'
        self.bin.mkdir()
        self.env = {**os.environ, 'HOME': str(self.home), 'PATH': str(self.bin) + ':' + os.environ['PATH']}
        self.env.pop('SELECTS_RUNTIME_LOCKED', None)
        self.env.pop('SELECTS_RUNTIME_COMPAT_LOCKED', None)
        self.processes = []
        self.script = ROOT / 'tools/runtime.sh'
        self.lockf = Path('/usr/bin/lockf')
        if not self.lockf.exists():
            # Linux CI has no macOS lockf. Exercise the same process/lock boundary
            # with flock; macOS runs the shipped script and its real stock tool.
            self.lockf = self.bin / 'lockf'
            self.lockf.write_text('#!/usr/bin/env python3\nimport fcntl,subprocess,sys\na=sys.argv[1:]\nwith open(a[3],"a") as f:\n fcntl.flock(f,fcntl.LOCK_EX)\n sys.exit(subprocess.call(a[4:]))\n')
            self.lockf.chmod(0o755)
            self.script = self.home / 'runtime.sh'
            self.script.write_text((ROOT / 'tools/runtime.sh').read_text().replace('/usr/bin/lockf', str(self.lockf)))
        self.arch = subprocess.check_output(['uname', '-m'], text=True).strip()
        self.node = self.store / ('node-v22.23.3-darwin-' + ('arm64' if self.arch == 'arm64' else 'x64')) / 'bin/node'
    def tearDown(self):
        (self.home / 'release').touch()
        for p in self.processes:
            try: p.communicate(timeout=3)
            except subprocess.TimeoutExpired: p.terminate(); p.communicate(timeout=3)
        self.tmp.cleanup()
    def executable(self, p, text):
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text('#!/bin/sh\nset -eu\n' + text)
        p.chmod(0o755)
    def warm_node(self, valid=True):
        self.executable(self.node, 'exit ' + ('0' if valid else '7') + '\n')
    def run_runtime(self, kind):
        p = subprocess.Popen(['/bin/sh', str(self.script), kind], env=self.env, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        self.processes.append(p)
        return p
    def hold(self, lock):
        command = 'touch "$HOME/locked"; while [ ! -e "$HOME/release" ]; do sleep .01; done'
        p = subprocess.Popen([str(self.lockf), '-k', '-t', '2', str(lock), '/bin/sh', '-c', command], env=self.env)
        self.processes.append(p)
        deadline = time.monotonic() + 2
        while not (self.home / 'locked').exists():
            self.assertLess(time.monotonic(), deadline)
            time.sleep(.01)
    def test_warm_node_does_not_wait_for_an_unrelated_installer(self):
        self.warm_node()
        self.hold(self.store / '.lock')
        p = self.run_runtime('node')
        try: out, err = p.communicate(timeout=.5)
        except subprocess.TimeoutExpired: self.fail('a verified warm Node waited for the global installer lock')
        self.assertEqual(p.returncode, 0, err)
        self.assertEqual(out.strip(), str(self.node))
    def test_warm_node_does_not_wait_for_python_lock(self):
        self.warm_node()
        self.hold(self.store / '.python.lock')
        out, err = self.run_runtime('node').communicate(timeout=.5)
        self.assertEqual(out.strip(), str(self.node), err)
    def test_verified_warm_python_does_not_wait_for_the_legacy_global_lock(self):
        py = self.python_fixture()
        (self.home / 'python-ready').touch()
        self.hold(self.store / '.lock')
        p = self.run_runtime('python')
        out, err = p.communicate(timeout=.5)
        self.assertEqual(p.returncode, 0, err)
        self.assertEqual(out.strip(), str(py))
        self.assertFalse((self.home / 'python-installing').exists())
    def trace_installer_lock(self):
        probe = self.bin / 'installer-lock-probe'
        self.executable(probe, 'if [ ! -e "$HOME/first-installer-lock" ]; then printf "%s\\n" "$4" > "$HOME/first-installer-lock"; fi\nexec "' + str(self.lockf) + '" "$@"\n')
        self.script = self.home / 'probed-runtime.sh'
        self.script.write_text((ROOT / 'tools/runtime.sh').read_text().replace('/usr/bin/lockf', str(probe)))
    def test_cold_install_waits_for_the_old_global_lock_until_publication(self):
        self.node_download_fixture()
        self.trace_installer_lock()
        self.hold(self.store / '.lock')  # Existing old bootstrap's real lock boundary.
        new = self.run_runtime('node')
        self.wait_for('first-installer-lock')
        self.assertEqual((self.home / 'first-installer-lock').read_text().strip(), str(self.store / '.lock'),
                         'a per-runtime lock alone does not exclude an old global installer')
        self.assertFalse((self.home / 'downloading').exists())
        self.assertFalse(self.node.exists())
        (self.home / 'release').touch()
        out, err = new.communicate(timeout=3)
        self.assertEqual(new.returncode, 0, err)
        self.assertEqual(out.strip(), str(self.node))
    def test_new_cold_call_rechecks_and_reuses_the_old_installers_publication(self):
        self.node_download_fixture()
        self.trace_installer_lock()
        self.executable(self.home / 'old-node', 'exit 0\n')
        old_env = {**self.env, 'NODE_DEST': str(self.node)}
        old_command = 'touch "$HOME/locked"; while [ ! -e "$HOME/release" ]; do sleep .01; done; mkdir -p "$(dirname "$NODE_DEST")"; cp "$HOME/old-node" "$NODE_DEST"'
        old = subprocess.Popen([str(self.lockf), '-k', '-t', '2', str(self.store / '.lock'), '/bin/sh', '-c', old_command], env=old_env)
        self.processes.append(old)
        self.wait_for('locked')
        new = self.run_runtime('node')
        self.wait_for('first-installer-lock')
        self.assertFalse(self.node.exists())
        self.assertFalse((self.home / 'downloading').exists())
        (self.home / 'release').touch()
        out, err = new.communicate(timeout=3)
        self.assertEqual(new.returncode, 0, err)
        self.assertEqual(out.strip(), str(self.node))
        self.assertFalse((self.home / 'downloads').exists(), 'the old installation is reused rather than replaced')
    def test_old_installer_starting_later_cannot_enter_before_new_publication(self):
        self.node_download_fixture()
        (self.home / 'gate').touch()
        new = self.run_runtime('node')
        self.wait_for('downloading')
        self.assertFalse(self.node.exists())
        old_env = {**self.env, 'NODE_DEST': str(self.node)}
        old_command = 'touch "$HOME/old-entered"; [ -x "$NODE_DEST" ] || exit 41; "$NODE_DEST" -e pinned-version-check'
        old = subprocess.Popen([str(self.lockf), '-k', '-t', '2', str(self.store / '.lock'), '/bin/sh', '-c', old_command], env=old_env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.processes.append(old)
        time.sleep(.05)
        self.assertIsNone(old.poll())
        self.assertFalse((self.home / 'old-entered').exists())
        (self.home / 'release').touch()
        _, err = new.communicate(timeout=3)
        self.assertEqual(new.returncode, 0, err)
        _, err = old.communicate(timeout=3)
        self.assertEqual(old.returncode, 0, err)
        self.assertTrue((self.home / 'old-entered').exists())
    def test_an_executable_with_wrong_version_is_not_ready(self):
        self.warm_node(False)
        self.executable(self.bin / 'curl', 'echo unexpected-download >&2; exit 11\n')
        p = self.run_runtime('node')
        out, _ = p.communicate(timeout=2)
        self.assertNotEqual(p.returncode, 0)
        self.assertEqual(out, '')

    def node_download_fixture(self):
        package = self.home / 'package/node-test/bin/node'
        self.executable(package, 'exit 0\n')
        with tarfile.open(self.home / 'fixture.tar.xz', 'w:xz') as archive:
            archive.add(package.parent.parent, arcname='node-test')
        self.executable(self.bin / 'curl', '''
echo download >> "$HOME/downloads"
out=''
while [ "$#" -gt 0 ]; do
  if [ "$1" = -o ]; then shift; out=$1; fi
  shift
done
cp "$HOME/fixture.tar.xz" "$out"
touch "$HOME/downloading"
if [ -e "$HOME/gate" ]; then while [ ! -e "$HOME/release" ]; do sleep .01; done; fi
if [ -e "$HOME/interrupt" ]; then exit 22; fi
''')
        self.executable(self.bin / 'shasum', '''
cat >> "$HOME/checksums"
if [ -e "$HOME/corrupt" ] || [ -e "$HOME/interrupt" ]; then exit 1; fi
''')
    def wait_for(self, name):
        deadline = time.monotonic() + 2
        while not (self.home / name).exists():
            self.assertLess(time.monotonic(), deadline)
            time.sleep(.01)
    def test_same_runtime_cold_callers_publish_one_verified_installation(self):
        self.node_download_fixture()
        (self.home / 'gate').touch()
        first = self.run_runtime('node')
        self.wait_for('downloading')
        second = self.run_runtime('node')
        time.sleep(.05)
        self.assertFalse(self.node.exists(), 'a partially unpacked executable must not be published')
        self.assertEqual((self.home / 'downloads').read_text().splitlines(), ['download'])
        (self.home / 'release').touch()
        for p in [first, second]:
            out, err = p.communicate(timeout=3)
            self.assertEqual(p.returncode, 0, err)
            self.assertEqual(out.strip(), str(self.node))
        self.assertEqual((self.home / 'downloads').read_text().splitlines(), ['download'])
        self.assertIn('node.tar.xz.partial', (self.home / 'checksums').read_text())
        self.assertFalse(Path(str(self.node.parent.parent) + '.partial').exists())
    def test_checksum_failure_never_publishes_a_runtime(self):
        self.node_download_fixture()
        (self.home / 'corrupt').touch()
        p = self.run_runtime('node')
        out, err = p.communicate(timeout=2)
        self.assertNotEqual(p.returncode, 0)
        self.assertIn('pinned checksum', err)
        self.assertEqual(out, '')
        self.assertFalse(self.node.exists())
        self.assertFalse((self.store / 'node.tar.xz.partial').exists())
    def test_interrupted_download_is_resumed_before_atomic_publication(self):
        self.node_download_fixture()
        (self.home / 'interrupt').touch()
        first = self.run_runtime('node')
        first.communicate(timeout=2)
        self.assertNotEqual(first.returncode, 0)
        self.assertFalse(self.node.exists())
        self.assertTrue((self.store / 'node.tar.xz.partial').exists())
        (self.home / 'interrupt').unlink()
        second = self.run_runtime('node')
        out, err = second.communicate(timeout=2)
        self.assertEqual(second.returncode, 0, err)
        self.assertEqual(out.strip(), str(self.node))
        self.assertFalse((self.store / 'node.tar.xz.partial').exists())
    def python_fixture(self):
        uv_arch = 'aarch64' if self.arch == 'arm64' else 'x86_64'
        uv = self.store / ('uv-0.8.22-' + uv_arch) / 'uv'
        py = self.home / 'managed-python'
        self.executable(py, 'exit 0\n')
        self.executable(uv, '''
if [ "$2" = install ]; then
  touch "$HOME/python-installing"
  while [ ! -e "$HOME/release" ]; do sleep .01; done
  touch "$HOME/python-ready"
fi
[ -e "$HOME/python-ready" ] || exit 1
printf '%s\\n' "$HOME/managed-python"
''')
        return py
    def test_cold_node_waits_for_python_to_preserve_legacy_global_lock_coexistence(self):
        py = self.python_fixture()
        self.node_download_fixture()
        python = self.run_runtime('python')
        self.wait_for('python-installing')
        node = self.run_runtime('node')
        time.sleep(.05)
        self.assertIsNone(node.poll())
        self.assertFalse((self.home / 'downloading').exists(), 'cold work must wait, not share the legacy global lock')
        (self.home / 'release').touch()
        out, err = python.communicate(timeout=2)
        self.assertEqual(python.returncode, 0, err)
        self.assertEqual(out.strip(), str(py))
        out, err = node.communicate(timeout=3)
        self.assertEqual(node.returncode, 0, err)
        self.assertEqual(out.strip(), str(self.node))

if __name__ == '__main__': unittest.main()
