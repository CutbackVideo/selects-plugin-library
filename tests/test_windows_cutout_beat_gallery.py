"""Beat Cutout Gallery on Windows: the panel opens, Analyze and Create stop first.

Analysis needs Apple Vision (swiftc) and Python with Pillow, so on Windows
both buttons are disabled with a localized "Available on macOS for now" and
both handlers return before anything is read or made. Thumbnails are drawn in
the panel from the photo bytes. The macOS shell stays in
`// mac-only:start` ... `end` regions; host I/O is the block copied from
Archive Vlog. Set CUTOUT_PANEL to check another copy (e.g. the one on main).
"""
import os
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
PANEL = Path(os.environ.get('CUTOUT_PANEL') or ROOT / 'plugins/cutout-beat-gallery/panel.tsx')
REFERENCE = ROOT / 'plugins/archive-vlog/panel.tsx'
HOST_BLOCK = re.compile(r'// av-host:start\n.*?// av-host:end', re.S)
MAC_ONLY = re.compile(r'^[ \t]*// mac-only:start[ \t]*\n.*?^[ \t]*// mac-only:end[ \t]*$', re.S | re.M)
FORBIDDEN = ['mkdir -p', 'printf', '$HOME', '$SELECTS_USER', 'rm -f', 'base64 ', '| base64', 'shasum',
             'command -v', 'export PATH', 'cat "', '2>/dev/null', '/Applications/', 'sh "', "sh '", '/usr/bin/',
             'swiftc', "\"'\\\\''\""]
SPAWN = re.compile(r"""(?:["'`]|&&|;|\|)\s*(?:node|python3?)\b|/python3?["'\s]""")
LANGUAGES = ['en', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'tr', 'zh']


def strip_comments(text):
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    return '\n'.join(line for line in text.split('\n') if not line.lstrip().startswith('//'))


class CutoutBeatGalleryWindowsTest(unittest.TestCase):
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

    def test_every_language_says_mac_only(self):
        for lang in LANGUAGES:
            with self.subTest(lang=lang):
                self.assertRegex(self.text, r"(?m)^  " + lang + r": \{ title:.*, macOnly:'[^']+' \},$")
        self.assertIn("macOnly:'Available on macOS for now.'", self.text)

    def test_analyze_and_create_refuse_windows_first(self):
        self.assertIn('const macOnly=hostIsWindows();', self.text)
        guard = "if(macOnly) {setStatus(t.macOnly);setFailed(true);return}"
        for name, nxt in (('const analyze=async()=>{', 'await refresh()'), ('const build=async()=>{', 'runScript(')):
            with self.subTest(handler=name):
                body = self.text[self.text.index(name):]
                self.assertGreater(body.find(guard), -1)
                self.assertLess(body.find(guard), body.index(nxt))
        self.assertIn('disabled={busy||macOnly} onClick={analyze}', self.text)
        self.assertIn('disabled={busy||macOnly||!analysis||', self.text)

    def test_windows_thumbnails_do_not_use_the_shell(self):
        effect = self.portable[self.portable.index('React.useEffect(()=>{\n    const chosen'):]
        effect = effect[:effect.index('},[sdk,folder,rows]);')]
        self.assertIn('if(hostIsWindows())', effect)
        self.assertIn('canvasThumb(x.path)', effect)
        self.assertNotIn('runShell', effect)

    def test_scroll_containers_keep_a_stable_gutter(self):
        self.assertEqual(self.text.count("overflowY:'auto'"), self.text.count("scrollbarGutter:'stable'"))


if __name__ == '__main__':
    unittest.main()
