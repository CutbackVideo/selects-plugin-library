# Hankook Ilbo template pack

Four templates for the shared Shortform Clips app: two layouts adapted from
TikTok references and two scene-based news formats. No customer app fork
or sample episode media is included.

| Template | Layout |
| --- | --- |
| Knowledge Exchange | Original green background and logo, white/red two-line headline, black speech caption box; video window y=622..1378 |
| Issue Broadcast | Portrait video with face-following enabled, fluorescent yellow headline and second-line box, original logo over the video; full-height video window y=0..1920 |
| Huick Alpha | Dialogue-led news scenes with composited characters, contextual backgrounds, timed source images and article excerpts; white dialogue captions on gray boxes |
| One-minute newspaper | Newspaper page pans and zooms, original headline highlights over a dimmed page, white narration captions on gray boxes and a bottom-center logo |

Knowledge Exchange and Issue Broadcast enable AI framing with the Speaker focus preset. Split and wide shots are disabled. Huick Alpha keeps its separate scene-based workflow.

## Install

Install the shared [Shortform Clips app](../..). In **Templates**, choose
**+ Add templates** at the end of the template picker, paste this folder's
published GitHub URL, and click **Add**. If no templates are installed yet,
use the **Add templates** button.

The pack lives at `plugins/shortform-clips/template-packs/hankook-ilbo/`.
Use a published branch or commit containing that path; a GitHub `pack.json`
page or raw file URL also works. Installing the app does not install this pack.

Use Shortform Clips 0.7.0 or later with Template API 7 support. Each template has
one design; there is no separate platform selection. Existing Knowledge Exchange
and Issue Broadcast designs are retained. Re-add the published pack link to import
the update; the app asks how to handle any conflicting local edits.

The reference uses Black Han Sans for headlines and Issue Broadcast captions,
and Pretendard for Knowledge Exchange captions. Issue Broadcast headlines use
Pretendard because the current renderer forces a heavy weight, which closes up
small black text in the reference typeface. Other font names are retained. Fonts
are not bundled or installed by a template pack; if unavailable on the editing
machine, the shared renderer uses its system Korean font fallback. Install the
font separately through the normal font workflow for closer typography.
Huick Alpha uses Pretendard, including 54px white dialogue captions with weight
500 on gray (`#787878FF`) boxes. These are editable template defaults.

## Huick Alpha

The template owns channel-level editing instructions, dialogue and evidence
styling, the supplied logo, and a six-frame visual guide from three channel
references. The guide demonstrates composition and hierarchy; its episode claims,
images and wording are not sources for a new video.

- [Medicine delivery reference](https://www.youtube.com/shorts/DAD8V3Uv7EI)
- [Channel reference 2](https://www.youtube.com/shorts/YK-Tv0BW5A0)
- [Channel reference 3](https://www.youtube.com/shorts/w870zDhhUU8)

Import the episode's footage and supporting images into the Project and wait for
source transcription. Extra instructions can provide a concept, cast treatment,
required scenes or supplied quotations and credits. Supplied choices override the
template's defaults; the planning AI fills in unspecified choices from the source
evidence. Medicine-specific props, dialogue and article excerpts are not bundled.

The planning AI chooses source ranges, scene intent, information reveals and
caption timing. A separate production AI builds editable layers using the common
app tools; the host applies dialogue captions from the plan and template settings.
Foreground preparation uses the shared AI Runtime when the selected concept needs
it. See the [scene workflow](../../README.md#scene-templates) for host requirements,
checkpoints, timing and review limitations.

## One-minute newspaper

This template adds a newspaper design and production instructions to the existing
scene/layers workflow. Use Shortform Clips 0.7.0 or later (Template API 7).
In Create clips, select this template, choose a local PDF, load and select a TTS voice, and enter the article order or focus
in Extra instructions. The PDF does not need to be imported into the Project.

The app keeps an exact local copy of the PDF and the current selection per
project. Clear selection detaches it from the form without deleting files used by
saved jobs. Generation uses macOS PDFKit to prepare page images (4096px longest
edge) and original text positions, then imports those images into the current
project. Only the chosen PDF pages and narration enter this source scope.
Resume reuses the saved PDF and prepared pages. PDFs must be unlocked, at most
128 MiB and contain 1-64 pages. Scanned pages remain images with no extracted
text; the writing AI reads the page image. Selects narration synthesizes the
PDF-grounded script and supplies character timings; no recording or STT is
required. The planner groups caption phrases; their timing comes from TTS words.
Missing, rewritten or out-of-order narration is rejected. TTS uses Selects credits. Resume reuses the saved paid workflow and
audio. An unknown submission outcome stops instead of charging again.
PDF preparation is macOS-only.

Extra instructions can name the articles, their order, and which headline, photo
or chart to focus on. The production AI locates those regions in the supplied
page images; users do not need pixel coordinates. The template requests stable
reading shots, linked page/highlight movement and screen-fixed captions and logo.
Bright emphasis defaults to each article headline, enclosing every line with a
small outer margin. Body text, photos and charts use camera framing; separate
bright emphasis on those regions is applied when requested in Extra instructions.
The shared `media.page()` component applies those normalized page coordinates to
both the original image and a transparent hole in the dim overlay. It never paints
over highlighted text. Template `editorial.components.page` controls dim strength,
paper color and move duration. Captions and logo remain separate screen layers.
The host adds the template's two-line series opening for the first second, then
rotates and shrinks its black title strips away. The production AI keeps the page
visible underneath and does not rebuild the opening. This approximates the
reference transition rather than reproducing its paper-crumpling effect.
AI region selection still needs a real source-to-Draft visual review.

The visual guide compares six episodes from the same series:
[March 19](https://www.youtube.com/shorts/a-s-_rL6a8k),
[March 20](https://www.youtube.com/shorts/jJ4QQPfSqOg),
[March 23](https://www.youtube.com/shorts/7w1PBit-42Y),
[March 24](https://www.youtube.com/shorts/HzfeUqBsGgk),
[March 27](https://www.youtube.com/shorts/s9G6JqSoJmA), and
[March 30](https://www.youtube.com/shorts/YYWxynWWIH0).
It is style evidence, not source material for a new episode. Detailed transitions
were inspected in the March 19 video; the other episodes were compared through
storyboard sequences, with additional browser frames from March 30.

The small vertical logo is extracted from the March 19 reference and has limited
resolution. Replace it with an official transparent master when available.
Pretendard and Noto Serif KR are editable approximations, not verified reference
font identifications, and are not bundled. Dim strength and transition durations
are observed approximations. Other templates and the shared production code are
unchanged in their video-input behavior.

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
layouts on the research site are outside the two layouts adapted from that site.

## Validation

```sh
SBS_PANEL_TEST_MODULES=/path/to/node_modules node --test plugins/shortform-clips/tests/shortform_packs.test.cjs
python3 tools/check_public.py
```

During their original authoring, the Knowledge Exchange and Issue Broadcast JSONs were installed using the actual app repository
loader in temporary memory, then passed through the production build script with
a transcribed-but-still-analyzing mock source. All generated graphic components
compiled and exposed editable parameters. This does not exercise live Selects
face tracking or create a real video draft.
