# Archive scene observation: existing app contracts and open evidence

Read-only app snapshot:
`cutback-client@0e4f7a595095e826acfd8aa7d2edcaa507210ffe`.
No app files, tests, database, runtime, backend or public SDK were changed. Source
inspection is not a reproduction of stale production search hits.

## Actual call path

`electron/mcp/script-runtime/source/read-handle.ts:266`
→ `src/mcp-bridge/resource-sequence-read.ts:31`
→ `src/mcp-bridge/McpRendererBridge.ts:2972`
→ `src/domain/usecase/SearchStoryboardService.ts:58`
→ `src/external-services/out-adapter/CutbackServerAPIAdapter.ts:850`
→ `src/js/main/services/CutbackAPI.ts:273`.

The SDK validates analysis availability/local Sequence and Project/Library scope;
the renderer expands synced resources and maps hit coordinates. Server search
receives query, compressed sequence or Resource IDs, page size and token. The
inspected request does not pass the current file's digest or compare it against a
stored analysis-generation digest. Resource `revision` instead hashes analyzed
Sequence JSON and transcript snapshots (`resource-session.ts:52`), not disk bytes.

## Existing identities must be preserved

| Value | Source | What it establishes |
| --- | --- | --- |
| Media checksum | `electron/main/utils.ts:471` | Hash of ffprobe JSON containing path/name; not full file contents |
| Analysis request fingerprint | `AnalysisServerAPI.ts:40`; `AnalyzeResourceTasks.ts:1253`; adapter `:580` | Existing analysis submission/reuse key; this capability already exists internally |
| Actual content fingerprint algorithm | `analysisCache/analysisCacheFingerprint.ts:22–57` | Size plus first/middle/last256KiB SHA256; files up to768KiB read fully, larger files sampled |
| Missing fingerprint policy | `AnalyzeResourceTasks.ts:1269`; submission spec `:106` | Best effort: null can still permit analysis; this turn read rather than ran the test |
| Analysis result persistence | `AnalyzeResourceTasks.ts:1683`; `Resource.ts:1711`; database adapter `:213` | Sequence/transcript/status/captions linked to Resource; no separate original-generation fingerprint field found in those explicit mappings |
| Sample media session | `SampleMediaFileService.ts:3087,3110`; `ServerAPI.ts:63` | Resource/track/path/upload/timestamps; not full-original hash in the inspected representation |

Unconstrained metadata or the server's own database may contain more information.
The app code does not establish its absence. A missing declaration field is not a
sufficient reason to invent a new public SDK.

## Relink is intentionally different from reanalysis

`project/mediaRelink.ts:10–56` compares kind/duration/sample rate/frame rate/size/
channel count and optionally name. `RelinkFilesModal.tsx:138–157` retains existing
media and changes its path/metadata. `Resource.relinkMedia:875–885` replaces content
and media-source paths while retaining analyzed Sequence/transcription/status.
`Resource.spec.ts:941–965` explicitly requires that preservation. Normal relocation
of the same file must keep working; invalidating every relink would violate this
existing policy.

Separate reanalysis uses `AnalysisServerAPIAdapter.ts:186` and
`workflow/definitions/analyzeResourceWorkflow.ts:513`, with sampling/request/poll/
save stages. Relink does not itself invoke that workflow in the inspected path.

## Open experiments, kept separate from observations

1. Analyze A, replace the same path with B while keeping Resource state, then
   observe which actual server index/hits are returned.
2. Analyze A, relink to a different-content B with matching media metadata, then
   contrast this with moving the unchanged A to another path.
3. Change bytes outside the sampled areas of a large file. A matching sampled
   key would reflect unread bytes, not a SHA-256 collision.
4. Establish existing server index-generation storage/reuse and clock provenance,
   including synced/native offsets, before selecting a repair interface.

Archive's current full-content checks before/after analysis and before save confirm
current originals remained stable during that run. They cannot by themselves
prove those bytes generated an older server index. Existing input owns current
source facts; the planned `media-inventory` scene-observation extension owns
admission of index-generation/result evidence. No new module or public API was
implemented. Actual backend stale-hit behavior remains unverified.
