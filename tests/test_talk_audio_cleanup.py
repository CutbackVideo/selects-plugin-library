"""Talk Audio Cleanup's decision rules and feature shape, without the trained model."""
import importlib.util
from pathlib import Path
import sys
import unittest

try:
    import numpy as np
    import scipy  # noqa: F401
except ImportError:
    np = None

ENGINE = Path(__file__).resolve().parents[1] / 'plugins/talk-audio-cleanup/engine'


def load(name):
    sys.path.insert(0, str(ENGINE))
    try:
        spec = importlib.util.spec_from_file_location(f'talk_audio_cleanup_{name}', ENGINE / f'{name}.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    finally:
        sys.path.remove(str(ENGINE))


class FakeModel:
    """Says 'cut' for the frames it was told to, with the given certainty."""
    classes_ = [0, 1, 2, 3]

    def __init__(self, cut_frames, certainty):
        self.cut_frames, self.certainty = cut_frames, certainty

    def predict_proba(self, X):
        P = np.zeros((len(X), 4), np.float32)
        P[:, 0] = 1
        for f in self.cut_frames:
            P[f] = [1 - self.certainty, self.certainty, 0, 0]
        return P


@unittest.skipIf(np is None, 'numpy and scipy required')
class DecisionRulesTest(unittest.TestCase):
    def setUp(self):
        self.analyze, self.features = load('analyze'), load('features')
        rng = np.random.default_rng(0)
        # 4 s of quiet room noise with one sharp click in frame 60
        x = (rng.standard_normal(4 * 48000) * 20).astype(np.int16)
        x[60 * 1600 + 800: 60 * 1600 + 830] += 6000
        self.pcm = np.stack([x, x], axis=1)

    def test_self_check(self):
        self.analyze.self_check()

    def test_features_are_one_row_per_frame_and_see_the_click(self):
        F, n = self.features.extract(self.pcm, 0)
        self.assertEqual(n, 120)
        self.assertTrue(all(len(v) == n for v in F.values()))
        self.assertEqual(int(np.argmax(F['high_max@0'])), 60)
        self.assertGreater(F['high_max@0'][60], 20)

    def test_a_sure_cut_stays_a_cut_and_reports_source_time(self):
        edl = self.analyze.build(self.pcm, FakeModel([60], 0.9), ['high_max@0'], source_start=10.0)
        self.assertEqual([(i['action'], i['rule'], i['frames']) for i in edl['items']], [('delete', 'blemish', 1)])
        self.assertAlmostEqual(edl['items'][0]['start'], 12.0)
        self.assertAlmostEqual(edl['secondsCut'], 0.03, places=2)

    def test_an_unsure_one_frame_cut_becomes_a_mute(self):
        edl = self.analyze.build(self.pcm, FakeModel([60], 0.28), ['high_max@0'])
        self.assertEqual([(i['action'], i['rule'], i['gainDb']) for i in edl['items']], [('mute', 'click', -60.0)])

    def test_a_proposal_on_clean_room_noise_is_dropped(self):
        edl = self.analyze.build(self.pcm, FakeModel([20, 21, 22], 0.9), ['high_max@0'])
        self.assertEqual(edl['items'], [])


if __name__ == '__main__':
    unittest.main()
