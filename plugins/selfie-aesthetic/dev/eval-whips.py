#!/usr/bin/env python3
"""eval-whips.py - where do the blur whips of a Selfie Aesthetic export land, and do they match the intended cuts?

The style hides every cut inside a blur whip (the last w frames of the outgoing clip and the first w frames of the
incoming clip are smeared, w = max(1, round(0.067 * fps))), so scene-score cut detection (eval-beat-sync.cjs) finds
no cuts at all. This tool finds the whips from per-frame sharpness instead and checks them against the planner's
intended cut frames.

Usage:
  python3 eval-whips.py VIDEO [--cuts cuts.json | --cut-frames 18,27,...] [--fps F] [--thresh 0.3] [--json out.json]
  python3 eval-whips.py --selftest [REF.mp4]

  VIDEO            exported MP4 (evaluate at the Draft's fps; an SD export is enough)
  --cuts FILE      the driver's cuts file (cuts-<key>-s<seed>.json: {fps, cuts: [frames], ...}) or a bare [frames]
  --cut-frames L   intended cut frames, comma-separated (at --fps, default the video fps)
  --fps F          fps of the intended cut frames (default: the cuts file's fps, else the video's real fps)
  --thresh T       primary threshold on normalised sharpness (default 0.3)
  --json FILE      write the full result as JSON
  --selftest [REF] synthetic 25 fps self-check (no reference needed); with REF also the xlass_07 reference
                   (30 fps, 97.67 BPM, firstBeat 0.156 s, 24 whips; CapCut-made, so a +-1 frame tolerance)

Method:
  sharpness  variance of the 4-neighbour Laplacian of each grey frame scaled to 240 px on the short side.
  normalise  rel[i] = sh[i] / min(max(sh[i-W..i-1]), max(sh[i+1..i+W])), W = 2w + 2 frames: a frame is judged
             against the sharpest frame of the holds right before and right after it, and against the dimmer of the
             two. A whip frame sees hold A on one side and hold B on the other, so it reads low even when A and B
             differ a lot in texture; a hold frame always has its own hold within reach, so it reads ~1 whatever its
             texture. A global or rolling p75 compares against a mixture of clips instead: on the reference finale
             (holds of texture 205 next to 550) a rolling p75 puts the dim holds at 0.41, near the 0.3 threshold,
             and a whip-free blurry bar would read as one long "whip" under a global p75.
  primary    runs of frames with rel < thresh. Centre = (s + e) / 2 in frame boundaries for a run [s, e): an even
             run centred on a cut gives exactly the cut boundary (frame c = the first incoming frame, time c / fps).
  weak       an intended cut with no primary run within +-3 frames gets a second look: sharpness relative to a
             +-0.5 s rolling median (primary-run frames masked out), a local minimum within +-3 frames that dips
             >= 15 %, its run = contiguous frames below half depth (1 + min) / 2, at most 2w + 2 frames long. Such
             cuts count as found but are flagged `weak` (two nearly identical holds give only a faint smear).
  matching   one-to-one, nearest first, within +-3 frames. offset = detected - intended (ms, + = late).
  pass       every intended cut found, |offset| <= half a frame at the real fps, and 0 extra (unmatched primary
             runs, listed with their absolute mean sharpness so a human can tell a blurry freeze from a stray whip).

Exit code: 0 when the check passes (or no intended cuts were given), 1 when it fails, 2 on usage/decode errors.
The last line printed is a one-line JSON summary {pass, found, missing, extra, maxAbsOffsetMs, fps, toleranceMs, ...}.
"""
import argparse
import json
import math
import os
import subprocess
import sys
import tempfile

import numpy as np

MATCH_RADIUS = 3  # frames
EPS = 1e-6


# ---------------------------------------------------------------- probing and decoding

def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, check=True, **kw)


def parse_rate(s):
    if not s or s in ('0/0', 'N/A'):
        return None
    if '/' in s:
        a, b = s.split('/')
        return float(a) / float(b) if float(b) else None
    return float(s)


