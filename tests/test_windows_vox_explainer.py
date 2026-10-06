"""Windows safety of vox-explainer (static checks).

The engine runs inside the panel (voxEngine, the port of engine.py; tests/vox_explainer_engine.test.mjs compares the
two), so the build needs no shell and no Python on either OS: no runShell, no POSIX shell syntax, host file and ffmpeg
services only. Set VOX_PANEL to check another panel file (e.g. the one on main, which must fail).
"""
import json
import os
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / 'plugins' / 'vox-explainer'
PANEL = Path(os.environ.get('VOX_PANEL') or PLUGIN / 'panel.tsx')
AV_START, AV_END = '// av-host:start', '// av-host:end'
AV_NAMES = ['hostError', 'hostUseSdk', 'hostApi', 'hostNeed', 'hostIsWindows', 'hostJoin', 'hostBytes', 'hostReadBytes',
            'hostReadText', 'hostRemove', 'hostRoots', 'hostDecodePcm', 'hostProbeSeconds']

FORBIDDEN = [
    'mkdir -p', 'printf', '$HOME', '$SELECTS_USER', 'rm -f', 'base64 -D', '| base64', 'shasum', 'command -v',
    'export PATH', 'cat ', '2>/dev/null', '/Applications/', '/usr/bin/', '/opt/homebrew', 'stat -f', 'dd if=',
    'curl ', 'osascript',
    # The POSIX single-quote shell quoting helper ('...' with '\'' escapes), as written in the JS source.
    r"'\\''",
]
FORBIDDEN_RE = [
    (re.compile(r'''["'`]\s*node\s'''), 'a node spawn'),
    (re.compile(r'\bpython3?\b'), 'a python spawn'),
    (re.compile(r'''\bsh\s+["']'''), 'an sh invocation'),
]


def av_block(text):
    a, b = text.find(AV_START), text.find(AV_END)
    return text[a:b + len(AV_END)] if a >= 0 and b > a else None


def without_mac_only(text):
    return re.sub(r'//\s*mac-only:start.*?//\s*mac-only:end', '', text, flags=re.S)


def without_comments(text):
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    return '\n'.join(line for line in text.split('\n') if not line.lstrip().startswith('//'))


def runtime_text(text):
    return without_comments(without_mac_only(text))


def body_of(text, head):
    """The source of a function, from its header to the next top-level-ish `async function`/`const` at the same indent."""
    a = text.index(head)
    indent = text[text.rindex('\n', 0, a) + 1:a]
    m = re.compile('\n' + re.escape(indent) + r'(?:async function |function |const |return \()').search(text, a + len(head))
    return text[a:m.start() if m else len(text)]


class VoxExplainerWindowsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.panel = PANEL.read_text(encoding='utf-8')
        cls.runtime = runtime_text(cls.panel)

    def test_av_host_block_is_present(self):
        block = av_block(self.panel)
        self.assertIsNotNone(block, 'the av-host block is missing')
        for name in AV_NAMES:
            self.assertRegex(block, r'(?:async )?function ' + name + r'\(', name)

    def test_av_host_block_is_archive_vlogs(self):
        ref = av_block((ROOT / 'plugins' / 'archive-vlog' / 'panel.tsx').read_text(encoding='utf-8'))
        self.assertEqual(av_block(self.panel), ref)

    def test_no_platform_sniffing_of_its_own(self):
        self.assertNotIn('IS_WIN', self.panel)

    def test_no_shell_at_all(self):
        self.assertNotIn('runShell', self.panel)
        self.assertNotIn('mac-only:', self.panel)
        for needle in FORBIDDEN:
            self.assertNotIn(needle, self.runtime, needle)
        for pattern, what in FORBIDDEN_RE:
            self.assertIsNone(pattern.search(self.runtime), what)

    def test_engine_runs_in_the_panel(self):
        run = body_of(self.panel, 'async function run(')
        self.assertIn('await voxEngine(cmd, dir, args, voxHostIO(dir, { readJson, writeJson }))', run)
        self.assertNotIn('engine.py', self.runtime)
        for cmd in ['fetch', 'validate', 'portraits', 'timeline', 'sheet', 'kenburns', 'assembly', 'requests']:
            self.assertIn('run("%s", dir, ' % cmd, self.panel, cmd)

    def test_build_entries_have_no_macos_gate(self):
        for head in ['async function makePlan()', 'async function produce(']:
            self.assertNotIn('hostIsWindows()', body_of(self.panel, head))
        self.assertNotIn('macOnly', self.panel)

    def test_missing_host_services_get_one_message(self):
        self.assertIn('throw new Error(S.noHost)', body_of(self.panel, 'async function ensureEnv()'))
        self.assertIn('{noHost && <ui.Message>{S.noHost}</ui.Message>}', self.panel)
        langs = re.findall(r'^  (\w\w): \{$', self.panel, flags=re.M)
        self.assertEqual(len(re.findall(r'\bnoHost: "', self.panel)), len(langs))
        for gone in ['noPython', 'noEngine', 'xcode-select']:
            self.assertNotIn(gone, self.panel)

    def test_job_paths_use_host_join(self):
        self.assertNotRegex(self.runtime, r'`\$\{(?:dir|root|st\.dir|e\.root|fs\.homedir\(\))\}/')
        self.assertIn('hostJoin(fs.homedir(), ".selects", "plugin-data", APP_ID)', self.panel)

    def test_korean_fallback_has_malgun_gothic(self):
        self.assertEqual(self.panel.count("'Apple SD Gothic Neo','Malgun Gothic',"), 3)
        self.assertNotIn("'Apple SD Gothic Neo','Pretendard'", self.panel)

    def test_manifest_and_docs(self):
        manifest = json.loads((PLUGIN / 'plugin.json').read_text(encoding='utf-8'))
        self.assertIn('Windows x64', manifest['compatibility']['platforms'])
        self.assertNotIn('engine.py', manifest['files'])
        for name in ['INSTALL.md', 'README.md']:
            text = (PLUGIN / name).read_text(encoding='utf-8')
            for gone in ['brew ', 'Homebrew', 'xcode-select', 'Python', 'macOS for now']:
                self.assertNotIn(gone, text, name)


if __name__ == '__main__':
    unittest.main()
