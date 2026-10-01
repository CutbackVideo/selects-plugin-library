# Install Card News Maker

1. Copy this package's `panel.tsx` unchanged to
   `SELECTS_USER_PANELS_ROOT/card-news-maker/panel.tsx`, using the
   environment-provided panels root. Create that directory if needed. There is
   no separate registration step.
2. The package has no other runtime files and no `SKILL.md`, so it is not
   listed as a Skill.
3. Open **Card News Maker** in the Plugin list with a Project open.

Article photos are downloaded with the app's own downloader, or with `curl`
from the app's shell when that is unavailable (`curl` ships with macOS and
Windows 10 and later). Templates, saved work, downloaded photos and exported
card images are kept in `~/.selects/plugin-data/card-news-maker/`.

## Uninstall

Delete the `card-news-maker` folder from the panels root, and optionally
`~/.selects/plugin-data/card-news-maker/`.
