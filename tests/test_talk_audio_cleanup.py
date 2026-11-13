"""Talk Audio Cleanup's engine: what it measures, which sounds it reports and where it says they are."""
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


@unittest.skipIf(np is None, 'numpy and scipy required')
class RulesTest(unittest.TestCase):
    def setUp(self):
        self.analyze, self.features = load('analyze'), load('features')
        rng = np.random.default_rng(0)
        # 4 s of quiet room noise with one sharp click in frame 60
        x = (rng.standard_normal(4 * 48000) * 20).astype(np.int16)
        x[60 * 1600 + 800: 60 * 1600 + 830] += 1500     # loud for a pause, yet the frame stays under the pause line
        self.pcm = np.stack([x, x], axis=1)

    def test_self_check(self):
        self.analyze.self_check()

    def test_levels_are_one_value_per_frame_and_see_the_click(self):
        level, dirt, spiky = self.features.levels(self.pcm)
        self.assertEqual([len(level), len(dirt), len(spiky)], [120, 120, 120])
        self.assertEqual(int(np.argmax(dirt)), 60)
        self.assertGreater(dirt[60], 20)
        self.assertGreater(spiky[60], spiky[20] + 10)        # a click is far spikier inside its frame than room noise
        self.assertLess(level.max(), -40)                    # all of it is pause

    def test_a_click_in_a_pause_is_one_sound_with_its_measures_in_source_time(self):
        edl = self.analyze.build(self.pcm, source_start=10.0)
        self.assertEqual([(i['rule'], i['frames'], i['edge']) for i in edl['items']], [('sound', 1, None)])
        it = edl['items'][0]
        self.assertAlmostEqual(it['start'], 12.0)
        self.assertGreater(it['loud'], 20)
        self.assertGreater(it['gap'], 1)                     # nothing but pause around it
        self.assertEqual(self.analyze.build(self.pcm, 10.0, words=[[11.9, 12.2]])['items'][0]['edge'] < 0, True)   # a word that covers it
        self.assertAlmostEqual(self.analyze.build(self.pcm, 10.0, words=[[11.0, 11.9]])['items'][0]['edge'], 12 + 1 / 30 - 11.9, places=4)

    def test_a_sound_right_after_speech_is_attached_and_one_inside_speech_is_not_a_sound(self):
        x = self.pcm.copy()
        t = np.arange(20 * 1600)
        x[10 * 1600: 30 * 1600] += (np.sin(t * 0.05) * 8000).astype(np.int16)[:, None]           # speech in frames 10-29
        hiss = (np.random.default_rng(1).standard_normal(6 * 1600) * 150).astype(np.int16)
        x[30 * 1600: 36 * 1600] += hiss[:, None]                                                  # a breath right after it
        x[20 * 1600 + 800: 20 * 1600 + 830] += 6000                                               # a click inside the speech
        items = self.analyze.build(x)['items']
        self.assertEqual([round(i['start'] * 30) for i in items], [30, 60])
        self.assertEqual((items[0]['frames'], items[0]['gap']), (6, 0))
        self.assertLess(items[0]['spiky'], items[1]['spiky'])                                     # the breath is blunter than the click

    def test_blocks_give_the_same_answer_as_the_whole_recording(self):
        whole = self.analyze.build(self.pcm)
        self.assertEqual([i['frames'] for i in whole['items']], [1])
        self.analyze.BLOCK, self.analyze.MARGIN = 60, 30   # the click is the first frame of the second block
        try:
            parts = self.analyze.build(self.pcm)
            self.assertEqual([(i['start'], i['frames'], i['gap']) for i in parts['items']], [(i['start'], i['frames'], i['gap']) for i in whole['items']])
            self.assertAlmostEqual(parts['items'][0]['loud'], whole['items'][0]['loud'], delta=1.0)   # the floor is tracked over 4 s, so a block with 1 s of context reads it slightly differently
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

    def test_an_opener_cut_replaces_the_sounds_under_it(self):
        openers = self.analyze.openers
        self.analyze.openers = lambda pcm, triples, source_start: [dict(start=1.9, end=2.1, frames=6, action='delete', rule='opener', confidence=1.0)]
        try: items = self.analyze.build(self.pcm)['items']
        finally: self.analyze.openers = openers
        self.assertEqual([i['rule'] for i in items], ['opener'])

    def test_each_item_says_where_its_sound_is_in_the_wav_and_how_to_draw_it(self):
        pcm = np.zeros((48000 * 4, 2), np.int16); pcm[48000 * 2: 48000 * 2 + 4800] = 20000          # a loud tenth of a second at 2.0 s
        items = [dict(start=12.0, end=12.1, frames=3), dict(start=10.2, end=10.3, frames=3)]        # source time; the file starts at 10 s
        self.analyze.shapes(pcm, items, 10.0)
        first, second = items
        a, n, lo, hi = first['snip']
        self.assertEqual((a, n, lo, hi), (48000, 48000 * 2 + 4800, 48000, 48000 + 4800))           # a second either side, counted in 48 kHz samples
        self.assertGreater(np.abs(pcm[a + lo: a + hi]).min(), 15000); self.assertEqual(np.abs(pcm[a: a + lo]).max(), 0)   # the loud part is where it says
        self.assertEqual(second['snip'][:3], [0, round(1.3 * 48000), round(0.2 * 48000)])           # near the start of the file the lead-in is shorter
        self.assertEqual(len(first['shape']), 100); self.assertTrue(580 <= max(first['shape']) <= 680); self.assertEqual(min(first['shape']), 0)   # linear peaks, 1000 = full scale

    def test_runs(self):
        self.assertEqual([(int(a), int(b)) for a, b in self.features.runs(np.array([0, 1, 1, 0, 1], bool))], [(1, 3), (4, 5)])


if __name__ == '__main__':
    unittest.main()
