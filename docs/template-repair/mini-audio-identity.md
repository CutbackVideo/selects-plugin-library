# Mini Vlog: preserve the selected music identity

Mini Vlog 0.1.0-alpha.11 repairs its music preparation operation. Its declared
input is 2--50 videos/photos; the standalone panel also offers own music or no
music. Both the panel and Clip Highlights template load the same
`scripts/ensure-audio.js` before assembly. The repair is at that shared music
boundary. Shot search, local scoring, beat planning, image/video placement,
title/look decoration and the template's alias resolution remain unchanged.

## Reproduction and cause

The operation first matched the selected file's normalized Project path, but
then fell back to filename/Resource name plus duration within 0.25 seconds for
bundled cues. Another Audio at a different path can have exactly that name and
length while containing different music. The standalone bundled-track path
supplies the cue duration and was vulnerable; own music and the template path
without duration already used path-only selection. Both paths also trusted
the first added ID without independently checking the imported Resource.

Against exact parent `85be92721f53303f662d949ce48c87ea7b6634a0`, fourteen of
the initial eighteen scenarios fail, with four healthy controls retained.
These include protocol assertions and are not fourteen reported defects. The
regression supplies a same-name/same-duration Resource with different bytes at
another path. The parent returns that Resource without importing the chosen
file. This is incorrect source selection, not a music preference decision.

## Reuse the existing feature pool

The operation now uses the existing bundled-assets feature's SDK-safe
`readBundledAssetResource` for exact path lookup. Mini Vlog retains its existing
Unicode NFC handling, Windows case/separator matching and POSIX case-sensitive
paths. More than one exact match is an ambiguity; wrong type or missing/invalid
positive Audio duration cannot become success. Another path never wins because
of a similar filename or duration.

If the chosen path is absent, request one import and then independently read
Project state. A completed import with a lost reply can be confirmed without
resubmission. Contradictory added IDs, unconfirmed results and confirmed skips
retain distinct common asset errors. Existing Project Resources are preserved.
This is an operation-level boundary; it does not add durable ownership across
whole template runs or a global cross-window import lock.

`operation-builder.mjs` selects the canonical reader/error factory from
`shared/bundled-assets.js` and generates the self-contained installed script
from `dev/ensure-audio.template.js`. The runtime still reads the same script
file and needs no repository import or external code server. The generator's
read-only `--check`, module registry and focused operation tests are in CI.
The pool remains five features; Mini Vlog is the eleventh consumer.

The existing private error factory's optional cause now has a default, matching
its established two-argument use when serialized into a checked SDK script.
The SDK compiler first caught four arity errors; its actual declarations pass
after this correction. Existing No.14, Stop Motion, Polaroid and Gallery helper
definitions are regenerated; their behavior and versions remain unchanged.
There is no new public SDK, IPC, Electron capability or host version requirement.

## Tests and actual SDK evidence

The eighteen operation cases cover misleading names/durations, exact-path reuse,
Unicode/Windows/POSIX controls, own music, duplicate paths, invalid Audio
metadata, lost/empty/contradictory replies, skipped/unsettled imports, lookup
failure and independent new-import confirmation. A nineteenth distribution
case proves that the generator detects a stale installed artifact without
rewriting it, then restores it from source. All nineteen pass.

The Mini Vlog run passes 35 tests across its sixteen existing test files and
the new scenario file, with no skips. This count includes the nineteen above;
legacy files contain additional internal assertions. All five operation scripts
typecheck with the actual prerequisite SDK declarations. The related existing
asset/run/image/Gallery consumer suite passes 847 cases across 32 files with
no skips. Python runs 299 cases (293 pass, six existing skips). Public-source,
package, generator and five-feature/eleven-consumer checks pass. Normal pre-push
validates all 28 audited templates. Counts overlap and are not a full-template
acceptance verdict.

The legacy read-script test now records imported Audio in its fake Project so
new readback checks observe real success semantics. Its old name/length reuse
assertion becomes a rejection of substitution. Existing path controls remain.
The static Windows check references the shared normalized reader rather than
requiring the removed fuzzy-duration constant. Those checks are supported by
the behavioral path scenarios, not used as their replacement.

Four actual macOS development-app SDK cases also run the parent/fixed operations.
Two generated three-second MP3s have the same basename/length and different
440/880-Hz content hashes. Each new disposable Project initially imports only
the wrong-path file; independent SDK reads and filesystem hashes identify the
selected Resource after each operation.

| Case | Observed selection | Import attempts |
| --- | --- | --- |
| Parent standalone cue request with duration | Wrong-path file/hash | 0 |
| Fixed, same request | Exact selected file/hash | 1 |
| Fixed, repeat same selected path | Same correct Resource | 0 |
| Fixed, reply lost after actual import | Exact selected file/hash, independently confirmed | 1 |

Setup creates two Projects with their separate libraries inside the owned
isolated dev app and adds four Audio Resources in total. No music operation
assembles or saves an edited Draft. A fresh read verifies both Projects contain
the expected two paths/bytes and the earlier Gallery Project's metadata,
Resources, file tree and Draft IDs remain exactly unchanged. Driver readback
confirms the new Project/library identities. Source hashes identify the final
generated operation and canonical shared feature; client source is
`0e4f7a595095e826acfd8aa7d2edcaa507210ffe`.

The actual-SDK harness initially guessed one exposed initial Draft ID; these
seed Project metadata replies expose zero. That unrelated oracle failure is
retained. A read-only verification checks the observed counts and existing
Gallery preservation without replaying imports. Fixture wrapper type errors
were corrected without weakening SDK type checking or casting away its types.

## Remaining scope

Exact-path selection does not solve installed-cue replacement/reinstallation
(X12): content-addressed owned music preparation is still to be adopted here.
Mini Vlog's alias/error issue C-09, lifetime/run recovery, partial saves,
local scoring/cache behavior, complete video/audio playback/export,
installed-app and actual Windows acceptance remain open. This is a direct
music-operation SDK test, not a whole panel/Clip Highlights run or original
reference/changed-input quality verdict. No template is complete. All 28 remain
in scope; Chan's apps and template packs remain excluded.
