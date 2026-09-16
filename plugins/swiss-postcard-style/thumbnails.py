#!/usr/bin/env python3
"""Generate small JPEG thumbnails for panel media pickers.

Args: repeated triples RESOURCE_ID PATH KIND(video|image)
Prints one JSON object line: {resourceId: base64Jpeg | ""} to stdout.
Failures for individual items become "" so one bad file does not fail the batch.
"""
import sys, subprocess, base64, json, os, tempfile

def make_thumb(path, kind, dst):
    if kind == "video":
        cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", "0.2", "-i", path,
               "-frames:v", "1", "-vf", "scale=180:-1,format=yuv420p", "-q:v", "5", "-f", "mjpeg", dst]
    else:
        cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", path,
               "-vf", "scale=180:-1", "-q:v", "5", "-f", "mjpeg", dst]
    subprocess.run(cmd, check=True, timeout=20)

def main():
    args = sys.argv[1:]
    out = {}
    for i in range(0, len(args) - 2, 3):
        resource_id, path, kind = args[i], args[i + 1], args[i + 2]
        fd, dst = tempfile.mkstemp(suffix=".jpg")
        os.close(fd)
        try:
            make_thumb(path, kind, dst)
            with open(dst, "rb") as f:
                out[resource_id] = base64.b64encode(f.read()).decode("ascii")
        except Exception:
            out[resource_id] = ""
        finally:
            if os.path.exists(dst):
                os.remove(dst)
    sys.stdout.write(json.dumps(out, separators=(",", ":")))

if __name__ == "__main__":
    main()
