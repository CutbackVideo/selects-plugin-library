"""Travel Beat Vlog keeps POSIX shell out of its Windows path.

Static checks on plugins/travel-beat-vlog/panel.tsx: the host I/O block is Archive
Vlog's, byte for byte; outside `// mac-only:start` ... `// mac-only:end` regions no
POSIX shell syntax, no Node.js/Python spawn and no macOS-only path is left; the only
shell call outside them is the host block's SELECTS_USER_SKILLS_ROOT lookup; and the
build reaches the hero cutout (Apple Vision through osascript) only off Windows.
"""
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
PANEL = ROOT / 'plugins' / 'travel-beat-vlog' / 'panel.tsx'
REFERENCE = ROOT / 'plugins' / 'archive-vlog' / 'panel.tsx'

BLOCK = re.compile(r'^// av-host:start\n.*?^// av-host:end\n', re.S | re.M)
MAC_ONLY = re.compile(r'^[ \t]*// mac-only:start\n.*?^[ \t]*// mac-only:end\n', re.S | re.M)
FORBIDDEN = ['mkdir -p', 'printf', '$HOME', '$SELECTS_USER', 'rm -f', 'base64 ', '| base64', 'shasum',
             'command -v', 'export PATH', 'cat "', '2>/dev/null', '/Applications/', '/usr/bin/', 'sh "', "sh '",
             'runtime.sh', 'build-script.mjs']
SPAWN = [re.compile(r'''["'`]node\s'''), re.compile(r'''["'`]python'''), re.compile(r'\bshellQuote\b'),
         re.compile(r"""'\\\\''""")]


def host_block(text):
    match = BLOCK.search(text)
    return match.group(0) if match else None


def without_comments(text):
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    return '\n'.join(line for line in text.split('\n') if not line.lstrip().startswith('//'))


def portable(text):
    """Runtime text that also runs on Windows: no mac-only regions and no comments."""
    return without_comments(MAC_ONLY.sub('', text))


def problems(text):
    """Every rule the panel source breaks (an empty list when it is Windows-safe)."""
    found = []
    block = host_block(text)
    if block is None or block != host_block(REFERENCE.read_text(encoding='utf-8')):
        found.append('the av-host block differs from archive-vlog')
    starts, ends = text.count('// mac-only:start'), text.count('// mac-only:end')
    if starts != ends:
        found.append('unbalanced mac-only markers')
    rest = portable(text)
    shell_calls = rest.count('runShell(')
    if shell_calls != 1:
        found.append('runShell( appears %d times outside mac-only regions' % shell_calls)
    outside = portable(BLOCK.sub('', text))
    found += ['%r outside mac-only regions' % word for word in FORBIDDEN if word in outside]
    found += ['%s outside mac-only regions' % rx.pattern for rx in SPAWN if rx.search(outside)]
    build = re.search(r'async function buildTravelVlog\(.*?\n\}\n', text, re.S)
    body = build.group(0) if build else ''
    flag = body.find('const cutout=!hostIsWindows();')
    gate = body.find('if(cutout){')
    leave = body.find('if(!cutout)return')
    if flag < 0 or gate < flag or 'heroCutout(sdk' not in body or body.find('heroCutout(sdk') < gate \
            or leave < 0 or body.find('buildCutoutScript(') < leave or body.find("'cutout')") < leave:
        found.append('buildTravelVlog reaches the cutout on Windows')
    if 'disabled={busy||windows}' not in text or '{windows&&<ui.Message>{SUBJECT_MAC_ONLY}' not in text:
        found.append('the panel does not say the cutout is macOS only')
    return found


class TravelBeatVlogWindows(unittest.TestCase):
    def setUp(self):
        self.text = PANEL.read_text(encoding='utf-8')

    def test_host_block_is_archive_vlogs(self):
        self.assertIsNotNone(host_block(self.text))
        self.assertEqual(host_block(self.text), host_block(REFERENCE.read_text(encoding='utf-8')))

    def test_no_posix_shell_outside_mac_only(self):
        self.assertEqual(problems(self.text), [])

    def test_one_shell_call_outside_mac_only(self):
        rest = portable(self.text)
        self.assertEqual(rest.count('runShell('), 1)
        self.assertIn('runShell(', portable(host_block(self.text)))

    def test_paths_compare_normalised(self):
        self.assertNotRegex(self.text, r'r\.path===file')
        self.assertIn("normalize('NFC')", self.text)

    def test_manifest_matches(self):
        manifest = json.loads((PANEL.parent / 'plugin.json').read_text(encoding='utf-8'))
        self.assertIn('Windows x64', manifest['compatibility']['platforms'])
        self.assertFalse([f for f in manifest['files'] if f.endswith(('.mjs', '.sh'))])

    def test_header_kept(self):
        head = self.text.split('\n')[:24]
        self.assertIn('// @collection visual-highlights', head)

    def test_checks_fail_on_the_original_panel(self):
        original = re.sub(r'^// av-host:start\n.*?^// av-host:end\n', '', self.text, flags=re.S | re.M)
        original = original.replace('// mac-only:start\n', '').replace('// mac-only:end\n', '')
        self.assertTrue(problems(original))


if __name__ == '__main__':
    unittest.main()
