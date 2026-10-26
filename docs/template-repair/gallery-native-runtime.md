# Gallery native runtime: repair in progress

> Current SDK-free decision: [sdk-free-compatibility.md](sdk-free-compatibility.md) supersedes the pending SDK/app prerequisites below. Historical code and validation records are preserved; they do not establish current installed-app acceptance.


This checkpoint extends the isolated SDK/Chrome evidence in
[gallery-render-contract.md](gallery-render-contract.md) with the real macOS
development app, its public SDK, SQLite repository, Driver and native exporter.
It does not close Gallery or the 28-template goal. Chan's apps remain excluded.

## Failure and owned fix

The earlier WASM browser repair was insufficient for native export. A saved
mixed Gallery exported successfully but failed 3,585 border observations across
341 decoded frames. These are observations, not 3,585 independent defects.
The native path captures authored effects into a Chromium atlas before the
native compositor places them. That atlas still used source-resolution pixels
and magnified them, spreading fractional crop edges into the intended gaps.

Client draft PR #7876 now also prepares native program presentation density.
`ProgramRasterDensity` reuses the WASM affine stretch calculation, accounts for
output size and visible animated placements, and repacks the existing atlas.
Source texel dimensions and affine coefficients change together, preserving
projected source points. Logical canvases, authored parameters, source clocks,
translations, temporal ranges and stack order remain unchanged.
`NativeProgramSurface` captures the extra texels with integer CSS zoom; inputs
at density one retain their original DOM structure. Predecessor effect programs
stay available on their original clocks. The existing texture budget rejects
oversized projections explicitly instead of silently reducing resolution.

A candidate change to the legacy overlay renderer did not change actual native
output and was removed. The repair targets `native-export-remotion`, selected
by the real native export path, rather than assuming all exporters use WASM or
the legacy overlay subprocess. No template coordinates or margins were widened.

Standalone client commit: `1005791a5d79ef14e412d9c6bee75278218e697a`.
Clean combined validation commit: `0e4f7a595095e826acfd8aa7d2edcaa507210ffe`.
All seven changed production source files match the tree used by the native
export runs. The combined checkout preserves the SDK prerequisites locally;
these commits are not a merged, installed or deployed release.

## Runtime evidence and precise limits

| Checkpoint | Observation | Limit |
| --- | --- | --- |
| Isolation | New disposable library, initially empty project list; public SDK import of 15 PNGs, six MP4s and one WAV | Synthetic media; user projects were not edited |
| Actual panel | Exact generated 0.3.18 panel; Music Off and selected tone with manual BPM 113 | No AI, natural music or bundled-music fallback exercised |
| Save | Two Drafts created; independent SDK readback verifies 21 video clips, with zero/one Audio clip | One 1080x1920 Project grid, 24000/1001 fps |
| Preservation | The second creation leaves the first Draft's metadata, clips, source identity, transforms and effects unchanged | Two operations in this isolated project |
| SQLite reload | Cold restart with the same isolated data root retains the project and both Draft IDs/names | Development app; installed-app persistence still open |
| Playback | Driver samples advance monotonically to frame 341 and stop at the end; OS screenshot shows the native 21-cell grid at six seconds | Not whole-video pixel or human audiovisual acceptance |
| Export | Native H.264/AAC Music Off and Music On outputs both succeed, 341 frames each | Workflow success alone is not pixel acceptance |
| Geometry diagnostic | Border maximum luma decreases from 130 to 21; observations above Y=20 decrease from 3,600 to 11 | Diagnostic only; not a substitute for the RGB gate |
| Existing pixel gate | Both fixed outputs have zero reveal/grayscale/selected-image-color failures, but 230 border observations exceed RGB maximum 16, down from 3,585 | Gate remains OPEN; no tolerance was relaxed |
| Audio | Music Off decodes to exact zeros; tone correlation 0.999924 and RMS ratio 0.999446 over 682,682 samples; peak 0.125672 | A tone does not establish natural music quality or audiovisual sync |
| Music isolation | All 341 decoded video frame hashes match between Music Off and Music On | One deterministic synthetic fixture |

The native backend is a separate OS surface. The existing preview screenshot
SDK captures Chromium, so its black image was not evidence of a black native
preview. The OS screenshot showed actual tiles. Preview Playground Replay
explicitly reports unavailable here. No sandbox was weakened to obtain an image.
The formal E2E repository was unavailable locally; no E2E-suite pass is claimed.

## Codec control: do not manufacture a green pixel verdict

The follow-up now captures the actual native compositor's BGRA bytes immediately
before FFmpeg. The same persisted mixed Draft at pre-density client `b87220fea`
has 3,600 unencoded border observations above RGB 3, with a maximum of 141.
At fixed combined client `0e4f7a595`, all 341 frames pass the unencoded point
contract: every sampled gap is exactly RGB zero. Music Off and Music On both
pass and all 341 raw frame hashes match. Reveal, grayscale and Image-color
checks pass too. This covers the declared points, not every pixel in the picture.

