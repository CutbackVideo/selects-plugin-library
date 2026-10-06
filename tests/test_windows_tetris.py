"""Static Windows checks for the Tetris panel.

Single player needs no shell. Two-player starts a Python relay helper through POSIX shell commands,
which cmd.exe (sdk.runShell on Windows) cannot run, so on Windows the panel shows the feature as not
available instead of a Connect button, and connect() returns before any shell call.
TETRIS_PANEL overrides the panel path (to check that an older panel fails).
"""
import json
import os
import re
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGIN = os.path.join(ROOT, "plugins", "tetris")
PANEL = os.environ.get("TETRIS_PANEL") or os.path.join(PLUGIN, "panel.tsx")


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def block(source, start):
    body = source[source.index(start):]
    return body[: body.index("\n  }, [")]


class TetrisWindowsTest(unittest.TestCase):
    def setUp(self):
        self.source = read(PANEL)

    def test_platform_comes_from_initialized_sdk(self):
        self.assertIn('IS_WINDOWS = /^win/i.test(sdk.environment.platform)', self.source)
        self.assertNotIn('getPlatform', self.source)
        self.assertNotIn('__DI__', self.source)

    def test_connect_returns_before_any_shell_on_windows(self):
        body = block(self.source, "const connect = React.useCallback(")
        self.assertIn("if (IS_WINDOWS) return;", body)
        self.assertLess(body.index("if (IS_WINDOWS) return;"), body.index("sdk.runShell("))

    def test_every_shell_call_needs_a_connection(self):
        # tick, disconnect and unmount only run after connect() succeeded (net.connected / net.dir).
        calls = [m.start() for m in re.finditer(r"sdk\.runShell\(", self.source)]
        self.assertEqual(len(calls), 4)
        for name in ("const tick = React.useCallback(", "const disconnect = React.useCallback("):
            body = block(self.source, name)
            guard = "if (!net.connected || net.busy) return;" if "tick" in name else "if (!dir) return;"
            self.assertLess(body.index(guard), body.index("sdk.runShell("), name)

    def test_windows_shows_the_feature_as_unavailable(self):
        section = self.source[self.source.index("const multiplayerSection = "):]
        section = section[: section.index(") : (")]
        self.assertIn("IS_WINDOWS ?", section)
        self.assertIn("available on macOS and Linux for now", section)
        self.assertNotIn("connect()", section)

    def test_manifest_and_docs(self):
        manifest = json.loads(read(os.path.join(PLUGIN, "plugin.json")))
        self.assertIn("Windows x64", manifest["compatibility"]["platforms"])
        self.assertNotIn("Windows is unverified", manifest["compatibility"]["selects"])
        self.assertIn("Windows", read(os.path.join(PLUGIN, "INSTALL.md")))


if __name__ == "__main__":
    unittest.main()
