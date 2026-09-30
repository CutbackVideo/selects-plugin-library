# Validation and limits

This experimental version creates a new editable Draft with 21 independent visual clips. The 3-by-7 grid, reveal order, and shared grayscale-to-color event follow `reference-oracle.json`. Photos remain original Image Resources; the output is not flattened.

## Verified in Selects Staging

- A single panel Create action using 21 original photos saved 21 separate clips. Native export produced H.264, 1080x1920, 60 fps, 853 frames.
- After correcting a Video overlay boundary mismatch, a fresh panel Create action using 15 Images and 6 Videos saved all 21 clips with exact reveal frames and a shared end at frame 853, without source-audio clips. The earlier repaired attempt remains a first-pass failure.
- The mixed Draft played, persisted after app restart, and exported natively. Independent decoded-frame checks passed for each reveal, grayscale at frame 269, color at 270 and 852, black grid boundaries within two pixels, and the intended moving/still cell pattern.
- Planner, shared operation, native Image adapter, and panel behavior tests cover input count, explicit reuse, aspect ratios, focus, tempo, duration, stale Project context, duplicate execution, and saved readback. Converter tests check short-video frame count and held last frames. These tests do not replace live app acceptance.

## Remaining limitations

- Native Image placement uses an app-owned panel service and requires a compatible panel host. It is not a stable public SDK method; retest after Selects updates.
- Chat can guide the same panel using app control, but the complete chat-driven Image creation flow has not yet passed a live acceptance run.
- Automated single-slot replacement in an existing Draft is unavailable. Edit individual clips in the Selects timeline; do not imply the plugin preserves manual edits through an unsupported replacement.
- Music/BPM, short-video completion, and duplicate-click/transport-loss behavior need additional live acceptance runs. Automated tests alone do not certify these cases.
- The existing moving-crop demonstration assets verify the Video route. They do not prove actual AI-generated scene motion. Natural image-to-video sample generation remains pending and is not bundled with the plugin.

Creation, saved structural readback, actual playback, and native export are separate outcomes. Inspect the existing Draft before retrying an unknown save result.

The gallery preview is a compact version of the verified mixed native export. Its six demonstration Video Resources use moving crops of generated photos; the preview is not evidence of AI-generated scene motion. Preview media are gallery assets and are not installed as user input resources.
