"""Static Windows checks for the Multicam Generator panel.

Windows runs sdk.runShell in cmd.exe and Selects bundles no Python, and the host's ffmpeg build may
lack `-pattern_type glob`. The panel uses only the host FileSystem and Runtime.runFFmpeg/runFFprobe:
the inspection sheet reads a numbered image sequence and the diagnostic log is written without a shell.
MULTICAM_GENERATOR_PANEL overrides the panel path (to check that an older panel fails).
"""
import json
import os
import re
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGIN = os.path.join(ROOT, "plugins", "multicam-generator")
PANEL = os.environ.get("MULTICAM_GENERATOR_PANEL") or os.path.join(PLUGIN, "panel.tsx")

FORBIDDEN = [
    "mkdir -p", "printf", "$HOME", "$SELECTS_USER", "rm -f", "base64 ", "| base64", "shasum",
    "command -v", "export PATH", 'cat "', "2>/dev/null", "<<'", "pattern_type", "insp*.jpg",
]


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def runtime_text(source):
    """The panel without whole-line comments."""
    return "\n".join(line for line in source.split("\n") if not line.lstrip().startswith("//"))


class MulticamGeneratorWindowsTest(unittest.TestCase):
    def setUp(self):
        self.runtime = runtime_text(read(PANEL))

    def test_no_posix_shell_python_or_glob_at_runtime(self):
        for needle in FORBIDDEN:
            self.assertNotIn(needle, self.runtime, needle)
        self.assertIsNone(re.search(r"\bpython3?\b", self.runtime), "python spawn")
        self.assertIsNone(re.search(r"\bnode\s+[\"'$]", self.runtime), "node spawn")
        self.assertEqual(self.runtime.count("runShell("), 0)

    def test_inspection_sheet_reads_a_numbered_sequence(self):
        body = self.runtime[self.runtime.index("export async function buildInspectionSheet("):]
        body = body[: body.index("\n}\n")]
        self.assertIn('"insp" + i + ".jpg"', body)
        self.assertIn('"-start_number","0","-i", fs.join(dir, "insp%d.jpg")', body)

    def test_diagnostic_log_uses_the_host_file_service(self):
        body = self.runtime[self.runtime.index("export async function writeLocalDiagnostic("):]
        body = body[: body.index("\n}\n")]
        self.assertIn("__DI__?.FileSystem", body)
        self.assertIn('fs.join(fs.homedir(), ".selects", "logs")', body)
        self.assertIn("fs.writeFile(", body)
        self.assertNotIn("instanceof", body, "host bytes come from another realm")

    def test_manifest_and_docs(self):
        manifest = json.loads(read(os.path.join(PLUGIN, "plugin.json")))
        self.assertIn("Windows x64", manifest["compatibility"]["platforms"])
        for doc in ("INSTALL.md", "README.md"):
            self.assertNotIn("Python", read(os.path.join(PLUGIN, doc)), doc)


if __name__ == "__main__":
    unittest.main()
