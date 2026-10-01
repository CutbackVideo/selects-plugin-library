import importlib.util
import json
from pathlib import Path
import struct
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('check_templates', Path(__file__).resolve().parents[1] / 'tools/check_templates.py')
templates = importlib.util.module_from_spec(spec)
spec.loader.exec_module(templates)


def mp4(seconds, scale=1000):
    mvhd = struct.pack('>B3xIII', 0, 0, 0, scale) + struct.pack('>I', int(seconds * scale))
    mvhd_box = struct.pack('>I4s', 8 + len(mvhd), b'mvhd') + mvhd
    moov = struct.pack('>I4s', 8 + len(mvhd_box), b'moov') + mvhd_box
    return struct.pack('>I4s', 16, b'ftyp') + b'isom\x00\x00\x02\x00' + moov


GOOD = {
    'schemaVersion': 1, 'id': 'demo', 'version': '0.1.0', 'name': 'Demo', 'summary': 'A demo.',
    'collection': 'visual-highlights', 'usesCredits': False, 'prepare': ['Two clips'],
    'preview': {'video': 'preview.mp4', 'poster': 'poster.webp', 'width': 540, 'height': 960},
}


class TemplateCheckTest(unittest.TestCase):
    def plugin(self, manifest=GOOD, header=True, files=('preview.mp4', 'poster.webp'), seconds=3):
        folder = Path(tempfile.mkdtemp()) / 'demo'
        folder.mkdir()
        (folder / 'plugin.json').write_text(json.dumps(manifest))
        (folder / 'panel.tsx').write_text(('// @name Demo\n// @collection visual-highlights\n' if header else '// @name Demo\n') + 'export default 1;\n')
        if 'preview.mp4' in files:
            (folder / 'preview.mp4').write_bytes(mp4(seconds))
        if 'poster.webp' in files:
            (folder / 'poster.webp').write_bytes(b'RIFF0000WEBP')
        return folder

    def test_a_complete_template_passes(self):
        self.assertEqual(templates.check_plugin(self.plugin()), ([], []))

    def test_a_plain_plugin_is_not_checked(self):
        manifest = {k: v for k, v in GOOD.items() if k != 'collection'}
        self.assertIsNone(templates.check_plugin(self.plugin(manifest, header=False)))

    def test_the_tag_must_be_in_both_places(self):
        errors, _ = templates.check_plugin(self.plugin(header=False))
        self.assertTrue(any('panel.tsx' in e for e in errors))
        manifest = {k: v for k, v in GOOD.items() if k != 'collection'}
        errors, _ = templates.check_plugin(self.plugin(manifest))
        self.assertTrue(any('plugin.json' in e for e in errors))

    def test_thumbnail_demo_prepare_and_credits_are_required(self):
        manifest = {k: v for k, v in GOOD.items() if k not in ('prepare', 'usesCredits', 'preview')}
        errors, _ = templates.check_plugin(self.plugin(manifest, files=()))
        for word in ('thumbnail', 'demo', 'prepare', 'usesCredits', 'preview.width'):
            self.assertTrue(any(word in e for e in errors), word)

    def test_prepare_is_one_to_four_short_lines(self):
        for prepare in ([], [''], ['x'] * 5, ['x' * 121]):
            errors, _ = templates.check_plugin(self.plugin({**GOOD, 'prepare': prepare}))
            self.assertTrue(any('prepare' in e for e in errors), prepare)

    def test_a_long_demo_is_a_warning(self):
        self.assertEqual(templates.check_plugin(self.plugin(seconds=12)), ([], ['demo is 12.0 s; it should be about 3 s']))

    def test_reads_the_movie_length(self):
        self.assertAlmostEqual(templates.mp4_seconds(mp4(3.2, 600)), 3.2, places=2)
        self.assertIsNone(templates.mp4_seconds(b'not a movie'))
