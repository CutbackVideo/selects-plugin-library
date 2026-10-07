"""Travel Beat Vlog uses the same shared image-matte path on Windows and macOS."""
import json
from pathlib import Path
import re
import unittest
from windows_static import assert_no_shell_token
ROOT = Path(__file__).resolve().parents[1]
PANEL = ROOT / 'plugins/travel-beat-vlog/panel.tsx'
REFERENCE = ROOT / 'plugins/archive-vlog/panel.tsx'
BLOCK = re.compile(r'^// av-host:start\n.*?^// av-host:end\n', re.S | re.M)
FORBIDDEN = ['mkdir -p', '$HOME', '$SELECTS_USER', 'swiftc', 'osascript', 'tools/cutout.js']
class TravelBeatVlogWindows(unittest.TestCase):
    def setUp(self):
        self.text = PANEL.read_text()
    def test_shared_local_host_block_is_unchanged(self):
        self.assertEqual(BLOCK.search(self.text).group(0), BLOCK.search(REFERENCE.read_text()).group(0))
    def test_no_platform_shell_inference(self):
        for token in FORBIDDEN:
            with self.subTest(token=token): assert_no_shell_token(self, token, self.text)
        self.assertNotIn('runShell(', self.text)
    def test_windows_keeps_the_subject_overlay_and_choices(self):
        self.assertIn('heroCutout(sdk,projectId,heroPhoto,cutoutMode,aiSignal,', self.text)
        self.assertNotIn('SUBJECT_MAC_ONLY', self.text)
        self.assertNotIn('disabled={busy||windows}', self.text)
        self.assertIn("value:'foreground',label:'Main subject'", self.text)
        self.assertIn('photoAiMatte(sdk,projectId,photo', self.text)
        self.assertIn('buildCutoutScript({mode:', self.text)
    def test_original_pixels_and_mask_use_bundled_media_sdk(self):
        self.assertIn('alphamerge[out]', self.text)
        self.assertIn('await ffmpeg(heroAlphaArgs(photo.path,matte.path,tmp))', self.text)
        self.assertIn('selects.files.pathFromLocalUrl(', self.text)
        self.assertIn('sharedAiResources.resolveSharedAiResources', self.text)
    def test_manifest_and_header_keep_windows(self):
        manifest=json.loads((PANEL.parent/'plugin.json').read_text())
        self.assertIn('Windows x64', manifest['compatibility']['platforms'])
        self.assertNotIn('tools/cutout.js', manifest['files'])
        self.assertIn('// @collection visual-highlights', self.text.splitlines()[:24])
        self.assertIn('selects-ai-runtime', (PANEL.parent/'INSTALL.md').read_text())
    def test_paths_compare_normalised(self):
        self.assertIn("normalize('NFC')", self.text)
if __name__ == '__main__': unittest.main()
