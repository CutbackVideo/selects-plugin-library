"""Static Windows checks for vlog-edit (a skill with no panel): the agent is told that run_shell is
cmd.exe on Windows and how to detach the sheet server there, and Windows x64 is declared."""
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from windows_static import check_manifest_and_docs, plugin_dir, read

PLUGIN = "vlog-edit"


class VlogEditWindowsTest(unittest.TestCase):
    def test_skill_has_the_windows_shell_line(self):
        skill = read(os.path.join(plugin_dir(PLUGIN), "SKILL.md"))
        self.assertIn("On Windows `run_shell` is cmd.exe", skill)
        self.assertIn('`start "" /b <command>`', skill)

    def test_skill_ships_no_code(self):
        manifest = json.loads(read(os.path.join(plugin_dir(PLUGIN), "plugin.json")))
        self.assertFalse([f for f in manifest.get("files", []) if f.endswith((".js", ".mjs", ".cjs", ".tsx", ".py", ".sh"))])

    def test_manifest_and_docs(self):
        check_manifest_and_docs(self, PLUGIN)


if __name__ == "__main__":
    unittest.main()
