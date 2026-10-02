"""Portrait Beat Montage on Windows: the in-panel engine builds, and nothing is paid without a click.

macOS keeps pipeline.py (numpy, Pillow and RVM on a private Python that rvm/setup.sh installs through
POSIX shell); that shell sits in `// mac-only:start` ... `end` regions whose entries refuse Windows.
Windows runs the pbm-engine region: host ffmpeg, FileSystem and a Worker, with person mattes from one
Selects generation request that waits for the localized credits notice to be accepted. A Clip
highlights run (TemplateRun) skips setup on Windows and stops before the paid step. The host block is checked for its helpers, not
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

    def test_every_language_has_the_credits_notice(self):
        for table in ('const COST_TEXT = ', 'const COST_GO = ', 'const COST_STOP = ', 'const TEMPLATE_CREDITS = '):
            line = body(self.text, table, '\n')
            for lang in LANGUAGES:
                with self.subTest(table=table, lang=lang):
                    self.assertRegex(line, r'\b' + lang + r': "[^"]+"')
        cost = body(self.text, 'const COST_TEXT = ', '\n')
        self.assertIn('en: "This sends about {s} s of video ({n} shots) to Selects background removal, which uses generation credits. A rebuild reuses the result."', cost)
        for lang in LANGUAGES:
            with self.subTest(placeholders=lang):
                self.assertRegex(cost, r'\b' + lang + r': "[^"]*\{s\}[^"]*\{n\}[^"]*"')
        self.assertIn('en: "Use credits and continue"', body(self.text, 'const COST_GO = ', '\n'))

    def test_nothing_is_paid_before_the_click(self):
        cloud = body(self.text, 'async function pbmCloudMattes(', '\n}\n')
        submit = cloud.index('mg.submit(')
        # Host checks, then the (free, local) joined clip, then the notice, then the request.
        for earlier in ('mg.supportsPluginFiles()', 'pbmVersionBelow(version, PBM_CLOUD_MIN_HOST)', 'pbmMatteSource(', 'confirm({ seconds: source.seconds, shots: units.length })',
                        'if (!yes || signal?.aborted) throw pbmCancelled();'):
            with self.subTest(earlier=earlier):
                self.assertLess(cloud.index(earlier), submit)
        self.assertLess(cloud.index('confirm({'), cloud.index('if (!yes'))
        # A recorded result for this key skips the notice and the request.
        self.assertLess(cloud.index('r.key === key'), cloud.index('if (!alpha) {'))
        self.assertLess(cloud.index('if (!alpha) {'), cloud.index('confirm({'))
        self.assertIn('mg.cancel(scope, jobId)', cloud)
        self.assertIn('inputMediaSeconds: { video: source.seconds }', cloud)
        self.assertIn('uploads: { source: { pluginFile: source.path } }', cloud)
        # Windows asks for mattes only for windows with no cached matte or render.
        units = body(self.text, 'async function pbmUnits(', '\n}\n')
        self.assertLess(units.index('hostJoin(cache, "matte.gray")'), units.index('await mattes('))
        self.assertIn('!io.fs.existsSync(hostJoin(t.folder, "matte.gray"))', units)

    def test_template_run_builds_on_windows_but_never_pays(self):
        run = body(self.text, 'function TemplateRun(', 'export default function Panel')
        self.assertNotIn(WINDOWS_GUARD, run)
        self.assertIn('let doctor = hostIsWindows() ? { ready: true } : await pipeline(sdk, "doctor"', run)
        confirm = run.index('confirm: () => { throw Object.assign(new Error(pick(TEMPLATE_CREDITS, context.language)), { code: "needs-confirm" }); }')
        self.assertLess(run.index('const draftId = await buildMontage('), confirm)
        self.assertIn('en: "This uses Selects generation credits. Open Portrait Beat Montage and press Create new draft to confirm."',
                      body(self.text, 'const TEMPLATE_CREDITS = ', '\n'))

    def test_build_runs_the_windows_engine(self):
        build = body(self.text, 'async function buildMontage(', '\n}\n')
        self.assertNotIn(WINDOWS_GUARD, build)
        self.assertLess(build.index('hostIsWindows() ? await pbmWindowsMontage(sdk, { projectId, files, setStep, setProgress, signal, confirm })'), build.index('importFiles'))

    def test_panel_skips_setup_on_windows_and_asks_before_paying(self):
        panel = self.text[self.text.index('function MontagePanel('):]
        self.assertIn('const windows = hostIsWindows();', panel)
        self.assertIn('React.useEffect(() => { if (!windows) checkSetup(); }, []);', panel)
        self.assertIn('windows ? Promise.resolve() : pipeline(sdk, "doctor"', panel)
        self.assertIn('if (windows) return;\n    setSettingUp(true);', panel)
        self.assertIn('disabled={loading || (!windows && !doctor?.ready) || chosen.length < SHOTS}', panel)
        self.assertIn('confirm: confirmCost', panel)
        self.assertIn('onClick={() => answerCost(true)}>{pick(COST_GO, context.language)}', panel)
        self.assertIn('onClick={() => answerCost(false)}>{pick(COST_STOP, context.language)}', panel)
        self.assertNotIn('macOnlyText(context.language)', panel)

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

    def test_windows_engine_is_portable_and_mac_build_is_mac_only(self):
        engine = body(self.text, '// pbm-engine:start', '// pbm-engine:end')
        for name in ('async function pbmPlan(', 'async function pbmUnits(', 'async function pbmAssemble(',
                     'function pbmWorkerKernels(', 'async function pbmWindowsMontage(', 'async function pbmMattesFromAlpha('):
            with self.subTest(name=name):
                self.assertIn(name, engine)
        self.assertNotIn('runShell', engine)
        self.assertIn('"-nostdin"', engine)
        regions = '\n'.join(m.group(0) for m in MAC_ONLY.finditer(self.text))
        self.assertIn('async function macMontage(', regions)
        self.assertTrue(self.text[self.text.index('async function macMontage('):].split('\n')[1].lstrip().startswith(WINDOWS_GUARD))
        build = body(self.text, 'async function buildMontage(', '\n}\n')
        self.assertIn('hostIsWindows() ? await pbmWindowsMontage(', build)
        # One video stream per shot source, also when a clip has a timecode track.
        self.assertIn('"-pix_fmt", "yuv420p", "-write_tmcd", "0", out]', self.text)
        self.assertIn('"-pix_fmt", "yuv420p", "-write_tmcd", "0", str(source)]', (PLUGIN / 'pipeline.py').read_text(encoding='utf-8'))

    def test_manifest_and_docs(self):
        manifest = json.loads((PLUGIN / 'plugin.json').read_text(encoding='utf-8'))
        self.assertEqual(manifest['compatibility']['platforms'], ['macOS arm64', 'Windows x64'])
        self.assertEqual(manifest['version'], '0.1.7')
        install = (PLUGIN / 'INSTALL.md').read_text(encoding='utf-8')
        self.assertNotIn('brew install', install)
        self.assertIn('Windows', install)
        self.assertIn('credits', install)


if __name__ == '__main__':
    unittest.main()
