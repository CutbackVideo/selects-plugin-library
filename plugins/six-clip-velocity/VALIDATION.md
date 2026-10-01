# Validation

## Reference

A trending "velocity template" short-form edit (30 fps, 699 frames, 1080x1440, 3:4), measured with ffmpeg:

- **Shots:** starts at frames 0, 175, 206, 235, 264, 293, 323, 352, 382, 411, 440, 469, 499, 527, 557, 587, 616 and 645. From 206 on, a cut lands every 29-30 frames (two beats at about 123 BPM).
- **Block:** shots 206-411 and 440-645 are the same seven shots with the same footage, from videos 3, 4, 2, 5, 6, 6 and 4.
- **Speed:** each block shot is a velocity ramp, fast into and out of each cut and slow in the middle. It was measured as relative motion inside each shot and approximated with seven constant-speed pieces (4, 2.5, 1.2, 0.5, 1, 1.8 and 4x).
- **Transitions:** every cut except 411 is a vertical motion blur on the five frames around it. Cut 411 is a white flash that dips dark, at frames 408-418.
- **Ending:** the last shot fades from 35% black at 645 to black at 672, then black to 699.
- **Subtitles:** described in `SKILL.md`, with onsets, fade-outs, positions and cap heights measured per frame.
- **Music:** a copyrighted track, not reused.

## Exactness check (barcode test videos)

To measure what the editor actually shows, the plugin was run on six test videos. Each frame of these videos carries a barcode of its own frame number; one of them is 60 fps. A Project that holds 30 fps video gives a 30 fps Draft, so Draft frames line up one to one with the reference. The FHD export was decoded frame by frame.

| Check | Result |
| --- | --- |
| Length | 699 frames (23.3 s), the same as the reference |
| Source frame shown, all readable frames | within ±2 source frames of the plan; some ±4 on the 60 fps video at 4x. This is expected: start points snap to whole Draft frames, so the error grows with speed. |
| Repeated block | 161 of 161 readable frames show the same source frame in both blocks |
| Blur cuts | blurred on exactly the five frames around each of the 15 blur cuts, at every piece speed |
| Flash, frames 408-418 | measured overlay alpha within 0.01 of the reference values |
| Fade, frames 645-672 | within 0.016 of the reference curve; frames 672-698 are pure black |
| Music | the nearest kick is within -45 to +38 ms of each of the 16 cuts, with no drift |

**Subtitles:** onsets, fade-outs, line positions (y 684, 727 and 719) and cap heights (36, 22 and 30 px) match the reference. Letter spacing per line was fitted so that the reference's own words reach the reference's widths in the default font. The reference font is unknown, so glyph shapes differ; the font is an editable field.

**Approximate, not identical:**

- the blur kernel, modelled as eight stacked, vertically shifted blurred copies;
- speed ramps, which change in steps between constant-speed pieces;
- colour, which is not graded.

## Frame rates

At 23.976 fps (the default when a Project holds 24 fps video, as the preview does), each time is rounded to the nearest Draft frame. All effect and overlay states are computed from absolute timeline time. Inside a retimed clip the effect's frame counter runs in source frames, so it is divided by the piece speed. The plan is contiguous, and gives identical repeat blocks, at 23.976, 30 and 60 fps (unit tests).

## Live runs (local Selects dev build, 2026-10-01)

| Run | Result | Cause and fix |
| --- | --- | --- |
| 1-2 | Placement readback failed | Shots 5 and 6 of the block use the same video. Contiguous source at the same speed made the editor join the two clips. A 0.1 s source gap vanished because start points snap to whole Draft frames, so the gap was raised to 0.5 s. |
| 3 | Finish step refused | The panel shell command is limited to 16 KB. Placements now travel as `[clipId, trackIndex]`, and frames come from the plan (about 2.9 KB). |
| 4 | Saved | The fade went to white, and the export stopped at 672 because export ends at the last video clip. The fade is now black, and the last shot runs to 699 under the opaque fade. |
| 5-6 | Saved | Subtitles were 35% too wide and phrase 2 too small. Weight, cap heights and letter spacing were refitted from the reference, and phrase 2 now grows. |
| 7 | Saved | Blur appeared on only 2 of 5 frames around a cut, because a retimed clip's frame counter runs at speed × Draft frames. Fixed by dividing by the piece speed. |
| 8 | Finish step refused, then saved | The subtitle words became editable graphic fields. `run_script` type-checks the editable-parameter list, and entries built with `.map()` widen `type` to `string`, so the entries are written out inline. |
| Preview | Saved at 23.976 fps | Six generated preview videos; export 559 frames (23.3 s). `preview.mp4` and `poster.webp` come from this export. |

## Selects Staging

The installed panel was run from the Apps tab in Selects Staging (2026-10-01) on a new Project with the six generated preview videos (24 fps, so the Draft is 23.976 fps). It saved on the first click.

- **Readback:** 114 video clips over frames 0-559 with no gaps, music over 0-559, the subtitle graphic at 0-120, the flash at 326-335 and the fade at 515-559.
- **Editable fields:** the subtitle graphic shows the Line 1, Line 2 and Phrase 2 word fields and the Font field in the Adjust panel.
- **Export:** identical frame for frame to the local develop build's export of the same videos (PSNR infinite on all 559 frames).
- **Blur cuts at 23.976 fps:** sharpness drops on four frames centred on each blur cut, and on the flash frames, and nowhere else in the block.

The gallery preview is made from this Staging export.

## Not yet verified

- The in-app chat path.
- Replacing a video inside a saved Draft. This is not supported; create a revised Draft instead.
