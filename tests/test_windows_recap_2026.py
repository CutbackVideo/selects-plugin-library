"""Static Windows checks for the 2026 Recap panel.

The panel must build its Draft on Windows and macOS with no shell: timing.json, the bundled soundtrack and
the finished example are found through the host FileSystem (av-host hostRoots/hostJoin), footage thumbnails
come from the host's ffmpeg (runFFmpeg) and clip lengths come from the Resources (ffprobe as a fallback), not
only from the source-file tree. RECAP_2026_PANEL overrides the panel path (to check that an older panel fails).
"""
import json
import os
import re
import unittest

from windows_static import assert_no_shell_token, shell_token_present

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGIN = os.path.join(ROOT, "plugins", "recap-2026")
PANEL = os.environ.get("RECAP_2026_PANEL") or os.path.join(PLUGIN, "panel.tsx")

AV_HOST = re.compile(r"// av-host:start\n.*?// av-host:end\n", re.S)

FORBIDDEN = [
    "mkdir -p", "printf", "$HOME", "$SELECTS_USER", "rm -f", "base64 ", "| base64", "shasum", "cksum",
    "xxd", "command -v", "export PATH", 'cat "', "2>/dev/null", "| tr", "Downloads",
]


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def runtime_text(source):
    """The panel without the kit's av-host block and whole-line comments."""
    text = AV_HOST.sub("", source)
    return "\n".join(line for line in text.split("\n") if not line.lstrip().startswith("//"))


def body(text, head):
    start = text.index(head)
    return text[start: text.index("\n}\n", start)]


