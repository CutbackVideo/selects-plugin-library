"""Audio cleanup candidates for one recording, following a broadcast editing guide. No trained model: plain rules.
48 kHz stereo WAV in, a list of sounds out. The Panel decides which of them to clean from the user's settings.

  python analyze.py --wav in.wav --out sounds.json [--source-start 0.0] [--words words.json] [--openers '[[start, next, prevEnd], ...]']

A sound is a stretch inside a pause (frames under PAUSE dBFS) whose >2 kHz peak stands AUDIBLE dB over the noise floor;
stretches one or two quiet frames apart are one sound. Each comes with what the Panel's settings read:
  gap    frames to the nearest speech, on the nearer side (0 or 1 = attached to speech)
  loud   dB over the floor at its loudest frame
  spiky  dB between the loudest and quietest 4 ms of that frame, >2 kHz (a tick is spiky, a breath is not)
  edge   seconds: it counts as inside a transcript word for any margin above this (null without `--words`)
`--words` is a JSON file of [start, end] spoken words in source seconds. `--openers` lists standalone opener words
(source seconds: its start, the next word's start, the previous word's end); one is cut when the waveform shows it
standing alone. Times in the list are source seconds (`--source-start` + frame / 30)."""
import argparse, json, os, sys
import numpy as np
from scipy.io import wavfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import features as ft

FPS = 30
PAUSE = -40.0       # dBFS: a frame under this is a pause
AUDIBLE = 12.0      # dB over the >2 kHz floor: what sticks out of a pause
BLOCK, MARGIN = 3600, 300   # frames: 2-minute blocks with 10 s of context on each side, so memory does not grow with the recording

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

def measure(pcm):
    """Per-frame level, dirt and spikiness, block by block."""
    n = len(pcm) // ft.FR; level = np.zeros(n, np.float32); dirt = level.copy(); spiky = level.copy()
    for s in range(0, n, BLOCK):
        a, e = max(0, s - MARGIN), min(n, s + BLOCK); b = min(n, e + MARGIN); k = slice(s - a, e - a)
        lv, d, sp = ft.levels(np.asarray(pcm[a * ft.FR: b * ft.FR])); level[s:e], dirt[s:e], spiky[s:e] = lv[k], d[k], sp[k]
    return level, dirt, spiky

def sounds(level, dirt, spiky, words=None, source_start=0.0):
    """Every sound that sticks out of a pause, with the measures the settings read."""
    quiet = level < PAUSE; n = len(quiet); i = np.arange(n); speech = np.where(~quiet, i, -1)
    since = i - np.maximum.accumulate(np.where(speech >= 0, speech, -999))                                  # frames since the last speech frame
    until = np.minimum.accumulate(np.where(speech >= 0, speech, n + 999)[::-1])[::-1] - i                   # frames to the next one
    ev = []
    for s, e in ft.runs(quiet & (dirt >= AUDIBLE)):
        if ev and s - ev[-1][1] <= 2 and quiet[ev[-1][1]:s].all(): ev[-1][1] = e
        else: ev.append([s, e])
    ws = np.asarray(words, np.float64).reshape(-1, 2) if words is not None and len(words) else None; out = []
    for s, e in ev:
        p = s + int(dirt[s:e].argmax()); gl = since[s - 1] if s > 0 and quiet[s - 1] else 0; gr = until[e] if e < n and quiet[e] else 0
        t0, t1 = source_start + s / FPS, source_start + e / FPS
        out.append(dict(start=round(t0, 6), end=round(t1, 6), frames=int(e - s), rule="sound", gap=int(min(gl, gr, 30)), loud=round(float(dirt[p]), 1), spiky=round(float(spiky[p]), 1),
                        edge=None if ws is None else round(float(np.maximum(ws[:, 0] - t0, t1 - ws[:, 1]).min()), 5)))
    return out

def build(pcm, source_start=0.0, triples=(), words=None):
    items = sounds(*measure(pcm), words, source_start)
    for op in openers(pcm, triples, source_start):
        # ponytail: a sound under an opener cut is dropped here, so it stays out even when the user switches openers off
        items = [it for it in items if it["end"] < op["start"] or it["start"] > op["end"]] + [op]
    items.sort(key=lambda it: it["start"])
    return dict(fps=FPS, sourceStart=source_start, items=items)

PAD, SHAPE_POINTS = 1.0, 100   # what the Panel plays and draws for one item: a second either side

def shapes(pcm, items, source_start):
    """Where each item's sound is in the WAV and a level curve to draw: `snip` = [first sample, samples, item start, item end]
    (48 kHz sample frames, the last two counted from the first) and `shape` = SHAPE_POINTS linear peaks, 0-1000."""
    for it in items:
        a = max(0, int(round((it["start"] - PAD - source_start) * 48000))); b = min(len(pcm), int(round((it["end"] + PAD - source_start) * 48000)))
        x = np.abs(np.asarray(pcm[a:b], np.float32).mean(axis=1)); lo = int(round((it["start"] - source_start) * 48000)) - a
        it["snip"] = [a, b - a, max(0, lo), min(b - a, lo + it["frames"] * 1600)]
        edges = np.linspace(0, len(x), SHAPE_POINTS + 1).astype(int)
        it["shape"] = [int(round(min(1000, float(x[i:j].max()) / 32.768))) if j > i else 0 for i, j in zip(edges, edges[1:])]   # peak per slice, linear, 1000 = full scale

def self_check():
    n = 60; level = np.full(n, -60.0); dirt = np.zeros(n); spiky = np.zeros(n)
    level[:10] = level[30:40] = -20                      # speech
    dirt[20] = 25; dirt[22] = 14; dirt[40:43] = 18       # two ticks two quiet frames apart in the first pause; a sound right after speech
    ev = sounds(level, dirt, spiky, [[0.0, 10 / 30], [1.0, 40 / 30]])
    assert [(round(e["start"] * 30), e["frames"], e["gap"], e["loud"]) for e in ev] == [(20, 3, 7, 25.0), (40, 3, 0, 18.0)], ev
    assert abs(ev[0]["edge"] - 1 / 3) < 1e-4 and abs(ev[1]["edge"] - .1) < 1e-4   # a word must reach this far past its own ends to cover the whole sound
    dirt[22] = 0; dirt[24] = 14
    assert len(sounds(level, dirt, spiky)) == 3                 # three quiet frames apart: left apart

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--wav"); ap.add_argument("--out"); ap.add_argument("--source-start", type=float, default=0.0); ap.add_argument("--openers", default="[]"); ap.add_argument("--words")
    ap.add_argument("--self-check", action="store_true"); a = ap.parse_args()
    if a.self_check: self_check(); print("ok"); sys.exit(0)
    sr, pcm = wavfile.read(a.wav, mmap=True)
    if sr != 48000 or pcm.ndim != 2 or pcm.shape[1] != 2 or pcm.dtype != np.int16: sys.exit("expected 48 kHz stereo 16-bit PCM")
    edl = build(pcm, a.source_start, json.loads(a.openers), json.load(open(a.words)) if a.words else None)
    shapes(pcm, edl["items"], a.source_start); edl["dataOffset"] = int(pcm.offset)   # where the samples start in the WAV file
    with open(a.out, "w") as f: json.dump(edl, f, separators=(",", ":")); print(json.dumps(dict(items=len(edl["items"]))))
