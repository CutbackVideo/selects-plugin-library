# Install Selects Clips

1. Copy this package's `panel.tsx` unchanged to
   `SELECTS_USER_PANELS_ROOT/shortform-cloner/panel.tsx`, using the
   environment-provided panels root. Create that directory if needed. There is
   no separate registration step, and nothing else needs to be installed.
2. Open **Selects Clips** in the Plugin list.

The first time a video link is used, the panel downloads yt-dlp into
`~/.selects/plugin-data/shortform-cloner/bin/` on its own. It uses the FFmpeg
that ships with Selects. Templates, saved work and downloaded videos are kept in
`~/.selects/plugin-data/shortform-cloner/`.

## Uninstall

Delete the `shortform-cloner` folder from the panels root, and optionally
`~/.selects/plugin-data/shortform-cloner/`.
