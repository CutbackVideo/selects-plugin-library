---
name: gongju-gallery
description: Create a short editable portrait gallery montage from a selected footage folder and the plugin's fixed soundtrack in the current Selects project.
---

# pov: you open my gallery

Open a project, pick a footage folder in the **pov: you open my gallery** panel, and press
**Create new draft**. There is no music picker: the panel always uses the soundtrack bundled
with the plugin, `assets/gallery-bgm-almost-new-12s.wav`.

The panel builds a 1080x1440 Draft. A black title card runs for the first 113 frames
(about 3.77 seconds), then 11 video shots follow. Cut boundaries are at frames
`[113, 135, 157, 179, 202, 224, 246, 268, 290, 312, 335, 357]`, which is where the
soundtrack's piano notes fall. The last shot is the 22-frame cut from 335 to 357, and no
further visual switch is added after it. The soundtrack ends with the picture at frame 357,
so the video output runs about 11.91 seconds. The opening line defaults to
`pov: you open my gallery` and can be replaced in the panel; it is set in Futura Bold.
Each shot also drifts: it scales up slowly and slides a little, with the direction changing
from shot to shot. Pick **Subtle**, **Normal** or **Strong** in the panel. Title graphic,
video clips, drift and audio all stay editable in Selects afterwards.

## Footage selection

Choose **Filename order** or **Random** in the panel.

Eligible clips are the videos in the selected folder that have a file path and last at least
1.3 seconds, sorted by filename. If at least 11 of them have an aspect ratio of 1.5 or lower,
only those are used; otherwise every eligible video is used.

- **Filename order** places the first 11 eligible clips in that order.
- **Random** draws 11 different clips at random and places them shuffled. A new draw happens
  every time you create a draft.

Both modes take the middle of each source clip, trimmed to the length of its cut.

## Scope and media

The folder list shows each folder with the number of usable clips beside it, and marks any
folder with too few. It shows only footage imported into the **currently open project**. To use footage
from another project, open that project. Import folders into the Selects project files area first
if they are not in Selects yet.

If the project already holds a file whose SHA-256 matches the bundled soundtrack, the panel reuses
it; otherwise it imports the soundtrack the moment you create a draft. A different file with the
same name is not treated as the fixed soundtrack. Opening the panel alone adds nothing to the
project.

You need the right to use any footage you publish. The bundled soundtrack ships with the plugin.

## Requirements

The panel runs `python3` and `ffmpeg` to produce short portrait intermediates. Both must be
installed before use; see `INSTALL.md`. Intermediates are written under
`~/.selects/plugin-data/gongju-gallery/` and are referenced by the Draft, so keep them while you
work on that Draft.

## Verify after creating a draft

Check the 1080x1440 frame size, the first video entering at frame 113, 11 separate video clips,
the last clip spanning frames 335 to 357, the title graphic, the drift on each shot, and the
fixed soundtrack.
