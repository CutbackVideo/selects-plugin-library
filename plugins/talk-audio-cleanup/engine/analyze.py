"""Audio cleanup decisions for one recording, following a broadcast editing guide.
48 kHz stereo WAV in, an edit decision list out: which stretches to cut, lower or mute, and why.

  python analyze.py --wav in.wav --model model.joblib --out edl.json [--source-start 0.0] [--openers '[[start, next, prevEnd], ...]'] [--previews clips.pcm]

`--openers` lists standalone opener words from the transcript (source seconds: its start, the next word's start, the previous
word's end). One is cut when the waveform shows it standing alone: short, apart from the previous word, the level closing after it.

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
MAYBE = 0.10        # below TOUCH but above this, a place is offered as a suggestion instead of being applied
AUDIBLE_TICK = 20.0 # dB over the >2 kHz floor; a tick of one or two frames this far out of a quiet gap is also suggested
STICKS_OUT = 12.0   # dB over the >2 kHz floor; a proposal with nothing above this is dropped
BLOCK, MARGIN = 3600, 300   # frames: 2-minute blocks with 10 s of context on each side, so memory does not grow with the recording
SNIFF_FLATNESS, SNIFF_LEVEL = 0.40, -46.0   # a breath-like stretch this hissy and this loud is muted, not lowered

def decide(P, dirt, quiet, touch=TOUCH, soften=True):
    p = np.zeros(len(P), np.int8); t = (1 - P[:, 0]) > touch; p[t] = P[t, 1:].argmax(axis=1) + 1
    r = ft.runs(p > 0)
    for (s0, e0), (s1, e1) in zip(r, r[1:]):                # join proposals 1-2 quiet frames apart
        if s1 - e0 <= 2 and quiet[e0:s1].all(): p[e0:s1] = p[e0 - 1]
    for s, e in ft.runs(p > 0):
        if dirt[s:e].max() < STICKS_OUT: p[s:e] = 0
    if soften:
        for s, e in ft.runs(p == 1):
            if P[s:e, 1].max() < SURE_CUT: p[s:e] = 2 if e - s <= 2 else 3
    return p

OPENER_VALLEY, OPENER_MAX_SEC = 0.05, 0.25   # level after the word / loudest speech within 1.5 s; longest word that still counts as a lone opener

def openers(pcm, triples, source_start=0.0):
    """Cuts for standalone opener words. The transcript says where to look; the hump, the valley after it and the frames come from the waveform."""
    K = 96; out = []                                        # 2 ms steps at 48 kHz
    for ts, tn, prev_end in triples:
        a = int(max(0.0, ts - 1.5 - source_start) * 48000); b = int((tn + 1.5 - source_start) * 48000)
        x = np.abs(np.asarray(pcm[a:b], np.float32).mean(axis=1)) / 32768.0
        if len(x) < K * 100 or not (ts - prev_end > 0 and 0 < tn - ts <= OPENER_MAX_SEC): continue
        env = np.convolve(x[: len(x) // K * K].reshape(-1, K).max(axis=1), np.ones(3) / 3, "same")
        at = lambda t: int((t - source_start) * 48000 - a) // K
        lo = max(0, at(ts - .06)); pk = lo + int(env[lo: at(ts + .06)].argmax())
        v = pk + int(env[pk: max(at(tn) + 10, pk + 12)].argmin())      # the valley between the word and the next one
        ref = env[max(0, at(ts - 1.5)): at(ts + 1.5)].max()
        if ref <= 0 or env[v] / ref > OPENER_VALLEY: continue
        s = pk
        while s > 0 and env[s] > .25 * env[pk]: s -= 1
        f0 = max(0, (a + s * K) * FPS // 48000 - 2); f1 = int(round((a + v * K) * FPS / 48000))   # two frames of lead-in, ends at the valley
        if f1 > f0: out.append(dict(start=round(source_start + f0 / FPS, 6), end=round(source_start + f1 / FPS, 6), frames=int(f1 - f0), action="delete", rule="opener", confidence=1.0))
    return out

def measure(pcm, model, columns):
    """Per-frame class probabilities and the three measures the rules read, block by block.
    ponytail: a pause longer than MARGIN that crosses a block edge is measured shorter than it is; widen MARGIN if that matters."""
    n = len(pcm) // ft.FR; P = np.zeros((n, 4), np.float32); dirt = np.zeros(n, np.float32); level = dirt.copy(); flat = dirt.copy()
    for s in range(0, n, BLOCK):
        a, e = max(0, s - MARGIN), min(n, s + BLOCK); b = min(n, e + MARGIN)
        F, _ = ft.extract(np.asarray(pcm[a * ft.FR: b * ft.FR]), 0); k = slice(s - a, e - a)
        P[s:e, model.classes_] = model.predict_proba(ft.matrix(F, columns)[k])
        dirt[s:e], level[s:e], flat[s:e] = F["high_max@0"][k], F["full_mean_abs"][k], F["flatness@0"][k]
    return P, dirt, level, flat

def build(pcm, model, columns, source_start=0.0, triples=()):
    P, dirt, level, flat = measure(pcm, model, columns)
    quiet = level < -40; p = decide(P, dirt, quiet); items = []
    # Suggestions: what a lower bar would also touch, where nothing is applied already. They keep the model's own action.
    loose = decide(P, dirt, quiet, MAYBE, soften=False)
    for s, e in ft.runs(loose > 0):
        if p[max(0, s - 1): e + 1].any(): loose[s:e] = 0
    for s, e in ft.runs((dirt >= AUDIBLE_TICK) & quiet):     # a tick anyone can hear, standing alone between words, that nothing touches
        if e - s <= 2 and not p[max(0, s - 1): e + 1].any() and not loose[s:e].any() and quiet[max(0, s - 2): s].all() and quiet[e: e + 2].all(): loose[s:e] = 2
    for tier, picks in (("sure", p), ("maybe", loose)):
        for kind, action in ((1, "delete"), (2, "mute"), (3, "lower")):
            for s, e in ft.runs(picks == kind):
                rule = {"delete": "blemish", "mute": "click", "lower": "breath"}[action]; act = action
                if action == "lower" and np.median(flat[s:e]) >= SNIFF_FLATNESS and level[s:e].max() >= SNIFF_LEVEL: act, rule = "mute", "sniff"
                items.append(dict(start=round(source_start + s / FPS, 6), end=round(source_start + e / FPS, 6), frames=int(e - s), action=act, rule=rule, tier=tier,
                                  confidence=round(float(P[s:e, kind].max()), 3)))
    for op in openers(pcm, triples, source_start):          # an opener cut swallows the cuts it touches and replaces volume changes under it
        op["tier"] = "sure"; hit = [it for it in items if it["start"] <= op["end"] and it["end"] >= op["start"]]
        for it in hit:
            if it["action"] == "delete" and it["tier"] == "sure": op["start"], op["end"] = min(op["start"], it["start"]), max(op["end"], it["end"])
        op["frames"] = int(round((op["end"] - op["start"]) * FPS)); items = [it for it in items if it not in hit] + [op]
    items.sort(key=lambda it: it["start"])
    return dict(fps=FPS, sourceStart=source_start, items=items,
                counts={k: sum(it["rule"] == k and it["tier"] == "sure" for it in items) for k in ("blemish", "breath", "sniff", "click", "opener")},
                suggestions=sum(it["tier"] == "maybe" for it in items),
                secondsCut=round(sum(it["frames"] for it in items if it["action"] == "delete" and it["tier"] == "sure") / FPS, 2))

PREVIEW_RATE, PREVIEW_PAD, SHAPE_POINTS = 22050, 1.0, 160   # what the Panel plays and draws for one item: a second either side, mono

def previews(pcm, items, source_start, path):
    """One short mono clip per item, back to back in `path` (16-bit, PREVIEW_RATE), and a level curve to draw.
    Each item gets `snip` = [byte offset, samples, item start sample, item end sample] and `shape` = SHAPE_POINTS linear peaks, 0-1000."""
    from scipy.signal import resample_poly
    at = 0
    with open(path, "wb") as f:
        for it in items:
            a = max(0, int(round((it["start"] - PREVIEW_PAD - source_start) * 48000))); b = min(len(pcm), int(round((it["end"] + PREVIEW_PAD - source_start) * 48000)))
            x = resample_poly(np.asarray(pcm[a:b], np.float32).mean(axis=1), 147, 320)            # 48000 -> 22050
            lo = int(round((it["start"] - source_start - a / 48000) * PREVIEW_RATE)); hi = min(len(x), lo + int(round(it["frames"] / FPS * PREVIEW_RATE)))
            f.write(np.clip(x, -32768, 32767).astype("<i2").tobytes()); it["snip"] = [at, len(x), max(0, lo), hi]; at += len(x) * 2
            edges = np.linspace(0, len(x), SHAPE_POINTS + 1).astype(int)
            it["shape"] = [int(round(min(1000, float(np.abs(x[i:j]).max()) / 32.768))) if j > i else 0 for i, j in zip(edges, edges[1:])]   # peak per slice, linear, 1000 = full scale

def self_check():
    P = np.zeros((14, 4), np.float32); P[:, 0] = 1; P[3:6] = [0.1, 0.8, 0.05, 0.05]; P[10] = [0.6, 0.28, 0.06, 0.06]
    dirt = np.full(14, 20.0); dirt[10] = 3.0; quiet = np.ones(14, bool)
    assert decide(P, dirt, quiet).tolist() == [0, 0, 0, 1, 1, 1] + [0] * 8      # the weak proposal with nothing sticking out is dropped
    dirt[10] = 20.0
    assert decide(P, dirt, quiet)[10] == 2                                       # an unsure 1-frame cut becomes a mute, not a cut
    P[7] = [0.1, 0.8, 0.05, 0.05]
    assert decide(P, dirt, quiet)[6] == 1                                        # proposals one quiet frame apart are joined

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--wav"); ap.add_argument("--model"); ap.add_argument("--out"); ap.add_argument("--source-start", type=float, default=0.0); ap.add_argument("--openers", default="[]"); ap.add_argument("--previews")
    ap.add_argument("--self-check", action="store_true"); a = ap.parse_args()
    if a.self_check: self_check(); print("ok"); sys.exit(0)
    import joblib
    sr, pcm = wavfile.read(a.wav, mmap=True)
    if sr != 48000 or pcm.ndim != 2 or pcm.shape[1] != 2 or pcm.dtype != np.int16: sys.exit("expected 48 kHz stereo 16-bit PCM")
    pack = joblib.load(a.model); edl = build(pcm, pack["model"], pack["columns"], a.source_start, json.loads(a.openers))
    if a.previews: previews(pcm, edl["items"], a.source_start, a.previews)
    with open(a.out, "w") as f: json.dump(edl, f); print(json.dumps(dict(items=len(edl["items"]), counts=edl["counts"], suggestions=edl["suggestions"], secondsCut=edl["secondsCut"])))
