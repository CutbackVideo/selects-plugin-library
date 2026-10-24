# Report C-10: bundled music cannot cover the assembled range

The original report's two screenshots both show `Creating Draft` failing with
`Resource overlay simulation covered only part of [0, 321)`. A full current
`runCityTemplate` replay on 16 full-length replacement videos reproduced that
same stage, message and frame interval. The real SDK inventory, local FFmpeg shot
scoring, planner and bundled-music import ran without injected scene candidates.

The minimal repair requests explicit 1x playback speed for the music overlay.
This uses the existing SDK's exact target-range path. It preserves the cue,
section offset, shot plan, gain and fades. No SDK/application change is required.
Replaying the exact failed assembly script still fails without that argument and
saves with it. The complete template pipeline then also finishes its title,
bundled fonts and look, saves, independently reads back and exports a native MP4.

Verification: the 14 existing City package tests pass. The actual saved output
is 320 frames at 24000/1001 fps, 1080x1920, with title/look and music. The raw
coverage error's 321-frame interval comes from the implicit overlay path; the
explicit path preserves the authored range. Private evidence retains the
original screenshots, both complete runs and exact-script before/after replay.

The nonvisual runner executes the production template functions using real SDK
calls. Its plugin files/data directory is a task-private copy; installed gallery
UI, interactive playback, mixed-photo repetition and whole-video visual quality
remain distinct checks. Earlier alias-only/unit tests did not reproduce C-10.
