# Timeline Shorts Builder

Create an editable 9:16 Draft that shows source media above an animated Selects-style timeline.

**Experimental.** Tested with a compatible Selects development build on macOS. Released-version and Windows/Linux compatibility are unverified. See [installation and requirements](INSTALL.md).

## What changed in 0.2.0-alpha.1

- Fits every video and image from its native media dimensions instead of the source Draft canvas.
- Does not reuse source-Draft zoom and position values for regular media, preventing an already enlarged composition from being enlarged again.
- Preserves the complete native frame, keeps its bottom edge aligned to the video-grid boundary, and leaves empty space instead of cropping.
- Splits thumbnail preparation from Draft creation. Preparation never creates a Draft.
- Reuses a versioned, checksummed disk cache and resumes after a stop without repeating completed thumbnail reads.
- Adapts thumbnail sampling to the clip's visible timeline width.
- Uses a Worker for image conversion when supported, with a sequential fallback.
- Deduplicates embedded images and combines small timelines into one Motion Graphic; larger timelines are saved in bounded transactions.
- Embeds export-safe image data instead of persisting `local://` thumbnail URLs.
- Provides stop handling, read timeouts, retry locking, progress metrics, and in-place repair for legacy generated timelines.

## Use

1. Open a Selects project and the **Timeline Shorts Builder** panel.
2. Choose an editable source Draft.
3. Choose **1. Prepare thumbnails / resume from cache**.
   - This step reads native source dimensions and thumbnails but does not create a Draft.
   - If stopped, rerun preparation to reuse completed cache entries.
4. Review the displayed reference source dimensions and set the video/timeline split.
5. Choose **2. Create Draft from prepared images**.
6. Review the new editable Draft in Selects. Export the finished video separately through **Handoff → Export**.

For an older generated Draft that contains local thumbnail URLs, select that shorts Draft and choose **Repair export thumbnails in selected shorts Draft**. The old timeline graphic is removed only after the replacement graphics are saved and verified.

## Output behavior

- The output canvas is 1080×1920.
- Regular videos and images use their native file dimensions and are fitted without cropping.
- Existing zoom and position values from the source Draft are not reused for regular media.
- Motion Graphics have no independent raw-media raster, so they are fitted relative to the selected native Main reference while retaining their internal transforms.
- The timeline uses the source Draft's real NLE track order, clip timing, colors, names, and sampled thumbnails.
- The fixed playhead remains on screen while the timeline moves left.
- The source Draft is unchanged.

## Performance and caching

The preparation phase samples according to visible timeline width, with at most six thumbnails per visual clip. Cache keys include the plugin cache version, source-Draft revision, media modification time, source timing, camera assignment, intrinsic adjustments, and effects. Cached entries include checksums.

Static-image placements with the same media state can reuse one cached image. Prepared data is rejected if the source Draft changes before creation. The panel shows planned and completed samples, cache hits, new requests, image bytes, elapsed preparation time, edit-call time, save count, and image-processing mode.

## Requirements and limits

- Requires a Selects build with Panel support and generated-media authoring.
- Requires host `FileSystem`, `SequenceRepository`, and `SequenceEdit` adapters.
- If native dimensions are unavailable for a regular video or image, preparation stops instead of falling back to Draft-canvas dimensions.
- A source Motion Graphic that already references invalid or unavailable media can still fail independently of this plugin's sizing logic.
- The plugin creates an editable Draft and does not directly export the final MP4.

## Verification

Completed checks for this release:

- Selects panel TypeScript/TSX compilation.
- Adaptive-sampling, cache checksum, warm-cache, interrupted-resume, static-image reuse, cancellation, timeout-lock, image deduplication, payload-bounding, and native-size placement tests.
- A real 720×1280 source was fitted to 540×960 in a 50:50 1080×1920 layout without cropping.
- A two-second real-media Draft with an embedded thumbnail timeline was saved, exported to MP4, decoded successfully, and inspected at start, middle, and end frames. The embedded thumbnails remained visible and the output stayed editable.

Not yet verified across every source codec or with the full 37-visual-clip panel workflow. The package remains experimental.

This package contains no source footage, test media, models, credentials, runtime caches, or installed dependencies. See [third-party components](THIRD_PARTY.md).
