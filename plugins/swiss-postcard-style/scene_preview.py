#!/usr/bin/env python3
"""Generate a small set of JPEG previews sampled evenly across a selected
video range, for the panel's drag range picker. A real playable <video> is
not usable inside the panel's own iframe (its CSP does not admit the app's
media scheme), and an animated GIF wide/long enough to read comfortably
blew well past the 48KB sdk.runShell output cap in testing. Several evenly
spaced still frames is what actually fits and still shows the motion arc.

Args: PATH START_SECONDS END_SECONDS [FRAME_COUNT]
Prints one JSON object {"frames": [base64Jpeg, ...]} (FRAME_COUNT items,
default 4, evenly spaced from start to end inclusive). A frame that fails to
extract becomes "" so one bad timestamp does not fail the whole set.
"""
import sys, subprocess, base64, json, os, tempfile

def grab(path, t, dst):
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", str(max(0.0, t)), "-i", path,
           "-frames:v", "1", "-vf", "scale=176:-1,format=yuv420p", "-q:v", "12", "-f", "mjpeg", dst]
    subprocess.run(cmd, check=True, timeout=20)

def main():
    path = sys.argv[1]
    start = float(sys.argv[2])
    end = float(sys.argv[3])
    count = int(sys.argv[4]) if len(sys.argv) > 4 else 4
    count = max(2, count)
    span = max(0.05, end - start)
    frames = []
    for i in range(count):
        t = start + span * i / (count - 1) if count > 1 else start
        if i == count - 1:
            t = max(start, t - 0.05)
        fd, dst = tempfile.mkstemp(suffix=".jpg")
        os.close(fd)
        try:
            grab(path, t, dst)
            with open(dst, "rb") as f:
                frames.append(base64.b64encode(f.read()).decode("ascii"))
        except Exception:
            frames.append("")
        finally:
            if os.path.exists(dst):
                os.remove(dst)
    sys.stdout.write(json.dumps({"frames": frames}, separators=(",", ":")))

if __name__ == "__main__":
    main()
