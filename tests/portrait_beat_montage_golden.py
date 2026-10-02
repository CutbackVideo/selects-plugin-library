"""Golden outputs of pipeline.py's pixel functions on synthetic inputs, for tests/portrait_beat_montage_pixels.test.mjs.

Usage: python portrait_beat_montage_golden.py <plugin folder> <output folder>   (raw .bin files + meta.json)
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
sys.path.insert(0, sys.argv[1])
import pipeline as P

out = Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
W, H = P.W, P.H
rng = np.random.default_rng(7)
import PIL
meta = {"numpy": np.__version__, "pillow": PIL.__version__, "rough": P.rough[:, 0].tolist()[:4],
        "positions": P.positions.tolist()}
def save(name, a): np.ascontiguousarray(a).tofile(out / (name + ".bin"))

# Source frames: a lit gradient background, a moving bright shape (the "person") and noise.
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
frames = []
for k in range(60):
    bg = np.stack([60 + 120 * xx / W, 40 + 150 * yy / H, 90 + 60 * np.sin(xx / 37 + yy / 53)], -1)
    cx, cy = 270 + 40 * np.sin(k / 9), 380 + 10 * k / 6
    d = ((xx - cx) / 120) ** 2 + ((yy - cy) / 230) ** 2
    person = np.stack([220 - 30 * d, 170 + 20 * np.cos(yy / 11), 140 + 0 * d], -1)
    img = np.where((d < 1)[..., None], person, bg) + rng.normal(0, 6, (H, W, 3))
    frames.append(np.uint8(np.clip(img, 0, 255)))
frames = np.stack(frames)
# Mattes: the shape's soft ellipse (as 8-bit PNG values / 255), fully covered top rows to exercise the median branch.
mattes = []
for k in range(30):
    cx, cy = 270 + 40 * np.sin(k / 9), 380 + 10 * k / 6
    d = ((xx - cx) / 120) ** 2 + ((yy - cy) / 230) ** 2
    m = np.clip((1.15 - d) / .3, 0, 1)
    m[:6] = 1.0
    mattes.append(np.uint8(np.round(m * 255)))
mattes = np.stack(mattes)
alpha = mattes.astype(np.float32) / 255
save("frames", frames); save("mattes", mattes)
meta["alphaMean0"] = float(alpha[0].mean())

# Pillow kernels alone.
noise = np.uint8(rng.integers(0, 256, (H, W, 3)))
grey = np.uint8(rng.integers(0, 256, (H, W)))
save("noise", noise); save("grey", grey)
radii = [28, 18, 12, 11, 1.35, 1.05, 1.2, 1.5, 1.1, .55, .4]
for r in radii:
    save(f"blur_rgb_{r}", np.asarray(Image.fromarray(noise).filter(ImageFilter.GaussianBlur(r))))
    save(f"blur_l_{r}", np.asarray(Image.fromarray(grey).filter(ImageFilter.GaussianBlur(r))))
meta["radii"] = radii
for size in (41, 81):
    save(f"max_{size}", np.asarray(Image.fromarray(grey).filter(ImageFilter.MaxFilter(size))))
save("composite", np.asarray(Image.composite(Image.fromarray(noise[::-1].copy()), Image.fromarray(noise), Image.fromarray(grey))))
scales = [1.11, 1.0944, 1.05, 1.0123]
for s in scales:
    save(f"scale_{s}", np.uint8(P.scale_center(frames[3].astype(np.float32), s)))
meta["scales"] = scales

# Pipeline stages.
plate = P.background_plate(frames[0], alpha[0])
save("plate", np.uint8(plate))
post = P.transition_frames(frames[:30], alpha, plate)
save("post", post)
for amount, warm, name in [(1, 1, "a"), (.72, .10, "b"), (.24, 0, "c")]:
    save("flash_" + name, P.flash(frames[5], amount, warm))
    save("flashf_" + name, P.flash(P.interp_frame(frames, 23.37), amount, warm))
r = np.sqrt(((P.X - (W - 1) / 2) / (.337 * W)) ** 2 + ((P.Y - (H - 1) / 2) / (.336 * H)) ** 2)
glow = np.interp(r, [0, .5, .8, 1, 1.2, 1.5, 2], [1, .91, .69, .5, .32, .09, 0])[..., None]
save("glow_240", np.uint8(np.clip(glow * 240, 0, 255)).repeat(3, axis=2))
save("glow_91", np.uint8(np.clip(glow * 91, 0, 255)).repeat(3, axis=2))
# The emitted frames of one shot (offsets 0..length), as op_assemble's emit() writes them.
length = P.LENGTHS[0]
emitted = []
for i in range(length):
    f = np.asarray(post[i]) if i < P.POST else P.interp_frame(frames, P.settled_pos(i))
    scale = P.punch_scale(i)
    if scale > 1.0005: f = P.scale_center(f, scale)
    amount = P.envelope(i)
    if amount > 0: f = P.flash(f, amount, P.warm_envelope(i))
    emitted.append(np.uint8(np.clip(f, 0, 255)))
save("emitted", np.stack(emitted)); meta["length"] = length
meta["settled"] = [float(P.settled_pos(i)) for i in range(P.POST, 45)]

# Window choice on a synthetic grey stream (motion peaks at a few places).
n = 24 * 6
g = np.zeros((n, 180, 135), np.uint8)
for k in range(n):
    g[k] = np.uint8((np.sin(k / (3 + (k // 40))) * 80 + 120 + np.arange(135)[None, :] * (k % 7)) % 256)
save("gray", g)
info = {"width": 1080, "height": 1920, "duration": 6.0}
g32 = g.astype(np.float32)
last_start = min(len(g32) - 20, int((info["duration"] - 1.05) * 24))
starts = np.arange(0, max(1, last_start + 1))
scores = np.array([np.abs(g32[s + 19] - g32[s + 8]).mean() if s + 19 < len(g32) else 0 for s in starts])
first = P.choose(starts / 24, scores)
meta["motion"] = {"duration": 6.0, "scores": scores.astype(float).tolist(), "first": first, "again": P.choose(starts / 24, scores, avoid=first)}
(out / "meta.json").write_text(json.dumps(meta))
print("ok", np.__version__)
