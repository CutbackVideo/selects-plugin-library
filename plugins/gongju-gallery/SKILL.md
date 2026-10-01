---
name: gongju-gallery
description: Create a short editable portrait gallery montage from a selected footage folder and the plugin's fixed soundtrack in the current Selects project.
---

# pov: you open my gallery

Open a project, pick a footage folder in the **pov: you open my gallery** panel, and press
**Create new draft**. There is no music picker: the panel always uses the soundtrack bundled
with the plugin, `assets/gallery-bgm-gallery-montage-12s-v2.wav`.

The panel builds a 1080x1440 Draft. A black title card runs for the first 109 frames
(about 3.64 seconds), then 15 video shots follow. Cut boundaries are at frames
`[109, 124, 140, 155, 171, 186, 202, 217, 233, 248, 264, 279, 295, 310, 326, 341]`.
The last shot is the 15-frame cut from 326 to 341, and no further visual switch is added
after it. The soundtrack ends with the picture at frame 341, so the video output runs about
11.38 seconds. The opening line is always `pov: you open my gallery`, set in Futura Bold.
Title graphic, video clips and audio all stay editable in Selects afterwards.

## Footage selection

Choose **Filename order** or **Random** in the panel.

Eligible clips are the videos in the selected folder that have a file path and last at least
1.3 seconds, sorted by filename. If at least 15 of them have an aspect ratio of 1.5 or lower,
only those are used; otherwise every eligible video is used.

- **Filename order** places the first 15 eligible clips in that order.
- **Random** draws 15 different clips at random and places them shuffled. A new draw happens
  every time you create a draft.

Both modes take the middle of each source clip, trimmed to the length of its cut.

## Scope and media

The folder list shows only footage imported into the **currently open project**. To use footage
from another project, open that project. Import folders into the Selects project files area first
if they are not in Selects yet.

If the project already holds a file whose SHA-256 matches the bundled soundtrack, the panel reuses
it; otherwise it imports the soundtrack the moment you create a draft. A different file with the
same name is not treated as the fixed soundtrack. Opening the panel alone adds nothing to the
project.

You need the right to use any footage you publish. The bundled soundtrack ships with the plugin.

## Requirements

The panel runs `crop.py` with a pinned Python 3.11 that `runtime.sh` downloads on first use
(shared under `~/.selects/plugin-data/_runtime`), and the `ffmpeg` that ships with Selects, to
produce short portrait intermediates; see `INSTALL.md`. Intermediates are written under
`~/.selects/plugin-data/gongju-gallery/` and are referenced by the Draft, so keep them while you
work on that Draft.

## Verify after creating a draft

Check the 1080x1440 frame size, the first video entering at frame 109, 15 separate video clips,
the last clip spanning frames 326 to 341, the title graphic, and the fixed soundtrack.
