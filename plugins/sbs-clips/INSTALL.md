# Install SBS Radio Clips

1. Copy this package's `panel.tsx` unchanged to
   `SELECTS_USER_PANELS_ROOT/sbs-clips/panel.tsx`, using the
   environment-provided panels root. Create that directory if needed. There is
   no separate registration step.
2. The package has no other runtime files and no `SKILL.md`, so it is not
   listed as a Skill.
3. Open **SBS Radio Clips** in the Plugin list with a Project open.

The YouTube downloader (yt-dlp) is fetched automatically the first time a link
is used and is updated automatically when a download fails. The ffmpeg bundled
with Selects (or one on PATH) is used for full-quality downloads.
Templates, saved work and downloads are kept in
`~/.selects/plugin-data/sbs-clips/` (`%USERPROFILE%\.selects\plugin-data\sbs-clips\` on Windows).

Following faces is optional and off by default (Templates tab). It needs the
`selects-ai-runtime` plugin from the same library revision, Selects 2.0.560 or
later and, on Windows, the Microsoft Visual C++ 2019-or-newer x64 runtime.
Without them clips keep the fixed crop.

## Uninstall

Delete the `sbs-clips` folder from the panels root, and optionally
`~/.selects/plugin-data/sbs-clips/`.
