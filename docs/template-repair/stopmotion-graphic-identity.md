# Four Photo Stop Motion: bind the saved outro to its live clip

During reported-case testing on 2026-10-23, the existing SDK rejected a complete
Stop Motion save with `Graphic placement could not be confirmed.` No SDK or
application change is needed.

The template treated `addMotionGraphic()` as returning a `trackId`. Its public
receipt contains `clipId`, `startFrame`, `endFrame` and `diff`; the live clip in
`draft.clips()` carries the track identity. The saved-state verifier correctly
refused the undefined track. This was an authoring failure, not a frame-rate or
media-availability failure.

The template now reads the working Draft after adding the outro and requires one
matching clip ID, a nonempty live track ID and the exact planned range before
recording graphic, transform and program targets. Existing strict verification
stays unchanged. Missing, duplicate or moved placements still stop before save.

## Verification

- A real isolated development app at `cutback-client@90940207f` reproduced the
  failure before the repair using four owned substitute PNGs and bundled music.
  The receipt lacked a track ID while the independently read graphic occupied
  exactly frames 260–277 at 24000/1001 fps.
- The same inputs and settings with the repair save one complete Draft and pass
  independent saved-state verification. Native MP4 export succeeds; all 277
  frames decode at 24000/1001 fps, with the audio stream present.
- Six regression cases use the existing SDK receipt shape and challenge missing,
  duplicate, moved and unidentified live placements. The targeted Stop Motion
  and photo authoring group passes 70 cases.

This also exercises the stop/pause portion discussed in report C-32, but does not
resolve its subjective timing complaint: the measured reference intentionally
contains a black pause from reference frames 48–80. That design was preserved.
App Preview, installed PanelHost UI, natural-photo quality and Windows acceptance
remain separate gates. Substitute PNGs do not establish face-crop quality (C-33).

Local evidence is retained under
`clip-highlights-analysis/repro-20261023/reported-cases/photo-agent/`, including
the pre-repair diagnostic, post-repair save/readback, export status, full decode
and regression logs. Existing work, SDK/app code and Chan's apps were preserved.
