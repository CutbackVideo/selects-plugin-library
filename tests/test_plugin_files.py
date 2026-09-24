import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('plugin_files', Path(__file__).resolve().parents[1] / 'tools/plugin_files.py')
plugins = importlib.util.module_from_spec(spec)
spec.loader.exec_module(plugins)
COMMIT = 'a' * 40


class PluginFilesTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.target = self.root / 'new plugin'
        self.manifest = {'schemaVersion': 1, 'id': 'example', 'version': '1.0.0',
                         'entrypoint': 'SKILL.md', 'installation': 'INSTALL.md',
                         'files': ['SKILL.md', 'INSTALL.md', 'scripts/use.py']}
        self.calls = []

    def fetch(self, url, limit):
        self.calls.append(url)
        if '/commits/' in url:
            return json.dumps({'sha': COMMIT}).encode()
        if url.endswith('/plugin.json'):
            return json.dumps(self.manifest).encode()
        return b'portable source'

    def test_resolves_once_and_downloads_only_one_plugin_at_that_commit(self):
        with patch.object(plugins, 'fetch', side_effect=self.fetch):
            result = plugins.download('example', self.target)
        self.assertEqual(result['commit'], COMMIT)
        self.assertEqual(result['files'], 4)
        self.assertEqual(len(self.calls), 5)
        self.assertEqual(sum('/commits/' in u for u in self.calls), 1)
        for url in self.calls[1:]:
            self.assertIn('/' + COMMIT + '/plugins/example/', url)
        self.assertEqual({str(p.relative_to(self.target)) for p in self.target.rglob('*') if p.is_file()},
                         {'plugin.json', 'SKILL.md', 'INSTALL.md', 'scripts/use.py'})
        self.assertEqual((self.target / 'scripts/use.py').read_bytes(), b'portable source')

    def test_preview_metadata_does_not_download_gallery_media(self):
        self.manifest['preview'] = {'video': 'preview.mp4', 'poster': 'poster.webp', 'width': 540, 'height': 960}
        with patch.object(plugins, 'fetch', side_effect=self.fetch):
            plugins.download('example', self.target, COMMIT)
        self.assertFalse(any(url.endswith(('.mp4', '.webp')) for url in self.calls))

    def test_preview_paths_and_dimensions_are_validated(self):
        for preview in ({'video': '../preview.mp4', 'poster': 'poster.webp', 'width': 540, 'height': 960},
                        {'video': 'preview.mp4', 'poster': 'poster.webp', 'width': 0, 'height': 960}):
            self.manifest['preview'] = preview
            with self.assertRaises(ValueError):
                plugins.validate_manifest(self.manifest)

    def test_full_commit_needs_no_branch_lookup(self):
        with patch.object(plugins, 'fetch', side_effect=self.fetch):
            plugins.download('example', self.target, COMMIT)
        self.assertFalse(any('/commits/' in u for u in self.calls))

    def test_download_failure_leaves_no_partial_install(self):
        def failing(url, limit):
            if url.endswith('/INSTALL.md'):
                raise OSError('download interrupted')
            return self.fetch(url, limit)
        with patch.object(plugins, 'fetch', side_effect=failing):
            with self.assertRaises(OSError):
                plugins.download('example', self.target)
        self.assertFalse(self.target.exists())
        self.assertEqual(list(self.root.glob('.plugin-stage-*')), [])

    def test_existing_install_is_preserved_without_network(self):
        self.target.mkdir()
        (self.target / 'settings').write_text('keep')
        with patch.object(plugins, 'fetch') as fetch:
            with self.assertRaisesRegex(ValueError, 'already exists'):
                plugins.download('example', self.target)
            fetch.assert_not_called()
        self.assertEqual((self.target / 'settings').read_text(), 'keep')

    def test_unsafe_manifest_is_rejected_before_source_download(self):
        for name in ['../escape', '/absolute', '.local/model', '.', 'scripts/../../escape']:
            with self.subTest(name=name):
                self.manifest['files'] = ['SKILL.md', 'INSTALL.md', name]
                self.calls = []
                with patch.object(plugins, 'fetch', side_effect=self.fetch):
                    with self.assertRaises(ValueError):
                        plugins.download('example', self.target)
                self.assertEqual(len(self.calls), 2)
                self.assertFalse(self.target.exists())

    def test_wrong_plugin_and_invalid_commit_are_rejected(self):
        self.manifest['id'] = 'another'
        with patch.object(plugins, 'fetch', side_effect=self.fetch):
            with self.assertRaisesRegex(ValueError, 'differs'):
                plugins.download('example', self.target)
        with patch.object(plugins, 'fetch', return_value=b'{"sha":"main"}'):
            with self.assertRaisesRegex(ValueError, 'Invalid commit'):
                plugins.download('example', self.target)
        self.assertFalse(self.target.exists())

    def test_local_check_rejects_missing_files_and_symlinks(self):
        source = self.root / 'plugins/example'
        source.mkdir(parents=True)
        (source / 'plugin.json').write_text(json.dumps(self.manifest))
        with self.assertRaises(ValueError):
            plugins.check('example', self.root)
        for name in self.manifest['files']:
            p = source / name
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text('portable source')
        self.assertEqual(plugins.check('example', self.root)['files'], 4)
        (source / 'INSTALL.md').unlink()
        (source / 'INSTALL.md').symlink_to(source / 'SKILL.md')
        with self.assertRaisesRegex(ValueError, 'regular file'):
            plugins.check('example', self.root)

    def write_local_plugin(self):
        source = self.root / 'plugins/example'
        source.mkdir(parents=True, exist_ok=True)
        (source / 'plugin.json').write_text(json.dumps(self.manifest))
        for name in self.manifest['files']:
            path = source / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('portable source')

    def test_local_check_accepts_legacy_and_optional_translations(self):
        self.manifest.update(name='Example', summary='Original fallback')
        self.write_local_plugin()
        original = plugins.check('example', self.root)
        for localized in ({}, {'ko': {'name': '\uc608\uc81c', 'summary': '\uc608\uc81c \ud50c\ub7ec\uadf8\uc778'}}):
            with self.subTest(localized=localized):
                self.manifest['localized'] = localized
                self.write_local_plugin()
                self.assertEqual(plugins.check('example', self.root), original)

    def test_local_check_rejects_malformed_translation_metadata(self):
        for localized in (None, [], 'invalid', {'ko': []},
                          {'ko': {'name': 'Example'}},
                          {'ko': {'name': 42, 'summary': 'Example'}},
                          {'ko': {'name': 'Example', 'summary': []}}):
            with self.subTest(localized=localized):
                self.manifest['localized'] = localized
                self.write_local_plugin()
                with self.assertRaisesRegex(ValueError, 'Invalid localized'):
                    plugins.check('example', self.root)

    def test_install_layout_allows_the_panel_file_and_this_plugins_skills_folder(self):
        for text in ('Copy `panel.tsx` to `SELECTS_USER_PANELS_ROOT/example/panel.tsx`.',
                     'Create `example` beneath `SELECTS_USER_PANELS_ROOT`.',
                     'python3 "$SELECTS_USER_SKILLS_ROOT/example/scripts/use.py"',
                     'Default: `.selects/panels/example/panel.tsx` beneath your home.',
                     "f.join(f.homedir(),'.selects','skills','example','motion.tsx')",
                     "f.join(f.homedir(),'.selects','plugin-data','example',pid)"):
            with self.subTest(text=text):
                plugins.check_layout('example', 'INSTALL.md', text)

    def test_install_layout_rejects_files_outside_the_two_install_folders(self):
        for text in ('cp -R approved "$SELECTS_USER_PANELS_ROOT/example/"',
                     'python3 "$SELECTS_USER_PANELS_ROOT/example/pipeline.py"',
                     'python3 "$HOME/.selects/panels/example/pipeline.py"',
                     'cat "$SELECTS_USER_SKILLS_ROOT/other-plugin/SKILL.md"',
                     'Copy the templates to `.selects/templates/example`.',
                     "f.join(f.homedir(),'.selects','templates','example','motion.tsx')"):
            with self.subTest(text=text):
                with self.assertRaisesRegex(ValueError, 'SELECTS_USER_|install layout'):
                    plugins.check_layout('example', 'INSTALL.md', text)

    def test_local_check_applies_the_install_layout_to_listed_text_files(self):
        self.write_local_plugin()
        (self.root / 'plugins/example/scripts/use.py').write_text('open("$SELECTS_USER_PANELS_ROOT/example/data.json")')
        with self.assertRaisesRegex(ValueError, 'scripts/use.py'):
            plugins.check('example', self.root)


if __name__ == '__main__':
    unittest.main()
