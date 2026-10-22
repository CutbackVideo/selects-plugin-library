"""medical-explainer: Windows safety, publication rules and the shared plumbing (static checks).

The engine runs inside the panel (medEngine; tests/medical_explainer.test.mjs runs it), so the build needs no shell and
no Python on either OS: no runShell, no POSIX shell syntax, host file and ffmpeg services only.
"""
import json
from pathlib import Path
import re
import subprocess
import unittest
import importlib.util

from windows_static import assert_no_shell_token

ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / 'plugins' / 'medical-explainer'
PANEL = PLUGIN / 'panel.tsx'
AV_START, AV_END = '// av-host:start', '// av-host:end'
LANGS = ['de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'tr', 'zh']

FORBIDDEN = [
    'mkdir -p', 'printf', '$HOME', '$SELECTS_USER', 'rm -f', 'base64 -D', '| base64', 'shasum', 'command -v',
    'export PATH', 'cat ', '2>/dev/null', '/Applications/', '/usr/bin/', '/opt/homebrew', 'stat -f', 'dd if=',
    'curl ', 'osascript', r"'\\''",
]
FORBIDDEN_RE = [
    (re.compile(r'''["'`]\s*node\s'''), 'a node spawn'),
    (re.compile(r'\bpython3?\b'), 'a python spawn'),
    (re.compile(r'''\bsh\s+["']'''), 'an sh invocation'),
]


def block(text, start, end):
    a, b = text.find(start), text.find(end)
    return text[a:b + len(end)] if a >= 0 and b > a else None


def runtime_text(text):
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    return '\n'.join(line for line in text.split('\n') if not line.lstrip().startswith('//'))


def load_check_public():
    spec = importlib.util.spec_from_file_location('check_public', ROOT / 'tools' / 'check_public.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class MedicalExplainerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.panel = PANEL.read_text(encoding='utf-8')
        cls.runtime = runtime_text(cls.panel)
        cls.manifest = json.loads((PLUGIN / 'plugin.json').read_text(encoding='utf-8'))

    def test_shared_blocks_match_their_sources(self):
        vox = (ROOT / 'plugins' / 'vox-explainer' / 'panel.tsx').read_text(encoding='utf-8')
        archive = (ROOT / 'plugins' / 'archive-vlog' / 'panel.tsx').read_text(encoding='utf-8')
        self.assertEqual(block(self.panel, AV_START, AV_END), block(archive, AV_START, AV_END))
        for start, end in [('// generation-sdk:start', '// generation-sdk:end'), ('// local-sdk:start', '// local-sdk:end')]:
            self.assertEqual(block(self.panel, start, end), block(vox, start, end), start)

    def test_no_shell_at_all(self):
        self.assertNotIn('runShell', self.panel)
        for needle in FORBIDDEN:
            assert_no_shell_token(self, needle, self.runtime, needle)
        for pattern, what in FORBIDDEN_RE:
            self.assertIsNone(pattern.search(self.runtime), what)

    def test_engine_runs_in_the_panel(self):
        self.assertIn('await medEngine(cmd, dir, args, medHostIO(dir, { readJson, writeJson }))', self.panel)
        for cmd in ['fetch', 'validate', 'timeline', 'requests', 'sheet', 'strips', 'compose', 'assembly']:
            self.assertIn('run("%s", dir, ' % cmd, self.panel, cmd)

    def test_runtime_files_live_in_plugin_data(self):
        self.assertIn('hostJoin(fs.homedir(), ".selects", "plugin-data", APP_ID)', self.panel)
        self.assertIn('const APP_ID = "medical-explainer";', self.panel)
        self.assertNotRegex(self.runtime, r'`\$\{(?:dir|root|st\.dir|e\.root|fs\.homedir\(\))\}/')

    def test_in_flight_jobs_are_recovered_through_plugin_storage(self):
        self.assertIn('sdk.storage.getItem(storageKey)', self.panel)
        self.assertIn('sdk.storage.setItem(storageKey, value)', self.panel)
        self.assertIn('`job:${projectId}`', self.panel)
        # The request is recorded before the paid call and its job id right after, both persisted.
        run = self.panel[self.panel.index('export async function medRunGenerations('):self.panel.index('// ---- Draft step')]
        submit = run[run.index('phase: "submitting"'):run.index('pending.push(q);')]
        self.assertLess(submit.index('await o.persist()'), submit.index('await api.submit(q)'))
        self.assertIn('gen[q.gen] = { key: q.key, attempt: q.attempt, jobId };', submit)
        # Nothing in the observer submits under a new key, and a deadline never marks a job failed.
        self.assertNotIn('failed: "timeout"', self.panel)
        self.assertIn('reason: "still " + statusOf(q)', run)
        self.assertNotIn('localStorage', self.runtime)
        self.assertIn('if (!storageReady) return;', self.panel)

    def test_new_attempts_only_for_known_failures_or_the_users_choice(self):
        kind = self.panel[self.panel.index('export async function medGenerateKind('):self.panel.index('const takeLetters = ')]
        self.assertIn('if (first.unresolved.length) throw ctx.unresolved(first.unresolved);', kind)
        self.assertIn('const retry = first.failed.filter((f) => !f.policy);', kind)
        # The only other path to a new attempt is the explicit "Resubmit (may charge again)" button.
        self.assertEqual(self.panel.count('failed: "resubmitted_by_user"'), 1)
        self.assertIn('onClick={() => produce(job, false, undefined, unresolved)}', self.panel)
        self.assertIn('generateKind(st, sc, dir, "narration", sceneIds, S.steps[0])', self.panel)
        self.assertNotIn('"keep"', self.panel)

    def test_job_list_and_music_are_scoped_to_this_job(self):
        self.assertIn('if (r?.isError || !Array.isArray(r?.result)) throw new Error(', self.panel)
        self.assertIn('if (!st.stopped && recovery.current?.jobId === st.id) await saveRecovery(', self.panel)
        self.assertIn('if (st) st.stopped = true;', self.panel)
        self.assertLess(self.panel.index('await openReview(dir, p);'), self.panel.index('generateKind(st, sc, dir, "music"'))

    def test_keyframe_model_choice_is_a_setting(self):
        self.assertIn('<ui.Select label={S.kfModel} value={adv.kfModel} onChange={setKfModel}', self.panel)
        self.assertIn('{!medKfModel(adv.kfModel).edit && <ui.Message tone="muted">{S.fluxNote}</ui.Message>}', self.panel)
        self.assertIn('export const MED_KF_DEFAULT = "seedream";', self.panel)
        self.assertIn('const stage = await medClipsStage(kindCtx(st, sc, dir, S.steps[2]), sceneIds);', self.panel)
        # A policy refusal waits for the user; the only regeneration path is the explicit per-scene button.
        self.assertIn('if (stage.blocked.length) {', self.panel)
        self.assertEqual(self.panel.count('picks.regen = { ...asObj(picks.regen), [n]:'), 1)
        self.assertIn('onClick={() => choosePolicy(s.n, "regen", s.model)}', self.panel)
        self.assertNotIn('kfpolicy', self.panel)

    def test_mode_art_and_layout_are_settings(self):
        for needle in ['<ui.Select label={S.mode} value={adv.mode} onChange={setModeSet}', '<ui.Select label={S.art} value={adv.art} onChange={setArtSet}', '<ui.Select label={S.layout} value={adv.layout} onChange={setLayoutSet}',
                       'mode: modeSet, art: artSet, layout: layoutSet, inside: insideSet', 'await ask(medScriptPrompt(art, f, modeSet, insideSet))',
                       '<ui.Select label={S.inside} value={adv.inside} onChange={setInsideSet}']:
            self.assertIn(needle, self.panel)
        self.assertNotIn('MED_STYLE', self.panel)
        self.assertNotIn('gentle blood flow', self.panel)

    def test_first_screen_and_advanced_settings(self):
        first = self.panel[self.panel.index('<ui.Section title={S.sourceTitle}>'):self.panel.index('<ui.Section title={S.advanced')]
        # The first screen: source, brand preset, "Write the script" and the defaults line; nothing else.
        for needle in ['<ui.Tabs', 'label={S.preset}', 'onClick={makePlan}', 'S.defaultsLine(']:
            self.assertIn(needle, first)
        for gone in ['S.language', 'S.kfModel', 'S.mode', 'S.art', 'S.inside', 'S.layout', 'S.voice', 'S.quality', 'S.music', 'S.gateScript', 'S.gateKf', 'S.wordmark', 'S.color1', 'S.bg']:
            self.assertNotIn('label={%s}' % gone, first, gone)
        adv = self.panel[self.panel.index('<ui.Section title={S.advanced'):self.panel.index('{plan && (', self.panel.index('<ui.Section title={S.advanced'))]
        for needle in ['label={S.language}', 'label={S.kfModel}', 'label={S.mode}', 'label={S.art}', 'label={S.inside}', 'label={S.layout}', 'label={S.voice}',
                       'label={S.quality}', 'label={S.music}', 'label={S.gateScript}', 'label={S.gateKf}', 'label={S.wordmark}', 'label={S.color1}', 'label={S.color2}', 'label={S.bg}']:
            self.assertIn(needle, adv, needle)
        # Closed by default, remembered in plugin storage, a changed-count on the header, read-only once a job started.
        self.assertIn('const [advOpen, setAdvOpen] = React.useState(false);', self.panel)
        self.assertIn('sdk.storage.getItem(MED_ADV_STORAGE_KEY).then((v: string | null) => { if (live) setAdvOpen(v === "1"); })', self.panel)
        self.assertIn('sdk.storage.setItem(MED_ADV_STORAGE_KEY, next ? "1" : "0")', self.panel)
        self.assertIn('{advOpen && (', adv)
        self.assertIn('S.advanced + (advChanged.length ? ` \\u00b7 ${S.changed(advChanged.length)}` : "")', self.panel)
        self.assertIn('const fixed = !!busy || !!jobSettings;', self.panel)
        self.assertEqual(adv.count('disabled={fixed}'), 8, 'every job-fixed setting')

    def test_update_guard_policy_and_hook(self):
        policies = json.loads((ROOT / 'shared' / 'app-update-guard-policies.json').read_text(encoding='utf-8'))
        self.assertEqual(policies['medical-explainer'], {'Panel': 'busy'})
        self.assertIn('useAppUpdateGuard(sdk, context?.language, () => !!busy);', self.panel)
        shared = (ROOT / 'shared' / 'app-update-guard.ts').read_text(encoding='utf-8').rstrip()
        self.assertIn('// app-update-guard:start\n' + shared + '\n// app-update-guard:end', self.panel)

    def test_missing_host_services_get_one_message(self):
        self.assertIn('{noHost && <ui.Message>{S.noHost}</ui.Message>}', self.panel)
        langs = re.findall(r'^  (\w\w): \{$', self.panel, flags=re.M)
        self.assertEqual(sorted(langs), ['en', 'ko'])
        for key in ['noHost', 'noGeneration', 'noStorage', 'review', 'keepWaiting', 'resubmit', 'styleChanged', 'kfModel', 'fluxNote', 'policyScenes', 'policyTransitions', 'editHint', 'policyTitle', 'policyUseStill', 'policyRegenFailed', 'policyStill', 'autoMode', 'autoStyle', 'advanced', 'jobFixed']:
            self.assertEqual(len(re.findall(r'\b%s: "' % key, self.panel)), len(langs), key)

    def test_korean_fallback_fonts_in_every_overlay(self):
        self.assertEqual(self.panel.count("'Apple SD Gothic Neo','Malgun Gothic',"), 1)
        self.assertEqual(self.panel.count('"const FALLBACK = " + FALLBACK_SANS'), 9)
        self.assertEqual(self.panel.count('"const FALLBACK = " + FALLBACK_SERIF'), 1)

    def test_only_the_korean_name_header_is_literal_korean(self):
        public = load_check_public()
        self.assertEqual(public.inspect('plugins/medical-explainer/panel.tsx', PANEL.read_bytes()), [])
        header = self.panel.split('\n')[:24]
        self.assertIn('// @name:ko \uc758\ud559 \uc124\uba85 \uc1fc\uce20', header)
        korean = re.compile(r'[\uac00-\ud7a3]')
        literal = [i for i, line in enumerate(self.panel.split('\n')) if korean.search(line)]
        self.assertEqual(literal, [header.index('// @name:ko \uc758\ud559 \uc124\uba85 \uc1fc\uce20')])

    def test_default_video_is_kling_v3_standard(self):
        self.assertIn('i2v: "model_v1_ZmFsLWFpL2tsaW5nLXZpZGVvL3YzL3N0YW5kYXJkL2ltYWdlLXRvLXZpZGVv"', self.panel)
        self.assertNotIn('L3Byby9pbWFnZS10by12aWRlbw', self.panel)  # .../pro/image-to-video

    def test_manifest_and_docs(self):
        m = self.manifest
        self.assertEqual(m['id'], 'medical-explainer')
        self.assertEqual(m['status'], 'experimental')
        self.assertEqual(sorted(m['files']), ['INSTALL.md', 'README.md', 'assets/chosun-ilbo-logo.svg', 'panel.tsx'])
        self.assertNotIn('preview', m)
        self.assertNotIn('minSelectsVersion', m)
        self.assertEqual(sorted(m['localized']), LANGS)
        self.assertIn('Windows x64', m['compatibility']['platforms'])
        for name in ['INSTALL.md', 'README.md']:
            text = (PLUGIN / name).read_text(encoding='utf-8')
            for gone in ['brew ', 'Homebrew', 'xcode-select', 'Python', 'engine.py']:
                self.assertNotIn(gone, text, name)
        self.assertIn('(plugins/medical-explainer)', (ROOT / 'README.md').read_text(encoding='utf-8'))

    def test_manifest_passes_the_library_check(self):
        result = subprocess.run(['python3', 'tools/plugin_files.py', 'check', 'medical-explainer'], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)[0]['id'], 'medical-explainer')

    def test_ci_runs_the_node_tests(self):
        workflow = (ROOT / '.github' / 'workflows' / 'check.yml').read_text(encoding='utf-8')
        self.assertIn('node --test tests/medical_explainer.test.mjs', workflow)


if __name__ == '__main__':
    unittest.main()
