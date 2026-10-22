# Huick Alpha visual-style audit — 2026-10-22

## Evidence and limits

Channel: https://www.youtube.com/@huick_alpa/shorts

The latest 18 entries were inventoried. Four relevant full video files were
sampled across their complete duration at five-second intervals, followed by
selected 360px frame inspections. This is a visual sampling audit, not continuous
playback, an audio review, or a claim that every channel upload was analyzed.
The heat episode uses previously captured frames because its fresh download
returned HTTP 403. Other failed downloads were not treated as viewed evidence.
The separate Huick Sseol series was excluded. Flu and prosecution episodes remain
held out for the user's later evaluation.

| Reference | Inspected evidence | Shared treatment and counterexample |
| --- | --- | --- |
| [Medicine delivery](https://www.youtube.com/shorts/DAD8V3Uv7EI) | Whole-duration sheet; exact 14.5, 19, 24, 40s frames | Gray dialogue box; white article panel with source below at 19s; lime label attached to illustration at 24s; paper statement with attribution inside at 40s. Faces integrated with pills. |
| [Hangul Day](https://www.youtube.com/shorts/YK-Tv0BW5A0) | Whole-duration sheet; exact 9, 29s frames | White article panel at 9s; inverse citation on historical document at 29s; large white reaction and ending copy. Classroom staging, body cutouts, foreground furniture and chalk lettering; not object personification. |
| [Appliance hacking](https://www.youtube.com/shorts/j3saXZ7mN_U) | Whole-duration sheet | White excerpt panels, device diagram, faces in appliances, photographic setting, large white closing instruction. Some text is already part of source photographs. |
| [AI drama](https://www.youtube.com/shorts/oEHKQztbdQU) | Whole-duration sheet; exact 37s frame | White excerpt panels; large white reaction copy at 37s; room, drama collage and phone as context. Some red emphasis and stylized lettering; source-footage subtitles are not channel template evidence. |
| [October heat](https://www.youtube.com/shorts/w870zDhhUU8) | Cached 8.5, 19, 33.5s frames | Gray dialogue box, weather-map space and cutout characters. Lime tag for pressure system at 33.5s; an outlined temperature label shows not every label uses the same appearance. |

Contact sheets and cached heat frames are retained in the local evaluation
archive; they are not distributed with this template pack.
Five-second contact-sheet cells are samples, not verified shot boundaries.

## Template decisions

| Layer | Reusable decision | Remains scene-specific |
| --- | --- | --- |
| Brand/topic | Shared host renderer preserves logo geometry and small white topic beneath it | Episode title |
| Dialogue | Existing white text on medium-gray box; host generates it | Validated words and source timing |
| Article | `components.article`: white body panel, black text, small attribution flowing below | Verified excerpt/source, width, position and lifetime |
| Large copy | `components.text.plain-white`: white sans-serif with restrained shadow | Whether needed, wording, line breaks, position and scale |
| Attached label | `components.text.lime-tag`: dark bold text on lime rectangle | Whether needed, which subject, placement and reveal |
| Paper statement | `components.articleStyles.document`: transparent panel, centered black excerpt and attribution | Paper image, excerpt, placement and lifetime |
| Other special text treatment | Existing editable media/text tools | Chalk, historic inverse quote, colored inline emphasis and source-image lettering |

A question is a meaning, not a visual component. Large white copy occurs for
questions, reactions, statements and endings. The label passed to `media.text`
does not determine its style. No `question` style is added. A shared style need
not appear in every episode; it is a reusable choice supported by multiple
references, not a mandatory shot or template of the whole story.

The earlier global 32px/500 white text override was removed: it conflated the
persistent small topic with every scene overlay. Named visual styles are selected
explicitly. Omitting `style` keeps the existing free-form preset path for a
planned special treatment. Unknown names fail instead of silently substituting.
Only the Huick template declares these choices; templates without components
retain existing behavior.

## Composition findings retained in the template

- A scene uses available sources as environment, illustration, evidence, prop or
  reaction according to its content. Backgrounds convey a setting or explanation;
  a document/grid scene is also valid when its content is the focus.
- Face/object integration and body-in-setting staging both occur. Treatment follows
  the concept and footage; personification is not mandatory.
- Reveal relevant illustrations when their subject is introduced. Do not equate
  source usefulness with factual citation alone, or require every file to appear.
- Keep subject scale and spatial relationships coherent through an explanation;
  changes in focus or situation can justify a new composition.
- Extra text should contribute identification, comparison or emphasis. It need
  not restate dialogue that is already clear from the caption and imagery.
- Explicit production briefs govern episode choices; AI fills gaps using the
  provided sources. These preferences remain in the template, not duplicated in
  the shared planner/builder prompts.

## Calibration and checks

Exact source font families, weights and color values cannot be recovered from
compressed frames. Pretendard and numerical settings are implementation defaults,
not claims of exact original design files. Existing article defaults remain
42px body / 22px source. New large text uses96 and label64 preset units (the
installed generator uses min(frame width, frame height)/1080); at1080x1920 they
are96px and64px before clip scaling. Lime #D7FF00 and shadow settings are visual
approximations. These are baseline styles, not fixed final screen sizes.

Tests exercise style selection, appearance precedence, unchanged content/timing,
invalid names, pack serialization and forbidden content/timing fields in styles.
The real installed text preset and article TSX are rendered by tests. A separate
static360px browser preview exercises the same helper output; its local font
fallback is not proof of exact in-app typography. Full generated-video review is
still required for final appearance and motion.

No new model calls, review stage, export or runtime loop was added. No episode
assets, dialogue, URLs, medicine-specific choices or source filenames were added
to the reusable component implementation.
