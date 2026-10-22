# Mini: bind local evaluation to original video contents

Mini alpha.25 completes this connected source/evaluation/cache/recovery slice.
It does not complete Mini or the all-template repair. Chan remains excluded.

## Observed failure and repair

The standalone panel already invalidated candidate caches when inventory metadata
changed. That was not the defect. A previous local result was retained by Resource
ID without checking the physical original; its old disk key also used size/mtime
facts instead of complete contents. A valid red MP4 replaced by blue at the same
path/size/mtime therefore supplied the old brightness to the planner. A deleted
original could also reach another assembly dispatch. The selected-file entry did
not run local video evaluation at all.

Actual Build regressions generate 4-second, 128x96 red/blue MP4s, pad them to equal
size, preserve mtime, run the actual local scorer/FFmpeg and capture the planner
and assembly boundary. On the parent, unchanged control passed, replacement
performed only two total decodes instead of three, and a deleted original still
reached a second assembly dispatch. A separate parent counterexample changes the
original after scoring/planning and still reaches assembly. Selected-entry RED
observed zero local decodes where two were required.

Both entries now call the same source-bound scorer on each build. Unchanged
contents reuse verified persistent scores; same-facts replacement reanalyses only
the changed original. No in-memory success bypasses content confirmation. Mini
reobserves the analysis source identities before dispatch; the generated assembly
rechecks at entry and before commit. The durable recovery helper carries the
same observation into saved-assembly/look continuation, preserving retry after
unknown access or changed originals. Restoration finishes the original saved
assembly without another assembly save.

## Common feature decisions

- **Extract `clip-analysis`**: frame statistics, cuts, bin/window evaluation and
  candidate projection form a separate evaluation responsibility. Reuse its
  unchanged original algorithm; Mini's roles, scaling, planner and UI stay specific.
- **Extend `bundled-assets`**: JSON derived results, gray transient output and
  opt-in confirmed cleanup reuse existing file snapshots, publication, reservation
  and media lifetimes. Existing default consumers keep their prior policy.
- **Reuse `native-image-input`**: existing `observeSourceFiles` provides the
  before-authoring/commit/recovery checks. No new source-observation module.
- **Extend private `local-client`**: one read-only `files.fingerprint` composition
  over the already-existing native SDK. It streams contents in the host; no new
  host SDK, renderer IPC, Electron version bump or shell permission is added.
- **Reuse `template-run`** unchanged: freeze optional source observations in its
  existing pending config; Mini's semantic admission callback supplies policy.
- **Extend registry checks**: explicit `requires` verifies dependency delivery
  before rewriting copies. Eight registered features / twelve unique partial
  consumers; six remaining legacy QuickScore consumers need their own review.

Generated shared/client copies require version bumps in Mini, Archive, No14,
Camera, Four Photo, Polaroid and Gallery. Archive and photo templates receive
compatible helpers/client only; they do not silently adopt Mini evaluation.

## Evidence and scope

The affected suite confirms 1,530 distinct cases in 53 files. One isolated
fixture initially lacked the newly captured client; it was corrected. The
follow-up 110-case affected slice includes the new workspace/client capture
counterexample and 24 Gallery builder/operation cases. All sixteen Mini CJS
scripts pass; 299 Python cases pass with six existing skips. Public/package,
module/client-copy, generated-operation and ownership-tool checks pass.

Focused tests cover actual both-entry Build behavior, same-facts replacement,
missing and mid-run originals, invalid windows/budgets/paths/callbacks, cache
corruption, captured inputs/client, shared failure cancellation and settled
cleanup, generated assembly entry/precommit checks, and both-entry durable
recovery/restoration. Real six-clip quality fixtures retain the original
brightness/motion/cut/fade behavior. Dependency/client-copy guards are checked.

Eight actual native SDK cases pass using the canonical private client and exact
common sources: first decode, a new module realm cache hit, same-facts replacement,
missing original, corrupt score repair, cancellation, original replacement after
dispatch, and ordinary decoder failure fallback. The files were 4,928 bytes with
mtime 946684800000; red luma was 0.298039 and blue 0.113725. There were 379 SDK
requests, six decoder jobs and three cancellation requests; no Project/Draft/
Resource creation or imports. Temporary files were absent after each case.
The first runtime harness omitted the private client's job-status bridge and
returned a decoder fallback; adding the actual existing bridge fixed the harness.
It was not a production decoder or evaluator change.

Private evidence is retained under `clip-highlights-analysis/repro-20261022/mini-analysis-inputs`.
Runtime proof uses a Node VM plus native files/media transport, not an installed
PanelHost/UI journey. Whole playback/audio/export, Windows, analyzed-scene data
freshness, later physical replacement, nested sources, and remaining features
are open. Complete feature ownership and whole-template acceptance remain **0/28**.

A separate code review found that the existing private media client swallows a
cancel failure after a status-read exception, while native cancel acknowledges
the abort request without waiting for process exit. Ordinary cancellation is
covered above; simultaneous status/cancel transport loss is queued for its own
reproduction and lifetime repair. It is not evidence of confirmed job settlement.
