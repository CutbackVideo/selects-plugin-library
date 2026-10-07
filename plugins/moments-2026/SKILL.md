---
name: moments-2026
description: Build the fixed 2026 Moments year-in-review template (27 s, 9:16, 15 clips) from Selects footage.
---

# 2026 Moments

The companion panel is installed at `SELECTS_USER_PANELS_ROOT/moments-2026/panel.tsx`
and holds the whole implementation: the effect, graphic and transition components
and the Draft builder. Use the panel (or the Clip highlights template) to build;
do not rebuild the template by hand.

## Fixed template

- 1080 x 1920 Draft, 15 Main-track clips, 27.0 s at the project frame rate.
- Cut times (s): 0, 9.2, 11.0, 13.2, 14.93, 16.9, 18.15, 19.15, 20.15, 21.1,
  22.1, 23.1, 24.1, 25.0, 26.0, end 27.0. Strip cuts follow a 123 BPM beat.
- Slot 1 carries the `YearIntro` video effect: rolling digits as a text mask,
  a log-space zoom through the last digit (3.0-5.6 s), then a diagonal wipe to
  the full clip (6.3-8.2 s). Editable: year, font, maximum zoom.
- A `MomentsTitle` motion graphic sits over slot 2. Editable: title, subtitle,
  fonts, colour.
- Transitions in order: white flash, black dip, box reveal, black dip, light
  leak, six three-strip transitions. Each carries its own in/out frame counts.
- Minimum source seconds per slot (cut plus transition handles):
  9.6, 2.3, 2.7, 2.3, 2.5, 2.0, 1.7, 1.7, 1.7, 1.7, 1.7, 1.25, 1.1, 1.1, 1.1.

## Inputs

The intro clip and the other clips. The longest clip goes to the intro when the
panel fills slots automatically; the rest follow project order and repeat when
there are fewer than 14. Optional: one project audio Resource as music, with a
start offset; when given, clip audio is set to -60 dB and the music fades out
over the last 0.6 s. No music is bundled.

## Build rules

Read the project's Resources and frame rate at run time; never embed an example
project's Resource ids or paths. Each clip's source window is centred and must
cover its transition handles. Non-9:16 sources are cover-scaled with the clip
transform. The build ends with one `commitAll` and opens the new Draft.
