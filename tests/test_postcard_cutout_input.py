"""The macOS helper accepts frame rates from streams with side data."""
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch


PLUGIN = Path(__file__).resolve().parents[1] / 'plugins/postcard-cutout-studio'
SPEC = importlib.util.spec_from_file_location('postcard_pipeline', PLUGIN / 'pipeline.py')
pipeline = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(pipeline)


class PostcardCutoutInputTest(unittest.TestCase):
    def check_rate(self, rate, expected_filter):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'subject.mov'
            source.write_bytes(b'video fixture')
            encodes = []

            def run(args, **kwargs):
                if args[0] == 'ffprobe':
                    # ffprobe's CSV includes an empty side-data field after the
                    # rate; JSON keeps that data separate from avg_frame_rate.
                    if args[args.index('-of') + 1] == 'csv=p=0':
                        stdout = rate + ',\n'
                    else:
                        stdout = json.dumps({'streams': [{
                            'avg_frame_rate': rate,
                            'side_data_list': [{'rotation': 90}],
                        }]})
                    return subprocess.CompletedProcess(args, 0, stdout=stdout, stderr='')
                self.assertEqual(args[0], 'ffmpeg')
                encodes.append(args)
                Path(args[-1]).write_bytes(b'encoded video')
                return subprocess.CompletedProcess(args, 0, stdout=b'', stderr=b'')

            with patch.object(pipeline, 'INPUT_ROOT', root / 'inputs'), \
                    patch.object(pipeline.subprocess, 'run', side_effect=run):
                result = pipeline.cutout_input({'path': str(source), 'start': 0, 'seconds': 1.6})

            self.assertEqual(len(encodes), 1)
            self.assertEqual(encodes[0][encodes[0].index('-vf') + 1], expected_filter)
            self.assertEqual(Path(result['path']).read_bytes(), b'encoded video')

    def test_high_frame_rate_with_side_data_is_limited_to_30_fps(self):
        self.check_rate('306400/5107', 'fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2')

    def test_lower_frame_rate_with_side_data_keeps_its_cadence(self):
        self.check_rate('30000/1001', 'scale=trunc(iw/2)*2:trunc(ih/2)*2')


if __name__ == '__main__':
    unittest.main()
