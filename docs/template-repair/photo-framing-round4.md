# Gallery / Recap: observed-face focus and durable source identity

This change keeps the existing cover scale, tile layout, cut plan and soundtrack. A shared `cover-focus` calculation moves only the crop focus when every detected face box fits the existing crop. Manual focus wins. Missing/invalid detections and groups wider than the crop retain the existing composition; they are not quality passes. Video observations are sampled, so motion between samples and missed faces remain unknown.

Gallery analyzes original still Images through the existing public CPU `faces.detect` API. Recap tracks the assembler's original source-time windows, merges overlapping windows without bridging gaps, then filters observations back to each slot's selected windows. Its output position uses percentages of output height, with +X right and +Y up. Each consumer reuses the canonical AI job and raw-resource binding modules. Image bytes and video bytes are hashed before/after analysis; changed analyzed sources are refused before authoring. A global observation budget stops further submissions, retains unconfirmed jobs for recovery under their original request keys, and leaves the previous framing available.

Recap selections now persist one `selection-v2:<Project>` value containing durable Resource UUIDs and source start times. Restoring a selection binds those UUIDs to current script aliases. Missing, duplicate or cross-Project identities refuse restoration. Alias-only legacy values are retained byte for byte and require explicit reselection; filenames are not identity.

## Actual execution evidence

Evidence root: `/Users/mano/Documents/clip-highlights-analysis/repro-20261023/reported-cases/round4/photo/`.

| Run | Actual result | Remaining gate |
| --- | --- | --- |
| Gallery, original 15 photos / 6 videos and bundled music | New Draft `5f7786d3-9533-44c8-adcc-78b10b661f62`, verified atomic save and independent readback; all 21 saved tile UUIDs match original selected paths. Tile 2 moves to contain three detected faces. | Foreground replay and new export are owned by the root queue. Original C33 tile 5 remains unresolved. |
| Recap, original 158 slots / 239 planned placements | New Draft `8bd1f34a-ecbb-468f-94ea-387fd6d8dc4f`, 240 main clips including repeated-source splits, 1,647 frames at 24 fps. Original and new Main 479 leaf records have exactly equal raw source UUIDs, source ranges, speed, order and enabled state. Soundtrack raw UUID, range and adjustments also match exactly. | Foreground replay/export and visual acceptance of sampled focus remain separate. |
| C33 original edge photo | Public image capability confirmed. Both score thresholds 0.8 and diagnostic-only 0.5 return zero faces. Production stays at 0.8. | No automatic-fix claim; preserve the manual-focus workaround. |

The rejected QA Draft `ea3fc564-d3fe-4351-b2b3-b9a82f0036bc` is preserved separately. Its harness incorrectly reused historical `rN` aliases after the host restarted. It is excluded from same-input acceptance. The corrected run rebinds exact original paths and UUIDs, verifies dimensions/rate/SHA, and preserves selection order and original start times. The same investigation exposed the Recap product's legacy alias-only selection persistence, fixed above.

Two earlier implementation failures are retained: an old private file-reader overload mismatch stopped before any AI submission/Draft write; reusing the intro's opaque Clip target after a first transform stopped before commit. Hashing now executes inside the SDK and returns a compact digest. Intro cover and focus use one transform mutation.

## Validation

- Canonical shared geometry boundary tests, plus whole compiled production-panel consumer fixtures; no function-text extraction in the new consumer fixtures.
- Manual focus, missing host/runtime, no detection, impossible groups, invalid coordinates, changed source bytes, late context replies, durable job recovery and global budget boundaries.
- The production Recap assembler's source windows at 24, 23.976 and 30 fps; repeated-source prefix, frame-grid mismatch and single opaque-target mutation.
- Durable selection restart/reorder, identical filenames, deleted/duplicate/cross-Project UUIDs and unchanged legacy namespaces.
- Existing Gallery atomic save/recovery/source-guard behavior, Recap preview and SDK script typings.

No app or public SDK source changes. Chan remains excluded. Existing Drafts and legacy storage are preserved. These results do not close aesthetic/music preferences, undetected faces or unobserved video motion.
