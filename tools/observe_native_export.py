#!/usr/bin/env python3
"""Optional Gallery native-encoder observer, selected only by an isolated app's PATH.

Set SELECTS_NATIVE_OBSERVER_CONFIG to a private JSON file with the real encoder,
directory, tag, sourceRevision, oracle, originalColors and expectedFrames. Ordinary
FFmpeg calls exec the real binary. Native BGRA frames are forwarded unchanged;
one frame is resident and a lossless gzip archive permits independent reencoding.
Point observations are diagnostics, not a whole-image or audiovisual verdict.
"""
import gzip
import hashlib
import json
import math
import os
from pathlib import Path
import re
import subprocess
import sys
import uuid


def forward_frames(source, sink, archive, frame_bytes, observe):
    if not 0 < frame_bytes <= 128 * 1024 * 1024:
        raise ValueError('Invalid native frame byte budget')
    frame = 0
    while True:
        pixels = bytearray()
        while len(pixels) < frame_bytes:
            chunk = source.read(frame_bytes - len(pixels))
            if not chunk:
                break
            pixels.extend(chunk)
        if not pixels:
            return frame
        if len(pixels) != frame_bytes:
            raise ValueError('Native encoder received a partial BGRA frame')
        observe(frame, pixels)
        archive.write(pixels)
        # Buffered pipes either accept this full buffer or raise an I/O error.
        if sink.write(pixels) != frame_bytes:
            raise OSError('Native encoder accepted a short frame write')
        frame += 1


