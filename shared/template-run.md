# Durable template run ownership and saved receipts

`template-run.js` owns one app-supplied `runId` across panel remounts. Its first
consumers are Four Photo Reveal and Camera Shutter Dump. It reuses the existing
`shared/local-client.ts` file adapter and public SDK; no new client IPC, SDK
capability, global runtime module loader or cross-plugin file import is added.

## Input and lifetime contract

`executeTemplateRun` receives the original SDK object, its initialized local file
adapter, `{pluginId, libraryId, projectId, runId}`, a normalized request, a liveness
predicate, a performer and an independent saved-result verifier. Requests contain
ordered picked Resource IDs/kinds and effective output choices; display names and
incidental transport paths are not identity. The scope is canonicalized and
hashed separately from the request. A changed request under the same run ID is
refused rather than silently replacing the old work.

The public `getProjectDraftScaffold` owner must match the pinned library/Project
before preparing the run and again immediately before authoring or saved-result
recovery. The panel's liveness check pins run, Project and library. These are
observations, not a host transaction locking a Project against relocation.

The record is under the existing installation-independent plugin data root:
`.selects/plugin-data/<pluginId>/template-runs/<scope-sha256>.json`. It contains
version, scope, normalized request digest, unique owner and status. A saved record
adds only the Draft ID, fps, duration, canvas and Image clip receipts, not original
paths, image bytes, full recipes or private diagnostics. Reads check file size
before loading and are limited to 48 KiB, matching the existing atomic file API.

## Exclusive claim and SDK-side completion

1. Read an existing record. A valid saved receipt gets independent persisted
   readback and returns the same Draft. Active, failed, unknown, mismatched,
   unreadable or corrupt records never cause a fresh authoring write.
2. Check existing SDK file capabilities, then create a claim using
   `files.writeFile(..., {flag:'wx'})`. The canonical adapter sends one SDK
   `writeChunk` in exclusive mode. Filesystem exclusive creation, rather than a
   per-panel mutex or check-then-write, admits one owner across local clients.
3. If the claim response is lost, reread it. This invocation can proceed only
   when its unique owner was durably recorded; no authoring was dispatched yet.
   A concurrent different owner observes the existing state.
4. The performer prepares its existing inputs/assets and serializes the complete
   authoring script, then awaits the dispatch callback. That callback rechecks
   target ownership/liveness and records that authoring may now have been sent.
5. `writeTemplateRunResult` is serialized into the same SDK script after the
   complete Draft authoring operation. Before replying to the panel, it attempts
   a conditional replacement of the exact owned claim with `saved`, `notSaved`
   or `outcomeUnknown`. The generic image authoring module provides the minimal
   receipt. The existing SDK `compareAndReplace` is reused; its per-renderer
   serialization is sufficient here because exclusive creation admitted only
   one authoring owner. An unrelated changed record is never overwritten.
6. If the script response is lost, reread the journal. A positive saved record
   permits readback and recovery without another save. Otherwise leave the
   original claim intact so a late SDK-side receipt may still land. A proven
   failure before dispatch can conditionally mark its claim `notSaved`.

JSON is escaped to ASCII and encoded by a small explicitly supplied function
inside the SDK script; that environment has no browser/Node encoding globals.
Functions are passed explicitly when serialized, preserving real minification.

## Outcome policy and boundaries

- `claimed`: the owner may be preparing, authoring or awaiting an unknown
  response. No automatic timeout takeover or lease expiration is safe.
- `saved`: recover only after Project/Draft ownership, frame grid and all Image
  identities/intervals/count are independently read back. A manual edit that no
  longer matches is reported for inspection, never overwritten.
- `notSaved`: no Draft commit was confirmed or started by that operation. Start
  a new app run to explicitly retry; remount is not a retry command. Preparation
  may still have registered reusable Project audio.
- `outcomeUnknown`: commit may have happened without a usable receipt. Inspect
  the Project; do not automatically re-author.

A positively acknowledged Draft whose receipt write fails remains a known saved
Draft in the current invocation. The old claim prevents blind remount retry;
future receipt repair/reconciliation remains a separate concern. These two local
file updates and the Draft commit are not one database transaction. An already
issued commit cannot be canceled by closing the panel. A process crash before
dispatch can conservatively leave a claimed run; do not invent proof it is dead.

The contract covers local SDK clients sharing the same plugin data filesystem.
It is not a distributed lock across machines or a tamper-proof record against
external file deletion/replacement. Standalone panel Create Revised actions
remain explicit new operations without an app run ID; they are not deduplicated
by this feature. Other template migrations, audio-import ownership, complete
design readback, installed execution, playback/export and Windows execution
remain separate acceptance gates.
