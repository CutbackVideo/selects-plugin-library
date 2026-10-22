# Plugin-private local SDK client

`local-client.ts` composes existing public `runScript`/`call` methods into local
files, media jobs and editor helpers. It is not a new public SDK, renderer IPC or
cross-plugin runtime import. `panelLocalClient` keeps the private composition in
a WeakMap keyed by the original SDK object; a child still receives that original
SDK. Do not replace its identity with a cloned object.

## Connection lifetime and template completion

`withPanelLocalClient(Component)` observes the read-only `files.environment`
bootstrap before mounting its child. A connection belongs to one SDK object,
Project, library and app template run. A scope change disposes the old private
client and starts a fresh connection; stale state never mounts the new child.

- A thrown request, an SDK error reply or an unusable environment enters a safe
  connection error state. Raw output/paths/stacks remain private diagnostics.
- A 30-second observation deadline reports a timeout. It does not repeat or
  cancel the underlying read. Late successes are disposed without binding or
  mounting the child, and late failures cannot report for a replaced scope.
- A visible standalone panel shows an alert. A hidden app template run also
  calls `finishTemplate({error})`, since its child will never mount to finish it.
  Reports are deduplicated by SDK and run scope within the wrapper, including
  React StrictMode/effect replay and rerenders. Failed completion transport is
  contained and not automatically replayed; delivery is not inferred from a call.
- An explicit new run may reconnect after a prior failure. A successful
  connection clears the observation timer, registers the private client before
  mounting the child and removes only its own binding during cleanup.

This does not catch every possible child render/operation failure, guarantee
delivery over a broken completion channel, or cancel already dispatched Draft
writes. Existing template-run ownership and saved receipts remain responsible
for mutations and their recovery.

## File/process transport and distribution

The existing client keeps 48 KiB file operations and 256 KiB script/result
budgets explicit. Complete replacement writes use a private sibling file before
rename; exclusive creation and append remain single bounded operations. Unknown
write outcomes are not automatically retried. Local job disposal/cancellation
continues to use the existing media job contract.

The existing `tools/sync_panel_local_client.mjs` now supports a scoped migration:

```sh
node tools/sync_panel_local_client.mjs --only=no14-still-video,camera-shutter-dump
node tools/sync_panel_local_client.mjs --only=no14-still-video,camera-shutter-dump --check
```

The check is read-only. All requested consumers/markers/wrappers are validated
before any replacement, unknown/invalid scopes fail, and explicitly excluded
Shortform/EO consumers are refused. Windows line endings are accepted. With no
scope the legacy full-repository synchronization behavior remains available;
do not invoke it for a scoped repair. Multiple file replacements are not one
filesystem transaction; final drift checks remain required before publishing.

The photo consumers previously had older file batching/cleanup copies. Their
scoped synchronization now uses the existing canonical implementation as well
as the new connection behavior. a16z imports the canonical source directly and
uses its existing bundler. Other embedded copies are not silently migrated.

The additive read-only `files.fingerprint(path)` forwards the existing native SDK
response `{size,sha256}` or `null`. File contents stream in the native host rather
than through browser read chunks. Analysis callers validate the returned identity
and do not interpret thrown/incomplete replies as absence. No new public SDK or
Electron capability is introduced; released-version compatibility remains unverified.

## Native media process ownership

Media argv, optional signal/callback subscriptions and the exact serialized script
budget are validated before start. Inputs become a fixed SDK request; no shell is
introduced. The existing job API is composed directly, with no new host SDK or
Electron capability. Ordinary known decoder failures retain their failure contract.

A process is complete only after a recognized terminal state from that same job.
Unknown states, missing/gapped cursors, truncated pages, oversized event text and
output over 4 MiB of cumulative UTF-8 chunks cannot report successful output.
Native pages contain at most eight events of 4096 UTF-16 code units each. Final
output drains to its empty page before success. The limit covers stdout plus
stderr; callbacks do not bypass it.

Start and individual status observations are bounded at five seconds. Expiry is
an unknown result, not evidence that work did not start or has exited. A start is
never replayed. If its original identity arrives after expiry, the late observer
may cancel that original job once; it cannot turn the caller into success or
authorize temporary cleanup. A permanently lost start identity cannot be found
by this interface and needs inspection of the original host/session.

Each known job owns at most one cancel request, reused across signal, disposal,
status-read failure and error cleanup. Native cancel acknowledges an abort
request; it does not wait for process exit. The client continues independent
read-only observations of the same job. Lost cancellation responses do not cause
another cancel. Failure recovery has a five-second settlement observation budget.
A still-unknown exit returns terminal `LOCAL_MEDIA_SETTLEMENT_UNKNOWN`, retaining
the known job ID in private diagnostics and `preserveTemporaryFiles:true`.

The existing asset owner preserves exclusively reserved source/output files for
unknown starts/exits. It does not publish a derived result or convert uncertainty
into an ordinary decoder fallback. Known settled failures and normal cancellation
retain ordinary owned cleanup. No automatic deletion of an uncertain workspace
on remount/age is added: a filename or elapsed observation budget is not proof of
native exit or later file ownership. See
[the checkpoint](../docs/template-repair/local-media-lifetime.md) for actual SDK
fault/recovery evidence and remaining installed-app acceptance boundaries.
