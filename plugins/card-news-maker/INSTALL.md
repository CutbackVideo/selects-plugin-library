# Install Card News Maker

1. Copy this package's `panel.tsx` unchanged to
   `SELECTS_USER_PANELS_ROOT/card-news-maker/panel.tsx`, using the
   environment-provided panels root. Create that directory if needed. There is
   no separate registration step.
2. The package has no other runtime files and no `SKILL.md`, so it is not
   listed as a Skill.
3. Open **Card News Maker** in the Plugin list with a Project open.

Article photos are downloaded with the app's downloader, or with the platform's `curl` fallback.
Templates, common saved jobs, downloaded media and default exports are kept in
`~/.selects/plugin-data/card-news-maker/`. Earlier `photo-works/` and `layout-templates/` files are read
for compatibility and remain untouched when opened. All card sets now use the same editor and export
pipeline. Older photo sets keep their output-folder setting and default to `Pictures/Card news`.

Template UI requires Panel UI kit 6 (the shared Shortform Clips template components).

Text generation requires a connected ChatGPT or Claude subscription in Selects and Panel SDK
`aiProviders`; it does not fall back to Selects credits. A team template's named font must be installed.
PNG and JPEG output require local file access and `export.still`. Windows uses the host file workspace
and canonical reveal, with cmd.exe fallbacks; actual Windows GUI validation is still pending.

## Uninstall

Delete the `card-news-maker` folder from the panels root, and optionally
`~/.selects/plugin-data/card-news-maker/`. Exported images stay where they
were saved.

## Install the Chosun template by link

After the app and compatible host are published, open:

`cutback-selects://plugin/install?id=card-news-maker&pack=chosun-basic`

The existing catalog installer pins the app revision and delivers its template
folder through `context.templatePack`. Card News Maker reads that revision's
`template-packs/chosun-basic/template.json`, validates it through the same JSON
importer, selects the template and opens Templates. It waits for running work or
unsaved template edits. Reopening the link preserves an existing local design;
a failed download offers Retry template import. No AI generation or export runs.
Manual JSON import/export remains available.
