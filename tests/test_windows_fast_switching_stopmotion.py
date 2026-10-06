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


    def test_long_takes_are_scanned_in_windows(self):
        self.assertRegex(self.panel, r"(?m)^const FULL_SCAN_SECONDS = 120;$")
        self.assertRegex(self.panel, r"(?m)^const SCAN_WINDOW_SECONDS = 3;$")
        series = function_body(self.panel, "motionSeries")
        # Input seek: -ss/-t come before -i, so only the window is decoded.
        self.assertIn('const seek = span ? ["-ss", span.start.toFixed(3), "-t", span.seconds.toFixed(3)] : [];', series)
        self.assertIn('ffmpeg([...seek, "-i", path, "-an", "-sn", "-dn", "-vf", graph, "-f", "null", "-"], 60000)', series)
        build = function_body(self.panel, "buildStopMotion")
        self.assertIn("motionSegments(v.path, v.seconds, data)", build)
        self.assertIn("shortlist(segments, v.fps ?? 30, cut, v.seconds)", build)

    @unittest.skipUnless(shutil.which("node"), "node not installed")
    def test_shortlist_matches_the_whole_take_version_and_spans_are_bounded(self):
        consts = "\n".join(re.findall(r"(?m)^const (?:STILL_RATIO|BLUR_YAVG|CANDIDATES|FULL_SCAN_SECONDS|SCAN_WINDOW_SECONDS) = [^\n]*;$", self.panel))
        shortlist = function_body(self.panel, "shortlist")
        shortlist = (shortlist.replace("segments: { offset: number; series: number[] }[], fps: number, cut: number, seconds: number",
                                       "segments, fps, cut, seconds")
                     .replace("const usable: number[]", "const usable").replace("const out: number[]", "const out"))
        spans = function_body(self.panel, "scanSpans").replace(
            "(seconds: number): { start: number; seconds: number }[] | null", "(seconds)")
        script = r"""
const vm = require('node:vm');
const ctx = vm.createContext({});
vm.runInContext(process.argv[1] + '\n' + process.argv[2] + '\n' + process.argv[3] + `
// The whole-take shortlist before long takes were scanned in windows (fast-switching-stopmotion 0.1.0-alpha.5).
function oldShortlist(series, fps, cut, seconds) {
  const len = Math.max(1, Math.round(cut * fps));
  const sorted = [...series].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const usable = [];
  for (let s = 1; s + len <= series.length; s++) {
    const w = series.slice(s, s + len);
    const mean = w.reduce((a, b) => a + b, 0) / len;
    const start = (s - 1) / fps;
    if (Math.max(...w) > BLUR_YAVG || mean < median * STILL_RATIO) continue;
    if (start + cut > seconds - 0.05) continue;
    usable.push(start);
  }
  const out = [];
  for (let i = 0; i < CANDIDATES; i++) {
    const mid = ((i + 0.5) * seconds) / CANDIDATES;
    const best = usable.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a), usable[0]);
    if (best != null && !out.includes(best)) out.push(best);
  }
  return out;
}
globalThis.api = { shortlist, scanSpans, oldShortlist };`, ctx);
let seed = 7;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
let cases = 0;
for (const fps of [24, 25, 30, 60]) for (const seconds of [0.5, 3, 12, 47.3, 119.9]) {
  const n = Math.round(seconds * fps);
  // Still stretches, blur spikes and ordinary motion.
  const series = Array.from({ length: n }, (_, i) => (Math.floor(i / 40) % 3 === 0 ? rnd() * 0.3 : rnd() < 0.05 ? 12 + rnd() * 20 : 1 + rnd() * 8));
  const a = JSON.stringify(ctx.api.shortlist([{ offset: 0, series }], fps, 0.138, seconds));
  const b = JSON.stringify(ctx.api.oldShortlist(series, fps, 0.138, seconds));
  if (a !== b) throw new Error('shortlist changed at fps ' + fps + ', ' + seconds + ' s: ' + a + ' vs ' + b);
  cases++;
}
const spans = ctx.api.scanSpans(1620);
console.log(JSON.stringify({ cases, short: ctx.api.scanSpans(120), unknown: ctx.api.scanSpans(0), spans,
  empty: ctx.api.shortlist([], 30, 0.138, 60), offset: ctx.api.shortlist([{ offset: 400, series: Array(90).fill(4) }], 30, 0.138, 1620) }));
"""
        r = subprocess.run(["node", "-e", script, consts, shortlist, spans], capture_output=True, text=True, timeout=60)
        self.assertEqual(r.returncode, 0, r.stderr)
        out = json.loads(r.stdout)
        self.assertEqual(out["cases"], 20)
        self.assertIsNone(out["short"], "takes up to 120 s are scanned whole")
        self.assertIsNone(out["unknown"])
        self.assertEqual(len(out["spans"]), 6)
        for i, span in enumerate(out["spans"]):
            self.assertEqual(span["seconds"], 3)
            self.assertAlmostEqual(span["start"] + 1.5, (i + 0.5) * 1620 / 6)
        self.assertEqual(out["empty"], [])
        self.assertTrue(out["offset"] and all(400 <= t < 403 for t in out["offset"]), out["offset"])

if __name__ == "__main__":
    unittest.main()
