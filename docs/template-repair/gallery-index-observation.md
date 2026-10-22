# Gallery: observe concurrent cache-index publication

Gallery's held Video and tempo PCM preparation share `prepareDerivedAsset` in
the existing bundled-assets feature. Complete, content-addressed objects are
published before an atomic index describes them. A second live panel can replace
that index with another complete generation. The strict reader correctly notices
a replacement between its first stat and final stat; that observation does not
mean the cache is absent or corrupt.

## Reproduced cause and TDD

Remote checks on the bounded-reader stack failed the existing concurrent Video
and PCM tests with `BUNDLED_ASSET_PUBLISH`: a complete index was replaced during
its read. The cache lookup caught the changed-file observation as a miss, which
could start another encode. The post-publication lookup observed only once and
could report failure despite a healthy concurrent publication.

Eight deterministic ordinary/minified compiled-panel tests use real disposable
files and the unchanged canonical local client. Another complete index is
atomically published between the first stat and the bounded read. Exact parent
`5597411ba479c839d703aa0f59ee5a0ffde569aa` fails six cases; two cancellation
controls pass. The fixed source passes all eight. The tests assert actual
encode counts, atomic publication counts, content-addressed output hashes,
reuse, bounded observations and cancellation, not merely an error string.

## Repair and preserved contracts

The cache owner reobserves only an index read that reports
`BUNDLED_ASSET_CHANGED`, with at most three complete independent observations.
It checks run liveness before each attempt and after each failed observation.
If the index keeps changing, the result stays unknown: a terminal
`BUNDLED_ASSET_PUBLISH` stops the request before any replacement production.
This applies both to initial cache lookup and post-publication confirmation.

There is no publication, rename, write, encode or import retry. The generic
reader retains its frozen 49,152-byte index budget and stat/read/stat checks;
source/media identity checks and content verification are unchanged. Oversized,
malformed or corrupted cache data retains its existing handling. A cancelled
run cannot obtain success by continuing observations. Three observations do not
guarantee success under endless contention and do not create a global lock or
an atomic filesystem snapshot.

Gallery receives version 0.3.22 and regenerated authoring/panel code. No.14,
Stop Motion and Polaroid receive synchronized shared definitions; they do not
invoke the derived-file owner. Their active asset paths are unchanged. The
pool remains five features / ten consumers at this branch. No new SDK surface,
IPC, Electron requirement or external service is added. Chan stays excluded.

## Validation and limits

- Focused ordinary/minified cases: 8 pass, after 6 RED failures and 2 controls.
- Existing Gallery, complete-authoring, Video/PCM, lifecycle, staging ownership
  and source/media contracts: 440 pass, no skips. The original concurrent tests
  remain unchanged.
- Related bounded-reader, bundled assets/Audio and other photo consumers:
  284 pass, no skips. Counts describe separate commands, not template completion.
- Python: 299 executed, 293 pass and 6 existing skips. Public-source, package
  and shared-generation checks pass; normal pre-push checks all 28 templates.

Seven actual isolated macOS development-app SDK scenarios execute the unchanged
canonical file client and the actual shared owner. A deterministic competing
atomic index replacement reproduces the parent's failed confirmation and second
production. The fixed publication and cache lookup succeed with one production;
continuous changes stop after three observations without another production;
cancellation stops after one. Output bytes match their recorded hashes and
publication counts include only the original publication and explicitly injected
competing writes. Application source is
`0e4f7a595095e826acfd8aa7d2edcaa507210ffe`; parent/fixed/client source snapshots
and hashes are retained with the probe results.

These SDK probes use a synthetic binary producer in a disposable directory,
not the installed Gallery's FFmpeg or playback path. They call only the file
API, with no Project/Resource/Draft mutation. Canonical file writes retain their
existing `allowCommit: true`; that flag is not evidence of a Project write.
Earlier playback/export evidence keeps its original source/version identity.
Full installed/platform/AV acceptance, cleanup/crash recovery and all other
28-template gates remain open. No template is declared complete.
