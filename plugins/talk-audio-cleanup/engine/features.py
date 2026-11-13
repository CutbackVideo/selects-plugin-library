"""Per-frame levels (30 fps frames of 1,600 samples at 48 kHz) that the cleanup rules read: the frame's level,
how far its >2 kHz peak stands over a tracked noise floor, and how spiky that band is inside the frame."""
import numpy as np
from numpy.lib.stride_tricks import sliding_window_view
from scipy.signal import butter, sosfilt
SR, HOP, FR = 48000, 200, 1600
def runs(mask):
    d = np.diff(np.r_[0, mask.astype(np.int8), 0]); return list(zip(np.flatnonzero(d == 1), np.flatnonzero(d == -1)))
def levels(pcm):
    """pcm: int16 [samples, 2] at 48 kHz. Returns per frame: level (dBFS), dirt (dB, >2 kHz peak over the floor), spiky (dB, >2 kHz max - min)."""
    x = pcm.astype(np.float32).mean(axis=1) / 32768.0; hp = sosfilt(butter(4, 2000, "hp", fs=SR, output="sos"), x).astype(np.float32)
    n = len(x) // FR
    env = lambda s: 10 * np.log10((s[: n * FR].reshape(n, FR // HOP, HOP) ** 2).mean(axis=2) + 1e-12)
    full, high = env(x), env(hp)
    floor = np.percentile(sliding_window_view(np.pad(high.min(axis=1), 60, mode="edge"), 121), 10, axis=1)   # the quietest tenth of the 4 s around
    return 10 * np.log10((10 ** (full / 10)).mean(axis=1)), high.max(axis=1) - floor, high.max(axis=1) - high.min(axis=1)
