---
name: daily-vlog-8
description: Build an editable eight-clip daily vlog Draft from one project footage folder, with an animated yellow title, transitions and bundled audio.
---

# 8-Clip Daily Vlog

Open a project, then use the **8-Clip Daily Vlog** panel.

1. **Footage folder** — pick the project folder that holds your clips. Only folders already
   imported into the open project are listed.
2. **Yellow title clip** — pick the one opening clip that carries the animated yellow title.
   Only clips of 4.3 seconds or longer qualify.
3. **The other seven** — filled at random from the same folder. Press **Shuffle again** for a
   new draw, or expand **Choose them myself** to set slots by hand; a clip may repeat.

Press **Create vlog Draft**. The panel writes a new editable Draft: the animated title over the
opening clip, then the remaining shots on a fixed cut plan, with transition, shutter and typing
effects and the bundled music bed. Clips, title text, effects and audio all stay editable.

## Shot plan

The Draft holds **ten** video positions: the eight you choose plus two short inserts of 31 and
45 frames that sit after the fourth and sixth positions. The eight chosen slots have target
lengths of 4.3, 2.6, 1.63, 1.53, 1.5, 1.8, 1.8 and 2.6 seconds.

The two inserts are filled automatically with clips from the same folder that none of the eight
slots already uses, so no source repeats back to back. A folder therefore contributes **ten
distinct clips**, not all of its footage: pick a folder with at least ten clips long enough for
the plan. When a folder cannot supply ten, an insert reuses a clip from elsewhere in the plan
rather than the one immediately before it.

The music bed is a 19.72-second excerpt, so the Draft runs to roughly that length.

The slot labels are a suggestion, not a constraint: opening/travel, everyday place,
activity/detail, moving scenery, walking/movement, small discovery, rest/portrait, and a
closing close-up.

## Audio and credits

The plugin ships its own music bed and sound effects under `assets/`. Sources and licences are
listed in `assets/CREDITS.md`. One effect, `camera-r2.wav`, is CC BY 4.0 and **requires crediting
theplax when you publish an export that contains it** — the panel shows this reminder. The music
bed is CC0. The remaining effects were made for this plugin and carry no third-party rights.

You need the right to use any footage you publish.

## Requirements

The panel builds the Draft through Selects itself; see `INSTALL.md` for the one dependency it
needs from the host. Nothing is written outside the Selects project and the plugin's own
install folder.

## Verify after creating a draft

Check the animated yellow title over the opening clip, eight separate video slots on the cut
plan, the transition and shutter effects, and the music bed running to the end.
