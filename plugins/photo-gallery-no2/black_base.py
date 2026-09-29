"""Prepare a durable, full-canvas black Main clip using the shared still converter."""

import json
import hashlib
import os
from pathlib import Path
import struct
import sys
import tempfile
import zlib

from still_video import ConversionError, cache_directory, convert, digest_file


WIDTH, HEIGHT = 1080, 1920


def black_png():
    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data +
                struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

    row = b"\0" + b"\0" * (WIDTH * 3)
    return (b"\x89PNG\r\n\x1a\n" +
            chunk(b"IHDR", struct.pack(">IIBBBBB", WIDTH, HEIGHT, 8, 2, 0, 0, 0)) +
            chunk(b"IDAT", zlib.compress(row * HEIGHT, 9)) + chunk(b"IEND", b""))


def prepare(request):
    frames = request.get("durationFrames") if isinstance(request, dict) else None
    if type(frames) is not int or not 1 <= frames <= 36000:
        raise ConversionError("durationFrames must be a positive integer at most 36000")
    root = cache_directory()
    root.mkdir(parents=True, exist_ok=True)
    source = root / "black-base-1080x1920.png"
    content = black_png()
    if not source.is_file() or digest_file(source) != hashlib.sha256(content).hexdigest():
        descriptor, temp_name = tempfile.mkstemp(prefix=".black-base-", suffix=".png", dir=root)
        try:
            with os.fdopen(descriptor, "wb") as stream:
                stream.write(content)
            os.replace(temp_name, source)
        finally:
            Path(temp_name).unlink(missing_ok=True)
    result = convert({"images": [{"path": str(source)}], "durationFrames": frames})
    video = result["images"][0]
    if (video["outputWidth"], video["outputHeight"]) != (WIDTH, HEIGHT):
        raise ConversionError("Black Main output dimensions do not match the canvas")
    return {"status": "converted", "fps": 60, "durationFrames": frames,
            "outputPath": video["outputPath"], "cacheHit": video["cacheHit"]}


if __name__ == "__main__":
    try:
        raw = sys.stdin.buffer.read(4097)
        if len(raw) > 4096:
            raise ConversionError("Request is too large")
        print(json.dumps(prepare(json.loads(raw))))
    except (ConversionError, ValueError, OSError, UnicodeDecodeError) as error:
        print(json.dumps({"status": "error", "message": str(error)}))
        raise SystemExit(1) from None
