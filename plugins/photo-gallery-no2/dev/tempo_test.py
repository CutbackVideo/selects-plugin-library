import json
import math
import os
import pathlib
import struct
import subprocess
import tempfile
import unittest
import wave


ROOT = pathlib.Path(__file__).resolve().parent
REFERENCE = os.environ.get("PHOTO_GALLERY_REFERENCE")


def run_tempo(path):
    proc = subprocess.run(
        ["python3", str(ROOT / "tempo.py"), str(path)],
        capture_output=True, text=True, check=True,
    )
    return json.loads(proc.stdout)


def click_track(path, bpm, seconds=14):
    rate = 11025
    samples = [0] * (rate * seconds)
    period = 60 * rate / bpm
    for beat in range(math.ceil(seconds * bpm / 60)):
        at = round(beat * period)
        for i in range(55):
            if at + i < len(samples):
                samples[at + i] = int(25000 * math.exp(-i / 10))
    with wave.open(str(path), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(rate)
        out.writeframes(struct.pack("<" + "h" * len(samples), *samples))


class TempoTest(unittest.TestCase):
    def test_synthetic_click_tracks(self):
        with tempfile.TemporaryDirectory() as folder:
            for bpm in (80, 110, 140):
                path = pathlib.Path(folder) / f"click-{bpm}.wav"
                click_track(path, bpm)
                result = run_tempo(path)
                self.assertEqual(result["status"], "estimated", result)
                self.assertLessEqual(abs(result["bpm"] - bpm), 2, result)

    def test_silence_is_not_called_a_tempo(self):
        with tempfile.TemporaryDirectory() as folder:
            path = pathlib.Path(folder) / "silence.wav"
            with wave.open(str(path), "wb") as out:
                out.setnchannels(1)
                out.setsampwidth(2)
                out.setframerate(11025)
                out.writeframes(b"\0\0" * (11025 * 8))
            self.assertEqual(run_tempo(path)["status"], "uncertain")

    def test_reference_audio_requires_manual_bpm_when_ambiguous(self):
        if not REFERENCE or not pathlib.Path(REFERENCE).is_file():
            self.skipTest("Provide PHOTO_GALLERY_REFERENCE to test the local reference audio")
        result = run_tempo(REFERENCE)
        self.assertEqual(result["status"], "uncertain", result)


if __name__ == "__main__":
    unittest.main()
