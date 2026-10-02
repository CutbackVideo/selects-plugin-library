"""Windows safety of chris-williamson-style (static checks).

The panel is generated from src/ by build.py. On Windows `sdk.runShell` is cmd.exe, so the runtime text (panel.tsx and
the src/ files it is built from) must not reach a POSIX shell outside `// mac-only:start` ... `// mac-only:end` regions,
and every build entry must stop on Windows before it changes anything. Set CW_PANEL to check another panel file (e.g.
the one on main, which must fail).
"""
import json
import os
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / 'plugins' / 'chris-williamson-style'
PANEL = Path(os.environ.get('CW_PANEL') or PLUGIN / 'panel.tsx')
AV_START, AV_END = '// av-host:start', '// av-host:end'

FORBIDDEN = [
    'mkdir -p', 'printf', '$HOME', '$SELECTS_USER', 'rm -f', 'base64 ', '| base64', 'shasum', 'command -v',
    'export PATH', 'cat "', '2>/dev/null', '/Applications/', '/usr/bin/', 'curl ', 'runtime.sh', 'osascript',
    # The POSIX single-quote shell quoting helper ('...' with '\'' escapes), as written in the JS source.
    r"'\\''",
]
FORBIDDEN_RE = [
    (re.compile(r'''["'`]\s*node\s'''), 'a node spawn'),
    (re.compile(r'\bpython3?\b'), 'a python spawn'),
    (re.compile(r'''\bsh\s+["']'''), 'an sh invocation'),
    (re.compile(r'\bq\('), 'the q() shell quoting helper'),
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
    """Text that runs, minus av-host (checked byte for byte instead), mac-only regions and comments."""
    block = av_block(text)
    if block:
        text = text.replace(block, '')
    return without_comments(without_mac_only(text))


def build(src):
    """What build.py assembles from src/ (without writing anything)."""
    s = (src / 'panel.template.tsx').read_text(encoding='utf-8')
    for name in ['LOOK', 'BROLL', 'CAPTIONS']:
        s = s.replace('/*EMBED_' + name + '*/', json.dumps((src / (name.lower() + '.tsx')).read_text(encoding='utf-8')))
    for name in ['planning', 'assets', 'verification', 'pipeline']:
        s = s.replace('/*SECTION_' + name + '*/', (src / (name + '.ts')).read_text(encoding='utf-8'))
    return s


class ChrisWilliamsonWindowsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.panel = PANEL.read_text(encoding='utf-8')
        cls.sources = {p.name: p.read_text(encoding='utf-8') for p in sorted((PLUGIN / 'src').glob('*.ts*'))}

    def test_panel_is_built_from_src(self):
        if os.environ.get('CW_PANEL'):
            self.skipTest('another panel file')
        self.assertEqual(build(PLUGIN / 'src'), self.panel, 'panel.tsx is out of date: run python3 build.py')

    def test_collection_header(self):
        self.assertIn('// @collection visual-highlights', self.panel.split('\n')[:24])

    def test_av_host_block_matches_archive_vlog(self):
        reference = av_block((ROOT / 'plugins' / 'archive-vlog' / 'panel.tsx').read_text(encoding='utf-8'))
        self.assertIsNotNone(reference)
        self.assertEqual(av_block(self.panel), reference)

    def test_no_posix_shell_outside_mac_only(self):
        texts = {'panel.tsx': self.panel, **{'src/' + k: v for k, v in self.sources.items()}}
        for name, text in texts.items():
            body = runtime_text(text)
            for needle in FORBIDDEN:
                self.assertNotIn(needle, body, f'{name}: {needle!r} outside a mac-only region')
            for pattern, what in FORBIDDEN_RE:
                self.assertIsNone(pattern.search(body), f'{name}: {what} outside a mac-only region')
            self.assertNotIn('instanceof Uint8Array', body, f'{name}: cross-realm bytes need hostBytes')

    def test_one_shell_call_outside_mac_only(self):
        outside = without_comments(without_mac_only(self.panel))
        self.assertEqual(outside.count('runShell('), 1)
        self.assertIn('runShell(', av_block(self.panel) or '')

    def test_mac_only_regions_are_closed(self):
        for name, text in {'panel.tsx': self.panel, **self.sources}.items():
            marks = re.findall(r'//\s*mac-only:(start|end)', text)
            self.assertEqual(marks, ['start', 'end'] * (len(marks) // 2), name)

    def test_build_entries_stop_on_windows_before_any_change(self):
        p = self.panel
        self.assertNotIn('SETUP_COMMAND', p)
        self.assertIn('hostRoots(sdk, PANEL_ID, "engine.mjs")', p)
        # The panel: the mount skips setup, the button stops before transcript analysis starts.
        mount = p.index('resolvePaths(sdk)\n')
        self.assertLess(p.rindex('if (hostIsWindows())', 0, mount), mount)
        create = p.index('async function create()')
        self.assertLess(p.index('if (hostIsWindows())', create), p.index('await ensureTranscript(', create))
        # The template run: before the new Draft is made or anything is read.
        run = p.index('function TemplateRun(')
        guard = p.index('if (hostIsWindows()) throw new Error(MAC_ONLY)', run)
        self.assertLess(guard, p.index('templatePaths(sdk)', run))
        self.assertLess(guard, p.index('templateDraftFromVideo(env', run))
        self.assertIn('const MAC_ONLY = "Available on macOS for now."', p)

    def test_host_missing_is_one_message(self):
        self.assertIn('e?.code === "host-missing" ? new Error(NEEDS_NEWER)', self.panel)

    def test_caption_font_has_windows_fallback(self):
        self.assertIn('"Segoe UI", Arial, sans-serif', self.sources['captions.tsx'])

    def test_manifest_stays_macos_until_the_engine_is_ported(self):
        manifest = json.loads((PLUGIN / 'plugin.json').read_text(encoding='utf-8'))
        if 'Windows x64' in manifest['compatibility']['platforms']:
            self.assertNotIn('throw new Error(MAC_ONLY)', self.panel)


if __name__ == '__main__':
    unittest.main()