The observer forwards the original bytes unchanged to the real encoder and
stores a bounded-memory lossless gzip archive. Reencoding each before/after
archive outside the app verifies every raw frame hash first and uses the exact
recorded encoder arguments, changing only the new output path and refusing
overwrites. All 341 decoded video frame hashes match the corresponding actual
app export in both phases. Observed outputs also match the earlier unobserved
exports, so this instrumentation did not change the delivered video.

The old encoded RGB-16 gate still reports 3,585 before and 230 after. Every
post-fix failure was exactly black at that point before encoding and is
reproduced identically by the independent encoder replay. The 230 observations
therefore arise downstream of native composition in this fixture; they are not
remaining source-raster failures. The raw RGB-3 and encoded RGB-16 counts have
different thresholds and must not be interpreted as identical bug counts.
The old failure reports and their thresholds are retained rather than relabeled
as passes. Full delivered-picture and audiovisual quality still require acceptance.

An independent exact four-pixel-gutter RGB grid is black at every tested gap.
The native encoder's RGB-to-YUV420/BT709 filter alone produces four RGB maximum
16 failures among 18 horizontal samples, before H.264 encoding. Black luma
remains Y=16, while neighboring chroma contributes reconstructed RGB color.
This demonstrates that the original RGB gate can fail a correct gap after
subsampling. It does not prove every residual in native output is harmless.

This earlier ideal-grid control alone was insufficient to attribute every real
residual. The actual BGRA capture and byte-verified encoder replay above now
provide that causal evidence for all 230 observations in the fixture. Neither
RGB tolerance nor Gallery's gap widths were changed. Original-reference,
changed-input and complete encoded-image quality are still separate gates.

## Reproduce the pre-encode observation

`tools/observe_native_export.py` is an optional POSIX development diagnostic,
not installed panel code or a new runtime feature. Prepare a private JSON with
an absolute real `encoder` path, existing `directory`, unique `tag`, actual
`sourceRevision`, the independent `reference-oracle.json` as `oracle`, original
fixture photo RGB values by one-based slot as `originalColors`, and the expected
341 frames. It deliberately requires the declared 1080x1920 Gallery fixture.

Place a private `ffmpeg` symlink to this executable tool in a private directory.
Set `SELECTS_NATIVE_OBSERVER_CONFIG` to the JSON and prepend that directory to
PATH only for the owned isolated dev-session launch. Ordinary FFmpeg calls exec
the real binary with the same literal arguments and unread stdin. Do not edit
global PATH or replace an installed encoder. Export through the real panel/SDK;
the observation directory contains `report.json` and `frames.bgra.gz` per run.

Replay to a new, absolute output path:

```sh
python3 tools/observe_native_export.py --reencode /absolute/private/run/report.json /absolute/private/control.mp4
```

Compare all decoded video frame hashes with the real app export, preserving
the encoded and unencoded observations separately. The tool verifies raw hashes
and never overwrites a control output. Restore the owned app with its normal
environment afterward; this was done and its saved Drafts were reobserved.
Windows capture/replay and complete natural-content quality are not claimed.

## Tests, compatibility and remaining work

Focused projection/surface tests pass eleven cases, including property-based
affine geometry and layout invariants, animation/hidden ranges, predecessor
clocks, shared program density, idempotence and explicit texture-budget failure.
The related regression run before the final two additional controls passed
299 cases in 35 files. The separate WASM browser regression passes 19 tests in
five files after moving the unchanged affine calculation to the shared module.
Final client commit `1005791a5` passes its normal pre-push hook: both TypeScript
targets, all three ratchets and 38,950 unit tests (38 existing skips; 4,055
passing files and five skipped files). No hook was bypassed. The 19 browser
tests are a separate run, not added to the unit count. The client branch reports
no remote checks; this is not a remote CI pass. Library #300's prior probe
checkpoint passed both remote jobs; the new documentation checkpoint's jobs
are pending and must be tracked separately.

This is a renderer producer/consumer change. The unchanged native host forwards
program metadata opaquely into the matching renderer assets; the Rust scene
uses existing atlas dimensions and affine fields. Old payloads default to
density one. The forwarding implementation was also checked at the current
minimum host source (2.0.632). No new IPC operation, native implementation,
capability gate, SDK method, package-version bump or minimum-policy change is
required by this extension. This source compatibility check is not Windows
runtime evidence. More density requires more raster memory; large-media and
maximum-texture behavior beyond the explicit budget guard are unbenchmarked.

The library module pool remains five features and ten registered consumers;
Gallery's runtime version remains 0.3.18. The extra shared raster code belongs
to the client's existing renderer, not a duplicate template feature. The new
observer/replay tests first failed, then all eight passed; the full Python suite
runs 299 cases (293 pass, six existing skips). Public-source, package-file and
five-module/ten-consumer sync checks pass. Client production code is unchanged
from its fully checked commit; its full suite was not rerun just for tool/docs.
Remaining gates include full native image-quality acceptance, installed app, Windows, Inspector,
whole-video/audio quality, original-reference reproduction and changed-input
quality, plus all other unresolved template contracts.
