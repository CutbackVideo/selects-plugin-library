"""Static Windows checks for the Thank You Recap panel.

The panel must build its Draft on Windows and macOS with no shell: the install and data folders,
the music staging and the year-face read go through the host FileSystem (av-host block) and run
before the Draft is created, the hero contact sheet uses the host's bundled ffmpeg, and the
imported music is matched by a normalised path.
THANK_YOU_RECAP_PANEL overrides the panel path (to check that an older panel fails).
"""
import json
import os
import re
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGIN = os.path.join(ROOT, "plugins", "thank-you-recap")
PANEL = os.environ.get("THANK_YOU_RECAP_PANEL") or os.path.join(PLUGIN, "panel.tsx")

AV_HOST = re.compile(r"// av-host:start\n.*?// av-host:end\n?", re.S)

FORBIDDEN = [
    "mkdir -p", "printf", "$HOME", "$SELECTS_USER", "rm -f", "base64 ", "| base64", "shasum", "cksum",
    "xxd", "command -v", "export PATH", 'cat "', "2>/dev/null", "| tr", "wc -c", "tail -c", "head -c",
    "[ -f", "shq(",
]
LANGS = ["en", "ko", "ja", "zh", "de", "es", "fr", "it", "pt", "tr"]


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def runtime_text(source):
    """The panel without the av-host block and whole-line comments."""
    text = AV_HOST.sub("", source)
    return "\n".join(line for line in text.split("\n") if not line.lstrip().startswith("//"))


def function_body(text, header):
    body = text[text.index(header):]
    return body[: body.index("\n}\n")]


