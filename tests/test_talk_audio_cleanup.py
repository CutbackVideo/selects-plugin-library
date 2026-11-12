"""Talk Audio Cleanup's decision rules and feature shape, without the trained model."""
import importlib.util
import os
from pathlib import Path
import sys
import unittest

try:
    import numpy as np
    import scipy  # noqa: F401
except ImportError:
    if os.environ.get('TALK_AUDIO_CLEANUP_STRICT'):
        raise  # the CI step that installs the requirements must not skip
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
    """Gives the frames it was told about the given class (1 cut, 2 mute, 3 lower) with the given certainty."""
    classes_ = [0, 1, 2, 3]

    def __init__(self, frames, certainty, kind=1):
        self.frames, self.certainty, self.kind = frames, certainty, kind

    def predict_proba(self, X):
        P = np.zeros((len(X), 4), np.float32)
        P[:, 0] = 1
        for f in self.frames:
            P[f] = 0
            P[f, 0], P[f, self.kind] = 1 - self.certainty, self.certainty
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
        self.assertEqual([(i['action'], i['rule']) for i in edl['items']], [('mute', 'click')])

    def test_a_proposal_on_clean_room_noise_is_dropped(self):
        edl = self.analyze.build(self.pcm, FakeModel([20, 21, 22], 0.9), ['high_max@0'])
        self.assertEqual(edl['items'], [])


    def test_an_unsure_cut_is_muted_up_to_two_frames_and_lowered_from_three(self):
        P = np.zeros((20, 4), np.float32)
        P[:, 0] = 1
        P[4:6] = P[10:13] = [0.72, 0.28, 0, 0]
        p = self.analyze.decide(P, np.full(20, 20.0), np.ones(20, bool))
        self.assertEqual(p[4:6].tolist(), [2, 2])
        self.assertEqual(p[10:13].tolist(), [3, 3, 3])

    def test_proposals_join_only_across_one_or_two_quiet_frames(self):
        def decide(gap, quiet_gap=True):
            P = np.zeros((20, 4), np.float32)
            P[:, 0] = 1
            P[5] = [0.1, 0.9, 0, 0]
            P[5 + gap + 1] = [0.1, 0, 0, 0.9]
            quiet = np.ones(20, bool)
            quiet[6:6 + gap] = quiet_gap
            return self.analyze.decide(P, np.full(20, 20.0), quiet).tolist()

        self.assertEqual(decide(2)[5:9], [1, 1, 1, 3])       # joined, filled with the kind on the left
        self.assertEqual(decide(3)[5:10], [1, 0, 0, 0, 3])   # three frames apart: left apart
        self.assertEqual(decide(1, quiet_gap=False)[5:8], [1, 0, 3])   # speech in the gap: left apart

    def test_a_breath_is_lowered_and_a_loud_hissy_one_is_muted(self):
        def with_hiss(amplitude):
            x = self.pcm.copy()
            hiss = (np.random.default_rng(1).standard_normal(6 * 1600) * amplitude).astype(np.int16)
            x[20 * 1600: 26 * 1600] += hiss[:, None]
            return self.analyze.build(x, FakeModel(range(20, 26), 0.9, kind=3), ['high_max@0'])

        edl = with_hiss(120)   # stands out of the room noise, but stays under -46 dBFS
        self.assertEqual([(i['action'], i['rule'], i['frames']) for i in edl['items']], [('lower', 'breath', 6)])
        self.assertEqual(edl['counts'], {'blemish': 0, 'breath': 1, 'sniff': 0, 'click': 0, 'opener': 0})
        self.assertEqual([(i['action'], i['rule']) for i in with_hiss(3000)['items']], [('mute', 'sniff')])

    def test_a_tick_the_model_calls_a_mute_is_a_click(self):
        edl = self.analyze.build(self.pcm, FakeModel([60], 0.9, kind=2), ['high_max@0'])
        self.assertEqual([(i['action'], i['rule']) for i in edl['items']], [('mute', 'click')])

    def test_blocks_give_the_same_answer_as_the_whole_recording(self):
        class ByLevel:   # decides from the feature itself, so it answers the same for any slice of frames
            classes_ = [0, 1, 2, 3]

            def predict_proba(self, X):
                P = np.zeros((len(X), 4), np.float32)
                cut = X[:, 0] > 20
                P[:, 0], P[:, 1] = np.where(cut, 0.1, 1), np.where(cut, 0.9, 0)
                return P

        whole = self.analyze.build(self.pcm, ByLevel(), ['high_max@0'])
        self.assertEqual([i['frames'] for i in whole['items']], [1])
        self.analyze.BLOCK, self.analyze.MARGIN = 60, 40   # the click is the first frame of the second block
        try:
            self.assertEqual(self.analyze.build(self.pcm, ByLevel(), ['high_max@0']), whole)
        finally:
            self.analyze.BLOCK, self.analyze.MARGIN = 3600, 300

    def test_a_lone_opener_is_cut_and_a_run_on_one_is_kept(self):
        rng = np.random.default_rng(3); pcm = (rng.standard_normal((48000 * 6, 2)) * 8).astype(np.int16)
        def tone(t0, t1, amp):
            a, b = int(t0 * 48000), int(t1 * 48000); pcm[a:b] += (np.sin(np.arange(b - a) * 0.05) * amp).astype(np.int16)[:, None]
        tone(1.00, 1.12, 6000); tone(1.25, 2.2, 12000)     # short word, 130 ms of quiet, then speech
        tone(4.00, 4.12, 6000); tone(4.12, 5.0, 12000)     # the same word running straight into speech
        cuts = self.analyze.openers(pcm, [(1.0, 1.25, 0.0), (4.0, 4.12, 3.0)], 0.0)
        self.assertEqual([c['rule'] for c in cuts], ['opener'])
        self.assertLess(abs(cuts[0]['end'] * 30 - round(cuts[0]['end'] * 30)), 1e-4)                    # on a frame boundary to well under a frame, so the panel finds its clip
        self.assertLessEqual(cuts[0]['start'], 1.0); self.assertTrue(1.12 <= cuts[0]['end'] <= 1.25)
        shifted = self.analyze.openers(pcm[48000 // 2:], [(1.0, 1.25, 0.0)], 0.5)                       # source time, not file time
        self.assertEqual((shifted[0]['start'], shifted[0]['end']), (cuts[0]['start'], cuts[0]['end']))
        self.assertEqual(self.analyze.openers(pcm, [(1.0, 1.25, 1.0)], 0.0), [])                         # glued to the previous word
        self.assertEqual(self.analyze.openers(pcm, [(1.0, 1.4, 0.0)], 0.0), [])                          # too long to be a lone opener

    def test_frame_helpers(self):
        ft = self.features
        self.assertEqual(ft.shift(np.array([1., 2, 3, 4]), 1).tolist(), [2, 3, 4, 4])
        self.assertEqual(ft.shift(np.array([1., 2, 3, 4]), -2).tolist(), [1, 1, 1, 2])
        self.assertEqual([(int(a), int(b)) for a, b in ft.runs(np.array([0, 1, 1, 0, 1], bool))], [(1, 3), (4, 5)])
        length, from_start, to_end = ft.geometry(np.array([0, 1, 1, 1, 0], bool))
        self.assertEqual((length.tolist(), from_start.tolist(), to_end.tolist()), ([0, 3, 3, 3, 0], [0, 0, 1, 2, 0], [0, 2, 1, 0, 0]))


if __name__ == '__main__':
    unittest.main()
