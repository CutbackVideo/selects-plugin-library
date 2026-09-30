#!/usr/bin/env python3
"""Make short portrait source clips for the Selects gallery template."""

import base64
import hashlib
import json
import os
import shutil
import subprocess
import sys
import uuid
from pathlib import Path


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Expected one encoded clip manifest")
    root = os.environ.get("SELECTS_USER_SKILLS_ROOT")
    if not root:
        raise SystemExit("SELECTS_USER_SKILLS_ROOT is unavailable")
    encoded = sys.argv[1]
    manifest = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
    clips = manifest["clips"]
    if len(clips) != 15:
        raise SystemExit("The gallery template needs exactly 15 clips")

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        ffmpeg = next(
            (path for path in ("/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg") if Path(path).is_file()),
            None,
        )
    if not ffmpeg:
        raise SystemExit("ffmpeg is not installed or could not be found")

    output_dir = Path.home() / ".selects" / "plugin-data" / "gongju-gallery" / uuid.uuid4().hex
    output_dir.mkdir(parents=True, exist_ok=False)
    audio_path = Path(root).resolve() / "gongju-gallery" / "assets" / "gallery-bgm-gallery-montage-12s-v2.wav"
    if not audio_path.is_file():
        raise SystemExit("The fixed gallery soundtrack is missing from the plugin")
    music_hash = hashlib.sha256(audio_path.read_bytes()).digest()
    existing_audio_id = None
    for candidate in manifest.get("audioCandidates", []):
        path = Path(candidate.get("path") or "")
        if path.is_file() and hashlib.sha256(path.read_bytes()).digest() == music_hash:
            existing_audio_id = candidate.get("resourceId")
            break
    paths = []
    for index, clip in enumerate(clips, start=1):
        source = Path(clip["path"])
        frames = int(clip["frames"])
        start = float(clip["startSeconds"])
        if not source.is_file() or frames < 1 or start < 0:
            raise SystemExit(f"Invalid input clip {index}")
        output = output_dir / f"gallery-{index:02d}.mp4"
        command = [
            ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
            "-ss", f"{start:.6f}", "-i", str(source),
            "-vf", "scale=1080:1440:force_original_aspect_ratio=increase,"
            "crop=1080:1440,setsar=1,fps=30000/1001",
            "-frames:v", str(frames), "-an", "-c:v", "libx264",
            "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", str(output),
        ]
        subprocess.run(command, check=True, stdout=subprocess.DEVNULL)
        paths.append(str(output))

    print(json.dumps({"paths": paths, "audioPath": str(audio_path), "existingAudioId": existing_audio_id, "outputDir": str(output_dir)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
