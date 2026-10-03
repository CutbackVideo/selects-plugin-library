#!/usr/bin/env python3
"""Writes parity.json: what plugins/cutout-beat-gallery/prepare.py (Python + Pillow) makes of a synthetic photo
folder, for tests/cutout_beat_gallery.test.mjs to compare the JavaScript engine (cutout-engine.js) against without
Python. Photos and masks come from integer formulas that the node test rebuilds byte for byte (sources are drawn
small and enlarged with Pillow's bicubic resize, which the engine ports exactly). prepare.py runs unmodified; only its
`run` (the masker and ffmpeg calls) is replaced: the masker writes the formula mask, and ffmpeg calls record the
sticker layer and base frame they were given.

Run: python3 tests/fixtures/cutout_beat_gallery/make_parity.py (needs Pillow; about two minutes).
"""
import hashlib, importlib.util, io, json, shutil, sys, tempfile
from contextlib import redirect_stdout
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location('prepare', ROOT / 'plugins/cutout-beat-gallery/prepare.py')
P = importlib.util.module_from_spec(spec)
spec.loader.exec_module(P)


def source(p, sw=180, sh=250):
    """Photo p's small source, RGB bytes (the node test has the same formula)."""
    out = bytearray(sw * sh * 3)
    o = 0
    for y in range(sh):
        for x in range(sw):
            out[o] = (x * (3 + p % 5) + y * (1 + p % 3) + p * 37) % 256
            out[o + 1] = ((x * y) // (7 + p) + p * 11) % 256
            out[o + 2] = (((x ^ y) * (p + 1)) + (x * x + y * y) // (50 + p)) % 256
            o += 3
    return out


# The folder: (file name, photo formula, small size, final size, tweak). A tweak nudges a few source bytes (a
# near-duplicate of the photo with the same formula).
PHOTOS = [(f'p{k:02d}.png', k, (180, 250), (720, 1000), 0) for k in range(1, 27)]
PHOTOS.insert(4, ('p03-copy.png', 3, (180, 250), (720, 1000), 0))      # same bytes as p03: "duplicate photo"
PHOTOS.insert(9, ('p07-near.png', 7, (180, 250), (720, 1000), 1))      # a few bytes off p07: near-duplicate
PHOTOS.insert(12, ('wide.png', 30, (250, 180), (1000, 720), 0))        # landscape
PHOTOS.insert(15, ('small.png', 31, (180, 250), (600, 880), 0))        # resolution too low


def photo_image(entry):
    _, p, (sw, sh), size, tweak = entry
    raw = source(p, sw, sh)
    for k in range(tweak * 40):
        raw[(k * 7919) % len(raw)] ^= 1
    return Image.frombytes('RGB', (sw, sh), bytes(raw)).resize(size, Image.Resampling.BICUBIC)


def mask_small(i, scenario):
    """The masker's answer for scene photo i (1-based, after skipped photos), 270x480 L bytes."""
    w, h = 270, 480
    cx, cy = 135 + ((i * 29) % 61 - 30), 300 + (i * 17) % 80
    rx, ry = 60 + (i * 13) % 40, 120 + (i * 7) % 60
    if i % 5 == 0:
        cx = 20                      # touches the left edge
    if scenario == 'short' and (i % 3 == 0 or i == 26):
        cy = 40                      # touches the top
    R = rx * rx * ry * ry
    out = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            d = ((x - cx) ** 2) * ry * ry + ((y - cy) ** 2) * rx * rx
            v = 255 if d * 100 <= 90 * R else 0 if d * 100 >= 110 * R else (110 * R - d * 100) * 255 // (20 * R)
            out[y * w + x] = v
    return bytes(out)


def run_prepare(scenario):
    work = Path(tempfile.mkdtemp())
    try:
        inputs = []
        for entry in PHOTOS:
            path = work / entry[0]
            if entry[0] == 'p03-copy.png':
                shutil.copyfile(work / 'p03.png', path)
            else:
                photo_image(entry).save(path)
            inputs.append(str(path))
        stickers, bases = {}, {}

        def fake_run(args):
            if args[0] == 'fake-masker':
                i = int(Path(args[1]).name[:2])
                Image.frombytes('L', (270, 480), mask_small(i, scenario)).resize((P.W, P.H), Image.Resampling.BICUBIC).save(args[2])
                return
            src, dst = Path(args[args.index('-i') + 1]), Path(args[-1])
            if dst.name.endswith('-sticker.mov'):
                with Image.open(src) as im:
                    stickers[dst.name] = hashlib.sha256(im.tobytes()).hexdigest()
            dst.write_bytes(b'')

        saved = Image.Image.save

        def save(im, fp, *a, **k):
            if str(fp).endswith('-base.jpg'):
                bases[int(Path(fp).name[:2])] = hashlib.sha256(im.tobytes()).hexdigest()
            return saved(im, fp, *a, **k)

        P.run, Image.Image.save = fake_run, save
        bgm = work / 'bgm.mp3'
        bgm.write_bytes(b'x')
        argv = ['prepare.py', '--output', str(work / 'out'), '--masker', 'fake-masker', '--bgm', str(bgm)]
        for path in inputs:
            argv += ['--input', path]
        sys.argv = argv
        buf = io.StringIO()
        with redirect_stdout(buf):
            P.main()
        Image.Image.save = saved
        result = json.loads(buf.getvalue())
        result.pop('outputDir', None)
        result.pop('folder', None)
        return {'result': result, 'stickers': stickers, 'bases': {str(k): v for k, v in sorted(bases.items())}}
    finally:
        shutil.rmtree(work, ignore_errors=True)


def main():
    out = {
        'photos': [list(e[:1]) + [e[1], list(e[2]), list(e[3]), e[4]] for e in PHOTOS],
        'scenarios': {name: run_prepare(name) for name in ('full', 'short')},
    }
    target = Path(__file__).with_name('parity.json')
    target.write_text(json.dumps(out, indent=1, ensure_ascii=False) + '\n')
    for name, s in out['scenarios'].items():
        r = s['result']
        print(name, 'ready', r['ready'], 'stickers', r.get('stickers'), 'rejected', len(r['rejected']))


if __name__ == '__main__':
    main()
