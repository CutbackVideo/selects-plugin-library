"""Static Windows checks for Card News Maker.

Every shell command goes through one `shell()` helper, which writes a cmd.exe batch file on Windows,
and each command has an IS_WIN branch. The Windows side uses no POSIX syntax and names its tools by
full path (the batch file's PATH holds only System32). Opening the export folder uses the host's
own reveal first.
"""
import json
import os
import re
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGIN = os.path.join(ROOT, "plugins", "card-news-maker")
PANEL = os.path.join(PLUGIN, "panel.tsx")

POSIX = ["'", "$(", "$HOME", "${", "mkdir -p", "printf", "rm -f", "| base64", "2>/dev/null", "&&"]


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def body(source, head):
    start = source.index(head)
    return source[start: source.index("\n  }\n", start)]


class CardNewsMakerWindowsTest(unittest.TestCase):
    def setUp(self):
        self.source = read(PANEL)

    def test_one_shell_helper_with_a_batch_wrapper(self):
        self.assertEqual(self.source.count("runShell("), 1)
        helper = body(self.source, "const shell = async (")
        self.assertIn('IS_WIN ? "@echo off\\r\\n"', helper)

    def test_every_shell_call_branches_on_windows(self):
        calls = [m.start() for m in re.finditer(r"\bawait shell\(", self.source)]
        self.assertTrue(calls)
        for at in calls:
            context = self.source[self.source.rfind("\n", 0, self.source.rfind("\n", 0, at)): at + 200]
            self.assertIn("IS_WIN ?", context, self.source[at: at + 80])

    def test_windows_commands_have_no_posix_syntax(self):
        commands = re.findall(r"IS_WIN \? `([^`]*)`", self.source)
        self.assertGreaterEqual(len(commands), 2)
        for cmd in commands:
            text = re.sub(r"\$\{(wq|qa)\([^}]*\)\}", "", cmd)
            for needle in POSIX:
                self.assertNotIn(needle, text, cmd)
            self.assertRegex(cmd, r'^"%SystemRoot%\\\\', "tool not named by full path: " + cmd)

    def test_open_folder_uses_the_host_reveal_first(self):
        fn = body(self.source, "async function openFolder(")
        self.assertLess(fn.index("showItemInFolder"), fn.index("await shell("))
        self.assertIn('typeof rt?.showItemInFolder === "function"', fn)

    def test_manifest_and_docs(self):
        manifest = json.loads(read(os.path.join(PLUGIN, "plugin.json")))
        self.assertIn("Windows x64", manifest["compatibility"]["platforms"])
        for doc in ("INSTALL.md", "README.md"):
            text = read(os.path.join(PLUGIN, doc)).lower()
            self.assertNotIn("brew ", text, doc)
            self.assertNotIn("nvm", text, doc)


if __name__ == "__main__":
    unittest.main()
