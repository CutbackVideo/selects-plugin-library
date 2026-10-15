# Install Clip Studio

Copy `panel.tsx` unchanged to
`SELECTS_USER_PANELS_ROOT/clip-studio/panel.tsx`.
Other files follow the standard skill-root installation layout. There is
no separate registration step and no SKILL.md.

The panel is self-contained: its code, templates and assets are all in
`panel.tsx`. There is no build step or shared runtime dependency.

The YouTube downloader (yt-dlp) is fetched on first use. ffmpeg from the
system, Homebrew or Selects is used when available for full-quality downloads.
Runtime data stays in `~/.selects/plugin-data/clip-studio/` across updates.

To uninstall, remove this app's panel folder. Optionally remove its runtime
data directory to discard saved templates, downloads and unfinished work.
