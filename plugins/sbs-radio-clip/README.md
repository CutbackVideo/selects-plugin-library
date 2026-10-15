# SBS Radio TikTok Clips

A standalone copy of the Chosun Ilbo TikTok Clips app with four SBS Radio
templates: **Kim Tae-hyun's Political Show**, **Ko Hyun-jun's News Briefing**,
**Choi Sun-ho's News Direct**, and **Money Lab**.
The copied templates retain their logos, framing, backgrounds, headline and
caption styles, editing settings, and passage-selection instructions.

## Use

Open **SBS Radio TikTok Clips** from Apps with a Project open.

1. Paste a YouTube video link or select a video already in the Project.
2. Choose a program, or leave automatic detection enabled. Choose a clip count
   or keep the recommendation, and optionally add editing instructions.
3. Select **Make clips**. The app analyzes the source when needed, asks the AI
   to select passages and headlines, then saves editable vertical Drafts.
4. Open a result to adjust the footage, headlines, logos, and captions. Export
   through Selects' **Handoff → Export** flow.

The **Templates** tab supports previewing, editing, resetting, and duplicating
all four templates. The TikTok demo overlay controls are retained. Saved progress
supports resuming unfinished work. Analysis and AI actions may use credits.

The Political Show template retains its single-speaker crop. Review two-person
shots, screens, and document footage manually; the crop does not track speakers.

## Independent data

Templates, jobs, downloads, and downloader binaries live under
`~/.selects/plugin-data/sbs-radio-clip/`. This app does not share settings or
unfinished jobs with `chosun-clips` or the separate `sbs-radio-clips` prototype.
The original installed apps remain unchanged.

The panel is self-contained, including all four templates' logos and the demo
overlay. No source Project IDs or source media are bundled.

## News Direct and Money Lab

Imported from `sbs-radio` (`0adeb22`, `plugins/sbs-clips`). Their original logos,
backgrounds, prompts, and editable layout controls are included. TikTok is the
default layout; these two templates also offer the original YouTube Shorts
layout. All four template previews show the design without TikTok safety-zone
shading or guide boxes.

Money Lab retains its gradient headline, presenter label, editable episode date,
and highlighted caption keywords. The date is read from an episode title such
as `261014(Wed)` using the source's Korean weekday format; when absent, it uses
the current local date. You can edit the date in the finished Draft.

Speaker framing in these two templates uses `selects-ai-runtime` face detection
and transcript speaker turns. When face detection is unavailable or fails, the
app shows a warning and continues with the fixed crop. Review the result before
exporting. This does not change the original Political Show or News Briefing
framing behavior.

All four templates start without the TikTok demo overlay. Use the separate
overlay controls to add or remove it on an open Draft.

## Editor structure

The panel stays in one file for Selects installation. `TemplateEditor` selects
renderer capabilities, `useTemplateDraft` owns the shared save/copy/reset
lifecycle, and the appearance, captions, and AI sections render shared controls.
Template-specific controls are selected in `templateEditorProfile`, including
for custom copies; they are not tied to builtin template IDs.

For templates with platform layouts, design edits go to `variants.tiktok` when
TikTok is selected. Names, detection, editing rules, and AI instructions stay
on the base template. The existing template schema and clip renderers are
unchanged.

Run the generation and editor regression checks with an existing authoring
installation containing React, React DOM, jsdom, TypeScript, and esbuild:

```sh
SBS_PANEL_TEST_MODULES=/path/to/node_modules node --test tests/sbs_radio_templates.test.cjs
```
