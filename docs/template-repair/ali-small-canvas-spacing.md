# Ali small-canvas graphic spacing

The same saved Korean list renders three chips in one row at 1080x1920, but wraps
2+1 at a real 540x960 canvas. Fonts already scale with width; chip padding, gaps,
title margins and underline lengths previously stayed in full-size pixels. The
second row moves the underline down across the face.

The GRAPHIC consumer now expresses these fixed layout lengths in the existing
1080-width coordinate scale. It preserves text, font policy, colors, timing,
camera transforms and the separate CAPTION program. The existing 1080 output is
exactly unchanged. Motion translations and shadows are unchanged; no crop or
face-placement redesign is included.

The whole-panel / whole-program regression compares the retained production
1080 renderer with the candidate for list, headline and note scenes at seven
animation phases. Further checks cover small chip furniture, title/body spacing,
underline geometry, and unchanged animation/camera policy. Before the change,
three of these five tests fail; after it, all five pass.

A separate headless Chrome measurement of the genuine reported list confirms
2 rows before and 1 after at 540, with the underline moving from y=414.625 to
294.625. The same measurement at 1080 is identical before and after. This is an
independent browser fixture, not evidence of app-native rendering, saved-Draft
playback or export. Those remain separate validation steps on original-preserving
copies of the genuine saved plan.
