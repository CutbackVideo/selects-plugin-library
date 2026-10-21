# Validation

## Current repair checkpoint: 0.1.18

The shared run feature now checks hashing/text codecs and callable new-claim
capabilities before asset work or authoring. Saved recovery needs no new UUID or
SDK file writes. The four-consumer regression is recorded in
`docs/template-repair/polaroid-run.md`; this changes no design or receipt format.
Installed-app, actual Windows, full Inspector/AV/export and changed-input quality
remain unverified. Client #7828 is still a prerequisite before publication.

## Default layout = Semin's reference Draft (0.1.7, 2026-10-12)

Since 0.1.7 the plan is Semin's hand-finished Draft "Camera shutter dump" (Staging project CLIP HIGHLIGHTS UPDATE; 25 fps, 250 frames, 720x1280), not the 30 fps measurement below: photo starts 3, 22, 39, 58, 74, 91, 111, 130, 150, 165, 184, 201; shutter sounds 3 frames earlier, 11 frames each; her tile sizes and positions (crop focus starts at 0.5: her focus points were for her own photos); no crop on photos 11-12; the app's Burst and Text graphics at 216-250 with her parameters and component code, except that the title text is the Project name instead of her "Lake District / Memories". Other frame rates scale every frame by round(f*fps/25). `node --test tests/camera_shutter_dump_semin.test.mjs` runs the real finishing script on a fake Draft with every default and diffs it against `tests/fixtures/camera_shutter_dump_semin.json` (clips per track, transforms, effect names and parameters, graphic parameters and code, sound placements): zero differences outside those two intentional ones, which the test checks separately. Not yet run in the app.

The sections below describe the earlier 30 fps layout (0.1.6 and before).

## Reference

A trending "camera shutter dump" short-form template (30 fps, 279 frames, 718x1280), measured with ffmpeg:

- Photo cut frames 17, 41, 61, 83, 103, 124, 148, 170, 193, 213, 234, 255. Every photo stays to the end, above earlier photos, on black. Hard cuts; no motion, border, rotation or transition.
- Tile rectangles from the changed region at each cut. Tiles that bleed off-canvas keep a 3:4 (slots 1-10) or 4:3 (slots 11-12) size from their visible edges.
- Audio: no music. Each shutter is the same sound: four ~4.7 kHz autofocus beeps, a mirror clack and a shutter click; first beep to main click is 374 ms in every event. First-beep frames 7, 30, 50, 73, 92, 113, 137, 159, 183, 202, 224, 245.

## Automated checks

`node --test tests/camera_shutter_dump.test.mjs` (9 tests): the plan's frames equal the reference table above (typed independently, not read from the plan); 24 and 60 fps convert to the same times; slot shapes; sound unpack in `/bin/sh` and zsh with only system tools on PATH (no Node.js), with hash check, reuse and repair; request validation (exactly 12 photos, all sounds, reference placements, independent clips); the panel builds the finishing step itself and contains no Node.js call; the finish script against a mock Draft (12 transforms, 12 crop effects, 12 sound overlays at the beep frames, one save); refusal without saving when clips moved; and the panel's Image placement bridge on a fake timeline (holds longer and shorter than the 120-frame still source; reverting the `sourceDuration` fix makes it fail).

## Live run (local Selects dev build, develop 89996b58e, 2026-09-30)

Project: 12 imported JPGs with mixed shapes (3:4, 16:9, 1:1, 4:5, 4:3) to check cropping into each slot.

| Run | Result | Cause and fix |
| --- | --- | --- |
| 1 | Draft grid check failed | New Drafts default to 23.976 fps, not 30. The plan now converts reference times to the Draft's frame rate. |
| 2 | Image clip hold failed | A still's source is 5 s; slot 1 holds for 8.7 s. The placement passes `sourceDuration` (as Photo Grid Reveal does). |
| 3 | "Source range exceeded" | Shortening clips below 5 s with a smaller `sourceDuration`. Now `max(target, current)`. |
| 4 | Sound overlay rejected | At 23.976 fps the rounded-up sound range (0.50 s) exceeded the 0.467 s file. The range is now rounded down. |
| 5 | Panel lost its SDK session | App window was reloaded during testing and the host MCP server restarted; reopening the panel fixed it. Host behaviour, not the plugin. |
| 6 | Saved | Draft 23.976 fps, 223 frames, 720x1280 (exported and compared below). |
| 7 | Saved on the first click | After padding the sounds to 0.5 s (`shutter-v2-*`, so a 14/30 s range at 30 or 60 fps stays inside the file) and adding the bridge unit test. Same readback as run 6. |
| 8 | Template run: "still adding its sounds" on every retry (2026-10-01, Staging 2.0.533) | Selects now skips media shorter than one second on import (cutback-client #7027), so `importFiles` returned no ids for the 0.5 s sounds. The sounds are padded with silence to 1.2 s (`shutter-v3-*`; the first 0.5 s is sample-identical to v2), and a skipped import now reports itself instead of asking for a retry. Not yet re-run in the app. |

All six were found and fixed by the agent; none was a user correction. The final run was a fresh panel run from Load to Save.

Readback of the saved Draft: 12 Image clips, each on its own track, starting at frames 14, 33, 49, 66, 82, 99, 118, 136, 154, 170, 187, 204 and ending at 223; 12 Audio clips starting at 6, 24, 40, 58, 74, 90, 109, 127, 146, 161, 179, 196.

HD export (720x1280, 23.976 fps, 9.30 s) compared with the reference:

- 12 cuts found; cut times within ±17 ms of the reference.
- Tile visible edges within 1 px of the plan (two edges where a dark photo meets black were not measurable by frame difference; checked visually).
- New photos stack on top of earlier ones; 16:9, square and 4:5 inputs fill their slots without letterboxing.
- First autofocus beep onsets within 36 ms of the reference.

## Second content set (generated photos)

Twelve new photos generated to the reference's mood (35 mm film street snapshots in warm afternoon light; 10 portrait 3:4 and 2 landscape 4:3; not copies of the reference photos) in a new Project. The panel saved on the first click. Readback matched run 6 (Image resources r0-r11 in slot order). HD export: 12 cuts within ±17 ms, all 12 tile edges within 1 px of the plan, first-beep onsets within 36 ms. The export's small periodic frame differences fall exactly on its H.264 keyframes (every 12 frames), so they are compression changes, not motion.

## Selects Staging

Installed panel run from the Apps tab in Selects Staging (2026-09-30) on a new Project with the generated photo set. Saved on the first click; new Drafts there also default to 23.976 fps. Readback: 12 Image clips on 12 separate tracks at the planned frames and 12 shutter sound clips. HD export measured the same as the local run: cuts within ±17 ms, tile edges within 1 px, first-beep onsets within 36 ms.

## Not yet verified

- 30 and 60 fps Drafts (unit-tested only; both apps create 23.976 fps Drafts).
- The panel's "continue partial Draft" path after a failure.
- Replacing one photo inside a saved clip is not supported (scale and crop are sized for the original photo); SKILL.md says to create a revised Draft.
- Driving the panel from the Selects in-app chat as SKILL.md describes.
- Publication: PR, merge, and anonymous download.
