# Validation

## Reference

A trending travel vlog short (a CapCut template screen recording, 30 fps, 468 frames, 9:16), measured with ffmpeg on a 432x768 crop of the recording:

- **Cuts:** every cut frame listed in `SKILL.md` was read from frame differences. The hero, both grids and montage 2 were checked frame by frame on contact sheets.
- **Grids:** each panel is exactly one quarter of the frame (216x384 of 432x768), with no border, gap or animation.
- **Title:** a condensed bold word 58 % of the frame wide and 14 % high, centred, #F4C711, with the people in front of it.
- **Fade:** the per-frame fade level (each frame regressed on the last unfaded frame) is linear from frame 449.45 to 463.7 (least-squares fit, rms 0.01), onto a near-black RGB 5.5, 4.2, 3.6 that holds to the end.
- **Colour:** no global tone curve (full 0-255 range); each slot has its own look. `color-targets.json` holds each slot's RGB mean and spread, measured only on frames where that slot is fully visible, with the same 64-pixel-wide pipeline the plugin uses on the user's clips.
- **Music:** a copyrighted track, not reused. Continuous at about 89.4 BPM; the recording's cuts sit 60-120 ms after its beats because of screen-recording lag.

## Exactness check (same videos as the reference)

To isolate the format from the content, the plugin was run with the reference's own footage: each slot's segment was cut from the reference, scaled to 1080x1920 and used as that slot's video, and the hero photo and a hand-made people mask came from the hero frames. These inputs were used only for this local test and are not in the package or the preview. The export was then compared with the reference frame by frame using PSNR (luma, 432x768). Higher is closer; 60 means identical.

The test inputs cap the score: a segment cut from a 432x768 screen recording, upscaled and re-encoded, is itself only 46-50 dB from the reference on the long shots and 27-34 dB on the 3-6 frame montage shots.

| Segment | Colour strength 0 (dB) | Colour strength 1 (dB) |
| --- | --- | --- |
| Black (0-12) | 50.9 | 50.9 |
| Montage 1 | 32.2 | 32.3 |
| Hero | 38.6 | 37.7 |
| Hero with title | 29.0 | 28.9 |
| Video 12 | 40.6 | 30.9 * |
| Grid 1 | 38.6 | 35.5 * |
| Video 17 | 41.3 | 32.0 * |
| Grid 2 | 39.3 | 37.1 * |
| Video 22 | 40.6 | 43.8 |
| Video 23 | 40.6 | 45.1 |
| Montage 2 | 39.2 | 40.9 |
| Video 26 | 38.6 | 40.6 |
| Fade | 21.3 ** | 21.4 ** |
| Ending | 36.1 | 36.0 |

**Result:**

- **Timing, crop, position and stacking match the reference.** With colour off, every export frame matches the input frame it should show at 40-41 dB, and no frame matches the next input frame better, so there is no frame offset. After removing a single brightness gain and offset, video 12, 17 and 22 match their inputs at 47-50 dB, the same as the input's own round trip. The best pixel shift against the reference is 0, 0.
- **Colour:** at strength 1 the clean slots move closer to the reference than the ungraded clip (video 22 40.6 → 43.8 dB, montage 2 39.2 → 40.9 dB, video 26 38.6 → 40.6 dB).
  - \* Video 12 and 17 score lower at strength 1 only because of the test inputs: they were cut from the reference with grid panels already over them, so their measured colour includes the grids. Measured on their grid-free part, their correction is the identity (gain 1.00 ± 0.004, offset ≤ 0.007).
  - The hero's correction is also the identity (gain 1.00, offset -0.002); its 0.9 dB drop at strength 1 comes from rendering through the colour filter itself.
