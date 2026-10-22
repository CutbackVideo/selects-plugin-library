# Template compatibility without SDK changes

The user chose existing SDK capabilities only. App PR #7876 is closed; plugin PR #346 remains the review unit. Preserve all branches, commits, unfinished app integration and evidence. Native rendering changes remain deferred in the closed app branch. Chan's shortform apps and packs stay excluded.

## Replacement boundaries

| Concern | Existing capability | Limit |
| --- | --- | --- |
| Complete original contents | Shared file-observation streams existing stat/readRange into SHA-256; size, mtime and inode bracket the read | No file lock; incomplete or over-budget reads remain unconfirmed, never sampled |
| Saved Audio/Video source windows | Shared draft-observation uses existing Panel getDraftCore and supported getDraftMediaSnapshot; strictly parses Clip.1/Clip.2 on older hosts | Saved state only; unsupported schemas and real read errors cannot become success |
| Gallery Project changes during assembly | Independent post-save SDK invocations read metadata, complete files, then metadata again | Cached metadata cannot detect every in-run change before commit; one saved Draft can exist before a mismatch is discovered |
| Long execution | Existing runScript, without a new maxScriptTimeoutSeconds capability gate | Older host deadlines remain; a timeout never authorizes replay of an uncertain commit |

Common development sources are embedded into seven independently installed panels by existing generators. No public SDK or app change is included. The private local file adapter preserves positional readRange while also accepting the existing SDK request shape.

## Save and recovery

1. Keep placement, effects, transforms, sound, exact rate and pitch checks before commit. Source windows at this stage are explicit planner intent, not observed saved facts.
2. Photo templates commit one complete Draft. Mini/Archive retain their existing assembly and decoration commit boundaries.
3. After saving, read actual source windows and compare them with the original plan. Mini/Archive publish immutable source guard evidence only after this comparison succeeds. Independent before/after saved revision witnesses must match.
4. Failed verification retains the saved Draft ID and reports an unconfirmed result. Never replay an uncertain commit or overwrite manual edits.
5. Preserve historical recipes and evidence bytes. A known frozen legacy verifier receives a read-only local adapter for only its observed saved target; the SDK itself is unchanged.

Gallery source evidence is retained in an immutable owned sidecar for recovery; the small result stores only its owner-bound path, size and SHA-256. Long Unicode paths therefore do not multiply inside the 48 KiB receipt. Dedicated source-evidence publication authorizes file writes, while ordinary saved-Draft queries remain read-only and contain no Draft save. Older records lacking required evidence require inspection rather than replacement authoring. These observations do not provide an atomic check-and-save transaction or prevent later edits.

## Scope and validation

No.14, Camera Shutter, Four Photo Stop Motion, Polaroid, Photo Gallery, Mini Vlog and Archive Vlog use the replacement modules. Archive still requires two distinct videos, with photos optional. Generated panel copies account for much of the line-count diff.

Dedicated tests remove new SDK fingerprint/source-window/fresh/deadline capabilities and exercise saves, independent readback, remounts, lost replies, manual changes, same-size file replacement and saved-ID retention on failure. Generated scripts are checked against existing SDK declarations, alongside affected-consumer regressions. Final command outcomes are recorded in PR #346.

Installed-app, Windows, whole playback and export remain unverified. No Electron or other task's processes, temporary files or data were touched. Semantic review and whole-template acceptance remain 0/28.
