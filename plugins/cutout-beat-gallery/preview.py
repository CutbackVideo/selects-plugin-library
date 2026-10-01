#!/usr/bin/env python3
"""Small data-URI thumbnails for the panel's photo review step."""
import argparse
import base64
import io
import json
from pathlib import Path

from PIL import Image, ImageOps


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--photo", action="append", default=[])
    args = parser.parse_args()
    rows = []
    for raw in args.photo:
        path = Path(raw)
        try:
            with Image.open(path) as source:
                image = ImageOps.exif_transpose(source).convert("RGB")
                image = ImageOps.fit(image, (64, 96), method=Image.Resampling.LANCZOS)
                buffer = io.BytesIO()
                image.save(buffer, format="JPEG", quality=25, optimize=True)
                rows.append({"path": raw, "jpeg": base64.b64encode(buffer.getvalue()).decode("ascii")})
        except Exception:
            rows.append({"path": raw, "jpeg": None})
    print(json.dumps(rows, separators=(",", ":")))


if __name__ == "__main__":
    main()
