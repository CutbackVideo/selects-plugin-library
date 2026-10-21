---
name: moments-2026
description: Build the fixed 2026 Moments year-in-review template (27 s, 9:16, 15 clips) from Selects footage.
---

# 2026 Moments

The companion panel is installed at `SELECTS_USER_PANELS_ROOT/moments-2026/panel.tsx`
and holds the whole implementation: the effect, graphic and transition components
and the Draft builder. This Skill folder holds the bundled music
(`assets/music.m4a`) and its licence files. Use the panel (or the Clip highlights
template) to build; do not rebuild the template by hand.

## Fixed template

- 1080 x 1920 Draft, 15 Main-track clips, 27.0 s at the project frame rate.
- Cut times (s): 0, 9, 11, 13, 15, 17, then every second to the end at 27. They
  sit on the bundled track's 120 BPM grid (first downbeat at 0 s).
- Slot 1 carries the `YearIntro` video effect: rolling digits as a text mask,
  a log-space zoom through the last digit (3.0-5.6 s), then a diagonal wipe to
  the full clip (6.3-8.2 s). Editable: year, font, maximum zoom.
- A `MomentsTitle` motion graphic sits over slot 2. Editable: title, subtitle,
  fonts, colour.
- Transitions in order: white flash, black dip, box reveal, black dip, light
  leak, six three-strip transitions. Each carries its own in/out frame counts.
- Minimum source seconds per slot (cut plus transition handles):
  9.5, 2.4, 2.5, 2.6, 2.6, 1.5, 1.8, 1.8, 1.8, 1.8, 1.8, 1.7, 1.2, 1.2, 1.2.

## Inputs

The intro clip and the other clips. The longest clip goes to the intro when the
panel fills slots automatically; the rest follow project order and repeat when
there are fewer than 14.

Music: by default the bundled `assets/music.m4a` ("One Cool Minute", Loyalty Freak
Music, CC0 1.0, 28 s, 120 BPM) is copied to `~/.selects/plugin-data/moments-2026/`
under a checksum name and imported into the project once, then laid under the
whole Draft from 0 s. The panel can instead use a project audio Resource with a
start offset, or no music. With music, clip audio is set to -60 dB and the music
fades out over the last 0.6 s.

## Build rules

Read the project's Resources and frame rate at run time; never embed an example
project's Resource ids or paths. Each clip's source window is centred and must
cover its transition handles. Non-9:16 sources are cover-scaled with the clip
transform. The build ends with one `commitAll` and opens the new Draft.
