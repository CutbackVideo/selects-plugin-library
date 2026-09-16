#!/usr/bin/env python3
"""Generate a filmstrip of small JPEG thumbnails sampled across a video's
duration, for a draggable in/out point picker in the panel.

Args: PATH DURATION_SECONDS COUNT
Prints one JSON array of base64 JPEG strings (evenly spaced, inclusive of the
start, excluding the very end) to stdout. A frame that fails to extract
becomes "" so one bad timestamp does not fail the whole strip.
"""
import sys, subprocess, base64, json, os, tempfile

def grab(path, t, dst):
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", str(t), "-i", path,
           "-frames:v", "1", "-vf", "scale=120:-1,format=yuv420p", "-q:v", "6", "-f", "mjpeg", dst]
    subprocess.run(cmd, check=True, timeout=20)

def main():
    path = sys.argv[1]
    duration = float(sys.argv[2])
    count = max(2, int(sys.argv[3]))
    out = []
    for i in range(count):
        t = duration * i / count
        fd, dst = tempfile.mkstemp(suffix=".jpg")
        os.close(fd)
        try:
            grab(path, t, dst)
            with open(dst, "rb") as f:
                out.append(base64.b64encode(f.read()).decode("ascii"))
        except Exception:
            out.append("")
        finally:
            if os.path.exists(dst):
                os.remove(dst)
    sys.stdout.write(json.dumps(out, separators=(",", ":")))

if __name__ == "__main__":
    main()
