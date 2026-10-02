"""Portrait Beat Montage on Windows: the panel opens and every build entry stops first.

The pipeline (pipeline.py with numpy, Pillow and RVM on onnxruntime) runs on a private Python that
rvm/setup.sh installs for macOS arm64 only, through POSIX shell. So on Windows the panel opens with
no setup check, the build button is disabled with a localized "Available on macOS for now", and the
Clip highlights run (TemplateRun) refuses before any setup, background job or Draft. The shell that
stays sits in `// mac-only:start` ... `end` regions. The host block is checked for its helpers, not
for byte-equality with a sibling plugin (kit windows.md).
Set PORTRAIT_BEAT_MONTAGE_PANEL to check another copy of the panel (e.g. the one on main).
"""
import json
import os
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / 'plugins/portrait-beat-montage'
PANEL = Path(os.environ.get('PORTRAIT_BEAT_MONTAGE_PANEL') or PLUGIN / 'panel.tsx')
HOST_BLOCK = re.compile(r'// av-host:start\n.*?// av-host:end', re.S)
MAC_ONLY = re.compile(r'^[ \t]*// mac-only:start[ \t]*\n.*?^[ \t]*// mac-only:end[ \t]*$', re.S | re.M)
HOST_HELPERS = ['hostError', 'hostDI', 'hostApi', 'hostNeed', 'hostIsWindows', 'hostJoin', 'hostBytes',
                'hostReadBytes', 'hostReadText', 'hostRemove', 'hostRoots', 'hostDecodePcm', 'hostProbeSeconds']
FORBIDDEN = ['mkdir -p', 'printf', '$HOME', '$SELECTS_USER', 'rm -f', 'base64 ', '| base64', 'shasum',
             'command -v', 'export PATH', 'cat "', '2>/dev/null', '/Applications/', 'sh "', "sh '", '/usr/bin/',
             'setsid', 'kill -0', '$((', 'venv/bin', "\"'\\\\''\""]
SPAWN = re.compile(r"""(?:["'`]|&&|;|\|)\s*(?:node|python3?)\b|/python3?["'\s]""")
LANGUAGES = ['en', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'tr', 'zh']
WINDOWS_GUARD = 'if (hostIsWindows()) throw macOnlyError('


def strip_comments(text):
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    return '\n'.join(line for line in text.split('\n') if not line.lstrip().startswith('//'))


def body(text, start, end):
    i = text.index(start)
    return text[i:text.index(end, i)]


class PortraitBeatMontageWindowsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = PANEL.read_text(encoding='utf-8')
        cls.portable = MAC_ONLY.sub('', cls.text)

    def test_host_block_defines_the_helpers(self):
        block = HOST_BLOCK.search(self.text)
        self.assertIsNotNone(block, 'copy the av-host block from archive-vlog')
        for name in HOST_HELPERS:
            with self.subTest(helper=name):
                self.assertRegex(block.group(0), r'(?m)^(?:async )?function ' + name + r'\(')

    def test_no_posix_shell_outside_mac_only_regions(self):
        runtime = strip_comments(HOST_BLOCK.sub('', self.portable))
        for token in FORBIDDEN:
            with self.subTest(token=token):
                self.assertNotIn(token, runtime)
        self.assertIsNone(SPAWN.search(runtime), 'no node/python spawn outside mac-only regions')

    def test_no_shell_call_outside_mac_only_regions(self):
        self.assertGreater(self.text.count('runShell('), 0, 'the macOS path keeps its shell')
        self.assertEqual(strip_comments(self.portable).count('runShell('), 0)

    def test_shell_helpers_live_in_mac_only_regions_and_refuse_windows(self):
        regions = '\n'.join(m.group(0) for m in MAC_ONLY.finditer(self.text))
        for name in ('const quote', 'const PYTHON', 'async function pipeline(', 'const SETUP_DIR',
                     'async function runSetup(', 'async function renderUnits('):
            with self.subTest(name=name):
                self.assertIn(name, regions)
                self.assertNotIn(name, self.portable)
        for name in ('async function pipeline(', 'async function runSetup(', 'async function renderUnits('):
            with self.subTest(first_line=name):
                self.assertTrue(self.text[self.text.index(name):].split('\n')[1].lstrip().startswith(WINDOWS_GUARD))

    def test_every_language_says_mac_only(self):
        table = body(self.text, 'const MAC_ONLY_TEXT = ', '\n')
        for lang in LANGUAGES:
            with self.subTest(lang=lang):
                self.assertRegex(table, r'\b' + lang + r': "[^"]*macOS[^"]*"')
        self.assertIn('en: "Available on macOS for now."', table)

    def test_template_run_refuses_windows_first(self):
        run = body(self.text, 'function TemplateRun(', 'export default function Panel')
        guard = run.find(WINDOWS_GUARD + 'context.language)')
        self.assertGreater(guard, -1, 'TemplateRun checks Windows')
        for later in ('pipeline(sdk, "doctor"', 'runSetup(', 'scriptResourceIds(', 'buildMontage('):
            with self.subTest(later=later):
                self.assertLess(guard, run.index(later))
        self.assertLess(run.index('(async () => {'), guard)

    def test_build_refuses_windows_before_the_first_step(self):
        build = body(self.text, 'async function buildMontage(', '\n}\n')
        guard = build.find(WINDOWS_GUARD + 'language)')
        self.assertGreater(guard, -1)
        for later in ('setStep(0)', 'pipeline(', 'renderUnits(', 'importFiles', 'createDraft'):
            with self.subTest(later=later):
                self.assertLess(guard, build.index(later))

    def test_panel_skips_setup_and_disables_build_on_windows(self):
        panel = self.text[self.text.index('function MontagePanel('):]
        self.assertIn('const macOnly = hostIsWindows();', panel)
        self.assertIn('React.useEffect(() => { if (!macOnly) checkSetup(); }, []);', panel)
        self.assertIn('macOnly ? Promise.resolve() : pipeline(sdk, "doctor"', panel)
        self.assertIn('if (macOnly) return;\n    setSettingUp(true);', panel)
        self.assertIn('if (macOnly || busy || chosen.length < SHOTS) return;', panel)
        self.assertIn('disabled={macOnly || loading', panel)
        self.assertIn('{macOnly ? <ui.Message tone="muted">{macOnlyText(context.language)}</ui.Message> : null}', panel)

    def test_template_conventions_untouched(self):
        head = self.text.split('\n')[:14]
        self.assertEqual(head[0], '// @name Portrait Beat Montage')
        self.assertIn('// @collection visual-highlights', head)
        manifest = json.loads((PLUGIN / 'plugin.json').read_text(encoding='utf-8'))
        self.assertEqual(manifest['collection'], 'visual-highlights')
        self.assertEqual([i['id'] for i in manifest['inputs']], ['clips'])
        self.assertIn('export default function Panel(props)', self.text)

    def test_macos_uses_the_selects_bundled_ffmpeg(self):
        regions = '\n'.join(m.group(0) for m in MAC_ONLY.finditer(self.text))
        self.assertIn('function macTools()', regions)
        self.assertNotIn('function macTools()', self.portable)
        self.assertIn('app.asar.unpacked", "dist", "bin"', regions)
        self.assertIn('getHostingVersion', regions)
        # Every shell entry that starts pipeline.py or setup exports the bundled binaries first.
        self.assertEqual(self.text.count('command: `${macTools()}'), 3)
        source = (PLUGIN / 'pipeline.py').read_text(encoding='utf-8')
        self.assertNotRegex(source, r'\[\s*"ffmpeg"|\[\s*"ffprobe"|Popen\(\["ffmpeg"')
        self.assertIn('os.environ.get("POSTCARD_CUTOUT_RVM_" + name.upper())', source)
        self.assertNotIn('brew', (PLUGIN / 'INSTALL.md').read_text(encoding='utf-8').lower())

    def test_manifest_and_docs(self):
        manifest = json.loads((PLUGIN / 'plugin.json').read_text(encoding='utf-8'))
        self.assertEqual(manifest['compatibility']['platforms'], ['macOS arm64'])
        self.assertNotEqual(manifest['version'], '0.1.2')
        install = (PLUGIN / 'INSTALL.md').read_text(encoding='utf-8')
        self.assertNotIn('brew install', install)
        self.assertIn('Available on macOS for now', install)


if __name__ == '__main__':
    unittest.main()
