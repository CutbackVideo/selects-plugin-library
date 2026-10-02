"""Static Windows checks for Epidemic Sound Search.

Every host step has a POSIX command for macOS and a PowerShell script for Windows (HOST.* pairs
`IS_WIN ? winCmd(...)`), so no POSIX syntax reaches cmd.exe. Waveforms for files on disk are drawn
with the app's bundled ffmpeg (Runtime.runFFmpeg argv) before any shell fallback, so Windows needs
no user ffmpeg and macOS no python3; the JS reduction matches PCM_WAVE.
"""
import json
import os
import re
import shutil
import subprocess
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGIN = os.path.join(ROOT, "plugins", "epidemic-sound-search")
PANEL = os.path.join(PLUGIN, "panel.tsx")


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def block(source, head, end="\n};\n"):
    start = source.index(head)
    return source[start: source.index(end, start) + len(end)]


class EpidemicSoundSearchWindowsTest(unittest.TestCase):
    def setUp(self):
        self.source = read(PANEL)

    def test_every_host_command_has_a_windows_branch(self):
        host = block(self.source, "const HOST = {")
        parts = re.split(r"\n  (\w+): \(", host)[1:]
        entries = dict(zip(parts[0::2], parts[1::2]))
        self.assertGreaterEqual(len(entries), 10)
        for name, code in entries.items():
            self.assertRegex(code, r"^[^\n]*=>\s*\(?\s*IS_WIN\s*\?\s*winCmd\(", name)

    def test_every_shell_call_uses_a_host_command(self):
        for m in re.finditer(r"sdk\.runShell\(\{", self.source):
            call = self.source[m.start(): self.source.index("})", m.start())]
            self.assertRegex(call, r"command(: HOST\.\w+\(|,|\n)", call[:120])

    def test_local_waveform_uses_the_bundled_ffmpeg_first(self):
        helper = block(self.source, "const hostLocalPeaks = async (")
        self.assertIn('typeof rt?.runFFmpeg !== "function"', helper)
        self.assertIn('["-v", "error", "-y", "-i", path, "-ac", "1", "-ar", "2000", "-f", "s16le", tmp]', helper)
        self.assertIn("new Uint8Array(await fs.readFile(tmp))", helper)
        self.assertNotIn("instanceof", helper)
        loader = block(self.source, "const loadWave = async (", "\n  };\n")
        self.assertLess(loader.index("hostLocalPeaks(localPath)"), loader.index("HOST.localWaveform(localPath)"))

    @unittest.skipUnless(shutil.which("node") and shutil.which("python3"), "node or python3 missing")
    def test_js_reduction_matches_pcm_wave(self):
        fn = block(self.source, "const reducePcmPeaks = (")
        fn = fn.replace("(pcm: Int16Array): number[] =>", "(pcm) =>").replace("const out: number[] = []", "const out = []")
        samples = [int(3000 * ((i * 7919) % 97 - 48) / 48 * (1 + (i // 500) % 5)) for i in range(20011)]
        js = subprocess.run(
            ["node", "-e", fn + "console.log(JSON.stringify(reducePcmPeaks(Int16Array.from(" + json.dumps(samples) + "))))"],
            capture_output=True, text=True, check=True).stdout
        pcm_wave = subprocess.run(
            ["node", "-e", block(self.source, "const PCM_WAVE = [", '].join("\\n");\n') + "process.stdout.write(PCM_WAVE)"],
            capture_output=True, text=True, check=True).stdout
        raw = b"".join(int(v).to_bytes(2, "little", signed=True) for v in samples)
        py = subprocess.run(["python3", "-c", pcm_wave], input=raw, capture_output=True, check=True).stdout
        self.assertEqual(len(json.loads(js)), 160)
        for a, b in zip(json.loads(js), json.loads(py)):
            self.assertAlmostEqual(a, b, places=3)

    def test_manifest_and_docs(self):
        manifest = json.loads(read(os.path.join(PLUGIN, "plugin.json")))
        self.assertIn("Windows", manifest["compatibility"]["platforms"])
        for doc in ("INSTALL.md", "README.md"):
            text = read(os.path.join(PLUGIN, doc)).lower()
            self.assertNotIn("brew ", text, doc)
            self.assertNotIn("nvm", text, doc)


if __name__ == "__main__":
    unittest.main()
