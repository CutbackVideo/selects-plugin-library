---
name: photo-gallery-no2
description: Create a 21-tile Photo Gallery Draft in Selects from ordered original photos and videos.
---

# Photo Grid Reveal

Use this skill for the 3-column × 7-row format of [the reference TikTok](https://www.tiktok.com/@yana_zinooyoon/video/7487656824712350994). Recreate the grid, reveal order, and simultaneous grayscale-to-color switch; the 21 tile contents may differ. Each chosen JPG/PNG remains its original Image Resource and becomes a separate editable Image clip. Do not convert photos to MP4, flatten the gallery, or silently fill a missing slot. A black Main video is unnecessary: the shared operation creates a 853-frame gap-backed Draft.

The original has visible movement in tiles **4, 6, 11, 17, 19, and 21** (one-based, left-to-right then top-to-bottom). For a motion-faithful result, assign Video Resources to those six slots and Images to the other 15; the actual content may differ. The panel offers a reference-mix assignment button when the Project contains exactly 15 Images and 6 Videos, and warns if the selected complete set has still Images in moving slots. Users may deliberately choose another mix, but an all-Image output only validates the grid and timing, not the original movement.

## Shared operations

The panel and chat use the same `planGallery` contract, input checks, styling, and readback operations; do not recreate these rules in a prompt. Original Images use the public `draft.overlayResource` SDK, with no internal app service. Build each `run_script` source the way `operation-builder.mjs` does: the text of `format.mjs` with the `export` keyword removed from `REFERENCE` and `planGallery`, then the function from installed `input-facts.generated.mjs` without its header comment or leading `export`, then the decoded JSON string values `IMAGE_AUTHORING_SOURCE`, `TEMPLATE_RUN_SOURCE` and `ASSET_RESOURCE_SOURCE` from installed `authoring.generated.mjs`, then the text of `operation-runtime.js`, then `return await galleryOperation(selects, <operation JSON>);`. The installed input-facts copy is generated from the shared original-Image feature; never hand-edit it or import a repository path in an installed script. `PANEL_ASSET_SOURCE` and `PANEL_RUN_SOURCE` are browser-side functions and must not be copied into SDK scripts. This needs no Node or shell, so it is the same on macOS and Windows; never interpolate user text into a shell command. Run `inspect`, `verifyInputs`, `preflight`, and `verifyCreated` with `allowCommit:false`; mutating operations require `allowCommit:true`. Read [INSTALL.md](INSTALL.md) for current capability limits.

1. Call `{"operation":"inspect","projectId":"CURRENT_PROJECT_ID"}`. Get exactly 21 visual choices in left-to-right, top-to-bottom order. The same Resource may occupy multiple slots only if the user explicitly chose it. Keep each original photo path. Current Project source-file metadata must supply verified dimensions; caller-provided sizes cannot replace missing metadata. Run `verifyInputs` with the selected 21 rows and optional selected Project music before preparing bundled music or held videos. It preserves selected order/reuse, resolves frozen paths to current aliases, probes selected files and checks original Images with stat, a one-byte read and stat again. The returned dimensions must still match after probing. Missing, unknown, unreadable or changing originals stop before asset work. All-Video inputs do not need unused Image checks. Unavailable or ambiguous unrelated resources are not selected automatically.
2. Only a selected **Video** Resource shorter than the requested output needs its last frame held. Use the panel's Create path with Selects' bundled ffmpeg (no Python, the same on macOS and Windows): it orchestrates the public media jobs, file ownership and cancellation. The raw `importConverted` operation only registers already verified files; it is not a substitute for that preparation. The panel imports the held MP4s in batches of at most three, supplying each original video's `sourceResourceId`, `sourcePath`, and held MP4 `path`, and uses the returned Video Resource and path in every slot that uses that source. Long videos stay original.

Short-video cache publication is panel-owned. The shared asset owner hashes entire
files through streaming FFmpeg data/hash output, freezes a verified private source
copy, and publishes a complete decoded/hashed MP4 before its atomic cache index.
The held-v3 cache rechecks source/output bytes and metadata each invocation; size
and timestamp alone do not establish identity. Do not replace this with a raw
rename pair, a seen-cache flag, or an SDK script that registers an unverified file.
An unknown publication is inspected rather than re-encoded inside the same call.
Ending the run or unmounting the panel cancels active media preparation and stops
later imports; already issued filesystem operations can finish. Old held-v2 files
and published objects are retained because earlier Drafts may still use them.
3. Unless the user selects another track or silence, use the bundled **Unexplored (long ver.) — TAD MILLER** excerpt, 39.650–53.866667 seconds, and manual timing BPM 113. This control preserves the reference events; do not call it a measured music BPM. Use the installed panel's Create path for bundled asset preparation: the existing common asset feature checks the release bytes/hash, atomically publishes an owned content-addressed copy, confirms Audio metadata, and returns its Project identity. Never register an installation-folder file directly. The low-level `importBundledMusic` compatibility operation now accepts only an already prepared owned asset path beneath `.selects/plugin-data/photo-gallery-no2/assets/<sha256>.mp3`; it does not replace byte verification/publication. The current agent SDK worker lacks browser hashing/file-client globals, so do not recreate this preparation there. Preserve the credits from [THIRD_PARTY.md](THIRD_PARTY.md) in shared outputs; B2 is CC BY 4.0, not CC0. With selected music and automatic BPM explicitly requested, use the panel's **Estimate music BPM** and accept only an estimated value. Without music, manual BPM is required. The music must cover the actual rounded Project duration: default 30 fps needs 14.233333 seconds and cannot use this 14.216667-second excerpt. Choose No music, another sufficient track, or an explicit shorter duration. Never silently change timing, loop or pad it.
4. Use the shared `buildScript` operation through `sdk.runScript` for both Image and Video Resources. The existing `draft.overlayResource` holds original Images for an exact Draft interval without creating a still-video surrogate. Resolve the Project frame rate first with an unsaved `project.createDraft({name:"Gallery frame grid"})` and `draft.meta().fps`, and pass it as `fps` to the operation. Input durations and music offsets remain in the 60 fps reference clock; the plan converts them to the Project frame grid. The panel uses the same operation and verifies saved clips after placement. Example shape, to be extended to exactly 21 media entries:

```json
{"operation":"create","projectId":"CURRENT_PROJECT_ID","name":"Photo Gallery","media":[{"resourceId":"VIDEO_RESOURCE_ID","path":"/absolute/project/video-01.mp4","kind":"video","width":1080,"height":1920,"durationFrames":900,"focusX":0.5,"focusY":0.5}],"music":null,"manualBpm":113,"durationFrames":853}
```

The default reveals are frames `0,12,23,36,45,52,62,73,81,90,100,113,122,133,143,151,161,172,182,192,205`; all tiles switch to color at frame 270. BPM changes only these event frames, not the final frame. Ask for a compatible duration or BPM if the color cut would land beyond the result.

Always pass an absolute Project file path alongside each Resource ID, including music. Resource aliases can shift after media changes or an app restart; the operation resolves each path against the current inventory and rejects a missing or ambiguous match before creating a Draft. Do not silently convert photos to MP4. Never claim a Draft was made when only a manifest was prepared. When a panel Create response is interrupted by navigation, inspect Project Drafts and the saved target before clicking again.

Normal panel creation requires numeric `sdk.maxScriptTimeoutSeconds >= 120` before any asset preparation and requests `timeoutSeconds:120` for its one complete authoring call. Update Selects if the fact is absent or smaller; older runtimes may silently discard unknown request fields. Agent `run_script` callers must also set `timeoutSeconds:120` on the tool call. A working copy places all 21 visuals, effects, transforms and optional music, checks their receipts, then commits once. The panel independently reopens and verifies the saved result. Never split a new creation into seed/video/style saves to avoid a deadline. The low-level `createBase`, `fillBase`, `placeVideosExisting` and `styleExisting` operations remain for compatibility with explicit legacy repair procedures; the normal panel/app run does not use them. Do not replace a failed operation with handwritten placement code or copy session-local aliases from another run. Inspect a possibly saved result before an explicit new run.

5. After a saved Draft, call `verifyCreated` in a new read-only script with the same input, `operation:"verifyCreated"`, and the returned `draftId`. The panel does this automatically. `verified` checks 21 independent clips, gap-backed duration, timing, effect labels, transforms, and optional music. It is structural only: check actual Selects playback and native export separately, then compare boundaries, reveal frames, and color cut to `reference-oracle.json`.

## Editing and uncertainty

App-supplied template run IDs use the existing durable run feature before
preparing selected media or bundled music. A saved receipt returns its original
Draft only after independent persisted readback; concurrent/remounted clients
cannot author it again. The same ID with changed picks/music is refused. Start
an explicit new app run to retry a proven failure; never delete or replace the
run journal to force another save. SDK-side conditional receipt publication
precedes the authoring reply. Pending/unknown/corrupt records require inspection.
This does not deduplicate ordinary panel Create or separate agent-created
operations without an app run ID, and does not make reusable asset imports part
of the Draft transaction. `PANEL_RUN_SOURCE` in the generated artifact is for the
panel only; SDK scripts use `TEMPLATE_RUN_SOURCE`, which contains no browser
hashing, file-adapter or ownership functions.

The current plugin does not yet automate one-slot replacement in an existing Draft. Do not rebuild a Draft as an undisclosed substitute or claim manual effects/crop are preserved. The 21 individual clips can be edited directly in the Selects timeline. Existing-Draft `update` requests are rejected before mutation until the native Image replacement and semantic slot-binding APIs pass this plugin's tests.

`notSaved` means a check failed before Draft commit. `outcomeUnknown`, a transport error after import/commit, or a missing response requires Project/Draft inspection before retry; a blind retry may duplicate media or Drafts. A repaired run does not count as first-pass success. Report creation, saved readback, live playback, and native export separately.
