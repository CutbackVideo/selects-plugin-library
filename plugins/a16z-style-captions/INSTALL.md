# Install a16z Style Captions

Experimental: macOS arm64 or Windows x64, and a compatible Selects development build.

1. Place this package in `a16z-style-captions` under `SELECTS_USER_SKILLS_ROOT`
   (the caption fonts are read from its `fonts` folder).
2. Copy `panel.tsx` byte-for-byte to `SELECTS_USER_PANELS_ROOT/a16z-style-captions/panel.tsx`.
3. Reload Selects and open the **a16z Style Captions** panel on a talking-head Draft.

Nothing else to install: music levels and B-roll use the ffmpeg that ships with
Selects.

Install `selects-ai-runtime` from the same library revision. Speaker framing now
uses shared `selects.ai` YuNet jobs on macOS and Windows (Selects 2.0.570 or
later); it no longer creates a Python environment or downloads a private model.
The source folder's `shared-ai-jobs.json` retains workflow identities for reuse.
Long ranges are split below the runtime's decoded source-frame limit; samples
keep one source grid and are merged before speaker tracking. Camera samples use
the first displayed video frame as zero and retain actual PTS, including VFR,
so an earlier audio/container start does not move the cuts.
Camera cuts keep the 32x16 HSV histogram / ChiSquare-alt 0.35 rule, decoded by
bundled ffmpeg; IoU face tracking, median framing, captions and audio are kept.
OpenCV and the integer HSV conversion can differ at histogram bin edges. Full Windows styled
preview/export remains unverified.

`panel.tsx` is built from `src/` with `node build.cjs path/to/esbuild`.
