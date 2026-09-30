---
name: photo-gallery-no2
description: Create a 21-tile Photo Gallery Draft in Selects from ordered original photos and videos.
---

# Photo Gallery · 21 tiles

Use this skill for the 3-column × 7-row format of [the reference TikTok](https://www.tiktok.com/@yana_zinooyoon/video/7487656824712350994). Recreate the grid, reveal order, and simultaneous grayscale-to-color switch; the 21 tile contents may differ. Each chosen JPG/PNG remains its original Image Resource and becomes a separate editable Image clip. Do not convert photos to MP4, flatten the gallery, or silently fill a missing slot. A black Main video is unnecessary: the shared operation creates a 853-frame gap-backed Draft.

The original has visible movement in tiles **4, 6, 11, 17, 19, and 21** (one-based, left-to-right then top-to-bottom). For a motion-faithful result, assign Video Resources to those six slots and Images to the other 15; the actual content may differ. The panel offers a reference-mix assignment button when the Project contains exactly 15 Images and 6 Videos, and warns if the selected complete set has still Images in moving slots. Users may deliberately choose another mix, but an all-Image output only validates the grid and timing, not the original movement.

## Shared operations

The panel and chat use the same `planGallery` contract, preflight, styling, and readback operations from `build-script.mjs`; do not recreate these rules in a prompt. The panel alone can access Selects' native Image-placement service. `run_script` cannot call it. Feed operation JSON through stdin or a temporary file, never shell-interpolated user text. Run `inspect`, `preflight`, and `verifyCreated` with `allowCommit:false`; mutating operations require `allowCommit:true`. Read [INSTALL.md](INSTALL.md) for current capability limits.

1. Call `{"operation":"inspect","projectId":"CURRENT_PROJECT_ID"}`. Get exactly 21 visual choices in left-to-right, top-to-bottom order. The same Resource may occupy multiple slots only if the user explicitly chose it. Keep each original photo path. The panel verifies Image dimensions from the app-owned Resource; the public SDK's source-file listing alone does not provide them.
2. Only for a selected **Video** Resource shorter than the requested output, call `hold_video.py` with JSON stdin, for example `{"videos":[{"path":"/absolute/project/short.mp4"}],"durationFrames":853}`. Confirm `status:"converted"`, 60 fps, frame count, source path, and output path. Import held files through a separate `importConverted` operation in batches of at most three, supplying each original video's `sourceResourceId`, `sourcePath`, and held MP4 `path`. Use the returned Video Resource and path in every slot that explicitly uses that source. Long videos stay original.
3. With music and no manual BPM, run `tempo.py` against the selected audio path and accept only `status:"estimated"`. Ask for manual BPM when the estimate is uncertain. Without music, manual BPM is required. The selected music must cover the full result; do not loop or pad it silently.
4. For any Image slot, open and operate the **Photo Gallery 21 panel** through the available app-control tool. Load the current Project, select the 21 requested Resources in order, set the requested focus, BPM, music, duration, and Draft name, then press Create once. Use the user's existing choices; do not ask them to repeat clear input or perform a panel action you can perform yourself. The panel validates all 21 slots, creates a new 60 fps Draft, places original Images through the editor's timeline service, places Videos through the public SDK, then applies the shared style and readback. Do not call `create` from `run_script` for an Image gallery; that public-only route cannot place original Images. If app control is unavailable, explain that concrete limitation and give the remaining panel action. This UI route must be validated as a separate chat acceptance case before claiming one-shot success. For 21 Video slots, chat may call `create` with exact Project paths, focus values, and optional music. Example shape, to be extended to exactly 21 media entries:

```json
{"operation":"create","projectId":"CURRENT_PROJECT_ID","name":"Photo Gallery","media":[{"resourceId":"VIDEO_RESOURCE_ID","path":"/absolute/project/video-01.mp4","kind":"video","width":1080,"height":1920,"durationFrames":900,"focusX":0.5,"focusY":0.5}],"music":null,"manualBpm":113,"durationFrames":853}
```

The default reveals are frames `0,12,23,36,45,52,62,73,81,90,100,113,122,133,143,151,161,172,182,192,205`; all tiles switch to color at frame 270. BPM changes only these event frames, not the final frame. Ask for a compatible duration or BPM if the color cut would land beyond the result.

Always pass an absolute Project file path alongside each Resource ID, including music. Resource aliases can shift after media changes or an app restart; the operation resolves each path against the current inventory and rejects a missing or ambiguous match before creating a Draft. Do not silently convert photos to MP4. Never claim a Draft was made when only a manifest was prepared. When a panel Create response is interrupted by navigation, inspect Project Drafts and the saved target before clicking again.

5. After a saved Draft, call `verifyCreated` in a new read-only script with the same input, `operation:"verifyCreated"`, and the returned `draftId`. The panel does this automatically. `verified` checks 21 independent clips, gap-backed duration, timing, effect labels, transforms, and optional music. It is structural only: check actual Selects playback and native export separately, then compare boundaries, reveal frames, and color cut to `reference-oracle.json`.

## Editing and uncertainty

The current plugin does not yet automate one-slot replacement in an existing Draft. Do not rebuild a Draft as an undisclosed substitute or claim manual effects/crop are preserved. The 21 individual clips can be edited directly in the Selects timeline. Existing-Draft `update` requests are rejected before mutation until the native Image replacement and semantic slot-binding APIs pass this plugin's tests.

`notSaved` means a check failed before Draft commit. `outcomeUnknown`, a transport error after import/commit, or a missing response requires Project/Draft inspection before retry; a blind retry may duplicate media or Drafts. A repaired run does not count as first-pass success. Report creation, saved readback, live playback, and native export separately.
