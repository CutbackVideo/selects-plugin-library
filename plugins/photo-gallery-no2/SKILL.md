---
name: photo-gallery-no2
description: Create a 21-tile Photo Gallery Draft in Selects from ordered original photos and videos.
---

# Photo Gallery · 21 tiles

Use this skill for the 3-column × 7-row format of [the reference TikTok](https://www.tiktok.com/@yana_zinooyoon/video/7487656824712350994). Recreate the grid, reveal order, and simultaneous grayscale-to-color switch; the 21 tile contents may differ. Each chosen JPG/PNG remains its original Image Resource and becomes a separate editable Image clip. Do not convert photos to MP4, flatten the gallery, or silently fill a missing slot. A black Main video is unnecessary: the shared operation creates a 853-frame gap-backed Draft.

## Shared operations

The panel and chat must call the same operation from `build-script.mjs`; do not recreate it in a prompt. Feed one JSON object through stdin or a temporary file, never shell-interpolated user text. Run `inspect` and `verifyCreated` with `allowCommit:false`; run `importConverted` and `create` with `allowCommit:true`. Read [INSTALL.md](INSTALL.md) for SDK requirements and current verification limits.

1. Call `{"operation":"inspect","projectId":"CURRENT_PROJECT_ID"}`. Get exactly 21 visual choices in left-to-right, top-to-bottom order. The same Resource may occupy multiple slots only if the user explicitly chose it. Keep each original photo path; require its Selects-reported width and height. If those dimensions are unavailable, ask the user to update Selects instead of converting the photo.
2. Only for a selected **Video** Resource shorter than the requested output, call `hold_video.py` with JSON stdin, for example `{"videos":[{"path":"/absolute/project/short.mp4"}],"durationFrames":853}`. Confirm `status:"converted"`, 60 fps, frame count, source path, and output path. Import held files through a separate `importConverted` operation in batches of at most three, supplying each original video's `sourceResourceId`, `sourcePath`, and held MP4 `path`. Use the returned Video Resource and path in every slot that explicitly uses that source. Long videos stay original.
3. With music and no manual BPM, run `tempo.py` against the selected audio path and accept only `status:"estimated"`. Ask for manual BPM when the estimate is uncertain. Without music, manual BPM is required. The selected music must cover the full result; do not loop or pad it silently.
4. Call `create` with 21 Image/Video Resource entries, their exact Project paths, focus values between 0 and 1, and optional music. It creates a new Draft by default. A 60 fps Project and a Selects build with native Image overlays are required. Example shape, to be extended to exactly 21 media entries:

```json
{"operation":"create","projectId":"CURRENT_PROJECT_ID","name":"Photo Gallery","media":[{"resourceId":"PHOTO_RESOURCE_ID","path":"/absolute/project/photo-01.jpg","kind":"image","width":1080,"height":1920,"focusX":0.5,"focusY":0.5}],"music":null,"manualBpm":113,"durationFrames":853}
```

The default reveals are frames `0,12,23,36,45,52,62,73,81,90,100,113,122,133,143,151,161,172,182,192,205`; all tiles switch to color at frame 270. BPM changes only these event frames, not the final frame. Ask for a compatible duration or BPM if the color cut would land beyond the result.

Always pass an absolute Project file path alongside each Resource ID, including music. Resource aliases can shift after media changes or an app restart; the operation resolves each path against the current inventory and rejects a missing or ambiguous match before creating a Draft. If the Selects SDK rejects an original Image overlay, report that build incompatibility. Do not silently revert to photo-to-MP4 conversion.

5. After `saved`, call `verifyCreated` in a new read-only script with the same input, `operation:"verifyCreated"`, and the returned `draftId`. `verified` checks 21 independent clips, gap-backed duration, timing, effect labels, transforms, and optional music. It is structural only: check actual Selects playback and native export separately, then compare boundaries, reveal frames, and color cut to `reference-oracle.json`.

## Editing and uncertainty

The current plugin does not yet automate one-slot replacement in an existing Draft. Do not rebuild a Draft as an undisclosed substitute or claim manual effects/crop are preserved. The 21 individual clips can be edited directly in the Selects timeline. Existing-Draft `update` requests are rejected before mutation until the native Image replacement and semantic slot-binding APIs pass this plugin's tests.

`notSaved` means a check failed before Draft commit. `outcomeUnknown`, a transport error after import/commit, or a missing response requires Project/Draft inspection before retry; a blind retry may duplicate media or Drafts. A repaired run does not count as first-pass success. Report creation, saved readback, live playback, and native export separately.
