"""Black-box checks for short-video last-frame extension."""

import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).with_name("hold_video.py")


def source_video(path):
    result = subprocess.run([
        "ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "lavfi", "-i",
        "testsrc2=size=128x96:rate=30:duration=0.1", "-an", "-c:v", "libx264",
        "-pix_fmt", "yuv420p", str(path),
    ], capture_output=True, text=True, check=False)
    assert result.returncode == 0, result.stderr


def invoke(paths, frames, cache):
    env = {**os.environ, "PHOTO_GALLERY_HOLD_CACHE_DIR": str(cache)}
    result = subprocess.run([sys.executable, str(SCRIPT)],
                            input=json.dumps({"videos": [{"path": str(path)} for path in paths],
                                              "durationFrames": frames}),
                            capture_output=True, text=True, env=env, timeout=120, check=False)
    return result, json.loads(result.stdout)


def raw_frames(path):
    return subprocess.check_output(["ffmpeg", "-nostdin", "-v", "error", "-i", str(path),
                                    "-f", "rawvideo", "-pix_fmt", "rgb24", "-"])


@unittest.skipUnless(shutil.which("ffmpeg") and shutil.which("ffprobe"), "ffmpeg and ffprobe required")
class HoldVideoTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.cache = self.root / "cache"
        self.source = self.root / "short.mp4"
        source_video(self.source)

    def tearDown(self):
        self.temp.cleanup()

    def test_last_frame_is_cloned_to_exact_60fps_output(self):
        result, output = invoke([self.source], 18, self.cache)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(output["status"], "converted")
        item = output["videos"][0]
        probe = subprocess.check_output(["ffprobe", "-v", "error", "-count_frames", "-show_entries",
                                         "stream=width,height,r_frame_rate,nb_read_frames", "-of", "json",
                                         item["outputPath"]])
        stream = json.loads(probe)["streams"][0]
        self.assertEqual((stream["width"], stream["height"], stream["r_frame_rate"], stream["nb_read_frames"]),
                         (128, 96, "60/1", "18"))
        frames = raw_frames(item["outputPath"])
        stride = 128 * 96 * 3
        self.assertEqual(len(frames), 18 * stride)
        self.assertEqual(frames[-stride:], frames[-2 * stride:-stride])
        self.assertNotEqual(frames[:stride], frames[4 * stride:5 * stride])

    def test_identical_requests_reuse_cache_and_corruption_rebuilds(self):
        first, a = invoke([self.source, self.source], 18, self.cache)
        self.assertEqual(first.returncode, 0, first.stderr)
        self.assertEqual(a["videos"][0]["outputPath"], a["videos"][1]["outputPath"])
        path = Path(a["videos"][0]["outputPath"])
        second, b = invoke([self.source], 18, self.cache)
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertTrue(b["videos"][0]["cacheHit"])
        path.write_bytes(b"broken")
        third, c = invoke([self.source], 18, self.cache)
        self.assertEqual(third.returncode, 0, third.stderr)
        self.assertFalse(c["videos"][0]["cacheHit"])
        self.assertGreater(path.stat().st_size, 100)

    def test_missing_or_non_video_source_rejected(self):
        missing, out = invoke([self.root / "missing.mp4"], 18, self.cache)
        self.assertNotEqual(missing.returncode, 0)
        self.assertEqual(out["status"], "error")
        bad = self.root / "bad.mp4"
        bad.write_bytes(b"not video")
        invalid, out = invoke([bad], 18, self.cache)
        self.assertNotEqual(invalid.returncode, 0)
        self.assertEqual(out["status"], "error")


if __name__ == "__main__":
    unittest.main()
