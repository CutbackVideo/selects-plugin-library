"""The same local AI and editor-native transition path runs on macOS and Windows."""
import json
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
PLUGIN=ROOT/'plugins/portrait-beat-montage'
class PortraitBeatMontageWindowsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.text=(PLUGIN/'panel.tsx').read_text()
    def test_shared_matting_preserves_exact_cropped_source_clock(self):
        for value in ['pbmSharedMattes(','importSharedAiVideo(',"task:\"person.matte\"",'endSeconds:MATTE_FRAMES/FPS','frames:MATTE_FRAMES','MATTE_FRAMES*W*H','prepareSharedAiVideoFrames(']:self.assertIn(value,self.text)
        for old in ['runShell(', 'pbmCloudMattes(', 'selects.generation','async function runSetup(','async function macMontage(']:self.assertNotIn(old,self.text)
    def test_postprocessing_and_audio_still_exist(self):
        for value in ['await kernels("unit"','pbmAssemble(','ASSET_SECONDS','plainText(language, manifest.plainShots)','setFrameSize','music-bed.wav']:
            self.assertIn(value,self.text)
    def test_cancel_detaches_or_requests_cancel_explicitly(self):
        self.assertIn('cancel.current?.abort("user-cancel")',self.text)
        self.assertIn('client.cancel({identity:unit.key})',self.text)
        self.assertIn('React.useEffect(() => () => cancel.current?.abort(), [])',self.text)
    def test_package_is_shared_and_no_generation_credits_are_used(self):
        m=json.loads((PLUGIN/'plugin.json').read_text());self.assertEqual(m['version'],'0.1.13');self.assertFalse(m['usesCredits'])
        self.assertFalse(any(f.startswith('rvm/') or f=='pipeline.py' for f in m['files']))
        self.assertEqual(m['compatibility']['platforms'],['macOS arm64','Windows x64'])
