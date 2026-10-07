"""Postcard Cutout Studio on Windows: every helper op runs in the panel, through the host's FileSystem and ffmpeg.

On macOS `helper()` keeps running pipeline.py in a pinned Python through the shell (inside `// mac-only:start` ...
`end`). On Windows it dispatches to the panel's own port of the same ops (the pc-ledger and pc-port blocks, checked
against pipeline.py in tests/postcard_cutout_studio_port.test.mjs), after one host check: a Selects build older than
2.0.508 (masks read through FileSystem.pathToLocalURL) or without the host services gets one "Update Selects" line,
and every editor action and the Clip highlights template entry stop on it before anything is made. Host I/O is the
av-host block (copied from Archive Vlog; only its presence and names are checked here, not byte-equality with a
sibling plugin). Set POSTCARD_PANEL to check another copy (e.g. the one on main).
"""
import json
import os
from pathlib import Path
import re
import unittest

from windows_static import assert_no_shell_token, shell_token_present

ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / 'plugins/postcard-cutout-studio'
PANEL = Path(os.environ.get('POSTCARD_PANEL') or PLUGIN / 'panel.tsx')
HOST_BLOCK = re.compile(r'// av-host:start\n.*?// av-host:end', re.S)
PORT_BLOCK = re.compile(r'// pc-port:start\n.*?// pc-port:end', re.S)
LEDGER_BLOCK = re.compile(r'// pc-ledger:start\n.*?// pc-ledger:end', re.S)
MAC_ONLY = re.compile(r'^[ \t]*// mac-only:start[ \t]*\n.*?^[ \t]*// mac-only:end[ \t]*$', re.S | re.M)
HOST_NAMES = ['hostError', 'bindLocalSdk', 'hostApi', 'hostNeed', 'hostIsWindows', 'hostJoin', 'hostBytes', 'hostReadBytes',
              'hostReadText', 'hostRemove', 'hostRoots', 'hostDecodePcm', 'hostProbeSeconds']
FORBIDDEN = ['mkdir -p', 'printf', '$HOME', '$SELECTS_USER', 'rm -f', 'base64 ', '| base64', 'shasum',
             'command -v', 'export PATH', 'cat "', '2>/dev/null', '/usr/bin/', 'sh "', "sh '", 'runtime.sh',
             'pipeline.py', 'scene_preview.py', 'ffprobe -', 'ffmpeg -', "\"'\\\\''\"", '127.0.0.1',
             '-pattern_type', 'stats_file']
