# Timeline Shorts Builder

Create an editable 9:16 Draft that shows the source video above a moving Selects-style timeline.

**Experimental.** Tested with a compatible Selects development build on macOS. Released-version and Windows/Linux compatibility are unverified. See [installation and requirements](INSTALL.md).

## Use

1. Open a Selects project and the **Timeline Shorts Builder** panel.
2. Choose an editable source Draft. The panel measures the complete Main, video, and audio layout instead of using only the Main duration.
3. Drag the divider in the 9:16 layout preview, choose a 50:50, 60:40, or 70:30 preset, or use the ratio slider.
4. Optionally change the timeline background and fixed playhead colors.
5. Choose **Create editable timeline shorts Draft**.
6. Review and continue editing the new Draft in Selects. Export the finished video separately through **Handoff → Export**.

The output remains editable. The source Draft's video, overlays, audio, and Motion Graphics are duplicated as separate clips. A separate timeline Motion Graphic uses the source Draft's real NLE track stack order, clip start and end frames, sampled clip thumbnails, and a fixed playhead while the timeline moves left.

## Layout behavior

The video preserves its aspect ratio and fills the upper grid. Its original bottom edge is anchored to the divider, so overflow is cropped only from the top or sides. The source Draft is not changed.

The timeline duration extends to the final Main, video, or audio clip. Clip thumbnails are sampled locally, written under `<home>/.selects/generated/timeline-shorts/thumbnails/`, and referenced by short local URLs so long videos do not inflate the editing script with Base64 image data.

## Requirements and limits

- Requires a Selects build with Panel support and generated-media authoring.
- Uses provisional host `FileSystem` and `SequenceRepository` adapters. The panel checks for them at runtime.
- Each clip receives up to six sampled thumbnails. These are a filmstrip approximation, not a frame-for-frame screen recording of the Selects UI.
- Source clips with unsupported or offline media can prevent thumbnail generation or rendering.
- The plugin creates a new editable Draft and does not render or export a final MP4.

## Verification

The panel passes Selects static validation and compilation. Non-committed simulations verified 1080×1920 Draft duplication, complete timeline duration, fixed-playhead motion, file-backed thumbnail layout, source Motion Graphic scaling, and grid transforms. Final end-to-end creation after the latest real-track-order and bottom-anchor changes has not yet been action-tested across every supported codec.

This package contains no source footage, reference media, models, credentials, runtime caches, or installed dependencies. See [third-party components](THIRD_PARTY.md).
