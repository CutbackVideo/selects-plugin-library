"""Static Windows checks for the iMessage Generator panel.

The chat overlay is built through runScript only, so it works on Windows. Local Kokoro narration needs Python, a venv
and a POSIX shell: on Windows it is disabled with an "Available on macOS for now" note and ElevenLabs is the default.
Every Kokoro shell/Python piece lives inside `// mac-only:start` ... `// mac-only:end` and is reached only when
`kokoroAvailable()` (= !hostIsWindows()). IMESSAGE_GENERATOR_PANEL overrides the panel path (to check an older panel fails).
"""
import json
import os
import re
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGIN = os.path.join(ROOT, "plugins", "imessage-generator")
PANEL = os.environ.get("IMESSAGE_GENERATOR_PANEL") or os.path.join(PLUGIN, "panel.tsx")

AV_HOST = re.compile(r"// av-host:start\n.*?// av-host:end\n", re.S)
MAC_ONLY = re.compile(r"// mac-only:start\n.*?// mac-only:end\n", re.S)
HOST_NAMES = ["hostError", "hostDI", "hostApi", "hostNeed", "hostIsWindows", "hostJoin", "hostBytes", "hostReadBytes",
              "hostReadText", "hostRemove", "hostRoots", "hostDecodePcm", "hostProbeSeconds"]


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def runtime_text(source):
    """The panel without the kit's av-host block, mac-only regions and whole-line comments."""
    text = MAC_ONLY.sub("", AV_HOST.sub("", source))
    return "\n".join(line for line in text.split("\n") if not line.lstrip().startswith("//"))


def body_of(text, head):
    start = text.index(head)
    end = text.find("\n  async function ", start + len(head))
    return text[start:] if end < 0 else text[start:end]


class IMessageGeneratorWindowsTest(unittest.TestCase):
    def setUp(self):
        self.source = read(PANEL)
        self.runtime = runtime_text(self.source)
        self.mac = "".join(MAC_ONLY.findall(self.source))

    def test_av_host_block_defines_the_host_helpers(self):
        block = AV_HOST.search(self.source)
        self.assertIsNotNone(block, "panel has no av-host block")
        for name in HOST_NAMES:
            self.assertRegex(block.group(0), r"(?m)^(?:async )?function " + name + r"\(", name)

    def test_kokoro_shell_and_python_are_mac_only(self):
        for name in ("const LOCAL_TTS_PY", "const SETUP_KOKORO_PY", "function kokoroSetupShell(", "function kokoroPython("):
            self.assertIn(name, self.mac, name)
            self.assertNotIn(name, self.runtime, name)
        self.assertNotIn("'venv','bin','python'", self.runtime)
        self.assertNotIn("SETUP_KOKORO_PY", self.runtime)
        self.assertIn("function kokoroAvailable(){return !hostIsWindows();}", self.runtime)

    def test_kokoro_is_unreachable_on_windows(self):
        self.assertIn("voiceProvider:kokoroAvailable()?DEFAULTS.voiceProvider:'elevenlabs'", self.runtime)
        self.assertIn("{value:'kokoro',disabled:!kokoroAvailable()}", self.runtime)
        self.assertIn("const MAC_ONLY_NOTE='Available on macOS for now';", self.runtime)
        for head in ("async function loadLocalVoices(", "async function setupEngine(", "async function generateVoices(",
                     "async function audition("):
            body = body_of(self.runtime, head)
            guard = body.find("kokoroAvailable()")
            self.assertGreaterEqual(guard, 0, head)
            for call in ("kokoroSetupShell(", "runKokoroJob(", "kokoroPython("):
                at = body.find(call)
                if at >= 0:
                    self.assertLess(guard, at, head + " guards " + call)
        job = self.mac[self.mac.index("async function runKokoroJob("):]
        job = job[: job.index("\n}\n")]
        self.assertLess(job.index("kokoroAvailable()"), job.index("runShell("))

    def test_no_shell_or_python_outside_mac_only(self):
        self.assertEqual(self.runtime.count("runShell("), 0)
        self.assertIsNone(re.search(r"\bpython3?\b", self.runtime), "python spawn")
        for needle in ("IO_PY", "AUDIO_PROCESS_PY", "runIO(", "runSpeechJob(", "shellQuote(", "mkdir -p", "printf",
                       "$HOME", "rm -f", "base64 ", "shasum", "command -v", "export PATH", "2>/dev/null"):
            self.assertNotIn(needle, self.runtime, needle)

    def test_workspace_uses_host_filesystem_with_a_normalized_guard(self):
        io = self.runtime[self.runtime.index("async function workspaceIO("):]
        io = io[: io.index("\n}\n")]
        for part in ("hostNeed('FileSystem','homedir')", "mkdirSync(", "writeFile(", "hostReadText(", "hostReadBytes(",
                     "wsInside(p,r)"):
            self.assertIn(part, io, part)
        norm = self.runtime[self.runtime.index("function wsNorm("):]
        norm = norm[: norm.index("\n")]
        for part in ("normalize(s)", ".normalize('NFC')", "replace(/\\\\/g,'/')", "hostIsWindows()", "toLowerCase()"):
            self.assertIn(part, norm, part)
        self.assertIn("function joinPath(...parts){return hostJoin(...parts);}", self.runtime)
        self.assertNotIn("startsWith(joinPath(paths.base,'voice-'))", self.runtime)
        self.assertNotRegex(self.runtime, r"\.path===", "exact host path compare")

    def test_normalize_and_mix_run_in_the_panel_with_host_ffmpeg(self):
        section = self.runtime[self.runtime.index("function wavInfo("):self.runtime.index("async function elevenRequest(")]
        self.assertIn("'-ac','1','-ar','44100','-c:a','pcm_s16le'", section)
        self.assertIn("crypto.subtle.digest('SHA-256'", section)
        self.assertIn("'imessage-narration-'+mixKey.slice(0,32)+'.wav'", section)
        self.assertIn("hostNeed('Runtime','runFFmpeg').runFFmpeg(argv,true,signal)", self.runtime)
        self.assertIn("normalizeVoices(panelAudioIO(sdk),root,raw,controller.signal)", self.runtime)
        self.assertIn("return mixNarration(panelAudioIO(sdk),root,plan.duration,", self.runtime)

    def test_manifest_and_docs(self):
        manifest = json.loads(read(os.path.join(PLUGIN, "plugin.json")))
        self.assertIn("macOS development builds", manifest["compatibility"]["platforms"])
        self.assertIn("Windows x64", manifest["compatibility"]["platforms"])
        self.assertNotEqual(manifest["version"], "0.1.0-alpha.2")
        install = read(os.path.join(PLUGIN, "INSTALL.md"))
        self.assertIn("macOS only", install)
        self.assertNotIn("brew ", install)


if __name__ == "__main__":
    unittest.main()
