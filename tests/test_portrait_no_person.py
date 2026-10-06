"""Shot-local matte fallback, without installing or invoking the RVM model."""
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

try:
    import numpy as np
    import PIL
except ImportError:
    np = None

PLUGIN = Path(__file__).resolve().parents[1] / 'plugins/portrait-beat-montage'


@unittest.skipIf(np is None, 'numpy and Pillow required')
class PlainFootageTest(unittest.TestCase):
    def setUp(self):
        spec = importlib.util.spec_from_file_location('portrait_pipeline', PLUGIN / 'pipeline.py')
        self.p = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.p)
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.p.DATA = self.root

    def test_matte_quality_failure_is_distinct_from_setup_and_ffmpeg_errors(self):
        p = self.p
        with patch.object(p, 'rvm_launcher', return_value=None):
            with self.assertRaisesRegex(RuntimeError, 'not set up'):
                p.mattes('source', self.root)
        with patch.object(p, 'rvm_launcher', return_value=self.root), patch.object(p.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0, '{"result":"alpha.webm"}')), patch.object(p.Image, 'open', return_value=p.Image.new('L', (p.W, p.H), 0)):
            with self.assertRaises(p.PersonMatteUnavailable):
                p.mattes('source', self.root)
        (self.root / 'rvm').mkdir()
        log = self.root / 'rvm' / 'unit.launcher.log'
        with patch.object(p, 'rvm_launcher', return_value=self.root), patch.object(p.subprocess, 'run', side_effect=subprocess.CalledProcessError(1, 'rvm', output='{"error":"benchmark.py returned non-zero exit status 1"}')):
            log.write_text('RuntimeError: No foreground was detected; inspect the preserved job instead of importing it')
            with self.assertRaises(p.PersonMatteUnavailable):
                p.mattes('source', self.root)
            log.write_text('AssertionError: Decoder failed')
            with self.assertRaises(subprocess.CalledProcessError) as caught:
                p.mattes('source', self.root)
            self.assertNotIsInstance(caught.exception, p.PersonMatteUnavailable)
        with patch.object(p, 'rvm_launcher', return_value=self.root), patch.object(p.subprocess, 'run', side_effect=[subprocess.CompletedProcess([], 0, '{"result":"alpha.webm"}'), subprocess.CalledProcessError(1, 'ffmpeg')]):
            with self.assertRaises(subprocess.CalledProcessError):
                p.mattes('source', self.root)

    def test_fallback_unit_cache_assembly_and_worker_count(self):
        p = self.p
        source = self.root / 'input.mp4'
        source.touch()
        plan = {'runId': 'test', 'units': {'u': {'path': str(source), 'start': .2, 'width': p.W, 'height': p.H}}, 'slots': ['u'] * len(p.LENGTHS)}
        # Small decoded frames keep the test cheap; production time mapping is unchanged.
        frames = np.stack([np.full((4, 4, 3), i * 3, np.uint8) for i in range(p.SRC_FRAMES)])
        def render(cmd, **kw):
            Path(cmd[-1]).touch()
        writes = {}
        class Encoder:
            def __init__(self, path, fps):
                self.count = 0
                self.name = path.name
                writes[self.name] = []
            def write(self, frame):
                self.count += 1
                writes[self.name].append(frame.copy())
            def close(self):
                pass
        with patch.object(p, 'load_plan', return_value=(self.root, plan)), patch.object(p, 'run', side_effect=render), patch.object(p, 'decode', return_value=frames), patch.object(p, 'mattes', side_effect=p.PersonMatteUnavailable('no person')):
            self.assertFalse(p.op_unit({'runId': 'test', 'key': 'u'})['cached'])
            post = np.load(self.root / 'u/post-held.npy')
            expected = np.stack([np.uint8(p.interp_frame(frames, p.positions[i])) for i in range(p.POST)])
            np.testing.assert_array_equal(post, expected)
            self.assertEqual(p.fallback_count(self.root, plan), 15)
            # A new run reuses the fallback marker and frames, with no RVM request.
            other = self.root / 'other'
            other.mkdir()
            with patch.object(p, 'load_plan', return_value=(other, plan)):
                self.assertTrue(p.op_unit({'runId': 'test', 'key': 'u'})['cached'])
                self.assertTrue((other / 'u/plain.json').exists())
            with patch.object(p, 'Encoder', Encoder), patch.object(p, 'W', 4), patch.object(p, 'H', 4), patch.object(p, 'X', np.zeros((4, 4))), patch.object(p, 'Y', np.zeros((4, 4))), patch.object(p, 'scale_center', side_effect=lambda f, s: f), patch.object(p, 'flash', side_effect=lambda f, a, w: f):
                manifest = p.op_assemble({'runId': 'test', 'master': True})
            self.assertEqual(manifest['plainShots'], 15)
            for clip in manifest['clips']:
                self.assertEqual(len(writes[clip['name'] + '.mp4']), clip['frames'])
            first = writes['master-60fps.mp4'][p.BLACK:p.BLACK + p.POST]
            np.testing.assert_array_equal(first, expected)
            with patch.object(p.subprocess, 'Popen') as spawn:
                spawn.return_value.poll.return_value = 0
                p.op_work({'runId': 'test'})
            self.assertEqual(json.loads((self.root / 'units.exit').read_text()), {'failed': [], 'plainShots': 15})