SPAWN = re.compile(r"""(?:["'`]|&&|;|\|)\s*(?:node|python3?)\b|/python3?["'\s]""")
GUARD = 'if(hostIssue){setError(hostIssue);return;}'
# Every op the panel asks the helper for, and the ones pipeline.py has besides.
OPS = ['load', 'init', 'update', 'event', 'claim', 'reuse', 'ensure', 'folder-media', 'tile', 'strip', 'sizes', 'hold',
       'silent', 'cutout-input', 'prepare', 'foreground', 'subject-box', 'settings-load',
       'settings-save', 'job-record']


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
                assert_no_shell_token(self, token, runtime)
        self.assertIsNone(SPAWN.search(runtime), 'no node/python spawn outside mac-only regions')

    def test_windows_runs_every_helper_op_in_the_panel(self):
        helper = self.body('async function helper(sdk,op,args={}){', '\n')
        self.assertIn('if(!hostIsWindows())return macHelper(sdk,op,args);', helper)
        self.assertLess(helper.index('pcHostIssue()'), helper.index('pcWindows(sdk)'), 'the host check comes first')
        self.assertNotIn('Available on macOS', self.text)
        self.assertNotIn('function macHelper(', self.portable, 'the shell helper lives in a mac-only region')
        self.assertNotIn('function runtimePython(', self.portable)
        ops = re.search(r"const PC_OPS=\[([^\]]*)\];", self.text)
        self.assertIsNotNone(ops)
        self.assertEqual(sorted(re.findall(r"'([a-z-]+)'", ops.group(1))), sorted(OPS))
        used = set(re.findall(r"helper\(sdk,'([a-z-]+)'", self.text))
        self.assertLessEqual(used, set(OPS), 'every op the panel asks for is ported')
        port = PORT_BLOCK.search(self.text)
        ledger = LEDGER_BLOCK.search(self.text)
        self.assertIsNotNone(port)
        self.assertIsNotNone(ledger)
        ported = set(re.findall(r"'([a-z-]+)':", port.group(0))) | set(re.findall(r"(?m)^ return \{([a-z]+),", port.group(0)))
        for op in OPS:
            with self.subTest(op=op):
                self.assertTrue(op in ported or re.search(r'(?<![\w-])' + re.escape(op) + r'[:,]', port.group(0))
                                or re.search(r'(?m)^  ' + re.escape(op) + r':a=>', ledger.group(0)), op)

    def test_editor_probes_reach_the_port_on_windows(self):
        for name, mac in (('probeSubject', 'macProbeSubject'), ('rangePreview', 'macRangePreview'), ('decodeCheck', 'macDecodeCheck')):
            with self.subTest(name=name):
                body = self.body('async function ' + name + '(sdk,', '\n')
                self.assertIn('if(!hostIsWindows())return ' + mac + '(', body)
                self.assertIn('pcWindows(sdk)', body)
        self.assertIn('const r=await probeSubject(sdk,path);', self.text)
        self.assertIn('const r=await rangePreview(sdk,', self.text)
        self.assertIn('const q=await decodeCheck(sdk,r.export.outPath);', self.text)

    def test_masks_come_from_local_files_on_windows(self):
        port = PORT_BLOCK.search(self.text).group(0)
        self.assertIn("pathToLocalURL(dir))).replace(/\\/+$/,'')", port)
        self.assertIn('d.mask={baseUrl:(await localUrl(dest)),', port)
        self.assertIn("ensure:async()=>({})", port, 'no mask service on Windows')
        self.assertIn("const PC_MIN_HOST='2.0.508';", self.text)

    def test_the_cutout_comes_back_through_the_host(self):
        self.assertIn("...(mg.supportsPluginFiles?.()?{delivery:{pluginFolder:hostJoin(r.logDir,'cloud')}}:{})", self.text)
        self.assertIn("file=job.deliveryStatus==='delivered'?(job.outputs||[]).find(o=>o.path)?.path||null:null", self.text)
        self.assertNotIn("Application Support", self.text, 'the app journal is not read')
        self.assertNotIn("'fetch-result'", self.text)
        self.assertNotIn("r.logDir+'/", self.text)

    def test_one_stream_mp4_outputs(self):
        port = PORT_BLOCK.search(self.text).group(0)
        self.assertEqual(port.count("'-write_tmcd','0'"), 3, 'holds, silent copies and the cutout input')

    def test_windows_paths_are_compared_not_matched(self):
        self.assertIn("function samePath(a,b){if(a===b)return true;if(!hostIsWindows()||a==null||b==null)return false;", self.text)
        # Paths the host lists (inventory rows, app resources) against paths this panel made or picked.
        for old in ('item.path===', 'v.path===path', 'x.path===paths[', 'x.path===prepared', 'x.path===s.path', 'x.path===path'):
            with self.subTest(old=old):
                self.assertNotIn(old, self.text)
        self.assertEqual(self.text.count('samePath('), 8, 'the helper and its seven local uses')
        self.assertIn('sdkMediaByPath(sdk,scope.projectId,path)', self.text)

    def test_template_run_checks_the_host_before_anything(self):
        body = self.body('async function runTemplate(')
        guard = body.index('{const issue=pcHostIssue();if(issue)throw Error(issue);}')
        for later in ('templatePicks(', 'runScript', 'readInventory(', "helper(sdk,'load'", 'runner.build('):
            with self.subTest(later=later):
                self.assertLess(guard, body.index(later))
        self.assertLess(guard, body.index('\n', body.index('{')) + 60, 'the check is the first statement')

    def test_editor_actions_stop_first_on_an_old_host(self):
        self.assertIn('const hostIssue=useMemo(()=>pcHostIssue(),[]);', self.text)
        for name, nxt in (('async function execute(kind){', 'busyRef.current=true'),
                          ('async function readFolder(', 'setLoading(true)'),
                          ('async function chooseFolder(){', 'pickDirectoryPath'),
                          ('async function dropFolder(event){', 'droppedFolderPath(')):
            with self.subTest(handler=name):
                body = self.body(name)
                self.assertGreater(body.find(GUARD), -1)
                self.assertLess(body.find(GUARD), body.index(nxt))
        self.assertIn('{!!hostIssue&&<p style={{...muted,margin:0}}>{hostIssue}</p>}', self.text)
        self.assertIn('disabled={picking||loading||!!hostIssue} onClick={chooseFolder}', self.text)
        self.assertIn('disabled={!!hostIssue||loading||picking||', self.text)

    def test_title_fonts_have_a_windows_face(self):
        stack = '"DIN Condensed","Bahnschrift Condensed","Bahnschrift","Arial Narrow",sans-serif'
        self.assertEqual(self.text.count(stack), 2, 'the title and its measuring copy use one stack')

    def generation(self):
        start = self.text.index('async function generation(r,collect=false){')
        return self.text[start:self.text.index('\nasync function ', start + 1)]

    def test_paid_background_removal_waits_for_an_explicit_yes(self):
        # Credit use is allowed on both OSes (user decision 2026-10-02), but only after the person confirms: the submit
        # branch of generation() awaits confirmCredits before it claims the step, registers the cutout input or calls
        # MediaGeneration.submit (its only call site).
        body = self.generation()
        ask = body.find("if(r.phase==='ready'&&!(await confirmCredits(r)))throw Object.assign(Error(CREDITS_DECLINED),{creditsDeclined:true});")
        self.assertGreater(ask, -1, 'no awaited credit confirm in the submit branch')
        self.assertLess(body.index('if(!collect){'), ask)
        for later in ('claim(', "helper(sdk,'cutout-input'", 'importFiles', 'mg.submit('):
            with self.subTest(step=later):
                self.assertLess(ask, body.index(later))
        self.assertEqual(self.text.count('mg.submit('), 1, 'one paid submit site')
        self.assertNotIn('PAID_MAC_ONLY', self.text)
        build = self.body('async function build(kind,', '\nreturn {persist,')
        self.assertNotIn('cutoutInput.path]', build, 'the cutout input is registered only after the confirm')

    def test_the_panel_asks_with_a_card(self):
        self.assertIn("const CREDITS_NOTICE='This sends a '+CUTOUT_SECONDS+' s clip of your subject to Selects background removal, which uses generation credits. A rebuild with the same subject and range reuses the cutout.';", self.text)
        self.assertIn('const confirmCredits=()=>new Promise(resolve=>setCreditAsk({resolve}));', self.text)
        self.assertIn('const runner=createRunner({sdk,guard,setRun,setStatus,confirmCredits});', self.text)
        self.assertIn('onClick={()=>answerCredits(true)}>Use credits and continue</ui.Button>', self.text)
        self.assertIn('onClick={()=>answerCredits(false)}>Cancel</ui.Button>', self.text)
        self.assertIn('if(e?.creditsDeclined){setError(CREDITS_DECLINED);', self.text, 'a cancel leaves an error, so the run is not resumed by itself')

    def test_a_template_run_counts_as_consent_to_the_paid_cutout(self):
        # Product decision 2026-10-06: starting a credit-using template is the consent; the Panel still asks.
        self.assertIn('confirmCredits=async _run=>{throw Error(TEMPLATE_CREDITS)}}){', self.body('function createRunner('),
                      'a caller that hands no confirm over still refuses')
        body = self.body('async function runTemplate(', '\nasync function releaseTemplateRun(')
        self.assertIn('createRunner({sdk,guard,setStatus,confirmCredits:async()=>true})', body)

    def test_manifest_lists_windows(self):
        manifest = json.loads((PLUGIN / 'plugin.json').read_text(encoding='utf-8'))
        self.assertEqual(manifest['compatibility']['platforms'], ['macOS arm64', 'Windows x64'])
        self.assertEqual(manifest['collection'], 'visual-highlights')
        for key in ('inputs', 'options', 'prepare'):
            if key in manifest:
                self.assertTrue(manifest[key])

    def test_scroll_container_keeps_a_stable_gutter(self):
        self.assertEqual(self.text.count("overflowY:'auto'"), self.text.count("scrollbarGutter:'stable'"))


if __name__ == '__main__':
    unittest.main()