class Recap2026WindowsTest(unittest.TestCase):
    def setUp(self):
        self.source = read(PANEL)
        self.runtime = runtime_text(self.source)

    def test_av_host_block_is_present(self):
        block = AV_HOST.search(self.source)
        self.assertIsNotNone(block, "panel has no av-host block")
        for name in ("hostRoots", "hostReadBytes", "hostReadText", "hostJoin", "hostProbeSeconds"):
            self.assertRegex(block.group(0), r"function " + name + r"\(", name)
        # The template header must stay in the first lines (tests/test_runtime_copies.py).
        self.assertIn("// @collection visual-highlights", "\n".join(self.source.split("\n")[:24]))

    def test_no_posix_shell_at_runtime(self):
        for needle in FORBIDDEN:
            assert_no_shell_token(self, needle, self.runtime, needle)
        self.assertIsNone(re.search(r"\bnode\s+[\"'$]", self.runtime), "node spawn")
        self.assertIsNone(re.search(r"\bpython3?\b", self.runtime), "python spawn")
        self.assertNotIn("shellQuote", self.runtime)
        self.assertEqual(self.source.count("runShell("), 0)

    def test_timing_is_read_through_the_host_before_the_draft(self):
        self.assertIn('hostRoots(sdk, SLUG, "timing.json")', self.runtime)
        self.assertIn('hostReadText(hostJoin((await recapRoots(sdk)).plugin, "timing.json"))', self.runtime)
        build = body(self.runtime, "async function buildRecap(")
        self.assertLess(build.index("readTiming(sdk)"), build.index("createScript("), "timing before the Draft")
        self.assertLess(build.index("ensureAudio("), build.index("createScript("), "soundtrack before the Draft")
        self.assertIn("readTiming(sdk)", body(self.runtime, "function RecapPanel("), "Advanced timing view")

    def test_soundtrack_path_and_dedup(self):
        audio = body(self.runtime, "async function ensureAudio(")
        self.assertIn("hostJoin(plugin, \"assets\", AUDIO_NAME)", audio)
        self.assertIn("hostJoin(data, AUDIO_NAME)", audio)
        self.assertNotRegex(audio, r"x\.name\s*===", "raw name compare")
        self.assertIn("normPath(x.name) === normPath(AUDIO_NAME)", audio)
        norm = self.runtime[self.runtime.index("const normPath ="):]
        norm = norm[: norm.index("\n")]
        for part in ('.normalize("NFC")', 'replace(/\\\\/g, "/")', "lastIndexOf(\"/\")", "hostIsWindows()", "toLowerCase()"):
            self.assertIn(part, norm, part)

    def test_example_uses_the_sdk_and_thumbnails_use_the_host(self):
        example = body(self.runtime, "async function loadExampleMedia(")
        for part in ("files.downloadFile(", "files.stat(", "files.pathToLocalURL("):
            self.assertIn(part, example)
        self.assertNotIn("window.parent", self.runtime)
        self.assertNotIn(".document", self.runtime)
        thumb = body(self.runtime, "async function captureThumbnail(")
        for part in ('hostApi("Runtime", "runFFmpeg")', "rt.runFFmpeg([", "hostReadBytes(out)", "hostRemove(out)", "data:image/jpeg;base64,"):
            self.assertIn(part, thumb, part)

    def test_clip_lengths_come_from_the_resources(self):
        # The source-file tree keeps a length from when it was built (missing or 0 on Windows Staging, which made
        # the template run refuse every intro as shorter than 5 s); the Resource's own length comes first.
        self.assertIn("const res=await p.resources();", self.runtime)
        self.assertIn("durationSeconds:dur[n.resourceId]||n.durationSeconds", self.runtime)
        self.assertIn("const d=dur[x.resourceId]||x.durationSeconds;", self.runtime)
        self.assertRegex(self.runtime, r"selectedVideosScript = \(projectId, resourceIds\) => core\(\{projectId,resourceIds\}\) \+ RESOURCE_SECONDS")
        self.assertIn("hostProbeSeconds(v.path)", body(self.runtime, "async function withDurations("))
        run = body(self.runtime, "function TemplateRun(")
        self.assertLess(run.index("withDurations("), run.index("introVideo.durationSeconds >= 5"), "probe before the gate")
        self.assertIn("withDurations(scriptResult(r))", body(self.runtime, "function RecapPanel("))

    def test_host_missing_is_one_localized_message(self):
        for lang in ("ko", "en"):
            table = self.source[self.source.index("  " + lang + ": {"):]
            table = table[: table.index("\n  }")]
            self.assertIn("hostTooOld:", table, lang)
        self.assertIn('e?.code === "host-missing" ? t.hostTooOld', self.runtime)
        self.assertIn("WORDS.en.hostTooOld", self.runtime)
        self.assertIn("setError(hostMessage(e,t))", self.runtime)
        self.assertIn("setTimingError(hostMessage(error,t))", self.runtime)

    def test_year_font_has_a_windows_face(self):
        self.assertIn("Avenir Next,Segoe UI Black,Arial Black,sans-serif", self.source)

    def test_script_fields_are_read_after_narrowing_the_node_type(self):
        # Selects type-checks run_script strings: a source-file node is a union with directories, so
        # resourceId/durationSeconds are read only after the `type` check (tests/recap_2026_scripts_types.test.mjs
        # runs the full check against the SDK typings when they are installed).
        self.assertIn("if(x.type!=='video')continue;const d=dur[x.resourceId]", self.source)
        self.assertNotIn("{const d=dur[x.resourceId]||x.durationSeconds;if(x.type==='video'", self.source)

    def test_slow_host_scripts_get_a_longer_deadline(self):
        # On Windows Staging "Analyze fixed soundtrack" passed the default 30 s run_script deadline and failed the
        # template run; the full build hit it once on macOS too.
        for summary in ("Analyze fixed soundtrack", "Create recap intro", "Add recap footage", "Finish recap Draft"):
            self.assertRegex(self.source, r'summary:"' + summary + r'",allowCommit:true,timeoutSeconds:120,', summary)

    def test_a_slow_analysis_start_is_not_fatal(self):
        body = self.source[self.source.index("async function ensureAudio("):]
        body = body[: body.index("\n}\n")]
        start = body[body.index("const start = () =>"): body.index("await start();")]
        self.assertNotIn("scriptResult(", start, "a start error must not throw")
        self.assertIn('status === "analyzingSucceeded" || status === "analysisMerged"', body)
        self.assertIn('if (status === "pending" && attempt === 9) await start();', body)
        self.assertIn("attempt<60", body, "the poll stays bounded")

    def test_manifest_and_docs(self):
        manifest = json.loads(read(os.path.join(PLUGIN, "plugin.json")))
        self.assertIn("Windows x64", manifest["compatibility"]["platforms"])
        self.assertIn("macOS arm64", manifest["compatibility"]["platforms"])
        self.assertEqual(manifest["collection"], "visual-highlights")
        for doc in ("INSTALL.md", "README.md", "SKILL.md"):
            text = read(os.path.join(PLUGIN, doc))
            self.assertNotIn("host shell", text, doc)
            self.assertNotIn("$SELECTS_USER_SKILLS_ROOT", text, doc)


if __name__ == "__main__":
    unittest.main()
