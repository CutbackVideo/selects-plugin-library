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
            for call in ("kokoroSetupShell(", "runSpeechJob(sdk,pid,LOCAL_TTS_PY", "kokoroPython("):
                at = body.find(call)
                if at >= 0:
                    self.assertLess(guard, at, head + " guards " + call)
        job = self.runtime[self.runtime.index("async function runSpeechJob("):]
        job = job[: job.index("\n}\n")]
        self.assertLess(job.index("kokoroAvailable()"), job.index("kokoroPython("))

    def test_manifest_and_docs(self):
        manifest = json.loads(read(os.path.join(PLUGIN, "plugin.json")))
        self.assertIn("macOS development builds", manifest["compatibility"]["platforms"])
        self.assertNotEqual(manifest["version"], "0.1.0-alpha.2")
        install = read(os.path.join(PLUGIN, "INSTALL.md"))
        self.assertIn("macOS only", install)
        self.assertNotIn("brew ", install)


if __name__ == "__main__":
    unittest.main()
