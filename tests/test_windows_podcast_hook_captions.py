"""Static Windows checks for Podcast Hook Captions.

The panel runs everything through the host (__DI__ runFFmpeg/runFFprobe argv and FileSystem), so it
has no shell call at all. Bytes the host returns come from window.parent, another JS realm, where
`instanceof ArrayBuffer` is false: toBytes must still accept a bare host ArrayBuffer.
"""
import json
import os
import re
import shutil
import subprocess
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGIN = os.path.join(ROOT, "plugins", "podcast-hook-captions")
PANEL = os.path.join(PLUGIN, "panel.tsx")
SOURCE = os.path.join(PLUGIN, "src", "pipeline", "faceFrames.ts")

FORBIDDEN = [
    "runShell", "mkdir -p", "printf", "$HOME", "$SELECTS_USER", "rm -f", "| base64", "shasum",
    "command -v", "export PATH", 'cat "', "2>/dev/null", "/Applications/", "/usr/bin/", "osascript",
]
CROSS_REALM = 'Object.prototype.toString.call(v) === "[object ArrayBuffer]"'


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def to_bytes(source):
    start = source.index("function toBytes(")
    return source[start: source.index("\n}\n", start) + 2]


class PodcastHookCaptionsWindowsTest(unittest.TestCase):
    def test_no_posix_shell_at_runtime(self):
        for path in [PANEL] + [os.path.join(d, f) for d, _, fs in os.walk(os.path.join(PLUGIN, "src"))
                               for f in fs if f.endswith((".ts", ".tsx")) and f != "renderers.ts"]:
            text = read(path)
            for needle in FORBIDDEN:
                self.assertNotIn(needle, text, f"{os.path.relpath(path, ROOT)}: {needle}")
            self.assertIsNone(re.search(r"\b(node|python3?)\s+[\"'$]", text), path)

    def test_to_bytes_accepts_host_array_buffers_in_source_and_build(self):
        self.assertIn(CROSS_REALM, to_bytes(read(SOURCE)))
        self.assertIn(CROSS_REALM, to_bytes(read(PANEL)), "panel.tsx not rebuilt from src/")
        self.assertNotIn("instanceof ArrayBuffer", to_bytes(read(PANEL)))

    @unittest.skipUnless(shutil.which("node"), "node not installed")
    def test_to_bytes_with_values_from_another_realm(self):
        fn = to_bytes(read(PANEL))
        script = (
            "const vm=require('vm');" + fn +
            "const o=vm.runInNewContext('({ab:new Uint8Array([1,2,3]).buffer,u8:new Uint8Array([4,5]),"
            "view:new DataView(new Uint8Array([6,7,8]).buffer,1,2)})');"
            "console.log(JSON.stringify([o.ab,o.u8,o.view].map(v=>Array.from(toBytes(v)))));"
        )
        out = subprocess.run(["node", "-e", script], capture_output=True, text=True, check=True).stdout
        self.assertEqual(json.loads(out), [[1, 2, 3], [4, 5], [7, 8]])

    def test_manifest_declares_windows(self):
        manifest = json.loads(read(os.path.join(PLUGIN, "plugin.json")))
        self.assertIn("Windows x64", manifest["compatibility"]["platforms"])
        for doc in ("INSTALL.md", "README.md"):
            text = read(os.path.join(PLUGIN, doc)).lower()
            self.assertNotIn("brew ", text, doc)
            self.assertNotIn("nvm", text, doc)


if __name__ == "__main__":
    unittest.main()
