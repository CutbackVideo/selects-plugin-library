"""Black-box tests for the plugin-local still-to-video JSON contract."""

import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).with_name("still_video.py")


def ppm(path, width, height):
    pixels = bytearray()
    for y in range(height):
        for x in range(width):
            pixels.extend((x * 37 % 256, y * 53 % 256, (x + y) * 29 % 256))
    path.write_bytes(f"P6\n{width} {height}\n255\n".encode() + pixels)


def invoke(images, frames, cache):
    env = {**os.environ, "PHOTO_GALLERY_STILL_CACHE_DIR": str(cache)}
    result = subprocess.run([sys.executable, str(SCRIPT)], input=json.dumps({"images": images, "durationFrames": frames}),
                            text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env, check=False, timeout=120)
    return result, json.loads(result.stdout)


def video_stream(path):
    result = subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-show_entries",
                             "stream=codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate,nb_read_frames",
                             "-of", "json", str(path)], text=True, capture_output=True, check=True)
    streams = json.loads(result.stdout)["streams"]
    assert len(streams) == 1
    return streams[0]


@unittest.skipUnless(shutil.which("ffmpeg") and shutil.which("ffprobe"), "ffmpeg and ffprobe required")
class StillVideoTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.cache = self.root / "cache"

    def tearDown(self):
        self.temp.cleanup()

    def test_duplicates_use_one_content_addressed_output(self):
        source = self.root / "portrait source.ppm"
        duplicate = self.root / "copy.ppm"
        ppm(source, 4, 6)
        duplicate.write_bytes(source.read_bytes())
        result, output = invoke([{"path": str(source)}, {"path": str(source)}, {"path": str(duplicate)}], 12, self.cache)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(output["status"], "converted")
        self.assertEqual(len(output["images"]), 3)
        self.assertEqual(len({item["outputPath"] for item in output["images"]}), 1)
        self.assertEqual(len(list(self.cache.glob("*.mp4"))), 1)
        self.assertEqual([item["inputIndex"] for item in output["images"]], [0, 1, 2])

    def test_landscape_portrait_and_square_have_exact_60fps_frame_count(self):
        sizes = [(6, 4), (4, 6), (5, 5)]
        images = []
        for index, (width, height) in enumerate(sizes):
            path = self.root / f"shape-{index}.ppm"
            ppm(path, width, height)
            images.append({"path": str(path)})
        result, output = invoke(images, 17, self.cache)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(output["durationFrames"], 17)
        self.assertEqual(output["fps"], 60)
        for index, item in enumerate(output["images"]):
            stream = video_stream(item["outputPath"])
            self.assertEqual(stream["codec_name"], "h264")
            self.assertEqual(stream["r_frame_rate"], "60/1")
            self.assertEqual(stream["avg_frame_rate"], "60/1")
            self.assertEqual(stream["nb_read_frames"], "17")
            self.assertEqual((item["sourceWidth"], item["sourceHeight"]), sizes[index])
            expected = (sizes[index][0] + sizes[index][0] % 2, sizes[index][1] + sizes[index][1] % 2)
            self.assertEqual((item["outputWidth"], item["outputHeight"]), expected)
            self.assertEqual((stream["width"], stream["height"]), expected)

    def test_second_request_reuses_cache_and_corruption_is_rebuilt(self):
        source = self.root / "photo.ppm"
        ppm(source, 6, 4)
        first, a = invoke([{"path": str(source)}], 12, self.cache)
        self.assertEqual(first.returncode, 0, first.stderr)
        path = Path(a["images"][0]["outputPath"])
        original = path.read_bytes()
        mtime = path.stat().st_mtime_ns
        second, b = invoke([{"path": str(source)}], 12, self.cache)
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertTrue(b["images"][0]["cacheHit"])
        self.assertEqual(path.stat().st_mtime_ns, mtime)
        path.write_bytes(b"broken MP4")
        third, c = invoke([{"path": str(source)}], 12, self.cache)
        self.assertEqual(third.returncode, 0, third.stderr)
        self.assertFalse(c["images"][0]["cacheHit"])
        self.assertEqual(c["images"][0]["outputPath"], str(path))
        self.assertEqual(path.read_bytes(), original)
        self.assertEqual(video_stream(path)["nb_read_frames"], "12")
        self.assertFalse(list(self.cache.glob("*.tmp")))

    def test_large_image_is_downscaled_without_aspect_stretching(self):
        source = self.root / "large-wide.ppm"
        ppm(source, 1931, 401)
        result, output = invoke([{"path": str(source)}], 3, self.cache)
        self.assertEqual(result.returncode, 0, result.stderr)
        item = output["images"][0]
        self.assertEqual((item["outputWidth"], item["outputHeight"]), (1920, 400))
        self.assertLessEqual(abs(item["outputWidth"] / item["outputHeight"] - 1931 / 401), 0.02)
        self.assertEqual(video_stream(item["outputPath"])["nb_read_frames"], "3")

    def test_parallel_requests_share_one_atomic_cache_entry(self):
        source = self.root / "parallel.ppm"
        ppm(source, 5, 5)
        env = {**os.environ, "PHOTO_GALLERY_STILL_CACHE_DIR": str(self.cache)}
        request = json.dumps({"images": [{"path": str(source)}], "durationFrames": 12})
        jobs = [subprocess.Popen([sys.executable, str(SCRIPT)], stdin=subprocess.PIPE,
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env) for _ in range(2)]
        outputs = [job.communicate(request, timeout=120) for job in jobs]
        self.assertTrue(all(job.returncode == 0 for job in jobs), outputs)
        paths = [json.loads(stdout)["images"][0]["outputPath"] for stdout, _ in outputs]
        self.assertEqual(paths[0], paths[1])
        self.assertEqual(len(list(self.cache.glob("*.mp4"))), 1)
        self.assertEqual(video_stream(paths[0])["nb_read_frames"], "12")
        self.assertFalse(list(self.cache.glob("*.tmp")))

    def test_missing_corrupt_and_invalid_requests_fail_cleanly(self):
        missing, missing_output = invoke([{"path": str(self.root / "missing.ppm")}], 12, self.cache)
        self.assertNotEqual(missing.returncode, 0)
        self.assertEqual(missing_output["status"], "error")
        invalid = self.root / "bad.ppm"
        invalid.write_bytes(b"not an image")
        broken, broken_output = invoke([{"path": str(invalid)}], 12, self.cache)
        self.assertNotEqual(broken.returncode, 0)
        self.assertEqual(broken_output["status"], "error")
        too_many, too_many_output = invoke([{"path": str(invalid)}] * 22, 12, self.cache)
        self.assertNotEqual(too_many.returncode, 0)
        self.assertEqual(too_many_output["status"], "error")
        zero, zero_output = invoke([{"path": str(invalid)}], 0, self.cache)
        self.assertNotEqual(zero.returncode, 0)
        self.assertEqual(zero_output["status"], "error")
        self.assertFalse(list(self.cache.glob("*.mp4")))


if __name__ == "__main__":
    unittest.main()
