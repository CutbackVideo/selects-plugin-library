# Source-bound local video evaluation

`clip-analysis.js` owns local frame statistics, scene-change detection, window
scoring and candidate projection. Mini currently consumes it in both entry paths.
The existing six other QuickScore copies are queued consumers, not silently
migrated or counted as reviewed. The registry is partial: eight features, twelve
unique consumers; full ownership and template acceptance stay 0/28.

## Boundary and ownership

The existing `bundled-assets` owner supplies source/output identity, a verified
private original snapshot, bounded byte reads, content-addressed JSON publication,
exclusive reservations, cancellable media-job settlement and temporary cleanup.
No second file/cache/job lifetime is introduced. The registry's `requires` edge
checks that `bundled-assets` is delivered to each evaluation consumer before any
copy is rewritten. This is dependency delivery validation, not a full cycle or
semantic dependency proof. Generated `panel.tsx` embeds canonical sources; there
is no new runtime cross-template import or external code server.

The evaluation algorithms and thresholds are preserved from Mini's existing
QuickScore implementation. Montage roles, score scaling, scene-search ranking,
selection/planning, strings and progress state remain template policy. The old
`opts.io` test seam is replaced in Mini by the canonical captured `opts.client`;
other legacy copies retain their current API until their own migration.

## Input/output contract

- `quickScore({rid,path,durationSeconds}, options)` receives a nonempty Resource
  identity/path and a finite positive duration in seconds. It clones these facts.
  `options.client` is the captured private local client; the existing `hostSdk`
  default remains available. `options.dataDir` is nonempty, bounded and NUL-free.
  Native `files.fingerprint` is mandatory; browser whole-original reads are not
  used. Missing/unreadable/changed sources are errors, never decoder fallbacks.
- Optional windows are 1..256 finite increasing intervals within the duration,
  covering at most 120 seconds together. Default bins are 0.5 seconds after a
  0.5-second head, up to 120 seconds. Integer sampling FPS is 1..60 (default 8);
  frames are 64x36 gray. One decoded output stays below the existing 32 MiB
  transient cap; JSON reads are capped at 256 KiB.
- `isCurrent`, signal, budget and deadline define the invocation. Budget is
  0..300000 ms (default 30000); Mini supplies its existing 20000-ms shared
  **decoder** budget. Native filesystem observations/copies are awaited and
  checked before/after; they are not cancelled file transactions and do not
  promise a wall-clock bound over a stalled host/filesystem.
- Successful results retain `{rid,windows,sceneCuts,ms,fallback,cached,duration}`
  plus `sourceObservation:{path,size,sha256}`. Scored bins carry finite 0..1
  motion/sharpness/luma/clipping, seven boolean flags, and optional `empty:true`.
  Corrupt, incompatible or incomplete cache results regenerate. Recipe identity
  includes source contents, Resource/path/duration, all thresholds, FPS and windows.
- `quickScoreAll` accepts at most 256 unique Resource IDs and concurrency 1..3.
  It clones inputs, shares one deadline and controller, aborts siblings on a
  failure and awaits all settlements before rejecting. Progress is advisory;
  callback throws do not authorize stale success. Invalid callbacks reject
  before file operations.
- Ordinary decode errors may return uncached evenly spaced candidates after
  source reobservation. Expired budget before dispatch may also fall back.
  Ended ownership, active-job timeout/cancellation, source uncertainty and
  unconfirmed cleanup stop the run. No fallback is published as measured scores.
- `clipAnalysisSources` purely validates/deduplicates returned observations and
  rejects conflicting contents at the same path. It does not access files.

## Publication, save and recovery

Scores live at `dataDir/quick-score-v3/index/<recipe>.json` and
`objects/<recipe>/<output-sha256>.json`. Old v1 caches and published objects are
preserved. Only owned private snapshot/output/gray reservations are removed.
JSON derived results opt into `cleanupRequired:true`; existing Gallery defaults
remain best effort. Unconfirmed cleanup is terminal even if publication succeeded.

Mini reobserves the originals before dispatch, at assembly entry and immediately
before commit. Its durable pending recipe retains those observations; saved
assembly recovery checks them before a first look mutation, including when the
look recipe is already frozen. A changed/unavailable source preserves the saved
assembly and retryable workflow; restoring the original permits continuation.
Historical recipes without observations retain their existing explicit admission
policy. This is observation, not a filesystem lock or preserved Project source:
changes after the final observation/save, analyzed-scene freshness and nested
sequences are separate open work.

See [the feature checkpoint](../docs/template-repair/mini-analysis-inputs.md) for
RED/GREEN, actual native SDK cases and remaining acceptance boundaries.
