"""Static Windows checks for Photo Grid Reveal (photo-gallery-no2, a visual-highlights template).

panel.tsx is generated from panel.template.tsx by build-panel.mjs, so the checks read the generated panel and
also check that a rebuild reproduces it byte for byte. The default build finds the bundled music through the host
FileSystem (the av-host block copied from Archive Vlog) and the shared run_script operation compares host paths
normalised (NFC, / separators, case-folded for Windows paths). Short-video holding and the BPM estimate still run
through the macOS shell, so on Windows both Create paths refuse a short video before the first mutation and the
estimate is hidden with a localized "available on macOS for now". PHOTO_GALLERY_NO2_PANEL overrides the panel path
(to check that an older panel fails).
"""
import json
import os
import re
import shutil
import subprocess
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGIN = os.path.join(ROOT, "plugins", "photo-gallery-no2")
PANEL = os.environ.get("PHOTO_GALLERY_NO2_PANEL") or os.path.join(PLUGIN, "panel.tsx")

AV_HOST = re.compile(r"// av-host:start\n.*?// av-host:end\n", re.S)
MAC_ONLY = re.compile(r"^[ \t]*// mac-only:start[ \t]*\n.*?^[ \t]*// mac-only:end[ \t]*\n", re.S | re.M)
HOST_FUNCTIONS = ["hostError", "hostDI", "hostApi", "hostNeed", "hostIsWindows", "hostJoin", "hostBytes",
                  "hostReadBytes", "hostReadText", "hostRemove", "hostRoots", "hostDecodePcm", "hostProbeSeconds"]
FORBIDDEN = [
    "mkdir -p", "printf", "$HOME", "$SELECTS_USER", "SELECTS_USER_SKILLS_ROOT", "rm -f", "base64 ", "| base64",
    "shasum", "command -v", "export PATH", 'cat "', "2>/dev/null", "/usr/bin/", 'sh "', "sh '", "runtime.sh",
    "shellQuote", "runtimePython", "\"'\\\"'\\\"'\"",
]
SPAWN = re.compile(r"""(?:["'`]|&&|;|\|)\s*(?:node|python3?)\s+["'$\-/\w{(]|/python3?["'\s]""")
LANGUAGES = ["ko", "en", "de", "es", "fr", "it", "ja", "pt", "tr", "zh"]


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def runtime_text(source):
    """The panel without the av-host block, mac-only regions and whole-line comments."""
    text = MAC_ONLY.sub("", AV_HOST.sub("", source))
    return "\n".join(line for line in text.split("\n") if not line.lstrip().startswith("//"))


def body(text, start, end="\n}\n"):
    at = text.index(start)
    return text[at:text.index(end, at)]


