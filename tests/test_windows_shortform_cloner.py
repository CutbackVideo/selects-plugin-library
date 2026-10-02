"""Static Windows checks for the Shortform Cloner panel.

The panel keeps a shell for yt-dlp by design, with a cmd.exe branch on Windows. Reading frames from the
reference shorts goes through the host's bundled ffmpeg (Runtime.runFFmpeg, argv: no console quoting or
code page) before any shell is tried, and the ffmpeg probe also finds a per-machine Windows install.
SHORTFORM_CLONER_PANEL overrides the panel path (to check that an older panel fails).
"""
import json
import os
import re
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGIN = os.path.join(ROOT, "plugins", "shortform-cloner")
PANEL = os.environ.get("SHORTFORM_CLONER_PANEL") or os.path.join(PLUGIN, "panel.tsx")
POSIX = ["$HOME", "command -v", "2>/dev/null", "printf", "mkdir -p", "rm -f", "[ -", "; do", "/opt/homebrew"]


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def function(source, name):
    body = source[source.index("  async function " + name + "("):]
    return body[: body.index("\n  }\n")]


class ShortformClonerWindowsTest(unittest.TestCase):
    def setUp(self):
        self.source = read(PANEL)

    def test_frames_use_the_host_ffmpeg_first(self):
        body = function(self.source, "frames")
        host = body.index("rt.runFFmpeg(argv, true)")
        self.assertLess(host, body.index("await tools()"), "no yt-dlp or ffmpeg lookup before the host call")
        self.assertLess(host, body.index("await shell("))
        self.assertIn('store.join(dir, "s_%02d.png")]', body, "argv needs no %% doubling")
        self.assertIn('"-i", file,', body, "the path goes in as one argument")

    def test_windows_probe_has_no_posix_shell(self):
        body = function(self.source, "findTools")
        win = body[body.index("if (IS_WIN) {"): body.index("} else {")]
        for needle in POSIX:
            self.assertNotIn(needle, win, needle)
        self.assertIn("%ProgramFiles%", win)
        self.assertRegex(win, r"where ffmpeg\.exe")

    def test_manifest(self):
        manifest = json.loads(read(os.path.join(PLUGIN, "plugin.json")))
        self.assertIn("Windows x64", manifest["compatibility"]["platforms"])


if __name__ == "__main__":
    unittest.main()
