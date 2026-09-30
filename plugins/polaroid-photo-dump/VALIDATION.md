# Validation

## Reference

A trending "polaroid photo dump" short-form template (1080x1920, 60 fps, 835 frames), measured with ffmpeg and librosa:

- A still instant-film frame on satin; only the photo in its window changes, with hard cuts at frames 21, 71, 122, 174, 224, 274, 326, 376, 428, 479, 530, 581, 633, 683, 736, 786 (17 photos, 0.85 s apart after a 0.35 s first photo). No other motion between cuts.
- The fabric, frame and photo zoom in together linearly: frame width 587 px at 1 s and 668 px at 12 s (1.27 %/s) about (543, 951), from left/right and top/bottom edges. The caption stays fixed at y 333-384.
- Music about 139.7 BPM; every cut falls on every second beat (median offset +13 ms).

## Choices

- Frame and satin: generated for this plugin with an AI image model; the green window was cut out to a transparent hole (527x685 at 277, 575). The frame image sits on the track above the photos, so the border overlaps each photo as in the reference.
- Music: from the team's saved CC0 candidates, "Lofi again" was closest in energy and brightness. Its chosen 13.9 s section (119.7 BPM, fitted) is time-stretched x1.179 so every second beat lands on the reference cut grid, then shifted 35 ms to match the reference beat-to-cut offset.
- Caption: user text; default font Helvetica Neue medium, white, soft shadow; the Inspector offers installed fonts.

## Automated checks

`node --test tests/polaroid_photo_dump.test.mjs` (9 tests): cut table and end frame typed from the reference; 23.976/30 fps conversion; zoom ratio against the reference frame widths; asset unpack (RGBA 1080x1920 PNG, AAC) with hash check; request validation; builder modes; the finish script against a mock Draft (18 cover transforms, 18 effects on one clock, photos bleeding under the frame border, one caption graphic, one music clip, one save); refusal without saving; and the panel's placement bridge on a fake timeline (photos first, frame last, stills held past their 120-frame source).

## Live run (local Selects dev build, develop 89996b58e, 2026-09-30)

Project: 17 generated photos in the reference's mood (summer friends, warm film look).

| Run | Result | Cause and fix |
| --- | --- | --- |
| 0 | PNG alpha probe | A transparent PNG Image clip placed above a photo shows the photo through the hole in export. |
| 1 | Finish script rejected by the run_script type check | Photo and frame layer objects had different shapes; the frame layer now carries the same fields. |
| 2 | Panel lost its SDK session | The app window was reloaded during testing and the host MCP server restarted; reopening the panel after the restart fixed it (host behaviour, seen before). |
| 3 | Saved on the first click | Draft 23.976 fps, 334 frames, 1080x1920. |
| 4 | Saved on the first click | After re-aligning the music (music-v2). Exported and compared below. |

Readback: 17 Image clips on one track at the converted cut frames, the frame Image clip for the whole Draft on the track above, one caption graphic, one music clip 0-334.

FHD export (1080x1920, 23.976 fps, 13.93 s) against the reference:

- 16 cuts found; cut times within ±20 ms; largest frame difference between cuts 3.5 (no flicker).
- Frame width grows 1.259 %/s (reference 1.27 %/s), centred at x 539.
- Cuts to detected beats of the exported audio: mean +3 ms, within ±26 ms except two at -51 and +41 ms (beat-tracker jitter; the reference itself measured up to +28 ms).
- First and last frames: the photo fills the window with no fabric showing at its edges; the caption is fixed and unzoomed.

All fixes were found by the agent; none was a user correction.

## Selects Staging

Installed panel run from the Apps tab in Selects Staging (2026-09-30) on a new Project with the same 17 photos: saved on the first click. Readback matched the local run (17 photo clips, frame on the track above, caption, music). FHD export measured the same: cuts within ±20 ms, zoom 1.259 %/s, cuts to beats as above.

## Not yet verified

- Driving the panel from the in-app chat.
- 60 fps Drafts (unit-tested only).
- Publication: PR, merge and anonymous download.
