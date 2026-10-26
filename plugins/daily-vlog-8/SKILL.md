---
name: daily-vlog-8
description: Build an editable 20.48 s daily vlog Draft from one project footage folder on the team's reference edit, with an animated yellow title, transitions, sound effects and the bundled song.
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
opening clip, then the remaining shots on the reference edit's cuts, with transition, shutter and typing
effects and the bundled song. Clips, title text, effects and audio all stay editable.

## Shot plan (the reference edit)

Every build makes the team's reference edit of this template (its "8-Clip Daily Vlog" timeline), frame for frame
at 25 fps; other Draft rates take round(frame × fps / 25). The Draft is 512 frames (20.48 s) and plays "Relaxed Urban
Bed" from 36.04 s into the song. The song is not measured.

| Frames | Clip | Cut into the next shot |
|---|---|---|
| 0–107 | opening clip, "DAILY VLOG" title (0–107) | traced film exposure (5/5 frames), whoosh 100–134 |
| 107–151 | clip 1 | amber camera exposure (3/5) |
| 151–194 | clip 2, "JUST EVERYDAY MOMENTS" (116–194) | wide cream film gate (3/4), whoosh 183–217 |
| 194–275 | clip 3, split at 236 with a forward source jump of up to 2.88 s, 110 % | straight cut |
| 275–321 | clip 4, 110 % | banded vertical exposure (3/3), camera beep 312–335 |
| 321–366 | clip 5 | straight cut, shutter 366–371 |
| 366–411 | clip 6 | amber camera exposure (4/4) |
| 411–451 | clip 7 | traced film exposure (5/5) |
| 451–512 | clip 8, 110 % shifted left, "THANKS FOR WATCHING" (451–512) | — |

Also: a whoosh at 0–34 and typing at 119–152 and 451–485. The music dips under the sound effects.

A template run uses the clips in the order given (a ninth is not used; with seven, the opening clip returns for
411–451). The panel uses its seven picks for clips 1–6 and 8 and one more clip from the folder for clip 7.
Before creating a Draft, each picked video is checked against its slot's visible duration, with a small allowance
for frame rounding. If a video is too short, the error names its slot, available duration and required duration.
Clip 3 needs about 3.26 seconds of unique footage. Its two pieces never overlap: shorter usable sources reduce
the forward jump, while long sources retain the reference's full 2.88-second jump.

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

Check the animated yellow title over the opening clip, the ten Main clips ending at frames 107, 151, 194, 236,
275, 321, 366, 411, 451 and 512 (at 25 fps), the transition and shutter effects, and the song under the whole Draft.
