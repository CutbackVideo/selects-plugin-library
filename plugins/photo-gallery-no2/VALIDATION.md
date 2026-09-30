# Validation and limits

This experimental version creates a new editable Draft with 21 independent visual clips. The 3-by-7 grid, reveal order, and shared grayscale-to-color event follow `reference-oracle.json`. Photos remain original Image Resources; the output is not flattened.

## Verified in Selects Staging

- A single panel Create action using 21 original photos saved 21 separate clips. Native export produced H.264, 1080x1920, 60 fps, 853 frames.
- After correcting a Video overlay boundary mismatch, a fresh panel Create action using 15 Images and 6 demonstration Videos saved all 21 clips with exact reveal frames and a shared end at frame 853, without source-audio clips. That earlier repaired attempt remains a first-pass failure. The demonstration Draft played, persisted after app restart, and exported natively.
- A separate live Selects chat request operated the installed panel, explicitly selected 15 original Images and six actual AI-generated scene-motion Videos in slots 4, 6, 11, 17, 19, and 21, and pressed Create once. Exactly one new Draft was saved; the six existing Drafts were preserved. Independent shared `verifyCreated` readback passed for all 21 clips, media paths, reveal frames, transforms, effects, duration, and absence of source audio. This confirms chat-driven creation and saved structure, not complete playback acceptance or universal one-shot reliability.
- Native export of that AI sample succeeded: H.264, 1080x1920, 60 fps, 853 decoded frames. Independent decoded-frame checks passed for all 21 reveal events, grayscale at frame 269, color at 270 and 852, black grid boundaries within two pixels, six moving cells, and 15 stable cells. Source filmstrips and spatial-change measurements confirmed scene changes in all six AI sources; these checks do not certify natural-motion quality by themselves.
- Planner, shared operation, native Image adapter, and panel behavior tests cover input count, explicit reuse, aspect ratios, focus, tempo, duration, stale Project context, duplicate execution, and saved readback. Converter tests check short-video frame count and held last frames. Generated Video duration metadata fallback has a regression test. Automated tests do not replace live app acceptance.

## Remaining limitations

- Live app playback of the final AI sample remains unverified. At the last external observation, its preview displayed `00:00:00 / 00:00:00` and the playhead stayed at frame zero after transport attempts. A successful saved readback or export is not a passing preview result.
- Native Image placement uses an app-owned panel service and requires a compatible panel host. It is not a stable public SDK method; retest after Selects updates.
- Automated single-slot replacement in an existing Draft is unavailable. Edit individual clips in the Selects timeline; do not imply the plugin preserves manual edits through an unsupported replacement.
- Music/BPM, short-video completion, and duplicate-click/transport-loss behavior need additional live acceptance runs. Automated tests alone do not certify these cases.
- Continuous visual review of natural AI motion remains a separate acceptance check. AI generation is source preparation, not a dependency or an automatic generation feature of this plugin.

Creation, saved structural readback, actual playback, and native export are separate outcomes. Inspect the existing Draft before retrying an unknown save result.

The gallery preview is a compact version of the native export containing 15 original Image clips and six actual AI scene-motion Video clips. It replaces the earlier moving-crop demonstration. Preview media are gallery assets and are not installed as user input resources.
