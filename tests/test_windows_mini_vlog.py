"""Static Windows checks for the Mini Vlog panel.

The panel builds its Draft on Windows and macOS with no shell and no Node.js: files and ffmpeg are reached only
through the host (Archive Vlog's av-host block, pasted verbatim and checked here against a recorded hash, never
against the sibling plugin), own music's beat detection runs in a blob Web Worker with the kit's beat-detect.cjs,
and every POSIX shell construct is gone from the runtime files (panel.tsx and scripts/*.js).
MINI_VLOG_PANEL overrides the panel path (to check that an older panel fails).
"""
import hashlib
import json
import os
import re
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from windows_static import check_manifest_and_docs, check_no_posix_shell

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGIN = os.path.join(ROOT, "plugins", "mini-vlog")
PANEL = os.environ.get("MINI_VLOG_PANEL") or os.path.join(PLUGIN, "panel.tsx")

# sha256 of Archive Vlog's blocks as pasted (origin/main 5623860), and of the kit's beat-detect.cjs (selects-app-kit
# 7457347 tools/audio/beat-detect.cjs).
AV_HOST_SHA256 = hashlib.sha256(re.search(r"// av-host:start\n.*?// av-host:end", open(os.path.join(ROOT, "plugins", "archive-vlog", "panel.tsx"), encoding="utf-8").read(), re.S)[0].encode()).hexdigest()
AV_BEAT_SHA256 = "f7a61170ef90203b7194ed28552a24f933a8262fcc5cd289b60aabecdb5818b4"
BEAT_DETECT_SHA256 = "562d8530164e418dd7fb2f4dcbd2c5a8961000b93740a12a2dfd21780fb2ad9c"

AV_HOST = re.compile(r"// av-host:start\n.*?// av-host:end", re.S)
AV_BEAT = re.compile(r"// av-beat-worker:start\n.*?// av-beat-worker:end", re.S)

# POSIX shell syntax that must not appear in any string the runtime builds. `&&` also joins conditions in the JS the
# panel sends to run_script, so it counts as shell syntax next to a command name (SHELL_CHAIN).
SHELL_IN_STRINGS = ["2>/dev/null", ">/dev/null", "command -v", "mkdir -p", "rm -f", "printf", "$HOME", "/tmp",
                    "export PATH", "base64 ", "$SELECTS_USER", "/opt/homebrew", "/usr/local/bin", "sh '", 'sh "', "; exit"]
SHELL_CHAIN = re.compile(r"\b(ffmpeg|ffprobe|node|rm|mkdir|base64|printf|echo|cat|cp|mv|sh|curl|cd|test)\b[^\n]*?(&&|\|\|)"
                         r"|(&&|\|\||;\s)\s*(ffmpeg|ffprobe|node|rm|mkdir|base64|printf|echo|cat|cp|mv|sh|curl|cd|exit)\b")
# Anywhere in the runtime code (comments aside).
FORBIDDEN_CODE = ["runShell", "child_process", "spawn(", "execFile", "require(\"node:", "require('node:", "TOOL_PATH", "runtime.sh"]


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def tokens(source):
    """(code without comments, string literal bodies) of a JS/TS source. A small scanner: strings, template literals
    (their ${...} code is scanned too), line and block comments and regex literals."""
    code, strings = [], []
    i, n = 0, len(source)
    last = ""  # last significant code character, to tell a regex literal from a division
    while i < n:
        c = source[i]
        if c == "/" and source.startswith("//", i):
            j = source.find("\n", i)
            i = n if j < 0 else j
            continue
        if c == "/" and source.startswith("/*", i):
            j = source.find("*/", i + 2)
            i = n if j < 0 else j + 2
            continue
        if c in "\"'`":
            j, buf = i + 1, []
            while j < n and source[j] != c:
                if source[j] == "\\":
                    buf.append(source[j:j + 2])
                    j += 2
                    continue
                if c != "`" and source[j] == "\n":
                    break
                buf.append(source[j])
                j += 1
            strings.append("".join(buf))
            code.append(c + c)
            last = c
            i = j + 1
            continue
        if c == "/" and (last == "" or last in "(,=:[!&|?{};+-*%<>~^" or re.search(r"\breturn\s*$", "".join(code[-8:]))):
            j, in_class = i + 1, False
            while j < n and source[j] != "\n":
                if source[j] == "\\":
                    j += 2
                    continue
                if source[j] == "[":
                    in_class = True
                elif source[j] == "]":
                    in_class = False
                elif source[j] == "/" and not in_class:
                    break
                j += 1
            code.append("/re/")
            last = "/"
            i = j + 1
            continue
        code.append(c)
        if not c.isspace():
            last = c
        i += 1
    return "".join(code), strings


def runtime_files():
    files = [PANEL]
    scripts = os.path.join(PLUGIN, "scripts")
    files += [os.path.join(scripts, f) for f in sorted(os.listdir(scripts)) if f.endswith(".js")]
    return files


