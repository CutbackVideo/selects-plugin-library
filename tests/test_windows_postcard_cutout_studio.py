"""Postcard Cutout Studio on Windows: the panel opens and every helper action stops first.

All ~20 helper ops (run state, holds, cutout input, masks, previews) run pipeline.py, which imports fcntl, in a
pinned Python through the macOS shell. So on Windows `helper()` throws "Available on macOS for now." before any
shell call, the editor's effects and handlers return before they reach it, Choose Folder and the primary action
are disabled with that line, and the Clip highlights template entry refuses before any run state, import or
Draft. The macOS shell stays in `// mac-only:start` ... `end` regions; host I/O is the av-host block (copied
from Archive Vlog; only its presence and names are checked here, not byte-equality with a sibling plugin).
Set POSTCARD_PANEL to check another copy (e.g. the one on main).
"""
import json
import os
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / 'plugins/postcard-cutout-studio'
PANEL = Path(os.environ.get('POSTCARD_PANEL') or PLUGIN / 'panel.tsx')
HOST_BLOCK = re.compile(r'// av-host:start\n.*?// av-host:end', re.S)
MAC_ONLY = re.compile(r'^[ \t]*// mac-only:start[ \t]*\n.*?^[ \t]*// mac-only:end[ \t]*$', re.S | re.M)
HOST_NAMES = ['hostError', 'hostDI', 'hostApi', 'hostNeed', 'hostIsWindows', 'hostJoin', 'hostBytes', 'hostReadBytes',
              'hostReadText', 'hostRemove', 'hostRoots', 'hostDecodePcm', 'hostProbeSeconds']
FORBIDDEN = ['mkdir -p', 'printf', '$HOME', '$SELECTS_USER', 'rm -f', 'base64 ', '| base64', 'shasum',
             'command -v', 'export PATH', 'cat "', '2>/dev/null', '/usr/bin/', 'sh "', "sh '", 'runtime.sh',
             'pipeline.py', 'scene_preview.py', 'ffprobe -', 'ffmpeg -', "\"'\\\\''\""]
SPAWN = re.compile(r"""(?:["'`]|&&|;|\|)\s*(?:node|python3?)\b|/python3?["'\s]""")
GUARD = 'if(macOnly){setError(MAC_ONLY);return;}'


def strip_comments(text):
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    return '\n'.join(line for line in text.split('\n') if not line.lstrip().startswith('//'))


class PostcardCutoutStudioWindowsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = PANEL.read_text(encoding='utf-8')
        cls.portable = MAC_ONLY.sub('', cls.text)

    def body(self, start, end=None):
        self.assertIn(start, self.text)
        rest = self.text[self.text.index(start):]
        return rest[:rest.index(end)] if end else rest

    def test_template_header_stays(self):
        self.assertTrue(self.text.startswith('// @name Postcard Cutout Studio\n// @collection visual-highlights\n'))

    def test_host_block_defines_the_host_helpers(self):
        block = HOST_BLOCK.search(self.text)
        self.assertIsNotNone(block, 'copy the av-host block from archive-vlog')
        for name in HOST_NAMES:
            with self.subTest(name=name):
                self.assertRegex(block.group(0), r'(?m)^(?:async )?function ' + name + r'\(')

    def test_no_shell_call_outside_mac_only_regions(self):
        self.assertEqual(strip_comments(self.portable).count('runShell('), 0)

    def test_no_posix_shell_outside_mac_only_regions(self):
        runtime = strip_comments(HOST_BLOCK.sub('', self.portable))
        for token in FORBIDDEN:
            with self.subTest(token=token):
                self.assertNotIn(token, runtime)
        self.assertIsNone(SPAWN.search(runtime), 'no node/python spawn outside mac-only regions')

    def test_every_helper_op_refuses_windows_first(self):
        self.assertIn("const MAC_ONLY='Available on macOS for now.';", self.portable)
        self.assertIn('async function helper(sdk,op,args={}){if(hostIsWindows())throw Error(MAC_ONLY);return macHelper(sdk,op,args)}',
                      self.portable)
        self.assertNotIn('function macHelper(', self.portable, 'the shell helper lives in a mac-only region')
        self.assertNotIn('function runtimePython(', self.portable)
        self.assertIn('function macHelper(', self.text)

    def test_template_run_refuses_windows_before_anything(self):
        body = self.body('async function runTemplate(')
        guard = body.index('if(hostIsWindows())throw Error(MAC_ONLY);')
        for later in ('templatePicks(', 'runScript', 'readInventory(', "helper(sdk,'load'", 'runner.build('):
            with self.subTest(later=later):
                self.assertLess(guard, body.index(later))
        self.assertLess(guard, body.index('\n', body.index('{')) + 60, 'the guard is the first statement')

    def test_editor_actions_stop_first_on_windows(self):
        self.assertIn('const macOnly=useMemo(()=>hostIsWindows(),[]);', self.text)
        for name, nxt in (('async function execute(kind){', 'busyRef.current=true'),
                          ('async function readFolder(', 'setLoading(true)'),
                          ('async function chooseFolder(){', 'pickDirectoryPath'),
                          ('async function dropFolder(event){', 'droppedFolderPath(')):
            with self.subTest(handler=name):
                body = self.body(name)
                self.assertGreater(body.find(GUARD), -1)
                self.assertLess(body.find(GUARD), body.index(nxt))
        self.assertIn('if(macOnly||folderBusy.current||busyRef.current||!run||!canAbandon)return;', self.text)
        self.assertIn('if(macOnly||!isVideo(row))return;', self.body('function beginScrub(row){'))

    def test_editor_effects_skip_the_helper_on_windows(self):
        load = self.body("useEffect(()=>{let alive=true;if(macOnly)return;(async()=>{try{\n  const prev=await helper(sdk,'load'")
        self.assertTrue(load)
        tiles = self.body('useEffect(()=>{\n  if(macOnly)return;\n  let alive=true;\n  const queue=', '},[thumbKey]);')
        self.assertIn("helper(sdk,'tile'", tiles)
        self.assertIn('if(macOnly||!subject?.path)return;const path=subject.path;(async()=>{try{const r=await macProbeSubject(sdk,path);', self.text)
        self.assertIn('if(macOnly||!customize||!subject?.path||!duration)return;', self.text)

    def test_buttons_say_mac_only(self):
        self.assertIn('{macOnly&&<p style={{...muted,margin:0}}>{MAC_ONLY}</p>}', self.text)
        self.assertIn('disabled={picking||loading||macOnly} onClick={chooseFolder}', self.text)
        self.assertIn('disabled={macOnly||loading||picking||', self.text)

    def test_title_fonts_have_a_windows_face(self):
        stack = '"DIN Condensed","Bahnschrift Condensed","Bahnschrift","Arial Narrow",sans-serif'
        self.assertEqual(self.text.count(stack), 2, 'the title and its measuring copy use one stack')

    def test_manifest_lists_only_what_works(self):
        manifest = json.loads((PLUGIN / 'plugin.json').read_text(encoding='utf-8'))
        self.assertEqual(manifest['compatibility']['platforms'], ['macOS arm64'])
        self.assertEqual(manifest['collection'], 'visual-highlights')

    def test_scroll_container_keeps_a_stable_gutter(self):
        self.assertEqual(self.text.count("overflowY:'auto'"), self.text.count("scrollbarGutter:'stable'"))


if __name__ == '__main__':
    unittest.main()
