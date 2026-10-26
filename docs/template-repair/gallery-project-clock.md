# Gallery Project clock and physical media coverage

Photo Grid Reveal (`photo-gallery-no2`) 0.3.16, based on
6613922096f57339c1ee74c8e361036145deeeec (draft PR #293). The full 28-template
repair goal remains active. Chan's shortform apps and template packs are excluded.

## Root cause and evidence

The input duration uses a 60 fps reference clock. Project output frames use
`round(referenceFrames * ProjectFps / 60)`. Preparation previously used the
unrounded reference duration, while inventory discarded exact source seconds
after rounding them to reference frames. These are different quantities.

For the default 853/60-second input, 30 fps output is 427 frames (14.233333s),
50 fps is 711 frames (14.22s), and 90 fps is 1280 frames (14.222222s). An
853-frame 60 fps held file is only 14.216667s. An isolated real SDK, renderer
bridge and Storyboard probe placed exact Project intervals but returned source
windows beyond the physical source end on those three grids; four controls
(25, 30000/1001, 60, 120 fps) did not overshoot. This demonstrates a source-window
bound violation, not a reproduced installed-app playback/export failure.

## One planner, separate clocks

- The existing Gallery format module is now included in the generated panel as
  well as the SDK/agent operation builder. No new pool feature or client SDK is
  added. Existing shared asset ownership, input, authoring and run features stay.
- The planner keeps reference frames, Project frames and physical source seconds
  separate. Its preparation result covers the actual Project duration with whole
  60 fps frames (854 at the three affected grids). The reference request stays
  853, so no second conversion or changed output timing is introduced.
- Inventory retains exact seconds, preserving the existing file-tree-first
  metadata precedence. Fresh selected Video/Audio requires valid exact seconds;
  caller durations cannot replace Project facts. A sub-reference-frame Video
  remains valid for preparation even when its rounded reference count is zero.
- Preparation permits short Videos, then final planning rejects insufficient
  sources. Held import checks exact seconds again, including existing imports.
  The previous conservative full-output coverage policy for every Video remains.
- Known BPM, timing, count, dimensions, focus, source and music constraints are
  checked before bundled music/video work. Automatic BPM has an explicit pending
  preparation state with no usable final reveal/color plan; it must pass the full
  plan before Video preparation or Draft dispatch. No implicit nominal estimate.
- Music must cover its source offset plus actual Project seconds. It is never
  padded, looped or sped up. The pinned excerpt remains incompatible with the
  default output at 30/50/90 fps; choose silence, a longer track or an explicitly
  shorter duration. Unsupported inputs fail before Draft persistence.
- Frame-only standalone format callers retain their reference-clock contract;
  live SDK input paths require exact metadata. The 36000 prepared-frame limit is
  explicit. A Project grid needing more cannot silently publish a shorter file.

## TDD and limits

The initial new library suite failed 17 cases with six passing controls on the
parent. A separate sub-reference-frame case also failed before its correction.
Tests cover seven grids, exact vs rounded Video/Audio durations and music offsets,
normal/minified complete panels, early option rejection, actual held-file frame
counts and decode, and Project-source import readback. React tests trace a first
Video tile through a 854-frame encode/import and final 853-reference-frame request.
Original cache, input, run, bundled-music and complete-authoring suites remain.

Local verification: 31 added cases (24 timing/compiled/real-file, six React and
one held-import readback), 309 Gallery CI-vector tests passing, 1296 broader
related Node tests passing, and 285 Python tests passing with six existing skips.
The six new React cases also fail against the parent panel source. Public source,
28-template pre-push, 48 packages, five modules/ten consumers, six local SDK
copies, 47 app guard bundles and whitespace checks pass. These counts describe
automated coverage, not completion of all template repairs.

Prepared-source SDK/renderer/Storyboard probes pass all seven grids with zero
repository saves; real ffmpeg tests independently confirm physical coverage on
30/50/90 fps. These fixture scopes do not prove installed Selects, Windows,
Inspector, whole AV/playback/export, reference reproduction or changed-input
semantic quality. BPM job lifetime and late Video/Audio source changes remain
separate open work; this is not a full Gallery or 28-template completion verdict.
