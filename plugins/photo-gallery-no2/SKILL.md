---
name: photo-gallery-no2
description: Create a 21-tile Photo Gallery Draft in Selects from ordered Project photos and videos.
---

# Photo Gallery · 21 tiles

Use this skill for the 3-column × 7-row format of [the reference TikTok](https://www.tiktok.com/@yana_zinooyoon/video/7487656824712350994). It recreates the grid, reveal order, and simultaneous grayscale-to-color change; the tile contents may differ. Each tile is a separate Video Resource clip in the Selects timeline. Do not flatten the whole gallery into one movie, silently repeat missing inputs, or claim that a saved Draft proves visual playback or export.

## Shared operations

The panel and chat must call the same operations from `build-script.mjs`; do not recreate their logic in a prompt. The builder reads one JSON object from stdin and writes a complete Selects `run_script` body. Feed JSON through stdin or a temporary file, not shell-interpolated user text. Use `allowCommit:false` for `inspect` and `verifyCreated`; use `allowCommit:true` for `importConverted`, `importBase`, and `create`. Review [INSTALL.md](INSTALL.md) before use.

1. Inspect the current Project with `{"operation":"inspect","projectId":"CURRENT_PROJECT_ID"}`. Resolve the current IDs from Selects, never from this example. Get exactly 21 ordered visual inputs, left-to-right and top-to-bottom. A resource may repeat only when the user chose it for both slots. Ask for missing slots rather than filling them. Pass each tile's focus in the 0–1 range (default 0.5).
2. For every distinct Image Resource selected, call `still_video.py` with JSON stdin such as `{"images":[{"path":"/absolute/project/photo.jpg"}],"durationFrames":853}`. It writes durable, silent, 60 fps H.264 MP4s to the per-user plugin cache. Check `status:"converted"`, `fps:60`, frame count, and each input index/source path before proceeding. It never renders a full gallery. This is the same conversion used by the panel.
3. For any selected Video Resource shorter than the requested output length, call `hold_video.py` with JSON stdin such as `{"videos":[{"path":"/absolute/project/short.mp4"}],"durationFrames":853}`. It extends only that source by cloning its final frame into a durable 60 fps Video Resource. Confirm its output fields as for the photos. Videos already long enough remain unchanged. In a **separate** mutating `run_script`, call `importConverted` with `{"operation":"importConverted","projectId":"CURRENT_PROJECT_ID","durationFrames":853,"converted":[{"sourceResourceId":"ORIGINAL_RESOURCE_ID","sourcePath":"/absolute/project/photo.jpg","path":"/absolute/cache/output.mp4"}]}` in batches of at most three distinct converted photos or held videos. Each operation verifies and imports its batch, then returns `status:"prepared"` and a Video Resource ID for each original. Replace converted entries in the 21-slot input with those IDs, dimensions, durations and paths. Do not invoke Project import and Draft mutation in one script.
4. Resolve BPM. With music and no manual BPM, run `tempo.py` against the selected audio path and accept only `status:"estimated"`; ask for manual BPM when the estimator is uncertain. Without music, manual BPM is required. Music must cover the requested output length, without implicit loop or silence padding.
5. Prepare the black Main video with `black_base.py` and JSON stdin `{"durationFrames":853}`. It generates a durable 1080×1920 black source and uses the same `still_video.py` converter and cache as the photos. Check its `status:"converted"`, `fps:60`, `durationFrames`, and `outputPath`. In a separate mutating `run_script`, call `{"operation":"importBase","projectId":"CURRENT_PROJECT_ID","path":"ABSOLUTE_CONVERTED_BLACK_MP4_PATH","durationFrames":853}`. Record the returned `baseResourceId` **and path**. This import is idempotent by path. The black Main clip is needed for the editor's timeline duration; it is separate from the 21 editable tile clips.
6. Create a new Draft by calling `create` with the black `baseResourceId` and 21 Video Resource entries. Example input shape below; extend the media array to exactly 21 objects. Default duration is 853 frames at 60 fps. A 60 fps Project is required. Unprepared short videos are rejected before save; use the held Video Resource from step 3.

```json
{"operation":"create","projectId":"CURRENT_PROJECT_ID","name":"Photo Gallery","baseResourceId":"BLACK_VIDEO_RESOURCE_ID","basePath":"/absolute/cache/black.mp4","media":[{"resourceId":"VIDEO_RESOURCE_ID","path":"/absolute/cache/tile-01.mp4","kind":"video","width":1080,"height":1920,"durationFrames":853,"focusX":0.5,"focusY":0.5}],"music":null,"manualBpm":113,"durationFrames":853}
```

The default reveals are frames `0,12,23,36,45,52,62,73,81,90,100,113,122,133,143,151,161,172,182,192,205`; all tiles switch to color at frame 270. BPM changes only these event frames, while the requested final frame stays fixed. If the color cut would exceed the duration, ask for a compatible duration or BPM before saving.

Always pass the exact Project file path with each selected media Resource, the black Main, and optional music. Resource IDs returned by separate scripts can shift when Project media changes or the app restarts. The shared operation resolves each path against the current Project inventory before mutation; a missing or ambiguous path fails before Draft creation. Do not rely on an ID from an earlier call alone.

7. After `saved`, call `verifyCreated` in a fresh read-only script with the same create input, `operation:"verifyCreated"`, and returned `draftId`. `verified` is a structural readback of one full-length Main video, 21 individual tile resource clips, timing, effect labels, transforms, and selected music. It does not prove visual rendering. Check actual Selects playback and native export separately, then compare grid boundaries, reveal frames, and color cut against `reference-oracle.json`.

## Editing and uncertainty

The clean public SDK currently cannot safely automate replacing a Video Resource inside an existing Draft while preserving crop, effect data, and unrelated manual edits. It also cannot read back enough effect parameters to prove that preservation. The user can edit the 21 independent clips directly in the Selects timeline. **Do not tell a chat user that this plugin can safely perform a one-slot replacement after creation.** Do not rebuild the Draft as an undisclosed substitute. Existing-Draft `update` and `updateTiming` requests are unsupported and rejected before mutation.

`notSaved` means the input/capability check failed before the Draft commit. `outcomeUnknown`, a transport error after import or commit, or a missing result requires Project/Draft inspection before retry; blindly repeating may import duplicates or create another Draft. A successful repair is not a first-pass success. Report creation, structural readback, playback, and export as separate states.
