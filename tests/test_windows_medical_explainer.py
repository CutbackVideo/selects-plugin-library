"""medical-explainer: Windows safety, publication rules and the shared plumbing (static checks).

The engine runs inside the panel (medEngine; tests/medical_explainer.test.mjs runs it), so the build needs no shell and
no Python on either OS: no runShell, no POSIX shell syntax, host file and ffmpeg services only.
"""
import json
from pathlib import Path
import re
import subprocess
import unittest
import importlib.util

from windows_static import assert_no_shell_token

ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / 'plugins' / 'medical-explainer'
PANEL = PLUGIN / 'panel.tsx'
AV_START, AV_END = '// av-host:start', '// av-host:end'
LANGS = ['de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'tr', 'zh']

FORBIDDEN = [
    'mkdir -p', 'printf', '$HOME', '$SELECTS_USER', 'rm -f', 'base64 -D', '| base64', 'shasum', 'command -v',
    'export PATH', 'cat ', '2>/dev/null', '/Applications/', '/usr/bin/', '/opt/homebrew', 'stat -f', 'dd if=',
    'curl ', 'osascript', r"'\\''",
]
FORBIDDEN_RE = [
    (re.compile(r'''["'`]\s*node\s'''), 'a node spawn'),
    (re.compile(r'\bpython3?\b'), 'a python spawn'),
    (re.compile(r'''\bsh\s+["']'''), 'an sh invocation'),
]


def block(text, start, end):
    a, b = text.find(start), text.find(end)
    return text[a:b + len(end)] if a >= 0 and b > a else None


def runtime_text(text):
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    return '\n'.join(line for line in text.split('\n') if not line.lstrip().startswith('//'))


def load_check_public():
    spec = importlib.util.spec_from_file_location('check_public', ROOT / 'tools' / 'check_public.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class MedicalExplainerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.panel = PANEL.read_text(encoding='utf-8')
        cls.runtime = runtime_text(cls.panel)
        cls.manifest = json.loads((PLUGIN / 'plugin.json').read_text(encoding='utf-8'))

    def test_shared_blocks_match_their_sources(self):
        vox = (ROOT / 'plugins' / 'vox-explainer' / 'panel.tsx').read_text(encoding='utf-8')
        archive = (ROOT / 'plugins' / 'archive-vlog' / 'panel.tsx').read_text(encoding='utf-8')
        self.assertEqual(block(self.panel, AV_START, AV_END), block(archive, AV_START, AV_END))
        for start, end in [('// generation-sdk:start', '// generation-sdk:end'), ('// local-sdk:start', '// local-sdk:end')]:
            self.assertEqual(block(self.panel, start, end), block(vox, start, end), start)

    def test_no_shell_at_all(self):
        self.assertNotIn('runShell', self.panel)
        for needle in FORBIDDEN:
            assert_no_shell_token(self, needle, self.runtime, needle)
        for pattern, what in FORBIDDEN_RE:
            self.assertIsNone(pattern.search(self.runtime), what)

    def test_engine_runs_in_the_panel(self):
        self.assertIn('await medEngine(cmd, dir, args, medHostIO(dir, { readJson, writeJson }))', self.panel)
        for cmd in ['fetch', 'validate', 'timeline', 'requests', 'sheet', 'strips', 'compose', 'assembly']:
            self.assertIn('run("%s", dir, ' % cmd, self.panel, cmd)

    def test_runtime_files_live_in_plugin_data(self):
        self.assertIn('hostJoin(fs.homedir(), ".selects", "plugin-data", APP_ID)', self.panel)
        self.assertIn('const APP_ID = "medical-explainer";', self.panel)
        self.assertNotRegex(self.runtime, r'`\$\{(?:dir|root|st\.dir|e\.root|fs\.homedir\(\))\}/')

    def test_in_flight_jobs_are_recovered_through_plugin_storage(self):
        self.assertIn('sdk.storage.getItem(storageKey)', self.panel)
        self.assertIn('sdk.storage.setItem(storageKey, value)', self.panel)
        self.assertIn('`job:${projectId}`', self.panel)
        # The request is recorded before the paid call and its job id right after, both persisted.
        submit = self.panel[self.panel.index('phase: "submitting"'):self.panel.index('pending.push(q);\n    }\n    const failed')]
        self.assertLess(submit.index('await persist(st)'), submit.index('await m.submit('))
        self.assertIn('jobId: res.jobIds[0]', submit)
        self.assertNotIn('localStorage', self.runtime)
        self.assertIn('if (!storageReady) return;', self.panel)

    def test_update_guard_policy_and_hook(self):
        policies = json.loads((ROOT / 'shared' / 'app-update-guard-policies.json').read_text(encoding='utf-8'))
        self.assertEqual(policies['medical-explainer'], {'Panel': 'busy'})
        self.assertIn('useAppUpdateGuard(sdk, context?.language, () => !!busy);', self.panel)
        shared = (ROOT / 'shared' / 'app-update-guard.ts').read_text(encoding='utf-8').rstrip()
        self.assertIn('// app-update-guard:start\n' + shared + '\n// app-update-guard:end', self.panel)

    def test_missing_host_services_get_one_message(self):
        self.assertIn('{noHost && <ui.Message>{S.noHost}</ui.Message>}', self.panel)
        langs = re.findall(r'^  (\w\w): \{$', self.panel, flags=re.M)
        self.assertEqual(sorted(langs), ['en', 'ko'])
        for key in ['noHost', 'noGeneration', 'noStorage', 'review']:
            self.assertEqual(len(re.findall(r'\b%s: "' % key, self.panel)), len(langs), key)

    def test_korean_fallback_fonts_in_every_overlay(self):
        self.assertEqual(self.panel.count("'Apple SD Gothic Neo','Malgun Gothic',"), 1)
        self.assertEqual(self.panel.count('"const FALLBACK = " + FALLBACK_SANS'), 6)
        self.assertEqual(self.panel.count('"const FALLBACK = " + FALLBACK_SERIF'), 1)

    def test_only_the_korean_name_header_is_literal_korean(self):
        public = load_check_public()
        self.assertEqual(public.inspect('plugins/medical-explainer/panel.tsx', PANEL.read_bytes()), [])
        header = self.panel.split('\n')[:24]
        self.assertIn('// @name:ko \uc758\ud559 \uc124\uba85 \uc1fc\uce20', header)
        korean = re.compile(r'[\uac00-\ud7a3]')
        literal = [i for i, line in enumerate(self.panel.split('\n')) if korean.search(line)]
        self.assertEqual(literal, [header.index('// @name:ko \uc758\ud559 \uc124\uba85 \uc1fc\uce20')])

    def test_default_video_is_kling_v3_standard(self):
        self.assertIn('i2v: "model_v1_ZmFsLWFpL2tsaW5nLXZpZGVvL3YzL3N0YW5kYXJkL2ltYWdlLXRvLXZpZGVv"', self.panel)
        self.assertNotIn('L3Byby9pbWFnZS10by12aWRlbw', self.panel)  # .../pro/image-to-video

    def test_manifest_and_docs(self):
        m = self.manifest
        self.assertEqual(m['id'], 'medical-explainer')
        self.assertEqual(m['status'], 'experimental')
        self.assertEqual(sorted(m['files']), ['INSTALL.md', 'README.md', 'panel.tsx'])
        self.assertNotIn('preview', m)
        self.assertNotIn('minSelectsVersion', m)
        self.assertEqual(sorted(m['localized']), LANGS)
        self.assertIn('Windows x64', m['compatibility']['platforms'])
        for name in ['INSTALL.md', 'README.md']:
            text = (PLUGIN / name).read_text(encoding='utf-8')
            for gone in ['brew ', 'Homebrew', 'xcode-select', 'Python', 'engine.py']:
                self.assertNotIn(gone, text, name)
        self.assertIn('(plugins/medical-explainer)', (ROOT / 'README.md').read_text(encoding='utf-8'))

    def test_manifest_passes_the_library_check(self):
        result = subprocess.run(['python3', 'tools/plugin_files.py', 'check', 'medical-explainer'], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)[0]['id'], 'medical-explainer')

    def test_ci_runs_the_node_tests(self):
        workflow = (ROOT / '.github' / 'workflows' / 'check.yml').read_text(encoding='utf-8')
        self.assertIn('node --test tests/medical_explainer.test.mjs', workflow)


if __name__ == '__main__':
    unittest.main()
