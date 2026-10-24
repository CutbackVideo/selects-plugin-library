# Archive: bind local analysis reuse to original contents

Archive's local scorer reused a JSON result by Resource id, file modification
time and duration. Its panel also reused candidates by Project/selection alone.
Checking the current originals before a build did not prove that either reused
result described those originals.

The retained RED diagnostic used two real generated four-second AVI videos. The
Resource id, path, byte length, modification time and duration stayed equal while
the complete file digest changed. The old scorer reused luma 0.188235; independent
fresh decoding measured 0.690196. The same defect was captured in the actual panel
Build adapter, alongside stale scene memory and early release after sibling failure.

## Ownership and behavior

Archive now uses the existing `clip-analysis` source and its existing
`bundled-assets` dependency. Complete source snapshots, validated persistent score
objects, native media settlement and owned-file cleanup have one implementation.
No new module was introduced: the registry remains nine modules and fourteen
partial consumers. Archive's frame statistics, scene thresholds, role scoring,
montage allocation, music and timing policies are preserved.

The only common API extension is optional expected observations on
`clipAnalysisSources`. Archive compares returned score identities with the facts
captured before analysis. Mini keeps its existing defaults and pipeline. The
expectations, client, request rows and workspace are captured before asynchronous
work; later caller mutation cannot redirect admission.

For the sample above, the caller first observes the current original. Its complete
digest participates in the persistent score key together with Resource, duration,
evaluation settings and windows. Equal bytes reuse the verified JSON result;
different bytes produce a new result. Local scores are confirmed through this
owner on every explicit Build rather than bypassed through old panel memory.

Scene-search memory separately includes Resource/path/duration and complete local
observations. A changed selection, source or duration invalidates it. A retry with
unchanged scene inputs still searches only failed clips. After both producers
settle, originals are rechecked before planning and again before import/save.
These are local observation guarantees. They do not prove that server-side scene
analysis was indexed from the same bytes; that provenance remains open.

Archive retains its aggregate 25-second local evaluation budget and concurrency
of three. Its adapter splits standalone selections into the evaluator's bounded
256-row batches with one shared deadline and ordered progress. A selection of
257 is not newly rejected or silently truncated. The selected-file headless path
keeps its existing scene-search/fallback policy and durable continuation contract.

Ordinary decoder unavailability/failure still supplies uncached fallback windows
after source confirmation. Missing/changed/unknown sources, cancellation and
terminal cleanup/producer uncertainty stop the build. Failure in either parallel
producer cancels its sibling and waits for both to settle before releasing the
Build. Unconfirmed native jobs retain only their owned workspace for inspection.
Old mtime-only cache entries are ignored and not deleted.

## Validation

- 18 new TDD cases (15 Archive scorer/adapter/Build, three shared admission cases).
- 75 analysis/music/recovery cases and 106 disjoint existing-consumer/index cases
  passed. The earlier 24 common and 18 Mini checks overlap these sets.
- The existing six-video real-FFmpeg policy diagnostic passed, including static,
  pan, fade, flash, blur and scene-cut behavior. All other Archive CJS suites,
  actual SDK script types, Python 299 cases (six skipped), source/package/module
  synchronization and required guards passed.
- An actual development SDK run through the current Archive adapter and native
  FFmpeg reused identical bytes and recomputed changed bytes: 0.188235 to 0.690196.
  There were 176 SDK requests, no import or Draft save, and no successful-analysis
  staging files left. The retained Project and both saved Drafts were unchanged.

The first native harness attempt omitted its read-only job-status bridge. The
result correctly stopped as unknown and retained its workspace. After adding the
actual bridge, the exact original job was independently observed cancelled; only
then were its three owned staging files removed after an open-handle check. The
successful attempt used fresh files. This was a verification-harness correction,
not an application capability change.

The closed task profile was hash-backed up before launch, the private launcher
forced data preservation, and only the owned Electron process tree, ports, copied
binary/cache and stale app registrations were removed afterwards. Other work,
profiles and servers were preserved. The older profile-reset incident documented
in `archive-audio-workflow.md` remains unresolved for its original Project ids.

RED/GREEN logs, generated originals, native job/cleanup receipts and complete
readback are retained in the private 2026-10-23 Archive video-analysis packet.
Installed PanelHost UI, playback/export, released/native Windows acceptance and
server-index provenance remain unverified. Whole-template semantic ownership and
acceptance remain 0/28. Chan remains excluded.
