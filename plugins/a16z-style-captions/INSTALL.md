# Install a16z Style Captions

Experimental: macOS arm64 and a compatible Selects development build.

1. Place this package in `a16z-style-captions` under `SELECTS_USER_SKILLS_ROOT`
   (the caption fonts are read from its `fonts` folder).
2. Copy `panel.tsx` byte-for-byte to `SELECTS_USER_PANELS_ROOT/a16z-style-captions/panel.tsx`.
3. Reload Selects and open the **a16z Style Captions** panel on a talking-head Draft.

On first use the panel creates its own Python environment for face framing
(`~/.selects/python-envs/a16z-style-captions`, NumPy and OpenCV from PyPI) and
downloads the YuNet face model into `~/.selects/plugin-data/a16z-style-captions`.
Music levels and B-roll use `ffmpeg` and `ffprobe` (for example
`brew install ffmpeg`).

`panel.tsx` is built from `src/` with `node build.cjs path/to/esbuild`.
