"""Beat Cutout Gallery on Windows: Analyze photos and Make video run without Python, Pillow or Apple Vision.

On Windows the panel does prepare.py's image work in cutout-engine.js (a Web Worker; parity with prepare.py is
checked by tests/cutout_beat_gallery.test.mjs) and cuts the people out with Selects generation (credits), which
it submits only after the user presses the localized "Send ... and use credits" button. Video files come from the
host's bundled ffmpeg. The macOS shell (swiftc + Python) stays in `// mac-only:start` ... `end` regions; host I/O
is the block copied from Archive Vlog. The end-to-end mock run is tests/cutout_beat_gallery_windows.test.mjs.
Set CUTOUT_PANEL to check another copy (e.g. the one on main).
"""
import json
import os
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / 'plugins/cutout-beat-gallery'
PANEL = Path(os.environ.get('CUTOUT_PANEL') or PLUGIN / 'panel.tsx')
REFERENCE = ROOT / 'plugins/archive-vlog/panel.tsx'
HOST_BLOCK = re.compile(r'// av-host:start\n.*?// av-host:end', re.S)
MAC_ONLY = re.compile(r'^[ \t]*// mac-only:start[ \t]*\n.*?^[ \t]*// mac-only:end[ \t]*$', re.S | re.M)
FORBIDDEN = ['mkdir -p', 'printf', '$HOME', '$SELECTS_USER', 'rm -f', 'base64 ', '| base64', 'shasum',
             'command -v', 'export PATH', 'cat "', '2>/dev/null', '/Applications/', 'sh "', "sh '", '/usr/bin/',
             'swiftc', "\"'\\\\''\""]
SPAWN = re.compile(r"""(?:["'`]|&&|;|\|)\s*(?:node|python3?)\b|/python3?["'\s]""")
LANGUAGES = ['en', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'tr', 'zh']
WINDOWS_KEYS = ['macOnly', 'credits', 'send', 'cancel', 'newer', 'noGeneration', 'noCredits', 'framing', 'uploading',
                'cloudWait', 'masking', 'making']


def strip_comments(text):
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    return '\n'.join(line for line in text.split('\n') if not line.lstrip().startswith('//'))


def top_level(text, name):
    """A top-level function or const of the panel, up to the next line starting in column 0."""
    m = re.search(r'^(?:async function|function|const) ' + re.escape(name) + r'\b', text, re.M)
    if not m:
        raise AssertionError('not found: ' + name)
    body = text.index('\n', m.end())
    end = re.search(r'^\S', text[body + 1:], re.M)
    return text[m.start():body + 1 + (end.start() if end else len(text))]


def handler(text, name):
    start = text.index('  const ' + name + '=async()=>{')
    return text[start:text.index('\n  };\n', start)]


class CutoutBeatGalleryWindowsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = PANEL.read_text(encoding='utf-8')
        cls.portable = MAC_ONLY.sub('', cls.text)
        cls.manifest = json.loads((PLUGIN / 'plugin.json').read_text(encoding='utf-8'))

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

    def test_every_language_has_the_windows_texts(self):
        for lang in LANGUAGES:
            line = re.search(r"(?m)^  " + lang + r": \{ title:.*\},$", self.text)
            self.assertIsNotNone(line, lang)
            for key in WINDOWS_KEYS:
                with self.subTest(lang=lang, key=key):
                    self.assertRegex(line.group(0), r"[ ,]" + key + r":'[^']+'")
            credits = re.search(r"credits:'([^']+)'", line.group(0)).group(1)
            self.assertIn('{n}', credits)
            self.assertIn('{s}', credits)
            self.assertIn('Selects', credits)
            self.assertIn('{n}', re.search(r"send:'([^']+)'", line.group(0)).group(1))

    def test_windows_analysis_runs_in_the_panel_and_asks_before_using_credits(self):
        analyze = handler(self.text, 'analyze')
        windows = analyze.index('if(hostIsWindows()) {')
        self.assertLess(windows, analyze.index('// mac-only:start'), 'Windows never reaches the macOS shell')
        branch = analyze[windows:analyze.index('// mac-only:start')]
        self.assertIn("hostRoots(sdk,'cutout-beat-gallery','cutout-engine.js')", branch)
        self.assertIn("startEngine(await hostReadText(hostJoin(plugin,'cutout-engine.js')))", branch)
        self.assertIn('await winFrames(', branch)
        self.assertNotIn('winCutouts(', analyze, 'Analyze itself never sends anything')
        self.assertIn('if(approved.length) {setStatus(t.macOnly);setFailed(true);return}', branch)
        # Only the consent button's handler sends the photos.
        self.assertEqual(self.text.count('winCutouts('), 2, 'defined once, called once')
        self.assertIn('await winCutouts(', handler(self.text, 'sendCloud'))
        self.assertEqual(self.text.count('onClick={sendCloud}'), 1)
        consent = self.text[self.text.index('{pending&&!busy&&<ui.Section'):]
        consent = consent[:consent.index('</ui.Section>}')]
        self.assertIn('say(t.credits,', consent)
        self.assertIn('onClick={sendCloud}>{say(t.send,', consent)
        self.assertEqual(strip_comments(self.text).count('mg.submit('), 1)
        self.assertIn('mg.submit(', top_level(self.text, 'winCutouts'))
        self.assertIn('disabled={busy||!!winProblem} onClick={analyze}', self.text)
        self.assertNotIn('macOnly||', self.text, 'Make video is no longer blocked on Windows')

    def test_cloud_masks_use_the_depth_type_captions_contract(self):
        cut = top_level(self.text, 'winCutouts')
        self.assertIn("const CLOUD_MODEL='model_v1_dmVlZC92aWRlby1iYWNrZ3JvdW5kLXJlbW92YWwvZmFzdA';", self.text)
        self.assertIn("input:{video_url:'selects-input:source',output_codec:'h264',refine_foreground_edges:false,subject_is_person:true}", cut)
        self.assertIn('uploads:{source:{pluginFile:clip}},delivery:{pluginFolder:', cut)
        self.assertIn("key:'cbg-'+name", cut)
        problem = top_level(self.text, 'cloudProblem')
        self.assertIn("mg.supportsPluginFiles", problem)
        self.assertIn("const CLOUD_MIN_HOST='2.0.512';", self.text)

    def test_windows_video_files_come_from_the_host_ffmpeg_as_one_stream(self):
        cut = top_level(self.text, 'winCutouts')
        self.assertIn("'-write_tmcd','0'", cut)
        self.assertNotIn('runShell', cut)
        self.assertIn("rt.runFFmpeg(['-nostdin','-v','error','-y',...args],true", top_level(self.text, 'hostFFmpeg'))
        enc = top_level(self.text, 'encoders')
        for codec in ('prores_ks', 'qtrle', 'png', 'libx264', 'mpeg4'):
            self.assertIn("'" + codec + "'", enc)

    def test_engine_is_a_plain_worker_script(self):
        engine = (PLUGIN / 'cutout-engine.js').read_text(encoding='utf-8')
        self.assertIsNone(re.search(r'\brequire\(|^\s*import\s|\bfetch\(|runShell', strip_comments(engine), re.M),
                          'no modules, network or shell')
        self.assertIn('root.onmessage', engine)
        self.assertIn('cutout-engine.js', self.manifest['files'])

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
