# Install Huick Inside Card News

1. Copy this package's `panel.tsx` unchanged to
   `SELECTS_USER_PANELS_ROOT/huick-cardnews/panel.tsx`, using the
   environment-provided panels root. Create that directory if needed. There is
   no separate registration step.
2. The package has no other runtime files and no `SKILL.md`, so it is not
   listed as a Skill.
3. Open **Huick Inside Card News** in the Plugin list with a Project open.

Newsletter pages and article photos are downloaded with the app's own
downloader, or with `curl` from the app's shell when that is unavailable.
Templates, saved work, downloaded photos and exported card images are kept in
`~/.selects/plugin-data/huick-cardnews/`.

## Uninstall

Delete the `huick-cardnews` folder from the panels root, and optionally
`~/.selects/plugin-data/huick-cardnews/`.
