---
name: postcard-cutout-studio
description: Build an editable "moving postcard" travel opener Draft from a folder of videos and photos — a cut-out subject over snapping background panels, a scrambled title with synced sound effects, and a photo ending cut on the beat.
triggers: ["postcard cutout studio", "moving postcard", "travel postcard opener", "layered postcard cutout"]
---

# Postcard Cutout Studio

Use the installed Panel. It builds a new Draft in the open Project; it never edits
an existing Draft.

## Using the Panel

1. Open a Project, then open **Postcard Cutout Studio** from the Plugin list.
2. **Choose Folder** (or drop a folder). Nothing is imported until you create.
3. Click tiles to select, in order. The first video picked is the subject (★);
   click another tile's number to make it the subject instead. With both videos
   and photos picked, the other videos become background panels, left to right
   (up to six), and the photos are the ending picks (up to twelve). With only one
   kind, the first six after the subject become panels and the rest are the
   ending picks. A photo used as a panel goes in as a still video.
4. Enter the **Title**. **Options** holds the subtitle, subject start time, format
   (Match subject, Landscape 16:9, Portrait 9:16, Square 1:1), framing (Fill frame
   or Fit entire video), font, colours and **All caps** (on by default).
5. **Create**. The Draft is named after the title; if that name is taken it becomes
   `Title (1)`, `Title (2)`, and so on. After changing settings the button reads
   **Rebuild**; with nothing changed it reads **Open**. **Start over** picks a new folder.

Cloud background removal may use credits. A verified cutout is reused for the same
source and range, so rebuilding with new settings does not pay for it again.

## What the Draft contains

The clock is copied from the reference reel and lives in `TIMING` in `panel.tsx`:

- 0–1.52 s: the subject on Main. Background panels snap in left to right every
  0.174 s from 0.18 s, each with a shutter click. The cut-out subject stays on top,
  turning into a white silhouette at 1.43 s under a tone and a riser that cut with
  the flash.
- 2.38, 2.87, 3.37 s: the picture closes in three bites, a ratchet on each.
- 4.06 s: the subtitle lands with a click. 4.51 s: the title arrives scrambled,
  re-rolls on every tick of its sound, and lands its last letter on the last tick.
- From 5.95 s: a slit opens behind the title while the ending cuts on every 16th
  note of the music, to 13.575 s. The ending draws on every clip except the
  subject: a video gives a different moment each time it returns, a photo repeats
  only when there is no video, and no clip plays twice running while another is
  left.

Every picture fills what it shows in. Panels fill their own strip with the clip
centred in it; ending clips fill the frame; with Fill frame the subject is moved
so the person, found from the cutout, sits in the middle, and the cutout moves
with it.

Every piece is its own clip so it can be edited alone: panels (green), the cutout
and the white flash (violet), the `Close 1–3`, `Reveal`, `Subtitle` and `Title`
motion graphics (red, with editable text, font, colour and size), and the sound
effects (yellow) on a few shared tracks plus the music. Source footage goes in
silent, so the only audio is the postcard's own. The Draft is saved with a single
commit.

## Safety and persistence

- A background-removal request is submitted once per run. An unfinished run is
  resumed by job ID when the Panel reopens, never replaced by a second paid request.
- Run state, masks, held clips and sounds live in the Panel folder. Keep them while
  any Draft references them.
- The cutout masks are served by a loopback service on this computer. After a
  restart, open the Panel before previewing or exporting an existing postcard Draft.

## Review

After a build, re-read the saved Draft and confirm: the canvas; the subject on Main
from 0 to 1.52 s; at most six panels; one `Cutout` and one `White flash` clip on the
distinct foreground Resource; `Close 1–3`, `Reveal`, `Subtitle` and `Title`
graphics; the sound clips sharing a few tracks; and the ending slices on the beat.
Inspect frames around 0.9, 1.45, 2.5, 4.3, 5.5 and 8 s.

## Known limitations

- macOS only; tested on Apple silicon with a Selects development build.
- The title look uses DIN Condensed and Avenir Next, which macOS provides. Other
  systems fall back to other fonts.
- Fill frame keeps the subject centred but crops the rest of a wide scene; use Fit
  entire video when the whole frame must stay visible.
- See [THIRD_PARTY.md](THIRD_PARTY.md) for where the sounds and the music come from.
