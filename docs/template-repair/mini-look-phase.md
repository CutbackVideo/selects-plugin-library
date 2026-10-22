# Mini: own assembly through title/look confirmation

Scope: Mini `0.1.0-alpha.22`, stacked on #321 / `5459c52` (implementation parent `01c3ff0`).
Extend the existing `template-run` owner; add no module. The registry remains
seven features/twelve consumers, still partial. Whole-template ownership review
and acceptance remain **0/28**. Chan apps remain excluded. Archive is not migrated.

## Cause and ownership boundary

Standalone Build previously acknowledged its durable continuation immediately
when assembly returned. Closing the panel during the following title/look save
left no discoverable workflow. The selected entry also had no durable record of
its decoration recipe/outcome. A failed reply cannot establish whether that save
finished. Rerunning by labels or current settings could duplicate work or approve
a Draft the user edited after the original save.

Keep the original workflow active through decoration confirmation. `workflow`
extends the existing continuation store; its older assembly-only `run` API and
photo/Gallery consumers retain their contracts. Freeze original inputs and
selected font/program assets before media side effects. Publish the exact
prepared look recipe once, then use it after remount/restart, regardless of
current settings, fonts, clock or assets. Selected runs first look up their exact
app-supplied identity, including completed runs, before planning or importing.

The original assembly publishes an immutable snapshot before saving. The look
phase must match that whole exposed SDK state before editing. Its deterministic
phase identity receives an exclusive run claim. The actual decoration operation
calls an injected pre-save hook after program verification: snapshot all exposed
rows, exact programs/controls, placement, transforms, source windows and sound;
confirm the bounded snapshot file and small receipt can be represented before
commit. Reread the saved Draft and publish its receipt in that same SDK invocation.
A fresh SDK read independently compares the saved state before reporting success.

A known pre-save failure can retry only the same frozen recipe, through an
exclusive generation lock plus exact-byte claim replacement. A claimed/unknown
save never replays; a late SDK receipt can finish it. Manual changes to title,
source, sound, transform or other rows prevent adoption and are preserved.
Completed payloads move under acknowledged history: active discovery stays bounded
and an exact selected-run lookup can still verify the historical result.

Canonical snapshot comparison sorts object keys. Legacy assembly requests keep
their original JSON order when copied: reordering an existing request would
invalidate its established digest. A dedicated integration failure caught this
regression before delivery. UI messages distinguish known pre-save failure from
an unconfirmed save; Finish can recover its frozen inputs without current assets.

## Evidence

- The parent actual standalone callback clears the discoverable record at
  decoration handoff: the new regression is RED with `null` versus required
  pending workflow. The same case passes on this change. Initial owner cases also
  fail on the parent, which lacks phase ownership.
- Sixteen focused workflow/callback cases cover lost replies, late commits,
  remount, known-no-save retry, concurrent windows/retries, caller mutation,
  manual edits and full shipped title/fonts with actual SDK type checking.
  The 22 existing program-intent cases still pass. A fresh UI also restores the
  known Draft while its saved recipe remains pending, without preparing it again.
- Related suite: **929 tests / 27 files**, all pass, including existing photo/
  Gallery atomic authoring, programs, graphics, transforms, Audio and run owners.
- Actual SDK: two retained disposable test Drafts, four workflow commits; full
  Mini title, its two fonts, photo motion and Soft look save/read back. Losing the
  completed look response recovers the same Draft with one decoration dispatch.
  Maximum emitted request: 163,025 bytes, below the 256 KiB transport limit.
- Stop/clean the owned Electron runtime, start it again and recover the exact
  stored run with zero new Drafts, imports, Projects or decoration dispatches.
  Then manually change the disposable Draft's transform (one additional fixture
  commit); recovery rejects and preserves that saved edit. Across these cases,
  all 64 original file hashes, Project resources/files and the earlier Project
  remain unchanged. All owned runtime launches are stopped and cleaned.
- Final-version creation/lost-reply/restart use the exact owner/operation code
  in this change. Earlier manual-edit evidence uses the same serialized SDK
  operations before a UI observation callback was added. The new callback has
  its own RED/GREEN remount case. This is not installed PanelHost UI or rendered
  output validation.

The parent #321 CI also exposed an incomplete builder-test fixture: it copied
only Audio inputs after the builder gained program output. Commit `5459c52` adds
all canonical inputs and verifies both stale outputs are detected without writes;
all nineteen Audio tests pass. This is a test-fixture correction, not a runtime
Audio change.

## Still required

These are observations exposed by the SDK, not physical source-content or nested
resource attestation. Installed PanelHost interaction, whole-video playback/export,
Windows, original-file semantics, analysis/cache budgets and per-occurrence photo
motion remain open. Mini's current `byRid` policy still needs separate review.
Archive and the remaining template flows require their own complete ownership
classification and verification. This checkpoint does not complete Mini or the
28-template objective.
