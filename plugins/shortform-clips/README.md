# Shortform Clips

A shared app for turning a YouTube link or a project video into editable vertical
Drafts. Customer designs, detection keywords and passage-selection instructions
are delivered separately as template packs. The app has no bundled customer templates.

## Use

1. Open **Shortform Clips** from Apps with a Project open.
2. In **Templates**, choose **+ Add templates** at the bottom of the template
   picker, paste the link you received, and click **Add**. With no templates yet,
   use the **Add templates** button.
3. Select a source, a template (or automatic detection), and the clip count in
   **Make clips**. Add optional instructions and create the clips.
4. In **My clips**, review one clip per row, with a saved preview, title and description.
   Hover or focus a preview to reveal Open; click it to open the Draft. The current
   Draft has a dimmed preview and a Viewing badge. Use **Saved results** to switch between runs in this Project; the latest
   is first, with source titles, dates and clip counts. Validation failures and new
   runs preserve previous results. You can browse history while generation runs;
   the first saved clip opens My clips with live progress and a cancel control.
   Later clips appear as they are saved; subsequent updates do not override your
   tab or history selection. Export through **Handoff > Export**.

New clip selections include transcript-based Hook, Flow and Payoff ratings (0-10).
The app computes their equal-weight average and sorts each run by that score;
the three component scores appear below the overall score. Hover or focus the
info icon beside AI score for its reason. These are content recommendations, not view
predictions or finished-video quality scores. Older or malformed assessments show
**Unrated** and sort after scored clips, without re-running AI. Thumbnails capture
one composited Draft frame at one second (or the last frame for shorter clips),
including its template and captions. New clips save this JPEG after creation;
older results capture the current Draft on their first visit. Subsequent edits
or opening a Draft do not refresh the saved image. Capture does not change the
open Draft. A failed preview leaves the editable clip and its history intact.

The Templates tab edits design, captions, editing options, program detection and
AI instructions. Controls depend on the template renderer. TikTok/Shorts layout
variants keep separate design values and share detection and AI instructions.
The layout selected in Make clips also selects which design to edit in Templates;
a small label identifies it when the pack provides both designs. Templates has no
separate layout picker. Single-layout templates keep their existing TikTok edits.
The trash icon beside the template picker opens a confirmation before removing
the selected template from both the editor and clip creation. Generated clips and
saved results are retained. Adding a pack again restores its removed templates
with their saved edits; removed custom copies stay removed.
Template overlay preview does not change the template or new Drafts. After clips
are created, **TikTok overlay preview** beside the results heading adds/removes a
single preview PNG in the currently visible Draft. It is not a template setting
or a default for new clips. Remove that clip before uploading.

Transcription can be used before visual analysis finishes. Analysis and AI passage
selection can use credits. Speaker framing uses `selects-ai-runtime`; when unavailable,
the app retries with smaller searches, then warns and uses the full picture if
framing remains unavailable. Face searches run sequentially; a job whose status
cannot be recovered prevents further face searches in that run. Each completed
clip's framing is saved so an interrupted run can resume without repeating it.

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
- `removed-templates/<encoded-id>.json`: removal records that keep templates out
  of the pickers without deleting shared assets or generated clips.
- `jobs/<job-id>.json`: generation settings, results, Draft IDs and new results'
  relative `thumbnailPath` and `thumbnailCapturedAt` fields.
- `thumbnails/<job-id>/<draft-id>.jpg`: saved composited previews. Older jobs
  resolve the same path from their existing job and Draft IDs.
- `media/`, `bin/`, `references/`: downloaded media, tools and reference data.

Editable Drafts remain in the Selects Project; these files hold app history and
preview images, not exported video.

A template identity is `<pack-id>/<template-id>`. Keep IDs stable across updates.
Removed templates disappear from the picker, but their overrides remain for a
later reinstallation. Copies retain their own settings and images.

The SBS pack's first installation copies saved templates from the old
`sbs-radio-clip` data folder. Legacy files are preserved. Because the old app saved
complete snapshots, differences from the new pack are conservatively treated as
user overrides. Reset a template to adopt all current pack defaults. Legacy jobs
remain with the old app and are not migrated.

## Authoring

See [Template packs](template-packs/README.md). Template JSON and image files
are the source of truth; do not embed customer defaults in `panel.tsx`.

The panel remains a single React file for Selects. Shared renderers implement
`series` and `separate-headlines`; new rendering behavior requires a shared app
change, not executable code in a pack.

## Verification

```sh
SBS_PANEL_TEST_MODULES=/path/to/node_modules node --test plugins/shortform-clips/tests/shortform_packs.test.cjs plugins/shortform-clips/tests/shortform_results.test.cjs plugins/shortform-clips/tests/shortform_reframe.test.mjs plugins/shortform-clips/tests/sbs_radio_templates.test.cjs plugins/shortform-clips/tests/sbs_radio_overlay.test.cjs plugins/shortform-clips/tests/sbs_radio_transcription.test.cjs
python3 tools/plugin_files.py check shortform-clips
python3 tools/check_public.py
```

The Node tests require an existing authoring environment containing esbuild,
TypeScript, React, react-dom and jsdom. These are not installed-panel dependencies.