def observe_frame(raw, frame, width, height, fps, oracle, colors):
    reveal = [math.floor(v * fps / oracle['fps'] + .5) for v in oracle['revealFrames']]
    color = math.floor(oracle['colorFrame'] * fps / oracle['fps'] + .5)
    failures, centers, points = [], [], []

    def pixel(x, y):
        at = (y * width + x) * 4
        return [raw[at + 2], raw[at + 1], raw[at]]

    for i in range(21):
        x, y = i % 3 * width // 3 + width // 6, math.floor((i // 3 + .5) * height / 7)
        rgb = pixel(x, y)
        sample = [pixel(x + dx, y + dy) for dx in [-70, 0, 70] for dy in [-55, 0, 55]]
        centers.append(rgb)
        points.append(sample)
        if any(max(p) > 5 for p in sample) != (frame >= reveal[i]):
            failures.append({'frame': frame, 'slot': i + 1, 'check': 'visibility', 'rgb': rgb})
        if reveal[i] <= frame < color and any(max(p) - min(p) > 6 for p in sample):
            failures.append({'frame': frame, 'slot': i + 1, 'check': 'grayscale', 'rgb': rgb})
        expected = colors.get(str(i + 1))
        if frame >= color and expected and any(abs(a - b) > 16 for a, b in zip(rgb, expected)):
            failures.append({'frame': frame, 'slot': i + 1, 'check': 'selected-image-color', 'rgb': rgb})
    border = [pixel(x, math.floor((row + .5) * height / 7))
              for row in range(7) for x in [width // 3, width * 2 // 3]]
    border += [pixel(x, math.floor((row + 1) * height / 7 + .5))
               for row in range(6) for x in [width // 6, width // 2, width * 5 // 6]]
    for index, rgb in enumerate(border):
        if max(rgb) > 3:
            failures.append({'frame': frame, 'index': index, 'check': 'unencoded-border', 'rgb': rgb})
    return {'frame': frame, 'centers': centers, 'points': points, 'border': border,
            'sha256': hashlib.sha256(raw).hexdigest(), 'failures': failures}


def validate_config(config):
    encoder = Path(config['encoder'])
    if not encoder.is_absolute() or not encoder.is_file() or not os.access(encoder, os.X_OK):
        raise ValueError('An explicit executable real encoder is required')
    if encoder.resolve() == Path(sys.argv[0]).resolve():
        raise ValueError('The real encoder must not recurse into this observer')
    directory = Path(config['directory'])
    if not directory.is_absolute() or not directory.is_dir():
        raise ValueError('An existing private observation directory is required')
    if not re.fullmatch(r'[a-z0-9-]+', config['tag']):
        raise ValueError('Invalid observation tag')


def reencode_capture(report_path, output):
    report_path, output = Path(report_path), Path(output)
    report = json.loads(report_path.read_text())
    if output.exists():
        raise ValueError('Control output already exists')
    validate_config({'encoder': report['encoder'], 'directory': str(output.parent),
                     'tag': 'reencode'})
    if report['status'] != 'captured' or len(report['rows']) != report['frames']:
        raise ValueError('A complete native capture is required')
    args = ['-n' if arg == '-y' else arg for arg in report['arguments']]
    args[-1] = str(output)
    child = subprocess.Popen([report['encoder'], *args], stdin=subprocess.PIPE)
    try:
        def verify(frame, pixels):
            if (frame >= len(report['rows']) or
                    hashlib.sha256(pixels).hexdigest() != report['rows'][frame]['sha256']):
                raise ValueError('Archived native frame hash mismatch')
        with gzip.open(report_path.parent / 'frames.bgra.gz', 'rb') as source, \
                open(os.devnull, 'wb') as discard:
            count = forward_frames(source, child.stdin, discard,
                                   report['width'] * report['height'] * 4, verify)
        child.stdin.close()
        code = child.wait(timeout=60)
        if code or count != report['frames']:
            raise ValueError('Native control encoding or frame count failed')
        return {'rawFramesVerified': count, 'output': str(output),
                'sourceRevision': report.get('sourceRevision')}
    except BaseException:
        if child.poll() is None:
            child.kill()
        child.wait()
        raise
    finally:
        try:
            child.stdin.close()
        except OSError:
            pass


def main():
    if sys.argv[1:2] == ['--reencode']:
        if len(sys.argv) != 4:
            raise ValueError('Usage: observe_native_export.py --reencode REPORT NEW_OUTPUT')
        print(json.dumps(reencode_capture(sys.argv[2], sys.argv[3])))
        return
    config = json.loads(Path(os.environ['SELECTS_NATIVE_OBSERVER_CONFIG']).read_text())
    validate_config(config)
    encoder, args = config['encoder'], sys.argv[1:]
    if not all(value in args for value in ['rawvideo', 'bgra', 'pipe:0']):
        os.execv(encoder, [encoder, *args])
    width, height = map(int, args[args.index('-video_size') + 1].split('x'))
    if (width, height) != (1080, 1920):
        raise ValueError('Gallery point observations require the declared 1080x1920 fixture')
    rate = args[args.index('-framerate') + 1]
    numerator, denominator = map(int, rate.split('/'))
    fps = numerator / denominator
    target = Path(config['directory']) / (config['tag'] + '-' + uuid.uuid4().hex)
    target.mkdir()
    report = {'status': 'started', 'sourceRevision': config['sourceRevision'],
              'encoder': encoder, 'arguments': args, 'width': width, 'height': height,
              'frameRate': rate, 'rows': [], 'failures': [],
              'tolerances': {'visibility': 5, 'grayscaleChannelSpread': 6,
                             'selectedImageChannelError': 16, 'unencodedBorderMaximum': 3},
              'scope': 'BGRA bytes before the actual native encoder; point samples only'}
    (target / 'started.json').write_text(json.dumps({k: v for k, v in report.items()
                                                  if k not in ('rows', 'failures')}, indent=2))
    child = subprocess.Popen([encoder, *args], stdin=subprocess.PIPE)
    try:
        def observe(frame, pixels):
            row = observe_frame(pixels, frame, width, height, fps,
                                config['oracle'], config['originalColors'])
            report['failures'].extend(row.pop('failures'))
            report['rows'].append(row)
        with gzip.open(target / 'frames.bgra.gz', 'xb', compresslevel=1) as archive:
            count = forward_frames(sys.stdin.buffer, child.stdin, archive,
                                   width * height * 4, observe)
        child.stdin.close()
        code = child.wait(timeout=60)
        if code:
            raise RuntimeError('The real native encoder failed: ' + str(code))
        if count != config['expectedFrames']:
            raise ValueError('Captured frame count differs from the declared fixture')
        report.update(status='captured', frames=count,
                      pixelVerdict='failed' if report['failures'] else 'passed')
        (target / 'report.json').write_text(json.dumps(report))
    except BaseException as error:
        if child.poll() is None:
            child.kill()
        child.wait()
        report.update(status='failed', error=str(error))
        (target / 'error.json').write_text(json.dumps(report))
        raise
    finally:
        try:
            child.stdin.close()
        except OSError:
            pass


if __name__ == '__main__':
    main()