class PhotoGalleryNo2WindowsTest(unittest.TestCase):
    def setUp(self):
        self.source = read(PANEL)
        self.runtime = runtime_text(self.source)

    def test_template_conventions_are_kept(self):
        self.assertRegex("\n".join(self.source.split("\n")[:24]), r"(?m)^// @collection visual-highlights$")
        self.assertIn("function GalleryTemplateRun(", self.source)

    def test_av_host_block_defines_the_host_helpers(self):
        block = AV_HOST.search(self.source)
        self.assertIsNotNone(block, "panel has no av-host block")
        for name in HOST_FUNCTIONS:
            self.assertRegex(block.group(0), r"(?m)^(?:async )?function " + name + r"\(", name)

    def test_no_posix_shell_outside_mac_only_regions(self):
        for needle in FORBIDDEN:
            self.assertNotIn(needle, self.runtime, needle)
        self.assertIsNone(SPAWN.search(self.runtime), "node/python spawn outside mac-only regions")
        self.assertEqual(self.runtime.count("runShell("), 0, "runShell outside mac-only regions")

    def test_bundled_music_is_found_through_the_host(self):
        music = body(self.runtime, "async function prepareBundledMusic(")
        self.assertIn("hostRoots(sdk, 'photo-gallery-no2', 'SKILL.md')", music)
        self.assertIn("hostJoin(plugin, 'assets', 'music.mp3')", music)
        self.assertIn("existsSync(", music)
        self.assertLess(music.index("existsSync("), music.index("onImportStarted()"))
        manifest = json.loads(read(os.path.join(PLUGIN, "plugin.json")))
        self.assertIn("SKILL.md", manifest["files"])
        self.assertIn("assets/music.mp3", manifest["files"])

    def test_operation_compares_normalised_host_paths(self):
        operation = read(os.path.join(PLUGIN, "operation-runtime.js"))
        key = body(operation, "function galleryPathKey(")
        for part in (".normalize('NFC')", "replace(/\\\\/g, '/')", "toLowerCase()"):
            self.assertIn(part, key, part)
        self.assertNotRegex(operation, r"\.path\s*===|===\s*(?:input\.)?path\b", "exact path compare")
        self.assertNotIn("startsWith('/')", operation)
        self.assertNotRegex(operation, r"/\^\\/\(\?:\[\^\\0\]\+\)", "POSIX-only absolute path check")
        self.assertIn("function galleryPathKey(", self.source, "the panel ships the operation")

    def test_windows_refuses_unported_features_before_the_first_mutation(self):
        strings = json.loads(re.search(r"const STRINGS = (\{.*?\n\});\n", self.source, re.S).group(1))
        self.assertEqual(sorted(strings), sorted(LANGUAGES))
        for lang in LANGUAGES:
            for key in ("shortMacOnly", "estimateMacOnly"):
                self.assertIn("macOS", strings[lang].get(key, ""), lang + "." + key)
        self.assertIn("const macOnly = React.useMemo(() => hostIsWindows(), []);", self.source)
        create = body(self.source, "  async function createGallery() {", "\n  }\n")
        guard = create.index("if (macOnly && shortGalleryVideos(input.media, durationFrames).length) throw new Error(t.shortMacOnly);")
        self.assertLess(guard, create.index("running.current = true"))
        self.assertLess(create.index("if (macOnly && !manualEnabled) throw new Error(t.estimateMacOnly);"),
                        create.index("prepareBundledMusic("))
        self.assertLess(guard, create.index("prepareBundledMusic("))
        template = body(self.source, "function GalleryTemplateRun(")
        self.assertLess(template.index("if (hostIsWindows() && shortGalleryVideos(media, TEMPLATE_DURATION_FRAMES).length)"),
                        template.index("prepareBundledMusic("))
        self.assertIn("macOS for now", template)
        estimate = body(self.source, "  async function estimateMusic(audio) {", "\n  }\n")
        self.assertLess(estimate.index("if (macOnly) throw new Error(t.estimateMacOnly);"), estimate.index("// mac-only:start"))
        self.assertIn("{macOnly ? <small>{t.estimateMacOnly}</small> : <ui.Toggle label={t.bpmManual}", self.source)

    @unittest.skipUnless(shutil.which("node"), "node builds the panel")
    def test_generated_panel_matches_a_rebuild(self):
        if os.environ.get("PHOTO_GALLERY_NO2_PANEL"):
            self.skipTest("checking another panel copy")
        built = subprocess.run(["node", os.path.join(PLUGIN, "build-panel.mjs"), "--stdout"], cwd=PLUGIN,
                               capture_output=True, check=True).stdout
        with open(PANEL, "rb") as f:
            self.assertEqual(built, f.read(), "run node build-panel.mjs in plugins/photo-gallery-no2")

    def test_manifest_and_docs(self):
        manifest = json.loads(read(os.path.join(PLUGIN, "plugin.json")))
        self.assertNotEqual(manifest["version"], "0.3.2")
        install = read(os.path.join(PLUGIN, "INSTALL.md"))
        self.assertIn("Windows", install)
        for needle in ("brew ", "Homebrew", "nvm "):
            self.assertNotIn(needle, install)


if __name__ == "__main__":
    unittest.main()