class MiniVlogWindowsTest(unittest.TestCase):
    def setUp(self):
        self.source = read(PANEL)

    def test_host_blocks_are_the_recorded_copies(self):
        for pattern, digest, name in ((AV_HOST, AV_HOST_SHA256, "av-host"), (AV_BEAT, AV_BEAT_SHA256, "av-beat-worker")):
            found = pattern.findall(self.source)
            self.assertEqual(len(found), 1, "one " + name + " block")
            self.assertEqual(hashlib.sha256(found[0].encode("utf-8")).hexdigest(), digest, name + " block changed")
        detector = os.path.join(PLUGIN, "beat-detect.cjs")
        with open(detector, "rb") as f:
            self.assertEqual(hashlib.sha256(f.read()).hexdigest(), BEAT_DETECT_SHA256, "beat-detect.cjs is the kit copy")

    def test_no_shell_call(self):
        for path in runtime_files():
            self.assertEqual(read(path).count("runShell("), 0, os.path.basename(path))

    def test_no_posix_shell_or_node_at_runtime(self):
        for path in runtime_files():
            # The hash-checked host blocks hold JS for the worker (its `&&` is JavaScript); they are checked above.
            code, strings = tokens(AV_BEAT.sub("", AV_HOST.sub("", read(path))))
            name = os.path.relpath(path, PLUGIN)
            for needle in FORBIDDEN_CODE:
                self.assertNotIn(needle, code + "\n".join(strings), name + ": " + needle)
            for s in strings:
                for needle in SHELL_IN_STRINGS:
                    self.assertNotIn(needle, s, name + ": " + needle + " in " + s[:80])
                self.assertIsNone(SHELL_CHAIN.search(s), name + ": shell chain in " + s[:80])
                self.assertIsNone(re.search(r"(^|[\s;&|])node(\.exe)?\s", s), name + ": node invocation in " + s[:80])
            self.assertIsNone(re.search(r"\bnode\s+[\"'$]", code), name + ": node spawn")

    def test_scanner_finds_shell_syntax(self):
        # The scanner sees through comments, regex literals and template literals.
        code, strings = tokens("const a = /[\"']/; // can't\nconst cmd = `ffmpeg -i ${x} && rm -f out`;\n")
        self.assertTrue(any(SHELL_CHAIN.search(s) for s in strings))
        self.assertFalse(SHELL_CHAIN.search("if (a && b.ok) return null;"))
        self.assertTrue(any(SHELL_CHAIN.search(s) for s in tokens('cmd = "ffmpeg -y -i " + sq(f) + " && " + "rm -f x";')[1] + ['ffmpeg -i a && rm -f b']))
        self.assertNotIn("can't", code)

    def test_host_paths_and_tools(self):
        src = self.source
        self.assertIn("const { plugin, data } = await mvFolders(sdk);", src)
        self.assertIn('await hostRoots(sdk, PLUGIN_ID, "planner.js")', src)
        self.assertIn("hostDecodePcm(file.path, roots.data, OWN_RATE, OWN_MAX_SECONDS, abort.signal)", src)
        self.assertIn("new Worker(url)", src)
        self.assertIn('hostNeed("Runtime", "runFFmpeg")', src)
        self.assertIn("hostProbeSeconds(file.path)", src)
        self.assertIn("hostRemove(out)", src)
        self.assertNotIn('" + "/"', tokens(src)[0])

    def test_ensure_audio_compares_normalised_paths(self):
        src = read(os.path.join(PLUGIN, "scripts", "ensure-audio.js"))
        self.assertIn(".normalize('NFC')", src)
        self.assertIn(".replace(/\\\\/g, '/')", src)
        self.assertIn("toLowerCase()", src)
        self.assertIn("DURATION_TOLERANCE = 0.25", src)

    def test_korean_stacks_name_windows_faces(self):
        lockup = read(os.path.join(PLUGIN, "assets", "title-lockup.tsx"))
        for face in ("Malgun Gothic", "Batang", "Noto Sans KR", "Noto Serif KR", "Apple SD Gothic Neo", "AppleMyungjo"):
            self.assertIn('"' + face + '"', lockup)
        self.assertIn("actualBoundingBoxAscent", lockup)
        self.assertIn('scrollbarGutter: "stable"', self.source)

    def test_manifest_lists_windows(self):
        manifest = json.loads(read(os.path.join(PLUGIN, "plugin.json")))
        self.assertIn("Windows x64", manifest["compatibility"]["platforms"])
        self.assertIn("macOS arm64", manifest["compatibility"]["platforms"])
        self.assertNotIn("runtime.sh", manifest["files"])
        self.assertFalse(os.path.exists(os.path.join(PLUGIN, "runtime.sh")))
        for name in ("README.md", "INSTALL.md"):
            text = read(os.path.join(PLUGIN, name))
            self.assertNotRegex(text, r"(?i)brew install|install (ffmpeg|node)|nvm\b|runtime\.sh", name)
            self.assertIn("Windows", text, name)

    def test_version_matches_panel(self):
        # Selects updates an install only when the version changes, so the panel's provenance must name it too.
        manifest = json.loads(read(os.path.join(PLUGIN, "plugin.json")))
        self.assertIn('const PLUGIN_VERSION = "%s";' % manifest["version"], read(PANEL))

    def test_shared_static_checks(self):
        check_no_posix_shell(self, "mini-vlog")
        check_manifest_and_docs(self, "mini-vlog")


if __name__ == "__main__":
    unittest.main()
