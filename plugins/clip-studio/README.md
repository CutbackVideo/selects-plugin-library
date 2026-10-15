# Clip Studio

Turn long videos into editable vertical clips with your own visual templates and editorial rules.

## Make clips

Open **Clip Studio** with a Project open.

1. Paste a YouTube link, or choose a project video at least two minutes long.
2. Select a template or use **Detect automatically**. Keep the recommended
   clip count or set it, and optionally add instructions.
3. Press **Make clips**. Confirm analysis credits in Selects if requested.
   The app chooses passages, writes two-line headlines and creates one Draft
   per clip. Headlines and captions remain editable Motion Graphics.
4. Open a result to refine it, then export through Selects.

Progress is saved after each step. **Cancel** stops the current run;
**Resume** under **Unfinished work** continues it.

## Templates

The **Templates** tab has Look, Captions and AI controls.
Adjust the video window, crop, headline, background,
logo image, captions, filler/pause trimming and editorial instructions.
Duplicate a template to create your own. Built-in changes are local and
can be reset. The layout uses a 1080x1920 canvas and a 1920x1080 source
coordinate system; this app preserves the existing landscape-source workflow.

Automatic detection uses program keywords and host descriptions, then AI.
If none match, it uses the app's configured default template, if any;
otherwise choose a template manually.

## Data and updates

Templates, unfinished work, downloads and the downloader live under
`~/.selects/plugin-data/clip-studio/`. Updates preserve this directory.
Each customer app has its own ID and separate data. Keep template IDs stable
across updates so saved overrides and unfinished work can still find them.

## Copy for a customer

This is a standalone base app. Copy this entire folder to
`plugins/<customer-app-id>/`; no build step or shared plugin is required.

1. Replace `clip-studio` with the new folder ID in these files, including
   `APP_CONFIG.id` in `panel.tsx` and `id` in `plugin.json`. A unique ID keeps
   each app's installation, saved templates and jobs separate.
2. Update the display name in the panel's `@name` headers, `APP_CONFIG.name`,
   the manifest's `name` and `localized` entries, and these documents.
3. Edit `BUILTIN_TEMPLATES` near the top of `panel.tsx`. Copy an entry for each
   program and give it a unique ID. `layout`, `background`, `headline`, `logo`
   and `captions` define its look; `detect` identifies the program; `editing`
   and `prompt` control trimming and the AI's editorial choices.
4. Set `APP_CONFIG.defaultTemplate` to one of those IDs, or `null` to require
   manual selection when automatic detection finds no match. Keep at least
   one built-in template so the editor has a starting point.

For logos or backgrounds, set `mode` to `image` and `image` to a PNG, JPEG or
WebP data URL. Use `logo.mode: "none"` to omit a logo. The app's template
editor also supports picking images and changing settings locally; those
local edits do not change the package's built-in templates.

Edit `panel.tsx` directly for behavior changes. Each customer copy is
independent, so a fix in this base app must be copied into customer apps
when needed. Update `plugin.json`'s version before distributing an update.
