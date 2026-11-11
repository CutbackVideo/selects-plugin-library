"""Audio cleanup decisions for one recording, following the Syuka World editing guide.
48 kHz stereo WAV in, an edit decision list out: which stretches to cut, lower or mute, and why.

  python analyze.py --wav in.wav --model model.joblib --out edl.json [--source-start 0.0]

Times in the list are source seconds (`--source-start` + frame / 30). The model is not part of this
repository; INSTALL.md says where it goes."""
import argparse, json, os, sys
import numpy as np
from scipy.io import wavfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import features as ft

FPS = 30
TOUCH = 0.25        # touch a frame when P(keep) falls below 1 - TOUCH
SURE_CUT = 0.30     # a cut the model is less sure of than this becomes a volume change (no picture cut)
STICKS_OUT = 12.0   # dB over the >2 kHz floor; a proposal with nothing above this is dropped
LOWER_DB = -11.0    # the editor's typical clip-volume drop for breaths
SNIFF_FLATNESS, SNIFF_LEVEL = 0.40, -46.0   # a breath-like stretch this hissy and this loud is muted, not lowered

def decide(P, dirt, quiet):
    p = np.zeros(len(P), np.int8); t = (1 - P[:, 0]) > TOUCH; p[t] = P[t, 1:].argmax(axis=1) + 1
    r = ft.runs(p > 0)
    for (s0, e0), (s1, e1) in zip(r, r[1:]):                # join proposals 1-2 quiet frames apart
        if s1 - e0 <= 2 and quiet[e0:s1].all(): p[e0:s1] = p[e0 - 1]
    for s, e in ft.runs(p > 0):
        if dirt[s:e].max() < STICKS_OUT: p[s:e] = 0
    for s, e in ft.runs(p == 1):
        if P[s:e, 1].max() < SURE_CUT: p[s:e] = 2 if e - s <= 2 else 3
    return p

def build(pcm, model, columns, source_start=0.0, offset=0):
    F, n = ft.extract(pcm, offset); X = ft.matrix(F, columns)
    P = np.zeros((n, 4), np.float32); P[:, model.classes_] = model.predict_proba(X)
    dirt, quiet = F["high_max@0"], F["full_mean_abs"] < -40
    p = decide(P, dirt, quiet); items = []
    for kind, action in ((1, "delete"), (2, "mute"), (3, "lower")):
        for s, e in ft.runs(p == kind):
            rule = {"delete": "blemish", "mute": "click", "lower": "breath"}[action]; act = action
            if action == "lower" and np.median(F["flatness@0"][s:e]) >= SNIFF_FLATNESS and F["full_mean_abs"][s:e].max() >= SNIFF_LEVEL: act, rule = "mute", "sniff"
            items.append(dict(start=round(source_start + s / FPS, 4), end=round(source_start + e / FPS, 4), frames=int(e - s), action=act, rule=rule,
                              gainDb=None if act == "delete" else (LOWER_DB if act == "lower" else -60.0),
                              confidence=round(float(P[s:e, kind].max()), 3), sticksOutDb=round(float(dirt[s:e].max()), 1)))
    items.sort(key=lambda it: it["start"])
    return dict(version=1, fps=FPS, sourceStart=source_start, frames=int(n), items=items,
                counts={k: sum(it["rule"] == k for it in items) for k in ("blemish", "breath", "sniff", "click")},
                secondsCut=round(sum(it["frames"] for it in items if it["action"] == "delete") / FPS, 2))

def self_check():
    P = np.zeros((14, 4), np.float32); P[:, 0] = 1; P[3:6] = [0.1, 0.8, 0.05, 0.05]; P[10] = [0.6, 0.28, 0.06, 0.06]
    dirt = np.full(14, 20.0); dirt[10] = 3.0; quiet = np.ones(14, bool)
    assert decide(P, dirt, quiet).tolist() == [0, 0, 0, 1, 1, 1] + [0] * 8      # the weak proposal with nothing sticking out is dropped
    dirt[10] = 20.0
    assert decide(P, dirt, quiet)[10] == 2                                       # an unsure 1-frame cut becomes a mute, not a cut
    P[7] = [0.1, 0.8, 0.05, 0.05]
    assert decide(P, dirt, quiet)[6] == 1                                        # proposals one quiet frame apart are joined

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--wav"); ap.add_argument("--model"); ap.add_argument("--out"); ap.add_argument("--source-start", type=float, default=0.0)
    ap.add_argument("--self-check", action="store_true"); a = ap.parse_args()
    if a.self_check: self_check(); print("ok"); sys.exit(0)
    import joblib
    sr, pcm = wavfile.read(a.wav)
    if sr != 48000 or pcm.ndim != 2 or pcm.shape[1] != 2 or pcm.dtype != np.int16: sys.exit("expected 48 kHz stereo 16-bit PCM")
    pack = joblib.load(a.model); edl = build(pcm, pack["model"], pack["columns"], a.source_start)
    with open(a.out, "w") as f: json.dump(edl, f); print(json.dumps(dict(items=len(edl["items"]), counts=edl["counts"], secondsCut=edl["secondsCut"])))
