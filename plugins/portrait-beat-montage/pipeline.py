"""Portrait Beat Montage render pipeline.

Usage: python pipeline.py <op> '<json args>'   (prints one JSON line on success)

  doctor                      check ffmpeg, Python packages and the RVM runtime
  plan    {clips:[path x10], windows?}   probe the clips, choose each shot's window
  unit    {runId, key}        one shot window (also: unit-key RUN_ID KEY): source frames, RVM mattes, transition frames
  assemble {runId}            render the montage, cut it into Draft-rate clips

The look is fixed: it reproduces the approved prototype frame for frame
(60 fps master, 540x720, 15 beat slots after a 2-second strobe, a white
glow at the end). Run data lives in ~/.selects/plugin-data/portrait-beat-montage.
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
PLUGIN_ID = "portrait-beat-montage"
DATA = Path.home() / ".selects" / "plugin-data" / PLUGIN_ID
W, H, FPS = 540, 720, 60
DRAFT_FPS = 30000 / 1001
# The host's bundled ffmpeg/ffprobe: the panel passes the running Selects app's binaries in these variables (rvm/runtime.py
# and rvm/benchmark.py read the same ones); run by hand, the Selects apps in /Applications are tried, then PATH.
SELECTS_APPS = ("Selects", "Selects Staging", "Selects Alpha")


def tool(name):
    chosen = os.environ.get("POSTCARD_CUTOUT_RVM_" + name.upper())
    if chosen:
        return chosen
    for app in SELECTS_APPS:
        path = Path("/Applications") / (app + ".app") / "Contents/Resources/app.asar.unpacked/dist/bin" / name
        if path.is_file() and os.access(path, os.X_OK):
            return str(path)
    return shutil.which(name) or name


FFMPEG, FFPROBE = tool("ffmpeg"), tool("ffprobe")
for _name, _binary in (("FFMPEG", FFMPEG), ("FFPROBE", FFPROBE)):   # the RVM runner and detached workers use the same ones
    if os.path.isabs(_binary):
        os.environ.setdefault("POSTCARD_CUTOUT_RVM_" + _name, _binary)
Y = np.arange(H, dtype=np.float32)[:, None]
X = np.arange(W, dtype=np.float32)[None, :]

# ---- Timeline (60 fps master frames) ---------------------------------------
BLACK = 370                       # first portrait shot
PERIOD = .6445104895              # soundtrack beat, seconds
BEATS = [round(i * PERIOD * FPS) for i in range(16)]
LENGTHS = [b - a for a, b in zip(BEATS, BEATS[1:])]
SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1, 2, 3, 4, 5]   # clips 1-5 return
REPEAT_FROM = 10
TAIL = 30
TOTAL = BLACK + BEATS[-1] + TAIL  # 980
BOUNDARIES = [BLACK + b for b in BEATS[:-1]]
STROBE = [139, 139, 224, 224, 224, 253, 253, 224, 224, 224, 0, 0, 139, 139, 139, 224, 224, 253, 253, 253, 224, 224, 0, 0, 0, 139, 139, 224, 224, 224, 253, 253, 139, 139, 139, 0, 0, 139, 139, 139, 224, 224, 224, 224, 224, 139, 139, 0, 0, 0, 139, 139, 253, 253, 253, 195, 195, 139, 139, 139, 167, 167, 0, 0, 0, 253, 253, 0, 0, 0, 253, 253, 0, 0, 0, 253, 253, 0, 0, 0, 253, 253, 83, 83, 83, 167, 167, 167, 167, 167, 0, 0, 167, 167, 167, 83, 83, 83, 83, 83, 167, 167, 167, 167, 167, 0, 0, 84, 84, 84, 253, 253, 167, 167, 167, 0, 0, 167, 167, 167]
STROBE_START = BLACK - len(STROBE)                      # 250
GLOW = [240, 233, 226, 219, 210, 210, 186, 186, 186, 162, 162, 139, 139, 139, 116, 116, 91, 91, 91, 68, 68, 45, 45, 45, 22, 22]
RISER_START = 300

# ---- Shot motion ----------------------------------------------------------------
SRC_FRAMES = 60          # 1 s of 60 fps source per shot window
MATTE_FRAMES = 30        # frames the transition reads (positions reach 28.3) and RVM mattes
POST = 21                # transition frames per shot
RVM_RATIO = .5           # RVM downsample; 0.5 looked the same as 1.0 through the smear at about half the time
speeds = np.interp(np.arange(35) / 34, [0, .12, .35, .68, 1], [2.25, 1.9, 1.18, .73, .55])
positions = np.r_[0, np.cumsum(speeds)]
positions *= 38 / positions[-1]
_rng = np.random.default_rng(24244)
rough = _rng.normal(size=H)
_kernel = np.hanning(25); _kernel /= _kernel.sum()
rough = np.convolve(rough, _kernel, mode="same")
rough = np.clip(rough / max(rough.std(), .1), -1.5, 1.5)[:, None]


def log(msg):
    print(msg, file=sys.stderr, flush=True)


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, **kw)


def ffprobe(path):
    out = run([FFPROBE, "-v", "error", "-select_streams", "v:0", "-show_entries",
               "stream=width,height,r_frame_rate:stream_side_data=rotation:format=duration",
               "-of", "json", str(path)], stdout=subprocess.PIPE).stdout
    info = json.loads(out)
    s = info["streams"][0]
    w, h = int(s["width"]), int(s["height"])
    rot = 0
    for side in s.get("side_data_list", []) or []:
        rot = int(side.get("rotation", 0) or 0)
    if abs(rot) in (90, 270):
        w, h = h, w
    return {"width": w, "height": h, "duration": float(info["format"]["duration"])}


def crop_filter(w, h):
    """3:4 crop. Tall footage keeps the top of the frame (headroom), wide footage is centred."""
    if h * 3 >= w * 4:
        ch = int(w * 4 / 3) // 2 * 2
        y = int((h - ch) * .125) // 2 * 2
        return f"crop={w}:{ch}:0:{y}"
    cw = int(h * 3 / 4) // 2 * 2
    return f"crop={cw}:{h}:{(w - cw) // 2 // 2 * 2}:0"


def decode(path, count, vf="format=rgb24", size=(W, H)):
    raw = run([FFMPEG, "-v", "error", "-i", str(path), "-vf", vf, "-frames:v", str(count),
               "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE).stdout
    frames = np.frombuffer(raw, np.uint8).reshape(-1, size[1], size[0], 3)
    if len(frames) < count:
        raise RuntimeError(f"{Path(path).name}: expected {count} frames, got {len(frames)}")
    return frames.copy()


# ---- Window choice ---------------------------------------------------------------
def motion_scores(path, info):
    """Visible movement in the settled part of a shot (0.33-0.79 s after its start) for each start."""
    vf = crop_filter(info["width"], info["height"]) + ",fps=24,scale=135:180,format=gray"
    raw = run([FFMPEG, "-v", "error", "-t", "30", "-i", str(path), "-vf", vf, "-f", "rawvideo", "-"],
              stdout=subprocess.PIPE).stdout
    g = np.frombuffer(raw, np.uint8).reshape(-1, 180, 135).astype(np.float32)
    last_start = min(len(g) - 20, int((info["duration"] - 1.05) * 24))
    starts = np.arange(0, max(1, last_start + 1))
    scores = np.array([np.abs(g[s + 19] - g[s + 8]).mean() if s + 19 < len(g) else 0 for s in starts])
    return starts / 24, scores


def choose(starts, scores, avoid=None):
    if avoid is None:
        return float(starts[int(np.argmax(scores))])
    for gap in (.9, .5):
        ok = np.abs(starts - avoid) >= gap
        if ok.any():
            return float(starts[ok][int(np.argmax(scores[ok]))])
    return float(avoid)


def op_plan(args):
    clips = [str(Path(p)) for p in args["clips"]]
    if len(clips) != 10:
        raise ValueError("Exactly 10 clips are required.")
    forced = args.get("windows") or {}
    digest = hashlib.sha1(("|".join(clips) + json.dumps(forced, sort_keys=True)).encode()).hexdigest()[:6]
    # Resume an unfinished run of the same clips (the panel may have been closed mid-render).
    for old in sorted((DATA / "runs").glob(f"*-{digest}"), reverse=True):
        if (old / "plan.json").exists() and not (old / "manifest.json").exists():
            plan = json.loads((old / "plan.json").read_text())
            return {"runId": plan["runId"], "units": sorted(plan["units"]), "resumed": True,
                    "windows": {k: round(v["start"], 3) for k, v in plan["units"].items()}}
    run_id = time.strftime("%Y%m%d-%H%M%S") + "-" + digest
    root = DATA / "runs" / run_id
    root.mkdir(parents=True, exist_ok=False)
    units, slots = {}, []
    infos = []
    for i, path in enumerate(clips, 1):
        info = ffprobe(path)
        if info["duration"] < 1.1:
            raise ValueError(f"{Path(path).name} is shorter than 1.1 seconds.")
        infos.append(info)
        starts, scores = motion_scores(path, info)
        first = forced.get(f"{i}a", choose(starts, scores))
        units[f"c{i:02d}a"] = {"clip": i, "path": path, "start": first, **info}
        if i <= 5:
            again = forced.get(f"{i}b", choose(starts, scores, avoid=first))
            units[f"c{i:02d}b"] = {"clip": i, "path": path, "start": again, **info}
    for slot, clip in enumerate(SLOTS):
        slots.append(f"c{clip:02d}{'b' if slot >= REPEAT_FROM else 'a'}")
    plan = {"runId": run_id, "units": units, "slots": slots, "created": time.time()}
    (root / "plan.json").write_text(json.dumps(plan, indent=2))
    return {"runId": run_id, "units": sorted(units), "windows": {k: round(v["start"], 3) for k, v in units.items()}}


def load_plan(run_id):
    root = DATA / "runs" / run_id
    return root, json.loads((root / "plan.json").read_text())


# ---- Mattes ------------------------------------------------------------------------
def rvm_launcher():
    rvm = HERE / "rvm"
    if (rvm / ".local" / "venv" / "bin" / "python").exists() and (rvm / "runtime.py").exists():
        return rvm
    return None


def op_doctor(_args):
    problems = []
    for name, binary in (("ffmpeg", FFMPEG), ("ffprobe", FFPROBE)):
        if not (Path(binary).is_file() if os.sep in binary else shutil.which(binary)):
            problems.append(f"{name} was not found (Selects' bundled {name} or one on PATH)")
    rvm = rvm_launcher()
    if not rvm:
        problems.append("RVM runtime is not set up")
    return {"ready": not problems, "problems": problems, "rvm": str(rvm) if rvm else None, "ffmpeg": FFMPEG,
            "python": sys.version.split()[0]}


def mattes(video, folder):
    rvm = rvm_launcher()
    if not rvm:
        raise RuntimeError("RVM runtime is not set up. See INSTALL.md.")
    out = run(["sh", str(rvm / "run.sh"), "cutout", json.dumps({
        "input": str(video), "startSeconds": 0, "durationSeconds": MATTE_FRAMES / FPS,
        "ratio": RVM_RATIO, "provider": "cpu", "outputRoot": str(folder / "rvm")})],
        stdout=subprocess.PIPE, text=True).stdout
    result = json.loads(out.strip().splitlines()[-1])
    if not result.get("result"):
        raise RuntimeError("RVM failed: " + out[-400:])
    masks = folder / "masks"
    masks.mkdir(exist_ok=True)
    run([FFMPEG, "-y", "-v", "error", "-c:v", "libvpx-vp9", "-i", result["result"], "-vf", "alphaextract",
         "-frames:v", str(MATTE_FRAMES), str(masks / "%03d.png")])
    alpha = np.stack([np.asarray(Image.open(masks / f"{k + 1:03d}.png").convert("L"), np.float32) / 255
                      for k in range(MATTE_FRAMES)])
    if alpha.shape != (MATTE_FRAMES, H, W) or not .03 < alpha[0].mean() < .95:
        raise RuntimeError("No person was found in this shot.")
    return alpha


def background_plate(frame, alpha0):
    plate = np.zeros_like(frame)
    last = None
    for y in range(H):
        valid = np.flatnonzero(alpha0[y] < .04)
        if len(valid) >= 8:
            for c in range(3):
                plate[y, :, c] = np.interp(np.arange(W), valid, frame[y, valid, c])
            last = plate[y].copy()
        elif last is not None:
            plate[y] = last
        else:
            plate[y] = np.median(frame.reshape(-1, 3), axis=0)
    mask = Image.fromarray(np.uint8(alpha0 * 255))
    broad = mask.filter(ImageFilter.MaxFilter(41)).filter(ImageFilter.GaussianBlur(18))
    pl = Image.fromarray(plate)
    return np.asarray(Image.composite(pl.filter(ImageFilter.GaussianBlur(28)), pl, broad), np.float32)


# ---- Transition (approved "C" smear) -----------------------------------------------
def smooth(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


def interp_frame(frames, pos):
    lo = min(int(pos), len(frames) - 2)
    t = min(pos - lo, 1)
    return frames[lo].astype(np.float32) * (1 - t) + frames[lo + 1].astype(np.float32) * t


def blur_x(a, radius):
    radius = round(radius)
    if radius <= 0:
        return a
    pad = [(0, 0), (radius, radius)] + ([(0, 0)] if a.ndim == 3 else [])
    b = np.pad(a, pad, mode="edge")
    summed = np.pad(np.cumsum(b, axis=1, dtype=np.float32), [(0, 0), (1, 0)] + ([(0, 0)] if a.ndim == 3 else []))
    return (summed[:, 2 * radius + 1:] - summed[:, :-2 * radius - 1]) / (2 * radius + 1)


def horizontal_gaussian(a, sigma):
    if sigma <= .1:
        return a
    radius = round(3 * sigma)
    x = np.arange(-radius, radius + 1, dtype=np.float32)
    weights = np.exp(-.5 * (x / sigma) ** 2)
    weights /= weights.sum()
    padded = np.pad(a, ((0, 0), (radius, radius), (0, 0)), mode="edge")
    result = np.zeros_like(a, dtype=np.float32)
    for k, weight in enumerate(weights):
        result += weight * padded[:, k:k + W]
    return result


def shift_x(a, dx):
    sx = np.clip(X - dx, 0, W - 1)
    x0 = np.floor(sx).astype(np.int32)
    x1 = np.minimum(x0 + 1, W - 1)
    frac = sx - x0
    if a.ndim == 3:
        frac = frac[..., None]
    return a[np.arange(H)[:, None], x0] * (1 - frac) + a[np.arange(H)[:, None], x1] * frac


def triangle(phase):
    return (2 / np.pi) * np.arcsin(np.sin(phase))


def soften_premult(premult, alpha, radius):
    if radius <= .02:
        return premult, alpha
    p = np.asarray(Image.fromarray(np.uint8(np.clip(premult, 0, 255))).filter(ImageFilter.GaussianBlur(radius)), np.float32)
    a = np.asarray(Image.fromarray(np.uint8(np.clip(alpha * 255, 0, 255))).filter(ImageFilter.GaussianBlur(radius)), np.float32) / 255
    return p, a


def max_filter(a, size):
    """Same result as PIL ImageFilter.MaxFilter(size) (edge pixels repeat), as two 1-D passes."""
    r = size // 2
    from numpy.lib.stride_tricks import sliding_window_view
    a = sliding_window_view(np.pad(a, ((0, 0), (r, r)), mode="edge"), size, axis=1).max(axis=-1)
    return sliding_window_view(np.pad(a, ((r, r), (0, 0)), mode="edge"), size, axis=0).max(axis=-1)


def transition_frames(frames, masks, plate):
    result = []
    for i in range(POST):
        pos = positions[i]
        clean = interp_frame(frames, pos)
        alpha = interp_frame(masks, pos)
        wave = float(np.interp(i, [0, 2, 4, 6, 8, 10], [1, .95, .81, .48, .16, 0]))
        trail = float(np.interp(i, [0, 2, 4, 6, 8, 10, 12, 16, 20, 24], [1, .96, .87, .73, .57, .45, .32, .17, .05, 0]))
        direct = float(np.interp(i, [0, 2, 4, 6, 8, 10, 12, 16, 20, 24], [.02, .07, .16, .29, .42, .53, .66, .84, .95, 1]))
        base_p = clean * alpha[..., None]
        weighted_p = direct * base_p
        weighted_a = direct * alpha
        alpha_union = direct * alpha
        for offset, amp, wavelength, p0, radius, weight in [
            (-42, 24, 8.7, .1, 17, .28), (-12, 23, 11.5, 1.2, 11, .30),
            (18, 28, 9.7, 2.4, 14, .25), (49, 20, 15.0, 3.4, 18, .17),
        ]:
            shifted = (offset * trail + amp * wave * triangle(Y / wavelength + .32 * i + p0 + .25 * rough)
                       + 5 * wave * rough)
            layer_p = blur_x(shift_x(base_p, shifted), radius * trail)
            layer_a = blur_x(shift_x(alpha, shifted), radius * trail)
            w = (1 - direct) * weight
            weighted_p += w * layer_p
            weighted_a += w * layer_a
            alpha_union = np.maximum(alpha_union, layer_a)
        color = weighted_p / np.maximum(weighted_a[..., None], .002)
        alpha_out = np.maximum(weighted_a, .88 * alpha_union)
        premult = color * alpha_out[..., None]
        radius = float(np.interp(i, [0, 4, 6, 8, 10, 12, 16, 20, 24], [1.35, 1.05, 1.2, 1.5, 1.5, 1.1, .55, .4, 0]))
        premult, alpha_out = soften_premult(premult, alpha_out, radius)
        composited = premult + (1 - alpha_out[..., None]) * plate
        finish = smooth((i - 19) / 5)
        composited = (1 - finish) * composited + finish * clean
        sigma = float(np.interp(i, [0, 8, 10, 12, 16, 20, 24], [16, 16, 12, 8, 4, 1.5, 0]))
        if sigma > .1:
            mask = max_filter(np.uint8(np.clip(alpha_out * 255, 0, 255)), 81)
            mask = Image.fromarray(mask).filter(ImageFilter.GaussianBlur(12))
            strength = np.asarray(mask, np.float32)[..., None] / 255
            composited = (1 - strength) * composited + strength * horizontal_gaussian(composited, sigma)
        result.append(np.uint8(np.clip(composited, 0, 255)))
    return np.stack(result)


def op_unit(args):
    root, plan = load_plan(args["runId"])
    key = args["key"]
    unit = plan["units"][key]
    folder = root / key
    done = folder / "post-held.npy"
    if done.exists():
        return {"key": key, "cached": True}
    folder.mkdir(exist_ok=True)
    # The same clip window renders the same shot: reuse it from any earlier run.
    stat = Path(unit["path"]).stat()
    cache = DATA / "cache" / hashlib.sha1(
        f"{unit['path']}|{stat.st_size}|{stat.st_mtime_ns}|{unit['start']:.4f}|v3".encode()).hexdigest()[:16]
    if (cache / "post-held.npy").exists() and (cache / "source.mp4").exists():
        for name in ("source.mp4", "post-held.npy"):
            share(cache / name, folder / name)
        return {"key": key, "cached": True}
    source = folder / "source.mp4"
    vf = crop_filter(unit["width"], unit["height"]) + f",scale={W}:{H},minterpolate=fps={FPS}:mi_mode=mci"
    run([FFMPEG, "-y", "-v", "error", "-ss", str(unit["start"]), "-i", unit["path"], "-vf", vf,
         "-frames:v", str(SRC_FRAMES), "-an", "-c:v", "libx264", "-crf", "15", "-pix_fmt", "yuv420p", "-write_tmcd", "0", str(source)])
    frames = decode(source, SRC_FRAMES)
    alpha = mattes(source, folder)
    plate = background_plate(frames[0], alpha[0])
    post = transition_frames(frames[:MATTE_FRAMES], alpha, plate)
    np.save(folder / "post-held.partial.npy", post)
    os.replace(folder / "post-held.partial.npy", done)
    cache.mkdir(parents=True, exist_ok=True)
    for name in ("source.mp4", "post-held.npy"):
        share(folder / name, cache / name)
    return {"key": key, "cached": False}


def share(src, dst):
    """Hard-link (no extra disk space), falling back to a copy."""
    tmp = dst.with_name(dst.name + ".tmp")
    tmp.unlink(missing_ok=True)
    try:
        os.link(src, tmp)
    except OSError:
        shutil.copyfile(src, tmp)
    os.replace(tmp, dst)


# ---- Assembly ----------------------------------------------------------------------
def scale_center(a, scale):
    w, h = round(W * scale), round(H * scale)
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).resize((w, h), Image.Resampling.BICUBIC)
    left, top = (w - W) // 2, (h - H) // 2
    return np.asarray(im.crop((left, top, left + W, top + H)), np.float32)


def settled_pos(i):
    k = i - 20
    ramp = np.interp(np.arange(1, k + 1), [1, 4], [.9, 1.0])
    return positions[20] + float(ramp.sum())


def punch_scale(offset):
    if 0 <= offset <= 5:
        return 1.11
    if 5 < offset <= 23:
        return 1 + .11 * (1 - smooth((offset - 5) / 18))
    return 1.0


def envelope(offset):
    return 0. if offset < 0 else float(np.interp(offset, [0, 2, 4, 8, 12, 16, 20, 24], [1, 1, .95, .72, .47, .24, .07, 0]))


def warm_envelope(offset):
    return 0. if offset < 0 else float(np.interp(offset, [0, 2, 4, 8, 12], [1, 1, .55, .10, 0]))


def flash(frame, amount, warm_amount):
    rgb = frame.astype(np.float32) / 255
    light = (.2126 * rgb[:, :, 0] + .7152 * rgb[:, :, 1] + .0722 * rgb[:, :, 2])[..., None]
    rgb = light + (rgb - light) * (1 + .38 * amount)
    rgb *= 2 ** (.46 * amount)
    rgb *= np.array([1 + .055 * warm_amount, 1 + .018 * warm_amount, 1 - .070 * warm_amount], np.float32)
    rgb = np.clip(rgb, 0, 1)
    glow = np.asarray(Image.fromarray(np.uint8(rgb * 255)).filter(ImageFilter.GaussianBlur(11)), np.float32) / 255
    highlights = np.clip((glow - .58) * 2, 0, 1)
    rgb = 1 - (1 - rgb) * (1 - .10 * amount * highlights)
    return np.uint8(np.clip(rgb * 255, 0, 255))


def draft_frame(master_frame):
    """Draft (29.97 fps) frame that starts at a 60 fps master frame."""
    return int(np.floor(master_frame / FPS * DRAFT_FPS + .5))


def segments():
    """Draft-rate pieces: strobe, 15 shots, glow. Black before the strobe is a Draft gap."""
    marks = [STROBE_START, *BOUNDARIES, BLACK + BEATS[-1], TOTAL]
    names = ["strobe"] + [f"shot{n + 1:02d}" for n in range(15)] + ["glow"]
    return [{"name": n, "start": draft_frame(a), "end": draft_frame(b)} for n, a, b in zip(names, marks, marks[1:])]


class Encoder:
    def __init__(self, path, fps):
        self.path = path
        self.count = 0
        self.proc = subprocess.Popen([FFMPEG, "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                                      "-s", f"{W}x{H}", "-r", str(fps), "-i", "-", "-an", "-c:v", "libx264",
                                      "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p",
                                      "-movflags", "+faststart", str(path)], stdin=subprocess.PIPE)

    def write(self, frame):
        self.proc.stdin.write(frame.tobytes())
        self.count += 1

    def close(self):
        self.proc.stdin.close()
        if self.proc.wait():
            raise RuntimeError(f"Encoding failed: {self.path.name}")


def op_assemble(args):
    root, plan = load_plan(args["runId"])
    out = root / "render"
    out.mkdir(exist_ok=True)
    segs = segments()
    # Which master frame each Draft frame shows (nearest earlier-or-equal 60 fps frame).
    total_draft = segs[-1]["end"]
    wanted = {}
    for n in range(segs[0]["start"], total_draft):
        wanted.setdefault(int(np.floor(n / DRAFT_FPS * FPS + 1e-6)), []).append(n)
    encoders = {s["name"]: Encoder(out / f"{s['name']}.mp4", f"{30000}/{1001}") for s in segs}
    seg_of = lambda n: next(s["name"] for s in segs if s["start"] <= n < s["end"])
    master = Encoder(out / "master-60fps.mp4", FPS) if args.get("master", True) else None
    count, boundary_idx = 0, -1

    def emit(frame):
        nonlocal count, boundary_idx
        while boundary_idx + 1 < len(BOUNDARIES) and count >= BOUNDARIES[boundary_idx + 1]:
            boundary_idx += 1
        offset = count - BOUNDARIES[boundary_idx] if boundary_idx >= 0 else -1
        scale = punch_scale(offset)
        if scale > 1.0005:
            frame = scale_center(frame, scale)
        amount = envelope(offset)
        if amount > 0:
            frame = flash(frame, amount, warm_envelope(offset))
        frame = np.uint8(np.clip(frame, 0, 255))
        if master:
            master.write(frame)
        for n in wanted.get(count, []):
            encoders[seg_of(n)].write(frame)
        count += 1

    black = np.zeros((H, W, 3), np.uint8)
    try:
        for f in range(BLACK):
            k = f - STROBE_START
            emit(black if k < 0 else np.full((H, W, 3), STROBE[k], np.uint8))
        for slot, (key, length) in enumerate(zip(plan["slots"], LENGTHS)):
            folder = root / key
            frames = decode(folder / "source.mp4", SRC_FRAMES)
            post = np.load(folder / "post-held.npy", mmap_mode="r")
            for i in range(POST):
                emit(np.asarray(post[i]))
            for i in range(POST, length):
                emit(interp_frame(frames, settled_pos(i)))
            log(f"shot {slot + 1}/15")
        r = np.sqrt(((X - (W - 1) / 2) / (.337 * W)) ** 2 + ((Y - (H - 1) / 2) / (.336 * H)) ** 2)
        glow = np.interp(r, [0, .5, .8, 1, 1.2, 1.5, 2], [1, .91, .69, .5, .32, .09, 0])[..., None]
        for k in range(TAIL):
            level = GLOW[k] if k < len(GLOW) else 0
            emit(np.uint8(np.clip(glow * level, 0, 255)).repeat(3, axis=2) if level else black)
    finally:
        for e in encoders.values():
            e.close()
        if master:
            master.close()
    for s in segs:
        got = encoders[s["name"]].count
        if got != s["end"] - s["start"]:
            raise RuntimeError(f"{s['name']}: {got} frames, expected {s['end'] - s['start']}")
    assets = HERE / "assets"
    # Each sound covers [start, end) in Draft frames; the music runs to the end of the picture.
    audio = [
        {"name": "music-bed.wav", "path": str(assets / "music-bed.wav"), "start": 0, "end": total_draft},
        {"name": "shutter.wav", "path": str(assets / "shutter.wav"), "start": draft_frame(STROBE_START), "end": draft_frame(BLACK)},
        {"name": "riser.wav", "path": str(assets / "riser.wav"), "start": draft_frame(RISER_START), "end": draft_frame(BLACK)},
    ]
    manifest = {"runId": plan["runId"], "fps": DRAFT_FPS, "width": W, "height": H, "durationFrames": total_draft,
                "gapFrames": segs[0]["start"],
                "clips": [{**s, "frames": s["end"] - s["start"], "path": str(out / f"{s['name']}.mp4")} for s in segs],
                "audio": audio, "master": str(out / "master-60fps.mp4") if master else None}
    (root / "manifest.json").write_text(json.dumps(manifest, indent=2))
    return manifest



# ---- Detached unit rendering ---------------------------------------------------------
def op_spawn(args):
    """Start the unit worker in its own session so it outlives the panel's shell call."""
    root, plan = load_plan(args["runId"])
    pid_file = root / "units.pid"
    if pid_file.exists():
        try:
            os.kill(int(pid_file.read_text()), 0)
            return {"started": False, "running": True}
        except (OSError, ValueError):
            pass
    (root / "units.exit").unlink(missing_ok=True)
    log = open(root / "units.log", "ab")
    child = subprocess.Popen([sys.executable, str(Path(__file__).resolve()), "work", json.dumps({"runId": args["runId"]})],
                             cwd=str(root), stdout=log, stderr=log, stdin=subprocess.DEVNULL, start_new_session=True)
    pid_file.write_text(str(child.pid))
    return {"started": True, "pid": child.pid}


