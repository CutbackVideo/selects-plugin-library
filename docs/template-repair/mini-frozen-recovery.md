# Mini: recover historical work without executing obsolete assembly

This follows `mini-assembly-intent.md`. It completes the connected historical-run
admission/retirement feature, not Mini's whole-template acceptance. Chan remains
excluded. The registry is still seven features and twelve partial consumers;
ownership and whole-template acceptance remain 0/28.

## Reproduction and repair

A pending Mini run preserves its exact original assembly source and request
digest. Installing corrected code did not stop the continuation from executing
that stored source. An already-saved wrong assembly could also match its own
receipt and proceed to title/look authoring. A regression reproduces a frozen
60-frame plan whose operation saves 90 frames: the parent adds another look
commit, despite the plan mismatch. This is separate from comparing a saved Draft
with its receipt.

Mini now supplies an optional historical-run admission policy to the existing
`template-run` continuation owner. Its assembly contract header distinguishes
current checked operations from older ones. Headers are contract routing for
trusted local template code, not a security boundary or proof of arbitrary source
safety. The original source, scope, request digest and frozen finish recipe are
never substituted under the same run identity.

There are three distinct paths:

1. An unstarted or positively recorded pre-save failure can be exclusively
   claimed and terminally retired, without dispatching authoring. Existing claims,
   unknown outcomes and saved results are never overwritten as no-saves.
2. A saved historical assembly must pass a read-only comparison against its
   original picks, ordered cut boundaries, observed per-source insertion clocks,
   source windows, normal speed, managed crop, canvas, duration and music policy.
   The same Mini policy functions generate both new assembly and this verifier;
   planning formulas are not copied into a separate recovery implementation.
3. A claimed/unknown operation remains discoverable and cannot replay. A late
   receipt can later recover its exact result through the ordinary owner.

Semantic admission runs even when a frozen look recipe already exists, so a
remount cannot skip it. Compatible historical results finish with their original
title/fonts/programs. For an old Beat punch operation, its computed origin must
match the actual placed source window; incompatible old effects are refused,
rather than rewriting the frozen recipe. A rejected unstarted/retryable look is
retired too. A transport/read failure or incomplete observation is an unavailable
result, not evidence of a plan mismatch: it preserves the frozen look for read
retry and cannot retire or dispatch it. Already saved or in-flight look phases keep their actual status and
saved edits. A fresh app run is required to use corrected authoring code.

## Existing feature contract

`executeTemplateRun` gains opt-in `retireUnstarted`; existing photo/Gallery callers
keep their defaults. The existing Audio inspector tags its own confirmed-value
mismatches with `IMAGE_AUDIO_MISMATCH`; SDK read exceptions and missing capabilities
remain unavailable. Existing messages, return shapes and callers are preserved.
The verifier returns a bounded `verified`/`mismatch`/`unavailable` result, and only
a declared `TEMPLATE_ASSEMBLY_MISMATCH` can retire a rejected look. A fresh exclusive `wx` claim or the existing exclusive retry
generation lock prevents a competing window from authoring the same operation.
Only the exact owned claim is conditionally replaced. A lost retirement response
is reread, not assumed successful. The terminal `retired` record reports
`TEMPLATE_RUN_RETIRED` with a proven no-dispatch outcome and is never retryable.
Actual older owner code rejects this new terminal status instead of interpreting
it as its retryable `notSaved` phase. This deliberate protocol refusal prevents
an old phase from reviving obsolete work.

`workflow` gains optional `retireUnstarted` and `verifyAssembly` options. It copies
them before awaits, validates the original root/phase records, checks liveness
around admission, and preserves the separate assembly/look receipts. Verification
failure does not authorize replacing unknown or saved state. Independent saved
state/program checks still run before success; semantic admission does not replace
them. A retired assembly's discovery tombstone records a proven no-save; the old
payload remains in acknowledged history. A retired look retains the known Draft
and its frozen workflow for inspection.

Mini's new `scripts/verify-assembly.js` is generated from existing canonical
input/Audio readers and local `dev/assembly-policy.js`. It never calls a mutator
on the saved target. Per-source timing probes are private, unsaved Drafts; there
are no media imports. Source facts remain bounded to 50 per batch, 256 picks and
the existing 90-second read request deadline. The verifier and caller check the
known Project/Draft identity, reply shape and emitted source budget. Both the
standalone panel and selected-template entry apply the same policy, before new
media/asset preparation. Current-contract runs keep their existing path.

## Evidence

- The unchanged-parent standalone flow makes two commits for the controlled wrong
  plan; the new regression requires and observes one. Initial owner tests also
  fail on the parent because retirement and semantic hooks do not exist.
- Fifteen frozen-owner/entry cases cover unstarted/saved/positive-no-save,
  concurrent old/new windows, actual older owner code, both entry points, late
  assembly/look receipts, remount and terminal look retirement. Sixteen generated
  verifier cases cover 23.976/25/30/60 fps, crop, unexpected media, source windows,
  playback policy, music/fades, old punch origin, target preservation and actual
  SDK declarations.
- The affected suite passes **1,096 cases in 32 files**. All sixteen existing Mini
  CJS suites, twenty-four Audio/Gallery builder cases and Python 299 tests (six
  existing skips) pass. Public-source/package/module/generator checks pass.
  Builder tests also confirm stale verifier output is detected and regenerated.
  The old owner is a hash-checked verbatim fixture: a Git-history-free environment
  reproduces the initial missing-history failure and passes after that correction,
  so CI does not need the parent commit objects.
- Actual macOS SDK uses exact historical `8fe2f3a` operations and the current
  recovery helper/verifier. The real mixed-clock old Draft ends `[25, 57]` for a
  `[25, 56]` plan: it remains unchanged and receives no look commit. An unstarted
  old assembly retires without creating a saved Draft. A compatible historical
  Draft completes its actual shipped title, two fonts and Soft look; a controlled
  lost completed-look reply and fresh realm reuse the same Draft without replay.
- Three explicit retained test Drafts, five fixture commits; no new Project or
  imports. Three existing source-file hashes and prior Project catalogs/files
  remain unchanged. Stopping/cleaning and restarting Electron recovers the exact historical runs
  with zero new Drafts, imports, Projects or authoring dispatches. Creation and
  restart samples precede the final typed-read classification; final current-code
  readback also confirms those retained results. A further actual SDK case injects
  a temporary verification read failure, preserves the original frozen look, and
  completes that same Draft on retry without repeating assembly.

The runtime harness reads the current repository verifier assets and exercises
the actual SDK/helper; this is not installed PanelHost interaction. Whole-video
and audio playback, export, Windows, physical/nested source attestation, remaining
planner/analysis/cache behavior and other templates remain open. No release or
deployment is performed.
