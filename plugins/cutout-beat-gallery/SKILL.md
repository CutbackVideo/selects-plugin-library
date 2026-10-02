---
name: cutout-beat-gallery
description: Turn a folder of portrait photos into an editable 15.9-second beat-cut gallery Draft where cut-out people with paper outlines slide in, stack, and lead into the next photo, on a fixed soundtrack.
---

# Beat Cutout Gallery

Open a project, choose a photo folder in the **Beat Cutout Gallery** panel, press
**Analyze photos**, review the scene/sticker pairs, tick the confirmation, and press **Make video**.

## Photos

- At least 23 different portrait (vertical) photos, 640x900 or larger. Landscape photos,
  exact duplicates and near-duplicates are skipped.
- At least 13 of them must cut out cleanly: the person may not touch the left, right or top
  edge, or a corner. 14 clean cutouts add the closing sticker; with 13 the sticker before it
  stays to the end.
- On macOS, people are separated with the macOS Vision person-segmentation model on this
  computer; no photo leaves the computer.
- On Windows, Analyze photos is "Available on macOS for now": the Windows path cuts people out
  with Selects generation, which uses Selects credits, and it is on hold until that is decided.

## What the Draft contains

A 1080x1920 Draft, 478 frames at 30 fps (frame numbers below), with every photo, sticker and
the music as separate clips:

- **15 scene photos**, cut at 0, 40, 72, 104, 140, 196, 220, 235, 243, 283, 307, 337, 347,
  371 and 411. Close-ups (large person area) go to the scenes that carry no sticker.
- **Lead-in stickers** at 29, 61, 93, 132, 227 and 363: the people of the next photo slide in
  from an edge; the cut then shows that photo with the same outline.
- **Stacked stickers** from separate photos, placed over the photo on screen and kept until
  it ends: 156 (moves up and shrinks at 166), 166, 177, 267, 324, 401, 436 (rises from the
  bottom) and 457 (fades in; the 436 sticker leaves first).
- **Effects**: 211-216 a teal darkening with a lit circle growing around the faces, 217-219 a
  dark red wash, 438-441 a blue/orange colour split.
- Outline styles rotate between clean, hand-drawn paper, offset and none.

No more than one photo passes without a sticker. Each sticker keeps editable position and size.
Export the finished Draft with Handoff -> Export.

## Approved reference set

A folder holding the 19 approved photos and 12 approved sticker layers is recognized by file
hash and rebuilt as the approved reference Draft. Those files and the reference render are not
part of this package, so for everyone else every folder takes the general path above.

See [INSTALL.md](INSTALL.md).
