# Install notes

The panel runs `crop.py` and `ffmpeg` to cut portrait intermediates. Nothing needs to be
installed by hand:

- Python: on first use `runtime.sh` downloads a pinned CPython 3.11.13 (through uv, checked by
  SHA-256) into `~/.selects/plugin-data/_runtime/`, shared with other plugins. The first run
  needs an internet connection; later runs reuse it. A system `python3` is not used.
- `ffmpeg` with `libx264`: the copy that ships with Selects is on the panel shell's `PATH`. The
  script also looks in `/opt/homebrew/bin/ffmpeg` and `/usr/local/bin/ffmpeg`.

No models or credentials are needed. Intermediates are written under
`~/.selects/plugin-data/gongju-gallery/` and are never placed in the install folders.
