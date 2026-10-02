# Install a16z Style Captions

Experimental: macOS arm64 or Windows x64, and a compatible Selects development build.

1. Place this package in `a16z-style-captions` under `SELECTS_USER_SKILLS_ROOT`
   (the caption fonts are read from its `fonts` folder).
2. Copy `panel.tsx` byte-for-byte to `SELECTS_USER_PANELS_ROOT/a16z-style-captions/panel.tsx`.
3. Reload Selects and open the **a16z Style Captions** panel on a talking-head Draft.

Nothing else to install: music levels and B-roll use the ffmpeg that ships with
Selects.

Speaker framing is available on macOS for now (on Windows every shot is centred).
On first use on macOS the panel creates its own Python environment for it
(`~/.selects/python-envs/a16z-style-captions`, NumPy and OpenCV from PyPI, using
the system `python3`) and downloads the YuNet face model into
`~/.selects/plugin-data/a16z-style-captions`.

`panel.tsx` is built from `src/` with `node build.cjs path/to/esbuild`.
