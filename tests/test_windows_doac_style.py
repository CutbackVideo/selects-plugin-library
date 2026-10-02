"""DOAC Style on Windows: the caption build runs in the panel.

macOS keeps the Python caption engine (runtime.sh, a venv, compile-captions.py
through the shell) inside `// mac-only:start` ... `end` regions. On Windows the
same engine runs in a Web Worker from approved/web (engine.js, the FreeType +
Pillow raster core in raster.wasm.b64, worker.js); tests/doac_style_parity.test.mjs
checks it draws what the Python engine draws. Everything else uses the host I/O
block copied from Archive Vlog. Set DOAC_PANEL to check another copy of the panel.
"""
import json
import os
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / 'plugins/doac-style'
PANEL = Path(os.environ.get('DOAC_PANEL') or PLUGIN / 'panel.tsx')
REFERENCE = ROOT / 'plugins/archive-vlog/panel.tsx'
HOST_BLOCK = re.compile(r'// av-host:start\n.*?// av-host:end', re.S)
MAC_ONLY = re.compile(r'^[ \t]*// mac-only:start[ \t]*\n.*?^[ \t]*// mac-only:end[ \t]*$', re.S | re.M)
FORBIDDEN = ['mkdir -p', 'printf', '$HOME', '$SELECTS_USER', 'rm -f', 'base64 ', '| base64', 'shasum',
             'command -v', 'export PATH', 'cat "', '2>/dev/null', '/Applications/', 'sh "', "sh '", '/usr/bin/',
             "\"'\\\\''\""]
SPAWN = re.compile(r"""(?:["'`]|&&|;|\|)\s*(?:node|python3?)\b|/python3?["'\s]|\.runtime/bin/""")
WEB = ['approved/web/pil.js', 'approved/web/engine.js', 'approved/web/worker.js', 'approved/web/raster.wasm.b64']


def strip_comments(text):
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    return '\n'.join(line for line in text.split('\n') if not line.lstrip().startswith('//'))


def between(text, start, end):
    i = text.index(start)
    return text[i:text.index(end, i)]


class DoacStyleWindowsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = PANEL.read_text(encoding='utf-8')
        cls.portable = MAC_ONLY.sub('', cls.text)
        cls.manifest = json.loads((PLUGIN / 'plugin.json').read_text())

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

    def test_no_shell_call_outside_mac_only_regions(self):
        self.assertEqual(strip_comments(self.portable).count('runShell('), 0, 'the av-host block makes no shell call')

    def test_windows_never_reaches_the_python_engine(self):
        ensure = between(self.text, 'function ensureRuntime(', '\n}\n')
        self.assertRegex(ensure, r'if\(hostIsWindows\(\)\)\{await panelEngineFiles\(sdk\);return;\}await ensureFont\(sdk\);await macRuntime')
        compile_ = between(self.text, 'async function compile(j,scene)', '\n')
        self.assertLess(compile_.index('if(hostIsWindows()){const m=await panelCompile('), compile_.index("shell('compile '"))
        self.assertIn("const catalogue=hostIsWindows()?await panelEngine(sdk,{cmd:'catalogue'}):JSON.parse(await shell('catalogue'))", self.text)
        # shell() is the only caller of the Python compiler and sits in a mac-only region.
        self.assertNotIn('async function shell(', self.portable)
        self.assertNotIn('function macRuntime(', self.portable)

    def test_build_entries_no_longer_refuse_windows(self):
        for token in ('MAC_ONLY', 'macOnly', "'mac-only'", 'Available on macOS for now'):
            with self.subTest(token=token):
                self.assertNotIn(token, self.text)
        run = between(self.text, 'function TemplateRun(', 'export default function Panel')
        self.assertNotIn('hostIsWindows', run)
        self.assertIn('disabled={busy||!context.sequenceId||!!job?.uncertain}', self.text)

    def test_panel_engine_runs_in_a_worker_from_the_package(self):
        files = between(self.text, 'function panelEngineFiles(', '\n}\n')
        self.assertIn("['web/pil.js','web/engine.js','web/worker.js'].map(read)", files)
        self.assertIn("read('web/raster.wasm.b64')", files)
        self.assertIn("hostJoin(drive+'\\\\','Windows','Fonts',name)", files)
        engine = between(self.text, 'async function panelEngine(', '\n}\n')
        self.assertIn("new Worker(url)", engine)
        self.assertIn('URL.createObjectURL(new Blob([a.source]', engine)
        self.assertIn('worker?.terminate()', engine)
        # Engine errors keep the Python messages the recovery path matches on.
        self.assertIn("e.pyType==='ValueError'||e.pyType==='AssertionError'", engine)
        # Files land where compile-captions.py writes them.
        compiled = between(self.text, 'async function panelCompile(', '\n }\n')
        for token in ("f.join(dir,'compiled')", "'scene-'+num(s.scene.index)+'.json'", "'manifest.json'", "'manifest-'+num(scene)+'.json'"):
            self.assertIn(token, compiled)

    def test_package_ships_the_engine_and_fonts(self):
        files = self.manifest['files']
        self.assertIn('Windows x64', self.manifest['compatibility']['platforms'])
        for name in WEB + ['THIRD_PARTY.md', 'approved/native/fonts/arimo/OFL.txt'] + [
                'approved/native/fonts/arimo/Arimo-%s.ttf.b64' % w for w in ('Regular', 'Medium', 'Bold')]:
            with self.subTest(name=name):
                self.assertIn(name, files)
                self.assertTrue((PLUGIN / name).is_file())
        for name in ENGINE_DATA(self.text):
            with self.subTest(data=name):
                self.assertIn('approved/' + name, files)

    def test_every_template_font_has_a_windows_face(self):
        worker = (PLUGIN / 'approved/web/worker.js').read_text(encoding='utf-8')
        required = json.loads((PLUGIN / 'approved/font-requirements.json').read_text())
        for path in required:
            name = Path(path).name
            if name == 'AppleSDGothicNeo.ttc':
                continue  # only the engine's debug view uses it
            with self.subTest(font=name):
                self.assertTrue(name == 'PermanentMarker-Regular.ttf' or "'" + name + '#' in worker, name)
        for name in re.findall(r"'([a-z]+\.ttf)'", between(self.text, 'const WINDOWS_FONTS=', '\n')):
            self.assertIn("'" + name + "'", worker)

    def test_header_untouched(self):
        head = self.text.split('\n')[:4]
        self.assertEqual(head[:3], ['// @name DOAC Style', '// @collection visual-highlights', '// @icon captions'])


def ENGINE_DATA(text):
    return re.findall(r"'([^']+)'", between(text, 'const ENGINE_DATA=', '\n'))


if __name__ == '__main__':
    unittest.main()
