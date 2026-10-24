import gzip
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


SPEC = importlib.util.spec_from_file_location(
    'native_observer', Path(__file__).resolve().parents[1] / 'tools' / 'observe_native_export.py')
observer = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(observer)


class Fragmented(io.BytesIO):
    def read(self, count=-1):
        return super().read(min(count, 3))


class NativeObserverTests(unittest.TestCase):
    def test_fragmented_pipe_preserves_every_byte_and_only_complete_frames(self):
        data = bytes(range(96))
        sink, packed, seen = io.BytesIO(), io.BytesIO(), []
        with gzip.GzipFile(fileobj=packed, mode='wb') as archive:
            count = observer.forward_frames(
                Fragmented(data), sink, archive, 32,
                lambda frame, pixels: seen.append((frame, bytes(pixels))))
        self.assertEqual(count, 3)
        self.assertEqual(sink.getvalue(), data)
        self.assertEqual(gzip.decompress(packed.getvalue()), data)
        self.assertEqual(seen, [(i, data[i * 32:(i + 1) * 32]) for i in range(3)])

    def test_partial_frame_is_explicit_and_is_never_forwarded(self):
        sink, archive = io.BytesIO(), io.BytesIO()
        with self.assertRaisesRegex(ValueError, 'partial'):
            observer.forward_frames(Fragmented(b'a' * 35), sink, archive, 32, lambda *_: None)
        self.assertEqual(sink.getvalue(), b'a' * 32)

    def test_empty_input_does_not_create_a_frame(self):
        self.assertEqual(observer.forward_frames(io.BytesIO(), io.BytesIO(), io.BytesIO(), 32,
                                                 lambda *_: self.fail('unexpected frame')), 0)

    def test_golden_grid_and_wrong_border_use_the_same_oracle(self):
        width, height = 1080, 1920
        raw = bytearray(width * height * 4)
        oracle = {'fps': 60, 'revealFrames': [0] * 21, 'colorFrame': 0}
        colors = {str(i): [240, 30, 15] for i in range(1, 22)}
        for i in range(21):
            x = i % 3 * 360 + 180
            y = int((i // 3 + .5) * height / 7)
            for dx in [-70, 0, 70]:
                for dy in [-55, 0, 55]:
                    at = ((y + dy) * width + x + dx) * 4
                    raw[at:at + 4] = bytes([15, 30, 240, 255])
        good = observer.observe_frame(raw, 0, width, height, 60, oracle, colors)
        self.assertEqual(good['failures'], [])
        at = (int(.5 * height / 7) * width + 360) * 4
        raw[at:at + 4] = bytes([0, 0, 80, 255])
        bad = observer.observe_frame(raw, 0, width, height, 60, oracle, colors)
        self.assertEqual(bad['failures'], [
            {'frame': 0, 'index': 0, 'check': 'unencoded-border', 'rgb': [80, 0, 0]}])

    def test_unavailable_encoder_does_not_silently_use_another_binary(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, 'encoder'):
                observer.validate_config({'encoder': str(Path(directory) / 'missing'),
                                          'directory': directory, 'tag': 'test'})

    @unittest.skipIf(os.name == 'nt', 'The isolated PATH observer uses POSIX executable scripts')
    def test_ordinary_ffmpeg_calls_keep_literal_arguments_and_unread_stdin(self):
        with tempfile.TemporaryDirectory() as directory:
            encoder = Path(directory) / 'encoder'
            encoder.write_text('#!' + sys.executable + '\nimport json,sys\n'
                               'print(json.dumps([sys.argv[1:],sys.stdin.buffer.read().hex()]))\n')
            encoder.chmod(0o755)
            config = Path(directory) / 'config.json'
            config.write_text(json.dumps({'encoder': str(encoder), 'directory': directory,
                                          'tag': 'passthrough'}))
            arguments = ['-version', 'literal $(value)', 'path with spaces']
            result = subprocess.run([sys.executable, str(SPEC.origin), *arguments],
                                    input=b'unchanged\x00input', capture_output=True, check=True,
                                    env={**os.environ, 'SELECTS_NATIVE_OBSERVER_CONFIG': str(config)})
            self.assertEqual(json.loads(result.stdout), [arguments, b'unchanged\x00input'.hex()])
            self.assertEqual(sorted(p.name for p in Path(directory).iterdir()), ['config.json', 'encoder'])

    def replay_fixture(self, directory):
        root = Path(directory)
        encoder = root / 'encoder'
        encoder.write_text('#!' + sys.executable + '\nimport sys\n'
                           'data=sys.stdin.buffer.read()\n'
                           'with open(sys.argv[-1],"xb") as f:f.write(data)\n')
        encoder.chmod(0o755)
        data = bytes(range(32))
        with gzip.open(root / 'frames.bgra.gz', 'wb') as f:
            f.write(data)
        report = {'status': 'captured', 'encoder': str(encoder),
                  'arguments': ['-y', '-i', 'pipe:0', 'unused-output'],
                  'width': 2, 'height': 2, 'frames': 2,
                  'rows': [{'sha256': hashlib.sha256(data[i:i + 16]).hexdigest()}
                           for i in [0, 16]]}
        filename = root / 'report.json'
        filename.write_text(json.dumps(report))
        return filename, data, report

    @unittest.skipIf(os.name == 'nt', 'POSIX encoder fixture')
    def test_reencoding_checks_every_archived_frame_and_never_overwrites(self):
        with tempfile.TemporaryDirectory() as directory:
            source, data, _ = self.replay_fixture(directory)
            output = Path(directory) / 'control.bin'
            result = observer.reencode_capture(source, output)
            self.assertEqual(result['rawFramesVerified'], 2)
            self.assertEqual(output.read_bytes(), data)
            with self.assertRaisesRegex(ValueError, 'exists'):
                observer.reencode_capture(source, output)

    @unittest.skipIf(os.name == 'nt', 'POSIX encoder fixture')
    def test_corrupted_capture_does_not_reencode_as_verified(self):
        with tempfile.TemporaryDirectory() as directory:
            source, _, report = self.replay_fixture(directory)
            report['rows'][0]['sha256'] = 'incorrect'
            source.write_text(json.dumps(report))
            with self.assertRaisesRegex(ValueError, 'hash'):
                observer.reencode_capture(source, Path(directory) / 'control.bin')


if __name__ == '__main__':
    unittest.main()
