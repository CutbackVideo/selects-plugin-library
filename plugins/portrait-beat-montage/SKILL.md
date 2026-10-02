---
name: portrait-beat-montage
description: Build a 16-second 3:4 portrait montage Draft from 10 person clips — monochrome strobe intro, beat-cut shots that enter on a person-only zigzag smear with a warm flash and a short punch-in, and a white glow ending, on the bundled soundtrack.
---

# Portrait Beat Montage

Open a project, choose a footage folder in the **Portrait Beat Montage** panel, and press
**Create new draft**. The first 10 videos in the folder (filename order, at least 1.1 s each)
are used. Each should show one person from the face to the chest.

## What the Draft contains

A 1080x1440 Draft at 29.97 fps, 490 frames (16.35 s):

| Draft frames | Main track | Audio |
|---|---|---|
| 0-125 | gap (black) | `music-bed.wav` from 0 to the end |
| 125-185 | `strobe` — flat black/grey/white flashes | `shutter.wav` 125-185, `riser.wav` 150-185 |
| 185-475 | `shot01`...`shot15` — one clip per beat (19-20 frames) | |
| 475-490 | `glow` — a soft white oval fading to black | music fades out |

Shots 1-10 are clips 1-10; shots 11-15 bring back clips 1-5 from a different moment of
each source. Every shot is a separate clip, so shots can be reordered, removed, or
replaced, and each sound has its own volume. The transitions themselves are rendered
into the shot clips.

## The look (fixed)

These values were chosen frame by frame against a reference and approved; keep them.

- **Shot window**: for each clip the pipeline picks the start with the most visible
  movement 0.33-0.79 s in, so a shot never freezes. Returning clips use a window at
  least 0.9 s away from the first one. The shot plays at real speed after the transition.
- **Transition** (first 21 frames at 60 fps): the person — cut out with RVM — smears
  into four horizontal zigzag layers over a clean background plate; the background
  stays put. The horizontal blur clears gradually from about +8 to +24 frames.
- **Punch**: each shot enters at 1.11x, holds 5 frames, then eases back to 1.0x by +23.
  It never grows before the cut.
- **Flash**: warm exposure/saturation lift on every entry, strongest at the cut, gone by +24.
- **Strobe**: the 120-frame grey-level sequence copied from the reference.
- **Glow**: centred oval (half-brightness at 67% of the frame) fading 240 -> 0 over 26 frames.
- **Sound**: the beat carries the cuts, so there is no whoosh per transition; a shutter
  click on each white strobe flash and a riser into the first cut; the music fades
  with the glow.

## Pipeline

On macOS, `pipeline.py` runs in four steps (the panel calls them in order):

1. `plan` probes the clips and chooses the windows.
2. `unit` (15 times) renders one shot window: 60 fps source frames, RVM mattes, a
   background plate, and the 21 transition frames. Units are independent.
3. `assemble` renders the montage at 60 fps and writes it as 17 clips at 29.97 fps
   (`strobe`, `shot01`-`shot15`, `glow`).
4. The panel imports them with the bundled sounds and builds the Draft.

On Windows the panel runs the same steps itself (no Python): the host's ffmpeg for decoding and
encoding, the pixel work in a Web Worker (frame-identical to `pipeline.py` with its pinned numpy and
Pillow), and person mattes from one Selects generation request for the whole montage instead of RVM.
That request uses generation credits, so the panel shows what it sends and waits for
**Use credits and continue**; cached shot windows are never sent again.

Run data lives in `~/.selects/plugin-data/portrait-beat-montage/runs/<run id>/`. The
imported clips are referenced from there; keep the folder while a Draft uses it.

Output is 540x720 per clip, placed on a 1080x1440 canvas.

See [INSTALL.md](INSTALL.md) for setup.
