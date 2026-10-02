"""Windows checks for fast-switching-stopmotion: no POSIX shell in the runtime path.

The panel must build on Windows, where sdk.runShell is cmd.exe: ffmpeg goes through the host's Runtime.runFFmpeg
(argv), files through FileSystem, and the install folder through av-host's hostRoots. FSS_PANEL may point at another
copy of panel.tsx (e.g. `git show origin/main:plugins/fast-switching-stopmotion/panel.tsx`) to see these fail.
"""
import json
import os
import re
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / "plugins" / "fast-switching-stopmotion"
PANEL = Path(os.environ.get("FSS_PANEL") or PLUGIN / "panel.tsx")
REFERENCE = ROOT / "plugins" / "archive-vlog" / "panel.tsx"

AV_START, AV_END = "// av-host:start", "// av-host:end"
FORBIDDEN = [
    "mkdir -p", "printf", "$HOME", "$SELECTS_USER", "rm -f", "base64 ", "| base64", "shasum", "command -v",
    "export PATH", 'cat "', "2>/dev/null", "/Applications/", "/usr/bin/", 'sh "', "sh '",
]


def av_block(text):
    if AV_START not in text or AV_END not in text:
        return None
    return text[text.index(AV_START):text.index(AV_END) + len(AV_END)]


def without_regions(text, start, end):
    return re.sub(re.escape(start) + r".*?" + re.escape(end), "", text, flags=re.S)


def without_comments(text):
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    return re.sub(r"(^|\s)//[^\n]*", r"\1", text)


def function_body(text, name):
    # From the declaration to the next top-level function, export or UPPER_CASE constant (the embedded run_script
    # sources only declare lower-case names at column 0).
    at = re.search(r"(?m)^(?:export default )?(?:async )?function " + re.escape(name) + r"\b", text)
    if not at:
        raise AssertionError("no function " + name)
    end = re.compile(r"\n(?:(?:async )?function |export |const [A-Z_]+ = )").search(text, at.end())
    return text[at.start():end.start() if end else len(text)]


class FastSwitchingStopMotionWindowsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.panel = PANEL.read_text(encoding="utf-8")
        cls.runtime = without_regions(cls.panel, "// mac-only:start", "// mac-only:end")

    def test_av_host_block_is_byte_identical_to_archive_vlog(self):
        ours = av_block(self.panel)
        self.assertIsNotNone(ours, "panel has no av-host block")
        self.assertEqual(ours, av_block(REFERENCE.read_text(encoding="utf-8")))

    def test_runtime_has_no_posix_shell(self):
        code = without_comments(without_regions(self.runtime, AV_START, AV_END))
        for token in FORBIDDEN:
            self.assertNotIn(token, code, token)
        self.assertNotRegex(code, r"""runShell\([^)]*\b(node|python3?)\s""", "node/python spawn")
        self.assertNotRegex(code, r"""replace\(/'/g""", "POSIX single-quote helper")
        self.assertNotRegex(code, r"""\|\s*(grep|cut|tr|wc)\b""", "shell pipeline")

    def test_no_shell_call(self):
        # The av-host block makes no shell call, and neither does the rest of the panel.
        self.assertEqual(self.runtime.count("runShell("), 0)

    def test_ffmpeg_goes_through_the_host(self):
        for name in ("motionSeries", "contactSheet"):
            body = function_body(self.panel, name)
            self.assertIn("ffmpeg([", body.replace("ffmpeg([...", "ffmpeg(["), name)
        self.assertIn('hostNeed("Runtime", "runFFmpeg")', function_body(self.panel, "ffmpeg"))
        self.assertIn("hostReadText(", function_body(self.panel, "motionSeries"))
        self.assertIn("hostRemove(", function_body(self.panel, "motionSeries"))
        self.assertIn("hostReadBytes(", function_body(self.panel, "contactSheet"))
        self.assertIn("hostRemove(", function_body(self.panel, "contactSheet"))

    def test_build_checks_host_before_any_mutation(self):
        body = function_body(self.panel, "buildStopMotion")
        first_mutation = body.index("createDraft")
        for guard in ('hostNeed("Runtime", "runFFmpeg")', 'hostNeed("FileSystem", "readFile")', "hostRoots(sdk, PLUGIN_ID"):
            self.assertIn(guard, body)
            self.assertLess(body.index(guard), body.index("onStep(0)"), guard)
            self.assertLess(body.index(guard), first_mutation, guard)
        self.assertIn("hostJoin(plugin", body)
        # The template entry and the panel button both build through buildStopMotion and show one
        # "needs a newer Selects" message on a missing host member.
        self.assertIn("buildStopMotion(sdk", function_body(self.panel, "TemplateRun"))
        self.assertIn("buildStopMotion(sdk", function_body(self.panel, "StopMotionPanel"))
        self.assertEqual(self.panel.count('e?.code === "host-missing"'), 2)
        self.assertEqual(self.panel.count("needsNewer:"), 10)

    def test_music_dedup_compares_normalised_paths(self):
        body = function_body(self.panel, "buildStopMotion")
        self.assertIn('normalize("NFC")', body)
        self.assertIn("toLowerCase()", body)
        self.assertIn("hostIsWindows()", body)
        self.assertNotIn("files[musicPath]", body)

    def test_template_header_kept(self):
        self.assertIn("// @collection visual-highlights", "\n".join(self.panel.splitlines()[:24]))

    def test_manifest_and_install(self):
        manifest = json.loads((PLUGIN / "plugin.json").read_text(encoding="utf-8"))
        self.assertIn("Windows x64", manifest["compatibility"]["platforms"])
        self.assertNotIn("app shell", manifest["compatibility"]["selects"])
        install = (PLUGIN / "INSTALL.md").read_text(encoding="utf-8")
        self.assertNotIn("Make sure `ffmpeg`", install)
        self.assertNotIn("brew", install.lower())

    @unittest.skipUnless(shutil.which("node"), "node not installed")
    def test_motion_parsing_and_filter_path_in_vm(self):
        # The pure helpers, with their TypeScript annotations stripped, run in a fresh node:vm context.
        parse = re.search(r"function parseYavg\(text: string\): number\[\] \{.*?\n\}", self.panel, re.S)
        esc = re.search(r"const filterPath = \(p: string\) => [^\n]*;", self.panel)
        self.assertIsNotNone(parse, "parseYavg missing")
        self.assertIsNotNone(esc, "filterPath missing")
        code = (parse.group(0).replace("(text: string): number[]", "(text)") + "\n"
                + esc.group(0).replace("(p: string)", "(p)"))
        sample = ("frame:0    pts:512     pts_time:0.0416667\nlavfi.signalstats.YAVG=2.76343\n"
                  "frame:1    pts:1024    pts_time:0.0833333\r\nlavfi.signalstats.YAVG=12\r\n"
                  "frame:2    pts:1536    pts_time:0.125\nlavfi.signalstats.YAVG=0.5\n")
        script = """
const vm = require('node:vm');
const ctx = vm.createContext({});
vm.runInContext(process.argv[1] + '; globalThis.parseYavg = parseYavg; globalThis.filterPath = filterPath;', ctx);
const out = {
  values: Array.from(ctx.parseYavg(process.argv[2])),
  empty: Array.from(ctx.parseYavg('')),
  win: ctx.filterPath('C:\\\\Users\\\\\ud64d\uae38\ub3d9\\\\.selects\\\\plugin-data\\\\x\\\\motion-1.txt'),
  odd: ctx.filterPath("a:b'c[d],e;f"),
};
console.log(JSON.stringify(out));
"""
        r = subprocess.run(["node", "-e", script, code, sample], capture_output=True, text=True, timeout=30)
        self.assertEqual(r.returncode, 0, r.stderr)
        out = json.loads(r.stdout)
        self.assertEqual(out["values"], [2.76343, 12, 0.5])
        self.assertEqual(out["empty"], [])
        self.assertEqual(out["win"], "C\\\\:\\\\\\\\Users\\\\\\\\\ud64d\uae38\ub3d9\\\\\\\\.selects\\\\\\\\plugin-data\\\\\\\\x\\\\\\\\motion-1.txt")
        self.assertEqual(out["odd"], "a\\\\:b\\\\\\'c\\[d\\]\\,e\\;f")


if __name__ == "__main__":
    unittest.main()
