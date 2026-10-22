# Mini: discover an uncertain assembly after remount

Scope: Mini `0.1.0-alpha.20`, based on #319 /
`a483e284a70d1ba8829f8942c76942d58b7fc509`. Extend the existing `template-run`
feature; add no module. The seven-feature/twelve-consumer registry remains partial.
Whole-template ownership review and acceptance remain **0/28**; Chan apps excluded.

## Root causes and final behavior

The previous standalone panel kept its original assembly request only in a React
ref. Closing the renderer lost the request and run ID even when the durable save
receipt survived. The actual Build counterexample starts with a durable pending
attempt and an empty ref: the old callback ignores discovery and starts again.
Build now discovers pending work before inventory admission, planning or music
import. Mount discovery also gates new Build. The ref is only a display cache.

`openTemplateAssemblyContinuations` binds plugin, Project and library using the
existing scaffold owner. Store the original assembly source, config and opaque
caller continuation data before dispatch. A bounded ASCII payload (256 KiB)
uses the existing local client's chunked atomic replacement. A small, exclusively
created manifest binds its exact scope and SHA-256 content. The payload is
published first; an orphan payload cannot authorize a save. Changed inputs under
one run, partial/corrupt records, nonfinite data, target changes and excess
observation budgets fail explicitly. Discovery reads at most 64 manifests from a
bounded directory; several unresolved runs are reported as ambiguous, never
chosen by name or timestamp. A newer explicit run is a distinct run identity.

Resume delegates to the same exclusive run owner and Main-side saved receipt.
No uncertain outcome authorizes another save. A positive assembly confirmation
or proven no-save publishes a small completion tombstone before removing only
that run's index files. The tombstone prevents stale callbacks from republishing
a completed run. A lost cleanup reply is recoverable; original execution receipts
remain intact. Completed tombstones are in a separate directory, outside the
active discovery scan. No time-based expiry guesses that a save stopped.

Concurrency testing also exposed a core reader defect: a legitimate atomic
claim-to-receipt replacement between stat/read/stat was called corruption. Observe
again at most three times; sustained changes are pending, stable invalid bytes
remain invalid, and authoring is never retried. Existing photo/Gallery consumers
retain their API; their source copies/generated output and versions are updated.

## Evidence

- Actual standalone Build RED before implementation; immutable input, filesystem
  failure, library scope, ambiguity, large chunked payload, stale completion and
  invalid input counterexamples.
- Real Mini assembly plus canonical local client: late SDK completion is found
  from a fresh VM realm and confirmed with one commit. Concurrent callers share
  the exclusive claim. Minified discovery/serialization and bounded replacement
  observations are exercised.
- 43 focused tests across receipt, callback ownership and discovery; 520 related
  tests across 16 files, including all existing photo/Gallery run consumers, pass.
- Python: 299 tests, 293 pass and six existing skips. Mini panel, SDK types (five
  scripts against actual declarations), i18n (175 keys/ten locales), builder,
  public/shipped files and canonical/generated module checks pass.
- Actual SDK: persist continuation for a previously recorded owned assembly,
  stop Electron, verify owned process/port/app removal, start a fresh daemon with
  the preserved isolated profile, then discover and confirm the exact original
  Draft. No assembly dispatch, Draft, Project or import is added in this check.
  Both Projects' snapshots, owned/control Drafts and 64 original hashes match.
- A final fresh-daemon readback also checks the final stable-invalid-record guard
  and capability checks without new authoring. All runtime invocations are stopped.
  Owned descendants, ports, app bundles and
  empty alias directories are removed; other tasks and persistent user data are
  preserved. App dependency distributions are not claimed to be deleted.

## Remaining work

The index ends at confirmed assembly handoff. Title/look and Finish still need
phase ownership, saved-result verification and remount/partial-failure recovery.
This checkpoint does not claim that a decorated Draft can be reverified against
its earlier assembly snapshot. Hidden entry recomputation under a stable run ID
may reject changed content; recovery of the entire pre-assembly analysis/music
pipeline is not implemented here. Earlier alpha.19 attempts with no index cannot
be inferred from a hash/name. Original-file semantics, analysis/cache budgets,
installed PanelHost UI, full playback/export and Windows acceptance remain open.
