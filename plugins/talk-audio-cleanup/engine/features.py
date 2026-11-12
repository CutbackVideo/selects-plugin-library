"""Per-frame audio features (30 fps frames of 1,600 samples at 48 kHz): level over a tracked noise floor in two
bands with +-0.5 s context, pause geometry, voicing (flatness, pitch strength), eight band levels and spectral flux."""
import numpy as np
from numpy.lib.stride_tricks import sliding_window_view
from scipy.signal import butter, sosfilt
SR, HOP, FR = 48000, 200, 1600
OFFS = (-16, -12, -8, -6, -4, -3, -2, -1, 0, 1, 2, 3, 4, 6, 8, 12, 16)
def shift(v, k):
    out = np.empty_like(v)
    if k > 0: out[:-k] = v[k:]; out[-k:] = v[-1]
    elif k < 0: out[-k:] = v[:k]; out[:-k] = v[0]
    else: out[:] = v
    return out
def runs(mask):
    d = np.diff(np.r_[0, mask.astype(np.int8), 0]); return list(zip(np.flatnonzero(d == 1), np.flatnonzero(d == -1)))
def geometry(mask):
    L = np.zeros(len(mask), np.float32); a_ = L.copy(); b_ = L.copy()
    for a, b in runs(mask): L[a:b] = b - a; a_[a:b] = np.arange(b - a); b_[a:b] = np.arange(b - a)[::-1]
    return L, a_, b_
def extract(pcm, off=0):
    """pcm: int16 [samples, 2] at 48 kHz. Returns (dict name -> per-frame array, n_frames)."""
    x = pcm.astype(np.float32).mean(axis=1) / 32768.0; hp = sosfilt(butter(4, 2000, "hp", fs=SR, output="sos"), x).astype(np.float32)
    n = (len(x) - off) // FR; F = {}
    env = lambda s: 10 * np.log10((s[off: off + n * FR].reshape(n, FR // HOP, HOP) ** 2).mean(axis=2) + 1e-12)
    base = {}
    for band, e in (("full", env(x)), ("high", env(hp))):
        floor = np.percentile(sliding_window_view(np.pad(e.min(axis=1), 60, mode="edge"), 121), 10, axis=1)
        base[band + "_max"] = e.max(axis=1) - floor; base[band + "_min"] = e.min(axis=1) - floor; F[band + "_argmax@0"] = e.argmax(axis=1).astype(np.float32); F[band + "_floor_abs"] = floor
        if band == "full": F["full_mean_abs"] = 10 * np.log10((10 ** (e / 10)).mean(axis=1))
    for k, v in base.items():
        for o in OFFS: F[f"{k}@{o}"] = shift(v, o)
    for nm, m in (("abs40", F["full_mean_abs"] < -40), ("abs50", F["full_mean_abs"] < -50), ("rel10", base["full_max"] < 10), ("rel20", base["full_max"] < 20)):
        for s, g in zip(("len", "from_start", "to_end"), geometry(m)): F[f"pause_{nm}_{s}"] = g
    xs = x[off: off + n * FR]
    win = sliding_window_view(np.pad(xs, (FR // 2, FR // 2 + FR)), 2 * FR)[::FR][:n]; hann2 = np.hanning(2 * FR).astype(np.float32)   # a view: windowed per chunk below
    flat = np.empty(n, np.float32); pitch = np.empty(n, np.float32); lo, hi = int(300 * 4096 / SR), int(4000 * 4096 / SR)
    for i in range(0, n, 4096):
        P = np.abs(np.fft.rfft(win[i:i + 4096] * hann2, 4096, axis=1)) ** 2 + 1e-14; b = P[:, lo:hi]; flat[i:i + 4096] = np.exp(np.log(b).mean(axis=1)) / b.mean(axis=1)
        ac = np.fft.irfft(P, axis=1); ac = ac / ac[:, :1]; pitch[i:i + 4096] = ac[:, SR // 350: SR // 70].max(axis=1)
    for nm, v in (("flatness", flat), ("pitch_strength", pitch)):
        for o in (-4, -2, -1, 0, 1, 2, 4): F[f"{nm}@{o}"] = shift(v, o)
    xm = (pcm[off: off + n * FR, 0].astype(np.float32) / 32768.0 + pcm[off: off + n * FR, 1].astype(np.float32) / 32768.0) / 2
    pad = np.pad(xm, (312, 712)); edges = np.geomspace(100, 12000, 9); bins = np.fft.rfftfreq(1024, 1 / SR); hann = np.hanning(1024).astype(np.float32)
    mel = np.empty((n, 8), np.float32); flux = np.empty((n, 4), np.float32); prev = None
    for i in range(0, n, 2048):
        j = min(n, i + 2048); idx = (np.arange(i * 4, j * 4) * 400)[:, None] + np.arange(1024); S = np.log(np.abs(np.fft.rfft(pad[idx] * hann, axis=1)) ** 2 + 1e-12)
        d = np.diff(np.vstack([S[:1] if prev is None else prev, S]), axis=0); prev = S[-1:]; flux[i:j] = np.maximum(d, 0).mean(axis=1).reshape(-1, 4)
        P = np.exp(S).reshape(j - i, 4, -1).mean(axis=1)
        for b in range(8): mel[i:j, b] = 10 * np.log10(P[:, (bins >= edges[b]) & (bins < edges[b + 1])].mean(axis=1) + 1e-12)
    mfloor = np.percentile(sliding_window_view(np.pad(mel, ((60, 60), (0, 0)), mode="edge"), 121, axis=0), 10, axis=2)
    for b in range(8):
        for o in (-1, 0, 1): F[f"mel_{b}@{o}"] = shift(mel[:, b] - mfloor[:, b], o)
    for o in (-1, 0, 1): F[f"flux_max@{o}"] = shift(flux.max(axis=1), o)
    F["flux_pos"] = flux.argmax(axis=1).astype(np.float32)
    return F, n
def matrix(F, columns): return np.stack([F[k] for k in columns], axis=1).astype(np.float32)