def op_work(args):
    """Render every unit of a run, three at a time; records the outcome in units.exit."""
    root, plan = load_plan(args["runId"])
    keys = sorted(plan["units"])
    errors = []
    running = []
    try:
        for key in keys:
            while True:
                running = [p for p in running if p.poll() is None]
                if len(running) < 3:
                    break
                time.sleep(1)
            running.append(subprocess.Popen([sys.executable, str(Path(__file__).resolve()), "unit-key", args["runId"], key]))
        for p in running:
            p.wait()
        errors = [k for k in keys if not (root / k / "post-held.npy").exists()]
    finally:
        (root / "units.exit").write_text(json.dumps({"failed": errors}))
    return {"failed": errors}

OPS = {"doctor": op_doctor, "plan": op_plan, "unit": op_unit, "assemble": op_assemble, "spawn": op_spawn, "work": op_work}

if __name__ == "__main__":
    try:
        op = sys.argv[1]
        if op == "unit-key":   # unit-key RUN_ID KEY: plain words, safe to pass through xargs
            op, args = "unit", {"runId": sys.argv[2], "key": sys.argv[3]}
        else:
            args = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
        print(json.dumps(OPS[op](args)))
    except Exception as error:  # one readable line for the panel
        print(json.dumps({"error": str(error)}))
        sys.exit(1)
