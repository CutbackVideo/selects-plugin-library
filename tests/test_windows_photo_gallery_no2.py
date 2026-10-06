"""Static Windows checks for Photo Grid Reveal (photo-gallery-no2, a visual-highlights template).

panel.tsx is generated from panel.template.tsx by build-panel.mjs, so the checks read the generated panel and
also check that a rebuild reproduces it byte for byte. The default build finds the bundled music through the host
FileSystem (the av-host block copied from Archive Vlog) and the shared run_script operation compares host paths
normalised (NFC, / separators, case-folded for Windows paths). Short-video holding (// hold:) and the BPM estimate
(// tempo:) run in the panel on the host's bundled ffmpeg/ffprobe, so the panel has no shell call at all and ships no
Python. PHOTO_GALLERY_NO2_PANEL overrides the panel path (to check that an older panel fails).
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

    def test_no_shell_call_at_all(self):
        self.assertIsNone(MAC_ONLY.search(self.source), "nothing is macOS-only any more")
        self.assertEqual(self.source.count("runShell("), 0)
        self.assertIsNone(re.search(r"\b(?:tempo|hold_video)\.py\b", self.runtime))

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

    def test_short_videos_are_held_by_the_host_ffmpeg(self):
        hold = re.search(r"// hold:start\n.*?// hold:end\n", self.source, re.S)
        self.assertIsNotNone(hold, "panel has no hold block")
        hold = hold.group(0)
        self.assertIn("hostNeed('Runtime', kind)", hold)
        for tool in ("'runFFmpeg'", "'runFFprobe'"):
            self.assertIn(tool, hold, tool)
        self.assertIn("hostJoin(dataDir, 'held-v2')", hold)
        self.assertNotIn("pattern_type", hold)
        self.assertNotIn("runShell", hold)
        visuals = body(self.runtime, "async function prepareVisuals(")
        self.assertIn("holdVideos(request, (await hostRoots(sdk, 'photo-gallery-no2', 'SKILL.md')).data)", visuals)
        self.assertNotIn("hold_video", self.runtime)
        self.assertNotIn("shortMacOnly", self.source, "short videos work on Windows")

    def test_bpm_is_estimated_in_the_panel_from_host_decoded_pcm(self):
        tempo = re.search(r"// tempo:start\n.*?// tempo:end\n", self.source, re.S)
        self.assertIsNotNone(tempo, "panel has no tempo block")
        tempo = tempo.group(0)
        self.assertIn("hostDecodePcm(path, dataDir, TEMPO_RATE, TEMPO_SECONDS", tempo)
        self.assertIn("TEMPO_RATE = 11025", tempo)
        self.assertIn("TEMPO_SECONDS = 30", tempo)
        estimate = body(self.runtime, "  async function estimateMusic(audio) {", "\n  }\n")
        self.assertIn("tempoOfFile(audio.path, (await hostRoots(sdk, 'photo-gallery-no2', 'SKILL.md')).data)", estimate)
        strings = json.loads(re.search(r"const STRINGS = (\{.*?\n\});\n", self.source, re.S).group(1))
        self.assertEqual(sorted(strings), sorted(LANGUAGES))
        self.assertNotIn("MacOnly", self.source, "every feature works on Windows")

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
        self.assertNotIn(manifest["version"], ("0.3.2", "0.3.3", "0.3.4"))
        self.assertIn("Windows x64", manifest["compatibility"]["platforms"])
        self.assertFalse([f for f in manifest["files"] if f.endswith((".py", ".sh"))], "Python or shell ships")
        for name in ("hold_video.py", "tempo.py", "runtime.sh"):
            self.assertFalse(os.path.exists(os.path.join(PLUGIN, name)), name + " is gone (Python parity references live in dev/)")
            self.assertNotIn(name, read(os.path.join(PLUGIN, "SKILL.md")), name)
        install = read(os.path.join(PLUGIN, "INSTALL.md"))
        self.assertIn("Windows", install)
        for needle in ("brew ", "Homebrew", "nvm ", "CPython", "runtime.sh", "tempo.py"):
            self.assertNotIn(needle, install, needle)

    def test_chat_skill_needs_no_node_or_shell(self):
        skill = read(os.path.join(PLUGIN, "SKILL.md"))
        self.assertNotIn("stdin", skill)
        self.assertNotIn("from `build-script.mjs`", skill)
        self.assertIn("return await galleryOperation(selects, <operation JSON>);", skill)

    @unittest.skipUnless(shutil.which("node"), "node runs operation-builder.mjs")
    def test_chat_skill_recipe_matches_the_panel_prefix(self):
        recipe = (
            read(os.path.join(PLUGIN, "format.mjs")).replace("export const REFERENCE", "const REFERENCE", 1)
            .replace("export function planGallery", "function planGallery", 1)
            + "\n" + read(os.path.join(PLUGIN, "operation-runtime.js")) + "\nreturn await galleryOperation(selects, "
        )
        out = subprocess.run(
            ["node", "--input-type=module", "-e",
             "import {SCRIPT_PREFIX} from './operation-builder.mjs'; process.stdout.write(SCRIPT_PREFIX)"],
            cwd=PLUGIN, capture_output=True, text=True, check=True).stdout
        self.assertEqual(recipe, out)


if __name__ == "__main__":
    unittest.main()
