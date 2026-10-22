# Confirm native media exit before releasing its workspace

This follows Mini's source-bound analysis checkpoint #331 and repairs the existing
private local-media/asset owners used by seven mirrored clients and the existing
compiled A16z consumer. The partial
registry remains eight features / twelve unique consumers. Full ownership and
whole-template acceptance remain 0/28; Chan is excluded.

## Root cause, reproduction and responsibility

Native `LocalMediaJobs.cancel` acknowledges an abort request and changes state
only when its adapter's process promise settles. The private client accepted any
non-running status as completion. After a failed status read, it requested cancel,
swallowed its failure and returned before observing exit. Signal/disposal and the
catch path could also send the same cancel again. The asset owner then removed
source/output reservations under a possibly running producer, and Stop
classification could erase the uncertainty flag. A later native writer could
still own those paths.

Parent counterexamples exercise the actual private client: unknown status accepted
as success, an acknowledged abort treated as exit after a read failure, and a lost
cancel reply causing a second cancel request. Source/gray reservation tests expose
premature cleanup and lost uncertainty during Stop, with a known-stopped cleanup
control. Further REDs cover an indefinitely delayed start, unbounded accumulated
output, missing output sequence, oversized events and invalid subscriptions that
previously created a job before validation.

The repair extends existing owners; it adds no common module or host capability.
The private client owns fixed requests, job identity, one cancel, bounded output
and same-job status observation. The asset owner retains exclusively reserved
workspace when start/exit is unknown. Template coordinators keep UI, fallback and
planning policy; known decoder failures remain distinguishable from uncertain
execution. Existing generated clients/helper copies receive version updates. Archive's
active legacy QuickScore adapter now propagates terminal native errors, retains
its output on unknown exit and awaits all sibling settlements. Its metadata cache
and evaluation algorithm are not migrated to `clip-analysis` in this feature.
The unused legacy PCM helper declarations in the four photo sources are still
unreviewed code, not claimed as migrated execution paths.

## I/O, lifetime and error contract

Arguments/subscriptions and the exact 256 KiB serialized start request are checked
before dispatch. Job start/status observations have five-second bounds. Unknown
starts are terminal and never resubmitted. A late identity can stop only that
original job once; it does not recover caller success or cleanup authority.

Normal job output requires recognized states, complete ordered cursors, at most
eight events/page, at most 4096 UTF-16 code units/event, and at most 4 MiB of
accumulated UTF-8 chunk bytes across stdout/stderr. Output drains to an empty final
page. A status/stream error remains a failure even if a later read confirms exit.

Cancel acknowledgement is separate from process exit. Read failure, signal and
disposal share one captured cancel request and a five-second exit observation
budget. Successful read recovery permits ordinary owned cleanup. An unconfirmed
start/exit preserves nested source/output/gray reservations and diagnostic job/path
identity, without mutation of the original thrown object, publication, success or
a decoder fallback. Known settled failure and cancellation still clean normally.

Retained diagnostic paths are not a deletion capability. No cleanup is inferred
from elapsed time or an unknown/expired host job. A lost start identity cannot be
rediscovered without host-side request identity support; this change refuses
replay rather than guessing. Automatic persisted workspace reconciliation is not
implemented by this feature.

## Runtime evidence and limits

Eight actual native SDK cases pass using the exact canonical client/asset sources
and controlled wrapper reply loss: healthy output, known failed decode, lost status,
lost status plus lost cancel reply, normal cancellation, sustained lost status,
lost start identity, and late start identity. The six fault/cancel jobs were first
independently observed running. Each start occurs once; a known job receives at
most one client cancel. The permanently lost start uses an explicitly separate
proof-harness cancel with its independently captured ID.

For sustained read loss and late start, callers return unknown in roughly 5.3 s.
Three nested reservations remain at that point. The evidence harness removes only
its own fixture files after an independent terminal read of the same actual job;
this is distinct from automatic plugin recovery. There are 134 native SDK script
requests, eight jobs, no Project/Draft/import creation and no remaining private
fixture paths. The original is preserved. Actual host state/readback does not
establish an installed PanelHost/UI journey, playback/export or Windows behavior.

Evidence is retained privately under
`clip-highlights-analysis/repro-20261022/mini-job-settlement`. Contracts and examples
are in [local-client.md](../../shared/local-client.md) and
[bundled-assets.md](../../shared/bundled-assets.md). Whole-template source semantics,
remaining legacy clients, persisted unknown workspaces and full acceptance stay
open.

## Build compatibility correction

Parent #331 CI found that A16z imports the canonical private client at build time.
Its generated artifact was rebuilt in that same PR (0.20.7, existing 25 tests pass).
This feature rebuilds it with the new lifetime contract as 0.20.8 and keeps the
existing authoring policy. Raw-client sync stays scoped; Chan remains untouched.
An existing Archive UI regex mistook `=> Promise<T>` transport types for JSX text;
it now checks the actual template UI with the separately tested shared transport
block excluded. Existing bundled-error primary-cause shape is preserved when
cleanup also fails; non-bundled native causes retain their full diagnostics.

## Final compatibility evidence

The affected suite confirms 1,555 distinct cases in 56 files. One initial
bundled-cause compatibility failure was fixed while retaining its established
cause shape; 36 affected cases including the new Archive boundary pass afterward.
The other initially passing cases were not repeated. All sixteen Mini and fifteen
Archive CJS scripts, 24 Gallery builder/operation cases, A16z's existing 25 cases,
299 Python cases with six existing skips, and distribution/public/package checks
are confirmed. Parent #331's A16z-only generated-artifact CI failure is corrected
in commit ce8b0b0915649f5ec9f7c15728ded6c0f83d248c; its replacement CI is pending.

After restoring the legacy bundled-cause shape, three targeted actual SDK followups
cover current Archive unknown-output retention, its known ordinary fallback and
the original native error object's identity when cleanup fails. The initial eight
scenarios and these three followups form eleven successful native scenarios, not
a claim that every initial case was rerun after an unaffected branch change.
The first Archive fixture assumed output existed before a very early cancellation;
we independently confirmed that same job was cancelled, then waited for real output
creation before injecting loss. A cleanup fixture also assumed OS stderr wording;
the corrected check compares the actual original error object. These were fixture
assertion failures, not additional production defects or successes. One empty
fixture placeholder was removed only after its known failed producer and the whole
owned runtime had exited.

Both owned Electron sessions were stopped: 14 processes each, no owned ports/apps
or helper registrations remain. The four nested helper registrations per session
were explicitly removed. Profiles, Projects, source media and evidence are retained.
