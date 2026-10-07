# Panel host operations

Panels use the existing `sdk.runScript` transport with the canonical `selects`
SDK. Use `sdk.call` only for reads explicitly listed in the installed panel SDK
reference, such as `getEditorState` and `getLocalMediaJobStatus`. A type appearing
in that reference does not make every method callable.

```tsx
const response = await sdk.runScript({
  summary: "Choose an output folder",
  script: "return await selects.editor.pickDirectory();",
});
if (response.isError) throw Error(response.output);
if (response.result === null) return; // User canceled the picker.
const outputFolder = response.result;
```

## Local files and media

Read platform and paths with `selects.files.environment()`. Files use absolute
paths. `selects.files.readRange({path, offset, length})` returns bounded base64
chunks; `writeChunk({path, offset, base64})` writes them. The maximum decoded
chunk is 49152 bytes. Reject missing or truncated results and preserve binary
bytes. Other operations include `stat`, `exists`, `readdir`, `mkdir`, `remove`,
`copy`, `rename`, and `download`.

Start bundled FFmpeg/FFprobe with `selects.media.startFFmpeg({args})` or
`startFFprobe({args})`. Pass argument arrays, with each path in its own entry.
Save the returned `jobId`, poll `selects.media.job(jobId).status({cursor})` (or
`sdk.call("getLocalMediaJobStatus", jobId, {cursor})`), and drain output pages
until terminal. A truncated stream cannot be parsed as complete JSON. Cancel
through `selects.media.job(jobId).cancel()` and observe the resulting status.
Cancel active local jobs when the panel closes; inspect or clean partial files.

File mutations, starting/canceling media jobs, and persisted Project edits
require `allowCommit: true` on `sdk.runScript`. Reads do not. A browser
`AbortSignal` stays in the panel; its handler makes a separate cancellation
script call. Long work must return a job identifier and be observed in later
calls rather than holding one script open.

## Generation and exports

`selects.generation.submit(...)` starts one paid job. Preserve its `requestKey`
and identical input across transport retries, save `jobId`, and reconnect with
`selects.generation.job(jobId, projectId)`. Read `status()` or `result()`;
`selects.generation.jobs(projectId)` supports recovery after reopening a panel.
Unknown submission is unresolved work, not permission to submit under a new
key. Provider completion and output delivery are separate states. `cancel()`
requests cancellation and may not prevent a charge; `retryDelivery()` retries
retrieval of accepted output without another paid generation. These mutations
require `allowCommit: true`. Explain credit use before the user's action.

`selects.stock.searchVideos(...)` discovers footage without importing it.
`selects.export.video(...)` starts an export workflow; save its id and observe
`selects.workflow(id).status()`, with `cancel()` for user cancellation.
`selects.export.still(...)` renders one Draft frame to a new PNG path.
Video composition options can exclude clips/captions or set duration/frame
size while the host owns the temporary snapshot and cleanup. Export accepts a
persisted Project-owned Draft; commit intended working-copy edits first.

## Compatibility and ownership

The installed host must provide the canonical capabilities used by a panel.
Report unsupported operations as an actionable update error. Do not access
renderer containers, repositories, or editor registries through parent windows,
and do not add internal-service fallbacks. A missing operation needs a narrow
canonical SDK extension with its owning validation and lifecycle.

`shared/local-client.ts` and `shared/generation-client.js` are private panel
implementation helpers over these existing transports. They do not define a
new public SDK surface. Rebuild modular panels after changing shared helpers.

## Persistent settings and recovery

Panels must use the host's asynchronous storage API. The iframe remains
`sandbox="allow-scripts"`; its own `localStorage` can throw `SecurityError`.

```tsx
if (!sdk.storage) throw new Error("Update Selects to use persistent plugin storage.");
const key = `progress:${context.projectId}`;
const raw = await sdk.storage.getItem(key);
const progress = raw === null ? null : JSON.parse(raw);
await sdk.storage.setItem(key, JSON.stringify({ requestKey, phase: "submitting" }));
await sdk.storage.removeItem(key);
```

`getItem` returns `null` only for absence. Every storage failure rejects; writes
resolve only after the host accepts them. JSON belongs to the caller. There is
no `clear`, key enumeration, or namespace selector. The host prefixes every
key with `plugin:{mounted-folder-name}:`, including keys beginning `plugin:`.
This isolates this API's keys; it does not isolate the existing shell/file SDK.

Restore before autosave or important actions. Discard stale project/draft reads
and serialize writes. Await a single recovery record before generation or
editing; several keys are not a transaction. Preserve request IDs and uncertain
execution state after an acknowledged operation whose save fails. Stop and
retry saving/reconcile the existing request rather than generate again.

Limits count UTF-16 key and value bytes: 4 MiB per item, 8 MiB per plugin, and
1024 UTF-16 characters per caller key. Browser origin quota is shared and can
fail earlier. Save media/large artifacts in files. The host migrates an audited
legacy-key allowlist before first access, always prefers existing new values,
and retains originals. A quota/access/migration failure is visible and retries
safely. Migration can remain blocked until storage space is freed; no automatic
deletion of original work occurs. Never fall back to iframe storage, script
execution, parent-window internals or IPC for persistence.