- **Fade:** ** the fade level matches the reference within 0.04 on every fade frame (0.01 rms from the fit), and frame mean colour stays within 3 levels. The ending colour is within 1.6 levels on each channel, the closest 8-bit video allows near black. PSNR is low only because the test's video 26 input ends in held frames, while the reference's clip keeps moving under the fade.
- **Title:** the glyph shape is the closest system condensed font (Impact, horizontally scaled to the reference's word shape), not CapCut's font. Its box matches the reference (mask IoU 0.82; about 0.85 is the limit between the two fonts).

## Song fitting

The plugin bundles no music; it fits the format to the user's song (`analyze.mjs`). Checked on the reference's own song, a popular funk song with a different groove, and a CC0 disco track, all through the panel in a local develop build (below):

- **Same song as the reference:** the analysis finds 89.8 BPM (reference 89.4) and opens montage 1 on the song's drum roll. The resulting cuts are within one frame of the reference's: montage 1 at 12, 16, 19, 22, 26, 29, 32, 35, 38, 42, 49 against 12, 16, 19, 22, 25, 28, 32, 35, 38, 42, 48; the hero at 55 and the section cuts at 102, 182, 263 and 343, the same as the reference. The Draft is 468 frames, like the reference.
- **Hit accuracy in the export:** every planned cut is in the exported video, and each cut that sits on a hit is within 19 ms of it in the exported audio (38 ms on the funk song). Cuts where the song has no hit fall on the 16th-note grid instead (2 of 36 on the reference's song, 9 of 36 on the funk song, none on the CC0 track).
- **Length:** the funk song (111 BPM, 1.0 song beat per reference beat) gives a 383-frame Draft; the CC0 track (128 BPM, 1.5 song beats per reference beat) gives 494 frames. A sweep of tempos from 75 to 150 BPM with random hits keeps every shot within its promised length (test).
- **Audio timing:** an AAC file's first frame can start after 0 (48 ms on an iTunes m4a). The song is decoded on the file's timeline, so the analysis and the cut song section agree; before this fix every cut landed about 1.5 frames before its hit.

## Live runs (local Selects dev build, develop 89996b58e, 2026-10-01)

| Run | Result | Cause and fix |
| --- | --- | --- |
| 1 | Stopped before the Draft | The `run_script` type check rejected the generated script. Its inputs are now declared `any`, and missing framing keys are filled. |
| 2 | Partial Draft | Colour measurement ran after the Draft existed and failed on a still. Measurement now runs before the Draft is created, and stills are read as one frame. |
| 3 | Saved | The export was 465 frames because the trailing black was a gap. An ending graphic now holds the last frames. |
| 4 | Saved | The title was 5 % too narrow and 4 % too short. It was calibrated on an export (mask IoU 0.74 → 0.82). |
| 5 | Saved | The fade ran onto pure black and one frame late. It now fades the clip onto the ending colour inside its effect, with its timing and level fitted to the reference per frame; the ending colour was calibrated through export. |
| 6 | Saved | Colour targets had been measured at a different resolution, which raised contrast on every slot. They were remeasured with the plugin's own pipeline. |
| 7 | Direct tool test | On the preview's hero photo (two people about a fifth of the photo high) Vision person segmentation returned an empty mask without an error, which would have left the title over the people. The tool now segments a padded crop around the people Vision detects and stops with "No person found" on an empty mask. |
| 8 | Preview review (user) | In the preview the title showed through the left person's white shirt: plain person segmentation dropped light clothing against the bright sky. The tool now uses person instance masks on the whole photo plus a crop around the detected people, which keep both people, their clothing and hair; a detected person is required, so a frame-like shape in a photo without people no longer produces a cutout. |
| 9 | Song input (reference song, funk song) | Saved with the user's song. Cuts landed 45-52 ms early and montage 1 had a 7-frame gap on the reference song: the decode dropped the AAC start offset, and a hit detected twice pushed a real roll hit out. Both fixed; results above. |
| 10 | Preview (CC0 track) | Saved; montage 1 skipped hits mid-roll because the song had 15 hits for 11 clips and the strongest were kept. Montage 1 now follows the roll in order from its first hit, and only its last shot stretches. |

The panel also skips media it created itself (the cutout) when it picks the default hero photo.

## Preview run (local develop build, 2026-10-02)

On a new Project with the 26 generated preview clips, the generated hero photo and the CC0 song, the panel saved on the first click (30 fps, 494 frames, default colour strength 0.7). Readback: 35 video clips in slot order, the hero and the people cutout above the title graphic, the ending graphic and the song section from frame 0. In the export all 36 planned cuts are present, each within 19 ms of a hit in the audio, and the people stand in front of the title. `preview.mp4` and `poster.webp` are made from this export.

## Selects Staging (2.0.519, 2026-10-01)

Installed panel run from the Apps tab on a new Project with the same preview media. It saved on the first Create click at 30 fps. Readback matches the local run clip for clip. The FHD export is pixel-identical to the local develop build's export on all 468 frames; the audio has the same length and timing (no offset) and differs only by encoding. `preview.mp4` and `poster.webp` are made from the Staging export.

The first "Load Project media" right after the app restarted and opened the Project failed once inside the host's script runtime (`Cannot read properties of undefined (reading 'reduce')`); the identical script succeeded seconds later. The panel now retries the read once before reporting an error, and the updated panel loaded the media in Staging.

## Not yet verified

- The in-app chat path.
- Replacing a video inside a saved clip. Create a revised Draft instead.
