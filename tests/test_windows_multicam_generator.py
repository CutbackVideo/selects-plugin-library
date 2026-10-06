"""Static Windows checks for the Multicam Generator panel.

Windows runs sdk.runShell in cmd.exe and Selects bundles no Python, and the host's ffmpeg build may
lack `-pattern_type glob`. The panel uses only the host FileSystem and Runtime.runFFmpeg/runFFprobe:
the inspection sheet reads a numbered image sequence and the diagnostic log is written without a shell.
MULTICAM_GENERATOR_PANEL overrides the panel path (to check that an older panel fails).
"""
import json
import os
import re
import shutil
import subprocess
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
        self.assertIn("sdk.files", body)
        self.assertIn('fs.join(fs.homedir(), ".selects", "logs")', body)
        self.assertIn("fs.writeFile(", body)
        self.assertNotIn("instanceof", body, "host bytes come from another realm")

    def test_manifest_and_docs(self):
        manifest = json.loads(read(os.path.join(PLUGIN, "plugin.json")))
        self.assertIn("Windows x64", manifest["compatibility"]["platforms"])
        for doc in ("INSTALL.md", "README.md"):
            self.assertNotIn("Python", read(os.path.join(PLUGIN, doc)), doc)


    def test_source_start_is_read_from_either_clip_model(self):
        source = read(PANEL)
        code = runtime_text(source)
        # Selects 2.0.53x removed Clip.getStartTime(); only the feature-detecting helper may call it.
        self.assertEqual(code.count(".getStartTime("), 1)
        helper = code[code.index("export function clipSourceStartFrames(c) {"):]
        helper = helper[: helper.index("\n}\n") + 2]
        self.assertIn('typeof c?.getStartTime === "function"', helper)
        self.assertIn("const t = (clipSourceStartFrames(c) + a - cp.resolvedOffset) / fps;", code)

    @unittest.skipUnless(shutil.which("node"), "node not installed")
    def test_source_start_frames_in_vm(self):
        code = runtime_text(read(PANEL))
        helper = code[code.index("export function clipSourceStartFrames(c) {"):]
        helper = helper[: helper.index("\n}\n") + 2].replace("export function", "function", 1)
        # Ticks per frame probed on Windows Staging 2.0.536 at 23.976 fps.
        script = r"""
const vm = require('node:vm');
const ctx = vm.createContext({});
vm.runInContext(process.argv[1] + '\nglobalThis.f = clipSourceStartFrames;', ctx);
const tb = { getTicksPerFrame: () => 29429400 };
let missing = '';
try { ctx.f({ getSourceStartTick: () => 0 }); } catch (e) { missing = e.message; }
console.log(JSON.stringify({
  legacy: ctx.f({ getStartTime: () => 48, getSourceStartTick: () => 1 }),
  zero: ctx.f({ getSourceStartTick: () => 0, getOwnerTimebase: () => tb }),
  ticks: ctx.f({ getSourceStartTick: () => 29429400 * 120, getOwnerTimebase: () => tb }),
  big: ctx.f({ getSourceStartTick: () => 29429400n * 7n, getOwnerTimebase: () => tb }),
  missing,
}));
"""
        r = subprocess.run(["node", "-e", script, helper], capture_output=True, text=True, timeout=30)
        self.assertEqual(r.returncode, 0, r.stderr)
        out = json.loads(r.stdout)
        self.assertEqual([out["legacy"], out["zero"], out["ticks"], out["big"]], [48, 0, 120, 7])
        self.assertIn("Update the plugin", out["missing"])

if __name__ == "__main__":
    unittest.main()
