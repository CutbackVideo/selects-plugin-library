# Install a16z Style Captions

Experimental: macOS arm64 and a compatible Selects development build.

1. Place this package in `a16z-style-captions` under `SELECTS_USER_SKILLS_ROOT`.
2. Copy `panel.tsx` byte-for-byte to `SELECTS_USER_PANELS_ROOT/a16z-style-captions/panel.tsx`.
3. Reload Selects and open the **a16z Style Captions** panel on an edited Draft.

Captions only need Selects. The optional B-roll workflow uses `python3`,
`ffmpeg` and `ffprobe`; YouTube sources also need `yt-dlp`
(for example `brew install ffmpeg yt-dlp`). No models, credentials or media
files are included.
