# C-15: output canvas follows selected footage

The Whip cut and Motion graphics template entry point passed the unrelated open
Draft's canvas into a new opening. All landscape footage could therefore produce
a portrait opening when a portrait Draft happened to be open.

The reader now selects the first usable selected video's SDK `frameSize`, in
selection order. Metadata is fetched concurrently, but the existing ordered
`Promise.all` results are inspected in input order. The caller omits the unrelated
Draft ID for these two variants. The existing assembly path sets the chosen canvas
before saving. No SDK or application code changes are needed.

`resource.meta().frameSize` is the analyzed sequence's display size (the SDK shapes
`sequence.getFrameSize()`); it is not the raw codec width and height. Do not apply a
second rotation. An unreadable/short source is still skipped, and source-pool
ordering, scene choice, reference timing, effects, graphics and music remain as
before. Funny quotes and the manual panel retain their prior canvas behavior.

## Repeatable offline checks

- `node --test plugins/vlog-opening/tests/orientation.test.cjs`: 18/18 pass;
  the unchanged baseline fails 14/18. Covers portrait/landscape/no open context,
  mixed orientations with reversed metadata completion, display-oriented portrait
  metadata, invalid/short/unreadable inputs, batch boundaries and Quotes controls.
- `node plugins/vlog-opening/tests/reference.test.cjs`: unchanged golden reference
  checks pass, including all compared motion-graphic code/parameters and timing.
- `python3 -m unittest discover -s tests -p test_windows_vlog_opening.py`: 10 pass.
- Public source, 28-template and plugin-file checks pass (existing demo-length
  warnings remain).

## Runtime evidence boundary

The isolated SDK-free app used full-length replacement originals from the SSD,
with the actual bundled cues. Newly imported videos had not been analyzed, so
actual analyzed `Source.meta()` reads were blocked by the existing analysis gate.
No paid analysis was started. Real raw SDK resource/source-file metadata was
injected into a controlled host executing the production template's read prefix;
scene candidates were supplied. Production assignment, retiming, assembly and
reference finishing then ran against the real SDK, followed by independent saved
Draft metadata reads and native video export.

This isolates the canvas defect. It does **not** establish a complete production
TemplateRun, analysis/scene-search success, installed gallery UI behavior, preview
playback or shot-selection quality. The original report's media were unavailable.
A first media batch contained one rotation-tagged portrait display source; that
batch and its logs were preserved separately. A second batch requires all 16
selected source-file display sizes to be landscape before the read-prefix test.

The first concurrent export batch had one `source changed after enqueue` failure;
that failure is retained rather than counted as success. The final focused batch
waits for each export before writing the next Draft. Existing 60 fps Whip Flare
rounding notes (18 instead of 19 frames) occur before and after the canvas patch
and are outside this fix.

The final focused batch uses 16 full-length originals with SDK display sizes
1920×1080, in a separate owned project. With the same unrelated 1080×1920 context,
both unmodified variants save and export portrait; both patched variants save
and export 1920×1080. All four native exports report success. Whip preserves
934 frames and Motion 1055 frames at 60 fps. The prior broader context controls
also saved both patched variants as landscape with landscape and absent context.
All four MP4 files decode completely with no FFmpeg errors, have the saved frame
count and canvas ratio, and contain non-silent bundled-cue audio. This file check
does not replace interactive preview playback or a whole-video visual review.
