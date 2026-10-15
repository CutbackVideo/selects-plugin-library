# Shortform Clips

A shared app for turning a YouTube link or a project video into editable vertical
Drafts. Customer designs, detection keywords and passage-selection instructions
are delivered separately as template packs. The app has no bundled customer templates.

## Use

1. Open **Shortform Clips** from Apps with a Project open.
2. In **Templates > Template packs**, paste a public GitHub pack folder link and
   click **Add from link**. You can also select a downloaded `pack.json` with its
   `templates/` and `assets/` alongside it.
3. Select a source, a program (or automatic detection), and the clip count in
   **Make clips**. Add optional instructions and create the clips.
4. Review the editable Drafts. Export through **Handoff > Export**.

The Templates tab edits design, captions, editing options, program detection and
AI instructions. Controls depend on the template renderer. TikTok/Shorts layout
variants keep separate design values and share detection and AI instructions.
Template overlay preview does not change the template or new Drafts. The separate
**Add TikTok overlay clip** switch adds/removes a single preview PNG in the visible
Draft. Remove that clip before uploading.

Transcription can be used before visual analysis finishes. Analysis and AI passage
selection can use credits. Speaker framing uses `selects-ai-runtime`; when unavailable,
the app warns and uses the template's fixed crop.

## Pack updates and local edits

GitHub links resolve to one commit per installation; only declared JSON/images
are downloaded. Use a folder, `pack.json` page or raw file link. The pack must
already be published; private repositories are not supported. Downloads time out
after two minutes, and failures leave the installed pack unchanged.

Installing the same pack ID updates it. A lower pack version is rejected, as are
unsupported template APIs, missing images, invalid layouts, changed renderers for
existing template IDs, and updates incompatible with saved user changes. A pack is
validated before its installed snapshot is atomically replaced.

Local data lives under `~/.selects/plugin-data/shortform-clips/`:

- `packs/<pack-id>.json`: installed snapshot, including resolved image data. This
  avoids depending on the location of the source pack after installation.
- `overrides/<encoded-pack-and-template-id>.json`: only fields the user changed.
  Untouched fields follow new pack defaults; reset deletes the override.
- `custom-templates/<encoded-id>.json`: independent copies made in the editor.
- `jobs/`, `media/`, `bin/`, `references/`: existing run recovery and media data.

A template identity is `<pack-id>/<template-id>`. Keep IDs stable across updates.
Removed templates disappear from the picker, but their overrides remain for a
later reinstallation. Copies retain their own settings and images.

The SBS pack's first installation copies saved templates from the old
`sbs-radio-clip` data folder. Legacy files are preserved. Because the old app saved
complete snapshots, differences from the new pack are conservatively treated as
user overrides. Reset a template to adopt all current pack defaults. Legacy jobs
remain with the old app and are not migrated.

## Authoring

See [Template packs](../../template-packs/README.md). Template JSON and image files
are the source of truth; do not embed customer defaults in `panel.tsx`.

The panel remains a single React file for Selects. Shared renderers implement
`series` and `separate-headlines`; new rendering behavior requires a shared app
change, not executable code in a pack.

## Verification

```sh
SBS_PANEL_TEST_MODULES=/path/to/node_modules node --test tests/shortform_packs.test.cjs tests/sbs_radio_templates.test.cjs tests/sbs_radio_overlay.test.cjs tests/sbs_radio_transcription.test.cjs
python3 tools/plugin_files.py check shortform-clips
python3 tools/plugin_files.py check-pack sbs-radio
python3 tools/check_public.py
```

The Node tests require an existing authoring environment containing esbuild,
TypeScript, React, react-dom and jsdom. These are not installed-panel dependencies.
