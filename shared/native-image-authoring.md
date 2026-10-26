# Complete Image Draft authoring

`native-image-authoring.js` owns working-copy creation, original Image placement
and saved Image receipt verification. Four Photo Reveal, Camera Shutter Dump and
Four Photo Stop Motion and Polaroid Photo Dump share it through `panel-modules.json`. Their existing plans, reference timing,
effects, graphics and audio recipes remain template-owned.

## Contract

- Inputs are a pinned Project ID, name, actual Project fps/canvas/duration plan,
  validated ordered source facts and Image occurrences. A source index may be
  used more than once. Frame intervals are Draft frames, not source seconds.
- `readImageDraftFps` reads an unsaved working copy. Creating that SDK handle is
  not persistence and does not require `allowCommit`. Resuming an existing seed
  reads its own fps after checking Project ownership, rather than the current
  Project default.
- `placeWorkingCopyImages` rechecks the selected Resource IDs and original files,
  overlays every occurrence into the caller's trusted working copy, and checks
  each new clip's identity and interval. It never commits.
- `authorAtomicImageDraft` prepares Main and canvas, places Images and calls the
  template's trusted finish function. That function applies the existing design
  and owns the sole `commitAll`. A failure before that commit leaves no new Draft.
  The result distinguishes `notSaved`, `saved` and `outcomeUnknown`.
- A new commit returns `createdDraftId`; an existing Draft may return `commitId`.
  No provisional Draft ID is invented. Finish functions accept the unsaved handle
  directly; legacy public finish/placement entry points keep their ID contract.
- The panel awaits `onSeed` before dispatch and checks liveness again. It awaits
  `onDraft` only for a positively acknowledged complete save, even if the
  observer has since detached. No follow-up authoring write is needed.
- `verifyAtomicImageDraft` starts a separate read-only SDK invocation. It reads
  the persisted Project/Draft, fps, canvas, duration and Image clip IDs, tracks,
  Resource IDs and intervals. Only the minimal receipt enters this query; source
  paths and full template recipes are not sent again. Bounded deduplicated program
  evidence is included as described below. Verification never replays a save.
- `inspectImageGraphics` compares the procedural clip count, live identities,
  tracks, intervals and explicit parameter values using the existing
  `motionGraphics`/`motionGraphicProgram` SDK reads. Normal create paths invoke
  it before commit and in the independent saved readback. Parameter object key
  order does not matter; extra host-supplied defaults are preserved. Minimal
  graphic receipts pass through the existing durable run record. Missing old
  Image graphic evidence requires inspection rather than another save.
- `inspectImageTransforms` checks every visual Image/graphic occurrence through
  fresh `clips` targets and the public `clipTransform` read. Desired transforms
  come from each template's own recipe, not from the observed SDK mutation
  response. It checks position, per-axis scale, rotation, anchor, enablement,
  both flips and all intrinsic motion-key groups. These two recipes use fixed
  transforms; animation in their separate effects is not an intrinsic key.
  Omitted recipe fields mean the documented SDK identity defaults. Coordinate
  conversion roundoff is tolerated at `1e-8 * max(1, abs(expected))`; nonfinite
  values, missing fields, unexpected motion keys or visible changes fail verification.
  It returns normalized expected receipts after verification. The finish path
  calls it before the sole commit, and a separate SDK invocation verifies the
  same expected receipts from persisted state. Reopening the same app run uses
  those receipts without adopting manual changes or replaying a save.
- `inspectImageAudio` verifies the complete Main/Audio-lane sound set. Each
  template supplies intended Audio Resource IDs, clip/track identities, Draft
  intervals and default source routing; the helper checks the Resource type
  and reads the level, volume keys and edge fades through `clipAudio`. Both
  recipes intend 0 dB, no volume keys and no fades. The normalized expected
  values enter the existing durable result, not a snapshot adopted from an
  unchecked host response. Working-copy and independent saved-state reads use
  the same contract. Music Off verifies an empty sound set and does not require
  unused `clipAudio` or `clipSourceWindow` APIs. An unexpected Main sound or Audio-lane clip fails. Sound-bearing paths also verify intended immediate Resource source start/end and exact playback rate/pitch through fresh `clips()` targets and `clipSourceWindow`. These values enter the same receipt and independent saved readback. Source clocks use only floating-point arithmetic-noise tolerance (`8 * Number.EPSILON * max(1, abs(actual), abs(expected))`); the level/fade tolerance is not used. Missing source evidence refuses recovery before dispatch. Unsupported source reads stop before commit; private source-read diagnostics are replaced with a safe message. This depends on client PR #7828 and has not been validated in installed hosts.
- `imageProgramsFeature` owns program inspection, canonical static-preset
  preparation, compact evidence and its pre-commit budget gate. Templates supply
  intended TSX, complete explicit/default parameter values, editable definitions
  and effect order. Every visual clip is checked, including empty stacks and
  non-graphic Images. Enabled effects, labels, source and controls must match.
  Source strings are deduplicated independently of each placement's parameters
  and controls; exact structural comparison ignores object key order.
