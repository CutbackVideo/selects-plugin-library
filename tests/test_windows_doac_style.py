"""DOAC Style on Windows: the panel opens and the caption build stops first.

The caption engine is Python, set up by runtime.sh for macOS only, so on
Windows both the panel button and the Clip highlights run refuse with
"Available on macOS for now" before any draft is made. The POSIX shell that
stays (runtime check, setup, compiler) sits in `// mac-only:start` ... `end`
regions; everything else uses the host I/O block copied from Archive Vlog.
Set DOAC_PANEL to check another copy of the panel (e.g. the one on main).
"""
import os
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
PANEL = Path(os.environ.get('DOAC_PANEL') or ROOT / 'plugins/doac-style/panel.tsx')
REFERENCE = ROOT / 'plugins/archive-vlog/panel.tsx'
HOST_BLOCK = re.compile(r'// av-host:start\n.*?// av-host:end', re.S)
MAC_ONLY = re.compile(r'^[ \t]*// mac-only:start[ \t]*\n.*?^[ \t]*// mac-only:end[ \t]*$', re.S | re.M)
FORBIDDEN = ['mkdir -p', 'printf', '$HOME', '$SELECTS_USER', 'rm -f', 'base64 ', '| base64', 'shasum',
             'command -v', 'export PATH', 'cat "', '2>/dev/null', '/Applications/', 'sh "', "sh '", '/usr/bin/',
             "\"'\\\\''\""]
SPAWN = re.compile(r"""(?:["'`]|&&|;|\|)\s*(?:node|python3?)\b|/python3?["'\s]|\.runtime/bin/""")


def strip_comments(text):
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    return '\n'.join(line for line in text.split('\n') if not line.lstrip().startswith('//'))


class DoacStyleWindowsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = PANEL.read_text(encoding='utf-8')
        cls.portable = MAC_ONLY.sub('', cls.text)

    def test_host_block_matches_archive_vlog(self):
        mine = HOST_BLOCK.search(self.text)
        self.assertIsNotNone(mine, 'copy the av-host block from archive-vlog')
        self.assertEqual(mine.group(0), HOST_BLOCK.search(REFERENCE.read_text(encoding='utf-8')).group(0))

    def test_no_posix_shell_outside_mac_only_regions(self):
        runtime = strip_comments(HOST_BLOCK.sub('', self.portable))
        for token in FORBIDDEN:
            with self.subTest(token=token):
                self.assertNotIn(token, runtime)
        self.assertIsNone(SPAWN.search(runtime), 'no node/python spawn outside mac-only regions')

    def test_one_shell_call_outside_mac_only_regions(self):
        self.assertEqual(strip_comments(self.portable).count('runShell('), 1, 'only av-host hostSkillsRoot')

    def test_build_entries_refuse_windows_before_any_mutation(self):
        self.assertRegex(self.text, r"MAC_ONLY='[^']*Available on macOS for now")
        run = self.text[self.text.index('function TemplateRun('):self.text.index('export default function Panel')]
        guard = run.find("if(hostIsWindows())throw stepError('mac-only',MAC_ONLY)")
        self.assertGreater(guard, -1, 'TemplateRun checks Windows')
        self.assertLess(guard, run.index('steps.createFromClip('))
        self.assertLess(guard, run.index('steps.prepare('))
        self.assertIn("'mac-only':MAC_ONLY", self.text)
        panel = self.text[self.text.index('function CaptionPanel('):]
        load = panel[panel.index('async function load('):panel.index('steps.prepare(')]
        self.assertIn("if(macOnly)throw stepError('mac-only',MAC_ONLY)", load)
        self.assertIn('macOnly=hostIsWindows()', panel)
        self.assertIn('disabled={busy||macOnly||', panel)
        ensure = self.text[self.text.index('function ensureRuntime('):]
        self.assertTrue(ensure.split('\n')[1].lstrip().startswith('if(hostIsWindows())'))

    def test_header_untouched(self):
        head = self.text.split('\n')[:4]
        self.assertEqual(head[:3], ['// @name DOAC Style', '// @collection visual-highlights', '// @icon captions'])


if __name__ == '__main__':
    unittest.main()
