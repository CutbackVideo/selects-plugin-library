# Install Chosun Ilbo TikTok Clips

1. Copy this package's `panel.tsx` unchanged to
   `SELECTS_USER_PANELS_ROOT/chosun-clips/panel.tsx`, using the
   environment-provided panels root. Create that directory if needed. There is
   no separate registration step.
2. The package has no other runtime files and no `SKILL.md`, so it is not
   listed as a Skill.
3. Open **Chosun Ilbo TikTok Clips** in the Plugin list with a Project open.

The YouTube downloader (yt-dlp) is fetched automatically the first time a link
is used and is updated automatically when a download fails. ffmpeg from the
system, Homebrew or Selects is used when present for full-quality downloads.
Templates, saved work and downloads are kept in
`~/.selects/plugin-data/chosun-clips/`.

Chosun Ilbo also uses `chosun-cardnews` and `card-news-maker`, installed from the same
`chosun-ilbo` branch of this library.

## Uninstall

Delete the `chosun-clips` folder from the panels root, and optionally
`~/.selects/plugin-data/chosun-clips/`.