def probe(path):
    out = run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
               'stream=width,height,r_frame_rate,avg_frame_rate:stream_side_data=rotation:stream_tags=rotate',
               '-of', 'json', path], text=True).stdout
    st = json.loads(out)['streams'][0]
    rot = 0
    for sd in st.get('side_data_list', []) or []:
        if 'rotation' in sd:
            rot = int(float(sd['rotation']))
    if not rot and st.get('tags', {}).get('rotate'):
        rot = int(float(st['tags']['rotate']))
    w, h = int(st['width']), int(st['height'])
    if abs(rot) % 180 == 90:  # ffmpeg auto-rotates on decode
        w, h = h, w
    r, avg = parse_rate(st.get('r_frame_rate')), parse_rate(st.get('avg_frame_rate'))
    fps = avg or r
    vfr = bool(r and avg and abs(r - avg) > 1e-3)
    return {'width': w, 'height': h, 'fps': fps, 'r_frame_rate': r, 'avg_frame_rate': avg, 'vfr': vfr}


def scaled_size(w, h, short=240):
    if w <= h:
        return short, int(round(h * short / w / 2) * 2)
    return int(round(w * short / h / 2) * 2), short


def decode_grey(path, w, h):
    sw, sh = scaled_size(w, h)
    raw = run(['ffmpeg', '-v', 'error', '-i', path, '-an', '-vsync', 'passthrough',
               '-vf', f'scale={sw}:{sh}:flags=area,format=gray', '-f', 'rawvideo', '-']).stdout
    n = len(raw) // (sw * sh)
    if n * sw * sh != len(raw) or n == 0:
        raise RuntimeError(f'unexpected decoded size {len(raw)} for {sw}x{sh}')
    return np.frombuffer(raw, np.uint8).reshape(n, sh, sw).astype(np.float64)


def sharpness(frames):
    x = frames
    lap = 4 * x[:, 1:-1, 1:-1] - x[:, :-2, 1:-1] - x[:, 2:, 1:-1] - x[:, 1:-1, :-2] - x[:, 1:-1, 2:]
    return lap.reshape(len(x), -1).var(axis=1)


# ---------------------------------------------------------------- analysis

def whip_width(fps):
    return max(1, int(round(0.067 * fps)))


def normalise(sh, win):
    """sh[i] / min(max of the win frames before, max of the win frames after); edges use the side that exists."""
    n = len(sh)
    rel = np.ones(n)
    for i in range(n):
        left = sh[max(0, i - win):i]
        right = sh[i + 1:i + 1 + win]
        refs = [a.max() for a in (left, right) if len(a)]
        ref = min(refs) if refs else sh[i]
        rel[i] = sh[i] / ref if ref > 0 else 1.0
    return rel


def find_runs(mask):
    runs, i, n = [], 0, len(mask)
    while i < n:
        if mask[i]:
            j = i
            while j < n and mask[j]:
                j += 1
            runs.append((i, j))
            i = j
        else:
            i += 1
    return runs


def rolling_median_masked(sh, half, mask):
    n = len(sh)
    med = np.empty(n)
    for i in range(n):
        lo, hi = max(0, i - half), min(n, i + half + 1)
        seg = sh[lo:hi][~mask[lo:hi]]
        med[i] = np.median(seg) if len(seg) else np.median(sh[lo:hi])
    return med


def weak_candidate(rel_med, c, w, primary_mask):
    """A dip of >= 15 % around intended boundary c (float frames); returns (s, e, minRel) or None."""
    n = len(rel_med)
    lo, hi = max(0, int(math.floor(c - MATCH_RADIUS)) - w), min(n, int(math.ceil(c + MATCH_RADIUS)) + w)
    best = None
    for i in range(lo, hi):
        if primary_mask[i]:
            continue
        v = rel_med[i]
        if v > 0.85:
            continue
        if (i > 0 and rel_med[i - 1] < v) or (i + 1 < n and rel_med[i + 1] < v):
            continue  # not a local minimum
        half = (1 + v) / 2
        s = i
        while s > 0 and rel_med[s - 1] < half and not primary_mask[s - 1]:
            s -= 1
        e = i + 1
        while e < n and rel_med[e] < half and not primary_mask[e]:
            e += 1
        if e - s > 2 * w + 2:
            continue  # a slow texture change, not a whip
        centre = (s + e) / 2
        if abs(centre - c) > MATCH_RADIUS + EPS:
            continue
        if best is None or abs(centre - c) < abs(best[0] + (best[1] - best[0]) / 2 - c):
            best = (s, e, float(v))
    return best


def analyse(sh, fps, thresh=0.3):
    w = whip_width(fps)
    win = 2 * w + 2
    rel = normalise(sh, win)
    mask = rel < thresh
    runs = find_runs(mask)
    return {'w': w, 'win': win, 'rel': rel, 'mask': mask, 'runs': runs}


