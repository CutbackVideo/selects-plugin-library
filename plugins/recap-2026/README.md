# 2026 Recap

Build a beat-timed year-in-review Draft from footage already imported in the
open Selects Project. The template is fixed: a 1080 x 1920 portrait Draft that
runs about 61.5 seconds, made of a 4.7-second title intro plus 159 short fast
cuts locked to the bundled soundtrack.

## What it makes

- **Intro (4.7 s)** - one video you choose, with an editable two-part title
  graphic: an italic serif line (`thank you`) above a heavy sans year (`2026`).
  Both are ordinary Draft graphics, so you can retype or restyle them after the
  build.
- **Fast cuts (slots 2-160)** - 159 placements whose durations come from
  `timing.json`, each around 0.229 s, so every cut lands on the soundtrack's
  eighth-note pulse (about 130.9 BPM). Slots 61-143 repeat later with the same
  source ranges in the same order.
- **Soundtrack** - `assets/recap-2026-fixed-soundtrack.wav` is added as one
  separate Audio clip and includes the spoken 2026 line. Source-footage audio is
  muted.
- **Ending** - the final placement holds to 61.498 s under a short black fade.

Everything is a normal editable Draft. Nothing is flattened or pre-rendered.

## Using the panel

Open **2026 Recap** from the Plugin list with a Project open. The panel asks, in
order:

1. **Intro video** - pick one video from any video folder, then slide a 4.7-second
   window along its source timeline. The preview shows the full uncropped frame.
2. **Fast-cut folders** - pick one or more folders of imported videos. The largest
   video folder is preselected, and every eligible video inside is used
   automatically. The intro may come from a different folder.
3. **Exclusions (optional)** - a collapsed list removes individual videos from the
   fast-cut pool.
4. **Adjust one fast cut (optional)** - retime a single position using the same
   window picker. Positions are labelled 1-159 in playback order, with the first
   output time, the selected duration, and a note when that position repeats
   later.

Then press the build button. You can render a 12-second sample first.

Changing folders or exclusions refills the pool and replaces manual fast-cut
choices made before that change.

## Footage requirements

- Videos shorter than **1.7 s** are skipped: the longest montage placement is
  about 1.55 s plus a frame margin.
- The intro video needs at least **5 s**.
- Fewer than 160 videos is fine. The builder cycles the selected videos in
  filename order and starts later passes at different source offsets where
  duration allows. One long video can serve as both intro and montage. The
  output stays about 61.5 seconds either way.
- Landscape footage is cover-scaled into the portrait frame.

## Fixed by design

Music, narration, year, BPM, title wording, transitions and cut order are part
of the template and are not offered as options. Edit the saved Draft afterwards,
or change the template deliberately.

## Notes

- macOS with the Selects SDK and host shell. No Python and no model download.
- A new Project may need the bundled soundtrack analysed before overlay
  placement.
- The panel's "finished example" player is empty after a fresh install; the
  gallery preview is not shipped as an installed file. See `SKILL.md`.
