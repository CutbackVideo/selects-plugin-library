# Archive Audio and durable workflow — in progress

This connected feature covers selected music contents, Project Audio adoption and
assembly/look save recovery. It is not a completed Archive repair or acceptance
claim. Chan remains excluded. Work is isolated on `codex/archive-audio-workflow`,
based on Mini PR #335's `68ac2b1`; the original Mini/app workspaces are preserved.

## Implemented: one canonical selected-Audio procedure

Archive previously adopted a different Project Audio by basename and approximate
duration. Two actual 119.6-second MP3s with different contents reproduce that
counterexample. Its import operation also trusted an added ID without confirming
the actual Project path, and could not recover a completed import's lost reply.

The existing `bundled-assets` owner now supplies `ensureProjectAudio`. Mini and
Archive generate their independent installed operations from that same function;
there is no second copied import procedure and no new common module. The pool
still has nine registry entries and fourteen partial consumers.

| Input/output boundary | Current contract |
| --- | --- |
| Selected input | Project ID, absolute path, optional minimum duration in seconds and optional provenance response |
| Project observation | Unique Audio at the normalized selected path, positive sufficient duration; a name/approximate length is not identity |
| Incomplete lookup | Missing overview/folder detail/directory children or selected-node Resource metadata stops before import |
| Import | At most one dispatch per invocation; read actual Project state after the attempt, including a lost reply |
| Confirmation | Returned added IDs cannot contradict the observed Audio; missing result differs from confirmed skipped import |
| Compatibility | Default result remains `{resourceId, imported}`; optional provenance returns actual path/duration. Legacy asset-reader callers retain their default contract |

Physical file contents and cross-invocation workflow ownership remain caller/run
responsibilities. This procedure does not by itself prove native contents or
durable Draft recovery. Existing generic asset publication/cache/media lifetimes,
the Worker owner and the durable run owner retain their responsibilities.

## Evidence

- Actual Archive adoption operation: ten cases now pass, including seven original
  failures and three controls.
- A 195-case focused slice covers both Audio consumers and existing asset owners;
  a separate 76-case slice covers Gallery assets and structural ownership checks.
  These counts overlap and are not a combined distinct-case total.
- Existing Mini/Archive read operations pass. Archive's former same-name reuse
  assertion now requires the actual selected import and its subsequent reuse;
  the fixture exposes real catalog changes after import.
- Five Archive and six Mini emitted scripts pass the actual SDK declarations.
- Canonical/generated-copy, package/public-source and builder checks accompany
  the change. Mini's source map includes the canonical asset source and shared
  selected-Audio regression; semantic review/whole-template acceptance stay false.

The original Mini PR CI succeeded for `68ac2b1`. This unpushed Archive feature has
not completed final whole checks or native runtime verification.

## Remaining in this same feature packet

1. Prepare bundled cues as pinned owned copies in both entry paths; bind imported
   Audio to those bytes. Bind own-track analysis/cache to a verified snapshot.
2. Carry original music observations and Resource/path bindings into assembly,
   precommit and saved-look continuation.
3. Replace name-based Draft adoption and unconfirmed Finish resubmission with the
   existing durable assembly/look owner, exact frozen requests and independent
   saved-state/intent checks. Preserve Archive's editing/style policy.
4. Verify unknown/late outcomes, same-panel retry, reload, restored originals and
   manual-edit refusal. The retained actual Build RED currently shows unrelated
   same-name Draft adoption and a second unconfirmed save dispatch.
5. Finish affected-consumer/final checks, actual runtime evidence and one cohesive
   PR. Installed UI, full playback/export, released builds and Windows remain open.

One-video versus declared input support, preview budgets, fonts/graphemes and
actual effect-coordinate output checks stay in the separate execution queue.
