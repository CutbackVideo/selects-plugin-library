# 2026 Recap

Build a beat-timed year-in-review Draft from footage already imported in the
open Selects Project: a 1080 x 1920 portrait Draft as long as the bundled song,
"Brighter Year Ahead" (68.6 seconds), which plays in full.

## How the cuts are placed

The template follows the composition of its reference edit, not a fixed cut
list. When you build, Selects measures the song (`selects.media.measureBeatSync`)
and the panel places the cuts from that measurement:

- **Intro** - one video you choose, held under an editable two-part title
  graphic (`thank you` above `2026`) until the song's strong downbeat about
  4.7 seconds after the song comes in. With the bundled song the intro runs
  about 8.1 seconds.
- **Fast cuts** - one cut on every beat subdivision of the song (the band
  0.18-0.30 s; about 0.226 s, eighth notes at 133 BPM, for the bundled song),
  each moved onto the measured onset nearest to it. With the bundled song that
  is 238 cuts.
- **Clip order** - every slot once, then a replay of the sequence from 38 % of
  the way in, as the reference does (slots 61-143 of 159 there).
- **Ending** - the cuts stop when the song's pulse ends; the last clip holds
  through the tail and fades to black.
- **Song** - `assets/brighter-year-ahead.wav` is added as one separate Audio
  clip; source-footage audio is muted.

Everything is a normal editable Draft. Nothing is flattened or pre-rendered.
Because the plan is measured, another song file in place of the bundled one
gets the same style at its own tempo and length.

## Using the panel

Open **2026 Recap** from the Plugin list with a Project open. The panel asks, in
order:

1. **Intro video** - pick one video from any video folder, then slide the intro
   window along its source timeline. The preview shows the full uncropped frame.
2. **Fast-cut folders** - pick one or more folders of imported videos. The largest
   video folder is preselected, and every eligible video inside is used
   automatically. The intro may come from a different folder.
3. **Exclusions (optional)** - a collapsed list removes individual videos from the
   fast-cut pool.
4. **Adjust one fast cut (optional)** - retime a single position using the same
   window picker, with its first output time and a note when it repeats later.

Then press the build button. You can render a short sample first.

Changing folders or exclusions refills the pool and replaces manual fast-cut
choices made before that change.

## Footage requirements

- Videos shorter than **1.7 s** are skipped.
- The intro video needs to run longer than the intro (8.5 s with the bundled
  song).
- Fewer videos than slots is fine. The builder cycles the selected videos in
  filename order and starts later passes at different source offsets where
  duration allows. The output is always as long as the song.
- Landscape footage is cover-scaled into the portrait frame.

## Notes

- macOS or Windows with a Selects build that has `selects.media.measureBeatSync`;
  an older build shows an update message. No Python, no model download and
  nothing else to install.
- The song is placed without analysis, so building uses no credits.
- The panel downloads its finished example (about 6.4 MiB) and optional poster
  on first opening. They are cached for later playback without a network
  connection. An unavailable example does not prevent building a Draft.
- Song credits: `assets/CREDITS.md`.
