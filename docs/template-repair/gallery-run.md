# Gallery durable app-run ownership and recovery

Photo Grid Reveal (`photo-gallery-no2`) 0.3.13, based on the complete working-copy
checkpoint 5a3e15ce75729c7cd3088d055984324c1ff161ce (draft PR #287). Chan's
`shortform-clips`, `shortform-cloner`, `eo-shorts` and `template-packs` are excluded.

## Failure and cause

The hidden app-run remembered `runId` only in a React ref. A fresh panel realm
lost that memory, so remounting or concurrently mounting the same app request
could create duplicate complete Drafts. If the SDK saved but its reply was lost,
the panel had no durable result to recover. Liveness compared only `runId`, so a
same-run Project/library replacement could receive an obsolete completion.

Before production edits, 26 tests against the parent compiled/minified panel
failed 24 with two controls. Tests observe independent SDK working copies and
persisted snapshots plus shared journal storage across fresh panel realms; they
do not infer success from an optimistic UI or save call count alone.
The expanded 50-case suite also ran against the parent: 42 failures, eight
controls. The fixed source passes all 50.

## Changes and feature reuse

- Reuse existing `executeTemplateRun`, validation, JSON/ASCII encoding and
  `writeTemplateRunResult` without modifying canonical bodies. The registered
  pool remains five features across ten consumers. The four previous durable-run
  consumers are untouched.
- Validate the 15-photo/6-video request and effective music option before a claim.
  Normalize ordered Resource IDs/kinds, music (omitted equals bundled), reference
  duration and BPM. Names and temporary file paths are not request identity.
- Check the host's 120-second contract and required saved-result readers before
  claiming or importing. Music Off does not require unused Audio readers. Existing
  shared checks own exclusive file writes, conditional replacement and browser
  hashing/encoding requirements. No new client IPC or SDK surface is introduced.
- Claim one owner before reading selected media or preparing bundled/held assets.
  Pin run, Project and library through asynchronous work, and recheck public
  Project ownership before dispatch/recovery using the shared module.
- Pass the claim envelope into the single complete working-copy authoring request.
  Include it in the existing pre-commit journal-size check. Publish a conditional
  saved/notSaved/outcomeUnknown receipt in the same SDK invocation, before reply.
- Recover a positively saved receipt only after independent saved Draft geometry,
  visual/effect program, transform, graphics and Audio/source evidence readback.
  Pending, corrupt, mismatched and unknown states never start another authoring
  request. An explicit new app run can create a revision.
- Keep asset import dispatch separate from possible Draft persistence. Await
  bundled-import observers and recheck context before the SDK import. Ordinary
  panel Create keeps its explicit-operation behavior and import uncertainty UI.

## Packaging and verification

The existing Gallery generator selects SDK-safe receipt functions into
`TEMPLATE_RUN_SOURCE` and browser ownership functions into `PANEL_RUN_SOURCE`.
Both are generated from the existing canonical source. A manifest-only installed
package still builds its SDK operation locally without repository-wide imports.
No global runtime module loader or external code server was added.

The current Gallery-specific durable suite has 50 passing cases, including
fresh/concurrent realms, minification, lost claim/save replies, late receipts,
receipt disk failure, changed picks/music, explicit new runs, input reuse,
bundled music defaults, corrupt/oversized/unreadable evidence, persisted edits,
Project/library replacement, unsupported host/read/file/encoding capabilities,
and SDK/no-SDK typechecks and script budgets. Run:

```
SBS_PANEL_TEST_MODULES=/path/to/node_modules node --test tests/gallery_run.test.mjs
```

Related regressions include all previous durable-run consumers and Gallery's
standalone React/operation/input/hold/tempo tests. CI explicitly runs the new
Gallery suite. The related broad run passed 1,155 tests without skips; the exact
Gallery CI command passed 209 without skips; Python passed 285 with six skips.
Public-source, 28-template, 48-package, five-module/ten-consumer, six-local-SDK and
47-app-guard checks also passed. Final receipts are saved with the session's local
publication checkpoint; passing automated checks are not installed-app evidence.

## Remaining acceptance gates

This is a local shared-filesystem owner, not a distributed lock across machines.
Draft persistence and journal updates are separate operations. A known saved
Draft with failed receipt publication is returned to its current invocation;
its retained claim prevents blind remount retry. Crash/unknown state is inspected,
never expired into automatic takeover. Assets imported during preparation may
remain after `notSaved`; owned reusable assets still need migration.

Client #7847 (extended panel deadline) and, with music, #7828 (Audio source-window
readback) remain prerequisites. Neither has been installed or deployed here.
Full Audio/Video source clocks, composition/layer/Blend/Spatial Conform evidence,
actual installed Selects and Windows, Inspector editing, whole video/audio
playback, native export and reference/changed-input quality remain pending.
Historical preview playback failed acceptance and has not been reclassified.
Explicit legacy staged repair commands retain their contract. All 28-template
goal requirements remain active.
