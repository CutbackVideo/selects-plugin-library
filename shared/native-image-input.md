# Original Image input contract

`native-image-input.mjs` owns the existing `nativeImageSources`, `nativeImageRun`
and `prepareNativeImages` input feature extracted from Four Photo Reveal and
Camera Shutter Dump, now reused by Four Photo Stop Motion and Polaroid Photo
Dump as well. Photo Grid Reveal now uses the same exported source-facts function
through its existing script generator. It does not
own their plans, music, layout or save policy.
Other native-SDK consumers retain their previous implementation until their own
migration tests pass.

## Inputs and outputs

The caller supplies a Project ID and ordered selected Image rows with script
Resource ID, original path and name. The read-only SDK query verifies that each
selected path has exactly one registered Image and that its Resource ID still
matches the selection. A different Resource at the same path is not accepted.
Native positive integer width/height remain required. The returned rows retain
identity, path, name, dimensions, order and duplicate occurrences.

For each distinct original path, in this invocation only:

1. Read `selects.files.stat`. A null observation means missing. A thrown or
   incomplete observation means unknown, not missing.
2. Require a nonempty, nondirectory path; directories and zero-byte files are not
   accepted as usable original media.
3. Read exactly the first byte through `selects.files.readRange`. Reject failed,
   clipped, malformed or empty read results. No full-image bytes are returned.
4. Read stat again and reject removal, size, mtime or inode changes.

The check is repeated during Image placement. It is not a lock: a later removal
can still fail rendering, and a failure after an earlier commit remains a partial
or uncertain result under the caller's existing save policy. No auto-deletion or
write retry is introduced. Reading one byte establishes local availability, not
full decode validity, media identity by checksum, playback or export success.

Known errors use `image-source-missing`, `image-source-unreadable`,
`image-source-unknown` or `image-source-changed`. The query returns these as plain
structured data so the SDK transport does not discard the code/Resource ID.
The panel reconstructs the error and exposes the safe, photo-specific message.
Unexpected Project/metadata failures keep their existing generic diagnostics.
No Project import, Draft creation/commit, media job or shell call occurs here.

Polaroid Photo Dump calls this input feature twice across distinct preparation
boundaries: first for its 17 user photos before any asset publication/import,
then for those originals plus the generated frame before creating the Draft.
This deliberately reobserves the originals after asset preparation; it does not
turn those read-only queries into persistence. The existing placement path
rechecks them before editing. Polaroid's separate input policy reserves its
plugin-data namespace for generated assets, preserving same-named user photos
elsewhere and deliberate repeated selections. The shared source is unchanged.

## Distribution

`shared/panel-modules.json` is the explicit consumer registry. Run
`node tools/sync_panel_modules.mjs` after editing a module and use `--check` to
check generated copies without writing them. The tool validates every declared
source, consumer and marker before any write; each individual replacement is
atomic. Multiple file replacements are not one filesystem transaction: CI must
pass the final drift check before publishing. This step is source embedding,
not a full module bundler or runtime cross-plugin import.

The registry excludes Chan's Shortform Clips and template packs. No other
plugin's installation is read. Existing generators and modules remain intact.

The explicit `.mjs` source is a build input; runtime panels still do not import
repository files. Gallery's `buildTimeTargets` entry identifies its generator's
canonical import. After a source change, run both the module sync and
`node plugins/photo-gallery-no2/build-panel.mjs`. The latter emits the panel and
`input-facts.generated.mjs`, a small self-contained copy included in the installed
package. Its operation builder reads that local artifact. Builder tests compare
both generated artifacts with the canonical function and execute an isolated
installation with no repository-wide shared directory. `--stdout` does not
rewrite either file. The registry checks declared import edges; the generator
tests own artifact-freshness verification.

Gallery retains its frozen-path binding contract: it resolves a supplied alias
to the unique current Project row, then supplies that observed ID/path to this
strict Image feature. It does not loosen the four existing consumers' identity
checks. Gallery also rejects changed kinds, missing native dimensions and
ambiguous source nodes rather than trusting caller metadata or an ID shortcut.
The media probe runs first, followed by original Image checks and comparison of
the returned dimensions. Gallery checks only picked originals before asset
preparation; browsing unrelated files does not perform original-file reads.

## Evidence

The initial input regression suite failed 24 cases before the fix. The first
consumer passed its 12 cases before extraction; the second then passed the same
contract using the extracted source. Two further tests demonstrated lost final
user messages before adding the structured public-error mapping. Tests also
exercise real temporary PNG files, removal with retained metadata, both source
tree response shapes, Windows/UNC paths, repeated picks, placement-time deletion,
SDK TypeScript compatibility and existing reference plans. These are not an
installed-app end-to-end or Windows playback claim.

## Opt-in full content observations

`requireSourceFileSupport(files)` requires the co-shipped read-only fingerprint
method and otherwise exposes a safe update message. `observeSourceFiles(files,
paths, expected = null)` deduplicates paths in selection order and returns
`{path,size,sha256}` for complete nonempty media. Providing expected observations
requires the exact selected path set and compares every size and SHA-256.
Missing, unsupported, invalid, changed and unknown results have separate
`source-file-*` codes. Private reader diagnostics remain an Error cause, outside
the public message. An empty selection requires no file capability.

Gallery opts into this feature during composition. Its selected Project facts
are refreshed separately with `resources({fresh:true})` and
`sourceFiles({fresh:true})`; default reads retain SDK caching. The source file
observer owns no metadata policy, asset snapshot, Draft mutation or persistence.
Original `nativeImageSources` and `prepareNativeImages` bodies are unchanged;
the four older consumers receive additive unused definitions and do not acquire
a new runtime requirement. Gallery's installed input-facts artifact now exports
all three SDK-safe functions; its generator serializes their declarations.

`fingerprint` is a bounded-memory observation, not a file lock. Changes after
its final read, or changes across distinct observations without an observable
content difference, are not excluded. Unknown observations must not authorize
creation. Post-save failure cannot undo a saved Draft and must retain its ID.
