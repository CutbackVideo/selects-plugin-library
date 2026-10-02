"""Jude Kinetic Style on Windows: no POSIX shell outside the macOS-only regions.

The panel runs on Windows too, where `sdk.runShell` is cmd.exe. Host I/O comes from
the shared av-host block (copied unchanged from Archive Vlog); the Node engine and its
shell calls stay inside `// mac-only:start` ... `// mac-only:end` regions, and every
build entry (the panel button and the template run) stops on Windows before it changes
anything. Set JUDE_PANEL to check another copy of the panel (e.g. the one on main).
"""
import os
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
PANEL = Path(os.environ.get('JUDE_PANEL') or ROOT / 'plugins/jude-kinetic-style/panel.tsx')
REFERENCE = ROOT / 'plugins/archive-vlog/panel.tsx'
MAC_ONLY = re.compile(r'^[ \t]*// mac-only:start[ \t]*$.*?^[ \t]*// mac-only:end[ \t]*$', re.M | re.S)
FORBIDDEN = ['mkdir -p', 'printf', '$HOME', '$SELECTS_USER', 'rm -f', 'base64 ', '| base64', 'shasum', 'command -v',
             'export PATH', 'cat "', '2>/dev/null', '/Applications/', '/usr/bin/', 'sh "', "sh '"]
SPAWN = re.compile(r"""["'`]\s*(node|python3?)\s""")


def host_block(text):
    start, end = text.find('// av-host:start'), text.find('// av-host:end')
    return text[start:end + len('// av-host:end')] if start >= 0 and end > start else None


def runtime_text(text):
    """The panel without its macOS-only regions and whole-line comments (strings keep their `//`)."""
    text = MAC_ONLY.sub('', text)
    return '\n'.join(line for line in text.split('\n') if not line.lstrip().startswith('//'))


class JudeWindowsTest(unittest.TestCase):
    def setUp(self):
        self.text = PANEL.read_text(encoding='utf-8')
        self.runtime = runtime_text(self.text)
        # The av-host block is checked byte for byte against Archive Vlog; its one shell call reads
        # $SELECTS_USER_SKILLS_ROOT (cmd.exe and login-shell forms) and is counted below.
        block = host_block(self.text)
        self.own = runtime_text(self.text.replace(block, '')) if block else self.runtime

    def test_host_block_matches_archive_vlog(self):
        reference = host_block(REFERENCE.read_text(encoding='utf-8'))
        self.assertIsNotNone(reference)
        self.assertEqual(host_block(self.text), reference, 'copy the av-host block byte for byte')

    def test_regions_are_balanced(self):
        starts = len(re.findall(r'^[ \t]*// mac-only:start[ \t]*$', self.text, re.M))
        ends = len(re.findall(r'^[ \t]*// mac-only:end[ \t]*$', self.text, re.M))
        self.assertEqual(starts, ends)
        self.assertGreater(starts, 0)

    def test_no_posix_shell_outside_mac_only(self):
        for needle in FORBIDDEN:
            with self.subTest(needle=needle):
                self.assertFalse(needle in self.own, needle)
        self.assertIsNone(SPAWN.search(self.own), 'no node/python spawn')
        for needle in ['env.node()', 'engine.mjs', 'osascript', 'FFMPEG_PROBE']:
            with self.subTest(needle=needle):
                self.assertFalse(needle in self.own, needle)
        # The POSIX single-quote helper is macOS-only, and nothing else quotes for a shell.
        self.assertFalse("'\\\\''" in self.own, 'POSIX quoting helper')
        self.assertIsNone(re.search(r'\bq\(', self.own), 'q() quoting outside mac-only')

    def test_one_shell_call_outside_mac_only(self):
        self.assertEqual(self.runtime.count('runShell('), 1, 'only av-host hostSkillsRoot may call the shell')
        self.assertIn('runShell({ summary: "Locate the plugin folder"', self.runtime)

    def test_folders_and_ffprobe_come_from_the_host(self):
        self.assertIn('hostRoots(sdk, PANEL_ID,', self.runtime)
        self.assertIn("runFFprobe([", self.runtime)
        self.assertIn("mkdirSync(jobDir,{recursive:true})", self.runtime)
        self.assertFalse('instanceof Uint8Array' in self.own, 'instanceof on host bytes')
        self.assertFalse("+'/" in self.own, "'/' path joins")

    def test_build_entries_stop_on_windows_first(self):
        self.assertIn('"Available on macOS for now"', self.text)
        panel = self.text[self.text.index('function StylePanel('):self.text.index('function templateSpeaker(')]
        create = panel[panel.index('async function create()'):]
        self.assertIn('hostIsWindows()', create[:create.index('ensureTranscript(')], 'the button refuses on Windows')
        self.assertRegex(panel, r'disabled=\{[^}]*onWindows', 'the button is disabled on Windows')
        run = self.text[self.text.index('function TemplateRun('):]
        guard = run.find('if (hostIsWindows()) throw new Error(MAC_ONLY)')
        self.assertGreater(guard, 0, 'the template run refuses on Windows')
        for later in ['panelEnv(', 'templateDraftFromVideo(', 'runPipeline(']:
            with self.subTest(step=later):
                self.assertLess(guard, run.index(later))

    def test_an_old_host_gets_one_message(self):
        self.assertIn('e?.code === "host-missing"', self.text)
        self.assertIn('needs a newer Selects', self.text)


if __name__ == '__main__':
    unittest.main()