def evaluate(sh, fps, intended, thresh=0.3, tol_frames=0.5):
    """intended: cut boundaries in video frames (floats). Returns the result dict (no I/O)."""
    a = analyse(sh, fps, thresh)
    w, rel, mask, runs = a['w'], a['rel'], a['mask'], a['runs']
    det = [{'start': s, 'end': e, 'len': e - s, 'centre': (s + e) / 2, 'tS': round((s + e) / 2 / fps, 4),
            'minRel': round(float(rel[s:e].min()), 3), 'meanRel': round(float(rel[s:e].mean()), 3),
            'meanSharp': round(float(sh[s:e].mean()), 1)} for s, e in runs]
    # hold margin: lowest rel outside runs and the w frames around them (CapCut-style ramps)
    near = mask.copy()
    for s, e in runs:
        near[max(0, s - w):min(len(near), e + w)] = True
    hold_min = round(float(rel[~near].min()), 3) if (~near).any() else None
    res = {'fps': fps, 'whipFrames': w, 'window': a['win'], 'thresh': thresh, 'frames': int(len(sh)),
           'holdMinRel': hold_min, 'detected': det}
    if intended is None:
        res.update({'pass': None, 'cuts': [], 'extra': det})
        return res
    tol_ms = tol_frames * 1000 / fps
    pairs = sorted((abs(d['centre'] - c), ci, di) for ci, c in enumerate(intended) for di, d in enumerate(det)
                   if abs(d['centre'] - c) <= MATCH_RADIUS + EPS)
    cut_to, used = {}, set()
    for _, ci, di in pairs:
        if ci in cut_to or di in used:
            continue
        cut_to[ci] = di
        used.add(di)
    rel_med = None
    cuts = []
    for ci, c in enumerate(intended):
        row = {'i': ci, 'intendedFrame': round(c, 3), 'intendedS': round(c / fps, 4)}
        if ci in cut_to:
            d = det[cut_to[ci]]
            row.update({'status': 'found', 'centre': d['centre'], 'run': [d['start'], d['end']], 'len': d['len'],
                        'minRel': d['minRel']})
        else:
            if rel_med is None:
                med = rolling_median_masked(sh, int(round(0.5 * fps)), mask)
                rel_med = np.where(med > 0, sh / np.where(med > 0, med, 1), 1.0)
            wk = weak_candidate(rel_med, c, w, mask)
            if wk:
                s, e, v = wk
                row.update({'status': 'weak', 'centre': (s + e) / 2, 'run': [s, e], 'len': e - s,
                            'minRel': round(v, 3), 'relTo': 'rollingMedian'})
            else:
                row.update({'status': 'missing'})
        if 'centre' in row:
            row['offsetMs'] = round((row['centre'] - c) * 1000 / fps, 2)
            row['inTol'] = abs(row['offsetMs']) <= tol_ms + 1e-3
        cuts.append(row)
    extra = [d for di, d in enumerate(det) if di not in used]
    for r in cuts:  # the hold margin excludes weak whips too
        if r['status'] == 'weak':
            near[max(0, r['run'][0] - w):min(len(near), r['run'][1] + w)] = True
    res['holdMinRel'] = round(float(rel[~near].min()), 3) if (~near).any() else None
    found = [r for r in cuts if r['status'] != 'missing']
    offs = [abs(r['offsetMs']) for r in found]
    res.update({
        'cuts': cuts, 'extra': extra, 'toleranceMs': round(tol_ms, 2),
        'pass': len(found) == len(cuts) and all(r['inTol'] for r in found) and not extra,
        'found': len(found), 'weak': sum(r['status'] == 'weak' for r in cuts),
        'missing': [r['i'] for r in cuts if r['status'] == 'missing'],
        'maxAbsOffsetMs': round(max(offs), 2) if offs else None,
    })
    return res


def summary(res):
    if res.get('pass') is None:
        return {'pass': None, 'found': 0, 'missing': 0, 'extra': len(res['extra']), 'maxAbsOffsetMs': None,
                'fps': round(res['fps'], 3), 'toleranceMs': None, 'detected': len(res['detected'])}
    return {'pass': res['pass'], 'found': res['found'], 'missing': len(res['missing']), 'extra': len(res['extra']),
            'maxAbsOffsetMs': res['maxAbsOffsetMs'], 'fps': round(res['fps'], 3), 'toleranceMs': res['toleranceMs'],
            'weak': res['weak']}


