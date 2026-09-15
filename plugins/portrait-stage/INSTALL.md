# Install Portrait Stage

Experimental: macOS arm64, Python 3.9, FFmpeg/FFprobe with VP9 alpha support, and a compatible Selects development build. Released-version compatibility and final export are unverified.

## Setup

1. Place this package in `portrait-stage` beneath the Selects-provided `SELECTS_USER_SKILLS_ROOT`. Preserve an existing installation and its `.local` settings when updating.
2. Check Python and FFmpeg/FFprobe. Keep dependencies local to this plugin; do not replace system runtimes.
3. Run the following for a fresh installation. Reuse an existing healthy environment on later runs.

```sh
ROOT="$SELECTS_USER_SKILLS_ROOT/portrait-stage"
mkdir -p "$ROOT/.local/models"
python3 -m venv "$ROOT/.local/venv"
"$ROOT/.local/venv/bin/python" -m pip install -r "$ROOT/requirements.txt"
curl -fL 'https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/rvm_mobilenetv3_fp32.onnx' -o "$ROOT/.local/models/rvm_mobilenetv3_fp32.onnx"
printf '%s  %s\n' '88d4531297118f595bf2fd60f6f566aec2e559393802d1f436c380f0cbbd2828' "$ROOT/.local/models/rvm_mobilenetv3_fp32.onnx" | shasum -a 256 -c -
```

Stop if the checksum fails. If FFmpeg/FFprobe are not on PATH, set `PORTRAIT_STAGE_FFMPEG` and `PORTRAIT_STAGE_FFPROBE` in the local launcher to their installed paths.

4. Save this launcher as `.local/run`, make it executable, and run it with `doctor`:

```sh
#!/bin/sh
set -eu
LOCAL=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec "$LOCAL/venv/bin/python" "$LOCAL/../scripts/portrait_stage.py" "$@"
```

5. Read `panel.tsx` and register it with `save_panel({name: "portrait-stage", source})`. Follow [SKILL.md](SKILL.md) to create and verify a Draft.

## Limits

- Constant frame rate and square pixels only. Draft FPS must match the source.
- 540×960 canvas; person playback uses 360×640 alpha video. Longer or complex clips may exceed the 256 KiB assembly limit.
- Title and background remain separate editable clips. Quick editing depends on the host build; use the Inspector if unavailable.
- Keep working media until no Draft references it. Runtime, model, job state and optional `defaults.json` stay under `.local/` and must not be published.

See [THIRD_PARTY.md](THIRD_PARTY.md) for external dependency terms.
