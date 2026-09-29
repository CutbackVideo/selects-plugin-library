---
name: photo-gallery-no2
description: Create and safely edit the 21-tile Photo Gallery format in a Selects Draft using the same operation as the panel.
---

# Photo Gallery · 21 tiles

Use this skill when a user asks for the 3-column × 7-row gallery format of [the reference TikTok](https://www.tiktok.com/@yana_zinooyoon/video/7487656824712350994), or asks to change a Draft created with it. The format is fixed; photo/video contents and each tile's crop are user inputs. Do not copy the reference creator's photographs. Do not claim that a saved Draft proves playback, preview or export.

## Shared operation

The panel and this skill use the same `build-script.mjs` and Selects `run_script` operation. Do not reimplement the grid in a chat prompt. The CLI reads **one JSON object from stdin** and emits a complete `run_script` body to stdout. Keep JSON out of shell argument interpolation; use a quoted heredoc or a temporary JSON file. If CLI output is truncated or fails, stop before mutation.

Check [INSTALL.md](INSTALL.md) before use. In the currently checked Selects `develop` build, this format cannot be saved because Image dimensions are absent from the public file-tree inventory and the public overlay placement path rejects Image Resources. The package also currently gates creation on template binding so that later slot edits have stable identity; that gate can be redesigned without changing the client. A missing capability is a real `notSaved` result. Do not imply that an unrun or blocked operation produced a Draft.

```sh
node "$SELECTS_USER_SKILLS_ROOT/photo-gallery-no2/build-script.mjs" <<'PHOTO_GALLERY_INPUT'
{"operation":"inspect","projectId":"CURRENT_PROJECT_ID"}
PHOTO_GALLERY_INPUT
```

Use `allowCommit:false` for `inspect`; use `allowCommit:true` for `create`, `update`, and `updateTiming`. The package must be installed as one skill folder under `SELECTS_USER_SKILLS_ROOT/photo-gallery-no2` and one panel file under `SELECTS_USER_PANELS_ROOT/photo-gallery-no2/panel.tsx`. The panel is a single bundled React file. A local runtime must have Node.js for this CLI, and Python 3 plus ffmpeg for automatic BPM estimation; do not silently install or change global runtimes.

## Preflight and input

1. Resolve the **current** project and, for an edit, the **explicit** target Draft. Never reuse IDs from the reference project or infer a target solely from a similar name. Run `inspect` and use its media/audio inventory. For an existing Draft, pass `draftId`; continue only when `existing` is a verified instance with 21 bound slots and an `instanceId`.
2. For creation, collect exactly 21 ordered visual resources (`tile-01` through `tile-21`, left to right and top to bottom). Each may be a Project Image or Video; an explicit repeat of a resource is allowed. Preserve the user's order. Never silently duplicate, drop, shuffle, or fill a missing tile. Each entry carries the `resourceId`, `kind`, dimensions, video duration when relevant, and `focusX`/`focusY` from 0 to 1. The default focus is 0.5/0.5. Ask only for missing inputs that cannot be resolved from the project or the user's instruction.
3. Music is optional. With music and no manual BPM, run the bundled `tempo.py` on that audio's local path. It emits `{"status":"estimated","bpm":...}` or `{"status":"uncertain",...}`. An uncertain estimate is **not** a usable BPM: request a manual BPM or another track. Without music, a manual BPM is required. Pass an explicit `durationFrames` (default 853 at 60fps); selected music must cover that length without implicit looping or silence padding.
4. The default source format is 1080×1920 at 60fps. The 21 tile reveals follow the reference frame schedule, scaled only by the BPM ratio. All tiles switch from grayscale to color together. A BPM change moves reveals and the color transition but leaves the hold duration independent. If the transition would occur beyond the requested end, present the conflict before saving.

Creation request shape (resource fields come from `inspect`, not guessed paths). The one shown media object is illustrative; extend the array to **exactly 21 objects** before sending it to the builder:

```json
{
  "operation": "create",
  "projectId": "CURRENT_PROJECT_ID",
  "name": "Photo Gallery",
  "media": [{"resourceId":"R01","kind":"image","width":1080,"height":1920,"focusX":0.5,"focusY":0.5}],
  "music": {"resourceId": "AUDIO_RESOURCE_ID", "durationFrames": 900, "startFrame": 0},
  "estimatedBpm": 113,
  "durationFrames": 853
}
```

Use `manualBpm` instead of `estimatedBpm` when the user supplies one. Use `music:null` with a valid `manualBpm` for a silent Draft. `create` always makes a new Draft. It does not alter an existing Draft merely because one is open.

For a tile edit, first inspect that Draft and its bound `instanceId`; change only the tile named by `slotKey`. Example: `{"operation":"update","projectId":"P","draftId":"D","instanceId":"I","slotKey":"tile-07","resourceId":"R","focusX":0.7}`. Omit an unchanged focus axis so the existing value remains. A media swap must preserve the other 20 tiles, timing, unrelated clips, and the user's manual edits. The current operation only attempts focus edits and image-to-image replacement when source dimensions match; video swaps and differently sized image swaps stop before saving because native crop preservation cannot be verified. Report that limitation instead of rebuilding the Draft.

For music, BPM, or duration after creation, use `updateTiming` only on a verified instance with `existing.timingEditable:true`: `{"operation":"updateTiming","projectId":"P","draftId":"D","instanceId":"I","durationFrames":900,"manualBpm":113}`. Omitted `music` preserves it; `music:null` explicitly removes it; a music resource object explicitly replaces it. Omitted `durationFrames` preserves the saved duration. If the existing BPM/music cannot be read reliably, require an explicit BPM before changing timing. Do not change music or duration as a side effect of changing a tile.

## Result and acceptance

- `notSaved` means correct the reported input/capability problem and then retry. `outcomeUnknown`, a transport error after commit, or a missing result means **inspect the project and target Draft before any retry**; a duplicate click may create another Draft or apply an edit twice.
- `saved` confirms a commit ID or Draft ID only. In a fresh, read-only call, inspect the saved Draft and compare its 21 slot bindings, 1080×1920/60fps timing, reveal and color frames, music range, and all unaffected user edits. A mismatch is a failure even if the button said “saved.”
- Exercise real Selects playback and native Handoff → Export. Inspect the exported file and compare its grid/timing/color behavior against the independently measured reference oracle. Source photos, videos, text, and decorative shapes are content inputs, not pixels to match.
- Distinguish **first-pass success** from a repaired run. Do not describe a later correction as a one-shot plugin creation.
