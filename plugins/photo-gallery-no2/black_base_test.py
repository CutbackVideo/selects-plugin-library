import os
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

from black_base import prepare
from still_video import ConversionError, validate_output


@unittest.skipUnless(shutil.which("ffmpeg") and shutil.which("ffprobe"), "ffmpeg required")
class BlackBaseTest(unittest.TestCase):
    def test_prepares_and_reuses_full_canvas_silent_main_clip(self):
        with tempfile.TemporaryDirectory() as cache, patch.dict(os.environ, {"PHOTO_GALLERY_STILL_CACHE_DIR": cache}):
            first = prepare({"durationFrames": 3})
            self.assertEqual(first["status"], "converted")
            self.assertFalse(first["cacheHit"])
            path = Path(first["outputPath"])
            self.assertTrue(path.is_file())
            video = validate_output(path, 3, (1080, 1920), decode=True)
            self.assertEqual(video["codec_name"], "h264")
            second = prepare({"durationFrames": 3})
            self.assertTrue(second["cacheHit"])
            self.assertEqual(second["outputPath"], first["outputPath"])
            (Path(cache) / "black-base-1080x1920.png").write_bytes(b"broken")
            third = prepare({"durationFrames": 3})
            self.assertTrue(third["cacheHit"])
            self.assertEqual(third["outputPath"], first["outputPath"])

    def test_rejects_invalid_duration_without_writing(self):
        with tempfile.TemporaryDirectory() as cache, patch.dict(os.environ, {"PHOTO_GALLERY_STILL_CACHE_DIR": cache}):
            for value in (0, True, 36001, None):
                with self.assertRaises(ConversionError):
                    prepare({"durationFrames": value})
            self.assertEqual(list(Path(cache).iterdir()), [])


if __name__ == "__main__":
    unittest.main()
