import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('check_public', Path(__file__).resolve().parents[1] / 'tools/check_public.py')
public = importlib.util.module_from_spec(spec)
spec.loader.exec_module(public)


class PreviewAssetTest(unittest.TestCase):
    def test_canonical_media_headers(self):
        self.assertEqual(public.inspect('plugins/example/preview.mp4', b'\x00\x00\x00\x18ftypisom'), [])
        self.assertEqual(public.inspect('plugins/example/poster.webp', b'RIFF0000WEBP'), [])

    def test_arbitrary_binaries_remain_blocked(self):
        for path in ('plugins/example/other.mp4', 'preview.mp4', 'plugins/example/.local/preview.mp4'):
            self.assertTrue(public.inspect(path, b'\x00\x00\x00\x18ftypisom'))

    def test_invalid_or_oversized_media(self):
        self.assertTrue(public.inspect('plugins/example/preview.mp4', b'not a video'))
        self.assertTrue(public.inspect('plugins/example/poster.webp', b'not an image'))
        self.assertTrue(public.inspect('plugins/example/preview.mp4', b'0000ftypisom0' + b'0' * (8 * 1024 * 1024)))
        self.assertTrue(public.inspect('plugins/example/poster.webp', b'RIFF0000WEBP' + b'0' * (512 * 1024)))
