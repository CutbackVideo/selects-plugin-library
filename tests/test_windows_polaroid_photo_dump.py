"""Static Windows checks for the Polaroid Photo Dump panel.

The panel must build its Draft on Windows and macOS with no shell: the bundled frame and music are
decoded through the host FileSystem (av-host hostRoots/hostReadText) before the Draft is created,
and imported files are matched by a normalised path compare.
POLAROID_PHOTO_DUMP_PANEL overrides the panel path (to check that an older panel fails).
"""
import json
import os
import re
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGIN = os.path.join(ROOT, "plugins", "polaroid-photo-dump")
PANEL = os.environ.get("POLAROID_PHOTO_DUMP_PANEL") or os.path.join(PLUGIN, "panel.tsx")

AV_HOST = re.compile(r"// av-host:start\n.*?// av-host:end\n", re.S)

FORBIDDEN = [
    "mkdir -p", "printf", "$HOME", "$SELECTS_USER", "rm -f", "base64 ", "| base64", "shasum",
    "cksum", "xxd", "command -v", "export PATH", 'cat "', "2>/dev/null", "| tr", "/usr/bin/",
    "set -e", "mv -f",
]


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def runtime_text(source):
    """The panel without the av-host block and whole-line comments."""
    text = AV_HOST.sub("", source)
    return "\n".join(line for line in text.split("\n") if not line.lstrip().startswith("//"))


def body_of(text, head):
    body = text[text.index(head):]
    return body[: body.index("\n}\n")]


class PolaroidPhotoDumpWindowsTest(unittest.TestCase):
    def setUp(self):
        self.source = read(PANEL)
        self.runtime = runtime_text(self.source)

    def test_av_host_block_is_present_below_the_header(self):
        block = AV_HOST.search(self.source)
        self.assertIsNotNone(block, "panel has no av-host block")
        for name in ("hostRoots", "hostReadBytes", "hostReadText", "hostJoin", "hostNeed", "hostIsWindows"):
            self.assertRegex(block.group(0), r"(?m)^(?:async )?function " + name + r"\(", name)
        head = "\n".join(self.source.split("\n")[:24])
        self.assertIn("// @collection visual-highlights", head)
        self.assertNotIn("av-host:start", head)

    def test_no_posix_shell_or_node_at_runtime(self):
        for needle in FORBIDDEN:
            self.assertNotIn(needle, self.runtime, needle)
        self.assertIsNone(re.search(r"\bnode\s+[\"'$]", self.runtime), "node spawn")
        self.assertIsNone(re.search(r"\bpython3?\b", self.runtime), "python spawn")

    def test_no_shell_call(self):
        self.assertEqual(self.source.count("runShell"), 0)

    def test_assets_unpack_through_the_host_before_the_draft(self):
        unpack = body_of(self.runtime, "async function unpackAssets(")
        self.assertIn("hostRoots(sdk,'polaroid-photo-dump','assets/manifest.json')", unpack)
        self.assertIn("hostReadText(hostJoin(plugin,'assets','manifest.json'))", unpack)
        self.assertIn("unpackBundled(", unpack)
        self.assertIn("'host-missing'", unpack)
        self.assertIn("HOST_TOO_OLD", unpack)
        helper = body_of(self.runtime, "export async function unpackBundled(")
        for part in ("/^[A-Za-z0-9][A-Za-z0-9._-]*$/", "atob(", "subtle.digest('SHA-256'", "seen.has("):
            self.assertIn(part, helper, part)
        self.assertNotRegex(helper, r"\+\s*'/'", "path built with '/'")
        create = body_of(self.runtime, "export async function createPhotoDraft(")
        self.assertLess(create.index("ensureAssets("), create.index("createDraft("), "assets before the Draft")
        ensure = body_of(self.runtime, "async function ensureAssets(")
        self.assertIn("unpackAssets(sdk)", ensure)

    def test_imports_match_by_normalised_path(self):
        ensure = body_of(self.runtime, "async function ensureAssets(")
        self.assertNotIn("r.path===f.path", ensure)
        self.assertEqual(ensure.count("samePath(r.path,f.path)"), 2)
        same = self.runtime[self.runtime.index("const samePath="):]
        same = same[: same.index("\n")]
        for part in (".normalize('NFC')", "replace(/\\\\/g,'/')", "hostIsWindows()", "toLowerCase()"):
            self.assertIn(part, same, part)

    def test_host_too_old_message(self):
        m = re.search(r"const HOST_TOO_OLD='([^']+)'", self.runtime)
        self.assertIsNotNone(m)
        self.assertIn("newer version of Selects", m.group(1))

    def test_caption_font_has_a_windows_face(self):
        self.assertIn('"Segoe UI", Arial', self.source)

    def test_manifest_and_docs(self):
        manifest = json.loads(read(os.path.join(PLUGIN, "plugin.json")))
        self.assertIn("Windows x64", manifest["compatibility"]["platforms"])
        self.assertIn("macOS arm64", manifest["compatibility"]["platforms"])
        for doc in ("INSTALL.md", "SKILL.md", "VALIDATION.md", "THIRD_PARTY.md"):
            text = read(os.path.join(PLUGIN, doc))
            for needle in ("shasum", "system `base64`", "/bin/sh", "brew "):
                self.assertNotIn(needle, text, doc + ": " + needle)


if __name__ == "__main__":
    unittest.main()
