"""Tang Poetry Explainer portability policy and executable Windows regressions."""
import json
import re
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / 'plugins/tang-poetry-explainer'


class TangWindowsTest(unittest.TestCase):
    def test_runtime_is_shell_free(self):
        source = (PLUGIN / 'panel.tsx').read_text()
        self.assertNotIn('runShell', source)
        for syntax in ['mkdir -p', '$HOME', 'rm -f', 'export PATH', '-pattern_type', 'metaKey']:
            self.assertNotIn(syntax, source)
        runtime = '\n'.join(line for line in source.splitlines() if not line.lstrip().startswith('//'))
        self.assertNotRegex(runtime, r'''["'`]\s*(?:node|python3?|bash|sh)\s''')
        self.assertNotRegex(runtime, r'instanceof (?:ArrayBuffer|Uint8Array)')
        self.assertNotIn('getStartTime(', runtime)
        self.assertIn('scrollbar-gutter: stable', source)

    def test_packaged_graphics_have_windows_cjk_faces(self):
        source = (PLUGIN / 'panel.tsx').read_text()
        templates = json.loads(re.search(r'^const TPL: Record<string, string> = (.*);$', source, re.M)[1])
        for name, graphic in templates.items():
            for face in ['Arial', 'Malgun Gothic', 'Microsoft YaHei', 'Yu Gothic']:
                self.assertIn(face, graphic, name)

    @unittest.skipUnless(shutil.which('node'), 'Node required for panel execution')
    def test_executable_windows_regressions(self):
        available = subprocess.run(['node', '-e', "if(!require('node:module').stripTypeScriptTypes)process.exit(1)"], capture_output=True)
        if available.returncode:
            self.skipTest('Node with stripTypeScriptTypes required (22.13+)')
        result = subprocess.run(['node', '--test', 'tests/tang_poetry_windows.test.mjs'], cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