def table(res, label=''):
    L = []
    fps = res['fps']
    L.append(f"# {label}  {fps:.3f} fps{'  VFR (r != avg)' if res.get('vfr') else ''}  {res['frames']} frames  "
             f"whip w={res['whipFrames']}  window {res['window']}  thresh {res['thresh']}  "
             f"{len(res['detected'])} primary runs  hold min rel {res['holdMinRel']}")
    if res['cuts']:
        L.append(f"{'#':>3} {'intended':>9} {'t(s)':>7} {'status':>8} {'centre':>7} {'offset ms':>9} "
                 f"{'run':>10} {'len':>3} {'minRel':>6}")
        for r in res['cuts']:
            if r['status'] == 'missing':
                L.append(f"{r['i']:>3} {r['intendedFrame']:>9.2f} {r['intendedS']:>7.3f} {'MISSING':>8}")
                continue
            flag = '' if r['inTol'] else '  OUT OF TOL'
            L.append(f"{r['i']:>3} {r['intendedFrame']:>9.2f} {r['intendedS']:>7.3f} {r['status']:>8} "
                     f"{r['centre']:>7.1f} {r['offsetMs']:>+9.1f} {str(r['run'][0]) + '-' + str(r['run'][1]):>10} "
                     f"{r['len']:>3} {r['minRel']:>6.3f}{flag}")
    if res['extra']:
        L.append('extra whips (primary runs matching no intended cut):' if res['cuts'] else 'detected whips:')
        for d in res['extra']:
            L.append(f"    run {d['start']}-{d['end']} ({d['len']} f)  centre {d['centre']:.1f} = {d['tS']:.3f} s  "
                     f"mean sharpness {d['meanSharp']} (rel {d['meanRel']}, min {d['minRel']})")
    if res['cuts']:
        L.append(f"tolerance +-{res['toleranceMs']} ms; found {res['found']}/{len(res['cuts'])} "
                 f"({res['weak']} weak), missing {res['missing']}, extra {len(res['extra'])}, "
                 f"max |offset| {res['maxAbsOffsetMs']} ms -> {'PASS' if res['pass'] else 'FAIL'}")
    return '\n'.join(L)


def eval_file(path, intended_frames=None, cuts_fps=None, thresh=0.3, tol_frames=0.5):
    info = probe(path)
    fps = info['fps']
    sh = sharpness(decode_grey(path, info['width'], info['height']))
    intended = None
    if intended_frames is not None:
        cf = cuts_fps or fps
        intended = [f * fps / cf if abs(cf - fps) > 1e-6 else float(f) for f in intended_frames]
    res = evaluate(sh, fps, intended, thresh, tol_frames)
    res.update({'file': os.path.basename(path), 'vfr': info['vfr'], 'rFrameRate': info['r_frame_rate'],
                'avgFrameRate': info['avg_frame_rate'], 'cutsFps': cuts_fps or fps})
    return res


def load_cuts(spec):
    if os.path.exists(spec):
        with open(spec) as f:
            data = json.load(f)
        if isinstance(data, list):
            return [float(x) for x in data], None
        return [float(x) for x in data['cuts']], data.get('fps')
    return [float(x) for x in spec.split(',') if x.strip()], None


# ---------------------------------------------------------------- self-tests

def box_blur(img, rx, ry):
    out = img
    if rx:
        p = np.pad(out, ((0, 0), (rx + 1, rx)), mode='edge')
        c = np.cumsum(p, axis=1)
        out = (c[:, 2 * rx + 1:] - c[:, :-2 * rx - 1]) / (2 * rx + 1)
    if ry:
        p = np.pad(out, ((ry + 1, ry), (0, 0)), mode='edge')
        c = np.cumsum(p, axis=0)
        out = (c[2 * ry + 1:, :] - c[:-2 * ry - 1, :]) / (2 * ry + 1)
    return out


