---
name: daily-vlog-8
description: Build an editable daily vlog Draft from one project footage folder, cut to the measured beat of its bundled song for the song's full length, with an animated yellow title, transitions and sound effects.
---

# 8-Clip Daily Vlog

Open a project, then use the **8-Clip Daily Vlog** panel.

1. **Footage folder** — pick the project folder that holds your clips. Only folders already
   imported into the open project are listed.
2. **Yellow title clip** — pick the one opening clip that carries the animated yellow title.
   Only clips of 4.3 seconds or longer qualify.
3. **The other seven** — filled at random from the same folder. Press **Shuffle again** for a
   new draw, or expand **Choose them myself** to set slots by hand.

Each position has its own required length, so the panel matches clips to lengths rather than
drawing blindly: the longest position is served first and takes the shortest clip that still
reaches it. That keeps a long clip from being spent on a short position while a longer one is
left with nothing that fits, which is why a draw succeeds whenever the folder can satisfy the
plan at all.

Press **Create vlog Draft**. The panel writes a new editable Draft: the animated title over the
opening clip, then the remaining shots on the song's measured cut plan, with transition, shutter and typing
effects and the bundled song. Clips, title text, effects and audio all stay editable.

## Shot plan (measured from the song)

The Draft is exactly as long as the bundled song, "Relaxed Urban Bed" (69.84 s), which plays in full. The panel
measures the song with `selects.media.measureBeatSync` and plans the shots from the reference edit's rules
(@capcutverse daily vlog):

- The opening shot under the animated title runs about 4.3 s.
- Then the reference's phrase of shot lengths — 2.6, 1.63, 1.73, 1.03 (insert), 0.7, 1.5 (insert), 1.8, 1.8 s —
  repeats until the song's pulse ends. Every cut moves to the song's nearest half beat (the beat period inside
  0.28–0.60 s), then onto the strongest onset within 35 ms, so each transition lands on the music.
- The closing shot with "THANKS FOR WATCHING" runs from the last cut to the end of the song.
- Each cut keeps the reference's transition and sound effect for its place in the phrase (film exposure, amber
  shutter, film gate, vertical smear, one-frame hold, cyan-magenta flash, optical dissolve; whoosh, shutters, camera
  beep, typing), and the music ducks under each sound effect as in the reference.

With the bundled song that is 41 shots. The first phrase uses the seven picks in order, with two clips from the
folder that were not picked as the inserts; later phrases continue through the folder's other clips and then start
over at new source offsets, so a bigger folder gives more variety. The closing shot uses the closing pick when it is
long enough, else the folder's longest clip.

The slot labels are a suggestion, not a constraint: opening/travel, everyday place,
activity/detail, moving scenery, walking/movement, small discovery, rest/portrait, and a
closing close-up.

## Audio and credits

The plugin ships its own song and sound effects under `assets/`. Sources and licences are
listed in `assets/CREDITS.md`. One effect, `camera-r2.wav`, is CC BY 4.0 and **requires crediting
theplax when you publish an export that contains it** — the panel shows this reminder. The music
is the bundled Suno song. The remaining effects were made for this plugin and carry no third-party rights.

You need the right to use any footage you publish.

## Requirements

The panel builds the Draft through Selects itself; see `INSTALL.md` for the one dependency it
needs from the host. Nothing is written outside the Selects project and the plugin's own
install folder.

## Verify after creating a draft

Check the animated yellow title over the opening clip, the shots changing on the song's beat, the
transition and shutter effects, and the song running in full to the end.
