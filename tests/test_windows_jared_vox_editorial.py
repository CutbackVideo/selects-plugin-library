"""Jared's portable host path and executable Windows regressions (no live Selects required)."""
import json
from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / 'plugins/jared-vox-editorial'


class JaredWindowsTest(unittest.TestCase):
    def test_runtime_contract(self):
        panel = (PLUGIN / 'panel.tsx').read_text()
        for forbidden in ['sdk.runShell', '.downloadFile(', '-pattern_type', 'getStartTime(', 'metaKey']:
            self.assertNotIn(forbidden, panel)
        self.assertIsNone(re.search(r'instanceof\s+(?:ArrayBuffer|Uint8Array)',
                                    re.sub(r'//[^\n]*', '', panel)))
        self.assertIn('scrollbar-gutter: stable', panel)
        manifest = json.loads((PLUGIN / 'plugin.json').read_text())
        self.assertIn('Windows x64', manifest['compatibility']['platforms'])

    def test_host_network_paths_filters_and_draft_rates(self):
        capability = subprocess.run(
            ['node', '-e', "process.exit(typeof require('node:module').stripTypeScriptTypes === 'function' ? 0 : 1)"],
            cwd=ROOT, capture_output=True, timeout=10)
        if capability.returncode:
            self.skipTest('Node 22+ required; the Vox style CI matrix runs these cases after setup-node')
        result = subprocess.run(['node', '--test', 'tests/jared_vox_editorial_windows.test.mjs'],
                                cwd=ROOT, text=True, capture_output=True, timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
