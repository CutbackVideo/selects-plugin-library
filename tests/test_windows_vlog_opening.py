"""Static Windows checks for the Vlog Opening panel.

The bundled cue, the motion palette and the own-music preview must work on Windows and macOS with no
shell: files are found through the host FileSystem (av-host hostRoots/hostJoin), ffmpeg is the host's
bundled Runtime.runFFmpeg writing into the data folder, and the generated import script compares
normalised paths. VLOG_OPENING_PANEL overrides the panel path (to check that an older panel fails).
"""
import json
import os
import re
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGIN = os.path.join(ROOT, "plugins", "vlog-opening")
PANEL = os.environ.get("VLOG_OPENING_PANEL") or os.path.join(PLUGIN, "panel.tsx")

AV_HOST = re.compile(r"// av-host:start\n.*?// av-host:end\n?", re.S)

FORBIDDEN = [
    "mkdir -p", "printf", "$HOME", "$SELECTS_USER", "rm -f", "base64 ", "| base64", "shasum",
    "cksum", "xxd", "command -v", "export PATH", 'cat "', "2>/dev/null", "| tr",
]


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def runtime_text(source):
    """The panel without the kit's av-host block and whole-line comments."""
    text = AV_HOST.sub("", source)
    return "\n".join(line for line in text.split("\n") if not line.lstrip().startswith("//"))


def function_body(text, head):
    body = text[text.index(head):]
    return body[: body.index("\n}\n")]


class VlogOpeningWindowsTest(unittest.TestCase):
    def setUp(self):
        self.source = read(PANEL)
        self.runtime = runtime_text(self.source)

    def test_collection_header_stays_on_top(self):
        self.assertIn("// @collection visual-highlights", "\n".join(self.source.split("\n")[:24]))

    def test_av_host_block_is_present(self):
        block = AV_HOST.search(self.source)
        self.assertIsNotNone(block, "panel has no av-host block")
        for name in ("hostRoots", "hostReadBytes", "hostJoin", "hostRemove", "hostApi"):
            self.assertRegex(block.group(0), r"(?m)^(?:async )?function " + name + r"\(", name)
        self.assertGreater(self.source.index("// av-host:start"), self.source.index("export default function Panel("))

    def test_no_posix_shell_or_node_at_runtime(self):
        for needle in FORBIDDEN:
            self.assertNotIn(needle, self.runtime, needle)
        self.assertIsNone(re.search(r"\bnode\s+[\"'$]", self.runtime), "node spawn")
        self.assertIsNone(re.search(r"\bpython3?\b", self.runtime), "python spawn")

    def test_no_shell_call(self):
        self.assertEqual(self.runtime.count("runShell"), 0)

    def test_bundled_cue_is_found_through_the_host(self):
        body = function_body(self.runtime, "async function resolveMusic(")
        self.assertIn('hostRoots(sdk, PLUGIN_DIR, "assets/" + CUES[0].file)', body)
        self.assertIn('hostJoin(plugin, "assets", cue.file)', body)
        self.assertIn('".selects", "panels", PLUGIN_DIR, "assets", cue.file', body)
        self.assertIn("exists", body)
        self.assertIn("NEEDS_NEWER_SELECTS", body)

    def test_palette_and_preview_use_host_ffmpeg(self):
        palette = function_body(self.runtime, "async function samplePalette(")
        for part in ('hostApi("Runtime", "runFFmpeg")', '"-f", "rawvideo"', 'hostJoin(data, "pal-" + i + ".rgb")',
                     "hostReadBytes(tmp)", "hostRemove(tmp)", "FALLBACK_PALETTE"):
            self.assertIn(part, palette, part)
        audition = function_body(self.runtime, "  async function toggleAudition(")
        for part in ('hostApi("Runtime", "runFFmpeg")', '"-f", "mp3", tmp', 'hostJoin(data, "aud.mp3")',
                     "hostReadBytes(tmp)", "hostRemove(tmp)", '"data:audio/mpeg;base64," + btoa(', "NEEDS_NEWER_SELECTS",
                     '"host-missing"'):
            self.assertIn(part, audition, part)

    def test_own_file_dedup_compares_normalised_paths(self):
        body = self.runtime[self.runtime.index("function ensureMusicScript("):self.runtime.index("function poolScript(")]
        self.assertIn('absPath.replace(/\\\\/g, "/").split("/").pop()', body)
        self.assertIn('const norm = (s) => String(s || "").normalize("NFC").replace(/\\\\\\\\/g, "/").toLowerCase();', body)
        self.assertIn("norm(paths[r.resourceId]) === norm(", body)
        self.assertIn("norm(r.name) === norm(", body)
        self.assertNotIn("paths[r.resourceId] === ${", body)

    def test_music_and_palette_resolve_before_the_draft(self):
        for head in ("async function runTemplate(", "  async function build("):
            body = self.runtime[self.runtime.index(head):]
            assemble = body.index('"Assemble opening"')
            self.assertLess(body.index("samplePalette(sdk, beats)"), assemble, head)
            self.assertLess(body.index("resolveMusic(sdk, projectId, music"), assemble, head)

    def test_script_fonts_have_a_windows_face(self):
        stacks = re.findall(r"'\"Snell Roundhand\", \"Apple Chancery\"[^']*'", self.source)
        self.assertEqual(len(stacks), 3)
        for stack in stacks:
            self.assertIn('"Segoe Script"', stack)

    def test_manifest_and_docs(self):
        manifest = json.loads(read(os.path.join(PLUGIN, "plugin.json")))
        self.assertIn("Windows x64", manifest["compatibility"]["platforms"])
        self.assertIn("macOS arm64", manifest["compatibility"]["platforms"])
        self.assertEqual(manifest.get("collection"), "visual-highlights")
        for doc in ("INSTALL.md", "README.md"):
            self.assertNotIn("through the app's shell", read(os.path.join(PLUGIN, doc)), doc)
            self.assertNotIn("brew ", read(os.path.join(PLUGIN, doc)), doc)


if __name__ == "__main__":
    unittest.main()
