# Complete Image Draft authoring

`native-image-authoring.js` owns working-copy creation, original Image placement
and saved Image receipt verification. Four Photo Reveal and Camera Shutter Dump
share it through `panel-modules.json`. Their existing plans, reference timing,
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
  paths and template recipes are not sent again. Verification never replays a save.
- `inspectImageGraphics` compares the procedural clip count, live identities,
  tracks, intervals and explicit parameter values using the existing
  `motionGraphics`/`motionGraphicProgram` SDK reads. Normal create paths invoke
  it before commit and in the independent saved readback. Parameter object key
  order does not matter; extra host-supplied defaults are preserved. Minimal
  graphic receipts pass through the existing durable run record. Missing old
  Image graphic evidence requires inspection rather than another save.
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
including graphic transforms, TSX identity or editable definitions. They do not
prove actual image decoding, playback, visual fidelity or export. Those acceptance
gates remain separate. See the [checkpoint](../docs/template-repair/photo-atomic-authoring.md).
