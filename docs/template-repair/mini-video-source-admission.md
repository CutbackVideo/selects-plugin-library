# Mini: bind every selected video to its current physical original

Mini alpha.27 extends the existing source-bound local-analysis repair to all selected
Video resources. This is one connected search/cache/assembly/recovery feature; Chan
remains excluded. Eight common features / twelve partial consumers, 0/28 complete
ownership reviews and 0/28 whole-template acceptance remain unchanged.

## Reproduction and root cause

Only local quick-score results contributed physical observations. Server-analyzed
videos could reuse a successful in-memory candidate list even after the original
was deleted or replaced with different bytes at the same path/size/mtime. Both
entry paths still dispatched assembly when an analyzed original was missing or
changed during search/planning. Ten actual-entry parent counterexamples fail after
correcting a fixture that initially omitted the separate local-check boundary.

File existence alone is insufficient: the old original may remain while its Project
Resource is relinked. A further parent assembly counterexample commits despite that
link changing. Resource `hasAnalysis` indicates data presence, not current bytes.
The app's existing media checksum is derived from ffprobe metadata; neither that
value nor a new scene query proves which original bytes produced a server index.

## Responsibilities and final behavior

Reuse `native-image-input`'s complete file observations for every selected video,
including analyzed ones. Capture one private file client before awaiting. Verify
originals before candidate-cache admission/search, after candidate selection, before
assembly dispatch, at assembly entry and before commit. Frozen observations remain
in the existing `template-run` config for saved-assembly/look recovery. A missing or
changed source preserves a saved assembly and prevents look mutation; restoring the
same content resumes the original run without a second assembly.

Extend the same input owner with `confirmProjectSourcePaths`: capture exact Resource
ID/path pairs, read the current Project file tree (including summary folders), and
refuse missing, relinked, duplicate or unconfirmed mappings. Empty scopes read
nothing. Inputs, node count, depth, folder count and observation time are bounded;
no file or Project is written. Mini batches serialized read requests under 32 KiB
and 64 bindings with its existing read-only runner and shared 90-second deadline.
Assembly and recovery use the same function. There is no new common module, host
SDK, renderer IPC or Electron-version requirement.

Scene candidates are reusable only when both their existing selection/query key
and original content observations match. A change invalidates old in-memory
candidates and requires a new query; it does not attest server-index freshness.
Only selected originals are required. Photo verification, local-scoring policy,
planner, music and style remain with their existing owners.

Generated input copies and consumer versions are updated: Mini alpha.27, Archive
alpha.16, No14 0.5.24, Camera 0.1.28, Four Photo 0.1.23 and Polaroid 0.1.22.
Unused additive helper delivery does not silently adopt Mini policy in those
consumers. Gallery's selective builder output and A16z are unchanged.

## Validation and evidence boundary

The stable related suite passes 1,552 cases in 55 files. Four additional source
binding cases pass afterward (three protocol cases and the exact serialized SDK
invocation), making 1,556 distinct related cases. After an actual SDK declaration
failure exposed a summary-vs-detail union, a regression was added and the folder
shape was narrowed. The 78-case affected source/entry/assembly/recovery slice passes
with actual SDK typings; previously passing unrelated checks were not repeated.
All sixteen Mini and fifteen Archive CJS scripts, 24 Gallery builder/operation
cases, 299 Python cases (six existing skips), module/client-copy, generated-operation,
public/package/template checks pass.

Five actual native SDK read scenarios pass against one existing Video original:
exact link confirmation, refusal of a different claimed path while the real file
remains, refusal of an absent Resource ID, duplicate request refusal, and native
full-file SHA-256 matching the original bytes (60,028 bytes). Six read-only script
requests; no Project/Draft/import creation, resource relink or file mutation. The
first real invocation exposed the union error above; it was a real compatibility
failure, corrected in the same feature, not a successful run.

Private evidence is under `clip-highlights-analysis/repro-20261022/mini-video-source-admission`.
The owned Electron was stopped and all fourteen descendants, temporary app copies,
ports and four remaining nested helper registrations were confirmed gone. User
profiles, projects, original media, shared dependency cache and other tasks remain.

## Still open

The server analysis index does not expose a content provenance contract through the
current SDK. This feature cannot establish that an index generated before this
observation matches current bytes. Path/content reads are observations, not file
locks or an atomic lock with Project commit; later external replacement remains
possible. Existing historical runs without these optional observations retain
explicit prior admission policy. Full installed Mini creation, playback, audio,
export, Windows and whole-template ownership/acceptance remain open.
