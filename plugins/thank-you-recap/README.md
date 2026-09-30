# Thank You Recap

Builds a 16:9 "Thank you <year>" recap as a **new Draft** from the videos in the
open Project, on a fixed timeline cut to the bundled music (about 25.9 s). Every
cut stays a separate, editable clip, and the titles are one editable Motion
Graphic. Export with Handoff → Export as usual.

## What it makes

1. **Bass-roll intro (0–2.6 s).** Fifteen quick cuts, one on each hit of the
   slowing bass roll.
2. **Hero shot (2.6–8.55 s).** One calm video is held under a small
   "THANK YOU". The year appears with the trumpet (5.3 s) and cycles through six
   typefaces every eighth note.
3. **Closing montage (8.55–11.9 s).** While the trumpet holds its last note, the
   frame closes to a line over a montage cut on the eighth-note pulse, and the
   year flickers every sixteenth note.
4. **Piano and salsa (11.9 s–end).** The frame reopens on the first piano note;
   cuts follow the piano notes, then quarter notes of the 134.5 BPM groove, with
   a cut on the salsa entry.

## Using the panel

Open **Thank You Recap** from the Plugin list with a Project open.

- **Videos**: check the videos to use (at least three). They fill the montage
  in list order and are reused when there are fewer videos than cuts, each reuse
  taking a later moment of the take.
- **Hero shot**: pick one, or let the Selects AI choose a calm, wide shot. It
  must be at least 6 s long. If the AI pick is unavailable, the longest video is
  used and the panel says so.
- **Year**: the text shown under "THANK YOU" (defaults to the current year).

The caption, year and year color can be changed afterwards in the Inspector of
the "Thank you titles" Motion Graphic.

## Fixed settings

The cut points, music, frame size (1920 x 1080) and title timing are fixed to
match the template. They are constants at the top of `panel.tsx`.

## Limitations

- Tested only on a macOS development build of Selects with 24 fps, 16:9
  footage. Released builds, Windows, vertical footage, rotation metadata, HDR
  and slow-motion sources are unverified.
- The year typefaces are digit-only subsets; letters typed into the year fall
  back to a system font.
- Montage moments are spread evenly through each take; they are not chosen by
  content.
