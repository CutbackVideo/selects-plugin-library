"""Template runtimes: one shared bootstrap, and no tools a stock Mac lacks.

A Clip highlights template runs on the person's Mac through the panel shell,
which has their login PATH plus the app's bundled ffmpeg, ffprobe, mediainfo
and rg. Node.js, Python, swiftc and yt-dlp are not there unless a developer
installed them, so a template fetches Node or Python with its copy of
tools/runtime.sh instead of calling them by bare name.
"""
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
PLUGINS = ROOT / 'plugins'
RUNTIME = (ROOT / 'tools/runtime.sh').read_bytes()
HEADER = re.compile(r'^[ \t]*//[ \t]*@collection[ \t]+visual-highlights[ \t]*$', re.M)
# A tool started by bare name inside a shell command string: right after an
# opening quote, a command separator or `$(`, and followed by an argument.
BARE = re.compile(r"""(?:["'`]|&&|\|\||[;|]|\$\()\s*(node|python3?|swiftc|xcrun|yt-dlp)\s+["'$\-/\w{(]""")


def templates():
    for panel in sorted(PLUGINS.glob('*/panel.tsx')):
        if HEADER.search('\n'.join(panel.read_text(encoding='utf-8').split('\n')[:24])):
            yield panel.parent


class RuntimeCopiesTest(unittest.TestCase):
    def test_every_copy_matches_the_library_bootstrap(self):
        for copy in sorted(PLUGINS.glob('*/runtime.sh')):
            with self.subTest(plugin=copy.parent.name):
                self.assertEqual(copy.read_bytes(), RUNTIME, 'copy tools/runtime.sh unchanged')
                files = json.loads((copy.parent / 'plugin.json').read_text(encoding='utf-8'))['files']
                self.assertIn('runtime.sh', files)

    def test_templates_start_no_tool_a_stock_mac_lacks(self):
        for folder in templates():
            with self.subTest(plugin=folder.name):
                text = (folder / 'panel.tsx').read_text(encoding='utf-8')
                found = sorted({m.group(1) for m in BARE.finditer(text)})
                self.assertEqual(found, [], 'use the runtime.sh interpreter path instead')

    def test_the_check_sees_a_bare_call(self):
        for sample in ['command:"node "+q(f)', "'python3 -c x'", '`swiftc -O ${a}`', 'a && yt-dlp "$u"']:
            self.assertTrue(BARE.search(sample), sample)
        for sample in ['for (const node of nodes)', 'q(await env.node())+" x"', '"$PY" -m venv']:
            self.assertFalse(BARE.search(sample), sample)


if __name__ == '__main__':
    unittest.main()
