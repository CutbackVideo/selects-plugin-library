# Mini / Archive: confirm catalogs before starting builds

Scope: Mini `0.1.0-alpha.17`, Archive `0.1.0-alpha.11`, stacked on #313's
`04fc621f32bae98b551375e2769811318d6b77ae`. Chan's apps remain excluded.
The partial registry is seven entries / twelve consumers; full feature ownership
and whole-template acceptance remain **0/28**.

## Root causes and ownership

The old pager compared only the total count. A 64-row list rotated after page one
could still return 64 rows, with one repeated ID and one missing ID. The old pager
also checked ownership only before a request, not after the last reply. A changed
prior page, invalid totals and shared frozen transport objects exposed additional
false-success or mutation paths. An actual lost-session runner could resend after
its caller ended, and each read requested the full 90 seconds regardless of the
observation's remaining time.

Extract one `media-inventory` owner for catalog collection, complete-value
reobservation, aggregation and scoped read budgets. Keep the existing actual
runner and its established session/busy retry behavior, but supply the owner wait
method and remaining deadline. Selected-original identity/native facts,
filesystem/media processing, Worker lifetime, backend jobs and persistent run
recovery keep their existing owners. There is no module per paging helper.
Other five custom inventories and generic result pagers still need schema/effect
reviews; no unreviewed measurement or write may be replayed as verification.

Each collected page is re-read and its complete projected JSON values compared;
array order and identity survive. Invalid/changed/over-budget observations reject
without a partial result. No transport object is mutated. The owner clears its
query-observation/retry timers and ignores late replies, while the SDK may still
finish a previously dispatched read. This is not an atomic snapshot or protection
against later/temporarily restored changes. See [the contract](../../shared/media-inventory.md)
for types, ID domains, time units, numeric limits, errors and distribution.

## TDD and consumer compatibility

- Initial two-consumer reproduction: four failures / two healthy controls.
  Expanded parent cases: fifteen failures / seventeen cases, including metadata
  drift, malformed/oversized totals, frozen replies and an unanswered read.
- Repair Mini first: ten cases passed while Archive still failed seven. Then
  extract the canonical source and migrate Archive. Four further actual-runner
  RED cases exposed stale lost-session dispatch and missing remaining time.
- Additional write-isolation and malformed response-shape counterexamples were
  fixed. Final-handoff/cleanup RED cases added a post-cleanup lifetime/deadline
  barrier and retained primary errors while attempting every timer cleanup. The final forty-five focused cases execute the actual pagers and transpiled
  runners. They cover cancellation during a retry wait with zero remaining owned
  timers; healthy 90-second cap, one session retry and 5/15-second busy backoff;
  committing-call isolation/non-replay; work budgets and readback failure.
- Related paging, existing photo/source, asset, module and structural inventory
  checks pass 262 cases across nine files, including 32 caller-admission cases. Stable 4,000-row inventory outputs and
  the five unmigrated custom pagers keep their existing contracts. The old Mini
  spelling assertions now point to executed runner contracts rather than require
  the removed unscoped wait/deadline implementation.

## Caller lifecycle follow-through

Tracing the actual load, button, Build and Another Version callbacks exposed a
second false-success boundary: failed/pending refreshes kept the previous catalog
and still permitted a new build. The cache signature considered IDs/analysis only,
so same-ID metadata changes could reuse candidates derived from old source facts.
Another Version also cleared a held result before Build's independent gates.

The initial caller fixture executed real callbacks: 26 failures / 28 cases,
including a dead merged photo-size cache. Remove that unused cache instead of
introducing another owner. Two more RED cases demonstrated stale Project refresh
callbacks revoking a newer confirmation; two RED cases demonstrated early result
clearing when a preset was absent. Final caller coverage is 32 passing cases,
with stable reuse, successful refresh, and admitted Another Version controls.
The 45 pager/runner cases plus 32 caller cases total 77 focused checks; the related
nine-file suite totals 262. Existing Mini/Archive panel checks also pass. Legacy
signature/reset spelling assertions now match the complete-observation signature
and cache removal; actual behavior is exercised by the new consumer suite.

One predicate in the existing module binds permission to the exact confirmed
inventory object, mounted Project and no pending read. Refresh revokes it before
await; only current successful reads restore it. Failed refresh keeps the last
list and already-created result visible without permitting another build. Finish
still consumes build-owned facts. Full video row observations invalidate changed
candidates; stable observations reuse them. This local binding does not prevent
later Project/file mutation or replace build-stage native preflight.

## Actual SDK evidence

A single new disposable Project imports 64 small unchanged 96x160 PNG fixture
copies. The ten read scenarios use real Project Image aliases, actual inventory
scripts and the actual transpiled runner over the development app SDK. A scoped
`resources()` view injects same-count rotation or a name change to model drift;
the stored Project is not reordered or renamed.

The parent accepts rotation as 64 rows / 63 distinct IDs. Both fixed consumers
reject it as `MEDIA_INVENTORY_CHANGED`. Stable runs make four page queries and
preserve all 64 IDs in order. A prior-page name change that the parent accepts is
rejected during exact value reobservation. Both consumers reject ownership ending
while the second reply returns. All ten scenarios pass; no Draft is created, no
query commits, and exact Project/source snapshots after setup and the earlier
reproduction Project match their before snapshots. All fixture bytes remain equal.

The first harness attempt stopped on a cross-realm array-prototype assertion,
after recording the first four observations. Normalize only the harness's array
representation, preserve that attempt, and resume the same disposable Project;
no create/import operation is replayed. The complete second attempt verifies every
scenario before marking it passed.

This establishes actual SDK data/alias and runner behavior under controlled views,
not a reproduced customer mutation, installed PanelHost UI, full template build/
save/playback/export or Windows acceptance. Hidden selected-file inventory calls
and all remaining template function/side-effect owners still require review.

The subsequent caller-admission change does not rerun the app. Exact transpiled
pager/runner bodies and SDK inventory scripts were compared against the recorded
ten-scenario execution and are unchanged. New caller admission/cache behavior is
verified separately in `tests/media_inventory_consumer.test.mjs`; this is not an
installed-panel UI or whole-template acceptance claim. The task's old Electron,
descendants, owned ports and runtime app directory were cleaned after that SDK
execution; persistent Project/media/evidence state remains preserved.
