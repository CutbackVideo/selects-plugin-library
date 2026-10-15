# Hankook Ilbo TikTok template pack

Two TikTok layouts for the shared Shortform Clips app. This pack contains no
YouTube-specific layout, customer app fork, demo overlay or sample video.

| Template | Layout |
| --- | --- |
| Knowledge Exchange | Original green background and logo, white/red two-line headline, black speech caption box; video window y=622..1378 |
| Issue Broadcast | Portrait video with face-following enabled, fluorescent yellow headline and second-line box, original logo over the video; full-height video window y=0..1920 |

## Install

Install the shared [Shortform Clips app](../..). In **Templates**, choose
**+ Add templates** at the end of the template picker, paste this folder's
published GitHub URL, and click **Add**. If no templates are installed yet,
use the **Add templates** button.

The pack lives at `plugins/shortform-clips/template-packs/hankook-ilbo/`.
Use a published branch or commit containing that path; a GitHub `pack.json`
page or raw file URL also works. Installing the app does not install this pack.

Select **TikTok** when making clips. Template API 1 does not restrict platform
choices per pack: these are single TikTok designs stored as the base layout, with
no alternate Shorts variant. Choosing Shorts in the common app will therefore use
the same design; it will not select a separately authored YouTube template.

The reference uses Black Han Sans for headlines and Issue Broadcast captions,
and Pretendard for Knowledge Exchange captions. Issue Broadcast headlines use
Pretendard because the current renderer forces a heavy weight, which closes up
small black text in the reference typeface. Other font names are retained. Fonts
are not bundled or installed by a template pack; if unavailable on the editing
machine, the shared renderer uses its system Korean font fallback. Install the
font separately through the normal font workflow for closer typography.

## Reference and adaptations

Source: [Hankook Ilbo demo research](https://hankookilbo-demo-research.thetomkim.chatgpt.site/),
its **Longform to shortform** section, inspected 2026-10-16.

- [Knowledge Exchange reference SVG](https://hankookilbo-demo-research.thetomkim.chatgpt.site/assets/templates/shorts-knowledge-template-v9.svg)
- [Issue Broadcast reference SVG](https://hankookilbo-demo-research.thetomkim.chatgpt.site/assets/templates/shorts-issue-template-v9.svg)
- [Knowledge Exchange TikTok example](https://www.tiktok.com/@hankookilbo/video/7686001087052090632)
- [Issue Broadcast TikTok example](https://www.tiktok.com/@hankookilbo/video/7683071292169309448)
- [Issue Broadcast full-height reference](https://www.tiktok.com/@hankookilbo/video/7690521678647921938), inspected 2026-10-16
- [Research scope and limitations](https://hankookilbo-demo-research.thetomkim.chatgpt.site/research.md)

The SVG filenames say `shorts`, but the page explicitly compares these designs
with actual TikTok posts. The assets are extracted from those SVGs and transcoded
to WebP for the app's script budget. Knowledge Exchange retains the 1080x1920
background and 402x132 logo dimensions. Issue Broadcast's logo is reduced to
810 pixels wide, twice its 405-pixel display width. No names or logo artwork are
redrawn. The Knowledge Exchange logo includes the background present in the source.

These are editable adaptations, not pixel-identical replicas:

- Knowledge Exchange's second headline is capped at 160px rather than the
  reference's sample-specific 260px, within the current panel editor's range.
- Issue Broadcast uses full-height portrait video with the logo overlaid, matching
  the full-height TikTok reference. It retains a dark caption box instead of outlined
  captions; API 1 has no caption-outline or video-fade fields. The shared outline width is reduced to 2px so the black boxed headline
  stays legible; box spacing and shadows use the common renderer's existing behavior. Its logo is centered by that renderer.
- Titles, caption contents and video remain editable; sample episode text is not
  baked into the images. TikTok interface graphics are not included.
- Face following depends on the common app's existing runtime; an unavailable
  result falls back to the configured centered crop.

Prompts use the research's editorial observations about concrete subjects,
self-contained explanations and preserving context. They make no claim that a
layout causes higher views. Other program categories and proposed card-news
layouts on the research site are outside this pack's two video templates.

## Validation

```sh
SBS_PANEL_TEST_MODULES=/path/to/node_modules node --test plugins/shortform-clips/tests/shortform_packs.test.cjs
python3 tools/check_public.py
```

During authoring, both JSONs were also installed using the actual app repository
loader in temporary memory, then passed through the production build script with
a transcribed-but-still-analyzing mock source. All generated graphic components
compiled and exposed editable parameters. This does not exercise live Selects
face tracking or create a real video draft.
