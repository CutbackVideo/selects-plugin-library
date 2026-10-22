# Mini / Archive: original Image facts belong to the build

Scope: Mini `0.1.0-alpha.15`, Archive `0.1.0-alpha.9`, stacked on
`3863a645a24f89bacedaff0bf7df378a4a1f33fc` / draft #310. Full template and
all-feature ownership acceptance remain open; Chan's apps stay excluded.

## Reproduced causes

The standalone build paths trusted cached photo dimensions. Their inventory and
assembly fallbacks tried to measure an Image by inserting it into an unsaved Draft
and reading `draft.meta().frameSize`. That field is the editing canvas, not a
verified native Image dimension. On the actual development SDK, a 96x160 PNG
became a false 1920x1080 observation. The resulting assembly retained scale 1
instead of the cover scale 2.962962962962963. This also let missing or unverifiable
selected originals reach music publication before source validation.

Both Finish functions then read the mutable photo-size cache again, allowing a
later inventory refresh to change motion framing for an already assembled result.
That violated their intended build-owned input boundary. These are separately
reproduced defects; the original C-09 customer environment is still unconfirmed.

## Feature ownership and contracts

- **Extend `native-image-input`, rather than add a module.**
  `prepareNativeImagesById` composes its existing exact-ID path resolver, native
  positive-integer dimensions and stat/one-byte-read/stat availability checks.
  Inputs are ordered SDK Image aliases and names, not persistent handed UUIDs.
  Existing template-entry UUID resolution remains a separate preceding step.
  Output retains identity, path, name, dimensions, order and duplicate occurrences.
  Partial, wrong-identity and malformed-dimension responses cannot become facts.
  Existing path-based consumers keep their strict ambiguity policy and defaults.
- **Bound the new large-selection consumer.** Up to sixteen rows and 16 KiB of
  serialized selected input per read; an oversized single identity is rejected
  before dispatch. A 129-photo, long-name selection no longer exceeds the Panel's
  256 KiB script limit. One overall deadline, at most 120 seconds, is passed down
  as the remaining SDK timeout. The caller's liveness is checked before/after each
  read and before handoff. No import, Draft creation, process or commit belongs to
  this owner; reads are not automatically retried. Large selections may end with
  an explicit deadline/unknown result rather than partial success.
- **Keep source observations separate from template policy.** Both standalone
  builds verify selected originals before search/music and retain immutable
  per-result photo-size data. Archive's orientation-sensitive opening and assembly
  consume that verified inventory. Both Finish paths consume the result's facts,
  preserving Mini/Archive's distinct title, motion and opening policies. That data
  does not turn the remaining orchestration into a completed shared-run migration.
- **Unknown native size stays unknown.** Mini/Archive inventory no longer creates
  measurement Drafts or promotes stale cached dimensions to source facts. Assembly
  requires verified positive-integer photo dimensions before creating even its
  working Draft, and never substitutes another canvas. Existing frame-snapped
  holds, video cropping, audio levels and decoration recipes remain covered by
  the legacy consumer tests.

All selected standalone photo candidates undergo this preflight; excluded photos
and Photos Off do not enter it. The result records observed facts, not a filesystem
lock or full content checksum. A later file mutation still requires the separate
placement/save/source-identity gates. Do not describe this checkpoint as complete
source-content attestation or full recovery after a partial music/save operation.

## TDD and evidence

- Initial actual-caller/inventory suite: five RED cases on the exact parent.
  Three Archive caller and two assembly-guard cases add five REDs while their
  affected paths remain unchanged. Both actual Finish functions fail against the
  exact parent when the cache differs from build-owned facts. Five additional REDs
  demonstrate oversized selection, invalid single-row budget, stale-owner and
  deadline failures in the new facade. Final focused suite: 24 passed.
- Related original-input, source-resolution, music, paging, generated-module and
  existing photo-authoring/receipt suites run together; the checkpoint receipt
  records their final totals. Mini/Archive's 31 legacy scripts cover plans,
  workers, typography, audio, source/edit scripts and actual SDK typings. The
  inventory fixtures now distinguish native metadata from an artificial canvas;
  unmigrated templates retain their own measurement-budget checks.
- Nine actual isolated development-SDK scenarios use the existing disposable
  Gallery Project without persistent mutation. PNG header bytes independently
  establish 96x160. The common ID facade preserves repeated selection names.
  Controlled omission of native metadata reproduces the parent's false canvas
  observation; fixed inventories retain unknown size and create no scratch Draft.
  Actual private working-Draft transform readback shows scale 1 in the parent and
  scale 2.962962962962963 in both fixed assemblers. Missing photo facts fail before
  working-Draft creation. Test proxies suppress `commitAll`; this is explicitly
  unsaved geometry evidence, not a real save, installed template, playback/export
  or image-quality verdict. Complete Project/clip snapshots and source SHA-256
  match before/after.

Reproducible scripts, exact parent/fixed sources, hashes, command logs and native
SDK results are retained in the private checkpoint receipt. Public sources contain
no personal filesystem paths. The registry stays five features / twelve consumers,
with full feature ownership and completed templates still **0/28**. Real Windows,
unusually large output metadata, installed save/reload, full video/audio, export,
late source changes and all remaining template feature decisions stay open.
