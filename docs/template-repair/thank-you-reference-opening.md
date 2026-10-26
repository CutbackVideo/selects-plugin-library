# C-30: align Thank You with its shipped preview

The default authoring schedule included 15 opening bass-roll cuts and used the
bundled song from 0 seconds. The shipped preview instead starts on the held hero
shot, with the song beginning at 5.25 seconds. This was a real reference mismatch,
not an issue requiring an SDK change.

The consumer now starts on the same hero and shifts the remaining schedule,
titles, and music source offset together by 5.25 seconds. The hero holds for
3.3 seconds, so the input's minimum duration and preparation instructions now
consistently require 3.4 seconds. Input roles, chosen order, canvas, fonts,
source-audio muting, commit behavior, and bundled asset bytes are preserved.

## Verification (2026-10-23)

- A new regression failed on the previous code; 15 timing/fps tests and 9 Windows
  static tests pass. These cover available music after the source offset and
  retain failure handling for insufficient/unknown media readiness.
- The same substitute videos and Project were used before and after. Both full
  authoring runs saved real Drafts; the after Draft has 49 cuts, 495 frames at
  24 fps (20.625 seconds), matching the preview's video frame count and duration.
- Native export succeeded before and after. The after file decodes fully without
  error. Its audio starts at bundled-source 5.250 seconds (normalized correlation
  0.999873); the shipped preview aligns with the after export at 0 seconds
  (correlation 0.998060), rather than the previous 5.25-second displacement.
- Exported composite images at 0, .083, .5, 3.25, 3.5, and 6.65 seconds confirm
  hero-first opening and title/transition timing. The substitute footage differs
  from the preview; this is timing/layout verification, not pixel reproduction.
- Foreground editor playback is a separate gate handled by the coordinating
  agent. An initial renderer initialization failure is retained separately and
  is not reclassified as a successful playback because export succeeded.

The private verification bundle is stored under `reported-cases/round3/photo/`.
Relevant files: `audio-alignment.json`, `C30-after-quality.json`,
`C30-reference-after-timing.jpg`, `thankyou-after-saved.json`,
`thankyou-after-readback.json`, `thankyou-after-export-status.json`,
`C30-red.log`, `C30-tests-final.log`, `C30-windows-static.log`.
After Draft: `faf0c053-8a8d-47fd-9cbb-85c4769bf876`.
After export workflow: `a524f0ad-46e8-4b8a-bfa5-8d2e2034a680`.
The earlier lock-contention attempt did not dispatch an export and is retained
as harness evidence, separate from the successful retry.
