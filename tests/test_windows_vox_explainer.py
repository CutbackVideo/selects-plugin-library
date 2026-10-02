"""Windows safety of vox-explainer (static checks).

The engine (engine.py) is a Python script run through the shell, so the build is macOS only for now. On Windows
`sdk.runShell` is cmd.exe: the panel must open without reaching a POSIX shell outside `// mac-only:start` ...
`// mac-only:end` regions, and both build entries must stop on Windows before they write anything. Set VOX_PANEL to
check another panel file (e.g. the one on main, which must fail).
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
AV_NAMES = ['hostError', 'hostDI', 'hostApi', 'hostNeed', 'hostIsWindows', 'hostJoin', 'hostBytes', 'hostReadBytes',
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

    def test_no_platform_sniffing_of_its_own(self):
        self.assertNotIn('IS_WIN', self.panel)

    def test_no_posix_shell_outside_mac_only(self):
        for needle in FORBIDDEN:
            self.assertNotIn(needle, self.runtime, f'{needle!r} outside a mac-only region')
        for pattern, what in FORBIDDEN_RE:
            self.assertIsNone(pattern.search(self.runtime), f'{what} outside a mac-only region')

    def test_no_shell_call_outside_mac_only(self):
        self.assertEqual(self.runtime.count('runShell('), 0)

    def test_mac_only_regions_are_closed(self):
        marks = re.findall(r'//\s*mac-only:(start|end)', self.panel)
        self.assertTrue(marks)
        self.assertEqual(marks, ['start', 'end'] * (len(marks) // 2))

    def test_shell_refuses_on_windows_first(self):
        shell = body_of(self.panel, 'const shell = async (')
        self.assertLess(shell.index('if (hostIsWindows()) throw new Error(S.macOnly)'), shell.index('runShell('))

    def test_build_entries_stop_on_windows_before_any_change(self):
        for head in ['async function makePlan()', 'async function produce(']:
            body = body_of(self.panel, head)
            guard = body.index('if (hostIsWindows()) return setError(S.macOnly)')
            for first in ['setBusy(', 'setJob(', 'writeJson(', 'savePanel(', 'ensureEnv(', 'run(', 'generate(', 'runScript(']:
                if first in body:
                    self.assertLess(guard, body.index(first), f'{head}: {first} before the Windows guard')
        env = body_of(self.panel, 'async function ensureEnv()')
        self.assertLess(env.index('if (hostIsWindows()) throw new Error(S.macOnly)'), env.index('await home()'))

    def test_buttons_disabled_and_message_shown_on_windows(self):
        self.assertIn('const macOnly = hostIsWindows();', self.panel)
        self.assertIn('{macOnly && <ui.Message>{S.macOnly}</ui.Message>}', self.panel)
        self.assertIn('disabled={!!busy || macOnly} onClick={makePlan}', self.panel)
        self.assertIn('disabled={!!busy || !!result || macOnly} onClick={() => produce()}', self.panel)
        self.assertIn('disabled={macOnly} onClick={() => produce(j)}', self.panel)

    def test_mac_only_message_in_every_language(self):
        self.assertIn('macOnly: "Available on macOS for now."', self.panel)
        langs = re.findall(r'^  (\w\w): \{$', self.panel, flags=re.M)
        self.assertEqual(len(re.findall(r'\bmacOnly: "', self.panel)), len(langs))
        self.assertNotIn('This app works on macOS for now.', self.panel)

    def test_job_paths_use_host_join(self):
        self.assertNotRegex(self.runtime, r'`\$\{(?:dir|root|st\.dir|e\.root|fs\.homedir\(\)|await home\(\))\}/')
        self.assertIn('hostJoin(await home(), ".selects", "plugin-data", APP_ID)', self.panel)

    def test_korean_fallback_has_malgun_gothic(self):
        self.assertEqual(self.panel.count("'Apple SD Gothic Neo','Malgun Gothic',"), 3)
        self.assertNotIn("'Apple SD Gothic Neo','Pretendard'", self.panel)

    def test_manifest_and_docs(self):
        manifest = json.loads((PLUGIN / 'plugin.json').read_text(encoding='utf-8'))
        if 'Windows x64' in manifest['compatibility']['platforms']:
            self.assertNotIn('return setError(S.macOnly)', self.panel)
        for name in ['INSTALL.md', 'README.md']:
            text = (PLUGIN / name).read_text(encoding='utf-8')
            self.assertNotIn('brew ', text, name)
            self.assertNotIn('Homebrew', text, name)


if __name__ == '__main__':
    unittest.main()