- Effect preset definitions omit effect TSX in the existing public API. For
  No.14's static Fade down preset, the feature creates one unsaved reference
  using a validated Image, applies the canonical preset, verifies its returned
  identity/label/definitions/defaults and reads its program. It does not adopt
  the target's output as the canonical source or commit the reference. Recovery
  compares against the original saved snapshot and does not reapply the preset.
- Before the sole commit, `confirm` reuses `templateRunJSON` with the actual
  journal envelope and minimal expected result, reserving 120 ASCII characters
  for a new Draft identity. An oversized snapshot stops before committing. The
  existing 48 KiB cap is unchanged. Private program-read diagnostics are kept
  out of public messages. Stored program source is compared as data, not run.
- A legacy empty seed may continue in one commit if it belongs to the Project
  and matches the plan. Any preexisting non-Main clip, including a manual graphic
  without a Resource ID, is refused. A configured Main Audio must match the
  template's Resource and be its sole Main clip.

The script builder serializes functions as explicit arguments so a TSX compiler
or minifier may rename their local symbols without breaking the isolated SDK
script. The input feature supplies `nativeImageSources`; no module import or
browser global is assumed inside `runScript`.

## Limits

An optional `runReceipt` composes this feature with [durable template run
ownership](template-run.md). Its conditional saved receipt is written inside
the same SDK script after authoring, before the reply. Without that run contract,
the standalone create functions do not deduplicate separate invocations.
An already dispatched commit cannot be undone by closing the panel. A failed
response may still mean a complete Draft was saved: inspect before retrying.
Preparation may import reusable Project audio before authoring; this contract
does not roll those imports back. Legacy compatibility helpers can still commit
their individual operations when explicitly called; normal create paths use the
new one-commit operation.

Persisted receipts do not verify every saved effect/graphic/audio property,
including effect-internal time mappings, intrinsic Blend/Spatial Conform,
layer order, parent-track Audio state or actual media bytes. Authored program TSX,
parameters, editable definitions and effect order/enabled state are checked;
that does not prove rendering or Inspector behavior. Missing old graphic,
transform, Audio or program evidence requires inspection, not a save replay.
They do not prove actual image decoding, playback, visual fidelity or export. Those acceptance
gates remain separate. See the [checkpoint](../docs/template-repair/photo-atomic-authoring.md).

## Gallery mixed visual consumer

Photo Grid Reveal reuses the same placement, working-copy and saved-receipt
functions through its existing generator. A Gallery-specific source-facts
adapter resolves the frozen paths and validates Image/Video facts before
passing ordered occurrences to shared placement; that function delegates
source validation rather than assuming every Resource must be an Image.
The canonical function bodies and four earlier consumers are unchanged.
Only SDK-safe helpers enter Gallery's emitted requests; selected existing
panel-side readers enter its self-contained panel. `authoring.generated.mjs`
is a distribution artifact, not another functional module.

Gallery commits its complete normal creation once. Its explicit legacy repair
operations are still staged and are not the app-run route. The normal launcher
requires client #7847's deadline fact before preparation; sound readback also
needs #7828. See `docs/template-repair/gallery-atomic.md` for evidence/limits.

## Reconcile caller-owned title/effect programs

`imageProgramsFeature(selects).reconcile(draft, intent, beforeApply = null)`
extends the existing SDK-safe program feature. Existing `inspect`, `preset`,
`confirm` and `verify` callers retain their API. Intent declares managed graphic/
effect names, graphic source/values/controls/intervals and ordered per-clip effect
programs. Names locate candidates; exact program semantics confirm them. Missing
programs can be appended only after an existing valid managed prefix. Unrelated
effects remain in place. Duplicate/conflicting/disabled programs fail before any
mutation. Intent is cloned JSON, bounded to 8 MiB, 256 graphic/visual targets and
32 managed names/effects per target; nonfinite/unsupported values reject.

All candidates are checked before the optional caller callback. Authoring uses
fresh opaque SDK targets after each edit, and rereads every intended program
before returning. Return graphic added/kept counts and per-name effect counts;
the caller still owns its sole final commit and save recovery. This is not proof
of run ownership or post-save persistence. Mini's generated decoration operation
is its first consumer; see [the checkpoint](../docs/template-repair/mini-program-intent.md).

Historical Mini admission also reuses the Audio inspector. Its own exact-value
mismatch assertions carry `IMAGE_AUDIO_MISMATCH`; missing SDK capabilities and
thrown API read failures keep their unavailable/error outcome. Existing messages
and receipt return shapes are unchanged. This distinction lets a caller refuse a
confirmed wrong plan without retiring a valid run on a transient read failure.
