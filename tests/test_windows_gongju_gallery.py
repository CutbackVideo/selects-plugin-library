"""Static Windows checks for the gongju-gallery template panel.

The portrait crops used to run crop.py through `sh runtime.sh python` and a single-quoted
command, which cmd.exe cannot run. They now run in the panel through the host's ffmpeg and
FileSystem (the av-host block), with no shell and no Python, before anything touches the project.
GONGJU_GALLERY_PANEL overrides the panel path (to check that an older panel fails).
"""
import json
import os
import re
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGIN = os.path.join(ROOT, "plugins", "gongju-gallery")
PANEL = os.environ.get("GONGJU_GALLERY_PANEL") or os.path.join(PLUGIN, "panel.tsx")

AV_HOST = re.compile(r"// av-host:start\n.*?// av-host:end\n", re.S)
MAC_ONLY = re.compile(r"// mac-only:start\n.*?// mac-only:end\n", re.S)
HOST_FUNCTIONS = [
    "hostError", "hostDI", "hostApi", "hostNeed", "hostIsWindows", "hostJoin", "hostBytes", "hostReadBytes",
    "hostReadText", "hostRemove", "hostRoots", "hostDecodePcm", "hostProbeSeconds",
]
FORBIDDEN = [
    "mkdir -p", "printf", "$HOME", "$SELECTS_USER", "rm -f", "base64 ", "| base64", "shasum",
    "command -v", "export PATH", 'cat "', "2>/dev/null", "/Applications/", "/usr/bin/", "/opt/homebrew",
    'sh "', "sh '", "runtime.sh", "crop.py", "shellPath",
]


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def runtime_text(source):
    """The panel without the av-host block, mac-only regions and whole-line comments."""
    text = MAC_ONLY.sub("", AV_HOST.sub("", source))
    return "\n".join(line for line in text.split("\n") if not line.lstrip().startswith("//"))


def body_of(text, head):
    body = text[text.index(head):]
    return body[: body.index("\n}\n")]


class GongjuGalleryWindowsTest(unittest.TestCase):
    def setUp(self):
        self.source = read(PANEL)
        self.runtime = runtime_text(self.source)

    def test_template_header_is_kept(self):
        self.assertIn("// @collection visual-highlights\n", self.source)
        self.assertIn("function TemplateRun(", self.source)

    def test_av_host_block_defines_the_host_helpers(self):
        block = AV_HOST.search(self.source)
        self.assertIsNotNone(block, "panel has no av-host block")
        for name in HOST_FUNCTIONS:
            self.assertRegex(block.group(0), r"(?m)^(?:async )?function " + name + r"\(", name)

    def test_no_shell_python_or_posix_at_runtime(self):
        self.assertEqual(self.source.count("runShell("), 0)
        for needle in FORBIDDEN:
            self.assertNotIn(needle, self.runtime, needle)
        self.assertIsNone(re.search(r"\bpython3?\b", self.runtime, re.I), "python")
        self.assertIsNone(re.search(r"\bnode\s+[\"'$]", self.runtime), "node spawn")

    def test_crops_run_through_the_host_before_any_project_change(self):
        crop = body_of(self.runtime, "async function cropShots(")
        for part in ('hostNeed("Runtime", "runFFmpeg")', "hostRoots(", "hostJoin(roots.data", "mkdirSync(",
                     "hostJoin(roots.plugin, \"assets\", MUSIC_NAME)", "crypto.subtle.digest", "hostReadBytes("):
            self.assertIn(part, self.runtime if part == "crypto.subtle.digest" else crop, part)
        self.assertNotIn("importFiles", crop)
        build = body_of(self.runtime, "async function buildGallery(")
        self.assertLess(build.index("cropShots("), build.index("importFiles("), "crop before the import")
        self.assertLess(build.index("cropShots("), build.index("createDraft("), "crop before the Draft")

    def test_crop_argv_matches_the_old_helper(self):
        args = body_of(self.runtime, "function galleryCropArgs(")
        for part in ('"-ss", clip.startSeconds.toFixed(6), "-i", clip.path',
                     '"scale=1080:1440:force_original_aspect_ratio=increase,crop=1080:1440,setsar=1,fps=30000/1001"',
                     '"-frames:v", String(clip.frames), "-an", "-c:v", "libx264"', '"-crf", "18"', '"yuv420p"', '"+faststart"'):
            self.assertIn(part, args, part)
        self.assertRegex(self.runtime, r"`gallery-\$\{String\(index \+ 1\)\.padStart\(2, \"0\"\)\}\.mp4`")

    def test_soundtrack_paths_compare_normalised(self):
        norm = self.runtime[self.runtime.index("const normPath ="):]
        norm = norm[: norm.index("\n")]
        for part in ('.normalize("NFC")', 'replace(/\\\\/g, "/")', "hostIsWindows()", "toLowerCase()"):
            self.assertIn(part, norm, part)
        self.assertIn("normPath(item.path)", body_of(self.runtime, "function fixedAudioOf("))

    def test_title_font_has_a_windows_face(self):
        self.assertIn("Century Gothic, sans-serif", self.source)

    def test_manifest_and_docs(self):
        manifest = json.loads(read(os.path.join(PLUGIN, "plugin.json")))
        self.assertIn("Windows x64", manifest["compatibility"]["platforms"])
        for name in ("crop.py", "runtime.sh"):
            self.assertNotIn(name, manifest["files"])
            self.assertFalse(os.path.exists(os.path.join(PLUGIN, name)), name)
        for doc in ("INSTALL.md", "SKILL.md"):
            text = read(os.path.join(PLUGIN, doc))
            for needle in ("crop.py", "runtime.sh", "Homebrew", "/opt/homebrew", "brew "):
                self.assertNotIn(needle, text, doc + ": " + needle)


if __name__ == "__main__":
    unittest.main()
