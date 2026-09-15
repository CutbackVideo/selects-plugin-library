import importlib.util
import io
import json
from pathlib import Path
import stat
import tempfile
import unittest
from unittest.mock import patch
import zipfile

spec = importlib.util.spec_from_file_location('packages', Path(__file__).resolve().parents[1] / 'tools/plugin_package.py')
packages = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packages)


class PackageTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.plugin = self.root / 'plugins/example'
        self.plugin.mkdir(parents=True)
        self.manifest = {'schemaVersion': 1, 'id': 'example', 'version': '1.0.0',
                         'entrypoint': 'SKILL.md', 'installation': 'INSTALL.md',
                         'files': ['SKILL.md', 'INSTALL.md']}
        self.write_manifest()
        (self.plugin / 'SKILL.md').write_text('Example skill')
        (self.plugin / 'INSTALL.md').write_text('Environment setup')
        (self.plugin / '.local').mkdir()
        (self.plugin / '.local/private.txt').write_text('must stay local')
        (self.root / 'plugins/unrelated').mkdir()
        (self.root / 'plugins/unrelated/secret.txt').write_text('must not be downloaded')

    def write_manifest(self):
        (self.plugin / 'plugin.json').write_text(json.dumps(self.manifest))

    def build(self):
        record = packages.pack('example', self.root)
        return (self.root / '.dist/example-1.0.0.zip').read_bytes(), record

    def test_reproducible_allowlisted_single_plugin(self):
        data, record = self.build()
        self.assertEqual(self.build(), (data, record))
        destination = self.root / "downloads with spaces/example's copy"
        result = packages.unpack(data, record, destination)
        self.assertEqual(result['files'], 3)
        self.assertEqual({p.name for p in destination.iterdir()}, {'SKILL.md', 'INSTALL.md', 'plugin.json'})
        self.assertEqual((destination / 'SKILL.md').read_bytes(), (self.plugin / 'SKILL.md').read_bytes())

    def test_corruption_writes_nothing(self):
        data, record = self.build()
        destination = self.root / 'target'
        with self.assertRaisesRegex(ValueError, 'checksum'):
            packages.unpack(data[:-1] + bytes([data[-1] ^ 1]), record, destination)
        self.assertFalse(destination.exists())

    def test_existing_installation_is_preserved(self):
        data, record = self.build()
        destination = self.root / 'target'
        destination.mkdir()
        (destination / 'local-settings').write_text('keep')
        with self.assertRaisesRegex(ValueError, 'already exists'):
            packages.unpack(data, record, destination)
        self.assertEqual((destination / 'local-settings').read_text(), 'keep')

    def test_pack_rejects_runtime_and_symlink(self):
        for bad in ('.local/private.txt', '../escape'):
            with self.subTest(bad=bad):
                self.manifest['files'] = ['SKILL.md', 'INSTALL.md', bad]
                self.write_manifest()
                with self.assertRaises(ValueError):
                    self.build()
        (self.plugin / 'link').symlink_to(self.plugin / 'SKILL.md')
        self.manifest['files'] = ['SKILL.md', 'INSTALL.md', 'link']
        self.write_manifest()
        with self.assertRaisesRegex(ValueError, 'regular file'):
            self.build()

    def test_rejects_traversal_and_symlink_even_with_valid_hash(self):
        for name, mode in [('example/../../escape', stat.S_IFREG), ('example/link', stat.S_IFLNK)]:
            with self.subTest(name=name):
                buffer = io.BytesIO()
                with zipfile.ZipFile(buffer, 'w') as archive:
                    info = zipfile.ZipInfo(name)
                    info.external_attr = (mode | 0o644) << 16
                    archive.writestr(info, 'bad')
                data = buffer.getvalue()
                record = packages.record_for(self.manifest, data)
                with self.assertRaises(ValueError):
                    packages.unpack(data, record, self.root / 'target')
                self.assertFalse((self.root / 'target').exists())

    def test_download_fetches_only_requested_record_and_archive(self):
        data, record = self.build()
        calls = []
        def fetch(url, limit):
            calls.append(url)
            return json.dumps(record).encode() if url.endswith('/catalog/example.json') else data
        with patch.object(packages, 'fetch', side_effect=fetch):
            packages.download('example', self.root / 'target')
        self.assertEqual(len(calls), 2)
        self.assertTrue(calls[0].endswith('/catalog/example.json'))
        self.assertEqual(calls[1], record['url'])

    def test_record_cannot_redirect_to_another_plugin(self):
        _, record = self.build()
        record['url'] = record['url'].replace('/example/v', '/unrelated/v')
        path = self.root / 'record.json'
        path.write_text(json.dumps(record))
        with patch.object(packages, 'fetch') as fetch:
            with self.assertRaises(ValueError):
                packages.download('example', self.root / 'target', path)
            fetch.assert_not_called()


if __name__ == '__main__':
    unittest.main()
