import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('check_public', Path(__file__).resolve().parents[1] / 'tools/check_public.py')
public = importlib.util.module_from_spec(spec)
spec.loader.exec_module(public)


class KoreanPanelTitleTest(unittest.TestCase):
    def test_installed_title_matches_manifest_and_passes_source_checks(self):
        import json
        root = Path(__file__).resolve().parents[1] / 'plugins/shortform-clips'
        title = json.loads((root / 'plugin.json').read_text())['localized']['ko']['name']
        header = (root / 'panel.tsx').read_text().splitlines()[:24]
        self.assertIn('// @name:ko ' + title, header)
        self.assertEqual(public.inspect('plugins/shortform-clips/panel.tsx', '\n'.join(header[:4]).encode()), [])

    def test_exception_is_limited_to_korean_panel_title_headers(self):
        title = '// @name:ko \uc20f\ud3fc \ud074\ub9bd\n'
        self.assertEqual(public.inspect('plugins/another-app/panel.tsx', title.encode()), [])
        for source in ('\n' * 24 + title, title.replace('@name:ko', '@name'),
                       title.replace('@name:ko', '@name:en'), title + 'const text = "\ud55c\uae00";'):
            self.assertIn('non-English Korean text', public.inspect('plugins/example/panel.tsx', source.encode()))
        self.assertIn('non-English Korean text', public.inspect('plugins/example/README.md', title.encode()))

    def test_title_metadata_still_checks_paths_and_credentials(self):
        for value, finding in [('/Users/' + 'example/private', 'personal filesystem path'),
                               ('ghp_' + 'a' * 36, 'access token')]:
            source = ('// @name:ko \uc20f\ud3fc ' + value).encode()
            self.assertIn(finding, public.inspect('plugins/example/panel.tsx', source))


class PreviewAssetTest(unittest.TestCase):
    def test_canonical_media_headers(self):
        self.assertEqual(public.inspect('plugins/example/preview.mp4', b'\x00\x00\x00\x18ftypisom'), [])
        self.assertEqual(public.inspect('plugins/example/poster.webp', b'RIFF0000WEBP'), [])

    def test_a_variants_media_headers(self):
        self.assertEqual(public.inspect('plugins/example/preview-whip-cut.mp4', b'\x00\x00\x00\x18ftypisom'), [])
        self.assertEqual(public.inspect('plugins/example/poster-funny-quotes.webp', b'RIFF0000WEBP'), [])
        self.assertTrue(public.inspect('plugins/example/poster-funny-quotes.webp', b'not an image'))
        for path in ('plugins/example/poster-.webp', 'plugins/example/poster-a.mp4', 'plugins/example/preview-a.webp'):
            self.assertTrue(public.inspect(path, b'RIFF0000WEBP\xff\xfe'))

    def test_arbitrary_binaries_remain_blocked(self):
        for path in ('plugins/example/other.mp4', 'preview.mp4', 'plugins/example/.local/preview.mp4'):
            self.assertTrue(public.inspect(path, b'\x00\x00\x00\x18ftypisom'))

    def test_invalid_or_oversized_media(self):
        self.assertTrue(public.inspect('plugins/example/preview.mp4', b'not a video'))
        self.assertTrue(public.inspect('plugins/example/poster.webp', b'not an image'))
        self.assertTrue(public.inspect('plugins/example/preview.mp4', b'0000ftypisom0' + b'0' * (8 * 1024 * 1024)))
        self.assertTrue(public.inspect('plugins/example/poster.webp', b'RIFF0000WEBP' + b'0' * (512 * 1024)))


class AudioAssetTest(unittest.TestCase):
    def test_real_audio_in_a_plugin_passes(self):
        self.assertEqual(public.inspect('plugins/example/theme.m4a', b'\x00\x00\x00\x20ftypM4A '), [])
        self.assertEqual(public.inspect('plugins/example/sfx/click.wav', b'RIFF\x24\x00\x00\x00WAVEfmt '), [])
        self.assertEqual(public.inspect('plugins/example/sfx/hit.mp3', b'ID3\x04\x00'), [])
        self.assertEqual(public.inspect('plugins/example/sfx/raw.mp3', b'\xff\xfb\x90\x00'), [])

    def test_renamed_or_misplaced_audio_is_blocked(self):
        self.assertTrue(public.inspect('plugins/example/theme.m4a', b'not audio at all'))
        self.assertTrue(public.inspect('plugins/example/click.wav', b'RIFF0000WEBP'))
        self.assertTrue(public.inspect('theme.m4a', b'\x00\x00\x00\x20ftypM4A \xff\xfe\x80'))
        self.assertTrue(public.inspect('plugins/example/.local/theme.m4a', b'\x00\x00\x00\x20ftypM4A '))

    def test_oversized_audio_is_blocked(self):
        self.assertTrue(public.inspect('plugins/example/theme.m4a', b'\x00\x00\x00\x20ftypM4A ' + b'0' * (20 * 1024 * 1024)))

class TemplatePackImagesTest(unittest.TestCase):
    def test_scoped_images_only(self):
        png = b'\x89PNG\r\n\x1a\n' + b'0' * 24
        self.assertEqual(public.inspect('plugins/shortform-clips/template-packs/example/assets/logo.png', png), [])
        for name in ('plugins/shortform-clips/template-packs/example/logo.png', 'plugins/example/assets/logo.png',
                     'plugins/shortform-clips/template-packs/example/assets/../logo.png', 'plugins/shortform-clips/template-packs/example/assets/.local/logo.png'):
            self.assertTrue(public.inspect(name, png), name)
        self.assertTrue(public.inspect('plugins/shortform-clips/template-packs/example/assets/logo.png', b'not an image'))
        self.assertEqual(public.inspect('plugins/other-app/template-packs/customer/assets/logo.png', png), [])

    def test_image_size_boundary_and_formats(self):
        for extension, header in [('png', b'\x89PNG\r\n\x1a\n'), ('jpg', b'\xff\xd8\xff'),
                                  ('jpeg', b'\xff\xd8\xff'), ('webp', b'RIFF0000WEBP')]:
            name = f'plugins/other-app/template-packs/customer/assets/background.{extension}'
            image = header + b'0' * (20 * 1024 * 1024 - len(header))
            self.assertEqual(public.inspect(name, image), [])
            self.assertTrue(public.inspect(name, image + b'0'))
        self.assertTrue(public.inspect('plugins/other-app/template-packs/customer/assets/logo.jpg', b'\x89PNG\r\n\x1a\n' + b'0' * 24))
