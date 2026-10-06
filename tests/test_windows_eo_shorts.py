"""EO Shorts: Windows portability, the release build and its package.

The panel reaches files and ffmpeg only through the host (__DI__ FileSystem and runFFmpeg/runFFprobe argv), so no
file it is built from has a shell call. panel.tsx is the release build of src/ and engine/: no developer hook or
replay provider, generated sources that match engine/, scene font subsets renamed where the licence reserves a name,
and a Wikimedia Commons contact that is a site, not an email, kept in config/config.json only.
"""
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from windows_static import FORBIDDEN, check_manifest_and_docs, check_no_posix_shell

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGIN_ID = "eo-shorts"
PLUGIN = os.path.join(ROOT, "plugins", PLUGIN_ID)
PANEL = os.path.join(PLUGIN, "panel.tsx")
CODE = (".ts", ".tsx", ".mjs", ".js")


def read(*parts):
    with open(os.path.join(PLUGIN, *parts), encoding="utf-8") as f:
        return f.read()


def walk(folder):
    for d, _, files in os.walk(os.path.join(PLUGIN, folder)):
        for name in sorted(files):
            yield os.path.relpath(os.path.join(d, name), PLUGIN).replace(os.sep, "/")


def sha256(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


class EoShortsTest(unittest.TestCase):
    def test_no_posix_shell_at_runtime(self):
        check_no_posix_shell(self, PLUGIN_ID)

    def test_sources_have_no_posix_shell(self):
        sources = [n for folder in ("src", "engine", "tools") for n in walk(folder) if n.endswith(CODE)] + ["build.mjs"]
        self.assertGreater(len(sources), 150)
        for name in sources:
            text = read(name)
            for needle in FORBIDDEN:
                self.assertNotIn(needle, text, f"{name}: {needle}")
            self.assertIsNone(re.search(r"\b(node|python3?)\s+[\"'$]", text), name)
            self.assertNotRegex(text, r"\bprocess\.platform\b|navigator\.platform", name)

    def test_manifest_and_docs(self):
        check_manifest_and_docs(self, PLUGIN_ID)

    def test_package_lists_every_asset_and_no_source(self):
        manifest = json.loads(read("plugin.json"))
        files = set(manifest["files"])
        self.assertEqual({n for n in files if n.startswith(("assets/", "fonts/"))}, set(walk("assets")) | set(walk("fonts")))
        self.assertTrue({"SKILL.md", "INSTALL.md", "THIRD_PARTY.md", "panel.tsx"} <= files)
        self.assertFalse([n for n in files if n.startswith(("src/", "engine/", "config/", "tools/"))])
        self.assertEqual(len({n.lower() for n in files}), len(files), "names differ only in case")
        for name in files:
            self.assertIsNone(re.search(r'[<>:"|?*\\]|[ .]$', name), name)

    def test_release_build_has_no_developer_features(self):
        panel = read("panel.tsx")
        self.assertTrue(panel.startswith("// @name EO Shorts\n"))
        for needle in ("__eoShortsDev", "dev-mock", "replay", "Developer", "devCheckHost", "__EO_DEV__"):
            self.assertNotIn(needle, panel)
        imports = set(re.findall(r'^import .* from "([^"]+)";$', panel, re.M))
        self.assertEqual(imports - {"react", "react/jsx-runtime"}, set())
        version = json.loads(read("plugin.json"))["version"]
        self.assertIn(f'PLUGIN_VERSION = true ? "{version}"', panel, "panel.tsx not rebuilt for this version")

    def test_generated_sources_match_engine(self):
        panel = read("panel.tsx")
        runtime = sha256(read("engine", "runtime", "SceneRuntime.tsx"))
        self.assertIn(f'SCENE_RUNTIME_SHA256 = "{runtime}"', read("src", "mg", "sceneRuntimeSource.ts"))
        self.assertIn(runtime, panel, "panel.tsx not rebuilt from engine/")
        prompts = read("src", "stages", "plan", "promptSource.ts")
        for key, name in (("PROMPT", "PROMPT.md"), ("DIRECTING", "DIRECTING.md"), ("SCHEMA", "SCHEMA.md")):
            digest = sha256(read("engine", "prompt", name))
            self.assertIn(f'{key}_SHA256 = "{digest}"', prompts, name)
            self.assertIn(digest, panel, "panel.tsx not rebuilt from engine/")

    def test_commons_contact_is_a_site_in_one_place(self):
        config = json.loads(read("config", "config.json"))
        contact = config["commons"]["contact"]
        self.assertRegex(contact, r"^https://[^\s@]+$")
        holders = []
        for folder in ("src", "engine", "config", "tools", "assets", "fonts"):
            for name in walk(folder):
                if name.endswith((".b64", ".m4a", ".wav")):
                    continue
                if contact in read(name):
                    holders.append(name)
        self.assertEqual(holders, ["config/config.json"])
        self.assertEqual(read("panel.tsx").count(contact), 1, "panel.tsx bundles config.json once")
        email = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
        for name in ["panel.tsx", "SKILL.md", "INSTALL.md", "THIRD_PARTY.md", "build.mjs"] + [n for f in ("src", "engine", "config", "tools") for n in walk(f)]:
            found = [m for m in email.findall(read(name)) if not m.endswith(("@example.com", "@example.org"))]
            self.assertEqual(found, [], name)

    def test_reserved_font_name_subsets_are_renamed(self):
        self.assertIn('with Reserved Font Name "Playfair Display"', read("fonts", "OFL-playfair.txt"))
        self.assertIn('"Playfair Display": "EO Serif"', read("src", "mg", "renameFamily.ts"))
        self.assertIn("rename: RESERVED_FONT_NAMES", read("src", "stages", "compose", "compose.ts"))
        self.assertIn("rename: RESERVED_FONT_NAMES", read("panel.tsx"))

    @unittest.skipUnless(shutil.which("node"), "Node required")
    def test_sources_run_in_node(self):
        available = subprocess.run(["node", "-e", "if(!require('node:module').stripTypeScriptTypes)process.exit(1)"], capture_output=True)
        if available.returncode:
            self.skipTest("Node with TypeScript type stripping required (22.13+)")
        result = subprocess.run(["node", "--experimental-strip-types", "--test", "tests/eo_shorts.test.mjs"], cwd=ROOT,
                                capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
