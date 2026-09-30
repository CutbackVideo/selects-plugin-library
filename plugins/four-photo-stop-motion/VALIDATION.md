# Validation

## Reference

A trending "stopmotion #closer" short-form template (30 fps, 347 frames, 1080x1440, 3:4), measured with ffmpeg:

- **Intro:** photo changes at frames 0, 5, 12, 17, 24, 28, 36 and 40.
- **Black pause:** frames 48–80.
- **Beats:** photo changes at frames 80, 98, 117, 136, 155, 174, 193, 212, 231, 250, 269, 288 and 307, in the repeating order A, B, C, D. That is one change every 18–19 frames (about 0.631 s, 95 BPM).
- **Outro:** frames 325–347.
- **Geometry:** every appearance of a photo is the same full-frame crop. Repeats of the same photo match each other at zoom 1.00 with no shift (about 40 dB between repeats).
- **Music:** a copyrighted vocal track, not reused. The black pause sits on the track's break. The drop lands at 2.667 s.

## Exactness check (same photos as the reference)

To isolate the format from the content, the plugin was run with the reference's own four photos. These were extracted from its sharp hold frames and used only for this local test; they are not in the package or the preview. The export was then compared with the reference frame by frame using PSNR. Higher PSNR means more similar, and 60 means identical.

A Project that also holds a 30 fps video gives a 30 fps Draft, so frames line up one to one.

Two baselines frame the numbers below:

- **Compression floor:** re-encoded identical stills score about 36 dB, so a sharp hold at that level is as close as encoding allows.
- **Ceiling:** the best any standard blur can reach. It is the Gaussian and shift that best fit each reference blur frame, applied to the reference's own sharp frame, computed for every blurred frame.

| Segment | 30 fps (dB) | Ceiling (dB) | Gap to ceiling (dB) | 23.976 fps, cut edges excluded (dB) |
| --- | --- | --- | --- | --- |
| Intro (48 frames) | 30.2 | 31.5 | 1.3 | 30.2 |
| Black (32 frames) | identical | – | – | identical |
| Beat hit, 3 frames × 13 | 27.2 | 28.0 | 0.8 | 27.1 |
| Sharp holds | 36.1 | floor ≈ 36 | – | 36.1 (min 34.4) |
| Outro (22 frames) | 44.0 | – | – | 44.5 |

Numbers are luma PSNR at 540x720.

**Result:**

- **Timing, crop, position, stacking, black pause and outro:** these match the reference. No frame falls below 26 dB; a cut that is one frame off drops a frame to about 10 dB.
- **Intro and beat-hit blur:** these are approximations of CapCut's own blur, not identical. The models tried were Gaussian, radial zoom, vertical motion, ring and pyramid. A Gaussian fits best: sigma 5 for the intro, and sigma 10 plus a 0, 0, +12 px shake for the hit.
- **Frame rate:** at 23.976 fps, the default for photo-only Projects, 9 of 277 frames sit on a cut edge. The Draft cut is rounded to the nearest 1/23.976 s, so for up to half a frame it shows the next photo before the reference cuts. Every other frame matches the 30 fps result. Beat-hit states are sampled by absolute time, so each rate shows the reference's state at that instant.

## Music

`assets/music.mp3` is a generated original; see `THIRD_PARTY.md`. It is intentionally different from the reference track, and its structure matches the format:

- the groove stops at 1.6 s into a reverb tail with the bass removed, darkening as it decays through the black pause, matching the reference's decay (for example 0.27 vs 0.27 of the pre-break level at 2.1 s, and 0.11 vs 0.11 at 2.3 s);
- a bright pickup hit 65 ms before the drop;
- the drop re-entering on a downbeat at 2.667 s.

After the drop, the nearest kick to each of the 13 beat cuts is within ±75 ms, alternating early and late because of the 3-3-2 kick pattern, with no drift.

## Live runs (local Selects dev build, develop 89996b58e, 2026-10-01)

| Run | Result | Cause and fix |
| --- | --- | --- |
| 1 | Saved on the first click | Generated photos, 23.976 fps. Blur looked off, so it was measured. |
| 2–4 | Saved | An extra `scale(1.04)` during blur (the reference has none) was replaced by a sharp under-copy. Blur values were refitted. |
| 5 | Saved | Exactness run at 30 fps. A zoom-blur hit model scored lower than a Gaussian, so it was removed. The outro gradient falloff was refitted from about 39 dB to 44–47 dB. |
| 6 | Saved | At 23.976 fps the hit lost its +12 px frame, and one hit lingered because of a clip start rounded 21 ms late. Hit states now use absolute time. |

| 7 (user correction) | Saved | The user heard that the break felt different: a linear volume fade kept the kick pumping. The break was rebuilt from spectral measurements of the reference. |
| 8 (user correction) | Saved | The user saw a black strip at the top during the shake. The +12 px shift uncovered the frame edge. Unshaken blurred layers now fill it, with no black strip and hit PSNR unchanged at 27.2 dB. A 1.7% zoom was tried first and scored lower (26.4 dB). |

Runs 1–6 were fixed by the agent; runs 7–8 were user corrections.

Panel runs broke when the whole app window was reloaded, because the host MCP server restarts. Navigating in-app avoids it.

## Selects Staging

Installed panel run from the Apps tab in Selects Staging (2026-10-01) on a new Project with the four generated preview photos. It saved on the first click at 23.976 fps. Readback: 21 Image clips at the planned frames, the outro graphic at frames 260-277 and the music across 0-277. The FHD export is bit-identical to the local develop build's export of the same photos (PSNR infinite on all 277 frames), both before and after the run 7–8 fixes. The gallery preview is made from the final Staging export.

## Not yet verified

- The in-app chat path.
- Replacing a photo inside a saved clip. This is not supported; create a revised Draft instead.
