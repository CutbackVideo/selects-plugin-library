# Install SBS Radio TikTok Clips

Use the library's standard installation layout:

- `panel.tsx` goes to `SELECTS_USER_PANELS_ROOT/sbs-radio-clip/panel.tsx`.
- Other package files go under `SELECTS_USER_SKILLS_ROOT/sbs-radio-clip/`.

Open **SBS Radio TikTok Clips** from Apps with a Project open. The panel bundles
all four SBS program templates and their image assets; no separate template import
or Chosun plugin installation is required.

The YouTube downloader (yt-dlp) is fetched on first use and updated if a download
fails. Downloads use available ffmpeg support. Project videos can be selected
without downloading from YouTube. The panel retains the source app's macOS and
Windows code paths; this package has been checked locally on macOS only.

Runtime data is stored under `~/.selects/plugin-data/sbs-radio-clip/`, separate
from installed files. Updating the package preserves it.

Install the `selects-ai-runtime` dependency from this library for News Direct
and Money Lab speaker framing. Without an available runtime, generation uses
the template's fixed crop and reports a warning.
