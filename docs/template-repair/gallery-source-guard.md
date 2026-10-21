# Gallery source observations at composition and save boundaries

Photo Grid Reveal 0.3.18, based on 1c05875813abe5e729a5f55d02e6f95b8b3a7293
(draft library PR #296). Chan's shortform apps and template packs stay excluded.
The full 28-template repair goal remains active.

## Reproduced causes

Gallery observed selected inputs before placement, then styled and saved a
working copy without checking whether the input files or selected Project facts
had changed. The first 19 parent cases failed 18 and passed one unrelated-change
control. Actual SDK inspection found another cause: Project resource and source
inventories were cached within one script. Repeating a default query could
return the earlier snapshot, unlike the original always-live test fixture.

## Shared feature and SDK boundary

Extend `native-image-input.mjs` with opt-in `requireSourceFileSupport` and
`observeSourceFiles`. Preserve its existing Image availability/identity/dimension
functions and all four earlier consumers' active contracts. Gallery's existing
builder packages the three SDK-safe functions into its local generated artifact
and standalone panel. The pool stays five features and ten consumers.

Client commit a0936c9a9b7a97e87761926c3566b83d66aaed86 (draft client PR #7866) on
`codex/source-fingerprints`, based on the panel deadline prerequisite #7847,
adds `selects.files.fingerprint(path)` returning `{size,sha256}` or null for
initial absence. Existing stat/readRange own path access; SHA-256 uses the
existing noble implementation, reads 48 KiB chunks and checks the deadline on
both sides of each await. Incomplete/noncanonical bytes, changed stat or expiry
reject. No new native/IPC channel, renderer API or binary version threshold.
The SDK declaration/runtime and built-in authoring guide co-ship. Gallery checks
method presence before ownership/assets/Draft work; unsupported hosts update.
Sound-source verification still separately depends on #7828; these prerequisites
have not been jointly installed or deployed.

`resources({fresh:true})` and `sourceFiles({fresh:true})` refresh only their
respective per-script projections. Defaults preserve caching. Subsequent default
reads reuse the refreshed result; an older pending read cannot overwrite it.
Neither API refreshes a Draft working copy or provides a multi-read transaction.

## Composition lifecycle

Resolve selected current Project inputs, probe, verify original Images, capture
distinct visual/music content fingerprints, then observe selected metadata
again. Automatic BPM carries the source fingerprint returned from the actual
analysis into creation; replacing music between analysis and creation rejects.

After all 21 placements, styling and existing receipt checks, refresh selected
metadata, compare complete file fingerprints and refresh metadata again. Only
then dispatch the sole commit. Repeat the observations after acknowledgment.
Before-save changes yield no persisted Draft. A post-save change/unknown read
keeps the acknowledged Draft ID and reports an unconfirmed result. The UI and
durable run path preserve that identity and do not automatically replay. The
existing shared run receipt now permits a validated optional `savedDraftId` on
`outcomeUnknown`; old records remain readable. Recovery reports that ID for
inspection and never upgrades the record to success. The SDK finishTemplate
error union is preserved rather than inventing a mixed success/error response.

## Evidence and remaining limits

Whole normal/minified panels test selected Video/Audio durations, paths and
presence, Image availability/dimensions, unrelated Project changes, actual
same-size/same-time file replacement, analysis/creation binding, and saved-ID
preservation. The fake Project reader now emulates per-script caching unless a
fresh read is requested. Real files exercise content replacement, while media
probe and Draft operations there remain contract fixtures, not decode/E2E.
SDK tests additionally compare chunk boundaries and empty files to Node crypto,
use a real 2 MiB file through the actual file bridge and VM SDK, and preserve
cached/fresh/in-flight ordering and folder result types.

Observations are not filesystem locks or immutable Resource revisions. A source
can change after the final observation. Large-file transport consumes time and
may expire; bounded memory does not prove performance on all hosts. No complete
media decode, installed Selects/Windows behavior, Inspector, playback/export or
reference/changed-input visual quality is established by these tests.

Local verification after the final change: 1392 related Node cases pass (47
additional cases over the parent), including all prior common input/authoring/run
consumers and generated normal/minified panels. Python runs 291 cases: 285 pass
and six existing skips. The 32 focused client SDK tests pass separately. Full
client required checks and remote CI are separate evidence, not included in
these counts. No installed application or user library was modified.
