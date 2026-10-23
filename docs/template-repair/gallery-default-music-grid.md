# Gallery bundled default on the Project frame grid

The actual 21-tile run failed before authoring with the untouched defaults:
853 reference frames, bundled music, 113 BPM. At 24000/1001 fps that request
rounded to 341 Project frames (14.222542 seconds), beyond the pinned music's
14.216667 seconds. The physical-duration guard correctly refused the request.

Only the untouched bundled default now ends on a complete Project frame inside
the existing excerpt. The panel displays the settled length. Explicitly edited
lengths, including an explicitly re-entered default value, retain strict refusal
when too long. Music Off and another Project track preserve their requested
duration. The template-run defaults opt into the same calculation. The shared
planner/asset guards, asset bytes and SDK/application code are unchanged.

The source reference clock still uses integer 60 fps frames. At a higher Project
rate, not every Project frame is representable by that clock; the calculation
keeps the largest representable duration covered by the excerpt.

## Verification

- Four default interaction regressions fail before the repair and pass after it
  at 24000/1001, 30, 50 and 90 fps. Two explicit-length controls still refuse
  before import/save, including re-entering 14.217 seconds. Another-track and
  existing Music Off regressions preserve the original requested length.
- 230 scoped package/assets/run tests pass; the existing standalone physical
  shortage tests remain unchanged.
- Actual SDK creation of 15 owned photos extracted from natural footage and six
  independently prepared natural-video substitutes: before, bundled-default
  preparation fails without a Draft; after, the same default choices save and
  independently read back 21 tiles in Draft
  `18da6af1-e3fa-4562-9e27-431b08d0a034`, Project
  `d447b7d3-8bd3-4ac9-82b5-edb92abb1f8f`.
- Native export succeeds at 1080×1920, 24000/1001 fps, 340 frames, 14.181 seconds
  in the container, with video/audio streams and zero full-decode errors.
  Playback and perceptual music acceptance remain separate.

Evidence is under `reported-cases/round3/photo/`: `gallery.log` retains the
before failure, `gallery-after.log`, `gallery-saved.json`,
`gallery-readback.json`, `gallery-export-status.json`,
`gallery-export-probe.json`, `gallery-full-decode.log`,
`default-music-red.log` and `default-music-tests-final.log`.

This repair does not close the separate face-crop complaint C-33. A real
edge-positioned face disappears under the existing centered cover crop in the
actual export. A manual focus comparison has saved successfully; its export
attempt was refused by the existing disk-space preflight (1.9 GB available,
about 2.0 GB required). No unrelated files were removed.
