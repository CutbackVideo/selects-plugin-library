"""Static Windows checks for the Six Clip Velocity panel.

The panel must build its Draft on Windows and macOS with no Node.js and no shell: the plan and
the finishing script run inside the panel (the operation section), the bundled music is found
through the host FileSystem (av-host hostRoots/hostJoin) and compared as a normalised path.
SIX_CLIP_VELOCITY_PANEL overrides the panel path (to check that an older panel fails).
"""
import json
import os
import re
import unittest

from windows_static import assert_no_shell_token, shell_token_present

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGIN = os.path.join(ROOT, "plugins", "six-clip-velocity")
PANEL = os.environ.get("SIX_CLIP_VELOCITY_PANEL") or os.path.join(PLUGIN, "panel.tsx")
ARCHIVE = os.path.join(ROOT, "plugins", "archive-vlog", "panel.tsx")

AV_HOST = re.compile(r"// av-host:start\n.*?// av-host:end\n", re.S)
MAC_ONLY = re.compile(r"// mac-only:start\n.*?// mac-only:end\n", re.S)

FORBIDDEN = [
    "mkdir -p", "printf", "$HOME", "$SELECTS_USER", "rm -f", "base64 ", "| base64", "shasum",
    "command -v", "export PATH", 'cat "', "2>/dev/null", "/Applications/", "/usr/bin/",
    'sh "', "sh '", "build-script", "import.meta", "node:",
]


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def runtime_text(source):
    """The panel without the kit's av-host block, mac-only regions and whole-line comments."""
    text = MAC_ONLY.sub("", AV_HOST.sub("", source))
    return "\n".join(line for line in text.split("\n") if not line.lstrip().startswith("//"))


class SixClipVelocityWindowsTest(unittest.TestCase):
    def setUp(self):
        self.source = read(PANEL)
        self.runtime = runtime_text(self.source)

    def test_av_host_block_is_byte_identical_to_archive_vlog(self):
        mine = AV_HOST.search(self.source)
        theirs = AV_HOST.search(read(ARCHIVE))
        self.assertIsNotNone(mine, "panel has no av-host block")
        self.assertIsNotNone(theirs)
        self.assertEqual(mine.group(0), theirs.group(0))

    def test_no_posix_shell_or_node_at_runtime(self):
        for needle in FORBIDDEN:
            assert_no_shell_token(self, needle, self.runtime, needle)
        self.assertIsNone(re.search(r"\bnode\s+[\"'$]", self.runtime), "node spawn")
        self.assertIsNone(re.search(r"\bpython3?\b", self.runtime), "python spawn")
        self.assertIsNone(re.search(r"\bBUILDER\b|\bbuilder\(", self.runtime), "Node build step")

    def test_no_shell_call(self):
        # The kit's av-host block has no shell call either, so the whole panel has none.
        self.assertEqual(self.source.count("runShell("), 0)

    def test_plan_and_finish_run_in_the_panel(self):
        start, end = self.source.find("// @operation-start"), self.source.find("// @operation-end")
        self.assertTrue(0 <= start < end, "no operation section")
        section = self.source[start:end]
        for name in ("scenePlan", "normalizeFinish", "buildFinishScript", "authorFinishSource", "MUSIC"):
            self.assertRegex(section, r"(?m)^export (?:async )?(?:const|function) " + name + r"\b", name)
        self.assertNotRegex(section, r"(?m)^import ")
        self.assertIn("scenePlan(30)", self.runtime)
        self.assertIn("scenePlan(fps)", self.runtime)
        self.assertIn("buildFinishScript(request)", self.runtime)

    def test_music_is_found_through_the_host_before_the_draft(self):
        body = self.runtime[self.runtime.index("async function ensureMusic("):]
        body = body[: body.index("\n}\n")]
        self.assertIn("hostRoots(", body)
        self.assertIn("hostJoin(plugin,...MUSIC.file)", body)
        self.assertNotRegex(body, r"\.path===", "exact path compare")
        norm = self.runtime[self.runtime.index("const normPath="):]
        norm = norm[: norm.index("\n")]
        for part in (".normalize('NFC')", "replace(/\\\\/g,'/')", "hostIsWindows()", "toLowerCase()"):
            self.assertIn(part, norm, part)
        create = self.runtime[self.runtime.index("async function create("):]
        self.assertLess(create.index("ensureMusic("), create.index("createDraft("), "music before the Draft")

    def test_host_errors_are_localized(self):
        strings = json.loads(re.search(r"const STRINGS=(\{.*?\});\n", self.source).group(1))
        for lang, table in strings.items():
            self.assertTrue(table.get("hostTooOld"), lang)
            self.assertTrue(table.get("musicMissing"), lang)
        self.assertIn("'host-missing'", self.runtime)

    def test_manifest_and_docs(self):
        manifest = json.loads(read(os.path.join(PLUGIN, "plugin.json")))
        self.assertIn("Windows x64", manifest["compatibility"]["platforms"])
        self.assertFalse([f for f in manifest["files"] if f.endswith(".mjs")], "Node scripts ship")
        self.assertNotIn("Node.js", manifest["compatibility"]["selects"])
        for doc in ("INSTALL.md", "SKILL.md", "VALIDATION.md", "THIRD_PARTY.md"):
            self.assertNotIn("Node.js must", read(os.path.join(PLUGIN, doc)), doc)
            self.assertNotIn("build-script.mjs", read(os.path.join(PLUGIN, doc)), doc)


if __name__ == "__main__":
    unittest.main()
