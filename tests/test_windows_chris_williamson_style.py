"""Windows safety of chris-williamson-style (static checks).

The panel is generated from src/ by build.py. On Windows `sdk.runShell` is cmd.exe, so the runtime text (panel.tsx and
the src/ files it is built from) must not reach a POSIX shell outside `// mac-only:start` ... `// mac-only:end` regions.
Windows runs the main path: every engine step goes to the panel's port (cwEngine), while macOS keeps engine.mjs on
Node.js (runtime.sh) and Apple Vision inside mac-only regions. Set CW_PANEL to check another panel file (e.g. the one
on main, which must fail).
"""
import json
import os
from pathlib import Path
import re
import unittest
import shutil
import subprocess

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
    for name in ['planning', 'assets', 'verification', 'pipeline', 'engine']:
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

    def test_preview_normalizes_both_scaled_branches(self):
        graphs = []
        for file in [PLUGIN / 'src/engine.ts', PANEL, PLUGIN / 'media.mjs']:
            graph = re.search(r'const vf\s*=\s*"(split\[a\]\[b\].*?)";', file.read_text()).group(1)
            for label in ('a1', 'b1'):
                self.assertIn(',setsar=1[' + label + ']', graph)
            graphs.append(graph)
        self.assertEqual(len(set(graphs)), 1)

    @unittest.skipUnless(shutil.which('ffmpeg'), 'ffmpeg is unavailable')
    def test_preview_accepts_non_square_pixels(self):
        graph = re.search(r'const vf\s*=\s*"(split\[a\]\[b\].*?)";', self.sources['engine.ts']).group(1)
        result = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i',
            'testsrc2=size=320x240:rate=1,setsar=853/854', '-filter_complex', graph,
            '-frames:v', '1', '-f', 'null', '-'], capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stderr)

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

    def test_no_shell_call_outside_mac_only(self):
        # The av-host block makes no shell call; only mac-only regions may.
        outside = without_comments(without_mac_only(self.panel))
        self.assertEqual(outside.count('runShell('), 0)

    def test_mac_only_regions_are_closed(self):
        for name, text in {'panel.tsx': self.panel, **self.sources}.items():
            marks = re.findall(r'//\s*mac-only:(start|end)', text)
            self.assertEqual(marks, ['start', 'end'] * (len(marks) // 2), name)

    def test_build_entries_run_on_windows(self):
        p = self.panel
        self.assertNotIn('SETUP_COMMAND', p)
        self.assertIn('hostRoots(sdk, PANEL_ID, "engine.mjs")', p)
        # No entry stops on Windows any more: the mount, the button and the template run take the main path.
        self.assertFalse('Available on macOS for now' in p, 'an entry still stops on Windows')
        self.assertFalse('MAC_ONLY' in p, 'an entry still stops on Windows')
        for entry, until in [('useEffect(() => {\n    resolvePaths(sdk)', None), ('async function create()', 'const actionLabel'),
                             ('function TemplateRun(', 'export default function Panel')]:
            at = p.index(entry)
            body = p[at:p.index(until, at)] if until else p[at:p.index('}, []);', at)]
            self.assertNotIn('hostIsWindows()', body, entry)

    def test_windows_engine_steps_reach_cw_engine_and_never_run_shell(self):
        s = self.sources
        # Every engine.mjs call site sends Windows to the panel port first.
        self.assertIn('if(hostIsWindows()){await cwEngine(env,cmd,file);return;}', s['pipeline.ts'])
        self.assertIn('if(hostIsWindows())await cwEngine(env,cmd,file);', s['assets.ts'])
        for name in ['pipeline.ts', 'assets.ts']:
            self.assertEqual(without_comments(without_mac_only(s[name])).count('engine.mjs'), 0, name)
        # The port handles all four engine.mjs commands; Windows faces return nothing (centre crop, with a warning).
        engine = s['engine.ts']
        for cmd in ['shots:', 'faces:', 'assets:', 'candidates:']:
            self.assertIn(cmd, engine[engine.index('async function cwEngine('):])
        self.assertIn('if (hostIsWindows()) return { detected: {}, sampled: samples.length, readable: 0 };', engine)
        self.assertIn('they are centre-cropped to 9:16', s['pipeline.ts'])
        # Outside mac-only regions the engine makes no shell call at all.
        self.assertEqual(without_comments(without_mac_only(engine)).count('runShell'), 0)

    def test_mac_only_regions_keep_the_mac_engine(self):
        regions = '\n'.join(re.findall(r'//\s*mac-only:start(.*?)//\s*mac-only:end', self.panel, flags=re.S))
        for needle in ['engine.mjs', 'runtime.sh', 'osascript -l JavaScript', 'vision-helper.js', 'curl ']:
            self.assertIn(needle, regions, needle)
        self.assertIn('return { data, plugin, ffmpeg: hostIsWindows() ? "ffmpeg" : await macFfmpegPath(sdk) };', self.panel)

    def test_cutaways_fall_back_without_libx264(self):
        engine = self.sources['engine.ts']
        self.assertIn('const encoder = cwPickEncoder(await cwEncoders());', engine)
        self.assertIn('"-hide_banner", "-encoders"', engine)
        self.assertIn('...encoder.args, "-movflags", "+faststart", "-write_tmcd", "0"', engine)
        self.assertNotIn('"-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-movflags"', engine)

    def test_run_scripts_have_a_long_deadline(self):
        self.assertIn('sdk.runScript({ script, summary, allowCommit, timeoutSeconds: 120 })', self.panel)

    def test_host_missing_is_one_message(self):
        self.assertIn('e?.code === "host-missing" ? new Error(NEEDS_NEWER)', self.panel)

    def test_caption_font_has_windows_fallback(self):
        self.assertIn('"Segoe UI", Arial, sans-serif', self.sources['captions.tsx'])

    def test_windows_downloads_are_capped_and_off_the_main_process(self):
        # Selects' FileSystem.downloadFile buffers a whole response in its main process with no limit; a large stock
        # video froze the app on Windows. Search results go through the panel's capped fetch or the host's ffmpeg.
        engine = self.sources['engine.ts']
        self.assertNotIn('.downloadFile(', engine)
        self.assertNotIn('"downloadFile"', engine)
        self.assertIn('const CW_MAX_BYTES = 25000000, CW_FETCH_MS = 25000, CW_CLIP_SECONDS = 15;', engine)
        self.assertIn('if (total > CW_MAX_BYTES) { try { await reader.cancel(); } catch {} return "too-big"; }', engine)
        self.assertIn('"-rw_timeout", "20000000"', engine)
        self.assertIn('"-fs", String(CW_MAX_BYTES)', engine)

    def test_manifest_lists_windows(self):
        manifest = json.loads((PLUGIN / 'plugin.json').read_text(encoding='utf-8'))
        self.assertEqual(manifest['compatibility']['platforms'], ['macOS arm64', 'Windows x64'])
        self.assertEqual(manifest['version'], '0.2.14')
        self.assertIn('centre-cropped', manifest['compatibility']['selects'])
        self.assertNotIn('Available on macOS for now', (PLUGIN / 'INSTALL.md').read_text(encoding='utf-8'))


if __name__ == '__main__':
    unittest.main()
