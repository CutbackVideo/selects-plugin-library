# Speaker face tracking for the 9:16 reframe (YuNet through OpenCV). Per job (one source range): split
# into shots where the picture changes, link faces into tracks, keep the track seen most often, largest and
# most confidently. Figures are fractions of the source frame.
import argparse, json, os
import cv2
import numpy as np


def iou(a, b):
    ax2, ay2, bx2, by2 = a[0] + a[2], a[1] + a[3], b[0] + b[2], b[1] + b[3]
    iw = max(0.0, min(ax2, bx2) - max(a[0], b[0]))
    ih = max(0.0, min(ay2, by2) - max(a[1], b[1]))
    inter = iw * ih
    return inter / (a[2] * a[3] + b[2] * b[3] - inter + 1e-9)


def histogram(img):
    h = cv2.calcHist([cv2.cvtColor(img, cv2.COLOR_BGR2HSV)], [0, 1], None, [32, 16], [0, 180, 0, 256])
    return cv2.normalize(h, h)


def scan(job, model, rate=6.0, score=0.8, min_face=0.05, cut=0.35):
    cap = cv2.VideoCapture(job["path"])
    if not cap.isOpened():
        return {"id": job.get("id"), "error": "cannot open source"}
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    W, H = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    f0 = max(0, int(round(float(job["start"]) * fps)))
    f1 = max(f0 + 1, int(round(float(job["end"]) * fps)))
    step = max(1, int(round(fps / rate)))
    k = min(1.0, 640.0 / max(W, H))
    small = (max(1, int(round(W * k))), max(1, int(round(H * k))))
    det = cv2.FaceDetectorYN.create(model, "", small, score, 0.3, 5000)
    if f0 > 0:
        cap.set(cv2.CAP_PROP_POS_FRAMES, f0)
    samples, cuts, prev = [], [f0], None
    for f in range(f0, f1):
        if not cap.grab():
            break
        if (f - f0) % step:
            continue
        ok, img = cap.retrieve()
        if not ok:
            break
        img = cv2.resize(img, small, interpolation=cv2.INTER_AREA)
        hist = histogram(img)
        if prev is not None and cv2.compareHist(prev, hist, cv2.HISTCMP_CHISQR_ALT) > cut:
            cuts.append(f)
        prev = hist
        _, rows = det.detect(img)
        faces = []
        for r in ([] if rows is None else rows):
            x, y, w, h = r[0] / small[0], r[1] / small[1], r[2] / small[0], r[3] / small[1]
            if r[14] < score or h < min_face or not (0.5 < (w * W) / (h * H) < 1.6):
                continue
            faces.append({"b": [float(x), float(y), float(w), float(h)], "ex": float((r[4] + r[6]) / 2 / small[0]),
                          "ey": float((r[5] + r[7]) / 2 / small[1]), "s": float(r[14])})
        samples.append({"f": f, "faces": faces})
    cap.release()
    bounds = cuts + [f1]
    shots = []
    for i in range(len(cuts)):
        ss = [s for s in samples if bounds[i] <= s["f"] < bounds[i + 1]]
        shot = {"start": round(bounds[i] / fps, 4), "end": round(bounds[i + 1] / fps, 4), "face": None, "faces": 0}
        if ss:
            tracks = []
            for s in ss:
                for face in s["faces"]:
                    best = max(tracks, key=lambda t: iou(t["last"], face["b"]), default=None)
                    if best is None or iou(best["last"], face["b"]) < 0.3 or best["lastF"] == s["f"]:
                        best = {"rows": [], "last": None, "lastF": None}
                        tracks.append(best)
                    best["rows"].append(face)
                    best["last"] = face["b"]
                    best["lastF"] = s["f"]

            def weight(t):
                return len(t["rows"]) / len(ss) * float(np.median([r["b"][3] for r in t["rows"]])) * float(np.mean([r["s"] for r in t["rows"]]))

            ranked = sorted(tracks, key=weight, reverse=True)
            shot["faces"] = max(len(s["faces"]) for s in ss)
            if ranked:
                m = ranked[0]["rows"]
                med = lambda key: round(float(np.median([key(r) for r in m])), 4)
                shot["face"] = {"cx": med(lambda r: r["ex"]), "eyes": med(lambda r: r["ey"]), "h": med(lambda r: r["b"][3]),
                                "w": med(lambda r: r["b"][2]), "top": med(lambda r: r["b"][1])}
        shots.append(shot)
    merged = []
    for s in shots:
        if merged and (s["end"] - s["start"] < 0.5 or merged[-1]["end"] - merged[-1]["start"] < 0.5):
            keep = merged[-1] if (merged[-1]["face"] and (merged[-1]["end"] - merged[-1]["start"]) >= (s["end"] - s["start"])) or not s["face"] else s
            merged[-1] = dict(keep, start=merged[-1]["start"], end=s["end"])
        else:
            merged.append(s)
    return {"id": job.get("id"), "width": W, "height": H, "fps": fps, "shots": merged}


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--model", required=True)
    p.add_argument("--jobs", required=True)
    p.add_argument("--out", required=True)
    a = p.parse_args()
    cv2.setNumThreads(2)
    out = [scan(j, a.model) for j in json.load(open(a.jobs))]
    tmp = a.out + ".tmp"
    with open(tmp, "w") as fh:
        json.dump({"jobs": out}, fh, separators=(",", ":"))
    os.replace(tmp, a.out)
    shots = [s for j in out for s in j.get("shots", [])]
    print(json.dumps({"ok": True, "shots": len(shots), "noFace": sum(1 for s in shots if not s["face"]), "errors": [j["error"] for j in out if j.get("error")]}))


main()