def synthetic_clip(path, fps=25):
    """Holds of testsrc2 crops with whips of w frames each side of every cut. Clips 0-4 alternate sharp crops (one
    low-texture), clips 5-7 form a bar whose source is itself mildly blurred (a soft clip), clips 8-9 sharp again.
    Clip 10 is the same image as clip 9 and their cut has only a faint smear (a weak whip, as at reference beats
    5-7). Returns (cuts, index of the weak cut)."""
    S, OW, OH = 960, 480, 864
    raw = run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', f'testsrc2=size={S}x{S}:rate=25', '-frames:v', '60',
               '-pix_fmt', 'gray', '-f', 'rawvideo', '-']).stdout
    src = np.frombuffer(raw, np.uint8).reshape(-1, S, S).astype(np.float64)
    crops = [(0, 0), (480, 96), (240, 48), (0, 96), (480, 0), (120, 20), (360, 80), (200, 60), (60, 10), (420, 40)]
    imgs = []
    for k, (x, y) in enumerate(crops):
        im = src[(k * 5) % len(src)][y:y + OH, x:x + OW]
        if k == 2:
            im = 0.35 * box_blur(im, 2, 2) + 0.65 * 128  # low-contrast, low-texture clip next to sharp ones
        if 5 <= k <= 7:
            im = box_blur(im, 3, 3)  # a soft source clip: the whole bar is blurrier than the rest
        imgs.append(im)
    imgs.append(imgs[-1])
    cuts = [15, 27, 40, 52, 65, 80, 92, 105, 118, 130]
    weak_cut = len(cuts) - 1
    total = 142
    w = whip_width(fps)
    bounds = [0] + cuts + [total]
    frames = []
    for k in range(len(bounds) - 1):
        a, b = bounds[k], bounds[k + 1]
        whip = box_blur(box_blur(imgs[k], 28, 0), 10, 10)  # directional smear + blur, like the app's whip
        faint = 0.8 * imgs[k] + 0.2 * box_blur(imgs[k], 3, 3)  # sharpness dips to ~0.65 only
        for f in range(a, b):
            if (k > 0 and f < a + w and k - 1 == weak_cut) or (k < len(bounds) - 2 and f >= b - w and k == weak_cut):
                frames.append(faint)
            elif (k > 0 and f < a + w) or (k < len(bounds) - 2 and f >= b - w):
                frames.append(whip)
            else:
                frames.append(imgs[k])
    data = np.clip(np.stack(frames), 0, 255).astype(np.uint8).tobytes()
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', f'{OW}x{OH}',
                    '-r', str(fps), '-i', '-', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', path],
                   input=data, check=True)
    return cuts, weak_cut


