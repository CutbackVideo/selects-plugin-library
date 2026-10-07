"""Cross-platform Jude shared AI routing and public host boundaries."""
import json
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
class JudeWindowsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.text=(ROOT/'plugins/jude-kinetic-style/panel.tsx').read_text()
    def test_inference_uses_shared_sdk_on_both_platforms(self):
        for value in ["task:'faces.detect'","task:'person.matte'",'importSharedAiVideo(',"await judeSharedFaces(","await judeSharedSprites("]:
            self.assertIn(value,self.text)
        for retired in ['osascript','vision-helper.js','env.node()','runShell(','WINDOWS_NOTE']:
            self.assertNotIn(retired,self.text)
    def test_keeps_sprite_geometry_and_soft_inversion(self):
        for value in ['format=gray,negate,tile=','alphamerge','libwebp','coverage:levels.reduce','f.box.xmin/w','f.box.ymin/h']:
            self.assertIn(value,self.text)
    def test_source_clock_joins_the_saved_main_binding(self):
        for value in ['canonicalResourceBindings(','getDraftCore','w.sourceResourceId===persistentSources[c.clipId]','sourceStartFrame/sourceFps','playbackRate']:
            self.assertIn(value,self.text)
    def test_camera_cut_audio_and_caption_paths_remain(self):
        for value in ['detectCuts(ranges,',"scale=320:-2,select='gt(scene,",'runFFmpeg(args,true,','placeMusic(',"hostJoin(pluginDir,'assets',MUSIC.file+'.b64')",'Jude Kinetic: framing','addMotionGraphic(']:
            self.assertIn(value,self.text)
    def test_installed_package_has_no_private_inference_runtime(self):
        manifest=json.loads((ROOT/'plugins/jude-kinetic-style/plugin.json').read_text())
        self.assertEqual(manifest['version'],'0.4.8')
        self.assertEqual(manifest['compatibility']['platforms'],['macOS arm64','Windows x64'])
        for old in ['engine.mjs','runtime.sh','vision-helper.js']:self.assertNotIn(old,manifest['files'])
