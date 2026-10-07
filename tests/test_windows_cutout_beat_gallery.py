"""Beat Cutout Gallery shares its local RVM path, worker and FFmpeg across platforms."""
import json
from pathlib import Path
import re
import unittest
from windows_static import assert_no_shell_token
ROOT=Path(__file__).resolve().parents[1]
PLUGIN=ROOT/'plugins/cutout-beat-gallery'
HOST_BLOCK=re.compile(r'// av-host:start\n.*?// av-host:end',re.S)
MAC_ONLY=re.compile(r'^[ \t]*// mac-only:start[ \t]*\n.*?^[ \t]*// mac-only:end[ \t]*$',re.S|re.M)
def top_level(text,name):
    start=re.search(r'^(?:async function|function|const) '+re.escape(name)+r'\b',text,re.M)
    if not start: raise AssertionError(name)
    body=text.index('\n',start.end());end=re.search(r'^\S',text[body+1:],re.M)
    return text[start.start():body+1+(end.start() if end else len(text))]
class CutoutBeatGalleryWindowsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text=(PLUGIN/'panel.tsx').read_text();cls.portable=MAC_ONLY.sub('',cls.text)
        cls.manifest=json.loads((PLUGIN/'plugin.json').read_text())
    def test_shared_host_adapter_is_unchanged(self):
        reference=(ROOT/'plugins/archive-vlog/panel.tsx').read_text()
        self.assertEqual(HOST_BLOCK.search(self.text).group(0),HOST_BLOCK.search(reference).group(0))
    def test_general_path_has_no_python_swift_or_paid_cloud(self):
        for token in ['swiftc','foreground-mask','mg.submit(','selects.generation.','runShell(','python3']:
            with self.subTest(token=token): self.assertNotIn(token,self.portable)
        self.assertNotIn('pending.frames',self.text)
        self.assertNotIn('sendCloud',self.text)
    def test_analysis_uses_images_with_original_resource_ids(self):
        cut=top_level(self.text,'winCutouts')
        self.assertIn('await photoAiMatte(sdk,pid,f,{client,control})',cut)
        self.assertIn('resourceId:photo.resourceId,path:photo.path',top_level(self.text,'winFrames'))
        self.assertIn("task:'person.matte'",top_level(self.text,'photoAiMatte'))
        self.assertNotIn('subject_is_person',cut)
        self.assertIn('cover:true',cut)
        self.assertIn('selects.files.pathFromLocalUrl(',self.text)
    def test_saved_jobs_and_explicit_cancel(self):
        self.assertIn('sdk.storage.getItem(key)',self.text)
        self.assertIn('sdk.storage.setItem(key,JSON.stringify(journal))',self.text)
        self.assertIn('ctl.ai.cancel({identity:ctl.aiIdentity})',self.text)
        self.assertIn('ctl.observer?.abort()',self.text)
        self.assertIn('{busy&&<ui.Actions>',self.text)
    def test_existing_alpha_encoders_and_scene_timings_remain(self):
        cut=top_level(self.text,'winCutouts');enc=top_level(self.text,'encoders')
        self.assertIn("'-write_tmcd','0'",cut)
        for codec in ['prores_ks','qtrle','png','libx264','mpeg4']: self.assertIn("'"+codec+"'",enc)
        self.assertIn("'fixed-bgm.mp3'",cut)
    def test_worker_has_no_inference_or_network(self):
        engine=(PLUGIN/'cutout-engine.js').read_text()
        runtime='\n'.join(line for line in engine.splitlines() if not line.lstrip().startswith('//'))
        self.assertNotRegex(runtime,r'\brequire\(|^\s*import\s|\bfetch\(|runShell')
        self.assertIn('cover ? fit(src, W, H, "lanczos")',engine)
        self.assertIn('cutout-engine.js',self.manifest['files'])
    def test_docs_and_package_do_not_require_legacy_model(self):
        self.assertIn('Windows x64',self.manifest['compatibility']['platforms'])
        self.assertNotIn('foreground-mask.swift',self.manifest['files'])
        install=(PLUGIN/'INSTALL.md').read_text()
        self.assertIn('selects-ai-runtime',install)
        self.assertIn('No uploads or Selects credits',install)
        self.assertIn('objects and animals',install)
    def test_thumbnail_and_scroll_behavior_is_shared(self):
        effect=self.text[self.text.index('React.useEffect(()=>{\n    const chosen'):]
        effect=effect[:effect.index('},[sdk,folder,rows]);')]
        self.assertIn('canvasThumb(x.path)',effect);self.assertNotIn('runShell',effect)
        self.assertEqual(self.text.count("overflowY:'auto'"),self.text.count("scrollbarGutter:'stable'"))
if __name__=='__main__': unittest.main()