class ThankYouRecapWindowsTest(unittest.TestCase):
    def setUp(self):
        self.source = read(PANEL)
        self.runtime = runtime_text(self.source)

    def test_av_host_block_present_below_the_header(self):
        block = AV_HOST.search(self.source)
        self.assertIsNotNone(block, "panel has no av-host block")
        for name in ("hostRoots", "hostReadBytes", "hostReadText", "hostJoin", "hostRemove", "hostNeed"):
            self.assertIn("function " + name + "(", block.group(0), name)
        head = self.source.split("\n")[:24]
        self.assertIn("// @collection visual-highlights", head)
        self.assertGreater(self.source[: block.start()].count("\n"), 24)

    def test_no_posix_shell_or_node_at_runtime(self):
        for needle in FORBIDDEN:
            self.assertNotIn(needle, self.runtime, needle)
        self.assertIsNone(re.search(r"\bnode\s+[\"'$]", self.runtime), "node spawn")
        self.assertIsNone(re.search(r"\bpython3?\b", self.runtime), "python spawn")
        self.assertEqual(self.source.count("runShell("), 0)

    def test_assets_are_staged_through_the_host_before_the_draft(self):
        stage = function_body(self.runtime, "async function stageAssets(")
        for part in ("hostRoots(sdk, PLUGIN_ID, YEAR_FONTS_FILE)", "hostReadBytes(", 'digest("SHA-256"',
                     "writeFile(", "rename(", "hostReadText(", "JSON.parse("):
            self.assertIn(part, stage, part)
        build = self.runtime[self.runtime.index("async function buildRecap("): self.runtime.index("const TEMPLATE_FAILED")]
        self.assertLess(build.index("stageAssets(sdk)"), build.index("createDraft("), "assets before the Draft")
        self.assertLess(build.index("stageAssets(sdk)"), build.index("onStep(1)"))

    def test_unanalysed_or_unplaceable_clips_never_leave_a_draft(self):
        build = self.runtime[self.runtime.index("async function buildRecap("): self.runtime.index("const TEMPLATE_FAILED")]
        # A usable clip is imported (a length and a source file); analysis and status are not required.
        usable = build.index("!(v.seconds > 0 && v.path)")
        self.assertLess(usable, build.index("stageAssets(sdk)"))
        self.assertLess(usable, build.index("createDraft("))
        self.assertNotIn("hasAnalysis", self.runtime)
        self.assertNotRegex(self.runtime, r"\.status\s*===", "status gate")
        # Every clip and the music are placed before the first commit; a placement failure returns early.
        montage = build[build.index("createDraft("): build.index("const saved = await draft.commitAll(")]
        self.assertRegex(montage, r"try \{ await draft\.insertResource\(.*\}\s*\n\s*catch \(e\) \{ return failure\(slot\.id, e\)")
        self.assertRegex(montage, r"try \{ await draft\.overlayResource\(.*\}\s*\n\s*catch \(e\) \{ return failure\(plan\.musicId, e\)")
        # Only the host's "not placeable yet" errors are retried; any other error is reported as itself.
        self.assertIn('new RegExp("not ready|" + ${JSON.stringify(NOT_LOCAL.source)}, "i")', montage)
        self.assertIn("{ notReady: id, reason } : { failed: reason }", montage)
        self.assertIn('if (made?.failed) throw Object.assign(new Error(made.failed), { code: "draft-failed" })', build)
        self.assertEqual(self.runtime.count('e?.code === "draft-failed"'), 2, "panel and template run")
        self.assertLess(build.index("importFiles("), build.index("createDraft("), "music imported before the Draft")
        self.assertIn("throw notReady(", build)
        strings = self.source[self.source.index("const STRINGS = {"): self.source.index("\n};\n")]
        self.assertEqual(strings.count("notReady: (s: string) =>"), len(LANGS))
        self.assertEqual(self.runtime.count('e?.code === "not-ready"'), 2, "panel and template run")

    def test_contact_sheet_uses_host_ffmpeg(self):
        sheet = function_body(self.runtime, "async function contactSheet(")
        for part in ('hostNeed("Runtime", "runFFmpeg")', '"-filter_complex", graph', '"-map", "[out]"',
                     '"-frames:v", "1"', '"-q:v", "7"', 'hostJoin(data, "hero.jpg")', "hostReadBytes(file)",
                     "btoa(", "hostRemove(file)"):
            self.assertIn(part, sheet, part)
        self.assertIn("aiFallback", self.runtime)

    def test_music_dedup_compares_normalised_paths(self):
        self.assertNotIn("files[musicPath]", self.runtime)
        self.assertIn("files[norm(musicPath)]", self.runtime)
        self.assertIn("files[norm(n.path)]", self.runtime)
        norm = self.runtime[self.runtime.index("const norm = "):]
        norm = norm[: norm.index("\n")]
        for part in ('.normalize("NFC")', 'replace(/\\\\\\\\/g, "/")', "toLowerCase()"):
            self.assertIn(part, norm, part)
        self.assertIn("JSON.stringify(hostIsWindows())", self.runtime)

    def test_host_missing_is_one_localized_message(self):
        strings = self.source[self.source.index("const STRINGS = {"): self.source.index("\n};\n")]
        for lang in LANGS:
            block = re.search(r"\n  " + lang + r": \{\n(.*?)\n  \},", strings, re.S)
            self.assertIsNotNone(block, lang)
            self.assertRegex(block.group(1), r'hostTooOld: "[^"]+"', lang)
        self.assertEqual(self.runtime.count('e?.code === "host-missing"'), 2, "panel and template run")

    def test_files_missing_from_this_computer_get_their_own_message(self):
        # A Project synced from another computer has no local source timeline: say so, and don't retry.
        self.assertEqual(self.source.count("notLocal: (s: string) =>"), 10, "one per language")
        self.assertIn("analyzed sequence not found", self.runtime)
        self.assertIn("if (missing || attempt >= 2) throw notReady(", self.runtime)
        self.assertEqual(self.runtime.count('e?.code === "not-local"'), 2, "panel and template run")

    def test_manifest_and_docs(self):
        manifest = json.loads(read(os.path.join(PLUGIN, "plugin.json")))
        platforms = manifest["compatibility"]["platforms"]
        self.assertIn("macOS development builds", platforms)
        self.assertIn("Windows x64", platforms)
        self.assertNotIn("runShell", manifest["compatibility"]["selects"])
        for doc in ("INSTALL.md", "THIRD_PARTY.md", "README.md"):
            text = read(os.path.join(PLUGIN, doc))
            self.assertNotIn("app's shell", text, doc)
            self.assertNotIn("Selects shell", text, doc)
            self.assertNotIn("Homebrew", text, doc)


if __name__ == "__main__":
    unittest.main()
