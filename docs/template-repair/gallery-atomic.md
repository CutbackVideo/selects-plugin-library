# Gallery complete working-copy authoring

Photo Grid Reveal keeps its 21 editable tiles, 3-by-7 grid, reveal ordering,
shared grayscale-to-color event and optional music. App runs still select
15 Images and six Videos at slots 4, 6, 11, 17, 19 and 21; the standalone panel
retains any valid 21-slot mix, intentional repeated sources and per-tile focus.
Input times stay on the reference 60fps clock and are converted once to the
actual Project grid. Media bytes, reference oracle and effect source are not
changed by this repair.

## Cause and repair

The normal launcher persisted an empty base, then Images, individual Videos
and batches of three styled tiles. A healthy mixed run saved 15 times; an
all-Video run saved 29 times. An effect failure left eight intermediate saves
in the reproduced case. A component-local busy flag did not make these stages
one transaction or prevent a partially made Draft from being announced.

The launcher now requires the extended host deadline fact before preparing
assets, verifies current sources, reads the Project grid and prepares short
Videos as before. It awaits its dispatch callback and rechecks liveness, then
requests one 120-second authoring script. An unsupported or malformed host
limit stops before a script/asset write. Client PR #7847 implements this panel
contract; older runtimes may silently discard an unknown timeout argument, so
merely passing 120 is insufficient.

Reuse the existing `authorAtomicImageDraft` and `placeWorkingCopyImages`
functions. Placement delegates source validation; Gallery supplies its existing
Image/Video input reader instead of restricting every Resource to Image. It
places all occurrences in one unsaved working copy and checks each returned
identity/interval. The Gallery recipe applies its existing effect and transform,
places optional music, and reuses the shared graphics, transform, Audio and
program checks before its only final commit. Music Off verifies no Audio.
Only an acknowledged complete save publishes a Draft ID; failures do not report
a completed tile count. An uncertain commit/transport result is never replayed.
After saving, the panel independently reopens and verifies the saved receipts.
Sound source verification still needs client #7828.

## Packaging and dependency ownership

The existing Gallery generator reads the canonical authoring/run sources and
selects their existing functions at build time. Only SDK-safe functions and the
bounded `templateRunJSON` serializer enter SDK requests; browser-owned run/file
functions do not. Panel readers enter the self-contained generated panel. The
manifest declares `authoring.generated.mjs`, which the installed CLI reads
locally. An isolated manifest-only package test runs that CLI without repository
paths. Generator output, selected function bodies and the manual skill recipe
are compared with their canonical sources.

The registry also recognizes canonical literal URL reads used by generators.
That is syntax/ownership validation, not semantic or security proof; separate
builder tests check actual output. No existing shared function body or earlier
photo consumer is changed. The pool stays five registered features across ten
consumers. Gallery uses only the existing run serializer in this checkpoint;
durable run ownership/recovery has not been adopted yet.

## TDD and verification

The first ten unchanged-parent cases failed nine with one control. The expanded
33-case parent baseline failed 30 with three controls. Additional malformed
host facts and a misleading failed-result count were reproduced and corrected.
Tests compile/minify the complete panel and execute its emitted SDK scripts
against separate working and persisted states. They cover mixed/all-Image/
all-Video inputs, repetition, Project frame rates, missing capabilities,
ignored effect/transform/Audio mutations, fresh source loss, stale awaited
dispatch, detached observers, changed saved state, source offsets, response
budgets and unknown commit replies. Existing real React input/music/short-video
and local ffmpeg/Python-reference parity tests retain their intent with the new
single-authoring boundary. SDK/no-SDK script typechecks run as well.

A separate local probe executes the pinned SDK, actual renderer bridge and
Storyboard at 25, 30000/1001 and 60fps for Image, Video and Audio overlays.
Videos have a separate 30fps source grid. Nine cases confirm exact requested
placement and immediate source windows where applicable, without any save or
original-sequence change. An initially incomplete Video fixture lacked its
required frame-rate metadata; correcting that test fixture is not a production
bug fix. This is local SDK evidence, not an installed app run or full authoring
and playback validation. Final counts, normal pre-push and remote CI state are
recorded with the publication checkpoint; overlapping counts are not additive.
Final related regressions pass 1,105 without skips. The exact Gallery CI step
passes 159, and Python discovery passes 285 with six skips. SDK declaration
and declaration-free checks pass. The unchanged earlier four consumers remain
in the regression set. Generated-module/local-client checks, public source,
all 48 declared packages and the 28-template gate pass.

## Remaining scope

Normal panel/app creation no longer uses staged saves. Explicit legacy repair
operations (`createBase`, `fillBase`, `placeVideosExisting`, `styleExisting` and
the older placement adapter) retain their previous contracts; this checkpoint
does not claim those low-level repair commands form a single transaction.
Gallery still needs durable app-run ownership/recovery, owned reusable assets,
complete Video/Audio source-clock and layer-order/Blend/Spatial Conform evidence,
full option checks before preparation, actual installed-host/Windows execution,
Inspector/composition checks, whole video/audio playback and export, and
reference-versus-changed-input quality evaluation. File observations are not a
lock against later changes. Client #7847 and (for sound) #7828 must be available
before publication. No merge, deploy, install or user-data rewrite is performed.
Chan remains excluded and the original all-28-template objective stays open.
