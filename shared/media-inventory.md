# Bounded Project inventory observations

`readInventoryPages(run, script, config, fill, wanted, options)` owns one read-only
catalog observation across pages. Mini and Archive Vlog are its first consumers.
It extends their existing pager into one canonical source, not a module per
helper. Their existing script runner, error localization and busy/session read
retry policies remain in use. The runner now accepts the owner's deadline and
wait method; committing calls never use those read-only settings.

This responsibility is distinct from selected-original identity/native facts in
`native-image-input`, filesystem/media reservations in `bundled-assets`, browser
execution in `analysis-worker`, backend jobs and persistent run/save recovery.
Existing generic `readMediaPages` helpers and the other five custom inventory
consumers need their own schema/effect review before reusing this feature. In
particular, verification must not replay a measurement or mutation disguised as
a read. The Mini/Archive inventory scripts used here only read SDK metadata.

## Contract

- `run(summary, scriptForAttempt, false, scope)` supplies a structured page;
  `fill` creates the script for the attempt. `config.projectId` is required and
  `config.only` retains its existing SDK alias domain. Persistent handed Resource
  UUIDs are resolved by their separate existing entry path. `wanted()` identifies
  the current mounted Project/read; a false or throwing callback ends the scope.
- Rows are paged before projection, 32 raw Project resources per page. Return
  `page.total`, nonnegative finite `page.elapsedMs`, optional nonnegative integer
  `page.probeCount`, `resources`, `photos`, counters and boolean `incomplete`.
  Selected video rows require a nonempty SDK `rid`, video kind and positive finite
  duration in seconds; photos require a nonempty SDK `rid` and photo kind. A
  response cannot carry more usable rows than remain in that raw page. Repeated
  identities are rejected rather than merged or silently dropped.
- First collect the bounded pages. Then read each page again with measurement and
  probe budgets zero, comparing its complete projected JSON values and total.
  Key order is normalized; array order, IDs, names, dimensions, paths, durations,
  availability flags and counters are retained. No lossy token/hash substitutes
  for that comparison. Different counter/key shapes cannot become valid sums.
  Stable incomplete observations retain `incomplete`; they do not become complete
  facts. Transport objects are cloned, never deleted from or appended to.
- Successful output preserves the previous inventory shape and ordering. Counters
  add, boolean counters AND, month buckets add and `incomplete` ORs. Catalog
  membership/metadata observations do not establish original-file availability,
  content identity, full decode validity or saved-output correctness.

## Caller admission and candidate ownership

`isInventorySnapshotCurrent(snapshot, inventory, projectId, currentProjectId,
loadingProjectId, mounted)` binds permission to start a build to the exact object
confirmed by a successful observation, its current mounted Project, and no read
in flight for that Project. This is a local admission predicate, not a revision
lock or security token. A previously rendered list may stay visible after an
error without granting permission to build. A new confirmation object cannot
approve an older React render still holding the previous inventory object.

Both callers revoke confirmation synchronously before awaiting a refresh; only
a live successful read installs a new confirmation and displayed inventory.
A stale Project callback stops before revoking another Project's confirmation or
dispatching a read. Build and Another Version check the same predicate as the
button/readiness state. Build owns result clearing after its other input gates;
Another Version does not erase an existing result before delegating admission.
Finish title/look still uses its build-owned facts and result, independently of
a catalog refresh failure. No saved Draft is deleted by observation failure.

Candidate reuse compares the complete normalized video row values, including
same-ID duration, dimensions, path, name and availability changes. Mini retains
its additional waiting counters for its existing polling policy. Unchanged rows
retain candidate reuse. The unused merged photo-size cache has been removed;
selected-original verification supplies dimensions per build, retained per
result for a later Finish action.

## Budgets, lifetime and errors

Default overall deadline is 120,000 ms; an override must be finite 1..120,000 ms.
A 50 ms watcher observes owner replacement while a query is pending. One deadline
covers collection, reobservation and retries. The existing runner receives the
remaining time, capped by its existing 90-second query limit, and checks liveness
before every dispatch, including a lost-session retry. Retry waits belong to this
observation and their timers are cleared when it ends. Query response, final
verification and post-cleanup final return all check the scope; late responses
cannot succeed. Every timer cleanup is attempted even if another throws. Failed
cleanup rejects as terminal with safe public text and private causes/diagnostics,
preserving a prior read failure rather than concealing it.
An already-dispatched read may still finish in the SDK: this helper cannot cancel
the remote query and does not describe ignoring its reply as remote cancellation.

The request config is limited to 64 KiB UTF-8, script source to 128 KiB, a projected
page to 192 KiB, aggregate projected data to 8 MiB and raw total to 16,384 rows.
Existing SDK transport limits still apply. Invalid/malformed/oversized input is an
explicit error, not a partial list. Nonfinite numbers, unsupported/cyclic values,
invalid counters and contradictory totals reject. Caller work budgets are reduced
across collection pages; retry and verification measurement are disabled.

Own errors carry safe `publicMessage` and `MEDIA_INVENTORY_INPUT`, `INVALID`,
`BUDGET`, `CHANGED`, `STOPPED`, `TIMEOUT` or `CLEANUP` codes. Underlying caller read errors
retain their existing diagnostics/type. No mutation, import, Draft, filesystem,
worker or media process belongs here. Committing requests are neither retried nor
coupled to the read deadline. A changed observation is not automatically restarted.

Reobservation is a bounded consistency check, not an atomic Project snapshot,
revision token or lock. Changes after the check, or changes restored between
observations, remain possible. Future build/save input validation still belongs
to its existing selected-source owners. The second pass increases read work and
large/slow Projects may reach the declared budget rather than report a false
complete list. Mini/Archive also stop sending their unused photo-size cache in
catalog requests; build-owned native facts remain separate.

## Distribution and evidence

The single source is registered in `shared/panel-modules.json` and embedded in both
panels by `node tools/sync_panel_modules.mjs`. Installed panels remain self-contained.
See `docs/template-repair/media-inventory.md` for TDD, compatibility, actual SDK
observations and remaining whole-template/full-ownership acceptance gates.