def selftest(ref=None):
    ok = True

    def check(cond, msg):
        nonlocal ok
        if not cond:
            ok = False
            print('SELFTEST FAIL: ' + msg)

    with tempfile.TemporaryDirectory() as td:
        p = os.path.join(td, 'synthetic.mp4')
        cuts, weak_cut = synthetic_clip(p)
        res = eval_file(p, cuts)
        print(table(res, 'synthetic 25 fps (sharp / low-texture / soft-bar holds, one weak whip)'))
        print(json.dumps(summary(res)))
        check(res['pass'], 'synthetic did not pass')
        check(res['found'] == len(cuts), 'synthetic: not all cuts found')
        check([r['i'] for r in res['cuts'] if r['status'] == 'weak'] == [weak_cut],
              'synthetic: only the faint whip should be weak')
        check(all(r.get('offsetMs') == 0 for r in res['cuts']), 'synthetic: nonzero offset')
        check(not res['extra'], 'synthetic: extra whips')
        # negative checks on the same clip: an intended cut without a whip, a whip without an intended cut,
        # a cut one frame off, and the cuts given at 50 fps (converted via seconds)
        r2 = eval_file(p, cuts + [72])
        check(not r2['pass'] and r2['missing'] == [len(cuts)], 'synthetic: cut without a whip not reported missing')
        r3 = eval_file(p, cuts[:-2] + cuts[-1:])
        check(not r3['pass'] and len(r3['extra']) == 1 and r3['extra'][0]['centre'] == cuts[-2],
              'synthetic: unlisted whip not reported as extra')
        r4 = eval_file(p, [c + (1 if i == 3 else 0) for i, c in enumerate(cuts)])
        check(not r4['pass'] and r4['cuts'][3]['offsetMs'] == -40.0, 'synthetic: 1-frame error not caught')
        r5 = eval_file(p, [c * 2 for c in cuts], cuts_fps=50)
        check(r5['pass'], 'synthetic: cuts at 50 fps not converted')
        print(f"negative checks: missing {r2['missing']}, extra {[d['centre'] for d in r3['extra']]}, "
              f"1-frame error {r4['cuts'][3]['offsetMs']} ms, 50 fps cuts pass={r5['pass']}")
    if ref:
        bpm, first = 97.67, 0.156
        beats = [1, 1.5, 2, 2.5, 3, 4, 5, 5.5, 6, 6.5, 7, 8, 9, 9.5, 10, 10.5, 11, 12, 12.5, 13, 13.5, 14, 14.5, 15]
        info = probe(ref)
        intended = [(first + b * 60 / bpm) * info['fps'] for b in beats]
        res = eval_file(ref, intended, tol_frames=1.0)
        print()
        print(table(res, os.path.basename(ref) + ' (reference, +-1 frame)'))
        print(json.dumps(summary(res)))
        # The detector is checked on detection (24/24, 0 extra) and on offsets within the +-2 frame band; the
        # reference's own whip placement jitters by up to ~1.7 frames around the fitted 97.67 BPM grid (CapCut
        # template quantisation, mean ~+18 ms), so cuts beyond +-1 frame are reported, not failed.
        check(res['found'] == 24, f"reference: found {res['found']}/24")
        check(not res['extra'], 'reference: extra whips')
        found = [r for r in res['cuts'] if 'offsetMs' in r]
        check(all(abs(r['offsetMs']) <= 2000 / info['fps'] + 1e-3 for r in found), 'reference: offset beyond 2 frames')
        beyond = [r['i'] for r in found if not r['inTol']]
        mean = sum(r['offsetMs'] for r in found) / max(1, len(found))
        print(f"reference: mean offset {mean:+.1f} ms; beyond +-1 frame (the reference's own jitter, not failed): "
              f"{beyond}")
        # Real-footage coverage of the weak detector: at this decode the beat 5-7 whips dip to ~0.28 (primary at
        # 0.3, as 1-2 frame runs); at --thresh 0.2 they must come back as weak, with the same or nearby centres.
        rw = eval_file(ref, intended, thresh=0.2, tol_frames=1.0)
        weak_idx = [r['i'] for r in rw['cuts'] if r['status'] == 'weak']
        check(rw['found'] == 24 and not rw['extra'], 'reference @0.2: not 24 found / 0 extra')
        check(weak_idx == [i for i, b in enumerate(beats) if 5 <= b <= 7], f'reference @0.2: weak {weak_idx}')
        check(all(abs(a['centre'] - b['centre']) <= 1 for a, b in zip(res['cuts'], rw['cuts'])),
              'reference @0.2: centres moved by more than a frame')
        print('reference @ thresh 0.2: weak ' + ', '.join(
            f"#{r['i']} {r['centre']:.1f} ({r['offsetMs']:+.1f} ms, {r['len']} f)" for r in rw['cuts'] if r['status'] == 'weak'))
        non_weak_57 = [r for r, b in zip(res['cuts'], beats) if r['status'] == 'weak' and not 5 <= b <= 7]
        check(not non_weak_57, 'reference: weak cuts outside beats 5-7')
    print('SELFTEST ' + ('OK' if ok else 'FAILED'))
    return ok


# ---------------------------------------------------------------- CLI

def main(argv=None):
    ap = argparse.ArgumentParser(description='Blur-whip cut evaluator (see the module docstring).')
    ap.add_argument('video', nargs='?')
    g = ap.add_mutually_exclusive_group()
    g.add_argument('--cuts')
    g.add_argument('--cut-frames')
    ap.add_argument('--fps', type=float)
    ap.add_argument('--thresh', type=float, default=0.3)
    ap.add_argument('--json')
    ap.add_argument('--selftest', nargs='?', const='', default=None, metavar='REF')
    a = ap.parse_args(argv)
    if a.selftest is not None:
        return 0 if selftest(a.selftest or None) else 1
    if not a.video:
        ap.print_help()
        return 2
    intended, cuts_fps = None, None
    if a.cuts or a.cut_frames:
        intended, cuts_fps = load_cuts(a.cuts or a.cut_frames)
    cuts_fps = a.fps or cuts_fps
    try:
        res = eval_file(a.video, intended, cuts_fps, a.thresh)
    except (subprocess.CalledProcessError, RuntimeError, KeyError, IndexError) as e:
        print(f'error: {e}', file=sys.stderr)
        return 2
    print(table(res, res['file']))
    if res['vfr']:
        print(f"note: VFR stream (r_frame_rate {res['rFrameRate']} != avg_frame_rate {res['avgFrameRate']}); "
              'frame indices assume the average rate')
    if a.json:
        out = dict(res)
        with open(a.json, 'w') as f:
            json.dump(out, f, indent=1)
    s = summary(res)
    print(json.dumps(s))
    return 0 if s['pass'] in (True, None) else 1


if __name__ == '__main__':
    sys.exit(main())
