# C-31: preserve Cinema's card size for portrait footage

Cinema's inset intentionally occupies 19%, 51%, or 79% of the output width.
Its effect is rendered in source-image coordinates, however. The old CSS
percentage was relative to those coordinates: portrait footage first shrank to
fit the landscape output, and its inset shrank again. In a real export the first
portrait inset's picture was only about 40 by 67 pixels at 1920 by 1080 output.

The consumer now reads the selected card sources' existing `frameSize`, computes
the output card dimensions, and divides by the source's contain-fit scale before
rendering. Its black background, centered 16:9 card, 19/51/79% design, shadow,
source aspect ratio, timing, clips, music, and sound effects stay intact. Unknown
or contradictory source dimensions are rejected before creating a Draft.
There is no new SDK capability or app/shared-module change.

## Verification (2026-10-23)

- Geometry regressions cover portrait, landscape, square and 4K sources at all
  three card percentages, nested/paged public source files, and missing or
  conflicting dimensions. Together with the existing assembly/fps regressions,
  22 Cinema tests pass. The combined Cinema and Thank You run passes 37 tests.
- The same substitute videos in the same Project produced full before/after
  Drafts and native exports. Both portrait exports decode without errors.
- Independent SDK captures after the test environment was restored show the
  first portrait picture increasing from 20 by 33 pixels to 61 by 108 pixels
  in a 960 by 540 saved-timeline composite. The 1920 by 1080 native exports
  independently show the enlargement. A color-pixel threshold gives 40 by 64
  before and 116 by 206 after; this measures the picture, not the invisible
  black card or its gray shadow. The 19% card box is 364.8 by 205.2 output pixels.
- The media really is portrait and continues to fit inside the landscape card.
  Enlarging it to fill the screen would be a separate design change.
- The same landscape input was exported before and after. Actual composite
  images at 7.4, 7.8, and 8.25 seconds are pixel-identical (100% identical
  pixels; mean absolute channel difference 0). Both files decode without error.
- Foreground editor playback is a separate coordinating-agent gate. Native
  exports/captures do not stand in for successful foreground playback.

Private verification bundle: `reported-cases/round3/photo/`.
Relevant files: `C31-sdk-before-after-bounds.json`,
`C31-after-export-quality.json`, `C31-export-colored-source-bounds.json`,
`C31-actual-before-after.jpg`, `C31-landscape-quality.json`,
`C31-landscape-before-after.jpg`, `cinema-after-readback.json`,
`cinema-after-export-status.json`, `C30-C31-final-tests.log`.
Before Draft: `f3417396-7bdd-4129-b85b-a823411d2529`.
After Draft: `22074243-9bcc-484a-a4c2-cb19bd8a7206`.
After export workflow: `ce8d06ed-45df-4c1d-ae4a-66a8f61b9159`.
